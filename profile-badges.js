// 🎖️ Nishonlar: profilda "O'yinlar va yutuqlar" ichidagi tugma (#profBadgeBtn → #profBadgePanel, nb-*). Ma'lumot /extras dan:
// badges.questWeeks (haftalik vazifalar), badges.gameOfDay (Kun o'yini), sportsmanship.awards va predictions.awards (oylik mukofotlar),
// duels.won (yutilgan bahslar), caravan (qadamlar → Karvon shaharlari muhrlari). profile-extras.js renderAll chaqiradi.
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lang = () => String((window.i18next && window.i18next.language) || 'en').slice(0, 2);
  const UZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
  function monthName(ym) {
    const [y, m] = String(ym).split('-').map(Number);
    if (!y || !m) return ym;
    if (lang() === 'uz') return UZ_MONTHS[m - 1] + ' ' + y; // brauzerlarda uz-UZ oy nomi yo'q
    try { return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(lang(), { month: 'long', year: 'numeric', timeZone: 'UTC' }); } catch (e) { return ym; }
  }
  function dayName(d) {
    const [y, m, day] = String(d).split('-').map(Number);
    if (!y) return d;
    if (lang() === 'uz') return day + '-' + UZ_MONTHS[m - 1].toLowerCase() + ' ' + y;
    try { return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString(lang(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); } catch (e) { return d; }
  }

  // Nishonlar ro'yxati: {belgi, nomi, qanday olinadi, soni, tafsilot chiplari / shahar muhrlari}
  function collect(d) {
    const b = (d && d.badges) || {};
    const cities = window.Caravan && d && d.caravan != null ? window.Caravan.cityIndex(d.caravan) : -1;
    const weeks = b.questWeeks || [], god = b.gameOfDay || [];
    const sport = (d && d.sportsmanship && d.sportsmanship.awards) || [], oracle = (d && d.predictions && d.predictions.awards) || [];
    const duels = (d && d.duels && d.duels.won) || 0;
    return [
      { icon: '🎯', title: tx('nbQuest', 'Haftalik vazifalar'), how: tx('nbQuestHow', "Haftaning uchala vazifasini bajaring (Karvon yo'li sahifasi)"), n: weeks.length,
        chips: weeks.map((w) => tx('nbWeekOf', '{{date}} haftasi', { date: dayName(w) })) },
      { icon: '🐪', title: tx('nbCaravan', 'Karvon shaharlari'), how: tx('nbCaravanHow', "O'ynang — har o'yin karvoningizni Ipak yo'li bo'ylab oldinga yuradi"), n: Math.max(0, cities),
        stamps: window.Caravan ? window.Caravan.CITIES.map((c, i) => ({ icon: c.icon, name: window.Caravan.cityName(c.key, lang()), on: i <= cities })).slice(1) : [] },
      { icon: '⭐', title: tx('gdTitle', "Kun o'yini"), how: tx('nbGodHow', "Qiziqarli o'yin o'ynang — har kuni kechagi eng yaxshi o'yin tanlanadi"), n: god.length,
        chips: god.map((g) => dayName(g.day) + (g.opponent ? ' · ' + g.opponent : '')) },
      { icon: '🤺', title: tx('nbDuel', 'Yutilgan bahslar'), how: tx('nbDuelHow', "Do'stingizni 3, 5 yoki 7 o'yinlik bahsga chaqirib yuting"), n: duels, chips: [] },
      { icon: '🤝', title: tx('nbSport', "Oyning odobli o'yinchisi"), how: tx('nbSportHow', "Oy davomida eng ko'p 👍 odob bahosini oling"), n: sport.length, chips: sport.map(monthName) },
      { icon: '🔮', title: tx('nbOracle', 'Oyning bashoratchisi'), how: tx('nbOracleHow', "Jonli o'yinlarda natijani to'g'ri taxmin qilib, oyda eng ko'p ochko to'plang"), n: oracle.length, chips: oracle.map(monthName) }
    ];
  }

  window.renderProfileBadges = function (d) {
    const list = collect(d);
    const total = list.reduce((s, x) => s + x.n, 0);
    const cnt = document.getElementById('profBadgeCount');
    if (cnt) cnt.textContent = d ? String(total) : '';
    const el = document.getElementById('profBadges');
    if (!el) return;
    if (!d) { el.innerHTML = ''; return; }
    el.innerHTML = list.map((x) => `<div class="nb-item${x.n ? ' earned' : ''}">
      <div class="nb-head"><span class="nb-ico">${x.icon}</span><b>${esc(x.title)}</b><span class="nb-n">${x.n ? '×' + esc(x.n) : ''}</span></div>
      ${x.stamps ? `<div class="nb-stamps">${x.stamps.map((s) => `<span class="nb-stamp${s.on ? ' on' : ''}" title="${esc(s.name)}">${s.icon}</span>`).join('')}</div>` : ''}
      ${x.n && x.chips && x.chips.length ? `<div class="nb-chips">${x.chips.slice(0, 12).map((c) => `<span>${esc(c)}</span>`).join('')}${x.chips.length > 12 ? `<span>+${x.chips.length - 12}</span>` : ''}</div>` : ''}
      ${!x.n ? `<small class="nb-how">${esc(x.how)}</small>` : ''}
    </div>`).join('');
  };
})();
