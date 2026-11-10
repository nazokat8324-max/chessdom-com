// Bir brauzerda (bitta socket) akkaunt almashtirish va chiqish (2026-11-10): eski akkaunt socketdan to'liq ajraladi —
// onlayn ko'rinmaydi, uning shaxsiy xabarlari yangi akkauntga kelmaydi, uning o'yinida yangi akkaunt yura olmaydi
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, startGame, sleep } = require('./helpers');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

const presence = async (...users) => (await srv.api(null, '/api/users/presence?ids=' + users.map((u) => u.id).join(','))).online;
const settle = () => sleep(250);

test("Akkaunt almashtirish: eski akkaunt oflayn bo'ladi, yangisi onlayn; chiqishda (logout) ham oflayn", async () => {
  const A = await srv.register('SwA'), B = await srv.register('SwB');
  const s = await srv.connect(A);
  assert.deepEqual(await presence(A, B), { [A.id]: true, [B.id]: false });
  s.emit('authenticate', B.token);
  await settle();
  assert.deepEqual(await presence(A, B), { [A.id]: false, [B.id]: true }, "eski akkaunt onlayn qolmasin");
  s.emit('logout');
  await settle();
  assert.deepEqual(await presence(A, B), { [A.id]: false, [B.id]: false });
  assert.equal(s.connected, true, 'socket ulanib qoladi');
  s.disconnect();
});

test("Akkaunt almashtirish: eski akkauntning shaxsiy bildirishnomalari shu socketga kelmaydi", async () => {
  const A = await srv.register('SwC'), B = await srv.register('SwD'), C = await srv.register('SwE');
  const s = await srv.connect(A);
  s.emit('authenticate', B.token);
  await settle();
  const got = [];
  s.on('friend-request-received', (d) => got.push(d));
  s.on('notification', (d) => got.push(d));
  const r = await srv.api(C, '/api/friends/request', 'POST', { username: A.name });
  assert.equal(r.success, true, JSON.stringify(r));
  await sleep(500);
  assert.deepEqual(got, [], "A ga yuborilgan narsa B ning socketiga keldi");
  s.disconnect();
});

test("Akkaunt almashtirish o'yin davomida: yangi akkaunt eski akkauntning o'yinida yura olmaydi, raqibga opponent-away", async () => {
  const A = await srv.register('SwF'), B = await srv.register('SwG'), X = await srv.register('SwH');
  const g = await startGame(srv, A, B);
  const away = new Promise((r) => B.socket.once('opponent-away', r));
  // A ning socketida X akkauntiga o'tiladi
  A.socket.emit('authenticate', X.token);
  assert.ok(await Promise.race([away, sleep(4000).then(() => null)]), 'raqibga opponent-away kelmadi');
  const rejected = new Promise((r) => A.socket.once('move-rejected', r));
  if (g.white === A) A.socket.emit('make-move', { roomId: g.roomId, move: { from: 'e2', to: 'e4' } });
  else {
    B.socket.emit('make-move', { roomId: g.roomId, move: { from: 'e2', to: 'e4' } });
    await sleep(300);
    A.socket.emit('make-move', { roomId: g.roomId, move: { from: 'e7', to: 'e5' } });
  }
  const r = await Promise.race([rejected, sleep(3000).then(() => null)]);
  assert.ok(r, "yurish rad etilishi kerak");
  assert.equal(r.reason, 'not_in_room');
  A.socket.disconnect(); B.socket.disconnect();
});
