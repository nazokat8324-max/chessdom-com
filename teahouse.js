// 🍵 Choyxona (#teaView → #teaRoot, /choyxona, tea-*): ro'yxatlar o'rniga stollar. Bo'sh stulga o'tirasiz
// (vaqt nazorati tanlanadi) — boshqa o'yinchi qarshingizga o'tirishi bilan o'yin boshlanadi. Band stollarda
// davom etayotgan o'yinlar mini-doskada ko'rinadi, bosilsa tomosha qilinadi. Stollar uch "burchakka" bo'lingan:
// Bullet, Blitz, Rapid. Server: socket tea-enter/exit/sit/stand/join → tea-seats, tea-games, tea-seated, tea-error.
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const ZONES = [
    { key: 'bullet', icon: '🔥', title: ['teaZoneBullet', 'Tezkorlar burchagi'], sub: ['teaZoneBulletSub', "1–2 daqiqalik o'yinlar"], clocks: [[60, 0], [60, 1], [120, 1]] },
    { key: 'blitz', icon: '⚡', title: ['teaZoneBlitz', 'Blitz supasi'], sub: ['teaZoneBlitzSub', "3–5 daqiqalik o'yinlar"], clocks: [[180, 0], [180, 2], [300, 0], [300, 3]] },
    { key: 'rapid', icon: '⏱️', title: ['teaZoneRapid', 'Rapid ayvoni'], sub: ['teaZoneRapidSub', "10 daqiqa va undan uzun o'yinlar"], clocks: [[600, 0], [600, 5], [900, 10], [1800, 0]] }
  ];
  // Choynak (🫖 belgisi Windows 10 da yo'q — o'rniga chizilgan)
  const POT = '<svg class="tea-pot" viewBox="0 0 48 40" aria-hidden="true"><path d="M14 13h18l2 4c5 0 9 3 9 8s-4 8-9 8h-1c-2 3-6 5-11 5s-9-2-11-5L4 24c-2-1-3-3-1-4l6 3 1-6z" fill="#f4e3c3"/><path d="M34 21c3 0 5 2 5 4s-2 4-5 4" stroke="#b8865a" stroke-width="3" fill="none"/><rect x="18" y="8" width="10" height="5" rx="2" fill="#d9b88a"/><circle cx="23" cy="6" r="2.5" fill="#d9b88a"/><path d="M11 25c4 2 20 2 24 0" stroke="#1f6fb2" stroke-width="2.5" fill="none"/><circle cx="23" cy="29" r="2.2" fill="#c0392b"/></svg>';
  const st = { seats: [], games: [], online: 0, mine: null, active: false, tick: null, picker: null, sig: '' };
  const me = () => window.currentUser && window.currentUser.username;
  const clockLabel = (c) => (c.initial || c[0]) / 60 + '+' + (c.increment != null ? c.increment : c[1]);
  const flag = (code) => code ? `<img class="tea-flag" src="https://flagcdn.com/w40/${esc(String(code).toLowerCase())}.png" alt="" onerror="this.remove()">` : '';
  const settings = () => { try { return JSON.parse(localStorage.getItem('justChessSettings') || '{}'); } catch (e) { return {}; } };

  function avatar(username, version) {
    const v = version !== undefined ? version : (window.myAvatarVersion ? window.myAvatarVersion(username) : undefined);
    return `<span class="tea-av"><b>${esc(String(username || '?').charAt(0).toUpperCase())}</b>${window.avatarOverlay ? window.avatarOverlay(username, v) : ''}</span>`;
  }

  // Mini doska (oq pastda); FEN bo'lmasa — boshlang'ich holat
  function miniBoard(fen, lastMove) {
    const rows = String(fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR').split(' ')[0].split('/');
    const last = new Set(lastMove || []);
    let html = '';
    rows.forEach((row, r) => {
      let f = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) {
          for (let k = 0; k < Number(ch); k++, f++) html += cell(r, f, null, last);
        } else { html += cell(r, f, ch, last); f++; }
      }
    });
    return `<div class="tea-mini">${html}</div>`;
  }
  function cell(r, f, piece, last) {
    const sq = 'abcdefgh'[f] + (8 - r);
    const code = piece ? (piece === piece.toUpperCase() ? 'w' : 'b') + piece.toUpperCase() : null;
    const src = code && window.pieceUrl ? window.pieceUrl(code) : null;
    return `<i class="${(r + f) % 2 ? 'd' : 'l'}${last.has(sq) ? ' lm' : ''}">${src ? `<img src="${esc(src)}" alt="">` : ''}</i>`;
  }

  function chair(p, opts) {
    if (!p) {
      return `<button type="button" class="tea-chair empty${opts.pulse ? ' pulse' : ''}" ${opts.attr || 'disabled'}>
        <span class="tea-av tea-av-empty">${opts.icon || '+'}</span><span class="tea-chair-label">${esc(opts.label || '')}</span></button>`;
    }
    return `<div class="tea-chair taken${opts.me ? ' me' : ''}">
      ${avatar(p.username, p.avatarVersion)}
      <span class="tea-chair-label"><b class="player-link" data-username="${esc(p.username)}">${flag(p.country)}${esc(p.username)}</b><small>${p.rating || 1500}${window.rankBadge ? ' ' + window.rankBadge(p.rating || 1500) : ''}</small></span>
    </div>`;
  }

  function tag(clock, rated, variant) {
    return `<div class="tea-tag"><b>${clockLabel(clock)}</b><span>${esc(rated ? tx('teaRated', 'Reytingli') : tx('teaCasual', 'Reytingsiz'))}</span>${variant === 'chess960' ? '<span>🎲 960</span>' : ''}</div>`;
  }

  // Stol: kutayotgan o'yinchi (o'zimniki yoki boshqaniki)
  function seatTable(s) {
    const mine = s.username === me();
    const top = mine ? chair(null, { label: tx('teaWaitingOpp', 'Raqib kutilmoqda…'), icon: '⏳', pulse: true })
      : chair(s, {});
    const bottom = mine ? chair(s, { me: true })
      : chair(null, { label: tx('teaSitHere', "O'tirish"), icon: '+', pulse: true, attr: `data-join="${esc(s.id)}"` });
    return `<div class="tea-table ${mine ? 'mine' : 'waiting'}" data-seat="${esc(s.id)}">
      ${top}
      <div class="tea-desk"><div class="tea-cloth">${POT}${tag(s.clock, s.rated, s.variant)}</div></div>
      ${bottom}
      ${mine ? `<div class="tea-mine-bar"><span class="tea-timer" data-since="${s.createdAt}">0:00</span><button type="button" class="tea-stand" data-stand>${esc(tx('teaStand', 'Turish'))}</button></div>` : ''}
    </div>`;
  }

  // Stol: davom etayotgan o'yin (qora yuqorida, oq pastda)
  function gameTable(g) {
    const kind = g.kind === 'swiss' ? `<span class="tea-kind">🏁 ${esc(g.label || tx('teaKindSwiss', 'Turnir'))}</span>` : g.kind === 'league' ? `<span class="tea-kind">🏆 ${esc(tx('teaKindLeague', 'Liga'))}</span>` : '';
    return `<div class="tea-table playing" data-room="${esc(g.roomId)}" title="${esc(tx('teaWatchHint', 'Bosing — tomosha qilish'))}">
      ${chair(g.black, {})}
      <div class="tea-desk">${miniBoard(g.fen, g.lastMove)}
        <span class="tea-watchers">👁 ${g.watchers || 0}</span>${kind}
        <span class="tea-desk-clock">${clockLabel(g.clock)}${g.variant === 'chess960' ? ' · 🎲' : ''}</span>
      </div>
      ${chair(g.white, {})}
    </div>`;
  }

  // Bo'sh stol: istalgan stulni bossangiz — vaqt tanlash
  function emptyTable(zone) {
    const attr = `data-sit-zone="${zone.key}"`;
    return `<div class="tea-table empty">
      ${chair(null, { label: tx('teaFree', "Bo'sh"), icon: '🪑' })}
      <div class="tea-desk"><div class="tea-cloth">${POT}<span class="tea-cups">🍵 🍵</span></div></div>
      ${chair(null, { label: tx('teaSitDown', 'Stolga o\'tirish'), icon: '+', attr })}
    </div>`;
  }

  function zoneOf(mode) { return ZONES.find(z => z.key === mode) ? mode : 'blitz'; }

  function render() {
    const root = document.getElementById('teaRoot');
    if (!root) return;
    const mine = st.seats.find(s => s.username === me()) || null;
    st.mine = mine;
    const waiting = st.seats.length, playing = st.games.length;
    root.innerHTML = `
      <section class="tea-hero">
        <div class="tea-hero-text">
          <span class="tea-kicker">🍵 ${esc(tx('teaKicker', 'Faqat ChessCaravan da'))}</span>
          <h1>${esc(tx('teaTitle', 'Choyxona'))}</h1>
          <p>${esc(tx('teaLead', "Bo'sh stulga o'tiring — kimdir qarshingizga o'tirishi bilan o'yin boshlanadi. Band stollarni bosib, o'yinni tomosha qiling."))}</p>
        </div>
        <div class="tea-stats">
          <div><b>${st.online}</b><small>${esc(tx('teaOnline', 'onlayn'))}</small></div>
          <div><b>${waiting}</b><small>${esc(tx('teaWaitingN', 'stolda kutmoqda'))}</small></div>
          <div><b>${playing}</b><small>${esc(tx('teaPlayingN', "o'ynamoqda"))}</small></div>
        </div>
      </section>
      <div class="tea-zones">${ZONES.map(z => {
        const seats = st.seats.filter(s => zoneOf(s.mode) === z.key).sort((a, b) => (b.username === me()) - (a.username === me()));
        const games = st.games.filter(g => zoneOf(g.mode) === z.key);
        return `<section class="tea-zone" data-zone="${z.key}">
          <header><span class="tea-zone-ico">${z.icon}</span><div><h2>${esc(tx(z.title[0], z.title[1]))}</h2><small>${esc(tx(z.sub[0], z.sub[1]))}</small></div>
            <em>${esc(tx('teaTablesN', '{{n}} band stol', { n: seats.length + games.length }))}</em></header>
          <div class="tea-floor">${seats.map(seatTable).join('')}${games.map(gameTable).join('')}${emptyTable(z)}</div>
        </section>`;
      }).join('')}</div>`;
    bind(root);
    updateTimers();
  }

  function bind(root) {
    root.querySelectorAll('[data-join]').forEach(b => b.addEventListener('click', () => {
      if (!window.currentUser) return;
      b.disabled = true;
      socket.emit('tea-join', { id: b.dataset.join });
    }));
    root.querySelectorAll('[data-sit-zone]').forEach(b => b.addEventListener('click', () => openPicker(b.dataset.sitZone)));
    root.querySelectorAll('[data-stand]').forEach(b => b.addEventListener('click', () => socket.emit('tea-stand')));
    root.querySelectorAll('.tea-table.playing').forEach(t => t.addEventListener('click', (e) => {
      if (e.target.closest('.player-link')) return;
      if (window.watchGame) window.watchGame(t.dataset.room);
    }));
  }

  // Vaqt tanlash oynasi
  function openPicker(zoneKey) {
    const zone = ZONES.find(z => z.key === zoneKey) || ZONES[1];
    const s = settings();
    const pref = Array.isArray(s.quickClock) ? s.quickClock : null;
    const clock = zone.clocks.find(c => pref && c[0] === pref[0] && c[1] === pref[1]) || zone.clocks[zone.key === 'blitz' ? 1 : 0];
    st.picker = { zone, clock, rated: s.quickRated !== false, variant: 'standard' };
    let el = document.getElementById('teaPicker');
    if (!el) {
      el = document.createElement('div');
      el.id = 'teaPicker';
      el.className = 'tea-picker-back';
      document.body.appendChild(el);
      el.addEventListener('click', (e) => { if (e.target === el) closePicker(); });
    }
    paintPicker();
    el.hidden = false;
  }
  function closePicker() { const el = document.getElementById('teaPicker'); if (el) el.hidden = true; }
  function paintPicker() {
    const el = document.getElementById('teaPicker'), p = st.picker;
    el.innerHTML = `<div class="tea-picker" role="dialog">
      <div class="tea-picker-head"><span>${p.zone.icon}</span><div><b>${esc(tx('teaPickTitle', "Stolga o'tirish"))}</b><small>${esc(tx(p.zone.title[0], p.zone.title[1]))}</small></div><button type="button" class="tea-x" data-close>✕</button></div>
      <label>${esc(tx('teaPickClock', 'Vaqt nazorati'))}</label>
      <div class="tea-chips">${p.zone.clocks.map(c => `<button type="button" class="${c === p.clock ? 'active' : ''}" data-clock="${c.join(',')}">${clockLabel(c)}</button>`).join('')}</div>
      <label>${esc(tx('teaPickType', "O'yin turi"))}</label>
      <div class="tea-seg"><button type="button" class="${p.rated ? 'active' : ''}" data-rated="1">${esc(tx('teaRated', 'Reytingli'))}</button><button type="button" class="${!p.rated ? 'active' : ''}" data-rated="0">${esc(tx('teaCasual', 'Reytingsiz'))}</button></div>
      <div class="tea-seg"><button type="button" class="${p.variant === 'standard' ? 'active' : ''}" data-variant="standard">♟ ${esc(tx('teaStandard', 'Standart'))}</button><button type="button" class="${p.variant === 'chess960' ? 'active' : ''}" data-variant="chess960">🎲 Chess960</button></div>
      <button type="button" class="tea-go" data-go>🪑 ${esc(tx('teaSitBtn', "O'tirish — {{clock}}", { clock: clockLabel(p.clock) }))}</button>
      <small class="tea-picker-note">${esc(tx('teaPickNote', "Qarshingizga kimdir o'tirishi bilan o'yin boshlanadi. Choyxonadan chiqsangiz, stol bo'shaydi."))}</small>
    </div>`;
    el.querySelector('[data-close]').addEventListener('click', closePicker);
    el.querySelectorAll('[data-clock]').forEach(b => b.addEventListener('click', () => { const [a, c] = b.dataset.clock.split(',').map(Number); p.clock = p.zone.clocks.find(x => x[0] === a && x[1] === c); paintPicker(); }));
    el.querySelectorAll('[data-rated]').forEach(b => b.addEventListener('click', () => { p.rated = b.dataset.rated === '1'; paintPicker(); }));
    el.querySelectorAll('[data-variant]').forEach(b => b.addEventListener('click', () => { p.variant = b.dataset.variant; paintPicker(); }));
    el.querySelector('[data-go]').addEventListener('click', () => {
      socket.emit('tea-sit', { initial: p.clock[0], increment: p.clock[1], rated: p.rated, variant: p.variant });
      closePicker();
    });
  }

  function updateTimers() {
    document.querySelectorAll('#teaRoot .tea-timer').forEach(el => {
      const s = Math.max(0, Math.floor((Date.now() - Number(el.dataset.since)) / 1000));
      el.textContent = '⏳ ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    });
  }

  // Faqat o'zgarish bo'lganda qayta chiziladi (mini doskalar miltillamasin)
  function maybeRender() {
    const sig = JSON.stringify([st.seats.map(s => s.id), st.games.map(g => [g.roomId, g.fen, g.watchers]), st.online, window.i18next && window.i18next.language]);
    if (sig === st.sig) return;
    st.sig = sig;
    render();
  }

  window.renderTeaView = function () {
    st.active = true;
    st.sig = '';
    if (typeof socket !== 'undefined' && socket) socket.emit('tea-enter');
    render();
    clearInterval(st.tick);
    st.tick = setInterval(updateTimers, 1000);
  };
  // Choyxonadan chiqildi — lobbi xonasidan chiqamiz va stoldan turamiz
  window.leaveTeahouse = function () {
    if (!st.active) return;
    st.active = false;
    clearInterval(st.tick);
    closePicker();
    if (typeof socket !== 'undefined' && socket) {
      socket.emit('tea-exit');
      if (st.mine) socket.emit('tea-stand');
    }
    st.mine = null;
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof socket === 'undefined' || !socket) return;
    socket.on('tea-seats', (d) => { st.seats = d.seats || []; st.online = d.online || st.online; if (st.active) maybeRender(); });
    socket.on('tea-games', (d) => { st.games = d.games || []; st.online = d.online || st.online; if (st.active) maybeRender(); });
    socket.on('tea-seated', (s) => { showToast(tx('teaSeatedToast', "Stolga o'tirdingiz ({{clock}}) — raqib kutilmoqda", { clock: clockLabel(s.clock) }), 'success', 3000); });
    socket.on('tea-error', (d) => {
      const r = d && d.reason;
      const msg = {
        gone: tx('teaErrGone', "Bu stol endi bo'sh emas"), you_busy: tx('teaErrBusy', "Avval joriy o'yiningizni tugating"),
        blocked: tx('teaErrBlocked', "Bu o'yinchi bilan o'ynay olmaysiz"), self: tx('teaErrSelf', "Bu sizning stolingiz"),
        full: tx('teaErrFull', "Choyxonada joy qolmadi, birozdan keyin urinib ko'ring"), expired: tx('teaErrExpired', "30 daqiqa raqib kelmadi — stoldan turdingiz"),
        auth: tx('teaErrAuth', 'Avval tizimga kiring')
      }[r] || tx('errGeneric', 'Xatolik yuz berdi!');
      showToast(msg, 'warning');
      if (st.active) { st.sig = ''; maybeRender(); }
    });
    // Qayta ulanganda lobbiga qaytadan kiramiz
    socket.on('connect', () => { if (st.active) socket.emit('tea-enter'); });
  });
})();
