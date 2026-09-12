if (typeof window.currentLang === 'undefined') {
  window.currentLang = localStorage.getItem("justChessLang") || "uz";
}
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

window.updateStreakUI = function() {
  const streakElem = document.getElementById("streakDisplayText");
  if (!streakElem) return;

  const daysWord =
    window.currentLang === "uz"
      ? "kun"
      : window.currentLang === "ru"
        ? "дней подряд"
        : "days streak";
  streakElem.textContent = `🔥 ${window.currentStreak} ${daysWord}`;
};

window.updateTopPlayersList = async function() {
  const container = document.getElementById("topPlayersContainer");
  if (!container) return;

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 10px;">Yuklanmoqda...</div>';
  
  try {
    const res = await fetch('/api/daily-winners');
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();

    const winners = (data.success && Array.isArray(data.winners) && data.winners.length > 0)
      ? data.winners.slice(0, 5)
      : [
          { username: 'Magnus', dailyWins: 24, rating: 2850 },
          { username: 'Hikaru', dailyWins: 19, rating: 2780 },
          { username: 'Ian', dailyWins: 16, rating: 2715 },
          { username: 'Ding', dailyWins: 14, rating: 2680 },
          { username: 'Alireza', dailyWins: 11, rating: 2650 }
        ];

    const tableRows = winners
      .map(
        (user, index) => `
          <tr class="top-winners-row">
            <td class="top-winners-rank">${index + 1}</td>
            <td class="top-winners-user">
              <div class="top-winners-user-cell">
                <div class="mini-avatar">${(user.username || 'U').charAt(0).toUpperCase()}</div>
                <span class="top-winners-name">${user.username}</span>
              </div>
            </td>
            <td class="top-winners-rating">${Number(user.rating || 1500)}</td>
            <td class="top-winners-wins">${user.dailyWins || 0}</td>
          </tr>
        `
      )
      .join('');

    container.innerHTML = `
      <table class="top-winners-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Username</th>
            <th>Rating</th>
            <th>Win Points</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    `;
  } catch (err) {
    console.error('Top players yuklash xatoligi:', err);
    container.innerHTML = `
      <table class="top-winners-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Username</th>
            <th>Rating</th>
            <th>Win Points</th>
          </tr>
        </thead>
        <tbody>
          <tr class="top-winners-row">
            <td class="top-winners-rank">1</td>
            <td class="top-winners-user">
              <div class="top-winners-user-cell">
                <div class="mini-avatar">M</div>
                <span class="top-winners-name">Magnus</span>
              </div>
            </td>
            <td class="top-winners-rating">2850</td>
            <td class="top-winners-wins">24</td>
          </tr>
          <tr class="top-winners-row">
            <td class="top-winners-rank">2</td>
            <td class="top-winners-user">
              <div class="top-winners-user-cell">
                <div class="mini-avatar">H</div>
                <span class="top-winners-name">Hikaru</span>
              </div>
            </td>
            <td class="top-winners-rating">2780</td>
            <td class="top-winners-wins">19</td>
          </tr>
          <tr class="top-winners-row">
            <td class="top-winners-rank">3</td>
            <td class="top-winners-user">
              <div class="top-winners-user-cell">
                <div class="mini-avatar">I</div>
                <span class="top-winners-name">Ian</span>
              </div>
            </td>
            <td class="top-winners-rating">2715</td>
            <td class="top-winners-wins">16</td>
          </tr>
          <tr class="top-winners-row">
            <td class="top-winners-rank">4</td>
            <td class="top-winners-user">
              <div class="top-winners-user-cell">
                <div class="mini-avatar">D</div>
                <span class="top-winners-name">Ding</span>
              </div>
            </td>
            <td class="top-winners-rating">2680</td>
            <td class="top-winners-wins">14</td>
          </tr>
          <tr class="top-winners-row">
            <td class="top-winners-rank">5</td>
            <td class="top-winners-user">
              <div class="top-winners-user-cell">
                <div class="mini-avatar">A</div>
                <span class="top-winners-name">Alireza</span>
              </div>
            </td>
            <td class="top-winners-rating">2650</td>
            <td class="top-winners-wins">11</td>
          </tr>
        </tbody>
      </table>
    `;
  }
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
      resultBadge = '<span style="color: #2ecc71; font-weight: bold;">G\'alaba</span>';
    } else if (game.result === 'loss') {
      resultBadge = '<span style="color: #e74c3c; font-weight: bold;">Mag\'lubiyat</span>';
    } else if (game.result === 'draw') {
      resultBadge = '<span style="color: #f39c12; font-weight: bold;">Durang</span>';
    } else {
      resultBadge = `<span style="color: #88a;">${game.result || '-'}</span>`;
    }

    const timeControl = game.timeControl || 'blitz';
    const timeLabel = timeControl.charAt(0).toUpperCase() + timeControl.slice(1);

    html += `
      <tr>
        <td style="color: #88a; font-size: 12px;">${index + 1}</td>
        <td style="color: #ccc; font-size: 12px;">${game.date || '-'}</td>
        <td style="color: #fff; font-size: 13px; font-weight: bold;">${game.opponent || 'Noma\'lum'}</td>
        <td style="color: #88a; font-size: 12px;">${game.mode || 'Online'}</td>
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

window.switchView = function(viewName) {
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
    window.updateTopPlayersList();
  } else if (viewName === "game") {
    const gameEl = document.getElementById("gameView");
    const navEl = document.getElementById("navPlay");
    if (gameEl) {
      gameEl.classList.add("active-view");
      window.playAnimation("gameView", "fadeIn");
    }
    if (navEl) navEl.classList.add("active");
    
    if (typeof window.updatePlayerInfo === 'function') {
      if (window.currentUser) {
        window.updatePlayerInfo('white', window.currentUser.username, window.currentUser.rating || 1500);
        window.updatePlayerInfo('black', 'Raqib', '⏳');
        window.updatePlayerFlag('white', window.currentUser.country || window.currentUser.countryCode || null);
        window.updatePlayerFlag('black', null);
      } else {
        window.updatePlayerInfo('white', 'Oq', 1500);
        window.updatePlayerInfo('black', 'Raqib', '⏳');
        window.updatePlayerFlag('white', null);
        window.updatePlayerFlag('black', null);
      }
    }
    
    if (typeof window.updateTimersDisplay === 'function') {
      window.updateTimersDisplay();
    }
    
    if (typeof window.setOpponentFound === 'function') {
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
  }
};

window.openSettings = function() {
  window.openSettingsModal();
};

window.updateAuthHeaderUI = function() {
  const container = document.getElementById("sidebarAuthContainer");
  if (!container) return;

  if (window.currentUser) {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <div class="user-mini-profile" onclick="window.openProfileModal()">
          <div class="mini-avatar">${window.currentUser.username.charAt(0).toUpperCase()}</div>
          <div class="mini-info">
            <b>${window.currentUser.username}</b>
          </div>
        </div>
        <button id="settingsGearBtn" style="background: none; border: none; color: #88a; font-size: 18px; cursor: pointer; padding: 4px 6px; border-radius: 4px; line-height: 1;" onclick="window.openSettings()" title="Sozlamalar">&#9881;</button>
      </div>`;
  } else {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <div class="user-mini-profile" onclick="switchView('login')">
          <div class="mini-avatar">👤</div>
          <div class="mini-info">
            <b id="sidebarLoginText">Kirish</b>
            <span>Profilga ulanish</span>
          </div>
        </div>
        <button id="settingsGearBtn" style="background: none; border: none; color: #88a; font-size: 18px; cursor: pointer; padding: 4px 6px; border-radius: 4px; line-height: 1;" onclick="window.openSettings()" title="Sozlamalar">&#9881;</button>
      </div>`;
  }
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
      alert(data.message);
      window.playAnimation("regCardTitle", "shakeX");
      return;
    }
    window.currentUser = data.user;
    window.authToken = data.token;
    localStorage.setItem("justChessCurrentUser", JSON.stringify(window.currentUser));
    localStorage.setItem("justChessAuthToken", data.token);
    window.stats = window.currentUser.stats;
    alert(t ? t.t('regSuccess') : data.message);
    if (typeof window.updateStatsDisplay === "function") window.updateStatsDisplay();
    window.updateAuthHeaderUI();
    window.updateTopPlayersList();
    window.switchView("home");
  } catch (err) {
    alert("Serverga ulanib bo'lmadi!");
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
      alert(data.message);
      window.playAnimation("loginCardTitle", "shakeX");
      return;
    }
    window.currentUser = data.user;
    window.authToken = data.token;
    localStorage.setItem("justChessCurrentUser", JSON.stringify(window.currentUser));
    localStorage.setItem("justChessAuthToken", data.token);
    window.stats = window.currentUser.stats;
    alert(t ? t.t('regSuccess') : data.message);
    if (typeof window.updateStatsDisplay === "function") window.updateStatsDisplay();
    window.updateAuthHeaderUI();
    window.updateTopPlayersList();
    window.switchView("home");
  } catch (err) {
    alert("Serverga ulanib bo'lmadi!");
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
  window.updateTopPlayersList();
  window.switchView("home");
  if (!window.currentUser && typeof window.openLoginModal === "function") {
    window.openLoginModal();
  }
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
};

window.openProfileModal = function() {
  window.updateProfileModalData();
  const profileModal = document.getElementById("profileModal");
  if (profileModal) {
    profileModal.style.display = "flex";
  }
};

window.openSettingsModal = function() {
  if (window.currentUser) {
    window.updateSettingsModalData();
    const settingsModal = document.getElementById("settingsModal");
    if (settingsModal) {
      settingsModal.style.display = "flex";
      window.switchSettingsSection('profil');
    }
  } else {
    window.switchView('login');
  }
};

window.closeSettingsModal = function() {
  const settingsModal = document.getElementById("settingsModal");
  if (settingsModal) {
    settingsModal.style.display = "none";
  }
};

// Country flag helper
function countryCodeToFlag(code) {
  const upper = code.toUpperCase();
  return upper.replace(/./g, ch => String.fromCharCode(127397 + ch.charCodeAt(0)));
}

// Populate the signup country select with flag emojis
window.populateCountrySelect = function() {
  const select = document.getElementById("signupCountry");
  if (!select) return;

  let optionsHtml = '<option value="">Tanlang...</option>';

  if (typeof allCountries !== 'undefined') {
    allCountries.forEach(c => {
      const flagEmoji = countryCodeToFlag(c.code);
      optionsHtml += `<option value="${c.code}">${flagEmoji} ${c.name}</option>`;
    });
  }

  select.innerHTML = optionsHtml;
};

// --- Login Modal ---
window.openLoginModal = function() {
  window.resetLoginErrors();
  window.showLoginStep();
  const modal = document.getElementById("loginModal");
  if (modal) modal.style.display = "flex";
};

window.closeLoginModal = function() {
  const modal = document.getElementById("loginModal");
  if (modal) modal.style.display = "none";
};

window.resetLoginErrors = function() {
  const errorIds = ["loginUsernameError", "loginPasswordError", "loginGeneralError"];
  errorIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
};

window.showLoginStep = function() {
  const loginStep = document.getElementById("authLoginStep");
  const signupFormStep = document.getElementById("authSignupFormStep");
  if (loginStep) loginStep.style.display = "block";
  if (signupFormStep) signupFormStep.style.display = "none";
  const emailStep = document.getElementById("authEmailStep");
  if (emailStep) emailStep.style.display = "none";
  const signupModal = document.getElementById("signupModal");
  if (signupModal) signupModal.style.display = "none";
};

// --- Signup Modal ---
window.openSignupModal = function() {
  window.resetSignupErrors();
  window.showEmailStep();
  const modal = document.getElementById("signupModal");
  if (modal) {
    modal.style.display = "flex";
    window.populateCountrySelect();
  }
  const loginModal = document.getElementById("loginModal");
  if (loginModal) loginModal.style.display = "none";
};

window.closeSignupModal = function() {
  const modal = document.getElementById("signupModal");
  if (modal) modal.style.display = "none";
};

window.showEmailStep = function() {
  const emailStep = document.getElementById("authEmailStep");
  const signupFormStep = document.getElementById("authSignupFormStep");
  if (emailStep) emailStep.style.display = "block";
  if (signupFormStep) signupFormStep.style.display = "none";
};

window.showSignupForm = function() {
  const emailStep = document.getElementById("authEmailStep");
  const signupFormStep = document.getElementById("authSignupFormStep");
  if (emailStep) emailStep.style.display = "none";
  if (signupFormStep) signupFormStep.style.display = "block";
};

window.resetSignupErrors = function() {
  const errorIds = ["signupUsernameError", "signupUsernameExistsError", "signupPasswordError"];
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

// --- Switch between modals ---
window.switchToSignUp = function() {
  window.openSignupModal();
};

window.switchToLogin = function() {
  window.openLoginModal();
};

// --- Social Login (placeholder) ---
window.socialLogin = function(provider) {
  alert(`Social login (${provider}) will be available soon.`);
};

// --- Get registered users from localStorage ---
window.getRegisteredUsers = function() {
  try {
    return JSON.parse(localStorage.getItem("justChessRegisteredUsers") || "[]");
  } catch {
    return [];
  }
};

window.saveRegisteredUsers = function(users) {
  localStorage.setItem("justChessRegisteredUsers", JSON.stringify(users));
};

// --- Login handler ---
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

  // Check local registered users first
  const users = window.getRegisteredUsers();
  const existing = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (existing && existing.password === password) {
    // Local login success
    window.currentUser = existing.userData;
    window.authToken = "local_" + Date.now();
    localStorage.setItem("justChessCurrentUser", JSON.stringify(window.currentUser));
    localStorage.setItem("justChessAuthToken", window.authToken);
    window.closeLoginModal();
    window.updateAuthHeaderUI();
    window.updateTopPlayersList();
    window.switchView("home");
    if (typeof window.updateStatsDisplay === "function") window.updateStatsDisplay();
    return;
  }

  // Fallback: try server login
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (data.success) {
      localStorage.setItem("justChessCurrentUser", JSON.stringify(data.user));
      localStorage.setItem("justChessAuthToken", data.token);
      window.currentUser = data.user;
      window.authToken = data.token;
      window.closeLoginModal();
      window.updateAuthHeaderUI();
      window.updateTopPlayersList();
      window.switchView("home");
      if (typeof window.updateStatsDisplay === "function") window.updateStatsDisplay();
    } else {
      if (generalError) generalError.style.display = "block";
    }
  } catch {
    if (generalError) generalError.style.display = "block";
  }
};

// --- Signup handler ---
window.handleSignupModal = async function() {
  const username = document.getElementById("signupUsername").value.trim();
  const password = document.getElementById("signupPassword").value.trim();
  const countrySelect = document.getElementById("signupCountry");
  const country = countrySelect ? countrySelect.value : '';
  const countryName = countrySelect && countrySelect.options[countrySelect.selectedIndex]
    ? countrySelect.options[countrySelect.selectedIndex].textContent.replace(/^\p{Emoji}\s*/u, '').trim()
    : '';

  const usernameError = document.getElementById("signupUsernameError");
  const usernameExistsError = document.getElementById("signupUsernameExistsError");
  const passwordError = document.getElementById("signupPasswordError");

  let valid = true;

  // Username required
  if (!username) {
    if (usernameError) usernameError.style.display = "block";
    valid = false;
  } else {
    if (usernameError) usernameError.style.display = "none";
  }

  // Username uniqueness check
  if (valid && username) {
    const users = window.getRegisteredUsers();
    const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      if (usernameExistsError) usernameExistsError.style.display = "block";
      valid = false;
    } else {
      if (usernameExistsError) usernameExistsError.style.display = "none";
    }
  }

  // Password min 6 chars
  if (!password || password.length < 6) {
    if (passwordError) passwordError.style.display = "block";
    valid = false;
  } else {
    if (passwordError) passwordError.style.display = "none";
  }

  if (!valid) return;

  window.currentUser = {
    username: username,
    email: username + '@justchess.local',
    rating: 1500,
    stats: { wins: 0, losses: 0, draws: 0 },
    statsByMode: {
      rapid: { wins: 0, losses: 0, draws: 0 },
      blitz: { wins: 0, losses: 0, draws: 0 },
      bullet: { wins: 0, losses: 0, draws: 0 }
    },
    country: country || 'uz',
    countryName: countryName || 'O\'zbekiston',
    history: []
  };
  window.stats = window.currentUser.stats;
  window.statsByMode = window.currentUser.statsByMode;
  window.authToken = "local_" + Date.now();

  localStorage.setItem("justChessCurrentUser", JSON.stringify(window.currentUser));
  localStorage.setItem("justChessAuthToken", window.authToken);

  // Save to registered users list for future login
  const users = window.getRegisteredUsers();
  users.push({ username: username, password: password, userData: window.currentUser });
  window.saveRegisteredUsers(users);

  window.closeSignupModal();
  window.updateAuthHeaderUI();
  window.updateTopPlayersList();
  window.switchView("home");
  if (typeof window.updateStatsDisplay === "function") window.updateStatsDisplay();
};

window.closeLanguageModal = function() {
  const modal = document.getElementById("languageModal");
  if (modal) {
    modal.style.display = "none";
  }
};

window.LANGUAGES = [
  { code: 'uz', name: "O'zbekcha", english: 'Uzbek', flag: '\u{1F1FA}\u{1F1FF}' },
  { code: 'en', name: 'English', english: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'ru', name: 'Русский', english: 'Russian', flag: '\u{1F1F7}\u{1F1FA}' },
  { code: 'es', name: 'Español', english: 'Spanish', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'de', name: 'Deutsch', english: 'German', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'fr', name: 'Français', english: 'French', flag: '\u{1F1EB}\u{1F1F7}' }
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

window.renderLeagues = function() {
  const container = document.getElementById("leaguesListContainer");
  if (!container) return;

  const continents = Object.keys(window.CONTINENTS);
  let html = '';

  continents.forEach(key => {
    const info = window.CONTINENTS[key];
    const countries = (typeof continentCountries !== 'undefined' && continentCountries[key]) ? continentCountries[key] : [];
    const teamCount = countries.length;
    html += `
      <div class="league-card" onclick="window.openLeagueDetail('${key}')">
        <div class="league-card-icon">${info.flag}</div>
        <div class="league-card-title">${info.name}</div>
        <div class="league-card-modes">
          <span class="league-mode-btn" onclick="event.stopPropagation(); window.playLeague('${key}', 'bullet')">⚡ Bullet</span>
          <span class="league-mode-btn" onclick="event.stopPropagation(); window.playLeague('${key}', 'blitz')">🔥 Blitz</span>
          <span class="league-mode-btn" onclick="event.stopPropagation(); window.playLeague('${key}', 'rapid')">⏱️ Rapid</span>
        </div>
        <div class="league-card-info">
          <span class="league-card-teams">${teamCount} jamoa • Round-Robin</span>
        </div>
        <div class="league-card-desc">Barcha jamoalar o'zaro o'ynaydi. Eng ko'p ochko to'plagan jamoa g'olib!</div>
      </div>
    `;
  });

  container.innerHTML = html;
  window.renderChampionsLeague();
};

window.renderChampionsLeague = function() {
  // Champions League section is now static HTML
};

window.openLeagueDetail = function(leagueKey) {
  window.currentLeagueKey = leagueKey;
  const info = window.CONTINENTS[leagueKey];
  if (!info) return;
  const countries = (typeof continentCountries !== 'undefined' && continentCountries[leagueKey]) ? continentCountries[leagueKey] : [];

  const modal = document.getElementById('leagueDetailModal');
  if (!modal) return;

  document.getElementById('leagueDetailTitle').textContent = info.name;

  const standingsEl = document.getElementById('leagueStandingsContainer');
  if (standingsEl) {
    const teams = countries.map((c) => {
      const played = countries.length - 1;
      return {
        name: c.name,
        flag: c.flag || '',
        played,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0
      };
    }).sort((a, b) => b.points - a.points);

    let html = '<table class="league-detail-schedule-table"><thead><tr><th>O\'rin</th><th>Jamoa</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr></thead><tbody>';
    teams.forEach((team, index) => {
      const rankColor = index === 0 ? '#f1c40f' : index === 1 ? '#bdc3c7' : index === 2 ? '#e67e22' : '#fff';
      html += `<tr>
        <td style="color: ${rankColor}; font-weight: 800; font-size: 12px;">${index + 1}</td>
        <td style="color: #fff; font-weight: bold; font-size: 12px;">
          <span style="margin-right: 6px;">${team.flag}</span>${team.name}
        </td>
        <td style="color: #88a; font-size: 11px;">${team.played}</td>
        <td style="color: #81b64c; font-size: 11px; font-weight: 700;">${team.wins}</td>
        <td style="color: #f1c40f; font-size: 11px; font-weight: 700;">${team.draws}</td>
        <td style="color: #e74c3c; font-size: 11px; font-weight: 700;">${team.losses}</td>
        <td style="color: #fff; font-weight: 800; font-size: 12px;">${team.points}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    standingsEl.innerHTML = html;
  }

  modal.style.display = 'flex';
};

