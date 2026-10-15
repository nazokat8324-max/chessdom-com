// Sahifa manzillari: har bo'lim o'z manziliga ega (/reyting, /turnirlar ...), brauzerning orqaga/oldinga
// tugmalari sayt ichida ishlaydi, sahifa yangilansa o'sha bo'lim ochiladi. Profil oynasi — ?profile=ism.
// Server (server.js) shu manzillarda index.html ni beradi. Fayl oxirida yuklanadi — switchView va profil funksiyalarini o'raydi.
(function () {
  const ROUTES = {
    home: '/', game: '/oyin', leaderboard: '/reyting', tournaments: '/turnirlar', live: '/jonli',
    messages: '/xabarlar', clubs: '/klublar', leagues: '/ligalar', champions: '/chempionlar',
    settings: '/sozlamalar', admin: '/admin', friends: '/dostlar', chat: '/chat', history: '/tarix'
  };
  const BY_PATH = {};
  Object.entries(ROUTES).forEach(([view, p]) => { BY_PATH[p] = view; });
  const BASE_TITLE = 'ChessDom';
  // Har bo'limning yon menyudagi tugmasi (ba'zi bo'limlar o'zi belgilamaydi)
  const NAV = { home: 'navHome', game: 'navPlay', leaderboard: 'navLeaderboard', tournaments: 'navTournaments', live: 'navLive', messages: 'navMessages',
    clubs: 'navClubs', leagues: 'navLeagues', champions: 'navChampions', settings: 'navSettings', admin: 'navAdmin' };
  let popping = false; // popstate paytida tarixga yangi yozuv qo'shilmaydi

  const viewFromPath = (path) => BY_PATH[String(path || '/').toLowerCase().replace(/\/+$/, '') || '/'] || 'home';
  const profileFromUrl = () => new URLSearchParams(window.location.search).get('profile');
  const activeView = () => {
    const el = document.querySelector('.view-section.active-view');
    return el ? Object.keys(ROUTES).find(v => v + 'View' === el.id) || null : null;
  };

  function setTitle(view) {
    const nav = document.querySelector('.menu-item.active');
    const label = nav ? [...nav.querySelectorAll('span')].map(s => s.classList.contains('icon') || s.classList.contains('lg-nav-badge') ? '' : s.textContent.trim()).filter(Boolean)[0] : '';
    document.title = view === 'home' || !label ? BASE_TITLE + ' — Onlayn shaxmat' : label + ' · ' + BASE_TITLE;
  }

  // Til almashganda yoki tarjimalar yuklangach
  window.refreshPageTitle = function () { setTitle(activeView() || 'home'); };

  // --- switchView: manzilni yangilash ---
  const origSwitch = window.switchView;
  window.switchView = function (viewName, opts) {
    opts = opts || {};
    // Kirishdan oldin ochilgan havola: kirgandan keyin o'sha bo'limga
    if (viewName === 'home' && window.pendingRoute && window.currentUser) { viewName = window.pendingRoute; window.pendingRoute = null; }
    const result = origSwitch.apply(this, [viewName]);
    if ((viewName === 'login' || viewName === 'register') && !window.currentUser) return result;
    const view = ROUTES[viewName] ? viewName : (viewName === 'login' || viewName === 'register' ? 'home' : null);
    if (!view) return result;
    const url = ROUTES[view];
    if (!popping) {
      const same = window.location.pathname === url && !window.location.search;
      if (opts.replace || same) history.replaceState({ view }, '', url);
      else history.pushState({ view }, '', url);
    }
    const nav = NAV[view] && document.getElementById(NAV[view]);
    if (nav) {
      document.querySelectorAll('.menu-list .menu-item.active').forEach(el => { if (el !== nav) el.classList.remove('active'); });
      nav.classList.add('active');
    }
    setTitle(view);
    return result;
  };

  // --- Profil oynasi: ?profile=ism (orqaga — oyna yopiladi) ---
  function pushProfile(username) {
    if (popping || !username) return;
    const url = window.location.pathname + '?profile=' + encodeURIComponent(username);
    if (history.state && history.state.profile) history.replaceState({ view: activeView(), profile: username }, '', url);
    else history.pushState({ view: activeView(), profile: username }, '', url);
  }
  const origOpenPlayer = window.openPlayerProfile;
  window.openPlayerProfile = function (username) {
    const isMe = window.currentUser && window.currentUser.username === username;
    if (!isMe) pushProfile(username);
    return origOpenPlayer.apply(this, arguments);
  };
  const origOpenOwn = window.openProfileModal;
  window.openProfileModal = function () {
    if (window.currentUser) pushProfile(window.currentUser.username);
    return origOpenOwn.apply(this, arguments);
  };
  const origClose = window.closeProfileModal;
  window.closeProfileModal = function () {
    // Dastur ichidan yopilganda (masalan, "Xabar yozish") — manzildan ?profile olib tashlanadi
    if (!popping && history.state && history.state.profile) history.replaceState({ view: activeView() }, '', window.location.pathname);
    return origClose.apply(this, arguments);
  };
  const profileOpen = () => { const m = document.getElementById('profileModal'); return !!(m && m.style.display === 'flex'); };

  // --- Orqaga / oldinga ---
  window.addEventListener('popstate', () => {
    popping = true;
    try {
      const view = viewFromPath(window.location.pathname);
      if (view !== activeView()) window.switchView(view);
      const name = profileFromUrl();
      if (name && window.currentUser) {
        if (name === window.currentUser.username) window.openProfileModal(); else window.openPlayerProfile(name);
      } else if (profileOpen()) {
        origClose();
      }
      ['replayModal', 'challengeModal', 'reportModal'].forEach(id => { const el = document.getElementById(id); if (el && !name) el.remove(); });
      if (typeof window.closeAboutPage === 'function') window.closeAboutPage();
    } finally {
      popping = false;
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    // Profil oynasidagi "Orqaga" — brauzer tarixida bir qadam orqaga (profil yozuvi olib tashlanadi)
    const closeBtn = document.getElementById('closeProfileBtn');
    if (closeBtn) closeBtn.addEventListener('click', (e) => {
      if (history.state && history.state.profile) { e.stopImmediatePropagation(); history.back(); }
    }, true);

    // Sahifa ochilganda: manzildagi bo'lim
    const view = viewFromPath(window.location.pathname);
    const canonical = ROUTES[view];
    if (!window.currentUser) {
      if (view !== 'home') window.pendingRoute = view;
      history.replaceState({ view }, '', canonical + window.location.search);
      return;
    }
    setTimeout(window.refreshPageTitle, 1200);
    setTimeout(() => {
      if (view !== 'home' || window.location.pathname !== '/') window.switchView(view, { replace: true });
      else { history.replaceState({ view: 'home' }, '', '/' + window.location.search); setTitle('home'); }
    }, 0);
  });
})();
