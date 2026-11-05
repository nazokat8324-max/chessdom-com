// ✈️ Telegram inline chaqiruv: istalgan chatda "@bot" → vaqt nazoratlari bilan o'yinga chaqirish kartalari; tugma — shaxsiy taklif havolasi
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, sleep } = require('./helpers');
const { startFakeTelegram, makeInitData } = require('./fixtures/telegram');
const { parseInlineQuery, clockLabel } = require('../telegram');

const TOKEN = '123:TEST';
let srv, tg, secret;
before(async () => {
  tg = await startFakeTelegram();
  srv = await startServer({ TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_API: tg.api });
  for (let i = 0; i < 80 && !tg.calls.some((c) => c.method === 'setWebhook'); i++) await sleep(50);
  secret = tg.calls.find((c) => c.method === 'setWebhook').data.secret_token;
});
after(async () => { await srv.stop(); await tg.stop(); });

const hook = (update) => fetch(srv.base + '/api/telegram/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': secret }, body: JSON.stringify(update) });
const waitCall = async (pred, ms = 4000) => {
  const end = Date.now() + ms;
  for (;;) { const c = tg.calls.find(pred); if (c) return c.data; if (Date.now() > end) throw new Error('Telegram chaqiruvi kelmadi'); await sleep(50); }
};
let n = 0;
async function inline(fromId, query, lang) {
  const id = 'q' + (++n);
  await hook({ update_id: 1000 + n, inline_query: { id, from: { id: fromId, language_code: lang || 'uz' }, query, offset: '' } });
  return waitCall((c) => c.method === 'answerInlineQuery' && c.data.inline_query_id === id);
}

test("Inline chaqiruv: so'rov matni (vaqt, Chess960, Shatranj) to'g'ri tushuniladi", () => {
  assert.deepEqual(parseInlineQuery(''), { variant: 'standard', custom: null });
  assert.deepEqual(parseInlineQuery('5+3'), { variant: 'standard', custom: [300, 3] });
  assert.deepEqual(parseInlineQuery('10'), { variant: 'standard', custom: [600, 0] });
  assert.deepEqual(parseInlineQuery('960 1+0'), { variant: 'chess960', custom: [60, 0] });
  assert.deepEqual(parseInlineQuery('Shatranj 15+10'), { variant: 'shatranj', custom: [900, 10] });
  assert.deepEqual(parseInlineQuery('999 salom'), { variant: 'standard', custom: null }, '180 daqiqadan ortiq — standart ro\'yxat');
  assert.deepEqual([clockLabel(30, 0), clockLabel(180, 2), clockLabel(90, 1)], ['½+0', '3+2', '1.5+1']);
});

test("Inline chaqiruv: webhook inline so'rovlarni oladi; ulanmagan Telegram — «akkauntni ulang» tugmasi va /start inline yo'riqnomasi", async () => {
  assert.deepEqual(tg.calls.find((c) => c.method === 'setWebhook').data.allowed_updates, ['message', 'inline_query']);
  const r = await inline(9500, '');
  assert.deepEqual(r.results, []);
  assert.equal(r.button.start_parameter, 'inline');
  assert.match(r.button.text, /akkauntni ulang/);
  await hook({ update_id: 1, message: { message_id: 1, chat: { id: 9500, type: 'private' }, from: { id: 9500, language_code: 'en' }, text: '/start inline' } });
  const msg = await waitCall((c) => c.method === 'sendMessage' && String(c.data.chat_id) === '9500');
  assert.match(msg.text, /connect your account first.*@cc_test_bot/s, "noto'g'ri kod emas — yo'riqnoma");
});

test("Inline chaqiruv: ulangan o'yinchiga 4 ta vaqt kartasi; tugma taklif havolasi; do'st bossa — yuboruvchiga chaqiruv shu vaqt bilan keladi", async () => {
  const A = await srv.register('Ti');
  assert.equal((await srv.api(A, '/api/telegram/webapp/link', 'POST', { initData: makeInitData(TOKEN, { id: 9501, first_name: 'A' }), lang: 'uz' })).success, true);
  const st = await srv.api(A, '/api/telegram');
  assert.deepEqual([st.inline, st.bot], [true, 'cc_test_bot'], 'Sozlamalar maslahati uchun');
  const code = (await srv.api(A, '/api/invite')).code;
  let r = await inline(9501, '');
  assert.deepEqual(r.results.map((x) => x.id), ['180_2_standard', '300_0_standard', '600_0_standard', '60_0_standard']);
  assert.equal(r.is_personal, true);
  const first = r.results[0];
  assert.equal(first.type, 'article');
  assert.match(first.title, /3\+2 — o'yinga chaqirish/);
  assert.match(first.input_message_content.message_text, new RegExp(A.name + " sizni shaxmat o'yiniga chaqiryapti!\\n⏱ 3\\+2"));
  assert.equal(first.reply_markup.inline_keyboard[0][0].url, 'https://chesscaravan.com/?invite=' + code + '&tc=180+2&r=1');
  // O'zi yozgan vaqt birinchi, Chess960
  r = await inline(9501, '5+3 960');
  assert.deepEqual(r.results.slice(0, 2).map((x) => x.id), ['300_3_chess960', '180_2_chess960']);
  assert.match(r.results[0].input_message_content.message_text, /⏱ 5\+3 · Chess960/);
  const url = new URL(r.results[0].reply_markup.inline_keyboard[0][0].url);
  // Do'st tugmani bosdi: sayt havolani xuddi invite.js kabi o'qiydi (URL da "+" — bo'sh joy) va taklifni qabul qiladi
  const tc = /^(\d{1,5})[+ ](\d{1,2})$/.exec(url.searchParams.get('tc'));
  assert.ok(tc, 'tc formati invite.js ga mos');
  const B = await srv.register('Tj');
  const a = await srv.connect(A), b = await srv.connect(B);
  const got = new Promise((res) => a.once('challenge-received', res));
  const ack = await new Promise((res) => b.emit('invite-accept', { code: url.searchParams.get('invite'), initial: Number(tc[1]), increment: Number(tc[2]), rated: url.searchParams.get('r') === '1', variant: url.searchParams.get('v') === '960' ? 'chess960' : 'standard' }, res));
  assert.equal(ack.status, 'sent');
  const ch = await got;
  assert.deepEqual([ch.clock.initial, ch.clock.increment, ch.variant], [300, 3, 'chess960']);
  a.disconnect(); b.disconnect();
  // /invite javobida maslahat
  await hook({ update_id: 2, message: { message_id: 2, chat: { id: 9501, type: 'private' }, from: { id: 9501, language_code: 'uz' }, text: '/invite' } });
  const inv = await waitCall((c) => c.method === 'sendMessage' && String(c.data.chat_id) === '9501' && /invite=/.test(c.data.text));
  assert.match(inv.text, /💡 Istalgan chatda @cc_test_bot deb yozing/);
});
