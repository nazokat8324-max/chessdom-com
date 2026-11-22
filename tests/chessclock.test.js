// ⏱ Shaxmat soati (chessclock.js) — sof mantiq: boshlash, almashish, qo'shimcha soniya, pauza, vaqt tugashi, format
const test = require('node:test');
const assert = require('node:assert');
const ChessClock = require('../chessclock.js');

test("Shaxmat soati: birinchi bosish raqib soatini boshlaydi, o'z tomonini bosish — almashadi va qo'shimcha soniya qo'shiladi", () => {
  const c = ChessClock.create(3, 2);
  assert.equal(c.left(0, 0), 180000);
  assert.equal(c.press(0, 1000), true, 'yuqori bosdi — pastki (raqib) soati yuradi');
  assert.equal(c.state.running, 1);
  assert.equal(c.state.moves[0], 0, 'boshlash yurish emas, qo\'shimcha soniyasiz');
  assert.equal(c.left(1, 6000), 175000);
  assert.equal(c.press(0, 6000), false, 'raqib tomonini bosish e\'tiborsiz');
  assert.equal(c.press(1, 11000), true);
  assert.equal(c.left(1, 11000), 180000 - 10000 + 2000, '10 s sarfladi, +2 s');
  assert.equal(c.state.moves[1], 1);
  assert.equal(c.state.running, 0);
  assert.equal(c.left(0, 14000), 177000);
});

test("Shaxmat soati: pauza vaqtni to'xtatadi, pauzada bosish ishlamaydi; vaqt tugasa — o'sha tomon yutqazadi, soat to'xtaydi", () => {
  const c = ChessClock.create(1, 0);
  c.press(1, 0); // yuqori (0) soati yuradi
  assert.equal(c.pause(20000), true);
  assert.equal(c.left(0, 90000), 40000, 'pauzada vaqt ketmaydi');
  assert.equal(c.press(0, 90000), false);
  assert.equal(c.resume(100000), true);
  assert.equal(c.check(139000), false);
  assert.equal(c.check(140000), true);
  assert.equal(c.state.flagged, 0);
  assert.equal(c.state.running, null);
  assert.equal(c.left(0, 999999), 0);
  assert.equal(c.press(1, 150000), false, 'vaqt tugagach bosilmaydi');
  // Kechikib bosilsa ham (taymer ulgurmagan) — vaqt tugagan, almashmaydi
  const d = ChessClock.create(1, 5);
  d.press(1, 0);
  assert.equal(d.press(0, 61000), false);
  assert.equal(d.state.flagged, 0);
  d.reset();
  assert.deepEqual([d.state.ms[0], d.state.ms[1], d.state.flagged, d.state.running], [60000, 60000, null, null]);
});

test("Shaxmat soati: vaqt ko'rinishi — soat, daqiqa, 10 soniyadan kam qolganda o'ndan biri; tayyor vaqtlar", () => {
  assert.equal(ChessClock.fmt(300000), '5:00');
  assert.equal(ChessClock.fmt(59001), '1:00');
  assert.equal(ChessClock.fmt(10000), '0:10');
  assert.equal(ChessClock.fmt(9440), '0:09.4');
  assert.equal(ChessClock.fmt(0), '0:00.0');
  assert.equal(ChessClock.fmt(-5), '0:00.0');
  assert.equal(ChessClock.fmt(3909000), '1:05:09');
  assert.ok(ChessClock.PRESETS.length >= 6 && ChessClock.PRESETS.every(([m, i]) => m > 0 && i >= 0));
  const c = ChessClock.create(0.5, 0);
  assert.equal(c.left(1, 0), 30000, '30 soniyalik o\'yin ham bo\'ladi');
});
