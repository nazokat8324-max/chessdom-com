// 🏺 Shatranj: qoidalar mexanizmi (perft, donalar, pat, yalang'och shoh) va serverdagi o'yin (alohida reyting)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, startGame, play, finish, closeAll, once, sleep } = require('./helpers');
const Shatranj = require('../shatranj');

function perft(g, d) {
  if (!d) return 1;
  let n = 0;
  for (const m of g.moves({ verbose: true })) { g.move({ from: m.from, to: m.to }); n += perft(g, d - 1); g.undo(); }
  return n;
}

test('Shatranj perft (Fairy-Stockfish bilan bir xil: 16, 256, 4176)', () => {
  const g = new Shatranj();
  assert.deepEqual([1, 2, 3].map((d) => perft(g, d)), [16, 256, 4176]);
  assert.equal(g.fen(), Shatranj.START_FEN, 'undo boshlang\'ich pozitsiyani tiklaydi');
});

test("Donalar: farzin 1 diagonal, fil 2 diagonal sakraydi, piyoda 1 qadam va faqat farzinga aylanadi", () => {
  const t = new Shatranj('8/8/8/3QB3/8/8/8/K6k w - - 0 1');
  assert.deepEqual(t.moves({ square: 'd5' }).sort(), ['Qc4', 'Qc6', 'Qe4', 'Qe6']);
  assert.deepEqual(t.moves({ square: 'e5' }).sort(), ['Bc3', 'Bc7', 'Bg3', 'Bg7']);
  const s = new Shatranj();
  assert.deepEqual(s.moves({ square: 'e2' }), ['e3'], "2 qadam yo'q");
  assert.equal(s.move('e4'), null);
  assert.deepEqual(s.moves({ square: 'c1' }).sort(), ['Ba3', 'Be3'], 'fil sakraydi');
  const p = new Shatranj('8/4P3/8/8/8/8/8/K6k w - - 0 1');
  assert.equal(p.move({ from: 'e7', to: 'e8', promotion: 'n' }).san, 'e8=Q');
  assert.equal(p.get('e8').type, 'q');
});

test("Natijalar: mat, pat — pat qilgan yutadi, yalang'och shoh, javoban yalang'och qilish — durrang", () => {
  const st = new Shatranj('k7/2K5/8/8/8/8/8/1R6 w - - 0 1');
  st.move('Rb7');
  assert.deepEqual(st.result(), { winner: 'w', reason: 'stalemate' });
  const bare = new Shatranj('4k3/8/8/8/8/8/3n4/R3K3 w - - 0 1');
  bare.move('Kxd2');
  assert.deepEqual(bare.result(), { winner: 'w', reason: 'bare' });
  const back = new Shatranj('4k3/8/8/8/8/8/3Q4/3rK3 b - - 0 1');
  back.move('Rxd2');
  assert.equal(back.result(), null, 'javob imkoniyati bor');
  back.move('Kxd2');
  assert.deepEqual(back.result(), { winner: null, reason: 'insufficient' });
  const miss = new Shatranj('4k3/8/8/8/8/8/3Q4/3rK3 b - - 0 1');
  miss.move('Rxd2'); miss.move('Kf1');
  assert.deepEqual(miss.result(), { winner: 'b', reason: 'bare' });
  const mate = new Shatranj('k7/8/1K6/8/8/8/8/7R w - - 0 1');
  mate.move('Rh8');
  assert.deepEqual(mate.result(), { winner: 'w', reason: 'checkmate' });
});

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

test("Serverda Shatranj o'yini: variant, noqonuniy yurish rad etiladi, alohida reyting, umumiy reyting o'zgarmaydi", async () => {
  const a = await srv.register('Sha'), b = await srv.register('Shb');
  const g = await startGame(srv, a, b, { variant: 'shatranj', rated: true });
  assert.equal(g.match.a.variant, 'shatranj');
  assert.equal(g.match.a.ratingMode, 'shatranj');
  const rej = once(g.white.socket, 'move-rejected');
  g.white.socket.emit('make-move', { roomId: g.roomId, move: { from: 'e2', to: 'e4' } });
  assert.equal((await rej).reason, 'invalid_move', "piyoda 2 qadam yurmaydi");
  await play(g, ['e2e3', 'e7e6', 'c1a3', 'f8d6']); // fil sakraydi
  const res = await finish(g, 'black-resigns');
  assert.equal(res.mode, 'shatranj');
  closeAll(a, b);
  await sleep(200);
  const white = g.white;
  const stats = await srv.api(null, '/api/stats/' + white.name);
  assert.ok(stats.ratingsByMode.shatranj > 1500, 'shatranj reytingi oshdi');
  assert.equal(stats.rating, 1500, "umumiy reyting o'zgarmadi");
  const hist = await srv.api(null, '/api/users/' + white.name + '/history');
  assert.equal(hist.games[0].variant, 'shatranj');
});
