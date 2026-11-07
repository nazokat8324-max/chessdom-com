// ⭐ Kun o'yini Telegram kanalida: GIF (daygif.js) va post (soxta Telegram API bilan) — bir kunda bir marta, admin sinovi
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { startServer, startGame, play, finish, closeAll } = require('./helpers');
const { makeGameGif, SIZE } = require('../daygif');

// GIF bloklarini o'qib kadrlar sonini sanaydi (LZW ichidagi tasodifiy baytlarga aldanmaslik uchun)
function gifFrames(buf) {
  assert.equal(buf.subarray(0, 6).toString(), 'GIF89a');
  const w = buf.readUInt16LE(6), h = buf.readUInt16LE(8);
  let p = 13;
  if (buf[10] & 0x80) p += 3 * (1 << ((buf[10] & 7) + 1));
  const skipSub = () => { while (buf[p]) p += buf[p] + 1; p++; };
  let frames = 0, delays = [];
  for (;;) {
    const b = buf[p++];
    if (b === 0x3b) break;
    if (b === 0x21) {
      const label = buf[p++];
      if (label === 0xf9) delays.push(buf.readUInt16LE(p + 2) * 10);
      skipSub();
    } else if (b === 0x2c) {
      const flags = buf[p + 8];
      p += 9;
      if (flags & 0x80) p += 3 * (1 << ((flags & 7) + 1));
      p++; // LZW minimal kod o'lchami
      skipSub();
      frames++;
    } else throw new Error('Noma\'lum blok ' + b + ' @' + p);
  }
  return { w, h, frames, delays };
}

const RUY = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5a4', 'g8f6', 'e1g1', 'f8e7', 'f1e1', 'b7b5', 'a4b3', 'd7d6', 'c2c3', 'e8g8', 'h2h3', 'c6a5', 'b3c2', 'c7c5', 'd2d4', 'd8c7'];

test("Kun o'yini GIF: har yurish alohida kadr, boshida va oxirida pauza, Chess960/Shatranj ham", async () => {
  const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'];
  const g = gifFrames(await makeGameGif({ moves: sans }));
  assert.equal(g.w, SIZE); assert.equal(g.h, SIZE);
  assert.equal(g.frames, sans.length + 1, "boshlang'ich pozitsiya + har yurish");
  assert.equal(g.delays[0], 1000);
  assert.equal(g.delays[g.delays.length - 1], 4000, 'yakuniy pozitsiyada uzoq pauza');
  // UCI yozuvi ham, Shatranj va Chess960 ham
  assert.equal(gifFrames(await makeGameGif({ moves: RUY })).frames, RUY.length + 1);
  assert.equal(gifFrames(await makeGameGif({ moves: ['e2e3', 'e7e6'], variant: 'shatranj' })).frames, 3);
  assert.equal(gifFrames(await makeGameGif({ moves: ['e4', 'e5'], variant: 'chess960', startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w HAha - 0 1' })).frames, 3);
  // Noqonuniy yurishda to'xtaydi, yurishsiz o'yin — GIF yo'q
  assert.equal(gifFrames(await makeGameGif({ moves: ['e4', 'Ke9', 'e5'] })).frames, 2);
  assert.equal(await makeGameGif({ moves: [] }), null);
});

let srv, tg, failAnimation = false;
const posts = [];
const texts = []; // kanalga matnli postlar (sendMessage — haftalik yakun)
before(async () => {
  // Soxta Telegram Bot API: JSON (getMe, setWebhook…) va multipart (sendAnimation)
  tg = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const method = req.url.split('/').pop();
      const body = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/json');
      if (method === 'sendMessage') { try { const j = JSON.parse(body.toString('utf8')); if (j.chat_id === '@cc_test_channel') texts.push(j); } catch (e) {} }
      if (method === 'sendAnimation') {
        if (failAnimation) { res.statusCode = 400; return res.end(JSON.stringify({ ok: false, error_code: 400, description: 'Bad Request: chat not found' })); }
        posts.push({ type: req.headers['content-type'], body });
      }
      res.end(JSON.stringify({ ok: true, result: method === 'getMe' ? { id: 1, is_bot: true, username: 'cc_test_bot' } : {} }));
    });
  });
  await new Promise((r) => tg.listen(0, r));
  srv = await startServer({ TELEGRAM_BOT_TOKEN: '123:TEST', TELEGRAM_API: 'http://localhost:' + tg.address().port, TELEGRAM_CHANNEL: '@cc_test_channel', ADMIN_USERNAMES: 'ChanAdmin' });
});
after(async () => { await srv.stop(); tg.close(); });

