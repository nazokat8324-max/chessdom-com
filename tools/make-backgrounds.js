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
  const css = `#bgFx .o{transform-origin:${KS.sx}px ${KS.sy}px;animation:ksw var(--d) ease-in-out infinite alternate}`
    + '@keyframes ksw{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}'
    + '#bgFx .tw{animation:ktw var(--d) ease-in-out infinite alternate}@keyframes ktw{from{opacity:.15}to{opacity:1}}'
    + '#bgFx .met{opacity:0;animation:kmet var(--d) linear infinite}@keyframes kmet{0%{opacity:0;transform:translate(0,0)}3%{opacity:1}12%{opacity:0;transform:translate(-620px,380px)}100%{opacity:0;transform:translate(-620px,380px)}}'
    + `#bgFx .corona{transform-origin:${KS.sx}px ${KS.sy}px;animation:kco 7s ease-in-out infinite alternate}@keyframes kco{from{opacity:.55;transform:scale(.97)}to{opacity:1;transform:scale(1.04)}}`
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

// ===== Harakatli qatlamlar (2026-11-22, foydalanuvchi so'rovi: «boshqa to'plamlarning fonlarini ham jonli qil») =====
// Har to'plamda <id>-fx.svg (bgfx.js sahifaga joylaydi). Harakatlanadigan narsa rasmda ham bo'lsa (tuyalar, laganlar, bulutlar,
// turnalar, neon to'ri) — <id>-base.svg ularsiz asos (style.css `html.bg-motion[data-bg=…]`), aks holda qatlam asosiy rasm ustiga
// qo'shimcha jilo/zarra qo'shadi. Uslub sahifaga tushadi: selektorlar `$.` → `#bgFx .` (sahifadagi klasslarga tegmasin),
// keyframe nomlari `~` → to'plam prefiksi; id lar ham prefiksli. Faqat transform/opacity — yengil.
const REDUCE = '@media (prefers-reduced-motion:reduce){*{animation:none!important}}';
function fxSvg(pre, css, body, defs = '') {
  const style = (css + REDUCE).replace(/\$\./g, '#bgFx .').replace(/~/g, pre);
  return svg(defs, `<style>${style}</style>` + body).replace(/id="([^"]+)"/g, `id="${pre}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${pre}-$1)`);
}
const anim = (cls, d, delay, extra = '') => `class="${cls}" style="--d:${f(d)}s;animation-delay:-${f(delay)}s${extra}"`;
const ORIGIN = (x, y) => `;transform-origin:${f(x)}px ${f(y)}px`;
// Miltillovchi nuqtalar (yulduz, zarra)
const TWCSS = '$.tw{animation:~tw var(--d) ease-in-out infinite alternate}@keyframes ~tw{from{opacity:.08}to{opacity:1}}';
function twinkles(r, n, color, y0, y1, r0, r1) {
  let s = '';
  for (let i = 0; i < n; i++) s += `<circle ${anim('tw', 2.5 + r() * 4, r() * 6)} cx="${f(r() * W)}" cy="${f(y0 + r() * (y1 - y0))}" r="${f(r0 + r() * (r1 - r0))}" fill="${Array.isArray(color) ? color[i % color.length] : color}"/>`;
  return s;
}
// Ko'ndalang jilo chizig'i (atlas, yog'och, saroy): qiya yorug' tasma chapdan o'ngga o'tadi
const SHEEN = (op) => `<linearGradient id="sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="${op}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
const SHEENCSS = '$.sh{animation:~sh var(--d) ease-in-out infinite}@keyframes ~sh{from{transform:translateX(-900px)}to{transform:translateX(2300px)}}';
const sheenBand = (d, delay, w = 260) => `<g ${anim('sh', d, delay)}><rect x="0" y="-300" width="${w}" height="1600" fill="url(#sh)" transform="rotate(18 ${w / 2} 500)"/></g>`;
// Yuqoriga ko'tariluvchi zarralar (chang, qum, oltin kukun)
const RISECSS = (dx, dy) => `$.rs{opacity:0;animation:~rs var(--d) linear infinite}@keyframes ~rs{0%{opacity:0;transform:translate(0,0)}20%{opacity:1}80%{opacity:1}100%{opacity:0;transform:translate(${dx}px,${dy}px)}}`;

// 🐪 Karvon — shom paytidagi cho'l (2026-11-24, «yanada jonliroq»): uzoq tog'lar, quyosh, qirrali barxanlar, voha palmalari,
// yukli tuyalar va karvonboshi. Harakatli qatlamda: tuyalar oyoq bosib yuradi (ikki kadr), chang, qushlar, bulutlar, shamol izlari.
const CAMEL_BODY = 'M14 44 C6 40 6 28 16 24 C22 4 46 0 56 18 C62 26 70 26 76 22 C82 16 84 6 90 2 C96 -1 104 2 106 8 L104 12 C100 13 94 12 92 12 C90 20 88 32 80 40 C70 46 30 48 14 44Z';
const CAMEL_LEGS = [
  'M72 42 L78 80 M64 42 L60 80 M28 42 L32 80 M20 42 L16 80', // 1-kadr
  'M72 42 L66 80 M64 42 L70 80 M28 42 L24 80 M20 42 L26 80', // 2-kadr
];
const CLOTH = ['#b8342a', '#2b6f9e', '#c98a1c', '#6e3b8f', '#2d8a5f', '#b8342a'];
// Tuya (o'ngga qaragan); legs: 0/1 — bitta kadr, 'anim' — ikki kadr navbat bilan (harakatli qatlam)
function camelSvg2(x, y, s, i, legs) {
  const ink = '#1c0e07';
  let g = `<g transform="translate(${f(x)} ${f(y)}) scale(${s})">`;
  const legPath = (k, extra) => `<path${extra || ''} d="${CAMEL_LEGS[k]}" stroke="${ink}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  if (legs === 'anim') g += legPath(0, ' class="la"') + legPath(1, ' class="lb"');
  else g += legPath(legs || 0);
  g += `<path d="M8 32 q-7 6 -4 17" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  g += `<path d="${CAMEL_BODY}" fill="${ink}"/>`;
  if (i === 0) {
    // karvonboshi: o'tirgan odam, salla, to'n
    g += `<path d="M34 6 C34 -6 46 -8 48 6Z" fill="${CLOTH[0]}"/><circle cx="41" cy="-12" r="5" fill="${ink}"/><path d="M35 -15 Q41 -23 47 -15 Q41 -12 35 -15Z" fill="#efe3c8"/><path d="M47 -4 L58 -10" stroke="${ink}" stroke-width="2"/>`;
  } else {
    // yuk: rangli mato o'ralgan tugunlar
    const c = CLOTH[i % CLOTH.length];
    g += `<rect x="26" y="2" width="30" height="14" rx="5" fill="${c}"/><path d="M26 9 H56" stroke="#f3d58a" stroke-width="2" opacity="0.8"/><rect x="20" y="10" width="10" height="16" rx="3" fill="${c}" opacity="0.85"/><rect x="52" y="10" width="10" height="16" rx="3" fill="${c}" opacity="0.85"/>`;
  }
  // jilov ipi keyingi tuyaga
  if (i > 0) g += `<path d="M106 10 Q118 18 128 14" stroke="${ink}" stroke-width="1.5" fill="none" opacity="0.7"/>`;
  return g + '</g>';
}
const palmSvg = (x, y, s) => `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})" fill="#2a1408"><path d="M0 0 C-4 -40 4 -80 12 -110 L16 -108 C10 -80 4 -40 6 0Z"/>`
  + [[-60, -96, -20], [-46, -126, -8], [40, -126, 8], [62, -96, 20], [0, -140, 0]].map(([dx, dy, k]) => `<path d="M14 -110 Q${f(14 + dx * 0.5)} ${f(-110 + (dy + 110) * 1.4 - 20)} ${f(14 + dx)} ${f(dy + 10 + Math.abs(k))} Q${f(14 + dx * 0.45)} ${f(-110 + (dy + 110) * 0.6 - 8)} 14 -108Z"/>`).join('') + '</g>';
