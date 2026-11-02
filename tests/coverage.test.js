// C3 (2026-11-02): CLAUDE.md dagi, avval umuman testi bo'lmagan imkoniyatlar — uzilish va qaytish, shikoyat,
// profil rasmi, parolni tiklash (MAIL_LOG), email, klub rahbariyati va yangiliklari, reyting grafigi ma'lumoti
const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, once, startGame, play, finish, closeAll, sleep } = require('./helpers');

let srv;
test.before(async () => { srv = await startServer({ MAIL_LOG: '1', ADMIN_USERNAMES: 'CovAdmin', RECONNECT_GRACE_MS: '8000' }); });
test.after(async () => { if (srv) await srv.stop(); });

test("Uzilish va qaytish: raqibga opponent-away, qayta ulanganda game-resume (yurishlar, rang) va opponent-back, o'yin davom etadi", async () => {
  const A = await srv.register('Rc'), B = await srv.register('Rd');
  const g = await startGame(srv, A, B);
  await play(g, ['e2e4', 'e7e5']);
  const away = once(g.black.socket, 'opponent-away');
  g.white.socket.disconnect();
  const a = await away;
  assert.equal(a.roomId, g.roomId);
  assert.ok(a.seconds > 0);
  const back = once(g.black.socket, 'opponent-back');
  const s2 = await srv.connect(g.white);
  const resume = s2.events.find((e) => e.e === 'game-resume') || { p: await once(s2, 'game-resume') };
  assert.equal(resume.p.roomId, g.roomId);
  assert.equal(resume.p.color, 'w');
  assert.deepEqual(resume.p.moves.map((m) => m.from + m.to), ['e2e4', 'e7e5']);
  await back;
  // Qaytgan socket bilan yurish qabul qilinadi
  const moved = once(g.black.socket, 'opponent-move');
  s2.emit('make-move', { roomId: g.roomId, move: { from: 'g1', to: 'f3' } });
  await moved;
  s2.disconnect(); closeAll(A, B);
});

test("Uzilgan o'yinchi muddat ichida qaytmasa — abandon, qolgan o'yinchi yutadi", async () => {
  const srv2 = await startServer({ RECONNECT_GRACE_MS: '1500' });
  try {
    const A = await srv2.register('Ab'), B = await srv2.register('Ac');
    const g = await startGame(srv2, A, B);
    await play(g, ['d2d4', 'd7d5']);
    const ended = once(g.black.socket, 'game-ended', 8000);
    g.white.socket.disconnect();
    const e = await ended;
    assert.equal(e.reason, 'abandon');
    assert.equal(e.winner, 'b');
    closeAll(A, B);
  } finally { await srv2.stop(); }
});

test("Shikoyat: sabab tekshiriladi, o'ziga yozib bo'lmaydi, takror ochiq shikoyat yo'q; admin ko'radi va hal qiladi (jurnalga yoziladi)", async () => {
  const A = await srv.register('Rp'), B = await srv.register('Rq');
  assert.equal((await srv.api(A, '/api/reports', 'POST', { username: B.name, reason: 'nimadir' })).status, 400);
  assert.equal((await srv.api(A, '/api/reports', 'POST', { username: A.name, reason: 'abuse' })).status, 400);
  assert.equal((await srv.api(A, '/api/reports', 'POST', { username: 'yoq-odam-xyz', reason: 'abuse' })).status, 400);
  const ok = await srv.api(A, '/api/reports', 'POST', { username: B.name, reason: 'abuse', details: 'haqorat qildi' });
  assert.equal(ok.success, true);
  const dup = await srv.api(A, '/api/reports', 'POST', { username: B.name, reason: 'spam' });
  assert.equal(dup.success, false);
  assert.equal((await srv.api(A, '/api/admin/reports')).status, 403);
  const reg = await srv.api(null, '/api/auth/register', 'POST', { username: 'CovAdmin', email: 'covadmin@test.uz', password: 'secret1' });
  const ADM = { token: reg.token };
  const list = await srv.api(ADM, '/api/admin/reports');
  const r = list.reports.find((x) => x.details === 'haqorat qildi');
  assert.ok(r, 'admin shikoyatni ko\'radi');
  assert.equal((await srv.api(ADM, '/api/admin/reports/' + r.id + '/resolve', 'POST', { resolution: 'ogohlantirildi' })).success, true);
  assert.ok(!(await srv.api(ADM, '/api/admin/reports')).reports.some((x) => x.id === r.id), "ochiqlar ro'yxatidan chiqdi");
  assert.ok((await srv.api(ADM, '/api/admin/reports?status=resolved')).reports.some((x) => x.id === r.id));
  await sleep(200);
  const aud = await srv.api(ADM, '/api/admin/audit?action=report_resolve');
  assert.ok(aud.actions.some((x) => x.target === B.name), JSON.stringify(aud).slice(0, 400));
  // Hal qilingandan keyin yana shikoyat qilish mumkin
  assert.equal((await srv.api(A, '/api/reports', 'POST', { username: B.name, reason: 'spam' })).success, true);
});

