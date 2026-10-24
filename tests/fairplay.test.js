// 🕵️ Fair-play: dvigatelga moslik (fairplay-engine.js) — hisob-kitob, chegaralar, belgilash qoidasi va Stockfish bilan haqiqiy tahlil
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const sqlite3 = require('sqlite3');
const { Chess } = require('chess.js');
const FE = require('../fairplay-engine');
const { startServer, startGame, play, finish, closeAll, sleep } = require('./helpers');

// Ruy Lopez, Chigorin (38 yarim yurish) — barchasi qonuniy
const RUY = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5a4', 'g8f6', 'e1g1', 'f8e7', 'f1e1', 'b7b5', 'a4b3', 'd7d6', 'c2c3', 'e8g8', 'h2h3', 'c6a5', 'b3c2', 'c7c5', 'd2d4', 'd8c7',
  'b1d2', 'c5d4', 'c3d4', 'a5c6', 'd2b3', 'a6a5', 'c1e3', 'a5a4', 'b3d2', 'c8d7', 'a1c1', 'c7b7', 'a2a3', 'f8c8', 'c2d3', 'e7d8'];

function line() {
  const c = new Chess();
  return RUY.map((u) => c.move({ from: u.slice(0, 2), to: u.slice(2, 4) }));
}

test("Hisob-kitob: moslik va ACPL, debyut/majburiy/hal bo'lgan pozitsiyalar sanalmaydi", () => {
  const moves = line();
  // Har pozitsiya bahosi yurayotgan tomon nuqtai nazaridan +20 (oq) / -20 (qora) — yo'qotish 0; eng yaxshi yurish = o'ynalgan yurish
  const perfect = moves.map((m, i) => ({ cp: i % 2 ? -20 : 20, mate: null, best: m.from + m.to })).concat([{ cp: 20, mate: null, best: null }]);
  const m1 = FE.gameMetrics(moves, perfect, moves.map(() => 20));
  assert.deepEqual(m1.w, { moves: 13, match: 1, acpl: 0 });
  assert.deepEqual(m1.b, { moves: 13, match: 1, acpl: 0 });
  // Hech biri eng yaxshi emas, har yurishda 100 yo'qotish (keyingi pozitsiya raqib uchun +80 → bizga -80)
  const weak = moves.map((m, i) => ({ cp: 20, mate: null, best: 'a1a1' })).concat([{ cp: 20, mate: null, best: null }]);
  const m2 = FE.gameMetrics(moves, weak, moves.map(() => 20));
  assert.equal(m2.w.match, 0);
  assert.equal(m2.w.acpl, 40);
  // Majburiy yurishlar (1 ta qonuniy) va hal bo'lgan pozitsiyalar (|baho| > 500) chiqariladi
  const forced = FE.gameMetrics(moves, perfect, moves.map(() => 1));
  assert.equal(forced.w.moves, 0);
  const decided = moves.map((m) => ({ cp: 900, mate: null, best: m.from + m.to })).concat([{ cp: 900, best: null }]);
  assert.equal(FE.gameMetrics(moves, decided, moves.map(() => 20)).w.moves, 0);
});

test("Chegaralar: kuchsiz o'yinchida qattiq, kuchlida yanada qattiq; 10 tadan 3 tasi — belgilash", () => {
  assert.equal(FE.isEngineLike({ moves: 20, match: 0.75, acpl: 12 }, 1500), true);
  assert.equal(FE.isEngineLike({ moves: 20, match: 0.65, acpl: 12 }, 1500), false);
  assert.equal(FE.isEngineLike({ moves: 20, match: 0.75, acpl: 22 }, 1500), false);
  assert.equal(FE.isEngineLike({ moves: 8, match: 1, acpl: 0 }, 1500), false, "kam yurish — baho yo'q");
  assert.equal(FE.isEngineLike({ moves: 20, match: 0.8, acpl: 10 }, 2100), false, "2000+ o'yinchi uchun bu oddiy");
  assert.equal(FE.isEngineLike({ moves: 20, match: 0.9, acpl: 6 }, 2100), true);
  assert.equal(FE.shouldFlag([{ suspicious: 1 }, { suspicious: 0 }, { suspicious: 1 }]), false);
  assert.equal(FE.shouldFlag([{ suspicious: 1 }, { suspicious: 1 }, { suspicious: 0 }, { suspicious: 1 }]), true);
  assert.equal(FE.shouldFlag([...Array(10).fill({ suspicious: 0 }), { suspicious: 1 }, { suspicious: 1 }, { suspicious: 1 }]), false, 'faqat oxirgi 10 ta');
});

let srv;
before(async () => { srv = await startServer({ FAIRPLAY_DEPTH: '5' }); });
after(async () => { await srv.stop(); });
const rows = (q, p) => new Promise((res, rej) => { const d = new sqlite3.Database(path.join(srv.dir, 'test.sqlite')); d.all(q, p || [], (e, r) => { d.close(); e ? rej(e) : res(r); }); });

test("Reytingli o'yindan keyin Stockfish (alohida oqimda) har o'yinchini tahlil qiladi; reytingsiz o'yin tahlil qilinmaydi", async () => {
  const a = await srv.register('Fpa'), b = await srv.register('Fpb');
  const casual = await startGame(srv, a, b, { rated: false });
  await play(casual, RUY);
  await finish(casual, 'draw');
  const g = await startGame(srv, a, b, { rated: true });
  await play(g, RUY);
  await finish(g, 'draw');
  closeAll(a, b);
  let r = [];
  for (let i = 0; i < 120 && r.length < 2; i++) { await sleep(500); r = await rows('SELECT user_id, game_ref, moves, match_rate, acpl FROM fairplay_engine'); }
  assert.equal(r.length, 2, 'ikkala o\'yinchi tahlil qilindi (faqat reytingli o\'yin)');
  assert.deepEqual(new Set(r.map((x) => x.user_id)), new Set([a.id, b.id]));
  for (const x of r) {
    assert.ok(x.moves >= FE.MIN_MOVES, 'tahlil qilingan yurishlar: ' + x.moves);
    assert.ok(x.match_rate >= 0 && x.match_rate <= 1);
    assert.ok(x.acpl >= 0);
    assert.match(x.game_ref, /^room:/);
  }
});
