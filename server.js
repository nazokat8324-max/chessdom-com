const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const { Chess } = require('chess.js');
const Chess960 = require('./chess960');
const Shatranj = require('./shatranj');
// O'yin turlari: standart, Chess960 va Shatranj (ikkalasi ham — alohida reyting, umumiy reytingga ta'sir qilmaydi)
const VARIANTS = ['standard', 'chess960', 'shatranj'];
const normVariant = (v) => (VARIANTS.includes(v) ? v : 'standard');
const Caravan = require('./caravan');
const Holidays = require('./holidays');
const teamchess = require('./teamchess');
const FairplayEngine = require('./fairplay-engine');
let teamChess = null; // 🤝 2 ga 2 (start() da init)
// Faqat testlar: HOLIDAY_FORCE=navruz — bayram hozir davom etayotgandek
const HOLIDAY_FORCE = process.env.NODE_ENV === 'test' ? process.env.HOLIDAY_FORCE || null : null;
const Quests = require('./quests');

const db = require('./database');
const league = require('./league');
const mailer = require('./mailer');
const crypto = require('crypto');
const webpush = require('web-push');
const { pushMessage } = require('./push-texts');
const backup = require('./backup');
const telegram = require('./telegram');
const util = require('util');
const escapeHtml = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const app = express();
const server = http.createServer(app);
const JWT_SECRET = process.env.JWT_SECRET || 'justchess_secret_key_2024';
if (!process.env.JWT_SECRET) {
  console.warn("OGOHLANTIRISH: JWT_SECRET o'rnatilmagan — koddagi standart kalit ishlatilmoqda. Production'da albatta o'rnating!");
}
const PORT = process.env.PORT || 3000;
// Sayt versiyasi: Render har deployda RENDER_GIT_COMMIT beradi; lokal ishlashda — server ishga tushgan vaqt
const APP_VERSION = process.env.RENDER_GIT_COMMIT || String(Date.now());

const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// Render (va boshqa hostinglar) so'rovlarni proksi orqali uzatadi: haqiqiy IP X-Forwarded-For da.
// Busiz barcha foydalanuvchilar bitta IP bo'lib ko'rinadi va rate limit butun sayt uchun umumiy bo'lib qoladi.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
// Eng katta so'rov — profil rasmi (≤ 200 KB, base64 ~270 KB); 10 MB xotirani band qilishga yo'l ochardi
app.use(express.json({ limit: '1mb' }));
// Express 5 da tanasiz so'rovlarda req.body undefined bo'ladi — routelar uni doim obyekt deb kutadi
app.use((req, res, next) => { if (req.body === undefined) req.body = {}; next(); });
// Sayt manzili: rasmiy domen; Render manzili (*.onrender.com) sahifalari shu domenga 301 bilan yo'naltiriladi
// (API va socket ochiq qoladi — eski ochiq oynalar va zaxira workflow'i ishlayveradi)
const SITE_URL = (process.env.APP_URL || 'https://chesscaravan.com').replace(/\/+$/, '');
const SITE_HOST = (() => { try { return new URL(SITE_URL).host; } catch (e) { return ''; } })();
app.use((req, res, next) => {
  const host = String(req.headers.host || '').toLowerCase();
  if (SITE_HOST && host !== SITE_HOST && host.endsWith('.onrender.com') && (req.method === 'GET' || req.method === 'HEAD') && !req.path.startsWith('/api/')) {
    return res.redirect(301, SITE_URL + req.originalUrl);
  }
  next();
});
// Loyiha papkasi statik beriladi — server fayllari, sozlamalar va hujjatlar tashqariga ko'rsatilmaydi
const PRIVATE_FILES = /^\/(server|database|league|mailer|continents|push-texts|backup|telegram|teamchess|fairplay-engine|fairplay-worker)\.js$|^\/(package(-lock)?\.json|CLAUDE\.md|README\.md|Dockerfile|Procfile|docker-compose\.yml|schema[\w-]*\.sql|database\.sqlite[\w-]*|[\w.-]*\.log)$|^\/(data|node_modules|tests|tools|\.github)(\/|$)/i;
app.use((req, res, next) => {
  let p = req.path;
  try { p = decodeURIComponent(p); } catch (e) { return res.status(400).end(); }
  return PRIVATE_FILES.test(p) ? res.status(404).end() : next();
});
// SEO: index.html sarlavha/tavsif/OpenGraph bilan (profil havolasi ?profile=ism — o'yinchi ma'lumoti bilan)
const INDEX_HTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const PAGE_TITLES = { '': 'ChessCaravan — Play chess online', oyin: 'Play', reyting: 'Leaderboard', jonli: 'Live games', xabarlar: 'Messages', klublar: 'Country clubs', ligalar: 'Leagues', chempionlar: 'Champions League', sozlamalar: 'Settings', tarix: 'Game history', bayroqlar: 'Battle of Flags', choyxona: 'Teahouse', karvon: 'Caravan Road', kutubxona: 'Chess library' };
const DEFAULT_DESC = 'ChessCaravan — free online chess: rated games, Chess960, the Teahouse lobby, country clubs and leagues, post-game analysis.';
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
async function sendIndex(req, res) {
  let title = PAGE_TITLES[req.params && req.params[0] ? req.params[0].toLowerCase() : ''] || 'ChessCaravan';
  if (title !== PAGE_TITLES['']) title += ' · ChessCaravan';
  let desc = DEFAULT_DESC;
  const name = typeof req.query.profile === 'string' ? req.query.profile.slice(0, 40) : '';
  // 🔗 Taklif havolasi: Telegram/WhatsApp oldindan ko'rinishida "X sizni o'yinga chaqiryapti"
  const inviteCode = typeof req.query.invite === 'string' ? req.query.invite.slice(0, 16) : '';
  if (inviteCode) {
    try {
      const u = await db.getUserByInviteCode(inviteCode);
      if (u) {
        const r = u.ratings_by_mode || {};
        title = `♞ ${u.username} invites you to play chess · ChessCaravan`;
        desc = `${u.username} sizni ChessCaravan'da shaxmat o'yiniga taklif qilyapti — Blitz ${r.blitz || 1500}. Accept the invite and play ${u.username} right away.`;
      }
    } catch (e) {}
  }
  if (name) {
    try {
      const u = await db.getUserByUsername(name);
      if (u) {
        const r = u.ratings_by_mode || {};
        const s = u.stats || {};
        title = u.username + ' · ChessCaravan';
        desc = `${u.username} on ChessCaravan — Rapid ${r.rapid || 1500} · Blitz ${r.blitz || 1500} · Bullet ${r.bullet || 1500} · ${(s.wins || 0) + (s.losses || 0) + (s.draws || 0)} games`;
      }
    } catch (e) {}
  }
  const url = SITE_URL + req.originalUrl;
  const meta = `<title>${escAttr(title)}</title>
    <meta name="description" content="${escAttr(desc)}" />
    <link rel="canonical" href="${escAttr(SITE_URL + req.path)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="ChessCaravan" />
    <meta property="og:title" content="${escAttr(title)}" />
    <meta property="og:description" content="${escAttr(desc)}" />
    <meta property="og:url" content="${escAttr(url)}" />
    <meta property="og:image" content="${SITE_URL}/assets/og-image.png?v=2" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="theme-color" content="#0a1214" />`;
  res.set('Cache-Control', 'no-cache');
  res.type('html').send(INDEX_HTML.replace(/<title>[^<]*<\/title>/, meta));
}
app.get('/', sendIndex);
app.get('/index.html', sendIndex);
app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${SITE_URL}/sitemap.xml\n`));
app.get('/sitemap.xml', async (req, res) => {
  const pages = ['', 'reyting', 'jonli', 'klublar', 'ligalar', 'chempionlar', 'bayroqlar', 'choyxona', 'karvon', 'kutubxona', 'maxfiylik', 'shartlar', 'mualliflar'];
  let players = [];
  try { players = (await db.getLeaderboard()).slice(0, 100).map(p => p.username); } catch (e) {}
  const urls = pages.map(p => `${SITE_URL}/${p}`).concat(players.map(n => `${SITE_URL}/?profile=${encodeURIComponent(n)}`));
  res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.map(u => `  <url><loc>${u.replace(/&/g, '&amp;')}</loc></url>`).join('\n') + '\n</urlset>\n');
});
// 📲 PWA: service worker ildizdan (butun sayt doirasi) va keshsiz beriladi
app.get('/sw.js', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.type('application/javascript').sendFile(path.join(__dirname, 'sw.js'));
});
app.get('/manifest.json', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.type('application/manifest+json').sendFile(path.join(__dirname, 'manifest.json'));
});
// Maxfiylik siyosati va Foydalanish shartlari — alohida ommaviy sahifa (kirish talab qilinmaydi). CONTACT_EMAIL (env) — aloqa manzili
const LEGAL_HTML = fs.readFileSync(path.join(__dirname, 'legal.html'), 'utf8').replace('__CONTACT__', escapeHtml(process.env.CONTACT_EMAIL || ''));
const LEGAL_ALIASES = { '/privacy': '/maxfiylik', '/terms': '/shartlar', '/credits': '/mualliflar' };
app.get(['/maxfiylik', '/shartlar', '/mualliflar', '/privacy', '/terms', '/credits'], (req, res) => {
  if (LEGAL_ALIASES[req.path]) return res.redirect(301, LEGAL_ALIASES[req.path]);
  res.set('Cache-Control', 'no-cache');
  res.type('html').send(LEGAL_HTML);
});
app.use(express.static(__dirname, { index: false }));
// Sayt bo'limlari manzillari (router.js): /reyting, /jonli ... — hammasi bitta sahifa (index.html).
// Katta harf yoki oxiridagi / bo'lsa — kanonik manzilga yo'naltiriladi
const PAGE_ROUTES = new Set(['oyin', 'reyting', 'jonli', 'xabarlar', 'klublar', 'ligalar', 'chempionlar', 'sozlamalar', 'admin', 'tarix', 'bayroqlar', 'choyxona', 'karvon', 'profil', 'jamoa', 'kutubxona']);
// Nomi o'zgargan bo'limlar: eski manzil → yangisi (301)
const ROUTE_ALIASES = { urush: 'bayroqlar', dostlar: 'xabarlar', chat: 'xabarlar' };
// Olib tashlangan bo'limlar: eski havolalar bosh sahifaga (2026-10-29 — Swiss turnirlari)
const REMOVED_ROUTES = new Set(['turnirlar']);
app.get(/^\/([A-Za-z]+)\/?$/, (req, res, next) => {
  const raw = req.params[0].toLowerCase();
  if (REMOVED_ROUTES.has(raw)) return res.redirect(301, '/');
  const slug = ROUTE_ALIASES[raw] || raw;
  if (!PAGE_ROUTES.has(slug)) return next();
  const canonical = '/' + slug;
  if (req.path !== canonical) return res.redirect(301, canonical + (req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : ''));
  sendIndex(req, res);
});

// Avtomatik testlarda (NODE_ENV=test) so'rovlar chegarasi o'chiriladi — testlar ko'p foydalanuvchi ochadi
const TEST_MODE = process.env.NODE_ENV === 'test';
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, skip: () => TEST_MODE, message: { success: false, message: 'Too many requests, please try again later.' } });
const tooMany = { success: false, message: "Juda ko'p urinish. Biroz kutib, qayta urinib ko'ring." };
// Kirish: faqat muvaffaqiyatsiz urinishlar sanaladi
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, skipSuccessfulRequests: true, skip: () => TEST_MODE, message: tooMany });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, skip: () => TEST_MODE, message: tooMany });
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, skip: () => TEST_MODE, message: tooMany });
const guestLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, skip: () => TEST_MODE, message: tooMany });

// --- 🐞 Xatolarni kuzatish (tashqi xizmatsiz): console.error, ushlanmagan xatolar, Express va brauzer xatolari → error_log.
// Bir xil xato (fingerprint: matn raqamlarsiz + birinchi stack qatori) bitta qatorda sanaladi. Yangi xato — adminlarga bildirishnoma.
const errorTracker = (() => {
  const origError = console.error.bind(console);
  let ready = false, writing = 0;
  const early = [];          // baza tayyor bo'lguncha
  const recent = new Map();  // fingerprint → {at, extra}: tez-tez takrorlansa bazaga 5 s da bir marta yoziladi
  const alerts = [];         // adminlarga bildirishnomalar vaqti (soatiga ko'pi bilan 10 ta)
  const normalize = (m) => String(m).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f-]{27,}/gi, '<id>').replace(/\d+/g, 'N').slice(0, 300);
  const firstFrame = (stack) => {
    const line = String(stack || '').split('\n').find(l => /^\s*at\s/.test(l)) || '';
    return line.trim().replace(/\?v=[^:)\s]*/, '').replace(/:\d+:\d+\)?$/, '');
  };
  const fingerprintOf = (source, message, stack) => crypto.createHash('sha1').update(source + '|' + normalize(message) + '|' + firstFrame(stack)).digest('hex');

  async function write(entry) {
    const now = Date.now();
    const r = recent.get(entry.fingerprint);
    if (r && now - r.at < 5000) { r.extra++; return; }
    const times = 1 + (r ? r.extra : 0);
    recent.set(entry.fingerprint, { at: now, extra: 0 });
    if (recent.size > 1000) recent.delete(recent.keys().next().value);
    writing++;
    try {
      const res = await db.logError({ ...entry, times });
      if (res.isNew) alertAdmins(entry);
    } catch (e) { origError('Xatolar jurnaliga yozib bo\'lmadi:', e.message); }
    finally { writing--; }
  }
  async function alertAdmins(entry) {
    const now = Date.now();
    while (alerts.length && now - alerts[0] > 3600000) alerts.shift();
    if (alerts.length >= 10) return;
    alerts.push(now);
    try {
      for (const id of await db.adminIds()) notify(id, 'server_error', { source: entry.source, message: entry.message.slice(0, 140) }, 'errors');
    } catch (e) {}
  }
  function capture(source, message, stack, context) {
    message = String(message || 'Error').slice(0, 1000);
    const entry = { fingerprint: fingerprintOf(source, message, stack), source, message, stack: stack ? String(stack).slice(0, 4000) : null, context: context || null };
    if (!ready) { if (early.length < 50) early.push(entry); return Promise.resolve(); }
    return write(entry);
  }
  // console.error(...) — matn va (bo'lsa) birinchi Error ning stack'i
  console.error = (...args) => {
    origError(...args);
    if (writing > 5) return; // jurnalning o'zi xato bersa — cheksiz aylanish bo'lmasin
    try {
      const err = args.find(a => a instanceof Error);
      capture('server', util.format(...args.map(x => (x instanceof Error ? x.message : x))), err && err.stack);
    } catch (e) {}
  };
  return {
    capture, fingerprintOf,
    start() { ready = true; early.splice(0).forEach(write); }
  };
})();
process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  console.error('Ushlanmagan Promise xatoligi:', err);
});
process.on('uncaughtException', async (err) => {
  try { console.error('Ushlanmagan xato (server qayta ishga tushadi):', err); } catch (e) {}
  // Yozilishini biroz kutib, o'yinlar soatini saqlab chiqamiz (Render serverni qayta ishga tushiradi)
  await new Promise(r => setTimeout(r, 1500));
  persistAllOnShutdown('uncaughtException', 1);
});

// O'yin xonalari: roomId → { players, chess, clock, status, ... }. O'yin holati faqat serverda hisoblanadi.
const rooms = new Map();
const matchmakingQueue = [];

// Ruxsat etilgan vaqt nazoratlari: [boshlang'ich soniya, har yurishdan keyin qo'shiladigan soniya]
const ALLOWED_CLOCKS = [[60, 0], [60, 1], [120, 1], [180, 0], [180, 2], [300, 0], [600, 0], [900, 10], [1800, 0]];
// Birinchi yurish shu vaqt ichida qilinmasa, o'yin reytingsiz bekor qilinadi
const FIRST_MOVE_TIMEOUT_MS = 30 * 1000;
// Tugagan o'yin xonasi shu vaqtdan keyin xotiradan o'chiriladi
const FINISHED_ROOM_TTL_MS = 5 * 60 * 1000;
// Uzilgan o'yinchi shu vaqt ichida qaytsa o'yin davom etadi (soati yuraveradi)
const RECONNECT_GRACE_MS = Number(process.env.RECONNECT_GRACE_MS) || 60 * 1000;
// Server qayta ishga tushgach (deploy) o'yinchilar qaytishi uchun vaqt
const RESTORE_GRACE_MS = Number(process.env.RESTORE_GRACE_MS) || 2 * 60 * 1000;

// Takrorlanmas xona ID (mavjud o'yin ustidan yozib yubormaslik uchun)
function generateRoomId() {
  let id;
  do { id = Math.random().toString(36).substring(2, 8).toUpperCase(); } while (id.length < 6 || rooms.has(id));
  return id;
}

function normalizeClock(initial, increment) {
  const base = Number(initial);
  const inc = Number(increment) || 0;
  if (ALLOWED_CLOCKS.some(([b, i]) => b === base && i === inc)) return { initial: base, increment: inc };
  return { initial: 300, increment: 0 };
}

// Chaqiruvda o'yinchi o'zi belgilagan vaqt: 30 soniyadan 180 daqiqagacha, qo'shimcha 0–60 soniya
function normalizeChallengeClock(initial, increment) {
  const base = Math.round(Number(initial));
  const inc = Math.round(Number(increment) || 0);
  if (Number.isFinite(base) && base >= 30 && base <= 10800 && inc >= 0 && inc <= 60) return { initial: base, increment: inc };
  return normalizeClock(initial, increment);
}

// Internet kechikishi: yurish serverga yetib kelguncha ketgan vaqtning bir qismi (RTT/2, ko'pi bilan) qaytariladi
const LAG_COMP_MAX_MS = 400;
function lagCompFor(player) {
  const s = player && player.socketId ? io.sockets.sockets.get(player.socketId) : null;
  const rtt = s && s.data.rtt;
  return rtt ? Math.min(LAG_COMP_MAX_MS, Math.round(rtt / 2)) : 0;
}

// Lichess usuli: taxminiy davomiylik = boshlang'ich + 40 × qo'shimcha
function clockMode(clock) {
  const estimate = clock.initial + 40 * clock.increment;
  if (estimate < 180) return 'bullet';
  if (estimate < 480) return 'blitz';
  return 'rapid';
}

// Uzilib qolgan socketlarni matchmaking navbatidan olib tashlash
function pruneMatchmakingQueue() {
  for (let i = matchmakingQueue.length - 1; i >= 0; i--) {
    if (!io.sockets.sockets.get(matchmakingQueue[i].socketId)) matchmakingQueue.splice(i, 1);
  }
}

function findPlayer(room, socketId) { return room.players.find(p => p.socketId === socketId); }

function otherColor(color) { return color === 'w' ? 'b' : 'w'; }

// opts.variant: 'standard' | 'chess960' | 'shatranj' (har biri alohida reyting), opts.startFen — 960 boshlang'ich pozitsiyasi
function createGameRoom(white, black, clock, rated, opts) {
  for (const p of [white, black]) if (p && p.userId) {
    if (typeof teaStand === 'function') teaStand(p.userId);
    // 2 ga 2 kutayotgan stolidan ham turadi — aks holda stol to'lganda ikki o'yinda bo'lib qolardi
    if (teamChess && teamChess.leaveWaiting) teamChess.leaveWaiting(p.userId);
  }
  if (isGuest(white && white.userId) || isGuest(black && black.userId)) rated = false;
  const variant = normVariant(opts && opts.variant);
  // CHESS960_TEST_FEN — faqat lokal sinov uchun (doim bir xil pozitsiya)
  const startFen = variant === 'chess960' ? (opts.startFen || process.env.CHESS960_TEST_FEN || Chess960.randomStartFen()) : null;
  return {
    players: [{ ...white, color: 'w' }, { ...black, color: 'b' }],
    chess: variant === 'chess960' ? new Chess960(startFen) : variant === 'shatranj' ? new Shatranj() : new Chess(),
    variant,
    startFen,
    spectatorChat: [],
    clock: { w: clock.initial * 1000, b: clock.initial * 1000, increment: clock.increment, initial: clock.initial },
    mode: clockMode(clock),
    rated: !!rated,
    status: 'active',
    turnStartedAt: null,
    timer: null,
    drawOfferBy: null
  };
}

// Reyting qaysi rejimga yoziladi: Chess960 va Shatranj — o'z reytingi, aks holda vaqt nazorati bo'yicha
function ratingModeOf(room) { return room.variant && room.variant !== 'standard' ? room.variant : room.mode; }

function variantInfo(room) {
  if (room.variant === 'chess960') return { variant: 'chess960', startFen: room.startFen, ratingMode: 'chess960' };
  if (room.variant === 'shatranj') return { variant: 'shatranj', ratingMode: 'shatranj' };
  return { variant: 'standard', ratingMode: room.mode };
}

function clockPayload(room) {
  const running = room.status === 'active' && room.turnStartedAt !== null;
  const clock = { w: room.clock.w, b: room.clock.b };
  // Hozir yurayotgan tomonning o'tgan vaqtini ham hisobga olamiz
  if (running) clock[room.chess.turn()] = Math.max(0, clock[room.chess.turn()] - (Date.now() - room.turnStartedAt));
  return { w: clock.w, b: clock.b, turn: room.chess.turn(), running };
}

function emitClock(roomId, room) { io.to(roomId).emit('clock-update', clockPayload(room)); }

// Davom etayotgan o'yinni bazaga yozish (deploydan keyin tiklash uchun). Bir xonaga ketma-ket yoziladi
function persistRoom(roomId, room) {
  if (room.status !== 'active') return;
  const snapshot = {
    players: room.players.map(p => ({ userId: p.userId, username: p.username, color: p.color })),
    moves: room.chess.history({ verbose: true }).map(m => ({ from: m.from, to: m.to, promotion: m.promotion })),
    clock: { w: room.clock.w, b: room.clock.b, initial: room.clock.initial, increment: room.clock.increment },
    rated: room.rated,
    variant: room.variant,
    startFen: room.startFen,
    leagueGameId: room.leagueGameId || null,
    duel: room.duel || null
  };
  room.persistChain = (room.persistChain || Promise.resolve())
    .then(() => (room.status === 'active' ? db.saveActiveGame(roomId, snapshot) : null))
    .catch(err => console.error("O'yinni saqlash xatoligi:", err.message));
}

function unpersistRoom(roomId, room) {
  room.persistChain = (room.persistChain || Promise.resolve())
    .then(() => db.deleteActiveGame(roomId))
    .catch(err => console.error("O'yinni o'chirish xatoligi:", err.message));
}

// Tiklangan o'yinda navbatdagi o'yinchi qaytdi — soat yana yuradi
function resumeClock(roomId, room) {
  if (!room.paused || room.status !== 'active') return;
  room.paused = false;
  room.turnStartedAt = room.chess.history().length >= 2 ? Date.now() : null;
  scheduleRoomTimer(roomId, room);
  emitClock(roomId, room);
}

// Render deploy oldidan SIGTERM yuboradi: davom etayotgan o'yinlarning soati shu paytdagi qiymat bilan saqlanadi
let shuttingDown = false;
async function persistAllOnShutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  const jobs = [];
  for (const [roomId, room] of rooms.entries()) {
    if (room.status !== 'active') continue;
    const c = clockPayload(room);
    room.clock.w = c.w;
    room.clock.b = c.b;
    if (room.turnStartedAt !== null) room.turnStartedAt = Date.now();
    clearTimeout(room.timer);
    persistRoom(roomId, room);
    jobs.push(room.persistChain);
  }
  await Promise.race([Promise.allSettled(jobs), new Promise(r => setTimeout(r, 8000))]);
  console.log(`${signal}: ${jobs.length} ta o'yin soati saqlandi`);
  process.exit(exitCode);
}
process.once('SIGTERM', () => persistAllOnShutdown('SIGTERM'));
process.once('SIGINT', () => persistAllOnShutdown('SIGINT'));

// Server ishga tushganda: bazadagi o'yinlarni xotiraga qaytarish. O'yinchilar qaytguncha "away"
async function restoreActiveGames() {
  const restored = [];
  for (const { roomId, data } of await db.loadActiveGames()) {
    try {
      const white = data.players.find(p => p.color === 'w'), black = data.players.find(p => p.color === 'b');
      if (!white || !black) { await db.deleteActiveGame(roomId); continue; }
      const room = createGameRoom({ socketId: null, userId: white.userId, username: white.username }, { socketId: null, userId: black.userId, username: black.username },
        { initial: data.clock.initial, increment: data.clock.increment }, data.rated, { variant: data.variant, startFen: data.startFen });
      for (const m of data.moves) room.chess.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
      room.clock.w = data.clock.w;
      room.clock.b = data.clock.b;
      if (data.leagueGameId) room.leagueGameId = data.leagueGameId;
      if (data.duel) room.duel = data.duel;
      room.announced = true;
      // Server o'chib turgan va o'yinchilar qaytayotgan vaqt soatdan ayirilmaydi: navbatdagi o'yinchi
      // qaytguncha soat to'xtab turadi (resumeGames → resumeClock). Saqlangan qiymat — server to'xtagan paytdagi soat.
      room.turnStartedAt = null;
      room.paused = room.chess.history().length >= 2;
      rooms.set(roomId, room);
      for (const p of room.players) {
        p.away = true;
        p.awayTimer = setTimeout(() => {
          if (!p.away || room.status !== 'active') return;
          const winner = room.chess.history().length < 2 ? null : otherColor(p.color);
          // Ikkalasi ham qaytmagan bo'lsa — natijasiz bekor
          const bothAway = room.players.every(x => x.away);
          endGame(roomId, room, bothAway ? null : winner, bothAway || !winner ? 'aborted' : 'abandon');
        }, RESTORE_GRACE_MS);
      }
      scheduleRoomTimer(roomId, room);
      loadPredictions(roomId, room).catch(() => {});
      restored.push({ roomId, room });
    } catch (err) {
      console.error("O'yinni tiklash xatoligi:", roomId, err.message);
      await db.deleteActiveGame(roomId).catch(() => {});
    }
  }
  if (restored.length) console.log(`♻️ ${restored.length} ta davom etayotgan o'yin tiklandi`);
  return restored;
}

