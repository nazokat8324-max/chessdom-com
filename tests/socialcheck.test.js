// Ijtimoiy qism (4-bosqich tekshiruvi): bloklash kutayotgan chaqiruv va kuzatishni bekor qiladi,
// soxta dm_ xona nomlari rad etiladi, oddiy o'yin boshlangan o'yinchi 2 ga 2 kutayotgan stolidan turadi
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { startServer, once, ack, startGame, finish, closeAll, sleep } = require('./helpers');

let srv;
test.before(async () => { srv = await startServer(); });
test.after(async () => { await srv.stop(); });

const q = (sqlText, prm = []) => new Promise((resolve, reject) => {
  const d = new (require('sqlite3').Database)(path.join(srv.dir, 'test.sqlite'));
  d.all(sqlText, prm, (err, rows) => d.close(() => (err ? reject(err) : resolve(rows))));
});

test("Bloklash: kutayotgan chaqiruv bekor bo'ladi, kuzatish o'chadi", async () => {
  const a = await srv.register('Ka'), b = await srv.register('Kb');
  a.socket = await srv.connect(a); b.socket = await srv.connect(b);
  assert.equal((await srv.api(a, '/api/follow', 'POST', { username: b.name })).success, true);
  const got = once(b.socket, 'challenge-received');
  a.socket.emit('challenge-send', { username: b.name, initial: 180, increment: 0 });
  const ch = await got;
  const declined = once(a.socket, 'challenge-declined');
  const cancelled = once(b.socket, 'challenge-cancelled');
  assert.equal((await srv.api(b, '/api/users/' + a.name + '/block', 'POST')).success, true);
  assert.equal((await declined).id, ch.id);
  assert.equal((await cancelled).id, ch.id);
  // Bloklagandan keyin eski chaqiruvni qabul qilib bo'lmaydi
  const err = once(b.socket, 'challenge-error');
  b.socket.emit('challenge-accept', { id: ch.id });
  assert.equal((await err).reason, 'gone');
  assert.equal((await q('SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?', [a.id]))[0].n, 0);
  closeAll(a, b);
});

test("Shaxsiy chat: soxta dm_ xona nomlari rad etiladi, haqiqiysi ishlaydi", async () => {
  const a = await srv.register('Kc'), b = await srv.register('Kd');
  for (const roomId of ['dm_' + a.id, 'dm_' + a.id + '_' + a.id, 'dm_' + a.id + '_x_' + b.id, 'dm_' + b.id + '_x']) {
    assert.equal((await srv.api(a, '/api/chat/messages', 'POST', { message: 'salom', roomId })).status, 403, roomId);
  }
  // Teskari tartibdagi nom ham bitta (tartiblangan) xonaga tushadi
  assert.equal((await srv.api(a, '/api/chat/messages', 'POST', { message: 'bir', roomId: 'dm_' + b.id + '_' + a.id })).success, true);
  assert.equal((await srv.api(a, '/api/chat/messages', 'POST', { message: 'ikki', roomId: 'user_' + b.id })).success, true);
  const rooms = await q('SELECT DISTINCT room_id FROM chat_messages WHERE sender_id = ?', [a.id]);
  assert.equal(rooms.length, 1);
  assert.equal(rooms[0].room_id, 'dm_' + [a.id, b.id].sort().join('_'));
  closeAll(a, b);
});

test("2 ga 2: oddiy o'yin boshlangan o'yinchi kutayotgan stoldan turadi", async () => {
  const a = await srv.register('Ke'), b = await srv.register('Kf'), c = await srv.register('Kg');
  for (const x of [a, b, c]) x.socket = await srv.connect(x);
  const t = await ack(a.socket, 'team-create', { initial: 300, increment: 3 });
  assert.equal(t.ok, true);
  assert.equal((await ack(c.socket, 'team-sit', { code: t.code, seat: 'b1' })).ok, true);
  const g = await startGame(srv, a, b);
  await sleep(100);
  const list = await ack(c.socket, 'team-list', {});
  const table = list.tables.find((x) => x.code === t.code);
  assert.ok(table, "C o'tirgan stol qoldi");
  assert.deepEqual(table.players, [c.name]);
  await finish(g, 'white-resigns');
  await ack(c.socket, 'team-stand', { code: t.code });
  closeAll(a, b, c);
});
