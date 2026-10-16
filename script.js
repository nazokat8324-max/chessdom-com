if (typeof window.currentLang === 'undefined') {
  window.currentLang = localStorage.getItem("justChessLang") || "en";
}

// Tarjima yordamchisi: tx('kalit', "o'zbekcha matn", { name }) — i18next tayyor bo'lmasa o'zbekcha matn qaytadi.
// Qiymatlar HTML-escape qilinmaydi: innerHTML'ga qo'yishdan oldin foydalanuvchi ma'lumotini escapeHtml qiling.
window.tx = function(key, fallback, opts) {
  const vars = opts || {};
  if (typeof i18next !== 'undefined' && i18next.isInitialized) {
    return i18next.t(key, { defaultValue: fallback, ...vars, interpolation: { escapeValue: false } });
  }
  return String(fallback).replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
};

// Server xato/xabar matnlari o'zbekcha keladi — tanish matnlar joriy tilga tarjima qilinadi
const SERVER_MESSAGE_KEYS = {
  "Server xatoligi!": 'srvError',
  "Foydalanuvchi topilmadi!": 'srvUserNotFound',
  "Ism yoki parol xato!": 'srvBadCredentials',
  "Bu nomli foydalanuvchi mavjud!": 'srvUsernameTaken',
  "Foydalanuvchi nomida faqat harf, raqam, _ . - bo'lishi mumkin": 'srvUsernameChars',
  "Username must be 3-30 characters": 'srvUsernameLength',
  "Username is required": 'srvUsernameRequired',
  "Password is required": 'srvPasswordRequired',
  "Invalid email": 'srvInvalidEmail',
  "Password must be at least 6 characters": 'srvPasswordShort',
  "Too many authentication attempts, please try again later.": 'srvTooManyAuth',
  "Too many requests, please try again later.": 'srvTooManyRequests',
  "Invalid or expired token": 'srvSessionExpired',
  "No token provided": 'srvSessionExpired',
  "Ruxsat yo'q": 'srvForbidden',
  "Already in queue": 'srvAlreadyInQueue',
  "Serverga socket orqali ulanmagansiz!": 'srvSocketNotConnected',
  "Message must be 1-1000 characters": 'srvMessageLength',
  "Tournament name must be 3-255 characters": 'srvTournamentNameLength',
  "Turnir topilmadi!": 'srvTournamentNotFound',
  "O'yinchi bloklandi": 'blkDone',
  "Blokdan chiqarildi": 'blkUndone',
  "Bu o'yinchi bilan aloqa cheklangan": 'srvBlocked',
  "Shikoyatingiz yuborildi. Rahmat!": 'rpSent',
  "Bu o'yinchi haqida shikoyatingiz ko'rib chiqilmoqda": 'srvReportPending',
  "Sababni tanlang!": 'srvPickReason',
  "O'yin topilmadi!": 'srvGameNotFound',
  "Adminni bloklab bo'lmaydi": 'srvCantBanAdmin',
  "Turnir allaqachon tugagan": 'srvTournamentOver',
  "Bu o'yinchi faqat do'stlaridan xabar qabul qiladi": 'srvMsgFriendsOnly',
  "Joriy parol noto'g'ri!": 'srvWrongPassword',
  "Parol o'zgartirildi!": 'srvPasswordChanged',
  "Siz allaqachon do'stsiz!": 'srvAlreadyFriends',
  "Juda ko'p urinish. Biroz kutib, qayta urinib ko'ring.": 'srvTooMany',
  "Rasm formati noto'g'ri!": 'srvAvatarBad',
  "Rasm hajmi juda katta!": 'srvAvatarBig',
  "Foydalanuvchi nomi yoki emailni kiriting!": 'authForgotEmpty',
  "Email xizmati hali sozlanmagan. Administratorga murojaat qiling.": 'srvMailOff',
  "Agar akkaunt topilsa, emailga parolni tiklash havolasi yuborildi.": 'srvMailSent',
  "Bu akkauntga email biriktirilmagan. Profilingizda email qo'shib qo'ying.": 'srvNoEmail',
  "Parol kamida 6 ta belgidan iborat bo'lishi kerak": 'authPasswordMinError',
  "Havola noto'g'ri yoki eskirgan!": 'srvResetBad',
  "Parol yangilandi! Endi kirishingiz mumkin.": 'srvResetOk',
  "Bu email boshqa akkauntga biriktirilgan!": 'srvEmailTaken',
  "Turnirga qo'shilish yopilgan!": 'srvSwissClosed',
  "Siz boshqa turnirda ishtirok etyapsiz!": 'srvSwissBusy',
  "Turnir to'la!": 'srvTournamentFull',
  "Siz allaqachon turnirdasiz!": 'srvAlreadyInTournament',
  "Turnir allaqachon boshlangan!": 'srvTournamentStarted',
  "Faqat yaratuvchi boshlashi mumkin!": 'srvOnlyCreatorStart',
  "Kamida 2 o'yinchi kerak!": 'srvMinTwoPlayers',
  "Juftlik uchun kamida 2 o'yinchi kerak!": 'srvMinTwoPlayers',
  "Barcha raundlar o'ynalib bo'ldi!": 'srvAllRoundsPlayed',
  "Faqat turnir yaratuvchisi yoki ishtirokchilari juftlik yarata oladi!": 'srvPairingsForbidden',
  "Bu o'yin natijasini kiritishga ruxsatingiz yo'q!": 'srvResultForbidden',
  "O'yin allaqachon yakunlangan!": 'srvMatchFinished',
  "O'yin topilmadi!": 'srvMatchNotFound',
  "Jamoaviy turnirlar hali qo'llab-quvvatlanmaydi!": 'srvTeamNotImplemented',
  "So'rov allaqachon yuborilgan!": 'srvFriendRequestExists',
  "O'zingizga do'stlik so'rovini yuborib bo'lmaydi!": 'srvFriendSelf',
  "So'rov topilmadi!": 'srvRequestNotFound',
  "Klub topilmadi!": 'srvClubNotFound',
  "Klub to'la!": 'srvClubFull',
  "Siz allaqachon klubdasiz!": 'srvAlreadyInClub',
  "Siz allaqachon boshqa klubga a'zosiz!": 'srvAlreadyInOtherClub',
  "Klub chatiga faqat klub a'zolari yozishi mumkin!": 'srvClubChatMembersOnly',
  "Noto'g'ri davlat kodi!": 'srvBadCountry',
  "Muvaffaqiyatli ro'yxatdan o'tdingiz!": 'srvRegistered',
  "Muvaffaqiyatli kirildi!": 'srvLoggedIn',
  "Hisobdan chiqildi!": 'srvLoggedOut',
  "Turnir yaratildi!": 'srvTournamentCreated',
  "Faqat turnir yaratuvchisi o'yinlarni qo'sha oladi!": 'srvOnlyCreatorMatches',
  "O'yinlar ro'yxati kerak!": 'srvMatchesRequired',
  "Noto'g'ri natija turi!": 'srvBadResult',
  "Natija saqlandi!": 'srvResultSaved',
  "Liga topilmadi!": 'srvLeagueNotFound',
  "Club name must be 3-255 characters": 'srvClubNameLength',
  "Klub yaratildi!": 'srvClubCreated',
  "Turnirga qo'shildingiz!": 'srvJoinedTournament',
  "Turnir boshlandi!": 'srvTournamentStartedOk',
  "Do'stlik so'rovi yuborildi!": 'srvFriendRequestSent',
  "Do'stlik qabul qilindi!": 'srvFriendAccepted',
  "So'rov rad etildi!": 'srvRequestDeclined',
  "Do'stlik bekor qilindi": 'srvFriendRemoved',
  "So'rov bekor qilindi": 'srvRequestCancelled',
  "Klubga qo'shildingiz!": 'srvJoinedClub'
};
// --- Profil rasmlari ---
// Rasm manzili; version bo'lsa brauzer uni uzoq keshlaydi (rasm o'zgarsa version ham o'zgaradi)
window.avatarUrl = function(username, version) {
  return '/api/users/' + encodeURIComponent(username) + '/avatar' + (version ? '?v=' + encodeURIComponent(version) : '');
};
// Harfli avatar ustiga rasm: rasm bo'lmasa (404) o'zi o'chadi va harf ko'rinib qoladi.
// version === null — rasmi yo'qligi aniq (so'rov yuborilmaydi), undefined — noma'lum (tekshiriladi)
window.avatarOverlay = function(username, version) {
  if (!username || version === null) return '';
  const src = window.avatarUrl(username, version).replace(/"/g, '&quot;');
  return '<img class="av-img" src="' + src + '" alt="" loading="lazy" onerror="this.remove()">';
};
window.myAvatarVersion = function(username) {
  return window.currentUser && username === window.currentUser.username ? (window.currentUser.avatarVersion || null) : undefined;
};

window.tServer = function(message) {
  if (!message) return message;
  const key = SERVER_MESSAGE_KEYS[message];
  return key ? window.tx(key, message) : message;
};
// Eski versiyadagi faqat brauzerda yaratilgan ("local_" tokenli) akkauntlar serverda ishlamaydi — sessiyani tozalash
if ((localStorage.getItem("justChessAuthToken") || "").startsWith("local_")) {
  localStorage.removeItem("justChessAuthToken");
  localStorage.removeItem("justChessCurrentUser");
}
localStorage.removeItem("justChessRegisteredUsers");
window.currentUser = JSON.parse(localStorage.getItem("justChessCurrentUser")) || null;
window.stats = window.currentUser ? window.currentUser.stats : localStorage.getItem("justChessGuestStats") ? JSON.parse(localStorage.getItem("justChessGuestStats")) : { wins: 0, losses: 0, draws: 0 };
window.statsByMode = (window.currentUser && window.currentUser.statsByMode) || JSON.parse(localStorage.getItem("justChessStatsByMode")) || {
  rapid: { wins: 0, losses: 0, draws: 0 },
  blitz: { wins: 0, losses: 0, draws: 0 },
  bullet: { wins: 0, losses: 0, draws: 0 }
};
window.authToken = localStorage.getItem("justChessAuthToken") || null;

window.playAnimation = function(elementId, animationName, callback) {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.classList.remove('animate__animated');
  Array.from(element.classList).forEach(cls => {
    if (cls.startsWith('animate__')) element.classList.remove(cls);
  });

  element.classList.add('animate__animated', `animate__${animationName}`);

  function handleAnimationEnd(event) {
    event.stopPropagation();
    element.classList.remove('animate__animated', `animate__${animationName}`);
    element.removeEventListener('animationend', handleAnimationEnd);
    if (typeof callback === 'function') callback();
  }

  element.addEventListener('animationend', handleAnimationEnd);
};

window.checkAndUpdateStreak = function() {
  let streakData = JSON.parse(
    localStorage.getItem("justChessStreak")
  ) || { count: 1, lastDate: "" };
  const today = new Date().toISOString().slice(0, 10);

  if (streakData.lastDate === today) {
  } else {
    const last = new Date(streakData.lastDate);
    const now = new Date(today);
    const diffTime = Math.abs(now - last);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (streakData.lastDate === "" || diffDays === 1) {
      streakData.count += 1;
    } else if (diffDays > 1) {
      streakData.count = 1;
    }
    streakData.lastDate = today;
    localStorage.setItem("justChessStreak", JSON.stringify(streakData));
  }
  return streakData.count;
};

window.currentStreak = window.checkAndUpdateStreak();

// Ketma-ketlik sonini tilga mos so'z bilan chiqarish (son-ot mosligi bilan)
function getStreakText(n) {
  const count = Number(n) || 0;
  const lang = String(window.currentLang || 'uz').toLowerCase().split('-')[0];
  const num = Math.abs(count) % 100;
  const last = num % 10;

  if (lang === 'uz') return count + ' kun';
  if (lang === 'en') return count === 1 ? '1 day' : count + ' days';
  if (lang === 'ru') {
    // 1, 21, 31... -> день; 2-4, 22-24... -> дня; qolgani -> дней
    if (num > 10 && num < 20) return count + ' дней';
    if (last === 1) return count + ' день';
    if (last >= 2 && last <= 4) return count + ' дня';
    return count + ' дней';
  }
  if (lang === 'es') return count === 1 ? '1 día' : count + ' días';
  if (lang === 'de') return count === 1 ? '1 Tag' : count + ' Tage';
  if (lang === 'fr') return count === 1 ? '1 jour' : count + ' jours';
  return count === 1 ? '1 day' : count + ' days';
}

window.updateStreakUI = function() {
  const streakElem = document.getElementById("streakDisplayText");
  if (!streakElem) return;
  streakElem.textContent = `🔥 ${getStreakText(window.currentStreak)}`;
};

window._topPlayersState = null;

function topPlayersText(key, fallback) {
  return (typeof i18next !== 'undefined' && i18next.isInitialized)
    ? i18next.t(key, { defaultValue: fallback })
    : fallback;
}

function topPlayersEsc(value) {
  if (typeof escapeHtml === 'function') return escapeHtml(value);
  const div = document.createElement('div');
  div.textContent = (value === null || value === undefined) ? '' : String(value);
  return div.innerHTML;
}

function topPlayersTableHead() {
  return `
      <thead>
        <tr>
          <th>#</th>
          <th id="colUsername">${topPlayersEsc(topPlayersText('colUsername', 'Username'))}</th>
          <th id="colRating">${topPlayersEsc(topPlayersText('colRating', 'Rating'))}</th>
          <th id="colWinPoints">${topPlayersEsc(topPlayersText('colWinPoints', 'Win Points'))}</th>
        </tr>
      </thead>`;
}

function topPlayersMessage(className, key, fallback, colspan) {
  const message = topPlayersEsc(topPlayersText(key, fallback));
  const cell = colspan
    ? `<td class="${className}" colspan="${colspan}">${message}</td>`
    : `<div class="${className}">${message}</div>`;
  return `
      <table class="top-winners-table">
        ${topPlayersTableHead()}
        <tbody>
          <tr>${cell}</tr>
        </tbody>
      </table>
    `;
}

window.renderTopPlayersList = function() {
  const container = document.getElementById("topPlayersContainer");
  if (!container) return;

  const state = window._topPlayersState;

  // Hali yuklanmagan
  if (!state) {
    container.innerHTML = `<div class="top-winners-empty">${topPlayersEsc(topPlayersText('loadingText', 'Yuklanmoqda...'))}</div>`;
    return;
  }

  // Yuklash xatoligi
  if (state.status === 'error') {
    container.innerHTML = topPlayersMessage('top-winners-empty', 'topPlayersError', 'Reytingni yuklab bo\'lmadi', 4);
    return;
  }

  const winners = Array.isArray(state.winners) ? state.winners : [];

  // Soxta ma'lumot yo'q - bo'sh holat
  if (state.status === 'empty' || winners.length === 0) {
    container.innerHTML = topPlayersMessage('top-winners-empty', 'topPlayersEmpty', 'Oxirgi 24 soatda hali g\'alaba yo\'q', 4);
    return;
  }

  const tableRows = winners
    .map((user, index) => {
      const name = (user && user.username) ? String(user.username) : '';
      const initial = name.charAt(0).toUpperCase() || 'U';
      const rating = Number(user && user.rating);
      const wins = Number(user && user.dailyWins);
      return `
          <tr class="top-winners-row">
            <td class="top-winners-rank">${index + 1}</td>
            <td class="top-winners-user">
              <div class="top-winners-user-cell">
                <div class="mini-avatar">${topPlayersEsc(initial)}${window.avatarOverlay(name, window.myAvatarVersion(name))}</div>
                <span class="top-winners-name player-link" data-username="${topPlayersEsc(name)}">${topPlayersEsc(name)}</span>
              </div>
            </td>
            <td class="top-winners-rating">${Number.isFinite(rating) ? rating : 1500}</td>
            <td class="top-winners-wins">${Number.isFinite(wins) ? wins : 0}</td>
          </tr>
        `;
    })
    .join('');

  container.innerHTML = `
      <table class="top-winners-table">
        ${topPlayersTableHead()}
        <tbody>${tableRows}</tbody>
      </table>
    `;
};

window.loadTopPlayers = async function() {
  const container = document.getElementById("topPlayersContainer");
  if (!container) return;

  window._topPlayersState = null;
  window.renderTopPlayersList();

  try {
    const res = await fetch('/api/daily-winners');
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    if (!data || data.success !== true) throw new Error('Invalid response');

    const winners = (Array.isArray(data.winners) ? data.winners : []).slice(0, 5);
    window._topPlayersState = winners.length > 0
      ? { status: 'ok', winners }
      : { status: 'empty', winners: [] };
  } catch (err) {
    console.error('Top players yuklash xatoligi:', err);
    window._topPlayersState = { status: 'error', winners: [] };
  }

  window.renderTopPlayersList();
};

window.updateGameHistoryView = function() {
  const container = document.getElementById("historyTableBody");
  if (!container) return;

  let history = [];
  if (window.currentUser && window.currentUser.history) {
    history = window.currentUser.history;
  } else {
    const guestHistory = JSON.parse(localStorage.getItem("justChessGameHistory") || "[]");
    history = guestHistory;
  }

  window._allGameHistory = Array.isArray(history) ? history : [];
  window._currentHistoryFilter = 'all';
  document.querySelectorAll('#historyView .mode-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === 'all');
  });
  renderHistoryTable(window._allGameHistory);
};

