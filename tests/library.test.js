// 📚 Kutubxona: mashhur partiyalar qonuniy va natijasi to'g'ri, barcha matnlar 6 tilda, kitoblar jamoat mulki, sahifa manzili
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { Chess } = require('chess.js');
const D = require('../library-data');
const ARTICLES = require('../library-articles');
const { startServer } = require('./helpers');

const six = (arr, what) => {
  assert.ok(Array.isArray(arr) && arr.length === 6, what + ': 6 til');
  arr.forEach((s, i) => assert.ok(typeof s === 'string' && s.trim().length > 2, what + ' [' + i + '] bo\'sh'));
};

test("Mashhur partiyalar: har yurish qonuniy, mat bilan tugaydi va natija g'olibga mos", () => {
  const ids = new Set();
  for (const g of D.GAMES) {
    assert.ok(!ids.has(g.id), 'takroriy id ' + g.id); ids.add(g.id);
    const c = new Chess();
    for (const san of D.sansOf(g.pgn)) assert.ok(c.move(san), `${g.id}: noqonuniy yurish ${san}`);
    assert.ok(c.in_checkmate(), g.id + ': oxiri mat');
    // Mat qilingan tomon — navbatdagi tomon: yutqazgan
    assert.equal(g.result, c.turn() === 'b' ? '1-0' : '0-1', g.id + ' natija');
    assert.ok(g.year >= 1400 && g.year <= 2026 && g.white && g.black && g.place);
    six(g.title, g.id + '.title'); six(g.story, g.id + '.story');
  }
  assert.ok(D.GAMES.length >= 7);
});

test("Kitoblar: muallif 70 yildan oldin vafot etgan (jamoat mulki), Gutenberg raqami, 6 tilda izoh", () => {
  for (const b of D.BOOKS) {
    assert.ok(Number.isInteger(b.gutenberg) && b.gutenberg > 0, b.id);
    const years = String(b.life).match(/\d{4}/g).map(Number);
    assert.ok(Math.max(...years) <= 1955, b.id + ': muallif ' + b.life + ' — hayot + 70 yil');
    six(b.desc, b.id + '.desc');
  }
});

test("Qo'llanmalar: noyob id, sarlavha, kirish va har band 6 tilda", () => {
  const ids = new Set();
  for (const a of ARTICLES) {
    assert.ok(!ids.has(a.id)); ids.add(a.id);
    six(a.title, a.id + '.title'); six(a.lead, a.id + '.lead');
    assert.ok(a.points.length >= 4, a.id);
    a.points.forEach((p, i) => six(p, a.id + '.points[' + i + ']'));
  }
});

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

test("Sahifa: /kutubxona ochiladi (SEO sarlavha), sitemap'da bor, ma'lumot fayllari ommaviy", async () => {
  const r = await fetch(srv.base + '/kutubxona');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /<title>[^<]*Chess library/);
  assert.match(await (await fetch(srv.base + '/sitemap.xml')).text(), /\/kutubxona</);
  for (const f of ['library.js', 'library-data.js', 'library-articles.js']) assert.equal((await fetch(srv.base + '/' + f)).status, 200, f);
});