// Barxanlar (ustki egri chiziqlari bilan — qirradagi yorug' chiziq uchun)
const KV_DUNES = [
  ['M0 640 Q300 548 620 622 T1200 612 T1600 580', 'd1', 0.5],
  ['M0 720 Q380 664 760 740 T1600 700', 'd2', 0.38],
  ['M0 840 Q420 784 900 852 T1600 820', 'd3', 0.28],
];
function karvon(dynamic = true) {
  const r = rng(1);
  const defs = lin('sky', [[0, '#140d26'], [0.35, '#3b1f4a'], [0.62, '#8a3d4f'], [0.85, '#e9864a'], [1, '#f6b25e']])
    + rad('sun', [[0, '#fff1c4'], [0.6, '#ffd27a'], [1, '#ff9a4a']]) + rad('sunHalo', [[0, '#ffcf7a', 0.55], [1, '#ff9a4a', 0]])
    + lin('d1', [[0, '#d08a48'], [1, '#7a4422']]) + lin('d2', [[0, '#a4622f'], [1, '#4e2a16']]) + lin('d3', [[0, '#734020'], [1, '#2a160b']])
    + lin('mtn', [[0, '#5a3352'], [1, '#7e4552']]);
  let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>` + stars(r, 110, '#fff', 1.3, 340);
  body += `<circle cx="1180" cy="560" r="330" fill="url(#sunHalo)"/><circle cx="1180" cy="560" r="135" fill="url(#sun)"/>`;
  for (let i = 0; i < 4; i++) body += `<rect x="1020" y="${548 + i * 18}" width="320" height="${3 + i}" fill="#e9864a" opacity="0.35"/>`;
  // uzoq tog'lar
  let m = 'M0 640'; let x = 0;
  while (x < W) { x += 60 + r() * 90; m += ` L${f(x)} ${f(520 + r() * 70)}`; x += 50 + r() * 70; m += ` L${f(x)} ${f(585 + r() * 30)}`; }
  body += `<path d="${m} L${W} 640z" fill="url(#mtn)" opacity="0.75"/>`;
  if (dynamic) {
    // bulutlar (harakatli qatlamda suzadi — asosda yo'q)
    for (const [cx, cy, s] of [[300, 210, 1.2], [880, 150, 0.9], [1420, 260, 1]]) body += kvCloud(cx, cy, s, 0.35);
  }
  KV_DUNES.forEach(([top, grad, hl], i) => {
    body += `<path d="${top} V1000 H0z" fill="url(#${grad})"/><path d="${top}" stroke="#ffd59a" stroke-opacity="${hl}" stroke-width="3" fill="none"/>`;
    if (i === 0) {
      body += palmSvg(1440, 600, 0.8) + palmSvg(1500, 596, 0.62) + palmSvg(1395, 606, 0.5);
      body += `<ellipse cx="1460" cy="612" rx="70" ry="8" fill="#3d7f7a" opacity="0.6"/>`;
      if (dynamic) { let cx = 300; for (let k = 0; k < 6; k++) { body += camelSvg2(cx, 532 + Math.sin(k) * 4, 1.05, k, k % 2); cx += 124; } }
    }
  });
  // qum to'lqinlari (shamol izlari) — old barxanda
  for (let i = 0; i < 18; i++) { const y = 870 + r() * 120, xx = r() * W; body += `<path d="M${f(xx)} ${f(y)} q40 -6 80 0 t80 0" stroke="#a86a38" stroke-opacity="0.35" stroke-width="2" fill="none"/>`; }
  return svg(defs, body);
}
function kvCloud(cx, cy, s, op) {
  return `<g transform="translate(${cx} ${cy}) scale(${s})" fill="#f3b48a" opacity="${op}"><ellipse cx="0" cy="0" rx="120" ry="14"/><ellipse cx="40" cy="-10" rx="70" ry="12"/><ellipse cx="-60" cy="6" rx="80" ry="9"/></g>`;
}
// Harakatli qatlam: karvon yuradi (oyoqlar ikki kadr), har tuya chayqaladi, ortidan chang; qushlar galasi; bulutlar; shamol izlari
function karvonFx() {
  const r = rng(101);
  const css = TWCSS + RISECSS(-90, -26)
    + '$.cv{animation:~cv 170s linear infinite}@keyframes ~cv{from{transform:translateX(-1000px)}to{transform:translateX(1700px)}}'
    + '$.bob{animation:~bob .9s ease-in-out infinite alternate}@keyframes ~bob{from{transform:translateY(0)}to{transform:translateY(-3px)}}'
    + '$.la{animation:~lg .9s steps(1) infinite}$.lb{animation:~lg .9s steps(1) infinite;animation-delay:-.45s}@keyframes ~lg{0%{opacity:1}50%{opacity:0}}'
    + '$.sun{animation:~sun 8s ease-in-out infinite alternate}@keyframes ~sun{from{opacity:.35;transform:scale(.95)}to{opacity:.9;transform:scale(1.07)}}'
    + '$.cl{animation:~cl var(--d) linear infinite}@keyframes ~cl{from{transform:translateX(-500px)}to{transform:translateX(2100px)}}'
    + '$.bd{animation:~bd var(--d) linear infinite}@keyframes ~bd{0%{transform:translate(-200px,40px)}100%{transform:translate(1900px,-80px)}}'
    + '$.wg{transform-box:fill-box;transform-origin:center;animation:~wg .5s ease-in-out infinite alternate}@keyframes ~wg{from{transform:scaleY(1)}to{transform:scaleY(-.6)}}'
    + '$.wd{opacity:0;animation:~wd var(--d) ease-in-out infinite}@keyframes ~wd{0%{opacity:0;transform:translateX(0)}30%{opacity:.8}100%{opacity:0;transform:translateX(-260px)}}';
  let b = `<circle class="sun" style="transform-origin:1180px 560px" cx="1180" cy="560" r="260" fill="url(#glow)"/>` + twinkles(r, 46, '#fff', 0, 330, 0.8, 1.6);
  // bulutlar
  [[210, 1.2, 140, 20], [150, 0.9, 190, 110], [270, 1, 160, 70]].forEach(([y, s, d, del]) => { b += `<g ${anim('cl', d, del)}>${kvCloud(0, y, s, 0.4)}</g>`; });
  // qushlar galasi
  const bird = (x, y) => `<g transform="translate(${x} ${y})"><path class="wg" d="M0 0 q6 -5 12 0 q6 -5 12 0" stroke="#2a1530" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>`;
  b += `<g ${anim('bd', 46, 10)}>` + [[0, 0], [28, 14], [-26, 16], [54, 28], [-52, 30]].map(([x, y]) => bird(x, 200 + y)).join('') + '</g>';
  b += `<g ${anim('bd', 63, 40)}>` + [[0, 0], [24, 12], [-22, 14]].map(([x, y]) => bird(x, 120 + y)).join('') + '</g>';
  // karvon
  b += `<g ${anim('cv', 170, 50)}>`;
  for (let i = 0; i < 6; i++) {
    b += `<g ${anim('bob', 0.9, i * 0.31)}>${camelSvg2(i * 124, 532 + Math.sin(i) * 4, 1.05, i, 'anim')}</g>`;
    for (let k = 0; k < 4; k++) b += `<circle ${anim('rs', 2.5 + r() * 2, r() * 4)} cx="${f(i * 124 + 10 + r() * 20)}" cy="${f(612 + r() * 6)}" r="${f(2 + r() * 3)}" fill="#e7b27a" fill-opacity="0.55"/>`;
  }
  b += '</g>';
  // shamol izlari va qum zarralari
  for (let i = 0; i < 12; i++) b += `<path ${anim('wd', 5 + r() * 5, r() * 10)} d="M${f(300 + r() * 1300)} ${f(660 + r() * 320)} q60 -5 120 0" stroke="#ffd9a0" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  return fxSvg('kv', css, b, rad('glow', [[0, '#ffd27a', 0.55], [1, '#ffb15c', 0]]));
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
// Zal chirog'i sekin «nafas oladi», yorug'lik ichida chang zarralari suzadi
function classicFx() {
  const r = rng(102);
  const css = RISECSS(30, -160)
    + '$.spot{animation:~sp 9s ease-in-out infinite alternate}@keyframes ~sp{from{opacity:.25}to{opacity:1}}';
  let b = `<ellipse class="spot" cx="800" cy="380" rx="520" ry="420" fill="url(#spot)"/>`;
  for (let i = 0; i < 55; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    b += `<circle ${anim('rs', 10 + r() * 12, r() * 22)} cx="${f(800 + Math.cos(a) * 480 * d)}" cy="${f(420 + Math.sin(a) * 360 * d)}" r="${f(0.8 + r() * 1.8)}" fill="#fff2c6"/>`;
  }
  return fxSvg('cl', css, b, rad('spot', [[0, '#fff2c6', 0.22], [1, '#fff2c6', 0]]));
}

// 👁 Aniq — tinch, kontrastli: katta yumshoq kvadratlar (ko'z charchamaydi)
function clear() {
  const r = rng(3);
  let body = `<rect width="${W}" height="${H}" fill="#151a1f"/>`;
  for (let y = 0; y < 6; y++) for (let x = 0; x < 9; x++) if ((x + y) % 2 === 0) body += `<rect x="${x * 190 - 40}" y="${y * 190 - 60}" width="170" height="170" rx="26" fill="#ffffff" opacity="${f(0.03 + r() * 0.04)}"/>`;
  return svg('', body);
}
// Juda sokin: bo'sh kataklarda yumshoq kvadratlar navbat bilan paydo bo'lib so'nadi (ko'zni toliqtirmaydi)
function clearFx() {
  const r = rng(103);
  const css = '$.sq{opacity:0;animation:~sq var(--d) ease-in-out infinite}@keyframes ~sq{0%,100%{opacity:0}50%{opacity:1}}';
  let b = '';
  for (let y = 0; y < 6; y++) for (let x = 0; x < 9; x++) if ((x + y) % 2 === 1 && r() < 0.45) b += `<rect ${anim('sq', 14 + r() * 12, r() * 26)} x="${x * 190 - 40}" y="${y * 190 - 60}" width="170" height="170" rx="26" fill="#fff" opacity="0.07"/>`;
  // opacity atributi animatsiya bilan almashadi — shuning uchun rang o'zi xira
  return fxSvg('cr', css, b.replace(/fill="#fff" opacity="0.07"/g, 'fill="#ffffff" fill-opacity="0.06"'));
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
// Ipak mato kabi: qiya jilo tasmalari o'tadi, romblar markazidagi oq dog'lar yaltiraydi
function atlasFx() {
  const css = SHEENCSS + '$.gl{animation:~gl var(--d) ease-in-out infinite alternate}@keyframes ~gl{from{opacity:0}to{opacity:.4}}';
  let b = sheenBand(16, 0) + sheenBand(16, 8, 180);
  const r = rng(104);
  for (let c = 0; c < 12; c++) for (let y = -100; y < H + 100; y += 160) {
    if (r() > 0.3) continue;
    const x = c * 140, off = (c % 2) * 80, w = 62 + (c % 3) * 12;
    b += `<path ${anim('gl', 3 + r() * 4, r() * 7)} d="M${x + 70} ${y + off + 30} q${f(w * 0.4)} 30 0 50 q-${f(w * 0.4)} -20 0 -50z" fill="#fff"/>`;
  }
  return fxSvg('at', css, b, SHEEN(0.16));
}

// 🏺 Rishton — kulolchilik laganlari: ko'k-yashil rozetkalar
const RISHTON_SPOTS = [[220, 240, 190], [760, 160, 140], [1300, 300, 220], [460, 720, 210], [1050, 760, 170], [1520, 880, 150], [-40, 860, 160]];
function rishtonPlate(cx, cy, R) {
  let g = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#14445e" opacity="0.55"/><circle cx="${cx}" cy="${cy}" r="${f(R * 0.92)}" fill="none" stroke="#e8d9b5" stroke-opacity="0.25" stroke-width="3"/>`;
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const x = cx + Math.cos(a) * R * 0.58, y = cy + Math.sin(a) * R * 0.58;
    g += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(R * 0.2)}" ry="${f(R * 0.08)}" transform="rotate(${f(a * 180 / Math.PI)} ${f(x)} ${f(y)})" fill="#1f9ea8" opacity="0.5"/>`;
  }
  g += `<circle cx="${cx}" cy="${cy}" r="${f(R * 0.22)}" fill="#e8d9b5" opacity="0.22"/><circle cx="${cx}" cy="${cy}" r="${f(R * 0.1)}" fill="#2a7fbf" opacity="0.5"/>`;
  return g;
}
function rishton(plates = true) {
  const r = rng(5);
  let body = `<rect width="${W}" height="${H}" fill="#0c1b26"/>`;
  if (plates) for (const [x, y, R] of RISHTON_SPOTS) body += rishtonPlate(x, y, R);
  for (let i = 0; i < 40; i++) body += `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(3 + r() * 5)}" fill="#e8d9b5" opacity="0.12"/>`;
  return svg('', body);
}
// Laganlar kulol charxidagidek sekin aylanadi (navbat bilan ikki tomonga), sirlangan yuzasi yaltiraydi
function rishtonFx() {
  const css = '$.pl{animation:~pl var(--d) linear infinite}$.pl.ccw{animation-direction:reverse}@keyframes ~pl{from{transform:rotate(0)}to{transform:rotate(360deg)}}'
    + '$.gz{animation:~gz var(--d) ease-in-out infinite alternate}@keyframes ~gz{from{opacity:0}to{opacity:.22}}';
  let b = '';
  RISHTON_SPOTS.forEach(([x, y, R], i) => {
    b += `<g class="pl${i % 2 ? ' ccw' : ''}" style="--d:${90 + i * 17}s${ORIGIN(x, y)}">${rishtonPlate(x, y, R)}</g>`;
    b += `<ellipse ${anim('gz', 5 + i, i * 2)} cx="${f(x - R * 0.35)}" cy="${f(y - R * 0.4)}" rx="${f(R * 0.32)}" ry="${f(R * 0.12)}" transform="rotate(-30 ${f(x - R * 0.35)} ${f(y - R * 0.4)})" fill="#fff"/>`;
  });
  return fxSvg('ri', css, b);
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
// Laklangan taxta: deraza yorug'i sekin o'tadi, havoda yog'och qipiqlari suzadi
function woodFx() {
  const r = rng(106);
  const css = SHEENCSS + RISECSS(120, -120);
  let b = sheenBand(24, 0, 340) + sheenBand(24, 12, 200);
  for (let i = 0; i < 30; i++) b += `<circle ${anim('rs', 12 + r() * 10, r() * 22)} cx="${f(r() * W)}" cy="${f(200 + r() * 800)}" r="${f(1 + r() * 2)}" fill="#ffcf96"/>`;
  return fxSvg('wd', css, b, SHEEN(0.1).replace(/#fff/g, '#ffd8a8'));
}

// 👑 Shohona — saroy zali (2026-11-24, «yanada jonliroq»): naqshli ravoqlar va ustunlar, qizil-oltin gilam, baxmal pardalar,
// gavharli toj, ravoqlarda osma chiroqlar. Harakatli qatlamda: chiroqlar tebranadi va lipillaydi, gavharlar yaltiraydi, oltin zarralar.
const CROWN = '<path d="M-90 40 L-70 -30 L-35 10 L0 -50 L35 10 L70 -30 L90 40z"/><rect x="-92" y="44" width="184" height="18" rx="4"/><circle cx="0" cy="-58" r="10"/><circle cx="-70" cy="-38" r="8"/><circle cx="70" cy="-38" r="8"/>';
const RY_ARCHES = [160, 480, 800, 1120, 1440]; // ravoq markazlari
const RY_ARCH_W = 250, RY_SPRING = 430, RY_APEX = 200; // kenglik, egilish boshlanishi, uchi
const ryArch = (cx, w, spring, apex) => `M${cx - w / 2} 1000 V${spring} Q${cx - w / 2} ${f(apex + (spring - apex) * 0.25)} ${cx} ${apex} Q${cx + w / 2} ${f(apex + (spring - apex) * 0.25)} ${cx + w / 2} ${spring} V1000`;
// Osma chiroq (zanjir uchi 0,0 da): zanjir, qopqoq, oltin panjarali chiroq, pastki uchi
const ryLantern = (len) => `<path d="M0 0 V${len}" stroke="#c8961e" stroke-width="2" stroke-dasharray="4 3"/><g transform="translate(0 ${len})">`
  + '<path d="M-14 0 L14 0 L8 -10 L-8 -10Z" fill="#d4a017"/><path d="M-18 2 L18 2 L22 30 L14 54 L-14 54 L-22 30Z" fill="#ffcf6a" opacity="0.85"/>'
  + '<path d="M-18 2 L18 2 L22 30 L14 54 L-14 54 L-22 30Z M-6 2 V54 M6 2 V54 M-22 30 H22" stroke="#8a5a0a" stroke-width="2.5" fill="none"/>'
  + '<path d="M-14 54 L14 54 L4 66 L-4 66Z" fill="#d4a017"/><circle cx="0" cy="72" r="4" fill="#d4a017"/></g>';
const RY_GEMS = [[0, -58, '#e8443a'], [-70, -38, '#3f8fe0'], [70, -38, '#3fbf7a'], [-40, 53, '#e8443a'], [0, 53, '#3f8fe0'], [40, 53, '#e8443a']];
function royal(lanterns = true) {
  const defs = lin('bg', [[0, '#1c1206'], [1, '#0a0603']]) + rad('archIn', [[0, '#5a3a0c', 0.75], [1, '#1c1206', 0]], 0.5, 0.45, 0.6)
    + lin('gold', [[0, '#ffe08a'], [0.5, '#e6b422'], [1, '#9a6a0c']]) + lin('velvet', [[0, '#8a1428'], [1, '#3a0610']], 1, 0)
    + lin('carpet', [[0, '#6a1616'], [1, '#3a0a0a']])
    + '<pattern id="lat" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M30 0 L60 30 L30 60 L0 30Z M30 14 L46 30 L30 46 L14 30Z" fill="none" stroke="#d4a017" stroke-opacity="0.07" stroke-width="2"/></pattern>';
  let body = `<rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" fill="url(#lat)"/>`;
  for (const cx of RY_ARCHES) {
    body += `<path d="${ryArch(cx, RY_ARCH_W, RY_SPRING, RY_APEX)}Z" fill="url(#archIn)"/>`;
    body += `<path d="${ryArch(cx, RY_ARCH_W, RY_SPRING, RY_APEX)}" fill="none" stroke="#d4a017" stroke-opacity="0.42" stroke-width="6"/>`;
    body += `<path d="${ryArch(cx, RY_ARCH_W - 34, RY_SPRING + 10, RY_APEX + 26)}" fill="none" stroke="#d4a017" stroke-opacity="0.2" stroke-width="2"/>`;
    // tepadagi «tosh» (kalit tosh) va naqsh doirachalari
    body += `<path d="M${cx} ${RY_APEX - 14} L${cx + 10} ${RY_APEX} L${cx} ${RY_APEX + 14} L${cx - 10} ${RY_APEX}Z" fill="url(#gold)"/>`;
    for (const s of [-1, 1]) {
      const x = cx + s * (RY_ARCH_W / 2 + 18);
      body += `<rect x="${x - 12}" y="${RY_SPRING - 30}" width="24" height="${1000 - RY_SPRING + 30}" fill="#d4a017" opacity="0.14"/>`;
      body += `<rect x="${x - 20}" y="${RY_SPRING - 40}" width="40" height="14" rx="3" fill="url(#gold)" opacity="0.55"/><rect x="${x - 20}" y="${930}" width="40" height="14" rx="3" fill="url(#gold)" opacity="0.4"/>`;
      for (let k = 0; k < 6; k++) body += `<path d="M${x} ${RY_SPRING + k * 80} l7 14 l-7 14 l-7 -14z" fill="#d4a017" opacity="0.2"/>`;
    }
    if (lanterns) body += `<g transform="translate(${cx} ${RY_APEX + 16})">${ryLantern(120 + (cx % 3) * 10)}</g>`;
  }
  // gilam (perspektivada) va pol
  body += `<path d="M0 900 H1600 V1000 H0z" fill="#140c04"/><path d="M420 880 L1180 880 L1420 1000 L180 1000Z" fill="url(#carpet)"/>`;
  body += `<path d="M450 892 L1150 892 L1370 994 L230 994Z" fill="none" stroke="#e6b422" stroke-opacity="0.65" stroke-width="3"/><path d="M500 906 L1100 906 L1290 986 L310 986Z" fill="none" stroke="#e6b422" stroke-opacity="0.35" stroke-width="2"/>`;
  body += `<ellipse cx="800" cy="944" rx="170" ry="26" fill="none" stroke="#e6b422" stroke-opacity="0.55" stroke-width="3"/><path d="M800 922 L840 944 L800 966 L760 944Z" fill="#e6b422" opacity="0.5"/>`;
  // baxmal pardalar burchaklarda
  for (const s of [1, -1]) {
    const x0 = s === 1 ? 0 : W, sx = s;
    body += `<path d="M${x0} 0 H${x0 + sx * 330} Q${x0 + sx * 250} 120 ${x0 + sx * 120} 210 Q${x0 + sx * 60} 260 ${x0 + sx * 40} 520 L${x0} 540Z" fill="url(#velvet)"/>`;
    for (let k = 1; k < 4; k++) body += `<path d="M${x0 + sx * k * 70} 0 Q${x0 + sx * (k * 60 - 10)} 140 ${x0 + sx * 30} ${300 + k * 40}" stroke="#2a040c" stroke-opacity="0.6" stroke-width="5" fill="none"/>`;
    body += `<path d="M${x0 + sx * 40} 300 Q${x0 + sx * 90} 290 ${x0 + sx * 110} 250" stroke="url(#gold)" stroke-width="5" fill="none"/><circle cx="${x0 + sx * 40}" cy="310" r="10" fill="url(#gold)"/><path d="M${x0 + sx * 32} 318 L${x0 + sx * 48} 318 L${x0 + sx * 44} 352 L${x0 + sx * 36} 352Z" fill="#e6b422"/>`;
    body += `<path d="M${x0} 0 H${x0 + sx * 330}" stroke="url(#gold)" stroke-width="10"/>`;
  }
  // gavharli toj
  body += `<g transform="translate(800 110)"><g fill="url(#gold)" opacity="0.85">${CROWN}</g>` + RY_GEMS.map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="${y > 40 ? 6 : 7}" fill="${c}" opacity="0.9"/>`).join('') + '</g>';
  return svg(defs, body);
}
// Harakatli qatlam: chiroqlar tebranadi (zanjir uchidan), ichidagi olov lipillaydi, toj gavharlari va uchqunlar, oltin zarralar yog'iladi
const sparkle = (x, y, s) => `<path d="M${f(x)} ${f(y - s)} Q${f(x)} ${f(y)} ${f(x + s)} ${f(y)} Q${f(x)} ${f(y)} ${f(x)} ${f(y + s)} Q${f(x)} ${f(y)} ${f(x - s)} ${f(y)} Q${f(x)} ${f(y)} ${f(x)} ${f(y - s)}z"/>`;
const SPARKCSS = '$.sp{opacity:0;transform-box:fill-box;transform-origin:center;animation:~sp var(--d) ease-in-out infinite}@keyframes ~sp{0%,100%{opacity:0;transform:scale(.2) rotate(0)}50%{opacity:1;transform:scale(1) rotate(45deg)}}';
function royalFx() {
  const r = rng(107);
  const css = SHEENCSS + SPARKCSS
    + '$.sw{animation:~sw var(--d) ease-in-out infinite alternate}@keyframes ~sw{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}'
    + '$.fl{animation:~fl var(--d) ease-in-out infinite alternate}@keyframes ~fl{0%{opacity:.45}40%{opacity:.95}70%{opacity:.6}100%{opacity:1}}'
    + '$.cr{animation:~cr 6s ease-in-out infinite alternate}@keyframes ~cr{from{opacity:0}to{opacity:.5}}'
    + '$.dust{opacity:0;animation:~du var(--d) linear infinite}@keyframes ~du{0%{opacity:0;transform:translate(0,0)}15%{opacity:1}85%{opacity:.8}100%{opacity:0;transform:translate(30px,520px)}}';
  let b = sheenBand(22, 4, 300);
  RY_ARCHES.forEach((cx, i) => {
    const y = RY_APEX + 16, len = 120 + (cx % 3) * 10;
    b += `<g ${anim('sw', 3.2 + i * 0.4, i * 0.9, ORIGIN(cx, y))}><g transform="translate(${cx} ${y})">${ryLantern(len)}`
      + `<circle ${anim('fl', 0.7 + r() * 0.6, r())} cx="0" cy="${len + 30}" r="46" fill="url(#lg)"/><ellipse ${anim('fl', 0.5 + r() * 0.4, r())} cx="0" cy="${len + 32}" rx="6" ry="11" fill="#fff4c2"/></g></g>`;
  });
  b += `<g class="cr" fill="#ffe08a"><g transform="translate(800 110)">${CROWN}</g></g><g fill="#fff6d1">`;
  b += RY_GEMS.map(([x, y]) => sparkle(800 + x + 4, 110 + y - 4, 9).replace('<path ', `<path ${anim('sp', 2.5 + r() * 2.5, r() * 5)} `)).join('');
  for (let i = 0; i < 26; i++) b += sparkle(r() * W, 300 + r() * 600, 4 + r() * 7).replace('<path ', `<path ${anim('sp', 3 + r() * 5, r() * 8)} `);
  b += '</g>';
  for (let i = 0; i < 34; i++) b += `<circle ${anim('dust', 12 + r() * 10, r() * 22)} cx="${f(r() * W)}" cy="${f(r() * 300)}" r="${f(1 + r() * 1.6)}" fill="#ffd36b"/>`;
  return fxSvg('ro', css, b, SHEEN(0.09).replace(/#fff/g, '#ffd36b') + rad('lg', [[0, '#ffd27a', 0.55], [1, '#ffb15c', 0]]) + lin('gold', [[0, '#ffe08a'], [0.5, '#e6b422'], [1, '#9a6a0c']]));
}


// 💡 Neon — synthwave: chiziqli quyosh va istiqbolli to'r
function neon(grid = true) {
  const r = rng(8);
  const defs = lin('sky', [[0, '#0d0221'], [0.6, '#2b0b4f'], [1, '#3a0d5c']]) + lin('sun', [[0, '#ffd319'], [0.5, '#ff2975'], [1, '#c912ff']]);
  let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>` + stars(r, 120, '#fff', 1.2, 500);
  body += `<g><circle cx="800" cy="520" r="220" fill="url(#sun)"/>`;
  for (let i = 0; i < 7; i++) body += `<rect x="560" y="${540 + i * 26}" width="480" height="${4 + i * 2}" fill="#2b0b4f"/>`;
  body += `</g><rect y="600" width="${W}" height="400" fill="#12022b"/>`;
  for (let i = -20; i <= 20; i++) body += `<path d="M800 600 L${800 + i * 140} 1000" stroke="#ff2bd6" stroke-opacity="0.55" stroke-width="2"/>`;
  if (grid) for (let i = 1; i < 12; i++) { const y = 600 + 400 * Math.pow(i / 11, 2); body += `<path d="M0 ${f(y)} H${W}" stroke="#00e5ff" stroke-opacity="${f(0.2 + i * 0.04)}" stroke-width="2"/>`; }
  return svg(defs, body);
}
// Synthwave yo'li: ko'ndalang to'r chiziqlari ufqdan bizga qarab oqadi, quyosh porlaydi, yulduzlar miltillaydi
function neonFx() {
  const r = rng(108);
  const css = TWCSS
    + '$.ln{opacity:0;animation:~ln 6s cubic-bezier(.55,0,1,1) infinite}@keyframes ~ln{0%{opacity:0;transform:translateY(0)}15%{opacity:.5}100%{opacity:1;transform:translateY(400px)}}'
    + '$.gw{transform-origin:800px 520px;animation:~gw 5s ease-in-out infinite alternate}@keyframes ~gw{from{opacity:.3;transform:scale(.96)}to{opacity:.9;transform:scale(1.05)}}';
  let b = `<circle class="gw" cx="800" cy="520" r="330" fill="url(#gw)"/>` + twinkles(r, 45, ['#fff', '#ff9ef0', '#9ef6ff'], 0, 480, 0.8, 1.6);
  for (let i = 0; i < 10; i++) b += `<path class="ln" style="animation-delay:-${f(i * 0.6)}s" d="M0 600 H${W}" stroke="#00e5ff" stroke-width="2.2"/>`;
  return fxSvg('ne', css, b, rad('gw', [[0, '#ff2975', 0.45], [0.6, '#c912ff', 0.12], [1, '#c912ff', 0]]));
}

// 🔷 Geometrik — past poligonli uchburchaklar
function geoTris() {
  const r = rng(9);
  const S = 120, pts = [], tris = [];
  for (let y = 0; y <= Math.ceil(H / S) + 1; y++) { pts.push([]); for (let x = 0; x <= Math.ceil(W / S) + 1; x++) pts[y].push([x * S + (r() - 0.5) * 60, y * S + (r() - 0.5) * 60]); }
  for (let y = 0; y < pts.length - 1; y++) for (let x = 0; x < pts[y].length - 1; x++) {
    const a = pts[y][x], b = pts[y][x + 1], c = pts[y + 1][x], d = pts[y + 1][x + 1];
    tris.push([a, b, c, r()], [b, d, c, r()]);
  }
  return tris;
}
const triPath = ([a, b, c]) => `M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])} L${f(c[0])} ${f(c[1])}z`;
function geo() {
  let body = `<rect width="${W}" height="${H}" fill="#08201d"/>`;
  const shade = (t) => `hsl(${f(165 + t * 25)}, 55%, ${f(10 + t * 14)}%)`;
  for (const t of geoTris()) body += `<path d="${triPath(t)}" fill="${shade(t[3])}"/>`;
  return svg('', body);
}
// Kristall yuzalar: uchburchaklar navbat bilan yorishib so'nadi, qiya yorug' tasma o'tadi
function geoFx() {
  const r = rng(109);
  const css = SHEENCSS + '$.tr{opacity:0;animation:~tr var(--d) ease-in-out infinite}@keyframes ~tr{0%,100%{opacity:0}50%{opacity:.32}}';
  let b = sheenBand(22, 6, 240);
  for (const t of geoTris()) if (r() < 0.12) b += `<path ${anim('tr', 7 + r() * 9, r() * 16)} d="${triPath(t)}" fill="hsl(${f(160 + r() * 30)}, 75%, 58%)"/>`;
  return fxSvg('ge', css, b, SHEEN(0.08).replace(/#fff/g, '#b2fff0'));
}

// 🎈 Bolajon — pufakchalar, yulduzchalar va bulutchalar
const CUTE_COLS = ['#ff8fab', '#ffd166', '#8ce99a', '#74c0fc', '#b197fc'];
const cuteStar = (x, y, s, c, op = 0.4) => `<path transform="translate(${f(x)} ${f(y)}) scale(${f(s)})" d="M0 -10 L3 -3 L10 -3 L4 2 L6 10 L0 5 L-6 10 L-4 2 L-10 -3 L-3 -3z" fill="${c}" opacity="${op}"/>`;
const cuteCloud = (x, y, s, op = 0.1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity="${op}"><circle cx="0" cy="0" r="40"/><circle cx="45" cy="-15" r="50"/><circle cx="95" cy="0" r="38"/><rect x="0" y="0" width="95" height="38"/></g>`;
function cute(clouds = true) {
  const r = rng(10);
  let body = `<rect width="${W}" height="${H}" fill="#241a3a"/>`;
  for (let i = 0; i < 26; i++) { const c = CUTE_COLS[i % 5]; body += `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(18 + r() * 60)}" fill="${c}" opacity="0.16"/>`; }
  for (let i = 0; i < 30; i++) body += cuteStar(r() * W, r() * H, 0.8 + r() * 2, CUTE_COLS[i % 5]);
  if (clouds) body += cuteCloud(160, 160, 1.4) + cuteCloud(1180, 220, 1.1) + cuteCloud(640, 820, 1.6);
  return svg('', body);
}
// Bulutchalar suzadi, pufakchalar pastdan ko'tariladi, yulduzchalar aylanib miltillaydi
function cuteFx() {
  const r = rng(110);
  const css = '$.cd{animation:~cd var(--d) linear infinite}@keyframes ~cd{from{transform:translateX(-400px)}to{transform:translateX(2000px)}}'
    + '$.bb{animation:~bb var(--d) linear infinite}@keyframes ~bb{0%{transform:translate(0,0);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translate(40px,-1250px);opacity:0}}'
    + '$.st{transform-box:fill-box;transform-origin:center;animation:~st var(--d) ease-in-out infinite alternate}@keyframes ~st{from{opacity:.15;transform:scale(.7) rotate(-20deg)}to{opacity:1;transform:scale(1.15) rotate(20deg)}}';
  let b = '';
  [[160, 1.4, 90, 10], [220, 1.1, 120, 70], [820, 1.6, 140, 40], [480, 0.9, 110, 95]].forEach(([y, s, d, del]) => { b += `<g ${anim('cd', d, del)}>${cuteCloud(0, y, s, 0.13)}</g>`; });
  for (let i = 0; i < 14; i++) b += `<circle ${anim('bb', 26 + r() * 22, r() * 48)} cx="${f(r() * W)}" cy="${f(H + 80)}" r="${f(10 + r() * 26)}" fill="${CUTE_COLS[i % 5]}" fill-opacity="0.22" stroke="#fff" stroke-opacity="0.25" stroke-width="2"/>`;
  for (let i = 0; i < 16; i++) b += `<g ${anim('st', 2.5 + r() * 3, r() * 5)}>${cuteStar(r() * W, r() * H, 0.9 + r() * 1.5, CUTE_COLS[i % 5], 0.7)}</g>`;
  return fxSvg('cu', css, b);
}

// 👾 Piksel — piksel manzara: tog'lar, bulutlar, quyosh
const PX = 40;
const pxRect = (x, y, c, o = 1) => `<rect x="${x * PX}" y="${y * PX}" width="${PX}" height="${PX}" fill="${c}" opacity="${o}"/>`;
const PX_CLOUD = [[0, 1], [1, 0], [2, 0], [3, 1], [1, 1], [2, 1], [4, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2]];
function pixel(clouds = true) {
  let body = `<rect width="${W}" height="${H}" fill="#14213d"/>`;
  // quyosh
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 10) body += pxRect(30 + x, 5 + y, '#ffb703', 0.6);
  // bulutlar
  if (clouds) for (const [ox, oy] of [[4, 3], [17, 6], [33, 12]]) for (const [x, y] of PX_CLOUD) body += pxRect(ox + x, oy + y, '#e0e1dd', 0.25);
  // tog'lar
  const heights = [8, 9, 11, 13, 12, 10, 9, 10, 12, 14, 15, 13, 11, 10, 9, 8, 9, 11, 12, 11, 9, 8, 10, 12, 13, 14, 12, 10, 9, 8, 7, 8, 9, 11, 12, 10, 9, 8, 8, 9, 10];
  heights.forEach((h, x) => { for (let y = 25 - h; y < 25; y++) body += pxRect(x, y, y === 25 - h ? '#8ecae6' : (y < 25 - h + 2 ? '#457b9d' : '#1d3557'), 0.75); });
  for (let x = 0; x < 41; x++) body += pxRect(x, 24, '#2a9d8f', 0.8);
  return svg('', body);
}
// 8-bit uslubida: bulutlar katakma-katak (steps) suriladi, piksel yulduzlar yonib-o'chadi, quyosh nurlari pirpiraydi
function pixelFx() {
  const r = rng(111);
  const css = `$.pc{animation:~pc var(--d) steps(48) infinite}@keyframes ~pc{from{transform:translateX(0)}to{transform:translateX(${48 * PX}px)}}`
    + '$.ps{animation:~ps var(--d) steps(1) infinite}@keyframes ~ps{0%,100%{opacity:0}50%{opacity:1}}'
    + '$.ray{animation:~ray 2.4s steps(1) infinite}@keyframes ~ray{0%,100%{opacity:.25}50%{opacity:.7}}';
  let b = '';
  [[3, 70, 10], [6, 95, 60], [12, 80, 35], [9, 110, 85]].forEach(([oy, d, del]) => {
    b += `<g ${anim('pc', d, del)}>${PX_CLOUD.map(([x, y]) => pxRect(x - 6, oy + y, '#e0e1dd', 0.3)).join('')}</g>`;
  });
  for (let i = 0; i < 22; i++) { const x = Math.floor(r() * 40) * PX + 16, y = Math.floor(r() * 9) * PX + 16; b += `<rect ${anim('ps', 1.6 + r() * 3, r() * 4)} x="${x}" y="${y}" width="8" height="8" fill="${r() < 0.7 ? '#fff' : '#ffb703'}"/>`; }
  b += '<g class="ray" fill="#ffb703">' + [[30, 0.6], [34.6, 5], [30, 9.4], [25.4, 5], [33.2, 1.8], [33.2, 8.2], [26.8, 8.2], [26.8, 1.8]].map(([x, y]) => `<rect x="${f(x * PX + 12)}" y="${f(y * PX - 4)}" width="16" height="16"/>`).join('') + '</g>';
  return fxSvg('px', css, b);
}

// 🪙 Tanga — Ipak yo'li tangalari: sochilgan oltin va kumush tangalar
function tangaCoins() {
  const r = rng(12), out = [];
  for (let i = 0; i < 34; i++) {
    const x = r() * W, y = r() * H, R = 30 + r() * 55, g = r() < 0.7 ? 'gold' : 'silver', op = 0.25 + r() * 0.3;
    out.push({ i, x, y, R, g, op });
  }
  return out;
}
function tanga() {
  let body = `<rect width="${W}" height="${H}" fill="#1a1208"/>`;
  const defs = rad('gold', [[0, '#ffe08a'], [1, '#b8860b']], 0.35, 0.35, 0.8) + rad('silver', [[0, '#f1f3f5'], [1, '#868e96']], 0.35, 0.35, 0.8);
  for (const { i, x, y, R, g, op } of tangaCoins()) {
    body += `<g opacity="${f(op)}"><circle cx="${f(x)}" cy="${f(y)}" r="${f(R)}" fill="url(#${g})"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(R * 0.8)}" fill="none" stroke="#5c4410" stroke-width="3"/>`;
    if (i % 3 === 0) body += `<rect x="${f(x - R * 0.18)}" y="${f(y - R * 0.18)}" width="${f(R * 0.36)}" height="${f(R * 0.36)}" fill="#1a1208" opacity="0.7"/>`;
    else if (i % 3 === 1) body += `<path d="M${f(x)} ${f(y - R * 0.4)} L${f(x + R * 0.12)} ${f(y - R * 0.12)} L${f(x + R * 0.4)} ${f(y)} L${f(x + R * 0.12)} ${f(y + R * 0.12)} L${f(x)} ${f(y + R * 0.4)} L${f(x - R * 0.12)} ${f(y + R * 0.12)} L${f(x - R * 0.4)} ${f(y)} L${f(x - R * 0.12)} ${f(y - R * 0.12)}z" fill="#5c4410" opacity="0.7"/>`;
    else body += `<path d="M${f(x + R * 0.2)} ${f(y - R * 0.35)} a${f(R * 0.4)} ${f(R * 0.4)} 0 1 0 0 ${f(R * 0.7)} a${f(R * 0.3)} ${f(R * 0.3)} 0 1 1 0 ${f(-R * 0.7)}z" fill="#5c4410" opacity="0.7"/>`;
    body += '</g>';
  }
  return svg(defs, body);
}
// Tangalar chetida yaltiroq uchqunlar yonadi, ustidan oltin kukun ko'tariladi
function tangaFx() {
  const r = rng(112);
  const css = SPARKCSS + RISECSS(-40, -220);
  let b = '<g fill="#fff6d1">';
  for (const c of tangaCoins()) if (r() < 0.55) b += sparkle(c.x - c.R * 0.45, c.y - c.R * 0.45, 7 + c.R * 0.18).replace('<path ', `<path ${anim('sp', 3 + r() * 5, r() * 8)} `);
  b += '</g>';
  for (let i = 0; i < 36; i++) b += `<circle ${anim('rs', 9 + r() * 9, r() * 18)} cx="${f(r() * W)}" cy="${f(300 + r() * 700)}" r="${f(1 + r() * 1.8)}" fill="#ffd76a"/>`;
  return fxSvg('tg', css, b);
}

// 🕌 Samarqand — Registon tunda (2026-11-24, «yanada jonliroq»): Somon yo'li, yarim oy, uzoq tog'lar, uch madrasa — koshinli
// peshtoqlar, qovurg'ali firuza gumbazlar, yo'l-yo'l minoralar, derazalar, maydon. Harakatli qatlamda: derazalarda chiroq,
// oy oldidan bulutlar, qushlar, yulduzlar, gumbazlarda oy nuri, uchar yulduz.
const SM_GROUND = 900;
// Binolar: cx, blok kengligi va balandligi, peshtoq kengligi va balandligi, minoralar
const SM_BUILD = [
  { cx: 330, bw: 380, bh: 210, pw: 190, ph: 330, min: true },
  { cx: 800, bw: 460, bh: 220, pw: 220, ph: 345, min: false },
  { cx: 1270, bw: 380, bh: 210, pw: 190, ph: 330, min: true },
];
// Qovurg'ali gumbazlar: cx, asos y, radius
const SM_DOMES = [[640, 680, 74], [1150, 690, 52], [1390, 690, 52]];
// Derazalar (ravoqli) — har blokning ikki qanotida ikki qator
function smWindows() {
  const out = [];
  for (const b of SM_BUILD) {
    const top = SM_GROUND - b.bh;
    for (const side of [-1, 1]) {
      const x0 = b.cx + side * (b.pw / 2 + 16), x1 = b.cx + side * (b.bw / 2 - 18);
      const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
      for (const row of [40, 115]) for (let x = lo; x + 18 <= hi; x += 34) out.push([x, top + row]);
    }
  }
  return out;
}
const smArch = (x, y, w, h) => `M${f(x)} ${f(y + h)} V${f(y + w * 0.6)} Q${f(x)} ${f(y)} ${f(x + w / 2)} ${f(y - w * 0.15)} Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + w * 0.6)} V${f(y + h)}Z`;
function smDome(cx, base, rr) {
  let g = `<rect x="${cx - rr * 0.8}" y="${base - 16}" width="${rr * 1.6}" height="22" fill="url(#tile)"/><rect x="${cx - rr * 0.8}" y="${base - 16}" width="${rr * 1.6}" height="22" fill="#05101a" opacity="0.4"/>`;
  g += `<path d="M${cx - rr} ${base - 14} C${cx - rr} ${base - 14 - rr * 1.1} ${cx - rr * 0.25} ${base - 14 - rr * 1.25} ${cx} ${base - 14 - rr * 1.35} C${cx + rr * 0.25} ${base - 14 - rr * 1.25} ${cx + rr} ${base - 14 - rr * 1.1} ${cx + rr} ${base - 14}Z" fill="url(#dome)"/>`;
  for (let k = -3; k <= 3; k++) if (k) g += `<path d="M${f(cx + k * rr / 3.4)} ${base - 14} Q${f(cx + k * rr / 4.2)} ${f(base - 14 - rr)} ${cx} ${f(base - 14 - rr * 1.35)}" stroke="#0e4f5a" stroke-opacity="0.6" stroke-width="2" fill="none"/>`;
  g += `<path d="M${cx} ${f(base - 14 - rr * 1.35)} v-22" stroke="#e8d9a8" stroke-width="3"/><path d="M${cx + 6} ${f(base - 14 - rr * 1.35 - 30)} a7 7 0 1 1 -2 -12 a5 5 0 1 0 2 12z" fill="#e8d9a8"/>`;
  return g;
}
function samarqand(dynamic = true) {
  const r = rng(13);
  const sil = '#08151f';
  const defs = lin('sky', [[0, '#040a19'], [0.55, '#0c2445'], [0.82, '#1b4f70'], [1, '#2b7488']])
    + lin('dome', [[0, '#5fd6dc'], [1, '#13707a']]) + rad('mw', [[0, '#9fc3ff', 0.18], [1, '#9fc3ff', 0]]) + rad('moonG', [[0, '#ffe8a3', 0.28], [1, '#ffe8a3', 0]])
    + lin('niche', [[0, '#051019'], [1, '#0c2433']])
    + '<pattern id="tile" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#123b52"/><path d="M8 1 L15 8 L8 15 L1 8z" fill="#2a8fa8"/><circle cx="8" cy="8" r="2" fill="#e8d9a8"/></pattern>'
    + '<pattern id="mstr" width="20" height="26" patternUnits="userSpaceOnUse"><rect width="20" height="26" fill="#0f2e40"/><rect width="20" height="5" fill="#2a8fa8"/><path d="M0 16 L5 10 L10 16 L15 10 L20 16" stroke="#3fc1c9" stroke-width="2" fill="none"/></pattern>';
  let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  // Somon yo'li
  body += `<ellipse cx="700" cy="250" rx="760" ry="120" fill="url(#mw)" transform="rotate(-14 700 250)"/>`;
  for (let i = 0; i < 260; i++) { const t = r(), x = t * W, y = 250 - (x - 700) * 0.25 + (r() - 0.5) * 180; body += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.4 + r() * 0.9)}" fill="#fff" opacity="${f(0.2 + r() * 0.5)}"/>`; }
  body += stars(r, 140, '#fff', 1.4, 600);
  // oy
  body += `<circle cx="1335" cy="190" r="150" fill="url(#moonG)"/><path d="M1320 130 a70 70 0 1 0 58 110 a54 54 0 1 1 -58 -110z" fill="#ffe8a3" opacity="0.92"/>`;
  if (dynamic) body += smCloud(1290, 215, 1, 0.5) + smCloud(420, 300, 1.3, 0.3);
  // uzoq tog'lar
  let m = `M0 ${SM_GROUND - 60}`; let x = 0;
  while (x < W) { x += 80 + r() * 120; m += ` L${f(x)} ${f(SM_GROUND - 150 - r() * 90)}`; x += 60 + r() * 90; m += ` L${f(x)} ${f(SM_GROUND - 70 - r() * 40)}`; }
  body += `<path d="${m} L${W} ${SM_GROUND - 60} V${SM_GROUND} H0z" fill="#0d2a3d" opacity="0.85"/>`;
  // gumbazlar (binolar ortida)
  for (const [cx, base, rr] of SM_DOMES) body += smDome(cx, base, rr);
  for (const b of SM_BUILD) {
    const top = SM_GROUND - b.bh, ptop = SM_GROUND - b.ph;
    // blok + koshin chizig'i
    body += `<rect x="${b.cx - b.bw / 2}" y="${top}" width="${b.bw}" height="${b.bh}" fill="${sil}"/><rect x="${b.cx - b.bw / 2}" y="${top}" width="${b.bw}" height="14" fill="url(#tile)" opacity="0.7"/>`;
    // peshtoq: koshinli ramka, ichida ravoqli tokcha
    body += `<rect x="${b.cx - b.pw / 2}" y="${ptop}" width="${b.pw}" height="${b.ph}" fill="url(#tile)"/><rect x="${b.cx - b.pw / 2}" y="${ptop}" width="${b.pw}" height="${b.ph}" fill="#05101a" opacity="0.45"/>`;
    const nw = b.pw * 0.62, nx = b.cx - nw / 2, ny = ptop + 34;
    body += `<path d="${smArch(nx - 8, ny - 6, nw + 16, SM_GROUND - ny + 6)}" fill="#0a2230"/><path d="${smArch(nx, ny, nw, SM_GROUND - ny)}" fill="url(#niche)"/>`;
    body += `<path d="${smArch(nx + nw * 0.22, ny + nw * 0.55, nw * 0.56, SM_GROUND - ny - nw * 0.55)}" fill="none" stroke="#3fc1c9" stroke-opacity="0.45" stroke-width="2"/>`;
    for (let k = 0; k < 5; k++) body += `<path d="M${f(nx + 8 + k * (nw - 16) / 4 - 8)} ${f(ny + nw * 0.42)} q8 -14 16 0" stroke="#3fc1c9" stroke-opacity="0.3" stroke-width="1.5" fill="none"/>`;
    body += `<path d="M${b.cx - b.pw / 2} ${ptop} H${b.cx + b.pw / 2}" stroke="#3fc1c9" stroke-opacity="0.55" stroke-width="4"/>`;
    if (b.min) for (const s of [-1, 1]) {
      const mx = b.cx + s * (b.bw / 2 + 4), mt = SM_GROUND - b.ph * 1.15;
      body += `<rect x="${mx - 14}" y="${mt}" width="28" height="${SM_GROUND - mt}" fill="url(#mstr)"/><rect x="${mx - 14}" y="${mt}" width="28" height="${SM_GROUND - mt}" fill="#05101a" opacity="0.35"/>`;
      body += `<path d="M${mx - 20} ${mt} h40 l-6 -14 h-28z" fill="#1a4a5e"/><path d="M${mx - 12} ${mt - 14} q12 -26 24 0z" fill="url(#dome)"/>`;
    } else for (const s of [-1, 1]) {
      const mx = b.cx + s * (b.bw / 2 - 10);
      body += `<rect x="${mx - 10}" y="${top - 40}" width="20" height="${b.bh + 40}" fill="url(#mstr)" opacity="0.8"/><path d="M${mx - 10} ${top - 40} q10 -22 20 0z" fill="url(#dome)"/>`;
    }
  }
  for (const [wx, wy] of smWindows()) body += `<path d="${smArch(wx, wy, 18, 30)}" fill="#04101a" stroke="#3fc1c9" stroke-opacity="0.35" stroke-width="1.2"/>`;
  // maydon: tosh yo'lak chiziqlari va daraxtlar
  body += `<rect y="${SM_GROUND}" width="${W}" height="${H - SM_GROUND}" fill="#0b1b26"/>`;
  for (let i = -8; i <= 8; i++) body += `<path d="M${800 + i * 60} ${SM_GROUND} L${800 + i * 180} ${H}" stroke="#1d3a4a" stroke-opacity="0.6" stroke-width="1.5"/>`;
  for (const y of [925, 955, 990]) body += `<path d="M0 ${y} H${W}" stroke="#1d3a4a" stroke-opacity="0.5" stroke-width="1.5"/>`;
  for (const [tx, ts] of [[40, 1.1], [95, 0.8], [1520, 1], [1575, 0.75]]) body += `<g transform="translate(${tx} ${SM_GROUND}) scale(${ts})" fill="#061018"><rect x="-4" y="-40" width="8" height="40"/><ellipse cx="0" cy="-70" rx="34" ry="44"/><ellipse cx="-16" cy="-52" rx="22" ry="24"/><ellipse cx="18" cy="-56" rx="22" ry="26"/></g>`;
  return svg(defs, body);
}
function smCloud(cx, cy, s, op) {
  return `<g transform="translate(${cx} ${cy}) scale(${s})" fill="#9fb8cc" opacity="${op}"><ellipse cx="0" cy="0" rx="110" ry="13"/><ellipse cx="36" cy="-9" rx="64" ry="11"/><ellipse cx="-56" cy="5" rx="70" ry="8"/></g>`;
}
function samarqandFx() {
  const r = rng(113);
  const css = TWCSS
    + '$.moon{transform-origin:1335px 190px;animation:~mo 7s ease-in-out infinite alternate}@keyframes ~mo{from{opacity:.4;transform:scale(.95)}to{opacity:1;transform:scale(1.06)}}'
    + '$.dm{animation:~dm var(--d) ease-in-out infinite alternate}@keyframes ~dm{from{opacity:0}to{opacity:.6}}'
    + '$.wl{opacity:0;animation:~wl var(--d) ease-in-out infinite}@keyframes ~wl{0%,100%{opacity:0}20%,70%{opacity:.95}45%{opacity:.7}}'
    + '$.cl{animation:~cl var(--d) linear infinite}@keyframes ~cl{from{transform:translateX(-600px)}to{transform:translateX(2200px)}}'
    + '$.bd{animation:~bd var(--d) linear infinite}@keyframes ~bd{0%{transform:translate(1800px,60px)}100%{transform:translate(-300px,-40px)}}'
    + '$.wg{transform-box:fill-box;transform-origin:center;animation:~wg .45s ease-in-out infinite alternate}@keyframes ~wg{from{transform:scaleY(1)}to{transform:scaleY(-.6)}}'
    + '$.met{opacity:0;animation:~met var(--d) linear infinite}@keyframes ~met{0%{opacity:0;transform:translate(0,0)}3%{opacity:1}12%{opacity:0;transform:translate(-520px,300px)}100%{opacity:0;transform:translate(-520px,300px)}}';
  let b = `<circle class="moon" cx="1335" cy="190" r="200" fill="url(#mg)"/>` + twinkles(r, 80, ['#fff', '#fff', '#ffe8a3'], 0, 560, 0.8, 1.7);
  // bulutlar oy oldidan o'tadi
  [[215, 1, 0.5, 120, 30], [300, 1.3, 0.32, 160, 100], [140, 0.8, 0.4, 140, 70]].forEach(([y, s, op, d, del]) => { b += `<g ${anim('cl', d, del)}>${smCloud(0, y, s, op)}</g>`; });
  // gumbazlarda oy nuri
  for (const [cx, base, rr] of SM_DOMES) b += `<path ${anim('dm', 5 + r() * 4, r() * 6)} d="M${f(cx + rr * 0.2)} ${f(base - 20)} Q${f(cx + rr * 0.55)} ${f(base - 14 - rr * 0.8)} ${f(cx + rr * 0.12)} ${f(base - 14 - rr * 1.25)}" stroke="#d4fbff" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  // derazalarda chiroq (har uchinchisi)
  smWindows().forEach(([wx, wy], i) => { if (i % 3 === 0 || r() < 0.15) b += `<path ${anim('wl', 6 + r() * 10, r() * 16)} d="${smArch(wx + 3, wy + 4, 12, 24)}" fill="#ffc861"/>`; });
  // peshtoq tokchalarida yumshoq yorug'
  for (const bld of SM_BUILD) b += `<ellipse ${anim('dm', 8 + r() * 4, r() * 6)} cx="${bld.cx}" cy="${SM_GROUND - 40}" rx="${bld.pw * 0.28}" ry="60" fill="url(#lamp)"/>`;
  // qushlar
  const bird = (x, y) => `<g transform="translate(${x} ${y})"><path class="wg" d="M0 0 q5 -4 10 0 q5 -4 10 0" stroke="#02070d" stroke-width="2" fill="none" stroke-linecap="round"/></g>`;
  b += `<g ${anim('bd', 52, 15)}>` + [[0, 0], [22, -10], [-20, -12], [44, -18]].map(([x, y]) => bird(x, 420 + y)).join('') + '</g>';
  b += `<g ${anim('bd', 70, 50)}>` + [[0, 0], [18, -9], [-18, -8]].map(([x, y]) => bird(x, 340 + y)).join('') + '</g>';
  const met = (x, y, d, delay) => `<g class="met" style="--d:${d}s;animation-delay:${delay}s"><path d="M${x} ${y} l130 -75" stroke="url(#mt)" stroke-width="2.4" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="2.4" fill="#fff"/></g>`;
  b += met(1150, 90, 17, 4) + met(700, 60, 23, 13);
  const defs = rad('mg', [[0, '#ffe8a3', 0.32], [1, '#ffe8a3', 0]]) + rad('lamp', [[0, '#ffd27a', 0.4], [1, '#ffd27a', 0]], 0.5, 0.85, 0.7)
    + '<linearGradient id="mt" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#9fe7ff" stop-opacity="0"/></linearGradient>';
  return fxSvg('sm', css, b, defs);
}

// 🕊 Origami — buklangan qog'oz turnalar va uchburchaklar
const ORI_COLS = ['#e03131', '#f8f0e3', '#f08c00', '#c2255c'];
const craneSvg = (x, y, s, c, op = 0.38) => `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})" opacity="${op}"><path d="M0 0 L60 -40 L40 10z" fill="${c}"/><path d="M0 0 L40 10 L-10 30z" fill="#fff" opacity="0.5"/><path d="M40 10 L110 -10 L70 30z" fill="${c}"/><path d="M-10 30 L-50 -5 L-30 35z" fill="${c}" opacity="0.8"/><path d="M60 -40 L80 -70 L70 -20z" fill="#fff" opacity="0.6"/></g>`;
function origamiCranes() {
  const r = rng(14), cranes = [];
  for (let i = 0; i < 14; i++) cranes.push([r() * W, r() * H, 0.8 + r() * 1.4, ORI_COLS[i % 4]]);
  return { r, cranes };
}
function origami(cranes = true) {
  const o = origamiCranes(), r = o.r;
  let body = `<rect width="${W}" height="${H}" fill="#1c0f12"/>`;
  if (cranes) for (const c of o.cranes) body += craneSvg(...c);
  for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H, s = 10 + r() * 30; body += `<path d="M${f(x)} ${f(y)} l${f(s)} ${f(s * 0.6)} l${f(-s * 0.4)} ${f(s)}z" fill="${ORI_COLS[i % 4]}" opacity="0.14"/>`; }
  return svg('', body);
}
// Qog'oz turnalar chapdan o'ngga uchib o'tadi (to'lqinsimon, biroz qiyshayib), qog'oz parchalari aylanib tushadi
function origamiFx() {
  const r = rng(114);
  const css = '$.fly{animation:~fly var(--d) linear infinite}@keyframes ~fly{from{transform:translateX(-300px)}to{transform:translateX(1950px)}}'
    + '$.wv{transform-box:fill-box;transform-origin:center;animation:~wv var(--d) ease-in-out infinite alternate}@keyframes ~wv{from{transform:translateY(-16px) rotate(-5deg)}to{transform:translateY(16px) rotate(5deg)}}'
    + '$.fl{animation:~fl var(--d) linear infinite}@keyframes ~fl{0%{opacity:0;transform:translate(0,0) rotate(0)}10%{opacity:1}90%{opacity:1}100%{opacity:0;transform:translate(-120px,1150px) rotate(540deg)}}';
  let b = '';
  origamiCranes().cranes.forEach(([, y, s, c], i) => {
    const d = 55 + r() * 45;
    b += `<g ${anim('fly', d, r() * d)}><g ${anim('wv', 3 + r() * 3, r() * 4)}>${craneSvg(0, y, s, c, 0.5)}</g></g>`;
  });
  for (let i = 0; i < 16; i++) { const x = r() * W, s = 10 + r() * 22; b += `<g ${anim('fl', 18 + r() * 16, r() * 34)}><path style="transform-box:fill-box;transform-origin:center" d="M${f(x)} -60 l${f(s)} ${f(s * 0.6)} l${f(-s * 0.4)} ${f(s)}z" fill="${ORI_COLS[i % 4]}" opacity="0.3"/></g>`; }
  return fxSvg('or', css, b);
}

