// 🛂 Shaxmat pasporti: raqib davlati muhri (o'ynaganda oddiy, yutganda oltin), "Xalqaro" (un) va mehmon — muhrsiz
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, once, startGame, play, finish, closeAll, sleep } = require('./helpers');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

const passport = async (u) => (await srv.api(null, '/api/users/' + encodeURIComponent(u.name) + '/extras')).passport;
const setCountry = (u, country) => srv.api(u, '/api/users/me/country', 'POST', { country });

test("Pasport: g'alaba — oltin muhr, mag'lubiyat/durrang — oddiy muhr; takroriy o'yin yangi muhr emas; game-ended da passport", async () => {
  const A = await srv.register('Pa'), B = await srv.register('Pb');
  await setCountry(A, 'uz'); await setCountry(B, 'kz');
  assert.deepEqual(await passport(A), [], "boshida bo'sh");
  // 1-o'yin: oq yutadi (qora taslim)
  let g = await startGame(srv, A, B);
  await play(g, ['e2e4', 'e7e5']);
  const winnerIsA = g.white === A;
  const endedBlack = once(g.black.socket, 'game-ended');
  const endedWhite = await finish(g, 'black-resigns');
  const endedB = await endedBlack;
  // Qora taslim — g'olib doim oq (ranglar tasodifiy: oq A ham, B ham bo'lishi mumkin)
  const pa = endedWhite.passport, pb = endedB.passport;
  assert.deepEqual(pa, { country: winnerIsA ? 'kz' : 'uz', isNew: true, gold: true }, "g'olibga oltin muhr");
  assert.deepEqual(pb, { country: winnerIsA ? 'uz' : 'kz', isNew: true, gold: false }, "yutqazganga oddiy muhr");
  closeAll(A, B);
  // 2-o'yin: durrang — yangi muhr emas, o'yinlar soni oshadi
  g = await startGame(srv, A, B);
  await play(g, ['e2e4', 'e7e5']);
  const d = await finish(g, 'draw');
  assert.deepEqual([d.passport.isNew, d.passport.gold], [false, false]);
  closeAll(A, B);
  const winner = winnerIsA ? A : B, loser = winnerIsA ? B : A;
  const w = (await passport(winner))[0], l = (await passport(loser))[0];
  assert.deepEqual([w.country, w.games, w.wins, !!w.wonAt, w.winOpponent, w.firstOpponent], [winnerIsA ? 'kz' : 'uz', 2, 1, true, loser.name, loser.name]);
  assert.deepEqual([l.games, l.wins, l.wonAt, l.winOpponent], [2, 0, null, null]);
});

test("Ipak yo'li to'plami: 6 davlat — bronza (game-ended.passport.silk va bildirishnoma), 12 — kumush, 12 oltin — oltin; /api/passport", async () => {
  const C = require('../caravan');
  assert.deepEqual(C.SILK_ROAD, ['cn', 'mn', 'kz', 'kg', 'uz', 'tj', 'tm', 'af', 'ir', 'iq', 'sy', 'tr']);
  const st = (codes, wins) => codes.map((c) => ({ country: c, wins: wins ? 1 : 0 }));
  assert.equal(C.silkTier(st(C.SILK_ROAD.slice(0, 5))).tier, 0);
  assert.equal(C.silkTier(st(C.SILK_ROAD.slice(0, 6))).tier, 1);
  assert.equal(C.silkTier([...st(C.SILK_ROAD.slice(0, 11), true), ...st(['tr'])]).tier, 2);
  assert.equal(C.silkTier(st(C.SILK_ROAD, true)).tier, 3);
  assert.equal(C.silkTier(st(['de', 'fr', 'it', 'es', 'gb', 'pl'], true)).tier, 0, "Ipak yo'lidan tashqari davlatlar sanalmaydi");
  // 5 ta Ipak yo'li muhri bazada, 6-si o'yinda — bronza
  const A = await srv.register('Pk'), B = await srv.register('Pl');
  await setCountry(B, 'tm');
  const path = require('path');
  await new Promise((resolve, reject) => {
    const d = new (require('sqlite3').Database)(path.join(srv.dir, 'test.sqlite'));
    d.configure('busyTimeout', 5000);
    const now = new Date().toISOString();
    d.serialize(() => {
      for (const c of ['cn', 'mn', 'kz', 'kg', 'uz']) d.run('INSERT INTO passport_stamps (id, user_id, country, first_at, games, wins) VALUES (?, ?, ?, ?, 1, 0)', ['s' + c + A.id, A.id, c, now]);
      d.close((err) => (err ? reject(err) : resolve()));
    });
  });
  const g = await startGame(srv, A, B);
  await play(g, ['e2e4', 'e7e5']);
  const endA = once(A.socket, 'game-ended');
  await finish(g, 'draw');
  const p = (await endA).passport;
  assert.deepEqual([p.country, p.isNew, p.silk], ['tm', true, 1], 'bronza ochildi');
  closeAll(A, B);
  await sleep(200);
  const notes = await srv.api(A, '/api/notifications');
  assert.ok(notes.notifications.some((n) => n.type === 'silk_road' && n.data.tier === 1), 'bildirishnoma');
  const mine = await srv.api(A, '/api/passport');
  assert.equal(mine.passport.length, 6);
  assert.equal((await fetch(srv.base + '/api/passport')).status, 401, 'faqat kirgan foydalanuvchi');
});

test("Pasport: davlati tanlanmagan («Xalqaro») raqib muhr bermaydi; mehmonda pasport yo'q", async () => {
  const A = await srv.register('Pc'), C = await srv.register('Pd'); // C — davlat tanlamagan
  await setCountry(A, 'tr');
  let g = await startGame(srv, A, C);
  await play(g, ['e2e4', 'e7e5']);
  await finish(g, 'white-resigns');
  closeAll(A, C);
  assert.deepEqual(await passport(A), [], "raqibda davlat yo'q — muhr yo'q");
  assert.equal((await passport(C)).length, 1, 'C esa A ning davlatini oladi');
  // Mehmon: extras.passport = null
  const guest = await srv.api(null, '/api/auth/guest', 'POST', { lang: 'uz' });
  assert.equal(guest.success, true);
  assert.equal((await srv.api(null, '/api/users/' + encodeURIComponent(guest.user.username) + '/extras')).passport, null);
  await sleep(50);
});
