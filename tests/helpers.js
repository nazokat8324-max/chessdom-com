// Avtomatik testlar uchun yordamchilar: har test fayli o'z serverini vaqtinchalik SQLite bazasi bilan ishga tushiradi
// (sizning database.sqlite faylingizga tegilmaydi). NODE_ENV=test — so'rovlar chegarasi o'chiq.
const { spawn } = require('child_process');
const net = require('net');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');

const ROOT = path.join(__dirname, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let counter = 0;
const uniq = (prefix) => `${prefix || 'T'}${process.pid % 1000}${Date.now() % 100000}${++counter}`;

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
    srv.on('error', reject);
  });
}

async function startServer(extraEnv) {
  const port = await freePort();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chessdom-test-'));
  const env = { ...process.env, PORT: String(port), NODE_ENV: 'test', SQLITE_FILE: path.join(dir, 'test.sqlite'), JWT_SECRET: 'test-secret', ...(extraEnv || {}) };
  delete env.DATABASE_URL;
  const child = spawn(process.execPath, ['server.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error('Server ishga tushmadi:\n' + log);
    try { await fetch(base + '/api/tea'); break; } catch (e) { await sleep(250); }
    if (i === 119) throw new Error('Server javob bermadi:\n' + log);
  }
  const server = {
    base, port, dir,
    log: () => log,
    async stop() {
      if (child.exitCode === null) { child.kill(); await new Promise((r) => { child.once('exit', r); setTimeout(r, 3000); }); }
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* Windows fayl qulfi — muhim emas */ }
    },
    async api(user, url, method, body) {
      const res = await fetch(base + url, {
        method: method || 'GET',
        headers: { 'Content-Type': 'application/json', ...(user && user.token ? { Authorization: 'Bearer ' + user.token } : {}) },
        body: body ? JSON.stringify(body) : undefined
      });
      const text = await res.text();
      let json = {};
      try { json = JSON.parse(text); } catch (e) { json = { raw: text }; }
      return { status: res.status, ...json };
    },
    async register(prefix, password) {
      const name = uniq(prefix);
      const d = await server.api(null, '/api/auth/register', 'POST', { username: name, email: name.toLowerCase() + '@test.uz', password: password || 'secret1' });
      if (!d.success) throw new Error('Ro\'yxatdan o\'tib bo\'lmadi: ' + JSON.stringify(d));
      return { id: d.user.id, name, token: d.token, user: d.user, password: password || 'secret1' };
    },
    // Socket: authenticate qilingan, barcha hodisalar `events` da
    connect(user) {
      return new Promise((resolve, reject) => {
        const s = io(base, { transports: ['websocket'], reconnection: false, forceNew: true });
        s.events = [];
        s.onAny((e, p) => s.events.push({ e, p }));
        s.on('connect_error', reject);
        s.on('connect', () => { if (user) s.emit('authenticate', user.token); setTimeout(() => resolve(s), 300); });
      });
    }
  };
  return server;
}

function once(socket, event, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Kutilgan hodisa kelmadi: ' + event)), ms || 6000);
    socket.once(event, (p) => { clearTimeout(t); resolve(p); });
  });
}
const ack = (socket, event, data) => new Promise((r) => socket.emit(event, data, r));

// A B ni chaqiradi, B qabul qiladi → {roomId, white, black} (har biri {socket, user})
async function startGame(server, a, b, opts) {
  const sa = a.socket || (a.socket = await server.connect(a));
  const sb = b.socket || (b.socket = await server.connect(b));
  const rec = once(sb, 'challenge-received');
  sa.emit('challenge-send', { username: b.name, initial: 180, increment: 2, rated: true, ...(opts || {}) });
  const ch = await rec;
  const fa = once(sa, 'match-found'), fb = once(sb, 'match-found');
  sb.emit('challenge-accept', { id: ch.id });
  const [ma, mb] = await Promise.all([fa, fb]);
  const white = ma.color === 'w' ? a : b, black = white === a ? b : a;
  return { roomId: ma.roomId, white, black, match: { a: ma, b: mb } };
}

// Yurishlar navbat bilan ('e2e4'); har yurishdan keyin raqibga yetib borishi kutiladi
async function play(game, moves) {
  for (let i = 0; i < moves.length; i++) {
    const mover = i % 2 === 0 ? game.white : game.black, other = mover === game.white ? game.black : game.white;
    const got = once(other.socket, 'opponent-move').catch(() => null);
    mover.socket.emit('make-move', { roomId: game.roomId, move: { from: moves[i].slice(0, 2), to: moves[i].slice(2, 4), promotion: moves[i][4] } });
    await got;
  }
}

async function finish(game, how) {
  const ended = once(game.white.socket, 'game-ended');
  if (how === 'white-resigns') game.white.socket.emit('game-over', { roomId: game.roomId, result: { type: 'resign' } });
  else if (how === 'black-resigns') game.black.socket.emit('game-over', { roomId: game.roomId, result: { type: 'resign' } });
  else if (how === 'draw') {
    const offered = once(game.black.socket, 'draw-offered');
    game.white.socket.emit('offer-draw', { roomId: game.roomId });
    await offered;
    game.black.socket.emit('accept-draw', { roomId: game.roomId });
  }
  const res = await ended;
  await sleep(300); // natijalar bazaga yozilib bo'linsin
  return res;
}

function closeAll(...users) { for (const u of users) if (u && u.socket) { u.socket.disconnect(); u.socket = null; } }

module.exports = { startServer, once, ack, startGame, play, finish, closeAll, sleep, uniq, ROOT };
