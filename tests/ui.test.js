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
  // Xato serverga yetib borishi va ro'yxat yuklanishi yuklama ostida cho'zilishi mumkin — paydo bo'lguncha qayta ochamiz
  const found = () => [...document.querySelectorAll('#adminRoot .adm-err b')].some((b) => b.textContent.includes('UI sinov xatosi'));
  for (let i = 0; i < 12 && !(await p.evaluate(found)); i++) {
    await p.evaluate(() => window.openAdminTab('errors'));
    await sleep(800);
  }
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

test("Taklif havolasi: yangi odam banner ko'radi, ro'yxatdan o'tadi va taklif qiluvchiga chaqiruv boradi", opts, async () => {
  const { once } = require('./helpers');
  const a = await srv.register('Uinv');
  const code = (await srv.api(a, '/api/invite')).code;
  const sa = await srv.connect(a);
  const p = await page(null, { width: 390, height: 844, isMobile: true });
  await p.goto(srv.base + '/?invite=' + code + '&tc=180%2B2', { waitUntil: 'networkidle2' });
  await sleep(1000);
  assert.equal(await p.evaluate(() => location.search), '', 'kod manzildan olib tashlanadi');
  assert.match(await p.evaluate(() => (document.getElementById('authInviteBanner') || {}).textContent || ''), new RegExp(a.name));
  const got = once(sa, 'challenge-received', 15000);
  await p.type('#signupUsername', 'Uinvd' + Date.now() % 100000);
  await p.type('#signupPassword', 'secret1');
  await p.evaluate(() => window.handleSignupModal());
  const ch = await got;
  assert.equal(ch.invite, true);
  assert.deepEqual(ch.clock, { initial: 180, increment: 2 });
  assert.equal((await srv.api(a, '/api/invite')).count, 1);
  assert.deepEqual(p.errors, []);
  sa.disconnect();
});

test("O'yinni ulashish: GIF va rasm brauzerda yasaladi", opts, async () => {
  const u = await srv.register('Ushr');
  const p = await page(u);
  await p.goto(srv.base + '/', { waitUntil: 'networkidle2' });
  await sleep(600);
  const data = { moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'], variant: 'standard', white: { name: u.name, rating: 1532 }, black: { name: 'Raqib', rating: 1488 }, result: '1-0', reason: 'checkmate', myColor: 'w' };
  await p.evaluate((d) => window.openGameShare(d), data);
  await p.waitForSelector('.sh-preview img', { timeout: 20000 });
  const r = await p.evaluate(async (d) => {
    const gif = await window.gameShareRender.makeGif(d);
    const png = await window.gameShareRender.makeImage(d);
    const head = new TextDecoder().decode(new Uint8Array(await gif.slice(0, 6).arrayBuffer()));
    const img = await createImageBitmap(png);
    return { head, gifType: gif.type, pngW: img.width, pngH: img.height, buttons: document.querySelectorAll('.sh-card .inv-btn').length };
  }, data);
  assert.equal(r.head, 'GIF89a');
  assert.equal(r.gifType, 'image/gif');
  assert.deepEqual([r.pngW, r.pngH], [1040, 1345]);
  assert.ok(r.buttons >= 2);
  assert.deepEqual(p.errors, []);
});

test("Telefon yon holatda: oyna tugmasiga yetiladi, menyu ekranga sig'adi; klublar ikki ustunda", opts, async () => {
  const u = await srv.register('Uland'), o = await srv.register('Ulando');
  const p = await page(u, { width: 740, height: 360, isMobile: true, hasTouch: true });
  await p.goto(srv.base + '/', { waitUntil: 'networkidle2' });
  await sleep(700);
  // O'yinga chaqirish oynasi: karta ekrandan oshmaydi va ichida aylanib "Chaqirish" ga yetiladi
  await p.evaluate((n) => window.openChallengeDialog(n), o.name);
  await sleep(500);
  const ch = await p.evaluate(() => {
    const card = document.querySelector('#challengeModal .ch-card');
    const r = card.getBoundingClientRect();
    card.scrollTop = card.scrollHeight;
    const btn = card.querySelector('[data-send]').getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, btnBottom: btn.bottom, vh: innerHeight };
  });
  assert.ok(ch.top >= 0 && ch.bottom <= ch.vh, JSON.stringify(ch));
  assert.ok(ch.btnBottom <= ch.vh, 'Chaqirish tugmasi: ' + JSON.stringify(ch));
  await p.evaluate(() => document.getElementById('challengeModal').remove());
  // "Ko'proq" menyusi chap chetdan chiqib ketmaydi
  await p.tap('#navMore');
  await sleep(400);
  const menu = await p.evaluate(() => { const r = document.querySelector('.menu-list').getBoundingClientRect(); return { left: r.left, right: r.right, sw: document.documentElement.scrollWidth, vw: innerWidth }; });
  assert.ok(menu.left >= 0 && menu.right <= menu.vw && menu.sw <= menu.vw, JSON.stringify(menu));
  // Tik holatda klublar — ikki ustun
  const p2 = await page(u, { width: 375, height: 667, isMobile: true, hasTouch: true });
  await p2.goto(srv.base + '/klublar', { waitUntil: 'networkidle2' });
  await sleep(900);
  const cols = await p2.evaluate(() => getComputedStyle(document.getElementById('clubsListContainer')).gridTemplateColumns.split(' ').length);
  assert.equal(cols, 2);
  assert.deepEqual([...p.errors, ...p2.errors], []);
});

