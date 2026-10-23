// 👥 Bir qurilmada ikki kishi (o'yin sahifasi → "👥 Bir qurilmada"): ikkala tomon bitta qurilmada navbat bilan yuradi.
// Serverga hech narsa yuborilmaydi, natija statistikaga yozilmaydi (board.js finishGame — window.localGameMode).
// board.js dagi umumiy o'zgaruvchilar (game, board, initialTime, timeIncrement, whiteTimeLeft, ...) bevosita ishlatiladi.
(function () {
  window.localGameMode = false;
  let clockStarted = false;
  let autoFlip = true;
  try { autoFlip = localStorage.getItem('justChessLocalFlip') !== '0'; } catch (e) {}

  const orientationFor = (color) => (color === 'b' ? 'black' : 'white');
  function faceSideToMove() {
    if (!autoFlip || !board || game.game_over()) return;
    if (board.orientation() !== orientationFor(game.turn()) && typeof window.flipBoard === 'function') window.flipBoard();
  }

  function renderFlipBtn() {
    const box = document.getElementById('inGameButtons');
    if (!box) return;
    let btn = document.getElementById('localFlipBtn');
    if (!window.localGameMode) { if (btn) btn.hidden = true; return; }
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'localFlipBtn';
      btn.className = 'control-btn';
      btn.addEventListener('click', () => {
        autoFlip = !autoFlip;
        try { localStorage.setItem('justChessLocalFlip', autoFlip ? '1' : '0'); } catch (e) {}
        renderFlipBtn();
        faceSideToMove();
      });
      box.appendChild(btn);
    }
    btn.hidden = false;
    btn.textContent = '🔄 ' + tx('localAutoFlip', 'Avto-aylantirish') + ': ' + (autoFlip ? tx('localOn', 'yoqilgan') : tx('localOff', "o'chiq"));
  }

  window.startLocalGame = function () {
    if (window.currentRoomId || window.isSearchingOpponent) {
      showToast(tx('localBusy', "Avval joriy o'yinni tugating"), 'warning');
      return;
    }
    window.localGameMode = true;
    window.myColor = null;
    clockStarted = false;
    const v = document.getElementById('variantToggle');
    const is960 = !!(v && v.checked && window.Chess960);
    window.setGameVariant(is960 ? 'chess960' : 'standard', is960 ? window.Chess960.randomStartFen() : null);
    setGameTime(initialTime);
    if (board && board.orientation() !== 'white' && typeof window.flipBoard === 'function') window.flipBoard();
    window.setOpponentFound(true);
    window.updatePlayerInfo('white', tx('whiteText', 'Oq'), '', false);
    window.updatePlayerInfo('black', tx('blackText', 'Qora'), '', false);
    // Bayroqlar kerak emas (bitta qurilma)
    ['whitePlayerFlag', 'blackPlayerFlag'].forEach((id) => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    renderFlipBtn();
    showToast(tx('localStarted', "Bir qurilmada o'yin: navbat bilan yuring. Soat birinchi yurishdan keyin yuradi."), 'info', 4000);
  };

  // Har yurishdan keyin: qo'shimcha soniya, soatni ishga tushirish, taxtani navbatdagi tomonga burish
  const origExecute = window.executeMove;
  if (typeof origExecute === 'function') {
    window.executeMove = function (source, target, promotion) {
      const mv = origExecute.apply(this, arguments);
      if (mv && window.localGameMode && !gameFinished) {
        if (timeIncrement) { if (mv.color === 'w') whiteTimeLeft += timeIncrement; else blackTimeLeft += timeIncrement; updateTimersDisplay(); }
        if (!clockStarted) { clockStarted = true; gameStarted = true; startTimer(); }
        setTimeout(faceSideToMove, 250);
      }
      return mv;
    };
  }

  // Durrang — ikkala o'yinchi rozi bo'lsa (bir qurilmada taklif yuborilmaydi)
  const origDraw = window.offerDraw;
  window.offerDraw = function () {
    if (!window.localGameMode) return origDraw.apply(this, arguments);
    if (gameFinished) return;
    if (confirm(tx('localDrawConfirm', "Ikkala o'yinchi durrangga rozimi?"))) window.finishGame(null, tx('gameDraw', 'Durrang!'), 'warning');
  };

  // Natija — ulashish (GIF) uchun; statistikaga yozilmaydi (board.js)
  const origFinish = window.finishGame;
  window.finishGame = function (winnerColor) {
    if (window.localGameMode) window.lastGameEnd = { winner: winnerColor || null, local: true };
    return origFinish.apply(this, arguments);
  };

  // "Yangi o'yin" — oddiy rejimga qaytish
  const origReset = window.resetToPreGame;
  window.resetToPreGame = function () {
    window.localGameMode = false;
    clockStarted = false;
    renderFlipBtn();
    const r = origReset.apply(this, arguments);
    if (typeof window.updateGameFlags === 'function') window.updateGameFlags();
    return r;
  };
})();
