// 🔮 Bashorat o'yini — Jonli o'yinlar sahifasida tomoshabin uchun panel (#lvPredict, pr-*):
//  1) "Kim yutadi?" — Oq / Durrang / Qora (dastlabki 10 yurish ichida, bir marta); ochko ehtimolga teskari
//     (kutilmagan natija qimmatroq), umumiy kayfiyat chizig'i, liga o'yinida klub a'zolarining "ishonchi".
//  2) "Keyingi yurishni top" — yoqilsa, navbatdagi tomonning donasini surib taxmin qilasiz (to'g'ri bo'lsa +5).
//  3) "Bashoratchilar reytingi" oynasi (#predLbModal; shu oy / butun vaqt). Profilda #profilePredict.
// Server: socket predict-result / predict-move (ack), predict-stats, guess-result, predict-resolved; GET /api/predictions/leaderboard.
// live.js bilan bog'lanish: document hodisalari live:state / live:move / live:ended / live:stop va window.livePredict.
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const flag = (code) => code ? `<img class="pr-flag" src="https://flagcdn.com/w40/${esc(String(code).toLowerCase())}.png" alt="" onerror="this.remove()">` : '';
  const fresh = () => ({ roomId: null, stats: null, mine: null, isPlayer: false, guessMode: false, guess: null, last: null, session: { points: 0, correct: 0, total: 0 }, ended: false, resolved: null, white: null, black: null });
  let st = fresh();
  const lb = { period: 'month' };
  const PICK = { w: ['⚪', 'prWhite', 'Oq'], d: ['🤝', 'prDraw', 'Durrang'], b: ['⚫', 'prBlack', 'Qora'] };

  function render() {
    const el = document.getElementById('lvPredict');
    if (!el) return;
    if (!st.roomId || !st.stats || st.isPlayer || !window.currentUser) { el.innerHTML = ''; el.hidden = true; return; }
    el.hidden = false;
    const s = st.stats;
    const total = s.total || 0;
    const pct = (k) => total ? Math.round((s.counts[k] || 0) / total * 100) : 0;
    const canPick = s.open && !st.mine && !st.ended;
    const status = st.ended ? tx('prClosedEnded', "O'yin tugadi") : s.open ? tx('prOpenUntil', '{{n}}-yurishgacha ochiq', { n: s.openUntil / 2 }) : tx('prClosed', 'Qabul yopildi');
    let resultLine = '';
    if (st.resolved) {
      const r = st.resolved;
      if (r.outcome === null) resultLine = `<div class="pr-result muted">${esc(tx('prVoid', "O'yin bekor qilindi — bashoratlar hisobga olinmadi"))}</div>`;
      else if (st.mine) resultLine = st.mine === r.outcome
        ? `<div class="pr-result win">✅ ${esc(tx('prWon', "Bashoratingiz to'g'ri chiqdi! +{{n}} ochko", { n: r.points }))}</div>`
        : `<div class="pr-result lose">❌ ${esc(tx('prLost', "Bu safar topa olmadingiz"))}</div>`;
      if (r.outcome !== null) resultLine += `<small class="pr-meta">${esc(tx('prWinnersN', "{{w}} / {{t}} kishi to'g'ri topdi", { w: r.winners, t: r.total }))}</small>`;
    } else if (st.mine) {
      resultLine = `<div class="pr-result mine">${PICK[st.mine][0]} ${esc(tx('prYourPick', 'Sizning bashoratingiz: {{pick}} (+{{n}} ochko)', { pick: tx(PICK[st.mine][1], PICK[st.mine][2]), n: s.odds[st.mine] }))}</div>`;
    }
    const support = s.support ? `<div class="pr-support">💪 ${['w', 'b'].map(side => s.support[side] ? `<span>${flag(s.support[side].code)}${esc(tx('prSupportN', '{{n}} kishi ishonadi', { n: s.support[side].count }))}</span>` : '').join('')}</div>` : '';
    const g = st.last;
    const guessLine = st.guess
      ? `<div class="pr-guess-now">🎯 ${esc(tx('prGuessNow', 'Taxminingiz: {{san}}', { san: st.guess.san }))}</div>`
      : g ? `<div class="pr-guess-now ${g.correct ? 'win' : 'lose'}">${g.correct ? '✅ ' + esc(tx('prGuessWin', 'Topdingiz! {{san}} +{{n}}', { san: g.san, n: s.guessPoints })) : '❌ ' + esc(tx('prGuessLose', '{{mine}} emas — {{san}} yurildi', { mine: g.mine, san: g.san }))}${g.crowd ? ` <small>${esc(tx('prGuessCrowd', "({{c}}/{{t}} kishi topdi)", { c: g.crowd.correct, t: g.crowd.total }))}</small>` : ''}</div>`
      : `<div class="pr-guess-now muted">${esc(st.guessMode ? tx('prGuessHint', "Navbatdagi tomonning donasini doskada suring") : tx('prGuessOff', "Yoqing va o'yinchilarning keyingi yurishini taxmin qiling"))}</div>`;
    el.innerHTML = `
      <div class="pr-card">
        <div class="pr-head"><b>🔮 ${esc(tx('prTitle', 'Kim yutadi?'))}</b><small>${esc(status)}</small></div>
        <div class="pr-picks">${['w', 'd', 'b'].map(k => `
          <button type="button" class="pr-pick ${k}${st.mine === k ? ' mine' : ''}${st.resolved && st.resolved.outcome === k ? ' outcome' : ''}" data-pick="${k}" ${canPick ? '' : 'disabled'}>
            <span>${PICK[k][0]} ${esc(tx(PICK[k][1], PICK[k][2]))}</span><b>+${s.odds[k]}</b><small>${pct(k)}%</small>
          </button>`).join('')}</div>
        <div class="pr-bar" title="${esc(tx('prCrowd', 'Tomoshabinlar kayfiyati'))}"><i class="w" style="width:${pct('w')}%"></i><i class="d" style="width:${pct('d')}%"></i><i class="b" style="width:${pct('b')}%"></i></div>
        <small class="pr-meta">${esc(total ? tx('prCrowdN', '{{n}} kishi bashorat qildi', { n: total }) : tx('prCrowdNone', "Hali hech kim bashorat qilmadi — birinchi bo'ling!"))}</small>
        ${support}
        ${resultLine}
      </div>
      <div class="pr-card pr-guess${st.guessMode ? ' on' : ''}">
        <div class="pr-head"><b>🎯 ${esc(tx('prGuessTitle', 'Keyingi yurishni top'))}</b>
          ${st.ended ? '' : `<button type="button" class="pr-toggle${st.guessMode ? ' on' : ''}" data-guess-toggle><i></i></button>`}</div>
        ${guessLine}
        ${st.session.total ? `<small class="pr-meta">${esc(tx('prSession', "Bu o'yinda: {{p}} ochko · {{c}}/{{t}} to'g'ri", { p: st.session.points, c: st.session.correct, t: st.session.total }))}</small>` : ''}
      </div>
      <button type="button" class="pr-lb-btn" data-pred-lb>🏆 ${esc(tx('prLeaderboard', 'Bashoratchilar reytingi'))}</button>`;
    el.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => pick(b.dataset.pick)));
    const tg = el.querySelector('[data-guess-toggle]');
    if (tg) tg.addEventListener('click', () => { st.guessMode = !st.guessMode; if (!st.guessMode) clearGuess(); render(); });
    el.querySelector('[data-pred-lb]').addEventListener('click', openLeaderboard);
    // Taxmin rejimida taxtada barmoq donani suradi (sahifa aylanmaydi), aks holda taxta ustidan sahifani aylantirish mumkin
    const lb = document.getElementById('liveBoard');
    if (lb) lb.classList.toggle('lv-guess-mode', !!(st.guessMode && !st.ended));
  }

  function pick(k) {
    if (!st.roomId || typeof socket === 'undefined') return;
    socket.emit('predict-result', { roomId: st.roomId, pick: k }, (r) => {
      if (r && r.ok) {
        st.mine = r.pick;
        showToast(tx('prPickedToast', "Bashorat qabul qilindi: {{pick}} (+{{n}} ochko)", { pick: tx(PICK[k][1], PICK[k][2]), n: r.points }), 'success', 3000);
      } else {
        const msg = { closed: tx('prErrClosed', "Bashorat qabul qilish yopilgan"), already: tx('prErrAlready', "Siz bu o'yinga allaqachon bashorat qilgansiz"), player: tx('prErrPlayer', "O'z o'yiningizga bashorat qilolmaysiz"), auth: tx('teaErrAuth', 'Avval tizimga kiring') }[r && r.reason] || tx('errGeneric', 'Xatolik yuz berdi!');
        showToast(msg, 'warning');
      }
      render();
    });
  }

  // Doskadagi taxmin belgisi
  function markGuess(from, to) {
    clearMarks();
    [from, to].forEach(sq => { const e = document.querySelector('#liveBoard .square-' + sq); if (e) e.classList.add('lv-guess'); });
  }
  function clearMarks() { document.querySelectorAll('#liveBoard .lv-guess').forEach(e => e.classList.remove('lv-guess')); }
  function clearGuess() { st.guess = null; clearMarks(); }

  window.livePredict = {
    canDrag(piece, chess) {
      return !!(st.guessMode && st.roomId && !st.isPlayer && !st.ended && chess && piece && piece.charAt(0) === chess.turn());
    },
    drop(from, to, chess) {
      if (!st.roomId || typeof socket === 'undefined') return;
      const ply = chess.history().length;
      socket.emit('predict-move', { roomId: st.roomId, ply, from, to, promotion: 'q' }, (r) => {
        if (r && r.ok) {
          st.guess = { ply: r.ply, san: r.san, from, to };
          markGuess(from, to);
          if (typeof window.haptic === 'function') window.haptic(20);
        } else if (r && r.reason === 'illegal') showToast(tx('prErrIllegal', "Bunday yurish mumkin emas"), 'warning');
        else if (r && r.reason === 'late') showToast(tx('prErrLate', "Kech qoldingiz — yurish allaqachon qilindi"), 'warning');
        render();
      });
    }
  };

  // --- Bashoratchilar reytingi ---
  async function openLeaderboard() {
    let m = document.getElementById('predLbModal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'predLbModal';
      m.className = 'pr-modal';
      document.body.appendChild(m);
      m.addEventListener('click', (e) => { if (e.target === m) m.hidden = true; });
    }
    m.hidden = false;
    m.innerHTML = `<div class="pr-modal-card"><div class="pr-loading">🔮 ${esc(tx('loadingText', 'Yuklanmoqda...'))}</div></div>`;
    const headers = window.authToken ? { Authorization: 'Bearer ' + window.authToken } : {};
    const d = await fetch('/api/predictions/leaderboard?period=' + lb.period, { headers }).then(r => r.json()).catch(() => null);
    if (m.hidden) return;
    const rows = d && d.success ? d.leaders : [];
    const acc = (r) => r.total ? Math.round(r.correct / r.total * 100) : 0;
    m.innerHTML = `<div class="pr-modal-card">
      <div class="pr-modal-head"><b>🏆 ${esc(tx('prLeaderboard', 'Bashoratchilar reytingi'))}</b><button type="button" class="pr-x" data-close>✕</button></div>
      <div class="pr-tabs"><button type="button" class="${lb.period === 'month' ? 'active' : ''}" data-period="month">${esc(tx('prThisMonth', 'Shu oy'))}</button><button type="button" class="${lb.period === 'all' ? 'active' : ''}" data-period="all">${esc(tx('prAllTime', 'Butun vaqt'))}</button></div>
      <p class="pr-modal-note">${esc(tx('prLbNote', "Oy oxirida eng ko'p ochko to'plagan bashoratchi 🔮 nishon oladi"))}</p>
      ${rows.length ? `<div class="pr-lb">${rows.map((r, i) => `
        <div class="pr-lb-row${window.currentUser && r.username === window.currentUser.username ? ' me' : ''}">
          <span class="pr-rank">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
          <b class="player-link" data-username="${esc(r.username)}">${flag(r.country)}${esc(r.username)}</b>
          <small>${esc(tx('prAccuracy', "{{a}}% to'g'ri · {{t}} ta", { a: acc(r), t: r.total }))}</small>
          <em>${r.points}</em>
        </div>`).join('')}</div>` : `<div class="pr-loading">${esc(tx('prLbEmpty', "Hali bashoratlar yo'q — jonli o'yinlarni oching va birinchi bo'ling!"))}</div>`}
      ${d && d.me ? `<div class="pr-me">${esc(tx('prMe', "Siz: {{rank}}-o'rin · {{p}} ochko", { rank: d.me.rank, p: d.me.points }))}</div>` : ''}
    </div>`;
    m.querySelector('[data-close]').addEventListener('click', () => { m.hidden = true; });
    m.querySelectorAll('[data-period]').forEach(b => b.addEventListener('click', () => { lb.period = b.dataset.period; openLeaderboard(); }));
    m.querySelectorAll('.player-link').forEach(b => b.addEventListener('click', () => { m.hidden = true; }));
  }
  window.openPredictionLeaderboard = openLeaderboard;

  // Profil: bashorat ochkolari (profile-extras.js chaqiradi)
  window.renderProfilePredict = function (p) {
    const el = document.getElementById('profilePredict');
    if (!el) return;
    if (!p || (!p.total && !(p.awards || []).length)) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    const awards = (p.awards || []).length;
    el.innerHTML = `<span class="ps-main" title="${esc(tx('prProfileTitle', "Shu oy: {{m}} ochko · {{c}}/{{t}} to'g'ri bashorat", { m: p.monthPoints, c: p.correct, t: p.total }))}">🔮 ${esc(tx('prProfile', 'Bashorat'))} <b>${p.points}</b></span>`
      + (awards ? `<span class="ps-award" title="${esc(tx('prAwardTitle', "Oyning bashoratchisi: {{months}}", { months: p.awards.join(', ') }))}">🔮 ×${awards}</span>` : '');
  };

  // --- live.js hodisalari ---
  document.addEventListener('live:state', (e) => {
    const { data } = e.detail || {};
    if (!data || data.missing) return;
    const same = st.roomId === data.roomId;
    if (!same) st = fresh();
    st.roomId = data.roomId;
    st.white = data.white; st.black = data.black;
    if (data.predict) { st.stats = data.predict; st.mine = data.predict.mine || st.mine; st.isPlayer = !!data.predict.isPlayer; }
    st.ended = data.status !== 'active';
    render();
  });
  document.addEventListener('live:move', (e) => {
    const { san, ply } = e.detail || {};
    if (st.guess && st.guess.ply === ply) {
      const correct = st.guess.san === san;
      st.session.total++;
      if (correct) { st.session.correct++; st.session.points += (st.stats && st.stats.guessPoints) || 5; }
      // Server guess-result ni yurishdan oldin yuboradi — saqlab qo'yilgan bo'ladi
      st.last = { ply, san, mine: st.guess.san, correct, crowd: (st.crowd && st.crowd.ply === ply) ? st.crowd : null };
      if (correct && typeof window.haptic === 'function') window.haptic([30, 30, 30]);
    }
    clearGuess();
    if (st.stats && st.stats.open && ply + 1 >= st.stats.openUntil) st.stats.open = false;
    render();
  });
  document.addEventListener('live:ended', () => { st.ended = true; st.guessMode = false; clearGuess(); render(); });
  document.addEventListener('live:stop', () => { clearGuess(); st = fresh(); render(); });

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof socket === 'undefined' || !socket) return;
    socket.on('predict-stats', (d) => {
      if (!d || d.roomId !== st.roomId) return;
      const { roomId, ...rest } = d;
      st.stats = { ...rest };
      render();
    });
    socket.on('guess-result', (d) => {
      if (!d || d.roomId !== st.roomId) return;
      st.crowd = { ply: d.ply, correct: d.correct, total: d.total };
      if (st.last && st.last.ply === d.ply) { st.last.crowd = st.crowd; render(); }
    });
    socket.on('predict-resolved', (d) => {
      if (!d || d.roomId !== st.roomId) return;
      st.resolved = d;
      st.ended = true;
      if (st.mine && d.outcome && st.mine === d.outcome && typeof confetti === 'function') { try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } }); } catch (e) {} }
      render();
    });
  });
})();
