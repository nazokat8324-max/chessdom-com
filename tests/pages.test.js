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

test("C4 SEO: o'z sarlavhasi va tavsifi, kanonik manzilda profil/maqola/klub qoladi, shaxsiy bo'limlar noindex, sitemap va huquqiy sahifalar", async () => {
  const head = async (p) => {
    const h = await (await get(p)).text();
    const pick = (re) => (h.match(re) || [])[1];
    return { title: pick(/<title>([^<]*)<\/title>/), desc: pick(/name="description" content="([^"]*)"/), canonical: pick(/rel="canonical" href="([^"]*)"/), noindex: /name="robots" content="noindex"/.test(h), lang: pick(/<html lang="([^"]*)"/) };
  };
  // Takrorlangan brend yo'q
  for (const p of ['/jamoa', '/profil', '/admin']) assert.doesNotMatch((await head(p)).title, /ChessCaravan · ChessCaravan/, p);
  // Bo'limlarning tavsiflari har xil
  const descs = await Promise.all(['/', '/reyting', '/choyxona', '/kutubxona', '/karvon', '/klublar'].map(async (p) => (await head(p)).desc));
  assert.equal(new Set(descs).size, descs.length, "har bo'limda o'z tavsifi");
  // Profil, maqola va klub — kanonik manzilda parametr qoladi, ortiqchasi tashlanadi
  const reg = await srv.api(null, '/api/auth/register', 'POST', { username: 'SeoUser', email: 'seo@test.uz', password: 'secret1' });
  assert.ok(reg.success);
  const prof = await head('/?profile=SeoUser&utm_source=x');
  assert.match(prof.canonical, /\/\?profile=SeoUser$/);
  assert.match(prof.title, /^SeoUser · ChessCaravan$/);
  const art = await head('/kutubxona?m=fork');
  assert.match(art.canonical, /\/kutubxona\?m=fork$/);
  assert.doesNotMatch(art.title, /^Chess library/, 'maqola o\'z sarlavhasi bilan');
  assert.match((await head('/kutubxona?m=muzey')).title, /Museum of chess history/);
  const club = await head('/klublar?club=Uzbekistan&tab=chat');
  assert.match(club.canonical, /\/klublar\?club=Uzbekistan$/);
  assert.match(club.title, /^Uzbekistan chess club/);
  assert.match((await head('/reyting?x=1')).canonical, /\/reyting$/);
  // Shaxsiy bo'limlar qidiruvga kirmaydi, ommaviylari kiradi
  for (const p of ['/xabarlar', '/sozlamalar', '/admin', '/profil']) assert.equal((await head(p)).noindex, true, p);
  for (const p of ['/', '/reyting', '/kutubxona', '/klublar']) assert.equal((await head(p)).noindex, false, p);
  // Sitemap: maqolalar, muzey, a'zosi bor klub
  await srv.api(reg, '/api/country-clubs/join', 'POST', { country: 'Uzbekistan', code: 'uz' });
  const sm = await (await get('/sitemap.xml')).text();
  assert.match(sm, /\/kutubxona\?m=muzey</);
  assert.match(sm, /\/kutubxona\?m=fork</);
  assert.match(sm, /\/klublar\?club=Uzbekistan</);
  // Huquqiy sahifalar: o'z sarlavhasi, tavsifi, kanonik manzili
  const legal = await Promise.all(['/maxfiylik', '/shartlar', '/mualliflar'].map(head));
  assert.equal(new Set(legal.map((x) => x.title)).size, 3);
  for (const x of legal) { assert.ok(x.desc); assert.ok(x.canonical); assert.equal(x.lang, 'en'); }
});

test("socket.io mijozi o'z serverimizdan (CDN yuklanmasa butun sayt ishlamasdi — admin 'Xatolar': socket is not defined)", async () => {
  const html = await (await get('/')).text();
  assert.match(html, /<script src="\/socket\.io\/socket\.io\.min\.js"><\/script>/);
  assert.doesNotMatch(html, /cdn\.socket\.io/);
  const js = await get('/socket.io/socket.io.min.js');
  assert.equal(js.status, 200);
  assert.match(js.headers.get('content-type'), /javascript/);
  assert.match(await js.text(), /Socket\.IO v4\./);
});

