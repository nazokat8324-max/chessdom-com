const sounds = {
  move: new Howl({ src: ['https://lichess1.org/assets/sound/standard/Move.ogg', 'https://lichess1.org/assets/sound/standard/Move.mp3'] }),
  capture: new Howl({ src: ['https://lichess1.org/assets/sound/standard/Capture.ogg', 'https://lichess1.org/assets/sound/standard/Capture.mp3'] }),
  check: new Howl({ src: ['https://lichess1.org/assets/sound/standard/Move.ogg', 'https://lichess1.org/assets/sound/standard/Move.mp3'] }),
  gameEnd: new Howl({ src: ['https://lichess1.org/assets/sound/standard/Victory.ogg', 'https://lichess1.org/assets/sound/standard/Victory.mp3'] })
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
