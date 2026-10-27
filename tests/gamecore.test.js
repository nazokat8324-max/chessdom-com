// O'yin yadrosi (1-bosqich tekshiruvi): soat noqonuniy yurishda o'zgarmaydi, vaqt tugaganda raqibda mat uchun dona
// bo'lmasa durrang, durrang taklifini qayta-qayta yuborib bo'lmaydi, o'yindagi o'yinchi ikkinchi o'yinga tushmaydi
const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, once, startGame, play, finish, closeAll, sleep } = require('./helpers');

let srv;
test.before(async () => { srv = await startServer({ CHESS960_TEST_FEN: '4k3/8/8/8/8/8/8/Q3K3 w - - 0 1' }); });
test.after(async () => { await srv.stop(); });

test("Noqonuniy yurish soatdan vaqt olmaydi (avval ikki marta ayirilardi)", async () => {
  const a = await srv.register('Gc'), b = await srv.register('Gc');
  const g = await startGame(srv, a, b, { initial: 60, increment: 0 });
  await play(g, ['e2e4', 'e7e5']); // soat endi oqda yuradi
  await sleep(700);
  const rejected = once(g.white.socket, 'move-rejected');
  g.white.socket.emit('make-move', { roomId: g.roomId, move: { from: 'e1', to: 'e5' } });
  assert.equal((await rejected).reason, 'invalid_move');
  const clock = once(g.white.socket, 'clock-update');
  g.white.socket.emit('make-move', { roomId: g.roomId, move: { from: 'g1', to: 'f3' } });
  const c = await clock;
  const used = 60000 - c.w;
  assert.ok(used >= 600 && used < 1250, 'oq ~0.7 s sarfladi, ikki marta emas: ' + used);
  await finish(g, 'white-resigns');
  closeAll(a, b);
});

test("Durrang taklifi: bir yurishda bitta; raqib yurgach yana taklif qilish mumkin", async () => {
  const a = await srv.register('Gd'), b = await srv.register('Gd');
  const g = await startGame(srv, a, b);
  await play(g, ['e2e4', 'e7e5']);
  const first = once(g.black.socket, 'draw-offered');
  g.white.socket.emit('offer-draw', { roomId: g.roomId });
  await first;
  const declined = once(g.white.socket, 'draw-declined');
  g.black.socket.emit('decline-draw', { roomId: g.roomId });
  await declined;
  g.black.socket.events.length = 0;
  for (let i = 0; i < 3; i++) g.white.socket.emit('offer-draw', { roomId: g.roomId });
  await sleep(400);
  assert.equal(g.black.socket.events.filter((x) => x.e === 'draw-offered').length, 0, 'shu yurishda qayta taklif yetib bormaydi');
  await play(g, ['g1f3', 'b8c6']);
  const again = once(g.black.socket, 'draw-offered');
  g.white.socket.emit('offer-draw', { roomId: g.roomId });
  await again;
  await finish(g, 'black-resigns');
  closeAll(a, b);
});

test("O'yindagi o'yinchi matchmaking navbatiga tusha olmaydi", async () => {
  const a = await srv.register('Gm'), b = await srv.register('Gm');
  const g = await startGame(srv, a, b);
  const r = await srv.api(a, '/api/matchmaking/join', 'POST', { socketId: a.socket.id, initialTime: 180, increment: 0 });
  assert.equal(r.status, 409);
  assert.equal(r.reason, 'in_game');
  await finish(g, 'white-resigns');
  const ok = await srv.api(a, '/api/matchmaking/join', 'POST', { socketId: a.socket.id, initialTime: 180, increment: 0 });
  assert.equal(ok.success, true);
  await srv.api(a, '/api/matchmaking/leave', 'POST');
  closeAll(a, b);
});

test("Revansh: taklifdan keyin raqib boshqa o'yinga kirgan bo'lsa — revansh boshlanmaydi", async () => {
  const a = await srv.register('Gr'), b = await srv.register('Gr'), c = await srv.register('Gr');
  const g = await startGame(srv, a, b);
  await finish(g, 'white-resigns');
  const offered = once(b.socket, 'rematch-offered');
  a.socket.emit('rematch-offer', { roomId: g.roomId });
  await offered;
  // A taklif qilib, boshqa o'yinchi bilan o'yin boshladi
  const g2 = await startGame(srv, a, c);
  const unavailable = once(b.socket, 'rematch-unavailable');
  b.socket.emit('rematch-accept', { roomId: g.roomId });
  await unavailable;
  await sleep(300);
  assert.equal(b.socket.events.filter((x) => x.e === 'match-found').length, 1, "B ga yangi o'yin kelmadi");
  await finish(g2, 'white-resigns');
  closeAll(a, b, c);
});

test("Vaqt tugadi, raqibda faqat shoh — durrang (dona yetishmaydi); aks holda vaqt bo'yicha mag'lubiyat", { timeout: 60000 }, async () => {
  const a = await srv.register('Gt'), b = await srv.register('Gt');
  // Oqda shoh + farzin, qorada faqat shoh: oqning vaqti tugasa, qora yuta olmaydi
  const g = await startGame(srv, a, b, { initial: 30, increment: 0, variant: 'chess960', rated: false });
  await play(g, ['a1a2', 'e8e7']);
  const ended = await once(g.white.socket, 'game-ended', 40000);
  assert.equal(ended.winner, null);
  assert.equal(ended.reason, 'insufficient');
  closeAll(a, b);
});