function scheduleRoomTimer(roomId, room) {
  clearTimeout(room.timer);
  if (room.status !== 'active') return;
  persistRoom(roomId, room);
  if (!room.announced) { room.announced = true; announceGame(roomId, room).catch(() => {}); }
  if (room.paused) return;
  const moves = room.chess.history().length;
  if (moves < 2) {
    // Har ikki tomon birinchi yurishini qilmaguncha soat yurmaydi
    room.timer = setTimeout(() => endGame(roomId, room, null, 'aborted'), FIRST_MOVE_TIMEOUT_MS);
    return;
  }
  const side = room.chess.turn();
  const grace = lagCompFor(room.players.find(p => p.color === side));
  room.timer = setTimeout(() => {
    room.clock[side] = 0;
    const t = timeoutResult(room, side);
    endGame(roomId, room, t.winner, t.reason);
  }, room.clock[side] + grace);
}

// Vaqt tugadi: raqibda mat qilish uchun dona yetarli bo'lmasa — durrang (FIDE qoidasi). Raqibda faqat shoh qolgan
// yoki shoh + bitta yengil dona va vaqti tugagan tomonda ham faqat shoh — mat mumkin emas. Shatranj'da o'z qoidalari.
function timeoutResult(room, flagged) {
  const winner = otherColor(flagged);
  if (room.variant === 'shatranj' || typeof room.chess.board !== 'function') return { winner, reason: 'timeout' };
  const pieces = { w: [], b: [] };
  for (const row of room.chess.board()) for (const sq of row) if (sq && sq.type !== 'k') pieces[sq.color].push(sq.type);
  const mine = pieces[winner], theirs = pieces[flagged];
  const cannotMate = mine.length === 0 || (mine.length === 1 && (mine[0] === 'n' || mine[0] === 'b') && theirs.length === 0);
  return cannotMate ? { winner: null, reason: 'insufficient' } : { winner, reason: 'timeout' };
}

function scoreFor(color, winnerColor) {
  if (winnerColor === null) return 'draw';
  return color === winnerColor ? 'win' : 'loss';
}

// O'yinni yakunlash: natija, statistika va reyting faqat shu yerda yoziladi
async function endGame(roomId, room, winnerColor, reason) {
  if (room.status !== 'active') return;
  room.status = 'over';
  clearTimeout(room.timer);
  unpersistRoom(roomId, room);
  room.turnStartedAt = null;
  setTimeout(() => { if (rooms.get(roomId) === room) rooms.delete(roomId); }, FINISHED_ROOM_TTL_MS);

  const moves = room.chess.history();
  // O'yinchilar ro'yxati keyinroq o'zgarishi mumkin (chiqib ketish) — natija shu holat bo'yicha yoziladi
  const players = room.players.slice();
  const recorded = reason !== 'aborted' && players.every(p => p.userId);
  let warBefore = null;
  const updates = {};
  if (recorded) {
    try {
      // Ikkala o'yinchining o'yindan oldingi reytinglari bilan hisoblaymiz
      const before = {};
      for (const p of players) before[p.color] = await db.getUserById(p.userId);
      warBefore = before;
      for (const p of players) {
        const opp = players.find(o => o.color !== p.color);
        const oppUser = before[opp.color];
        const result = scoreFor(p.color, winnerColor);
        const ratingMode = ratingModeOf(room);
        const statsData = await db.updateUserStats(p.userId, result, opp.username, "Online o'yin", moves, ratingMode,
          { color: p.color, reason, clock: room.clock.initial / 60 + '+' + room.clock.increment, ...(room.variant === 'chess960' ? { variant: 'chess960', startFen: room.startFen } : room.variant === 'shatranj' ? { variant: 'shatranj' } : {}), ...(room.leagueGameId ? { league: true } : {}), ...(room.tea ? { tea: true } : {}), ...(room.rated ? { rated: true } : {}) });
        let ratingData = null;
        if (room.rated && oppUser) {
          const modeBefore = before[p.color] && before[p.color].ratings_by_mode ? before[p.color].ratings_by_mode[ratingMode] : null;
          ratingData = await db.updateUserRatingByResult(p.userId, result, oppUser.rating || 1500, ratingMode, oppUser.ratings_by_mode[ratingMode], opp.userId);
          const modeAfter = ratingData && ratingData.ratingsByMode ? ratingData.ratingsByMode[ratingMode] : null;
          if (modeBefore && modeAfter && modeAfter > modeBefore && rankOf(modeAfter) !== rankOf(modeBefore)) {
            notify(p.userId, 'rank_up', { mode: ratingMode, rank: rankOf(modeAfter), rating: modeAfter });
          }
        }
        if (!isGuest(p.userId)) questProgress(p.userId).catch((err) => console.error('Vazifalar xatoligi:', err));
        if (!isGuest(p.userId)) holidayProgress(p.userId).catch((err) => console.error('Bayram vazifasi xatoligi:', err));
        // 🐪 Karvon yo'li: qadamlar statistikadan; yangi shaharga yetgan bo'lsa — bildirishnoma (mehmonga emas)
        let caravan = null;
        if (statsData && statsData.stats) {
          const points = Caravan.pointsOf(statsData.stats), gained = Caravan.STEP[result] || 0;
          const idx = Caravan.cityIndex(points);
          caravan = { points, gained, city: Caravan.CITIES[idx].key, arrived: idx > Caravan.cityIndex(points - gained) };
          if (caravan.arrived && !isGuest(p.userId)) notify(p.userId, 'caravan_city', { city: caravan.city });
        }
        updates[p.color] = {
          caravan,
          stats: statsData && statsData.stats,
          statsByMode: statsData && statsData.statsByMode,
          newRating: ratingData ? ratingData.newRating : (before[p.color] && before[p.color].rating) || 1500,
          ratingsByMode: ratingData ? ratingData.ratingsByMode : (before[p.color] && before[p.color].ratings_by_mode),
          modeChange: ratingData ? ratingData.modeChange : null
        };
      }
    } catch (err) { console.error("O'yin natijasini saqlash xatoligi:", err); }
  }
  resolvePredictions(roomId, room, winnerColor, reason);
  if (recorded && room.rated && warBefore) recordWarPoints(players, warBefore, winnerColor, moves.length).catch(err => console.error('Urush ochkolari xatoligi:', err.message));
  if (recorded) {
    invalidateCache('leaderboard', 'daily:day', 'daily:week');
    recordFairplay(room, winnerColor).catch(err => console.error('Fair-play xatoligi:', err.message));
    if (fairplayAnalyzer && room.rated && room.variant === 'standard' && warBefore) {
      const mode = ratingModeOf(room);
      fairplayAnalyzer.enqueue({ ref: 'room:' + roomId, mode, moves, players: players.map((p) => ({ userId: p.userId, color: p.color,
        rating: warBefore[p.color] ? (warBefore[p.color].ratings_by_mode && warBefore[p.color].ratings_by_mode[mode]) || warBefore[p.color].rating : null })) });
    }
    for (const p of players) checkAchievements(p.userId);
  }
  // Liga o'yini bo'lsa — natija bahs hisobiga yoziladi
  if (room.leagueGameId) {
    try { await league.recordGameResult(room.leagueGameId, winnerColor, reason); }
    catch (err) { console.error('Liga natijasini yozish xatoligi:', err); }
  }

  // ⚔️ Bahs o'yini bo'lsa — hisob yangilanadi (bekor qilingan o'yin sanalmaydi)
  if (room.duel) {
    try { await recordDuelGame(room, winnerColor, reason); }
    catch (err) { console.error('Bahs natijasini yozish xatoligi:', err); }
  }

  room.endedAt = Date.now();
  room.endPayloads = {};
  for (const p of players) {
    clearTimeout(p.awayTimer);
    const payload = {
      roomId, winner: winnerColor, reason, result: scoreFor(p.color, winnerColor),
      rated: room.rated && recorded, mode: ratingModeOf(room),
      duel: room.duel ? duelPublic(room.duel) : null, ...(updates[p.color] || {})
    };
    room.endPayloads[p.color] = payload;
    // O'yin davomida qayta ulangan bo'lsa — yangi socketiga
    const current = room.players.find(x => x.color === p.color) || p;
    if (current.socketId) io.to(current.socketId).emit('game-ended', payload);
  }
  emitClock(roomId, room);
  io.to('watch_' + roomId).emit('watch-ended', { roomId, winner: winnerColor, reason, clock: clockPayload(room) });
}

// --- O'yinga chaqirish (do'st yoki istalgan o'yinchi) ---
const CHALLENGE_TTL_MS = 60 * 1000;
const challenges = new Map(); // id -> { id, fromId, fromName, toId, toName, clock, rated, timer }
const lastChallengeAt = new Map(); // userId -> oxirgi chaqiruv vaqti
// Ikki o'yinchi orasidagi barcha kutayotgan chaqiruvlarni bekor qilish (bloklanganda)
function dropChallengesBetween(a, b) {
  for (const c of [...challenges.values()]) {
    if ((c.fromId === a && c.toId === b) || (c.fromId === b && c.toId === a)) {
      dropChallenge(c.id);
      io.to(`user_${c.toId}`).emit('challenge-cancelled', { id: c.id });
      io.to(`user_${c.fromId}`).emit('challenge-declined', { id: c.id, by: c.toName });
    }
  }
}

function userSocket(userId) {
  const set = io.sockets.adapter.rooms.get(`user_${userId}`);
  if (!set) return null;
  for (const id of set) { const s = io.sockets.sockets.get(id); if (s && s.connected) return s; }
  return null;
}

function inActiveGame(userId) {
  for (const room of rooms.values()) if (room.status === 'active' && room.players.some(p => p.userId === userId)) return true;
  // 🤝 2 ga 2 o'yinidagi o'yinchi ham band
  return !!(teamChess && teamChess.inTeamGame(userId));
}

function dropChallenge(id) {
  const c = challenges.get(id);
  if (c) { clearTimeout(c.timer); challenges.delete(id); }
  return c;
}

async function sendChallenge(socket, data, opts) {
  const invite = !!(opts && opts.invite);
  const fromId = socket.data.userId;
  if (!fromId) return socket.emit('challenge-error', { reason: 'auth' });
  const target = data && data.username ? await db.getUserByUsername(String(data.username)) : null;
  if (!target) return socket.emit('challenge-error', { reason: 'not_found' });
  if (target.id === fromId) return socket.emit('challenge-error', { reason: 'self' });
  if (blockedPair(fromId, target.id)) return socket.emit('challenge-error', { reason: 'blocked' });
  const targetPrivacy = db.userPrivacy(target).challenges;
  if (!invite && targetPrivacy === 'none') return socket.emit('challenge-error', { reason: 'disabled' });
  if (!invite && targetPrivacy === 'friends' && !(await db.areFriends(target.id, fromId))) return socket.emit('challenge-error', { reason: 'friends_only' });
  if (!userSocket(target.id)) return socket.emit('challenge-error', { reason: 'offline' });
  if (inActiveGame(fromId)) return socket.emit('challenge-error', { reason: 'you_busy' });
  if (inActiveGame(target.id)) return socket.emit('challenge-error', { reason: 'busy' });
  // Chaqiruv yuborish/bekor qilish oqimi (har biri raqibga push) — 2 soniyada bittadan ko'p emas
  const nowMs = Date.now();
  if (!TEST_MODE && nowMs - (lastChallengeAt.get(fromId) || 0) < 2000) return socket.emit('challenge-error', { reason: 'too_fast' });
  lastChallengeAt.set(fromId, nowMs);
  // Bir o'yinchiga bitta faol chaqiruv
  for (const c of challenges.values()) if (c.fromId === fromId) { dropChallenge(c.id); io.to(`user_${c.toId}`).emit('challenge-cancelled', { id: c.id }); }
  const clock = normalizeChallengeClock(data.initial, data.increment);
  const me = await db.getUserById(fromId);
  const mode = clockMode(clock);
  const id = uuidv4();
  const variant = normVariant(data.variant);
  const c = { id, fromId, fromName: socket.data.username, toId: target.id, toName: target.username, clock, variant, rated: data.rated !== false && !isGuest(fromId) && !isGuest(target.id) };
  // ⚔️ Bahs: 3, 5 yoki 7 o'yinlik seriya (aks holda bitta o'yin)
  c.series = DUEL_SIZES.includes(Number(data.series)) ? Number(data.series) : 1;
  const fromMode = variant !== 'standard' ? variant : mode;
  c.timer = setTimeout(() => {
    if (!dropChallenge(id)) return;
    io.to(`user_${fromId}`).emit('challenge-expired', { id, to: target.username });
    io.to(`user_${target.id}`).emit('challenge-expired', { id });
  }, CHALLENGE_TTL_MS);
  challenges.set(id, c);
  c.payload = {
    id, clock, rated: c.rated, variant, mode, seconds: CHALLENGE_TTL_MS / 1000, invite, series: c.series,
    from: { username: c.fromName, rating: (me && me.ratings_by_mode && me.ratings_by_mode[fromMode]) || (me && me.rating) || 1500, country: me ? me.country || null : null }
  };
  c.expiresAt = Date.now() + CHALLENGE_TTL_MS;
  io.to(`user_${target.id}`).emit('challenge-received', c.payload);
  socket.emit('challenge-sent', { id, to: target.username, clock, rated: c.rated, variant, series: c.series, seconds: CHALLENGE_TTL_MS / 1000 });
  notify(target.id, 'challenge', { from: c.fromName, clock: clock.initial / 60 + '+' + clock.increment, variant, rated: c.rated }, 'ch:' + fromId);
}

async function acceptChallenge(socket, id) {
  const c = challenges.get(id);
  if (!c || c.toId !== socket.data.userId) return socket.emit('challenge-error', { reason: 'gone' });
  dropChallenge(id);
  const fromSocket = userSocket(c.fromId);
  if (!fromSocket) return socket.emit('challenge-error', { reason: 'offline' });
  if (inActiveGame(c.fromId) || inActiveGame(c.toId)) return socket.emit('challenge-error', { reason: 'busy' });
  for (const uid of [c.fromId, c.toId]) {
    const i = matchmakingQueue.findIndex(u => u.userId === uid);
    if (i !== -1) matchmakingQueue.splice(i, 1);
  }
  const [fromUser, toUser] = await Promise.all([db.getUserById(c.fromId), db.getUserById(c.toId)]);
  // Kutish paytida (bazadan o'qish) ulardan biri boshqa o'yinga kirib ketgan bo'lishi mumkin
  if (!fromUser || !toUser || !fromSocket.connected) return socket.emit('challenge-error', { reason: 'gone' });
  if (inActiveGame(c.fromId) || inActiveGame(c.toId)) return socket.emit('challenge-error', { reason: 'busy' });
  let duelState = null;
  if (c.series > 1 && fromUser && toUser) {
    const id = await db.createDuel({ a: fromUser.id, b: toUser.id, bestOf: c.series, clock: c.clock.initial / 60 + '+' + c.clock.increment, variant: c.variant, rated: c.rated });
    duelState = { id, a: fromUser.id, b: toUser.id, aName: fromUser.username, bName: toUser.username, bestOf: c.series, scoreA: 0, scoreB: 0, played: 0, finished: false, stopped: false, winner: null };
  }
  startDirectGame({ socket: fromSocket, user: fromUser }, { socket, user: toUser }, c.clock, c.rated, c.variant, duelState ? { challenge: true, duelState } : { challenge: true });
}

// Ikki tayyor o'yinchi (socket + user) o'rtasida o'yin: ranglar tasodifiy, ikkalasiga match-found
function startDirectGame(a, b, clock, rated, variant, flags) {
  for (const uid of [a.user.id, b.user.id]) {
    const i = matchmakingQueue.findIndex(u => u.userId === uid);
    if (i !== -1) matchmakingQueue.splice(i, 1);
  }
  const [white, black] = Math.random() < 0.5 ? [a, b] : [b, a];
  const roomId = generateRoomId();
  const room = createGameRoom(
    { socketId: white.socket.id, userId: white.user.id, username: white.user.username },
    { socketId: black.socket.id, userId: black.user.id, username: black.user.username },
    clock, rated, { variant }
  );
  if (flags && flags.tea) room.tea = true;
  const { duelState, ...pubFlags } = flags || {};
  if (duelState) room.duel = duelState;
  rooms.set(roomId, room);
  const info = (u) => ({ username: u.username, rating: u.rating || 1500, ratingsByMode: u.ratings_by_mode, country: u.country || null, provisional: db.isProvisional(u, ratingModeOf(room), false) });
  for (const [side, color, opp] of [[white, 'w', black], [black, 'b', white]]) {
    side.socket.join(roomId);
    side.socket.emit('match-found', { roomId, color, opponent: info(opp.user), clock, rated: room.rated, mode: room.mode, ...pubFlags, ...(room.duel ? { duel: duelPublic(room.duel) } : {}), ...variantInfo(room) });
  }
  scheduleRoomTimer(roomId, room);
  return roomId;
}

// --- 🍵 Choyxona: o'yinchi stolga o'tiradi (vaqt nazorati bilan), boshqasi qarshisidagi bo'sh stulga o'tirsa — o'yin ---
// O'tirganlar xotirada (teaSeats); lobbidagilar 'tea' socket xonasida, o'zgarishda 'tea-seats' yuboriladi.
const TEA_TTL_MS = 30 * 60 * 1000;
const TEA_MAX_SEATS = 120;
const teaSeats = new Map(); // id -> { id, userId, username, socketId, clock, rated, variant, rating, country, avatarVersion, createdAt }
function teaPublic(s) {
  return { id: s.id, username: s.username, rating: s.rating, country: s.country, avatarVersion: s.avatarVersion, clock: s.clock, rated: s.rated, variant: s.variant, mode: clockMode(s.clock), createdAt: s.createdAt };
}
function teaList() { return [...teaSeats.values()].sort((a, b) => a.createdAt - b.createdAt).map(teaPublic); }
function broadcastTea() { io.to('tea').emit('tea-seats', { seats: teaList(), online: onlineUsers.size }); }
// O'yinchi stoldan turadi (o'zi, boshqa o'yin boshlandi yoki uzildi)
function teaStand(userId, socketId) {
  let changed = false;
  for (const s of teaSeats.values()) {
    if (userId ? s.userId === userId : s.socketId === socketId) { teaSeats.delete(s.id); changed = true; }
  }
  if (changed) broadcastTea();
}
async function teaSit(socket, data) {
  const userId = socket.data.userId;
  if (!userId) return socket.emit('tea-error', { reason: 'auth' });
  if (inActiveGame(userId)) return socket.emit('tea-error', { reason: 'you_busy' });
  if (teaSeats.size >= TEA_MAX_SEATS) return socket.emit('tea-error', { reason: 'full' });
  const clock = normalizeChallengeClock(data && data.initial, data && data.increment);
  const variant = normVariant(data && data.variant);
  const u = await db.getUserById(userId);
  if (!u) return socket.emit('tea-error', { reason: 'auth' });
  const mode = variant !== 'standard' ? variant : clockMode(clock);
  for (const s of teaSeats.values()) if (s.userId === userId) teaSeats.delete(s.id);
  const i = matchmakingQueue.findIndex(q => q.userId === userId);
  if (i !== -1) matchmakingQueue.splice(i, 1);
  const seat = {
    id: uuidv4(), userId, username: u.username, socketId: socket.id, clock, variant, rated: !(data && data.rated === false) && !isGuest(userId),
    rating: Number(u.ratings_by_mode && u.ratings_by_mode[mode]) || u.rating || 1500, country: u.country || null,
    avatarVersion: u.avatar_version || null, createdAt: Date.now()
  };
  teaSeats.set(seat.id, seat);
  socket.emit('tea-seated', teaPublic(seat));
  broadcastTea();
}
async function teaJoin(socket, id) {
  const userId = socket.data.userId;
  if (!userId) return socket.emit('tea-error', { reason: 'auth' });
  const seat = teaSeats.get(id);
  if (!seat) return socket.emit('tea-error', { reason: 'gone' });
  if (seat.userId === userId) return socket.emit('tea-error', { reason: 'self' });
  if (blockedPair(userId, seat.userId)) return socket.emit('tea-error', { reason: 'blocked' });
  if (inActiveGame(userId)) return socket.emit('tea-error', { reason: 'you_busy' });
  const ownerSocket = io.sockets.sockets.get(seat.socketId) || userSocket(seat.userId);
  if (!ownerSocket || !ownerSocket.connected || inActiveGame(seat.userId)) {
    teaSeats.delete(seat.id);
    broadcastTea();
    return socket.emit('tea-error', { reason: 'gone' });
  }
  teaSeats.delete(seat.id);
  const [owner, me] = await Promise.all([db.getUserById(seat.userId), db.getUserById(userId)]);
  if (!owner || !me || !ownerSocket.connected) return socket.emit('tea-error', { reason: 'gone' });
  // Bir vaqtda ikki stolga o'tirib (yoki o'z stoliga kimdir o'tirib) ikki o'yinga tushib qolmasin
  if (inActiveGame(seat.userId)) return socket.emit('tea-error', { reason: 'gone' });
  if (inActiveGame(userId)) return socket.emit('tea-error', { reason: 'you_busy' });
  startDirectGame({ socket: ownerSocket, user: owner }, { socket, user: me }, seat.clock, seat.rated, seat.variant, { challenge: true, tea: true });
}
// Choyxonadagi band stollar: davom etayotgan o'yinlar (mini-doska uchun FEN va oxirgi yurish)
function teaGames() {
  return cached('tea:games', 3000, async () => {
    const list = [];
    for (const [roomId, room] of rooms.entries()) {
      if (room.status !== 'active' || room.players.length !== 2) continue;
      const last = room.chess.history({ verbose: true }).slice(-1)[0];
      list.push({ ...(await liveGameInfo(roomId, room)), fen: room.chess.fen(), lastMove: last ? [last.from, last.to] : null });
    }
    return list.slice(0, 60);
  });
}
// Lobbidagilarga stollardagi o'yinlar har 4 soniyada (so'rov limitini sarflamaslik uchun socket orqali)
setInterval(async () => {
  const r = io.sockets.adapter.rooms.get('tea');
  if (!r || !r.size) return;
  try { io.to('tea').emit('tea-games', { games: await teaGames(), online: onlineUsers.size }); } catch (e) {}
}, 4000);
setInterval(() => {
  let changed = false;
  for (const s of teaSeats.values()) if (Date.now() - s.createdAt > TEA_TTL_MS) { teaSeats.delete(s.id); changed = true; io.to(s.socketId).emit('tea-error', { reason: 'expired' }); }
  if (changed) broadcastTea();
}, 60 * 1000);

// --- ⚔️ Bahs: do'st bilan 3/5/7 o'yinlik seriya. Holat xonada (room.duel), har o'yin natijasi duels jadvaliga ---
const DUEL_SIZES = [3, 5, 7];
const DUEL_STALE_MS = 6 * 60 * 60 * 1000;
function duelPublic(d) {
  return {
    id: d.id, bestOf: d.bestOf, played: d.played, game: Math.min(d.bestOf, d.played + (d.finished || d.stopped ? 0 : 1)),
    players: [d.aName, d.bName], scores: { [d.aName]: d.scoreA / 2, [d.bName]: d.scoreB / 2 },
    finished: !!d.finished, stopped: !!d.stopped, winner: d.winner ? (d.winner === d.a ? d.aName : d.bName) : null
  };
}
async function recordDuelGame(room, winnerColor, reason) {
  const d = room.duel;
  if (!d || d.finished || d.stopped || reason === 'aborted') return;
  const pa = room.players.find((p) => p.userId === d.a), pb = room.players.find((p) => p.userId === d.b);
  if (!pa || !pb) return;
  const half = (p) => ({ win: 2, draw: 1, loss: 0 }[scoreFor(p.color, winnerColor)] || 0);
  d.scoreA += half(pa); d.scoreB += half(pb); d.played += 1;
  // Yarim ochkolarda: g'olib — jami 2·bestOf dan yarmidan ko'pini olgan; o'yinlar tugasa — kim oldinda (teng — durrang)
  if (d.scoreA > d.bestOf || d.scoreB > d.bestOf || d.played >= d.bestOf) {
    d.finished = true;
    d.winner = d.scoreA > d.scoreB ? d.a : d.scoreB > d.scoreA ? d.b : null;
  }
  await db.updateDuel(d.id, { scoreA: d.scoreA, scoreB: d.scoreB, games: d.played, status: d.finished ? 'finished' : 'active', winnerId: d.winner });
  if (d.finished) {
    for (const [uid, oppName, me, opp] of [[d.a, d.bName, d.scoreA, d.scoreB], [d.b, d.aName, d.scoreB, d.scoreA]]) {
      notify(uid, 'duel_end', { opponent: oppName, me: me / 2, opp: opp / 2, result: !d.winner ? 'draw' : d.winner === uid ? 'win' : 'loss' });
    }
    if (d.winner) awardAchievement(d.winner, 'duel_win');
  }
}
function stopDuel(roomId, room) {
  const d = room.duel;
  d.stopped = true;
  db.updateDuel(d.id, { scoreA: d.scoreA, scoreB: d.scoreB, games: d.played, status: 'stopped', winnerId: null }).catch((err) => console.error('Bahsni to\'xtatish xatoligi:', err.message));
  for (const p of room.players) if (p.socketId) io.to(p.socketId).emit('duel-stopped', { roomId, duel: duelPublic(d) });
}

