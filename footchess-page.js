// ⚽ Futbol sahifasi (2026-11-07 «Shaxmat-futbol» nomi bilan; 2026-11-24 — «Futbol», 16 donali jamoa, tarkib tanlash, almashtirish,
// bayroqli muxlislar tribunasi va stadion ovozi; foydalanuvchining prototipidan): /futbol — lobbi (onlayn stol ochish, ochiq stollar,
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
    local: null, localCfg: { w: null, b: null }, lastSeq: -1, overlayShown: null, lu: null, lphase: null, luSent: false, standKey: '' };
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
    if (st.lpen || (st.state && st.state.pen)) return false; // penaltilar — maydonda yurish yo'q
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
    if (ev.sub) return T('fcEvSub', "{{team}}: {{out}} o'rniga {{in}} maydonga tushdi.", { team, out: pieceName(ev.sub.out.kind), in: pieceName(ev.sub.in.kind) });
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
        <h1>${esc(T('fcTitle', 'Futbol'))}</h1>
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
        ${li('fcRule9', "Jamoada shaxmatdagi 16 dona: 8 piyoda, 2 rux, 2 ot, 2 fil, farzin va shoh. O'yindan oldin maydonga 7 tasini tanlaysiz (shoh — darvozabon), qolganlari zaxirada. O'z navbatingizda yurish o'rniga almashtirish mumkin — o'yinda 3 marta; shoh va to'pli dona almashtirilmaydi, chiqqan dona qaytib kirmaydi.")}
        ${li('fcRule8', "Durrang bo'lsa — penaltilar: tepuvchi va darvozabon darvozaning 5 katagidan birini yashirincha tanlaydi; bir xil katak — qaytarildi. 5 tadan, teng bo'lsa — bittadan.")}
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
      <header class="fc-head"><h1 class="sr-only">${esc(T('fcTitle', 'Futbol'))}</h1>
        <button type="button" class="ps-back" data-fc-back>← ${esc(T('fcTitle', 'Futbol'))}</button>
        <button type="button" class="fc-crowd-btn" data-fc-crowd></button>
        ${local ? `<div class="fc-pick">
          <label>${esc(T('fcTeam1', '1-jamoa'))}<select id="fcSelW" aria-label="${esc(T('fcTeam1', '1-jamoa'))}">${opts(st.localCfg.w)}</select></label>
          <label>${esc(T('fcTeam2', '2-jamoa'))}<select id="fcSelB" aria-label="${esc(T('fcTeam2', '2-jamoa'))}">${opts(st.localCfg.b)}</select></label>
          <button type="button" class="fc-btn small" data-fc-new>${esc(T('fcNewGame', "Yangi o'yin"))}</button></div>`
          : `<div class="fc-head-actions" id="fcHeadActions"></div>`}
      </header>
      <div class="fc-card">
        <div class="fc-scorebar"><div class="fc-team" id="fcTW"></div><div class="fc-score" id="fcScore">0 : 0</div><div class="fc-team r" id="fcTB"></div></div>
        <div class="fc-meta"><span id="fcTurn"></span><span id="fcClock"></span><span id="fcMoves"></span></div>
        <div class="fc-stadium" id="fcStadium">
          <div class="fc-stand top" aria-hidden="true"></div>
          <div class="fc-pitch-wrap" id="fcWrap"><div class="fc-pitch" id="fcPitch">
            <div class="fc-net l"></div><div class="fc-net r"></div>
            <div class="fc-field"><div class="fc-mark mid"></div><div class="fc-mark circle"></div><div class="fc-mark box l"></div><div class="fc-mark box r"></div></div>
          </div></div>
          <div class="fc-stand bottom" aria-hidden="true"></div>
        </div>
        <div class="fc-benches" id="fcBench"></div>
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
    el.querySelector('[data-fc-crowd]').onclick = toggleCrowd;
    refreshCrowdBtn();
    // Zaxiradan almashtirish: maydondagi dona tanlangan bo'lsa, zaxiradagi dona bosiladi
    document.getElementById('fcBench').addEventListener('click', (e) => {
      const b = e.target.closest('[data-sub-in]');
      const s = S();
      if (!b || b.disabled || !s || !st.sel || !myTurn()) return;
      const a = F.subs(s, F.byId(s, st.sel)).find((x) => x.in === b.dataset.subIn);
      if (a) act(a);
    });
    // Brauzer ovozni faqat bosishdan keyin ruxsat beradi
    el.addEventListener('pointerdown', () => { if (crowdPref()) crowdStart(); });
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
    // Telefonda maydon tik holatda: o'z darvozangiz pastda (qora o'yinchi uchun teskari); tribunalar ham shunga mos
    pitch.classList.toggle('fc-flip', st.myColor === 'b');
    renderStands(tm);
    const lineup = renderLineupPhase();
    if (lineup) setPlaying(st.mode === 'local' || !!st.myColor);
    const ballEl = document.getElementById('fcBall');
    if (ballEl) ballEl.hidden = !s;
    if (!s) {
      // Tarkib tanlanmoqda — maydon bo'sh (oldingi o'yin donalari olib tashlanadi)
      for (const id of Object.keys(st.pieceEls || {})) { st.pieceEls[id].remove(); delete st.pieceEls[id]; }
      renderBench(null, tm); tickClock(); renderHeadActions(); return;
    }
    setPlaying(st.mode === 'online' ? st.state.status === 'active' && !!st.myColor : true);
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
    renderBench(s, tm);
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
    const pens = !over && (st.lpen || (st.mode === 'online' && st.state.pen));
    turnEl.innerHTML = over ? '' : pens ? '<b>⚽ ' + esc(T('fcPens', 'Penaltilar')) + '</b>' :esc(T('fcTurn', 'Navbat:')) + ' <b>' + esc(tm[s.turn].name) + '</b>' + (st.mode === 'online' && st.myColor && st.myColor !== s.turn && st.state.status === 'active' ? ' · ' + esc(T('fcOppTurn', 'raqib o\'ylayapti…')) : '');
    tickClock();
    const holder = st.sel && s.ball.h === st.sel && myTurn();
    const kb = document.getElementById('fcKickbar');
    kb.hidden = !holder;
    kb.querySelectorAll('[data-km]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.km === st.kmode)));
    renderHeadActions();
    renderPens();
  }
  function tickClock() {
    const el = document.getElementById('fcClock');
    if (!el) return;
    if (st.mode !== 'online' || !st.state || (st.state.status !== 'active' && st.state.status !== 'lineup')) { el.textContent = ''; return; }
    const left = Math.max(0, st.state.moveLeft - (Date.now() - st.receivedAt));
    const sec = Math.ceil(left / 1000);
    el.textContent = '⏱ ' + sec + ' s';
    el.classList.toggle('warn', sec <= 10);
    const lt = document.getElementById('fcLuTimer');
    if (lt) lt.textContent = st.state.status === 'lineup' ? '⏱ ' + sec + ' s' : '';
  }
  function renderHeadActions() {
    const box = document.getElementById('fcHeadActions');
    if (!box || st.mode !== 'online' || !st.state) return;
    const s = st.state;
    const want = (s.status === 'active' || s.status === 'lineup') && st.myColor ? 'resign' : s.status === 'waiting' && st.myColor ? 'wait' : '';
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
    cheer(scorer);
    roar(1, 3.2);
    overlay(`<div class="fc-big pop">${esc(T('fcGoal', 'GOL!'))}</div><p>${esc(tm[scorer].name)} · ${score.w} : ${score.b}</p>`, 1700);
    if (typeof playSound === 'function') playSound('check');
    if (typeof window.haptic === 'function') window.haptic([30, 40, 30]);
  }
  function finishOverlay(result, s, tm) {
    const winner = result.winner;
    const title = winner ? T('fcWin', '{{team}} YUTDI!', { team: tm[winner].name }) : T('fcDraw', 'DURRANG');
    const loser = winner ? tm[F.other(winner)].name : '';
    const why = { resign: T('fcRsResign', "{{team}} taslim bo'ldi.", { team: loser }), timeout: T('fcRsTimeout', '{{team}}: navbat vaqti ketma-ket 3 marta tugadi.', { team: loser }),
      abandon: T('fcRsAbandon', "{{team}} o'yindan chiqib ketdi.", { team: loser }), moves: T('fcRsMoves', '100 ta yurish tugadi.'),
      penalties: result.pens ? T('fcRsPens', 'Penaltilar seriyasi: {{w}} : {{b}}', { w: result.pens.w, b: result.pens.b }) : '' }[result.reason] || '';
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

  // ---------- 🧩 Tarkib tanlash (o'yindan oldin) ----------
  // Bir qurilmada: avval 1-jamoa, keyin 2-jamoa (st.lphase); onlayn: status 'lineup' — har o'yinchi o'z tarkibini fc-lineup bilan yuboradi.
  const LU_KEY = 'justChessFootLineup';
  function savedLineup(side) {
    if (st.mode === 'local') return (st.localCfg.lu && F.validLineup(st.localCfg.lu[side])) || F.DEFAULT_LINEUP.slice();
    try { return F.validLineup(JSON.parse(localStorage.getItem(LU_KEY) || 'null')) || F.DEFAULT_LINEUP.slice(); } catch (e) { return F.DEFAULT_LINEUP.slice(); }
  }
  function lineupContext() {
    if (st.mode === 'local') return st.lphase ? { side: st.lphase, edit: true } : null;
    const s = st.state;
    if (!s || s.status !== 'lineup') return null;
    if (!st.myColor) return { watch: true };
    if ((s.lineupReady && s.lineupReady[st.myColor]) || st.luSent) return { wait: true };
    return { side: st.myColor, edit: true };
  }
  const luPiece = (tm, side, kind) => `<span class="fc-lu-pc">${kitHtml(tm[side], side)}<img class="fc-pimg" src="${esc(pieceSrc(side, kind))}" alt="" draggable="false"></span>`;
  function renderLineupPhase() {
    const wrap = document.getElementById('fcWrap');
    if (!wrap) return false;
    const ctx = lineupContext();
    let el = document.getElementById('fcLineup');
    if (!ctx) { if (el) el.remove(); st.lu = null; return false; }
    const mode = ctx.edit ? 'edit-' + ctx.side : ctx.wait ? 'wait' : 'watch';
    if (el && el.dataset.mode === mode) return true;
    if (el) el.remove();
    el = document.createElement('div');
    el.id = 'fcLineup';
    el.className = 'fc-overlay fc-lineup';
    el.dataset.mode = mode;
    wrap.appendChild(el);
    if (ctx.edit) {
      st.lu = { side: ctx.side, lu: savedLineup(ctx.side), sel: null, pick: null };
      el.addEventListener('click', onLineupClick);
      drawLineup(el);
    } else {
      el.innerHTML = `<div class="fc-big small">⏳</div><p>${esc(ctx.wait ? T('fcLineupWait', 'Tarkib yuborildi — raqib kutilmoqda…') : T('fcLineupWatch', 'Jamoalar tarkib tanlayapti…'))}</p><p class="fc-muted" id="fcLuTimer"></p>`;
    }
    return true;
  }
  function drawLineup(el) {
    const L = st.lu, tm = teams(), side = L.side;
    const kindOf = (id) => F.KIND[id];
    const slots = F.SLOTS.map(([x, y], i) => {
      const id = L.lu[i];
      return `<button type="button" class="fc-lu-slot${L.sel === i ? ' sel' : ''}${L.pick ? ' can' : ''}" data-lu-slot="${i}" style="grid-column:${y + 1};grid-row:${5 - x}" title="${esc(pieceName(kindOf(id)))}" aria-label="${esc(pieceName(kindOf(id)))}">${luPiece(tm, side, kindOf(id))}${i === 5 ? '<span class="fc-lu-ball"></span>' : ''}</button>`;
    }).join('');
    const gk = `<div class="fc-lu-slot gk" style="grid-column:${F.GK[1] + 1};grid-row:5" title="${esc(T('fcGK', 'Darvozabon'))}">${luPiece(tm, side, 'k')}<small>${esc(T('fcGK', 'Darvozabon'))}</small></div>`;
    const bench = F.SQUAD.filter((id) => id !== 'SH' && !L.lu.includes(id))
      .map((id) => `<button type="button" class="fc-lu-b${L.pick === id ? ' sel' : ''}" data-lu-pick="${id}" title="${esc(pieceName(kindOf(id)))}" aria-label="${esc(T('fcBench', 'Zaxira') + ': ' + pieceName(kindOf(id)))}">${luPiece(tm, side, kindOf(id))}</button>`).join('');
    const title = st.mode === 'local' ? T('fcLineupTeam', '{{team}}: tarkibni tanlang', { team: tm[side].name }) : T('fcLineupH', 'Tarkibni tanlang');
    el.innerHTML = `<div class="fc-lu">
      <h3>${teamFlag(tm[side], side)} ${esc(title)}</h3>
      <p class="fc-muted">${esc(T('fcLineupHint', "O'rinni bosing, keyin zaxiradan donani tanlang. Shoh — doim darvozabon; markazdagi o'yinchi boshlashda to'pni oladi."))}</p>
      <div class="fc-lu-pitch">${gk}${slots}</div>
      <div class="fc-lu-bench"><b>${esc(T('fcBench', 'Zaxira'))}</b><div class="fc-lu-bchips">${bench}</div></div>
      <div class="fc-row-btns"><button type="button" class="fc-btn small ghost" data-lu-reset>${esc(T('fcLineupDefault', 'Standart tarkib'))}</button>
        <button type="button" class="fc-btn" data-lu-ready>✓ ${esc(T('fcReady', 'Tayyor'))}</button></div>
      ${st.mode === 'online' ? '<p class="fc-muted" id="fcLuTimer"></p>' : ''}
    </div>`;
    tickClock();
  }
  function onLineupClick(e) {
    const L = st.lu, el = document.getElementById('fcLineup');
    if (!L || !el) return;
    const slot = e.target.closest('[data-lu-slot]'), pick = e.target.closest('[data-lu-pick]');
    if (slot) {
      const i = Number(slot.dataset.luSlot);
      if (L.pick) { L.lu[i] = L.pick; L.pick = null; L.sel = null; } else L.sel = L.sel === i ? null : i;
    } else if (pick) {
      const id = pick.dataset.luPick;
      if (L.sel !== null) { L.lu[L.sel] = id; L.sel = null; L.pick = null; } else L.pick = L.pick === id ? null : id;
    } else if (e.target.closest('[data-lu-reset]')) { L.lu = F.DEFAULT_LINEUP.slice(); L.sel = null; L.pick = null; }
    else if (e.target.closest('[data-lu-ready]')) return submitLineup();
    else return;
    drawLineup(el);
  }
  async function submitLineup() {
    const L = st.lu;
    if (!L || !F.validLineup(L.lu)) return;
    crowdStart();
    if (st.mode === 'local') {
      st.localCfg.lu = Object.assign({}, st.localCfg.lu || {}, { [L.side]: L.lu.slice() });
      saveLocalCfg();
      if (L.side === 'w') { st.lphase = 'b'; st.lu = null; render(); say(T('fcLineupTeam', '{{team}}: tarkibni tanlang', { team: teams().b.name })); return; }
      return kickoffLocal();
    }
    try { localStorage.setItem(LU_KEY, JSON.stringify(L.lu)); } catch (e) { /* eslab qolish shart emas */ }
    st.luSent = true;
    render();
    const r = await emit('fc-lineup', { code: st.code, lineup: L.lu });
    if (!r || !r.ok) { st.luSent = false; if (!r || r.reason !== 'already') toast(T('fcRejected', "Bu harakatni qilib bo'lmaydi."), 'warning'); render(); }
  }

  // ---------- 🔁 Zaxira va almashtirish ----------
  function renderBench(s, tm) {
    const box = document.getElementById('fcBench');
    if (!box) return;
    if (!s || !s.lu) { box.innerHTML = ''; return; }
    const selP = st.sel && F.byId(s, st.sel);
    const canSide = selP && myTurn() && F.subs(s, selP).length ? selP.side : null;
    const row = (side) => {
      const chips = F.bench(s, side).map((id) => {
        const on = canSide === side, nm = pieceName(F.KIND[id]);
        return `<button type="button" class="fc-bc${on ? ' can' : ''}" data-sub-in="${id}" ${on ? '' : 'disabled'} title="${esc(nm)}" aria-label="${esc(T('fcBench', 'Zaxira') + ': ' + nm)}">${luPiece(tm, side, F.KIND[id])}</button>`;
      }).join('');
      const outs = s.out[side].map((id) => `<span class="fc-bc out" title="${esc(pieceName(F.KIND[id]))}">${luPiece(tm, side, F.KIND[id])}</span>`).join('');
      return `<div class="fc-brow side-${side}${s.turn === side ? ' turn' : ''}">
        <div class="fc-bhead">${teamFlag(tm[side], side)}<b>${esc(T('fcBench', 'Zaxira'))}</b><span class="fc-subs">🔁 ${esc(T('fcSubsLeft', 'Almashtirish: {{n}}/{{max}}', { n: s.subs[side], max: F.MAX_SUBS }))}</span></div>
        <div class="fc-bchips">${chips}${outs}</div></div>`;
    };
    box.innerHTML = row('w') + row('b');
  }

  // ---------- 🏟️ Tribunalar: o'z bayrog'ini silkitayotgan muxlislar ----------
  // Kompyuterda: tepada va pastda, chap yarmi — 1-jamoa (o'z darvozasi chapda), o'ng yarmi — 2-jamoa. Telefonda (tik, maydon burilgan):
  // tepada — tepadagi darvoza egasi muxlislari, pastda — o'zinikilar (data-top).
  // Unumdorlik (2026-11-24 o'lchov: har muxlis alohida CSS animatsiya bo'lganda telefonda ~1 kadr/s): har bo'lim — bitta <canvas>,
  // soniyasiga 10 marta chiziladi; ko'rinmasa (ekrandan chiqqan, (telefonda yashirin yarim, boshqa sahifa, fondagi oyna) chizilmaydi; «harakatni kamaytirish» — bir marta.
  const SHIRTS = ['#e8eef0', '#f5c542', '#ff6b6b', '#4dabf7', '#51cf66', '#cc5de8', '#ff922b', '#20c997', '#f06595', '#94d82d', '#ced4da', '#339af0'];
  const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#d4a373'];
  const STAND_FPS = 10;
  const reducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const flagImgs = {};
  function flagImg(code) {
    if (!code) return null;
    if (!flagImgs[code]) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { st.standLast = 0; startStands(); }; // «harakatni kamaytirish» rejimida ham bayroq chiqsin
      im.src = flagUrl(code);
      flagImgs[code] = im;
    }
    const im = flagImgs[code];
    return im.complete && im.naturalWidth ? im : null;
  }
  // Har muxlisning doimiy xususiyatlari (rang, bayroq, sur'at) — bir marta
  function crowdOf(seed, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = (i * 7 + seed * 13) % 97;
      out.push({ shirt: SHIRTS[k % SHIRTS.length], skin: SKINS[(k >> 1) % SKINS.length], flag: k % 3 !== 0, ph: (k % 17) * 0.37, sp: 4 + (k % 7) * 0.6 });
    }
    return out;
  }
  function renderStands(tm) {
    const stad = document.getElementById('fcStadium');
    if (!stad) return;
    stad.dataset.top = st.myColor === 'b' ? 'w' : 'b';
    const key = [tm.w.country, tm.b.country, tm.w.kit, tm.b.kit].join('|');
    if (st.standKey === key) return;
    st.standKey = key;
    st.standTeams = { w: tm.w.country || null, b: tm.b.country || null };
    const sec = (side, seed, pos) => `<div class="fc-sec" data-side="${side}"><canvas class="fc-scv" data-side="${side}" data-seed="${seed}" data-pos="${pos}"${tm[side].country ? ` data-flag="${esc(flagUrl(tm[side].country))}"` : ''}></canvas></div>`;
    stad.querySelector('.fc-stand.top').innerHTML = sec('w', 1, 'top') + sec('b', 2, 'top');
    stad.querySelector('.fc-stand.bottom').innerHTML = sec('w', 3, 'bottom') + sec('b', 4, 'bottom');
    st.standCrowds = {};
    startStands();
  }
  // Muxlislar tanasi bir marta alohida qatlamga (har qator — bitta offscreen canvas), bayroq tayog'i bilan — bitta kichik rasmga
  // chiziladi; har kadrda faqat qatlam (sakrash) va bayroqlar (burilish) ko'chiriladi — telefonda arzon.
  function standCache(cv, w, h, dpr) {
    const side = cv.dataset.side, seed = Number(cv.dataset.seed), top = cv.dataset.pos === 'top';
    const img = flagImg(st.standTeams && st.standTeams[side]);
    const key = [w, h, dpr, seed, top, img ? img.src : 'plain-' + side].join('|');
    if (cv._fc && cv._fc.key === key) return cv._fc;
    const gap = 13, n = Math.ceil(w / gap) + 1;
    const mk = (cw, ch) => { const o = document.createElement('canvas'); o.width = Math.max(1, Math.round(cw * dpr)); o.height = Math.max(1, Math.round(ch * dpr)); const x = o.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); return [o, x]; };
    // Bayroq tayog'i bilan: tayoq pastki chap burchakda (0, sh)
    const sprite = (sc) => {
      const fw = 13 * sc, fh = 9 * sc, sh = 15 * sc, sw = fw + 2;
      const [o, x] = mk(sw, sh + 1);
      x.strokeStyle = '#d9d2c3'; x.lineWidth = 1.3;
      x.beginPath(); x.moveTo(0.7, sh); x.lineTo(0.7, 0); x.stroke();
      if (img) x.drawImage(img, 1.5, 0, fw, fh);
      else { x.fillStyle = side === 'w' ? '#f4f6f6' : '#1d2b2d'; x.fillRect(1.5, 0, fw, fh); if (side === 'b') { x.strokeStyle = '#e8eef0'; x.lineWidth = 1; x.strokeRect(1.5, 0, fw, fh); } }
      return { o, w: sw, h: sh + 1 };
    };
    // [o'lcham, asos chizig'i, shaffoflik, siljish, urug'] — orqa qator birinchi
    const spec = top ? [[0.82, h * 0.5, 0.7, 6, seed + 5], [1, h - 1, 1, 0, seed]] : [[0.82, h - 1, 0.7, 6, seed + 5], [1, h * 0.55, 1, 0, seed]];
    const rows = spec.map(([sc, baseY, alpha, shift, sd]) => {
      const fans = crowdOf(sd, n);
      const [o, x] = mk(w, h);
      const flags = [];
      fans.forEach((f, i) => {
        const fx = i * gap + shift + 6, bw = 11 * sc, bh = 9 * sc, hr = 3.5 * sc;
        x.fillStyle = f.shirt;
        x.beginPath(); x.moveTo(fx - bw / 2, baseY); x.lineTo(fx - bw / 2, baseY - bh + 3); x.quadraticCurveTo(fx - bw / 2, baseY - bh, fx, baseY - bh);
        x.quadraticCurveTo(fx + bw / 2, baseY - bh, fx + bw / 2, baseY - bh + 3); x.lineTo(fx + bw / 2, baseY); x.fill();
        x.fillStyle = f.skin;
        x.beginPath(); x.arc(fx, baseY - bh - hr + 0.5, hr, 0, Math.PI * 2); x.fill();
        if (f.flag) flags.push({ x: fx + 3 * sc, y: baseY - bh * 0.4, ph: f.ph, sp: f.sp });
      });
      return { o, alpha, flags, spr: sprite(sc) };
    });
    cv._fc = { key, rows };
    return cv._fc;
  }
  function drawStand(cv, t) {
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const cache = standCache(cv, w, h, dpr);
    const c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    const jumping = st.cheer && st.cheer.side === cv.dataset.side && t < st.cheer.until;
    cache.rows.forEach((r, ri) => {
      // Qator birga «nafas oladi»; gol bo'lsa — sakraydi
      const dy = jumping ? -Math.abs(Math.sin(t * 11 + ri * 1.3)) * 6 : -(Math.sin(t * 1.6 + ri * 2) + 1) * 0.6;
      c.globalAlpha = r.alpha;
      c.setTransform(1, 0, 0, 1, 0, Math.round(dy * dpr));
      c.drawImage(r.o, 0, 0);
      const spr = r.spr;
      for (const f of r.flags) {
        const ang = Math.sin(t * (jumping ? 9 : f.sp) + f.ph) * 0.28, cs = Math.cos(ang), sn = Math.sin(ang);
        c.setTransform(dpr * cs, dpr * sn, -dpr * sn, dpr * cs, dpr * f.x, dpr * (f.y + dy));
        c.drawImage(spr.o, 0, -spr.h, spr.w, spr.h);
      }
    });
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
  }
  function standsFrame(now) {
    st.standRaf = 0;
    const stad = document.getElementById('fcStadium');
    if (!stad || !st.mode) return;
    if (!document.hidden && now - (st.standLast || 0) >= 1000 / STAND_FPS) {
      st.standLast = now;
      const t = now / 1000;
      const vh = window.innerHeight;
      stad.querySelectorAll('canvas.fc-scv').forEach((cv) => {
        if (cv.offsetParent === null) return;
        const b = cv.getBoundingClientRect();
        if (b.bottom > 0 && b.top < vh) drawStand(cv, t);
      });
    }
    if (reducedMotion()) return; // harakatsiz — bir marta chizildi
    st.standRaf = requestAnimationFrame(standsFrame);
  }
  function startStands() {
    if (st.standRaf) return;
    st.standLast = 0;
    st.standRaf = requestAnimationFrame(standsFrame);
  }
  function cheer(side) {
    if (!side) return;
    st.cheer = { side, until: performance.now() / 1000 + 2.6 };
    if (reducedMotion()) { st.standLast = 0; startStands(); }
  }

  // ---------- 🔊 Stadion ovozi (Web Audio: shovqindan olomon g'uvillashi, golda — hayqiriq; fayl yuklanmaydi) ----------
  const crowd = { ctx: null, amb: null, buf: null };
  function crowdPref() {
    try { const v = JSON.parse(localStorage.getItem('justChessSettings') || '{}') || {}; return v.footCrowd !== false && v.soundEnabled !== false; } catch (e) { return true; }
  }
  function noiseBuf(ctx) {
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    return buf;
  }
  function crowdStart() {
    if (!crowdPref() || !st.mode) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!crowd.ctx) { crowd.ctx = new AC(); crowd.buf = noiseBuf(crowd.ctx); }
      if (crowd.ctx.state === 'suspended') crowd.ctx.resume().catch(() => {});
      if (crowd.amb) return;
      const c = crowd.ctx, src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      src.buffer = crowd.buf; src.loop = true;
      bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.7;
      g.gain.value = 0.05; lfo.frequency.value = 0.13; lg.gain.value = 0.022;
      lfo.connect(lg).connect(g.gain);
      src.connect(bp).connect(g).connect(c.destination);
      src.start(); lfo.start();
      crowd.amb = { src, lfo };
    } catch (e) { /* ovozsiz davom etadi */ }
  }
  function crowdStop() {
    if (crowd.amb) { try { crowd.amb.src.stop(); crowd.amb.lfo.stop(); } catch (e) { /* allaqachon to'xtagan */ } crowd.amb = null; }
  }
  function roar(level, dur) {
    if (!crowd.amb || !crowd.ctx || !crowdPref()) return;
    try {
      const c = crowd.ctx, t = c.currentTime, src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = crowd.buf; src.loop = true;
      bp.type = 'bandpass'; bp.frequency.value = 950; bp.Q.value = 0.6;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32 * level, t + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp).connect(g).connect(c.destination);
      src.start(t); src.stop(t + dur + 0.1);
    } catch (e) { /* ovozsiz */ }
  }
  // Olomon munosabati: tortib olish va ushlab qolish — «oh», almashtirish — qarsak
  function crowdReact(ev) {
    if (!ev || !ev.a) return;
    if (ev.tackle || ev.intercept) roar(0.35, 1.1);
    else if (ev.sub) roar(0.25, 1.4);
    else if (ev.a.t === 'kick' && !ev.recv && !ev.goal) roar(0.2, 0.9);
  }
  function refreshCrowdBtn() {
    const b = document.querySelector('[data-fc-crowd]');
    if (!b) return;
    const on = crowdPref();
    b.textContent = on ? '🔊' : '🔇';
    b.title = T('fcCrowd', 'Stadion ovozi');
    b.setAttribute('aria-label', T('fcCrowd', 'Stadion ovozi'));
    b.setAttribute('aria-pressed', String(on));
  }
  function toggleCrowd() {
    let v = {};
    try { v = JSON.parse(localStorage.getItem('justChessSettings') || '{}') || {}; } catch (e) { v = {}; }
    v.footCrowd = !crowdPref() ? true : false;
    if (v.footCrowd && v.soundEnabled === false) v.soundEnabled = true;
    try { localStorage.setItem('justChessSettings', JSON.stringify(v)); } catch (e) { /* saqlanmasa ham */ }
    if (typeof window.pushSettingsToServer === 'function') window.pushSettingsToServer();
    if (v.footCrowd) crowdStart(); else crowdStop();
    refreshCrowdBtn();
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
      if (st.sel) say(s.ball.h === p.id ? T('fcHolding', "{{piece}} to'pni ushlab turibdi: zarba berish yoki to'p bilan yurishni tanlang.", { piece: pieceName(p.kind) })
        : T('fcSelected', '{{piece}} tanlandi.', { piece: pieceName(p.kind) }) + (F.subs(s, p).length ? ' ' + T('fcSubHint', 'Yoki zaxiradagi donani bosib, uni almashtiring.') : ''));
      return;
    }
    if (st.sel) { st.sel = null; render(); }
  }
  async function act(a) {
    st.sel = null; st.kmode = 'kick';
    if (st.mode === 'local') return localStep(a);
    st.pending = true;
    render();
    const r = await emit('fc-move', { code: st.code, t: a.t, id: a.id, x: a.x, y: a.y, in: a.in });
    st.pending = false;
    if (!r || !r.ok) { toast(T('fcRejected', "Bu harakatni qilib bo'lmaydi."), 'warning'); render(); }
  }

  // ---------- Bir qurilmada 2 kishi ----------
  function loadLocalCfg() {
    try { const c = JSON.parse(localStorage.getItem('justChessFootLocal') || 'null'); if (c) return { w: c.w || null, b: c.b || null, lu: c.lu || null }; } catch (e) { /* bo'sh */ }
    const mine = window.currentUser && window.currentUser.country && window.currentUser.country !== 'un' ? window.currentUser.country : null;
    return { w: mine, b: null };
  }
  function saveLocalCfg() { try { localStorage.setItem('justChessFootLocal', JSON.stringify(st.localCfg)); } catch (e) { /* bo'sh */ } }
  function startLocal() {
    const pitch = document.getElementById('fcWrap');
    if (pitch) pitch.querySelectorAll('.fc-overlay').forEach((o) => o.remove());
    st.local = null;
    st.localOver = false; st.busy = false; st.sel = null; st.lpen = null; st.reveal = null;
    st.lphase = 'w'; st.lu = null;
    render();
    say(T('fcLineupTeam', '{{team}}: tarkibni tanlang', { team: teams().w.name }));
  }
  function kickoffLocal() {
    const lu = st.localCfg.lu || {};
    st.lphase = null; st.lu = null;
    st.local = F.formation('w', null, 0, { lu: { w: lu.w, b: lu.b } });
    render();
    crowdStart();
    roar(0.45, 1.8);
    say(T('fcKickoff', '{{team}} markazdan boshlaydi.', { team: teams().w.name }));
  }
  function localStep(a) {
    const tm = teams();
    const r = F.step(st.local, a);
    say(describe(r.ev, tm));
    playMoveSound(r.ev);
    crowdReact(r.ev);
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
    if (r.over && !r.winner) return startLocalPens(tm); // durrang — penaltilar
    if (r.over) { st.localOver = true; render(); return finishOverlay({ winner: r.winner, reason: 'moves' }, r.st, tm); }
    while (!F.actions(st.local, st.local.turn).length) st.local = F.step(st.local, null).st;
    render();
  }
  // ---------- ⚽ Penaltilar ----------
  // Yashirin tanlov: tepuvchi darvozaning 1..5-katagini, darvozabon sakraydigan katakni tanlaydi. Onlayn — server (fc-pen) saqlaydi va
  // ikkalasi tanlagach ochadi; bir qurilmada — tepuvchi tanlagach qurilma darvozabonga beriladi (tanlov ko'rinmaydi).
  function startLocalPens(tm) {
    st.lpen = { pen: F.penStart(Math.random() < 0.5 ? 'w' : 'b'), phase: 'aim', aim: null };
    render();
    pensFlash(tm);
  }
  function pensFlash(tm) {
    overlay(`<div class="fc-big small pop">${esc(T('fcPens', 'Penaltilar'))}</div><p>${esc(T('fcPensStart', 'Durrang! Penaltilar seriyasi — 5 tadan zarba.'))}</p>`, 1900);
    say(T('fcPensStart', 'Durrang! Penaltilar seriyasi — 5 tadan zarba.'));
    if (typeof playSound === 'function') playSound('check');
  }
  function penView() {
    if (st.mode === 'online') {
      const s = st.state;
      if (!s || !s.pen || s.status !== 'active') return null;
      const role = !st.myColor ? null : st.myColor === s.pen.kicker ? 'aim' : 'dive';
      const done = !!(role && s.pen.chosen[role]);
      return { pen: s.pen, kicker: s.pen.kicker, role: done ? null : role, waitingMine: done, chosen: s.pen.chosen };
    }
    if (st.mode === 'local' && st.lpen && !st.localOver) {
      const L = st.lpen;
      return { pen: L.pen, kicker: F.penKicker(L.pen), role: L.phase === 'aim' || L.phase === 'dive' ? L.phase : null, pass: L.phase === 'pass', local: true, chosen: { aim: L.aim !== null, dive: false } };
    }
    return null;
  }
  function showReveal(kick, pen, tm, then) {
    st.reveal = { kick, pen, until: Date.now() + 1800 };
    say(kick.goal ? T('fcPenGoal', 'GOL! {{team}} penaltini amalga oshirdi.', { team: tm[kick.side].name })
      : kick.aim === null ? T('fcPenMissed', "O'tkazib yuborildi!") : T('fcPenSaved', 'Qaytarildi!'));
    if (typeof playSound === 'function') playSound(kick.goal ? 'check' : 'capture');
    renderPens();
    setTimeout(() => { st.reveal = null; renderPens(); if (then) then(); }, 1850);
  }
  function renderPens() {
    const wrap = document.getElementById('fcWrap');
    if (!wrap) return;
    let el = document.getElementById('fcPens');
    const v = penView(), rv = st.reveal;
    if (!v && !rv) { if (el) el.remove(); return; }
    const tm = teams(), pen = rv ? rv.pen : v.pen, kicker = rv ? rv.kick.side : v.kicker, keeper = F.other(kicker);
    if (!el) { el = document.createElement('div'); el.id = 'fcPens'; el.className = 'fc-pens'; wrap.appendChild(el); el.addEventListener('click', onPensClick); }
    const tally = F.penTally(pen).g;
    const row = (side) => {
      const ks = pen.kicks.filter((k) => k.side === side);
      const dots = Array.from({ length: Math.max(F.PENS, ks.length) }, (_, i) => `<i class="fc-pdot ${ks[i] ? (ks[i].goal ? 'ok' : 'no') : ''}"></i>`).join('');
      return `<div class="fc-prow${side === kicker && !rv ? ' now' : ''}">${teamFlag(tm[side], side)}<span class="fc-nm">${esc(tm[side].name)}</span><span class="fc-pdots">${dots}</span><b>${tally[side]}</b></div>`;
    };
    const canPick = v && v.role && !rv;
    const pos = (y) => `left:${(y - 0.5) * 20}%`;
    const keeperAt = rv ? (rv.kick.dive || 3) : 3, ballAt = rv ? rv.kick.aim : null;
    let status;
    if (rv) status = rv.kick.goal ? T('fcGoal', 'GOL!') : rv.kick.aim === null ? T('fcPenMissed', "O'tkazib yuborildi!") : T('fcPenSaved', 'Qaytarildi!');
    else if (v.pass) status = T('fcPenPass', "Tanlandi! Qurilmani darvozabonga bering — u tanlovni ko'rmasin.");
    else if (v.role === 'aim') status = v.local ? T('fcPenAimTeam', '{{team}} tepadi: qaysi katakka?', { team: tm[kicker].name }) : T('fcPenAim', 'Siz tepasiz: qaysi katakka urasiz?');
    else if (v.role === 'dive') status = v.local ? T('fcPenDiveTeam', '{{team}} darvozaboni: qayerga sakraydi?', { team: tm[keeper].name }) : T('fcPenDive', 'Siz darvozabonsiz: qayerga sakraysiz?');
    else if (v.waitingMine) status = T('fcPenWaitOpp', 'Tanlandi — raqib kutilmoqda…');
    else status = T('fcPenKicker', '{{team}} tepadi', { team: tm[kicker].name }) + (v.chosen.aim ? ' · ' + T('fcPenChosenAim', 'tepuvchi tanladi') : '') + (v.chosen.dive ? ' · ' + T('fcPenChosenDive', 'darvozabon tanladi') : '');
    const cells = [1, 2, 3, 4, 5].map((y) => `<button type="button" class="fc-pcell" data-pen="${y}" ${canPick ? '' : 'disabled'} aria-label="${esc(T('fcPenCell', '{{n}}-katak', { n: y }))}"></button>`).join('');
    el.className = 'fc-pens' + (rv ? ' reveal ' + (rv.kick.goal ? 'goal' : 'saved') : '') + (canPick ? ' pick-' + v.role : '');
    el.innerHTML = `<div class="fc-pens-head"><b>⚽ ${esc(T('fcPens', 'Penaltilar'))}</b></div>
      <div class="fc-ptable">${row(pen.first)}${row(F.other(pen.first))}</div>
      <div class="fc-pgoal">${cells}
        <span class="fc-pkeeper" style="${pos(keeperAt)}">${kitHtml(tm[keeper], keeper)}<img class="fc-pimg" src="${esc(pieceSrc(keeper, 'k'))}" alt="" draggable="false"></span>
        ${ballAt ? `<span class="fc-pball" style="${pos(ballAt)}"></span>` : ''}
      </div>
      <div class="fc-pkick">${v && !rv ? `<span class="fc-pc-static">${kitHtml(tm[kicker], kicker)}<img class="fc-pimg" src="${esc(pieceSrc(kicker, 'p'))}" alt="" draggable="false"></span><span class="fc-pball idle"></span>` : ''}</div>
      <p class="fc-pstatus" aria-live="polite">${esc(status)}</p>
      ${v && v.pass ? `<button type="button" class="fc-btn" data-pen-ready>${esc(T('fcPenReady', 'Tayyor'))}</button>` : ''}`;
  }
  async function onPensClick(e) {
    if (e.target.closest('[data-pen-ready]')) { if (st.lpen && st.lpen.phase === 'pass') { st.lpen.phase = 'dive'; renderPens(); } return; }
    const c = e.target.closest('[data-pen]');
    if (!c || c.disabled) return;
    const y = Number(c.dataset.pen);
    if (st.mode === 'online') {
      c.disabled = true;
      const r = await emit('fc-pen', { code: st.code, y });
      if (!r || !r.ok) { toast(T('fcRejected', "Bu harakatni qilib bo'lmaydi."), 'warning'); renderPens(); }
      return;
    }
    const L = st.lpen;
    if (!L) return;
    if (L.phase === 'aim') { L.aim = y; L.phase = 'pass'; return renderPens(); }
    if (L.phase !== 'dive') return;
    const tm = teams();
    L.pen = F.penKick(L.pen, L.aim, y);
    L.aim = null; L.phase = 'reveal';
    const w = F.penWinner(L.pen);
    showReveal(L.pen.kicks[L.pen.kicks.length - 1], L.pen, tm, () => {
      if (!st.lpen || st.lpen !== L) return;
      if (w) { st.localOver = true; renderPens(); return finishOverlay({ winner: w === 'draw' ? null : w, reason: 'penalties', pens: F.penTally(L.pen).g }, st.local, tm); }
      L.phase = 'aim';
      renderPens();
    });
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
    // Yangi tarkib bosqichi (qo'shilish yoki revansh): eski oynalar yopiladi
    if (s.status === 'lineup' && (!prev || prev.status !== 'lineup')) {
      const pitch = document.getElementById('fcWrap');
      if (pitch) pitch.querySelectorAll('.fc-overlay').forEach((o) => o.remove());
      st.luSent = false; st.overlayShown = null; st.sel = null;
      st.pieceEls = st.pieceEls || {};
      for (const id of Object.keys(st.pieceEls)) { st.pieceEls[id].remove(); delete st.pieceEls[id]; }
    }
    const freshGame = prev && prev.status !== 'active' && s.status === 'active';
    if (freshGame) { crowdStart(); roar(0.45, 1.8); }
    if (freshGame || (!prev && s.status === 'active')) {
      const pitch = document.getElementById('fcWrap');
      if (pitch) pitch.querySelectorAll('.fc-overlay').forEach((o) => o.remove());
      st.overlayShown = null;
    }
    if (freshGame && st.myColor) toast('⚽ ' + (s.st.turn === st.myColor ? T('fcStartYou', "O'yin boshlandi! Siz boshlaysiz.") : T('fcStartOpp', "O'yin boshlandi! Raqib boshlaydi.")), 'success');
    if (!st.sel || !s.st || s.st.turn !== st.myColor) st.sel = null;
    render();
    // Penaltilar: boshlanishi va har hal bo'lgan zarba (tanlovlar shu paytda ochiladi)
    const prevKicks = prev && prev.pen ? prev.pen.kicks.length : 0;
    if (s.pen && prev && !prev.pen && s.status === 'active') pensFlash(tm);
    if (s.pen && prev && s.pen.kicks.length > prevKicks) showReveal(s.pen.kicks[s.pen.kicks.length - 1], s.pen, tm);
    else if (prev && s.seq !== prev.seq && s.ev && !s.pen) {
      if (s.ev.timeout) say(T('fcEvTimeout', "{{team}}: vaqt tugadi — navbat o'tdi.", { team: tm[s.ev.timeout].name }));
      else if (s.ev.a) { say(describe(s.ev, tm)); playMoveSound(s.ev); if (!s.ev.goal) crowdReact(s.ev); if (s.ev.a && st.myColor && s.ev.p.side !== st.myColor && typeof window.haptic === 'function') window.haptic(15); }
      if (s.ev.goal) goalFlash(s.ev.goal, s.st.score, tm);
      if (s.kickoff && s.status === 'active') setTimeout(() => say(T('fcKickoff', '{{team}} markazdan boshlaydi.', { team: tm[s.kickoff].name })), 1800);
    } else if ((!prev || freshGame) && s.status === 'active') say(T('fcKickoff', '{{team}} markazdan boshlaydi.', { team: tm[s.st.turn].name }));
    if (s.status === 'over' && s.result) {
      const key = s.seq + ':' + (s.rematch || []).join(',');
      if (st.overlayShown !== key) {
        st.overlayShown = key;
        const pitch = document.getElementById('fcWrap');
        if (pitch) pitch.querySelectorAll('.fc-final').forEach((o) => o.remove());
        setTimeout(() => { if (st.state === s) finishOverlay(s.result, s.st, tm); }, prev && prev.status === 'active' && ((s.ev && s.ev.goal) || s.result.reason === 'penalties') ? 1850 : 0);
        if (prev && prev.status === 'active' && typeof playSound === 'function') playSound('gameEnd');
        if (prev && prev.status === 'active' && s.result.winner) setTimeout(() => { cheer(s.result.winner); roar(0.8, 3); }, 300);
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
    st.lphase = null; st.lu = null; st.luSent = false; st.standKey = '';
    if (!want) { st.mode = null; crowdStop(); renderLobby(); }
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
        crowdStop();
      }
      return origSwitch.apply(this, arguments);
    };
  }
})();
