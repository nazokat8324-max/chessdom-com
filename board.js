let game = new Chess();

// O'yin varianti: 'standard' yoki 'chess960' (server match-found/game-resume da yuboradi; boshlang'ich FEN bilan)
window.currentVariant = 'standard';
window.currentStartFen = null;
function newGameInstance() {
  return window.currentVariant === 'chess960' && window.Chess960 && window.currentStartFen ? new Chess960(window.currentStartFen) : new Chess();
}
// chessboard.js uchun boshlang'ich joylashuv
function startPlacement() {
  return window.currentVariant === 'chess960' && window.currentStartFen ? window.currentStartFen.split(' ')[0] : 'start';
}
window.setGameVariant = function(variant, startFen) {
  const is960 = variant === 'chess960' && !!startFen;
  window.currentVariant = is960 ? 'chess960' : 'standard';
  window.currentStartFen = is960 ? startFen : null;
  game = newGameInstance();
  if (board) board.position(startPlacement(), false);
};
let board = null;

const whiteTimerElement = document.getElementById("whiteTimer");
const blackTimerElement = document.getElementById("blackTimer");
const historyListElement = document.getElementById("historyList");

let initialTime = 300,
  timeIncrement = 0,
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
  const newGameBtn = document.getElementById('btnPlayAgain');
  if (pre) pre.hidden = mode !== 'pre';
  if (inGame) inGame.hidden = mode === 'pre';
  const view = document.getElementById('gameView');
  if (view) {
    view.classList.remove('pg-mode-pre', 'pg-mode-in', 'pg-mode-over');
    view.classList.add('pg-mode-' + mode);
  }
  const playTitle = document.getElementById('pgPlayTitle');
  const movesTitle = document.getElementById('historyPanelHeader');
  if (playTitle) playTitle.hidden = mode !== 'pre';
  if (movesTitle) movesTitle.hidden = mode === 'pre';
  const friends = document.getElementById('pgFriends');
  if (friends && mode !== 'pre') friends.hidden = true;
  if (drawBtn) drawBtn.hidden = mode !== 'in';
  if (resignBtn) resignBtn.hidden = mode !== 'in';
  if (newGameBtn) newGameBtn.hidden = mode !== 'over';
  // Turnir o'yini tugaganda — "Turnir jadvaliga qaytish" tugmasi (keyingi tur o'zi boshlanadi)
  const tournamentBtn = document.getElementById('btnTournamentBack');
  if (tournamentBtn) tournamentBtn.hidden = !(mode === 'over' && window.lastGameSwiss);
  if (typeof window.updateRematchBox === 'function') window.updateRematchBox(mode);
  if (typeof window.updateGameChatBox === 'function') window.updateGameChatBox(mode);
  if (typeof window.updateAnalysisBox === 'function') window.updateAnalysisBox(mode);
  const ping = document.getElementById('pgPing');
  if (ping && mode !== 'in') ping.hidden = true;
};

window.resetToPreGame = function() {
  if (typeof leaveOnlineGame === 'function') leaveOnlineGame();
  window.setGameVariant('standard');
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
  if (!found) {
    if (typeof window.clearMyColor === 'function') window.clearMyColor();
    // Raqib qidirilayotganda oldingi raqib ma'lumoti (bayrog'i) ko'rinmasin
    if (typeof window.setOpponentData === 'function') window.setOpponentData(null);
  }
  if (board) {
    board.position(startPlacement());
  }
  if (typeof window.updateGameStatusText === 'function') {
    window.updateGameStatusText();
  }
};

window.updateGameStatusText = function() {
  const statusEl = document.getElementById('gameStatusText');
  if (statusEl) statusEl.textContent = '';
  refreshSearchOverlay();
};

