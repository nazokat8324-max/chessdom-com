// 📲 PWA: service worker (sw.js), "Ilovani o'rnatish" tugmasi (faqat telefonda va o'rnatilmagan bo'lsa),
// iPhone uchun ko'rsatma, push-bildirishnomalar (Sozlamalar → Ovoz va bildirishnomalar → #setPushCard).
// Server: GET /api/push/key, POST /api/push/subscribe|unsubscribe|test, GET/POST /api/users/me/push-prefs;
// socket 'page-visibility' — sahifa ko'rinib tursa server push yubormaydi (saytdagi bildirishnoma yetarli).
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const auth = () => window.authToken ? { Authorization: 'Bearer ' + window.authToken } : {};
  const isStandalone = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isPhone = () => /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) || (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
  const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const st = { deferred: null, reg: null };
  const DISMISS_KEY = 'justChessInstallDismissed';

  // --- Service worker ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => { st.reg = reg; refreshPushCard(); }).catch(() => {});
    });
    // Bildirishnoma bosilganda ochiq oynada kerakli bo'limni ochish
    navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'open-url') openUrl(e.data.url); });
  }
  function openUrl(u) {
    let url;
    try { url = new URL(u, location.origin); } catch (e) { return; }
    if (url.origin !== location.origin) return;
    const prof = url.searchParams.get('profile');
    const VIEWS = { '/': 'home', '/oyin': 'game', '/xabarlar': 'messages', '/ligalar': 'leagues', '/turnirlar': 'tournaments', '/jonli': 'live', '/choyxona': 'tea' };
    if (url.pathname === '/tarix' && url.searchParams.get('u') && window.openGameHistory) return window.openGameHistory(url.searchParams.get('u'));
    if (VIEWS[url.pathname] && typeof window.switchView === 'function' && !(url.pathname === '/' && prof)) window.switchView(VIEWS[url.pathname]);
    if (prof) {
      if (window.currentUser && prof === window.currentUser.username && window.openProfileModal) window.openProfileModal();
      else if (window.openPlayerProfile) window.openPlayerProfile(prof);
    }
  }

  // --- Sahifa ko'rinishi → server (push faqat sayt ko'rinmayotganda) ---
  function reportVisibility() { if (typeof socket !== 'undefined' && socket) socket.emit('page-visibility', { hidden: document.hidden }); }
  document.addEventListener('visibilitychange', reportVisibility);
  document.addEventListener('DOMContentLoaded', () => { if (typeof socket !== 'undefined' && socket) socket.on('connect', reportVisibility); });

  // --- Ilovani o'rnatish ---
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); st.deferred = e; renderInstall(); });
  window.addEventListener('appinstalled', () => { st.deferred = null; renderInstall(); showToast(tx('pwaInstalled', "Ilova o'rnatildi! 🎉"), 'success'); });
  const canInstall = () => !isStandalone() && (st.deferred || isIOS());
  function installButton(dismissible) {
    return `<div class="pwa-install">
      <button type="button" class="pwa-install-btn" data-pwa-install><i class="pwa-ico">📲</i><span>${esc(tx('pwaInstall', "Ilovani o'rnatish"))}</span><small>${esc(tx('pwaInstallSub', 'Telefon ekraningizda — tez ochiladi, bildirishnomalar keladi'))}</small></button>
      ${dismissible ? `<button type="button" class="pwa-install-x" data-pwa-dismiss title="${esc(tx('close', 'Yopish'))}">✕</button>` : ''}
    </div>`;
  }
  function renderInstall() {
    const slot = document.getElementById('pwaInstallSlot');
    if (slot) {
      let dismissed = 0;
      try { dismissed = Number(localStorage.getItem(DISMISS_KEY)) || 0; } catch (e) {}
      const show = canInstall() && isPhone() && Date.now() - dismissed > 14 * 86400000;
      slot.innerHTML = show ? installButton(true) : '';
      bindInstall(slot);
    }
    refreshPushCard();
  }
  function bindInstall(scope) {
    scope.querySelectorAll('[data-pwa-install]').forEach(b => b.addEventListener('click', install));
    scope.querySelectorAll('[data-pwa-dismiss]').forEach(b => b.addEventListener('click', () => {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
      renderInstall();
    }));
  }
  async function install() {
    if (st.deferred) {
      st.deferred.prompt();
      try { await st.deferred.userChoice; } catch (e) {}
      st.deferred = null;
      renderInstall();
      return;
    }
    if (isIOS()) showIOSHelp();
  }
  function showIOSHelp() {
    let m = document.getElementById('pwaIosHelp');
    if (!m) {
      m = document.createElement('div');
      m.id = 'pwaIosHelp';
      m.className = 'pwa-ios-back';
      document.body.appendChild(m);
      m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) m.hidden = true; });
    }
    m.innerHTML = `<div class="pwa-ios">
      <img src="assets/icons/icon-192.png" alt="">
      <h3>${esc(tx('pwaIosTitle', "ChessDom'ni iPhone ekraningizga qo'shing"))}</h3>
      <ol>
        <li>${esc(tx('pwaIos1', "Safari pastidagi «Ulashish» tugmasini bosing (kvadrat va yuqoriga strelka)"))}</li>
        <li>${esc(tx('pwaIos2', "Ro'yxatdan «Bosh ekranga qo'shish» ni tanlang"))}</li>
        <li>${esc(tx('pwaIos3', "«Qo'shish» ni bosing — ilova ekraningizda paydo bo'ladi"))}</li>
      </ol>
      <p>${esc(tx('pwaIosPush', "Bildirishnomalar iOS 16.4 va undan yangi versiyalarda, ilova bosh ekrandan ochilganda ishlaydi."))}</p>
      <button type="button" class="pwa-ios-ok" data-close>${esc(tx('pwaGotIt', 'Tushunarli'))}</button>
    </div>`;
    m.hidden = false;
  }

  // --- Push ---
  function b64ToUint8(base64) {
    const pad = '='.repeat((4 - base64.length % 4) % 4);
    const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }
  const lang = () => (window.i18next && window.i18next.language) || 'en';
  async function registration() { return st.reg || (('serviceWorker' in navigator) ? navigator.serviceWorker.ready : null); }
  async function currentSub() {
    if (!pushSupported()) return null;
    const reg = await registration();
    return reg ? reg.pushManager.getSubscription() : null;
  }
  async function sendSub(sub) {
    if (!window.authToken || !sub) return null;
    return fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth() }, body: JSON.stringify({ subscription: sub.toJSON(), lang: lang() }) }).then(r => r.json()).catch(() => null);
  }
  async function enablePush() {
    if (!pushSupported()) return false;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;
    const key = await fetch('/api/push/key').then(r => r.json()).catch(() => null);
    if (!key || !key.publicKey) { showToast(tx('pwaPushUnavailable', "Server push-bildirishnomalarga hali tayyor emas"), 'warning'); return false; }
    const reg = await registration();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(key.publicKey) });
    const d = await sendSub(sub);
    return !!(d && d.success);
  }
  async function disablePush() {
    const sub = await currentSub();
    if (!sub) return;
    if (window.authToken) await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth() }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
    try { await sub.unsubscribe(); } catch (e) {}
  }
  window.PushUI = { enable: enablePush, disable: disablePush, supported: pushSupported };

  // Kirgan foydalanuvchi va til almashsa — qurilma obunasi serverda yangilanadi
  async function resync() { const sub = await currentSub().catch(() => null); if (sub && Notification.permission === 'granted') sendSub(sub); }
  document.addEventListener('DOMContentLoaded', () => {
    const origAuth = window.applyAuthSession;
    if (typeof origAuth === 'function') window.applyAuthSession = function () { const r = origAuth.apply(this, arguments); setTimeout(resync, 500); return r; };
    const origLang = window.changeLanguage;
    if (typeof origLang === 'function') window.changeLanguage = function () { const r = origLang.apply(this, arguments); setTimeout(resync, 300); return r; };
    // Chiqishda: bu qurilmaga endi shu foydalanuvchining bildirishnomalari kelmasin
    const origLogout = window.handleLogout;
    if (typeof origLogout === 'function') window.handleLogout = async function () {
      const sub = await currentSub().catch(() => null);
      if (sub && window.authToken) await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth() }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
      return origLogout.apply(this, arguments);
    };
    renderInstall();
    setTimeout(resync, 1500);
  });

  // --- Sozlamalar kartasi ---
  let cardEl = null;
  function refreshPushCard() { if (cardEl && document.body.contains(cardEl)) window.renderPushSettings(cardEl); }
  window.renderPushSettings = async function (el) {
    cardEl = el;
    const head = `<h3>📲 ${esc(tx('pwaPushTitle', 'Telefon bildirishnomalari'))}</h3><p class="set-hint">${esc(tx('pwaPushHint', "Sayt yopiq bo'lsa ham o'yinga chaqiruv, xabarlar va boshqa muhim voqealar haqida xabar oling."))}</p>`;
    const installRow = canInstall() ? `<div class="set-row"><span><b>${esc(tx('pwaInstall', "Ilovani o'rnatish"))}</b><small>${esc(tx('pwaInstallSub', 'Telefon ekraningizda — tez ochiladi, bildirishnomalar keladi'))}</small></span><button type="button" class="set-mini accent" data-pwa-install>📲 ${esc(tx('pwaInstallBtn', "O'rnatish"))}</button></div>` : '';
    if (!pushSupported()) {
      const why = isIOS() && !isStandalone() ? tx('pwaPushIosFirst', "iPhone'da avval saytni bosh ekranga o'rnating, so'ng ilovadan yoqing") : tx('pwaPushUnsupported', "Bu brauzer push-bildirishnomalarni qo'llab-quvvatlamaydi");
      el.innerHTML = head + `<div class="set-row"><span><small>${esc(why)}</small></span></div>` + installRow;
      bindInstall(el);
      return;
    }
    const perm = Notification.permission;
    const sub = await currentSub().catch(() => null);
    const on = perm === 'granted' && !!sub;
    let prefs = null, devices = 0;
    if (on && window.authToken) {
      const d = await fetch('/api/users/me/push-prefs', { headers: auth() }).then(r => r.json()).catch(() => null);
      if (d && d.success) { prefs = d.prefs; devices = d.devices; }
    }
    if (cardEl !== el) return;
    const status = perm === 'denied'
      ? `<span class="set-status denied">${esc(tx('setNotifBlocked', "Brauzerda bloklangan — sayt sozlamalaridan ruxsat bering"))}</span>`
      : on ? `<span class="set-status granted">${esc(tx('setNotifOn', 'Yoqilgan ✓'))}</span><button type="button" class="set-mini" data-push-off>${esc(tx('pwaPushOff', "O'chirish"))}</button>`
        : `<button type="button" class="set-mini accent" data-push-on>${esc(tx('setNotifEnable', 'Yoqish'))}</button>`;
    const CATS = [['challenge', '⚔️', 'pwaCatChallenge', "O'yinga chaqiruvlar"], ['message', '💬', 'pwaCatMessage', 'Shaxsiy xabarlar'],
      ['social', '🤝', 'pwaCatSocial', "Do'stlar, raqiblar, ustoz-shogird"], ['events', '🏆', 'pwaCatEvents', 'Liga, yutuqlar, bashoratlar va boshqalar']];
    el.innerHTML = head + `<div class="set-row"><span><b>${esc(tx('pwaPushThisDevice', 'Shu qurilmada'))}</b>${on && devices > 1 ? `<small>${esc(tx('pwaPushDevices', '{{n}} ta qurilmada yoqilgan', { n: devices }))}</small>` : ''}</span><span class="pwa-status">${status}</span></div>`
      + (on && prefs ? CATS.map(([k, ic, key, fb]) => `<label class="set-row set-toggle"><span><b>${ic} ${esc(tx(key, fb))}</b></span><input type="checkbox" data-push-cat="${k}" ${prefs[k] ? 'checked' : ''}><i class="set-switch"></i></label>`).join('')
        + `<div class="set-row"><span><small>${esc(tx('pwaPushSavedNow', "Bu sozlamalar darhol saqlanadi. Sayt ochiq va ko'rinib turganda push yuborilmaydi."))}</small></span><button type="button" class="set-mini" data-push-test>🔔 ${esc(tx('pwaPushTest', 'Sinab ko\'rish'))}</button></div>` : '')
      + installRow;
    bindInstall(el);
    el.querySelectorAll('[data-push-on]').forEach(b => b.addEventListener('click', async () => {
      b.disabled = true;
      const ok = await enablePush().catch(() => false);
      showToast(ok ? tx('pwaPushEnabled', "Bildirishnomalar yoqildi 🔔") : tx('pwaPushFailed', "Bildirishnomalarni yoqib bo'lmadi"), ok ? 'success' : 'warning');
      window.renderPushSettings(el);
    }));
    el.querySelectorAll('[data-push-off]').forEach(b => b.addEventListener('click', async () => { await disablePush(); window.renderPushSettings(el); }));
    el.querySelectorAll('[data-push-cat]').forEach(i => i.addEventListener('change', async () => {
      const body = {};
      el.querySelectorAll('[data-push-cat]').forEach(x => { body[x.dataset.pushCat] = x.checked; });
      await fetch('/api/users/me/push-prefs', { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth() }, body: JSON.stringify(body) }).catch(() => {});
    }));
    el.querySelectorAll('[data-push-test]').forEach(b => b.addEventListener('click', async () => {
      const d = await fetch('/api/push/test', { method: 'POST', headers: auth() }).then(r => r.json()).catch(() => null);
      showToast(d && d.success ? tx('pwaPushTestSent', "Sinov xabari yuborildi — bir necha soniyada keladi") : tx('pwaPushFailed', "Bildirishnomalarni yoqib bo'lmadi"), d && d.success ? 'success' : 'warning');
    }));
  };
})();
