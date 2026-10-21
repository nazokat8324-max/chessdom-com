// Sahifalar, SEO, yashirin fayllar, PWA fayllari
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./helpers');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

const get = (p, opts) => fetch(srv.base + p, { redirect: 'manual', ...(opts || {}) });

test('Bosh sahifa va bo\'limlar sarlavhasi bilan beriladi', async () => {
  const home = await get('/');
  assert.equal(home.status, 200);
  assert.match(await home.text(), /<title>ChessDom/);
  const lb = await (await get('/reyting')).text();
  assert.match(lb, /<title>Leaderboard · ChessDom<\/title>/);
  assert.match(lb, /rel="canonical"/);
});

test('Kanonik manzillar va eski manzillar yo\'naltiriladi', async () => {
  for (const [from, to] of [['/Reyting', '/reyting'], ['/reyting/', '/reyting'], ['/urush', '/bayroqlar'], ['/privacy', '/maxfiylik'], ['/terms', '/shartlar']]) {
    const r = await get(from);
    assert.equal(r.status, 301, from);
    assert.equal(r.headers.get('location'), to, from);
  }
});

test('Server fayllari va baza tashqariga berilmaydi', async () => {
  for (const p of ['/server.js', '/database.js', '/push-texts.js', '/league.js', '/package.json', '/CLAUDE.md', '/database.sqlite', '/node_modules/express/package.json', '/tests/helpers.js', '/tests/fixtures/push-key.pem', '/.github/workflows/test.yml']) {
    assert.equal((await get(p)).status, 404, p);
  }
  // Klient fayllari esa ochiq
  for (const p of ['/script.js', '/board.js', '/pwa.js', '/legal-content.js']) assert.equal((await get(p)).status, 200, p);
});

test('Huquqiy sahifalar, sitemap va robots', async () => {
  assert.equal((await get('/maxfiylik')).status, 200);
  assert.equal((await get('/shartlar')).status, 200);
  const sm = await (await get('/sitemap.xml')).text();
  for (const p of ['/choyxona', '/bayroqlar', '/maxfiylik', '/shartlar']) assert.ok(sm.includes(p), p);
  assert.ok(!sm.includes('/turnirlar'), "to'xtatilgan turnirlar sitemap'da yo'q");
  assert.match(await (await get('/robots.txt')).text(), /Sitemap: /);
});

test('PWA: manifest, service worker, ikonkalar, VAPID kaliti', async () => {
  const mf = await (await get('/manifest.json')).json();
  assert.equal(mf.display, 'standalone');
  assert.ok(mf.icons.some((i) => i.purpose === 'maskable'));
  for (const i of mf.icons) assert.equal((await get(i.src)).status, 200, i.src);
  const sw = await get('/sw.js');
  assert.match(sw.headers.get('content-type'), /javascript/);
  assert.match(sw.headers.get('cache-control'), /no-cache/);
  assert.equal((await get('/offline.html')).status, 200);
  const key = await srv.api(null, '/api/push/key');
  assert.equal(key.success, true);
  assert.match(key.publicKey, /^[A-Za-z0-9_-]{80,}$/);
});
