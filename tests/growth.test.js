// O'yinchi jalb qilish: 🔗 taklif havolasi va ✈️ Telegram bot (soxta Telegram API bilan)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { startServer, once, ack, sleep } = require('./helpers');

let srv, tg, tgPort, webhook = null;
const calls = [];
before(async () => {
  // Soxta Telegram Bot API: /bot<token>/<method>
  tg = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const method = req.url.split('/').pop();
      const data = body ? JSON.parse(body) : {};
      calls.push({ method, data });
      if (method === 'setWebhook') webhook = data;
      res.setHeader('Content-Type', 'application/json');
      if (method === 'sendMessage' && data.chat_id === 'blocked') { res.statusCode = 403; return res.end(JSON.stringify({ ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' })); }
      res.end(JSON.stringify({ ok: true, result: method === 'getMe' ? { id: 1, is_bot: true, username: 'chessdom_test_bot' } : {} }));
    });
  });
  await new Promise((r) => tg.listen(0, r));
  tgPort = tg.address().port;
  srv = await startServer({ TELEGRAM_BOT_TOKEN: '123:TEST', TELEGRAM_API: `http://localhost:${tgPort}` });
});
after(async () => { await srv.stop(); tg.close(); });

const waitFor = async (fn, ms = 4000) => { const end = Date.now() + ms; while (!fn() && Date.now() < end) await sleep(50); return fn(); };
const sent = (chat) => calls.filter((c) => c.method === 'sendMessage' && String(c.data.chat_id) === String(chat));
const hook = (update) => fetch(srv.base + '/api/telegram/webhook', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': webhook.secret_token }, body: JSON.stringify(update)
});
const msg = (chat, text, lang) => ({ update_id: Date.now(), message: { message_id: 1, chat: { id: chat, type: 'private' }, from: { id: chat, username: 'tg_' + chat, language_code: lang || 'en' }, text } });

async function register(prefix, inviteCode) {
  const name = prefix + Date.now() % 100000 + Math.floor(Math.random() * 1000);
  const d = await srv.api(null, '/api/auth/register', 'POST', { username: name, email: name.toLowerCase() + '@test.uz', password: 'secret1', inviteCode });
  assert.ok(d.success, JSON.stringify(d));
  return { id: d.user.id, name, token: d.token };
}

test('Taklif havolasi: kod, ommaviy ma\'lumot, ro\'yxatdan o\'tish, havola oldindan ko\'rinishi', async () => {
  const a = await srv.register('Inv');
  const mine = await srv.api(a, '/api/invite');
  assert.match(mine.code, /^[a-z0-9]{8}$/);
  assert.equal(mine.url.endsWith('/?invite=' + mine.code), true);
  assert.equal(mine.count, 0);
  assert.equal((await srv.api(a, '/api/invite')).code, mine.code, 'kod doimiy');
  assert.equal((await srv.api(null, '/api/invite/' + mine.code)).inviter.username, a.name);
  assert.equal((await srv.api(null, '/api/invite/nosuchcode')).status, 404);
  const html = await (await fetch(srv.base + '/?invite=' + mine.code)).text();
  assert.match(html, new RegExp(`og:title" content="♞ ${a.name} invites you`));

  const b = await register('Nw', mine.code);
  const after1 = await srv.api(a, '/api/invite');
  assert.equal(after1.count, 1);
  assert.equal(after1.recent[0].username, b.name);
  const n = await srv.api(a, '/api/notifications');
  assert.ok(n.notifications.some((x) => x.type === 'invite_joined' && x.data.from === b.name));
  // Noto'g'ri kod ro'yxatdan o'tishga xalaqit bermaydi
  await register('Nx', 'zzzzzzzz');
  // 3 ta taklif → «Taklifchi» yutug'i
  await register('Ny', mine.code); await register('Nz', mine.code);
  await sleep(300);
  const ex = await srv.api(a, '/api/users/' + a.name + '/extras');
  assert.ok(JSON.stringify(ex.achievements).includes('invite_3'), JSON.stringify(ex.achievements));
});

test('Taklifni qabul qilish: onlayn — darhol chaqiruv (maxfiylik chetlab o\'tiladi), oflayn — bildirishnoma, o\'zi — rad', async () => {
  const a = await srv.register('Ia'), b = await srv.register('Ib'), c = await srv.register('Ic');
  const code = (await srv.api(a, '/api/invite')).code;
  await srv.api(a, '/api/users/me/privacy', 'POST', { challenges: 'none' });
  const sa = await srv.connect(a), sb = await srv.connect(b);
  const rec = once(sa, 'challenge-received');
  const res = await ack(sb, 'invite-accept', { code, initial: 180, increment: 2, rated: false });
  assert.equal(res.ok, true);
  assert.equal(res.status, 'sent');
  assert.equal(res.friendsNow, true);
  const ch = await rec;
  assert.equal(ch.invite, true);
  assert.equal(ch.from.username, b.name);
  assert.deepEqual(ch.clock, { initial: 180, increment: 2 });
  assert.equal(ch.rated, false);
  assert.equal((await srv.api(a, '/api/friends/status/' + b.name)).status, 'friends');
  // Oddiy chaqiruv esa maxfiylik sababli rad etiladi
  const err = once(sb, 'challenge-error');
  sb.emit('challenge-send', { username: a.name, initial: 180, increment: 2 });
  assert.equal((await err).reason, 'disabled');
  assert.equal((await ack(sa, 'invite-accept', { code })).reason, 'self');
  assert.equal((await ack(sb, 'invite-accept', { code: 'nosuchcode' })).reason, 'not_found');
  sa.disconnect();
  await sleep(300);
  const sc = await srv.connect(c);
  const off = await ack(sc, 'invite-accept', { code });
  assert.equal(off.status, 'offline');
  await sleep(200);
  assert.ok((await srv.api(a, '/api/notifications')).notifications.some((x) => x.type === 'invite_waiting' && x.data.from === c.name));
  sb.disconnect(); sc.disconnect();
});

