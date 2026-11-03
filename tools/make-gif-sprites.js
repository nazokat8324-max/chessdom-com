// Kun o'yini GIF'i uchun dona rasmlari (server brauzersiz chizadi — daygif.js): Karvon to'plamining 12 ta SVG donasi
// Chrome'da 56×56 RGBA ga aylantirilib assets/gif-pieces-56.rgba.gz ga yoziladi (tartib: wK wQ wR wB wN wP bK … bP).
// Donalar o'zgarsa qayta ishga tushiring: node tools/make-gif-sprites.js   (puppeteer-core + Chrome kerak, CHROME_PATH)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const puppeteer = require('puppeteer-core');

const ROOT = path.join(__dirname, '..');
const SIZE = 56;
const ORDER = ['w', 'b'].flatMap((c) => ['K', 'Q', 'R', 'B', 'N', 'P'].map((p) => c + p));
const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome']
  .find((p) => p && fs.existsSync(p));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  const out = Buffer.alloc(ORDER.length * SIZE * SIZE * 4);
  for (let i = 0; i < ORDER.length; i++) {
    const svg = fs.readFileSync(path.join(ROOT, 'img', 'chesspieces', 'karvon', ORDER[i] + '.svg'), 'utf8');
    const data = await page.evaluate(async (svg, size) => {
      const img = new Image();
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
      await img.decode();
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      return Array.from(ctx.getImageData(0, 0, size, size).data);
    }, svg, SIZE);
    Buffer.from(data).copy(out, i * SIZE * SIZE * 4);
  }
  await browser.close();
  const file = path.join(ROOT, 'assets', 'gif-pieces-' + SIZE + '.rgba.gz');
  fs.writeFileSync(file, zlib.gzipSync(out, { level: 9 }));
  console.log('yozildi:', path.relative(ROOT, file), fs.statSync(file).size, 'bayt');
})();
