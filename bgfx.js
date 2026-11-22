// 🌌 Harakatli fon (2026-11-22, foydalanuvchi so'rovi: Kosmos «jonliroq»). To'plam fonida harakatli qatlam bo'lsa (FX) va
// Sozlamalar → To'plamlar → «Fon harakati» yoqiq bo'lsa (justChessSettings.bgMotion, standart — yoqiq) va qurilmada «harakatni
// kamaytirish» yoqilmagan bo'lsa: <html class="bg-motion"> — fon sayyorasiz asosga (img/backgrounds/<id>-base.svg) almashadi,
// ustiga #bgFx — img/backgrounds/<id>-fx.svg sahifaga joylanadi (har to'plamda o'z harakati: tuyalar, turnalar, yulduzlar, sayyoralar…).
// Qatlam .main-wrapper bilan aynan ustma-ust (ikkalasi ham markazdan «cover»); o'yin paytida harakat to'xtaydi (CSS).
// 🎞 Fon sahnasi (2026-11-23): .main-wrapper foni va harakatli qatlam #bgFx — body ichidagi bitta fixed qatlam #fxStage
// (z-index −1, .main-wrapper o'lchamida). Avval #bgFx .main-wrapper ichida edi va wrapperga isolation berilardi — telefonda sarlavhadagi
// ⚙️/🔔 (.nf-wrap, fixed z 900) wrapper ichida qamalib, sarlavha ostida qolib bosilmasdi. Qatlam ko'rinib tursa — <html class="fx-stage">
// (wrapper foni shaffof, fon sahnada).
window.fxStage = (function () {
  let stage = null;
  function place() {
    const wrap = document.querySelector('.main-wrapper');
    if (!stage || !wrap) return;
    const r = wrap.getBoundingClientRect();
    stage.style.left = r.left + 'px'; stage.style.top = r.top + 'px';
    stage.style.width = r.width + 'px'; stage.style.height = r.height + 'px';
  }
  function get() {
    if (!stage) {
      stage = document.createElement('div'); stage.id = 'fxStage'; stage.setAttribute('aria-hidden', 'true');
      document.body.prepend(stage);
      const wrap = document.querySelector('.main-wrapper');
      if (wrap && window.ResizeObserver) new ResizeObserver(place).observe(wrap);
      window.addEventListener('resize', place);
    }
    place();
    return stage;
  }
  function refresh() {
    const on = !!stage && Array.from(stage.children).some((c) => !c.hidden);
    document.documentElement.classList.toggle('fx-stage', on);
    place();
  }
  return { get, refresh, place };
})();

(function () {
  // Har to'plamda harakatli qatlam bor (2026-11-22, «boshqa to'plamlarning fonlarini ham jonli qil») — bundles.js BUNDLES bilan bir xil
  const FX = ['karvon', 'classic', 'clear', 'atlas', 'rishton', 'wood', 'royal', 'neon', 'geo', 'cute', 'pixel', 'tanga', 'samarqand', 'origami', 'kosmos'];
  const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false, addEventListener() {} };
  const cache = {};
  let host = null, current = null;
  window.__bgMotion = true;
  const wanted = () => {
    const bg = document.documentElement.dataset.bg;
    return bg && FX.includes(bg) && window.__bgMotion !== false && !reduce.matches ? bg : null;
  };
  const place = () => window.fxStage.place();
  async function update() {
    const id = wanted();
    document.documentElement.classList.toggle('bg-motion', !!id);
    if (!id) { if (host) { host.hidden = true; host.innerHTML = ''; } current = null; window.fxStage.refresh(); return; }
    if (!document.querySelector('.main-wrapper')) return;
    if (!host) { host = document.createElement('div'); host.id = 'bgFx'; host.setAttribute('aria-hidden', 'true'); }
    const stage = window.fxStage.get();
    if (host.parentNode !== stage) stage.prepend(host);
    host.hidden = false;
    window.fxStage.refresh();
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
