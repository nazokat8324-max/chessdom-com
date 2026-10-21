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

const button = (text, url) => ({ inline_keyboard: [[{ text, url }]] });
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
  if (['mentor_request', 'achievement', 'rank_up'].includes(type)) { const u = await deps.db.getUserById(userId); ownName = u && u.username; }
  const m = pushMessage(type, data, link.lang, ownName);
  if (!force) {
    const prefs = await deps.db.getPushPrefs(userId);
    if (prefs[m.category] === false) return false;
  }
  try {
    await send(link.chatId, m.body, button(botText('openShort', link.lang), deps.SITE_URL + m.url));
    return true;
  } catch (err) {
    // Foydalanuvchi botni bloklagan yoki chat yo'q — ulanishni o'chiramiz
    if (err.code === 403 || err.code === 400) await deps.db.unlinkTelegram({ chatId: link.chatId }).catch(() => {});
    else console.log('Telegram yuborish xatoligi:', err.message);
    return false;
  }
}

async function inviteReply(chatId, link) {
  const user = await deps.db.getUserById(link.userId);
  const url = await deps.inviteUrl(link.userId);
  const share = 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(botText('shareText', link.lang, { name: user ? user.username : '' }));
  return send(chatId, botText('invite', link.lang, { url }), button(botText('share', link.lang), share));
}

async function handleUpdate(update) {
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
      return send(chatId, botText('linked', l, { name: user.username }), button(botText('open', l), deps.SITE_URL + '/'));
    }
    if (arg) return send(chatId, botText('badCode', lang));
    if (link) return send(chatId, botText('already', lang, { name: link.username }), button(botText('open', lang), deps.SITE_URL + '/'));
    return send(chatId, botText('welcome', lang), button(botText('open', lang), deps.SITE_URL + '/'));
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
      const link = await db.getTelegramLink(req.user.userId);
      res.json({ success: true, enabled: true, bot: botUsername, linked: !!link, tgUsername: link ? link.tgUsername : null });
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  // Ulash: bir martalik kod → t.me/<bot>?start=<kod> (15 daqiqa)
  app.post('/api/telegram/link', authMiddleware, (req, res) => {
    if (!enabled() || !botUsername) return res.status(503).json({ success: false, message: 'Telegram bot sozlanmagan' });
    for (const [k, v] of linkCodes) if (v.exp < Date.now() || v.userId === req.user.userId) linkCodes.delete(k);
    const code = crypto.randomBytes(12).toString('hex');
    const lang = LANGS.includes(req.body && req.body.lang) ? req.body.lang : null;
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
      await send(link.chatId, botText('test', link.lang), button(botText('open', link.lang), deps.SITE_URL + '/'));
      res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  // Telegram → server
  app.post('/api/telegram/webhook', (req, res) => {
    if (!enabled() || req.headers['x-telegram-bot-api-secret-token'] !== SECRET) return res.status(403).end();
    res.json({ ok: true }); // Telegram kutib qolmasin — javob darhol
    handleUpdate(req.body).catch(err => console.log('Telegram update xatoligi:', err.message));
  });

  if (!enabled()) return;
  // Bot nomi, webhook va buyruqlar ro'yxati (har til uchun)
  (async () => {
    try {
      const me = await call('getMe');
      botUsername = me.username;
      await call('setWebhook', { url: deps.SITE_URL + '/api/telegram/webhook', secret_token: SECRET, allowed_updates: ['message'], drop_pending_updates: false });
      for (const l of LANGS) {
        await call('setMyCommands', {
          commands: [{ command: 'invite', description: botText('cmdInvite', l) }, { command: 'stop', description: botText('cmdStop', l) }, { command: 'help', description: botText('cmdHelp', l) }],
          ...(l === 'en' ? {} : { language_code: l })
        });
      }
      console.log('✈️ Telegram bot tayyor: @' + botUsername);
    } catch (err) { console.error('Telegram botni sozlab bo\'lmadi:', err.message); }
  })();
}

module.exports = { init, enabled, sendNotification };
