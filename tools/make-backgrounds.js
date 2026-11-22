// 🎨 To'plamlar uchun orqa fon rasmlari (2026-11-22): har dona to'plamiga bittadan, o'zimiz chizgan SVG (mualliflik huquqi loyihaniki).
// node tools/make-backgrounds.js [id]  →  img/backgrounds/<id>.svg  (1600×1000, preserveAspectRatio slice — har ekranni to'ldiradi)
// Ro'yxat bundles.js BUNDLES bilan bir xil bo'lishi kerak (pages.test tekshiradi). Tasodifiy unsurlar qat'iy urug' bilan — natija har safar bir xil.
const fs = require('fs');
const path = require('path');

const W = 1600, H = 1000;
const OUT = path.join(__dirname, '..', 'img', 'backgrounds');

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const f = (n) => Math.round(n * 10) / 10;
const svg = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>\n`;
const lin = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const rad = (id, stops, cx = 0.5, cy = 0.5, r = 0.5) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</radialGradient>`;
function stars(r, n, color = '#fff', maxR = 1.8, yMax = H) {
  let s = '';
  for (let i = 0; i < n; i++) s += `<circle cx="${f(r() * W)}" cy="${f(r() * yMax)}" r="${f(0.4 + r() * maxR)}" fill="${color}" opacity="${f(0.25 + r() * 0.7)}"/>`;
  return s;
}