// Raqib qidirilayotganda taxta ustida: vaqt nazorati, o'tgan vaqt va "Bekor qilish"
let searchTimer = null;
let searchStartedAt = 0;
function refreshSearchOverlay() {
  const overlay = document.getElementById('pgSearchOverlay');
  const searching = window.isSearchingOpponent === true && !opponentFound;
  const view = document.getElementById('gameView');
  if (view) view.classList.toggle('pg-searching', searching);
  const startBtn = document.getElementById('btnStartGame');
  if (startBtn) startBtn.disabled = searching;
  if (overlay) overlay.hidden = !searching;
  if (!searching) {
    clearInterval(searchTimer);
    searchTimer = null;
    searchStartedAt = 0;
    return;
  }
  if (!searchStartedAt) searchStartedAt = Date.now();
  const meta = document.getElementById('pgSearchMeta');
  const rated = document.getElementById('ratedToggle');
  if (meta) meta.textContent = `${Math.round(initialTime / 60)}+${timeIncrement} · ${(!rated || rated.checked) ? tx('ratedLabel', 'Reytingli') : tx('unratedLabel', 'Reytingsiz')}${(document.getElementById('variantToggle') || {}).checked ? ' · Chess960' : ''}`;
  const tick = () => {
    const el = document.getElementById('pgSearchTime');
    const s = Math.floor((Date.now() - searchStartedAt) / 1000);
    if (el) el.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  tick();
  if (!searchTimer) searchTimer = setInterval(tick, 1000);
}

window.cancelSearch = function() {
  if (typeof window.stopMatchmaking === 'function') window.stopMatchmaking();
};

window.myColor = null;

// O'yinchining o'z paneli doim pastda, raqibniki tepada bo'lishi uchun
// qora bilan o'ynaganda oq va qora panellar o'rni almashtiriladi
// ⇅ tugmasi bilan taxta aylantirilsa, panellar ham taxta bilan birga almashadi
window.boardFlipped = false;
function currentOrientation() {
  const base = window.myColor === 'b' ? 'black' : 'white';
  return window.boardFlipped ? (base === 'white' ? 'black' : 'white') : base;
}

function arrangePlayerBars() {
  const whiteBar = document.querySelector('#gameView .white-player');
  const blackBar = document.querySelector('#gameView .black-player');
  const boardWrapper = document.querySelector('#gameView .board-wrapper');
  if (!whiteBar || !blackBar || !boardWrapper) return;
  const [top, bottom] = currentOrientation() === 'black' ? [whiteBar, blackBar] : [blackBar, whiteBar];
  boardWrapper.before(top);
  boardWrapper.after(bottom);
}

function applyOrientation() {
  if (board && typeof board.orientation === 'function') board.orientation(currentOrientation());
  arrangePlayerBars();
  clearMoveHints();
  showPly();
}

window.applyMyColor = function(color) {
  window.myColor = (color === 'w' || color === 'b') ? color : null;
  window.boardFlipped = false;
  applyOrientation();
};

window.clearMyColor = function() {
  window.myColor = null;
  window.boardFlipped = false;
  applyOrientation();
};

window.flipBoard = function() {
  window.boardFlipped = !window.boardFlipped;
  applyOrientation();
};

window.currentGameTimeControl = 'blitz';

// Server bilan bir xil: taxminiy davomiylik = boshlang'ich + 40 × qo'shimcha soniya
function getGameModeFromTime(sec, increment) {
  const estimate = sec + 40 * (increment || 0);
  if (estimate < 180) return 'bullet';
  if (estimate < 480) return 'blitz';
  return 'rapid';
}

window.getSelectedClock = function() {
  return { initialTime, increment: timeIncrement };
};

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
  window.clearPremove();
  const myColor = window.myColor || 'w';
  const result = winnerColor === null ? 'draw' : (winnerColor === myColor ? 'win' : 'loss');
  const opponentName = window.myColor
    ? ((window.currentOpponent && window.currentOpponent.username) || tx('colOpponent', 'Raqib'))
    : tx('opponentLocal', 'Oq va Qora');
  if (whiteTimerElement) whiteTimerElement.classList.remove('warning');
  if (blackTimerElement) blackTimerElement.classList.remove('warning');
  saveGameHistory(result, opponentName, "Online o'yin");
  recordResult(result);
  updateTimersDisplay();
  if (message) showToast(message, toastType || 'info', 5000);
  // Doska va panellar "Yangi o'yin" bosilguncha o'yinchi tomonida qoladi
  window.setGamePanelMode('over');
};

// Server 'game-ended' bilan yuborgan reyting va statistikani profilga qo'llash
window.applyServerGameResult = function(data) {
  if (!data || !window.currentUser) return;
  if (data.stats) window.stats = { ...data.stats };
  if (data.statsByMode) window.statsByMode = data.statsByMode;
  if (typeof data.newRating === 'number') window.currentUser.rating = data.newRating;
  if (data.ratingsByMode) window.currentUser.ratingsByMode = data.ratingsByMode;
  window.currentUser.stats = window.stats;
  window.currentUser.statsByMode = window.statsByMode;
  localStorage.setItem("justChessCurrentUser", JSON.stringify(window.currentUser));
  updateStatsDisplay();
  if (typeof updateRatingDisplay === 'function') updateRatingDisplay();
  if (data.rated && typeof data.modeChange === 'number') {
    const change = data.modeChange >= 0 ? '+' + data.modeChange : String(data.modeChange);
    const modeRating = data.ratingsByMode && data.ratingsByMode[data.mode];
    showToast(tx('ratingChangeToast', 'Reyting: {{change}} ({{rating}})', { change, rating: modeRating || data.newRating }), 'info', 5000);
  }
};

// Serverdan kelgan soat holati (millisekund); taymer faqat server aytganda yuradi
window.applyClockUpdate = function(data) {
  if (!data) return;
  const lagMs = data.running ? Math.min(400, (window.clientRtt || 0) / 2) : 0;
  whiteTimeLeft = Math.max(0, (data.w - (data.turn === 'w' ? lagMs : 0)) / 1000);
  blackTimeLeft = Math.max(0, (data.b - (data.turn === 'b' ? lagMs : 0)) / 1000);
  updateTimersDisplay();
  if (data.running && !gameFinished) {
    gameStarted = true;
    startTimer();
  } else {
    clearInterval(timerInterval);
  }
};

