// 🌸 Bayramlar klienti (holidays.js — sanalar): GET /api/holiday → html[data-holiday] (taxta "Mavzuga mos" bo'lsa bayram ranglari),
// bir martalik tabrik (justChessHolidaySeen), Karvon yo'li sahifasida bayram kartasi .cv-holiday (vazifa progressi yoki keyingi bayram).
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lang = () => (window.uiLang ? window.uiLang() : String((window.i18next && window.i18next.language) || 'en').slice(0, 2));
  const hName = (key) => (window.Holidays ? window.Holidays.name(key, lang()) : key);
  const st = { data: null, at: 0 };

  async function load(force) {
    if (!force && st.data && Date.now() - st.at < 5 * 60 * 1000) return st.data;
    try {
      const headers = window.authToken ? { Authorization: 'Bearer ' + window.authToken } : {};
      const d = await fetch('/api/holiday', { headers }).then((r) => r.json());
      if (d && d.success) { st.data = d; st.at = Date.now(); }
    } catch (e) {}
    apply();
    return st.data;
  }

  function apply() {
    const h = st.data && st.data.active && st.data.active[0];
    if (h) document.documentElement.setAttribute('data-holiday', h.key);
    else document.documentElement.removeAttribute('data-holiday');
    if (!h || !window.currentUser) return;
    // Bir martalik tabrik (har bayram, har yil)
    const seenKey = h.key + ':' + h.year;
    let seen = null;
    try { seen = localStorage.getItem('justChessHolidaySeen'); } catch (e) {}
    if (seen === seenKey) return;
    try { localStorage.setItem('justChessHolidaySeen', seenKey); } catch (e) {}
    setTimeout(() => showToast(h.icon + ' ' + tx('hdGreeting', '{{name}} muborak! Bayram vazifasi: {{n}} ta o\'yin o\'ynang va esdalik nishonini oling.', { name: hName(h.key), n: h.need }), 'success', 7000), 1500);
  }

  function leftText(ms) {
    const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5);
    return d > 0 ? tx('hdDaysHours', '{{d}} kun {{h}} soat', { d, h }) : tx('hdHours', '{{h}} soat', { h: Math.max(1, h) });
  }

  function cardHtml(d) {
    if (!d) return '';
    const act = d.active || [];
    if (act.length) {
      return act.map((h) => {
        const mine = h.mine;
        const done = mine && mine.done;
        const have = mine ? Math.min(mine.have, h.need) : 0;
        return `<div class="cv-card cv-holiday on${done ? ' done' : ''}">
          <div class="hd-ico">${esc(h.icon)}</div>
          <div class="hd-main">
            <h2>${esc(tx('hdTitle', '{{name}} muborak!', { name: hName(h.key) }))}</h2>
            <p>${esc(done ? tx('hdDone', "Bayram nishoni olindi — u profilingizdagi 🎖️ Nishonlar bo'limida.") : tx('hdTask', "Bayram vazifasi: {{n}} ta o'yin o'ynang — esdalik nishoni «{{badge}}»", { n: h.need, badge: hName(h.key) + ' ' + h.year }))}</p>
            ${mine ? `<div class="hd-bar"><i style="width:${Math.round((have / h.need) * 100)}%"></i></div><small>${esc(have)}/${esc(h.need)} · ${esc(tx('hdLeft', '{{t}} qoldi', { t: leftText(new Date(h.endsAt).getTime() - Date.now()) }))}</small>` : ''}
          </div>
          ${!done ? `<button type="button" class="hd-play" data-hd-play>${esc(tx('cvPlay', "O'ynab, oldinga yurish"))}</button>` : ''}
        </div>`;
      }).join('');
    }
    if (!d.next) return '';
    const days = Math.max(1, Math.ceil((new Date(d.next.startsAt).getTime() - Date.now()) / 864e5));
    return `<div class="cv-card cv-holiday">
      <div class="hd-ico">${esc(d.next.icon)}</div>
      <div class="hd-main"><h2>${esc(tx('hdNext', 'Keyingi bayram: {{name}}', { name: hName(d.next.key) }))}</h2>
        <p>${esc(tx('hdNextIn', "{{n}} kundan keyin. Bayram kunlarida {{need}} ta o'yin o'ynab, esdalik nishonini oling.", { n: days, need: d.next.need }))}</p></div>
    </div>`;
  }

  function mountCard() {
    const root = document.getElementById('caravanRoot');
    if (!root || !st.data || !window.currentUser || window.currentUser.guest) return;
    const old = root.querySelector('.hd-wrap');
    if (old) old.remove();
    const wrap = document.createElement('div');
    wrap.className = 'hd-wrap';
    wrap.innerHTML = cardHtml(st.data);
    if (!wrap.innerHTML.trim()) return;
    const hero = root.firstElementChild;
    if (hero && hero.nextSibling) root.insertBefore(wrap, hero.nextSibling); else root.appendChild(wrap);
    const play = wrap.querySelector('[data-hd-play]');
    if (play) play.onclick = () => { if (typeof window.quickPlayOnline === 'function') window.quickPlayOnline(); else window.switchView('game'); };
  }

  const origCv = window.renderCaravanView;
  if (typeof origCv === 'function') {
    window.renderCaravanView = async function () {
      const r = await origCv.apply(this, arguments);
      await load(true);
      const v = document.getElementById('caravanView');
      if (v && v.classList.contains('active-view')) mountCard();
      return r;
    };
  }

  window.refreshHoliday = () => load(true);
  // Kirgandan keyin va har 30 daqiqada (bayram yarim tunda boshlanadi)
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => load(true), 2500);
    setInterval(() => load(true), 30 * 60 * 1000);
  });
  if (typeof socket !== 'undefined' && socket && socket.on) socket.on('game-ended', () => { st.at = 0; });
})();
