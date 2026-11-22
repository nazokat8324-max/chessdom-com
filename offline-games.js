// Internetsiz sahifa (offline.html) o'yinlari: 👥 ikki kishi bir qurilmada (Standart / Chess960 / Shatranj, soat bilan),
// 🎯 Katakni top, 🐪 Karvon tangalari, 🧠 Pozitsiyani eslab qol, ♞ Ot sayohati.
// Serverga hech narsa yuborilmaydi; rekordlar localStorage 'justChessOffline' da. Fayllar sw.js PRECACHE da (tarmoqsiz ochiladi).
// Sof qism (UMD: tests/offline.test.js require qiladi) — pastdagi `logic`; brauzer qismi — `document` bo'lsa ishga tushadi.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.OfflineGames = api; if (typeof document !== 'undefined') api.boot(); }
})(typeof self !== 'undefined' ? self : this, function () {
  const FILES = 'abcdefgh';
  const name = (i) => FILES[i & 7] + ((i >> 3) + 1);
  const index = (s) => (Number(s[1]) - 1) * 8 + FILES.indexOf(s[0]);
  const KN = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];

  // Ot (tuya) yurishlari: band kataklarga (blocked — Set) tushilmaydi
  function knightTargets(i, blocked) {
    const f = i & 7, r = i >> 3, out = [];
    for (const [df, dr] of KN) {
      const nf = f + df, nr = r + dr;
      if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
      const j = nr * 8 + nf;
      if (!blocked || !blocked.has(j)) out.push(j);
    }
    return out;
  }
  // Har katakkacha eng kam ot yurishi (yetib bo'lmasa -1)
  function distances(from, blocked) {
    const d = new Array(64).fill(-1);
    d[from] = 0;
    const q = [from];
    while (q.length) { const c = q.shift(); for (const n of knightTargets(c, blocked)) if (d[n] < 0) { d[n] = d[c] + 1; q.push(n); } }
    return d;
  }
  // Barcha tangalarni yig'ish uchun eng kam yurish (Held–Karp, tangalar ≤ 10); yetib bo'lmasa Infinity
  function coinPar(start, coins, blocked) {
    const n = coins.length;
    if (!n) return 0;
    const fromStart = distances(start, blocked);
    const pair = coins.map((c) => distances(c, blocked));
    const INF = Infinity, full = (1 << n) - 1;
    const dp = Array.from({ length: 1 << n }, () => new Array(n).fill(INF));
    for (let i = 0; i < n; i++) { const d = fromStart[coins[i]]; if (d >= 0) dp[1 << i][i] = d; }
    for (let mask = 1; mask <= full; mask++) {
      for (let i = 0; i < n; i++) {
        const cur = dp[mask][i];
        if (cur === INF || !(mask & (1 << i))) continue;
        for (let j = 0; j < n; j++) {
          if (mask & (1 << j)) continue;
          const d = pair[i][coins[j]];
          if (d < 0) continue;
          const nm = mask | (1 << j);
          if (cur + d < dp[nm][j]) dp[nm][j] = cur + d;
        }
      }
    }
    return Math.min(...dp[full]);
  }
  // Daraja: tangalar soni level+1 (ko'pi bilan 8), 4-darajadan qum barxanlari (to'siq) — level-3 (ko'pi bilan 8)
  function coinsLevel(level, rand) {
    rand = rand || Math.random;
    const nCoins = Math.min(level + 1, 8), nRocks = level >= 4 ? Math.min(level - 3, 8) : 0;
    for (;;) {
      const used = new Set();
      const pick = () => { let s; do { s = Math.floor(rand() * 64); } while (used.has(s)); used.add(s); return s; };
      const start = pick();
      const rocks = Array.from({ length: nRocks }, pick);
      const coins = Array.from({ length: nCoins }, pick);
      const par = coinPar(start, coins, new Set(rocks));
      if (Number.isFinite(par)) return { start, coins, rocks, par };
    }
  }
  // Ot sayohati: Warnsdorff maslahati — keyingi yurishlar eng kam bo'lgan katak
  function tourMoves(pos, visited) { return knightTargets(pos).filter((j) => !visited.has(j)); }
  function tourHint(pos, visited) {
    let best = -1, bestN = 99;
    for (const j of tourMoves(pos, visited)) {
      visited.add(j);
      const n = tourMoves(j, visited).length;
      visited.delete(j);
      if (n < bestN) { bestN = n; best = j; }
    }
    return best;
  }
  // Eslab qolish: level+2 dona (ko'pi bilan 14), ikkala shoh doim bor, piyodalar 1/8-qatorda emas. Natija {katak nomi: 'wK'}
  function memoryPosition(level, rand) {
    rand = rand || Math.random;
    const count = Math.min(level + 2, 14);
    const POOL = ['Q', 'R', 'R', 'B', 'B', 'N', 'N', 'P', 'P', 'P', 'P'];
    const pos = {};
    const pieces = ['wK', 'bK'];
    while (pieces.length < count) pieces.push((rand() < 0.5 ? 'w' : 'b') + POOL[Math.floor(rand() * POOL.length)]);
    for (const p of pieces) {
      let s;
      do { s = Math.floor(rand() * 64); } while (pos[name(s)] || (p[1] === 'P' && (s < 8 || s >= 56)));
      pos[name(s)] = p;
    }
    return pos;
  }
  function compareMemory(target, placed) {
    const total = Object.keys(target).length;
    let correct = 0, extra = 0;
    for (const s of Object.keys(placed)) { if (target[s] === placed[s]) correct++; else extra++; }
    return { correct, total, extra, pass: correct === total && extra === 0 };
  }
  // O'yin natijasi: null yoki {winner: 'w'|'b'|null, reason: mate|stalemate|repeat|fifty|insuf|bare}
  const SHT_REASON = { checkmate: 'mate', stalemate: 'stalemate', bare: 'bare', insufficient: 'insuf', threefold: 'repeat', fifty: 'fifty' };
  function outcome(game, variant) {
    if (variant === 'shatranj') { const r = game.result(); return r ? { winner: r.winner, reason: SHT_REASON[r.reason] || r.reason } : null; }
    if (game.in_checkmate()) return { winner: game.turn() === 'w' ? 'b' : 'w', reason: 'mate' };
    if (game.in_stalemate()) return { winner: null, reason: 'stalemate' };
    if (game.insufficient_material()) return { winner: null, reason: 'insuf' };
    if (game.in_threefold_repetition()) return { winner: null, reason: 'repeat' };
    if (game.in_draw()) return { winner: null, reason: 'fifty' };
    return null;
  }
  // Vaqt tugashi: g'olib tomonda faqat shoh qolgan bo'lsa — durrang (FIDE; Shatranj'da emas)
  function timeoutResult(game, flagged, variant) {
    const winner = flagged === 'w' ? 'b' : 'w';
    if (variant !== 'shatranj') {
      let only = true;
      for (let i = 0; i < 64; i++) { const p = game.get(name(i)); if (p && p.color === winner && p.type !== 'k') { only = false; break; } }
      if (only) return { winner: null, reason: 'insuf' };
    }
    return { winner, reason: 'timeout' };
  }

  const logic = { name, index, knightTargets, distances, coinPar, coinsLevel, tourMoves, tourHint, memoryPosition, compareMemory, outcome, timeoutResult };

  // ===================== Brauzer qismi =====================
  function boot() {
    const $ = (id) => document.getElementById(id);
    const ALL = window.OFFLINE_TEXTS || {};
    let lang = null;
    try { lang = localStorage.getItem('justChessLang'); } catch (e) {}
    let T;
    if (lang === 'uzc' && window.UzCyrl && ALL.uz) T = window.UzCyrl.deep(ALL.uz);
    else T = ALL[lang] || ALL[(navigator.language || '').slice(0, 2).toLowerCase()] || ALL.en || {};
    document.documentElement.lang = lang === 'uzc' ? 'uz-Cyrl' : lang === 'zh' ? 'zh-CN' : (ALL[lang] ? lang : 'en');
    const t = (k, v) => String(T[k] || (ALL.en && ALL.en[k]) || k).replace(/\{(\w+)\}/g, (_, x) => (v && v[x] != null ? v[x] : ''));
    document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.getAttribute('data-t')); });
    document.querySelectorAll('[data-t-label]').forEach((el) => { el.setAttribute('aria-label', t(el.getAttribute('data-t-label'))); el.title = t(el.getAttribute('data-t-label')); });

    // Saqlanadigan rekordlar
    const KEY = 'justChessOffline';
    let store = {};
    try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { store = {}; }
    store.best = store.best || {};
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} };
    const setBest = (k, v) => { if (!(store.best[k] >= v)) { store.best[k] = v; save(); } };

    // Ovoz (sayt sozlamasi bo'yicha; yog'och to'plami keshda)
    let settings = {};
    try { settings = JSON.parse(localStorage.getItem('justChessSettings') || '{}') || {}; } catch (e) {}
    // Ovozlar blob sifatida (Audio'ning Range so'rovlari service worker keshidan har doim ham berilmaydi)
    const sounds = {};
    if (settings.soundEnabled !== false && typeof fetch === 'function') {
      for (const n of ['move', 'capture', 'game-end']) {
        fetch('/assets/sounds/wood/' + n + '.wav').then((r) => (r.ok ? r.blob() : null)).then((bl) => { if (bl) sounds[n] = new Audio(URL.createObjectURL(bl)); }).catch(() => {});
      }
    }
    const play = (n) => {
      if (settings.soundEnabled === false) return;
      try {
        const a = sounds[n];
        if (!a) return;
        a.volume = typeof settings.volume === 'number' ? settings.volume : 0.8;
        a.currentTime = 0;
        const p = a.play(); if (p && p.catch) p.catch(() => {});
      } catch (e) {}
    };
    const pieceImg = (code) => '/img/chesspieces/karvon/' + code + '.svg';
    const COIN = '<svg viewBox="0 0 40 40" class="og-coin" aria-hidden="true"><circle cx="20" cy="20" r="15" fill="#f2c14e" stroke="#a87412" stroke-width="3"/><circle cx="20" cy="20" r="8" fill="none" stroke="#a87412" stroke-width="2"/><rect x="17" y="17" width="6" height="6" fill="#a87412" transform="rotate(45 20 20)"/></svg>';
    const DUNE = '<svg viewBox="0 0 40 40" class="og-dune" aria-hidden="true"><path d="M3 32 C10 16 18 14 24 22 C28 18 33 20 37 32 Z" fill="#d9a55b" stroke="#8a5a1c" stroke-width="2"/><path d="M12 26 C16 22 19 22 22 25" fill="none" stroke="#8a5a1c" stroke-width="1.5"/></svg>';

    // ---- Taxta: 64 ta tugma; opts {pieces {sq: 'wK'}, marks {sq: 'sel hint …'}, html {sq: '…'}, flipped, coords, onTap(sq)}
    const boardEl = $('ogBoard');
    let onTap = null;
    boardEl.addEventListener('click', (e) => { const b = e.target.closest('.og-sq'); if (b && onTap) onTap(b.dataset.sq); });
    function draw(o) {
      onTap = o.onTap || null;
      const cells = [];
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const r = o.flipped ? row : 7 - row, f = o.flipped ? 7 - col : col;
          const sq = FILES[f] + (r + 1);
          const dark = (r + f) % 2 === 0;
          const p = o.pieces && o.pieces[sq];
          const cls = ['og-sq', dark ? 'd' : 'l'].concat(o.marks && o.marks[sq] ? o.marks[sq].split(' ') : []);
          let inner = '';
          if (o.html && o.html[sq]) inner += o.html[sq];
          if (p) inner += '<img src="' + pieceImg(p) + '" alt="" draggable="false">';
          if (o.coords !== false) {
            if (col === 0) inner += '<i class="og-rk">' + (r + 1) + '</i>';
            if (row === 7) inner += '<i class="og-fl">' + FILES[f] + '</i>';
          }
          cells.push('<button type="button" class="' + cls.join(' ') + '" data-sq="' + sq + '" aria-label="' + sq + '">' + inner + '</button>');
        }
      }
      boardEl.innerHTML = cells.join('');
    }

    // ---- Sahifalar: bosh menyu ↔ o'yin
    const home = $('ogHome'), stage = $('ogStage'), ctl = $('ogCtl'), msg = $('ogMsg'), stats = $('ogStats'), tray = $('ogTray');
    let current = null; // {stop()}
    const BEST_OF = { local: null, squares: () => Math.max(store.best.squares_w || 0, store.best.squares_b || 0), coins: () => store.best.coins || 0, memory: () => store.best.memory || 0, tour: () => store.best.tour || 0 };
    function renderHome() {
      document.querySelectorAll('[data-best]').forEach((el) => {
        const f = BEST_OF[el.getAttribute('data-best')];
        const v = f ? f() : 0;
        el.textContent = v ? t('best', { n: v }) : '';
      });
    }
    function openGame(id) {
      home.hidden = true; stage.hidden = false;
      $('ogTitle').textContent = t(id);
      stage.dataset.game = id;
      msg.textContent = ''; msg.className = 'og-msg'; ctl.innerHTML = ''; stats.innerHTML = ''; tray.innerHTML = ''; tray.hidden = true;
      $('ogTop').hidden = true; $('ogBottom').hidden = true;
      current = GAMES[id]();
      window.scrollTo(0, 0);
    }
    function closeGame() {
      if (current && current.stop) current.stop();
      current = null; onTap = null;
      stage.hidden = true; home.hidden = false;
      renderHome();
    }
    document.querySelectorAll('[data-game]').forEach((b) => b.addEventListener('click', () => openGame(b.getAttribute('data-game'))));
    $('ogBack').addEventListener('click', closeGame);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !stage.hidden && $('ogPromo').hidden) closeGame(); });
    const button = (label, fn, cls) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'og-btn' + (cls ? ' ' + cls : ''); b.textContent = label; b.addEventListener('click', fn); ctl.appendChild(b); return b; };
    const say = (text, kind) => { msg.textContent = text; msg.className = 'og-msg' + (kind ? ' ' + kind : ''); };
    const setStats = (pairs) => { stats.innerHTML = pairs.map(([k, v]) => '<span><small>' + k + '</small><b>' + v + '</b></span>').join(''); };
    const segment = (items, value, onPick) => {
      const box = document.createElement('div');
      box.className = 'og-seg';
      for (const [v, label] of items) {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = label; b.className = v === value ? 'on' : '';
        b.addEventListener('click', () => { box.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); onPick(v); });
        box.appendChild(b);
      }
      ctl.appendChild(box);
      return box;
    };

    // ===== 👥 Ikki kishi bir qurilmada
    function localGame() {
      const opt = Object.assign({ variant: 'standard', clock: '10+0', flip: false }, store.local || {});
      let game, sel = null, last = null, over = null, clock = null, turnAt = 0, timer = null;
      const fmt = (ms) => { if (ms == null) return ''; const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
      function setup() {
        if (timer) { clearInterval(timer); timer = null; }
        over = null; sel = null; last = null;
        $('ogTop').hidden = true; $('ogBottom').hidden = true;
        ctl.innerHTML = ''; say('');
        segment([['standard', t('standard')], ['chess960', t('c960')], ['shatranj', t('shatranj')]], opt.variant, (v) => { opt.variant = v; preview(); });
        segment([['3+2', '3+2'], ['5+0', '5+0'], ['10+0', '10+0'], ['15+10', '15+10'], ['none', t('noClock')]], opt.clock, (v) => { opt.clock = v; });
        const fl = document.createElement('label');
        fl.className = 'og-check';
        fl.innerHTML = '<input type="checkbox"' + (opt.flip ? ' checked' : '') + '> <span>' + t('autoFlip') + '</span>';
        fl.querySelector('input').addEventListener('change', (e) => { opt.flip = e.target.checked; });
        ctl.appendChild(fl);
        button(t('start'), begin, 'primary');
        preview();
      }
      function newChess() {
        if (opt.variant === 'shatranj') return new window.Shatranj();
        if (opt.variant === 'chess960') return new window.Chess960();
        return new window.Chess();
      }
      function preview() { game = newChess(); render(false); }
      function begin() {
        store.local = opt; save();
        game = newChess();
        const [m, inc] = opt.clock === 'none' ? [0, 0] : opt.clock.split('+').map(Number);
        clock = opt.clock === 'none' ? null : { w: m * 60000, b: m * 60000, inc: inc * 1000 };
        turnAt = 0;
        ctl.innerHTML = '';
        button('↶ ' + t('undo'), undo);
        button(t('drawBtn'), () => { if (!over && confirm(t('confirmDraw'))) finish({ winner: null, reason: 'agree' }); });
        button(t('resign'), () => { if (!over && confirm(t('confirmResign'))) finish({ winner: game.turn() === 'w' ? 'b' : 'w', reason: 'resign' }); });
        $('ogTop').hidden = false; $('ogBottom').hidden = false;
        if (clock) timer = setInterval(tick, 200);
        render(true);
      }
      const left = (c) => (clock ? clock[c] - (turnAt && game.turn() === c && !over ? Date.now() - turnAt : 0) : null);
      function tick() {
        if (over || !clock || !turnAt) return;
        const c = game.turn();
        if (left(c) <= 0) { clock[c] = 0; finish(timeoutResult(game, c, opt.variant)); return; }
        renderClocks();
      }
      function renderClocks() {
        const flipped = opt.flip && game.turn() === 'b';
        const bottom = flipped ? 'b' : 'w', top = bottom === 'w' ? 'b' : 'w';
        const bar = (el, c) => {
          const ms = left(c);
          el.className = 'og-player' + (!over && game.turn() === c ? ' on' : '') + (ms != null && ms < 20000 ? ' low' : '');
          el.innerHTML = '<span><img src="' + pieceImg(c + 'K') + '" alt=""> ' + t(c === 'w' ? 'white' : 'black') + '</span><b>' + (clock ? fmt(ms) : '') + '</b>';
        };
        bar($('ogTop'), top); bar($('ogBottom'), bottom);
      }
      function render(active) {
        const pieces = {}, marks = {};
        for (let i = 0; i < 64; i++) { const s = name(i); const p = game.get(s); if (p) pieces[s] = p.color + p.type.toUpperCase(); }
        const add = (s, c) => { marks[s] = (marks[s] ? marks[s] + ' ' : '') + c; };
        if (last) { add(last.from, 'last'); add(last.to, 'last'); }
        if (active && sel) {
          add(sel, 'sel');
          for (const m of game.moves({ square: sel, verbose: true })) add(m.to, game.get(m.to) && game.get(m.to).color !== game.turn() ? 'cap' : 'hint');
        }
        if (active && !over && game.in_check()) {
          for (let i = 0; i < 64; i++) { const p = game.get(name(i)); if (p && p.type === 'k' && p.color === game.turn()) add(name(i), 'chk'); }
        }
        draw({ pieces, marks, flipped: opt.flip && game.turn() === 'b' && active, onTap: active && !over ? tap : null });
        if (active) {
          renderClocks();
          if (!over) say(t(game.turn() === 'w' ? 'turnW' : 'turnB') + (game.in_check() ? ' · ' + t('check') : ''), game.in_check() ? 'warn' : '');
        }
      }
      function tap(sq) {
        const p = game.get(sq);
        if (sel) {
          const list = game.moves({ square: sel, verbose: true }).filter((m) => m.to === sq);
          if (list.length) {
            if (list.some((m) => m.promotion) && opt.variant !== 'shatranj') return askPromo(game.turn(), (pr) => doMove({ from: sel, to: sq, promotion: pr }));
            return doMove({ from: sel, to: sq });
          }
        }
        sel = p && p.color === game.turn() && sel !== sq ? sq : null;
        render(true);
      }
      function doMove(m) {
        const mover = game.turn();
        const r = game.move(m);
        if (!r) { sel = null; render(true); return; }
        const now = Date.now();
        if (clock) {
          if (turnAt) clock[mover] -= now - turnAt;
          clock[mover] += clock.inc;
          // Soat oqning birinchi yurishidan keyin yuradi
          turnAt = now;
        }
        sel = null; last = { from: r.from, to: r.to };
        play(r.captured ? 'capture' : 'move');
        const res = outcome(game, opt.variant);
        if (res) return finish(res);
        render(true);
      }
      function undo() {
        if (over || !game.history().length) return;
        game.undo();
        const h = game.history({ verbose: true });
        last = h.length ? { from: h[h.length - 1].from, to: h[h.length - 1].to } : null;
        if (clock && !h.length) turnAt = 0; else if (clock) turnAt = Date.now();
        sel = null; render(true);
      }
      function finish(res) {
        if (clock && turnAt && res.reason !== 'timeout') clock[game.turn()] -= Date.now() - turnAt;
        over = res; turnAt = 0;
        if (timer) { clearInterval(timer); timer = null; }
        play('game-end');
        render(true);
        const head = res.winner ? t(res.winner === 'w' ? 'winW' : 'winB') : t('draw');
        say(head + ' · ' + t('r' + res.reason[0].toUpperCase() + res.reason.slice(1)), 'done');
        ctl.innerHTML = '';
        button(t('newGame'), setup, 'primary');
      }
      setup();
      return { stop() { if (timer) clearInterval(timer); } };
    }
    // Aylanish tanlovi (Standart va Chess960)
    function askPromo(color, done) {
      const box = $('ogPromo'), list = $('ogPromoList');
      list.innerHTML = '';
      for (const p of ['q', 'r', 'b', 'n']) {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', p.toUpperCase());
        b.innerHTML = '<img src="' + pieceImg(color + p.toUpperCase()) + '" alt="">';
        b.addEventListener('click', () => { box.hidden = true; done(p); });
        list.appendChild(b);
      }
      box.hidden = false;
    }
    $('ogPromoClose').addEventListener('click', () => { $('ogPromo').hidden = true; });

    // ===== 🎯 Katakni top (30 soniya)
    function squaresGame() {
      let side = store.squaresSide === 'b' ? 'b' : 'w', target = null, score = 0, endAt = 0, timer = null, flash = {};
      function setup() {
        ctl.innerHTML = ''; say(t('squaresD'));
        segment([['w', t('sideW')], ['b', t('sideB')]], side, (v) => { side = v; store.squaresSide = v; save(); idle(); });
        button(t('start'), begin, 'primary');
        idle();
      }
      function idle() {
        const b = store.best['squares_' + side] || 0;
        setStats(b ? [['', t('best', { n: b })]] : []);
        draw({ flipped: side === 'b', coords: true });
      }
      const pickTarget = () => { let s; do { s = name(Math.floor(Math.random() * 64)); } while (s === target); target = s; };
      function begin() {
        score = 0; flash = {}; endAt = Date.now() + 30000; pickTarget();
        ctl.innerHTML = '';
        timer = setInterval(() => { if (Date.now() >= endAt) end(); else show(); }, 200);
        show();
      }
      function show() {
        setStats([[t('find'), '<span class="og-target">' + target + '</span>'], [t('score'), score], ['⏱', Math.max(0, Math.ceil((endAt - Date.now()) / 1000))]]);
        draw({ flipped: side === 'b', coords: false, marks: flash, onTap: tap });
        say('');
      }
      function tap(sq) {
        if (sq === target) { score++; flash = { [sq]: 'ok' }; play('move'); pickTarget(); }
        else flash = { [sq]: 'bad', [target]: 'ok' };
        show();
      }
      function end() {
        clearInterval(timer); timer = null;
        setBest('squares_' + side, score);
        play('game-end');
        setStats([[t('score'), score], ['', t('best', { n: store.best['squares_' + side] || score })]]);
        draw({ flipped: side === 'b', coords: true });
        say(t('sqOver', { n: score }), 'done');
        ctl.innerHTML = '';
        button(t('again'), setup, 'primary');
      }
      setup();
      return { stop() { if (timer) clearInterval(timer); } };
    }

    // ===== 🐪 Karvon tangalari
    function coinsGame() {
      let level = store.coinsLevel || 1, lv, pos, coins, rocks, moves;
      function begin() {
        lv = coinsLevel(level);
        pos = lv.start; coins = new Set(lv.coins); rocks = new Set(lv.rocks); moves = 0;
        ctl.innerHTML = '';
        button('↺ ' + t('restart'), () => { level = 1; store.coinsLevel = 1; save(); begin(); });
        say(t('coinsHelp'));
        render();
      }
      function render() {
        setStats([['', t('level', { n: level })], [t('moves'), moves], [t('par'), lv.par], ['', coins.size + ' ' + COIN]]);
        const html = {}, marks = {}, pieces = { [name(pos)]: 'wB' };
        coins.forEach((c) => { html[name(c)] = COIN; });
        rocks.forEach((r) => { html[name(r)] = DUNE; marks[name(r)] = 'rock'; });
        if (coins.size) for (const j of knightTargets(pos, rocks)) marks[name(j)] = (marks[name(j)] ? marks[name(j)] + ' ' : '') + 'hint';
        draw({ pieces, html, marks, onTap: coins.size ? tap : null });
      }
      function tap(sq) {
        const j = index(sq);
        if (!knightTargets(pos, rocks).includes(j)) return;
        pos = j; moves++;
        if (coins.delete(j)) play('capture'); else play('move');
        render();
        if (!coins.size) done();
      }
      function done() {
        const stars = moves <= lv.par ? 3 : moves <= lv.par + 2 ? 2 : 1;
        setBest('coins', level);
        play('game-end');
        say(t('coinsDone', { m: moves, p: lv.par }) + ' ' + '★'.repeat(stars) + '☆'.repeat(3 - stars), 'done');
        level++; store.coinsLevel = level; save();
        ctl.innerHTML = '';
        button(t('next'), begin, 'primary');
        button('↺ ' + t('restart'), () => { level = 1; store.coinsLevel = 1; save(); begin(); });
      }
      begin();
      return {};
    }

    // ===== 🧠 Pozitsiyani eslab qol
    function memoryGame() {
      let level = 1, lives = 3, target, placed, pool, pick = null, timer = null;
      const heart = () => '<span class="og-hearts">' + '❤'.repeat(lives) + '<i>' + '❤'.repeat(3 - lives) + '</i></span>';
      function begin() {
        target = memoryPosition(level); placed = {}; pick = null;
        pool = Object.keys(target).map((s) => target[s]).sort();
        ctl.innerHTML = ''; tray.hidden = true;
        let left = 5;
        const tickWatch = () => {
          setStats([['', t('level', { n: level })], [t('lives'), heart()], ['⏱', left]]);
          say(t('memWatch'), 'warn');
        };
        draw({ pieces: target });
        tickWatch();
        timer = setInterval(() => { left--; if (left <= 0) { clearInterval(timer); timer = null; placePhase(); } else tickWatch(); }, 1000);
      }
      function placePhase() {
        setStats([['', t('level', { n: level })], [t('lives'), heart()]]);
        say(t('memPlace'));
        ctl.innerHTML = '';
        button(t('memCheck'), check, 'primary');
        render();
      }
      function render() {
        draw({ pieces: placed, onTap: tap, marks: {} });
        tray.hidden = false;
        tray.innerHTML = pool.map((p, i) => '<button type="button" class="og-token' + (pick === i ? ' on' : '') + '" data-i="' + i + '" aria-label="' + t(p[0] === 'w' ? 'white' : 'black') + ' ' + p[1] + '"><img src="' + pieceImg(p) + '" alt=""></button>').join('');
      }
      tray.onclick = (e) => { const b = e.target.closest('.og-token'); if (!b) return; const i = Number(b.dataset.i); pick = pick === i ? null : i; render(); };
      function tap(sq) {
        if (pick != null) {
          if (placed[sq]) pool.push(placed[sq]);
          placed[sq] = pool[pick]; pool.splice(pick, 1); pool.sort(); pick = null; play('move');
        } else if (placed[sq]) { pool.push(placed[sq]); pool.sort(); delete placed[sq]; }
        render();
      }
      function check() {
        const r = compareMemory(target, placed);
        tray.hidden = true;
        const marks = {}, html = {};
        for (const s of Object.keys(placed)) marks[s] = target[s] === placed[s] ? 'ok' : 'bad';
        for (const s of Object.keys(target)) if (placed[s] !== target[s] && !placed[s]) html[s] = '<img class="og-ghost" src="' + pieceImg(target[s]) + '" alt="">';
        draw({ pieces: placed, marks, html });
        ctl.innerHTML = '';
        if (r.pass) {
          setBest('memory', level); play('capture');
          say(t('memOk'), 'done'); level++;
          button(t('next'), begin, 'primary');
          return;
        }
        lives--;
        setStats([['', t('level', { n: level })], [t('lives'), heart()]]);
        if (lives <= 0) {
          play('game-end');
          say(t('memOver', { n: level }), 'done');
          button(t('again'), () => { level = 1; lives = 3; begin(); }, 'primary');
        } else {
          say(t('memWrong', { a: r.correct, b: r.total }), 'warn');
          button(t('retry'), begin, 'primary');
        }
      }
      begin();
      return { stop() { if (timer) clearInterval(timer); tray.onclick = null; } };
    }

    // ===== ♞ Ot sayohati
    function tourGame() {
      let path = [], visited = new Set(), hint = -1;
      function reset() { path = []; visited = new Set(); hint = -1; render(); }
      function render() {
        const html = {}, marks = {}, pieces = {};
        path.forEach((s, i) => { if (i < path.length - 1) { html[name(s)] = '<b class="og-step">' + (i + 1) + '</b>'; marks[name(s)] = 'visited'; } });
        if (path.length) {
          const pos = path[path.length - 1];
          pieces[name(pos)] = 'wN';
          for (const j of tourMoves(pos, visited)) marks[name(j)] = 'hint' + (j === hint ? ' best' : '');
        }
        setStats([[t('tourCount'), path.length + ' / 64']]);
        draw({ pieces, html, marks, onTap: tap });
        ctl.innerHTML = '';
        if (path.length) {
          button('↶ ' + t('undo'), () => { visited.delete(path.pop()); hint = -1; render(); });
          const moves = tourMoves(path[path.length - 1], visited);
          if (moves.length) button('💡 ' + t('hint'), () => { hint = tourHint(path[path.length - 1], visited); render(); });
          button('↺ ' + t('restart'), reset);
          if (path.length === 64) { setBest('tour', 64); say(t('tourWin'), 'done'); }
          else if (!moves.length) { setBest('tour', path.length); say(t('tourEnd', { n: path.length }), 'done'); }
          else say(t('tourD'));
        } else say(t('tourStart'));
      }
      function tap(sq) {
        const j = index(sq);
        if (!path.length) { path.push(j); visited.add(j); play('move'); return render(); }
        if (!tourMoves(path[path.length - 1], visited).includes(j)) return;
        path.push(j); visited.add(j); hint = -1; play('move');
        if (path.length === 64) play('game-end');
        render();
      }
      reset();
      return {};
    }

    const GAMES = { local: localGame, squares: squaresGame, coins: coinsGame, memory: memoryGame, tour: tourGame };

    // Internet qaytsa: o'yin davom etayotgan bo'lsa — faqat eslatma (o'yin yo'qolmasin), bosh menyuda — sahifani yangilash
    window.addEventListener('online', () => {
      if (stage.hidden) { location.reload(); return; }
      $('ogOnline').hidden = false;
    });
    renderHome();
  }

  return Object.assign({ boot }, logic);
});