function renderHistoryTable(history) {
  const container = document.getElementById("historyTableBody");
  if (!container) return;

  let html = '';
  history.forEach((game, index) => {
    let resultBadge = '';
    if (game.result === 'win') {
      resultBadge = '<span style="color: #2ecc71; font-weight: bold;">' + tx('resultWin', "G'alaba") + '</span>';
    } else if (game.result === 'loss') {
      resultBadge = '<span style="color: #e74c3c; font-weight: bold;">' + tx('resultLoss', "Mag'lubiyat") + '</span>';
    } else if (game.result === 'draw') {
      resultBadge = '<span style="color: #f39c12; font-weight: bold;">' + tx('resultDraw', 'Durrang') + '</span>';
    } else {
      resultBadge = `<span style="color: #88a;">${game.result || '-'}</span>`;
    }

    const timeControl = game.timeControl || 'blitz';
    const timeLabel = timeControl.charAt(0).toUpperCase() + timeControl.slice(1);
    // Bazada o'zbekcha saqlangan standart qiymatlarni joriy tilga o'girish
    const storedLabels = {
      "Oq va Qora": tx('opponentLocal', 'Oq va Qora'),
      "Oq va Qora (Online)": tx('opponentLocal', 'Oq va Qora'),
      "Raqib": tx('colOpponent', 'Raqib'),
      "Online o'yin": tx('modeOnline', "Onlayn o'yin"),
      "Online": tx('modeOnline', "Onlayn o'yin")
    };
    const opponentLabel = storedLabels[game.opponent] || game.opponent || tx('unknownLabel', "Noma'lum");
    const modeLabel = storedLabels[game.mode] || game.mode || tx('modeOnline', "Onlayn o'yin");

    html += `
      <tr>
        <td style="color: #88a; font-size: 12px;">${index + 1}</td>
        <td style="color: #ccc; font-size: 12px;">${game.date || '-'}</td>
        <td style="color: #fff; font-size: 13px; font-weight: bold;">${escapeHtml(opponentLabel)}</td>
        <td style="color: #88a; font-size: 12px;">${escapeHtml(modeLabel)}</td>
        <td style="color: #88a; font-size: 12px;">${timeLabel}</td>
        <td style="text-align: center;">${resultBadge}</td>
      </tr>
    `;
  });

  container.innerHTML = html;
}

window.filterHistory = function(filterType) {
  if (!Array.isArray(window._allGameHistory)) {
    window.updateGameHistoryView();
  }

  const validFilters = ['all', 'win', 'loss', 'draw'];
  const selectedFilter = validFilters.includes(filterType) ? filterType : 'all';
  window._currentHistoryFilter = selectedFilter;

  document.querySelectorAll('#historyView .mode-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === selectedFilter);
  });

  const filteredHistory = selectedFilter === 'all'
    ? window._allGameHistory
    : window._allGameHistory.filter(game => game && game.result === selectedFilter);

  renderHistoryTable(filteredHistory);
};

window.setupHistoryFilters = function() {
  document.querySelectorAll('#historyView .mode-tab').forEach(button => {
    button.addEventListener('click', () => {
      window.filterHistory(button.dataset.filter);
    });
  });
};

// Kompyuterda: chap menyuni yig'ish/ochish (☰). Yig'ilganda faqat belgilar qoladi; tanlov eslab qolinadi
window.toggleSidebar = function(force) {
  const root = document.documentElement;
  const collapsed = typeof force === 'boolean' ? force : !root.classList.contains('sidebar-collapsed');
  root.classList.toggle('sidebar-collapsed', collapsed);
  try { localStorage.setItem('justChessSidebar', collapsed ? 'collapsed' : 'open'); } catch (e) {}
  const btn = document.getElementById('sidebarToggle');
  if (btn) btn.title = collapsed ? tx('sidebarOpen', 'Menyuni ochish') : tx('sidebarClose', "Menyuni yig'ish");
  // Taxta va grafiklar yangi kenglikka moslashsin
  setTimeout(() => window.dispatchEvent(new Event('resize')), 260);
};

// Yig'ilgan menyuda belgiga sichqoncha olib borilganda bo'lim nomi ko'rinsin
window.refreshSidebarTitles = function() {
  document.querySelectorAll('sidebar .menu-list .menu-item').forEach(item => {
    const label = [...item.querySelectorAll('span')].find(s => !s.classList.contains('icon') && !s.classList.contains('lg-nav-badge'));
    if (label) item.title = label.textContent.trim();
  });
  const btn = document.getElementById('sidebarToggle');
  if (btn) btn.title = document.documentElement.classList.contains('sidebar-collapsed') ? tx('sidebarOpen', 'Menyuni ochish') : tx('sidebarClose', "Menyuni yig'ish");
};
document.addEventListener('DOMContentLoaded', () => setTimeout(window.refreshSidebarTitles, 500));

// Telefonda: pastki paneldagi "Ko'proq" — qolgan bo'limlar ro'yxati
window.toggleMobileMenu = function(open) {
  const next = typeof open === 'boolean' ? open : !document.body.classList.contains('mobile-menu-open');
  document.body.classList.toggle('mobile-menu-open', next);
};

