const socket = io(window.location.origin);

let currentRoomId = null;
let isOnlineMode = false;

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

socket.on('room-joined', (roomId) => {
  currentRoomId = roomId;
  isOnlineMode = true;
  updateOnlineStatus(true);
  if (typeof startNewGame === 'function') startNewGame();
});

socket.on('waiting-for-opponent', (roomId) => {
  currentRoomId = roomId;
  alert('Raqib kutilmoqda...');
});

socket.on('opponent-connected', () => {
  alert('Raqib topildi! O\'yin boshlanishi...');
  if (typeof startNewGame === 'function') startNewGame();
});

socket.on('opponent-disconnected', () => {
  alert('Raqib ulanishni uzdi!');
  currentRoomId = null;
  isOnlineMode = false;
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
  if (typeof game !== 'undefined' && typeof board !== 'undefined') {
    game.move(move);
    board.position(game.fen());
    if (typeof updateHistory === 'function') {
      updateHistory();
    }
  }
});

function leaveOnlineGame() {
  if (currentRoomId) {
    socket.emit('leave-room', currentRoomId);
    currentRoomId = null;
  }
  isOnlineMode = false;
  updateOnlineStatus(false);
}

function sendMove(moveData) {
  if (socket && currentRoomId && isOnlineMode) {
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
    statusTextEl.textContent = online ? 'Online (Xonada)' : 'Lokal';
  }
};

window.handleStartGame = async function() {
  if (window.pendingOnlineMatchmaking) {
    window.pendingOnlineMatchmaking = false;
    await startMatchmaking();
  } else {
    if (typeof startNewGame === 'function') startNewGame();
  }
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
  
  try {
    const res = await fetch('/api/matchmaking/join', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.authToken}`
      },
      body: JSON.stringify({ 
        username: window.currentUser.username, 
        rating: window.currentUser.rating || 1500 
      })
    });
    const data = await res.json();
    
    if (data.success && data.matched) {
      if (statusEl) statusEl.style.display = 'none';
      alert(`Raqib topildi! Xona: ${data.roomId}`);
      window.currentRoomId = data.roomId;
      isOnlineMode = true;
      updateOnlineStatus(true);
      socket.emit('join-room', data.roomId);
      switchView('game');
      if (typeof startNewGame === 'function') startNewGame();
    } else if (data.success) {
      switchView('game');
      alert(`Navbatingiz: ${data.position}. Kuting...`);
    }
  } catch (err) {
    console.error('Matchmaking xatoligi:', err);
    alert('Matchmaking xatoligi yuz berdi!');
    if (statusEl) statusEl.style.display = 'none';
  }
};

window.stopMatchmaking = async function() {
  if (!window.currentUser) return;
  
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
