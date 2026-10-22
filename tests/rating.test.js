// 🌱 Yumshoq start: taxminiy reyting (K=64), tajribali o'yinchi taxminiyga qarshi (K=16), matchmaking yangini yangi bilan juftlaydi
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3');
const { startServer, once } = require('./helpers');

// Baza funksiyalari to'g'ridan-to'g'ri (vaqtinchalik SQLite)
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chessdom-rating-'));
process.env.SQLITE_FILE = path.join(dir, 'r.sqlite');
delete process.env.DATABASE_URL;
const db = require('../database');

const stats = (n) => JSON.stringify({ wins: Math.ceil(n / 2), losses: Math.floor(n / 2), draws: 0 });
async function user(name, blitzGames) {
  const u = await db.createUser({ username: name, email: name + '@t.uz', passwordHash: 'x' });
  await db.dbRun('UPDATE users SET stats = ?, stats_by_mode = ? WHERE id = ?', [stats(blitzGames), JSON.stringify({ blitz: JSON.parse(stats(blitzGames)) }), u.id]);
  return u;
}
let srv;
before(async () => { await db.initDatabase(); });
after(async () => { await db.closeDatabase(); if (srv) await srv.stop(); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} });

test('Taxminiy reyting chegarasi', async () => {
  assert.equal(db.PROVISIONAL_GAMES, 15);
  const u = { stats_by_mode: { blitz: { wins: 10, losses: 4, draws: 0 } }, stats: { wins: 10, losses: 4, draws: 0 } };
  assert.equal(db.isProvisional(u, 'blitz', false), true, '14 o\'yin — hali taxminiy');
  assert.equal(db.isProvisional({ stats_by_mode: { blitz: { wins: 15 } } }, 'blitz', false), false);
  assert.equal(db.isProvisional({ stats_by_mode: { blitz: { wins: 15 } } }, 'blitz', true), true, "joriy o'yin ham sanalsa — 15-o'yin hali taxminiy");
  assert.equal(db.isProvisional({}, 'rapid', false), true);
});

test("K koeffitsienti: yangi — 64, tajribali — 32, tajribali yangiga qarshi — 16", async () => {
  // Statistika endGame da reytingdan oldin yoziladi: 1 = joriy o'yin bilan birinchi o'yin
  const n1 = await user('Nov1', 1), n2 = await user('Nov2', 1);
  const e1 = await user('Exp1', 40), e2 = await user('Exp2', 40);
  const r = (u, res, opp) => db.updateUserRatingByResult(u.id, res, 1500, 'blitz', 1500, opp.id);
  assert.equal((await r(n1, 'win', n2)).modeChange, 32, 'yangi vs yangi: 64 × 0.5');
  assert.equal((await r(e1, 'win', e2)).modeChange, 16, 'tajribali vs tajribali: 32 × 0.5');
  const e3 = await user('Exp3', 40), n3 = await user('Nov3', 1);
  assert.equal((await r(e3, 'loss', n3)).modeChange, -8, "tajribali yangi o'yinchiga yutqazsa: 16 × 0.5");
  assert.equal((await r(n3, 'win', e3)).modeChange, 32);
  // Umumiy reyting ham shu qoida bo'yicha
  const n4 = await user('Nov4', 1);
  assert.equal((await r(n4, 'loss', e3)).change, -32);
});

test("Matchmaking va chaqiruv: raqibning reytingi taxminiymi — match-found da belgilanadi", async () => {
  srv = await startServer();
  const exp = await srv.register('Mexp'), nov = await srv.register('Mnov');
  await new Promise((resolve, reject) => {
    const d = new sqlite3.Database(path.join(srv.dir, 'test.sqlite'));
    d.run('UPDATE users SET stats_by_mode = ? WHERE id = ?', [JSON.stringify({ blitz: { wins: 20, losses: 20, draws: 0 } }), exp.id], (err) => d.close(() => (err ? reject(err) : resolve())));
  });
  const se = await srv.connect(exp), sn = await srv.connect(nov);
  const join = (u, s) => srv.api(u, '/api/matchmaking/join', 'POST', { socketId: s.id, initialTime: 180, increment: 2, rated: true });
  const fe = once(se, 'match-found'), fn = once(sn, 'match-found');
  assert.equal((await join(exp, se)).matched, false);
  assert.equal((await join(nov, sn)).matched, true);
  const [me, mn] = await Promise.all([fe, fn]);
  assert.equal(me.opponent.username, nov.name);
  assert.equal(me.opponent.provisional, true, "yangi o'yinchi — taxminiy");
  assert.equal(mn.opponent.provisional, false, "40 ta blits o'yini bor — aniq");
  se.disconnect(); sn.disconnect();
});
