// 🍂 To'rt fasl (seasons.js) — fasl Toshkent vaqti bo'yicha aniqlanadi
const test = require('node:test');
const assert = require('node:assert');
const Seasons = require('../seasons.js');

test("Fasllar: oylar bo'yicha (qish 12–2, bahor 3–5, yoz 6–8, kuz 9–11), Toshkent vaqtida", () => {
  const at = (iso) => Seasons.seasonOf(new Date(iso));
  assert.equal(at('2026-12-01T00:00:00+05:00'), 'winter');
  assert.equal(at('2027-01-15T12:00:00+05:00'), 'winter');
  assert.equal(at('2027-02-28T23:59:00+05:00'), 'winter');
  assert.equal(at('2027-03-01T00:00:00+05:00'), 'spring');
  assert.equal(at('2027-05-31T12:00:00+05:00'), 'spring');
  assert.equal(at('2027-06-01T00:00:00+05:00'), 'summer');
  assert.equal(at('2027-08-31T12:00:00+05:00'), 'summer');
  assert.equal(at('2027-09-01T00:00:00+05:00'), 'autumn');
  assert.equal(at('2026-11-30T23:59:00+05:00'), 'autumn');
  // UTC da hali 30-noyabr, Toshkentda esa 1-dekabr — qish
  assert.equal(at('2026-11-30T19:30:00Z'), 'winter');
  assert.deepEqual(Seasons.SEASONS, ['winter', 'spring', 'summer', 'autumn']);
});
