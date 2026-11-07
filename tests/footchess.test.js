// ⚽ Shaxmat-futbol qoidalari (footchess.js): har bir dona yurishi, zarba, pas, ushlab qolish, tortib olish va qulf, gol, o'z darvozasiga gol,
// piyodaning farzinga aylanishi, goldan keyingi markaz, 3 gol / 100 yurish, mijoz yuborgan harakatni tekshirish
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../footchess');

// Qo'lda holat: pcs — [id, side, kind, x, y], ball — {h} yoki {x, y}
function S(pcs, ball, turn = 'w', extra = {}) {
  const list = pcs.map(([id, side, kind, x, y]) => ({ id, side, kind, x, y }));
  const h = ball.h ? list.find((p) => p.id === ball.h) : null;
  return { pcs: list, ball: h ? { h: h.id, x: h.x, y: h.y } : { h: null, x: ball.x, y: ball.y }, turn, score: { w: 0, b: 0 }, moves: 0, ...extra };
}
const sq = (list) => list.map((a) => a.x + ',' + a.y).sort();
const movesOf = (st, id) => sq(F.moves(st, F.byId(st, id)));
const kicksOf = (st, id) => F.kicks(st, F.byId(st, id));

test("Boshlang'ich joylashuv: 7 tadan dona, ko'zgu, to'p boshlovchi jamoa piyodasida", () => {
  const st = F.formation('w');
  assert.equal(st.pcs.length, 14);
  for (const s of ['w', 'b']) assert.deepEqual(st.pcs.filter((p) => p.side === s).map((p) => p.kind).sort(), ['b', 'k', 'n', 'n', 'p', 'q', 'r']);
  assert.deepEqual([F.byId(st, 'wSH').x, F.byId(st, 'wSH').y, F.byId(st, 'bSH').x], [0, 3, 10]);
  assert.deepEqual(st.ball, { h: 'wP3', x: 4, y: 3 });
  assert.equal(st.turn, 'w');
  assert.equal(F.formation('b').ball.h, 'bP3');
});

test('Yurishlar: ruh, fil, farzin, ot, shoh, piyoda — faqat bo\'sh kataklarga, hech kim yeyilmaydi', () => {
  // Ruh d4 (3,3): yo'lida o'z donasi (5,3) va raqib (3,5) — ularning katagiga ham, ortiga ham yurmaydi
  let st = S([['wR', 'w', 'r', 3, 3], ['wX', 'w', 'n', 5, 3], ['bX', 'b', 'n', 3, 5]], { x: 9, y: 0 });
  assert.deepEqual(movesOf(st, 'wR'), sq([[4, 3], [2, 3], [1, 3], [0, 3], [3, 4], [3, 2], [3, 1], [3, 0]].map(([x, y]) => ({ x, y }))));
  // Fil — faqat diagonal
  st = S([['wB', 'w', 'b', 1, 1]], { x: 9, y: 0 });
  assert.deepEqual(movesOf(st, 'wB'), sq([[0, 0], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [0, 2], [2, 0]].map(([x, y]) => ({ x, y }))));
  // Farzin — ruh + fil
  st = S([['wQ', 'w', 'q', 0, 0]], { x: 9, y: 3 });
  assert.equal(F.moves(st, F.byId(st, 'wQ')).length, 10 + 6 + 6);
  // Ot — «L», donalar ustidan sakraydi, band katakka emas
  st = S([['wN', 'w', 'n', 5, 3], ['wA', 'w', 'p', 5, 4], ['bA', 'b', 'p', 7, 4]], { x: 0, y: 0 });
  assert.deepEqual(movesOf(st, 'wN'), sq([[6, 5], [4, 5], [3, 4], [7, 2], [6, 1], [4, 1], [3, 2]].map(([x, y]) => ({ x, y }))));
  // Shoh — 1 katak har tomonga
  st = S([['wK', 'w', 'k', 0, 0]], { x: 9, y: 3 });
  assert.deepEqual(movesOf(st, 'wK'), ['0,1', '1,0', '1,1']);
  // Piyoda: oldinga yoki qiya oldinga 1 katak (oqniki +x, qoraniki −x), band katakka emas; orqaga yo'q
  st = S([['wP', 'w', 'p', 4, 3], ['bP', 'b', 'p', 6, 3], ['xX', 'b', 'n', 5, 2]], { x: 0, y: 0 });
  assert.deepEqual(movesOf(st, 'wP'), ['5,3', '5,4']);
  assert.deepEqual(movesOf(st, 'bP'), ['5,3', '5,4']);
});

