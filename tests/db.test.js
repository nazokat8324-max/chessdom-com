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

test("Turnirlar olib tashlangan: eski bazadagi turnir jadvallari, \"Turnir g'olibi\" yutug'i va turnir bildirishnomalari startda o'chiriladi", async () => {
  const os = require('os'), fs = require('fs');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'chesscaravan-legacy-')), 'legacy.sqlite');
  const run = (sqlText) => new Promise((resolve, reject) => {
    const d = new (require('sqlite3').Database)(file);
    d.exec(sqlText, (err) => d.close(() => (err ? reject(err) : resolve())));
  });
  const all = (sqlText) => new Promise((resolve, reject) => {
    const d = new (require('sqlite3').Database)(file);
    d.all(sqlText, [], (err, rows) => d.close(() => (err ? reject(err) : resolve(rows))));
  });
  // 1) Oddiy baza yaratiladi va o'yinchi qo'shiladi
  let s = await startServer({ SQLITE_FILE: file });
  const u = await s.register('Leg');
  await s.stop();
  // 2) Eski versiyadagidek turnir jadvallari va yozuvlari qo'shiladi
  await run(`CREATE TABLE clubs (id TEXT PRIMARY KEY, name TEXT);
    CREATE TABLE tournaments (id TEXT PRIMARY KEY, name TEXT, club_id TEXT REFERENCES clubs(id));
    CREATE TABLE tournament_participants (id TEXT PRIMARY KEY, tournament_id TEXT REFERENCES tournaments(id), user_id TEXT);
    CREATE TABLE tournament_matches (id TEXT PRIMARY KEY, tournament_id TEXT REFERENCES tournaments(id));
    INSERT INTO tournaments (id, name) VALUES ('t1', 'Swiss 3+2');
    INSERT INTO tournament_participants (id, tournament_id, user_id) VALUES ('p1', 't1', '${u.id}');
    INSERT INTO user_achievements (id, user_id, key, earned_at) VALUES ('a1', '${u.id}', 'tournament_win', '2026-10-01'), ('a2', '${u.id}', 'first_win', '2026-10-01');
    INSERT INTO notifications (id, user_id, type, data, created_at) VALUES ('n1', '${u.id}', 'tournament_soon', '{}', '2026-10-01'), ('n2', '${u.id}', 'friend_request', '{}', '2026-10-01');`);
  // 3) Yangi versiya ishga tushganda hammasi tozalanadi, boshqa ma'lumot qoladi
  s = await startServer({ SQLITE_FILE: file });
  try {
    const tables = (await all("SELECT name FROM sqlite_master WHERE type = 'table'")).map((r) => r.name);
    for (const t of ['clubs', 'tournaments', 'tournament_participants', 'tournament_matches']) assert.ok(!tables.includes(t), t);
    assert.deepEqual((await all('SELECT key FROM user_achievements')).map((r) => r.key), ['first_win']);
    assert.deepEqual((await all('SELECT type FROM notifications')).map((r) => r.type), ['friend_request']);
    for (const p of ['/api/swiss', '/api/swiss/t1', '/api/admin/tournaments']) assert.equal((await fetch(s.base + p)).status, 404, p);
  } finally { await s.stop(); }
});