// 🚀 Kosmos — Quyosh tizimi (2026-11-22, «jonliroq»): Somon yo'li, rangli tumanliklar, Quyosh toji, 8 sayyora tafsilotlari bilan.
// Uch fayl: kosmos.svg — to'liq harakatsiz rasm (harakat o'chiq bo'lsa); kosmos-base.svg — sayyorasiz asos (harakat yoqilganda fon);
// kosmos-fx.svg — harakatli qatlam (bgfx.js sahifaga joylaydi): sayyoralar orbitada sekin tebranadi, yulduzlar miltillaydi, uchar yulduzlar.
const KS = { sx: 40, sy: 1020 }; // Quyosh markazi (pastki chap burchak); orbitalar shu nuqta atrofida
const PLANETS = [
  // [nom, orbita radiusi, burchak (gradus), radius, [yorug', to'q]]
  ['mercury', 300, -38, 13, ['#d6cfc7', '#7d756d']],
  ['venus', 440, -34, 22, ['#fbe3b0', '#c79a52']],
  ['earth', 590, -36, 25, ['#7cc0ff', '#1f5fc0']],
  ['mars', 730, -33, 18, ['#ffa071', '#a83a18']],
  ['jupiter', 930, -35, 62, ['#f3d9b5', '#a8734a']],
  ['saturn', 1150, -36, 48, ['#f8e6b4', '#bf9550']],
  ['uranus', 1350, -37, 32, ['#c2f7f8', '#45b2bb']],
  ['neptune', 1540, -38, 31, ['#8ea4ff', '#2b40c4']]
];
const planetPos = (p) => { const a = p[2] * Math.PI / 180; return [KS.sx + p[1] * Math.cos(a), KS.sy + p[1] * Math.sin(a)]; };
function kosmosDefs() {
  let d = lin('ksky', [[0, '#050716'], [0.5, '#0a0f2c'], [1, '#120a26']], 1, 1)
    + rad('ksun', [[0, '#fffbe6'], [0.3, '#ffe27a'], [0.65, '#ffa630'], [1, '#ff7a1a', 0]])
    + rad('kglow', [[0, '#ffb547', 0.55], [0.5, '#ff8a2a', 0.18], [1, '#ff8a2a', 0]])
    + rad('kneb1', [[0, '#a33bd6', 0.42], [0.6, '#5b2aa8', 0.16], [1, '#5b2aa8', 0]])
    + rad('kneb2', [[0, '#1fb6c9', 0.34], [1, '#1f7a9e', 0]])
    + rad('kneb3', [[0, '#ff4f8b', 0.28], [1, '#ff4f8b', 0]])
    + rad('kmilk', [[0, '#e9e4ff', 0.26], [0.45, '#9fa8ff', 0.1], [1, '#9fa8ff', 0]])
    // Sayyora soyasi: yorug'lik pastki chapdagi Quyoshdan — yuqori o'ng tomon qorong'i
    + '<linearGradient id="kshade" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.55" stop-color="#000" stop-opacity="0.05"/><stop offset="1" stop-color="#000" stop-opacity="0.62"/></linearGradient>';
  PLANETS.forEach((p, i) => { d += rad('p' + i, [[0, p[4][0]], [1, p[4][1]]], 0.32, 0.68, 0.8); const [x, y] = planetPos(p); d += `<clipPath id="pc${i}"><circle cx="${f(x)}" cy="${f(y)}" r="${p[3]}"/></clipPath>`; });
  return d;
}
function kosmosSky() {
  const r = rng(15);
  let b = `<rect width="${W}" height="${H}" fill="url(#ksky)"/>`;
  // Somon yo'li — diagonal yorug' tasma va uning ichida zich mayda yulduzlar
  b += `<g transform="rotate(-24 800 500)"><ellipse cx="820" cy="430" rx="1100" ry="150" fill="url(#kmilk)"/><ellipse cx="900" cy="440" rx="700" ry="80" fill="url(#kmilk)"/>`;
  for (let i = 0; i < 400; i++) { const x = -300 + r() * 2200, g = (r() + r() + r() - 1.5) * 120; b += `<circle cx="${f(x)}" cy="${f(430 + g)}" r="${f(0.3 + r() * 0.9)}" fill="#fff" opacity="${f(0.15 + r() * 0.55)}"/>`; }
  b += '</g>';
  // Tumanliklar
  b += `<ellipse cx="1260" cy="210" rx="430" ry="250" fill="url(#kneb1)"/><ellipse cx="1430" cy="330" rx="260" ry="180" fill="url(#kneb3)"/><ellipse cx="880" cy="860" rx="420" ry="210" fill="url(#kneb2)"/><ellipse cx="300" cy="140" rx="300" ry="160" fill="url(#kneb2)" opacity="0.6"/>`;
  b += stars(r, 260, '#ffffff', 1.3) + stars(r, 26, '#ffe9c4', 2.2) + stars(r, 20, '#c9dcff', 2.4);
  return b;
}
function kosmosSun() {
  const { sx, sy } = KS;
  let b = `<circle cx="${sx}" cy="${sy}" r="560" fill="url(#kglow)"/>`;
  for (let i = 0; i < 18; i++) { const a = (-90 + i * 5) * Math.PI / 180; b += `<path d="M${f(sx + Math.cos(a) * 215)} ${f(sy + Math.sin(a) * 215)} L${f(sx + Math.cos(a) * (300 + (i % 3) * 40))} ${f(sy + Math.sin(a) * (300 + (i % 3) * 40))}" stroke="#ffd27a" stroke-opacity="0.16" stroke-width="${4 + (i % 2) * 3}" stroke-linecap="round"/>`; }
  return b + `<circle cx="${sx}" cy="${sy}" r="210" fill="url(#ksun)"/>`;
}
function kosmosOrbits() { return PLANETS.map((p) => `<circle cx="${KS.sx}" cy="${KS.sy}" r="${p[1]}" fill="none" stroke="#a9bbff" stroke-opacity="0.15" stroke-width="1.6" stroke-dasharray="2 7"/>`).join(''); }
// Bitta sayyora (tafsilotlari bilan); Saturn halqasining orqa qismi sayyoradan oldin, oldingi qismi keyin chiziladi
function planetSvg(p, i) {
  const [x0, y0] = planetPos(p), x = f(x0), y = f(y0), R = p[3], name = p[0];
  let b = '';
  const ring = (half) => `<path d="M${f(x0 - R * 2.15)} ${y} a${f(R * 2.15)} ${f(R * 0.55)} 0 0 ${half} ${f(R * 4.3)} 0" fill="none" stroke="#ecd59a" stroke-opacity="0.85" stroke-width="7" transform="rotate(-16 ${x} ${y})"/><path d="M${f(x0 - R * 1.75)} ${y} a${f(R * 1.75)} ${f(R * 0.43)} 0 0 ${half} ${f(R * 3.5)} 0" fill="none" stroke="#c8a96a" stroke-opacity="0.75" stroke-width="5" transform="rotate(-16 ${x} ${y})"/>`;
  if (name === 'saturn') b += ring(1);
  if (name === 'uranus') b += `<ellipse cx="${x}" cy="${y}" rx="${f(R * 0.45)}" ry="${f(R * 1.7)}" fill="none" stroke="#bff3f5" stroke-opacity="0.35" stroke-width="2" transform="rotate(20 ${x} ${y})"/>`;
  b += `<circle cx="${x}" cy="${y}" r="${R}" fill="url(#p${i})"/>`;
  let det = '';
  if (name === 'jupiter') {
    const bands = [['#c7915f', -0.55, 0.12], ['#e9c79a', -0.32, 0.1], ['#b5784a', -0.1, 0.14], ['#f1d8b2', 0.12, 0.09], ['#c08654', 0.32, 0.12], ['#e2bd8f', 0.55, 0.1]];
    for (const [c, o, w] of bands) det += `<rect x="${f(x0 - R)}" y="${f(y0 + o * R - w * R / 2)}" width="${R * 2}" height="${f(w * R)}" fill="${c}" opacity="0.7"/>`;
    det += `<ellipse cx="${f(x0 + R * 0.3)}" cy="${f(y0 + R * 0.28)}" rx="${f(R * 0.22)}" ry="${f(R * 0.12)}" fill="#c4553a" opacity="0.85"/>`;
  }
  if (name === 'saturn') for (const [c, o] of [['#d9b977', -0.3], ['#e8cf96', 0], ['#cfa865', 0.32]]) det += `<rect x="${f(x0 - R)}" y="${f(y0 + o * R - R * 0.08)}" width="${R * 2}" height="${f(R * 0.16)}" fill="${c}" opacity="0.6"/>`;
  if (name === 'earth') det += `<path d="M${f(x0 - R * 0.6)} ${f(y0 - R * 0.2)} q${f(R * 0.3)} ${f(-R * 0.5)} ${f(R * 0.7)} ${f(-R * 0.2)} q${f(R * 0.1)} ${f(R * 0.4)} ${f(-R * 0.2)} ${f(R * 0.5)} q${f(-R * 0.3)} ${f(R * 0.1)} ${f(-R * 0.5)} ${f(-R * 0.3)}z M${f(x0 + R * 0.1)} ${f(y0 + R * 0.25)} q${f(R * 0.4)} ${f(-R * 0.1)} ${f(R * 0.55)} ${f(R * 0.3)} q${f(-R * 0.2)} ${f(R * 0.35)} ${f(-R * 0.5)} ${f(R * 0.15)}z" fill="#3fae5a" opacity="0.9"/><path d="M${f(x0 - R * 0.9)} ${f(y0 + R * 0.05)} q${f(R * 0.6)} ${f(-R * 0.25)} ${f(R * 1.2)} 0 M${f(x0 - R * 0.3)} ${f(y0 - R * 0.6)} q${f(R * 0.5)} ${f(-R * 0.15)} ${f(R * 0.9)} ${f(R * 0.1)}" stroke="#fff" stroke-opacity="0.75" stroke-width="${f(R * 0.12)}" fill="none" stroke-linecap="round"/>`;
  if (name === 'mars') det += `<ellipse cx="${x}" cy="${f(y0 - R * 0.8)}" rx="${f(R * 0.45)}" ry="${f(R * 0.2)}" fill="#fff" opacity="0.8"/><circle cx="${f(x0 - R * 0.3)}" cy="${f(y0 + R * 0.2)}" r="${f(R * 0.2)}" fill="#7a2a10" opacity="0.4"/>`;
  if (name === 'neptune') det += `<ellipse cx="${f(x0 - R * 0.2)}" cy="${f(y0 + R * 0.15)}" rx="${f(R * 0.25)}" ry="${f(R * 0.14)}" fill="#1b2a8a" opacity="0.7"/><path d="M${f(x0 - R)} ${f(y0 - R * 0.3)} h${R * 2}" stroke="#bcd0ff" stroke-opacity="0.35" stroke-width="2"/>`;
  if (name === 'venus') det += `<path d="M${f(x0 - R)} ${f(y0 - R * 0.2)} q${R} ${f(-R * 0.3)} ${R * 2} 0 M${f(x0 - R)} ${f(y0 + R * 0.3)} q${R} ${f(-R * 0.25)} ${R * 2} 0" stroke="#fff6dc" stroke-opacity="0.45" stroke-width="${f(R * 0.18)}" fill="none"/>`;
  b += `<g clip-path="url(#pc${i})">${det}<circle cx="${x}" cy="${y}" r="${R}" fill="url(#kshade)"/></g>`;
  if (name === 'saturn') b += ring(0);
  return b;
}
function kosmos() { return svg(kosmosDefs(), kosmosSky() + kosmosOrbits() + kosmosSun() + PLANETS.map(planetSvg).join('')); }
function kosmosBase() { return svg(kosmosDefs(), kosmosSky() + kosmosOrbits() + kosmosSun()); }
// Harakatli qatlam: shaffof fon; animatsiyalar faqat transform/opacity (yengil); qurilmada «harakatni kamaytirish» — to'xtaydi
function kosmosFx() {
  const r = rng(77);
  const css = `.o{transform-origin:${KS.sx}px ${KS.sy}px;animation:ksw var(--d) ease-in-out infinite alternate}`
    + '@keyframes ksw{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}'
    + '.tw{animation:ktw var(--d) ease-in-out infinite alternate}@keyframes ktw{from{opacity:.15}to{opacity:1}}'
    + '.met{opacity:0;animation:kmet var(--d) linear infinite}@keyframes kmet{0%{opacity:0;transform:translate(0,0)}3%{opacity:1}12%{opacity:0;transform:translate(-620px,380px)}100%{opacity:0;transform:translate(-620px,380px)}}'
    + `.corona{transform-origin:${KS.sx}px ${KS.sy}px;animation:kco 7s ease-in-out infinite alternate}@keyframes kco{from{opacity:.55;transform:scale(.97)}to{opacity:1;transform:scale(1.04)}}`
    + '@media (prefers-reduced-motion:reduce){*{animation:none!important}}';
  let b = `<style>${css}</style><circle class="corona" cx="${KS.sx}" cy="${KS.sy}" r="300" fill="url(#kglow)"/>`;
  PLANETS.forEach((p, i) => { b += `<g class="o" style="--d:${30 + i * 9}s;animation-delay:-${i * 7}s">${planetSvg(p, i)}</g>`; });
  for (let i = 0; i < 70; i++) b += `<circle class="tw" style="--d:${f(2.5 + r() * 4)}s;animation-delay:-${f(r() * 6)}s" cx="${f(r() * W)}" cy="${f(r() * H * 0.85)}" r="${f(0.9 + r() * 1.6)}" fill="${r() < 0.8 ? '#fff' : '#ffe2a8'}"/>`;
  const met = (x, y, d, delay) => `<g class="met" style="--d:${d}s;animation-delay:${delay}s"><path d="M${x} ${y} l140 -86" stroke="url(#kmeteor)" stroke-width="2.6" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="2.6" fill="#fff"/></g>`;
  b += met(1380, 120, 13, 2) + met(1100, 60, 19, 9) + met(1500, 300, 23, 15);
  const defs = kosmosDefs() + '<linearGradient id="kmeteor" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#9fb4ff" stop-opacity="0"/></linearGradient>';
  // Qatlam sahifaga joylanadi — id lar sahifadagi elementlar bilan to'qnashmasin (avval sayyoralar qora chiqardi)
  return svg(defs, b).replace(/id="([^"]+)"/g, 'id="kfx-$1"').replace(/url\(#([^)]+)\)/g, 'url(#kfx-$1)');
}

