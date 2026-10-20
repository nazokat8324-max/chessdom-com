// 🤝 Odob reytingi: o'yin tugagach o'yin panelida "Raqibingiz qanday o'ynadi?" — 👍 Odobli / 👎 Odobsiz
// (#sportBox, bir o'yinda bir marta; socket 'rate-opponent' ack bilan). Profilda #profileSport — oxirgi 100 baho
// bo'yicha foiz va 🎖️ "Oyning odobli o'yinchisi" mukofotlari (ma'lumot /extras dagi sportsmanship).
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const st = { roomId: null, reason: null, opponent: null, rated: {} }; // rated: roomId -> 1 | -1

  function paint(mode) {
    const box = document.getElementById('sportBox');
    if (!box) return;
    const show = mode === 'over' && st.roomId && st.reason && st.reason !== 'aborted' && st.opponent;
    box.hidden = !show;
    if (!show) return;
    const done = st.rated[st.roomId];
    if (done) {
      box.innerHTML = `<div class="sp-done">${done > 0 ? '👍' : '👎'} <span>${esc(tx('spThanks', 'Rahmat! Bahoingiz hisobga olindi'))}</span></div>`;
      return;
    }
    box.innerHTML = `<div class="sp-q">🤝 ${esc(tx('spQuestion', '{{name}} qanday o\'ynadi?', { name: st.opponent }))}</div>
      <div class="sp-actions">
        <button type="button" class="sp-btn up" data-sp="1">👍 <span>${esc(tx('spUp', 'Odobli'))}</span></button>
        <button type="button" class="sp-btn down" data-sp="-1">👎 <span>${esc(tx('spDown', 'Odobsiz'))}</span></button>
      </div>
      <small class="sp-note">${esc(tx('spNote', "Baho raqibning profilidagi odob reytingiga qo'shiladi. Natijaga emas, xulq-atvorga baho bering."))}</small>`;
    box.querySelectorAll('[data-sp]').forEach(b => b.addEventListener('click', () => rate(Number(b.dataset.sp))));
  }

  function rate(value) {
    const roomId = st.roomId;
    if (!roomId || st.rated[roomId] || typeof socket === 'undefined') return;
    st.rated[roomId] = value;
    paint('over');
    socket.emit('rate-opponent', { roomId, value }, (r) => {
      if (r && (r.ok || r.reason === 'already')) return;
      delete st.rated[roomId];
      showToast(tx('spFailed', "Baholash vaqti o'tib ketdi"), 'warning');
      paint('over');
    });
  }

  window.updateSportBox = paint;

  // Profil: odob reytingi (profile-extras.js chaqiradi)
  window.renderProfileSport = function (s) {
    const el = document.getElementById('profileSport');
    if (!el) return;
    if (!s || (!s.total && !(s.awards || []).length)) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    const pct = s.percent;
    const cls = pct == null ? '' : pct >= 90 ? 'good' : pct >= 70 ? 'ok' : 'bad';
    const awards = (s.awards || []).length;
    el.innerHTML = `<span class="ps-main ${cls}" title="${esc(tx('spProfileTitle', "Oxirgi {{n}} ta baho: 👍 {{up}} · 👎 {{down}}", { n: s.total, up: s.up, down: s.down }))}">🤝 ${esc(tx('spProfile', 'Odob'))} <b>${pct == null ? '—' : pct + '%'}</b> <small>(${s.total})</small></span>`
      + (awards ? `<span class="ps-award" title="${esc(tx('spAwardTitle', "Oyning odobli o'yinchisi: {{months}}", { months: s.awards.join(', ') }))}">🎖️ ×${awards}</span>` : '');
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof socket === 'undefined' || !socket) return;
    socket.on('match-found', (d) => { st.roomId = d.roomId; st.reason = null; st.opponent = d.opponent && d.opponent.username; });
    socket.on('game-resume', (d) => { st.roomId = d.roomId; st.reason = null; st.opponent = d.opponent && d.opponent.username; });
    socket.on('game-ended', (d) => {
      if (d && d.roomId && d.roomId !== st.roomId) return;
      st.reason = d && d.reason;
      // Panel 'over' rejimiga o'tgandan keyin chiziladi
      setTimeout(() => { const v = document.getElementById('gameView'); paint(v && v.classList.contains('pg-mode-over') ? 'over' : 'in'); }, 50);
    });
  });

  // "Yangi o'yin" — baholash oynasi yopiladi
  const origReset = window.resetToPreGame;
  window.resetToPreGame = function () {
    st.roomId = null;
    st.reason = null;
    if (typeof origReset === 'function') return origReset.apply(this, arguments);
  };
})();
