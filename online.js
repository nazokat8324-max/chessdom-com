const socket = io(window.location.origin);

// Xona ID si board.js va script.js bilan umumiy — doim window.currentRoomId orqali
window.currentRoomId = null;
let isOnlineMode = false;
let gameStartRequested = false;
let lastSentMove = null;
window.isSearchingOpponent = false;

// Socketni foydalanuvchi bilan bog'lash (user_<id> xonasi: do'stlik so'rovlari, shaxsiy chat)
window.authenticateSocket = function() {
  if (window.authToken && socket.connected) {
    socket.emit('authenticate', window.authToken);
  }
};

// Token yaroqsiz — qaytadan kirish kerak
socket.on('auth-error', () => {
  if (typeof window.expireSession === 'function') window.expireSession();
});

// Fair-play: o'yin paytida sahifadan chiqish (boshqa oyna/ilovaga o'tish) serverga xabar qilinadi
function reportGameBlur() {
  if (window.currentRoomId && typeof window.isGameInProgress === 'function' && window.isGameInProgress()) socket.emit('game-blur', { roomId: window.currentRoomId });
}
window.addEventListener('blur', reportGameBlur);
document.addEventListener('visibilitychange', () => { if (document.hidden) reportGameBlur(); });

// Server kechikishni o'lchaydi (soat kompensatsiyasi uchun) — darhol javob beramiz
socket.on('lag-ping', (ack) => { if (typeof ack === 'function') ack(); });
// O'z kechikishimiz: soat ko'rinishini to'g'rilash va ping ko'rsatkichi (faqat o'yin paytida)
setInterval(() => {
  if (!socket.connected || !window.currentRoomId) return;
  const t = performance.now();
  socket.timeout(4000).emit('rtt-probe', (err) => {
    if (err) return;
    const rtt = performance.now() - t;
    window.clientRtt = window.clientRtt ? Math.round(window.clientRtt * 0.7 + rtt * 0.3) : Math.round(rtt);
    const el = document.getElementById('pgPing');
    const live = typeof window.isGameInProgress === 'function' && window.isGameInProgress();
    if (el) {
      el.hidden = !live;
      el.textContent = '📶 ' + window.clientRtt + ' ms';
      el.className = 'pg-ping ' + (window.clientRtt < 150 ? 'good' : (window.clientRtt < 400 ? 'ok' : 'bad'));
    }
  });
}, 3000);

socket.on('connect', () => {
  console.log('Serverga ulandi:', socket.id);
  window.authenticateSocket();
});

