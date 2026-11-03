// ⭐ Kun o'yini GIF'i (server tomoni, brauzersiz): o'yin yurishma-yurish — Telegram kanal posti uchun (server.js postGameOfDayToChannel).
// Donalar — assets/gif-pieces-56.rgba.gz (tools/make-gif-sprites.js, Karvon to'plami), kodlash — vendor/gifenc (sof JS).
// Har katak oldindan rang indekslariga aylantiriladi (dona × katak rangi × oxirgi yurish belgisi), kadr — shu bo'laklardan yig'iladi.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Chess } = require('chess.js');
const Chess960 = require('./chess960');
const Shatranj = require('./shatranj');

const SQ = 56, N = 8, W = SQ * N;
const ORDER = ['w', 'b'].flatMap((c) => ['K', 'Q', 'R', 'B', 'N', 'P'].map((p) => c + p));
// Sayt standart mavzusi (Firuza) taxtasi; oxirgi yurish — sariq
const LIGHT = [227, 241, 241], DARK = [79, 158, 164], MARK = [242, 193, 78], MARK_ALPHA = 0.42;
const MAX_PLIES = 240;

let enc = null;
async function gifenc() {
  if (!enc) {
    const src = fs.readFileSync(path.join(__dirname, 'vendor', 'gifenc-1.0.3.esm.js'));
    enc = await import('data:text/javascript;base64,' + src.toString('base64'));
  }
  return enc;
}

let sprites = null;
function loadSprites() {
  if (!sprites) {
    const raw = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'assets', 'gif-pieces-' + SQ + '.rgba.gz')));
    sprites = {};
    ORDER.forEach((code, i) => {
      const sp = Uint8Array.from(raw.subarray(i * SQ * SQ * 4, (i + 1) * SQ * SQ * 4));
      // Qora donalarga ingichka och hoshiya (saytdagi kabi — to'q katakda ham ko'rinsin)
      if (code[0] === 'b') {
        const a = (x, y) => (x < 0 || y < 0 || x >= SQ || y >= SQ ? 0 : raw[(i * SQ * SQ + y * SQ + x) * 4 + 3]);
        for (let y = 0; y < SQ; y++) for (let x = 0; x < SQ; x++) {
          const o = (y * SQ + x) * 4;
          if (sp[o + 3] > 128) continue;
          const near = Math.max(a(x - 1, y), a(x + 1, y), a(x, y - 1), a(x, y + 1), a(x - 1, y - 1), a(x + 1, y + 1), a(x - 1, y + 1), a(x + 1, y - 1));
          if (near > 128) { sp[o] = 235; sp[o + 1] = 230; sp[o + 2] = 215; sp[o + 3] = Math.max(sp[o + 3], 150); }
        }
      }
      sprites[code] = sp;
    });
  }
  return sprites;
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));
// Katak bo'lagi RGBA: fon (och/to'q, belgili) + dona (alfa bilan)
function tileRgba(code, dark, marked) {
  const bg = marked ? mix(dark ? DARK : LIGHT, MARK, MARK_ALPHA) : (dark ? DARK : LIGHT);
  const out = new Uint8Array(SQ * SQ * 4);
  const sp = code ? loadSprites()[code] : null;
  for (let i = 0; i < SQ * SQ; i++) {
    const a = sp ? sp[i * 4 + 3] / 255 : 0;
    for (let k = 0; k < 3; k++) out[i * 4 + k] = Math.round(bg[k] * (1 - a) + (sp ? sp[i * 4 + k] : 0) * a);
    out[i * 4 + 3] = 255;
  }
  return out;
}

let shared = null; // { palette, tiles: Map key → Uint8Array (indekslar) }
async function prepare() {
  if (shared) return shared;
  const { quantize, applyPalette } = await gifenc();
  // Umumiy palitra: barcha dona × katak varianti bitta rasmda
  const keys = [];
  for (const code of [null].concat(ORDER)) for (const dark of [false, true]) for (const marked of [false, true]) keys.push([code, dark, marked]);
  const all = new Uint8Array(keys.length * SQ * SQ * 4);
  const rgba = keys.map(([c, d, m], i) => { const t = tileRgba(c, d, m); all.set(t, i * SQ * SQ * 4); return t; });
  const palette = quantize(all, 128);
  const tiles = new Map();
  keys.forEach(([c, d, m], i) => tiles.set((c || '-') + (d ? 'd' : 'l') + (m ? 'm' : ''), applyPalette(rgba[i], palette)));
  shared = { palette, tiles };
  return shared;
}

function newGame(variant, startFen) {
  if (variant === 'shatranj') return new Shatranj(startFen || undefined);
  if (variant === 'chess960') return new Chess960(startFen || undefined);
  return startFen ? new Chess(startFen) : new Chess();
}

// Kadr: oq pastda; marks — oxirgi yurish kataklari
function frame(game, marks, tiles) {
  const px = new Uint8Array(W * W);
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const sq = 'abcdefgh'[col] + (8 - row);
      const p = game.get(sq);
      const dark = (row + col) % 2 === 1;
      const tile = tiles.get((p ? p.color + p.type.toUpperCase() : '-') + (dark ? 'd' : 'l') + (marks.has(sq) ? 'm' : ''));
      for (let y = 0; y < SQ; y++) px.set(tile.subarray(y * SQ, (y + 1) * SQ), (row * SQ + y) * W + col * SQ);
    }
  }
  return px;
}

// O'yin GIF'i: boshlang'ich pozitsiya (1 s), har yurish (qisqa o'yinda 0.7 s, uzunida tezroq), yakuniy pozitsiya (4 s). Buffer yoki null.
async function makeGameGif({ moves, variant, startFen }) {
  const list = (Array.isArray(moves) ? moves : []).slice(0, MAX_PLIES);
  if (!list.length) return null;
  const { GIFEncoder } = await gifenc();
  const { palette, tiles } = await prepare();
  const game = newGame(variant, startFen);
  const delay = list.length <= 60 ? 700 : list.length <= 120 ? 450 : 300;
  const gif = GIFEncoder();
  const write = (px, ms, first) => gif.writeFrame(px, W, W, first ? { palette, delay: ms, repeat: 0 } : { delay: ms });
  write(frame(game, new Set(), tiles), 1000, true);
  let last = null;
  for (let i = 0; i < list.length; i++) {
    const m = game.move(list[i]) || (typeof list[i] === 'string' && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(list[i]) ? game.move({ from: list[i].slice(0, 2), to: list[i].slice(2, 4), promotion: list[i][4] || 'q' }) : null);
    if (!m) break;
    last = m;
    const isLast = i === list.length - 1;
    write(frame(game, new Set([m.from, m.to]), tiles), isLast ? 4000 : delay);
  }
  if (!last) return null;
  gif.finish();
  return Buffer.from(gif.bytes());
}

module.exports = { makeGameGif, SIZE: W };
