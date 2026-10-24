// 📜 O'yinlar tarixi (/tarix?u=ism): filtrlar (rejim, natija, rang, raqib), sahifalash, ▶ qayta ko'rish, ⬇ PGN (filtrlangan hammasi)
// va 📥 PGN yuklash (matn yoki fayl → qayta ko'rish oynasi, tahlil bilan). Server: GET /api/users/:u/history, GET /api/users/:u/pgn.
(function () {
  const st = { user: null, mode: 'all', result: 'all', color: 'all', q: '', page: 1, data: null, loading: false };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const root = () => document.getElementById('historyRoot');
  const modeIcon = (m) => ({ bullet: '🔥', blitz: '⚡', rapid: '⏱️', chess960: '🎲', shatranj: '🏺' }[m] || '♟');
  const query = () => new URLSearchParams({ mode: st.mode, result: st.result, color: st.color, q: st.q }).toString();

  async function load() {
    if (!st.user) return;
    st.loading = true;
    render();
    const d = await fetch('/api/users/' + encodeURIComponent(st.user) + '/history?' + query() + '&page=' + st.page).then(r => r.json()).catch(() => null);
    st.loading = false;
    st.data = d && d.success ? d : { total: 0, page: 1, pages: 1, summary: { win: 0, draw: 0, loss: 0 }, games: [], error: true };
    render();
  }

  function chips(name, options, current) {
    return `<div class="gh-chips">${options.map(([v, l]) => `<button class="lb-chip${current === v ? ' active' : ''}" data-f="${name}" data-v="${v}">${l}</button>`).join('')}</div>`;
  }

  function render() {
    const el = root();
    if (!el) return;
    const d = st.data;
    const reasons = { checkmate: tx('lvReasonCheckmate', 'mat'), resign: tx('lvReasonResign', 'taslim'), timeout: tx('lvReasonTimeout', 'vaqt tugadi'), abandon: tx('lvReasonAbandon', "o'yinni tark etdi"),
      agreement: tx('lvReasonAgreement', 'kelishuv'), bare: tx('reasonBare', "yalang'och shoh"), stalemate: tx('ghStalemate', 'pat'), threefold: tx('ghRepetition', 'takrorlanish'), fifty: tx('ghFifty', '50 yurish'), insufficient: tx('ghInsufficient', 'dona yetishmaydi') };
    const resultLabel = { win: tx('profWinsLabel', "G'alaba"), draw: tx('profDrawsLabel', 'Durrang'), loss: tx('profLossesLabel', "Mag'lubiyat") };
    const rows = d && d.games.length ? d.games.map(g => `
      <div class="gh-row">
        <span class="gh-date">${esc(g.date ? new Date(g.date).toLocaleDateString() : '—')}</span>
        <span class="gh-res ${esc(g.result)}">${esc(resultLabel[g.result] || g.result)}</span>
        <span class="gh-opp"><i class="gh-color ${g.color === 'b' ? 'b' : 'w'}" title="${esc(g.color === 'b' ? tx('blackText', 'Qora') : tx('whiteText', 'Oq'))}"></i><b class="player-link" data-username="${esc(g.opponent || '')}">${esc(g.opponent || '—')}</b></span>
        <span class="gh-mode">${modeIcon(g.variant && g.variant !== 'standard' ? g.variant : g.timeControl)} ${esc(g.clock || g.timeControl || '')}</span>
        <span class="gh-reason">${esc(reasons[g.reason] || '')}</span>
        <span class="gh-moves">${g.moves ? esc(tx('ghMovesN', '{{n}} yurish', { n: g.moves })) : ''}</span>
        <span class="gh-act">${g.hasMoves && g.id ? `<button class="set-mini" data-replay="${esc(g.id)}" title="${esc(tx('ghReplay', "Qayta ko'rish"))}">▶</button>` : ''}</span>
      </div>`).join('') : `<div class="gh-empty">${esc(st.loading ? tx('loadingText', 'Yuklanmoqda...') : tx('ghEmpty', "Bu filtr bo'yicha o'yin topilmadi"))}</div>`;
    const sum = d ? d.summary : { win: 0, draw: 0, loss: 0 };
    el.innerHTML = `
      <header class="set-head gh-head">
        <button type="button" class="ps-back" data-gh-back>← ${esc(tx('clubDetailBack', 'Orqaga'))}</button>
        <div><h1>📜 ${esc(tx('ghTitle', "O'yinlar tarixi"))}</h1><p><b class="player-link" data-username="${esc(st.user || '')}">${esc(st.user || '')}</b>${d ? ' · ' + esc(tx('ghTotal', "{{n}} ta o'yin", { n: d.total })) : ''}</p></div>
        <div class="gh-actions">
          ${d && d.total ? `<a class="set-mini accent" href="/api/users/${encodeURIComponent(st.user)}/pgn?${query()}" download>⬇ PGN (${d.total})</a>` : ''}
          <button class="set-mini" data-import="1">📥 ${esc(tx('ghImport', 'PGN yuklash'))}</button>
        </div>
      </header>
      <div class="gh-filters">
        ${chips('mode', [['all', '🏆 ' + tx('lbModeAll', 'Umumiy')], ['rapid', '⏱️ Rapid'], ['blitz', '⚡ Blitz'], ['bullet', '🔥 Bullet'], ['chess960', '🎲 Chess960'], ['shatranj', '🏺 Shatranj']], st.mode)}
        ${chips('result', [['all', tx('ghAllResults', 'Barchasi')], ['win', resultLabel.win], ['draw', resultLabel.draw], ['loss', resultLabel.loss]], st.result)}
        ${chips('color', [['all', window.kingIcon('w') + window.kingIcon('b')], ['w', window.kingIcon('w') + ' ' + tx('whiteText', 'Oq')], ['b', window.kingIcon('b') + ' ' + tx('blackText', 'Qora')]], st.color)}
        <form class="lb-search gh-search" id="ghSearch"><span>🔍</span><input id="ghQuery" type="search" placeholder="${esc(tx('ghOpponent', 'Raqib nomi'))}" value="${esc(st.q)}" autocomplete="off"></form>
      </div>
      <div class="gh-summary"><span class="w">${esc(resultLabel.win)} <b>${sum.win || 0}</b></span><span class="d">${esc(resultLabel.draw)} <b>${sum.draw || 0}</b></span><span class="l">${esc(resultLabel.loss)} <b>${sum.loss || 0}</b></span></div>
      <div class="gh-list">${rows}</div>
      ${d && d.pages > 1 ? `<div class="gh-pager"><button class="set-mini" data-page="${d.page - 1}" ${d.page <= 1 ? 'disabled' : ''}>←</button><span>${d.page} / ${d.pages}</span><button class="set-mini" data-page="${d.page + 1}" ${d.page >= d.pages ? 'disabled' : ''}>→</button></div>` : ''}`;
    bind(el);
  }

  function bind(el) {
    el.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { st[b.dataset.f] = b.dataset.v; st.page = 1; load(); }));
    el.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => { st.page = Number(b.dataset.page); load(); }));
    el.querySelectorAll('[data-replay]').forEach(b => b.addEventListener('click', () => window.openReplay && window.openReplay(st.user, b.dataset.replay)));
    const back = el.querySelector('[data-gh-back]');
    if (back) back.addEventListener('click', () => { if (typeof window.backToProfile === 'function') window.backToProfile(st.user); });
    const imp = el.querySelector('[data-import]');
    if (imp) imp.addEventListener('click', () => window.openPgnImport());
    const form = el.querySelector('#ghSearch');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); st.q = el.querySelector('#ghQuery').value.trim(); st.page = 1; load(); });
  }

  // switchView('history') chaqiradi
  window.updateGameHistoryView = function () {
    const fromUrl = window.location.pathname === '/tarix' ? new URLSearchParams(window.location.search).get('u') : null;
    const user = fromUrl || st.pendingUser || st.user || (window.currentUser && window.currentUser.username);
    st.pendingUser = null;
    if (user !== st.user) { st.user = user; st.mode = 'all'; st.result = 'all'; st.color = 'all'; st.q = ''; st.page = 1; st.data = null; }
    load();
    // Manzilda kimning tarixi ekani saqlanadi (router /tarix ga qaytarib qo'yadi)
    setTimeout(() => {
      if (window.location.pathname === '/tarix' && user && !window.location.search.includes('u=')) history.replaceState({ view: 'history' }, '', '/tarix?u=' + encodeURIComponent(user));
    }, 0);
  };
  window.openGameHistory = function (username) {
    st.pendingUser = username || (window.currentUser && window.currentUser.username);
    if (typeof window.rememberProfileReturn === 'function') window.rememberProfileReturn();
    if (typeof window.closeProfileModal === 'function') window.closeProfileModal();
    switchView('history');
  };
  window.refreshGameHistoryView = function () { const v = document.getElementById('historyView'); if (v && v.classList.contains('active-view')) render(); };

  // --- 📥 PGN yuklash: matn yoki .pgn fayl ---
  function parsePgn(text) {
    const headers = {};
    String(text).replace(/\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]/g, (m, k, v) => { headers[k] = v; return ''; });
    let body = String(text).replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
    let prev;
    do { prev = body; body = body.replace(/\([^()]*\)/g, ' '); } while (body !== prev);
    const tokens = body.replace(/\$\d+/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').split(/\s+/)
      .filter(t => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t)).map(t => t.replace(/[!?]+$/, ''));
    return { headers, tokens };
  }

  window.openPgnImport = function () {
    const old = document.getElementById('pgnImportModal');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'pgnImportModal';
    el.className = 'ch-overlay';
    el.innerHTML = `
      <div class="ch-card pgn-card">
        <button class="ch-x" data-close="1">✕</button>
        <div class="ch-icon">📥</div>
        <h3>${esc(tx('ghImportTitle', 'PGN yuklash'))}</h3>
        <p class="ch-sub">${esc(tx('ghImportHint', "PGN matnini qo'ying yoki .pgn faylni tanlang — o'yin taxtada ochiladi, uni tahlil ham qilish mumkin."))}</p>
        <textarea class="form-input" id="pgnText" rows="8" placeholder='[White "..."]&#10;1. e4 e5 2. Nf3 Nc6 ...'></textarea>
        <label class="set-mini pgn-file">📄 ${esc(tx('ghChooseFile', 'Faylni tanlash'))}<input type="file" id="pgnFile" accept=".pgn,.txt,text/plain" hidden></label>
        <button class="ch-primary" data-open="1">▶ ${esc(tx('ghOpenGame', "O'yinni ochish"))}</button>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) el.remove(); });
    el.querySelector('#pgnFile').addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) el.querySelector('#pgnText').value = (await f.text()).slice(0, 200000);
    });
    el.querySelector('[data-open]').addEventListener('click', () => {
      const text = el.querySelector('#pgnText').value;
      // Faylda bir nechta o'yin bo'lsa — birinchisi
      const first = text.split(/\n\s*\n(?=\s*\[Event )/)[0] || text;
      const { headers, tokens } = parsePgn(first);
      const variant = /960|fischer/i.test(headers.Variant || '') ? 'chess960' : /shatranj/i.test(headers.Variant || '') ? 'shatranj' : 'standard';
      const startFen = headers.FEN || null;
      let chess;
      try { chess = window.newChessFor(variant, variant === 'shatranj' ? null : startFen); }
      catch (err) { chess = null; }
      if (!chess || (startFen && variant === 'standard' && chess.fen().split(' ')[0] !== startFen.split(' ')[0])) { showToast(tx('ghBadPgn', "PGN ni o'qib bo'lmadi"), 'warning'); return; }
      const sans = [];
      for (const t of tokens) { const m = chess.move(t); if (!m) break; sans.push(m.san); }
      if (!sans.length) { showToast(tx('ghBadPgn', "PGN ni o'qib bo'lmadi"), 'warning'); return; }
      if (sans.length < tokens.length) showToast(tx('ghPartialPgn', "PGN ning bir qismi o'qildi: {{n}} yurish", { n: sans.length }), 'info');
      const res = headers.Result || '*';
      el.remove();
      window.showReplayGame({
        id: null, player: headers.White || '?', opponent: headers.Black || '?', color: 'w',
        result: res === '1-0' ? 'win' : (res === '0-1' ? 'loss' : (res === '1/2-1/2' ? 'draw' : null)),
        clock: headers.TimeControl || null, date: headers.Date ? headers.Date.replace(/\./g, '-') : null,
        moves: sans, variant, startFen, imported: true
      });
    });
  };
})();
