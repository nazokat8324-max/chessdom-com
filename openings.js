// Debyut nomlari: assets/openings.json (lichess-org/chess-openings, CC0 — jamoat mulki).
// Kalit — FEN ning birinchi 4 qismi (joylashuv, navbat, rokirovka, en passant), qiymat — [ECO, nom].
// Faqat standart shaxmat uchun; birinchi 40 yarim yurish ichidagi oxirgi tanish pozitsiya nomi olinadi.
(function () {
  let db = null;
  let loading = null;
  const keyOf = (fen) => fen.split(' ').slice(0, 4).join(' ');

  window.loadOpenings = function () {
    if (db) return Promise.resolve(db);
    if (!loading) {
      loading = fetch('assets/openings.json')
        .then(r => r.json())
        .then(d => { db = d; return d; })
        .catch(() => { loading = null; return null; });
    }
    return loading;
  };

  // moves: SAN ro'yxati yoki {from, to, promotion} obyektlari. Baza hali yuklanmagan bo'lsa — null
  window.openingFor = function (moves) {
    if (!db || !moves || !moves.length || typeof Chess === 'undefined') return null;
    const c = new Chess();
    let found = null;
    for (let i = 0; i < moves.length && i < 40; i++) {
      const m = moves[i];
      if (!c.move(typeof m === 'string' ? m : { from: m.from, to: m.to, promotion: m.promotion || 'q' })) break;
      const hit = db[keyOf(c.fen())];
      if (hit) found = { eco: hit[0], name: hit[1], ply: i + 1 };
    }
    return found;
  };

  // Elementga debyut nomini yozish (baza kerak bo'lsa yuklanadi, keyin qayta chiziladi)
  window.renderOpeningInto = function (el, moves, variant) {
    if (!el) return;
    if (variant === 'chess960') {
      el.hidden = false;
      el.textContent = '🎲 Chess960';
      el.title = '';
      return;
    }
    if (!moves || !moves.length) { el.hidden = true; return; }
    if (!db) {
      el.hidden = true;
      window.loadOpenings().then(d => { if (d) window.renderOpeningInto(el, moves, variant); });
      return;
    }
    const o = window.openingFor(moves);
    el.hidden = !o;
    if (o) {
      el.textContent = '📖 ' + o.eco + ' · ' + o.name;
      el.title = o.name;
    }
  };
})();
