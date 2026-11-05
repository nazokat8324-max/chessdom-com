// Brauzer testi (puppeteer-core): Chrome topilmasa o'tkazib yuboriladi. CHROME_PATH bilan yo'lni berish mumkin.
const { test, before, after, afterEach } = require('node:test');
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
  srv = await startServer({ MUSEUM_VIDEOS_PUBLIC: 'chaturanga', PIECE_VIDEOS_PUBLIC: 'intro,R' });
  browser = await require('puppeteer-core').launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
});
after(async () => { if (browser) await browser.close(); if (srv) await srv.stop(); });
// Har test o'z sahifalarini yopadi: avval 36 ta sahifa (har birida socket, taymerlar) oxirigacha ochiq qolib,
// brauzer og'irlashar va keyingi testlar vaqt limitiga tushardi
const openContexts = [];
afterEach(async () => { for (const c of openContexts.splice(0)) await c.close().catch(() => {}); });

// CDN fayllari (jQuery, chess.js, socket.io, i18next, shriftlar…) bir marta yuklanib, keyingi sahifalarga xotiradan beriladi.
// Avval har sahifa ularni qayta yuklardi va tarmoq sekinlashganda <head> dagi skriptlar sabab navigatsiya 30 s ga tushardi.
const CDN = /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|code\.jquery\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
const cdnCache = new Map(); // url → { status, contentType, body }
async function useCdnCache(p) {
  await p.setRequestInterception(true);
  // Kooperativ rejim (ustuvorlik bilan): testning o'z ushlagichi (soxta /api javobi, ustuvorliksiz) har doim ustun turadi
  p.on('request', (req) => {
    if (req.isInterceptResolutionHandled()) return;
    const hit = req.method() === 'GET' && cdnCache.get(req.url());
    if (hit) return req.respond({ status: hit.status, contentType: hit.contentType, headers: { 'access-control-allow-origin': '*' }, body: hit.body }, 1).catch(() => {});
    req.continue(req.continueRequestOverrides(), 0).catch(() => {});
  });
  p.on('response', async (res) => {
    const url = res.url();
    if (!CDN.test(url) || res.status() !== 200 || cdnCache.has(url) || res.request().method() !== 'GET') return;
    try { cdnCache.set(url, { status: 200, contentType: res.headers()['content-type'] || 'application/octet-stream', body: await res.buffer() }); } catch (e) { /* oqim yopilgan */ }
  });
}

// Sahifa qayta chizilsa ham ishlaydigan bosish: element topilgan zahoti shu brauzer ichida bosiladi (puppeteer avval topib, keyin
// aylantirib bosadi — oraliqda sahifa qayta chizilsa "Node is detached from document"; CI da shu sababli tasodifiy yiqilishlar bo'lgan)
async function clickFresh(p, sel, timeout = 10000) {
  await p.waitForFunction((q) => { const el = document.querySelector(q); if (!el) return false; el.click(); return true; }, { timeout, polling: 200 }, sel);
}

async function page(user, viewport) {
  const ctx = await browser.createBrowserContext();
  openContexts.push(ctx);
  const p = await ctx.newPage();
  p.setDefaultNavigationTimeout(60000);
  await useCdnCache(p);
  await p.setViewport(viewport || { width: 1366, height: 860 });
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  // alert/confirm avtomatik yopiladi, matni saqlanadi — test yiqilsa sababini ko'rsatish uchun (p.dialogs)
  p.dialogs = [];
  p.on('dialog', (d) => { p.dialogs.push(d.message()); d.accept(); });
  await p.evaluateOnNewDocument((u) => {
    localStorage.setItem('justChessLang', 'uz');
    if (u) { localStorage.setItem('justChessAuthToken', u.token); localStorage.setItem('justChessCurrentUser', JSON.stringify(u.user)); }
  }, user || null);
  return p;
}

test('Kirmagan foydalanuvchiga kirish sahifasi chiqadi', opts, async () => {
  const p = await page(null);
  await p.goto(srv.base + '/', { waitUntil: 'load' });
  await sleep(800);
  const gate = await p.evaluate(() => document.body.classList.contains('auth-locked') && !!document.querySelector('#authGate .auth-legal a[href="/maxfiylik"]'));
  assert.ok(gate);
  assert.deepEqual(p.errors, []);
});