window.closeLeagueDetail = function() {
  const modal = document.getElementById('leagueDetailModal');
  if (modal) modal.style.display = 'none';
};

window.getLeagueParticipants = function(leagueKey) {
  try {
    return JSON.parse(localStorage.getItem('justChessLeagueParticipants_' + leagueKey) || '[]');
  } catch {
    return [];
  }
};

window.joinLeague = function(leagueKey) {
  if (!window.currentUser) {
    alert('Avval tizimga kirishingiz kerak!');
    switchView('login');
    return;
  }
  const participants = window.getLeagueParticipants(leagueKey);
  if (!participants.some(u => u.username === window.currentUser.username)) {
    participants.push({ username: window.currentUser.username, joinedAt: new Date().toISOString() });
    localStorage.setItem('justChessLeagueParticipants_' + leagueKey, JSON.stringify(participants));
    window.openLeagueDetail(leagueKey);
  }
};

window.generateRoundRobinSchedule = function(teams) {
  if (!teams || teams.length < 2) return [];

  const hasBye = teams.length % 2 === 1;
  const participants = hasBye ? [...teams, null] : [...teams];
  const participantCount = participants.length;
  const rounds = participantCount - 1;
  const matchesPerRound = participantCount / 2;
  const schedule = [];

  for (let round = 0; round < rounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      const home = participants[match];
      const away = participants[participantCount - 1 - match];

      if (home && away) {
        const date = new Date();
        date.setDate(date.getDate() + (round * 7) + 1);
        schedule.push({
          round: `${round + 1}-bosqich`,
          home: home.name,
          away: away.name,
          date: date.toLocaleDateString('uz-UZ'),
          time: '19:00'
        });
      }
    }

    const rotatedTeam = participants.pop();
    participants.splice(1, 0, rotatedTeam);
  }

  return schedule;
};