async function startRematch(oldRoomId, old) {
  if (old.rematchStarted) return;
  old.rematchStarted = true;
  old.rematchBy = null;
  const prevWhite = old.players.find(p => p.color === 'w'), prevBlack = old.players.find(p => p.color === 'b');
  if (!prevWhite || !prevBlack) return;
  // Taklif va qabul orasida kimdir boshqa o'yin boshlagan yoki chiqib ketgan bo'lishi mumkin
  if (inActiveGame(prevWhite.userId) || inActiveGame(prevBlack.userId) || !io.sockets.sockets.get(prevWhite.socketId) || !io.sockets.sockets.get(prevBlack.socketId)) {
    for (const p of [prevWhite, prevBlack]) if (p.socketId) io.to(p.socketId).emit('rematch-unavailable', { roomId: oldRoomId });
    return;
  }
  for (const p of [prevWhite, prevBlack]) {
    const i = matchmakingQueue.findIndex(u => u.userId === p.userId);
    if (i !== -1) matchmakingQueue.splice(i, 1);
  }
  const [whiteUser, blackUser] = await Promise.all([db.getUserById(prevBlack.userId), db.getUserById(prevWhite.userId)]);
  const clock = { initial: old.clock.initial, increment: old.clock.increment };
  const roomId = generateRoomId();
  // Ranglar almashadi: oldingi qora endi oq
  const room = createGameRoom(
    { socketId: prevBlack.socketId, userId: prevBlack.userId, username: prevBlack.username },
    { socketId: prevWhite.socketId, userId: prevWhite.userId, username: prevWhite.username },
    clock, old.rated, { variant: old.variant, startFen: old.startFen }
  );
  if (old.duel && !old.duel.finished && !old.duel.stopped) room.duel = { ...old.duel };
  rooms.set(roomId, room);
  const info = (u) => ({ username: u.username, rating: u.rating || 1500, ratingsByMode: u.ratings_by_mode, country: u.country || null, provisional: db.isProvisional(u, ratingModeOf(room), false) });
  for (const [p, color, opp] of [[prevBlack, 'w', blackUser], [prevWhite, 'b', whiteUser]]) {
    const s = io.sockets.sockets.get(p.socketId);
    if (s) { s.leave(oldRoomId); s.join(roomId); }
    io.to(p.socketId).emit('match-found', { roomId, color, opponent: info(opp), clock, rated: room.rated, mode: room.mode, rematch: true, ...(room.duel ? { duel: duelPublic(room.duel) } : {}), ...variantInfo(room) });
  }
  scheduleRoomTimer(roomId, room);
}

// Reyting darajalari — klientdagi ranks.js bilan bir xil chegaralar
const RANK_STEPS = [[2400, 'grandmaster'], [2200, 'master'], [2000, 'diamond'], [1800, 'platinum'], [1600, 'gold'], [1400, 'silver'], [1200, 'bronze'], [0, 'novice']];
function rankOf(rating) { const r = Number(rating) || 0; return (RANK_STEPS.find(([min]) => r >= min) || RANK_STEPS[RANK_STEPS.length - 1])[1]; }

// Bildirishnoma: bazaga yoziladi va o'yinchiga darhol yuboriladi (🔔 markazi)
async function notify(userId, type, data, collapseKey) {
  if (!userId) return;
  try {
    const item = await db.addNotification(userId, type, data || {}, collapseKey);
    io.to(`user_${userId}`).emit('notification', item);
    sendPush(userId, type, item && item.data ? item.data : (data || {}), collapseKey || type).catch(() => {});
    if (telegram.enabled()) telegram.sendNotification(userId, type, item && item.data ? item.data : (data || {})).catch(() => {});
  } catch (err) { console.error('Bildirishnoma xatoligi:', err.message); }
}

// --- 📲 Push-bildirishnomalar (sayt yopiq yoki fonda bo'lganda) ---
// VAPID kalitlari: env (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY) yoki birinchi startda yaratilib bazada saqlanadi.
let pushReady = false, vapidPublicKey = null;
async function initPush() {
  try {
    let pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
    if (!pub || !priv) {
      pub = await db.getAppSetting('vapid_public');
      priv = await db.getAppSetting('vapid_private');
      if (!pub || !priv) {
        const keys = webpush.generateVAPIDKeys();
        pub = keys.publicKey; priv = keys.privateKey;
        await db.setAppSetting('vapid_public', pub);
        await db.setAppSetting('vapid_private', priv);
        console.log('📲 Push uchun yangi VAPID kalitlari yaratildi');
      }
    }
    const contact = process.env.CONTACT_EMAIL ? 'mailto:' + process.env.CONTACT_EMAIL : SITE_URL;
    webpush.setVapidDetails(contact, pub, priv);
    vapidPublicKey = pub;
    pushReady = true;
  } catch (err) { console.error('Push sozlash xatoligi:', err.message); }
}
// Foydalanuvchi saytni hozir ko'ryaptimi (kamida bitta ochiq va ko'rinib turgan sahifa) — unda push shart emas
// Saytni hozir kimdir ochiq ko'rib turibdimi (fonda qolgan oynalar sanalmaydi)
const adminUsernames = () => String(process.env.ADMIN_USERNAMES || '').split(',').map(s => s.trim()).filter(Boolean);
function anyoneActive() {
  for (const id of onlineUsers.keys()) if (isActive(id)) return true;
  return false;
}
function isActive(userId) {
  const set = onlineUsers.get(userId);
  if (!set) return false;
  for (const id of set) { const s = io.sockets.sockets.get(id); if (s && s.connected && !s.data.hidden) return true; }
  return false;
}
async function deliverPush(sub, payload) {
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 3600 });
    db.touchPushSubscription(sub.endpoint).catch(() => {});
    return true;
  } catch (err) {
    // Qurilma obunani bekor qilgan — o'chiramiz
    if (err.statusCode === 404 || err.statusCode === 410) await db.deletePushSubscription(sub.endpoint).catch(() => {});
    else console.error('Push yuborish xatoligi:', err.statusCode || err.message);
    return false;
  }
}
async function sendPush(userId, type, data, tag, opts) {
  if (!pushReady || !userId) return 0;
  if (!(opts && opts.force) && isActive(userId)) return 0;
  const subs = await db.listPushSubscriptions(userId);
  if (!subs.length) return 0;
  const prefs = await db.getPushPrefs(userId);
  let ownName = null;
  if (['achievement', 'rank_up', 'duel_end', 'holiday_badge'].includes(type)) { const u = await db.getUserById(userId); ownName = u && u.username; }
  let sent = 0;
  for (const sub of subs) {
    const m = pushMessage(type, data, sub.lang, ownName);
    if (!(opts && opts.force) && prefs[m.category] === false) continue;
    if (await deliverPush(sub, { title: m.title, body: m.body, url: m.url, tag: String(tag || type).slice(0, 60) })) sent++;
  }
  return sent;
}

// --- 🚩 Bayroqlar bellashuvi (kodda "war"): mavsum = kalendar oyi (Toshkent vaqti, UTC+5) ---
// G'alaba 3, durrang 1; boshqa davlat klubiga qarshi g'alaba +1, qo'shni davlat klubiga qarshi yana +1.
// Hudud hukmdori: o'z klubining ochkosi yoki qo'shni klub ochkosining yarmi — qaysi biri katta bo'lsa (bo'sh hududni qo'shni egallaydi).
const GEO = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', 'geo-codes.json'), 'utf8'));
const WAR_TZ_MS = 5 * 3600 * 1000;
function warSeasonKey(t) { return new Date((t || Date.now()) + WAR_TZ_MS).toISOString().slice(0, 7); }
function warSeasonEnd(season) { const [y, m] = season.split('-').map(Number); return new Date(Date.UTC(y, m, 1) - WAR_TZ_MS).toISOString(); }
function warPrevSeason(season) { const [y, m] = season.split('-').map(Number); const d = new Date(Date.UTC(y, m - 2, 1)); return d.toISOString().slice(0, 7); }
// 🧵 Profil naqshi — faqat hali ham ochiq bo'lsa (karvon shu shaharga yetgan)
function bannerOf(u) {
  const i = Caravan.CITIES.findIndex((c) => c.key === u.profile_banner);
  return i >= 0 && i <= Caravan.cityIndex(Caravan.pointsOf(u.stats)) ? u.profile_banner : null;
}

async function computeWar(season) {
  const totals = await db.warTotals(season);
  const byCode = new Map(totals.map(t => [t.code, t]));
  const codes = new Set([...Object.keys(GEO.neighbors), ...totals.map(t => t.code)]);
  const regions = {};
  for (const code of codes) {
    let best = null;
    const own = byCode.get(code);
    if (own && own.points > 0) best = { ruler: code, power: own.points };
    for (const n of GEO.neighbors[code] || []) {
      const c = byCode.get(n);
      const power = c ? c.points / 2 : 0;
      if (power > 0 && (!best || power > best.power)) best = { ruler: n, power };
    }
    if (best) regions[code] = { ruler: best.ruler, power: Math.round(best.power * 10) / 10, own: own ? own.points : 0 };
  }
  const territories = {};
  for (const r of Object.values(regions)) territories[r.ruler] = (territories[r.ruler] || 0) + 1;
  const clubs = totals.map(t => ({ ...t, territories: territories[t.code] || 0 }))
    .sort((a, b) => b.territories - a.territories || b.points - a.points || a.country.localeCompare(b.country));
  return { season, endsAt: warSeasonEnd(season), regions, clubs, ruler: clubs[0] && clubs[0].territories ? clubs[0] : null };
}
// O'tgan mavsum hukmdorini bir marta yozib, klub a'zolariga xabar beriladi
// 👤 Muddati o'tgan (ro'yxatdan o'tmagan) mehmon akkauntlari o'chiriladi (JWT 7 kun — tokenlari allaqachon yaroqsiz)
async function cleanupGuests(cutoffIso) {
  try {
    const ids = await db.deleteExpiredGuests(cutoffIso || new Date(Date.now() - GUEST_TTL_MS).toISOString());
    for (const id of ids) { guestUsers.delete(id); deletedUsers.add(id); }
    if (ids.length) console.log('Mehmon akkauntlari tozalandi:', ids.length);
    return ids;
  } catch (err) { console.error('Mehmonlarni tozalash xatoligi:', err); return []; }
}

// --- ⭐ Kun o'yini: kechagi (Toshkent vaqti) eng qiziqarli o'yin; kun davomida o'zgarmaydi (game_of_day jadvali) ---
const GOD_REASON = { checkmate: 40, stalemate: 25, resign: 20, timeout: 12, agreement: 10, threefold: 10, fifty: 8, insufficient: 8, abandon: -100 };
// Baho: uzunlik (120 yarim yurishgacha) + tugash sababi + o'yinchilar kuchi + Chess960 qiziqarliligi
function godScore(c) {
  return Math.min(Number(c.moveCount) || 0, 120) + (GOD_REASON[c.reason] || 0)
    + Math.round(((Number(c.rating) || 1500) + (Number(c.oppRating) || 1500)) / 100) + (c.variant && c.variant !== 'standard' ? 8 : 0);
}
function tashkentDayStart(t) {
  const d = new Date((t || Date.now()) + WAR_TZ_MS);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - WAR_TZ_MS;
}
const dayKeyOf = (startMs) => new Date(startMs + WAR_TZ_MS).toISOString().slice(0, 10);
async function pickGameOfDay(now) {
  const start = tashkentDayStart(now);
  const day = dayKeyOf(start);
  let row = await db.getGameOfDay(day);
  if (!row) {
    const recent = new Set(await db.recentGameOfDayIds(dayKeyOf(start - 30 * 864e5)));
    const pick = async (days) => (await db.gameOfDayCandidates(new Date(start - days * 864e5).toISOString(), new Date(start).toISOString())).filter((c) => !recent.has(c.id));
    let list = await pick(1);
    if (!list.length) list = await pick(7);
    if (!list.length) return null;
    list.sort((a, b) => godScore(b) - godScore(a));
    const best = list[0];
    const chosen = await db.setGameOfDay(day, best.userId, best.id, godScore(best));
    row = await db.getGameOfDay(day);
    if (chosen && row && row.gameId === best.id) {
      notify(best.userId, 'game_of_day', { day, opponent: best.opponent });
      notify(best.oppId, 'game_of_day', { day, opponent: best.username });
    }
  }
  if (!row) return null;
  const white = await db.getUserById(row.userId);
  const g = white && await db.getUserGameById(row.userId, row.gameId);
  if (!g) return null;
  const black = await db.getUserByUsername(g.opponent);
  const side = (u, name) => ({ name: u ? u.username : name, rating: u ? u.rating || 1500 : null, country: u ? u.country || null : null });
  return {
    day, id: g.id, white: side(white), black: side(black, g.opponent),
    result: g.result === 'win' ? '1-0' : g.result === 'loss' ? '0-1' : '1/2-1/2', reason: g.reason || null,
    variant: g.variant || 'standard', startFen: g.startFen || null, clock: g.clock || null, playedAt: g.timestamp || null, moves: g.moves || []
  };
}

