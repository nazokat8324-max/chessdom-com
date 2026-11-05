// ✈️ Telegram bot (server tomoni): akkauntni ulash, bildirishnomalarni Telegram'ga yuborish, /invite /stop /help.
// Env: TELEGRAM_BOT_TOKEN (BotFather'dan). Bo'lmasa hammasi o'chiq. TELEGRAM_API — faqat testlar uchun (soxta API manzili).
// Webhook: POST /api/telegram/webhook, Telegram har so'rovda X-Telegram-Bot-Api-Secret-Token yuboradi (tokendan hosil qilingan).
// Bildirishnoma matni push bilan bir xil (push-texts.js pushMessage), turkum sozlamalari ham umumiy (users.push_prefs).
const crypto = require('crypto');
const { pushMessage, botText, langOf, LANGS } = require('./push-texts');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const API = (process.env.TELEGRAM_API || 'https://api.telegram.org').replace(/\/+$/, '');
const SECRET = TOKEN ? crypto.createHash('sha256').update('chessdom-tg:' + TOKEN).digest('hex').slice(0, 48) : '';
const LINK_TTL_MS = 15 * 60 * 1000;

let deps = null;          // { app, db, io, SITE_URL, isActive, authMiddleware, inviteUrl }
let botUsername = process.env.TELEGRAM_BOT_USERNAME || null;
let inlineEnabled = false; // BotFather → /setinline yoqilganmi (getMe.supports_inline_queries)
const linkCodes = new Map(); // kod → { userId, lang, exp }

const enabled = () => !!TOKEN;

