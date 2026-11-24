// ☁️ Sayt sozlamalari akkauntda (2026-11-24): bir qurilmada saqlangan sozlamalar va til boshqa qurilmadan kirganda qaytadi
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./helpers');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

test("Sozlamalar akkauntda: avval bo'sh; saqlangani va til qaytariladi; keyingi saqlash ustidan yoziladi", async () => {
  const u = await srv.register('Sync');
  const first = await srv.api(u, '/api/users/me/settings');
  assert.deepEqual([first.status, first.success, first.settings, first.lang], [200, true, null, null]);
  const settings = { siteTheme: 'ruby', pieceSet: 'kosmos', boardStyle: 'night', background: 'kosmos', bgMotion: false, volume: 0.6, quickClock: [300, 2], country: 'uz', voiceMode: 'ptt' };
  const r = await srv.api(u, '/api/users/me/settings', 'POST', { settings, lang: 'ru' });
  assert.equal(r.success, true, JSON.stringify(r));
  const got = await srv.api(u, '/api/users/me/settings');
  assert.deepEqual(got.settings, settings);
  assert.equal(got.lang, 'ru');
  assert.ok(got.updatedAt);
  await srv.api(u, '/api/users/me/settings', 'POST', { settings: { siteTheme: 'jade' }, lang: 'uzc' });
  const again = await srv.api(u, '/api/users/me/settings');
  assert.deepEqual([again.settings, again.lang], [{ siteTheme: 'jade' }, 'uzc']);
  // Boshqa o'yinchining sozlamalari alohida
  const v = await srv.register('Sync2');
  assert.equal((await srv.api(v, '/api/users/me/settings')).settings, null);
});

test("Sozlamalar akkauntda: noto'g'ri ma'lumot rad etiladi yoki tozalanadi; kirmagan — 401, mehmon saqlay olmaydi", async () => {
  const u = await srv.register('SyncBad');
  for (const bad of [null, 'text', 5, [1, 2], { big: 'x'.repeat(9000) }]) {
    const r = await srv.api(u, '/api/users/me/settings', 'POST', { settings: bad, lang: 'uz' });
    assert.equal(r.status, 400, JSON.stringify(bad).slice(0, 40));
  }
  // Murakkab qiymatlar, noto'g'ri kalitlar va noma'lum til tashlanadi
  const r = await srv.api(u, '/api/users/me/settings', 'POST', { settings: { ok: 1, nested: { a: 1 }, 'bad key': 2, $x: 3, fn: [{ a: 1 }], arr: [1, 'a', true] }, lang: 'klingon' });
  assert.equal(r.success, true);
  const got = await srv.api(u, '/api/users/me/settings');
  assert.deepEqual([got.settings, got.lang], [{ ok: 1, arr: [1, 'a', true] }, null]);
  assert.equal((await srv.api(null, '/api/users/me/settings')).status, 401);
  const g = await srv.api(null, '/api/auth/guest', 'POST', { lang: 'uz' });
  const guest = { token: g.token };
  assert.equal((await srv.api(guest, '/api/users/me/settings', 'POST', { settings: { siteTheme: 'ruby' } })).status, 403);
});
