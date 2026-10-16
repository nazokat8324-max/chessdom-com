// O'yinga chaqirish: istalgan o'yinchini (Xabarlar yoki profil orqali) tanlangan vaqt nazoratida o'yinga taklif qilish.
// Server: 'challenge-send' → raqibga 'challenge-received'; 'challenge-accept' → ikkalasiga 'match-found {challenge: true}'.
(function () {
  const CLOCKS = [[60, 0], [60, 1], [120, 1], [180, 0], [180, 2], [300, 0], [600, 0], [900, 10], [1800, 0]];
  const st = { pick: [180, 2], rated: true, outgoing: null, incoming: null, variant: 'standard', custom: false, customMin: 10, customInc: 5 };
  let countdown = null;

  const esc = (v) => {
    const div = document.createElement('div');
    div.textContent = (v === null || v === undefined) ? '' : String(v);
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  const modeOf = (i, inc) => { const e = i + 40 * inc; return e < 180 ? 'bullet' : (e < 480 ? 'blitz' : 'rapid'); };
  const modeIcon = (m) => ({ bullet: '🔥', blitz: '⚡', rapid: '⏱️' }[m] || '♟');
  const clockLabel = (i, inc) => `${i / 60}+${inc}`;
  const flag = (code) => code ? `<img class="ar-flag" src="https://flagcdn.com/w40/${esc(code)}.png" alt="" onerror="this.remove()">` : '';

  function modal() {
    let el = document.getElementById('challengeModal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'challengeModal';
      el.className = 'ch-overlay';
      el.addEventListener('click', (e) => { if (e.target === el && !st.incoming) close(); });
      document.body.appendChild(el);
    }
    return el;
  }

  function close() {
    clearInterval(countdown);
    const el = document.getElementById('challengeModal');
    if (el) el.remove();
  }

  function startCountdown(seconds, onTick) {
    clearInterval(countdown);
    let left = seconds;
    onTick(left);
    countdown = setInterval(() => { left = Math.max(0, left - 1); onTick(left); if (!left) clearInterval(countdown); }, 1000);
  }

  // --- Chaqiruv yuborish ---
  function renderPicker(username) {
    const el = modal();
    el.innerHTML = `
      <div class="ch-card">
        <button class="ch-x" data-close="1">✕</button>
        <div class="ch-icon">⚔️</div>
        <h3>${esc(tx('chTitle', "{{name}} ni o'yinga chaqirish", { name: username }))}</h3>
        <p class="ch-sub">${esc(tx('chPickClock', 'Vaqt nazoratini tanlang'))}</p>
        <div class="ch-clocks">${CLOCKS.map(([i, inc]) => `
          <button class="ch-clock${st.pick[0] === i && st.pick[1] === inc ? ' active' : ''}" data-clock="${i},${inc}">
            <b>${clockLabel(i, inc)}</b><small>${modeIcon(modeOf(i, inc))} ${esc({ bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid' }[modeOf(i, inc)])}</small>
          </button>`).join('')}
          <button class="ch-clock${st.custom ? ' active' : ''}" data-custom="1"><b>⚙️</b><small>${esc(tx('chCustom', 'Boshqa'))}</small></button>
        </div>
        <div class="ch-custom"${st.custom ? '' : ' hidden'}>
          <label>${esc(tx('chMinutes', 'Daqiqa'))}<input type="number" id="chCustomMin" min="0.5" max="180" step="0.5" value="${st.customMin}"></label>
          <label>${esc(tx('chIncrementSec', "Qo'shimcha (soniya)"))}<input type="number" id="chCustomInc" min="0" max="60" step="1" value="${st.customInc}"></label>
        </div>
        <div class="ch-variants">
          <button class="ch-variant${st.variant === 'standard' ? ' active' : ''}" data-variant="standard">♟ ${esc(tx('chStandard', 'Standart'))}</button>
          <button class="ch-variant${st.variant === 'chess960' ? ' active' : ''}" data-variant="chess960">🎲 Chess960</button>
        </div>
        <label class="ch-rated"><input type="checkbox" id="chRated" ${st.rated ? 'checked' : ''}> ${esc(tx('chRated', "Reytingli o'yin"))}</label>
        <button class="ch-primary" data-send="1">⚔️ ${esc(tx('chSend', 'Chaqirish'))}</button>
      </div>`;
    el.querySelector('[data-close]').onclick = close;
    const keep = () => {
      const r = el.querySelector('#chRated');
      if (r && !r.disabled) st.rated = r.checked;
      const m = el.querySelector('#chCustomMin'), i = el.querySelector('#chCustomInc');
      if (m) st.customMin = Math.min(180, Math.max(0.5, Number(m.value) || 10));
      if (i) st.customInc = Math.min(60, Math.max(0, Math.round(Number(i.value) || 0)));
    };
    el.querySelectorAll('[data-clock]').forEach(b => b.onclick = () => {
      keep();
      st.pick = b.dataset.clock.split(',').map(Number);
      st.custom = false;
      renderPicker(username);
    });
    el.querySelector('[data-custom]').onclick = () => { keep(); st.custom = true; renderPicker(username); };
    el.querySelectorAll('[data-variant]').forEach(b => b.onclick = () => { keep(); st.variant = b.dataset.variant; renderPicker(username); });
    el.querySelector('[data-send]').onclick = () => {
      keep();
      const initial = st.custom ? Math.round(st.customMin * 60) : st.pick[0];
      const increment = st.custom ? st.customInc : st.pick[1];
      socket.emit('challenge-send', { username, initial, increment, rated: st.rated, variant: st.variant });
    };
  }

  function renderWaiting(data) {
    const el = modal();
    el.innerHTML = `
      <div class="ch-card">
        <div class="ch-icon pulse">⏳</div>
        <h3>${esc(tx('chWaiting', '{{name}} javobini kutyapmiz...', { name: data.to }))}</h3>
        <p class="ch-sub">${modeIcon(modeOf(data.clock.initial, data.clock.increment))} ${clockLabel(data.clock.initial, data.clock.increment)} · ${esc(data.rated ? tx('chRatedShort', 'Reytingli') : tx('chCasualShort', 'Reytingsiz'))}${data.variant === 'chess960' ? ' · 🎲 Chess960' : ''}</p>
        <div class="ch-timer" id="chTimer"></div>
        <button class="ch-secondary" data-cancel="1">${esc(tx('arCancel', 'Bekor qilish'))}</button>
      </div>`;
    el.querySelector('[data-cancel]').onclick = () => { socket.emit('challenge-cancel', { id: data.id }); st.outgoing = null; close(); };
    startCountdown(data.seconds, (s) => { const t = document.getElementById('chTimer'); if (t) t.textContent = s + 's'; });
  }

  // --- Kelgan chaqiruv ---
  function renderIncoming(data) {
    const el = modal();
    el.innerHTML = `
      <div class="ch-card incoming">
        <div class="ch-icon">⚔️</div>
        <h3>${esc(tx('chIncoming', "{{name}} sizni o'yinga chaqirmoqda!", { name: data.from.username }))}</h3>
        <p class="ch-from">${flag(data.from.country)} <b>${esc(data.from.username)}</b> <small>${data.from.rating}</small></p>
        <p class="ch-sub">${modeIcon(data.mode)} ${clockLabel(data.clock.initial, data.clock.increment)} · ${esc(data.rated ? tx('chRatedShort', 'Reytingli') : tx('chCasualShort', 'Reytingsiz'))}${data.variant === 'chess960' ? ' · 🎲 Chess960' : ''}</p>
        <div class="ch-timer" id="chTimer"></div>
        <div class="ch-actions">
          <button class="ch-secondary" data-decline="1">✕ ${esc(tx('chDecline', 'Rad etish'))}</button>
          <button class="ch-primary" data-accept="1">✓ ${esc(tx('chAccept', 'Qabul qilish'))}</button>
        </div>
      </div>`;
    el.querySelector('[data-decline]').onclick = () => { socket.emit('challenge-decline', { id: data.id }); st.incoming = null; close(); };
    el.querySelector('[data-accept]').onclick = () => {
      if (typeof window.isGameInProgress === 'function' && window.isGameInProgress()) {
        showToast(tx('arErrInGame', "Avval joriy o'yiningizni tugating."), 'warning');
        return;
      }
      socket.emit('challenge-accept', { id: data.id });
      st.incoming = null;
      close();
    };
    startCountdown(data.seconds, (s) => { const t = document.getElementById('chTimer'); if (t) t.textContent = s + 's'; });
  }

  window.openChallengeDialog = function (username) {
    if (!window.currentUser) { showAuthGate('login'); return; }
    if (!username || username === window.currentUser.username) return;
    if (typeof window.isGameInProgress === 'function' && window.isGameInProgress()) {
      showToast(tx('arErrInGame', "Avval joriy o'yiningizni tugating."), 'warning');
      return;
    }
    if (typeof window.closeProfileModal === 'function') window.closeProfileModal();
    renderPicker(username);
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof socket === 'undefined') return;
    socket.on('challenge-sent', (data) => { st.outgoing = data; renderWaiting(data); });
    socket.on('challenge-received', (data) => {
      st.incoming = data;
      renderIncoming(data);
      if (typeof playSound === 'function') playSound('move');
    });
    socket.on('challenge-declined', (data) => {
      if (!st.outgoing || st.outgoing.id !== data.id) return;
      st.outgoing = null; close();
      showToast(tx('chDeclined', '{{name}} chaqiruvni rad etdi', { name: data.by }), 'info', 4000);
    });
    socket.on('challenge-cancelled', (data) => {
      if (!st.incoming || st.incoming.id !== data.id) return;
      st.incoming = null; close();
      showToast(tx('chCancelled', 'Chaqiruv bekor qilindi'), 'info', 3000);
    });
    socket.on('challenge-expired', (data) => {
      const mine = st.outgoing && st.outgoing.id === data.id;
      if (!mine && !(st.incoming && st.incoming.id === data.id)) return;
      st.outgoing = null; st.incoming = null; close();
      if (mine) showToast(tx('chExpired', '{{name}} javob bermadi', { name: data.to || '' }), 'info', 4000);
    });
    socket.on('challenge-error', (data) => {
      const reason = data && data.reason;
      const msg = {
        offline: tx('chErrOffline', "Bu o'yinchi hozir saytda emas"),
        busy: tx('chErrBusy', "Bu o'yinchi hozir o'ynayapti"),
        you_busy: tx('arErrInGame', "Avval joriy o'yiningizni tugating."),
        not_found: tx('srvUserNotFound', 'Foydalanuvchi topilmadi!'),
        gone: tx('chErrGone', 'Chaqiruv endi amal qilmaydi'),
        blocked: tx('srvBlocked', "Bu o'yinchi bilan aloqa cheklangan"),
        disabled: tx('chErrDisabled', "Bu o'yinchi chaqiruvlarni qabul qilmaydi"),
        friends_only: tx('chErrFriendsOnly', "Bu o'yinchi faqat do'stlaridan chaqiruv qabul qiladi"),
        auth: tx('errLoginRequired', 'Avval tizimga kirishingiz kerak!')
      }[reason] || tx('errGeneric', 'Xatolik yuz berdi!');
      showToast(msg, 'warning', 4000);
      st.outgoing = null;
      if (!st.incoming) close();
    });
    socket.on('match-found', (data) => { if (data && data.challenge) { st.outgoing = null; st.incoming = null; close(); } });
  });
})();
