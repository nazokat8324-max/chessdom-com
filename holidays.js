// 🌸 Mavsumiy bayramlar (UMD: server require, brauzerda window.Holidays). Bayram kunlarida (Toshkent vaqti) bayram vazifasi —
// NEED ta o'yin o'ynasa nishon (holiday_badges), taxta "Mavzuga mos" bo'lsa bayram ranglarida (html[data-holiday]).
// Hayitlar oy taqvimi bo'yicha — sanalar yillar bo'yicha qo'lda (taxminiy, rasmiy e'londan keyin to'g'rilash mumkin).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Holidays = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const TZ = 5 * 3600000; // Toshkent UTC+5
  const DAY = 864e5;
  const NEED = 3;
  const LANGS = ['uz', 'en', 'ru', 'es', 'de', 'fr'];
  // start(yil) → [oy, kun] (bayram shu yil nomi bilan), days — necha kun
  const HOLIDAYS = [
    { key: 'newyear', icon: '🎆', days: 3, start: (y) => [12, 31, y - 1],
      names: ['Yangi yil', 'New Year', 'Новый год', 'Año Nuevo', 'Neujahr', 'Nouvel An'] },
    { key: 'ramazon', icon: '🌙', days: 3, start: (y) => ({ 2026: [3, 20], 2027: [3, 10], 2028: [2, 27], 2029: [2, 14], 2030: [2, 4] })[y] || null,
      names: ['Ramazon hayiti', 'Eid al-Fitr', 'Ураза-байрам', 'Eid al-Fitr', 'Zuckerfest', 'Aïd el-Fitr'] },
    { key: 'navruz', icon: '🌷', days: 4, start: () => [3, 20],
      names: ["Navro'z", 'Navruz', 'Навруз', 'Nowruz', 'Nouruz', 'Norouz'] },
    { key: 'qurbon', icon: '🕌', days: 3, start: (y) => ({ 2026: [5, 27], 2027: [5, 17], 2028: [5, 5], 2029: [4, 24], 2030: [4, 13] })[y] || null,
      names: ['Qurbon hayiti', 'Eid al-Adha', 'Курбан-байрам', 'Eid al-Adha', 'Opferfest', 'Aïd el-Kébir'] },
    { key: 'chessday', icon: '♟', days: 2, start: () => [7, 20],
      names: ['Xalqaro shaxmat kuni', 'International Chess Day', 'Международный день шахмат', 'Día Internacional del Ajedrez', 'Internationaler Schachtag', 'Journée internationale des échecs'] },
    { key: 'independence', icon: '🎉', days: 3, start: () => [8, 31],
      names: ['Mustaqillik kuni', 'Independence Day', 'День независимости', 'Día de la Independencia', 'Unabhängigkeitstag', "Fête de l'indépendance"] }
  ];

  // Bayram oynasi (UTC ms): Toshkent kunining 00:00 dan days kun
  function windowOf(h, year) {
    const s = h.start(year);
    if (!s) return null;
    const start = Date.UTC(s[2] || year, s[0] - 1, s[1]) - TZ;
    return { key: h.key, icon: h.icon, year, start, end: start + h.days * DAY, need: NEED };
  }
  function occurrences(now) {
    const y = new Date(now + TZ).getUTCFullYear();
    const out = [];
    for (const year of [y, y + 1]) for (const h of HOLIDAYS) { const w = windowOf(h, year); if (w) out.push(w); }
    return out.sort((a, b) => a.start - b.start);
  }
  // Hozir davom etayotgan bayramlar (bir vaqtda bir nechta bo'lishi mumkin — masalan 2026 da Ramazon hayiti va Navro'z)
  function active(now, force) {
    const t = now == null ? Date.now() : now;
    if (force) {
      const h = HOLIDAYS.find((x) => x.key === force);
      if (h) return [{ key: h.key, icon: h.icon, year: new Date(t + TZ).getUTCFullYear(), start: t - DAY, end: t + 2 * DAY, need: NEED }];
    }
    return occurrences(t).filter((w) => t >= w.start && t < w.end);
  }
  function next(now) {
    const t = now == null ? Date.now() : now;
    return occurrences(t).find((w) => w.start > t) || null;
  }
  function name(key, lang) {
    const h = HOLIDAYS.find((x) => x.key === key);
    if (!h) return key;
    const i = LANGS.indexOf(lang);
    return h.names[i < 0 ? 1 : i];
  }
  const icon = (key) => (HOLIDAYS.find((x) => x.key === key) || {}).icon || '🎊';
  return { HOLIDAYS, NEED, active, next, name, icon, windowOf };
});
