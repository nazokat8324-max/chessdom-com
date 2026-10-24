// ⚔️ Bahs (do'st bilan 3/5/7 o'yinlik seriya): o'yin panelida hisob tablosi #duelBox (du-*), revansh tugmasi "Keyingi o'yin"ga
// aylanadi, profilda "Bahslar" bo'limi (#profDuelsSection). Server: challenge-send {series}, match-found/game-resume/game-ended .duel,
// rematch-decline bahsni to'xtatadi → duel-stopped. Chaqiruv oynasidagi tanlov — challenge.js.
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = { duel: null, roomId: null, results: [], mode: 'pre' };
  const me = () => (window.currentUser && window.currentUser.username) || '';
  const active = () => !!(st.duel && !st.duel.finished && !st.duel.stopped);
  // 1.5 → "1½", 0.5 → "½"
  const pts = (x) => { const n = Number(x) || 0, w = Math.floor(n); return (n - w ? (w ? w + '½' : '½') : String(w)); };
  window.formatDuelPoints = pts;

  function box() {
    let el = document.getElementById('duelBox');
    if (!el) {
      const pre = document.getElementById('preGameControls');
      if (!pre) return null;
      el = document.createElement('div');
      el.id = 'duelBox';
      el.className = 'duel-box';
      el.hidden = true;
      pre.parentNode.insertBefore(el, pre);
    }
    return el;
  }

  function render() {
    const el = box();
    if (!el) return;
    const d = st.duel;
    if (!d || st.mode === 'pre') { el.hidden = true; return; }
    const my = me(), opp = d.players.find((n) => n !== my) || d.players[1];
    const a = d.scores[my] || 0, b = d.scores[opp] || 0;
    let status;
    if (d.finished) status = d.winner === my ? tx('duWon', '🏆 Bahsni yutdingiz!') : d.winner ? tx('duLost', '{{name}} bahsni yutdi', { name: d.winner }) : tx('duDraw', 'Bahs durrang');
    else if (d.stopped) status = tx('duStopped', "Bahs to'xtatildi");
    else status = tx('duGame', "{{n}}-o'yin", { n: d.game }) + ' · ' + tx('duSeriesHint', "kim ko'p ochko to'plasa — g'olib");
    const pips = Array.from({ length: d.bestOf }, (_, i) => `<i class="${st.results[i] || (i < d.played ? 'x' : '')}"></i>`).join('');
    el.className = 'duel-box' + (d.finished ? (d.winner === my ? ' won' : d.winner ? ' lost' : ' draw') : '');
    el.innerHTML = `<div class="du-head">⚔️ ${esc(tx('duTitle', 'Bahs'))} · ${esc(tx('duBestOf', "{{n}} o'yinlik", { n: d.bestOf }))}</div>
      <div class="du-score"><span class="du-name">${esc(my)}</span><b>${esc(pts(a))} – ${esc(pts(b))}</b><span class="du-name">${esc(opp)}</span></div>
      <div class="du-pips">${pips}</div>
      <div class="du-status">${esc(status)}</div>
      ${st.mode === 'over' && active() ? `<button type="button" class="du-stop">${esc(tx('duStop', "Bahsni to'xtatish"))}</button>` : ''}`;
    const stop = el.querySelector('.du-stop');
    if (stop) stop.onclick = () => { if (confirm(tx('duStopConfirm', "Bahs shu hisob bilan to'xtatilsinmi?"))) socket.emit('rematch-decline', { roomId: st.roomId }); };
    el.hidden = false;
  }

  function setDuel(duel, roomId) {
    if (!duel) { st.duel = null; st.results = []; render(); return; }
    if (!st.duel || st.duel.id !== duel.id) st.results = [];
    st.duel = duel;
    if (roomId) st.roomId = roomId;
    render();
  }

  // Panel rejimi (pre/in/over) — tablo ko'rinishi va revansh tugmasi matni
  const origMode = window.setGamePanelMode;
  if (typeof origMode === 'function') {
    window.setGamePanelMode = function (mode) {
      const r = origMode.apply(this, arguments);
      st.mode = mode;
      render();
      return r;
    };
  }
  const origRematch = window.updateRematchBox;
  if (typeof origRematch === 'function') {
    window.updateRematchBox = function () {
      const r = origRematch.apply(this, arguments);
      if (active()) {
        const btn = document.getElementById('btnRematch');
        const msg = document.querySelector('#rematchBox .rm-msg');
        if (btn && !btn.disabled) btn.textContent = '⚔️ ' + tx('duNext', "Keyingi o'yin ({{n}}/{{total}})", { n: st.duel.played + 1, total: st.duel.bestOf });
        const actions = document.querySelector('#rematchBox .rm-actions');
        if (msg && actions && !actions.hidden) {
          const opp = st.duel.players.find((n) => n !== me()) || '';
          msg.textContent = tx('duNextOffered', "{{name}} keyingi o'yinga tayyor!", { name: opp });
        }
      }
      return r;
    };
  }
  // Bahsda "Rad etish" — bahs to'xtaydi, shuning uchun so'raymiz
  const origDecline = window.declineRematch;
  if (typeof origDecline === 'function') {
    window.declineRematch = function () {
      if (active() && !confirm(tx('duStopConfirm', "Bahs shu hisob bilan to'xtatilsinmi?"))) return;
      return origDecline.apply(this, arguments);
    };
  }
  const origReset = window.resetToPreGame;
  if (typeof origReset === 'function') {
    window.resetToPreGame = function () {
      st.duel = null; st.results = [];
      const r = origReset.apply(this, arguments);
      render();
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof socket === 'undefined') return;
    socket.on('match-found', (d) => setDuel(d && d.duel, d && d.roomId));
    socket.on('game-resume', (d) => setDuel(d && d.duel, d && d.roomId));
    socket.on('game-ended', (d) => {
      if (!d || !d.duel || !st.duel || d.duel.id !== st.duel.id) return;
      const counted = d.duel.played > st.duel.played;
      if (counted) st.results[d.duel.played - 1] = d.result === 'win' ? 'w' : d.result === 'loss' ? 'l' : 'd';
      setDuel(d.duel, d.roomId);
      // Panel natijadan oldin "over" ga o'tgan bo'lishi mumkin — tugma matni yangi hisob bilan
      if (typeof window.updateRematchBox === 'function') window.updateRematchBox(st.mode);
      if (d.duel.finished) {
        const won = d.duel.winner === me();
        setTimeout(() => {
          showToast(won ? tx('duWon', '🏆 Bahsni yutdingiz!') : d.duel.winner ? tx('duLost', '{{name}} bahsni yutdi', { name: d.duel.winner }) : tx('duDraw', 'Bahs durrang'), won ? 'success' : 'info', 5000);
          if (won && typeof window.confetti === 'function') window.confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
        }, 900);
      }
    });
    socket.on('duel-stopped', (d) => {
      if (!d || !d.duel) return;
      const mine = st.duel && st.duel.id === d.duel.id;
      setDuel(d.duel, d.roomId);
      if (mine) {
        showToast(tx('duStopped', "Bahs to'xtatildi") + ' · ' + pts(d.duel.scores[me()] || 0) + ' – ' + pts(d.duel.scores[d.duel.players.find((n) => n !== me())] || 0), 'info', 4000);
        if (typeof window.updateRematchBox === 'function') window.updateRematchBox(st.mode);
      }
    });
  });

  // --- Profil: "⚔️ Bahslar" ---
  window.renderProfileDuels = function (data) {
    const sec = document.getElementById('profDuelsSection'), el = document.getElementById('profDuels');
    if (!sec || !el) return;
    if (!data) { sec.hidden = true; return; }
    sec.hidden = false;
    const resLabel = { win: tx('duResWin', "G'alaba"), loss: tx('duResLoss', "Mag'lubiyat"), draw: tx('duResDraw', 'Durrang'), stopped: tx('duResStopped', "To'xtatilgan"), active: tx('duResActive', 'Davom etmoqda') };
    el.innerHTML = data.recent.length ? `<p class="du-summary">${esc(tx('duSummary', "{{total}} bahs · {{won}} g'alaba · {{drawn}} durrang · {{lost}} mag'lubiyat", data))}</p>
      <div class="du-list">${data.recent.map((r) => `<div class="du-row ${esc(r.result)}">
        <span class="du-res">${esc(resLabel[r.result] || r.result)}</span>
        <span class="du-opp">${r.opponent ? `<b class="player-link" data-username="${esc(r.opponent)}">${esc(r.opponent)}</b>` : '—'}</span>
        <span class="du-sc">${esc(pts(r.me))} – ${esc(pts(r.opp))}</span>
        <small>${esc(tx('duBestOf', "{{n}} o'yinlik", { n: r.bestOf }))} · ${esc(new Date(r.at).toLocaleDateString())}</small></div>`).join('')}</div>`
      : `<p class="du-summary">${esc(tx('duNone', "Hali bahs yo'q — do'stingizni 3, 5 yoki 7 o'yinlik bahsga chaqiring!"))}</p>`;
  };
})();
