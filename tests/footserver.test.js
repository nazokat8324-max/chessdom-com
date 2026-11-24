// ⚽ Shaxmat-futbol onlayn: stol, navbat, har harakat serverda tekshiriladi (soxta harakat/gol rad etiladi), gol va markaz, taslim, revansh,
// bir davlat — mehmon formasi, navbat vaqti (3 marta — mag'lubiyat), uzilish, band o'yinchi, mehmon, hech narsa yozilmaydi
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, ack, sleep } = require('./helpers');
const F = require('../footchess');

let srv;
before(async () => { srv = await startServer({ FOOT_MOVE_MS: '1500', FOOT_AWAY_MS: '1200', FOOT_PEN_MS: '1500', FOOT_LINEUP_MS: '1500' }); });
after(async () => { await srv.stop(); });

const waitState = (sock, pred, ms = 8000) => new Promise((resolve, reject) => {
  const t = setTimeout(() => { sock.off('fc-state', h); reject(new Error('fc-state kelmadi')); }, ms);
  const h = (st) => { if (pred(st)) { clearTimeout(t); sock.off('fc-state', h); resolve(st); } };
  sock.on('fc-state', h);
});
async function two(a = 'Fa', b = 'Fb', server = srv) {
  const A = await server.register(a), B = await server.register(b);
  A.socket = await server.connect(A); B.socket = await server.connect(B);
  return [A, B];
}
async function startTable(A, B, lu) {
  const c = await ack(A.socket, 'fc-create', {});
  assert.equal(c.ok, true);
  const j = await ack(B.socket, 'fc-join', { code: c.code });
  assert.equal(j.ok, true);
  assert.equal(j.state.status, 'lineup');
  const s = await lineups(A, B, c.code, lu);
  const byColor = { [s.players.w.username === A.name ? 'w' : 'b']: A, [s.players.w.username === A.name ? 'b' : 'w']: B };
  return { code: c.code, state: s, w: byColor.w, b: byColor.b };
}
// Tarkib bosqichi: ikkalasi tarkib yuboradi (standart) → o'yin boshlanadi
async function lineups(A, B, code, lu) {
  const active = waitState(A.socket, (x) => x.status === 'active');
  for (const U of [A, B]) assert.equal((await ack(U.socket, 'fc-lineup', { code, lineup: (lu && lu[U === A ? 0 : 1]) || F.DEFAULT_LINEUP })).ok, true);
  return active;
}
// Oq gol uradi, qora otini u yoq-bu yoqqa yuradi (tests/footchess bilan bir xil qoidalar bo'yicha klient tomonda tanlanadi)
function pick(st) {
  const L = F.actions(st, st.turn);
  const g = L.find((a) => a.goal === st.turn);
  if (g && st.turn === 'w') return g;
  if (st.turn === 'w') {
    const h = st.ball.h && F.byId(st, st.ball.h);
    if (h && h.side === 'w') { const mv = L.filter((a) => a.id === h.id && a.t === 'move').sort((a, b) => (b.x - a.x) - Math.abs(a.y - 3) + Math.abs(b.y - 3)); if (mv.length) return mv[0]; }
  }
  return L.find((a) => a.t === 'move' && a.id === st.turn + 'O1') || L.find((a) => a.t === 'move');
}
const send = (u, code, a) => ack(u.socket, 'fc-move', { code, t: a.t, id: a.id, x: a.x, y: a.y });

