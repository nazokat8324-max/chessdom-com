// Ro'yxatdan o'tish, kirish, parol, akkauntni o'chirish
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, startGame, finish, closeAll, uniq, once } = require('./helpers');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

test("Ro'yxatdan o'tish: tekshiruvlar", async () => {
  const bad = async (body) => (await srv.api(null, '/api/auth/register', 'POST', body)).status;
  assert.equal(await bad({ username: 'ab', email: 'a@t.uz', password: 'secret1' }), 400, 'qisqa nom');
  assert.equal(await bad({ username: 'bad<name>', email: 'b@t.uz', password: 'secret1' }), 400, 'xavfli belgilar');
  assert.equal(await bad({ username: uniq('Ok'), email: 'c@t.uz', password: '123' }), 400, 'qisqa parol');
  const u = await srv.register('Reg');
  assert.ok(u.token);
  assert.equal(await bad({ username: u.name, email: 'd@t.uz', password: 'secret1' }), 409, 'band nom');
  // Band email — 500 emas, tushunarli 409 (katta-kichik harf farqi ham)
  const dup = await srv.api(null, '/api/auth/register', 'POST', { username: uniq('Em'), email: u.name.toUpperCase() + '@TEST.UZ', password: 'secret1' });
  assert.equal(dup.status, 409, 'band email');
  assert.equal(dup.message, 'Bu email boshqa akkauntga biriktirilgan!');
});

test('Kirish va token', async () => {
  const u = await srv.register('Log');
  assert.equal((await srv.api(null, '/api/auth/login', 'POST', { username: u.name, password: 'wrong' })).status, 401);
  const ok = await srv.api(null, '/api/auth/login', 'POST', { username: u.name, password: u.password });
  assert.equal(ok.success, true);
  assert.equal(ok.user.username, u.name);
  assert.equal((await srv.api(null, '/api/notifications')).status, 401, 'tokensiz');
  assert.equal((await srv.api({ token: 'garbage' }, '/api/notifications')).status, 401, 'yaroqsiz token');
  assert.equal((await srv.api(u, '/api/notifications')).success, true);
});

test("Parolni o'zgartirish", async () => {
  const u = await srv.register('Pwd');
  assert.equal((await srv.api(u, '/api/users/me/password', 'POST', { current: 'nope', next: 'newpass1' })).status, 401);
  assert.equal((await srv.api(u, '/api/users/me/password', 'POST', { current: u.password, next: 'newpass1' })).success, true);
  assert.equal((await srv.api(null, '/api/auth/login', 'POST', { username: u.name, password: 'newpass1' })).success, true);
});

test("Akkauntni o'chirish: ma'lumotlar tozalanadi, raqib tarixida anonim nom", async () => {
  const a = await srv.register('Del'), b = await srv.register('Opp');
  await srv.api(a, '/api/friends/request', 'POST', { username: b.name });
  await srv.api(a, '/api/chat/messages', 'POST', { roomId: 'user_' + b.id, message: 'salom' });
  const g = await startGame(srv, a, b);
  // O'yin davomida o'chirib bo'lmaydi
  const busy = await srv.api(a, '/api/users/me/delete', 'POST', { password: a.password, confirm: a.name });
  assert.equal(busy.status, 409);
  await finish(g, 'black-resigns');
  closeAll(a, b);
  assert.equal((await srv.api(a, '/api/users/me/delete', 'POST', { password: 'wrong', confirm: a.name })).status, 401);
  assert.equal((await srv.api(a, '/api/users/me/delete', 'POST', { password: a.password, confirm: 'other' })).status, 400);
  assert.equal((await srv.api(a, '/api/users/me/delete', 'POST', { password: a.password, confirm: a.name })).success, true);
  assert.equal((await srv.api(a, '/api/notifications')).status, 401, 'eski token ishlamaydi');
  assert.equal((await srv.api(null, '/api/auth/login', 'POST', { username: a.name, password: a.password })).status, 401);
  assert.equal((await srv.api(null, '/api/users/' + a.name + '/profile')).status, 404);
  const s = await srv.connect(null);
  const err = once(s, 'auth-error');
  s.emit('authenticate', a.token);
  assert.ok(await err, 'socket eski tokenni rad etadi');
  s.disconnect();
  const hist = await srv.api(null, '/api/users/' + b.name + '/history');
  assert.match(hist.games[0].opponent, /^deleted-[0-9a-f]{8}$/);
  const conv = await srv.api(b, '/api/messages/conversations');
  assert.equal(conv.conversations.length, 0, "o'chirilgan foydalanuvchi xabarlari yo'q");
  assert.equal((await srv.api(b, '/api/friends')).friends.length, 0);
  // Nom bo'shadi
  const again = await srv.api(null, '/api/auth/register', 'POST', { username: a.name, email: 'again@t.uz', password: 'secret1' });
  assert.equal(again.success, true);
});
