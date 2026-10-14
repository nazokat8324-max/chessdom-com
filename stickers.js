// Stikerlar va emoji — Xabarlar (messages.js) va klub chati (social.js) uchun umumiy.
// Xabar matni "[sticker:<id>]" ko'rinishida saqlanadi; faqat ro'yxatdagi id'lar rasm bo'lib chiziladi.
// a-<kod> — Google Noto animatsiyali emoji (CC BY 4.0), c-<nom> — shaxmat stikerlari.
(function () {
  const esc = (v) => {
    const div = document.createElement('div');
    div.textContent = (v === null || v === undefined) ? '' : String(v);
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  const NOTO = (code, anim) => 'https://fonts.gstatic.com/s/e/notoemoji/latest/' + code + '/' + (anim ? '512.webp' : 'emoji.svg');
  const ANIM = ['1f600', '1f602', '1f923', '1f60a', '1f60e', '1f60d', '1f618', '1f973', '1f914', '1f92f', '1f631', '1f605',
    '1f622', '1f62d', '1f621', '1f634', '1f97a', '1f440', '1f480', '1f44d', '1f44f', '1f64f', '1f4aa', '1f525', '2764_fe0f', '1f389', '1f3c6', '1f451'];
  const CHESS = [
    ['hi', 'wK', 'stkHi', 'Salom!', 'teal'], ['gg', 'wN', 'stkGG', "Yaxshi o'yin!", 'green'], ['check', 'wQ', 'stkCheck', 'Shax!', 'red'],
    ['mate', 'bK', 'stkMate', 'Mat!', 'dark'], ['nice', 'wB', 'stkNice', "Zo'r yurish!", 'gold'], ['rematch', 'bN', 'stkRematch', 'Revansh?', 'blue'],
    ['luck', 'wR', 'stkLuck', 'Omad!', 'purple'], ['oops', 'bP', 'stkOops', 'Ups...', 'orange']
  ];
  const EMOJIS = '😀 😂 🤣 😊 😍 😘 😎 🤩 🤔 😏 😅 😬 😢 😭 😡 😱 🥳 😴 🙈 🫡 👋 🙏 👍 👎 👏 💪 🤝 🔥 ❤️ 💔 💯 🎉 🏆 👑 ⚡ ⏱️ ♟️ ✅ ❌ 👀'.split(' ');
  const pieceSrc = (code) => (window.pieceUrl ? window.pieceUrl(code) : 'img/chesspieces/wikipedia/' + code + '.png');

  function id(msg) {
    const m = /^\[sticker:([a-z0-9_-]{1,32})\]$/.exec(String(msg || '').trim());
    if (!m) return null;
    const s = m[1];
    if (s.startsWith('a-') && ANIM.includes(s.slice(2))) return s;
    if (s.startsWith('c-') && CHESS.some(c => c[0] === s.slice(2))) return s;
    return null;
  }

  function chessHtml(name, small) {
    const s = CHESS.find(x => x[0] === name);
    return `<span class="stk-chess c-${s[4]}${small ? ' small' : ''}"><img src="${esc(pieceSrc(s[1]))}" alt=""><b>${esc(tx(s[2], s[3]))}</b></span>`;
  }

  function html(sid) {
    return sid.startsWith('a-')
      ? `<img class="stk-anim" src="${NOTO(sid.slice(2), true)}" alt="" loading="lazy" onerror="this.src='${NOTO(sid.slice(2), false)}'">`
      : chessHtml(sid.slice(2));
  }

  // Suhbatlar ro'yxati va bildirishnomalar uchun qisqa matn
  function preview(msg) {
    return id(msg) ? '🎨 ' + tx('msgSticker', 'Stiker') : msg;
  }

  // Tanlash oynasi (tabs: stickers | chess | emoji)
  function pickerHtml(tab) {
    const tabs = [['stickers', '✨ ' + tx('msgTabStickers', 'Stikerlar')], ['chess', '♟ ' + tx('msgTabChessStickers', 'Shaxmat')], ['emoji', '😊 Emoji']];
    let grid;
    if (tab === 'chess') grid = `<div class="msg-picker-grid chess">${CHESS.map(s => `<button type="button" data-sticker="c-${s[0]}">${chessHtml(s[0], true)}</button>`).join('')}</div>`;
    else if (tab === 'emoji') grid = `<div class="msg-picker-grid emoji">${EMOJIS.map(e => `<button type="button" data-emoji="${esc(e)}">${esc(e)}</button>`).join('')}</div>`;
    else grid = `<div class="msg-picker-grid anim">${ANIM.map(c => `<button type="button" data-sticker="a-${c}"><img src="${NOTO(c, false)}" alt="" loading="lazy"></button>`).join('')}</div>`;
    return `<div class="msg-picker">
      <div class="msg-picker-tabs">${tabs.map(([t, label]) => `<button type="button" class="${tab === t ? 'active' : ''}" data-ptab="${t}">${esc(label)}</button>`).join('')}</div>
      ${grid}
    </div>`;
  }

  // Matn maydoniga emoji qo'shish (kursor joyiga)
  function insertEmoji(input, emoji) {
    if (!input) return;
    const start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
    input.focus();
    const pos = start + emoji.length;
    input.setSelectionRange(pos, pos);
  }

  // Mustaqil tanlash oynasi (klub chati): button bosilsa mount ichida ochiladi/yopiladi
  function attachPicker({ button, input, mount, onSticker }) {
    if (!button || !mount || button.dataset.pickerBound) return;
    button.dataset.pickerBound = '1';
    let tab = 'stickers';
    const close = () => { const p = mount.querySelector('.msg-picker'); if (p) p.remove(); button.classList.remove('active'); };
    const open = () => {
      close();
      mount.insertAdjacentHTML('beforeend', pickerHtml(tab));
      button.classList.add('active');
      const picker = mount.querySelector('.msg-picker');
      picker.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        e.stopPropagation();
        if (b.dataset.ptab) { tab = b.dataset.ptab; open(); return; }
        if (b.dataset.sticker) { close(); onSticker(b.dataset.sticker); return; }
        if (b.dataset.emoji) insertEmoji(input, b.dataset.emoji);
      });
    };
    button.addEventListener('click', (e) => { e.stopPropagation(); if (mount.querySelector('.msg-picker')) close(); else open(); });
    document.addEventListener('click', (e) => { if (!mount.contains(e.target) && e.target !== button) close(); });
  }

  window.ChatStickers = { id, html, chessHtml, preview, pickerHtml, insertEmoji, attachPicker, ANIM, CHESS, EMOJIS };
  window.chatPreviewText = preview;
})();
