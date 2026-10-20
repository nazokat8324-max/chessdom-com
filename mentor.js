// 🎓 Ustoz va shogird: profilda #profileMentorSection (ustozi, shogirdlari va ularning reyting o'sishi, so'rovlar,
// "Ustozim bo'ling" / "Shogird qilib olish" tugmalari) va o'yinni qayta ko'rish oynasida izohlar (#rpNotes):
// ustoz shogird o'yinining istalgan yurishiga izoh qoldiradi, shogird javob yozadi.
// Server: GET /api/mentor/:username, POST /api/mentor/request|respond|end, GET/POST /api/notes/:owner/:gameId, DELETE /api/notes/:id.
(function () {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const auth = () => window.authToken ? { Authorization: 'Bearer ' + window.authToken } : {};
  const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth() }, body: JSON.stringify(body || {}) }).then(r => r.json()).catch(() => null);
  const gainChip = (g) => `<span class="mt-gain ${g > 0 ? 'up' : g < 0 ? 'down' : ''}">${g > 0 ? '+' : ''}${g}</span>`;
  const date = (iso) => iso ? new Date(iso).toLocaleDateString() : '';
  const REASONS = {
    self: ['mtErrSelf', "O'zingizga ustoz bo'lolmaysiz"],
    blocked: ['mtErrBlocked', "Bu o'yinchi bilan bog'lanib bo'lmaydi"],
    mentor_weak: ['mtErrMentorWeak', "Ustoz kamida {{r}} reyting va {{g}} ta o'yinga ega bo'lishi kerak"],
    student_strong: ['mtErrStudentStrong', "Shogirdning reytingi {{s}} dan past bo'lishi kerak"],
    gap: ['mtErrGap', "Ustoz shogirddan kamida 200 reyting kuchli bo'lishi kerak"],
    has_mentor: ['mtErrHasMentor', "Bu o'yinchining ustozi allaqachon bor"],
    full: ['mtErrFull', "Ustozda bo'sh joy yo'q (ko'pi bilan 5 ta shogird)"],
    pending: ['mtErrPending', "So'rov allaqachon yuborilgan"]
  };
  const reasonText = (d) => {
    const r = REASONS[d && d.reason];
    return r ? tx(r[0], r[1], { r: 1700, g: 20, s: 1600 }) : (tServer(d && d.message) || tx('errGeneric', 'Xatolik yuz berdi!'));
  };

  // ---------- Profil ----------
  const pst = { username: null, data: null };
  window.loadProfileMentor = async function (username) {
    pst.username = username;
    pst.data = null;
    const sec = document.getElementById('profileMentorSection');
    if (sec) sec.hidden = true;
    const d = await fetch('/api/mentor/' + encodeURIComponent(username), { headers: auth() }).then(r => r.json()).catch(() => null);
    if (pst.username !== username) return;
    pst.data = d && d.success ? d : null;
    renderProfile();
  };

  function renderProfile() {
    const sec = document.getElementById('profileMentorSection'), el = document.getElementById('profileMentor');
    if (!sec || !el) return;
    const d = pst.data;
    if (!d) { sec.hidden = true; return; }
    const v = d.viewer || {};
    const parts = [];
    const active = d.students.filter(s => s.status === 'active'), ended = d.students.filter(s => s.status === 'ended');
    if (active.length || ended.length) {
      parts.push(`<div class="mt-score">🎓 <b>${esc(tx('mtStudentsN', '{{n}} ta shogird', { n: active.length }))}</b> · ${esc(tx('mtTotalGain', "shogirdlar reytingi jami"))} ${gainChip(d.score.gain)}</div>`);
      parts.push(`<div class="mt-list">${active.concat(ended).map(s => `
        <div class="mt-card${s.status === 'ended' ? ' ended' : ''}">
          <div class="mt-card-main"><b class="player-link" data-username="${esc(s.username)}">${esc(s.username)}</b>
            <small>${s.status === 'ended' ? esc(tx('mtEnded', 'tugagan')) + ' · ' : ''}${s.startRating ? esc(s.startRating) + (s.rating ? ' → ' + esc(s.rating) : '') : ''} ${gainChip(s.gain)}</small></div>
          <div class="mt-card-actions">
            <button type="button" class="mt-btn ghost" data-games="${esc(s.username)}">📜 ${esc(tx('mtGames', "O'yinlari"))}</button>
            ${v.own && s.status === 'active' ? `<button type="button" class="mt-btn danger" data-end="${esc(s.id)}">${esc(tx('mtEnd', 'Tugatish'))}</button>` : ''}
          </div>
        </div>`).join('')}</div>`);
    }
    if (d.mentor) {
      parts.push(`<div class="mt-card mentor">
        <div class="mt-card-main"><small>${esc(tx('mtMentorOf', 'Ustozi'))}</small><b class="player-link" data-username="${esc(d.mentor.username)}">🎓 ${esc(d.mentor.username)}</b>
          <small>${esc(tx('mtSince', '{{date}} dan beri', { date: date(d.mentor.since) }))} · ${esc(tx('mtProgress', "o'sish"))} ${gainChip(d.mentor.gain)}</small></div>
        ${v.own ? `<div class="mt-card-actions"><button type="button" class="mt-btn danger" data-end="${esc(d.mentor.id)}">${esc(tx('mtEnd', 'Tugatish'))}</button></div>` : ''}
      </div>`);
    }
    if (v.own) {
      (v.incoming || []).forEach(r => parts.push(`<div class="mt-request">
        <span>${esc(r.as === 'mentor' ? tx('nfMentorOffer', "{{name}} sizga ustoz bo'lishni taklif qilmoqda", { name: r.from }) : tx('nfMentorAsk', "{{name}} ustozi bo'lishingizni so'ramoqda", { name: r.from }))}</span>
        <div><button type="button" class="mt-btn" data-accept="${esc(r.id)}">✓ ${esc(tx('mtAccept', 'Qabul qilish'))}</button><button type="button" class="mt-btn ghost" data-decline="${esc(r.id)}">✕</button></div>
      </div>`));
      (v.outgoing || []).forEach(r => parts.push(`<div class="mt-request out">
        <span>⏳ ${esc(tx('mtOutgoing', "{{name}} ga so'rov yuborilgan", { name: r.to }))}</span>
        <div><button type="button" class="mt-btn ghost" data-end="${esc(r.id)}">${esc(tx('mtCancel', 'Bekor qilish'))}</button></div>
      </div>`));
      if (!parts.length) {
        const e = d.eligibility;
        const hint = e.canMentor
          ? tx('mtHintMentor', "Siz ustoz bo'la olasiz: yangi boshlovchining profilida «Shogird qilib olish» tugmasini bosing (ko'pi bilan {{n}} ta shogird). Ularning o'yinlariga izoh qoldirasiz, reytingi o'sgani sari siz ham nishon olasiz.", { n: e.maxStudents })
          : e.canBeStudent
            ? tx('mtHintStudent', "Kuchli o'yinchining ({{r}}+) profilida «Ustozim bo'ling» tugmasini bosing — u o'yinlaringizni ko'rib, har yurishga izoh qoldiradi.", { r: e.minRating })
            : tx('mtHintNeither', "Ustoz bo'lish uchun: reyting {{r}}+ va {{g}}+ o'yin (sizda hozir {{my}}, {{n}} ta o'yin).", { r: e.minRating, g: e.minGames, my: e.bestRating, n: e.games });
        parts.push(`<p class="mt-hint">${esc(hint)}</p>`);
      }
    } else if (v.pending) {
      parts.push(v.pending.outgoing
        ? `<div class="mt-request out"><span>⏳ ${esc(tx('mtSent', "So'rov yuborilgan — javob kutilmoqda"))}</span><div><button type="button" class="mt-btn ghost" data-end="${esc(v.pending.id)}">${esc(tx('mtCancel', 'Bekor qilish'))}</button></div></div>`
        : `<div class="mt-request"><span>${esc(tx('mtIncomingHere', "Bu o'yinchi sizga so'rov yuborgan"))}</span><div><button type="button" class="mt-btn" data-accept="${esc(v.pending.id)}">✓ ${esc(tx('mtAccept', 'Qabul qilish'))}</button><button type="button" class="mt-btn ghost" data-decline="${esc(v.pending.id)}">✕</button></div></div>`);
    } else if (v.relation) {
      parts.push(`<div class="mt-relation">🎓 ${esc(v.relation === 'mentor' ? tx('mtYouAreMentor', "Siz bu o'yinchining ustozisiz") : tx('mtYouAreStudent', "Bu o'yinchi — sizning ustozingiz"))}</div>`);
    }
    if (!v.own && (v.canAskMentor || v.canOfferMentor)) {
      parts.push(`<div class="mt-actions">
        ${v.canAskMentor ? `<button type="button" class="mt-btn big" data-request="student">🎓 ${esc(tx('mtAsk', "Ustozim bo'ling"))}</button>` : ''}
        ${v.canOfferMentor ? `<button type="button" class="mt-btn big" data-request="mentor">🎓 ${esc(tx('mtOffer', 'Shogird qilib olish'))}</button>` : ''}
      </div>`);
    }
    sec.hidden = !parts.length;
    el.innerHTML = parts.join('');
    el.querySelectorAll('[data-games]').forEach(b => b.addEventListener('click', () => window.openGameHistory && window.openGameHistory(b.dataset.games)));
    el.querySelectorAll('[data-request]').forEach(b => b.addEventListener('click', () => act('/api/mentor/request', { username: pst.username, as: b.dataset.request }, tx('mtRequestSent', "So'rov yuborildi!"))));
    el.querySelectorAll('[data-accept]').forEach(b => b.addEventListener('click', () => act('/api/mentor/respond', { id: b.dataset.accept, accept: true }, tx('mtAccepted', "Ustoz-shogirdlik boshlandi! 🎓"))));
    el.querySelectorAll('[data-decline]').forEach(b => b.addEventListener('click', () => act('/api/mentor/respond', { id: b.dataset.decline, accept: false })));
    el.querySelectorAll('[data-end]').forEach(b => b.addEventListener('click', () => {
      if (b.classList.contains('danger') && !confirm(tx('mtEndConfirm', "Ustoz-shogirdlikni tugatasizmi?"))) return;
      act('/api/mentor/end', { id: b.dataset.end });
    }));
  }

  async function act(url, body, okText) {
    const d = await post(url, body);
    if (!d || !d.success) { showToast(reasonText(d), 'warning'); }
    else if (okText) showToast(okText, 'success');
    if (pst.username) window.loadProfileMentor(pst.username);
  }

  // ---------- O'yin izohlari (qayta ko'rish oynasi) ----------
  const nst = { game: null, sans: [], notes: [], canWrite: false, mentor: null, ply: 0 };
  const plyLabel = (ply) => ply === 0 ? tx('mtStartPos', "Boshlang'ich pozitsiya") : `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '...'} ${nst.sans[ply - 1] || ''}`;

  async function loadNotes() {
    const g = nst.game;
    if (!g || !g.id || !g.player) return;
    const d = await fetch('/api/notes/' + encodeURIComponent(g.player) + '/' + encodeURIComponent(g.id), { headers: auth() }).then(r => r.json()).catch(() => null);
    if (nst.game !== g) return;
    nst.notes = d && d.success ? d.notes : [];
    nst.canWrite = !!(d && d.canWrite);
    nst.mentor = d && d.mentor;
    renderNotes();
  }

  function renderNotes() {
    const el = document.getElementById('rpNotes');
    if (!el) return;
    if (!nst.game || (!nst.notes.length && !nst.canWrite)) { el.hidden = true; return; }
    el.hidden = false;
    // Izohli yurishlarga belgi
    const withNotes = new Set(nst.notes.map(n => n.ply));
    document.querySelectorAll('#replayModal [data-ply]').forEach(b => b.classList.toggle('has-note', withNotes.has(Number(b.dataset.ply))));
    const draft = (el.querySelector('textarea') || {}).value || '';
    el.innerHTML = `
      <div class="rn-head">🎓 ${esc(tx('mtNotesTitle', 'Ustoz izohlari'))} <small>${nst.notes.length || ''}</small></div>
      ${nst.notes.length ? `<div class="rn-list">${nst.notes.map(n => `
        <div class="rn-item${n.ply === nst.ply ? ' current' : ''}" data-note-ply="${n.ply}">
          <div class="rn-meta"><b>${esc(plyLabel(n.ply))}</b><span>${esc(n.author)}${n.author === nst.mentor ? ' 🎓' : ''}</span>${n.mine ? `<button type="button" class="rn-del" data-del="${esc(n.id)}" title="${esc(tx('mtDelete', "O'chirish"))}">🗑</button>` : ''}</div>
          <p>${esc(n.text)}</p>
        </div>`).join('')}</div>` : `<p class="rn-empty">${esc(tx('mtNotesEmpty', "Hali izoh yo'q — yurishni tanlang va fikringizni yozing"))}</p>`}
      ${nst.canWrite ? `<form class="rn-form">
        <label>${esc(tx('mtNoteFor', 'Izoh: {{move}}', { move: plyLabel(nst.ply) }))}</label>
        <textarea maxlength="500" rows="2" placeholder="${esc(tx('mtNotePlaceholder', "Bu yurish haqida fikr: nima yaxshi, nima o'rniga…"))}">${esc(draft)}</textarea>
        <button type="submit" class="mt-btn">💬 ${esc(tx('mtNoteAdd', "Izoh qo'shish"))}</button>
      </form>` : ''}`;
    el.querySelectorAll('[data-note-ply]').forEach(n => n.addEventListener('click', (e) => { if (!e.target.closest('[data-del]') && window.replayGo) window.replayGo(Number(n.dataset.notePly)); }));
    el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const d = await fetch('/api/notes/' + encodeURIComponent(b.dataset.del), { method: 'DELETE', headers: auth() }).then(r => r.json()).catch(() => null);
      if (!d || !d.success) showToast(tServer(d && d.message) || tx('errGeneric', 'Xatolik yuz berdi!'), 'warning');
      loadNotes();
    }));
    const form = el.querySelector('.rn-form');
    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ta = form.querySelector('textarea');
      const text = ta.value.trim();
      if (!text) return;
      const g = nst.game;
      const d = await post('/api/notes/' + encodeURIComponent(g.player) + '/' + encodeURIComponent(g.id), { ply: nst.ply, text });
      if (!d || !d.success) { showToast(tServer(d && d.message) || tx('errGeneric', 'Xatolik yuz berdi!'), 'warning'); return; }
      ta.value = '';
      loadNotes();
    });
  }

  document.addEventListener('replay:open', (e) => {
    const { game, sans } = e.detail || {};
    nst.game = game; nst.sans = sans || []; nst.notes = []; nst.canWrite = false;
    nst.ply = nst.sans.length;
    if (game && game.id) loadNotes();
  });
  document.addEventListener('replay:ply', (e) => {
    nst.ply = (e.detail && e.detail.ply) || 0;
    if (nst.game) renderNotes();
  });
  document.addEventListener('replay:close', () => { nst.game = null; });
})();
