// 🎬 O'yinni ulashish: tugagan o'yin GIF animatsiya (barcha yurishlar) yoki rasm (yakuniy pozitsiya, Instagram uchun 4:5) bo'lib
// brauzerda yasaladi va Telegram/Instagram'ga yuboriladi. Ulashish matnida o'yinchining taklif havolasi (/?invite=...).
// window.openGameShare({ moves: [SAN], variant, startFen, white: {name, rating}, black: {...}, result: '1-0'|'0-1'|'1/2-1/2'|'*', reason, myColor })
// Server ishtirok etmaydi. GIF kodlovchi — gifenc@1.0.3 (jsdelivr, faqat kerak bo'lganda yuklanadi).
(function () {
  const GIFENC = 'https://cdn.jsdelivr.net/npm/gifenc@1.0.3/dist/gifenc.esm.js';
  const MAX_PLIES = 240;
  let libPromise = null;
  const loadLib = () => libPromise || (libPromise = import(GIFENC).catch((e) => { libPromise = null; throw e; }));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const FONT = 'Inter, "Segoe UI", Arial, sans-serif';

  const REASONS = () => ({
    checkmate: tx('shCheckmate', 'Mat'), resign: tx('shResign', 'Taslim'), timeout: tx('shTimeout', 'Vaqt tugadi'),
    abandon: tx('shAbandon', "O'yindan chiqdi"), stalemate: tx('shStalemate', 'Pat'), threefold: tx('shThreefold', 'Uch marta takror'),
    fifty: tx('shFifty', '50 yurish qoidasi'), insufficient: tx('shInsufficient', 'Dona yetarli emas'), agreement: tx('shAgreement', 'Kelishilgan durrang')
  });

  // --- Pozitsiyalar: har yurishdan keyingi taxta + oxirgi yurish kataklari ---
  function positions(data) {
    const C = data.variant === 'chess960' && window.Chess960 ? window.Chess960 : window.Chess;
    const chess = data.startFen ? new C(data.startFen) : new C();
    const list = [{ board: chess.board(), last: null }];
    for (const san of (data.moves || []).slice(0, MAX_PLIES)) {
      const m = chess.move(san);
      if (!m) break;
      list.push({ board: chess.board(), last: [m.from, m.to] });
    }
    return list;
  }

  const imgCache = {};
  function pieceImages() {
    const codes = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];
    return Promise.all(codes.map(code => {
      const url = window.pieceUrl ? window.pieceUrl(code) : 'img/chesspieces/wikipedia/' + code + '.png';
      if (imgCache[url]) return imgCache[url].then(img => [code, img]);
      imgCache[url] = new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
      return imgCache[url].then(img => [code, img]);
    })).then(Object.fromEntries);
  }

  function boardColors() {
    const css = getComputedStyle(document.documentElement);
    const v = (name, fb) => (css.getPropertyValue(name) || '').trim() || fb;
    return { light: v('--board-light', '#e3f1f1'), dark: v('--board-dark', '#4e9ea3'), accent: v('--accent', '#01ccd5') };
  }

  // --- Bitta kadr: tepada raqib, taxta, pastda o'yinchi, eng pastda ChessDom ---
  function layout(scale) {
    const s = scale || 1;
    const sq = 52 * s, bar = 46 * s, foot = 30 * s;
    return { s, sq, bar, foot, W: sq * 8, H: bar * 2 + sq * 8 + foot };
  }
  function fitText(ctx, text, max) {
    let t = String(text || '');
    while (t.length > 1 && ctx.measureText(t).width > max) t = t.slice(0, -1);
    return t === String(text || '') ? t : t.slice(0, -1) + '…';
  }
  function drawFrame(ctx, L, pos, data, final, imgs, col) {
    const { s, sq, bar, foot, W, H } = L;
    const bottom = data.myColor === 'b' ? 'b' : 'w';
    ctx.fillStyle = '#0d1b1e';
    ctx.fillRect(0, 0, W, H);
    const score = (c) => data.result === '1/2-1/2' ? '½' : data.result === '1-0' ? (c === 'w' ? '1' : '0') : data.result === '0-1' ? (c === 'b' ? '1' : '0') : '';
    const playerBar = (y, c) => {
      const p = (c === 'w' ? data.white : data.black) || {};
      ctx.fillStyle = c === 'w' ? '#f4f4f4' : '#1b1b1b';
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath(); ctx.arc(22 * s, y + bar / 2, 10 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${17 * s}px ${FONT}`;
      ctx.textBaseline = 'middle';
      const name = fitText(ctx, p.name || (c === 'w' ? tx('whiteText', 'Oq') : tx('blackText', 'Qora')), W - 150 * s);
      ctx.fillText(name, 42 * s, y + bar / 2);
      if (p.rating) {
        const nw = ctx.measureText(name).width;
        ctx.font = `500 ${14 * s}px ${FONT}`;
        ctx.fillStyle = '#9fb3ad';
        ctx.fillText('(' + p.rating + ')', 50 * s + nw, y + bar / 2);
      }
      if (final && score(c)) {
        const won = score(c) === '1';
        ctx.font = `800 ${20 * s}px ${FONT}`;
        ctx.fillStyle = won ? col.accent : '#9fb3ad';
        ctx.textAlign = 'right';
        ctx.fillText(score(c), W - 16 * s, y + bar / 2);
        ctx.textAlign = 'left';
      }
    };
    playerBar(0, bottom === 'w' ? 'b' : 'w');
    // Taxta
    const top = bar;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const br = bottom === 'w' ? r : 7 - r, bf = bottom === 'w' ? f : 7 - f; // board()[0] — 8-qator
        const name = 'abcdefgh'[bf] + (8 - br);
        const x = f * sq, y = top + r * sq;
        ctx.fillStyle = (r + f) % 2 ? col.dark : col.light;
        ctx.fillRect(x, y, sq, sq);
        if (pos.last && pos.last.includes(name)) { ctx.fillStyle = 'rgba(255, 210, 40, 0.42)'; ctx.fillRect(x, y, sq, sq); }
        const piece = pos.board[br][bf];
        if (piece) ctx.drawImage(imgs[piece.color + piece.type.toUpperCase()], x + sq * 0.04, y + sq * 0.04, sq * 0.92, sq * 0.92);
      }
    }
    playerBar(top + sq * 8, bottom);
    // Yakuniy kadr: natija yorlig'i
    if (final && data.result && data.result !== '*') {
      const label = data.result === '1/2-1/2' ? '½ – ½' : data.result.replace('-', ' – ');
      const reason = REASONS()[data.reason] || '';
      const bw = 210 * s, bh = (reason ? 86 : 64) * s, bx = (W - bw) / 2, by = top + (sq * 8 - bh) / 2;
      ctx.fillStyle = 'rgba(8, 18, 20, 0.94)';
      roundRect(ctx, bx, by, bw, bh, 16 * s); ctx.fill();
      ctx.strokeStyle = col.accent; ctx.lineWidth = 2 * s; ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${32 * s}px ${FONT}`;
      ctx.fillText(label, W / 2, by + (reason ? 34 : 32) * s);
      if (reason) { ctx.font = `600 ${15 * s}px ${FONT}`; ctx.fillStyle = '#b8c7c0'; ctx.fillText(reason, W / 2, by + 64 * s); }
      ctx.textAlign = 'left';
    }
    // ChessDom
    const fy = top + sq * 8 + bar;
    ctx.fillStyle = '#081113';
    ctx.fillRect(0, fy, W, foot);
    ctx.font = `800 ${15 * s}px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Chess', 14 * s, fy + foot / 2);
    const cw = ctx.measureText('Chess').width;
    ctx.fillStyle = col.accent;
    ctx.fillText('Dom', 14 * s + cw, fy + foot / 2);
    ctx.font = `500 ${12 * s}px ${FONT}`;
    ctx.fillStyle = '#8fa29a';
    ctx.textAlign = 'right';
    ctx.fillText(location.host, W - 14 * s, fy + foot / 2);
    ctx.textAlign = 'left';
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // --- GIF: barcha yurishlar (bitta umumiy palitra — kichik fayl, tez) ---
  async function makeGif(data, onProgress, isCancelled) {
    const [{ GIFEncoder, quantize, applyPalette }, imgs] = await Promise.all([loadLib(), pieceImages()]);
    const list = positions(data);
    const L = layout(1);
    const canvas = document.createElement('canvas');
    canvas.width = L.W; canvas.height = L.H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const col = boardColors();
    const grab = (i, final) => { drawFrame(ctx, L, list[i], data, final, imgs, col); return ctx.getImageData(0, 0, L.W, L.H).data; };
    const a = grab(0, false), b = grab(list.length - 1, true);
    const both = new Uint8ClampedArray(a.length + b.length); both.set(a); both.set(b, a.length);
    const palette = quantize(both, 128);
    const gif = GIFEncoder();
    const moves = list.length - 1;
    const step = Math.max(220, Math.min(700, Math.round(16000 / Math.max(1, moves))));
    for (let i = 0; i < list.length; i++) {
      if (isCancelled && isCancelled()) return null;
      const final = i === list.length - 1;
      const px = final ? b : (i === 0 ? a : grab(i, false));
      gif.writeFrame(applyPalette(px, palette), L.W, L.H, { palette: i === 0 ? palette : undefined, delay: final ? 3500 : (i === 0 ? 1000 : step) });
      if (i % 6 === 0) { onProgress && onProgress(i / list.length); await new Promise(r => setTimeout(r)); }
    }
    gif.finish();
    return new Blob([gif.bytes()], { type: 'image/gif' });
  }

  // --- Rasm: yakuniy pozitsiya, 1040×1355 (Instagram 4:5 ga yaqin) ---
  async function makeImage(data) {
    const imgs = await pieceImages();
    const list = positions(data);
    const L = layout(2.5);
    const canvas = document.createElement('canvas');
    canvas.width = L.W; canvas.height = L.H;
    drawFrame(canvas.getContext('2d'), L, list[list.length - 1], data, true, imgs, boardColors());
    return new Promise(r => canvas.toBlob(r, 'image/png'));
  }

  // --- Ulashish oynasi ---
  const st = { data: null, kind: 'gif', blobs: {}, urls: {}, token: 0, invite: null };
  let modalEl = null;
  function modal() {
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.className = 'inv-modal sh-modal';
      modalEl.addEventListener('click', (e) => { if (e.target === modalEl) close(); });
      document.body.appendChild(modalEl);
    }
    modalEl.style.display = 'flex';
    return modalEl;
  }
  function close() {
    if (modalEl) modalEl.style.display = 'none';
    st.token++;
    Object.values(st.urls).forEach(u => URL.revokeObjectURL(u));
    st.urls = {}; st.blobs = {};
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalEl && modalEl.style.display === 'flex') close(); });

  function shareText() {
    const d = st.data, me = window.currentUser && window.currentUser.username;
    const myColor = d.myColor || (me && d.black && d.black.name === me ? 'b' : 'w');
    const opp = (myColor === 'w' ? d.black : d.white) || {};
    const won = (d.result === '1-0' && myColor === 'w') || (d.result === '0-1' && myColor === 'b');
    const line = won && opp.name
      ? tx('shTextWin', "♞ ChessDom'da {{name}} ustidan g'alaba qozondim!", { name: opp.name })
      : tx('shTextGame', "♞ ChessDom'dagi o'yinim: {{white}} — {{black}}", { white: (d.white && d.white.name) || '?', black: (d.black && d.black.name) || '?' });
    return line + (st.invite ? '\n' + tx('shTextInvite', "Men bilan o'ynab ko'ring:") : '');
  }
  const fileName = (kind) => `chessdom-${((st.data.white && st.data.white.name) || 'white')}-vs-${((st.data.black && st.data.black.name) || 'black')}.${kind === 'gif' ? 'gif' : 'png'}`.replace(/[^\w.-]+/g, '_');

  function render(progress) {
    const el = modal();
    const url = st.urls[st.kind];
    const canShareFile = !!(url && navigator.canShare && navigator.canShare({ files: [new File([st.blobs[st.kind]], fileName(st.kind), { type: st.blobs[st.kind].type })] }));
    const link = st.invite || location.origin;
    el.innerHTML = `<div class="inv-card sh-card">
        <button class="inv-x" data-close>✕</button>
        <h3>📤 ${esc(tx('shTitle', "O'yinni ulashish"))}</h3>
        <div class="inv-clocks sh-kinds">
          <button class="${st.kind === 'gif' ? 'active' : ''}" data-kind="gif">🎬 GIF</button>
          <button class="${st.kind === 'png' ? 'active' : ''}" data-kind="png">🖼 ${esc(tx('shImage', 'Rasm'))}</button>
        </div>
        <div class="sh-preview">${url ? `<img src="${url}" alt="">` : `<div class="sh-wait"><div class="sh-bar"><i style="width:${Math.round((progress || 0) * 100)}%"></i></div><small>${esc(tx('shMaking', 'Tayyorlanmoqda...'))}</small></div>`}</div>
        ${url ? `<div class="inv-actions">
          ${canShareFile ? `<button class="inv-btn" data-share>📤 ${esc(tx('invShare', 'Ulashish'))}</button>` : ''}
          <button class="inv-btn ${canShareFile ? 'ghost' : ''}" data-download>⬇ ${esc(tx('shDownload', 'Yuklab olish'))}</button>
          <a class="inv-btn tg" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText())}">✈️ Telegram</a>
        </div>
        <p class="sh-hint">${esc(canShareFile ? tx('shHintMobile', "«Ulashish» — Telegram, Instagram story yoki istalgan ilovaga to'g'ridan-to'g'ri.") : tx('shHintDesktop', "Faylni yuklab oling va Telegram yoki Instagram'ga tashlang. «Telegram» tugmasi esa taklif havolangizni yuboradi."))}</p>` : ''}
      </div>`;
    el.querySelector('[data-close]').onclick = close;
    el.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => { st.kind = b.dataset.kind; build(); });
    const dl = el.querySelector('[data-download]');
    if (dl) dl.onclick = () => { const a = document.createElement('a'); a.href = url; a.download = fileName(st.kind); document.body.appendChild(a); a.click(); a.remove(); };
    const sh = el.querySelector('[data-share]');
    if (sh) sh.onclick = () => {
      const file = new File([st.blobs[st.kind]], fileName(st.kind), { type: st.blobs[st.kind].type });
      navigator.share({ files: [file], text: shareText() + (st.invite ? ' ' + st.invite : '') }).catch(() => {});
    };
  }

  async function build() {
    const kind = st.kind, token = ++st.token;
    if (st.urls[kind]) return render();
    render(0);
    try {
      const blob = kind === 'gif'
        ? await makeGif(st.data, (p) => { if (token === st.token) render(p); }, () => token !== st.token)
        : await makeImage(st.data);
      if (!blob || token !== st.token) return;
      st.blobs[kind] = blob;
      st.urls[kind] = URL.createObjectURL(blob);
      render();
    } catch (err) {
      if (token !== st.token) return;
      console.error('Ulashish rasmi xatoligi:', err);
      close();
      showToast(tx('shFailed', "Rasmni tayyorlab bo'lmadi. Internetni tekshirib, qayta urinib ko'ring."), 'warning');
    }
  }

  window.openGameShare = function (data) {
    if (!data || !data.moves || !data.moves.length) { showToast(tx('noMovesYet', "Hali hech qanday yurish yo'q!"), 'warning'); return; }
    close();
    st.data = data;
    st.kind = 'gif';
    st.invite = null;
    build();
    // Ulashish matniga o'yinchining taklif havolasi (bor bo'lsa)
    if (window.authToken) {
      fetch('/api/invite', { headers: { Authorization: 'Bearer ' + window.authToken } }).then(r => r.json()).then(d => {
        if (d && d.success) { st.invite = d.url; if (modalEl && modalEl.style.display === 'flex' && st.urls[st.kind]) render(); }
      }).catch(() => {});
    }
  };
  // Testlar va oldindan ko'rish uchun
  window.gameShareRender = { makeGif, makeImage };
})();
