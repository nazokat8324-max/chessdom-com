// Davlat klubi: rahbariyat (👑 kapitan, 🛡️ moderatorlar) va 📰 klub yangiliklari — klub sahifasida (#clubStaffNews).
// Kapitan bo'lmasa server klubga eng birinchi qo'shilgan a'zoni kapitan qiladi. Kapitan moderator tayinlaydi/olib tashlaydi
// va kapitanlikni topshiradi; kapitan va moderatorlar yangilik e'lon qiladi, 📌 mahkamlaydi, klub chatidagi xabarni o'chiradi.
// Server: GET /api/country-clubs/:name/staff, POST /:name/roles, POST /:name/news, DELETE /news/:id, POST /news/:id/pin.
(function () {
  const st = { club: null, data: null };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const headers = (json) => ({ ...(json ? { 'Content-Type': 'application/json' } : {}), ...(window.authToken ? { 'Authorization': `Bearer ${window.authToken}` } : {}) });
  const root = () => document.getElementById('clubStaffNews');
  const fail = (d) => showToast(tServer(d && d.message) || tx('errGeneric', 'Xatolik yuz berdi!'), 'warning');

  // Klub chati uchun: joriy foydalanuvchi xabarlarni o'chira oladimi
  window.clubCanModerate = false;

  async function load(club) {
    const d = await fetch('/api/country-clubs/' + encodeURIComponent(club) + '/staff', { headers: headers() }).then(r => r.json()).catch(() => null);
    if (!d || !d.success) return null;
    if (club === window.currentClubName) window.clubCanModerate = !!d.canModerate;
    return d;
  }
  window.loadClubStaff = load;

  const roleBadge = (role) => role === 'captain'
    ? `<span class="cs-role captain">👑 ${esc(tx('csCaptain', 'Kapitan'))}</span>`
    : `<span class="cs-role mod">🛡️ ${esc(tx('csModerator', 'Moderator'))}</span>`;

  function render() {
    const el = root();
    const d = st.data;
    if (!el || !d) return;
    const staffRow = (name, role) => `
      <div class="cs-person">
        <b class="player-link" data-username="${esc(name)}">${esc(name)}</b>${roleBadge(role)}
        ${d.canManage && role === 'moderator' ? `<button type="button" class="cs-x" data-unmod="${esc(name)}" title="${esc(tx('csRemove', 'Olib tashlash'))}">✕</button>` : ''}
      </div>`;
    const manage = d.canManage ? `
      <form class="cs-manage" id="csManageForm" autocomplete="off">
        <input class="form-input" id="csUser" maxlength="30" placeholder="${esc(tx('csUsernamePh', "A'zoning nomi"))}">
        <select class="form-input" id="csRole">
          <option value="moderator">🛡️ ${esc(tx('csModerator', 'Moderator'))}</option>
          <option value="captain">👑 ${esc(tx('csMakeCaptain', 'Kapitanlikni topshirish'))}</option>
        </select>
        <button type="submit" class="control-btn">${esc(tx('csAssign', 'Tayinlash'))}</button>
      </form>` : '';
    const compose = d.canModerate ? `
      <form class="cs-compose" id="csNewsForm" autocomplete="off">
        <input class="form-input" id="csNewsTitle" maxlength="120" placeholder="${esc(tx('csNewsTitlePh', 'Sarlavha'))}">
        <textarea class="form-input" id="csNewsBody" maxlength="3000" rows="3" placeholder="${esc(tx('csNewsBodyPh', "Klub a'zolariga xabar..."))}"></textarea>
        <div class="cs-compose-row">
          <label class="cs-pin-check"><input type="checkbox" id="csNewsPin"> 📌 ${esc(tx('csPin', 'Mahkamlash'))}</label>
          <button type="submit" class="start-game-btn cs-publish">${esc(tx('csPublish', "E'lon qilish"))}</button>
        </div>
      </form>` : '';
    const news = d.news.length ? d.news.map(n => `
      <article class="cs-news${n.pinned ? ' pinned' : ''}">
        <div class="cs-news-head">
          <h5>${n.pinned ? '📌 ' : ''}${esc(n.title)}</h5>
          ${d.canModerate ? `<span class="cs-news-tools"><button type="button" data-pin="${esc(n.id)}" title="${esc(tx('csPin', 'Mahkamlash'))}">📌</button><button type="button" data-del="${esc(n.id)}" title="${esc(tx('csDelete', "O'chirish"))}">🗑</button></span>` : ''}
        </div>
        <p>${esc(n.body)}</p>
        <small>${n.author ? `<b class="player-link" data-username="${esc(n.author)}">${esc(n.author)}</b> · ` : ''}${esc(new Date(n.createdAt).toLocaleString())}</small>
      </article>`).join('') : `<div class="cs-empty">${esc(tx('csNoNews', "Hali yangilik yo'q"))}</div>`;
    el.innerHTML = `
      <section class="cs-card">
        <h4>👥 ${esc(tx('csStaff', 'Klub rahbariyati'))}</h4>
        <p class="cs-hint">${esc(tx('csStaffHint', "Kapitan va moderatorlar yangilik e'lon qiladi va klub chatini tartibga soladi."))}</p>
        <div class="cs-people">
          ${d.captain ? staffRow(d.captain.username, 'captain') : `<div class="cs-empty">${esc(tx('csNoCaptain', "Klubda hali a'zolar yo'q"))}</div>`}
          ${d.moderators.map(m => staffRow(m.username, 'moderator')).join('')}
        </div>
        ${manage}
      </section>
      <section class="cs-card">
        <h4>📰 ${esc(tx('csNews', 'Klub yangiliklari'))}</h4>
        ${compose}
        <div class="cs-news-list">${news}</div>
      </section>`;
    bind(el);
  }

  async function post(url, body, method) {
    return fetch(url, { method: method || 'POST', headers: headers(true), body: body ? JSON.stringify(body) : undefined }).then(r => r.json()).catch(() => null);
  }

  function bind(el) {
    const club = st.club;
    const manage = el.querySelector('#csManageForm');
    if (manage) manage.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = el.querySelector('#csUser').value.trim();
      const role = el.querySelector('#csRole').value;
      if (!username) return;
      if (role === 'captain' && !confirm(tx('csTransferConfirm', 'Kapitanlikni {{name}} ga topshirasizmi? Siz moderator bo\'lib qolasiz.', { name: username }))) return;
      const d = await post('/api/country-clubs/' + encodeURIComponent(club) + '/roles', { username, role });
      if (!d || !d.success) return fail(d);
      showToast(tx('csSaved', 'Saqlandi'), 'success');
      window.renderClubStaffNews(club);
    });
    el.querySelectorAll('[data-unmod]').forEach(b => b.addEventListener('click', async () => {
      const d = await post('/api/country-clubs/' + encodeURIComponent(club) + '/roles', { username: b.dataset.unmod, role: 'member' });
      if (!d || !d.success) return fail(d);
      window.renderClubStaffNews(club);
    }));
    const form = el.querySelector('#csNewsForm');
    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = el.querySelector('#csNewsTitle').value.trim();
      const body = el.querySelector('#csNewsBody').value.trim();
      if (!title || !body) { showToast(tServer('Sarlavha va matn kerak!'), 'warning'); return; }
      const d = await post('/api/country-clubs/' + encodeURIComponent(club) + '/news', { title, body, pinned: el.querySelector('#csNewsPin').checked });
      if (!d || !d.success) return fail(d);
      st.data.news = d.news;
      render();
      showToast(tx('csPublished', "Yangilik e'lon qilindi"), 'success');
    });
    el.querySelectorAll('[data-pin]').forEach(b => b.addEventListener('click', async () => {
      const d = await post('/api/country-clubs/news/' + encodeURIComponent(b.dataset.pin) + '/pin');
      if (!d || !d.success) return fail(d);
      st.data.news = d.news;
      render();
    }));
    el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm(tx('csDeleteConfirm', "Yangilikni o'chirasizmi?"))) return;
      const d = await post('/api/country-clubs/news/' + encodeURIComponent(b.dataset.del), null, 'DELETE');
      if (!d || !d.success) return fail(d);
      st.data.news = d.news;
      render();
    }));
  }

  window.renderClubStaffNews = async function (club) {
    st.club = club;
    const d = await load(club);
    if (!d || st.club !== club) return;
    st.data = d;
    render();
  };

  // Klub chatidagi xabarni o'chirish (kapitan / moderator)
  window.deleteClubChatMessage = async function (id) {
    if (!confirm(tx('csDeleteMsgConfirm', "Xabarni o'chirasizmi?"))) return;
    const d = await post('/api/chat/messages/' + encodeURIComponent(id), null, 'DELETE');
    if (!d || !d.success) return fail(d);
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof socket === 'undefined') return;
    socket.on('chat-message-deleted', (data) => {
      if (window.currentClubName && data && data.roomId === 'club_' + window.currentClubName && typeof window.loadClubChatMessages === 'function') window.loadClubChatMessages();
    });
  });
})();