// Multipart maydoni (matn) va fayl
const field = (post, name) => { const m = post.body.toString('utf8').match(new RegExp('name="' + name + '"\\r\\n\\r\\n([\\s\\S]*?)\\r\\n--')); return m && m[1]; };
const fileOf = (post) => { const s = post.body.toString('latin1'); const i = s.indexOf('GIF89a'); return i < 0 ? null : post.body.subarray(i, s.indexOf('\r\n--', i)); };

test("Kun o'yini kanalda: GIF + matn + saytga tugma, bir kunda bir marta; mos o'yin bo'lmasa — post yo'q", async () => {
  const a = await srv.register('Cha'), b = await srv.register('Chb');
  const game = await startGame(srv, a, b, { rated: true });
  await play(game, RUY);
  await finish(game, 'white-resigns');
  closeAll(a, b);
  const tz = 5 * 3600000;
  const local = new Date(Date.now() + tz);
  const tomorrow = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) - tz + 20 * 3600000;

  const r = await srv.api(null, '/api/test/channel-post?now=' + tomorrow, 'POST');
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(posts.length, 1);
  const p = posts[0];
  // So'rov o'zimiz yig'gan multipart (FormData + Blob Node 18 da "ExperimentalWarning: buffer.File" chiqarardi)
  assert.match(p.type, /^multipart\/form-data; boundary=----cc[0-9a-f]{24}$/);
  assert.equal(field(p, 'chat_id'), '@cc_test_channel');
  assert.equal(field(p, 'parse_mode'), 'HTML');
  const caption = field(p, 'caption');
  const day = new Date(tomorrow + tz).toISOString().slice(0, 10).split('-').reverse().join('.');
  assert.match(caption, new RegExp("⭐ <b>Kun o'yini</b> · " + day.replace(/\./g, '\\.')));
  assert.ok(caption.includes('⚪ ' + game.white.name + ' (') && caption.includes('⚫ ' + game.black.name + ' ('), caption);
  assert.match(caption, /🏆 0–1 · taslim/);
  assert.match(caption, /📖 Ruy Lopez[^\n]*\(C\d\d\)/, 'debyut nomi');
  assert.match(caption, /♟ 11 yurish/);
  const markup = JSON.parse(field(p, 'reply_markup'));
  assert.equal(markup.inline_keyboard[0][0].url, 'https://chesscaravan.com/jonli');
  const gif = fileOf(p);
  assert.ok(gif, 'GIF fayli');
  assert.equal(gifFrames(gif).frames, RUY.length + 1);
  // Fayl baytma-bayt buzilmasdan yetadi
  const boundary = p.type.split('boundary=')[1];
  const s = p.body.toString('latin1'), from = s.indexOf('GIF89a'), to = s.indexOf('\r\n--' + boundary + '--', from);
  assert.deepEqual(p.body.subarray(from, to), await makeGameGif({ moves: RUY }));

  // Shu kuni qayta — yo'q (server qayta ishga tushsa ham — app_settings da)
  assert.equal((await srv.api(null, '/api/test/channel-post?now=' + (tomorrow + 3600000), 'POST')).reason, 'done');
  assert.equal(posts.length, 1);
  // 40 kundan keyin — kechagi va oxirgi 7 kunda o'yin yo'q
  assert.equal((await srv.api(null, '/api/test/channel-post?now=' + (tomorrow + 40 * 864e5), 'POST')).reason, 'no_game');
  assert.equal(posts.length, 1);
});

test("Kun o'yini kanalda: admin hozir yubora oladi (jurnalga yoziladi), oddiy o'yinchi — yo'q; Telegram rad etsa xato qaytadi", async () => {
  const user = await srv.register('Chu');
  assert.equal((await srv.api(user, '/api/admin/telegram/channel-post', 'POST')).status, 403);
  const reg = await srv.api(null, '/api/auth/register', 'POST', { username: 'ChanAdmin', email: 'chanadmin@test.uz', password: 'secret1' });
  const ADM = { token: reg.token };
  assert.equal((await srv.api(ADM, '/api/admin/stats')).stats.tgChannel, true, 'admin panelida tugma ko\'rinadi');
  // Bugun (Toshkent) uchun kechagi o'yin yo'q bo'lishi mumkin — oldingi testdagi o'yin bugungi; shuning uchun natija ok yoki no_game
  const r = await srv.api(ADM, '/api/admin/telegram/channel-post', 'POST');
  assert.ok(r.success === true || r.reason === 'no_game', JSON.stringify(r));
  if (r.success) assert.ok((await srv.api(ADM, '/api/admin/audit?action=tg_channel')).actions.length >= 1);
  // Telegram rad etsa (bot kanalda admin emas) — 502, test yo'li orqali
  failAnimation = true;
  const a = await srv.register('Chc'), b = await srv.register('Chd');
  const game = await startGame(srv, a, b, { rated: false });
  await play(game, RUY);
  await finish(game, 'black-resigns');
  closeAll(a, b);
  const tz = 5 * 3600000, local = new Date(Date.now() + tz);
  const tomorrow = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) - tz + 21 * 3600000;
  const bad = await srv.api(null, '/api/test/channel-post?now=' + tomorrow + '&force=1', 'POST');
  assert.equal(bad.status, 502);
  failAnimation = false;
});

