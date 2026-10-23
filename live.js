// "Jonli o'yinlar": hozir davom etayotgan o'yinlar ro'yxati va tanlangan o'yinni tomosha qilish.
// Server: GET /api/games/live, socket 'watch-game' → 'watch-state', 'watch-move', 'watch-ended'.
// Bashorat paneli (predictions.js) uchun document'ga 'live:state' / 'live:move' / 'live:ended' / 'live:stop' hodisalari
// yuboriladi; doskada surish faqat window.livePredict ruxsat bersa ishlaydi ("Keyingi yurishni top").
(function () {
  const st = { games: [], watching: null, chess: null, board: null, clock: null, clockAt: 0, ended: null, variant: 'standard', chat: [] };
  let listTimer = null;
  let clockTimer = null;

  const esc = (v) => {
    const div = document.createElement('div');
    div.textContent = (v === null || v === undefined) ? '' : String(v);
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  const isActiveView = () => { const v = document.getElementById('liveView'); return !!(v && v.classList.contains('active-view')); };
  const flag = (code) => code ? `<img class="ar-flag" src="https://flagcdn.com/w40/${esc(code)}.png" alt="" loading="lazy" onerror="this.remove()">` : '';
  const modeIcon = (m) => ({ bullet: '🔥', blitz: '⚡', rapid: '⏱️' }[m] || '♟');
  const fmtClock = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  const kindTag = (g) => g.kind === 'swiss'
    ? `<span class="lv-tag swiss">🏁 ${esc(g.label || tx('swAllTournaments', 'Turnir'))}</span>`
    : (g.kind === 'league' ? `<span class="lv-tag league">🏆 ${esc(tx('lvLeague', 'Liga'))}</span>` : '');

  // --- Ro'yxat ---
  async function loadList() {
    try {
      const d = await fetch('/api/games/live').then(r => r.json());
      st.games = d.success ? d.games : [];
    } catch (e) { st.games = []; }
    renderList();
  }

  function renderList() {
    const el = document.getElementById('lvList');
    if (!el) return;
    const count = document.getElementById('lvCount');
    if (count) count.textContent = tx('lvCount', '{{n}} ta o\'yin', { n: st.games.length });
    if (!st.games.length) {
      el.innerHTML = `<div class="lv-empty"><span>♟</span><p>${esc(tx('lvEmpty', "Hozir hech kim o'ynamayapti. Birozdan keyin qayta qarang!"))}</p></div>`;
      return;
    }
    el.innerHTML = st.games.map(g => `
      <button class="lv-item${st.watching === g.roomId ? ' active' : ''}" data-watch="${esc(g.roomId)}">
        <div class="lv-item-top">${modeIcon(g.mode)} <b>${esc(g.clock.initial / 60)}+${esc(g.clock.increment)}</b>${g.variant === 'chess960' ? '<span class="lv-tag v960">🎲 960</span>' : ''}${kindTag(g)}<small>${g.watchers ? '👁 ' + g.watchers : ''}</small></div>
        <div class="lv-item-player"><i class="lv-dot w"></i>${flag(g.white.country)}<span>${esc(g.white.username)}</span><em>${g.white.rating}</em></div>
        <div class="lv-item-player"><i class="lv-dot b"></i>${flag(g.black.country)}<span>${esc(g.black.username)}</span><em>${g.black.rating}</em></div>
      </button>`).join('');
    el.querySelectorAll('[data-watch]').forEach(b => b.addEventListener('click', () => watch(b.dataset.watch)));
  }

  // --- Tomosha ---
  function stageHtml(info) {
    const bar = (side, p) => `
      <div class="lv-bar" data-side="${side}">
        <span class="lv-avatar ${side}">${esc((p.username || '?').charAt(0).toUpperCase())}${window.avatarOverlay ? window.avatarOverlay(p.username, window.myAvatarVersion(p.username)) : ''}</span>
        <div class="lv-bar-name">${flag(p.country)}<b class="player-link" data-username="${esc(p.username)}">${esc(p.username)}</b><small>${window.rankBadge ? window.rankBadge(p.rating) : ''}${p.rating}</small></div>
        <span class="lv-clock" id="lvClock${side}">--:--</span>
      </div>`;
    return `
      <div class="lv-stage-head">
        <button class="lv-back" data-back="1">←</button>
        <div>${modeIcon(info.mode)} <b>${esc(info.clock.initial / 60)}+${esc(info.clock.increment)}</b> ${kindTag(info)}</div>
        <span class="lv-live"><span class="ar-dot"></span>${esc(tx('lvLiveTag', 'Jonli'))}</span>
      </div>
      ${bar('b', info.black)}
      <div class="lv-board-wrap"><div id="liveBoard"></div></div>
      ${bar('w', info.white)}
      <div class="lv-status" id="lvStatus"></div>
      <div class="lv-opening" id="lvOpening" hidden></div>
      <div class="lv-moves" id="lvMoves"></div>
      <div class="lv-predict" id="lvPredict"></div>
      <div class="lv-chat">
        <div class="lv-chat-head">💬 ${esc(tx('lvChatTitle', 'Tomoshabinlar chati'))}<span id="lvWatchers"></span></div>
        <div class="lv-chat-list" id="lvChatList"></div>
        <form class="lv-chat-form" id="lvChatForm" autocomplete="off">
          <input id="lvChatInput" class="form-input" maxlength="200" placeholder="${esc(tx('lvChatPlaceholder', 'Xabar yozing...'))}">
          <button type="submit">➤</button>
        </form>
      </div>`;
  }

  function watch(roomId) {
    if (typeof socket === 'undefined') return;
    st.watching = roomId;
    st.ended = null;
    socket.emit('watch-game', roomId);
    renderList();
    const layout = document.querySelector('.lv-layout');
    if (layout) layout.classList.add('has-watch');
  }

  function applyState(data) {
    if (!data || data.roomId !== st.watching) return;
    const stage = document.getElementById('lvStage');
    if (!stage) return;
    if (data.missing) {
      stage.innerHTML = `<div class="lv-placeholder"><span>🏁</span><p>${esc(tx('lvGameOver', "Bu o'yin tugagan"))}</p></div>`;
      loadList();
      return;
    }
    stage.innerHTML = stageHtml(data);
    stage.querySelector('[data-back]').addEventListener('click', stopWatching);
    st.variant = data.variant === 'chess960' ? 'chess960' : 'standard';
    st.chess = st.variant === 'chess960' && window.Chess960 && data.startFen ? new Chess960(data.startFen) : new Chess();
    st.chat = Array.isArray(data.chat) ? data.chat.slice() : [];
    setWatchers(data.watchers);
    renderChat();
    stage.querySelector('#lvChatForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = stage.querySelector('#lvChatInput');
      const message = input.value.trim();
      if (!message || typeof socket === 'undefined') return;
      socket.emit('watch-chat', { roomId: st.watching, message });
      input.value = '';
    });
    (data.history || []).forEach(m => st.chess.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' }));
    if (st.board && typeof st.board.destroy === 'function') st.board.destroy();
    st.board = Chessboard('liveBoard', {
      position: st.chess.fen(),
      draggable: true,
      // Faqat bashorat rejimida (predictions.js): surilgan yurish taxmin sifatida yuboriladi, doska o'zgarmaydi
      onDragStart: (source, piece) => !!(window.livePredict && !st.ended && window.livePredict.canDrag(piece, st.chess)),
      onDrop: (from, to) => { if (window.livePredict && from !== to) window.livePredict.drop(from, to, st.chess); return 'snapback'; },
      pieceTheme: (p) => (window.pieceUrl ? window.pieceUrl(p) : 'img/chesspieces/karvon/' + p + '.svg')
    });
    setClock(data.clockState);
    if (data.status !== 'active') st.ended = { winner: null, reason: 'over' };
    renderMoves();
    document.dispatchEvent(new CustomEvent('live:state', { detail: { data, chess: st.chess } }));
  }

  function setClock(clock) {
    st.clock = clock || null;
    st.clockAt = Date.now();
    tickClock();
  }

  function tickClock() {
    const c = st.clock;
    if (!c) return;
    const elapsed = c.running && !st.ended ? Date.now() - st.clockAt : 0;
    const w = c.turn === 'w' ? c.w - elapsed : c.w;
    const b = c.turn === 'b' ? c.b - elapsed : c.b;
    const ew = document.getElementById('lvClockw'), eb = document.getElementById('lvClockb');
    if (ew) { ew.textContent = fmtClock(w); ew.classList.toggle('running', !st.ended && c.turn === 'w'); }
    if (eb) { eb.textContent = fmtClock(b); eb.classList.toggle('running', !st.ended && c.turn === 'b'); }
  }

  // Tomoshabinlar chati (o'yinchilar ko'rmaydi)
  function renderChat() {
    const list = document.getElementById('lvChatList');
    if (!list) return;
    if (!st.chat.length) {
      list.innerHTML = `<div class="lv-chat-empty">${esc(tx('lvChatEmpty', "Hali xabar yo'q — birinchi bo'lib yozing!"))}</div>`;
      return;
    }
    list.innerHTML = st.chat.map(m => `<div class="lv-chat-msg"><b class="player-link" data-username="${esc(m.username)}">${esc(m.username)}</b> ${esc(m.message)}</div>`).join('');
    list.scrollTop = list.scrollHeight;
  }
  function setWatchers(n) {
    const el = document.getElementById('lvWatchers');
    if (el) el.textContent = n ? ' · 👁 ' + tx('lvWatchers', '{{n}} tomoshabin', { n }) : '';
  }

  function renderMoves() {
    const movesEl = document.getElementById('lvMoves');
    const statusEl = document.getElementById('lvStatus');
    if (!st.chess) return;
    const h = st.chess.history();
    if (typeof window.renderOpeningInto === 'function') window.renderOpeningInto(document.getElementById('lvOpening'), h, st.variant);
    if (movesEl) {
      let html = '';
      for (let i = 0; i < h.length; i += 2) html += `<span class="lv-move"><i>${i / 2 + 1}.</i> ${esc(h[i])} ${esc(h[i + 1] || '')}</span>`;
      movesEl.innerHTML = html || `<span class="lv-move muted">${esc(tx('lvNoMoves', "Hali yurish qilinmadi"))}</span>`;
      movesEl.scrollLeft = movesEl.scrollWidth;
    }
    if (statusEl) {
      if (st.ended) {
        const res = st.ended.winner === 'w' ? '1-0' : (st.ended.winner === 'b' ? '0-1' : '½-½');
        const reasons = {
          checkmate: tx('lvReasonCheckmate', 'mat'), resign: tx('lvReasonResign', 'taslim'), timeout: tx('lvReasonTimeout', 'vaqt tugadi'),
          abandon: tx('lvReasonAbandon', "o'yinni tark etdi"), aborted: tx('lvReasonAborted', 'bekor qilindi'), agreement: tx('lvReasonAgreement', 'kelishuv')
        };
        const reason = reasons[st.ended.reason] || tx('lvReasonDraw', 'durrang');
        statusEl.innerHTML = `<b>🏁 ${esc(tx('lvFinished', "O'yin tugadi"))}: ${res}</b> <span>(${esc(reason)})</span>`;
      } else {
        statusEl.textContent = st.chess.turn() === 'w' ? tx('lvTurnWhite', 'Oqlar yurishi') : tx('lvTurnBlack', 'Qoralar yurishi');
      }
    }
  }

  function stopWatching() {
    document.dispatchEvent(new CustomEvent('live:stop'));
    if (st.watching && typeof socket !== 'undefined') socket.emit('unwatch-game');
    st.watching = null;
    st.ended = null;
    st.clock = null;
    if (st.board && typeof st.board.destroy === 'function') st.board.destroy();
    st.board = null;
    const stage = document.getElementById('lvStage');
    if (stage) stage.innerHTML = placeholder();
    const layout = document.querySelector('.lv-layout');
    if (layout) layout.classList.remove('has-watch');
    renderList();
  }

  const placeholder = () => `<div class="lv-placeholder"><span>📺</span><p>${esc(tx('lvPick', "Tomosha qilish uchun o'yinni tanlang"))}</p></div>`;

  window.renderLiveView = function () {
    const root = document.getElementById('liveRoot');
    if (!root) return;
    if (!root.querySelector('.lv-layout')) {
      root.innerHTML = `
        <div class="lv-layout">
          <aside class="lv-side">
            <div class="lv-head"><h2>📺 ${esc(tx('mLive', "Jonli o'yinlar"))}</h2><span id="lvCount"></span></div>
            <div class="lv-list" id="lvList"></div>
          </aside>
          <section class="lv-stage" id="lvStage">${placeholder()}</section>
        </div>`;
    }
    loadList();
    if (!listTimer) listTimer = setInterval(() => { if (isActiveView()) loadList(); }, 10000);
    if (!clockTimer) clockTimer = setInterval(tickClock, 250);
  };

  // Istalgan joydan: o'yinni tomosha qilish (masalan, turnir juftliklaridan)
  window.watchGame = function (roomId) {
    switchView('live');
    watch(roomId);
  };
  window.stopWatching = function () { if (st.watching) stopWatching(); };
  window.refreshLiveView = function () {
    const root = document.getElementById('liveRoot');
    if (root) root.innerHTML = '';
    if (isActiveView()) { const id = st.watching; window.renderLiveView(); if (id) watch(id); }
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof socket === 'undefined') return;
    socket.on('watch-state', applyState);
    socket.on('watch-move', (data) => {
      if (!data || data.roomId !== st.watching || !st.chess) return;
      const m = st.chess.move({ from: data.move.from, to: data.move.to, promotion: data.move.promotion || 'q' });
      if (m && st.board) st.board.position(st.chess.fen());
      if (m && typeof playSound === 'function') playSound(m.captured ? 'capture' : 'move');
      setClock(data.clock);
      renderMoves();
      if (m) document.dispatchEvent(new CustomEvent('live:move', { detail: { data, san: m.san, ply: st.chess.history().length - 1, chess: st.chess } }));
    });
    socket.on('watch-chat', (data) => {
      if (!data || data.roomId !== st.watching) return;
      st.chat.push(data);
      st.chat = st.chat.slice(-50);
      renderChat();
    });
    socket.on('watch-count', (data) => { if (data && data.roomId === st.watching) setWatchers(data.count); });
    socket.on('watch-ended', (data) => {
      if (!data || data.roomId !== st.watching) return;
      st.ended = { winner: data.winner, reason: data.reason };
      setClock(data.clock);
      renderMoves();
      loadList();
      document.dispatchEvent(new CustomEvent('live:ended', { detail: data }));
    });
    window.addEventListener('resize', () => { if (st.board && typeof st.board.resize === 'function') st.board.resize(); });
  });
})();
