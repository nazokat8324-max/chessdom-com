// Ўзбекча (кирилл) — til kodi 'uzc'. Alohida tarjima saqlanmaydi: o'zbekcha (lotin) matn shu yerda kirillga o'giriladi
// (languages.js — barcha kalitlar, tx fallback, push/bot matnlari, huquqiy sahifalar, kutubxona va shahar nomlari).
// O'girilmaydi: {{o'zgaruvchilar}}, HTML teglari va &belgilar;, havolalar, shaxmat yozuvi (e4, Nf3, Bxc6+, O-O),
// ichida bosh harfi bor so'zlar (ChessCaravan, iPhone) va brend/qisqartmalar (PROTECTED). UMD: server require + window.UzCyrl.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.UzCyrl = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const PROTECTED = ['PGN', 'FEN', 'ECO', 'ACPL', 'PWA', 'TWA', 'GIF', 'PNG', 'JPEG', 'WEBP', 'CDN', 'GPL', 'MIT', 'ISC', 'SIL', 'OFL', 'CC', 'BY', 'FIDE', 'ID', 'UCI', 'URL', 'API', 'JWT', 'VAPID', 'SAN',
    'Chess960', 'Stockfish', 'Telegram', 'Google', 'Brevo', 'Render', 'Neon', 'Chrome', 'Safari', 'Edge', 'Firefox', 'Android', 'Elo', 'Emoji', 'Gutenberg', 'Project', 'Lichess', 'lichess',
    'Cloudflare', 'flagcdn', 'Inter', 'D3', 'TopoJSON', 'gifenc', 'i18next', 'jQuery', 'howler', 'chess', 'js', 'chessboard', 'socket', 'io', 'jsDelivr', 'cdnjs', 'unpkg', 'Windows', 'Apple', 'Mozilla',
    'Natural', 'Earth', 'world', 'atlas', 'com', 'org', 'net', 'uz', 'Bot', 'BotFather', 'Push', 'push', 'WhatsApp', 'App', 'Store', 'Play', 'UTC'];
  const PROTECTED_SET = new Set(PROTECTED);
  // Himoyalangan bo'laklar: {{x}}, <teg>, &nbsp;, havolalar, shaxmat yurishlari, ichida bosh harfli so'zlar, raqamli so'zlar (h1, 3+2)
  const SPLIT = /(\{\{[^}]*\}\}|<[^>]*>|&[a-zA-Z#0-9]+;|https?:\/\/[^\s"'<>]+|[\w.-]+@[\w.-]+|(?:^|(?<=\s))\/[a-z_]+\b|\b(?:O-O-O|O-O)\b|\b[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?(?![A-Za-z])|\b[a-h]x[a-h][1-8]\b|\b[A-Za-z]*[a-z][A-Z][A-Za-z0-9]*\b|\b[A-Za-z]+\d[\w]*\b)/;
  const MAP = { a: 'а', b: 'б', c: 'с', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'х', y: 'й', z: 'з' };
  const VOWELS = 'aeiouAEIOU';
  const APOS = "'’ʼʻ‘`";
  const isLetter = (ch) => !!ch && /[A-Za-z]/.test(ch);
  const up = (src, out) => (src === src.toUpperCase() && src !== src.toLowerCase() ? out.toUpperCase() : out);

  function word(w) {
    if (PROTECTED_SET.has(w)) return w;
    // Brend + qo'shimcha: Telegram'ni → Telegram'ни, ChessCaravan'da → ChessCaravan'да
    const ap = w.search(/['’ʼʻ‘`]/);
    if (ap > 0 && (PROTECTED_SET.has(w.slice(0, ap)) || /[a-z][A-Z]/.test(w.slice(0, ap)))) return w.slice(0, ap + 1) + word(w.slice(ap + 1));
    let out = '';
    for (let i = 0; i < w.length; i++) {
      const c = w[i], n = w[i + 1] || '', lc = c.toLowerCase(), ln = n.toLowerCase();
      const prev = w[i - 1] || '';
      const start = !isLetter(prev);
      if ((lc === 'o' || lc === 'g') && n && APOS.includes(n)) { out += up(c, lc === 'o' ? 'ў' : 'ғ'); i++; continue; }
      if (lc === 's' && ln === 'h') { out += up(c, 'ш'); i++; continue; }
      if (lc === 'c' && ln === 'h') { out += up(c, 'ч'); i++; continue; }
      // yo' — й + ў (yo'l → йўл), qolgan yo/ya/yu/ye — ё/я/ю/е
      if (lc === 'y' && ln === 'o' && w[i + 2] && APOS.includes(w[i + 2])) { out += up(c, 'й'); continue; }
      if (lc === 'y' && ln && 'oaue'.includes(ln)) { out += up(c, { o: 'ё', a: 'я', u: 'ю', e: 'е' }[ln]); i++; continue; }
      if (lc === 'e') { out += up(c, start || VOWELS.includes(prev) ? 'э' : 'е'); continue; }
      if (APOS.includes(c)) { out += isLetter(prev) && isLetter(n) ? 'ъ' : c; continue; }
      out += MAP[lc] ? up(c, MAP[lc]) : c;
    }
    return out;
  }

  function toCyrl(text) {
    if (typeof text !== 'string' || !/[A-Za-z]/.test(text)) return text;
    return text.split(SPLIT).map((part, i) => {
      if (!part) return '';
      if (i % 2 === 1) return part; // himoyalangan bo'lak
      // So'zlar (tutuq belgisi bilan: o'yin, ma'lumot) va boshqa belgilar
      return part.replace(/[A-Za-z]+(?:['’ʼʻ‘`][A-Za-z]+)*['’ʼʻ‘`]?/g, (w) => {
        // So'z oxiridagi qo'shtirnoq vazifasidagi belgi (masalan 'Rejada') — o'zgarmaydi
        const trail = /['’ʼʻ‘`]$/.test(w) && !/[oOgG]['’ʼʻ‘`]$/.test(w) ? w.slice(-1) : '';
        return word(trail ? w.slice(0, -1) : w) + trail;
      });
    }).join('');
  }

  // Obyekt/massiv ichidagi barcha satrlar (tarjimalar, huquqiy matnlar)
  function deep(v) {
    if (typeof v === 'string') return toCyrl(v);
    if (Array.isArray(v)) return v.map(deep);
    if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = deep(v[k]); return o; }
    return v;
  }
  return { toCyrl, deep, CODE: 'uzc' };
});
