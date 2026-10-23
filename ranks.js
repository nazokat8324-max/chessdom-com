// Reyting darajalari: nom yonidagi kichik nishon — shaxmat donasi o'z rangida (♙ → ♟ → ♞ → ♝ → ♜ → ♛ → ★ → 👑; xochli ♚ ishlatilmaydi). Chegaralar server.js dagi RANK_STEPS bilan bir xil.
// rankBadge(rating) — faqat belgi (title'da nom va oraliq), rankBadge(rating, true) — belgi + nom.
(function () {
  const RANKS = [
    { min: 0, key: 'novice', icon: '♙︎', i18n: 'rkNovice', fb: 'Yangi boshlovchi' },
    { min: 1200, key: 'bronze', icon: '♟︎', i18n: 'rkBronze', fb: 'Bronza' },
    { min: 1400, key: 'silver', icon: '♞︎', i18n: 'rkSilver', fb: 'Kumush' },
    { min: 1600, key: 'gold', icon: '♝︎', i18n: 'rkGold', fb: 'Oltin' },
    { min: 1800, key: 'platinum', icon: '♜︎', i18n: 'rkPlatinum', fb: 'Platina' },
    { min: 2000, key: 'diamond', icon: '♛︎', i18n: 'rkDiamond', fb: 'Olmos' },
    { min: 2200, key: 'master', icon: '★', i18n: 'rkMaster', fb: 'Usta' },
    { min: 2400, key: 'grandmaster', icon: '👑', i18n: 'rkGrandmaster', fb: 'Grossmeyster' }
  ];
  window.RANKS = RANKS;

  window.rankInfo = function (rating) {
    const r = Number(rating);
    if (!Number.isFinite(r) || r <= 0) return null;
    let idx = 0;
    RANKS.forEach((x, i) => { if (r >= x.min) idx = i; });
    const rank = RANKS[idx];
    const next = RANKS[idx + 1];
    return { ...rank, label: tx(rank.i18n, rank.fb), range: next ? `${rank.min}–${next.min - 1}` : `${rank.min}+` };
  };
  window.rankByKey = function (key) {
    const rank = RANKS.find(x => x.key === key);
    return rank ? { ...rank, label: tx(rank.i18n, rank.fb) } : null;
  };

  window.rankBadge = function (rating, withLabel) {
    const info = window.rankInfo(rating);
    if (!info) return '';
    const title = `${info.label} · ${info.range}`.replace(/"/g, '&quot;');
    return `<span class="rk-badge rk-${info.key}${withLabel ? ' full' : ''}" title="${title}"><i class="rk-ico">${info.icon}</i>${withLabel ? `<b>${info.label.replace(/</g, '&lt;')}</b>` : ''}</span>`;
  };

  // Darajalar ro'yxati (Reyting sahifasidagi izoh uchun)
  window.rankLegendHtml = function () {
    return RANKS.map((x, i) => {
      const next = RANKS[i + 1];
      return `<span class="rk-legend-item rk-${x.key}" title="${tx(x.i18n, x.fb)}"><i class="rk-ico">${x.icon}</i> ${tx(x.i18n, x.fb)} <small>${next ? x.min + '+' : x.min + '+'}</small></span>`;
    }).join('');
  };
})();
