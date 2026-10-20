// 📳 Telefonda tebranish (navigator.vibrate — Android brauzerlari; iPhone Safari qo'llab-quvvatlamaydi):
// raqib yurishi, o'yin topilishi, chaqiruv kelishi, o'yin tugashi va vaqt 10 soniyadan kam qolganda.
// Sozlamalar → Ovoz va bildirishnomalar → "Tebranish" (justChessSettings.vibration, standart — yoqilgan).
(function () {
  const enabled = () => {
    try { return JSON.parse(localStorage.getItem('justChessSettings') || '{}').vibration !== false; } catch (e) { return true; }
  };
  window.haptic = function (pattern) {
    if (!enabled() || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try { navigator.vibrate(pattern); } catch (e) {}
  };

  const lowWarned = new Set(); // bir o'yinda bir marta
  document.addEventListener('DOMContentLoaded', () => {
    const origClock = window.applyClockUpdate;
    if (typeof origClock === 'function') {
      window.applyClockUpdate = function (data) {
        const r = origClock.apply(this, arguments);
        const my = window.myColor;
        const roomId = window.currentRoomId;
        if (data && my && roomId && data.running && data.turn === my && data[my] > 0 && data[my] < 10000 && !lowWarned.has(roomId)) {
          lowWarned.add(roomId);
          window.haptic([200, 100, 200]);
        }
        return r;
      };
    }
    if (typeof socket === 'undefined' || !socket) return;
    socket.on('opponent-move', () => window.haptic(35));
    socket.on('match-found', () => window.haptic([70, 50, 70]));
    socket.on('challenge-received', () => window.haptic([40, 40, 40]));
    socket.on('game-ended', () => window.haptic(150));
  });
})();
