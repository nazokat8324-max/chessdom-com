// 👤 Mehmon rejimi: ro'yxatdan o'tmasdan o'ynash, cheklovlar, reytingsiz o'yin, ro'yxatdan o'tganda akkaunt saqlanishi, tozalash
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, once, play, finish, closeAll, uniq, sleep } = require('./helpers');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

async function guest(lang) {
  const d = await srv.api(null, '/api/auth/guest', 'POST', { lang });
  assert.equal(d.success, true, JSON.stringify(d));
  return { id: d.user.id, name: d.user.username, token: d.token, user: d.user };
}

test("Mehmon akkaunti: tilga qarab nom, token ishlaydi, mehmon nomi bilan ro'yxatdan o'tib bo'lmaydi", async () => {
  const g = await guest('uz');
  assert.match(g.name, /^Mehmon-[0-9a-f]{5}$/);
  assert.equal(g.user.guest, true);
  assert.equal((await srv.api(g, '/api/notifications')).success, true);
  assert.match((await guest('ru')).name, /^Гость-/);
  assert.match((await guest('xx')).name, /^Guest-/);
  const r = await srv.api(null, '/api/auth/register', 'POST', { username: 'mehmon-abc12', email: 'x@t.uz', password: 'secret1' });
  assert.equal(r.status, 400);
  assert.equal(r.message, 'Bu nom band qilingan!');
});

test("Mehmonga yozuvchi amallar yopiq (ro'yxatdan o'ting), o'qish va navbat ochiq", async () => {
  const g = await guest('uz');
  const u = await srv.register('Fr');
  for (const [url, body] of [['/api/friends/request', { username: u.name }], ['/api/chat/messages', { roomId: 'user_' + u.id, message: 'salom' }], ['/api/country-clubs/join', { country: 'Uzbekistan', code: 'uz' }], ['/api/follow', { username: u.name }]]) {
    const r = await srv.api(g, url, 'POST', body);
    assert.equal(r.status, 403, url);
    assert.equal(r.guest, true, url);
  }
  assert.equal((await srv.api(g, '/api/leaderboard')).success, true);
  assert.equal((await srv.api(g, '/api/users/me/country', 'POST', { country: 'uz' })).success, true);
});

test("Mehmon reytingli navbatdagi o'yinchi bilan juftlanadi, lekin o'yin reytingsiz; reyting jadvalida mehmon yo'q; ro'yxatdan o'tsa o'yinlari saqlanadi", async () => {
  const g = await guest('uz');
  const u = await srv.register('Mm');
  g.socket = await srv.connect(g);
  u.socket = await srv.connect(u);
  const join = (p) => srv.api(p, '/api/matchmaking/join', 'POST', { socketId: p.socket.id, initialTime: 180, increment: 2, rated: true });
  assert.equal((await join(u)).matched, false);
  const fu = once(u.socket, 'match-found'), fg = once(g.socket, 'match-found');
  assert.equal((await join(g)).matched, true);
  const [mu, mg] = await Promise.all([fu, fg]);
  assert.equal(mu.rated, false, "mehmon bilan o'yin reytingsiz");
  assert.equal(mg.rated, false);
  const white = mu.color === 'w' ? u : g, black = white === u ? g : u;
  const game = { roomId: mu.roomId, white, black };
  await play(game, ['e2e4', 'e7e5']);
  // Mehmon chati raqibga yetmaydi
  g.socket.emit('game-chat', { roomId: game.roomId, message: 'spam' });
  await sleep(300);
  assert.ok(!u.socket.events.some((x) => x.e === 'game-chat'), 'mehmon chati yuborilmadi');
  const res = await finish(game, black === g ? 'white-resigns' : 'black-resigns'); // mehmon yutadi
  assert.equal(res.rated, false);
  const stats = await srv.api(null, '/api/stats/' + u.name);
  assert.equal(stats.rating, 1500, "reyting o'zgarmadi");
  const lb = await srv.api(null, '/api/leaderboard');
  assert.ok(lb.leaderboard.some((p) => p.username === u.name));
  assert.ok(!lb.leaderboard.some((p) => p.username === g.name), "mehmon reyting jadvalida yo'q");
  const top = await srv.api(null, '/api/daily-winners?period=day');
  assert.ok(!top.winners.some((p) => p.username === g.name), "mehmon Top 5 da yo'q");
  closeAll(g, u);

  // Ro'yxatdan o'tish (mehmon tokeni bilan) — o'sha akkaunt, o'yini bilan
  const newName = uniq('Claim');
  const reg = await srv.api(g, '/api/auth/register', 'POST', { username: newName, email: newName.toLowerCase() + '@t.uz', password: 'secret1' });
  assert.equal(reg.success, true, JSON.stringify(reg));
  assert.equal(reg.user.id, g.id, 'akkaunt saqlandi');
  assert.equal(reg.user.guest, undefined);
  const hist = await srv.api(null, '/api/users/' + newName + '/history');
  assert.equal(hist.total, 1, "mehmon o'yini saqlandi");
  assert.equal(hist.games[0].result, 'win');
  const oppHist = await srv.api(null, '/api/users/' + u.name + '/history');
  assert.equal(oppHist.games[0].opponent, newName, "raqib tarixida yangi nom");
  // Endi oddiy foydalanuvchi: do'stlik so'rovi 403 emas, reyting jadvalida bor
  const me = { token: reg.token };
  assert.notEqual((await srv.api(me, '/api/friends/request', 'POST', { username: u.name })).status, 403);
  assert.equal((await srv.api(null, '/api/auth/login', 'POST', { username: newName, password: 'secret1' })).success, true);
});

test("Muddati o'tgan mehmon akkaunti tozalanadi va tokeni ishlamay qoladi", async () => {
  const g = await guest('en');
  const r = await srv.api(null, '/api/test/cleanup-guests', 'POST', {});
  assert.ok(r.ids.includes(g.id));
  assert.equal((await srv.api(g, '/api/notifications')).status, 401);
  assert.equal((await srv.api(null, '/api/users/' + encodeURIComponent(g.name) + '/profile')).status, 404);
});
