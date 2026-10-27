// 🌸 Mavsumiy bayramlar: sanalar (Toshkent vaqti), keyingi bayram, bayram vazifasi → nishon, /api/holiday, profil nishonlari
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Holidays = require('../holidays');
const { startServer, startGame, play, finish, closeAll } = require('./helpers');

// Toshkent vaqti bo'yicha "YYYY-MM-DD HH:mm" → UTC ms
const tash = (s) => { const [d, t] = s.split(' '); const [y, m, day] = d.split('-').map(Number); const [h, mi] = (t || '00:00').split(':').map(Number); return Date.UTC(y, m - 1, day, h, mi) - 5 * 3600000; };
const keys = (t) => Holidays.active(t).map((h) => h.key).sort();

test("Sanalar: Navro'z, Yangi yil (yil chegarasi), Mustaqillik, shaxmat kuni, hayitlar, chegaralar Toshkent vaqtida", () => {
  assert.deepEqual(keys(tash('2027-03-19 23:59')), []);
  assert.deepEqual(keys(tash('2027-03-20 00:00')), ['navruz']);
  assert.deepEqual(keys(tash('2027-03-23 23:59')), ['navruz']);
  assert.deepEqual(keys(tash('2027-03-24 00:00')), []);
  const ny = Holidays.active(tash('2026-12-31 10:00'));
  assert.deepEqual(ny.map((h) => [h.key, h.year]), [['newyear', 2027]], "31-dekabr — keyingi yil bayrami");
  assert.deepEqual(Holidays.active(tash('2027-01-02 20:00')).map((h) => [h.key, h.year]), [['newyear', 2027]]);
  assert.deepEqual(keys(tash('2027-01-03 00:00')), []);
  assert.deepEqual(keys(tash('2026-09-01 12:00')), ['independence']);
  assert.deepEqual(keys(tash('2027-07-20 12:00')), ['chessday']);
  assert.deepEqual(keys(tash('2027-03-11 12:00')), ['ramazon']);
  assert.deepEqual(keys(tash('2027-05-18 12:00')), ['qurbon']);
  assert.deepEqual(keys(tash('2026-03-21 12:00')), ['navruz', 'ramazon'], '2026 da ikkalasi bir vaqtda');
  const nx = Holidays.next(tash('2026-10-24 12:00'));
  assert.deepEqual([nx.key, nx.year, nx.start], ['newyear', 2027, tash('2026-12-31 00:00')]);
  assert.equal(Holidays.name('navruz', 'uz'), "Navro'z");
  assert.equal(Holidays.name('qurbon', 'ru'), 'Курбан-байрам');
  for (const h of Holidays.HOLIDAYS) assert.equal(h.names.length, Holidays.LANGS ? Holidays.LANGS.length : 7, h.key); // uz, en, ru, es, de, fr, tr
  assert.equal(Holidays.name('navruz', 'tr'), 'Nevruz');
});

test("Bayram kalitlari 6 tilda bor", () => {
  const langs = fs.readFileSync(path.join(__dirname, '..', 'languages.js'), 'utf8');
  for (const k of ['hdGreeting', 'hdTitle', 'hdTask', 'hdDone', 'hdNext', 'hdNextIn', 'nbHoliday', 'nfHolidayBadge']) assert.equal((langs.match(new RegExp('\\b' + k + ':', 'g')) || []).length, 6, k);
});

let srv;
before(async () => { srv = await startServer({ HOLIDAY_FORCE: 'navruz' }); });
after(async () => { await srv.stop(); });

test("Bayram vazifasi: 3 ta o'yin → nishon, bildirishnoma, /api/holiday va profil nishonlari", async () => {
  const a = await srv.register('Hda'), b = await srv.register('Hdb');
  const h0 = await srv.api(a, '/api/holiday');
  assert.equal(h0.active[0].key, 'navruz');
  assert.deepEqual(h0.active[0].mine, { key: 'navruz', have: 0, done: false });
  assert.equal((await srv.api(null, '/api/holiday')).active[0].mine, null, 'kirmaganga — progresssiz');
  for (let i = 0; i < 3; i++) {
    const g = await startGame(srv, a, b, { rated: false });
    await play(g, ['e2e4', 'e7e5']);
    await finish(g, i === 1 ? 'draw' : 'white-resigns');
  }
  closeAll(a, b);
  await new Promise((r) => setTimeout(r, 500));
  const h1 = await srv.api(a, '/api/holiday');
  assert.equal(h1.active[0].mine.done, true);
  const ex = await srv.api(null, '/api/users/' + a.name + '/extras');
  assert.equal(ex.badges.holidays.length, 1);
  assert.equal(ex.badges.holidays[0].holiday, 'navruz');
  const n = await srv.api(b, '/api/notifications');
  assert.ok(n.notifications.some((x) => x.type === 'holiday_badge' && x.data.holiday === 'navruz'));
  // Ikkinchi marta berilmaydi
  const g = await startGame(srv, a, b, { rated: false });
  await finish(g, 'white-resigns');
  closeAll(a, b);
  await new Promise((r) => setTimeout(r, 500));
  assert.equal((await srv.api(null, '/api/users/' + a.name + '/extras')).badges.holidays.length, 1);
});
