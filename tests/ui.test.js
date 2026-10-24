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

test("Mehmon: ro'yxatdan o'tmasdan o'ynash → reytingsiz qidiruv, eslatma, ro'yxatdan o'tganda o'sha akkaunt saqlanadi", opts, async () => {
  const p = await page(null);
  await p.goto(srv.base + '/', { waitUntil: 'networkidle2' });
  await sleep(500);
  await p.click('#authGuestBtn');
  await p.waitForFunction(() => window.isSearchingOpponent === true, { timeout: 8000 });
  const st = await p.evaluate(() => ({ guest: window.currentUser.guest, name: window.currentUser.username, rated: document.getElementById('ratedToggle').checked, ratedLocked: document.getElementById('ratedToggle').disabled, locked: document.body.classList.contains('auth-locked') }));
  assert.equal(st.guest, true);
  assert.match(st.name, /^Mehmon-/);
  assert.deepEqual([st.rated, st.ratedLocked, st.locked], [false, true, false]);
  await p.evaluate(() => { if (window.cancelSearch) window.cancelSearch(); window.switchView('home'); });
  await sleep(400);
  assert.equal(await p.evaluate(() => document.getElementById('guestBanner').hidden), false, "bosh sahifada mehmon eslatmasi");
  const id = await p.evaluate(() => window.currentUser.id);
  await p.evaluate(() => document.querySelector('#guestBanner .guest-signup-btn').click());
  await sleep(300);
  assert.deepEqual(await p.evaluate(() => [document.getElementById('authGateClose').hidden, document.getElementById('authGuestBox').hidden]), [false, true]);
  const name = 'Mg' + Date.now() % 1000000;
  await p.type('#signupUsername', name);
  await p.type('#signupPassword', 'secret1');
  await p.click('#signupSubmitBtn');
  await p.waitForFunction((n) => window.currentUser && window.currentUser.username === n, { timeout: 8000 }, name);
  const after = await p.evaluate(() => ({ id: window.currentUser.id, guest: !!window.currentUser.guest, banner: document.getElementById('guestBanner').hidden, ratedLocked: document.getElementById('ratedToggle').disabled }));
  assert.deepEqual(after, { id, guest: false, banner: true, ratedLocked: false });
  assert.deepEqual(p.errors, []);
});

