// Baza (3-bosqich tekshiruvi): bir vaqtdagi so'rovlar unique xatosiga (500) olib kelmasin,
// do'stlik so'rovi ikki marta qabul qilinmasin, chat_reads da takroriy qatorlar tozalansin
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { startServer, closeAll } = require('./helpers');

let srv;
test.before(async () => { srv = await startServer(); });
test.after(async () => { await srv.stop(); });

const q = (sqlText, prm = []) => new Promise((resolve, reject) => {
  const d = new (require('sqlite3').Database)(path.join(srv.dir, 'test.sqlite'));
  d.all(sqlText, prm, (err, rows) => d.close(() => (err ? reject(err) : resolve(rows))));
});

test("Do'stlik: so'rov bir vaqtda ikki marta qabul qilinsa — bitta muvaffaqiyat, bitta do'stlik, 500 yo'q", async () => {
  const a = await srv.register('Da'), b = await srv.register('Db');
  assert.equal((await srv.api(a, '/api/friends/request', 'POST', { username: b.name })).success, true);
  const reqs = await srv.api(b, '/api/friends/requests');
  const requestId = reqs.requests[0].id;
  const res = await Promise.all([1, 2, 3].map(() => srv.api(b, '/api/friends/accept', 'POST', { requestId })));
  assert.ok(res.every((r) => r.status !== 500), 'server xatosi yo\'q');
  assert.equal(res.filter((r) => r.success).length, 1, 'faqat bitta qabul');
  const rows = await q('SELECT COUNT(*) AS n FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', [a.id, b.id, b.id, a.id]);
  assert.equal(rows[0].n, 2);
  // Qayta so'rov (do'stlikdan chiqib) — o'sha qator qayta pending bo'ladi, yangisi qo'shilmaydi
  await srv.api(a, '/api/friends/remove', 'POST', { username: b.name });
  await Promise.all([1, 2].map(() => srv.api(a, '/api/friends/request', 'POST', { username: b.name })));
  const fr = await q('SELECT status FROM friend_requests WHERE sender_id = ? AND receiver_id = ?', [a.id, b.id]);
  assert.equal(fr.length, 1);
  assert.equal(fr[0].status, 'pending');
  closeAll(a, b);
});

test("Kuzatish va o'qildi belgisi: bir vaqtdagi so'rovlar bitta qator yozadi", async () => {
  const a = await srv.register('Dc'), b = await srv.register('Dd');
  const f = await Promise.all([1, 2, 3, 4].map(() => srv.api(a, '/api/follow', 'POST', { username: b.name })));
  assert.ok(f.every((r) => r.success), JSON.stringify(f));
  assert.equal((await q('SELECT COUNT(*) AS n FROM follows WHERE follower_id = ? AND followee_id = ?', [a.id, b.id]))[0].n, 1);
  await srv.api(a, '/api/follow', 'POST', { username: b.name, follow: false });
  assert.equal((await q('SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?', [a.id]))[0].n, 0);

  await srv.api(a, '/api/chat/messages', 'POST', { message: 'salom', roomId: 'user_' + b.id });
  const r = await Promise.all([1, 2, 3, 4].map(() => srv.api(b, '/api/messages/read', 'POST', { roomId: 'user_' + a.id })));
  assert.ok(r.every((x) => x.success), JSON.stringify(r));
  assert.equal((await q('SELECT COUNT(*) AS n FROM chat_reads WHERE user_id = ?', [b.id]))[0].n, 1);
  assert.equal((await srv.api(b, '/api/messages/unread')).unread, 0);
  closeAll(a, b);
});

test("chat_reads: takroriy qatorlar startda tozalanadi va unique indeks bor", async () => {
  const idx = await q("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_chat_reads_unique'");
  assert.equal(idx.length, 1);
  const op = await q("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_user_games_opponent'");
  assert.equal(op.length, 1);
});
