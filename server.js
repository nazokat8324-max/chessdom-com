const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { body, validationResult } = require('express-validator');

const app = express();
const server = http.createServer(app);

const JWT_SECRET = process.env.JWT_SECRET || 'justchess_secret_key_2024';
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/justchess',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

let useDatabase = true;

pool.on('error', (err) => {
  console.error('PostgreSQL xatoligi:', err.message);
  useDatabase = false;
});

pool.on('connect', () => {
  console.log('PostgreSQL bazasiga ulandi');
});

async function checkDatabaseConnection() {
  try {
    await pool.query('SELECT 1');
    useDatabase = true;
    console.log('PostgreSQL ishlayapti');
  } catch (err) {
    console.log('PostgreSQL ulanmadi, localStorage/JSON rejimida ishlayapmiz');
    useDatabase = false;
  }
}

checkDatabaseConnection();

async function ensureDataDir() {
  const fs = require('fs');
  const path = require('path');
  const DATA_DIR = path.join(__dirname, 'data');
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  return DATA_DIR;
}

async function readJsonFile(filename, defaultValue) {
  const fs = require('fs');
  const path = require('path');
  const DATA_DIR = await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Fayl o'qishda xatolik: ${filename}`, err);
  }
  return defaultValue;
}

async function writeJsonFile(filename, data) {
  const fs = require('fs');
  const path = require('path');
  const DATA_DIR = await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Fayl yozishda xatolik: ${filename}`, err);
  }
}
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com",
          "https://cdn.jsdelivr.net/npm/chart.js",
          "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js",
          "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js",
          "https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.js",
          "https://cdn.socket.io/4.7.2/socket.io.min.js",
          "https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js",
          "https://cdn.jsdelivr.net/npm/i18next@23.11.5/dist/umd/i18next.min.js",
          "https://code.jquery.com",
          "https://cdn.jsdelivr.net/npm/howler@2.2.4/dist/howler.min.js",
          "https://cdn.jsdelivr.net/npm/peerjs@1.5.2/dist/peerjs.min.js",
          "https://*.peerjs.org",
          "https://0.peerjs.com"
        ],
        scriptSrcAttr: ["'self'", "'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com"
        ],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: [
          "'self'",
          "http://localhost:*",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com",
          "https://0.peerjs.com",
          "https://*.peerjs.org",
          "wss://*.peerjs.org",
          "wss://0.peerjs.com",
          "ws://localhost:*",
          "http://localhost:*",
          "https://lichess.org",
          "https://*.lichess.org",
          "https://lichess1.org",
          "https://*.lichess1.org",
          "https://*.internetchess.org",
          "https://cdn.socket.io"
        ],
        fontSrc: ["'self'", "data:", "https:", "fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "data:", "https:", "blob:"],
        frameSrc: ["'self'", "https://*.peerjs.org"],
        workerSrc: ["'self'", "blob:"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false
  })
);
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' }
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

async function initRedis() {
  try {
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await redisClient.connect();
    io.adapter(createAdapter(redisClient, redisClient.duplicate()));
    console.log('Redis adapter ulandi');
  } catch (err) {
    console.log('Redis ulanmadi, oddiy rejimda ishlayapmiz:', err.message);
  }
}

initRedis();

const rooms = new Map();
const matchmakingQueue = [];

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function getUserByUsername(username) {
  if (!useDatabase) {
    const users = await readJsonFile('users.json', []);
    return users.find(u => u.username === username);
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
  } catch (err) {
    console.error('getUserByUsername xatoligi:', err.message);
    const users = await readJsonFile('users.json', []);
    return users.find(u => u.username === username);
  }
}

async function getUserById(id) {
  if (!useDatabase) {
    const users = await readJsonFile('users.json', []);
    return users.find(u => u.id === id);
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  } catch (err) {
    console.error('getUserById xatoligi:', err.message);
    const users = await readJsonFile('users.json', []);
    return users.find(u => u.id === id);
  }
}

async function createUser(user) {
  if (!useDatabase) {
    const users = await readJsonFile('users.json', []);
    const newUser = {
      id: require('uuid').v4(),
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      rating: user.rating || 1500,
      stats: user.stats || { wins: 0, losses: 0, draws: 0 },
      history: user.history || [],
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    await writeJsonFile('users.json', users);
    return newUser;
  }
  const result = await pool.query(
    'INSERT INTO users (username, email, password_hash, rating, stats, history) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, rating, stats, history, created_at',
    [user.username, user.email, user.passwordHash, user.rating || 1500, JSON.stringify(user.stats || { wins: 0, losses: 0, draws: 0 }), JSON.stringify(user.history || [])]
  );
  return result.rows[0];
}

async function updateUserStats(userId, result, opponent, mode, moves) {
  const user = await getUserById(userId);
  if (!user) return null;
  
  const stats = user.stats || { wins: 0, losses: 0, draws: 0 };
  if (result === 'win') stats.wins++;
  else if (result === 'loss') stats.losses++;
  else stats.draws++;
  
  const history = user.history || [];
  history.push({
    id: require('uuid').v4(),
    date: new Date().toLocaleDateString(),
    timestamp: new Date().toISOString(),
    result: result,
    opponent: opponent || 'Lokal',
    mode: mode || 'Lokal o\'yin',
    moves: moves || []
  });
  
  if (useDatabase) {
    await pool.query(
      'UPDATE users SET stats = $1, history = $2, last_active = $3 WHERE id = $4',
      [JSON.stringify(stats), JSON.stringify(history), new Date().toISOString(), userId]
    );
  } else {
    const users = await readJsonFile('users.json', []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx].stats = stats;
      users[idx].history = history;
      users[idx].last_active = new Date().toISOString();
      await writeJsonFile('users.json', users);
    }
  }
  
  return { stats, history };
}

async function updateUserRating(userId, newRating) {
  if (useDatabase) {
    await pool.query('UPDATE users SET rating = $1 WHERE id = $2', [newRating, userId]);
  } else {
    const users = await readJsonFile('users.json', []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx].rating = newRating;
      await writeJsonFile('users.json', users);
    }
  }
}

function validateMove(move) {
  if (!move || typeof move !== 'object') {
    return { valid: false, error: 'Invalid move format' };
  }
  
  const { from, to, promotion } = move;
  
  if (!from || !to) {
    return { valid: false, error: 'Missing from or to square' };
  }
  
  if (from === to) {
    return { valid: false, error: 'Cannot move to same square' };
  }
  
  const validSquares = ['a1','a2','a3','a4','a5','a6','a7','a8',
                        'b1','b2','b3','b4','b5','b6','b7','b8',
                        'c1','c2','c3','c4','c5','c6','c7','c8',
                        'd1','d2','d3','d4','d5','d6','d7','d8',
                        'e1','e2','e3','e4','e5','e6','e7','e8',
                        'f1','f2','f3','f4','f5','f6','f7','f8',
                        'g1','g2','g3','g4','g5','g6','g7','g8',
                        'h1','h2','h3','h4','h5','h6','h7','h8'];
  
  if (!validSquares.includes(from) || !validSquares.includes(to)) {
    return { valid: false, error: 'Invalid square notation' };
  }
  
  if (promotion && !['q','r','b','n'].includes(promotion)) {
    return { valid: false, error: 'Invalid promotion piece' };
  }
  
  return { valid: true };
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

app.post('/api/auth/register', authLimiter, [
  body('username').isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    
    const { username, email, password } = req.body;
    
    if (useDatabase) {
      const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Bu nomli foydalanuvchi mavjud!' });
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      const result = await pool.query(
        'INSERT INTO users (username, email, password_hash, rating, stats, history) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, rating, stats, history, created_at',
        [username, email, passwordHash, 1500, JSON.stringify({ wins: 0, losses: 0, draws: 0 }), JSON.stringify([])]
      );
      
      const user = result.rows[0];
      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      
      res.json({ 
        success: true, 
        message: 'Muvaffaqiyatli ro\'yxatdan o\'tdingiz!', 
        user: { id: user.id, username: user.username, email: user.email, rating: user.rating, stats: user.stats },
        token 
      });
    } else {
      const users = await readJsonFile('users.json', []);
      if (users.some(u => u.username === username)) {
        return res.status(409).json({ success: false, message: 'Bu nomli foydalanuvchi mavjud!' });
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = {
        id: require('uuid').v4(),
        username,
        email,
        passwordHash,
        rating: 1500,
        stats: { wins: 0, losses: 0, draws: 0 },
        history: [],
        createdAt: new Date().toISOString()
      };
      
      users.push(newUser);
      await writeJsonFile('users.json', users);
      
      const { passwordHash: _, ...userWithoutHash } = newUser;
      res.json({ success: true, message: 'Muvaffaqiyatli ro\'yxatdan o\'tdingiz!', user: userWithoutHash, token: null });
    }
  } catch (err) {
    console.error('Register xatoligi:', err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.post('/api/auth/login', authLimiter, [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    
    const { username, password } = req.body;
    const user = await getUserByUsername(username);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Ism yoki parol xato!' });
    }
    
    const valid = await bcrypt.compare(password, user.password_hash || user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Ism yoki parol xato!' });
    }
    
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    
    if (useDatabase) {
      await pool.query('UPDATE users SET last_active = $1 WHERE id = $2', [new Date().toISOString(), user.id]);
    }
    
    res.json({ 
      success: true, 
      message: 'Muvaffaqiyatli kirildi!', 
      user: { id: user.id, username: user.username, email: user.email, rating: user.rating, stats: user.stats },
      token 
    });
  } catch (err) {
    console.error('Login xatoligi:', err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  try {
    if (useDatabase) {
      await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.user.userId]);
    }
    res.json({ success: true, message: 'Hisobdan chiqildi!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    let users = [];
    if (useDatabase) {
      const result = await pool.query('SELECT username, rating, stats FROM users ORDER BY rating DESC LIMIT 100');
      users = result.rows;
    } else {
      users = await readJsonFile('users.json', []);
    }
    const leaderboard = users.map(u => ({
      username: u.username,
      wins: parseInt(u.stats?.wins) || 0,
      losses: parseInt(u.stats?.losses) || 0,
      draws: parseInt(u.stats?.draws) || 0,
      rating: u.rating || 1500
    })).sort((a, b) => (b.rating || 0) - (a.rating || 0));
    res.json({ success: true, leaderboard });
  } catch (err) {
    console.error('Leaderboard xatoligi:', err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.get('/api/daily-winners', async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let users = [];
    if (useDatabase) {
      const result = await pool.query('SELECT username, stats, history FROM users');
      users = result.rows;
    } else {
      users = await readJsonFile('users.json', []);
    }

    const dailyWins = users.map(u => {
      const history = u.history || [];
      const wins = history.filter(game => {
        if (game.result !== 'win') return false;
        const ts = game.timestamp || game.date;
        if (!ts) return false;
        const gameDate = new Date(ts);
        return !isNaN(gameDate.getTime()) && gameDate >= cutoff;
      }).length;
      return { username: u.username, dailyWins: wins };
    }).filter(u => u.dailyWins > 0)
      .sort((a, b) => b.dailyWins - a.dailyWins)
      .slice(0, 5);

    res.json({ success: true, winners: dailyWins });
  } catch (err) {
    console.error('Daily winners xatoligi:', err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.get('/api/stats/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await getUserByUsername(username);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
    }
    
    res.json({ 
      success: true, 
      stats: user.stats || { wins: 0, losses: 0, draws: 0 }, 
      rating: user.rating || 1500 
    });
  } catch (err) {
    console.error('Stats xatoligi:', err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.get('/api/users/:username/games', authMiddleware, async (req, res) => {
  try {
    const { username } = req.params;
    
    if (req.user.username !== username) {
      return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' });
    }
    
    const user = await getUserByUsername(username);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
    }
    
    res.json({ success: true, games: user.history || [] });
  } catch (err) {
    console.error('Games xatoligi:', err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.post('/api/games', authMiddleware, [
  body('result').isIn(['win', 'loss', 'draw']).withMessage('Invalid result'),
  body('opponent').optional().isLength({ max: 100 }),
  body('mode').optional().isLength({ max: 50 }),
  body('moves').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    
    const { result, opponent, mode, moves } = req.body;
    const updated = await updateUserStats(req.user.userId, result, opponent, mode, moves);
    
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
    }
    
    const gameRecord = {
      id: require('uuid').v4(),
      date: new Date().toLocaleDateString(),
      result: result || 'draw',
      opponent: opponent || 'Lokal',
      mode: mode || 'Lokal o\'yin',
      moves: moves || []
    };
    
    io.to(`user_${req.user.userId}`).emit('game-updated', gameRecord);
    
    res.json({ success: true, game: gameRecord });
  } catch (err) {
    console.error('Game save xatoligi:', err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.post('/api/ratings/update', authMiddleware, [
  body('result').isIn(['win', 'loss', 'draw']).withMessage('Invalid result'),
  body('opponentRating').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    
    const { result, opponentRating } = req.body;
    const user = await getUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
    }
    
    const playerRating = user.rating || 1500;
    const opponent = opponentRating || 1500;
    const expectedScore = 1 / (1 + Math.pow(10, (opponent - playerRating) / 400));
    let score = 0.5;
    if (result === 'win') score = 1;
    else if (result === 'loss') score = 0;
    
    const kFactor = 32;
    const ratingChange = Math.round(kFactor * (score - expectedScore));
    const newRating = Math.max(100, playerRating + ratingChange);
    
    await updateUserRating(req.user.userId, newRating);
    
    res.json({ success: true, newRating, change: ratingChange });
  } catch (err) {
    console.error('Rating xatoligi:', err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.post('/api/matchmaking/join', authMiddleware, async (req, res) => {
  try {
    const { username, rating } = req.body;
    const userIndex = matchmakingQueue.findIndex(u => u.username === username);
    
    if (userIndex !== -1) {
      return res.status(400).json({ success: false, message: 'Already in queue' });
    }
    
    matchmakingQueue.push({ username, rating: rating || 1500, joinedAt: Date.now() });
    
    if (matchmakingQueue.length >= 2) {
      const player1 = matchmakingQueue.shift();
      const player2 = matchmakingQueue.shift();
      const roomId = generateRoomId();
      
      // Xonani rooms Map'ga qo'shish
      rooms.set(roomId, { players: [], gameState: null });
      
      res.json({ success: true, matched: true, roomId, opponent: player2 });
    } else {
      res.json({ success: true, matched: false, position: matchmakingQueue.length });
    }
  } catch (err) {
    console.error('Matchmaking xatoligi:', err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.post('/api/matchmaking/leave', authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;
    const index = matchmakingQueue.findIndex(u => u.username === username);
    if (index !== -1) {
      matchmakingQueue.splice(index, 1);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

// ==================== TOURNAMENT ENGINE ====================

// 24/7 Arena time controls rotating every 15 minutes
const TIME_CONTROLS = [
  { name: '1 min Bullet', code: '1+0', type: 'bullet', rounds: 9, icon: '🔫' },
  { name: '3 min Blitz', code: '3+0', type: 'blitz', rounds: 7, icon: '⚡' },
  { name: '10 min Rapid', code: '10+0', type: 'rapid', rounds: 5, icon: '🚀' },
  { name: '1+1 Bullet', code: '1+1', type: 'bullet', rounds: 9, icon: '🔫' },
  { name: '3+2 Blitz', code: '3+2', type: 'blitz', rounds: 7, icon: '⚡' },
  { name: '15+10 Rapid', code: '15+10', type: 'rapid', rounds: 5, icon: '🚀' },
  { name: '2+1 Bullet', code: '2+1', type: 'bullet', rounds: 9, icon: '🔫' },
  { name: '5 min Blitz', code: '5+0', type: 'blitz', rounds: 7, icon: '⚡' },
  { name: '30 min Rapid', code: '30+0', type: 'rapid', rounds: 5, icon: '🚀' },
  { name: '5+3 Blitz', code: '5+3', type: 'blitz', rounds: 7, icon: '⚡' },
  { name: '10+5 Rapid', code: '10+5', type: 'rapid', rounds: 5, icon: '🚀' },
  { name: '3 min Blitz', code: '3+0', type: 'blitz', rounds: 7, icon: '⚡' },
  { name: '1 min Bullet', code: '1+0', type: 'bullet', rounds: 9, icon: '🔫' },
  { name: '15 min Rapid', code: '15+0', type: 'rapid', rounds: 5, icon: '🚀' },
  { name: '2+1 Bullet', code: '2+1', type: 'bullet', rounds: 9, icon: '🔫' },
  { name: '3+2 Blitz', code: '3+2', type: 'blitz', rounds: 7, icon: '⚡' }
];

function getCurrentTimeControl() {
  const now = new Date();
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
  const slotIndex = Math.floor(minutesSinceMidnight / 15) % TIME_CONTROLS.length;
  const tc = TIME_CONTROLS[slotIndex];
  const slotStart = new Date(now);
  slotStart.setHours(0, Math.floor(minutesSinceMidnight / 15) * 15, 0, 0);
  const slotEnd = new Date(slotStart.getTime() + 15 * 60 * 1000);
  const nextSlotStart = new Date(slotEnd.getTime());
  return {
    name: tc.name,
    code: tc.code,
    type: tc.type,
    rounds: tc.rounds,
    icon: tc.icon,
    slotStart: slotStart.toISOString(),
    slotEnd: slotEnd.toISOString(),
    nextSlotStart: nextSlotStart.toISOString()
  };
}

// 24/7 Arena: har 15 daqiqada yangi time control bilan avtomatik arena yaratish.
// Bir vaqtning o'zida faqat joriy slot uchun bitta arena mavjud bo'ladi.
async function ensureCurrentArena(tc) {
  const now = new Date();
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
  const slotIndex = Math.floor(minutesSinceMidnight / 15);
  const slotStart = new Date(now);
  slotStart.setHours(0, slotIndex * 15, 0, 0);
  const slotEnd = new Date(slotStart.getTime() + 15 * 60 * 1000);

  if (useDatabase) {
    const result = await pool.query(
      "SELECT * FROM tournaments WHERE is_arena = true AND time_control = $1 AND status = 'active' AND created_at >= $2 AND created_at < $3 ORDER BY created_at DESC LIMIT 1",
      [tc.code, slotStart.toISOString(), slotEnd.toISOString()]
    );
    let arena = result.rows[0];
    if (!arena) {
      const tournamentId = require('uuid').v4();
      await pool.query(
        'INSERT INTO tournaments (id, name, description, max_players, creator_id, tournament_type, time_control, rounds, current_round, is_arena, status, started_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
        [tournamentId, `Arena ${tc.name}`, '24/7 avtomatik aylanuvchi arena', 9999, null, 'arena', tc.code, tc.rounds, 0, true, 'active', slotStart.toISOString(), slotStart.toISOString()]
      );
      const created = await pool.query('SELECT * FROM tournaments WHERE id = $1', [tournamentId]);
      arena = created.rows[0];
    }
    return arena;
  } else {
    const tournaments = await readJsonFile('tournaments.json', []);
    let arena = tournaments.find(t =>
      t.is_arena && t.time_control === tc.code && t.status === 'active' &&
      new Date(t.created_at) >= slotStart && new Date(t.created_at) < slotEnd
    );
    if (!arena) {
      const tournamentId = require('uuid').v4();
      arena = {
        id: tournamentId,
        name: `Arena ${tc.name}`,
        description: '24/7 avtomatik aylanuvchi arena',
        max_players: 9999,
        current_players: 0,
        status: 'active',
        creator_id: null,
        tournament_type: 'arena',
        time_control: tc.code,
        rounds: tc.rounds,
        current_round: 0,
        is_arena: true,
        started_at: slotStart.toISOString(),
        created_at: slotStart.toISOString()
      };
      tournaments.push(arena);
      await writeJsonFile('tournaments.json', tournaments);
    }
    return arena;
  }
}

// Eski (tugagan slot) arena-larini 'completed' holatiga o'tkazish
async function closeStaleArenas() {
  try {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    if (useDatabase) {
      await pool.query(
        "UPDATE tournaments SET status = 'completed', finished_at = $1 WHERE is_arena = true AND status = 'active' AND started_at < $2",
        [new Date().toISOString(), cutoff.toISOString()]
      );
    } else {
      const tournaments = await readJsonFile('tournaments.json', []);
      let changed = false;
      tournaments.forEach(t => {
        if (t.is_arena && t.status === 'active' && new Date(t.started_at) < cutoff) {
          t.status = 'completed';
          t.finished_at = new Date().toISOString();
          changed = true;
        }
      });
      if (changed) await writeJsonFile('tournaments.json', tournaments);
    }
  } catch (err) {
    console.error('Eski arena\'larni yopishda xatolik:', err.message);
  }
}

function swissPairings(participants, round) {
  const sorted = participants.slice().sort((a, b) =>
    (b.score || 0) - (a.score || 0) || (b.rating || 1500) - (a.rating || 1500)
  );

  const pairings = [];
  const paired = new Set();

  for (let i = 0; i < sorted.length; i++) {
    if (paired.has(sorted[i].userId)) continue;
    for (let j = i + 1; j < sorted.length; j++) {
      if (paired.has(sorted[j].userId)) continue;
      const oppA = sorted[i].opponents || [];
      const oppB = sorted[j].opponents || [];
      if (!oppA.includes(sorted[j].userId) && !oppB.includes(sorted[i].userId)) {
        pairings.push({
          round: round,
          player1Id: sorted[i].userId,
          player2Id: sorted[j].userId,
          player1Rating: sorted[i].rating || 1500,
          player2Rating: sorted[j].rating || 1500,
          bye: false
        });
        paired.add(sorted[i].userId);
        paired.add(sorted[j].userId);
        break;
      }
    }
  }

  sorted.filter(p => !paired.has(p.userId)).forEach(p => {
    pairings.push({
      round: round,
      player1Id: p.userId,
      player2Id: null,
      player1Rating: p.rating || 1500,
      player2Rating: null,
      bye: true
    });
  });

  return pairings;
}

function teamPairings(teamA, teamB, round) {
  const sortedA = teamA.slice().sort((a, b) => (b.rating || 1500) - (a.rating || 1500));
  const sortedB = teamB.slice().sort((a, b) => (b.rating || 1500) - (a.rating || 1500));

  const matchups = [];
  const boardCount = Math.min(sortedA.length, sortedB.length);

  for (let i = 0; i < boardCount; i++) {
    const ga = require('uuid').v4();
    const gb = require('uuid').v4();
    if (Math.random() < 0.5) {
      [ga, gb] = [gb, ga];
    }
    matchups.push({
      round: round,
      board: i + 1,
      teamAPlayerId: sortedA[i].userId,
      teamBPlayerId: sortedB[i].userId,
      teamARating: sortedA[i].rating || 1500,
      teamBRating: sortedB[i].rating || 1500,
      games: [
        { matchId: ga, whiteId: sortedA[i].userId, blackId: sortedB[i].userId, gameNum: 1 },
        { matchId: gb, whiteId: sortedB[i].userId, blackId: sortedA[i].userId, gameNum: 2 }
      ]
    });
  }

  return matchups;
}

async function getTournamentParticipants(tournamentId) {
  if (useDatabase) {
    const result = await pool.query(
      'SELECT tp.id, tp.user_id as "userId", tp.score, tp.club, u.username, u.rating FROM tournament_participants tp JOIN users u ON tp.user_id = u.id WHERE tp.tournament_id = $1',
      [tournamentId]
    );
    return result.rows.map(r => ({
      id: r.id,
      userId: r.userid,
      username: r.username,
      rating: r.rating || 1500,
      score: r.score || 0,
      club: r.club || null,
      opponents: (r.opponents || [])
    }));
  } else {
    const participants = await readJsonFile('tournament_participants.json', []);
    const users = await readJsonFile('users.json', []);
    const tournamentParticipants = participants.filter(p => p.tournament_id === tournamentId);
    return tournamentParticipants.map(p => {
      const user = users.find(u => u.id === p.user_id);
      return {
        id: p.id,
        userId: p.user_id,
        username: user ? user.username : 'Unknown',
        rating: user ? user.rating : 1500,
        score: p.score || 0,
        club: p.club || null,
        opponents: p.opponents || []
      };
    });
  }
}

async function getTournamentMatches(tournamentId, round) {
  if (useDatabase) {
    let query = `
      SELECT tm.id, tm.tournament_id, tm.round, tm.board, tm.game_num as "gameNum",
             tm.player1_id as "player1Id", tm.player2_id as "player2Id",
             tm.team_a_player as "teamAPlayerId", tm.team_b_player as "teamBPlayerId",
             tm.white_id as "whiteId", tm.black_id as "blackId",
             tm.winner_id as "winnerId", tm.status, u1.username as "player1Username", u2.username as "player2Username"
      FROM tournament_matches tm
      LEFT JOIN users u1 ON tm.player1_id = u1.id
      LEFT JOIN users u2 ON tm.player2_id = u2.id
      WHERE tm.tournament_id = $1
    `;
    const params = [tournamentId];
    if (round !== undefined && round !== null) {
      query += ' AND tm.round = $2';
      params.push(round);
    }
    query += ' ORDER BY tm.round ASC, tm.board ASC, tm.game_num ASC, tm.created_at ASC';
    const result = await pool.query(query, params);
    return result.rows;
  } else {
    const key = 'tournament_matches_storage.json';
    const fs = require('fs');
    let matches = await readJsonFile(key, []);
    matches = matches.filter(m => m.tournamentId === tournamentId);
    if (round !== undefined && round !== null) {
      matches = matches.filter(m => m.round === round);
    }
    const users = await readJsonFile('users.json', []);
    matches = matches.map(m => {
      if (m.player1Id) {
        const u1 = users.find(u => u.id === m.player1Id);
        m.player1Username = u1 ? u1.username : 'Unknown';
      }
      if (m.player2Id) {
        const u2 = users.find(u => u.id === m.player2Id);
        m.player2Username = u2 ? u2.username : 'Unknown';
      }
      if (m.teamAPlayerId) {
        const u = users.find(x => x.id === m.teamAPlayerId);
        m.teamAPlayerUsername = u ? u.username : 'Unknown';
      }
      if (m.teamBPlayerId) {
        const u = users.find(x => x.id === m.teamBPlayerId);
        m.teamBPlayerUsername = u ? u.username : 'Unknown';
      }
      if (m.whiteId) {
        const u = users.find(x => x.id === m.whiteId);
        m.whiteUsername = u ? u.username : 'Unknown';
      }
      if (m.blackId) {
        const u = users.find(x => x.id === m.blackId);
        m.blackUsername = u ? u.username : 'Unknown';
      }
      return m;
    });
    return matches;
  }
}

async function saveTournamentMatch(match) {
  if (useDatabase) {
    const existing = await pool.query('SELECT id FROM tournament_matches WHERE id = $1', [match.id]);
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE tournament_matches SET winner_id = $1, status = $2, board = $3, game_num = $4, team_a_player = $5, team_b_player = $6, white_id = $7, black_id = $8 WHERE id = $9',
        [match.winnerId || null, match.status || 'active', match.board || null, match.gameNum || null, match.teamAPlayerId || null, match.teamBPlayerId || null, match.whiteId || null, match.blackId || null, match.id]
      );
    } else {
      await pool.query(
        'INSERT INTO tournament_matches (id, tournament_id, round, board, game_num, player1_id, player2_id, team_a_player, team_b_player, white_id, black_id, winner_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
        [match.id, match.tournamentId, match.round, match.board || null, match.gameNum || null, match.player1Id || null, match.player2Id || null, match.teamAPlayerId || null, match.teamBPlayerId || null, match.whiteId || null, match.blackId || null, match.winnerId || null, match.status || 'active']
      );
    }
  } else {
    const key = 'tournament_matches_storage.json';
    const matches = await readJsonFile(key, []);
    const existingIdx = matches.findIndex(m => m.id === match.id);
    if (existingIdx !== -1) {
      matches[existingIdx] = match;
    } else {
      matches.push(match);
    }
    await writeJsonFile(key, matches);
  }
}

async function getTournamentById(tournamentId) {
  if (useDatabase) {
    const result = await pool.query('SELECT * FROM tournaments WHERE id = $1', [tournamentId]);
    return result.rows[0] || null;
  } else {
    const tournaments = await readJsonFile('tournaments.json', []);
    return tournaments.find(t => t.id === tournamentId) || null;
  }
}

async function updateTournamentRound(tournamentId, round, status) {
  if (useDatabase) {
    const query = status
      ? 'UPDATE tournaments SET current_round = $1, status = $2 WHERE id = $3'
      : 'UPDATE tournaments SET current_round = $1 WHERE id = $2';
    const params = status ? [round, status, tournamentId] : [round, tournamentId];
    await pool.query(query, params);
  } else {
    const tournaments = await readJsonFile('tournaments.json', []);
    const t = tournaments.find(x => x.id === tournamentId);
    if (t) {
      t.current_round = round;
      if (status) t.status = status;
      await writeJsonFile('tournaments.json', tournaments);
    }
  }
}

// Ishtirokchi ochkosini va o'ynagan raqiblar ro'yxatini yangilash (Swiss uchun)
async function addParticipantScore(tournamentId, userId, scoreDelta, opponentId) {
  if (useDatabase) {
    await pool.query(
      'UPDATE tournament_participants SET score = score + $1 WHERE tournament_id = $2 AND user_id = $3',
      [scoreDelta, tournamentId, userId]
    );
    if (opponentId) {
      await pool.query(
        "UPDATE tournament_participants SET opponents = opponents || $1::jsonb WHERE tournament_id = $2 AND user_id = $3",
        [JSON.stringify([opponentId]), tournamentId, userId]
      );
    }
  } else {
    const participants = await readJsonFile('tournament_participants.json', []);
    const p = participants.find(x => x.tournament_id === tournamentId && x.user_id === userId);
    if (p) {
      p.score = (p.score || 0) + scoreDelta;
      p.opponents = p.opponents || [];
      if (opponentId) p.opponents.push(opponentId);
      await writeJsonFile('tournament_participants.json', participants);
    }
  }
}

// ==================== TOURNAMENTS ====================

app.post('/api/tournaments', authMiddleware, [
  body('name').isLength({ min: 3, max: 255 }).withMessage('Tournament name must be 3-255 characters'),
  body('tournamentType').optional().isIn(['arena', 'individual', 'team']).withMessage('Invalid tournament type'),
  body('timeControl').optional().isLength({ max: 20 }),
  body('maxPlayers').optional().isInt({ min: 2, max: 64 }),
  body('rounds').optional().isInt({ min: 1, max: 20 }),
  body('clubIdA').optional().isLength({ max: 100 }),
  body('clubIdB').optional().isLength({ max: 100 }),
  body('clubId').optional().isLength({ max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    
    const { name, description, maxPlayers, clubId, tournamentType, timeControl, rounds, clubIdA, clubIdB } = req.body;
    const tournamentId = require('uuid').v4();
    
    const tc = timeControl || (tournamentType === 'arena' ? getCurrentTimeControl().code : '5+3');
    const rnds = rounds || (tournamentType === 'team' ? 1 : 7);
    const rType = tournamentType || 'arena';
    
    if (useDatabase) {
      await pool.query(
        'INSERT INTO tournaments (id, name, description, max_players, creator_id, club_id, tournament_type, time_control, rounds, current_round, club_id_a, club_id_b, is_arena) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
        [tournamentId, name, description || '', maxPlayers || 16, req.user.userId, clubId || null, rType, tc, rnds, 0, clubIdA || null, clubIdB || null, rType === 'arena']
      );
    } else {
      const tournaments = await readJsonFile('tournaments.json', []);
      tournaments.push({
        id: tournamentId,
        name,
        description: description || '',
        max_players: maxPlayers || 16,
        current_players: 0,
        status: 'waiting',
        creator_id: req.user.userId,
        club_id: clubId || null,
        tournament_type: rType,
        time_control: tc,
        rounds: rnds,
        current_round: 0,
        club_id_a: clubIdA || null,
        club_id_b: clubIdB || null,
        is_arena: rType === 'arena',
        created_at: new Date().toISOString()
      });
      await writeJsonFile('tournaments.json', tournaments);
    }
    
    res.json({ success: true, tournamentId, message: 'Turnir yaratildi!' });
  } catch (err) {
    console.error('Create tournament xatoligi:', err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.get('/api/tournaments/arenas', async (req, res) => {
  try {
    const currentTc = getCurrentTimeControl();
    const timeUntilNext = Math.max(0, new Date(currentTc.nextSlotStart).getTime() - Date.now());

    const currentArena = await ensureCurrentArena(currentTc);

    res.json({ success: true, currentArena, timeControl: currentTc, timeUntilNext });
  } catch (err) {
    console.error('Arenas xatoligi:', err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.get('/api/tournaments', async (req, res) => {
  try {
    let tournaments = [];
    const clubId = req.query.clubId;
    const type = req.query.type;
    if (useDatabase) {
      if (clubId) {
        const result = await pool.query(
          'SELECT * FROM tournaments WHERE club_id = $1 OR club_id_a = $1 OR club_id_b = $1 ORDER BY created_at DESC',
          [clubId]
        );
        tournaments = result.rows;
      } else {
        let query = "SELECT * FROM tournaments WHERE (status = 'waiting' OR is_arena = true) ORDER BY created_at DESC";
        const params = [];
        if (type) {
          query = "SELECT * FROM tournaments WHERE (status = 'waiting' OR is_arena = true) AND tournament_type = $1 ORDER BY created_at DESC";
          params.push(type);
        }
        const result = params.length > 0 ? await pool.query(query, params) : await pool.query(query);
        tournaments = result.rows;
      }
    } else {
      tournaments = await readJsonFile('tournaments.json', []);
      if (clubId) {
        tournaments = tournaments.filter(t => t.club_id === clubId || t.club_id_a === clubId || t.club_id_b === clubId);
      } else {
        tournaments = tournaments.filter(t => t.status === 'waiting' || t.is_arena);
      }
      if (type) {
        tournaments = tournaments.filter(t => t.tournament_type === type);
      }
    }
    res.json({ success: true, tournaments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.get('/api/tournaments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let tournament = null;
    
    if (useDatabase) {
      const result = await pool.query('SELECT * FROM tournaments WHERE id = $1', [id]);
      tournament = result.rows[0];
    } else {
      const tournaments = await readJsonFile('tournaments.json', []);
      tournament = tournaments.find(t => t.id === id);
    }
    
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Turnir topilmadi!' });
    }
    
    res.json({ success: true, tournament });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.post('/api/tournaments/:id/join', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { club } = req.body;
    
    if (useDatabase) {
      const tournamentResult = await pool.query('SELECT * FROM tournaments WHERE id = $1', [id]);
      const tournament = tournamentResult.rows[0];
      
      if (!tournament) {
        return res.status(404).json({ success: false, message: 'Turnir topilmadi!' });
      }
      
      if (!tournament.is_arena && tournament.status !== 'waiting') {
        return res.status(400).json({ success: false, message: 'Turnir allaqachon boshlangan!' });
      }
      
      if (tournament.current_players >= tournament.max_players) {
        return res.status(400). json({ success: false, message: 'Turnir to\'la!' });
      }
      
      const existing = await pool.query('SELECT id FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2', [id, userId]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Siz allaqachon turnirdasiz!' });
      }
      
      await pool.query('INSERT INTO tournament_participants (tournament_id, user_id, club) VALUES ($1, $2, $3)', [id, userId, club || null]);
      await pool.query('UPDATE tournaments SET current_players = current_players + 1 WHERE id = $1', [id]);
      
      if (tournament.is_arena) {
        await pool.query('UPDATE tournaments SET status = $1 WHERE id = $2', ['active', id]);
      }
    } else {
      const tournaments = await readJsonFile('tournaments.json', []);
      const tournament = tournaments.find(t => t.id === id);
      
      if (!tournament) {
        return res.status(404).json({ success: false, message: 'Turnir topilmadi!' });
      }
      
      if (!tournament.is_arena && tournament.status !== 'waiting') {
        return res.status(400).json({ success: false, message: 'Turnir allaqachon boshlangan!' });
      }
      
      if (tournament.current_players >= tournament.max_players) {
        return res.status(400).json({ success: false, message: 'Turnir to\'la!' });
      }
      
      const participants = await readJsonFile('tournament_participants.json', []);
      if (participants.some(p => p.tournament_id === id && p.user_id === userId)) {
        return res.status(400).json({ success: false, message: 'Siz allaqachon turnirdasiz!' });
      }
      
      participants.push({ tournament_id: id, user_id: userId, score: 0, club: club || null });
      await writeJsonFile('tournament_participants.json', participants);
      
      tournament.current_players = (tournament.current_players || 0) + 1;
      if (!tournament.is_arena && tournament.status === 'waiting') {
        tournament.status = 'active';
        tournament.started_at = new Date().toISOString();
      }
      if (tournament.is_arena) {
        tournament.status = 'active';
        tournament.started_at = tournament.started_at || new Date().toISOString();
      }
      await writeJsonFile('tournaments.json', tournaments);
    }
    
    io.to(`tournament_${id}`).emit('tournament-joined', { tournamentId: id, userId: userId });
    res.json({ success: true, message: 'Turnirga qo\'shildingiz!' });
  } catch (err) {
    console.error('Join tournament xatoligi:', err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.post('/api/tournaments/:id/start', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (useDatabase) {
      const tournamentResult = await pool.query('SELECT * FROM tournaments WHERE id = $1', [id]);
      const tournament = tournamentResult.rows[0];
      
      if (!tournament) {
        return res.status(404).json({ success: false, message: 'Turnir topilmadi!' });
      }
      
      if (tournament.creator_id !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Faqat yaratuvchi boshlashi mumkin!' });
      }
      
      if (tournament.current_players < 2) {
        return res.status(400).json({ success: false, message: 'Kamida 2 o\'yinchi kerak!' });
      }
      
      await pool.query('UPDATE tournaments SET status = $1, started_at = $2 WHERE id = $3', ['active', new Date().toISOString(), id]);
    } else {
      const tournaments = await readJsonFile('tournaments.json', []);
      const tournament = tournaments.find(t => t.id === id);
      
      if (!tournament) {
        return res.status(404).json({ success: false, message: 'Turnir topilmadi!' });
      }
      
      if (tournament.creator_id !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Faqat yaratuvchi boshlashi mumkin!' });
      }
      
      if (tournament.current_players < 2) {
        return res.status(400).json({ success: false, message: 'Kamida 2 o\'yinchi kerak!' });
      }
      
      tournament.status = 'active';
      tournament.started_at = new Date().toISOString();
      await writeJsonFile('tournaments.json', tournaments);
    }
    
    io.to(`tournament_${id}`).emit('tournament-started', { tournamentId: id });
    
    res.json({ success: true, message: 'Turnir boshlandi!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.get('/api/tournaments/:id/standings', async (req, res) => {
  try {
    const { id } = req.params;
    const tournament = await getTournamentById(id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Turnir topilmadi!' });
    }

    if (tournament.tournament_type === 'team') {
      let teamAScore = tournament.team_score_a || 0;
      let teamBScore = tournament.team_score_b || 0;
      if (useDatabase) {
        // Aggregated team scores already stored in tournaments table
      }
      return res.json({
        success: true,
        teamStandings: [
          { name: tournament.club_id_a || 'Team A', score: teamAScore },
          { name: tournament.club_id_b || 'Team B', score: teamBScore }
        ],
        currentRound: tournament.current_round || 0,
        totalRounds: tournament.rounds || 1,
        timeControl: tournament.time_control
      });
    }

    let standings = [];
    
    if (useDatabase) {
      const result = await pool.query(`
        SELECT tp.score, u.username, u.rating, tp.club
        FROM tournament_participants tp 
        JOIN users u ON tp.user_id = u.id 
        WHERE tp.tournament_id = $1 
        ORDER BY tp.score DESC, u.rating DESC
      `, [id]);
      standings = result.rows;
    } else {
      const participants = await readJsonFile('tournament_participants.json', []);
      const users = await readJsonFile('users.json', []);
      const tournamentParticipants = participants.filter(p => p.tournament_id === id);
      
      standings = tournamentParticipants.map(p => {
        const user = users.find(u => u.id === p.user_id);
        return {
          score: p.score,
          username: user ? user.username : 'Unknown',
          rating: user ? user.rating : 1500,
          club: p.club || null
        };
      }).sort((a, b) => b.score - a.score || b.rating - a.rating);
    }
    
    res.json({ success: true, standings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

// ==================== SWISS / TOURNAMENT MATCHES ====================

// Joriy raund juftliklarini olish (ko'rsatish uchun)
app.get('/api/tournaments/:id/matches', async (req, res) => {
  try {
    const { id } = req.params;
    const round = req.query.round ? parseInt(req.query.round) : undefined;
    const matches = await getTournamentMatches(id, round);
    res.json({ success: true, matches });
  } catch (err) {
    console.error('Tournament matches xatoligi:', err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

// Turnir ishtirokchilari ro'yxati (scorlar bilan)
app.get('/api/tournaments/:id/participants', async (req, res) => {
  try {
    const { id } = req.params;
    const participants = await getTournamentParticipants(id);
    res.json({ success: true, participants });
  } catch (err) {
    console.error('Tournament participants xatoligi:', err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

// Umumiy o'yin saqlash (jamoa/juftliklar uchun, mavjud bo'lsa yangilash)
app.post('/api/tournaments/:id/matches', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { matches } = req.body;
    if (!Array.isArray(matches) || matches.length === 0) {
      return res.status(400).json({ success: false, message: 'O\'yinlar ro\'yxati kerak!' });
    }
    const saved = [];
    for (const m of matches) {
      const match = {
        id: m.id || require('uuid').v4(),
        tournamentId: id,
        round: m.round || 1,
        board: m.board || null,
        gameNum: m.gameNum || null,
        player1Id: m.player1Id || null,
        player2Id: m.player2Id || null,
        teamAPlayer: m.teamAPlayer || null,
        teamBPlayer: m.teamBPlayer || null,
        winnerId: m.winnerId || null,
        status: m.status || 'active'
      };
      await saveTournamentMatch(match);
      saved.push(match);
    }
    res.json({ success: true, matches: saved });
  } catch (err) {
    console.error('Match saqlash xatoligi:', err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

// Keyingi raund uchun Swiss juftliklarini yaratish
app.post('/api/tournaments/:id/pairings', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    let tournament = null;
    if (useDatabase) {
      const result = await pool.query('SELECT * FROM tournaments WHERE id = $1', [id]);
      tournament = result.rows[0];
    } else {
      const tournaments = await readJsonFile('tournaments.json', []);
      tournament = tournaments.find(t => t.id === id);
    }
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Turnir topilmadi!' });
    }

    const participants = await getTournamentParticipants(id);
    if (participants.length < 2) {
      return res.status(400).json({ success: false, message: 'Juftlik uchun kamida 2 o\'yinchi kerak!' });
    }

    const currentRound = tournament.current_round || 0;
    const maxRounds = tournament.rounds || 7;
    if (currentRound >= maxRounds) {
      return res.status(400).json({ success: false, message: 'Barcha raundlar o\'ynalib bo\'ldi!' });
    }

    const round = currentRound + 1;

    let createdMatches = [];

    if (tournament.tournament_type === 'team') {
      const teamA = participants.filter(p => p.club === tournament.club_id_a || p.club === tournament.club_a_name);
      const teamB = participants.filter(p => p.club === tournament.club_id_b || p.club === tournament.club_b_name);

      const matchups = teamPairings(teamA, teamB, round);
      for (const matchup of matchups) {
        for (const game of matchup.games) {
          const match = {
            id: game.matchId,
            tournamentId: id,
            round: matchup.round,
            board: matchup.board,
            gameNum: game.gameNum,
            teamAPlayerId: matchup.teamAPlayerId,
            teamBPlayerId: matchup.teamBPlayerId,
            whiteId: game.whiteId,
            blackId: game.blackId,
            winnerId: null,
            teamScoreDelta: null,
            status: 'active'
          };
          await saveTournamentMatch(match);
          createdMatches.push(match);
        }
      }
    } else {
      const pairings = swissPairings(participants, round);

      for (const p of pairings) {
        const matchId = require('uuid').v4();
        const match = {
          id: matchId,
          tournamentId: id,
          round: round,
          player1Id: p.player1Id,
          player2Id: p.player2Id || null,
          winnerId: null,
          status: p.bye ? 'bye' : 'active'
        };
        await saveTournamentMatch(match);
        if (p.bye) {
          await addParticipantScore(id, p.player1Id, 1, null);
        }
        createdMatches.push(match);
      }
    }

    if (useDatabase) {
      const finalStatus = (round >= maxRounds) ? 'completed' : 'active';
      await pool.query('UPDATE tournaments SET current_round = $1, status = $2 WHERE id = $3', [round, finalStatus, id]);
    } else {
      const tournaments = await readJsonFile('tournaments.json', []);
      const t = tournaments.find(x => x.id === id);
      if (t) {
        t.current_round = round;
        t.status = (round >= maxRounds) ? 'completed' : 'active';
      }
      await writeJsonFile('tournaments.json', tournaments);
    }

    io.to(`tournament_${id}`).emit('tournament-pairings', { tournamentId: id, round, pairings: createdMatches });

    res.json({ success: true, round, pairings: createdMatches });
  } catch (err) {
    console.error('Pairings xatoligi:', err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

// Turnir o'yini natijasini kiritish (Swiss + Team)
app.post('/api/tournaments/:id/matches/:matchId/result', authMiddleware, async (req, res) => {
  try {
    const { id, matchId } = req.params;
    const { result } = req.body; // 'white' | 'black' | 'draw'

    if (!['white', 'black', 'draw'].includes(result)) {
      return res.status(400).json({ success: false, message: 'Noto\'g\'ri natija turi!' });
    }

    const tournament = await getTournamentById(id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Turnir topilmadi!' });
    }

    const matches = await getTournamentMatches(id);
    const match = matches.find(m => m.id === matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'O\'yin topilmadi!' });
    }
    if (match.status === 'completed' || match.status === 'bye') {
      return res.status(400).json({ success: false, message: 'O\'yin allaqachon yakunlangan!' });
    }

    let winnerId = null;
    const isTeamMatch = !!(match.teamAPlayerId && match.teamBPlayerId);

    if (isTeamMatch) {
      // Team match: determine winner by white/black side
      if (result === 'white') winnerId = match.whiteId;
      else if (result === 'black') winnerId = match.blackId;

      await saveTournamentMatch({ ...match, winnerId, status: 'completed', completedAt: new Date().toISOString() });

      // Update team score
      const teamAPlayerId = match.teamAPlayerId;
      const teamBPlayerId = match.teamBPlayerId;
      let scoreA = 0, scoreB = 0;
      if (result === 'draw') {
        scoreA = 0.5; scoreB = 0.5;
      } else if (winnerId === teamAPlayerId) {
        scoreA = 1;
      } else if (winnerId === teamBPlayerId) {
        scoreB = 1;
      }

      // Add opponent tracking
      if (winnerId) {
        const loserId = winnerId === teamAPlayerId ? teamBPlayerId : teamAPlayerId;
        await addParticipantScore(id, winnerId, 1, loserId);
        await addParticipantScore(id, loserId, 0, winnerId);
        await updateUserStats(winnerId, 'win', tournament.name, 'Tournament');
        await updateUserStats(loserId, 'loss', tournament.name, 'Tournament');
      } else {
        await addParticipantScore(id, teamAPlayerId, 0.5, teamBPlayerId);
        await addParticipantScore(id, teamBPlayerId, 0.5, teamAPlayerId);
        await updateUserStats(teamAPlayerId, 'draw', tournament.name, 'Tournament');
        await updateUserStats(teamBPlayerId, 'draw', tournament.name, 'Tournament');
      }

      // Update aggregate team scores
      if (tournament.is_arena) {
        // Arena: individual score tracking
      } else {
        if (useDatabase) {
          if (scoreA > 0 || scoreB > 0) {
            await pool.query(
              'UPDATE tournaments SET team_score_a = team_score_a + $1, team_score_b = team_score_b + $2 WHERE id = $3',
              [scoreA, scoreB, id]
            );
          }
        } else {
          const tournaments = await readJsonFile('tournaments.json', []);
          const t = tournaments.find(x => x.id === id);
          if (t) {
            t.team_score_a = (t.team_score_a || 0) + scoreA;
            t.team_score_b = (t.team_score_b || 0) + scoreB;
            await writeJsonFile('tournaments.json', tournaments);
          }
        }
      }

      io.to(`tournament_${id}`).emit('tournament-match-result', { tournamentId: id, matchId, result, winnerId, teamScoreA: scoreA, teamScoreB: scoreB });
    } else {
      // Individual/Swiss match
      if (result === 'white') winnerId = match.player1Id;
      else if (result === 'black') winnerId = match.player2Id;

      await saveTournamentMatch({ ...match, winnerId, status: 'completed', completedAt: new Date().toISOString() });

      if (result === 'draw') {
        await addParticipantScore(id, match.player1Id, 0.5, match.player2Id);
        if (match.player2Id) await addParticipantScore(id, match.player2Id, 0.5, match.player1Id);
        await updateUserStats(match.player1Id, 'draw', tournament.name, 'Tournament');
        if (match.player2Id) await updateUserStats(match.player2Id, 'draw', tournament.name, 'Tournament');
      } else {
        const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;
        await addParticipantScore(id, winnerId, 1, loserId);
        if (loserId) await addParticipantScore(id, loserId, 0, winnerId);
        await updateUserStats(winnerId, 'win', tournament.name, 'Tournament');
        if (loserId) await updateUserStats(loserId, 'loss', tournament.name, 'Tournament');
      }

      io.to(`tournament_${id}`).emit('tournament-match-result', { tournamentId: id, matchId, result, winnerId });
    }

    res.json({ success: true, message: 'Natija saqlandi!', winnerId });
  } catch (err) {
    console.error('Match result xatoligi:', err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

// Jamoa vs Jamoa (Country vs Country) uchun 2 o'yinli juftliklarni yaratish
app.post('/api/tournaments/team-pairings', authMiddleware, async (req, res) => {
  try {
    const { teamA, teamB, round } = req.body;
    if (!Array.isArray(teamA) || !Array.isArray(teamB)) {
      return res.status(400).json({ success: false, message: 'Jamoa a\'zolari kerak!' });
    }
    const matchups = teamPairings(teamA, teamB, round || 1);
    res.json({ success: true, matchups });
  } catch (err) {
    console.error('Team pairings xatoligi:', err);
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

// ==================== FRIENDS ====================

app.post('/api/friends/request', authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;
    const receiver = await getUserByUsername(username);
    
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
    }
    
    if (receiver.id === req.user.userId) {
      return res.status(400).json({ success: false, message: 'O\'zingizga do\'stlik so\'rovini yuborib bo\'lmaydi!' });
    }
    
    if (useDatabase) {
      const existing = await pool.query(
        'SELECT id FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = $3',
        [req.user.userId, receiver.id, 'pending']
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'So\'rov allaqachon yuborilgan!' });
      }
      
      await pool.query(
        'INSERT INTO friend_requests (sender_id, receiver_id) VALUES ($1, $2)',
        [req.user.userId, receiver.id]
      );
    } else {
      const requests = await readJsonFile('friend_requests.json', []);
      if (requests.some(r => r.sender_id === req.user.userId && r.receiver_id === receiver.id && r.status === 'pending')) {
        return res.status(400).json({ success: false, message: 'So\'rov allaqachon yuborilgan!' });
      }
      requests.push({
        sender_id: req.user.userId,
        receiver_id: receiver.id,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      await writeJsonFile('friend_requests.json', requests);
    }
    
    io.to(`user_${receiver.id}`).emit('friend-request-received', { 
      senderId: req.user.userId, 
      senderName: req.user.username 
    });
    
    res.json({ success: true, message: 'Do\'stlik so\'rovi yuborildi!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.post('/api/friends/accept', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.body;
    
    if (useDatabase) {
      const requestResult = await pool.query('SELECT * FROM friend_requests WHERE id = $1 AND receiver_id = $2 AND status = $3', [requestId, req.user.userId, 'pending']);
      const request = requestResult.rows[0];
      
      if (!request) {
        return res.status(404).json({ success: false, message: 'So\'rov topilmadi!' });
      }
      
      await pool.query('UPDATE friend_requests SET status = $1, updated_at = $2 WHERE id = $3', ['accepted', new Date().toISOString(), requestId]);
      await pool.query('INSERT INTO friends (user_id, friend_id) VALUES ($1, $2), ($2, $1)', [request.sender_id, request.receiver_id]);
    } else {
      const requests = await readJsonFile('friend_requests.json', []);
      const request = requests.find(r => r.id === requestId && r.receiver_id === req.user.userId && r.status === 'pending');
      
      if (!request) {
        return res.status(404).json({ success: false, message: 'So\'rov topilmadi!' });
      }
      
      request.status = 'accepted';
      request.updated_at = new Date().toISOString();
      await writeJsonFile('friend_requests.json', requests);
      
      const friends = await readJsonFile('friends.json', []);
      friends.push({ user_id: request.sender_id, friend_id: request.receiver_id, created_at: new Date().toISOString() });
      friends.push({ user_id: request.receiver_id, friend_id: request.sender_id, created_at: new Date().toISOString() });
      await writeJsonFile('friends.json', friends);
    }
    
    res.json({ success: true, message: 'Do\'stlik qabul qilindi!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.get('/api/friends', authMiddleware, async (req, res) => {
  try {
    let friendsList = [];
    
    if (useDatabase) {
      const result = await pool.query(`
        SELECT u.id, u.username, u.rating, u.last_active 
        FROM friends f 
        JOIN users u ON f.friend_id = u.id 
        WHERE f.user_id = $1 
        ORDER BY u.last_active DESC
      `, [req.user.userId]);
      friendsList = result.rows;
    } else {
      const friends = await readJsonFile('friends.json', []);
      const userFriends = friends.filter(f => f.user_id === req.user.userId);
      const users = await readJsonFile('users.json', []);
      
      friendsList = userFriends.map(f => {
        const friend = users.find(u => u.id === f.friend_id);
        return friend ? { id: friend.id, username: friend.username, rating: friend.rating || 1500, last_active: friend.last_active } : null;
      }).filter(Boolean);
    }
    
    res.json({ success: true, friends: friendsList });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.get('/api/friends/requests', authMiddleware, async (req, res) => {
  try {
    let requests = [];
    
    if (useDatabase) {
      const result = await pool.query(`
        SELECT fr.id, u.username, u.rating, fr.created_at 
        FROM friend_requests fr 
        JOIN users u ON fr.sender_id = u.id 
        WHERE fr.receiver_id = $1 AND fr.status = $2
      `, [req.user.userId, 'pending']);
      requests = result.rows;
    } else {
      const allRequests = await readJsonFile('friend_requests.json', []);
      const users = await readJsonFile('users.json', []);
      requests = allRequests
        .filter(r => r.receiver_id === req.user.userId && r.status === 'pending')
        .map(r => {
          const sender = users.find(u => u.id === r.sender_id);
          return sender ? { id: r.id, username: sender.username, rating: sender.rating || 1500, created_at: r.created_at } : null;
        })
        .filter(Boolean);
    }
    
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

// ==================== CHAT ====================

app.get('/api/chat/messages', authMiddleware, async (req, res) => {
  try {
    const { userId, roomId } = req.query;
    let messages = [];
    
    if (useDatabase) {
      let query = 'SELECT cm.*, u.username FROM chat_messages cm JOIN users u ON cm.sender_id = u.id';
      const params = [];
      
      if (roomId) {
        query += ' WHERE cm.room_id = $1';
        params.push(roomId);
      } else if (userId) {
        query += ' WHERE (cm.sender_id = $1 AND cm.receiver_id = $2) OR (cm.sender_id = $2 AND cm.receiver_id = $1)';
        params.push(req.user.userId, userId);
      } else {
        query += ' WHERE cm.receiver_id IS NULL AND cm.room_id IS NULL';
      }
      
      query += ' ORDER BY cm.created_at ASC LIMIT 100';
      const result = await pool.query(query, params);
      messages = result.rows;
    } else {
      const allMessages = await readJsonFile('chat_messages.json', []);
      
      if (roomId) {
        messages = allMessages.filter(m => m.room_id === roomId);
      } else if (userId) {
        messages = allMessages.filter(m => 
          (m.sender_id === req.user.userId && m.receiver_id === userId) ||
          (m.sender_id === userId && m.receiver_id === req.user.userId)
        );
      } else {
        messages = allMessages.filter(m => !m.receiver_id && !m.room_id);
      }
    }
    
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.post('/api/chat/messages', authMiddleware, [
  body('message').isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters'),
  body('receiverId').optional().isUUID(),
  body('roomId').optional().isLength({ max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    
    const { message, receiverId, roomId } = req.body;
    const messageId = require('uuid').v4();
    
    if (useDatabase) {
      await pool.query(
        'INSERT INTO chat_messages (id, sender_id, receiver_id, room_id, message) VALUES ($1, $2, $3, $4, $5)',
        [messageId, req.user.userId, receiverId || null, roomId || null, message]
      );
    } else {
      const messages = await readJsonFile('chat_messages.json', []);
      messages.push({
        id: messageId,
        sender_id: req.user.userId,
        receiver_id: receiverId || null,
        room_id: roomId || null,
        message,
        created_at: new Date().toISOString()
      });
      await writeJsonFile('chat_messages.json', messages);
    }
    
    if (roomId) {
      io.to(roomId).emit('chat-message', { messageId, senderId: req.user.userId, senderName: req.user.username, message, roomId, createdAt: new Date().toISOString() });
    } else if (receiverId) {
      io.to(`user_${receiverId}`).emit('chat-message', { messageId, senderId: req.user.userId, senderName: req.user.username, message, createdAt: new Date().toISOString() });
    }
    
    res.json({ success: true, messageId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

// ==================== CLUBS ====================

app.post('/api/clubs', authMiddleware, [
  body('name').isLength({ min: 3, max: 255 }).withMessage('Club name must be 3-255 characters'),
  body('description').optional().isLength({ max: 1000 }),
  body('icon').optional().isLength({ max: 10 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    
    const { name, description, icon } = req.body;
    const clubId = require('uuid').v4();
    
    if (useDatabase) {
      await pool.query(
        'INSERT INTO clubs (id, name, description, icon, creator_id) VALUES ($1, $2, $3, $4, $5)',
        [clubId, name, description || '', icon || '♟️', req.user.userId]
      );
      await pool.query('INSERT INTO club_members (club_id, user_id, role) VALUES ($1, $2, $3)', [clubId, req.user.userId, 'admin']);
    } else {
      const clubs = await readJsonFile('clubs.json', []);
      clubs.push({
        id: clubId,
        name,
        description: description || '',
        icon: icon || '♟️',
        creator_id: req.user.userId,
        max_members: 50,
        current_members: 1,
        is_public: true,
        created_at: new Date().toISOString()
      });
      await writeJsonFile('clubs.json', clubs);
      
      const members = await readJsonFile('club_members.json', []);
      members.push({ club_id: clubId, user_id: req.user.userId, role: 'admin', joined_at: new Date().toISOString() });
      await writeJsonFile('club_members.json', members);
    }
    
    res.json({ success: true, clubId, message: 'Klub yaratildi!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.get('/api/clubs', async (req, res) => {
  try {
    let clubs = [];
    
    if (useDatabase) {
      const result = await pool.query('SELECT * FROM clubs WHERE is_public = true ORDER BY created_at DESC');
      clubs = result.rows;
    } else {
      clubs = await readJsonFile('clubs.json', []);
      clubs = clubs.filter(c => c.is_public);
    }
    
    res.json({ success: true, clubs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.get('/api/clubs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let club = null;
    
    if (useDatabase) {
      const result = await pool.query('SELECT * FROM clubs WHERE id = $1', [id]);
      club = result.rows[0];
    } else {
      const clubs = await readJsonFile('clubs.json', []);
      club = clubs.find(c => c.id === id);
    }
    
    if (!club) {
      return res.status(404).json({ success: false, message: 'Klub topilmadi!' });
    }
    
    res.json({ success: true, club });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.post('/api/clubs/:id/join', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    if (useDatabase) {
      const clubResult = await pool.query('SELECT * FROM clubs WHERE id = $1', [id]);
      const club = clubResult.rows[0];
      
      if (!club) {
        return res.status(404).json({ success: false, message: 'Klub topilmadi!' });
      }
      
      if (club.current_members >= club.max_members) {
        return res.status(400).json({ success: false, message: 'Klub to\'la!' });
      }
      
      const existing = await pool.query('SELECT id FROM club_members WHERE club_id = $1 AND user_id = $2', [id, userId]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Siz allaqachon klubdasiz!' });
      }
      
      await pool.query('INSERT INTO club_members (club_id, user_id, role) VALUES ($1, $2, $3)', [id, userId, 'member']);
      await pool.query('UPDATE clubs SET current_members = current_members + 1 WHERE id = $1', [id]);
    } else {
      const clubs = await readJsonFile('clubs.json', []);
      const club = clubs.find(c => c.id === id);
      
      if (!club) {
        return res.status(404).json({ success: false, message: 'Klub topilmadi!' });
      }
      
      if (club.current_members >= club.max_members) {
        return res.status(400).json({ success: false, message: 'Klub to\'la!' });
      }
      
      const members = await readJsonFile('club_members.json', []);
      if (members.some(m => m.club_id === id && m.user_id === userId)) {
        return res.status(400).json({ success: false, message: 'Siz allaqachon klubdasiz!' });
      }
      
      members.push({ club_id: id, user_id: userId, role: 'member', joined_at: new Date().toISOString() });
      await writeJsonFile('club_members.json', members);
      
      club.current_members = (club.current_members || 0) + 1;
      await writeJsonFile('clubs.json', clubs);
    }
    
    res.json({ success: true, message: 'Klubga qo\'shildingiz!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

app.get('/api/clubs/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    let members = [];
    
    if (useDatabase) {
      const result = await pool.query(`
        SELECT cm.role, u.username, u.rating, u.last_active 
        FROM club_members cm 
        JOIN users u ON cm.user_id = u.id 
        WHERE cm.club_id = $1 
        ORDER BY cm.joined_at ASC
      `, [id]);
      members = result.rows;
    } else {
      const allMembers = await readJsonFile('club_members.json', []);
      const users = await readJsonFile('users.json', []);
      const clubMembers = allMembers.filter(m => m.club_id === id);
      
      members = clubMembers.map(m => {
        const user = users.find(u => u.id === m.user_id);
        return user ? { role: m.role, username: user.username, rating: user.rating || 1500, last_active: user.last_active } : null;
      }).filter(Boolean);
    }
    
    res.json({ success: true, members });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatoligi!' });
  }
});

io.on('connection', (socket) => {
  console.log('Yangi o\'yinchi ulandi:', socket.id);

  socket.on('join-club-room', (clubRoomId) => {
    socket.join(clubRoomId);
    console.log(`Klub xonasiga qo'shildi: ${clubRoomId}`);
  });

  socket.on('join-room', (roomId) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { players: [], gameState: null });
    }
    const room = rooms.get(roomId);
    if (room.players.length >= 2) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }
    room.players.push(socket.id);
    socket.join(roomId);
    socket.emit('room-joined', roomId);
    socket.to(roomId).emit('opponent-connected');
    console.log(`O'yinchi ${socket.id} xonaga qo'shildi: ${roomId}`);
  });
  
  socket.on('create-room', () => {
    const roomId = generateRoomId();
    socket.join(roomId);
    rooms.set(roomId, { players: [socket.id], gameState: null });
    socket.emit('room-created', roomId);
    console.log(`Xona yaratildi: ${roomId}`);
  });
  
  socket.on('join-random-room', () => {
    const availableRooms = Array.from(rooms.entries()).filter(([id, room]) => room.players.length < 2);
    
    if (availableRooms.length > 0) {
      const [roomId, room] = availableRooms[0];
      room.players.push(socket.id);
      socket.join(roomId);
      socket.emit('room-joined', roomId);
      socket.to(roomId).emit('opponent-connected');
      console.log(`O'yinchi ${socket.id} tasodifiy xonaga qo'shildi: ${roomId}`);
    } else {
      const roomId = generateRoomId();
      rooms.set(roomId, { players: [socket.id], gameState: null });
      socket.join(roomId);
      socket.emit('waiting-for-opponent', roomId);
      console.log(`O'yinchi ${socket.id} xona kutish rejimida: ${roomId}`);
    }
  });
  
  socket.on('make-move', (data) => {
    const { roomId, move } = data;
    
    if (!rooms.has(roomId)) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const validation = validateMove(move);
    if (!validation.valid) {
      socket.emit('move-rejected', { error: validation.error });
      return;
    }
    
    socket.to(roomId).emit('opponent-move', move);
  });
  
  socket.on('offer-draw', (data) => {
    const { roomId } = data;
    socket.to(roomId).emit('draw-offered', { roomId });
  });

  socket.on('accept-draw', (data) => {
    const { roomId } = data;
    socket.to(roomId).emit('draw-accepted', { roomId });
  });

  socket.on('decline-draw', (data) => {
    const { roomId } = data;
    socket.to(roomId).emit('draw-declined', { roomId });
  });
  
  socket.on('game-over', (data) => {
    const { roomId, result } = data;
    socket.to(roomId).emit('game-ended', result);
  });
  
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit('opponent-disconnected');
    
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      const index = room.players.indexOf(socket.id);
      if (index !== -1) {
        room.players.splice(index, 1);
      }
      if (room.players.length === 0) {
        rooms.delete(roomId);
      }
    }
  });
  
  // Tournament socket events
  socket.on('join-tournament-room', (tournamentId) => {
    socket.join(`tournament_${tournamentId}`);
    console.log(`O'yinchi ${socket.id} turnir xonasiga qo'shildi: ${tournamentId}`);
  });
  
  // Chat socket events
  socket.on('join-chat-room', (roomId) => {
    socket.join(roomId);
    console.log(`O'yinchi ${socket.id} chat xonasiga qo'shildi: ${roomId}`);
  });
  
  socket.on('send-chat-message', (data) => {
    const { message, roomId, receiverId } = data;
    
    if (roomId) {
      io.to(roomId).emit('chat-message', {
        senderId: socket.id,
        message,
        roomId,
        createdAt: new Date().toISOString()
      });
    } else if (receiverId) {
      io.to(`user_${receiverId}`).emit('chat-message', {
        senderId: socket.id,
        message,
        createdAt: new Date().toISOString()
      });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('O\'yinchi chiqib ketdi:', socket.id);
    for (const [roomId, room] of rooms.entries()) {
      const index = room.players.indexOf(socket.id);
      if (index !== -1) {
        room.players.splice(index, 1);
        socket.to(roomId).emit('opponent-disconnected');
        if (room.players.length === 0) {
          rooms.delete(roomId);
        }
        break;
      }
    }
  });
});

