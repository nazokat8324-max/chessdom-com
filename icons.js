// 🎨 Saytning o'z ikonka to'plami (2026-11-22, foydalanuvchi tanlovi): emojilar o'rniga o'zimiz chizgan chiziqli SVG belgilar.
// Rang — currentColor: menyuda to'plam/sayt rangi (--accent), asosiy tugmada tugma yozuvi rangi; har qurilmada bir xil ko'rinadi.
// window.iconSvg(name, cls) → '<svg …>'; window.applyUiIcons() — menyu, yuqori tugmalar va bosh sahifa tugmalaridagi emojilarni almashtiradi.
// Yangi menyu bandi qo'shilsa — NAV_ICONS ga ham (pages.test tekshiradi). Shakllar loyihaniki (begona to'plamdan olinmagan).
(function () {
  const P = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
    board: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M12 3.5v17M3.5 12h17"/><path d="M4.5 4.5h7v7h-7zM12.5 12.5h7v7h-7z" fill="currentColor" stroke="none" opacity=".35"/>',
    tea: '<path d="M4 9.5h12v3.5a6 6 0 0 1-12 0z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H15.5"/><path d="M8 3.5c0 1.4 1.4 1.4 1.4 3M12 3.5c0 1.4 1.4 1.4 1.4 3"/><path d="M5 21h10"/>',
    ball: '<circle cx="12" cy="12" r="8.5"/><path d="m12 8 3.4 2.4-1.3 4h-4.2l-1.3-4z"/><path d="M12 3.5V8M15.4 10.4l4.3-1.3M14.1 14.4l2.6 3.6M9.9 14.4l-2.6 3.6M8.6 10.4 4.3 9.1"/>',
    medal: '<path d="M8 3h8l-2.6 6.2h-2.8z"/><circle cx="12" cy="15" r="5.5"/><path d="m12 12.3.9 1.8 2 .3-1.45 1.4.35 2L12 16.85l-1.8.95.35-2-1.45-1.4 2-.3z"/>',
    tv: '<rect x="3" y="6.5" width="18" height="13" rx="2.5"/><path d="M8.5 3 12 6.5 15.5 3"/><path d="M10.5 10.3v5.4l4.3-2.7z"/>',
    chat: '<path d="M4 5.5h16v10.5H9.5L4 20z"/><path d="M8.5 10.8h.01M12 10.8h.01M15.5 10.8h.01" stroke-width="2.6"/>',
    shield: '<path d="M12 3 19.5 6v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z"/><path d="M12 6.5v11M7.5 11h9" opacity=".55"/>',
    trophy: '<path d="M7.5 4h9v5.2a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6h-3v1.4a3.2 3.2 0 0 0 3.2 3.2M16.5 6h3v1.4a3.2 3.2 0 0 1-3.2 3.2"/><path d="M12 13.8v3M9 20.5h6M10 16.8h4v3.7h-4z"/>',
    flag: '<path d="M5.5 21V3.5"/><path d="M5.5 4.5h12l-2.3 4 2.3 4h-12"/>',
    camel: '<path d="M3 13.5c.8-2.4 2.3-3.4 3.8-3.2.8-2.8 3-3.4 4.2-.8 1-2.4 3-2.6 4.2-.2l1.4-3.2c.4-.9 1.4-1.1 2.1-.4l1.8 1.8-1.6.6-2.3 5.2c-.3.7-.9 1.2-1.6 1.2H4.5"/><path d="M5.5 14.5V20M9 14.5V20M13.5 14.5V20M16.5 13.5V20"/>',
    books: '<path d="M4.5 4h4v16h-4zM8.5 4h4v16h-4z"/><path d="m14.2 5.4 3.8-1 3.9 14.5-3.9 1z"/><path d="M4.5 8h4M8.5 16h4"/>',
    admin: '<path d="M12 3 19.5 6v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z"/><path d="m8.8 12 2.2 2.3 4.3-4.6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.3"/><path d="M12 2.6v3.1M12 18.3v3.1M2.6 12h3.1M18.3 12h3.1M5.4 5.4l2.2 2.2M16.4 16.4l2.2 2.2M5.4 18.6l2.2-2.2M16.4 7.6l2.2-2.2"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 2H4.4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.5 3.5 5.4 3.5 8.5s-1.1 6-3.5 8.5c-2.4-2.5-3.5-5.4-3.5-8.5s1.1-6 3.5-8.5z"/>',
    gift: '<rect x="4" y="9.5" width="16" height="11" rx="1.5"/><path d="M3 6.5h18v3H3zM12 6.5v14"/><path d="M12 6.5C10.6 3.4 7.5 3.3 7.5 5c0 1.2 1.9 1.5 4.5 1.5zM12 6.5c1.4-3.1 4.5-3.2 4.5-1.5 0 1.2-1.9 1.5-4.5 1.5z"/>',
    pawn: '<circle cx="12" cy="6.5" r="2.8"/><path d="M9.6 10h4.8l-.9 5.2h-3z"/><path d="M7 20.5h10l-1.6-4.2H8.6z"/>',
    gamepad: '<path d="M7 8h10a4 4 0 0 1 4 4l-.5 4.6a2.4 2.4 0 0 1-4.2 1.3L14.5 16h-5l-1.8 1.9a2.4 2.4 0 0 1-4.2-1.3L3 12a4 4 0 0 1 4-4z"/><path d="M8 11v3M6.5 12.5h3"/><path d="M15.5 11.6h.01M17.6 13.4h.01" stroke-width="2.6"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5V17"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    scroll: '<path d="M6 4h11a2 2 0 0 1 2 2v12.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M9.5 9h6M9.5 12.5h6M9.5 16h4"/>',
    team: '<circle cx="8.5" cy="8" r="3"/><circle cx="15.5" cy="8" r="3"/><path d="M3 19.5a5.5 5.5 0 0 1 11 0M10 19.5a5.5 5.5 0 0 1 11 0"/>',
    map: '<path d="M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5-5.5 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
    bolt: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    // --- 2-bosqich (2026-11-22): sahifalar ichidagi emojilar uchun ---
    handshake: '<path d="M2.5 11 6 7.5l3 1 3-2 3 1 3.5-1L21.5 11"/><path d="m6 11 4.5 4.5a1.5 1.5 0 0 0 2.1 0l.4-.4M9 13.5l2.5 2.5M11.5 11.5l3 3a1.5 1.5 0 0 0 2.1-2.1L13 9"/><path d="M2.5 11l2 2M21.5 11l-2 2"/>',
    party: '<path d="M4 20 8.5 7.5 16.5 15.5z"/><path d="M10 4.5c.6 1 .5 2-.3 2.8M14.5 3.5l.5 1.5M19 8l1.5-.5M17 12c1.2-.6 2.4-.4 3.5.5M13 7c1-1.6 2.6-2 4-1.4"/>',
    swords: '<path d="M4 4l9.5 9.5M20 4l-9.5 9.5"/><path d="M4 4h3l-3 3zM20 4h-3l3 3"/><path d="m7.5 16.5 3-3M16.5 16.5l-3-3M6 15l3 3M18 15l-3 3M4.5 19.5l2-2M19.5 19.5l-2-2"/>',
    thumbUp: '<path d="M7.5 10.5v9h-3v-9z"/><path d="M7.5 10.5 11 4c1.6 0 2.5 1 2.2 2.6l-.6 3H18a2 2 0 0 1 2 2.3l-1.2 6a2 2 0 0 1-2 1.6H7.5"/>',
    thumbDown: '<path d="M7.5 13.5v-9h-3v9z"/><path d="M7.5 13.5 11 20c1.6 0 2.5-1 2.2-2.6l-.6-3H18a2 2 0 0 0 2-2.3l-1.2-6a2 2 0 0 0-2-1.6H7.5"/>',
    book: '<path d="M3.5 5.5c3-1 5.8-.8 8.5 1 2.7-1.8 5.5-2 8.5-1v13c-3-1-5.8-.8-8.5 1-2.7-1.8-5.5-2-8.5-1z"/><path d="M12 6.5v13"/>',
    play: '<path d="M7.5 4.8v14.4a.8.8 0 0 0 1.2.7l11-7.2a.8.8 0 0 0 0-1.4l-11-7.2a.8.8 0 0 0-1.2.7z"/>',
    prev: '<path d="M16.5 4.8v14.4a.8.8 0 0 1-1.2.7l-11-7.2a.8.8 0 0 1 0-1.4l11-7.2a.8.8 0 0 1 1.2.7z"/>',
    first: '<path d="M5.5 5v14"/><path d="M18.5 5.6v12.8a.8.8 0 0 1-1.2.7L8.5 12.7a.8.8 0 0 1 0-1.4l8.8-6.4a.8.8 0 0 1 1.2.7z"/>',
    last: '<path d="M18.5 5v14"/><path d="M5.5 5.6v12.8a.8.8 0 0 0 1.2.7l8.8-6.4a.8.8 0 0 0 0-1.4L6.7 4.9a.8.8 0 0 0-1.2.7z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    passport: '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10.5" r="3.5"/><path d="M8.5 10.5h7M12 7c1 1 1.4 2.2 1.4 3.5S13 13 12 14M12 7c-1 1-1.4 2.2-1.4 3.5S11 13 12 14M9 17.5h6"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" stroke-width="2.8"/>',
    send: '<path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="m21 3-11 10"/>',
    vase: '<path d="M9 3h6M9.5 3c0 2-2 3-2 5.5 0 1.5 1 2.5 1 4C8.5 15 6 16 6 18.5 6 20 7 21 9 21h6c2 0 3-1 3-2.5 0-2.5-2.5-3.5-2.5-6 0-1.5 1-2.5 1-4C16.5 6 14.5 5 14.5 3"/><path d="M8 15.5h8M8.3 9h7.4"/>',
    warning: '<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5M12 17.2h.01"/>',
    search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5.5 5.5"/>',
    flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.2 2.4-5 3.4-8 1.5 1.4 2 2.9 2 4.3 1.2-1.2 1.9-3.4 1.6-6.3 3.4 2.2 6 5.6 6 10 0 3.4-2.6 6-6.5 6z"/><path d="M12 21c-1.6 0-2.7-1.1-2.7-2.6 0-1.6 1.2-2.4 1.7-3.9.8.7 1 1.4 1 2.1.6-.6.9-1.5.8-2.8 1.4 1 2.3 2.4 2.3 4.1 0 1.8-1.2 3.1-3.1 3.1z"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.5 2.5h5M18 6.5l1.5-1.5"/>',
    hourglass: '<path d="M6.5 3h11M6.5 21h11M7.5 3c0 4 4.5 5.5 4.5 9s-4.5 5-4.5 9M16.5 3c0 4-4.5 5.5-4.5 9s4.5 5 4.5 9"/><path d="M9.5 18.5h5l-2.5-2.5z" fill="currentColor" stroke="none" opacity=".45"/>',
    spool: '<path d="M6 4h12M6 20h12"/><rect x="8" y="4" width="8" height="16" rx="1"/><path d="M8 8.5l8 2M8 12l8 2M8 15.5l8 2"/>',
    star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
    wave: '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v7c0 4.4-2.7 7.5-6.5 7.5-2.4 0-4-1.2-5.4-3.4L3.4 14.3a1.4 1.4 0 0 1 2.3-1.6L8 15"/>',
    crystal: '<circle cx="12" cy="10" r="6.5"/><path d="M7 20.5h10M8.5 17.5l-1.5 3M15.5 17.5l1.5 3M9.5 8.5c.4-1.2 1.4-2 2.6-2.2"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    crown: '<path d="m3.5 8 4.5 3.5L12 5l4 6.5L20.5 8 19 18H5z"/><path d="M5 21h14"/>',
    volume: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.4-1.5-1.8-.8-3 .5-.8 1.5-.8 2.7-.8h1.5a3.3 3.3 0 0 0 3.3-3.3c0-4.6-3.8-8.2-8.5-8.2z"/><path d="M8 10.5h.01M11.5 7.5h.01M15.5 9h.01M7.5 14.5h.01" stroke-width="2.6"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v3.5M9 21h6"/>',
    bulb: '<path d="M9 17.5h6M10 20.5h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16.5h5V15.9c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
    ban: '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',
    share: '<path d="M12 15V3.5M8 7.5l4-4 4 4"/><path d="M5 12.5v6.5a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/>',
    trash: '<path d="M4 6.5h16M9.5 6.5V4h5v2.5M6 6.5l1 13.5h10l1-13.5M10 10.5v6M14 10.5v6"/>',
    museum: '<path d="M3 9 12 4l9 5zM4.5 20.5h15M3 9h18"/><path d="M6 11v7.5M10 11v7.5M14 11v7.5M18 11v7.5"/>',
    megaphone: '<path d="M4 10v4h3l9 5V5L7 10z"/><path d="M7 14l1.5 5.5H11L10 15M19 9.5v5"/>',
    bug: '<rect x="7" y="7.5" width="10" height="12" rx="5"/><path d="M9.5 7.5a2.5 2.5 0 0 1 5 0M12 11v8.5M3.5 12.5H7M17 12.5h3.5M4.5 8l3 2M19.5 8l-3 2M4.5 18l3-2M19.5 18l-3-2"/>',
    chart: '<path d="M4 20.5h16M6.5 17v-5M11 17V7M15.5 17v-8M20 17v-3"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.6L4 8.5M4 13a8 8 0 0 0 14.3 4.6L20 15.5"/><path d="M4 4v4.5h4.5M20 20v-4.5h-4.5"/>',
    save: '<path d="M5 4h11.5L20 7.5V20H4V5a1 1 0 0 1 1-1z"/><path d="M8 4v4.5h7V4M8 20v-6h8v6"/>',
    film: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 9h17M3.5 15h17M8 5v4M12 5v4M16 5v4M8 15v4M12 15v4M16 15v4"/>',
    check: '<circle cx="12" cy="12" r="8.5"/><path d="m8 12.3 2.7 2.7L16.3 9"/>',
    cross: '<circle cx="12" cy="12" r="8.5"/><path d="m9 9 6 6M15 9l-6 6"/>',
    pencil: '<path d="M15.5 4.5 19.5 8.5 8.5 19.5H4.5v-4z"/><path d="M13 7l4 4"/>',
    download: '<path d="M12 3.5V15M8 11l4 4 4-4"/><path d="M5 17.5v1.5A1.5 1.5 0 0 0 6.5 20.5h11A1.5 1.5 0 0 0 19 19v-1.5"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    doc: '<path d="M6 3h8.5L19 7.5V21H6z"/><path d="M14 3v5h5M9 12h7M9 15.5h7M9 19h4"/>',
    flower: '<circle cx="12" cy="9" r="2"/><circle cx="12" cy="5.2" r="2.2"/><circle cx="15.6" cy="7.9" r="2.2"/><circle cx="14.2" cy="12.2" r="2.2"/><circle cx="9.8" cy="12.2" r="2.2"/><circle cx="8.4" cy="7.9" r="2.2"/><path d="M12 14.5V21M12 18.5c1.6-1.8 3.4-2.2 5-2-.5 1.8-2.4 2.8-5 2.8"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
    swap: '<path d="M4 8.5h14l-3.5-3.5M20 15.5H6l3.5 3.5"/>',
    rocket: '<path d="M12 2.5c3.5 2.3 5 6 4.5 11l-2 3h-5l-2-3c-.5-5 1-8.7 4.5-11z"/><circle cx="12" cy="9.5" r="1.8"/><path d="M7.5 13.5 5 16l1 3.5 3-2M16.5 13.5 19 16l-1 3.5-3-2M10.5 19.5c.3 1 .8 1.6 1.5 2 .7-.4 1.2-1 1.5-2"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    monitor: '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M9 20.5h6M12 16.5v4"/>',
    undo: '<path d="M8.5 6 4 10.5 8.5 15"/><path d="M4 10.5h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    robot: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4.5V8M9.5 12.5h.01M14.5 12.5h.01" /><circle cx="12" cy="3.8" r="1"/><path d="M9.5 16h5M3 12v3M21 12v3"/>',
    sprout: '<path d="M12 21v-9"/><path d="M12 12c0-3.8-2.6-6-7-6 0 4 2.6 6 7 6zM12 14c0-3.3 2.3-5.5 6.5-5.5 0 3.5-2.4 5.5-6.5 5.5z"/>',
    scale: '<path d="M12 4v16M7 20.5h10M5 7.5h14"/><path d="M5 7.5 2.5 13a2.5 2.5 0 0 0 5 0zM19 7.5 16.5 13a2.5 2.5 0 0 0 5 0z"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 0 1 4.9.6c0 1.7-2.5 2-2.5 3.6M12 16.8h.01"/>',
    broom: '<path d="M19.5 4.5 12.5 11.5"/><path d="M12.5 11.5c-2.5-1-5.5.5-6.5 3l-2.5 6 6-2.5c2.5-1 4-4 3-6.5z"/><path d="M6.5 17.5l2-2"/>',
    chair: '<path d="M7 3.5v9.5h10V3.5M7 7.5h10M5.5 13h13M7 13v7.5M17 13v7.5M7 17h10"/>',
    pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.5"/>',
    moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4M7.5 13h.01M12 13h.01M16.5 13h.01M7.5 16.5h.01M12 16.5h.01" />',
    camera: '<path d="M4 8h3.5L9 5.5h6L16.5 8H20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
    tree: '<path d="M12 21v-5"/><path d="M12 3c3.5 0 6 2.6 6 5.6 0 1-.3 1.9-.8 2.6 1 .7 1.6 1.8 1.6 3 0 2-1.8 3.8-4 3.8H9.2c-2.2 0-4-1.7-4-3.8 0-1.2.6-2.3 1.6-3-.5-.7-.8-1.6-.8-2.6C6 5.6 8.5 3 12 3z"/>',
    music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    drop: '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/>',
    keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 9.5h.01M9.5 9.5h.01M13 9.5h.01M16.5 9.5h.01M18 13h.01M6 13h.01M8 15.5h8"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.5" r="1.8"/><path d="m4 17.5 5-5 4 4 2.5-2.5 4.5 4.5"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>'
  };
  window.UI_ICONS = Object.keys(P);
  window.iconSvg = function (name, cls) {
    const body = P[name];
    if (!body) return '';
    return `<svg class="ui-ic${cls ? ' ' + cls : ''}" data-ic="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
  };

  // Yon menyu bandlari → ikonka (mobile-route.js ham shu ikonkalarni yo'l bekatlarida ko'rsatadi)
  const NAV_ICONS = {
    navHome: 'home', navPlay: 'board', navTea: 'tea', navFoot: 'ball', navLeaderboard: 'medal', navLive: 'tv',
    navMessages: 'chat', navClubs: 'shield', navLeagues: 'trophy', navWar: 'flag', navCaravan: 'camel',
    navLibrary: 'books', navAdmin: 'admin', navMore: 'menu'
  };
  window.NAV_ICONS = NAV_ICONS;

  // --- 2-bosqich: sahifalardagi emojilar → o'z ikonkalarimiz (avtomatik, MutationObserver) ---
  // Kalit — emoji (U+FE0F siz). Qiymat — ikonka nomi yoki [nom, qo'shimcha klass]. Xaritada yo'q emoji o'zgarmaydi
  // (Karvon shaharlari ramzlari, chat yuzchalari, bayroqlar — ataylab).
  const EMOJI_ICONS = {
    '♟': 'pawn', '🏆': 'trophy', '🤝': 'handshake', '🎉': 'party', '🎊': 'party', '🎆': 'party', '⚔': 'swords', '🤺': 'swords',
    '👍': 'thumbUp', '👎': 'thumbDown', '🐪': 'camel', '🐫': 'camel', '⚡': 'bolt', '📖': 'book', '📕': 'book', '▶': 'play', '◀': 'prev',
    '⏮': 'first', '⏭': 'last', '⏹': 'stop', '🛂': 'passport', '🎲': 'dice', '🎖': 'medal', '🏅': 'medal',
    '🥇': ['medal', 'ic-gold'], '🥈': ['medal', 'ic-silver'], '🥉': ['medal', 'ic-bronze'], '✈': 'send', '🏺': 'vase',
    '⚠': 'warning', '🔗': 'link', '🔍': 'search', '🕵': 'search', '🔥': ['flame', 'ic-fire'], '⏱': 'timer', '⏰': 'timer', '🔔': 'bell',
    '🛡': 'shield', '📚': 'books', '🧵': 'spool', '⭐': ['star', 'ic-gold'], '🌟': ['star', 'ic-gold'], '✨': ['star', 'ic-gold'],
    '👋': 'wave', '🏳': 'flag', '🚩': 'flag', '🏁': 'flag', '🔮': 'crystal', '🎯': 'target', '👑': ['crown', 'ic-gold'], '👥': 'team',
    '🔊': 'volume', '🔈': 'volume', '🔇': 'mute', '🔕': 'mute', '🤫': 'mute', '🌍': 'globe', '🌏': 'globe', '🌎': 'globe', '🌐': 'globe',
    '⏳': 'hourglass', '📲': 'phone', '📱': 'phone', '📳': 'phone', '🍵': 'tea', '🫖': 'tea', '⚽': 'ball', '📜': 'scroll',
    '💬': 'chat', '🗣': 'chat', '🎨': 'palette', '👤': 'user', '🎙': 'mic', '💡': 'bulb', '📺': 'tv', '🖥': 'monitor', '🚫': 'ban', '⛔': 'ban',
    '📤': 'share', '🗑': 'trash', '🏛': 'museum', '📣': 'megaphone', '🐞': 'bug', '📊': 'chart', '📈': 'chart', '🎁': 'gift',
    '🔄': 'refresh', '🔁': 'refresh', '💾': 'save', '🎬': 'film', '🗺': 'map', '✅': ['check', 'ic-ok'], '❌': ['cross', 'ic-bad'],
    '📝': 'pencil', '✏': 'pencil', '⬇': 'download', '📥': 'download', '👁': 'eye', '⚙': 'gear', '↗': 'external', '🔒': 'lock',
    '🎮': 'gamepad', '👾': 'gamepad', '📄': 'doc', '📋': 'doc', '📰': 'doc', '🌸': 'flower', '🌷': 'flower', '✉': 'mail', '↔': 'swap',
    '🚀': 'rocket', '🧭': 'compass', '↩': 'undo', '🤖': 'robot', '🌱': 'sprout', '⚖': 'scale', '❓': 'help', '🧹': 'broom',
    '🪑': 'chair', '📌': 'pin', '🌙': 'moon', '📅': 'calendar', '📷': 'camera', '🏡': 'home', '🏠': 'home', '🌳': 'tree',
    '🎸': 'music', '🎺': 'music', '🎶': 'music', '🥁': 'music', '🎐': 'music', '💧': 'drop', '⌨': 'keyboard', '🖼': 'image',
    '💪': 'bolt', '🧩': 'board', '🔎': 'search', '🥂': 'tea', '✍': 'pencil', '🍴': 'swords', '💥': 'bolt'
  };
  window.EMOJI_ICONS = EMOJI_ICONS;
  // Tegilmaydigan joylar: foydalanuvchi matni (chatlar, emoji tanlash oynasi), matn maydonlari, ro'yxatlar, SVG ichi
  const SKIP = 'input, textarea, select, option, script, style, svg, code, pre, [contenteditable="true"], .no-ui-ic, '
    + '.msg-bubble, .msg-picker, .gc-msg, .club-chat-message, .lv-chat-list, .tm-chat-list, .sticker, '
    + '.cv-me-ico, .cv-dot, .cv-lcity';
  const keys = Object.keys(EMOJI_ICONS).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const RE = new RegExp('(' + keys.join('|') + ')\\uFE0F?', 'gu');
  const TEST = new RegExp('(' + keys.join('|') + ')', 'u');
  function iconNode(emoji) {
    const v = EMOJI_ICONS[emoji];
    const [name, cls] = Array.isArray(v) ? v : [v, ''];
    const t = document.createElement('template');
    t.innerHTML = window.iconSvg(name, 'ic-emoji' + (cls ? ' ' + cls : ''));
    return t.content.firstChild;
  }
  function iconizeText(node) {
    const text = node.nodeValue;
    if (!text || !TEST.test(text)) return;
    const parent = node.parentNode;
    if (!parent || (parent.closest && parent.closest(SKIP))) return;
    const frag = document.createDocumentFragment();
    let last = 0;
    RE.lastIndex = 0;
    for (let m; (m = RE.exec(text));) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      frag.appendChild(iconNode(m[1]));
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    parent.replaceChild(frag, node);
  }
  window.iconizeEmojis = function (root) {
    if (!root) return;
    if (root.nodeType === 3) return iconizeText(root);
    if (root.nodeType !== 1 || (root.closest && root.closest(SKIP))) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (TEST.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT)
    });
    const list = [];
    for (let n; (n = walker.nextNode());) list.push(n);
    list.forEach(iconizeText);
  };
  // Keyin chiziladigan har qanday kontent (sahifalar, oynalar, toastlar) — kuzatuvchi bilan; bir kadrda bir marta
  let pending = new Set(), scheduled = false;
  function flush() {
    scheduled = false;
    const nodes = [...pending];
    pending = new Set();
    nodes.forEach((n) => { if (n.isConnected) window.iconizeEmojis(n); });
  }
  function startObserver() {
    if (!document.body || window.__iconObserver) return;
    window.iconizeEmojis(document.body);
    window.__iconObserver = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'characterData') { if (TEST.test(m.target.nodeValue || '')) pending.add(m.target); continue; }
        m.addedNodes.forEach((n) => { if (n.nodeType === 1 ? TEST.test(n.textContent || '') : (n.nodeType === 3 && TEST.test(n.nodeValue || ''))) pending.add(n); });
      }
      if (pending.size && !scheduled) { scheduled = true; requestAnimationFrame(flush); }
    });
    window.__iconObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  // Elementning boshidagi emoji matnini ikonka bilan almashtirish (ichidagi boshqa elementlar — masalan, nishon — qoladi)
  function swapLead(el, name) {
    if (!el || el.querySelector(':scope > .ui-ic')) return;
    const first = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    if (first) first.textContent = first.textContent.replace(/^\s*\S+\s*/u, '');
    el.insertAdjacentHTML('afterbegin', window.iconSvg(name));
  }
  window.applyUiIcons = function () {
    for (const [id, name] of Object.entries(NAV_ICONS)) {
      const ic = document.querySelector('#' + id + ' .icon');
      if (ic && !ic.querySelector('.ui-ic')) { ic.innerHTML = window.iconSvg(name); ic.dataset.ic = name; }
    }
    swapLead(document.getElementById('topSettingsBtn'), 'gear');
    swapLead(document.getElementById('notifBell'), 'bell');
    document.querySelectorAll('.tea-home-btn:not(.inv-home-btn)').forEach((b) => swapLead(b, 'tea'));
    document.querySelectorAll('.inv-home-btn').forEach((b) => swapLead(b, 'link'));
  };
  window.applyUiIcons();
  document.addEventListener('DOMContentLoaded', () => { window.applyUiIcons(); startObserver(); });
  if (document.readyState !== 'loading') startObserver();
})();