// --- 📖 Debyutlar (assets/openings.json — lichess chess-openings, CC0): o'yinchining o'z o'yinlaridan statistika ---
let OPENINGS_DB = null;
function openingsDb() {
  if (!OPENINGS_DB) { try { OPENINGS_DB = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', 'openings.json'), 'utf8')); } catch (e) { OPENINGS_DB = {}; } }
  return OPENINGS_DB;
}
// Birinchi 40 yarim yurish ichidagi oxirgi tanish pozitsiya — [ECO, nom] (klientdagi openings.js bilan bir xil qoida)
function openingOfMoves(moves) {
  const dbo = openingsDb();
  const c = new Chess();
  let found = null;
  for (let i = 0; i < moves.length && i < 40; i++) {
    if (!c.move(moves[i])) break;
    const hit = dbo[c.fen().split(' ').slice(0, 4).join(' ')];
    if (hit) found = hit;
  }
  return found;
}
async function openingStats(userId) {
  const games = (await db.getUserHistory(userId, { withMoves: true }))
    .filter((g) => (!g.variant || g.variant === 'standard') && Array.isArray(g.moves) && g.moves.length >= 2 && (g.color === 'w' || g.color === 'b'))
    .slice(-400);
  const fams = new Map();
  let unknown = 0;
  for (const g of games) {
    const op = openingOfMoves(g.moves);
    if (!op) { unknown++; continue; }
    const family = op[1].split(':')[0].trim();
    const f = fams.get(family) || { name: family, games: 0, win: 0, draw: 0, loss: 0, white: { games: 0, win: 0, draw: 0, loss: 0 }, black: { games: 0, win: 0, draw: 0, loss: 0 }, ecos: {}, lines: {} };
    const side = g.color === 'w' ? f.white : f.black;
    const r = g.result === 'win' ? 'win' : g.result === 'loss' ? 'loss' : 'draw';
    f.games++; f[r]++; side.games++; side[r]++;
    f.ecos[op[0]] = (f.ecos[op[0]] || 0) + 1;
    f.lines[op[1]] = (f.lines[op[1]] || 0) + 1;
    fams.set(family, f);
  }
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0][0];
  const openings = [...fams.values()].sort((a, b) => b.games - a.games || a.name.localeCompare(b.name)).slice(0, 15)
    .map(({ ecos, lines, ...f }) => ({ ...f, eco: top(ecos), line: top(lines) }));
  return { analysed: games.length, unknown, openings };
}

// --- 🎯 Haftalik vazifalar (quests.js): progress shu haftaning o'yinlaridan; uchalasi bajarilsa — nishon (quest_weeks) ---
async function questProgress(userId, now) {
  const t = now || Date.now();
  const from = new Date(Quests.weekStart(t)).toISOString();
  const to = new Date(Quests.weekStart(t) + 7 * 864e5).toISOString();
  const games = (await db.getUserHistory(userId, { from, to })).map((g) => ({ ...g, mode: clockModeOfLabel(g.clock) }));
  const list = Quests.progress(games, t);
  const week = Quests.weekKey(t);
  let completed = await db.hasQuestWeek(userId, week);
  if (!completed && list.every((q) => q.done)) {
    completed = true;
    if (await db.addQuestWeek(userId, week)) {
      const total = await db.countQuestWeeks(userId);
      notify(userId, 'quests_done', { total });
    }
  }
  return { week, endsAt: to, quests: list, completed, badges: await db.countQuestWeeks(userId) };
}
// 🌸 Bayram vazifasi: davom etayotgan har bayram uchun shu kunlardagi o'yinlar soni; NEED ga yetsa — nishon va bildirishnoma
async function holidayProgress(userId, now) {
  const out = [];
  for (const h of Holidays.active(now, HOLIDAY_FORCE)) {
    const games = (await db.getUserHistory(userId, { from: new Date(h.start).toISOString(), to: new Date(h.end).toISOString() })).filter((g) => g.reason !== 'aborted');
    let done = await db.hasHolidayBadge(userId, h.key, h.year);
    if (!done && games.length >= h.need) {
      done = true;
      if (await db.addHolidayBadge(userId, h.key, h.year)) notify(userId, 'holiday_badge', { holiday: h.key, year: h.year });
    }
    out.push({ key: h.key, have: games.length, done });
  }
  return out;
}

// "3+2" → rejim (clockMode bilan bir xil qoida)
function clockModeOfLabel(label) {
  const m = /^(\d+(?:\.\d+)?)\+(\d+)$/.exec(String(label || ''));
  return m ? clockMode({ initial: Math.round(Number(m[1]) * 60), increment: Number(m[2]) }) : null;
}

async function closeWarSeasons() {
  try {
    const prev = warPrevSeason(warSeasonKey());
    if (await db.getWarSeason(prev)) return;
    const state = await computeWar(prev);
    if (!(await db.saveWarSeason(prev, state.ruler))) return;
    if (state.ruler) for (const uid of await db.getClubMemberIdsByCode(state.ruler.code)) notify(uid, 'war_ruler', { season: prev, club: state.ruler.country, code: state.ruler.code, territories: state.ruler.territories });
  } catch (err) { console.error('Urush mavsumi xatoligi:', err.message); }
}
// Ochko yig'ishga qarshi: juda qisqa o'yin (bir klubdagi do'stlar 1 yurishda taslim bo'lib navbat bilan "yutishi") ochko bermaydi,
// bir juftlik bir kunda ko'pi bilan WAR_PAIR_DAILY ta ochkoli o'yin (xotirada; deploydan keyin qaytadan sanaladi)
const WAR_MIN_PLIES = 10, WAR_PAIR_DAILY = 3;
const warPairGames = new Map(); // "kun|id1|id2" -> o'yinlar soni
async function recordWarPoints(players, before, winnerColor, plies) {
  const season = warSeasonKey();
  if ((plies || 0) < WAR_MIN_PLIES) return;
  const day = new Date(Date.now() + WAR_TZ_MS).toISOString().slice(0, 10);
  const pairKey = day + '|' + players.map((p) => p.userId).sort().join('|');
  const played = warPairGames.get(pairKey) || 0;
  if (played >= WAR_PAIR_DAILY) return;
  warPairGames.set(pairKey, played + 1);
  if (warPairGames.size > 5000) for (const k of warPairGames.keys()) if (!k.startsWith(day)) warPairGames.delete(k);
  for (const p of players) {
    const me = before[p.color], opp = before[otherColor(p.color)];
    if (!me || !me.club_country || !me.club_code) continue;
    const result = scoreFor(p.color, winnerColor);
    let points = result === 'win' ? 3 : (result === 'draw' ? 1 : 0);
    const oppCode = opp && opp.club_code ? opp.club_code : null;
    if (result === 'win' && oppCode && oppCode !== me.club_code) {
      points += 1;
      if ((GEO.neighbors[me.club_code] || []).includes(oppCode)) points += 1;
    }
    if (points > 0) await db.addWarPoints({ season, club: me.club_country, code: me.club_code, userId: p.userId, opponentCode: oppCode, points });
  }
  invalidateCache('war:' + season);
}

// --- 🤝 Odob reytingi: o'tgan oy (Toshkent vaqti) eng ko'p 👍 olgan o'yinchi (kamida 5 baho va 90%) ---
async function closeSportMonths() {
  try {
    const prev = warPrevSeason(warSeasonKey());
    if (await db.getSportAward(prev)) return;
    const [y, m] = prev.split('-').map(Number);
    const from = new Date(Date.UTC(y, m - 1, 1) - WAR_TZ_MS).toISOString(), to = warSeasonEnd(prev);
    const winner = (await db.sportMonthLeaders(from, to))
      .filter(r => r.total >= 5 && r.up / r.total >= 0.9)
      .sort((a, b) => b.up - a.up || b.total - a.total)[0] || null;
    if (!(await db.saveSportAward(prev, winner)) || !winner) return;
    await awardAchievement(winner.userId, 'sportsman');
    notify(winner.userId, 'sportsman_month', { month: prev, up: winner.up });
  } catch (err) { console.error('Odob reytingi xatoligi:', err.message); }
}

// --- 🔮 Bashorat o'yini: tomoshabinlar "Kim yutadi?" (dastlabki 10 yurish ichida) va "Keyingi yurishni top" ---
// Natija ochkosi ehtimolga teskari: kutilmagan natija qimmatroq (Elo kutilmasi, durrang ~20%), 10–100 oralig'ida.
const PREDICT_OPEN_PLIES = 20;
const GUESS_POINTS = 5;
const PREDICT_PICKS = ['w', 'd', 'b'];
function predState(room) { return room.pred || (room.pred = { result: new Map(), guesses: new Map(), odds: null, clubs: null }); }
async function predictOdds(room) {
  const ps = predState(room);
  if (ps.odds) return ps.odds;
  const mode = ratingModeOf(room);
  const r = {}, clubs = {};
  for (const p of room.players) {
    const u = p.userId ? await db.getUserById(p.userId) : null;
    r[p.color] = u ? (Number(u.ratings_by_mode && u.ratings_by_mode[mode]) || u.rating || 1500) : 1500;
    clubs[p.color] = u && u.club_code ? { code: u.club_code, name: u.club_country } : null;
  }
  const ew = 1 / (1 + Math.pow(10, ((r.b || 1500) - (r.w || 1500)) / 400));
  const prob = { w: 0.8 * ew, d: 0.2, b: 0.8 * (1 - ew) };
  const pts = (p) => Math.max(10, Math.min(100, Math.round(10 / Math.max(p, 0.01))));
  ps.odds = { w: pts(prob.w), d: pts(prob.d), b: pts(prob.b) };
  ps.clubs = clubs;
  return ps.odds;
}
function predictOpen(room) { return room.status === 'active' && room.chess.history().length < PREDICT_OPEN_PLIES; }
async function predictStats(room) {
  const ps = predState(room);
  const odds = await predictOdds(room);
  const counts = { w: 0, d: 0, b: 0 };
  for (const v of ps.result.values()) counts[v.pick]++;
  let support = null;
  // Liga o'yini: har tomon klubining a'zolari o'z o'yinchisiga ishonadi
  if (room.leagueGameId && ps.clubs) {
    support = {};
    for (const side of ['w', 'b']) {
      const club = ps.clubs[side];
      support[side] = club ? { code: club.code, name: club.name, count: [...ps.result.values()].filter(v => v.pick === side && v.club === club.code).length } : null;
    }
  }
  return { counts, total: ps.result.size, odds, open: predictOpen(room), openUntil: PREDICT_OPEN_PLIES, support, guessPoints: GUESS_POINTS };
}
async function emitPredictStats(roomId, room) {
  try { io.to('watch_' + roomId).emit('predict-stats', { roomId, ...(await predictStats(room)) }); } catch (e) {}
}
// Deploydan keyin: bazadagi ochiq natija bashoratlari xotiraga
async function loadPredictions(roomId, room) {
  const ps = predState(room);
  for (const p of await db.roomResultPredictions(roomId)) ps.result.set(p.userId, { pick: p.pick, club: p.clubCode });
}
// Yurish qilindi: shu yurish uchun taxminlar baholanadi
function resolveGuesses(roomId, room, ply, san) {
  const ps = predState(room);
  const map = ps.guesses.get(ply);
  if (!map || !map.size) return;
  ps.guesses.delete(ply);
  const rows = [...map.entries()].map(([userId, pick]) => ({ userId, pick, correct: pick === san, points: pick === san ? GUESS_POINTS : 0 }));
  db.saveMoveGuesses(roomId, ply, rows).catch(() => {});
  io.to('watch_' + roomId).emit('guess-result', { roomId, ply, san, correct: rows.filter(r => r.correct).length, total: rows.length, points: GUESS_POINTS });
}
// O'yin tugadi: natija bashoratlari (bekor qilingan o'yinda — hisobga olinmaydi)
async function resolvePredictions(roomId, room, winnerColor, reason) {
  try {
    const list = await db.roomResultPredictions(roomId);
    if (!list.length) return;
    const odds = await predictOdds(room);
    const outcome = reason === 'aborted' ? null : (winnerColor || 'd');
    const white = room.players.find(p => p.color === 'w'), black = room.players.find(p => p.color === 'b');
    let winners = 0;
    for (const p of list) {
      const correct = outcome === null ? null : p.pick === outcome;
      const points = correct ? odds[outcome] : 0;
      await db.resolveResultPrediction(roomId, p.userId, correct, points);
      if (correct) {
        winners++;
        notify(p.userId, 'prediction_won', { points, white: white && white.username, black: black && black.username, outcome }, 'pred');
      }
    }
    invalidateCache('pred:month', 'pred:all');
    io.to('watch_' + roomId).emit('predict-resolved', { roomId, outcome, points: outcome ? odds[outcome] : 0, winners, total: list.length });
  } catch (err) { console.error('Bashorat xatoligi:', err.message); }
}
function monthStartIso(season) { const [y, m] = season.split('-').map(Number); return new Date(Date.UTC(y, m - 1, 1) - WAR_TZ_MS).toISOString(); }
// O'tgan oyning eng ko'p ochko to'plagan bashoratchisi (kamida 50 ochko)
async function closePredictionMonths() {
  try {
    const prev = warPrevSeason(warSeasonKey());
    if (await db.getPredictionAward(prev)) return;
    const top = (await db.monthPredictionLeaders(monthStartIso(prev), warSeasonEnd(prev)))[0];
    const winner = top && top.points >= 50 ? top : null;
    if (!(await db.savePredictionAward(prev, winner)) || !winner) return;
    await awardAchievement(winner.userId, 'oracle');
    notify(winner.userId, 'oracle_month', { month: prev, points: winner.points });
  } catch (err) { console.error('Bashorat mukofoti xatoligi:', err.message); }
}

// --- ⚔️ Raqib-do'st: eng ko'p va teng o'ynaladigan raqib (kamida 3 o'yin) ---
async function rivalsOf(userId) {
  return (await db.opponentSummary(userId)).filter(r => r.games >= 3)
    .map(r => ({ ...r, score: r.games - Math.abs(r.win - r.loss) * 0.6 }))
    .sort((a, b) => b.score - a.score || b.games - a.games).slice(0, 3)
    .map(({ score, ...r }) => r);
}
async function headToHead(userId, opponentName) {
  const row = (await db.opponentSummary(userId, opponentName))[0];
  return row ? { games: row.games, win: row.win, draw: row.draw, loss: row.loss } : { games: 0, win: 0, draw: 0, loss: 0 };
}
// Raqib onlayn bo'ldi — ikkalasiga ham (6 soatda bir martadan ko'p emas)
const rivalPings = new Map();
async function notifyRivalOnline(userId) {
  try {
    const me = await db.getUserById(userId);
    const top = me && (await rivalsOf(me.id))[0];
    if (!top) return;
    const rival = await db.getUserByUsername(top.name);
    if (!rival || !isOnline(rival.id) || blockedPair(userId, rival.id)) return;
    const key = [userId, rival.id].sort().join('|');
    if (Date.now() - (rivalPings.get(key) || 0) < 6 * 3600 * 1000) return;
    rivalPings.set(key, Date.now());
    notify(rival.id, 'rival_online', { name: me.username, win: top.loss, draw: top.draw, loss: top.win }, 'rv:' + userId);
    notify(userId, 'rival_online', { name: rival.username, win: top.win, draw: top.draw, loss: top.loss }, 'rv:' + rival.id);
  } catch (e) {}
}

// --- Yutuqlar: shartlar o'yinchi ma'lumotidan hisoblanadi; yangilari bildirishnoma bilan ---
const ACHIEVEMENT_RULES = [
  ['first_win', (c) => c.wins >= 1], ['wins_10', (c) => c.wins >= 10], ['wins_50', (c) => c.wins >= 50], ['wins_100', (c) => c.wins >= 100],
  ['games_10', (c) => c.games >= 10], ['games_100', (c) => c.games >= 100], ['games_500', (c) => c.games >= 500],
  ['streak_5', (c) => c.streak >= 5], ['streak_10', (c) => c.streak >= 10], ['mate_10', (c) => c.mates >= 10],
  ['rank_gold', (c) => c.peak >= 1600], ['rank_platinum', (c) => c.peak >= 1800], ['rank_diamond', (c) => c.peak >= 2000], ['rank_master', (c) => c.peak >= 2200],
  ['chess960', (c) => c.played960], ['all_modes', (c) => c.allModes], ['friends_5', (c) => c.friends >= 5],
  ['club_member', (c) => c.club], ['league_player', (c) => c.league],
  ['invite_3', (c) => c.invited >= 3], ['invite_10', (c) => c.invited >= 10]
];
async function checkAchievements(userId, opts) {
  try {
    const u = await db.getUserById(userId);
    if (!u) return [];
    const history = await db.getUserHistory(userId);
    const s = u.stats || {};
    let streak = 0, run = 0;
    for (const g of history) { if (g.result === 'win') { run++; streak = Math.max(streak, run); } else run = 0; }
    const byMode = u.stats_by_mode || {};
    const played = (m) => { const x = byMode[m] || {}; return (x.wins || 0) + (x.losses || 0) + (x.draws || 0) > 0; };
    const ratings = u.ratings_by_mode || {};
    const ctx = {
      wins: s.wins || 0, games: (s.wins || 0) + (s.losses || 0) + (s.draws || 0), streak,
      mates: history.filter(g => g.result === 'win' && g.reason === 'checkmate').length,
      peak: Math.max(0, ...['rapid', 'blitz', 'bullet', 'chess960'].filter(played).map(m => ratings[m] || 0)),
      played960: history.some(g => g.variant === 'chess960'),
      allModes: ['rapid', 'blitz', 'bullet'].every(played),
      friends: await db.countFriends(userId), club: !!u.club_country, league: history.some(g => g.league),
      invited: await db.countInvited(userId)
    };
    const earned = [];
    for (const [key, test] of ACHIEVEMENT_RULES) {
      if (test(ctx) && await db.addAchievement(userId, key)) earned.push(key);
    }
    if (!(opts && opts.silent)) for (const key of earned) notify(userId, 'achievement', { key });
    return earned;
  } catch (err) { console.error('Yutuqlar xatoligi:', err.message); return []; }
}
async function awardAchievement(userId, key) {
  try { if (await db.addAchievement(userId, key)) notify(userId, 'achievement', { key }); } catch (e) {}
}

// Kuzatuvchilarga: "X o'yin boshladi" (faqat onlayn kuzatuvchilarga, har o'yinchi bo'yicha bitta bildirishnoma)
async function announceGame(roomId, room) {
  for (const p of room.players) {
    if (!p.userId) continue;
    try {
      for (const fid of await db.getFollowerIds(p.userId)) {
        if (isOnline(fid) && !room.players.some(x => x.userId === fid)) notify(fid, 'follow_playing', { name: p.username, roomId }, 'fp:' + p.userId);
      }
    } catch (e) {}
  }
}

// Chat: jim qilingan o'yinchilar (users.muted_until) va taqiqlangan so'zlar (chat_filter) — xotirada
const mutes = new Map();
let chatFilterWords = [];
let chatFilterRe = null;
function setChatFilter(words) {
  chatFilterWords = words.slice();
  const parts = words.filter(Boolean).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  chatFilterRe = parts.length ? new RegExp('(^|[^\\p{L}\\p{N}])(' + parts.join('|') + ')(?=$|[^\\p{L}\\p{N}])', 'giu') : null;
}
function cleanChat(text) {
  if (!chatFilterRe || typeof text !== 'string') return text;
  return text.replace(chatFilterRe, (m, pre, word) => pre + '*'.repeat([...word].length));
}
function mutedUntil(userId) {
  const until = mutes.get(userId);
  if (!until) return null;
  if (new Date(until) <= new Date()) { mutes.delete(userId); return null; }
  return until;
}

// Kesh: og'ir va tez-tez so'raladigan javoblar (reyting jadvali, kunlik g'oliblar, klublar, jonli o'yinlar)
const apiCache = new Map();
async function cached(key, ttlMs, fn) {
  const hit = apiCache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const value = await fn();
  apiCache.set(key, { at: Date.now(), value });
  return value;
}
function invalidateCache(...keys) { for (const k of keys) apiCache.delete(k); }

// --- Fair-play: o'yin oxirida har o'yinchi uchun signal (fokus yo'qotish, yurish vaqtlari bir xilligi) ---
async function recordFairplay(room, winnerColor) {
  for (const p of room.players) {
    if (!p.userId) continue;
    const times = (p.moveTimes || []).slice(5);
    if (times.length < 8) continue;
    const opp = room.players.find(x => x.color !== p.color);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const sd = Math.sqrt(times.reduce((a, b) => a + (b - avg) ** 2, 0) / times.length);
    const cv = avg ? sd / avg : 0;
    const moves = (p.moveTimes || []).length;
    const blurs = p.blurs || 0;
    const result = winnerColor === null ? 'draw' : (winnerColor === p.color ? 'win' : 'loss');
    // Shubhali: g'alaba + har to'rtinchi yurishdan ko'p oynadan chiqish, yoki juda bir xil (mashinaga o'xshash) vaqtlar
    const suspicious = result === 'win' && (blurs / moves >= 0.25 || (cv < 0.2 && avg > 1500 && times.length >= 15));
    await db.addFairplayGame({ userId: p.userId, opponentId: opp && opp.userId, mode: ratingModeOf(room), moves, blurs, avgMs: Math.round(avg), cv: Math.round(cv * 100) / 100, result, suspicious });
    if (!suspicious) continue;
    const recent = await db.recentFairplay(p.userId, 20);
    const u = await db.getUserById(p.userId);
    if (u && !u.fairplay_flag && recent.filter(r => Number(r.suspicious)).length >= 3) {
      await db.setFairplayFlag(p.userId, 'flagged');
      for (const a of await db.adminIds()) notify(a, 'fairplay_flag', { name: p.username });
    }
  }
}

// 🕵️ Dvigatelga moslik (fairplay-engine.js): reytingli standart o'yinlar navbat bilan, alohida oqimda tahlil qilinadi.
// FAIRPLAY_ENGINE=0 — o'chiq; FAIRPLAY_DEPTH — chuqurlik (standart 9).
const fairplayAnalyzer = process.env.FAIRPLAY_ENGINE === '0' ? null : FairplayEngine.createAnalyzer({
  depth: Number(process.env.FAIRPLAY_DEPTH) || 9,
  onResult: async (job, metrics) => {
    for (const p of job.players) {
      const m = metrics[p.color];
      if (!p.userId || !m || m.moves < FairplayEngine.MIN_MOVES) continue;
      const suspicious = FairplayEngine.isEngineLike(m, p.rating);
      await db.addFairplayEngine({ userId: p.userId, ref: job.ref, mode: job.mode, moves: m.moves, match: m.match, acpl: m.acpl, rating: p.rating, suspicious });
      if (!suspicious) continue;
      const u = await db.getUserById(p.userId);
      if (u && !u.fairplay_flag && FairplayEngine.shouldFlag(await db.recentFairplayEngine(p.userId, 10))) {
        await db.setFairplayFlag(p.userId, 'flagged');
        for (const a of await db.adminIds()) notify(a, 'fairplay_flag', { name: u.username, engine: true });
      }
    }
  }
});
// O'yinchining oxirgi reytingli standart o'yinlari (shikoyat yoki admin so'rovi bilan)
async function analyzeRecentGames(userId, limit) {
  if (!fairplayAnalyzer) return 0;
  const u = await db.getUserById(userId);
  if (!u) return 0;
  const games = (await db.getUserHistory(userId, { withMoves: true })).filter((g) => g.rated && (!g.variant || g.variant === 'standard') && g.reason !== 'aborted' && g.moves && g.moves.length).slice(-(limit || 10));
  let n = 0;
  for (const g of games) {
    const mode = clockModeOfLabel(g.clock);
    if (fairplayAnalyzer.enqueue({ ref: 'ug:' + g.id, mode, moves: g.moves, players: [{ userId, color: g.color, rating: (u.ratings_by_mode && u.ratings_by_mode[mode]) || u.rating }] })) n++;
  }
  return n;
}

// 📚 Kutubxona materialini tekshirish: tur, til, uzunliklar; partiya — PGN dagi har yurish qonuniy (chess.js); havola — faqat http(s)
const LIBRARY_KINDS = ['article', 'game', 'book'];
const LIBRARY_LANGS = ['', 'uz', 'en', 'ru', 'es', 'de', 'fr', 'tr', 'kk', 'tg', 'ky', 'tk', 'az'];
function validateLibraryItem(b) {
  const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
  const kind = String(b.kind || '');
  const lang = String(b.lang || '');
  if (!LIBRARY_KINDS.includes(kind) || !LIBRARY_LANGS.includes(lang)) return { error: "Ma'lumotlar noto'g'ri!" };
  const title = str(b.title, 140);
  if (title.length < 2 || title.length > 120) return { error: "Sarlavha 2–120 belgi bo'lsin!" };
  const item = { id: b.id ? String(b.id) : null, kind, lang, title, data: {} };
  if (kind === 'article') {
    const body = str(b.body, 9000);
    if (body.length < 20 || body.length > 8000) return { error: "Matn juda qisqa yoki juda uzun!" };
    item.data = { icon: str(b.icon, 8) || '📝', lead: str(b.lead, 300), body };
  } else if (kind === 'game') {
    const white = str(b.white, 60), black = str(b.black, 60);
    if (!white || !black) return { error: "Ma'lumotlar noto'g'ri!" };
    const result = ['1-0', '0-1', '1/2-1/2'].includes(b.result) ? b.result : '1/2-1/2';
    const text = String(b.pgn || '').slice(0, 20000).replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/;[^\n]*/g, ' ');
    const tokens = text.split(/\s+/).map((t) => t.replace(/^\d+\.+/, '')).filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t) && !/^\$\d+$/.test(t));
    const chess = new Chess();
    const moves = [];
    for (const t of tokens) { const m = chess.move(t.replace(/[!?]+$/, '')); if (!m) return { error: "PGN noto'g'ri yoki yurishlar qonuniy emas!" }; moves.push(m.san); }
    if (moves.length < 2) return { error: "PGN noto'g'ri yoki yurishlar qonuniy emas!" };
    const year = Number(b.year);
    item.data = { white, black, result, moves, year: Number.isInteger(year) && year >= 1400 && year <= 2100 ? year : null, place: str(b.place, 60), story: str(b.story, 1500),
      reason: chess.in_checkmate() ? 'checkmate' : (str(b.reason, 20) || 'resign') };
  } else {
    const url = str(b.url, 500);
    if (!/^https?:\/\/[^\s"'<>]+$/i.test(url)) return { error: "Havola http:// yoki https:// bilan boshlanishi kerak!" };
    item.data = { author: str(b.author, 100), url, desc: str(b.desc, 1500) };
  }
  return { item };
}

function emitWatchCount(roomId) {
  const count = (io.sockets.adapter.rooms.get('watch_' + roomId) || new Set()).size;
  io.to('watch_' + roomId).emit('watch-count', { roomId, count });
}

// Jonli o'yin haqida ma'lumot (tomosha qilish ro'yxati va tomoshabin uchun)
async function liveGameInfo(roomId, room) {
  const side = async (color) => {
    const p = room.players.find(x => x.color === color);
    const u = p && p.userId ? await db.getUserById(p.userId) : null;
    return {
      username: p ? p.username : '?',
      rating: u ? (Number(u.ratings_by_mode && u.ratings_by_mode[ratingModeOf(room)]) || u.rating || 1500) : 1500,
      country: u ? u.country || null : null
    };
  };
  const kind = room.leagueGameId ? 'league' : 'casual', label = null;
  return {
    roomId, kind, label, mode: room.mode, rated: room.rated, ...variantInfo(room),
    clock: { initial: room.clock.initial, increment: room.clock.increment },
    white: await side('w'), black: await side('b'),
    moves: room.chess.history().length,
    watchers: (io.sockets.adapter.rooms.get('watch_' + roomId) || new Set()).size
  };
}

// Uzilgan o'yinchi qaytdi (yangi socket bilan authenticate qildi): davom etayotgan o'yinini tiklaymiz
async function resumeGames(socket) {
  const userId = socket.data.userId;
  for (const [roomId, room] of rooms.entries()) {
    const player = room.players.find(p => p.userId === userId);
    if (!player || player.socketId === socket.id) continue;
    if (room.status !== 'active') {
      // Uzilib turgan paytda tugagan o'yin natijasi
      if (room.endPayloads && room.endPayloads[player.color] && Date.now() - room.endedAt < FINISHED_ROOM_TTL_MS && !io.sockets.sockets.get(player.socketId)) {
        player.socketId = socket.id;
        socket.emit('game-ended', room.endPayloads[player.color]);
      }
      continue;
    }
    clearTimeout(player.awayTimer);
    player.away = false;
    if (room.paused && room.chess.turn() === player.color) resumeClock(roomId, room);
    const oldSocket = io.sockets.sockets.get(player.socketId);
    if (oldSocket) oldSocket.leave(roomId);
    player.socketId = socket.id;
    socket.join(roomId);
    const opponent = room.players.find(p => p.color !== player.color);
    const oppUser = opponent && opponent.userId ? await db.getUserById(opponent.userId) : null;
    socket.emit('game-resume', {
      roomId,
      color: player.color,
      moves: room.chess.history({ verbose: true }).map(m => ({ from: m.from, to: m.to, promotion: m.promotion })),
      clock: { initial: room.clock.initial, increment: room.clock.increment },
      clockState: clockPayload(room),
      rated: room.rated,
      mode: room.mode,
      ...variantInfo(room),
      drawOffered: room.drawOfferBy === otherColor(player.color),
      opponentAway: !!(opponent && opponent.away),
      opponent: oppUser
        ? { username: oppUser.username, rating: oppUser.rating || 1500, ratingsByMode: oppUser.ratings_by_mode, country: oppUser.country || null }
        : { username: opponent ? opponent.username : '?', rating: 1500 },
      league: room.leagueGameId ? { gameId: room.leagueGameId } : null,
      duel: room.duel ? duelPublic(room.duel) : null
    });
    socket.to(roomId).emit('opponent-back', { roomId });
  }
}

// O'yinchi xonani tark etsa: o'yin davom etayotgan bo'lsa — mag'lubiyat (yoki bekor qilish)
function handlePlayerLeave(socket, roomId, room) {
  const player = findPlayer(room, socket.id);
  if (!player) return;
  socket.leave(roomId);
  if (room.status === 'active') {
    const winner = room.chess.history().length < 2 ? null : otherColor(player.color);
    endGame(roomId, room, winner, winner ? 'abandon' : 'aborted');
  }
  room.players = room.players.filter(p => p.socketId !== socket.id);
  if (room.players.length === 0) rooms.delete(roomId);
}

// --- Bloklar (o'zaro): "a|b" — a b ni bloklagan. Har startda bazadan yuklanadi ---
const blocks = new Set();
const lastChatPost = new Map(); // userId -> oxirgi xabar vaqti (chat spam cheklovi)
const lastFriendNotify = new Map(); // "yuboruvchi|oluvchi" -> oxirgi do'stlik so'rovi bildirishnomasi
function blockedPair(a, b) { return blocks.has(a + '|' + b) || blocks.has(b + '|' + a); }

// --- Hisobni bloklash (ban): userId -> { until, reason }. Har so'rovda bazaga murojaat qilmaslik uchun xotirada ---
const bans = new Map();
const deletedUsers = new Set(); // o'chirilgan akkauntlar (eski JWT bilan kira olmasin)
// 👤 Mehmonlar (users.is_guest) — xotirada; reytingsiz o'ynaydi, chat/do'stlik/klub va boshqa "yozuvchi" amallar yopiq
const guestUsers = new Set();
const isGuest = (userId) => !!userId && guestUsers.has(userId);
const GUEST_TTL_MS = 8 * 24 * 60 * 60 * 1000; // JWT 7 kun — undan keyin mehmon akkaunti o'chiriladi
const GUEST_PREFIX = { uz: 'Mehmon', uzc: 'Mehmon', en: 'Guest', ru: 'Гость', es: 'Invitado', de: 'Gast', fr: 'Invite', tr: 'Misafir', kk: 'Қонақ', tg: 'Меҳмон', ky: 'Конок', tk: 'Myhman', az: 'Qonaq' };
const GUEST_NAME_RE = new RegExp('^(' + Object.values(GUEST_PREFIX).join('|') + ')-', 'i');
// Mehmonga ruxsat etilgan yozuvchi so'rovlar (qolganlari 403 "ro'yxatdan o'ting")
const GUEST_ALLOWED = new Set(['/api/matchmaking/join', '/api/matchmaking/leave', '/api/auth/logout', '/api/users/me/country', '/api/notifications/read', '/api/notifications/clear']);
const GUEST_ONLY_MSG = "Bu imkoniyat uchun ro'yxatdan o'ting!";
function activeBan(userId) {
  const b = bans.get(userId);
  if (!b) return null;
  if (b.until !== 'forever' && new Date(b.until).getTime() <= Date.now()) { bans.delete(userId); return null; }
  return b;
}
function banMessage(b) {
  return b.until === 'forever'
    ? `Hisobingiz bloklangan${b.reason ? ': ' + b.reason : ''}`
    : `Hisobingiz ${new Date(b.until).toISOString().slice(0, 10)} gacha bloklangan${b.reason ? ': ' + b.reason : ''}`;
}

// --- Onlayn o'yinchilar: userId -> socketId'lar to'plami ---
const onlineUsers = new Map();
function isOnline(userId) { return onlineUsers.has(userId); }

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (deletedUsers.has(decoded.userId)) return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    const ban = activeBan(decoded.userId);
    if (ban) return res.status(403).json({ success: false, banned: true, message: banMessage(ban) });
    req.user = decoded;
    if (isGuest(decoded.userId)) {
      req.user.guest = true;
      if (req.method !== 'GET' && !GUEST_ALLOWED.has(req.path)) return res.status(403).json({ success: false, guest: true, message: GUEST_ONLY_MSG });
    }
    next();
  } catch (err) { return res.status(401).json({ success: false, message: 'Invalid or expired token' }); }
}

