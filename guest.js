// 👤 Mehmon rejimi (klient): ro'yxatdan o'tmasdan o'ynash, mehmonga eslatmalar, mehmon akkauntini saqlab qolish.
// Server: POST /api/auth/guest (vaqtinchalik akkaunt, reytingsiz), /api/auth/register mehmon tokeni bilan — o'sha akkaunt oddiyga aylanadi.
(function () {
  const isGuest = () => !!(window.currentUser && window.currentUser.guest && window.authToken);
  window.isGuestUser = isGuest;
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (msg) => { if (typeof window.showToast === 'function') window.showToast(msg); };

  window.playAsGuest = async function () {
    const btn = document.getElementById('authGuestBtn');
    if (btn) btn.disabled = true;
    try {
      const r = await fetch('/api/auth/guest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: window.currentLang || 'en' }) });
      const d = await r.json();
      if (!d.success) throw new Error(d.message || '');
      window.applyAuthSession(d.user, d.token);
      window.hideAuthGate();
      if (typeof window.updateAuthHeaderUI === 'function') window.updateAuthHeaderUI();
      // Taklif havolasi bilan kelgan bo'lsa — invite.js chaqiruvni o'zi yuboradi; aks holda darhol raqib qidiriladi
      const invited = typeof window.getPendingInviteCode === 'function' && window.getPendingInviteCode();
      if (!invited && typeof window.quickPlayOnline === 'function') window.quickPlayOnline();
      else if (typeof window.switchView === 'function') window.switchView('home');
    } catch (e) {
      toast((e.message && typeof window.tServer === 'function' && window.tServer(e.message)) || tx('guestFailed', "Mehmon sifatida kirib bo'lmadi"));
    } finally { if (btn) btn.disabled = false; }
  };

  window.openGuestSignup = function () { window.showAuthGate('signup'); };

  const signupBtn = () => `<button type="button" class="guest-signup-btn" onclick="window.openGuestSignup()">${esc(tx('guestSignupBtn', "Ro'yxatdan o'tish"))}</button>`;

  // Bosh sahifadagi eslatma
  function renderBanner() {
    const el = document.getElementById('guestBanner');
    if (!el) return;
    el.hidden = !isGuest();
    if (el.hidden) return;
    el.innerHTML = `<div class="guest-banner-ico">👤</div>
      <div class="guest-banner-body"><b>${esc(tx('guestBannerTitle', "Siz mehmon sifatida o'ynayapsiz"))} <span>(${esc(window.currentUser.username)})</span></b>
      <p>${esc(tx('guestBannerText', "Ro'yxatdan o'ting — o'yinlaringiz saqlanadi, reytingli o'yinlar, chat, do'stlar va klublar ochiladi. Mehmon akkaunti 7 kundan keyin o'chiriladi."))}</p></div>
      ${signupBtn()}`;
  }

  // O'yin panelidagi "Reytingli" tanlovi — mehmon uchun o'chiq
  function renderRatedToggle() {
    const toggle = document.getElementById('ratedToggle');
    const sub = document.getElementById('ratedSublabel');
    if (!toggle) return;
    if (isGuest()) {
      toggle.checked = false;
      toggle.disabled = true;
      if (typeof window.toggleRated === 'function') window.toggleRated();
      if (sub) sub.textContent = tx('guestRatedNote', "Mehmonlar reytingsiz o'ynaydi");
    } else if (toggle.disabled) {
      toggle.disabled = false;
      if (sub) sub.textContent = tx('ratedSublabel', "O'yin rejimi");
    }
  }

  // O'yin tugagach: "bu o'yinni saqlash uchun ro'yxatdan o'ting"
  function renderOverBox(mode) {
    let box = document.getElementById('guestOverBox');
    const sport = document.getElementById('sportBox');
    if (!box && sport) {
      box = document.createElement('div');
      box.id = 'guestOverBox';
      box.className = 'guest-over-box';
      sport.parentNode.insertBefore(box, sport);
    }
    if (!box) return;
    const gameView = document.getElementById('gameView');
    const over = (mode || (gameView && gameView.classList.contains('pg-mode-over') ? 'over' : '')) === 'over';
    box.hidden = !(isGuest() && over);
    if (!box.hidden) box.innerHTML = `<span>💾 ${esc(tx('guestOverText', "Bu o'yin saqlanib qolishi uchun ro'yxatdan o'ting"))}</span>${signupBtn()}`;
  }

  function renderAll(mode) {
    renderBanner();
    renderRatedToggle();
    renderOverBox(mode);
    const chat = document.getElementById('gameChatBox');
    if (chat && isGuest()) chat.hidden = true;
  }
  window.refreshGuestUi = renderAll;

  function wrap(name, after) {
    const orig = window[name];
    if (typeof orig !== 'function' || orig.__guestWrapped) return;
    const w = function () { const r = orig.apply(this, arguments); try { after.apply(this, arguments); } catch (e) {} return r; };
    w.__guestWrapped = true;
    window[name] = w;
  }

  function install() {
    wrap('applyAuthSession', () => renderAll());
    wrap('setGamePanelMode', (mode) => renderAll(mode));
    wrap('updateGameChatBox', () => { const c = document.getElementById('gameChatBox'); if (c && isGuest()) c.hidden = true; });
    wrap('updateUI', () => renderAll());
    // Mehmon ro'yxatdan o'tish oynasini yopib, saytga qaytishi mumkin; mehmon tugmasi esa unga kerak emas
    wrap('showAuthGate', () => {
      const close = document.getElementById('authGateClose');
      if (close) close.hidden = !window.authToken;
      const box = document.getElementById('authGuestBox');
      if (box) box.hidden = !!window.authToken;
    });
    renderAll();
  }

  // Server mehmonga yopiq amalni rad etsa (403 guest) — ro'yxatdan o'tishga taklif
  const origFetch = window.fetch;
  let lastPrompt = 0;
  window.fetch = function () {
    return origFetch.apply(this, arguments).then((res) => {
      if (res.status === 403 && isGuest()) {
        res.clone().json().then((d) => {
          if (!d || !d.guest || Date.now() - lastPrompt < 4000) return;
          lastPrompt = Date.now();
          showGuestPrompt();
        }).catch(() => {});
      }
      return res;
    });
  };
  function showGuestPrompt() {
    let el = document.getElementById('guestPrompt');
    if (!el) {
      el = document.createElement('div');
      el.id = 'guestPrompt';
      el.className = 'guest-prompt';
      document.body.appendChild(el);
    }
    el.innerHTML = `<span>👤 ${esc(tx('srvGuestOnly', "Bu imkoniyat uchun ro'yxatdan o'ting!"))}</span>${signupBtn()}<button type="button" class="guest-prompt-x" aria-label="✕">✕</button>`;
    el.querySelector('.guest-prompt-x').onclick = () => { el.hidden = true; };
    el.querySelector('.guest-signup-btn').addEventListener('click', () => { el.hidden = true; });
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, 8000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
