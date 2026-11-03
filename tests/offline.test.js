// Internetsiz sahifa (offline.html): o'yinlar mantig'i, 14 tildagi matnlar, service worker keshidagi fayllar
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { Chess } = require('chess.js');
const Shatranj = require('../shatranj.js');
const G = require('../offline-games.js');
const TEXTS = require('../offline-texts.js');
const { startServer } = require('./helpers');

const ROOT = path.join(__dirname, '..');
const seeded = (seed) => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
// sw.js dagi PRECACHE ro'yxati (service worker kodini sandbox'da bajarib olinadi)
function precacheList() {
  const box = { self: { addEventListener() {} }, caches: {}, fetch() {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8') + '\nthis.__list = PRECACHE;', box);
  return box.__list;
}

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

test("Internetsiz sahifa: barcha o'yin fayllari service worker keshida va server ularni beradi", async () => {
  const list = precacheList();
  const html = fs.readFileSync(path.join(ROOT, 'offline.html'), 'utf8');
  // Sahifa yuklaydigan har bir skript va dona rasmi keshda bo'lishi shart — aks holda tarmoqsiz ochilmaydi
  for (const src of html.match(/src="([^"]+)"/g).map((s) => s.slice(5, -1))) assert.ok(list.includes(src), 'keshda yo\'q: ' + src);
  for (const c of 'wb') for (const p of 'KQRBNP') assert.ok(list.includes('/img/chesspieces/karvon/' + c + p + '.svg'));
  for (const n of ['move', 'capture', 'game-end']) assert.ok(list.includes('/assets/sounds/wood/' + n + '.wav'));
  for (const f of list) assert.equal((await fetch(srv.base + f)).status, 200, f);
  // Sahifada 5 ta o'yin va saqlangan yozuv
  for (const g of ['local', 'squares', 'coins', 'memory', 'tour']) assert.ok(html.includes('data-game="' + g + '"'), g);
  assert.ok(html.includes('data-t="title"') && html.includes('data-t="retry"'));
});

test("Internetsiz sahifa: matnlar 14 tilda, kalitlar va {o'zgaruvchilar} bir xil", () => {
  const LANGS = ['uz', 'en', 'ru', 'es', 'de', 'fr', 'tr', 'kk', 'tg', 'ky', 'tk', 'az', 'zh', 'it'];
  assert.deepEqual(Object.keys(TEXTS).sort(), LANGS.slice().sort());
  const keys = Object.keys(TEXTS.en).sort();
  const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
  for (const l of LANGS) {
    assert.deepEqual(Object.keys(TEXTS[l]).sort(), keys, l);
    for (const k of keys) {
      assert.ok(TEXTS[l][k].trim(), l + '.' + k);
      assert.equal(vars(TEXTS[l][k]), vars(TEXTS.en[k]), l + '.' + k);
    }
  }
  // Sahifadagi data-t kalitlari ham bor
  const html = fs.readFileSync(path.join(ROOT, 'offline.html'), 'utf8');
  for (const m of html.matchAll(/data-t(?:-label)?="(\w+)"/g)) assert.ok(keys.includes(m[1]), m[1]);
  // Kodda t('…') bilan ishlatilgan kalitlar
  const js = fs.readFileSync(path.join(ROOT, 'offline-games.js'), 'utf8');
  for (const m of js.matchAll(/\bt\('(\w+)'[,)]/g)) assert.ok(keys.includes(m[1]), m[1]);
  // Tugash sabablari: t('r' + Sabab)
  for (const r of ['mate', 'stalemate', 'timeout', 'resign', 'agree', 'repeat', 'fifty', 'insuf', 'bare']) assert.ok(keys.includes('r' + r[0].toUpperCase() + r.slice(1)), r);
});

test('Karvon tangalari: tuya yurishlari, eng kam yurish va darajalar', () => {
  const I = G.index;
  assert.deepEqual(G.knightTargets(I('a1')).map(G.name).sort(), ['b3', 'c2']);
  assert.deepEqual(G.knightTargets(I('a1'), new Set([I('b3')])).map(G.name), ['c2']);
  assert.equal(G.distances(I('a1'))[I('h8')], 6);
  assert.equal(G.coinPar(I('a1'), [I('c5'), I('b3')]), 2); // tartib muhim emas: a1 → b3 → c5
  assert.equal(G.coinPar(I('a1'), [I('h8')], new Set([I('b3'), I('c2')])), Infinity);
  for (let level = 1; level <= 12; level++) {
    const lv = G.coinsLevel(level, seeded(level));
    assert.equal(lv.coins.length, Math.min(level + 1, 8));
    assert.equal(lv.rocks.length, level >= 4 ? Math.min(level - 3, 8) : 0);
    assert.equal(new Set([lv.start, ...lv.coins, ...lv.rocks]).size, 1 + lv.coins.length + lv.rocks.length, 'kataklar takrorlanmaydi');
    assert.ok(Number.isFinite(lv.par) && lv.par >= lv.coins.length);
    // Eng kam yurish haqiqatan erishiladi: tangalarni mos tartibda yig'ib chiqish (BFS bilan tekshiramiz)
    assert.equal(lv.par, G.coinPar(lv.start, lv.coins.slice().reverse(), new Set(lv.rocks)));
  }
});

test('Ot sayohati: maslahat qonuniy yurish beradi va deyarli har katakdan butun taxtani aylanadi', () => {
  let full = 0;
  for (let s = 0; s < 64; s++) {
    const v = new Set([s]);
    let p = s;
    for (;;) {
      const h = G.tourHint(p, v);
      if (h < 0) break;
      assert.ok(G.tourMoves(p, v).includes(h));
      v.add(h); p = h;
    }
    if (v.size === 64) full++;
  }
  assert.ok(full >= 60, 'to\'liq sayohatlar: ' + full);
});

test('Pozitsiyani eslab qol: dona soni, ikkala shoh, piyodalar chetda emas, solishtirish', () => {
  for (let level = 1; level <= 15; level++) {
    const pos = G.memoryPosition(level, seeded(level * 7));
    const list = Object.entries(pos);
    assert.equal(list.length, Math.min(level + 2, 14));
    assert.ok(list.some(([, p]) => p === 'wK') && list.some(([, p]) => p === 'bK'));
    for (const [sq, p] of list) if (p[1] === 'P') assert.ok(!/[18]$/.test(sq), sq);
  }
  const target = { e1: 'wK', e8: 'bK', d4: 'wQ' };
  assert.deepEqual(G.compareMemory(target, { e1: 'wK', e8: 'bK', d4: 'wQ' }), { correct: 3, total: 3, extra: 0, pass: true });
  assert.equal(G.compareMemory(target, { e1: 'wK', e8: 'bK', d5: 'wQ' }).pass, false);
  assert.equal(G.compareMemory(target, { e1: 'wK', e8: 'bK', d4: 'bQ' }).correct, 2);
});

test("Ikki kishi bir qurilmada: mat, pat, Shatranj natijalari va vaqt tugashi", () => {
  const c = new Chess();
  for (const m of ['f3', 'e5', 'g4', 'Qh4#']) c.move(m);
  assert.deepEqual(G.outcome(c, 'standard'), { winner: 'b', reason: 'mate' });
  assert.deepEqual(G.outcome(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'), 'standard'), { winner: null, reason: 'stalemate' });
  assert.equal(G.outcome(new Chess(), 'standard'), null);
  // Shatranj'da pat qilgan tomon yutadi
  assert.deepEqual(G.outcome(new Shatranj('7k/6R1/5K2/8/8/8/8/8 b - - 0 1'), 'shatranj'), { winner: 'w', reason: 'stalemate' });
  // Vaqt tugadi: raqibda faqat shoh — durrang, aks holda g'alaba
  assert.deepEqual(G.timeoutResult(new Chess('7k/8/8/8/8/8/8/K6Q w - - 0 1'), 'w', 'standard'), { winner: null, reason: 'insuf' });
  assert.deepEqual(G.timeoutResult(new Chess('7k/8/8/8/8/8/8/K6Q w - - 0 1'), 'b', 'standard'), { winner: 'w', reason: 'timeout' });
});