test("Haftalik yakun: top o'yinchilar, reyting o'sishi, Bayroqlar bellashuvi va raqamlar — haftada bir marta; o'yinsiz haftada post yo'q", async () => {
  const a = await srv.register('Wka'), b = await srv.register('Wkb');
  await srv.api(a, '/api/country-clubs/join', 'POST', { country: 'Uzbekistan', code: 'uz' });
  await srv.api(a, '/api/users/me/country', 'POST', { country: 'uz' });
  await srv.api(b, '/api/users/me/country', 'POST', { country: 'kz' }); // pasport: a — Qozog'iston (oltin), b — O'zbekiston
  for (let i = 0; i < 2; i++) {
    const game = await startGame(srv, a, b, { rated: true });
    await play(game, RUY);
    // a qaysi rangda bo'lsa ham — a yutadi (b taslim bo'ladi)
    await finish(game, game.white.name === a.name ? 'black-resigns' : 'white-resigns');
    closeAll(a, b);
  }
  const r = await srv.api(null, '/api/test/channel-weekly', 'POST');
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(texts.length, 1);
  const m = texts[0];
  if (process.env.SHOW_POST) console.log('POST>>>\n' + m.text + '\n<<<');
  assert.equal(m.parse_mode, 'HTML');
  assert.match(m.text, /^📊 <b>Haftalik yakun<\/b> · \d\d\.\d\d – \d\d\.\d\d\.\d{4}/);
  assert.ok(m.text.includes('🥇 ' + a.name + " — 2 g'alaba ("), m.text);
  assert.match(m.text, new RegExp('1\\. ' + a.name + ' \\+\\d+'), "reyting o'sishi");
  assert.ok(!m.text.includes(b.name + ' +'), "reytingi tushgan o'sganlar orasida yo'q");
  assert.match(m.text, /🚩 <b>Bayroqlar bellashuvi<\/b> · (Yanvar|Fevral|Mart|Aprel|May|Iyun|Iyul|Avgust|Sentabr|Oktabr|Noyabr|Dekabr)/);
  assert.match(m.text, /🇺🇿 O'zbekiston — \d+ hudud, \d+ ochko/, "o'zbekcha davlat nomi va bayroq");
  assert.ok(m.text.includes("🛂 <b>Shaxmat pasporti: eng ko'p yangi davlat</b>\n1. " + a.name + ' — 1 ta yangi muhr (1 ta oltin)\n2. ' + b.name + ' — 1 ta yangi muhr\n'), m.text);
  assert.match(m.text, /♟ \d+ o'yin · 👥 \d+ faol o'yinchi · 🆕 \d+ yangi o'yinchi/);
  assert.equal(m.reply_markup.inline_keyboard[0][0].url, 'https://chesscaravan.com/reyting');
  // Shu haftada qayta — yo'q; 3 hafta keyin (o'yinsiz hafta) — post yo'q
  assert.equal((await srv.api(null, '/api/test/channel-weekly', 'POST')).reason, 'done');
  assert.equal((await srv.api(null, '/api/test/channel-weekly?now=' + (Date.now() + 21 * 864e5), 'POST')).reason, 'no_game');
  assert.equal(texts.length, 1);
  // Admin "Haftalik yakunni yuborish" — majburan, jurnalga yoziladi
  const reg = await srv.api(null, '/api/auth/login', 'POST', { username: 'ChanAdmin', password: 'secret1' });
  const ADM = { token: reg.token };
  assert.equal((await srv.api(ADM, '/api/admin/telegram/channel-weekly', 'POST')).success, true);
  assert.equal(texts.length, 2);
  assert.ok((await srv.api(ADM, '/api/admin/audit?action=tg_channel_weekly')).actions.length >= 1);
});
