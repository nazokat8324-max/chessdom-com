// Do'stlar, shaxsiy xabarlar, bloklash, kuzatish, bildirishnomalar, chaqiruv
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, once, closeAll, sleep } = require('./helpers');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

test("Do'stlik so'rovi, qabul qilish va bildirishnomalar", async () => {
  const a = await srv.register('Fr'), b = await srv.register('Fr');
  assert.equal((await srv.api(a, '/api/friends/request', 'POST', { username: b.name })).success, true);
  const notes = await srv.api(b, '/api/notifications');
  assert.ok(notes.notifications.some((n) => n.type === 'friend_request' && n.data.from === a.name));
  const reqs = await srv.api(b, '/api/friends/requests');
  assert.equal(reqs.requests.length, 1);
  await srv.api(b, '/api/friends/accept', 'POST', { requestId: reqs.requests[0].id });
  assert.equal((await srv.api(a, '/api/friends')).friends[0].username, b.name);
  assert.equal((await srv.api(a, '/api/friends/status/' + b.name)).status, 'friends');
});

test("Shaxsiy xabarlar: faqat ikki ishtirokchi o'qiydi", async () => {
  const a = await srv.register('Dm'), b = await srv.register('Dm'), c = await srv.register('Dm');
  await srv.api(a, '/api/chat/messages', 'POST', { roomId: 'user_' + b.id, message: 'salom B' });
  const conv = await srv.api(b, '/api/messages/conversations');
  assert.equal(conv.conversations[0].partner.username, a.name);
  assert.ok((await srv.api(b, '/api/messages/unread')).unread >= 1);
  const roomId = conv.conversations[0].roomId;
  const mine = await srv.api(b, '/api/chat/messages?roomId=' + encodeURIComponent(roomId));
  assert.ok(mine.messages.some((m) => m.message === 'salom B'));
  const spy = await srv.api(c, '/api/chat/messages?roomId=' + encodeURIComponent(roomId));
  assert.ok(!spy.success || !(spy.messages || []).length, 'begona foydalanuvchi o\'qiy olmaydi');
});

test("Bloklash: xabar va chaqiruv to'xtaydi", async () => {
  const a = await srv.register('Bl'), b = await srv.register('Bl');
  await srv.api(b, '/api/users/' + a.name + '/block', 'POST');
  const msg = await srv.api(a, '/api/chat/messages', 'POST', { roomId: 'user_' + b.id, message: 'hey' });
  assert.equal(msg.success, false);
  const sa = await srv.connect(a), sb = await srv.connect(b);
  const err = once(sa, 'challenge-error');
  sa.emit('challenge-send', { username: b.name, initial: 180, increment: 2 });
  assert.equal((await err).reason, 'blocked');
  sa.disconnect(); sb.disconnect();
});

test('Chaqiruv: oflayn, o\'zini, rad etish', async () => {
  const a = await srv.register('Ch'), b = await srv.register('Ch');
  a.socket = await srv.connect(a);
  let err = once(a.socket, 'challenge-error');
  a.socket.emit('challenge-send', { username: b.name, initial: 180, increment: 2 });
  assert.equal((await err).reason, 'offline');
  err = once(a.socket, 'challenge-error');
  a.socket.emit('challenge-send', { username: a.name, initial: 180, increment: 2 });
  assert.equal((await err).reason, 'self');
  b.socket = await srv.connect(b);
  const rec = once(b.socket, 'challenge-received');
  a.socket.emit('challenge-send', { username: b.name, initial: 600, increment: 5 });
  const ch = await rec;
  assert.equal(ch.from.username, a.name);
  assert.deepEqual(ch.clock, { initial: 600, increment: 5 });
  const declined = once(a.socket, 'challenge-declined');
  b.socket.emit('challenge-decline', { id: ch.id });
  assert.equal((await declined).id, ch.id);
  closeAll(a, b);
});

test('Kuzatish va bildirishnomalarni o\'qish', async () => {
  const a = await srv.register('Fo'), b = await srv.register('Fo');
  const f = await srv.api(a, '/api/follow', 'POST', { username: b.name, follow: true });
  assert.equal(f.isFollowing, true);
  assert.equal(f.followers, 1);
  const ex = await srv.api(a, '/api/users/' + b.name + '/extras');
  assert.equal(ex.isFollowing, true);
  await srv.api(a, '/api/friends/request', 'POST', { username: b.name });
  // Bildirishnoma javobdan keyin fonda yoziladi — paydo bo'lishini kutamiz (aks holda band kompyuterda u "o'qildi" dan
  // keyin yozilib, haqli ravishda o'qilmagan bo'lib qolardi va test tasodifan yiqilardi)
  for (let i = 0; i < 40; i++) {
    if ((await srv.api(b, '/api/notifications')).notifications.some((x) => x.type === 'friend_request')) break;
    await sleep(100);
  }
  await srv.api(b, '/api/notifications/read', 'POST');
  const n = await srv.api(b, '/api/notifications');
  assert.ok(n.notifications.every((x) => x.read));
});
