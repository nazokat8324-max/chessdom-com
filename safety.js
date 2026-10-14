// Onlayn holati (yashil nuqta, "oxirgi faollik"), bloklash va shikoyat qilish.
// Server: socket 'presence', GET /api/users/presence, POST /api/users/:username/block|unblock, GET /api/users/me/blocks, POST /api/reports.
(function () {
  const esc = (v) => {
    const div = document.createElement('div');
    div.textContent = (v === null || v === undefined) ? '' : String(v);
    return div.innerHTML.replace(/"/g, '&quot;');
  };
  const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + window.authToken });

  // --- Onlayn holati ---
  window.onlineState = {};

  window.lastSeenText = function (iso) {
    const t = iso ? new Date(String(iso).replace(' ', 'T')).getTime() : NaN;
    if (isNaN(t)) return '';
    const min = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (min < 2) return tx('presJustNow', 'hozirgina');
    if (min < 60) return tx('presMinAgo', '{{n}} daqiqa oldin', { n: min });
    const h = Math.round(min / 60);
    if (h < 24) return tx('presHoursAgo', '{{n}} soat oldin', { n: h });
    return tx('presDaysAgo', '{{n}} kun oldin', { n: Math.round(h / 24) });
  };

  // Avatar ustidagi nuqta (data-presence orqali real vaqtda yangilanadi)
  window.presenceDot = function (userId, online) {
    if (!userId) return '';
    const on = online === undefined ? !!window.onlineState[userId] : !!online;
    if (online !== undefined) window.onlineState[userId] = !!online;
    return `<i class="pres-dot${on ? ' on' : ''}" data-presence="${esc(userId)}"></i>`;
  };

  // Profil: "● Onlayn" yoki "Oxirgi faollik: …"
  window.renderProfilePresence = function (p) {
    const el = document.getElementById('profilePresence');
    if (!el) return;
    const isMe = window.currentUser && p && p.username === window.currentUser.username;
    if (!p || !p.username) { el.hidden = true; return; }
    const online = isMe || !!p.online;
    if (p.id) window.onlineState[p.id] = online;
    el.dataset.presenceUser = p.id || '';
    el.dataset.lastSeen = p.lastSeen || '';
    el.hidden = false;
    el.className = 'profile-presence' + (online ? ' on' : '');
    el.textContent = online ? '● ' + tx('presOnline', 'Onlayn') : (p.lastSeen ? tx('presLastSeen', 'Oxirgi faollik: {{t}}', { t: window.lastSeenText(p.lastSeen) }) : tx('presOffline', 'Oflayn'));
  };

  // --- Bloklash ---
  window.profileBlocked = false;
  window.renderBlockButton = function () {
    const btn = document.getElementById('profileBlockBtn');
    if (!btn) return;
    btn.textContent = window.profileBlocked ? '✅ ' + tx('blkUnblock', 'Blokdan chiqarish') : '🚫 ' + tx('blkBlock', 'Bloklash');
    btn.classList.toggle('active', window.profileBlocked);
  };

  window.toggleBlockUser = async function (username) {
    if (!username || !window.authToken) return;
    const blocking = !window.profileBlocked;
    if (blocking && !confirm(tx('blkConfirm', "{{name}} ni bloklaysizmi? U sizga yozolmaydi, o'yinga chaqira olmaydi va siz bilan juftlanmaydi. Do'stlik bekor bo'ladi.", { name: username }))) return;
    try {
      const d = await fetch('/api/users/' + encodeURIComponent(username) + (blocking ? '/block' : '/unblock'), { method: 'POST', headers: authHeaders() }).then(r => r.json());
      if (!d.success) { showToast(tServer(d.message) || tx('errGeneric', 'Xatolik yuz berdi!'), 'warning'); return; }
      window.profileBlocked = blocking;
      window.renderBlockButton();
      showToast(blocking ? tx('blkDone', "O'yinchi bloklandi") : tx('blkUndone', 'Blokdan chiqarildi'), 'info');
      if (typeof window.loadFriendButton === 'function') window.loadFriendButton(username);
    } catch (e) {
      showToast(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"), 'warning');
    }
  };

  // Sozlamalar → Maxfiylik: bloklanganlar ro'yxati
  window.loadBlockedList = async function (container) {
    if (!container || !window.authToken) return;
    try {
      const d = await fetch('/api/users/me/blocks', { headers: authHeaders() }).then(r => r.json());
      const list = d.success ? d.blocks : [];
      container.innerHTML = list.length
        ? list.map(b => `<div class="blk-row"><b class="player-link" data-username="${esc(b.username)}">${esc(b.username)}</b><button class="set-mini" data-unblock="${esc(b.username)}">${esc(tx('blkUnblock', 'Blokdan chiqarish'))}</button></div>`).join('')
        : `<p class="set-hint">${esc(tx('blkNone', "Bloklangan o'yinchilar yo'q"))}</p>`;
      container.querySelectorAll('[data-unblock]').forEach(b => b.addEventListener('click', async () => {
        await fetch('/api/users/' + encodeURIComponent(b.dataset.unblock) + '/unblock', { method: 'POST', headers: authHeaders() });
        window.loadBlockedList(container);
      }));
    } catch (e) {}
  };

  // --- Shikoyat ---
  const REASONS = [['abuse', 'rpAbuse', "Haqorat yoki yomon so'z"], ['cheating', 'rpCheating', 'Aldash (dastur yordamida o\'ynash)'], ['spam', 'rpSpam', 'Spam / reklama'], ['name', 'rpName', 'Nomaqbul nom yoki rasm'], ['other', 'rpOther', 'Boshqa']];
  window.openReportDialog = function (username) {
    if (!username || !window.currentUser) return;
    const old = document.getElementById('reportModal');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'reportModal';
    el.className = 'ch-overlay';
    el.innerHTML = `
      <form class="ch-card rp-form">
        <button type="button" class="ch-x" data-close="1">✕</button>
        <div class="ch-icon">⚠️</div>
        <h3>${esc(tx('rpTitle', '{{name}} ustidan shikoyat', { name: username }))}</h3>
        <p class="ch-sub">${esc(tx('rpHint', "Sababni tanlang — adminlar ko'rib chiqadi"))}</p>
        <div class="rp-reasons">${REASONS.map(([id, key, fb], i) => `<label class="rp-reason"><input type="radio" name="rpReason" value="${id}" ${i === 0 ? 'checked' : ''}><span>${esc(tx(key, fb))}</span></label>`).join('')}</div>
        <textarea id="rpDetails" class="rp-details" maxlength="500" placeholder="${esc(tx('rpDetails', "Batafsil (ixtiyoriy): nima bo'ldi?"))}"></textarea>
        <button type="submit" class="ch-primary">${esc(tx('rpSend', 'Shikoyat yuborish'))}</button>
      </form>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) el.remove(); });
    el.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const reason = el.querySelector('input[name=rpReason]:checked').value;
      const details = el.querySelector('#rpDetails').value.trim();
      try {
        const d = await fetch('/api/reports', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ username, reason, details }) }).then(r => r.json());
        showToast(tServer(d.message) || (d.success ? tx('rpSent', 'Shikoyatingiz yuborildi. Rahmat!') : tx('errGeneric', 'Xatolik yuz berdi!')), d.success ? 'success' : 'warning', 4000);
        if (d.success) el.remove();
      } catch (err) {
        showToast(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"), 'warning');
      }
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof socket === 'undefined') return;
    socket.on('presence', (data) => {
      if (!data || !data.userId) return;
      window.onlineState[data.userId] = !!data.online;
      document.querySelectorAll(`.pres-dot[data-presence="${CSS.escape(data.userId)}"]`).forEach(d => d.classList.toggle('on', !!data.online));
      const prof = document.getElementById('profilePresence');
      if (prof && prof.dataset.presenceUser === data.userId) {
        window.renderProfilePresence({ id: data.userId, username: window.viewedProfileUsername, online: data.online, lastSeen: data.lastSeen || prof.dataset.lastSeen });
      }
    });
    // Hisob bloklangan (admin): server ochiq sahifani chiqaradi
    socket.on('auth-error', (data) => {
      if (data && data.banned) setTimeout(() => alert(tServer(data.message) || data.message), 300);
    });
  });
})();
