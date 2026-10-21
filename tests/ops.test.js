// Xatolarni kuzatish va zaxira nusxa: jurnal, admin paneli API, shifrlangan zaxira, tiklash vositasi
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const sqlite3 = require('sqlite3');
const backup = require('../backup');
const { startServer, sleep, ROOT } = require('./helpers');

const TOKEN = 'test-backup-token-1234567890';
let srv, admin, user;

function sql(file, query, params) {
  return new Promise((resolve, reject) => {
    const d = new sqlite3.Database(file);
    d.all(query, params || [], (err, rows) => d.close(() => (err ? reject(err) : resolve(rows))));
  });
}
function run(args, env) {
  return new Promise((resolve) => {
    execFile(process.execPath, args, { cwd: ROOT, env: { ...process.env, ...env, DATABASE_URL: '' } }, (err, stdout, stderr) =>
      resolve({ code: err ? err.code : 0, out: stdout + stderr }));
  });
}

before(async () => {
  srv = await startServer({ BACKUP_TOKEN: TOKEN });
  admin = await srv.register('Adm');
  user = await srv.register('Usr');
  await sql(path.join(srv.dir, 'test.sqlite'), "UPDATE users SET role = 'admin' WHERE id = ?", [admin.id]);
});
after(async () => { await srv.stop(); });

test('Zaxira moduli: shifrlash, noto\'g\'ri token, siqish', () => {
  const dump = { format: 'chessdom-backup', tables: { users: [{ id: 'a', username: 'Ali' }] } };
  const enc = backup.encrypt(backup.pack(dump), TOKEN);
  assert.ok(backup.isEncrypted(enc));
  assert.deepEqual(backup.readBackup(enc, TOKEN), dump);
  assert.throws(() => backup.readBackup(enc, 'boshqa-token-boshqa-token'));
  assert.throws(() => backup.readBackup(enc), /BACKUP_TOKEN/);
  assert.deepEqual(backup.readBackup(backup.pack(dump)), dump, 'shifrlanmagan .json.gz ham o\'qiladi');
  assert.equal(backup.sameToken('abc', 'abc'), true);
  assert.equal(backup.sameToken('abc', 'abd'), false);
  assert.equal(backup.sameToken('', ''), false);
});

test('Server xatosi jurnalga yoziladi, adminga bildirishnoma, hal qilish', async () => {
  const r = await srv.api(null, '/api/test/throw');
  assert.equal(r.status, 500);
  assert.equal(r.message, 'Server xatoligi!');
  assert.doesNotMatch(JSON.stringify(r), /Test uchun xato/, 'xato tafsiloti foydalanuvchiga ko\'rsatilmaydi');
  await sleep(500);
  assert.equal((await srv.api(user, '/api/admin/errors')).status, 403);
  const list = await srv.api(admin, '/api/admin/errors?source=server');
  const e = list.errors.find((x) => x.message === 'Test uchun xato');
  assert.ok(e, JSON.stringify(list.errors.map((x) => x.message)));
  assert.equal(e.context.path, '/api/test/throw');
  assert.match(e.stack, /server\.js/);
  assert.ok(list.counts.server >= 1);
  const notes = await srv.api(admin, '/api/notifications');
  assert.ok(notes.notifications.some((n) => n.type === 'server_error' && n.data.message === 'Test uchun xato'));
  assert.ok(!(await srv.api(user, '/api/notifications')).notifications.some((n) => n.type === 'server_error'), 'oddiy o\'yinchiga kelmaydi');
  // Takrorlansa yangi qator ochilmaydi
  await srv.api(null, '/api/test/throw');
  await sleep(300);
  assert.equal((await srv.api(admin, '/api/admin/errors?source=server')).errors.filter((x) => x.message === 'Test uchun xato').length, 1);
  // Hal qilindi → resolved ro'yxatida; tozalash
  await srv.api(admin, `/api/admin/errors/${e.id}/resolve`, 'POST', { resolved: true });
  assert.ok(!(await srv.api(admin, '/api/admin/errors')).errors.some((x) => x.id === e.id));
  assert.ok((await srv.api(admin, '/api/admin/errors?status=resolved')).errors.some((x) => x.id === e.id));
  await srv.api(admin, '/api/admin/errors/clear-resolved', 'POST');
  assert.equal((await srv.api(admin, '/api/admin/errors?status=resolved')).errors.length, 0);
  assert.ok((await srv.api(admin, '/api/admin/stats')).stats.errors);
});

test('Brauzer xatolari: foydalanuvchi bilan yoziladi, shovqin rad etiladi', async () => {
  const body = { message: 'TypeError: x is undefined', source: srv.base + '/board.js?v=3', line: 12, col: 5, stack: 'TypeError: x is undefined\n    at f (' + srv.base + '/board.js?v=3:12:5)', url: '/oyin' };
  assert.equal((await srv.api(user, '/api/client-errors', 'POST', body)).success, true);
  assert.equal((await srv.api(null, '/api/client-errors', 'POST', { message: 'Script error.' })).ignored, true);
  assert.equal((await srv.api(null, '/api/client-errors', 'POST', { message: 'Oops', source: 'chrome-extension://abc/x.js' })).ignored, true);
  await sleep(400);
  const list = await srv.api(admin, '/api/admin/errors?source=client');
  assert.equal(list.errors.length, 1);
  const e = list.errors[0];
  assert.equal(e.source, 'client');
  assert.equal(e.context.user, user.name);
  assert.equal(e.context.url, '/oyin');
  assert.equal(e.context.line, 12);
});

