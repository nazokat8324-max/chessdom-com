// O'yin turlari (klient): standart, 🎲 Chess960, 🏺 Shatranj — bitta joyda. chess960.js va shatranj.js dan keyin yuklanadi.
// newChessFor(variant, startFen) — o'yin obyekti (API chess.js bilan bir xil); startPlacementFor — taxta uchun joylashuv;
// variantLabel — belgili nom; variantAnalysable — Stockfish tahlili mumkinmi (Shatranj'da yo'q).
(function () {
  window.VARIANTS = ['standard', 'chess960', 'shatranj'];
  window.normVariant = (v) => (window.VARIANTS.includes(v) ? v : 'standard');
  window.newChessFor = function (variant, startFen) {
    if (variant === 'chess960' && window.Chess960 && startFen) return new window.Chess960(startFen);
    if (variant === 'shatranj' && window.Shatranj) return new window.Shatranj();
    return startFen && variant !== 'chess960' ? new Chess(startFen) : new Chess();
  };
  window.startPlacementFor = function (variant, startFen) {
    if (variant === 'chess960' && startFen) return startFen.split(' ')[0];
    if (variant === 'shatranj' && window.Shatranj) return window.Shatranj.START_FEN.split(' ')[0];
    return 'start';
  };
  window.variantIcon = (v) => ({ chess960: '🎲', shatranj: '🏺' }[v] || '♟');
  window.variantLabel = (v) => (v === 'chess960' ? '🎲 Chess960' : v === 'shatranj' ? '🏺 ' + tx('variantShatranj', 'Shatranj') : '♟ ' + tx('chStandard', 'Standart'));
  window.variantAnalysable = (v) => v !== 'shatranj';
  // PGN sarlavhalari (Variant, SetUp, FEN)
  window.variantPgnTags = function (variant, startFen) {
    if (variant === 'chess960' && startFen) return `[Variant "Chess960"]\n[SetUp "1"]\n[FEN "${startFen}"]\n`;
    if (variant === 'shatranj' && window.Shatranj) return `[Variant "Shatranj"]\n[SetUp "1"]\n[FEN "${window.Shatranj.START_FEN}"]\n`;
    return '';
  };
})();
