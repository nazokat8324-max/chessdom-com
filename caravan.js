// 🐪 Karvon yo'li — Ipak yo'li bo'ylab shaharlar (UMD: serverda require, brauzerda window.Caravan).
// Har o'yin karvonni oldinga yuradi: g'alaba 3, durrang 2, mag'lubiyat 1 qadam — qadamlar o'yinchi statistikasidan hisoblanadi
// (alohida jadval yo'q, eski o'yinlar ham sanaladi). Shahar qo'shilsa yoki chegara o'zgarsa — shu yerda, server va klient bir xil ko'radi.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Caravan = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const LANGS = ['uz', 'en', 'ru', 'es', 'de', 'fr', 'tr', 'kk', 'tg', 'ky', 'tk', 'az'];
  // key, kerakli qadamlar, belgi, nom (uz, en, ru, es, de, fr, tr, kk, tg, ky, tk, az)
  const CITIES = [
    ['xian', 0, '🏯', ['Sian', "Xi'an", 'Сиань', "Xi'an", "Xi'an", "Xi'an", 'Şian', 'Сиань', 'Сиан', 'Сиань', 'Sian', 'Sian']],
    ['dunhuang', 15, '🏜️', ['Dunxuan', 'Dunhuang', 'Дуньхуан', 'Dunhuang', 'Dunhuang', 'Dunhuang', 'Dunhuang', 'Дуньхуан', 'Дунхуан', 'Дуньхуан', 'Dunhuan', 'Dunhuan']],
    ['kashgar', 40, '🐫', ['Qashqar', 'Kashgar', 'Кашгар', 'Kashgar', 'Kaschgar', 'Kachgar', 'Kaşgar', 'Қашқар', 'Кошғар', 'Кашкар', 'Kaşgar', 'Kaşqar']],
    ['fergana', 75, '🍇', ["Farg'ona", 'Fergana', 'Фергана', 'Fergana', 'Fergana', 'Ferghana', 'Fergana', 'Ферғана', 'Фарғона', 'Фергана', 'Fergana', 'Fərqanə']],
    ['tashkent', 120, '🌇', ['Toshkent', 'Tashkent', 'Ташкент', 'Taskent', 'Taschkent', 'Tachkent', 'Taşkent', 'Ташкент', 'Тошкент', 'Ташкент', 'Daşkent', 'Daşkənd']],
    ['samarkand', 180, '🕌', ['Samarqand', 'Samarkand', 'Самарканд', 'Samarcanda', 'Samarkand', 'Samarcande', 'Semerkant', 'Самарқанд', 'Самарқанд', 'Самарканд', 'Samarkant', 'Səmərqənd']],
    ['bukhara', 250, '🏛️', ['Buxoro', 'Bukhara', 'Бухара', 'Bujará', 'Buchara', 'Boukhara', 'Buhara', 'Бұхара', 'Бухоро', 'Бухара', 'Buhara', 'Buxara']],
    ['khiva', 330, '🧱', ['Xiva', 'Khiva', 'Хива', 'Jiva', 'Chiwa', 'Khiva', 'Hive', 'Хиуа', 'Хева', 'Хива', 'Hywa', 'Xivə']],
    ['merv', 420, '🌴', ['Marv', 'Merv', 'Мерв', 'Merv', 'Merw', 'Merv', 'Merv', 'Мерв', 'Марв', 'Мерв', 'Merw', 'Mərv']],
    ['baghdad', 520, '📜', ["Bag'dod", 'Baghdad', 'Багдад', 'Bagdad', 'Bagdad', 'Bagdad', 'Bağdat', 'Бағдат', 'Бағдод', 'Багдад', 'Bagdat', 'Bağdad']],
    ['damascus', 630, '🌹', ['Damashq', 'Damascus', 'Дамаск', 'Damasco', 'Damaskus', 'Damas', 'Şam', 'Дамаск', 'Димишқ', 'Дамаск', 'Damask', 'Dəməşq']],
    ['istanbul', 750, '🌉', ['Istanbul', 'Istanbul', 'Стамбул', 'Estambul', 'Istanbul', 'Istanbul', 'İstanbul', 'Ыстамбұл', 'Истанбул', 'Стамбул', 'Stambul', 'İstanbul']]
  ].map(([key, at, icon, names]) => ({ key, at, icon, names }));

  const STEP = { win: 3, draw: 2, loss: 1 };
  const pointsOf = (stats) => {
    const s = stats || {};
    return 3 * (Number(s.wins) || 0) + 2 * (Number(s.draws) || 0) + (Number(s.losses) || 0);
  };
  const cityIndex = (points) => {
    let i = 0;
    while (i + 1 < CITIES.length && points >= CITIES[i + 1].at) i++;
    return i;
  };
  // Hozirgi shahar, keyingisi va unga qadar foiz
  const progress = (points) => {
    const i = cityIndex(points);
    const city = CITIES[i], next = CITIES[i + 1] || null;
    const pct = next ? Math.round(((points - city.at) / (next.at - city.at)) * 100) : 100;
    return { points, index: i, city, next, left: next ? next.at - points : 0, pct: Math.max(0, Math.min(100, pct)) };
  };
  const cityName = (key, lang) => {
    const c = CITIES.find((x) => x.key === key);
    if (!c) return key;
    if (lang === 'uzc') { const U = (typeof UzCyrl !== 'undefined' ? UzCyrl : (typeof require === 'function' ? require('./uzcyrl') : null)); return U ? U.toCyrl(c.names[0]) : c.names[0]; }
    const i = LANGS.indexOf(lang);
    return c.names[i < 0 ? 1 : i] || c.names[1];
  };
  return { CITIES, STEP, pointsOf, cityIndex, progress, cityName };
});
