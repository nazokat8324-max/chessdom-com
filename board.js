let game = new Chess();
let board = null;

const whiteTimerElement = document.getElementById("whiteTimer");
const blackTimerElement = document.getElementById("blackTimer");
const historyListElement = document.getElementById("historyList");

let initialTime = 300,
  whiteTimeLeft = 300,
  blackTimeLeft = 300;
let timerInterval = null;
let gameStarted = false;
let opponentFound = false;

// O'ng panel holati: 'pre' — vaqt tanlash va boshlash tugmasi,
// 'in' — yurishlar tarixi va Durrang/Taslim/PGN, 'over' — tarix, PGN va "Yangi o'yin"
window.setGamePanelMode = function(mode) {
  const pre = document.getElementById('preGameControls');
  const inGame = document.getElementById('inGameControls');
  const drawBtn = document.getElementById('btnDraw');
  const resignBtn = document.getElementById('btnResign');
  const newGameBtn = document.getElementById('btnNewGame');
  if (pre) pre.hidden = mode !== 'pre';
  if (inGame) inGame.hidden = mode === 'pre';
  if (drawBtn) drawBtn.hidden = mode !== 'in';
  if (resignBtn) resignBtn.hidden = mode !== 'in';
  if (newGameBtn) newGameBtn.hidden = mode !== 'over';
};

window.resetToPreGame = function() {
  if (typeof leaveOnlineGame === 'function') leaveOnlineGame();
  setGameTime(initialTime);
  window.setOpponentFound(false);
};

window.isGameInProgress = function() {
  return opponentFound && !gameFinished;
};

// Natija yozmasdan o'yinni to'xtatish (masalan, raqib ulanishni uzganda)
window.abortGame = function() {
  gameFinished = true;
  clearInterval(timerInterval);
  window.setGamePanelMode('over');
};

window.setOpponentFound = function(found) {
  opponentFound = found;
  window.setGamePanelMode(found ? 'in' : 'pre');
  if (!found && typeof window.clearMyColor === 'function') window.clearMyColor();
  if (board) {
    board.position('start');
  }
  if (typeof window.updateGameStatusText === 'function') {
    window.updateGameStatusText();
  }
};

window.updateGameStatusText = function() {
  const statusEl = document.getElementById('gameStatusText');
  if (!statusEl) return;
  const searching = window.isSearchingOpponent === true;
  if (!searching || opponentFound) {
    statusEl.textContent = '';
    return;
  }
  statusEl.textContent = (typeof i18next !== 'undefined' && i18next.isInitialized)
    ? i18next.t('opponentStatusSearching', { defaultValue: 'Qidirilmoqda...' })
    : 'Qidirilmoqda...';
};

window.myColor = null;

// O'yinchining o'z paneli doim pastda, raqibniki tepada bo'lishi uchun
// qora bilan o'ynaganda oq va qora panellar o'rni almashtiriladi
function arrangePlayerBars() {
  const whiteBar = document.querySelector('#gameView .white-player');
  const blackBar = document.querySelector('#gameView .black-player');
  const boardWrapper = document.querySelector('#gameView .board-wrapper');
  if (!whiteBar || !blackBar || !boardWrapper) return;
  const [top, bottom] = window.myColor === 'b' ? [whiteBar, blackBar] : [blackBar, whiteBar];
  boardWrapper.before(top);
  boardWrapper.after(bottom);
}

window.applyMyColor = function(color) {
  window.myColor = (color === 'w' || color === 'b') ? color : null;
  if (board && typeof board.orientation === 'function') {
    board.orientation(window.myColor === 'b' ? 'black' : 'white');
  }
  arrangePlayerBars();
};

window.clearMyColor = function() {
  window.myColor = null;
  if (board && typeof board.orientation === 'function') {
    board.orientation('white');
  }
  arrangePlayerBars();
};

window.currentGameTimeControl = 'blitz';

function getGameModeFromTime(sec) {
  if (sec <= 120) return 'bullet';
  if (sec <= 300) return 'blitz';
  return 'rapid';
}

function updateStatsDisplay() {
  const sWins = document.getElementById("statWins");
  const sLosses = document.getElementById("statLosses");
  const sDraws = document.getElementById("statDraws");

  if (sWins) sWins.textContent = window.stats.wins;
  if (sLosses) sLosses.textContent = window.stats.losses;
  if (sDraws) sDraws.textContent = window.stats.draws;

  if (typeof window.currentUser !== 'undefined' && window.currentUser) {
    window.currentUser.stats = window.stats;
    localStorage.setItem("justChessCurrentUser", JSON.stringify(window.currentUser));
    let users = JSON.parse(localStorage.getItem("justChessAllUsers")) || [];
    users = users.map((u) => u.username === window.currentUser.username ? window.currentUser : u);
    localStorage.setItem("justChessAllUsers", JSON.stringify(users));
  } else {
    localStorage.setItem("justChessGuestStats", JSON.stringify(window.stats));
  }
}

