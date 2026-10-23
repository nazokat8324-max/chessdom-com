// Ovozlar saytning o'zida: tools/make-sounds.js bilan sintez qilingan (mualliflik huquqi loyihaniki).
// 2026-10-22 gacha lichess.org "standard" ovozlari ishlatilardi — ular lichess litsenziyasida "non-free".
// To'plamlar: assets/sounds/<to'plam>/ (tools/make-sounds.js PACKS bilan bir xil); standart — yog'och
window.SOUND_PACKS = ['wood', 'teahouse', 'marble', 'doira', 'retro', 'soft'];
const SOUND_FILES = { move: 'move', capture: 'capture', check: 'check', gameEnd: 'game-end' };
const sounds = {};
window.currentSoundPack = null;
function loadSoundPack(pack) {
  const name = window.SOUND_PACKS.includes(pack) ? pack : 'wood';
  if (name === window.currentSoundPack) return name;
  for (const [key, file] of Object.entries(SOUND_FILES)) {
    if (sounds[key]) sounds[key].unload();
    sounds[key] = new Howl({ src: ['assets/sounds/' + name + '/' + file + '.wav'] });
  }
  window.currentSoundPack = name;
  return name;
}
window.applySoundPack = loadSoundPack;

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
  loadSoundPack(saved.soundPack);
  window.applySoundToggle(saved.soundEnabled !== false);
  window.setSoundVolume(typeof saved.volume === 'number' ? saved.volume : 0.8);
};
window.applySavedSound();