test("Stol: yaratish, ro'yxat, qo'shilish; navbat va qonuniylik serverda; gol → hisob va markaz; tomoshabin; taslim; revansh", async () => {
  const [A, B] = await two();
  const V = await srv.register('Fv'); V.socket = await srv.connect(V);
  const c = await ack(A.socket, 'fc-create', {});
  assert.equal(c.ok, true);
  assert.ok((await ack(V.socket, 'fc-list', {})).waiting.some((t) => t.code === c.code && t.host.username === A.name));
  assert.equal((await ack(A.socket, 'fc-join', { code: c.code })).reason, 'self');
  assert.equal((await ack(V.socket, 'fc-join', { code: 'NOPE00' })).reason, 'not_found');
  const j = await ack(B.socket, 'fc-join', { code: c.code });
  assert.equal(j.ok, true);
  assert.equal((await ack(V.socket, 'fc-join', { code: c.code })).reason, 'started');
  const code = c.code;
  assert.deepEqual([j.state.status, j.state.st, j.state.lineupReady], ['lineup', null, { w: false, b: false }]);
  let s = await lineups(A, B, code);
  assert.equal(s.status, 'active');
  assert.deepEqual([s.st.turn, s.st.ball.h, s.st.score.w, s.st.score.b, s.st.pcs.length], ['w', 'wP3', 0, 0, 14]);
  const w = s.players.w.username === A.name ? A : B, b = w === A ? B : A;
  assert.equal(j.myColor, w === B ? 'w' : 'b');
  assert.ok((await ack(V.socket, 'fc-list', {})).live.some((t) => t.code === code), "jonli o'yinlar ro'yxatida");
  const watch = await ack(V.socket, 'fc-watch', { code });
  assert.deepEqual([watch.ok, watch.myColor, watch.state.status], [true, null, 'active']);

  // Navbat qorada emas; noqonuniy katak; soxta gol (piyoda darvozagacha yeta olmaydi); tomoshabin yura olmaydi; buzuq ma'lumot
  assert.equal((await send(b, code, { t: 'move', id: 'bO1', x: 9, y: 2 })).reason, 'not_your_turn');
  assert.equal((await send(V, code, { t: 'move', id: 'wP3', x: 5, y: 3 })).reason, 'not_your_turn');
  assert.equal((await send(w, code, { t: 'move', id: 'bO1', x: 9, y: 2 })).reason, 'invalid_move');
  assert.equal((await send(w, code, { t: 'kick', id: 'wP3', x: 11, y: 3 })).reason, 'invalid_move');
  assert.equal((await send(w, code, { t: 'move', id: 'wSH', x: 5, y: 5 })).reason, 'invalid_move');
  for (const bad of [null, 5, 'x', { code }, { code, t: 'move', id: 'wP3', x: '5', y: 3 }]) assert.equal((await ack(w.socket, 'fc-move', bad)).ok, false);

  // Gol bo'lguncha o'ynash — holatni server yuboradi, harakat shu holatdan tanlanadi
  const spect = waitState(V.socket, (x) => x.st.score.w === 1);
  for (let i = 0; i < 40 && s.st.score.w === 0; i++) {
    const a = pick(s.st);
    const mover = s.st.turn === 'w' ? w : b;
    const next = waitState(A.socket, (x) => x.seq > s.seq);
    assert.equal((await send(mover, code, a)).ok, true, JSON.stringify(a));
    s = await next;
  }
  assert.equal(s.st.score.w, 1, "oq gol urdi");
  assert.deepEqual([s.ev.goal, s.kickoff, s.st.turn, s.st.ball.h], ['w', 'b', 'b', 'bP3'], "qora markazdan boshlaydi");
  assert.equal((await spect).st.score.w, 1, 'tomoshabin ham ko\'radi');

  // Taslim → g'olib raqib; revansh — ikkalasi so'rasa yangi o'yin (0:0)
  const ended = waitState(A.socket, (x) => x.status === 'over');
  assert.equal((await ack(b.socket, 'fc-resign', { code })).ok, true);
  const o = await ended;
  assert.deepEqual(o.result, { winner: 'w', reason: 'resign' });
  assert.equal((await ack(V.socket, 'fc-rematch', { code })).ok, false);
  assert.equal((await ack(w.socket, 'fc-rematch', { code })).ok, true);
  const again = waitState(A.socket, (x) => x.status === 'lineup');
  assert.equal((await ack(b.socket, 'fc-rematch', { code })).ok, true);
  await again;
  const r = await lineups(A, B, code);
  assert.deepEqual([r.st.score.w, r.st.score.b, r.st.moves, r.result], [0, 0, 0, null]);
  await ack(A.socket, 'fc-resign', { code });

  // Hech narsa yozilmaydi: statistika va tarix bo'sh
  for (const u of [A, B]) {
    const st = await srv.api(u, '/api/stats/' + u.name);
    assert.equal(st.stats.gamesPlayed || 0, 0, 'statistika');
    const h = await srv.api(u, '/api/users/' + u.name + '/history');
    assert.equal((h.games || h.history || []).length, 0, 'tarix');
  }
  for (const u of [A, B, V]) u.socket.disconnect();
});