window.switchView = function(viewName) {
  document.body.classList.remove('mobile-menu-open');
  if (viewName !== 'live' && typeof window.stopWatching === 'function') window.stopWatching();
  if (viewName !== "settings" && typeof window.discardSettingsChanges === "function") {
    const settingsEl = document.getElementById("settingsView");
    if (settingsEl && settingsEl.classList.contains("active-view")) window.discardSettingsChanges();
  }
  if (viewName === "login" || viewName === "register") {
    if (!window.currentUser) {
      window.showAuthGate(viewName === "login" ? 'login' : 'signup');
      return;
    }
    viewName = "home";
  }
  if (typeof window.closeTournamentDetail === 'function') {
    window.closeTournamentDetail();
  }
  if (typeof window.gameStartRequested !== 'undefined') {
    window.gameStartRequested = false;
  }
  
  document
    .querySelectorAll(".view-section")
    .forEach((el) => el.classList.remove("active-view"));
  document
    .querySelectorAll(".menu-item")
    .forEach((el) => el.classList.remove("active"));

  if (viewName === "home") {
    const homeEl = document.getElementById("homeView");
    const navEl = document.getElementById("navHome");
    if (homeEl) {
      homeEl.classList.add("active-view");
      window.playAnimation("homeView", "fadeIn");
    }
    if (navEl) navEl.classList.add("active");
    window.loadTopPlayers();
    if (typeof window.refreshHomeWidgets === "function") window.refreshHomeWidgets();
  } else if (viewName === "game") {
    const gameEl = document.getElementById("gameView");
    const navEl = document.getElementById("navPlay");
    if (gameEl) {
      gameEl.classList.add("active-view");
      window.playAnimation("gameView", "fadeIn");
    }
    if (navEl) navEl.classList.add("active");

    // O'yin davom etayotgan bo'lsa (boshqa sahifadan qaytilganda) doska va panellar tozalanmaydi
    const gameInProgress = typeof window.isGameInProgress === 'function' && window.isGameInProgress();
    if (!gameInProgress && typeof window.updatePlayerInfo === 'function') {
      if (window.currentUser) {
        window.updatePlayerInfo('white', window.currentUser.username, window.currentUser.rating || 1500);
        window.updatePlayerInfo('black', tx('colOpponent', 'Raqib'), '⏳');
      } else {
        window.updatePlayerInfo('white', tx('whiteText', 'Oq'), 1500);
        window.updatePlayerInfo('black', tx('colOpponent', 'Raqib'), '⏳');
      }
    }

    if (typeof window.updateTimersDisplay === 'function') {
      window.updateTimersDisplay();
    }
    
    if (typeof window.updateGameFlags === 'function') {
      window.updateGameFlags();
    }

    if (!gameInProgress && typeof window.setOpponentFound === 'function') {
      window.setOpponentFound(false);
    }
  } else if (viewName === "login") {
    const loginEl = document.getElementById("loginView");
    if (loginEl) {
      loginEl.classList.add("active-view");
      window.playAnimation("loginCardTitle", "bounceIn");
    }
  } else if (viewName === "register") {
    const regEl = document.getElementById("registerView");
    if (regEl) {
      regEl.classList.add("active-view");
      window.playAnimation("regCardTitle", "bounceIn");
    }
  } else if (viewName === "profile") {
    if (typeof window.updateProfileViewData === "function") {
      window.updateProfileViewData();
    }
    const profEl = document.getElementById("profileView");
    if (profEl) {
      profEl.classList.add("active-view");
      window.playAnimation("profileView", "fadeIn");
    }
  } else if (viewName === "leaderboard") {
    window.leaderboardMode = 'players';
    window.leaderboardFilter = 'all';
    if (typeof window.updateFullLeaderboard === "function") {
      window.updateFullLeaderboard();
    }
    const leadEl = document.getElementById("leaderboardView");
    if (leadEl) {
      leadEl.classList.add("active-view");
      if (typeof window.playAnimation === "function") {
        window.playAnimation("leaderboardView", "fadeIn");
      }
    }
    const navEl = document.getElementById("navLeaderboard");
    if (navEl) navEl.classList.add("active");
  } else if (viewName === "history") {
    if (typeof window.updateGameHistoryView === "function") {
      window.updateGameHistoryView();
    }
    const historyEl = document.getElementById("historyView");
    if (historyEl) {
      historyEl.classList.add("active-view");
      if (typeof window.playAnimation === "function") {
        window.playAnimation("historyView", "fadeIn");
      }
    }
    const navEl = document.getElementById("navHistory");
    if (navEl) navEl.classList.add("active");
  } else if (viewName === "tournaments") {
    const tournamentsEl = document.getElementById("tournamentsView");
    if (tournamentsEl) {
      tournamentsEl.classList.add("active-view");
      if (typeof window.playAnimation === "function") {
        window.playAnimation("tournamentsView", "fadeIn");
      }
      if (typeof window.loadTournaments === "function") {
        window.loadTournaments();
      }
    }
    const navEl = document.getElementById("navTournaments");
    if (navEl) navEl.classList.add("active");
  } else if (viewName === "friends") {
    const friendsEl = document.getElementById("friendsView");
    if (friendsEl) {
      friendsEl.classList.add("active-view");
      if (typeof window.playAnimation === "function") {
        window.playAnimation("friendsView", "fadeIn");
      }
      if (typeof window.loadFriendsList === "function") {
        window.loadFriendsList();
      }
    }
    const navEl = document.getElementById("navFriends");
    if (navEl) navEl.classList.add("active");
  } else if (viewName === "clubs") {
    const clubsEl = document.getElementById("clubsView");
    if (clubsEl) {
      clubsEl.classList.add("active-view");
      if (typeof window.playAnimation === "function") {
        window.playAnimation("clubsView", "fadeIn");
      }
      if (typeof window.loadClubs === "function") {
        window.loadClubs();
      }
    }
    const navEl = document.getElementById("navClubs");
    if (navEl) navEl.classList.add("active");
  } else if (viewName === "leagues") {
    const leaguesEl = document.getElementById("leaguesView");
    if (leaguesEl) {
      leaguesEl.classList.add("active-view");
      if (typeof window.playAnimation === "function") {
        window.playAnimation("leaguesView", "fadeIn");
      }
      if (typeof window.renderLeagues === "function") {
        window.renderLeagues();
      }
    }
    const navEl = document.getElementById("navLeagues");
    if (navEl) navEl.classList.add("active");
  } else if (viewName === "champions") {
    const championsEl = document.getElementById("championsView");
    if (championsEl) {
      championsEl.classList.add("active-view");
      if (typeof window.renderChampionsLeague === "function") window.renderChampionsLeague();
      if (typeof window.playAnimation === "function") {
        window.playAnimation("championsView", "fadeIn");
      }
    }
    const navEl = document.getElementById("navChampions");
    if (navEl) navEl.classList.add("active");
  } else if (viewName === "chat") {
    const chatEl = document.getElementById("chatView");
    if (chatEl) {
      chatEl.classList.add("active-view");
      if (typeof window.playAnimation === "function") {
        window.playAnimation("chatView", "fadeIn");
      }
      if (typeof window.loadChatMessages === "function") {
        window.loadChatMessages();
      }
    }
  } else if (viewName === "admin") {
    const adminEl = document.getElementById("adminView");
    if (adminEl) adminEl.classList.add("active-view");
    const navEl = document.getElementById("navAdmin");
    if (navEl) navEl.classList.add("active");
    if (typeof window.renderAdminView === "function") window.renderAdminView();
  } else if (viewName === "live") {
    const liveEl = document.getElementById("liveView");
    if (liveEl) liveEl.classList.add("active-view");
    const navEl = document.getElementById("navLive");
    if (navEl) navEl.classList.add("active");
    if (typeof window.renderLiveView === "function") window.renderLiveView();
  } else if (viewName === "messages") {
    const messagesEl = document.getElementById("messagesView");
    if (messagesEl) messagesEl.classList.add("active-view");
    const navEl = document.getElementById("navMessages");
    if (navEl) navEl.classList.add("active");
    if (typeof window.renderMessagesView === "function") window.renderMessagesView();
  } else if (viewName === "settings") {
    const settingsEl = document.getElementById("settingsView");
    if (settingsEl) {
      settingsEl.classList.add("active-view");
      if (typeof window.playAnimation === "function") {
        window.playAnimation("settingsView", "fadeIn");
      }
      if (typeof window.updateSettingsView === "function") {
        window.updateSettingsView();
      }
    }
  }
};

window.updateAuthHeaderUI = function() {
  if (typeof window.updateAdminNav === "function") window.updateAdminNav();
  if (typeof window.refreshMessagesBadge === "function") window.refreshMessagesBadge();
  if (typeof window.refreshLeagueBadge === "function") window.refreshLeagueBadge();
  const container = document.getElementById("sidebarAuthContainer");
  if (!container) return;

  if (window.currentUser) {
    container.innerHTML = `
      <div class="user-mini-profile" onclick="window.openProfileModal()">
        <div class="mini-avatar">${window.currentUser.username.charAt(0).toUpperCase()}${window.avatarOverlay(window.currentUser.username, window.currentUser.avatarVersion || null)}</div>
        <div class="mini-info">
          <b>${topPlayersEsc(window.currentUser.username)}</b>
        </div>
      </div>`;
  } else {
    container.innerHTML = `
      <div class="user-mini-profile" onclick="switchView('login')">
        <div class="mini-avatar">👤</div>
        <div class="mini-info">
          <b id="sidebarLoginText">Kirish</b>
          <span>Profilga ulanish</span>
        </div>
      </div>`;
  }
};

// Server login/register javobidan sessiyani o'rnatish
window.applyAuthSession = function(user, token) {
  const settings = JSON.parse(localStorage.getItem("justChessSettings") || "{}");
  const country = user.country || settings.country || "uz";
  let countryName = user.countryName || "";
  if (!countryName && typeof allCountries !== 'undefined') {
    const found = allCountries.find(c => c.code === country);
    if (found) countryName = found.name;
  }
  if (!countryName && country === "uz") countryName = "O'zbekiston";

  window.currentUser = {
    ...user,
    country: country,
    countryName: countryName,
    stats: user.stats || { wins: 0, losses: 0, draws: 0 },
    statsByMode: user.statsByMode || {
      rapid: { wins: 0, losses: 0, draws: 0 },
      blitz: { wins: 0, losses: 0, draws: 0 },
      bullet: { wins: 0, losses: 0, draws: 0 }
    }
  };
  window.authToken = token;
  window.stats = window.currentUser.stats;
  window.statsByMode = window.currentUser.statsByMode;
  localStorage.setItem("justChessCurrentUser", JSON.stringify(window.currentUser));
  localStorage.setItem("justChessAuthToken", token);
  if (typeof window.authenticateSocket === 'function') window.authenticateSocket();
  // Serverda davlat hali yo'q bo'lsa, Sozlamalardagisini yuboramiz
  if (!user.country && settings.country) window.syncMyCountry(settings.country);
  setTimeout(() => window.openProfileFromUrl(), 0);
};

