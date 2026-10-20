// 📜 Oy yakuni (Mavsum yakuni): o'yinchining oy davomidagi o'yinlari hikoya (story) ko'rinishida —
// natijalar, reyting o'zgarishi, sevimli debyut, eng katta g'alaba, raqiblar, klub uchun urushdagi hissa va ulashish kartasi.
// Server: GET /api/users/:username/wrapped?season=YYYY-MM. Kirish — profildagi "🎁 Oy yakuni" (window.openWrapped).
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const SLIDE_MS = 6500;
  const MODE_LABEL = { rapid: '⏱️ Rapid', blitz: '⚡ Blitz', bullet: '🔥 Bullet', chess960: '🎲 Chess960' };
  const st = { data: null, slides: [], i: 0, timer: null, startedAt: 0, paused: false, username: null };

  function monthName(season) {
    const [y, m] = season.split('-').map(Number);
    const lang = (window.i18next && window.i18next.language) || 'en';
    if (lang === 'uz') return ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'][m - 1] + ' ' + y; // brauzerlarda uz-UZ oy nomi yo'q
    try { return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(lang, { month: 'long', year: 'numeric', timeZone: 'UTC' }); }
    catch (e) { return season; }
  }
  const clubLabel = (c) => c ? (window.countryName ? window.countryName(c.name, c.code) : c.name) : '';
  const flag = (code) => code ? `<img class="wr-flag" src="https://flagcdn.com/w80/${esc(String(code).toLowerCase())}.png" alt="" onerror="this.remove()">` : '';

  function favouriteOpening(lines) {
    if (!window.openingFor || !lines || !lines.length) return null;
    const count = new Map();
    for (const line of lines) {
      const o = window.openingFor(line);
      if (!o) continue;
      const family = o.name.split(':')[0].trim();
      const c = count.get(family) || { name: family, eco: o.eco, n: 0 };
      c.n++;
      count.set(family, c);
    }
    return [...count.values()].sort((a, b) => b.n - a.n)[0] || null;
  }

  function buildSlides(d) {
    const s = [];
    const month = monthName(d.season);
    s.push({ key: 'cover', cls: 'wr-s-cover', html: `
      <div class="wr-kicker">ChessDom · ${esc(month)}</div>
      <div class="wr-avatar"><span>${esc(d.username.charAt(0).toUpperCase())}</span>${window.avatarOverlay ? window.avatarOverlay(d.username, d.avatarVersion) : ''}</div>
      <h2>${esc(tx('wrCoverTitle', '{{name}}, sizning oyingiz', { name: d.username }))}</h2>
      <p>${esc(tx('wrCoverSub', "Bu oy taxtada nimalar bo'lganini birga ko'rib chiqamiz"))}</p>` });
    if (!d.games) {
      s.push({ key: 'empty', cls: 'wr-s-empty', html: `<div class="wr-big">♟️</div>
        <h2>${esc(tx('wrEmptyTitle', "Bu oyda hali o'yin yo'q"))}</h2>
        <p>${esc(tx('wrEmptySub', "Bir nechta o'yin o'ynang — oy oxirida sizning hikoyangiz shu yerda bo'ladi"))}</p>
        <button type="button" class="wr-btn" data-wr-play>${esc(tx('twPlay', "O'ynash"))}</button>` });
      return s;
    }
    const modes = Object.entries(d.byMode || {}).sort((a, b) => b[1] - a[1]);
    s.push({ key: 'results', cls: 'wr-s-results', html: `
      <div class="wr-kicker">${esc(tx('wrResultsKicker', 'Natijalar'))}</div>
      <div class="wr-huge" data-count="${d.games}">${d.games}</div>
      <h2>${esc(tx('wrGamesPlayed', "o'yin o'ynadingiz"))}</h2>
      <div class="wr-wdl"><div class="w"><b>${d.win}</b><small>${esc(tx('wrWins', "G'alaba"))}</small></div><div class="d"><b>${d.draw}</b><small>${esc(tx('wrDraws', 'Durrang'))}</small></div><div class="l"><b>${d.loss}</b><small>${esc(tx('wrLosses', "Mag'lubiyat"))}</small></div></div>
      <div class="wr-bar"><i class="w" style="width:${d.win / d.games * 100}%"></i><i class="d" style="width:${d.draw / d.games * 100}%"></i><i class="l" style="width:${d.loss / d.games * 100}%"></i></div>
      <p>${esc(tx('wrWinRate', "G'alaba darajasi {{p}}% · eng uzun seriya {{s}}", { p: d.winRate, s: d.streak }))}</p>
      ${modes.length ? `<div class="wr-chips">${modes.map(([m, n]) => `<span>${esc(MODE_LABEL[m] || m)} <b>${n}</b></span>`).join('')}</div>` : ''}` });

    const ratings = Object.entries(d.ratings || {});
    if (ratings.length) {
      const best = ratings.slice().sort((a, b) => (b[1].to - b[1].from) - (a[1].to - a[1].from))[0];
      const diff = best[1].to - best[1].from;
      s.push({ key: 'rating', cls: 'wr-s-rating' + (diff < 0 ? ' down' : ''), html: `
        <div class="wr-kicker">${esc(tx('wrRatingKicker', 'Reyting'))}</div>
        <div class="wr-huge">${diff > 0 ? '+' : ''}${diff}</div>
        <h2>${esc(MODE_LABEL[best[0]] || best[0])}: ${best[1].from} → ${best[1].to}</h2>
        <div class="wr-rlist">${ratings.map(([m, r]) => { const x = r.to - r.from; return `<div><span>${esc(MODE_LABEL[m] || m)}</span><b>${r.to}</b><em class="${x > 0 ? 'up' : x < 0 ? 'down' : ''}">${x > 0 ? '▲ +' + x : x < 0 ? '▼ ' + x : '•'}</em></div>`; }).join('')}</div>
        ${window.rankBadge ? `<div class="wr-rank">${window.rankBadge(best[1].to, true)}</div>` : ''}` });
    }

    const op = favouriteOpening(d.openingLines);
    if (op) s.push({ key: 'opening', cls: 'wr-s-opening', html: `
      <div class="wr-kicker">${esc(tx('wrOpeningKicker', 'Sevimli debyut'))}</div>
      <div class="wr-big">📖</div>
      <h2 class="wr-opening">${esc(op.name)}</h2>
      <p>${esc(tx('wrOpeningSub', "{{n}} ta o'yinda shu debyut ({{eco}})", { n: op.n, eco: op.eco }))}</p>` });

    if (d.bestGain) s.push({ key: 'best', cls: 'wr-s-best', html: `
      <div class="wr-kicker">${esc(tx('wrBestKicker', 'Oyning eng yaxshi g\'alabasi'))}</div>
      <div class="wr-big">🏆</div>
      <div class="wr-huge">+${d.bestGain.gain}</div>
      <h2>${d.bestGain.opponent ? esc(tx('wrBestVs', '{{name}} ustidan', { name: d.bestGain.opponent })) : ''}</h2>
      <p>${esc(MODE_LABEL[d.bestGain.mode] || d.bestGain.mode)} · ${esc(new Date(d.bestGain.at).toLocaleDateString())}</p>` });

    const people = [];
    if (d.mostPlayed && d.mostPlayed.games >= 2) people.push(['🤝', tx('wrMostPlayed', "Eng ko'p o'ynagan raqib"), d.mostPlayed, tx('lbGamesN', "{{n}} o'yin", { n: d.mostPlayed.games })]);
    if (d.nemesis) people.push(['😈', tx('wrNemesis', 'Ashaddiy raqib'), d.nemesis, tx('wrBeatYou', "sizni {{n}} marta yengdi", { n: d.nemesis.loss })]);
    if (d.victim) people.push(['🎯', tx('wrVictim', "Sevimli \"mijoz\""), d.victim, tx('wrYouBeat', "{{n}} marta yutdingiz", { n: d.victim.win })]);
    if (people.length) s.push({ key: 'rivals', cls: 'wr-s-rivals', html: `
      <div class="wr-kicker">${esc(tx('wrRivalsKicker', 'Raqiblar'))}</div>
      <h2>${esc(tx('wrRivalsTitle', 'Bu oy sizni kimlar sinadi'))}</h2>
      <div class="wr-people">${people.map(([ic, label, o, line]) => `<div class="wr-person"><span>${ic}</span><div><small>${esc(label)}</small><b>${esc(o.name)}</b><em>${esc(line)} · ${o.win}/${o.draw}/${o.loss}</em></div></div>`).join('')}</div>` });

    const w = d.war || {};
    if (w.club) s.push({ key: 'war', cls: 'wr-s-war', html: `
      <div class="wr-kicker">🗺️ ${esc(tx('warTitle', 'Davlatlar urushi'))}</div>
      ${flag(w.club.code)}
      <div class="wr-huge">${w.points || 0}</div>
      <h2>${esc(tx('wrWarPoints', '{{club}} uchun urush ochkosi', { club: clubLabel(w.club) }))}</h2>
      <p>${w.club.rank ? esc(tx('wrWarRank', "Klubingiz {{rank}}-o'rinda · {{t}} ta hudud", { rank: w.club.rank, t: w.club.territories })) : esc(tx('wrWarNoRank', "Klubingiz hali hudud egallamagan"))}</p>` });
    else s.push({ key: 'war', cls: 'wr-s-war', html: `
      <div class="wr-kicker">🗺️ ${esc(tx('warTitle', 'Davlatlar urushi'))}</div>
      <div class="wr-big">🏳️</div>
      <h2>${esc(tx('wrNoClub', "Siz hali hech qaysi davlat klubida emassiz"))}</h2>
      <p>${esc(tx('wrNoClubSub', "Klubga qo'shiling — har g'alabangiz davlatingizga xaritada hudud olib beradi"))}</p>
      <button type="button" class="wr-btn" data-wr-clubs>${esc(tx('wrJoinClub', 'Klublarga o\'tish'))}</button>` });

    s.push({ key: 'share', cls: 'wr-s-share', html: `
      <div class="wr-kicker">${esc(tx('wrShareKicker', 'Ulashing'))}</div>
      <canvas class="wr-canvas" width="1080" height="1350"></canvas>
      <div class="wr-actions"><button type="button" class="wr-btn" data-wr-share>📤 ${esc(tx('wrShare', 'Ulashish'))}</button><button type="button" class="wr-btn ghost" data-wr-download>⬇ PNG</button></div>`, after: (el) => drawCard(el.querySelector('canvas'), d, op) });
    return s;
  }

  // Ulashish kartasi (1080×1350) — sayt rangi bilan
  function drawCard(cv, d, op) {
    if (!cv) return;
    const x = cv.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const accent = (css.getPropertyValue('--accent') || '#01CCD5').trim();
    const bg = (css.getPropertyValue('--cd-bg') || '#0d1117').trim();
    const g = x.createLinearGradient(0, 0, 1080, 1350);
    g.addColorStop(0, bg); g.addColorStop(1, '#05070b');
    x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
    // Shaxmat katakchalari bezagi
    x.globalAlpha = 0.06; x.fillStyle = accent;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2) x.fillRect(c * 135, 1350 - (r + 1) * 135, 135, 135);
    x.globalAlpha = 1;
    x.fillStyle = accent; x.fillRect(80, 100, 120, 10);
    x.textBaseline = 'alphabetic';
    const font = (w, s) => `${w} ${s}px Inter, "Segoe UI", Arial, sans-serif`;
    x.fillStyle = '#ffffff'; x.font = font(800, 44); x.fillText('ChessDom', 80, 180);
    x.fillStyle = 'rgba(255,255,255,0.65)'; x.font = font(600, 38); x.fillText(monthName(d.season), 80, 240);
    x.fillStyle = '#ffffff'; x.font = font(900, 92); x.fillText(d.username.length > 16 ? d.username.slice(0, 15) + '…' : d.username, 80, 380);
    const stat = (label, value, color, cx, cy) => {
      x.fillStyle = color; x.font = font(900, 120); x.fillText(String(value), cx, cy);
      x.fillStyle = 'rgba(255,255,255,0.6)'; x.font = font(600, 34); x.fillText(label, cx, cy + 52);
    };
    stat(tx('wrCardGames', "o'yin"), d.games, '#ffffff', 80, 570);
    stat(tx('wrCardWinRate', "g'alaba %"), d.winRate + '%', accent, 560, 570);
    stat(tx('wrWins', "G'alaba"), d.win, '#4ade80', 80, 800);
    stat(tx('wrDraws', 'Durrang'), d.draw, '#cbd5e1', 400, 800);
    stat(tx('wrLosses', "Mag'lubiyat"), d.loss, '#f87171', 720, 800);
    let y = 980;
    const line = (icon, text) => { x.fillStyle = '#ffffff'; x.font = font(700, 40); x.fillText(icon + '  ' + (text.length > 40 ? text.slice(0, 39) + '…' : text), 80, y); y += 70; };
    const r = Object.entries(d.ratings || {}).sort((a, b) => (b[1].to - b[1].from) - (a[1].to - a[1].from))[0];
    if (r) line('📈', `${(MODE_LABEL[r[0]] || r[0]).replace(/^\S+\s/, '')} ${r[1].to} (${r[1].to - r[1].from >= 0 ? '+' : ''}${r[1].to - r[1].from})`);
    if (op) line('📖', op.name);
    if (d.war && d.war.club) line('🗺️', `${clubLabel(d.war.club)} · ${d.war.points || 0} ${tx('wrCardWarPts', 'urush ochkosi')}`);
    x.fillStyle = 'rgba(255,255,255,0.45)'; x.font = font(600, 30);
    x.fillText(location.host || 'chessdom', 80, 1290);
  }

  function cardBlob(cv) { return new Promise(res => cv.toBlob(res, 'image/png')); }

  async function share(cv) {
    const blob = await cardBlob(cv);
    const name = `chessdom-${st.data.username}-${st.data.season}.png`;
    try {
      const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'ChessDom', text: tx('wrShareText', 'Mening shaxmat oyim — ChessDom') });
        return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    download(blob, name);
  }
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // --- Oyna ---
  function modal() {
    let m = document.getElementById('wrappedModal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'wrappedModal';
    m.className = 'wr-modal';
    m.hidden = true;
    m.innerHTML = `<div class="wr-stage">
      <div class="wr-progress"></div>
      <div class="wr-top"><select class="wr-season" aria-label="season"></select><button type="button" class="wr-close" aria-label="close">✕</button></div>
      <div class="wr-slide"></div>
      <button type="button" class="wr-nav prev" aria-label="prev"></button><button type="button" class="wr-nav next" aria-label="next"></button>
    </div>`;
    document.body.appendChild(m);
    m.querySelector('.wr-close').addEventListener('click', close);
    m.addEventListener('click', (e) => { if (e.target === m) close(); });
    m.querySelector('.wr-nav.prev').addEventListener('click', () => go(st.i - 1));
    m.querySelector('.wr-nav.next').addEventListener('click', () => go(st.i + 1));
    m.querySelector('.wr-season').addEventListener('change', (e) => load(st.username, e.target.value));
    const stage = m.querySelector('.wr-stage');
    // Bosib turish — to'xtatib turadi (story uslubi)
    stage.addEventListener('pointerdown', (e) => { if (!e.target.closest('button, select, a')) st.paused = Date.now(); });
    const resume = () => { if (st.paused) { st.startedAt += Date.now() - st.paused; st.paused = false; } };
    stage.addEventListener('pointerup', resume);
    stage.addEventListener('pointerleave', resume);
    document.addEventListener('keydown', (e) => {
      if (m.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(st.i + 1);
      else if (e.key === 'ArrowLeft') go(st.i - 1);
    });
    return m;
  }

  function close() {
    const m = document.getElementById('wrappedModal');
    if (m) m.hidden = true;
    cancelAnimationFrame(st.timer);
    document.body.classList.remove('wr-open');
  }

  function go(i) {
    const m = modal();
    if (i < 0) i = 0;
    if (i >= st.slides.length) { st.i = st.slides.length - 1; st.paused = Date.now(); return paint(); }
    st.i = i;
    st.startedAt = Date.now();
    st.paused = false;
    const slide = st.slides[i];
    const el = m.querySelector('.wr-slide');
    el.className = 'wr-slide ' + slide.cls;
    el.innerHTML = slide.html;
    void el.offsetWidth;
    el.classList.add('in');
    if (slide.after) slide.after(el);
    el.querySelectorAll('[data-wr-share]').forEach(b => b.addEventListener('click', () => share(el.querySelector('canvas'))));
    el.querySelectorAll('[data-wr-download]').forEach(b => b.addEventListener('click', async () => download(await cardBlob(el.querySelector('canvas')), `chessdom-${st.data.username}-${st.data.season}.png`)));
    el.querySelectorAll('[data-wr-play]').forEach(b => b.addEventListener('click', () => { close(); if (window.closeProfileModal) window.closeProfileModal(); switchView('game'); }));
    el.querySelectorAll('[data-wr-clubs]').forEach(b => b.addEventListener('click', () => { close(); if (window.closeProfileModal) window.closeProfileModal(); switchView('clubs'); }));
    // Oxirgi slayd (ulashish) avtomatik o'tmaydi
    if (i === st.slides.length - 1) st.paused = Date.now();
    paint();
  }

  function paint() {
    const m = modal();
    const bar = m.querySelector('.wr-progress');
    if (bar.children.length !== st.slides.length) bar.innerHTML = st.slides.map(() => '<span><i></i></span>').join('');
    cancelAnimationFrame(st.timer);
    const tick = () => {
      if (m.hidden) return;
      const elapsed = st.paused ? st.paused - st.startedAt : Date.now() - st.startedAt;
      const p = Math.min(1, elapsed / SLIDE_MS);
      [...bar.children].forEach((s, k) => { s.firstChild.style.width = (k < st.i ? 100 : k === st.i ? (st.i === st.slides.length - 1 ? 100 : p * 100) : 0) + '%'; });
      if (!st.paused && p >= 1) return go(st.i + 1);
      st.timer = requestAnimationFrame(tick);
    };
    tick();
  }

  async function load(username, season) {
    const m = modal();
    m.hidden = false;
    document.body.classList.add('wr-open');
    st.username = username;
    const slide = m.querySelector('.wr-slide');
    slide.className = 'wr-slide wr-s-loading in';
    slide.innerHTML = `<div class="wr-big wr-spin">♞</div><p>${esc(tx('loadingText', 'Yuklanmoqda...'))}</p>`;
    m.querySelector('.wr-progress').innerHTML = '';
    cancelAnimationFrame(st.timer);
    const [d] = await Promise.all([
      fetch('/api/users/' + encodeURIComponent(username) + '/wrapped' + (season ? '?season=' + encodeURIComponent(season) : '')).then(r => r.json()).catch(() => null),
      window.loadOpenings ? window.loadOpenings() : null
    ]);
    if (st.username !== username || m.hidden) return;
    if (!d || !d.success) {
      slide.innerHTML = `<div class="wr-big">⚠️</div><p>${esc(tServer(d && d.message) || tx('errGeneric', 'Xatolik yuz berdi!'))}</p>`;
      return;
    }
    st.data = d;
    const sel = m.querySelector('.wr-season');
    const months = d.seasons.includes(d.season) ? d.seasons : [d.season, ...d.seasons];
    sel.innerHTML = months.map(s => `<option value="${esc(s)}"${s === d.season ? ' selected' : ''}>${esc(monthName(s))}</option>`).join('');
    sel.hidden = months.length < 2;
    st.slides = buildSlides(d);
    go(0);
  }

  window.openWrapped = function (username, season) {
    const u = username || (window.currentUser && window.currentUser.username);
    if (!u) return;
    load(u, season);
  };
})();
