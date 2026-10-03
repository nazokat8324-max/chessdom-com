const socket = io(window.location.origin);

let currentRoomId = null;
let isOnlineMode = false;
let gameStartRequested = false;
let lastSentMove = null;
window.isSearchingOpponent = false;

socket.on('connect', () => {
  console.log('Serverga ulandi:', socket.id);
});

socket.on('chat-message', (data) => {
  if (window.currentClubName && data.roomId === ('club_' + window.currentClubName)) {
    if (typeof loadClubChatMessages === 'function') {
      loadClubChatMessages();
    }
  }
});

socket.on('room-joined', (data) => {
  const payload = (typeof data === 'string') ? { roomId: data } : (data || {});
  currentRoomId = payload.roomId;
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
  currentRoomId = payload.roomId;
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

socket.on('opponent-disconnected', () => {
  alert('Raqib ulanishni uzdi!');
  currentRoomId = null;
  isOnlineMode = false;
  window.isSearchingOpponent = false;
  if (typeof window.updateGameStatusText === 'function') {
    window.updateGameStatusText();
  }
  if (typeof window.clearMyColor === 'function') {
    window.clearMyColor();
  }
  updateOnlineStatus(false);
});

socket.on('offer-draw', (data) => {
  if (confirm('Raqib sizga durrang taklif qildi. Qabul qilasizmi?')) {
    socket.emit('accept-draw', { roomId: data.roomId });
    if (typeof saveGameHistory === 'function') {
      saveGameHistory('draw', 'Raqib', 'Online');
    }
    if (typeof recordResult === 'function') {
      recordResult('draw');
    }
    alert('Durrang!');
  } else {
    socket.emit('decline-draw', { roomId: data.roomId });
  }
});

socket.on('opponent-move', (move) => {
  lastSentMove = null;
  if (typeof game !== 'undefined' && typeof board !== 'undefined') {
    game.move(move);
    board.position(game.fen());
    if (typeof updateHistory === 'function') {
      updateHistory();
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

function leaveOnlineGame() {
  if (currentRoomId) {
    socket.emit('leave-room', currentRoomId);
    currentRoomId = null;
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
  if (socket && currentRoomId && isOnlineMode) {
    lastSentMove = moveData;
    socket.emit('make-move', { roomId: currentRoomId, move: moveData });
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
        username: window.currentUser.username, 
        rating: window.currentUser.rating || 1500,
        socketId: (typeof socket !== 'undefined' && socket.id) ? socket.id : null
      })
    });
    const data = await res.json();
    
    if (data.success && data.matched) {
      window.isSearchingOpponent = false;
      if (typeof window.updateGameStatusText === 'function') {
        window.updateGameStatusText();
      }
      if (typeof window.applyMyColor === 'function') {
        window.applyMyColor(data.color);
      }
      if (statusEl) statusEl.style.display = 'none';
      window.currentRoomId = data.roomId;
      isOnlineMode = true;
      updateOnlineStatus(true);
      socket.emit('join-room', data.roomId);
      switchView('game');
      if (typeof startNewGame === 'function') startNewGame();
    } else if (data.success) {
      switchView('game');
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
      body: JSON.stringify({ username: window.currentUser.username })
    });
  } catch (err) {
    console.error('Matchmaking to\'xtatish xatoligi:', err);
  }
  
  const statusEl = document.getElementById('matchmakingStatus');
  if (statusEl) {
    statusEl.style.display = 'none';
  }
};

socket.on('draw-offered', () => {
  if (confirm('Raqib sizga durrang taklif qildi. Qabul qilasizmi?')) {
    socket.emit('accept-draw', { roomId: currentRoomId });
    if (typeof saveGameHistory === 'function') {
      saveGameHistory('draw', 'Raqib', 'Online');
    }
    if (typeof recordResult === 'function') {
      recordResult('draw');
    }
    alert('Durrang!');
  } else {
    socket.emit('decline-draw', { roomId: currentRoomId });
  }
});
