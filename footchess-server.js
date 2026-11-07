// ⚽ Shaxmat-futbol — onlayn o'yin (server-faqat, PRIVATE_FILES). Qoidalar footchess.js da — har bir harakat shu yerda tekshiriladi
// (findAction + step: navbat, qonuniylik, gol, hisob — mijoz natijani soxtalashtira olmaydi). 2 ga 2 kabi: xotirada, reytingsiz,
// statistika/tarix/klub ochkosiga yozilmaydi, deploydan keyin tiklanmaydi. Stol: /futbol?t=KOD, socket xonasi fc_<kod>.
// Navbat vaqti MOVE_MS (60 s): tugasa navbat raqibga o'tadi, ketma-ket 3 marta — texnik mag'lubiyat. Uzilish — AWAY_MS (60 s) ichida qaytmasa mag'lubiyat.
// server.js: init(deps) → { attach(socket), socketGone(socket), inFootGame, leaveWaiting }.
const F = require('./footchess');

const MOVE_MS = Number(process.env.FOOT_MOVE_MS) || 60 * 1000;
const AWAY_MS = Number(process.env.FOOT_AWAY_MS) || 60 * 1000;
const WAIT_TTL_MS = Number(process.env.FOOT_WAIT_TTL_MS) || 30 * 60 * 1000;
const OVER_TTL_MS = 10 * 60 * 1000;
const MAX_TIMEOUTS = 3;
const MAX_TABLES = 300;
const tables = new Map();
let io, deps;

function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code = Array.from({ length: 6 }, () => A[Math.floor(Math.random() * A.length)]).join(''); } while (tables.has(code));
  return code;
}
const codeOf = (data) => String((data && data.code) || '').toUpperCase().slice(0, 12);
const online = (userId) => { const r = userId && io.sockets.adapter.rooms.get('user_' + userId); return !!(r && r.size); };
const colorOf = (t, userId) => (t.players.w && t.players.w.userId === userId ? 'w' : t.players.b && t.players.b.userId === userId ? 'b' : null);
const pub = (p) => (p ? { username: p.username, country: p.country || null, online: online(p.userId) } : null);
// Bir davlatdan bo'lsa ikkinchi (qora) jamoa mehmon formasida
const sameCountry = (t) => !!(t.players.w && t.players.b && t.players.w.country && t.players.w.country === t.players.b.country);

function publicState(t) {
  return {
    code: t.code, status: t.status, seq: t.seq, players: { w: pub(t.players.w), b: pub(t.players.b) }, away: sameCountry(t),
    st: t.st, ev: t.ev, kickoff: t.kickoff || null, timeouts: { ...t.timeouts }, result: t.result,
    moveLeft: t.status === 'active' ? Math.max(0, MOVE_MS - (Date.now() - t.turnAt)) : null, moveMs: MOVE_MS,
    rematch: t.status === 'over' ? [...t.rematch].map((uid) => colorOf(t, uid)).filter(Boolean) : []
  };
}
function broadcast(t) { t.seq++; io.to('fc_' + t.code).emit('fc-state', publicState(t)); }

function end(t, winner, reason) {
  if (t.status !== 'active') return;
  t.status = 'over';
  clearTimeout(t.timer);
  t.result = { winner, reason };
  t.rematch = new Set();
  broadcast(t);
  const ref = t.gameNo;
  setTimeout(() => { if (tables.get(t.code) === t && t.status === 'over' && t.gameNo === ref) tables.delete(t.code); }, OVER_TTL_MS);
}
function schedule(t) {
  clearTimeout(t.timer);
  if (t.status !== 'active') return;
  t.turnAt = Date.now();
  t.timer = setTimeout(() => onTimeout(t), MOVE_MS + 50);
}
// Navbatdagi jamoaning qonuniy harakati bo'lmasa — navbat o'z-o'zidan o'tadi (prototipdagi kabi)
function autoPass(t) {
  for (let i = 0; i < 2 && !F.actions(t.st, t.st.turn).length; i++) t.st = F.step(t.st, null).st;
}
function onTimeout(t) {
  if (t.status !== 'active') return;
  const side = t.st.turn;
  t.timeouts[side]++;
  if (t.timeouts[side] >= MAX_TIMEOUTS) return end(t, F.other(side), 'timeout');
  t.st = F.step(t.st, null).st;
  t.ev = { pass: true, timeout: side };
  t.kickoff = null;
  autoPass(t);
  schedule(t);
  broadcast(t);
}
function start(t) {
  // Ranglar tasodifiy; oq markazdan boshlaydi
  if (Math.random() < 0.5) [t.players.w, t.players.b] = [t.players.b, t.players.w];
  t.status = 'active';
  t.gameNo++;
  t.st = F.formation('w');
  t.ev = null;
  t.kickoff = 'w';
  t.timeouts = { w: 0, b: 0 };
  t.result = null;
  t.rematch = new Set();
  for (const c of ['w', 'b']) if (deps.onStart) deps.onStart(t.players[c].userId);
  schedule(t);
  broadcast(t);
}

