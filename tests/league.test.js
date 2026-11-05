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
async function waitFor(fn, ms = 20000) { // band kompyuterda (parallel testlar) 8 s ba'zan yetmasdi
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
  // Yuklamada bazaga yozish sekinlashadi — qat'iy 1.2 s o'rniga ikkalasiga kelguncha kutamiz, so'ng takror kelmasligini tekshiramiz
  const got = (x) => x.socket.events.some((e) => e.e === 'match-found');
  await waitFor(async () => got(a) && got(b));
  await sleep(600);
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

test("Klub yutuqlari: liga natijasi (o'rin, G/D/M, ochko), chempionlik kubogi va Bayroqlar mavsumlari; kapitan/moderator va yangiliklar yo'q", async () => {
  // Bahs yakunlangach divizion ham yopiladi (1 turli liga) — chempion aniqlanadi
  const champ = await waitFor(async () => { const r = await q("SELECT champion_club FROM league_divisions WHERE kind = 'league'"); return r[0] && r[0].champion_club; });
  const current = new Date(Date.now() + 5 * 3600000).toISOString().slice(0, 7);
  const now = new Date().toISOString();
  await q("INSERT INTO war_points (id, season, club_country, club_code, user_id, opponent_code, points, created_at) VALUES ('wp1', '2026-01', 'Uzbekistan', 'uz', ?, 'kz', 4, ?), ('wp2', ?, 'Uzbekistan', 'uz', ?, 'kz', 3, ?)", [a.id, now, current, a.id, now]);
  const uz = await srv.api(null, '/api/country-clubs/Uzbekistan/honours');
  const kz = await srv.api(null, '/api/country-clubs/Kazakhstan/honours');
  for (const [name, h] of [['Uzbekistan', uz], ['Kazakhstan', kz]]) {
    assert.equal(h.success, true);
    assert.equal(h.leagues.length, 1, name + ': bitta liga');
    const l = h.leagues[0];
    assert.equal(l.kind, 'league');
    assert.equal(l.season, 1);
    assert.equal(l.clubs, 2);
    assert.equal(l.finished, true);
    assert.ok(l.played >= 1, "bahs o'ynalgan"); // oldingi test bahsni qayta ochib yopadi — 2 bo'lishi mumkin
    assert.equal(l.champion, champ === name);
    assert.equal(l.place, champ === name ? 1 : 2);
    assert.equal(l.won + l.drawn + l.lost, l.played);
    assert.equal(h.trophies.league, champ === name ? 1 : 0);
    assert.equal(h.trophies.champions, 0);
  }
  // Bayroqlar: o'tgan mavsumda yagona ochkoli klub — chempion; joriy oy — "davom etmoqda", kubok berilmaydi
  assert.deepEqual(uz.flags.map((f) => [f.season, f.place, f.points, f.champion, f.current]), [[current, 1, 3, false, true], ['2026-01', 1, 4, true, false]]);
  assert.ok(uz.flags[1].territories > 0);
  assert.equal(uz.trophies.flags, 1);
  assert.deepEqual(kz.flags, []);
  // Hech qatnashmagan klub — bo'sh
  const none = await srv.api(null, '/api/country-clubs/Chile/honours');
  assert.deepEqual([none.leagues, none.flags, none.trophies], [[], [], { league: 0, champions: 0, flags: 0 }]);
  assert.equal((await srv.api(null, '/api/country-clubs/' + encodeURIComponent('<x>') + '/honours')).status, 404);
  // Olib tashlangan: rahbariyat va yangiliklar API, jadvallar
  for (const [m, p] of [['GET', '/staff'], ['POST', '/roles'], ['POST', '/news']]) {
    assert.equal((await fetch(srv.base + '/api/country-clubs/Uzbekistan' + p, { method: m, headers: { Authorization: 'Bearer ' + a.token, 'Content-Type': 'application/json' }, body: m === 'POST' ? '{}' : undefined })).status, 404, m + ' ' + p);
  }
  assert.deepEqual(await q("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('club_roles', 'club_news')"), []);
  // Klub chatidagi xabarni faqat sayt admini o'chiradi (avval kapitan/moderator ham)
  const msg = await srv.api(a, '/api/chat/messages', 'POST', { roomId: 'club_Uzbekistan', message: 'salom' });
  const id = msg.messageId;
  assert.ok(id, 'xabar yozildi');
  assert.equal((await srv.api(a, '/api/chat/messages/' + id, 'DELETE')).status, 403);
});