test("Profil rasmi: PNG yuklanadi va beriladi, soxta tur / katta hajm rad etiladi, o'chirilsa 404", async () => {
  const A = await srv.register('Av');
  // 1×1 PNG
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const up = await srv.api(A, '/api/users/me/avatar', 'POST', { image: 'data:image/png;base64,' + png });
  assert.equal(up.success, true);
  assert.ok(up.avatarVersion);
  const res = await fetch(srv.base + '/api/users/' + encodeURIComponent(A.name) + '/avatar?v=' + up.avatarVersion);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/png');
  assert.equal(Buffer.from(await res.arrayBuffer()).toString('base64'), png);
  const prof = await srv.api(null, '/api/users/' + encodeURIComponent(A.name) + '/profile');
  assert.equal(String(prof.profile.avatarVersion), String(up.avatarVersion));
  // PNG deb e'lon qilingan, aslida matn
  assert.equal((await srv.api(A, '/api/users/me/avatar', 'POST', { image: 'data:image/png;base64,' + Buffer.from('<script>alert(1)</script>').toString('base64') })).status, 400);
  assert.equal((await srv.api(A, '/api/users/me/avatar', 'POST', { image: 'data:image/svg+xml;base64,PHN2Zz4=' })).status, 400);
  const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(210 * 1024)]).toString('base64');
  assert.equal((await srv.api(A, '/api/users/me/avatar', 'POST', { image: 'data:image/jpeg;base64,' + big })).status, 413);
  assert.equal((await srv.api(A, '/api/users/me/avatar', 'DELETE')).success, true);
  assert.equal((await fetch(srv.base + '/api/users/' + encodeURIComponent(A.name) + '/avatar')).status, 404);
});

test("Parolni tiklash: havola emailga (MAIL_LOG), bir martalik, yangi parol bilan kiriladi; emailsiz akkaunt va noma'lum nom", async () => {
  const A = await srv.register('Fg');
  assert.equal((await srv.api(null, '/api/auth/forgot', 'POST', {})).status, 400);
  const unknown = await srv.api(null, '/api/auth/forgot', 'POST', { login: 'hech-kim-yoq-123' });
  assert.equal(unknown.success, true, "noma'lum nomda ham bir xil javob (akkaunt borligi oshkor qilinmaydi)");
  const before = srv.log().length;
  const r = await srv.api(null, '/api/auth/forgot', 'POST', { login: A.name });
  assert.equal(r.success, true);
  await sleep(200);
  const m = srv.log().slice(before).match(/\/\?reset=([a-f0-9]{64})/);
  assert.ok(m, 'havola yuborildi');
  const token = m[1];
  assert.equal((await srv.api(null, '/api/auth/reset', 'POST', { token, password: '123' })).status, 400, 'qisqa parol');
  assert.equal((await srv.api(null, '/api/auth/reset', 'POST', { token: 'a'.repeat(64), password: 'yangi-parol1' })).status, 400, 'soxta token');
  assert.equal((await srv.api(null, '/api/auth/reset', 'POST', { token, password: 'yangi-parol1' })).success, true);
  assert.equal((await srv.api(null, '/api/auth/reset', 'POST', { token, password: 'boshqa-parol2' })).status, 400, 'havola bir martalik');
  assert.equal((await srv.api(null, '/api/auth/login', 'POST', { username: A.name, password: 'secret1' })).success, false);
  assert.equal((await srv.api(null, '/api/auth/login', 'POST', { username: A.name, password: 'yangi-parol1' })).success, true);
  // Email orqali ham topiladi
  assert.equal((await srv.api(null, '/api/auth/forgot', 'POST', { login: A.name.toLowerCase() + '@test.uz' })).success, true);
  // Emailsiz akkaunt (klient email o'rniga <ism>@justchess.local yuboradi) — xat yuborilmaydi
  const nm = 'NoMail' + Date.now() % 100000;
  const noMail = await srv.api(null, '/api/auth/register', 'POST', { username: nm, email: nm.toLowerCase() + '@justchess.local', password: 'secret1' });
  assert.equal(noMail.success, true);
  assert.equal((await srv.api(null, '/api/auth/forgot', 'POST', { login: noMail.user.username })).status, 400);
});