// Yurishdan keyin (o'zimizning yoki raqibning) o'yin tugaganini tekshiradi.
window.checkGameOverAfterMove = function() {
  if (!game.game_over()) return;
  playSound('gameEnd');
  if (typeof confetti === 'function') {
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
  }
  if (game.in_checkmate()) {
    const winner = game.turn() === 'w' ? 'b' : 'w';
    const toastType = (window.myColor && window.myColor !== winner) ? 'error' : 'success';
    window.finishGame(winner, tx('gameCheckmate', "Shaxmat! O'yin tugadi."), toastType);
  } else {
    window.finishGame(null, tx('gameDraw', 'Durrang!'), 'warning');
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
  } else if (res === "loss") {
    window.stats.losses++;
    window.statsByMode[mode].losses++;
  } else if (res === "draw") {
    window.stats.draws++;
    window.statsByMode[mode].draws++;
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
  if (!confirm(tx('resetStatsConfirm', 'Haqiqatan ham statistikani tozalashni xohlaysizmi?'))) return;
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
  if (confirm(tx('drawOfferSendConfirm', 'Raqibga durrang taklifini yuborishni xohlaysizmi?'))) {
    if (typeof socket !== 'undefined' && window.currentRoomId) {
      socket.emit('offer-draw', { roomId: window.currentRoomId });
    }
    alert(tx('drawOfferSent', 'Durrang taklifi yuborildi!'));
  }
};

window.exportPGN = function() {
  if (!game || !game.history) {
    alert(tx('noMovesYet', "Hali hech qanday yurish yo'q!"));
    return;
  }
  
  const moves = game.history();
  if (moves.length === 0) {
    alert(tx('noMovesYet', "Hali hech qanday yurish yo'q!"));
    return;
  }
  
  let pgn = `[Event "Just Chess Game"]\n`;
  pgn += `[Date "${new Date().toISOString().split('T')[0].replace(/-/g, '.')}"]\n`;
  pgn += `[White "Player"]\n`;
  pgn += `[Black "Opponent"]\n`;
  if (window.currentVariant === 'chess960' && window.currentStartFen) {
    pgn += `[Variant "Chess960"]\n[SetUp "1"]\n[FEN "${window.currentStartFen}"]\n`;
  }
  
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
    // Server natijani o'zi saqlaydi (o'yin xonasi tugaganda)
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
        if (whiteTimeLeft < 20) {
          whiteTimerElement.classList.add("warning");
        }
      }
      if (blackTimerElement) blackTimerElement.classList.remove("active");
      if (whiteTimeLeft <= 0 && !window.currentRoomId) {
        window.finishGame('b', t.whiteTimeUp, 'error');
      }
    } else {
      blackTimeLeft = Math.max(0, blackTimeLeft - 0.2);
      if (blackTimerElement) {
        blackTimerElement.classList.add("active");
        blackTimerElement.classList.remove("warning");
        if (blackTimeLeft < 20) {
          blackTimerElement.classList.add("warning");
        }
      }
      if (whiteTimerElement) whiteTimerElement.classList.remove("active");
      if (blackTimeLeft <= 0 && !window.currentRoomId) {
        window.finishGame('w', t.blackTimeUp, 'error');
      }
    }
    updateTimersDisplay();
  }, 200);
}

function setGameTime(sec, btnElement, increment) {
  clearInterval(timerInterval);
  initialTime = whiteTimeLeft = blackTimeLeft = sec;
  // Tugma bosilganda yangi qo'shimcha soniya; ichki chaqiruvlarda avvalgisi saqlanadi
  if (btnElement || increment !== undefined) timeIncrement = increment || 0;
  gameStarted = false;
  gameFinished = false;
  game = newGameInstance();
  if (typeof window.clearAnalysis === 'function') window.clearAnalysis();
  closePromotionPicker();
  clearMoveHints();
  premove = null;
  premoveSelected = null;
  window.markLastMove(null, null);
  window.currentGameTimeControl = getGameModeFromTime(sec, timeIncrement);
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
  [whiteTimerElement, blackTimerElement].forEach(el => { if (el) el.classList.remove('warning'); });
  if (board) board.position(startPlacement());
}

window.startNewGame = function() {
  gameStarted = false;
  opponentFound = true;

  if (typeof window.setOpponentFound === 'function') {
    window.setOpponentFound(true);
  }

  if (board) {
    board.position(startPlacement());
  }

  if (typeof window.updateGameFlags === 'function') {
    window.updateGameFlags();
  }

  if (window.currentUser) {
    const opponent = window.currentOpponent || {};
    // Panelda shu o'yin yoziladigan rejim reytingi (rapid/blitz/bullet yoki chess960)
    const rm = window.currentRatingMode;
    const myByMode = window.currentUser.ratingsByMode || {};
    const oppByMode = window.opponentRatingsByMode || {};
    const me = { name: window.currentUser.username, rating: (rm && myByMode[rm]) || window.currentUser.rating || 1500 };
    const them = { name: opponent.username || tx('colOpponent', 'Raqib'), rating: (rm && oppByMode[rm]) || opponent.rating || 1500 };
    const [white, black] = window.myColor === 'b' ? [them, me] : [me, them];
    updatePlayerInfo('white', white.name, white.rating);
    updatePlayerInfo('black', black.name, black.rating);
  } else {
    updatePlayerInfo('white', tx('whiteText', 'Oq'), 1500);
    updatePlayerInfo('black', tx('blackText', 'Qora'), 1500);
  }
  setGameTime(initialTime);
};

function resignGame() {
  if (gameFinished) return;
  if (window.boardPrefs.confirmResign && !confirm(tx('resignConfirm', "Rostdan ham taslim bo'lasizmi?"))) return;
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
  if (window.currentRoomId) return;
  if (!game || game.history().length === 0) {
    showToast(tx('noMovesToUndo', "Qaytarish uchun yurishlar yo'q!"), 'warning');
    return;
  }
  
  game.undo();
  if (board) board.position(game.fen());
  updateHistory();
  showToast(tx('lastMoveUndone', 'Oxirgi yurish qaytarildi'), 'info');
};

// Chess960 tanlovi (reytingli o'yinlar alohida Chess960 reytingiga yoziladi)
window.toggleVariant = function() {
  refreshSearchOverlay();
};

window.toggleRated = function() {
  const toggle = document.getElementById('ratedToggle');
  const label = document.getElementById('ratedLabel');
  if (!toggle || !label) return;
  
  if (toggle.checked) {
    label.textContent = tx('ratedLabel', 'Reytingli');
  } else {
    label.textContent = tx('unratedLabel', 'Reytingsiz');
  }
};

// Til almashganda panellardagi "Reyting:" yorlig'ini qayta yozish (raqamni saqlagan holda)
window.refreshMoveList = function() { renderMoveList(); };

window.refreshPlayerInfoLabels = function() {
  ['white', 'black'].forEach(color => {
    const bar = document.querySelector(`#gameView .${color}-player`);
    const nameEl = document.getElementById(`${color}PlayerName`);
    if (bar && nameEl && bar.classList.contains('pg-waiting')) nameEl.textContent = tx('gpWaitingOpponent', 'Raqib kutilmoqda…');
  });
  const flip = document.getElementById('pgFlipBtn');
  if (flip) flip.title = tx('gpFlip', 'Taxtani aylantirish');
  if (typeof window.refreshSoundButton === 'function') window.refreshSoundButton();
  renderMoveList();
  refreshSearchOverlay();
};