let gameFinished = false;

// O'yinni yakunlaydi va natijani o'yinchining o'z nuqtai nazaridan saqlaydi.
// winnerColor: 'w' | 'b' | null (durrang). Onlayn bo'lmagan o'yinda oq tomondan hisoblanadi.
window.finishGame = function(winnerColor, message, toastType) {
  if (gameFinished) return;
  gameFinished = true;
  clearInterval(timerInterval);
  const myColor = window.myColor || 'w';
  const result = winnerColor === null ? 'draw' : (winnerColor === myColor ? 'win' : 'loss');
  const opponentName = window.myColor
    ? ((window.currentOpponent && window.currentOpponent.username) || 'Raqib')
    : 'Oq va Qora';
  saveGameHistory(result, opponentName, "Online o'yin");
  recordResult(result);
  if (message) showToast(message, toastType || 'info', 5000);
  // Doska va panellar "Yangi o'yin" bosilguncha o'yinchi tomonida qoladi
  window.setGamePanelMode('over');
};

// Yurishdan keyin (o'zimizning yoki raqibning) o'yin tugaganini tekshiradi.
window.checkGameOverAfterMove = function() {
  if (!game.game_over()) return;
  playSound('gameEnd');
  if (typeof confetti === 'function') {
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
  }
  if (game.in_checkmate()) {
    window.finishGame(game.turn() === 'w' ? 'b' : 'w', "Shaxmat! O'yin tugadi.", 'success');
  } else {
    window.finishGame(null, "Durang!", 'warning');
  }
};

function recordResult(res) {
  if (!window.statsByMode) {
    window.statsByMode = {
      rapid: { wins: 0, losses: 0, draws: 0 },
      blitz: { wins: 0, losses: 0, draws: 0 },
      bullet: { wins: 0, losses: 0, draws: 0 }
    };
  }
  const mode = window.currentGameTimeControl;
  if (!window.statsByMode[mode]) {
    window.statsByMode[mode] = { wins: 0, losses: 0, draws: 0 };
  }

  if (res === "win") {
    window.stats.wins++;
    window.statsByMode[mode].wins++;
    if (typeof updateRating === 'function') updateRating('win');
  } else if (res === "loss") {
    window.stats.losses++;
    window.statsByMode[mode].losses++;
    if (typeof updateRating === 'function') updateRating('loss');
  } else if (res === "draw") {
    window.stats.draws++;
    window.statsByMode[mode].draws++;
    if (typeof updateRating === 'function') updateRating('draw');
  }
  updateStatsDisplay();
  if (window.currentUser) {
    window.currentUser.statsByMode = window.statsByMode;
    localStorage.setItem("justChessCurrentUser", JSON.stringify(window.currentUser));
    let users = JSON.parse(localStorage.getItem("justChessAllUsers")) || [];
    users = users.map((u) => u.username === window.currentUser.username ? window.currentUser : u);
    localStorage.setItem("justChessAllUsers", JSON.stringify(users));
  } else {
    localStorage.setItem("justChessStatsByMode", JSON.stringify(window.statsByMode));
  }
}

window.resetStats = function() {
  if (!confirm("Haqiqatan ham statistikalarni tozalashni xohlaysizmi?")) return;
  window.stats = { wins: 0, losses: 0, draws: 0 };
  window.statsByMode = {
    rapid: { wins: 0, losses: 0, draws: 0 },
    blitz: { wins: 0, losses: 0, draws: 0 },
    bullet: { wins: 0, losses: 0, draws: 0 }
  };
  if (window.currentUser) {
    window.currentUser.stats = window.stats;
    window.currentUser.statsByMode = window.statsByMode;
    localStorage.setItem("justChessCurrentUser", JSON.stringify(window.currentUser));
    let users = JSON.parse(localStorage.getItem("justChessAllUsers")) || [];
    users = users.map((u) => u.username === window.currentUser.username ? window.currentUser : u);
    localStorage.setItem("justChessAllUsers", JSON.stringify(users));
  } else {
    localStorage.setItem("justChessGuestStats", JSON.stringify(window.stats));
    localStorage.setItem("justChessStatsByMode", JSON.stringify(window.statsByMode));
  }
  updateStatsDisplay();
  updateRatingDisplay();
};

