// 📖 O'yin hikoyasi: tahlildan (baholar, xatolar) hikoya bosqichlari — sarlavha, ochilish, hal qiluvchi xato, yakun, aniqlik
const test = require('node:test');
const assert = require('node:assert/strict');
const { Chess } = require('chess.js');
const { build, toText } = require('../gamestory');

// tx o'rniga: o'zbekcha matn + {{o'zgaruvchilar}}
const t = (k, f, v) => String(f).replace(/\{\{(\w+)\}\}/g, (m, x) => (v && v[x] !== undefined ? v[x] : m));
const play = (sans) => { const c = new Chess(); return sans.map((s) => c.move(s)); };
const ev = (cp) => ({ cp, mate: null });

test("Qo'pol xato va mat: sarlavha, ochilish, hal qiluvchi lahza, eng yaxshi yurish, yakun, aniqlik", () => {
  const moves = play(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']);
  const analysis = {
    evals: [ev(20), ev(30), ev(25), ev(40), ev(35), ev(60), { cp: 10000, mate: null, terminal: true }, { cp: 10000, mate: null, terminal: true }],
    moves: moves.map((m, i) => ({ san: m.san, color: m.color, cls: i === 5 ? 'blunder' : null, loss: i === 5 ? 48 : 1, bestSan: i === 5 ? 'g6' : null })),
    accuracy: { w: 96, b: 41 }
  };
  const s = build({ moves, analysis, white: 'Ali', black: 'Vali', result: '1-0', reason: 'checkmate', opening: { eco: 'C20', name: 'Italyan' } }, t);
  assert.equal(s.title, 'Ali raqibiga imkon bermadi');
  assert.match(s.chapters[0].text, /Ali \(oq\) va Vali \(qora\) «Italyan»/);
  const err = s.chapters.find((c) => c.icon === '💥');
  assert.equal(err.ply, 6);
  assert.match(err.text, /3\.\.\. Nf6 — Valining qo'pol xatosi/);
  assert.match(err.text, /Yaxshiroq edi: g6/);
  assert.match(err.text, /Ustunlik oq tomonga o'tdi/);
  assert.match(err.text, /hal qiluvchi lahzasi/);
  const end = s.chapters.find((c) => c.icon === '🏁');
  assert.equal(end.text, '4. Qxf7# — Ali mat qildi!');
  assert.equal(s.chapters[s.chapters.length - 1].text, 'Aniqlik: Ali — 96%, Vali — 41%.');
  // Tartib: ply bo'yicha, aniqlik oxirida
  const plies = s.chapters.filter((c) => c.ply !== null).map((c) => c.ply);
  assert.deepEqual(plies, [...plies].sort((a, b) => a - b));
  assert.match(toText(s), /^📖 Ali raqibiga imkon bermadi\n\n♟|^📖 Ali raqibiga imkon bermadi\n\n📖/);
});

test("Ortdan qaytish, farzinlar almashuvi, toza o'yin va durrang", () => {
  // Qora deyarli yutqazgan (oq 90%), keyin oq qo'pol xato qiladi va qora yutadi
  const moves = play(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5', 'Qg5', 'Nxf7', 'Qxg2']);
  const evals = [20, 30, 400, 400, 900, 900, 900, 900, 900, -900, -900].map(ev);
  const analysis = { evals, moves: moves.map((m, i) => ({ san: m.san, color: m.color, cls: i === 8 ? 'blunder' : null, loss: i === 8 ? 70 : 0, bestSan: null })), accuracy: { w: 50, b: 70 } };
  const s = build({ moves, analysis, white: 'Ali', black: 'Vali', result: '0-1', reason: 'resign' }, t);
  assert.equal(s.title, "Vali mag'lubiyat yoqasidan qaytib, g'alaba qozondi!");
  assert.match(s.chapters[0].text, /o'yinni boshlashdi/, 'debyut nomi yo\'q');
  assert.ok(s.chapters.some((c) => c.icon === '🏳️' && /Ali taslim bo'ldi — Vali g'alaba qozondi/.test(c.text)));

  const quiet = play(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5']);
  const q = build({
    moves: quiet, white: 'A', black: 'B', result: '1/2-1/2', reason: 'agreement',
    analysis: { evals: Array(quiet.length + 1).fill(ev(15)), moves: quiet.map((m) => ({ san: m.san, color: m.color, cls: null, loss: 0 })), accuracy: { w: 99, b: 98 } }
  }, t);
  assert.equal(q.title, 'Teng kurash — 6 yurishda durrang');
  assert.ok(q.chapters.some((c) => c.icon === '✨'), 'toza o\'yin');
  assert.ok(q.chapters.some((c) => c.text === "O'yin durrang bilan yakunlandi (kelishuv)."));
});

test('Farzinlar almashuvi va aylanish aniqlanadi', () => {
  const moves = [
    { san: 'Qxd8+', color: 'w', captured: 'q' }, { san: 'Kxd8', color: 'b', captured: 'q' },
    { san: 'e8=Q', color: 'w', promotion: 'q' }
  ];
  const s = build({ moves, white: 'A', black: 'B', result: '*', analysis: { evals: [ev(0), ev(0), ev(0), ev(0)], moves: moves.map((m) => ({ ...m, cls: null, loss: 0 })), accuracy: { w: 90, b: 90 } } }, t);
  assert.ok(s.chapters.some((c) => c.icon === '🔁' && c.ply === 1));
  assert.ok(s.chapters.some((c) => c.icon === '👑' && /2\. e8=Q/.test(c.text)));
});
