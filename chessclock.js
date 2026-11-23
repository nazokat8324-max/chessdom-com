// ⏱ Shaxmat soati (2026-11-22, foydalanuvchi so'rovi va tanlovi: internetsiz sahifada ham, saytda ham) — haqiqiy taxtada o'ynayotgan
// ikki kishi uchun: telefon o'rtada, har kim o'z yarmini bosadi (yuqori yarmi 180° burilgan). UMD: sof mantiq (`create`, `fmt`) —
// testlar require qiladi; brauzerda `window.ChessClock.open({t, play, lang})` — butun ekranli oyna (o'z uslubi bilan, sahifaga bog'liq
// emas — offline.html va saytda bir xil). Rang: saytda --accent / --on-accent, offline sahifada firuza. Serverga hech narsa ketmaydi.
// Qoida: yurishni qilgan o'yinchi O'Z tomonini bosadi — uning soati to'xtaydi (+ qo'shimcha soniya), raqibniki yuradi.
// Boshlash: birinchi bosgan tomonning raqibi soati yuradi (odatda qora bosadi — oqning soati boshlanadi).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChessClock = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const PRESETS = [[1, 0], [3, 0], [3, 2], [5, 0], [5, 3], [10, 0], [15, 10], [30, 0]];

  // ---- Sof mantiq. side: 0 — yuqori, 1 — pastki
  function create(minutes, incSec) {
    const base = Math.max(1000, Math.round(minutes * 60000));
    const s = { base, inc: Math.max(0, Math.round(incSec * 1000)), ms: [base, base], moves: [0, 0], running: null, startedAt: 0, paused: false, flagged: null };
    const elapsed = (now) => (s.running !== null && !s.paused ? now - s.startedAt : 0);
    const api = {
      state: s,
      left(side, now) { return Math.max(0, s.ms[side] - (side === s.running ? elapsed(now) : 0)); },
      // Tomon bosildi. Qaytaradi: true — soat almashdi
      press(side, now) {
        if (s.flagged !== null || s.paused || (side !== 0 && side !== 1)) return false;
        if (s.running === null) { s.running = 1 - side; s.startedAt = now; return true; }
        if (s.running !== side) return false; // raqibning tomoni — e'tiborsiz
        if (api.check(now)) return false;
        s.ms[side] = s.ms[side] - (now - s.startedAt) + s.inc;
        s.moves[side]++;
        s.running = 1 - side; s.startedAt = now;
        return true;
      },
      // Vaqt tugadimi (tugasa — o'sha tomon `flagged`, soat to'xtaydi)
      check(now) {
        if (s.running === null || s.paused || s.flagged !== null) return s.flagged !== null;
        if (api.left(s.running, now) > 0) return false;
        s.ms[s.running] = 0; s.flagged = s.running; s.running = null;
        return true;
      },
      pause(now) { if (s.running === null || s.paused || s.flagged !== null) return false; s.ms[s.running] -= now - s.startedAt; s.paused = true; return true; },
      resume(now) { if (!s.paused) return false; s.paused = false; s.startedAt = now; return true; },
      reset() { s.ms = [base, base]; s.moves = [0, 0]; s.running = null; s.paused = false; s.flagged = null; },
    };
    return api;
  }
  // 1:05:09 · 4:59 · 0:09.4 (10 soniyadan kam qolganda o'ndan biri)
  function fmt(ms) {
    ms = Math.max(0, ms);
    if (ms < 10000) { const d = Math.floor(ms / 100); return '0:0' + Math.floor(d / 10) + '.' + (d % 10); }
    const t = Math.ceil(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0');
  }

  // ---- Brauzer: butun ekranli oyna
  const CSS = `
.cc-ov{position:fixed;inset:0;z-index:14000;display:flex;flex-direction:column;background:#0b1114;color:#e8eef0;font-family:inherit;user-select:none;-webkit-user-select:none;touch-action:manipulation}
.cc-ov *{box-sizing:border-box}
.cc-ov:focus{outline:none}
.cc-side{flex:1 1 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;margin:8px;border:0;border-radius:22px;background:#16242a;color:inherit;font:inherit;cursor:pointer;transition:background .15s,color .15s;min-height:0;touch-action:manipulation}
.cc-side.top{transform:rotate(180deg)}
.cc-side.on{background:var(--accent,#01ccd5);color:var(--on-accent,#032326)}
.cc-side.on.low{background:#e5484d;color:#fff}
.cc-side.flag{background:#e5484d;color:#fff}
.cc-side.wait{background:#121c20;color:#93a4aa}
.cc-time{font-size:clamp(56px,17vmin,170px);font-weight:800;font-variant-numeric:tabular-nums;line-height:1;letter-spacing:-1px}
.cc-sub{font-size:15px;font-weight:700;opacity:.8;min-height:1.2em;padding:0 16px;text-align:center}
.cc-bar{display:flex;justify-content:center;align-items:center;gap:10px;padding:2px 8px}
.cc-btn{min-width:48px;height:48px;padding:0 14px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:#16242a;color:#e8eef0;font:inherit;font-size:20px;font-weight:700;cursor:pointer}
.cc-btn:focus-visible,.cc-side:focus-visible,.cc-pre:focus-visible{outline:2px solid var(--accent,#01ccd5);outline-offset:2px}
.cc-setup{flex:1;overflow-y:auto;display:flex;flex-direction:column;align-items:center;gap:14px;padding:22px 16px}
.cc-setup h2{margin:0;font-size:22px}
.cc-setup p{margin:0;color:#93a4aa;text-align:center;max-width:420px;line-height:1.45}
.cc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;width:min(100%,460px)}
.cc-pre{height:56px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:#16242a;color:#e8eef0;font:inherit;font-size:18px;font-weight:800;cursor:pointer}
.cc-pre.on{background:var(--accent,#01ccd5);color:var(--on-accent,#032326);border-color:transparent}
.cc-custom{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:flex-end}
.cc-custom label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:#93a4aa}
.cc-custom input{width:110px;height:44px;padding:0 10px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:#16242a;color:#e8eef0;font:inherit;font-size:18px}
.cc-go{height:52px;padding:0 34px;border:0;border-radius:16px;background:var(--accent,#01ccd5);color:var(--on-accent,#032326);font:inherit;font-size:18px;font-weight:800;cursor:pointer}
.cc-close{position:absolute;top:10px;right:10px}
@media (orientation:landscape){.cc-play{flex-direction:row}.cc-side.top{transform:none}.cc-bar{flex-direction:column}}
@media (prefers-reduced-motion:reduce){.cc-side{transition:none}}`;

  function open(o) {
    o = o || {};
    if (typeof document === 'undefined' || document.querySelector('.cc-ov')) return null;
    const t = (k, fb) => { try { const v = o.t ? o.t(k, fb) : fb; return v && v !== k ? v : fb; } catch (e) { return fb; } };
    const play = (n) => { try { if (o.play) o.play(n); } catch (e) {} };
    const buzz = (p) => { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(p); } catch (e) {} };
    if (!document.getElementById('ccStyle')) { const st = document.createElement('style'); st.id = 'ccStyle'; st.textContent = CSS; document.head.appendChild(st); }
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('justChessClock') || '{}') || {}; } catch (e) {}
    let min = saved.min > 0 ? saved.min : 5, inc = saved.inc >= 0 ? saved.inc : 0;
    const ov = document.createElement('div');
    ov.className = 'cc-ov'; ov.id = 'ccOverlay';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', t('ccTitle', "Shaxmat soati"));
    document.body.appendChild(ov);
    let clock = null, timer = null, lock = null;
    const prevFocus = document.activeElement;

    const wake = async (on) => {
      try {
        if (on && !lock && navigator.wakeLock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); }
        if (!on && lock) { lock.release(); lock = null; }
      } catch (e) { lock = null; }
    };
    function close() {
      if (timer) clearInterval(timer);
      wake(false);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('visibilitychange', onVis);
      ov.remove();
      if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) {}
      if (o.onClose) o.onClose();
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (clock && clock.state.running !== null && !clock.state.paused) { clock.pause(Date.now()); render(); } else close(); return; }
      if (!clock || ov.querySelector('.cc-setup')) return;
      if (e.key === ' ' || e.key === 'Enter') { // Klaviatura: navbatdagi tomon bosgandek
        if (e.target && e.target.closest && e.target.closest('.cc-btn')) return;
        e.preventDefault();
        const s = clock.state;
        tap(s.running === null ? 0 : s.running);
      }
    }
    // Ilova fonga o'tsa — ekran qulfi qayta so'raladi
    function onVis() { if (!document.hidden && clock && clock.state.running !== null && !clock.state.paused) wake(true); }
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('visibilitychange', onVis);

    function setup() {
      if (timer) { clearInterval(timer); timer = null; }
      wake(false);
      clock = null;
      const custom = !PRESETS.some(([m, i]) => m === min && i === inc);
      ov.innerHTML = '<div class="cc-setup"><button type="button" class="cc-btn cc-close" data-cc="close" aria-label="' + t('ccClose', 'Yopish') + '" title="' + t('ccClose', 'Yopish') + '">✕</button>'
        + '<h2>⏱ ' + t('ccTitle', "Shaxmat soati") + '</h2><p>' + t('ccTapHint', "Yurishni qilib, o'z tomoningizni bosing — raqibning soati yuradi.") + '</p>'
        + '<b>' + t('ccPick', "Vaqtni tanlang") + '</b><div class="cc-grid">'
        + PRESETS.map(([m, i]) => '<button type="button" class="cc-pre' + (!custom && m === min && i === inc ? ' on' : '') + '" data-m="' + m + '" data-i="' + i + '">' + m + '+' + i + '</button>').join('')
        + '</div><div class="cc-custom"><label>' + t('ccMin', 'Daqiqa') + '<input type="number" inputmode="decimal" min="0.5" max="180" step="0.5" data-cc="min" value="' + min + '"></label>'
        + '<label>' + t('ccInc', "Qo'shimcha (soniya)") + '<input type="number" inputmode="numeric" min="0" max="60" step="1" data-cc="inc" value="' + inc + '"></label></div>'
        + '<button type="button" class="cc-go" data-cc="go">' + t('ccStart', 'Boshlash') + '</button></div>';
      const mi = ov.querySelector('[data-cc="min"]'), ii = ov.querySelector('[data-cc="inc"]');
      ov.querySelectorAll('.cc-pre').forEach((b) => b.addEventListener('click', () => {
        ov.querySelectorAll('.cc-pre').forEach((x) => x.classList.remove('on')); b.classList.add('on');
        mi.value = b.dataset.m; ii.value = b.dataset.i;
      }));
      const unmark = () => ov.querySelectorAll('.cc-pre').forEach((x) => x.classList.toggle('on', x.dataset.m === mi.value && x.dataset.i === ii.value));
      mi.addEventListener('input', unmark); ii.addEventListener('input', unmark);
      ov.querySelector('[data-cc="close"]').addEventListener('click', close);
      ov.querySelector('[data-cc="go"]').addEventListener('click', () => {
        const m = Number(mi.value), i = Number(ii.value);
        min = isFinite(m) ? Math.min(180, Math.max(0.5, m)) : 5;
        inc = isFinite(i) ? Math.min(60, Math.max(0, Math.round(i))) : 0;
        try { localStorage.setItem('justChessClock', JSON.stringify({ min, inc })); } catch (e) {}
        start();
      });
      ov.querySelector('.cc-pre.on, .cc-go').focus();
    }
    function start() {
      clock = create(min, inc);
      ov.innerHTML = '<div class="cc-play" style="flex:1;display:flex;flex-direction:column;min-height:0">'
        + '<button type="button" class="cc-side top" data-side="0"><span class="cc-time"></span><span class="cc-sub"></span></button>'
        + '<div class="cc-bar">'
        + '<button type="button" class="cc-btn" data-cc="pause"></button>'
        + '<button type="button" class="cc-btn" data-cc="reset" aria-label="' + t('ccReset', 'Qaytadan') + '" title="' + t('ccReset', 'Qaytadan') + '">↺</button>'
        + '<button type="button" class="cc-btn" data-cc="setup" aria-label="' + t('ccSettings', "Vaqtni o'zgartirish") + '" title="' + t('ccSettings', "Vaqtni o'zgartirish") + '">⚙</button>'
        + '<button type="button" class="cc-btn" data-cc="close" aria-label="' + t('ccClose', 'Yopish') + '" title="' + t('ccClose', 'Yopish') + '">✕</button>'
        + '</div>'
        + '<button type="button" class="cc-side bottom" data-side="1"><span class="cc-time"></span><span class="cc-sub"></span></button></div>';
      // pointerdown — bosish darhol (click 300 ms gacha kechikishi mumkin); klaviatura uchun click (detail 0)
      ov.querySelectorAll('.cc-side').forEach((b) => {
        b.addEventListener('pointerdown', (e) => { if (e.button === 0 || e.pointerType !== 'mouse') { e.preventDefault(); tap(Number(b.dataset.side)); } });
        b.addEventListener('click', (e) => { if (e.detail === 0) tap(Number(b.dataset.side)); });
      });
      ov.querySelector('[data-cc="pause"]').addEventListener('click', () => {
        const s = clock.state, now = Date.now();
        if (s.paused) { clock.resume(now); wake(true); } else if (clock.pause(now)) wake(false);
        render();
      });
      ov.querySelector('[data-cc="reset"]').addEventListener('click', () => {
        const s = clock.state;
        if (s.running !== null && !s.paused) clock.pause(Date.now());
        if (s.moves[0] + s.moves[1] === 0 || window.confirm(t('ccResetQ', "Soatni qaytadan boshlaysizmi?"))) { clock.reset(); wake(false); }
        render();
      });
      ov.querySelector('[data-cc="setup"]').addEventListener('click', () => {
        const s = clock.state;
        if (s.moves[0] + s.moves[1] > 0 && s.flagged === null) {
          if (s.running !== null && !s.paused) clock.pause(Date.now());
          render();
          if (!window.confirm(t('ccResetQ', "Soatni qaytadan boshlaysizmi?"))) return;
        }
        setup();
      });
      ov.querySelector('[data-cc="close"]').addEventListener('click', close);
      timer = setInterval(() => { if (clock && clock.check(Date.now())) { play('game-end'); buzz([200, 100, 200]); wake(false); } render(); }, 100);
      render();
      ov.tabIndex = -1; ov.focus(); // tomonlarga fokus bermaymiz — hoshiya «tanlangan»dek ko'rinardi
    }
    function tap(side) {
      if (!clock) return;
      const wasIdle = clock.state.running === null;
      if (clock.press(side, Date.now())) { play('move'); buzz(25); if (wasIdle) wake(true); }
      render();
    }
    function render() {
      if (!clock) return;
      const s = clock.state, now = Date.now();
      ov.querySelectorAll('.cc-side').forEach((b) => {
        const side = Number(b.dataset.side), ms = clock.left(side, now);
        const on = s.running === side && s.flagged === null;
        b.className = 'cc-side ' + (side === 0 ? 'top' : 'bottom') + (on ? ' on' : '') + (on && ms < 10000 ? ' low' : '') + (s.flagged === side ? ' flag' : '') + (s.running === null && s.flagged === null ? ' wait' : '');
        b.querySelector('.cc-time').textContent = fmt(ms);
        let sub;
        if (s.flagged === side) sub = '⚑ ' + t('ccFlag', 'Vaqt tugadi!');
        else if (s.paused) sub = t('ccPaused', 'Pauza');
        else if (s.running === null && s.flagged === null) sub = t('ccTap', 'Boshlash uchun bosing');
        else sub = t('ccMoves', 'Yurishlar') + ': ' + s.moves[side];
        b.querySelector('.cc-sub').textContent = sub;
        b.setAttribute('aria-label', fmt(ms) + ' — ' + sub);
      });
      const pb = ov.querySelector('[data-cc="pause"]');
      const label = s.paused ? t('ccResume', 'Davom ettirish') : t('ccPause', 'Pauza');
      const ic = s.paused ? '▶' : '⏸';
      if (pb.textContent !== ic) pb.textContent = ic;
      pb.disabled = !(s.paused || (s.running !== null && s.flagged === null));
      pb.setAttribute('aria-label', label); pb.title = label;
    }
    setup();
    return { close, get clock() { return clock; } };
  }

  return { PRESETS, create, fmt, open };
});
