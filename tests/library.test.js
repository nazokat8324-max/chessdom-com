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
    if (g.reason === 'resign') {
      assert.ok(!c.in_checkmate() && ['1-0', '0-1'].includes(g.result), g.id + ': taslim bilan tugagan');
    } else {
      assert.ok(c.in_checkmate(), g.id + ': oxiri mat');
      // Mat qilingan tomon — navbatdagi tomon: yutqazgan
      assert.equal(g.result, c.turn() === 'b' ? '1-0' : '0-1', g.id + ' natija');
    }
    assert.ok(g.year >= 1400 && g.year <= 2026 && g.white && g.black && g.place);
    six(g.title, g.id + '.title'); six(g.story, g.id + '.story');
  }
  assert.ok(D.GAMES.length >= 11);
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
    if (a.example) {
      assert.ok(new Chess(a.example.fen).fen(), a.id + ': FEN');
      a.example.marks.forEach((m) => assert.match(m, /^[a-h][1-8]$/));
      six(a.example.caption, a.id + '.example');
    }
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

test("Admin kutubxonasi: faqat admin; maqola, partiya (PGN tekshiriladi), havola; ro'yxat, tahrir, o'chirish, jurnal", async () => {
  const path = require('path');
  const sqlite3 = require('sqlite3');
  const run = (q, p) => new Promise((res, rej) => { const d = new sqlite3.Database(path.join(srv.dir, 'test.sqlite')); d.run(q, p || [], (e) => { d.close(); e ? rej(e) : res(); }); });
  const adm = await srv.register('LibAdm'), usr = await srv.register('LibUsr');
  await run("UPDATE users SET role = 'admin' WHERE id = ?", [adm.id]);
  const post = (u, url, body) => srv.api(u, url, 'POST', body);
  assert.equal((await post(usr, '/api/admin/library', { kind: 'article', title: 'Salom', body: 'x'.repeat(40) })).status, 403);
  assert.equal((await post(null, '/api/admin/library', { kind: 'article', title: 'Salom', body: 'x'.repeat(40) })).status, 401);
  // Maqola
  const a = await post(adm, '/api/admin/library', { kind: 'article', lang: 'uz', title: 'Mening maqolam', lead: 'Kirish', body: "Birinchi band matni.\n\nIkkinchi band matni." });
  assert.equal(a.success, true, JSON.stringify(a));
  assert.equal((await post(adm, '/api/admin/library', { kind: 'article', title: 'X', body: 'qisqa' })).status, 400);
  // Partiya: noqonuniy PGN rad etiladi, to'g'risi SAN ro'yxatiga aylanadi (sarlavhalar, raqamlar, izohlar olib tashlanadi)
  assert.equal((await post(adm, '/api/admin/library', { kind: 'game', title: 'Yomon', white: 'A', black: 'B', pgn: '1.e4 e5 2.Ke3 Ke6 3.Kxe5' })).status, 400);
  const g = await post(adm, '/api/admin/library', { kind: 'game', title: 'Ahmoqona mat', white: 'Oq', black: 'Qora', result: '0-1', year: 2026,
    pgn: '[Event "Sinov"]\n1. f3 {yomon} e5 2. g4?? Qh4# 0-1' });
  assert.equal(g.success, true, JSON.stringify(g));
  // Havola: faqat http(s)
  assert.equal((await post(adm, '/api/admin/library', { kind: 'book', title: 'Xavfli', url: 'javascript:alert(1)' })).status, 400);
  const b = await post(adm, '/api/admin/library', { kind: 'book', title: 'Mening kitobim', author: 'Men', url: 'https://example.org/kitob', desc: 'Izoh' });
  assert.equal(b.success, true);
  let list = (await srv.api(null, '/api/library')).items;
  assert.equal(list.length, 3);
  const game = list.find((x) => x.kind === 'game');
  assert.deepEqual({ moves: game.moves, reason: game.reason, author: game.author }, { moves: ['f3', 'e5', 'g4', 'Qh4#'], reason: 'checkmate', author: adm.name });
  assert.equal(list.find((x) => x.kind === 'article').lang, 'uz');
  // Tahrirlash va o'chirish
  assert.equal((await post(adm, '/api/admin/library', { id: a.id, kind: 'article', lang: '', title: 'Yangi sarlavha', body: "Yangilangan matn — yetarlicha uzun." })).success, true);
  assert.equal((await post(adm, '/api/admin/library', { id: 'yoq-id', kind: 'article', title: 'Hech narsa', body: 'x'.repeat(40) })).status, 404);
  assert.equal((await post(adm, '/api/admin/library/' + b.id + '/delete', {})).success, true);
  list = (await srv.api(null, '/api/library')).items;
  assert.deepEqual(list.map((x) => x.title).sort(), ['Ahmoqona mat', 'Yangi sarlavha']);
  const audit = await srv.api(adm, '/api/admin/audit?action=library');
  assert.deepEqual(audit.actions.map((x) => x.action).sort(), ['library_add', 'library_add', 'library_add', 'library_delete', 'library_edit']);
});