test("Mehmon: ro'yxatdan o'tmasdan o'ynash → reytingsiz qidiruv, eslatma, ro'yxatdan o'tganda o'sha akkaunt saqlanadi", opts, async () => {
  const p = await page(null);
  await p.goto(srv.base + '/', { waitUntil: 'load' });
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
  // A'zolar soni (/api/country-clubs) kartadan keyin keladi — "Faol klublar" shundan keyin to'ladi (sekin CI da kartani ko'rgan zahoti
  // tekshirilsa ro'yxat bo'sh edi: 2026-10-30 dan 2026-11-03 gacha GitHub Actions shu sababli yiqilgan)
  await p.waitForSelector('.cl-grid:not(.small) .cl-tile[data-club="Uzbekistan"]', { timeout: 10000 });
  // Faol klublar a'zolar soni bo'yicha tepada (boshqa testlar ham klubga qo'shiladi — tartib a'zolar soniga qarab tekshiriladi)
  const active = await p.evaluate(() => [...document.querySelectorAll('.cl-grid:not(.small) .cl-tile')].map((t) => t.dataset.club));
  assert.ok(active.includes('Uzbekistan'), "a'zosi bor klub faollar orasida: " + active.join(','));
  const counts = (await srv.api(null, '/api/country-clubs')).clubs;
  const n = (name) => (counts.find((c) => c.name === name) || { members: 0 }).members;
  assert.deepEqual(active.map(n), [...active.map(n)].sort((a, b) => b - a), "a'zolar soni bo'yicha kamayib boradi");
  await p.click('.cl-mine');
  await p.waitForSelector('.cl-tabs .cl-tab.active[data-cl-tab="overview"]');
  await p.waitForSelector('.cl-stats');
  for (const [tab, q] of [['members', 'tab=reyting'], ['league', 'tab=liga'], ['chat', 'tab=chat']]) {
    await p.evaluate((t) => document.querySelector(`.cl-tabs [data-cl-tab="${t}"]`).click(), tab);
    await sleep(400);
    assert.ok((await p.evaluate(() => location.search)).includes(q), tab);
  }
  assert.ok(await p.evaluate(() => !!document.querySelector('#clPane .club-chat-container #clubChatMessageInput')), "chat klub sahifasi ichida");
  await p.goto(srv.base + '/klublar?club=Uzbekistan&tab=tarix', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.cl-sort button.active');
  assert.deepEqual(await p.evaluate(() => [document.querySelector('.cl-tab.active').dataset.clTab, document.querySelector('.cl-sort .active').dataset.clSort]), ['members', 'newest']);
  // Turnirlar olib tashlangan: eski "tab=turnirlar" havolasi klubning Liga tabini ochadi
  await p.goto(srv.base + '/klublar?club=Uzbekistan&tab=turnirlar', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.cl-tab.active[data-cl-tab="league"]');
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

test("Donalar haqida: ❓ oynasi 6 ta donani nomi, chizmasi va qoidasi bilan ko'rsatadi, dona ustida nomi chiqadi, «Aniq» to'plami tanlanadi", opts, async () => {
  const u = await srv.register('Pcg');
  const p = await page(u);
  await p.goto(srv.base + '/oyin', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#pgPiecesBtn', { timeout: 10000 });
  await sleep(500);
  await p.click('#pgPiecesBtn');
  await p.waitForSelector('#pieceGuide .pc-card');
  const cards = await p.evaluate(() => [...document.querySelectorAll('#pieceGuide .pc-card')].map((c) => ({
    piece: c.dataset.pc, name: c.querySelector('.pc-name b').textContent.trim(), cells: c.querySelectorAll('.pc-sq').length,
    moves: c.querySelectorAll('.pc-sq.mv').length, caps: c.querySelectorAll('.pc-sq.cp').length, text: c.querySelector('.pc-move').textContent.trim()
  })));
  assert.deepEqual(cards.map((c) => c.piece), ['K', 'Q', 'R', 'B', 'N', 'P']);
  assert.ok(cards.every((c) => c.cells === 49 && c.name && c.text.length > 15), JSON.stringify(cards));
  // 7×7 chizmada markazdagi dona: shoh 8, farzin 24, rux 12, fil 12, ot 8 katak; piyoda — 2 yurish + 2 olish
  assert.deepEqual(cards.map((c) => [c.moves, c.caps]), [[8, 0], [24, 0], [12, 0], [12, 0], [8, 0], [2, 2]]);
  // Shatranj: farzin — 1 katak diagonal (4), fil — 2 katak sakraydi (4), piyoda — faqat 1 qadam
  assert.deepEqual(await p.evaluate(() => ['Q', 'B', 'P'].map((k) => window.PieceGuide.moves(k, 'shatranj').move.length)), [4, 4, 1]);
  // ▶ "So'z tarixi" videolari: faqat ochiqlari — tepada «Shaxmat» so'zi, rux kartasida; boshqa kartalarda yo'q; yangi oynada
  await p.waitForSelector('#pieceGuide .pc-card[data-pc="R"] .pc-video', { timeout: 8000 });
  const vids = await p.evaluate(() => [...document.querySelectorAll('#pieceGuide .pc-video')].map((a) => ({ href: a.href, card: a.closest('.pc-card') ? a.closest('.pc-card').dataset.pc : 'top', blank: a.target === '_blank' && /noopener/.test(a.rel) })));
  assert.deepEqual(vids, [{ href: 'https://www.youtube.com/shorts/M9oBqPI93_I', card: 'top', blank: true }, { href: 'https://www.youtube.com/shorts/mQfuw0VWZUU', card: 'R', blank: true }]);
  await p.keyboard.press('Escape');
  assert.equal(await p.evaluate(() => !!document.getElementById('pieceGuide')), false);
  // Taxtadagi dona ustiga sichqoncha — nomi
  await p.hover('#chessBoard img[data-piece="wN"]');
  assert.match(await p.evaluate(() => document.querySelector('#chessBoard img[data-piece="wN"]').title), /Ot/);
  // Sozlamalar: «Aniq» to'plami va "Donalar haqida" tugmasi
  await p.goto(srv.base + '/sozlamalar', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.set-nav [data-section="board"]', { timeout: 10000 });
  await p.click('.set-nav [data-section="board"]');
  await p.waitForSelector('[data-piece-set="clear"]', { timeout: 10000 });
  await p.click('[data-piece-set="clear"]');
  await sleep(200);
  assert.match(await p.evaluate(() => document.querySelector('.set-preview-wrap img').src), /chesspieces\/clear\//);
  await p.click('[data-piece-guide]');
  await p.waitForSelector('#pieceGuide .pc-card img[src*="/clear/"]');
  assert.deepEqual(p.errors, []);
});

test("Onlayn o'ynash: skriptlar yuklanguncha tugma bosilsa ham xato yo'q — yuklangach raqib qidiruvi boshlanadi", opts, async () => {
  // Admin panelida qayd etilgan: "window.quickPlayOnline is not a function" (sekin internetda online.js hali yuklanmagan)
  const u = await srv.register('Qp');
  const p = await page(u, { width: 390, height: 844, isMobile: true, hasTouch: true });
  let release;
  const released = new Promise((r) => { release = r; });
  p.on('request', (req) => { if (req.url().endsWith('/online.js')) req.enqueueInterceptAction(() => released); });
  const nav = p.goto(srv.base + '/', { waitUntil: 'load' });
  await p.waitForFunction(() => !!document.getElementById('playOnlineBtn'), { timeout: 30000 });
  await p.evaluate(() => document.getElementById('playOnlineBtn').click());
  release();
  await nav;
  // Sekin CI da 15 s yetmay qolgan (2026-11-04); yiqilsa — sayt chiqargan oyna (masalan "Serverga ulanib bo'lmadi") xabarda ko'rinadi
  await p.waitForFunction(() => location.pathname === '/oyin' && window.isSearchingOpponent === true, { timeout: 30000 })
    .catch(async (e) => { throw new Error(e.message + ' | dialogs: ' + JSON.stringify(p.dialogs) + ' | path: ' + await p.evaluate(() => location.pathname + ' searching=' + window.isSearchingOpponent + ' socket=' + !!(window.socket && window.socket.connected))); });
  assert.deepEqual(p.dialogs, []);
  assert.deepEqual(p.errors, []);
  await p.evaluate(() => window.cancelSearch && window.cancelSearch());
});

test("1-sinov o'tishi: huquqiy sahifa tablari so'z o'rtasidan bo'linmaydi, chetdagi bekat yozuvi ekranda, konfetti faqat kerak bo'lganda yuklanadi", opts, async () => {
  const u = await srv.register('Pass');
  // Huquqiy sahifa (telefon): har bir so'z bitta qatorda — avval "Foydalanis-h", "litsenziyala-r" bo'linib ketardi
  const p = await page(u, { width: 390, height: 844, isMobile: true, hasTouch: true });
  await p.goto(srv.base + '/mualliflar', { waitUntil: 'load' });
  await p.waitForSelector('#lgTabCredits');
  await sleep(300);
  const broken = await p.evaluate(() => [...document.querySelectorAll('.lg-tabs a')].flatMap((a) => {
    const node = a.firstChild; if (!node || node.nodeType !== 3) return [];
    const out = []; const re = /\S+/g; let m;
    while ((m = re.exec(node.textContent))) { const r = document.createRange(); r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length); if (r.getClientRects().length > 1) out.push(m[0]); }
    return out;
  }));
  assert.deepEqual(broken, [], "bo'lingan so'zlar");
  // Konfetti sahifa ochilganda yuklanmaydi; chaqirilganda yuklanib, haqiqiy funksiya o'rnini egallaydi
  const reqs = [];
  const g = await page(u, { width: 390, height: 844, isMobile: true, hasTouch: true });
  g.on('request', (r) => { if (/confetti/.test(r.url())) reqs.push(r.url()); });
  await g.goto(srv.base + '/bayroqlar', { waitUntil: 'load' });
  await g.waitForSelector('#cvRoute .cvr-stop.on');
  await sleep(800);
  assert.equal(reqs.length, 0, 'konfetti oldindan yuklanmaydi');
  // Chetdagi (5-) bekat yozuvi — "Bayroqlar bellashuvi" — ekrandan chiqmaydi
  const lab = await g.evaluate(() => { const r = document.querySelector('#cvRoute .cvr-stop[data-i="4"] .cvr-label').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), innerWidth]; });
  assert.ok(lab[0] >= 0 && lab[1] <= lab[2], 'yozuv: ' + JSON.stringify(lab));
  const lazy = await g.evaluate(() => window.confetti);
  await g.evaluate(() => window.confetti({ particleCount: 5 }));
  await g.waitForFunction(() => window.confetti && !/loading/.test(String(window.confetti)) && window.confetti.reset, { timeout: 20000 });
  assert.equal(reqs.length, 1, 'birinchi chaqiruvda bir marta yuklandi');
  assert.deepEqual([...p.errors, ...g.errors], []);
});

test("2-sinov o'tishi: kichik telefonda qayta ko'rish oynasi tepadan ochiladi (✕ ko'rinadi), o'yinda ◀ sahifani siljitmaydi", opts, async () => {
  const H = require('./helpers');
  const a = await srv.register('Rpa'), b = await srv.register('Rpb');
  const g = await H.startGame(srv, a, b);
  const LINE = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'c2c3', 'g8f6', 'd2d3', 'd7d6', 'b1d2', 'a7a6', 'h2h3', 'h7h6', 'a2a4', 'a6a5'];
  await H.play(g, LINE);
  await H.finish(g, 'black-resigns');
  H.closeAll(a, b);
  const hist = await srv.api(a, '/api/users/' + encodeURIComponent(a.name) + '/history');
  const p = await page(a, { width: 360, height: 640, isMobile: true, hasTouch: true });
  await p.goto(srv.base + '/', { waitUntil: 'load' });
  await sleep(800);
  await p.evaluate((n, id) => window.openReplay(n, id), a.name, hist.games[0].id);
  await p.waitForSelector('#replayModal .rp-x');
  await sleep(600);
  const r = await p.evaluate(() => { const x = document.querySelector('#replayModal .rp-x').getBoundingClientRect(); return { top: Math.round(x.top), bottom: Math.round(x.bottom), vh: innerHeight }; });
  assert.ok(r.top >= 0 && r.bottom <= r.vh, "✕ ko'rinadi: " + JSON.stringify(r));
  await p.keyboard.press('Escape');
  // O'yin sahifasi: yurishlarni ◀ bilan ko'rish sahifani (main-wrapper) aylantirmaydi
  const q = await page(a, { width: 360, height: 640, isMobile: true, hasTouch: true });
  await q.goto(srv.base + '/oyin', { waitUntil: 'load' });
  await q.waitForSelector('#btnLocalGame', { timeout: 15000 });
  await sleep(500);
  await q.evaluate(() => window.startLocalGame());
  await sleep(300);
  for (const mv of LINE) await q.evaluate((m) => window.executeMove(m.slice(0, 2), m.slice(2, 4)), mv);
  await sleep(400);
  const y0 = await q.evaluate(() => { const w = document.querySelector('.main-wrapper'); w.scrollTop = 0; return w.scrollTop; });
  for (let i = 0; i < 6; i++) { await q.evaluate(() => window.reviewMove('prev')); await sleep(80); }
  assert.equal(await q.evaluate(() => document.querySelector('.main-wrapper').scrollTop), y0, 'sahifa joyida qoldi');
  assert.deepEqual([...p.errors, ...q.errors], []);
});

test("3-sinov o'tishi: telefonda toastlar ko'pi bilan 2 ta (takrorsiz), Xabarlar ro'yxati yangi xabarda joyida qoladi", opts, async () => {
  const u = await srv.register('Tst');
  const senders = [];
  for (let i = 0; i < 14; i++) senders.push(await srv.register('Snd' + i));
  for (const s of senders) await srv.api(s, '/api/chat/messages', 'POST', { roomId: 'user_' + u.user.id, message: 'salom ' + s.name });
  const p = await page(u, { width: 390, height: 700, isMobile: true, hasTouch: true });
  await p.goto(srv.base + '/', { waitUntil: 'load' });
  await sleep(800);
  const toasts = await p.evaluate(() => {
    ['bir', 'ikki', 'uch', 'uch', "to'rt", "to'rt"].forEach((m) => window.showToast(m, 'info', 5000));
    return [...document.querySelectorAll('#toastContainer .toast')].map((t) => t.textContent.slice(1));
  });
  assert.deepEqual(toasts, ['uch', "to'rt"], 'oxirgi 2 ta, takrorsiz');
  await p.evaluate(() => switchView('messages'));
  await p.waitForFunction(() => document.querySelectorAll('#msgList .msg-item').length >= 14, { timeout: 10000 });
  const before = await p.evaluate(() => { const l = document.getElementById('msgList'); l.scrollTop = 300; return l.scrollTop; });
  assert.ok(before > 100, "ro'yxat aylanadi: " + before);
  await srv.api(senders[3], '/api/chat/messages', 'POST', { roomId: 'user_' + u.user.id, message: 'yana bir xabar' });
  await p.waitForFunction(() => document.body.innerText.includes('yana bir xabar'), { timeout: 10000 });
  await sleep(300);
  assert.equal(await p.evaluate(() => document.getElementById('msgList').scrollTop), before, "ro'yxat joyida qoldi");
  assert.deepEqual(p.errors, []);
});

test("4-sinov o'tishi: mehmonga Xabarlarda yozish maydoni o'rniga taklif, 'ro'yxatdan o'ting' bir marta (toast emas, taklif)", opts, async () => {
  const other = await srv.register('Gmo');
  const gr = await srv.api(null, '/api/auth/guest', 'POST', { lang: 'uz' });
  const p = await page({ user: gr.user, token: gr.token }, { width: 844, height: 390, isMobile: true, hasTouch: true });
  await p.goto(srv.base + '/', { waitUntil: 'load' });
  await sleep(800);
  await p.evaluate((n) => window.openMessagesWith(n), other.name);
  await p.waitForSelector('#msgChat .msg-chat-head', { timeout: 10000 });
  await sleep(300);
  const st = await p.evaluate(() => ({ input: !!document.getElementById('msgInput'), note: !!document.querySelector('.msg-guest-note .guest-signup-btn'), clear: !!document.querySelector('[data-clear-chat]') }));
  assert.deepEqual(st, { input: false, note: true, clear: false });
  // Klubga qo'shilish (server 403 guest) — faqat taklif, bir xil matnli toast yo'q
  await p.evaluate(() => fetch('/api/country-clubs/join', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window.authToken }, body: JSON.stringify({ country: 'Uzbekistan', code: 'uz' }) }).then((r) => r.json()).then((d) => window.showToast(window.tServer(d.message), 'warning')));
  await p.waitForFunction(() => { const e = document.getElementById('guestPrompt'); return e && !e.hidden; }, { timeout: 5000 });
  assert.equal(await p.evaluate(() => document.querySelectorAll('#toastContainer .toast').length), 0, 'takroriy toast yo\'q');
  await p.evaluate(() => document.querySelector('.msg-guest-note .guest-signup-btn').click());
  await sleep(300);
  assert.equal(await p.evaluate(() => document.getElementById('authGateClose').hidden), false, "ro'yxatdan o'tish sahifasi ochildi");
  assert.deepEqual(p.errors, []);
});

test("4-sinov o'tishi: Karvon yo'li — surishdan keyin darhol bosilgan bekat yo'qolmaydi; klaviatura bilan ham ishlaydi", opts, async () => {
  const u = await srv.register('Swt');
  const p = await page(u, { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p.goto(srv.base + '/', { waitUntil: 'load' });
  await p.waitForSelector('#cvRoute .cvr-stop.on');
  await sleep(800);
  const cdp = await p.target().createCDPSession();
  const missed = [];
  for (const delay of [0, 30, 50, 50, 70, 100]) {
    const box = await p.evaluate(() => { const r = document.getElementById('cvRoute').getBoundingClientRect(); return { left: r.left, width: r.width, top: r.top }; });
    const y = box.top + 30;
    const touch = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const from = (await p.evaluate(() => location.pathname)) === '/xabarlar' ? 0.7 : 0.3;
    await touch('touchStart', box.left + box.width * from);
    for (let k = 1; k <= 8; k++) { await touch('touchMove', box.left + box.width * (from + (from < 0.5 ? 0.4 : -0.4) * k / 8)); await sleep(20); }
    await touch('touchEnd');
    await sleep(delay);
    await p.tap('#cvRoute .cvr-stop[data-i="4"]');
    const open = await p.waitForFunction(() => document.querySelector('#cvRouteMap .cvr-map-list button') && document.body.classList.contains('mobile-menu-open'), { timeout: 2000 }).then(() => true).catch(() => false);
    if (!open) missed.push(delay);
    else { await p.evaluate(() => window.toggleMobileMenu(false)); await sleep(300); }
  }
  assert.deepEqual(missed, [], "surishdan keyin 'Ko'proq' bosildi");
  // Klaviatura: bekatda Enter — bir marta ochiladi (pointer bosishi bilan ikki marta emas)
  await p.evaluate(() => { window.__sv = 0; const o = window.switchView; window.switchView = function () { window.__sv++; return o.apply(this, arguments); }; });
  await p.focus('#cvRoute .cvr-stop[data-i="2"]');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => location.pathname === '/choyxona', { timeout: 5000 });
  await p.tap('#cvRoute .cvr-stop[data-i="0"]');
  await p.waitForFunction(() => location.pathname === '/', { timeout: 5000 });
  await sleep(300);
  assert.equal(await p.evaluate(() => window.__sv), 2, 'har bosish bitta switchView');
  assert.deepEqual(p.errors, []);
});

test("Telegram kanal: Sayt haqida (taklif + pastki qator) va Sozlamalar → Hisob; yangi tabda, tarjima qilingan, telefonda sig'adi", opts, async () => {
  const u = await srv.register('Tgc');
  for (const [vp, lang] of [[{ width: 1366, height: 860 }, 'uz'], [{ width: 360, height: 740, isMobile: true, hasTouch: true }, 'kk']]) {
    const p = await page(u, vp);
    await p.evaluateOnNewDocument((l) => localStorage.setItem('justChessLang', l), lang);
    await p.goto(srv.base + '/', { waitUntil: 'load' });
    await sleep(800);
    await p.evaluate(() => window.openAboutPage());
    await p.waitForSelector('#aboutPageContent .ab-cta .tg-channel', { timeout: 5000 });
    const links = (sel) => p.evaluate((s) => [...document.querySelectorAll(s)].map((a) => { const r = a.getBoundingClientRect(); return { href: a.href, target: a.target, rel: a.rel, text: a.textContent.trim(), svg: !!a.querySelector('svg'), left: r.left, right: r.right, vw: innerWidth }; }), sel);
    const about = await links('#aboutPageContent .ab-cta .tg-channel, #aboutPageContent .ab-footer .tg-channel');
    assert.equal(about.length, 2, 'taklif va pastki qator');
    const url = await p.evaluate(() => window.TELEGRAM_CHANNEL_URL);
    assert.equal(url, 'https://t.me/chesscaravan');
    const want = lang === 'kk' ? ['Жаңалықтарды Telegram арнамыздан қадағалаңыз', 'Telegram арнасы'] : ['Yangiliklarni Telegram kanalimizda kuzatib boring', 'Telegram kanal'];
    about.forEach((a, i) => {
      assert.deepEqual([a.href, a.target, a.rel, a.svg, a.text], [url, '_blank', 'noopener noreferrer', true, want[i]]);
      assert.ok(a.left >= 0 && a.right <= a.vw + 1, 'ekranda: ' + JSON.stringify(a));
    });
    await p.evaluate(() => window.closeAboutPage ? window.closeAboutPage() : document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    await p.goto(srv.base + '/sozlamalar', { waitUntil: 'load' });
    await p.waitForSelector('.set-nav [data-section="account"]', { timeout: 15000 });
    await p.click('.set-nav [data-section="account"]');
    await p.waitForSelector('.set-legal .tg-channel', { timeout: 5000 });
    const set = await links('.set-legal .tg-channel');
    assert.deepEqual([set.length, set[0].href, set[0].target, set[0].rel, set[0].text], [1, url, '_blank', 'noopener noreferrer', want[1]]);
    assert.ok(set[0].right <= set[0].vw + 1, 'Sozlamalarda ekranda');
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1), true, "gorizontal toshish yo'q");
    assert.deepEqual(p.errors, []);
  }
});

test("5-sinov o'tishi: 45 s chaqiruv '¾+0', PGN TimeControl soniyalarda (eksport/yuklash), sahifaga tegilmaganda tebranish konsolga xato yozmaydi", opts, async () => {
  const H = require('./helpers');
  const a = await srv.register('Clka'), b = await srv.register('Clkb');
  const p = await page(b, { width: 390, height: 844, isMobile: true, hasTouch: true });
  const cons = [];
  p.on('console', (m) => { if (m.type() === 'error') cons.push(m.text()); });
  // Tebranish sahifaning o'z taymeridan (raqib yurishi kabi) — puppeteer evaluate esa foydalanuvchi bosishi hisoblanardi
  await p.evaluateOnNewDocument(() => window.addEventListener('load', () => setTimeout(() => { window.__hasAct = navigator.userActivation.hasBeenActive; window.haptic(30); }, 400)));
  await p.goto(srv.base + '/', { waitUntil: 'load' });
  await sleep(1000);
  assert.equal(await p.evaluate(() => window.__hasAct), false, "sahifaga hali tegilmagan");
  assert.deepEqual(await p.evaluate(() => [window.clockText(45, 0), window.clockText(30, 0), window.clockText(90, 1), window.clockText(180, 2), window.clockText('0.75+0'), window.clockText('10+5'),
    window.pgnTimeControl('3+2'), window.pgnTimeControl('0.75+0'), window.clockFromPgn('180+2'), window.clockFromPgn('45+0'), window.clockFromPgn('3+2'), window.clockFromPgn('-')]),
    ['¾+0', '½+0', '1½+1', '3+2', '¾+0', '10+5', '180+2', '45+0', '3+2', '0.75+0', '3+2', null]);
  // Tebranish: foydalanuvchi sahifaga hali tegmagan — brauzer bloklaydi, konsolga xato yozilmasin
  assert.deepEqual(cons.filter((t) => /vibrate/.test(t)), [], 'tebranish xatosi yo\'q');
  // 45 s chaqiruv oynasida "¾+0"
  const sa = await srv.connect(a);
  sa.emit('challenge-send', { username: b.name, initial: 45, increment: 0, rated: false });
  await p.waitForSelector('[data-accept]', { visible: true, timeout: 8000 });
  assert.match(await p.evaluate(() => document.getElementById('challengeModal').innerText), /¾\+0/);
  sa.close();
  // Qayta ko'rish oynasidan PGN: TimeControl soniyalarda
  const g = await H.startGame(srv, a, b, { initial: 180, increment: 2 });
  await H.play(g, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
  await sleep(500);
  H.closeAll(a, b);
  const hist = await srv.api(b, '/api/users/' + encodeURIComponent(b.name) + '/history');
  await p.evaluate((n, id) => window.openReplay(n, id), b.name, hist.games[0].id);
  await p.waitForSelector('#replayModal .rp-x');
  await sleep(500);
  assert.match(await p.evaluate(() => document.querySelector('#replayModal .rp-meta').textContent), /3\+2/);
  const pgnText = await p.evaluate(() => new Promise((res) => {
    const orig = URL.createObjectURL;
    URL.createObjectURL = (blob) => { blob.text().then(res); URL.createObjectURL = orig; return orig.call(URL, blob); };
    const btn = [...document.querySelectorAll('#replayModal button')].find((x) => /PGN/.test(x.textContent));
    btn.click();
  }));
  assert.match(pgnText, /\[TimeControl "180\+2"\]/);
  assert.deepEqual(p.errors, []);
});

test("6-sinov o'tishi: Choyxonada bosish qayta chizishda yo'qolmaydi, bo'sh stulning ikkalasi ishlaydi; 2 ga 2 da bosib yurish; hikoya Escape bilan yopiladi", opts, async () => {
  const u = await srv.register('Six'), a = await srv.register('Sxa'), b2 = await srv.register('Sxb'), c = await srv.register('Sxc');
  const PHONE = { width: 390, height: 844, isMobile: true, hasTouch: true };
  const p = await page(u, PHONE);
  await p.goto(srv.base + '/choyxona', { waitUntil: 'load' });
  await p.waitForSelector('[data-sit-zone="rapid"]', { timeout: 15000 });
  await sleep(800);
  // Barmoq stulda turganda boshqa o'yinchi stolga o'tiradi (lobbi qayta chiziladi), so'ng qo'yib yuboriladi
  await p.evaluate(() => document.querySelectorAll('[data-sit-zone="rapid"]')[1].scrollIntoView({ block: 'center' }));
  await sleep(300);
  const pt = await p.evaluate(() => { const r = document.querySelectorAll('[data-sit-zone="rapid"]')[1].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const cdp = await p.target().createCDPSession();
  const sa = await srv.connect(a);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] });
  sa.emit('tea-sit', { initial: 180, increment: 0, rated: false, variant: 'standard' });
  await sleep(800);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const opened = await p.waitForFunction(() => { const e = document.getElementById('teaPicker'); return e && !e.hidden; }, { timeout: 3000 }).then(() => true).catch(() => false);
  assert.ok(opened, "qayta chizish paytidagi bosish yo'qolmadi");
  // Boshqa o'yinchining stoli: server xabari band kompyuterda barmoq qo'yib yuborilgandan keyin kelishi mumkin — kutamiz
  assert.ok(await p.waitForSelector('[data-join]', { timeout: 8000 }).then(() => true).catch(() => false), 'kutayotgan stol ham chizildi (kechiktirilgan render)');
  await p.evaluate(() => document.querySelector('#teaPicker [data-close]').click());
  // Bo'sh stolning yuqori stuli ("Bo'sh") ham vaqt tanlashni ochadi
  // Silliq aylanish band kompyuterda sekin — tugashini kutib, keyin bosamiz (bosish eski koordinataga tushmasin)
  await p.evaluate(() => document.querySelector('[data-sit-zone="blitz"]').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await sleep(500);
  assert.equal(await p.evaluate(() => document.querySelectorAll('[data-sit-zone="blitz"]').length), 2);
  let topOk = false;
  for (let k = 0; k < 3 && !topOk; k++) {
    await p.tap('[data-sit-zone="blitz"]');
    topOk = await p.waitForFunction(() => { const e = document.getElementById('teaPicker'); return e && !e.hidden; }, { timeout: 2500 }).then(() => true).catch(() => false);
  }
  assert.ok(topOk, "yuqori stul ham ishlaydi");
  sa.close();
  // 2 ga 2: telefonda bosib yurish
  await p.goto(srv.base + '/jamoa', { waitUntil: 'load' });
  await p.waitForSelector('[data-tc]', { timeout: 15000 });
  await p.tap('[data-tc]');
  await p.waitForFunction(() => /[?&]t=/.test(location.search), { timeout: 8000 });
  const code = await p.evaluate(() => new URLSearchParams(location.search).get('t'));
  await sleep(600);
  if (await p.$('[data-sit="w1"]')) { await p.tap('[data-sit="w1"]'); await sleep(500); }
  const socks = [];
  for (const [usr, seat] of [[a, 'b1'], [b2, 'w2'], [c, 'b2']]) { const s = await srv.connect(usr); socks.push(s); await new Promise((r) => s.emit('team-sit', { code, seat }, r)); }
  await p.waitForFunction(() => /e2/.test(document.querySelector('#teamBoard [data-square="e2"] img') ? 'e2' : ''), { timeout: 10000 });
  // O'yin boshlanganda telefon menyusi ixchamlashadi (sahifa biroz siljiydi) — joylashib bo'lishini kutamiz
  await p.waitForFunction(() => document.documentElement.classList.contains('cvr-compact'), { timeout: 5000 }).catch(() => {});
  await sleep(800);
  await p.evaluate(() => document.getElementById('teamBoard').scrollIntoView({ block: 'center' }));
  await sleep(500);
  await p.tap('#teamBoard [data-square="e2"]');
  await sleep(300);
  assert.deepEqual(await p.evaluate(() => [document.querySelector('#teamBoard [data-square="e2"]').classList.contains('sq-selected'), [...document.querySelectorAll('#teamBoard .sq-hint')].map((e) => e.dataset.square).sort()]), [true, ['e3', 'e4']]);
  await p.tap('#teamBoard [data-square="e4"]');
  await p.waitForFunction(() => /e4/.test((document.getElementById('tmMoves') || {}).textContent || ''), { timeout: 5000 });
  assert.equal(await p.evaluate(() => document.querySelectorAll('#teamBoard .sq-selected, #teamBoard .sq-hint').length), 0, 'tanlov tozalandi');
  socks.forEach((s) => s.close());
  // O'yin hikoyasi Escape bilan yopiladi
  await p.evaluate(() => window.openGameStory({ moves: [{ san: 'e4' }, { san: 'e5' }], analysis: { evals: [20, 30, 25], moves: [], accuracy: { w: 90, b: 90 } }, white: 'A', black: 'B', result: '1/2-1/2', reason: 'agreement' }));
  await p.waitForSelector('#storyModal', { visible: true });
  await p.keyboard.press('Escape');
  await sleep(200);
  assert.equal(await p.$('#storyModal'), null, 'Escape bilan yopildi');
  assert.deepEqual(p.errors, []);
});

test("Shaxmat tarixi muzeyi: Kutubxonadan kirish, manzil, oldin/keyin chizmalari, Shatranj o'ynash, orqaga, italyancha, telefonda sig'adi", opts, async () => {
  const u = await srv.register('Mzy');
  const p = await page(u, { width: 390, height: 844, isMobile: true, hasTouch: true });
  await p.goto(srv.base + '/kutubxona', { waitUntil: 'load' });
  await p.waitForSelector('[data-museum]', { timeout: 15000 });
  await p.click('[data-museum]');
  await p.waitForSelector('.mu-stop');
  const st = await p.evaluate(() => ({
    url: location.pathname + location.search, stops: document.querySelectorAll('.mu-stop').length,
    ferz: document.querySelectorAll('#mu-shatranj .pc-board .mv').length,
    compare: [...document.querySelectorAll('#mu-queen .mu-cmp-pair')].map((r) => [...r.querySelectorAll('.pc-board')].map((b) => b.querySelectorAll('.mv').length)),
    ov: document.documentElement.scrollWidth - innerWidth
  }));
  assert.equal(st.url, '/kutubxona?m=muzey');
  assert.equal(st.stops, 9);
  assert.equal(st.ferz, 4, 'shatranj farzini: 4 diagonal katak');
  assert.deepEqual(st.compare, [[4, 24], [4, 12]], 'farzin 4 → 24, fil 4 → 12 (7×7 chizmada)');
  assert.ok(st.ov <= 1, "gorizontal toshish yo'q: " + st.ov);
  // ▶ Video tugmasi faqat ochiq video bekatida (testda: chaturanga), YouTube havolasi yangi oynada
  await p.waitForSelector('#mu-chaturanga .mu-video', { timeout: 8000 });
  const vid = await p.evaluate(() => ({ n: document.querySelectorAll('.mu-video').length, href: document.querySelector('#mu-chaturanga .mu-video').href, target: document.querySelector('#mu-chaturanga .mu-video').target, rel: document.querySelector('#mu-chaturanga .mu-video').rel }));
  assert.deepEqual(vid, { n: 1, href: 'https://www.youtube.com/shorts/axHTEebW8xo', target: '_blank', rel: 'noopener noreferrer' });
  // Shatranj o'ynash — o'yin sahifasi Shatranj tanlangan holda
  await p.evaluate(() => document.querySelector('[data-mu-play="shatranj"]').click());
  await p.waitForFunction(() => document.querySelector('#gameView.active-view') && document.querySelector('#variantSeg [data-variant="shatranj"].active'), { timeout: 5000 });
  // Orqaga — yana muzey
  await p.goBack();
  await p.waitForFunction(() => location.search === '?m=muzey' && document.querySelector('.mu-stop'), { timeout: 5000 });
  await p.evaluate(() => document.querySelector('[data-mu-back]').click());
  await p.waitForFunction(() => location.pathname === '/kutubxona' && !location.search && document.querySelector('[data-museum]'), { timeout: 5000 });
  // To'g'ridan-to'g'ri havola, italyancha
  const q = await page(u, { width: 1366, height: 860 });
  await q.evaluateOnNewDocument(() => localStorage.setItem('justChessLang', 'it'));
  await q.goto(srv.base + '/kutubxona?m=muzey', { waitUntil: 'load' });
  await q.waitForSelector('.mu-stop', { timeout: 15000 });
  assert.equal(await q.evaluate(() => document.querySelector('.mu-hero h1').textContent), 'Museo della storia degli scacchi');
  assert.match(await q.evaluate(() => document.querySelector('#mu-afrasiab h2').textContent), /Afrasiab/);
  assert.deepEqual([...p.errors, ...q.errors], []);
});

test("YouTube kanal: Sayt haqida (Telegram yonida + pastki qator) va Sozlamalar → Hisob; yangi tabda, tarjima qilingan, telefonda sig'adi", opts, async () => {
  const u = await srv.register('Ytc');
  for (const [vp, lang] of [[{ width: 1366, height: 860 }, 'uz'], [{ width: 360, height: 740, isMobile: true, hasTouch: true }, 'zh']]) {
    const p = await page(u, vp);
    await p.evaluateOnNewDocument((l) => localStorage.setItem('justChessLang', l), lang);
    await p.goto(srv.base + '/', { waitUntil: 'load' });
    await sleep(800);
    await p.evaluate(() => window.openAboutPage());
    await p.waitForSelector('#aboutPageContent .ab-cta .yt-channel', { timeout: 5000 });
    const links = (sel) => p.evaluate((s) => [...document.querySelectorAll(s)].map((a) => { const r = a.getBoundingClientRect(); return { href: a.href, target: a.target, rel: a.rel, text: a.textContent.trim(), svg: !!a.querySelector('svg'), left: r.left, right: r.right, vw: innerWidth }; }), sel);
    const url = await p.evaluate(() => window.YOUTUBE_CHANNEL_URL);
    assert.equal(url, 'https://www.youtube.com/@chesscaravan');
    const want = lang === 'zh' ? ['在我们的 YouTube 频道观看视频', 'YouTube 频道'] : ['Videolarimizni YouTube kanalimizda tomosha qiling', 'YouTube kanal'];
    const about = await links('#aboutPageContent .ab-cta .yt-channel, #aboutPageContent .ab-footer .yt-channel');
    assert.equal(about.length, 2);
    about.forEach((a, i) => {
      assert.deepEqual([a.href, a.target, a.rel, a.svg, a.text], [url, '_blank', 'noopener noreferrer', true, want[i]]);
      assert.ok(a.left >= 0 && a.right <= a.vw + 1, 'ekranda: ' + JSON.stringify(a));
    });
    // Telegram havolasi ham joyida, ikkalasi bir blokda
    assert.equal(await p.evaluate(() => document.querySelectorAll('#aboutPageContent .ab-cta-social a').length), 2);
    await p.goto(srv.base + '/sozlamalar', { waitUntil: 'load' });
    await p.waitForSelector('.set-nav [data-section="account"]', { timeout: 15000 });
    await p.click('.set-nav [data-section="account"]');
    await p.waitForSelector('.set-legal .yt-channel', { timeout: 5000 });
    const set = await links('.set-legal .yt-channel');
    assert.deepEqual([set.length, set[0].href, set[0].target, set[0].rel, set[0].text], [1, url, '_blank', 'noopener noreferrer', want[1]]);
    assert.ok(set[0].right <= set[0].vw + 1);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1), true, "gorizontal toshish yo'q");
    assert.deepEqual(p.errors, []);
  }
});

