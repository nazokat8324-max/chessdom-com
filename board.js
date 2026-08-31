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

function recordResult(res) {
  if (res === "white_win") {
    window.stats.wins++;
    if (typeof updateRating === 'function') updateRating('win');
  } else if (res === "black_win") {
    window.stats.losses++;
    if (typeof updateRating === 'function') updateRating('loss');
  } else if (res === "draw") {
    window.stats.draws++;
    if (typeof updateRating === 'function') updateRating('draw');
  }
  updateStatsDisplay();
}

window.resetStats = function() {
  if (!confirm("Haqiqatan ham statistikalarni tozalashni xohlaysizmi?")) return;
  window.stats = { wins: 0, losses: 0, draws: 0 };
  if (window.currentUser) {
    window.currentUser.stats = window.stats;
    localStorage.setItem("justChessCurrentUser", JSON.stringify(window.currentUser));
    let users = JSON.parse(localStorage.getItem("justChessAllUsers")) || [];
    users = users.map((u) => u.username === window.currentUser.username ? window.currentUser : u);
    localStorage.setItem("justChessAllUsers", JSON.stringify(users));
  } else {
    localStorage.setItem("justChessGuestStats", JSON.stringify(window.stats));
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
    opponent: opponent || 'Lokal',
    mode: mode || 'Lokal o\'yin',
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
        opponent: opponent || 'Lokal',
        mode: mode || 'Lokal o\'yin',
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
        clearInterval(timerInterval);
        saveGameHistory("loss", "Oq va Qora (Lokal)", "Lokal o'yin");
        recordResult("black_win");
        alert(t.whiteTimeUp);
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
        clearInterval(timerInterval);
        saveGameHistory("win", "Oq va Qora (Lokal)", "Lokal o'yin");
        recordResult("white_win");
        alert(t.blackTimeUp);
      }
    }
    updateTimersDisplay();
  }, 200);
}

function setGameTime(sec, btnElement) {
  clearInterval(timerInterval);
  initialTime = whiteTimeLeft = blackTimeLeft = sec;
  gameStarted = false;
  game.reset();
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

function startNewGame() {
  if (window.currentUser) {
    updatePlayerInfo('white', window.currentUser.username, window.currentUser.rating || 1500);
    updatePlayerInfo('black', 'Raqib', 1500);
  } else {
    updatePlayerInfo('white', 'Oq', 1500);
    updatePlayerInfo('black', 'Qora', 1500);
  }
  setGameTime(initialTime);
}

function resignGame() {
  clearInterval(timerInterval);
  const lang = (typeof window.currentLang !== 'undefined') ? window.currentLang : 'uz';
  if (typeof translations === 'undefined') return;
  const t = translations[lang];
  const currentTurn = game.turn();
  const result = currentTurn === "w" ? "loss" : "win";
  saveGameHistory(result, "Oq va Qora (Lokal)", "Lokal o'yin");
  recordResult(currentTurn === "w" ? "black_win" : "white_win");
  alert(currentTurn === "w" ? t.whiteResigned : t.blackResigned);
}

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
  if (game.game_over()) return false;

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

  if (typeof sendMoveViaPeer === 'function' && typeof peerConn !== 'undefined' && peerConn && peerConn.open) {
    sendMoveViaPeer(moveData);
  }

  if (game.game_over()) {
    clearInterval(timerInterval);
    playSound('gameEnd');
    
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });
    }

    if (game.in_checkmate()) {
      const winner = game.turn() === 'w' ? "black_win" : "white_win";
      const result = game.turn() === 'w' ? "loss" : "win";
      saveGameHistory(result, "Oq va Qora (Lokal)", "Lokal o'yin");
      recordResult(winner);
      alert("Shaxmat! O'yin tugadi.");
    } else {
      saveGameHistory("draw", "Oq va Qora (Lokal)", "Lokal o'yin");
      recordResult("draw");
      alert("Durang!");
    }
  }
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
});