const BACKGROUNDS = { karvon, classic, clear, atlas, rishton, wood, royal, neon, geo, cute, pixel, tanga, samarqand, origami, kosmos };
// Harakatli fon fayllari (bgfx.js): <id>-fx — harakatli qatlam (har to'plamda); <id>-base — harakatlanuvchi narsalarsiz asos
const BASES = { karvon: () => karvon(false), royal: () => royal(false), samarqand: () => samarqand(false), rishton: () => rishton(false), neon: () => neon(false), cute: () => cute(false), pixel: () => pixel(false), origami: () => origami(false), kosmos: kosmosBase };
const FXS = { karvon: karvonFx, classic: classicFx, clear: clearFx, atlas: atlasFx, rishton: rishtonFx, wood: woodFx, royal: royalFx, neon: neonFx, geo: geoFx, cute: cuteFx, pixel: pixelFx, tanga: tangaFx, samarqand: samarqandFx, origami: origamiFx, kosmos: kosmosFx };
const EXTRAS = {};
for (const id of Object.keys(BACKGROUNDS)) { if (BASES[id]) EXTRAS[id + '-base'] = BASES[id]; EXTRAS[id + '-fx'] = FXS[id]; }
module.exports = { BACKGROUNDS, EXTRAS, BASES };

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
