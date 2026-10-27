// Qo'shimcha tillar (Türkçe — 'tr', Қазақша — 'kk'): har inglizcha kalitning tarjimasi bor, {{o'zgaruvchi}}lar bir xil,
// server matnlari (push, bot), shahar/bayram nomlari, kutubxona, huquqiy sahifa va ovozli yurish ham shu tilda
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
// [kod, library.js LANGS dagi o'rni, til nomi, kutubxona fayli]
const LANGS = [['tr', 6, 'Türkçe'], ['kk', 7, 'Қазақша']];

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
  assert.equal(T.tr.mHome, 'Ana sayfa');
  assert.equal(T.kk.mHome, 'Басты бет');
});

test("Qo'shimcha tillar: til ro'yxatlarida bor (sayt, sozlamalar, huquqiy sahifa, server)", () => {
  const index = read('index.html'), server = read('server.js');
  for (const [l, , name] of LANGS) {
    assert.match(read('script.js'), new RegExp("code: '" + l.toUpperCase() + "', name: '" + name + "'"));
    assert.match(read('settings.js'), new RegExp("\\['" + l + "', '\\w+', '" + name + "'\\]"));
    assert.match(read('legal.html'), new RegExp("\\['" + l + "', '" + name + "'\\]"));
    assert.ok(index.indexOf('<script src="lang-' + l + '.js">') > 0 && index.indexOf('<script src="lang-' + l + '.js">') < index.indexOf('<script src="languages.js">'), l + ': lang fayli languages.js dan oldin');
    const lib = index.indexOf('<script src="library-' + l + '.js">');
    assert.ok(lib > index.indexOf('<script src="library-articles.js">') && lib < index.indexOf('<script src="library.js">'), l + ': kutubxona fayli tartibda');
    assert.match(server, new RegExp('LIBRARY_LANGS = \\[[^\\]]*\'' + l + '\''));
  }
  assert.match(server, /tr: 'Misafir'/);
  assert.match(server, /kk: 'Қонақ'/);
  // library.js dagi tartib library-<til>.js dagi indeks bilan bir xil
  const libLangs = read('library.js').match(/const LANGS = (\[[^\]]+\])/)[1];
  for (const [l, i] of LANGS) assert.equal(JSON.parse(libLangs.replace(/'/g, '"')).indexOf(l), i, l);
});

test("Qo'shimcha tillar: push, Telegram bot, shahar va bayram nomlari", () => {
  const push = require('../push-texts');
  assert.equal(push.pushMessage('caravan_city', { city: 'samarkand' }, 'tr').body, '🐪 Kervanın Semerkant şehrine ulaştı!');
  assert.equal(push.pushMessage('caravan_city', { city: 'samarkand' }, 'kk').body, '🐪 Керуеніңіз Самарқанд қаласына жетті!');
  assert.equal(push.pushMessage('message', { from: 'Ali', preview: '🎨' }, 'tr').body, 'Ali: 🎨 Çıkartma');
  assert.match(push.pushMessage('holiday_badge', { holiday: 'navruz', year: 2027 }, 'tr').body, /Nevruz 2027/);
  assert.match(push.pushMessage('holiday_badge', { holiday: 'navruz', year: 2027 }, 'kk').body, /Наурыз 2027/);
  assert.match(push.botText('help', 'tr'), /\/invite — arkadaşlar/);
  assert.match(push.botText('help', 'kk'), /\/invite — достарға/);
  assert.equal(push.langOf('tr-TR'), 'tr');
  assert.equal(push.langOf('kk'), 'kk');
  const Caravan = require('../caravan'), Holidays = require('../holidays');
  assert.equal(Caravan.cityName('istanbul', 'tr'), 'İstanbul');
  assert.equal(Caravan.cityName('istanbul', 'kk'), 'Ыстамбұл');
  assert.equal(Holidays.name('qurbon', 'tr'), 'Kurban Bayramı');
  assert.equal(Holidays.name('qurbon', 'kk'), 'Құрбан айт');
  for (const c of Caravan.CITIES) assert.equal(c.names.length, 8, c.key);
  // Noma'lum til — inglizcha
  assert.equal(Caravan.cityName('xian', 'ky'), "Xi'an");
});

test("Qo'shimcha tillar: kutubxona (maqolalar, partiyalar, kitoblar) va huquqiy sahifa", () => {
  const ctx = { console };
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext([read('library-data.js'), read('library-articles.js')].concat(LANGS.map(([l]) => read('library-' + l + '.js'))).join('\n'), ctx);
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
    assert.deepEqual(Object.keys(t.credits), Object.keys(en.credits));
    assert.deepEqual(Object.keys(t.ui), Object.keys(en.ui));
  }
  assert.equal(ctx.LibraryArticles.find((a) => a.id === 'fork').title[7], 'Тактика: шанышқы');
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
});
