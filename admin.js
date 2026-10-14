// Admin paneli (faqat users.role = 'admin'): statistika, shikoyatlar, o'yinchilarni bloklash, turnirlar.
// Server: /api/admin/* (adminMiddleware). Admin Render env ADMIN_USERNAMES orqali beriladi.
(function () {
  const st = { tab: 'stats', reportStatus: 'open', query: '', stats: null, reports: [], users: [], tournaments: [] };
  const esc = (v) => {
    const div = document.createElement('div');
    div.textContent = (v === null || v === undefined) ? '' : String(v);
    return div.innerHTML.replace(/"/g, '&quot;');
  };
  const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + window.authToken });
  const api = (url, body) => fetch(url, body ? { method: 'POST', headers: headers(), body: JSON.stringify(body) } : { headers: headers() }).then(r => r.json()).catch(() => null);
  const root = () => document.getElementById('adminRoot');
  const fmt = (iso) => { if (!iso) return '—'; if (iso === 'forever') return tx('admForever', 'Doimiy'); const d = new Date(String(iso).replace(' ', 'T')); return isNaN(d) ? iso : d.toLocaleString(); };
  const reasons = { abuse: tx('rpAbuse', "Haqorat yoki yomon so'z"), cheating: tx('rpCheating', "Aldash (dastur yordamida o'ynash)"), spam: tx('rpSpam', 'Spam / reklama'), name: tx('rpName', 'Nomaqbul nom yoki rasm'), other: tx('rpOther', 'Boshqa') };

  // Yon menyudagi "Admin" bo'limi faqat adminlarga
  window.updateAdminNav = function () {
    const nav = document.getElementById('navAdmin');
    if (nav) nav.style.display = window.currentUser && window.currentUser.role === 'admin' ? '' : 'none';
  };

  async function load() {
    if (st.tab === 'stats') { const d = await api('/api/admin/stats'); st.stats = d && d.success ? d.stats : null; }
    if (st.tab === 'reports') { const d = await api('/api/admin/reports?status=' + st.reportStatus); st.reports = d && d.success ? d.reports : []; }
    if (st.tab === 'users') { const d = await api('/api/admin/users?q=' + encodeURIComponent(st.query)); st.users = d && d.success ? d.users : []; }
    if (st.tab === 'tournaments') { const d = await api('/api/admin/tournaments'); st.tournaments = d && d.success ? d.tournaments : []; }
    render();
  }

  function statsHtml() {
    const s = st.stats;
    if (!s) return `<div class="adm-empty">${esc(tx('loadingText', 'Yuklanmoqda...'))}</div>`;
    const cards = [['👥', s.users, tx('admUsers', "O'yinchilar")], ['🟢', s.online, tx('admOnline', 'Hozir onlayn')], ['♟️', s.activeGames, tx('admActiveGames', "Davom etayotgan o'yinlar")],
      ['🆕', s.newUsers24h, tx('admNewUsers', "Yangi (24 soat)")], ['🎮', s.games24h, tx('admGames24', "O'yinlar (24 soat)")], ['⚠️', s.openReports, tx('admOpenReports', 'Ochiq shikoyatlar')], ['🚫', s.banned, tx('admBanned', 'Bloklanganlar')]];
    return `<div class="adm-stats">${cards.map(([i, n, l]) => `<div class="adm-stat"><span>${i}</span><b>${n}</b><small>${esc(l)}</small></div>`).join('')}</div>`;
  }

  function banControls(userId) {
    return `<span class="adm-ban">
      <select data-ban-days="${esc(userId)}"><option value="1">1 ${esc(tx('admDay', 'kun'))}</option><option value="7">7 ${esc(tx('admDay', 'kun'))}</option><option value="30">30 ${esc(tx('admDay', 'kun'))}</option><option value="0">${esc(tx('admForever', 'Doimiy'))}</option></select>
      <button class="set-mini danger" data-ban="${esc(userId)}">🚫 ${esc(tx('admBan', 'Bloklash'))}</button>
    </span>`;
  }

  function reportsHtml() {
    const tabs = `<div class="set-seg">${[['open', tx('admOpen', 'Ochiq')], ['resolved', tx('admResolved', "Ko'rib chiqilgan")]].map(([id, l]) => `<button class="${st.reportStatus === id ? 'active' : ''}" data-rstatus="${id}">${esc(l)}</button>`).join('')}</div>`;
    if (!st.reports.length) return tabs + `<div class="adm-empty">${esc(tx('admNoReports', "Shikoyatlar yo'q"))}</div>`;
    return tabs + `<div class="adm-list">${st.reports.map(r => `
      <div class="adm-item">
        <div class="adm-item-main">
          <b><span class="player-link" data-username="${esc(r.target)}">${esc(r.target)}</span> <small>(${Number(r.targetReports) || 0} ${esc(tx('admReportsCount', 'ta shikoyat'))})</small></b>
          <span class="adm-reason">${esc(reasons[r.reason] || r.reason)}</span>
          ${r.details ? `<p>${esc(r.details)}</p>` : ''}
          <small>${esc(tx('admFrom', 'Kimdan'))}: <span class="player-link" data-username="${esc(r.reporter)}">${esc(r.reporter)}</span> · ${esc(fmt(r.createdAt))}${r.targetBannedUntil ? ' · 🚫 ' + esc(fmt(r.targetBannedUntil)) : ''}</small>
        </div>
        ${st.reportStatus === 'open' ? `<div class="adm-actions">${banControls(r.targetId)}<button class="set-mini" data-resolve="${esc(r.id)}">✓ ${esc(tx('admResolve', "Ko'rib chiqildi"))}</button></div>` : `<small>${esc(r.resolution || '')} ${esc(fmt(r.resolvedAt))}</small>`}
      </div>`).join('')}</div>`;
  }

  function usersHtml() {
    return `<form class="adm-search" id="admSearch"><input class="set-input" id="admQuery" placeholder="${esc(tx('lbSearch', "O'yinchini qidirish"))}" value="${esc(st.query)}"><button class="set-mini accent" type="submit">🔍</button></form>
      <div class="adm-list">${st.users.map(u => {
        const s = u.stats || {};
        const banned = u.bannedUntil && (u.bannedUntil === 'forever' || new Date(u.bannedUntil) > new Date());
        return `<div class="adm-item">
          <div class="adm-item-main">
            <b><i class="pres-dot${u.online ? ' on' : ''}"></i> <span class="player-link" data-username="${esc(u.username)}">${esc(u.username)}</span>${u.role === 'admin' ? ' <em class="adm-tag">admin</em>' : ''}${banned ? ' <em class="adm-tag red">🚫 ' + esc(fmt(u.bannedUntil)) + '</em>' : ''}</b>
            <small>${esc(u.email && !/@justchess\.local$/i.test(u.email) ? u.email : '—')} · ${esc(tx('lbColRating', 'Reyting'))} ${u.rating} · ${(s.wins || 0) + (s.losses || 0) + (s.draws || 0)} ${esc(tx('admGamesShort', "o'yin"))} · ⚠️ ${u.reports}</small>
            <small>${esc(tx('admJoined', "Ro'yxatdan o'tgan"))}: ${esc(fmt(u.createdAt))} · ${esc(tx('admLastActive', 'Oxirgi faollik'))}: ${esc(fmt(u.lastActive))}</small>
            ${banned && u.banReason ? `<p>${esc(u.banReason)}</p>` : ''}
          </div>
          ${u.role === 'admin' ? '' : `<div class="adm-actions">${banned ? `<button class="set-mini accent" data-unban="${esc(u.id)}">✓ ${esc(tx('admUnban', 'Blokdan chiqarish'))}</button>` : banControls(u.id)}</div>`}
        </div>`;
      }).join('') || `<div class="adm-empty">${esc(tx('lbNoMatch', 'Hech kim topilmadi'))}</div>`}</div>`;
  }

  function tournamentsHtml() {
    const live = st.tournaments.filter(t => t.status === 'registration' || t.status === 'active');
    if (!live.length) return `<div class="adm-empty">${esc(tx('admNoTournaments', "Faol turnirlar yo'q"))}</div>`;
    return `<div class="adm-list">${live.map(t => `
      <div class="adm-item">
        <div class="adm-item-main"><b>${esc(t.name)}</b><small>${esc(t.status === 'active' ? tx('swRoundOf', '{{round}}-tur / {{rounds}}', { round: t.round, rounds: t.rounds }) : tx('swRegOpen', "Ro'yxatga olish ochiq"))} · ${t.players} ${esc(tx('arCountPlayers', 'ishtirokchi'))} · ${esc(fmt(t.startsAt))}</small></div>
        <div class="adm-actions"><button class="set-mini danger" data-cancel-t="${esc(t.id)}">✕ ${esc(tx('admCancelT', 'Bekor qilish'))}</button></div>
      </div>`).join('')}</div>`;
  }

  function render() {
    const el = root();
    if (!el) return;
    if (!window.currentUser || window.currentUser.role !== 'admin') { el.innerHTML = `<div class="adm-empty">${esc(tx('admNoAccess', "Bu bo'lim faqat adminlar uchun"))}</div>`; return; }
    const tabs = [['stats', '📊', tx('admTabStats', 'Statistika')], ['reports', '⚠️', tx('admTabReports', 'Shikoyatlar')], ['users', '👥', tx('admTabUsers', "O'yinchilar")], ['tournaments', '🏁', tx('admTabTournaments', 'Turnirlar')]];
    const body = { stats: statsHtml, reports: reportsHtml, users: usersHtml, tournaments: tournamentsHtml }[st.tab]();
    el.innerHTML = `
      <header class="set-head"><div><h1>🛡️ ${esc(tx('admTitle', 'Admin paneli'))}</h1><p>${esc(tx('admSub', "Shikoyatlar, o'yinchilar va turnirlarni boshqarish"))}</p></div></header>
      <div class="lb-seg adm-tabs">${tabs.map(([id, i, l]) => `<button class="${st.tab === id ? 'active' : ''}" data-atab="${id}">${i} ${esc(l)}</button>`).join('')}</div>
      <div class="adm-body">${body}</div>`;
    bind(el);
  }

  function bind(el) {
    el.querySelectorAll('[data-atab]').forEach(b => b.addEventListener('click', () => { st.tab = b.dataset.atab; render(); load(); }));
    el.querySelectorAll('[data-rstatus]').forEach(b => b.addEventListener('click', () => { st.reportStatus = b.dataset.rstatus; load(); }));
    const search = el.querySelector('#admSearch');
    if (search) search.addEventListener('submit', (e) => { e.preventDefault(); st.query = el.querySelector('#admQuery').value.trim(); load(); });
    el.querySelectorAll('[data-resolve]').forEach(b => b.addEventListener('click', async () => {
      const note = prompt(tx('admResolveNote', "Izoh (ixtiyoriy):"), '');
      if (note === null) return;
      await api('/api/admin/reports/' + b.dataset.resolve + '/resolve', { resolution: note });
      load();
    }));
    el.querySelectorAll('[data-ban]').forEach(b => b.addEventListener('click', async () => {
      const days = Number(el.querySelector(`[data-ban-days="${b.dataset.ban}"]`).value);
      const reason = prompt(tx('admBanReason', "Bloklash sababi (o'yinchiga ko'rsatiladi):"), '');
      if (reason === null) return;
      const d = await api('/api/admin/users/' + b.dataset.ban + '/ban', { days, reason });
      showToast(d && d.success ? tx('admBanDone', 'Hisob bloklandi') : (tServer(d && d.message) || tx('errGeneric', 'Xatolik yuz berdi!')), d && d.success ? 'success' : 'warning');
      load();
    }));
    el.querySelectorAll('[data-unban]').forEach(b => b.addEventListener('click', async () => { await api('/api/admin/users/' + b.dataset.unban + '/unban', {}); load(); }));
    el.querySelectorAll('[data-cancel-t]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm(tx('admCancelConfirm', 'Turnirni bekor qilasizmi?'))) return;
      const d = await api('/api/admin/tournaments/' + b.dataset.cancelT + '/cancel', {});
      showToast(d && d.success ? tx('admCancelled', 'Turnir bekor qilindi') : (tServer(d && d.message) || tx('errGeneric', 'Xatolik yuz berdi!')), d && d.success ? 'success' : 'warning');
      load();
    }));
  }

  window.renderAdminView = function () { render(); load(); };
  window.refreshAdminView = function () { const v = document.getElementById('adminView'); if (v && v.classList.contains('active-view')) render(); };
  document.addEventListener('DOMContentLoaded', () => window.updateAdminNav());
})();
