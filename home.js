// Bosh sahifa, chap karta: mini-kartalar — liga o'yinlarim, yangi xabarlar, jonli o'yinlar.
(function () {
  const st = { league: [], unread: 0, live: 0 };
  let refreshTimer = null;

  const esc = (v) => {
    const div = document.createElement('div');
    div.textContent = (v === null || v === undefined) ? '' : String(v);
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  const isHome = () => { const v = document.getElementById('homeView'); return !!(v && v.classList.contains('active-view')); };
  const authHeaders = () => window.authToken ? { Authorization: 'Bearer ' + window.authToken } : {};
  const getJson = (url, auth) => fetch(url, { headers: auth ? authHeaders() : {} }).then(r => r.json()).catch(() => null);

  async function load() {
    if (!window.currentUser) return;
    const [league, unread, live] = await Promise.all([
      getJson('/api/leagues/my-games', true),
      getJson('/api/messages/unread', true),
      getJson('/api/games/live', false)
    ]);
    st.league = league && league.success ? league.games : [];
    st.unread = unread && unread.success ? unread.unread : 0;
    st.live = live && live.success ? live.games.length : 0;
    render();
  }

  function leagueCard() {
    const pending = st.league.length;
    const ready = st.league.filter(g => g.opponentReady && !g.iAmReady).length;
    return `<button class="hw-card hw-mini" data-go="leagues">
      <span class="hw-icon">🏆</span>
      <span class="hw-text"><b>${esc(tx('hwLeagueGames', "Liga o'yinlarim"))}</b><small>${esc(pending
        ? (ready ? tx('hwLeagueReady', "{{n}} ta raqib sizni kutyapti!", { n: ready }) : tx('hwLeaguePending', "{{n}} ta o'yin kutmoqda", { n: pending }))
        : tx('hwLeagueNone', "Hozircha o'yin yo'q"))}</small></span>
      ${pending ? `<span class="hw-count${ready ? ' hot' : ''}">${pending}</span>` : ''}
    </button>`;
  }

  function messagesCard() {
    return `<button class="hw-card hw-mini" data-go="messages">
      <span class="hw-icon">💬</span>
      <span class="hw-text"><b>${esc(tx('mMessages', 'Xabarlar'))}</b><small>${esc(st.unread ? tx('hwUnread', '{{n}} ta yangi xabar', { n: st.unread }) : tx('hwNoUnread', "Yangi xabar yo'q"))}</small></span>
      ${st.unread ? `<span class="hw-count hot">${st.unread}</span>` : ''}
    </button>`;
  }

  function liveCard() {
    return `<button class="hw-card hw-mini" data-go="live">
      <span class="hw-icon">📺</span>
      <span class="hw-text"><b>${esc(tx('mLive', "Jonli o'yinlar"))}</b><small>${esc(st.live ? tx('hwLiveN', "Hozir {{n}} ta o'yin davom etmoqda", { n: st.live }) : tx('hwLiveNone', "Hozir o'yin yo'q"))}</small></span>
      ${st.live ? `<span class="hw-count">${st.live}</span>` : ''}
    </button>`;
  }

  function render() {
    const el = document.getElementById('homeWidgets');
    if (!el) return;
    if (!window.currentUser) { el.innerHTML = ''; return; }
    el.innerHTML = leagueCard() + messagesCard() + liveCard();
    el.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      switchView(b.dataset.go);
    }));
  }

  window.refreshHomeWidgets = function () {
    load();
    if (!refreshTimer) refreshTimer = setInterval(() => { if (isHome() && !document.hidden) load(); }, 30000);
  };
  window.renderHomeWidgets = render;

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { if (isHome()) window.refreshHomeWidgets(); }, 800);
    if (typeof socket === 'undefined') return;
    const soon = () => { if (isHome()) setTimeout(load, 500); };
    socket.on('league-update', soon);
    socket.on('chat-message', soon);
  });
})();