window.updatePlayerInfo = function(color, name, rating) {
  const avatarEl = document.getElementById(`${color}PlayerAvatar`);
  const nameEl = document.getElementById(`${color}PlayerName`);
  const ratingEl = document.getElementById(`${color}PlayerRating`);
  // '⏳' — raqib hali topilmagan
  const waiting = rating === '⏳';
  const barEl = document.querySelector(`#gameView .${color}-player`);
  if (barEl) barEl.classList.toggle('pg-waiting', waiting);
  if (waiting) name = tx('gpWaitingOpponent', 'Raqib kutilmoqda…');
  
  if (avatarEl) {
    avatarEl.textContent = color === 'white' ? '♔' : '♚';
    const knownPlayer = !!name && [window.currentUser && window.currentUser.username, window.currentOpponent && window.currentOpponent.username].includes(name);
    if (knownPlayer && typeof window.avatarOverlay === 'function') avatarEl.insertAdjacentHTML('beforeend', window.avatarOverlay(name, window.myAvatarVersion(name)));
  }
  if (nameEl) {
    nameEl.textContent = name || (color === 'white' ? tx('whiteText', 'Oq') : tx('blackText', 'Qora'));
    // Haqiqiy o'yinchi (o'zimiz yoki raqib) bo'lsa — nomi ustiga bosib profilini ko'rish mumkin
    const known = [window.currentUser && window.currentUser.username, window.currentOpponent && window.currentOpponent.username];
    const isPlayer = !!name && known.includes(name);
    nameEl.classList.toggle('player-link', isPlayer);
    if (isPlayer) nameEl.dataset.username = name; else delete nameEl.dataset.username;
  }
  if (ratingEl) {
    ratingEl.dataset.rating = waiting ? '' : (rating || 1500);
    ratingEl.textContent = waiting ? '' : String(rating || 1500);
  }
  const rankEl = document.getElementById(`${color}PlayerRank`);
  if (rankEl) rankEl.innerHTML = waiting || typeof window.rankBadge !== 'function' ? '' : window.rankBadge(rating || 1500);
};

// --- Bosib yurish: tanlangan dona, yurish mumkin bo'lgan kataklar (nuqta / olish doirasi), oxirgi yurish ---
let selectedSquare = null;
let dragFromSelected = false;
let lastMove = null;

function boardSquare(sq) {
  const el = document.getElementById('chessBoard');
  return el ? el.querySelector('[data-square="' + sq + '"]') : null;
}

function clearMoveHints() {
  const el = document.getElementById('chessBoard');
  if (el) el.querySelectorAll('.sq-selected, .sq-hint, .sq-hint-capture').forEach(s => s.classList.remove('sq-selected', 'sq-hint', 'sq-hint-capture'));
  selectedSquare = null;
}
window.clearMoveHints = clearMoveHints;

function selectSquare(sq) {
  clearMoveHints();
  selectedSquare = sq;
  const own = boardSquare(sq);
  if (own) own.classList.add('sq-selected');
  game.moves({ square: sq, verbose: true }).forEach(m => {
    const target = boardSquare(m.to);
    if (target) target.classList.add(m.captured ? 'sq-hint-capture' : 'sq-hint');
  });
}

// Oxirgi yurish (o'zimizniki yoki raqibniki) — ikkala katak yengil sariq
window.markLastMove = function(from, to) {
  lastMove = from && to ? { from, to } : null;
  const el = document.getElementById('chessBoard');
  if (el) el.querySelectorAll('.sq-last').forEach(s => s.classList.remove('sq-last'));
  if (!lastMove) return;
  [from, to].forEach(sq => { const s = boardSquare(sq); if (s) s.classList.add('sq-last'); });
};

// Tarixdagi oxirgi yurish bo'yicha (masalan, yurish rad etilganda yoki o'yin tiklanganda)
window.refreshLastMove = function() {
  const h = game.history({ verbose: true });
  const m = h[h.length - 1];
  window.markLastMove(m ? m.from : null, m ? m.to : null);
};

// --- Piyoda oxirgi qatorga yetganda: farzin / rux / fil / otni tanlash ---
let promotionPending = false;

function isPromotionMove(source, target) {
  return game.moves({ square: source, verbose: true }).some(m => m.to === target && m.flags.indexOf('p') !== -1);
}

function closePromotionPicker() {
  const el = document.getElementById('promotionPicker');
  if (el) el.remove();
  promotionPending = false;
}

// Piyoda yetgan katakdan taxta markaziga qarab 4 ta dona ustuni (chess.com uslubida). Natija: 'q'|'r'|'b'|'n' yoki null
function askPromotion(target) {
  return new Promise(resolve => {
    closePromotionPicker();
    const squareEl = boardSquare(target);
    if (!squareEl) { resolve('q'); return; }
    promotionPending = true;
    const color = game.turn();
    const r = squareEl.getBoundingClientRect();
    const boardRect = document.getElementById('chessBoard').getBoundingClientRect();
    const downward = r.top - boardRect.top < boardRect.height / 2;
    const picker = document.createElement('div');
    picker.id = 'promotionPicker';
    picker.className = 'promo-picker';
    picker.style.left = r.left + 'px';
    picker.style.width = r.width + 'px';
    picker.style.top = (downward ? r.top : r.bottom - r.height * 4.5) + 'px';
    picker.classList.toggle('up', !downward);
    const pieces = ['q', 'n', 'r', 'b'];
    const names = { q: tx('promoQueen', 'Farzin'), r: tx('promoRook', 'Rux'), b: tx('promoBishop', 'Fil'), n: tx('promoKnight', 'Ot') };
    const order = downward ? pieces : pieces.slice().reverse();
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'promo-cancel';
    cancel.textContent = '✕';
    cancel.title = tx('arCancel', 'Bekor qilish');
    cancel.style.height = (r.height / 2) + 'px';
    const items = order.map(p => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'promo-piece';
      b.dataset.piece = p;
      b.title = names[p];
      b.style.height = r.height + 'px';
      b.innerHTML = '<img src="' + window.pieceUrl(color + p.toUpperCase()) + '" alt="' + names[p] + '">';
      return b;
    });
    (downward ? items.concat(cancel) : [cancel].concat(items)).forEach(el => picker.appendChild(el));
    const finish = (choice) => {
      document.removeEventListener('mousedown', outside, true);
      document.removeEventListener('keydown', onKey);
      closePromotionPicker();
      resolve(choice);
    };
    const outside = (e) => { if (!picker.contains(e.target)) { e.stopPropagation(); finish(null); } };
    const onKey = (e) => { if (e.key === 'Escape') finish(null); };
    picker.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      e.stopPropagation();
      finish(btn.dataset.piece || null);
    });
    document.body.appendChild(picker);
    setTimeout(() => {
      document.addEventListener('mousedown', outside, true);
      document.addEventListener('keydown', onKey);
    }, 0);
  });
}

