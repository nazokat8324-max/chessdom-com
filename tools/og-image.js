#!/usr/bin/env node
// Havola oldindan ko'rinishi rasmi (OpenGraph, 1200×630) → assets/og-image.png
//   node tools/og-image.js   (Chrome kerak; CHROME_PATH bilan yo'lni berish mumkin)
// Matn yoki imkoniyatlar ro'yxati o'zgarsa — shu yerda tahrirlab, qayta ishga tushiring.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => p && fs.existsSync(p));

const TITLE = 'Play chess online — rated games, Teahouse lobby, country clubs';
const CHIPS = ['⚡ Blitz · Rapid · Bullet', '🎲 Chess960', '🍵 Teahouse', '🚩 Battle of Flags', '🏆 Leagues', '🔍 Analysis'];
// Italyan o'yini: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5
const FEN = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R';

function boardHtml() {
  const rows = FEN.split('/');
  let cells = '';
  rows.forEach((row, r) => {
    let c = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { for (let i = 0; i < Number(ch); i++, c++) cells += `<div class="sq ${(r + c) % 2 ? 'd' : 'l'}"></div>`; continue; }
      const code = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
      const src = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'img/chesspieces/karvon', code + '.svg')).toString('base64');
      cells += `<div class="sq ${(r + c) % 2 ? 'd' : 'l'}"><img src="${src}"></div>`;
      c++;
    }
  });
  return cells;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; overflow: hidden; font-family: 'Segoe UI', Inter, Arial, sans-serif;
    background: radial-gradient(circle at 18% 12%, #0d4a50 0%, transparent 55%), radial-gradient(circle at 95% 100%, #2a2a14 0%, transparent 45%), #0a1214; color: #fff; }
  .left { position: absolute; left: 80px; top: 0; bottom: 0; width: 600px; display: flex; flex-direction: column; justify-content: center; }
  .logo { display: flex; align-items: center; gap: 18px; font-size: 60px; font-weight: 800; letter-spacing: -1px; margin-bottom: 34px; }
  .logo span { color: #01ccd5; }
  h1 { font-size: 40px; line-height: 1.22; font-weight: 800; margin-bottom: 26px; }
  .chips { display: flex; flex-wrap: wrap; gap: 12px; }
  .chip { padding: 10px 20px; border-radius: 999px; font-size: 19px; font-weight: 600; background: rgba(1, 204, 213, 0.1); border: 1.5px solid rgba(1, 204, 213, 0.35); }
  .board { position: absolute; right: 70px; top: 85px; width: 440px; height: 440px; display: grid; grid-template-columns: repeat(8, 1fr);
    border-radius: 14px; overflow: hidden; transform: rotate(-4deg); box-shadow: 0 30px 70px rgba(0, 0, 0, 0.55); }
  .sq { display: flex; align-items: center; justify-content: center; }
  .sq.l { background: #e3f1f1; } .sq.d { background: #4e9ea3; }
  .sq img { width: 86%; height: 86%; }
</style></head><body>
  <div class="left">
    <div class="logo">👑 <b>Chess<span>Caravan</span></b></div>
    <h1>${TITLE}</h1>
    <div class="chips">${CHIPS.map((c) => `<div class="chip">${c}</div>`).join('')}</div>
  </div>
  <div class="board">${boardHtml()}</div>
</body></html>`;

(async () => {
  if (!CHROME) { console.error('Chrome topilmadi (CHROME_PATH)'); process.exit(1); }
  const browser = await require('puppeteer-core').launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  await page.setContent(html, { waitUntil: 'load' });
  const out = path.join(ROOT, 'assets/og-image.png');
  await page.screenshot({ path: out });
  await browser.close();
  console.log('✅ ' + out);
})();
