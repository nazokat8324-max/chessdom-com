// 🐪 Karvon yo'li: qadamlar (g'alaba 3, durrang 2, mag'lubiyat 1), yangi shahar bildirishnomasi, yetakchilar, sahifa
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, startGame, play, finish, closeAll } = require('./helpers');
const Caravan = require('../caravan');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

test('caravan.js: qadamlar va shaharlar', () => {
  assert.equal(Caravan.pointsOf({ wins: 2, draws: 1, losses: 3 }), 11);
  assert.equal(Caravan.progress(0).city.key, 'xian');
  assert.equal(Caravan.progress(15).city.key, 'dunhuang');
  assert.equal(Caravan.progress(186).city.key, 'samarkand');
  assert.equal(Caravan.progress(10000).next, null);
  assert.equal(Caravan.cityName('samarkand', 'uz'), 'Samarqand');
  for (let i = 1; i < Caravan.CITIES.length; i++) assert.ok(Caravan.CITIES[i].at > Caravan.CITIES[i - 1].at, "chegaralar o'sib boradi");
});

test("5 ta g'alaba → Dunxuan: game-ended.caravan, bildirishnoma, profil va yetakchilar", async () => {
  const a = await srv.register('Cva'), b = await srv.register('Cvb');
  let last;
  for (let i = 0; i < 5; i++) {
    const g = await startGame(srv, a, b, { rated: false });
    await play(g, ['e2e4', 'e7e5']);
    const ended = new Promise((r) => a.socket.once('game-ended', r));
    await finish(g, g.white === a ? 'black-resigns' : 'white-resigns');
    last = await ended;
  }
  assert.deepEqual(last.caravan, { points: 15, gained: 3, city: 'dunhuang', arrived: true });
  const notes = await srv.api(a, '/api/notifications');
  assert.ok(notes.notifications.some((n) => n.type === 'caravan_city' && n.data.city === 'dunhuang'), 'shahar bildirishnomasi');
  assert.equal((await srv.api(null, '/api/users/' + a.name + '/extras')).caravan, 15);
  assert.equal((await srv.api(null, '/api/users/' + b.name + '/extras')).caravan, 5);
  const cv = await srv.api(null, '/api/caravan');
  assert.equal(cv.leaders[0].username, a.name);
  assert.equal(cv.leaders[0].city, 'dunhuang');
  assert.equal(cv.perCity.length, Caravan.CITIES.length);
  // 🧵 Shahar naqshi: faqat yetib borilgan shaharniki
  assert.equal((await srv.api(a, '/api/users/me/banner', 'POST', { key: 'dunhuang' })).banner, 'dunhuang');
  assert.equal((await srv.api(null, '/api/users/' + a.name + '/extras')).banner, 'dunhuang');
  assert.equal((await srv.api(b, '/api/users/me/banner', 'POST', { key: 'dunhuang' })).status, 403, "b hali Dunxuanga yetmagan");
  assert.equal((await srv.api(b, '/api/users/me/banner', 'POST', { key: 'atlantis' })).status, 400);
  assert.equal((await srv.api(null, '/api/users/me/banner', 'POST', { key: 'xian' })).status, 401);
  assert.equal((await srv.api(b, '/api/users/me/banner', 'POST', { key: 'xian' })).banner, 'xian');
  assert.equal((await srv.api(b, '/api/users/me/banner', 'POST', { key: '' })).banner, null);
  assert.equal((await srv.api(null, '/api/users/' + b.name + '/extras')).banner, null);
  closeAll(a, b);
});

test("/karvon sahifasi va sitemap", async () => {
  const r = await fetch(srv.base + '/karvon');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /<title>Caravan Road · ChessCaravan<\/title>/);
  assert.ok((await (await fetch(srv.base + '/sitemap.xml')).text()).includes('/karvon'));
});
