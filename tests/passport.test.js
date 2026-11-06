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
  const [pa, pb] = winnerIsA ? [endedWhite.passport, endedB.passport] : [endedB.passport, endedWhite.passport];
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
