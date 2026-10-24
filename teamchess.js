// 🤝 Maslahatli shaxmat (2 ga 2), server-faqat: har tomonda ikki o'yinchi navbat bilan yuradi (oqning 1-yurishi — w1, 2-si — w2 ...),
// jamoadosh yashirin jamoa chatida maslahat beradi va taxtada yurish taklif qiladi (team-suggest). Reytingsiz, tarixga yozilmaydi,
// xotirada (deploydan keyin tiklanmaydi). Stol: /jamoa?t=KOD. Socket xonasi team_<kod>. server.js: init(deps) → attach(socket), socketGone(socket).
const { Chess } = require('chess.js');

const SEATS = ['w1', 'w2', 'b1', 'b2'];
const WAIT_TTL_MS = Number(process.env.TEAM_WAIT_TTL_MS) || 30 * 60 * 1000;
const FIRST_MOVE_MS = Number(process.env.TEAM_FIRST_MOVE_MS) || 90 * 1000;
const AWAY_MS = Number(process.env.TEAM_AWAY_MS) || 90 * 1000;
const OVER_TTL_MS = 10 * 60 * 1000;
const tables = new Map();
let io, deps;

const other = (c) => (c === 'w' ? 'b' : 'w');
function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code = Array.from({ length: 6 }, () => A[Math.floor(Math.random() * A.length)]).join(''); } while (tables.has(code));
  return code;
}
function normClock(initial, increment) {
  const i = Math.round(Number(initial)), inc = Math.round(Number(increment));
  return { initial: Number.isFinite(i) ? Math.min(3600, Math.max(60, i)) : 600, increment: Number.isFinite(inc) ? Math.min(60, Math.max(0, inc)) : 5 };
}
const online = (userId) => { const r = userId && io.sockets.adapter.rooms.get('user_' + userId); return !!(r && r.size); };
const seatOf = (t, userId) => SEATS.find((s) => t.seats[s] && t.seats[s].userId === userId) || null;
// Navbatdagi o'yinchi: jamoaning nechanchi yurishi bo'yicha; u oflayn bo'lsa — jamoadoshi ham yura oladi
function moverSeat(t, color) { return color + ((t.moveCount[color] % 2) + 1); }
function allowedSeats(t, color) {
  const m = moverSeat(t, color), mate = color + (m.endsWith('1') ? '2' : '1');
  return t.seats[m] && online(t.seats[m].userId) ? [m] : [m, mate];
}

function clockState(t) {
  const c = { w: t.timeLeft.w, b: t.timeLeft.b };
  const turn = t.chess ? t.chess.turn() : 'w';
  const running = t.status === 'active' && t.turnStartedAt !== null;
  if (running) c[turn] = Math.max(0, c[turn] - (Date.now() - t.turnStartedAt));
  return { w: c.w, b: c.b, turn, running };
}
function publicState(t) {
  const turn = t.chess ? t.chess.turn() : 'w';
  const hist = t.chess ? t.chess.history({ verbose: true }) : [];
  const last = hist[hist.length - 1];
  return {
    code: t.code, status: t.status, clock: { initial: t.clock.initial, increment: t.clock.increment },
    seats: SEATS.map((s) => ({ seat: s, username: t.seats[s] ? t.seats[s].username : null, online: t.seats[s] ? online(t.seats[s].userId) : false })),
    fen: t.chess ? t.chess.fen() : null, moves: hist.map((m) => m.san), lastMove: last ? [last.from, last.to] : null,
    turn, mover: t.status === 'active' ? moverSeat(t, turn) : null, clockState: clockState(t), result: t.result
  };
}
function broadcast(t) { io.to('team_' + t.code).emit('team-state', publicState(t)); }
// Jamoa a'zolariga (chat, maslahat) — boshqa jamoa va tomoshabinlar ko'rmaydi
function toTeam(t, color, event, payload) {
  for (const s of [color + '1', color + '2']) if (t.seats[s]) io.to('user_' + t.seats[s].userId).emit(event, payload);
}

