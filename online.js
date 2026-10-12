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
  showToast(`${(data && data.senderName) || 'Kimdir'} sizga do'stlik so'rovi yubordi`, 'info');
  if (isViewActive('friendsView') && typeof window.loadFriendRequests === 'function') {
    window.loadFriendRequests();
  }
});

socket.on('room-joined', (data) => {
  const payload = (typeof data === 'string') ? { roomId: data } : (data || {});
  window.currentRoomId = payload.roomId;
  isOnlineMode = true;
  updateOnlineStatus(true);
  if (typeof window.applyMyColor === 'function') {
    window.applyMyColor(payload.color);
  }
  if (!gameStartRequested && typeof startNewGame === 'function') {
    gameStartRequested = true;
    startNewGame();
  }
});

socket.on('waiting-for-opponent', (data) => {
  const payload = (typeof data === 'string') ? { roomId: data } : (data || {});
  window.currentRoomId = payload.roomId;
  if (typeof window.applyMyColor === 'function') {
    window.applyMyColor(payload.color);
  }
  showToast('Raqib kutilmoqda...', 'info');
});

socket.on('opponent-connected', (data) => {
  const payload = data || {};
  if (typeof window.applyMyColor === 'function' && payload.color) {
    window.applyMyColor(payload.color);
  }
  showToast('Raqib topildi! O\'yin boshlanishi...', 'success');
  if (!gameStartRequested && typeof startNewGame === 'function') {
    gameStartRequested = true;
    startNewGame();
  }
});

// Matchmaking: server ikkala o'yinchini xonaga qo'shib, har biriga rangini yuboradi
socket.on('match-found', (data) => {
  window.isSearchingOpponent = false;
  const statusEl = document.getElementById('matchmakingStatus');
  if (statusEl) statusEl.style.display = 'none';

  window.currentRoomId = data.roomId;
  isOnlineMode = true;
  gameStartRequested = true;
  lastSentMove = null;
  updateOnlineStatus(true);

  window.opponentRating = (data.opponent && data.opponent.rating) || 1500;
  if (typeof window.setOpponentData === 'function') {
    window.setOpponentData(data.opponent);
  }
  if (typeof window.applyMyColor === 'function') {
    window.applyMyColor(data.color);
  }
  if (typeof startNewGame === 'function') startNewGame();
  showToast(`Raqib topildi: ${(data.opponent && data.opponent.username) || 'Raqib'}`, 'success');
});

socket.on('opponent-disconnected', () => {
  // O'yin allaqachon tugagan bo'lsa (raqib "Yangi o'yin" bosgan), ogohlantirish shart emas
  if (typeof window.isGameInProgress === 'function' && window.isGameInProgress()) {
    alert('Raqib ulanishni uzdi!');
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
    not_in_room: 'Xona topilmadi yoki siz bu xonada emasmisiz.',
    waiting_for_opponent: 'Raqib hali ulanmagan.',
    not_your_turn: 'Navbat sizda emas.',
    invalid_move: 'Yurish rad etildi.'
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
  if (confirm('Raqib sizga durrang taklif qildi. Qabul qilasizmi?')) {
    socket.emit('accept-draw', { roomId: window.currentRoomId });
    if (typeof window.finishGame === 'function') {
      window.finishGame(null, 'Durrang!', 'info');
    }
  } else {
    socket.emit('decline-draw', { roomId: window.currentRoomId });
  }
});

socket.on('draw-accepted', () => {
  if (typeof window.finishGame === 'function') {
    window.finishGame(null, 'Raqib durrangni qabul qildi. Durrang!', 'info');
  }
});

socket.on('draw-declined', () => {
  showToast('Raqib durrang taklifini rad etdi.', 'warning');
});

socket.on('game-ended', (result) => {
  if (result && result.type === 'resign' && typeof window.finishGame === 'function') {
    window.finishGame(result.winner, 'Raqib taslim bo\'ldi!', 'success');
  }
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
    statusTextEl.textContent = online ? 'Online (Xonada)' : 'Offline';
  }
};

window.handleStartGame = async function() {
  if (window.pendingOnlineMatchmaking) {
    window.pendingOnlineMatchmaking = false;
  }
  await startMatchmaking();
};

window.startMatchmaking = async function() {
  if (!window.currentUser) {
    alert('Avval tizimga kirishingiz kerak!');
    switchView('login');
    return;
  }

  if (!socket.connected) {
    alert('Serverga ulanib bo\'lmadi!');
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
      body: JSON.stringify({ socketId: socket.id })
    });
    const data = await res.json();

    // Raqib topilganda o'yin 'match-found' socket hodisasi orqali boshlanadi
    if (!data.success) {
      alert(data.message || 'Matchmaking xatoligi yuz berdi!');
      window.isSearchingOpponent = false;
      if (typeof window.updateGameStatusText === 'function') {
        window.updateGameStatusText();
      }
      if (statusEl) statusEl.style.display = 'none';
    }
  } catch (err) {
    console.error('Matchmaking xatoligi:', err);
    alert('Matchmaking xatoligi yuz berdi!');
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
