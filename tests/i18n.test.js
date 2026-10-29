// Tarjimalar: kodda ishlatilgan har bir kalit (tx('…'), data-i18n, i18next.t, yutuq/vazifa kalitlari) barcha tillarda bor.
// Busiz unutilgan kalit inglizcha/ruscha foydalanuvchiga o'zbekcha zaxira matni bo'lib chiqardi (masalan "G / D / M").
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SERVER_ONLY = /^(lang-|languages|library-|legal-content|server|database|league|teamchess|telegram|push-texts|backup|mailer|fairplay|continents|sw\.js)/;
// Kalit emas: dinamik prefikslar (pastda alohida tekshiriladi) va izohdagi namuna
const NOT_KEYS = new Set(['q_', 'achT', 'achD', 'kalit']);

function loadTranslations() {
  const ctx = { console, document: { addEventListener() {}, querySelectorAll: () => [], getElementById: () => null, readyState: 'complete' },
    localStorage: { getItem: () => null, setItem() {} }, navigator: { language: 'en' } };
  ctx.window = ctx;
  ctx.i18next = { init() {}, use() { return ctx.i18next; }, t: (k) => k, on() {}, changeLanguage() {}, addResourceBundle() {} };
  vm.createContext(ctx);
  for (const f of ['uzcyrl.js', 'lang-tr.js', 'lang-kk.js', 'lang-tg.js', 'lang-ky.js', 'lang-tk.js', 'lang-az.js', 'languages.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8') + (f === 'languages.js' ? '\n;this.__tr = translations;' : ''), ctx, { filename: f });
  }
  return ctx.__tr;
}

test('Tarjimalar: kodda ishlatilgan barcha kalitlar har bir tilda bor', () => {
  const tr = loadTranslations();
  const used = new Map();
  for (const f of fs.readdirSync(ROOT).filter((x) => /\.(js|html)$/.test(x) && !SERVER_ONLY.test(x))) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const re = /\btx\(\s*['"]([A-Za-z0-9_]+)['"]|data-i18n(?:-placeholder|-title)?="([A-Za-z0-9_]+)"|i18next\.t\(\s*['"]([A-Za-z0-9_]+)['"]/g;
    let m;
    while ((m = re.exec(s))) { const k = m[1] || m[2] || m[3]; if (!NOT_KEYS.has(k) && !used.has(k)) used.set(k, f); }
  }
  assert.ok(used.size > 500, 'kalitlar topildi: ' + used.size);
  for (const [lang, dict] of Object.entries(tr)) {
    const miss = [...used.keys()].filter((k) => !(k in dict)).map((k) => k + ' (' + used.get(k) + ')');
    assert.deepEqual(miss, [], lang + ' tilida yetishmaydi');
  }
});

test("Tarjimalar: yutuq (achT/achD) va haftalik vazifa (q_) kalitlari har bir tilda bor", () => {
  const tr = loadTranslations();
  const pe = fs.readFileSync(path.join(ROOT, 'profile-extras.js'), 'utf8');
  const start = pe.indexOf('const ACH = {');
  const achKeys = [...pe.slice(start, pe.indexOf('};', start)).matchAll(/(\w+):\s*'/g)].map((m) => m[1]);
  assert.ok(achKeys.length >= 20);
  const keyName = (k) => k.replace(/(^|_)(\w)/g, (m, a, c) => c.toUpperCase());
  const Quests = require(path.join(ROOT, 'quests.js'));
  const keys = [...achKeys.flatMap((k) => ['achT' + keyName(k), 'achD' + keyName(k)]), ...Quests.QUESTS.map((q) => 'q_' + (q.id || q[0]))];
  for (const [lang, dict] of Object.entries(tr)) assert.deepEqual(keys.filter((k) => !(k in dict)), [], lang);
});

test("Server xato matnlari: har biri klient xaritasida (SERVER_MESSAGE_KEYS) va kaliti barcha tillarda", () => {
  const tr = loadTranslations();
  const sj = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');
  const start = sj.indexOf('SERVER_MESSAGE_KEYS');
  const block = sj.slice(start, sj.indexOf('};', start));
  const map = new Map();
  const STR = String.raw`("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')`;
  const lit = (src) => vm.runInNewContext(src); // JS satr literalini o'qish
  for (const m of block.matchAll(new RegExp(STR + String.raw`\s*:\s*'(\w+)'`, 'g'))) map.set(lit(m[1]), m[2]);
  assert.ok(map.size > 80, 'xarita: ' + map.size);
  const missing = [];
  for (const f of ['server.js', 'league.js', 'telegram.js', 'teamchess.js']) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of s.matchAll(new RegExp(String.raw`message:\s*` + STR, 'g'))) {
      const v = lit(m[1]);
      if (v !== 'Not found' && !map.has(v)) missing.push(f + ': ' + v);
    }
  }
  assert.deepEqual(missing, [], "klient xaritasida yo'q server xabarlari");
  for (const [lang, dict] of Object.entries(tr)) assert.deepEqual([...new Set(map.values())].filter((k) => !(k in dict)), [], lang);
});