test("Bayroq: o'yinchi davlati holatda; ikkalasi bir davlatdan — mehmon formasi (away); davlatsiz — null", async () => {
  const [A, B] = await two('Fc', 'Fd');
  await srv.api(A, '/api/users/me/country', 'POST', { country: 'uz' });
  await srv.api(B, '/api/users/me/country', 'POST', { country: 'uz' });
  let g = await startTable(A, B);
  assert.deepEqual([g.state.players.w.country, g.state.players.b.country, g.state.away], ['uz', 'uz', true]);
  await ack(A.socket, 'fc-resign', { code: g.code });
  await srv.api(B, '/api/users/me/country', 'POST', { country: 'kz' });
  g = await startTable(A, B);
  assert.equal(g.state.away, false);
  assert.deepEqual([g.state.players[g.w === A ? 'w' : 'b'].country, g.state.players[g.w === B ? 'w' : 'b'].country], ['uz', 'kz']);
  await ack(A.socket, 'fc-resign', { code: g.code });
  const [C, D] = await two('Fe', 'Ff');
  g = await startTable(C, D);
  assert.deepEqual([g.state.players.w.country, g.state.players.b.country, g.state.away], [null, null, false]);
  await ack(C.socket, 'fc-resign', { code: g.code });
  for (const u of [A, B, C, D]) u.socket.disconnect();
});

test("Navbat vaqti: tugasa navbat raqibga o'tadi; ketma-ket 3 marta — texnik mag'lubiyat; harakat qilsa hisob nolga tushadi", async () => {
  const [A, B] = await two('Fg', 'Fh');
  const g = await startTable(A, B);
  let s = await waitState(A.socket, (x) => x.ev && x.ev.timeout === 'w', 4000);
  assert.deepEqual([s.st.turn, s.timeouts.w, s.st.moves], ['b', 1, 0]);
  // Qora yuradi, oq yana kutadi — oqning hisobi 2, keyin qora yursa oqniki 3 → mag'lubiyat
  const a = pick(s.st);
  assert.equal((await send(g.b, g.code, a)).ok, true);
  s = await waitState(A.socket, (x) => x.timeouts.w === 2, 4000);
  assert.equal((await send(g.b, g.code, pick(s.st))).ok, true);
  const o = await waitState(A.socket, (x) => x.status === 'over', 4000);
  assert.deepEqual(o.result, { winner: 'b', reason: 'timeout' });
  assert.equal(o.timeouts.b, 0, "yurgan tomonning hisobi nolda");
  for (const u of [A, B]) u.socket.disconnect();
});

test("Uzilish: o'yinchi qaytmasa — mag'lubiyat (abandon); kutayotgan stol egasi uzilsa — stol yopiladi", async () => {
  const [A, B] = await two('Fi', 'Fj');
  const g = await startTable(A, B);
  const loser = g.w, winner = g.b;
  const ended = waitState(winner.socket, (x) => x.status === 'over', 6000);
  loser.socket.disconnect();
  const o = await ended;
  assert.deepEqual(o.result, { winner: winner === g.w ? 'w' : 'b', reason: 'abandon' });
  const C = await srv.register('Fk'); C.socket = await srv.connect(C);
  const c = await ack(C.socket, 'fc-create', {});
  C.socket.disconnect();
  await sleep(400);
  assert.equal((await ack(winner.socket, 'fc-list', {})).waiting.some((t) => t.code === c.code), false);
  winner.socket.disconnect();
});

