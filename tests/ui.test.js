// Brauzer testi (puppeteer-core): Chrome topilmasa o'tkazib yuboriladi. CHROME_PATH bilan yo'lni berish mumkin.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { startServer, sleep } = require('./helpers');

const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => p && fs.existsSync(p));
const opts = { skip: CHROME ? false : 'Chrome topilmadi (CHROME_PATH)' };

let srv, browser;
before(async () => {
  if (!CHROME) return;
  srv = await startServer();
  browser = await require('puppeteer-core').launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
});
after(async () => { if (browser) await browser.close(); if (srv) await srv.stop(); });

async function page(user, viewport) {
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport(viewport || { width: 1366, height: 860 });
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  p.on('dialog', (d) => d.accept());
  await p.evaluateOnNewDocument((u) => {
    localStorage.setItem('justChessLang', 'uz');
    if (u) { localStorage.setItem('justChessAuthToken', u.token); localStorage.setItem('justChessCurrentUser', JSON.stringify(u.user)); }
  }, user || null);
  return p;
}

test('Kirmagan foydalanuvchiga kirish sahifasi chiqadi', opts, async () => {
  const p = await page(null);
  await p.goto(srv.base + '/', { waitUntil: 'networkidle2' });
  await sleep(800);
  const gate = await p.evaluate(() => document.body.classList.contains('auth-locked') && !!document.querySelector('#authGate .auth-legal a[href="/maxfiylik"]'));
  assert.ok(gate);
  assert.deepEqual(p.errors, []);
});

test("Barcha asosiy bo'limlar xatosiz ochiladi", opts, async () => {
  const u = await srv.register('Ui');
  const p = await page(u);
  await p.goto(srv.base + '/', { waitUntil: 'networkidle2' });
  await sleep(1000);
  const views = ['home', 'game', 'tea', 'leaderboard', 'live', 'messages', 'clubs', 'leagues', 'war', 'champions', 'settings'];
  for (const v of views) {
    await p.evaluate((name) => window.switchView(name), v);
    await sleep(500);
    const active = await p.evaluate(() => { const el = document.querySelector('.view-section.active-view'); return el ? el.id : null; });
    assert.equal(active, v + 'View', v);
  }
  // Manzil va orqaga tugmasi
  await p.evaluate(() => window.switchView('tea'));
  assert.equal(await p.evaluate(() => location.pathname), '/choyxona');
  await p.evaluate(() => { window.openPlayerProfile && window.openPlayerProfile(window.currentUser.username); });
  await sleep(800);
  assert.ok(await p.evaluate(() => /profile=/.test(location.search)));
  assert.deepEqual(p.errors, []);
});

test('Telefon: pastki menyu va gorizontal aylantirish yo\'q', opts, async () => {
  const u = await srv.register('Um');
  const p = await page(u, { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p.goto(srv.base + '/', { waitUntil: 'networkidle2' });
  await sleep(1000);
  const r = await p.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    nav: [...document.querySelectorAll('.menu-list .menu-item.mobile-main')].filter((e) => getComputedStyle(e).display !== 'none').length
  }));
  assert.ok(r.sw <= 390, 'kenglik ' + r.sw);
  assert.equal(r.nav, 5);
  assert.deepEqual(p.errors, []);
});

test("Brauzer xatosi admin panelidagi Xatolar bo'limida ko'rinadi", opts, async () => {
  const u = await srv.register('Ua');
  await new Promise((resolve, reject) => {
    const d = new (require('sqlite3').Database)(require('path').join(srv.dir, 'test.sqlite'));
    d.run("UPDATE users SET role = 'admin' WHERE id = ?", [u.id], (err) => d.close(() => (err ? reject(err) : resolve())));
  });
  u.user.role = 'admin';
  const p = await page(u);
  await p.goto(srv.base + '/', { waitUntil: 'networkidle2' });
  await sleep(800);
  // Sahifaning o'z skripti (puppeteer evaluate ichidagi xato brauzerda "Script error." bo'lib ko'rinadi)
  await p.evaluate(() => { const s = document.createElement('script'); s.textContent = "throw new Error('UI sinov xatosi')"; document.body.appendChild(s); });
  await sleep(800);
  await p.evaluate(() => window.openAdminTab('errors'));
  await sleep(1200);
  const r = await p.evaluate(() => ({
    path: location.pathname,
    items: [...document.querySelectorAll('#adminRoot .adm-err b')].map((b) => b.textContent),
    tab: (document.querySelector('#adminRoot [data-atab].active') || {}).dataset
  }));
  assert.equal(r.path, '/admin');
  assert.ok(r.items.some((t) => t.includes('UI sinov xatosi')), JSON.stringify(r.items));
  await p.screenshot({ path: require('path').join(srv.dir, 'admin-errors.png') }).catch(() => {});
  if (process.env.UI_SHOTS) fs.copyFileSync(require('path').join(srv.dir, 'admin-errors.png'), process.env.UI_SHOTS + '/admin-errors.png');
});

test("Service worker ro'yxatdan o'tadi", opts, async () => {
  const u = await srv.register('Us');
  const p = await page(u);
  await p.goto(srv.base + '/', { waitUntil: 'networkidle2' });
  const scope = await p.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  assert.equal(scope, srv.base + '/');
});