test('Telegram: ulash, bildirishnoma, /invite, /stop, bloklangan bot', async () => {
  assert.ok(await waitFor(() => webhook), 'setWebhook chaqirilmadi');
  assert.equal(webhook.url.endsWith('/api/telegram/webhook'), true);
  assert.ok(calls.some((c) => c.method === 'setMyCommands' && c.data.language_code === 'uz'));
  const u = await srv.register('Tg'), f = await srv.register('Tf');
  let st = await srv.api(u, '/api/telegram');
  assert.deepEqual([st.enabled, st.bot, st.linked], [true, 'chessdom_test_bot', false]);
  const link = await srv.api(u, '/api/telegram/link', 'POST', { lang: 'uz' });
  const code = link.url.split('?start=')[1];
  assert.ok(link.url.startsWith('https://t.me/chessdom_test_bot?start=') && code);

  // Maxfiy sarlavhasiz so'rov rad etiladi
  assert.equal((await fetch(srv.base + '/api/telegram/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  await hook(msg(555, '/start ' + code, 'ru'));
  assert.ok(await waitFor(() => sent(555).length === 1));
  assert.match(sent(555)[0].data.text, new RegExp(`Telegram ${u.name} akkauntiga ulandi`), "saytdagi til (uz) ishlatiladi");
  st = await srv.api(u, '/api/telegram');
  assert.equal(st.linked, true);
  assert.equal(st.tgUsername, 'tg_555');
  // Kod bir martalik
  await hook(msg(777, '/start ' + code));
  assert.ok(await waitFor(() => sent(777).length === 1));
  assert.match(sent(777)[0].data.text, /expired or is invalid/);

  // Sayt yopiq (socket yo'q) → do'stlik so'rovi Telegram'ga keladi, tugmasi profilga
  await srv.api(f, '/api/friends/request', 'POST', { username: u.name });
  assert.ok(await waitFor(() => sent(555).length === 2));
  const note = sent(555)[1].data;
  assert.equal(note.text, `${f.name} sizga do'stlik so'rovi yubordi`);
  assert.match(note.reply_markup.inline_keyboard[0][0].url, new RegExp('/\\?profile=' + f.name + '$'));
  // Sayt ochiq va ko'rinib turibdi → Telegram'ga yuborilmaydi
  const s = await srv.connect(u);
  await srv.api(f, '/api/chat/messages', 'POST', { roomId: 'user_' + u.id, message: 'salom' });
  await sleep(500);
  assert.equal(sent(555).length, 2);
  s.disconnect();
  await sleep(200);
  // /invite — shaxsiy havola va ulashish tugmasi
  await hook(msg(555, '/invite'));
  assert.ok(await waitFor(() => sent(555).length === 3));
  const inv = sent(555)[2].data;
  assert.match(inv.text, /\/\?invite=[a-z0-9]{8}/);
  assert.match(inv.reply_markup.inline_keyboard[0][0].url, /^https:\/\/t\.me\/share\/url\?url=/);
  // Sinov xabari
  assert.equal((await srv.api(u, '/api/telegram/test', 'POST')).success, true);
  // /stop — uziladi
  await hook(msg(555, '/stop'));
  assert.ok(await waitFor(() => sent(555).length === 5));
  assert.equal((await srv.api(u, '/api/telegram')).linked, false);

  // Foydalanuvchi botni bloklagan (403) → ulanish o'chiriladi
  const code2 = (await srv.api(u, '/api/telegram/link', 'POST')).url.split('?start=')[1];
  await hook({ update_id: 9, message: { message_id: 2, chat: { id: 'blocked', type: 'private' }, from: { id: 9, language_code: 'en' }, text: '/start ' + code2 } });
  await waitFor(() => sent('blocked').length >= 1);
  await sleep(200);
  assert.equal((await srv.api(u, '/api/telegram')).linked, true);
  await srv.api(u, '/api/telegram/test', 'POST');
  await sleep(300);
  await srv.api(f, '/api/friends/cancel', 'POST', { username: u.name });
  await srv.api(f, '/api/friends/request', 'POST', { username: u.name });
  await sleep(500);
  assert.equal((await srv.api(u, '/api/telegram')).linked, false);
});