window.playLeague = function(leagueKey, mode) {
  const info = window.CONTINENTS[leagueKey];
  if (!info) return;
  const countries = (typeof continentCountries !== 'undefined' && continentCountries[leagueKey]) ? continentCountries[leagueKey] : [];
  alert(info.name + ' - ' + mode.toUpperCase() + ' Ligasi\n\n' + countries.length + ' ta jamoa istagona o\'ynaydi!');
};

window.getLanguageInfo = function(code) {
  return window.LANGUAGES.find(l => l.code === code) || window.LANGUAGES[1];
};

window.selectLanguage = function(lang) {
  window.setLanguage(lang);
  localStorage.setItem("justChessLang", lang);
  window.closeLanguageModal();
};

window.renderLanguageCards = function(filter, containerId) {
  const grid = document.getElementById(containerId || 'languageGrid');
  if (!grid) return;

  const languages = window.LANGUAGES;

  const currentLang = window.currentLang || localStorage.getItem("justChessLang") || 'uz';

  grid.innerHTML = languages
    .filter(lang =>
      lang.name.toLowerCase().includes(filter.toLowerCase()) ||
      lang.english.toLowerCase().includes(filter.toLowerCase())
    )
    .map(lang => `
      <div class="language-card ${lang.code === currentLang ? 'active' : ''}" onclick="selectLanguage('${lang.code}')">
        <div class="language-card-check">✓</div>
        <div class="language-card-flag">${lang.flag}</div>
        <div class="language-card-name">${lang.name}</div>
        <div class="language-card-english">${lang.english}</div>
      </div>
    `).join('');
};