test("Sirpanuvchi dona bo'sh to'p katagida to'xtaydi, to'pga chiqsa uni oladi", () => {
  const st = S([['wR', 'w', 'r', 0, 3]], { x: 4, y: 3 });
  const right = F.moves(st, F.byId(st, 'wR')).filter((a) => a.y === 3).map((a) => a.x);
  assert.deepEqual(right, [1, 2, 3, 4], "to'p katagidan o'tib ketmaydi");
  const r = F.apply(st, { t: 'move', id: 'wR', x: 4, y: 3 });
  assert.equal(r.ev.pick, true);
  assert.deepEqual(r.st.ball, { h: 'wR', x: 4, y: 3 });
  // To'pli dona yursa — to'p u bilan
  const r2 = F.apply(r.st, { t: 'move', id: 'wR', x: 4, y: 6 });
  assert.deepEqual([r2.st.ball.h, r2.st.ball.x, r2.st.ball.y], ['wR', 4, 6]);
});

test("Zarba: ruh — to'g'ri, fil — diagonal, farzin — ikkalasi, istalgan masofaga; ot — «L»; piyoda — oldinga 3 / qiya 2; shoh — 2", () => {
  const dirsOf = (list, ox, oy) => [...new Set(list.map((a) => Math.sign(a.x - ox) + ':' + Math.sign(a.y - oy)))].sort();
  let st = S([['wR', 'w', 'r', 5, 3]], { h: 'wR' });
  let k = kicksOf(st, 'wR');
  assert.deepEqual(dirsOf(k, 5, 3), ['-1:0', '0:-1', '0:1', '1:0']);
  assert.ok(k.some((a) => a.x === 10 && a.y === 3) && k.some((a) => a.goal === 'w' && a.x === 11), "maydon oxirigacha va darvozagacha");
  st = S([['wB', 'w', 'b', 5, 3]], { h: 'wB' });
  assert.deepEqual(dirsOf(kicksOf(st, 'wB'), 5, 3), ['-1:-1', '-1:1', '1:-1', '1:1']);
  st = S([['wQ', 'w', 'q', 5, 3]], { h: 'wQ' });
  assert.equal(dirsOf(kicksOf(st, 'wQ'), 5, 3).length, 8);
  // Ot: 8 ta «L» katagi, yo'ldagi donalar ustidan oshib
  st = S([['wN', 'w', 'n', 5, 3], ['bA', 'b', 'p', 5, 4], ['bB', 'b', 'p', 6, 3]], { h: 'wN' });
  assert.deepEqual(sq(kicksOf(st, 'wN')), sq([[6, 5], [7, 4], [4, 5], [3, 4], [6, 1], [7, 2], [4, 1], [3, 2]].map(([x, y]) => ({ x, y }))));
  // Piyoda (oq): oldinga 3 gacha, qiya oldinga 2 gacha
  st = S([['wP', 'w', 'p', 2, 3]], { h: 'wP' });
  assert.deepEqual(sq(kicksOf(st, 'wP')), sq([[3, 3], [4, 3], [5, 3], [3, 4], [4, 5], [3, 2], [4, 1]].map(([x, y]) => ({ x, y }))));
  // Piyoda (qora) — teskari tomonga
  st = S([['bP', 'b', 'p', 8, 3]], { h: 'bP' }, 'b');
  assert.ok(kicksOf(st, 'bP').every((a) => a.x < 8));
  // Shoh: har tomonga 2 gacha
  st = S([['wK', 'w', 'k', 5, 3]], { h: 'wK' });
  assert.equal(kicksOf(st, 'wK').length, 16);
  // To'psiz donaga zarba yo'q
  st = S([['wK', 'w', 'k', 5, 3], ['wR', 'w', 'r', 0, 0]], { h: 'wK' });
  assert.ok(!F.actions(st, 'w').some((a) => a.t === 'kick' && a.id === 'wR'));
});

