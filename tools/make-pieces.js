#!/usr/bin/env node
// ChessCaravan dona to'plamlari → img/chesspieces/<to'plam>/{w,b}{K,Q,R,B,N,P}.svg
//   node tools/make-pieces.js
// Hammasi shu skriptda noldan chizilgan — begona rasm ishlatilmagan, mualliflik huquqi loyihaniki.
// Tuzilishi: SHAKLLAR (karvon, classic, geo, pixel) × USLUBLAR (ranglar, naqsh, yaltiroqlik, nur) = SETS.
// Koordinatalar 45×45 maydonda. Shakl yoki rang o'zgarsa — shu yerda tahrirlab, qayta ishga tushiring.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'img', 'chesspieces');
const circ = (x, y, r) => `M${x} ${+(y - r).toFixed(2)}A${r} ${r} 0 1 1 ${+(x - 0.01).toFixed(2)} ${+(y - r).toFixed(2)}Z`;

// Umumiy poydevor (shoh, farzin, rux) va kichik poydevor (ot, tuya/fil, piyoda)
const BASE = 'M9.5 39.5H35.5V37.2Q35.5 35.5 33.8 35.5H11.2Q9.5 35.5 9.5 37.2Z M12.5 35.5H32.5L31.3 32.5H13.7Z';
const BASE_S = 'M11.5 39.5H33.5V37.2Q33.5 35.5 31.8 35.5H13.2Q11.5 35.5 11.5 37.2Z';

