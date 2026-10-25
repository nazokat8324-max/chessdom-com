// Brauzer testi (puppeteer-core): Chrome topilmasa o'tkazib yuboriladi. CHROME_PATH bilan yo'lni berish mumkin.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { startServer, sleep } = require('./helpers');

const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => p && fs.existsSync(p));
// `npm run test:quick` — brauzer testlarisiz (Chrome og'ir; to'liq to'plam GitHub Actions'da har push'da ishlaydi)
const QUICK = process.env.npm_lifecycle_event === 'test:quick';
const opts = { skip: QUICK ? 'test:quick — brauzer testlari o\'tkazildi' : CHROME ? false : 'Chrome topilmadi (CHROME_PATH)' };

let srv, browser;
before(async () => {
  if (!CHROME || QUICK) return;
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

test("Shahar naqshlari: o'z profilida tanlanadi, qulflanganlari bosilmaydi", opts, async () => {
  const u = await srv.register('Banner');
  for (const vp of [null, { width: 390, height: 844, isMobile: true, hasTouch: true }]) {
    const p = await page(u, vp);
    await p.goto(srv.base + '/?profile=' + u.name, { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#profileCaravan .bn-edit', { visible: true, timeout: 15000 });
    await p.click('#profileCaravan .bn-edit');
    await p.waitForSelector('#bnPicker .bn-opt', { visible: true });
    const st = await p.evaluate(() => ({ all: document.querySelectorAll('#bnPicker .bn-opt').length, locked: document.querySelectorAll('#bnPicker .bn-opt.locked').length }));
    assert.deepEqual(st, { all: 13, locked: 11 }, "naqshsiz + 12 shahar, yangi o'yinchida faqat Sian ochiq");
    if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/bn-picker-' + (vp ? 'phone' : 'pc') + '.png' });
    await p.click('#bnPicker .bn-opt[data-bn="xian"]');
    await sleep(600);
    assert.equal(await p.evaluate(() => document.querySelector('#profileModal .profile-sidebar-card').classList.contains('has-banner')), true);
    if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/bn-profile-' + (vp ? 'phone' : 'pc') + '.png' });
    assert.deepEqual(p.errors, []);
  }
  // Boshqa o'yinchi profilida naqsh ko'rinadi, tanlash tugmasi yo'q
  const v = await srv.register('Viewer');
  const p2 = await page(v);
  await p2.goto(srv.base + '/?profile=' + u.name, { waitUntil: 'domcontentloaded' });
  await p2.waitForSelector('#profileModal .profile-sidebar-card.has-banner', { timeout: 15000 });
  assert.equal(await p2.evaluate(() => !!document.querySelector('#profileCaravan .bn-edit')), false);
});

test("Bahs: chaqiruvda tanlanadi, o'yin panelida hisob, keyingi o'yin tugmasi, profilda ro'yxat", opts, async () => {
  const a = await srv.register('DuelA'), b = await srv.register('DuelB');
  const p = await page(a);
  await p.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#topSettingsBtn', { visible: true, timeout: 10000 });
  await sleep(1200);
  // Chaqiruv oynasida bahs tanlovi bor
  await p.evaluate((n) => window.openChallengeDialog(n), b.name);
  await p.waitForSelector('#challengeModal [data-series="5"]', { visible: true });
  await p.click('#challengeModal [data-series="5"]');
  assert.equal(await p.evaluate(() => document.querySelector('#challengeModal [data-series="5"]').classList.contains('active')), true);
  await p.click('#challengeModal [data-close]');
  // B (socket) A ni 3 o'yinlik bahsga chaqiradi
  const sb = await srv.connect(b);
  sb.emit('challenge-send', { username: a.name, initial: 180, increment: 2, rated: false, series: 3 });
  await p.waitForSelector('#challengeModal [data-accept]', { visible: true, timeout: 8000 });
  assert.match(await p.evaluate(() => document.querySelector('#challengeModal .ch-sub').textContent), /⚔️ 3/);
  const found = new Promise((r) => sb.once('match-found', r));
  await p.click('#challengeModal [data-accept]');
  const m = await found;
  await p.waitForSelector('#duelBox:not([hidden])', { timeout: 8000 });
  assert.match(await p.evaluate(() => document.querySelector('#duelBox .du-score b').textContent), /0 – 0/);
  // B taslim → A 1:0, "Keyingi o'yin (2/3)"
  sb.emit('game-over', { roomId: m.roomId, result: { type: 'resign' } });
  await p.waitForFunction(() => /1 – 0/.test((document.querySelector('#duelBox .du-score b') || {}).textContent || ''), { timeout: 8000 });
  await sleep(400);
  assert.match(await p.evaluate(() => document.getElementById('btnRematch').textContent), /2\/3/);
  if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/duel-over.png' });
  // Bahsni to'xtatish → profilda ro'yxat
  await p.click('#duelBox .du-stop');
  await p.waitForFunction(() => /to'xtatildi/i.test(document.querySelector('#duelBox .du-status').textContent), { timeout: 8000 });
  await p.goto(srv.base + '/?profile=' + a.name, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#profDuelsSection:not([hidden]) .du-row', { timeout: 15000 });
  assert.match(await p.evaluate(() => document.querySelector('#profDuels .du-row').textContent), /1 – 0/);
  if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/duel-profile.png', fullPage: false });
  sb.disconnect();
  assert.deepEqual(p.errors, []);
});

test("O'yin hikoyasi: tahlildan keyin oynada bosqichlar, bosilsa taxtada o'sha pozitsiya", opts, async () => {
  const u = await srv.register('Story');
  const p = await page(u);
  await p.goto(srv.base + '/oyin', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#btnLocalGame', { visible: true, timeout: 10000 });
  await sleep(600);
  await p.click('#btnLocalGame');
  await sleep(300);
  await p.evaluate(() => { for (const [f, t] of [['e2', 'e4'], ['e7', 'e5'], ['f1', 'c4'], ['b8', 'c6'], ['d1', 'h5'], ['g8', 'f6'], ['h5', 'f7']]) window.executeMove(f, t); });
  await sleep(600);
  // Tahlil qutisida hikoya tugmasi (dvigatelsiz: tahlil natijasini o'zimiz beramiz)
  await p.waitForSelector('#pgAnalysisBox .an-story', { visible: true, timeout: 8000 });
  await p.evaluate(() => {
    const ev = (cp) => ({ cp, mate: null });
    const h = game.history({ verbose: true });
    window.gameAnalysis = {
      evals: [ev(20), ev(30), ev(25), ev(40), ev(35), ev(60), { cp: 10000, mate: null, terminal: true }, { cp: 10000, mate: null, terminal: true }],
      moves: h.map((m, i) => ({ san: m.san, color: m.color, cls: i === 5 ? 'blunder' : null, loss: i === 5 ? 48 : 1, bestSan: i === 5 ? 'g6' : null })),
      accuracy: { w: 96, b: 41 }
    };
  });
  await p.click('#pgAnalysisBox .an-story');
  await p.waitForSelector('#storyModal .st-ch', { visible: true, timeout: 5000 });
  const st = await p.evaluate(() => ({ title: document.querySelector('#storyModal .st-title').textContent, n: document.querySelectorAll('#storyModal .st-ch').length, text: document.querySelector('#storyModal .st-list').textContent }));
  assert.ok(st.n >= 4);
  assert.match(st.text, /Nf6/);
  assert.match(st.text, /g6/);
  assert.match(st.text, /Qxf7#/);
  await p.click('#storyModal [data-st-ply="6"]');
  await sleep(300);
  assert.equal(await p.evaluate(() => window.getViewPly()), 6);
  if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/story.png' });
  assert.deepEqual(p.errors, []);
});

test("Nishonlar: profilda tugma, 6 tur, olinganlari ajralib turadi", opts, async () => {
  const u = await srv.register('Badge');
  const p = await page(u);
  await p.goto(srv.base + '/?profile=' + u.name, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#profBadgeBtn', { visible: true, timeout: 15000 });
  await p.waitForFunction(() => document.getElementById('profBadgeCount').textContent !== '', { timeout: 15000 });
  assert.equal(await p.evaluate(() => document.getElementById('profBadgeCount').textContent), '0');
  await p.click('#profBadgeBtn');
  await p.waitForSelector('#profBadgePanel:not([hidden]) .nb-item', { timeout: 5000 });
  assert.equal(await p.evaluate(() => document.querySelectorAll('#profBadges .nb-item').length), 7);
  assert.equal(await p.evaluate(() => document.querySelectorAll('#profBadges .nb-item.earned').length), 0);
  // Nishonlar bilan (sahifada chizish): 2 hafta, Samarqandgacha karvon, 1 oylik mukofot
  await p.evaluate(() => window.renderProfileBadges({ caravan: 190, badges: { questWeeks: ['2026-10-19', '2026-10-12'], gameOfDay: [{ day: '2026-10-20', opponent: 'Ali' }] }, sportsmanship: { awards: ['2026-09'] }, predictions: { awards: [] }, duels: { won: 2 } }));
  const st = await p.evaluate(() => ({ earned: document.querySelectorAll('#profBadges .nb-item.earned').length, count: document.getElementById('profBadgeCount').textContent, stamps: document.querySelectorAll('#profBadges .nb-stamp.on').length }));
  assert.deepEqual(st, { earned: 5, count: String(2 + 5 + 1 + 2 + 1), stamps: 5 });
  if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/badges.png' });
  assert.deepEqual(p.errors, []);
});

test("Profil bo'limlari alohida sahifada: manzil, havola orqali ochish, ← Orqaga profilga qaytaradi", opts, async () => {
  const u = await srv.register('Sect');
  for (const vp of [null, { width: 390, height: 844, isMobile: true, hasTouch: true }]) {
    const p = await page(u, vp);
    await p.goto(srv.base + '/?profile=' + u.name, { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#profAchBtn', { visible: true, timeout: 15000 });
    await sleep(800);
    await p.click('#profAchBtn');
    await p.waitForSelector('#profsecView.active-view #profAchPanel:not([hidden])', { timeout: 8000 });
    await p.waitForSelector('#profAchievements .ach-item', { timeout: 8000 });
    await sleep(200);
    const st = await p.evaluate(() => ({ url: location.pathname + location.search, modal: document.getElementById('profileModal').style.display, others: ['profExtPanel', 'profOpenPanel', 'profBadgePanel'].map((id) => document.getElementById(id).hidden) }));
    assert.equal(st.url, '/profil?u=' + encodeURIComponent(u.name) + '&b=yutuqlar');
    assert.notEqual(st.modal, 'flex', 'profil oynasi yopiladi');
    assert.deepEqual(st.others, [true, true, true]);
    if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/sect-ach-' + (vp ? 'phone' : 'pc') + '.png' });
    await p.click('#psHead [data-ps-back]');
    await p.waitForFunction(() => document.getElementById('profileModal').style.display === 'flex', { timeout: 8000 });
    // Barcha o'yinlar ham — ← Orqaga bilan
    await p.evaluate(() => window.openGameHistory(window.currentProfileUser()));
    await p.waitForSelector('#historyRoot [data-gh-back]', { visible: true, timeout: 8000 });
    await p.click('#historyRoot [data-gh-back]');
    await p.waitForFunction(() => document.getElementById('profileModal').style.display === 'flex', { timeout: 8000 });
    assert.deepEqual(p.errors, []);
  }
  // Havola orqali to'g'ridan-to'g'ri: debyutlar sahifasi
  const p2 = await page(u);
  await p2.goto(srv.base + '/profil?u=' + encodeURIComponent(u.name) + '&b=nishonlar', { waitUntil: 'domcontentloaded' });
  await p2.waitForSelector('#profsecView.active-view #profBadgePanel:not([hidden]) .nb-item', { timeout: 15000 });
  assert.match(await p2.evaluate(() => document.querySelector('#psHead h1').textContent), /Nishonlar/);
  assert.equal(await p2.evaluate(() => location.pathname + location.search), '/profil?u=' + encodeURIComponent(u.name) + '&b=nishonlar');
  if (process.env.UI_SHOTS) await p2.screenshot({ path: process.env.UI_SHOTS + '/sect-badge-pc.png' });
  assert.deepEqual(p2.errors, []);
});

test("Bayramlar: tabrik, taxta bayram rangida, Karvon yo'lida vazifa kartasi; oddiy kunda — keyingi bayram", opts, async () => {
  const u = await srv.register('Holi');
  // Oddiy kun: Karvon yo'lida "Keyingi bayram"
  const p0 = await page(u);
  await p0.goto(srv.base + '/karvon', { waitUntil: 'domcontentloaded' });
  await p0.waitForSelector('#caravanRoot .cv-holiday', { timeout: 15000 });
  assert.match(await p0.evaluate(() => document.querySelector('#caravanRoot .cv-holiday h2').textContent), /Keyingi bayram/);
  // Bayram kuni (server javobi soxta): Navro'z, 1/3
  const p = await page(u);
  await p.setRequestInterception(true);
  p.on('request', (r) => {
    if (r.url().endsWith('/api/holiday')) {
      return r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, active: [{ key: 'navruz', icon: '🌷', year: 2027, need: 3, endsAt: new Date(Date.now() + 2 * 864e5).toISOString(), mine: { key: 'navruz', have: 1, done: false } }], next: null }) });
    }
    r.continue();
  });
  await p.goto(srv.base + '/karvon', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#caravanRoot .cv-holiday.on', { timeout: 15000 });
  const st = await p.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-holiday'),
    dark: getComputedStyle(document.documentElement).getPropertyValue('--bd-dark').trim(),
    title: document.querySelector('.cv-holiday.on h2').textContent,
    prog: document.querySelector('.cv-holiday.on small').textContent
  }));
  assert.equal(st.attr, 'navruz');
  assert.equal(st.dark, '#5c9b4a', "taxta 'Mavzuga mos' — Navro'z rangi");
  assert.match(st.title, /Navro'z muborak/);
  assert.match(st.prog, /^1\/3/);
  await p.waitForFunction(() => [...document.querySelectorAll('.toast')].some((t) => /muborak/.test(t.textContent)), { timeout: 8000 });
  if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/holiday.png' });
  assert.deepEqual(p.errors, []);
  assert.deepEqual(p0.errors, []);
});

test("2 ga 2: stol ro'yxati, o'rinda o'tirish, o'z navbatida sudrab yurish, jamoa chati va maslahat", opts, async () => {
  const em = (s, ev, data) => new Promise((r) => s.emit(ev, data, r));
  const bots = {};
  for (const n of ['TmW1', 'TmB1', 'TmB2']) { const u = await srv.register(n); bots[n] = { u, s: await srv.connect(u) }; }
  const { code } = await em(bots.TmW1.s, 'team-create', { initial: 600, increment: 5 });
  await em(bots.TmB1.s, 'team-sit', { code, seat: 'b1' });
  await em(bots.TmB2.s, 'team-sit', { code, seat: 'b2' });
  const me = await srv.register('TmMe');
  const p = await page(me);
  // Ro'yxatda stol bor
  await p.goto(srv.base + '/jamoa', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector(`#tmList [data-join="${code}"]`, { timeout: 15000 });
  await p.click(`#tmList [data-join="${code}"]`);
  await p.waitForSelector('#tmSeats [data-sit="w2"]', { timeout: 8000 });
  assert.equal(await p.evaluate(() => location.pathname + location.search), '/jamoa?t=' + code);
  await p.click('#tmSeats [data-sit="w2"]');
  await p.waitForFunction(() => document.getElementById('tmSeats').offsetParent === null && /yuradi/.test(document.getElementById('tmStatus').textContent), { timeout: 8000 });
  // w1 va b1 yuradi → endi navbat menda (oqning 2-yurishi)
  await em(bots.TmW1.s, 'team-move', { code, from: 'e2', to: 'e4' });
  await em(bots.TmB1.s, 'team-move', { code, from: 'e7', to: 'e5' });
  await p.waitForFunction(() => document.getElementById('tmStatus').classList.contains('mine'), { timeout: 8000 });
  // Jamoadosh maslahati — kataklar belgilanadi
  await em(bots.TmW1.s, 'team-suggest', { code, from: 'g1', to: 'f3' });
  await p.waitForSelector('#teamBoard [data-square="f3"].tm-hint', { timeout: 5000 });
  if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/team.png' });
  // Sichqoncha bilan sudrab yurish: g1 → f3
  const box = async (sq) => { const b = await (await p.$(`#teamBoard [data-square="${sq}"]`)).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const a = await box('g1'), b = await box('f3');
  await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(b.x, b.y, { steps: 8 }); await p.mouse.up();
  await p.waitForFunction(() => /Nf3/.test(document.getElementById('tmMoves').textContent), { timeout: 8000 });
  // Jamoa chati: w1 oladi
  const got = new Promise((r) => bots.TmW1.s.once('team-chat', r));
  await p.type('#tmChatInput', 'Salom jamoa');
  await p.click('#tmChatForm button');
  assert.equal((await got).message, 'Salom jamoa');
  await p.waitForFunction(() => /Salom jamoa/.test(document.getElementById('tmChatList').textContent), { timeout: 5000 });
  Object.values(bots).forEach((x) => x.s.disconnect());
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

test("Kutubxona: javonlar, maqola (manzil, keyingisi, orqaga), mashhur partiya qayta ko'rishda; ChessCaravan haqida yangilangan", opts, async () => {
  const u = await srv.register('Lib');
  for (const vp of [null, { width: 390, height: 844, isMobile: true, hasTouch: true }]) {
    const p = await page(u, vp);
    await p.goto(srv.base + '/kutubxona', { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#libraryRoot [data-article="start"]', { visible: true, timeout: 15000 });
    const st = await p.evaluate(() => ({ guides: document.querySelectorAll('#lib-guides .lib-card').length, games: document.querySelectorAll('#lib-games [data-game]').length, books: document.querySelectorAll('#lib-books a.lib-btn').length, nav: document.getElementById('navLibrary').classList.contains('active') }));
    assert.deepEqual(st, { guides: 8, games: 11, books: 6, nav: true });
    if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/lib-' + (vp ? 'phone' : 'pc') + '.png' });
    await p.click('#libraryRoot [data-article="start"]');
    await p.waitForSelector('#libraryRoot .lib-points li', { timeout: 5000 });
    assert.equal(await p.evaluate(() => location.pathname + location.search), '/kutubxona?m=start');
    await p.click('#libraryRoot .lib-next');
    await p.waitForFunction(() => location.search === '?m=opening', { timeout: 5000 });
    if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/lib-article-' + (vp ? 'phone' : 'pc') + '.png' });
    await p.click('#libraryRoot [data-lib-back]');
    await p.waitForSelector('#libraryRoot [data-game="opera"]', { timeout: 5000 });
    await p.click('#libraryRoot [data-game="opera"]');
    await p.waitForSelector('#replayModal [data-ply="33"]', { timeout: 8000 });
    assert.match(await p.evaluate(() => document.querySelector('#replayModal h3').textContent), /Paul Morphy/);
    await p.evaluate(() => document.getElementById('replayModal').remove());
    assert.deepEqual(p.errors, []);
  }
  // Havola bilan to'g'ridan-to'g'ri maqola
  const p2 = await page(u);
  await p2.goto(srv.base + '/kutubxona?m=shatranj', { waitUntil: 'domcontentloaded' });
  await p2.waitForSelector('#libraryRoot .lib-article h1', { timeout: 15000 });
  assert.match(await p2.evaluate(() => document.querySelector('#libraryRoot .lib-article h1').textContent), /Shatranj/);
  // ChessCaravan haqida: 10 ta bo'lim kartasi (kutubxona ham), bajarilgan rejalar, lichess eslatmasi yo'q
  await p2.evaluate(() => window.openAboutPage());
  await p2.waitForSelector('#aboutPageContent .ab-card', { timeout: 5000 });
  const ab = await p2.evaluate(() => ({ cards: document.querySelectorAll('#aboutPageContent .ab-card').length, lib: !!document.querySelector('#aboutPageContent .ab-card[data-view="library"]'),
    done: document.querySelectorAll('#aboutPageContent .ab-step.done').length, text: document.getElementById('aboutPageContent').textContent }));
  assert.equal(ab.cards, 10);
  assert.equal(ab.lib, true);
  assert.equal(ab.done, 2);
  assert.doesNotMatch(ab.text, /lichess/i);
  assert.match(ab.text, /Kutubxona/);
  await p2.evaluate(() => { document.getElementById('aboutPage').scrollTop = document.getElementById('ab-plan').offsetTop - 60; });
  await sleep(700);
  if (process.env.UI_SHOTS) await p2.screenshot({ path: process.env.UI_SHOTS + '/about-plan.png' });
  assert.deepEqual(p2.errors, []);
});

test("Kutubxona: misol taxtasi; admin formasi orqali maqola qo'shiladi va kutubxonada ko'rinadi", opts, async () => {
  const adm = await srv.register('LibUiAdm');
  await new Promise((resolve, reject) => {
    const d = new (require('sqlite3').Database)(require('path').join(srv.dir, 'test.sqlite'));
    d.run("UPDATE users SET role = 'admin' WHERE id = ?", [adm.id], (err) => d.close(() => (err ? reject(err) : resolve())));
  });
  adm.user.role = 'admin';
  const p = await page(adm);
  // Vilka qo'llanmasida misol pozitsiyasi (64 katak, belgilangan kataklar, donalar)
  await p.goto(srv.base + '/kutubxona?m=fork', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#libraryRoot .lib-example .lib-board', { timeout: 15000 });
  const ex = await p.evaluate(() => ({ cells: document.querySelectorAll('.lib-board i').length, marks: document.querySelectorAll('.lib-board i.mk').length, pieces: document.querySelectorAll('.lib-board img').length }));
  assert.deepEqual(ex, { cells: 64, marks: 4, pieces: 4 });
  if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/lib-fork.png' });
  // Admin → 📚 Kutubxona → maqola qo'shish
  await p.goto(srv.base + '/admin', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#adminRoot [data-atab="library"]', { timeout: 15000 });
  await p.click('#adminRoot [data-atab="library"]');
  await p.waitForSelector('#admLibForm [data-lf="title"]', { timeout: 8000 });
  await p.type('#admLibForm [data-lf="title"]', 'Admin maqolasi');
  await p.type('#admLibForm [data-lf="lead"]', 'Sinov uchun');
  await p.type('#admLibForm [data-lf="body"]', 'Birinchi band — yetarlicha uzun matn.');
  await p.click('#admLibForm button[type="submit"]');
  await p.waitForSelector('#adminRoot [data-lib-edit]', { timeout: 8000 });
  if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/admin-library.png' });
  // Partiya turiga o'tilsa — PGN maydoni chiqadi
  await p.select('#admLibKind', 'game');
  await p.waitForSelector('#admLibForm [data-lf="pgn"]', { timeout: 5000 });
  // Kutubxonada ko'rinadi
  await p.goto(srv.base + '/kutubxona', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => [...document.querySelectorAll('#lib-guides .lib-card b')].some((b) => b.textContent === 'Admin maqolasi'), { timeout: 15000 });
  await p.evaluate(() => [...document.querySelectorAll('#lib-guides .lib-card')].find((c) => /Admin maqolasi/.test(c.textContent)).click());
  await p.waitForFunction(() => /Birinchi band/.test((document.querySelector('#libraryRoot .lib-points') || {}).textContent || ''), { timeout: 5000 });
  assert.match(await p.evaluate(() => location.search), /^\?m=c%3A|^\?m=c:/);
  assert.deepEqual(p.errors, []);
});

test("Fair-play admin: dvigatel tahlili ko'rsatkichlari va 'Oxirgi 10 o'yinni tekshirish' tugmasi", opts, async () => {
  const adm = await srv.register('FpAdm'), sus = await srv.register('FpSus');
  const run = (q, prm) => new Promise((resolve, reject) => {
    const d = new (require('sqlite3').Database)(require('path').join(srv.dir, 'test.sqlite'));
    d.run(q, prm, (err) => d.close(() => (err ? reject(err) : resolve())));
  });
  await run("UPDATE users SET role = 'admin' WHERE id = ?", [adm.id]);
  adm.user.role = 'admin';
  for (let i = 0; i < 3; i++) {
    await run('INSERT INTO fairplay_engine (id, user_id, game_ref, mode, moves, match_rate, acpl, rating, suspicious, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['fpe' + i + sus.id, sus.id, 'room:t' + i, 'blitz', 20, 0.82, 9, 1500, 1, new Date(Date.now() - i * 1000).toISOString()]);
  }
  const p = await page(adm);
  await p.goto(srv.base + '/admin', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#adminRoot [data-atab]', { timeout: 15000 });
  await p.evaluate(() => window.openAdminTab('fairplay'));
  await p.waitForSelector(`#adminRoot [data-fp-analyze="${sus.id}"]`, { timeout: 8000 });
  const st = await p.evaluate(() => ({ text: document.getElementById('adminRoot').textContent, chips: document.querySelectorAll('#adminRoot .fp-eng.sus').length }));
  assert.match(st.text, /Dvigatel tahlili: 3 o'yin · o'rtacha moslik 82% · ACPL 9 · dvigatelga o'xshash: 3/);
  assert.equal(st.chips, 3);
  await p.click(`#adminRoot [data-fp-analyze="${sus.id}"]`);
  await p.waitForFunction(() => [...document.querySelectorAll('.toast')].some((t) => /navbatiga/.test(t.textContent)), { timeout: 8000 });
  if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/fairplay-admin.png' });
  assert.deepEqual(p.errors, []);
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
