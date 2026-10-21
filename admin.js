// Admin paneli (faqat users.role = 'admin'): statistika (+ 💾 zaxira nusxa), shikoyatlar, o'yinchilarni bloklash, turnirlar, fair-play, chat, 🐞 xatolar, 📜 jurnal (admin amallari).
// Server: /api/admin/* (adminMiddleware). Admin Render env ADMIN_USERNAMES orqali beriladi.
(function () {
  const st = { tab: 'stats', reportStatus: 'open', query: '', stats: null, reports: [], users: [], tournaments: [], fairplay: [], chat: { messages: [], words: [], club: '', user: '' }, errors: { list: [], counts: { server: 0, client: 0 }, status: 'open', source: '' }, audit: { list: [], action: '', q: '', page: 0, more: false } };
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
    if (st.tab === 'fairplay') { const d = await api('/api/admin/fairplay'); st.fairplay = d && d.success ? d.users : []; }
    if (st.tab === 'errors') {
      const e = st.errors;
      const d = await api('/api/admin/errors?status=' + e.status + '&source=' + e.source);
      if (d && d.success) { e.list = d.errors; e.counts = d.counts; }
    }
    if (st.tab === 'audit') {
      const a = st.audit;
      const d = await api('/api/admin/audit?action=' + encodeURIComponent(a.action) + '&q=' + encodeURIComponent(a.q) + '&page=' + a.page);
      if (d && d.success) { a.list = d.actions; a.more = d.more; }
    }
    if (st.tab === 'chat') {
      const d = await api('/api/admin/chat?club=' + encodeURIComponent(st.chat.club) + '&user=' + encodeURIComponent(st.chat.user));
      if (d && d.success) { st.chat.messages = d.messages; st.chat.words = d.words; }
    }
    render();
  }

  function statsHtml() {
    const s = st.stats;
    if (!s) return `<div class="adm-empty">${esc(tx('loadingText', 'Yuklanmoqda...'))}</div>`;
    const cards = [['👥', s.users, tx('admUsers', "O'yinchilar")], ['🟢', s.online, tx('admOnline', 'Hozir onlayn')], ['♟️', s.activeGames, tx('admActiveGames', "Davom etayotgan o'yinlar")],
      ['🆕', s.newUsers24h, tx('admNewUsers', "Yangi (24 soat)")], ['🎮', s.games24h, tx('admGames24', "O'yinlar (24 soat)")], ['⚠️', s.openReports, tx('admOpenReports', 'Ochiq shikoyatlar')], ['🚫', s.banned, tx('admBanned', 'Bloklanganlar')]];
    const errs = s.errors || { server: 0, client: 0 };
    cards.push(['🐞', errs.server + errs.client, tx('admOpenErrors', 'Hal qilinmagan xatolar')]);
    return `<div class="adm-stats">${cards.map(([i, n, l]) => `<div class="adm-stat"><span>${i}</span><b>${n}</b><small>${esc(l)}</small></div>`).join('')}</div>
      <div class="adm-box adm-backup">
        <b>💾 ${esc(tx('admBackupTitle', 'Zaxira nusxa'))}</b>
        <p class="adm-note">${esc(tx('admBackupHint', "Butun bazaning nusxasi (siqilgan JSON). Faylda parol xeshlari va emaillar bor — ishonchli joyda saqlang. Avtomatik kunlik nusxa GitHub Actions orqali shifrlangan holda olinadi."))}</p>
        <button class="set-mini accent" id="admBackupBtn">⬇ ${esc(tx('admBackupDownload', 'Nusxani yuklab olish'))}</button>
      </div>`;
  }

  // 🐞 Xatolar: server (console.error, ushlanmagan xatolar) va brauzer (errors.js) — bir xil xato bitta qatorda, ×N
  function errorsHtml() {
    const e = st.errors;
    const seg = (items, cur, attr) => `<div class="set-seg">${items.map(([id, l]) => `<button class="${cur === id ? 'active' : ''}" ${attr}="${id}">${esc(l)}</button>`).join('')}</div>`;
    const bar = `<div class="adm-err-bar">
      ${seg([['open', tx('admErrOpen', 'Ochiq')], ['resolved', tx('admErrResolved', 'Hal qilingan')]], e.status, 'data-estatus')}
      ${seg([['', tx('admErrAll', 'Hammasi')], ['server', '🖥 ' + tx('admErrServer', 'Server') + ' ' + (e.counts.server || 0)], ['client', '🌐 ' + tx('admErrClient', 'Brauzer') + ' ' + (e.counts.client || 0)]], e.source, 'data-esource')}
      ${e.status === 'resolved' && e.list.length ? `<button class="set-mini danger" id="admErrClear">🗑 ${esc(tx('admErrClear', "Hammasini o'chirish"))}</button>` : ''}
    </div>`;
    if (!e.list.length) return bar + `<div class="adm-empty">${esc(e.status === 'open' ? tx('admErrNone', "Xatolar yo'q 🎉") : tx('admErrNoneResolved', "Hal qilingan xatolar yo'q"))}</div>`;
    return bar + `<div class="adm-list">${e.list.map(x => {
      const c = x.context || {};
      const meta = [c.method && c.path ? c.method + ' ' + c.path : '', c.url ? c.url : '', c.user ? '👤 ' + c.user : '', c.ua ? c.ua.replace(/^Mozilla\/5\.0 /, '').slice(0, 70) : ''].filter(Boolean);
      return `<div class="adm-item adm-err">
        <div class="adm-item-main">
          <b><em class="adm-tag${x.source === 'server' ? ' red' : ''}">${x.source === 'server' ? '🖥 ' + esc(tx('admErrServer', 'Server')) : '🌐 ' + esc(tx('admErrClient', 'Brauzer'))}</em> <span class="adm-err-count">×${x.count}</span> ${esc(x.message)}</b>
          <small>${esc(tx('admErrFirst', 'Birinchi'))}: ${esc(fmt(x.firstSeen))} · ${esc(tx('admErrLast', 'Oxirgi'))}: ${esc(fmt(x.lastSeen))}</small>
          ${meta.length ? `<small class="adm-err-meta">${meta.map(esc).join(' · ')}</small>` : ''}
          ${x.stack ? `<details><summary>Stack</summary><pre>${esc(x.stack)}</pre></details>` : ''}
        </div>
        <div class="adm-actions">${x.resolved
          ? `<button class="set-mini" data-err-reopen="${esc(x.id)}">↺ ${esc(tx('admErrReopen', 'Qayta ochish'))}</button>`
          : `<button class="set-mini accent" data-err-resolve="${esc(x.id)}">✓ ${esc(tx('admErrResolve', 'Hal qilindi'))}</button>`}</div>
      </div>`;
    }).join('')}</div>`;
  }

  // 📜 Jurnal: adminlarning barcha amallari (o'chirib bo'lmaydi)
  const AUDIT = {
    ban: ['🚫', () => tx('audBan', 'Blokladi')],
    unban: ['✓', () => tx('audUnban', 'Blokdan chiqardi')],
    mute: ['🔇', () => tx('audMute', 'Jim qildi')],
    unmute: ['🔈', () => tx('audUnmute', 'Chatga ruxsat berdi')],
    report_resolve: ['⚠️', () => tx('audReportResolve', "Shikoyatni ko'rib chiqdi")],
    fairplay_cheater: ['⛔', () => tx('audFairplayCheater', 'Qoidabuzar deb belgiladi')],
    fairplay_clear: ['🕵️', () => tx('audFairplayClear', 'Toza deb belgiladi')],
    filter_add: ['🚫', () => tx('audFilterAdd', "Taqiqlangan so'z qo'shdi")],
    filter_remove: ['↩️', () => tx('audFilterRemove', "Taqiqlangan so'zni olib tashladi")],
    club_role: ['👑', () => tx('audClubRole', "Klubdagi rolni o'zgartirdi")],
    club_news_delete: ['📰', () => tx('audClubNewsDelete', "Klub yangiligini o'chirdi")],
    club_news_pin: ['📌', () => tx('audClubNewsPin', 'Klub yangiligini mahkamladi')],
    chat_delete: ['💬', () => tx('audChatDelete', "Klub chatidagi xabarni o'chirdi")],
    tournament_cancel: ['🏁', () => tx('audTournamentCancel', 'Turnirni bekor qildi')],
    backup_download: ['💾', () => tx('audBackup', 'Zaxira nusxani yuklab oldi')],
    errors_clear: ['🐞', () => tx('audErrorsClear', "Hal qilingan xatolarni o'chirdi")]
  };
  function auditDetails(a) {
    const d = a.details || {};
    const role = { captain: tx('csCaptain', 'Kapitan'), moderator: tx('csModerator', 'Moderator'), member: tx('audRoleMember', "Oddiy a'zo") };
    switch (a.action) {
      case 'ban': return (d.days === 'forever' ? tx('admForever', 'Doimiy') : tx('audDays', '{{n}} kun', { n: d.days })) + (d.reason ? ' · ' + d.reason : '');
      case 'mute': return tx('audHours', '{{n}} soat', { n: d.hours });
      case 'report_resolve': return [reasons[d.reason] || d.reason, d.resolution].filter(Boolean).join(' · ');
      case 'fairplay_cheater': return tx('audRefund', "{{n}} o'yinchiga {{p}} reyting qaytarildi", { n: d.refunded, p: d.points });
      case 'club_role': return '🏳️ ' + d.club + ' · ' + (role[d.role] || d.role);
      case 'club_news_delete': case 'club_news_pin': return d.title || '';
      case 'chat_delete': return '🏳️ ' + d.club + ' · «' + d.message + '»';
      case 'backup_download': return tx('audRows', '{{n}} qator', { n: d.rows });
      default: return '';
    }
  }
  function auditHtml() {
    const a = st.audit;
    const filters = [['', tx('audAll', 'Barcha amallar')], ['ban', AUDIT.ban[1]()], ['unban', AUDIT.unban[1]()], ['mute', AUDIT.mute[1]()], ['unmute', AUDIT.unmute[1]()],
      ['report', AUDIT.report_resolve[1]()], ['fairplay', tx('admTabFairplay', 'Fair-play')], ['filter', tx('admBadWords', "Taqiqlangan so'zlar")], ['club', tx('audClubs', 'Klublar')],
      ['chat_delete', AUDIT.chat_delete[1]()], ['tournament', AUDIT.tournament_cancel[1]()], ['backup', AUDIT.backup_download[1]()], ['errors', AUDIT.errors_clear[1]()]];
    const bar = `<p class="adm-note">${esc(tx('audIntro', "Adminlarning barcha amallari shu yerda yoziladi: kim, qachon, kimga nima qildi. Yozuvlarni o'chirib bo'lmaydi."))}</p>
      <form class="adm-search" id="admAuditForm">
        <select class="set-input" id="admAuditAction">${filters.map(([id, l]) => `<option value="${id}"${a.action === id ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>
        <input class="set-input" id="admAuditQ" placeholder="${esc(tx('audSearch', 'Admin yoki o\'yinchi nomi'))}" value="${esc(a.q)}">
        <button class="set-mini accent" type="submit">🔍</button>
      </form>`;
    if (!a.list.length) return bar + `<div class="adm-empty">${esc(tx('audNone', "Yozuvlar yo'q"))}</div>`;
    const rows = a.list.map(x => {
      const info = AUDIT[x.action] || ['•', () => x.action];
      const det = auditDetails(x);
      const target = x.target ? (x.targetType === 'user' ? `<span class="player-link" data-username="${esc(x.target)}">${esc(x.target)}</span>` : `<b>${esc(x.target)}</b>`) : '';
      return `<div class="adm-item adm-audit">
        <span class="adm-audit-ico">${info[0]}</span>
        <div class="adm-item-main">
          <b><span class="player-link" data-username="${esc(x.admin)}">${esc(x.admin)}</span> · ${esc(info[1]())}${target ? ' — ' + target : ''}</b>
          ${det ? `<small>${esc(det)}</small>` : ''}
        </div>
        <small class="adm-audit-time">${esc(fmt(x.createdAt))}</small>
      </div>`;
    }).join('');
    const pager = (a.page > 0 || a.more) ? `<div class="adm-pager">
        <button class="set-mini" data-apage="-1"${a.page > 0 ? '' : ' disabled'}>${esc(tx('audPrev', '← Oldingi'))}</button>
        <span>${a.page + 1}</span>
        <button class="set-mini" data-apage="1"${a.more ? '' : ' disabled'}>${esc(tx('audNext', 'Keyingi →'))}</button>
      </div>` : '';
    return bar + `<div class="adm-list">${rows}</div>` + pager;
  }

  async function downloadBackup(btn) {
    btn.disabled = true;
    try {
      const r = await fetch('/api/admin/backup', { headers: headers() });
      if (!r.ok) throw new Error(r.status);
      const name = (/filename="([^"]+)"/.exec(r.headers.get('Content-Disposition') || '') || [])[1] || 'chessdom-backup.json.gz';
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      showToast(tx('admBackupDone', 'Zaxira nusxa yuklab olindi'), 'success');
    } catch (e) { showToast(tx('errGeneric', 'Xatolik yuz berdi!'), 'warning'); }
    btn.disabled = false;
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

  // Fair-play: shubhali o'yinlari bor o'yinchilar (fokus yo'qotish, mashinaga o'xshash bir xil yurish vaqtlari)
  function fairplayHtml() {
    const flagLabel = { flagged: ['🕵️', tx('fpFlagged', 'Shubhali')], cheater: ['⛔', tx('fpCheater', 'Qoidabuzar')], cleared: ['✓', tx('fpCleared', 'Toza')] };
    const intro = `<p class="adm-note">${esc(tx('fpIntro', "Har o'yin oxirida tekshiriladi: o'yinchi o'yin paytida sahifadan tez-tez chiqib ketganmi (boshqa oynada dastur ochish belgisi) va yurish vaqtlari g'ayritabiiy bir xilmi. 20 ta o'yinda 3 ta shubhali g'alaba — avtomatik belgilanadi. Qaror adminda."))}</p>`;
    if (!st.fairplay.length) return intro + `<div class="adm-empty">${esc(tx('fpNone', "Shubhali o'yinchilar yo'q"))}</div>`;
    return intro + `<div class="adm-list">${st.fairplay.map(u => {
      const f = flagLabel[u.flag];
      const recent = (u.recent || []).map(r => `<i class="fp-dot${Number(r.suspicious) ? ' sus' : ''}" title="${esc(r.result)} · ${r.moves} ${esc(tx('ghMovesShort', 'yurish'))} · ${esc(tx('fpBlurs', 'chiqish'))} ${r.blurs} · CV ${r.cv}"></i>`).join('');
      return `<div class="adm-item">
        <div class="adm-item-main">
          <b><span class="player-link" data-username="${esc(u.username)}">${esc(u.username)}</span> ${f ? `<em class="adm-tag${u.flag === 'cleared' ? '' : ' red'}">${f[0]} ${esc(f[1])}</em>` : ''}</b>
          <small>${esc(tx('fpStats', "{{g}} ta o'yin tekshirilgan · shubhali: {{s}} · sahifadan chiqish: {{b}}% yurishlarda · g'alaba {{w}}%", { g: u.games, s: u.suspicious, b: u.blurRate, w: u.winRate }))}</small>
          <div class="fp-recent">${recent}</div>
        </div>
        <div class="adm-actions">
          ${u.flag !== 'cheater' ? `<button class="set-mini danger" data-fp="cheater" data-id="${esc(u.id)}">⛔ ${esc(tx('fpMarkCheater', 'Qoidabuzar + reytingni qaytarish'))}</button>` : ''}
          ${u.flag !== 'cleared' ? `<button class="set-mini" data-fp="clear" data-id="${esc(u.id)}">✓ ${esc(tx('fpClear', 'Toza deb belgilash'))}</button>` : ''}
          ${banControls(u.id)}
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  // Chat moderatsiyasi: klub chatlaridagi so'nggi xabarlar, o'chirish, jim qilish, taqiqlangan so'zlar
  function chatHtml() {
    const c = st.chat;
    const words = c.words.map(w => `<span class="adm-word">${esc(w)}<button data-unword="${esc(w)}">✕</button></span>`).join('');
    const msgs = c.messages.map(m => {
      const muted = m.mutedUntil && new Date(m.mutedUntil) > new Date();
      return `<div class="adm-item">
        <div class="adm-item-main">
          <b><span class="player-link" data-username="${esc(m.username)}">${esc(m.username)}</span> <small>· ${esc(String(m.roomId).replace(/^club_/, '🏳️ '))} · ${esc(fmt(m.createdAt))}</small>${muted ? ` <em class="adm-tag red">🔇 ${esc(fmt(m.mutedUntil))}</em>` : ''}</b>
          <p>${esc(m.message)}</p>
        </div>
        <div class="adm-actions">
          <button class="set-mini danger" data-delmsg="${esc(m.id)}">🗑</button>
          <select data-mute-hours="${esc(m.userId)}"><option value="1">1 ${esc(tx('admHour', 'soat'))}</option><option value="24">24 ${esc(tx('admHour', 'soat'))}</option><option value="168">7 ${esc(tx('admDay', 'kun'))}</option><option value="0">${esc(tx('admUnmute', 'Ruxsat berish'))}</option></select>
          <button class="set-mini" data-mute="${esc(m.userId)}">🔇 ${esc(tx('admMute', 'Jim qilish'))}</button>
        </div>
      </div>`;
    }).join('');
    return `
      <div class="adm-box">
        <b>🚫 ${esc(tx('admBadWords', "Taqiqlangan so'zlar"))}</b>
        <p class="adm-note">${esc(tx('admBadWordsHint', "Bu so'zlar barcha chatlarda (shaxsiy, klub, o'yin, tomoshabinlar) avtomatik *** bilan yashiriladi."))}</p>
        <div class="adm-words">${words || `<small>—</small>`}</div>
        <form class="adm-search" id="admWordForm"><input class="set-input" id="admWord" maxlength="40" placeholder="${esc(tx('admAddWord', "So'z qo'shish"))}"><button class="set-mini accent" type="submit">+</button></form>
      </div>
      <form class="adm-search" id="admChatSearch">
        <input class="set-input" id="admChatClub" placeholder="${esc(tx('admChatClub', 'Klub (masalan, Uzbekistan)'))}" value="${esc(c.club)}">
        <input class="set-input" id="admChatUser" placeholder="${esc(tx('lbSearch', "O'yinchini qidirish"))}" value="${esc(c.user)}">
        <button class="set-mini accent" type="submit">🔍</button>
      </form>
      <div class="adm-list">${msgs || `<div class="adm-empty">${esc(tx('admNoMessages', "Xabarlar yo'q"))}</div>`}</div>`;
  }

  function render() {
    const el = root();
    if (!el) return;
    if (!window.currentUser || window.currentUser.role !== 'admin') { el.innerHTML = `<div class="adm-empty">${esc(tx('admNoAccess', "Bu bo'lim faqat adminlar uchun"))}</div>`; return; }
    const tabs = [['stats', '📊', tx('admTabStats', 'Statistika')], ['reports', '⚠️', tx('admTabReports', 'Shikoyatlar')], ['users', '👥', tx('admTabUsers', "O'yinchilar")], ['tournaments', '🏁', tx('admTabTournaments', 'Turnirlar')], ['fairplay', '🕵️', tx('admTabFairplay', 'Fair-play')], ['chat', '💬', tx('admTabChat', 'Chat')], ['errors', '🐞', tx('admTabErrors', 'Xatolar')], ['audit', '📜', tx('admTabAudit', 'Jurnal')]];
    const body = { stats: statsHtml, reports: reportsHtml, users: usersHtml, tournaments: tournamentsHtml, fairplay: fairplayHtml, chat: chatHtml, errors: errorsHtml, audit: auditHtml }[st.tab]();
    el.innerHTML = `
      <header class="set-head"><div><h1>🛡️ ${esc(tx('admTitle', 'Admin paneli'))}</h1><p>${esc(tx('admSub', "Shikoyatlar, o'yinchilar va turnirlarni boshqarish"))}</p></div></header>
      <div class="lb-seg adm-tabs">${tabs.map(([id, i, l]) => `<button class="${st.tab === id ? 'active' : ''}" data-atab="${id}">${i} ${esc(l)}</button>`).join('')}</div>
      <div class="adm-body">${body}</div>`;
    bind(el);
  }

  function bind(el) {
    el.querySelectorAll('[data-atab]').forEach(b => b.addEventListener('click', () => { st.tab = b.dataset.atab; render(); load(); }));
    el.querySelectorAll('[data-estatus]').forEach(b => b.addEventListener('click', () => { st.errors.status = b.dataset.estatus; load(); }));
    el.querySelectorAll('[data-esource]').forEach(b => b.addEventListener('click', () => { st.errors.source = b.dataset.esource; load(); }));
    el.querySelectorAll('[data-err-resolve], [data-err-reopen]').forEach(b => b.addEventListener('click', async () => {
      const id = b.dataset.errResolve || b.dataset.errReopen;
      await api('/api/admin/errors/' + encodeURIComponent(id) + '/resolve', { resolved: !!b.dataset.errResolve });
      load();
    }));
    const errClear = el.querySelector('#admErrClear');
    if (errClear) errClear.addEventListener('click', async () => {
      if (!confirm(tx('admErrClearConfirm', "Hal qilingan xatolarni o'chirasizmi?"))) return;
      await api('/api/admin/errors/clear-resolved', {});
      load();
    });
    const auditForm = el.querySelector('#admAuditForm');
    if (auditForm) auditForm.addEventListener('submit', (e) => {
      e.preventDefault();
      st.audit.action = el.querySelector('#admAuditAction').value;
      st.audit.q = el.querySelector('#admAuditQ').value.trim();
      st.audit.page = 0;
      load();
    });
    const auditAction = el.querySelector('#admAuditAction');
    if (auditAction) auditAction.addEventListener('change', () => auditForm.requestSubmit());
    el.querySelectorAll('[data-apage]').forEach(b => b.addEventListener('click', () => { st.audit.page = Math.max(0, st.audit.page + Number(b.dataset.apage)); load(); }));
    const backupBtn = el.querySelector('#admBackupBtn');
    if (backupBtn) backupBtn.addEventListener('click', () => downloadBackup(backupBtn));
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
    el.querySelectorAll('[data-fp]').forEach(b => b.addEventListener('click', async () => {
      if (b.dataset.fp === 'cheater' && !confirm(tx('fpConfirm', "O'yinchini qoidabuzar deb belgilaysizmi? Unga yutqazgan raqiblarning reytingi qaytariladi."))) return;
      const d = await api('/api/admin/fairplay/' + b.dataset.id, { action: b.dataset.fp });
      if (d && d.success && b.dataset.fp === 'cheater') showToast(tx('fpRefunded', "{{n}} ta o'yinchiga jami {{p}} reyting qaytarildi", { n: d.refunded, p: d.points }), 'success');
      load();
    }));
    el.querySelectorAll('[data-delmsg]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm(tx('csDeleteMsgConfirm', "Xabarni o'chirasizmi?"))) return;
      await fetch('/api/chat/messages/' + encodeURIComponent(b.dataset.delmsg), { method: 'DELETE', headers: headers() }).catch(() => null);
      load();
    }));
    el.querySelectorAll('[data-mute]').forEach(b => b.addEventListener('click', async () => {
      const hours = Number(el.querySelector(`[data-mute-hours="${b.dataset.mute}"]`).value);
      const d = await api('/api/admin/users/' + b.dataset.mute + '/mute', { hours });
      showToast(d && d.success ? (hours ? tx('admMuted', "O'yinchi jim qilindi") : tx('admUnmuted', 'Chatga ruxsat berildi')) : tx('errGeneric', 'Xatolik yuz berdi!'), d && d.success ? 'success' : 'warning');
      load();
    }));
    const wordForm = el.querySelector('#admWordForm');
    if (wordForm) wordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const word = el.querySelector('#admWord').value.trim();
      if (!word) return;
      const d = await api('/api/admin/chat-filter', { word });
      if (d && d.success) { st.chat.words = d.words; render(); }
    });
    el.querySelectorAll('[data-unword]').forEach(b => b.addEventListener('click', async () => {
      const d = await api('/api/admin/chat-filter', { word: b.dataset.unword, remove: true });
      if (d && d.success) { st.chat.words = d.words; render(); }
    }));
    const chatSearch = el.querySelector('#admChatSearch');
    if (chatSearch) chatSearch.addEventListener('submit', (e) => { e.preventDefault(); st.chat.club = el.querySelector('#admChatClub').value.trim(); st.chat.user = el.querySelector('#admChatUser').value.trim(); load(); });
    el.querySelectorAll('[data-unban]').forEach(b => b.addEventListener('click', async () => { await api('/api/admin/users/' + b.dataset.unban + '/unban', {}); load(); }));
    el.querySelectorAll('[data-cancel-t]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm(tx('admCancelConfirm', 'Turnirni bekor qilasizmi?'))) return;
      const d = await api('/api/admin/tournaments/' + b.dataset.cancelT + '/cancel', {});
      showToast(d && d.success ? tx('admCancelled', 'Turnir bekor qilindi') : (tServer(d && d.message) || tx('errGeneric', 'Xatolik yuz berdi!')), d && d.success ? 'success' : 'warning');
      load();
    }));
  }

  window.renderAdminView = function () { render(); load(); };
  // Bildirishnomadan: kerakli tab bilan ochish
  window.openAdminTab = function (tab) { st.tab = tab; switchView('admin'); };
  window.refreshAdminView = function () { const v = document.getElementById('adminView'); if (v && v.classList.contains('active-view')) render(); };
  document.addEventListener('DOMContentLoaded', () => window.updateAdminNav());
})();
