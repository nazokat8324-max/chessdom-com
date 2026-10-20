// Bosh sahifa, chap karta: mini-kartalar — keyingi turnir, liga o'yinlarim, yangi xabarlar, jonli o'yinlar.
(function () {
  const st = { swiss: null, offset: 0, league: [], unread: 0, live: 0, busy: false };
  let refreshTimer = null;
  let tickTimer = null;

  const esc = (v) => {
    const div = document.createElement('div');
    div.textContent = (v === null || v === undefined) ? '' : String(v);
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  const isHome = () => { const v = document.getElementById('homeView'); return !!(v && v.classList.contains('active-view')); };
  const authHeaders = () => window.authToken ? { Authorization: 'Bearer ' + window.authToken } : {};
  const getJson = (url, auth) => fetch(url, { headers: auth ? authHeaders() : {} }).then(r => r.json()).catch(() => null);
  const hhmm = (iso) => { const d = new Date(iso); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const modeIcon = (m) => ({ bullet: '🔥', blitz: '⚡', rapid: '⏱️' }[m] || '♟');
  const mmss = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    return h ? h + ':' + mm : mm;
  };

  async function load() {
    if (!window.currentUser) return;
    const [ov, league, unread, live, news] = await Promise.all([
      getJson('/api/swiss', true),
      getJson('/api/leagues/my-games', true),
      getJson('/api/messages/unread', true),
      getJson('/api/games/live', false),
      getJson('/api/news?limit=1', false)
    ]);
    st.news = news && news.success && news.news[0] ? news.news[0] : null;
    if (ov && ov.success) {
      st.offset = new Date(ov.serverNow).getTime() - Date.now();
      const list = ov.tournaments || [];
      st.swiss = list.find(t => t.joined && (t.status === 'active' || t.status === 'registration'))
        || list.find(t => t.status === 'registration') || list.find(t => t.status === 'active') || null;
    }
    st.league = league && league.success ? league.games : [];
    st.unread = unread && unread.success ? unread.unread : 0;
    st.live = live && live.success ? live.games.length : 0;
    render();
  }

  function tournamentCard() {
    const t = st.swiss;
    if (!t) return '';
    let line, action = '';
    if (t.status === 'active') {
      line = `<span class="hw-live"><span class="ar-dot"></span>${esc(tx('swRoundOf', '{{round}}-tur / {{rounds}}', { round: t.round, rounds: t.rounds }))}</span>`;
      action = `<button class="hw-btn ghost" data-go="tournaments">${esc(t.joined ? tx('hwOpen', 'Ochish') : tx('hwWatchTable', 'Jadval'))} →</button>`;
    } else {
      line = `<span>${esc(tx('swStartsAt', '{{time}} da boshlanadi', { time: hhmm(t.startsAt) }))} · <b data-cd="${esc(t.startsAt)}"></b></span>`;
      action = t.joined
        ? `<span class="hw-ok">✓ ${esc(tx('swRegistered', "Siz ro'yxatdasiz"))}</span>`
        : `<button class="hw-btn" data-join="${esc(t.id)}">✓ ${esc(tx('swJoin', "Qo'shilish"))}</button>`;
    }
    return `<div class="hw-card hw-tournament" data-go="tournaments">
      <div class="hw-top"><span class="hw-label">🏁 ${esc(t.status === 'active' ? tx('hwTournamentNow', 'Turnir davom etmoqda') : tx('hwNextTournament', 'Keyingi turnir'))}</span></div>
      <div class="hw-title">${modeIcon(t.mode)} ${esc(t.name)} <small>· ${esc(tx('swRoundsCount', '{{n}} tur', { n: t.rounds }))} · ${esc(tx('hwPlayersN', '{{n}} kishi', { n: t.players }))}</small></div>
      <div class="hw-row">${line}${action}</div>
    </div>`;
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

  function newsCard() {
    if (!st.news) return '';
    return `<button class="hw-card hw-mini" data-go="news">
      <span class="hw-icon">📰</span>
      <span class="hw-text"><b>${esc(st.news.title)}</b><small>${esc(tx('hwLatestNews', "So'nggi yangilik"))} · ${esc(new Date(st.news.createdAt).toLocaleDateString())}</small></span>
    </button>`;
  }

  function render() {
    const el = document.getElementById('homeWidgets');
    if (!el) return;
    if (!window.currentUser) { el.innerHTML = ''; return; }
    el.innerHTML = tournamentCard() + leagueCard() + messagesCard() + liveCard() + newsCard();
    el.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', (e) => {
      if (e.target.closest('[data-join]')) return;
      e.stopPropagation();
      switchView(b.dataset.go);
    }));
    el.querySelectorAll('[data-join]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); join(b.dataset.join); }));
    tick();
  }

  async function join(id) {
    if (st.busy) return;
    st.busy = true;
    try {
      const d = await fetch('/api/swiss/' + encodeURIComponent(id) + '/join', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() } }).then(r => r.json());
      if (d.success) {
        showToast(tx('swJoinedToast', "Turnirga qo'shildingiz! Boshlanganda o'yin o'zi ochiladi."), 'success', 4000);
        if ('Notification' in window && Notification.permission === 'default') { try { Notification.requestPermission(); } catch (e) {} }
      } else showToast(tServer(d.message) || tx('errGeneric', 'Xatolik yuz berdi!'), 'warning', 5000);
      await load();
    } catch (e) {
      showToast(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"), 'warning');
    } finally {
      st.busy = false;
    }
  }

  function tick() {
    let expired = false;
    document.querySelectorAll('#homeWidgets [data-cd]').forEach(el => {
      const left = new Date(el.dataset.cd).getTime() - (Date.now() + st.offset);
      el.textContent = mmss(left);
      if (left <= 0) expired = true;
    });
    if (expired && isHome()) setTimeout(load, 2000);
  }

  window.refreshHomeWidgets = function () {
    load();
    if (!refreshTimer) refreshTimer = setInterval(() => { if (isHome()) load(); }, 30000);
    if (!tickTimer) tickTimer = setInterval(() => { if (isHome()) tick(); }, 1000);
  };
  window.renderHomeWidgets = render;

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { if (isHome()) window.refreshHomeWidgets(); }, 800);
    if (typeof socket === 'undefined') return;
    const soon = () => { if (isHome()) setTimeout(load, 500); };
    socket.on('swiss-update', soon);
    socket.on('league-update', soon);
    socket.on('chat-message', soon);
  });
})();
