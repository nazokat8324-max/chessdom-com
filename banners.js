// 🧵 Shahar naqshlari: Karvon yo'lidagi har shaharga yetganda profil uchun naqshli banner ochiladi (o'zimiz chizgan SVG plitkalar,
// mualliflik huquqi loyihaniki). Tanlov — users.profile_banner (POST /api/users/me/banner), ko'rinadi profil chap ustunining tepasida
// (#profileModal .profile-sidebar-card.has-banner), tanlash oynasi #bnPicker (bn-*), Karvon yo'li bekatlarida kichik namuna.
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
  const zig = (x, c) => `<path d="M${x} 0 L${x + 6} 10 L${x} 20" stroke="${c}" stroke-width="5" fill="none"/>`;
  const hexagram = (cx, cy, r, fill) => {
    const tri = (rot) => [0, 1, 2].map((i) => { const a = rot + (i * 2 * Math.PI) / 3; return (cx + r * Math.sin(a)).toFixed(1) + ',' + (cy - r * Math.cos(a)).toFixed(1); }).join(' ');
    return `<polygon points="${tri(0)}" fill="${fill}"/><polygon points="${tri(Math.PI)}" fill="${fill}"/>`;
  };
  const rose = (cx, cy, r, petal, heart) => [0, 1, 2, 3, 4].map((i) => {
    const a = (i * 2 * Math.PI) / 5;
    return `<circle cx="${(cx + r * Math.sin(a)).toFixed(1)}" cy="${(cy - r * Math.cos(a)).toFixed(1)}" r="${r * 0.8}" fill="${petal}"/>`;
  }).join('') + `<circle cx="${cx}" cy="${cy}" r="${r * 0.65}" fill="${heart}"/>`;

  // Har shahar: [plitka eni, bo'yi, chizma] — shakllar har xil (bir xil naqsh boshqa rangda emas)
  const TILES = {
    // Sian — Xitoy "hui" meandri (qizil-oltin)
    xian: [40, 40, `<rect width="40" height="40" fill="#7a1712"/><path d="M4 4h32v32H8V8h24v24H12V12h16v16H16V16h8v8" stroke="#e8b84a" stroke-width="2.5" fill="none"/>`],
    // Dunxuan — qum barxanlari va tungi yulduz
    dunhuang: [60, 60, `<rect width="60" height="60" fill="#b9773d"/><path d="M0 18 Q15 6 30 18 T60 18" stroke="#e8b27a" stroke-width="5" fill="none"/><path d="M0 40 Q15 28 30 40 T60 40" stroke="#94592a" stroke-width="5" fill="none"/><circle cx="46" cy="52" r="1.8" fill="#fff3d6"/><circle cx="12" cy="30" r="1.2" fill="#fff3d6"/>`],
    // Qashqar — uyg'ur etles: tishli olovsimon romb
    kashgar: [48, 48, `<rect width="48" height="48" fill="#2b1a4a"/><path d="M24 2 L34 14 L30 14 L38 24 L30 34 L34 34 L24 46 L14 34 L18 34 L10 24 L18 14 L14 14 Z" fill="#e0338f"/><path d="M24 12 L31 24 L24 36 L17 24Z" fill="#f6c443"/><path d="M24 19 L28 24 L24 29 L20 24Z" fill="#2fa4d9"/>`],
    // Farg'ona — xon-atlas: rangli zigzag yo'llar
    fergana: [40, 20, `<rect width="40" height="20" fill="#1d3f8f"/>${zig(3, '#d6262f')}${zig(13, '#f4c430')}${zig(23, '#1f9a5b')}${zig(33, '#f2efe6')}`],
    // Toshkent — ganch o'ymakorligi: kesishgan doiralar
    tashkent: [40, 40, `<rect width="40" height="40" fill="#0f5c66"/><g stroke="#e9f4ef" stroke-width="1.4" fill="none"><circle cx="0" cy="0" r="20"/><circle cx="40" cy="0" r="20"/><circle cx="0" cy="40" r="20"/><circle cx="40" cy="40" r="20"/><circle cx="20" cy="20" r="20"/></g><circle cx="20" cy="20" r="2.4" fill="#f4d58d"/><circle cx="0" cy="0" r="2.4" fill="#f4d58d"/><circle cx="40" cy="40" r="2.4" fill="#f4d58d"/><circle cx="40" cy="0" r="2.4" fill="#f4d58d"/><circle cx="0" cy="40" r="2.4" fill="#f4d58d"/>`],
    // Samarqand — Registon koshinlari: sakkiz qirrali yulduz
    samarkand: [48, 48, `<rect width="48" height="48" fill="#0b3d91"/><rect x="13" y="13" width="22" height="22" fill="#1fb5c9"/><rect x="13" y="13" width="22" height="22" fill="#1fb5c9" transform="rotate(45 24 24)"/><circle cx="24" cy="24" r="6" fill="#f2d16b"/><g fill="#eaf6ff"><path d="M0 -5 L5 0 L0 5 L-5 0Z"/><path d="M48 -5 L53 0 L48 5 L43 0Z"/><path d="M0 43 L5 48 L0 53 L-5 48Z"/><path d="M48 43 L53 48 L48 53 L43 48Z"/></g>`],
    // Buxoro — gilam "gul"i: sakkizburchak ichida romb
    bukhara: [56, 56, `<rect width="56" height="56" fill="#7d1420"/><polygon points="19,6 37,6 50,19 50,37 37,50 19,50 6,37 6,19" fill="#5a0d17" stroke="#e9d8b4" stroke-width="1.5"/><path d="M28 12 L44 28 L28 44 L12 28Z" fill="#16244d"/><path d="M28 21 L35 28 L28 35 L21 28Z" fill="#e9d8b4"/><g fill="#e9d8b4"><path d="M0 -3 L3 0 L0 3 L-3 0Z"/><path d="M56 -3 L59 0 L56 3 L53 0Z"/><path d="M0 53 L3 56 L0 59 L-3 56Z"/><path d="M56 53 L59 56 L56 59 L53 56Z"/></g>`],
    // Xiva — yog'och o'ymakorligi: jingalak novda
    khiva: [48, 48, `<rect width="48" height="48" fill="#5b3a1e"/><path d="M0 24 C12 4 24 44 36 24 S48 4 48 24" stroke="#d9a066" stroke-width="3" fill="none"/><circle cx="12" cy="13" r="4.5" stroke="#d9a066" stroke-width="2" fill="none"/><circle cx="36" cy="35" r="4.5" stroke="#d9a066" stroke-width="2" fill="none"/><ellipse cx="24" cy="10" rx="3" ry="6" fill="#b8824b" transform="rotate(35 24 10)"/><ellipse cx="24" cy="38" rx="3" ry="6" fill="#b8824b" transform="rotate(35 24 38)"/>`],
    // Marv — Sulton Sanjar maqbarasi g'ishtlari: savatsimon terim
    merv: [32, 32, `<rect width="32" height="32" fill="#7a4b22"/><g fill="#d9a76a"><rect x="2" y="2" width="12" height="5"/><rect x="2" y="9" width="12" height="5"/><rect x="18" y="2" width="5" height="12"/><rect x="25" y="2" width="5" height="12"/><rect x="2" y="18" width="5" height="12"/><rect x="9" y="18" width="5" height="12"/><rect x="18" y="18" width="12" height="5"/><rect x="18" y="25" width="12" height="5"/></g>`],
    // Bag'dod — arabeska: olti qirrali yulduzlar
    baghdad: [60, 60, `<rect width="60" height="60" fill="#0f4f4a"/><circle cx="30" cy="30" r="20" stroke="#57c4b4" stroke-width="1.5" fill="none"/>${hexagram(30, 30, 15, '#d4a53c')}${hexagram(0, 0, 8, '#d4a53c')}${hexagram(60, 0, 8, '#d4a53c')}${hexagram(0, 60, 8, '#d4a53c')}${hexagram(60, 60, 8, '#d4a53c')}`],
    // Damashq — damask atirgullari
    damascus: [56, 56, `<rect width="56" height="56" fill="#4a0f1f"/>${rose(28, 28, 8, '#b8324f', '#f0c9a0')}<g fill="#3f7a4a"><ellipse cx="6" cy="6" rx="3" ry="7" transform="rotate(45 6 6)"/><ellipse cx="50" cy="50" rx="3" ry="7" transform="rotate(45 50 50)"/><ellipse cx="50" cy="6" rx="3" ry="7" transform="rotate(-45 50 6)"/><ellipse cx="6" cy="50" rx="3" ry="7" transform="rotate(-45 6 50)"/></g>`],
    // Istanbul — Iznik lolalari
    istanbul: [56, 56, `<rect width="56" height="56" fill="#f3efe6"/><path d="M28 48 V30" stroke="#2e7d4f" stroke-width="2.5"/><path d="M28 44 Q18 40 16 30 Q24 34 28 40Z" fill="#1e4fa3"/><path d="M28 44 Q38 40 40 30 Q32 34 28 40Z" fill="#1e4fa3"/><path d="M20 30 Q19 15 23 12 L28 21 L33 12 Q37 15 36 30 Z" fill="#c62828"/><g fill="#1e4fa3"><circle cx="0" cy="0" r="4"/><circle cx="56" cy="0" r="4"/><circle cx="0" cy="56" r="4"/><circle cx="56" cy="56" r="4"/></g>`]
  };

  const cache = {};
  function bannerUrl(key) {
    const t = TILES[key];
    if (!t) return null;
    if (!cache[key]) cache[key] = 'url("data:image/svg+xml,' + encodeURIComponent(svg(t[0], t[1], t[2])) + '")';
    return cache[key];
  }
  const tileSize = (key) => (TILES[key] ? TILES[key][0] : 40);
  const lang = () => (window.i18next && window.i18next.language) || 'en';
  const cityName = (key) => (window.Caravan ? window.Caravan.cityName(key, String(lang()).slice(0, 2)) : key);
  // Ochilgan shaharlar indeksi (qadamlar bo'yicha)
  const unlockedUpTo = (points) => (window.Caravan && points != null ? window.Caravan.cityIndex(points) : -1);

  // Element fonini naqsh bilan to'ldirish (namuna uchun)
  function paint(el, key, scale) {
    const u = bannerUrl(key);
    if (!el || !u) return;
    el.style.backgroundImage = u;
    el.style.backgroundSize = Math.round(tileSize(key) * (scale || 1)) + 'px';
  }

  // Profil chap ustuni tepasidagi banner
  function applyProfileBanner(key) {
    const card = document.querySelector('#profileModal .profile-sidebar-card');
    if (!card) return;
    const u = key && bannerUrl(key);
    card.classList.toggle('has-banner', !!u);
    if (u) {
      card.style.setProperty('--pf-banner', u);
      card.style.setProperty('--pf-banner-size', tileSize(key) + 'px');
      card.dataset.banner = key;
    } else {
      card.style.removeProperty('--pf-banner');
      delete card.dataset.banner;
    }
  }

  const st = { own: false, points: null, current: null };

  // profile-extras.js chaqiradi: (naqsh, qadamlar, o'z profilimi)
  window.renderProfileBanner = function (key, points, own) {
    st.own = !!own; st.points = points; st.current = key || null;
    applyProfileBanner(st.current);
    const box = document.getElementById('profileCaravan');
    if (!box || box.hidden) return;
    let btn = box.querySelector('.bn-edit');
    if (!own) { if (btn) btn.remove(); return; }
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bn-edit';
      btn.addEventListener('click', (e) => { e.stopPropagation(); window.openBannerPicker(); });
      box.appendChild(btn);
    }
    btn.textContent = '🧵 ' + tx('bnPick', 'Naqsh tanlash');
  };

  window.openBannerPicker = function () {
    if (!window.Caravan) return;
    const upTo = unlockedUpTo(st.points);
    let modal = document.getElementById('bnPicker');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bnPicker';
      modal.className = 'ch-overlay bn-overlay';
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
    }
    const opened = Math.max(0, upTo + 1);
    modal.innerHTML = `<div class="ch-card bn-card" role="dialog" aria-modal="true">
      <div class="bn-head"><h3>🧵 ${esc(tx('bnTitle', 'Shahar naqshlari'))}</h3><button type="button" class="bn-x" data-bn-close aria-label="✕">✕</button></div>
      <p class="bn-sub">${esc(tx('bnSub', "Karvoningiz yetib borgan har shahar profilingiz uchun naqsh ochadi. Ochilgan: {{n}} / 12", { n: opened }))}</p>
      <div class="bn-grid">
        <button type="button" class="bn-opt bn-none${!st.current ? ' active' : ''}" data-bn="">
          <span class="bn-sw"></span><b>${esc(tx('bnNone', "Naqshsiz"))}</b></button>
        ${window.Caravan.CITIES.map((c, i) => {
          const locked = i > upTo;
          return `<button type="button" class="bn-opt${locked ? ' locked' : ''}${st.current === c.key ? ' active' : ''}" data-bn="${esc(c.key)}" ${locked ? 'disabled' : ''}>
            <span class="bn-sw" data-bn-sw="${esc(c.key)}">${locked ? '<i>🔒</i>' : ''}</span>
            <b>${c.icon} ${esc(cityName(c.key))}</b>
            <small>${esc(locked ? tx('bnLocked', '{{n}} qadamda ochiladi', { n: c.at }) : tx('bnOpen', 'Ochilgan'))}</small></button>`;
        }).join('')}
      </div>
    </div>`;
    modal.querySelectorAll('[data-bn-sw]').forEach((el) => paint(el, el.dataset.bnSw, 0.8));
    modal.querySelector('[data-bn-close]').onclick = () => { modal.hidden = true; };
    modal.querySelectorAll('.bn-opt:not(.locked)').forEach((b) => b.addEventListener('click', () => choose(b.dataset.bn, modal)));
    modal.hidden = false;
  };

  async function choose(key, modal) {
    try {
      const r = await fetch('/api/users/me/banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window.authToken },
        body: JSON.stringify({ key })
      });
      const d = await r.json();
      if (!d.success) { showToast(typeof tServer === 'function' ? tServer(d.message) : d.message, 'error'); return; }
      st.current = d.banner || null;
      applyProfileBanner(st.current);
      modal.hidden = true;
      showToast(st.current ? tx('bnSaved', '🧵 Naqsh qo\'yildi: {{city}}', { city: cityName(st.current) }) : tx('bnCleared', "Naqsh olib tashlandi"), 'success', 2500);
    } catch (e) { showToast(tx('srvError', 'Server xatoligi!'), 'error'); }
  }

  window.cityBannerUrl = bannerUrl;
  window.paintCityBanner = paint;
})();
