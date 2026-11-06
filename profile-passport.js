// 🛂 Shaxmat pasporti (2026-11-06): qaysi davlat o'yinchisi bilan o'ynagan bo'lsangiz — o'sha davlat muhri (oddiy), yutsangiz — oltin muhr.
// Ma'lumot /extras dagi passport (server passport_stamps, endGame da yoziladi; 2026-11-06 dan, eski o'yinlar sanalmaydi).
// Profil → "🛂 Pasport" (#profPassBtn → profile-sections.js 'pass' → /profil?u=&b=pasport → #profPassPanel / #profPassport, pp-*):
// N/190 (social.js allCountries), dunyo xaritasi (d3 + topojson — Bayroqlar sahifasi bilan bir xil fayllar), qit'alar, muhrlar
// (bosilsa — «190 davlat» videosi bo'lsa YouTube), ulashish kartasi (canvas PNG). O'yin tugagach yangi/oltin muhr — toast.
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LIBS = ['/vendor/d3-7.9.0.min.js', '/vendor/topojson-client-3.1.0.min.js'];
  const CONTINENTS = [['Asia', 'continentAsia', 'Osiyo'], ['Europe', 'continentEurope', 'Yevropa'], ['Africa', 'continentAfrica', 'Afrika'],
    ['North America', 'continentNorthAmerica', 'Shimoliy Amerika'], ['South America', 'continentSouthAmerica', 'Janubiy Amerika'], ['Oceania', 'continentOceania', 'Okeaniya']];
  const st = { stamps: null, user: null, world: null, geo: null, loading: null, videos: {} };

  const allCodes = () => (typeof allCountries !== 'undefined' ? allCountries.map((c) => c.code) : []);
  const total = () => allCodes().length || 190;
  const nameOf = (code) => (typeof window.countryNameByCode === 'function' ? window.countryNameByCode(code) : null) || String(code).toUpperCase();
  const flag = (code, w) => `<img class="pp-flag" src="https://flagcdn.com/w${w || 40}/${esc(code)}.png" alt="" loading="lazy" onerror="this.remove()">`;
  const date = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); };

  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`) && (src.includes('d3') ? window.d3 : window.topojson)) return res();
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  function loadMap() {
    if (!st.loading) {
      st.loading = (async () => {
        for (const src of LIBS) await loadScript(src);
        const [world, geo] = await Promise.all([fetch('assets/world-110m.json').then((r) => r.json()), fetch('assets/geo-codes.json').then((r) => r.json())]);
        st.world = world; st.geo = geo;
      })().catch((e) => { st.loading = null; throw e; });
    }
    return st.loading;
  }
  function features() {
    return window.topojson.feature(st.world, st.world.objects.countries).features.filter((f) => f.id !== '010'); // Antarktidasiz
  }
  const codeOf = (f) => (st.geo && st.geo.features[String(f.id)]) || null;

  function stampMap() { return new Map((st.stamps || []).map((s) => [s.country, s])); }

  function drawMap() {
    const box = document.getElementById('ppMap');
    if (!box || !st.world || !window.d3) return;
    const map = stampMap();
    const feats = features();
    const width = 960, height = 470;
    const projection = window.d3.geoNaturalEarth1().fitExtent([[4, 4], [width - 4, height - 4]], { type: 'FeatureCollection', features: feats });
    const path = window.d3.geoPath(projection);
    box.innerHTML = '';
    const svg = window.d3.select(box).append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('class', 'pp-svg').attr('role', 'img')
      .attr('aria-label', tx('ppTitle', 'Shaxmat pasporti'));
    svg.append('g').selectAll('path').data(feats).join('path').attr('d', path)
      .attr('class', (f) => { const s = map.get(codeOf(f)); return 'pp-c' + (s ? (s.wins ? ' gold' : ' on') : ''); })
      .append('title').text((f) => { const c = codeOf(f); const s = c && map.get(c); return (c ? nameOf(c) : f.properties.name) + (s ? (s.wins ? ' · 🥇' : ' · 🛂') : ''); });
  }

  function stampHtml(s) {
    const url = window.countryVideoUrl ? window.countryVideoUrl(st.videos[s.country]) : null;
    const inner = `${flag(s.country, 80)}<b>${esc(nameOf(s.country))}</b>
      <small>${esc(tx('ppFirst', 'Birinchi o\'yin: {{date}} · {{name}}', { date: date(s.firstAt), name: s.firstOpponent || '—' }))}</small>
      ${s.wins ? `<small class="pp-won">${esc(tx('ppWon', "🥇 G'alaba: {{date}} · {{name}}", { date: date(s.wonAt), name: s.winOpponent || '—' }))}</small>` : ''}
      <span class="pp-games">${esc(tx('ppPlayed', "O'yinlar: {{n}} · g'alabalar: {{w}}", { n: s.games, w: s.wins }))}</span>
      ${url ? `<span class="pp-video">▶ ${esc(tx('ppWatch', 'Bu davlat haqida video'))}</span>` : ''}`;
    const cls = 'pp-stamp' + (s.wins ? ' gold' : '');
    return url ? `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${inner}</a>` : `<div class="${cls}">${inner}</div>`;
  }

  function render() {
    const el = document.getElementById('profPassport');
    if (!el) return;
    const stamps = st.stamps;
    if (!stamps) { el.innerHTML = ''; return; }
    const n = stamps.length, gold = stamps.filter((s) => s.wins).length, all = total();
    const map = stampMap();
    const conts = CONTINENTS.map(([key, k, fb]) => {
      const list = typeof continentCountries !== 'undefined' ? (continentCountries[key] || []) : [];
      const got = list.filter((c) => map.has(c.code)).length;
      return `<div class="pp-cont"><span>${esc(tx(k, fb))}</span><b>${got}/${list.length}</b><i style="--p:${list.length ? Math.round(got / list.length * 100) : 0}%"></i></div>`;
    }).join('');
    const mine = window.currentUser && window.currentUser.username === st.user;
    el.innerHTML = `<div class="pp-hero">
        <div class="pp-cover"><span class="pp-emblem">🛂</span><div><b>${esc(tx('ppTitle', 'Shaxmat pasporti'))}</b><small>${esc(st.user || '')}</small></div></div>
        <div class="pp-nums"><div><b>${n}<small>/${all}</small></b><span>${esc(tx('ppCountriesLabel', 'davlat muhri'))}</span></div>
          <div><b>${gold}</b><span>${esc(tx('ppGoldLabel', 'oltin muhr'))}</span></div></div>
        <div class="pp-bar"><i style="--p:${Math.min(100, n / all * 100).toFixed(1)}%"></i></div>
        ${n && mine ? `<button type="button" class="pp-share" data-pp-share>📤 ${esc(tx('ppShare', 'Pasportni ulashish'))}</button>` : ''}
      </div>
      <div class="pp-map" id="ppMap"><div class="cl-loading">${esc(tx('loadingText', 'Yuklanmoqda...'))}</div></div>
      <div class="pp-legend"><span><i class="on"></i>${esc(tx('ppLegendPlayed', "O'ynalgan"))}</span><span><i class="gold"></i>${esc(tx('ppLegendWon', 'Yutilgan'))}</span></div>
      <div class="pp-conts">${conts}</div>
      <p class="pp-how">${esc(tx('ppHow', "Boshqa davlat o'yinchisi bilan o'ynang — pasportga o'sha davlat muhri bosiladi. Yutsangiz, muhr oltin bo'ladi. Muhrlar 6-noyabr 2026 dan beri yig'iladi."))}</p>
      ${n ? `<div class="pp-stamps">${stamps.slice().sort((a, b) => (b.wins ? 1 : 0) - (a.wins ? 1 : 0) || String(b.firstAt).localeCompare(String(a.firstAt))).map(stampHtml).join('')}</div>`
        : `<p class="pp-empty">${esc(tx('ppEmpty', "Pasport hali bo'sh — birinchi muhr birinchi o'yindan keyin bosiladi!"))}</p>`}`;
    const share = el.querySelector('[data-pp-share]');
    if (share) share.onclick = shareCard;
    loadMap().then(drawMap).catch(() => { const m = document.getElementById('ppMap'); if (m) m.innerHTML = ''; });
  }

  window.renderProfilePassport = function (d, username) {
    st.stamps = d && Array.isArray(d.passport) ? d.passport : (d ? [] : null);
    st.user = username || st.user;
    const cnt = document.getElementById('profPassCount');
    if (cnt) cnt.textContent = d ? st.stamps.length + '/' + total() : '';
    const btn = document.getElementById('profPassBtn');
    if (btn) btn.hidden = !!(d && d.passport === null); // mehmon
    render();
    if (typeof window.countryVideos === 'function' && st.stamps && st.stamps.length) {
      window.countryVideos().then((v) => { st.videos = v || {}; if (Object.keys(st.videos).length) render(); }).catch(() => {});
    }
  };

  // 📤 Ulashish kartasi: 1080×1350 PNG — xarita, raqamlar, ism
  async function makeCard() {
    await loadMap();
    const W = 1080, H = 1350;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue('--accent').trim() || '#01ccd5';
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#13232a'); grad.addColorStop(1, '#0a1316');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    g.fillStyle = accent; g.fillRect(0, 0, W, 14);
    g.textAlign = 'center';
    g.fillStyle = '#fff'; g.font = '700 64px Inter, Arial, sans-serif';
    g.fillText(tx('ppTitle', 'Shaxmat pasporti'), W / 2, 150);
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = '500 40px Inter, Arial, sans-serif';
    g.fillText(st.user || '', W / 2, 215);
    const map = stampMap();
    const feats = features();
    const projection = window.d3.geoNaturalEarth1().fitExtent([[50, 290], [W - 50, 820]], { type: 'FeatureCollection', features: feats });
    const path = window.d3.geoPath(projection, g);
    for (const f of feats) {
      const s = map.get(codeOf(f));
      g.beginPath(); path(f);
      g.fillStyle = s ? (s.wins ? '#f5c542' : accent) : 'rgba(255,255,255,0.13)';
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.8; g.stroke();
    }
    const n = st.stamps.length, gold = st.stamps.filter((s) => s.wins).length;
    g.fillStyle = '#fff'; g.font = '800 150px Inter, Arial, sans-serif';
    g.fillText(n + ' / ' + total(), W / 2, 1020);
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = '500 44px Inter, Arial, sans-serif';
    g.fillText(tx('ppCountriesLabel', 'davlat muhri'), W / 2, 1085);
    g.fillStyle = '#f5c542'; g.font = '700 54px Inter, Arial, sans-serif';
    g.fillText('🥇 ' + gold + ' ' + tx('ppGoldLabel', 'oltin muhr'), W / 2, 1175);
    g.fillStyle = accent; g.font = '700 42px Inter, Arial, sans-serif';
    g.fillText('ChessCaravan · chesscaravan.com', W / 2, 1290);
    return new Promise((res) => c.toBlob(res, 'image/png'));
  }
  async function shareCard() {
    try {
      const blob = await makeCard();
      if (!blob) throw new Error('canvas');
      const file = new File([blob], 'chesscaravan-pasport.png', { type: 'image/png' });
      const text = tx('ppShareText', '🛂 Mening shaxmat pasportim: {{n}}/{{total}} davlat, {{gold}} ta oltin muhr — ChessCaravan',
        { n: st.stamps.length, total: total(), gold: st.stamps.filter((s) => s.wins).length });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = file.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      if (typeof window.showToast === 'function') window.showToast(tx('errGeneric', 'Xatolik yuz berdi!'), 'warning');
    }
  }
  window.passportCard = makeCard; // testlar uchun

  // O'yindan keyin: yangi davlat yoki birinchi g'alaba — tabrik
  function wrapResult() {
    const orig = window.applyServerGameResult;
    if (typeof orig !== 'function' || orig.__pp) return;
    const wrapped = function (data) {
      const r = orig.apply(this, arguments);
      try {
        const p = data && data.passport;
        if (p && (p.isNew || p.gold) && typeof window.showToast === 'function') {
          const country = nameOf(p.country);
          setTimeout(() => window.showToast(p.gold ? tx('ppNewGold', '🥇 Pasportingizga oltin muhr: {{country}}!', { country }) : tx('ppNew', '🛂 Pasportingizga yangi muhr: {{country}}!', { country }), 'success', 6000), 2600);
        }
      } catch (e) {}
      return r;
    };
    wrapped.__pp = true;
    window.applyServerGameResult = wrapped;
  }
  wrapResult();
  document.addEventListener('DOMContentLoaded', wrapResult);
})();
