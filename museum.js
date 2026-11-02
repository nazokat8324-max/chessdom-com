// 🏛 Shaxmat tarixi muzeyi (Kutubxona ichida: /kutubxona?m=muzey, mu-*). Ma'lumot — museum-data.js (window.ChessMuseum).
// Bekatlar vaqt chizig'ida; ko'rgazmalar: dona yurishi chizmasi (piece-guide.js PieceGuide.diagram), oldin/keyin taqqoslash,
// o'yin turini ochish (Shatranj, Chess960), kutubxonadagi mashhur partiya. Server ishtirok etmaydi.
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LANGS = ['uz', 'en', 'ru', 'es', 'de', 'fr', 'tr', 'kk', 'tg', 'ky', 'tk', 'az', 'zh', 'it'];
  const uiLang = () => (window.uiLang ? window.uiLang() : 'en');
  const L = (arr) => {
    const l = uiLang();
    if (l === 'uzc') return window.UzCyrl ? window.UzCyrl.toCyrl((arr && arr[0]) || '') : (arr && arr[0]) || '';
    const i = LANGS.indexOf(l);
    return (arr && arr[i < 0 ? 1 : i]) || (arr && arr[1]) || '';
  };
  const stops = () => (window.ChessMuseum && window.ChessMuseum.STOPS) || [];
  const diagram = (piece, variant) => (window.PieceGuide && window.PieceGuide.diagram ? window.PieceGuide.diagram(piece, variant) : '');

  function demoHtml(d) {
    if (d.type === 'diagram') return `<figure class="mu-demo">${diagram(d.piece, d.variant)}<figcaption>${esc(L(d.caption))}</figcaption></figure>`;
    if (d.type === 'compare') {
      const label = { Q: tx('musQueen', 'Farzin → malika'), B: tx('musBishop', 'Fil: sakrash → uzoq diagonal') };
      return `<div class="mu-compare">${d.pieces.map((p) => `<div class="mu-cmp-row"><b>${esc(label[p] || '')}</b>
        <div class="mu-cmp-pair">
          <figure class="mu-demo small">${diagram(p, 'shatranj')}<figcaption>${esc(tx('musBefore', 'Oldin'))}</figcaption></figure>
          <span class="mu-arrow" aria-hidden="true">→</span>
          <figure class="mu-demo small">${diagram(p, 'standard')}<figcaption>${esc(tx('musAfter', 'Keyin'))}</figcaption></figure>
        </div></div>`).join('')}</div>`;
    }
    if (d.type === 'play') {
      const label = d.variant === 'shatranj' ? '🏺 ' + tx('musPlayShatranj', "Shatranj o'ynash") : '🎲 ' + tx('musPlay960', "Chess960 o'ynash");
      return `<button type="button" class="lib-btn mu-play" data-mu-play="${esc(d.variant)}">${esc(label)}</button>`;
    }
    if (d.type === 'game') return `<button type="button" class="lib-btn ghost mu-play" data-mu-game="${esc(d.id)}">▶ ${esc(tx('libWatch', "Partiyani ko'rish"))}</button>`;
    return '';
  }

  // O'yin sahifasini shu tur tanlangan holda ochish (o'yin davom etayotgan bo'lsa — faqat sahifa)
  function playVariant(v) {
    if (typeof window.switchView === 'function') window.switchView('game');
    setTimeout(() => {
      if (typeof window.isGameInProgress === 'function' && window.isGameInProgress()) return;
      const b = document.querySelector('#variantSeg [data-variant="' + v + '"]');
      if (b && typeof window.pickVariant === 'function') window.pickVariant(b);
    }, 0);
  }

  function render(el, onBack) {
    const S = stops();
    el.innerHTML = `<article class="mu-page">
      <button type="button" class="ps-back" data-mu-back>← ${esc(tx('libTitle', 'Kutubxona'))}</button>
      <header class="mu-hero">
        <span class="tea-kicker">🏛 ${esc(tx('libKicker', 'ChessCaravan kutubxonasi'))}</span>
        <h1>${esc(tx('musTitle', 'Shaxmat tarixi muzeyi'))}</h1>
        <p>${esc(tx('musLead', "Hindistondan Samarqand orqali butun dunyoga: shaxmat Ipak yo'li bo'ylab qanday sayohat qilganini va qoidalari qanday o'zgarganini ko'ring."))}</p>
      </header>
      <nav class="mu-route" aria-label="${esc(tx('musRoute', "Shaxmat yo'li"))}">${S.map((s) => `<a href="#mu-${esc(s.id)}" data-mu-go="${esc(s.id)}"><span>${s.icon}</span><b>${esc(s.year)}</b><small>${esc(L(s.place))}</small></a>`).join('')}</nav>
      <ol class="mu-timeline">${S.map((s) => `<li class="mu-stop" id="mu-${esc(s.id)}">
        <span class="mu-dot" aria-hidden="true">${s.icon}</span>
        <div class="mu-card">
          <span class="mu-year">${esc(s.year)} · ${esc(L(s.place))}</span>
          <h2>${esc(L(s.title))}</h2>
          <p>${esc(L(s.text))}</p>
          ${(s.demos || []).map(demoHtml).join('')}
        </div></li>`).join('')}</ol>
    </article>`;
    el.querySelector('[data-mu-back]').onclick = onBack;
    el.querySelectorAll('[data-mu-go]').forEach((a) => a.onclick = (e) => {
      e.preventDefault();
      const t = document.getElementById('mu-' + a.dataset.muGo);
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    el.querySelectorAll('[data-mu-play]').forEach((b) => b.onclick = () => playVariant(b.dataset.muPlay));
    el.querySelectorAll('[data-mu-game]').forEach((b) => b.onclick = () => window.openLibraryGame && window.openLibraryGame(b.dataset.muGame));
    document.title = tx('musTitle', 'Shaxmat tarixi muzeyi') + ' · ChessCaravan';
    addVideos(el);
  }

  // ▶ YouTube'dagi "Shaxmat tarixi" Shorts'lari: faqat ochiq bo'lganlari (server tekshiradi), havola — yangi oynada (sahifaga joylanmaydi)
  async function addVideos(el) {
    let videos = {};
    try { const r = await fetch('/api/museum/videos'); const d = await r.json(); videos = (d && d.videos) || {}; } catch (e) { return; }
    for (const [stop, id] of Object.entries(videos)) {
      const card = el.querySelector('#mu-' + CSS.escape(stop) + ' .mu-card');
      if (!card || card.querySelector('.mu-video') || !/^[\w-]{6,20}$/.test(id)) continue;
      const a = document.createElement('a');
      a.className = 'lib-btn ghost mu-play mu-video';
      a.href = 'https://www.youtube.com/shorts/' + id;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.innerHTML = (window.youtubeIcon ? window.youtubeIcon() : '▶') + ' ' + esc(tx('musWatchVideo', "Videoda ko'rish"));
      card.appendChild(a);
    }
  }

  window.ChessMuseumView = { render, count: () => stops().length };
})();
