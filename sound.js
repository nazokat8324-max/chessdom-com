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
