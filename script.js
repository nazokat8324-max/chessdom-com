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
    if (!data.success || !data.winners || data.winners.length === 0) {
      container.innerHTML = `<div style="font-size: 13px; color: #888; text-align: center; padding: 10px;">Hozircha g'alaba qozongan o'yinchilar yo'q</div>`;
      return;
    }

    const top5 = data.winners.slice(0, 5);

    let htmlContent = "";
    top5.forEach((user, index) => {
      const wins = user.dailyWins || 0;
      const firstLetter = user.username ? user.username.charAt(0).toUpperCase() : "U";
      
      let badgeColor = "#555";
      if (index === 0) badgeColor = "#f1c40f";
      else if (index === 1) badgeColor = "#bdc3c7";
      else if (index === 2) badgeColor = "#e67e22";

      htmlContent += `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 8px 10px; border-radius: 6px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 12px; font-weight: bold; width: 18px; text-align: center; color: ${badgeColor};">#${index + 1}</span>
            <div class="mini-avatar" style="width: 30px; height: 30px; font-size: 14px; display: flex; align-items: center; justify-content: center; background: #81b64c; border-radius: 50%; color: white; font-weight: bold;">${firstLetter}</div>
            <b style="font-size: 13px; color: #fff;">${user.username}</b>
          </div>
          <div style="font-size: 12px; color: #2ecc71; font-weight: bold;">
            👑 ${wins}
          </div>
        </div>
      `;
    });

    container.innerHTML = htmlContent;
  } catch (err) {
    console.error('Top players yuklash xatoligi:', err);
    container.innerHTML = `<div style="font-size: 13px; color: #888; text-align: center; padding: 10px;">Yuklashda xatolik yuzberdi</div>`;
  }
};

