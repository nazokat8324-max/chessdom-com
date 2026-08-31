let profileChart = null;

window.updateProfileViewData = function() {
  if (!window.currentUser) return;
  
  const avatarElem = document.getElementById("profileAvatar");
  const usernameElem = document.getElementById("profileUsernameDisplay");
  const emailElem = document.getElementById("profileEmailDisplay");
  const winElem = document.getElementById("profStatWins");
  const lossElem = document.getElementById("profStatLosses");
  const drawElem = document.getElementById("profStatDraws");
  const ratingElem = document.getElementById("profStatRating");

  if (avatarElem) avatarElem.textContent = window.currentUser.username.charAt(0).toUpperCase();
  if (usernameElem) usernameElem.textContent = window.currentUser.username;
  if (emailElem) emailElem.textContent = window.currentUser.email;
  if (winElem) winElem.textContent = window.stats.wins;
  if (lossElem) lossElem.textContent = window.stats.losses;
  if (drawElem) drawElem.textContent = window.stats.draws;
  if (ratingElem) ratingElem.textContent = window.currentUser.rating || 1500;

  window.renderProfileChart();
};

window.renderProfileChart = function() {
  const canvasElement = document.getElementById("profileStatsChart");
  if (!canvasElement) return;

  const ctx = canvasElement.getContext("2d");

  if (profileChart) {
    profileChart.destroy();
  }

  profileChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ["G'alaba", "Mag'lubiyat", "Durang"],
      datasets: [{
        data: [window.stats.wins, window.stats.losses, window.stats.draws],
        backgroundColor: [
          'rgba(40, 167, 69, 0.8)',
          'rgba(220, 53, 69, 0.8)',
          'rgba(108, 117, 125, 0.8)'
        ],
        borderColor: [
          'rgba(40, 167, 69, 1)',
          'rgba(220, 53, 69, 1)',
          'rgba(108, 117, 125, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#fff'
          }
        }
      }
    }
  });
};