function leaveWaiting(userId, exceptCode) {
  for (const t of [...tables.values()]) {
    if (t.code === exceptCode || t.status !== 'waiting' || !t.players.w || t.players.w.userId !== userId) continue;
    tables.delete(t.code);
    io.to('fc_' + t.code).emit('fc-closed', { code: t.code });
  }
}
function inFootGame(userId) {
  for (const t of tables.values()) if (t.status === 'active' && colorOf(t, userId)) return true;
  return false;
}
// deps.inActiveGame oddiy, 2 ga 2 va futbol o'yinlarini sanaydi (server.js)
const busy = (userId) => inFootGame(userId) || !!(deps.inActiveGame && deps.inActiveGame(userId));
async function playerOf(socket) {
  const userId = socket.data.userId;
  let country = null;
  try { country = deps.countryOf ? await deps.countryOf(userId) : null; } catch (e) { country = null; }
  if (!country || country === 'un' || !/^[a-z]{2}$/.test(country)) country = null;
  return { userId, username: socket.data.username, country };
}

function attach(socket) {
  const uid = () => socket.data.userId;
  const reply = (ack, v) => { if (typeof ack === 'function') ack(v); };

  socket.on('fc-create', async (data, ack) => {
    if (!uid()) return reply(ack, { ok: false, reason: 'auth' });
    if (busy(uid())) return reply(ack, { ok: false, reason: 'busy' });
    leaveWaiting(uid());
    if (tables.size >= MAX_TABLES) return reply(ack, { ok: false, reason: 'full' });
    const me = await playerOf(socket);
    if (busy(uid())) return reply(ack, { ok: false, reason: 'busy' });
    leaveWaiting(uid());
    const t = { code: newCode(), createdAt: Date.now(), status: 'waiting', players: { w: me, b: null }, st: null, ev: null, timeouts: { w: 0, b: 0 },
      result: null, timer: null, turnAt: 0, seq: 0, gameNo: 0, rematch: new Set() };
    tables.set(t.code, t);
    socket.join('fc_' + t.code);
    reply(ack, { ok: true, code: t.code, state: publicState(t) });
  });

  socket.on('fc-list', (data, ack) => {
    const all = [...tables.values()].sort((a, b) => b.createdAt - a.createdAt);
    const waiting = all.filter((t) => t.status === 'waiting').slice(0, 30).map((t) => ({ code: t.code, host: pub(t.players.w) }));
    const live = all.filter((t) => t.status === 'active').slice(0, 30).map((t) => ({ code: t.code, players: { w: pub(t.players.w), b: pub(t.players.b) }, score: t.st.score }));
    reply(ack, { ok: true, waiting, live });
  });

  socket.on('fc-watch', (data, ack) => {
    const t = tables.get(codeOf(data));
    if (!t) return reply(ack, { ok: false, reason: 'not_found' });
    socket.join('fc_' + t.code);
    reply(ack, { ok: true, state: publicState(t), myColor: uid() ? colorOf(t, uid()) : null });
  });
  socket.on('fc-unwatch', (data) => { const c = codeOf(data); if (c) socket.leave('fc_' + c); });

  socket.on('fc-join', async (data, ack) => {
    const t = tables.get(codeOf(data));
    if (!uid()) return reply(ack, { ok: false, reason: 'auth' });
    if (!t) return reply(ack, { ok: false, reason: 'not_found' });
    if (t.status !== 'waiting') return reply(ack, { ok: false, reason: 'started' });
    if (t.players.w.userId === uid()) return reply(ack, { ok: false, reason: 'self' });
    if (deps.blockedPair && deps.blockedPair(uid(), t.players.w.userId)) return reply(ack, { ok: false, reason: 'blocked' });
    if (busy(uid())) return reply(ack, { ok: false, reason: 'busy' });
    const me = await playerOf(socket);
    // Bazadan o'qiguncha holat o'zgargan bo'lishi mumkin — qayta tekshiruv
    if (t.status !== 'waiting' || tables.get(t.code) !== t) return reply(ack, { ok: false, reason: 'started' });
    if (busy(uid()) || busy(t.players.w.userId)) return reply(ack, { ok: false, reason: 'busy' });
    leaveWaiting(uid(), t.code);
    t.players.b = me;
    socket.join('fc_' + t.code);
    start(t);
    reply(ack, { ok: true, code: t.code, myColor: colorOf(t, uid()), state: publicState(t) });
  });

  socket.on('fc-leave', (data, ack) => {
    const t = tables.get(codeOf(data));
    if (!t || !uid() || t.status !== 'waiting' || t.players.w.userId !== uid()) return reply(ack, { ok: false });
    tables.delete(t.code);
    io.to('fc_' + t.code).emit('fc-closed', { code: t.code });
    reply(ack, { ok: true });
  });

  socket.on('fc-move', (data, ack) => {
    const t = tables.get(codeOf(data));
    if (!t || t.status !== 'active') return reply(ack, { ok: false, reason: 'not_active' });
    const color = uid() ? colorOf(t, uid()) : null;
    if (!color || color !== t.st.turn) return reply(ack, { ok: false, reason: 'not_your_turn' });
    if (Date.now() - t.turnAt >= MOVE_MS) { reply(ack, { ok: false, reason: 'not_your_turn' }); return onTimeout(t); }
    const a = F.findAction(t.st, data);
    if (!a) return reply(ack, { ok: false, reason: 'invalid_move' });
    const r = F.step(t.st, a);
    t.st = r.st;
    t.ev = r.ev;
    t.kickoff = r.kickoff || null;
    t.timeouts[color] = 0;
    reply(ack, { ok: true });
    if (r.over) return end(t, r.winner, r.ev.goal && r.st.score[r.ev.goal] >= F.GOALS ? 'goals' : 'moves');
    autoPass(t);
    schedule(t);
    broadcast(t);
  });

  socket.on('fc-resign', (data, ack) => {
    const t = tables.get(codeOf(data));
    const color = t && uid() ? colorOf(t, uid()) : null;
    if (!color || t.status !== 'active') return reply(ack, { ok: false });
    end(t, F.other(color), 'resign');
    reply(ack, { ok: true });
  });

  // Revansh: ikkalasi so'rasa — o'sha stolda yangi o'yin (ranglar yana tasodifiy)
  socket.on('fc-rematch', (data, ack) => {
    const t = tables.get(codeOf(data));
    const color = t && uid() ? colorOf(t, uid()) : null;
    if (!color || t.status !== 'over') return reply(ack, { ok: false });
    if (busy(uid())) return reply(ack, { ok: false, reason: 'busy' });
    t.rematch.add(uid());
    reply(ack, { ok: true });
    const both = ['w', 'b'].every((c) => t.rematch.has(t.players[c].userId) && online(t.players[c].userId) && !busy(t.players[c].userId));
    if (both) start(t); else broadcast(t);
  });
}