// Yangi versiya chiqqanda (deploydan keyin socket qayta ulanadi) — sahifani yangilashni taklif qilish
let loadedAppVersion = null;
socket.on('app-version', (version) => {
  if (!loadedAppVersion) { loadedAppVersion = version; return; }
  if (version === loadedAppVersion || document.getElementById('updateBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'updateBanner';
  banner.className = 'update-banner';
  const text = document.createElement('span');
  text.textContent = tx('appUpdated', "Sayt yangilandi! Yangi imkoniyatlarni ko'rish uchun sahifani yangilang.");
  const btn = document.createElement('button');
  btn.textContent = tx('appUpdateReload', 'Yangilash');
  btn.onclick = () => window.location.reload();
  banner.append(text, btn);
  document.body.appendChild(banner);
});

function isViewActive(id) {
  const el = document.getElementById(id);
  return !!(el && el.classList.contains('active-view'));
}

socket.on('chat-message', (data) => {
  if (window.currentClubName && data.roomId === ('club_' + window.currentClubName)) {
    if (typeof loadClubChatMessages === 'function') {
      loadClubChatMessages();
    }
  }
});

socket.on('friend-request-received', (data) => {
  showToast(tx('friendRequestReceived', "{{name}} sizga do'stlik so'rovi yubordi", { name: (data && data.senderName) || tx('someone', 'Kimdir') }), 'info');
});

// O'yinni boshlash (match-found) yoki qayta ulanganda tiklash (game-resume) — umumiy qism
function beginOnlineGame(data, resume) {
  // Liga o'yini yoki tiklangan o'yin boshqa sahifadan turib boshlanishi mumkin — o'yin sahifasiga o'tamiz
  if (data.league && !resume && typeof window.leagueMatchStarted === 'function') window.leagueMatchStarted();
  if ((data.league || data.challenge || resume) && !isViewActive('gameView')) switchView('game');
  window.isSearchingOpponent = false;
  const statusEl = document.getElementById('matchmakingStatus');
  if (statusEl) statusEl.style.display = 'none';

  window.currentRoomId = data.roomId;
  isOnlineMode = true;
  gameStartRequested = true;
  lastSentMove = null;
  updateOnlineStatus(true);

  window.opponentRatingsByMode = (data.opponent && data.opponent.ratingsByMode) || null;
  window.opponentProvisional = !!(data.opponent && data.opponent.provisional);
  window.currentRatingMode = data.ratingMode || data.mode || null;
  if (typeof window.setOpponentData === 'function') {
    window.setOpponentData(data.opponent);
  }
  if (typeof window.applyMyColor === 'function') {
    window.applyMyColor(data.color);
  }
  // Variant (standart / Chess960) va boshlang'ich pozitsiya — serverdan
  if (typeof window.setGameVariant === 'function') window.setGameVariant(data.variant, data.startFen);
  // Vaqt nazoratini server belgilaydi (ikkala o'yinchida bir xil)
  if (data.clock && typeof setGameTime === 'function') {
    setGameTime(data.clock.initial, null, data.clock.increment);
  }
  if (typeof startNewGame === 'function') startNewGame();
  setOpponentAway(false);
}

// Matchmaking: server ikkala o'yinchini xonaga qo'shib, har biriga rangini yuboradi
socket.on('match-found', (data) => {
  beginOnlineGame(data, false);
  if (data.league) {
    showToast(tx('lgGameToast', "Liga o'yini: {{home}} — {{away}}, {{board}}-doska", {
      home: window.countryName ? window.countryName(data.league.homeClub, null) : data.league.homeClub,
      away: window.countryName ? window.countryName(data.league.awayClub, null) : data.league.awayClub,
      board: data.league.board
    }), 'success', 5000);
  } else {
    showToast(tx('opponentFoundName', 'Raqib topildi: {{name}}', { name: (data.opponent && data.opponent.username) || tx('colOpponent', 'Raqib') }), 'success');
  }
});

// Internet uzilib qayta ulandik yoki sahifa yangilandi — server davom etayotgan o'yinni qaytaradi
socket.on('game-resume', (data) => {
  const apply = () => {
    const sameGame = window.currentRoomId === data.roomId && typeof window.isGameInProgress === 'function' && window.isGameInProgress();
    if (!sameGame) beginOnlineGame(data, true);
    lastSentMove = null;
    if (typeof window.loadServerPosition === 'function') window.loadServerPosition(data.moves);
    if (typeof window.applyClockUpdate === 'function') window.applyClockUpdate(data.clockState);
    setOpponentAway(!!data.opponentAway);
    showToast(tx('gameResumed', "O'yiningiz tiklandi — davom eting!"), 'success', 4000);
    if (data.drawOffered) socket.emit('decline-draw', { roomId: data.roomId });
  };
  // Sahifa endi yuklanayotgan bo'lsa — doska tayyor bo'lgach
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(apply, 300));
  else apply();
});

// Raqib uzildi: qaytishi uchun vaqt bor (teskari sanoq)
let awayTimer = null;
function setOpponentAway(away, seconds) {
  clearInterval(awayTimer);
  let note = document.getElementById('opponentAwayNote');
  if (!away) { if (note) note.remove(); return; }
  if (!note) {
    note = document.createElement('div');
    note.id = 'opponentAwayNote';
    note.className = 'opponent-away-note';
    const panel = document.getElementById('inGameControls');
    if (panel) panel.prepend(note); else return;
  }
  let left = seconds || 60;
  const draw = () => { note.textContent = tx('opponentAwayNote', "⚠️ Raqib uzildi. {{s}} soniyada qaytmasa, g'alaba sizga beriladi.", { s: left }); };
  draw();
  awayTimer = setInterval(() => { left = Math.max(0, left - 1); draw(); if (!left) clearInterval(awayTimer); }, 1000);
}

socket.on('opponent-away', (data) => {
  if (!data || data.roomId !== window.currentRoomId) return;
  setOpponentAway(true, data.seconds);
});

socket.on('opponent-back', (data) => {
  if (!data || data.roomId !== window.currentRoomId) return;
  setOpponentAway(false);
  showToast(tx('opponentBack', 'Raqib qaytdi'), 'info', 3000);
});

socket.on('opponent-disconnected', () => {
  // O'yin allaqachon tugagan bo'lsa (raqib "Yangi o'yin" bosgan), ogohlantirish shart emas
  if (typeof window.isGameInProgress === 'function' && window.isGameInProgress()) {
    alert(tx('opponentDisconnected', 'Raqib ulanishni uzdi!'));
    if (typeof window.abortGame === 'function') window.abortGame();
  }
  window.currentRoomId = null;
  isOnlineMode = false;
  window.isSearchingOpponent = false;
  if (typeof window.updateGameStatusText === 'function') {
    window.updateGameStatusText();
  }
  updateOnlineStatus(false);
});

socket.on('opponent-move', (move) => {
  lastSentMove = null;
  if (typeof game !== 'undefined' && typeof board !== 'undefined') {
    const result = game.move(move);
    if (!result) return;
    board.position(game.fen());
    if (typeof window.clearMoveHints === 'function') window.clearMoveHints();
    if (typeof window.markLastMove === 'function') window.markLastMove(result.from, result.to);
    // Belgilangan premove (agar bo'lsa) — raqib yurishidan keyin darhol
    if (typeof window.tryPremove === 'function') setTimeout(window.tryPremove, 0);
    if (typeof updateHistory === 'function') {
      updateHistory();
    }
    playSound(result.captured ? 'capture' : 'move');
    // Raqibning yurishi o'yinni tugatgan bo'lsa (mat, pat), natijani bizda ham saqlash
    if (typeof window.checkGameOverAfterMove === 'function') {
      window.checkGameOverAfterMove();
    }
  }
});

socket.on('move-rejected', (data) => {
  const reason = (data && data.reason) ? data.reason : 'invalid_move';
  const messages = {
    not_in_room: tx('moveRejectNotInRoom', 'Xona topilmadi yoki siz bu xonada emassiz.'),
    waiting_for_opponent: tx('moveRejectWaiting', 'Raqib hali ulanmagan.'),
    not_your_turn: tx('moveRejectNotYourTurn', 'Navbat sizda emas.'),
    game_over: tx('moveRejectGameOver', "O'yin allaqachon tugagan."),
    invalid_move: tx('moveRejectInvalid', 'Yurish rad etildi.')
  };
  showToast(messages[reason] || messages.invalid_move, 'warning');

  if (lastSentMove && typeof game !== 'undefined' && game.history().length > 0) {
    game.undo();
    if (typeof board !== 'undefined') board.position(game.fen());
    if (typeof updateHistory === 'function') updateHistory();
    if (typeof window.refreshLastMove === 'function') window.refreshLastMove();
  }
  lastSentMove = null;
});

socket.on('draw-offered', () => {
  if (confirm(tx('drawOfferConfirm', 'Raqib sizga durrang taklif qildi. Qabul qilasizmi?'))) {
    socket.emit('accept-draw', { roomId: window.currentRoomId });
  } else {
    socket.emit('decline-draw', { roomId: window.currentRoomId });
  }
});

socket.on('draw-declined', () => {
  showToast(tx('drawDeclinedByOpponent', 'Raqib durrang taklifini rad etdi.'), 'warning');
});

socket.on('clock-update', (data) => {
  if (typeof window.applyClockUpdate === 'function') window.applyClockUpdate(data);
});

// O'yin natijasini server aniqlaydi: mat, pat, taslim, vaqt, durrang, o'yinni tark etish
function gameEndMessage(data) {
  const won = data.result === 'win';
  switch (data.reason) {
    case 'checkmate': return tx('gameCheckmate', "Shaxmat! O'yin tugadi.");
    case 'resign': return won ? tx('opponentResigned', "Raqib taslim bo'ldi!") : tx('youResigned', "Siz taslim bo'ldingiz.");
    case 'timeout': return data.winner === 'w' ? tx('blackTimeUp', "Qoraning vaqti tugadi! Oq g'alaba.") : tx('whiteTimeUp', "Oqning vaqti tugadi! Qora g'alaba.");
    case 'abandon': return won ? tx('opponentAbandoned', "Raqib o'yinni tark etdi. Siz g'olib bo'ldingiz!") : tx('youAbandoned', "Siz o'yinni tark etdingiz.");
    case 'agreement': return tx('gameDrawAgreement', 'Kelishilgan durrang!');
    case 'stalemate': return data.winner ? (won ? tx('shtStalemateWin', "Pat — Shatranj'da bu g'alaba!") : tx('shtStalemateLoss', "Pat — Shatranj'da bu mag'lubiyat.")) : tx('gameDrawStalemate', 'Pat: Durrang!');
    case 'bare': return won ? tx('shtBareWin', "Yalang'och shoh — g'alaba!") : tx('shtBareLoss', "Shohingiz yalang'och qoldi — mag'lubiyat.");
    case 'threefold': return tx('gameDrawRepetition', '3 marta takrorlanish: Durrang!');
    case 'fifty': return tx('gameDraw50', '50 yurish qoidasi: Durrang!');
    case 'insufficient': return tx('gameDrawInsufficient', 'Mat uchun dona yetarli emas: Durrang!');
    default: return tx('gameDraw', 'Durrang!');
  }
}

socket.on('game-ended', (data) => {
  if (!data || (data.roomId && data.roomId !== window.currentRoomId)) return;
  setOpponentAway(false);
  if (data.reason === 'aborted') {
    if (typeof window.abortGame === 'function') window.abortGame();
    showToast(tx('gameAborted', "O'yin bekor qilindi: birinchi yurish qilinmadi."), 'warning', 5000);
    return;
  }
  // 🎬 Ulashish uchun: natija va sabab (share.js)
  window.lastGameEnd = { winner: data.winner === undefined ? null : data.winner, reason: data.reason };
  if (typeof window.finishGame === 'function') {
    const type = data.result === 'win' ? 'success' : (data.result === 'loss' ? 'error' : 'info');
    window.finishGame(data.winner, gameEndMessage(data), type);
  }
  if (typeof window.applyServerGameResult === 'function') window.applyServerGameResult(data);
});

function leaveOnlineGame() {
  if (window.currentRoomId) {
    socket.emit('leave-room', window.currentRoomId);
    window.currentRoomId = null;
  }
  isOnlineMode = false;
  window.isSearchingOpponent = false;
  lastSentMove = null;
  if (typeof window.updateGameStatusText === 'function') {
    window.updateGameStatusText();
  }
  if (typeof window.clearMyColor === 'function') {
    window.clearMyColor();
  }
  updateOnlineStatus(false);
}

function sendMove(moveData) {
  if (socket && window.currentRoomId && isOnlineMode) {
    lastSentMove = moveData;
    socket.emit('make-move', { roomId: window.currentRoomId, move: moveData });
  }
}

window.updateOnlineStatus = function(online) {
  const statusEl = document.getElementById('onlineStatusIndicator');
  const statusTextEl = document.getElementById('onlineStatusText');
  if (statusEl) {
    statusEl.style.background = online ? '#2ecc71' : '#e74c3c';
  }
  if (statusTextEl) {
    statusTextEl.textContent = online ? tx('statusOnlineRoom', 'Online (Xonada)') : tx('statusOffline', 'Offline');
  }
};

window.handleStartGame = async function() {
  await startMatchmaking();
};

// Bosh sahifadagi "⚡ Onlayn o'ynash": o'yin sahifasini ochib, darhol raqib qidiradi (o'yin panelidagi vaqt —
// standart holatda Sozlamalardagi "Onlayn o'ynash" vaqti). O'yin davom etayotgan yoki qidiruv ketayotgan bo'lsa — faqat sahifa.
window.quickPlayOnline = function() {
  const busy = window.isSearchingOpponent || (typeof window.isGameInProgress === 'function' && window.isGameInProgress());
  if (busy || !window.currentUser) { switchView('game'); return; }
  startMatchmaking();
};

// Sozlamalarda tanlangan davlat ustun; bo'lmasa akkauntdagisi
function getMyCountry() {
  let settings = {};
  try { settings = JSON.parse(localStorage.getItem('justChessSettings') || '{}'); } catch (e) {}
  const country = settings.country || (window.currentUser && window.currentUser.country) || undefined;
  if (country && window.currentUser) window.currentUser.country = country;
  return country;
}

window.startMatchmaking = async function() {
  if (!window.currentUser) {
    alert(tx('errLoginRequired', 'Avval tizimga kirishingiz kerak!'));
    switchView('login');
    return;
  }

  if (!socket.connected) {
    // Sahifa endigina ochilgan yoki internet sekin (telefon) — ulanishni biroz kutamiz, darhol xato bermaymiz
    const connected = await new Promise((resolve) => {
      const done = (ok) => { clearTimeout(timer); socket.off('connect', onConnect); resolve(ok); };
      const onConnect = () => done(true);
      const timer = setTimeout(() => done(false), 6000);
      socket.on('connect', onConnect);
    });
    if (!connected) {
      alert(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"));
      return;
    }
  }

  // switchView('game') raqib holatini tozalaydi, shuning uchun so'rovdan oldin chaqiriladi
  switchView('game');

  const statusEl = document.getElementById('matchmakingStatus');
  if (statusEl) {
    statusEl.style.display = 'inline';
  }

  window.isSearchingOpponent = true;
  if (typeof window.updateGameStatusText === 'function') {
    window.updateGameStatusText();
  }

  if (typeof window.setOpponentFound === 'function') {
    window.setOpponentFound(false);
  }

  try {
    const res = await fetch('/api/matchmaking/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.authToken}`
      },
      body: JSON.stringify({
        socketId: socket.id,
        country: getMyCountry(),
        ...(typeof window.getSelectedClock === 'function' ? window.getSelectedClock() : {}),
        rated: !document.getElementById('ratedToggle') || document.getElementById('ratedToggle').checked,
        variant: typeof window.getSelectedVariant === 'function' ? window.getSelectedVariant() : 'standard'
      })
    });
    const data = await res.json();

    // Raqib topilganda o'yin 'match-found' socket hodisasi orqali boshlanadi
    if (!data.success) {
      alert(tServer(data.message) || tx('errMatchmaking', 'Matchmaking xatoligi yuz berdi!'));
      window.isSearchingOpponent = false;
      if (typeof window.updateGameStatusText === 'function') {
        window.updateGameStatusText();
      }
      if (statusEl) statusEl.style.display = 'none';
    }
  } catch (err) {
    console.error('Matchmaking xatoligi:', err);
    alert(tx('errMatchmaking', 'Matchmaking xatoligi yuz berdi!'));
    window.isSearchingOpponent = false;
    if (typeof window.updateGameStatusText === 'function') {
      window.updateGameStatusText();
    }
    if (statusEl) statusEl.style.display = 'none';
  }
};

window.stopMatchmaking = async function() {
  if (!window.currentUser) return;

  window.isSearchingOpponent = false;
  if (typeof window.updateGameStatusText === 'function') {
    window.updateGameStatusText();
  }

  try {
    await fetch('/api/matchmaking/leave', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.authToken}`
      },
      body: JSON.stringify({})
    });
  } catch (err) {
    console.error('Matchmaking to\'xtatish xatoligi:', err);
  }

  const statusEl = document.getElementById('matchmakingStatus');
  if (statusEl) {
    statusEl.style.display = 'none';
  }
};