// Piyoda yurishi bo'lsa — avval dona so'raladi, keyin yuriladi
async function promoteAndMove(source, target) {
  const choice = await askPromotion(target);
  clearMoveHints();
  if (!choice || gameFinished) return;
  if (executeMove(source, target, choice) && board) board.position(game.fen());
}

// Yurishni bajarish (sudrab tashlash ham, bosib yurish ham shu yerdan o'tadi)
function executeMove(source, target, promotion) {
  promotion = promotion || 'q';
  const move = game.move({ from: source, to: target, promotion });
  if (move === null) return null;
  clearMoveHints();
  window.markLastMove(move.from, move.to);
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

  const moveData = { from: source, to: target, promotion };
  if (typeof socket !== 'undefined' && typeof window.currentRoomId !== 'undefined' && window.currentRoomId) {
    sendMove(moveData);
  }

  window.checkGameOverAfterMove();
  return move;
}

// --- Premove: raqib o'ylayotganda yurishni oldindan belgilash (onlayn o'yinda) ---
let premove = null;          // { from, to }
let premoveSelected = null;  // premove uchun tanlangan dona katagi
let dragIsPremove = false;

function isPremoveTime() {
  return !!(window.myColor && window.currentRoomId && opponentFound && !gameFinished && game.turn() !== window.myColor);
}

function renderPremove() {
  const el = document.getElementById('chessBoard');
  if (el) el.querySelectorAll('.sq-premove, .sq-premove-sel').forEach(s => s.classList.remove('sq-premove', 'sq-premove-sel'));
  if (premoveSelected) { const s = boardSquare(premoveSelected); if (s) s.classList.add('sq-premove-sel'); }
  if (premove) [premove.from, premove.to].forEach(sq => { const s = boardSquare(sq); if (s) s.classList.add('sq-premove'); });
}

window.clearPremove = function() {
  premove = null;
  premoveSelected = null;
  renderPremove();
};

function setPremove(from, to) {
  premove = { from, to };
  premoveSelected = null;
  renderPremove();
}

// Raqib yurgandan keyin online.js chaqiradi: belgilangan yurish qonuniy bo'lsa — darhol bajariladi
window.tryPremove = function() {
  if (!premove) { if (premoveSelected) window.clearPremove(); return; }
  const { from, to } = premove;
  window.clearPremove();
  if (gameFinished || game.turn() !== window.myColor) return;
  const legal = game.moves({ square: from, verbose: true }).some(m => m.to === to);
  if (!legal) return;
  if (executeMove(from, to, 'q') && board) board.position(game.fen());
};

// O'ng tugma — premove bekor
document.addEventListener('contextmenu', (e) => {
  const boardEl = document.getElementById('chessBoard');
  if (!boardEl || !boardEl.contains(e.target) || (!premove && !premoveSelected)) return;
  e.preventDefault();
  window.clearPremove();
});

// Bo'sh katak yoki raqib donasini bosish: tanlangan dona shu yerga yuradi
document.addEventListener('click', (e) => {
  const boardEl = document.getElementById('chessBoard');
  if (!boardEl || !boardEl.contains(e.target)) return;
  const squareEl = e.target.closest('[data-square]');
  // Premove: o'z donamiz tanlangan, boshqa katak bosildi
  if (squareEl && premoveSelected && isPremoveTime()) {
    const target = squareEl.dataset.square;
    if (target === premoveSelected) return;
    const p = game.get(target);
    if (p && p.color === window.myColor) return; // boshqa o'z donasi — onDragStart tanladi
    setPremove(premoveSelected, target);
    return;
  }
  if (squareEl && premove && !premoveSelected) { window.clearPremove(); }
  if (!squareEl || !selectedSquare) return;
  const sq = squareEl.dataset.square;
  if (sq === selectedSquare) return;
  const legal = game.moves({ square: selectedSquare, verbose: true }).some(m => m.to === sq);
  if (!legal) {
    // O'z donamiz bo'lsa onDragStart uni tanlab bo'lgan; boshqa katak — tanlov bekor
    const p = game.get(sq);
    if (!p || p.color !== game.turn()) clearMoveHints();
    return;
  }
  if (isPromotionMove(selectedSquare, sq) && !window.boardPrefs.autoQueen) { promoteAndMove(selectedSquare, sq); return; }
  if (executeMove(selectedSquare, sq) && board) board.position(game.fen());
});