window.updateProfileModalData = function() {
  if (!window.currentUser) return;

  const handleDisplay = document.getElementById("profileModalHandle");
  const countryFlagEl = document.getElementById("profileModalCountryFlag");
  const countryNameEl = document.getElementById("profileModalCountryName");
  const countryWrapEl = document.getElementById("profileModalCountry");
  const rapidRating = document.getElementById("statRapid");
  const blitzRating = document.getElementById("statBlitz");
  const bulletRating = document.getElementById("statBullet");

  if (handleDisplay) handleDisplay.textContent = "@" + window.currentUser.username;

  const countryCode = (window.currentUser.country || 'uz').toLowerCase();
  const countryName = window.currentUser.countryName || '';
  if (countryWrapEl) countryWrapEl.style.display = countryName ? 'flex' : 'none';
  if (countryFlagEl) countryFlagEl.src = `https://flagcdn.com/w20/${countryCode}.png`;
  if (countryNameEl) countryNameEl.textContent = countryName;

  const profileData = JSON.parse(localStorage.getItem("justChessProfileData")) || {};
  const fideId = profileData.fideId || '';
  const goal = profileData.goal || '';
  const debut = profileData.debut || '';
  const club = profileData.club || '';
  const rapid = profileData.rapid || (window.currentUser.rating || 1500);
  const blitz = profileData.blitz || (window.currentUser.rating || 1500);
  const bullet = profileData.bullet || (window.currentUser.rating || 1500);

  if (rapidRating) rapidRating.textContent = rapid;
  if (blitzRating) blitzRating.textContent = blitz;
  if (bulletRating) bulletRating.textContent = bullet;

  const fideIdEl = document.getElementById("profileFideId");
  const goalEl = document.getElementById("profileGoal");
  const debutEl = document.getElementById("statDebut");
  const clubEl = document.getElementById("statClub");

  if (fideIdEl) fideIdEl.textContent = fideId || "—";
  if (goalEl) goalEl.textContent = goal || "—";
  if (debutEl) debutEl.textContent = debut || "—";
  if (clubEl) clubEl.textContent = club || "—";
};

