// 📖 O'yin hikoyasi: tahlil (analysis.js — baholar, ?!/?/?? va eng yaxshi yurish) asosida o'yinni qisqa hikoya qilib beradi.
// UMD: build(input, t) — sof funksiya (testlarda require), brauzerda window.GameStory + window.openGameStory (oyna #storyModal, st-*).
// Kirish nuqtalari: o'yin panelidagi tahlil qutisi (window.openPanelStory) va qayta ko'rish oynasi (replay.js, data-story).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GameStory = api;
})(typeof self !== 'undefined' ? self : this, function () {
  // Oq uchun g'alaba ehtimoli (analysis.js bilan bir xil formula)
  const toCp = (e) => (!e ? 0 : e.mate !== null && e.mate !== undefined ? (e.mate > 0 ? 10000 : -10000) : (e.cp || 0));
  const winPct = (e) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * Math.max(-2000, Math.min(2000, toCp(e))))) - 1);
  const leader = (p) => (p > 60 ? 'w' : p < 40 ? 'b' : null);
  const moveLabel = (i, m) => `${Math.floor(i / 2) + 1}${m.color === 'w' ? '.' : '...'} ${m.san}`;

  // input: { moves [{san, color, piece, captured, promotion}], analysis {evals, moves[{cls, loss, bestSan}], accuracy},
  //         white, black, result '1-0'|'0-1'|'1/2-1/2'|'*', reason, variant, opening {eco, name}|null }
  // t(key, fallback, vars) — tarjima (brauzerda tx)
  function build(input, t) {
    const moves = input.moves || [], an = input.analysis || { evals: [], moves: [], accuracy: { w: 0, b: 0 } };
    const N = moves.length;
    const W = input.white || t('whiteText', 'Oq'), B = input.black || t('blackText', 'Qora');
    const name = (c) => (c === 'w' ? W : B);
    const sideName = (c) => (c === 'w' ? t('stWhiteSide', 'oq') : t('stBlackSide', 'qora'));
    const wp = an.evals.map(winPct);
    const winner = input.result === '1-0' ? 'w' : input.result === '0-1' ? 'b' : null;
    // Sabab berilmagan bo'lsa (bir qurilmadagi o'yin) — oxirgi yurishdagi # dan mat
    const reason = input.reason || (winner && N && /#$/.test(moves[N - 1].san || '') ? 'checkmate' : null);
    // Bir qurilmada: ismlar o'rnida 'Oq'/'Qora' — '(oq)' takrorlanmasin
    const sidesOnly = !input.white && !input.black;
    const loser = winner === 'w' ? 'b' : winner === 'b' ? 'w' : null;
    const chapters = [];

    // Sarlavha
    let title;
    if (!winner) title = t('stHeadDraw', 'Teng kurash — {{n}} yurishda durrang', { n: Math.ceil(N / 2) });
    else {
      const mine = wp.map((p) => (winner === 'w' ? p : 100 - p));
      const worst = mine.length ? Math.min(...mine) : 50;
      const loserBlunders = an.moves.filter((m) => m && m.color === loser && m.cls === 'blunder').length;
      if (worst < 25) title = t('stHeadComeback', "{{name}} mag'lubiyat yoqasidan qaytib, g'alaba qozondi!", { name: name(winner) });
      else if (worst >= 45 && loserBlunders) title = t('stHeadCrush', '{{name}} raqibiga imkon bermadi', { name: name(winner) });
      else title = t('stHeadWin', "{{name}}ning g'alabasi — {{n}} yurishda", { name: name(winner), n: Math.ceil(N / 2) });
    }

    // Ochilish
    if (input.variant === 'chess960') chapters.push({ ply: 0, icon: '🎲', text: t('stOpening960', "O'yin Chess960 pozitsiyasidan boshlandi: {{white}} — oq, {{black}} — qora.", { white: W, black: B }) });
    else if (sidesOnly) chapters.push({ ply: 0, icon: input.opening && input.opening.name ? '📖' : '♟', text: input.opening && input.opening.name ? t('stOpeningSides', "Oq va qora «{{opening}}» bilan boshladi.", { opening: input.opening.name }) : t('stOpeningSidesPlain', "Oq va qora o'yinni boshladi.") });
    else if (input.opening && input.opening.name) chapters.push({ ply: 0, icon: '📖', text: t('stOpening', "{{white}} (oq) va {{black}} (qora) «{{opening}}» bilan boshlashdi.", { white: W, black: B, opening: input.opening.name }) });
    else chapters.push({ ply: 0, icon: '♟', text: t('stOpeningPlain', "{{white}} (oq) va {{black}} (qora) o'yinni boshlashdi.", { white: W, black: B }) });

    // Debyut bosqichi (birinchi 16 yarim yurish)
    if (N > 16 && wp.length > 16) {
      const early = wp.slice(0, 17);
      const edge = early.findIndex((p) => Math.abs(p - 50) > 20);
      if (edge < 0) chapters.push({ ply: 16, icon: '⚖️', text: t('stEarlyEqual', "Dastlabki {{n}} yurish teng kurash bilan o'tdi.", { n: 8 }) });
      else chapters.push({ ply: edge, icon: '📈', text: t('stEarlyEdge', "Debyutdan so'ng {{side}} tomon ustunlikka erishdi.", { side: sideName(wp[edge] > 50 ? 'w' : 'b') }) });
    }

    // Hal qiluvchi xatolar (eng kattasi 4 tagacha, o'yin tartibida)
    const errs = an.moves.map((m, i) => ({ m, i })).filter((x) => x.m && (x.m.cls === 'blunder' || x.m.cls === 'mistake'))
      .sort((a, b) => b.m.loss - a.m.loss).slice(0, 4);
    const decisive = winner ? errs.find((x) => x.m.color === loser) : null;
    errs.sort((a, b) => a.i - b.i);
    for (const { m, i } of errs) {
      const mv = moveLabel(i, moves[i] || m);
      let text = m.cls === 'blunder'
        ? t('stBlunder', "{{move}} — {{player}}ning qo'pol xatosi (??).", { move: mv, player: name(m.color) })
        : t('stMistake', '{{move}} — {{player}} xato qildi (?).', { move: mv, player: name(m.color) });
      if (m.bestSan) text += ' ' + t('stBetter', 'Yaxshiroq edi: {{best}}.', { best: m.bestSan });
      const before = leader(wp[i]), after = leader(wp[i + 1]);
      if (after && after !== before) text += ' ' + t('stSwing', "Ustunlik {{side}} tomonga o'tdi.", { side: sideName(after) });
      if (decisive && decisive.i === i) text += ' ' + t('stDecisive', "Bu o'yinning hal qiluvchi lahzasi bo'ldi.");
      chapters.push({ ply: i + 1, icon: m.cls === 'blunder' ? '💥' : '⚠️', text });
    }
    if (!errs.length && N >= 10) chapters.push({ ply: null, icon: '✨', text: t('stClean', "Hech kim jiddiy xato qilmadi — o'yin juda toza o'tdi.") });

    // Farzinlar almashuvi va piyodaning aylanishi
    for (let i = 0; i < N - 1; i++) {
      if (moves[i].captured === 'q' && ((moves[i + 1] && moves[i + 1].captured === 'q') || (moves[i + 2] && moves[i + 2].captured === 'q'))) {
        chapters.push({ ply: i + 1, icon: '🔁', text: t('stQueens', "{{move}}: farzinlar almashildi — o'yin tinchroq bosqichga o'tdi.", { move: moveLabel(i, moves[i]) }) });
        break;
      }
    }
    const pr = moves.findIndex((m) => m.promotion);
    if (pr >= 0) chapters.push({ ply: pr + 1, icon: '👑', text: t('stPromotion', '{{move}}: piyoda farzinga aylandi!', { move: moveLabel(pr, moves[pr]) }) });

    // Yakun
    const last = N ? moveLabel(N - 1, moves[N - 1]) : '';
    const reasonDraw = { stalemate: t('ghStalemate', 'pat'), threefold: t('ghRepetition', 'takrorlanish'), fifty: t('ghFifty', '50 yurish'), insufficient: t('ghInsufficient', 'dona yetishmaydi'), agreement: t('lvReasonAgreement', 'kelishuv') };
    let end;
    if (winner && reason === 'checkmate') end = { icon: '🏁', text: t('stEndMate', '{{move}} — {{winner}} mat qildi!', { move: last, winner: name(winner) }) };
    else if (winner && reason === 'resign') end = { icon: '🏳️', text: t('stEndResign', "{{loser}} taslim bo'ldi — {{winner}} g'alaba qozondi.", { loser: name(loser), winner: name(winner) }) };
    else if (winner && reason === 'timeout') end = { icon: '⏰', text: t('stEndTimeout', "{{loser}}ning vaqti tugadi — {{winner}} g'alaba qozondi.", { loser: name(loser), winner: name(winner) }) };
    else if (winner && reason === 'abandon') end = { icon: '🚪', text: t('stEndAbandon', "{{loser}} o'yinni tark etdi — {{winner}} g'alaba qozondi.", { loser: name(loser), winner: name(winner) }) };
    else if (winner) end = { icon: '🏆', text: t('stEndWin', "{{winner}} g'alaba qozondi.", { winner: name(winner) }) };
    else if (input.result === '1/2-1/2') end = { icon: '🤝', text: t('stEndDraw', "O'yin durrang bilan yakunlandi{{reason}}.", { reason: reasonDraw[reason] ? ' (' + reasonDraw[reason] + ')' : '' }) };
    if (end) chapters.push({ ply: N, ...end });

    chapters.sort((a, b) => (a.ply === null ? 1e9 : a.ply) - (b.ply === null ? 1e9 : b.ply) || 0);
    if (an.accuracy) chapters.push({ ply: null, icon: '🎯', text: t('stAccuracy', 'Aniqlik: {{white}} — {{wa}}%, {{black}} — {{ba}}%.', { white: W, black: B, wa: an.accuracy.w, ba: an.accuracy.b }) });
    return { title, chapters };
  }

  const toText = (story) => '📖 ' + story.title + '\n\n' + story.chapters.map((c) => c.icon + ' ' + c.text).join('\n');
  return { build, toText, winPct };
});