function onDragStart(source, piece, position, orientation) {
  if (viewPly !== null) { window.reviewMove('end'); return false; }
  if (selectedSquare && selectedSquare !== source && window.currentVariant === 'chess960' && !gameFinished) {
    const kingSq = selectedSquare;
    const castle = game.moves({ square: kingSq, verbose: true }).find(m => m.to === source && (m.flags === 'k' || m.flags === 'q'));
    if (castle) {
      setTimeout(() => { if (executeMove(kingSq, source) && board) board.position(game.fen()); }, 0);
      return false;
    }
  }
  if (game.game_over() || gameFinished || promotionPending) return false;

  // Raqib navbatida o'z donamiz — premove (yurish oldindan belgilanadi)
  dragIsPremove = false;
  if (window.myColor && piece.charAt(0) === window.myColor && isPremoveTime()) {
    clearMoveHints();
    dragFromSelected = premoveSelected === source;
    premoveSelected = source;
    premove = null;
    renderPremove();
    dragIsPremove = true;
    return true;
  }

  // Onlayn o'yinda faqat o'z donalarimizni va faqat o'z navbatimizda yuramiz
  if (window.myColor && (piece.charAt(0) !== window.myColor || game.turn() !== window.myColor)) {
    return false;
  }

  if (!opponentFound) {
    showToast(tx('waitingOpponentToast', 'Raqib topilishi kutilmoqda...'), 'warning', 2000);
    return false;
  }

  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }

  // Dona olinganda (bosilganda yoki sudrala boshlanganda) — yurish mumkin bo'lgan kataklar ko'rinadi
  dragFromSelected = selectedSquare === source;
  selectSquare(source);
}

function onDrop(source, target) {
  if (dragIsPremove) {
    dragIsPremove = false;
    if (source === target || target === 'offboard') {
      if (dragFromSelected) window.clearPremove();
      return 'snapback';
    }
    setPremove(source, target);
    return 'snapback';
  }
  // Joyida bosildi (sudralmadi): tanlov qoladi; ikkinchi marta bosilsa — bekor
  if (source === target || target === 'offboard') {
    if (dragFromSelected) clearMoveHints();
    return 'snapback';
  }
  if (isPromotionMove(source, target) && !window.boardPrefs.autoQueen) {
    // Tanlov oynasi ochiladi; dona tanlangach pozitsiya yangilanadi
    promoteAndMove(source, target);
    return 'snapback';
  }
  if (!executeMove(source, target)) {
    clearMoveHints();
    return 'snapback';
  }
}

function onSnapEnd() {
  board.position(game.fen());
}

// --- Donalar to'plami (Sozlamalar → Taxta) ---
// 'wikipedia' — loyihadagi rasmlar; qolganlari lichess'ning ochiq SVG to'plamlari
window.PIECE_SETS = ['wikipedia', 'cburnett', 'merida', 'alpha', 'california', 'staunty'];
window.currentPieceSet = 'wikipedia';
window.pieceUrl = function(code, set) {
  const s = set || window.currentPieceSet;
  if (s === 'wikipedia' || !window.PIECE_SETS.includes(s)) return 'img/chesspieces/wikipedia/' + code + '.png';
  return 'https://lichess1.org/assets/piece/' + s + '/' + code + '.svg';
};

// Taxta afzalliklari: nuqtalar, oxirgi yurish, avtomatik farzin, taslimdan oldin so'rash
window.boardPrefs = { showHints: true, showLastMove: true, autoQueen: false, confirmResign: true };
window.applyBoardPrefs = function(prefs) {
  window.boardPrefs = { ...window.boardPrefs, ...(prefs || {}) };
  document.documentElement.classList.toggle('hide-move-hints', !window.boardPrefs.showHints);
  document.documentElement.classList.toggle('hide-last-move', !window.boardPrefs.showLastMove);
};

let config = {
  draggable: true,
  position: 'start',
  pieceTheme: (piece) => window.pieceUrl(piece),
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
};

// Donalar to'plami o'zgarganda taxtani pozitsiya va tomonni saqlagan holda qayta chizamiz
window.applyPieceSet = function(set) {
  const next = window.PIECE_SETS.includes(set) ? set : 'wikipedia';
  if (next === window.currentPieceSet && board) return;
  window.currentPieceSet = next;
  if (!board || !document.getElementById('chessBoard')) return;
  const orientation = typeof board.orientation === 'function' ? board.orientation() : 'white';
  if (typeof board.destroy === 'function') board.destroy();
  board = Chessboard('chessBoard', { ...config, position: game.fen(), orientation });
  selectedSquare = null;
  showPly();
};

