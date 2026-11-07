// 👋 Yangi o'yinchi uchun tanishuv (2026-11-07, foydalanuvchi tanlovi: bir martalik oyna, faqat ro'yxatdan o'tganlar).
// Kirgandan keyin bir marta 3 qadam: 🌍 davlat (users.country — syncMyCountry), 🛡️ shu davlat klubiga qo'shilish
// (POST /api/country-clubs/join), ⚡ birinchi o'yin (quickPlayOnline). Uchala qadam bajarilgan bo'lsa (eski o'yinchilar) — ko'rsatilmaydi.
// Mehmonga, o'yin/taklif paytida ko'rsatilmaydi. «Keyinroq» / ✕ / Esc — yopiladi va qayta chiqmaydi (localStorage justChessOnboarded:
// foydalanuvchi id lari ro'yxati; "all" — hech kimga, UI testlar uchun). Bosh sahifaga hech narsa qo'shilmaydi.
(function () {
  const KEY = 'justChessOnboarded';
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = { open: false, country: null, club: null, busy: false };

  function seen() {
    try { const v = localStorage.getItem(KEY); return v === 'all' ? 'all' : JSON.parse(v || '[]'); } catch (e) { return []; }
  }
  function markSeen(id) {
    try { const v = seen(); if (v === 'all' || !id) return; if (!v.includes(id)) v.push(id); localStorage.setItem(KEY, JSON.stringify(v.slice(-20))); } catch (e) {}
  }
  const user = () => window.currentUser || null;
  const validCountry = (c) => !!c && c !== 'un' && typeof allCountries !== 'undefined' && allCountries.some((x) => x.code === c);
  const gamesPlayed = () => { const s = window.stats || (user() && user().stats) || {}; return (Number(s.wins) || 0) + (Number(s.losses) || 0) + (Number(s.draws) || 0); };
  const countryOf = (code) => (typeof allCountries !== 'undefined' ? allCountries.find((x) => x.code === code) : null);
  const localName = (c) => (typeof window.countryName === 'function' ? window.countryName(c.name, c.code) : c.name);
  const flag = (code) => `<img class="ob-flag" src="https://flagcdn.com/w40/${esc(code)}.png" alt="" onerror="this.remove()">`;

  function steps() {
    const u = user() || {};
    const country = validCountry(st.country || u.country) ? (st.country || u.country) : null;
    const club = st.club || (u.club && u.club.name ? u.club : null);
    return { country, club, played: gamesPlayed() > 0 };
  }

  function shouldShow() {
    const u = user();
    if (!u || u.guest || !window.authToken || st.open) return false;
    const s = seen();
    if (s === 'all' || s.includes(u.id)) return false;
    if (window.currentRoomId || (window.isOnlineMode && window.opponentFound)) return false; // o'yin davomida emas
    try { if (localStorage.getItem('justChessInvite')) return false; } catch (e) {} // taklif havolasi bilan keldi — o'yin o'zi boshlanadi
    if (document.body.classList.contains('auth-locked')) return false;
    const x = steps();
    if (x.country && x.club && x.played) { markSeen(u.id); return false; }
    return true;
  }

  function close() {
    const el = document.getElementById('obModal');
    if (el) el.remove();
    st.open = false;
    document.removeEventListener('keydown', onKey);
    if (user()) markSeen(user().id);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  function render() {
    let el = document.getElementById('obModal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'obModal';
      el.className = 'ob-overlay';
      document.body.appendChild(el);
    }
    const x = steps();
    const list = (typeof allCountries !== 'undefined' ? allCountries.slice() : []).sort((a, b) => localName(a).localeCompare(localName(b)));
    const c = x.country ? countryOf(x.country) : null;
    const done = (ok) => (ok ? '<span class="ob-ok">✓</span>' : '');
    el.innerHTML = `<div class="ob-card" role="dialog" aria-modal="true" aria-labelledby="obTitle">
      <button type="button" class="ob-x" data-ob-close aria-label="${esc(tx('close', 'Yopish'))}">✕</button>
      <h2 id="obTitle">👋 ${esc(tx('obTitle', "ChessCaravan'ga xush kelibsiz!"))}</h2>
      <p class="ob-sub">${esc(tx('obSub', '3 qadamda boshlang — har biri bir daqiqa ham olmaydi.'))}</p>
      <ol class="ob-steps">
        <li class="ob-step${x.country ? ' done' : ''}">
          <div class="ob-head"><span class="ob-n">1</span><b>🌍 ${esc(tx('obStep1', 'Davlatingizni tanlang'))}</b>${done(x.country)}</div>
          <small>${esc(tx('obStep1Hint', "Bayrog'ingiz o'yinlarda raqibga ko'rinadi, pasportingizga muhrlar shu bo'yicha bosiladi."))}</small>
          ${c ? `<div class="ob-chosen">${flag(c.code)}${esc(localName(c))}</div>` : `<div class="ob-row">
            <select id="obCountry" aria-label="${esc(tx('obStep1', 'Davlatingizni tanlang'))}"><option value="">—</option>${list.map((k) => `<option value="${esc(k.code)}">${esc(localName(k))}</option>`).join('')}</select>
            <button type="button" class="ob-btn" data-ob-country>${esc(tx('obSave', 'Saqlash'))}</button></div>`}
        </li>
        <li class="ob-step${x.club ? ' done' : ''}${x.country ? '' : ' locked'}">
          <div class="ob-head"><span class="ob-n">2</span><b>🛡️ ${esc(tx('obStep2', 'Davlatingiz klubiga qo\'shiling'))}</b>${done(x.club)}</div>
          <small>${esc(tx('obStep2Hint', "Har g'alabangiz klubingizga ochko beradi va bayrog'ingizni Bayroqlar bellashuvi xaritasida yoyadi."))}</small>
          ${x.club ? `<div class="ob-chosen">${flag(x.club.code)}${esc(localName({ name: x.club.name, code: x.club.code }))}</div>`
            : `<button type="button" class="ob-btn" data-ob-club${x.country ? '' : ' disabled'}>${esc(tx('obJoin', "Klubga qo'shilish"))}</button>`}
        </li>
        <li class="ob-step${x.played ? ' done' : ''}">
          <div class="ob-head"><span class="ob-n">3</span><b>⚡ ${esc(tx('obStep3', "Birinchi o'yiningiz"))}</b>${done(x.played)}</div>
          <small>${esc(tx('obStep3Hint', "Sizga mos raqib bir necha soniyada topiladi. Har o'yin karvoningizni Ipak yo'li bo'ylab oldinga yuradi."))}</small>
          ${x.played ? '' : `<button type="button" class="ob-btn accent" data-ob-play>${esc(tx('obPlay', "⚡ Onlayn o'ynash"))}</button>`}
        </li>
      </ol>
      <div class="ob-foot"><button type="button" class="ob-later" data-ob-close>${esc(x.country && x.club ? tx('obFinish', 'Tayyor') : tx('obLater', 'Keyinroq'))}</button></div>
    </div>`;
    el.querySelectorAll('[data-ob-close]').forEach((b) => b.addEventListener('click', close));
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    const cBtn = el.querySelector('[data-ob-country]');
    if (cBtn) cBtn.addEventListener('click', saveCountry);
    const jBtn = el.querySelector('[data-ob-club]');
    if (jBtn) jBtn.addEventListener('click', joinClub);
    const pBtn = el.querySelector('[data-ob-play]');
    if (pBtn) pBtn.addEventListener('click', () => { close(); if (typeof window.quickPlayOnline === 'function') window.quickPlayOnline(); else window.switchView('game'); });
  }

  function saveCountry() {
    const sel = document.getElementById('obCountry');
    const code = sel && sel.value;
    if (!validCountry(code)) { if (typeof window.showToast === 'function') window.showToast(tx('obPickCountry', "Ro'yxatdan davlatingizni tanlang"), 'warning'); return; }
    st.country = code;
    try { const s = JSON.parse(localStorage.getItem('justChessSettings') || '{}'); s.country = code; localStorage.setItem('justChessSettings', JSON.stringify(s)); } catch (e) {}
    if (typeof window.syncMyCountry === 'function') window.syncMyCountry(code);
    render();
  }

  async function joinClub() {
    const x = steps();
    const c = x.country && countryOf(x.country);
    if (!c || st.busy) return;
    st.busy = true;
    try {
      const r = await fetch('/api/country-clubs/join', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window.authToken }, body: JSON.stringify({ country: c.name, code: c.code }) }).then((res) => res.json());
      if (r && r.success && r.club) {
        st.club = r.club;
        if (window.currentUser) { window.currentUser.club = r.club; localStorage.setItem('justChessCurrentUser', JSON.stringify(window.currentUser)); }
        if (typeof window.showToast === 'function') window.showToast(tx('obJoined', "Klubga qo'shildingiz! 🛡️"), 'success');
      } else if (r && r.reason === 'already_in_club' && r.club) {
        st.club = r.club; // boshqa klubda — o'tkazmaymiz, qadam bajarilgan
      } else if (typeof window.showToast === 'function') window.showToast((typeof tServer === 'function' && tServer(r && r.message)) || tx('errGeneric', 'Xatolik yuz berdi!'), 'warning');
    } catch (e) {
      if (typeof window.showToast === 'function') window.showToast(tx('errGeneric', 'Xatolik yuz berdi!'), 'warning');
    }
    st.busy = false;
    if (st.open) render();
  }

  function maybeShow() {
    if (!shouldShow()) return;
    st.open = true;
    st.country = null; st.club = null;
    render();
    document.addEventListener('keydown', onKey);
  }
  window.openWelcomeGuide = function () { st.open = false; const u = user(); if (!u || u.guest) return; st.open = true; render(); document.addEventListener('keydown', onKey); };

  // Kirgandan keyin (ro'yxatdan o'tish ham shu yo'ldan) va sahifa ochilganda saqlangan sessiya bilan
  function wrap() {
    const orig = window.applyAuthSession;
    if (typeof orig !== 'function' || orig.__ob) return;
    const w = function () { const r = orig.apply(this, arguments); setTimeout(maybeShow, 1500); return r; };
    w.__ob = true;
    window.applyAuthSession = w;
  }
  wrap();
  document.addEventListener('DOMContentLoaded', () => { wrap(); setTimeout(maybeShow, 2500); });
})();
