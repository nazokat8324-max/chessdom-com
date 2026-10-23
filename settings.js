// "Sozlamalar" sahifasi: bo'limlar menyusi + kartalar, jonli ko'rinish (namuna taxta), pastdagi "Saqlash" paneli.
// O'zgarishlar darhol oldindan ko'rsatiladi, lekin "Saqlash" bosilmaguncha yozilmaydi (boshqa sahifaga o'tilsa bekor bo'ladi).
// localStorage: justChessSettings; serverda: davlat (users.country) va maxfiylik (users.privacy).
(function () {
  const DEFAULTS = {
    country: 'uz', language: 'en', soundEnabled: true, volume: 0.8,
    siteTheme: 'turquoise', showCoords: true, pieceSet: 'wikipedia',
    showHints: true, showLastMove: true, autoQueen: false, confirmResign: true,
    quickClock: [300, 0], quickRated: true, vibration: true
  };
  const CLOCKS = [[60, 0], [60, 1], [120, 1], [180, 0], [180, 2], [300, 0], [600, 0], [900, 10], [1800, 0]];
  const LANGS = [['uz', 'uz', "O'zbekcha"], ['en', 'gb', 'English'], ['ru', 'ru', 'Русский'], ['es', 'es', 'Español'], ['de', 'de', 'Deutsch'], ['fr', 'fr', 'Français']];
  const THEMES = [['turquoise', 'themeTurquoise', 'Firuza'], ['ocean', 'themeOcean', 'Okean'], ['amethyst', 'themeAmethyst', 'Ametist'], ['sunset', 'themeSunset', 'Shafaq'], ['jade', 'themeJade', 'Zumrad'], ['ruby', 'themeRuby', 'Yoqut'], ['rose', 'themeRose', 'Atirgul'], ['gold', 'themeGold', 'Oltin'], ['lapis', 'themeLapis', 'Lojuvard'], ['graphite', 'themeGraphite', 'Grafit']];
  // Faqat erkin litsenziyali to'plamlar (board.js PIECE_SETS); mualliflari /mualliflar sahifasida
  const PIECES = [['wikipedia', 'Klassik'], ['cburnett', 'Cburnett'], ['merida', 'Merida']];
  // Namuna pozitsiya (Italyan o'yini): oxirgi yurish Bc4, tanlangan ot g1 va uning yurishlari
  const PREVIEW_FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR';

  const st = { saved: null, draft: null, privacy: null, privacyDraft: null, section: 'general' };

  const esc = (v) => {
    const div = document.createElement('div');
    div.textContent = (v === null || v === undefined) ? '' : String(v);
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  const root = () => document.getElementById('settingsRoot');
  const readSaved = () => {
    let s = {};
    try { s = JSON.parse(localStorage.getItem('justChessSettings') || '{}'); } catch (e) {}
    const merged = { ...DEFAULTS, ...s };
    if (!Array.isArray(merged.quickClock)) merged.quickClock = DEFAULTS.quickClock;
    // Olib tashlangan mavzu (masalan, eski "emerald") — standart Firuza
    if (!THEMES.some(t => t[0] === merged.siteTheme)) merged.siteTheme = DEFAULTS.siteTheme;
    return merged;
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const isDirty = () => !same(st.draft, st.saved) || (st.privacy && !same(st.privacy, st.privacyDraft));
  const clockLabel = ([i, inc]) => `${i / 60}+${inc}`;
  const modeOf = ([i, inc]) => { const e = i + 40 * inc; return e < 180 ? 'bullet' : (e < 480 ? 'blitz' : 'rapid'); };

  // --- Qo'llash (oldindan ko'rish ham, saqlangan qiymatlar ham shu yerdan) ---
  function applyAll(s) {
    if (typeof window.applySiteTheme === 'function') window.applySiteTheme(s.siteTheme);
    if (typeof window.applyCoords === 'function') window.applyCoords(s.showCoords !== false);
    if (typeof window.applySoundToggle === 'function') window.applySoundToggle(s.soundEnabled !== false);
    if (typeof window.setSoundVolume === 'function') window.setSoundVolume(typeof s.volume === 'number' ? s.volume : 0.8);
    if (typeof window.applyPieceSet === 'function') window.applyPieceSet(s.pieceSet);
    if (typeof window.applyBoardPrefs === 'function') window.applyBoardPrefs({ showHints: s.showHints, showLastMove: s.showLastMove, autoQueen: s.autoQueen, confirmResign: s.confirmResign });
  }

  // "Onlayn o'ynash" uchun standart vaqt va reyting turi (o'yin sahifasidagi tanlov)
  function applyQuickPlay(s) {
    if (typeof window.isGameInProgress === 'function' && window.isGameInProgress()) return;
    const [sec, inc] = s.quickClock;
    const btn = [...document.querySelectorAll('.time-btn')].find(b => {
      const m = (b.getAttribute('onclick') || '').match(/setGameTime\((\d+),\s*this(?:,\s*(\d+))?\)/);
      return m && Number(m[1]) === sec && Number(m[2] || 0) === inc;
    });
    if (typeof setGameTime === 'function') setGameTime(sec, btn || null, inc);
    const rated = document.getElementById('ratedToggle');
    if (rated) { rated.checked = s.quickRated !== false; rated.dispatchEvent(new Event('change')); }
  }

  // --- Bo'limlar ---
  const sections = [
    ['general', '🌐', 'setNavGeneral', 'Umumiy'],
    ['board', '♟️', 'setNavBoard', 'Taxta va dizayn'],
    ['game', '🎮', 'setNavGame', "O'yin"],
    ['sound', '🔔', 'setNavSound', 'Ovoz va bildirishnomalar'],
    ['privacy', '🔒', 'setNavPrivacy', 'Maxfiylik'],
    ['account', '👤', 'setNavAccount', 'Hisob']
  ];

  const toggle = (key, title, hint) => `
    <label class="set-row set-toggle">
      <span><b>${esc(title)}</b>${hint ? `<small>${esc(hint)}</small>` : ''}</span>
      <input type="checkbox" data-bool="${key}" ${st.draft[key] ? 'checked' : ''}><i class="set-switch"></i>
    </label>`;

  function generalHtml() {
    const d = st.draft;
    const countries = (typeof allCountries !== 'undefined' ? allCountries : []).map(c => [c.code, typeof window.countryName === 'function' ? window.countryName(c.name, c.code) : c.name]);
    countries.sort((a, b) => a[1].localeCompare(b[1]));
    return `
      <div class="set-card">
        <h3>${esc(tx('setLanguageTitle', 'Interfeys tili'))}</h3>
        <p class="set-hint">${esc(tx('setLanguageHint', "Til darhol almashadi"))}</p>
        <div class="set-langs">${LANGS.map(([code, flag, name]) => `
          <button class="set-lang${(window.currentLang || d.language) === code ? ' active' : ''}" data-lang="${code}">
            <img src="https://flagcdn.com/w40/${flag}.png" alt=""><span>${esc(name)}</span>
          </button>`).join('')}</div>
      </div>
      <div class="set-card">
        <h3>${esc(tx('setCountryTitle', 'Davlatingiz'))}</h3>
        <p class="set-hint">${esc(tx('setCountryHint', "Bayrog'ingiz o'yinlarda, reytingda va profilingizda ko'rinadi"))}</p>
        <div class="set-country">
          <img id="setCountryFlag" src="https://flagcdn.com/w80/${esc(d.country)}.png" alt="">
          <select id="setCountry" class="set-select">${countries.map(([code, name]) => `<option value="${esc(code)}"${code === d.country ? ' selected' : ''}>${esc(name)}</option>`).join('')}</select>
        </div>
      </div>`;
  }

  function previewHtml() {
    const d = st.draft;
    const rows = PREVIEW_FEN.split('/');
    const files = 'abcdefgh';
    let html = '';
    rows.forEach((row, r) => {
      let f = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) {
          for (let k = 0; k < Number(ch); k++) html += cell(r, f++, null);
        } else {
          html += cell(r, f++, (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase());
        }
      }
    });
    function cell(r, f, piece) {
      const sq = files[f] + (8 - r);
      const cls = ['set-sq', (r + f) % 2 ? 'd' : 'l'];
      if (d.showLastMove && (sq === 'f1' || sq === 'c4')) cls.push('last');
      if (d.showHints && sq === 'g1') cls.push('sel');
      if (d.showHints && (sq === 'f3' || sq === 'h3' || sq === 'e2')) cls.push('hint');
      const coordRank = d.showCoords && f === 0 ? `<em class="rk">${8 - r}</em>` : '';
      const coordFile = d.showCoords && r === 7 ? `<em class="fl">${files[f]}</em>` : '';
      return `<span class="${cls.join(' ')}">${piece ? `<img src="${esc(window.pieceUrl ? window.pieceUrl(piece, d.pieceSet) : '')}" alt="">` : ''}${coordRank}${coordFile}</span>`;
    }
    return `<div class="set-preview">${html}</div>`;
  }

  function boardHtml() {
    const d = st.draft;
    return `
      <div class="set-card set-board-card">
        <div class="set-board-grid">
          <div>
            <h3>${esc(tx('setThemeTitle', 'Sayt rangi'))}</h3>
            <div class="set-themes">${THEMES.map(([id, key, fb]) => `
              <button class="set-theme t-${id}${d.siteTheme === id ? ' active' : ''}" data-theme-pick="${id}"><i></i><span>${esc(tx(key, fb))}</span></button>`).join('')}</div>
            <h3 class="mt">${esc(tx('setPiecesTitle', "Donalar to'plami"))}</h3>
            <div class="set-pieces">${PIECES.map(([id, name]) => `
              <button class="set-piece${d.pieceSet === id ? ' active' : ''}" data-piece-set="${id}">
                <img src="${esc(window.pieceUrl ? window.pieceUrl('wN', id) : '')}" alt=""><img src="${esc(window.pieceUrl ? window.pieceUrl('bQ', id) : '')}" alt=""><span>${esc(name)}</span>
              </button>`).join('')}</div>
          </div>
          <div class="set-preview-wrap">
            <span class="set-preview-label">${esc(tx('setPreview', "Ko'rinishi"))}</span>
            ${previewHtml()}
          </div>
        </div>
      </div>
      <div class="set-card">
        ${toggle('showCoords', tx('setCoords', 'Koordinatalar'), tx('setCoordsHint', "Taxta chetida a–h va 1–8 belgilari"))}
        ${toggle('showHints', tx('setHints', "Yurish nuqtalari"), tx('setHintsHint', "Dona tanlanganda yura oladigan kataklar ko'rinadi"))}
        ${toggle('showLastMove', tx('setLastMove', 'Oxirgi yurishni belgilash'), tx('setLastMoveHint', "Oxirgi yurilgan ikki katak sariq rangda"))}
      </div>`;
  }

  function gameHtml() {
    const d = st.draft;
    const groups = [['bullet', '🔥 Bullet'], ['blitz', '⚡ Blitz'], ['rapid', '⏱️ Rapid']];
    return `
      <div class="set-card">
        <h3>${esc(tx('setQuickTitle', "«Onlayn o'ynash» uchun standart vaqt"))}</h3>
        <p class="set-hint">${esc(tx('setQuickHint', "O'yin sahifasida shu vaqt nazorati oldindan tanlangan bo'ladi"))}</p>
        <div class="set-clocks">${groups.map(([mode, label]) => `
          <div class="set-clock-group"><span>${esc(label)}</span>
            ${CLOCKS.filter(c => modeOf(c) === mode).map(c => `<button class="set-clock${same(c, d.quickClock) ? ' active' : ''}" data-clock="${c.join(',')}">${clockLabel(c)}</button>`).join('')}
          </div>`).join('')}</div>
        ${toggle('quickRated', tx('setQuickRated', "Reytingli o'yin"), tx('setQuickRatedHint', "O'chirilsa, standart o'yinlar reytingga ta'sir qilmaydi"))}
      </div>
      <div class="set-card">
        ${toggle('autoQueen', tx('setAutoQueen', "Piyoda doim farzinga aylansin"), tx('setAutoQueenHint', "Dona tanlash oynasi chiqmaydi"))}
        ${toggle('confirmResign', tx('setConfirmResign', "Taslim bo'lishdan oldin so'rash"), tx('setConfirmResignHint', "Tasodifan bosib yuborishdan saqlaydi"))}
      </div>`;
  }

  function soundHtml() {
    const d = st.draft;
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    const permText = { granted: tx('setNotifOn', 'Yoqilgan ✓'), denied: tx('setNotifBlocked', "Brauzerda bloklangan — sayt sozlamalaridan ruxsat bering"), default: tx('setNotifOff', "O'chiq"), unsupported: tx('setNotifUnsupported', "Bu brauzer qo'llab-quvvatlamaydi") }[perm];
    return `
      <div class="set-card">
        ${toggle('soundEnabled', tx('setSound', 'Ovoz'), tx('setSoundHint', "Yurish, olish, shax va o'yin yakuni ovozlari"))}
        <div class="set-row set-volume${d.soundEnabled ? '' : ' disabled'}">
          <span><b>${esc(tx('setVolume', 'Ovoz balandligi'))}</b></span>
          <div class="set-range"><input type="range" id="setVolume" min="0" max="100" value="${Math.round(d.volume * 100)}"><output id="setVolumeVal">${Math.round(d.volume * 100)}%</output></div>
          <button class="set-mini" data-test-sound="1">▶ ${esc(tx('setTestSound', 'Sinash'))}</button>
        </div>
        ${toggle('vibration', tx('setVibration', 'Tebranish'), tx('setVibrationHint', "Telefonda raqib yurganda, o'yin topilganda va vaqt kam qolganda titraydi (Android)"))}
      </div>
      <div class="set-card">
        <div class="set-row">
          <span><b>${esc(tx('setNotif', 'Brauzer bildirishnomalari'))}</b><small>${esc(tx('setNotifHint', "Turnir boshlanishi, o'yinga chaqiruv va xabarlar — boshqa oynada tursangiz ham"))}</small></span>
          ${perm === 'default' ? `<button class="set-mini accent" data-notif="1">${esc(tx('setNotifEnable', 'Yoqish'))}</button>` : `<span class="set-status ${perm}">${esc(permText)}</span>`}
        </div>
      </div>
      <div class="set-card set-push" id="setPushCard"></div>
      <div class="set-card set-push" id="setTgCard" style="display:none"></div>`;
  }

  function privacyHtml() {
    if (!window.currentUser) return `<div class="set-card"><p class="set-hint">${esc(tx('errLoginRequired', 'Avval tizimga kirishingiz kerak!'))}</p></div>`;
    if (!st.privacyDraft) return `<div class="set-card"><p class="set-hint">${esc(tx('loadingText', 'Yuklanmoqda...'))}</p></div>`;
    const p = st.privacyDraft;
    const seg = (key, opts) => `<div class="set-seg">${opts.map(([v, k, fb]) => `<button class="${p[key] === v ? 'active' : ''}" data-privacy="${key}" data-value="${v}">${esc(tx(k, fb))}</button>`).join('')}</div>`;
    return `
      <div class="set-card">
        <div class="set-row col">
          <span><b>${esc(tx('setPrivMessages', 'Kim menga xabar yoza oladi'))}</b></span>
          ${seg('messages', [['all', 'setPrivAll', 'Hamma'], ['friends', 'setPrivFriends', "Faqat do'stlar"]])}
        </div>
        <div class="set-row col">
          <span><b>${esc(tx('setPrivChallenges', "Kim meni o'yinga chaqira oladi"))}</b></span>
          ${seg('challenges', [['all', 'setPrivAll', 'Hamma'], ['friends', 'setPrivFriends', "Faqat do'stlar"], ['none', 'setPrivNone', 'Hech kim']])}
        </div>
      </div>
      <div class="set-card">
        <h3>${esc(tx('blkListTitle', "Bloklangan o'yinchilar"))}</h3>
        <p class="set-hint">${esc(tx('blkListHint', "Ular sizga yozolmaydi, o'yinga chaqira olmaydi va siz bilan juftlanmaydi"))}</p>
        <div id="setBlockedList"></div>
      </div>`;
  }

  // Akkauntni butunlay o'chirish (POST /api/users/me/delete): parol + nomni qayta yozish
  async function deleteAccount(e) {
    e.preventDefault();
    const msg = document.getElementById('setDelMsg');
    const btn = document.getElementById('setDelSubmit');
    const password = document.getElementById('setDelPass').value;
    const confirmName = document.getElementById('setDelName').value.trim();
    const u = window.currentUser;
    const show = (text) => { if (msg) { msg.textContent = text; msg.className = 'set-msg err'; } };
    if (!u) return;
    if (!password) return show(tx('setDeleteNeedPass', 'Parolni kiriting'));
    if (confirmName !== u.username) return show(tx('setDeleteNameMismatch', "Foydalanuvchi nomi mos kelmadi"));
    if (!confirm(tx('setDeleteFinal', "Akkauntingiz butunlay o'chiriladi. Davom etasizmi?"))) return;
    btn.disabled = true;
    const d = await fetch('/api/users/me/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window.authToken }, body: JSON.stringify({ password, confirm: confirmName }) })
      .then(r => r.json()).catch(() => null);
    btn.disabled = false;
    if (!d || !d.success) return show(tServer(d && d.message) || tx('errGeneric', 'Xatolik yuz berdi!'));
    // Sessiya tozalanadi va kirish sahifasi ochiladi
    window.currentUser = null;
    window.authToken = null;
    ['justChessCurrentUser', 'justChessAuthToken', 'justChessStatsByMode', 'justChessGuestStats'].forEach(k => { try { localStorage.removeItem(k); } catch (err) {} });
    window.stats = { wins: 0, losses: 0, draws: 0 };
    if (typeof window.updateAuthHeaderUI === 'function') window.updateAuthHeaderUI();
    if (typeof window.switchView === 'function') window.switchView('home');
    if (typeof window.showAuthGate === 'function') window.showAuthGate('signup');
    showToast(tx('setDeleteDone', "Akkauntingiz o'chirildi. Xayr! ♟"), 'success', 6000);
  }

  function accountHtml() {
    const u = window.currentUser;
    if (!u) return '';
    const email = u.email && !/@justchess\.local$/i.test(u.email) ? u.email : null;
    return `
      <div class="set-card">
        <div class="set-row">
          <span><b>${esc(tx('setUsername', 'Foydalanuvchi nomi'))}</b><small>${esc(u.username)}</small></span>
          <button class="set-mini" data-go-profile="1">${esc(tx('setOpenProfile', 'Profilni ochish'))}</button>
        </div>
        <div class="set-row">
          <span><b>Email</b><small class="${email ? '' : 'muted'}">${esc(email || tx('profEmailNone', 'Biriktirilmagan'))}</small></span>
          <button class="set-mini" data-email="1">${esc(tx('profEmailEdit', "O'zgartirish"))}</button>
        </div>
      </div>
      <form class="set-card" id="setPasswordForm" autocomplete="off">
        <h3>${esc(tx('setPasswordTitle', "Parolni o'zgartirish"))}</h3>
        <div class="set-pass">
          <input type="password" id="setPassCurrent" class="set-input" placeholder="${esc(tx('setPassCurrent', 'Joriy parol'))}" autocomplete="current-password">
          <input type="password" id="setPassNew" class="set-input" placeholder="${esc(tx('authNewPassword', 'Yangi parol'))}" autocomplete="new-password">
          <input type="password" id="setPassNew2" class="set-input" placeholder="${esc(tx('authRepeatPassword', 'Parolni takrorlang'))}" autocomplete="new-password">
        </div>
        <div class="set-pass-actions"><span id="setPassMsg" class="set-msg"></span><button type="submit" class="set-mini accent">${esc(tx('setPassSubmit', "Parolni o'zgartirish"))}</button></div>
      </form>
      <div class="set-card">
        <div class="set-row">
          <span><b>📜 ${esc(tx('setLegal', 'Hujjatlar'))}</b><small>${esc(tx('setLegalHint', "Saytdan foydalanish qoidalari va ma'lumotlaringiz qanday saqlanishi"))}</small></span>
          <span class="set-legal"><a href="/shartlar" target="_blank" rel="noopener">${esc(tx('legalTerms', 'Foydalanish shartlari'))}</a><a href="/maxfiylik" target="_blank" rel="noopener">${esc(tx('legalPrivacy', 'Maxfiylik siyosati'))}</a><a href="/mualliflar" target="_blank" rel="noopener">${esc(tx('legalCredits', 'Mualliflar va litsenziyalar'))}</a></span>
        </div>
      </div>
      <div class="set-card set-danger">
        <div class="set-row">
          <span><b>${esc(tx('setLogout', 'Hisobdan chiqish'))}</b><small>${esc(tx('setLogoutHint', "Shu qurilmada tizimdan chiqasiz"))}</small></span>
          <button class="set-mini danger" data-logout="1">${esc(tx('btnLogout', 'Chiqish'))}</button>
        </div>
        <div class="set-row">
          <span><b>🗑 ${esc(tx('setDelete', "Akkauntni o'chirish"))}</b><small>${esc(tx('setDeleteHint', "Hisobingiz va barcha shaxsiy ma'lumotlaringiz butunlay o'chiriladi. Buni qaytarib bo'lmaydi."))}</small></span>
          <button class="set-mini danger" data-del-open="1">${esc(tx('setDeleteOpen', "O'chirish…"))}</button>
        </div>
        <form class="set-del-form" id="setDeleteForm" autocomplete="off" hidden>
          <p>${esc(tx('setDeleteWhat', "O'chiriladi: profil, rasm, o'yinlar tarixi, xabarlar, do'stlar, bildirishnomalar, yutuqlar, izohlar. Raqiblaringizning tarixida o'yinlar anonim nom bilan qoladi."))}</p>
          <input type="password" id="setDelPass" class="set-input" placeholder="${esc(tx('setPassCurrent', 'Joriy parol'))}" autocomplete="current-password">
          <input type="text" id="setDelName" class="set-input" placeholder="${esc(tx('setDeleteConfirm', 'Tasdiqlash uchun foydalanuvchi nomingizni yozing: {{name}}', { name: u.username }))}" autocomplete="off">
          <div class="set-pass-actions"><span id="setDelMsg" class="set-msg"></span><button type="submit" class="set-mini danger" id="setDelSubmit">${esc(tx('setDeleteSubmit', "Butunlay o'chirish"))}</button></div>
        </form>
      </div>`;
  }

  const bodies = { general: generalHtml, board: boardHtml, game: gameHtml, sound: soundHtml, privacy: privacyHtml, account: accountHtml };

  function render() {
    const el = root();
    if (!el || !st.draft) return;
    const scroll = el.querySelector('.set-main') ? el.querySelector('.set-main').scrollTop : 0;
    const navs = sections.filter(([id]) => id !== 'account' || window.currentUser);
    el.innerHTML = `
      <header class="set-head">
        <div><h1>${esc(tx('settingsTitle', 'Sozlamalar'))}</h1><p>${esc(tx('settingsSubtitle', 'Sizning shaxsiy afzalliklaringiz'))}</p></div>
        <button class="set-reset" data-reset="1">↺ ${esc(tx('setResetAll', 'Standartga qaytarish'))}</button>
      </header>
      <div class="set-layout">
        <nav class="set-nav">${navs.map(([id, icon, key, fb]) => `<button class="${st.section === id ? 'active' : ''}" data-section="${id}"><span>${icon}</span>${esc(tx(key, fb))}</button>`).join('')}</nav>
        <section class="set-main">
          <h2 class="set-title">${(navs.find(s => s[0] === st.section) || navs[0])[1]} ${esc(tx((navs.find(s => s[0] === st.section) || navs[0])[2], ''))}</h2>
          ${bodies[st.section] ? bodies[st.section]() : ''}
        </section>
      </div>
      <div class="set-bar${isDirty() ? ' show' : ''}">
        <span>● ${esc(tx('settingsUnsaved', "Saqlanmagan o'zgarishlar bor"))}</span>
        <button class="set-mini" data-discard="1">${esc(tx('setDiscard', 'Bekor qilish'))}</button>
        <button class="set-mini accent" data-save="1">💾 ${esc(tx('settingsSaveBtn', 'Saqlash'))}</button>
      </div>`;
    const main = el.querySelector('.set-main');
    if (main) main.scrollTop = scroll;
    bind(el);
    const blocked = el.querySelector('#setBlockedList');
    if (blocked && typeof window.loadBlockedList === 'function') window.loadBlockedList(blocked);
    // 📲 Push-bildirishnomalar kartasi (pwa.js)
    const pushCard = el.querySelector('#setPushCard');
    if (pushCard && typeof window.renderPushSettings === 'function') window.renderPushSettings(pushCard);
    const tgCard = el.querySelector('#setTgCard');
    if (tgCard && typeof window.renderTelegramSettings === 'function') window.renderTelegramSettings(tgCard);
  }

  function change(patch) {
    st.draft = { ...st.draft, ...patch };
    applyAll(st.draft);
    window.settingsDirty = isDirty();
    render();
  }

  function bind(el) {
    el.querySelectorAll('[data-section]').forEach(b => b.addEventListener('click', () => { st.section = b.dataset.section; render(); }));
    el.querySelectorAll('[data-bool]').forEach(i => i.addEventListener('change', () => change({ [i.dataset.bool]: i.checked })));
    el.querySelectorAll('[data-theme-pick]').forEach(b => b.addEventListener('click', () => change({ siteTheme: b.dataset.themePick })));
    el.querySelectorAll('[data-piece-set]').forEach(b => b.addEventListener('click', () => change({ pieceSet: b.dataset.pieceSet })));
    el.querySelectorAll('[data-clock]').forEach(b => b.addEventListener('click', () => change({ quickClock: b.dataset.clock.split(',').map(Number) })));
    el.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => {
      const lang = b.dataset.lang;
      if (typeof window.changeLanguage === 'function') window.changeLanguage(lang);
      // Til darhol saqlanadi (boshqa joylarda ham shunday)
      st.saved = { ...st.saved, language: lang };
      st.draft = { ...st.draft, language: lang };
      const stored = readSaved();
      localStorage.setItem('justChessSettings', JSON.stringify({ ...stored, language: lang }));
      setTimeout(render, 50);
    }));
    const country = el.querySelector('#setCountry');
    if (country) country.addEventListener('change', () => change({ country: country.value }));
    const vol = el.querySelector('#setVolume');
    if (vol) vol.addEventListener('input', () => {
      st.draft.volume = Number(vol.value) / 100;
      el.querySelector('#setVolumeVal').textContent = vol.value + '%';
      if (typeof window.setSoundVolume === 'function') window.setSoundVolume(st.draft.volume);
      window.settingsDirty = isDirty();
      el.querySelector('.set-bar').classList.toggle('show', isDirty());
    });
    el.querySelectorAll('[data-test-sound]').forEach(b => b.addEventListener('click', () => { if (typeof playSound === 'function') playSound('move'); setTimeout(() => typeof playSound === 'function' && playSound('capture'), 350); }));
    el.querySelectorAll('[data-notif]').forEach(b => b.addEventListener('click', async () => { try { await Notification.requestPermission(); } catch (e) {} render(); }));
    el.querySelectorAll('[data-privacy]').forEach(b => b.addEventListener('click', () => {
      st.privacyDraft = { ...st.privacyDraft, [b.dataset.privacy]: b.dataset.value };
      window.settingsDirty = isDirty();
      render();
    }));
    el.querySelectorAll('[data-go-profile]').forEach(b => b.addEventListener('click', () => window.openProfileModal && window.openProfileModal()));
    el.querySelectorAll('[data-email]').forEach(b => b.addEventListener('click', async () => { if (window.editProfileEmail) { await window.editProfileEmail(); render(); } }));
    el.querySelectorAll('[data-logout]').forEach(b => b.addEventListener('click', () => { if (confirm(tx('setLogoutConfirm', 'Hisobdan chiqasizmi?')) && window.handleLogout) window.handleLogout(); }));
    el.querySelectorAll('[data-del-open]').forEach(b => b.addEventListener('click', () => {
      const f = el.querySelector('#setDeleteForm');
      if (f) { f.hidden = !f.hidden; if (!f.hidden) f.querySelector('#setDelPass').focus(); }
    }));
    const delForm = el.querySelector('#setDeleteForm');
    if (delForm) delForm.addEventListener('submit', deleteAccount);
    el.querySelectorAll('[data-save]').forEach(b => b.addEventListener('click', save));
    el.querySelectorAll('[data-discard]').forEach(b => b.addEventListener('click', () => discard(true)));
    el.querySelectorAll('[data-reset]').forEach(b => b.addEventListener('click', () => {
      st.draft = { ...DEFAULTS, language: st.draft.language, country: st.draft.country };
      if (st.privacyDraft) st.privacyDraft = { messages: 'all', challenges: 'all' };
      applyAll(st.draft);
      window.settingsDirty = isDirty();
      render();
      showToast(tx('settingsResetPending', "Standart qiymatlar qo'yildi — saqlash uchun «Saqlash» tugmasini bosing"), 'info', 5000);
    }));
    const pass = el.querySelector('#setPasswordForm');
    if (pass) pass.addEventListener('submit', changePassword);
  }

  async function save() {
    const countryChanged = st.draft.country !== st.saved.country;
    localStorage.setItem('justChessSettings', JSON.stringify(st.draft));
    st.saved = { ...st.draft };
    if (countryChanged || (window.currentUser && window.currentUser.country !== st.draft.country)) {
      if (typeof window.syncMyCountry === 'function') window.syncMyCountry(st.draft.country);
    }
    if (st.privacy && !same(st.privacy, st.privacyDraft) && window.authToken) {
      try {
        const d = await fetch('/api/users/me/privacy', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + window.authToken }, body: JSON.stringify(st.privacyDraft) }).then(r => r.json());
        if (d.success) { st.privacy = d.privacy; st.privacyDraft = { ...d.privacy }; }
      } catch (e) {
        showToast(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"), 'warning');
      }
    }
    applyQuickPlay(st.saved);
    window.settingsDirty = false;
    render();
    showToast(tx('settingsSavedToast', 'Sozlamalar saqlandi'), 'success');
  }

  function discard(notify) {
    st.draft = { ...st.saved };
    if (st.privacy) st.privacyDraft = { ...st.privacy };
    applyAll(st.saved);
    window.settingsDirty = false;
    render();
    if (notify) showToast(tx('settingsDiscarded', "Saqlanmagan o'zgarishlar bekor qilindi"), 'info');
  }

  async function changePassword(e) {
    e.preventDefault();
    const msg = document.getElementById('setPassMsg');
    const cur = document.getElementById('setPassCurrent').value;
    const n1 = document.getElementById('setPassNew').value.trim();
    const n2 = document.getElementById('setPassNew2').value.trim();
    const show = (text, ok) => { msg.textContent = text; msg.className = 'set-msg ' + (ok ? 'ok' : 'err'); };
    if (n1.length < 6) return show(tx('authPasswordMinError', "Parol kamida 6 ta belgidan iborat bo'lishi kerak"), false);
    if (n1 !== n2) return show(tx('authPasswordMismatch', 'Parollar bir xil emas'), false);
    try {
      const d = await fetch('/api/users/me/password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + window.authToken }, body: JSON.stringify({ current: cur, next: n1 }) }).then(r => r.json());
      show(tServer(d.message) || tx('errGeneric', 'Xatolik yuz berdi!'), !!d.success);
      if (d.success) ['setPassCurrent', 'setPassNew', 'setPassNew2'].forEach(id => { document.getElementById(id).value = ''; });
    } catch (err) {
      show(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"), false);
    }
  }

  async function loadPrivacy() {
    if (!window.authToken) return;
    try {
      const d = await fetch('/api/users/me/privacy', { headers: { 'Authorization': 'Bearer ' + window.authToken } }).then(r => r.json());
      if (d.success) { st.privacy = d.privacy; st.privacyDraft = { ...d.privacy }; render(); }
    } catch (e) {}
  }

  // script.js switchView('settings') chaqiradi
  window.updateSettingsView = function () {
    st.saved = readSaved();
    st.draft = { ...st.saved };
    st.privacy = null;
    st.privacyDraft = null;
    applyAll(st.saved);
    window.settingsDirty = false;
    render();
    loadPrivacy();
  };

  // Boshqa sahifaga o'tilganda saqlanmagan o'zgarishlar bekor bo'ladi
  window.discardSettingsChanges = function () {
    if (!st.draft || !isDirty()) return;
    discard(true);
  };
  window.saveSettings = save;
  window.refreshSettingsView = function () {
    const v = document.getElementById('settingsView');
    if (v && v.classList.contains('active-view')) render();
  };

  document.addEventListener('DOMContentLoaded', () => {
    const s = readSaved();
    applyAll(s);
    setTimeout(() => applyQuickPlay(s), 300);
  });
})();
