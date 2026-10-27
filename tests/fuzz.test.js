// Socket mustahkamligi: har bir hodisaga noto'g'ri ma'lumot (null, son, matn, bo'sh obyekt, massiv) yuborilsa ham
// server yiqilmasligi kerak (bitta ushlanmagan xato butun serverni qayta ishga tushirardi — barcha o'yinlar uziladi)
const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, startGame, closeAll, sleep } = require('./helpers');

const EVENTS = ['accept-draw', 'authenticate', 'challenge-accept', 'challenge-cancel', 'challenge-decline', 'challenge-send', 'decline-draw',
  'game-blur', 'game-chat', 'game-over', 'invite-accept', 'join-club-room', 'league-cancel', 'league-ready', 'leave-room', 'make-move',
  'offer-draw', 'page-visibility', 'predict-move', 'predict-result', 'rate-opponent', 'rematch-accept', 'rematch-decline', 'rematch-offer',
  'rtt-probe', 'tea-enter', 'tea-exit', 'tea-join', 'tea-sit', 'tea-stand', 'team-chat', 'team-create', 'team-list', 'team-move',
  'team-resign', 'team-sit', 'team-stand', 'team-suggest', 'team-unwatch', 'team-watch', 'unwatch-game', 'watch-chat', 'watch-game'];

let srv;
test.before(async () => { srv = await startServer(); });
test.after(async () => { await srv.stop(); });

test("Socket: noto'g'ri ma'lumotli hodisalar serverni yiqitmaydi", async () => {
  const a = await srv.register('Fz'), b = await srv.register('Fz');
  a.socket = await srv.connect(a); b.socket = await srv.connect(b);
  const g = await startGame(srv, a, b);
  const roomId = g.roomId;
  const payloads = [undefined, null, 0, 42, 'x', '', true, [], {}, { roomId }, { roomId, from: null }, { code: null }, { id: {} },
    { roomId, move: null }, { roomId, message: {} }, { roomId, ply: 'a', from: [] }, roomId, { roomId: { toString: null } }];
  for (const ev of EVENTS) {
    if (ev === 'authenticate') continue;
    for (const p of payloads) { a.socket.emit(ev, p); a.socket.emit(ev, p, () => {}); }
  }
  // Mehmon emas — kirmagan socket ham
  const anon = require('socket.io-client').io(srv.base, { transports: ['websocket'], forceNew: true });
  await new Promise((r) => anon.on('connect', r));
  for (const ev of EVENTS) for (const p of payloads) anon.emit(ev, p);
  anon.emit('authenticate', { token: {} }); anon.emit('authenticate', null); anon.emit('authenticate', 12);
  await sleep(1500);
  const crashes = srv.log().split(/\r?\n/).filter((l) => /Ushlanmagan|TypeError|ReferenceError/.test(l));
  assert.deepEqual(crashes, [], 'ushlanmagan xatolar');
  const r = await srv.api(a, '/api/leaderboard');
  assert.equal(r.success, true, 'server ishlayapti');
  anon.close();
  closeAll(a, b);
});