window.handleRegister = async function() {
  const username = document.getElementById("regUsername").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  const t = (typeof i18next !== 'undefined') ? i18next : null;

  if (!username || !email || !password) {
    alert(t ? t.t('fillAllFields') : "Barcha maydonlarni to'ldiring!");
    window.playAnimation("regCardTitle", "shakeX");
    return;
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!data.success) {
      alert(tServer(data.message));
      window.playAnimation("regCardTitle", "shakeX");
      return;
    }
    window.applyAuthSession(data.user, data.token);
    alert(t ? t.t('regSuccess') : data.message);
    if (typeof window.updateStatsDisplay === "function") window.updateStatsDisplay();
    window.updateAuthHeaderUI();
    window.switchView("home");
  } catch (err) {
    alert(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"));
    console.error(err);
  }
};

window.handleLogin = async function() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const t = (typeof i18next !== 'undefined') ? i18next : null;

  if (!username || !password) {
    alert(t ? t.t('fillAllFields') : "Barcha maydonlarni to'ldiring!");
    window.playAnimation("loginCardTitle", "shakeX");
    return;
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!data.success) {
      alert(tServer(data.message));
      window.playAnimation("loginCardTitle", "shakeX");
      return;
    }
    window.applyAuthSession(data.user, data.token);
    alert(t ? t.t('regSuccess') : data.message);
    if (typeof window.updateStatsDisplay === "function") window.updateStatsDisplay();
    window.updateAuthHeaderUI();
    window.switchView("home");
  } catch (err) {
    alert(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"));
    console.error(err);
  }
};

window.handleLogout = async function() {
  if (typeof socket !== 'undefined' && window.currentRoomId) {
    socket.emit('leave-room', window.currentRoomId);
  }
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.authToken}`
      },
      body: JSON.stringify({})
    });
  } catch (err) {
    console.error('Logout xatoligi:', err);
  }
  window.currentUser = null;
  window.authToken = null;
  localStorage.removeItem("justChessCurrentUser");
  localStorage.removeItem("justChessAuthToken");
  window.stats = { wins: 0, losses: 0, draws: 0 };
  window.currentRoomId = null;
  isOnlineMode = false;
  if (typeof window.updateStatsDisplay === "function") window.updateStatsDisplay();
  window.updateAuthHeaderUI();
  window.switchView("home");
  if (!window.currentUser && typeof window.openLoginModal === "function") {
    window.openLoginModal();
  }
};

// Server tokenni rad etsa (muddati o'tgan yoki JWT_SECRET almashgan) — sessiyani tozalab, kirish sahifasini ochish
window.expireSession = function() {
  if (!window.currentUser && !window.authToken) return;
  window.currentUser = null;
  window.authToken = null;
  localStorage.removeItem("justChessCurrentUser");
  localStorage.removeItem("justChessAuthToken");
  window.stats = { wins: 0, losses: 0, draws: 0 };
  if (typeof window.updateAuthHeaderUI === "function") window.updateAuthHeaderUI();
  window.showAuthGate('login');
  if (typeof showToast === "function") showToast(tx('srvSessionExpired', "Sessiya tugagan. Qaytadan tizimga kiring."), 'warning', 5000);
};

window.handleLogoutFromProfile = function() {
  const profileModal = document.getElementById("profileModal");
  if (profileModal) {
    profileModal.style.display = "none";
  }
  window.handleLogout();
};

window.closeProfileModal = function() {
  const profileModal = document.getElementById("profileModal");
  if (profileModal) {
    profileModal.style.display = "none";
  }
  window.viewedProfileUsername = null;
};

window.openProfileModal = function() {
  window.viewedProfileUsername = null;
  const profileModal = document.getElementById("profileModal");
  if (profileModal) profileModal.classList.remove("viewing-other");
  const friendBtn = document.getElementById("profileFriendBtn");
  if (friendBtn) friendBtn.style.display = 'none';
  const messageBtn = document.getElementById("profileMessageBtn");
  if (messageBtn) messageBtn.style.display = 'none';
  const challengeBtn = document.getElementById("profileChallengeBtn");
  if (challengeBtn) challengeBtn.style.display = 'none';
  const modActions = document.getElementById("profileModActions");
  if (modActions) modActions.style.display = 'none';
  updateProfileModalData();
  if (profileModal) {
    profileModal.style.display = "flex";
  }
  // Oxirgi o'yinlar va a'zo bo'lgan sana — serverdagi ommaviy profildan
  if (window.currentUser) {
    const me = window.currentUser.username;
    window.renderRecentGames(null); if (typeof window.renderRatingChart === "function") window.renderRatingChart(null);
    fetchPublicProfile(me).then(data => {
      if (window.viewedProfileUsername || !data.success) return;
      if (data.profile.avatarVersion !== undefined && data.profile.avatarVersion !== window.currentUser.avatarVersion) {
        window.currentUser.avatarVersion = data.profile.avatarVersion;
        localStorage.setItem("justChessCurrentUser", JSON.stringify(window.currentUser));
        window.refreshMyAvatar();
      }
      window.currentUser.createdAt = data.profile.createdAt;
      window.renderRecentGames(data.profile.recentGames); if (typeof window.renderRatingChart === "function") window.renderRatingChart(data.profile);
      const joinedEl = document.getElementById("profileJoined");
      const d = data.profile.createdAt ? new Date(data.profile.createdAt) : null;
      if (joinedEl && d && !isNaN(d)) {
        joinedEl.style.display = 'block';
        joinedEl.textContent = tx('profJoined', "{{date}} dan beri a'zo", { date: d.toLocaleDateString() });
      }
    }).catch(() => window.renderRecentGames([]));
  }
  // Eng so'nggi reytinglarni serverdan olish (ochiq oyna avtomatik yangilanadi)
  if (typeof window.refreshCurrentUserRatings === 'function') window.refreshCurrentUserRatings();
};

// --- Info Modal (Sayt haqida / Maqsad / Rejalar / Tuzilma) ---
const INFO_SECTIONS = {
  about: { titleKey: "infoAboutTitle", paragraphs: ["infoAboutText1", "infoAboutText2"], lists: [] },
  goal:  { titleKey: "infoGoalTitle",  paragraphs: ["infoGoalText1", "infoGoalText2", "infoGoalText3"], lists: [] },
  plan:  { titleKey: "infoPlanTitle",  paragraphs: ["infoPlanIntro"], lists: ["infoPlanItem1", "infoPlanItem2", "infoPlanItem3", "infoPlanItem4"] },
  tech:  {
    titleKey: "infoTechTitle",
    paragraphs: [],
    cards: [
      { titleKey: "mPlay",         textKey: "infoTechText1" },
      { titleKey: "mLeaderboard",  textKey: "infoTechText2" },
      { titleKey: "clubsTitle",    textKey: "infoTechText3" },
      { titleKey: "mLeagues",      textKey: "infoTechText4" },
      { titleKey: "mChampions",    textKey: "infoTechText5" },
      { titleKey: "mSettings",     textKey: "infoTechText6" }
    ],
    lists: []
  }
};

window.renderInfoModal = function(section) {
  const cfg = INFO_SECTIONS[section];
  const titleEl = document.getElementById("infoModalTitle");
  const bodyEl = document.getElementById("infoModalBody");
  if (!cfg || !titleEl || !bodyEl) return;

  const t = (key, fallback) =>
    (typeof i18next !== 'undefined' && i18next.isInitialized)
      ? i18next.t(key, { defaultValue: fallback })
      : fallback;

  titleEl.textContent = t(cfg.titleKey, section);

  bodyEl.textContent = "";

  (cfg.paragraphs || []).forEach(key => {
    const p = document.createElement("p");
    p.textContent = t(key, "");
    bodyEl.appendChild(p);
  });

  (cfg.lists || []).forEach(key => {
    const li = document.createElement("div");
    li.className = "info-list-item";
    li.textContent = t(key, "");
    bodyEl.appendChild(li);
  });

  if (cfg.cards && cfg.cards.length) {
    const grid = document.createElement("div");
    grid.className = "info-card-grid";
    cfg.cards.forEach(card => {
      const box = document.createElement("div");
      box.className = "info-card";

      const title = document.createElement("div");
      title.className = "info-card-title";
      title.textContent = t(card.titleKey, "");
      box.appendChild(title);

      const text = document.createElement("div");
      text.className = "info-card-text";
      text.textContent = t(card.textKey, "");
      box.appendChild(text);

      grid.appendChild(box);
    });
    bodyEl.appendChild(grid);
  }
};

window.openInfoModal = function(section) {
  const infoModal = document.getElementById("infoModal");
  if (!infoModal) return;

  // Profil oynasi ochiq bo'lsa, info oynasi ochilmasin
  const profileModal = document.getElementById("profileModal");
  if (profileModal && profileModal.style.display === "flex") return;

  window.currentInfoSection = section;
  window.renderInfoModal(section);
  infoModal.style.display = "flex";
};

window.closeInfoModal = function() {
  const infoModal = document.getElementById("infoModal");
  if (infoModal) {
    infoModal.style.display = "none";
  }
  window.currentInfoSection = null;
};

// Country flag helper
function countryCodeToFlag(code) {
  const upper = code.toUpperCase();
  return upper.replace(/./g, ch => String.fromCharCode(127397 + ch.charCodeAt(0)));
}

// Current opponent data (for dynamic flag)
window.currentOpponent = {};

// Set opponent country/flag data
window.setOpponentData = function(data) {
  if (data) {
    window.currentOpponent = {
      country: data.country || null,
      countryName: data.countryName || '',
      username: data.username || 'Raqib',
      rating: data.rating || 1500
    };
  } else {
    window.currentOpponent = {};
  }
  if (typeof window.updateGameFlags === 'function') {
    window.updateGameFlags();
  }
};

// Update game player flags dynamically
window.updateGameFlags = function() {
  const DEFAULT_FLAG = 'uz';
  // Raqib hali topilmagan yoki davlatini tanlamagan bo'lsa — xalqaro (BMT) bayrog'i
  const UNKNOWN_FLAG = 'un';

  const whiteFlagEl = document.getElementById('whitePlayerFlag');
  const blackFlagEl = document.getElementById('blackPlayerFlag');
  
  const playerCountry = (window.currentUser && window.currentUser.country)
    ? window.currentUser.country.toLowerCase()
    : DEFAULT_FLAG;
  const opponent = window.currentOpponent || {};
  const opponentCountry = opponent.country
    ? opponent.country.toLowerCase()
    : UNKNOWN_FLAG;
  // Qora bilan o'ynaganda o'z bayrog'imiz qora panelda bo'ladi
  const [whiteCountry, blackCountry] = window.myColor === 'b'
    ? [opponentCountry, playerCountry]
    : [playerCountry, opponentCountry];

  // onerror yashirgan bo'lsa, yangi bayroq uchun qayta ko'rsatamiz
  if (whiteFlagEl) {
    whiteFlagEl.style.display = '';
    whiteFlagEl.src = `https://flagcdn.com/w40/${whiteCountry}.png`;
  }

  if (blackFlagEl) {
    blackFlagEl.style.display = '';
    blackFlagEl.src = `https://flagcdn.com/w40/${blackCountry}.png`;
  }
};

// Country selection is now handled only in the Settings page
window.populateCountrySelect = function() {};

