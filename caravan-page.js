// 🐪 Karvon yo'li sahifasi (#caravanView → #caravanRoot, /karvon, cv-*): o'z karvonim, 12 bekatli yo'l, eng uzoq yurganlar.
// Qadamlar va shaharlar — caravan.js (server bilan umumiy). Profilda #profileCaravan, o'yindan keyin yangi shahar — toast.
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lang = () => window.currentLang || 'en';
  const name = (key) => (window.Caravan ? window.Caravan.cityName(key, lang()) : key);
  const flag = (code) => code ? `<img class="cv-flag" src="https://flagcdn.com/w20/${esc(String(code).toLowerCase())}.png" alt="">` : '';
  const st = { data: null };

  function myPoints() {
    return window.Caravan && window.currentUser ? window.Caravan.pointsOf(window.currentUser.stats) : 0;
  }

  function heroHtml(pr) {
    const next = pr.next;
    return `<div class="cv-hero">
      <div class="cv-hero-text">
        <h1>🐪 ${esc(tx('cvTitle', "Karvon yo'li"))}</h1>
        <p>${esc(tx('cvSubtitle', "Har bir o'yin karvoningizni Ipak yo'li bo'ylab oldinga yuradi: g'alaba +3, durrang +2, mag'lubiyat +1 qadam."))}</p>
      </div>
      <div class="cv-me">
        <div class="cv-me-city"><span class="cv-me-ico">${pr.city.icon}</span>
          <div><small>${esc(tx('cvYourCaravan', 'Karvoningiz'))}</small><b>${esc(name(pr.city.key))}</b></div>
          <span class="cv-me-pts">${esc(tx('cvSteps', '{{n}} qadam', { n: pr.points }))}</span></div>
        <div class="cv-bar"><i style="width:${pr.pct}%"></i><span class="cv-camel" style="left:${pr.pct}%">🐪</span></div>
        <div class="cv-me-next">${next
          ? `${esc(tx('cvToNext', '{{city}}gacha {{n}} qadam qoldi', { city: name(next.key), n: pr.left }))} <span>${next.icon}</span>`
          : esc(tx('cvFinished', "Siz Ipak yo'lining oxiriga yetdingiz! 🎉"))}</div>
        <button type="button" class="cv-play" data-cv-play>⚡ ${esc(tx('cvPlay', "O'ynab, oldinga yurish"))}</button>
      </div>
    </div>`;
  }

  function routeHtml(pr, perCity) {
    const C = window.Caravan.CITIES;
    return `<div class="cv-card"><h2>🗺️ ${esc(tx('cvRoute', "Yo'l xaritasi"))}</h2><ol class="cv-route">${C.map((c, i) => {
      const state = i < pr.index ? 'passed' : (i === pr.index ? 'here' : 'ahead');
      const n = perCity && perCity[i] ? perCity[i] : 0;
      const right = state === 'here' ? `<span class="cv-tag here">🐪 ${esc(tx('cvHere', 'Siz shu yerdasiz'))}</span>`
        : state === 'passed' ? `<span class="cv-tag ok">✓ ${esc(tx('cvPassed', "O'tildi"))}</span>`
          : `<span class="cv-tag">${esc(tx('cvSteps', '{{n}} qadam', { n: c.at }))}</span>`;
      return `<li class="cv-stop ${state}"><span class="cv-dot">${c.icon}</span>
        <span class="cv-stop-name"><b>${esc(name(c.key))}</b>${n ? `<small>👥 ${esc(tx('cvTravellers', '{{n}} karvon', { n }))}</small>` : ''}</span>${right}</li>`;
    }).join('')}</ol></div>`;
  }

  function leadersHtml(d) {
    const list = (d && d.leaders) || [];
    return `<div class="cv-card"><h2>🏆 ${esc(tx('cvLeaders', 'Eng uzoq yurgan karvonlar'))}</h2>${list.length ? `<ol class="cv-leaders">${list.map((p, i) => `
      <li><span class="cv-rank">${i + 1}</span><span class="cv-lname">${flag(p.country)}<b class="player-link" data-username="${esc(p.username)}">${esc(p.username)}</b></span>
      <span class="cv-lcity">${window.Caravan.CITIES.find((c) => c.key === p.city).icon} ${esc(name(p.city))}</span><span class="cv-lpts">${esc(p.points)}</span></li>`).join('')}</ol>`
      : `<p class="cv-empty">${esc(tx('cvNoLeaders', "Hali hech kim yo'lga chiqmagan — birinchi bo'ling!"))}</p>`}</div>`;
  }

  // 🎯 Haftalik vazifalar (GET /api/quests; quests.js — vazifalar ro'yxati). Mehmonga ko'rsatilmaydi
  function questsHtml() {
    const q = st.quests;
    if (!q || !window.currentUser || window.currentUser.guest) return '';
    const left = Math.max(0, new Date(q.endsAt).getTime() - Date.now());
    const days = Math.floor(left / 864e5), hours = Math.floor((left % 864e5) / 36e5);
    return `<div class="cv-card cv-quests${q.completed ? ' done' : ''}">
      <div class="cv-q-head"><h2>🎯 ${esc(tx('qTitle', 'Haftalik vazifalar'))}</h2>
        <span>${esc(q.completed ? tx('qAllDone', "Bu hafta bajarildi! ✓") : tx('qEndsIn', '{{d}} kun {{h}} soat qoldi', { d: days, h: hours }))} · 🎖️ ${esc(q.badges)}</span></div>
      <div class="cv-q-list">${q.quests.map((x) => `<div class="cv-q${x.done ? ' ok' : ''}"><span class="cv-q-ico">${x.done ? '✅' : x.icon}</span>
        <span class="cv-q-text"><b>${esc(tx('q_' + x.id, x.id, { n: x.need }))}</b><span class="cv-q-bar"><i style="width:${Math.round((x.have / x.need) * 100)}%"></i></span></span>
        <span class="cv-q-n">${esc(x.have)}/${esc(x.need)}</span></div>`).join('')}</div>
      <p class="cv-q-hint">${esc(tx('qHint', "Uchala vazifani bajaring — haftalik 🎖️ nishon olasiz. Har dushanba yangi vazifalar."))}</p>
    </div>`;
  }

  function render() {
    const root = document.getElementById('caravanRoot');
    if (!root || !window.Caravan) return;
    const pr = window.Caravan.progress(myPoints());
    root.innerHTML = heroHtml(pr) + questsHtml() + `<div class="cv-grid">${routeHtml(pr, st.data && st.data.perCity)}${leadersHtml(st.data)}</div>`;
    const play = root.querySelector('[data-cv-play]');
    if (play) play.addEventListener('click', () => { if (typeof window.quickPlayOnline === 'function') window.quickPlayOnline(); else window.switchView('game'); });
  }

  window.renderCaravanView = async function () {
    render();
    try {
      // O'z statistikam serverdan yangilansin (boshqa qurilmada o'ynagan bo'lishi mumkin)
      if (window.currentUser && typeof window.refreshCurrentUserRatings === 'function') await window.refreshCurrentUserRatings();
      const [d, q] = await Promise.all([
        fetch('/api/caravan').then((r) => r.json()),
        window.authToken && !(window.currentUser && window.currentUser.guest)
          ? fetch('/api/quests', { headers: { Authorization: 'Bearer ' + window.authToken } }).then((r) => r.json()).catch(() => null) : null
      ]);
      if (d && d.success) st.data = d;
      if (q && q.success) st.quests = q;
    } catch (e) {}
    const v = document.getElementById('caravanView');
    if (v && v.classList.contains('active-view')) render();
  };

  // Profil: "🐪 Karvon: Samarqand · 186 qadam" (bosilsa — Karvon yo'li sahifasi)
  window.renderProfileCaravan = function (points, questBadges) {
    const el = document.getElementById('profileCaravan');
    if (!el) return;
    if (points == null || !window.Caravan) { el.hidden = true; return; }
    const pr = window.Caravan.progress(points);
    el.hidden = false;
    el.innerHTML = `<button type="button" class="cv-chip">${pr.city.icon} ${esc(tx('cvProfile', 'Karvon: {{city}} · {{n}} qadam', { city: name(pr.city.key), n: points }))}${questBadges ? ` · 🎖️ ${esc(questBadges)}` : ''}</button>`;
    el.querySelector('button').onclick = () => { if (typeof window.closeProfileModal === 'function') window.closeProfileModal(); window.switchView('caravan'); };
  };

  // O'yindan keyin yangi shaharga yetgan bo'lsa — tabrik
  const origApply = window.applyServerGameResult;
  if (typeof origApply === 'function') {
    window.applyServerGameResult = function (data) {
      const r = origApply.apply(this, arguments);
      try {
        if (data && data.caravan && data.caravan.arrived && !(window.currentUser && window.currentUser.guest)) {
          setTimeout(() => { if (typeof window.showToast === 'function') window.showToast(tx('cvArrived', '🐪 Karvoningiz {{city}}ga yetib keldi!', { city: name(data.caravan.city) }), 'success', 6000); }, 1800);
        }
      } catch (e) {}
      return r;
    };
  }
})();