// Qatlam turlari: body (asosiy rang), gold (bezak), line (ichki chiziq), eye (ko'z/nuqta), smile (tabassum), cheek (yuz qizilligi)
// --- Karvon shakllari: shoh — gumbazli toj, farzin — salla va pat, rux — minora, fil — tuya, ot — jilovli ---
const KARVON = {
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

// --- Klassik shakllar: shoh — xoch, farzin — besh tishli toj, rux — qal'a, fil — mitra, ot, piyoda ---
const CLASSIC = {
  P: KARVON.P,
  R: [
    ['body', BASE],
    ['body', 'M13.6 32.5L15.2 17.2H29.8L31.4 32.5Z'],
    ['line', 'M14.4 27.8H30.6'],
    ['gold', 'M13 17.2H32Q33 15.8 31.5 15H13.5Q12 15.8 13 17.2Z'],
    ['body', 'M13.2 15V8.6H17V11.6H20.6V8.6H24.4V11.6H28V8.6H31.8V15Z']
  ],
  B: [
    ['body', BASE_S],
    ['body', 'M15 35.5C16.1 31 18.1 28 19.1 25H25.9C26.9 28 28.9 31 30 35.5Z'],
    ['gold', 'M17.3 25H27.7Q28.8 23.4 27.2 22.5H17.8Q16.2 23.4 17.3 25Z'],
    ['body', 'M18 22.5C15.4 18.8 16.4 13.6 22.5 8.6C28.6 13.6 29.6 18.8 27 22.5Z'],
    ['line', 'M24.6 12.8L20.6 18.4'],
    ['body', circ(22.5, 6.4, 1.8)]
  ],
  N: [
    ['body', BASE_S],
    KARVON.N[1],
    ['gold', 'M15.6 32.2C21 31 27 31 32.3 32.2L32.1 33.9C27 32.8 21 32.8 15.5 33.9Z'],
    ['line', 'M26 11.4C29 13.4 31 17 31.6 21'],
    ['eye', circ(17.9, 16.1, 1)],
    ['eye', circ(11.6, 24.3, 0.7)]
  ],
  Q: [
    ['body', BASE],
    ['body', 'M14.6 32.5C16 27 18.1 23.5 18.6 20.2H26.4C26.9 23.5 29 27 30.4 32.5Z'],
    ['line', 'M16.4 27.6H28.6'],
    ['gold', 'M16.4 20.2H28.6Q29.7 18.6 28.1 17.7H16.9Q15.3 18.6 16.4 20.2Z'],
    ['body', 'M16.6 17.7L13.6 9.8L17.1 13.6L18.4 8.2L21 13L22.5 7.6L24 13L26.6 8.2L27.9 13.6L31.4 9.8L28.4 17.7Z'],
    ['gold', [[13.6, 9.8], [18.4, 8.2], [22.5, 7.6], [26.6, 8.2], [31.4, 9.8]].map(([x, y]) => circ(x, y, 1.4)).join(' ')]
  ],
  K: [
    ['body', BASE],
    ['body', 'M13.6 32.5C15.1 27 17.5 23 18 19.2H27C27.5 23 29.9 27 31.4 32.5Z'],
    ['line', 'M15.6 27.6H29.4'],
    ['gold', 'M15.5 19.2H29.5Q30.6 17.4 29 16.4H16Q14.4 17.4 15.5 19.2Z'],
    ['body', 'M16 16.4C14.6 11.8 17.6 9.6 22.5 9.6C27.4 9.6 30.4 11.8 29 16.4Z'],
    ['line', 'M17.2 13.4C20.5 12.4 24.5 12.4 27.8 13.4'],
    ['body', 'M21.3 9.6V6.4H19.1V4.2H21.3V2H23.7V4.2H25.9V6.4H23.7V9.6Z']
  ]
};

// --- Bolajon: klassik shakllar + ko'z, tabassum, qizil yuzlar ---
const face = (y, x = 22.5) => [
  ['eye', circ(x - 2.2, y, 1.15) + ' ' + circ(x + 2.2, y, 1.15)],
  ['smile', `M${x - 1.9} ${y + 2.1}Q${x} ${y + 3.7} ${x + 1.9} ${y + 2.1}`],
  ['cheek', circ(x - 4, y + 1.9, 1.05) + ' ' + circ(x + 4, y + 1.9, 1.05)]
];
const noLines = (layers) => layers.filter(([k]) => k !== 'line');
const CUTE = {
  P: noLines(CLASSIC.P).concat(face(29.4)),
  R: noLines(CLASSIC.R).concat(face(22.6)),
  B: noLines(CLASSIC.B).concat(face(30.2)),
  N: CLASSIC.N.filter(([k]) => k !== 'line').concat([['cheek', circ(15.4, 21.2, 1.3)]]),
  Q: noLines(CLASSIC.Q).concat(face(25)),
  K: noLines(CLASSIC.K).concat(face(24.2))
};

// --- Geometrik: piyoda — doira, rux — kvadrat, fil — uchburchak, ot — "L" (otning yurishi), farzin — romb, shoh — doira va xoch ---
const GBASE = 'M11.5 39.5H33.5V36.5Q33.5 35.5 32.5 35.5H12.5Q11.5 35.5 11.5 36.5Z';
const GEO = {
  P: [['body', GBASE], ['body', circ(22.5, 27.2, 7.2)]],
  R: [['body', GBASE], ['body', 'M14 35.5V16H19V19.5H26V16H31V35.5Z'], ['gold', 'M17.5 26.5H27.5V29.5H17.5Z']],
  B: [['body', GBASE], ['body', 'M12.5 35.5L22.5 11L32.5 35.5Z'], ['gold', circ(22.5, 27.5, 2.6)]],
  N: [['body', GBASE], ['body', 'M14 35.5V11H25V21.5H31.5V35.5Z'], ['gold', 'M17.5 14.5H21.5V18.5H17.5Z']],
  Q: [['body', GBASE], ['body', 'M22.5 8.5L34.5 22L22.5 35.5L10.5 22Z'], ['gold', circ(22.5, 22, 3.2)]],
  K: [['body', GBASE], ['body', circ(22.5, 22.5, 11.5)], ['gold', 'M21 15.5H24V21H29.5V24H24V29.5H21V24H15.5V21H21Z']]
};

// --- Piksel: 15×15 katak (# — dona, + — bezak), chegara avtomatik ---
const PIX = {
  P: ['', '', '......###', '.....#####', '.....#####', '......###', '.....#####', '......###', '......###', '.....#####', '....#######', '....#######', '...#########'],
  R: ['', '', '...##.###.##', '...#########', '...#########', '....#######', '....##+++##', '....#######', '....#######', '....#######', '...#########', '..###########', '..###########'],
  N: ['', '......#', '.....###', '....######', '...########', '..####+#####', '..##########', '.....#######', '....########', '...#########', '...#########', '..###########', '..###########'],
  B: ['', '.......#', '......###', '.....##+##', '.....#####', '.....#####', '......###', '.....#####', '......###', '......###', '.....#####', '....#######', '...#########'],
  Q: ['', '...#..#.#..#', '...#..#.#..#', '...##.###.##', '...#########', '....##+++##', '....#######', '.....#####', '.....#####', '......###', '.....#####', '....#######', '...#########'],
  K: ['.......#', '......###', '.......#', '....#######', '...#########', '...###+###', '....#######', '.....#####', '.....#####', '.....#####', '....#######', '...#########', '..###########']
};

// --- Uslublar ---
const GOLD = '#d9a73c';
const glow = '<filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="0.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
const grad = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const SETS = [
  { id: 'karvon', shapes: KARVON,
    w: { fill: '#f4efe4', stroke: '#24201b', line: '#24201b', gold: GOLD, eye: '#24201b' },
    b: { fill: '#2d2723', stroke: '#0e0c0a', line: '#d8ccb2', gold: GOLD, eye: '#e9dfc8' } },
  { id: 'classic', shapes: CLASSIC,
    w: { fill: '#ffffff', stroke: '#1c1c1c', line: '#1c1c1c', gold: '#ffffff', eye: '#1c1c1c' },
    b: { fill: '#262626', stroke: '#000000', line: '#e2e2e2', gold: '#262626', eye: '#e2e2e2' } },
  { id: 'atlas', shapes: KARVON,
    w: { fill: 'url(#p)', stroke: '#24201b', line: '#24201b', gold: GOLD, eye: '#24201b',
      defs: '<pattern id="p" width="6" height="8" patternUnits="userSpaceOnUse"><rect width="6" height="8" fill="#fbf3e2"/><path d="M0 2L1.5 0.8L3 2L4.5 0.8L6 2" fill="none" stroke="#d6336c" stroke-width="0.9"/><path d="M0 6L1.5 4.8L3 6L4.5 4.8L6 6" fill="none" stroke="#2b7bd6" stroke-width="0.9"/><circle cx="1.5" cy="3.9" r="0.45" fill="#f2b632"/><circle cx="4.5" cy="7.9" r="0.45" fill="#2fa36b"/></pattern>' },
    b: { fill: 'url(#p)', stroke: '#0b0a14', line: '#e9dfc8', gold: GOLD, eye: '#e9dfc8',
      defs: '<pattern id="p" width="6" height="8" patternUnits="userSpaceOnUse"><rect width="6" height="8" fill="#26203c"/><path d="M0 2L1.5 0.8L3 2L4.5 0.8L6 2" fill="none" stroke="#e0517f" stroke-width="0.9"/><path d="M0 6L1.5 4.8L3 6L4.5 4.8L6 6" fill="none" stroke="#3f8de0" stroke-width="0.9"/><circle cx="1.5" cy="3.9" r="0.45" fill="#f2b632"/><circle cx="4.5" cy="7.9" r="0.45" fill="#3fbf7f"/></pattern>' } },
  { id: 'rishton', shapes: CLASSIC,
    w: { fill: 'url(#p)', stroke: '#163a6b', line: '#2a6fd1', gold: '#2a6fd1', eye: '#163a6b',
      defs: '<pattern id="p" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#f6f8fb"/><circle cx="2.5" cy="2.5" r="0.75" fill="#2a6fd1" opacity="0.55"/><circle cx="0" cy="0" r="0.45" fill="#2fb3c6" opacity="0.6"/><circle cx="5" cy="5" r="0.45" fill="#2fb3c6" opacity="0.6"/></pattern>' },
    b: { fill: 'url(#p)', stroke: '#0a1d3a', line: '#cfe6ff', gold: '#6fd3e0', eye: '#cfe6ff',
      defs: '<pattern id="p" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#173f78"/><circle cx="2.5" cy="2.5" r="0.75" fill="#6fd3e0" opacity="0.5"/><circle cx="0" cy="0" r="0.45" fill="#ffffff" opacity="0.35"/><circle cx="5" cy="5" r="0.45" fill="#ffffff" opacity="0.35"/></pattern>' } },
  { id: 'wood', shapes: CLASSIC,
    w: { fill: 'url(#p)', stroke: '#5e3b1c', line: '#5e3b1c', gold: '#b7834a', eye: '#5e3b1c',
      defs: '<pattern id="p" width="12" height="4" patternUnits="userSpaceOnUse"><rect width="12" height="4" fill="#e8c491"/><path d="M0 1.2C3 0.4 6 2 12 1" fill="none" stroke="#c99a5e" stroke-width="0.5"/><path d="M0 3.2C4 2.6 8 3.8 12 3" fill="none" stroke="#d4a86f" stroke-width="0.4"/></pattern>' },
    b: { fill: 'url(#p)', stroke: '#1f1209', line: '#e0bd92', gold: '#9a6a3c', eye: '#e0bd92',
      defs: '<pattern id="p" width="12" height="4" patternUnits="userSpaceOnUse"><rect width="12" height="4" fill="#5b3a22"/><path d="M0 1.2C3 0.4 6 2 12 1" fill="none" stroke="#3f2614" stroke-width="0.5"/><path d="M0 3.2C4 2.6 8 3.8 12 3" fill="none" stroke="#6e4729" stroke-width="0.4"/></pattern>' } },
  { id: 'royal', shapes: CLASSIC,
    w: { fill: 'url(#m)', stroke: '#3a3f47', line: '#3a3f47', gold: 'url(#a)', eye: '#3a3f47',
      defs: grad('m', [[0, '#ffffff'], [0.55, '#c9d0d8'], [1, '#eef1f4']]) + grad('a', [[0, '#f6dc8c'], [1, '#b8862b']]) },
    b: { fill: 'url(#m)', stroke: '#000000', line: '#e7c873', gold: 'url(#a)', eye: '#e7c873',
      defs: grad('m', [[0, '#55555f'], [0.6, '#17171c'], [1, '#2c2c34']]) + grad('a', [[0, '#f6dc8c'], [1, '#b8862b']]) } },
  { id: 'neon', shapes: CLASSIC,
    w: { fill: '#effcff', stroke: '#00b2ec', line: '#00b2ec', gold: '#bdf0ff', eye: '#007fb0', filter: true, defs: glow },
    b: { fill: '#1e1033', stroke: '#ff3fcf', line: '#ff8fe6', gold: '#4a1d6b', eye: '#ff8fe6', filter: true, defs: glow } },
  { id: 'geo', shapes: GEO,
    w: { fill: '#f5f5f5', stroke: '#1f1f1f', line: '#1f1f1f', gold: '#e8594a', eye: '#1f1f1f' },
    b: { fill: '#2a2a2a', stroke: '#000000', line: '#dddddd', gold: '#e8594a', eye: '#dddddd' } },
  { id: 'cute', shapes: CUTE,
    w: { fill: '#fff7ea', stroke: '#4a3426', line: '#4a3426', gold: '#ffcf5c', eye: '#3a2a20', cheek: '#ff9fb2' },
    b: { fill: '#4b3f86', stroke: '#1f1940', line: '#e6defc', gold: '#ffcf5c', eye: '#ffffff', cheek: '#ff8fb0' } },
  { id: 'pixel', pixel: PIX,
    w: { fill: '#f7f7f7', stroke: '#1a1a1a', gold: '#e0a030' },
    b: { fill: '#2e2e3e', stroke: '#000000', gold: '#e0a030' } }
];

function layerSvg([kind, d], c) {
  if (kind === 'body') return `<path d="${d}" fill="${c.fill}" stroke="${c.stroke}"/>`;
  if (kind === 'gold') return /Z\s*$/.test(d) ? `<path d="${d}" fill="${c.gold}" stroke="${c.stroke}" stroke-width="1"/>` : `<path d="${d}" fill="none" stroke="${c.gold}" stroke-width="1.4"/>`;
  if (kind === 'line') return `<path d="${d}" fill="none" stroke="${c.line}" stroke-width="1.1"/>`;
  if (kind === 'eye') return `<path d="${d}" fill="${c.eye}" stroke="none"/>`;
  if (kind === 'smile') return `<path d="${d}" fill="none" stroke="${c.eye}" stroke-width="1"/>`;
  if (kind === 'cheek') return `<path d="${d}" fill="${c.cheek || c.gold}" stroke="none" opacity="0.8"/>`;
  throw new Error(kind);
}

function pixelSvg(rows, c) {
  const S = 2.5, OX = 3.75, OY = 7; // 15 katak × 2.5, markazda; 13-qator (tagi) y=39.5 da
  const cell = (r, x) => (rows[r] || '')[x] || '.';
  const paths = { fill: '', gold: '', stroke: '' };
  for (let r = -1; r < 15; r++) {
    for (let x = 0; x < 15; x++) {
      const v = cell(r, x);
      const sq = `M${OX + x * S} ${OY + r * S}h${S}v${S}h-${S}Z`;
      if (v === '#') paths.fill += sq;
      else if (v === '+') paths.gold += sq;
      else if ([[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]].some(([dr, dx]) => cell(r + dr, x + dx) !== '.')) paths.stroke += sq;
    }
  }
  return `<g shape-rendering="crispEdges"><path d="${paths.stroke}" fill="${c.stroke}"/><path d="${paths.fill}" fill="${c.fill}"/><path d="${paths.gold}" fill="${c.gold}"/></g>`;
}

function svg(set, color, piece) {
  const c = set[color];
  const body = set.pixel
    ? pixelSvg(set.pixel[piece], c)
    : `<g stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"${c.filter ? ' filter="url(#g)"' : ''}>${set.shapes[piece].map((l) => layerSvg(l, c)).join('')}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" viewBox="0 0 45 45">${c.defs ? `<defs>${c.defs}</defs>` : ''}${body}</svg>\n`;
}

const only = process.argv[2];
for (const set of SETS) {
  if (only && set.id !== only) continue;
  const dir = path.join(ROOT, set.id);
  fs.mkdirSync(dir, { recursive: true });
  for (const color of ['w', 'b']) for (const p of ['K', 'Q', 'R', 'B', 'N', 'P']) fs.writeFileSync(path.join(dir, color + p + '.svg'), svg(set, color, p));
  console.log('✅ ' + path.relative(process.cwd(), dir) + ' — 12 ta SVG');
}
module.exports = { SETS: SETS.map((s) => s.id) };
