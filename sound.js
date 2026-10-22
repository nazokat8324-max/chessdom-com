// Ovozlar saytning o'zida: tools/make-sounds.js bilan sintez qilingan (mualliflik huquqi loyihaniki).
// 2026-10-22 gacha lichess.org "standard" ovozlari ishlatilardi — ular lichess litsenziyasida "non-free".
const sounds = {
  move: new Howl({ src: ['assets/sounds/move.wav'] }),
  capture: new Howl({ src: ['assets/sounds/capture.wav'] }),
  check: new Howl({ src: ['assets/sounds/check.wav'] }),
  gameEnd: new Howl({ src: ['assets/sounds/game-end.wav'] })
};

function playSound(type) {
  if (Howler.ctx && Howler.ctx.state === 'suspended') {
    Howler.ctx.resume();
  }
  if (sounds[type]) {
    sounds[type].play();
  }
}

// Ovoz sozlamalari (Sozlamalar → Ovoz): o'chirish va balandlik barcha ovozlarga ta'sir qiladi
window.applySoundToggle = function(enabled) {
  Howler.mute(enabled === false);
  const btn = document.getElementById('pgSoundBtn');
  if (btn) btn.textContent = enabled === false ? '🔇' : '🔊';
};

window.setSoundVolume = function(volume) {
  const v = Math.min(1, Math.max(0, Number(volume)));
  if (!isNaN(v)) Howler.volume(v);
};

// Saqlangan sozlamalarni sahifa ochilganda qo'llash
window.applySavedSound = function() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('justChessSettings') || '{}'); } catch (e) {}
  window.applySoundToggle(saved.soundEnabled !== false);
  window.setSoundVolume(typeof saved.volume === 'number' ? saved.volume : 0.8);
};
window.applySavedSound();