test("Kutubxonalar (jQuery, chess.js, taxta, i18next, Chart.js, Stockfish, d3…) o'z serverimizdan — tashqi CDN ga bog'liq emas", async () => {
  const fs = require('fs'), path = require('path');
  const ROOT = path.join(__dirname, '..');
  const CDN = /https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|code\.jquery\.com|cdn\.socket\.io)\//;
  const html = await (await get('/')).text();
  assert.doesNotMatch(html, CDN, 'index.html');
  for (const f of fs.readdirSync(ROOT).filter((n) => n.endsWith('.js') || n.endsWith('.html'))) {
    assert.doesNotMatch(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/(^|\s)\/\/.*$/gm, '$1'), CDN, f);
  }
  // index.html dagi har bir vendor/ fayli va JS ichida dinamik yuklanadiganlari beriladi
  const refs = [...html.matchAll(/(?:src|href)="(vendor\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length >= 8, refs.join(','));
  const lazy = ['vendor/stockfish-10.0.2.js', 'vendor/confetti-1.9.3.browser.min.js', 'vendor/gifenc-1.0.3.esm.js', 'vendor/d3-7.9.0.min.js', 'vendor/topojson-client-3.1.0.min.js'];
  for (const r of refs.concat(lazy)) {
    const res = await get('/' + r);
    assert.equal(res.status, 200, r);
    assert.match(res.headers.get('content-type'), r.endsWith('.css') ? /text\/css/ : /javascript/, r);
    assert.doesNotMatch(await res.text(), /sourceMappingURL/, r + ' (yo\'q .map so\'rovi)');
  }
});

test('Kanonik manzillar va eski manzillar yo\'naltiriladi', async () => {
  for (const [from, to] of [['/Reyting', '/reyting'], ['/reyting/', '/reyting'], ['/urush', '/bayroqlar'], ['/privacy', '/maxfiylik'], ['/terms', '/shartlar'], ['/dostlar', '/xabarlar'], ['/chat', '/xabarlar']]) {
    const r = await get(from);
    assert.equal(r.status, 301, from);
    assert.equal(r.headers.get('location'), to, from);
  }
});

test("Render manzili (*.onrender.com) rasmiy domenga yo'naltiriladi, API va rasmiy domen o'zgarmaydi", async () => {
  const http = require('http');
  const req = (p, host, method = 'GET') => new Promise((resolve, reject) => {
    const u = new URL(srv.base + p);
    http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers: { host }, agent: false }, (r) => { r.resume(); resolve(r); }).on('error', reject).end();
  });
  const r = await req('/reyting?profile=Ali', 'chessdom-com.onrender.com');
  assert.equal(r.statusCode, 301);
  assert.equal(r.headers.location, 'https://chesscaravan.com/reyting?profile=Ali');
  assert.equal((await req('/api/tea', 'chessdom-com.onrender.com')).statusCode, 200);
  assert.equal((await req('/', 'chesscaravan.com')).statusCode, 200);
  const home = await (await get('/')).text();
  assert.match(home, /<link rel="canonical" href="https:\/\/chesscaravan\.com\/"/);
});

test("Olib tashlangan eski API'lar yo'q, ishlatiladiganlari joyida", async () => {
  for (const p of ['/api/tournaments', '/api/tournaments/arenas', '/api/clubs', '/api/clubs/abc', '/server-helpers.js', '/api/swiss', '/api/swiss/abc', '/swiss.js', '/tournaments.js']) assert.equal((await get(p)).status, 404, p);
  for (const p of ['/api/clubs/leaderboard', '/api/tea', '/api/games/live']) assert.equal((await get(p)).status, 200, p);
});

test('Server fayllari va baza tashqariga berilmaydi', async () => {
  for (const p of ['/server.js', '/database.js', '/push-texts.js', '/daygif.js', '/league.js', '/package.json', '/CLAUDE.md', '/database.sqlite', '/node_modules/express/package.json', '/tests/helpers.js', '/tests/fixtures/push-key.pem', '/.github/workflows/test.yml']) {
    assert.equal((await get(p)).status, 404, p);
  }
  // Klient fayllari esa ochiq
  for (const p of ['/script.js', '/board.js', '/pwa.js', '/legal-content.js']) assert.equal((await get(p)).status, 200, p);
});

