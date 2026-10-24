// 🔔 Bildirishnomalar markazi: chaqiruvlar, do'stlik, xabarlar, turnir, liga, klub yangiliklari, yangi daraja.
// Server: GET /api/notifications, POST /api/notifications/read|clear, socket 'notification' (darhol keladi).
// Matn klientda turiga qarab yasaladi (til almashsa ham to'g'ri chiqadi).
(function () {
  const st = { items: [], unread: 0, open: false, loaded: false };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const auth = () => ({ 'Authorization': `Bearer ${window.authToken}` });
  const clubName = (d) => (typeof window.countryName === 'function' ? window.countryName(d.club, d.code) : d.club);
  const modeName = (m) => ({ rapid: 'Rapid', blitz: 'Blitz', bullet: 'Bullet', chess960: 'Chess960', shatranj: 'Shatranj' }[m] || m);

  function ago(iso) {
    const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return tx('nfJustNow', 'hozirgina');
    if (s < 3600) return tx('nfMinAgo', '{{n}} daq oldin', { n: Math.floor(s / 60) });
    if (s < 86400) return tx('nfHourAgo', '{{n}} soat oldin', { n: Math.floor(s / 3600) });
    return new Date(iso).toLocaleDateString();
  }

  // Har bir tur: belgi, matn va bosilganda nima qilinadi
  function view(n) {
    const d = n.data || {};
    switch (n.type) {
      case 'challenge':
        return { icon: '⚔️', text: tx('nfChallenge', '{{name}} sizni o\'yinga chaqirdi ({{clock}})', { name: d.from, clock: d.clock + (d.variant === 'chess960' ? ' · Chess960' : d.variant === 'shatranj' ? ' · Shatranj' : '') }), go: () => window.openPlayerProfile && window.openPlayerProfile(d.from) };
      case 'friend_request':
        return { icon: '🤝', text: tx('nfFriendRequest', "{{name}} sizga do'stlik so'rovi yubordi", { name: d.from }), go: () => window.openPlayerProfile && window.openPlayerProfile(d.from) };
      case 'friend_accepted':
        return { icon: '✅', text: tx('nfFriendAccepted', "{{name}} endi sizning do'stingiz", { name: d.from }), go: () => window.openPlayerProfile && window.openPlayerProfile(d.from) };
      case 'message':
        return {
          icon: '💬',
          text: (d.count || 1) > 1
            ? tx('nfMessages', '{{name}} dan {{count}} ta yangi xabar', { name: d.from, count: d.count })
            : tx('nfMessage', '{{name}}: {{text}}', { name: d.from, text: d.preview === '🎨' ? tx('stickerPreview', '🎨 Stiker') : d.preview }),
          go: () => window.openMessagesWith && window.openMessagesWith(d.from)
        };
      case 'tournament_soon':
        return { icon: '🏁', text: tx('nfTournamentSoon', '«{{name}}» turniri 1 daqiqadan keyin boshlanadi', { name: d.name }), go: () => { switchView('tournaments'); if (window.selectTournament) window.selectTournament(d.id); } };
      case 'league_ready':
        return { icon: '🏆', text: tx('nfLeagueReady', "Liga o'yini: {{name}} o'ynashga tayyor — sizni kutmoqda", { name: d.opponent }), go: () => switchView('leagues') };
      case 'club_news':
        return { icon: '📰', text: tx('nfClubNews', '{{club}} klubida yangilik: {{title}}', { club: clubName(d), title: d.title }), go: () => window.openClubDetail && window.openClubDetail(d.club, d.code) };
      case 'club_role': {
        const role = { captain: tx('csCaptain', 'Kapitan'), moderator: tx('csModerator', 'Moderator') }[d.role];
        return {
          icon: d.role === 'captain' ? '👑' : '🛡️',
          text: role ? tx('nfClubRole', '{{club}} klubida sizga «{{role}}» roli berildi', { club: clubName(d), role }) : tx('nfClubRoleRemoved', '{{club}} klubidagi rolingiz olib tashlandi', { club: clubName(d) }),
          go: () => window.openClubDetail && window.openClubDetail(d.club, d.code)
        };
      }
      case 'rank_up': {
        const rank = window.rankByKey ? window.rankByKey(d.rank) : null;
        return { icon: rank ? rank.icon : '⭐', text: tx('nfRankUp', 'Yangi daraja! {{mode}}: {{rank}} ({{rating}})', { mode: modeName(d.mode), rank: rank ? rank.label : d.rank, rating: d.rating }), go: () => window.openProfileModal && window.openProfileModal() };
      }
      case 'quests_done':
        return { icon: '🎯', text: tx('qNotif', 'Haftalik vazifalar bajarildi! Nishonlar: {{total}}', { total: d.total || 1 }), go: () => window.switchView && window.switchView('caravan') };
      case 'game_of_day':
        return { icon: '🌟', text: tx('gdNotif', "{{opponent}} bilan o'yiningiz Kun o'yini bo'ldi!", { opponent: d.opponent || '' }), go: () => window.switchView && window.switchView('live') };
      case 'caravan_city': {
        const city = window.Caravan ? window.Caravan.cityName(d.city, window.currentLang || 'en') : d.city;
        return { icon: '🐪', text: tx('cvArrived', '🐪 Karvoningiz {{city}}ga yetib keldi!', { city }).replace(/^🐪\s*/, ''), go: () => window.switchView && window.switchView('caravan') };
      }
      case 'achievement': {
        const a = window.achievementInfo ? window.achievementInfo(d.key) : { icon: '🏅', title: d.key };
        return { icon: a.icon, text: tx('nfAchievement', 'Yangi yutuq: {{title}}', { title: a.title }), go: () => window.openProfileModal && window.openProfileModal() };
      }
      case 'follow_playing':
        return { icon: '👁', text: tx('nfFollowPlaying', "{{name}} o'yin boshladi — tomosha qiling", { name: d.name }), go: () => window.watchGame && window.watchGame(d.roomId) };
      case 'rating_refund':
        return { icon: '↩️', text: tx('nfRatingRefund', "{{name}} qoidabuzar deb topildi — sizga {{amount}} reyting qaytarildi", { name: d.name, amount: d.amount }), go: () => window.openProfileModal && window.openProfileModal() };
      case 'fairplay_flag':
        return { icon: '🕵️', text: tx('nfFairplayFlag', "Fair-play: {{name}} shubhali deb belgilandi", { name: d.name }), go: () => switchView('admin') };
      case 'invite_joined':
        return { icon: '🎉', text: tx('nfInviteJoined', "{{name}} taklifingiz bilan ChessCaravan'ga qo'shildi", { name: d.from }), go: () => window.openPlayerProfile && window.openPlayerProfile(d.from) };
      case 'invite_waiting':
        return { icon: '🔗', text: tx('nfInviteWaiting', "{{name}} siz bilan o'ynamoqchi — uni o'yinga chaqiring", { name: d.from }), go: () => window.openChallengeDialog ? window.openChallengeDialog(d.from) : (window.openPlayerProfile && window.openPlayerProfile(d.from)) };
      case 'server_error':
        return { icon: '🐞', text: tx('nfServerError', 'Saytda yangi xato ({{source}}): {{message}}', { source: d.source === 'client' ? tx('admErrClient', 'Brauzer') : tx('admErrServer', 'Server'), message: d.message }), go: () => window.openAdminTab ? window.openAdminTab('errors') : switchView('admin') };
      case 'rival_online':
        return { icon: '⚔️', text: tx('nfRivalOnline', "Raqib-do'stingiz {{name}} onlayn! Hisob {{w}}–{{d}}–{{l}} — jang qilasizmi?", { name: d.name, w: d.win, d: d.draw, l: d.loss }), go: () => window.openChallengeDialog ? window.openChallengeDialog(d.name) : (window.openPlayerProfile && window.openPlayerProfile(d.name)) };
      case 'war_ruler':
        return { icon: '👑', text: tx('nfWarRuler', '{{club}} klubi {{season}} mavsumida Bayroqlar bellashuvi chempioni bo\'ldi — {{n}} hudud!', { club: clubName({ club: d.club, code: d.code }), season: d.season, n: d.territories }), go: () => switchView('war') };
      case 'mentor_request':
        return { icon: '🎓', text: d.as === 'mentor' ? tx('nfMentorOffer', "{{name}} sizga ustoz bo'lishni taklif qilmoqda", { name: d.from }) : tx('nfMentorAsk', "{{name}} ustozi bo'lishingizni so'ramoqda", { name: d.from }), go: () => window.openProfileModal && window.openProfileModal() };
      case 'mentor_accepted':
        return { icon: '🎓', text: d.as === 'student' ? tx('nfMentorNewStudent', "{{name}} endi sizning shogirdingiz", { name: d.from }) : tx('nfMentorNewMentor', "{{name}} endi sizning ustozingiz", { name: d.from }), go: () => window.openPlayerProfile && window.openPlayerProfile(d.from) };
      case 'mentor_ended':
        return { icon: '🎓', text: tx('nfMentorEnded', "{{name}} bilan ustoz-shogirdlik tugadi", { name: d.from }), go: null };
      case 'mentor_note':
        return {
          icon: '💬',
          text: (d.count || 1) > 1 ? tx('nfMentorNotes', "{{name}} o'yinga {{count}} ta izoh qoldirdi", { name: d.from, count: d.count }) : tx('nfMentorNote', "{{name}} o'yinga izoh qoldirdi ({{owner}} — {{opponent}})", { name: d.from, owner: d.owner, opponent: d.opponent || '?' }),
          go: () => window.openReplay && window.openReplay(d.owner, d.gameId)
        };
      case 'student_game': {
        const res = { win: tx('wrWins', "G'alaba"), loss: tx('wrLosses', "Mag'lubiyat"), draw: tx('wrDraws', 'Durrang') }[d.result] || '';
        return {
          icon: '📜',
          text: (d.count || 1) > 1 ? tx('nfStudentGames', "Shogirdingiz {{name}} {{count}} ta o'yin o'ynadi — izoh qoldiring", { name: d.student, count: d.count }) : tx('nfStudentGame', "Shogirdingiz {{name}}: {{result}} ({{opponent}} bilan) — izoh qoldiring", { name: d.student, result: res, opponent: d.opponent || '?' }),
          go: () => window.openGameHistory && window.openGameHistory(d.student)
        };
      }
      case 'mentor_milestone':
        return { icon: '🎓', text: tx('nfMentorMilestone', "Shogirdingiz {{name}} reytingi +{{gain}} ga o'sdi! Sizga «Ustoz» nishoni", { name: d.student, gain: d.gain }), go: () => window.openProfileModal && window.openProfileModal() };
      case 'prediction_won':
        return {
          icon: '🔮',
          text: (d.count || 1) > 1
            ? tx('nfPredictionsWon', "{{count}} ta bashoratingiz to'g'ri chiqdi 🎉", { count: d.count })
            : tx('nfPredictionWon', "Bashoratingiz to'g'ri chiqdi: {{white}} — {{black}}, +{{points}} ochko", { white: d.white, black: d.black, points: d.points }),
          go: () => window.openPredictionLeaderboard && window.openPredictionLeaderboard()
        };
      case 'oracle_month':
        return { icon: '🔮', text: tx('nfOracleMonth', "Tabriklaymiz! Siz {{month}} oyining bashoratchisi bo'ldingiz ({{points}} ochko)", { month: d.month, points: d.points }), go: () => window.openProfileModal && window.openProfileModal() };
      case 'sportsman_month':
        return { icon: '🎖️', text: tx('nfSportsmanMonth', "Tabriklaymiz! Siz {{month}} oyining eng odobli o'yinchisi bo'ldingiz ({{n}} 👍)", { month: d.month, n: d.up }), go: () => window.openProfileModal && window.openProfileModal() };
      case 'muted':
        return { icon: '🔇', text: tx('nfMuted', '{{until}} gacha chatda yoza olmaysiz', { until: new Date(d.until).toLocaleString() }), go: null };
      default:
        return { icon: '🔔', text: n.type, go: null };
    }
  }

  function renderBadge() {
    const c = document.getElementById('notifCount');
    if (!c) return;
    c.hidden = !st.unread;
    c.textContent = st.unread > 99 ? '99+' : String(st.unread);
    const bell = document.getElementById('notifBell');
    if (bell) bell.classList.toggle('has-unread', !!st.unread);
  }

  function renderPanel() {
    const panel = document.getElementById('notifPanel');
    if (!panel) return;
    panel.hidden = !st.open;
    if (!st.open) return;
    const list = st.items.length
      ? st.items.map((n, i) => { const v = view(n); return `
          <button type="button" class="nf-item${n.read ? '' : ' unread'}" data-i="${i}">
            <span class="nf-ico">${v.icon}</span>
            <span class="nf-body"><span class="nf-text">${esc(v.text)}</span><small>${esc(ago(n.createdAt))}</small></span>
          </button>`; }).join('')
      : `<div class="nf-empty"><span>🔔</span>${esc(tx('nfEmpty', "Hozircha bildirishnoma yo'q"))}</div>`;
    panel.innerHTML = `
      <div class="nf-head">
        <b>${esc(tx('nfTitle', 'Bildirishnomalar'))}</b>
        ${st.items.length ? `<button type="button" class="nf-clear" data-clear="1">${esc(tx('nfClear', 'Tozalash'))}</button>` : ''}
      </div>
      <div class="nf-list">${list}</div>`;
  }

  async function load() {
    if (!window.currentUser || !window.authToken) return;
    try {
      const d = await fetch('/api/notifications', { headers: auth() }).then(r => r.json());
      if (!d.success) return;
      st.items = d.notifications;
      st.unread = d.unread;
      st.loaded = true;
      renderBadge();
      renderPanel();
    } catch (e) {}
  }
  window.refreshNotifications = load;

  function toggle(force) {
    st.open = typeof force === 'boolean' ? force : !st.open;
    renderPanel();
    if (st.open) {
      load().then(() => {
        // Ochilganda — hammasi o'qilgan (belgilar panel yopilguncha ko'rinib turadi)
        if (st.unread) {
          st.unread = 0;
          renderBadge();
          fetch('/api/notifications/read', { method: 'POST', headers: auth() }).catch(() => {});
        }
      });
    } else {
      st.items.forEach(n => { n.read = true; });
    }
  }
  window.toggleNotifications = toggle;

  document.addEventListener('click', (e) => {
    const bell = e.target.closest('#notifBell');
    if (bell) { toggle(); return; }
    const panel = document.getElementById('notifPanel');
    if (!st.open || !panel) return;
    if (!panel.contains(e.target)) { toggle(false); return; }
    if (e.target.closest('[data-clear]')) {
      st.items = [];
      st.unread = 0;
      renderBadge();
      renderPanel();
      fetch('/api/notifications/clear', { method: 'POST', headers: auth() }).catch(() => {});
      return;
    }
    const item = e.target.closest('[data-i]');
    if (item) {
      const n = st.items[Number(item.dataset.i)];
      const v = n && view(n);
      toggle(false);
      if (v && typeof v.go === 'function') v.go();
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && st.open) toggle(false); });

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(load, 800);
    if (typeof socket !== 'undefined') {
      socket.on('notification', (n) => {
        if (!n || !n.id) return;
        // Birlashtirilgan (masalan, bir suhbatdoshdan yana xabar) — o'qilmaganlar soni oshmaydi
        const existing = st.items.find(x => x.id === n.id);
        if (!existing || existing.read) st.unread += 1;
        st.items = [n].concat(st.items.filter(x => x.id !== n.id)).slice(0, 50);
        renderBadge();
        renderPanel();
      });
      socket.on('connect', () => { if (st.loaded) load(); });
    }
    // Kirish/chiqishdan keyin
    const origApply = window.applyAuthSession;
    if (typeof origApply === 'function') {
      window.applyAuthSession = function () { const r = origApply.apply(this, arguments); setTimeout(load, 300); return r; };
    }
  });
  // Til almashganda matnlar qayta chiziladi
  window.refreshNotificationsView = function () { renderPanel(); };
})();