window.switchView = function(viewName) {
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
        window.updatePlayerInfo('black', 'Raqib', 1500);
      } else {
        window.updatePlayerInfo('white', 'Oq', 1500);
        window.updatePlayerInfo('black', 'Qora', 1500);
      }
    }
    
    if (typeof window.updateTimersDisplay === 'function') {
      window.updateTimersDisplay();
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

window.updateAuthHeaderUI = function() {
  const container = document.getElementById("sidebarAuthContainer");
  if (!container) return;

  if (window.currentUser) {
    container.innerHTML = `
      <div class="user-mini-profile" onclick="window.openProfileModal()">
        <div class="mini-avatar">${window.currentUser.username.charAt(0).toUpperCase()}</div>
        <div class="mini-info">
          <b>${window.currentUser.username}</b>
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
};

window.openProfileModal = function() {
  updateProfileModalData();
  const profileModal = document.getElementById("profileModal");
  if (profileModal) {
    profileModal.style.display = "flex";
  }
};

window.openRegisterModal = function() {
  const modal = document.getElementById("registerModal");
  if (modal) {
    populateCountrySelect();
    modal.style.display = "flex";
  }
};

window.closeRegisterModal = function() {
  const modal = document.getElementById("registerModal");
  if (modal) {
    modal.style.display = "none";
  }
};

window.populateCountrySelect = function() {
  const select = document.getElementById("registerCountry");
  if (!select) return;

  let optionsHtml = '<option value="">Tanlang...</option>';

  if (typeof allCountries !== 'undefined') {
    allCountries.forEach(c => {
      optionsHtml += `<option value="${c.code}">${c.name}</option>`;
    });
  }

  select.innerHTML = optionsHtml;
};

window.handleRegisterModal = async function() {
  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value.trim();
  const country = document.getElementById("registerCountry").value;
  const countrySelect = document.getElementById("registerCountry");

  let valid = true;
  const usernameError = document.getElementById("registerUsernameError");
  const passwordError = document.getElementById("registerPasswordError");

  if (!username) {
    usernameError.style.display = "block";
    valid = false;
  } else {
    usernameError.style.display = "none";
  }

  if (!password || password.length < 4) {
    passwordError.style.display = "block";
    valid = false;
  } else {
    passwordError.style.display = "none";
  }

  if (!valid) return;

  const countryName = countrySelect.options[countrySelect.selectedIndex]?.textContent || '';

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
    countryName: countryName,
    history: []
  };
  window.stats = window.currentUser.stats;
  window.statsByMode = window.currentUser.statsByMode;
  window.authToken = "local_" + Date.now();

  localStorage.setItem("justChessCurrentUser", JSON.stringify(window.currentUser));
  localStorage.setItem("justChessAuthToken", window.authToken);

  window.closeRegisterModal();
  window.updateAuthHeaderUI();
  window.updateTopPlayersList();
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

window.selectLanguage = function(lang) {
  window.setLanguage(lang);
  localStorage.setItem("justChessLang", lang);
  window.closeLanguageModal();
};

window.renderLanguageCards = function(filter = '') {
  const grid = document.getElementById("languageGrid");
  if (!grid) return;

  const languages = [
    { code: 'uz', name: "O'zbekcha", english: 'Uzbek', flag: '🇺🇿' },
    { code: 'en', name: 'English', english: 'English', flag: '🇬🇧' },
    { code: 'ru', name: 'Русский', english: 'Russian', flag: '🇷🇺' },
    { code: 'es', name: 'Español', english: 'Spanish', flag: '🇪🇸' },
    { code: 'de', name: 'Deutsch', english: 'German', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', english: 'French', flag: '🇫🇷' }
  ];

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

  const usernameDisplay = document.getElementById("profileModalUsername");
  const handleDisplay = document.getElementById("profileModalHandle");
  const rapidRating = document.getElementById("statRapid");
  const blitzRating = document.getElementById("statBlitz");
  const bulletRating = document.getElementById("statBullet");

  if (usernameDisplay) usernameDisplay.textContent = window.currentUser.username;
  if (handleDisplay) handleDisplay.textContent = "@" + window.currentUser.username;

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

  if (fideIdEl) fideIdEl.textContent = fideId;
  if (goalEl) goalEl.textContent = goal;
  if (debutEl) debutEl.textContent = debut;
  if (clubEl) clubEl.textContent = club;

  const inputFideId = document.getElementById("inputFideId");
  const inputGoal = document.getElementById("inputGoal");
  const inputDebut = document.getElementById("inputDebut");
  const inputClub = document.getElementById("inputClub");
  const inputRapid = document.getElementById("inputRapid");
  const inputBlitz = document.getElementById("inputBlitz");
  const inputBullet = document.getElementById("inputBullet");

  if (inputFideId) inputFideId.value = fideId;
  if (inputGoal) inputGoal.value = goal;
  if (inputDebut) inputDebut.value = debut;
  if (inputClub) inputClub.value = club;
  if (inputRapid) inputRapid.value = rapid;
  if (inputBlitz) inputBlitz.value = blitz;
  if (inputBullet) inputBullet.value = bullet;
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
    club: (document.getElementById("inputClub")?.value || '').trim(),
    rapid: parseInt(document.getElementById("inputRapid")?.value || '1500', 10) || 1500,
    blitz: parseInt(document.getElementById("inputBlitz")?.value || '1500', 10) || 1500,
    bullet: parseInt(document.getElementById("inputBullet")?.value || '1500', 10) || 1500
  };

  localStorage.setItem("justChessProfileData", JSON.stringify(profileData));
  window.updateProfileModalData();
  window.setProfileEditMode(false);
  showToast("Ma'lumotlar saqlandi", "success");
};

document.addEventListener("DOMContentLoaded", () => {
  window.updateStreakUI();
  window.updateAuthHeaderUI();
  window.updateTopPlayersList();

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

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && profileModal && profileModal.style.display === "flex") {
      profileModal.style.display = "none";
    }
    if (e.key === "Escape" && languageModal && languageModal.style.display === "flex") {
      languageModal.style.display = "none";
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

  // Register Modal
  const registerModal = document.getElementById("registerModal");
  const closeRegisterBtn = document.getElementById("closeRegisterModal");

  if (closeRegisterBtn && registerModal) {
    closeRegisterBtn.addEventListener("click", () => {
      if (!window.currentUser) return;
      registerModal.style.display = "none";
    });
  }

  if (registerModal) {
    registerModal.addEventListener("click", (e) => {
      if (e.target === registerModal) {
        if (!window.currentUser) return;
        registerModal.style.display = "none";
      }
    });
  }

  if (registerModal && !window.currentUser) {
    registerModal.style.display = "flex";
    window.populateCountrySelect();
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && registerModal && registerModal.style.display === "flex") {
      if (window.currentUser) registerModal.style.display = "none";
    }
  });
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
