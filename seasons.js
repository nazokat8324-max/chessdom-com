// 🍂 To'rt fasl (2026-11-22, foydalanuvchi so'rovi va tanlovi: zarralar + logoda bezak + kartalar chetida naqsh, Sozlamalarda
// o'chiriladi; «bachkana bo'lmasin» — kam, sekin, xira). Fasl Toshkent vaqti bo'yicha: qish 12–2, bahor 3–5, yoz 6–8, kuz 9–11.
// UMD: `seasonOf(date)` — testlar require qiladi. Brauzerda: <html data-season="winter|spring|summer|autumn"> (yoqiq bo'lsa),
// logoda .cd-season (toj ustida kichik bezak), #seasonFx — .main-wrapper ortidagi zarralar qatlami (matn va tugmalar ustiga tushmaydi;
// o'yin paytida to'xtaydi, «harakatni kamaytirish»da yo'q), kartalar chetidagi naqsh — style.css (`html[data-season]`).
// Sozlama: justChessSettings.seasonDecor (standart — yoqiq), `window.applySeasonDecor(on)`. Testlar: `window.Seasons.force(id)`.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Seasons = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const SEASONS = ['winter', 'spring', 'summer', 'autumn'];
  // Zarang bargi — Kanada bayrog'idagi kabi (2026-11-23, foydalanuvchi so'rovi), 24×24
  const MAPLE = 'M12 1.88L13.63 5.25L15.75 4.13L15.13 9.38L18.25 6.13L19 8.13L22.25 7.25L20.88 10.88L22.5 12L18.25 15.25L19.13 17.13L13.13 16.25L12.75 22.13L11.25 22.13L10.88 16.25L4.88 17.13L5.75 15.25L1.5 12L3.13 10.88L1.75 7.25L5 8.13L5.75 6.13L8.88 9.38L8.25 4.13L10.38 5.25z';
  const TASHKENT = 5 * 3600 * 1000;
  function seasonOf(date) {
    const m = new Date((date ? +date : Date.now()) + TASHKENT).getUTCMonth(); // 0 = yanvar
    return SEASONS[Math.floor(((m + 1) % 12) / 3)];
  }
  const api = { SEASONS, seasonOf };
  if (typeof document === 'undefined') return api;

  // ---- Logodagi bezak — «ChessCaravan» yozuvi chetida (toj 2026-11-23 da olib tashlangan)
  const LOGO = {
    // birinchi harflar ustida qor
    winter: '<svg viewBox="0 0 24 10" width="24" height="10"><path d="M1.2 7.5c0-1.6 1.3-2.2 2.3-1.6.4-1.3 2-1.5 2.6-.3.7-1 2.1-.7 2.2.5H1.2zM8.6 3.6c.2-1.7 2.2-2.3 3.2-1 .9-1.5 3-1 3.2.6.9-.2 1.6.4 1.6 1.2H8.6c-.6 0-.2-.8 0-.8zM16.2 7.5c0-1.2 1.2-1.9 2.2-1.3.5-1.1 2.1-1.2 2.6 0 .9-.4 1.9.3 1.8 1.3h-6.6z" fill="#f4f8ff"/></svg>',
    // yozuv oxirida o'rik guli
    spring: '<svg viewBox="0 0 12 12" width="11" height="11"><g fill="#ffd6e0">' + [0, 72, 144, 216, 288].map((a) => `<ellipse cx="6" cy="3.2" rx="1.9" ry="2.6" transform="rotate(${a} 6 6)"/>`).join('') + '</g><circle cx="6" cy="6" r="1.4" fill="#f2b84b"/></svg>',
    // yozuv oxirida kichik quyosh
    summer: '<svg viewBox="0 0 24 24" width="13" height="13"><circle cx="12" cy="12" r="4.6" fill="#ffd36b"/><g stroke="#ffd36b" stroke-width="2" stroke-linecap="round">' + [0, 45, 90, 135, 180, 225, 270, 315].map((a) => '<path d="M12 2.2v3" transform="rotate(' + a + ' 12 12)"/>').join('') + '</g></svg>',
    // yozuv chetida zarang bargi
    autumn: '<svg viewBox="0 0 24 24" width="12" height="12"><path d="' + MAPLE + '" fill="#d9482b"/></svg>',
  };
  // ---- Zarralar (kichik, xira; har faslda o'z shakli va harakati)
  const leaf = (c) => '<svg viewBox="0 0 24 24"><path d="' + MAPLE + '" fill="' + c + '"/></svg>';
  const FX = {
    winter: { n: [18, 10], size: [5, 12], dur: [14, 26], shapes: [
      '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#fff"/></svg>',
      '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#fff"/></svg>',
      '<svg viewBox="0 0 20 20"><g stroke="#fff" stroke-width="1.6" stroke-linecap="round">' + [0, 60, 120].map((a) => `<path d="M10 2v16M7.5 4.2 10 6.2l2.5-2M7.5 15.8 10 13.8l2.5 2" transform="rotate(${a} 10 10)"/>`).join('') + '</g></svg>'] },
    spring: { n: [14, 8], size: [8, 13], dur: [16, 28], shapes: [
      '<svg viewBox="0 0 12 10"><path d="M1 6c2-5 8-6 10-4-1 4-6 7-10 4z" fill="#ffd1dc"/></svg>',
      '<svg viewBox="0 0 12 10"><path d="M1 6c2-5 8-6 10-4-1 4-6 7-10 4z" fill="#fff0f4"/></svg>',
      '<svg viewBox="0 0 12 10"><path d="M1 6c2-5 8-6 10-4-1 4-6 7-10 4z" fill="#f7b6c8"/></svg>'] },
    summer: { n: [14, 8], size: [3, 7], dur: [10, 18], rise: true, shapes: [
      '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#ffe08a"/></svg>',
      '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#fff4c2"/></svg>'] },
    autumn: { n: [12, 7], size: [11, 17], dur: [15, 26], shapes: [leaf('#e8892e'), leaf('#c4472b'), leaf('#e3b23c'), leaf('#a8562a')] },
  };

  let on = true, forced = null, host = null, shown = null;
  const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const rnd = (a, b) => a + Math.random() * (b - a);
  function place() {
    const wrap = document.querySelector('.main-wrapper');
    if (!host || host.hidden || !wrap) return;
    const r = wrap.getBoundingClientRect();
    host.style.left = r.left + 'px'; host.style.top = r.top + 'px';
    host.style.width = r.width + 'px'; host.style.height = r.height + 'px';
  }
  function particles(season) {
    const wrap = document.querySelector('.main-wrapper');
    if (!wrap) return;
    if (!host) { host = document.createElement('div'); host.id = 'seasonFx'; host.setAttribute('aria-hidden', 'true'); }
    if (host.parentNode !== wrap) wrap.appendChild(host); // #bgFx dan keyin — uning ustida, kontent ostida
    host.hidden = false;
    place();
    if (shown === season) return;
    shown = season;
    const fx = FX[season], phone = window.innerWidth <= 768;
    let html = '';
    for (let i = 0; i < fx.n[phone ? 1 : 0]; i++) {
      const s = rnd(fx.size[0], fx.size[1]), d = rnd(fx.dur[0], fx.dur[1]);
      html += `<i style="left:${rnd(0, 100).toFixed(1)}%;width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;--d:${d.toFixed(1)}s;--dl:-${rnd(0, d).toFixed(1)}s;--s:${rnd(2.5, 5).toFixed(1)}s;opacity:${rnd(0.45, 0.8).toFixed(2)}">${fx.shapes[i % fx.shapes.length]}</i>`;
    }
    host.className = fx.rise ? 'rise' : '';
    host.innerHTML = html;
  }
  function logo(season) {
    document.querySelectorAll('.logo-area .chessdom-text').forEach((c) => {
      let el = c.querySelector('.cd-season');
      if (!season) { if (el) el.remove(); return; }
      if (!el) { el = document.createElement('span'); el.className = 'cd-season'; el.setAttribute('aria-hidden', 'true'); c.appendChild(el); }
      if (el.dataset.s !== season) { el.dataset.s = season; el.innerHTML = LOGO[season]; }
    });
  }
  function update() {
    const season = on ? (forced || seasonOf()) : null;
    const html = document.documentElement;
    if (season) html.dataset.season = season; else delete html.dataset.season;
    logo(season);
    if (season && !reduce.matches) particles(season);
    else if (host) { host.hidden = true; host.innerHTML = ''; shown = null; }
  }
  window.applySeasonDecor = function (enabled) { on = enabled !== false; update(); };
  api.force = function (id) { forced = SEASONS.includes(id) ? id : null; shown = null; update(); };
  api.current = () => (on ? forced || seasonOf() : null);
  window.addEventListener('resize', place);
  document.addEventListener('DOMContentLoaded', () => {
    try { on = JSON.parse(localStorage.getItem('justChessSettings') || '{}').seasonDecor !== false; } catch (e) { /* standart — yoqiq */ }
    const wrap = document.querySelector('.main-wrapper');
    if (wrap && window.ResizeObserver) new ResizeObserver(place).observe(wrap);
    update();
    // Fasl almashishi (sahifa uzoq ochiq qolsa) — soatiga bir marta tekshiriladi; bazaga murojaat yo'q
    setInterval(() => { if (on && !forced && document.documentElement.dataset.season !== seasonOf()) update(); }, 3600 * 1000);
  });
  return api;
});