test("Email: biriktiriladi, boshqa akkauntniki 409, noto'g'ri format 400; yangi email bilan parol tiklanadi", async () => {
  const A = await srv.register('Em'), B = await srv.register('En');
  assert.equal((await srv.api(A, '/api/users/me/email', 'POST', { email: 'notogri' })).status, 400);
  assert.equal((await srv.api(A, '/api/users/me/email', 'POST', { email: B.name.toLowerCase() + '@test.uz' })).status, 409);
  const ok = await srv.api(A, '/api/users/me/email', 'POST', { email: 'Yangi.' + A.name + '@Example.com' });
  assert.equal(ok.success, true);
  assert.equal(ok.email, ('yangi.' + A.name + '@example.com').toLowerCase());
  const before = srv.log().length;
  assert.equal((await srv.api(null, '/api/auth/forgot', 'POST', { login: ok.email })).success, true);
  await sleep(200);
  assert.match(srv.log().slice(before), new RegExp('\\[MAIL\\] ' + ok.email.replace(/\./g, '\\.')));
});

test("Klub rahbariyati: birinchi a'zo — kapitan, moderator tayinlanadi, yangilik yoziladi / mahkamlanadi / o'chiriladi, a'zolarga bildirishnoma", async () => {
  const club = 'Mongolia';
  const A = await srv.register('Ka'), B = await srv.register('Kb'), C = await srv.register('Kc');
  for (const u of [A, B]) assert.equal((await srv.api(u, '/api/country-clubs/join', 'POST', { country: club, code: 'mn' })).success, true);
  let st = await srv.api(A, '/api/country-clubs/' + club + '/staff');
  assert.equal(st.captain.username, A.name, 'birinchi a\'zo kapitan');
  assert.equal(st.canManage, true);
  assert.equal((await srv.api(B, '/api/country-clubs/' + club + '/staff')).canModerate, false);
  assert.equal((await srv.api(B, '/api/country-clubs/' + club + '/news', 'POST', { title: 'Salom', body: 'Matn' })).status, 403);
  assert.equal((await srv.api(B, '/api/country-clubs/' + club + '/roles', 'POST', { username: B.name, role: 'moderator' })).status, 403, "a'zo rol bera olmaydi");
  assert.equal((await srv.api(A, '/api/country-clubs/' + club + '/roles', 'POST', { username: C.name, role: 'moderator' })).status, 400, "a'zo bo'lmaganga rol yo'q");
  st = await srv.api(A, '/api/country-clubs/' + club + '/roles', 'POST', { username: B.name, role: 'moderator' });
  assert.deepEqual(st.moderators.map((m) => m.username), [B.name]);
  const n = await srv.api(B, '/api/country-clubs/' + club + '/news', 'POST', { title: 'Shanba kuni turnir emas, blitz kechasi', body: "Soat 20:00 da hammamiz Choyxonada!" });
  assert.equal(n.success, true);
  await sleep(300);
  const notes = await srv.api(A, '/api/notifications');
  assert.ok(notes.notifications.some((x) => x.type === 'club_news' && x.data.newsId === n.id), "kapitanga yangilik bildirishnomasi");
  const pinned = await srv.api(A, '/api/country-clubs/news/' + n.id + '/pin', 'POST');
  assert.equal(Number(pinned.news.find((x) => x.id === n.id).pinned), 1);
  assert.equal((await srv.api(C, '/api/country-clubs/news/' + n.id, 'DELETE')).status, 403, 'begona o\'chira olmaydi');
  // Ommaviy: kirmagan ham yangiliklarni ko'radi
  assert.ok((await srv.api(null, '/api/country-clubs/' + club + '/staff')).news.some((x) => x.id === n.id));
  const del = await srv.api(B, '/api/country-clubs/news/' + n.id, 'DELETE');
  assert.equal(del.success, true);
  assert.ok(!del.news.some((x) => x.id === n.id));
  // Kapitanlik topshiriladi — eski kapitan moderator bo'ladi
  st = await srv.api(A, '/api/country-clubs/' + club + '/roles', 'POST', { username: B.name, role: 'captain' });
  assert.equal(st.captain.username, B.name);
  assert.ok(st.moderators.some((m) => m.username === A.name));
  // Klubdan chiqqan moderatorning roli o'chadi
  await srv.api(A, '/api/country-clubs/leave', 'POST', {});
  st = await srv.api(null, '/api/country-clubs/' + club + '/staff');
  assert.ok(!st.moderators.some((m) => m.username === A.name));
});

