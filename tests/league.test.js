// Jamoaviy ligalar: mavsum boshlanishi, "O'ynash" (league-ready), band o'yinchi, bir vaqtdagi tayyorlik,
// natija yozilishi va bahs yakuni. Tezlashtirilgan: 1 a'zoli klub, 1 doska, tick 300 ms
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { startServer, once, startGame, finish, closeAll, sleep } = require('./helpers');

let srv;
test.before(async () => { srv = await startServer({ LEAGUE_MIN_MEMBERS: '1', LEAGUE_BOARDS: '1', LEAGUE_TICK_MS: '300' }); });
test.after(async () => { await srv.stop(); });

// Server ham shu bazaga yozadi (liga tick'i har 300 ms) — band bo'lsa kutiladi (aks holda SQLITE_BUSY)
const open = () => { const d = new (require('sqlite3').Database)(path.join(srv.dir, 'test.sqlite')); d.configure('busyTimeout', 5000); return d; };
const q = (sqlText, prm = []) => new Promise((resolve, reject) => {
  const d = open();
  d.all(sqlText, prm, (err, rows) => d.close(() => (err ? reject(err) : resolve(rows))));
});
// Bir nechta buyruq bitta tranzaksiyada — server tick'i oraliq holatni ko'rmasin
const tx = (sqlText) => new Promise((resolve, reject) => {
  const d = open();
  d.exec('BEGIN IMMEDIATE; ' + sqlText + '; COMMIT;', (err) => d.close(() => (err ? reject(err) : resolve())));
});
async function waitFor(fn, ms = 8000) {
  const end = Date.now() + ms;
  for (;;) { const v = await fn(); if (v) return v; if (Date.now() > end) throw new Error('kutish tugadi'); await sleep(150); }
}

let a, b, gameId;
test('Liga: ikki klub (Osiyo) → mavsum boshlanadi, har o\'yinchida liga o\'yini', async () => {
  a = await srv.register('La'); b = await srv.register('Lb');
  assert.equal((await srv.api(a, '/api/country-clubs/join', 'POST', { country: 'Uzbekistan', code: 'uz' })).success, true);
  assert.equal((await srv.api(b, '/api/country-clubs/join', 'POST', { country: 'Kazakhstan', code: 'kz' })).success, true);
  const mine = await waitFor(async () => { const r = await srv.api(a, '/api/leagues/my-games'); return r.games && r.games.length ? r.games : null; });
  gameId = mine[0].id;
  const theirs = (await srv.api(b, '/api/leagues/my-games')).games;
  assert.equal(theirs[0].id, gameId);
  assert.equal(mine[0].opponent, b.name);
});

test("Liga: boshqa o'yindagi o'yinchi tayyor bo'la olmaydi (busy)", async () => {
  const c = await srv.register('Lc');
  a.socket = await srv.connect(a); c.socket = await srv.connect(c);
  const g = await startGame(srv, a, c);
  const err = once(a.socket, 'league-error');
  a.socket.emit('league-ready', { gameId });
  assert.equal((await err).reason, 'busy');
  await finish(g, 'white-resigns');
  closeAll(c);
});

test("Liga: ikkalasi bir vaqtda tayyor → bitta o'yin; natija yoziladi, bahs yakunlanadi", async () => {
  b.socket = await srv.connect(b);
  await sleep(200);
  for (const x of [a, b]) x.socket.events.length = 0;
  a.socket.emit('league-ready', { gameId });
  b.socket.emit('league-ready', { gameId });
  await sleep(1200);
  const mfA = a.socket.events.filter((e) => e.e === 'match-found');
  const mfB = b.socket.events.filter((e) => e.e === 'match-found');
  assert.equal(mfA.length, 1, "A ga bitta match-found");
  assert.equal(mfB.length, 1, "B ga bitta match-found");
  const m = mfA[0].p;
  assert.ok(m.league && m.league.gameId === gameId);
  const white = m.color === 'w' ? a : b;
  white.socket.emit('game-over', { roomId: m.roomId, result: { type: 'resign' } });
  const row = await waitFor(async () => { const r = await q('SELECT status, result FROM league_games WHERE id = ?', [gameId]); return r[0].status === 'finished' ? r[0] : null; });
  assert.equal(row.result, '0-1');
  // 2-doska: server qayta ishga tushib tiklanmagan "playing" o'yin — bahs muddati tugaguncha kutiladi, keyin durrang
  await sleep(800);
  assert.equal((await q("SELECT status FROM league_matches"))[0].status, 'finished', '1 doskali bahs yakunlandi');
  closeAll(a, b);
});

test("Liga: xonasi yo'q \"playing\" o'yin muddat tugagach durrang bilan yopiladi (bahs qotib qolmaydi)", async () => {
  const [m] = await q('SELECT id, status, home_score, away_score FROM league_matches');
  // Bahsni qayta ochib, unga xonasiz "playing" doskani qo'shamiz. Avval doska (yopiq bahsda — tick e'tiborsiz qoldiradi),
  // so'ng bahs, divizion va mavsum BITTA tranzaksiyada ochiladi. Avval to'rt alohida so'rov edi: kompyuter band bo'lganda
  // tick ular orasiga tushib, ochiq doskasi hali yo'q bahsni qayta yopardi — qo'shilgan doska abadiy kutib, test yiqilardi.
  await q("INSERT INTO league_games (id, match_id, board, white_id, white_name, black_id, black_name, white_is_home, status) VALUES ('stuck-1', ?, 2, ?, ?, ?, ?, 0, 'playing')", [m.id, b.id, b.name, a.id, a.name]);
  await tx("UPDATE league_matches SET status = 'active' WHERE id = '" + m.id + "'; UPDATE league_divisions SET status = 'active'; UPDATE league_seasons SET phase = 'league'");
  await sleep(1000);
  assert.equal((await q("SELECT status FROM league_games WHERE id = 'stuck-1'"))[0].status, 'playing', 'muddat tugamaguncha kutiladi');
  await q("UPDATE league_matches SET deadline = ? WHERE id = ?", [new Date(Date.now() - 1000).toISOString(), m.id]);
  const g = await waitFor(async () => { const r = await q("SELECT status, result FROM league_games WHERE id = 'stuck-1'"); return r[0].status === 'finished' ? r[0] : null; });
  assert.equal(g.result, '1/2');
  await waitFor(async () => (await q('SELECT status FROM league_matches WHERE id = ?', [m.id]))[0].status === 'finished');
  closeAll(a, b);
});
