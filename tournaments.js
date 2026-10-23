// "Turnirlar" sahifasi: Swiss turnirlari (server: swiss.js).
// Tablo (holat, ro'yxatga yozilish, tur), qoidalar 3 qadamda, jadval / juftliklar (turlar bo'yicha)
// va turnirlar ro'yxati (hozirgi, keyingi, tugaganlar g'olibi bilan).
(function () {
  const st = { list: null, selectedId: null, detail: null, tab: 'table', round: null, offset: 0, loading: false, busy: false };
  let ticker = null;
  let reloadTimer = null;

  const esc = (v) => {
    const div = document.createElement('div');
    div.textContent = (v === null || v === undefined) ? '' : String(v);
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  const isActiveView = () => { const v = document.getElementById('tournamentsView'); return !!(v && v.classList.contains('active-view')); };
  const root = () => document.getElementById('arenaRoot');
  const flag = (code) => code ? `<img class="ar-flag" src="https://flagcdn.com/w40/${esc(code)}.png" alt="" loading="lazy" onerror="this.remove()">` : '';
  const hhmm = (iso) => { const d = new Date(iso); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const now = () => Date.now() + st.offset;
  const modeName = (m) => ({ bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid' }[m] || m);
  const modeIcon = (m) => ({ bullet: '🔥', blitz: '⚡', rapid: '⏱️' }[m] || '♟');
  const pts = (n) => { const whole = Math.floor(n); return n - whole ? (whole ? whole + '½' : '½') : String(whole); };
  const clockText = (code) => {
    const m = String(code || '').match(/^(\d+)\+(\d+)$/);
    return m ? tx('arClockText', '{{min}} daqiqa + {{inc}} soniya', { min: m[1], inc: m[2] }) : code;
  };
  const mmss = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    return h ? h + ':' + mm : mm;
  };
  const authHeaders = () => window.authToken ? { Authorization: 'Bearer ' + window.authToken } : {};
  const player = (p) => p ? `${flag(p.country)}<b class="player-link" data-username="${esc(p.username)}">${esc(p.username)}</b>` : '—';

  // --- Ma'lumot ---
  async function load() {
    if (st.loading) return;
    st.loading = true;
    try {
      const ov = await fetch('/api/swiss', { headers: authHeaders() }).then(r => r.json());
      if (!ov.success) throw new Error(ov.message);
      st.offset = new Date(ov.serverNow).getTime() - Date.now();
      st.list = ov.tournaments;
      const urlId = window.location.pathname === '/turnirlar' ? new URLSearchParams(window.location.search).get('t') : null;
      if (urlId && !st.urlApplied) { st.urlApplied = true; st.selectedId = urlId; }
      if (!st.selectedId || !st.list.some(t => t.id === st.selectedId)) st.selectedId = ov.featuredId;
      st.detail = st.selectedId ? await fetchDetail(st.selectedId) : null;
      render();
    } catch (err) {
      console.error('Turnirlarni yuklash xatoligi:', err);
      const el = root();
      if (el && !st.list) el.innerHTML = `<div class="ar-empty">${esc(tx('errLoadFailed', 'Yuklashda xatolik yuz berdi'))}</div>`;
    } finally {
      st.loading = false;
    }
  }

  async function fetchDetail(id) {
    const d = await fetch('/api/swiss/' + encodeURIComponent(id), { headers: authHeaders() }).then(r => r.json());
    if (!d.success) return null;
    const rounds = Object.keys(d.rounds).map(Number);
    if (!st.round || !d.rounds[st.round] || st.round < d.tournament.round) st.round = rounds.length ? Math.max(...rounds) : null;
    return d;
  }

  async function select(id) {
    if (typeof window.pushSubRoute === 'function') window.pushSubRoute('tournaments', { t: id });
    st.selectedId = id;
    st.round = null;
    st.detail = await fetchDetail(id);
    render();
    const hero = document.querySelector('.ar-hero');
    if (hero) hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scheduleReload(delay) {
    if (reloadTimer) return;
    reloadTimer = setTimeout(() => { reloadTimer = null; if (isActiveView()) load(); }, delay);
  }

  // --- Tablo ---
  function statusChip(t) {
    if (t.status === 'registration') return `<div class="ar-live reg">📝 ${esc(tx('swRegOpen', "Ro'yxatga olish ochiq"))} · ${esc(tx('swStartsAt', '{{time}} da boshlanadi', { time: hhmm(t.startsAt) }))}</div>`;
    if (t.status === 'active') return `<div class="ar-live"><span class="ar-dot"></span>${esc(tx('arLive', 'Jonli'))} · ${esc(tx('swRoundOf', '{{round}}-tur / {{rounds}}', { round: t.round, rounds: t.rounds }))}</div>`;
    if (t.status === 'completed') return `<div class="ar-live done">🏁 ${esc(tx('swFinished', 'Yakunlandi'))} · ${hhmm(t.startsAt)}</div>`;
    return `<div class="ar-live done">${esc(tx('swCancelled', "Bekor qilindi — o'yinchi yetarli bo'lmadi"))}</div>`;
  }

  function ctaHtml(d) {
    const t = d.tournament, me = d.me;
    if (!window.currentUser) return `<button class="ar-cta" data-act="login">${esc(tx('arLoginToPlay', "O'ynash uchun tizimga kiring"))}</button>`;
    const leaveBtn = `<button class="ar-cancel" data-act="leave">${esc(tx('swLeave', 'Turnirdan chiqish'))}</button>`;
    if (t.status === 'registration') {
      if (me && me.registered) return `<div class="ar-searching ok"><span class="ar-ok">✓</span><div><b>${esc(tx('swRegistered', "Siz ro'yxatdasiz"))}</b><small>${esc(tx('swRegisteredHint', "Turnir boshlanganda o'yin o'zi ochiladi — saytda bo'ling"))}</small></div>${leaveBtn}</div>`;
      return `<button class="ar-cta" data-act="join">✓ ${esc(tx('swJoin', "Qo'shilish"))}</button>`;
    }
    if (t.status === 'active') {
      if (me && me.roomId) return `<button class="ar-cta" data-act="game">♟ ${esc(tx('arBackToGame', "O'yiningizga qaytish"))}</button>`;
      if (me && me.registered) {
        const waiting = t.nextRoundAt
          ? `${esc(tx('swNextRoundIn', 'Keyingi tur boshlanishiga'))} <span data-countdown="${esc(t.nextRoundAt)}">${mmss(new Date(t.nextRoundAt).getTime() - now())}</span>`
          : esc(tx('swWaitOthers', "Boshqa o'yinlar tugashini kutyapmiz"));
        return `<div class="ar-searching"><span class="ar-spinner"></span><div><b>${waiting}</b><small>${esc(tx('swStayHint', "Tur boshlanganda o'yin o'zi ochiladi"))}</small></div>${leaveBtn}</div>`;
      }
      if (t.round < t.rounds) return `<button class="ar-cta" data-act="join">✓ ${esc(me && me.withdrawn ? tx('swRejoin', 'Turnirga qaytish') : tx('swJoin', "Qo'shilish"))}</button><div class="ar-cta-note">${esc(tx('swLateNote', "Keyingi turdan boshlab o'ynaysiz"))}</div>`;
      return `<button class="ar-cta" disabled>${esc(tx('swClosed', "Qo'shilish yopilgan"))}</button>`;
    }
    if (t.status === 'completed' && d.standings.length) {
      const w = d.standings[0];
      return `<div class="ar-winner">🏆 <span>${esc(tx('swWinner', "G'olib"))}:</span> ${player(w)} <em>${esc(tx('arPointsShort', '{{n}} ochko', { n: pts(w.score) }))}</em></div>`;
    }
    return '';
  }

  function ringHtml(t) {
    let main, label, target = null;
    if (t.status === 'registration') { target = t.startsAt; main = mmss(new Date(t.startsAt).getTime() - now()); label = tx('swUntilStart', 'boshlanishiga'); }
    else if (t.status === 'active' && t.nextRoundAt) { target = t.nextRoundAt; main = mmss(new Date(t.nextRoundAt).getTime() - now()); label = tx('swUntilRound', 'keyingi turgacha'); }
    else if (t.status === 'active') { main = `${t.round}/${t.rounds}`; label = tx('swRoundLabel', 'tur'); }
    else { main = '🏁'; label = tx('swFinished', 'Yakunlandi'); }
    const progress = t.status === 'completed' ? 1 : (t.round || 0) / t.rounds;
    return `<div class="ar-ring" data-progress="${progress}">
      <svg viewBox="0 0 120 120"><circle class="ar-ring-bg" cx="60" cy="60" r="52"/><circle class="ar-ring-fg" cx="60" cy="60" r="52"/></svg>
      <div class="ar-ring-text"><b${target ? ` data-countdown="${esc(target)}"` : ''}>${main}</b><span>${esc(label)}</span></div>
    </div>`;
  }

  function heroHtml(d) {
    const t = d.tournament, me = d.me;
    const playingNow = t.status === 'active' && d.rounds[t.round] ? d.rounds[t.round].filter(p => p.black && !p.result).length : 0;
    const myLine = me && me.row && t.status !== 'registration'
      ? `<div class="ar-mine"><span>${esc(tx('arMyPlace', "Sizning o'rningiz"))}</span><b>#${me.rank}</b><span>${esc(tx('arPointsShort', '{{n}} ochko', { n: pts(me.row.score) }))}</span></div>`
      : '';
    return `
      <section class="ar-hero">
        <div class="ar-hero-main">
          ${statusChip(t)}
          <h1>${modeIcon(t.mode)} ${esc(modeName(t.mode))} <span>${esc(t.timeControl)}</span></h1>
          <p class="ar-hero-sub">${esc(tx('swHeroSub', "Swiss · {{rounds}} tur · har bir o'yinchiga {{clock}}", { rounds: t.rounds, clock: clockText(t.timeControl) }))}</p>
          <div class="ar-counts">
            <div><b>${t.players}</b><span>${esc(tx('arCountPlayers', 'ishtirokchi'))}</span></div>
            <div><b>${t.round || 0}/${t.rounds}</b><span>${esc(tx('swRoundsLabel', 'tur'))}</span></div>
            <div><b>${playingNow}</b><span>${esc(tx('swGamesNow', "o'yin davom etmoqda"))}</span></div>
          </div>
          ${myLine}
          <div class="ar-cta-wrap">${ctaHtml(d)}</div>
        </div>
        ${ringHtml(t)}
      </section>`;
  }

  function howHtml() {
    const steps = [
      ['✓', tx('swStep1Title', "Oldindan qo'shiling"), tx('swStep1Text', "Turnir har soat boshida boshlanadi. Undan oldin «Qo'shilish»ni bosing va saytda qoling.")],
      ['🤝', tx('swStep2Title', 'Har turda raqib beriladi'), tx('swStep2Text', "Server ochkosi yaqin raqib topadi, bir odam bilan ikki marta o'ynamaysiz. O'yin o'zi ochiladi.")],
      ['🏆', tx('swStep3Title', "Ochko to'plang"), tx('swStep3Text', "G'alaba 1, durrang ½, mag'lubiyat 0. Barcha turlardan keyin eng ko'p ochko to'plagan — g'olib.")]
    ];
    return `<section class="ar-how">${steps.map(([icon, title, text], i) => `
      <div class="ar-step"><span class="ar-step-num">${i + 1}</span><span class="ar-step-icon">${icon}</span><div><b>${esc(title)}</b><p>${esc(text)}</p></div></div>`).join('')}</section>`;
  }

  // --- Jadval va juftliklar ---
  function podiumHtml(rows) {
    const top = rows.filter(r => r.games > 0 || r.score > 0).slice(0, 3);
    if (!top.length) return '';
    const order = [top[1], top[0], top[2]];
    return `<div class="ar-podium">${order.map((r, i) => {
      if (!r) return '<div class="ar-pod empty"></div>';
      const place = [2, 1, 3][i];
      return `<div class="ar-pod p${place}"><span class="ar-pod-medal">${['🥇', '🥈', '🥉'][place - 1]}</span>
        <b>${player(r)}</b>
        <span class="ar-pod-score">${esc(tx('arPointsShort', '{{n}} ochko', { n: pts(r.score) }))}</span>
        <div class="ar-pod-step">${place}</div></div>`;
    }).join('')}</div>`;
  }

  function tableHtml(d) {
    const rows = d.standings;
    const myName = window.currentUser && window.currentUser.username;
    if (!rows.length) return `<div class="ar-empty">${esc(d.tournament.status === 'registration' ? tx('swNoPlayersYet', "Hali hech kim qo'shilmadi. Birinchi bo'ling!") : tx('arNoPlayers', "O'ynalmagan"))}</div>`;
    const resClass = { '1': 'w', '+': 'w', 'B': 'w', '½': 'd', '0': 'l', '-': 'l', '*': 'p' };
    const started = d.tournament.status !== 'registration';
    return `<div class="ar-table sw">
      <div class="ar-tr ar-th"><span>#</span><span>${esc(tx('arColPlayer', "O'yinchi"))}</span><span>${started ? esc(tx('swColRounds', 'Turlar')) : ''}</span><span title="${esc(tx('swBuchholzTitle', "Buchholz — raqiblar ochkolari yig'indisi (teng ochkoda ustunlik)"))}">BH</span><span>${esc(tx('arColPoints', 'Ochko'))}</span></div>
      ${rows.map((r, i) => `
        <div class="ar-tr${r.username === myName ? ' me' : ''}${r.withdrawn ? ' out' : ''}">
          <span class="ar-rank">${started && i < 3 && r.score > 0 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
          <span class="ar-player">${player(r)}<small>${r.rating}</small>${r.withdrawn ? `<em class="ar-tag">${esc(tx('swTagOut', 'chiqdi'))}</em>` : ''}</span>
          <span class="sw-chips">${r.results.map(x => `<i class="sw-chip ${resClass[x.r] || ''}" title="${esc(tx('swRoundN', '{{n}}-tur', { n: x.round }))}">${esc(x.r === '*' ? '•' : x.r)}</i>`).join('')}</span>
          <span class="sw-bh">${pts(r.buchholz)}</span>
          <span class="ar-points">${pts(r.score)}</span>
        </div>`).join('')}
    </div>
    ${started ? `<div class="sw-legend">${esc(tx('swLegend', "1 — g'alaba, ½ — durrang, 0 — mag'lubiyat, B — bye (+1), + / − — texnik natija"))}</div>` : ''}`;
  }

  function pairingsHtml(d) {
    const roundNos = Object.keys(d.rounds).map(Number).sort((a, b) => a - b);
    if (!roundNos.length) return `<div class="ar-empty">${esc(tx('swNoPairings', 'Juftliklar turnir boshlanganda chiqadi'))}</div>`;
    const list = d.rounds[st.round] || [];
    const resText = (r) => ({ '1-0': '1 – 0', '0-1': '0 – 1', '1/2': '½ – ½', '+-': '+ – −', '-+': '− – +', '--': '− – −' }[r] || r);
    return `<div class="sw-rounds">${roundNos.map(n => `<button class="sw-round${n === st.round ? ' active' : ''}" data-round="${n}">${esc(tx('swRoundN', '{{n}}-tur', { n }))}</button>`).join('')}</div>
      <div class="ar-games">${list.map(p => p.black ? `
        <div class="ar-game">
          <span class="${p.result === '1-0' || p.result === '+-' ? 'won' : ''}">♔ ${player(p.white)}</span>
          <b>${p.result ? esc(resText(p.result)) : (p.roomId
            ? `<button class="sw-watch" data-watch="${esc(p.roomId)}">👁 ${esc(tx('lvWatch', 'Tomosha'))}</button>`
            : `<em class="ar-tag playing">${esc(tx('arTagPlaying', "o'ynamoqda"))}</em>`)}</b>
          <span class="${p.result === '0-1' || p.result === '-+' ? 'won' : ''}">${player(p.black)} ♚</span>
        </div>` : `
        <div class="ar-game bye"><span>${player(p.white)}</span><b>bye</b><span>+1</span></div>`).join('')}</div>`;
  }

  function listHtml() {
    if (!st.list || !st.list.length) return `<div class="ar-empty small">${esc(tx('swNoTournaments', "Turnirlar hali yo'q"))}</div>`;
    const order = { active: 0, registration: 1, completed: 2, cancelled: 3 };
    const items = st.list.slice().sort((a, b) => order[a.status] - order[b.status] || new Date(b.startsAt) - new Date(a.startsAt));
    return `<div class="ar-sched">${items.map(t => {
      let pill;
      if (t.status === 'active') pill = `<span class="ar-pill live">${esc(tx('swRoundOf', '{{round}}-tur / {{rounds}}', { round: t.round, rounds: t.rounds }))}</span>`;
      else if (t.status === 'registration') pill = `<span class="ar-pill reg">${esc(tx('swRegShort', "Ro'yxat ochiq · {{n}}", { n: t.players }))}</span>`;
      else if (t.winner) pill = `<span class="ar-pill done">🏆 ${esc(t.winner.username)}</span>`;
      else pill = `<span class="ar-pill muted">${esc(tx('swCancelledShort', 'Bekor qilindi'))}</span>`;
      return `<button class="ar-slot ${t.status}${t.id === st.selectedId ? ' selected' : ''}" data-select="${esc(t.id)}">
        <span class="ar-slot-time">${hhmm(t.startsAt)}</span>
        <span class="ar-slot-name">${modeIcon(t.mode)} ${esc(modeName(t.mode))} <small>${esc(t.timeControl)} · ${esc(tx('swRoundsCount', '{{n}} tur', { n: t.rounds }))}</small></span>
        ${pill}
      </button>`;
    }).join('')}</div>`;
  }

  function render() {
    const el = root();
    if (!el) return;
    if (!st.list) { el.innerHTML = `<div class="ar-empty">${esc(tx('loadingText', 'Yuklanmoqda...'))}</div>`; return; }
    const d = st.detail;
    const tabs = [['table', tx('swTabTable', 'Jadval')], ['pairings', tx('swTabPairings', 'Juftliklar')]];
    el.innerHTML = `
      ${d ? heroHtml(d) : ''}
      ${howHtml()}
      <div class="ar-grid">
        <section class="ar-card ar-board">
          <div class="ar-card-head"><div class="sw-tabs">${tabs.map(([id, label]) => `<button class="sw-tab${st.tab === id ? ' active' : ''}" data-tab="${id}">${esc(label)}</button>`).join('')}</div>
            <span class="ar-card-note">${esc(tx('arTableNote', "Har o'yindan keyin yangilanadi"))}</span></div>
          ${d ? (st.tab === 'table' ? (d.tournament.status === 'completed' ? podiumHtml(d.standings) : '') + tableHtml(d) : pairingsHtml(d)) : `<div class="ar-empty">${esc(tx('swNoTournaments', "Turnirlar hali yo'q"))}</div>`}
        </section>
        <aside class="ar-side">
          <section class="ar-card"><div class="ar-card-head"><h2>${esc(tx('swAllTournaments', 'Turnirlar'))}</h2><span class="ar-card-note">${esc(tx('arScheduleNote', 'Har soatda yangi turnir'))}</span></div>${listHtml()}</section>
        </aside>
      </div>`;
    bind(el);
    tick();
  }

  function bind(el) {
    el.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
      const act = b.dataset.act;
      if (act === 'join') joinOrLeave('join');
      else if (act === 'leave') joinOrLeave('leave');
      else if (act === 'game') switchView('game');
      else if (act === 'login') showAuthGate('login');
    }));
    el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { st.tab = b.dataset.tab; render(); }));
    el.querySelectorAll('[data-round]').forEach(b => b.addEventListener('click', () => { st.round = Number(b.dataset.round); render(); }));
    el.querySelectorAll('[data-select]').forEach(b => b.addEventListener('click', () => select(b.dataset.select)));
    el.querySelectorAll('[data-watch]').forEach(b => b.addEventListener('click', () => { if (typeof window.watchGame === 'function') window.watchGame(b.dataset.watch); }));
  }

  async function joinOrLeave(action) {
    if (!window.currentUser) { showAuthGate('login'); return; }
    if (st.busy || !st.detail) return;
    if (action === 'leave' && st.detail.tournament.status === 'active' && !confirm(tx('swLeaveConfirm', "Turnirdan chiqasizmi? Keyingi turlarga juftlanmaysiz."))) return;
    st.busy = true;
    try {
      const d = await fetch('/api/swiss/' + encodeURIComponent(st.detail.tournament.id) + '/' + action, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }
      }).then(r => r.json());
      if (!d.success) showToast(tServer(d.message) || tx('errGeneric', 'Xatolik yuz berdi!'), 'warning', 5000);
      else {
        // Eslatma boshqa oynada turganda ham ko'rinishi uchun brauzer bildirishnomasiga ruxsat so'raymiz
        if (action === 'join' && 'Notification' in window && Notification.permission === 'default') {
          try { Notification.requestPermission(); } catch (e) {}
        }
      }
      if (d.success) showToast(action === 'join' ? tx('swJoinedToast', "Turnirga qo'shildingiz! Boshlanganda o'yin o'zi ochiladi.") : tx('swLeftToast', 'Turnirdan chiqdingiz'), action === 'join' ? 'success' : 'info', 4000);
      await load();
    } catch (err) {
      showToast(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"), 'warning');
    } finally {
      st.busy = false;
    }
  }

  // Har soniyada: teskari sanoqlar va halqa
  function tick() {
    let expired = false;
    document.querySelectorAll('#arenaRoot [data-countdown]').forEach(el => {
      const left = new Date(el.dataset.countdown).getTime() - now();
      el.textContent = mmss(left);
      if (left <= 0) expired = true;
    });
    const ring = document.querySelector('#arenaRoot .ar-ring');
    if (ring) {
      const fg = ring.querySelector('.ar-ring-fg');
      const c = 2 * Math.PI * 52;
      fg.style.strokeDasharray = c;
      fg.style.strokeDashoffset = c * (1 - Number(ring.dataset.progress || 0));
    }
    if (expired && isActiveView()) scheduleReload(2500);
  }

  // O'yin tugagach o'yin sahifasidagi "Turnir jadvaliga qaytish" tugmasi
  window.backToTournament = function () {
    if (typeof window.resetToPreGame === 'function') window.resetToPreGame();
    window.lastGameSwiss = null;
    switchView('tournaments');
  };

  window.loadTournaments = function () {
    if (!st.list) render();
    if (!ticker) ticker = setInterval(() => { if (isActiveView()) tick(); }, 1000);
    load();
  };
  window.loadArenas = window.loadTournaments;
  // Orqaga/oldinga: manzildagi turnirni tanlash
  window.selectTournament = function (id) {
    if (!id || id === st.selectedId) return;
    if (!st.list) { st.selectedId = id; st.urlApplied = true; return; }
    select(id);
  };
  window.refreshArenaPage = function () { if (isActiveView()) render(); };

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof socket === 'undefined') return;
    socket.on('swiss-update', () => { if (isActiveView()) scheduleReload(400); });
    // Turnir boshlanishiga 1 daqiqa qoldi
    socket.on('swiss-reminder', (data) => {
      const text = tx('swReminder', "«{{name}}» turniri 1 daqiqadan keyin boshlanadi! Saytda qoling va boshqa o'yin boshlamang.", { name: (data && data.name) || '' });
      showToast('⏰ ' + text, 'warning', 10000);
      try {
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          new Notification('ChessCaravan', { body: text, icon: 'assets/icons/icon-192.png' });
        }
      } catch (e) {}
    });
  });
})();