window.switchSettingsSection = function(section) {
  const profilContent = document.getElementById("settingsContentProfil");
  const tilContent = document.getElementById("settingsContentTil");
  const menuItems = document.querySelectorAll('.settings-menu-item');

  if (profilContent) profilContent.style.display = section === 'profil' ? 'block' : 'none';
  if (tilContent) tilContent.style.display = section === 'til' ? 'block' : 'none';

  menuItems.forEach(item => {
    item.classList.toggle('active', item.dataset.section === section);
  });

  if (section === 'til') {
    setTimeout(() => {
      const searchInput = document.getElementById("settingsLanguageSearch");
      if (searchInput) searchInput.value = '';
      window.renderLanguageCards('', 'settingsLanguageGrid');
    }, 50);
  } else {
    window.setSettingsEditMode(false);
  }
};

window.updateSettingsModalData = function() {
  if (!window.currentUser) return;

  const handleDisplay = document.getElementById("settingsModalHandle");
  if (handleDisplay) handleDisplay.textContent = "Sozlamalar";

  const profileData = JSON.parse(localStorage.getItem("justChessProfileData")) || {};
  const fideId = profileData.fideId || '';
  const goal = profileData.goal || '';
  const debut = profileData.debut || '';
  const club = profileData.club || '';
  const rapid = profileData.rapid || (window.currentUser.rating || 1500);
  const blitz = profileData.blitz || (window.currentUser.rating || 1500);
  const bullet = profileData.bullet || (window.currentUser.rating || 1500);

  const fideIdEl = document.getElementById("settingsFideId");
  const goalEl = document.getElementById("settingsGoal");
  const debutEl = document.getElementById("settingsDebut");
  const clubEl = document.getElementById("settingsClub");

  if (fideIdEl) fideIdEl.textContent = fideId || "—";
  if (goalEl) goalEl.textContent = goal || "—";
  if (debutEl) debutEl.textContent = debut || "—";
  if (clubEl) clubEl.textContent = club || "—";

  const rapidEl = document.getElementById("settingsStatRapid");
  const blitzEl = document.getElementById("settingsStatBlitz");
  const bulletEl = document.getElementById("settingsStatBullet");

  if (rapidEl) rapidEl.textContent = rapid;
  if (blitzEl) blitzEl.textContent = blitz;
  if (bulletEl) bulletEl.textContent = bullet;

  const fideIdInput = document.getElementById("settingsFideIdInput");
  const goalInput = document.getElementById("settingsGoalInput");
  const debutInput = document.getElementById("settingsDebutInput");
  const clubInput = document.getElementById("settingsClubInput");

  if (fideIdInput) fideIdInput.value = fideId;
  if (goalInput) goalInput.value = goal;
  if (debutInput) debutInput.value = debut;
  if (clubInput) clubInput.value = club;
};