// Faqat admin (rol bazadan tekshiriladi)
async function adminMiddleware(req, res, next) {
  authMiddleware(req, res, async () => {
    try {
      const me = await db.getUserById(req.user.userId);
      if (!me || me.role !== 'admin') return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' });
      next();
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
}

// ISO 3166 alpha-2 shaklidagi kichik harfli davlat kodi (flagcdn.com uchun)
function isValidCountry(country) {
  return typeof country === 'string' && /^[a-z]{2}$/.test(country);
}

// Davlat klubi nomi (inglizcha davlat nomi) va flagcdn kodi (masalan 'uz', 'gb-eng')
function isValidClubName(name) {
  return typeof name === 'string' && /^[\p{L}\p{N} .,'()&-]{2,60}$/u.test(name);
}

function isValidFlagCode(code) {
  return typeof code === 'string' && /^[a-z]{2}(-[a-z]{2,3})?$/.test(code);
}

// Chat xonasi: "user_<sherik id>" → "dm_<id1>_<id2>" (tartiblangan); dm_ xonasini faqat ikki ishtirokchi o'qiydi.
// Ruxsat yo'q bo'lsa null qaytaradi.
function resolveChatRoom(roomId, userId) {
  if (roomId.startsWith('user_')) {
    const partnerId = roomId.slice(5);
    if (!partnerId || partnerId === userId) return null;
    return 'dm_' + [userId, partnerId].sort().join('_');
  }
  if (roomId.startsWith('dm_')) {
    // Faqat aynan ikki ishtirokchili, tartiblangan nom ("dm_<men>_x_y" kabi soxta xonalar rad etiladi)
    const ids = roomId.slice(3).split('_');
    if (ids.length !== 2 || !ids.includes(userId) || ids[0] === ids[1]) return null;
    return 'dm_' + ids.sort().join('_');
  }
  // Faqat davlat klubi chati; boshqa ixtiyoriy xona nomlari (avval istalgan "yashirin" xona ochib bo'lardi) rad etiladi
  if (roomId.startsWith('club_') && isValidClubName(roomId.slice(5))) return roomId;
  return null;
}

function dmPartner(roomId, userId) {
  if (!roomId.startsWith('dm_')) return null;
  return roomId.slice(3).split('_').find(id => id !== userId) || null;
}

function validateMove(move) {
  if (!move || typeof move !== 'object') return { valid: false, error: 'Invalid move format' };
  const { from, to, promotion } = move;
  if (!from || !to) return { valid: false, error: 'Missing from or to square' };
  if (from === to) return { valid: false, error: 'Cannot move to same square' };
  const validSquares = ['a1','a2','a3','a4','a5','a6','a7','a8','b1','b2','b3','b4','b5','b6','b7','b8','c1','c2','c3','c4','c5','c6','c7','c8','d1','d2','d3','d4','d5','d6','d7','d8','e1','e2','e3','e4','e5','e6','e7','e8','f1','f2','f3','f4','f5','f6','f7','f8','g1','g2','g3','g4','g5','g6','g7','g8','h1','h2','h3','h4','h5','h6','h7','h8'];
  if (!validSquares.includes(from) || !validSquares.includes(to)) return { valid: false, error: 'Invalid square notation' };
  if (promotion && !['q','r','b','n'].includes(promotion)) return { valid: false, error: 'Invalid promotion piece' };
  return { valid: true };
}

async function start() {
  await db.initDatabase();
  errorTracker.start();

  // Barcha yozuvchi so'rovlar (POST/DELETE) uchun umumiy chegara — foydalanuvchi bo'yicha (umumiy IP ortidagi maktab/ofis
  // to'silmasin). Avval do'stlik so'rovi, klub yangiligi va boshqalarni cheksiz yuborish mumkin edi. Oddiy foydalanishda yetmaydi:
  // 15 daqiqada 600 ta. Telegram webhook va o'z chegarasi bor yo'llar hisobga olinmaydi.
  const WRITE_SKIP = new Set(['/telegram/webhook', '/client-errors']);
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000, max: 600, message: tooMany,
    skip: (req) => TEST_MODE || ['GET', 'HEAD', 'OPTIONS'].includes(req.method) || WRITE_SKIP.has(req.path),
    keyGenerator: (req) => {
      const a = req.headers.authorization;
      if (a && a.startsWith('Bearer ')) { try { return 'u:' + jwt.verify(a.slice(7), JWT_SECRET).userId; } catch (e) { /* IP bo'yicha */ } }
      return 'ip:' + req.ip;
    }
  }));

  // --- 🐞 Brauzer xatolari (errors.js) — kirmagan foydalanuvchidan ham; IP bo'yicha cheklangan ---
  const clientErrorLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, skip: () => TEST_MODE, message: tooMany });
  const CLIENT_ERROR_IGNORE = /^Script error\.?$|ResizeObserver loop|chrome-extension:|moz-extension:|safari-extension:|^Load failed$|^NetworkError|Failed to fetch/i;
  app.post('/api/client-errors', clientErrorLimiter, (req, res) => {
    const b = req.body || {};
    const message = String(b.message || '').slice(0, 500).trim();
    const stack = String(b.stack || '').slice(0, 4000);
    const src = String(b.source || '').slice(0, 300);
    if (!message || CLIENT_ERROR_IGNORE.test(message) || CLIENT_ERROR_IGNORE.test(src) || CLIENT_ERROR_IGNORE.test(stack)) return res.json({ success: true, ignored: true });
    let user = null;
    try {
      const h = req.headers.authorization;
      if (h && h.startsWith('Bearer ')) user = jwt.verify(h.slice(7), JWT_SECRET).username;
    } catch (e) {}
    const context = {
      url: String(b.url || '').slice(0, 300), source: src || undefined, line: Number(b.line) || undefined, col: Number(b.col) || undefined,
      ua: String(req.headers['user-agent'] || '').slice(0, 200), user, version: String(b.version || '').slice(0, 40) || undefined
    };
    errorTracker.capture('client', message, stack || (src ? `    at ${src}:${context.line || 0}:${context.col || 0}` : ''), context);
    res.json({ success: true });
  });
  if (TEST_MODE) app.get('/api/test/db-queries', (req, res) => res.json({ success: true, count: db.queryCount() }));
  if (TEST_MODE) app.get('/api/test/throw', () => { throw new Error('Test uchun xato'); });
  if (TEST_MODE) app.post('/api/test/cleanup-guests', async (req, res) => res.json({ success: true, ids: await cleanupGuests(new Date(Date.now() + 60000).toISOString()) }));

  // 👤 Ro'yxatdan o'tmasdan o'ynash: vaqtinchalik akkaunt (nom — tilga qarab "Mehmon-xxxxx"), JWT 7 kun
  app.post('/api/auth/guest', guestLimiter, async (req, res) => {
    try {
      const prefix = GUEST_PREFIX[req.body && req.body.lang] || GUEST_PREFIX.en;
      let username = null;
      for (let i = 0; i < 6 && !username; i++) {
        const name = prefix + '-' + crypto.randomBytes(4).toString('hex').slice(0, 5);
        if (!(await db.usernameTaken(name))) username = name;
      }
      if (!username) return res.status(500).json({ success: false, message: 'Server xatoligi!' });
      const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 8);
      const user = await db.createUser({ username, email: username.toLowerCase() + '@guest.local', passwordHash });
      await db.markGuest(user.id);
      guestUsers.add(user.id);
      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ success: true, user: { id: user.id, username: user.username, rating: user.rating, stats: user.stats, statsByMode: user.statsByMode, guest: true }, token });
    } catch (err) { console.error('Mehmon xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/auth/register', registerLimiter, [
    body('username').isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
      // Faqat harf, raqam, _ . - (HTML/JS ga xavfli belgilarsiz)
      .matches(/^[\p{L}\p{N}_.-]+$/u).withMessage("Foydalanuvchi nomida faqat harf, raqam, _ . - bo'lishi mumkin"),
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
      const { username, email, password } = req.body;
      if (GUEST_NAME_RE.test(username)) return res.status(400).json({ success: false, message: 'Bu nom band qilingan!' });
      if (await db.usernameTaken(username)) return res.status(409).json({ success: false, message: 'Bu nomli foydalanuvchi mavjud!' });
      if (await db.getUserByEmail(email)) return res.status(409).json({ success: false, message: 'Bu email boshqa akkauntga biriktirilgan!' });
      const passwordHash = await bcrypt.hash(password, 10);
      // Mehmon tokeni bilan kelsa — o'sha akkaunt (o'ynagan o'yinlari bilan) oddiy akkauntga aylanadi
      let guestId = null;
      const auth = req.headers.authorization;
      if (auth && auth.startsWith('Bearer ')) { try { const d = jwt.verify(auth.slice(7), JWT_SECRET); if (isGuest(d.userId)) guestId = d.userId; } catch (e) {} }
      let user;
      if (guestId) {
        const claimed = await db.claimGuest(guestId, { username, email, passwordHash });
        if (claimed) {
          guestUsers.delete(guestId);
          user = { id: claimed.id, username: claimed.username, email: claimed.email, rating: claimed.rating, stats: claimed.stats, statsByMode: claimed.stats_by_mode };
          invalidateCache('leaderboard');
        }
      }
      if (!user) user = await db.createUser({ username, email, passwordHash });
      // ADMIN_USERNAMES dagi nom bilan ro'yxatdan o'tilsa — darhol admin (avval faqat server qayta ishga tushganda berilardi;
      // yangi bo'sh bazaga o'tilganda admin o'z akkauntini qayta ochib, keyingi deploygacha admin bo'lmay qolardi)
      const isAdminName = adminUsernames().includes(user.username);
      if (isAdminName) await db.setAdmins([user.username]);
      // 🔗 Taklif havolasi orqali kelgan bo'lsa — kim taklif qilgani yoziladi, taklif qiluvchiga xabar va yutuq
      if (req.body.inviteCode) {
        try {
          const inviter = await db.getUserByInviteCode(String(req.body.inviteCode));
          if (inviter && inviter.id !== user.id) {
            await db.setInvitedBy(user.id, inviter.id);
            notify(inviter.id, 'invite_joined', { from: user.username });
            checkAchievements(inviter.id);
          }
        } catch (e) { console.error('Taklif kodi xatoligi:', e.message); }
      }
      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ success: true, message: "Muvaffaqiyatli ro'yxatdan o'tdingiz!", user: { id: user.id, username: user.username, email: user.email, rating: user.rating, stats: user.stats, statsByMode: user.statsByMode, role: isAdminName ? 'admin' : null }, token });
    } catch (err) {
      // Bir vaqtda ikki so'rov: tekshiruvdan o'tib, UNIQUE cheklovga urilgan — server xatosi emas
      if (/unique|duplicate/i.test(err && err.message)) {
        const message = /email/i.test(err.message) ? 'Bu email boshqa akkauntga biriktirilgan!' : 'Bu nomli foydalanuvchi mavjud!';
        return res.status(409).json({ success: false, message });
      }
      console.error('Register xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' });
    }
  });

  app.post('/api/auth/login', loginLimiter, [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
      const { username, password } = req.body;
      const user = await db.getUserByUsername(username);
      if (!user) return res.status(401).json({ success: false, message: 'Ism yoki parol xato!' });
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ success: false, message: 'Ism yoki parol xato!' });
      const ban = activeBan(user.id);
      if (ban) return res.status(403).json({ success: false, banned: true, message: banMessage(ban) });
      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      await db.touchUserLastActive(user.id);
      res.json({ success: true, message: 'Muvaffaqiyatli kirildi!', user: { id: user.id, username: user.username, email: user.email, rating: user.rating, stats: user.stats, statsByMode: user.stats_by_mode, ratingsByMode: user.ratings_by_mode, country: user.country || null, club: db.userClub(user), avatarVersion: user.avatar_version || null, role: user.role || null }, token });
    } catch (err) { console.error('Login xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/auth/logout', authMiddleware, async (req, res) => {
    res.json({ success: true, message: 'Hisobdan chiqildi!' });
  });

  app.get('/api/leaderboard', apiLimiter, async (req, res) => {
    try { const leaderboard = await cached('leaderboard', 30000, () => db.getLeaderboard()); res.json({ success: true, leaderboard }); }
    catch (err) { console.error('Leaderboard xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/daily-winners', apiLimiter, async (req, res) => {
    try {
      const period = req.query.period === 'week' ? 'week' : 'day';
      res.json(await cached('daily:' + period, 60000, () => db.getDailyWinners(period)));
    }
    catch (err) { console.error('Daily winners xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/stats/:username', apiLimiter, async (req, res) => {
    try { const data = await db.getStatsByUsername(req.params.username); if (!data) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' }); res.json(data); }
    catch (err) { console.error('Stats xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Ommaviy profil — istalgan o'yinchi boshqa o'yinchining profilini ko'ra oladi
  app.get('/api/users/:username/profile', apiLimiter, async (req, res) => {
    try {
      const profile = await db.getPublicProfile(req.params.username);
      if (!profile) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      const u = await db.getUserByUsername(req.params.username);
      res.json({ success: true, profile: { ...profile, online: isOnline(profile.id), lastSeen: (u && u.last_active) || null } });
    } catch (err) { console.error('Profile xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // O'yinni qayta ko'rish (ommaviy)
  app.get('/api/users/:username/games/:gameId/replay', apiLimiter, async (req, res) => {
    try {
      const game = await db.getGameReplay(req.params.username, req.params.gameId);
      if (!game) return res.status(404).json({ success: false, message: "O'yin topilmadi!" });
      res.json({ success: true, game });
    } catch (err) { console.error('Replay xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/users/:username/games', authMiddleware, async (req, res) => {
    try { if (req.user.username !== req.params.username) return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' }); const games = await db.getUserGames(req.user.userId); if (!games) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' }); res.json({ success: true, games }); }
    catch (err) { console.error('Games xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // O'yin natijasi va reyting klientdan qabul qilinmaydi — ularni server endGame() da yozadi

  // --- Parolni tiklash (email orqali) ---
  const realEmail = (email) => !!email && !/@justchess\.local$/i.test(email);
  const appUrl = (req) => process.env.APP_URL || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}`;

  app.post('/api/auth/forgot', resetLimiter, async (req, res) => {
    try {
      const login = String((req.body && req.body.login) || '').trim();
      if (!login) return res.status(400).json({ success: false, message: 'Foydalanuvchi nomi yoki emailni kiriting!' });
      if (!mailer.isConfigured()) return res.status(503).json({ success: false, message: 'Email xizmati hali sozlanmagan. Administratorga murojaat qiling.' });
      const user = login.includes('@') ? await db.getUserByEmail(login) : await db.getUserByUsername(login);
      const sent = { success: true, message: "Agar akkaunt topilsa, emailga parolni tiklash havolasi yuborildi." };
      if (!user) return res.json(sent);
      if (!realEmail(user.email)) return res.status(400).json({ success: false, message: "Bu akkauntga email biriktirilmagan. Profilingizda email qo'shib qo'ying." });
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await db.createPasswordReset(user.id, tokenHash, new Date(Date.now() + 30 * 60 * 1000).toISOString());
      const link = `${appUrl(req)}/?reset=${token}`;
      await mailer.sendMail({
        to: user.email,
        subject: 'ChessCaravan — parolni tiklash',
        text: `Salom, ${user.username}!\n\nParolingizni tiklash uchun havola (30 daqiqa amal qiladi):\n${link}\n\nAgar siz so'ramagan bo'lsangiz, bu xatni e'tiborsiz qoldiring.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;background:#141b19;color:#e8ece9;border-radius:16px">
          <h2 style="margin:0 0 12px;color:#fff">♞ ChessCaravan</h2>
          <p>Salom, <b>${escapeHtml(user.username)}</b>!</p>
          <p>Parolingizni tiklash uchun quyidagi tugmani bosing. Havola 30 daqiqa amal qiladi.</p>
          <p style="text-align:center;margin:28px 0"><a href="${link}" style="background:#00b1b9;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold">Parolni tiklash</a></p>
          <p style="font-size:12px;color:#8fa29a">Agar siz so'ramagan bo'lsangiz, bu xatni e'tiborsiz qoldiring.</p></div>`
      });
      res.json(sent);
    } catch (err) { console.error('Forgot xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/auth/reset', resetLimiter, async (req, res) => {
    try {
      const token = String((req.body && req.body.token) || '');
      const password = String((req.body && req.body.password) || '');
      if (password.length < 6) return res.status(400).json({ success: false, message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });
      if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ success: false, message: "Havola noto'g'ri yoki eskirgan!" });
      const userId = await db.usePasswordReset(crypto.createHash('sha256').update(token).digest('hex'));
      if (!userId) return res.status(400).json({ success: false, message: "Havola noto'g'ri yoki eskirgan!" });
      await db.updateUserPassword(userId, await bcrypt.hash(password, 10));
      res.json({ success: true, message: 'Parol yangilandi! Endi kirishingiz mumkin.' });
    } catch (err) { console.error('Reset xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Profilda email biriktirish (parolni tiklash uchun)
  app.post('/api/users/me/email', authMiddleware, [body('email').isEmail().withMessage('Invalid email')], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
      const email = String(req.body.email).trim().toLowerCase();
      const other = await db.getUserByEmail(email);
      if (other && other.id !== req.user.userId) return res.status(409).json({ success: false, message: 'Bu email boshqa akkauntga biriktirilgan!' });
      await db.updateUserEmail(req.user.userId, email);
      res.json({ success: true, email });
    } catch (err) { console.error('Email xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // --- Profil rasmi ---
  // Klient rasmni 256×256 ga kichraytirib data URL sifatida yuboradi; turi fayl baytlari bo'yicha ham tekshiriladi
  const AVATAR_MAX_BYTES = 200 * 1024;
  const avatarMime = (buf) => {
    if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
    if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
    if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
    return null;
  };

  app.post('/api/users/me/avatar', authMiddleware, async (req, res) => {
    try {
      const m = String((req.body && req.body.image) || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
      if (!m) return res.status(400).json({ success: false, message: "Rasm formati noto'g'ri!" });
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > AVATAR_MAX_BYTES) return res.status(413).json({ success: false, message: 'Rasm hajmi juda katta!' });
      const mime = avatarMime(buf);
      if (!mime) return res.status(400).json({ success: false, message: "Rasm formati noto'g'ri!" });
      const version = await db.setAvatar(req.user.userId, mime, buf.toString('base64'));
      res.json({ success: true, avatarVersion: version });
    } catch (err) { console.error('Avatar xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.delete('/api/users/me/avatar', authMiddleware, async (req, res) => {
    try { await db.deleteAvatar(req.user.userId); res.json({ success: true }); }
    catch (err) { console.error('Avatar o\'chirish xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Rasmning o'zi (img src). Yo'q bo'lsa 404 — klient harf ko'rsatadi
  app.get('/api/users/:username/avatar', async (req, res) => {
    try {
      const row = await db.getAvatarByUsername(req.params.username);
      res.set('Cache-Control', req.query.v ? 'public, max-age=31536000, immutable' : 'public, max-age=300');
      if (!row) return res.status(404).end();
      res.type(row.mime).send(Buffer.from(row.data, 'base64'));
    } catch (err) { res.status(500).end(); }
  });

  // --- Sozlamalar: maxfiylik va parol ---
  app.get('/api/users/me/privacy', authMiddleware, async (req, res) => {
    try { res.json({ success: true, privacy: db.userPrivacy(await db.getUserById(req.user.userId)) }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/users/me/privacy', authMiddleware, async (req, res) => {
    try { res.json({ success: true, privacy: await db.updatePrivacy(req.user.userId, req.body || {}) }); }
    catch (err) { console.error('Privacy xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/users/me/password', authMiddleware, loginLimiter, async (req, res) => {
    try {
      const current = String((req.body && req.body.current) || '').trim();
      const next = String((req.body && req.body.next) || '').trim();
      if (next.length < 6) return res.status(400).json({ success: false, message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });
      const user = await db.getUserById(req.user.userId);
      if (!user || !(await bcrypt.compare(current, user.password_hash))) return res.status(401).json({ success: false, message: "Joriy parol noto'g'ri!" });
      await db.updateUserPassword(user.id, await bcrypt.hash(next, 10));
      res.json({ success: true, message: "Parol o'zgartirildi!" });
    } catch (err) { console.error('Parol xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // 📲 Push: ochiq kalit, obuna, bekor qilish, turkumlar, sinov
  app.get('/api/push/key', (req, res) => res.json({ success: pushReady, publicKey: vapidPublicKey }));
  app.post('/api/push/subscribe', authMiddleware, async (req, res) => {
    try {
      const sub = req.body && req.body.subscription;
      const ok = sub && typeof sub.endpoint === 'string' && /^https:\/\//.test(sub.endpoint) && sub.endpoint.length < 1000 && sub.keys && typeof sub.keys.p256dh === 'string' && typeof sub.keys.auth === 'string';
      if (!ok) return res.status(400).json({ success: false, message: "Noto'g'ri ma'lumot!" });
      const lang = ['uz', 'uzc', 'en', 'ru', 'es', 'de', 'fr', 'tr', 'kk', 'tg', 'ky', 'tk', 'az'].includes(req.body.lang) ? req.body.lang : 'en';
      await db.savePushSubscription(req.user.userId, sub, lang);
      res.json({ success: true, prefs: await db.getPushPrefs(req.user.userId) });
    } catch (err) { console.error('Push obuna xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.post('/api/push/unsubscribe', authMiddleware, async (req, res) => {
    try {
      if (req.body && typeof req.body.endpoint === 'string') await db.deletePushSubscription(req.body.endpoint, req.user.userId);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.get('/api/users/me/push-prefs', authMiddleware, async (req, res) => {
    try { res.json({ success: true, prefs: await db.getPushPrefs(req.user.userId), devices: (await db.listPushSubscriptions(req.user.userId)).length }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.post('/api/users/me/push-prefs', authMiddleware, async (req, res) => {
    try { res.json({ success: true, prefs: await db.setPushPrefs(req.user.userId, req.body || {}) }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.post('/api/push/test', authMiddleware, apiLimiter, async (req, res) => {
    try {
      const sent = await sendPush(req.user.userId, 'test', {}, 'test', { force: true });
      res.json({ success: sent > 0, sent });
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Akkauntni butunlay o'chirish: parol + foydalanuvchi nomini qayta yozish bilan tasdiqlanadi
  app.post('/api/users/me/delete', authMiddleware, loginLimiter, async (req, res) => {
    try {
      const password = String((req.body && req.body.password) || '');
      const confirmName = String((req.body && req.body.confirm) || '').trim();
      const user = await db.getUserById(req.user.userId);
      if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      if (!(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ success: false, reason: 'password', message: "Joriy parol noto'g'ri!" });
      if (confirmName !== user.username) return res.status(400).json({ success: false, reason: 'confirm', message: "Foydalanuvchi nomi mos kelmadi!" });
      if (inActiveGame(user.id)) return res.status(409).json({ success: false, reason: 'in_game', message: "Avval joriy o'yiningizni tugating!" });
      // Xotiradagi holat: navbat, choyxona stoli, chaqiruvlar
      const qi = matchmakingQueue.findIndex(q => q.userId === user.id);
      if (qi !== -1) matchmakingQueue.splice(qi, 1);
      teaStand(user.id);
      for (const c of challenges.values()) if (c.fromId === user.id || c.toId === user.id) dropChallenge(c.id);
      const result = await db.deleteUserAccount(user.id);
      deletedUsers.add(user.id);
      bans.delete(user.id);
      mutes.delete(user.id);
      invalidateCache('leaderboard', 'daily:day', 'daily:week', 'clubs');
      console.log(`🗑 Akkaunt o'chirildi: ${user.username} (${result ? result.renamedGames : 0} ta raqib yozuvi anonimlashtirildi)`);
      res.json({ success: true, message: "Akkauntingiz o'chirildi" });
      // Ochiq qurilmalardagi ulanishlar uziladi
      setTimeout(() => {
        io.in('user_' + user.id).disconnectSockets(true);
        if (onlineUsers.delete(user.id)) io.emit('presence', { userId: user.id, online: false, lastSeen: new Date().toISOString() });
      }, 300);
    } catch (err) { console.error("Akkauntni o'chirish xatoligi:", err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // --- Onlayn holat ---
  app.get('/api/users/presence', async (req, res) => {
    const ids = String(req.query.ids || '').split(',').filter(Boolean).slice(0, 200);
    const result = {};
    for (const id of ids) result[id] = isOnline(id);
    res.json({ success: true, online: result });
  });

  // --- Bloklash ---
  app.get('/api/users/me/blocks', authMiddleware, async (req, res) => {
    try { res.json({ success: true, blocks: await db.getBlockedUsers(req.user.userId) }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.post('/api/users/:username/block', authMiddleware, async (req, res) => {
    try {
      const other = await db.getUserByUsername(req.params.username);
      if (!other || other.id === req.user.userId) return res.status(400).json({ success: false, message: 'Ruxsat yo\'q' });
      await db.blockUser(req.user.userId, other.id);
      blocks.add(req.user.userId + '|' + other.id);
      dropChallengesBetween(req.user.userId, other.id);
      res.json({ success: true, message: "O'yinchi bloklandi" });
    } catch (err) { console.error('Block xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.post('/api/users/:username/unblock', authMiddleware, async (req, res) => {
    try {
      const other = await db.getUserByUsername(req.params.username);
      if (!other) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      await db.unblockUser(req.user.userId, other.id);
      blocks.delete(req.user.userId + '|' + other.id);
      res.json({ success: true, message: "Blokdan chiqarildi" });
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // --- Shikoyat ---
  const REPORT_REASONS = ['abuse', 'cheating', 'spam', 'name', 'other'];
  const reportLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, skip: () => TEST_MODE, message: tooMany });
  app.post('/api/reports', authMiddleware, reportLimiter, async (req, res) => {
    try {
      const { username, reason } = req.body || {};
      const details = String((req.body && req.body.details) || '').slice(0, 500);
      if (!REPORT_REASONS.includes(reason)) return res.status(400).json({ success: false, message: 'Sababni tanlang!' });
      const target = await db.getUserByUsername(String(username || ''));
      if (!target || target.id === req.user.userId) return res.status(400).json({ success: false, message: 'Ruxsat yo\'q' });
      const created = await db.createReport(req.user.userId, target.id, reason, details);
      // Aldashga shikoyat — o'yinchining oxirgi o'yinlari dvigatel bilan tekshiriladi (takroriy shikoyatda emas)
      if (reason === 'cheating' && created && created.success) analyzeRecentGames(target.id, 5).catch((err) => console.error('Fair-play tahlil xatoligi:', err.message));
      res.json(created);
    } catch (err) { console.error('Report xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // --- Admin paneli ---
  // 📜 Jurnal: har admin amali (kim, qachon, kimga) admin_actions ga yoziladi; xato bo'lsa amalning o'zi to'xtamaydi
  function auditLog(req, action, target, details) {
    const t = target || {};
    db.addAdminAction({ adminId: req.user.userId, adminName: req.user.username, action, targetType: t.type, targetId: t.id, targetName: t.name, details })
      .catch(err => console.error('Admin jurnaliga yozib bo\'lmadi:', err.message));
  }
  app.get('/api/admin/audit', adminMiddleware, async (req, res) => {
    try { res.json({ success: true, ...(await db.listAdminActions({ action: req.query.action ? String(req.query.action).slice(0, 40) : '', q: req.query.q ? String(req.query.q).slice(0, 40) : '', page: req.query.page })) }); }
    catch (err) { console.error('Admin jurnali xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/admin/stats', adminMiddleware, async (req, res) => {
    try {
      let activeGames = 0;
      for (const room of rooms.values()) if (room.status === 'active') activeGames++;
      res.json({ success: true, stats: { ...(await db.adminStats()), online: onlineUsers.size, activeGames, errors: await db.errorCounts() } });
    } catch (err) { console.error('Admin stats xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  // 🐞 Xatolar jurnali
  app.get('/api/admin/errors', adminMiddleware, async (req, res) => {
    try { res.json({ success: true, errors: await db.listErrors(req.query.status, req.query.source), counts: await db.errorCounts() }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.post('/api/admin/errors/:id/resolve', adminMiddleware, async (req, res) => {
    try { await db.setErrorResolved(req.params.id, !(req.body && req.body.resolved === false)); res.json({ success: true }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.post('/api/admin/errors/clear-resolved', adminMiddleware, async (req, res) => {
    try { await db.deleteResolvedErrors(); auditLog(req, 'errors_clear'); res.json({ success: true }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  // 💾 Zaxira nusxa: admin — siqilgan JSON yuklab olish
  const backupName = (ext) => `chessdom-${new Date().toISOString().slice(0, 16).replace(/[-T:]/g, '')}.${ext}`;
  app.get('/api/admin/backup', adminMiddleware, async (req, res) => {
    try {
      const dump = await db.dumpDatabase();
      const data = backup.pack(dump);
      auditLog(req, 'backup_download', null, { rows: dump.rows, bytes: data.length });
      res.set({ 'Content-Type': 'application/gzip', 'Content-Disposition': `attachment; filename="${backupName('json.gz')}"`, 'Cache-Control': 'no-store' });
      res.send(data);
    } catch (err) { console.error('Zaxira xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/admin/reports', adminMiddleware, async (req, res) => {
    try { res.json({ success: true, reports: await db.listReports(req.query.status === 'resolved' ? 'resolved' : 'open') }); }
    catch (err) { console.error('Admin reports xatoligi:', err.message); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.post('/api/admin/reports/:id/resolve', adminMiddleware, async (req, res) => {
    try {
      const resolution = String((req.body && req.body.resolution) || '').slice(0, 200);
      const r = await db.resolveReport(req.params.id, req.user.userId, resolution);
      auditLog(req, 'report_resolve', r ? { type: 'user', id: r.targetId, name: r.target } : { type: 'report', id: req.params.id }, { reason: r && r.reason, resolution });
      res.json({ success: true });
    }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.get('/api/admin/users', adminMiddleware, async (req, res) => {
    try {
      const users = (await db.adminSearchUsers(req.query.q)).map(u => ({ ...u, stats: db.parseJson(u.stats) || {}, online: isOnline(u.id), reports: Number(u.reports) || 0 }));
      res.json({ success: true, users });
    } catch (err) { console.error('Admin users xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.post('/api/admin/users/:id/ban', adminMiddleware, async (req, res) => {
    try {
      const target = await db.getUserById(req.params.id);
      if (!target) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      if (target.role === 'admin') return res.status(400).json({ success: false, message: 'Adminni bloklab bo\'lmaydi' });
      const days = Number(req.body && req.body.days);
      const until = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : 'forever';
      const reason = String((req.body && req.body.reason) || '').slice(0, 200);
      await db.setBan(target.id, until, reason);
      bans.set(target.id, { until, reason });
      auditLog(req, 'ban', { type: 'user', id: target.id, name: target.username }, { days: days > 0 ? days : 'forever', reason });
      // Ochiq sahifalari darhol chiqariladi, davom etayotgan o'yini yutqazilgan hisoblanadi
      io.to(`user_${target.id}`).emit('auth-error', { banned: true, message: banMessage({ until, reason }) });
      for (const [roomId, room] of rooms.entries()) {
        const p = room.status === 'active' && room.players.find(x => x.userId === target.id);
        if (p) endGame(roomId, room, room.chess.history().length < 2 ? null : otherColor(p.color), room.chess.history().length < 2 ? 'aborted' : 'abandon');
      }
      // Navbat va choyxonadan chiqariladi; socketlar serverda uziladi (avval faqat klientga xabar yuborilardi va
      // o'zgartirilgan klient socket orqali chat/chaqiruv yuborishda davom eta olardi)
      for (let i = matchmakingQueue.length - 1; i >= 0; i--) if (matchmakingQueue[i].userId === target.id) matchmakingQueue.splice(i, 1);
      teaStand(target.id);
      setTimeout(() => io.in(`user_${target.id}`).disconnectSockets(true), 300);
      res.json({ success: true, until });
    } catch (err) { console.error('Ban xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.post('/api/admin/users/:id/unban', adminMiddleware, async (req, res) => {
    try {
      const target = await db.getUserById(req.params.id);
      await db.setBan(req.params.id, null, null);
      bans.delete(req.params.id);
      auditLog(req, 'unban', { type: 'user', id: req.params.id, name: target && target.username });
      res.json({ success: true });
    }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // 🧵 Shahar naqshi: faqat karvon yetib borgan shaharniki ('' — olib tashlash)
  app.post('/api/users/me/banner', authMiddleware, async (req, res) => {
    try {
      const key = String((req.body && req.body.key) || '');
      const u = await db.getUserById(req.user.userId);
      if (!u) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      if (key) {
        const i = Caravan.CITIES.findIndex((c) => c.key === key);
        if (i < 0) return res.status(400).json({ success: false, message: "Noto'g'ri naqsh!" });
        if (i > Caravan.cityIndex(Caravan.pointsOf(u.stats))) return res.status(403).json({ success: false, message: 'Bu naqsh hali ochilmagan!' });
      }
      await db.setProfileBanner(u.id, key);
      res.json({ success: true, banner: key || null });
    } catch (err) { console.error('Naqsh xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/users/me/country', authMiddleware, async (req, res) => {
    try {
      const { country } = req.body;
      if (!isValidCountry(country)) return res.status(400).json({ success: false, message: 'Noto\'g\'ri davlat kodi!' });
      await db.updateUserCountry(req.user.userId, country);
      res.json({ success: true, country });
    } catch (err) { console.error('Country xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/matchmaking/join', authMiddleware, async (req, res) => {
    try {
      const { socketId, country } = req.body;
      const username = req.user.username;
      const playerSocket = socketId ? io.sockets.sockets.get(socketId) : null;
      if (!playerSocket) return res.status(400).json({ success: false, message: 'Serverga socket orqali ulanmagansiz!' });
      if (playerSocket.data.userId && playerSocket.data.userId !== req.user.userId) return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' });
      playerSocket.data.userId = req.user.userId;
      playerSocket.data.username = username;
      const clock = normalizeClock(req.body.initialTime, req.body.increment);
      const variant = normVariant(req.body.variant);
      const guest = isGuest(req.user.userId);
      const rated = !guest && req.body.rated !== false;
      pruneMatchmakingQueue();
      // O'yindagi o'yinchi ikkinchi o'yinga tushmasin; navbatda turganlardan o'yinga kirib ketganlar chiqariladi
      if (inActiveGame(req.user.userId)) return res.status(409).json({ success: false, reason: 'in_game', message: "Avval joriy o'yiningizni tugating!" });
      for (let i = matchmakingQueue.length - 1; i >= 0; i--) if (inActiveGame(matchmakingQueue[i].userId)) matchmakingQueue.splice(i, 1);
      if (matchmakingQueue.some(u => u.username === username)) return res.status(400).json({ success: false, message: 'Already in queue' });
      const user = await db.getUserById(req.user.userId);
      // Klient yuborgan davlatni (Sozlamalardan) bazaga ham yozib qo'yamiz
      let myCountry = (user && user.country) || null;
      if (isValidCountry(country) && country !== myCountry) {
        myCountry = country;
        await db.updateUserCountry(req.user.userId, country);
      }
      const mmMode = variant !== 'standard' ? variant : clockMode(clock);
      const me = { userId: req.user.userId, username, rating: (user && user.rating) || 1500, ratingsByMode: user ? user.ratings_by_mode : null, country: myCountry, joinedAt: Date.now(), socketId, clock, rated, variant, guest,
        provisional: db.isProvisional(user, mmMode, false) };
      // Faqat bir xil vaqt nazorati, reyting turi va variantni tanlagan o'yinchi bilan juftlanadi
      const waitingIndex = matchmakingQueue.findIndex(u => u.clock.initial === clock.initial && u.clock.increment === clock.increment && (u.rated === rated || guest || u.guest) && (u.variant || 'standard') === variant && !blockedPair(u.userId, req.user.userId));
      if (waitingIndex === -1) {
        matchmakingQueue.push(me);
        return res.json({ success: true, matched: false, position: matchmakingQueue.length });
      }
      const [waiting] = matchmakingQueue.splice(waitingIndex, 1);
      // Navbatda kutgan o'yinchi oq, yangi kelgan o'yinchi qora bilan o'ynaydi.
      const roomId = generateRoomId();
      const playerInfo = (u) => ({ socketId: u.socketId, userId: u.userId, username: u.username });
      const room = createGameRoom(playerInfo(waiting), playerInfo(me), clock, rated, { variant });
      rooms.set(roomId, room);
      const opponentInfo = (u) => ({ username: u.username, rating: u.rating, ratingsByMode: u.ratingsByMode, country: u.country, provisional: !!u.provisional });
      for (const [player, opponent, color] of [[waiting, me, 'w'], [me, waiting, 'b']]) {
        const s = io.sockets.sockets.get(player.socketId);
        if (s) s.join(roomId);
        io.to(player.socketId).emit('match-found', { roomId, color, opponent: opponentInfo(opponent), clock, rated: room.rated, mode: room.mode, ...variantInfo(room) });
      }
      scheduleRoomTimer(roomId, room);
      res.json({ success: true, matched: true, roomId, color: 'b', opponent: opponentInfo(waiting) });
    } catch (err) { console.error('Matchmaking xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/matchmaking/leave', authMiddleware, async (req, res) => {
    try { const index = matchmakingQueue.findIndex(u => u.username === req.user.username); if (index !== -1) matchmakingQueue.splice(index, 1); res.json({ success: true }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Ixtiyoriy token: kirgan bo'lsa foydalanuvchi id si, aks holda null
  const optionalUserId = (req) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    try { return jwt.verify(auth.slice(7), JWT_SECRET).userId; } catch (e) { return null; }
  };

  // Jonli o'yinlar: hozir davom etayotgan barcha o'yinlar (tomosha qilish uchun)
  app.get('/api/tea', async (req, res) => {
    try {
      res.json({ success: true, seats: teaList(), games: await teaGames(), online: onlineUsers.size });
    } catch (err) { console.error('Choyxona xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/games/live', async (req, res) => {
    try {
      const games = [];
      for (const [roomId, room] of rooms.entries()) {
        if (room.status === 'active' && room.players.length === 2) games.push(await liveGameInfo(roomId, room));
      }
      const weight = { league: 0, casual: 1 };
      games.sort((a, b) => weight[a.kind] - weight[b.kind] || (b.white.rating + b.black.rating) - (a.white.rating + a.black.rating));
      res.json({ success: true, games: games.slice(0, 60) });
    } catch (err) { console.error('Jonli o\'yinlar xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // --- 🔗 Taklif havolasi ---
  app.get('/api/invite', authMiddleware, async (req, res) => {
    try {
      const code = await db.getInviteCode(req.user.userId);
      res.json({ success: true, code, url: `${SITE_URL}/?invite=${code}`, ...(await db.inviteStats(req.user.userId)) });
    } catch (err) { console.error('Taklif xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.get('/api/invite/:code', apiLimiter, async (req, res) => {
    try {
      const u = await db.getUserByInviteCode(String(req.params.code));
      if (!u) return res.status(404).json({ success: false, message: 'Taklif havolasi topilmadi' });
      const r = u.ratings_by_mode || {};
      res.json({ success: true, inviter: { username: u.username, rating: r.blitz || u.rating || 1500, country: u.country || null, avatarVersion: u.avatar_version || null, online: isOnline(u.id) } });
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/friends/request', authMiddleware, async (req, res) => {
    try {
      const { username } = req.body;
      const receiver = await db.getUserByUsername(username);
      if (!receiver) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      if (receiver.id === req.user.userId) return res.status(400).json({ success: false, message: 'O\'zingizga do\'stlik so\'rovini yuborib bo\'lmaydi!' });
      if (blockedPair(req.user.userId, receiver.id)) return res.status(403).json({ success: false, message: "Bu o'yinchi bilan aloqa cheklangan" });
      const result = await db.sendFriendRequest(req.user.userId, receiver.id);
      if (result.success && result.senderId) {
        // Teskari so'rov bor edi — darhol do'st bo'ldik
        notify(receiver.id, 'friend_accepted', { from: req.user.username });
      } else if (result.success) {
        io.to(`user_${receiver.id}`).emit('friend-request-received', { senderId: req.user.userId, senderName: req.user.username });
        // So'rov → bekor → so'rov oqimi push bilan bezovta qilmasin: juftlikka 10 daqiqada bitta bildirishnoma
        const frKey = req.user.userId + '|' + receiver.id;
        if (TEST_MODE || Date.now() - (lastFriendNotify.get(frKey) || 0) > 10 * 60 * 1000) {
          lastFriendNotify.set(frKey, Date.now());
          notify(receiver.id, 'friend_request', { from: req.user.username }, 'fr:' + req.user.userId);
        }
      }
      res.json(result);
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/friends/accept', authMiddleware, async (req, res) => {
    try {
      const { requestId } = req.body;
      const result = await db.acceptFriendRequest(requestId, req.user.userId);
      if (result.success && result.senderId) {
        notify(result.senderId, 'friend_accepted', { from: req.user.username });
        checkAchievements(result.senderId);
        checkAchievements(req.user.userId);
      }
      res.json(result);
    }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Profil tugmasi uchun: shu o'yinchi bilan do'stlik holati
  const otherUser = async (req, res) => {
    const other = await db.getUserByUsername(String(req.params.username || (req.body && req.body.username) || ''));
    if (!other) { res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' }); return null; }
    if (other.id === req.user.userId) { res.status(400).json({ success: false, message: 'Ruxsat yo\'q' }); return null; }
    return other;
  };

  app.get('/api/friends/status/:username', authMiddleware, async (req, res) => {
    try { const other = await otherUser(req, res); if (other) res.json({ success: true, ...(await db.getFriendshipStatus(req.user.userId, other.id)), blockedByMe: blocks.has(req.user.userId + '|' + other.id) }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/friends/remove', authMiddleware, async (req, res) => {
    try { const other = await otherUser(req, res); if (other) res.json(await db.removeFriend(req.user.userId, other.id)); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/friends/cancel', authMiddleware, async (req, res) => {
    try { const other = await otherUser(req, res); if (other) res.json(await db.cancelFriendRequest(req.user.userId, other.id)); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/friends/decline', authMiddleware, async (req, res) => {
    try { const { requestId } = req.body; const result = await db.declineFriendRequest(requestId, req.user.userId); res.json(result); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/friends', authMiddleware, async (req, res) => {
    try { const friendsList = await db.getFriends(req.user.userId); res.json({ success: true, friends: friendsList.map(f => ({ ...f, online: isOnline(f.id) })) }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/friends/requests', authMiddleware, async (req, res) => {
    try { const requests = await db.getFriendRequests(req.user.userId); res.json({ success: true, requests }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Shaxsiy xabarlar: suhbatlar ro'yxati, o'qilmaganlar soni, "o'qildi" belgisi
  app.get('/api/messages/conversations', authMiddleware, async (req, res) => {
    try {
      const list = await db.getConversations(req.user.userId);
      res.json({ success: true, conversations: list.map(c => ({ ...c, partner: { ...c.partner, online: isOnline(c.partner.id) } })) });
    }
    catch (err) { console.error('Conversations xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/messages/unread', authMiddleware, async (req, res) => {
    try { res.json({ success: true, unread: await db.getUnreadTotal(req.user.userId) }); }
    catch (err) { console.error('Unread xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/messages/read', authMiddleware, async (req, res) => {
    try {
      const roomId = req.body.roomId ? resolveChatRoom(String(req.body.roomId), req.user.userId) : null;
      if (!roomId || !roomId.startsWith('dm_')) return res.status(400).json({ success: false, message: 'Ruxsat yo\'q' });
      await db.markRoomRead(req.user.userId, roomId);
      res.json({ success: true });
    } catch (err) { console.error('Read xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/chat/messages', authMiddleware, async (req, res) => {
    try {
      const roomId = req.query.roomId ? resolveChatRoom(String(req.query.roomId), req.user.userId) : null;
      if (!roomId) return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' });
      const messages = await db.getChatMessages({ roomId, viewerId: req.user.userId });
      res.json({ success: true, messages });
    }
    catch (err) { console.error('Chat xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Chatni tozalash — faqat shu foydalanuvchi uchun (suhbatdoshda xabarlar qoladi)
  app.post('/api/chat/clear', authMiddleware, async (req, res) => {
    try {
      const roomId = req.body && req.body.roomId ? resolveChatRoom(String(req.body.roomId), req.user.userId) : null;
      if (!roomId || !(roomId.startsWith('dm_') || roomId.startsWith('club_'))) return res.status(400).json({ success: false, message: 'Ruxsat yo\'q' });
      await db.clearChat(req.user.userId, roomId);
      res.json({ success: true });
    } catch (err) { console.error('Chat tozalash xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/chat/messages', authMiddleware, [
    body('message').isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters'),
    body('receiverId').optional({ values: 'null' }).isUUID(),
    body('roomId').optional({ values: 'null' }).isLength({ max: 100 })
  ], async (req, res) => {
    try {
      const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
      if (mutedUntil(req.user.userId)) return res.status(403).json({ success: false, message: 'Siz vaqtincha chatda yoza olmaysiz!' });
      // Ketma-ket xabarlar oqimi (spam): bir foydalanuvchidan 0.4 soniyada bittadan ko'p emas
      const nowMs = Date.now();
      if (!TEST_MODE && nowMs - (lastChatPost.get(req.user.userId) || 0) < 400) return res.status(429).json({ success: false, message: 'Too many requests, please try again later.' });
      lastChatPost.set(req.user.userId, nowMs);
      const message = cleanChat(String(req.body.message));
      // Shaxsiy xabar: "user_<id>" yoki receiverId → ikki tomon uchun umumiy dm_ xonasi; aks holda faqat klub chati
      const requested = req.body.roomId || (req.body.receiverId ? `user_${req.body.receiverId}` : null);
      const roomId = requested ? resolveChatRoom(String(requested), req.user.userId) : null;
      if (!roomId) return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' });
      // Klub chati (club_<davlat>): o'qish hammaga, yozish faqat shu klub a'zolariga
      if (roomId && roomId.startsWith('club_')) {
        const me = await db.getUserById(req.user.userId);
        if (!me || me.club_country !== roomId.slice(5)) return res.status(403).json({ success: false, message: "Klub chatiga faqat klub a'zolari yozishi mumkin!" });
      }
      const partnerId = roomId ? dmPartner(roomId, req.user.userId) : null;
      const partner = partnerId ? await db.getUserById(partnerId) : null;
      if (partnerId && !partner) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      if (partnerId && blockedPair(req.user.userId, partnerId)) return res.status(403).json({ success: false, message: "Bu o'yinchi bilan aloqa cheklangan" });
      if (partner && db.userPrivacy(partner).messages === 'friends' && !(await db.areFriends(partnerId, req.user.userId))) {
        return res.status(403).json({ success: false, message: "Bu o'yinchi faqat do'stlaridan xabar qabul qiladi" });
      }
      const { id } = await db.sendChatMessage(req.user.userId, partnerId, roomId, message);
      const payload = { messageId: id, senderId: req.user.userId, senderName: req.user.username, message, roomId, createdAt: new Date().toISOString() };
      if (partnerId) {
        io.to(`user_${partnerId}`).to(`user_${req.user.userId}`).emit('chat-message', payload);
        const preview = message.startsWith('[sticker:') ? '🎨' : message.slice(0, 80);
        notify(partnerId, 'message', { from: req.user.username, preview }, 'dm:' + req.user.userId);
      }
      else io.to(roomId).emit('chat-message', payload);
      res.json({ success: true, messageId: id });
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Jamoaviy ligalar (league.js)
  app.get('/api/leagues', apiLimiter, async (req, res) => {
    try { res.json({ success: true, ...(await league.overview()) }); }
    catch (err) { console.error('Leagues xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/leagues/champions', apiLimiter, async (req, res) => {
    try { res.json({ success: true, detail: await league.championsDivision() }); }
    catch (err) { console.error('Champions league xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/leagues/divisions/:id', apiLimiter, async (req, res) => {
    try {
      const detail = await league.divisionDetail(req.params.id);
      if (!detail) return res.status(404).json({ success: false, message: 'Liga topilmadi!' });
      res.json({ success: true, ...detail });
    } catch (err) { console.error('League division xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/leagues/my-games', authMiddleware, async (req, res) => {
    try { res.json({ success: true, games: await league.myGames(req.user.userId) }); }
    catch (err) { console.error('League my-games xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Davlat klublari: har bir o'yinchi faqat bitta klubga a'zo bo'ladi
  app.get('/api/country-clubs', apiLimiter, async (req, res) => {
    try { res.json({ success: true, clubs: await cached('clubs', 30000, () => db.getCountryClubSummary()) }); }
    catch (err) { console.error('Country clubs xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/country-clubs/:name/members', apiLimiter, async (req, res) => {
    try { const data = await db.getCountryClubMembers(req.params.name); res.json({ success: true, ...data }); }
    catch (err) { console.error('Country club members xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/country-clubs/join', authMiddleware, async (req, res) => {
    try {
      const { country, code } = req.body;
      if (!isValidClubName(country) || !isValidFlagCode(code)) return res.status(400).json({ success: false, message: 'Klub topilmadi!' });
      const user = await db.getUserById(req.user.userId);
      if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      const current = db.userClub(user);
      if (current && current.name === country) return res.json({ success: true, club: current });
      // Boshqa klubda bo'lsa — faqat o'yinchi tasdiqlasa (switch) o'tkaziladi
      if (current && req.body.switch !== true) {
        return res.status(409).json({ success: false, reason: 'already_in_club', club: current, message: 'Siz allaqachon boshqa klubga a\'zosiz!' });
      }
      if (current) await db.clearUserCountryClub(req.user.userId);
      const club = await db.setUserCountryClub(req.user.userId, country, code);
      invalidateCache('clubs');
      checkAchievements(req.user.userId);
      res.json({ success: true, club, previous: current });
    } catch (err) { console.error('Country club join xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/country-clubs/leave', authMiddleware, async (req, res) => {
    try { await db.clearUserCountryClub(req.user.userId); res.json({ success: true, club: null }); }
    catch (err) { console.error('Country club leave xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // --- Klub rahbariyati (kapitan, moderatorlar) va klub yangiliklari ---
  async function clubContext(club, userId) {
    const staff = await db.getClubStaff(club);
    if (staff.autoCaptain) {
      const code = (await db.getUserById(staff.autoCaptain.userId) || {}).club_code || null;
      notify(staff.autoCaptain.userId, 'club_role', { club, code, role: 'captain' });
    }
    const me = userId ? await db.getUserById(userId) : null;
    const isAdmin = !!(me && me.role === 'admin');
    const isCaptain = !!(staff.captain && staff.captain.userId === userId);
    const isModerator = staff.moderators.some(m => m.userId === userId);
    return { staff, me, isAdmin, isCaptain, isModerator, canModerate: isAdmin || isCaptain || isModerator };
  }
  const publicStaff = (s) => ({ captain: s.captain ? { username: s.captain.username } : null, moderators: s.moderators.map(m => ({ username: m.username })) });
  app.get('/api/country-clubs/:name/staff', apiLimiter, async (req, res) => {
    try {
      const club = String(req.params.name);
      if (!isValidClubName(club)) return res.status(404).json({ success: false, message: 'Klub topilmadi!' });
      const ctx = await clubContext(club, optionalUserId(req));
      const myRole = ctx.isCaptain ? 'captain' : (ctx.isModerator ? 'moderator' : null);
      res.json({ success: true, ...publicStaff(ctx.staff), myRole, canModerate: ctx.canModerate, canManage: ctx.isCaptain || ctx.isAdmin, news: await db.listClubNews(club) });
    } catch (err) { console.error('Klub rahbariyati xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Kapitan (yoki sayt admini): moderator tayinlash/olib tashlash, kapitanlikni topshirish
  app.post('/api/country-clubs/:name/roles', authMiddleware, async (req, res) => {
    try {
      const club = String(req.params.name);
      const role = String((req.body && req.body.role) || '');
      if (!isValidClubName(club) || !['captain', 'moderator', 'member'].includes(role)) return res.status(400).json({ success: false, message: 'Ruxsat yo\'q' });
      const ctx = await clubContext(club, req.user.userId);
      if (!ctx.isCaptain && !ctx.isAdmin) return res.status(403).json({ success: false, message: 'Faqat kapitan rollarni boshqara oladi!' });
      const target = await db.getUserByUsername(String((req.body && req.body.username) || ''));
      if (!target || target.club_country !== club) return res.status(400).json({ success: false, message: "O'yinchi bu klub a'zosi emas!" });
      if (role === 'captain') {
        // Kapitanlik topshiriladi: eski kapitan moderator bo'lib qoladi
        if (ctx.staff.captain && ctx.staff.captain.userId !== target.id) await db.setClubRole(club, ctx.staff.captain.userId, 'moderator');
        await db.setClubRole(club, target.id, 'captain');
      } else {
        if (ctx.staff.captain && ctx.staff.captain.userId === target.id) return res.status(400).json({ success: false, message: 'Ruxsat yo\'q' });
        await db.setClubRole(club, target.id, role);
      }
      if (target.id !== req.user.userId) notify(target.id, 'club_role', { club, code: target.club_code || null, role });
      if (ctx.isAdmin && !ctx.isCaptain) auditLog(req, 'club_role', { type: 'user', id: target.id, name: target.username }, { club, role });
      const staff = await db.getClubStaff(club);
      res.json({ success: true, ...publicStaff(staff) });
    } catch (err) { console.error('Klub roli xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/country-clubs/:name/news', authMiddleware, async (req, res) => {
    try {
      const club = String(req.params.name);
      if (!isValidClubName(club)) return res.status(404).json({ success: false, message: 'Klub topilmadi!' });
      const ctx = await clubContext(club, req.user.userId);
      if (!ctx.canModerate) return res.status(403).json({ success: false, message: 'Faqat kapitan va moderatorlar yangilik yoza oladi!' });
      const title = String((req.body && req.body.title) || '').trim().slice(0, 120);
      const text = String((req.body && req.body.body) || '').trim().slice(0, 3000);
      if (!title || !text) return res.status(400).json({ success: false, message: 'Sarlavha va matn kerak!' });
      const id = await db.addClubNews(club, req.user.userId, title, text, !!(req.body && req.body.pinned));
      const code = (ctx.me && ctx.me.club_code) || null;
      for (const uid of await db.getClubMemberIds(club)) if (uid !== req.user.userId) notify(uid, 'club_news', { club, code, title, newsId: id, author: req.user.username });
      res.json({ success: true, id, news: await db.listClubNews(club) });
    } catch (err) { console.error('Klub yangiligi xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Yangilikni o'chirish yoki mahkamlash (📌)
  const newsAction = (action) => async (req, res) => {
    try {
      const news = await db.getClubNews(String(req.params.id));
      if (!news) return res.status(404).json({ success: false, message: 'Yangilik topilmadi!' });
      const ctx = await clubContext(news.club, req.user.userId);
      if (!ctx.canModerate) return res.status(403).json({ success: false, message: 'Faqat kapitan va moderatorlar yangilik yoza oladi!' });
      if (action === 'delete') await db.deleteClubNews(news.id);
      else await db.setClubNewsPinned(news.id, !Number(news.pinned));
      if (ctx.isAdmin && !ctx.isCaptain && !ctx.isModerator) auditLog(req, action === 'delete' ? 'club_news_delete' : 'club_news_pin', { type: 'club', name: news.club }, { title: news.title });
      res.json({ success: true, news: await db.listClubNews(news.club) });
    } catch (err) { console.error('Klub yangiligi xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  };
  app.delete('/api/country-clubs/news/:id', authMiddleware, newsAction('delete'));
  app.post('/api/country-clubs/news/:id/pin', authMiddleware, newsAction('pin'));

  // Klub chatidagi xabarni o'chirish — kapitan, moderator yoki sayt admini
  app.delete('/api/chat/messages/:id', authMiddleware, async (req, res) => {
    try {
      const msg = await db.getChatMessageById(String(req.params.id));
      if (!msg || !msg.roomId || !msg.roomId.startsWith('club_')) return res.status(404).json({ success: false, message: 'Xabar topilmadi!' });
      const ctx = await clubContext(msg.roomId.slice(5), req.user.userId);
      if (!ctx.canModerate) return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' });
      await db.deleteChatMessage(msg.id);
      if (ctx.isAdmin && !ctx.isCaptain && !ctx.isModerator) auditLog(req, 'chat_delete', { type: 'user', id: msg.senderId, name: msg.sender }, { club: msg.roomId.slice(5), message: String(msg.message || '').slice(0, 200) });
      io.to(msg.roomId).emit('chat-message-deleted', { roomId: msg.roomId, messageId: msg.id });
      res.json({ success: true });
    } catch (err) { console.error('Chat xabarini o\'chirish xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // --- Profil qo'shimchalari: yutuqlar, kuzatuvchilar, kengaytirilgan statistika ---
  // 🎯 Haftalik vazifalar (Karvon yo'li sahifasida)
  app.get('/api/quests', authMiddleware, async (req, res) => {
    try { res.json({ success: true, ...(await questProgress(req.user.userId)) }); }
    catch (err) { console.error('Vazifalar xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  if (TEST_MODE) app.get('/api/test/quests', authMiddleware, async (req, res) => res.json({ success: true, ...(await questProgress(req.user.userId, Number(req.query.now) || Date.now())) }));

  // ⭐ Kun o'yini (Jonli o'yinlar sahifasida) — kesh 60 s, kun almashganda yangi kalit
  app.get('/api/game-of-day', apiLimiter, async (req, res) => {
    try {
      const day = dayKeyOf(tashkentDayStart());
      res.json({ success: true, game: await cached('god:' + day, 60000, () => pickGameOfDay()) });
    } catch (err) { console.error("Kun o'yini xatoligi:", err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  // Test uchun: berilgan vaqtdagi kunning o'yini (keshsiz)
  if (TEST_MODE) app.get('/api/test/game-of-day', async (req, res) => res.json({ success: true, game: await pickGameOfDay(Number(req.query.now) || Date.now()) }));

  // 🐪 Karvon yo'li: eng uzoqqa yurgan karvonlar (mehmonlarsiz) va har shahardagi karvonlar soni
  app.get('/api/caravan', apiLimiter, async (req, res) => {
    try {
      const data = await cached('caravan', 60000, async () => {
        const rows = (await db.caravanRows()).map((r) => ({ ...r, points: Caravan.pointsOf(r.stats) })).filter((r) => r.points > 0);
        rows.sort((a, b) => b.points - a.points);
        const perCity = Caravan.CITIES.map(() => 0);
        for (const r of rows) perCity[Caravan.cityIndex(r.points)]++;
        return { leaders: rows.slice(0, 10).map((r) => ({ username: r.username, country: r.country, avatarVersion: r.avatarVersion, points: r.points, city: Caravan.CITIES[Caravan.cityIndex(r.points)].key })), perCity, travellers: rows.length };
      });
      res.json({ success: true, ...data });
    } catch (err) { console.error('Karvon xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // 📖 Profil: o'yinchining debyutlari (standart o'yinlar, oxirgi 400 ta) — kesh 5 daqiqa
  app.get('/api/users/:username/openings', apiLimiter, async (req, res) => {
    try {
      const u = await db.getUserByUsername(String(req.params.username));
      if (!u) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      res.json({ success: true, ...(await cached('open:' + u.id, 300000, () => openingStats(u.id))) });
    } catch (err) { console.error('Debyutlar xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // 🌸 Bayram: davom etayotganlari (kirgan bo'lsa — o'z progressi) va keyingisi
  app.get('/api/holiday', apiLimiter, async (req, res) => {
    try {
      const viewer = optionalUserId(req);
      const act = Holidays.active(Date.now(), HOLIDAY_FORCE);
      const mine = viewer && !isGuest(viewer) && act.length ? await holidayProgress(viewer) : [];
      const nx = Holidays.next(Date.now());
      res.json({
        success: true,
        active: act.map((h) => ({ key: h.key, icon: h.icon, year: h.year, need: h.need, endsAt: new Date(h.end).toISOString(), mine: mine.find((m) => m.key === h.key) || null })),
        next: nx ? { key: nx.key, icon: nx.icon, year: nx.year, need: nx.need, startsAt: new Date(nx.start).toISOString() } : null
      });
    } catch (err) { console.error('Bayram xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/users/:username/extras', apiLimiter, async (req, res) => {
    try {
      const u = await db.getUserByUsername(String(req.params.username));
      if (!u) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      await checkAchievements(u.id, { silent: true });
      const viewer = optionalUserId(req);
      res.json({
        success: true,
        achievements: await db.getAchievements(u.id),
        ...(await db.followCounts(u.id)),
        isFollowing: viewer && viewer !== u.id ? await db.isFollowing(viewer, u.id) : false,
        cheater: u.fairplay_flag === 'cheater',
        rivals: await rivalsOf(u.id),
        sportsmanship: await db.sportSummary(u.id),
        caravan: isGuest(u.id) ? null : Caravan.pointsOf(u.stats),
        banner: isGuest(u.id) ? null : bannerOf(u),
        questBadges: await db.countQuestWeeks(u.id),
        duels: await db.duelSummary(u.id),
        badges: { questWeeks: await db.listQuestWeeks(u.id), gameOfDay: await db.gameOfDayFor(u.id, u.username), holidays: await db.listHolidayBadges(u.id) },
        predictions: await db.predictionSummary(u.id, monthStartIso(warSeasonKey())),
        extStats: await db.getExtendedStats(u)
      });
    } catch (err) { console.error('Profil qo\'shimchalari xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // 🚩 Bayroqlar bellashuvi: xarita holati, klublar jadvali, o'tgan hukmdorlar, o'z klubim
  app.get('/api/war', apiLimiter, async (req, res) => {
    try {
      await closeWarSeasons();
      const current = warSeasonKey();
      const season = /^\d{4}-\d{2}$/.test(String(req.query.season || '')) ? String(req.query.season) : current;
      const state = await cached('war:' + season, 20000, () => computeWar(season));
      const viewer = optionalUserId(req);
      let me = null;
      if (viewer) {
        const u = await db.getUserById(viewer);
        if (u && u.club_code) {
          const mine = await db.warUserPoints(season, viewer);
          const rank = state.clubs.findIndex(c => c.code === u.club_code);
          const club = state.clubs[rank] || { code: u.club_code, country: u.club_country, points: 0, territories: 0, fighters: 0 };
          me = { club, rank: rank >= 0 ? rank + 1 : null, myPoints: mine.points, myGames: mine.games, top: await db.warTopContributors(season, u.club_code) };
        } else me = { club: null };
      }
      res.json({ success: true, current: season === current, ...state, clubs: state.clubs.slice(0, 60), previous: await db.listWarSeasons(6), me });
    } catch (err) { console.error('Urush xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // 🔮 Bashoratchilar reytingi: shu oy (Toshkent vaqti) yoki butun vaqt
  app.get('/api/predictions/leaderboard', async (req, res) => {
    try {
      const period = req.query.period === 'all' ? 'all' : 'month';
      const list = await cached('pred:' + period, 30000, () => db.predictionLeaders(period === 'all' ? null : monthStartIso(warSeasonKey())));
      const viewer = optionalUserId(req);
      let me = null;
      if (viewer) { const i = list.findIndex(r => r.userId === viewer); me = i >= 0 ? { ...list[i], rank: i + 1 } : null; }
      res.json({ success: true, period, season: warSeasonKey(), leaders: list.slice(0, 20).map(({ userId, ...r }) => r), me: me ? (({ userId, ...r }) => r)(me) : null });
    } catch (err) { console.error('Bashorat reytingi xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // ⚔️ Ikki o'yinchi o'rtasidagi hisob (birinchisining nuqtai nazaridan)
  app.get('/api/h2h/:a/:b', apiLimiter, async (req, res) => {
    try {
      const a = await db.getUserByUsername(String(req.params.a));
      if (!a) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      const rival = (await rivalsOf(a.id))[0];
      res.json({ success: true, ...(await headToHead(a.id, String(req.params.b))), isRival: !!(rival && rival.name === String(req.params.b)) });
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // 📜 Mavsum (oy) yakuni: natijalar, reyting o'zgarishi, eng katta g'alaba, raqiblar, klub uchun hissa
  app.get('/api/users/:username/wrapped', apiLimiter, async (req, res) => {
    try {
      const u = await db.getUserByUsername(String(req.params.username));
      if (!u) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      const season = /^\d{4}-\d{2}$/.test(String(req.query.season || '')) ? String(req.query.season) : warSeasonKey();
      const history = await db.getUserHistory(u.id);
      const inSeason = (ts) => { const t = new Date(ts || 0).getTime(); return !isNaN(t) && warSeasonKey(t) === season; };
      const games = (await db.getUserHistory(u.id, { withMoves: true, from: monthStartIso(season), to: warSeasonEnd(season) })).filter(g => inSeason(g.timestamp));
      const seasons = [...new Set(history.map(g => { const t = new Date(g.timestamp || g.date || 0).getTime(); return isNaN(t) || !t ? null : warSeasonKey(t); }).filter(Boolean))].sort().reverse().slice(0, 12);
      const sum = { win: 0, draw: 0, loss: 0 };
      let streak = 0, run = 0;
      const byMode = {}, opp = new Map();
      for (const g of games) {
        sum[g.result] = (sum[g.result] || 0) + 1;
        if (g.result === 'win') { run++; streak = Math.max(streak, run); } else run = 0;
        const mode = g.timeControl || 'blitz';
        byMode[mode] = (byMode[mode] || 0) + 1;
        if (g.opponent) { const o = opp.get(g.opponent) || { name: g.opponent, games: 0, win: 0, draw: 0, loss: 0 }; o.games++; o[g.result]++; opp.set(g.opponent, o); }
      }
      const opps = [...opp.values()];
      const nemesis = opps.filter(o => o.loss >= 2).sort((a, b) => b.loss - a.loss || a.win - b.win)[0] || null;
      const victim = opps.filter(o => o.win >= 2).sort((a, b) => b.win - a.win || a.loss - b.loss)[0] || null;
      const mostPlayed = opps.sort((a, b) => b.games - a.games)[0] || null;
      // Reyting: har rejim bo'yicha mavsum boshidagi va oxiridagi qiymat, eng katta bir o'yinlik o'sish
      const rh = await db.ratingHistorySeason(u.id);
      const ratings = {};
      let bestGain = null;
      for (const r of rh.filter(x => inSeason(x.t))) {
        if (!ratings[r.mode]) ratings[r.mode] = { from: Number(r.before), to: Number(r.rating) };
        ratings[r.mode].to = Number(r.rating);
        const gain = Number(r.rating) - Number(r.before);
        if (gain > 0 && (!bestGain || gain > bestGain.gain)) bestGain = { gain, mode: r.mode, opponentId: r.opponentId, at: r.t };
      }
      if (bestGain && bestGain.opponentId) { const o = await db.getUserById(bestGain.opponentId); bestGain.opponent = o ? o.username : null; }
      if (bestGain) delete bestGain.opponentId;
      const war = await db.warUserPoints(season, u.id);
      let club = null;
      if (u.club_code) {
        const state = await cached('war:' + season, 20000, () => computeWar(season));
        const rank = state.clubs.findIndex(c => c.code === u.club_code);
        club = { name: u.club_country, code: u.club_code, rank: rank >= 0 ? rank + 1 : null, territories: rank >= 0 ? state.clubs[rank].territories : 0 };
      }
      res.json({
        success: true, season, seasons, username: u.username, avatarVersion: u.avatar_version || null, country: u.country || null,
        games: games.length, ...sum, winRate: games.length ? Math.round(sum.win / games.length * 100) : 0, streak, byMode,
        ratings, bestGain, nemesis, victim, mostPlayed, war: { ...war, club },
        // Sevimli debyut klientda hisoblanadi (openings.js): standart o'yinlarning dastlabki yurishlari
        openingLines: games.filter(g => (!g.variant || g.variant === 'standard') && Array.isArray(g.moves) && g.moves.length).map(g => g.moves.slice(0, 16))
      });
    } catch (err) { console.error('Mavsum yakuni xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/follow', authMiddleware, async (req, res) => {
    try {
      const target = await db.getUserByUsername(String((req.body && req.body.username) || ''));
      if (!target) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      if (target.id === req.user.userId) return res.status(400).json({ success: false, message: 'Ruxsat yo\'q' });
      const on = !(req.body && req.body.follow === false);
      if (on && blockedPair(req.user.userId, target.id)) return res.status(403).json({ success: false, message: "Bu o'yinchi bilan aloqa cheklangan" });
      await db.setFollow(req.user.userId, target.id, on);
      res.json({ success: true, isFollowing: on, ...(await db.followCounts(target.id)) });
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Kuzatayotganlarim va do'stlarim: onlayn holati va hozir o'ynayotgan o'yini
  app.get('/api/follows/online', authMiddleware, async (req, res) => {
    try {
      const playing = new Map();
      for (const [roomId, room] of rooms.entries()) if (room.status === 'active') for (const p of room.players) if (p.userId) playing.set(p.userId, roomId);
      const list = (await db.getCircle(req.user.userId)).map(u => ({ username: u.username, country: u.country || null, rating: u.rating || 1500, avatarVersion: u.avatarVersion || null,
        friend: u.friend, follow: u.follow, online: isOnline(u.id), roomId: playing.get(u.id) || null }));
      list.sort((a, b) => (b.online - a.online) || (!!b.roomId - !!a.roomId) || a.username.localeCompare(b.username));
      res.json({ success: true, people: list });
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // O'yinlar tarixi: filtr (rejim, natija, rang, raqib) va sahifalash; PGN — filtrlangan barcha o'yinlar
  const historyFilter = (q) => ({ mode: q.mode, result: q.result, color: q.color, q: q.q });
  app.get('/api/users/:username/history', apiLimiter, async (req, res) => {
    try {
      const u = await db.getUserByUsername(String(req.params.username));
      if (!u) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      const all = await db.historyEntries(u);
      const list = db.filterHistory(all, historyFilter(req.query));
      const per = 20;
      const pages = Math.max(1, Math.ceil(list.length / per));
      const page = Math.min(pages, Math.max(1, Number(req.query.page) || 1));
      const summary = { win: 0, draw: 0, loss: 0 };
      for (const g of list) summary[g.result] = (summary[g.result] || 0) + 1;
      res.json({
        success: true, total: list.length, page, pages, summary,
        games: list.slice((page - 1) * per, page * per).map(g => ({ id: g.id || null, result: g.result, opponent: g.opponent || null, timeControl: g.timeControl || null,
          variant: g.variant || 'standard', color: g.color || null, reason: g.reason || null, clock: g.clock || null, date: g.timestamp || g.date || null,
          moves: Math.ceil((g.moveCount || 0) / 2), hasMoves: (g.moveCount || 0) > 0 }))
      });
    } catch (err) { console.error('Tarix xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.get('/api/users/:username/pgn', apiLimiter, async (req, res) => {
    try {
      const u = await db.getUserByUsername(String(req.params.username));
      if (!u) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      const list = db.filterHistory(await db.historyEntries(u, true), historyFilter(req.query)).filter(g => Array.isArray(g.moves) && g.moves.length).slice(0, 1000);
      const pgn = list.map(g => {
        const asWhite = g.color !== 'b';
        const white = asWhite ? u.username : (g.opponent || '?'), black = asWhite ? (g.opponent || '?') : u.username;
        const res1 = g.result === 'draw' ? '1/2-1/2' : ((g.result === 'win') === asWhite ? '1-0' : '0-1');
        const d = new Date(g.timestamp || Date.now());
        const head = [`[Event "ChessCaravan"]`, `[Site "${SITE_URL}"]`, `[Date "${isNaN(d) ? '????.??.??' : d.toISOString().slice(0, 10).replace(/-/g, '.')}"]`,
          `[White "${white}"]`, `[Black "${black}"]`, `[Result "${g.color ? res1 : '*'}"]`]
          .concat(g.clock ? [`[TimeControl "${g.clock}"]`] : [])
          .concat(g.variant === 'chess960' && g.startFen ? ['[Variant "Chess960"]', '[SetUp "1"]', `[FEN "${g.startFen}"]`] : [])
          .concat(g.variant === 'shatranj' ? ['[Variant "Shatranj"]', '[SetUp "1"]', `[FEN "${Shatranj.START_FEN}"]`] : []);
        let body = '';
        g.moves.forEach((s, i) => { body += (i % 2 === 0 ? (i / 2 + 1) + '. ' : '') + s + ' '; });
        return head.join('\n') + '\n\n' + body + (g.color ? res1 : '*') + '\n';
      }).join('\n');
      res.set('Content-Disposition', `attachment; filename="chesscaravan-${u.username}.pgn"`);
      res.type('application/x-chess-pgn').send(pgn);
    } catch (err) { console.error('PGN xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Admin: fair-play
  app.get('/api/admin/fairplay', adminMiddleware, async (req, res) => {
    try {
      const list = await db.fairplayOverview();
      for (const u of list) { u.recent = await db.recentFairplay(u.id, 10); u.recentEngine = await db.recentFairplayEngine(u.id, 10); }
      res.json({ success: true, users: list, queue: fairplayAnalyzer ? fairplayAnalyzer.size() : 0, engineEnabled: !!fairplayAnalyzer });
    } catch (err) { console.error('Fair-play xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  // 📚 Kutubxona: admin materiallari (ommaviy ro'yxat + admin qo'shish/tahrirlash/o'chirish)
  app.get('/api/library', apiLimiter, async (req, res) => {
    try { res.json({ success: true, items: await cached('library', 60000, () => db.listLibraryItems()) }); }
    catch (err) { console.error('Kutubxona xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.post('/api/admin/library', adminMiddleware, async (req, res) => {
    try {
      const v = validateLibraryItem(req.body || {});
      if (v.error) return res.status(400).json({ success: false, message: v.error });
      const id = await db.saveLibraryItem(v.item, req.user.userId);
      if (!id) return res.status(404).json({ success: false, message: 'Kutubxona materiali topilmadi!' });
      invalidateCache('library');
      auditLog(req, v.item.id ? 'library_edit' : 'library_add', { type: 'library', id, name: v.item.title }, { kind: v.item.kind });
      res.json({ success: true, id });
    } catch (err) { console.error('Kutubxona xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.post('/api/admin/library/:id/delete', adminMiddleware, async (req, res) => {
    try {
      const title = await db.deleteLibraryItem(String(req.params.id));
      if (title === null) return res.status(404).json({ success: false, message: 'Kutubxona materiali topilmadi!' });
      invalidateCache('library');
      auditLog(req, 'library_delete', { type: 'library', id: req.params.id, name: title });
      res.json({ success: true });
    } catch (err) { console.error('Kutubxona xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Admin: o'yinchining oxirgi 10 ta reytingli o'yinini dvigatel bilan tekshirish
  app.post('/api/admin/fairplay/:id/analyze', adminMiddleware, async (req, res) => {
    try {
      const target = await db.getUserById(req.params.id);
      if (!target) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      const queued = await analyzeRecentGames(target.id, 10);
      auditLog(req, 'fairplay_analyze', { type: 'user', id: target.id, name: target.username }, { queued });
      res.json({ success: true, queued });
    } catch (err) { console.error('Fair-play xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  // action: cheater (qoidabuzar + raqiblariga reyting qaytariladi), clear (shubha olib tashlanadi)
  app.post('/api/admin/fairplay/:id', adminMiddleware, async (req, res) => {
    try {
      const target = await db.getUserById(req.params.id);
      if (!target) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      const action = req.body && req.body.action;
      if (action === 'clear') {
        await db.setFairplayFlag(target.id, 'cleared');
        auditLog(req, 'fairplay_clear', { type: 'user', id: target.id, name: target.username });
        return res.json({ success: true });
      }
      if (action !== 'cheater') return res.status(400).json({ success: false, message: 'Ruxsat yo\'q' });
      await db.setFairplayFlag(target.id, 'cheater');
      const refunds = await db.refundAgainst(target.id);
      const byUser = new Map();
      for (const r of refunds) { const x = byUser.get(r.userId) || 0; byUser.set(r.userId, x + r.amount); }
      for (const [uid, amount] of byUser) notify(uid, 'rating_refund', { name: target.username, amount });
      invalidateCache('leaderboard');
      const points = refunds.reduce((s, r) => s + r.amount, 0);
      auditLog(req, 'fairplay_cheater', { type: 'user', id: target.id, name: target.username }, { refunded: byUser.size, points });
      res.json({ success: true, refunded: byUser.size, points });
    } catch (err) { console.error('Fair-play xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Admin: chat moderatsiyasi — klub chatlari, jim qilish, taqiqlangan so'zlar
  app.get('/api/admin/chat', adminMiddleware, async (req, res) => {
    try { res.json({ success: true, messages: await db.recentClubMessages({ club: req.query.club ? String(req.query.club) : '', user: req.query.user ? String(req.query.user) : '' }), words: chatFilterWords }); }
    catch (err) { console.error('Admin chat xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.post('/api/admin/users/:id/mute', adminMiddleware, async (req, res) => {
    try {
      const target = await db.getUserById(req.params.id);
      if (!target) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      const hours = Number(req.body && req.body.hours) || 0;
      const until = hours > 0 ? new Date(Date.now() + hours * 3600 * 1000).toISOString() : null;
      await db.setMute(target.id, until);
      if (until) mutes.set(target.id, until); else mutes.delete(target.id);
      if (until) notify(target.id, 'muted', { until });
      auditLog(req, until ? 'mute' : 'unmute', { type: 'user', id: target.id, name: target.username }, until ? { hours } : null);
      res.json({ success: true, until });
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.post('/api/admin/chat-filter', adminMiddleware, async (req, res) => {
    try {
      const word = String((req.body && req.body.word) || '').trim().toLowerCase().slice(0, 40);
      if (!word) return res.status(400).json({ success: false, message: 'Ruxsat yo\'q' });
      if (req.body.remove) await db.removeChatFilterWord(word); else await db.addChatFilterWord(word);
      auditLog(req, req.body.remove ? 'filter_remove' : 'filter_add', { type: 'word', name: word });
      setChatFilter(await db.listChatFilter());
      res.json({ success: true, words: chatFilterWords });
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // --- Bildirishnomalar markazi ---
  app.get('/api/notifications', authMiddleware, async (req, res) => {
    try { res.json({ success: true, ...(await db.listNotifications(req.user.userId)) }); }
    catch (err) { console.error('Bildirishnomalar xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.post('/api/notifications/read', authMiddleware, async (req, res) => {
    try { await db.markNotificationsRead(req.user.userId); res.json({ success: true }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });
  app.post('/api/notifications/clear', authMiddleware, async (req, res) => {
    try { await db.clearNotifications(req.user.userId); res.json({ success: true }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/clubs/leaderboard', apiLimiter, async (req, res) => {
    try { const data = await db.getClubLeaderboard(); res.json(data); }
    catch (err) { console.error('Club leaderboard xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  teamChess = teamchess.init({ io, cleanChat, mutedUntil, isGuest, inActiveGame });
  io.on('connection', (socket) => {
    teamChess.attach(socket);
    // Ochiq sahifalar yangi deployni sezishi uchun
    socket.emit('app-version', APP_VERSION);
    console.log('Yangi o\'yinchi ulandi:', socket.id);
    // Shaxsiy xabarlar (do'stlik so'rovi, chat) uchun user_<id> xonasiga qo'shish
    socket.on('authenticate', (token) => {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (deletedUsers.has(decoded.userId)) { socket.emit('auth-error', { deleted: true }); return; }
        const ban = activeBan(decoded.userId);
        if (ban) { socket.emit('auth-error', { banned: true, message: banMessage(ban) }); return; }
        socket.data.userId = decoded.userId;
        socket.data.username = decoded.username;
        socket.join(`user_${decoded.userId}`);
        // Onlayn holat: birinchi socket ulanganda hammaga xabar
        const set = onlineUsers.get(decoded.userId) || new Set();
        const wasOnline = set.size > 0;
        set.add(socket.id);
        onlineUsers.set(decoded.userId, set);
        if (!wasOnline) {
          io.emit('presence', { userId: decoded.userId, online: true });
          notifyRivalOnline(decoded.userId);
        }
        resumeGames(socket).catch(err => console.error("O'yinni tiklash xatoligi:", err));
        // Kutayotgan chaqiruvlar (masalan, push bosilib ilova endi ochilgan bo'lsa)
        for (const c of challenges.values()) {
          if (c.toId !== decoded.userId || !c.payload) continue;
          const left = Math.round((c.expiresAt - Date.now()) / 1000);
          if (left > 3) socket.emit('challenge-received', { ...c.payload, seconds: left });
        }
      } catch (err) { socket.emit('auth-error', { message: 'Invalid or expired token' }); }
    });
    // Faqat klub chati xonasi (avval istalgan xonaga — tomoshabinlar, 2 ga 2 stollari — qo'shilib bo'lardi).
    // Eski send-chat-message / join-chat-room olib tashlangan: ular bloklash, mute, so'z filtri va a'zolikni chetlab o'tardi
    socket.on('join-club-room', (clubRoomId) => {
      if (typeof clubRoomId !== 'string' || !clubRoomId.startsWith('club_') || !isValidClubName(clubRoomId.slice(5))) return;
      for (const r of socket.rooms) if (r.startsWith('club_') && r !== clubRoomId) socket.leave(r);
      socket.join(clubRoomId);
    });
    socket.on('make-move', (data) => {
      const { roomId, move } = data || {};
      const room = rooms.get(roomId);
      if (!room) { socket.emit('move-rejected', { reason: 'not_in_room', error: 'Room not found' }); return; }
      const player = findPlayer(room, socket.id);
      if (!player) { socket.emit('move-rejected', { reason: 'not_in_room', error: 'Socket is not in this room' }); return; }
      if (room.status !== 'active') { socket.emit('move-rejected', { reason: 'game_over', error: 'Game is over' }); return; }
      if (player.color !== room.chess.turn()) { socket.emit('move-rejected', { reason: 'not_your_turn', error: 'Not your turn' }); return; }
      const validation = validateMove(move);
      if (!validation.valid) { socket.emit('move-rejected', { reason: 'invalid_move', error: validation.error }); return; }
      // Soat: yurgan tomonning o'tgan vaqti. Vaqti tugagan bo'lsa yurish qabul qilinmaydi; soat faqat qonuniy
      // yurishdan keyin o'zgaradi (avval noqonuniy yurish ham vaqtni ayirardi va keyingi urinishda ikki marta ayirilardi)
      const now = Date.now();
      const spent = room.turnStartedAt !== null ? now - room.turnStartedAt : 0;
      const used = Math.max(0, spent - Math.min(spent, lagCompFor(player)));
      if (room.turnStartedAt !== null && room.clock[player.color] - used <= 0) {
        room.clock[player.color] = 0;
        socket.emit('move-rejected', { reason: 'game_over', error: 'Time is up' });
        const t = timeoutResult(room, player.color);
        endGame(roomId, room, t.winner, t.reason);
        return;
      }
      // Qonun-qoidaga zid yurish rad etiladi (chess.js serverda ham tekshiradi)
      const result = room.chess.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
      if (!result) { socket.emit('move-rejected', { reason: 'invalid_move', error: 'Illegal move' }); return; }
      if (room.turnStartedAt !== null) {
        (player.moveTimes = player.moveTimes || []).push(spent);
        room.clock[player.color] += room.clock.increment * 1000 - used;
      }
      room.drawOfferBy = null;
      room.turnStartedAt = room.chess.history().length >= 2 ? now : null;
      socket.to(roomId).emit('opponent-move', { from: result.from, to: result.to, promotion: result.promotion });
      const watchMove = { roomId, move: { from: result.from, to: result.to, promotion: result.promotion }, san: result.san, ply: room.chess.history().length - 1 };
      resolveGuesses(roomId, room, watchMove.ply, result.san);
      // 10-yurishdan keyin "Kim yutadi?" yopiladi
      if (room.chess.history().length === PREDICT_OPEN_PLIES && room.pred && room.pred.result.size) emitPredictStats(roomId, room);
      if (room.chess.game_over()) {
        const chess = room.chess;
        if (typeof chess.result === 'function') {
          const r = chess.result();
          io.to('watch_' + roomId).emit('watch-move', { ...watchMove, clock: clockPayload(room) });
          endGame(roomId, room, r.winner, r.reason);
          return;
        }
        let reason = 'draw';
        if (chess.in_checkmate()) reason = 'checkmate';
        else if (chess.in_stalemate()) reason = 'stalemate';
        else if (chess.in_threefold_repetition()) reason = 'threefold';
        else if (chess.insufficient_material()) reason = 'insufficient';
        else reason = 'fifty';
        io.to('watch_' + roomId).emit('watch-move', { ...watchMove, clock: clockPayload(room) });
        endGame(roomId, room, reason === 'checkmate' ? player.color : null, reason);
        return;
      }
      scheduleRoomTimer(roomId, room);
      emitClock(roomId, room);
      io.to('watch_' + roomId).emit('watch-move', { ...watchMove, clock: clockPayload(room) });
    });
    // Durrang taklifi faqat davom etayotgan o'yinda va raqib taklifini qabul qilish orqali
    const activeRoomOf = (data) => {
      const roomId = data && data.roomId;
      const room = rooms.get(roomId);
      if (!room || room.status !== 'active') return null;
      const player = findPlayer(room, socket.id);
      return player ? { roomId, room, player } : null;
    };
    socket.on('offer-draw', (data) => {
      const ctx = activeRoomOf(data); if (!ctx) return;
      // Bir yurish davomida bitta taklif (rad etilgandan keyin qayta-qayta taklif qilib bezovta qilib bo'lmaydi)
      const ply = ctx.room.chess.history().length;
      if (ctx.room.drawOfferBy === ctx.player.color || ctx.player.drawOfferPly === ply) return;
      ctx.player.drawOfferPly = ply;
      ctx.room.drawOfferBy = ctx.player.color;
      socket.to(ctx.roomId).emit('draw-offered', { roomId: ctx.roomId });
    });
    socket.on('accept-draw', (data) => {
      const ctx = activeRoomOf(data); if (!ctx) return;
      if (ctx.room.drawOfferBy !== otherColor(ctx.player.color)) return;
      endGame(ctx.roomId, ctx.room, null, 'agreement');
    });
    socket.on('decline-draw', (data) => {
      const ctx = activeRoomOf(data); if (!ctx) return;
      ctx.room.drawOfferBy = null;
      socket.to(ctx.roomId).emit('draw-declined', { roomId: ctx.roomId });
    });
    // Taslim bo'lish
    socket.on('game-over', (data) => {
      const ctx = activeRoomOf(data); if (!ctx) return;
      if (data.result && data.result.type === 'resign') endGame(ctx.roomId, ctx.room, otherColor(ctx.player.color), 'resign');
    });
    socket.on('leave-room', (roomId) => {
      const room = rooms.get(roomId);
      if (!room) { socket.leave(roomId); return; }
      const wasActive = room.status === 'active';
      handlePlayerLeave(socket, roomId, room);
      if (!wasActive) socket.to(roomId).emit('opponent-disconnected');
    });
    socket.on('game-blur', (data) => {
      const room = data && rooms.get(data.roomId);
      const player = room && room.status === 'active' && findPlayer(room, socket.id);
      if (!player) return;
      const now = Date.now();
      if (player.lastBlur && now - player.lastBlur < 2000) return;
      player.lastBlur = now;
      player.blurs = (player.blurs || 0) + 1;
    });
    // O'yin ichidagi chat (xotirada, saqlanmaydi): faqat shu xonaning o'yinchilari, sekundiga ko'pi bilan 2 ta
    socket.on('game-chat', (data) => {
      const room = data && rooms.get(data.roomId);
      const player = room && findPlayer(room, socket.id);
      if (!player || !player.userId || isGuest(player.userId)) return;
      const message = cleanChat(typeof data.message === 'string' ? data.message.trim().slice(0, 200) : '');
      if (!message || mutedUntil(player.userId)) return;
      const now = Date.now();
      if (socket.data.lastGameChat && now - socket.data.lastGameChat < 500) return;
      socket.data.lastGameChat = now;
      const opponent = room.players.find(p => p !== player);
      // Bloklangan bo'lsa raqibga yetkazilmaydi
      if (opponent && opponent.userId && blockedPair(player.userId, opponent.userId)) {
        socket.emit('game-chat', { roomId: data.roomId, from: player.username, color: player.color, message, at: new Date().toISOString() });
        return;
      }
      io.to(data.roomId).emit('game-chat', { roomId: data.roomId, from: player.username, color: player.color, message, at: new Date().toISOString() });
    });

    // Revansh: tugagan o'yindan keyin xuddi shu vaqt nazoratida, ranglar almashadi
    socket.on('rematch-offer', (data) => {
      const room = data && rooms.get(data.roomId);
      const player = room && findPlayer(room, socket.id);
      if (!player || room.status !== 'over' || room.leagueGameId) return socket.emit('rematch-unavailable', { roomId: data && data.roomId });
      const opponent = room.players.find(p => p !== player);
      if (!opponent || !io.sockets.sockets.get(opponent.socketId) || inActiveGame(player.userId) || inActiveGame(opponent.userId)) {
        return socket.emit('rematch-unavailable', { roomId: data.roomId });
      }
      if (room.rematchBy && room.rematchBy !== player.color) return startRematch(data.roomId, room);
      room.rematchBy = player.color;
      io.to(opponent.socketId).emit('rematch-offered', { roomId: data.roomId, from: player.username });
    });
    socket.on('rematch-accept', (data) => {
      const room = data && rooms.get(data.roomId);
      const player = room && findPlayer(room, socket.id);
      if (!player || room.status !== 'over' || !room.rematchBy || room.rematchBy === player.color) return socket.emit('rematch-unavailable', { roomId: data && data.roomId });
      startRematch(data.roomId, room);
    });
    socket.on('rematch-decline', (data) => {
      const room = data && rooms.get(data.roomId);
      const player = room && findPlayer(room, socket.id);
      if (!player) return;
      // ⚔️ Bahsda keyingi o'yindan voz kechish — bahs shu hisob bilan to'xtatiladi
      if (room.status === 'over' && room.duel && !room.duel.finished && !room.duel.stopped) stopDuel(data.roomId, room);
      if (!room.rematchBy) return;
      room.rematchBy = null;
      const opponent = room.players.find(p => p !== player);
      if (opponent) io.to(opponent.socketId).emit('rematch-declined', { roomId: data.roomId });
    });

    // O'yinga chaqirish
    socket.on('predict-result', async (data, ack) => {
      const reply = (r) => { if (typeof ack === 'function') ack(r); };
      if (isGuest(socket.data.userId)) return reply({ ok: false, reason: 'guest' });
      try {
        const uid = socket.data.userId;
        const roomId = data && typeof data.roomId === 'string' ? data.roomId : null;
        const room = roomId && rooms.get(roomId);
        const pick = data && PREDICT_PICKS.includes(data.pick) ? data.pick : null;
        if (!uid) return reply({ ok: false, reason: 'auth' });
        if (!room || !pick) return reply({ ok: false, reason: 'gone' });
        if (room.players.some(p => p.userId === uid)) return reply({ ok: false, reason: 'player' });
        if (!predictOpen(room)) return reply({ ok: false, reason: 'closed' });
        const ps = predState(room);
        if (ps.result.has(uid)) return reply({ ok: false, reason: 'already' });
        const u = await db.getUserById(uid);
        if (!(await db.addResultPrediction({ roomId, userId: uid, pick, clubCode: u && u.club_code }))) return reply({ ok: false, reason: 'already' });
        ps.result.set(uid, { pick, club: u && u.club_code });
        const odds = await predictOdds(room);
        reply({ ok: true, pick, points: odds[pick] });
        emitPredictStats(roomId, room);
      } catch (err) { console.error('Bashorat xatoligi:', err.message); reply({ ok: false, reason: 'error' }); }
    });
    socket.on('predict-move', (data, ack) => {
      const reply = (r) => { if (typeof ack === 'function') ack(r); };
      if (isGuest(socket.data.userId)) return reply({ ok: false, reason: 'guest' });
      const uid = socket.data.userId;
      const roomId = data && typeof data.roomId === 'string' ? data.roomId : null;
      const room = roomId && rooms.get(roomId);
      if (!uid) return reply({ ok: false, reason: 'auth' });
      if (!room || room.status !== 'active') return reply({ ok: false, reason: 'gone' });
      if (room.players.some(p => p.userId === uid)) return reply({ ok: false, reason: 'player' });
      const ply = room.chess.history().length;
      if (Number(data.ply) !== ply) return reply({ ok: false, reason: 'late' });
      const legal = room.chess.moves({ verbose: true }).find(m => m.from === data.from && m.to === data.to && (!m.promotion || m.promotion === (data.promotion || 'q')));
      if (!legal) return reply({ ok: false, reason: 'illegal' });
      const ps = predState(room);
      if (!ps.guesses.has(ply)) ps.guesses.set(ply, new Map());
      ps.guesses.get(ply).set(uid, legal.san);
      reply({ ok: true, ply, san: legal.san });
    });
    socket.on('page-visibility', (data) => { socket.data.hidden = !!(data && data.hidden); });
    socket.on('rate-opponent', async (data, ack) => {
      const reply = (r) => { if (typeof ack === 'function') ack(r); };
      if (isGuest(socket.data.userId)) return reply({ ok: false, reason: 'guest' });
      try {
        const uid = socket.data.userId;
        const room = data && rooms.get(data.roomId);
        if (!uid || !room || room.status === 'active' || !room.endPayloads) return reply({ ok: false, reason: 'gone' });
        const me = room.players.find(p => p.userId === uid), opp = room.players.find(p => p.userId && p.userId !== uid);
        const ended = me && room.endPayloads[me.color];
        if (!me || !opp || !ended || ended.reason === 'aborted') return reply({ ok: false, reason: 'gone' });
        const ok = await db.addSportRating({ roomId: data.roomId, raterId: uid, ratedId: opp.userId, value: Number(data.value) > 0 ? 1 : -1 });
        reply({ ok, reason: ok ? null : 'already' });
      } catch (err) { console.error('Odob bahosi xatoligi:', err.message); reply({ ok: false, reason: 'error' }); }
    });
    socket.on('tea-enter', () => {
      socket.join('tea');
      socket.emit('tea-seats', { seats: teaList(), online: onlineUsers.size });
      teaGames().then(games => socket.emit('tea-games', { games, online: onlineUsers.size })).catch(() => {});
    });
    socket.on('tea-exit', () => { socket.leave('tea'); });
    socket.on('tea-sit', (data) => { teaSit(socket, data || {}).catch(err => console.error('Choyxona xatoligi:', err)); });
    socket.on('tea-stand', () => { if (socket.data.userId) teaStand(socket.data.userId); });
    socket.on('tea-join', (data) => { teaJoin(socket, data && data.id).catch(err => console.error('Choyxona xatoligi:', err)); });
    // 🔗 Taklif havolasi qabul qilindi: do'st bo'lishadi; taklif qiluvchi onlayn bo'lsa — unga darhol chaqiruv, aks holda bildirishnoma
    socket.on('invite-accept', async (data, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const me = socket.data.userId;
        if (!me) return reply({ ok: false, reason: 'auth' });
        const inviter = await db.getUserByInviteCode(String((data && data.code) || ''));
        if (!inviter) return reply({ ok: false, reason: 'not_found' });
        if (inviter.id === me) return reply({ ok: false, reason: 'self' });
        if (blockedPair(me, inviter.id)) return reply({ ok: false, reason: 'blocked' });
        const friendsNow = isGuest(me) ? false : await db.makeFriends(me, inviter.id);
        const base = { ok: true, inviter: inviter.username, friendsNow };
        if (!userSocket(inviter.id)) {
          notify(inviter.id, 'invite_waiting', { from: socket.data.username }, 'invw:' + me);
          return reply({ ...base, status: 'offline' });
        }
        if (inActiveGame(me)) return reply({ ok: false, reason: 'you_busy' });
        if (inActiveGame(inviter.id)) {
          notify(inviter.id, 'invite_waiting', { from: socket.data.username }, 'invw:' + me);
          return reply({ ...base, status: 'busy' });
        }
        await sendChallenge(socket, { username: inviter.username, initial: data.initial, increment: data.increment, rated: !!data.rated, variant: data.variant }, { invite: true });
        reply({ ...base, status: 'sent' });
      } catch (err) { console.error('Taklif qabul xatoligi:', err); reply({ ok: false, reason: 'error' }); }
    });
    socket.on('challenge-send', (data) => { sendChallenge(socket, data).catch(err => console.error('Challenge xatoligi:', err)); });
    socket.on('challenge-accept', (data) => { acceptChallenge(socket, data && data.id).catch(err => console.error('Challenge accept xatoligi:', err)); });
    socket.on('challenge-decline', (data) => {
      const c = challenges.get(data && data.id);
      if (!c || c.toId !== socket.data.userId) return;
      dropChallenge(c.id);
      io.to(`user_${c.fromId}`).emit('challenge-declined', { id: c.id, by: c.toName });
    });
    socket.on('challenge-cancel', (data) => {
      const c = challenges.get(data && data.id);
      if (!c || c.fromId !== socket.data.userId) return;
      dropChallenge(c.id);
      io.to(`user_${c.toId}`).emit('challenge-cancelled', { id: c.id });
    });
    // Tomosha qilish: tomoshabin faqat watch_<roomId> xonasiga qo'shiladi (o'yin xonasiga emas)
    socket.on('watch-game', async (roomId) => {
      try {
        for (const r of socket.rooms) if (r.startsWith('watch_')) socket.leave(r);
        const room = typeof roomId === 'string' ? rooms.get(roomId) : null;
        if (!room) return socket.emit('watch-state', { roomId, missing: true });
        socket.join('watch_' + roomId);
        emitWatchCount(roomId);
        socket.emit('watch-state', {
          ...(await liveGameInfo(roomId, room)),
          chat: room.spectatorChat || [],
          status: room.status,
          history: room.chess.history({ verbose: true }).map(m => ({ from: m.from, to: m.to, promotion: m.promotion })),
          clockState: clockPayload(room),
          predict: { ...(await predictStats(room)), mine: socket.data.userId && room.pred && room.pred.result.get(socket.data.userId) ? room.pred.result.get(socket.data.userId).pick : null,
            isPlayer: !!(socket.data.userId && room.players.some(p => p.userId === socket.data.userId)) }
        });
      } catch (err) { console.error('Watch xatoligi:', err); }
    });
    socket.on('unwatch-game', () => {
      for (const r of socket.rooms) if (r.startsWith('watch_')) { socket.leave(r); emitWatchCount(r.slice(6)); }
    });
    // Tomoshabinlar chati: faqat tomoshabinlar ko'radi (o'yinchilarga yuborilmaydi), sekundiga 1 ta, 200 belgi
    socket.on('watch-chat', (data) => {
      const roomId = data && typeof data.roomId === 'string' ? data.roomId : null;
      const room = roomId && rooms.get(roomId);
      if (!room || !socket.data.userId || isGuest(socket.data.userId) || !socket.rooms.has('watch_' + roomId)) return;
      if (room.players.some(p => p.userId === socket.data.userId)) return;
      const message = cleanChat(typeof data.message === 'string' ? data.message.trim().slice(0, 200) : '');
      if (!message || mutedUntil(socket.data.userId)) return;
      const now = Date.now();
      if (socket.data.lastWatchChat && now - socket.data.lastWatchChat < 1000) return;
      socket.data.lastWatchChat = now;
      const entry = { username: socket.data.username, message, at: new Date(now).toISOString() };
      room.spectatorChat = (room.spectatorChat || []).concat(entry).slice(-50);
      io.to('watch_' + roomId).emit('watch-chat', { roomId, ...entry });
    });
    // Kechikishni o'lchash: server yuboradi, klient darhol javob beradi (lag-ping interval — pastda)
    socket.on('rtt-probe', (ack) => { if (typeof ack === 'function') ack(); });
    socket.on('disconnecting', () => {
      for (const r of socket.rooms) if (r.startsWith('watch_')) setTimeout(() => emitWatchCount(r.slice(6)), 0);
    });
    // Liga: o'yinchi o'z doska o'yiniga tayyor (ikkalasi tayyor bo'lganda o'yin boshlanadi)
    socket.on('league-ready', (data) => { league.ready(socket, data && data.gameId).catch(err => console.error('Liga ready xatoligi:', err)); });
    socket.on('league-cancel', (data) => { league.cancel(socket, data && data.gameId); });
    socket.on('disconnect', () => {
      // Onlayn holat: oxirgi socket uzilsa — oflayn, oxirgi faollik vaqti yoziladi
      const uid = socket.data.userId;
      const set = uid && onlineUsers.get(uid);
      if (set) {
        set.delete(socket.id);
        if (!set.size) {
          onlineUsers.delete(uid);
          io.emit('presence', { userId: uid, online: false, lastSeen: new Date().toISOString() });
          db.touchUserLastActive(uid).catch(() => {});
        }
      }
      league.socketGone(socket.id);
      teamChess.socketGone(socket);
      teaStand(null, socket.id);
      pruneMatchmakingQueue();
      for (const [roomId, room] of rooms.entries()) {
        const player = findPlayer(room, socket.id);
        if (!player) continue;
        // Davom etayotgan o'yin darhol tugamaydi: o'yinchi RECONNECT_GRACE_MS ichida qaytishi mumkin
        if (room.status === 'active' && player.userId) {
          player.away = true;
          clearTimeout(player.awayTimer);
          player.awayTimer = setTimeout(() => {
            if (!player.away || room.status !== 'active') return;
            const winner = room.chess.history().length < 2 ? null : otherColor(player.color);
            endGame(roomId, room, winner, winner ? 'abandon' : 'aborted');
          }, RECONNECT_GRACE_MS);
          io.to(roomId).emit('opponent-away', { roomId, seconds: Math.round(RECONNECT_GRACE_MS / 1000) });
          continue;
        }
        const wasActive = room.status === 'active';
        handlePlayerLeave(socket, roomId, room);
        if (!wasActive) io.to(roomId).emit('opponent-disconnected');
      }
    });
  });

  setInterval(() => {
    league.tick();
    closeWarSeasons(); closeSportMonths(); closePredictionMonths(); cleanupGuests();
    db.stopStaleDuels(new Date(Date.now() - DUEL_STALE_MS).toISOString()).catch((err) => console.error('Bahslarni tozalash xatoligi:', err.message));
  }, 60 * 60 * 1000);
  setTimeout(cleanupGuests, 60 * 1000);
  setTimeout(() => { closeSportMonths(); closePredictionMonths(); }, 30 * 1000);
  // Davom etayotgan o'yinlardagi o'yinchilarning internet kechikishi (RTT, silliqlangan) — soat kompensatsiyasi uchun
  setInterval(() => {
    for (const room of rooms.values()) {
      if (room.status !== 'active') continue;
      for (const p of room.players) {
        const s = p.socketId && io.sockets.sockets.get(p.socketId);
        if (!s) continue;
        const sentAt = Date.now();
        s.timeout(4000).emit('lag-ping', (err) => {
          if (err) return;
          const rtt = Date.now() - sentAt;
          s.data.rtt = s.data.rtt ? Math.round(s.data.rtt * 0.7 + rtt * 0.3) : rtt;
        });
      }
    }
  }, 4000);

  telegram.init({ app, db, io, SITE_URL, isActive, authMiddleware, inviteUrl: async (userId) => `${SITE_URL}/?invite=${await db.getInviteCode(userId)}` });
  league.init({ db, io, rooms, createGameRoom, scheduleRoomTimer, clockMode, generateRoomId, notify, inActiveGame });
  // Bloklar, banlar va adminlar (ADMIN_USERNAMES="ism1,ism2" — Render env)
  try {
    for (const b of await db.loadAllBlocks()) blocks.add(b.userId + '|' + b.blockedId);
    for (const b of await db.loadBans()) bans.set(b.id, { until: b.until, reason: b.reason || '' });
    for (const id of await db.loadDeletedAccountIds()) deletedUsers.add(id);
    for (const id of await db.listGuestIds()) guestUsers.add(id);
    await initPush();
    for (const m of await db.loadMutes()) if (m.until) mutes.set(m.id, m.until);
    setChatFilter(await db.listChatFilter());
    const admins = adminUsernames();
    if (admins.length) await db.setAdmins(admins);
  } catch (err) { console.error('Blok/ban yuklash xatoligi:', err); }
  // Deploydan oldin davom etayotgan o'yinlar
  try { await restoreActiveGames(); } catch (err) { console.error("O'yinlarni tiklash xatoligi:", err); }
  // Liga: har daqiqalik tekshiruv faqat saytda kimdir faol bo'lsa; aks holda soatlik vazifalar bilan birga — shunda bo'sh
  // paytda (tunda) baza uxlaydi va hisoblash vaqti sarflanmaydi. Muddatlar 48 soatlik, bir soatlik kechikish sezilmaydi.
  setInterval(() => { if (league.CFG.tickMs < 60000 || anyoneActive()) league.tick(); }, league.CFG.tickMs);
  league.tick();

  // 💾 Avtomatik zaxira (GitHub Actions): X-Backup-Token = BACKUP_TOKEN (env); javob shu token bilan shifrlangan
  const backupLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, skip: () => TEST_MODE, message: tooMany });
  app.get('/api/backup', backupLimiter, async (req, res) => {
    const token = process.env.BACKUP_TOKEN;
    if (!token || token.length < 16) return res.status(404).json({ success: false, message: 'Not found' });
    if (!backup.sameToken(req.headers['x-backup-token'], token)) return res.status(403).json({ success: false, message: "Ruxsat yo'q" });
    try {
      const dump = await db.dumpDatabase();
      res.set({ 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${backupName('cdbk')}"`, 'Cache-Control': 'no-store', 'X-Backup-Rows': String(dump.rows) });
      res.send(backup.encrypt(backup.pack(dump), token));
    } catch (err) { console.error('Avtomatik zaxira xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Routelarda ushlanmagan xatolar: jurnalga yoziladi, foydalanuvchiga umumiy javob
  app.use((err, req, res, next) => {
    if (err && (err.type === 'entity.parse.failed' || err.type === 'entity.too.large')) return res.status(err.status || 400).json({ success: false, message: "Noto'g'ri so'rov" });
    errorTracker.capture('server', (err && err.message) || String(err), err && err.stack, { method: req.method, path: req.path });
    console.log('Route xatoligi:', req.method, req.path, err && err.message);
    if (res.headersSent) return next(err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  });

  server.listen(PORT, () => {
    console.log('Server ishga tushdi: http://localhost:' + PORT);
    console.log(db.usePostgres ? 'Baza: PostgreSQL (DATABASE_URL)' : 'Baza: SQLite (database.sqlite)');
  });
}

start().catch(err => { console.error('Server ishga tushishda xatolik:', err); process.exit(1); });

module.exports = { app, server, io };
