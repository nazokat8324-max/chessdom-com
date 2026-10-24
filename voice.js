// 🎙️ Ovoz bilan yurish (o'yin paneli sarlavhasida #pgVoiceBtn): brauzerning nutqni aniqlash xizmati (Web Speech API)
// aytilgan gapni matnga aylantiradi, bu yerda u qonuniy yurishga moslanadi ("e4", "ot f3", "конь f3", "e2 e4", "rokirovka").
// Yoqilganda raqib yurishi ham ovoz bilan o'qiladi (speechSynthesis). Serverga ovoz yuborilmaydi.
// UMD: tahlil qismi (parseSpoken, matchMove, moveToWords) testlarda require qilinadi.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VoiceMoves = api;
})(typeof self !== 'undefined' ? self : this, function () {
  // Dona so'zlari (6 til, turli qo'shimchalar bilan)
  const PIECE_WORDS = {
    n: /^(ot(ni|ga|im|ingiz|i)?|knights?|night|конь|коня|конем|конём|коню|caballo|springer|pferd|cavalier)$/,
    b: /^(fil(ni|ga|im|i)?|bishops?|слон|слона|слоном|слону|alfil|läufer|laufer|fou)$/,
    r: /^(rux(ni|ga|im|i)?|ladya(ni|ga)?|rooks?|ладья|ладью|ладьей|ладьёй|ладьи|torre|turm|tour)$/,
    q: /^(farzin(ni|ga|im|i)?|ferz(ni|ga|i)?|qirolicha(ni|ga)?|queens?|ферзь|ферзя|ферзем|ферзём|ферзю|dama|reina|dame)$/,
    k: /^(shoh(ni|ga|im|i)?|qirol(ni|ga|im|i)?|kings?|король|короля|королем|королём|rey|könig|konig|roi)$/,
    p: /^(piyoda(ni|ga|m|si)?|pawns?|пешка|пешку|пешкой|peón|peon|bauer|pion)$/
  };
  // Raqam so'zlari ("e to'rt", "е четыре", "e four")
  const NUMBER_WORDS = {
    1: ['bir', 'one', 'один', 'uno', 'eins', 'un'],
    2: ['ikki', 'two', 'to', 'too', 'два', 'dos', 'zwei', 'deux'],
    3: ['uch', 'three', 'три', 'tres', 'drei', 'trois'],
    4: ["to'rt", 'tort', 'four', 'for', 'четыре', 'cuatro', 'vier', 'quatre'],
    5: ['besh', 'five', 'пять', 'cinco', 'fünf', 'funf', 'cinq'],
    6: ['olti', 'six', 'шесть', 'seis', 'sechs'],
    7: ['yetti', 'seven', 'семь', 'siete', 'sieben', 'sept'],
    8: ['sakkiz', 'eight', 'ate', 'восемь', 'ocho', 'acht', 'huit']
  };
  const NUM = {};
  Object.keys(NUMBER_WORDS).forEach((d) => NUMBER_WORDS[d].forEach((w) => { NUM[w] = d; }));
  // Kirill harflari va aytilgan harf nomlari → vertikal
  const LETTER = { а: 'a', б: 'b', ц: 'c', д: 'd', е: 'e', ф: 'f', г: 'g', х: 'h',
    бэ: 'b', цэ: 'c', дэ: 'd', эф: 'f', жэ: 'g', же: 'g', аш: 'h', ха: 'h',
    bee: 'b', see: 'c', sea: 'c', dee: 'd', ef: 'f', eff: 'f', gee: 'g', aitch: 'h', eitch: 'h' };

  const LONG_CASTLE = /(o-o-o|0-0-0|ooo|long castl|castle long|castles long|queen ?side|uzun rokirovka|rokirovka uzun|длинн\S* рокиров|рокиров\S* длинн|enroque largo|lange rochade|grand roque)/;
  const CASTLE = /(o-o|0-0|castl|king ?side|rokirovka|рокиров|enroque|rochade|roque)/;

  function fileOf(t) {
    if (/^[a-h]$/.test(t)) return t;
    return LETTER[t] || null;
  }
  function rankOf(t) {
    if (/^[1-8]$/.test(t)) return t;
    return NUM[t] || null;
  }

  // Matn → { castle: 'short'|'long'|'any'|null, piece, squares: [], promo }
  function parseSpoken(text) {
    const raw = String(text || '').toLowerCase().replace(/ё/g, 'е').replace(/[’ʻʼ`‘]/g, "'").trim();
    const out = { castle: null, piece: null, squares: [], promo: null };
    if (!raw) return out;
    if (LONG_CASTLE.test(raw)) { out.castle = 'long'; return out; }
    if (/short castl|castle short|qisqa rokirovka|rokirovka qisqa|коротк\S* рокиров|рокиров\S* коротк|enroque corto|kurze rochade|petit roque/.test(raw)) { out.castle = 'short'; return out; }
    if (CASTLE.test(raw)) { out.castle = /o-o|0-0/.test(raw) ? 'short' : 'any'; return out; }
    const tokens = raw.split(/[\s,.;:!?—–\-=()]+/).filter(Boolean);
    const items = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      let m;
      const piece = Object.keys(PIECE_WORDS).find((k) => PIECE_WORDS[k].test(t));
      if (piece) { items.push({ piece }); continue; }
      // SAN: Nf3, Bxc4, exd5 ("x" e'tiborsiz)
      if ((m = t.match(/^([nbrqk])x?([a-h][1-8])$/))) { items.push({ piece: m[1] }); items.push({ sq: m[2] }); continue; }
      if ((m = t.match(/^([a-h][1-8])x?([a-h][1-8])([nbrq])?$/))) { items.push({ sq: m[1] }); items.push({ sq: m[2] }); if (m[3]) items.push({ piece: m[3] }); continue; }
      if ((m = t.match(/^[a-h]x([a-h][1-8])$/))) { items.push({ sq: m[1] }); continue; }
      if ((m = t.match(/^([a-h][1-8])([nbrq])?$/))) { items.push({ sq: m[1] }); if (m[2]) items.push({ piece: m[2] }); continue; }
      if ((m = t.match(/^([абцдефгх])([1-8])$/))) { items.push({ sq: LETTER[m[1]] + m[2] }); continue; }
      // "e 4", "e to'rt", "бэ два"
      const f = fileOf(t);
      if (f && i + 1 < tokens.length && rankOf(tokens[i + 1])) { items.push({ sq: f + rankOf(tokens[i + 1]) }); i++; continue; }
    }
    const firstSq = items.findIndex((x) => x.sq);
    let lastSq = -1;
    items.forEach((x, i) => { if (x.sq) lastSq = i; });
    items.forEach((x, i) => {
      if (x.sq) out.squares.push(x.sq);
      else if (x.piece && (firstSq < 0 || i < firstSq)) { if (!out.piece) out.piece = x.piece; }
      else if (x.piece && i > lastSq && 'qrbn'.includes(x.piece)) out.promo = x.piece;
    });
    return out;
  }

  // Tahlil + qonuniy yurishlar (verbose) → { move } | { ambiguous: [...] } | { none: true }
  function matchMove(parsed, legal) {
    let c = legal.slice();
    if (parsed.castle) {
      c = c.filter((m) => {
        const san = String(m.san || '').replace(/[+#]/g, '');
        if (parsed.castle === 'long') return san === 'O-O-O';
        if (parsed.castle === 'short') return san === 'O-O';
        return san === 'O-O' || san === 'O-O-O';
      });
    } else {
      const sq = parsed.squares;
      if (!sq.length) return { none: true };
      if (sq.length >= 2) {
        const from = sq[sq.length - 2], to = sq[sq.length - 1];
        c = c.filter((m) => m.from === from && m.to === to);
        if (parsed.piece) c = c.filter((m) => m.piece === parsed.piece);
      } else {
        c = c.filter((m) => m.to === sq[0]);
        if (parsed.piece) c = c.filter((m) => m.piece === parsed.piece);
        else if (c.some((m) => m.piece === 'p')) c = c.filter((m) => m.piece === 'p'); // "e4" — piyoda
      }
      if (parsed.promo) c = c.filter((m) => !m.promotion || m.promotion === parsed.promo);
      // Aylanish turi aytilmasa — farzin
      if (c.some((m) => m.promotion)) {
        const want = parsed.promo || 'q';
        c = c.filter((m) => !m.promotion || m.promotion === want);
      }
    }
    const seen = new Set();
    c = c.filter((m) => { const k = m.from + m.to + (m.promotion || ''); if (seen.has(k)) return false; seen.add(k); return true; });
    if (c.length === 1) return { move: c[0] };
    if (c.length > 1) return { ambiguous: c };
    return { none: true };
  }

  // Yurishni o'qish uchun so'zlar
  const SPEAK = {
    uz: { p: '', n: 'ot', b: 'fil', r: 'rux', q: 'farzin', k: 'shoh', x: 'oladi', check: 'shoh!', mate: 'mat!', short: 'qisqa rokirovka', long: 'uzun rokirovka', promo: 'farzinga aylandi' },
    en: { p: '', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king', x: 'takes', check: 'check', mate: 'checkmate', short: 'castles short', long: 'castles long', promo: 'promotes' },
    ru: { p: '', n: 'конь', b: 'слон', r: 'ладья', q: 'ферзь', k: 'король', x: 'бьёт', check: 'шах', mate: 'мат', short: 'короткая рокировка', long: 'длинная рокировка', promo: 'превращение' },
    es: { p: '', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey', x: 'captura', check: 'jaque', mate: 'jaque mate', short: 'enroque corto', long: 'enroque largo', promo: 'corona' },
    de: { p: '', n: 'Springer', b: 'Läufer', r: 'Turm', q: 'Dame', k: 'König', x: 'schlägt', check: 'Schach', mate: 'Schachmatt', short: 'kurze Rochade', long: 'lange Rochade', promo: 'Umwandlung' },
    fr: { p: '', n: 'cavalier', b: 'fou', r: 'tour', q: 'dame', k: 'roi', x: 'prend', check: 'échec', mate: 'échec et mat', short: 'petit roque', long: 'grand roque', promo: 'promotion' }
  };
  function moveToWords(m, lang) {
    const w = SPEAK[lang] || SPEAK.en;
    const san = String(m.san || '');
    const tail = /#$/.test(san) ? ', ' + w.mate : /\+$/.test(san) ? ', ' + w.check : '';
    if (/^O-O-O/.test(san)) return w.long + tail;
    if (/^O-O/.test(san)) return w.short + tail;
    const parts = [];
    if (m.piece && m.piece !== 'p') parts.push(w[m.piece]);
    else if (m.captured) parts.push(m.from[0]);
    if (m.captured) parts.push(w.x);
    parts.push(m.to[0] + ' ' + m.to[1]);
    if (m.promotion) parts.push(w.promo + ' ' + w[m.promotion]);
    return parts.filter(Boolean).join(' ') + tail;
  }

  return { parseSpoken, matchMove, moveToWords };
});

// --- Brauzer qismi ---
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const LANGS = { uz: 'uz-UZ', en: 'en-US', ru: 'ru-RU', es: 'es-ES', de: 'de-DE', fr: 'fr-FR' };
  let on = false;
  try { on = localStorage.getItem('justChessVoice') === '1'; } catch (e) {}
  let rec = null, listening = false, restartTimer = null;

  const lang = () => {
    let l = (window.i18next && window.i18next.language) || '';
    try { l = l || localStorage.getItem('justChessLang') || 'en'; } catch (e) {}
    l = String(l).slice(0, 2);
    return LANGS[l] ? l : 'en';
  };
  const onGamePage = () => { const v = document.getElementById('gameView'); return !!(v && v.classList.contains('active-view')); };

  function refreshButton() {
    const btn = document.getElementById('pgVoiceBtn');
    if (!btn) return;
    btn.hidden = !Rec;
    btn.classList.toggle('on', on);
    btn.classList.toggle('listening', on && listening);
    btn.title = tx('vcTitle', 'Ovoz bilan yurish') + (on ? ' — ' + tx('localOn', 'yoqilgan') : '');
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function stop() {
    clearTimeout(restartTimer);
    listening = false;
    if (rec) { try { rec.onend = null; rec.abort(); } catch (e) {} rec = null; }
    refreshButton();
  }

  function start() {
    if (!Rec || !on || rec || !onGamePage()) return;
    rec = new Rec();
    rec.lang = LANGS[lang()];
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    rec.onstart = () => { listening = true; refreshButton(); };
    rec.onresult = (ev) => {
      const res = ev.results[ev.results.length - 1];
      if (!res || !res.isFinal) return;
      const alts = [];
      for (let i = 0; i < res.length; i++) alts.push(res[i].transcript);
      handleSpeech(alts);
    };
    rec.onerror = (ev) => {
      // Ruxsat yo'q, mikrofon yo'q yoki xizmat ishlamaydi — qayta-qayta urinmaslik uchun o'chiramiz
      const denied = ev.error === 'not-allowed' || ev.error === 'service-not-allowed' || ev.error === 'audio-capture';
      if (denied || ev.error === 'network' || ev.error === 'language-not-supported') {
        on = false;
        try { localStorage.setItem('justChessVoice', '0'); } catch (e) {}
        showToast(denied ? tx('vcDenied', 'Mikrofonga ruxsat berilmadi') : tx('vcUnsupported', 'Brauzeringiz ovozni tanimaydi (Chrome, Edge yoki Safari kerak)'), 'error');
      }
    };
    rec.onend = () => {
      rec = null;
      listening = false;
      refreshButton();
      // Brauzer jimlikdan keyin to'xtatadi — yoqilgan bo'lsa qayta tinglaymiz
      if (on && onGamePage()) restartTimer = setTimeout(start, 400);
    };
    try { rec.start(); } catch (e) { rec = null; }
  }

  function handleSpeech(alts) {
    const V = window.VoiceMoves;
    const heard = String(alts[0] || '').trim();
    if (!heard || typeof game === 'undefined') return;
    if (typeof window.isGameInProgress !== 'function' || !window.isGameInProgress()) {
      showToast(tx('vcNoGame', "O'yin boshlanmagan"), 'info', 1800);
      return;
    }
    if (typeof viewPly !== 'undefined' && viewPly !== null && typeof window.reviewMove === 'function') window.reviewMove('end');
    if (window.myColor && game.turn() !== window.myColor) {
      showToast(tx('vcNotYourTurn', 'Navbat raqibda') + ' — «' + heard + '»', 'warning', 1800);
      return;
    }
    const legal = game.moves({ verbose: true });
    let ambiguous = null;
    for (const a of alts) {
      const r = V.matchMove(V.parseSpoken(a), legal);
      if (r.move) {
        const mv = window.executeMove(r.move.from, r.move.to, r.move.promotion);
        if (mv && typeof board !== 'undefined' && board) board.position(game.fen());
        if (mv) showToast('🎙️ ' + (mv.san || heard), 'info', 1200);
        return;
      }
      if (r.ambiguous && !ambiguous) ambiguous = r.ambiguous;
    }
    if (ambiguous) showToast(tx('vcAmbiguous', 'Aniqroq ayting: {{list}}', { list: ambiguous.slice(0, 4).map((m) => m.san).join(', ') }), 'warning', 3000);
    else showToast(tx('vcNotUnderstood', 'Tushunmadim: «{{text}}»', { text: heard }), 'warning', 2500);
  }

  // Raqib yurishini o'qish (ovoz bilan yurish yoqilgan bo'lsa)
  function speak(text) {
    if (!window.speechSynthesis || !text) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = LANGS[lang()];
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  if (typeof socket !== 'undefined' && socket && typeof socket.on === 'function') {
    socket.on('opponent-move', () => {
      if (!on) return;
      setTimeout(() => {
        try {
          const h = game.history({ verbose: true });
          const last = h[h.length - 1];
          if (last && last.color !== window.myColor) speak(window.VoiceMoves.moveToWords(last, lang()));
        } catch (e) {}
      }, 0);
    });
  }

  window.toggleVoiceMoves = function () {
    if (!Rec) { showToast(tx('vcUnsupported', 'Brauzeringiz ovozni tanimaydi (Chrome, Edge yoki Safari kerak)'), 'warning'); return; }
    on = !on;
    try { localStorage.setItem('justChessVoice', on ? '1' : '0'); } catch (e) {}
    if (on) {
      start();
      showToast(tx('vcOn', '🎙️ Ovoz bilan yurish yoqildi — yurishni ayting, masalan «e4» yoki «ot f3»'), 'info', 4000);
    } else {
      stop();
      if (window.speechSynthesis) try { window.speechSynthesis.cancel(); } catch (e) {}
      showToast(tx('vcOff', "Ovoz bilan yurish o'chirildi"), 'info', 1500);
    }
    refreshButton();
  };

  // O'yin sahifasidan chiqilsa — tinglash to'xtaydi, qaytilsa davom etadi
  const origSwitch = window.switchView;
  if (typeof origSwitch === 'function') {
    window.switchView = function () {
      const r = origSwitch.apply(this, arguments);
      setTimeout(() => { if (onGamePage()) start(); else stop(); }, 0);
      return r;
    };
  }
  document.addEventListener('DOMContentLoaded', refreshButton);
  refreshButton();
})();
