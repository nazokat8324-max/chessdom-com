// Jamoaviy ligalar va Chempionlar ligasi sahifalari (server: league.js, /api/leagues*)
(function () {
  const state = { overview: null, myGames: [], waitingGameId: null, detail: null, detailTab: 'standings', detailRound: null };

  const esc = (v) => {
    const div = document.createElement('div');
    div.textContent = (v === null || v === undefined) ? '' : String(v);
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  const clubName = (club) => club ? ((typeof window.countryName === 'function') ? window.countryName(club.name, club.code) : club.name) : '';
  const flag = (code, size) => code ? `<img class="lg-flag${size ? ' lg-flag-' + size : ''}" src="https://flagcdn.com/w40/${esc(code)}.png" alt="" loading="lazy">` : '';
  const clubHtml = (club, size) => `<span class="lg-club">${flag(club && club.code, size)}<span>${esc(clubName(club))}</span></span>`;
  const leagueName = (continent) => (typeof window.getLeagueI18nName === 'function' && window.CONTINENTS && window.CONTINENTS[continent])
    ? window.getLeagueI18nName(continent, window.CONTINENTS[continent].name) : continent;
  const leagueIcon = (continent) => (window.CONTINENTS && window.CONTINENTS[continent] && window.CONTINENTS[continent].flag) || '🏆';
  const clockLabel = (c) => c ? `${Math.round(c.initial / 60)}+${c.increment}` : '';
  const modeLabel = (mode) => ({ bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid' })[mode] || mode || '';
  const modeOf = (c) => { const e = c.initial + 40 * c.increment; return e < 180 ? 'bullet' : (e < 480 ? 'blitz' : 'rapid'); };
  const modeIcon = (mode) => ({ bullet: '⚡', blitz: '🔥', rapid: '⏱️' })[mode] || '♟️';

  function timeLeft(iso) {
    const ms = new Date(iso).getTime() - Date.now();
    if (!iso || isNaN(ms)) return '';
    if (ms <= 0) return tx('lgSoon', 'tez orada');
    const d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000), m = Math.max(1, Math.floor(ms % 3600000 / 60000));
    if (d > 0) return `${tx('lgDays', '{{n}} kun', { n: d })} ${tx('lgHours', '{{n}} soat', { n: h })}`;
    if (h > 0) return `${tx('lgHours', '{{n}} soat', { n: h })} ${tx('lgMinutes', '{{n}} daq', { n: m })}`;
    return tx('lgMinutes', '{{n}} daq', { n: m });
  }

  async function getJson(url, auth) {
    const headers = auth && window.authToken ? { 'Authorization': `Bearer ${window.authToken}` } : {};
    const res = await fetch(url, { headers });
    return res.json();
  }

  async function loadData() {
    const [ov, mine] = await Promise.all([
      getJson('/api/leagues').catch(() => null),
      window.authToken ? getJson('/api/leagues/my-games', true).catch(() => null) : Promise.resolve(null)
    ]);
    if (ov && ov.success) state.overview = ov;
    state.myGames = (mine && mine.success) ? mine.games : [];
    updateBadge();
  }

  // Yon menyudagi "Ligalar" yonida — kutayotgan liga o'yinlari soni
  function updateBadge() {
    const nav = document.getElementById('navLeagues');
    if (!nav) return;
    let badge = nav.querySelector('.lg-nav-badge');
    const pending = state.myGames.filter(g => g.status === 'pending').length;
    if (!pending) { if (badge) badge.remove(); return; }
    if (!badge) { badge = document.createElement('span'); badge.className = 'lg-nav-badge'; nav.appendChild(badge); }
    badge.textContent = pending;
  }

  window.refreshLeagueBadge = function () {
    if (!window.authToken) { state.myGames = []; updateBadge(); return; }
    getJson('/api/leagues/my-games', true).then(d => { if (d && d.success) { state.myGames = d.games; updateBadge(); } }).catch(() => {});
  };

  // --- Ligalar sahifasi ---
  function phaseLabel(season) {
    if (!season) return tx('lgPhaseWaiting', 'Kutilmoqda');
    return ({ league: tx('lgPhaseLeague', 'Liga bosqichi'), champions: tx('lgPhaseChampions', 'Chempionlar ligasi'), finished: tx('lgPhaseFinished', 'Tanaffus') })[season.phase] || season.phase;
  }

  function seasonHero(ov) {
    const s = ov.season;
    const rules = ov.rules;
    if (!s || (s.phase === 'finished' && !s.breakUntil)) {
      return `
        <section class="lg-hero">
          <div class="lg-hero-main">
            <span class="lg-chip">${esc(tx('lgPhaseWaiting', 'Kutilmoqda'))}</span>
            <h2 class="lg-hero-title">${esc(tx('lgNoSeasonTitle', 'Ligalar hali boshlanmagan'))}</h2>
            <p class="lg-hero-text">${esc(tx('lgNoSeasonText', "Qit'ada kamida {{clubs}} ta klubda {{members}} tadan a'zo yig'ilganda liga avtomatik boshlanadi.", { clubs: rules.minClubs, members: rules.minMembers }))}</p>
          </div>
        </section>`;
    }
    const activeDivs = ov.divisions.filter(d => d.status === 'active');
    const nextDeadline = activeDivs.map(d => d.roundDeadline).filter(Boolean).sort()[0];
    let timing = '';
    if (s.phase === 'finished' && s.breakUntil) timing = tx('lgNextSeason', 'Keyingi mavsum: {{time}}', { time: timeLeft(s.breakUntil) });
    else if (nextDeadline) timing = tx('lgRoundEnds', 'Tur tugashiga: {{time}}', { time: timeLeft(nextDeadline) });
    return `
      <section class="lg-hero">
        <div class="lg-hero-main">
          <div class="lg-hero-chips">
            <span class="lg-chip lg-chip-accent">${esc(tx('lgSeason', '{{n}}-mavsum', { n: s.number }))}</span>
            <span class="lg-chip">${esc(phaseLabel(s))}</span>
          </div>
          <h2 class="lg-hero-title">${esc(tx('lgTitle', 'Ligalar'))}</h2>
          <p class="lg-hero-text">${esc(tx('lgSubtitle', "Davlat klublari o'rtasidagi jamoaviy musobaqa"))}</p>
          ${s.champion ? `<div class="lg-hero-champion">🏆 ${esc(tx('lgSeasonChampion', 'Mavsum chempioni'))}: ${clubHtml(s.champion)}</div>` : ''}
        </div>
        <div class="lg-hero-side">
          <div class="lg-stat"><span>${esc(tx('lgTimeControl', 'Vaqt nazorati'))}</span><b>${modeIcon(s.mode)} ${esc(modeLabel(s.mode))} ${esc(clockLabel(s.clock))}</b></div>
          ${timing ? `<div class="lg-stat"><span>⏳</span><b>${esc(timing)}</b></div>` : ''}
        </div>
      </section>`;
  }

  function myGamesSection() {
    if (!window.currentUser) return '';
    if (!state.myGames.length) {
      if (window.currentUser.club) return '';
      return `
        <section class="lg-card lg-hint">
          <div>${esc(tx('lgJoinClubHint', "Ligada qatnashish uchun davlatingiz klubiga a'zo bo'ling."))}</div>
          <button class="lg-btn" onclick="switchView('clubs')">${esc(tx('clubsTitle', 'Klublar'))}</button>
        </section>`;
    }
    const rows = state.myGames.map(g => {
      const waitingHere = state.waitingGameId === g.id;
      let action;
      if (g.status === 'playing') action = `<span class="lg-pill lg-pill-live">${esc(tx('lgPlaying', "O'ynalmoqda"))}</span>`;
      else if (waitingHere) action = `<button class="lg-btn lg-btn-ghost" onclick="window.leagueCancelWaiting('${esc(g.id)}')">${esc(tx('lgWaiting', 'Raqib kutilmoqda...'))} ✕</button>`;
      else action = `<button class="lg-btn" onclick="window.leaguePlay('${esc(g.id)}')">${esc(tx('lgPlay', "O'ynash"))}</button>`;
      return `
        <div class="lg-game-row">
          <div class="lg-game-board">${esc(tx('lgBoard', '{{n}}-doska', { n: g.board }))}</div>
          <div class="lg-game-main">
            <div class="lg-game-clubs">${clubHtml(g.myClub)} <span class="lg-vs">vs</span> ${clubHtml(g.opponentClub)}</div>
            <div class="lg-game-meta">
              <span class="lg-color-dot ${g.color === 'w' ? 'black' : 'white'}" title="${esc(g.color === 'w' ? tx('blackText', 'Qora') : tx('whiteText', 'Oq'))}"></span>
              <span class="player-link" data-username="${esc(g.opponent)}">${esc(g.opponent)}</span>
              · ${esc(clockLabel(g.clock))}
              · ${esc(g.kind === 'champions' ? tx('lgClLeague', 'Chempionlar ligasi') : leagueName(g.continent))}
              ${g.opponentReady && g.status === 'pending' ? `· <span class="lg-ready">${esc(tx('lgOpponentReady', 'Raqib tayyor!'))}</span>` : ''}
            </div>
          </div>
          <div class="lg-game-deadline">${esc(tx('lgDeadline', 'Muddat: {{time}}', { time: timeLeft(g.deadline) }))}</div>
          <div class="lg-game-action">${action}</div>
        </div>`;
    }).join('');
    return `
      <section class="lg-card">
        <h3 class="lg-section-title">${esc(tx('lgMyGames', "Mening liga o'yinlarim"))}</h3>
        <div class="lg-games">${rows}</div>
      </section>`;
  }

  function leagueCard(continent, ov) {
    const div = ov.divisions.find(d => d.kind === 'league' && d.continent === continent);
    const q = ov.qualification[continent] || { qualified: 0, clubs: [] };
    const min = ov.rules.minMembers;
    let body, status, clickable = '';
    if (div) {
      clickable = ` onclick="window.openLeagueDivision('${esc(div.id)}')"`;
      if (div.status === 'active') {
        status = `<span class="lg-pill lg-pill-live">${esc(tx('lgStatusActive', 'Faol'))}</span>`;
        body = `
          <div class="lg-card-line"><span>${esc(tx('lgRoundOf', '{{round}}/{{total}}-tur', { round: div.round, total: div.roundsTotal }))}</span><span>${esc(tx('lgClubsCount', '{{count}} ta klub', { count: div.clubs }))}</span></div>
          ${div.leader ? `<div class="lg-card-line"><span>${esc(tx('lgLeader', 'Yetakchi'))}</span>${clubHtml({ name: div.leader.club, code: div.leader.code })}</div>` : ''}`;
      } else {
        status = `<span class="lg-pill">${esc(tx('lgStatusFinished', 'Yakunlangan'))}</span>`;
        body = div.champion ? `<div class="lg-card-line"><span>🏆 ${esc(tx('lgChampion', 'Chempion'))}</span>${clubHtml(div.champion)}</div>` : '';
      }
      body += `<div class="lg-card-link">${esc(tx('lgOpen', 'Jadval va bahslar'))} →</div>`;
    } else {
      status = `<span class="lg-pill lg-pill-wait">${esc(tx('lgStatusWaiting', 'Kutilmoqda'))}</span>`;
      clickable = ` onclick="window.openLeaguePreview('${esc(continent)}')"`;
      const progress = q.clubs.length
        ? q.clubs.slice(0, 5).map(c => {
            const pct = Math.min(100, Math.round(c.members / min * 100));
            return `
              <div class="lg-progress-row">
                ${clubHtml(c)}
                <span class="lg-progress-num">${c.members}/${min}</span>
                <div class="lg-progress"><span style="width:${pct}%"></span></div>
              </div>`;
          }).join('')
        : `<div class="lg-muted">${esc(tx('lgNoClubsYet', "Hali klub yo'q"))}</div>`;
      body = `<div class="lg-card-line"><span>${esc(tx('lgQualified', '{{q}}/{{need}} klub tayyor', { q: q.qualified, need: ov.rules.minClubs }))}</span></div>${progress}
        <div class="lg-card-link">${esc(tx('lgViewTable', "Jadvalni ko'rish"))} →</div>`;
    }
    return `
      <div class="lg-league-card clickable"${clickable}>
        <div class="lg-league-head">
          <span class="lg-league-icon">${leagueIcon(continent)}</span>
          <span class="lg-league-name">${esc(leagueName(continent))}</span>
          ${status}
        </div>
        ${body}
      </div>`;
  }

  function rulesSection(ov) {
    const r = ov.rules;
    const rules = [
      tx('lgRule1', "Qit'adagi {{members}}+ a'zoli klublar o'z ligasida qatnashadi; kamida {{clubs}} ta shunday klub bo'lsa liga boshlanadi.", { members: r.minMembers, clubs: r.minClubs }),
      tx('lgRule2', "Har bahs — {{boards}} ta doska: har klubning shu vaqt nazorati reytingi bo'yicha eng kuchli o'yinchilari. Toq doskalarda uy jamoasi oq bilan o'ynaydi.", { boards: r.boards }),
      tx('lgRule3', "Har tur {{hours}} soat davom etadi. O'yin boshlanishi uchun ikkala o'yinchi ham \"O'ynash\" tugmasini bosadi.", { hours: r.roundHours }),
      tx('lgRule4', "Muddatgacha o'ynalmagan o'yin: kelgan o'yinchi texnik g'alaba oladi, ikkalasi kelmasa — 0:0."),
      tx('lgRule5', "Bahsdagi g'alaba — 3 ochko, durrang — 1 ochko. Ochkolar teng bo'lsa, doska ochkolari hal qiladi."),
      tx('lgRule6', "Liga chempionlari Chempionlar ligasiga chiqadi. So'ng {{days}} kunlik tanaffus va yangi mavsum boshqa vaqt nazoratida boshlanadi.", { days: r.breakDays })
    ];
    return `
      <section class="lg-card">
        <h3 class="lg-section-title">${esc(tx('lgRulesTitle', 'Qoidalar'))}</h3>
        <ol class="lg-rules">${rules.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      </section>`;
  }

  function pastChampionsSection(ov) {
    if (!ov.pastChampions || !ov.pastChampions.length) return '';
    return `
      <section class="lg-card">
        <h3 class="lg-section-title">${esc(tx('lgPastChampions', 'Oldingi chempionlar'))}</h3>
        <div class="lg-past">${ov.pastChampions.map(p => `<div class="lg-past-row"><span class="lg-muted">${esc(tx('lgSeason', '{{n}}-mavsum', { n: p.number }))}</span>${clubHtml(p)}</div>`).join('')}</div>
      </section>`;
  }

  window.renderLeagues = async function () {
    const root = document.getElementById('leaguesRoot');
    if (!root) return;
    if (!state.overview) root.innerHTML = `<div class="lg-loading">${esc(tx('loadingText', 'Yuklanmoqda...'))}</div>`;
    await loadData();
    const ov = state.overview;
    if (!ov) { root.innerHTML = `<div class="lg-loading">${esc(tx('errLoadFailed', 'Yuklashda xatolik yuz berdi'))}</div>`; return; }
    const continents = Object.keys(window.CONTINENTS || {});
    root.innerHTML = `
      ${seasonHero(ov)}
      ${myGamesSection()}
      <div class="lg-grid">${continents.map(c => leagueCard(c, ov)).join('')}</div>
      <div class="lg-two-col">${rulesSection(ov)}${pastChampionsSection(ov)}</div>`;
  };

  // --- Divizion (liga yoki Chempionlar ligasi) tafsiloti ---
  function standingsTable(rows) {
    if (!rows.length) return `<div class="lg-muted">—</div>`;
    return `
      <table class="lg-table">
        <thead><tr>
          <th>#</th><th>${esc(tx('lgColClub', 'Klub'))}</th>
          <th title="${esc(tx('lgColPlayedFull', "O'ynagan"))}">${esc(tx('lgColPlayed', "O'"))}</th>
          <th>${esc(tx('lgColWon', "G'"))}</th><th>${esc(tx('lgColDrawn', 'D'))}</th><th>${esc(tx('lgColLost', "M'"))}</th>
          <th>${esc(tx('lgColBoards', 'Doska'))}</th><th>${esc(tx('lgColPoints', 'Ochko'))}</th>
        </tr></thead>
        <tbody>${rows.map((r, i) => `
          <tr class="${i === 0 ? 'lg-first' : ''}">
            <td>${i + 1}</td><td>${clubHtml({ name: r.club, code: r.code })}</td>
            <td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td>
            <td>${r.boardPoints}</td><td><b>${r.points}</b></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  const resultText = (r) => ({ '1-0': '1 – 0', '0-1': '0 – 1', '1/2': '½ – ½', '+-': '+ – −', '-+': '− – +', '0-0': '0 – 0' })[r] || '';

  function matchCard(m, showClock) {
    const games = m.games.map(g => {
      const res = g.status === 'finished' ? resultText(g.result) : (g.status === 'playing' ? tx('lgPlaying', "O'ynalmoqda") : '—');
      const forfeit = g.result === '+-' || g.result === '-+' || g.result === '0-0';
      const name = (n) => n ? `<span class="player-link" data-username="${esc(n)}">${esc(n)}</span>` : `<span class="lg-muted">—</span>`;
      return `
        <div class="lg-board-row">
          <span class="lg-board-no">${g.board}</span>
          <span class="lg-board-player"><span class="lg-color-dot white"></span>${name(g.white)}</span>
          <span class="lg-board-result${forfeit ? ' forfeit' : ''}">${esc(res)}</span>
          <span class="lg-board-player right">${name(g.black)}<span class="lg-color-dot black"></span></span>
        </div>`;
    }).join('');
    const live = m.status === 'active';
    return `
      <details class="lg-match"${live ? ' open' : ''}>
        <summary>
          <span class="lg-match-side">${clubHtml(m.home)}</span>
          <span class="lg-match-score${live ? ' live' : ''}">${m.homeScore} : ${m.awayScore}</span>
          <span class="lg-match-side right">${clubHtml(m.away)}</span>
          ${showClock ? `<span class="lg-pill">${modeIcon(modeOf(m.clock))} ${esc(clockLabel(m.clock))}</span>` : ''}
          ${live ? `<span class="lg-pill lg-pill-live">${esc(timeLeft(m.deadline))}</span>` : ''}
        </summary>
        <div class="lg-boards">${games || `<div class="lg-muted">—</div>`}</div>
      </details>`;
  }

  function matchesByRound(detail, showClock) {
    const rounds = [...new Set(detail.matches.map(m => m.round))].sort((a, b) => a - b);
    if (!rounds.length) return `<div class="lg-muted">—</div>`;
    const current = state.detailRound && rounds.includes(state.detailRound) ? state.detailRound : rounds[rounds.length - 1];
    const tabs = rounds.map(r => `<button class="lg-round-btn${r === current ? ' active' : ''}" onclick="window.leagueSelectRound(${r})">${esc(tx('lgRound', '{{n}}-tur', { n: r }))}</button>`).join('');
    const matches = detail.matches.filter(m => m.round === current).map(m => matchCard(m, showClock)).join('');
    return `<div class="lg-round-tabs">${tabs}</div><div class="lg-matches">${matches}</div>`;
  }

  function renderDetail() {
    const box = document.getElementById('leagueDetailContent');
    const d = state.detail;
    if (!box || !d) return;
    const isCl = d.division.kind === 'champions';
    const title = isCl ? tx('lgClLeague', 'Chempionlar ligasi') : leagueName(d.division.continent);
    const icon = isCl ? '🏆' : leagueIcon(d.division.continent);
    const sub = d.division.status === 'active'
      ? tx('lgRoundOf', '{{round}}/{{total}}-tur', { round: d.division.round, total: d.division.roundsTotal })
      : (d.division.champion ? `🏆 ${tx('lgChampion', 'Chempion')}: ${clubName(d.division.champion)}` : tx('lgStatusFinished', 'Yakunlangan'));
    const tab = state.detailTab;
    box.innerHTML = `
      <div class="lg-modal-head">
        <div class="lg-modal-title"><span class="lg-league-icon">${icon}</span><div><h2>${esc(title)}</h2><p>${esc(sub)}${d.season ? ' · ' + esc(tx('lgSeason', '{{n}}-mavsum', { n: d.season.number })) : ''}</p></div></div>
        <button class="lg-close" onclick="window.closeLeagueDetail()" aria-label="${esc(tx('lgClose', 'Yopish'))}">✕</button>
      </div>
      <div class="lg-tabs">
        <button class="lg-tab${tab === 'standings' ? ' active' : ''}" onclick="window.leagueDetailTab('standings')">${esc(tx('lgTabStandings', 'Jadval'))}</button>
        <button class="lg-tab${tab === 'matches' ? ' active' : ''}" onclick="window.leagueDetailTab('matches')">${esc(tx('lgTabMatches', 'Bahslar'))}</button>
      </div>
      <div class="lg-modal-body">${tab === 'standings' ? standingsTable(d.standings) : matchesByRound(d, isCl)}</div>`;
  }

  window.openLeagueDivision = async function (divisionId) {
    const modal = document.getElementById('leagueDetailModal');
    const box = document.getElementById('leagueDetailContent');
    if (!modal || !box) return;
    state.detailTab = 'standings';
    state.detailRound = null;
    state.previewContinent = null;
    box.innerHTML = `<div class="lg-loading">${esc(tx('loadingText', 'Yuklanmoqda...'))}</div>`;
    modal.style.display = 'flex';
    try {
      const data = await getJson('/api/leagues/divisions/' + encodeURIComponent(divisionId));
      if (!data.success) throw new Error(data.message);
      state.detail = data;
      renderDetail();
    } catch (err) {
      box.innerHTML = `<div class="lg-loading">${esc(tx('errLoadFailed', 'Yuklashda xatolik yuz berdi'))}</div>`;
    }
  };
  window.leagueDetailTab = function (tab) { state.detailTab = tab; renderDetail(); };
  window.leagueSelectRound = function (round) { state.detailRound = round; renderDetail(); };
  window.closeLeagueDetail = function () {
    const modal = document.getElementById('leagueDetailModal');
    if (modal) modal.style.display = 'none';
    state.detail = null;
    state.previewContinent = null;
  };

  // --- Liga boshlanmagan bo'lsa: qit'adagi barcha davlatlar jadvali ---
  function renderPreview() {
    const box = document.getElementById('leagueDetailContent');
    const ov = state.overview;
    const continent = state.previewContinent;
    if (!box || !ov || !continent) return;
    const q = ov.qualification[continent] || { qualified: 0, clubs: [] };
    const min = ov.rules.minMembers;
    const membersOf = {};
    for (const c of q.clubs) membersOf[c.name] = c.members;
    const countries = (typeof continentCountries !== 'undefined' && continentCountries[continent]) ? continentCountries[continent] : [];
    const myClub = window.currentUser && window.currentUser.club ? window.currentUser.club.name : null;
    const rows = countries
      .map(c => ({ name: c.name, code: c.code, members: membersOf[c.name] || 0, label: clubName(c) }))
      .sort((a, b) => (b.members - a.members) || a.label.localeCompare(b.label));
    const body = rows.map((r, i) => {
      const ready = r.members >= min;
      const pct = Math.min(100, Math.round(r.members / min * 100));
      return `
        <tr class="${r.name === myClub ? 'lg-mine' : ''}">
          <td>${i + 1}</td>
          <td>${clubHtml(r)}${r.name === myClub ? ` <span class="lg-pill lg-pill-live">${esc(tx('lgYourClub', 'Sizning klubingiz'))}</span>` : ''}</td>
          <td><div class="lg-members-cell"><span>${r.members}/${min}</span><div class="lg-progress"><span style="width:${pct}%"></span></div></div></td>
          <td>${ready ? `<span class="lg-pill lg-pill-live">${esc(tx('lgReady', 'Tayyor'))}</span>` : `<span class="lg-pill">${esc(tx('lgGathering', "Yig'ilmoqda"))}</span>`}</td>
          <td>0</td><td>0</td><td>0</td><td>0</td><td><b>0</b></td>
        </tr>`;
    }).join('');
    box.innerHTML = `
      <div class="lg-modal-head">
        <div class="lg-modal-title"><span class="lg-league-icon">${leagueIcon(continent)}</span><div><h2>${esc(leagueName(continent))}</h2><p>${esc(tx('lgPreviewTitle', 'Dastlabki jadval'))} · ${esc(tx('lgClubsCount', '{{count}} ta klub', { count: rows.length }))}</p></div></div>
        <button class="lg-close" onclick="window.closeLeagueDetail()" aria-label="${esc(tx('lgClose', 'Yopish'))}">✕</button>
      </div>
      <div class="lg-preview-note">${esc(tx('lgPreviewNote', "Liga boshlanishi uchun kamida {{clubs}} ta klubda {{members}} tadan a'zo kerak. Hozir tayyor: {{q}}.", { clubs: ov.rules.minClubs, members: min, q: q.qualified }))}</div>
      <div class="lg-modal-body">
        <table class="lg-table lg-preview-table">
          <thead><tr>
            <th>#</th><th>${esc(tx('lgColClub', 'Klub'))}</th><th>${esc(tx('lgColMembers', "A'zo"))}</th><th>${esc(tx('lgColStatus', 'Holat'))}</th>
            <th>${esc(tx('lgColPlayed', "O'"))}</th><th>${esc(tx('lgColWon', "G'"))}</th><th>${esc(tx('lgColDrawn', 'D'))}</th><th>${esc(tx('lgColLost', "M'"))}</th><th>${esc(tx('lgColPoints', 'Ochko'))}</th>
          </tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
  }

  window.openLeaguePreview = function (continent) {
    const modal = document.getElementById('leagueDetailModal');
    if (!modal || !state.overview) return;
    state.detail = null;
    state.previewContinent = continent;
    renderPreview();
    modal.style.display = 'flex';
  };

  // --- Chempionlar ligasi sahifasi ---
  window.renderChampionsLeague = async function () {
    const root = document.getElementById('championsRoot');
    if (!root) return;
    root.innerHTML = `<div class="lg-loading">${esc(tx('loadingText', 'Yuklanmoqda...'))}</div>`;
    const [cl] = await Promise.all([getJson('/api/leagues/champions').catch(() => null), loadData()]);
    const ov = state.overview;
    const detail = cl && cl.success ? cl.detail : null;
    const hero = `
      <section class="lg-hero lg-hero-gold">
        <div class="lg-hero-main">
          <div class="lg-hero-chips"><span class="lg-chip lg-chip-gold">🏆 ${esc(tx('lgClLeague', 'Chempionlar ligasi'))}</span>
            ${detail && detail.season ? `<span class="lg-chip">${esc(tx('lgSeason', '{{n}}-mavsum', { n: detail.season.number }))}</span>` : ''}</div>
          <h2 class="lg-hero-title">${esc(tx('lgClLeague', 'Chempionlar ligasi'))}</h2>
          <p class="lg-hero-text">${esc(tx('lgClSubtitle', "Qit'a ligalari chempionlari 1, 3 va 10 daqiqalik bahslarda o'zaro o'ynaydi"))}</p>
          ${detail && detail.division.champion ? `<div class="lg-hero-champion">👑 ${esc(tx('lgChampion', 'Chempion'))}: ${clubHtml(detail.division.champion, 'lg')}</div>` : ''}
        </div>
        <div class="lg-hero-side">
          <div class="lg-stat"><span>⚡</span><b>1+0</b></div>
          <div class="lg-stat"><span>🔥</span><b>3+0</b></div>
          <div class="lg-stat"><span>⏱️</span><b>10+0</b></div>
        </div>
      </section>`;
    let body;
    if (detail) {
      body = `
        <div class="lg-two-col">
          <section class="lg-card"><h3 class="lg-section-title">${esc(tx('lgTabStandings', 'Jadval'))}</h3>${standingsTable(detail.standings)}</section>
          <section class="lg-card"><h3 class="lg-section-title">${esc(tx('lgTabMatches', 'Bahslar'))}</h3><div id="clMatches"></div></section>
        </div>`;
    } else {
      const champs = ov ? ov.divisions.filter(d => d.kind === 'league' && d.champion) : [];
      body = `
        <section class="lg-card">
          <p class="lg-hero-text">${esc(tx('lgClNotStarted', "Chempionlar ligasi qit'a ligalari tugagach boshlanadi."))}</p>
          ${champs.length ? `<h3 class="lg-section-title">${esc(tx('lgClFromLeagues', 'Liga chempionlari'))}</h3>
            <div class="lg-past">${champs.map(d => `<div class="lg-past-row"><span class="lg-muted">${esc(leagueName(d.continent))}</span>${clubHtml(d.champion)}</div>`).join('')}</div>` : ''}
        </section>`;
    }
    root.innerHTML = hero + body;
    if (detail) {
      state.clDetail = detail;
      const box = document.getElementById('clMatches');
      if (box) box.innerHTML = matchesByRound(detail, true).replace(/window\.leagueSelectRound/g, 'window.clSelectRound');
    }
  };
  window.clSelectRound = function (round) {
    state.detailRound = round;
    const box = document.getElementById('clMatches');
    if (box && state.clDetail) box.innerHTML = matchesByRound(state.clDetail, true).replace(/window\.leagueSelectRound/g, 'window.clSelectRound');
  };

  // --- O'yinni boshlash ---
  window.leaguePlay = function (gameId) {
    if (typeof socket === 'undefined' || !socket.connected) {
      alert(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"));
      return;
    }
    state.waitingGameId = gameId;
    socket.emit('league-ready', { gameId });
    window.renderLeagues();
  };
  window.leagueCancelWaiting = function (gameId) {
    if (typeof socket !== 'undefined') socket.emit('league-cancel', { gameId });
    state.waitingGameId = null;
    window.renderLeagues();
  };

  function isActive(id) {
    const el = document.getElementById(id);
    return !!(el && el.classList.contains('active-view'));
  }

  // Ochiq sahifalarni yangilash (til almashganda, liga yangilanganda)
  window.refreshLeagueViews = function () {
    if (isActive('leaguesView')) window.renderLeagues();
    if (isActive('championsView')) window.renderChampionsLeague();
    const modal = document.getElementById('leagueDetailModal');
    if (modal && modal.style.display === 'flex' && state.detail) window.openLeagueDivision(state.detail.division.id);
    else if (modal && modal.style.display === 'flex' && state.previewContinent) loadData().then(renderPreview);
    else window.refreshLeagueBadge();
  };

  window.leagueMatchStarted = function () {
    state.waitingGameId = null;
    setTimeout(() => window.refreshLeagueBadge(), 1000);
  };

  // Socket hodisalari (online.js da socket global)
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof socket === 'undefined') return;
    socket.on('league-update', () => window.refreshLeagueViews());
    socket.on('league-waiting', () => {
      showToast(tx('lgWaitingToast', "Raqibingizga xabar yuborildi. U \"O'ynash\" ni bosishi bilan o'yin boshlanadi."), 'info', 5000);
    });
    socket.on('league-opponent-ready', (data) => {
      showToast(tx('lgOpponentReadyToast', '{{name}} liga o\'yiniga tayyor! Ligalar bo\'limida "O\'ynash" ni bosing.', { name: (data && data.opponent) || '' }), 'success', 7000);
      window.refreshLeagueViews();
    });
    socket.on('league-error', (data) => {
      state.waitingGameId = null;
      const reason = data && data.reason;
      const messages = {
        expired: tx('lgErrExpired', "Bu o'yinning muddati tugagan."),
        not_pending: tx('lgErrNotPending', "Bu o'yin allaqachon o'ynalgan."),
        auth: tx('errLoginRequired', 'Avval tizimga kirishingiz kerak!')
      };
      showToast(messages[reason] || tx('errGeneric', 'Xatolik yuz berdi!'), 'warning');
      window.refreshLeagueViews();
    });
    if (window.authToken) window.refreshLeagueBadge();
    setInterval(() => { if (window.authToken) window.refreshLeagueBadge(); }, 60000);
  });
})();
