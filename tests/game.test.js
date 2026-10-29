// O'yin serverda: yurishlar, natijalar, reyting, tarix, tomosha, Chess960
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, startGame, play, finish, closeAll, once, sleep } = require('./helpers');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

const FOOLS_MATE = ['f2f3', 'e7e5', 'g2g4', 'd8h4'];

test("Mat: natija, sabab va reyting faqat serverda hisoblanadi", async () => {
  const a = await srv.register('Gm'), b = await srv.register('Gm');
  const g = await startGame(srv, a, b);
  const ended = Promise.all([once(g.white.socket, 'game-ended'), once(g.black.socket, 'game-ended')]);
  await play(g, FOOLS_MATE);
  const [w, bl] = await ended;
  assert.equal(w.reason, 'checkmate');
  assert.equal(w.winner, 'b');
  assert.equal(w.result, 'loss');
  assert.equal(bl.result, 'win');
  assert.equal(w.rated, true);
  assert.ok(bl.newRating > 1500 && w.newRating < 1500, `reyting: ${w.newRating} / ${bl.newRating}`);
  assert.ok(bl.ratingsByMode.blitz > 1500 && w.ratingsByMode.blitz < 1500, '3+2 — blitz reytingi o\'zgaradi');
  assert.equal(bl.ratingsByMode.rapid, 1500, 'boshqa rejim o\'zgarmaydi');
  closeAll(a, b);
});

test("Noqonuniy yurish va navbat bo'lmagan yurish rad etiladi", async () => {
  const a = await srv.register('Gi'), b = await srv.register('Gi');
  const g = await startGame(srv, a, b);
  let rej = once(g.white.socket, 'move-rejected');
  g.white.socket.emit('make-move', { roomId: g.roomId, move: { from: 'e2', to: 'e5' } });
  assert.equal((await rej).reason, 'invalid_move');
  rej = once(g.black.socket, 'move-rejected');
  g.black.socket.emit('make-move', { roomId: g.roomId, move: { from: 'e7', to: 'e5' } });
  assert.equal((await rej).reason, 'not_your_turn');
  // Begona socket bu xonada yura olmaydi
  const c = await srv.register('Gi');
  const sc = await srv.connect(c);
  rej = once(sc, 'move-rejected');
  sc.emit('make-move', { roomId: g.roomId, move: { from: 'e2', to: 'e4' } });
  assert.equal((await rej).reason, 'not_in_room');
  sc.disconnect();
  await finish(g, 'white-resigns');
  closeAll(a, b);
});

test('Taslim va kelishilgan durrang', async () => {
  const a = await srv.register('Gr'), b = await srv.register('Gr');
  let g = await startGame(srv, a, b);
  await play(g, ['e2e4', 'e7e5']);
  let res = await finish(g, 'white-resigns');
  assert.equal(res.reason, 'resign');
  assert.equal(res.winner, 'b');
  g = await startGame(srv, a, b, { rated: false });
  await play(g, ['d2d4', 'd7d5']);
  res = await finish(g, 'draw');
  assert.equal(res.reason, 'agreement');
  assert.equal(res.winner, null);
  assert.equal(res.rated, false);
  closeAll(a, b);
});

test("O'yinlar tarixi, qayta ko'rish va PGN", async () => {
  const a = await srv.register('Gh'), b = await srv.register('Gh');
  const g = await startGame(srv, a, b);
  await play(g, FOOLS_MATE);
  await sleep(500);
  closeAll(a, b);
  const white = g.white.name;
  const h = await srv.api(null, '/api/users/' + white + '/history');
  assert.equal(h.total, 1);
  const game = h.games[0];
  assert.equal(game.result, 'loss');
  assert.equal(game.reason, 'checkmate');
  assert.equal(game.color, 'w');
  assert.equal(game.moves, 2, "yurishlar soni (to'liq yurishlar)");
  assert.equal(game.hasMoves, true);
  const filtered = await srv.api(null, '/api/users/' + white + '/history?result=win');
  assert.equal(filtered.total, 0);
  const rp = await srv.api(null, '/api/users/' + white + '/games/' + game.id + '/replay');
  assert.deepEqual(rp.game.moves, ['f3', 'e5', 'g4', 'Qh4#']);
  const pgnRes = await fetch(srv.base + '/api/users/' + white + '/pgn');
  assert.match(pgnRes.headers.get('content-disposition'), /filename="chesscaravan-/);
  const pgn = await pgnRes.text();
  assert.match(pgn, /\[Site "https:\/\/chesscaravan\.com"\]/);
  assert.match(pgn, /1\. f3 e5 2\. g4 Qh4#/);
  assert.match(pgn, /\[Result "0-1"\]/);
  const own = await srv.api(g.white, '/api/users/' + white + '/games');
  assert.equal(own.games.length, 1);
  assert.deepEqual(own.games[0].moves, ['f3', 'e5', 'g4', 'Qh4#']);
});

test("Jonli o'yinlar va tomosha", async () => {
  const a = await srv.register('Gw'), b = await srv.register('Gw'), c = await srv.register('Gw');
  const g = await startGame(srv, a, b);
  await play(g, ['e2e4']);
  const live = await srv.api(null, '/api/games/live');
  assert.ok(live.games.some((x) => x.roomId === g.roomId));
  const sc = await srv.connect(c);
  const state = once(sc, 'watch-state');
  sc.emit('watch-game', g.roomId);
  const ws = await state;
  assert.equal(ws.history.length, 1);
  assert.equal(ws.predict.isPlayer, false);
  const mv = once(sc, 'watch-move');
  await play({ ...g, white: g.black, black: g.white }, ['e7e5']);
  assert.equal((await mv).san, 'e5');
  sc.disconnect();
  await finish(g, 'black-resigns');
  closeAll(a, b);
});

test("Chess960: o'z reytingi bilan, boshlang'ich pozitsiya serverdan", async () => {
  const a = await srv.register('G9'), b = await srv.register('G9');
  const g = await startGame(srv, a, b, { variant: 'chess960' });
  assert.equal(g.match.a.variant, 'chess960');
  assert.match(g.match.a.startFen, /^[rnbqk]{8}\/p{8}\/8\/8\/8\/8\/P{8}\/[RNBQK]{8} w/);
  assert.equal(g.match.a.startFen, g.match.b.startFen);
  assert.equal(g.match.a.ratingMode, 'chess960');
  await play(g, ['b2b3', 'b7b6']);
  const res = await finish(g, 'white-resigns');
  assert.equal(res.mode, 'chess960');
  closeAll(a, b);
});