test("Joylashuv L1: 320 px telefonda sahifalar ekrandan kengaymaydi (Bosh sahifa Top 5, Karvon yetakchilari, Sozlamalar va saqlash paneli, Admin tablari)", opts, async () => {
  const H = require('./helpers');
  const a = await srv.register('Lwa'), b = await srv.register('Lwb');
  await new Promise((resolve, reject) => {
    const d = new (require('sqlite3').Database)(require('path').join(srv.dir, 'test.sqlite'));
    d.run("UPDATE users SET role = 'admin' WHERE id = ?", [a.id], (err) => d.close(() => (err ? reject(err) : resolve())));
  });
  a.user.role = 'admin';
  // Top 5 va karvon yetakchilari bo'sh bo'lmasin
  const g = await H.startGame(srv, a, b);
  await H.play(g, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
  await sleep(400);
  H.closeAll(a, b);
  const p = await page(a, { width: 320, height: 568, isMobile: true, hasTouch: true });
  const widen = () => p.evaluate(() => { const m = document.querySelector('.main-wrapper'); return [m.scrollWidth - m.clientWidth, document.documentElement.scrollWidth - innerWidth]; });
  for (const [route, ready] of [['/', '.tw-card, #playOnlineBtn'], ['/karvon', '.cv-leaders li'], ['/sozlamalar', '#setCountry'], ['/admin', '.adm-tabs button']]) {
    await p.goto(srv.base + route, { waitUntil: 'load' });
    await p.waitForSelector(ready, { timeout: 15000 });
    await sleep(700);
    assert.deepEqual(await widen(), [0, 0], route + ': sahifa 320 px dan kengaymaydi');
  }
  // Saqlash paneli ochiq — ikkala tugma ekranda
  await p.goto(srv.base + '/sozlamalar', { waitUntil: 'load' });
  await p.waitForSelector('.set-nav [data-section="board"]', { timeout: 15000 });
  await p.click('.set-nav [data-section="board"]');
  await p.waitForSelector('[data-piece-set="clear"]');
  await p.click('[data-piece-set="clear"]');
  await p.waitForSelector('.set-bar.show [data-save]');
  await sleep(400);
  const bar = await p.evaluate(() => [...document.querySelectorAll('.set-bar.show button')].map((x) => { const r = x.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; }));
  assert.equal(bar.length, 2);
  bar.forEach(([l, r]) => assert.ok(l >= 0 && r <= 320, "saqlash paneli tugmasi ekranda: " + JSON.stringify(bar)));
  assert.deepEqual(p.errors, []);
});

test("Joylashuv L2: oynalar — yon holatda Choyxona tanlovi sig'adi (✕ ko'rinadi), 320 px da qayta ko'rish tugmalari va profil grafigi tablari kartada", opts, async () => {
  const H = require('./helpers');
  const a = await srv.register('Lda'), b = await srv.register('Ldb');
  const g = await H.startGame(srv, a, b);
  await H.play(g, ['e2e4', 'e7e5', 'g1f3', 'b8c6']);
  await H.finish(g, 'black-resigns');
  await sleep(400);
  H.closeAll(a, b);
  // Yon holat: Choyxona — vaqt tanlash oynasi ekrandan oshmaydi, ✕ ko'rinadi va bosiladi
  const l = await page(a, { width: 568, height: 320, isMobile: true, hasTouch: true, isLandscape: true });
  await l.goto(srv.base + '/choyxona', { waitUntil: 'load' });
  await l.waitForSelector('[data-sit-zone]', { timeout: 15000 });
  await sleep(500);
  await l.evaluate(() => document.querySelector('[data-sit-zone]').click());
  await l.waitForSelector('#teaPicker .tea-picker', { visible: true });
  await sleep(300);
  const tp = await l.evaluate(() => {
    const c = document.querySelector('#teaPicker .tea-picker').getBoundingClientRect();
    const x = document.querySelector('#teaPicker .tea-x').getBoundingClientRect();
    const top = document.elementFromPoint(x.left + x.width / 2, x.top + x.height / 2);
    return { top: c.top, bottom: c.bottom, vh: innerHeight, xTop: x.top, xOk: !!top && !!top.closest('.tea-x') };
  });
  assert.ok(tp.top >= 0 && tp.bottom <= tp.vh + 1, "karta ekranda: " + JSON.stringify(tp));
  assert.ok(tp.xOk && tp.xTop >= 0, "✕ ko'rinadi va bosiladi: " + JSON.stringify(tp));
  // 320 px: qayta ko'rish tugmalari kartadan chiqmaydi
  const p = await page(a, { width: 320, height: 568, isMobile: true, hasTouch: true });
  await p.goto(srv.base + '/', { waitUntil: 'load' });
  await sleep(800);
  const hist = await srv.api(a, '/api/users/' + encodeURIComponent(a.name) + '/history');
  await p.evaluate((n, id) => window.openReplay(n, id), a.name, hist.games[0].id);
  await p.waitForSelector('#replayModal .rp-controls button');
  await sleep(400);
  const rp = await p.evaluate(() => {
    const card = document.querySelector('#replayModal .rp-card').getBoundingClientRect();
    return [...document.querySelectorAll('#replayModal .rp-controls button')].map((x) => x.getBoundingClientRect()).filter((r) => r.right > card.right + 1 || r.left < card.left - 1).length;
  });
  assert.equal(rp, 0, "⏮ ◀ ▶ ⏭ kartada");
  await p.keyboard.press('Escape');
  // 320 px: profil grafigi tablari (5 ta rejim) ekranda
  await p.evaluate((n) => window.openPlayerProfile(n), b.name);
  await p.waitForSelector('#profileChartTabs button', { visible: true, timeout: 10000 });
  await sleep(500);
  const tabs = await p.evaluate(() => [...document.querySelectorAll('#profileChartTabs button')].filter((x) => x.getBoundingClientRect().right > innerWidth + 1).map((x) => x.textContent.trim()));
  assert.deepEqual(tabs, [], 'grafik tablari ekrandan chiqmaydi');
  assert.deepEqual([...l.errors, ...p.errors], []);
});

test("Joylashuv L3: 30 harfli ismlar va katta raqamlar 320 px telefonda sahifani kengaytirmaydi (Jonli o'yinlar, raqiblar statistikasi, Karvon qadamlari)", opts, async () => {
  const H = require('./helpers');
  const reg = async (name) => { const d = await srv.api(null, '/api/auth/register', 'POST', { username: name, email: Math.random().toString(36).slice(2) + '@t.uz', password: 'secret1' }); return { id: d.user.id, name, token: d.token, user: d.user }; };
  const sfx = String(Date.now() % 100000).padStart(5, '0');
  const a = await reg('Aleksandr_Konstantinovich_' + sfx.slice(0, 4)), b = await reg('WWWWWWWWWWWWWWWWWWWWWWWWW' + sfx), c = await reg('Mmmmmmmmmmmmmmmmmmmmmmmmm' + sfx);
  let g = await H.startGame(srv, a, b); await H.play(g, ['f2f3', 'e7e5', 'g2g4', 'd8h4']); await sleep(300);
  g = await H.startGame(srv, a, b); await H.play(g, ['e2e4', 'e7e5']); await H.finish(g, 'black-resigns');
  g = await H.startGame(srv, a, b); await H.play(g, ['d2d4', 'd7d5']); await H.finish(g, 'draw');
  H.closeAll(a, b);
  // Katta qadamlar soni (Karvon) — statistika bazada
  await new Promise((resolve, reject) => {
    const d = new (require('sqlite3').Database)(require('path').join(srv.dir, 'test.sqlite'));
    d.run('UPDATE users SET stats = ? WHERE id = ?', [JSON.stringify({ wins: 12345, losses: 9876, draws: 4321 }), a.id], (err) => d.close(() => (err ? reject(err) : resolve())));
  });
  // Uzun ismli jonli o'yin
  const live = await H.startGame(srv, b, c, { initial: 600, increment: 5 });
  await H.play(live, ['d2d4', 'd7d5']);
  const p = await page(a, { width: 320, height: 568, isMobile: true, hasTouch: true });
  const widen = () => p.evaluate(() => { const m = document.querySelector('.main-wrapper'); return m.scrollWidth - m.clientWidth; });
  for (const [route, ready] of [['/jonli', '.lv-item'], ['/profil?u=' + encodeURIComponent(a.name) + '&b=statistika', '.ex-opps b'], ['/karvon', '.cv-me-pts']]) {
    await p.goto(srv.base + route, { waitUntil: 'load' });
    await p.waitForSelector(ready, { timeout: 15000 });
    await sleep(700);
    assert.equal(await widen(), 0, route + ': sahifa kengaymaydi');
  }
  H.closeAll(b, c);
  assert.deepEqual(p.errors, []);
});

test("Joylashuv L4: 2 ga 2 o'yini 320×568 telefonda — taxta aylantirmasdan ko'rinadi, taklif tugmalari yashirin, menyu ixcham; o'yin tugagach qaytadi", opts, async () => {
  const a = await srv.register('Tpa'), b = await srv.register('Tpb'), c = await srv.register('Tpc'), d = await srv.register('Tpd');
  const p = await page(a, { width: 320, height: 568, isMobile: true, hasTouch: true });
  await p.goto(srv.base + '/jamoa', { waitUntil: 'load' });
  await p.waitForSelector('[data-tc]', { timeout: 15000 });
  await p.evaluate(() => document.querySelector('[data-tc]').click());
  await p.waitForFunction(() => /[?&]t=/.test(location.search), { timeout: 8000 });
  const code = await p.evaluate(() => new URLSearchParams(location.search).get('t'));
  await sleep(500);
  await p.evaluate(() => { const s = document.querySelector('[data-sit="w1"]'); if (s) s.click(); });
  assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('.tm-head-actions')).display !== 'none'), true, "kutilayotganda taklif tugmalari bor");
  const socks = [];
  for (const [u, seat] of [[b, 'b1'], [c, 'w2'], [d, 'b2']]) { const s = await srv.connect(u); socks.push(s); await new Promise((r) => s.emit('team-sit', { code, seat }, r)); }
  await p.waitForFunction(() => document.querySelector('#teamView.tm-playing'), { timeout: 10000 });
  await sleep(800);
  const st = await p.evaluate(() => {
    const r = document.getElementById('teamBoard').getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, vh: innerHeight, actions: getComputedStyle(document.querySelector('.tm-head-actions')).display, compact: document.documentElement.classList.contains('cvr-compact') };
  });
  assert.ok(st.top >= 0 && st.bottom <= st.vh, "taxta ekranda: " + JSON.stringify(st));
  assert.equal(st.actions, 'none');
  assert.equal(st.compact, true, "menyu ixcham");
  // Taslim — o'yin tugadi, menyu qaytadi
  await new Promise((r) => socks[0].emit('team-resign', { code }, r));
  await p.waitForFunction(() => !document.querySelector('#teamView.tm-playing'), { timeout: 8000 });
  await sleep(400);
  assert.equal(await p.evaluate(() => document.documentElement.classList.contains('cvr-compact')), false, "o'yin tugagach menyu qaytdi");
  socks.forEach((s) => s.close());
  assert.deepEqual(p.errors, []);
});

