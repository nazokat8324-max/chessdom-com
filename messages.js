// "Xabarlar" bo'limi: shaxsiy suhbatlar (istalgan o'yinchiga), do'stlar va do'stlik so'rovlari
(function () {
  const state = { tab: 'chats', conversations: [], friends: [], requests: [], active: null, messages: [], unread: 0, picker: false, pickerTab: 'stickers' };

  // --- Stikerlar: xabar matni "[sticker:<id>]" ko'rinishida saqlanadi, faqat ro'yxatdagilari rasm bo'lib chiziladi ---
  // a-<kod> — Google Noto animatsiyali emoji (CC BY 4.0), c-<nom> — shaxmat stikerlari
  const NOTO = (code, anim) => 'https://fonts.gstatic.com/s/e/notoemoji/latest/' + code + '/' + (anim ? '512.webp' : 'emoji.svg');
  const ANIM_STICKERS = ['1f600', '1f602', '1f923', '1f60a', '1f60e', '1f60d', '1f618', '1f973', '1f914', '1f92f', '1f631', '1f605',
    '1f622', '1f62d', '1f621', '1f634', '1f97a', '1f440', '1f480', '1f44d', '1f44f', '1f64f', '1f4aa', '1f525', '2764_fe0f', '1f389', '1f3c6', '1f451'];
  const CHESS_STICKERS = [
    ['hi', 'wK', 'stkHi', 'Salom!', 'teal'], ['gg', 'wN', 'stkGG', "Yaxshi o'yin!", 'green'], ['check', 'wQ', 'stkCheck', 'Shax!', 'red'],
    ['mate', 'bK', 'stkMate', 'Mat!', 'dark'], ['nice', 'wB', 'stkNice', "Zo'r yurish!", 'gold'], ['rematch', 'bN', 'stkRematch', 'Revansh?', 'blue'],
    ['luck', 'wR', 'stkLuck', 'Omad!', 'purple'], ['oops', 'bP', 'stkOops', 'Ups...', 'orange']
  ];
  const EMOJIS = '😀 😂 🤣 😊 😍 😘 😎 🤩 🤔 😏 😅 😬 😢 😭 😡 😱 🥳 😴 🙈 🫡 👋 🙏 👍 👎 👏 💪 🤝 🔥 ❤️ 💔 💯 🎉 🏆 👑 ⚡ ⏱️ ♟️ ✅ ❌ 👀'.split(' ');
  const pieceSrc = (code) => (window.pieceUrl ? window.pieceUrl(code) : 'img/chesspieces/wikipedia/' + code + '.png');
  const stickerId = (msg) => {
    const m = /^\[sticker:([a-z0-9_-]{1,32})\]$/.exec(String(msg || '').trim());
    if (!m) return null;
    const id = m[1];
    if (id.startsWith('a-') && ANIM_STICKERS.includes(id.slice(2))) return id;
    if (id.startsWith('c-') && CHESS_STICKERS.some(s => s[0] === id.slice(2))) return id;
    return null;
  };
  const chessStickerHtml = (name, small) => {
    const s = CHESS_STICKERS.find(x => x[0] === name);
    return `<span class="stk-chess c-${s[4]}${small ? ' small' : ''}"><img src="${esc(pieceSrc(s[1]))}" alt=""><b>${esc(tx(s[2], s[3]))}</b></span>`;
  };
  const stickerHtml = (id) => id.startsWith('a-')
    ? `<img class="stk-anim" src="${NOTO(id.slice(2), true)}" alt="" loading="lazy" onerror="this.src='${NOTO(id.slice(2), false)}'">`
    : chessStickerHtml(id.slice(2));
  // Suhbatlar ro'yxati va bildirishnomalar uchun qisqa matn
  const previewText = (msg) => stickerId(msg) ? '🎨 ' + tx('msgSticker', 'Stiker') : msg;
  window.chatPreviewText = previewText;

  const esc = (v) => {
    const div = document.createElement('div');
    div.textContent = (v === null || v === undefined) ? '' : String(v);
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.authToken}` });
  const getJson = (url) => fetch(url, { headers: authHeaders() }).then(r => r.json());
  const postJson = (url, body) => fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body || {}) }).then(r => r.json());
  const flag = (code) => code ? `<img class="msg-flag" src="https://flagcdn.com/w40/${esc(code)}.png" alt="">` : '';
  const avatar = (name, size) => `<span class="msg-avatar${size ? ' ' + size : ''}">${esc((name || '?').charAt(0).toUpperCase())}${window.avatarOverlay ? window.avatarOverlay(name, window.myAvatarVersion(name)) : ''}</span>`;
  const isActiveView = () => { const v = document.getElementById('messagesView'); return !!(v && v.classList.contains('active-view')); };

  function timeLabel(iso) {
    const d = new Date(iso);
    if (!iso || isNaN(d)) return '';
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  }

  // --- Yon menyudagi belgi: o'qilmagan xabarlar + kutilayotgan do'stlik so'rovlari ---
  function updateBadge() {
    const nav = document.getElementById('navMessages');
    if (!nav) return;
    let badge = nav.querySelector('.lg-nav-badge');
    const total = state.unread + state.requests.length;
    if (!total) { if (badge) badge.remove(); return; }
    if (!badge) { badge = document.createElement('span'); badge.className = 'lg-nav-badge'; nav.appendChild(badge); }
    badge.textContent = total > 99 ? '99+' : total;
  }

  window.refreshMessagesBadge = async function () {
    if (!window.authToken) { state.unread = 0; state.requests = []; updateBadge(); return; }
    try {
      const [u, r] = await Promise.all([getJson('/api/messages/unread'), getJson('/api/friends/requests')]);
      if (u && u.success) state.unread = u.unread;
      if (r && r.success) state.requests = r.requests || [];
      updateBadge();
    } catch (e) {}
  };

  // --- Ma'lumotlarni yuklash ---
  async function loadConversations() {
    const d = await getJson('/api/messages/conversations').catch(() => null);
    state.conversations = (d && d.success) ? d.conversations : [];
    state.unread = state.conversations.reduce((s, c) => s + c.unread, 0);
    updateBadge();
  }
  async function loadFriends() {
    const [f, r] = await Promise.all([getJson('/api/friends').catch(() => null), getJson('/api/friends/requests').catch(() => null)]);
    state.friends = (f && f.success) ? f.friends : [];
    state.requests = (r && r.success) ? r.requests : [];
    updateBadge();
  }

  // --- Chizish ---
  function listHtml() {
    if (state.tab === 'chats') {
      if (!state.conversations.length) return `<div class="msg-empty-list">${esc(tx('msgNoChats', "Hali suhbatlar yo'q. O'yinchi nomini qidirib, birinchi xabarni yozing!"))}</div>`;
      return state.conversations.map(c => `
        <button class="msg-item${state.active && state.active.id === c.partner.id ? ' active' : ''}" data-user-id="${esc(c.partner.id)}" data-username="${esc(c.partner.username)}" data-country="${esc(c.partner.country || '')}">
          ${avatar(c.partner.username)}
          <span class="msg-item-main">
            <span class="msg-item-top"><b>${esc(c.partner.username)}</b>${flag(c.partner.country)}<small>${esc(timeLabel(c.lastAt))}</small></span>
            <span class="msg-item-last">${c.lastFromMe ? `<em>${esc(tx('msgYou', 'Siz'))}:</em> ` : ''}${esc(previewText(c.lastMessage))}</span>
          </span>
          ${c.unread ? `<span class="msg-unread">${c.unread}</span>` : ''}
        </button>`).join('');
    }
    if (state.tab === 'friends') {
      if (!state.friends.length) return `<div class="msg-empty-list">${esc(tx('friendsEmpty', "Do'stlar ro'yxati bo'sh"))}</div>`;
      return state.friends.map(f => `
        <div class="msg-friend">
          ${avatar(f.username)}
          <span class="msg-item-main">
            <b class="player-link" data-username="${esc(f.username)}">${esc(f.username)}</b>
            <small>${esc(tx('profLabelRating', 'Reyting:'))} ${Number(f.rating) || 1500}</small>
          </span>
          <button class="msg-small-btn" data-chat-id="${esc(f.id)}" data-chat-name="${esc(f.username)}">✉️ ${esc(tx('msgWrite', 'Yozish'))}</button>
        </div>`).join('');
    }
    if (!state.requests.length) return `<div class="msg-empty-list">${esc(tx('noFriendRequests', "So'rovlar yo'q"))}</div>`;
    return state.requests.map(r => `
      <div class="msg-friend">
        ${avatar(r.username)}
        <span class="msg-item-main">
          <b class="player-link" data-username="${esc(r.username)}">${esc(r.username)}</b>
          <small>${esc(tx('msgWantsFriend', "do'stlik so'ramoqda"))}</small>
        </span>
        <span class="msg-req-actions">
          <button class="msg-small-btn accept" data-accept="${esc(r.id)}">✓</button>
          <button class="msg-small-btn decline" data-decline="${esc(r.id)}">✕</button>
        </span>
      </div>`).join('');
  }

  function chatHtml() {
    const p = state.active;
    if (!p) return `<div class="msg-placeholder"><span>💬</span><p>${esc(tx('msgPickChat', "Suhbatni tanlang yoki yangisini boshlang"))}</p></div>`;
    let lastDay = '';
    const bubbles = state.messages.map(m => {
      const mine = window.currentUser && String(m.sender_id) === String(window.currentUser.id);
      const d = new Date(m.created_at);
      const day = isNaN(d) ? '' : d.toLocaleDateString();
      const sep = day && day !== lastDay ? `<div class="msg-day">${esc(day)}</div>` : '';
      lastDay = day;
      const time = esc(isNaN(d) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      const sticker = stickerId(m.message);
      if (sticker) return `${sep}<div class="msg-bubble sticker ${mine ? 'mine' : 'theirs'}">${stickerHtml(sticker)}<time>${time}</time></div>`;
      return `${sep}<div class="msg-bubble ${mine ? 'mine' : 'theirs'}"><span>${esc(m.message)}</span><time>${time}</time></div>`;
    }).join('');
    return `
      <div class="msg-chat-head">
        <button class="msg-back" data-back="1">←</button>
        ${avatar(p.username, 'lg')}
        <div class="msg-chat-title">
          <b class="player-link" data-username="${esc(p.username)}">${esc(p.username)}</b>
          ${p.country ? `<small>${flag(p.country)}</small>` : ''}
        </div>
        <button class="msg-challenge" data-challenge="${esc(p.username)}" title="${esc(tx('chProfileBtn', "O'yinga chaqirish"))}">⚔️ <span>${esc(tx('chPlayShort', "O'ynash"))}</span></button>
      </div>
      <div class="msg-thread" id="msgThread">${bubbles || `<div class="msg-placeholder small"><p>${esc(tx('msgSayHi', "Salom deb yozing 👋"))}</p></div>`}</div>
      ${state.picker ? pickerHtml() : ''}
      <form class="msg-composer" id="msgComposer">
        <button type="button" class="msg-emoji-btn${state.picker ? ' active' : ''}" data-picker="1" title="${esc(tx('msgStickers', 'Stikerlar va emoji'))}">😊</button>
        <input id="msgInput" class="form-input" maxlength="1000" autocomplete="off" placeholder="${esc(tx('chatPlaceholder', 'Xabar yozing...'))}">
        <button type="submit" class="msg-send">➤</button>
      </form>`;
  }

  function pickerHtml() {
    const tabs = [['stickers', '✨ ' + tx('msgTabStickers', 'Stikerlar')], ['chess', '♟ ' + tx('msgTabChessStickers', 'Shaxmat')], ['emoji', '😊 Emoji']];
    let grid;
    if (state.pickerTab === 'chess') grid = `<div class="msg-picker-grid chess">${CHESS_STICKERS.map(s => `<button type="button" data-sticker="c-${s[0]}">${chessStickerHtml(s[0], true)}</button>`).join('')}</div>`;
    else if (state.pickerTab === 'emoji') grid = `<div class="msg-picker-grid emoji">${EMOJIS.map(e => `<button type="button" data-emoji="${esc(e)}">${esc(e)}</button>`).join('')}</div>`;
    else grid = `<div class="msg-picker-grid anim">${ANIM_STICKERS.map(c => `<button type="button" data-sticker="a-${c}"><img src="${NOTO(c, false)}" alt="" loading="lazy"></button>`).join('')}</div>`;
    return `<div class="msg-picker">
      <div class="msg-picker-tabs">${tabs.map(([id, label]) => `<button type="button" class="${state.pickerTab === id ? 'active' : ''}" data-ptab="${id}">${esc(label)}</button>`).join('')}</div>
      ${grid}
    </div>`;
  }

  function render() {
    const root = document.getElementById('messagesRoot');
    if (!root) return;
    const oldInput = document.getElementById('msgInput');
    const draft = oldInput ? { value: oldInput.value, focused: document.activeElement === oldInput, caret: oldInput.selectionStart } : null;
    const tabs = [
      ['chats', tx('msgTabChats', 'Suhbatlar'), state.unread],
      ['friends', tx('msgTabFriends', "Do'stlar"), 0],
      ['requests', tx('msgTabRequests', "So'rovlar"), state.requests.length]
    ];
    root.innerHTML = `
      <div class="msg-layout${state.active ? ' has-active' : ''}">
        <aside class="msg-sidebar">
          <div class="msg-sidebar-head">
            <h2>${esc(tx('mMessages', 'Xabarlar'))}</h2>
            <form class="msg-search" id="msgSearch">
              <input id="msgSearchInput" class="form-input" placeholder="${esc(tx('msgSearchPlaceholder', "O'yinchi nomi bilan yangi suhbat"))}" autocomplete="off">
              <button type="submit" class="msg-small-btn">+</button>
            </form>
            <div class="msg-tabs">${tabs.map(([id, label, n]) => `<button class="msg-tab${state.tab === id ? ' active' : ''}" data-tab="${id}">${esc(label)}${n ? ` <span class="msg-tab-count">${n}</span>` : ''}</button>`).join('')}</div>
          </div>
          <div class="msg-list" id="msgList">${listHtml()}</div>
        </aside>
        <section class="msg-chat" id="msgChat">${chatHtml()}</section>
      </div>`;
    bind(root);
    const newInput = document.getElementById('msgInput');
    if (draft && newInput && draft.value) {
      newInput.value = draft.value;
      if (draft.focused) { newInput.focus(); newInput.setSelectionRange(draft.caret, draft.caret); }
    }
    scrollThread();
  }

  function scrollThread() {
    const t = document.getElementById('msgThread');
    if (t) t.scrollTop = t.scrollHeight;
  }

  function bind(root) {
    root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', async () => {
      state.tab = b.dataset.tab;
      if (state.tab !== 'chats') await loadFriends();
      render();
    }));
    root.querySelectorAll('.msg-item').forEach(b => b.addEventListener('click', () => {
      openConversation({ id: b.dataset.userId, username: b.dataset.username, country: b.dataset.country || null });
    }));
    root.querySelectorAll('[data-chat-id]').forEach(b => b.addEventListener('click', () => {
      openConversation({ id: b.dataset.chatId, username: b.dataset.chatName, country: null });
    }));
    root.querySelectorAll('[data-accept]').forEach(b => b.addEventListener('click', () => answerRequest('accept', b.dataset.accept)));
    root.querySelectorAll('[data-decline]').forEach(b => b.addEventListener('click', () => answerRequest('decline', b.dataset.decline)));
    const challenge = root.querySelector('[data-challenge]');
    if (challenge) challenge.addEventListener('click', () => { if (typeof window.openChallengeDialog === 'function') window.openChallengeDialog(challenge.dataset.challenge); });
    const back = root.querySelector('[data-back]');
    if (back) back.addEventListener('click', () => { state.active = null; render(); });
    const search = document.getElementById('msgSearch');
    if (search) search.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('msgSearchInput').value.trim();
      if (name) window.openMessagesWith(name);
    });
    const composer = document.getElementById('msgComposer');
    if (composer) composer.addEventListener('submit', (e) => { e.preventDefault(); state.picker = false; sendMessage(); });
    root.querySelectorAll('[data-picker]').forEach(b => b.addEventListener('click', () => { state.picker = !state.picker; render(); }));
    root.querySelectorAll('[data-ptab]').forEach(b => b.addEventListener('click', () => { state.pickerTab = b.dataset.ptab; render(); }));
    root.querySelectorAll('[data-sticker]').forEach(b => b.addEventListener('click', () => sendSticker(b.dataset.sticker)));
    root.querySelectorAll('[data-emoji]').forEach(b => b.addEventListener('click', () => {
      const input = document.getElementById('msgInput');
      if (!input) return;
      const start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? input.value.length;
      input.value = input.value.slice(0, start) + b.dataset.emoji + input.value.slice(end);
      input.focus();
      const pos = start + b.dataset.emoji.length;
      input.setSelectionRange(pos, pos);
    }));
    const input = document.getElementById('msgInput');
    if (input && !matchMedia('(max-width: 900px)').matches) input.focus();
  }

  async function answerRequest(action, requestId) {
    const d = await postJson('/api/friends/' + action, { requestId }).catch(() => null);
    if (d && d.success) showToast(tServer(d.message) || tx('settingsSavedToast', 'Saqlandi'), action === 'accept' ? 'success' : 'info');
    else showToast(tServer(d && d.message) || tx('errGeneric', 'Xatolik yuz berdi!'), 'warning');
    await loadFriends();
    render();
  }

  // --- Suhbat ---
  async function openConversation(partner) {
    if (!partner || !partner.id) return;
    if (window.currentUser && partner.id === window.currentUser.id) return;
    state.active = partner;
    state.picker = false;
    state.tab = 'chats';
    state.messages = [];
    render();
    const d = await getJson('/api/chat/messages?roomId=' + encodeURIComponent('user_' + partner.id)).catch(() => null);
    if (!state.active || state.active.id !== partner.id) return;
    state.messages = (d && d.success) ? d.messages : [];
    await postJson('/api/messages/read', { roomId: 'user_' + partner.id }).catch(() => {});
    await loadConversations();
    render();
  }

  async function sendSticker(id) {
    const p = state.active;
    if (!p) return;
    state.picker = false;
    render();
    const d = await postJson('/api/chat/messages', { message: '[sticker:' + id + ']', roomId: 'user_' + p.id }).catch(() => null);
    if (!d || !d.success) showToast(tServer(d && d.message) || tx('errGeneric', 'Xatolik yuz berdi!'), 'warning');
  }

  async function sendMessage() {
    const input = document.getElementById('msgInput');
    const p = state.active;
    if (!input || !p) return;
    const message = input.value.trim();
    if (!message) return;
    input.value = '';
    const d = await postJson('/api/chat/messages', { message, roomId: 'user_' + p.id }).catch(() => null);
    if (!d || !d.success) {
      input.value = message;
      showToast(tServer(d && d.message) || tx('errGeneric', 'Xatolik yuz berdi!'), 'warning');
    }
    // Yangi xabar socket ('chat-message') orqali keladi va suhbatga qo'shiladi
  }

  // Istalgan o'yinchiga yozish: profil, qidiruv, do'stlar ro'yxatidan
  window.openMessagesWith = async function (username) {
    if (!username) return;
    if (!window.currentUser) { showAuthGate('login'); return; }
    if (username === window.currentUser.username) return;
    const d = await fetch('/api/users/' + encodeURIComponent(username) + '/profile').then(r => r.json()).catch(() => null);
    if (!d || !d.success) { showToast(tServer(d && d.message) || tx('srvUserNotFound', 'Foydalanuvchi topilmadi!'), 'warning'); return; }
    if (typeof window.closeProfileModal === 'function') window.closeProfileModal();
    if (!isActiveView()) switchView('messages');
    openConversation({ id: d.profile.id, username: d.profile.username, country: d.profile.country });
  };

  // Eski "Chat" tugmalari ham yangi bo'limga olib boradi
  window.startChatWith = function (userId, username) {
    if (!isActiveView()) switchView('messages');
    openConversation({ id: userId, username, country: null });
  };

  window.renderMessagesView = async function () {
    if (!window.currentUser) return;
    render();
    await Promise.all([loadConversations(), loadFriends()]);
    render();
  };

  // --- Real vaqt ---
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof socket === 'undefined') return;
    socket.on('chat-message', async (data) => {
      if (!data || !data.roomId || !String(data.roomId).startsWith('dm_') || !window.currentUser) return;
      const mine = String(data.senderId) === String(window.currentUser.id);
      const openRoom = state.active && String(data.roomId).split('_').includes(state.active.id);
      if (openRoom && isActiveView()) {
        state.messages.push({ sender_id: data.senderId, message: data.message, created_at: data.createdAt, username: data.senderName });
        if (!mine) await postJson('/api/messages/read', { roomId: 'user_' + state.active.id }).catch(() => {});
        await loadConversations();
        render();
        return;
      }
      if (!mine) {
        showToast(`✉️ ${data.senderName || ''}: ${String(previewText(data.message) || '').slice(0, 80)}`, 'info', 5000);
        if (isActiveView()) { await loadConversations(); render(); } else window.refreshMessagesBadge();
      }
    });
    socket.on('friend-request-received', () => {
      window.refreshMessagesBadge();
      if (isActiveView()) loadFriends().then(render);
    });
    if (window.authToken) window.refreshMessagesBadge();
    setInterval(() => { if (window.authToken) window.refreshMessagesBadge(); }, 60000);
  });
})();
