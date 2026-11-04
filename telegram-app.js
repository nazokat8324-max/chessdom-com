// 📱 Telegram Mini App: sayt Telegram ichida ochilganda (bot menyusi yoki "♞ ChessCaravan" tugmasi).
// Telegram'ning tashqi skripti (telegram-web-app.js) yuklanmaydi — kirish ma'lumoti manzil hash'ida keladi
// (#tgWebAppData=…), index.html <head> dagi kod uni sessionStorage 'justChessTgApp' ga yozib, manzildan olib tashlaydi.
// Telegram'i ulangan o'yinchi parolsiz kiradi (POST /api/telegram/webapp/login — server imzoni tekshiradi);
// ulanmagan bo'lsa oddiy kirish/ro'yxatdan o'tish, so'ng shu Telegram akkauntga ulanadi (/webapp/link) — keyingi safar avtomatik.
(function () {
  let initData = null;
  try { initData = sessionStorage.getItem('justChessTgApp'); } catch (e) {}
  window.isTelegramApp = !!initData;
  if (!initData) return;

  // Telegram ilovasiga hodisa (mobil webview, Desktop, web.telegram.org iframe)
  const post = (type, data) => {
    const body = JSON.stringify(data || {});
    try {
      if (window.TelegramWebviewProxy && typeof window.TelegramWebviewProxy.postEvent === 'function') return window.TelegramWebviewProxy.postEvent(type, body);
      if (window.external && typeof window.external.notify === 'function') return window.external.notify(JSON.stringify({ eventType: type, eventData: data || {} }));
      if (window.parent && window.parent !== window) window.parent.postMessage(JSON.stringify({ eventType: type, eventData: data || {} }), 'https://web.telegram.org');
    } catch (e) {}
  };
  post('web_app_ready');
  post('web_app_expand');

  const st = { needLink: false, linking: false, asked: false };
  const json = (url, body, auth) => fetch(url, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, auth && window.authToken ? { Authorization: 'Bearer ' + window.authToken } : {}),
    body: JSON.stringify(body)
  }).then((r) => r.json().catch(() => ({})).then((d) => Object.assign({ status: r.status }, d)));

  // Kirish sahifasida eslatma: kirsangiz/ro'yxatdan o'tsangiz, keyingi safar Telegram orqali avtomatik
  function showNote() {
    const gate = document.getElementById('authGate');
    if (!gate || gate.querySelector('.tg-app-note')) return;
    const box = gate.querySelector('.auth-panel') || gate;
    const note = document.createElement('div');
    note.className = 'tg-app-note';
    note.textContent = '✈️ ' + tx('tgAppNote', "Bir marta kiring yoki ro'yxatdan o'ting — keyingi safar Telegram orqali avtomatik kirasiz.");
    box.insertBefore(note, box.firstChild);
  }
  const isGuest = () => typeof window.isGuestUser === 'function' && window.isGuestUser();

  async function link() {
    if (!st.needLink || st.linking || !window.authToken || isGuest()) return;
    st.linking = true;
    try {
      const d = await json('/api/telegram/webapp/link', { initData, lang: typeof window.uiLang === 'function' ? window.uiLang() : undefined }, true);
      if (d.success) {
        st.needLink = false;
        const n = document.querySelector('.tg-app-note');
        if (n) n.remove();
        if (typeof window.showToast === 'function') window.showToast(tx('tgAppLinked', "✈️ Telegram ulandi — endi bu yerda avtomatik kirasiz"), 'success');
      }
    } catch (e) {}
    st.linking = false;
  }

  // Til: Telegram ichidagi brauzer saytdagi tanlovni bilmaydi — saqlangan til bo'lmasa, akkauntdagi (bot ulanganda saqlangan) yoki
  // Telegram ilovasining tili (initData user.language_code); qo'llab-quvvatlanmasa — standart (inglizcha)
  const SITE_LANGS = ['uz', 'uzc', 'en', 'ru', 'es', 'de', 'fr', 'tr', 'kk', 'tg', 'ky', 'tk', 'az', 'zh', 'it'];
  function useLang(code) {
    // Sayt ishga tushganda tilni o'zi saqlab qo'yadi ('en') — shuning uchun foydalanuvchi tanlaganmi, <head> da (skriptlardan oldin) eslab qolingan
    const saved = window.__tgLangChosen;
    const l = String(code || '').toLowerCase();
    const pick = SITE_LANGS.includes(l) ? l : SITE_LANGS.includes(l.slice(0, 2)) ? l.slice(0, 2) : null;
    if (saved || !pick || pick === 'en' || typeof window.setLanguage !== 'function') return;
    try { localStorage.setItem('justChessLang', pick); } catch (e) {}
    window.setLanguage(pick);
    if (typeof window.updateLanguageButton === 'function') window.updateLanguageButton(pick);
  }
  let tgLang = null;
  try { tgLang = (JSON.parse(new URLSearchParams(initData).get('user') || '{}') || {}).language_code || null; } catch (e) {}

  async function start() {
    if (st.asked) return;
    st.asked = true;
    try {
      const d = await json('/api/telegram/webapp/login', { initData });
      if (!d.success) return; // muddati o'tgan yoki noto'g'ri ma'lumot — oddiy sayt kabi ishlaydi
      useLang(d.linked && d.lang ? d.lang : tgLang);
      if (d.linked) {
        // Ulangan: kirmagan bo'lsa — kiramiz (boshqa akkaunt bilan kirib turgan bo'lsa, unga tegmaymiz)
        if (!window.authToken && d.token && typeof window.applyAuthSession === 'function') {
          window.applyAuthSession(d.user, d.token);
          // applyAuthSession kirish oynasini o'zi yopmaydi (parol/mehmon kirishidagi kabi): oyna, sarlavha va ochilgan bo'lim
          if (typeof window.hideAuthGate === 'function') window.hideAuthGate();
          if (typeof window.updateAuthHeaderUI === 'function') window.updateAuthHeaderUI();
          // Bildirishnoma tugmasi aniq sahifani ochgan bo'lsa (/xabarlar …) — router.js kirmaganda uni pendingRoute ga yozgan, home o'sha yerga o'tkazadi
          if (typeof window.switchView === 'function') window.switchView('home');
        }
        return;
      }
      st.needLink = true;
      if (window.authToken && !isGuest()) link(); else showNote();
    } catch (e) {}
  }

  // Har qanday kirish (parol, ro'yxat, mehmondan ro'yxatga o'tish) dan keyin — ulash
  const wrap = () => {
    const orig = window.applyAuthSession;
    if (typeof orig !== 'function' || orig.__tgApp) return;
    const w = function () { const r = orig.apply(this, arguments); setTimeout(link, 0); return r; };
    w.__tgApp = true;
    window.applyAuthSession = w;
  };
  wrap();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { wrap(); start(); });
  else start();
})();