// --- Brauzer: hikoya oynasi ---
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SITE = location.origin;

  window.openGameStory = function (input) {
    const GS = window.GameStory;
    if (!GS || !input || !input.analysis) return;
    if (!input.opening && (!input.variant || input.variant === 'standard') && typeof window.openingFor === 'function') {
      try { input.opening = window.openingFor(input.moves.map((m) => m.san)); } catch (e) {}
    }
    const story = GS.build(input, (k, f, v) => tx(k, f, v));
    const text = GS.toText(story);
    let el = document.getElementById('storyModal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'storyModal';
      el.className = 'ch-overlay st-overlay';
      document.body.appendChild(el);
    }
    el.innerHTML = `<div class="ch-card st-card" role="dialog" aria-modal="true">
      <button type="button" class="ch-x" data-st-close aria-label="✕">✕</button>
      <div class="st-kicker">📖 ${esc(tx('stTitle', "O'yin hikoyasi"))}</div>
      <h3 class="st-title">${esc(story.title)}</h3>
      <ol class="st-list">${story.chapters.map((c) => `<li class="st-ch${c.ply !== null && input.onPly ? ' go' : ''}"${c.ply !== null ? ` data-st-ply="${c.ply}"` : ''}>
        <span class="st-ico">${esc(c.icon)}</span><span class="st-text">${esc(c.text)}</span></li>`).join('')}</ol>
      ${input.onPly ? `<p class="st-hint">${esc(tx('stHint', "Bosqichni bossangiz — o'sha pozitsiya taxtada ochiladi"))}</p>` : ''}
      <div class="st-actions">
        <button type="button" class="ch-secondary" data-st-copy>📋 ${esc(tx('stCopy', 'Nusxalash'))}</button>
        <button type="button" class="ch-primary" data-st-share>📤 ${esc(tx('stShare', 'Ulashish'))}</button>
      </div>
    </div>`;
    const close = () => el.remove();
    el.onclick = (e) => {
      if (e.target === el || e.target.closest('[data-st-close]')) return close();
      const ch = e.target.closest('[data-st-ply]');
      if (ch && input.onPly) { input.onPly(Number(ch.dataset.stPly)); el.querySelectorAll('.st-ch.on').forEach((x) => x.classList.remove('on')); ch.classList.add('on'); return; }
      if (e.target.closest('[data-st-copy]')) {
        (navigator.clipboard ? navigator.clipboard.writeText(text + '\n' + SITE) : Promise.reject()).then(
          () => showToast(tx('stCopied', 'Hikoya nusxalandi'), 'success', 1800),
          () => showToast(tx('stCopyFail', "Nusxalab bo'lmadi"), 'warning'));
        return;
      }
      if (e.target.closest('[data-st-share]')) {
        if (navigator.share) { navigator.share({ title: story.title, text, url: SITE }).catch(() => {}); return; }
        window.open('https://t.me/share/url?url=' + encodeURIComponent(SITE) + '&text=' + encodeURIComponent(text), '_blank', 'noopener');
      }
    };
  };

  // O'yin paneli: tahlil bo'lmasa — avval tahlil, keyin hikoya (analysis.js startGameAnalysis oxirida chaqiradi)
  window.openPanelStory = function () {
    if (typeof game === 'undefined') return;
    if (!window.gameAnalysis) {
      window.storyAfterAnalysis = true;
      showToast(tx('stPreparing', "Hikoya tayyorlanmoqda — avval o'yin tahlil qilinadi…"), 'info', 2500);
      if (typeof window.startGameAnalysis === 'function') window.startGameAnalysis();
      return;
    }
    const d = typeof window.currentGameShareData === 'function' ? window.currentGameShareData() : {};
    window.openGameStory({
      moves: game.history({ verbose: true }), analysis: window.gameAnalysis,
      white: window.localGameMode ? null : d.white && d.white.name, black: window.localGameMode ? null : d.black && d.black.name, result: d.result, reason: d.reason, variant: d.variant,
      onPly: (p) => { if (typeof window.reviewMove === 'function') window.reviewMove(p); }
    });
  };
})();