test('Server fayllari va vosita tashqariga berilmaydi, errors.js beriladi', async () => {
  for (const p of ['/backup.js', '/tools/backup-restore.js', '/tests/ops.test.js']) assert.equal((await fetch(srv.base + p)).status, 404, p);
  assert.equal((await fetch(srv.base + '/errors.js')).status, 200);
});

test('Zaxira: token bilan shifrlangan nusxa, admin yuklab olishi, tiklash vositasi', async () => {
  assert.equal((await fetch(srv.base + '/api/backup')).status, 403);
  assert.equal((await fetch(srv.base + '/api/backup', { headers: { 'X-Backup-Token': 'wrong-token-wrong-token-xx' } })).status, 403);
  const res = await fetch(srv.base + '/api/backup', { headers: { 'X-Backup-Token': TOKEN } });
  assert.equal(res.status, 200);
  const enc = Buffer.from(await res.arrayBuffer());
  assert.ok(backup.isEncrypted(enc));
  const dump = backup.readBackup(enc, TOKEN);
  assert.equal(dump.format, 'chessdom-backup');
  const names = Object.keys(dump.tables);
  assert.ok(names.indexOf('users') < names.indexOf('notifications'), 'users bog\'langan jadvallardan oldin');
  assert.ok(dump.tables.users.some((u) => u.username === user.name));

  // Admin: shifrlanmagan .json.gz; oddiy o'yinchi — 403
  assert.equal((await fetch(srv.base + '/api/admin/backup', { headers: { Authorization: 'Bearer ' + user.token } })).status, 403);
  const ar = await fetch(srv.base + '/api/admin/backup', { headers: { Authorization: 'Bearer ' + admin.token } });
  assert.match(ar.headers.get('content-disposition'), /chessdom-\d+\.json\.gz/);
  assert.equal(backup.readBackup(Buffer.from(await ar.arrayBuffer())).tables.users.length, dump.tables.users.length);

  // Tiklash: yangi bo'sh bazaga → bir xil o'yinchilar; bo'sh bo'lmagan bazaga --force siz rad etiladi
  const file = path.join(srv.dir, 'b.cdbk'), target = path.join(srv.dir, 'restored.sqlite');
  fs.writeFileSync(file, enc);
  const env = { SQLITE_FILE: target, BACKUP_TOKEN: TOKEN };
  const r1 = await run(['tools/backup-restore.js', file], env);
  assert.equal(r1.code, 0, r1.out);
  const users = await sql(target, 'SELECT username, role FROM users ORDER BY username');
  assert.deepEqual(users.map((u) => u.username).sort(), dump.tables.users.map((u) => u.username).sort());
  assert.equal(users.find((u) => u.username === admin.name).role, 'admin');
  const r2 = await run(['tools/backup-restore.js', file], env);
  assert.equal(r2.code, 1);
  assert.match(r2.out, /bo'sh emas/);
  const r3 = await run(['tools/backup-restore.js', file, '--force'], env);
  assert.equal(r3.code, 0, r3.out);
  assert.equal((await sql(target, 'SELECT COUNT(*) as n FROM users'))[0].n, users.length);
  const r4 = await run(['tools/backup-restore.js', file], { SQLITE_FILE: target, BACKUP_TOKEN: '' });
  assert.equal(r4.code, 1);
  assert.match(r4.out, /BACKUP_TOKEN/);
});

test("Admin jurnali: amallar yoziladi, filtr va qidiruv, oddiy o'yinchiga yopiq", async () => {
  const victim = await srv.register('Vic');
  assert.equal((await srv.api(user, '/api/admin/audit')).status, 403);
  // Vaqt tamg'alari bir xil bo'lib qolmasin (tartib tekshiriladi)
  await srv.api(admin, `/api/admin/users/${victim.id}/ban`, 'POST', { days: 7, reason: 'spam' }); await sleep(15);
  await srv.api(admin, `/api/admin/users/${victim.id}/unban`, 'POST', {}); await sleep(15);
  await srv.api(admin, `/api/admin/users/${victim.id}/mute`, 'POST', { hours: 24 }); await sleep(15);
  await srv.api(admin, '/api/admin/chat-filter', 'POST', { word: 'yomonso' }); await sleep(15);
  await srv.api(admin, '/api/admin/chat-filter', 'POST', { word: 'yomonso', remove: true });
  await sleep(300);
  const all = await srv.api(admin, '/api/admin/audit?q=' + victim.name);
  assert.deepEqual(all.actions.map((a) => a.action), ['mute', 'unban', 'ban'], 'yangidan eskiga');
  const ban = all.actions[2];
  assert.equal(ban.admin, admin.name);
  assert.equal(ban.target, victim.name);
  assert.equal(ban.targetType, 'user');
  assert.deepEqual(ban.details, { days: 7, reason: 'spam' });
  assert.deepEqual((await srv.api(admin, '/api/admin/audit?action=filter')).actions.map((a) => a.action), ['filter_remove', 'filter_add']);
  assert.equal((await srv.api(admin, '/api/admin/audit?action=ban&q=' + victim.name)).actions.length, 1, "'ban' — unban ni qamramaydi");
  // Zaxirani yuklab olish ham yoziladi (oldingi testda)
  assert.ok((await srv.api(admin, '/api/admin/audit?action=backup')).actions.some((a) => a.details.rows > 0));
  // O'yinchi o'chirilsa ham yozuv qoladi
  await srv.api(victim, '/api/users/me/delete', 'POST', { password: victim.password, confirm: victim.name });
  assert.equal((await srv.api(admin, '/api/admin/audit?q=' + victim.name)).actions.length, 3);
});