test("Pas va ushlab qolish: to'p o'z donalari ustidan o'tadi (har biri — pas), birinchi raqib donasi ushlab qoladi", () => {
  const st = S([['wR', 'w', 'r', 1, 3], ['wA', 'w', 'n', 3, 3], ['bA', 'b', 'n', 6, 3], ['wB', 'w', 'n', 8, 3]], { h: 'wR' });
  const right = kicksOf(st, 'wR').filter((a) => a.y === 3 && a.x > 1);
  assert.deepEqual(right.map((a) => [a.x, a.to || null]), [[2, null], [3, 'wA'], [4, null], [5, null], [6, 'bA']], "raqibdan keyin to'xtaydi");
  const pass = F.apply(st, right.find((a) => a.to === 'wA'));
  assert.deepEqual([pass.st.ball.h, pass.ev.intercept], ['wA', false]);
  const cut = F.apply(st, right.find((a) => a.to === 'bA'));
  assert.deepEqual([cut.st.ball.h, cut.ev.intercept], ['bA', true]);
  const loose = F.apply(st, right.find((a) => a.x === 5));
  assert.deepEqual(loose.st.ball, { h: null, x: 5, y: 3 });
});

test("Gol: faqat darvoza kataklarida (2–6-qatorlar), maydon chetidan tashqari — zarba yo'q; o'z darvozasiga gol raqibga yoziladi", () => {
  // y = 0 qatorda chetga zarba — darvoza emas
  let st = S([['wR', 'w', 'r', 8, 0]], { h: 'wR' });
  assert.ok(!kicksOf(st, 'wR').some((a) => a.x > 10));
  st = S([['wR', 'w', 'r', 8, 1]], { h: 'wR' });
  const g = kicksOf(st, 'wR').find((a) => a.x === 11);
  assert.deepEqual([g.goal, g.y], ['w', 1]);
  const r = F.apply(st, g);
  assert.deepEqual([r.ev.goal, r.ev.own, r.st.score.w], ['w', false, 1]);
  // Qora o'z darvozasiga (x = 11) — oqqa gol
  st = S([['bR', 'b', 'r', 8, 3]], { h: 'bR' }, 'b');
  const own = F.apply(st, kicksOf(st, 'bR').find((a) => a.x === 11));
  assert.deepEqual([own.ev.goal, own.ev.own, own.st.score.w, own.st.score.b], ['w', true, 1, 0]);
  // Oq x = -1 tomonga — qoraga gol
  st = S([['wR', 'w', 'r', 2, 4]], { h: 'wR' });
  assert.equal(kicksOf(st, 'wR').find((a) => a.x === -1).goal, 'b');
});

