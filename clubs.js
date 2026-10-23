// 🛡️ Klublar bo'limi (yangi ko'rinish, 2026-10-23): ixcham ro'yxat (mening klubim, faol klublar tepada) va bitta klub sahifasi
// to'rt tab bilan — Umumiy, A'zolar, Liga, Chat. social.js dagi eski funksiyalar (openClubDetail, showClubChat, showClubLeaderboard,
// showClubHistory, showClubTournaments, loadClubs ...) shu yerda almashtiriladi; router.js ularni keyin o'raydi (manzillar o'zgarmaydi:
// /klublar?club=<davlat>[&tab=reyting|tarix|turnirlar|chat]). Klub rahbariyati/yangiliklari — clubstaff.js (#clubStaffNews).
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const flagUrl = (code, w) => `https://flagcdn.com/w${w || 80}/${encodeURIComponent(String(code || '').toLowerCase())}.png`;
  const countries = () => (typeof allCountries !== 'undefined' ? allCountries : []);
  const codeOf = (name) => { const c = countries().find((x) => x.name === name); return c ? c.code : ''; };
  const localName = (name, code) => (typeof window.countryName === 'function' ? window.countryName(name, code) : name);
  const myClubName = () => (window.currentUser && window.currentUser.club && window.currentUser.club.name) || null;
  const TAB_URL = { overview: null, members: 'reyting', league: 'turnirlar', chat: 'chat' };
  const st = { name: null, code: null, tab: 'overview', sort: 'rating', data: null, board: null, leagues: null, token: 0 };

  // --- Umumiy ma'lumotlar (kesh: klublar reytingi va ligalar 60 s) ---
  let boardAt = 0, leaguesAt = 0;
  async function loadBoard() {
    if (st.board && Date.now() - boardAt < 60000) return st.board;
    try { const d = await fetch('/api/clubs/leaderboard').then((r) => r.json()); if (d.success) { st.board = d.leaderboard || []; boardAt = Date.now(); } } catch (e) {}
    return st.board || [];
  }
  async function loadLeagues() {
    if (st.leagues && Date.now() - leaguesAt < 60000) return st.leagues;
    try { const d = await fetch('/api/leagues').then((r) => r.json()); if (d.success) { st.leagues = d; leaguesAt = Date.now(); } } catch (e) {}
    return st.leagues;
  }

  // ===================== Ro'yxat =====================
  function tile(c, members, mine) {
    return `<button type="button" class="cl-tile${mine ? ' mine' : ''}${members ? '' : ' empty'}" data-club="${esc(c.name)}" data-code="${esc(c.code)}">
      <img src="${flagUrl(c.code, 80)}" alt="" loading="lazy">
      <span class="cl-tile-name">${esc(localName(c.name, c.code))}</span>
      <span class="cl-tile-count">${mine ? '✓ ' : ''}👥 ${members}</span>
    </button>`;
  }

  function myClubCard() {
    const mine = myClubName();
    if (!window.currentUser) return '';
    if (!mine) {
      return `<div class="cl-mine none"><span class="cl-mine-ico">🛡️</span><div><b>${esc(tx('clNoClubTitle', "Davlatingiz klubiga qo'shiling"))}</b>
        <p>${esc(tx('clNoClubText', "Klub a'zolari ligalarda birga o'ynaydi va Bayroqlar bellashuvida davlati uchun ochko yig'adi."))}</p></div></div>`;
    }
    const code = (window.currentUser.club && window.currentUser.club.code) || codeOf(mine);
    const members = window.countryClubCounts[mine] || 0;
    const row = (st.board || []).findIndex((c) => c.name === mine);
    return `<button type="button" class="cl-mine" data-club="${esc(mine)}" data-code="${esc(code)}">
      <img src="${flagUrl(code, 160)}" alt="">
      <div><small>${esc(tx('clMyClub', 'Mening klubim'))}</small><b>${esc(tx('clubDetailTitle', '{{country}} shaxmat klubi', { country: localName(mine, code) }))}</b>
      <span>👥 ${members}${row >= 0 ? ' · ' + esc(tx('clRank', 'Klublar reytingida #{{n}}', { n: row + 1 })) : ''}</span></div>
      <span class="cl-mine-go">→</span>
    </button>`;
  }

  function renderList() {
    const box = document.getElementById('clubsListContainer');
    if (!box) return;
    box.className = 'cl-list';
    box.removeAttribute('style');
    const input = document.getElementById('clubSearchInput');
    const q = input ? input.value.toLowerCase().trim() : '';
    const base = typeof window.getActiveCountries === 'function' ? window.getActiveCountries() : countries();
    const list = q ? base.filter((c) => localName(c.name, c.code).toLowerCase().includes(q) || c.name.toLowerCase().includes(q)) : base.slice();
    const counts = window.countryClubCounts || {};
    const mine = myClubName();
    const byName = (a, b) => localName(a.name, a.code).localeCompare(localName(b.name, b.code));
    const active = list.filter((c) => counts[c.name] > 0).sort((a, b) => counts[b.name] - counts[a.name] || byName(a, b));
    const rest = list.filter((c) => !(counts[c.name] > 0)).sort(byName);
    const totalPlayers = Object.values(counts).reduce((s, n) => s + (Number(n) || 0), 0);
    const activeAll = Object.values(counts).filter((n) => n > 0).length;
    let html = (q ? '' : myClubCard());
    if (!list.length) html += `<div class="cl-empty">${esc(tx('searchNoResults', 'Hech narsa topilmadi'))}</div>`;
    if (active.length) {
      html += `<div class="cl-section"><h3>🔥 ${esc(tx('clActiveTitle', 'Faol klublar'))}</h3><span>${esc(tx('clActiveClubs', "{{n}} ta faol klub · {{m}} o'yinchi", { n: activeAll, m: totalPlayers }))}</span></div>
        <div class="cl-grid">${active.map((c) => tile(c, counts[c.name], c.name === mine)).join('')}</div>`;
    }
    if (rest.length) {
      html += `<div class="cl-section"><h3>${esc(tx('clEmptyClubs', 'Boshqa klublar'))}</h3><span>${rest.length}</span></div>
        <div class="cl-grid small">${rest.map((c) => tile(c, 0, c.name === mine)).join('')}</div>`;
    }
    box.innerHTML = html;
    box.querySelectorAll('[data-club]').forEach((b) => b.addEventListener('click', () => window.openClubDetail(b.dataset.club, b.dataset.code)));
  }

  window.loadClubs = async function () {
    renderList();
    await Promise.all([typeof syncClubDirectory === 'function' ? syncClubDirectory() : null, loadBoard()]);
    renderList();
  };
  let filterTimer = null;
  window.filterCountries = function () { clearTimeout(filterTimer); filterTimer = setTimeout(renderList, 150); };

  // ===================== Klub sahifasi =====================
  function showView() {
    document.querySelectorAll('.view-section').forEach((el) => el.classList.remove('active-view'));
    document.querySelectorAll('.menu-item').forEach((el) => el.classList.remove('active'));
    const v = document.getElementById('clubDetailView');
    v.classList.add('active-view');
    v.style.backgroundImage = '';
    v.style.backgroundColor = '';
    const nav = document.getElementById('navClubs');
    if (nav) nav.classList.add('active');
  }

  function heroHtml() {
    const name = st.name, code = st.code;
    const d = st.data;
    const joined = myClubName() === name;
    const members = d ? d.stats.members : (window.countryClubCounts[name] || 0);
    const rankIdx = (st.board || []).findIndex((c) => c.name === name);
    const row = rankIdx >= 0 ? st.board[rankIdx] : null;
    const meta = [`👥 ${esc(members)} ${esc(tx('membersLabel', "a'zo"))}`];
    if (row) meta.push(esc(tx('clRank', 'Klublar reytingida #{{n}}', { n: rankIdx + 1 })));
    return `<div class="cl-hero">
      <img class="cl-hero-bg" src="${flagUrl(code, 640)}" alt="">
      <button type="button" class="cl-back" data-cl-back>${esc(tx('clAllClubs', '← Klublar'))}</button>
      <div class="cl-hero-main">
        <img class="cl-hero-flag" src="${flagUrl(code, 160)}" alt="">
        <div class="cl-hero-text"><h1>${esc(tx('clubDetailTitle', '{{country}} shaxmat klubi', { country: localName(name, code) }))}</h1>
          <div class="cl-hero-meta">${meta.join(' · ')}</div></div>
        <button type="button" class="cl-join${joined ? ' leave' : ''}" data-cl-join>${esc(joined ? tx('clubDetailLeaveBtn', 'Klubdan chiqish') : tx('clubDetailJoinBtn', "Klubga qo'shilish"))}</button>
      </div>
    </div>
    <div class="cl-tabs" role="tablist">${[['overview', tx('clTabOverview', 'Umumiy')], ['members', tx('clubDetailMembersCard', "A'zolar"), d ? d.stats.members : null], ['league', tx('clTabLeague', 'Liga')], ['chat', tx('clubDetailChatBtn', 'Chat')]]
      .map(([k, label, count]) => `<button type="button" class="cl-tab${st.tab === k ? ' active' : ''}" data-cl-tab="${k}">${esc(label)}${count != null ? ` <small>${esc(count)}</small>` : ''}</button>`).join('')}</div>
    <div class="cl-pane" id="clPane"></div>`;
  }

  function memberRow(m, i, showRank) {
    const avatar = `<span class="cl-av">${esc((m.username || '?').charAt(0).toUpperCase())}${typeof window.avatarOverlay === 'function' ? window.avatarOverlay(m.username) : ''}</span>`;
    const badge = typeof window.rankBadge === 'function' ? window.rankBadge(Number(m.rating) || 1500) : '';
    const joined = m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : '';
    return `<li class="cl-mrow">${showRank ? `<span class="cl-pos p${i + 1}">${i + 1}</span>` : ''}${avatar}
      <span class="cl-mname"><b class="player-link" data-username="${esc(m.username)}">${esc(m.username)}</b>${badge}<small>${esc(tx('profLabelRating', 'Reyting:'))} ${esc(Number(m.rating) || 1500)} · ${esc(m.wins || 0)}/${esc(m.draws || 0)}/${esc(m.losses || 0)}${joined ? ' · ' + esc(tx('clubHistoryJoined', "Qo'shilgan:")) + ' ' + esc(joined) : ''}</small></span>
      <span class="cl-mrating">${esc(Number(m.rating) || 1500)}</span></li>`;
  }

  function overviewHtml() {
    const d = st.data;
    if (!d) return `<div class="cl-loading">${esc(tx('loadingText', 'Yuklanmoqda...'))}</div>`;
    const row = (st.board || []).find((c) => c.name === st.name);
    const stat = (v, label) => `<div class="cl-stat"><b>${esc(v)}</b><span>${esc(label)}</span></div>`;
    const top = d.members.slice(0, 5);
    const joined = myClubName() === st.name;
    return `<div class="cl-overview">
      <div class="cl-col">
        <div class="cl-stats">${stat(d.stats.members, tx('clubDetailMembersCard', "A'zolar"))}${stat(row ? row.avgRating : '—', tx('clAvgRating', "O'rtacha reyting"))}${stat(row ? row.games : 0, tx('clGames', "O'yinlar"))}${stat(d.stats.points, tx('clLeaguePts', 'Liga ochkolari'))}</div>
        ${joined || !window.currentUser ? '' : `<div class="cl-cta"><span>🛡️ ${esc(tx('clNoClubText', "Klub a'zolari ligalarda birga o'ynaydi va Bayroqlar bellashuvida davlati uchun ochko yig'adi."))}</span><button type="button" class="cl-join small" data-cl-join>${esc(tx('clubDetailJoinBtn', "Klubga qo'shilish"))}</button></div>`}
        <div class="cl-card"><div class="cl-card-head"><h3>🏆 ${esc(tx('clubDetailTopPlayersTitle', "Eng kuchli o'yinchilar"))}</h3>${d.members.length > 5 ? `<button type="button" class="cl-link" data-cl-tab="members">${esc(tx('clubDetailMembersCard', "A'zolar"))} →</button>` : ''}</div>
          ${top.length ? `<ol class="cl-members">${top.map((m, i) => memberRow(m, i, true)).join('')}</ol>` : `<p class="cl-muted">${esc(tx('clubDetailNoMembers', "Hali a'zolar yo'q. Birinchi bo'lib qo'shiling!"))}</p>`}</div>
        <div class="cl-card"><h3>📖 ${esc(tx('clubDetailAboutTitle', 'Klub haqida'))}</h3><p class="cl-about">${esc(String(tx('clubDetailAboutText', "Rasmiy {country} shaxmat klubiga xush kelibsiz!")).replace(/\{country\}/g, localName(st.name, st.code)))}</p></div>
      </div>
      <div class="cl-col"><div id="clubStaffNews" class="cs-root"></div></div>
    </div>`;
  }

  function membersHtml() {
    const d = st.data;
    if (!d) return `<div class="cl-loading">${esc(tx('loadingText', 'Yuklanmoqda...'))}</div>`;
    const list = d.members.slice();
    if (st.sort === 'newest') list.sort((a, b) => (b.joinedAt ? new Date(b.joinedAt) : 0) - (a.joinedAt ? new Date(a.joinedAt) : 0));
    return `<div class="cl-card"><div class="cl-card-head"><h3>👥 ${esc(tx('clubDetailMembersCard', "A'zolar"))} <small>${list.length}</small></h3>
      <div class="cl-sort">${[['rating', tx('clSortRating', "Reyting bo'yicha")], ['newest', tx('clSortNewest', "Yangi a'zolar")]].map(([k, l]) => `<button type="button" class="${st.sort === k ? 'active' : ''}" data-cl-sort="${k}">${esc(l)}</button>`).join('')}</div></div>
      ${list.length ? `<ol class="cl-members">${list.map((m, i) => memberRow(m, i, st.sort === 'rating')).join('')}</ol>` : `<p class="cl-muted">${esc(tx('clubDetailNoMembers', "Hali a'zolar yo'q. Birinchi bo'lib qo'shiling!"))}</p>`}</div>`;
  }

  function continentOf(name) {
    if (typeof continentCountries === 'undefined') return null;
    return Object.keys(continentCountries).find((k) => k !== 'All' && (continentCountries[k] || []).some((c) => c.name === name)) || null;
  }
  const leagueLabel = (k) => (typeof window.getLeagueI18nName === 'function' && window.CONTINENTS && window.CONTINENTS[k]) ? window.getLeagueI18nName(k, window.CONTINENTS[k].name) : k;

  function leagueHtml() {
    const ov = st.leagues;
    const cont = continentOf(st.name);
    if (!ov || !cont) return `<div class="cl-loading">${esc(tx('loadingText', 'Yuklanmoqda...'))}</div>`;
    const icon = (window.CONTINENTS && window.CONTINENTS[cont] && window.CONTINENTS[cont].flag) || '🏆';
    const div = (ov.divisions || []).find((d) => d.kind === 'league' && d.continent === cont);
    const rules = ov.rules || { minMembers: 10, minClubs: 2 };
    const q = (ov.qualification && ov.qualification[cont]) || { qualified: 0, clubs: [] };
    const members = st.data ? st.data.stats.members : (window.countryClubCounts[st.name] || 0);
    const bar = (n, max) => `<span class="cl-bar"><i style="width:${Math.min(100, Math.round((n / max) * 100))}%"></i></span>`;
    if (div) {
      return `<div class="cl-card cl-league"><div class="cl-league-ico">${icon}</div>
        <h3>${esc(div.status === 'active' ? tx('clLeagueActive', '{{league}} davom etmoqda', { league: leagueLabel(cont) }) : tx('clLeagueFinished', '{{league}} yakunlangan', { league: leagueLabel(cont) }))}</h3>
        <div class="cl-league-actions"><button type="button" class="cl-join small" onclick="window.openLeagueDivision('${esc(div.id)}')">${esc(tx('clOpenTable', 'Jadvalni ochish'))}</button>
        <button type="button" class="cl-ghost" onclick="switchView('leagues')">${esc(tx('clAllLeagues', 'Ligalar sahifasi'))}</button></div></div>`;
    }
    return `<div class="cl-card cl-league"><div class="cl-league-ico">${icon}</div>
      <h3>${esc(tx('clLeagueNotStarted', '{{league}} hali boshlanmagan', { league: leagueLabel(cont) }))}</h3>
      <p class="cl-muted">${esc(tx('clLeagueNeed', "Liga boshlanishi uchun qit'ada kamida {{clubs}} ta klubda {{min}} tadan a'zo bo'lishi kerak.", { clubs: rules.minClubs, min: rules.minMembers }))}</p>
      <div class="cl-league-row"><span>${esc(tx('clLeagueThisClub', "Bu klub: {{n}}/{{min}} a'zo", { n: members, min: rules.minMembers }))}</span>${bar(members, rules.minMembers)}</div>
      <div class="cl-league-row"><span>${esc(tx('clLeagueReadyClubs', 'Tayyor klublar: {{n}}/{{need}}', { n: q.qualified, need: rules.minClubs }))}</span>${bar(q.qualified, rules.minClubs)}</div>
      <div class="cl-league-actions">${typeof window.openInviteDialog === 'function' && window.currentUser ? `<button type="button" class="cl-join small" onclick="window.openInviteDialog()">${esc(tx('clInviteFriends', "🔗 Do'stlarni taklif qilish"))}</button>` : ''}
      <button type="button" class="cl-ghost" onclick="switchView('leagues')">${esc(tx('clAllLeagues', 'Ligalar sahifasi'))}</button></div></div>`;
  }

  // Chat: mavjud chat oynasi (#clubChatView ichidagi .club-chat-container) klub sahifasining Chat tabiga ko'chiriladi
  function mountChat(pane) {
    const chat = document.querySelector('.club-chat-container');
    if (!chat) return;
    pane.innerHTML = '';
    pane.appendChild(chat);
    chat.classList.add('cl-chat');
    const title = document.getElementById('clubChatTitle');
    if (title) title.textContent = tx('clubChatTitle', '{{country}} klub chati', { country: localName(st.name, st.code) });
    window.currentClubName = st.name;
    window.currentClubCode = st.code;
    if (typeof window.loadClubChatMessages === 'function') window.loadClubChatMessages();
    if (typeof updateClubChatComposer === 'function') updateClubChatComposer(st.name, st.code);
    if (window.ChatStickers && !chat.dataset.stickers) {
      chat.dataset.stickers = '1';
      window.ChatStickers.attachPicker({
        button: document.getElementById('clubChatEmojiBtn'),
        input: document.getElementById('clubChatMessageInput'),
        mount: document.getElementById('clubChatComposer'),
        onSticker: (sid) => window.sendClubChatMessage('[sticker:' + sid + ']')
      });
    }
    if (typeof socket !== 'undefined' && socket.connected) socket.emit('join-club-room', 'club_' + st.name);
  }
  // Chat tabdan chiqilsa — chat oynasi o'z joyiga qaytadi (boshqa joyda qayta chizilganda yo'qolmasin)
  function parkChat() {
    const chat = document.querySelector('.club-chat-container');
    const home = document.getElementById('clubChatView');
    if (chat && home && chat.parentElement !== home) home.appendChild(chat);
  }

  function renderPane() {
    const pane = document.getElementById('clPane');
    if (!pane) return;
    if (st.tab !== 'chat') parkChat();
    if (st.tab === 'overview') {
      pane.innerHTML = overviewHtml();
      if (st.data && typeof window.renderClubStaffNews === 'function') window.renderClubStaffNews(st.name);
    } else if (st.tab === 'members') pane.innerHTML = membersHtml();
    else if (st.tab === 'league') pane.innerHTML = leagueHtml();
    else if (st.tab === 'chat') {
      if (!window.currentUser) { pane.innerHTML = `<p class="cl-muted">${esc(tx('errChatLoginRequired', 'Chat uchun avval tizimga kirishingiz kerak!'))}</p>`; return; }
      mountChat(pane);
    }
    pane.querySelectorAll('[data-cl-tab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.clTab)));
    pane.querySelectorAll('[data-cl-sort]').forEach((b) => b.addEventListener('click', () => { st.sort = b.dataset.clSort; renderPane(); }));
    pane.querySelectorAll('[data-cl-join]').forEach((b) => b.addEventListener('click', join));
  }

  function renderPage() {
    const v = document.getElementById('clubDetailView');
    if (!v) return;
    parkChat();
    v.innerHTML = `<div class="cl-detail">${heroHtml()}</div>`;
    v.querySelector('[data-cl-back]').addEventListener('click', () => switchView('clubs'));
    v.querySelectorAll('.cl-hero [data-cl-join]').forEach((b) => b.addEventListener('click', join));
    v.querySelectorAll('.cl-tabs [data-cl-tab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.clTab)));
    renderPane();
  }

  function setTab(tab) {
    if (!TAB_URL.hasOwnProperty(tab)) tab = 'overview';
    st.tab = tab;
    document.querySelectorAll('.cl-tabs [data-cl-tab]').forEach((b) => b.classList.toggle('active', b.dataset.clTab === tab));
    renderPane();
    if (typeof window.pushSubRoute === 'function') window.pushSubRoute('clubs', { club: st.name, tab: TAB_URL[tab] });
    const pane = document.getElementById('clPane');
    if (pane && pane.getBoundingClientRect().top < 0) pane.scrollIntoView({ block: 'start' });
  }

  async function join() {
    const name = st.name, code = st.code, tab = st.tab;
    await window.joinLeaveFromClubPage(name, code);
    // joinLeaveFromClubPage o'zi Umumiy tabni ochadi; chatdan qo'shilgan bo'lsa — chatga qaytamiz
    if (tab === 'chat' && myClubName() === name) openClub(name, code, 'chat');
  }

  async function openClub(name, code, tab, opts) {
    const changed = st.name !== name;
    st.name = name;
    st.code = code || codeOf(name) || st.code;
    st.tab = TAB_URL.hasOwnProperty(tab) ? tab : 'overview';
    if (opts && opts.sort) st.sort = opts.sort; else if (changed) st.sort = 'rating';
    if (changed) st.data = null;
    window.currentClubName = name;
    window.currentClubCode = st.code;
    showView();
    renderPage();
    const token = ++st.token;
    const [data] = await Promise.all([typeof fetchClubData === 'function' ? fetchClubData(name) : null, loadBoard(), loadLeagues()]);
    if (token !== st.token) return;
    st.data = data || { members: [], stats: { members: 0, events: 0, points: 0 } };
    renderPage();
  }

  window.openClubDetail = function (name, code) { return openClub(name, code, 'overview'); };
  window.showClubLeaderboard = function (name) { return openClub(name, null, 'members', { sort: 'rating' }); };
  window.showClubHistory = function (name) { return openClub(name, null, 'members', { sort: 'newest' }); };
  window.showClubTournaments = function (name) { return openClub(name, null, 'league'); };
  window.showClubChat = function (name, code) { return openClub(name, code, 'chat'); };
  window.backToClubDetail = function () { if (st.name) openClub(st.name, st.code, 'overview'); else switchView('clubs'); };
  window.refreshClubsUi = function () {
    const v = document.getElementById('clubDetailView');
    if (v && v.classList.contains('active-view') && st.name) renderPage();
    const list = document.getElementById('clubsView');
    if (list && list.classList.contains('active-view')) renderList();
  };
})();
