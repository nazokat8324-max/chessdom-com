// 📚 Kutubxona (#libraryView → #libraryRoot, /kutubxona, lib-*): 📝 qo'llanmalar (library-articles.js, sahifa ichida o'qiladi —
// /kutubxona?m=<id>), ♟ mashhur partiyalar (library-data.js → qayta ko'rish oynasi, tahlil va hikoya bilan), 📚 klassik kitoblar
// (jamoat mulki, Project Gutenberg'da o'qiladi). Server ishtirok etmaydi.
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LANGS = ['uz', 'en', 'ru', 'es', 'de', 'fr'];
  const L = (arr) => { const l = String((window.i18next && window.i18next.language) || 'en').slice(0, 2); const i = LANGS.indexOf(l); return (arr && arr[i < 0 ? 1 : i]) || (arr && arr[1]) || ''; };
  const st = { article: null };
  const root = () => document.getElementById('libraryRoot');
  const ARTICLES = () => window.LibraryArticles || [];
  const DATA = () => window.LibraryData || { GAMES: [], BOOKS: [] };

  function renderShelves() {
    const el = root();
    if (!el) return;
    const D = DATA();
    el.innerHTML = `<section class="lib-hero">
        <span class="tea-kicker">📚 ${esc(tx('libKicker', 'ChessCaravan kutubxonasi'))}</span>
        <h1>${esc(tx('libTitle', 'Kutubxona'))}</h1>
        <p>${esc(tx('libLead', "Qo'llanmalar, tarixga kirgan partiyalar va jamoat mulkiga aylangan klassik kitoblar — bepul va bir joyda."))}</p>
        <nav class="lib-jump">
          <a href="#lib-guides">📝 ${esc(tx('libGuides', "Qo'llanmalar"))}</a>
          <a href="#lib-games">♟ ${esc(tx('libGames', 'Mashhur partiyalar'))}</a>
          <a href="#lib-books">📚 ${esc(tx('libBooks', 'Klassik kitoblar'))}</a>
        </nav>
      </section>
      <section class="lib-shelf" id="lib-guides">
        <h2>📝 ${esc(tx('libGuides', "Qo'llanmalar"))}</h2>
        <div class="lib-grid">${ARTICLES().map((a) => `<button type="button" class="lib-card" data-article="${esc(a.id)}">
          <span class="lib-ico">${a.icon}</span><b>${esc(L(a.title))}</b><small>${esc(L(a.lead))}</small>
          <span class="lib-go">${esc(tx('libRead', "O'qish"))} →</span></button>`).join('')}</div>
      </section>
      <section class="lib-shelf" id="lib-games">
        <h2>♟ ${esc(tx('libGames', 'Mashhur partiyalar'))}</h2>
        <p class="lib-note">${esc(tx('libGamesNote', "Partiyani oching: yurishma-yurish ko'ring, Stockfish bilan tahlil qiling va «📖 O'yin hikoyasi»ni o'qing."))}</p>
        <div class="lib-grid">${D.GAMES.map((g) => `<article class="lib-card lib-game">
          <span class="lib-year">${esc(g.year)} · ${esc(g.place)}</span>
          <b>${esc(L(g.title))}</b>
          <span class="lib-players">${typeof window.kingIcon === 'function' ? window.kingIcon('w') : ''} ${esc(g.white)} <i>${esc(g.result.replace('-', '–'))}</i> ${typeof window.kingIcon === 'function' ? window.kingIcon('b') : ''} ${esc(g.black)}</span>
          <small>${esc(L(g.story))}</small>
          <button type="button" class="lib-btn" data-game="${esc(g.id)}">▶ ${esc(tx('libWatch', "Partiyani ko'rish"))}</button>
        </article>`).join('')}</div>
      </section>
      <section class="lib-shelf" id="lib-books">
        <h2>📚 ${esc(tx('libBooks', 'Klassik kitoblar'))}</h2>
        <p class="lib-note">${esc(tx('libBooksNote', "Bu kitoblar mualliflik muddati tugagani uchun jamoat mulki. Ular ingliz tilida, bepul Project Gutenberg kutubxonasida o'qiladi."))}</p>
        <div class="lib-grid">${D.BOOKS.map((b) => `<article class="lib-card lib-book">
          <span class="lib-ico">📕</span>
          <b>${esc(b.title)}</b>
          <span class="lib-players">${esc(b.author)} <i>${esc(b.life)}</i></span>
          <small>${esc(L(b.desc))}</small>
          <a class="lib-btn ghost" href="https://www.gutenberg.org/ebooks/${Number(b.gutenberg)}" target="_blank" rel="noopener">📖 ${esc(tx('libOpenBook', "O'qish (inglizcha)"))} ↗</a>
        </article>`).join('')}</div>
      </section>`;
    el.querySelectorAll('[data-article]').forEach((b) => b.onclick = () => openArticle(b.dataset.article));
    el.querySelectorAll('[data-game]').forEach((b) => b.onclick = () => window.openLibraryGame(b.dataset.game));
    el.querySelectorAll('.lib-jump a').forEach((a) => a.onclick = (e) => {
      e.preventDefault();
      const t = document.querySelector(a.getAttribute('href'));
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function renderArticle(a) {
    const el = root();
    if (!el) return;
    const idx = ARTICLES().indexOf(a), next = ARTICLES()[idx + 1];
    el.innerHTML = `<article class="lib-article">
      <button type="button" class="ps-back" data-lib-back>← ${esc(tx('libTitle', 'Kutubxona'))}</button>
      <div class="lib-article-head"><span class="lib-ico big">${a.icon}</span><h1>${esc(L(a.title))}</h1></div>
      <p class="lib-lead">${esc(L(a.lead))}</p>
      <ul class="lib-points">${a.points.map((p) => `<li>${esc(L(p))}</li>`).join('')}</ul>
      ${next ? `<button type="button" class="lib-next" data-article="${esc(next.id)}">${esc(tx('libNext', 'Keyingi qo\'llanma'))}: ${next.icon} ${esc(L(next.title))} →</button>` : ''}
    </article>`;
    el.querySelector('[data-lib-back]').onclick = () => window.openLibrary(null);
    const nx = el.querySelector('[data-article]');
    if (nx) nx.onclick = () => openArticle(nx.dataset.article);
    document.title = L(a.title) + ' · ' + tx('libTitle', 'Kutubxona') + ' · ChessCaravan';
  }

  function openArticle(id) {
    const a = ARTICLES().find((x) => x.id === id);
    if (!a) return;
    st.article = id;
    renderArticle(a);
    const url = '/kutubxona?m=' + encodeURIComponent(id);
    if (location.pathname + location.search !== url) history.pushState({ view: 'library', m: id }, '', url);
    const v = document.getElementById('libraryView');
    if (v) v.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  window.openLibraryGame = function (id) {
    const D = DATA();
    const g = D.GAMES.find((x) => x.id === id);
    if (!g || typeof window.showReplayGame !== 'function') return;
    window.showReplayGame({
      id: null, player: g.white, opponent: g.black, color: 'w',
      result: g.result === '1-0' ? 'win' : g.result === '0-1' ? 'loss' : 'draw',
      reason: 'checkmate', clock: g.place + ', ' + g.year, date: null, moves: D.sansOf(g.pgn), variant: 'standard', imported: true
    });
  };

  // switchView('library') chaqiradi
  window.updateLibraryView = function () {
    const q = location.pathname === '/kutubxona' ? new URLSearchParams(location.search).get('m') : null;
    const id = st.pending !== undefined ? st.pending : q;
    st.pending = undefined;
    const a = id && ARTICLES().find((x) => x.id === id);
    st.article = a ? a.id : null;
    if (a) renderArticle(a); else renderShelves();
    const url = '/kutubxona' + (a ? '?m=' + encodeURIComponent(a.id) : '');
    setTimeout(() => { if (location.pathname === '/kutubxona' && location.pathname + location.search !== url) history.replaceState({ view: 'library' }, '', url); }, 0);
  };
  window.openLibrary = function (articleId) {
    st.pending = articleId || null;
    window.switchView('library');
  };
  window.refreshLibraryView = function () { const v = document.getElementById('libraryView'); if (v && v.classList.contains('active-view')) window.updateLibraryView(); };
  // Orqaga/oldinga: maqola ↔ javonlar
  window.addEventListener('popstate', () => {
    const v = document.getElementById('libraryView');
    if (v && v.classList.contains('active-view') && location.pathname === '/kutubxona') { st.pending = new URLSearchParams(location.search).get('m'); window.updateLibraryView(); }
  });
})();
