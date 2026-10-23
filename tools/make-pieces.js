#!/usr/bin/env node
// "Karvon" dona to'plami → img/chesspieces/karvon/{w,b}{K,Q,R,B,N,P}.svg
//   node tools/make-pieces.js
// ChessCaravan uchun o'zimiz chizgan to'plam (mualliflik huquqi loyihaniki) — Ipak yo'li ruhida:
// shoh — gumbazli toj, farzin — salla va pat, rux — minora, fil — tuya, ot — jilovli ot, piyoda — oddiy.
// Koordinatalar 45×45 maydonda (boshqa to'plamlar bilan bir xil o'lcham). Shakl o'zgarsa — shu yerda tahrirlab, qayta ishga tushiring.
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'img', 'chesspieces', 'karvon');

const COLORS = {
  w: { fill: '#f4efe4', stroke: '#24201b', line: '#24201b', gold: '#d9a73c', eye: '#24201b' },
  b: { fill: '#2d2723', stroke: '#0e0c0a', line: '#d8ccb2', gold: '#d9a73c', eye: '#e9dfc8' }
};

// Umumiy poydevor (shoh, farzin, rux) va kichik poydevor (ot, tuya, piyoda)
const BASE = 'M9.5 39.5H35.5V37.2Q35.5 35.5 33.8 35.5H11.2Q9.5 35.5 9.5 37.2Z M12.5 35.5H32.5L31.3 32.5H13.7Z';
const BASE_S = 'M11.5 39.5H33.5V37.2Q33.5 35.5 31.8 35.5H13.2Q11.5 35.5 11.5 37.2Z';

