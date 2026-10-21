window.leaderboardMode = 'players';
window.leaderboardFilter = 'all';
window.playersLeaderboardData = [];
window.clubsLeaderboardData = [];

// views.js doirasida i18next yordamchisi (global tr() social.js da e'lon qilingan)
const tCol = (key, fallback) =>
  (typeof i18next !== 'undefined' && i18next.isInitialized)
    ? i18next.t(key, { defaultValue: fallback })
    : fallback;

