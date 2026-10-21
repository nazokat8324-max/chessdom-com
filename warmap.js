// 🚩 Bayroqlar bellashuvi (#warView → #warRoot, /bayroqlar, war-*; 2026-10-20 gacha "Davlatlar urushi"): har oy davlat klublari reytingli o'yinlardagi
// g'alabalari bilan dunyo xaritasida hudud uchun kurashadi. Qoidalar va hisob serverda (server.js computeWar).
// Xarita: d3 + topojson-client (CDN, faqat shu sahifa ochilganda yuklanadi), assets/world-110m.json (Natural Earth),
// assets/geo-codes.json (raqamli id → davlat kodi, qo'shnilar).
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const LIBS = ['https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js', 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js'];
  const st = { data: null, geo: null, world: null, loading: null, timer: null, season: null };
  const flag = (code) => code ? `<img class="war-flag" src="https://flagcdn.com/w40/${esc(String(code).toLowerCase())}.png" alt="" onerror="this.remove()">` : '';
  const clubName = (c) => c ? (window.countryName ? window.countryName(c.country, c.code) : c.country) : '';

  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  function loadMap() {
    if (!st.loading) {
      st.loading = (async () => {
        for (const src of LIBS) await loadScript(src);
        const [world, geo] = await Promise.all([fetch('assets/world-110m.json').then(r => r.json()), fetch('assets/geo-codes.json').then(r => r.json())]);
        st.world = world; st.geo = geo;
      })().catch(e => { st.loading = null; throw e; });
    }
    return st.loading;
  }

  // Klub rangi — davlat kodidan barqaror rang (sayt mavzusidan qat'i nazar ajralib tursin)
  function clubColor(code) {
    let h = 0;
    for (const ch of String(code)) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return `hsl(${(h * 47) % 360}, 68%, 52%)`;
  }

  function countdown(endsAt) {
    const ms = new Date(endsAt).getTime() - Date.now();
    if (ms <= 0) return tx('warEnded', 'Mavsum yakunlandi');
    const d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000), m = Math.floor(ms % 3600000 / 60000);
    return d > 0 ? tx('warLeftDH', '{{d}} kun {{h}} soat', { d, h }) : tx('warLeftHM', '{{h}} soat {{m}} daqiqa', { h, m });
  }
  function monthName(season) {
    const [y, m] = season.split('-').map(Number);
    const lang = (window.i18next && window.i18next.language) || 'en';
    if (lang === 'uz') return ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'][m - 1] + ' ' + y; // brauzerlarda uz-UZ oy nomi yo'q
    try { return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(lang, { month: 'long', year: 'numeric', timeZone: 'UTC' }); }
    catch (e) { return season; }
  }

  async function fetchWar(season) {
    const headers = window.authToken ? { Authorization: 'Bearer ' + window.authToken } : {};
    return fetch('/api/war' + (season ? '?season=' + encodeURIComponent(season) : ''), { headers }).then(r => r.json()).catch(() => null);
  }

  window.renderWarView = async function () {
    const root = document.getElementById('warRoot');
    if (!root) return;
    if (!st.data) root.innerHTML = `<div class="war-loading">♞ ${esc(tx('loadingText', 'Yuklanmoqda...'))}</div>`;
    const d = await fetchWar(st.season);
    if (!d || !d.success) { root.innerHTML = `<div class="war-loading">⚠️ ${esc(tServer(d && d.message) || tx('errGeneric', 'Xatolik yuz berdi!'))}</div>`; return; }
    st.data = d;
    paint();
    try { await loadMap(); drawMap(); }
    catch (e) { const box = document.getElementById('warMap'); if (box) box.innerHTML = `<div class="war-loading">⚠️ ${esc(tx('warMapFailed', 'Xaritani yuklab bo\'lmadi'))}</div>`; }
    clearInterval(st.timer);
    st.timer = setInterval(() => {
      if (!document.getElementById('warView') || !document.getElementById('warView').classList.contains('active-view')) return clearInterval(st.timer);
      const el = document.getElementById('warCountdown');
      if (el && st.data) el.textContent = countdown(st.data.endsAt);
    }, 30000);
  };

  function paint() {
    const d = st.data, root = document.getElementById('warRoot');
    const ruler = d.ruler;
    const me = d.me;
    const myCode = me && me.club ? me.club.code : null;
    root.innerHTML = `
      <section class="war-hero">
        <div class="war-hero-text">
          <span class="war-kicker">🚩 ${esc(tx('warKicker', 'Faqat ChessDom da'))}</span>
          <h1>${esc(tx('warTitle', 'Bayroqlar bellashuvi'))}</h1>
          <p>${esc(tx('warLead', "Har reytingli g'alabangiz davlatingiz klubiga bayroq ochkosi beradi. Ochko ko'p bo'lsa — klubingiz bayrog'i qo'shni davlatlarda ham hilpiraydi. Oy oxirida xaritaning eng katta qismi kimning bayrog'i ostida bo'lsa, o'sha klub mavsum chempioni bo'ladi."))}</p>
        </div>
        <div class="war-hero-side">
          <div class="war-season">
            <select id="warSeasonSel" aria-label="season">${seasonOptions(d)}</select>
            ${d.current ? `<small>⏳ ${esc(tx('warEndsIn', 'Tugashiga'))}: <b id="warCountdown">${esc(countdown(d.endsAt))}</b></small>` : `<small>${esc(tx('warEnded', 'Mavsum yakunlandi'))}</small>`}
          </div>
          <div class="war-ruler">${ruler ? `<span>👑 ${esc(d.current ? tx('warLeading', 'Hozir yetakchi') : tx('warRuler', "Mavsum chempioni"))}</span>
            <b>${flag(ruler.code)} ${esc(clubName(ruler))}</b>
            <small>${esc(tx('warTerritoriesN', '{{n}} hudud', { n: ruler.territories }))} · ${esc(tx('warPointsN', '{{n}} ochko', { n: ruler.points }))}</small>`
            : `<span>👑 ${esc(tx('warNoRuler', "Chempion hali yo'q"))}</span><small>${esc(tx('warNoRulerSub', "Birinchi g'alaba bilan bayrog'ingizni xaritaga tiking"))}</small>`}</div>
        </div>
      </section>
      <div class="war-grid">
        <section class="war-card war-map-card">
          <div class="war-map" id="warMap"><div class="war-loading">🌍</div></div>
          <div class="war-tip" id="warTip" hidden></div>
          <div class="war-legend">
            <span><i class="own"></i>${esc(tx('warLegendOwn', 'Klub o\'z hududi'))}</span>
            <span><i class="captured"></i>${esc(tx('warLegendCaptured', "Ta'sir doirasidagi hudud"))}</span>
            <span><i class="free"></i>${esc(tx('warLegendFree', 'Bo\'sh hudud'))}</span>
            ${myCode ? `<span><i class="mine"></i>${esc(tx('warLegendMine', 'Sizning klubingiz'))}</span>` : ''}
          </div>
          <small class="war-credit">${esc(tx('warCredit', 'Xarita: Natural Earth / world-atlas'))}</small>
        </section>
        <aside class="war-side">
          ${myCard(d)}
          <section class="war-card">
            <h3>🏆 ${esc(tx('warStandings', 'Klublar jadvali'))}</h3>
            ${d.clubs.length ? `<div class="war-table">${d.clubs.slice(0, 15).map((c, i) => `
              <div class="war-row${c.code === myCode ? ' mine' : ''}" data-club="${esc(c.country)}" data-code="${esc(c.code)}">
                <span class="war-pos">${i + 1}</span><i class="war-swatch" style="background:${clubColor(c.code)}"></i>
                <b>${flag(c.code)}${esc(clubName(c))}</b>
                <span class="war-terr" title="${esc(tx('warTerritories', 'Hududlar'))}">🗺️ ${c.territories}</span>
                <span class="war-pts">${c.points}</span>
              </div>`).join('')}</div>` : `<p class="war-empty">${esc(tx('warNoClubs', "Bu mavsumda hali hech bir klub ochko to'plamagan"))}</p>`}
          </section>
          <section class="war-card war-rules">
            <h3>📜 ${esc(tx('warRulesTitle', 'Qoidalar'))}</h3>
            <ul>
              <li><b>+3</b> ${esc(tx('warRuleWin', "reytingli o'yinda g'alaba"))}</li>
              <li><b>+1</b> ${esc(tx('warRuleDraw', 'durrang'))}</li>
              <li><b>+1</b> ${esc(tx('warRuleForeign', "boshqa davlat klubi o'yinchisini yutish"))}</li>
              <li><b>+1</b> ${esc(tx('warRuleNeighbor', "qo'shni davlat o'yinchisini yutish — yana qo'shimcha"))}</li>
              <li>🛡️ ${esc(tx('warRuleTerritory', "Hudud kimning bayrog'i ostida: o'z klubi yoki ochkosining yarmi o'z klubidan ko'p bo'lgan qo'shni klub"))}</li>
              <li>📅 ${esc(tx('warRuleSeason', "Mavsum — bir oy. Oy oxirida eng ko'p hududli klub chempion bo'ladi, keyin xarita yangidan boshlanadi"))}</li>
            </ul>
          </section>
          ${d.previous && d.previous.length ? `<section class="war-card">
            <h3>👑 ${esc(tx('warPrevRulers', "Oldingi chempionlar"))}</h3>
            <div class="war-prev">${d.previous.map(p => `<div><span>${esc(monthName(p.season))}</span><b>${flag(p.code)}${esc(clubName(p))}</b><small>🗺️ ${p.territories}</small></div>`).join('')}</div>
          </section>` : ''}
        </aside>
      </div>`;
    root.querySelector('#warSeasonSel').addEventListener('change', (e) => { st.season = e.target.value; window.renderWarView(); });
    root.querySelectorAll('.war-row[data-club]').forEach(r => r.addEventListener('click', () => window.openClubDetail && window.openClubDetail(r.dataset.club, r.dataset.code)));
    root.querySelectorAll('[data-war-go]').forEach(b => b.addEventListener('click', () => switchView(b.dataset.warGo)));
  }

  function seasonOptions(d) {
    // Joriy oy va oldingi 5 oy
    const out = [];
    const now = new Date(Date.now() + 5 * 3600 * 1000);
    for (let k = 0; k < 6; k++) {
      const s = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1)).toISOString().slice(0, 7);
      out.push(`<option value="${s}"${s === d.season ? ' selected' : ''}>${esc(monthName(s))}</option>`);
    }
    return out.join('');
  }

  function myCard(d) {
    if (!d.me) return '';
    if (!d.me.club) return `<section class="war-card war-mine none">
      <h3>🏳️ ${esc(tx('warMyClub', 'Mening klubim'))}</h3>
      <p>${esc(tx('warJoinHint', "Davlat klubiga qo'shiling — g'alabalaringiz davlatingiz uchun hudud olib beradi"))}</p>
      <button type="button" class="war-btn" data-war-go="clubs">${esc(tx('wrJoinClub', "Klublarga o'tish"))}</button>
    </section>`;
    const m = d.me;
    return `<section class="war-card war-mine" style="--club:${clubColor(m.club.code)}">
      <h3>${flag(m.club.code)} ${esc(clubName(m.club))}</h3>
      <div class="war-mine-stats">
        <div><b>${m.rank ? '#' + m.rank : '—'}</b><small>${esc(tx('warPlace', "o'rin"))}</small></div>
        <div><b>${m.club.territories || 0}</b><small>${esc(tx('warTerritories', 'Hududlar'))}</small></div>
        <div><b>${m.club.points || 0}</b><small>${esc(tx('warClubPoints', 'klub ochkosi'))}</small></div>
        <div class="me"><b>${m.myPoints}</b><small>${esc(tx('warMyPoints', 'sizning hissangiz'))}</small></div>
      </div>
      ${m.top && m.top.length ? `<div class="war-top">${m.top.map((t, i) => `<span><em>${i + 1}</em><b class="player-link" data-username="${esc(t.username)}">${esc(t.username)}</b><i>${t.points}</i></span>`).join('')}</div>` : ''}
      ${d.current ? `<button type="button" class="war-btn" data-war-go="game">⚔️ ${esc(tx('warFight', 'Klub uchun o\'ynash'))}</button>` : ''}
    </section>`;
  }

  function drawMap() {
    const box = document.getElementById('warMap');
    if (!box || !st.world || !window.d3 || !window.topojson) return;
    const d = st.data;
    const clubs = new Map(d.clubs.map(c => [c.code, c]));
    const myCode = d.me && d.me.club ? d.me.club.code : null;
    const features = topojson.feature(st.world, st.world.objects.countries).features.filter(f => f.id !== '010'); // Antarktidasiz
    const width = 960, height = 500;
    const projection = d3.geoNaturalEarth1().fitExtent([[6, 6], [width - 6, height - 6]], { type: 'FeatureCollection', features });
    const geoPath = d3.geoPath(projection);
    box.innerHTML = '';
    const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('class', 'war-svg');
    svg.append('path').attr('class', 'war-sphere').attr('d', geoPath({ type: 'Sphere' }));
    const tip = document.getElementById('warTip');
    const codeOf = (f) => st.geo.features[String(f.id)] || null;
    // Klub nomi social.js dagi davlatlar ro'yxatidan (xarita nomlari ba'zan farq qiladi)
    const siteName = (c, f) => { const hit = typeof allCountries !== 'undefined' && c ? allCountries.find(x => x.code === c) : null; return hit ? hit.name : f.properties.name; };
    const labelOf = (f) => { const c = codeOf(f); const club = c && clubs.get(c); return club ? clubName(club) : (window.countryName && c ? window.countryName(siteName(c, f), c) : f.properties.name); };
    svg.append('g').selectAll('path').data(features).join('path')
      .attr('d', geoPath)
      .attr('class', f => {
        const c = codeOf(f), r = c && d.regions[c];
        return 'war-country' + (r ? (r.ruler === c ? ' own' : ' captured') : ' free') + (r && r.ruler === myCode ? ' mine' : '') + (c === myCode ? ' home' : '');
      })
      .attr('style', f => { const c = codeOf(f), r = c && d.regions[c]; return r ? `--fill:${clubColor(r.ruler)}` : null; })
      .on('pointermove', (ev, f) => {
        const c = codeOf(f), r = c && d.regions[c];
        const ruler = r && (clubs.get(r.ruler) || { country: r.ruler, code: r.ruler });
        tip.innerHTML = `<b>${flag(c)}${esc(labelOf(f))}</b>` + (r
          ? `<small>${r.ruler === c ? '🛡️ ' + esc(tx('warHeldBy', "O'z klubi nazoratida")) : '🚩 ' + esc(tx('warCapturedBy', "{{club}} ta'sir doirasida", { club: clubName(ruler) }))}</small><small>${esc(tx('warPower', 'Kuch: {{p}} · o\'z ochkosi: {{o}}', { p: r.power, o: r.own }))}</small>`
          : `<small>${esc(tx('warFree', "Bo'sh — hech kim egallamagan"))}</small>`);
        const rect = box.getBoundingClientRect();
        tip.hidden = false;
        tip.style.left = Math.min(rect.width - 190, Math.max(4, ev.clientX - rect.left + 12)) + 'px';
        tip.style.top = Math.max(4, ev.clientY - rect.top - 10) + 'px';
      })
      .on('pointerleave', () => { tip.hidden = true; })
      .on('click', (ev, f) => {
        const c = codeOf(f);
        if (ev.pointerType === 'touch') return; // telefonda bosish — faqat ma'lumot
        if (c && window.openClubDetail) window.openClubDetail(clubs.get(c) ? clubs.get(c).country : siteName(c, f), c);
      });
  }

})();