test('Huquqiy sahifalar, sitemap va robots', async () => {
  // /favicon.ico — 404 emas (huquqiy sahifalar va robotlar uni o'zi so'raydi; 1-sinov o'tishida topilgan)
  const fav = await get('/favicon.ico');
  assert.equal(fav.status, 200);
  assert.match(fav.headers.get('content-type'), /^image\/png/);
  assert.equal((await get('/maxfiylik')).status, 200);
  assert.equal((await get('/shartlar')).status, 200);
  const sm = await (await get('/sitemap.xml')).text();
  for (const p of ['/choyxona', '/bayroqlar', '/maxfiylik', '/shartlar']) assert.ok(sm.includes(p), p);
  assert.ok(!sm.includes('/turnirlar'), "olib tashlangan turnirlar sitemap'da yo'q");
  // Eski /turnirlar havolalari bosh sahifaga
  const old = await get('/turnirlar?t=abc');
  assert.equal(old.status, 301);
  assert.equal(old.headers.get('location'), '/');
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
  // Ovoz to'plamlari: tools/make-sounds.js PACKS = sound.js SOUND_PACKS = settings.js SOUND_PACKS; har birida 4 ta ovoz
  const { execFileSync: run } = require('child_process');
  const packs = JSON.parse(run(process.execPath, ['-e', 'process.stdout.write(JSON.stringify(require(process.argv[1]).PACKS))', path.join(root, 'tools/make-sounds.js')]).toString());
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'sound.js'), 'utf8').match(/window\.SOUND_PACKS = (\[[^\]]*\])/)[1].replace(/'/g, '"')), packs, 'sound.js');
  assert.deepEqual([...fs.readFileSync(path.join(root, 'settings.js'), 'utf8').match(/const SOUND_PACKS = \[(.*)\];/)[1].matchAll(/\['(\w+)'/g)].map((m) => m[1]), packs, 'settings.js');
  assert.equal(packs[0], 'wood');
  assert.equal(packs.length, 15, "15 ta ovoz to'plami");
  for (const pk of packs) for (const s of ['move', 'capture', 'check', 'game-end']) assert.equal((await get('/assets/sounds/' + pk + '/' + s + '.wav')).status, 200, pk + '/' + s);
  global.window = {};
  require(path.join(root, 'legal-content.js'));
  const credits = JSON.stringify(window.LEGAL_CREDITS);
  for (const name of ['Stockfish', 'Noto Emoji Animation', 'chessboard.js', 'gifenc']) assert.ok(credits.includes(name), name);
  // Donalar — faqat o'zimiz chizgan 15 ta to'plam (tools/make-pieces.js), standart Karvon; begona to'plamlar yo'q
  const sets = JSON.parse(fs.readFileSync(path.join(root, 'board.js'), 'utf8').match(/window\.PIECE_SETS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  const { execFileSync } = require('child_process');
  const generated = JSON.parse(execFileSync(process.execPath, ['-e', "process.stdout.write(JSON.stringify(require(process.argv[1]).SETS))", path.join(root, 'tools/make-pieces.js'), 'none']).toString());
  assert.deepEqual(sets, generated, "board.js PIECE_SETS = make-pieces.js SETS");
  assert.equal(sets.length, 15);
  assert.ok(sets.includes('clear'), "«Aniq» to'plami (keksalar uchun)");
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

// index.html <head> ro'yxatlari: muharrir (Prettier) qatorlarga bo'lsa ham bir xil o'qiladi
const headHtml = (read) => read('index.html').replace(/\s+/g, '').replace(/,\]/g, ']');

test("Sayt rang mavzulari: 15 ta, barcha ro'yxatlar, CSS va 6 tildagi nomlar bir xil", () => {
  const fs = require('fs');
  const path = require('path');
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const list = (src, re) => JSON.parse(src.match(re)[1].replace(/'/g, '"'));
  const site = list(read('script.js'), /window\.SITE_THEMES = (\[[^\]]*\])/);
  assert.equal(site.length, 15);
  assert.deepEqual(list(headHtml(read), /(\["turquoise"[^\]]*\])\.indexOf\(cdTheme\)/), site, "index.html <head> ro'yxati");
  const settings = [...read('settings.js').match(/const THEMES = \[(.*)\];/)[1].matchAll(/\['(\w+)', '(\w+)'/g)];
  assert.deepEqual(settings.map((m) => m[1]), site, "settings.js ro'yxati");
  const css = read('style.css');
  const langs = read('languages.js');
  for (const [, id, key] of settings) {
    assert.ok(css.includes(`:root[data-theme="${id}"] {\n  --accent:`) || css.includes(`:root[data-theme="${id}"] {\r\n  --accent:`) || id === 'turquoise', id + ' ranglari');
    assert.ok(css.includes(`.set-theme.t-${id} i`), id + ' namunasi');
    assert.equal((langs.match(new RegExp('\\b' + key + ':', 'g')) || []).length, 6, key + ' 6 tilda');
  }
  // Nomlar (2026-11-01, foydalanuvchi tanlovi): settings.js zaxira nomi = o'zbekcha tarjima, har tilda nomlar takrorlanmaydi
  const fallbacks = Object.fromEntries([...read('settings.js').match(/const THEMES = \[(.*)\];/)[1].matchAll(/\['\w+', '(\w+)', (['"])(.*?)\2\]/g)].map((m) => [m[1], m[3]]));
  const files = ['languages.js', 'lang-tr.js', 'lang-kk.js', 'lang-tg.js', 'lang-ky.js', 'lang-tk.js', 'lang-az.js', 'lang-zh.js', 'lang-it.js'];
  const names = {};
  for (const f of files) {
    const src = read(f);
    for (const [, , key] of settings) {
      [...src.matchAll(new RegExp('\\b' + key + ': "([^"]*)"', 'g'))].forEach((m, i) => { (names[f + i] = names[f + i] || []).push(m[1]); });
    }
  }
  assert.deepEqual(names['languages.js0'], settings.map((m) => fallbacks[m[2]]), "settings.js nomlari = o'zbekcha");
  assert.deepEqual(names['languages.js0'].slice(10), ['Zaytun', "O'rik", 'Nilufar', "Bug'doy", 'Yalpiz']);
  assert.equal(names['languages.js0'][2], 'Binafsha');
  for (const [k, v] of Object.entries(names)) assert.equal(new Set(v).size, v.length, k + ': mavzu nomlari takrorlanmasin ' + v);
});

test("C1: index.html dagi title / aria-label / placeholder matnlari tarjima qilinadi (data-i18n-*)", () => {
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  // Holatga qarab JS o'zi yozadigan tugmalar (sound/voice/menyu) va email namunalari bundan mustasno
  const JS_MANAGED = ['pgVoiceBtn', 'pgSoundBtn', 'sidebarToggle'];
  const bad = [];
  for (const tag of html.match(/<[a-z][^>]*>/gis) || []) {
    const id = (tag.match(/\sid="([^"]*)"/) || [])[1];
    if (JS_MANAGED.includes(id)) continue;
    for (const [, name, value] of tag.matchAll(/\s(title|aria-label|placeholder)="([^"]*)"/gi)) {
      if (!/\p{L}{2,}/u.test(value) || value.includes('@')) continue;
      const ok = name === 'placeholder' ? /data-i18n-placeholder=/.test(tag) || ['clubSearchInput', 'languageSearch'].includes(id) : /data-i18n-title=/.test(tag);
      if (!ok) bad.push(name + '="' + value + '"');
    }
  }
  assert.deepEqual(bad, []);
});

test("Yakuniy tekshiruv: faqat belgidan iborat tugmalar (✕ ← ➤ ⏮ 🗑 🔍 …) nomga ega — ekran o'quvchi «tugma» deb qoldirmaydi", () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const SERVER_ONLY = /^(server|database|league|mailer|backup|telegram|teamchess|fairplay-|push-texts|continents|daygif|lang-|languages|library-|museum-data|legal-content)/;
  const files = fs.readdirSync(root).filter((f) => (f.endsWith('.js') && !SERVER_ONLY.test(f)) || f === 'index.html');
  const bad = [];
  for (const f of files) {
    const s = fs.readFileSync(path.join(root, f), 'utf8');
    for (const m of s.matchAll(/>([^<>`{}]{1,12})<\/button>/g)) {
      const inner = m[1].trim();
      if (!inner || /[\p{L}\p{N}]/u.test(inner)) continue; // matn yoki raqam bor — nom shu
      const start = s.lastIndexOf('<button', m.index);
      if (start < 0) continue;
      const tag = s.slice(start, m.index + 1); // atributlarda ">" (masalan ">=") bo'lsa ham to'liq teg
      if (!/aria-label=|title=|data-i18n-title=/.test(tag)) bad.push(f + ':' + s.slice(0, start).split('\n').length + ' ' + JSON.stringify(inner));
    }
  }
  assert.deepEqual(bad, []);
});

test("C1: dona to'plamlari nomlari 15 tilda tarjima qilinadi va bir tilda takrorlanmaydi", () => {
  const fs = require('fs');
  const path = require('path');
  const vm = require('vm');
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const pieces = [...read('settings.js').match(/const PIECES = \[(.*)\];/)[1].matchAll(/\['(\w+)', (?:"[^"]*"|'[^']*'), '(\w+)'\]/g)];
  assert.equal(pieces.length, 15, "har to'plamda tarjima kaliti");
  const L = ['tr', 'kk', 'tg', 'ky', 'tk', 'az', 'zh', 'it'];
  const ctx = { console, localStorage: { getItem: () => null }, document: { querySelectorAll: () => [], getElementById: () => null, addEventListener() {} }, i18next: { init() {}, t: (k) => k, on() {} } };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(L.map((l) => read('lang-' + l + '.js')).join('\n') + '\n' + read('languages.js') + '\n;globalThis.__T = translations;', ctx);
  for (const l of ['uz', 'en', 'ru', 'es', 'de', 'fr', ...L]) {
    const names = pieces.map(([, , key]) => ctx.__T[l][key]);
    assert.ok(names.every(Boolean), l + ': ' + names);
    assert.equal(new Set(names).size, 15, l + ': takroriy nom ' + names);
  }
  assert.equal(ctx.__T.en.pcSetCute, 'Cute');
  assert.equal(ctx.__T.ru.pcSetWood, 'Дерево');
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

test("Taxta ko'rinishlari: 14 ta + 'Mavzuga mos', barcha ro'yxatlar, CSS va 6 tildagi nomlar bir xil", () => {
  const fs = require('fs');
  const path = require('path');
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const list = (src, re) => JSON.parse(src.match(re)[1].replace(/'/g, '"'));
  const styles = list(read('script.js'), /window\.BOARD_STYLES = (\[[^\]]*\])/);
  assert.equal(styles.length, 14);
  assert.ok(!styles.includes('atlas'), "Atlas taxtasi olib tashlangan (2026-11-01)");
  assert.deepEqual(list(headHtml(read), /(\["marble"[^\]]*\])\.indexOf\(cdSettings\.boardStyle\)/), styles, 'index.html <head>');
  const settings = [...read('settings.js').match(/const BOARDS = \[(.*)\];/)[1].matchAll(/\['(\w+)', '(\w+)'/g)];
  assert.deepEqual(settings.map((m) => m[1]), ['auto', ...styles], 'settings.js BOARDS');
  assert.match(read('settings.js'), /boardStyle: 'auto'/, "standart — mavzuga mos");
  const css = read('style.css');
  const langs = read('languages.js');
  for (const [, id, key] of settings) {
    if (id !== 'auto') assert.ok(css.includes(`:root[data-board="${id}"], .bd-${id} {`), id + ' CSS');
    assert.equal((langs.match(new RegExp('\\b' + key + ':', 'g')) || []).length, 6, key + ' 6 tilda');
  }
  assert.ok(css.includes('.bd-auto {'), "'Mavzuga mos' namunasi");
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
