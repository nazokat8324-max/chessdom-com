// 🌌 Harakatli fon (2026-11-22, foydalanuvchi so'rovi: Kosmos «jonliroq»). To'plam fonida harakatli qatlam bo'lsa (FX) va
// Sozlamalar → To'plamlar → «Fon harakati» yoqiq bo'lsa (justChessSettings.bgMotion, standart — yoqiq) va qurilmada «harakatni
// kamaytirish» yoqilmagan bo'lsa: <html class="bg-motion"> — fon sayyorasiz asosga (img/backgrounds/<id>-base.svg) almashadi,
// ustiga #bgFx — img/backgrounds/<id>-fx.svg sahifaga joylanadi (sayyoralar sekin tebranadi, yulduzlar miltillaydi, uchar yulduzlar).
// Qatlam .main-wrapper bilan aynan ustma-ust (ikkalasi ham markazdan «cover»); o'yin paytida harakat to'xtaydi (CSS).
(function () {
  const FX = ['kosmos'];
  const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false, addEventListener() {} };
  const cache = {};
  let host = null, current = null;
  window.__bgMotion = true;
  const wanted = () => {
    const bg = document.documentElement.dataset.bg;
    return bg && FX.includes(bg) && window.__bgMotion !== false && !reduce.matches ? bg : null;
  };
  function place() {
    const wrap = document.querySelector('.main-wrapper');
    if (!host || host.hidden || !wrap) return;
    const r = wrap.getBoundingClientRect();
    host.style.left = r.left + 'px'; host.style.top = r.top + 'px';
    host.style.width = r.width + 'px'; host.style.height = r.height + 'px';
  }
  async function update() {
    const id = wanted();
    document.documentElement.classList.toggle('bg-motion', !!id);
    if (!id) { if (host) { host.hidden = true; host.innerHTML = ''; } current = null; return; }
    const wrap = document.querySelector('.main-wrapper');
    if (!wrap) return;
    if (!host) { host = document.createElement('div'); host.id = 'bgFx'; host.setAttribute('aria-hidden', 'true'); wrap.prepend(host); }
    host.hidden = false;
    place();
    if (current === id) return;
    current = id;
    try { cache[id] = cache[id] || await fetch('img/backgrounds/' + id + '-fx.svg').then((r) => (r.ok ? r.text() : '')); } catch (e) { cache[id] = ''; }
    if (current === id) host.innerHTML = cache[id];
  }
  window.applyBgMotion = function (on) { window.__bgMotion = on !== false; update(); };
  window.addEventListener('resize', place);
  if (reduce.addEventListener) reduce.addEventListener('change', update);
  document.addEventListener('DOMContentLoaded', () => {
    try { window.__bgMotion = JSON.parse(localStorage.getItem('justChessSettings') || '{}').bgMotion !== false; } catch (e) { /* standart — yoqiq */ }
    new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ['data-bg'] });
    const wrap = document.querySelector('.main-wrapper');
    if (wrap && window.ResizeObserver) new ResizeObserver(place).observe(wrap);
    update();
  });
})();