async function call(method, body) {
  const res = await fetch(`${API}/bot${TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {})
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) { const err = new Error(data.description || ('Telegram ' + res.status)); err.code = data.error_code || res.status; throw err; }
  return data.result;
}

// ⭐ Rasmiy kanal (env TELEGRAM_CHANNEL, masalan "@chesscaravan"; bot kanalda admin bo'lishi kerak) — har kuni Kun o'yini (server.js)
const CHANNEL = (process.env.TELEGRAM_CHANNEL || '').trim();
const channelEnabled = () => enabled() && !!CHANNEL;
// multipart/form-data qo'lda yig'iladi: FormData + Blob fayl nomi bilan Node 18 da `buffer.File` ni ishlatadi va har postda
// "ExperimentalWarning" chiqarardi (admin "Xatolar" da ko'rindi, 2026-11-03)
function multipart(fields, file) {
  const boundary = '----cc' + crypto.randomBytes(12).toString('hex');
  const parts = [];
  for (const [name, value] of Object.entries(fields)) parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`, 'utf8'));
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.type}\r\n\r\n`, 'utf8'), file.data, Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'));
  return { body: Buffer.concat(parts), type: 'multipart/form-data; boundary=' + boundary };
}
async function postAnimation({ gif, caption, buttonText, url }) {
  const form = multipart({ chat_id: CHANNEL, caption, parse_mode: 'HTML', reply_markup: JSON.stringify(button(buttonText, url)) },
    { name: 'animation', filename: 'chesscaravan-game-of-the-day.gif', type: 'image/gif', data: gif });
  const res = await fetch(`${API}/bot${TOKEN}/sendAnimation`, { method: 'POST', headers: { 'Content-Type': form.type }, body: form.body });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) { const err = new Error(data.description || ('Telegram ' + res.status)); err.code = data.error_code || res.status; throw err; }
  return data.result;
}

const button = (text, url) => ({ inline_keyboard: [[{ text, url }]] });
// Kanalga matnli post (haftalik yakun — server.js postWeeklyToChannel); HTML, havola oldindan ko'rinishisiz
function postChannelText({ text, buttonText, url }) {
  return call('sendMessage', { chat_id: CHANNEL, text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: button(buttonText, url) });
}
// 📱 Mini App: sayt Telegram ichida ochiladi (faqat shaxsiy chatda; kanal postida — oddiy havola)
const appButton = (text, url) => ({ inline_keyboard: [[{ text, web_app: { url } }]] });

// Mini App kirish ma'lumoti (Telegram.WebApp.initData): imzo bot tokenidan — HMAC_SHA256("WebAppData", token) kalit,
// so'ng kalit bilan data_check_string (hash dan boshqa maydonlar, alifbo tartibida, "k=v" \n bilan). 24 soatdan eski — rad.
const INIT_MAX_AGE_S = 24 * 3600;
function verifyInitData(initData, now) {
  if (!enabled() || typeof initData !== 'string' || !initData || initData.length > 4096) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null;
  const check = [...params.entries()].filter(([k]) => k !== 'hash').sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => k + '=' + v).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  const expect = crypto.createHmac('sha256', secret).update(check).digest();
  if (!crypto.timingSafeEqual(expect, Buffer.from(hash, 'hex'))) return null;
  const authDate = Number(params.get('auth_date'));
  if (!authDate || Math.abs((now || Date.now()) / 1000 - authDate) > INIT_MAX_AGE_S) return null;
  let user = null;
  try { user = JSON.parse(params.get('user') || 'null'); } catch (e) { return null; }
  if (!user || !Number.isSafeInteger(user.id) || user.id <= 0) return null;
  return { id: String(user.id), username: typeof user.username === 'string' ? user.username.slice(0, 64) : null, lang: typeof user.language_code === 'string' ? user.language_code : null };
}
function send(chatId, text, markup) {
  return call('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true, ...(markup ? { reply_markup: markup } : {}) });
}

// notify() dan: foydalanuvchi saytni ko'rib turmagan bo'lsa va turkum yoqilgan bo'lsa
async function sendNotification(userId, type, data, opts) {
  if (!enabled() || !userId) return false;
  const force = opts && opts.force;
  if (!force && deps.isActive(userId)) return false;
  const link = await deps.db.getTelegramLink(userId);
  if (!link) return false;
  let ownName = null;
  if (['achievement', 'rank_up', 'duel_end', 'holiday_badge'].includes(type)) { const u = await deps.db.getUserById(userId); ownName = u && u.username; }
  const m = pushMessage(type, data, link.lang, ownName);
  if (!force) {
    const prefs = await deps.db.getPushPrefs(userId);
    if (prefs[m.category] === false) return false;
  }
  try {
    await send(link.chatId, m.body, appButton(botText('openShort', link.lang), deps.SITE_URL + m.url));
    return true;
  } catch (err) {
    // Foydalanuvchi botni bloklagan yoki chat yo'q — ulanishni o'chiramiz
    if (err.code === 403 || err.code === 400) await deps.db.unlinkTelegram({ chatId: link.chatId }).catch(() => {});
    else console.log('Telegram yuborish xatoligi:', err.message);
    return false;
  }
}

// Chat pastidagi menyu tugmasi — Mini App (shu chat uchun, foydalanuvchi tilida); xato bo'lsa jim
function setMenuButton(chatId, lang) {
  return call('setChatMenuButton', { chat_id: chatId, menu_button: { type: 'web_app', text: botText('open', lang), web_app: { url: deps.SITE_URL + '/' } } }).catch(() => {});
}

async function inviteReply(chatId, link) {
  const user = await deps.db.getUserById(link.userId);
  const url = await deps.inviteUrl(link.userId);
  const share = 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(botText('shareText', link.lang, { name: user ? user.username : '' }));
  return send(chatId, botText('invite', link.lang, { url }) + inlineTip(link.lang), button(botText('share', link.lang), share));
}
// BotFather'da keyin yoqilsa — server qayta ishga tushmasdan bilinadi (10 daqiqada bir marta getMe, faqat Sozlamalar ochilganda)
let inlineCheckedAt = 0;
function refreshInline() {
  if (inlineEnabled || Date.now() - inlineCheckedAt < 10 * 60 * 1000) return;
  inlineCheckedAt = Date.now();
  call('getMe').then((me) => { inlineEnabled = !!me.supports_inline_queries; }).catch(() => {});
}
const inlineTip = (lang) => (inlineEnabled && botUsername ? '\n\n' + botText('inlineTip', lang, { bot: botUsername }) : '');

// --- ⚔️ Inline chaqiruv: istalgan chatda "@bot" (yoki "@bot 5+3", "@bot 960", "@bot shatranj") → o'yinga chaqirish kartalari ---
// Karta xabari tugmasi — shaxsiy taklif havolasi (/?invite=<kod>&tc=<soniya>+<qo'shimcha>&r=1[&v=...]): do'st bossa sayt ochiladi,
// taklif qabul qilinadi (kirmagan bo'lsa — ro'yxatdan o'tish yoki mehmon), yuboruvchiga chaqiruv/bildirishnoma boradi (invite.js).
const INLINE_CLOCKS = [[180, 2], [300, 0], [600, 0], [60, 0]];
function clockLabel(initial, inc) {
  const m = initial / 60;
  const t = { 0.25: '¼', 0.5: '½', 0.75: '¾' }[m] || String(Math.round(m * 100) / 100);
  return t + '+' + inc;
}
function parseInlineQuery(text) {
  const s = String(text || '').toLowerCase().slice(0, 64);
  const variant = /960/.test(s) ? 'chess960' : /shatran|шатран|şatran|沙特/.test(s) ? 'shatranj' : 'standard';
  const m = /(?:^|\s)(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:\+\s*(\d{1,2}))?(?=\s|$)/.exec(s.replace(/960/g, ' '));
  let custom = null;
  if (m) {
    const min = Number(m[1].replace(',', '.')), inc = Number(m[2] || 0);
    if (min >= 0.5 && min <= 180 && inc <= 60) custom = [Math.round(min * 60), inc];
  }
  return { variant, custom };
}
async function handleInline(q) {
  const lang0 = langOf(q.from && q.from.language_code);
  const link = q.from ? await deps.db.getTelegramLinkByChat(String(q.from.id)) : null;
  const user = link && await deps.db.getUserById(link.userId);
  if (!user || (deps.isDeleted && deps.isDeleted(user.id)) || (deps.activeBan && deps.activeBan(user.id))) {
    return call('answerInlineQuery', { inline_query_id: q.id, results: [], cache_time: 0, is_personal: true, button: { text: botText('inlineLink', lang0), start_parameter: 'inline' } });
  }
  const lang = link.lang || lang0;
  const { variant, custom } = parseInlineQuery(q.query);
  const clocks = custom ? [custom, ...INLINE_CLOCKS.filter(c => c[0] !== custom[0] || c[1] !== custom[1])] : INLINE_CLOCKS;
  const base = await deps.inviteUrl(user.id);
  const vName = variant === 'chess960' ? ' · Chess960' : variant === 'shatranj' ? ' · Shatranj' : '';
  const vParam = variant === 'chess960' ? '&v=960' : variant === 'shatranj' ? '&v=shatranj' : '';
  const vars = { name: user.username, rating: Math.round(Number(user.rating) || 1500) };
  const results = clocks.slice(0, 5).map(([initial, inc]) => {
    const clock = clockLabel(initial, inc) + vName;
    return {
      type: 'article', id: initial + '_' + inc + '_' + variant,
      title: botText('inlineTitle', lang, { clock }),
      description: botText('inlineDesc', lang, vars),
      thumbnail_url: deps.SITE_URL + '/assets/icons/icon-192.png',
      input_message_content: { message_text: botText('inlineMsg', lang, { ...vars, clock }) },
      reply_markup: button(botText('inlinePlay', lang), base + '&tc=' + initial + '+' + inc + '&r=1' + vParam)
    };
  });
  return call('answerInlineQuery', { inline_query_id: q.id, results, cache_time: 0, is_personal: true });
}

async function handleUpdate(update) {
  if (update && update.inline_query) { inlineEnabled = true; return handleInline(update.inline_query); } // so'rov keldi — demak yoqilgan
  const msg = update && update.message;
  if (!msg || !msg.chat || msg.chat.type !== 'private' || typeof msg.text !== 'string') return;
  const chatId = String(msg.chat.id);
  const text = msg.text.trim();
  const [cmdRaw, arg] = text.split(/\s+/, 2);
  const cmd = cmdRaw.toLowerCase().replace(/@\w+$/, '');
  const link = await deps.db.getTelegramLinkByChat(chatId);
  const lang = (link && link.lang) || langOf(msg.from && msg.from.language_code);

  if (cmd === '/start') {
    const entry = arg && linkCodes.get(arg);
    if (entry && entry.exp > Date.now()) {
      linkCodes.delete(arg);
      const user = await deps.db.getUserById(entry.userId);
      if (!user) return send(chatId, botText('badCode', lang));
      const l = entry.lang || lang;
      await deps.db.linkTelegram(user.id, chatId, msg.from && msg.from.username, l);
      deps.io.to(`user_${user.id}`).emit('telegram-linked', { linked: true });
      await setMenuButton(chatId, l);
      return send(chatId, botText('linked', l, { name: user.username }) + inlineTip(l), appButton(botText('open', l), deps.SITE_URL + '/'));
    }
    // Inline'dagi "akkauntni ulang" tugmasi → /start inline
    if (arg === 'inline') return send(chatId, link ? botText('inlineTip', lang, { bot: botUsername || '' }) : botText('inlineHow', lang, { bot: botUsername || '' }), appButton(botText('open', lang), deps.SITE_URL + '/'));
    if (arg) return send(chatId, botText('badCode', lang));
    await setMenuButton(chatId, lang);
    if (link) return send(chatId, botText('already', lang, { name: link.username }), appButton(botText('open', lang), deps.SITE_URL + '/'));
    return send(chatId, botText('welcome', lang), appButton(botText('open', lang), deps.SITE_URL + '/'));
  }
  if (cmd === '/stop') {
    if (link) {
      await deps.db.unlinkTelegram({ chatId });
      deps.io.to(`user_${link.userId}`).emit('telegram-linked', { linked: false });
    }
    return send(chatId, botText('stopped', lang));
  }
  if (cmd === '/invite') {
    if (!link) return send(chatId, botText('notLinked', lang));
    return inviteReply(chatId, link);
  }
  return send(chatId, botText('help', lang));
}

function init(d) {
  deps = d;
  const { app, db, authMiddleware } = d;

  // Holat: bot sozlanganmi, men ulanganmanmi
  app.get('/api/telegram', authMiddleware, async (req, res) => {
    try {
      if (!enabled()) return res.json({ success: true, enabled: false });
      refreshInline();
      const link = await db.getTelegramLink(req.user.userId);
      res.json({ success: true, enabled: true, bot: botUsername, inline: inlineEnabled, linked: !!link, tgUsername: link ? link.tgUsername : null });
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  // Ulash: bir martalik kod → t.me/<bot>?start=<kod> (15 daqiqa)
  app.post('/api/telegram/link', authMiddleware, (req, res) => {
    if (!enabled() || !botUsername) return res.status(503).json({ success: false, message: 'Telegram bot sozlanmagan' });
    for (const [k, v] of linkCodes) if (v.exp < Date.now() || v.userId === req.user.userId) linkCodes.delete(k);
    const code = crypto.randomBytes(12).toString('hex');
    const lang = LANGS.concat(['uzc']).includes(req.body && req.body.lang) ? req.body.lang : null;
    linkCodes.set(code, { userId: req.user.userId, lang, exp: Date.now() + LINK_TTL_MS });
    res.json({ success: true, url: `https://t.me/${botUsername}?start=${code}` });
  });
  app.post('/api/telegram/unlink', authMiddleware, async (req, res) => {
    try { await db.unlinkTelegram({ userId: req.user.userId }); res.json({ success: true }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.post('/api/telegram/test', authMiddleware, async (req, res) => {
    try {
      const link = enabled() && await db.getTelegramLink(req.user.userId);
      if (!link) return res.status(400).json({ success: false, message: 'Telegram ulanmagan' });
      await send(link.chatId, botText('test', link.lang), appButton(botText('open', link.lang), deps.SITE_URL + '/'));
      res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  // 📱 Mini App: Telegram'i ulangan o'yinchi parolsiz kiradi; ulanmagan bo'lsa — linked: false (klient oddiy kirish/ro'yxatni ko'rsatadi)
  app.post('/api/telegram/webapp/login', async (req, res) => {
    try {
      const tg = verifyInitData(req.body && req.body.initData);
      if (!tg) return res.status(401).json({ success: false, message: "Telegram ma'lumoti noto'g'ri" });
      const link = await db.getTelegramLinkByChat(tg.id);
      if (!link) return res.json({ success: true, linked: false, tgUsername: tg.username });
      const user = await db.getUserById(link.userId);
      if (!user || d.isDeleted(user.id)) return res.json({ success: true, linked: false, tgUsername: tg.username });
      const ban = d.activeBan(user.id);
      if (ban) return res.status(403).json({ success: false, banned: true, message: d.banMessage(ban) });
      res.json({ success: true, linked: true, lang: link.lang || null, ...(await d.issueSession(user)) });
    } catch (err) { console.error('Mini App kirish xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  // Kirgan (yoki ro'yxatdan o'tgan) o'yinchining akkauntiga shu Telegram'ni ulash — keyingi safar avtomatik kiradi
  app.post('/api/telegram/webapp/link', authMiddleware, async (req, res) => {
    try {
      const tg = verifyInitData(req.body && req.body.initData);
      if (!tg) return res.status(401).json({ success: false, message: "Telegram ma'lumoti noto'g'ri" });
      const lang = LANGS.concat(['uzc']).includes(req.body.lang) ? req.body.lang : langOf(tg.lang);
      await db.linkTelegram(req.user.userId, tg.id, tg.username, lang);
      deps.io.to(`user_${req.user.userId}`).emit('telegram-linked', { linked: true });
      setMenuButton(tg.id, lang);
      res.json({ success: true });
    } catch (err) { console.error('Mini App ulash xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  // Telegram → server
  app.post('/api/telegram/webhook', (req, res) => {
    if (!enabled() || req.headers['x-telegram-bot-api-secret-token'] !== SECRET) return res.status(403).end();
    res.json({ ok: true }); // Telegram kutib qolmasin — javob darhol
    // Inline javob xatosi admin "Xatolar" ga tushadi (karta chiqmasa sababini ko'rish uchun); oddiy xabarlarda — faqat jurnal
    handleUpdate(req.body).catch(err => (req.body && req.body.inline_query ? console.error : console.log)('Telegram update xatoligi:', err.message));
  });

  if (!enabled()) return;
  // Bot nomi, webhook va buyruqlar ro'yxati (har til uchun)
  (async () => {
    try {
      const me = await call('getMe');
      botUsername = me.username;
      inlineEnabled = !!me.supports_inline_queries;
      inlineCheckedAt = Date.now();
      if (!inlineEnabled) console.log("✈️ Telegram inline rejimi o'chiq (BotFather → /setinline) — chatlarda @" + botUsername + ' chaqiruvi ishlamaydi');
      await call('setWebhook', { url: deps.SITE_URL + '/api/telegram/webhook', secret_token: SECRET, allowed_updates: ['message', 'inline_query'], drop_pending_updates: false });
      for (const l of LANGS) {
        await call('setMyCommands', {
          commands: [{ command: 'invite', description: botText('cmdInvite', l) }, { command: 'stop', description: botText('cmdStop', l) }, { command: 'help', description: botText('cmdHelp', l) }],
          ...(l === 'en' ? {} : { language_code: l })
        });
      }
      await call('setChatMenuButton', { menu_button: { type: 'web_app', text: '♞ ChessCaravan', web_app: { url: deps.SITE_URL + '/' } } });
      console.log('✈️ Telegram bot tayyor: @' + botUsername);
    } catch (err) { console.error('Telegram botni sozlab bo\'lmadi:', err.message); }
  })();
}

module.exports = { init, enabled, sendNotification, channelEnabled, postAnimation, postChannelText, verifyInitData, parseInlineQuery, clockLabel };
