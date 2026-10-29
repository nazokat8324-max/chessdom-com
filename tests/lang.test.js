// Qo'shimcha tillar (Türkçe, Қазақша, Тоҷикӣ, Кыргызча, Türkmençe, Azərbaycanca): har inglizcha kalitning tarjimasi bor,
// {{o'zgaruvchi}}lar bir xil, server matnlari (push, bot), shahar/bayram nomlari, kutubxona, huquqiy sahifa va ovozli yurish ham shu tilda
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
// [kod, library.js LANGS dagi o'rni, til nomi, kutubxona fayli]
const LANGS = [['tr', 6, 'Türkçe', 'library-tr.js'], ['kk', 7, 'Қазақша', 'library-kk.js'], ['tg', 8, 'Тоҷикӣ', 'library-more.js'],
  ['ky', 9, 'Кыргызча', 'library-more.js'], ['tk', 10, 'Türkmençe', 'library-more.js'], ['az', 11, 'Azərbaycanca', 'library-more.js']];
const LIB_FILES = [...new Set(LANGS.map((x) => x[3]))];

function loadTranslations() {
  const ctx = { console, localStorage: { getItem: () => null }, document: { querySelectorAll: () => [], getElementById: () => null, addEventListener() {} }, i18next: { init() {}, t: (k) => k, on() {} } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(LANGS.map(([l]) => read('lang-' + l + '.js')).join('\n') + '\n' + read('languages.js') + '\n;globalThis.__T = translations;', ctx);
  return ctx.__T;
}
const vars = (s) => (String(s).match(/\{\{?\w+\}?\}/g) || []).sort().join(',');

test("Qo'shimcha tillar: har inglizcha kalit tarjima qilingan, o'zgaruvchilar bir xil, ortiqcha kalit yo'q", () => {
  const T = loadTranslations();
  for (const [l] of LANGS) {
    assert.ok(T[l], 'translations.' + l + ' bor');
    assert.deepEqual(Object.keys(T.en).filter((k) => !(k in T[l])), [], l + ': tarjimasiz kalitlar');
    assert.deepEqual(Object.keys(T[l]).filter((k) => !(k in T.en)), [], l + ": inglizchada yo'q kalitlar");
    assert.deepEqual(Object.keys(T.en).filter((k) => vars(T.en[k]) !== vars(T[l][k])), [], l + ": o'zgaruvchilari mos emas");
  }
  const home = { tr: 'Ana sayfa', kk: 'Басты бет', tg: 'Саҳифаи асосӣ', ky: 'Башкы бет', tk: 'Baş sahypa', az: 'Ana səhifə' };
  for (const l of Object.keys(home)) assert.equal(T[l].mHome, home[l], l);
});

test("Qo'shimcha tillar: til ro'yxatlarida bor (sayt, sozlamalar, huquqiy sahifa, server)", () => {
  const index = read('index.html'), server = read('server.js');
  for (const [l, , name, libFile] of LANGS) {
    assert.match(read('script.js'), new RegExp("code: '" + l.toUpperCase() + "', name: '" + name + "'"));
    assert.match(read('settings.js'), new RegExp("\\['" + l + "', '\\w+', '" + name + "'\\]"));
    assert.match(read('legal.html'), new RegExp("\\['" + l + "', '" + name + "'\\]"));
    const lang = index.indexOf('<script src="lang-' + l + '.js">');
    assert.ok(lang > 0 && lang < index.indexOf('<script src="languages.js">'), l + ': lang fayli languages.js dan oldin');
    const lib = index.indexOf('<script src="' + libFile + '">');
    assert.ok(lib > index.indexOf('<script src="library-articles.js">') && lib < index.indexOf('<script src="library.js">'), l + ': kutubxona fayli tartibda');
    assert.match(server, new RegExp("LIBRARY_LANGS = \\[[^\\]]*'" + l + "'"));
  }
  assert.match(server, /tr: 'Misafir', kk: 'Қонақ', tg: 'Меҳмон', ky: 'Конок', tk: 'Myhman', az: 'Qonaq'/);
  // library.js dagi tartib kutubxona fayllaridagi indeks bilan bir xil
  const libLangs = JSON.parse(read('library.js').match(/const LANGS = (\[[^\]]+\])/)[1].replace(/'/g, '"'));
  for (const [l, i] of LANGS) assert.equal(libLangs.indexOf(l), i, l);
});

test("Qo'shimcha tillar: push, Telegram bot, shahar va bayram nomlari", () => {
  const push = require('../push-texts');
  const Caravan = require('../caravan'), Holidays = require('../holidays');
  assert.equal(push.pushMessage('caravan_city', { city: 'samarkand' }, 'tr').body, '🐪 Kervanın Semerkant şehrine ulaştı!');
  assert.equal(push.pushMessage('caravan_city', { city: 'samarkand' }, 'kk').body, '🐪 Керуеніңіз Самарқанд қаласына жетті!');
  assert.equal(push.pushMessage('caravan_city', { city: 'bukhara' }, 'tg').body, '🐪 Корвони шумо ба Бухоро расид!');
  assert.equal(push.pushMessage('message', { from: 'Ali', preview: '🎨' }, 'tr').body, 'Ali: 🎨 Çıkartma');
  assert.match(push.pushMessage('holiday_badge', { holiday: 'navruz', year: 2027 }, 'kk').body, /Наурыз 2027/);
  assert.match(push.pushMessage('holiday_badge', { holiday: 'navruz', year: 2027 }, 'az').body, /Novruz 2027/);
  for (const [l] of LANGS) {
    assert.equal(push.langOf(l), l);
    assert.notEqual(push.pushMessage('generic', {}, l).body, push.pushMessage('generic', {}, 'en').body, l + ': push tarjima qilingan');
    assert.match(push.botText('help', l), /\/invite/);
    assert.notEqual(push.botText('help', l), push.botText('help', 'en'), l + ': bot tarjima qilingan');
  }
  for (const c of Caravan.CITIES) assert.equal(c.names.length, Caravan.CITIES[0].names.length, c.key);
  assert.equal(Caravan.CITIES[0].names.length, 12);
  const city = { tr: 'İstanbul', kk: 'Ыстамбұл', tg: 'Истанбул', ky: 'Стамбул', tk: 'Stambul', az: 'İstanbul' };
  for (const l of Object.keys(city)) assert.equal(Caravan.cityName('istanbul', l), city[l], l);
  const nav = { tr: 'Nevruz', kk: 'Наурыз', tg: 'Наврӯз', ky: 'Нооруз', tk: 'Nowruz', az: 'Novruz' };
  for (const l of Object.keys(nav)) assert.equal(Holidays.name('navruz', l), nav[l], l);
  // Noma'lum til — inglizcha
  assert.equal(Caravan.cityName('xian', 'xx'), "Xi'an");
});

test("Qo'shimcha tillar: kutubxona (maqolalar, partiyalar, kitoblar) va huquqiy sahifa", () => {
  const ctx = { console };
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext([read('library-data.js'), read('library-articles.js')].concat(LIB_FILES.map(read)).join('\n'), ctx);
  const lc = { console }; lc.window = lc;
  vm.createContext(lc);
  vm.runInContext(read('legal-content.js'), lc);
  const en = lc.LEGAL_TEXT.en;
  const shape = (d) => JSON.stringify(d.sections.map((s) => s[1].map((b) => (Array.isArray(b) ? b.length : 1))));
  for (const [l, i] of LANGS) {
    const miss = [];
    ctx.LibraryArticles.forEach((a) => {
      [a.title, a.lead, ...a.points].forEach((x) => { if (!x[i]) miss.push(a.id); });
      if (a.example && !a.example.caption[i]) miss.push(a.id + ':caption');
    });
    ctx.LibraryData.GAMES.forEach((g) => { if (!g.title[i] || !g.story[i]) miss.push(g.id); });
    ctx.LibraryData.BOOKS.forEach((b) => { if (!b.desc[i]) miss.push(b.id); });
    assert.deepEqual(miss, [], l + ': kutubxona');
    const t = lc.LEGAL_TEXT[l];
    assert.ok(t, l + ': huquqiy matn');
    for (const d of ['privacy', 'terms']) assert.equal(shape(t[d]), shape(en[d]), l + ' ' + d);
    // Uchinchi tomon xizmatlari saytda ishlatilganlarga mos: domen va DNS — Cloudflare
    assert.match(JSON.stringify(t.privacy), /Cloudflare — [^"]*chesscaravan\.com/, l + ': Cloudflare (domen)');
    assert.deepEqual(Object.keys(t.credits), Object.keys(en.credits));
    assert.deepEqual(Object.keys(t.ui), Object.keys(en.ui));
  }
  const fork = ctx.LibraryArticles.find((a) => a.id === 'fork').title;
  assert.equal(fork[7], 'Тактика: шанышқы');
  assert.equal(fork[11], 'Taktika: çəngəl');
});

test("Qo'shimcha tillar: ovozli yurish so'zlari", () => {
  const V = require('../voice');
  assert.deepEqual(V.parseSpoken('at f3'), { castle: null, piece: 'n', squares: ['f3'], promo: null });
  assert.equal(V.parseSpoken('vezir h5').piece, 'q');
  assert.deepEqual(V.parseSpoken('e dört').squares, ['e4']);
  assert.equal(V.parseSpoken('kısa rok').castle, 'short');
  assert.equal(V.parseSpoken('uzun rok').castle, 'long');
  assert.equal(V.parseSpoken('brokoli e4').castle, null);
  assert.equal(V.moveToWords({ piece: 'r', from: 'a1', to: 'd1', san: 'Rd1+' }, 'tr'), 'kale d 1, şah');
  // Қазақша
  assert.equal(V.parseSpoken('ат f3').piece, 'n');
  assert.equal(V.parseSpoken('тураны d1').piece, 'r');
  assert.deepEqual(V.parseSpoken('е төрт').squares, ['e4']);
  assert.equal(V.parseSpoken('қысқа рокировка').castle, 'short');
  assert.equal(V.parseSpoken('ұзын рокировка').castle, 'long');
  assert.equal(V.moveToWords({ piece: 'n', from: 'g1', to: 'f3', san: 'Nf3#' }, 'kk'), 'ат f 3, мат');
  // Тоҷикӣ, Кыргызча, Türkmençe, Azərbaycanca
  assert.equal(V.parseSpoken('асп f3').piece, 'n');
  assert.equal(V.parseSpoken('пиёда e4').piece, 'p');
  assert.deepEqual(V.parseSpoken('е чор').squares, ['e4']);
  assert.equal(V.parseSpoken('кыска рокировка').castle, 'short');
  assert.equal(V.parseSpoken('пил c4').piece, 'b');
  assert.equal(V.parseSpoken('gysga rokirowka').castle, 'short');
  assert.equal(V.parseSpoken('ladýa d1').piece, 'r');
  assert.equal(V.parseSpoken('uzun qala').castle, 'long');
  assert.equal(V.parseSpoken('vəzir h5').piece, 'q');
  assert.equal(V.parseSpoken('qalaba e4').castle, null);
  assert.equal(V.moveToWords({ piece: 'b', from: 'f1', to: 'c4', san: 'Bc4+' }, 'tg'), 'фил c 4, кишт');
});