// Qayta ulanganda: o'yinni serverdagi yurishlar bo'yicha tiklash
window.loadServerPosition = function(moves) {
  game = newGameInstance();
  (moves || []).forEach(m => game.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' }));
  if (board) board.position(game.fen(), false);
  updateHistory();
  clearMoveHints();
  window.refreshLastMove();
};

// Har yurishdan keyin: jadval, olingan donalar; ko'rib chiqish rejimi tugaydi
function updateHistory() {
  viewPly = null;
  renderMoveList();
  renderMaterial(game.fen());
  const liveBtn = document.getElementById('pgLiveBtn');
  if (liveBtn) liveBtn.hidden = true;
}

// --- Yurishlar jadvali va ◀ ▶ ko'rib chiqish (viewPly: null — joriy pozitsiya, aks holda shu yurishgacha) ---
let viewPly = null;
window.getViewPly = () => viewPly;

function renderMoveList() {
  if (!historyListElement) return;
  const history = game.history();
  // Debyut nomi (ko'rilayotgan pozitsiya bo'yicha); Chess960 da — variant belgisi
  if (typeof window.renderOpeningInto === 'function') {
    window.renderOpeningInto(document.getElementById('pgOpening'), viewPly === null ? history : history.slice(0, viewPly), window.currentVariant);
  }
  if (!history.length) {
    historyListElement.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'pg-moves-empty';
    empty.textContent = tx('gpNoMoves', "Yurishlar hali yo'q");
    historyListElement.appendChild(empty);
    return;
  }
  const current = viewPly === null ? history.length : viewPly;
  const cell = (i) => i < history.length
    ? `<span class="pg-mv${i === current - 1 ? ' current' : ''}" data-ply="${i + 1}">${history[i]}${typeof window.analysisBadge === 'function' ? window.analysisBadge(i) : ''}</span>`
    : '<span></span>';
  let rows = '';
  for (let i = 0; i < history.length; i += 2) {
    rows += `<div class="pg-move-row"><span class="pg-move-no">${i / 2 + 1}.</span>${cell(i)}${cell(i + 1)}</div>`;
  }
  historyListElement.innerHTML = rows;
  if (viewPly === null) {
    historyListElement.scrollTop = historyListElement.scrollHeight;
  } else {
    const cur = historyListElement.querySelector('.pg-mv.current');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }
}

// Ko'rsatilayotgan pozitsiyani taxtaga chizish (oxirgi yurish, premove belgilari bilan)
function showPly() {
  if (!board) return;
  const liveBtn = document.getElementById('pgLiveBtn');
  if (viewPly === null) {
    board.position(game.fen(), false);
    window.refreshLastMove();
    renderPremove();
    renderMaterial(game.fen());
    if (liveBtn) liveBtn.hidden = true;
  } else {
    const h = game.history({ verbose: true });
    const replay = newGameInstance();
    for (let i = 0; i < viewPly; i++) replay.move({ from: h[i].from, to: h[i].to, promotion: h[i].promotion });
    board.position(replay.fen(), false);
    const m = h[viewPly - 1];
    window.markLastMove(m ? m.from : null, m ? m.to : null);
    renderMaterial(replay.fen());
    if (liveBtn) liveBtn.hidden = false;
  }
  renderMoveList();
  if (typeof window.onAnalysisPly === 'function') window.onAnalysisPly(viewPly === null ? game.history().length : viewPly);
}

window.reviewMove = function(target) {
  if (!board || promotionPending) return;
  const total = game.history().length;
  let cur = viewPly === null ? total : viewPly;
  if (target === 'start') cur = 0;
  else if (target === 'prev') cur -= 1;
  else if (target === 'next') cur += 1;
  else if (target === 'end') cur = total;
  else cur = Number(target) || 0;
  cur = Math.max(0, Math.min(total, cur));
  const next = cur >= total ? null : cur;
  if (next === viewPly) return;
  viewPly = next;
  clearMoveHints();
  showPly();
};

if (historyListElement) {
  historyListElement.addEventListener('click', (e) => {
    const mv = e.target.closest('.pg-mv');
    if (mv) window.reviewMove(Number(mv.dataset.ply));
  });
}

// --- Olingan donalar va moddiy ustunlik (+N) ---
const PIECE_VALUE = { q: 9, r: 5, b: 3, n: 3, p: 1 };
const START_COUNT = { q: 1, r: 2, b: 2, n: 2, p: 8 };
function renderMaterial(fen) {
  const counts = { w: { q: 0, r: 0, b: 0, n: 0, p: 0 }, b: { q: 0, r: 0, b: 0, n: 0, p: 0 } };
  // FEN joylashuvidan sanaymiz (Chess960 FEN ham bo'lishi mumkin)
  for (const ch of String(fen).split(' ')[0]) {
    const t = ch.toLowerCase();
    if (t in PIECE_VALUE) counts[ch === t ? 'b' : 'w'][t]++;
  }
  const material = (c) => Object.keys(PIECE_VALUE).reduce((sum, t) => sum + counts[c][t] * PIECE_VALUE[t], 0);
  const diff = material('w') - material('b');
  ['w', 'b'].forEach(color => {
    const el = document.getElementById(color === 'w' ? 'whiteCaptured' : 'blackCaptured');
    if (!el) return;
    const opp = color === 'w' ? 'b' : 'w';
    let html = '';
    Object.keys(PIECE_VALUE).forEach(t => {
      const n = Math.max(0, START_COUNT[t] - counts[opp][t]);
      if (n) html += '<span class="pg-cap-group">' + `<img src="${window.pieceUrl(opp + t.toUpperCase())}" alt="">`.repeat(n) + '</span>';
    });
    const adv = color === 'w' ? diff : -diff;
    if (adv > 0) html += `<span class="pg-adv">+${adv}</span>`;
    el.innerHTML = html;
  });
}

// --- Taxta o'lchami: kompyuterda ekran balandligiga, telefonda to'liq kenglikka moslashadi ---
let fittedSize = 0;
window.fitBoard = function() {
  const view = document.getElementById('gameView');
  const el = document.getElementById('chessBoard');
  if (!view || !el || !board || !view.classList.contains('active-view')) return;
  const layout = view.querySelector('.game-layout');
  const section = view.querySelector('.board-section');
  const panel = view.querySelector('.control-panel');
  if (!layout || !section || !panel) return;
  const ls = getComputedStyle(layout);
  const stacked = ls.flexDirection === 'column';
  const padX = parseFloat(ls.paddingLeft) + parseFloat(ls.paddingRight);
  const gap = parseFloat(ls.columnGap) || 0;
  const availW = layout.clientWidth - padX - (stacked ? 0 : panel.offsetWidth + gap);
  let size = availW;
  if (window.innerWidth > 768) {
    const bars = [...section.querySelectorAll('.player-bar')].reduce((sum, b) => sum + b.offsetHeight, 0);
    const rowGap = (parseFloat(getComputedStyle(section).rowGap) || 0) * 2;
    const top = layout.getBoundingClientRect().top + window.scrollY + parseFloat(ls.paddingTop);
    const availH = window.innerHeight - top - bars - rowGap - parseFloat(ls.paddingBottom) - 4;
    size = Math.min(availW, Math.max(availH, stacked ? 360 : 300));
  }
  // Kataklar butun pikselda: taxta = 8 × katak (+ chessboard.js chegarasi 4px)
  const square = Math.max(30, Math.min(100, Math.floor((size - 4) / 8)));
  const boardPx = square * 8 + 4;
  section.style.width = boardPx + 'px';
  panel.style.maxWidth = stacked ? boardPx + 'px' : '';
  if (boardPx !== fittedSize) {
    fittedSize = boardPx;
    el.style.setProperty('width', boardPx + 'px', 'important');
    el.style.setProperty('height', boardPx + 'px', 'important');
    board.resize();
    clearMoveHints();
    showPly();
  }
  panel.style.height = stacked ? '' : section.offsetHeight + 'px';
};
window.addEventListener('resize', debounce(() => window.fitBoard(), 80));
const switchViewBeforeFit = window.switchView;
if (typeof switchViewBeforeFit === 'function') {
  window.switchView = function(viewName) {
    const result = switchViewBeforeFit.apply(this, arguments);
    if (viewName === 'game') requestAnimationFrame(() => window.fitBoard());
    return result;
  };
}

// --- Ovoz tugmasi (Sozlamalardagi "Ovoz" bilan bir xil sozlama) ---
function readSettings() {
  try { return JSON.parse(localStorage.getItem('justChessSettings') || '{}'); } catch (e) { return {}; }
}
window.refreshSoundButton = function() {
  const btn = document.getElementById('pgSoundBtn');
  if (!btn) return;
  const on = readSettings().soundEnabled !== false;
  btn.textContent = on ? '🔊' : '🔇';
  btn.title = tx('gpSound', 'Ovoz') + ': ' + (on ? tx('gpSoundOn', 'Ovoz yoqildi') : tx('gpSoundOff', "Ovoz o'chirildi"));
};
window.toggleGameSound = function() {
  const s = readSettings();
  s.soundEnabled = s.soundEnabled === false;
  try { localStorage.setItem('justChessSettings', JSON.stringify(s)); } catch (e) {}
  if (typeof window.applySoundToggle === 'function') window.applySoundToggle(s.soundEnabled);
  window.refreshSoundButton();
  showToast(s.soundEnabled ? tx('gpSoundOn', 'Ovoz yoqildi') : tx('gpSoundOff', "Ovoz o'chirildi"), 'info', 1500);
};

// --- "Do'stni chaqirish": do'stlar ro'yxati (onlayn bo'lganlar tepada) ---
window.toggleFriendChallenge = async function() {
  const box = document.getElementById('pgFriends');
  if (!box) return;
  if (!box.hidden) { box.hidden = true; return; }
  if (!window.currentUser) { if (typeof showAuthGate === 'function') showAuthGate('login'); return; }
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const head = `<div class="pg-friends-head">${esc(tx('gpWhoToChallenge', 'Kimni chaqirasiz?'))}</div>`;
  box.innerHTML = head + '<div class="pg-friends-empty">…</div>';
  box.hidden = false;
  let friends = [];
  try {
    const d = await fetch('/api/friends', { headers: { 'Authorization': `Bearer ${window.authToken}` } }).then(r => r.json());
    friends = (d && d.success && d.friends) || [];
  } catch (e) {}
  friends.sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0) || String(a.username).localeCompare(String(b.username)));
  box.innerHTML = head + (friends.length ? friends.map(f => `
    <div class="pg-friend${f.online ? '' : ' offline'}">
      <span class="pg-fdot${f.online ? ' online' : ''}"></span>
      <span class="pg-friend-name player-link" data-username="${esc(f.username)}">${esc(f.username)}</span>
      <span class="pg-friend-rating">${esc(f.rating || 1500)}</span>
      <button type="button" class="control-btn" data-challenge="${esc(f.username)}"${f.online ? '' : ` disabled title="${esc(tx('gpOffline', 'oflayn'))}"`}>⚔️</button>
    </div>`).join('') : `<div class="pg-friends-empty">${esc(tx('gpNoFriends', "Hali do'stlaringiz yo'q. O'yinchi profilida \"Do'stlik so'rash\" tugmasini bosing."))}</div>`);
  box.querySelectorAll('[data-challenge]').forEach(btn => btn.addEventListener('click', () => {
    box.hidden = true;
    if (typeof window.openChallengeDialog === 'function') window.openChallengeDialog(btn.dataset.challenge);
  }));
};