test("Band o'yinchi: futbol o'yinida — yana stol ocholmaydi, 2 ga 2 va onlayn navbatga kira olmaydi; mehmon futbol o'ynay oladi", async () => {
  const [A, B] = await two('Fl', 'Fm');
  const g = await startTable(A, B);
  assert.equal((await ack(A.socket, 'fc-create', {})).reason, 'busy');
  assert.equal((await ack(A.socket, 'team-create', { initial: 600, increment: 5 })).reason, 'busy');
  const mm = await srv.api(A, '/api/matchmaking/join', 'POST', { socketId: A.socket.id, initialTime: 180, increment: 2, rated: true });
  assert.equal(mm.status, 409);
  const C = await srv.register('Fn'); C.socket = await srv.connect(C);
  const t = await ack(C.socket, 'fc-create', {});
  assert.equal((await ack(A.socket, 'fc-join', { code: t.code })).reason, 'busy');
  await ack(A.socket, 'fc-resign', { code: g.code });
  // Mehmon
  const gd = await srv.api(null, '/api/auth/guest', 'POST', { lang: 'uz' });
  assert.equal(gd.success, true);
  const G = { token: gd.token, name: gd.user.username };
  G.socket = await srv.connect(G);
  const j = await ack(G.socket, 'fc-join', { code: t.code });
  assert.equal(j.ok, true);
  assert.equal(j.state.status, 'lineup');
  await ack(G.socket, 'fc-resign', { code: t.code });
  for (const u of [A, B, C, G]) u.socket.disconnect();
});

