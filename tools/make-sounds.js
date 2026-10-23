#!/usr/bin/env node
// Sayt ovozlarini sintez qiladi → assets/sounds/<to'plam>/{move,capture,check,game-end}.wav (22 050 Hz, mono, 16-bit).
//   node tools/make-sounds.js [to'plam]
// Ovozlar to'liq dastur bilan yaratilgan — begona yozuv ishlatilmagan, mualliflik huquqi loyihaniki.
// (2026-10-22 gacha lichess.org "standard" ovozlari ishlatilardi — ular lichess litsenziyasida "non-free".)
// To'plamlar ro'yxati sound.js SOUND_PACKS va settings.js SOUND_PACKS bilan bir xil bo'lishi kerak (pages.test tekshiradi).
const fs = require('fs');
const path = require('path');

const RATE = 22050;
const OUT = path.join(__dirname, '..', 'assets', 'sounds');

// Takrorlanadigan "tasodifiy" shovqin (har safar bir xil fayl chiqsin)
let seed = 12345;
const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };

function buffer(seconds) { return new Float32Array(Math.ceil(seconds * RATE)); }

// Zarba: past chastotali "tum" + qisqa filtrlangan shovqin (yog'och, tosh, doira — parametrlar bilan)
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

// Chinni piyola jarangi: garmonik bo'lmagan qisman tonlar (1 : 2.76 : 5.4), tez so'nadi
function clink(buf, at, freq, { gain = 0.4, decay = 9, length = 0.9 } = {}) {
  const start = Math.floor(at * RATE);
  const n = Math.floor(length * RATE);
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const t = i / RATE;
    const attack = Math.min(1, t / 0.002);
    const s = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * decay)
      + 0.5 * Math.sin(2 * Math.PI * freq * 2.76 * t) * Math.exp(-t * decay * 1.6)
      + 0.25 * Math.sin(2 * Math.PI * freq * 5.4 * t) * Math.exp(-t * decay * 2.4);
    buf[start + i] += gain * attack * s;
  }
}

// Doira zangi (jiringlash): bir nechta qisqa yuqori ohanglar ozgina kechikish bilan
function jingle(buf, at, { gain = 0.18, count = 5 } = {}) {
  for (let k = 0; k < count; k++) clink(buf, at + k * 0.012 + Math.abs(rand()) * 0.01, 3200 + Math.abs(rand()) * 2600, { gain, decay: 22, length: 0.25 });
}

// 8-bit kvadrat to'lqin
function square(buf, at, freq, dur, gain = 0.25) {
  const start = Math.floor(at * RATE);
  const n = Math.floor(dur * RATE);
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.003) * Math.min(1, (dur - t) / 0.01);
    buf[start + i] += gain * env * (Math.sin(2 * Math.PI * freq * t) >= 0 ? 1 : -1);
  }
}

function wav(buf, peakTo) {
  // Cho'qqini normallash (to'plam ovoz balandligi — peakTo)
  let peak = 0;
  for (const v of buf) peak = Math.max(peak, Math.abs(v));
  const k = peak > 0 ? (peakTo || 0.9) / peak : 1;
  const data = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i] * k)) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

