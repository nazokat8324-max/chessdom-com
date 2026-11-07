// ⚽ Shaxmat-futbol sahifasi (2026-11-07; foydalanuvchining prototipidan): /futbol — lobbi (onlayn stol ochish, ochiq stollar,
// jonli o'yinlar, qoidalar), /futbol?t=KOD — onlayn stol (har harakat serverda tekshiriladi: footchess-server.js, fc-* hodisalar),
// /futbol?m=local — bir qurilmada 2 kishi (serverga hech narsa ketmaydi). Qoidalar — footchess.js (window.FootChess).
// Donalar: o'yinchi davlati bayrog'i ustida saytdagi dona to'plami rasmi; bir davlat — ikkinchi jamoa mehmon formasida;
// davlatsiz — oddiy oq / to'q forma. Natija hech qayerga yozilmaydi. fc-* klasslar, fc* kalitlar.
(function () {
  const F = window.FootChess;
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = (k, d, o) => (typeof tx === 'function' ? tx(k, d, o) : d);
  const emit = (ev, data) => new Promise((r) => { if (typeof socket === 'undefined') return r(null); socket.emit(ev, data, r); });
  const root = () => document.getElementById('footRoot');
  const toast = (m, t) => { if (typeof showToast === 'function') showToast(m, t || 'info'); };
  const flagUrl = (code) => 'https://flagcdn.com/w80/' + encodeURIComponent(String(code).toLowerCase()) + '.png';
  const PIECE = { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: 'P' };
  const pieceSrc = (side, kind) => (window.pieceUrl ? window.pieceUrl(side + PIECE[kind]) : 'img/chesspieces/karvon/' + side + PIECE[kind] + '.svg');
  const pieceName = (kind) => ({ k: T('pcKing', 'Shoh'), q: T('promoQueen', 'Farzin'), r: T('promoRook', 'Rux'), b: T('promoBishop', 'Fil'), n: T('promoKnight', 'Ot'), p: T('pcPawn', 'Piyoda') }[kind]);
  const countryLabel = (code) => (code && typeof window.countryNameByCode === 'function' ? window.countryNameByCode(code) : null) || (code ? String(code).toUpperCase() : '');

  // mode: null (lobbi) | 'online' | 'local'
  const st = { mode: null, code: null, state: null, myColor: null, receivedAt: 0, sel: null, kmode: 'kick', busy: false, pending: false, tick: null,
    local: null, localCfg: { w: null, b: null }, lastSeq: -1, overlayShown: null };
  const setPlaying = (on) => { const v = document.getElementById('footView'); if (v) v.classList.toggle('fc-playing', !!on); };

  // ---------- Jamoalar va forma ----------
  // teams() → { w: {name, country, kit}, b: {...} }; kit: 'flag' | 'away' | 'plain'
  function teams() {
    const pl = st.mode === 'online' && st.state ? st.state.players : null;
    const c = pl ? { w: pl.w && pl.w.country, b: pl.b && pl.b.country } : { w: st.localCfg.w, b: st.localCfg.b };
    const out = {};
    for (const s of ['w', 'b']) {
      const name = pl ? ((pl[s] && pl[s].username) || '—') : (c[s] ? countryLabel(c[s]) : (s === 'w' ? T('fcTeamW', 'Oq jamoa') : T('fcTeamB', 'Qora jamoa')));
      out[s] = { name, country: c[s] || null, kit: c[s] ? 'flag' : 'plain' };
    }
    if (c.w && c.w === c.b) out.b.kit = 'away';
    return out;
  }
  function kitHtml(tm, side) {
    if (tm.kit === 'flag') return `<span class="fc-kit kit-flag kit-${side}"><img src="${esc(flagUrl(tm.country))}" alt="" draggable="false"></span>`;
    if (tm.kit === 'away') return `<span class="fc-kit kit-away kit-${side}"><img class="fc-badge" src="${esc(flagUrl(tm.country))}" alt="" draggable="false"></span>`;
    return `<span class="fc-kit kit-plain kit-${side}"></span>`;
  }
  const teamFlag = (tm, side) => (tm.country ? `<img class="fc-tflag" src="${esc(flagUrl(tm.country))}" alt="">` : `<span class="fc-tdot ${side}"></span>`);

  // ---------- Holat ----------
  const S = () => (st.mode === 'online' ? st.state && st.state.st : st.local);
  const myTurn = () => {
    const s = S();
    if (!s || st.busy) return false;
    if (st.mode === 'local') return true;
    return !!(st.state && st.state.status === 'active' && st.myColor === s.turn && !st.pending);
  };
  function targets() {
    const s = S();
    if (!st.sel || !s) return [];
    const p = F.byId(s, st.sel);
    if (!p) return [];
    if (s.ball.h === p.id) return st.kmode === 'kick' ? F.kicks(s, p) : F.moves(s, p);
    const t = F.tackle(s, p);
    return F.moves(s, p).concat(t ? [t] : []);
  }

  function describe(ev, tm) {
    if (!ev || !ev.a) return '';
    const p = ev.p, team = tm[p.side].name, piece = pieceName(p.kind);
    if (ev.goal) return ev.own ? T('fcEvOwn', "O'z darvozasiga gol! {{team}}: {{piece}} xato qildi.", { team, piece }) : T('fcEvGoal', 'GOL! {{team}}: {{piece}} zarba berdi!', { team, piece });
    if (ev.tackle) return T('fcEvTackle', "{{team}}: {{piece}} to'pni tortib oldi!", { team, piece });
    if (ev.a.t === 'kick') {
      if (ev.recv) return ev.intercept ? T('fcEvIntercept', "To'p ushlab qolindi: {{team}} — {{piece}}.", { team: tm[ev.recv.side].name, piece: pieceName(ev.recv.kind) })
        : T('fcEvPass', 'Pas: {{from}} → {{to}}.', { from: piece, to: pieceName(ev.recv.kind) });
      return T('fcEvKick', "{{team}}: {{piece}} to'pni tepdi.", { team, piece });
    }
    if (ev.promo) return T('fcEvPromo', '{{team}}: piyoda oxirgi qatorga yetib, farzinga aylandi!', { team });
    if (ev.pick) return T('fcEvPick', "{{team}}: {{piece}} to'pni oldi.", { team, piece });
    return T('fcEvMove', '{{team}}: {{piece}} yurdi.', { team, piece });
  }

  // ---------- Lobbi ----------
  async function renderLobby() {
    const el = root();
    if (!el) return;
    setPlaying(false);
    el.innerHTML = `<section class="fc-hero">
        <span class="tea-kicker">⚽ ${esc(T('teaKicker', 'Faqat ChessCaravan da'))}</span>
        <h1>${esc(T('fcTitle', 'Shaxmat-futbol'))}</h1>
        <p>${esc(T('fcLead', "Donalar shaxmatdagi kabi yuradi, lekin hech kimni yemaydi: to'pni oling, pas bering va raqib darvozasiga gol uring. 3 ta gol urgan jamoa yutadi."))}</p>
        <div class="fc-actions">
          <button type="button" class="fc-btn" data-fc-create>🌐 ${esc(T('fcNewOnline', 'Onlayn stol ochish'))}</button>
          <button type="button" class="fc-btn ghost" data-fc-local>👥 ${esc(T('fcLocal', 'Bir qurilmada 2 kishi'))}</button>
        </div>
      </section>
      <div class="fc-lists">
        <section class="fc-box"><h2>${esc(T('fcOpenTables', 'Ochiq stollar'))}</h2><div id="fcWaiting"><p class="fc-muted">…</p></div></section>
        <section class="fc-box"><h2>${esc(T('fcLiveGames', "Hozir o'ynalmoqda"))}</h2><div id="fcLive"><p class="fc-muted">…</p></div></section>
      </div>
      ${rulesHtml()}`;
    el.querySelector('[data-fc-create]').onclick = createTable;
    el.querySelector('[data-fc-local]').onclick = () => window.openFootChess('local');
    const r = await emit('fc-list', {});
    const w = document.getElementById('fcWaiting'), l = document.getElementById('fcLive');
    if (!w || !l || st.mode !== null) return;
    const flag = (p) => (p && p.country ? `<img class="fc-tflag" src="${esc(flagUrl(p.country))}" alt="">` : '');
    const waiting = (r && r.waiting) || [], live = (r && r.live) || [];
    const mine = (t) => window.currentUser && t.host && t.host.username === window.currentUser.username;
    w.innerHTML = waiting.length ? waiting.map((t) => `<div class="fc-row">${flag(t.host)}<span class="fc-row-name">${esc(t.host ? t.host.username : '—')}</span>
        <button type="button" class="fc-btn small" data-fc-open="${esc(t.code)}">${esc(mine(t) ? T('fcMyTable', 'Mening stolim') : T('fcJoin', "O'ynash"))}</button></div>`).join('')
      : `<p class="fc-muted">${esc(T('fcNoTables', "Hozircha ochiq stol yo'q — birinchi bo'lib oching!"))}</p>`;
    l.innerHTML = live.length ? live.map((t) => `<div class="fc-row">${flag(t.players.w)}<span class="fc-row-name">${esc(t.players.w ? t.players.w.username : '—')}</span>
        <b class="fc-row-score">${t.score.w} : ${t.score.b}</b><span class="fc-row-name r">${esc(t.players.b ? t.players.b.username : '—')}</span>${flag(t.players.b)}
        <button type="button" class="fc-btn small ghost" data-fc-open="${esc(t.code)}">👁 ${esc(T('fcWatch', 'Tomosha'))}</button></div>`).join('')
      : `<p class="fc-muted">${esc(T('fcNoLive', "Hozir hech kim o'ynamayapti."))}</p>`;
    el.querySelectorAll('[data-fc-open]').forEach((b) => b.onclick = () => openTable(b.dataset.fcOpen));
  }
  async function openTable(code) {
    const r = await emit('fc-watch', { code });
    if (!r || !r.ok) { toast(T('fcNotFound', 'Stol topilmadi yoki yopilgan'), 'warning'); return window.openFootChess(null); }
    // Kutayotgan begona stol — darhol qo'shilamiz
    if (r.state.status === 'waiting' && !r.myColor && window.currentUser && r.state.players.w && r.state.players.w.username !== window.currentUser.username) {
      const j = await emit('fc-join', { code });
      if (!j || !j.ok) { toast(reasonText(j && j.reason), 'warning'); return window.openFootChess(null); }
      return window.openFootChess(code);
    }
    window.openFootChess(code);
  }
  function reasonText(reason) {
    if (reason === 'busy') return T('arErrInGame', "Avval joriy o'yiningizni tugating.");
    if (reason === 'blocked') return T('fcBlocked', "Bu o'yinchi bilan o'ynab bo'lmaydi.");
    if (reason === 'started') return T('fcStartedAlready', 'Bu stolda o\'yin allaqachon boshlangan.');
    return T('fcNotFound', 'Stol topilmadi yoki yopilgan');
  }
  async function createTable() {
    if (!window.currentUser) return;
    const r = await emit('fc-create', {});
    if (r && r.ok) window.openFootChess(r.code);
    else toast(reasonText(r && r.reason), 'warning');
  }
  function rulesHtml() {
    const li = (k, d) => `<li>${esc(T(k, d))}</li>`;
    const kick = (kind, k, d) => `<li><img class="fc-rule-pc" src="${esc(pieceSrc('w', kind))}" alt=""><span><b>${esc(pieceName(kind))}</b> — ${esc(T(k, d))}</span></li>`;
    return `<div class="fc-rules">
      <section class="fc-box"><h2>${esc(T('fcRulesH', 'Qoidalar'))}</h2><ol>
        ${li('fcRule1', "Har navbatda bitta harakat: dona yurishi, zarba yoki to'pni tortib olish.")}
        ${li('fcRule2', "Donalar shaxmatdagi kabi yuradi, faqat bo'sh kataklarga. Piyoda oldinga yoki qiya oldinga 1 katak yuradi va oxirgi qatorga yetsa, farzinga aylanadi.")}
        ${li('fcRule3', "Bo'sh turgan to'p katagiga chiqqan dona to'pni oladi.")}
        ${li('fcRule4', "Zarba berilgan to'p o'z donalaringiz ustidan o'tib ketadi; pas berish uchun to'pni sherigingiz katagiga yo'naltiring. Yo'lda turgan birinchi raqib donasi to'pni ushlab qoladi.")}
        ${li('fcRule5', "Raqibning to'pli donasini shaxmatdagi kabi «ura olsangiz», to'pni tortib olasiz. Donalar joyida qoladi. To'pni yo'qotgan dona keyingi navbatda uni darhol qaytarib ololmaydi.")}
        ${li('fcRule6', "Darvoza — maydon chetidagi 5 ta katak. Har jamoada 7 ta dona. 3 ta gol yoki 100 ta yurishdan keyin o'yin tugaydi.")}
        ${li('fcRule7', "Onlayn o'yinda har navbatga 60 soniya: vaqt tugasa navbat raqibga o'tadi, ketma-ket 3 marta tugasa — mag'lubiyat. Natija reytingga yozilmaydi.")}
      </ol></section>
      <section class="fc-box"><h2>${esc(T('fcKicksH', "Kim to'pni qanday tepadi"))}</h2><ul class="fc-kicks">
        ${kick('r', 'fcKickR', "to'g'ri chiziq bo'ylab, istalgan masofaga.")}
        ${kick('b', 'fcKickB', "diagonal bo'ylab.")}
        ${kick('q', 'fcKickQ', "to'g'ri va diagonal bo'ylab.")}
        ${kick('n', 'fcKickN', "«L» shaklida, donalar ustidan oshirib.")}
        ${kick('p', 'fcKickP', 'oldinga 3 katakkacha yoki qiya oldinga 2 katakkacha.')}
        ${kick('k', 'fcKickK', "darvozabon: istalgan tomonga 2 katakkacha.")}
      </ul></section>
    </div>`;
  }

  // ---------- Maydon ----------
  const pos = (x, y) => `left:calc(100% * ${x + 1} / 13);top:calc(100% * ${y} / 7)`;
  function gameShell() {
    const el = root();
    const local = st.mode === 'local';
    const opts = (sel) => `<option value="">${esc(T('fcNoFlag', 'Bayroqsiz'))}</option>` + (typeof allCountries !== 'undefined' ? allCountries : [])
      .map((c) => ({ code: String(c.code).toLowerCase(), name: countryLabel(String(c.code).toLowerCase()) || c.name }))
      .sort((a, b) => a.name.localeCompare(b.name)).map((c) => `<option value="${esc(c.code)}"${c.code === sel ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
    el.innerHTML = `<div class="fc-game">
      <header class="fc-head"><h1 class="sr-only">${esc(T('fcTitle', 'Shaxmat-futbol'))}</h1>
        <button type="button" class="ps-back" data-fc-back>← ${esc(T('fcTitle', 'Shaxmat-futbol'))}</button>
        ${local ? `<div class="fc-pick">
          <label>${esc(T('fcTeam1', '1-jamoa'))}<select id="fcSelW" aria-label="${esc(T('fcTeam1', '1-jamoa'))}">${opts(st.localCfg.w)}</select></label>
          <label>${esc(T('fcTeam2', '2-jamoa'))}<select id="fcSelB" aria-label="${esc(T('fcTeam2', '2-jamoa'))}">${opts(st.localCfg.b)}</select></label>
          <button type="button" class="fc-btn small" data-fc-new>${esc(T('fcNewGame', "Yangi o'yin"))}</button></div>`
          : `<div class="fc-head-actions" id="fcHeadActions"></div>`}
      </header>
      <div class="fc-card">
        <div class="fc-scorebar"><div class="fc-team" id="fcTW"></div><div class="fc-score" id="fcScore">0 : 0</div><div class="fc-team r" id="fcTB"></div></div>
        <div class="fc-meta"><span id="fcTurn"></span><span id="fcClock"></span><span id="fcMoves"></span></div>
        <div class="fc-pitch-wrap" id="fcWrap"><div class="fc-pitch" id="fcPitch">
          <div class="fc-net l"></div><div class="fc-net r"></div>
          <div class="fc-field"><div class="fc-mark mid"></div><div class="fc-mark circle"></div><div class="fc-mark box l"></div><div class="fc-mark box r"></div></div>
        </div></div>
        <div class="fc-kickbar" id="fcKickbar" hidden><span>${esc(T('fcBallYours', "To'p sizda:"))}</span>
          <button type="button" data-km="kick">⚽ ${esc(T('fcKickMode', 'Zarba / pas'))}</button>
          <button type="button" data-km="move">${esc(T('fcMoveMode', "To'p bilan yurish"))}</button></div>
        <div class="fc-ticker" aria-live="polite"><span class="fc-mic">${esc(T('fcMic', 'SHARH'))}</span><span id="fcTicker"></span></div>
        <div class="fc-legend">
          <span><i class="fc-lg move"></i>${esc(T('fcLegMove', 'yurish'))}</span><span><i class="fc-lg kick"></i>${esc(T('fcLegKick', 'zarba'))}</span>
          <span><i class="fc-lg pass"></i>${esc(T('fcLegPass', 'pas'))}</span><span><i class="fc-lg tackle"></i>${esc(T('fcLegTackle', "to'pni tortib olish"))}</span>
        </div>
      </div>
      ${rulesHtml()}
    </div>`;
    const pitch = document.getElementById('fcPitch');
    let cells = '';
    for (let y = 0; y < 7; y++) for (let x = -1; x <= 11; x++) {
      const goal = x === -1 || x === 11;
      if (goal && (y < 1 || y > 5)) continue;
      const label = goal ? T('fcCellGoal', 'Darvoza, {{n}}-qator', { n: y + 1 }) : T('fcCell', 'Katak {{x}}, {{y}}', { x: x + 1, y: y + 1 });
      cells += `<button type="button" class="fc-cell" data-x="${x}" data-y="${y}" style="${pos(x, y)}" aria-label="${esc(label)}"></button>`;
    }
    pitch.insertAdjacentHTML('beforeend', cells + '<div class="fc-ball" id="fcBall"></div>');
    pitch.addEventListener('click', (e) => { const c = e.target.closest('.fc-cell'); if (c) clickCell(Number(c.dataset.x), Number(c.dataset.y)); });
    el.querySelector('[data-fc-back]').onclick = () => window.openFootChess(null);
    el.querySelectorAll('[data-km]').forEach((b) => b.onclick = () => { st.kmode = b.dataset.km; render(); });
    if (local) {
      const pick = () => { st.localCfg.w = document.getElementById('fcSelW').value || null; st.localCfg.b = document.getElementById('fcSelB').value || null; saveLocalCfg(); startLocal(); };
      document.getElementById('fcSelW').onchange = pick;
      document.getElementById('fcSelB').onchange = pick;
      el.querySelector('[data-fc-new]').onclick = startLocal;
    }
    st.pieceEls = {};
  }

  function render() {
    const s = S();
    const pitch = document.getElementById('fcPitch');
    if (!pitch) return;
    const tm = teams();
    // Kutish holati (onlayn stol hali to'lmagan)
    if (st.mode === 'online' && st.state && st.state.status === 'waiting') renderWaiting();
    else { const w = document.getElementById('fcWaitBox'); if (w) w.remove(); }
    if (!s) return;
    setPlaying(st.mode === 'online' ? st.state.status === 'active' && !!st.myColor : true);
    // Telefonda maydon tik holatda: o'z darvozangiz pastda (qora o'yinchi uchun teskari)
    pitch.classList.toggle('fc-flip', st.myColor === 'b');
    // Donalar
    const seen = new Set();
    for (const p of s.pcs) {
      seen.add(p.id);
      let e = st.pieceEls[p.id];
      const key = p.kind + '|' + tm[p.side].kit + '|' + tm[p.side].country;
      if (!e) { e = document.createElement('div'); e.className = 'fc-pc'; pitch.appendChild(e); st.pieceEls[p.id] = e; }
      if (e.dataset.key !== key) {
        e.dataset.key = key;
        e.innerHTML = kitHtml(tm[p.side], p.side) + `<img class="fc-pimg" src="${esc(pieceSrc(p.side, p.kind))}" alt="" draggable="false">`;
      }
      e.title = pieceName(p.kind) + ' — ' + tm[p.side].name;
      e.style.cssText = pos(p.x, p.y);
      e.classList.toggle('sel', st.sel === p.id);
      e.classList.toggle('side-b', p.side === 'b');
    }
    for (const id of Object.keys(st.pieceEls)) if (!seen.has(id)) { st.pieceEls[id].remove(); delete st.pieceEls[id]; }
    const h = s.ball.h && F.byId(s, s.ball.h);
    const bx = h ? h.x : s.ball.x, by = h ? h.y : s.ball.y;
    const ball = document.getElementById('fcBall');
    ball.style.left = `calc(100% * ${bx + 1} / 13 + 100% / 13 * ${h ? 0.62 : 0.35})`;
    ball.style.top = `calc(100% * ${by} / 7 + 100% / 7 * ${h ? 0.58 : 0.3})`;
    // Nishonlar
    pitch.querySelectorAll('.fc-cell').forEach((c) => { c.className = 'fc-cell'; });
    if (myTurn()) for (const a of targets()) {
      const c = pitch.querySelector(`.fc-cell[data-x="${a.x}"][data-y="${a.y}"]`);
      if (!c) continue;
      c.classList.add('t', a.t === 'tackle' ? 't-tackle' : a.t === 'kick' ? (a.goal ? 't-goal' : a.to ? 't-pass' : 't-kick') : 't-move');
    }
    // Hisob tablosi
    const teamHtml = (side) => `${teamFlag(tm[side], side)}<span class="fc-nm">${esc(tm[side].name)}</span>${st.myColor === side ? `<span class="fc-you">${esc(T('fcYou', 'siz'))}</span>` : ''}`;
    const tw = document.getElementById('fcTW'), tb = document.getElementById('fcTB');
    tw.innerHTML = teamHtml('w'); tb.innerHTML = teamHtml('b');
    tw.classList.toggle('active', s.turn === 'w'); tb.classList.toggle('active', s.turn === 'b');
    document.getElementById('fcScore').textContent = s.score.w + ' : ' + s.score.b;
    document.getElementById('fcMoves').textContent = T('fcMoves', 'Yurish {{n}} / {{max}}', { n: s.moves, max: F.MAXM });
    const turnEl = document.getElementById('fcTurn');
    const over = st.mode === 'online' ? st.state.status === 'over' : st.localOver;
    turnEl.innerHTML = over ? '' : esc(T('fcTurn', 'Navbat:')) + ' <b>' + esc(tm[s.turn].name) + '</b>' + (st.mode === 'online' && st.myColor && st.myColor !== s.turn && st.state.status === 'active' ? ' · ' + esc(T('fcOppTurn', 'raqib o\'ylayapti…')) : '');
    tickClock();
    const holder = st.sel && s.ball.h === st.sel && myTurn();
    const kb = document.getElementById('fcKickbar');
    kb.hidden = !holder;
    kb.querySelectorAll('[data-km]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.km === st.kmode)));
    renderHeadActions();
  }
  function tickClock() {
    const el = document.getElementById('fcClock');
    if (!el) return;
    if (st.mode !== 'online' || !st.state || st.state.status !== 'active') { el.textContent = ''; return; }
    const left = Math.max(0, st.state.moveLeft - (Date.now() - st.receivedAt));
    const sec = Math.ceil(left / 1000);
    el.textContent = '⏱ ' + sec + ' s';
    el.classList.toggle('warn', sec <= 10);
  }
  function renderHeadActions() {
    const box = document.getElementById('fcHeadActions');
    if (!box || st.mode !== 'online' || !st.state) return;
    const s = st.state;
    const want = s.status === 'active' && st.myColor ? 'resign' : s.status === 'waiting' && st.myColor ? 'wait' : '';
    if (box.dataset.want === want) return;
    box.dataset.want = want;
    box.innerHTML = want === 'resign' ? `<button type="button" class="fc-btn small ghost" data-fc-resign>🏳️ ${esc(T('fcResign', 'Taslim'))}</button>` : '';
    const r = box.querySelector('[data-fc-resign]');
    if (r) r.onclick = async () => { if (confirm(T('fcResignConfirm', "Rostdan taslim bo'lasizmi?"))) await emit('fc-resign', { code: st.code }); };
  }
  function renderWaiting() {
    const pitch = document.getElementById('fcWrap');
    if (!pitch || document.getElementById('fcWaitBox')) return;
    const link = location.origin + '/futbol?t=' + st.code;
    const o = document.createElement('div');
    o.className = 'fc-overlay';
    o.id = 'fcWaitBox';
    o.innerHTML = `<div class="fc-big small">⏳</div><p>${esc(T('fcWaiting', 'Raqib kutilmoqda…'))}</p>
      <p class="fc-muted">${esc(T('fcWaitHint', "Havolani do'stingizga yuboring yoki kimdir ochiq stollardan qo'shilishini kuting."))}</p>
      <div class="fc-row-btns">${st.myColor ? `<button type="button" class="fc-btn small" data-fc-copy>🔗 ${esc(T('tmCopyLink', 'Havolani nusxalash'))}</button>
      <button type="button" class="fc-btn small ghost" data-fc-cancel>${esc(T('fcCancel', 'Stolni yopish'))}</button>` : ''}</div>`;
    pitch.appendChild(o);
    const cp = o.querySelector('[data-fc-copy]');
    if (cp) cp.onclick = () => { try { navigator.clipboard.writeText(link); toast(T('fcCopied', 'Havola nusxalandi'), 'success'); } catch (e) { /* eslatma shart emas */ } };
    const cn = o.querySelector('[data-fc-cancel]');
    if (cn) cn.onclick = async () => { await emit('fc-leave', { code: st.code }); window.openFootChess(null); };
  }
  function overlay(html, ms) {
    const pitch = document.getElementById('fcWrap');
    if (!pitch) return null;
    pitch.querySelectorAll('.fc-overlay.fc-flash').forEach((x) => x.remove());
    const o = document.createElement('div');
    o.className = 'fc-overlay' + (ms ? ' fc-flash' : '');
    o.innerHTML = html;
    pitch.appendChild(o);
    if (ms) setTimeout(() => o.remove(), ms);
    return o;
  }
  const say = (t) => { const el = document.getElementById('fcTicker'); if (el) el.textContent = t; };
  function goalFlash(scorer, score, tm) {
    overlay(`<div class="fc-big pop">${esc(T('fcGoal', 'GOL!'))}</div><p>${esc(tm[scorer].name)} · ${score.w} : ${score.b}</p>`, 1700);
    if (typeof playSound === 'function') playSound('check');
    if (typeof window.haptic === 'function') window.haptic([30, 40, 30]);
  }
  function finishOverlay(result, s, tm) {
    const winner = result.winner;
    const title = winner ? T('fcWin', '{{team}} YUTDI!', { team: tm[winner].name }) : T('fcDraw', 'DURRANG');
    const loser = winner ? tm[F.other(winner)].name : '';
    const why = { resign: T('fcRsResign', "{{team}} taslim bo'ldi.", { team: loser }), timeout: T('fcRsTimeout', '{{team}}: navbat vaqti ketma-ket 3 marta tugadi.', { team: loser }),
      abandon: T('fcRsAbandon', "{{team}} o'yindan chiqib ketdi.", { team: loser }), moves: T('fcRsMoves', '100 ta yurish tugadi.') }[result.reason] || '';
    const online = st.mode === 'online';
    const rem = online && st.state ? st.state.rematch || [] : [];
    const iAsked = st.myColor && rem.includes(st.myColor), oppAsked = st.myColor && rem.some((c) => c !== st.myColor);
    const btn = !online ? `<button type="button" class="fc-btn" data-fc-again>${esc(T('fcAgain', "Yana o'ynash"))}</button>`
      : st.myColor ? `<button type="button" class="fc-btn" data-fc-rematch ${iAsked ? 'disabled' : ''}>${esc(iAsked ? T('fcRematchWait', 'Raqib javobini kutyapmiz…') : oppAsked ? T('fcRematchAccept', 'Revanshni qabul qilish') : T('fcRematch', 'Revansh'))}</button>` : '';
    const o = overlay(`<div class="fc-big pop${winner && st.myColor && winner !== st.myColor ? ' lose' : ''}">${esc(title)}</div>
      <p>${esc(tm.w.name)} ${s.score.w} : ${s.score.b} ${esc(tm.b.name)}</p>${why ? `<p class="fc-muted">${esc(why)}</p>` : ''}
      <div class="fc-row-btns">${btn}<button type="button" class="fc-btn ghost" data-fc-lobby>${esc(T('fcToLobby', 'Stollarga qaytish'))}</button></div>`);
    o.classList.add('fc-final');
    const a = o.querySelector('[data-fc-again]');
    if (a) a.onclick = startLocal;
    const r = o.querySelector('[data-fc-rematch]');
    if (r) r.onclick = async () => { const x = await emit('fc-rematch', { code: st.code }); if (x && !x.ok && x.reason === 'busy') toast(reasonText('busy'), 'warning'); };
    o.querySelector('[data-fc-lobby]').onclick = () => window.openFootChess(null);
  }

  // ---------- Bosish ----------
  async function clickCell(x, y) {
    const s = S();
    if (!s || !myTurn()) return;
    const t = targets().find((a) => a.x === x && a.y === y);
    if (t) return act(t);
    const p = F.at(s, x, y);
    if (p && p.side === s.turn) {
      st.sel = st.sel === p.id ? null : p.id;
      st.kmode = 'kick';
      render();
      if (st.sel) say(s.ball.h === p.id ? T('fcHolding', "{{piece}} to'pni ushlab turibdi: zarba berish yoki to'p bilan yurishni tanlang.", { piece: pieceName(p.kind) }) : T('fcSelected', '{{piece}} tanlandi.', { piece: pieceName(p.kind) }));
      return;
    }
    if (st.sel) { st.sel = null; render(); }
  }
  async function act(a) {
    st.sel = null; st.kmode = 'kick';
    if (st.mode === 'local') return localStep(a);
    st.pending = true;
    render();
    const r = await emit('fc-move', { code: st.code, t: a.t, id: a.id, x: a.x, y: a.y });
    st.pending = false;
    if (!r || !r.ok) { toast(T('fcRejected', "Bu harakatni qilib bo'lmaydi."), 'warning'); render(); }
  }

  // ---------- Bir qurilmada 2 kishi ----------
  function loadLocalCfg() {
    try { const c = JSON.parse(localStorage.getItem('justChessFootLocal') || 'null'); if (c) return { w: c.w || null, b: c.b || null }; } catch (e) { /* bo'sh */ }
    const mine = window.currentUser && window.currentUser.country && window.currentUser.country !== 'un' ? window.currentUser.country : null;
    return { w: mine, b: null };
  }
  function saveLocalCfg() { try { localStorage.setItem('justChessFootLocal', JSON.stringify(st.localCfg)); } catch (e) { /* bo'sh */ } }
  function startLocal() {
    const pitch = document.getElementById('fcWrap');
    if (pitch) pitch.querySelectorAll('.fc-overlay').forEach((o) => o.remove());
    st.local = F.formation('w');
    st.localOver = false; st.busy = false; st.sel = null;
    render();
    say(T('fcKickoff', '{{team}} markazdan boshlaydi.', { team: teams().w.name }) + ' ' + T('fcSelectHint', "Piyodangiz to'pni ushlab turibdi — uni tanlang."));
  }
  function localStep(a) {
    const tm = teams();
    const r = F.step(st.local, a);
    say(describe(r.ev, tm));
    playMoveSound(r.ev);
    if (r.ev.goal) {
      // Avval to'p darvozada, keyin markaz
      st.local = F.apply(st.local, a).st;
      st.busy = true;
      render();
      goalFlash(r.ev.goal, r.st.score, tm);
      setTimeout(() => {
        st.busy = false;
        st.local = r.st;
        if (r.over) { st.localOver = true; render(); return finishOverlay({ winner: r.winner, reason: 'goals' }, r.st, tm); }
        render();
        say(T('fcKickoff', '{{team}} markazdan boshlaydi.', { team: tm[r.st.turn].name }));
      }, 1700);
      return;
    }
    st.local = r.st;
    if (r.over) { st.localOver = true; render(); return finishOverlay({ winner: r.winner, reason: 'moves' }, r.st, tm); }
    while (!F.actions(st.local, st.local.turn).length) st.local = F.step(st.local, null).st;
    render();
  }
  function playMoveSound(ev) {
    if (typeof playSound !== 'function' || !ev || !ev.a) return;
    playSound(ev.a.t === 'kick' || ev.tackle ? 'capture' : 'move');
  }

  // ---------- Onlayn holat ----------
  function applyState(s) {
    const prev = st.state;
    st.state = s; st.receivedAt = Date.now();
    if (window.currentUser) {
      const me = window.currentUser.username;
      st.myColor = s.players.w && s.players.w.username === me ? 'w' : s.players.b && s.players.b.username === me ? 'b' : null;
    }
    const tm = teams();
    const freshGame = prev && prev.status !== 'active' && s.status === 'active';
    if (freshGame || (!prev && s.status === 'active')) {
      const pitch = document.getElementById('fcWrap');
      if (pitch) pitch.querySelectorAll('.fc-overlay').forEach((o) => o.remove());
      st.overlayShown = null;
    }
    if (freshGame && st.myColor) toast('⚽ ' + (s.st.turn === st.myColor ? T('fcStartYou', "O'yin boshlandi! Siz boshlaysiz.") : T('fcStartOpp', "O'yin boshlandi! Raqib boshlaydi.")), 'success');
    if (!st.sel || !s.st || s.st.turn !== st.myColor) st.sel = null;
    render();
    if (prev && s.seq !== prev.seq && s.ev) {
      if (s.ev.timeout) say(T('fcEvTimeout', "{{team}}: vaqt tugadi — navbat o'tdi.", { team: tm[s.ev.timeout].name }));
      else if (s.ev.a) { say(describe(s.ev, tm)); playMoveSound(s.ev); if (s.ev.a && st.myColor && s.ev.p.side !== st.myColor && typeof window.haptic === 'function') window.haptic(15); }
      if (s.ev.goal) goalFlash(s.ev.goal, s.st.score, tm);
      if (s.kickoff && s.status === 'active') setTimeout(() => say(T('fcKickoff', '{{team}} markazdan boshlaydi.', { team: tm[s.kickoff].name })), 1800);
    } else if ((!prev || freshGame) && s.status === 'active') say(T('fcKickoff', '{{team}} markazdan boshlaydi.', { team: tm[s.st.turn].name }));
    if (s.status === 'over' && s.result) {
      const key = s.seq + ':' + (s.rematch || []).join(',');
      if (st.overlayShown !== key) {
        st.overlayShown = key;
        const pitch = document.getElementById('fcWrap');
        if (pitch) pitch.querySelectorAll('.fc-final').forEach((o) => o.remove());
        setTimeout(() => { if (st.state === s) finishOverlay(s.result, s.st, tm); }, s.ev && s.ev.goal && prev && prev.status === 'active' ? 1700 : 0);
        if (prev && prev.status === 'active' && typeof playSound === 'function') playSound('gameEnd');
      }
    }
  }
  async function watch(code) {
    const r = await emit('fc-watch', { code });
    if (st.code !== code) return;
    if (!r || !r.ok) { toast(T('fcNotFound', 'Stol topilmadi yoki yopilgan'), 'warning'); return window.openFootChess(null); }
    applyState(r.state);
  }

  // switchView('foot') chaqiradi
  window.updateFootView = function () {
    const q = location.pathname === '/futbol' ? new URLSearchParams(location.search) : new URLSearchParams();
    let want = st.pendingMode !== undefined ? st.pendingMode : (q.get('t') || (q.get('m') === 'local' ? 'local' : null));
    st.pendingMode = undefined;
    if (st.code && st.code !== want) emit('fc-unwatch', { code: st.code });
    clearInterval(st.tick);
    st.code = null; st.state = null; st.myColor = null; st.sel = null; st.busy = false; st.pending = false; st.overlayShown = null;
    if (!want) { st.mode = null; renderLobby(); }
    else if (want === 'local') { st.mode = 'local'; st.localCfg = loadLocalCfg(); gameShell(); startLocal(); }
    else { st.mode = 'online'; st.code = String(want).toUpperCase(); gameShell(); say('…'); watch(st.code); st.tick = setInterval(tickClock, 250); }
    const url = '/futbol' + (st.mode === 'local' ? '?m=local' : st.code ? '?t=' + st.code : '');
    setTimeout(() => { if (location.pathname === '/futbol' && location.pathname + location.search !== url) history.replaceState({ view: 'foot' }, '', url); }, 0);
  };
  window.openFootChess = function (mode) {
    st.pendingMode = mode || null;
    if (typeof window.closeProfileModal === 'function') window.closeProfileModal();
    window.switchView('foot');
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof socket === 'undefined') return;
    socket.on('fc-state', (s) => { if (s && st.mode === 'online' && s.code === st.code) applyState(s); });
    socket.on('fc-closed', (m) => { if (m && st.mode === 'online' && m.code === st.code) { toast(T('fcNotFound', 'Stol topilmadi yoki yopilgan'), 'info'); window.openFootChess(null); } });
    // Qayta ulanganda stolni qayta kuzatish (socket xonasi yo'qoladi)
    socket.on('connect', () => { if (st.mode === 'online' && st.code) setTimeout(() => { if (st.code) watch(st.code); }, 400); });
  });

  // Boshqa bo'limga o'tilsa — kuzatish to'xtaydi
  const origSwitch = window.switchView;
  if (typeof origSwitch === 'function') {
    window.switchView = function (view) {
      if (view !== 'foot' && st.mode) {
        if (st.code) emit('fc-unwatch', { code: st.code });
        clearInterval(st.tick);
        st.mode = null; st.code = null; st.state = null;
        setPlaying(false);
      }
      return origSwitch.apply(this, arguments);
    };
  }
})();
