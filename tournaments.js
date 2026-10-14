// "Turnirlar" sahifasi: 24/7 Arena (server: arena.js).
// Bitta sahifada: joriy arena (soat halqasi, "O'ynash" tugmasi), qoidalar 3 qadamda,
// jonli jadval, so'nggi o'yinlar va bugungi jadval (tugaganlarining g'oliblari).
(function () {
  const st = { data: null, past: null, searching: false, offset: 0, loading: false, pendingPlay: false };
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
  const clockText = (code) => {
    const m = String(code || '').match(/^(\d+)\+(\d+)$/);
    return m ? tx('arClockText', '{{min}} daqiqa + {{inc}} soniya', { min: m[1], inc: m[2] }) : code;
  };
  const mmss = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };
  const untilText = (ms) => {
    const min = Math.max(1, Math.round(ms / 60000));
    if (min < 60) return tx('arInMinutes', '{{m}} daqiqadan keyin', { m: min });
    return tx('arInHours', '{{h}} soat {{m}} daqiqadan keyin', { h: Math.floor(min / 60), m: min % 60 });
  };

  async function fetchOverview() {
    const headers = window.authToken ? { Authorization: 'Bearer ' + window.authToken } : {};
    const res = await fetch('/api/arena', { headers });
    const d = await res.json();
    if (!d.success) throw new Error(d.message || 'arena');
    st.offset = new Date(d.serverNow).getTime() - Date.now();
    st.data = d;
    st.searching = !!(d.me && d.me.inQueue);
    return d;
  }

  // --- Qismlar ---
  function heroHtml(d) {
    const a = d.arena;
    const left = new Date(a.endsAt).getTime() - now();
    const me = d.me;
    let cta;
    if (!window.currentUser) {
      cta = `<button class="ar-cta" data-act="login">${esc(tx('arLoginToPlay', "O'ynash uchun tizimga kiring"))}</button>`;
    } else if (me && me.roomId) {
      cta = `<button class="ar-cta" data-act="game">♟ ${esc(tx('arBackToGame', "O'yiningizga qaytish"))}</button>`;
    } else if (left < 30000) {
      cta = `<button class="ar-cta" disabled>${esc(tx('arClosing', 'Turnir yakunlanmoqda'))}</button>`;
    } else if (st.searching) {
      cta = `<div class="ar-searching"><span class="ar-spinner"></span><div><b>${esc(tx('arSearching', 'Raqib qidirilmoqda...'))}</b><small>${esc(tx('arSearchingHint', 'Topilishi bilan o\'yin o\'zi ochiladi'))}</small></div><button class="ar-cancel" data-act="cancel">${esc(tx('arCancel', 'Bekor qilish'))}</button></div>`;
    } else {
      cta = `<button class="ar-cta" data-act="play">▶ ${esc(tx('arPlay', "O'ynash"))}</button>`;
    }
    const myLine = me && me.row
      ? `<div class="ar-mine"><span>${esc(tx('arMyPlace', "Sizning o'rningiz"))}</span><b>#${me.rank}</b><span>${esc(tx('arPointsShort', '{{n}} ochko', { n: me.row.score }))}</span><span>${esc(tx('arGamesShort', "{{n}} o'yin", { n: me.row.games }))}</span></div>`
      : '';
    return `
      <section class="ar-hero">
        <div class="ar-hero-main">
          <div class="ar-live"><span class="ar-dot"></span>${esc(tx('arLiveNow', 'Hozir jonli'))} · ${hhmm(a.startsAt)}–${hhmm(a.endsAt)}</div>
          <h1>${modeIcon(a.mode)} ${esc(modeName(a.mode))} <span>${esc(a.timeControl)}</span></h1>
          <p class="ar-hero-sub">${esc(tx('arHeroSub', "Har bir o'yinchiga {{clock}}. Soat tugaguncha xohlagancha o'ynang.", { clock: clockText(a.timeControl) }))}</p>
          <div class="ar-counts">
            <div><b>${d.counts.players}</b><span>${esc(tx('arCountPlayers', 'ishtirokchi'))}</span></div>
            <div><b>${d.counts.playing}</b><span>${esc(tx('arCountPlaying', "o'ynamoqda"))}</span></div>
            <div><b>${d.counts.inQueue}</b><span>${esc(tx('arCountQueue', 'raqib kutmoqda'))}</span></div>
          </div>
          ${myLine}
          <div class="ar-cta-wrap">${cta}</div>
        </div>
        <div class="ar-ring" aria-label="${esc(tx('arTimeLeft', 'qoldi'))}">
          <svg viewBox="0 0 120 120"><circle class="ar-ring-bg" cx="60" cy="60" r="52"/><circle class="ar-ring-fg" id="arRingFg" cx="60" cy="60" r="52"/></svg>
          <div class="ar-ring-text"><b id="arTimer">${mmss(left)}</b><span>${esc(tx('arTimeLeft', 'qoldi'))}</span></div>
        </div>
      </section>`;
  }

  function howHtml(points) {
    const steps = [
      ['▶', tx('arStep1Title', "«O'ynash»ni bosing"), tx('arStep1Text', "Ro'yxatdan alohida o'tish shart emas — birinchi bosishda turnirga qo'shilasiz.")],
      ['🤝', tx('arStep2Title', 'Raqib avtomatik topiladi'), tx('arStep2Text', "Server sizga ochkosi yaqin o'yinchini topadi. O'yin tugagach, yana «O'ynash»ni bosing.")],
      ['🏆', tx('arStep3Title', "Ochko to'plang"), tx('arStep3Text', "G'alaba +{{win}}, durrang +{{draw}}, mag'lubiyat 0. Soat oxirida eng ko'p ochko to'plagan — g'olib.", { win: points.win, draw: points.draw })]
    ];
    return `<section class="ar-how">${steps.map(([icon, title, text], i) => `
      <div class="ar-step"><span class="ar-step-num">${i + 1}</span><span class="ar-step-icon">${icon}</span><div><b>${esc(title)}</b><p>${esc(text)}</p></div></div>`).join('')}</section>`;
  }

  function podiumHtml(rows) {
    const top = rows.filter(r => r.games > 0).slice(0, 3);
    if (!top.length) return '';
    const order = [top[1], top[0], top[2]];
    return `<div class="ar-podium">${order.map((r, i) => {
      if (!r) return '<div class="ar-pod empty"></div>';
      const place = [2, 1, 3][i];
      return `<div class="ar-pod p${place}"><span class="ar-pod-medal">${['🥇', '🥈', '🥉'][place - 1]}</span>
        <b class="player-link" data-username="${esc(r.username)}">${flag(r.country)}${esc(r.username)}</b>
        <span class="ar-pod-score">${esc(tx('arPointsShort', '{{n}} ochko', { n: r.score }))}</span>
        <div class="ar-pod-step">${place}</div></div>`;
    }).join('')}</div>`;
  }

  function tableHtml(rows, emptyText) {
    const myName = window.currentUser && window.currentUser.username;
    if (!rows.length) return `<div class="ar-empty">${esc(emptyText)}</div>`;
    return `<div class="ar-table">
      <div class="ar-tr ar-th"><span>#</span><span>${esc(tx('arColPlayer', "O'yinchi"))}</span><span title="${esc(tx('arColGamesTitle', "O'ynalgan o'yinlar"))}">${esc(tx('arColGames', "O'yin"))}</span><span title="${esc(tx('arColWdlTitle', "G'alaba / Durrang / Mag'lubiyat"))}">${esc(tx('arColWdl', 'G / D / M'))}</span><span>${esc(tx('arColPoints', 'Ochko'))}</span></div>
      ${rows.map((r, i) => `
        <div class="ar-tr${r.username === myName ? ' me' : ''}">
          <span class="ar-rank">${i < 3 && r.games > 0 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
          <span class="ar-player">${flag(r.country)}<b class="player-link" data-username="${esc(r.username)}">${esc(r.username)}</b><small>${r.rating}</small>${r.playing ? `<em class="ar-tag playing">${esc(tx('arTagPlaying', "o'ynamoqda"))}</em>` : (r.inQueue ? `<em class="ar-tag">${esc(tx('arTagQueue', 'kutmoqda'))}</em>` : '')}</span>
          <span>${r.games}</span>
          <span class="ar-wdl"><i class="w">${r.wins}</i>/<i class="d">${r.draws}</i>/<i class="l">${r.losses}</i></span>
          <span class="ar-points">${r.score}</span>
        </div>`).join('')}
    </div>`;
  }

  function recentHtml(games) {
    if (!games.length) return `<div class="ar-empty small">${esc(tx('arNoGames', "Hali o'yinlar tugamadi"))}</div>`;
    return `<div class="ar-games">${games.map(g => `
      <div class="ar-game">
        <span class="player-link${g.result === '1-0' ? ' won' : ''}" data-username="${esc(g.white)}">♔ ${esc(g.white)}</span>
        <b>${esc(g.result)}</b>
        <span class="player-link${g.result === '0-1' ? ' won' : ''}" data-username="${esc(g.black)}">♚ ${esc(g.black)}</span>
      </div>`).join('')}</div>`;
  }

  function scheduleHtml(slots) {
    const nextIdx = slots.findIndex(s => s.status === 'upcoming');
    return `<div class="ar-sched">${slots.map((s, idx) => {
      let status;
      if (s.status === 'current') status = `<span class="ar-pill live">${esc(tx('arLive', 'Jonli'))}</span>`;
      else if (s.status === 'upcoming') status = idx === nextIdx ? `<span class="ar-pill">${esc(untilText(new Date(s.slotStart).getTime() - now()))}</span>` : '';
      else if (s.winner) status = `<span class="ar-pill done">🏆 ${esc(s.winner.username)}</span>`;
      else status = `<span class="ar-pill muted">${esc(tx('arNoPlayers', "O'ynalmagan"))}</span>`;
      const clickable = s.status === 'completed' && s.winner && s.arenaId;
      return `<${clickable ? 'button' : 'div'} class="ar-slot ${s.status}"${clickable ? ` data-results="${esc(s.arenaId)}"` : ''}>
        <span class="ar-slot-time">${hhmm(s.slotStart)}</span>
        <span class="ar-slot-name">${modeIcon(s.type)} ${esc(modeName(s.type))} <small>${esc(s.code)}</small></span>
        ${status}
      </${clickable ? 'button' : 'div'}>`;
    }).join('')}</div>`;
  }

  function render() {
    const el = root();
    if (!el) return;
    const d = st.data;
    if (!d) {
      el.innerHTML = `<div class="ar-empty">${esc(tx('loadingText', 'Yuklanmoqda...'))}</div>`;
      return;
    }
    const scrollY = el.querySelector('.ar-sched') ? el.querySelector('.ar-sched').scrollTop : null;
    let board;
    if (st.past) {
      const a = st.past.arena;
      board = `
        <div class="ar-card-head"><h2>${esc(tx('arResultsTitle', '{{time}} turniri natijalari', { time: hhmm(a.startsAt) }))}</h2>
          <button class="ar-link" data-act="current">← ${esc(tx('arBackToLive', 'Joriy turnir'))}</button></div>
        <p class="ar-card-sub">${modeIcon(a.mode)} ${esc(modeName(a.mode))} ${esc(a.timeControl)} · ${hhmm(a.startsAt)}–${hhmm(a.endsAt)}</p>
        ${podiumHtml(st.past.standings)}
        ${tableHtml(st.past.standings, tx('arNoPlayers', "O'ynalmagan"))}`;
    } else {
      board = `
        <div class="ar-card-head"><h2>${esc(tx('arLiveTable', 'Jonli jadval'))}</h2><span class="ar-card-note">${esc(tx('arTableNote', 'Har o\'yindan keyin yangilanadi'))}</span></div>
        ${podiumHtml(d.standings)}
        ${tableHtml(d.standings, tx('arTableEmpty', "Hali hech kim o'ynamadi. Birinchi bo'ling!"))}`;
    }
    el.innerHTML = `
      ${heroHtml(d)}
      ${howHtml(d.points)}
      <div class="ar-grid">
        <section class="ar-card ar-board">${board}</section>
        <aside class="ar-side">
          <section class="ar-card"><div class="ar-card-head"><h2>${esc(tx('arRecentGames', "So'nggi o'yinlar"))}</h2></div>${recentHtml(st.past ? st.past.recentGames : d.recentGames)}</section>
          <section class="ar-card"><div class="ar-card-head"><h2>${esc(tx('arTodaySchedule', 'Bugungi jadval'))}</h2><span class="ar-card-note">${esc(tx('arScheduleNote', 'Har soatda yangi turnir'))}</span></div>${scheduleHtml(d.schedule)}</section>
        </aside>
      </div>`;
    if (scrollY !== null) el.querySelector('.ar-sched').scrollTop = scrollY;
    else {
      const cur = el.querySelector('.ar-slot.current');
      if (cur) cur.parentElement.scrollTop = Math.max(0, cur.offsetTop - cur.parentElement.offsetTop - 60);
    }
    bind(el);
    tick();
  }

  function bind(el) {
    el.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
      const act = b.dataset.act;
      if (act === 'play') play();
      else if (act === 'cancel') cancel();
      else if (act === 'game') switchView('game');
      else if (act === 'login') showAuthGate('login');
      else if (act === 'current') { st.past = null; render(); }
    }));
    el.querySelectorAll('[data-results]').forEach(b => b.addEventListener('click', () => openResults(b.dataset.results)));
  }

  // Soat halqasi va qolgan vaqt (har soniyada)
  function tick() {
    const d = st.data;
    if (!d) return;
    const total = new Date(d.arena.endsAt).getTime() - new Date(d.arena.startsAt).getTime();
    const left = new Date(d.arena.endsAt).getTime() - now();
    const timer = document.getElementById('arTimer');
    if (timer) timer.textContent = mmss(left);
    const ring = document.getElementById('arRingFg');
    if (ring) {
      const c = 2 * Math.PI * 52;
      ring.style.strokeDasharray = c;
      ring.style.strokeDashoffset = c * (1 - Math.max(0, left) / total);
    }
    if (left <= 0 && isActiveView()) scheduleReload(1500);
  }

  function scheduleReload(delay) {
    if (reloadTimer) return;
    reloadTimer = setTimeout(() => { reloadTimer = null; if (isActiveView()) load(); }, delay);
  }

  async function load() {
    if (st.loading) return;
    st.loading = true;
    try {
      await fetchOverview();
      render();
      if (st.pendingPlay) { st.pendingPlay = false; play(); }
    } catch (err) {
      console.error('Arena yuklash xatoligi:', err);
      const el = root();
      if (el && !st.data) el.innerHTML = `<div class="ar-empty">${esc(tx('errLoadFailed', 'Yuklashda xatolik yuz berdi'))}</div>`;
    } finally {
      st.loading = false;
    }
  }

  async function openResults(arenaId) {
    try {
      const d = await fetch('/api/arena/' + encodeURIComponent(arenaId) + '/results').then(r => r.json());
      if (!d.success) throw new Error(d.message);
      st.past = d;
      render();
      const board = document.querySelector('.ar-board');
      if (board) board.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      showToast(tx('errLoadFailed', 'Yuklashda xatolik yuz berdi'), 'warning');
    }
  }

  function play() {
    if (!window.currentUser) { showAuthGate('login'); return; }
    if (!st.data) { st.pendingPlay = true; return; }
    if (typeof socket === 'undefined' || !socket.connected) {
      showToast(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"), 'warning');
      return;
    }
    if (typeof window.isGameInProgress === 'function' && window.isGameInProgress()) {
      switchView('game');
      return;
    }
    // Oddiy o'yin qidirilayotgan bo'lsa — to'xtatamiz (ikki navbatda birdan turib bo'lmaydi)
    if (window.isSearchingOpponent && typeof window.stopMatchmaking === 'function') window.stopMatchmaking();
    socket.emit('arena-play', { arenaId: st.data.arena.id });
    st.searching = true;
    render();
  }

  function cancel() {
    if (typeof socket !== 'undefined') socket.emit('arena-leave');
    st.searching = false;
    render();
  }

  // O'yin tugagach o'yin sahifasidagi "Keyingi arena o'yini" tugmasi
  window.arenaPlayNext = function () {
    if (typeof window.resetToPreGame === 'function') window.resetToPreGame();
    window.lastGameArena = null;
    st.pendingPlay = true;
    switchView('tournaments');
  };

  window.loadTournaments = function () {
    if (typeof window.closeTournamentDetail === 'function') window.closeTournamentDetail();
    if (!st.data) render();
    if (!ticker) ticker = setInterval(() => { if (isActiveView()) tick(); }, 1000);
    load();
  };
  window.loadArenas = window.loadTournaments;
  window.refreshArenaPage = function () { if (isActiveView()) render(); };

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof socket === 'undefined') return;
    socket.on('arena-waiting', () => { st.searching = true; if (isActiveView()) render(); });
    socket.on('arena-error', (data) => {
      st.searching = false;
      const reason = data && data.reason;
      const msg = {
        closing: tx('arErrClosing', "Turnir tugashiga oz qoldi — keyingi turnirni kuting."),
        in_game: tx('arErrInGame', "Avval joriy o'yiningizni tugating."),
        not_current: tx('arErrNotCurrent', 'Bu turnir tugagan. Sahifa yangilandi.'),
        auth: tx('errLoginRequired', 'Avval tizimga kirishingiz kerak!')
      }[reason] || tx('errGeneric', 'Xatolik yuz berdi!');
      showToast(msg, 'warning', 5000);
      if (isActiveView()) load();
    });
    socket.on('arena-update', () => { if (isActiveView()) scheduleReload(300); });
    socket.on('match-found', (data) => {
      st.searching = false;
      window.lastGameArena = data && data.arena ? data.arena : null;
    });
  });
})();