test("To'pni tortib olish: shaxmatdagi «ura olish» bilan (yo'l to'sig'i hisobga olinadi), donalar joyida qoladi; qulf — darhol qaytarib bo'lmaydi", () => {
  // Qora ruh oq to'pli ot ustiga to'g'ri chiziqda — tortib oladi
  let st = S([['wN', 'w', 'n', 5, 3], ['bR', 'b', 'r', 5, 0]], { h: 'wN' }, 'b');
  let t = F.tackle(st, F.byId(st, 'bR'));
  assert.deepEqual([t.t, t.x, t.y, t.from], ['tackle', 5, 3, 'wN']);
  // Yo'lda dona bo'lsa — yo'q
  const blocked = S([['wN', 'w', 'n', 5, 3], ['bR', 'b', 'r', 5, 0], ['wX', 'w', 'p', 5, 1]], { h: 'wN' }, 'b');
  assert.equal(F.tackle(blocked, F.byId(blocked, 'bR')), null);
  // Piyoda — faqat qiya oldinga (qoraniki −x)
  const pawn = S([['wN', 'w', 'n', 4, 2], ['bP', 'b', 'p', 5, 3]], { h: 'wN' }, 'b');
  assert.ok(F.tackle(pawn, F.byId(pawn, 'bP')));
  const pawnFront = S([['wN', 'w', 'n', 4, 3], ['bP', 'b', 'p', 5, 3]], { h: 'wN' }, 'b');
  assert.equal(F.tackle(pawnFront, F.byId(pawnFront, 'bP')), null, "to'g'ri oldinga ura olmaydi");
  // Bajarish: to'p tortib olganda, donalar joyida
  const r = F.apply(st, t);
  assert.deepEqual([r.st.ball.h, F.byId(r.st, 'wN').x, F.byId(r.st, 'bR').y, r.ev.tackle], ['bR', 5, 0, true]);
  // Qulf: to'pni yo'qotgan ot keyingi navbatda qaytarib ololmaydi (ot ruhga hujum qila oladigan joyda)
  st = S([['wN', 'w', 'n', 4, 2], ['bR', 'b', 'r', 5, 0]], { h: 'wN' }, 'b');
  t = F.tackle(st, F.byId(st, 'bR'));
  assert.equal(t, null, "ruh otga to'g'ri chiziqda emas");
  const st2 = S([['wN', 'w', 'n', 4, 1], ['bR', 'b', 'r', 4, 3], ['wQ', 'w', 'q', 4, 6]], { h: 'wN' }, 'b');
  const r2 = F.apply(st2, F.tackle(st2, F.byId(st2, 'bR')));
  assert.deepEqual(r2.st.lock, { id: 'wN', m: 1 });
  // Ot ruhni «L» bo'yicha ura olmaydi, farzin esa ura oladi — qulf faqat to'pni yo'qotgan donaga
  const st3 = S([['wN', 'w', 'n', 3, 1], ['bQ', 'b', 'q', 3, 3], ['wB', 'w', 'b', 5, 5]], { h: 'wN' }, 'b');
  const r3 = F.apply(st3, F.tackle(st3, F.byId(st3, 'bQ')));
  assert.equal(F.tackle(r3.st, F.byId(r3.st, 'wB')).from, 'bQ', "boshqa dona qaytarib ola oladi");
  const st4 = S([['wQ', 'w', 'q', 3, 0], ['bR', 'b', 'r', 3, 3]], { h: 'wQ' }, 'b');
  const r4 = F.apply(st4, F.tackle(st4, F.byId(st4, 'bR')));
  assert.equal(F.tackle(r4.st, F.byId(r4.st, 'wQ')), null, "to'pni yo'qotgan farzin darhol qaytara olmaydi");
  // Bir navbat o'tgach — qulf ochiladi
  const later = F.apply(F.apply(r4.st, { t: 'move', id: 'wQ', x: 2, y: 0 }).st, { t: 'move', id: 'bR', x: 2, y: 3 }).st;
  later.turn = 'w';
  const back = F.apply(later, { t: 'move', id: 'wQ', x: 2, y: 1 }).st;
  assert.equal(back.lock, null);
});

