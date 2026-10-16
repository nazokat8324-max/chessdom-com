// O'yinni qayta ko'rish: profildagi "Oxirgi o'yinlar" qatori bosilsa ochiladi.
// Server: GET /api/users/:username/games/:gameId/replay (yurishlar SAN ko'rinishida, o'yinchining rangi, natija).
(function () {
  const st = { game: null, sans: [], fens: [], ply: 0, board: null };

  const esc = (v) => {
    const div = document.createElement('div');
    div.textContent = (v === null || v === undefined) ? '' : String(v);
    return div.innerHTML;
  };

  function close() {
    const el = document.getElementById('replayModal');
    if (el) el.remove();
    if (st.board && typeof st.board.destroy === 'function') st.board.destroy();
    st.board = null;
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
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
  }

  function pgn() {
    const g = st.game;
    const white = g.color === 'b' ? g.opponent : g.player;
    const black = g.color === 'b' ? g.player : g.opponent;
    const result = g.result === 'draw' ? '1/2-1/2' : ((g.result === 'win') === (g.color !== 'b') ? '1-0' : '0-1');
    const d = g.date ? new Date(g.date) : new Date();
    const head = [
      `[Event "ChessDom"]`, `[Site "chessdom-com.onrender.com"]`, `[Date "${d.toISOString().slice(0, 10).replace(/-/g, '.')}"]`,
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
    const g = d.game;
    // Yurishlar (SAN) bo'yicha har bir pozitsiya
    const chess = g.variant === 'chess960' && window.Chess960 && g.startFen ? new Chess960(g.startFen) : new Chess();
    st.fens = [chess.fen()];
    st.sans = [];
    for (const san of g.moves) {
      const m = chess.move(san);
      if (!m) break;
      st.sans.push(m.san);
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
          <div id="replayBoard"></div>
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
          <div class="rp-moves">${moves || `<p class="rp-meta">${esc(tx('lvNoMoves', 'Hali yurish qilinmadi'))}</p>`}</div>
          <button class="rp-pgn" data-pgn="1">📄 ${esc(tx('rpDownloadPgn', 'PGN yuklab olish'))}</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      if (e.target === el || e.target.closest('[data-close]')) return close();
      const nav = e.target.closest('[data-nav]');
      if (nav) return go({ first: 0, prev: st.ply - 1, next: st.ply + 1, last: st.fens.length - 1 }[nav.dataset.nav]);
      const ply = e.target.closest('[data-ply]');
      if (ply) return go(Number(ply.dataset.ply));
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
      pieceTheme: (p) => (window.pieceUrl ? window.pieceUrl(p) : 'img/chesspieces/wikipedia/' + p + '.png')
    });
    document.addEventListener('keydown', onKey);
    if (typeof window.renderOpeningInto === 'function') window.renderOpeningInto(document.getElementById('rpOpening'), st.sans, g.variant);
    go(st.fens.length - 1);
  };
})();
