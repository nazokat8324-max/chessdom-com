window.updateFullLeaderboard = async function() {
  const container = document.getElementById("fullLeaderboardContainer");
  if (!container) return;

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">Yuklanmoqda...</div>';
  
  try {
    const res = await fetch('/api/leaderboard');
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    if (!data.success || !data.leaderboard || data.leaderboard.length === 0) {
      container.innerHTML = `<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">Hozircha ro'yxatda o'yinchilar yo'q</div>`;
      return;
    }

    const sorted = (data.leaderboard || []).slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));

    let htmlContent = "";
    sorted.forEach((user, index) => {
      const rating = user.rating || 1500;
      const firstLetter = user.username ? user.username.charAt(0).toUpperCase() : "U";

      let badgeColor = "#555";
      if (index === 0) badgeColor = "#f1c40f";
      else if (index === 1) badgeColor = "#bdc3c7";
      else if (index === 2) badgeColor = "#e67e22";

      htmlContent += `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 10px 12px; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 14px; font-weight: bold; width: 22px; text-align: center; color: ${badgeColor};">#${index + 1}</span>
            <div style="width: 35px; height: 35px; font-size: 15px; display: flex; align-items: center; justify-content: center; background: #81b64c; border-radius: 50%; color: white; font-weight: bold;">${firstLetter}</div>
            <div>
              <b style="font-size: 14px; color: #fff; display: block;">${user.username}</b>
            </div>
          </div>
          <div style="text-align: right;">
            <span style="color: #f1c40f; font-weight: bold; font-size: 15px;">⭐ ${rating}</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = htmlContent;
  } catch (err) {
    console.error('Leaderboard yuklash xatoligi:', err);
    container.innerHTML = `<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">Yuklashda xatolik yuz berdi</div>`;
  }
};

window.updateGameHistoryView = async function() {
  const container = document.getElementById("fullHistoryContainer");
  if (!container) return;

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">Yuklanmoqda...</div>';
  
  try {
    let history = [];
    if (typeof window.currentUser !== 'undefined' && window.currentUser) {
      const res = await fetch(`/api/users/${encodeURIComponent(window.currentUser.username)}/games`, {
        headers: { 'Authorization': `Bearer ${window.authToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.success) {
        history = data.games || [];
      }
    } else {
      history = JSON.parse(localStorage.getItem("justChessGameHistory")) || [];
    }

    if (history.length === 0) {
      container.innerHTML = `<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">Hozircha o'yinlar tarixi mavjud emas</div>`;
      return;
    }

    let htmlContent = "";
    history.slice().reverse().forEach((game) => {
      let resultColor = "#2ecc71";
      let resultText = "G'alaba";
      if (game.result === "loss") {
        resultColor = "#e74c3c";
        resultText = "Mag'lubiyat";
      } else if (game.result === "draw") {
        resultColor = "#f39c12";
        resultText = "Durrang";
      }

      htmlContent += `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 12px 15px; border-radius: 8px;">
          <div>
            <b style="font-size: 14px; color: #fff; display: block;">Raqib: ${game.opponent || 'Oq va Qora (Lokal)'}</b>
            <span style="font-size: 11px; color: #88a;">Sana: ${game.date || 'Yaqinda'}</span>
          </div>
          <div style="text-align: right;">
            <span style="color: ${resultColor}; font-weight: bold; font-size: 13px; display: block;">${resultText}</span>
            <span style="font-size: 11px; color: #aaa;">Rejimi: ${game.mode || 'Lokal o\'yin'}</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = htmlContent;
  } catch (err) {
    console.error('History yuklash xatoligi:', err);
    container.innerHTML = `<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">Yuklashda xatolik yuz berdi</div>`;
  }
};

window.changeLanguage = function(lang) {
  if (typeof window.setLanguage === 'function') {
    window.setLanguage(lang);
  }
};
