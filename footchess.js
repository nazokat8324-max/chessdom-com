// ⚽ Shaxmat-futbol — qoidalar (2026-11-07; foydalanuvchining shaxmat_futbol.html prototipidan aynan ko'chirilgan, AI siz).
// UMD: server (footchess-server.js — har yurish shu yerda tekshiriladi) va brauzer (window.FootChess — sahifa va bir qurilmada o'yin).
// Maydon 11×7 (x 0..10, y 0..6); darvozalar x = -1 (oq himoya qiladi, qora shu yerga uradi) va x = 11 (oq uradi), y 1..5.
// Har jamoada 7 dona; donalar shaxmatdagidek yuradi, faqat bo'sh kataklarga, hech kim yeyilmaydi. 3 gol yoki 100 yurish.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FootChess = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const W = 11, H = 7, GOALS = 3, MAXM = 100;
  // Boshlang'ich joylashuv (oq uchun; qora — x ko'zgu): SH shoh (darvozabon), R1 ruh, F1 fil, FZ farzin, O1/O2 otlar, P3 piyoda
  const KS = { SH: [0, 3], R1: [1, 1], F1: [2, 5], FZ: [2, 3], O1: [3, 1], O2: [3, 5], P3: [4, 3] };
  const KIND = { SH: 'k', R1: 'r', R2: 'r', P1: 'p', P2: 'p', P3: 'p', F1: 'b', F2: 'b', FZ: 'q', O1: 'n', O2: 'n' };
  const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]], DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]], ALL = ORTH.concat(DIAG);
  const LS = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];

  const other = (s) => (s === 'w' ? 'b' : 'w');
  const inB = (x, y) => x >= 0 && x <= 10 && y >= 0 && y <= 6;
  const fwd = (s) => (s === 'w' ? 1 : -1);
  const at = (st, x, y) => st.pcs.find((p) => p.x === x && p.y === y);
  const byId = (st, id) => st.pcs.find((p) => p.id === id);
  // Darvoza katagi: x = 11 — oq gol uradi ('w'), x = -1 — qora ('b')
  const goalAt = (x, y) => ((y >= 1 && y <= 5) ? (x === 11 ? 'w' : x === -1 ? 'b' : null) : null);

  function formation(kick, score, moves) {
    const pcs = [];
    for (const s of ['w', 'b']) for (const k in KS) { const [x, y] = KS[k]; pcs.push({ id: s + k, side: s, kind: KIND[k], x: s === 'w' ? x : 10 - x, y }); }
    const h = pcs.find((p) => p.id === kick + 'P3');
    return { pcs, ball: { h: h.id, x: h.x, y: h.y }, turn: kick, score: score || { w: 0, b: 0 }, moves: moves || 0 };
  }
  function clone(st) { return { pcs: st.pcs.map((p) => ({ ...p })), ball: { ...st.ball }, turn: st.turn, score: { ...st.score }, moves: st.moves, lock: st.lock }; }

  // Yurishlar: sirpanuvchi donalar bo'sh to'p katagida to'xtaydi (undan o'tib ketmaydi); piyoda oldinga yoki qiya oldinga 1 katak
  function moves(st, p) {
    const out = []; const loose = st.ball.h === null;
    const can = (x, y) => inB(x, y) && !at(st, x, y);
    const add = (x, y) => out.push({ t: 'move', id: p.id, x, y });
    const dirs = p.kind === 'r' ? ORTH : p.kind === 'b' ? DIAG : p.kind === 'q' ? ALL : null;
    if (dirs) {
      for (const [dx, dy] of dirs) { let x = p.x + dx, y = p.y + dy; while (can(x, y)) { add(x, y); if (loose && st.ball.x === x && st.ball.y === y) break; x += dx; y += dy; } }
    } else if (p.kind === 'n') { for (const [dx, dy] of LS) if (can(p.x + dx, p.y + dy)) add(p.x + dx, p.y + dy); }
    else if (p.kind === 'k') { for (const [dx, dy] of ALL) if (can(p.x + dx, p.y + dy)) add(p.x + dx, p.y + dy); }
    else { const f = fwd(p.side); for (const dy of [0, -1, 1]) if (can(p.x + f, p.y + dy)) add(p.x + f, p.y + dy); }
    return out;
  }
  // Zarba/pas: to'p o'z donalari ustidan o'tadi (har biri — pas nishoni), birinchi raqib donasi ushlab qoladi; maydondan chiqsa — faqat darvoza katagida gol
  function kicks(st, p) {
    const out = [];
    const add = (x, y, o) => out.push(Object.assign({ t: 'kick', id: p.id, x, y }, o || {}));
    const ray = (dx, dy, max) => {
      let x = p.x, y = p.y;
      for (let i = 0; i < max; i++) {
        x += dx; y += dy;
        if (!inB(x, y)) { const g = goalAt(x, y); if (g) add(x, y, { goal: g }); return; }
        const q = at(st, x, y);
        if (q) { add(x, y, { to: q.id }); if (q.side !== p.side) return; continue; }
        add(x, y);
      }
    };
    const k = p.kind;
    if (k === 'r') ORTH.forEach((d) => ray(d[0], d[1], 20));
    else if (k === 'b') DIAG.forEach((d) => ray(d[0], d[1], 20));
    else if (k === 'q') ALL.forEach((d) => ray(d[0], d[1], 20));
    else if (k === 'k') ALL.forEach((d) => ray(d[0], d[1], 2));
    else if (k === 'p') { const f = fwd(p.side); ray(f, 0, 3); ray(f, 1, 2); ray(f, -1, 2); }
    else {
      for (const [dx, dy] of LS) {
        const x = p.x + dx, y = p.y + dy;
        if (!inB(x, y)) { const g = goalAt(x, y); if (g) add(x, y, { goal: g }); continue; }
        const q = at(st, x, y); add(x, y, q ? { to: q.id } : null);
      }
    }
    return out;
  }
  // Shaxmatdagi "ura olish" (yo'l to'sig'i bilan; piyoda — qiya oldinga)
  function attacks(st, p, tx, ty) {
    const k = p.kind, dx = tx - p.x, dy = ty - p.y, ax = Math.abs(dx), ay = Math.abs(dy);
    if (k === 'n') return (ax === 1 && ay === 2) || (ax === 2 && ay === 1);
    if (k === 'k') return ax <= 1 && ay <= 1 && ax + ay > 0;
    if (k === 'p') return dx === fwd(p.side) && ay === 1;
    const orth = (dx === 0) !== (dy === 0), diag = ax === ay && ax > 0;
    if (k === 'r' && !orth) return false; if (k === 'b' && !diag) return false; if (k === 'q' && !orth && !diag) return false;
    const sx = Math.sign(dx), sy = Math.sign(dy);
    for (let i = 1; i < Math.max(ax, ay); i++) if (at(st, p.x + sx * i, p.y + sy * i)) return false;
    return true;
  }
  // To'pni tortib olish; to'pni yo'qotgan dona keyingi navbatda darhol qaytarib ololmaydi (lock)
  function tackle(st, p) {
    if (st.lock && st.lock.id === p.id && st.lock.m === st.moves) return null;
    const h = st.ball.h && byId(st, st.ball.h);
    if (h && h.side !== p.side && attacks(st, p, h.x, h.y)) return { t: 'tackle', id: p.id, x: h.x, y: h.y, from: h.id };
    return null;
  }
  function actions(st, side) {
    const out = [];
    for (const p of st.pcs) if (p.side === side) { out.push(...moves(st, p)); if (st.ball.h === p.id) out.push(...kicks(st, p)); const t = tackle(st, p); if (t) out.push(t); }
    return out;
  }

  function apply(st0, a) {
    const st = clone(st0); const p = byId(st, a.id); const ev = { a, p: { ...p } };
    if (a.t === 'move') {
      p.x = a.x; p.y = a.y;
      if (st.ball.h === p.id) { st.ball.x = p.x; st.ball.y = p.y; }
      else if (st.ball.h === null && st.ball.x === p.x && st.ball.y === p.y) { st.ball.h = p.id; ev.pick = true; }
      if (p.kind === 'p' && ((p.side === 'w' && p.x === 10) || (p.side === 'b' && p.x === 0))) { p.kind = 'q'; ev.promo = true; }
    } else if (a.t === 'kick') {
      if (a.goal) { st.score[a.goal]++; ev.goal = a.goal; ev.own = a.goal !== p.side; st.ball = { h: null, x: a.x, y: a.y }; }
      else if (a.to) { st.ball = { h: a.to, x: a.x, y: a.y }; const q = byId(st, a.to); ev.recv = { ...q }; ev.intercept = q.side !== p.side; }
      else st.ball = { h: null, x: a.x, y: a.y };
    } else { st.ball = { h: p.id, x: p.x, y: p.y }; ev.tackle = true; ev.from = { ...byId(st, a.from) }; }
    st.turn = other(st.turn); st.moves++; st.lock = ev.tackle ? { id: a.from, m: st.moves } : null;
    return { st, ev };
  }

  // Mijoz yuborgan harakatni (faqat t, id, x, y) shu holatdagi qonuniy harakatlardan topish — goal/to/from server o'zi hisoblaydi
  function findAction(st, a) {
    if (!a || typeof a !== 'object') return null;
    const t = String(a.t || ''), id = String(a.id || ''), x = a.x, y = a.y;
    if (!['move', 'kick', 'tackle'].includes(t) || !Number.isInteger(x) || !Number.isInteger(y)) return null;
    return actions(st, st.turn).find((c) => c.t === t && c.id === id && c.x === x && c.y === y) || null;
  }

  // Bitta to'liq qadam (prototipdagi doAction kabi): harakat → gol bo'lsa 3 tagacha yangi markaz (to'pni o'tkazib yuborgan jamoa boshlaydi),
  // aks holda 100 yurish chegarasi. a = null — navbatni o'tkazish (harakat yo'q yoki vaqt tugadi; yurish sanalmaydi).
  function step(st, a) {
    if (!a) { const s = clone(st); s.turn = other(s.turn); s.lock = null; return { st: s, ev: { pass: true }, over: false }; }
    const r = apply(st, a);
    if (r.ev.goal) {
      const sc = r.ev.goal;
      if (r.st.score[sc] >= GOALS) return { st: r.st, ev: r.ev, over: true, winner: winnerOf(r.st) };
      return { st: formation(other(sc), r.st.score, r.st.moves), ev: r.ev, over: false, kickoff: other(sc) };
    }
    if (r.st.moves >= MAXM) return { st: r.st, ev: r.ev, over: true, winner: winnerOf(r.st) };
    return { st: r.st, ev: r.ev, over: false };
  }
  const winnerOf = (st) => (st.score.w > st.score.b ? 'w' : st.score.b > st.score.w ? 'b' : null);

  return { W, H, GOALS, MAXM, KS, KIND, other, inB, goalAt, at, byId, formation, clone, moves, kicks, attacks, tackle, actions, apply, findAction, step, winnerOf };
});
