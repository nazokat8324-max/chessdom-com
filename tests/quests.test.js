// 🎯 Haftalik vazifalar: aylanish, progress hisobi, API, tarjimalar
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startServer, startGame, play, finish, closeAll } = require('./helpers');
const Quests = require('../quests');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

test("quests.js: hafta dushanbadan, har hafta 3 ta har xil vazifa, ketma-ket haftalar bir xil emas", () => {
  const d = new Date(Quests.weekStart(Date.UTC(2026, 9, 24, 12)) + 5 * 3600e3);
  assert.equal(d.getUTCDay(), 1, 'dushanba');
  assert.equal(d.getUTCHours(), 0);
  let prev = null;
  for (let k = 0; k < 20; k++) {
    const ids = Quests.questsFor(Date.UTC(2026, 9, 24) + k * 7 * 864e5).map((q) => q.id);
    assert.equal(new Set(ids).size, 3, ids.join(','));
    if (prev) assert.notDeepEqual(ids, prev, 'hafta ' + k);
    prev = ids;
  }
});

test('quests.js: progress va bajarilganlik', () => {
  const t = Date.UTC(2026, 9, 24);
  const qs = Quests.questsFor(t);
  // Har bir vazifa uchun unga mos o'yin namunasini tanlab, kerakli sonda qo'shamiz — uchalasi bajarilishi kerak
  const base = { result: 'win', reason: 'checkmate', color: 'b', variant: 'chess960', tea: true, rated: true, moveCount: 90 };
  const pool = ['blitz', 'rapid', 'bullet'].flatMap((mode) => [{ ...base, mode }, { ...base, mode, result: 'draw', reason: 'agreement' }]);
  const games = [];
  for (const q of qs) {
    const g = pool.find((x) => q.test(x));
    assert.ok(g, q.id + ' uchun namuna');
    for (let i = 0; i < q.need; i++) games.push(g);
  }
  const p = Quests.progress(games, t);
  for (const x of p) assert.equal(x.done, true, x.id);
  // Hech qanday o'yin bo'lmasa — hech biri bajarilmagan
  assert.ok(Quests.progress([], t).every((x) => !x.done && x.have === 0));
  // Barcha vazifalar uchun mos namuna topiladi (keyingi haftalarda ham sinab bo'linadi)
  for (const q of Quests.QUESTS) assert.ok(pool.some((x) => q.test(x)), q.id);
  // Bekor qilingan (aborted) o'yinlar sanalmaydi
  assert.ok(Quests.progress([{ result: 'win', reason: 'aborted' }], t).every((x) => x.have === 0));
});

test("Har bir vazifaning matni 6 tilda bor", () => {
  const langs = fs.readFileSync(path.join(__dirname, '..', 'languages.js'), 'utf8');
  for (const q of Quests.QUESTS) assert.equal((langs.match(new RegExp('\\bq_' + q.id + ':', 'g')) || []).length, 6, q.id);
});

test("API: joriy haftaning 3 ta vazifasi, o'yin progressni oshiradi, mehmonga yopiq emas lekin avtorizatsiya kerak", async () => {
  assert.equal((await srv.api(null, '/api/quests')).status, 401);
  const a = await srv.register('Qa'), b = await srv.register('Qb');
  const before = await srv.api(a, '/api/quests');
  assert.equal(before.success, true);
  assert.equal(before.quests.length, 3);
  assert.ok(before.quests.every((q) => q.have === 0));
  const g = await startGame(srv, a, b, { rated: true });
  await play(g, ['e2e4', 'e7e5']);
  await finish(g, g.white === a ? 'black-resigns' : 'white-resigns'); // a yutadi
  closeAll(a, b);
  const after1 = await srv.api(a, '/api/quests');
  const expect = Quests.progress([{ result: 'win', reason: 'resign', color: g.white === a ? 'w' : 'b', rated: true, mode: 'blitz', moveCount: 2 }]);
  assert.deepEqual(after1.quests.map((q) => q.have), expect.map((q) => q.have));
  assert.equal(typeof after1.badges, 'number');
  assert.deepEqual((await srv.api(null, '/api/users/' + a.name + '/extras')).badges.questWeeks, [], "🎖️ nishonlar: hali bajarilgan hafta yo'q");
  assert.ok(new Date(after1.endsAt) > new Date());
});