test("Joylashuv L4: kompyuterda (1024×768) 2 ga 2 taxtasi va ikkala jamoa soati ekranda; yon holatdagi telefonda jonli taxta bir ekranga sig'adi", opts, async () => {
  const H = require('./helpers');
  const a = await srv.register('Tda'), b = await srv.register('Tdb'), c = await srv.register('Tdc'), d = await srv.register('Tdd');
  const p = await page(a, { width: 1024, height: 768 });
  await p.goto(srv.base + '/jamoa', { waitUntil: 'load' });
  await p.waitForSelector('[data-tc]', { timeout: 15000 });
  await p.evaluate(() => document.querySelector('[data-tc]').click());
  await p.waitForFunction(() => /[?&]t=/.test(location.search), { timeout: 8000 });
  const code = await p.evaluate(() => new URLSearchParams(location.search).get('t'));
  await sleep(500);
  await p.evaluate(() => { const s = document.querySelector('[data-sit="w1"]'); if (s) s.click(); });
  const socks = [];
  for (const [u, seat] of [[b, 'b1'], [c, 'w2'], [d, 'b2']]) { const s = await srv.connect(u); socks.push(s); await new Promise((r) => s.emit('team-sit', { code, seat }, r)); }
  await p.waitForFunction(() => document.querySelector('#teamView.tm-playing'), { timeout: 10000 });
  await sleep(800);
  const off = await p.evaluate(() => ['#teamBoard', ...[...document.querySelectorAll('#teamView .tm-clock')].map((_, i) => '#teamView .tm-clock:nth-of-type(' + (i + 1) + ')')]
    .map((sel) => [...document.querySelectorAll(sel === '#teamBoard' ? sel : '#teamView .tm-clock')]).flat()
    .filter((el) => { const r = el.getBoundingClientRect(); return r.top < 0 || r.bottom > innerHeight + 1; }).length);
  assert.equal(off, 0, "taxta va soatlar ekranda");
  await new Promise((r) => socks[0].emit('team-resign', { code }, r));
  socks.forEach((s) => s.close());
  // Yon holat: jonli tomosha taxtasi ekran balandligidan oshmaydi
  const e = await srv.register('Tde'), f = await srv.register('Tdf');
  const g = await H.startGame(srv, e, f, { initial: 600, increment: 5 });
  await H.play(g, ['e2e4', 'e7e5']);
  const l = await page(a, { width: 740, height: 360, isMobile: true, hasTouch: true, isLandscape: true });
  await l.goto(srv.base + '/jonli', { waitUntil: 'load' });
  await sleep(800);
  await l.evaluate((rid) => window.watchGame(rid), g.roomId);
  await l.waitForSelector('#liveBoard [data-square="e4"]', { timeout: 10000 });
  await sleep(500);
  const lb = await l.evaluate(() => { const r = document.getElementById('liveBoard').getBoundingClientRect(); return [Math.round(r.height), innerHeight]; });
  assert.ok(lb[0] <= lb[1], "jonli taxta bir ekranga sig'adi: " + JSON.stringify(lb));
  H.closeAll(e, f);
  assert.deepEqual([...p.errors, ...l.errors], []);
});

test("Joylashuv L5: qora donalar to'q katakda ajralib turadi — och hoshiya (Rishton taxtasi + Rishton donalari), oq donalarda yo'q", opts, async () => {
  const u = await srv.register('Hal');
  const p = await page(u);
  await p.evaluateOnNewDocument(() => localStorage.setItem('justChessSettings', JSON.stringify({ boardStyle: 'rishton', pieceSet: 'rishton' })));
  await p.goto(srv.base + '/oyin', { waitUntil: 'load' });
  await p.waitForSelector('#chessBoard img[data-piece="bP"]', { timeout: 15000 });
  const f = await p.evaluate(() => [getComputedStyle(document.querySelector('#chessBoard img[data-piece="bP"]')).filter, getComputedStyle(document.querySelector('#chessBoard img[data-piece="wP"]')).filter, document.documentElement.dataset.board]);
  assert.equal(f[2], 'rishton');
  assert.match(f[0], /drop-shadow/, 'qora donada hoshiya');
  assert.equal(f[1], 'none', "oq donada hoshiya yo'q");
  assert.deepEqual(p.errors, []);
});

test("Joylashuv L5: asosiy rangli tugmalardagi yozuv o'qiladi — kontrast ≥ 4.5:1 (Firuza, Oltin, Nilufar)", opts, async () => {
  const u = await srv.register('Ona');
  for (const theme of ['turquoise', 'gold', 'plum']) {
    const p = await page(u);
    await p.evaluateOnNewDocument((th) => localStorage.setItem('justChessSettings', JSON.stringify({ siteTheme: th })), theme);
    // Har bir tugma/havola yozuvi o'zining HAQIQIY foni (shaffof bo'lsa — ota elementniki) ustida tekshiriladi:
    // 2026-11-03 gacha faqat to'liq rangli tugma tekshirilardi va shaffof .lib-btn.ghost dagi to'q yozuv (1.07:1) o'tib ketgan edi
    for (const route of ['/kutubxona', '/kutubxona?m=muzey']) {
      await p.goto(srv.base + route, { waitUntil: 'load' });
      await p.waitForSelector(route.includes('muzey') ? '.mu-play' : '.lib-btn.ghost', { timeout: 15000 });
      await sleep(500);
      const bad = await p.evaluate(() => {
        const rgb = (c) => (String(c).match(/[\d.]+/g) || [0, 0, 0, 0]).map(Number);
        const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const ratio = (x, y) => { const [a, b] = [lum(x), lum(y)].sort((m, n) => n - m); return (a + 0.05) / (b + 0.05); };
        const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length < 4 || c[3] > 0.5) return c; } return [10, 18, 20]; };
        return [...document.querySelectorAll('.view-section.active-view button, .view-section.active-view a')].filter((el) => el.offsetWidth && el.textContent.trim())
          .map((el) => ({ t: el.textContent.trim().slice(0, 24), r: ratio(rgb(getComputedStyle(el).color), bgOf(el)) })).filter((x) => x.r < 4.5).map((x) => x.t + ' ' + x.r.toFixed(2));
      });
      assert.deepEqual(bad, [], theme + ' ' + route + ': kontrasti past tugmalar');
    }
    assert.deepEqual(p.errors, []);
  }
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
    // Profil ma'lumoti kelganda karta qayta chiziladi — bosish yo'qolsa, oyna chiqmaguncha qayta bosamiz
    await p.waitForFunction(() => {
      if (document.querySelector('#bnPicker .bn-opt')) return true;
      const b = document.querySelector('#profileCaravan .bn-edit');
      if (b) b.click();
      return false;
    }, { polling: 700, timeout: 20000 });
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

test("C4 qulaylik: har sahifada bitta h1, maydonlarning yorlig'i bor, qidiruvda klaviatura fokusi ko'rinadi, ingliz tilida yorliqlar inglizcha", opts, async () => {
  const u = await srv.register('A11y');
  const p = await page(u);
  await p.evaluateOnNewDocument(() => localStorage.setItem('justChessLang', 'en'));
  const h1s = () => p.evaluate(() => [...document.querySelectorAll('h1')].filter((h) => { for (let e = h; e && e !== document.documentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false; } return true; }).map((h) => h.textContent.trim()));
  for (const route of ['/', '/oyin', '/jonli', '/xabarlar', '/klublar', '/ligalar', '/chempionlar', '/reyting', '/kutubxona']) {
    await p.goto(srv.base + route, { waitUntil: 'load' });
    await sleep(1200);
    assert.equal((await h1s()).length, 1, route + ': ' + JSON.stringify(await h1s()));
  }
  // Profil oynasi ochiq — faqat profilning h1 i
  await p.goto(srv.base + '/?profile=' + u.name, { waitUntil: 'load' });
  await p.waitForFunction(() => document.getElementById('profileModal').style.display === 'flex', { timeout: 10000 });
  assert.deepEqual(await h1s(), ['Profile']);
  // Placeholder'li maydonlarda aria-label (tilda)
  await p.goto(srv.base + '/xabarlar', { waitUntil: 'load' });
  await p.waitForSelector('#msgSearchInput', { timeout: 10000 });
  const lbl = await p.evaluate(() => ({ s: document.getElementById('msgSearchInput').getAttribute('aria-label'), b: document.querySelector('#msgSearch button').getAttribute('aria-label') }));
  assert.ok(lbl.s && !/[ʻ'’]/.test(lbl.s.replace(/'s\b/, '')) && /[a-z]/i.test(lbl.s), 'inglizcha yorliq: ' + lbl.s);
  assert.equal(lbl.b, lbl.s);
  await p.goto(srv.base + '/klublar', { waitUntil: 'load' });
  await p.waitForSelector('#clubSearchInput', { timeout: 10000 });
  await sleep(500);
  assert.ok(await p.evaluate(() => document.getElementById('clubSearchInput').getAttribute('aria-label')));
  // Reyting qidiruvi: Tab bilan kelinganda "pill" yorishadi
  await p.goto(srv.base + '/reyting', { waitUntil: 'load' });
  await p.waitForSelector('#lbSearch', { timeout: 10000 });
  await p.focus('#lbSearch');
  const ring = await p.evaluate(() => getComputedStyle(document.getElementById('lbSearch').closest('.lb-search')).boxShadow);
  assert.notEqual(ring, 'none');
  assert.deepEqual(p.errors, []);
});

// C3 (2026-11-02): o'yinni boshlash — B (socket) A ni chaqiradi, A brauzerda qabul qiladi; ranglar tasodifiy
async function browserGame(prefixA, prefixB) {
  const a = await srv.register(prefixA), b = await srv.register(prefixB);
  const p = await page(a);
  await p.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#topSettingsBtn', { visible: true, timeout: 10000 });
  await sleep(1200);
  const sb = await srv.connect(b);
  sb.emit('challenge-send', { username: a.name, initial: 600, increment: 0, rated: false });
  await p.waitForSelector('#challengeModal [data-accept]', { visible: true, timeout: 8000 });
  const found = new Promise((r) => sb.once('match-found', r));
  await p.click('#challengeModal [data-accept]');
  const m = await found;
  await p.waitForFunction(() => window.currentRoomId && window.myColor, { timeout: 8000 });
  return { a, b, p, sb, roomId: m.roomId, aColor: m.color === 'w' ? 'b' : 'w' };
}
const sbMove = (sb, roomId, uci) => new Promise((r) => { sb.emit('make-move', { roomId, move: { from: uci.slice(0, 2), to: uci.slice(2, 4) } }); setTimeout(r, 400); });
const nextOppMove = (sb) => new Promise((r) => sb.once('opponent-move', r));