window.offerDraw = function() {
  if (confirm('Raqibga durrang taklifini yuborishni xohlaysizmi?')) {
    if (typeof socket !== 'undefined' && window.currentRoomId) {
      socket.emit('offer-draw', { roomId: window.currentRoomId });
    }
    alert('Durrang taklifi yuborildi!');
  }
};

window.exportPGN = function() {
  if (!game || !game.history) {
    alert('Hech qanday yurish yo\'q!');
    return;
  }
  
  const moves = game.history();
  if (moves.length === 0) {
    alert('Hech qanday yurish yo\'q!');
    return;
  }
  
  let pgn = `[Event "Just Chess Game"]\n`;
  pgn += `[Date "${new Date().toISOString().split('T')[0].replace(/-/g, '.')}"]\n`;
  pgn += `[White "Player"]\n`;
  pgn += `[Black "Opponent"]\n`;
  
  let pgnMoves = [];
  for (let i = 0; i < moves.length; i += 2) {
    pgnMoves.push(`${Math.floor(i / 2) + 1}. ${moves[i]}`);
    if (moves[i + 1]) {
      pgnMoves.push(moves[i + 1]);
    }
  }
  
  pgn += `\n${pgnMoves.join(' ')}`;
  
  const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chess_game_${Date.now()}.pgn`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

function saveGameHistory(result, opponent, mode) {
  const gameRecord = {
    date: new Date().toLocaleDateString(),
    result: result,
    opponent: opponent || 'Online',
    mode: mode || 'Online o\'yin',
    timeControl: window.currentGameTimeControl || 'blitz',
    moves: game.history()
  };

  if (window.currentUser) {
    if (!window.currentUser.history) {
      window.currentUser.history = [];
    }
    window.currentUser.history.push(gameRecord);
    localStorage.setItem("justChessCurrentUser", JSON.stringify(window.currentUser));

    // Foydalanuvchi uchun alohida tarix (klub statistikasi uchun)
    const userHistoryKey = "justChessGameHistory_" + window.currentUser.username;
    let userHistory = JSON.parse(localStorage.getItem(userHistoryKey) || "[]");
    userHistory.push(gameRecord);
    localStorage.setItem(userHistoryKey, JSON.stringify(userHistory));

    let users = JSON.parse(localStorage.getItem("justChessAllUsers")) || [];
    users = users.map((u) => u.username === window.currentUser.username ? window.currentUser : u);
    localStorage.setItem("justChessAllUsers", JSON.stringify(users));

    const headers = { 'Content-Type': 'application/json' };
    if (window.authToken) {
      headers['Authorization'] = `Bearer ${window.authToken}`;
    }
    fetch('/api/games', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        result: result,
        opponent: opponent || 'Online',
        mode: mode || 'Online o\'yin',
        timeControl: window.currentGameTimeControl || 'blitz',
        moves: game.history()
      })
    }).catch(err => console.error('Game save xatoligi:', err));
  } else {
    let guestHistory = JSON.parse(localStorage.getItem("justChessGameHistory")) || [];
    guestHistory.push(gameRecord);
    localStorage.setItem("justChessGameHistory", JSON.stringify(guestHistory));
  }
}

function formatTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

function updateTimersDisplay() {
  const lang = (typeof window.currentLang !== 'undefined') ? window.currentLang : 'uz';
  if (typeof translations === 'undefined') return;
  
  if (whiteTimerElement) {
    whiteTimerElement.textContent = formatTime(Math.max(0, Math.ceil(whiteTimeLeft)));
  }
  if (blackTimerElement) {
    blackTimerElement.textContent = formatTime(Math.max(0, Math.ceil(blackTimeLeft)));
  }
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const lang = (typeof window.currentLang !== 'undefined') ? window.currentLang : 'uz';
    if (typeof translations === 'undefined') return;
    const t = translations[lang];
    
    if (game.turn() === "w") {
      whiteTimeLeft = Math.max(0, whiteTimeLeft - 0.2);
      if (whiteTimerElement) {
        whiteTimerElement.classList.add("active");
        whiteTimerElement.classList.remove("warning");
        if (whiteTimeLeft < 30) {
          whiteTimerElement.classList.add("warning");
        }
      }
      if (blackTimerElement) blackTimerElement.classList.remove("active");
      if (whiteTimeLeft <= 0) {
        window.finishGame('b', t.whiteTimeUp, 'error');
      }
    } else {
      blackTimeLeft = Math.max(0, blackTimeLeft - 0.2);
      if (blackTimerElement) {
        blackTimerElement.classList.add("active");
        blackTimerElement.classList.remove("warning");
        if (blackTimeLeft < 30) {
          blackTimerElement.classList.add("warning");
        }
      }
      if (whiteTimerElement) whiteTimerElement.classList.remove("active");
      if (blackTimeLeft <= 0) {
        window.finishGame('w', t.blackTimeUp, 'error');
      }
    }
    updateTimersDisplay();
  }, 200);
}

function setGameTime(sec, btnElement) {
  clearInterval(timerInterval);
  initialTime = whiteTimeLeft = blackTimeLeft = sec;
  gameStarted = false;
  gameFinished = false;
  halfMoveClock = 0;
  positionHistory = [];
  game.reset();
  window.currentGameTimeControl = getGameModeFromTime(sec);
  updateTimersDisplay();
  updateHistory();
  
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  if (btnElement) {
    btnElement.classList.add('active');
  }
  
  if (whiteTimerElement) whiteTimerElement.classList.add("active");
  if (blackTimerElement) blackTimerElement.classList.remove("active");
  if (board) board.position('start');
}

window.startNewGame = function() {
  gameStarted = false;
  opponentFound = true;

  if (typeof window.setOpponentFound === 'function') {
    window.setOpponentFound(true);
  }

  if (board) {
    board.position('start');
  }

  if (typeof window.updateGameFlags === 'function') {
    window.updateGameFlags();
  }

  if (window.currentUser) {
    const opponent = window.currentOpponent || {};
    const me = { name: window.currentUser.username, rating: window.currentUser.rating || 1500 };
    const them = { name: opponent.username || 'Raqib', rating: opponent.rating || 1500 };
    const [white, black] = window.myColor === 'b' ? [them, me] : [me, them];
    updatePlayerInfo('white', white.name, white.rating);
    updatePlayerInfo('black', black.name, black.rating);
  } else {
    updatePlayerInfo('white', 'Oq', 1500);
    updatePlayerInfo('black', 'Qora', 1500);
  }
  setGameTime(initialTime);
};

function resignGame() {
  if (gameFinished) return;
  const lang = (typeof window.currentLang !== 'undefined') ? window.currentLang : 'uz';
  if (typeof translations === 'undefined') return;
  const t = translations[lang];
  // Onlayn o'yinda taslim bo'lgan — o'zimiz, aks holda navbatdagi tomon
  const loser = window.myColor || game.turn();
  const winner = loser === 'w' ? 'b' : 'w';
  if (typeof socket !== 'undefined' && window.currentRoomId) {
    socket.emit('game-over', { roomId: window.currentRoomId, result: { type: 'resign', winner } });
  }
  window.finishGame(winner, loser === 'w' ? t.whiteResigned : t.blackResigned, 'error');
}

window.undoMove = function() {
  if (!game || game.history().length === 0) {
    showToast('Qaytarish uchun yurishlar yo\'q!', 'warning');
    return;
  }
  
  game.undo();
  if (board) board.position(game.fen());
  updateHistory();
  saveGameState();
  showToast('Oxirgi yurish qaytarildi', 'info');
};

window.toggleRated = function() {
  const toggle = document.getElementById('ratedToggle');
  const label = document.getElementById('ratedLabel');
  if (!toggle || !label) return;
  
  if (toggle.checked) {
    label.textContent = 'Reytingli';
  } else {
    label.textContent = 'Reytingsiz';
  }
};

window.updatePlayerInfo = function(color, name, rating) {
  const avatarEl = document.getElementById(`${color}PlayerAvatar`);
  const nameEl = document.getElementById(`${color}PlayerName`);
  const ratingEl = document.getElementById(`${color}PlayerRating`);
  
  if (avatarEl) {
    avatarEl.textContent = color === 'white' ? '♔' : '♚';
  }
  if (nameEl) {
    nameEl.textContent = name || (color === 'white' ? 'Oq' : 'Qora');
  }
  if (ratingEl) {
    ratingEl.textContent = `Reyting: ${rating || 1500}`;
  }
};

function onDragStart(source, piece, position, orientation) {
  if (game.game_over() || gameFinished) return false;

  // Onlayn o'yinda faqat o'z donalarimizni va faqat o'z navbatimizda yuramiz
  if (window.myColor && (piece.charAt(0) !== window.myColor || game.turn() !== window.myColor)) {
    return false;
  }

  if (!opponentFound) {
    showToast('Raqib topilishi kutilmoqda...', 'warning', 2000);
    return false;
  }

  if (!gameStarted) {
    gameStarted = true;
    startTimer();
  }

  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
}

function onDrop(source, target) {
  let move = game.move({
    from: source,
    to: target,
    promotion: 'q'
  });

  if (move === null) return 'snapback';

  try {
    if (game.in_checkmate()) {
      playSound('gameEnd');
    } else if (game.in_check()) {
      playSound('check');
    } else if (move.captured) {
      playSound('capture');
    } else {
      playSound('move');
    }
  } catch (e) {
    console.log("Ovoz chiqarishda xatolik:", e);
  }

  updateHistory();

  let moveData = { from: source, to: target, promotion: 'q' };

  if (typeof socket !== 'undefined' && typeof window.currentRoomId !== 'undefined' && window.currentRoomId) {
    sendMove(moveData);
  }

  window.checkGameOverAfterMove();
}

function onSnapEnd() {
  board.position(game.fen());
}

let config = {
  draggable: true,
  position: 'start',
  pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
};

function updateHistory() {
  if (!historyListElement) return;
  historyListElement.innerHTML = "";
  const history = game.history();
  
  for (let i = 0; i < history.length; i += 2) {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.marginBottom = "4px";
    row.innerHTML = `<span>${Math.floor(i / 2) + 1}. ${history[i]}</span><span>${history[i + 1] || ""}</span>`;
    historyListElement.appendChild(row);
  }
  historyListElement.scrollTop = historyListElement.scrollHeight;
}

document.addEventListener("DOMContentLoaded", () => {
  const lang = (typeof window.currentLang !== 'undefined') ? window.currentLang : 'uz';
  if (typeof window.setLanguage === 'function') window.setLanguage(lang);
  if (typeof window.updateStreakUI === 'function') window.updateStreakUI();
  updateStatsDisplay();
  updateTimersDisplay();
  
  if (document.getElementById("chessBoard")) {
    board = Chessboard('chessBoard', config);
  }
  
  restoreGameState();
});

// Toast notification system
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };
  
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

// Game state preservation
function saveGameState() {
  if (!game || !board) return;
  
  const state = {
    fen: game.fen(),
    history: game.history(),
    whiteTime: whiteTimeLeft,
    blackTime: blackTimeLeft,
    initialTime: initialTime,
    gameStarted: gameStarted,
    timestamp: Date.now()
  };
  
  sessionStorage.setItem('chessGameState', JSON.stringify(state));
}

function restoreGameState() {
  const saved = sessionStorage.getItem('chessGameState');
  if (!saved) return;
  
  try {
    const state = JSON.parse(saved);
    const timeDiff = Date.now() - state.timestamp;
    
    if (timeDiff < 3600000 && state.fen) {
      game.load(state.fen);
      if (board) board.position(state.fen);
      
      whiteTimeLeft = state.whiteTime || 300;
      blackTimeLeft = state.blackTime || 300;
      initialTime = state.initialTime || 300;
      gameStarted = state.gameStarted || false;
      
      updateTimersDisplay();
      
      if (gameStarted) {
        window.setGamePanelMode('in');
        startTimer();
      }

      if (state.history && state.history.length > 0) {
        updateHistory();
      }
      
      showToast('O\'yin holati tiklandi', 'success');
    } else {
      sessionStorage.removeItem('chessGameState');
    }
  } catch (e) {
    console.error('Game state restore error:', e);
    sessionStorage.removeItem('chessGameState');
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  if (e.key === 'Escape') {
    const modals = document.querySelectorAll('[style*="display: flex"], [style*="display: block"]');
    modals.forEach(modal => {
      if (modal.id && (modal.id.includes('Modal') || modal.id.includes('modal'))) {
        modal.style.display = 'none';
      }
    });
  }
  
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'z':
        e.preventDefault();
        if (typeof undoMove === 'function') undoMove();
        break;
      case 'r':
        e.preventDefault();
        switchView('leaderboard');
        break;
    }
  }
});

// 50-move rule and 3-fold repetition
let halfMoveClock = 0;
let positionHistory = [];

const originalOnSnapEnd = onSnapEnd;
onSnapEnd = function() {
  originalOnSnapEnd();
  
  const history = game.history();
  if (history.length > 0 && (history[history.length - 1].includes('x') || history[history.length - 1].includes('O-O'))) {
    halfMoveClock = 0;
  } else {
    halfMoveClock++;
  }
  
  const fen = game.fen();
  positionHistory.push(fen);
  const repetitions = positionHistory.filter(pos => pos === fen).length;
  
  if (halfMoveClock >= 100) {
    window.finishGame(null, '50 harakat qoidasi: Durrang!', 'warning');
  } else if (repetitions >= 3) {
    window.finishGame(null, '3 ta takroranish: Durrang!', 'warning');
  }
  
  saveGameState();
};

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
