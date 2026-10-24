// 🏺 Shatranj — Ipak yo'li davrining shaxmati (UMD: serverda require, brauzerda window.Shatranj).
// Mustaqil qoidalar mexanizmi, API chess.js 0.10.3 bilan bir xil: move, moves, undo, history, fen, turn, get, board,
// in_check, in_checkmate, in_stalemate, in_draw, in_threefold_repetition, insufficient_material, game_over, reset
// + result() → { winner: 'w'|'b'|null, reason } (Shatranj'da pat va "yalang'och shoh" — g'alaba).
// Qoidalar (Fairy-Stockfish "shatranj" bilan bir xil):
//   shoh — 1 katak; farzin (q) — 1 katak diagonal; fil/alfil (b) — aynan 2 katak diagonal sakraydi; ot va rux — odatdagidek;
//   piyoda — faqat 1 katak (2 katak va en passant yo'q), faqat farzinga aylanadi; rokirovka yo'q.
//   Mat — g'alaba. Pat — pat qilgan tomon yutadi. Yalang'och shoh: raqibning shohdan boshqa hamma donasini olgan tomon yutadi,
//   agar raqib darhol javob yurishida oxirgi donani olmasa (olsa — ikkala shoh yolg'iz, durrang). Takrorlanish va 50 yurish — durrang.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Shatranj = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const FILES = 'abcdefgh';
  const START = 'rnbkqbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1';
  const opp = (c) => (c === 'w' ? 'b' : 'w');
  const sqName = (i) => FILES[i & 7] + ((i >> 3) + 1);
  const sqIndex = (s) => (typeof s === 'string' && /^[a-h][1-8]$/.test(s) ? (Number(s[1]) - 1) * 8 + FILES.indexOf(s[0]) : -1);
  const KING = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const FERZ = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const ALFIL = [[2, 2], [2, -2], [-2, 2], [-2, -2]];
  const KNIGHT = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  const ROOK = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function Shatranj(fen) {
    this.startFen = fen || START;
    this.reset();
  }
  Shatranj.START_FEN = START;
  const P = Shatranj.prototype;
  P.variant = 'shatranj';

  P.reset = function () { this.load(this.startFen); this.hist = []; this.keys = [this.key()]; };
  P.load = function (fen) {
    const parts = String(fen).trim().split(/\s+/);
    this.sq = new Array(64).fill(null);
    const rows = parts[0].split('/');
    for (let r = 0; r < 8; r++) {
      let f = 0;
      for (const ch of rows[r] || '') {
        if (/\d/.test(ch)) f += Number(ch);
        else { this.sq[(7 - r) * 8 + f] = { type: ch.toLowerCase(), color: ch === ch.toUpperCase() ? 'w' : 'b' }; f++; }
      }
    }
    this._turn = parts[1] === 'b' ? 'b' : 'w';
    this.half = Number(parts[4]) || 0;
    this.full = Number(parts[5]) || 1;
    return true;
  };
  P.placement = function () {
    let out = '';
    for (let r = 7; r >= 0; r--) {
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = this.sq[r * 8 + f];
        if (!p) { empty++; continue; }
        if (empty) { out += empty; empty = 0; }
        out += p.color === 'w' ? p.type.toUpperCase() : p.type;
      }
      if (empty) out += empty;
      if (r) out += '/';
    }
    return out;
  };
  P.fen = function () { return `${this.placement()} ${this._turn} - - ${this.half} ${this.full}`; };
  P.key = function () { return this.placement() + ' ' + this._turn; };
  P.turn = function () { return this._turn; };
  P.get = function (s) { const i = sqIndex(s); return i < 0 || !this.sq[i] ? null : { ...this.sq[i] }; };
  P.board = function () {
    const out = [];
    for (let r = 7; r >= 0; r--) { const row = []; for (let f = 0; f < 8; f++) { const p = this.sq[r * 8 + f]; row.push(p ? { ...p } : null); } out.push(row); }
    return out;
  };

  // Katak `color` tomonidan hujum ostidami
  P.attacked = function (i, color) {
    const r = i >> 3, f = i & 7;
    const at = (dr, df) => { const rr = r + dr, ff = f + df; return rr < 0 || rr > 7 || ff < 0 || ff > 7 ? null : this.sq[rr * 8 + ff]; };
    const is = (p, type) => p && p.color === color && p.type === type;
    for (const [dr, df] of KING) if (is(at(dr, df), 'k')) return true;
    for (const [dr, df] of FERZ) if (is(at(dr, df), 'q')) return true;
    for (const [dr, df] of ALFIL) if (is(at(dr, df), 'b')) return true;
    for (const [dr, df] of KNIGHT) if (is(at(dr, df), 'n')) return true;
    const pr = color === 'w' ? -1 : 1; // hujum qilayotgan piyoda shu katakdan bir qator orqada
    if (is(at(pr, 1), 'p') || is(at(pr, -1), 'p')) return true;
    for (const [dr, df] of ROOK) {
      for (let k = 1; k < 8; k++) {
        const p = at(dr * k, df * k);
        if (p === null && (r + dr * k < 0 || r + dr * k > 7 || f + df * k < 0 || f + df * k > 7)) break;
        if (p) { if (is(p, 'r')) return true; break; }
      }
    }
    return false;
  };
  P.kingIndex = function (color) { return this.sq.findIndex((p) => p && p.type === 'k' && p.color === color); };
  P.in_check = function () { const k = this.kingIndex(this._turn); return k >= 0 && this.attacked(k, opp(this._turn)); };

  P._pseudo = function (color) {
    const out = [];
    const add = (from, to) => {
      const piece = this.sq[from], target = this.sq[to];
      if (target && target.color === color) return;
      const m = { from, to, piece: piece.type, captured: target ? target.type : undefined };
      if (piece.type === 'p' && ((color === 'w' && to >> 3 === 7) || (color === 'b' && to >> 3 === 0))) m.promotion = 'q';
      out.push(m);
    };
    for (let i = 0; i < 64; i++) {
      const p = this.sq[i];
      if (!p || p.color !== color) continue;
      const r = i >> 3, f = i & 7;
      const step = (list) => { for (const [dr, df] of list) { const rr = r + dr, ff = f + df; if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) add(i, rr * 8 + ff); } };
      if (p.type === 'k') step(KING);
      else if (p.type === 'q') step(FERZ);
      else if (p.type === 'b') step(ALFIL);
      else if (p.type === 'n') step(KNIGHT);
      else if (p.type === 'r') {
        for (const [dr, df] of ROOK) for (let k = 1; k < 8; k++) {
          const rr = r + dr * k, ff = f + df * k;
          if (rr < 0 || rr > 7 || ff < 0 || ff > 7) break;
          add(i, rr * 8 + ff);
          if (this.sq[rr * 8 + ff]) break;
        }
      } else if (p.type === 'p') {
        const dr = color === 'w' ? 1 : -1, rr = r + dr;
        if (rr < 0 || rr > 7) continue;
        if (!this.sq[rr * 8 + f]) add(i, rr * 8 + f);
        for (const df of [-1, 1]) { const ff = f + df; if (ff >= 0 && ff < 8 && this.sq[rr * 8 + ff] && this.sq[rr * 8 + ff].color !== color) add(i, rr * 8 + ff); }
      }
    }
    return out;
  };
  P._make = function (m) {
    const undo = { sq: this.sq.slice(), turn: this._turn, half: this.half, full: this.full };
    const piece = this.sq[m.from];
    this.sq[m.to] = m.promotion ? { type: m.promotion, color: piece.color } : piece;
    this.sq[m.from] = null;
    this.half = piece.type === 'p' || m.captured ? 0 : this.half + 1;
    if (this._turn === 'b') this.full++;
    this._turn = opp(this._turn);
    return undo;
  };
  P._unmake = function (u) { this.sq = u.sq; this._turn = u.turn; this.half = u.half; this.full = u.full; };
  P._legal = function () {
    const color = this._turn;
    return this._pseudo(color).filter((m) => {
      const u = this._make(m);
      const k = this.kingIndex(color);
      const ok = k >= 0 && !this.attacked(k, opp(color));
      this._unmake(u);
      return ok;
    });
  };
  P._san = function (m, legal) {
    let s;
    if (m.piece === 'p') s = (m.captured ? FILES[m.from & 7] + 'x' : '') + sqName(m.to) + (m.promotion ? '=Q' : '');
    else {
      const rivals = legal.filter((x) => x.piece === m.piece && x.to === m.to && x.from !== m.from);
      let dis = '';
      if (rivals.length) {
        if (!rivals.some((x) => (x.from & 7) === (m.from & 7))) dis = FILES[m.from & 7];
        else if (!rivals.some((x) => x.from >> 3 === m.from >> 3)) dis = String((m.from >> 3) + 1);
        else dis = sqName(m.from);
      }
      s = m.piece.toUpperCase() + dis + (m.captured ? 'x' : '') + sqName(m.to);
    }
    const u = this._make(m);
    if (this.in_check()) s += this._legal().length ? '+' : '#';
    this._unmake(u);
    return s;
  };
  const record = (m, color, san) => {
    const flags = (m.captured ? 'c' : 'n') + (m.promotion ? 'p' : '');
    const r = { color, from: sqName(m.from), to: sqName(m.to), piece: m.piece, flags: flags === 'np' ? 'p' : flags, san };
    if (m.captured) r.captured = m.captured;
    if (m.promotion) r.promotion = m.promotion;
    return r;
  };

  P.moves = function (opts) {
    opts = opts || {};
    const legal = this._legal();
    const from = opts.square ? sqIndex(opts.square) : -1;
    const list = legal.filter((m) => from < 0 || m.from === from).map((m) => record(m, this._turn, this._san(m, legal)));
    return opts.verbose ? list : list.map((m) => m.san);
  };
  P.move = function (input) {
    if (!input) return null;
    const legal = this._legal();
    let m = null;
    if (typeof input === 'string') {
      const clean = (s) => String(s).replace(/[+#?!]+$/, '').replace(/=?[QRBN]$/, (x) => (x.length ? '=Q' : ''));
      const want = clean(input);
      m = legal.find((x) => clean(this._san(x, legal)) === want) || null;
    } else {
      const f = sqIndex(input.from), t = sqIndex(input.to);
      m = legal.find((x) => x.from === f && x.to === t) || null; // aylanish doim farzinga
    }
    if (!m) return null;
    const color = this._turn;
    const san = this._san(m, legal);
    const u = this._make(m);
    const rec = record(m, color, san);
    this.hist.push({ rec, u });
    this.keys.push(this.key());
    return rec;
  };
  P.undo = function () {
    const h = this.hist.pop();
    if (!h) return null;
    this._unmake(h.u);
    this.keys.pop();
    return h.rec;
  };
  P.history = function (opts) { const list = this.hist.map((h) => ({ ...h.rec })); return opts && opts.verbose ? list : list.map((m) => m.san); };

  const isBare = (sq, color) => !sq.some((p) => p && p.color === color && p.type !== 'k');
  // Yalang'och shoh: yutqazgan tomon yoki null. Navbatdagi tomon yalang'och bo'lsa — javoban raqibni ham yalang'och qila olsa, o'yin davom etadi
  P._bareLoser = function () {
    const s = this._turn, o = opp(s);
    const sBare = isBare(this.sq, s), oBare = isBare(this.sq, o);
    if (sBare === oBare) return null;
    if (oBare) return o; // yurgan tomon yalang'och qolgan (javob imkoniyatidan foydalanmadi)
    const backs = this._legal().some((m) => { const u = this._make(m); const ok = isBare(this.sq, o); this._unmake(u); return ok; });
    return backs ? null : s;
  };
  P.in_checkmate = function () { return this.in_check() && this._legal().length === 0; };
  P.in_stalemate = function () { return !this.in_check() && this._legal().length === 0; };
  P.insufficient_material = function () { return isBare(this.sq, 'w') && isBare(this.sq, 'b'); };
  P.in_threefold_repetition = function () { const k = this.keys[this.keys.length - 1]; return this.keys.filter((x) => x === k).length >= 3; };
  P.in_draw = function () { return this.half >= 100 || this.insufficient_material() || this.in_threefold_repetition(); };
  P.result = function () {
    const s = this._turn;
    if (this._legal().length === 0) return { winner: opp(s), reason: this.in_check() ? 'checkmate' : 'stalemate' };
    const bare = this._bareLoser();
    if (bare) return { winner: opp(bare), reason: 'bare' };
    if (this.insufficient_material()) return { winner: null, reason: 'insufficient' };
    if (this.in_threefold_repetition()) return { winner: null, reason: 'threefold' };
    if (this.half >= 100) return { winner: null, reason: 'fifty' };
    return null;
  };
  P.game_over = function () { return !!this.result(); };

  return Shatranj;
});