// 🐪 Karvon — shom paytidagi cho'l: barxanlar va qator tuyalar
function karvon() {
  const r = rng(1);
  const defs = lin('sky', [[0, '#1d1430'], [0.55, '#6b3a4a'], [1, '#e08a4a']]) + rad('sun', [[0, '#ffe2a1'], [1, '#ffb15c']]) + lin('d1', [[0, '#c27a3e'], [1, '#7a4422']]) + lin('d2', [[0, '#9a5a2e'], [1, '#4e2a16']]) + lin('d3', [[0, '#6b3c1e'], [1, '#2a160b']]);
  const camel = (x, y, s) => `<g transform="translate(${f(x)} ${f(y)}) scale(${s})" fill="#1a0d06"><path d="M0 0 q6 -22 22 -24 q8 -14 18 -2 q10 -12 20 0 q10 2 14 12 l10 -18 q4 -6 9 -2 l4 6 q-2 4 -6 4 l-12 26 q-2 6 -8 8 l0 30 h-5 l-2 -28 h-30 l-2 28 h-5 l-1 -28 q-4 2 -8 0 l-2 28 h-5 l0 -30 q-6 -4 -6 -12z"/></g>`;
  let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>` + stars(r, 90, '#fff', 1.2, 380) + `<circle cx="1180" cy="560" r="120" fill="url(#sun)" opacity="0.95"/>`;
  body += `<path d="M0 620 Q300 520 620 600 T1200 590 T1600 560 V1000 H0z" fill="url(#d1)"/>`;
  let cx = 330; for (let i = 0; i < 6; i++) { body += camel(cx, 548 + Math.sin(i) * 4, 1.05); cx += 112; }
  body += `<path d="M0 700 Q380 640 760 720 T1600 680 V1000 H0z" fill="url(#d2)"/><path d="M0 820 Q420 760 900 830 T1600 800 V1000 H0z" fill="url(#d3)"/>`;
  return svg(defs, body);
}

// ♞ Klassik — klub zali: istiqbolda katakli pol va yorug'lik
function classic() {
  const defs = lin('wall', [[0, '#13221c'], [1, '#0b1511']]) + rad('spot', [[0, '#fff2c6', 0.32], [1, '#fff2c6', 0]]);
  let body = `<rect width="${W}" height="${H}" fill="url(#wall)"/><ellipse cx="800" cy="420" rx="760" ry="520" fill="url(#spot)"/>`;
  const hz = 560, vx = 800;
  for (let row = 0; row < 9; row++) {
    const t0 = row / 9, t1 = (row + 1) / 9;
    const y0 = hz + (H - hz) * t0 * t0, y1 = hz + (H - hz) * t1 * t1;
    for (let c = -8; c < 8; c++) {
      const x = (y) => vx + c * 200 * ((y - hz) / (H - hz)) * 1.6;
      const xb = (y) => vx + (c + 1) * 200 * ((y - hz) / (H - hz)) * 1.6;
      if ((row + c) % 2 === 0) continue;
      body += `<path d="M${f(x(y0))} ${f(y0)} L${f(xb(y0))} ${f(y0)} L${f(xb(y1))} ${f(y1)} L${f(x(y1))} ${f(y1)}z" fill="#e9dcc0" opacity="${f(0.07 + t1 * 0.12)}"/>`;
    }
  }
  body += `<path d="M560 560 h480" stroke="#e9dcc0" stroke-opacity="0.12" stroke-width="2"/>`;
  return svg(defs, body);
}

// 👁 Aniq — tinch, kontrastli: katta yumshoq kvadratlar (ko'z charchamaydi)
function clear() {
  const r = rng(3);
  let body = `<rect width="${W}" height="${H}" fill="#151a1f"/>`;
  for (let y = 0; y < 6; y++) for (let x = 0; x < 9; x++) if ((x + y) % 2 === 0) body += `<rect x="${x * 190 - 40}" y="${y * 190 - 60}" width="170" height="170" rx="26" fill="#ffffff" opacity="${f(0.03 + r() * 0.04)}"/>`;
  return svg('', body);
}

// 🧵 Atlas — Marg'ilon atlasi (abr) naqshi: to'lqinli romblar
function atlas() {
  const cols = ['#d6336c', '#f2b705', '#1aa7a1', '#6741d9', '#f76707'];
  let body = `<rect width="${W}" height="${H}" fill="#1a0f22"/>`;
  for (let c = 0; c < 12; c++) {
    const x = c * 140, col = cols[c % cols.length];
    for (let y = -100; y < H + 100; y += 160) {
      const off = (c % 2) * 80, w = 62 + (c % 3) * 12;
      // Abr (ikat) — chetlari "oqib ketgan" romb: tashqi xira, ichki yorqin qatlam
      body += `<path d="M${x + 70} ${y + off - 10} q${w + 14} 50 0 100 q-${w + 14} 50 0 100 q-${w + 14} -50 0 -100 q${w + 14} -50 0 -100z" fill="${col}" opacity="0.22"/>`;
      body += `<path d="M${x + 70} ${y + off} q${w} 40 0 80 q-${w} 40 0 80 q-${w} -40 0 -80 q${w} -40 0 -80z" fill="${col}" opacity="0.55"/>`;
      body += `<path d="M${x + 70} ${y + off + 30} q${w * 0.4} 30 0 50 q-${w * 0.4} -20 0 -50z" fill="#fff" opacity="0.28"/>`;
    }
    body += `<path d="M${x} 0 V${H}" stroke="${col}" stroke-opacity="0.3" stroke-width="12" stroke-dasharray="24 18"/>`;
  }
  return svg('', body);
}

// 🏺 Rishton — kulolchilik laganlari: ko'k-yashil rozetkalar
function rishton() {
  const r = rng(5);
  let body = `<rect width="${W}" height="${H}" fill="#0c1b26"/>`;
  const plate = (cx, cy, R) => {
    let g = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#14445e" opacity="0.55"/><circle cx="${cx}" cy="${cy}" r="${f(R * 0.92)}" fill="none" stroke="#e8d9b5" stroke-opacity="0.25" stroke-width="3"/>`;
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      const x = cx + Math.cos(a) * R * 0.58, y = cy + Math.sin(a) * R * 0.58;
      g += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(R * 0.2)}" ry="${f(R * 0.08)}" transform="rotate(${f(a * 180 / Math.PI)} ${f(x)} ${f(y)})" fill="#1f9ea8" opacity="0.5"/>`;
    }
    g += `<circle cx="${cx}" cy="${cy}" r="${f(R * 0.22)}" fill="#e8d9b5" opacity="0.22"/><circle cx="${cx}" cy="${cy}" r="${f(R * 0.1)}" fill="#2a7fbf" opacity="0.5"/>`;
    return g;
  };
  const spots = [[220, 240, 190], [760, 160, 140], [1300, 300, 220], [460, 720, 210], [1050, 760, 170], [1520, 880, 150], [-40, 860, 160]];
  for (const [x, y, R] of spots) body += plate(x, y, R);
  for (let i = 0; i < 40; i++) body += `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(3 + r() * 5)}" fill="#e8d9b5" opacity="0.12"/>`;
  return svg('', body);
}

