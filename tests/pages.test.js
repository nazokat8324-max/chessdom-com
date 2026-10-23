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
  assert.match(await home.text(), /<title>ChessCaravan/);
  const lb = await (await get('/reyting')).text();
  assert.match(lb, /<title>Leaderboard · ChessCaravan<\/title>/);
  assert.match(lb, /rel="canonical"/);
});

test('Kanonik manzillar va eski manzillar yo\'naltiriladi', async () => {
  for (const [from, to] of [['/Reyting', '/reyting'], ['/reyting/', '/reyting'], ['/urush', '/bayroqlar'], ['/privacy', '/maxfiylik'], ['/terms', '/shartlar'], ['/dostlar', '/xabarlar'], ['/chat', '/xabarlar']]) {
    const r = await get(from);
    assert.equal(r.status, 301, from);
    assert.equal(r.headers.get('location'), to, from);
  }
});

test("Olib tashlangan eski API'lar yo'q, ishlatiladiganlari joyida", async () => {
  for (const p of ['/api/tournaments', '/api/tournaments/arenas', '/api/clubs', '/api/clubs/abc', '/server-helpers.js']) assert.equal((await get(p)).status, 404, p);
  for (const p of ['/api/clubs/leaderboard', '/api/swiss', '/api/tea', '/api/games/live']) assert.equal((await get(p)).status, 200, p);
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
  assert.equal((await get('/mualliflar')).status, 200);
  assert.equal((await get('/credits')).headers.get('location'), '/mualliflar');
  assert.ok(sm.includes('/mualliflar'));
});

test("Litsenziya: begona serverdagi ovoz/dona yo'q, faqat erkin to'plamlar, mualliflar ro'yxati to'liq", async () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const files = [...html.matchAll(/<script src="([\w.-]+\.js)"/g)].map((m) => m[1]);
  for (const f of files.concat(['index.html', 'style.css'])) {
    assert.ok(!fs.readFileSync(path.join(root, f), 'utf8').includes('lichess1.org'), f + " lichess serveridan resurs olmasin");
  }
  for (const s of ['move', 'capture', 'check', 'game-end']) assert.equal((await get('/assets/sounds/' + s + '.wav')).status, 200, s);
  global.window = {};
  require(path.join(root, 'legal-content.js'));
  const credits = JSON.stringify(window.LEGAL_CREDITS);
  for (const name of ['Stockfish', 'Noto Emoji Animation', 'chessboard.js', 'gifenc']) assert.ok(credits.includes(name), name);
  // Donalar — faqat o'zimiz chizgan 10 ta to'plam (tools/make-pieces.js), standart Karvon; begona to'plamlar yo'q
  const sets = JSON.parse(fs.readFileSync(path.join(root, 'board.js'), 'utf8').match(/window\.PIECE_SETS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  const { execFileSync } = require('child_process');
  const generated = JSON.parse(execFileSync(process.execPath, ['-e', "process.stdout.write(JSON.stringify(require(process.argv[1]).SETS))", path.join(root, 'tools/make-pieces.js'), 'none']).toString());
  assert.deepEqual(sets, generated, "board.js PIECE_SETS = make-pieces.js SETS");
  assert.equal(sets.length, 10);
  assert.equal(sets[0], 'karvon');
  const settingsSrc = fs.readFileSync(path.join(root, 'settings.js'), 'utf8');
  assert.deepEqual([...settingsSrc.match(/const PIECES = \[(.*)\];/)[1].matchAll(/\['(\w+)'/g)].map((m) => m[1]), sets, "settings.js PIECES");
  for (const set of sets) for (const c of ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP']) assert.equal((await get('/img/chesspieces/' + set + '/' + c + '.svg')).status, 200, set + ' ' + c);
  assert.deepEqual(fs.readdirSync(path.join(root, 'img/chesspieces')).sort(), [...sets].sort(), "img/chesspieces da faqat o'z to'plamlarimiz");
  // Har to'plamning o'z shakllari: bir xil dona (masalan, oq ot) ikki to'plamda bir xil chizilmasin — faqat rang/naqsh farqi yetmaydi
  for (const c of ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP']) {
    const seen = new Map();
    for (const set of sets) {
      const shape = [...fs.readFileSync(path.join(root, 'img/chesspieces', set, c + '.svg'), 'utf8').matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join('|');
      assert.ok(!seen.has(shape), `${c}: ${set} shakli ${seen.get(shape)} bilan bir xil`);
      seen.set(shape, set);
    }
  }
  for (const old of ['wikipedia/wK.png', 'cburnett/wK.svg', 'merida/wK.svg']) assert.equal((await get('/img/chesspieces/' + old)).status, 404, old);
  assert.ok(!/Burnett|Merida/.test(credits), "begona dona to'plamlari mualliflar ro'yxatida yo'q");
  assert.match(settingsSrc, /pieceSet: 'karvon'/);
  assert.match(fs.readFileSync(path.join(root, 'board.js'), 'utf8'), /window\.currentPieceSet = 'karvon'/);
});

test("Sayt rang mavzulari: 10 ta, barcha ro'yxatlar, CSS va 6 tildagi nomlar bir xil", () => {
  const fs = require('fs');
  const path = require('path');
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const list = (src, re) => JSON.parse(src.match(re)[1].replace(/'/g, '"'));
  const site = list(read('script.js'), /window\.SITE_THEMES = (\[[^\]]*\])/);
  assert.equal(site.length, 10);
  assert.deepEqual(list(read('index.html'), /(\["turquoise"[^\]]*\])\.indexOf\(cdTheme\)/), site, "index.html <head> ro'yxati");
  const settings = [...read('settings.js').match(/const THEMES = \[(.*)\];/)[1].matchAll(/\['(\w+)', '(\w+)'/g)];
  assert.deepEqual(settings.map((m) => m[1]), site, "settings.js ro'yxati");
  const css = read('style.css');
  const langs = read('languages.js');
  for (const [, id, key] of settings) {
    assert.ok(css.includes(`:root[data-theme="${id}"] {\n  --accent:`) || css.includes(`:root[data-theme="${id}"] {\r\n  --accent:`) || id === 'turquoise', id + ' ranglari');
    assert.ok(css.includes(`.set-theme.t-${id} i`), id + ' namunasi');
    assert.equal((langs.match(new RegExp('\\b' + key + ':', 'g')) || []).length, 6, key + ' 6 tilda');
  }
});

test("Xochli ♔/♚ matn belgilari sayt kodida yo'q (o'rniga kingIcon rasm)", () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  for (const f of fs.readdirSync(root).filter((n) => /\.(js|html|css)$/.test(n))) {
    fs.readFileSync(path.join(root, f), 'utf8').split(/\r?\n/).forEach((line, i) => {
      // Izoh qatorlari mumkin, ko'rinadigan kodda — yo'q
      if (/[♔♚]/.test(line) && !/^\s*(\/\/|\*|\/\*)/.test(line)) assert.fail(f + ':' + (i + 1) + ' — ' + line.trim().slice(0, 80));
    });
  }
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