function end(t, winner, reason) {
  if (t.status !== 'active') return;
  t.status = 'over';
  clearTimeout(t.timer);
  if (t.turnStartedAt !== null) { const c = t.chess.turn(); t.timeLeft[c] = Math.max(0, t.timeLeft[c] - (Date.now() - t.turnStartedAt)); }
  t.turnStartedAt = null;
  t.result = { winner, reason };
  t.endedAt = Date.now();
  broadcast(t);
  setTimeout(() => { if (tables.get(t.code) === t) tables.delete(t.code); }, OVER_TTL_MS);
}
function schedule(t) {
  clearTimeout(t.timer);
  if (t.status !== 'active' || t.turnStartedAt === null) return;
  const c = t.chess.turn();
  t.timer = setTimeout(() => end(t, other(c), 'timeout'), Math.max(0, t.timeLeft[c]) + 50);
}
function start(t) {
  t.status = 'active';
  t.chess = new Chess();
  t.timeLeft = { w: t.clock.initial * 1000, b: t.clock.initial * 1000 };
  t.moveCount = { w: 0, b: 0 };
  t.turnStartedAt = null; // soat oqning birinchi yurishidan keyin yuradi
  t.startedAt = Date.now();
  broadcast(t);
}

function attach(socket) {
  const uid = () => socket.data.userId, uname = () => socket.data.username;
  const reply = (ack, v) => { if (typeof ack === 'function') ack(v); };

  socket.on('team-create', (data, ack) => {
    if (!uid()) return reply(ack, { ok: false, reason: 'auth' });
    const clock = normClock(data && data.initial, data && data.increment);
    const t = { code: newCode(), createdAt: Date.now(), clock, seats: { w1: null, w2: null, b1: null, b2: null }, status: 'waiting', chess: null,
      timeLeft: { w: clock.initial * 1000, b: clock.initial * 1000 }, moveCount: { w: 0, b: 0 }, turnStartedAt: null, timer: null, result: null, chat: { w: [], b: [] } };
    t.seats.w1 = { userId: uid(), username: uname() };
    tables.set(t.code, t);
    socket.join('team_' + t.code);
    reply(ack, { ok: true, code: t.code });
  });

  socket.on('team-watch', (data, ack) => {
    const t = tables.get(String((data && data.code) || '').toUpperCase());
    if (!t) return reply(ack, { ok: false, reason: 'not_found' });
    socket.join('team_' + t.code);
    const seat = uid() ? seatOf(t, uid()) : null;
    reply(ack, { ok: true, state: publicState(t), mySeat: seat, chat: seat ? t.chat[seat[0]] : [] });
  });
  socket.on('team-unwatch', (data) => { if (data && data.code) socket.leave('team_' + String(data.code).toUpperCase()); });

  socket.on('team-list', (data, ack) => {
    const list = [...tables.values()].filter((t) => t.status === 'waiting').sort((a, b) => b.createdAt - a.createdAt).slice(0, 30)
      .map((t) => ({ code: t.code, clock: t.clock, players: SEATS.filter((s) => t.seats[s]).map((s) => t.seats[s].username) }));
    reply(ack, { ok: true, tables: list });
  });

  socket.on('team-sit', (data, ack) => {
    const t = tables.get(String((data && data.code) || '').toUpperCase());
    const seat = data && data.seat;
    if (!uid()) return reply(ack, { ok: false, reason: 'auth' });
    if (!t) return reply(ack, { ok: false, reason: 'not_found' });
    if (t.status !== 'waiting') return reply(ack, { ok: false, reason: 'started' });
    if (!SEATS.includes(seat)) return reply(ack, { ok: false, reason: 'bad_seat' });
    if (t.seats[seat] && t.seats[seat].userId !== uid()) return reply(ack, { ok: false, reason: 'taken' });
    const was = seatOf(t, uid());
    if (was) t.seats[was] = null;
    t.seats[seat] = { userId: uid(), username: uname() };
    socket.join('team_' + t.code);
    reply(ack, { ok: true, seat, chat: t.chat[seat[0]] });
    if (SEATS.every((s) => t.seats[s])) start(t); else broadcast(t);
  });

  socket.on('team-stand', (data, ack) => {
    const t = tables.get(String((data && data.code) || '').toUpperCase());
    if (!t || !uid()) return reply(ack, { ok: false });
    if (t.status !== 'waiting') return reply(ack, { ok: false, reason: 'started' });
    const s = seatOf(t, uid());
    if (s) t.seats[s] = null;
    if (SEATS.every((x) => !t.seats[x])) tables.delete(t.code); else broadcast(t);
    reply(ack, { ok: true });
  });

  socket.on('team-move', (data, ack) => {
    const t = tables.get(String((data && data.code) || '').toUpperCase());
    if (!t || t.status !== 'active') return reply(ack, { ok: false, reason: 'not_active' });
    const s = uid() ? seatOf(t, uid()) : null;
    const color = t.chess.turn();
    if (!s || s[0] !== color || !allowedSeats(t, color).includes(s)) return reply(ack, { ok: false, reason: 'not_your_turn' });
    let mv = null;
    try { mv = t.chess.move({ from: String(data.from), to: String(data.to), promotion: data.promotion || 'q' }); } catch (e) { mv = null; }
    if (!mv) return reply(ack, { ok: false, reason: 'invalid_move' });
    const now = Date.now();
    if (t.turnStartedAt !== null) t.timeLeft[color] = Math.max(0, t.timeLeft[color] - (now - t.turnStartedAt)) + t.clock.increment * 1000;
    t.moveCount[color]++;
    t.turnStartedAt = now;
    reply(ack, { ok: true, san: mv.san });
    if (t.chess.in_checkmate()) return end(t, color, 'checkmate');
    if (t.chess.in_stalemate()) return end(t, null, 'stalemate');
    if (t.chess.in_threefold_repetition()) return end(t, null, 'threefold');
    if (t.chess.insufficient_material()) return end(t, null, 'insufficient');
    if (t.chess.in_draw()) return end(t, null, 'fifty');
    schedule(t);
    broadcast(t);
  });

  socket.on('team-suggest', (data, ack) => {
    const t = tables.get(String((data && data.code) || '').toUpperCase());
    if (!t || t.status !== 'active' || !uid()) return reply(ack, { ok: false });
    const s = seatOf(t, uid());
    const color = t.chess.turn();
    if (!s || s[0] !== color) return reply(ack, { ok: false, reason: 'not_your_turn' });
    const legal = t.chess.moves({ verbose: true }).find((m) => m.from === data.from && m.to === data.to);
    if (!legal) return reply(ack, { ok: false, reason: 'invalid_move' });
    toTeam(t, color, 'team-suggest', { code: t.code, from: legal.from, to: legal.to, san: legal.san, by: uname() });
    reply(ack, { ok: true });
  });

  socket.on('team-chat', (data, ack) => {
    const t = tables.get(String((data && data.code) || '').toUpperCase());
    const s = t && uid() ? seatOf(t, uid()) : null;
    if (!s) return reply(ack, { ok: false });
    let message = String((data && data.message) || '').trim().slice(0, 200);
    if (!message || deps.mutedUntil(uid())) return reply(ack, { ok: false });
    message = deps.cleanChat(message);
    const item = { from: uname(), message, at: new Date().toISOString() };
    t.chat[s[0]].push(item);
    if (t.chat[s[0]].length > 50) t.chat[s[0]].shift();
    toTeam(t, s[0], 'team-chat', { code: t.code, ...item });
    reply(ack, { ok: true });
  });

  socket.on('team-resign', (data, ack) => {
    const t = tables.get(String((data && data.code) || '').toUpperCase());
    const s = t && uid() ? seatOf(t, uid()) : null;
    if (!s || t.status !== 'active') return reply(ack, { ok: false });
    end(t, other(s[0]), 'resign');
    reply(ack, { ok: true });
  });
}

