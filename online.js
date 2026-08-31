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

function createOnlineGame() {
  if (!socket.connected) {
    alert('Serverga ulanib bo\'lmadi!');
    return;
  }
  socket.emit('create-room');
}

function joinOnlineGame(roomId) {
  if (!socket.connected) {
    alert('Serverga ulanib bo\'lmadi!');
    return;
  }
  if (!roomId || roomId.trim() === '') {
    alert('Xona kodini kiriting!');
    return;
  }
  currentRoomId = roomId.trim().toUpperCase();
  socket.emit('join-room', currentRoomId);
}

function leaveOnlineGame() {
  if (currentRoomId) {
    socket.emit('leave-room', currentRoomId);
    currentRoomId = null;
  }
  if (peerConn) {
    peerConn.close();
    peerConn = null;
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

const peer = new Peer();
let peerConn = null;

peer.on('open', (id) => {
  console.log('Mening Peer ID raqamim: ' + id);
  const peerIdEl = document.getElementById('myPeerId');
  if (peerIdEl) {
    peerIdEl.textContent = id;
  }
});

peer.on('connection', (connection) => {
  peerConn = connection;
  console.log('PeerJS orqali do\'st ulandi!');
  
  peerConn.on('data', (data) => {
    handlePeerMove(data);
  });
  
  alert('Do\'stingiz PeerJS orqali ulandi!');
});

peer.on('error', (err) => {
  console.error('PeerJS xatolik:', err);
});

function connectToPeer(friendPeerId) {
  if (!peer || !peer.id) {
    alert('Peer hali tayyor emas, ozgina kuting...');
    return;
  }
  
  if (!friendPeerId || friendPeerId.trim() === '') {
    alert('Do\'stingizning Peer ID sini kiriting!');
    return;
  }
  
  if (currentRoomId) {
    socket.emit('leave-room', currentRoomId);
    currentRoomId = null;
  }
  
  peerConn = peer.connect(friendPeerId.trim());
  
  if (!peerConn) {
    alert('Ulanishni yaratib bo\'lmadi!');
    return;
  }

  peerConn.on('open', () => {
    console.log('PeerJS orqali muvaffaqiyatli ulandingiz!');
    alert('Do\'stingizga muvaffaqiyatli ulandingiz!');
    isOnlineMode = true;
    updateOnlineStatus(true);
    if (typeof startNewGame === 'function') startNewGame();
  });
  
  peerConn.on('data', (data) => {
    handlePeerMove(data);
  });
  
  peerConn.on('close', () => {
    isOnlineMode = false;
    updateOnlineStatus(false);
    peerConn = null;
  });
  
  peerConn.on('error', (err) => {
    console.error('PeerJS ulanish xatoligi:', err);
    isOnlineMode = false;
    updateOnlineStatus(false);
    peerConn = null;
  });
}

function sendMoveViaPeer(moveData) {
  if (peerConn && peerConn.open) {
    peerConn.send(moveData);
  }
}

function handlePeerMove(move) {
  if (typeof game !== 'undefined' && typeof board !== 'undefined') {
    game.move(move);
    board.position(game.fen());
    if (typeof updateHistory === 'function') {
      updateHistory();
    }
  }
}

window.showPeerModal = function() {
  const modal = document.getElementById('peerModal');
  if (modal) {
    modal.style.display = 'flex';
  }
};

window.hidePeerModal = function() {
  const modal = document.getElementById('peerModal');
  if (modal) {
    modal.style.display = 'none';
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
