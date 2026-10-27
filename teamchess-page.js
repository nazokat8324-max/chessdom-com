// 🤝 Maslahatli shaxmat (2 ga 2) sahifasi: /jamoa (stollar ro'yxati, yangi stol) va /jamoa?t=KOD (stol: o'rinlar, taxta, soatlar,
// yurishlar, yashirin jamoa chati). Jamoada navbatdagi o'yinchi yuradi; jamoadoshi taxtada sudrasa — yurish emas, maslahat
// (team-suggest) yuboriladi. Server: teamchess.js (team-* hodisalar). tm-* klasslar.
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TCS = [[300, 3], [600, 5], [900, 10]];
  const st = { code: null, state: null, mySeat: null, chat: [], board: null, boardCode: null, receivedAt: 0, tick: null, list: [], movesSeen: 0, hint: null };
  const me = () => (window.currentUser && window.currentUser.username) || '';
  const root = () => document.getElementById('teamRoot');
  const tcLabel = (c) => c.initial / 60 + '+' + c.increment;
  const sideName = (c) => (c === 'w' ? tx('tmWhite', 'Oq') : tx('tmBlack', 'Qora'));
  const seatName = (s) => sideName(s[0]) + ' ' + s[1];
  const seatUser = (seat) => (st.state && st.state.seats.find((x) => x.seat === seat)) || {};
  const teamNames = (c) => [c + '1', c + '2'].map((s) => seatUser(s).username || '—').join(' & ');
  const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const emit = (ev, data) => new Promise((r) => socket.emit(ev, data, r));

  // ---------- Stollar ro'yxati ----------
  async function renderLobby() {
    const el = root();
    if (!el) return;
    el.innerHTML = `<section class="tm-hero">
        <span class="tea-kicker">🤝 ${esc(tx('teaKicker', 'Faqat ChessCaravan da'))}</span>
        <h1>${esc(tx('tmTitle', "2 ga 2 — maslahatli shaxmat"))}</h1>
        <p>${esc(tx('tmLead', "Har tomonda ikki kishi. Jamoangiz yurishlarini navbat bilan qilasiz, jamoadoshingiz yashirin chatda maslahat beradi yoki taxtada yurish taklif qiladi."))}</p>
        <div class="tm-new"><b>${esc(tx('tmNewTable', 'Yangi stol ochish'))}:</b>${TCS.map(([i, inc]) => `<button type="button" class="tm-tc" data-tc="${i},${inc}">⏱️ ${i / 60}+${inc}</button>`).join('')}</div>
      </section>
      <section class="tm-open"><h2>${esc(tx('tmOpenTables', 'Ochiq stollar'))}</h2><div class="tm-list" id="tmList"><p class="tm-muted">…</p></div></section>`;
    el.querySelectorAll('[data-tc]').forEach((b) => b.onclick = async () => {
      if (!window.currentUser) return;
      const [initial, increment] = b.dataset.tc.split(',').map(Number);
      const r = await emit('team-create', { initial, increment });
      if (r && r.ok) window.openTeamChess(r.code);
      else if (r && r.reason === 'busy') showToast(tx('arErrInGame', "Avval joriy o'yiningizni tugating."), 'warning');
    });
    const r = await emit('team-list', {});
    st.list = (r && r.tables) || [];
    const list = document.getElementById('tmList');
    if (!list) return;
    list.innerHTML = st.list.length ? st.list.map((t) => `<div class="tm-row">
        <span class="tm-tag">⏱️ ${esc(tcLabel(t.clock))}</span>
        <span class="tm-players">${esc(t.players.join(', ') || '—')}</span>
        <span class="tm-count">${t.players.length}/4</span>
        <button type="button" class="tm-btn" data-join="${esc(t.code)}">${esc(tx('tmJoin', "Qo'shilish"))}</button></div>`).join('')
      : `<p class="tm-muted">${esc(tx('tmNoTables', "Hozircha ochiq stol yo'q — birinchi bo'lib oching va do'stlaringizni chaqiring!"))}</p>`;
    list.querySelectorAll('[data-join]').forEach((b) => b.onclick = () => window.openTeamChess(b.dataset.join));
  }

  // ---------- Stol ----------
  function shell() {
    const el = root();
    el.innerHTML = `<div class="tm-table">
      <header class="tm-head">
        <button type="button" class="ps-back" data-tm-back>← ${esc(tx('tmTables', 'Stollar'))}</button>
        <div><h1>🤝 ${esc(tx('tmTable', 'Stol {{code}}', { code: st.code }))}</h1><p id="tmTc"></p></div>
        <div class="tm-head-actions">
          <button type="button" class="tm-btn ghost" data-tm-copy>🔗 ${esc(tx('tmCopyLink', 'Havolani nusxalash'))}</button>
          <a class="tm-btn ghost" id="tmTg" target="_blank" rel="noopener">✈️ Telegram</a>
        </div>
      </header>
      <div class="tm-layout">
        <div class="tm-boardcol">
          <div class="tm-side" id="tmTop"></div>
          <div id="teamBoard" class="tm-board"></div>
          <div class="tm-side" id="tmBottom"></div>
        </div>
        <div class="tm-panel">
          <div class="tm-status" id="tmStatus"></div>
          <div class="tm-seats" id="tmSeats"></div>
          <div class="tm-moves" id="tmMoves"></div>
          <div class="tm-chat" id="tmChat" hidden>
            <div class="tm-chat-head">🔒 ${esc(tx('tmTeamChat', 'Jamoa chati — raqiblar ko\'rmaydi'))}</div>
            <div class="tm-chat-list" id="tmChatList"></div>
            <form class="tm-chat-form" id="tmChatForm"><input id="tmChatInput" maxlength="200" autocomplete="off" placeholder="${esc(tx('tmChatPh', 'Jamoadoshingizga maslahat…'))}"><button type="submit">➤</button></form>
          </div>
          <div class="tm-actions" id="tmActions"></div>
        </div>
      </div>
    </div>`;
    const link = location.origin + '/jamoa?t=' + st.code;
    el.querySelector('[data-tm-back]').onclick = () => window.openTeamChess(null);
    el.querySelector('[data-tm-copy]').onclick = () => {
      (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => showToast(tx('tmCopied', 'Havola nusxalandi — do\'stlaringizga yuboring'), 'success', 2500), () => {});
    };
    el.querySelector('#tmTg').href = 'https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(tx('tmInviteText', "🤝 ChessCaravan'da 2 ga 2 shaxmat o'ynaymiz — stolga qo'shiling!"));
    el.querySelector('#tmChatForm').onsubmit = async (e) => {
      e.preventDefault();
      const inp = document.getElementById('tmChatInput');
      const message = inp.value.trim();
      if (!message) return;
      inp.value = '';
      await emit('team-chat', { code: st.code, message });
    };
    st.board = Chessboard('teamBoard', {
      position: 'start', draggable: true,
      pieceTheme: (p) => (window.pieceUrl ? window.pieceUrl(p) : 'img/chesspieces/karvon/' + p + '.svg'),
      onDragStart: (source, piece) => {
        const s = st.state;
        if (!s || s.status !== 'active' || !st.mySeat) return false;
        const c = st.mySeat[0];
        return piece[0] === c && s.turn === c;
      },
      onDrop: (from, to) => {
        if (from === to) return 'snapback';
        const s = st.state;
        let mv = null;
        try { mv = new Chess(s.fen).move({ from, to, promotion: 'q' }); } catch (e) { mv = null; }
        if (!mv) return 'snapback';
        const moverOnline = seatUser(s.mover).online;
        if (st.mySeat === s.mover || !moverOnline) {
          emit('team-move', { code: st.code, from, to, promotion: 'q' }).then((r) => { if (!r || !r.ok) st.board.position(s.fen, false); });
          return undefined;
        }
        // Jamoadosh: yurish emas — maslahat
        emit('team-suggest', { code: st.code, from, to });
        return 'snapback';
      }
    });
    st.boardCode = st.code;
    st.movesSeen = 0;
  }

  function mark(cls, squares) {
    document.querySelectorAll('#teamBoard .' + cls).forEach((x) => x.classList.remove(cls));
    (squares || []).forEach((sq) => { const e = document.querySelector('#teamBoard [data-square="' + sq + '"]'); if (e) e.classList.add(cls); });
  }

  function sideHtml(c) {
    const s = st.state;
    const players = [c + '1', c + '2'].map((seat) => {
      const u = seatUser(seat);
      const isMover = s.status === 'active' && s.mover === seat;
      return `<span class="tm-pl${isMover ? ' mover' : ''}${u.online === false && u.username ? ' off' : ''}">${isMover ? '▶ ' : ''}${u.username ? `<b class="player-link" data-username="${esc(u.username)}">${esc(u.username)}</b>` : esc(tx('tmEmpty', "bo'sh"))}</span>`;
    }).join('');
    return `<span class="tm-team">${typeof window.kingIcon === 'function' ? window.kingIcon(c) : ''}${players}</span><span class="tm-clock${s.turn === c && s.status === 'active' ? ' on' : ''}" data-clock="${c}"></span>`;
  }

  function render() {
    const s = st.state;
    if (!s || !root()) return;
    if (st.boardCode !== st.code || !document.getElementById('teamBoard')) shell();
    const my = st.mySeat ? st.mySeat[0] : null;
    const orient = my === 'b' ? 'black' : 'white';
    if (st.board.orientation() !== orient) st.board.orientation(orient);
    if (s.fen) st.board.position(s.fen, false); else st.board.position('start', false);
    mark('tm-last', s.lastMove);
    if (s.moves.length > st.movesSeen && st.movesSeen > 0 && typeof playSound === 'function') playSound('move');
    if (s.moves.length !== st.movesSeen) { st.hint = null; mark('tm-hint', null); }
    st.movesSeen = s.moves.length;
    document.getElementById('tmTc').textContent = '⏱️ ' + tcLabel(s.clock) + ' · ' + tx('tmCasual', 'reytingsiz');
    const top = orient === 'white' ? 'b' : 'w';
    document.getElementById('tmTop').innerHTML = sideHtml(top);
    document.getElementById('tmBottom').innerHTML = sideHtml(other(top));
    // Holat
    let status;
    if (s.status === 'waiting') status = tx('tmWaiting', "O'yinchilar kutilmoqda: {{n}}/4. Havolani do'stlaringizga yuboring.", { n: s.seats.filter((x) => x.username).length });
    else if (s.status === 'active') {
      const mover = seatUser(s.mover).username || '';
      if (st.mySeat === s.mover) status = '👉 ' + tx('tmYourMove', 'Sizning navbatingiz!');
      else if (my === s.turn) status = tx('tmMateMove', '{{name}} yuradi — taxtada yurish taklif qiling yoki chatda maslahat bering', { name: mover });
      else status = tx('tmTurn', 'Navbat: {{name}} ({{side}})', { name: mover, side: sideName(s.turn).toLowerCase() });
    } else {
      const r = s.result || {};
      const reason = { checkmate: tx('lvReasonCheckmate', 'mat'), resign: tx('lvReasonResign', 'taslim'), timeout: tx('lvReasonTimeout', 'vaqt tugadi'), abandon: tx('lvReasonAbandon', "o'yinni tark etdi"),
        stalemate: tx('ghStalemate', 'pat'), threefold: tx('ghRepetition', 'takrorlanish'), fifty: tx('ghFifty', '50 yurish'), insufficient: tx('ghInsufficient', 'dona yetishmaydi'), aborted: tx('lvReasonAborted', 'bekor qilindi') }[r.reason] || '';
      status = r.reason === 'aborted' ? '⏹ ' + tx('tmAborted', "O'yin bekor qilindi — birinchi yurish qilinmadi")
        : r.winner ? '🏆 ' + tx('tmWon', "{{team}} jamoasi g'alaba qozondi ({{reason}})", { team: teamNames(r.winner), reason }) : '🤝 ' + tx('tmDraw', 'Durrang ({{reason}})', { reason });
    }
    const stEl = document.getElementById('tmStatus');
    stEl.textContent = status;
    stEl.classList.toggle('mine', s.status === 'active' && st.mySeat === s.mover);
    // O'rinlar (kutilayotganda)
    const seatsEl = document.getElementById('tmSeats');
    seatsEl.hidden = s.status !== 'waiting';
    if (s.status === 'waiting') {
      seatsEl.innerHTML = s.seats.map((x) => `<div class="tm-seat ${x.seat[0]}${x.username === me() ? ' mine' : ''}">
        <small>${esc(seatName(x.seat))}</small>
        <b>${x.username ? esc(x.username) : '—'}</b>
        ${!x.username ? `<button type="button" class="tm-btn" data-sit="${x.seat}">${esc(tx('tmSit', "O'tirish"))}</button>` : x.username === me() ? `<button type="button" class="tm-btn ghost" data-stand>${esc(tx('teaStand', 'Turish'))}</button>` : ''}
      </div>`).join('');
      seatsEl.querySelectorAll('[data-sit]').forEach((b) => b.onclick = async () => {
        const r = await emit('team-sit', { code: st.code, seat: b.dataset.sit });
        if (r && r.ok) { st.mySeat = r.seat; st.chat = r.chat || []; renderChat(); }
        else showToast(r && r.reason === 'busy' ? tx('arErrInGame', "Avval joriy o'yiningizni tugating.") : tx('tmSeatTaken', "Bu o'rin band"), 'warning');
      });
      const stand = seatsEl.querySelector('[data-stand]');
      if (stand) stand.onclick = async () => { await emit('team-stand', { code: st.code }); st.mySeat = null; render(); };
    }
    // Yurishlar
    let mv = '';
    for (let i = 0; i < s.moves.length; i += 2) mv += `<span><i>${i / 2 + 1}.</i> ${esc(s.moves[i])} ${esc(s.moves[i + 1] || '')}</span>`;
    document.getElementById('tmMoves').innerHTML = mv || `<span class="tm-muted">${esc(tx('lvNoMoves', "Yurishlar hali yo'q"))}</span>`;
    document.getElementById('tmChat').hidden = !st.mySeat;
    const acts = document.getElementById('tmActions');
    acts.innerHTML = s.status === 'active' && st.mySeat ? `<button type="button" class="tm-btn danger" data-resign>🏳️ ${esc(tx('tmResign', 'Jamoa nomidan taslim'))}</button>`
      : s.status === 'over' ? `<button type="button" class="tm-btn" data-new>🤝 ${esc(tx('tmNewGame', 'Yangi stol'))}</button>` : '';
    const rs = acts.querySelector('[data-resign]');
    if (rs) rs.onclick = () => { if (confirm(tx('tmResignConfirm', 'Jamoangiz nomidan taslim bo\'lasizmi?'))) emit('team-resign', { code: st.code }); };
    const nw = acts.querySelector('[data-new]');
    if (nw) nw.onclick = () => window.openTeamChess(null);
    tickClocks();
  }
  const other = (c) => (c === 'w' ? 'b' : 'w');

  function tickClocks() {
    const s = st.state;
    if (!s) return;
    const c = s.clockState || { w: 0, b: 0 };
    const run = c.running ? Date.now() - st.receivedAt : 0;
    document.querySelectorAll('#teamRoot [data-clock]').forEach((el) => {
      const side = el.dataset.clock;
      el.textContent = fmt(side === c.turn ? c[side] - run : c[side]);
    });
  }

  function renderChat() {
    const list = document.getElementById('tmChatList');
    if (!list) return;
    list.innerHTML = st.chat.map((m) => `<div class="tm-msg${m.from === me() ? ' me' : ''}"><b>${esc(m.from)}</b> ${esc(m.message)}</div>`).join('') || `<p class="tm-muted">${esc(tx('tmChatEmpty', "Bu yerda faqat jamoadoshingiz ko'radi"))}</p>`;
    list.scrollTop = list.scrollHeight;
  }

  async function watch(code) {
    const r = await emit('team-watch', { code });
    if (!r || !r.ok) {
      showToast(tx('tmNotFound', 'Stol topilmadi yoki yopilgan'), 'warning');
      window.openTeamChess(null);
      return;
    }
    st.state = r.state; st.receivedAt = Date.now(); st.mySeat = r.mySeat; st.chat = r.chat || [];
    render();
    renderChat();
  }

  // switchView('team') chaqiradi
  window.updateTeamView = function () {
    const fromUrl = location.pathname === '/jamoa' ? new URLSearchParams(location.search).get('t') : null;
    const code = st.pendingCode !== undefined ? st.pendingCode : (fromUrl || null);
    st.pendingCode = undefined;
    if (st.code && st.code !== code) socket.emit('team-unwatch', { code: st.code });
    st.code = code ? String(code).toUpperCase() : null;
    st.state = null; st.boardCode = null;
    clearInterval(st.tick);
    if (!st.code) renderLobby();
    else { watch(st.code); st.tick = setInterval(tickClocks, 250); }
    const url = '/jamoa' + (st.code ? '?t=' + st.code : '');
    setTimeout(() => { if (location.pathname === '/jamoa' && location.pathname + location.search !== url) history.replaceState({ view: 'team' }, '', url); }, 0);
  };
  window.openTeamChess = function (code) {
    st.pendingCode = code || null;
    if (typeof window.closeProfileModal === 'function') window.closeProfileModal();
    window.switchView('team');
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof socket === 'undefined') return;
    socket.on('team-state', (s) => {
      if (!s || s.code !== st.code) return;
      const wasActive = st.state && st.state.status === 'active';
      st.state = s; st.receivedAt = Date.now();
      if (st.mySeat && !s.seats.some((x) => x.seat === st.mySeat && x.username === me())) st.mySeat = (s.seats.find((x) => x.username === me()) || {}).seat || null;
      render();
      if (s.status === 'active' && !wasActive && st.mySeat) showToast('🤝 ' + tx('tmStarted', "O'yin boshlandi! Siz — {{seat}}", { seat: seatName(st.mySeat) }), 'success', 3500);
      if (s.status === 'over' && wasActive && typeof playSound === 'function') playSound('gameEnd');
    });
    socket.on('team-chat', (m) => {
      if (!m || m.code !== st.code) return;
      st.chat.push(m);
      if (st.chat.length > 50) st.chat.shift();
      renderChat();
      if (m.from !== me() && typeof playSound === 'function') playSound('move');
    });
    socket.on('team-suggest', (m) => {
      if (!m || m.code !== st.code) return;
      mark('tm-hint', [m.from, m.to]);
      showToast('💡 ' + (m.by === me() ? tx('tmSuggestSent', 'Maslahat yuborildi: {{san}}', { san: m.san }) : tx('tmSuggest', '{{name}} maslahati: {{san}}', { name: m.by, san: m.san })), 'info', 4000);
    });
    socket.on('team-closed', (m) => { if (m && m.code === st.code) { showToast(tx('tmNotFound', 'Stol topilmadi yoki yopilgan'), 'info'); window.openTeamChess(null); } });
    window.addEventListener('resize', () => { if (st.board && document.getElementById('teamBoard')) st.board.resize(); });
  });

  // Boshqa bo'limga o'tilsa — stolni kuzatish to'xtaydi
  const origSwitch = window.switchView;
  if (typeof origSwitch === 'function') {
    window.switchView = function (view) {
      if (view !== 'team' && st.code) { socket.emit('team-unwatch', { code: st.code }); st.code = null; clearInterval(st.tick); }
      return origSwitch.apply(this, arguments);
    };
  }
})();
