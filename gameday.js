// ⭐ Kun o'yini — Jonli o'yinlar sahifasining tepasida (#lvGameDay, gd-*): kechagi eng qiziqarli o'yin (server tanlaydi,
// GET /api/game-of-day), yakuniy pozitsiya mini-taxtada, natija, debyut, "▶ Qayta ko'rish" va "🎬 GIF". Bosh sahifada YO'Q.
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = { game: undefined, at: 0, busy: false };

  function finalPosition(g) {
    try {
      const chess = g.variant === 'chess960' && window.Chess960 ? new window.Chess960(g.startFen) : new Chess();
      let last = null;
      for (const m of g.moves || []) {
        const mv = chess.move(typeof m === 'string' ? m : { from: m.from, to: m.to, promotion: m.promotion || 'q' });
        if (!mv) break;
        last = [mv.from, mv.to];
      }
      return { fen: chess.fen(), last };
    } catch (e) { return { fen: null, last: null }; }
  }

  function miniBoard(fen, last) {
    const rows = String(fen || '8/8/8/8/8/8/8/8').split(' ')[0].split('/');
    const lm = new Set(last || []);
    let html = '';
    rows.forEach((row, r) => {
      let f = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) { for (let k = 0; k < Number(ch); k++, f++) html += cell(r, f, null, lm); }
        else { html += cell(r, f, ch, lm); f++; }
      }
    });
    return `<div class="gd-board">${html}</div>`;
  }
  function cell(r, f, piece, lm) {
    const sq = 'abcdefgh'[f] + (8 - r);
    const code = piece ? (piece === piece.toUpperCase() ? 'w' : 'b') + piece.toUpperCase() : null;
    const src = code && window.pieceUrl ? window.pieceUrl(code) : null;
    return `<i class="${(r + f) % 2 ? 'd' : 'l'}${lm.has(sq) ? ' lm' : ''}">${src ? `<img src="${esc(src)}" alt="">` : ''}</i>`;
  }

  function reasonLabel(r) {
    const map = { checkmate: tx('lvReasonCheckmate', 'mat'), resign: tx('lvReasonResign', 'taslim'), timeout: tx('lvReasonTimeout', 'vaqt tugadi'), abandon: tx('lvReasonAbandon', "o'yinni tark etdi"),
      agreement: tx('lvReasonAgreement', 'kelishuv'), stalemate: tx('ghStalemate', 'pat'), threefold: tx('ghRepetition', 'takrorlanish'), fifty: tx('ghFifty', '50 yurish'), insufficient: tx('ghInsufficient', 'dona yetishmaydi') };
    return map[r] || '';
  }

  function player(p, color, won) {
    const flag = p.country ? `<img class="gd-flag" src="https://flagcdn.com/w20/${esc(String(p.country).toLowerCase())}.png" alt="">` : '';
    return `<div class="gd-player${won ? ' won' : ''}">${typeof window.kingIcon === 'function' ? window.kingIcon(color) : ''}${flag}
      <b class="player-link" data-username="${esc(p.name)}">${esc(p.name)}</b>${p.rating ? `<small>${esc(p.rating)}</small>` : ''}${won ? '<span class="gd-crown">🏆</span>' : ''}</div>`;
  }

  function render() {
    const box = document.getElementById('lvGameDay');
    if (!box) return;
    const g = st.game;
    box.hidden = !g;
    if (!g) { box.innerHTML = ''; return; }
    const pos = finalPosition(g);
    const opening = g.variant === 'chess960' ? { name: '🎲 Chess960' } : (typeof window.openingFor === 'function' ? window.openingFor(g.moves) : null);
    const moves = Math.ceil((g.moves || []).length / 2);
    const date = g.playedAt ? new Date(g.playedAt).toLocaleDateString() : g.day;
    const detail = [reasonLabel(g.reason), tx('gdMoves', '{{n}} yurish', { n: moves }), g.clock].filter(Boolean).join(' · ');
    box.innerHTML = `<div class="gd-card">
      ${miniBoard(pos.fen, pos.last)}
      <div class="gd-info">
        <div class="gd-kicker">⭐ ${esc(tx('gdTitle', "Kun o'yini"))} <span>${esc(date)}</span></div>
        <div class="gd-players">${player(g.black, 'b', g.result === '0-1')}<div class="gd-result">${esc(g.result === '1/2-1/2' ? '½–½' : g.result.replace('-', '–'))}</div>${player(g.white, 'w', g.result === '1-0')}</div>
        <div class="gd-detail">${esc(detail)}</div>
        ${opening ? `<div class="gd-opening">📖 ${esc(opening.eco ? opening.eco + ' · ' : '')}${esc(opening.name)}</div>` : ''}
        <div class="gd-actions">
          <button type="button" class="gd-btn" data-gd-replay>▶ ${esc(tx('gdReplay', "Qayta ko'rish"))}</button>
          <button type="button" class="gd-btn ghost" data-gd-share>🎬 GIF</button>
        </div>
        <p class="gd-hint">${esc(tx('gdHint', "Har kuni kechagi eng qiziqarli o'yin tanlanadi — keyingisi sizniki bo'lishi mumkin!"))}</p>
      </div>
    </div>`;
    box.querySelector('[data-gd-replay]').addEventListener('click', () => { if (typeof window.openReplay === 'function') window.openReplay(g.white.name, g.id); });
    box.querySelector('[data-gd-share]').addEventListener('click', () => {
      if (typeof window.openGameShare !== 'function') return;
      window.openGameShare({ moves: g.moves, variant: g.variant, startFen: g.startFen, white: g.white, black: g.black,
        result: g.result === '1-0' ? 'win' : g.result === '0-1' ? 'loss' : 'draw', reason: g.reason, myColor: 'w' });
    });
    // Debyut bazasi keyin yuklansa — nomi chiqishi uchun qayta chizamiz
    if (!opening && g.variant !== 'chess960' && typeof window.loadOpenings === 'function' && !st.openingTried) {
      st.openingTried = true;
      Promise.resolve(window.loadOpenings()).then(render).catch(() => {});
    }
  }

  async function load() {
    if (st.busy || (st.game !== undefined && Date.now() - st.at < 5 * 60 * 1000)) { render(); return; }
    st.busy = true;
    try {
      const d = await fetch('/api/game-of-day').then((r) => r.json());
      if (d && d.success) { st.game = d.game || null; st.at = Date.now(); }
    } catch (e) {}
    st.busy = false;
    render();
  }

  function mount() {
    const root = document.getElementById('liveRoot');
    if (!root) return;
    let box = document.getElementById('lvGameDay');
    if (!box) {
      box = document.createElement('div');
      box.id = 'lvGameDay';
      box.className = 'gd-wrap';
      box.hidden = true;
      root.insertBefore(box, root.firstChild);
    }
    load();
  }

  const orig = window.renderLiveView;
  if (typeof orig === 'function') {
    window.renderLiveView = function () { const r = orig.apply(this, arguments); try { mount(); } catch (e) {} return r; };
  }
  window.refreshGameOfDay = function () { st.at = 0; mount(); };
})();