// Har dona: qatlamlar ro'yxati. kind: body (asosiy rang), gold (bezak), line (ichki chiziq), eye (ko'z/nuqta)
const PIECES = {
  P: [
    ['body', BASE_S],
    ['body', 'M14.5 35.5C15.6 30 18.4 26 19.4 22.2H25.6C26.6 26 29.4 30 30.5 35.5Z'],
    ['gold', 'M16.8 22.4H28.2Q29.3 20.9 27.7 19.9H17.3Q15.7 20.9 16.8 22.4Z'],
    ['body', 'M22.5 8.6A5.6 5.6 0 1 1 22.49 8.6Z'],
    ['line', 'M16.4 30.6H28.6']
  ],
  R: [
    ['body', BASE],
    ['body', 'M14 32.5L16.6 18H28.4L31 32.5Z'],
    ['gold', 'M15.1 27.4H29.9L29.6 25.6H15.4Z'],
    ['line', 'M21 31.6V29.2A1.5 1.5 0 0 1 24 29.2V31.6'],
    ['line', 'M16.1 22.4H28.9'],
    ['gold', 'M12.6 18H32.4L30.9 14.2H14.1Z'],
    ['line', 'M15.5 18L17 19.8L18.5 18L20 19.8L21.5 18L23 19.8L24.5 18L26 19.8L27.5 18L29 19.8L29.5 18'],
    ['body', 'M17.6 14.2V9.8H27.4V14.2Z'],
    ['line', 'M21.2 14.2V12.2A1.3 1.3 0 0 1 23.8 12.2V14.2'],
    ['body', 'M16.9 9.8C17.6 5.8 20.2 3.9 22.5 3.4C24.8 3.9 27.4 5.8 28.1 9.8Z'],
    ['gold', 'M22.5 3.6A1.3 1.3 0 1 1 22.49 3.6Z']
  ],
  K: [
    ['body', BASE],
    ['body', 'M13.6 32.5C15.1 27 17.5 23 18 19.2H27C27.5 23 29.9 27 31.4 32.5Z'],
    ['line', 'M15.6 27.6H29.4'],
    ['gold', 'M15.5 19.2H29.5Q30.6 17.4 29 16.4H16Q14.4 17.4 15.5 19.2Z'],
    ['body', 'M16 16.4L14.8 9.6L18.9 12.6L22.5 8.4L26.1 12.6L30.2 9.6L29 16.4Z'],
    ['gold', 'M14.8 8.4A1.2 1.2 0 1 1 14.79 8.4Z M30.2 8.4A1.2 1.2 0 1 1 30.19 8.4Z'],
    ['gold', 'M22.5 8.6C19.9 7.6 20.2 4.9 22.5 2.4C24.8 4.9 25.1 7.6 22.5 8.6Z'],
    ['line', 'M18 14.6H27']
  ],
  Q: [
    ['body', BASE],
    ['body', 'M14.6 32.5C16 27 18.1 23.5 18.6 20.2H26.4C26.9 23.5 29 27 30.4 32.5Z'],
    ['line', 'M16.4 27.6H28.6'],
    ['gold', 'M16.4 20.2H28.6Q29.7 18.6 28.1 17.7H16.9Q15.3 18.6 16.4 20.2Z'],
    ['body', 'M14.6 17.7C12.9 12.8 15.8 7.9 22.5 7.9C29.2 7.9 32.1 12.8 30.4 17.7Z'],
    ['line', 'M15.4 13.8C19.6 11.4 25.4 16.6 29.8 12.4'],
    ['line', 'M15.2 16.2C20 13.9 25 18 29.9 14.9'],
    ['gold', 'M22.6 9.2C21.3 6.4 22.2 3.4 24.9 1.6C24.4 4.2 24.6 6.6 23.7 9.2Z'],
    ['gold', 'M22.5 9.3A1.7 1.7 0 1 1 22.49 9.3Z']
  ],
  N: [
    ['body', BASE_S],
    ['body', 'M15.4 35.5C14.9 30.4 17.6 27.4 21 24.6C18.4 25.2 15.1 26.7 12.6 27.1C10.5 27.4 9 25.6 9.8 23.6C11.5 19.6 14.9 14.7 17.9 11.7L18.4 7.4L21 10C23 9.2 25.1 9 27.1 9.8C32.2 12 34.6 18.2 33.6 26C33.1 30 32 33 32 35.5Z'],
    ['gold', 'M15.6 32.2C21 31 27 31 32.3 32.2L32.1 33.9C27 32.8 21 32.8 15.5 33.9Z'],
    ['gold', 'M12.2 21.6L19.6 16.6L22.1 22.4'],
    ['line', 'M26 11.4C29 13.4 31 17 31.6 21'],
    ['eye', 'M17.9 15.1A1 1 0 1 1 17.89 15.1Z'],
    ['eye', 'M11.6 23.6A0.7 0.7 0 1 1 11.59 23.6Z'],
    ['gold', 'M28.6 13.1A0.9 0.9 0 1 1 28.59 13.1Z M30.4 16.4A0.9 0.9 0 1 1 30.39 16.4Z M31.4 20A0.9 0.9 0 1 1 31.39 20Z']
  ],
  B: [
    ['body', BASE_S],
    ['body', 'M14 35.5C14 31 15.6 28.4 17.2 26.8C15.6 23.6 15 20 15 16.8C15 15 14 14.3 12.2 14.6L9.2 15.1C7.9 15.2 7.3 13.7 8.2 12.8C9.7 11.1 11.8 9.8 14.4 9.3L15.1 7.1L16.9 8.9C19.6 9 21.3 11 21.3 13.6C21.3 17.4 21.8 20.6 23 23C24.2 18.2 26.8 15.4 29.3 15.6C32.4 15.9 34 20.5 34 26.2C34 29.6 33.4 32.6 33.4 35.5Z'],
    ['gold', 'M23.6 23.8C25.2 20 28.2 18.6 31.6 19.8L32.8 25.6C29.6 24.6 26.4 25.1 23.7 26.9Z'],
    ['gold', 'M24.8 28.4A0.9 0.9 0 1 1 24.79 28.4Z M28.4 27.4A0.9 0.9 0 1 1 28.39 27.4Z M32 27.6A0.9 0.9 0 1 1 31.99 27.6Z'],
    ['gold', 'M9.6 14.4L15.3 12.2L16.3 15.3'],
    ['line', 'M17.6 30.6C21 29.6 28 29.6 32.6 30.8'],
    ['eye', 'M16.8 10.9A0.9 0.9 0 1 1 16.79 10.9Z']
  ]
};

function svg(color, layers) {
  const c = COLORS[color];
  const parts = layers.map(([kind, d]) => {
    if (kind === 'body') return `<path d="${d}" fill="${c.fill}" stroke="${c.stroke}"/>`;
    if (kind === 'gold') return /Z\s*$/.test(d) ? `<path d="${d}" fill="${c.gold}" stroke="${c.stroke}" stroke-width="1"/>` : `<path d="${d}" fill="none" stroke="${c.gold}" stroke-width="1.4"/>`;
    if (kind === 'line') return `<path d="${d}" fill="none" stroke="${c.line}" stroke-width="1.1"/>`;
    if (kind === 'eye') return `<path d="${d}" fill="${c.eye}" stroke="none"/>`;
    throw new Error(kind);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" viewBox="0 0 45 45"><g stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${parts.join('')}</g></svg>\n`;
}

fs.mkdirSync(OUT, { recursive: true });
for (const color of ['w', 'b']) {
  for (const [p, layers] of Object.entries(PIECES)) {
    fs.writeFileSync(path.join(OUT, color + p + '.svg'), svg(color, layers));
  }
}
console.log('✅ ' + path.relative(process.cwd(), OUT) + ' — 12 ta SVG');