test("Klublar: mening klubim kartasi, faol klublar tepada, klub sahifasidagi 4 tab, chat ichida, eski manzillar", opts, async () => {
  const u = await srv.register('Club');
  await srv.api(u, '/api/country-clubs/join', 'POST', { country: 'Uzbekistan', code: 'uz' });
  const login = await srv.api(null, '/api/auth/login', 'POST', { username: u.name, password: u.password });
  const p = await page({ token: login.token, user: login.user });
  await p.goto(srv.base + '/klublar', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.cl-mine[data-club="Uzbekistan"]', { timeout: 10000 });
  assert.equal(await p.evaluate(() => document.querySelector('.cl-grid .cl-tile').dataset.club), 'Uzbekistan', "faol klub birinchi");
  await p.click('.cl-mine');
  await p.waitForSelector('.cl-tabs .cl-tab.active[data-cl-tab="overview"]');
  await p.waitForSelector('.cl-stats');
  for (const [tab, q] of [['members', 'tab=reyting'], ['league', 'tab=turnirlar'], ['chat', 'tab=chat']]) {
    await p.evaluate((t) => document.querySelector(`.cl-tabs [data-cl-tab="${t}"]`).click(), tab);
    await sleep(400);
    assert.ok((await p.evaluate(() => location.search)).includes(q), tab);
  }
  assert.ok(await p.evaluate(() => !!document.querySelector('#clPane .club-chat-container #clubChatMessageInput')), "chat klub sahifasi ichida");
  await p.goto(srv.base + '/klublar?club=Uzbekistan&tab=tarix', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.cl-sort button.active');
  assert.deepEqual(await p.evaluate(() => [document.querySelector('.cl-tab.active').dataset.clTab, document.querySelector('.cl-sort .active').dataset.clSort]), ['members', 'newest']);
  assert.deepEqual(p.errors, []);
});

test("Kun o'yini kartasi: mini-taxtaning bo'sh qatorlari ham siqilmaydi (64 katak teng)", opts, async () => {
  const u = await srv.register('Gdui');
  const p = await page(u);
  const fake = { success: true, game: { day: '2026-01-01', id: 'x', white: { name: 'A', rating: 1500 }, black: { name: 'B', rating: 1500 }, result: '1-0', reason: 'resign', variant: 'standard', startFen: null, clock: '3+2', moves: [] } };
  await p.setRequestInterception(true);
  p.on('request', (r) => (r.url().endsWith('/api/game-of-day') ? r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(fake) }) : r.continue()));
  await p.goto(srv.base + '/jonli', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#lvGameDay .gd-board i', { timeout: 10000 });
  const h = await p.evaluate(() => [...document.querySelectorAll('.gd-board i')].map((c) => Math.round(c.getBoundingClientRect().height)));
  assert.equal(h.length, 64);
  assert.equal(Math.min(...h), Math.max(...h), JSON.stringify(h));
  assert.deepEqual(p.errors, []);
});

test("Bir qurilmada ikki kishi: navbat bilan yuriladi, taxta buriladi, mat — natija statistikaga yozilmaydi", opts, async () => {
  const u = await srv.register('Local');
  const p = await page(u);
  await p.goto(srv.base + '/oyin', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#btnLocalGame', { timeout: 10000 });
  await sleep(600);
  await p.click('#btnLocalGame');
  await sleep(400);
  const start = await p.evaluate(() => ({ local: window.localGameMode, mode: document.getElementById('gameView').className, wins: (window.stats || {}).wins || 0, rating: document.getElementById('whitePlayerRating').textContent }));
  assert.equal(start.local, true);
  assert.match(start.mode, /pg-mode-in/);
  assert.equal(start.rating, '', "reyting ko'rsatilmaydi");
  const moves = [['e2', 'e4'], ['e7', 'e5'], ['f1', 'c4'], ['b8', 'c6'], ['d1', 'h5'], ['g8', 'f6']];
  for (const [f, t] of moves) {
    assert.ok(await p.evaluate((a, b) => { const m = window.executeMove(a, b); if (m && board) board.position(game.fen()); return !!m; }, f, t), f + t);
    await sleep(320);
  }
  assert.equal(await p.evaluate(() => board.orientation()), 'white', 'navbat oqda — taxta oq tomondan');
  await p.evaluate(() => { window.executeMove('e7', 'e5'); }); // noto'g'ri navbat — rad
  assert.equal(await p.evaluate(() => game.history().length), 6);
  await p.evaluate(() => { window.executeMove('h5', 'f7'); if (board) board.position(game.fen()); });
  await sleep(500);
  const end = await p.evaluate(() => ({ over: document.getElementById('gameView').className, winner: (window.lastGameEnd || {}).winner, wins: (window.stats || {}).wins || 0, ticking: document.getElementById('whiteTimer').textContent }));
  assert.match(end.over, /pg-mode-over/);
  assert.equal(end.winner, 'w');
  assert.equal(end.wins, start.wins, "statistika o'zgarmadi");
  await p.evaluate(() => window.resetToPreGame());
  assert.equal(await p.evaluate(() => window.localGameMode), false);
  assert.deepEqual(p.errors, []);
});

test("Shatranj: o'yin panelida tanlanadi, bir qurilmada qoidalari bilan o'ynaladi, pat — g'alaba", opts, async () => {
  const u = await srv.register('Shat');
  const p = await page(u);
  await p.goto(srv.base + '/oyin', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#variantSeg [data-variant="shatranj"]', { timeout: 10000 });
  await sleep(600);
  await p.click('#variantSeg [data-variant="shatranj"]');
  assert.equal(await p.evaluate(() => window.getSelectedVariant()), 'shatranj');
  await p.click('#btnLocalGame');
  await sleep(400);
  const st = await p.evaluate(() => ({ v: window.currentVariant, fen: game.fen(), d8: (game.get('d8') || {}).type }));
  assert.equal(st.v, 'shatranj');
  assert.equal(st.d8, 'k', "qora shoh d8 da (Shatranj boshlang'ich pozitsiyasi)");
  assert.equal(await p.evaluate(() => !!window.executeMove('e2', 'e4')), false, "piyoda 2 qadam yurmaydi");
  assert.equal(await p.evaluate(() => !!window.executeMove('e2', 'e3')), true);
  assert.equal(await p.evaluate(() => !!window.executeMove('c8', 'a6')), true, 'fil 2 katak sakraydi');
  assert.equal(await p.evaluate(() => window.isGameInProgress()), true);
  await p.evaluate(() => window.resetToPreGame());
  // Pat — pat qilgan tomon yutadi (mahalliy o'yinda ham)
  await p.evaluate(() => { window.pickVariant(document.querySelector('#variantSeg [data-variant="shatranj"]')); window.startLocalGame(); game.load('k7/2K5/8/8/8/8/8/1R6 w - - 0 1'); board.position(game.fen()); });
  await p.evaluate(() => { window.executeMove('b1', 'b7'); });
  await sleep(400);
  assert.equal(await p.evaluate(() => (window.lastGameEnd || {}).winner), 'w');
  assert.deepEqual(p.errors, []);
});

test("Ovoz bilan yurish: tugma tinglashni yoqadi, aytilgan yurish taxtada bajariladi", opts, async () => {
  const u = await srv.register('Voice');
  const p = await page(u);
  // Soxta nutqni aniqlash xizmati (haqiqiy mikrofon yo'q)
  await p.evaluateOnNewDocument(() => {
    window.__vc = null;
    window.webkitSpeechRecognition = function () { window.__vc = this; };
    window.webkitSpeechRecognition.prototype.start = function () { setTimeout(() => this.onstart && this.onstart(), 0); };
    window.webkitSpeechRecognition.prototype.abort = function () {};
    window.SpeechRecognition = window.webkitSpeechRecognition;
    window.__say = (...alts) => {
      const res = alts.map((t) => ({ transcript: t }));
      res.isFinal = true;
      window.__vc.onresult({ results: [res] });
    };
  });
  await p.goto(srv.base + '/oyin', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#pgVoiceBtn', { timeout: 10000 });
  await sleep(600);
  assert.equal(await p.evaluate(() => document.getElementById('pgVoiceBtn').hidden), false);
  await p.click('#btnLocalGame');
  await sleep(300);
  await p.click('#pgVoiceBtn');
  await sleep(300);
  assert.equal(await p.evaluate(() => document.getElementById('pgVoiceBtn').classList.contains('listening')), true);
  // Birinchi variant tushunarsiz — ikkinchisi ishlatiladi
  await p.evaluate(() => window.__say('salom', 'e4'));
  await p.evaluate(() => window.__say("ot f6"));
  await sleep(200);
  assert.deepEqual(await p.evaluate(() => game.history()), ['e4', 'Nf6']);
  await p.evaluate(() => window.__say('salom'));
  assert.equal(await p.evaluate(() => game.history().length), 2);
  await p.click('#pgVoiceBtn');
  assert.equal(await p.evaluate(() => localStorage.getItem('justChessVoice')), '0');
  assert.deepEqual(p.errors, []);
});

test("Ixcham menyu: ⚙️ Sozlamalar 🔔 yonida, ⭐ Chempionlar — Ligalar ichida tab", opts, async () => {
  const u = await srv.register('Menu');
  for (const vp of [null, { width: 390, height: 844, isMobile: true, hasTouch: true }]) {
    const p = await page(u, vp);
    await p.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#topSettingsBtn', { visible: true, timeout: 10000 });
    await sleep(500);
    assert.equal(await p.evaluate(() => !!document.querySelector('#navChampions, #navSettings')), false);
    if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/menu-' + (vp ? 'phone' : 'pc') + '.png' });
    await p.click('#topSettingsBtn');
    await sleep(400);
    assert.equal(await p.evaluate(() => location.pathname + '|' + document.getElementById('settingsView').classList.contains('active-view')), '/sozlamalar|true');
    await p.goto(srv.base + '/ligalar', { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#leaguesView .lg-tab', { visible: true, timeout: 10000 });
    await sleep(400);
    await p.click('#leaguesView .lg-tab:nth-child(2)');
    await sleep(500);
    const st = await p.evaluate(() => ({ path: location.pathname, on: document.getElementById('championsView').classList.contains('active-view'), nav: document.getElementById('navLeagues').classList.contains('active') }));
    assert.deepEqual(st, { path: '/chempionlar', on: true, nav: true });
    if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/champions-' + (vp ? 'phone' : 'pc') + '.png' });
    assert.deepEqual(p.errors, []);
  }
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
  await p2.goto(srv.base + '/klublar', { waitUntil: 'domcontentloaded' });
  await p2.waitForSelector('.cl-grid.small .cl-tile', { timeout: 10000 });
  const cols = await p2.evaluate(() => getComputedStyle(document.querySelector('.cl-grid.small')).gridTemplateColumns.split(' ').length);
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
  const dialogs = [];
  p.on('dialog', (d) => dialogs.push(d.message()));
  await (await p.$('#playOnlineBtn')).tap();
  // Qidiruv boshlanguncha kutamiz (sekin muhitda socket ulanishi kechikishi mumkin)
  await p.waitForFunction(() => window.isSearchingOpponent === true, { timeout: 10000 }).catch(() => {});
  const s = await p.evaluate(() => ({ view: document.querySelector('.view-section.active-view').id, searching: !!window.isSearchingOpponent, socket: typeof socket !== 'undefined' && socket.connected }));
  assert.equal(s.view, 'gameView', JSON.stringify({ s, dialogs }));
  assert.equal(s.searching, true, JSON.stringify({ s, dialogs }));
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