document.addEventListener("DOMContentLoaded", () => {
  const lang = (typeof window.currentLang !== 'undefined') ? window.currentLang : 'uz';
  if (typeof window.setLanguage === 'function') window.setLanguage(lang);
  if (typeof window.updateStreakUI === 'function') window.updateStreakUI();
  updateStatsDisplay();
  updateTimersDisplay();
  
  if (document.getElementById("chessBoard")) {
    board = Chessboard('chessBoard', config);
    renderMoveList();
    renderMaterial(game.fen());
    window.refreshSoundButton();
    window.fitBoard();
  }
  
  sessionStorage.removeItem('chessGameState');
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
  
  // Xabar ichida foydalanuvchi nomi bo'lishi mumkin — HTML sifatida emas, matn sifatida qo'yiladi
  const icon = document.createElement('span');
  icon.textContent = icons[type] || 'ℹ';
  const text = document.createElement('span');
  text.textContent = message;
  toast.append(icon, text);
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

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  const gameViewEl = document.getElementById('gameView');
  if (gameViewEl && gameViewEl.classList.contains('active-view') && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const keys = { ArrowLeft: 'prev', ArrowRight: 'next', ArrowUp: 'start', ArrowDown: 'end' };
    if (keys[e.key] && game.history().length) {
      e.preventDefault();
      window.reviewMove(keys[e.key]);
      return;
    }
  }

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
