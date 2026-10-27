// Xavfsizlik (2-bosqich tekshiruvi): chat faqat shaxsiy (dm_) va klub xonalarida, eski socket chat hodisalari ishlamaydi,
// klub xonasidan boshqa xonaga qo'shilib bo'lmaydi, ban socketni uzadi, 2 ga 2 da bitta stol va band o'yinchi cheklovi
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { startServer, once, ack, startGame, finish, closeAll, sleep } = require('./helpers');

let srv;
test.before(async () => { srv = await startServer(); });
test.after(async () => { await srv.stop(); });

const sql = (q, prm) => new Promise((resolve, reject) => {
  const d = new (require('sqlite3').Database)(path.join(srv.dir, 'test.sqlite'));
  d.run(q, prm, (err) => d.close(() => (err ? reject(err) : resolve())));
});

test("Chat: xonasiz yoki ixtiyoriy nomli xonaga yozib/o'qib bo'lmaydi; shaxsiy xabar ishlaydi", async () => {
  const a = await srv.register('Sc'), b = await srv.register('Sc');
  b.socket = await srv.connect(b);
  assert.equal((await srv.api(a, '/api/chat/messages', 'POST', { message: 'hammaga' })).status, 403);
  assert.equal((await srv.api(a, '/api/chat/messages', 'POST', { message: 'yashirin', roomId: 'maxfiy-xona' })).status, 403);
  assert.equal((await srv.api(a, '/api/chat/messages')).status, 403);
  assert.equal((await srv.api(a, '/api/chat/messages?roomId=maxfiy-xona')).status, 403);
  await sleep(200);
  assert.equal(b.socket.events.filter((x) => x.e === 'chat-message').length, 0, 'hammaga yuborilmadi');
  const got = once(b.socket, 'chat-message');
  assert.equal((await srv.api(a, '/api/chat/messages', 'POST', { message: 'salom', roomId: 'user_' + b.id })).success, true);
  assert.equal((await got).message, 'salom');
  assert.equal((await srv.api(a, '/api/chat/messages?roomId=' + encodeURIComponent('club_Uzbekistan'))).success, true);
  closeAll(a, b);
});

test("Eski socket chat (send-chat-message) va istalgan xonaga qo'shilish (join-chat-room) ishlamaydi", async () => {
  const a = await srv.register('Ss'), b = await srv.register('Ss');
  a.socket = await srv.connect(a); b.socket = await srv.connect(b);
  // B ni bloklagan bo'lsa ham avval socket orqali xabar yetib borardi
  await srv.api(b, '/api/users/' + a.name + '/block', 'POST');
  a.socket.emit('send-chat-message', { receiverId: b.id, message: 'soxta xabar' });
  a.socket.emit('send-chat-message', { roomId: 'club_Uzbekistan', message: 'klubga soxta' });
  // 2 ga 2 stoli xonasiga klub xonasi orqali kirib bo'lmaydi
  const t = await ack(b.socket, 'team-create', { initial: 300, increment: 3 });
  a.socket.emit('join-club-room', 'team_' + t.code);
  a.socket.emit('join-chat-room', 'team_' + t.code);
  await sleep(300);
  await ack(b.socket, 'team-sit', { code: t.code, seat: 'w2' });
  await sleep(300);
  assert.equal(b.socket.events.filter((x) => x.e === 'chat-message').length, 0);
  assert.equal(a.socket.events.filter((x) => x.e === 'team-state').length, 0, 'begona stol holati kelmadi');
  await ack(b.socket, 'team-stand', { code: t.code });
  closeAll(a, b);
});

test("Ban: o'yinchining socketi serverda uziladi", async () => {
  const adm = await srv.register('Sa'), u = await srv.register('Sb');
  await sql("UPDATE users SET role = 'admin' WHERE id = ?", [adm.id]);
  u.socket = await srv.connect(u);
  const gone = once(u.socket, 'disconnect', 5000);
  assert.equal((await srv.api(adm, '/api/admin/users/' + u.id + '/ban', 'POST', { days: 1, reason: 'test' })).success, true);
  await gone;
  assert.equal(u.socket.connected, false);
  await srv.api(adm, '/api/admin/users/' + u.id + '/unban', 'POST');
  closeAll(adm);
});

test("2 ga 2: o'yinchi bitta kutayotgan stolda; oddiy o'yindagi o'yinchi stol ocholmaydi; jamoa o'yinidagi o'yinchi chaqiruv yubora olmaydi", async () => {
  const a = await srv.register('St'), b = await srv.register('St'), c = await srv.register('St'), d = await srv.register('St');
  for (const x of [a, b, c, d]) x.socket = await srv.connect(x);
  const t1 = await ack(a.socket, 'team-create', { initial: 300, increment: 3 });
  const t2 = await ack(a.socket, 'team-create', { initial: 300, increment: 3 });
  const list = await ack(b.socket, 'team-list', {});
  const mine = list.tables.filter((x) => x.players.includes(a.name));
  assert.equal(mine.length, 1, 'A faqat bitta stolda');
  assert.equal(mine[0].code, t2.code);
  assert.equal(list.tables.some((x) => x.code === t1.code), false, "bo'sh qolgan birinchi stol yopildi");
  // To'liq stol → jamoa o'yini; A endi band
  for (const [x, seat] of [[b, 'w2'], [c, 'b1'], [d, 'b2']]) assert.equal((await ack(x.socket, 'team-sit', { code: t2.code, seat })).ok, true);
  const err = once(a.socket, 'challenge-error');
  a.socket.emit('challenge-send', { username: b.name, initial: 180, increment: 0 });
  assert.equal((await err).reason, 'you_busy');
  assert.equal((await ack(a.socket, 'team-resign', { code: t2.code })).ok, true);
  // Oddiy o'yindagi o'yinchi 2 ga 2 stol ocha olmaydi
  const g = await startGame(srv, c, d);
  assert.equal((await ack(c.socket, 'team-create', { initial: 300, increment: 3 })).reason, 'busy');
  await finish(g, 'white-resigns');
  closeAll(a, b, c, d);
});

test('2 ga 2: mehmon jamoa chatiga yoza olmaydi', async () => {
  const guest = await srv.api(null, '/api/auth/guest', 'POST', { lang: 'uz' });
  const g = { id: guest.user.id, token: guest.token };
  g.socket = await srv.connect(g);
  const t = await ack(g.socket, 'team-create', { initial: 300, increment: 3 });
  assert.equal(t.ok, true);
  assert.equal((await ack(g.socket, 'team-chat', { code: t.code, message: 'salom' })).ok, false);
  await ack(g.socket, 'team-stand', { code: t.code });
  closeAll(g);
});
