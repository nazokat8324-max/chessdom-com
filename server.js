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
const { Chess } = require('chess.js');

const db = require('./database');
const league = require('./league');
const swiss = require('./swiss');
const mailer = require('./mailer');
const crypto = require('crypto');
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

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
// Express 5 da tanasiz so'rovlarda req.body undefined bo'ladi — routelar uni doim obyekt deb kutadi
app.use((req, res, next) => { if (req.body === undefined) req.body = {}; next(); });
app.use(express.static(__dirname));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { success: false, message: 'Too many requests, please try again later.' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { success: false, message: 'Too many authentication attempts, please try again later.' } });

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

function generateRoomId() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }

function normalizeClock(initial, increment) {
  const base = Number(initial);
  const inc = Number(increment) || 0;
  if (ALLOWED_CLOCKS.some(([b, i]) => b === base && i === inc)) return { initial: base, increment: inc };
  return { initial: 300, increment: 0 };
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

function createGameRoom(white, black, clock, rated) {
  return {
    players: [{ ...white, color: 'w' }, { ...black, color: 'b' }],
    chess: new Chess(),
    clock: { w: clock.initial * 1000, b: clock.initial * 1000, increment: clock.increment, initial: clock.initial },
    mode: clockMode(clock),
    rated: !!rated,
    status: 'active',
    turnStartedAt: null,
    timer: null,
    drawOfferBy: null
  };
}

function clockPayload(room) {
  const running = room.status === 'active' && room.turnStartedAt !== null;
  const clock = { w: room.clock.w, b: room.clock.b };
  // Hozir yurayotgan tomonning o'tgan vaqtini ham hisobga olamiz
  if (running) clock[room.chess.turn()] = Math.max(0, clock[room.chess.turn()] - (Date.now() - room.turnStartedAt));
  return { w: clock.w, b: clock.b, turn: room.chess.turn(), running };
}

function emitClock(roomId, room) { io.to(roomId).emit('clock-update', clockPayload(room)); }

function scheduleRoomTimer(roomId, room) {
  clearTimeout(room.timer);
  if (room.status !== 'active') return;
  const moves = room.chess.history().length;
  if (moves < 2) {
    // Har ikki tomon birinchi yurishini qilmaguncha soat yurmaydi
    room.timer = setTimeout(() => endGame(roomId, room, null, 'aborted'), FIRST_MOVE_TIMEOUT_MS);
    return;
  }
  const side = room.chess.turn();
  room.timer = setTimeout(() => {
    room.clock[side] = 0;
    endGame(roomId, room, otherColor(side), 'timeout');
  }, room.clock[side]);
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
  room.turnStartedAt = null;
  setTimeout(() => { if (rooms.get(roomId) === room) rooms.delete(roomId); }, FINISHED_ROOM_TTL_MS);

  const moves = room.chess.history();
  // O'yinchilar ro'yxati keyinroq o'zgarishi mumkin (chiqib ketish) — natija shu holat bo'yicha yoziladi
  const players = room.players.slice();
  const recorded = reason !== 'aborted' && players.every(p => p.userId);
  const updates = {};
  if (recorded) {
    try {
      // Ikkala o'yinchining o'yindan oldingi reytinglari bilan hisoblaymiz
      const before = {};
      for (const p of players) before[p.color] = await db.getUserById(p.userId);
      for (const p of players) {
        const opp = players.find(o => o.color !== p.color);
        const oppUser = before[opp.color];
        const result = scoreFor(p.color, winnerColor);
        await db.saveGame(p.userId, { result, opponent: opp.username, mode: "Online o'yin", timeControl: room.mode, moves });
        const statsData = await db.updateUserStats(p.userId, result, opp.username, "Online o'yin", moves, room.mode);
        let ratingData = null;
        if (room.rated && oppUser) {
          ratingData = await db.updateUserRatingByResult(p.userId, result, oppUser.rating || 1500, room.mode, oppUser.ratings_by_mode[room.mode]);
        }
        updates[p.color] = {
          stats: statsData && statsData.stats,
          statsByMode: statsData && statsData.statsByMode,
          newRating: ratingData ? ratingData.newRating : (before[p.color] && before[p.color].rating) || 1500,
          ratingsByMode: ratingData ? ratingData.ratingsByMode : (before[p.color] && before[p.color].ratings_by_mode),
          modeChange: ratingData ? ratingData.modeChange : null
        };
      }
    } catch (err) { console.error("O'yin natijasini saqlash xatoligi:", err); }
  }
  // Liga o'yini bo'lsa — natija bahs hisobiga yoziladi
  if (room.leagueGameId) {
    try { await league.recordGameResult(room.leagueGameId, winnerColor, reason); }
    catch (err) { console.error('Liga natijasini yozish xatoligi:', err); }
  }

  // Swiss turnir o'yini bo'lsa — natija turnir jadvaliga yoziladi
  if (room.swissMatch) {
    try { await swiss.recordGameResult(room, winnerColor, reason); }
    catch (err) { console.error('Swiss natijasini yozish xatoligi:', err); }
  }

  room.endedAt = Date.now();
  room.endPayloads = {};
  for (const p of players) {
    clearTimeout(p.awayTimer);
    const payload = {
      roomId, winner: winnerColor, reason, result: scoreFor(p.color, winnerColor),
      rated: room.rated && recorded, mode: room.mode, swiss: room.swissMatch ? { id: room.swissMatch.tournamentId } : null, ...(updates[p.color] || {})
    };
    room.endPayloads[p.color] = payload;
    // O'yin davomida qayta ulangan bo'lsa — yangi socketiga
    const current = room.players.find(x => x.color === p.color) || p;
    io.to(current.socketId).emit('game-ended', payload);
  }
  emitClock(roomId, room);
  io.to('watch_' + roomId).emit('watch-ended', { roomId, winner: winnerColor, reason, clock: clockPayload(room) });
}

// --- O'yinga chaqirish (do'st yoki istalgan o'yinchi) ---
const CHALLENGE_TTL_MS = 60 * 1000;
const challenges = new Map(); // id -> { id, fromId, fromName, toId, toName, clock, rated, timer }

function userSocket(userId) {
  const set = io.sockets.adapter.rooms.get(`user_${userId}`);
  if (!set) return null;
  for (const id of set) { const s = io.sockets.sockets.get(id); if (s && s.connected) return s; }
  return null;
}

function inActiveGame(userId) {
  for (const room of rooms.values()) if (room.status === 'active' && room.players.some(p => p.userId === userId)) return true;
  return false;
}

function dropChallenge(id) {
  const c = challenges.get(id);
  if (c) { clearTimeout(c.timer); challenges.delete(id); }
  return c;
}

async function sendChallenge(socket, data) {
  const fromId = socket.data.userId;
  if (!fromId) return socket.emit('challenge-error', { reason: 'auth' });
  const target = data && data.username ? await db.getUserByUsername(String(data.username)) : null;
  if (!target) return socket.emit('challenge-error', { reason: 'not_found' });
  if (target.id === fromId) return socket.emit('challenge-error', { reason: 'self' });
  if (!userSocket(target.id)) return socket.emit('challenge-error', { reason: 'offline' });
  if (inActiveGame(fromId)) return socket.emit('challenge-error', { reason: 'you_busy' });
  if (inActiveGame(target.id)) return socket.emit('challenge-error', { reason: 'busy' });
  // Bir o'yinchiga bitta faol chaqiruv
  for (const c of challenges.values()) if (c.fromId === fromId) { dropChallenge(c.id); io.to(`user_${c.toId}`).emit('challenge-cancelled', { id: c.id }); }
  const clock = normalizeClock(data.initial, data.increment);
  const me = await db.getUserById(fromId);
  const mode = clockMode(clock);
  const id = uuidv4();
  const c = { id, fromId, fromName: socket.data.username, toId: target.id, toName: target.username, clock, rated: data.rated !== false };
  c.timer = setTimeout(() => {
    if (!dropChallenge(id)) return;
    io.to(`user_${fromId}`).emit('challenge-expired', { id, to: target.username });
    io.to(`user_${target.id}`).emit('challenge-expired', { id });
  }, CHALLENGE_TTL_MS);
  challenges.set(id, c);
  io.to(`user_${target.id}`).emit('challenge-received', {
    id, clock, rated: c.rated, mode, seconds: CHALLENGE_TTL_MS / 1000,
    from: { username: c.fromName, rating: (me && me.ratings_by_mode && me.ratings_by_mode[mode]) || (me && me.rating) || 1500, country: me ? me.country || null : null }
  });
  socket.emit('challenge-sent', { id, to: target.username, clock, rated: c.rated, seconds: CHALLENGE_TTL_MS / 1000 });
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
  const challenger = { socket: fromSocket, user: fromUser }, accepter = { socket, user: toUser };
  const [white, black] = Math.random() < 0.5 ? [challenger, accepter] : [accepter, challenger];
  const roomId = generateRoomId();
  const room = createGameRoom(
    { socketId: white.socket.id, userId: white.user.id, username: white.user.username },
    { socketId: black.socket.id, userId: black.user.id, username: black.user.username },
    c.clock, c.rated
  );
  rooms.set(roomId, room);
  const info = (u) => ({ username: u.username, rating: u.rating || 1500, ratingsByMode: u.ratings_by_mode, country: u.country || null });
  for (const [side, color, opp] of [[white, 'w', black], [black, 'b', white]]) {
    side.socket.join(roomId);
    side.socket.emit('match-found', { roomId, color, opponent: info(opp.user), clock: c.clock, rated: c.rated, mode: room.mode, challenge: true });
  }
  scheduleRoomTimer(roomId, room);
}

// Jonli o'yin haqida ma'lumot (tomosha qilish ro'yxati va tomoshabin uchun)
async function liveGameInfo(roomId, room) {
  const side = async (color) => {
    const p = room.players.find(x => x.color === color);
    const u = p && p.userId ? await db.getUserById(p.userId) : null;
    return {
      username: p ? p.username : '?',
      rating: u ? (Number(u.ratings_by_mode && u.ratings_by_mode[room.mode]) || u.rating || 1500) : 1500,
      country: u ? u.country || null : null
    };
  };
  let kind = 'casual', label = null;
  if (room.swissMatch) {
    kind = 'swiss';
    const t = await db.getTournamentById(room.swissMatch.tournamentId);
    label = t ? t.name : null;
  } else if (room.leagueGameId) {
    kind = 'league';
  }
  return {
    roomId, kind, label, mode: room.mode, rated: room.rated,
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
      drawOffered: room.drawOfferBy === otherColor(player.color),
      opponentAway: !!(opponent && opponent.away),
      opponent: oppUser
        ? { username: oppUser.username, rating: oppUser.rating || 1500, ratingsByMode: oppUser.ratings_by_mode, country: oppUser.country || null }
        : { username: opponent ? opponent.username : '?', rating: 1500 },
      league: room.leagueGameId ? { gameId: room.leagueGameId } : null,
      swiss: room.swissMatch ? { id: room.swissMatch.tournamentId } : null
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

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) { return res.status(401).json({ success: false, message: 'Invalid or expired token' }); }
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

// Yaratuvchisi bor turnirni faqat yaratuvchi, yaratuvchisiz (avtomatik arena) turnirni ishtirokchilar boshqaradi
function canManageTournament(tournament, participants, userId) {
  if (tournament.creator_id) return tournament.creator_id === userId;
  return participants.some(p => p.userId === userId);
}

// Chat xonasi: "user_<sherik id>" → "dm_<id1>_<id2>" (tartiblangan); dm_ xonasini faqat ikki ishtirokchi o'qiydi.
// Ruxsat yo'q bo'lsa null qaytaradi.
function resolveChatRoom(roomId, userId) {
  if (roomId.startsWith('user_')) {
    const partnerId = roomId.slice(5);
    if (!partnerId || partnerId === userId) return null;
    return 'dm_' + [userId, partnerId].sort().join('_');
  }
  if (roomId.startsWith('dm_')) return roomId.slice(3).split('_').includes(userId) ? roomId : null;
  if (rooms.has(roomId)) return null;
  return roomId;
}

function dmPartner(roomId, userId) {
  if (!roomId.startsWith('dm_')) return null;
  return roomId.slice(3).split('_').find(id => id !== userId) || null;
}

// Socket orqali qo'shilish mumkin bo'lgan ochiq xonalar (shaxsiy va o'yin xonalari emas)
function isPublicSocketRoom(roomId) {
  return typeof roomId === 'string' && roomId.length > 0 && roomId.length <= 100
    && !roomId.startsWith('user_') && !roomId.startsWith('dm_') && !rooms.has(roomId);
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

  app.post('/api/auth/register', authLimiter, [
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
      const existing = await db.getUserByUsername(username);
      if (existing) return res.status(409).json({ success: false, message: 'Bu nomli foydalanuvchi mavjud!' });
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await db.createUser({ username, email, passwordHash });
      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ success: true, message: "Muvaffaqiyatli ro'yxatdan o'tdingiz!", user: { id: user.id, username: user.username, email: user.email, rating: user.rating, stats: user.stats, statsByMode: user.statsByMode }, token });
    } catch (err) { console.error('Register xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/auth/login', authLimiter, [
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
      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      await db.touchUserLastActive(user.id);
      res.json({ success: true, message: 'Muvaffaqiyatli kirildi!', user: { id: user.id, username: user.username, email: user.email, rating: user.rating, stats: user.stats, statsByMode: user.stats_by_mode, ratingsByMode: user.ratings_by_mode, country: user.country || null, club: db.userClub(user) }, token });
    } catch (err) { console.error('Login xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/auth/logout', authMiddleware, async (req, res) => {
    try { await db.deleteUserSessions(req.user.userId); res.json({ success: true, message: 'Hisobdan chiqildi!' }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/leaderboard', apiLimiter, async (req, res) => {
    try { const leaderboard = await db.getLeaderboard(); res.json({ success: true, leaderboard }); }
    catch (err) { console.error('Leaderboard xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/daily-winners', apiLimiter, async (req, res) => {
    try { const data = await db.getDailyWinners(); res.json(data); }
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
      res.json({ success: true, profile });
    } catch (err) { console.error('Profile xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/users/:username/games', authMiddleware, async (req, res) => {
    try { if (req.user.username !== req.params.username) return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' }); const games = await db.getUserGames(req.user.userId); if (!games) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' }); res.json({ success: true, games }); }
    catch (err) { console.error('Games xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // O'yin natijasi va reyting klientdan qabul qilinmaydi — ularni server endGame() da yozadi

  // --- Parolni tiklash (email orqali) ---
  const realEmail = (email) => !!email && !/@justchess\.local$/i.test(email);
  const appUrl = (req) => process.env.APP_URL || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}`;

  app.post('/api/auth/forgot', authLimiter, async (req, res) => {
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
        subject: 'ChessDom — parolni tiklash',
        text: `Salom, ${user.username}!\n\nParolingizni tiklash uchun havola (30 daqiqa amal qiladi):\n${link}\n\nAgar siz so'ramagan bo'lsangiz, bu xatni e'tiborsiz qoldiring.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;background:#141b19;color:#e8ece9;border-radius:16px">
          <h2 style="margin:0 0 12px;color:#fff">♞ ChessDom</h2>
          <p>Salom, <b>${escapeHtml(user.username)}</b>!</p>
          <p>Parolingizni tiklash uchun quyidagi tugmani bosing. Havola 30 daqiqa amal qiladi.</p>
          <p style="text-align:center;margin:28px 0"><a href="${link}" style="background:#81b64c;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold">Parolni tiklash</a></p>
          <p style="font-size:12px;color:#8fa29a">Agar siz so'ramagan bo'lsangiz, bu xatni e'tiborsiz qoldiring.</p></div>`
      });
      res.json(sent);
    } catch (err) { console.error('Forgot xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/auth/reset', authLimiter, async (req, res) => {
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
      const rated = req.body.rated !== false;
      pruneMatchmakingQueue();
      if (matchmakingQueue.some(u => u.username === username)) return res.status(400).json({ success: false, message: 'Already in queue' });
      const user = await db.getUserById(req.user.userId);
      // Klient yuborgan davlatni (Sozlamalardan) bazaga ham yozib qo'yamiz
      let myCountry = (user && user.country) || null;
      if (isValidCountry(country) && country !== myCountry) {
        myCountry = country;
        await db.updateUserCountry(req.user.userId, country);
      }
      const me = { userId: req.user.userId, username, rating: (user && user.rating) || 1500, ratingsByMode: user ? user.ratings_by_mode : null, country: myCountry, joinedAt: Date.now(), socketId, clock, rated };
      // Faqat bir xil vaqt nazorati va reyting turini tanlagan o'yinchi bilan juftlanadi
      const waitingIndex = matchmakingQueue.findIndex(u => u.clock.initial === clock.initial && u.clock.increment === clock.increment && u.rated === rated);
      if (waitingIndex === -1) {
        matchmakingQueue.push(me);
        return res.json({ success: true, matched: false, position: matchmakingQueue.length });
      }
      const [waiting] = matchmakingQueue.splice(waitingIndex, 1);
      // Navbatda kutgan o'yinchi oq, yangi kelgan o'yinchi qora bilan o'ynaydi.
      const roomId = generateRoomId();
      const playerInfo = (u) => ({ socketId: u.socketId, userId: u.userId, username: u.username });
      const room = createGameRoom(playerInfo(waiting), playerInfo(me), clock, rated);
      rooms.set(roomId, room);
      const opponentInfo = (u) => ({ username: u.username, rating: u.rating, ratingsByMode: u.ratingsByMode, country: u.country });
      for (const [player, opponent, color] of [[waiting, me, 'w'], [me, waiting, 'b']]) {
        const s = io.sockets.sockets.get(player.socketId);
        if (s) s.join(roomId);
        io.to(player.socketId).emit('match-found', { roomId, color, opponent: opponentInfo(opponent), clock, rated, mode: room.mode });
      }
      scheduleRoomTimer(roomId, room);
      res.json({ success: true, matched: true, roomId, color: 'b', opponent: opponentInfo(waiting) });
    } catch (err) { console.error('Matchmaking xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/matchmaking/leave', authMiddleware, async (req, res) => {
    try { const index = matchmakingQueue.findIndex(u => u.username === req.user.username); if (index !== -1) matchmakingQueue.splice(index, 1); res.json({ success: true }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/tournaments', authMiddleware, [
    body('name').isLength({ min: 3, max: 255 }).withMessage('Tournament name must be 3-255 characters'),
    body('tournamentType').optional().isIn(['arena', 'individual', 'team']),
    body('timeControl').optional().isLength({ max: 20 }),
    body('maxPlayers').optional().isInt({ min: 2, max: 64 }),
    body('rounds').optional().isInt({ min: 1, max: 20 }),
    body('clubId').optional().isLength({ max: 100 }),
    body('clubIdA').optional().isLength({ max: 100 }),
    body('clubIdB').optional().isLength({ max: 100 })
  ], async (req, res) => {
    try {
      const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
      const { name, description, maxPlayers, clubId, tournamentType, timeControl, rounds, clubIdA, clubIdB } = req.body;
      const tc = timeControl || '5+3';
      const rnds = rounds || (tournamentType === 'team' ? 1 : 7);
      const created = await db.createTournament({ name, description, maxPlayers, creatorId: req.user.userId, clubId, tournamentType, timeControl: tc, rounds: rnds, clubIdA, clubIdB });
      res.json({ success: true, tournamentId: created.id, message: 'Turnir yaratildi!' });
    } catch (err) { console.error('Create tournament xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/tournaments/arenas', apiLimiter, async (req, res) => {
    try {
      const { getArenaSchedule, getCurrentArenaSlot } = require('./server-helpers');
      const now = new Date();
      const slot = getCurrentArenaSlot(now);
      const currentArena = await db.ensureCurrentArena(slot);
      const timeUntilNext = Math.max(0, new Date(slot.slotEnd).getTime() - now.getTime());
      res.json({ success: true, currentArena, timeControl: slot, timeUntilNext, schedule: getArenaSchedule(now) });
    } catch (err) { console.error('Arenas xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Swiss turnirlari (swiss.js)
  const optionalUserId = (req) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    try { return jwt.verify(auth.slice(7), JWT_SECRET).userId; } catch (e) { return null; }
  };

  app.get('/api/swiss', async (req, res) => {
    try { res.json({ success: true, ...(await swiss.overview(optionalUserId(req))) }); }
    catch (err) { console.error('Swiss xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/swiss/:id', async (req, res) => {
    try {
      const data = await swiss.detail(req.params.id, optionalUserId(req));
      if (!data) return res.status(404).json({ success: false, message: 'Turnir topilmadi!' });
      res.json({ success: true, ...data });
    } catch (err) { console.error('Swiss tafsiloti xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/swiss/:id/join', authMiddleware, async (req, res) => {
    try { res.json(await swiss.join(req.params.id, req.user.userId)); }
    catch (err) { console.error('Swiss join xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/swiss/:id/leave', authMiddleware, async (req, res) => {
    try { res.json(await swiss.leave(req.params.id, req.user.userId)); }
    catch (err) { console.error('Swiss leave xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Jonli o'yinlar: hozir davom etayotgan barcha o'yinlar (tomosha qilish uchun)
  app.get('/api/games/live', async (req, res) => {
    try {
      const games = [];
      for (const [roomId, room] of rooms.entries()) {
        if (room.status === 'active' && room.players.length === 2) games.push(await liveGameInfo(roomId, room));
      }
      const weight = { swiss: 0, league: 1, casual: 2 };
      games.sort((a, b) => weight[a.kind] - weight[b.kind] || (b.white.rating + b.black.rating) - (a.white.rating + a.black.rating));
      res.json({ success: true, games: games.slice(0, 60) });
    } catch (err) { console.error('Jonli o\'yinlar xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/tournaments', apiLimiter, async (req, res) => {
    try { const clubId = req.query.clubId; const type = req.query.type; const tournaments = await db.getTournaments({ type }); res.json({ success: true, tournaments }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/tournaments/:id', async (req, res) => {
    try { const tournament = await db.getTournamentById(req.params.id); if (!tournament) return res.status(404).json({ success: false, message: 'Turnir topilmadi!' }); res.json({ success: true, tournament }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/tournaments/:id/join', authMiddleware, async (req, res) => {
    try {
      const result = await db.tournamentJoin(req.params.id, req.user.userId, req.body.club);
      if (result.success) { io.to(`tournament_${req.params.id}`).emit('tournament-joined', { tournamentId: req.params.id, userId: req.user.userId }); }
      res.json(result);
    } catch (err) { console.error('Join tournament xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/tournaments/:id/start', authMiddleware, async (req, res) => {
    try { const result = await db.tournamentStart(req.params.id, req.user.userId); if (result.success) { io.to(`tournament_${req.params.id}`).emit('tournament-started', { tournamentId: req.params.id }); } res.json(result); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/tournaments/:id/standings', async (req, res) => {
    try {
      const { id } = req.params;
      const tournament = await db.getTournamentById(id);
      if (!tournament) return res.status(404).json({ success: false, message: 'Turnir topilmadi!' });
      const standings = await db.getTournamentStandings(id);
      res.json({ success: true, standings });
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/tournaments/:id/matches', async (req, res) => {
    try { const matches = await db.getTournamentMatches(req.params.id, req.query.round ? parseInt(req.query.round) : undefined); res.json({ success: true, matches }); }
    catch (err) { console.error('Tournament matches xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/tournaments/:id/participants', async (req, res) => {
    try { const participants = await db.getTournamentParticipants(req.params.id); res.json({ success: true, participants }); }
    catch (err) { console.error('Tournament participants xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/tournaments/:id/matches', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params; const { matches } = req.body;
      const tournament = await db.getTournamentById(id);
      if (!tournament) return res.status(404).json({ success: false, message: 'Turnir topilmadi!' });
      if (tournament.creator_id !== req.user.userId) return res.status(403).json({ success: false, message: 'Faqat turnir yaratuvchisi o\'yinlarni qo\'sha oladi!' });
      if (!Array.isArray(matches) || matches.length === 0) return res.status(400).json({ success: false, message: 'O\'yinlar ro\'yxati kerak!' });
      const saved = [];
      for (const m of matches) { await db.saveTournamentMatch(m); saved.push(m); }
      res.json({ success: true, matches: saved });
    } catch (err) { console.error('Match saqlash xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/tournaments/:id/pairings', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const tournament = await db.getTournamentById(id);
      if (!tournament) return res.status(404).json({ success: false, message: 'Turnir topilmadi!' });
      const participants = await db.getTournamentParticipants(id);
      if (!canManageTournament(tournament, participants, req.user.userId)) return res.status(403).json({ success: false, message: 'Faqat turnir yaratuvchisi yoki ishtirokchilari juftlik yarata oladi!' });
      if (participants.length < 2) return res.status(400).json({ success: false, message: 'Juftlik uchun kamida 2 o\'yinchi kerak!' });
      const { swissPairings } = require('./server-helpers');
      const round = (tournament.current_round || 0) + 1;
      const maxRounds = tournament.rounds || 7;
      if (round > maxRounds) return res.status(400).json({ success: false, message: 'Barcha raundlar o\'ynalib bo\'ldi!' });
      let createdMatches = [];
      if (tournament.tournament_type === 'team') {
        res.status(501).json({ success: false, message: "Jamoaviy turnirlar hali qo'llab-quvvatlanmaydi!" }); return;
      } else {
        const pairings = swissPairings(participants, round);
        for (const p of pairings) {
          const matchId = uuidv4();
          const match = { id: matchId, tournamentId: id, round, player1Id: p.player1Id, player2Id: p.player2Id || null, winnerId: null, status: p.bye ? 'bye' : 'active' };
          await db.saveTournamentMatch(match);
          if (p.bye) await db.addParticipantScore(id, p.player1Id, 1, null);
          createdMatches.push(match);
        }
      }
      await db.updateTournamentRound(id, round, round >= maxRounds ? 'completed' : 'active');
      io.to(`tournament_${id}`).emit('tournament-pairings', { tournamentId: id, round, pairings: createdMatches });
      res.json({ success: true, round, pairings: createdMatches });
    } catch (err) { console.error('Pairings xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/tournaments/:id/matches/:matchId/result', authMiddleware, async (req, res) => {
    try {
      const { id, matchId } = req.params;
      const { result } = req.body;
      if (!['white', 'black', 'draw'].includes(result)) return res.status(400).json({ success: false, message: 'Noto\'g\'ri natija turi!' });
      const tournament = await db.getTournamentById(id);
      if (!tournament) return res.status(404).json({ success: false, message: 'Turnir topilmadi!' });
      const matches = await db.getTournamentMatches(id);
      const match = matches.find(m => m.id === matchId);
      if (!match) return res.status(404).json({ success: false, message: 'O\'yin topilmadi!' });
      if (match.status === 'completed' || match.status === 'bye') return res.status(400).json({ success: false, message: 'O\'yin allaqachon yakunlangan!' });
      // Natijani faqat turnir yaratuvchisi yoki shu o'yinning o'yinchilari kiritadi
      const isMatchPlayer = [match.player1Id, match.player2Id].includes(req.user.userId);
      if (tournament.creator_id !== req.user.userId && !isMatchPlayer) return res.status(403).json({ success: false, message: 'Bu o\'yin natijasini kiritishga ruxsatingiz yo\'q!' });
      let winnerId = null;
      if (match.player1Id && match.player2Id) {
        if (result === 'white') winnerId = match.player1Id;
        else if (result === 'black') winnerId = match.player2Id;
        await db.saveTournamentMatch({ ...match, winnerId, status: 'completed', completedAt: new Date().toISOString() });
        if (result === 'draw') {
          await db.addParticipantScore(id, match.player1Id, 0.5, match.player2Id);
          await db.addParticipantScore(id, match.player2Id, 0.5, match.player1Id);
          await db.updateUserStats(match.player1Id, 'draw', tournament.name, 'Tournament');
          await db.updateUserStats(match.player2Id, 'draw', tournament.name, 'Tournament');
        } else {
          const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;
          await db.addParticipantScore(id, winnerId, 1, loserId);
          if (loserId) await db.addParticipantScore(id, loserId, 0, winnerId);
          await db.updateUserStats(winnerId, 'win', tournament.name, 'Tournament');
          if (loserId) await db.updateUserStats(loserId, 'loss', tournament.name, 'Tournament');
        }
      }
      io.to(`tournament_${id}`).emit('tournament-match-result', { tournamentId: id, matchId, result, winnerId });
      res.json({ success: true, message: 'Natija saqlandi!', winnerId });
    } catch (err) { console.error('Match result xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/friends/request', authMiddleware, async (req, res) => {
    try {
      const { username } = req.body;
      const receiver = await db.getUserByUsername(username);
      if (!receiver) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      if (receiver.id === req.user.userId) return res.status(400).json({ success: false, message: 'O\'zingizga do\'stlik so\'rovini yuborib bo\'lmaydi!' });
      const result = await db.sendFriendRequest(req.user.userId, receiver.id);
      if (result.success) { io.to(`user_${receiver.id}`).emit('friend-request-received', { senderId: req.user.userId, senderName: req.user.username }); }
      res.json(result);
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/friends/accept', authMiddleware, async (req, res) => {
    try { const { requestId } = req.body; const result = await db.acceptFriendRequest(requestId, req.user.userId); res.json(result); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/friends/decline', authMiddleware, async (req, res) => {
    try { const { requestId } = req.body; const result = await db.declineFriendRequest(requestId, req.user.userId); res.json(result); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/friends', authMiddleware, async (req, res) => {
    try { const friendsList = await db.getFriends(req.user.userId); res.json({ success: true, friends: friendsList }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/friends/requests', authMiddleware, async (req, res) => {
    try { const requests = await db.getFriendRequests(req.user.userId); res.json({ success: true, requests }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  // Shaxsiy xabarlar: suhbatlar ro'yxati, o'qilmaganlar soni, "o'qildi" belgisi
  app.get('/api/messages/conversations', authMiddleware, async (req, res) => {
    try { res.json({ success: true, conversations: await db.getConversations(req.user.userId) }); }
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
      if (req.query.roomId && !roomId) return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' });
      const messages = await db.getChatMessages({ roomId });
      res.json({ success: true, messages });
    }
    catch (err) { console.error('Chat xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/chat/messages', authMiddleware, [
    body('message').isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters'),
    body('receiverId').optional({ values: 'null' }).isUUID(),
    body('roomId').optional({ values: 'null' }).isLength({ max: 100 })
  ], async (req, res) => {
    try {
      const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
      const { message } = req.body;
      // Shaxsiy xabar: "user_<id>" yoki receiverId → ikki tomon uchun umumiy dm_ xonasi
      const requested = req.body.roomId || (req.body.receiverId ? `user_${req.body.receiverId}` : null);
      const roomId = requested ? resolveChatRoom(String(requested), req.user.userId) : null;
      if (requested && !roomId) return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' });
      // Klub chati (club_<davlat>): o'qish hammaga, yozish faqat shu klub a'zolariga
      if (roomId && roomId.startsWith('club_')) {
        const me = await db.getUserById(req.user.userId);
        if (!me || me.club_country !== roomId.slice(5)) return res.status(403).json({ success: false, message: "Klub chatiga faqat klub a'zolari yozishi mumkin!" });
      }
      const partnerId = roomId ? dmPartner(roomId, req.user.userId) : null;
      if (partnerId && !(await db.getUserById(partnerId))) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      const { id } = await db.sendChatMessage(req.user.userId, partnerId, roomId, message);
      const payload = { messageId: id, senderId: req.user.userId, senderName: req.user.username, message, roomId, createdAt: new Date().toISOString() };
      if (partnerId) io.to(`user_${partnerId}`).to(`user_${req.user.userId}`).emit('chat-message', payload);
      else if (roomId) io.to(roomId).emit('chat-message', payload);
      else io.emit('chat-message', payload);
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
    try { res.json({ success: true, clubs: await db.getCountryClubSummary() }); }
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
      const club = await db.setUserCountryClub(req.user.userId, country, code);
      res.json({ success: true, club, previous: current });
    } catch (err) { console.error('Country club join xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/country-clubs/leave', authMiddleware, async (req, res) => {
    try { await db.clearUserCountryClub(req.user.userId); res.json({ success: true, club: null }); }
    catch (err) { console.error('Country club leave xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/clubs', authMiddleware, [
    body('name').isLength({ min: 3, max: 255 }).withMessage('Club name must be 3-255 characters'),
    body('description').optional().isLength({ max: 1000 }),
    body('icon').optional().isLength({ max: 10 })
  ], async (req, res) => {
    try {
      const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
      const { name, description, icon } = req.body;
      const club = await db.createClub({ name, description, icon, creatorId: req.user.userId });
      res.json({ success: true, clubId: club.id, message: 'Klub yaratildi!' });
    } catch (err) { console.error('Create club xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/clubs', apiLimiter, async (req, res) => {
    try { const clubs = await db.getClubs(); res.json({ success: true, clubs }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/clubs/leaderboard', apiLimiter, async (req, res) => {
    try { const data = await db.getClubLeaderboard(); res.json(data); }
    catch (err) { console.error('Club leaderboard xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/clubs/:id', async (req, res) => {
    try { const club = await db.getClubById(req.params.id); if (!club) return res.status(404).json({ success: false, message: 'Klub topilmadi!' }); res.json({ success: true, club }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/clubs/:id/join', authMiddleware, async (req, res) => {
    try { const result = await db.joinClub(req.params.id, req.user.userId); res.json(result); }
    catch (err) { console.error('Club join xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/clubs/:id/members', async (req, res) => {
    try { const members = await db.getClubMembers(req.params.id); res.json({ success: true, members }); }
    catch (err) { console.error('Club members xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  io.on('connection', (socket) => {
    // Ochiq sahifalar yangi deployni sezishi uchun
    socket.emit('app-version', APP_VERSION);
    console.log('Yangi o\'yinchi ulandi:', socket.id);
    // Shaxsiy xabarlar (do'stlik so'rovi, chat) uchun user_<id> xonasiga qo'shish
    socket.on('authenticate', (token) => {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.data.userId = decoded.userId;
        socket.data.username = decoded.username;
        socket.join(`user_${decoded.userId}`);
        resumeGames(socket).catch(err => console.error("O'yinni tiklash xatoligi:", err));
      } catch (err) { socket.emit('auth-error', { message: 'Invalid or expired token' }); }
    });
    socket.on('join-club-room', (clubRoomId) => { if (isPublicSocketRoom(clubRoomId)) socket.join(clubRoomId); });
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
      // Soat: yurgan tomonning o'tgan vaqtini ayiramiz; vaqti tugagan bo'lsa yurish qabul qilinmaydi
      const now = Date.now();
      if (room.turnStartedAt !== null) {
        room.clock[player.color] -= now - room.turnStartedAt;
        if (room.clock[player.color] <= 0) {
          room.clock[player.color] = 0;
          socket.emit('move-rejected', { reason: 'game_over', error: 'Time is up' });
          endGame(roomId, room, otherColor(player.color), 'timeout');
          return;
        }
      }
      // Qonun-qoidaga zid yurish rad etiladi (chess.js serverda ham tekshiradi)
      const result = room.chess.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
      if (!result) { socket.emit('move-rejected', { reason: 'invalid_move', error: 'Illegal move' }); return; }
      if (room.turnStartedAt !== null) room.clock[player.color] += room.clock.increment * 1000;
      room.drawOfferBy = null;
      room.turnStartedAt = room.chess.history().length >= 2 ? now : null;
      socket.to(roomId).emit('opponent-move', { from: result.from, to: result.to, promotion: result.promotion });
      const watchMove = { roomId, move: { from: result.from, to: result.to, promotion: result.promotion } };
      if (room.chess.game_over()) {
        const chess = room.chess;
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
    socket.on('join-tournament-room', (tournamentId) => { socket.join(`tournament_${tournamentId}`); });
    // O'yinga chaqirish
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
        socket.emit('watch-state', {
          ...(await liveGameInfo(roomId, room)),
          status: room.status,
          history: room.chess.history({ verbose: true }).map(m => ({ from: m.from, to: m.to, promotion: m.promotion })),
          clockState: clockPayload(room)
        });
      } catch (err) { console.error('Watch xatoligi:', err); }
    });
    socket.on('unwatch-game', () => { for (const r of socket.rooms) if (r.startsWith('watch_')) socket.leave(r); });
    socket.on('join-chat-room', (roomId) => { if (isPublicSocketRoom(roomId)) socket.join(roomId); });
    socket.on('send-chat-message', (data) => {
      if (!socket.data.userId || !data) return;
      const message = typeof data.message === 'string' ? data.message.slice(0, 1000) : '';
      if (!message) return;
      const payload = { senderId: socket.data.userId, senderName: socket.data.username, message, createdAt: new Date().toISOString() };
      if (data.roomId && isPublicSocketRoom(data.roomId)) io.to(data.roomId).emit('chat-message', { ...payload, roomId: data.roomId });
      else if (data.receiverId) io.to(`user_${data.receiverId}`).emit('chat-message', payload);
    });
    // Liga: o'yinchi o'z doska o'yiniga tayyor (ikkalasi tayyor bo'lganda o'yin boshlanadi)
    socket.on('league-ready', (data) => { league.ready(socket, data && data.gameId).catch(err => console.error('Liga ready xatoligi:', err)); });
    socket.on('league-cancel', (data) => { league.cancel(socket, data && data.gameId); });
    socket.on('disconnect', () => {
      league.socketGone(socket.id);
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

  setInterval(async () => { await db.closeStaleArenas(); }, 60 * 1000);

  league.init({ db, io, rooms, createGameRoom, scheduleRoomTimer, clockMode, generateRoomId });
  swiss.init({ db, io, rooms, createGameRoom, scheduleRoomTimer, generateRoomId });
  setInterval(swiss.tick, swiss.CFG.tickMs);
  swiss.tick();
  setInterval(league.tick, league.CFG.tickMs);
  league.tick();

  server.listen(PORT, () => {
    console.log('Server ishga tushdi: http://localhost:' + PORT);
    console.log(db.usePostgres ? 'Baza: PostgreSQL (DATABASE_URL)' : 'Baza: SQLite (database.sqlite)');
  });
}

start().catch(err => { console.error('Server ishga tushishda xatolik:', err); process.exit(1); });

module.exports = { app, server, io };
