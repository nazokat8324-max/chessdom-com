// 🎨 Saytning o'z ikonka to'plami (2026-11-22, foydalanuvchi tanlovi): emojilar o'rniga o'zimiz chizgan chiziqli SVG belgilar.
// Rang — currentColor: menyuda to'plam/sayt rangi (--accent), asosiy tugmada tugma yozuvi rangi; har qurilmada bir xil ko'rinadi.
// window.iconSvg(name, cls) → '<svg …>'; window.applyUiIcons() — menyu, yuqori tugmalar va bosh sahifa tugmalaridagi emojilarni almashtiradi.
// Yangi menyu bandi qo'shilsa — NAV_ICONS ga ham (pages.test tekshiradi). Shakllar loyihaniki (begona to'plamdan olinmagan).
(function () {
  const P = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
    board: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M12 3.5v17M3.5 12h17"/><path d="M4.5 4.5h7v7h-7zM12.5 12.5h7v7h-7z" fill="currentColor" stroke="none" opacity=".35"/>',
    tea: '<path d="M4 9.5h12v3.5a6 6 0 0 1-12 0z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H15.5"/><path d="M8 3.5c0 1.4 1.4 1.4 1.4 3M12 3.5c0 1.4 1.4 1.4 1.4 3"/><path d="M5 21h10"/>',
    ball: '<circle cx="12" cy="12" r="8.5"/><path d="m12 8 3.4 2.4-1.3 4h-4.2l-1.3-4z"/><path d="M12 3.5V8M15.4 10.4l4.3-1.3M14.1 14.4l2.6 3.6M9.9 14.4l-2.6 3.6M8.6 10.4 4.3 9.1"/>',
    medal: '<path d="M8 3h8l-2.6 6.2h-2.8z"/><circle cx="12" cy="15" r="5.5"/><path d="m12 12.3.9 1.8 2 .3-1.45 1.4.35 2L12 16.85l-1.8.95.35-2-1.45-1.4 2-.3z"/>',
    tv: '<rect x="3" y="6.5" width="18" height="13" rx="2.5"/><path d="M8.5 3 12 6.5 15.5 3"/><path d="M10.5 10.3v5.4l4.3-2.7z"/>',
    chat: '<path d="M4 5.5h16v10.5H9.5L4 20z"/><path d="M8.5 10.8h.01M12 10.8h.01M15.5 10.8h.01" stroke-width="2.6"/>',
    shield: '<path d="M12 3 19.5 6v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z"/><path d="M12 6.5v11M7.5 11h9" opacity=".55"/>',
    trophy: '<path d="M7.5 4h9v5.2a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6h-3v1.4a3.2 3.2 0 0 0 3.2 3.2M16.5 6h3v1.4a3.2 3.2 0 0 1-3.2 3.2"/><path d="M12 13.8v3M9 20.5h6M10 16.8h4v3.7h-4z"/>',
    flag: '<path d="M5.5 21V3.5"/><path d="M5.5 4.5h12l-2.3 4 2.3 4h-12"/>',
    camel: '<path d="M3 13.5c.8-2.4 2.3-3.4 3.8-3.2.8-2.8 3-3.4 4.2-.8 1-2.4 3-2.6 4.2-.2l1.4-3.2c.4-.9 1.4-1.1 2.1-.4l1.8 1.8-1.6.6-2.3 5.2c-.3.7-.9 1.2-1.6 1.2H4.5"/><path d="M5.5 14.5V20M9 14.5V20M13.5 14.5V20M16.5 13.5V20"/>',
    books: '<path d="M4.5 4h4v16h-4zM8.5 4h4v16h-4z"/><path d="m14.2 5.4 3.8-1 3.9 14.5-3.9 1z"/><path d="M4.5 8h4M8.5 16h4"/>',
    admin: '<path d="M12 3 19.5 6v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z"/><path d="m8.8 12 2.2 2.3 4.3-4.6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.3"/><path d="M12 2.6v3.1M12 18.3v3.1M2.6 12h3.1M18.3 12h3.1M5.4 5.4l2.2 2.2M16.4 16.4l2.2 2.2M5.4 18.6l2.2-2.2M16.4 7.6l2.2-2.2"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 2H4.4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.5 3.5 5.4 3.5 8.5s-1.1 6-3.5 8.5c-2.4-2.5-3.5-5.4-3.5-8.5s1.1-6 3.5-8.5z"/>',
    gift: '<rect x="4" y="9.5" width="16" height="11" rx="1.5"/><path d="M3 6.5h18v3H3zM12 6.5v14"/><path d="M12 6.5C10.6 3.4 7.5 3.3 7.5 5c0 1.2 1.9 1.5 4.5 1.5zM12 6.5c1.4-3.1 4.5-3.2 4.5-1.5 0 1.2-1.9 1.5-4.5 1.5z"/>',
    pawn: '<circle cx="12" cy="6.5" r="2.8"/><path d="M9.6 10h4.8l-.9 5.2h-3z"/><path d="M7 20.5h10l-1.6-4.2H8.6z"/>',
    gamepad: '<path d="M7 8h10a4 4 0 0 1 4 4l-.5 4.6a2.4 2.4 0 0 1-4.2 1.3L14.5 16h-5l-1.8 1.9a2.4 2.4 0 0 1-4.2-1.3L3 12a4 4 0 0 1 4-4z"/><path d="M8 11v3M6.5 12.5h3"/><path d="M15.5 11.6h.01M17.6 13.4h.01" stroke-width="2.6"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5V17"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    scroll: '<path d="M6 4h11a2 2 0 0 1 2 2v12.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M9.5 9h6M9.5 12.5h6M9.5 16h4"/>',
    team: '<circle cx="8.5" cy="8" r="3"/><circle cx="15.5" cy="8" r="3"/><path d="M3 19.5a5.5 5.5 0 0 1 11 0M10 19.5a5.5 5.5 0 0 1 11 0"/>',
    map: '<path d="M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5-5.5 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
    bolt: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'
  };
  window.UI_ICONS = Object.keys(P);
  window.iconSvg = function (name, cls) {
    const body = P[name];
    if (!body) return '';
    return `<svg class="ui-ic${cls ? ' ' + cls : ''}" data-ic="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
  };

  // Yon menyu bandlari → ikonka (mobile-route.js ham shu ikonkalarni yo'l bekatlarida ko'rsatadi)
  const NAV_ICONS = {
    navHome: 'home', navPlay: 'board', navTea: 'tea', navFoot: 'ball', navLeaderboard: 'medal', navLive: 'tv',
    navMessages: 'chat', navClubs: 'shield', navLeagues: 'trophy', navWar: 'flag', navCaravan: 'camel',
    navLibrary: 'books', navAdmin: 'admin', navMore: 'menu'
  };
  window.NAV_ICONS = NAV_ICONS;
  // Elementning boshidagi emoji matnini ikonka bilan almashtirish (ichidagi boshqa elementlar — masalan, nishon — qoladi)
  function swapLead(el, name) {
    if (!el || el.querySelector(':scope > .ui-ic')) return;
    const first = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    if (first) first.textContent = first.textContent.replace(/^\s*\S+\s*/u, '');
    el.insertAdjacentHTML('afterbegin', window.iconSvg(name));
  }
  window.applyUiIcons = function () {
    for (const [id, name] of Object.entries(NAV_ICONS)) {
      const ic = document.querySelector('#' + id + ' .icon');
      if (ic && !ic.querySelector('.ui-ic')) { ic.innerHTML = window.iconSvg(name); ic.dataset.ic = name; }
    }
    swapLead(document.getElementById('topSettingsBtn'), 'gear');
    swapLead(document.getElementById('notifBell'), 'bell');
    document.querySelectorAll('.tea-home-btn:not(.inv-home-btn)').forEach((b) => swapLead(b, 'tea'));
    document.querySelectorAll('.inv-home-btn').forEach((b) => swapLead(b, 'link'));
  };
  window.applyUiIcons();
  document.addEventListener('DOMContentLoaded', window.applyUiIcons);
})();