// Uzilish: kutayotgan stol yopiladi; o'yinda AWAY_MS ichida qaytmasa — mag'lubiyat
function socketGone(socket) {
  const id = socket.data && socket.data.userId;
  if (!id) return;
  setTimeout(() => {
    if (online(id)) return;
    for (const t of [...tables.values()]) {
      const color = colorOf(t, id);
      if (!color) continue;
      if (t.status === 'waiting') { tables.delete(t.code); continue; }
      broadcast(t);
      if (t.status !== 'active') continue;
      const ref = t.gameNo;
      setTimeout(() => { if (t.status === 'active' && t.gameNo === ref && !online(id)) end(t, F.other(color), 'abandon'); }, AWAY_MS);
    }
  }, 100);
}

function init(d) {
  io = d.io;
  deps = d;
  // To'lmagan stollar yopiladi (bazaga murojaat yo'q)
  setInterval(() => {
    const now = Date.now();
    for (const t of tables.values()) if (t.status === 'waiting' && now - t.createdAt > WAIT_TTL_MS) { tables.delete(t.code); io.to('fc_' + t.code).emit('fc-closed', { code: t.code }); }
  }, 60 * 1000).unref();
  return { attach, socketGone, tables, inFootGame, leaveWaiting };
}

module.exports = { init, MOVE_MS };