test("O'yin davomida sahifa yangilansa: o'yin tiklanadi (yurishlar, rang, xona), raqibga opponent-back, o'yin davom etadi", opts, async () => {
  const { p, sb, roomId, aColor } = await browserGame('RlA', 'RlB');
  if (aColor === 'b') await sbMove(sb, roomId, 'e2e4');
  else { const got = nextOppMove(sb); await p.click('#chessBoard [data-square="e2"]'); await p.click('#chessBoard [data-square="e4"]'); await got; }
  await p.waitForSelector('#chessBoard [data-square="e4"] img', { timeout: 5000 });
  const back = new Promise((r) => sb.once('opponent-back', r));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction((rid) => window.currentRoomId === rid && document.querySelector('#gameView.active-view') && document.querySelector('#chessBoard [data-square="e4"] img'), { timeout: 15000 }, roomId);
  await back;
  assert.equal(await p.evaluate(() => window.myColor), aColor);
  assert.equal(await p.evaluate(() => document.querySelector('#chessBoard [data-square="e2"] img')), null, 'e2 bo\'sh — yurish tiklangan');
  // O'yin davom etadi: navbatdagi yurish o'tadi
  if (aColor === 'b') { const got = nextOppMove(sb); await p.click('#chessBoard [data-square="e7"]'); await p.click('#chessBoard [data-square="e5"]'); await got; }
  else { await sbMove(sb, roomId, 'e7e5'); await p.waitForSelector('#chessBoard [data-square="e5"] img', { timeout: 5000 }); }
  sb.disconnect();
  assert.deepEqual(p.errors, []);
});

test("Premove: raqib navbatida qo'yilgan yurish raqib yurgach darhol serverga ketadi", opts, async () => {
  const { p, sb, roomId, aColor } = await browserGame('PmA', 'PmB');
  if (aColor === 'w') { const got = nextOppMove(sb); await p.click('#chessBoard [data-square="e2"]'); await p.click('#chessBoard [data-square="e4"]'); await got; }
  // Endi navbat B da: A oldindan yuradi
  const [from, to, oppMove] = aColor === 'w' ? ['d2', 'd4', 'e7e5'] : ['e7', 'e5', 'e2e4'];
  await p.click(`#chessBoard [data-square="${from}"]`);
  await p.click(`#chessBoard [data-square="${to}"]`);
  await p.waitForSelector('#chessBoard .sq-premove', { timeout: 3000 });
  const got = nextOppMove(sb);
  await sbMove(sb, roomId, oppMove);
  const mv = await got;
  const m = mv.move || mv;
  assert.equal(m.from + m.to, from + to, 'premove bajarildi');
  await p.waitForSelector(`#chessBoard [data-square="${to}"] img`, { timeout: 5000 });
  assert.equal(await p.evaluate(() => document.querySelectorAll('#chessBoard .sq-premove').length), 0);
  sb.disconnect();
  assert.deepEqual(p.errors, []);
});

test("PGN yuklash: matn qo'yilib o'yin qayta ko'rish oynasida ochiladi, yurishlar va natija bilan; buzuq PGN rad etiladi", opts, async () => {
  const u = await srv.register('PgnIm');
  const p = await page(u);
  await p.goto(srv.base + '/tarix?u=' + u.name, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof window.openPgnImport === 'function', { timeout: 10000 });
  await sleep(800);
  await p.evaluate(() => window.openPgnImport());
  await p.waitForSelector('#pgnText', { visible: true });
  await p.type('#pgnText', 'salom dunyo');
  await p.click('[data-open]');
  await sleep(400);
  assert.ok(await p.$('#pgnText'), "buzuq PGN — oyna yopilmaydi");
  await p.evaluate(() => { document.getElementById('pgnText').value = '[White "Morphy"]\n[Black "Duke Karl"]\n[Result "1-0"]\n[TimeControl "180+2"]\n\n1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0'; });
  await p.click('[data-open]');
  await p.waitForSelector('#replayModal [data-ply="33"]', { timeout: 8000 });
  const st = await p.evaluate(() => ({ plies: document.querySelectorAll('#replayModal [data-ply]').length, text: document.getElementById('replayModal').textContent }));
  assert.equal(st.plies, 33);
  assert.match(st.text, /Morphy/);
  assert.match(st.text, /Duke Karl/);
  assert.deepEqual(p.errors, []);
});