// 🪵 Yog'och — yo'nilgan taxta tolalari va ko'zlari
function wood() {
  const r = rng(6);
  let body = `<rect width="${W}" height="${H}" fill="#2a1a10"/>`;
  for (let y = 0; y < H; y += 14) {
    let d = `M0 ${y}`;
    for (let x = 0; x <= W; x += 100) d += ` Q${x + 50} ${f(y + (r() - 0.5) * 16)} ${x + 100} ${f(y + (r() - 0.5) * 6)}`;
    body += `<path d="${d}" stroke="${r() < 0.5 ? '#5a3a22' : '#3d2615'}" stroke-width="${f(2 + r() * 5)}" fill="none" opacity="0.7"/>`;
  }
  for (let k = 0; k < 6; k++) {
    const x = r() * W, y = r() * H;
    for (let i = 4; i > 0; i--) body += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${i * 14}" ry="${i * 6}" fill="none" stroke="#1c1009" stroke-opacity="0.5" stroke-width="3"/>`;
  }
  body += `<rect width="${W}" height="${H}" fill="#000" opacity="0.15"/>`;
  return svg('', body);
}

// 👑 Shohona — saroy ravoqlari, oltin chiziqlar va toj
function royal() {
  const defs = lin('bg', [[0, '#1d1406'], [1, '#0d0904']]);
  let body = `<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
  for (let i = 0; i < 7; i++) {
    const x = 40 + i * 240;
    body += `<path d="M${x} 1000 V420 Q${x} 260 ${x + 100} 230 Q${x + 200} 260 ${x + 200} 420 V1000" fill="none" stroke="#d4a017" stroke-opacity="0.28" stroke-width="5"/>`;
    body += `<path d="M${x + 20} 1000 V430 Q${x + 20} 290 ${x + 100} 266 Q${x + 180} 290 ${x + 180} 430 V1000" fill="#d4a017" opacity="0.05"/>`;
    body += `<rect x="${x - 18}" y="400" width="18" height="600" fill="#d4a017" opacity="0.12"/>`;
  }
  body += `<g transform="translate(800 120)" fill="#e6b422" opacity="0.4"><path d="M-90 40 L-70 -30 L-35 10 L0 -50 L35 10 L70 -30 L90 40z"/><rect x="-92" y="44" width="184" height="18" rx="4"/><circle cx="0" cy="-58" r="10"/><circle cx="-70" cy="-38" r="8"/><circle cx="70" cy="-38" r="8"/></g>`;
  return svg(defs, body);
}

// 💡 Neon — synthwave: chiziqli quyosh va istiqbolli to'r
function neon() {
  const r = rng(8);
  const defs = lin('sky', [[0, '#0d0221'], [0.6, '#2b0b4f'], [1, '#3a0d5c']]) + lin('sun', [[0, '#ffd319'], [0.5, '#ff2975'], [1, '#c912ff']]);
  let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>` + stars(r, 120, '#fff', 1.2, 500);
  body += `<g><circle cx="800" cy="520" r="220" fill="url(#sun)"/>`;
  for (let i = 0; i < 7; i++) body += `<rect x="560" y="${540 + i * 26}" width="480" height="${4 + i * 2}" fill="#2b0b4f"/>`;
  body += `</g><rect y="600" width="${W}" height="400" fill="#12022b"/>`;
  for (let i = -20; i <= 20; i++) body += `<path d="M800 600 L${800 + i * 140} 1000" stroke="#ff2bd6" stroke-opacity="0.55" stroke-width="2"/>`;
  for (let i = 1; i < 12; i++) { const y = 600 + 400 * Math.pow(i / 11, 2); body += `<path d="M0 ${f(y)} H${W}" stroke="#00e5ff" stroke-opacity="${f(0.2 + i * 0.04)}" stroke-width="2"/>`; }
  return svg(defs, body);
}

