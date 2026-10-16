// Chess960 (Fischer tasodifiy shaxmati): chess.js 0.10.3 ustidagi qatlam — serverda ham, brauzerda ham ishlaydi.
// chess.js rokirovkani faqat oddiy shaxmatdagidek biladi, shuning uchun unga rokirovkasiz ('-') pozitsiya beriladi,
// rokirovka huquqlari (rux vertikallari) va rokirovkaning o'zi shu yerda hisoblanadi.
// Rokirovka yurishi: shoh o'z ruxi turgan katakka (lichess kabi), yoki g/c vertikaliga (agar bu oddiy yurish bo'lmasa).
// API chess.js bilan bir xil: move, moves, undo, history, fen, turn, get, board, in_check, in_checkmate,
// in_stalemate, in_draw, in_threefold_repetition, insufficient_material, game_over, reset.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('chess.js').Chess);
  else root.Chess960 = factory(root.Chess);
})(typeof self !== 'undefined' ? self : this, function (Chess) {
  const FILES = 'abcdefgh';

  // Tasodifiy boshlang'ich pozitsiya: fillar har xil rangda, shoh ikki rux orasida
  function randomStartFen(rand) {
    const r = rand || Math.random;
    const rank = new Array(8).fill(null);
    const pick = (list) => list[Math.floor(r() * list.length)];
    rank[pick([1, 3, 5, 7])] = 'b';
    rank[pick([0, 2, 4, 6])] = 'b';
    const free = () => rank.map((p, i) => (p ? null : i)).filter(i => i !== null);
    rank[pick(free())] = 'q';
    rank[pick(free())] = 'n';
    rank[pick(free())] = 'n';
    const [a, b, c] = free();
    rank[a] = 'r'; rank[b] = 'k'; rank[c] = 'r';
    const black = rank.join('');
    const rights = (FILES[c] + FILES[a]).toUpperCase() + FILES[c] + FILES[a];
    return `${black}/pppppppp/8/8/8/8/PPPPPPPP/${black.toUpperCase()} w ${rights} - 0 1`;
  }

  const opp = (c) => (c === 'w' ? 'b' : 'w');
  const rankOf = (c) => (c === 'w' ? '1' : '8');

  function Chess960(startFen) {
    this.startFen = startFen || randomStartFen();
    this.reset();
  }
  Chess960.randomStartFen = randomStartFen;
  const P = Chess960.prototype;
  P.variant = 'chess960';

  P.reset = function () {
    const parts = this.startFen.split(' ');
    this.c = new Chess([parts[0], parts[1] || 'w', '-', parts[3] || '-', parts[4] || '0', parts[5] || '1'].join(' '));
    this.rights = parseRights(parts[0], parts[2] || '-');
    this.hist = [];
    this.keys = [this.key()];
  };

  // "HAha" (Shredder) yoki "KQkq" (X-FEN) → { w: { k: vertikal, q: vertikal }, b: {...} }
  function parseRights(placement, field) {
    const rows = placement.split('/');
    const expand = (row) => row.replace(/\d/g, d => '.'.repeat(Number(d)));
    const back = { w: expand(rows[7]), b: expand(rows[0]) };
    const rights = { w: { k: null, q: null }, b: { k: null, q: null } };
    if (!field || field === '-') return rights;
    for (const ch of field) {
      const color = ch === ch.toUpperCase() ? 'w' : 'b';
      const row = back[color];
      const rook = color === 'w' ? 'R' : 'r';
      const kf = row.indexOf(color === 'w' ? 'K' : 'k');
      if (kf < 0) continue;
      let file;
      const lc = ch.toLowerCase();
      if (lc === 'k') file = row.lastIndexOf(rook);
      else if (lc === 'q') file = row.indexOf(rook);
      else file = FILES.indexOf(lc);
      if (file < 0 || row[file] !== rook) continue;
      rights[color][file > kf ? 'k' : 'q'] = file;
    }
    return rights;
  }

  P.rightsString = function () {
    let s = '';
    for (const color of ['w', 'b']) for (const side of ['k', 'q']) {
      const f = this.rights[color][side];
      if (f !== null) s += color === 'w' ? FILES[f].toUpperCase() : FILES[f];
    }
    return s || '-';
  };

  P.key = function () {
    const p = this.c.fen().split(' ');
    return [p[0], p[1], this.rightsString(), p[3]].join(' ');
  };

  P.fen = function () {
    const p = this.c.fen().split(' ');
    p[2] = this.rightsString();
    return p.join(' ');
  };

  P.turn = function () { return this.c.turn(); };
  P.get = function (sq) { return this.c.get(sq); };
  P.board = function () { return this.c.board(); };
  P.in_check = function () { return this.c.in_check(); };
  P.insufficient_material = function () { return this.c.insufficient_material(); };

  P.kingSquare = function (color) {
    for (let r = 1; r <= 8; r++) for (const f of FILES) {
      const p = this.c.get(f + r);
      if (p && p.type === 'k' && p.color === color) return f + r;
    }
    return null;
  };

  // Shu katak (shoh u yerda bo'lsa) raqib tomonidan hujumdami: shoh va rokirovka ruxi olib tashlanadi
  P._attacked = function (color, square, removeSquares) {
    const parts = this.c.fen().split(' ');
    const tmp = new Chess([parts[0], color, '-', '-', '0', '1'].join(' '));
    removeSquares.forEach(sq => tmp.remove(sq));
    tmp.put({ type: 'k', color }, square);
    return tmp.in_check();
  };

  // Hozirgi tomonning qonuniy rokirovkalari
  P._castles = function () {
    const color = this.c.turn();
    if (this.c.in_check()) return [];
    const K = this.kingSquare(color);
    if (!K || K[1] !== rankOf(color)) return [];
    const kf = FILES.indexOf(K[0]);
    const rank = rankOf(color);
    const out = [];
    for (const side of ['k', 'q']) {
      const rf = this.rights[color][side];
      if (rf === null) continue;
      const rookSq = FILES[rf] + rank;
      const rook = this.c.get(rookSq);
      if (!rook || rook.type !== 'r' || rook.color !== color) continue;
      const kt = side === 'k' ? 6 : 2, rt = side === 'k' ? 5 : 3;
      const lo = Math.min(kf, kt, rf, rt), hi = Math.max(kf, kt, rf, rt);
      let ok = true;
      for (let f = lo; f <= hi && ok; f++) {
        if (f === kf || f === rf) continue;
        if (this.c.get(FILES[f] + rank)) ok = false;
      }
      if (!ok) continue;
      // Shoh o'tadigan va to'xtaydigan kataklar hujum ostida bo'lmasligi kerak
      const step = kt >= kf ? 1 : -1;
      for (let f = kf + step; ok && (step > 0 ? f <= kt : f >= kt); f += step) {
        if (this._attacked(color, FILES[f] + rank, [K, rookSq])) ok = false;
      }
      if (!ok) continue;
      // Yakuniy pozitsiyada shoh shaxda qolmasin
      if (this._finalInCheck(color, K, rookSq, FILES[kt] + rank, FILES[rt] + rank)) continue;
      out.push({ color, from: K, to: rookSq, flags: side, piece: 'k', san: side === 'k' ? 'O-O' : 'O-O-O', kingTo: FILES[kt] + rank, rookTo: FILES[rt] + rank });
    }
    return out;
  };

  P._finalInCheck = function (color, K, rookSq, kingTo, rookTo) {
    const parts = this.c.fen().split(' ');
    const tmp = new Chess([parts[0], color, '-', '-', '0', '1'].join(' '));
    tmp.remove(K); tmp.remove(rookSq);
    tmp.put({ type: 'k', color }, kingTo);
    tmp.put({ type: 'r', color }, rookTo);
    return tmp.in_check();
  };

  P._applyCastle = function (cm) {
    const parts = this.c.fen().split(' ');
    const tmp = new Chess([parts[0], cm.color, '-', '-', '0', '1'].join(' '));
    tmp.remove(cm.from); tmp.remove(cm.to);
    tmp.put({ type: 'k', color: cm.color }, cm.kingTo);
    tmp.put({ type: 'r', color: cm.color }, cm.rookTo);
    const placement = tmp.fen().split(' ')[0];
    const full = cm.color === 'b' ? Number(parts[5]) + 1 : Number(parts[5]);
    this.c.load([placement, opp(cm.color), '-', '-', String(Number(parts[4]) + 1), String(full)].join(' '));
    this.rights[cm.color] = { k: null, q: null };
  };

  P.moves = function (opts) {
    opts = opts || {};
    const base = this.c.moves(opts.square ? { square: opts.square, verbose: true } : { verbose: true });
    let castles = [];
    if (!opts.square || opts.square === this.kingSquare(this.c.turn())) castles = this._castles();
    const all = base.concat(castles.map(m => ({ color: m.color, from: m.from, to: m.to, flags: m.flags, piece: 'k', san: m.san })));
    return opts.verbose ? all : all.map(m => m.san);
  };

  P.move = function (input) {
    if (!input) return null;
    if (typeof input === 'string') {
      const clean = (s) => String(s).replace(/[+#?!]+$/, '').replace(/0/g, 'O');
      const want = clean(input);
      const found = this.moves({ verbose: true }).find(m => clean(m.san) === want);
      if (!found) return null;
      input = { from: found.from, to: found.to, promotion: found.promotion };
    }
    const color = this.c.turn();
    const piece = this.c.get(input.from);
    if (!piece || piece.color !== color) return null;
    const before = { fen: this.c.fen(), rights: JSON.parse(JSON.stringify(this.rights)) };

    if (piece.type === 'k') {
      const castles = this._castles();
      let cm = castles.find(m => m.to === input.to);
      if (!cm) {
        const normal = this.c.moves({ square: input.from, verbose: true }).some(m => m.to === input.to);
        if (!normal) cm = castles.find(m => m.kingTo === input.to);
      }
      if (cm) {
        this._applyCastle(cm);
        const san = cm.san + (this.c.in_checkmate() ? '#' : (this.c.in_check() ? '+' : ''));
        const rec = { color, from: cm.from, to: cm.to, flags: cm.flags, piece: 'k', san };
        this.hist.push({ ...rec, _before: before });
        this.keys.push(this.key());
        return rec;
      }
    }

    const target = this.c.get(input.to);
    const res = this.c.move({ from: input.from, to: input.to, promotion: input.promotion || 'q' });
    if (!res) return null;
    const rank = rankOf(color);
    if (piece.type === 'k') this.rights[color] = { k: null, q: null };
    if (piece.type === 'r' && input.from[1] === rank) {
      const f = FILES.indexOf(input.from[0]);
      for (const side of ['k', 'q']) if (this.rights[color][side] === f) this.rights[color][side] = null;
    }
    if (target && target.type === 'r' && input.to[1] === rankOf(opp(color))) {
      const f = FILES.indexOf(input.to[0]);
      for (const side of ['k', 'q']) if (this.rights[opp(color)][side] === f) this.rights[opp(color)][side] = null;
    }
    this.hist.push({ ...res, _before: before });
    this.keys.push(this.key());
    return res;
  };

  P.undo = function () {
    const h = this.hist.pop();
    if (!h) return null;
    this.c.load(h._before.fen);
    this.rights = h._before.rights;
    this.keys.pop();
    const { _before, ...rec } = h;
    return rec;
  };

  P.history = function (opts) {
    const list = this.hist.map(({ _before, ...rec }) => rec);
    return opts && opts.verbose ? list : list.map(m => m.san);
  };

  P.in_checkmate = function () { return this.c.in_checkmate(); };
  P.in_stalemate = function () { return !this.c.in_check() && this.c.moves().length === 0 && this._castles().length === 0; };
  P.in_threefold_repetition = function () {
    const k = this.keys[this.keys.length - 1];
    return this.keys.filter(x => x === k).length >= 3;
  };
  P.in_draw = function () {
    return Number(this.c.fen().split(' ')[4]) >= 100 || this.in_stalemate() || this.insufficient_material() || this.in_threefold_repetition();
  };
  P.game_over = function () { return this.in_checkmate() || this.in_draw(); };

  return Chess960;
});