test("Telefon: Xabarlar — uzun havolali suhbat ekranga sig'adi, yuborish tugmasi ko'rinadi", opts, async () => {
  const a = await srv.register('Umsg'), b = await srv.register('Umsgb');
  await srv.api(b, '/api/chat/messages', 'POST', { roomId: 'user_' + a.id, message: 'Havola: https://chessdom-com.onrender.com/?profile=' + 'juda_uzun_bolinmaydigan_havola_'.repeat(4) });
  const p = await page(a, { width: 360, height: 640, isMobile: true, hasTouch: true });
  await p.goto(srv.base + '/xabarlar', { waitUntil: 'networkidle2' });
  await sleep(800);
  await p.evaluate((n) => window.openMessagesWith(n), b.name);
  await sleep(1000);
  const r = await p.evaluate(() => {
    const right = (sel) => Math.round(document.querySelector(sel).getBoundingClientRect().right);
    return { vw: innerWidth, sw: document.documentElement.scrollWidth, head: right('.msg-chat-head'), send: right('#msgComposer .msg-send'), bubble: right('.msg-bubble.theirs') };
  });
  assert.ok(r.head <= r.vw && r.send <= r.vw && r.bubble <= r.vw && r.sw <= r.vw, JSON.stringify(r));
  assert.deepEqual(p.errors, []);
});

test("Bosh sahifadagi \"Onlayn o'ynash\" darhol raqib qidiradi; taxta o'yindan oldin sahifani aylantirishga xalaqit bermaydi", opts, async () => {
  const u = await srv.register('Uqp');
  const p = await page(u, { width: 375, height: 667, isMobile: true, hasTouch: true });
  await p.goto(srv.base + '/', { waitUntil: 'networkidle2' });
  await sleep(700);
  await p.evaluate(() => switchView('game'));
  await sleep(300);
  assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById('chessBoard')).touchAction), 'auto', "o'yindan oldin taxta ustidan aylantirish mumkin");
  await p.evaluate(() => switchView('home'));
  await sleep(300);
  await (await p.$('#playOnlineBtn')).tap();
  await sleep(1200);
  const s = await p.evaluate(() => ({ view: document.querySelector('.view-section.active-view').id, searching: !!window.isSearchingOpponent }));
  assert.deepEqual(s, { view: 'gameView', searching: true });
  await p.evaluate(() => window.cancelSearch && window.cancelSearch());
  assert.deepEqual(p.errors, []);
});

test("Service worker ro'yxatdan o'tadi", opts, async () => {
  const u = await srv.register('Us');
  const p = await page(u);
  await p.goto(srv.base + '/', { waitUntil: 'networkidle2' });
  const scope = await p.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  assert.equal(scope, srv.base + '/');
});