test("Durrang (100 yurish, hisob teng) → penaltilar: tanlovlar sir, yurish rad etiladi, vaqt tugasa — o'tkazildi, seriya g'olibi", async () => {
  const [A, B] = await two('Fp', 'Fq');
  const V = await srv.register('Fr'); V.socket = await srv.connect(V);
  const g = await startTable(A, B);
  await ack(V.socket, 'fc-watch', { code: g.code });
  // Ikkala tomon otini u yoq-bu yoqqa yuradi — gol yo'q
  const hop = { w: [{ x: 1, y: 0 }, { x: 3, y: 1 }], b: [{ x: 9, y: 0 }, { x: 7, y: 1 }] };
  let pens = null;
  const gotPens = waitState(V.socket, (x) => !!x.pen, 20000).then((x) => { pens = x; });
  for (let i = 0; i < 100; i++) {
    const side = i % 2 ? 'b' : 'w', to = hop[side][Math.floor(i / 2) % 2];
    const r = await ack(g[side].socket, 'fc-move', { code: g.code, t: 'move', id: side + 'O1', x: to.x, y: to.y });
    assert.equal(r.ok, true, 'yurish ' + i);
  }
  await gotPens;
  assert.deepEqual([pens.status, pens.st.moves, pens.st.score.w, pens.st.score.b, pens.pen.kicks.length, pens.result], ['active', 100, 0, 0, 0, null]);
  assert.equal((await ack(g.w.socket, 'fc-move', { code: g.code, t: 'move', id: 'wO1', x: 1, y: 0 })).reason, 'penalties');
  const first = pens.pen.kicker, second = first === 'w' ? 'b' : 'w';
  // 1-zarba: hech kim tanlamaydi — vaqt tugaydi (FOOT_PEN_MS) → o'tkazildi
  let s = await waitState(V.socket, (x) => x.pen && x.pen.kicks.length === 1, 6000);
  assert.deepEqual([s.pen.kicks[0].side, s.pen.kicks[0].aim, s.pen.kicks[0].goal, s.ev.timeout], [first, null, false, true]);
  // Tanlov sir: tepuvchi tanlagach tomoshabin faqat belgini ko'radi
  const shown = waitState(V.socket, (x) => x.pen && x.pen.chosen.aim);
  assert.deepEqual(await ack(g[second].socket, 'fc-pen', { code: g.code, y: 4 }), { ok: true, role: 'aim' });
  s = await shown;
  assert.equal(JSON.stringify(s).includes('"aim":4'), false, 'tanlov oshkor emas');
  assert.equal((await ack(g[second].socket, 'fc-pen', { code: g.code, y: 2 })).reason, 'already');
  assert.equal((await ack(V.socket, 'fc-pen', { code: g.code, y: 2 })).reason, 'not_your_turn');
  assert.equal((await ack(g[first].socket, 'fc-pen', { code: g.code, y: 7 })).reason, 'invalid_move');
  const kick2 = waitState(V.socket, (x) => x.pen && x.pen.kicks.length === 2);
  assert.equal((await ack(g[first].socket, 'fc-pen', { code: g.code, y: 4 })).role, 'dive');
  s = await kick2;
  assert.deepEqual(s.pen.kicks[1], { side: second, aim: 4, dive: 4, goal: false }, 'qaytarildi');
  // Keyin: birinchi tepuvchi har doim uradi, ikkinchisi har doim qaytariladi → birinchi yutadi
  const over = waitState(V.socket, (x) => x.status === 'over', 15000);
  for (let k = 2; k < 12 && s.status === 'active'; k++) {
    const kicker = k % 2 === 0 ? first : second, keeper = kicker === first ? second : first;
    const next = waitState(V.socket, (x) => x.status === 'over' || (x.pen && x.pen.kicks.length === k + 1));
    await ack(g[kicker].socket, 'fc-pen', { code: g.code, y: 1 });
    await ack(g[keeper].socket, 'fc-pen', { code: g.code, y: kicker === first ? 5 : 1 });
    s = await next;
  }
  const o = await over;
  assert.deepEqual([o.result.winner, o.result.reason], [first, 'penalties']);
  assert.ok(o.result.pens[first] > o.result.pens[second]);
  for (const u of [A, B, V]) u.socket.disconnect();
});