// --- Kirish sahifasi (authGate): tizimga kirilmaguncha saytning o'zi ko'rinmaydi ---
// mode: 'signup' (yangi foydalanuvchi — standart) yoki 'login'
window.showAuthGate = function(mode) {
  const gate = document.getElementById("authGate");
  if (!gate) return;
  window.resetLoginErrors();
  window.resetSignupErrors();
  const steps = { login: "authLoginStep", signup: "authSignupFormStep", forgot: "authForgotStep", reset: "authResetStep" };
  const active = steps[mode] ? mode : 'signup';
  Object.entries(steps).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = key === active ? "block" : "none";
  });
  ['forgotResult', 'resetResult'].forEach(id => { const el = document.getElementById(id); if (el) { el.textContent = ''; el.className = 'auth-note'; } });
  gate.style.display = "flex";
  document.body.classList.add("auth-locked");
  window.updateAuthGateLanguage();
  const focusEl = document.getElementById({ login: "loginModalUsername", signup: "signupUsername", forgot: "forgotLogin", reset: "resetPassword" }[active]);
  if (focusEl) setTimeout(() => focusEl.focus(), 50);
};

window.hideAuthGate = function() {
  const gate = document.getElementById("authGate");
  if (gate) gate.style.display = "none";
  document.body.classList.remove("auth-locked");
};

window.updateAuthGateLanguage = function() {
  const btn = document.getElementById("authGateLangBtn");
  if (!btn || typeof window.getLanguageInfo !== 'function') return;
  const info = window.getLanguageInfo(window.currentLang);
  btn.textContent = `🌐 ${info.name}`;
};

window.togglePasswordVisibility = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  if (btn) btn.classList.toggle("visible", show);
};

// Eski nomlar (boshqa joylardan chaqiriladi) — endi kirish sahifasini ochadi/yopadi
window.openLoginModal = function() { window.showAuthGate('login'); };
window.openSignupModal = function() { window.showAuthGate('signup'); };
window.closeLoginModal = window.hideAuthGate;
window.closeSignupModal = window.hideAuthGate;
window.switchToSignUp = function() { window.showAuthGate('signup'); };

// --- Parolni tiklash ---
function setAuthNote(id, text, ok) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = 'auth-note ' + (ok ? 'ok' : 'err');
}

window.handleForgotPassword = async function() {
  const login = (document.getElementById("forgotLogin").value || '').trim();
  if (!login) { setAuthNote('forgotResult', tx('authForgotEmpty', "Foydalanuvchi nomi yoki emailni kiriting"), false); return; }
  const btn = document.getElementById("forgotSubmitBtn");
  if (btn) btn.disabled = true;
  try {
    const d = await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login }) }).then(r => r.json());
    setAuthNote('forgotResult', tServer(d.message) || tx('errGeneric', 'Xatolik yuz berdi!'), !!d.success);
  } catch (e) {
    setAuthNote('forgotResult', tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"), false);
  } finally {
    if (btn) btn.disabled = false;
  }
};

window.handleResetPassword = async function() {
  // Kirish va ro'yxatdan o'tishda parol trim qilinadi — bu yerda ham xuddi shunday
  const p1 = document.getElementById("resetPassword").value.trim();
  const p2 = document.getElementById("resetPassword2").value.trim();
  if (!p1 || p1.length < 6) { setAuthNote('resetResult', tx('authPasswordMinError', "Parol kamida 6 ta belgidan iborat bo'lishi kerak"), false); return; }
  if (p1 !== p2) { setAuthNote('resetResult', tx('authPasswordMismatch', 'Parollar bir xil emas'), false); return; }
  try {
    const d = await fetch('/api/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: window.pendingResetToken, password: p1 }) }).then(r => r.json());
    if (!d.success) { setAuthNote('resetResult', tServer(d.message) || tx('errGeneric', 'Xatolik yuz berdi!'), false); return; }
    window.pendingResetToken = null;
    showToast(tServer(d.message), 'success', 5000);
    if (window.currentUser) window.hideAuthGate(); else window.showAuthGate('login');
  } catch (e) {
    setAuthNote('resetResult', tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"), false);
  }
};

// Emaildagi havola: /?reset=<token>
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('reset');
  if (!token) return;
  window.pendingResetToken = token;
  params.delete('reset');
  history.replaceState(null, '', window.location.pathname + (params.toString() ? '?' + params : ''));
  setTimeout(() => window.showAuthGate('reset'), 300);
});

// Profil: parolni tiklash uchun email
window.editProfileEmail = async function() {
  if (!window.currentUser) return;
  const current = window.currentUser.email && !/@justchess\.local$/i.test(window.currentUser.email) ? window.currentUser.email : '';
  const email = prompt(tx('profEmailPrompt', "Emailingizni kiriting (parolni unutsangiz tiklash havolasi shu manzilga yuboriladi):"), current);
  if (email === null) return;
  const value = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { alert(tx('authEmailInvalid', "Email manzili noto'g'ri")); return; }
  try {
    const d = await fetch('/api/users/me/email', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + window.authToken }, body: JSON.stringify({ email: value }) }).then(r => r.json());
    if (!d.success) { alert(tServer(d.message) || tx('errGeneric', 'Xatolik yuz berdi!')); return; }
    window.currentUser.email = d.email;
    localStorage.setItem("justChessCurrentUser", JSON.stringify(window.currentUser));
    window.renderProfileEmail();
    showToast(tx('profEmailSaved', 'Email saqlandi'), 'success');
  } catch (e) {
    alert(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"));
  }
};

// Profil rasmini yuklash: markazdan kvadrat qirqib 256×256 JPEG ga kichraytiramiz
window.handleAvatarFile = function(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file || !window.currentUser) return;
  if (!/^image\//.test(file.type)) { showToast(tx('avatarBadType', "Faqat rasm faylini tanlang"), 'warning'); return; }
  if (file.size > 15 * 1024 * 1024) { showToast(tx('avatarTooBig', "Rasm juda katta (15 MB dan oshmasin)"), 'warning'); return; }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = async () => {
    URL.revokeObjectURL(url);
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    let data = canvas.toDataURL('image/jpeg', 0.86);
    if (data.length > 250000) data = canvas.toDataURL('image/jpeg', 0.7);
    try {
      const d = await fetch('/api/users/me/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + window.authToken },
        body: JSON.stringify({ image: data })
      }).then(r => r.json());
      if (!d.success) { showToast(tServer(d.message) || tx('errGeneric', 'Xatolik yuz berdi!'), 'warning'); return; }
      window.currentUser.avatarVersion = d.avatarVersion;
      localStorage.setItem("justChessCurrentUser", JSON.stringify(window.currentUser));
      window.refreshMyAvatar();
      showToast(tx('avatarSaved', 'Profil rasmi yangilandi'), 'success');
    } catch (e) {
      showToast(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"), 'warning');
    }
  };
  img.onerror = () => { URL.revokeObjectURL(url); showToast(tx('avatarBadType', "Faqat rasm faylini tanlang"), 'warning'); };
  img.src = url;
};

window.removeAvatar = async function() {
  if (!window.currentUser || !confirm(tx('avatarRemoveConfirm', "Profil rasmini o'chirasizmi?"))) return;
  try {
    const d = await fetch('/api/users/me/avatar', { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + window.authToken } }).then(r => r.json());
    if (!d.success) return;
    window.currentUser.avatarVersion = null;
    localStorage.setItem("justChessCurrentUser", JSON.stringify(window.currentUser));
    window.refreshMyAvatar();
  } catch (e) {
    showToast(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"), 'warning');
  }
};

// O'z rasmimiz o'zgarganda ko'rinib turgan joylarni yangilash
window.refreshMyAvatar = function() {
  window.updateAuthHeaderUI();
  const modal = document.getElementById("profileModal");
  if (modal && modal.style.display === "flex" && !window.viewedProfileUsername) {
    window.renderProfileCommon({ ...window.currentUser });
    if (typeof updateProfileModalData === "function") updateProfileModalData();
  }
};

window.renderProfileEmail = function() {
  const el = document.getElementById("profileEmailText");
  if (!el || !window.currentUser) return;
  const email = window.currentUser.email;
  const real = email && !/@justchess\.local$/i.test(email);
  el.textContent = real ? email : tx('profEmailNone', 'Biriktirilmagan');
  el.title = real ? email : '';
  el.classList.toggle('muted', !real);
};
window.switchToLogin = function() { window.showAuthGate('login'); };

window.resetLoginErrors = function() {
  const errorIds = ["loginUsernameError", "loginPasswordError", "loginGeneralError"];
  errorIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
};

window.resetSignupErrors = function() {
  const errorIds = ["signupUsernameError", "signupUsernameExistsError", "signupPasswordError", "signupEmailError"];
  errorIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  const inputs = [
    document.getElementById("signupUsername"),
    document.getElementById("signupPassword")
  ];
  inputs.forEach(input => {
    if (input) input.style.borderColor = "";
  });
};

/// --- Login handler ---
window.handleLoginModal = async function() {
  const username = document.getElementById("loginModalUsername").value.trim();
  const password = document.getElementById("loginModalPassword").value.trim();

  const usernameError = document.getElementById("loginUsernameError");
  const passwordError = document.getElementById("loginPasswordError");
  const generalError = document.getElementById("loginGeneralError");

  let valid = true;

  if (!username) {
    if (usernameError) usernameError.style.display = "block";
    valid = false;
  } else {
    if (usernameError) usernameError.style.display = "none";
  }

  if (!password) {
    if (passwordError) passwordError.style.display = "block";
    valid = false;
  } else {
    if (passwordError) passwordError.style.display = "none";
  }

  if (!valid) return;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (data.success) {
      window.applyAuthSession(data.user, data.token);
      window.closeLoginModal();
      window.updateAuthHeaderUI();
      window.switchView("home");
      if (typeof window.updateStatsDisplay === "function") window.updateStatsDisplay();
    } else if (generalError) {
      // 401 — ism/parol xato; boshqa holatlarda (juda ko'p urinish, server xatosi) serverning o'z xabari
      generalError.textContent = response.status === 401
        ? tx('wrongCredentials', 'Ism yoki parol xato!')
        : (tServer(data.message) || tx('errGeneric', 'Xatolik yuz berdi!'));
      generalError.style.display = "block";
    }
  } catch {
    if (generalError) {
      generalError.textContent = tx('errServerUnreachable', "Serverga ulanib bo'lmadi!");
      generalError.style.display = "block";
    }
  }
};

// --- Signup handler ---
window.handleSignupModal = async function() {
  const username = document.getElementById("signupUsername").value.trim();
  const password = document.getElementById("signupPassword").value.trim();

  const usernameError = document.getElementById("signupUsernameError");
  const usernameExistsError = document.getElementById("signupUsernameExistsError");
  const passwordError = document.getElementById("signupPasswordError");

  let valid = true;

  // Username required (server: 3-30 belgi)
  if (!username || username.length < 3 || username.length > 30) {
    if (usernameError) usernameError.style.display = "block";
    valid = false;
  } else {
    if (usernameError) usernameError.style.display = "none";
  }
  if (usernameExistsError) usernameExistsError.style.display = "none";

  // Password min 6 chars
  if (!password || password.length < 6) {
    if (passwordError) passwordError.style.display = "block";
    valid = false;
  } else {
    if (passwordError) passwordError.style.display = "none";
  }

  const signupEmailEl = document.getElementById("signupEmail");
  const signupEmail = signupEmailEl ? signupEmailEl.value.trim() : '';
  const signupEmailError = document.getElementById("signupEmailError");
  if (signupEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) {
    if (signupEmailError) signupEmailError.style.display = "block";
    valid = false;
  } else if (signupEmailError) {
    signupEmailError.style.display = "none";
  }

  if (!valid) return;

  try {
    // Email ixtiyoriy — kiritilmasa server talab qilgani uchun username asosida yaratiladi
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email: signupEmail || username.toLowerCase() + '@justchess.local', password })
    });
    const data = await response.json();
    if (!data.success) {
      if (response.status === 409) {
        if (usernameExistsError) usernameExistsError.style.display = "block";
      } else {
        alert(tServer(data.message) || tx('errSignupFailed', "Ro'yxatdan o'tib bo'lmadi!"));
      }
      return;
    }
    window.applyAuthSession(data.user, data.token);
  } catch {
    alert(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"));
    return;
  }

  window.closeSignupModal();
  window.updateAuthHeaderUI();
  window.switchView("home");
  if (typeof window.updateStatsDisplay === "function") window.updateStatsDisplay();
};