window.setSettingsEditMode = function(enabled) {
  const metaRows = document.querySelectorAll('#settingsContentProfil .meta-row');
  metaRows.forEach(row => {
    const textSpan = row.querySelector('.editable-text');
    const input = row.querySelector('.editable-input');
    if (textSpan && input) {
      textSpan.style.display = enabled ? 'none' : 'inline';
      input.style.display = enabled ? 'inline' : 'none';
    }
  });

  const editBtn = document.getElementById("settingsEditBtn");
  const saveBtn = document.getElementById("settingsSaveBtn");
  const cancelBtn = document.getElementById("settingsCancelBtn");

  if (editBtn) editBtn.style.display = enabled ? 'none' : 'inline-block';
  if (saveBtn) saveBtn.style.display = enabled ? 'inline-block' : 'none';
  if (cancelBtn) cancelBtn.style.display = enabled ? 'inline-block' : 'none';
};

window.saveSettingsData = function() {
  const profileData = {
    fideId: (document.getElementById("settingsFideIdInput")?.value || '').trim(),
    goal: (document.getElementById("settingsGoalInput")?.value || '').trim(),
    debut: (document.getElementById("settingsDebutInput")?.value || '').trim(),
    club: (document.getElementById("settingsClubInput")?.value || '').trim()
  };

  localStorage.setItem("justChessProfileData", JSON.stringify(profileData));
  window.updateSettingsModalData();
  window.setSettingsEditMode(false);
  showToast("Ma'lumotlar saqlandi", "success");
};

