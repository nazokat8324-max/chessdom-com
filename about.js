// "ChessDom haqida" — to'liq ekranli sahifa: Sayt haqida, Maqsadimiz, Kelajak rejalari, Sayt tuzilishi
(function () {
  const esc = (v) => {
    const div = document.createElement('div');
    div.textContent = (v === null || v === undefined) ? '' : String(v);
    return div.innerHTML;
  };
  const t = (key, fallback, opts) => (typeof tx === 'function' ? tx(key, fallback, opts) : fallback);

  // Sayt tuzilishi kartalari: bosilganda o'sha bo'limga o'tiladi
  const STRUCTURE = [
    { icon: '♟️', titleKey: 'mPlay', title: "O'yin", textKey: 'infoTechText1', view: 'game' },
    { icon: '🏅', titleKey: 'mLeaderboard', title: 'Reyting', textKey: 'infoTechText2', view: 'leaderboard' },
    { icon: '🛡️', titleKey: 'clubsTitle', title: 'Klublar', textKey: 'infoTechText3', view: 'clubs' },
    { icon: '🏆', titleKey: 'mLeagues', title: 'Ligalar', textKey: 'infoTechText4', view: 'leagues' },
    { icon: '⭐', titleKey: 'mChampions', title: 'Chempionlar', textKey: 'infoTechText5', view: 'champions' },
    { icon: '⚙️', titleKey: 'mSettings', title: 'Sozlamalar', textKey: 'infoTechText6', view: 'settings' }
  ];
  const STATS = [
    { value: 6, labelKey: 'aboutStatLanguages', label: 'til' },
    { value: 190, labelKey: 'aboutStatClubs', label: 'davlat klubi' },
    { value: 6, labelKey: 'aboutStatLeagues', label: "qit'a ligasi" },
    { value: 3, labelKey: 'aboutStatModes', label: 'vaqt rejimi' }
  ];
  const SECTIONS = [
    { id: 'about', titleKey: 'infoAboutTitle', title: 'Sayt haqida', icon: '📖' },
    { id: 'goal', titleKey: 'infoGoalTitle', title: 'Maqsadimiz', icon: '🎯' },
    { id: 'plan', titleKey: 'infoPlanTitle', title: 'Kelajak rejalari', icon: '🚀' },
    { id: 'tech', titleKey: 'infoTechTitle', title: 'Sayt tuzilishi', icon: '🧭' }
  ];

  function render() {
    const root = document.getElementById('aboutPageContent');
    if (!root) return;
    const nav = SECTIONS.map((s, i) => `<button class="ab-nav-btn${i === 0 ? ' active' : ''}" data-target="ab-${s.id}">${s.icon} ${esc(t(s.titleKey, s.title))}</button>`).join('');
    const stats = STATS.map((s, i) => `
      <div class="ab-stat ab-reveal" style="--d:${i * 90}ms">
        <b class="ab-count" data-to="${s.value}">0</b>
        <span>${esc(t(s.labelKey, s.label))}</span>
      </div>`).join('');
    const plans = ['infoPlanItem1', 'infoPlanItem2', 'infoPlanItem3', 'infoPlanItem4'].map((k, i) => `
      <li class="ab-step ab-reveal" style="--d:${i * 120}ms">
        <span class="ab-step-dot">${i + 1}</span>
        <div class="ab-step-card">${esc(t(k, ''))}</div>
      </li>`).join('');
    const cards = STRUCTURE.map((c, i) => `
      <button class="ab-card ab-reveal" style="--d:${i * 80}ms" data-view="${c.view}">
        <span class="ab-card-icon">${c.icon}</span>
        <span class="ab-card-title">${esc(t(c.titleKey, c.title))}</span>
        <span class="ab-card-text">${esc(t(c.textKey, ''))}</span>
        <span class="ab-card-go">${esc(t('aboutGoTo', "O'tish"))} →</span>
      </button>`).join('');

    root.innerHTML = `
      <header class="ab-topbar">
        <button class="ab-back" onclick="window.closeAboutPage()">← ${esc(t('clubDetailBack', 'Orqaga'))}</button>
        <div class="ab-logo">👑 <span>Chess<b>Dom</b></span></div>
      </header>

      <section class="ab-hero">
        <div class="ab-hero-pieces" aria-hidden="true">
          <span style="--x:8%;--y:18%;--s:84px;--t:9s">♞</span>
          <span style="--x:84%;--y:12%;--s:70px;--t:11s">♜</span>
          <span style="--x:90%;--y:64%;--s:96px;--t:10s">♛</span>
          <span style="--x:4%;--y:70%;--s:64px;--t:12s">♝</span>
          <span style="--x:48%;--y:80%;--s:52px;--t:8s">♟</span>
        </div>
        <span class="ab-hero-chip">✦ ${esc(t('aboutHeroTag', '2026-yildan beri'))}</span>
        <h1 class="ab-hero-title">Chess<span>Dom</span></h1>
        <p class="ab-hero-sub">${esc(t('aboutHeroSubtitle', "Shaxmat strategiyasi va futbol jamoaviyligini birlashtirgan onlayn platforma"))}</p>
        <div class="ab-scroll-hint" aria-hidden="true"><span></span></div>
      </section>

      <nav class="ab-nav">${nav}</nav>

      <section class="ab-section" id="ab-about">
        <h2 class="ab-title ab-reveal">📖 ${esc(t('infoAboutTitle', 'Sayt haqida'))}</h2>
        <div class="ab-about-grid">
          <div class="ab-text ab-reveal">
            <p>${esc(t('infoAboutText1', ''))}</p>
            <p>${esc(t('infoAboutText2', ''))}</p>
          </div>
          <div class="ab-stats">${stats}</div>
        </div>
      </section>

      <section class="ab-section" id="ab-goal">
        <h2 class="ab-title ab-reveal">🎯 ${esc(t('infoGoalTitle', 'Maqsadimiz'))}</h2>
        <div class="ab-duo ab-reveal">
          <div class="ab-duo-side"><span>⚽</span><b>${esc(t('aboutFootball', 'Futbol'))}</b></div>
          <div class="ab-duo-plus">+</div>
          <div class="ab-duo-side"><span>♟️</span><b>${esc(t('aboutChess', 'Shaxmat'))}</b></div>
        </div>
        <div class="ab-quotes">
          ${['infoGoalText1', 'infoGoalText2', 'infoGoalText3'].map((k, i) => `<p class="ab-quote ab-reveal" style="--d:${i * 120}ms">${esc(t(k, ''))}</p>`).join('')}
        </div>
      </section>

      <section class="ab-section" id="ab-plan">
        <h2 class="ab-title ab-reveal">🚀 ${esc(t('infoPlanTitle', 'Kelajak rejalari'))}</h2>
        <p class="ab-lead ab-reveal">${esc(t('infoPlanIntro', ''))}</p>
        <ol class="ab-timeline">${plans}</ol>
      </section>

      <section class="ab-section" id="ab-tech">
        <h2 class="ab-title ab-reveal">🧭 ${esc(t('infoTechTitle', 'Sayt tuzilishi'))}</h2>
        <div class="ab-cards">${cards}</div>
      </section>

      <section class="ab-cta ab-reveal">
        <h2>${esc(t('aboutCtaTitle', 'Birinchi yurish sizdan!'))}</h2>
        <button class="ab-cta-btn" data-view="game">⚡ ${esc(t('aboutCta', "O'ynashni boshlash"))}</button>
      </section>
      <section class="ab-credits">
        <h3>${esc(t('aboutCreditsTitle', 'Foydalanilgan ochiq resurslar'))}</h3>
        <ul>
          <li><b>Noto Emoji</b> — ${esc(t('aboutCreditNoto', 'animatsiyali stikerlar'))} · © Google ·
            <a href="https://googlefonts.github.io/noto-emoji-animation/" target="_blank" rel="noopener">CC BY 4.0</a></li>
          <li><b>lichess.org</b> — ${esc(t('aboutCreditLichess', "donalar to'plamlari va o'yin ovozlari (har biri o'z erkin litsenziyasi ostida)"))} ·
            <a href="https://github.com/lichess-org/lila" target="_blank" rel="noopener">github.com/lichess-org/lila</a></li>
          <li><b>chess.js</b>, <b>chessboard.js</b> — ${esc(t('aboutCreditChess', "shaxmat qoidalari va taxta"))}</li>
          <li><b>flagcdn.com</b> — ${esc(t('aboutCreditFlags', 'davlat bayroqlari'))}</li>
        </ul>
      </section>
      <footer class="ab-footer">© 2026 ChessDom · <a href="/shartlar" target="_blank" rel="noopener">${esc(t('legalTerms', 'Foydalanish shartlari'))}</a> · <a href="/maxfiylik" target="_blank" rel="noopener">${esc(t('legalPrivacy', 'Maxfiylik siyosati'))}</a> · <a href="/mualliflar" target="_blank" rel="noopener">${esc(t('legalCredits', 'Mualliflar va litsenziyalar'))}</a></footer>`;

    bindInteractions(root);
  }

  let observer = null;
  function bindInteractions(root) {
    const scroller = document.getElementById('aboutPage');
    // Bo'limlar menyusi: bosilganda silliq aylantirish
    root.querySelectorAll('.ab-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.target);
        if (target) scroller.scrollTo({ top: target.offsetTop - 70, behavior: 'smooth' });
      });
    });
    // Kartalar va CTA: tegishli bo'limga o'tish
    root.querySelectorAll('[data-view]').forEach(el => {
      el.addEventListener('click', () => {
        window.closeAboutPage();
        if (typeof switchView === 'function') switchView(el.dataset.view);
      });
    });

    if (observer) observer.disconnect();
    if (!('IntersectionObserver' in window)) {
      root.querySelectorAll('.ab-reveal').forEach(el => el.classList.add('in'));
      root.querySelectorAll('.ab-count').forEach(el => { el.textContent = el.dataset.to; });
      return;
    }
    // Ekranga kirganda paydo bo'lish animatsiyasi va raqamlarni sanash
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        entry.target.querySelectorAll('.ab-count').forEach(countUp);
        observer.unobserve(entry.target);
      });
    }, { root: scroller, threshold: 0.15 });
    root.querySelectorAll('.ab-reveal').forEach(el => observer.observe(el));

    // Faol bo'limni menyuda belgilash
    const navBtns = Array.from(root.querySelectorAll('.ab-nav-btn'));
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navBtns.forEach(b => b.classList.toggle('active', b.dataset.target === entry.target.id));
      });
    }, { root: scroller, rootMargin: '-40% 0px -55% 0px' });
    root.querySelectorAll('.ab-section').forEach(s => sectionObserver.observe(s));
  }

  function countUp(el) {
    const to = Number(el.dataset.to) || 0;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.textContent = to; return; }
    const start = performance.now(), dur = 1200;
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  window.openAboutPage = function () {
    const page = document.getElementById('aboutPage');
    if (!page) return;
    render();
    page.style.display = 'block';
    page.scrollTop = 0;
    requestAnimationFrame(() => page.classList.add('open'));
  };

  window.closeAboutPage = function () {
    const page = document.getElementById('aboutPage');
    if (!page) return;
    page.classList.remove('open');
    page.style.display = 'none';
  };

  // Til almashganda ochiq sahifani qayta chizish
  window.refreshAboutPage = function () {
    const page = document.getElementById('aboutPage');
    if (page && page.style.display === 'block') { const top = page.scrollTop; render(); page.scrollTop = top; page.querySelectorAll('.ab-reveal').forEach(el => el.classList.add('in')); page.querySelectorAll('.ab-count').forEach(el => { el.textContent = el.dataset.to; }); }
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const page = document.getElementById('aboutPage');
      if (page && page.style.display === 'block') window.closeAboutPage();
    }
  });
})();
