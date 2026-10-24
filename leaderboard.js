// "Reyting" sahifasi: o'yinchilar (umumiy / rapid / blitz / bullet) va davlat klublari.
// Shohsupa (top 3), qidiruv, "Mening davlatim" filtri, "Sizning o'rningiz" paneli va ro'yxat.
(function () {
  const st = { tab: 'players', mode: 'all', query: '', myCountry: false, players: [], clubs: [], loaded: false };

  const esc = (v) => {
    const div = document.createElement('div');
    div.textContent = (v === null || v === undefined) ? '' : String(v);
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  const root = () => document.getElementById('leaderboardRoot');
  const flag = (code, cls) => code ? `<img class="${cls || 'lb-flag'}" src="https://flagcdn.com/w40/${esc(String(code).toLowerCase())}.png" alt="" loading="lazy" onerror="this.remove()">` : '';
  const clubName = (c) => (typeof window.countryName === 'function' ? window.countryName(c.name, c.code) : c.name);
  const avatar = (p, cls) => `<span class="lb-avatar ${cls || ''}">${esc((p.username || '?').charAt(0).toUpperCase())}${window.avatarOverlay ? window.avatarOverlay(p.username, p.avatarVersion || null) : ''}</span>`;
  const modes = [['all', '🏆', 'lbModeAll', 'Umumiy'], ['rapid', '⏱️', 'lbModeRapid', 'Rapid'], ['blitz', '⚡', 'lbModeBlitz', 'Blitz'], ['bullet', '🔥', 'lbModeBullet', 'Bullet'], ['chess960', '🎲', 'lbModeChess960', 'Chess960'], ['shatranj', '🏺', 'variantShatranj', 'Shatranj']];

  // O'yinchining tanlangan rejimdagi reytingi va natijalari
  function view(p) {
    const s = st.mode === 'all'
      ? { wins: p.wins || 0, losses: p.losses || 0, draws: p.draws || 0 }
      : ((p.statsByMode && p.statsByMode[st.mode]) || { wins: 0, losses: 0, draws: 0 });
    const games = (s.wins || 0) + (s.losses || 0) + (s.draws || 0);
    const rating = st.mode === 'all' ? (p.rating || 1500) : ((p.ratingsByMode && p.ratingsByMode[st.mode]) || 1500);
    return { ...p, rating, w: s.wins || 0, d: s.draws || 0, l: s.losses || 0, games, pct: games ? Math.round((s.wins / games) * 1000) / 10 : 0 };
  }

  function rankedPlayers() {
    let list = st.players.map(view);
    if (st.mode !== 'all') list = list.filter(p => p.games > 0);
    list.sort((a, b) => b.rating - a.rating || b.games - a.games || a.username.localeCompare(b.username));
    return list.map((p, i) => ({ ...p, rank: i + 1 }));
  }

  async function load() {
    try {
      const [p, c] = await Promise.all([
        fetch('/api/leaderboard').then(r => r.json()).catch(() => null),
        fetch('/api/clubs/leaderboard').then(r => r.json()).catch(() => null)
      ]);
      st.players = p && p.success ? (p.leaderboard || []) : [];
      st.clubs = c && c.success ? (c.leaderboard || []) : [];
      st.loaded = true;
    } catch (e) { st.loaded = true; }
    render();
  }

  // --- Qismlar ---
  function headerHtml() {
    const tabs = [['players', '👥', tx('lbTabPlayers', "O'yinchilar")], ['clubs', '🏛️', tx('lbTabClubs', 'Klublar')]];
    return `<header class="lb-head">
      <div><h1>${esc(tx('lbTitle', 'Reyting'))}</h1><p>${esc(st.tab === 'players' ? tx('lbSubPlayers', "Eng kuchli o'yinchilar — reyting bo'yicha") : tx('lbSubClubs', "Davlat klublari — liga ochkolari va o'rtacha reyting bo'yicha"))}</p></div>
      <div class="lb-seg">${tabs.map(([id, icon, label]) => `<button class="${st.tab === id ? 'active' : ''}" data-tab="${id}">${icon} ${esc(label)}</button>`).join('')}</div>
    </header>`;
  }

  function toolbarHtml() {
    const me = window.currentUser;
    const myCountry = me && me.country;
    return `<div class="lb-toolbar">
      <div class="lb-modes">${modes.map(([id, icon, key, fb]) => `<button class="lb-chip${st.mode === id ? ' active' : ''}" data-mode="${id}">${icon} ${esc(tx(key, fb))}</button>`).join('')}</div>
      <div class="lb-tools">
        ${myCountry ? `<button class="lb-chip${st.myCountry ? ' active' : ''}" data-mycountry="1">${flag(myCountry, 'lb-flag sm')} ${esc(tx('lbMyCountry', 'Mening davlatim'))}</button>` : ''}
        <label class="lb-search"><span>🔍</span><input id="lbSearch" type="search" placeholder="${esc(tx('lbSearch', "O'yinchini qidirish"))}" value="${esc(st.query)}" autocomplete="off"></label>
      </div>
    </div>
    ${window.rankLegendHtml ? `<div class="rk-legend"><span class="rk-legend-title">${esc(tx('rkLegend', 'Darajalar'))}:</span>${window.rankLegendHtml()}</div>` : ''}`;
  }

  function podiumHtml(top, kind) {
    if (!top.length) return '';
    const order = [top[1], top[0], top[2]];
    return `<div class="lb-podium">${order.map((x, i) => {
      if (!x) return '<div class="lb-pod empty"></div>';
      const place = [2, 1, 3][i];
      if (kind === 'clubs') {
        return `<button class="lb-pod p${place}" data-club="${esc(x.name)}" data-code="${esc(x.code || '')}">
          <span class="lb-pod-medal">${['🥇', '🥈', '🥉'][place - 1]}</span>
          <span class="lb-pod-flag">${flag(x.code, 'lb-flag xl')}</span>
          <b class="lb-pod-name">${esc(clubName(x))}</b>
          <span class="lb-pod-rating">${x.leaguePoints} <small>${esc(tx('lbPointsShort', 'ochko'))}</small></span>
          <span class="lb-pod-meta">${esc(tx('lbMembersN', "{{n}} a'zo", { n: x.members }))} · ⌀ ${x.avgRating}</span>
        </button>`;
      }
      return `<div class="lb-pod p${place}">
        <span class="lb-pod-medal">${['🥇', '🥈', '🥉'][place - 1]}</span>
        ${avatar(x, 'xl')}
        <b class="lb-pod-name player-link" data-username="${esc(x.username)}">${flag(x.country)}${esc(x.username)}</b>
        <span class="lb-pod-rating">${x.games && window.rankBadge ? window.rankBadge(x.rating) : ''}${x.rating}</span>
        <span class="lb-pod-meta"><i class="w">${x.w}</i> / <i class="d">${x.d}</i> / <i class="l">${x.l}</i></span>
      </div>`;
    }).join('')}</div>`;
  }

  function pctBar(pct, games) {
    const cls = pct >= 55 ? 'hi' : (pct >= 40 ? 'mid' : 'lo');
    return `<span class="lb-pct ${games ? cls : 'none'}"><b>${games ? pct.toFixed(1) + '%' : '—'}</b><i style="width:${games ? Math.max(4, pct) : 0}%"></i></span>`;
  }

  function playerRow(p, isMe) {
    const club = p.club ? `<span class="lb-club">${flag(p.club.code, 'lb-flag sm')}${esc(clubName(p.club))}</span>` : '';
    return `<div class="lb-row${isMe ? ' me' : ''}${p.rank <= 3 ? ' top' + p.rank : ''}" id="${isMe ? 'lbMeRow' : ''}">
      <span class="lb-rank">${p.rank}</span>
      <span class="lb-who">${avatar(p)}<span class="lb-name"><b class="player-link" data-username="${esc(p.username)}">${flag(p.country)}${esc(p.username)}</b>${club}</span></span>
      <span class="lb-rating">${p.games && window.rankBadge ? window.rankBadge(p.rating) : ''}${p.rating}</span>
      <span class="lb-games">${p.games}</span>
      <span class="lb-wdl"><i class="w">${p.w}</i>/<i class="d">${p.d}</i>/<i class="l">${p.l}</i></span>
      ${pctBar(p.pct, p.games)}
    </div>`;
  }

  function playersHtml() {
    const all = rankedPlayers();
    if (!all.length) return `<div class="lb-empty">${esc(st.mode === 'all' ? tx('clubRankEmptyPlayers', "Hozircha ro'yxatda o'yinchilar yo'q") : tx('lbEmptyMode', "Bu rejimda hali hech kim o'ynamagan"))}</div>`;
    const meName = window.currentUser && window.currentUser.username;
    const myCountry = window.currentUser && window.currentUser.country;
    const q = st.query.trim().toLowerCase();
    let list = all;
    if (st.myCountry && myCountry) list = list.filter(p => p.country === myCountry);
    if (q) list = list.filter(p => p.username.toLowerCase().includes(q));
    const filtered = !!q || st.myCountry;
    const me = all.find(p => p.username === meName);
    const meBar = me ? `<div class="lb-mebar">
        <span class="lb-mebar-rank">#${me.rank}</span>
        <span>${esc(tx('lbYourPlace', "Sizning o'rningiz"))} · <b>${me.rating}</b> · ${esc(tx('lbGamesN', "{{n}} o'yin", { n: me.games }))}</span>
        <button class="lb-chip" data-jump="1">${esc(tx('lbShowMe', "Ro'yxatda ko'rish"))} ↓</button>
      </div>` : '';
    const rows = (filtered ? list : list.slice(3)).map(p => playerRow(p, p.username === meName)).join('');
    return `${filtered ? '' : podiumHtml(all.slice(0, 3), 'players')}
      ${meBar}
      <div class="lb-table">
        <div class="lb-row lb-th"><span>#</span><span>${esc(tx('colPlayer', "O'yinchi"))}</span><span>${esc(tx('lbColRating', 'Reyting'))}</span><span>${esc(tx('colGames', "O'yinlar"))}</span><span title="${esc(tx('arColWdlTitle', "G'alaba / Durrang / Mag'lubiyat"))}">${esc(tx('arColWdl', 'G / D / M'))}</span><span>${esc(tx('colWinPercent', "G'alaba %"))}</span></div>
        ${rows || `<div class="lb-empty small">${esc(filtered ? tx('lbNoMatch', 'Hech kim topilmadi') : tx('lbOnlyTop', "Hozircha faqat shu o'yinchilar bor"))}</div>`}
      </div>`;
  }

  function clubsHtml() {
    if (!st.clubs.length) return `<div class="lb-empty">${esc(tx('clubRankEmptyClubs', "Hozircha klublar ro'yxati bo'sh"))}</div>`;
    const myClub = window.currentUser && window.currentUser.club && window.currentUser.club.name;
    const rows = st.clubs.map((c, i) => `
      <button class="lb-row lb-club-row${c.name === myClub ? ' me' : ''}${i < 3 ? ' top' + (i + 1) : ''}" data-club="${esc(c.name)}" data-code="${esc(c.code || '')}">
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-who"><span class="lb-flagbox">${flag(c.code, 'lb-flag lg')}</span><span class="lb-name"><b>${esc(clubName(c))}</b><small>${c.top ? esc(tx('lbTopPlayer', 'Eng kuchlisi: {{name}} ({{r}})', { name: c.top.username, r: c.top.rating })) : ''}</small></span></span>
        <span class="lb-rating">${c.leaguePoints}</span>
        <span class="lb-games">${c.members}</span>
        <span class="lb-avg">⌀ ${c.avgRating}</span>
        ${pctBar(c.winPercentage, c.games)}
      </button>`).join('');
    return `${podiumHtml(st.clubs.slice(0, 3), 'clubs')}
      <div class="lb-table clubs">
        <div class="lb-row lb-th"><span>#</span><span>${esc(tx('clubRankClan', 'Klub'))}</span><span title="${esc(tx('lbPointsTitle', 'Liga ochkolari'))}">${esc(tx('lbColPoints', 'Ochko'))}</span><span>${esc(tx('lbColMembers', "A'zolar"))}</span><span>${esc(tx('lbColAvg', "O'rt. reyting"))}</span><span>${esc(tx('colWinPercent', "G'alaba %"))}</span></div>
        ${rows}
      </div>`;
  }

  function render() {
    const el = root();
    if (!el) return;
    if (!st.loaded) { el.innerHTML = `${headerHtml()}<div class="lb-empty">${esc(tx('loadingText', 'Yuklanmoqda...'))}</div>`; bind(el); return; }
    const focus = document.activeElement && document.activeElement.id === 'lbSearch';
    const caret = focus ? document.activeElement.selectionStart : null;
    el.innerHTML = headerHtml() + (st.tab === 'players' ? toolbarHtml() + playersHtml() : clubsHtml());
    bind(el);
    if (focus) { const s = document.getElementById('lbSearch'); if (s) { s.focus(); s.setSelectionRange(caret, caret); } }
  }

  function bind(el) {
    el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { st.tab = b.dataset.tab; render(); }));
    el.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { st.mode = b.dataset.mode; render(); }));
    el.querySelectorAll('[data-mycountry]').forEach(b => b.addEventListener('click', () => { st.myCountry = !st.myCountry; render(); }));
    const search = el.querySelector('#lbSearch');
    if (search) search.addEventListener('input', () => { st.query = search.value; render(); });
    el.querySelectorAll('[data-jump]').forEach(b => b.addEventListener('click', () => {
      st.query = ''; st.myCountry = false; render();
      const row = document.getElementById('lbMeRow');
      if (row) { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 1600); }
    }));
    el.querySelectorAll('[data-club]').forEach(b => b.addEventListener('click', (e) => {
      if (e.target.closest('.player-link')) return;
      if (typeof window.openClubDetail === 'function') window.openClubDetail(b.dataset.club, b.dataset.code || null);
    }));
  }

  // script.js switchView('leaderboard') shu funksiyani chaqiradi
  window.updateFullLeaderboard = function () {
    st.mode = 'all'; st.query = ''; st.myCountry = false;
    render();
    load();
  };
  window.refreshLeaderboardView = function () {
    const v = document.getElementById('leaderboardView');
    if (v && v.classList.contains('active-view')) render();
  };
})();
