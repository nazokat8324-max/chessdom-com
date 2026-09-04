window.leaderboardMode = 'players';
window.leaderboardFilter = 'all';
window.playersLeaderboardData = [];
window.clubsLeaderboardData = [];

window.switchLeaderboardMode = function(mode) {
  window.leaderboardMode = mode;
  
  const playersTab = document.getElementById("playersTab");
  const clubsTab = document.getElementById("clubsTab");
  const filters = document.getElementById("leaderboardFilters");
  const tableHead = document.getElementById("leaderboardTableHead");
  const cardTitle = document.getElementById("leaderboardCardTitle");
  
  if (mode === 'players') {
    if (playersTab) playersTab.classList.add('active');
    if (clubsTab) clubsTab.classList.remove('active');
    if (filters) filters.style.display = 'flex';
    if (cardTitle) cardTitle.textContent = "O'yinchilar Reytingi";
    
    if (tableHead) {
      tableHead.innerHTML = `
        <th>#</th>
        <th>Player</th>
        <th>Wins</th>
        <th>Games</th>
        <th>Win %</th>
      `;
    }
    
    renderPlayersTable(window.playersLeaderboardData, window.leaderboardFilter);
  } else {
    if (playersTab) playersTab.classList.remove('active');
    if (clubsTab) clubsTab.classList.add('active');
    if (filters) filters.style.display = 'none';
    if (cardTitle) cardTitle.textContent = "Klublar Reytingi";
    
    if (tableHead) {
      tableHead.innerHTML = `
        <th>#</th>
        <th>Clan</th>
        <th>Games</th>
        <th>Wins</th>
        <th>Losses</th>
        <th>Win %</th>
      `;
    }
    
    renderClubsTable(window.clubsLeaderboardData);
  }
};

window.filterLeaderboard = function(filter) {
  window.leaderboardFilter = filter;
  
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.filter === filter) {
      tab.classList.add('active');
    }
  });
  
  renderPlayersTable(window.playersLeaderboardData, filter);
};

window.renderPlayersTable = function(players, filter) {
  const tbody = document.getElementById("leaderboardTableBody");
  if (!tbody) return;
  
  if (!players || players.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #88a; padding: 30px;">Hozircha ro'yxatda o'yinchilar yo'q</td></tr>`;
    return;
  }
  
  let sorted = players.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
  
  if (filter !== 'all') {
    const modeStats = (user) => user.statsByMode?.[filter] || { wins: 0, losses: 0, draws: 0 };
    sorted = sorted.filter(user => {
      const stats = modeStats(user);
      return (stats.wins || 0) + (stats.losses || 0) + (stats.draws || 0) > 0;
    });
  }
  
  let html = '';
  sorted.forEach((user, index) => {
    const modeStats = user.statsByMode?.[filter] || { wins: 0, losses: 0, draws: 0 };
    
    let wins, losses, draws, games, winPercentage;
    if (filter === 'all') {
      wins = parseInt(user.wins) || 0;
      losses = parseInt(user.losses) || 0;
      draws = parseInt(user.draws) || 0;
      games = wins + losses + draws;
      winPercentage = games > 0 ? ((wins / games) * 100).toFixed(1) : '0.0';
    } else {
      wins = parseInt(modeStats.wins) || 0;
      losses = parseInt(modeStats.losses) || 0;
      draws = parseInt(modeStats.draws) || 0;
      games = wins + losses + draws;
      winPercentage = games > 0 ? ((wins / games) * 100).toFixed(1) : '0.0';
    }
    
    const firstLetter = user.username ? user.username.charAt(0).toUpperCase() : "U";
    
    let rankClass = 'rank-other';
    let rankIcon = '';
    if (index === 0) {
      rankClass = 'rank-first';
      rankIcon = '<span class="trophy-icon">👑</span>';
    } else if (index === 1) {
      rankClass = 'rank-second';
    } else if (index === 2) {
      rankClass = 'rank-third';
    }
    
    let winPercentClass = 'low';
    if (parseFloat(winPercentage) >= 50) winPercentClass = 'high';
    else if (parseFloat(winPercentage) >= 30) winPercentClass = 'medium';
    
    html += `
      <tr class="${rankClass}">
        <td><span class="rank-badge ${rankClass}">${rankIcon}${index + 1}</span></td>
        <td>
          <div class="player-cell">
            <div class="player-avatar">${firstLetter}</div>
            <span class="player-name">${user.username}</span>
          </div>
        </td>
        <td>${wins}</td>
        <td>${games}</td>
        <td><span class="win-percentage ${winPercentClass}">${winPercentage}%</span></td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
};

window.renderClubsTable = function(clubs) {
  const tbody = document.getElementById("leaderboardTableBody");
  if (!tbody) return;
  
  if (!clubs || clubs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #88a; padding: 30px;">Hozircha klublar ro'yxati bo'sh</td></tr>`;
    return;
  }
  
  let html = '';
  clubs.forEach((club, index) => {
    const games = parseInt(club.games) || 0;
    const wins = parseInt(club.wins) || 0;
    const losses = parseInt(club.losses) || 0;
    const winPercentage = club.winPercentage || 0;
    
    let rankClass = 'rank-other';
    let rankIcon = '';
    if (index === 0) {
      rankClass = 'rank-first';
      rankIcon = '<span class="trophy-icon">👑</span>';
    } else if (index === 1) {
      rankClass = 'rank-second';
    } else if (index === 2) {
      rankClass = 'rank-third';
    }
    
    let winPercentClass = 'low';
    if (winPercentage >= 50) winPercentClass = 'high';
    else if (winPercentage >= 30) winPercentClass = 'medium';
    
    html += `
      <tr class="${rankClass}">
        <td><span class="rank-badge ${rankClass}">${rankIcon}${index + 1}</span></td>
        <td><span class="player-name">${club.name}</span></td>
        <td>${games}</td>
        <td>${wins}</td>
        <td>${losses}</td>
        <td><span class="win-percentage ${winPercentClass}">${winPercentage.toFixed(1)}%</span></td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
};

window.updateFullLeaderboard = async function() {
  const tbody = document.getElementById("leaderboardTableBody");
  if (!tbody) return;
  
  const currentMode = window.leaderboardMode;
  const colspan = currentMode === 'clubs' ? 6 : 5;
  
  tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center; color: #88a; padding: 20px;">Yuklanmoqda...</td></tr>`;
  
  try {
    const res = await fetch('/api/leaderboard');
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    
    if (data.success && data.leaderboard && data.leaderboard.length > 0) {
      window.playersLeaderboardData = data.leaderboard;
    } else {
      window.playersLeaderboardData = [];
    }
    
    const clubRes = await fetch('/api/clubs/leaderboard');
    if (clubRes.ok) {
      const clubData = await clubRes.json();
      if (clubData.success && clubData.leaderboard) {
        window.clubsLeaderboardData = clubData.leaderboard;
      }
    }
    
    if (window.leaderboardMode === 'players') {
      renderPlayersTable(window.playersLeaderboardData, window.leaderboardFilter);
    } else {
      renderClubsTable(window.clubsLeaderboardData);
    }
  } catch (err) {
    console.error('Leaderboard yuklash xatoligi:', err);
    tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center; color: #888; padding: 20px;">Yuklashda xatolik yuz berdi</td></tr>`;
  }
};

window.changeLanguage = function(lang) {
  if (typeof window.setLanguage === 'function') {
    window.setLanguage(lang);
  }
};
