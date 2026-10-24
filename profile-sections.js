// Profil bo'limlari alohida sahifada (2026-10-24): 🏅 Yutuqlar, 📊 Batafsil statistika, 📖 Debyutlarim, 🎖️ Nishonlar —
// /profil?u=ism&b=yutuqlar|statistika|debyutlar|nishonlar (#profsecView, ps-*). Panellar (#profAchPanel ...) shu sahifada turadi,
// ichini avvalgidek profile-extras.js / myopenings.js / profile-badges.js chizadi. "← Orqaga" (bu yerda va O'yinlar tarixida) —
// profil oynasiga qaytaradi (window.backToProfile).
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SECTIONS = {
    ach: { slug: 'yutuqlar', panel: 'profAchPanel', icon: '🏅', key: 'achTitle', fb: 'Yutuqlar' },
    ext: { slug: 'statistika', panel: 'profExtPanel', icon: '📊', key: 'exTitle', fb: 'Batafsil statistika' },
    open: { slug: 'debyutlar', panel: 'profOpenPanel', icon: '📖', key: 'opTitle', fb: 'Debyutlarim' },
    badge: { slug: 'nishonlar', panel: 'profBadgePanel', icon: '🎖️', key: 'nbTitle', fb: 'Nishonlar' }
  };
  const bySlug = (slug) => Object.keys(SECTIONS).find((k) => SECTIONS[k].slug === slug) || null;
  const st = { name: null, user: null };

  // Profil ochiq bo'lsa — uning ostidagi bo'lim (orqaga qaytilganda o'sha bo'lim ustida profil ochiladi)
  function rememberReturn() {
    const m = document.getElementById('profileModal');
    if (!m || m.style.display !== 'flex') return;
    const el = document.querySelector('.view-section.active-view');
    const view = el ? el.id.replace(/View$/, '') : 'home';
    window.profileReturnView = view === 'profsec' || view === 'history' ? (window.profileReturnView || 'home') : view;
  }

  window.rememberProfileReturn = rememberReturn;

  window.backToProfile = function (username) {
    const user = username || st.user;
    window.switchView(window.profileReturnView || 'home');
    window.profileReturnView = null;
    if (!user) return;
    if (window.currentUser && window.currentUser.username === user) window.openProfileModal();
    else if (typeof window.openPlayerProfile === 'function') window.openPlayerProfile(user);
  };

  window.openProfileSection = function (name, username) {
    if (!SECTIONS[name]) return;
    st.name = name;
    st.user = username || (window.currentProfileUser && window.currentProfileUser()) || (window.currentUser && window.currentUser.username);
    st.pending = true;
    rememberReturn();
    if (typeof window.closeProfileModal === 'function') window.closeProfileModal();
    window.switchView('profsec');
  };

  // switchView('profsec') chaqiradi (script.js)
  window.updateProfileSectionView = function () {
    if (!st.pending && window.location.pathname === '/profil') {
      const q = new URLSearchParams(window.location.search);
      st.name = bySlug(q.get('b')) || st.name || 'ach';
      st.user = q.get('u') || st.user || (window.currentUser && window.currentUser.username);
    }
    st.pending = false;
    const sec = SECTIONS[st.name] || SECTIONS.ach;
    Object.values(SECTIONS).forEach((s) => { const p = document.getElementById(s.panel); if (p) p.hidden = s !== sec; });
    const head = document.getElementById('psHead');
    if (head) {
      head.innerHTML = `<button type="button" class="ps-back" data-ps-back>← ${esc(tx('clubDetailBack', 'Orqaga'))}</button>
        <div><h1>${sec.icon} ${esc(tx(sec.key, sec.fb))}</h1><p><b class="player-link" data-username="${esc(st.user || '')}">${esc(st.user || '')}</b></p></div>`;
      head.querySelector('[data-ps-back]').onclick = () => window.backToProfile(st.user);
    }
    document.title = tx(sec.key, sec.fb) + ' · ' + (st.user || '') + ' · ChessCaravan';
    if (st.user && typeof window.loadProfileExtras === 'function') window.loadProfileExtras(st.user);
    if (st.name === 'open' && typeof window.loadProfileOpenings === 'function') window.loadProfileOpenings(st.user);
    // Manzilda kim va qaysi bo'lim (router /profil ga qaytarib qo'yadi)
    const url = '/profil?u=' + encodeURIComponent(st.user || '') + '&b=' + sec.slug;
    setTimeout(() => {
      if (window.location.pathname === '/profil' && window.location.pathname + window.location.search !== url) history.replaceState({ view: 'profsec' }, '', url);
    }, 0);
  };
})();
