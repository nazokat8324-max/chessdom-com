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

const db = require('./database');

const app = express();
const server = http.createServer(app);
const JWT_SECRET = process.env.JWT_SECRET || 'justchess_secret_key_2024';
const PORT = process.env.PORT || 3000;

const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { success: false, message: 'Too many requests, please try again later.' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { success: false, message: 'Too many authentication attempts, please try again later.' } });

const rooms = new Map();
const matchmakingQueue = [];

function generateRoomId() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }

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
    body('username').isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
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
      res.json({ success: true, message: "Muvaffaqiyatli ro'yxatdan o'tdingiz!", user: { id: user.id, username: user.username, email: user.email, rating: user.rating, stats: user.stats }, token });
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
      await db.db.run('UPDATE users SET last_active = ? WHERE id = ?', [new Date().toISOString(), user.id]);
      res.json({ success: true, message: 'Muvaffaqiyatli kirildi!', user: { id: user.id, username: user.username, email: user.email, rating: user.rating, stats: user.stats }, token });
    } catch (err) { console.error('Login xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/auth/logout', authMiddleware, async (req, res) => {
    try { await db.db.run('DELETE FROM sessions WHERE user_id = ?', [req.user.userId]); res.json({ success: true, message: 'Hisobdan chiqildi!' }); }
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

  app.get('/api/users/:username/games', authMiddleware, async (req, res) => {
    try { if (req.user.username !== req.params.username) return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' }); const games = await db.getUserGames(req.user.userId); if (!games) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' }); res.json({ success: true, games }); }
    catch (err) { console.error('Games xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/games', authMiddleware, [
    body('result').isIn(['win', 'loss', 'draw']).withMessage('Invalid result'),
    body('opponent').optional().isLength({ max: 100 }),
    body('mode').optional().isLength({ max: 50 }),
    body('moves').optional().isArray(),
    body('timeControl').optional().isIn(['rapid', 'blitz', 'bullet']).withMessage('Invalid time control')
  ], async (req, res) => {
    try {
      const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
      const { result, opponent, mode, moves, timeControl } = req.body;
      const game = await db.saveGame(req.user.userId, { result, opponent, mode, timeControl, moves });
      const updated = await db.updateUserStats(req.user.userId, result, opponent, mode, moves, timeControl);
      if (!updated) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      res.json({ success: true, game });
    } catch (err) { console.error('Game save xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/ratings/update', authMiddleware, [
    body('result').isIn(['win', 'loss', 'draw']).withMessage('Invalid result'),
    body('opponentRating').optional().isNumeric()
  ], async (req, res) => {
    try {
      const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
      const { result, opponentRating } = req.body;
      const data = await db.updateUserRatingByResult(req.user.userId, result, opponentRating);
      if (!data) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
      res.json(data);
    } catch (err) { console.error('Rating xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/matchmaking/join', authMiddleware, async (req, res) => {
    try {
      const { username, rating } = req.body;
      const userIndex = matchmakingQueue.findIndex(u => u.username === username);
      if (userIndex !== -1) return res.status(400).json({ success: false, message: 'Already in queue' });
      matchmakingQueue.push({ username, rating: rating || 1500, joinedAt: Date.now() });
      if (matchmakingQueue.length >= 2) {
        const player1 = matchmakingQueue.shift();
        const player2 = matchmakingQueue.shift();
        const roomId = generateRoomId();
        rooms.set(roomId, { players: [], gameState: null });
        res.json({ success: true, matched: true, roomId, opponent: player2 });
      } else { res.json({ success: true, matched: false, position: matchmakingQueue.length }); }
    } catch (err) { console.error('Matchmaking xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/matchmaking/leave', authMiddleware, async (req, res) => {
    try { const { username } = req.body; const index = matchmakingQueue.findIndex(u => u.username === username); if (index !== -1) matchmakingQueue.splice(index, 1); res.json({ success: true }); }
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
      const tournamentId = uuidv4();
      const tc = timeControl || (tournamentType === 'arena' ? '5+3' : '5+3');
      const rnds = rounds || (tournamentType === 'team' ? 1 : 7);
      await db.createTournament({ name, description, maxPlayers, creatorId: req.user.userId, clubId, tournamentType, timeControl: tc, rounds: rnds, clubIdA, clubIdB });
      res.json({ success: true, tournamentId, message: 'Turnir yaratildi!' });
    } catch (err) { console.error('Create tournament xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
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
      if (participants.length < 2) return res.status(400).json({ success: false, message: 'Juftlik uchun kamida 2 o\'yinchi kerak!' });
      const { swissPairings } = require('./server-helpers');
      const round = (tournament.current_round || 0) + 1;
      const maxRounds = tournament.rounds || 7;
      if (round > maxRounds) return res.status(400).json({ success: false, message: 'Barcha raundlar o\'ynalib bo\'ldi!' });
      let createdMatches = [];
      if (tournament.tournament_type === 'team') {
        res.status(501).json({ success: false, message: 'Team tournaments not implemented in SQLite mode' }); return;
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

  app.get('/api/friends', authMiddleware, async (req, res) => {
    try { const friendsList = await db.getFriends(req.user.userId); res.json({ success: true, friends: friendsList }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/friends/requests', authMiddleware, async (req, res) => {
    try { const requests = await db.getFriendRequests(req.user.userId); res.json({ success: true, requests }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.get('/api/chat/messages', authMiddleware, async (req, res) => {
    try { const messages = await db.getChatMessages({ userId: req.query.userId, roomId: req.query.roomId }); res.json({ success: true, messages }); }
    catch (err) { console.error('Chat xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  app.post('/api/chat/messages', authMiddleware, [
    body('message').isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters'),
    body('receiverId').optional().isUUID(),
    body('roomId').optional().isLength({ max: 100 })
  ], async (req, res) => {
    try {
      const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
      const { message, receiverId, roomId } = req.body;
      const { id } = await db.sendChatMessage(req.user.userId, receiverId || null, roomId || null, message);
      if (roomId) { io.to(roomId).emit('chat-message', { messageId: id, senderId: req.user.userId, senderName: req.user.username, message, roomId, createdAt: new Date().toISOString() }); }
      else if (receiverId) { io.to(`user_${receiverId}`).emit('chat-message', { messageId: id, senderId: req.user.userId, senderName: req.user.username, message, createdAt: new Date().toISOString() }); }
      res.json({ success: true, messageId: id });
    } catch (err) { res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
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

  app.get('/api/clubs/leaderboard', apiLimiter, async (req, res) => {
    try { const data = await db.getClubLeaderboard(); res.json(data); }
    catch (err) { console.error('Club leaderboard xatoligi:', err); res.status(500).json({ success: false, message: 'Server xatoligi!' }); }
  });

  io.on('connection', (socket) => {
    console.log('Yangi o\'yinchi ulandi:', socket.id);
    socket.on('join-club-room', (clubRoomId) => { socket.join(clubRoomId); console.log(`Klub xonasiga qo'shildi: ${clubRoomId}`); });
    socket.on('join-room', (roomId) => {
      if (!rooms.has(roomId)) { rooms.set(roomId, { players: [], gameState: null }); }
      const room = rooms.get(roomId);
      if (room.players.length >= 2) { socket.emit('error', { message: 'Room is full' }); return; }
      room.players.push(socket.id); socket.join(roomId); socket.emit('room-joined', roomId); socket.to(roomId).emit('opponent-connected');
    });
    socket.on('create-room', () => { const roomId = generateRoomId(); socket.join(roomId); rooms.set(roomId, { players: [socket.id], gameState: null }); socket.emit('room-created', roomId); });
    socket.on('join-random-room', () => {
      const availableRooms = Array.from(rooms.entries()).filter(([id, room]) => room.players.length < 2);
      if (availableRooms.length > 0) { const [roomId, room] = availableRooms[0]; room.players.push(socket.id); socket.join(roomId); socket.emit('room-joined', roomId); socket.to(roomId).emit('opponent-connected'); }
      else { const roomId = generateRoomId(); rooms.set(roomId, { players: [socket.id], gameState: null }); socket.join(roomId); socket.emit('waiting-for-opponent', roomId); }
    });
    socket.on('make-move', (data) => {
      const { roomId, move } = data;
      if (!rooms.has(roomId)) { socket.emit('error', { message: 'Room not found' }); return; }
      const validation = validateMove(move);
      if (!validation.valid) { socket.emit('move-rejected', { error: validation.error }); return; }
      socket.to(roomId).emit('opponent-move', move);
    });
    socket.on('offer-draw', (data) => { socket.to(data.roomId).emit('draw-offered', { roomId: data.roomId }); });
    socket.on('accept-draw', (data) => { socket.to(data.roomId).emit('draw-accepted', { roomId: data.roomId }); });
    socket.on('decline-draw', (data) => { socket.to(data.roomId).emit('draw-declined', { roomId: data.roomId }); });
    socket.on('game-over', (data) => { socket.to(data.roomId).emit('game-ended', data.result); });
    socket.on('leave-room', (roomId) => {
      socket.leave(roomId); socket.to(roomId).emit('opponent-disconnected');
      if (rooms.has(roomId)) { const room = rooms.get(roomId); const index = room.players.indexOf(socket.id); if (index !== -1) { room.players.splice(index, 1); } if (room.players.length === 0) { rooms.delete(roomId); } }
    });
    socket.on('join-tournament-room', (tournamentId) => { socket.join(`tournament_${tournamentId}`); console.log(`O'yinchi ${socket.id} turnir xonasiga qo'shildi: ${tournamentId}`); });
    socket.on('join-chat-room', (roomId) => { socket.join(roomId); console.log(`O'yinchi ${socket.id} chat xonasiga qo'shildi: ${roomId}`); });
    socket.on('send-chat-message', (data) => {
      const { message, roomId, receiverId } = data;
      if (roomId) { io.to(roomId).emit('chat-message', { senderId: socket.id, message, roomId, createdAt: new Date().toISOString() }); }
      else if (receiverId) { io.to(`user_${receiverId}`).emit('chat-message', { senderId: socket.id, message, createdAt: new Date().toISOString() }); }
    });
    socket.on('disconnect', () => {
      console.log('O\'yinchi chiqib ketdi:', socket.id);
      for (const [roomId, room] of rooms.entries()) { const index = room.players.indexOf(socket.id); if (index !== -1) { room.players.splice(index, 1); socket.to(roomId).emit('opponent-disconnected'); if (room.players.length === 0) { rooms.delete(roomId); } break; } }
    });
  });

  setInterval(async () => { await db.closeStaleArenas(); }, 60 * 1000);

  server.listen(PORT, () => {
    console.log('Server ishga tushdi: http://localhost:' + PORT);
    console.log('SQLite bazasi: database.sqlite');
  });
}

start().catch(err => { console.error('Server ishga tushishda xatolik:', err); process.exit(1); });

module.exports = { app, server, io };
