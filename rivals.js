// ⚔️ Raqib-do'st: eng ko'p va teng o'ynaladigan raqiblar (server rivalsOf — kamida 3 o'yin).
// Profilda "Raqib-do'stlar" qatori (#profRivals, ma'lumot /extras dagi rivals), o'yin boshlanganda
// o'yin panelida o'zaro hisob (#pgH2H ← GET /api/h2h/:men/:raqib). Raqib onlayn bo'lsa — bildirishnoma (rival_online).
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  window.renderProfileRivals = function (username, rivals) {
    const el = document.getElementById('profRivals');
    if (!el) return;
    const list = Array.isArray(rivals) ? rivals : [];
    if (!list.length) { el.hidden = true; el.innerHTML = ''; return; }
    const me = window.currentUser && window.currentUser.username;
    const own = username === me;
    el.hidden = false;
    el.innerHTML = `<div class="rv-title">⚔️ ${esc(tx('rvTitle', "Raqib-do'stlar"))}<small>${esc(tx('rvHint', "eng ko'p va teng kurashilgan raqiblar"))}</small></div>
      <div class="rv-list">${list.map((r, i) => {
        const lead = r.win - r.loss;
        const tag = lead > 0 ? tx('rvLeading', 'oldinda') : lead < 0 ? tx('rvBehind', 'ortda') : tx('rvEven', 'teng');
        return `<div class="rv-card${i === 0 ? ' top' : ''}">
          ${i === 0 ? `<span class="rv-badge">${esc(tx('rvMain', 'Asosiy raqib'))}</span>` : ''}
          <b class="player-link" data-username="${esc(r.name)}">${esc(r.name)}</b>
          <div class="rv-score"><i class="w">${r.win}</i><em>—</em><i class="d">${r.draw}</i><em>—</em><i class="l">${r.loss}</i></div>
          <small>${esc(tx('lbGamesN', "{{n}} o'yin", { n: r.games }))} · <span class="rv-tag ${lead > 0 ? 'up' : lead < 0 ? 'down' : ''}">${esc(tag)}</span></small>
          ${own && window.openChallengeDialog ? `<button type="button" class="rv-play" data-rv-challenge="${esc(r.name)}">⚔️ ${esc(tx('rvRematch', "Jang qilish"))}</button>` : ''}
        </div>`;
      }).join('')}</div>`;
    el.querySelectorAll('[data-rv-challenge]').forEach(btn => btn.addEventListener('click', () => window.openChallengeDialog(btn.dataset.rvChallenge)));
  };

  // O'yin panelidagi o'zaro hisob
  async function showH2H(data) {
    const el = document.getElementById('pgH2H');
    if (!el) return;
    el.hidden = true;
    const me = window.currentUser && window.currentUser.username;
    const opp = data && data.opponent && data.opponent.username;
    if (!me || !opp) return;
    const d = await fetch('/api/h2h/' + encodeURIComponent(me) + '/' + encodeURIComponent(opp)).then(r => r.json()).catch(() => null);
    if (!d || !d.success || !d.games || window.currentRoomId !== data.roomId) return;
    el.classList.toggle('rival', !!d.isRival);
    el.innerHTML = `<span>${d.isRival ? '⚔️ ' + esc(tx('rvMain', 'Asosiy raqib')) : '🤝 ' + esc(tx('rvH2H', "O'zaro hisob"))}</span>
      <b><i class="w">${d.win}</i> — <i class="d">${d.draw}</i> — <i class="l">${d.loss}</i></b>`;
    el.title = tx('rvH2HTitle', "{{name}} bilan {{n}} o'yin: g'alaba — durrang — mag'lubiyat", { name: opp, n: d.games });
    el.hidden = false;
    if (d.isRival) showToast(tx('rvBattleToast', "⚔️ Raqib-do'st jangi! {{name}} bilan hisob {{w}}–{{l}}", { name: opp, w: d.win, l: d.loss }), 'success', 5000);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof socket === 'undefined' || !socket) return;
    socket.on('match-found', (data) => { showH2H(data); });
    socket.on('game-resume', (data) => { setTimeout(() => showH2H(data), 500); });
  });
})();
