// ♟ Donalar bilan tanishing: har bir dona — rasmi (tanlangan to'plamda), nomi, qanday yurishi (kichik chizma), qiymati,
// maxsus qoidalari. Oyna #pieceGuide (pc-*, ch-overlay/ch-card uslubida). Kirish: o'yin panelidagi ❓ (#pgPiecesBtn),
// Sozlamalar → Taxta (data-piece-guide). Shatranj o'ynalayotgan bo'lsa — farzin, fil va piyoda Shatranj qoidasi bilan.
// Taxtadagi dona ustiga sichqoncha olib borilsa — nomi (title). Server ishtirok etmaydi.
(function () {
  const N = 7, C = 3; // chizma 7×7, dona markazda
  const PIECES = ['K', 'Q', 'R', 'B', 'N', 'P'];
  const NAME = {
    K: ['pcKing', 'Shoh'], Q: ['promoQueen', 'Farzin'], R: ['promoRook', 'Rux'],
    B: ['promoBishop', 'Fil'], N: ['promoKnight', 'Ot'], P: ['pcPawn', 'Piyoda']
  };
  const MOVE = {
    K: ['pcKMove', "Istalgan tomonga — faqat 1 katak yuradi."],
    Q: ['pcQMove', "To'g'ri chiziq va diagonal bo'ylab istalgan masofaga yuradi — rux va filning kuchi birga."],
    R: ['pcRMove', "To'g'ri chiziq bo'ylab — oldinga, orqaga, yon tomonga — istalgan masofaga yuradi."],
    B: ['pcBMove', "Faqat diagonal bo'ylab istalgan masofaga yuradi va doim bir xil rangdagi kataklarda qoladi."],
    N: ['pcNMove', "«L» harfi shaklida yuradi: 2 katak bir tomonga, so'ng 1 katak yonga. Boshqa donalar ustidan sakray oladigan yagona dona."],
    P: ['pcPMove', "Faqat oldinga 1 katak yuradi (birinchi yurishda 2 katak ham mumkin). Raqib donasini esa oldinga diagonal bo'ylab 1 katak yurib oladi."]
  };
  const EXTRA = {
    K: ['pcKExtra', "Eng muhim dona: shohga mat qo'yilsa, o'yin tugaydi. Hujum ostidagi katakka yura olmaydi. Rokirovka — shoh rux tomon 2 katak yuradi, rux esa uning ustidan sakrab yoniga o'tadi."],
    P: ['pcPExtra', "Taxtaning oxirgi qatoriga yetsa, farzin, rux, fil yoki otga aylanadi (ko'pincha farzin tanlanadi). Orqaga yurmaydi."]
  };
  const VALUE = { Q: 9, R: 5, B: 3, N: 3 };
  const SHATRANJ = { Q: 'diag1', B: 'jump2', P: 'one' }; // Shatranj'da boshqacha yuradigan donalar

  const esc = (v) => {
    const div = document.createElement('div');
    div.textContent = (v === null || v === undefined) ? '' : String(v);
    return div.innerHTML.replace(/"/g, '&quot;');
  };
  const t = (pair, vars) => (typeof tx === 'function' ? tx(pair[0], pair[1], vars) : pair[1]);
  const isShatranj = () => window.currentVariant === 'shatranj';

  // Chizma: markazdagi dona yura oladigan kataklar (move) va oladigan kataklar (capture)
  function moves(piece, variant) {
    const out = { move: [], capture: [] };
    const add = (list, x, y) => { if (x >= 0 && y >= 0 && x < N && y < N) list.push([x, y]); };
    const ray = (dirs) => dirs.forEach(([dx, dy]) => { for (let k = 1; k < N; k++) add(out.move, C + dx * k, C + dy * k); });
    const step = (dirs, k = 1) => dirs.forEach(([dx, dy]) => add(out.move, C + dx * k, C + dy * k));
    const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]], DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    const rule = variant === 'shatranj' ? SHATRANJ[piece] : null;
    if (piece === 'K') step(ORTHO.concat(DIAG));
    else if (piece === 'Q') rule ? step(DIAG) : ray(ORTHO.concat(DIAG));
    else if (piece === 'R') ray(ORTHO);
    else if (piece === 'B') rule ? step(DIAG, 2) : ray(DIAG);
    else if (piece === 'N') [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].forEach(([dx, dy]) => add(out.move, C + dx, C + dy));
    else if (piece === 'P') {
      // Piyoda pastdan (boshlang'ich qatoridan) chiqadi: oldinga 1 (standartda birinchi yurishda 2), olish — diagonal
      add(out.move, C, C - 1);
      if (!rule) add(out.move, C, C - 2);
      add(out.capture, C - 1, C - 1);
      add(out.capture, C + 1, C - 1);
    }
    return out;
  }
  // Piyoda chizmada pastroqda turadi (oldinga yurishi ko'rinsin)
  const originOf = (piece) => (piece === 'P' ? [C, C + 1] : [C, C]);

  function diagram(piece, variant, set) {
    const m = moves(piece, variant);
    const [ox, oy] = originOf(piece);
    const shift = ([x, y]) => [x + ox - C, y + oy - C];
    const key = (xy) => xy.join(',');
    const mv = new Set(m.move.map(shift).map(key)), cp = new Set(m.capture.map(shift).map(key));
    let cells = '';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const k = x + ',' + y;
      const dark = (x + y) % 2 === 1;
      let inner = '';
      if (x === ox && y === oy) inner = `<img src="${esc(window.pieceUrl ? window.pieceUrl('w' + piece, set) : '')}" alt="">`;
      else if (cp.has(k)) inner = `<img class="pc-enemy" src="${esc(window.pieceUrl ? window.pieceUrl('bP', set) : '')}" alt=""><i class="pc-cap"></i>`;
      else if (mv.has(k)) inner = '<i class="pc-dot"></i>';
      cells += `<span class="pc-sq ${dark ? 'd' : 'l'}${mv.has(k) ? ' mv' : ''}${cp.has(k) ? ' cp' : ''}">${inner}</span>`;
    }
    return `<div class="pc-board" aria-hidden="true">${cells}</div>`;
  }

  function valueText(piece) {
    if (piece === 'K') return tx('pcValueK', "Qiymati: bebaho — uni yo'qotib bo'lmaydi");
    if (piece === 'P') return tx('pcValueP', "Qiymati: 1 — boshqa donalar shu bilan o'lchanadi");
    return tx('pcValue', 'Qiymati: taxminan {{n}} piyoda', { n: VALUE[piece] });
  }

  function cardHtml(piece, variant, set) {
    const extra = EXTRA[piece] && !(variant === 'shatranj' && piece === 'K') ? `<p class="pc-extra">${esc(t(EXTRA[piece]))}</p>` : '';
    return `<article class="pc-card" data-pc="${piece}">
      <div class="pc-top">
        <span class="pc-imgs"><img src="${esc(window.pieceUrl ? window.pieceUrl('w' + piece, set) : '')}" alt=""><img src="${esc(window.pieceUrl ? window.pieceUrl('b' + piece, set) : '')}" alt=""></span>
        <span class="pc-name"><b>${esc(t(NAME[piece]))}</b><small>${esc(valueText(piece))}</small></span>
      </div>
      ${diagram(piece, variant, set)}
      ${variant === 'shatranj' && SHATRANJ[piece] ? '' : `<p class="pc-move">${esc(t(MOVE[piece]))}</p>`}
      ${extra}
    </article>`;
  }

  window.openPieceGuide = function () {
    const variant = isShatranj() ? 'shatranj' : 'standard';
    const set = window.currentPieceSet;
    let el = document.getElementById('pieceGuide');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pieceGuide';
      el.className = 'ch-overlay pc-overlay';
      document.body.appendChild(el);
    }
    el.innerHTML = `<div class="ch-card pc-guide" role="dialog" aria-modal="true" aria-labelledby="pcGuideTitle">
      <button type="button" class="ch-x" data-pc-close aria-label="✕">✕</button>
      <h3 id="pcGuideTitle" class="pc-title">♟ ${esc(tx('pcGuideTitle', 'Donalar bilan tanishing'))}</h3>
      <p class="pc-sub">${esc(tx('pcGuideSub', "Har bir dona qanday ko'rinadi va qanday yuradi"))}</p>
      ${variant === 'shatranj' ? `<p class="pc-note">🏺 ${esc(tx('shtRules', "Farzin — 1 katak diagonal. Fil — aynan 2 katak diagonal sakraydi. Piyoda — faqat 1 katak, faqat farzinga aylanadi. Rokirovka yo'q."))}</p>` : ''}
      <div class="pc-legend"><span><i class="pc-dot"></i>${esc(tx('pcLegendMove', 'Yura oladigan katak'))}</span><span><i class="pc-cap"></i>${esc(tx('pcLegendCapture', 'Raqib donasini olish'))}</span></div>
      <div class="pc-grid">${PIECES.map((p) => cardHtml(p, variant, set)).join('')}</div>
      <p class="pc-tip">💡 ${esc(tx('pcTip', "Maslahat: o'yin paytida dona ustiga sichqonchani olib borsangiz, uning nomi chiqadi."))}</p>
    </div>`;
    const close = () => { el.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    el.onclick = (e) => { if (e.target === el || e.target.closest('[data-pc-close]')) close(); };
    const x = el.querySelector('[data-pc-close]');
    if (x) x.focus();
  };

  // Taxtadagi dona ustiga sichqoncha — nomi va rangi: "Ot (Oq)"
  document.addEventListener('mouseover', (e) => {
    const img = e.target && e.target.closest ? e.target.closest('img[data-piece]') : null;
    if (!img) return;
    const code = img.getAttribute('data-piece') || '';
    if (!/^[wb][KQRBNP]$/.test(code)) return;
    const title = t(NAME[code[1]]) + ' (' + (code[0] === 'w' ? tx('prWhite', 'Oq') : tx('prBlack', 'Qora')) + ')';
    if (img.title !== title) img.title = title;
  });

  window.PieceGuide = { moves, PIECES };
})();