// 🔷 Geometrik — past poligonli uchburchaklar
function geo() {
  const r = rng(9);
  let body = `<rect width="${W}" height="${H}" fill="#08201d"/>`;
  const S = 120, pts = [];
  for (let y = 0; y <= Math.ceil(H / S) + 1; y++) { pts.push([]); for (let x = 0; x <= Math.ceil(W / S) + 1; x++) pts[y].push([x * S + (r() - 0.5) * 60, y * S + (r() - 0.5) * 60]); }
  for (let y = 0; y < pts.length - 1; y++) for (let x = 0; x < pts[y].length - 1; x++) {
    const a = pts[y][x], b = pts[y][x + 1], c = pts[y + 1][x], d = pts[y + 1][x + 1];
    const shade = (t) => `hsl(${f(165 + t * 25)}, 55%, ${f(10 + t * 14)}%)`;
    body += `<path d="M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])} L${f(c[0])} ${f(c[1])}z" fill="${shade(r())}"/>`;
    body += `<path d="M${f(b[0])} ${f(b[1])} L${f(d[0])} ${f(d[1])} L${f(c[0])} ${f(c[1])}z" fill="${shade(r())}"/>`;
  }
  return svg('', body);
}

// 🎈 Bolajon — pufakchalar, yulduzchalar va bulutchalar
function cute() {
  const r = rng(10);
  const cols = ['#ff8fab', '#ffd166', '#8ce99a', '#74c0fc', '#b197fc'];
  let body = `<rect width="${W}" height="${H}" fill="#241a3a"/>`;
  for (let i = 0; i < 26; i++) { const c = cols[i % 5]; body += `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(18 + r() * 60)}" fill="${c}" opacity="0.16"/>`; }
  const star = (x, y, s, c) => `<path transform="translate(${f(x)} ${f(y)}) scale(${f(s)})" d="M0 -10 L3 -3 L10 -3 L4 2 L6 10 L0 5 L-6 10 L-4 2 L-10 -3 L-3 -3z" fill="${c}" opacity="0.4"/>`;
  for (let i = 0; i < 30; i++) body += star(r() * W, r() * H, 0.8 + r() * 2, cols[i % 5]);
  const cloud = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity="0.1"><circle cx="0" cy="0" r="40"/><circle cx="45" cy="-15" r="50"/><circle cx="95" cy="0" r="38"/><rect x="0" y="0" width="95" height="38"/></g>`;
  body += cloud(160, 160, 1.4) + cloud(1180, 220, 1.1) + cloud(640, 820, 1.6);
  return svg('', body);
}

// 👾 Piksel — piksel manzara: tog'lar, bulutlar, quyosh
function pixel() {
  const P = 40;
  let body = `<rect width="${W}" height="${H}" fill="#14213d"/>`;
  const px = (x, y, c, o = 1) => `<rect x="${x * P}" y="${y * P}" width="${P}" height="${P}" fill="${c}" opacity="${o}"/>`;
  // quyosh
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 10) body += px(30 + x, 5 + y, '#ffb703', 0.6);
  // bulutlar
  const cloud = [[0, 1], [1, 0], [2, 0], [3, 1], [1, 1], [2, 1], [4, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2]];
  for (const [ox, oy] of [[4, 3], [17, 6], [33, 12]]) for (const [x, y] of cloud) body += px(ox + x, oy + y, '#e0e1dd', 0.25);
  // tog'lar
  const heights = [8, 9, 11, 13, 12, 10, 9, 10, 12, 14, 15, 13, 11, 10, 9, 8, 9, 11, 12, 11, 9, 8, 10, 12, 13, 14, 12, 10, 9, 8, 7, 8, 9, 11, 12, 10, 9, 8, 8, 9, 10];
  heights.forEach((h, x) => { for (let y = 25 - h; y < 25; y++) body += px(x, y, y === 25 - h ? '#8ecae6' : (y < 25 - h + 2 ? '#457b9d' : '#1d3557'), 0.75); });
  for (let x = 0; x < 41; x++) body += px(x, 24, '#2a9d8f', 0.8);
  return svg('', body);
}

// 🪙 Tanga — Ipak yo'li tangalari: sochilgan oltin va kumush tangalar
function tanga() {
  const r = rng(12);
  let body = `<rect width="${W}" height="${H}" fill="#1a1208"/>`;
  const defs = rad('gold', [[0, '#ffe08a'], [1, '#b8860b']], 0.35, 0.35, 0.8) + rad('silver', [[0, '#f1f3f5'], [1, '#868e96']], 0.35, 0.35, 0.8);
  for (let i = 0; i < 34; i++) {
    const x = r() * W, y = r() * H, R = 30 + r() * 55, g = r() < 0.7 ? 'gold' : 'silver';
    body += `<g opacity="${f(0.25 + r() * 0.3)}"><circle cx="${f(x)}" cy="${f(y)}" r="${f(R)}" fill="url(#${g})"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(R * 0.8)}" fill="none" stroke="#5c4410" stroke-width="3"/>`;
    if (i % 3 === 0) body += `<rect x="${f(x - R * 0.18)}" y="${f(y - R * 0.18)}" width="${f(R * 0.36)}" height="${f(R * 0.36)}" fill="#1a1208" opacity="0.7"/>`;
    else if (i % 3 === 1) body += `<path d="M${f(x)} ${f(y - R * 0.4)} L${f(x + R * 0.12)} ${f(y - R * 0.12)} L${f(x + R * 0.4)} ${f(y)} L${f(x + R * 0.12)} ${f(y + R * 0.12)} L${f(x)} ${f(y + R * 0.4)} L${f(x - R * 0.12)} ${f(y + R * 0.12)} L${f(x - R * 0.4)} ${f(y)} L${f(x - R * 0.12)} ${f(y - R * 0.12)}z" fill="#5c4410" opacity="0.7"/>`;
    else body += `<path d="M${f(x + R * 0.2)} ${f(y - R * 0.35)} a${f(R * 0.4)} ${f(R * 0.4)} 0 1 0 0 ${f(R * 0.7)} a${f(R * 0.3)} ${f(R * 0.3)} 0 1 1 0 ${f(-R * 0.7)}z" fill="#5c4410" opacity="0.7"/>`;
    body += '</g>';
  }
  return svg(defs, body);
}

