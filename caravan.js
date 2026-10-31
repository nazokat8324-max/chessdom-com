// 🐪 Karvon yo'li — Ipak yo'li bo'ylab shaharlar (UMD: serverda require, brauzerda window.Caravan).
// Har o'yin karvonni oldinga yuradi: g'alaba 3, durrang 2, mag'lubiyat 1 qadam — qadamlar o'yinchi statistikasidan hisoblanadi
// (alohida jadval yo'q, eski o'yinlar ham sanaladi). Shahar qo'shilsa yoki chegara o'zgarsa — shu yerda, server va klient bir xil ko'radi.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Caravan = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const LANGS = ['uz', 'en', 'ru', 'es', 'de', 'fr', 'tr', 'kk', 'tg', 'ky', 'tk', 'az', 'zh', 'it'];
  // key, kerakli qadamlar, belgi, nom (uz, en, ru, es, de, fr, tr, kk, tg, ky, tk, az, zh, it)
  const CITIES = [
    ['xian', 0, '🏯', ['Sian', "Xi'an", 'Сиань', "Xi'an", "Xi'an", "Xi'an", 'Şian', 'Сиань', 'Сиан', 'Сиань', 'Sian', 'Sian', '西安', "Xi'an"]],
    ['dunhuang', 15, '🏜️', ['Dunxuan', 'Dunhuang', 'Дуньхуан', 'Dunhuang', 'Dunhuang', 'Dunhuang', 'Dunhuang', 'Дуньхуан', 'Дунхуан', 'Дуньхуан', 'Dunhuan', 'Dunhuan', '敦煌', 'Dunhuang']],
    ['kashgar', 40, '🐫', ['Qashqar', 'Kashgar', 'Кашгар', 'Kashgar', 'Kaschgar', 'Kachgar', 'Kaşgar', 'Қашқар', 'Кошғар', 'Кашкар', 'Kaşgar', 'Kaşqar', '喀什', 'Kashgar']],
    ['fergana', 75, '🍇', ["Farg'ona", 'Fergana', 'Фергана', 'Fergana', 'Fergana', 'Ferghana', 'Fergana', 'Ферғана', 'Фарғона', 'Фергана', 'Fergana', 'Fərqanə', '费尔干纳', 'Fergana']],
    ['tashkent', 120, '🌇', ['Toshkent', 'Tashkent', 'Ташкент', 'Taskent', 'Taschkent', 'Tachkent', 'Taşkent', 'Ташкент', 'Тошкент', 'Ташкент', 'Daşkent', 'Daşkənd', '塔什干', 'Tashkent']],
    ['samarkand', 180, '🕌', ['Samarqand', 'Samarkand', 'Самарканд', 'Samarcanda', 'Samarkand', 'Samarcande', 'Semerkant', 'Самарқанд', 'Самарқанд', 'Самарканд', 'Samarkant', 'Səmərqənd', '撒马尔罕', 'Samarcanda']],
    ['bukhara', 250, '🏛️', ['Buxoro', 'Bukhara', 'Бухара', 'Bujará', 'Buchara', 'Boukhara', 'Buhara', 'Бұхара', 'Бухоро', 'Бухара', 'Buhara', 'Buxara', '布哈拉', 'Bukhara']],
    ['khiva', 330, '🧱', ['Xiva', 'Khiva', 'Хива', 'Jiva', 'Chiwa', 'Khiva', 'Hive', 'Хиуа', 'Хева', 'Хива', 'Hywa', 'Xivə', '希瓦', 'Khiva']],
    ['merv', 420, '🌴', ['Marv', 'Merv', 'Мерв', 'Merv', 'Merw', 'Merv', 'Merv', 'Мерв', 'Марв', 'Мерв', 'Merw', 'Mərv', '梅尔夫', 'Merv']],
    ['baghdad', 520, '📜', ["Bag'dod", 'Baghdad', 'Багдад', 'Bagdad', 'Bagdad', 'Bagdad', 'Bağdat', 'Бағдат', 'Бағдод', 'Багдад', 'Bagdat', 'Bağdad', '巴格达', 'Baghdad']],
    ['damascus', 630, '🌹', ['Damashq', 'Damascus', 'Дамаск', 'Damasco', 'Damaskus', 'Damas', 'Şam', 'Дамаск', 'Димишқ', 'Дамаск', 'Damask', 'Dəməşq', '大马士革', 'Damasco']],
    ['istanbul', 750, '🌉', ['Istanbul', 'Istanbul', 'Стамбул', 'Estambul', 'Istanbul', 'Istanbul', 'İstanbul', 'Ыстамбұл', 'Истанбул', 'Стамбул', 'Stambul', 'İstanbul', '伊斯坦布尔', 'Istanbul']]
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