window.openLanguageModal = function() {
  const modal = document.getElementById("languageModal");
  if (modal) {
    modal.style.display = "flex";
    renderLanguageCards();
  }
};

window.closeLanguageModal = function() {
  const modal = document.getElementById("languageModal");
  if (modal) {
    modal.style.display = "none";
  }
};

window.LANGUAGES = [
  { code: 'UZ', name: "O'zbekcha", english: 'Uzbek', flag: '🇺🇿' },
  { code: 'EN', name: 'English', english: 'English', flag: '🇬🇧' },
  { code: 'RU', name: 'Русский', english: 'Russian', flag: '🇷🇺' },
  { code: 'ES', name: 'Español', english: 'Spanish', flag: '🇪🇸' },
  { code: 'DE', name: 'Deutsch', english: 'German', flag: '🇩🇪' },
  { code: 'FR', name: 'Français', english: 'French', flag: '🇫🇷' }
];

// --- Leagues Data ---
window.CONTINENTS = {
  Asia: { name: "Osiyo Ligasi", flag: "🌏", color: "#e74c3c" },
  Europe: { name: "Yevropa Ligasi", flag: "🌍", color: "#3498db" },
  Africa: { name: "Afrika Ligasi", flag: "🌍", color: "#f39c12" },
  "South America": { name: "Janubiy Amerika Ligasi", flag: "🌎", color: "#2ecc71" },
  "North America": { name: "Shimoliy Amerika Ligasi", flag: "🌎", color: "#9b59b6" },
  Oceania: { name: "Okeaniya Ligasi", flag: "🌏", color: "#1abc9c" }
};

window.LEAGUE_I18N_KEYS = {
  "Asia": "leagueAsia",
  "Europe": "leagueEurope",
  "Africa": "leagueAfrica",
  "South America": "leagueSouthAmerica",
  "North America": "leagueNorthAmerica",
  "Oceania": "leagueOceania"
};

window.getLeagueI18nName = function(leagueKey, fallbackName) {
  const i18nKey = window.LEAGUE_I18N_KEYS[leagueKey];
  if (i18nKey && typeof i18next !== 'undefined' && i18next.isInitialized) {
    return i18next.t(i18nKey, { defaultValue: fallbackName });
  }
  return fallbackName;
};

// Ligalar va Chempionlar ligasi sahifalari — leagues.js (server: league.js)

window.getLanguageInfo = function(code) {
  return window.LANGUAGES.find(l => l.code.toLowerCase() === code.toLowerCase()) || window.LANGUAGES[1];
};

window.updateLanguageButton = function(lang) {
  const info = window.getLanguageInfo(lang);
  const settingsBtn = document.getElementById("settingsLanguageBtn");
  if (settingsBtn) {
    settingsBtn.textContent = `${info.flag} ${info.name}`;
    settingsBtn.classList.add("saved");
  }
};

window.selectLanguage = function(lang) {
  const langLower = lang.toLowerCase();
  const langMap = { 'gb': 'en', 'us': 'en', 'uk': 'en' };
  const mappedLang = langMap[langLower] || langLower;
  window.setLanguage(mappedLang);
  localStorage.setItem("justChessLang", mappedLang);
  window.updateLanguageButton(mappedLang);
  window.closeLanguageModal();
};

window.renderLanguageCards = function(filter = '') {
  const grid = document.getElementById("languageGrid");
  if (!grid) return;

  const languages = window.LANGUAGES;

  const currentLang = (window.currentLang || localStorage.getItem("justChessLang") || 'en').toUpperCase();

  grid.innerHTML = languages
    .filter(lang =>
      lang.name.toLowerCase().includes(filter.toLowerCase()) ||
      lang.english.toLowerCase().includes(filter.toLowerCase()) ||
      lang.code.toLowerCase().includes(filter.toLowerCase())
    )
    .map(lang => {
      const isActive = lang.code.toUpperCase() === currentLang;
      return `
        <div class="language-card ${isActive ? 'active' : ''}" onclick="selectLanguage('${lang.code.toLowerCase()}')">
          <span class="language-card-check">✓</span>
          <div class="language-card-flag">${lang.flag}</div>
          <div class="language-card-code">${lang.code}</div>
          <div class="language-card-name">${lang.name}</div>
          <div class="language-card-english">${lang.english}</div>
        </div>
      `;
    }).join('');
};

// Davlat kodi bo'yicha (tarjima qilingan) davlat nomi
function countryNameByCode(code) {
  if (!code || typeof allCountries === 'undefined') return '';
  const found = allCountries.find(c => c.code === code);
  if (!found) return '';
  return (typeof window.countryName === 'function') ? window.countryName(found.name, found.code) : found.name;
}

// Profil sahifasining umumiy qismini chizish (o'zimiz ham, boshqa o'yinchi ham)
// p: { username, country, countryName, club, rating, ratingsByMode, stats, statsByMode, createdAt }
window.renderProfileCommon = function(p) {
  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const username = p.username || '';
  setText("profileModalUsername", username);
  setText("profileAvatarLetter", (username || "?").charAt(0).toUpperCase());
  const avatarEl = document.getElementById("profileAvatarLetter");
  const isMe = window.currentUser && username === window.currentUser.username;
  const avatarVersion = isMe ? (window.currentUser.avatarVersion || null) : (p.avatarVersion === undefined ? null : p.avatarVersion);
  if (avatarEl && username) avatarEl.insertAdjacentHTML('beforeend', window.avatarOverlay(username, avatarVersion));
  const removeBtn = document.getElementById("avatarRemoveBtn");
  if (removeBtn) {
    removeBtn.style.display = isMe && avatarVersion ? '' : 'none';
    removeBtn.title = removeBtn.ariaLabel = tx('avatarRemove', "Rasmni o'chirish");
  }
  const editBtn = document.getElementById("avatarEditBtn");
  if (editBtn) editBtn.title = editBtn.ariaLabel = tx('avatarChange', "Rasm qo'yish");
  setText("profileModalHandle", username ? "@" + username : "");
  if (typeof window.renderProfilePresence === "function") window.renderProfilePresence(p);

  const countryCode = (p.country || '').toLowerCase();
  const countryName = p.countryName || countryNameByCode(countryCode);
  const countryWrapEl = document.getElementById("profileModalCountry");
  const countryFlagEl = document.getElementById("profileModalCountryFlag");
  if (countryWrapEl) countryWrapEl.style.display = (countryName && countryCode) ? 'flex' : 'none';
  if (countryFlagEl && countryCode) countryFlagEl.src = `https://flagcdn.com/w20/${countryCode}.png`;
  setText("profileModalCountryName", countryName);

  const joinedEl = document.getElementById("profileJoined");
  if (joinedEl) {
    const d = p.createdAt ? new Date(p.createdAt) : null;
    joinedEl.style.display = d && !isNaN(d) ? 'block' : 'none';
    if (d && !isNaN(d)) joinedEl.textContent = tx('profJoined', "{{date}} dan beri a'zo", { date: d.toLocaleDateString() });
  }

  // Klub — serverdagi a'zolik (o'yinchi faqat bitta klubda)
  const club = p.club || null;
  const clubName = club ? ((typeof window.countryName === 'function') ? window.countryName(club.name, club.code) : club.name) : '';
  const clubChip = document.getElementById("profileClubChip");
  if (clubChip) clubChip.style.display = club ? 'inline-flex' : 'none';
  setText("profileClubChipName", clubName);
  const clubChipFlag = document.getElementById("profileClubChipFlag");
  if (clubChipFlag && club && club.code) clubChipFlag.src = `https://flagcdn.com/w40/${club.code}.png`;
  setText("statClub", clubName || tx('profNoClub', "Klubga a'zo emas"));
  const inputClub = document.getElementById("inputClub");
  if (inputClub) inputClub.value = clubName;

  // Rejim reytinglari va o'yinlar soni
  const ratingsByMode = p.ratingsByMode || {};
  const baseRating = p.rating || 1500;
  const byMode = p.statsByMode || {};
  const gamesOf = (s) => s ? (s.wins || 0) + (s.losses || 0) + (s.draws || 0) : 0;
  ['rapid', 'blitz', 'bullet'].forEach(mode => {
    const cap = mode.charAt(0).toUpperCase() + mode.slice(1);
    const rating = ratingsByMode[mode] || baseRating;
    setText('stat' + cap, rating);
    const input = document.getElementById('input' + cap);
    if (input) input.value = rating;
    setText('stat' + cap + 'Games', tx('profModeGames', "{{count}} ta o'yin", { count: gamesOf(byMode[mode]) }));
  });

  // Umumiy natijalar
  const totals = p.stats || { wins: 0, losses: 0, draws: 0 };
  const total = gamesOf(totals);
  const pct = (n) => total ? Math.round(((n || 0) / total) * 1000) / 10 : 0;
  setText("profTotalGames", total);
  setText("profWinsCount", totals.wins || 0);
  setText("profDrawsCount", totals.draws || 0);
  setText("profLossesCount", totals.losses || 0);
  setText("profWinRate", pct(totals.wins) + '%');
  [["profBarWin", totals.wins], ["profBarDraw", totals.draws], ["profBarLoss", totals.losses]].forEach(([id, n]) => {
    const el = document.getElementById(id);
    if (el) el.style.width = pct(n) + '%';
  });
};

