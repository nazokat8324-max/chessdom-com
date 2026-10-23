// 🎯 Haftalik vazifalar (UMD: serverda require, brauzerda window.Quests). Hafta — dushanbadan (Toshkent vaqti).
// Har hafta hamma uchun bir xil 3 ta vazifa (hafta raqami bo'yicha aylanadi). Progress o'yinlar tarixidan hisoblanadi —
// alohida hisoblagich yo'q. Yangi vazifa qo'shilsa: QUESTS ga + 6 tildagi matn (languages.js `q_<id>` kaliti).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Quests = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const TZ = 5 * 3600 * 1000;
  // id, kerakli son, belgi, o'yin mos keladimi (g — tarix yozuvi: result, reason, color, variant, tea, rated, clock, moveCount)
  const QUESTS = [
    ['play5', 5, '♟', () => true],
    ['play10', 10, '🎲', () => true],
    ['win3', 3, '🏆', (g) => g.result === 'win'],
    ['win5', 5, '👑', (g) => g.result === 'win'],
    ['mate', 1, '⚔️', (g) => g.result === 'win' && g.reason === 'checkmate'],
    ['black', 2, '🖤', (g) => g.result === 'win' && g.color === 'b'],
    ['c960', 2, '🎲', (g) => g.variant === 'chess960'],
    ['tea', 2, '🍵', (g) => !!g.tea],
    ['rated', 3, '⭐', (g) => !!g.rated],
    ['long', 1, '⏳', (g) => (g.moveCount || 0) >= 80],
    ['blitz', 3, '⚡', (g) => g.mode === 'blitz'],
    ['rapid', 2, '⏱️', (g) => g.mode === 'rapid'],
    ['bullet', 3, '🔥', (g) => g.mode === 'bullet'],
    ['draw', 1, '🤝', (g) => g.result === 'draw' && g.reason !== 'aborted']
  ].map(([id, need, icon, test]) => ({ id, need, icon, test }));

  // Haftaning boshlanishi (dushanba 00:00 Toshkent) — ms
  function weekStart(t) {
    const d = new Date((t || Date.now()) + TZ);
    const day = (d.getUTCDay() + 6) % 7; // dushanba = 0
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day) - TZ;
  }
  const weekKey = (t) => new Date(weekStart(t) + TZ).toISOString().slice(0, 10);
  // Hafta tartib raqami (1970-01-05 dushanbadan)
  const weekIndex = (t) => Math.round((weekStart(t) - (Date.UTC(1970, 0, 5) - TZ)) / (7 * 864e5));

  // Shu haftaning 3 ta vazifasi: har xil turdagi (bitta "o'yna", bitta "yut", bitta maxsus)
  const GROUPS = [['play5', 'play10', 'blitz', 'rapid', 'bullet', 'rated'], ['win3', 'win5', 'black', 'mate'], ['c960', 'tea', 'long', 'draw', 'mate', 'black']];
  function questsFor(t) {
    const w = weekIndex(t);
    const picked = [];
    GROUPS.forEach((g, i) => {
      // Har guruh har hafta bittaga suriladi (guruhlar har xil siljish bilan) — ketma-ket haftalarda vazifa takrorlanmaydi
      let k = (w + i * 2) % g.length;
      while (picked.includes(g[k])) k = (k + 1) % g.length;
      picked.push(g[k]);
    });
    return picked.map((id) => QUESTS.find((q) => q.id === id));
  }
  // games — shu haftadagi o'yinlar (tarix yozuvlari); natija: [{id, icon, need, have, done}]
  function progress(games, t) {
    return questsFor(t).map((q) => {
      const have = Math.min(q.need, games.filter((g) => g.reason !== 'aborted' && q.test(g)).length);
      return { id: q.id, icon: q.icon, need: q.need, have, done: have >= q.need };
    });
  }
  return { QUESTS, weekStart, weekKey, weekIndex, questsFor, progress };
});
