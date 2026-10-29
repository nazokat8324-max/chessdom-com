// O'yin sahifasi qo'shimchalari: o'yin ichidagi chat (stikerlar bilan) va "Revansh".
// Server: 'game-chat' (xonadagi ikki o'yinchi), 'rematch-offer' / 'rematch-accept' / 'rematch-decline'.
(function () {
  const st = { messages: [], muted: false, roomId: null, lastRoomId: null, rematch: 'none', rematchFrom: null };
  // rematch: none | available | sent | offered | unavailable

  const esc = (v) => {
    const div = document.createElement('div');
    div.textContent = (v === null || v === undefined) ? '' : String(v);
    return div.innerHTML;
  };
  const me = () => window.currentUser && window.currentUser.username;

  // --- Chat ---
  function renderChat() {
    const list = document.getElementById('gameChatList');
    if (!list) return;
    const visible = st.messages.filter(m => !st.muted || m.from === me());
    if (!visible.length) {
      list.innerHTML = `<div class="gc-empty">${esc(st.muted ? tx('gcMutedNote', "Raqib xabarlari o'chirilgan") : tx('gcEmpty', "Raqibga salom yo'llang 👋"))}</div>`;
    } else {
      list.innerHTML = visible.map(m => {
        const mine = m.from === me();
        const sid = window.ChatStickers ? window.ChatStickers.id(m.message) : null;
        return `<div class="gc-msg ${mine ? 'mine' : 'theirs'}${sid ? ' sticker' : ''}">
          ${mine ? '' : `<b>${esc(m.from)}</b>`}
          ${sid ? window.ChatStickers.html(sid) : `<span>${esc(m.message)}</span>`}
        </div>`;
      }).join('');
    }
    list.scrollTop = list.scrollHeight;
    const mute = document.getElementById('gameChatMute');
    if (mute) { mute.textContent = st.muted ? '🔕' : '🔔'; mute.title = st.muted ? tx('gcUnmute', "Raqib xabarlarini yoqish") : tx('gcMute', "Raqib xabarlarini o'chirish"); }
  }

  function send(message) {
    const roomId = window.currentRoomId || st.lastRoomId;
    if (!roomId || !message || typeof socket === 'undefined') return;
    socket.emit('game-chat', { roomId, message });
  }

  window.updateGameChatBox = function (mode) {
    const box = document.getElementById('gameChatBox');
    if (!box) return;
    // Onlayn o'yinda (davom etayotgan yoki hozirgina tugagan) ko'rinadi
    const online = !!(window.currentRoomId || (mode === 'over' && st.lastRoomId));
    box.hidden = mode === 'pre' || !online;
  };

  // --- Revansh ---
  window.updateRematchBox = function (mode) {
    const box = document.getElementById('rematchBox');
    if (!box) return;
    const show = mode === 'over' && st.lastRoomId && st.rematch !== 'none';
    box.hidden = !show;
    if (!show) return;
    const msg = box.querySelector('.rm-msg');
    const btn = document.getElementById('btnRematch');
    const actions = box.querySelector('.rm-actions');
    btn.hidden = st.rematch === 'offered' || st.rematch === 'unavailable';
    actions.hidden = st.rematch !== 'offered';
    btn.disabled = st.rematch === 'sent';
    btn.textContent = st.rematch === 'sent' ? '⏳ ' + tx('rmWaiting', 'Javob kutilmoqda...') : '🔁 ' + tx('rmOffer', 'Revansh');
    msg.textContent = st.rematch === 'offered'
      ? tx('rmOffered', '{{name}} revansh taklif qilmoqda!', { name: st.rematchFrom || '' })
      : (st.rematch === 'unavailable' ? tx('rmUnavailable', "Raqib o'yindan chiqdi — revansh mumkin emas") : '');
    msg.hidden = !msg.textContent;
  };

  function refreshPanel() {
    window.updateRematchBox(document.getElementById('btnPlayAgain') && !document.getElementById('btnPlayAgain').hidden ? 'over' : 'in');
  }

  window.offerRematch = function () {
    if (!st.lastRoomId || typeof socket === 'undefined') return;
    socket.emit('rematch-offer', { roomId: st.lastRoomId });
    if (st.rematch !== 'offered') st.rematch = 'sent';
    refreshPanel();
  };
  window.acceptRematch = function () { if (st.lastRoomId) socket.emit('rematch-accept', { roomId: st.lastRoomId }); };
  window.declineRematch = function () {
    if (st.lastRoomId) socket.emit('rematch-decline', { roomId: st.lastRoomId });
    st.rematch = 'available';
    refreshPanel();
  };

  document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('gameChatInput');
    const form = document.getElementById('gameChatComposer');
    if (form) form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      send(text);
    });
    const mute = document.getElementById('gameChatMute');
    if (mute) mute.addEventListener('click', () => { st.muted = !st.muted; renderChat(); });
    if (window.ChatStickers) {
      window.ChatStickers.attachPicker({
        button: document.getElementById('gameChatEmoji'),
        input,
        mount: form,
        onSticker: (sid) => send('[sticker:' + sid + ']')
      });
    }
    renderChat();

    if (typeof socket === 'undefined') return;
    socket.on('game-chat', (data) => {
      const roomId = window.currentRoomId || st.lastRoomId;
      if (!data || data.roomId !== roomId) return;
      st.messages.push(data);
      if (st.messages.length > 100) st.messages.shift();
      renderChat();
      if (data.from !== me() && !st.muted && typeof playSound === 'function') playSound('move');
    });
    // Yangi o'yin: chat tozalanadi, revansh holati qayta boshlanadi
    socket.on('match-found', (data) => {
      st.messages = [];
      st.roomId = data.roomId;
      st.lastRoomId = data.roomId;
      st.rematch = data.league ? 'none' : 'available';
      st.rematchFrom = null;
      renderChat();
    });
    socket.on('game-resume', (data) => {
      if (st.roomId !== data.roomId) { st.messages = []; renderChat(); }
      st.roomId = data.roomId;
      st.lastRoomId = data.roomId;
      st.rematch = data.league ? 'none' : 'available';
    });
    socket.on('rematch-offered', (data) => {
      if (!data || data.roomId !== st.lastRoomId) return;
      st.rematch = 'offered';
      st.rematchFrom = data.from;
      refreshPanel();
      showToast('🔁 ' + tx('rmOffered', '{{name}} revansh taklif qilmoqda!', { name: data.from }), 'info', 6000);
    });
    socket.on('rematch-declined', (data) => {
      if (!data || data.roomId !== st.lastRoomId) return;
      st.rematch = 'available';
      refreshPanel();
      showToast(tx('rmDeclined', 'Raqib revanshni rad etdi'), 'info');
    });
    socket.on('rematch-unavailable', () => { st.rematch = 'unavailable'; refreshPanel(); });
    socket.on('opponent-disconnected', () => { if (st.rematch !== 'none') { st.rematch = 'unavailable'; refreshPanel(); } });
  });

  // "Yangi o'yin" bosilganda (xonadan chiqiladi) — revansh va chat yopiladi
  const origReset = window.resetToPreGame;
  window.resetToPreGame = function () {
    st.lastRoomId = null;
    st.rematch = 'none';
    st.messages = [];
    renderChat();
    if (typeof origReset === 'function') origReset.apply(this, arguments);
  };
})();
