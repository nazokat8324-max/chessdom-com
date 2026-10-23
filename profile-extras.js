// Profil qo'shimchalari: 🏅 yutuqlar, 📊 kengaytirilgan statistika, ⭐ kuzatish tugmasi, fair-play ogohlantirishi.
// Server: GET /api/users/:username/extras, POST /api/follow {username, follow}.
// Yutuqlar shartlari server.js dagi ACHIEVEMENT_RULES da; bu yerda — belgisi va matni.
(function () {
  const ACH = {
    first_win: '🏆', wins_10: '🥉', wins_50: '🥈', wins_100: '🥇',
    games_10: '♟️', games_100: '🎯', games_500: '🏛️',
    streak_5: '🔥', streak_10: '☄️', mate_10: '⚔️',
    rank_gold: '♝', rank_platinum: '♜', rank_diamond: '♛', rank_master: '★',
    chess960: '🎲', all_modes: '🎛️', friends_5: '🤝', club_member: '🏳️', league_player: '🏟️', tournament_win: '👑', sportsman: '🎖️', oracle: '🔮', mentor: '🎓', invite_3: '📣', invite_10: '🌟'
  };
  const ACH_TEXT = {
    first_win: ["Birinchi g'alaba", "Birinchi g'alabangizni qozoning"],
    wins_10: ["10 g'alaba", "10 ta o'yinda g'alaba qozoning"],
    wins_50: ["50 g'alaba", "50 ta o'yinda g'alaba qozoning"],
    wins_100: ["100 g'alaba", "100 ta o'yinda g'alaba qozoning"],
    games_10: ["10 o'yin", "10 ta o'yin o'ynang"],
    games_100: ["100 o'yin", "100 ta o'yin o'ynang"],
    games_500: ["500 o'yin", "500 ta o'yin o'ynang"],
    streak_5: ["5 ketma-ket g'alaba", "Ketma-ket 5 ta o'yinda yuting"],
    streak_10: ["10 ketma-ket g'alaba", "Ketma-ket 10 ta o'yinda yuting"],
    mate_10: ['Mat ustasi', "10 ta o'yinni mat bilan yuting"],
    rank_gold: ['Oltin daraja', 'Biror rejimda 1600 reytingga yeting'],
    rank_platinum: ['Platina daraja', 'Biror rejimda 1800 reytingga yeting'],
    rank_diamond: ['Olmos daraja', 'Biror rejimda 2000 reytingga yeting'],
    rank_master: ['Usta daraja', 'Biror rejimda 2200 reytingga yeting'],
    chess960: ['Chess960 kashfiyotchisi', "Birinchi Chess960 o'yiningizni o'ynang"],
    all_modes: ['Universal', "Rapid, Blitz va Bullet — hammasida o'ynang"],
    friends_5: ["Do'stona", "5 ta do'st orttiring"],
    club_member: ["Klub a'zosi", "Davlat klubiga qo'shiling"],
    league_player: ["Liga o'yinchisi", "Klubingiz uchun liga o'yinida qatnashing"],
    tournament_win: ["Turnir g'olibi", 'Swiss turnirida birinchi o\'rinni egallang'],
    sportsman: ["Oyning odobli o'yinchisi", "Oy davomida eng ko'p 👍 odob bahosini oling"],
    oracle: ["Oyning bashoratchisi", "Oy davomida bashorat o'yinida eng ko'p ochko to'plang"],
    mentor: ['Ustoz', "Shogirdingiz reytingini 100 ga oshiring"],
    invite_3: ['Taklifchi', "Havolangiz orqali 3 ta do'stingizni saytga olib keling"],
    invite_10: ['ChessCaravan elchisi', "Havolangiz orqali 10 ta do'stingizni saytga olib keling"]
  };
  const keyName = (k) => k.replace(/(^|_)(\w)/g, (m, a, c) => c.toUpperCase());
  window.achievementInfo = function (key) {
    const t = ACH_TEXT[key];
    if (!t) return { icon: '🏅', title: key, desc: '' };
    return { icon: ACH[key], title: tx('achT' + keyName(key), t[0]), desc: tx('achD' + keyName(key), t[1]) };
  };

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const st = { username: null, data: null };
  window.currentProfileUser = () => st.username;

  // Yutuqlar / Batafsil statistika — tugma bosilganda profil ichida ochiladi (bir vaqtda bittasi)
  window.toggleProfilePanel = function (name, force) {
    const panels = { ach: ['profAchPanel', 'profAchBtn'], ext: ['profExtPanel', 'profExtBtn'] };
    Object.entries(panels).forEach(([key, [panelId, btnId]]) => {
      const panel = document.getElementById(panelId), btn = document.getElementById(btnId);
      if (!panel) return;
      const open = key === name ? (typeof force === 'boolean' ? force : panel.hidden) : false;
      panel.hidden = !open;
      if (btn) btn.classList.toggle('active', open);
      if (open) setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 30);
    });
  };

  async function load(username) {
    // Boshqa profil ochilganda bo'limlar yopiq holatda boshlanadi
    if (username !== st.username) window.toggleProfilePanel(null);
    st.username = username;
    st.data = null;
    renderAll();
    if (window.loadProfileMentor) window.loadProfileMentor(username);
    const headers = window.authToken ? { Authorization: 'Bearer ' + window.authToken } : {};
    const d = await fetch('/api/users/' + encodeURIComponent(username) + '/extras', { headers }).then(r => r.json()).catch(() => null);
    if (st.username !== username) return;
    st.data = d && d.success ? d : null;
    renderAll();
  }

  function renderAll() {
    renderAchievements();
    renderExtStats();
    renderFollow();
    if (window.renderProfileRivals) window.renderProfileRivals(st.username, st.data && st.data.rivals);
    if (window.renderProfileSport) window.renderProfileSport(st.data && st.data.sportsmanship);
    if (window.renderProfileCaravan) window.renderProfileCaravan(st.data ? st.data.caravan : null);
    if (window.renderProfilePredict) window.renderProfilePredict(st.data && st.data.predictions);
    const banner = document.getElementById('profileCheater');
    if (banner) banner.hidden = !(st.data && st.data.cheater);
  }

  function renderAchievements() {
    const el = document.getElementById('profAchievements');
    const count = document.getElementById('profAchCount');
    if (!el) return;
    const earned = new Map(((st.data && st.data.achievements) || []).map(a => [a.key, a.earnedAt]));
    if (count) count.textContent = st.data ? `${earned.size} / ${Object.keys(ACH).length}` : '';
    el.innerHTML = Object.keys(ACH).map(key => {
      const info = window.achievementInfo(key);
      const at = earned.get(key);
      return `<div class="ach-item${at ? ' earned' : ''}" title="${esc(info.desc)}${at ? ' · ' + esc(new Date(at).toLocaleDateString()) : ''}">
        <span class="ach-ico">${info.icon}</span><b>${esc(info.title)}</b><small>${esc(info.desc)}</small>
      </div>`;
    }).join('');
  }

  function renderExtStats() {
    const el = document.getElementById('profExtStats');
    if (!el) return;
    const x = st.data && st.data.extStats;
    if (!x) { el.innerHTML = `<div class="ex-empty">${esc(tx('loadingText', 'Yuklanmoqda...'))}</div>`; return; }
    const pct = (o) => { const n = (o.win || 0) + (o.draw || 0) + (o.loss || 0); return n ? Math.round((o.win || 0) / n * 100) : 0; };
    const wdl = (o) => `<i class="w">${o.win || 0}</i>/<i class="d">${o.draw || 0}</i>/<i class="l">${o.loss || 0}</i>`;
    const reasons = { checkmate: tx('lvReasonCheckmate', 'mat'), resign: tx('lvReasonResign', 'taslim'), timeout: tx('lvReasonTimeout', 'vaqt tugadi'), abandon: tx('lvReasonAbandon', "o'yinni tark etdi") };
    const reasonLine = (o) => Object.keys(reasons).filter(k => o[k]).map(k => `${esc(reasons[k])} <b>${o[k]}</b>`).join(' · ') || '—';
    const modes = [['rapid', '⏱️ Rapid'], ['blitz', '⚡ Blitz'], ['bullet', '🔥 Bullet'], ['chess960', '🎲 Chess960']];
    el.innerHTML = `
      <div class="ex-card"><span>🔥 ${esc(tx('exLongestStreak', "Eng uzun g'alaba seriyasi"))}</span><b>${x.longestStreak}</b><small>${esc(tx('exCurrentStreak', 'Hozirgi: {{n}}', { n: x.currentStreak }))}</small></div>
      <div class="ex-card"><span>${window.kingIcon('w')} ${esc(tx('exAsWhite', 'Oq bilan'))}</span><b>${pct(x.byColor.w)}%</b><small>${wdl(x.byColor.w)}</small></div>
      <div class="ex-card"><span>${window.kingIcon('b')} ${esc(tx('exAsBlack', 'Qora bilan'))}</span><b>${pct(x.byColor.b)}%</b><small>${wdl(x.byColor.b)}</small></div>
      <div class="ex-card"><span>⏳ ${esc(tx('exAvgLength', "O'rtacha o'yin"))}</span><b>${x.avgMoves}</b><small>${esc(tx('exMovesUnit', 'yurish'))}</small></div>
      <div class="ex-card wide"><span>📈 ${esc(tx('exBest', 'Eng yuqori reyting'))}</span><div class="ex-best">${modes.map(([m, l]) => `<em>${l} <b>${x.best[m] || 1500}</b></em>`).join('')}</div></div>
      <div class="ex-card wide"><span>🏆 ${esc(tx('exWinsBy', "G'alabalar"))}</span><small class="ex-line">${reasonLine(x.winsBy)}</small><span>💔 ${esc(tx('exLossesBy', "Mag'lubiyatlar"))}</span><small class="ex-line">${reasonLine(x.lossesBy)}</small></div>
      <div class="ex-card wide"><span>👥 ${esc(tx('exTopOpponents', "Ko'p o'ynalgan raqiblar"))}</span>
        ${x.topOpponents.length ? `<div class="ex-opps">${x.topOpponents.map(o => `<div><b class="player-link" data-username="${esc(o.name)}">${esc(o.name)}</b><small>${esc(tx('lbGamesN', "{{n}} o'yin", { n: o.games }))}</small>${wdl(o)}</div>`).join('')}</div>` : `<small class="ex-line">—</small>`}
      </div>`;
  }

  function renderFollow() {
    const btn = document.getElementById('profileFollowBtn');
    if (!btn) return;
    const me = window.currentUser && window.currentUser.username;
    const own = !st.username || st.username === me;
    btn.style.display = own || !window.currentUser ? 'none' : '';
    const d = st.data;
    const on = !!(d && d.isFollowing);
    btn.classList.toggle('on', on);
    btn.innerHTML = `${on ? '★' : '☆'} <span>${esc(on ? tx('flFollowing', 'Kuzatilmoqda') : tx('flFollow', 'Kuzatish'))}</span>${d ? ` <small>${d.followers}</small>` : ''}`;
    const counts = document.getElementById('profileFollowCounts');
    if (counts) counts.textContent = d ? tx('flCounts', '{{a}} kuzatuvchi · {{b}} kuzatmoqda', { a: d.followers, b: d.following }) : '';
  }

  window.toggleFollow = async function () {
    if (!st.username || !window.currentUser) return;
    const on = !(st.data && st.data.isFollowing);
    const d = await fetch('/api/follow', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window.authToken }, body: JSON.stringify({ username: st.username, follow: on }) })
      .then(r => r.json()).catch(() => null);
    if (!d || !d.success) { showToast(tServer(d && d.message) || tx('errGeneric', 'Xatolik yuz berdi!'), 'warning'); return; }
    st.data = { ...(st.data || {}), isFollowing: d.isFollowing, followers: d.followers, following: d.following };
    renderFollow();
    showToast(on ? tx('flFollowedToast', "Endi {{name}} ni kuzatyapsiz — o'yin boshlasa xabar beramiz", { name: st.username }) : tx('flUnfollowedToast', 'Kuzatish bekor qilindi'), 'success');
  };

  // Profil ochilganda (o'zimniki yoki boshqaniki)
  document.addEventListener('DOMContentLoaded', () => {
    const origOther = window.openPlayerProfile;
    if (typeof origOther === 'function') {
      window.openPlayerProfile = function (username) {
        const r = origOther.apply(this, arguments);
        if (username) load(username);
        return r;
      };
    }
    const origOwn = window.openProfileModal;
    if (typeof origOwn === 'function') {
      window.openProfileModal = function () {
        const r = origOwn.apply(this, arguments);
        if (window.currentUser) load(window.currentUser.username);
        return r;
      };
    }
  });
  window.refreshProfileExtras = renderAll;
})();
