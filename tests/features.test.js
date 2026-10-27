// ChessCaravan'ning o'ziga xos imkoniyatlari: Choyxona, Raqib-do'st, Bayroqlar bellashuvi, Bashorat, Odob reytingi, Oy yakuni
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const sqlite3 = require('sqlite3');
const { startServer, startGame, play, finish, closeAll, once, ack, sleep } = require('./helpers');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });
const sql = (q, p) => new Promise((res, rej) => { const d = new sqlite3.Database(path.join(srv.dir, 'test.sqlite')); d.run(q, p || [], (e) => { d.close(); e ? rej(e) : res(); }); });

test("Choyxona: stolga o'tirish va qarshisiga o'tirib o'yin boshlash", async () => {
  const a = await srv.register('Te'), b = await srv.register('Te');
  const sa = await srv.connect(a), sb = await srv.connect(b);
  sb.emit('tea-enter'); await once(sb, 'tea-seats');
  const seen = once(sb, 'tea-seats');
  sa.emit('tea-sit', { initial: 180, increment: 2, rated: true });
  const seats = (await seen).seats;
  const seat = seats.find((s) => s.username === a.name);
  assert.ok(seat && seat.mode === 'blitz');
  const fa = once(sa, 'match-found'), fb = once(sb, 'match-found');
  sb.emit('tea-join', { id: seat.id });
  const [ma] = await Promise.all([fa, fb]);
  assert.equal(ma.tea, true);
  assert.equal((await srv.api(null, '/api/tea')).seats.length, 0, "o'yin boshlangach stol bo'shaydi");
  sa.emit('game-over', { roomId: ma.roomId, result: { type: 'resign' } });
  await sleep(300);
  sa.disconnect(); sb.disconnect();
});

test("Raqib-do'st va o'zaro hisob (3 o'yindan keyin)", async () => {
  const a = await srv.register('Rv'), b = await srv.register('Rv');
  for (const how of ['white-resigns', 'black-resigns', 'draw']) {
    const g = await startGame(srv, a, b);
    await play(g, ['e2e4', 'e7e5']);
    await finish(g, how);
  }
  closeAll(a, b);
  const ex = await srv.api(null, '/api/users/' + a.name + '/extras');
  assert.equal(ex.rivals[0].name, b.name);
  assert.equal(ex.rivals[0].games, 3);
  const h = await srv.api(null, '/api/h2h/' + a.name + '/' + b.name);
  assert.equal(h.games, 3);
  assert.equal(h.draw, 1);
  assert.equal(h.win + h.loss, 2);
  assert.equal(h.isRival, true);
});

test('Bayroqlar bellashuvi: reytingli g\'alaba klubga ochko beradi (qo\'shni davlat bonusi)', async () => {
  const a = await srv.register('Wa'), b = await srv.register('Wb');
  await srv.api(a, '/api/country-clubs/join', 'POST', { country: 'Uzbekistan', code: 'uz' });
  await srv.api(b, '/api/country-clubs/join', 'POST', { country: 'Kazakhstan', code: 'kz' });
  const LINE = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6', 'd2d3', 'f8c5', 'b1c3', 'd7d6'];
  const aWins = async (moves) => { // a yutadi
    const g = await startGame(srv, a, b);
    await play(g, moves);
    await finish(g, g.white === a ? 'black-resigns' : 'white-resigns');
    await sleep(300);
  };
  const uzPoints = async () => { const w = await srv.api(a, '/api/war'); const c = w.clubs.find((x) => x.code === 'uz'); return c ? c.points : 0; };
  // Juda qisqa o'yin (ochko yig'ish uchun 1 yurishda taslim) — ochko yo'q
  await aWins(['e2e4', 'e7e5']);
  assert.equal(await uzPoints(), 0, 'qisqa o\'yin ochko bermaydi');
  await aWins(LINE);
  const war = await srv.api(a, '/api/war');
  const uz = war.clubs.find((c) => c.code === 'uz');
  assert.equal(uz.points, 5, 'g\'alaba 3 + boshqa klub 1 + qo\'shni 1');
  assert.equal(war.regions.uz.ruler, 'uz');
  assert.equal(war.me.myPoints, 5);
  // Bir juftlik bir kunda ko'pi bilan 3 ta ochkoli o'yin
  await aWins(LINE); await aWins(LINE); await aWins(LINE);
  assert.equal(await uzPoints(), 15, "4-o'yin ochko bermadi");
  closeAll(a, b);
});

test('Bashorat: natija taxmini, qabul yopilishi, ochkolar', async () => {
  const a = await srv.register('Pa'), b = await srv.register('Pb'), c = await srv.register('Pc');
  const g = await startGame(srv, a, b);
  const sc = await srv.connect(c);
  sc.emit('watch-game', g.roomId); await once(sc, 'watch-state');
  const pick = await ack(sc, 'predict-result', { roomId: g.roomId, pick: 'w' });
  assert.equal(pick.ok, true);
  assert.equal(pick.points, 25, 'teng reytingda oq g\'alabasi: 10/0.4');
  assert.equal((await ack(sc, 'predict-result', { roomId: g.roomId, pick: 'b' })).reason, 'already');
  assert.equal((await ack(g.white.socket, 'predict-result', { roomId: g.roomId, pick: 'w' })).reason, 'player');
  const guess = await ack(sc, 'predict-move', { roomId: g.roomId, ply: 0, from: 'e2', to: 'e4' });
  assert.equal(guess.san, 'e4');
  const gr = once(sc, 'guess-result');
  await play(g, ['e2e4', 'e7e5']);
  assert.deepEqual(await gr, { roomId: g.roomId, ply: 0, san: 'e4', correct: 1, total: 1, points: 5 });
  const resolved = once(sc, 'predict-resolved');
  await finish(g, 'black-resigns');
  const r = await resolved;
  assert.equal(r.outcome, 'w');
  assert.equal(r.winners, 1);
  sc.disconnect(); closeAll(a, b);
  const lb = await srv.api(c, '/api/predictions/leaderboard?period=month');
  assert.equal(lb.me.points, 30, '25 natija + 5 yurish');
});

test("Odob reytingi: o'yindan keyin bir marta baho", async () => {
  const a = await srv.register('Sp'), b = await srv.register('Sp');
  const g = await startGame(srv, a, b);
  await play(g, ['e2e4', 'e7e5']);
  await finish(g, 'white-resigns');
  assert.equal((await ack(a.socket, 'rate-opponent', { roomId: g.roomId, value: 1 })).ok, true);
  assert.equal((await ack(a.socket, 'rate-opponent', { roomId: g.roomId, value: -1 })).reason, 'already');
  closeAll(a, b);
  const ex = await srv.api(null, '/api/users/' + b.name + '/extras');
  assert.equal(ex.sportsmanship.up, 1);
  assert.equal(ex.sportsmanship.percent, 100);
});

test('Oy yakuni: oy statistikasi', async () => {
  const a = await srv.register('Wr'), b = await srv.register('Wr');
  const g = await startGame(srv, a, b);
  await play(g, ['e2e4', 'e7e5']);
  await finish(g, 'black-resigns');
  closeAll(a, b);
  const w = await srv.api(null, '/api/users/' + g.white.name + '/wrapped');
  assert.equal(w.games, 1);
  assert.equal(w.win, 1);
  assert.equal(w.ratings.blitz.from, 1500);
  assert.ok(w.ratings.blitz.to > 1500);
  assert.deepEqual(w.openingLines, [['e4', 'e5']]);
});
