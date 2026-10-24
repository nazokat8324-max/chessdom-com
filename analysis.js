// O'yindan keyingi tahlil: Stockfish 10 (cdnjs, brauzerda Web Worker ichida) har bir pozitsiyani baholaydi.
// Natija: baho chizig'i (#pgEvalBar), yurish belgilari (?! noaniqlik, ? xato, ?? qo'pol xato), aniqlik foizi,
// ko'rilayotgan yurish uchun eng yaxshi yurish. Server ishtirok etmaydi. board.js: showPly → onAnalysisPly.
(function () {
  const ENGINE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';
  const DEPTH = 12;
  const st = { worker: null, running: false, token: 0, done: 0, total: 0, result: null };
  window.gameAnalysis = null;

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  function engine() {
    if (st.worker) return st.worker;
    const blob = new Blob([`importScripts('${ENGINE_URL}');`], { type: 'application/javascript' });
    st.worker = new Worker(URL.createObjectURL(blob));
    st.worker.postMessage('uci');
    return st.worker;
  }

  // Bitta pozitsiya: { cp | mate } oq nuqtai nazaridan va eng yaxshi yurish (UCI)
  function evaluate(fen, chess960) {
    return new Promise((resolve, reject) => {
      let w;
      try { w = engine(); } catch (e) { reject(e); return; }
      const stm = fen.split(' ')[1];
      const sign = stm === 'w' ? 1 : -1;
      let last = null;
      const timer = setTimeout(() => { w.removeEventListener('message', onMsg); reject(new Error('timeout')); }, 20000);
      function onMsg(e) {
        const line = String(e.data || '');
        if (line.startsWith('info') && line.includes(' score ') && !/bound/.test(line)) {
          const m = line.match(/score (cp|mate) (-?\d+)/);
          const pv = line.match(/ pv (\S+)/);
          if (m) last = { type: m[1], value: Number(m[2]), pv: pv ? pv[1] : null };
        } else if (line.startsWith('bestmove')) {
          clearTimeout(timer);
          w.removeEventListener('message', onMsg);
          const best = line.split(' ')[1];
          resolve({
            cp: last && last.type === 'cp' ? last.value * sign : null,
            mate: last && last.type === 'mate' ? last.value * sign : null,
            best: best && best !== '(none)' ? best : (last && last.pv) || null
          });
        }
      }
      w.addEventListener('message', onMsg);
      w.onerror = () => { clearTimeout(timer); reject(new Error('engine')); };
      w.postMessage('setoption name UCI_Chess960 value ' + (chess960 ? 'true' : 'false'));
      w.postMessage('position fen ' + fen);
      w.postMessage('go depth ' + DEPTH);
    });
  }

  // Oq uchun g'alaba ehtimoli (lichess formulasi)
  const toCp = (e) => (e.mate !== null && e.mate !== undefined ? (e.mate > 0 ? 10000 : -10000) : (e.cp || 0));
  const winPct = (cp) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * Math.max(-2000, Math.min(2000, cp)))) - 1);
  const evalText = (e) => {
    if (!e) return '';
    if (e.mate !== null && e.mate !== undefined) return (e.mate >= 0 ? '+M' : '-M') + Math.abs(e.mate);
    const v = (e.cp || 0) / 100;
    return (v > 0 ? '+' : '') + v.toFixed(1);
  };

  function newInstance(variant, startFen) {
    const v = variant === undefined ? window.currentVariant : variant;
    const f = startFen === undefined ? window.currentStartFen : startFen;
    return window.newChessFor ? window.newChessFor(v, f) : new Chess();
  }

  // Umumiy tahlil: yurishlar ({from,to,promotion,color,san}) → baholar va xulosa. Bir vaqtda bitta tahlil (dvigatel bitta)
  let busy = false;
  async function analyzeLine(moves, variant, startFen, onProgress, isCancelled) {
    if (busy) throw new Error('busy');
    busy = true;
    try {
      const chess960 = variant === 'chess960';
      const pos = newInstance(variant, startFen);
      const fens = [pos.fen()];
      const terminal = [null];
      for (const m of moves) {
        pos.move({ from: m.from, to: m.to, promotion: m.promotion });
        fens.push(pos.fen());
        terminal.push(pos.in_checkmate() ? (pos.turn() === 'w' ? -10000 : 10000) : (pos.in_draw() ? 0 : null));
      }
      const evals = [];
      for (let i = 0; i < fens.length; i++) {
        if (isCancelled && isCancelled()) return null;
        if (terminal[i] !== null && terminal[i] !== undefined) evals.push({ cp: terminal[i], mate: null, best: null, terminal: true });
        else evals.push(await evaluate(fens[i], chess960));
        if (onProgress) onProgress(i + 1, fens.length);
      }
      return summarize(moves, evals, variant, startFen);
    } finally {
      busy = false;
    }
  }
  window.analyzeLine = analyzeLine;
  window.analysisUtils = {
    winPct: (e) => winPct(toCp(e)),
    evalText: (e) => evalText(e),
    resultText: (e) => (toCp(e) > 0 ? '1-0' : (toCp(e) < 0 ? '0-1' : '½')),
    badge: (cls) => (cls ? `<i class="an-badge an-${cls}">${{ inaccuracy: '?!', mistake: '?', blunder: '??' }[cls]}</i>` : '')
  };

  window.startGameAnalysis = async function () {
    if (st.running || typeof game === 'undefined') return;
    const moves = game.history({ verbose: true });
    if (moves.length < 2) return;
    const token = ++st.token;
    st.running = true;
    st.done = 0;
    st.total = moves.length + 1;
    renderBox();
    let result;
    try {
      result = await analyzeLine(moves, window.currentVariant, window.currentStartFen,
        (done, total) => { if (token === st.token) { st.done = done; st.total = total; renderBox(); } },
        () => token !== st.token);
    } catch (err) {
      if (token !== st.token) return;
      st.running = false;
      window.storyAfterAnalysis = false;
      renderBox();
      window.analysisFailed(err);
      return;
    }
    if (token !== st.token || !result) return;
    st.running = false;
    st.result = result;
    window.gameAnalysis = st.result;
    const view = document.getElementById('gameView');
    if (view) view.classList.add('pg-analysed');
    renderBox();
    if (typeof window.refreshMoveList === 'function') window.refreshMoveList();
    window.onAnalysisPly(typeof window.getViewPly === 'function' && window.getViewPly() !== null ? window.getViewPly() : moves.length);
    // 📖 Hikoya so'ralgan bo'lsa (gamestory.js openPanelStory) — tahlil tugagach ochiladi
    if (window.storyAfterAnalysis) { window.storyAfterAnalysis = false; if (typeof window.openPanelStory === 'function') window.openPanelStory(); }
  };

  // Dvigatel yuklanmadi / boshqa tahlil ketmoqda
  window.analysisFailed = function (err) {
    if (err && err.message === 'busy') { showToast(tx('anBusy', 'Boshqa tahlil davom etmoqda — tugashini kuting.'), 'warning'); return; }
    if (st.worker) { st.worker.terminate(); st.worker = null; }
    showToast(tx('anFailed', "Tahlil dvigatelini yuklab bo'lmadi. Internetni tekshirib, qayta urinib ko'ring."), 'warning');
  };

  function summarize(moves, evals, variant, startFen) {
    const out = { evals, moves: [], accuracy: { w: 0, b: 0 }, counts: { w: { inaccuracy: 0, mistake: 0, blunder: 0 }, b: { inaccuracy: 0, mistake: 0, blunder: 0 } } };
    const acc = { w: [], b: [] };
    moves.forEach((m, i) => {
      const before = winPct(toCp(evals[i])), after = winPct(toCp(evals[i + 1]));
      const mine = (x) => (m.color === 'w' ? x : 100 - x);
      const loss = Math.max(0, mine(before) - mine(after));
      const uci = m.from + m.to + (m.promotion || '');
      const best = evals[i].best;
      const isBest = best && (best === uci || best === m.from + m.to);
      let cls = null;
      if (!isBest) cls = loss >= 30 ? 'blunder' : (loss >= 20 ? 'mistake' : (loss >= 10 ? 'inaccuracy' : null));
      if (cls) out.counts[m.color][cls]++;
      acc[m.color].push(Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669)));
      // Eng yaxshi yurishning SAN ko'rinishi
      let bestSan = null;
      if (best && !isBest) {
        try {
          const p = newInstance(variant, startFen);
          for (let j = 0; j < i; j++) p.move({ from: moves[j].from, to: moves[j].to, promotion: moves[j].promotion });
          const r = p.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] });
          bestSan = r ? r.san : null;
        } catch (e) { bestSan = null; }
      }
      out.moves.push({ cls, loss, best, bestSan, san: m.san, color: m.color });
    });
    ['w', 'b'].forEach(c => { out.accuracy[c] = acc[c].length ? Math.round(acc[c].reduce((a, b) => a + b, 0) / acc[c].length) : 0; });
    return out;
  }

  window.clearAnalysis = function () {
    st.token++;
    if (st.running && st.worker) st.worker.postMessage('stop');
    st.running = false;
    st.result = null;
    window.gameAnalysis = null;
    const view = document.getElementById('gameView');
    if (view) view.classList.remove('pg-analysed');
    document.querySelectorAll('#chessBoard .sq-best').forEach(s => s.classList.remove('sq-best'));
    renderBox();
  };

  window.cancelGameAnalysis = function () {
    st.token++;
    if (st.worker) st.worker.postMessage('stop');
    st.running = false;
    renderBox();
  };

  // Belgi: yurishlar jadvalidagi har bir yurish uchun (board.js renderMoveList)
  window.analysisBadge = function (i) {
    const m = st.result && st.result.moves[i];
    if (!m || !m.cls) return '';
    return `<i class="an-badge an-${m.cls}">${{ inaccuracy: '?!', mistake: '?', blunder: '??' }[m.cls]}</i>`;
  };

  // Ko'rilayotgan pozitsiya: baho chizig'i, eng yaxshi yurish, ma'lumot qatori
  window.onAnalysisPly = function (ply) {
    const r = st.result;
    const bar = document.getElementById('pgEvalBar');
    document.querySelectorAll('#chessBoard .sq-best').forEach(s => s.classList.remove('sq-best'));
    if (!r || !bar) return;
    const e = r.evals[Math.max(0, Math.min(r.evals.length - 1, ply))];
    const white = winPct(toCp(e));
    const flipped = typeof board !== 'undefined' && board && board.orientation() === 'black';
    bar.classList.toggle('flipped', flipped);
    bar.querySelector('.an-fill').style.height = white.toFixed(1) + '%';
    const label = bar.querySelector('.an-label');
    label.textContent = e.terminal ? (toCp(e) > 0 ? '1-0' : (toCp(e) < 0 ? '0-1' : '½')) : evalText(e);
    label.classList.toggle('dark', white < 50);
    // Shu yurishda o'ynalgan va eng yaxshi bo'lgan yurish
    const info = document.getElementById('anPlyInfo');
    const m = ply > 0 ? r.moves[ply - 1] : null;
    if (info) {
      if (!m) info.innerHTML = `<span class="an-muted">${esc(tx('anPickMove', "Yurishni tanlang — baho va eng yaxshi yurish shu yerda ko'rinadi"))}</span>`;
      else {
        const clsName = m.cls ? { inaccuracy: tx('anInaccuracy', 'Noaniqlik'), mistake: tx('anMistake', 'Xato'), blunder: tx('anBlunder', "Qo'pol xato") }[m.cls] : tx('anGood', 'Yaxshi yurish');
        info.innerHTML = `<b>${Math.ceil(ply / 2)}${m.color === 'w' ? '.' : '...'} ${esc(m.san)}</b> <span class="an-tag ${m.cls ? 'an-' + m.cls : 'an-good'}">${esc(clsName)}</span>` +
          (m.bestSan ? ` <span class="an-muted">· ${esc(tx('anBest', 'Eng yaxshisi'))}: <b>${esc(m.bestSan)}</b></span>` : '') +
          ` <span class="an-eval">${esc(evalText(r.evals[ply]))}</span>`;
      }
    }
    // Keyingi yurish uchun eng yaxshi variant — taxtada belgilanadi
    if (e.best && !e.terminal) {
      [e.best.slice(0, 2), e.best.slice(2, 4)].forEach(sq => {
        const el = document.querySelector('#chessBoard [data-square="' + sq + '"]');
        if (el) el.classList.add('sq-best');
      });
    }
  };

  function renderBox() {
    const box = document.getElementById('pgAnalysisBox');
    if (!box) return;
    if (st.running) {
      const pct = st.total ? Math.round(st.done / st.total * 100) : 0;
      box.innerHTML = `
        <div class="an-progress-text">🔍 ${esc(tx('anRunning', 'Tahlil qilinmoqda… {{done}}/{{total}}', { done: st.done, total: st.total }))}</div>
        <div class="an-progress"><span style="width:${pct}%"></span></div>
        <button type="button" class="control-btn an-cancel" onclick="window.cancelGameAnalysis()">${esc(tx('gpCancel', 'Bekor qilish'))}</button>`;
      return;
    }
    const r = st.result;
    if (!r) {
      box.innerHTML = `
        <button type="button" class="start-game-btn an-start" onclick="window.startGameAnalysis()">🔍 ${esc(tx('anStart', "O'yinni tahlil qilish"))}</button>
        <button type="button" class="control-btn an-story" onclick="window.openPanelStory()">📖 ${esc(tx('stTitle', "O'yin hikoyasi"))}</button>
        <div class="an-muted an-hint">${esc(tx('anHint', 'Stockfish brauzeringizda ishlaydi — taxminan 20–60 soniya'))}</div>`;
      return;
    }
    const side = (c) => `
      <div class="an-side">
        <div class="an-side-head">${window.kingIcon(c)} <b>${r.accuracy[c]}%</b><small>${esc(tx('anAccuracy', 'Aniqlik'))}</small></div>
        <div class="an-counts">
          <span class="an-inaccuracy">?! ${r.counts[c].inaccuracy}</span>
          <span class="an-mistake">? ${r.counts[c].mistake}</span>
          <span class="an-blunder">?? ${r.counts[c].blunder}</span>
        </div>
      </div>`;
    box.innerHTML = `
      <div class="an-summary">${side('w')}${side('b')}</div>
      <div class="an-legend"><span class="an-inaccuracy">?! ${esc(tx('anInaccuracy', 'Noaniqlik'))}</span><span class="an-mistake">? ${esc(tx('anMistake', 'Xato'))}</span><span class="an-blunder">?? ${esc(tx('anBlunder', "Qo'pol xato"))}</span></div>
      <div class="an-ply" id="anPlyInfo"></div>
      <button type="button" class="control-btn an-story" onclick="window.openPanelStory()">📖 ${esc(tx('stTitle', "O'yin hikoyasi"))}</button>`;
  }

  // Panel rejimi o'zgarganda (board.js setGamePanelMode)
  window.updateAnalysisBox = function (mode) {
    const box = document.getElementById('pgAnalysisBox');
    if (!box) return;
    const enough = typeof game !== 'undefined' && game.history().length >= 2;
    box.hidden = mode !== 'over' || !enough || (window.variantAnalysable && !window.variantAnalysable(window.currentVariant));
    if (mode !== 'over' && (st.result || st.running)) window.clearAnalysis();
    else renderBox();
  };
  window.refreshAnalysisBox = function () {
    renderBox();
    if (st.result && typeof window.getViewPly === 'function') {
      const p = window.getViewPly();
      window.onAnalysisPly(p === null ? game.history().length : p);
    }
  };
})();