document.addEventListener("DOMContentLoaded", () => {
  window.updateStreakUI();
  window.updateAuthHeaderUI();
  window.updateTopPlayersList();
  window.setupHistoryFilters();

  // Profile Modal
  const profileModal = document.getElementById("profileModal");
  const closeProfileBtn = document.getElementById("closeProfileBtn");
  const copyProfileLinkBtn = document.getElementById("copyProfileLinkBtn");

  if (closeProfileBtn && profileModal) {
    closeProfileBtn.addEventListener("click", () => {
      profileModal.style.display = "none";
    });
  }

  if (copyProfileLinkBtn && profileModal) {
    copyProfileLinkBtn.addEventListener("click", () => {
      const profileUrl = window.location.origin + "/profile/" + (window.currentUser ? window.currentUser.username : "");
      navigator.clipboard.writeText(profileUrl).then(() => {
        showToast("Profil havolasi nusxalandi", "success");
      }).catch(() => {
        showToast("Nusxalashda xatolik yuz berdi", "error");
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
    if (e.key === "Escape" && settingsModal && settingsModal.style.display === "flex") {
      settingsModal.style.display = "none";
    }
    if (e.key === "Escape" && languageModal && languageModal.style.display === "flex") {
      languageModal.style.display = "none";
    }
    if (e.key === "Escape" && leagueDetailModal && leagueDetailModal.style.display === "flex") {
      leagueDetailModal.style.display = "none";
    }
  });

  const settingsSaveBtn = document.getElementById("settingsSaveBtn");
  const settingsCancelBtn = document.getElementById("settingsCancelBtn");

  if (settingsSaveBtn) {
    settingsSaveBtn.addEventListener("click", window.saveSettingsData);
  }
  if (settingsCancelBtn) {
    settingsCancelBtn.addEventListener("click", () => {
      window.updateSettingsModalData();
      window.setSettingsEditMode(false);
    });
  }

  const settingsModal = document.getElementById("settingsModal");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");

  if (closeSettingsBtn && settingsModal) {
    closeSettingsBtn.addEventListener("click", () => {
      settingsModal.style.display = "none";
    });
  }

  if (settingsModal) {
    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) {
        settingsModal.style.display = "none";
      }
    });
  }

  const settingsLanguageSearch = document.getElementById("settingsLanguageSearch");
  if (settingsLanguageSearch) {
    settingsLanguageSearch.addEventListener("input", (e) => {
      window.renderLanguageCards(e.target.value, 'settingsLanguageGrid');
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

  // Auth Modals
  const loginModal = document.getElementById("loginModal");
  const signupModal = document.getElementById("signupModal");
  const closeLoginBtn = document.getElementById("closeLoginModal");
  const closeSignupBtn = document.getElementById("closeSignupModal");

  // Close buttons
  if (closeLoginBtn && loginModal) {
    closeLoginBtn.addEventListener("click", () => {
      loginModal.style.display = "none";
    });
  }

  if (closeSignupBtn && signupModal) {
    closeSignupBtn.addEventListener("click", () => {
      signupModal.style.display = "none";
    });
  }

  // Backdrop click closes
  if (loginModal) {
    loginModal.addEventListener("click", (e) => {
      if (e.target === loginModal) {
        loginModal.style.display = "none";
      }
    });
  }

  if (signupModal) {
    signupModal.addEventListener("click", (e) => {
      if (e.target === signupModal) {
        signupModal.style.display = "none";
      }
    });
  }

  // Escape key closes auth modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (loginModal && loginModal.style.display === "flex") {
        loginModal.style.display = "none";
      }
      if (signupModal && signupModal.style.display === "flex") {
        signupModal.style.display = "none";
      }
    }
  });

  // Auto-open login modal if not logged in
  if (!window.currentUser) {
    window.openLoginModal();
  }
});