// To'plam: { peak, move, capture, check, 'game-end' } — har biri bufer qaytaradi
const PACKS = {
  // 🪵 Yog'och — standart (taxtaga dona qo'yilgandek)
  wood: {
    move() { const b = buffer(0.18); knock(b, 0); return b; },
    capture() { const b = buffer(0.26); knock(b, 0, { freq: 170, decay: 30, noise: 0.8, bright: 0.4 }); knock(b, 0.045, { freq: 230, gain: 0.7, decay: 42, noise: 0.9, bright: 0.5 }); return b; },
    check() { const b = buffer(0.5); knock(b, 0, { freq: 200 }); bell(b, 0.02, 988, { gain: 0.22, decay: 7, length: 0.45 }); return b; },
    'game-end'() { const b = buffer(1.9); [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(b, i * 0.12, f, { gain: 0.3, decay: 2.6, length: 1.6 })); return b; }
  },
  // 🍵 Choyxona — chinni piyolalar jarangi
  teahouse: {
    peak: 0.75,
    move() { const b = buffer(0.6); clink(b, 0, 1760, { gain: 0.4 }); return b; },
    capture() { const b = buffer(0.75); clink(b, 0, 1760); clink(b, 0.07, 2350, { gain: 0.32 }); return b; },
    check() { const b = buffer(0.85); clink(b, 0, 2640); clink(b, 0.11, 3140, { gain: 0.35 }); return b; },
    'game-end'() { const b = buffer(1.8); [1046.5, 1174.7, 1396.9, 1568, 2093].forEach((f, i) => clink(b, i * 0.13, f, { gain: 0.35, decay: 4, length: 1.3 })); return b; }
  },
  // 🪨 Marmar — tosh ustida o'tkir "chiq"
  marble: {
    move() { const b = buffer(0.14); knock(b, 0, { freq: 430, decay: 65, noise: 0.9, bright: 0.7 }); return b; },
    capture() { const b = buffer(0.2); knock(b, 0, { freq: 380, decay: 55, noise: 1, bright: 0.75 }); knock(b, 0.04, { freq: 540, gain: 0.7, decay: 70, noise: 1, bright: 0.8 }); return b; },
    check() { const b = buffer(0.5); knock(b, 0, { freq: 430, decay: 65, noise: 0.9, bright: 0.7 }); bell(b, 0.015, 1318.5, { gain: 0.2, decay: 9, length: 0.45 }); return b; },
    'game-end'() { const b = buffer(1.7); [392, 523.25, 659.25, 784].forEach((f, i) => bell(b, i * 0.11, f, { gain: 0.3, decay: 3.4, length: 1.4 })); return b; }
  },
  // 🥁 Doira — "bum" zarbasi va zang; o'yin yakunida "dum-tak" ritmi
  doira: {
    move() { const b = buffer(0.4); knock(b, 0, { freq: 105, decay: 16, noise: 0.35, bright: 0.15 }); jingle(b, 0.005, { gain: 0.1, count: 3 }); return b; },
    capture() { const b = buffer(0.45); knock(b, 0, { freq: 105, decay: 16, noise: 0.35, bright: 0.15 }); knock(b, 0.06, { freq: 320, gain: 0.6, decay: 45, noise: 1, bright: 0.6 }); jingle(b, 0.06, { gain: 0.14 }); return b; },
    check() { const b = buffer(0.55); knock(b, 0, { freq: 95, decay: 12, noise: 0.4, bright: 0.2 }); jingle(b, 0.01, { gain: 0.2, count: 7 }); return b; },
    'game-end'() {
      const b = buffer(1.6);
      [[0, 'dum'], [0.2, 'tak'], [0.32, 'tak'], [0.52, 'dum'], [0.8, 'dum']].forEach(([t, kind]) => {
        if (kind === 'dum') knock(b, t, { freq: 100, decay: 13, noise: 0.35, bright: 0.15 });
        else knock(b, t, { freq: 330, gain: 0.55, decay: 45, noise: 1, bright: 0.6 });
        jingle(b, t + 0.004, { gain: 0.1, count: 4 });
      });
      return b;
    }
  },
  // 👾 Retro — 8-bit
  retro: {
    peak: 0.6,
    move() { const b = buffer(0.08); square(b, 0, 660, 0.05); return b; },
    capture() { const b = buffer(0.16); square(b, 0, 440, 0.05); square(b, 0.06, 330, 0.07); return b; },
    check() { const b = buffer(0.3); square(b, 0, 880, 0.06); square(b, 0.08, 1175, 0.06); square(b, 0.16, 880, 0.08); return b; },
    'game-end'() { const b = buffer(0.75); [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => square(b, i * 0.11, f, i === 3 ? 0.3 : 0.1)); return b; }
  },
  // 🤫 Yumshoq — past va sokin
  soft: {
    peak: 0.55,
    move() { const b = buffer(0.22); knock(b, 0, { freq: 150, decay: 28, noise: 0.12, bright: 0.08 }); return b; },
    capture() { const b = buffer(0.3); knock(b, 0, { freq: 140, decay: 26, noise: 0.15, bright: 0.08 }); knock(b, 0.06, { freq: 175, gain: 0.6, decay: 32, noise: 0.15, bright: 0.08 }); return b; },
    check() { const b = buffer(0.6); knock(b, 0, { freq: 150, decay: 28, noise: 0.12, bright: 0.08 }); bell(b, 0.03, 659.25, { gain: 0.18, decay: 6, length: 0.55 }); return b; },
    'game-end'() { const b = buffer(1.9); [440, 554.37, 659.25].forEach((f, i) => bell(b, i * 0.16, f, { gain: 0.25, decay: 2.2, length: 1.7 })); return b; }
  }
};

const only = process.argv[2];
if (require.main === module) {
  for (const [pack, def] of Object.entries(PACKS)) {
    if (only && pack !== only) continue;
    const dir = path.join(OUT, pack);
    fs.mkdirSync(dir, { recursive: true });
    for (const name of ['move', 'capture', 'check', 'game-end']) {
      seed = 12345;
      fs.writeFileSync(path.join(dir, name + '.wav'), wav(def[name](), def.peak));
    }
    console.log('✅ ' + path.relative(process.cwd(), dir));
  }
}
module.exports = { PACKS: Object.keys(PACKS) };
