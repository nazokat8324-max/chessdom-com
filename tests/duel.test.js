// ⚔️ Bahs: do'st bilan 3/5/7 o'yinlik seriya — chaqiruvda series, revansh = keyingi o'yin, hisob, g'olib, to'xtatish, profil
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, startGame, play, finish, closeAll, once } = require('./helpers');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

// Revansh orqali bahsning keyingi o'yini → yangi {roomId, white, black}
async function nextGame(g) {
  const fa = once(g.white.socket, 'match-found'), fb = once(g.black.socket, 'match-found');
  g.white.socket.emit('rematch-offer', { roomId: g.roomId });
  await once(g.black.socket, 'rematch-offered');
  g.black.socket.emit('rematch-accept', { roomId: g.roomId });
  const [mw, mb] = await Promise.all([fa, fb]);
  const white = mw.color === 'w' ? g.white : g.black;
  return { roomId: mw.roomId, white, black: white === g.white ? g.black : g.white, match: { a: mw, b: mb } };
}
const resignBy = (g, user) => (g.white === user ? 'white-resigns' : 'black-resigns');

test("3 o'yinlik bahs: hisob, keyingi o'yin, g'olib, yutuq, bildirishnoma va profil", async () => {
  const a = await srv.register('Dua'), b = await srv.register('Dub');
  let g = await startGame(srv, a, b, { series: 3, rated: false });
  assert.deepEqual({ bestOf: g.match.a.duel.bestOf, game: g.match.a.duel.game }, { bestOf: 3, game: 1 });
  assert.deepEqual(g.match.a.duel.players, [a.name, b.name]);
  // 1-o'yin: b taslim → a 1:0
  await play(g, ['e2e4', 'e7e5']);
  let end = await finish(g, resignBy(g, b));
  assert.deepEqual(end.duel.scores, { [a.name]: 1, [b.name]: 0 });
  assert.equal(end.duel.finished, false);
  // 2-o'yin: durrang → 1½:½ (ranglar almashadi)
  const prevWhite = g.white;
  g = await nextGame(g);
  assert.notEqual(g.white, prevWhite);
  assert.equal(g.match.a.duel.game, 2);
  await play(g, ['e2e4', 'e7e5']);
  end = await finish(g, 'draw');
  assert.deepEqual(end.duel.scores, { [a.name]: 1.5, [b.name]: 0.5 });
  assert.equal(end.duel.finished, false);
  // 3-o'yin: a yutadi → 2½:½, bahs tugadi
  g = await nextGame(g);
  await play(g, ['e2e4', 'e7e5']);
  end = await finish(g, resignBy(g, b));
  assert.deepEqual({ finished: end.duel.finished, winner: end.duel.winner, played: end.duel.played }, { finished: true, winner: a.name, played: 3 });
  // Bahs tugagach revansh — oddiy o'yin (bahssiz)
  const g4 = await nextGame(g);
  assert.equal(g4.match.a.duel, undefined);
  await finish(g4, 'white-resigns');

  const ex = await srv.api(null, '/api/users/' + a.name + '/extras');
  assert.deepEqual({ total: ex.duels.total, won: ex.duels.won }, { total: 1, won: 1 });
  assert.deepEqual({ opponent: ex.duels.recent[0].opponent, me: ex.duels.recent[0].me, opp: ex.duels.recent[0].opp, result: ex.duels.recent[0].result }, { opponent: b.name, me: 2.5, opp: 0.5, result: 'win' });
  assert.ok(ex.achievements.some((x) => x.key === 'duel_win'), "duel_win yutug'i");
  assert.equal((await srv.api(null, '/api/users/' + b.name + '/extras')).duels.lost, 1);
  const notes = await srv.api(b, '/api/notifications');
  assert.ok(notes.notifications.some((n) => n.type === 'duel_end' && n.data.result === 'loss' && n.data.opponent === a.name));
  closeAll(a, b);
});

test("Bahs: 2:0 bo'lsa 3-o'yinsiz tugaydi; keyingi o'yindan voz kechish — to'xtatiladi", async () => {
  const a = await srv.register('Dsa'), b = await srv.register('Dsb');
  let g = await startGame(srv, a, b, { series: 3, rated: false });
  await play(g, ['e2e4', 'e7e5']);
  await finish(g, resignBy(g, b));
  g = await nextGame(g);
  await play(g, ['e2e4', 'e7e5']);
  const end = await finish(g, resignBy(g, b));
  assert.deepEqual({ finished: end.duel.finished, winner: end.duel.winner, played: end.duel.played }, { finished: true, winner: a.name, played: 2 });

  // Yangi 5 o'yinlik bahs: 1-o'yindan keyin b davom etmaydi
  let h = await startGame(srv, a, b, { series: 5, rated: false });
  assert.equal(h.match.a.duel.bestOf, 5);
  await play(h, ['e2e4', 'e7e5']);
  await finish(h, resignBy(h, a));
  const stopped = once(a.socket, 'duel-stopped');
  b.socket.emit('rematch-decline', { roomId: h.roomId });
  const s = await stopped;
  assert.equal(s.duel.stopped, true);
  assert.deepEqual(s.duel.scores, { [a.name]: 0, [b.name]: 1 });
  const ex = await srv.api(null, '/api/users/' + b.name + '/extras');
  assert.equal(ex.duels.recent[0].result, 'stopped');
  assert.equal(ex.duels.total, 1, "to'xtatilgan bahs natijalarga kirmaydi");
  // Noto'g'ri series — oddiy o'yin
  const one = await startGame(srv, a, b, { series: 4, rated: false });
  assert.equal(one.match.a.duel, undefined);
  await finish(one, 'white-resigns');
  closeAll(a, b);
});