window.toggleUsernameEdit = function() {
  const editArea = document.getElementById("usernameEditArea");
  const toggleBtn = document.getElementById("toggleUsernameEditBtn");
  if (!editArea || !toggleBtn) return;
  const isHidden = editArea.style.display === "none";
  editArea.style.display = isHidden ? "block" : "none";
  toggleBtn.textContent = isHidden ? "Bekor qilish" : "Tahrirlash";
  if (isHidden && window.currentUser) {
    const currentDisp = document.getElementById("currentUsernameDisplay");
    const input = document.getElementById("newUsernameInput");
    if (currentDisp) currentDisp.textContent = window.currentUser.username;
    if (input) input.value = window.currentUser.username;
  }
};

window.changeUsername = async function() {
  const input = document.getElementById("newUsernameInput");
  const errorEl = document.getElementById("usernameError");
  const successEl = document.getElementById("usernameSuccess");
  if (!input) return;

  const newUsername = input.value.trim();

  if (errorEl) errorEl.style.display = "none";
  if (successEl) successEl.style.display = "none";

  if (!newUsername) {
    if (errorEl) { errorEl.textContent = "Username bo'sh bo'lishi mumkin emas!"; errorEl.style.display = "block"; }
    return;
  }

  if (newUsername.length < 3 || newUsername.length > 30) {
    if (errorEl) { errorEl.textContent = "Username 3-30 ta belgi bo'lishi kerak!"; errorEl.style.display = "block"; }
    return;
  }

  if (window.currentUser && newUsername.toLowerCase() === window.currentUser.username.toLowerCase()) {
    if (errorEl) { errorEl.textContent = "Siz allaqachon shu username ishlatiyapsiz!"; errorEl.style.display = "block"; }
    return;
  }

  try {
    const res = await fetch('/api/profile/username', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.authToken}`
      },
      body: JSON.stringify({ newUsername })
    });
    const data = await res.json();

    if (!data.success) {
      if (errorEl) { errorEl.textContent = data.message || "Xatolik yuz berdi!"; errorEl.style.display = "block"; }
      return;
    }

    window.currentUser = data.user;
    window.authToken = data.token;
    localStorage.setItem("justChessCurrentUser", JSON.stringify(window.currentUser));
    localStorage.setItem("justChessAuthToken", window.authToken);

    if (successEl) { successEl.textContent = "Username muvaffaqiyatli o'zgartirildi!"; successEl.style.display = "block"; }
    if (errorEl) errorEl.style.display = "none";

    setTimeout(() => {
      window.updateAllUsernameDisplays();
      if (successEl) successEl.style.display = "none";
      const editArea = document.getElementById("usernameEditArea");
      const toggleBtn = document.getElementById("toggleUsernameEditBtn");
      if (editArea) editArea.style.display = "none";
      if (toggleBtn) { toggleBtn.textContent = "Tahrirlash"; }
      window.updateAuthHeaderUI();
    }, 1500);
  } catch (err) {
    if (errorEl) { errorEl.textContent = "Serverga ulanib bo'lmadi!"; errorEl.style.display = "block"; }
  }
};

window.updateAllUsernameDisplays = function() {
  if (!window.currentUser) return;
  const username = window.currentUser.username;
  const firstLetter = username.charAt(0).toUpperCase();

  const profileUsername = document.getElementById("profileUsernameDisplay");
  if (profileUsername) profileUsername.textContent = username;

  const profileAvatar = document.getElementById("profileAvatar");
  if (profileAvatar) profileAvatar.textContent = firstLetter;

  const currentUserDisp = document.getElementById("currentUsernameDisplay");
  if (currentUserDisp) currentUserDisp.textContent = username;

  const newUserInput = document.getElementById("newUsernameInput");
  if (newUserInput) newUserInput.value = username;

  if (typeof window.updateAuthHeaderUI === "function") {
    window.updateAuthHeaderUI();
  }

  if (window.currentRoomId && typeof window.updatePlayerInfo === "function") {
    window.updatePlayerInfo('white', username, window.currentUser.rating || 1500);
  }
  if (window.currentUser) {
    window.updatePlayerFlag('white', window.currentUser.country || window.currentUser.countryCode || null);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggleUsernameEditBtn");
  if (toggleBtn) toggleBtn.addEventListener("click", window.toggleUsernameEdit);
  const saveBtn = document.getElementById("saveUsernameBtn");
  if (saveBtn) saveBtn.addEventListener("click", window.changeUsername);
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
