// 📖 Mening debyutlarim: o'yinchining standart o'yinlaridan debyutlar oilasi bo'yicha statistika
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, startGame, play, finish, closeAll } = require('./helpers');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

const RUY = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6'];
const ITALIAN = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5'];

test("Debyutlar: oilalar bo'yicha guruhlanadi, oq/qora va natijalar to'g'ri", async () => {
  const a = await srv.register('Opa'), b = await srv.register('Opb');
  const games = [[RUY, 'white'], [RUY, 'black'], [ITALIAN, 'white']]; // kim taslim bo'ladi — rang
  for (const [moves, resigner] of games) {
    const g = await startGame(srv, a, b, { rated: false });
    await play(g, moves);
    await finish(g, resigner === 'white' ? 'white-resigns' : 'black-resigns');
  }
  closeAll(a, b);
  const d = await srv.api(null, '/api/users/' + a.name + '/openings');
  assert.equal(d.success, true);
  assert.equal(d.analysed, 3);
  const ruy = d.openings.find((o) => o.name === 'Ruy Lopez');
  const ita = d.openings.find((o) => o.name === 'Italian Game');
  assert.ok(ruy, JSON.stringify(d.openings.map((o) => o.name)));
  assert.ok(ita);
  assert.equal(ruy.games, 2);
  assert.equal(ruy.win + ruy.loss + ruy.draw, 2);
  assert.equal(ruy.white.games + ruy.black.games, 2);
  assert.equal(ita.games, 1);
  assert.match(ruy.eco, /^C\d\d$/);
  assert.equal(d.openings[0].name, 'Ruy Lopez', "eng ko'p o'ynalgani birinchi");
  assert.equal((await srv.api(null, '/api/users/yoq_odam_123/openings')).status, 404);
});
