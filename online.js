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

socket.on('connect', () => {
  console.log('Serverga ulandi:', socket.id);
  window.authenticateSocket();
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
  } else if (isViewActive('chatView') && typeof window.loadChatMessages === 'function') {
    window.loadChatMessages();
  }
});

socket.on('friend-request-received', (data) => {
  showToast(tx('friendRequestReceived', "{{name}} sizga do'stlik so'rovi yubordi", { name: (data && data.senderName) || tx('someone', 'Kimdir') }), 'info');
  if (isViewActive('friendsView') && typeof window.loadFriendRequests === 'function') {
    window.loadFriendRequests();
  }
});

// Matchmaking: server ikkala o'yinchini xonaga qo'shib, har biriga rangini yuboradi
socket.on('match-found', (data) => {
  // Liga o'yini boshqa sahifadan turib boshlanishi mumkin — avval o'yin sahifasiga o'tamiz
  if (data.league) {
    if (typeof window.leagueMatchStarted === 'function') window.leagueMatchStarted();
    if (!isViewActive('gameView')) switchView('game');
  }
  window.isSearchingOpponent = false;
  const statusEl = document.getElementById('matchmakingStatus');
  if (statusEl) statusEl.style.display = 'none';

  window.currentRoomId = data.roomId;
  isOnlineMode = true;
  gameStartRequested = true;
  lastSentMove = null;
  updateOnlineStatus(true);

  window.opponentRating = (data.opponent && data.opponent.rating) || 1500;
  window.opponentRatingsByMode = (data.opponent && data.opponent.ratingsByMode) || null;
  if (typeof window.setOpponentData === 'function') {
    window.setOpponentData(data.opponent);
  }
  if (typeof window.applyMyColor === 'function') {
    window.applyMyColor(data.color);
  }
  // Vaqt nazoratini server belgilaydi (ikkala o'yinchida bir xil)
  if (data.clock && typeof setGameTime === 'function') {
    setGameTime(data.clock.initial, null, data.clock.increment);
  }
  if (typeof startNewGame === 'function') startNewGame();
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
    case 'stalemate': return tx('gameDrawStalemate', 'Pat: Durrang!');
    case 'threefold': return tx('gameDrawRepetition', '3 marta takrorlanish: Durrang!');
    case 'fifty': return tx('gameDraw50', '50 yurish qoidasi: Durrang!');
    case 'insufficient': return tx('gameDrawInsufficient', 'Mat uchun dona yetarli emas: Durrang!');
    default: return tx('gameDraw', 'Durrang!');
  }
}

socket.on('game-ended', (data) => {
  if (!data || (data.roomId && data.roomId !== window.currentRoomId)) return;
  if (data.reason === 'aborted') {
    if (typeof window.abortGame === 'function') window.abortGame();
    showToast(tx('gameAborted', "O'yin bekor qilindi: birinchi yurish qilinmadi."), 'warning', 5000);
    return;
  }
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
  if (window.pendingOnlineMatchmaking) {
    window.pendingOnlineMatchmaking = false;
  }
  await startMatchmaking();
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
    alert(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"));
    return;
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
        rated: !document.getElementById('ratedToggle') || document.getElementById('ratedToggle').checked
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