// Oxirgi o'yinlar ro'yxati (games === null — yuklanmoqda)
window.renderRecentGames = function(games) {
  const container = document.getElementById("profRecentGames");
  if (!container) return;
  if (games === null) {
    container.innerHTML = `<div class="profile-games-empty">${escapeHtmlSafe(tx('loadingText', 'Yuklanmoqda...'))}</div>`;
    return;
  }
  if (!games || games.length === 0) {
    container.innerHTML = `<div class="profile-games-empty">${escapeHtmlSafe(tx('profNoGames', "Hali o'yinlar yo'q"))}</div>`;
    return;
  }
  const labels = {
    win: tx('profWinsLabel', "G'alaba"),
    loss: tx('profLossesLabel', "Mag'lubiyat"),
    draw: tx('profDrawsLabel', 'Durrang')
  };
  const isUsername = (s) => typeof s === 'string' && /^[\p{L}\p{N}_.-]{3,30}$/u.test(s) && s !== 'Online';
  container.innerHTML = games.map(g => {
    const result = ['win', 'loss', 'draw'].includes(g.result) ? g.result : 'draw';
    const opponent = g.opponent || '—';
    const opponentHtml = isUsername(opponent)
      ? `<span class="player-link" data-username="${escapeHtmlSafe(opponent)}">${escapeHtmlSafe(opponent)}</span>`
      : escapeHtmlSafe(opponent);
    const d = g.date ? new Date(g.date) : null;
    const date = d && !isNaN(d) ? d.toLocaleDateString() : '';
    const replayable = g.id && g.hasMoves;
    return `
      <div class="profile-game-row${replayable ? ' replayable' : ''}"${replayable ? ` data-replay="${escapeHtmlSafe(g.id)}" title="${escapeHtmlSafe(tx('rpWatchGame', "O'yinni ko'rish"))}"` : ''}>
        <span class="profile-game-result ${result}">${escapeHtmlSafe(labels[result])}</span>
        <span class="profile-game-opponent"><small>vs</small>${opponentHtml}</span>
        <span class="profile-game-mode">${escapeHtmlSafe(g.timeControl || '')}</span>
        <span class="profile-game-date">${escapeHtmlSafe(date)}${replayable ? ' <i class="rp-play">▶</i>' : ''}</span>
      </div>`;
  }).join('');
  if (!container.dataset.replayBound) {
    container.dataset.replayBound = '1';
    container.addEventListener('click', (e) => {
      if (e.target.closest('.player-link')) return;
      const row = e.target.closest('[data-replay]');
      if (!row || typeof window.openReplay !== 'function') return;
      const owner = window.viewedProfileUsername || (window.currentUser && window.currentUser.username);
      window.openReplay(owner, row.dataset.replay);
    });
  }
};

function escapeHtmlSafe(value) {
  const div = document.createElement('div');
  div.textContent = (value === null || value === undefined) ? '' : String(value);
  return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Serverdan ommaviy profilni olish
function fetchPublicProfile(username) {
  return fetch('/api/users/' + encodeURIComponent(username) + '/profile').then(res => res.json());
}

window.updateProfileModalData = function() {
  if (!window.currentUser) return;
  // Boshqa o'yinchi profili ochiq bo'lsa, uni o'zimizniki bilan almashtirmaymiz
  if (window.viewedProfileUsername) return;

  window.renderProfileCommon({
    ...window.currentUser,
    stats: window.currentUser.stats || window.stats,
    statsByMode: window.currentUser.statsByMode || window.statsByMode,
    createdAt: window.currentUser.createdAt || window.currentUser.created_at || null
  });

  // Faqat o'zimizga tegishli (brauzerda saqlanadigan) maydonlar
  const profileData = JSON.parse(localStorage.getItem("justChessProfileData")) || {};
  const fideId = profileData.fideId || '';
  const goal = profileData.goal || '';
  const debut = profileData.debut || '';
  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const setValue = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  setText("profileFideId", fideId);
  if (typeof window.renderProfileEmail === "function") window.renderProfileEmail();
  setText("profileGoal", goal);
  setText("statDebut", debut);
  setValue("inputFideId", fideId);
  setValue("inputGoal", goal);
  setValue("inputDebut", debut);
};

// Istalgan o'yinchining profilini ochish (o'zimizniki bo'lsa — tahrirlanadigan profil)
window.openPlayerProfile = async function(username) {
  if (!username) return;
  if (window.currentUser && window.currentUser.username === username) {
    window.openProfileModal();
    return;
  }
  const modal = document.getElementById("profileModal");
  if (!modal) return;
  window.viewedProfileUsername = username;
  if (typeof window.setProfileEditMode === 'function') window.setProfileEditMode(false);
  modal.classList.add("viewing-other");
  const friendBtn = document.getElementById("profileFriendBtn");
  if (friendBtn) {
    friendBtn.style.display = window.currentUser ? 'flex' : 'none';
    if (window.currentUser) window.loadFriendButton(username);
  }
  const messageBtn = document.getElementById("profileMessageBtn");
  if (messageBtn) messageBtn.style.display = window.currentUser ? 'flex' : 'none';
  const challengeBtn = document.getElementById("profileChallengeBtn");
  if (challengeBtn) challengeBtn.style.display = window.currentUser ? 'flex' : 'none';
  const modActions = document.getElementById("profileModActions");
  if (modActions) modActions.style.display = window.currentUser ? 'grid' : 'none';
  window.profileBlocked = false;
  if (typeof window.renderBlockButton === "function") window.renderBlockButton();
  window.renderProfileCommon({ username });
  window.renderRecentGames(null); if (typeof window.renderRatingChart === "function") window.renderRatingChart(null);
  modal.style.display = "flex";
  try {
    const data = await fetchPublicProfile(username);
    if (window.viewedProfileUsername !== username) return;
    if (!data.success) {
      showToast(tServer(data.message) || tx('errGeneric', 'Xatolik yuz berdi!'), 'error');
      window.closeProfileModal();
      return;
    }
    window.renderProfileCommon(data.profile);
    window.renderRecentGames(data.profile.recentGames); if (typeof window.renderRatingChart === "function") window.renderRatingChart(data.profile);
  } catch (err) {
    console.error('Profilni yuklash xatoligi:', err);
    showToast(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"), 'error');
    window.closeProfileModal();
  }
};

// --- Profildagi do'stlik tugmasi: holatga qarab (so'rash / so'rovni bekor qilish / qabul qilish / do'stlikni bekor qilish) ---
window.profileFriendState = { username: null, status: 'none', requestId: null };

window.renderFriendButton = function() {
  const btn = document.getElementById("profileFriendBtn");
  if (!btn) return;
  const label = btn.querySelector('span');
  const s = window.profileFriendState.status;
  const texts = {
    none: tx('btnSendFriendRequest', "Do'stlik so'rash"),
    outgoing: tx('friendCancelRequest', "So'rovni bekor qilish"),
    incoming: tx('friendAcceptRequest', "So'rovni qabul qilish"),
    friends: tx('friendRemove', "Do'stlikni bekor qilish"),
    loading: '…'
  };
  if (label) { label.removeAttribute('data-i18n'); label.textContent = texts[s] || texts.none; }
  btn.dataset.state = s;
  btn.disabled = s === 'loading';
};

window.loadFriendButton = async function(username) {
  window.profileFriendState = { username, status: 'loading', requestId: null };
  window.renderFriendButton();
  try {
    const d = await fetch('/api/friends/status/' + encodeURIComponent(username), { headers: { 'Authorization': `Bearer ${window.authToken}` } }).then(r => r.json());
    if (window.viewedProfileUsername !== username) return;
    window.profileFriendState = { username, status: d.success ? d.status : 'none', requestId: d.requestId || null };
    window.profileBlocked = !!(d && d.blockedByMe);
    if (typeof window.renderBlockButton === 'function') window.renderBlockButton();
  } catch (e) {
    window.profileFriendState = { username, status: 'none', requestId: null };
  }
  window.renderFriendButton();
};

window.sendFriendRequestTo = async function(username) {
  if (!username || !window.authToken) return;
  const st = window.profileFriendState;
  const status = st.username === username ? st.status : 'none';
  if (status === 'friends' && !confirm(tx('friendRemoveConfirm', "{{name}} bilan do'stlikni bekor qilasizmi?", { name: username }))) return;
  const action = { none: ['/api/friends/request', { username }], outgoing: ['/api/friends/cancel', { username }], incoming: ['/api/friends/accept', { requestId: st.requestId }], friends: ['/api/friends/remove', { username }] }[status];
  if (!action) return;
  window.profileFriendState = { ...st, status: 'loading' };
  window.renderFriendButton();
  try {
    const data = await fetch(action[0], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.authToken}` },
      body: JSON.stringify(action[1])
    }).then(res => res.json());
    if (data.success) {
      const done = {
        none: tx('friendRequestSentTo', "{{name}} ga do'stlik so'rovi yuborildi", { name: username }),
        outgoing: tx('friendRequestCancelled', "So'rov bekor qilindi"),
        incoming: tx('friendNowFriends', "Endi siz {{name}} bilan do'stsiz", { name: username }),
        friends: tx('friendRemoved', "Do'stlik bekor qilindi")
      }[status];
      showToast(done, status === 'friends' || status === 'outgoing' ? 'info' : 'success');
      if (typeof window.refreshMessagesBadge === 'function') window.refreshMessagesBadge();
    } else {
      showToast(tServer(data.message) || tx('errGeneric', 'Xatolik yuz berdi!'), 'warning');
    }
  } catch (err) {
    showToast(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"), 'error');
  }
  window.loadFriendButton(username);
};

// Username ustiga bosilganda — o'sha o'yinchining profili
document.addEventListener("click", (e) => {
  const link = e.target.closest && e.target.closest(".player-link[data-username]");
  if (!link) return;
  e.preventDefault();
  e.stopPropagation();
  window.openPlayerProfile(link.dataset.username);
}, true);

// Havola orqali kirish: /?profile=ism
window.openProfileFromUrl = function() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('profile');
  if (!name || !window.currentUser) return;
  window.history.replaceState(null, '', window.location.pathname);
  window.openPlayerProfile(name);
};

window.setProfileEditMode = function(enabled) {
  const metaRows = document.querySelectorAll('.profile-meta-box .meta-row');
  metaRows.forEach(row => {
    const textSpan = row.querySelector('.editable-text');
    const input = row.querySelector('.editable-input');
    if (textSpan && input) {
      textSpan.style.display = enabled ? 'none' : 'inline';
      input.style.display = enabled ? 'inline' : 'none';
    }
  });

  const statCards = document.querySelectorAll('.editable-card');
  statCards.forEach(card => {
    if (card.classList.contains('rating-readonly')) return;
    const textSpan = card.querySelector('.editable-text');
    const input = card.querySelector('.editable-input');
    if (textSpan && input) {
      textSpan.style.display = enabled ? 'none' : 'block';
      input.style.display = enabled ? 'block' : 'none';
    }
  });

  const editBtn = document.getElementById("editProfileBtn");
  const saveBtn = document.getElementById("saveProfileBtn");
  const cancelBtn = document.getElementById("cancelProfileBtn");

  if (editBtn) editBtn.style.display = enabled ? 'none' : 'inline-block';
  if (saveBtn) saveBtn.style.display = enabled ? 'inline-block' : 'none';
  if (cancelBtn) cancelBtn.style.display = enabled ? 'inline-block' : 'none';
};

window.saveProfileData = function() {
  const profileData = {
    fideId: (document.getElementById("inputFideId")?.value || '').trim(),
    goal: (document.getElementById("inputGoal")?.value || '').trim(),
    debut: (document.getElementById("inputDebut")?.value || '').trim(),
    club: (document.getElementById("inputClub")?.value || '').trim()
  };

  localStorage.setItem("justChessProfileData", JSON.stringify(profileData));
  window.updateProfileModalData();
  window.setProfileEditMode(false);
  showToast(tx('profileSaved', "Ma'lumotlar saqlandi"), "success");
};

window.populateSettingsCountries = function() {
  const country = document.getElementById("settingsCountry");
  if (!country) return;
  if (typeof allCountries === 'undefined' || !allCountries.length) return;

  const keep = country.value;
  const saved = JSON.parse(localStorage.getItem("justChessSettings") || "{}");

  const fragment = document.createDocumentFragment();
  allCountries.forEach(c => {
    const option = document.createElement("option");
    option.value = c.code;
    const displayName = (typeof window.countryName === 'function')
      ? window.countryName(c.name, c.code)
      : c.name;
    option.textContent = c.code.toUpperCase() + " " + displayName;
    fragment.appendChild(option);
  });

  country.innerHTML = "";
  country.appendChild(fragment);
  country.value = keep || saved.country || "uz";
};

// --- Sayt rangi va koordinatalar (Sozlamalar → Dizayn) ---
window.SITE_THEMES = ['turquoise', 'ocean', 'amethyst', 'sunset'];

window.applySiteTheme = function(theme) {
  const name = window.SITE_THEMES.includes(theme) ? theme : 'turquoise';
  document.documentElement.setAttribute('data-theme', name);
  document.querySelectorAll('[data-theme-option]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeOption === name);
  });
  return name;
};

window.applyCoords = function(show) {
  document.documentElement.classList.toggle('hide-coords', show === false);
};

// Sozlamalar sahifasidagi o'zgarishlar "Saqlash" bosilmaguncha faqat oldindan ko'rish uchun qo'llanadi
window.settingsDirty = false;

window.markSettingsDirty = function(dirty) {
  window.settingsDirty = dirty !== false;
  const note = document.getElementById("settingsUnsavedNote");
  if (note) note.hidden = !window.settingsDirty;
};

window.selectSiteTheme = function(theme) {
  window.applySiteTheme(theme);
  window.markSettingsDirty();
};

// Saqlangan qiymatlarni qayta qo'llash (saqlanmagan o'zgarishlarni bekor qilish)
window.applySavedSettings = function() {
  const saved = JSON.parse(localStorage.getItem("justChessSettings") || "{}");
  window.applySiteTheme(saved.siteTheme || "turquoise");
  window.applyCoords(saved.showCoords !== false);
  if (typeof window.applySavedSound === "function") window.applySavedSound();
};

window.discardSettingsChanges = function() {
  if (!window.settingsDirty) return;
  window.applySavedSettings();
  window.markSettingsDirty(false);
  showToast(tx('settingsDiscarded', "Saqlanmagan o'zgarishlar bekor qilindi"), "info");
};

window.updateSettingsView = function() {
  const saved = JSON.parse(localStorage.getItem("justChessSettings") || "{}");
  const country = document.getElementById("settingsCountry");
  const lang = document.getElementById("settingsLanguage");
  const sound = document.getElementById("settingsSound");
  const volume = document.getElementById("settingsVolume");
  const coords = document.getElementById("settingsCoords");
  if (country) {
    window.populateSettingsCountries();
    country.value = saved.country || country.value || "uz";
  }
  if (lang) lang.value = saved.language || "en";
  if (sound) sound.checked = saved.soundEnabled !== false;
  if (volume) volume.value = Math.round((saved.volume || 0.8) * 100);
  if (coords) coords.checked = saved.showCoords !== false;
  window.applySavedSettings();
  window.markSettingsDirty(false);
  const volVal = document.getElementById("settingsVolumeVal");
  if (volVal && volume) volVal.textContent = volume.value + "%";
};

window.saveSettings = function() {
  const tSettings = (key, fallback) =>
    (typeof i18next !== 'undefined' && i18next.isInitialized)
      ? i18next.t(key, { defaultValue: fallback })
      : fallback;
  const saved = {
    country: (document.getElementById("settingsCountry")?.value || "uz"),
    language: (document.getElementById("settingsLanguage")?.value || "uz"),
    soundEnabled: document.getElementById("settingsSound")?.checked !== false,
    volume: (parseInt(document.getElementById("settingsVolume")?.value || "80") / 100),
    siteTheme: document.documentElement.getAttribute("data-theme") || "turquoise",
    showCoords: document.getElementById("settingsCoords")?.checked !== false
  };
  localStorage.setItem("justChessSettings", JSON.stringify(saved));
  window.markSettingsDirty(false);
  window.syncMyCountry(saved.country);
  showToast(tSettings('settingsSavedToast', "Sozlamalar saqlandi"), "success");
};

// Tanlangan davlatni joriy foydalanuvchiga va serverga yozish (raqib bayrog'ingizni ko'rishi uchun)
window.syncMyCountry = function(country) {
  if (!country || !window.currentUser) return;
  window.currentUser.country = country;
  if (typeof allCountries !== 'undefined') {
    const found = allCountries.find(c => c.code === country);
    if (found) window.currentUser.countryName = found.name;
  }
  localStorage.setItem("justChessCurrentUser", JSON.stringify(window.currentUser));
  if (typeof window.updateGameFlags === 'function') window.updateGameFlags();
  if (window.authToken) {
    fetch('/api/users/me/country', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.authToken}` },
      body: JSON.stringify({ country })
    }).catch(err => console.error('Davlatni saqlash xatoligi:', err));
  }
};

