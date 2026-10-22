#!/usr/bin/env node
// Sayt ovozlarini sintez qiladi → assets/sounds/*.wav (22 050 Hz, mono, 16-bit).
//   node tools/make-sounds.js
// Ovozlar to'liq dastur bilan yaratilgan — begona yozuv ishlatilmagan, mualliflik huquqi loyihaniki.
// (2026-10-22 gacha lichess.org "standard" ovozlari ishlatilardi — ular lichess litsenziyasida "non-free".)
const fs = require('fs');
const path = require('path');

const RATE = 22050;
const OUT = path.join(__dirname, '..', 'assets', 'sounds');

// Takrorlanadigan "tasodifiy" shovqin (har safar bir xil fayl chiqsin)
let seed = 12345;
const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };

function buffer(seconds) { return new Float32Array(Math.ceil(seconds * RATE)); }

// Yog'och zarbasi: past chastotali "tum" + qisqa filtrlangan shovqin (taxtaga dona qo'yilgandek)
function knock(buf, at, { freq = 190, gain = 0.9, decay = 38, noise = 0.55, bright = 0.25 } = {}) {
  const start = Math.floor(at * RATE);
  let lp = 0;
  for (let i = 0; start + i < buf.length; i++) {
    const t = i / RATE;
    const env = Math.exp(-t * decay);
    if (env < 0.0005) break;
    lp += bright * (rand() - lp); // bir qutbli past chastota filtri
    const body = Math.sin(2 * Math.PI * freq * t * (1 - t * 1.2)) * 0.8 + Math.sin(2 * Math.PI * freq * 2.7 * t) * 0.15;
    const click = lp * noise * Math.exp(-t * decay * 3.2);
    buf[start + i] += gain * env * (body + click);
  }
}

// Jaranglagan ohang (qo'ng'iroqsimon: asosiy + yuqori garmonikalar, eksponent so'nish)
function bell(buf, at, freq, { gain = 0.35, decay = 3.2, length = 1.4 } = {}) {
  const start = Math.floor(at * RATE);
  const n = Math.floor(length * RATE);
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const t = i / RATE;
    const attack = Math.min(1, t / 0.006);
    const env = attack * Math.exp(-t * decay);
    const s = Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(2 * Math.PI * freq * 2 * t) * Math.exp(-t * 4) + 0.12 * Math.sin(2 * Math.PI * freq * 3.01 * t) * Math.exp(-t * 7);
    buf[start + i] += gain * env * s;
  }
}

function wav(buf) {
  // Cho'qqini 0.9 ga normallash
  let peak = 0;
  for (const v of buf) peak = Math.max(peak, Math.abs(v));
  const k = peak > 0 ? 0.9 / peak : 1;
  const data = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i] * k)) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const SOUNDS = {
  move() { const b = buffer(0.18); knock(b, 0); return b; },
  capture() { const b = buffer(0.26); knock(b, 0, { freq: 170, decay: 30, noise: 0.8, bright: 0.4 }); knock(b, 0.045, { freq: 230, gain: 0.7, decay: 42, noise: 0.9, bright: 0.5 }); return b; },
  check() { const b = buffer(0.5); knock(b, 0, { freq: 200 }); bell(b, 0.02, 988, { gain: 0.22, decay: 7, length: 0.45 }); return b; },
  'game-end'() {
    const b = buffer(1.9);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(b, i * 0.12, f, { gain: 0.3, decay: 2.6, length: 1.6 }));
    return b;
  }
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, make] of Object.entries(SOUNDS)) {
  seed = 12345;
  const file = path.join(OUT, name + '.wav');
  fs.writeFileSync(file, wav(make()));
  console.log('✅ ' + path.relative(process.cwd(), file) + '  ' + Math.round(fs.statSync(file).size / 1024) + ' KB');
}