// Uzilish: onlayn belgilari yangilanadi; o'yinda jamoaning ikkala a'zosi AWAY_MS davomida qaytmasa — jamoa yutqazadi
function socketGone(socket) {
  const id = socket.data && socket.data.userId;
  if (!id) return;
  for (const t of tables.values()) {
    const s = seatOf(t, id);
    if (!s) continue;
    setTimeout(() => broadcast(t), 50);
    if (t.status !== 'active') continue;
    const color = s[0];
    setTimeout(() => {
      if (t.status !== 'active') return;
      const team = [color + '1', color + '2'].map((x) => t.seats[x]);
      if (team.every((p) => !p || !online(p.userId))) end(t, other(color), 'abandon');
    }, AWAY_MS);
  }
}

function init(d) {
  io = d.io;
  deps = d;
  // Tozalash: to'lmagan stollar, birinchi yurish qilinmagan o'yinlar
  setInterval(() => {
    const now = Date.now();
    for (const t of tables.values()) {
      if (t.status === 'waiting' && now - t.createdAt > WAIT_TTL_MS) { tables.delete(t.code); io.to('team_' + t.code).emit('team-closed', { code: t.code }); }
      else if (t.status === 'active' && t.moveCount.w === 0 && now - t.startedAt > FIRST_MOVE_MS) end(t, null, 'aborted');
    }
  }, Math.min(15000, FIRST_MOVE_MS / 3));
  return { attach, socketGone, tables };
}

module.exports = { init, SEATS };
