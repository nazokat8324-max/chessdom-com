// 🔗 Do'stni taklif qilish: shaxsiy havola (/?invite=<kod>&tc=180+2&r=1&v=960).
// Havola bilan kelgan odam ro'yxatdan o'tadi (inviteCode serverga ketadi) yoki kiradi → socket 'invite-accept' →
// ikkalasi do'st bo'ladi va taklif qiluvchi onlayn bo'lsa, unga darhol chaqiruv boradi (challenge.js oynalari ishlaydi).
// Server: GET /api/invite (mening havolam + kimlarni taklif qilganman), GET /api/invite/:code (taklif qiluvchi).
(function () {
  const KEY = 'justChessInvite';
  const TTL = 7 * 24 * 3600 * 1000;
  const CLOCKS = [[180, 2], [300, 0], [600, 0], [900, 10]];
  const st = { clock: [300, 0], rated: false, data: null, inviter: null };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const auth = () => (window.authToken ? { Authorization: 'Bearer ' + window.authToken } : {});
  const clockLabel = (c) => (c[0] / 60) + '+' + c[1];

  // --- Saqlangan taklif (ro'yxatdan o'tish/kirish orasida yo'qolmasin) ---
  function readPending() {
    try {
      const p = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (p && p.code && Date.now() - p.at < TTL) return p;
    } catch (e) {}
    return null;
  }
  function clearPending() { try { localStorage.removeItem(KEY); } catch (e) {} }
  window.getPendingInviteCode = function () { const p = readPending(); return p ? p.code : undefined; };

  // --- Havola bilan kelgan: kodni eslab qolamiz va manzildan olib tashlaymiz ---
  function captureFromUrl() {
    const q = new URLSearchParams(location.search);
    const code = q.get('invite');
    if (!code || !/^[a-z0-9]{4,16}$/i.test(code)) return;
    // "180+2" (qo'lda yozilgan havolada + bo'sh joyga aylanadi — ikkalasi ham qabul qilinadi)
    const tc = /^(\d{1,5})[+ ](\d{1,2})$/.exec(q.get('tc') || '');
    try {
      localStorage.setItem(KEY, JSON.stringify({ code: code.toLowerCase(), initial: tc ? Number(tc[1]) : 300, increment: tc ? Number(tc[2]) : 0, rated: q.get('r') === '1', variant: q.get('v') === '960' ? 'chess960' : q.get('v') === 'shatranj' ? 'shatranj' : 'standard', at: Date.now() }));
    } catch (e) {}
    ['invite', 'tc', 'r', 'v'].forEach(k => q.delete(k));
    const rest = q.toString();
    history.replaceState(history.state, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
  }

  // Kirish sahifasida: "X sizni o'yinga taklif qildi"
  async function showGateBanner(p) {
    const d = await fetch('/api/invite/' + encodeURIComponent(p.code)).then(r => r.json()).catch(() => null);
    if (!d || !d.success) { clearPending(); return; }
    st.inviter = d.inviter;
    const inner = document.querySelector('#authGate .auth-panel-inner');
    if (!inner || document.getElementById('authInviteBanner')) return;
    const logo = inner.querySelector('.auth-panel-logo');
    const div = document.createElement('div');
    div.id = 'authInviteBanner';
    div.className = 'inv-banner';
    div.innerHTML = `<span class="inv-banner-ico">♞</span><div><b>${esc(tx('invGateTitle', "{{name}} sizni o'yinga taklif qildi!", { name: d.inviter.username }))}</b>`
      + `<small>${esc(tx('invGateSub', "Ro'yxatdan o'ting — bir daqiqada u bilan o'ynaysiz. Bepul."))}</small></div>`;
    inner.insertBefore(div, logo ? logo.nextSibling : inner.firstChild);
    if (typeof window.showAuthGate === 'function') window.showAuthGate('signup');
  }

  // --- Kirgandan keyin: taklifni qabul qilish ---
  let accepting = false;
  function acceptPending(attempt) {
    const p = readPending();
    if (!p || !window.currentUser || typeof socket === 'undefined' || accepting) return;
    if (!socket.connected) { setTimeout(() => acceptPending((attempt || 0) + 1), 1000); return; }
    accepting = true;
    socket.timeout(8000).emit('invite-accept', p, (err, res) => {
      accepting = false;
      if (err || !res) { if ((attempt || 0) < 5) setTimeout(() => acceptPending((attempt || 0) + 1), 1500); return; }
      if (!res.ok && res.reason === 'auth' && (attempt || 0) < 8) { setTimeout(() => acceptPending((attempt || 0) + 1), 800); return; }
      clearPending();
      const banner = document.getElementById('authInviteBanner');
      if (banner) banner.remove();
      if (!res.ok) {
        const msg = {
          self: tx('invErrSelf', "Bu sizning o'z taklif havolangiz — uni do'stlaringizga yuboring"),
          not_found: tx('invErrNotFound', 'Taklif havolasi topilmadi'),
          blocked: tx('srvBlocked', "Bu o'yinchi bilan aloqa cheklangan"),
          you_busy: tx('arErrInGame', "Avval joriy o'yiningizni tugating.")
        }[res.reason] || tx('errGeneric', 'Xatolik yuz berdi!');
        showToast(msg, res.reason === 'self' ? 'info' : 'warning', 5000);
        return;
      }
      if (res.status === 'sent') {
        if (res.friendsNow) showToast(tx('invFriendsNow', "{{name}} bilan endi do'stsiz 🤝", { name: res.inviter }), 'success', 4000);
        return; // challenge.js "javobini kutyapmiz" oynasini ko'rsatadi
      }
      showWaitInfo(res);
    });
  }

  // Taklif qiluvchi hozir saytda emas yoki o'ynayapti
  function showWaitInfo(res) {
    const el = modal();
    const busy = res.status === 'busy';
    el.innerHTML = `<div class="inv-card">
        <button class="inv-x" data-close>✕</button>
        <div class="inv-big">${busy ? '♟️' : '🔔'}</div>
        <h3>${esc(busy ? tx('invBusyTitle', "{{name}} hozir o'ynayapti", { name: res.inviter }) : tx('invOfflineTitle', '{{name}} hozir saytda emas', { name: res.inviter }))}</h3>
        <p class="inv-sub">${esc(tx('invWaitSub', "Unga xabar yubordik — bo'shashi bilan sizni o'yinga chaqira oladi. Endi siz do'stsiz, u «Xabarlar» va do'stlar ro'yxatida."))}</p>
        <div class="inv-actions">
          <button class="inv-btn" data-go="tea">🍵 ${esc(tx('invGoTea', 'Hozircha Choyxonada o\'ynash'))}</button>
          <button class="inv-btn ghost" data-close>${esc(tx('invClose', 'Yopish'))}</button>
        </div>
      </div>`;
    bindClose(el);
    el.querySelector('[data-go]').onclick = () => { close(); switchView('tea'); };
  }

  // --- Taklif oynasi (havolani ulashish) ---
  let modalEl = null;
  function modal() {
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.className = 'inv-modal';
      modalEl.addEventListener('click', (e) => { if (e.target === modalEl) close(); });
      document.body.appendChild(modalEl);
    }
    modalEl.style.display = 'flex';
    return modalEl;
  }
  function close() { if (modalEl) modalEl.style.display = 'none'; }
  function bindClose(el) { el.querySelectorAll('[data-close]').forEach(b => b.onclick = close); }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalEl && modalEl.style.display === 'flex') close(); });

  function linkFor() {
    if (!st.data) return '';
    const params = new URLSearchParams({ invite: st.data.code, tc: st.clock[0] + '+' + st.clock[1] });
    if (st.rated) params.set('r', '1');
    return location.origin + '/?' + params.toString();
  }
  function shareText() { return tx('invShareText', "Keling, ChessCaravan'da shaxmat o'ynaymiz! ♞ {{clock}}", { clock: clockLabel(st.clock) }); }

  function render() {
    const el = modal();
    const d = st.data;
    const url = linkFor();
    const list = d && d.recent && d.recent.length
      ? `<div class="inv-list">${d.recent.map(r => `<span class="player-link inv-chip" data-username="${esc(r.username)}">${esc(r.username)}<small>${r.games} ${esc(tx('admGamesShort', "o'yin"))}</small></span>`).join('')}</div>` : '';
    el.innerHTML = `<div class="inv-card">
        <button class="inv-x" data-close>✕</button>
        <div class="inv-big">🔗</div>
        <h3>${esc(tx('invTitle', "Do'stingizni taklif qiling"))}</h3>
        <p class="inv-sub">${esc(tx('invSub', "Havolani Telegram'da yuboring. Do'stingiz uni ochib, ro'yxatdan o'tishi bilan siz bilan o'yinga tushadi va ikkingiz do'st bo'lasiz."))}</p>
        <div class="inv-clocks">${CLOCKS.map(c => `<button class="${c[0] === st.clock[0] && c[1] === st.clock[1] ? 'active' : ''}" data-clock="${c.join(',')}">${clockLabel(c)}</button>`).join('')}</div>
        <label class="inv-rated"><input type="checkbox" id="invRated" ${st.rated ? 'checked' : ''}> ${esc(tx('chRated', "Reytingli o'yin"))}</label>
        ${d ? `<div class="inv-link"><input readonly id="invUrl" value="${esc(url)}"><button class="inv-btn" data-copy>📋 ${esc(tx('invCopy', 'Nusxa olish'))}</button></div>
        <div class="inv-actions">
          <a class="inv-btn tg" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText())}">✈️ Telegram</a>
          ${navigator.share ? `<button class="inv-btn ghost" data-share>📤 ${esc(tx('invShare', 'Ulashish'))}</button>` : ''}
        </div>
        <div class="inv-stats"><b>${esc(tx('invCount', 'Siz taklif qilganlar: {{n}}', { n: d.count }))}</b>
          <small>${esc(tx('invGoal', "3 ta do'st — «Taklifchi» 📣, 10 ta — «ChessCaravan elchisi» 🌟 nishoni"))}</small>${list}</div>`
        : `<div class="inv-loading">${esc(tx('loadingText', 'Yuklanmoqda...'))}</div>`}
      </div>`;
    bindClose(el);
    el.querySelectorAll('[data-clock]').forEach(b => b.onclick = () => { st.clock = b.dataset.clock.split(',').map(Number); render(); });
    const rated = el.querySelector('#invRated');
    if (rated) rated.onchange = () => { st.rated = rated.checked; render(); };
    const copy = el.querySelector('[data-copy]');
    if (copy) copy.onclick = async () => {
      const input = el.querySelector('#invUrl');
      try { await navigator.clipboard.writeText(input.value); } catch (e) { input.select(); document.execCommand('copy'); }
      showToast(tx('invCopied', 'Havola nusxalandi — endi uni do\'stingizga yuboring'), 'success');
    };
    const share = el.querySelector('[data-share]');
    if (share) share.onclick = () => navigator.share({ title: 'ChessCaravan', text: shareText(), url }).catch(() => {});
  }

  window.openInviteDialog = async function () {
    if (!window.currentUser) { showAuthGate('signup'); return; }
    st.data = null;
    render();
    const d = await fetch('/api/invite', { headers: auth() }).then(r => r.json()).catch(() => null);
    if (d && d.success) { st.data = d; if (modalEl && modalEl.style.display === 'flex') render(); }
    else { close(); showToast(tx('errGeneric', 'Xatolik yuz berdi!'), 'warning'); }
  };

  // Ro'yxatdan o'tish/kirish → taklifni qabul qilish
  const origAuth = window.applyAuthSession;
  if (typeof origAuth === 'function') {
    window.applyAuthSession = function () {
      const r = origAuth.apply(this, arguments);
      if (readPending()) setTimeout(() => acceptPending(0), 600);
      return r;
    };
  }

  captureFromUrl();
  document.addEventListener('DOMContentLoaded', () => {
    const p = readPending();
    if (!p) return;
    if (window.currentUser) setTimeout(() => acceptPending(0), 1200);
    else showGateBanner(p);
  });
})();
