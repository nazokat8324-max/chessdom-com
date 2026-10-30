// 🐪 Karvon yo'li — telefon (tik holat, ≤768px) uchun pastki navigatsiya. Oddiy tugmalar o'rniga to'lqinli yo'l:
// 5 bekat (Bosh sahifa, O'yin, Choyxona, Xabarlar, "Ko'proq"), faol bekat ustida tuya. Bo'lim almashganda tuya yo'l bo'ylab
// yurib boradi, sahifa karvon yurgan tomondan kirib keladi. Barmoq bilan yo'l bo'ylab surish — tuya ergashadi, qo'yib
// yuborilganda eng yaqin bekat ochiladi. 5-bekat — "Barcha bo'limlar" xaritasi (#cvRouteMap): qolgan bo'limlar
// ilonizi yo'l bo'yidagi bekatlar. Ma'lumot manbai — mavjud yon menyu (.menu-list): nomlar (tarjima), belgilar, faol bo'lim,
// nishonlar shu yerdan olinadi, shuning uchun router/switchView o'zgarmaydi. Kompyuter va yon holatdagi telefon — eski menyu.
(function () {
  const MAIN = ['navHome', 'navPlay', 'navTea', 'navMessages', 'navMore'];
  const VIEWS = ['home', 'game', 'tea', 'messages', null];
  const W = 400, Y = [42, 28, 42, 28, 42]; // yo'l koordinatalari (viewBox 0 0 400 64), bekatlar x = 40..360
  const X = [40, 120, 200, 280, 360];
  const wide = window.matchMedia('(max-width: 768px)');
  const landscape = window.matchMedia('(orientation: landscape) and (max-height: 500px)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const st = { el: null, map: null, path: null, lens: [], idx: -1, len: null, raf: 0, drag: null };

  const esc = (v) => {
    const div = document.createElement('div');
    div.textContent = (v === null || v === undefined) ? '' : String(v);
    return div.innerHTML.replace(/"/g, '&quot;');
  };
  const enabled = () => wide.matches && !landscape.matches;
  const labelOf = (item) => {
    const s = item && [...item.querySelectorAll('span')].find((x) => !x.classList.contains('icon') && !x.classList.contains('lg-nav-badge'));
    return s ? s.textContent.trim() : '';
  };
  const iconOf = (item) => { const s = item && item.querySelector('.icon'); return s ? s.textContent.trim() : ''; };
  const badgeOf = (item) => { const b = item && item.querySelector('.lg-nav-badge'); return b && b.style.display !== 'none' ? Number(b.textContent) || 0 : 0; };

  // Tuya — o'zimiz chizgan siluet (emoji har telefonda boshqacha ko'rinadi)
  const CAMEL = '<svg viewBox="0 0 48 36" aria-hidden="true"><path d="M5 31V22.5C5 17 8.2 13.4 12.6 13.4C14.4 7.6 20.4 6.8 22.6 12C24.8 8.4 29.6 8.6 31.2 13.2C32.4 13.6 33.4 14.4 34 15.4L37.4 8.6C38.2 6.4 40.6 5.4 42.6 6.4L44.6 7.6L43.4 9.4H41.2L38.6 17.6C37.8 20.6 35.8 22.6 33.2 23.2V31H30.6L29.6 24.2H15.2L14.4 31H11.8L11.6 24C9.4 24.4 8 26.4 7.8 31Z"/><circle cx="41.4" cy="8" r="0.9" class="e"/></svg>';

  // Yo'l: bekatlar orqali silliq egri chiziq (Catmull-Rom → Bezier), chetlardan chetgacha
  function roadD() {
    const pts = [[0, Y[0]], ...X.map((x, i) => [x, Y[i]]), [W, Y[4]]];
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
    }
    return d;
  }
  // Yo'l x bo'yicha o'sib boradi — x ga mos uzunlikni ikkiga bo'lib qidirish
  function lenAtX(x) {
    const p = st.path;
    let lo = 0, hi = p.getTotalLength();
    for (let k = 0; k < 24; k++) { const mid = (lo + hi) / 2; if (p.getPointAtLength(mid).x < x) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }

  function build() {
    const el = document.createElement('nav');
    el.id = 'cvRoute';
    el.className = 'cvr-nav'; // .cv-route — Karvon yo'li sahifasidagi yo'l klassi, aralashmasin
    el.setAttribute('aria-label', tx('rtNavLabel', "Asosiy bo'limlar"));
    el.innerHTML = `<svg class="cvr-road" viewBox="0 0 ${W} 64" preserveAspectRatio="none" aria-hidden="true">
        <path class="cvr-edge" d="${roadD()}"/><path class="cvr-sand" d="${roadD()}"/><path class="cvr-dash" d="${roadD()}"/></svg>
      ${MAIN.map((id, i) => `<button type="button" class="cvr-stop" data-i="${i}" style="left:${X[i] / W * 100}%;top:${Y[i]}px">
        <span class="cvr-dot"><span class="cvr-ico"></span><span class="cvr-badge" hidden></span></span><span class="cvr-label"></span></button>`).join('')}
      <span class="cvr-camel">${CAMEL}</span>`;
    document.body.appendChild(el);
    st.el = el;
    st.path = el.querySelector('.cvr-sand');
    st.lens = X.map(lenAtX);
    el.querySelectorAll('.cvr-stop').forEach((b) => b.addEventListener('click', () => { if (!st.drag || !st.drag.moved) go(Number(b.dataset.i)); }));
    bindDrag(el);
  }

  function placeCamel(len, dir) {
    const p = st.path.getPointAtLength(len);
    const c = st.el.querySelector('.cvr-camel');
    c.style.left = (p.x / W * 100) + '%';
    c.style.top = p.y + 'px';
    if (dir) c.classList.toggle('back', dir < 0);
    st.len = len;
  }
  function travel(to) {
    cancelAnimationFrame(st.raf);
    const from = st.len === null ? to : st.len;
    const dir = Math.sign(to - from);
    const c = st.el.querySelector('.cvr-camel');
    if (reduce.matches || from === to) { placeCamel(to, dir); c.classList.remove('walking'); return; }
    const t0 = performance.now(), dur = Math.min(700, 260 + Math.abs(to - from) * 1.2);
    c.classList.add('walking');
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      placeCamel(from + (to - from) * e, dir);
      if (k < 1) st.raf = requestAnimationFrame(step); else c.classList.remove('walking');
    };
    st.raf = requestAnimationFrame(step);
  }

  function go(i) {
    if (i === 4) { window.toggleMobileMenu && window.toggleMobileMenu(); return; }
    if (typeof window.switchView === 'function') window.switchView(VIEWS[i]);
  }

  // Barmoq bilan yo'l bo'ylab surish: tuya ergashadi, qo'yib yuborilganda — eng yaqin bekat
  function bindDrag(el) {
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      st.drag = { x: e.clientX, moved: false, id: e.pointerId };
    });
    el.addEventListener('pointermove', (e) => {
      const d = st.drag;
      if (!d || d.id !== e.pointerId) return;
      if (!d.moved && Math.abs(e.clientX - d.x) < 12) return;
      if (!d.moved) { d.moved = true; try { el.setPointerCapture(e.pointerId); } catch (err) {} cancelAnimationFrame(st.raf); }
      const r = el.getBoundingClientRect();
      const x = Math.max(X[0], Math.min(X[4], (e.clientX - r.left) / r.width * W));
      const len = lenAtX(x);
      placeCamel(len, Math.sign(len - (st.len || 0)));
      st.el.querySelector('.cvr-camel').classList.add('walking');
    });
    const end = (e) => {
      const d = st.drag;
      if (!d || d.id !== e.pointerId) return;
      if (d.moved) {
        let best = 0;
        st.lens.forEach((l, i) => { if (Math.abs(l - st.len) < Math.abs(st.lens[best] - st.len)) best = i; });
        st.el.querySelector('.cvr-camel').classList.remove('walking');
        travel(st.lens[best]);
        if (best !== st.idx || best === 4) go(best);
        setTimeout(() => { st.drag = null; }, 0); // surishdan keyingi click bekatni ikkinchi marta ochmasin
      } else st.drag = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', (e) => { end(e); sync(true); });
  }

  // Yon menyudagi holatni yo'lga ko'chirish: nomlar, belgilar, nishonlar, faol bekat
  function sync(force) {
    if (!st.el) return;
    const items = [...document.querySelectorAll('.menu-list .menu-item')];
    const active = items.find((m) => m.classList.contains('active'));
    let idx = active ? MAIN.indexOf(active.id) : -1;
    if (idx < 0 || idx === 4) idx = 4;
    const restBadges = items.filter((m) => !MAIN.includes(m.id)).reduce((s, m) => s + badgeOf(m), 0);
    st.el.querySelectorAll('.cvr-stop').forEach((b, i) => {
      const item = document.getElementById(MAIN[i]);
      let label = labelOf(item), icon = iconOf(item);
      // Asosiy bo'lim bo'lmagan sahifada 5-bekat o'sha bo'lim nomi va belgisi bilan
      if (i === 4 && active && !MAIN.includes(active.id)) { label = labelOf(active); icon = iconOf(active); }
      if (i === 4 && document.body.classList.contains('mobile-menu-open')) icon = '🗺️';
      b.querySelector('.cvr-ico').textContent = icon;
      b.querySelector('.cvr-label').textContent = label;
      b.setAttribute('aria-label', label);
      const n = i === 4 ? restBadges : badgeOf(item);
      const badge = b.querySelector('.cvr-badge');
      badge.hidden = !n;
      badge.textContent = n > 99 ? '99+' : String(n);
      b.classList.toggle('on', i === idx);
      if (i === idx) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (idx !== st.idx || force) {
      const prev = st.idx;
      st.idx = idx;
      if (!st.drag || !st.drag.moved) travel(st.lens[idx]);
      if (prev >= 0 && prev !== idx && !reduce.matches) enterPage(idx > prev ? 1 : -1);
    }
  }

  // Sahifa karvon yurgan tomondan kirib keladi
  function enterPage(dir) {
    const v = document.querySelector('.main-wrapper .view-section.active-view');
    if (!v) return;
    v.classList.remove('cvr-in-right', 'cvr-in-left');
    void v.offsetWidth;
    v.classList.add(dir > 0 ? 'cvr-in-right' : 'cvr-in-left');
    setTimeout(() => v.classList.remove('cvr-in-right', 'cvr-in-left'), 400);
  }

  // "Barcha bo'limlar" — ilonizi yo'l bo'yidagi bekatlar (qolgan menyu bandlari)
  function renderMap() {
    if (!st.map) {
      st.map = document.createElement('div');
      st.map.id = 'cvRouteMap';
      st.map.className = 'cvr-map';
      st.map.setAttribute('role', 'dialog');
      document.body.appendChild(st.map);
      st.map.addEventListener('click', (e) => {
        if (e.target.closest('[data-cvr-close]')) return window.toggleMobileMenu(false);
        const b = e.target.closest('[data-cvr-go]');
        if (b) { const item = document.getElementById(b.dataset.cvrGo); if (item) item.click(); }
      });
    }
    const items = [...document.querySelectorAll('.menu-list .menu-item')].filter((m) => !MAIN.includes(m.id) && m.style.display !== 'none');
    const active = items.find((m) => m.classList.contains('active'));
    st.map.setAttribute('aria-label', tx('rtAllStops', "Barcha bo'limlar"));
    st.map.innerHTML = `<div class="cvr-map-head"><b>🗺️ ${esc(tx('rtAllStops', "Barcha bo'limlar"))}</b>
        <button type="button" class="cvr-map-x" data-cvr-close aria-label="✕">✕</button></div>
      <ol class="cvr-map-list">${items.map((m, i) => `<li class="${i % 2 ? 'r' : 'l'}${m === active ? ' on' : ''}">
        <button type="button" data-cvr-go="${esc(m.id)}"><span class="cvr-map-ico">${esc(iconOf(m))}</span><span class="cvr-map-name">${esc(labelOf(m))}</span>${badgeOf(m) ? `<span class="cvr-badge">${badgeOf(m)}</span>` : ''}${m === active ? `<span class="cvr-map-camel">${CAMEL}</span>` : ''}</button></li>`).join('')}</ol>`;
  }

  function apply() {
    const on = enabled();
    document.documentElement.classList.toggle('cv-route-on', on);
    if (on && !st.el) build();
    if (on) sync(true);
  }

  document.addEventListener('DOMContentLoaded', () => {
    apply();
    [wide, landscape].forEach((mq) => (mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply)));
    const list = document.querySelector('.menu-list');
    if (list) new MutationObserver(() => sync()).observe(list, { subtree: true, attributes: true, attributeFilter: ['class', 'style'], childList: true, characterData: true });
    // "Ko'proq" ochilganda — xarita
    new MutationObserver(() => {
      const open = document.body.classList.contains('mobile-menu-open');
      if (open && enabled()) renderMap();
      sync();
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  });

  window.cvRoute = { sync, state: () => ({ idx: st.idx, on: !!st.el && enabled() }) };
})();