test("Reyting grafigi: reytingli o'yindan keyin profil ratingHistory da rejim nuqtalari (boshlang'ich va yangi), reytingsizda yo'q", async () => {
  const A = await srv.register('Gr'), B = await srv.register('Gs');
  let g = await startGame(srv, A, B, { initial: 180, increment: 2, rated: true });
  await play(g, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
  await sleep(500);
  const W = g.black; // qora mat qiladi
  const p = (await srv.api(null, '/api/users/' + encodeURIComponent(W.name) + '/profile')).profile;
  const blitz = p.ratingHistory.blitz;
  assert.equal(blitz.length, 2, "boshlang'ich nuqta + o'yindan keyingi");
  assert.equal(blitz[0].r, 1500);
  assert.ok(blitz[1].r > 1500, "g'olib reytingi oshdi");
  assert.equal(p.ratingHistory.rapid.length, 0);
  closeAll(A, B);
  g = await startGame(srv, A, B, { initial: 600, increment: 0, rated: false });
  await finish(g, 'black-resigns');
  await sleep(300);
  assert.equal((await srv.api(null, '/api/users/' + encodeURIComponent(W.name) + '/profile')).profile.ratingHistory.rapid.length, 0, 'reytingsiz o\'yin grafikka tushmaydi');
  closeAll(A, B);
});

test("Admin qidiruvi: '_' li ism topiladi, '_' yovvoyi belgi emas; jurnal filtri 'report_resolve' kabi nomlar bilan ishlaydi", async () => {
  const U = await srv.register('Ali_b'), V = await srv.register('Alixb');
  let reg = await srv.api(null, '/api/auth/login', 'POST', { username: 'CovAdmin', password: 'secret1' });
  if (!reg.success) reg = await srv.api(null, '/api/auth/register', 'POST', { username: 'CovAdmin', email: 'covadmin@test.uz', password: 'secret1' });
  const ADM = { token: reg.token };
  const found = (await srv.api(ADM, '/api/admin/users?q=' + encodeURIComponent(U.name.slice(0, 5)))).users.map((u) => u.username);
  assert.ok(found.includes(U.name), "Ali_b… topiladi");
  assert.ok(!found.includes(V.name), "'_' istalgan harfga mos kelmaydi (Alixb… chiqmaydi)");
  await srv.api(ADM, '/api/admin/users/' + U.id + '/mute', 'POST', { hours: 1 });
  await sleep(200);
  const muted = await srv.api(ADM, '/api/admin/audit?action=mute');
  assert.ok(muted.actions.some((x) => x.target === U.name));
  assert.ok((await srv.api(ADM, '/api/admin/audit?q=' + encodeURIComponent(U.name))).actions.length >= 1, "nishon nomi ('_' bilan) bo'yicha qidiruv");
});
