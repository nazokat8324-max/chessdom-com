// 📚 Kutubxona (#libraryView → #libraryRoot, /kutubxona, lib-*): 📝 qo'llanmalar (library-articles.js, sahifa ichida o'qiladi —
// /kutubxona?m=<id>), ♟ mashhur partiyalar (library-data.js → qayta ko'rish oynasi, tahlil va hikoya bilan), 📚 klassik kitoblar
// (jamoat mulki, Project Gutenberg'da o'qiladi). Server ishtirok etmaydi.
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LANGS = ['uz', 'en', 'ru', 'es', 'de', 'fr', 'tr'];
  const uiLang = () => (window.uiLang ? window.uiLang() : String((window.i18next && window.i18next.language) || 'en').slice(0, 2));
  const L = (arr) => {
    const l = uiLang();
    // Ўзбекча (кирилл) — o'zbekcha matndan
    if (l === 'uzc') return window.UzCyrl ? window.UzCyrl.toCyrl((arr && arr[0]) || '') : (arr && arr[0]) || '';
    const i = LANGS.indexOf(l);
    return (arr && arr[i < 0 ? 1 : i]) || (arr && arr[1]) || '';
  };
  const st = { article: null, items: null, itemsAt: 0 };
  const root = () => document.getElementById('libraryRoot');
  const curLang = () => (uiLang() === 'uzc' ? 'uz' : uiLang());
  const six = (s) => Array(6).fill(s || '');
  // Admin panelidan qo'shilgan materiallar (GET /api/library): til tanlangan bo'lsa — faqat o'sha tilda ko'rinadi
  const custom = (kind) => (st.items || []).filter((x) => x.kind === kind && (!x.lang || x.lang === curLang()))
    .map((x) => (uiLang() === 'uzc' && x.lang === 'uz' && window.UzCyrl
      ? Object.assign({}, x, { title: window.UzCyrl.toCyrl(x.title), lead: window.UzCyrl.toCyrl(x.lead || ''), body: window.UzCyrl.toCyrl(x.body || ''), story: window.UzCyrl.toCyrl(x.story || ''), desc: window.UzCyrl.toCyrl(x.desc || '') }) : x));
  const customArticles = () => custom('article').map((x) => ({ id: 'c:' + x.id, icon: x.icon || '📝', title: six(x.title), lead: six(x.lead || ''),
    points: String(x.body || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map(six), custom: true }));
  const customGames = () => custom('game').map((x) => ({ id: 'c:' + x.id, white: x.white, black: x.black, place: x.place || '', year: x.year || '', result: x.result, reason: x.reason,
    moves: x.moves || [], title: six(x.title), story: six(x.story || ''), custom: true }));
  const customBooks = () => custom('book').map((x) => ({ id: 'c:' + x.id, title: x.title, author: x.author || '', life: '', url: x.url, desc: six(x.desc || ''), custom: true }));
  const ARTICLES = () => (window.LibraryArticles || []).concat(customArticles());
  const DATA = () => {
    const d = window.LibraryData || { GAMES: [], BOOKS: [], sansOf: () => [] };
    return { GAMES: d.GAMES.concat(customGames()), BOOKS: d.BOOKS.concat(customBooks()), sansOf: d.sansOf };
  };
  async function loadItems(force) {
    if (!force && st.items && Date.now() - st.itemsAt < 60000) return false;
    try {
      const d = await fetch('/api/library').then((r) => r.json());
      if (d && d.success) { st.items = d.items || []; st.itemsAt = Date.now(); return true; }
    } catch (e) {}
    return false;
  }
  window.reloadLibraryItems = () => { st.itemsAt = 0; };
  // Misol pozitsiyasi: kichik taxta, belgilangan kataklar bilan
  function boardHtml(fen, marks) {
    const rows = String(fen || '').split(' ')[0].split('/');
    const mk = new Set(marks || []);
    let html = '';
    rows.forEach((row, r) => {
      let f = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) { for (let k = 0; k < Number(ch); k++, f++) html += cell(r, f, null, mk); }
        else { html += cell(r, f, ch, mk); f++; }
      }
    });
    return `<div class="lib-board">${html}</div>`;
  }
  function cell(r, f, piece, mk) {
    const sq = 'abcdefgh'[f] + (8 - r);
    const code = piece ? (piece === piece.toUpperCase() ? 'w' : 'b') + piece.toUpperCase() : null;
    const src = code && window.pieceUrl ? window.pieceUrl(code) : null;
    return `<i class="${(r + f) % 2 ? 'd' : 'l'}${mk.has(sq) ? ' mk' : ''}">${src ? `<img src="${esc(src)}" alt="">` : ''}</i>`;
  }

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
          <a class="lib-btn ghost" href="${esc(b.url || 'https://www.gutenberg.org/ebooks/' + Number(b.gutenberg))}" target="_blank" rel="noopener noreferrer">📖 ${esc(b.url ? tx('libOpenLink', 'Ochish') : tx('libOpenBook', "O'qish (inglizcha)"))} ↗</a>
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
      ${a.example ? `<figure class="lib-example">${boardHtml(a.example.fen, a.example.marks)}<figcaption>💡 ${esc(L(a.example.caption))}</figcaption></figure>` : ''}
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
      reason: g.reason || 'checkmate', clock: [g.place, g.year].filter(Boolean).join(', '), date: null, moves: g.moves || D.sansOf(g.pgn), variant: 'standard', imported: true
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
    // Admin materiallari yuklangach — qayta chizish (yoki havoladagi admin maqolasini ochish)
    loadItems().then((changed) => {
      const v = document.getElementById('libraryView');
      if (!changed || !v || !v.classList.contains('active-view')) return;
      const again = id && ARTICLES().find((x) => x.id === id);
      if (again) { st.article = again.id; renderArticle(again); } else if (!st.article) renderShelves();
    });
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
