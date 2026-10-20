// 📰 Sayt yangiliklari (/yangiliklar): adminlar maqola yozadi va o'chiradi, hamma o'qiydi.
// Server: GET /api/news, POST /api/news {title, body} (admin), DELETE /api/news/:id (admin).
(function () {
  const st = { news: null };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const isAdmin = () => !!(window.currentUser && window.currentUser.role === 'admin');
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + window.authToken });

  async function load() {
    const d = await fetch('/api/news').then(r => r.json()).catch(() => null);
    st.news = d && d.success ? d.news : [];
    render();
  }

  function render() {
    const el = document.getElementById('newsRoot');
    if (!el) return;
    const compose = isAdmin() ? `
      <form class="nw-compose" id="nwForm" autocomplete="off">
        <input class="set-input" id="nwTitle" maxlength="150" placeholder="${esc(tx('nwTitlePh', 'Sarlavha'))}">
        <textarea class="set-input" id="nwBody" rows="5" maxlength="8000" placeholder="${esc(tx('nwBodyPh', 'Maqola matni...'))}"></textarea>
        <button type="submit" class="set-mini accent">📰 ${esc(tx('nwPublish', "E'lon qilish"))}</button>
      </form>` : '';
    const list = st.news === null
      ? `<div class="adm-empty">${esc(tx('loadingText', 'Yuklanmoqda...'))}</div>`
      : (st.news.length ? st.news.map(n => `
        <article class="nw-post">
          <div class="nw-post-head">
            <h2>${esc(n.title)}</h2>
            ${isAdmin() ? `<button class="set-mini danger" data-del="${esc(n.id)}">🗑</button>` : ''}
          </div>
          <small>${esc(new Date(n.createdAt).toLocaleDateString(({ uz: 'uz-UZ', en: 'en-GB', ru: 'ru-RU', es: 'es-ES', de: 'de-DE', fr: 'fr-FR' })[window.currentLang] || undefined, { year: 'numeric', month: 'long', day: 'numeric' }))}${n.author ? ' · ' + esc(n.author) : ''}</small>
          <p>${esc(n.body)}</p>
        </article>`).join('') : `<div class="adm-empty">📰 ${esc(tx('nwEmpty', "Hozircha yangiliklar yo'q"))}</div>`);
    el.innerHTML = `
      <header class="set-head"><div><h1>📰 ${esc(tx('mNews', 'Yangiliklar'))}</h1><p>${esc(tx('nwSub', "ChessDom'dagi yangiliklar, e'lonlar va yangi imkoniyatlar"))}</p></div></header>
      ${compose}
      <div class="nw-list">${list}</div>`;
    const form = el.querySelector('#nwForm');
    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = el.querySelector('#nwTitle').value.trim(), body = el.querySelector('#nwBody').value.trim();
      if (!title || !body) { showToast(tServer('Sarlavha va matn kerak!'), 'warning'); return; }
      const d = await fetch('/api/news', { method: 'POST', headers: headers(), body: JSON.stringify({ title, body }) }).then(r => r.json()).catch(() => null);
      if (!d || !d.success) { showToast(tServer(d && d.message) || tx('errGeneric', 'Xatolik yuz berdi!'), 'warning'); return; }
      st.news = d.news;
      render();
      showToast(tx('csPublished', "Yangilik e'lon qilindi"), 'success');
    });
    el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm(tx('csDeleteConfirm', "Yangilikni o'chirasizmi?"))) return;
      const d = await fetch('/api/news/' + encodeURIComponent(b.dataset.del), { method: 'DELETE', headers: headers() }).then(r => r.json()).catch(() => null);
      if (d && d.success) { st.news = d.news; render(); }
    }));
  }

  window.renderNewsView = function () { render(); load(); };
  window.refreshNewsView = function () { const v = document.getElementById('newsView'); if (v && v.classList.contains('active-view')) render(); };
})();