test("Piyoda oxirgi qatorga yetsa farzinga aylanadi (oq — x 10, qora — x 0)", () => {
  let st = S([['wP', 'w', 'p', 9, 3]], { x: 0, y: 0 });
  let r = F.apply(st, { t: 'move', id: 'wP', x: 10, y: 4 });
  assert.deepEqual([F.byId(r.st, 'wP').kind, r.ev.promo], ['q', true]);
  st = S([['bP', 'b', 'p', 1, 3]], { x: 9, y: 0 }, 'b');
  r = F.apply(st, { t: 'move', id: 'bP', x: 0, y: 3 });
  assert.equal(F.byId(r.st, 'bP').kind, 'q');
  st = S([['wP', 'w', 'p', 8, 3]], { x: 0, y: 0 });
  assert.equal(F.byId(F.apply(st, { t: 'move', id: 'wP', x: 9, y: 3 }).st, 'wP').kind, 'p');
});

test("Qadam: goldan keyin to'pni o'tkazib yuborgan jamoa markazdan boshlaydi, hisob va yurishlar saqlanadi; 3 gol — o'yin tugaydi", () => {
  let st = S([['wR', 'w', 'r', 8, 3], ['bK', 'b', 'k', 10, 0]], { h: 'wR' }, 'w', { score: { w: 1, b: 2 }, moves: 40 });
  let r = F.step(st, F.findAction(st, { t: 'kick', id: 'wR', x: 11, y: 3 }));
  assert.deepEqual([r.over, r.kickoff, r.st.turn, r.st.ball.h, r.st.score.w, r.st.score.b, r.st.moves, r.st.pcs.length], [false, 'b', 'b', 'bP3', 2, 2, 41, 14]);
  st = S([['wR', 'w', 'r', 8, 3]], { h: 'wR' }, 'w', { score: { w: 2, b: 0 } });
  r = F.step(st, F.findAction(st, { t: 'kick', id: 'wR', x: 11, y: 3 }));
  assert.deepEqual([r.over, r.winner, r.st.score.w], [true, 'w', 3]);
});

test("Qadam: 100-yurishda o'yin tugaydi (teng — durrang); harakat yo'q — navbat o'tadi, yurish sanalmaydi", () => {
  let st = S([['wK', 'w', 'k', 0, 3], ['bK', 'b', 'k', 10, 3]], { x: 5, y: 3 }, 'w', { moves: 99 });
  let r = F.step(st, F.findAction(st, { t: 'move', id: 'wK', x: 1, y: 3 }));
  assert.deepEqual([r.over, r.winner, r.st.moves], [true, null, 100]);
  st.score = { w: 1, b: 0 };
  assert.equal(F.step(st, F.findAction(st, { t: 'move', id: 'wK', x: 1, y: 3 })).winner, 'w');
  const p = F.step(S([['wK', 'w', 'k', 0, 3]], { x: 5, y: 3 }, 'w', { moves: 7 }), null);
  assert.deepEqual([p.st.turn, p.st.moves, p.ev.pass], ['b', 7, true]);
});

test("Mijoz harakati: faqat t/id/x/y qabul qilinadi; boshqa jamoa donasi, noqonuniy katak, soxta gol — rad", () => {
  const st = F.formation('w');
  assert.equal(F.findAction(st, { t: 'move', id: 'bSH', x: 9, y: 3 }), null, 'navbat oqda');
  assert.equal(F.findAction(st, { t: 'kick', id: 'wP3', x: 11, y: 3 }), null, "piyoda darvozagacha yeta olmaydi");
  assert.equal(F.findAction(st, { t: 'move', id: 'wSH', x: 5, y: 5 }), null);
  for (const bad of [null, 'x', 5, [], { t: 'move' }, { t: 'fly', id: 'wSH', x: 1, y: 3 }, { t: 'move', id: 'wSH', x: '1', y: 3.5 }]) assert.equal(F.findAction(st, bad), null);
  const ok = F.findAction(st, { t: 'kick', id: 'wP3', x: 6, y: 3, goal: 'w', to: 'wSH' });
  assert.deepEqual([ok.x, ok.goal, ok.to], [6, undefined, 'bP3'], "goal/to mijozdan olinmaydi — server o'zi hisoblaydi");
});
