// 📱 Telegram Mini App: imzoni tekshirish, ulangan o'yinchi parolsiz kiradi, kirgandan keyin ulash, bot tugmalari, ramkada ochish
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, sleep } = require('./helpers');
const { startFakeTelegram, makeInitData } = require('./fixtures/telegram');

const TOKEN = '123:TEST';
let srv, tg;
before(async () => {
  tg = await startFakeTelegram();
  srv = await startServer({ TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_API: tg.api });
});
after(async () => { await srv.stop(); await tg.stop(); });

const login = (initData) => srv.api(null, '/api/telegram/webapp/login', 'POST', { initData });
const waitFor = async (fn, ms = 4000) => { const end = Date.now() + ms; while (!fn() && Date.now() < end) await sleep(50); return fn(); };

test("Mini App: soxta yoki eskirgan ma'lumot rad etiladi, ulanmagan Telegram — linked: false", async () => {
  const tgUser = { id: 9001, first_name: 'Ali', username: 'ali_tg', language_code: 'uz' };
  assert.equal((await login('')).status, 401);
  assert.equal((await login(makeInitData('999:OTHER', tgUser))).status, 401, 'boshqa bot tokeni bilan imzolangan');
  const good = makeInitData(TOKEN, tgUser);
  assert.equal((await login(good.replace('ali_tg', 'boshqa'))).status, 401, "ma'lumot o'zgartirilgan");
  assert.equal((await login(makeInitData(TOKEN, tgUser, Math.floor(Date.now() / 1000) - 2 * 86400))).status, 401, '24 soatdan eski');
  const r = await login(good);
  assert.equal(r.success, true);
  assert.equal(r.linked, false);
  assert.equal(r.token, undefined, "ulanmagan bo'lsa token berilmaydi");
});

test("Mini App: kirgan o'yinchi Telegram'ini ulaydi — keyin parolsiz kiradi; mehmon ulay olmaydi", async () => {
  const tgUser = { id: 9002, first_name: 'Vali', username: 'vali_tg', language_code: 'ru' };
  const initData = makeInitData(TOKEN, tgUser);
  const u = await srv.register('Mini');
  assert.equal((await srv.api(null, '/api/telegram/webapp/link', 'POST', { initData })).status, 401, "kirmagan — ulab bo'lmaydi");
  const linked = await srv.api(u, '/api/telegram/webapp/link', 'POST', { initData, lang: 'ru' });
  assert.equal(linked.success, true);
  // Bot shu chat uchun menyu tugmasini Mini App ga qo'yadi (foydalanuvchi tilida)
  assert.ok(await waitFor(() => tg.calls.some((c) => c.method === 'setChatMenuButton' && c.data.chat_id === '9002')));
  const menu = tg.calls.find((c) => c.method === 'setChatMenuButton' && c.data.chat_id === '9002').data.menu_button;
  assert.equal(menu.type, 'web_app');
  assert.match(menu.web_app.url, /^https:\/\/chesscaravan\.com\/$/);
  assert.equal(menu.text, '♞ Открыть сайт', 'foydalanuvchi tilida');
  // Endi parolsiz kirish — token haqiqiy
  const r = await login(initData);
  assert.equal(r.linked, true);
  assert.equal(r.user.username, u.name);
  assert.equal((await srv.api({ token: r.token }, '/api/telegram')).linked, true);
  // Sozlamalardagi Telegram kartasi ham ulanganini ko'radi
  assert.equal((await srv.api(u, '/api/telegram')).tgUsername, 'vali_tg');
  // Mehmon akkaunti Telegram'ga ulanmaydi
  const guest = await srv.api(null, '/api/auth/guest', 'POST', { lang: 'uz' });
  const g = await srv.api({ token: guest.token }, '/api/telegram/webapp/link', 'POST', { initData: makeInitData(TOKEN, { id: 9003, first_name: 'G' }) });
  assert.equal(g.status, 403);
  assert.equal((await login(makeInitData(TOKEN, { id: 9003, first_name: 'G' }))).linked, false);
});

test("Mini App: bot tugmalari saytni Telegram ichida ochadi; sayt faqat o'zi va web.telegram.org ramkasida ochiladi", async () => {
  // Startda standart menyu tugmasi
  assert.ok(await waitFor(() => tg.calls.some((c) => c.method === 'setChatMenuButton' && !c.data.chat_id)));
  assert.equal(tg.calls.find((c) => c.method === 'setChatMenuButton' && !c.data.chat_id).data.menu_button.type, 'web_app');
  // /start javobi — web_app tugmasi
  const webhook = tg.calls.find((c) => c.method === 'setWebhook').data;
  await fetch(srv.base + '/api/telegram/webhook', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': webhook.secret_token },
    body: JSON.stringify({ update_id: 1, message: { message_id: 1, chat: { id: 9100, type: 'private' }, from: { id: 9100, language_code: 'en' }, text: '/start' } })
  });
  assert.ok(await waitFor(() => tg.calls.some((c) => c.method === 'sendMessage' && String(c.data.chat_id) === '9100')));
  const reply = tg.calls.find((c) => c.method === 'sendMessage' && String(c.data.chat_id) === '9100').data;
  assert.equal(reply.reply_markup.inline_keyboard[0][0].web_app.url, 'https://chesscaravan.com/');
  // Ramka: X-Frame-Options (ro'yxatni bilmaydi) o'rniga CSP frame-ancestors
  const h = (await fetch(srv.base + '/')).headers;
  assert.equal(h.get('x-frame-options'), null);
  assert.equal(h.get('content-security-policy'), "frame-ancestors 'self' https://web.telegram.org");
});
