// ⭐ Kun o'yini: kechagi eng qiziqarli o'yin tanlanadi, kun davomida o'zgarmaydi, qisqa o'yinlar hisobga olinmaydi, ikkala o'yinchiga bildirishnoma
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, startGame, play, finish, closeAll } = require('./helpers');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

// Ispan partiyasi, asosiy yo'l — 22 yarim yurish
const RUY = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5a4', 'g8f6', 'e1g1', 'f8e7', 'f1e1', 'b7b5', 'a4b3', 'd7d6', 'c2c3', 'e8g8', 'h2h3', 'c6a5', 'b3c2', 'c7c5', 'd2d4', 'd8c7'];

test("Kun o'yini: uzun o'yin tanlanadi va o'zgarmaydi, ikkala o'yinchiga bildirishnoma", async () => {
  const a = await srv.register('Gda'), b = await srv.register('Gdb');
  const short = await startGame(srv, a, b, { rated: false });
  await play(short, ['e2e4', 'e7e5']);
  await finish(short, 'white-resigns');
  const long = await startGame(srv, a, b, { rated: true });
  await play(long, RUY);
  await finish(long, 'white-resigns');
  closeAll(a, b);

  assert.equal((await srv.api(null, '/api/game-of-day')).game, null, "bugungi o'yinlar ertaga tanlanadi");
  // Ertangi Toshkent kunining 02:00 si (yarim tunga yaqin ishga tushganda ham kun chegarasidan o'tib ketmasin)
  const tz = 5 * 3600000;
  const local = new Date(Date.now() + tz);
  const tomorrow = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) - tz + 2 * 3600000;
  const r = await srv.api(null, '/api/test/game-of-day?now=' + tomorrow);
  const g = r.game;
  assert.ok(g, JSON.stringify(r));
  assert.equal(g.moves.length, RUY.length, "qisqa o'yin emas, uzuni tanlandi");
  assert.equal(g.white.name, long.white.name);
  assert.equal(g.black.name, long.black.name);
  assert.equal(g.result, '0-1');
  assert.equal(g.reason, 'resign');
  assert.equal((await srv.api(null, '/api/test/game-of-day?now=' + (tomorrow + 3600000))).game.id, g.id, "kun davomida o'zgarmaydi");
  for (const u of [a, b]) {
    const n = await srv.api(u, '/api/notifications');
    assert.ok(n.notifications.some((x) => x.type === 'game_of_day'), u.name + ' bildirishnoma');
  }
  // Keyingi kun: bu o'yin qayta tanlanmaydi (oxirgi 30 kunda tanlanganlar chiqarib tashlanadi), boshqa o'yin yo'q
  assert.equal((await srv.api(null, '/api/test/game-of-day?now=' + (tomorrow + 86400000))).game, null);
});
