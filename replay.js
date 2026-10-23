// O'yinni qayta ko'rish: profildagi "Oxirgi o'yinlar" qatori bosilsa ochiladi.
// Server: GET /api/users/:username/games/:gameId/replay (yurishlar SAN ko'rinishida, o'yinchining rangi, natija).
// Ustoz izohlari (mentor.js) uchun: #rpNotes joyi, document hodisalari replay:open / replay:ply / replay:close, window.replayGo(ply).
(function () {
  const st = { game: null, sans: [], moves: [], fens: [], ply: 0, board: null, analysis: null, anToken: 0 };

  const esc = (v) => {
    const div = document.createElement('div');
    div.textContent = (v === null || v === undefined) ? '' : String(v);
    return div.innerHTML;
  };

  function close() {
    st.anToken++;
    st.analysis = null;
    const el = document.getElementById('replayModal');
    if (el) el.remove();
    if (st.board && typeof st.board.destroy === 'function') st.board.destroy();
    st.board = null;
    document.removeEventListener('keydown', onKey);
    document.dispatchEvent(new CustomEvent('replay:close'));
  }

  function onKey(e) {
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') { go(st.ply - 1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { go(st.ply + 1); e.preventDefault(); }
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(st.fens.length - 1);
    else if (e.key === 'Escape') close();
  }

  function go(ply) {
    st.ply = Math.max(0, Math.min(st.fens.length - 1, ply));
    if (st.board) st.board.position(st.fens[st.ply]);
    document.querySelectorAll('#replayModal [data-ply]').forEach(b => b.classList.toggle('active', Number(b.dataset.ply) === st.ply));
    const counter = document.getElementById('replayCounter');
    if (counter) counter.textContent = `${st.ply} / ${st.fens.length - 1}`;
    const active = document.querySelector('#replayModal [data-ply].active');
    if (active) active.scrollIntoView({ block: 'nearest' });
    if (st.analysis) showEval();
    document.dispatchEvent(new CustomEvent('replay:ply', { detail: { ply: st.ply } }));
  }
  window.replayGo = (ply) => go(ply);

  // --- Tahlil (analysis.js dagi umumiy dvigatel bilan) ---
  const anButton = () => `<button class="rp-pgn rp-an-btn" data-analyze="1">🔍 ${esc(tx('anStart', "O'yinni tahlil qilish"))}</button>`;
  const anProgress = (done, total) => `
    <div class="an-progress-text">🔍 ${esc(tx('anRunning', 'Tahlil qilinmoqda… {{done}}/{{total}}', { done, total }))}</div>
    <div class="an-progress"><span style="width:${total ? Math.round(done / total * 100) : 0}%"></span></div>`;
  function anSummary(r) {
    const side = (c) => `
      <div class="an-side">
        <div class="an-side-head">${c === 'w' ? '♔' : '♚'} <b>${r.accuracy[c]}%</b><small>${esc(tx('anAccuracy', 'Aniqlik'))}</small></div>
        <div class="an-counts"><span class="an-inaccuracy">?! ${r.counts[c].inaccuracy}</span><span class="an-mistake">? ${r.counts[c].mistake}</span><span class="an-blunder">?? ${r.counts[c].blunder}</span></div>
      </div>`;
    return `<div class="an-summary">${side('w')}${side('b')}</div><div class="an-ply" id="rpPlyInfo"></div>`;
  }

  async function analyze() {
    const box = document.getElementById('rpAnalysis');
    if (!box || typeof window.analyzeLine !== 'function') return;
    const token = ++st.anToken;
    box.innerHTML = anProgress(0, st.moves.length + 1);
    let r;
    try {
      r = await window.analyzeLine(st.moves, st.game.variant, st.game.startFen,
        (done, total) => { if (token === st.anToken) box.innerHTML = anProgress(done, total); },
        () => token !== st.anToken);
    } catch (err) {
      if (token !== st.anToken) return;
      box.innerHTML = anButton();
      if (typeof window.analysisFailed === 'function') window.analysisFailed(err);
      return;
    }
    if (!r || token !== st.anToken || !document.getElementById('replayModal')) return;
    st.analysis = r;
    document.querySelectorAll('#replayModal [data-ply]').forEach(b => {
      const m = r.moves[Number(b.dataset.ply) - 1];
      if (m && m.cls) b.insertAdjacentHTML('beforeend', window.analysisUtils.badge(m.cls));
    });
    box.innerHTML = anSummary(r);
    const card = document.querySelector('#replayModal .rp-card');
    if (card) card.classList.add('analysed');
    go(st.ply);
  }

  function showEval() {
    const r = st.analysis, u = window.analysisUtils;
    const bar = document.getElementById('rpEvalBar');
    if (!r || !u || !bar) return;
    const e = r.evals[Math.max(0, Math.min(r.evals.length - 1, st.ply))];
    const white = u.winPct(e);
    bar.classList.toggle('flipped', st.game.color === 'b');
    bar.querySelector('.an-fill').style.height = white.toFixed(1) + '%';
    const label = bar.querySelector('.an-label');
    label.textContent = e.terminal ? u.resultText(e) : u.evalText(e);
    label.classList.toggle('dark', white < 50);
    const info = document.getElementById('rpPlyInfo');
    const m = st.ply > 0 ? r.moves[st.ply - 1] : null;
    if (!info) return;
    if (!m) { info.innerHTML = `<span class="an-muted">${esc(tx('anPickMove', "Yurishni tanlang — baho va eng yaxshi yurish shu yerda ko'rinadi"))}</span>`; return; }
    const clsName = m.cls ? { inaccuracy: tx('anInaccuracy', 'Noaniqlik'), mistake: tx('anMistake', 'Xato'), blunder: tx('anBlunder', "Qo'pol xato") }[m.cls] : tx('anGood', 'Yaxshi yurish');
    info.innerHTML = `<b>${Math.ceil(st.ply / 2)}${m.color === 'w' ? '.' : '...'} ${esc(m.san)}</b> <span class="an-tag ${m.cls ? 'an-' + m.cls : 'an-good'}">${esc(clsName)}</span>` +
      (m.bestSan ? ` <span class="an-muted">· ${esc(tx('anBest', 'Eng yaxshisi'))}: <b>${esc(m.bestSan)}</b></span>` : '') +
      ` <span class="an-eval">${esc(u.evalText(r.evals[st.ply]))}</span>`;
  }

  function pgn() {
    const g = st.game;
    const white = g.color === 'b' ? g.opponent : g.player;
    const black = g.color === 'b' ? g.player : g.opponent;
    const result = g.result === 'draw' ? '1/2-1/2' : ((g.result === 'win') === (g.color !== 'b') ? '1-0' : '0-1');
    const d = g.date ? new Date(g.date) : new Date();
    const head = [
      `[Event "ChessCaravan"]`, `[Site "chessdom-com.onrender.com"]`, `[Date "${d.toISOString().slice(0, 10).replace(/-/g, '.')}"]`,
      `[White "${white || '?'}"]`, `[Black "${black || '?'}"]`, `[Result "${g.color ? result : '*'}"]`
    ].concat(g.clock ? [`[TimeControl "${g.clock}"]`] : [])
      .concat(g.variant === 'chess960' && g.startFen ? ['[Variant "Chess960"]', '[SetUp "1"]', `[FEN "${g.startFen}"]`] : []);
    let body = '';
    st.sans.forEach((s, i) => { body += (i % 2 === 0 ? (i / 2 + 1) + '. ' : '') + s + ' '; });
    return head.join('\n') + '\n\n' + body + (g.color ? result : '*');
  }

  window.openReplay = async function (username, gameId) {
    if (!username || !gameId) return;
    let d;
    try { d = await fetch('/api/users/' + encodeURIComponent(username) + '/games/' + encodeURIComponent(gameId) + '/replay').then(r => r.json()); }
    catch (e) { d = null; }
    if (!d || !d.success) { showToast(tServer(d && d.message) || tx('errLoadFailed', 'Yuklashda xatolik yuz berdi'), 'warning'); return; }
    showReplay(d.game);
  };

  // O'yin obyekti: {player, opponent, color, result, moves (SAN), variant, startFen, clock, date}
  function showReplay(g) {
    // Yurishlar (SAN) bo'yicha har bir pozitsiya
    const chess = g.variant === 'chess960' && window.Chess960 && g.startFen ? new Chess960(g.startFen) : (g.startFen ? new Chess(g.startFen) : new Chess());
    st.fens = [chess.fen()];
    st.sans = [];
    st.moves = [];
    st.analysis = null;
    for (const san of g.moves) {
      const m = chess.move(san);
      if (!m) break;
      st.sans.push(m.san);
      st.moves.push({ from: m.from, to: m.to, promotion: m.promotion, color: m.color, san: m.san });
      st.fens.push(chess.fen());
    }
    st.game = g;
    close();
    const white = g.color === 'b' ? g.opponent : g.player;
    const black = g.color === 'b' ? g.player : g.opponent;
    const resultText = { win: tx('profWinsLabel', "G'alaba"), loss: tx('profLossesLabel', "Mag'lubiyat"), draw: tx('profDrawsLabel', 'Durrang') }[g.result] || '';
    const d0 = g.date ? new Date(g.date) : null;
    let moves = '';
    for (let i = 0; i < st.sans.length; i += 2) {
      moves += `<div class="rp-row"><i>${i / 2 + 1}.</i><button data-ply="${i + 1}">${esc(st.sans[i])}</button>${st.sans[i + 1] ? `<button data-ply="${i + 2}">${esc(st.sans[i + 1])}</button>` : '<span></span>'}</div>`;
    }
    const el = document.createElement('div');
    el.id = 'replayModal';
    el.className = 'rp-overlay';
    el.innerHTML = `
      <div class="rp-card">
        <button class="rp-x" data-close="1">✕</button>
        <div class="rp-board-col">
          <div class="rp-player">♚ ${g.color ? `<b class="player-link" data-username="${esc(black)}">${esc(black)}</b>` : '<b>—</b>'}</div>
          <div class="rp-board-wrap"><div id="replayBoard"></div><div class="pg-evalbar rp-evalbar" id="rpEvalBar"><div class="an-fill"></div><span class="an-label"></span></div></div>
          <div class="rp-player">♔ ${g.color ? `<b class="player-link" data-username="${esc(white)}">${esc(white)}</b>` : '<b>—</b>'}</div>
          <div class="rp-controls">
            <button data-nav="first" title="Home">⏮</button><button data-nav="prev" title="←">◀</button>
            <span id="replayCounter"></span>
            <button data-nav="next" title="→">▶</button><button data-nav="last" title="End">⏭</button>
          </div>
        </div>
        <div class="rp-side">
          <h3>${esc(g.player)} <small>vs</small> ${esc(g.opponent || '—')}</h3>
          <p class="rp-meta"><span class="profile-game-result ${esc(g.result)}">${esc(resultText)}</span> ${esc(g.clock || g.timeControl || '')} · ${esc(d0 && !isNaN(d0) ? d0.toLocaleString() : '')}</p>
          <p class="rp-opening" id="rpOpening" hidden></p>
          ${st.moves.length >= 2 ? `<div class="rp-analysis" id="rpAnalysis">${anButton()}</div>` : ''}
          <div class="rp-moves">${moves || `<p class="rp-meta">${esc(tx('lvNoMoves', 'Hali yurish qilinmadi'))}</p>`}</div>
          <div class="rp-notes" id="rpNotes" hidden></div>
          <button class="rp-pgn" data-pgn="1">📄 ${esc(tx('rpDownloadPgn', 'PGN yuklab olish'))}</button>
          ${st.sans.length && typeof window.openGameShare === 'function' ? `<button class="rp-pgn" data-share-game="1">📤 ${esc(tx('shTitle', "O'yinni ulashish"))}</button>` : ''}
        </div>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      if (e.target === el || e.target.closest('[data-close]')) return close();
      const nav = e.target.closest('[data-nav]');
      if (nav) return go({ first: 0, prev: st.ply - 1, next: st.ply + 1, last: st.fens.length - 1 }[nav.dataset.nav]);
      const ply = e.target.closest('[data-ply]');
      if (ply) return go(Number(ply.dataset.ply));
      if (e.target.closest('[data-analyze]')) return analyze();
      if (e.target.closest('[data-share-game]')) {
        const white = g.color === 'b' ? g.opponent : g.player, black = g.color === 'b' ? g.player : g.opponent;
        const result = !g.color ? '*' : g.result === 'draw' ? '1/2-1/2' : ((g.result === 'win') === (g.color !== 'b') ? '1-0' : '0-1');
        return window.openGameShare({ moves: st.sans.slice(), variant: g.variant, startFen: g.startFen || null, white: { name: white }, black: { name: black }, result, reason: g.reason, myColor: g.color || 'w' });
      }
      if (e.target.closest('[data-pgn]')) {
        const blob = new Blob([pgn()], { type: 'application/x-chess-pgn' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `chessdom-${g.player}-vs-${g.opponent || 'raqib'}.pgn`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
      if (e.target.closest('.player-link')) close();
    });
    st.board = Chessboard('replayBoard', {
      position: st.fens[st.fens.length - 1], draggable: false,
      orientation: g.color === 'b' ? 'black' : 'white',
      pieceTheme: (p) => (window.pieceUrl ? window.pieceUrl(p) : 'img/chesspieces/karvon/' + p + '.svg')
    });
    document.addEventListener('keydown', onKey);
    document.dispatchEvent(new CustomEvent('replay:open', { detail: { game: g, sans: st.sans.slice() } }));
    if (typeof window.renderOpeningInto === 'function') window.renderOpeningInto(document.getElementById('rpOpening'), st.sans, g.startFen && g.variant !== 'chess960' ? 'custom' : g.variant);
    go(st.fens.length - 1);
  }
  window.showReplayGame = showReplay;
})();