// 🕌 Samarqand — Registon: tungi osmon, yarim oy, uch madrasa siluetlari va gumbazlar
function samarqand() {
  const r = rng(13);
  const defs = lin('sky', [[0, '#071224'], [0.7, '#123a5c'], [1, '#1b5a7a']]) + lin('dome', [[0, '#3fc1c9'], [1, '#14707a']]);
  let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>` + stars(r, 160, '#fff', 1.4, 560);
  body += `<path d="M1320 150 a60 60 0 1 0 50 95 a46 46 0 1 1 -50 -95z" fill="#ffe8a3" opacity="0.85"/>`;
  const sil = '#0a1a26';
  const madrasa = (cx, w, h) => {
    let g = `<rect x="${cx - w / 2}" y="${1000 - h}" width="${w}" height="${h}" fill="${sil}"/>`;
    // peshtoq ravog'i
    g += `<path d="M${cx - w * 0.22} 1000 V${1000 - h * 0.7} Q${cx - w * 0.22} ${1000 - h * 0.9} ${cx} ${1000 - h * 0.94} Q${cx + w * 0.22} ${1000 - h * 0.9} ${cx + w * 0.22} ${1000 - h * 0.7} V1000z" fill="#14707a" opacity="0.45"/>`;
    g += `<path d="M${cx - w * 0.22} ${1000 - h * 0.62} H${cx + w * 0.22}" stroke="#3fc1c9" stroke-opacity="0.35" stroke-width="4"/>`;
    // minoralar
    for (const s of [-1, 1]) { const mx = cx + s * (w / 2 + 14); g += `<rect x="${mx - 14}" y="${1000 - h * 1.25}" width="28" height="${h * 1.25}" fill="${sil}"/><path d="M${mx - 18} ${1000 - h * 1.25} h36 l-6 -16 h-24z" fill="${sil}"/>`; }
    return g;
  };
  body += `<path d="M0 1000 V860 H1600 V1000z" fill="${sil}"/>`;
  body += madrasa(330, 340, 330) + madrasa(1270, 340, 330);
  // markaziy madrasa va gumbazlar
  body += madrasa(800, 400, 380);
  for (const [x, rr] of [[600, 70], [1000, 70]]) body += `<path d="M${x - rr} ${1000 - 380} a${rr} ${rr * 1.15} 0 0 1 ${rr * 2} 0z" fill="url(#dome)"/><path d="M${x} ${1000 - 380 - rr * 1.15} v-26" stroke="#3fc1c9" stroke-width="4"/>`;
  for (let i = -3; i <= 3; i++) body += `<path d="M${600 + i * 18} ${620} q${-i * 4} ${-60} ${-i * 2} ${-78}" stroke="#0a1a26" stroke-opacity="0.35" stroke-width="2" fill="none"/>`;
  return svg(defs, body);
}

// 🕊 Origami — buklangan qog'oz turnalar va uchburchaklar
function origami() {
  const r = rng(14);
  let body = `<rect width="${W}" height="${H}" fill="#1c0f12"/>`;
  const crane = (x, y, s, c) => `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})" opacity="0.38"><path d="M0 0 L60 -40 L40 10z" fill="${c}"/><path d="M0 0 L40 10 L-10 30z" fill="#fff" opacity="0.5"/><path d="M40 10 L110 -10 L70 30z" fill="${c}"/><path d="M-10 30 L-50 -5 L-30 35z" fill="${c}" opacity="0.8"/><path d="M60 -40 L80 -70 L70 -20z" fill="#fff" opacity="0.6"/></g>`;
  const cols = ['#e03131', '#f8f0e3', '#f08c00', '#c2255c'];
  for (let i = 0; i < 14; i++) body += crane(r() * W, r() * H, 0.8 + r() * 1.4, cols[i % 4]);
  for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H, s = 10 + r() * 30; body += `<path d="M${f(x)} ${f(y)} l${f(s)} ${f(s * 0.6)} l${f(-s * 0.4)} ${f(s)}z" fill="${cols[i % 4]}" opacity="0.14"/>`; }
  return svg('', body);
}

const BACKGROUNDS = { karvon, classic, clear, atlas, rishton, wood, royal, neon, geo, cute, pixel, tanga, samarqand, origami, kosmos };
// Harakatli fon fayllari (bgfx.js): asos va harakatli qatlam
const EXTRAS = { 'kosmos-base': kosmosBase, 'kosmos-fx': kosmosFx };
module.exports = { BACKGROUNDS, EXTRAS };

if (require.main === module) {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv[2];
  for (const [id, fn] of Object.entries({ ...BACKGROUNDS, ...EXTRAS })) {
    if (only && !id.startsWith(only)) continue;
    const s = fn();
    fs.writeFileSync(path.join(OUT, id + '.svg'), s);
    console.log(id + '.svg', Math.round(s.length / 1024) + ' KB');
  }
}