// 24/7 Arena: eski arena'larni yopish uchun muntazam tekshiruv
closeStaleArenas();
setInterval(closeStaleArenas, 60 * 1000);

server.listen(PORT, () => {
  console.log('Server ishga tushdi: http://localhost:' + PORT);
  console.log('API endpoint\'lari:');
  console.log('  POST /api/auth/register');
  console.log('  POST /api/auth/login');
  console.log('  POST /api/auth/logout');
  console.log('  GET  /api/leaderboard');
  console.log('  GET  /api/daily-winners');
  console.log('  GET  /api/stats/:username');
  console.log('  GET  /api/users/:username/games');
  console.log('  POST /api/games');
  console.log('  POST /api/ratings/update');
  console.log('  POST /api/matchmaking/join');
  console.log('  POST /api/matchmaking/leave');
  console.log('  POST /api/tournaments');
  console.log('  GET  /api/tournaments');
  console.log('  GET  /api/tournaments/arenas');
  console.log('  GET  /api/tournaments/:id');
  console.log('  POST /api/tournaments/:id/join');
  console.log('  POST /api/tournaments/:id/start');
  console.log('  GET  /api/tournaments/:id/standings');
  console.log('  GET  /api/tournaments/:id/matches');
  console.log('  GET  /api/tournaments/:id/participants');
  console.log('  POST /api/tournaments/:id/matches');
  console.log('  POST /api/tournaments/:id/pairings');
  console.log('  POST /api/tournaments/:id/matches/:matchId/result');
  console.log('  POST /api/tournaments/team-pairings');
  console.log('  POST /api/friends/request');
  console.log('  POST /api/friends/accept');
  console.log('  GET  /api/friends');
  console.log('  GET  /api/friends/requests');
  console.log('  GET  /api/chat/messages');
  console.log('  POST /api/chat/messages');
  console.log('  POST /api/clubs');
  console.log('  GET  /api/clubs');
  console.log('  GET  /api/clubs/:id');
  console.log('  POST /api/clubs/:id/join');
  console.log('  GET  /api/clubs/:id/members');
});

module.exports = { app, server, io };