test("Chiqish: Sozlamalar → Hisob → Chiqish — sessiya tozalanadi, kirish sahifasi chiqadi", opts, async () => {
  const u = await srv.register('LgOut');
  const p = await page(u);
  await p.goto(srv.base + '/sozlamalar', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#settingsRoot [data-section="account"]', { visible: true, timeout: 10000 });
  await p.click('#settingsRoot [data-section="account"]');
  await p.waitForSelector('#settingsRoot [data-logout]', { visible: true });
  await p.click('#settingsRoot [data-logout]');
  await p.waitForFunction(() => document.body.classList.contains('auth-locked'), { timeout: 8000 });
  const st = await p.evaluate(() => ({ token: localStorage.getItem('justChessAuthToken'), user: localStorage.getItem('justChessCurrentUser'), cur: window.currentUser }));
  assert.equal(st.token, null);
  assert.equal(st.user, null);
  assert.equal(st.cur, null);
  assert.deepEqual(p.errors, []);
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

test("O'yin hikoyasini tinglash: bosqichlar navbat bilan o'qiladi (yurishlar so'z bilan), o'qilayotgani ajratiladi va taxtada ochiladi; ovoz yo'q bo'lsa tugma o'chiq", opts, async () => {
  const u = await srv.register('Listen');
  const p = await page(u);
  // Soxta speechSynthesis: o'zbekcha ovoz bor, o'qilgan matnlar yoziladi, har bosqich darhol tugaydi
  await p.evaluateOnNewDocument(() => {
    window.__spoken = [];
    window.__voices = [{ lang: 'uz-UZ', name: 'Test Madina' }];
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    const synth = { speaking: false, getVoices: () => window.__voices, cancel() { window.__cancelled = (window.__cancelled || 0) + 1; }, addEventListener() {},
      speak(u) { window.__spoken.push({ text: u.text, lang: u.lang }); setTimeout(() => u.onend && u.onend(), 30); } };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  });
  await p.goto(srv.base + '/oyin', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#btnLocalGame', { visible: true, timeout: 10000 });
  await sleep(600);
  await p.click('#btnLocalGame');
  await sleep(300);
  await p.evaluate(() => { for (const [f, t] of [['e2', 'e4'], ['e7', 'e5'], ['f1', 'c4'], ['b8', 'c6'], ['d1', 'h5'], ['g8', 'f6'], ['h5', 'f7']]) window.executeMove(f, t); });
  await sleep(600);
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
  await p.waitForSelector('#storyModal [data-st-listen]:not([disabled])', { visible: true, timeout: 5000 });
  const n = await p.evaluate(() => document.querySelectorAll('#storyModal .st-ch').length);
  // Taxtada qaysi pozitsiyalar ochilganini yozib boramiz
  await p.evaluate(() => { window.__plies = []; const orig = window.reviewMove; window.reviewMove = (x) => { window.__plies.push(x); return orig(x); }; });
  await p.click('#storyModal [data-st-listen]');
  await p.waitForFunction((k) => window.__spoken.length >= k + 1 && !/⏹/.test(document.querySelector('#storyModal [data-st-listen]').textContent), { timeout: 8000 }, n);
  const sp = await p.evaluate(() => window.__spoken);
  assert.equal(sp.length, n + 1, 'sarlavha + har bosqich');
  assert.ok(sp.every((s) => s.lang === 'uz-UZ'));
  const all = sp.map((s) => s.text).join(' | ');
  assert.doesNotMatch(all, /Qxf7|Nf6|\(\)|\?\?|[\u{1F300}-\u{1FAFF}]/u, "yurish yozuvi, baho belgisi va emoji o'qilmaydi: " + all);
  assert.match(all, /farzin oladi f 7, mat!/, 'Qxf7# — «farzin oladi f 7, mat!»');
  // O'qish davomida bosqichlar navbat bilan taxtada ochilgan (3... Nf6 → 6-yarim yurish, 4. Qxf7# → 7)
  const plies = await p.evaluate(() => window.__plies);
  assert.ok(plies.includes(6) && plies.includes(7), 'taxtada ochilgan pozitsiyalar: ' + plies);
  assert.deepEqual(plies, [...plies].sort((a, b) => a - b), 'tartib bilan');
  // Yopilganda ovoz to'xtaydi
  await p.keyboard.press('Escape');
  assert.ok(await p.evaluate(() => window.__cancelled >= 1));
  // Ovoz yo'q (masalan, o'zbekcha ovozsiz brauzer) — tugma o'chiq va izohli
  await p.evaluate(() => { window.__voices = [{ lang: 'en-US', name: 'Eng' }]; });
  await p.click('#pgAnalysisBox .an-story');
  await p.waitForSelector('#storyModal [data-st-listen]', { visible: true, timeout: 5000 });
  const off = await p.evaluate(() => { const b = document.querySelector('#storyModal [data-st-listen]'); return { d: b.disabled, t: b.title }; });
  assert.equal(off.d, true);
  assert.match(off.t, /ovoz/i);
  assert.deepEqual(p.errors, []);
});

test("Tahlil keshi: qayta ko'rishda tahlil qilingan o'yin qayta tahlil qilinmaydi (keshdan darhol), hikoya va ulashish oynasi qayta ko'rish ustida ochiladi", opts, async () => {
  const u = await srv.register('AnCache');
  const p = await page(u);
  await p.goto(srv.base + '/tarix?u=' + u.name, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof window.showReplayGame === 'function' && typeof window.analyzeLine === 'function', { timeout: 15000 });
  await sleep(600);
  const game = { id: null, player: u.name, opponent: 'Raqib', color: 'b', result: 'win', reason: 'checkmate', moves: ['f3', 'e5', 'g4', 'Qh4#'], variant: 'standard' };
  await p.evaluate((g) => window.showReplayGame(g), game);
  await p.waitForSelector('#replayModal [data-analyze]', { visible: true, timeout: 8000 });
  // 1-marta: haqiqiy Stockfish bilan tahlil
  await p.click('#replayModal [data-analyze]');
  await p.waitForSelector('#replayModal .an-summary', { timeout: 60000 });
  const cache = await p.evaluate(() => JSON.parse(localStorage.getItem('justChessAnalysisCache') || '[]'));
  assert.equal(cache.length, 1, "tahlil keshga yozildi");
  assert.equal(cache[0].e.length, 5, '4 yurish → 5 pozitsiya bahosi');
  // Keshdagi baholarni ataylab o'zgartiramiz: keyingi safar shu (soxta) natija chiqsa — dvigatel ishlamagan, kesh ishlatilgan
  await p.evaluate(() => {
    const c = JSON.parse(localStorage.getItem('justChessAnalysisCache'));
    c[0].e = c[0].e.map((x) => (x.terminal ? x : { cp: 0, mate: null, best: null }));
    localStorage.setItem('justChessAnalysisCache', JSON.stringify(c));
  });
  await p.click('#replayModal .rp-close, #replayModal [data-close], #replayModal .ch-x').catch(() => p.keyboard.press('Escape'));
  await sleep(300);
  if (await p.$('#replayModal')) { await p.keyboard.press('Escape'); await sleep(300); }
  // 2-marta: ochilishi bilanoq, "Tahlil" bosilmasdan, keshdan
  const t0 = Date.now();
  await p.evaluate((g) => window.showReplayGame(g), game);
  await p.waitForSelector('#replayModal .an-summary', { timeout: 3000 });
  assert.ok(Date.now() - t0 < 3000, 'darhol');
  const acc = await p.evaluate(() => [...document.querySelectorAll('#replayModal .an-side-head b')].map((b) => b.textContent));
  assert.deepEqual(acc, ['100%', '100%'], "keshdagi (o'zgartirilgan) baholar ishlatildi — qayta tahlil qilinmadi: " + acc);
  // Hikoya oynasi qayta ko'rish oynasining USTIDA (avval ortida ochilardi)
  await p.click('#replayModal [data-story]');
  await p.waitForSelector('#storyModal .st-card', { visible: true, timeout: 5000 });
  const top = await p.evaluate(() => {
    const card = document.querySelector('#storyModal .st-card').getBoundingClientRect();
    const hit = document.elementFromPoint(card.left + card.width / 2, card.top + 20);
    return { onTop: !!(hit && hit.closest('#storyModal')), z: [getComputedStyle(document.getElementById('storyModal')).zIndex, getComputedStyle(document.querySelector('.rp-overlay')).zIndex].map(Number) };
  });
  assert.ok(top.onTop && top.z[0] > top.z[1], 'hikoya qayta ko\'rish ustida: ' + JSON.stringify(top));
  await p.keyboard.press('Escape');
  await sleep(200);
  // Ulashish oynasi ham ustida
  if (await p.$('#replayModal [data-share-game]')) {
    await p.click('#replayModal [data-share-game]');
    await p.waitForSelector('.inv-modal.sh-modal', { visible: true, timeout: 5000 });
    const z = await p.evaluate(() => [getComputedStyle(document.querySelector('.inv-modal.sh-modal')).zIndex, getComputedStyle(document.querySelector('.rp-overlay')).zIndex].map(Number));
    assert.ok(z[0] > z[1], 'ulashish qayta ko\'rish ustida: ' + z);
  }
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
    await clickFresh(p, '#profAchBtn');
    await p.waitForSelector('#profsecView.active-view #profAchPanel:not([hidden])', { timeout: 8000 });
    await p.waitForSelector('#profAchievements .ach-item', { timeout: 8000 });
    await sleep(200);
    const st = await p.evaluate(() => ({ url: location.pathname + location.search, modal: document.getElementById('profileModal').style.display, others: ['profExtPanel', 'profOpenPanel', 'profBadgePanel'].map((id) => document.getElementById(id).hidden) }));
    assert.equal(st.url, '/profil?u=' + encodeURIComponent(u.name) + '&b=yutuqlar');
    assert.notEqual(st.modal, 'flex', 'profil oynasi yopiladi');
    assert.deepEqual(st.others, [true, true, true]);
    if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/sect-ach-' + (vp ? 'phone' : 'pc') + '.png' });
    await clickFresh(p, '#psHead [data-ps-back]');
    await p.waitForFunction(() => document.getElementById('profileModal').style.display === 'flex', { timeout: 8000 });
    // Barcha o'yinlar ham — ← Orqaga bilan
    await p.evaluate(() => window.openGameHistory(window.currentProfileUser()));
    await p.waitForSelector('#historyRoot [data-gh-back]', { visible: true, timeout: 8000 });
    await clickFresh(p, '#historyRoot [data-gh-back]');
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
  await p.goto(srv.base + '/', { waitUntil: 'load' });
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
  await p.goto(srv.base + '/', { waitUntil: 'load' });
  await sleep(1000);
  const r = await p.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    nav: [...document.querySelectorAll('#cvRoute .cvr-stop')].filter((e) => e.getBoundingClientRect().width > 0).length
  }));
  assert.ok(r.sw <= 390, 'kenglik ' + r.sw);
  assert.equal(r.nav, 5);
  assert.deepEqual(p.errors, []);
});

test("Telefon: Karvon yo'li menyusi — bekatlar, tuya yuradi, 'Barcha bo'limlar' xaritasi, kompyuterda yo'q", opts, async () => {
  const u = await srv.register('Urt');
  const p = await page(u, { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p.goto(srv.base + '/', { waitUntil: 'load' });
  await p.waitForSelector('#cvRoute .cvr-stop.on');
  const camelX = () => p.evaluate(() => document.querySelector('#cvRoute .cvr-camel').getBoundingClientRect().left);
  const st0 = await p.evaluate(() => ({ menu: getComputedStyle(document.querySelector('.menu-list')).display, on: document.querySelector('#cvRoute .cvr-stop.on').dataset.i, labels: [...document.querySelectorAll('#cvRoute .cvr-label')].map((l) => l.textContent) }));
  assert.equal(st0.menu, 'none', 'eski pastki menyu yashirin');
  assert.equal(st0.on, '0');
  assert.ok(st0.labels.every(Boolean), JSON.stringify(st0.labels));
  const x0 = await camelX();
  // O'yin bekati — sahifa ochiladi, tuya o'ngga yuradi
  await p.tap('#cvRoute .cvr-stop[data-i="1"]');
  await p.waitForFunction((x) => location.pathname === '/oyin' && !document.querySelector('#cvRoute .cvr-camel.walking') && document.querySelector('#cvRoute .cvr-camel').getBoundingClientRect().left > x + 40, { timeout: 8000 }, x0).catch(() => {});
  assert.equal(await p.evaluate(() => location.pathname), '/oyin');
  assert.equal(await p.evaluate(() => document.querySelector('#cvRoute .cvr-stop.on').dataset.i), '1');
  assert.ok((await camelX()) > x0 + 40, 'tuya yurdi');
  // Barmoq bilan surish: Xabarlar bekatigacha
  const box = await p.evaluate(() => { const r = document.getElementById('cvRoute').getBoundingClientRect(); return { left: r.left, width: r.width, top: r.top }; });
  const y = box.top + 30;
  const cdp = await p.target().createCDPSession();
  const touch = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', box.left + box.width * 0.3);
  for (let k = 1; k <= 8; k++) { await touch('touchMove', box.left + box.width * (0.3 + 0.4 * k / 8)); await sleep(20); }
  await touch('touchEnd');
  await p.waitForFunction(() => location.pathname === '/xabarlar', { timeout: 8000 }).catch(() => {});
  assert.equal(await p.evaluate(() => location.pathname), '/xabarlar', 'surib Xabarlar ochildi');
  // 5-bekat: Barcha bo'limlar xaritasi → Reyting; 5-bekat endi shu bo'lim nomi bilan
  await p.tap('#cvRoute .cvr-stop[data-i="4"]');
  await p.waitForSelector('#cvRouteMap .cvr-map-list button');
  const stops = await p.evaluate(() => [...document.querySelectorAll('#cvRouteMap [data-cvr-go]')].map((b) => b.dataset.cvrGo));
  assert.ok(stops.includes('navLeaderboard') && stops.includes('navLibrary') && !stops.includes('navAdmin'), stops.join(','));
  await p.tap('#cvRouteMap [data-cvr-go="navLeaderboard"]');
  await p.waitForFunction(() => location.pathname === '/reyting' && !document.body.classList.contains('mobile-menu-open'), { timeout: 8000 }).catch(() => {});
  await sleep(200);
  assert.equal(await p.evaluate(() => location.pathname), '/reyting');
  const st1 = await p.evaluate(() => ({ open: document.body.classList.contains('mobile-menu-open'), on: document.querySelector('#cvRoute .cvr-stop.on').dataset.i, label: document.querySelector('#cvRoute .cvr-stop[data-i="4"] .cvr-label').textContent, ref: document.querySelector('#navLeaderboard span:not(.icon)').textContent }));
  assert.deepEqual([st1.open, st1.on, st1.label], [false, '4', st1.ref]);
  // Pastga aylantirilganda sarlavha va ⚙️/🔔 yashirinadi, yo'l ixchamlashadi; tepaga — qaytadi; sarlavha ostida atlas lentasi
  await p.goto(srv.base + '/kutubxona', { waitUntil: 'load' });
  await p.waitForSelector('.lib-card, .lib-shelf, #libraryRoot *', { timeout: 15000 });
  await sleep(600);
  assert.match(await p.evaluate(() => getComputedStyle(document.querySelector('sidebar'), '::after').backgroundImage), /atlas.svg/);
  for (let yy = 100; yy <= 700; yy += 100) { await p.evaluate((v) => { document.querySelector('.main-wrapper').scrollTop = v; }, yy); await sleep(60); }
  await p.waitForFunction(() => window.cvRoute.state().compact && document.querySelector('sidebar').getBoundingClientRect().bottom <= 1 && getComputedStyle(document.querySelector('.nf-wrap')).opacity === '0', { timeout: 8000 }).catch(() => {});
  const down = await p.evaluate(() => ({ c: window.cvRoute.state().compact, head: document.querySelector('sidebar').getBoundingClientRect().bottom, bell: getComputedStyle(document.querySelector('.nf-wrap')).opacity }));
  assert.deepEqual([down.c, down.head <= 1, down.bell], [true, true, '0'], JSON.stringify(down));
  await p.evaluate(() => { document.querySelector('.main-wrapper').scrollTop = 400; });
  await p.waitForFunction(() => window.cvRoute.state().compact === false, { timeout: 8000 }).catch(() => {});
  assert.equal(await p.evaluate(() => window.cvRoute.state().compact), false);
  // Tekshiruv (2026-10-30): '99+' nishoni ham ko'rinadi; yozish paytida yo'l yashirinadi; pastki panel yo'l ustida;
  // tebranish faqat foydalanuvchi bekat tanlaganda (sahifa o'zi almashganda emas)
  await p.evaluate(() => { const n = document.getElementById('navMessages'); const b = document.createElement('span'); b.className = 'lg-nav-badge'; b.textContent = '99+'; n.appendChild(b); });
  await sleep(200);
  assert.equal(await p.evaluate(() => { const b = document.querySelector('#cvRoute .cvr-stop[data-i="3"] .cvr-badge'); return b.hidden ? '' : b.textContent; }), '99+');
  await p.evaluate(() => document.querySelector('#navMessages .lg-nav-badge').remove());
  await p.evaluate(() => { window.__vib = 0; navigator.vibrate = () => { window.__vib++; return true; }; });
  await p.evaluate(() => window.switchView('tea'));
  await sleep(1000);
  assert.equal(await p.evaluate(() => window.__vib), 0, "sahifa o'zi almashganda tebranmaydi");
  await p.tap('#cvRoute .cvr-stop[data-i="0"]');
  await p.waitForFunction(() => window.__vib >= 1, { timeout: 8000 }).catch(() => {});
  await sleep(300);
  assert.equal(await p.evaluate(() => window.__vib), 1, 'bekat bosilganda bir marta');
  await p.goto(srv.base + '/xabarlar', { waitUntil: 'load' });
  await p.waitForSelector('#messagesRoot input[type="text"], #messagesRoot input:not([type])', { timeout: 15000 });
  await p.focus('#messagesRoot input[type="text"], #messagesRoot input:not([type])');
  await p.waitForFunction(() => document.getElementById('cvRoute').getBoundingClientRect().top >= innerHeight - 2, { timeout: 8000 }).catch(() => {});
  assert.equal(await p.evaluate(() => document.getElementById('cvRoute').getBoundingClientRect().top >= innerHeight - 2), true, "yozishda yo'l yashirin");
  await p.evaluate(() => document.activeElement.blur());
  await sleep(500);
  assert.equal(await p.evaluate(() => document.documentElement.classList.contains('cvr-typing')), false);
  await p.goto(srv.base + '/sozlamalar', { waitUntil: 'load' });
  await p.waitForSelector('.set-nav [data-section="board"]', { timeout: 15000 });
  await p.click('.set-nav [data-section="board"]');
  await p.waitForSelector('[data-piece-set="clear"]');
  await p.click('[data-piece-set="clear"]');
  await p.waitForFunction(() => { const b = document.querySelector('.set-bar.show'); return b && b.getBoundingClientRect().bottom <= document.getElementById('cvRoute').getBoundingClientRect().top - 8; }, { timeout: 8000 }).catch(() => {});
  const bar = await p.evaluate(() => [document.querySelector('.set-bar.show').getBoundingClientRect().bottom, document.getElementById('cvRoute').getBoundingClientRect().top]);
  // Panel yo'lni yopmasin (8 px zaxira). Yo'l oddiy holatda (CI) oraliq 16 px, ixcham holatda (sahifa aylansa) 38 px — ikkalasi to'g'ri;
  // 2026-11-04 gacha 20 px talab qilinardi va CI da yo'l ixchamga o'tmaganda yiqilardi
  assert.ok(bar[0] <= bar[1] - 8, "saqlash paneli yo'l ustida: " + JSON.stringify(bar));
  await p.evaluate(() => { const c = document.querySelector('[data-cancel], .set-bar button'); if (c) c.click(); });
  // Menyuda bandi yo'q sahifa — 5-bekat o'sha sahifa nomi bilan
  await p.goto(srv.base + '/sozlamalar', { waitUntil: 'load' });
  await p.waitForSelector('#settingsRoot .set-nav', { timeout: 15000 });
  await sleep(400);
  assert.deepEqual(await p.evaluate(() => [document.querySelector('#cvRoute .cvr-stop.on').dataset.i, document.querySelector('#cvRoute .cvr-stop[data-i="4"] .cvr-ico').textContent]), ['4', '⚙️']);
  // O'yin paytida — ixcham (sarlavha yashirin), o'yin tugagach qaytadi
  await p.goto(srv.base + '/oyin', { waitUntil: 'load' });
  await p.waitForSelector('#btnLocalGame', { timeout: 15000 });
  await sleep(400);
  assert.equal(await p.evaluate(() => window.cvRoute.state().compact), false);
  await p.evaluate(() => window.startLocalGame());
  await sleep(500);
  await p.evaluate(() => window.setGamePanelMode && window.setGamePanelMode('in'));
  await sleep(450);
  assert.equal(await p.evaluate(() => window.cvRoute.state().compact), true, "o'yin paytida ixcham");
  await p.evaluate(() => window.setGamePanelMode('over'));
  await sleep(450);
  assert.equal(await p.evaluate(() => window.cvRoute.state().compact), false, "o'yin tugagach qaytadi");
  // Karvon yo'li sahifasining o'z yo'li (.cv-route) yashirinib qolmaydi
  await p.goto(srv.base + '/karvon', { waitUntil: 'load' });
  await p.waitForSelector('.cv-route', { visible: true, timeout: 15000 });
  // Kompyuterda — oddiy yon menyu
  const d = await page(u, { width: 1280, height: 800 });
  await d.goto(srv.base + '/', { waitUntil: 'load' });
  await sleep(800);
  assert.deepEqual(await d.evaluate(() => [getComputedStyle(document.getElementById('cvRoute') || document.body).display === 'none' || !document.getElementById('cvRoute'), getComputedStyle(document.querySelector('.menu-list')).display !== 'none']), [true, true]);
  assert.deepEqual([...p.errors, ...d.errors], []);
});

test("Brauzer xatosi admin panelidagi Xatolar bo'limida ko'rinadi", opts, async () => {
  const u = await srv.register('Ua');
  await new Promise((resolve, reject) => {
    const d = new (require('sqlite3').Database)(require('path').join(srv.dir, 'test.sqlite'));
    d.run("UPDATE users SET role = 'admin' WHERE id = ?", [u.id], (err) => d.close(() => (err ? reject(err) : resolve())));
  });
  u.user.role = 'admin';
  const p = await page(u);
  await p.goto(srv.base + '/', { waitUntil: 'load' });
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
  // Admin paneli statistika kelgach qayta chiziladi — topilgan tugma eskirib qolishi mumkin ("Node is detached"), shuning uchun
  // har urinishda yangidan topib bosamiz, forma chiqquncha
  await p.waitForFunction(() => { if (document.querySelector('#admLibForm [data-lf="title"]')) return true; const b = document.querySelector('#adminRoot [data-atab="library"]'); if (b) b.click(); return false; }, { polling: 300, timeout: 15000 });
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

test("Ўзбекча (кирилл): menyu, kutubxona va sozlamalar kirillda; tanlovda bor; huquqiy sahifa ham", opts, async () => {
  const u = await srv.register('Kiril');
  const p = await page(u);
  await p.evaluateOnNewDocument(() => localStorage.setItem('justChessLang', 'uzc'));
  await p.goto(srv.base + '/kutubxona?m=fork', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#libraryRoot .lib-article h1', { timeout: 15000 });
  await sleep(800);
  const st = await p.evaluate(() => ({ home: document.querySelector('#navHome span:not(.icon)').textContent.trim(), lib: document.querySelector('#navLibrary span:not(.icon)').textContent.trim(),
    h1: document.querySelector('#libraryRoot .lib-article h1').textContent, ex: document.querySelector('.lib-example figcaption').textContent }));
  assert.equal(st.lib, 'Кутубхона');
  assert.match(st.home, /^[А-Яа-яЎўҚқҒғҲҳЁё ]+$/, 'menyu kirillda: ' + st.home);
  assert.equal(st.h1, 'Тактика: вилка');
  assert.match(st.ex, /Nc7\+/, "shaxmat yozuvi o'zgarmaydi");
  if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/uzc-library.png' });
  // Sozlamalar: Ўзбекча tanlangan
  await p.goto(srv.base + '/sozlamalar', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.set-lang[data-lang="uzc"]', { timeout: 15000 });
  assert.equal(await p.evaluate(() => document.querySelector('.set-lang[data-lang="uzc"]').classList.contains('active')), true);
  // Huquqiy sahifa ?lang=uzc
  await p.goto(srv.base + '/maxfiylik?lang=uzc', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => /Махфийлик/.test(document.body.textContent), { timeout: 10000 });
  assert.deepEqual(p.errors, []);
});

test("Türkçe: menyu, kutubxona, Karvon yo'li va sozlamalar turkchada; huquqiy sahifa ham", opts, async () => {
  const u = await srv.register('Turk');
  const p = await page(u);
  await p.evaluateOnNewDocument(() => localStorage.setItem('justChessLang', 'tr'));
  await p.goto(srv.base + '/kutubxona?m=fork', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#libraryRoot .lib-article h1', { timeout: 15000 });
  await sleep(800);
  const st = await p.evaluate(() => ({ home: document.querySelector('#navHome span:not(.icon)').textContent.trim(), lib: document.querySelector('#navLibrary span:not(.icon)').textContent.trim(),
    h1: document.querySelector('#libraryRoot .lib-article h1').textContent }));
  assert.equal(st.home, 'Ana sayfa');
  assert.equal(st.lib, 'Kütüphane');
  assert.equal(st.h1, 'Taktik: çatal');
  if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/tr-library.png' });
  await p.goto(srv.base + '/karvon', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => /Kervan Yolu/.test(document.getElementById('caravanRoot').textContent) && /İstanbul/.test(document.getElementById('caravanRoot').textContent), { timeout: 15000 });
  await p.goto(srv.base + '/sozlamalar', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.set-lang[data-lang="tr"]', { timeout: 15000 });
  assert.equal(await p.evaluate(() => document.querySelector('.set-lang[data-lang="tr"]').classList.contains('active')), true);
  await p.goto(srv.base + '/maxfiylik?lang=tr', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => /Gizlilik Politikası/.test(document.body.textContent), { timeout: 10000 });
  assert.deepEqual(p.errors, []);
});

test("Қазақша: menyu, kutubxona va sozlamalar qozoqchada; huquqiy sahifa ham", opts, async () => {
  const u = await srv.register('Qazaq');
  const p = await page(u);
  await p.evaluateOnNewDocument(() => localStorage.setItem('justChessLang', 'kk'));
  await p.goto(srv.base + '/kutubxona?m=fork', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#libraryRoot .lib-article h1', { timeout: 15000 });
  await sleep(800);
  const st = await p.evaluate(() => ({ home: document.querySelector('#navHome span:not(.icon)').textContent.trim(), lib: document.querySelector('#navLibrary span:not(.icon)').textContent.trim(),
    h1: document.querySelector('#libraryRoot .lib-article h1').textContent }));
  assert.equal(st.home, 'Басты бет');
  assert.equal(st.lib, 'Кітапхана');
  assert.equal(st.h1, 'Тактика: шанышқы');
  if (process.env.UI_SHOTS) await p.screenshot({ path: process.env.UI_SHOTS + '/kk-library.png' });
  await p.goto(srv.base + '/sozlamalar', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.set-lang[data-lang="kk"]', { timeout: 15000 });
  assert.equal(await p.evaluate(() => document.querySelector('.set-lang[data-lang="kk"]').classList.contains('active')), true);
  await p.goto(srv.base + '/maxfiylik?lang=kk', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => /Құпиялылық саясаты/.test(document.body.textContent), { timeout: 10000 });
  assert.deepEqual(p.errors, []);
});

test("Тоҷикӣ, Кыргызча, Türkmençe, Azərbaycanca: menyu va kutubxona shu tillarda, sozlamalarda tanlangan", opts, async () => {
  const u = await srv.register('Tillar4');
  const want = { tg: ['Саҳифаи асосӣ', 'Тактика: чангак'], ky: ['Башкы бет', 'Тактика: айры'], tk: ['Baş sahypa', 'Taktika: çeňňek'], az: ['Ana səhifə', 'Taktika: çəngəl'] };
  for (const l of Object.keys(want)) {
    const p = await page(u);
    await p.evaluateOnNewDocument((lang) => localStorage.setItem('justChessLang', lang), l);
    await p.goto(srv.base + '/kutubxona?m=fork', { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#libraryRoot .lib-article h1', { timeout: 15000 });
    await sleep(500);
    const st = await p.evaluate(() => ({ home: document.querySelector('#navHome span:not(.icon)').textContent.trim(), h1: document.querySelector('#libraryRoot .lib-article h1').textContent }));
    assert.deepEqual([st.home, st.h1], want[l], l);
    if (l === 'az') {
      await p.goto(srv.base + '/sozlamalar', { waitUntil: 'domcontentloaded' });
      await p.waitForSelector('.set-lang[data-lang="az"]', { timeout: 15000 });
      assert.equal(await p.evaluate(() => document.querySelector('.set-lang[data-lang="az"]').classList.contains('active')), true);
    }
    assert.deepEqual(p.errors, [], l);
    await p.close();
  }
});

test("中文, Italiano: menyu, kutubxona va huquqiy sahifa shu tillarda, sozlamalarda tanlangan", opts, async () => {
  const u = await srv.register('Tillar5');
  const want = { zh: ['首页', '战术：双重攻击（捉双）', '隐私政策'], it: ['Home', 'Tattica: la forchetta', 'Informativa sulla privacy'] };
  for (const l of Object.keys(want)) {
    const p = await page(u);
    await p.evaluateOnNewDocument((lang) => localStorage.setItem('justChessLang', lang), l);
    await p.goto(srv.base + '/kutubxona?m=fork', { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#libraryRoot .lib-article h1', { timeout: 15000 });
    await sleep(500);
    const st = await p.evaluate(() => ({ home: document.querySelector('#navHome span:not(.icon)').textContent.trim(), h1: document.querySelector('#libraryRoot .lib-article h1').textContent }));
    await p.goto(srv.base + '/sozlamalar', { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('.set-lang[data-lang="' + l + '"]', { timeout: 15000 });
    assert.equal(await p.evaluate((x) => document.querySelector('.set-lang[data-lang="' + x + '"]').classList.contains('active'), l), true, l);
    await p.goto(srv.base + '/maxfiylik?lang=' + l, { waitUntil: 'domcontentloaded' });
    const h = await p.evaluate(() => document.querySelector('h1').textContent);
    assert.deepEqual([st.home, st.h1, h], want[l], l);
    assert.deepEqual(p.errors, [], l);
    await p.close();
  }
});

test("C5 admin paneli: 8 ta tab, shikoyat → ban → blokdan chiqarish, jim qilish, taqiqlangan so'z, kutubxona qo'shish/tahrir/o'chirish, xato hal qilish, zaxira, jurnal filtrlari", opts, async () => {
  const adm = await srv.register('C5Adm'), bad = await srv.register('C5_bad'), rep = await srv.register('C5Rep');
  await new Promise((resolve, reject) => {
    const d = new (require('sqlite3').Database)(require('path').join(srv.dir, 'test.sqlite'));
    d.run("UPDATE users SET role = 'admin' WHERE id = ?", [adm.id], (err) => d.close(() => (err ? reject(err) : resolve())));
  });
  adm.user.role = 'admin';
  await srv.api(rep, '/api/reports', 'POST', { username: bad.name, reason: 'abuse', details: 'C5 sinov shikoyati' });
  for (const u of [adm, bad]) await srv.api(u, '/api/country-clubs/join', 'POST', { country: 'Kenya', code: 'ke' });
  await srv.api(bad, '/api/chat/messages', 'POST', { roomId: 'club_Kenya', message: 'C5 klub xabari' });
  await fetch(srv.base + '/api/client-errors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'C5 sinov xatosi: x is undefined', stack: 'at c5 (https://x/app.js:1:1)', url: '/c5' }) });
  const p = await page(adm);
  await p.goto(srv.base + '/admin', { waitUntil: 'load' });
  await p.waitForSelector('#adminRoot [data-atab="stats"].active, [data-atab="stats"].active', { timeout: 15000 });
  const tab = async (id, sel) => { await clickEl(`[data-atab="${id}"]`); await p.waitForSelector(sel, { timeout: 10000 }); await sleep(300); };
  // Ro'yxat har amaldan keyin qayta chiziladi — element har safar yangidan topiladi (eski havola "detached" bo'lib qolardi)
  const clickEl = async (sel) => { await p.waitForSelector(sel, { timeout: 8000 }); await sleep(250); await p.evaluate((q) => document.querySelector(q).click(), sel); };
  const txt = () => p.evaluate(() => document.querySelector('.adm-body').textContent);
  // 📊 Statistika — kartalar va zaxira nusxa
  await p.waitForSelector('.adm-stat', { timeout: 10000 });
  assert.ok((await p.$$('.adm-stat')).length >= 8);
  const backup = p.waitForResponse((r) => r.url().endsWith('/api/admin/backup'), { timeout: 15000 });
  await clickEl('#admBackupBtn');
  assert.equal((await backup).status(), 200);
  // ⚠️ Shikoyatlar: ban (1 kun) → ko'rib chiqildi
  await tab('reports', '.adm-item [data-resolve]');
  assert.match(await txt(), /C5 sinov shikoyati/);
  const banned = p.waitForResponse((r) => r.url().endsWith('/api/admin/users/' + bad.id + '/ban'), { timeout: 8000 });
  await clickEl(`[data-ban="${bad.id}"]`);
  assert.equal((await banned).status(), 200);
  assert.equal((await srv.api(bad, '/api/notifications')).status, 403, 'bloklangan foydalanuvchi API ga kira olmaydi');
  await clickEl('[data-resolve]');
  await p.waitForFunction(() => !/C5 sinov shikoyati/.test(document.querySelector('.adm-body').textContent), { timeout: 8000 });
  // 👥 O'yinchilar: "_" li ism qidiruvi, blokdan chiqarish
  await tab('users', '#admQuery');
  await p.type('#admQuery', 'C5_bad');
  await p.keyboard.press('Enter');
  await p.waitForSelector(`[data-unban="${bad.id}"]`, { timeout: 8000 });
  await clickEl(`[data-unban="${bad.id}"]`);
  await p.waitForSelector(`[data-ban="${bad.id}"]`, { timeout: 8000 });
  assert.equal((await srv.api(bad, '/api/notifications')).status, 200, 'blokdan chiqdi');
  // 🕵️ Fair-play tab ochiladi
  await tab('fairplay', '.adm-note');
  // 💬 Chat: taqiqlangan so'z qo'shish/olib tashlash, jim qilish
  await tab('chat', '#admWord');
  await p.type('#admWord', 'c5yomon');
  await clickEl('#admWordForm button');
  await p.waitForSelector('[data-unword="c5yomon"]', { timeout: 8000 });
  await clickEl('[data-unword="c5yomon"]');
  await p.waitForFunction(() => !document.querySelector('[data-unword="c5yomon"]'), { timeout: 8000 });
  await p.waitForFunction(() => /C5 klub xabari/.test(document.querySelector('.adm-body').textContent), { timeout: 8000 });
  await clickEl(`[data-mute="${bad.id}"]`);
  await p.waitForFunction(() => /🔇/.test(document.querySelector('.adm-tag.red') ? document.querySelector('.adm-tag.red').textContent : ''), { timeout: 8000 });
  assert.equal((await srv.api(bad, '/api/chat/messages', 'POST', { roomId: 'club_Kenya', message: 'jim' })).status, 403, 'jim qilingan yoza olmaydi');
  // 🐞 Xatolar: brauzer xatosi ko'rinadi, hal qilinadi
  await tab('errors', '.adm-err-bar');
  await p.waitForFunction(() => /C5 sinov xatosi/.test(document.querySelector('.adm-body').textContent), { timeout: 8000 });
  await clickEl('[data-err-resolve]');
  await p.waitForFunction(() => !/C5 sinov xatosi/.test(document.querySelector('.adm-body').textContent), { timeout: 8000 });
  // 📚 Kutubxona: maqola qo'shish → tahrirlash → o'chirish
  await tab('library', '#admLibForm');
  await p.type('#admLibForm [data-lf="title"]', 'C5 sinov maqolasi');
  await p.type('#admLibForm [data-lf="lead"]', 'Qisqa kirish matni');
  await p.type('#admLibForm [data-lf="body"]', "Bu maqola admin panelini tekshirish uchun yozildi va yigirma belgidan uzun.");
  await clickEl('#admLibForm button[type="submit"]');
  // Boshqa testlar ham kutubxonaga material qo'shadi — o'zimiznikini id bo'yicha topamiz (ro'yxatdagi birinchisi emas)
  let mine = null;
  for (let i = 0; i < 40 && !mine; i++) { mine = (await srv.api(null, '/api/library')).items.find((x) => x.title === 'C5 sinov maqolasi'); if (!mine) await sleep(200); }
  assert.ok(mine, "maqola qo'shildi");
  await clickEl(`[data-lib-edit="${mine.id}"]`);
  await p.waitForSelector('#admLibCancel', { timeout: 5000 });
  await p.evaluate(() => { const i = document.querySelector('#admLibForm [data-lf="title"]'); i.value = 'C5 tahrirlangan maqola'; });
  await clickEl('#admLibForm button[type="submit"]');
  await p.waitForFunction(() => /C5 tahrirlangan maqola/.test(document.querySelector('.adm-list').textContent), { timeout: 8000 });
  assert.ok((await srv.api(null, '/api/library')).items.some((x) => x.id === mine.id && x.title === 'C5 tahrirlangan maqola'));
  await clickEl(`[data-lib-del="${mine.id}"]`);
  await p.waitForFunction((id) => !document.querySelector(`[data-lib-del="${id}"]`), { timeout: 8000 }, mine.id);
  assert.ok(!(await srv.api(null, '/api/library')).items.some((x) => x.id === mine.id), "maqola o'chirildi");
  // 📜 Jurnal: har amal yozilgan, filtrlar ("_" li nomlar ham) ishlaydi
  await tab('audit', '#admAuditAction');
  for (const [filter, re] of [['ban', /Blokladi|ban/i], ['unban', /Blokdan chiqardi/], ['mute', /Jim qildi/], ['report', /Shikoyatni/], ['filter', /Taqiqlangan so'z/], ['backup', /Zaxira/], ['library', /Kutubxona/], ['chat_delete', null]]) {
    await p.select('#admAuditAction', filter);
    await sleep(700);
    const t = await txt();
    if (re) assert.match(t, re, filter);
    else assert.match(t, /Yozuvlar yo'q|Klub chatidagi/, filter);
  }
  await p.select('#admAuditAction', '');
  await p.type('#admAuditQ', 'C5_bad');
  await clickEl('#admAuditForm button');
  await sleep(700);
  assert.match(await txt(), /C5_bad/);
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
  await p.goto(srv.base + '/?invite=' + code + '&tc=180%2B2', { waitUntil: 'load' });
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
  await p.goto(srv.base + '/', { waitUntil: 'load' });
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
  await p.goto(srv.base + '/', { waitUntil: 'load' });
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
  await p.goto(srv.base + '/xabarlar', { waitUntil: 'load' });
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
  await p.goto(srv.base + '/', { waitUntil: 'load' });
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
  await p.goto(srv.base + '/', { waitUntil: 'load' });
  const scope = await p.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  assert.equal(scope, srv.base + '/');
});

test("Telegram Mini App: birinchi marta — kirish sahifasida eslatma, kirgach Telegram ulanadi; keyingi safar parolsiz o'zi kiradi", opts, async () => {
  const { startFakeTelegram, makeInitData } = require('./fixtures/telegram');
  const tg = await startFakeTelegram();
  const own = await startServer({ TELEGRAM_BOT_TOKEN: '123:TEST', TELEGRAM_API: tg.api });
  try {
    const u = await own.register('TgApp');
    // Telegram manzilga hash qo'shib ochadi: #tgWebAppData=<imzoli ma'lumot>&tgWebAppVersion=…
    const hash = '#' + new URLSearchParams({ tgWebAppData: makeInitData('123:TEST', { id: 7007, first_name: 'Test', username: 'tg_test' }), tgWebAppVersion: '8.0', tgWebAppPlatform: 'android' }).toString();
    const p1 = await page(null, { width: 390, height: 844, isMobile: true, hasTouch: true });
    await p1.goto(own.base + '/' + hash, { waitUntil: 'load' });
    await p1.waitForSelector('#authGate .tg-app-note', { timeout: 15000 });
    assert.equal(await p1.evaluate(() => location.hash), '', "kirish ma'lumoti manzildan olib tashlandi");
    assert.ok(await p1.evaluate(() => document.documentElement.classList.contains('tg-app') && window.isTelegramApp === true));
    // Oddiy kirish (parol bilan) — shundan keyin shu Telegram akkauntga ulanadi
    await p1.evaluate(async (name) => {
      const d = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name, password: 'secret1' }) }).then((r) => r.json());
      window.applyAuthSession(d.user, d.token);
    }, u.name);
    const linked = async () => (await own.api(u, '/api/telegram')).linked === true;
    for (let i = 0; i < 40 && !(await linked()); i++) await sleep(150);
    assert.ok(await linked(), 'Telegram ulandi');
    assert.equal(await p1.$('#authGate .tg-app-note'), null, 'eslatma yopildi');
    assert.deepEqual(p1.errors, []);
    // Keyingi safar (yangi qurilma/oyna, saqlangan sessiyasiz va tilsiz) — parolsiz kiradi, til akkauntdagidan (p1 da 'uz' bilan ulangan)
    const p2 = await page(null, { width: 390, height: 844, isMobile: true, hasTouch: true });
    await p2.evaluateOnNewDocument(() => localStorage.removeItem('justChessLang'));
    // (bildirishnoma tugmasi kabi aniq sahifa bilan) — kirgach o'sha sahifa ochiladi
    await p2.goto(own.base + '/xabarlar' + hash, { waitUntil: 'load' });
    await p2.waitForFunction((name) => window.currentUser && window.currentUser.username === name && !document.body.classList.contains('auth-locked'), { timeout: 15000 }, u.name);
    await p2.waitForFunction(() => location.pathname === '/xabarlar' && document.getElementById('messagesView').classList.contains('active-view'), { timeout: 10000 });
    await p2.waitForFunction(() => localStorage.getItem('justChessLang') === 'uz' && document.documentElement.lang === 'uz', { timeout: 10000 });
    assert.deepEqual(p2.errors, []);
    // Ulanmagan, saqlangan tili yo'q, Telegram ilovasi ruscha — sayt ruscha (avval doim inglizcha ochilardi)
    const p3 = await page(null, { width: 390, height: 844, isMobile: true, hasTouch: true });
    await p3.evaluateOnNewDocument(() => localStorage.removeItem('justChessLang'));
    const ruHash = '#' + new URLSearchParams({ tgWebAppData: makeInitData('123:TEST', { id: 7008, first_name: 'Ivan', language_code: 'ru' }), tgWebAppVersion: '8.0' }).toString();
    await p3.goto(own.base + '/' + ruHash, { waitUntil: 'load' });
    await p3.waitForFunction(() => document.documentElement.lang === 'ru' && /[а-я]/i.test(document.querySelector('#authGate .tg-app-note') ? document.querySelector('#authGate .tg-app-note').textContent : ''), { timeout: 15000 });
    assert.deepEqual(p3.errors, []);
  } finally { await own.stop(); await tg.stop(); }
});

test("Klub yutuqlari: rahbariyat va yangiliklar o'rnida kuboklar va musobaqalardagi natijalar (Bayroqlar mavsumi bosilsa — Bayroqlar sahifasi)", opts, async () => {
  const u = await srv.register('Hon');
  await srv.api(u, '/api/country-clubs/join', 'POST', { country: 'Mongolia', code: 'mn' });
  await new Promise((resolve, reject) => {
    const d = new (require('sqlite3').Database)(require('path').join(srv.dir, 'test.sqlite'));
    d.run("INSERT INTO war_points (id, season, club_country, club_code, user_id, opponent_code, points, created_at) VALUES ('ui-hon-1', '2026-02', 'Mongolia', 'mn', ?, 'cn', 5, ?)", [u.id, new Date().toISOString()], (err) => d.close(() => (err ? reject(err) : resolve())));
  });
  const p = await page(u, { width: 390, height: 844, isMobile: true, hasTouch: true });
  await p.goto(srv.base + '/klublar?club=Mongolia', { waitUntil: 'load' });
  await p.waitForSelector('#clHonours .cl-trophies', { timeout: 15000 });
  const h = await p.evaluate(() => ({
    title: document.querySelector('#clHonours h3').textContent.trim(),
    trophies: [...document.querySelectorAll('#clHonours .cl-trophy')].map((t) => [t.classList.contains('none'), t.querySelector('b').textContent]),
    rows: [...document.querySelectorAll('#clHonours .cl-res')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()),
    staff: !!document.querySelector('#clubStaffNews, .cs-root'),
    wide: document.documentElement.scrollWidth > innerWidth
  }));
  assert.equal(h.title, '🏅 Klub yutuqlari');
  assert.deepEqual(h.trophies, [[true, '—'], [true, '—'], [false, '×1']], 'liga, Chempionlar ligasi, Bayroqlar');
  assert.equal(h.rows.length, 1);
  assert.match(h.rows[0], /Bayroqlar bellashuvi · Fevral 2026.*5 ochko.*1-o'rin \/ \d+.*Chempion/);
  assert.equal(h.staff, false, "kapitan/moderator va yangiliklar bloki yo'q");
  assert.equal(h.wide, false, 'telefonda ekrandan chiqmaydi');
  await p.evaluate(() => document.querySelector('#clHonours .cl-res').click());
  await p.waitForSelector('#warView.active-view', { timeout: 10000 });
  // Hech qatnashmagan klub — bo'sh kuboklar va izoh
  await p.goto(srv.base + '/klublar?club=Chile', { waitUntil: 'load' });
  await p.waitForSelector('#clHonours .cl-trophies', { timeout: 15000 });
  assert.match(await p.$eval('#clHonours', (e) => e.textContent), /Klub hali musobaqalarda qatnashmagan/);
  assert.deepEqual(p.errors, []);
});

test("190 davlat: klub sahifasida o'sha davlat videosi, Bayroqlar sahifasida video chiqqan davlatlar qatori (YouTube'da, yangi oynada)", opts, async () => {
  const { startFakeYoutube } = require('./fixtures/youtube');
  const yt = await startFakeYoutube({ extra: [{ id: 'GpCDMHR6Exw', title: "O'zbekiston shaxmatda qanchalik kuchli? 🇺🇿 | 190 davlat 1/190 #shorts" }] });
  const own = await startServer({ YOUTUBE_BASE: yt.base, YTIMG_BASE: yt.base });
  try {
    const u = await own.register('CvUi');
    const p = await page(u, { width: 390, height: 844, isMobile: true, hasTouch: true });
    await p.goto(own.base + '/klublar?club=Uzbekistan', { waitUntil: 'load' });
    await p.waitForSelector('#clubDetailView .cl-hero .cl-video', { timeout: 15000 });
    const link = await p.$eval('#clubDetailView .cl-video', (a) => ({ href: a.href, blank: a.target === '_blank' && /noopener/.test(a.rel), text: a.textContent.trim() }));
    assert.deepEqual([link.href, link.blank], ['https://www.youtube.com/shorts/GpCDMHR6Exw', true]);
    assert.match(link.text, /O'zbekiston shaxmati haqida video/);
    // Video yo'q davlat — tugma yo'q
    await p.goto(own.base + '/klublar?club=Germany', { waitUntil: 'load' });
    await p.waitForSelector('#clubDetailView .cl-hero', { timeout: 15000 });
    await sleep(800);
    assert.equal(await p.$('#clubDetailView .cl-video'), null);
    // Bayroqlar bellashuvi: xarita ostida videolar qatori
    await p.goto(own.base + '/bayroqlar', { waitUntil: 'load' });
    await p.waitForSelector('#warVideos:not([hidden]) a.war-video', { timeout: 15000 });
    assert.deepEqual(await p.$$eval('#warVideos a.war-video', (as) => as.map((a) => [a.href, a.target, a.textContent.trim()])), [['https://www.youtube.com/shorts/GpCDMHR6Exw', '_blank', "O'zbekiston"]]);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'telefonda ekrandan chiqmaydi');
    assert.deepEqual(p.errors, []);
  } finally { await own.stop(); await yt.stop(); }
});

test("Videodarslar: Kutubxonada kanal videolari — muqova server orqali, bosilganda YouTube yangi oynada", opts, async () => {
  const { startFakeYoutube } = require('./fixtures/youtube');
  const yt = await startFakeYoutube();
  const own = await startServer({ YOUTUBE_BASE: yt.base, YTIMG_BASE: yt.base });
  try {
    const u = await own.register('VidUi');
    const p = await page(u, { width: 390, height: 844, isMobile: true, hasTouch: true });
    await p.goto(own.base + '/kutubxona', { waitUntil: 'load' });
    await p.waitForFunction(() => document.querySelectorAll('#lib-videos a.lib-video').length === 2, { timeout: 15000 });
    const cards = await p.$$eval('#lib-videos a.lib-video', (as) => as.map((a) => ({ href: a.href, target: a.target, rel: a.rel, title: a.querySelector('b').textContent, img: a.querySelector('img') && a.querySelector('img').getAttribute('src') })));
    assert.deepEqual(cards.map((c) => c.href), ['https://www.youtube.com/shorts/axHTEebW8xo', 'https://www.youtube.com/watch?v=KTc2AAnXWlU']);
    assert.ok(cards.every((c) => c.target === '_blank' && /noopener/.test(c.rel)));
    assert.equal(cards[0].img, '/api/videos/thumb/axHTEebW8xo');
    // Muqova haqiqatan yuklangan (brauzer YouTube'ga emas, bizning serverga murojaat qiladi)
    await p.waitForFunction(() => [...document.querySelectorAll('#lib-videos img')].every((i) => i.complete && i.naturalWidth > 0), { timeout: 10000 });
    assert.ok(await p.$('.lib-jump a[href="#lib-videos"]'), "javonlar menyusida 'Videodarslar'");
    assert.match(await p.$eval('#lib-videos', (e) => e.textContent), /YouTube'da ko'rish/);
    // Sana raqamlarda (brauzerda o'zbekcha oy nomlari yo'q) va ko'rishlar soni
    assert.match(await p.$eval('#lib-videos a.lib-video small', (e) => e.textContent), /^02\.11\.2026 · 46 /);
    assert.ok(await p.$('#lib-videos a.yt-channel'), 'kanal havolasi');
    // Sahifa kengligidan oshmaydi
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(p.errors, []);
  } finally { await own.stop(); await yt.stop(); }
});

test("Internetsiz: server o'chganda offline sahifa ochiladi va 5 ta o'yinning hammasi oxirigacha o'ynaladi", opts, async () => {
  // Alohida server — uni o'chirib, haqiqiy "tarmoq yo'q" holatini yaratamiz (puppeteer offline rejimi service worker'ga ta'sir qilmaydi)
  const own = await startServer();
  const p = await page(null, { width: 390, height: 844, isMobile: true, hasTouch: true });
  await p.goto(own.base + '/offline.html', { waitUntil: 'load' });
  await p.evaluate(() => navigator.serviceWorker.register('/sw.js'));
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.waitForFunction(async () => (await (await caches.open('chessdom-shell-v1')).keys()).length >= 24, { polling: 200, timeout: 20000 });
  await own.stop();
  await p.goto(own.base + '/oyin', { waitUntil: 'load' });
  assert.equal(await p.$eval('h1', (e) => e.textContent), "Internet aloqasi yo'q");
  assert.equal(await p.$$eval('.og-card', (x) => x.length), 5);
  const msg = () => p.$eval('#ogMsg', (e) => e.textContent);
  const tap = (sq) => p.click('[data-sq="' + sq + '"]');
  const open = async (g) => { await p.click('[data-game="' + g + '"]'); await sleep(150); };
  const back = async () => { await p.click('#ogBack'); await sleep(150); };

  // 👥 Ikki kishi: ahmoqona mat
  await open('local');
  await p.evaluate(() => document.querySelector('#ogCtl .og-btn.primary').click());
  for (const s of ['f2', 'f3', 'e7', 'e5', 'g2', 'g4', 'd8', 'h4']) { await tap(s); await sleep(40); }
  assert.match(await msg(), /Qora yutdi · mat/);
  await back();

  // 🎯 Katakni top: 3 ta to'g'ri katak
  await open('squares');
  await p.evaluate(() => document.querySelector('#ogCtl .og-btn.primary').click());
  for (let i = 0; i < 3; i++) { await tap(await p.$eval('.og-target', (e) => e.textContent)); await sleep(40); }
  assert.match(await p.$eval('#ogStats', (e) => e.textContent), /Ochko3/);
  await back();

  // 🐪 Karvon tangalari: eng yaqin tangaga eng qisqa yo'l bilan
  await open('coins');
  for (let guard = 0; guard < 40 && !/yig'ildi/.test(await msg()); guard++) {
    const next = await p.evaluate(() => {
      const G = window.OfflineGames;
      const sqOf = (el) => G.index(el.closest('.og-sq').dataset.sq);
      const pos = sqOf(document.querySelector('.og-sq img[src*="wB"]'));
      const coins = [...document.querySelectorAll('.og-sq .og-coin')].map(sqOf);
      const rocks = new Set([...document.querySelectorAll('.og-sq.rock')].map((e) => G.index(e.dataset.sq)));
      // Tangadan orqaga BFS: pos dan bir qadamda yetiladigan va tangagacha masofasi eng kam katak
      let best = null;
      for (const j of G.knightTargets(pos, rocks)) for (const c of coins) { const d = G.distances(c, rocks)[j]; if (d >= 0 && (!best || d < best.d)) best = { j, d }; }
      return G.name(best.j);
    });
    await tap(next);
  }
  assert.match(await msg(), /Barcha tangalar yig'ildi/);
  await back();

  // 🧠 Eslab qol: ko'rsatilgan pozitsiyani yozib olib, qaytadan qo'yamiz
  await open('memory');
  const shown = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.og-sq img')].map((i) => [i.closest('.og-sq').dataset.sq, i.src.match(/(\w\w)\.svg$/)[1]])));
  await p.waitForSelector('.og-token', { timeout: 8000 });
  for (const [sq, code] of Object.entries(shown)) {
    await p.evaluate((c) => [...document.querySelectorAll('.og-token')].find((b) => b.querySelector('img').src.endsWith(c + '.svg')).click(), code);
    await tap(sq);
  }
  await p.evaluate(() => document.querySelector('#ogCtl .og-btn.primary').click());
  assert.match(await msg(), /To'g'ri/);
  await back();

  // ♞ Ot sayohati: a1 dan maslahat bilan barcha 64 katak
  await open('tour');
  await tap('a1');
  for (let i = 0; i < 63; i++) {
    await p.evaluate(() => [...document.querySelectorAll('#ogCtl .og-btn')].find((b) => b.textContent.includes('Maslahat')).click());
    await p.click('.og-sq.hint.best');
  }
  assert.match(await msg(), /Barcha 64 katak/);
  await back();
  // Rekordlar bosh menyuda ko'rinadi
  assert.match(await p.$eval('[data-best="tour"]', (e) => e.textContent), /64/);
  assert.deepEqual(p.errors, []);
});

test("Barcha bo'limlar: kirgan foydalanuvchi har bir sahifani ochganda ushlanmagan JS xatosi yo'q (kompyuter va telefon)", opts, async () => {
  const u = await srv.register('Tour');
  await srv.api(u, '/api/country-clubs/join', 'POST', { country: 'Uzbekistan', code: 'uz' });
  const login = await srv.api(null, '/api/auth/login', 'POST', { username: u.name, password: u.password });
  const ROUTES = ['/', '/oyin', '/choyxona', '/reyting', '/jonli', '/xabarlar', '/klublar', '/klublar?club=Uzbekistan', '/ligalar', '/chempionlar',
    '/bayroqlar', '/karvon', '/kutubxona', '/kutubxona?m=muzey', '/sozlamalar', '/tarix?u=' + u.name, '/profil?u=' + u.name + '&b=nishonlar', '/jamoa', '/?profile=' + u.name];
  for (const vp of [undefined, { width: 390, height: 844, isMobile: true, hasTouch: true }]) {
    const p = await page({ token: login.token, user: login.user }, vp);
    p.consoleErrors = [];
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::|jsdelivr|gstatic|fonts\.g/.test(m.text())) p.consoleErrors.push(m.text()); });
    await p.goto(srv.base + '/', { waitUntil: 'load' });
    await sleep(600);
    for (const r of ROUTES) {
      // SPA ichida o'tish (router) va to'g'ridan-to'g'ri ochish — ikkalasi ham
      await p.evaluate((url) => { history.pushState({}, '', url); window.dispatchEvent(new PopStateEvent('popstate', { state: {} })); }, r);
      await sleep(350);
    }
    for (const r of ['/sozlamalar', '/karvon', '/kutubxona?m=fork', '/jamoa']) { await p.goto(srv.base + r, { waitUntil: 'load' }); await sleep(400); }
    assert.deepEqual(p.errors, [], 'pageerror ' + (vp ? 'telefon' : 'kompyuter'));
    assert.deepEqual(p.consoleErrors, [], 'console.error ' + (vp ? 'telefon' : 'kompyuter'));
  }
});

test("Davlat: yangi foydalanuvchida xalqaro (BMT) bayrog'i, tanlab saqlansa serverga yoziladi", opts, async () => {
  const u = await srv.register('Intl');
  const p = await page(u);
  // O'yin panelida ham — o'z bayrog'imiz xalqaro
  await p.goto(srv.base + '/oyin', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#whitePlayerFlag', { timeout: 15000 });
  await sleep(500);
  const flags = await p.evaluate(() => [document.getElementById('whitePlayerFlag').src, document.getElementById('blackPlayerFlag').src]);
  assert.ok(flags.every((f) => f.endsWith('/un.png')), flags.join(' '));
  await p.goto(srv.base + '/sozlamalar', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#setCountry', { timeout: 15000 });
  const st = await p.evaluate(() => ({ me: window.currentUser.country, sel: document.getElementById('setCountry').value, first: document.querySelector('#setCountry option').textContent, flag: document.getElementById('setCountryFlag').src }));
  assert.notEqual(st.me, 'uz', "O'zbekiston o'z-o'zidan qo'yilmaydi");
  assert.equal(st.sel, 'un');
  assert.match(st.first, /Xalqaro/);
  assert.ok(st.flag.endsWith('/un.png'), st.flag);
  await p.select('#setCountry', 'kz');
  await p.click('[data-save]');
  await sleep(800);
  assert.equal((await srv.api(null, '/api/users/' + u.name + '/profile')).profile.country, 'kz');
  assert.deepEqual(p.errors, []);
});
