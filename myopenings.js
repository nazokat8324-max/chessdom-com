// 📖 Mening debyutlarim — profildagi panel (#profOpenPanel → #profOpenings, op-*): o'yinchining o'z standart o'yinlaridan
// debyutlar oilasi bo'yicha statistika (GET /api/users/:u/openings), eng yaxshi va e'tibor talab qiladigan debyut, oq/qora filtri.
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = { username: null, data: null, side: 'all', loading: false };
  const score = (o) => (o.games ? Math.round(((o.win + o.draw / 2) / o.games) * 100) : 0);
  const slice = (o) => (st.side === 'w' ? o.white : st.side === 'b' ? o.black : o);

  function render() {
    const el = document.getElementById('profOpenings');
    if (!el) return;
    if (st.loading && !st.data) { el.innerHTML = `<p class="op-empty">${esc(tx('loadingText', 'Yuklanmoqda...'))}</p>`; return; }
    const d = st.data;
    const rows = d ? d.openings.map((o) => ({ ...slice(o), name: o.name, eco: o.eco, line: o.line })).filter((o) => o.games > 0) : [];
    if (!d || !rows.length) { el.innerHTML = `<p class="op-empty">${esc(tx('opEmpty', "Hali yetarli o'yin yo'q — debyutlar standart o'yinlardan yig'iladi."))}</p>`; return; }
    const ranked = rows.filter((o) => o.games >= 3);
    const best = ranked.slice().sort((a, b) => score(b) - score(a) || b.games - a.games)[0];
    const worst = ranked.slice().sort((a, b) => score(a) - score(b) || b.games - a.games)[0];
    const hl = (o, cls, label) => o ? `<div class="${cls}"><small>${esc(label)}</small><b>${esc(o.name)}</b><span>${esc(score(o))}% · ${esc(tx('opGamesN', "{{n}} o'yin", { n: o.games }))}</span></div>` : '';
    el.innerHTML = `
      <div class="op-head"><small>${esc(tx('opAnalysed', "{{n}} ta standart o'yin tahlil qilindi", { n: d.analysed }))}</small>
        <div class="op-filter">${[['all', tx('opAll', 'Hammasi')], ['w', tx('exAsWhite', 'Oq bilan')], ['b', tx('exAsBlack', 'Qora bilan')]].map(([k, l]) => `<button type="button" class="${st.side === k ? 'active' : ''}" data-op-side="${k}">${esc(l)}</button>`).join('')}</div></div>
      ${best && worst && best !== worst ? `<div class="op-hl">${hl(best, 'best', '🏆 ' + tx('opBest', 'Eng yaxshi debyut'))}${hl(worst, 'worst', '⚠️ ' + tx('opWorst', "E'tibor talab qiladi"))}</div>` : ''}
      <ul class="op-list">${rows.map((o) => {
        const pct = (n) => (o.games ? (n / o.games) * 100 : 0);
        return `<li class="op-row" title="${esc(o.line)}">
          <span class="op-name"><b>${esc(o.name)}</b><small>${esc(o.eco)} · ${esc(tx('opGamesN', "{{n}} o'yin", { n: o.games }))}</small></span>
          <span><span class="op-bar"><i class="w" style="width:${pct(o.win)}%"></i><i class="d" style="width:${pct(o.draw)}%"></i><i class="l" style="width:${pct(o.loss)}%"></i></span>
            <span class="op-bar-label" style="display:block">${esc(o.win)} / ${esc(o.draw)} / ${esc(o.loss)}</span></span>
          <span class="op-score" title="${esc(tx('opScore', 'natija'))}">${esc(score(o))}%</span></li>`;
      }).join('')}</ul>`;
    el.querySelectorAll('[data-op-side]').forEach((b) => b.addEventListener('click', () => { st.side = b.dataset.opSide; render(); }));
  }

  window.loadProfileOpenings = async function (username) {
    if (!username) return;
    if (st.username === username && st.data) { render(); return; }
    st.username = username; st.data = null; st.side = 'all'; st.loading = true;
    render();
    try {
      const d = await fetch('/api/users/' + encodeURIComponent(username) + '/openings').then((r) => r.json());
      if (st.username === username && d && d.success) st.data = d;
    } catch (e) {}
    st.loading = false;
    render();
  };
  window.refreshProfileOpenings = render;
})();