window.resetSettings = function() {
  const tSettings = (key, fallback) =>
    (typeof i18next !== 'undefined' && i18next.isInitialized)
      ? i18next.t(key, { defaultValue: fallback })
      : fallback;
  const sound = document.getElementById("settingsSound");
  const volume = document.getElementById("settingsVolume");
  const volVal = document.getElementById("settingsVolumeVal");
  const coords = document.getElementById("settingsCoords");
  if (sound) sound.checked = true;
  if (volume) volume.value = 80;
  if (volVal) volVal.textContent = "80%";
  if (coords) coords.checked = true;
  window.applySiteTheme("turquoise");
  window.applyCoords(true);
  if (typeof window.applySoundToggle === "function") window.applySoundToggle(true);
  if (typeof window.setSoundVolume === "function") window.setSoundVolume(0.8);
  window.markSettingsDirty();
  showToast(tSettings('settingsResetPending', "Standart qiymatlar qo'yildi — saqlash uchun «Saqlash» tugmasini bosing"), "info", 5000);
};

  const coordsEl = document.getElementById("settingsCoords");
  if (coordsEl) {
    coordsEl.addEventListener("change", function() {
      window.applyCoords(this.checked);
      window.markSettingsDirty();
    });
  }
  const soundEl = document.getElementById("settingsSound");
  if (soundEl) {
    soundEl.addEventListener("change", function() {
      if (typeof window.applySoundToggle === "function") window.applySoundToggle(this.checked);
      window.markSettingsDirty();
    });
  }
  const volEl = document.getElementById("settingsVolume");
  const volVal = document.getElementById("settingsVolumeVal");
  if (volEl && volVal) {
    volEl.addEventListener("input", function() {
      volVal.textContent = this.value + "%";
      if (typeof window.setSoundVolume === "function") window.setSoundVolume(this.value / 100);
      window.markSettingsDirty();
    });
  }
  const countrySel = document.getElementById("settingsCountry");
  if (countrySel) countrySel.addEventListener("change", () => window.markSettingsDirty());

  document.addEventListener("DOMContentLoaded", () => {
  window.updateStreakUI();
  window.updateAuthHeaderUI();
  window.loadTopPlayers();
  window.setupHistoryFilters();

  // Profile Modal
  const profileModal = document.getElementById("profileModal");
  const closeProfileBtn = document.getElementById("closeProfileBtn");
  const copyProfileLinkBtn = document.getElementById("copyProfileLinkBtn");

  if (closeProfileBtn && profileModal) {
    closeProfileBtn.addEventListener("click", () => {
      window.closeProfileModal();
    });
  }

  if (copyProfileLinkBtn && profileModal) {
    copyProfileLinkBtn.addEventListener("click", () => {
      const name = window.viewedProfileUsername || (window.currentUser ? window.currentUser.username : "");
      const profileUrl = window.location.origin + "/?profile=" + encodeURIComponent(name);
      navigator.clipboard.writeText(profileUrl).then(() => {
        showToast(tx('profileLinkCopied', 'Profil havolasi nusxalandi'), "success");
      }).catch(() => {
        showToast(tx('copyFailed', 'Nusxalashda xatolik yuz berdi'), "error");
      });
    });
  }

  if (profileModal) {
    profileModal.addEventListener("click", (e) => {
      if (e.target === profileModal) {
        profileModal.style.display = "none";
      }
    });
  }

  // Info Modal
  const infoModal = document.getElementById("infoModal");
  const closeInfoModalBtn = document.getElementById("closeInfoModal");

  if (closeInfoModalBtn && infoModal) {
    closeInfoModalBtn.addEventListener("click", () => {
      window.closeInfoModal();
    });
  }

  if (infoModal) {
    infoModal.addEventListener("click", (e) => {
      if (e.target === infoModal) {
        window.closeInfoModal();
      }
    });
  }

  // League Detail Modal
  const leagueDetailModal = document.getElementById("leagueDetailModal");
  const closeLeagueDetailBtn = document.getElementById("closeLeagueDetailBtn");

  if (closeLeagueDetailBtn && leagueDetailModal) {
    closeLeagueDetailBtn.addEventListener("click", () => {
      leagueDetailModal.style.display = "none";
    });
  }

  if (leagueDetailModal) {
    leagueDetailModal.addEventListener("click", (e) => {
      if (e.target === leagueDetailModal) {
        leagueDetailModal.style.display = "none";
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && profileModal && profileModal.style.display === "flex") {
      profileModal.style.display = "none";
    }
    if (e.key === "Escape" && infoModal && infoModal.style.display === "flex") {
      window.closeInfoModal();
    }
    if (e.key === "Escape" && languageModal && languageModal.style.display === "flex") {
      languageModal.style.display = "none";
    }
    if (e.key === "Escape" && leagueDetailModal && leagueDetailModal.style.display === "flex") {
      leagueDetailModal.style.display = "none";
    }
  });

  const editProfileBtn = document.getElementById("editProfileBtn");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const cancelProfileBtn = document.getElementById("cancelProfileBtn");

  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => window.setProfileEditMode(true));
  }
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", window.saveProfileData);
  }
  if (cancelProfileBtn) {
    cancelProfileBtn.addEventListener("click", () => {
      window.updateProfileModalData();
      window.setProfileEditMode(false);
    });
  }

  // Language Modal
  const languageModal = document.getElementById("languageModal");
  const closeLanguageBtn = document.getElementById("closeLanguageModal");
  const languageSearch = document.getElementById("languageSearch");

  if (closeLanguageBtn && languageModal) {
    closeLanguageBtn.addEventListener("click", () => {
      languageModal.style.display = "none";
    });
  }

  if (languageModal) {
    languageModal.addEventListener("click", (e) => {
      if (e.target === languageModal) {
        languageModal.style.display = "none";
      }
    });
  }

  if (languageSearch) {
    languageSearch.addEventListener("input", (e) => {
      window.renderLanguageCards(e.target.value);
    });
  }

  // Initialize language button
  if (typeof window.updateLanguageButton === "function") {
    window.updateLanguageButton(window.currentLang);
  }

  // Tizimga kirilmagan bo'lsa — avval ro'yxatdan o'tish sahifasi
  if (!window.currentUser) {
    window.showAuthGate('signup');
  } else {
    window.openProfileFromUrl();
  }
});

document.addEventListener("click", (event) => {
  const btn = event.target.closest("button, .btn, .menu-item");
  if (!btn) return;

  btn.classList.remove('animate__animated', 'animate__pulse');
  void btn.offsetWidth;
  btn.classList.add('animate__animated', 'animate__pulse');

  btn.addEventListener('animationend', () => {
    btn.classList.remove('animate__animated', 'animate__pulse');
  }, { once: true });
});
