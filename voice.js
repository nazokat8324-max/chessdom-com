// 🎙️ Ovoz bilan yurish (o'yin paneli sarlavhasida #pgVoiceBtn): brauzerning nutqni aniqlash xizmati (Web Speech API)
// aytilgan gapni matnga aylantiradi, bu yerda u qonuniy yurishga moslanadi ("e4", "ot f3", "конь f3", "e2 e4", "rokirovka").
// Yoqilganda raqib yurishi ham ovoz bilan o'qiladi (speechSynthesis). Serverga ovoz yuborilmaydi.
// 2026-11-24 yaxshilandi (foydalanuvchi tanlovi): taxta ostida panel (#vcBar — nima eshitildi va natija), buyruqlar
// (taslim, durrang, qaytar, aylantir, vaqt, takrorla, yordam), «bosib gapirish» rejimi (tugma yoki Space), bir xil yurish
// bir nechta bo'lsa «qaysi biri?» (keyingi gapda katak yoki harf), ko'proq so'z variantlari va o'zbekcha/qozoqcha… tanish
// yo'q bo'lsa — ruscha tanishga o'tish. Rejim justChessSettings.voiceMode ('auto' | 'ptt') — akkauntga saqlanadi.
// UMD: tahlil qismi (parseSpoken, parseCommand, matchMove, pickAmbiguous, moveToWords) testlarda require qilinadi.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VoiceMoves = api;
})(typeof self !== 'undefined' ? self : this, function () {
  // Dona so'zlari (14 til, turli qo'shimchalar va tez-tez noto'g'ri eshitiladigan shakllar bilan)
  const PIECE_WORDS = {
    n: /^(ot(ni|ga|im|ingiz|i|lar)?|o't|от(ни|га|им)?|knights?|night|nite|конь|коня|конем|конём|коню|caballo|springer|pferd|cavalier|at(ı|i|la|ım|ını)?|ат(ты|пен|ым|қа)?|асп(ро|ба)?|cavall[oi]|马)$/,
    b: /^(fil(ni|ga|im|i|l)?|bishops?|слон|слона|слоном|слону|alfil|läufer|laufer|fou|fili|fille|піл(ді|мен|ге)?|фил(ро|ба)?|пил(ди|ге|ден)?|pil(i|e)?|alfier[ei]|象)$/,
    r: /^(rux(ni|ga|im|i)?|ruh(ni|ga)?|rukh|ladya(ni|ga)?|rooks?|rock|ruck|ладья|ладью|ладьей|ладьёй|ладьи|torre|turm|tour|kale(yi|yle|m)?|тура(ны|мен|ға)?|рух(ро|ба)?|ladýa|top(u|la)?|torri|车)$/,
    q: /^(farzin(ni|ga|im|i)?|farzim|ferz(ni|ga|i)?|qirolicha(ni|ga)?|queens?|ферзь|ферзя|ферзем|ферзём|ферзю|dama|reina|dame|vezir(i|le|im)?|ферзьді|ферзьмен|уәзір(ді|мен)?|фарзин(ро|ба)?|малика|vəzir(i|lə)?|donna|regina|后)$/,
    k: /^(shoh(ni|ga|im|i)?|shox|qirol(ni|ga|im|i)?|kings?|король|короля|королем|королём|rey|könig|konig|roi|şah(ı|la|ım)?|патша(ны|мен|ға)?|шоҳ(ро|ба)?|падыша(ны|га)?|şa(ny)?|re|王)$/,
    p: /^(piyoda(ni|ga|m|si)?|piyada(ni|ga)?|pawns?|пешка|пешку|пешкой|peón|peon|bauer|pion|piyon(u|la|um)?|пешка(ны|мен|ға)?|пешкамен|пи[её]да(ро|ба)?|piýada|piyada(nı|ya)?|pedon[ei]|兵)$/
  };
  // Raqam so'zlari ("e to'rt", "е четыре", "e four") — tovushi o'xshashlari bilan
  const NUMBER_WORDS = {
    1: ['bir', 'one', 'won', 'один', 'uno', 'eins', 'un', 'бір', 'як', 'бир', '一'],
    2: ['ikki', 'two', 'to', 'too', 'два', 'dos', 'zwei', 'deux', 'iki', 'екі', 'ду', 'эки', 'due', '二', '两'],
    3: ['uch', 'three', 'tree', 'free', 'три', 'tres', 'drei', 'trois', 'üç', 'uc', 'үш', 'се', 'үч', 'tre', '三'],
    4: ["to'rt", 'tort', 'turt', 'tört', 'four', 'for', 'fore', 'четыре', 'cuatro', 'vier', 'quatre', 'dört', 'dort', 'төрт', 'чор', 'dörd', 'quattro', '四'],
    5: ['besh', 'five', 'пять', 'cinco', 'fünf', 'funf', 'cinq', 'beş', 'bes', 'бес', 'панҷ', 'беш', 'bäş', 'cinque', '五'],
    6: ['olti', 'alti', 'six', 'шесть', 'seis', 'sechs', 'altı', 'алты', 'шаш', 'alty', 'sei', '六'],
    7: ['yetti', 'etti', 'seven', 'семь', 'siete', 'sieben', 'sept', 'yedi', 'жеті', 'ҳафт', 'жети', 'ýedi', 'yeddi', 'sette', '七'],
    8: ['sakkiz', 'sakiz', 'eight', 'ate', 'восемь', 'ocho', 'acht', 'huit', 'sekiz', 'сегіз', 'ҳашт', 'сегиз', 'səkkiz', 'otto', '八']
  };
  const NUM = {};
  Object.keys(NUMBER_WORDS).forEach((d) => NUMBER_WORDS[d].forEach((w) => { NUM[w] = d; }));
  // Kirill harflari va aytilgan harf nomlari → vertikal (ko'p tilda: «be», «se», «de», «ef», «ge», «ash», «hache», «acca»…)
  const LETTER = { а: 'a', б: 'b', ц: 'c', д: 'd', е: 'e', ф: 'f', г: 'g', х: 'h',
    бэ: 'b', бе: 'b', цэ: 'c', це: 'c', дэ: 'd', де: 'd', эф: 'f', гэ: 'g', ге: 'g', жэ: 'g', же: 'g', аш: 'h', ха: 'h',
    bee: 'b', be: 'b', bi: 'b', see: 'c', sea: 'c', se: 'c', si: 'c', ce: 'c', ci: 'c', cé: 'c', dee: 'd', de: 'd', di: 'd', dé: 'd',
    ye: 'e', ef: 'f', eff: 'f', efe: 'f', effe: 'f', gee: 'g', ge: 'g', gé: 'g', gi: 'g', aitch: 'h', eitch: 'h', ash: 'h', ha: 'h', xa: 'h', ache: 'h', hache: 'h', acca: 'h' };

  const LONE_RANK_SKIP = new Set(['to', 'too', 'for', 'fore', 'ate', 'won', 'tree', 'free', 'se', 'un', 'uno', 'due', 'tre', 'sei', 'otto', 'dos', 'tres']);

  const LONG_CASTLE = /(o-o-o|0-0-0|ooo|long castl|castle long|castles long|queen ?side|uzun rokirovka|rokirovka uzun|длинн\S* рокиров|рокиров\S* длинн|enroque largo|lange rochade|grand roque|uzun rok|ұзын рокиров|дароз рокиров|узун рокиров|uzyn rokirowka|uzun qala|arrocco lungo|长(王车)?易位|后翼易位)/;
  const CASTLE = /(o-o|0-0|castl|king ?side|rokirovka|рокиров|enroque|rochade|roque|rokirowka|arrocco|易位|(^|\s)qala(\s|$)|(^|\s)rok(\s|$))/;

  function fileOf(t) {
    if (/^[a-h]$/.test(t)) return t;
    return LETTER[t] || null;
  }
  function rankOf(t) {
    if (/^[1-8]$/.test(t)) return t;
    return NUM[t] || null;
  }
  const normText = (text) => String(text || '').toLowerCase().replace(/ё/g, 'е').replace(/[’ʻʼ`‘]/g, "'").trim();

  // Matn → { castle: 'short'|'long'|'any'|null, piece, squares: [], promo, files: [], ranks: [] }
  // files/ranks — yolg'iz aytilgan harf yoki raqam («b», «olti») — «qaysi biri?» savoliga javob uchun
  function parseSpoken(text) {
    const raw = normText(text);
    const out = { castle: null, piece: null, squares: [], promo: null, files: [], ranks: [] };
    if (!raw) return out;
    if (LONG_CASTLE.test(raw)) { out.castle = 'long'; return out; }
    if (/short castl|castle short|qisqa rokirovka|rokirovka qisqa|коротк\S* рокиров|рокиров\S* коротк|enroque corto|kurze rochade|petit roque|k[ıi]sa rok|қысқа рокиров|кӯтоҳ рокиров|кыска рокиров|gysga rokirowka|qısa qala|arrocco corto|短(王车)?易位|王翼易位/.test(raw)) { out.castle = 'short'; return out; }
    if (CASTLE.test(raw)) { out.castle = /o-o|0-0/.test(raw) ? 'short' : 'any'; return out; }
    // Xitoycha matnda bo'sh joy yo'q: har ieroglif alohida so'z ("马f3" → "马 f3", "e四" → "e 四")
    const tokens = raw.replace(/[一-鿿]/g, ' $& ').split(/[\s,.;:!?—–\-=()]+/).filter(Boolean);
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
      // Harf nomi raqam bilan qo'shilib eshitilgan: «ef3», «be5», «аш7»
      if ((m = t.match(/^([a-zа-яé]{2,5})([1-8])$/)) && LETTER[m[1]]) { items.push({ sq: LETTER[m[1]] + m[2] }); continue; }
      // "e 4", "e to'rt", "бэ два"
      const f = fileOf(t);
      if (f && i + 1 < tokens.length && rankOf(tokens[i + 1])) { items.push({ sq: f + rankOf(tokens[i + 1]) }); i++; continue; }
      if (f && (/^[a-h]$/.test(t) || t.length >= 2)) { items.push({ file: f }); continue; }
      // Yolg'iz raqam — faqat aniq raqam so'zi (inglizcha «to», «for», «ate» kabi so'zlar emas)
      const r = rankOf(t);
      if (r && !LONE_RANK_SKIP.has(t)) items.push({ rank: r });
    }
    const firstSq = items.findIndex((x) => x.sq);
    let lastSq = -1;
    items.forEach((x, i) => { if (x.sq) lastSq = i; });
    items.forEach((x, i) => {
      if (x.sq) out.squares.push(x.sq);
      else if (x.file) out.files.push(x.file);
      else if (x.rank) out.ranks.push(x.rank);
      else if (x.piece && (firstSq < 0 || i < firstSq)) { if (!out.piece) out.piece = x.piece; }
      else if (x.piece && i > lastSq && 'qrbn'.includes(x.piece)) out.promo = x.piece;
    });
    return out;
  }

  // Ovozli buyruqlar (14 til). Faqat gapda katak yoki rokirovka bo'lmasa tekshiriladi.
  const COMMANDS = [
    ['resign', /(taslim|resign|give up|сда(юсь|ться|ю|юсь)|me rindo|rendirse|abandono|aufgeben|gebe auf|abandonne|abandonner|teslim|берілемін|берілу|багынам|boýun|təslim|认输|投降|mi arrendo|abbandono)/],
    ['draw', /(durrang|durang|дурранг|draw|ничь|tablas|remis|nulle|match nul|berabere|beraberlik|теңдік|тең ойын|мусовӣ|deňme|heç-heç|heçheç|和棋|求和|patta)/],
    ['undo', /(qaytar(ib|ing)?(\s|$)|orqaga|undo|take ?back|отмен|(^|\s)верни|deshacer|zurück|rückgängig|annule|geri al|қайтар|бозгард|кайтар|yza al|gaýtar|geri qaytar|悔棋|撤销|annulla)/],
    ['flip', /(aylantir|айлантир|flip|rotate|turn the board|переверн|поверн|girar|voltear|umdrehen|drehen|tourne|retourne|çevir|döndür|аудар|гардон|айландыр|öwür|翻转|gira|ruota)/],
    ['time', /(vaqt|soat|time|clock|врем|часы|tiempo|reloj|zeit|uhr|temps|horloge|pendule|süre|zaman|saat|уақыт|сағат|вақт|соат|убакыт|саат|wagt|sagat|vaxt|时间|钟|tempo|orologio)/],
    ['repeat', /(takrorla|qayta ayt|repeat|say again|last move|повтор|repite|wiederhol|répète|repete|tekrar|қайтала|такрор|кайтала|gaýtala|təkrarla|重复|ripeti)/],
    ['help', /(yordam|help|помощ|ayuda|hilfe|aide|yardım|көмек|ёрдам|жардам|kömek|kömək|帮助|aiuto)/]
  ];
  function parseCommand(text) {
    const raw = normText(text);
    if (!raw) return null;
    const p = parseSpoken(raw);
    if (p.castle || p.squares.length) return null;
    for (const [cmd, re] of COMMANDS) if (re.test(raw)) return cmd;
    return null;
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
        // «ot b d2» / «exd5»: qo'shimcha aytilgan harf yoki raqam qaysi donaligini aniqlaydi
        if (c.length > 1 && parsed.files && parsed.files.length) { const f = c.filter((m) => parsed.files.includes(m.from[0])); if (f.length) c = f; }
        if (c.length > 1 && parsed.ranks && parsed.ranks.length) { const r = c.filter((m) => parsed.ranks.includes(m.from[1])); if (r.length) c = r; }
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

  // «Qaysi biri?» savolidan keyingi javob: boshlang'ich katak («b1»), harf («be») yoki raqam («olti») → bitta yurish yoki null
  function pickAmbiguous(text, cands) {
    const p = parseSpoken(text);
    let c = cands.slice();
    const fromSq = p.squares.find((s) => c.some((m) => m.from === s));
    if (fromSq) c = c.filter((m) => m.from === fromSq);
    else {
      if (p.files.length) c = c.filter((m) => p.files.includes(m.from[0]));
      if (c.length > 1 && p.ranks.length) c = c.filter((m) => p.ranks.includes(m.from[1]));
      if (c.length > 1 && p.piece) c = c.filter((m) => m.piece === p.piece);
      if (c.length > 1 && p.promo) c = c.filter((m) => m.promotion === p.promo);
    }
    return c.length === 1 ? c[0] : null;
  }

  // Yurishni o'qish uchun so'zlar
  const SPEAK = {
    uz: { p: '', n: 'ot', b: 'fil', r: 'rux', q: 'farzin', k: 'shoh', x: 'oladi', check: 'shoh!', mate: 'mat!', short: 'qisqa rokirovka', long: 'uzun rokirovka', promo: 'farzinga aylandi' },
    en: { p: '', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king', x: 'takes', check: 'check', mate: 'checkmate', short: 'castles short', long: 'castles long', promo: 'promotes' },
    ru: { p: '', n: 'конь', b: 'слон', r: 'ладья', q: 'ферзь', k: 'король', x: 'бьёт', check: 'шах', mate: 'мат', short: 'короткая рокировка', long: 'длинная рокировка', promo: 'превращение' },
    es: { p: '', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey', x: 'captura', check: 'jaque', mate: 'jaque mate', short: 'enroque corto', long: 'enroque largo', promo: 'corona' },
    de: { p: '', n: 'Springer', b: 'Läufer', r: 'Turm', q: 'Dame', k: 'König', x: 'schlägt', check: 'Schach', mate: 'Schachmatt', short: 'kurze Rochade', long: 'lange Rochade', promo: 'Umwandlung' },
    fr: { p: '', n: 'cavalier', b: 'fou', r: 'tour', q: 'dame', k: 'roi', x: 'prend', check: 'échec', mate: 'échec et mat', short: 'petit roque', long: 'grand roque', promo: 'promotion' },
    tr: { p: '', n: 'at', b: 'fil', r: 'kale', q: 'vezir', k: 'şah', x: 'alır', check: 'şah', mate: 'şah mat', short: 'kısa rok', long: 'uzun rok', promo: 'terfi' },
    kk: { p: '', n: 'ат', b: 'піл', r: 'тура', q: 'ферзь', k: 'патша', x: 'алады', check: 'шах', mate: 'мат', short: 'қысқа рокировка', long: 'ұзын рокировка', promo: 'айналды' },
    tg: { p: '', n: 'асп', b: 'фил', r: 'рух', q: 'фарзин', k: 'шоҳ', x: 'мегирад', check: 'кишт', mate: 'мот', short: 'қалъабандии кӯтоҳ', long: 'қалъабандии дароз', promo: 'табдил ёфт' },
    ky: { p: '', n: 'ат', b: 'пил', r: 'ладья', q: 'ферзь', k: 'падыша', x: 'алат', check: 'шах', mate: 'мат', short: 'кыска рокировка', long: 'узун рокировка', promo: 'айланды' },
    tk: { p: '', n: 'at', b: 'pil', r: 'ladýa', q: 'ferz', k: 'şa', x: 'alýar', check: 'şah', mate: 'mat', short: 'gysga rokirowka', long: 'uzyn rokirowka', promo: 'öwrüldi' },
    az: { p: '', n: 'at', b: 'fil', r: 'top', q: 'vəzir', k: 'şah', x: 'vurur', check: 'şah', mate: 'mat', short: 'qısa qala', long: 'uzun qala', promo: 'çevrildi' },
    zh: { p: '', n: '马', b: '象', r: '车', q: '后', k: '王', x: '吃', check: '将军', mate: '将死', short: '短易位', long: '长易位', promo: '升变为' },
    it: { p: '', n: 'cavallo', b: 'alfiere', r: 'torre', q: 'donna', k: 're', x: 'prende', check: 'scacco', mate: 'scacco matto', short: 'arrocco corto', long: 'arrocco lungo', promo: 'promuove a' }
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

  return { parseSpoken, parseCommand, matchMove, pickAmbiguous, moveToWords };
});

// --- Brauzer qismi ---
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const LANGS = { uz: 'uz-UZ', en: 'en-US', ru: 'ru-RU', es: 'es-ES', de: 'de-DE', fr: 'fr-FR', tr: 'tr-TR', kk: 'kk-KZ', tg: 'tg-TJ', ky: 'ky-KG', tk: 'tk-TM', az: 'az-AZ', zh: 'zh-CN', it: 'it-IT' };
  // Bu tillar uchun brauzerda tanish bo'lmasa — ruscha tanish (bu tillarda gapiruvchilar ko'pincha ruscha shaxmat so'zlarini ham biladi)
  const RU_FALLBACK = ['uz', 'kk', 'ky', 'tg', 'tk', 'az'];
  let on = false;
  try { on = localStorage.getItem('justChessVoice') === '1'; } catch (e) {}
  let rec = null, listening = false, restartTimer = null, fallbackRu = false, holding = false, pending = null;

  const lang = () => {
    let l = (window.i18next && window.i18next.language) || '';
    try { l = l || localStorage.getItem('justChessLang') || 'en'; } catch (e) {}
    l = String(l).slice(0, 2);
    return LANGS[l] ? l : 'en';
  };
  const recLang = () => (fallbackRu ? 'ru-RU' : LANGS[lang()]);
  const settings = () => { try { return JSON.parse(localStorage.getItem('justChessSettings') || '{}') || {}; } catch (e) { return {}; } };
  const mode = () => (settings().voiceMode === 'ptt' ? 'ptt' : 'auto');
  const onGamePage = () => { const v = document.getElementById('gameView'); return !!(v && v.classList.contains('active-view')); };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const t = (k, fb, v) => (typeof tx === 'function' ? tx(k, fb, v) : fb);
  const toast = (msg, type, ms) => { if (typeof showToast === 'function') showToast(msg, type, ms); };

  // ---- Panel: taxta ostida — holat, eshitilgan gap va natija; rejim almashtirgich; «bosib gapirish» tugmasi
  function bar() {
    let el = document.getElementById('vcBar');
    if (el) return el;
    const anchor = document.querySelector('#gameView .board-wrapper');
    if (!anchor) return null;
    el = document.createElement('div');
    el.id = 'vcBar';
    el.className = 'vc-bar';
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<span class="vc-dot" aria-hidden="true"></span><span class="vc-text"><span class="vc-status"></span><span class="vc-heard"></span></span>'
      + '<button type="button" class="vc-ptt"></button><button type="button" class="vc-mode"></button><button type="button" class="vc-help" aria-label="' + String(t('vcHelpTitle', 'Nimalarni aytish mumkin?')).replace(/"/g, '&quot;') + '">?</button>';
    anchor.insertAdjacentElement('afterend', el);
    const ptt = el.querySelector('.vc-ptt');
    ptt.addEventListener('pointerdown', (e) => { e.preventDefault(); try { ptt.setPointerCapture(e.pointerId); } catch (x) {} pttStart(); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => ptt.addEventListener(ev, pttStop));
    ptt.addEventListener('click', (e) => { if (e.detail === 0) { if (holding) pttStop(); else pttStart(); } }); // klaviatura (Enter)
    el.querySelector('.vc-mode').addEventListener('click', () => setMode(mode() === 'ptt' ? 'auto' : 'ptt'));
    el.querySelector('.vc-help').addEventListener('click', () => showResult('', t('vcHelp', "Masalan: «e4», «ot f3», «e2 e4», «rokirovka». Buyruqlar: «taslim», «durrang», «qaytar», «aylantir», «vaqt», «takrorla»."), 'info'));
    return el;
  }
  let lastHeard = '', lastResult = '', lastKind = '';
  function showResult(heard, result, kind) {
    lastHeard = heard; lastResult = result; lastKind = kind || '';
    renderBar();
  }
  function renderBar() {
    const el = bar();
    if (!el) return;
    el.hidden = !(on && Rec && onGamePage());
    if (el.hidden) return;
    const ptt = mode() === 'ptt';
    el.classList.toggle('listening', listening);
    el.classList.toggle('ptt', ptt);
    el.querySelector('.vc-status').textContent = listening ? t('vcListening', 'Tinglayapman…') : (ptt ? t('vcHoldHint', 'Gapirish uchun tugmani bosib turing (yoki Space)') : t('vcReady', 'Tayyor'));
    const h = el.querySelector('.vc-heard');
    h.className = 'vc-heard' + (lastKind ? ' ' + lastKind : '');
    h.innerHTML = (lastHeard ? '«' + esc(lastHeard) + '»' + (lastResult ? ' → ' : '') : '') + esc(lastResult || '');
    const b = el.querySelector('.vc-ptt');
    b.hidden = !ptt;
    b.textContent = '🎙 ' + t('vcHold', 'Bosib turing');
    b.classList.toggle('on', holding);
    const m = el.querySelector('.vc-mode');
    m.textContent = ptt ? t('vcModePtt', 'Bosib gapirish') : t('vcModeAuto', 'Doim tinglash');
    m.title = t('vcModeTitle', 'Rejimni almashtirish');
    el.querySelector('.vc-help').title = t('vcHelpTitle', 'Nimalarni aytish mumkin?');
    el.querySelector('.vc-help').setAttribute('aria-label', t('vcHelpTitle', 'Nimalarni aytish mumkin?'));
  }

  function refreshButton() {
    const btn = document.getElementById('pgVoiceBtn');
    if (btn) {
      btn.hidden = !Rec;
      btn.classList.toggle('on', on);
      btn.classList.toggle('listening', on && listening);
      btn.title = t('vcTitle', 'Ovoz bilan yurish') + (on ? ' — ' + t('localOn', 'yoqilgan') : '');
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    renderBar();
  }

  function stop() {
    clearTimeout(restartTimer);
    listening = false;
    holding = false;
    if (rec) { try { rec.onend = null; rec.abort(); } catch (e) {} rec = null; }
    refreshButton();
  }

  function start(single) {
    if (!Rec || !on || rec || !onGamePage()) return;
    if (mode() === 'ptt' && !single) { refreshButton(); return; } // bosib gapirish rejimida faqat tugma bilan
    rec = new Rec();
    rec.lang = recLang();
    rec.continuous = !single;
    rec.interimResults = true;
    rec.maxAlternatives = 5;
    rec.onstart = () => { listening = true; refreshButton(); };
    rec.onresult = (ev) => {
      const res = ev.results[ev.results.length - 1];
      if (!res) return;
      if (!res.isFinal) { showResult(String(res[0] && res[0].transcript || '').trim(), '', 'interim'); return; }
      const alts = [];
      for (let i = 0; i < res.length; i++) alts.push(res[i].transcript);
      handleSpeech(alts);
    };
    rec.onerror = (ev) => {
      // Bu tilda tanish yo'q — ruscha tanishga o'tamiz (bir marta)
      if (ev.error === 'language-not-supported' && !fallbackRu && RU_FALLBACK.includes(lang())) {
        fallbackRu = true;
        toast(t('vcFallback', "Bu tilda ovoz tanish yo'q — ruscha tanish ishlatilmoqda (masalan «конь f3»)"), 'info', 5000);
        return;
      }
      // Ruxsat yo'q, mikrofon yo'q yoki xizmat ishlamaydi — qayta-qayta urinmaslik uchun o'chiramiz
      const denied = ev.error === 'not-allowed' || ev.error === 'service-not-allowed' || ev.error === 'audio-capture';
      if (denied || ev.error === 'network' || ev.error === 'language-not-supported') {
        on = false;
        try { localStorage.setItem('justChessVoice', '0'); } catch (e) {}
        toast(denied ? t('vcDenied', 'Mikrofonga ruxsat berilmadi') : t('vcUnsupported', 'Brauzeringiz ovozni tanimaydi (Chrome, Edge yoki Safari kerak)'), 'error');
      }
    };
    rec.onend = () => {
      rec = null;
      listening = false;
      holding = false;
      refreshButton();
      // Brauzer jimlikdan keyin to'xtatadi — «doim tinglash» rejimida qayta tinglaymiz
      if (on && onGamePage() && mode() === 'auto') restartTimer = setTimeout(() => start(), 400);
    };
    try { rec.start(); } catch (e) { rec = null; }
  }

  // «Bosib gapirish»: bosilganda tinglash, qo'yib yuborilganda tugatish (natija onresult da)
  function pttStart() {
    if (!on || mode() !== 'ptt' || holding) return;
    holding = true;
    if (rec) { try { rec.onend = null; rec.abort(); } catch (e) {} rec = null; }
    start(true);
    renderBar();
  }
  function pttStop() {
    if (!holding) return;
    holding = false;
    if (rec) { try { (rec.stop || rec.abort).call(rec); } catch (e) {} }
    renderBar();
  }
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat || !on || mode() !== 'ptt' || !onGamePage()) return;
    if (e.target && e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"], button')) return;
    e.preventDefault();
    pttStart();
  });
  document.addEventListener('keyup', (e) => { if (e.code === 'Space' && holding) { e.preventDefault(); pttStop(); } });

  function setMode(m) {
    const s = settings();
    s.voiceMode = m;
    try { localStorage.setItem('justChessSettings', JSON.stringify(s)); } catch (e) {}
    if (typeof window.pushSettingsToServer === 'function') window.pushSettingsToServer();
    stop();
    if (on && m === 'auto') start();
    showResult('', m === 'ptt' ? t('vcHoldHint', 'Gapirish uchun tugmani bosib turing (yoki Space)') : t('vcReady', 'Tayyor'), 'info');
  }

  const clockText = (id) => { const el = document.getElementById(id); return el ? el.textContent.trim() : ''; };
  function lastMoveWords() {
    try {
      const h = game.history({ verbose: true });
      const last = h[h.length - 1];
      return last ? window.VoiceMoves.moveToWords(last, lang()) : '';
    } catch (e) { return ''; }
  }
  // Buyruq → bajarildi bo'lsa natija matni
  function runCommand(cmd, heard) {
    const inGame = typeof window.isGameInProgress === 'function' && window.isGameInProgress();
    const label = t('vcCmd' + cmd[0].toUpperCase() + cmd.slice(1), cmd);
    if (cmd === 'help') { showResult(heard, t('vcHelp', "Masalan: «e4», «ot f3», «e2 e4», «rokirovka». Buyruqlar: «taslim», «durrang», «qaytar», «aylantir», «vaqt», «takrorla»."), 'info'); return; }
    if (cmd === 'flip') { if (typeof window.flipBoard === 'function') window.flipBoard(); showResult(heard, '✓ ' + label, 'ok'); return; }
    if (cmd === 'time') {
      const text = t('vcTimeSpeak', 'Oq: {{w}}, qora: {{b}}', { w: clockText('whiteTimer'), b: clockText('blackTimer') });
      speak(text);
      showResult(heard, text, 'ok');
      return;
    }
    if (cmd === 'repeat') {
      const w = lastMoveWords();
      if (w) speak(w);
      showResult(heard, w || t('vcNoLast', "Hali yurish yo'q"), w ? 'ok' : 'warn');
      return;
    }
    if (!inGame) { showResult(heard, t('vcNoGame', "O'yin boshlanmagan"), 'warn'); return; }
    if (cmd === 'resign') { if (typeof resignGame === 'function') resignGame(); showResult(heard, '✓ ' + label, 'ok'); return; }
    if (cmd === 'draw') { if (typeof window.offerDraw === 'function') window.offerDraw(); showResult(heard, '✓ ' + label, 'ok'); return; }
    if (cmd === 'undo') {
      if (window.currentRoomId) { showResult(heard, t('vcNoUndo', "Onlayn o'yinda yurishni qaytarib bo'lmaydi"), 'warn'); return; }
      if (typeof window.undoMove === 'function') window.undoMove();
      showResult(heard, '✓ ' + label, 'ok');
    }
  }

  function doMove(m, heard) {
    pending = null;
    const mv = window.executeMove(m.from, m.to, m.promotion);
    if (mv && typeof board !== 'undefined' && board) board.position(game.fen());
    showResult(heard, mv ? '✓ ' + (mv.san || '') : t('vcNotUnderstood', 'Tushunmadim: «{{text}}»', { text: heard }), mv ? 'ok' : 'warn');
  }

  function handleSpeech(alts) {
    const V = window.VoiceMoves;
    const heard = String(alts[0] || '').trim();
    if (!heard || typeof game === 'undefined') return;
    // Buyruqlar (o'yin bo'lmasa ham ba'zilari ishlaydi)
    for (const a of alts) { const cmd = V.parseCommand(a); if (cmd) { runCommand(cmd, a.trim()); return; } }
    if (typeof window.isGameInProgress !== 'function' || !window.isGameInProgress()) {
      showResult(heard, t('vcNoGame', "O'yin boshlanmagan"), 'warn');
      return;
    }
    if (typeof viewPly !== 'undefined' && viewPly !== null && typeof window.reviewMove === 'function') window.reviewMove('end');
    if (window.myColor && game.turn() !== window.myColor) {
      showResult(heard, t('vcNotYourTurn', 'Navbat raqibda'), 'warn');
      return;
    }
    const legal = game.moves({ verbose: true });
    // «Qaysi biri?» savoliga javob (10 soniya ichida)
    if (pending && Date.now() < pending.until && pending.fen === game.fen()) {
      for (const a of alts) { const m = V.pickAmbiguous(a, pending.cands); if (m) { doMove(m, a.trim()); return; } }
    }
    let ambiguous = null;
    for (const a of alts) {
      const r = V.matchMove(V.parseSpoken(a), legal);
      if (r.move) { doMove(r.move, a.trim()); return; }
      if (r.ambiguous && !ambiguous) ambiguous = r.ambiguous;
    }
    if (ambiguous) {
      pending = { cands: ambiguous, until: Date.now() + 10000, fen: game.fen() };
      showResult(heard, t('vcWhich', 'Qaysi biri? {{list}} — qaysi katakdan ekanini ayting', { list: ambiguous.slice(0, 4).map((m) => m.san + ' (' + m.from + ')').join(', ') }), 'warn');
    } else {
      showResult(heard, t('vcNotUnderstoodShort', 'Tushunmadim — qaytadan ayting'), 'warn');
    }
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
    if (!Rec) { toast(t('vcUnsupported', 'Brauzeringiz ovozni tanimaydi (Chrome, Edge yoki Safari kerak)'), 'warning'); return; }
    on = !on;
    try { localStorage.setItem('justChessVoice', on ? '1' : '0'); } catch (e) {}
    if (on) {
      start();
      showResult('', mode() === 'ptt' ? t('vcHoldHint', 'Gapirish uchun tugmani bosib turing (yoki Space)') : '', 'info');
      toast(t('vcOn', '🎙️ Ovoz bilan yurish yoqildi — yurishni ayting, masalan «e4» yoki «ot f3»'), 'info', 4000);
    } else {
      stop();
      pending = null;
      if (window.speechSynthesis) try { window.speechSynthesis.cancel(); } catch (e) {}
      toast(t('vcOff', "Ovoz bilan yurish o'chirildi"), 'info', 1500);
    }
    refreshButton();
  };
  window.voiceMovesSetMode = setMode;

  // O'yin sahifasidan chiqilsa — tinglash to'xtaydi, qaytilsa davom etadi
  const origSwitch = window.switchView;
  if (typeof origSwitch === 'function') {
    window.switchView = function () {
      const r = origSwitch.apply(this, arguments);
      setTimeout(() => { if (onGamePage()) start(); else stop(); refreshButton(); }, 0);
      return r;
    };
  }
  document.addEventListener('DOMContentLoaded', refreshButton);
  refreshButton();
})();