test("Tarkib va almashtirish: tarkib o'yin boshlanguncha sir, noto'g'ri/takroriy rad; vaqt tugasa — standart; almashtirish navbat o'rniga, 3 marta, shoh/to'pli dona/chiqqan dona — rad", async () => {
  // Navbat vaqti oddiy (60 s) — sekin kompyuterda ham almashtirishlar orasida navbat o'tib ketmasin
  const srv2 = await startServer({ FOOT_LINEUP_MS: '1500' });
  const [A, B] = await two('Fs', 'Ft', srv2);
  const c = await ack(A.socket, 'fc-create', {});
  const j = await ack(B.socket, 'fc-join', { code: c.code });
  const code = c.code;
  const aColor = j.state.players.w.username === A.name ? 'w' : 'b';
  for (const bad of [null, [], ['SH', 'R1', 'R2', 'F1', 'F2', 'FZ'], ['R1', 'R1', 'R2', 'F1', 'F2', 'FZ'], ['R1', 'R2', 'F1', 'F2', 'FZ', 'XX'], 'R1']) {
    assert.equal((await ack(A.socket, 'fc-lineup', { code, lineup: bad })).reason, 'invalid_lineup', JSON.stringify(bad));
  }
  const mine = ['P1', 'P2', 'P4', 'P5', 'R2', 'P8'];
  const seen = waitState(B.socket, (x) => x.lineupReady && x.lineupReady[aColor]);
  assert.equal((await ack(A.socket, 'fc-lineup', { code, lineup: mine })).ok, true);
  const half = await seen;
  assert.equal(JSON.stringify(half).includes('P8'), false, "raqib tarkibi ko'rinmaydi");
  assert.equal((await ack(A.socket, 'fc-lineup', { code, lineup: F.DEFAULT_LINEUP })).reason, 'already');
  assert.equal((await ack(A.socket, 'fc-move', { code, t: 'move', id: 'wO1', x: 1, y: 0 })).reason, 'not_active');
  // B tanlamaydi — FOOT_LINEUP_MS dan keyin standart tarkib bilan boshlanadi
  let s = await waitState(A.socket, (x) => x.status === 'active', 5000);
  const ids = (side) => s.st.pcs.filter((p) => p.side === side).map((p) => p.id.slice(1)).sort();
  assert.deepEqual(ids(aColor), ['SH', ...mine].sort());
  assert.deepEqual(ids(aColor === 'w' ? 'b' : 'w'), ['SH', ...F.DEFAULT_LINEUP].sort());
  assert.equal(s.st.ball.h, 'w' + s.st.lu.w[5], "markazdagi o'yinchi to'pni oladi");
  const w = aColor === 'w' ? A : B;
  const sub = (id, inn) => ack(w.socket, 'fc-move', { code, t: 'sub', id, in: inn });
  // Shoh, to'pli dona, maydondagi dona yoki noma'lum zaxira — rad
  assert.equal((await sub('wSH', 'F1')).reason, 'invalid_move');
  assert.equal((await sub(s.st.ball.h, 'F2')).reason, 'invalid_move');
  const field = s.st.pcs.find((p) => p.side === 'w' && p.id !== 'wSH' && p.id !== s.st.ball.h).id;
  const onField = s.st.lu.w.find((k) => 'w' + k !== field);
  assert.equal((await sub(field, onField)).reason, 'invalid_move');
  const benchW = F.bench(s.st, 'w');
  let next = waitState(A.socket, (x) => x.st && x.st.subs.w === 1);
  assert.equal((await sub(field, benchW[0])).ok, true);
  s = await next;
  assert.deepEqual([s.st.turn, s.st.moves, s.st.out.w, s.ev.sub.in.id], ['b', 1, [field.slice(1)], 'w' + benchW[0]]);
  assert.ok(s.st.pcs.some((p) => p.id === 'w' + benchW[0]) && !s.st.pcs.some((p) => p.id === field));
  // Qolgan ikki almashtirish (qora orada yuradi), to'rtinchisi — rad; chiqqan dona qaytmaydi
  const bOther = aColor === 'w' ? B : A;
  const hop = [{ x: 9, y: 0 }, { x: 7, y: 1 }];
  for (let k = 0; k < 3; k++) {
    next = waitState(A.socket, (x) => x.st && x.st.turn === 'w' && x.st.moves === s.st.moves + 1);
    assert.equal((await ack(bOther.socket, 'fc-move', { code, t: 'move', id: 'bO1', x: hop[k % 2].x, y: hop[k % 2].y })).ok, true);
    s = await next;
    const f = s.st.pcs.find((p) => p.side === 'w' && p.id !== 'wSH' && p.id !== s.st.ball.h).id;
    if (k === 2) {
      assert.equal((await sub(f, F.bench(s.st, 'w')[0])).reason, 'invalid_move', "3 tadan ko'p emas");
      assert.equal(F.bench(s.st, 'w').includes(field.slice(1)), false, 'chiqqan dona zaxirada emas');
      break;
    }
    next = waitState(A.socket, (x) => x.st && x.st.subs.w === k + 2);
    assert.equal((await sub(f, F.bench(s.st, 'w')[0])).ok, true);
    s = await next;
  }
  assert.equal(s.st.subs.w, 3);
  await ack(A.socket, 'fc-resign', { code });
  for (const u of [A, B]) u.socket.disconnect();
  await srv2.stop();
});
