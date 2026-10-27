// Qo'shimcha tillar (hozircha Türkçe — 'tr'): har inglizcha kalitning tarjimasi bor, {{o'zgaruvchi}}lar bir xil,
// server matnlari (push, bot), shahar/bayram nomlari, kutubxona, huquqiy sahifa va ovozli yurish ham shu tilda
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

function loadTranslations() {
  const ctx = { console, localStorage: { getItem: () => null }, document: { querySelectorAll: () => [], getElementById: () => null, addEventListener() {} }, i18next: { init() {}, t: (k) => k, on() {} } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('lang-tr.js') + '\n' + read('languages.js') + '\n;globalThis.__T = translations;', ctx);
  return ctx.__T;
}
const vars = (s) => (String(s).match(/\{\{?\w+\}?\}/g) || []).sort().join(',');

test("Türkçe: har inglizcha kalit tarjima qilingan, o'zgaruvchilar bir xil, ortiqcha kalit yo'q", () => {
  const T = loadTranslations();
  assert.ok(T.tr, 'translations.tr bor');
  const missing = Object.keys(T.en).filter((k) => !(k in T.tr));
  assert.deepEqual(missing, [], 'tarjimasiz kalitlar');
  const extra = Object.keys(T.tr).filter((k) => !(k in T.en));
  assert.deepEqual(extra, [], 'inglizchada yo\'q kalitlar');
  const bad = Object.keys(T.en).filter((k) => vars(T.en[k]) !== vars(T.tr[k]));
  assert.deepEqual(bad, [], "o'zgaruvchilari mos emas");
  assert.equal(T.tr.mHome, 'Ana sayfa');
});

test("Türkçe: til ro'yxatlarida bor (sayt, sozlamalar, huquqiy sahifa, server)", () => {
  assert.match(read('script.js'), /code: 'TR', name: 'Türkçe'/);
  assert.match(read('settings.js'), /\['tr', 'tr', 'Türkçe'\]/);
  assert.match(read('legal.html'), /\['tr', 'Türkçe'\]/);
  assert.match(read('index.html'), /<script src="lang-tr\.js"><\/script>\s*<script src="languages\.js">/);
  assert.match(read('index.html'), /<script src="library-articles\.js"><\/script>\s*<script src="library-tr\.js"><\/script>\s*<script src="library\.js">/);
  const server = read('server.js');
  assert.match(server, /tr: 'Misafir'/);
  assert.match(server, /LIBRARY_LANGS = \[[^\]]*'tr'\]/);
});

test('Türkçe: push, Telegram bot, shahar va bayram nomlari', () => {
  const push = require('../push-texts');
  assert.equal(push.pushMessage('caravan_city', { city: 'samarkand' }, 'tr').body, '🐪 Kervanın Semerkant şehrine ulaştı!');
  assert.equal(push.pushMessage('message', { from: 'Ali', preview: '🎨' }, 'tr').body, 'Ali: 🎨 Çıkartma');
  assert.match(push.pushMessage('holiday_badge', { holiday: 'navruz', year: 2027 }, 'tr').body, /Nevruz 2027/);
  assert.match(push.botText('help', 'tr'), /\/invite — arkadaşlar/);
  assert.equal(push.langOf('tr-TR'), 'tr');
  assert.equal(require('../caravan').cityName('istanbul', 'tr'), 'İstanbul');
  assert.equal(require('../holidays').name('qurbon', 'tr'), 'Kurban Bayramı');
  // Noma'lum til — inglizcha
  assert.equal(require('../caravan').cityName('xian', 'kk'), "Xi'an");
});

test('Türkçe: kutubxona (maqolalar, partiyalar, kitoblar) va huquqiy sahifa', () => {
  const ctx = { console };
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('library-data.js') + '\n' + read('library-articles.js') + '\n' + read('library-tr.js'), ctx);
  const miss = [];
  ctx.LibraryArticles.forEach((a) => {
    [a.title, a.lead, ...a.points].forEach((x) => { if (!x[6]) miss.push(a.id); });
    if (a.example && !a.example.caption[6]) miss.push(a.id + ':caption');
  });
  ctx.LibraryData.GAMES.forEach((g) => { if (!g.title[6] || !g.story[6]) miss.push(g.id); });
  ctx.LibraryData.BOOKS.forEach((b) => { if (!b.desc[6]) miss.push(b.id); });
  assert.deepEqual(miss, []);
  // Huquqiy matn tuzilishi inglizcha bilan bir xil
  const lc = { console }; lc.window = lc;
  vm.createContext(lc);
  vm.runInContext(read('legal-content.js'), lc);
  const en = lc.LEGAL_TEXT.en, tr = lc.LEGAL_TEXT.tr;
  const shape = (d) => JSON.stringify(d.sections.map((s) => s[1].map((b) => (Array.isArray(b) ? b.length : 1))));
  for (const d of ['privacy', 'terms']) assert.equal(shape(tr[d]), shape(en[d]), d);
  assert.deepEqual(Object.keys(tr.credits), Object.keys(en.credits));
  assert.deepEqual(Object.keys(tr.ui), Object.keys(en.ui));
});

test('Türkçe: ovozli yurish so\'zlari', () => {
  const V = require('../voice');
  assert.deepEqual(V.parseSpoken('at f3'), { castle: null, piece: 'n', squares: ['f3'], promo: null });
  assert.equal(V.parseSpoken('vezir h5').piece, 'q');
  assert.deepEqual(V.parseSpoken('e dört').squares, ['e4']);
  assert.equal(V.parseSpoken('kısa rok').castle, 'short');
  assert.equal(V.parseSpoken('uzun rok').castle, 'long');
  assert.equal(V.parseSpoken('brokoli e4').castle, null);
  assert.equal(V.moveToWords({ piece: 'r', from: 'a1', to: 'd1', san: 'Rd1+' }, 'tr'), 'kale d 1, şah');
});
