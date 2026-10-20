const path = require('path');
const { v4: uuidv4 } = require('uuid');

// DATABASE_URL berilsa PostgreSQL (masalan Render + Neon), aks holda lokal SQLite fayli.
// Barcha so'rovlar `?` placeholder bilan yoziladi; PostgreSQL uchun ular $1, $2... ga aylantiriladi.
const DATABASE_URL = process.env.DATABASE_URL;
const usePostgres = !!DATABASE_URL;

let pool = null;
let sqliteDb = null;

if (usePostgres) {
  const { Pool } = require('pg');
  // Masofaviy baza bilan sertifikat tekshiriladigan SSL; lokal yoki sslmode=disable bo'lsa SSL'siz
  const noSsl = /@(localhost|127\.0\.0\.1)[:/]/.test(DATABASE_URL) || /sslmode=disable/.test(DATABASE_URL);
  pool = new Pool({ connectionString: DATABASE_URL, ssl: !noSsl });
} else {
  const sqlite3 = require('sqlite3').verbose();
  sqliteDb = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));
  sqliteDb.serialize(() => {
    sqliteDb.run('PRAGMA journal_mode = WAL');
    sqliteDb.run('PRAGMA foreign_keys = ON');
  });
}

// dbGet(sql, a, b) va dbGet(sql, [a, b]) ikkalasi ham qo'llab-quvvatlanadi
function normalizeParams(params) {
  return params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
}

function toPgSql(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => '$' + (++i));
}

function sqliteCall(method, sql, params) {
  return new Promise((resolve, reject) => {
    sqliteDb[method](sql, params, function (err, result) {
      if (err) reject(err);
      else resolve(method === 'run' ? this : result);
    });
  });
}

async function dbGet(sql, ...params) {
  params = normalizeParams(params);
  if (usePostgres) return (await pool.query(toPgSql(sql), params)).rows[0];
  return sqliteCall('get', sql, params);
}

async function dbAll(sql, ...params) {
  params = normalizeParams(params);
  if (usePostgres) return (await pool.query(toPgSql(sql), params)).rows;
  return sqliteCall('all', sql, params);
}

async function dbRun(sql, ...params) {
  params = normalizeParams(params);
  if (usePostgres) return pool.query(toPgSql(sql), params);
  return sqliteCall('run', sql, params);
}

function dbExec(sql) {
  if (usePostgres) return pool.query(sql);
  return new Promise((resolve, reject) => {
    sqliteDb.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function parseJson(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}

async function initDatabase() {
  await dbExec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      rating INTEGER DEFAULT 1500,
      stats TEXT DEFAULT '{"wins":0,"losses":0,"draws":0}',
      stats_by_mode TEXT DEFAULT '{"rapid":{"wins":0,"losses":0,"draws":0},"blitz":{"wins":0,"losses":0,"draws":0},"bullet":{"wins":0,"losses":0,"draws":0}}',
      history TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_active TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      result TEXT NOT NULL,
      opponent TEXT DEFAULT 'Online',
      mode TEXT DEFAULT 'Online o''yin',
      time_control TEXT DEFAULT 'blitz',
      moves TEXT DEFAULT '[]',
      date TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS clubs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT DEFAULT '♟️',
      creator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      max_members INTEGER DEFAULT 50,
      current_members INTEGER DEFAULT 1,
      is_public INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      max_players INTEGER DEFAULT 16,
      current_players INTEGER DEFAULT 0,
      status TEXT DEFAULT 'waiting',
      creator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      tournament_type TEXT DEFAULT 'arena',
      time_control TEXT,
      rounds INTEGER DEFAULT 7,
      current_round INTEGER DEFAULT 0,
      club_id TEXT REFERENCES clubs(id) ON DELETE SET NULL,
      club_id_a TEXT REFERENCES clubs(id) ON DELETE SET NULL,
      club_id_b TEXT REFERENCES clubs(id) ON DELETE SET NULL,
      is_arena INTEGER DEFAULT 0,
      team_score_a INTEGER DEFAULT 0,
      team_score_b INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      started_at TEXT DEFAULT NULL,
      finished_at TEXT DEFAULT NULL
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS tournament_participants (
      id TEXT PRIMARY KEY,
      tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      score REAL DEFAULT 0,
      position INTEGER,
      club TEXT,
      opponents TEXT DEFAULT '[]',
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tournament_id, user_id)
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS tournament_matches (
      id TEXT PRIMARY KEY,
      tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
      round INTEGER DEFAULT 1,
      board INTEGER,
      game_num INTEGER,
      player1_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      player2_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      team_a_player TEXT,
      team_b_player TEXT,
      white_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      black_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      winner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending',
      completed_at TEXT DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id TEXT PRIMARY KEY,
      sender_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      receiver_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(sender_id, receiver_id)
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS friends (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      friend_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, friend_id)
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      receiver_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      room_id TEXT,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS club_members (
      id TEXT PRIMARY KEY,
      club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member',
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(club_id, user_id)
    )
  `);

  await dbExec(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_games_date ON games(date)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON tournament_participants(tournament_id)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_club_members_club ON club_members(club_id)`);

  try {
    await dbExec(`ALTER TABLE users ADD COLUMN stats_by_mode TEXT DEFAULT '{"rapid":{"wins":0,"losses":0,"draws":0},"blitz":{"wins":0,"losses":0,"draws":0},"bullet":{"wins":0,"losses":0,"draws":0}}'`);
  } catch (e) {}
  try {
    await dbExec(`ALTER TABLE users ADD COLUMN country TEXT DEFAULT NULL`);
  } catch (e) {}
  try {
    await dbExec(`ALTER TABLE users ADD COLUMN ratings_by_mode TEXT DEFAULT NULL`);
  } catch (e) {}
  // Davlat klubi a'zoligi: har o'yinchi faqat bitta klubda (nomi, bayroq kodi, qo'shilgan vaqti)
  for (const col of ['club_country', 'club_code', 'club_joined_at']) {
    try {
      await dbExec(`ALTER TABLE users ADD COLUMN ${col} TEXT DEFAULT NULL`);
    } catch (e) {}
  }
  try {
    await dbExec(`ALTER TABLE games ADD COLUMN time_control TEXT DEFAULT 'blitz'`);
  } catch (e) {}
  try {
    await dbExec(`ALTER TABLE tournaments ADD COLUMN started_at TEXT DEFAULT NULL`);
  } catch (e) {}
  try {
    await dbExec(`ALTER TABLE tournaments ADD COLUMN team_score_a INTEGER DEFAULT 0`);
  } catch (e) {}
  try {
    await dbExec(`ALTER TABLE tournaments ADD COLUMN team_score_b INTEGER DEFAULT 0`);
  } catch (e) {}
  try {
    await dbExec(`ALTER TABLE tournaments ADD COLUMN club_id_a TEXT REFERENCES clubs(id) ON DELETE SET NULL`);
  } catch (e) {}
  try {
    await dbExec(`ALTER TABLE tournaments ADD COLUMN club_id_b TEXT REFERENCES clubs(id) ON DELETE SET NULL`);
  } catch (e) {}
  try {
    await dbExec(`ALTER TABLE tournament_matches ADD COLUMN team_a_player TEXT`);
  } catch (e) {}
  try {
    await dbExec(`ALTER TABLE tournament_matches ADD COLUMN team_b_player TEXT`);
  } catch (e) {}
  try {
    await dbExec(`ALTER TABLE tournament_matches ADD COLUMN completed_at TEXT DEFAULT NULL`);
  } catch (e) {}

  // "Chatni tozalash" (faqat o'zi uchun): shu vaqtdan oldingi xabarlar foydalanuvchiga ko'rsatilmaydi
  await dbExec(`
    CREATE TABLE IF NOT EXISTS chat_clears (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      room_id TEXT NOT NULL,
      cleared_at TEXT NOT NULL,
      UNIQUE(user_id, room_id)
    )
  `);

  // Davlat klublari: rollar (kapitan, moderator) va klub yangiliklari
  await dbExec(`
    CREATE TABLE IF NOT EXISTS club_roles (
      id TEXT PRIMARY KEY,
      club_country TEXT NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(club_country, user_id)
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS club_news (
      id TEXT PRIMARY KEY,
      club_country TEXT NOT NULL,
      author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      pinned INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);
  // Bildirishnomalar markazi (🔔): data — JSON matn, turiga qarab klient o'zi matn yasaydi
  await dbExec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      data TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);
  try { await dbExec('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at)'); } catch (e) {}

  // Bloklash va shikoyatlar; admin roli va hisobni bloklash (ban)
  await dbExec(`
    CREATE TABLE IF NOT EXISTS user_blocks (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      blocked_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, blocked_id)
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      target_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT DEFAULT 'open',
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      resolved_by TEXT,
      resolution TEXT
    )
  `);
  for (const col of ['role', 'banned_until', 'ban_reason']) {
    try {
      await dbExec(`ALTER TABLE users ADD COLUMN ${col} TEXT DEFAULT NULL`);
    } catch (e) {}
  }

  // Davom etayotgan o'yinlar (server qayta ishga tushsa tiklash uchun): har yurishdan keyin yangilanadi
  await dbExec(`
    CREATE TABLE IF NOT EXISTS active_games (
      room_id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Maxfiylik: kim xabar yozadi / o'yinga chaqiradi (JSON: {messages: 'all'|'friends', challenges: 'all'|'friends'|'none'})
  try {
    await dbExec(`ALTER TABLE users ADD COLUMN privacy TEXT DEFAULT NULL`);
  } catch (e) {}

  // Profil rasmlari: alohida jadvalda (users so'rovlari og'irlashmasligi uchun); users.avatar_version — keshni yangilash uchun
  await dbExec(`
    CREATE TABLE IF NOT EXISTS avatars (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      mime TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  try {
    await dbExec(`ALTER TABLE users ADD COLUMN avatar_version TEXT DEFAULT NULL`);
  } catch (e) {}

  // Reyting tarixi (profil grafigi): har reytingli o'yindan keyingi rejim reytingi
  await dbExec(`
    CREATE TABLE IF NOT EXISTS rating_history (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      mode TEXT NOT NULL,
      rating_before INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_rating_history_user ON rating_history(user_id, mode)`);

  // Parolni tiklash: bir martalik token (bazada faqat sha256 xeshi)
  await dbExec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  // Swiss turnirlari (swiss.js): ishtirokchi natijalari, turnirdan chiqqanlik, o'yin natijasi, keyingi tur vaqti
  for (const col of ['games', 'wins', 'draws', 'losses', 'withdrawn']) {
    try {
      await dbExec(`ALTER TABLE tournament_participants ADD COLUMN ${col} INTEGER DEFAULT 0`);
    } catch (e) {}
  }
  try {
    await dbExec(`ALTER TABLE tournament_matches ADD COLUMN result TEXT DEFAULT NULL`);
  } catch (e) {}
  try {
    await dbExec(`ALTER TABLE tournaments ADD COLUMN next_round_at TEXT DEFAULT NULL`);
  } catch (e) {}

  // Shaxsiy xabarlar: har foydalanuvchi har suhbatni qachongacha o'qigani (o'qilmaganlar soni uchun)
  await dbExec(`
    CREATE TABLE IF NOT EXISTS chat_reads (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      room_id TEXT NOT NULL,
      last_read_at TEXT NOT NULL
    )
  `);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_chat_reads_user_room ON chat_reads(user_id, room_id)`);

  // --- Jamoaviy ligalar (league.js) ---
  // Mavsum: barcha qit'a ligalari bir xil vaqt nazoratida, keyin Chempionlar ligasi va 1 haftalik tanaffus
  await dbExec(`
    CREATE TABLE IF NOT EXISTS league_seasons (
      id TEXT PRIMARY KEY,
      number INTEGER NOT NULL,
      initial_time INTEGER NOT NULL,
      increment INTEGER NOT NULL,
      phase TEXT NOT NULL,
      champion_club TEXT,
      champion_code TEXT,
      started_at TEXT,
      break_until TEXT,
      created_at TEXT
    )
  `);
  // Divizion: bitta qit'a ligasi yoki Chempionlar ligasi (round-robin jadvali schedule JSON'da)
  await dbExec(`
    CREATE TABLE IF NOT EXISTS league_divisions (
      id TEXT PRIMARY KEY,
      season_id TEXT REFERENCES league_seasons(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      continent TEXT,
      status TEXT NOT NULL,
      current_round INTEGER DEFAULT 0,
      rounds_total INTEGER DEFAULT 0,
      schedule TEXT DEFAULT '[]',
      champion_club TEXT,
      champion_code TEXT,
      created_at TEXT
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS league_clubs (
      id TEXT PRIMARY KEY,
      division_id TEXT REFERENCES league_divisions(id) ON DELETE CASCADE,
      club_name TEXT NOT NULL,
      club_code TEXT,
      played INTEGER DEFAULT 0,
      won INTEGER DEFAULT 0,
      drawn INTEGER DEFAULT 0,
      lost INTEGER DEFAULT 0,
      match_points INTEGER DEFAULT 0,
      board_points REAL DEFAULT 0
    )
  `);
  // Bahs: ikki klub o'rtasidagi doskalar bo'yicha uchrashuv (Chempionlar ligasida bitta juftlikka 3 ta bahs)
  await dbExec(`
    CREATE TABLE IF NOT EXISTS league_matches (
      id TEXT PRIMARY KEY,
      division_id TEXT REFERENCES league_divisions(id) ON DELETE CASCADE,
      round INTEGER NOT NULL,
      home_club TEXT NOT NULL,
      home_code TEXT,
      away_club TEXT NOT NULL,
      away_code TEXT,
      initial_time INTEGER NOT NULL,
      increment INTEGER NOT NULL,
      status TEXT NOT NULL,
      home_score REAL DEFAULT 0,
      away_score REAL DEFAULT 0,
      deadline TEXT,
      created_at TEXT
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS league_games (
      id TEXT PRIMARY KEY,
      match_id TEXT REFERENCES league_matches(id) ON DELETE CASCADE,
      board INTEGER NOT NULL,
      white_id TEXT,
      white_name TEXT,
      black_id TEXT,
      black_name TEXT,
      white_is_home INTEGER DEFAULT 1,
      status TEXT NOT NULL,
      result TEXT,
      white_ready_at TEXT,
      black_ready_at TEXT,
      finished_at TEXT
    )
  `);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_league_matches_division ON league_matches(division_id)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_league_games_match ON league_games(match_id)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_league_clubs_division ON league_clubs(division_id)`);

  // Yutuqlar, kuzatish, sayt yangiliklari, fair-play, chat filtri
  await dbExec(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      earned_at TEXT NOT NULL,
      UNIQUE(user_id, key)
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS follows (
      id TEXT PRIMARY KEY,
      follower_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      followee_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      UNIQUE(follower_id, followee_id)
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS news_posts (
      id TEXT PRIMARY KEY,
      author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS fairplay_games (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      opponent_id TEXT,
      mode TEXT,
      moves INTEGER DEFAULT 0,
      blurs INTEGER DEFAULT 0,
      avg_ms INTEGER DEFAULT 0,
      cv REAL DEFAULT 0,
      result TEXT,
      suspicious INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS chat_filter (
      id TEXT PRIMARY KEY,
      word TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    )
  `);
  for (const sql of [
    'ALTER TABLE users ADD COLUMN muted_until TEXT DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN fairplay_flag TEXT DEFAULT NULL',
    'ALTER TABLE rating_history ADD COLUMN opponent_id TEXT DEFAULT NULL',
    'ALTER TABLE rating_history ADD COLUMN refunded INTEGER DEFAULT 0'
  ]) { try { await dbExec(sql); } catch (e) {} }
  // Tez-tez so'raladigan ustunlar uchun indekslar (ikkala bazada ham ishlaydi)
  for (const sql of [
    'CREATE INDEX IF NOT EXISTS idx_users_rating ON users (rating)',
    'CREATE INDEX IF NOT EXISTS idx_users_club ON users (club_country)',
    'CREATE INDEX IF NOT EXISTS idx_chat_room_time ON chat_messages (room_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_chat_receiver ON chat_messages (receiver_id)',
    'CREATE INDEX IF NOT EXISTS idx_friends_user ON friends (user_id)',
    'CREATE INDEX IF NOT EXISTS idx_friend_req_receiver ON friend_requests (receiver_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_rating_history_user ON rating_history (user_id, mode, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_rating_history_opp ON rating_history (opponent_id)',
    'CREATE INDEX IF NOT EXISTS idx_tp_tournament ON tournament_participants (tournament_id)',
    'CREATE INDEX IF NOT EXISTS idx_tm_tournament ON tournament_matches (tournament_id)',
    'CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows (followee_id)',
    'CREATE INDEX IF NOT EXISTS idx_fairplay_user ON fairplay_games (user_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_club_news_club ON club_news (club_country)',
    'CREATE INDEX IF NOT EXISTS idx_chat_reads_user ON chat_reads (user_id, room_id)'
  ]) { try { await dbExec(sql); } catch (e) {} }

  // 🚩 Bayroqlar bellashuvi (kodda "war"): har reytingli o'yindagi klub ochkolari (mavsum = oy, Toshkent vaqti) va mavsum chempionlari
  await dbExec(`
    CREATE TABLE IF NOT EXISTS war_points (
      id TEXT PRIMARY KEY,
      season TEXT NOT NULL,
      club_country TEXT NOT NULL,
      club_code TEXT NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      opponent_code TEXT,
      points INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS war_seasons (
      id TEXT PRIMARY KEY,
      season TEXT NOT NULL UNIQUE,
      ruler_country TEXT,
      ruler_code TEXT,
      territories INTEGER DEFAULT 0,
      points INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);
  for (const sql of [
    'CREATE INDEX IF NOT EXISTS idx_war_points_season ON war_points (season, club_code)',
    'CREATE INDEX IF NOT EXISTS idx_war_points_user ON war_points (season, user_id)'
  ]) { try { await dbExec(sql); } catch (e) {} }

  await migrateRatingsByMode();
  await migrateDirectChatRooms();

  console.log(usePostgres ? '✅ PostgreSQL jadvallari tayyor.' : '✅ Database SQLite sahifalari yaratildi.');
}

async function closeStaleArenas() {
  try {
    const now = new Date();
    const currentSlotStart = new Date(now);
    currentSlotStart.setHours(now.getHours(), 0, 0, 0);
    const cutoff = currentSlotStart.toISOString();
    await dbRun(`UPDATE tournaments SET status = 'completed', finished_at = ? WHERE is_arena = 1 AND status = 'active' AND started_at < ?`, [new Date().toISOString(), cutoff]);
  } catch (err) {
    console.error('Eski arena yopish xatoligi:', err.message);
  }
}

// chess960 — alohida reyting (umumiy reytingga ta'sir qilmaydi)
const RATING_MODES = ['rapid', 'blitz', 'bullet', 'chess960'];

// Rejim bo'yicha reytinglar; har bir rejim 1500 dan boshlanadi
function normalizeRatingsByMode(row) {
  const stored = parseJson(row.ratings_by_mode) || {};
  const result = {};
  for (const mode of RATING_MODES) result[mode] = Number(stored[mode]) || 1500;
  return result;
}

// Bir martalik/idempotent tuzatish: o'yin o'ynalmagan rejim — 1500;
// rejim reytingi hali saqlanmagan eski akkauntlarda o'ynalgan rejim umumiy reytingni oladi
async function migrateRatingsByMode() {
  const rows = await dbAll('SELECT id, rating, ratings_by_mode, stats_by_mode FROM users');
  for (const row of rows) {
    const stored = parseJson(row.ratings_by_mode) || {};
    const statsByMode = parseJson(row.stats_by_mode) || {};
    const fixed = {};
    for (const mode of RATING_MODES) {
      const s = statsByMode[mode] || {};
      const games = (s.wins || 0) + (s.losses || 0) + (s.draws || 0);
      if (games === 0) fixed[mode] = 1500;
      else fixed[mode] = Number(stored[mode]) || row.rating || 1500;
    }
    if (JSON.stringify(fixed) !== JSON.stringify(stored)) {
      await dbRun('UPDATE users SET ratings_by_mode = ? WHERE id = ?', [JSON.stringify(fixed), row.id]);
    }
  }
}

// Eski shaxsiy xabarlar "user_<qabul qiluvchi>" xonasida edi — ikki tomon uchun umumiy "dm_<id1>_<id2>" ga o'tkazish
async function migrateDirectChatRooms() {
  const rows = await dbAll("SELECT id, sender_id, room_id FROM chat_messages WHERE room_id LIKE 'user%'");
  for (const row of rows) {
    if (!row.room_id.startsWith('user_')) continue;
    const partnerId = row.room_id.slice(5);
    const roomId = 'dm_' + [row.sender_id, partnerId].sort().join('_');
    await dbRun('UPDATE chat_messages SET room_id = ?, receiver_id = ? WHERE id = ?', [roomId, partnerId, row.id]);
  }
}

function mapUserRow(row) {
  return { ...row, stats: parseJson(row.stats), stats_by_mode: parseJson(row.stats_by_mode), ratings_by_mode: normalizeRatingsByMode(row), history: parseJson(row.history) };
}

async function getUserByUsername(username) {
  const row = await dbGet('SELECT * FROM users WHERE username = ?', username);
  return row ? mapUserRow(row) : null;
}

async function getUserById(id) {
  const row = await dbGet('SELECT * FROM users WHERE id = ?', id);
  return row ? mapUserRow(row) : null;
}

async function createUser(user) {
  const id = uuidv4();
  await dbRun(
    'INSERT INTO users (id, username, email, password_hash, rating, ratings_by_mode, stats, stats_by_mode, history, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, user.username, user.email, user.passwordHash, user.rating || 1500, JSON.stringify({ rapid: 1500, blitz: 1500, bullet: 1500 }), JSON.stringify(user.stats || { wins: 0, losses: 0, draws: 0 }), JSON.stringify(user.statsByMode || { rapid: { wins: 0, losses: 0, draws: 0 }, blitz: { wins: 0, losses: 0, draws: 0 }, bullet: { wins: 0, losses: 0, draws: 0 } }), JSON.stringify(user.history || []), new Date().toISOString()]
  );
  return { id, username: user.username, email: user.email, rating: user.rating || 1500, ratingsByMode: { rapid: 1500, blitz: 1500, bullet: 1500 }, stats: user.stats || { wins: 0, losses: 0, draws: 0 }, statsByMode: user.statsByMode || { rapid: { wins: 0, losses: 0, draws: 0 }, blitz: { wins: 0, losses: 0, draws: 0 }, bullet: { wins: 0, losses: 0, draws: 0 } }, history: user.history || [], created_at: new Date().toISOString() };
}

async function updateUserStats(userId, result, opponent, mode, moves, timeControl, extra) {
  const user = await getUserById(userId);
  if (!user) return null;

  const stats = user.stats || { wins: 0, losses: 0, draws: 0 };
  if (result === 'win') stats.wins++;
  else if (result === 'loss') stats.losses++;
  else stats.draws++;

  const statsByMode = user.stats_by_mode || { rapid: { wins: 0, losses: 0, draws: 0 }, blitz: { wins: 0, losses: 0, draws: 0 }, bullet: { wins: 0, losses: 0, draws: 0 } };
  const modeKey = timeControl || 'blitz';
  if (!statsByMode[modeKey]) statsByMode[modeKey] = { wins: 0, losses: 0, draws: 0 };
  if (result === 'win') statsByMode[modeKey].wins++;
  else if (result === 'loss') statsByMode[modeKey].losses++;
  else statsByMode[modeKey].draws++;

  const history = user.history || [];
  history.push({ id: uuidv4(), date: new Date().toLocaleDateString(), timestamp: new Date().toISOString(), result, opponent: opponent || 'Online', mode: mode || 'Online o\'yin', timeControl: timeControl || 'blitz', moves: moves || [], ...(extra || {}) });

  await dbRun('UPDATE users SET stats = ?, stats_by_mode = ?, history = ?, last_active = ? WHERE id = ?', [JSON.stringify(stats), JSON.stringify(statsByMode), JSON.stringify(history), new Date().toISOString(), userId]);

  return { stats, statsByMode, history };
}

// Davlat kodi (masalan 'uz', 'pk') — raqibga bayroq ko'rsatish uchun
// --- Bloklash ---
async function blockUser(userId, blockedId) {
  const existing = await dbGet('SELECT id FROM user_blocks WHERE user_id = ? AND blocked_id = ?', [userId, blockedId]);
  if (!existing) await dbRun('INSERT INTO user_blocks (id, user_id, blocked_id, created_at) VALUES (?, ?, ?, ?)', [uuidv4(), userId, blockedId, new Date().toISOString()]);
  // Bloklanganda do'stlik va kutilayotgan so'rovlar bekor bo'ladi
  await dbRun('DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', [userId, blockedId, blockedId, userId]);
  await dbRun("UPDATE friend_requests SET status = 'cancelled' WHERE status = 'pending' AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))", [userId, blockedId, blockedId, userId]);
}

async function unblockUser(userId, blockedId) {
  await dbRun('DELETE FROM user_blocks WHERE user_id = ? AND blocked_id = ?', [userId, blockedId]);
}

async function getBlockedUsers(userId) {
  return dbAll('SELECT u.id, u.username, b.created_at as "blockedAt" FROM user_blocks b JOIN users u ON u.id = b.blocked_id WHERE b.user_id = ? ORDER BY b.created_at DESC', [userId]);
}

async function loadAllBlocks() {
  return dbAll('SELECT user_id as "userId", blocked_id as "blockedId" FROM user_blocks');
}

// --- Shikoyatlar ---
async function createReport(reporterId, targetId, reason, details) {
  const open = await dbGet("SELECT id FROM reports WHERE reporter_id = ? AND target_id = ? AND status = 'open'", [reporterId, targetId]);
  if (open) return { success: false, message: 'Bu o\'yinchi haqida shikoyatingiz ko\'rib chiqilmoqda' };
  await dbRun('INSERT INTO reports (id, reporter_id, target_id, reason, details, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), reporterId, targetId, reason, details || '', 'open', new Date().toISOString()]);
  return { success: true, message: 'Shikoyatingiz yuborildi. Rahmat!' };
}

// Har o'yinchi ustidan jami shikoyatlar soni (ichki so'rovsiz — ikkala bazada bir xil ishlaydi)
async function reportCounts() {
  const rows = await dbAll('SELECT target_id as "id", COUNT(*) as "n" FROM reports GROUP BY target_id');
  return new Map(rows.map(r => [r.id, Number(r.n) || 0]));
}

async function listReports(status) {
  const rows = await dbAll(`SELECT r.id, r.reason, r.details, r.status, r.created_at as "createdAt", r.resolved_at as "resolvedAt", r.resolution,
      ru.username as "reporter", tu.username as "target", tu.id as "targetId", tu.banned_until as "targetBannedUntil"
    FROM reports r LEFT JOIN users ru ON ru.id = r.reporter_id LEFT JOIN users tu ON tu.id = r.target_id
    WHERE r.status = ? ORDER BY r.created_at DESC LIMIT 200`, [status]);
  const counts = await reportCounts();
  return rows.map(r => ({ ...r, targetReports: counts.get(r.targetId) || 0 }));
}

async function resolveReport(id, adminId, resolution) {
  await dbRun("UPDATE reports SET status = 'resolved', resolved_at = ?, resolved_by = ?, resolution = ? WHERE id = ?", [new Date().toISOString(), adminId, resolution || '', id]);
}

// --- Admin ---
async function setAdmins(usernames) {
  for (const name of usernames) await dbRun("UPDATE users SET role = 'admin' WHERE username = ?", [name]);
}

async function setBan(userId, until, reason) {
  await dbRun('UPDATE users SET banned_until = ?, ban_reason = ? WHERE id = ?', [until, until ? (reason || '') : null, userId]);
}

async function loadBans() {
  return dbAll('SELECT id, banned_until as "until", ban_reason as "reason" FROM users WHERE banned_until IS NOT NULL');
}

async function adminSearchUsers(q) {
  const like = '%' + String(q || '').toLowerCase().replace(/[%_]/g, '') + '%';
  const rows = await dbAll(`SELECT id, username, email, rating, country, created_at as "createdAt", last_active as "lastActive", role, banned_until as "bannedUntil", ban_reason as "banReason", stats
    FROM users WHERE LOWER(username) LIKE ? ORDER BY last_active DESC LIMIT 50`, [like]);
  const counts = await reportCounts();
  return rows.map(u => ({ ...u, reports: counts.get(u.id) || 0 }));
}

async function adminStats() {
  const one = async (sql, params) => Number((await dbGet(sql, params || [])).n) || 0;
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return {
    users: await one('SELECT COUNT(*) as "n" FROM users'),
    newUsers24h: await one('SELECT COUNT(*) as "n" FROM users WHERE created_at >= ?', [dayAgo]),
    games24h: await one('SELECT COUNT(*) as "n" FROM games WHERE date >= ?', [dayAgo]),
    openReports: await one("SELECT COUNT(*) as \"n\" FROM reports WHERE status = 'open'"),
    banned: await one('SELECT COUNT(*) as "n" FROM users WHERE banned_until IS NOT NULL')
  };
}

async function saveActiveGame(roomId, data) {
  const now = new Date().toISOString();
  const json = JSON.stringify(data);
  const existing = await dbGet('SELECT room_id FROM active_games WHERE room_id = ?', [roomId]);
  if (existing) await dbRun('UPDATE active_games SET data = ?, updated_at = ? WHERE room_id = ?', [json, now, roomId]);
  else await dbRun('INSERT INTO active_games (room_id, data, updated_at) VALUES (?, ?, ?)', [roomId, json, now]);
}

async function deleteActiveGame(roomId) {
  await dbRun('DELETE FROM active_games WHERE room_id = ?', [roomId]);
}

async function loadActiveGames() {
  const rows = await dbAll('SELECT room_id as "roomId", data FROM active_games');
  return rows.map(r => ({ roomId: r.roomId, data: parseJson(r.data) })).filter(r => r.data);
}

const PRIVACY_DEFAULTS = { messages: 'all', challenges: 'all' };
function userPrivacy(user) {
  const p = parseJson(user && user.privacy) || {};
  return {
    messages: ['all', 'friends'].includes(p.messages) ? p.messages : PRIVACY_DEFAULTS.messages,
    challenges: ['all', 'friends', 'none'].includes(p.challenges) ? p.challenges : PRIVACY_DEFAULTS.challenges
  };
}

async function updatePrivacy(userId, privacy) {
  const user = await getUserById(userId);
  const next = { ...userPrivacy(user) };
  if (['all', 'friends'].includes(privacy.messages)) next.messages = privacy.messages;
  if (['all', 'friends', 'none'].includes(privacy.challenges)) next.challenges = privacy.challenges;
  await dbRun('UPDATE users SET privacy = ? WHERE id = ?', [JSON.stringify(next), userId]);
  return next;
}

async function areFriends(userId, otherId) {
  return !!(await dbGet('SELECT id FROM friends WHERE user_id = ? AND friend_id = ?', [userId, otherId]));
}

async function setAvatar(userId, mime, data) {
  const now = new Date().toISOString();
  const existing = await dbGet('SELECT user_id FROM avatars WHERE user_id = ?', [userId]);
  if (existing) await dbRun('UPDATE avatars SET mime = ?, data = ?, updated_at = ? WHERE user_id = ?', [mime, data, now, userId]);
  else await dbRun('INSERT INTO avatars (user_id, mime, data, updated_at) VALUES (?, ?, ?, ?)', [userId, mime, data, now]);
  await dbRun('UPDATE users SET avatar_version = ? WHERE id = ?', [now, userId]);
  return now;
}

async function deleteAvatar(userId) {
  await dbRun('DELETE FROM avatars WHERE user_id = ?', [userId]);
  await dbRun('UPDATE users SET avatar_version = NULL WHERE id = ?', [userId]);
}

async function getAvatarByUsername(username) {
  return dbGet('SELECT a.mime, a.data, a.updated_at as "updatedAt" FROM avatars a JOIN users u ON u.id = a.user_id WHERE u.username = ?', [username]);
}

async function getUserByEmail(email) {
  const row = await dbGet('SELECT * FROM users WHERE LOWER(email) = ?', [String(email).toLowerCase()]);
  return row ? mapUserRow(row) : null;
}

async function updateUserEmail(userId, email) {
  await dbRun('UPDATE users SET email = ? WHERE id = ?', [email, userId]);
}

async function updateUserPassword(userId, passwordHash) {
  await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
}

async function createPasswordReset(userId, tokenHash, expiresAt) {
  // Avvalgi ishlatilmagan tokenlar bekor qilinadi
  await dbRun('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0', [userId]);
  await dbRun('INSERT INTO password_resets (id, user_id, token_hash, expires_at, used, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [uuidv4(), userId, tokenHash, expiresAt, 0, new Date().toISOString()]);
}

async function usePasswordReset(tokenHash) {
  const row = await dbGet('SELECT * FROM password_resets WHERE token_hash = ? AND used = 0', [tokenHash]);
  if (!row || row.expires_at < new Date().toISOString()) return null;
  await dbRun('UPDATE password_resets SET used = 1 WHERE id = ?', [row.id]);
  return row.user_id;
}

async function updateUserCountry(userId, country) {
  await dbRun('UPDATE users SET country = ? WHERE id = ?', [country, userId]);
}

async function touchUserLastActive(userId) {
  await dbRun('UPDATE users SET last_active = ? WHERE id = ?', [new Date().toISOString(), userId]);
}

async function deleteUserSessions(userId) {
  await dbRun('DELETE FROM sessions WHERE user_id = ?', [userId]);
}

async function updateUserRating(userId, newRating) {
  await dbRun('UPDATE users SET rating = ? WHERE id = ?', [newRating, userId]);
}

async function getLeaderboard() {
  const rows = await dbAll('SELECT username, rating, ratings_by_mode, stats, stats_by_mode, country, club_country, club_code, avatar_version FROM users ORDER BY rating DESC LIMIT 300');
  return rows.map(u => ({
    username: u.username,
    country: u.country || null,
    club: u.club_country ? { name: u.club_country, code: u.club_code || null } : null,
    avatarVersion: u.avatar_version || null,
    wins: parseInt(u.stats ? JSON.parse(u.stats).wins : 0) || 0,
    losses: parseInt(u.stats ? JSON.parse(u.stats).losses : 0) || 0,
    draws: parseInt(u.stats ? JSON.parse(u.stats).draws : 0) || 0,
    rating: u.rating || 1500,
    ratingsByMode: normalizeRatingsByMode(u),
    statsByMode: u.stats_by_mode ? JSON.parse(u.stats_by_mode) : { rapid: { wins: 0, losses: 0, draws: 0 }, blitz: { wins: 0, losses: 0, draws: 0 }, bullet: { wins: 0, losses: 0, draws: 0 } }
  }));
}

// Top 5 g'oliblar: shu davrda (24 soat yoki 7 kun) eng ko'p g'alaba; tenglikda — kam o'yin, keyin reyting
async function getDailyWinners(period) {
  const span = period === 'week' ? 7 : 1;
  const cutoff = Date.now() - span * 24 * 60 * 60 * 1000;
  const users = await dbAll('SELECT username, history, rating, country, avatar_version FROM users');
  const winners = users.map(u => {
    const recent = (parseJson(u.history) || []).filter(game => {
      const t = new Date(game.timestamp || game.date || 0).getTime();
      return !isNaN(t) && t >= cutoff;
    });
    const wins = recent.filter(g => g.result === 'win').length;
    return {
      username: u.username, dailyWins: wins, games: recent.length, winRate: recent.length ? Math.round(wins / recent.length * 100) : 0,
      rating: u.rating || 1500, country: u.country || null, avatarVersion: u.avatar_version || null
    };
  }).filter(u => u.dailyWins > 0)
    .sort((a, b) => b.dailyWins - a.dailyWins || a.games - b.games || b.rating - a.rating)
    .slice(0, 5);
  return { success: true, period: span === 7 ? 'week' : 'day', winners };
}

async function getStatsByUsername(username) {
  const user = await getUserByUsername(username);
  if (!user) return null;
  return { success: true, stats: user.stats || { wins: 0, losses: 0, draws: 0 }, statsByMode: user.stats_by_mode, rating: user.rating || 1500, ratingsByMode: user.ratings_by_mode, club: userClub(user), avatarVersion: user.avatar_version || null, role: user.role || null };
}

// Ommaviy profil: boshqa o'yinchilar ko'rishi mumkin bo'lgan ma'lumotlar (email va yurishlarsiz)
// Bitta o'yinni qayta ko'rish uchun (ommaviy: yurishlar, natija, raqib)
async function getGameReplay(username, gameId) {
  const user = await getUserByUsername(username);
  if (!user) return null;
  const g = (Array.isArray(user.history) ? user.history : []).find(x => x.id === gameId);
  if (!g) return null;
  return {
    id: g.id, player: user.username, opponent: g.opponent || null, result: g.result, color: g.color || null,
    reason: g.reason || null, timeControl: g.timeControl || null, clock: g.clock || null,
    date: g.timestamp || g.date || null, moves: Array.isArray(g.moves) ? g.moves : [],
    variant: g.variant || 'standard', startFen: g.startFen || null
  };
}

async function getPublicProfile(username) {
  const user = await getUserByUsername(username);
  if (!user) return null;
  const history = Array.isArray(user.history) ? user.history : [];
  const recentGames = history.slice(-10).reverse().map(g => ({
    id: g.id || null,
    hasMoves: Array.isArray(g.moves) && g.moves.length > 0,
    result: g.result,
    opponent: g.opponent || null,
    timeControl: g.timeControl || null,
    variant: g.variant || 'standard',
    date: g.timestamp || g.date || null
  }));
  // Reyting grafigi: har rejim bo'yicha oxirgi 100 nuqta (birinchisi — o'yindan oldingi reyting)
  const ratingHistory = {};
  for (const mode of RATING_MODES) {
    const rows = await dbAll('SELECT rating_before as "before", rating, created_at as "t" FROM rating_history WHERE user_id = ? AND mode = ? ORDER BY created_at DESC LIMIT 100', [user.id, mode]);
    rows.reverse();
    ratingHistory[mode] = rows.length ? [{ t: rows[0].t, r: Number(rows[0].before) }].concat(rows.map(x => ({ t: x.t, r: Number(x.rating) }))) : [];
  }
  return {
    id: user.id,
    username: user.username,
    country: user.country || null,
    club: userClub(user),
    ratingHistory,
    avatarVersion: user.avatar_version || null,
    rating: user.rating || 1500,
    ratingsByMode: user.ratings_by_mode,
    stats: user.stats || { wins: 0, losses: 0, draws: 0 },
    statsByMode: user.stats_by_mode,
    createdAt: user.created_at || null,
    cheater: user.fairplay_flag === 'cheater',
    recentGames
  };
}

// --- Yutuqlar (shartlar server.js da) ---
async function getAchievements(userId) {
  return dbAll('SELECT key, earned_at as "earnedAt" FROM user_achievements WHERE user_id = ? ORDER BY earned_at ASC', [userId]);
}
async function addAchievement(userId, key) {
  const exists = await dbGet('SELECT id FROM user_achievements WHERE user_id = ? AND key = ?', [userId, key]);
  if (exists) return false;
  await dbRun('INSERT INTO user_achievements (id, user_id, key, earned_at) VALUES (?, ?, ?, ?)', [uuidv4(), userId, key, new Date().toISOString()]);
  return true;
}
async function countFriends(userId) {
  const r = await dbGet('SELECT COUNT(*) as "n" FROM friends WHERE user_id = ?', [userId]);
  return Number(r && r.n) || 0;
}

// --- Kuzatish ---
async function setFollow(followerId, followeeId, on) {
  await dbRun('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?', [followerId, followeeId]);
  if (on) await dbRun('INSERT INTO follows (id, follower_id, followee_id, created_at) VALUES (?, ?, ?, ?)', [uuidv4(), followerId, followeeId, new Date().toISOString()]);
}
async function followCounts(userId) {
  const a = await dbGet('SELECT COUNT(*) as "n" FROM follows WHERE followee_id = ?', [userId]);
  const b = await dbGet('SELECT COUNT(*) as "n" FROM follows WHERE follower_id = ?', [userId]);
  return { followers: Number(a && a.n) || 0, following: Number(b && b.n) || 0 };
}
async function isFollowing(followerId, followeeId) {
  return !!(await dbGet('SELECT id FROM follows WHERE follower_id = ? AND followee_id = ?', [followerId, followeeId]));
}
async function getFollowerIds(userId) {
  return (await dbAll('SELECT follower_id as "id" FROM follows WHERE followee_id = ?', [userId])).map(r => r.id);
}
// Men kuzatayotganlar + do'stlarim (bosh sahifa uchun)
async function getCircle(userId) {
  const rows = await dbAll(`SELECT u.id, u.username, u.country, u.rating, u.avatar_version as "avatarVersion" FROM follows f JOIN users u ON u.id = f.followee_id WHERE f.follower_id = ?`, [userId]);
  const friends = await dbAll(`SELECT u.id, u.username, u.country, u.rating, u.avatar_version as "avatarVersion" FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ?`, [userId]);
  const map = new Map();
  for (const r of rows) map.set(r.id, { ...r, follow: true, friend: false });
  for (const r of friends) map.set(r.id, { ...(map.get(r.id) || r), friend: true, follow: !!(map.get(r.id) || {}).follow });
  return [...map.values()];
}

// --- Sayt yangiliklari (adminlar yozadi) ---
async function listNewsPosts(limit) {
  return dbAll(`SELECT n.id, n.title, n.body, n.created_at as "createdAt", u.username as "author" FROM news_posts n LEFT JOIN users u ON u.id = n.author_id ORDER BY n.created_at DESC LIMIT ${Math.max(1, Math.min(50, Number(limit) || 30))}`);
}
async function addNewsPost(authorId, title, body) {
  const id = uuidv4();
  await dbRun('INSERT INTO news_posts (id, author_id, title, body, created_at) VALUES (?, ?, ?, ?, ?)', [id, authorId, title, body, new Date().toISOString()]);
  return id;
}
async function deleteNewsPost(id) {
  await dbRun('DELETE FROM news_posts WHERE id = ?', [id]);
}

// --- O'yinlar tarixi (filtr va sahifalash) ---
function historyEntries(user) {
  return (Array.isArray(user.history) ? user.history : []).slice().reverse();
}
function filterHistory(list, f) {
  const q = String(f.q || '').trim().toLowerCase();
  return list.filter(g => {
    if (f.mode && f.mode !== 'all' && (g.timeControl || '') !== f.mode) return false;
    if (f.result && f.result !== 'all' && g.result !== f.result) return false;
    if (f.color && f.color !== 'all' && g.color !== f.color) return false;
    if (q && !String(g.opponent || '').toLowerCase().includes(q)) return false;
    return true;
  });
}

// --- Kengaytirilgan statistika ---
async function getExtendedStats(user) {
  const history = Array.isArray(user.history) ? user.history : [];
  let longest = 0, run = 0;
  for (const g of history) { if (g.result === 'win') { run++; longest = Math.max(longest, run); } else run = 0; }
  let current = 0;
  for (let i = history.length - 1; i >= 0 && history[i].result === 'win'; i--) current++;
  const blank = () => ({ win: 0, draw: 0, loss: 0 });
  const byColor = { w: blank(), b: blank() };
  const winsBy = {}, lossesBy = {};
  const opp = new Map();
  for (const g of history) {
    if (g.color === 'w' || g.color === 'b') byColor[g.color][g.result] = (byColor[g.color][g.result] || 0) + 1;
    if (g.reason && g.result === 'win') winsBy[g.reason] = (winsBy[g.reason] || 0) + 1;
    if (g.reason && g.result === 'loss') lossesBy[g.reason] = (lossesBy[g.reason] || 0) + 1;
    if (g.opponent) {
      const o = opp.get(g.opponent) || { name: g.opponent, games: 0, win: 0, draw: 0, loss: 0 };
      o.games++; o[g.result] = (o[g.result] || 0) + 1;
      opp.set(g.opponent, o);
    }
  }
  const best = {};
  for (const mode of RATING_MODES) {
    const r = await dbGet('SELECT MAX(rating) as "m" FROM rating_history WHERE user_id = ? AND mode = ?', [user.id, mode]);
    const peak = Number(r && r.m) || 0;
    best[mode] = Math.max(peak, (user.ratings_by_mode || {})[mode] || 0);
  }
  const lengths = history.map(g => (Array.isArray(g.moves) ? g.moves.length : 0)).filter(Boolean);
  return {
    games: history.length,
    longestStreak: longest,
    currentStreak: current,
    byColor,
    winsBy,
    lossesBy,
    best,
    avgMoves: lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length / 2) : 0,
    topOpponents: [...opp.values()].sort((a, b) => b.games - a.games).slice(0, 5)
  };
}

// --- Fair-play ---
async function addFairplayGame(row) {
  await dbRun('INSERT INTO fairplay_games (id, user_id, opponent_id, mode, moves, blurs, avg_ms, cv, result, suspicious, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), row.userId, row.opponentId || null, row.mode || null, row.moves, row.blurs, row.avgMs, row.cv, row.result, row.suspicious ? 1 : 0, new Date().toISOString()]);
}
async function recentFairplay(userId, limit) {
  return dbAll(`SELECT moves, blurs, avg_ms as "avgMs", cv, result, suspicious, created_at as "createdAt" FROM fairplay_games WHERE user_id = ? ORDER BY created_at DESC LIMIT ${Number(limit) || 20}`, [userId]);
}
async function setFairplayFlag(userId, flag) {
  await dbRun('UPDATE users SET fairplay_flag = ? WHERE id = ?', [flag || null, userId]);
}
// Admin: shubhali o'yinlari bor yoki belgilangan o'yinchilar
async function fairplayOverview() {
  const rows = await dbAll(`SELECT user_id as "userId", COUNT(*) as "games", SUM(suspicious) as "sus", SUM(blurs) as "blurs", SUM(moves) as "moves",
    SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as "wins" FROM fairplay_games GROUP BY user_id`);
  const flagged = await dbAll("SELECT id FROM users WHERE fairplay_flag IS NOT NULL");
  const ids = new Set(rows.filter(r => Number(r.sus) > 0).map(r => r.userId).concat(flagged.map(f => f.id)));
  const out = [];
  for (const id of ids) {
    const u = await dbGet('SELECT id, username, rating, fairplay_flag as "flag", banned_until as "bannedUntil" FROM users WHERE id = ?', [id]);
    if (!u) continue;
    const r = rows.find(x => x.userId === id) || {};
    out.push({ ...u, games: Number(r.games) || 0, suspicious: Number(r.sus) || 0, blurRate: Number(r.moves) ? Math.round(Number(r.blurs) / Number(r.moves) * 100) : 0,
      winRate: Number(r.games) ? Math.round(Number(r.wins) / Number(r.games) * 100) : 0 });
  }
  return out.sort((a, b) => (b.flag === 'flagged') - (a.flag === 'flagged') || b.suspicious - a.suspicious);
}
// Qoidabuzarga yutqazganlarning reytingini qaytarish (faqat hali qaytarilmaganlar)
async function refundAgainst(cheaterId) {
  const rows = await dbAll('SELECT id, user_id as "userId", mode, rating_before as "before", rating FROM rating_history WHERE opponent_id = ? AND (refunded IS NULL OR refunded = 0)', [cheaterId]);
  const refunds = [];
  for (const r of rows) {
    const lost = Number(r.before) - Number(r.rating);
    await dbRun('UPDATE rating_history SET refunded = 1 WHERE id = ?', [r.id]);
    if (lost <= 0) continue;
    const u = await getUserById(r.userId);
    if (!u) continue;
    const byMode = u.ratings_by_mode;
    byMode[r.mode] = (byMode[r.mode] || 1500) + lost;
    const overall = r.mode === 'chess960' ? (u.rating || 1500) : (u.rating || 1500) + lost;
    await dbRun('UPDATE users SET rating = ?, ratings_by_mode = ? WHERE id = ?', [overall, JSON.stringify(byMode), u.id]);
    refunds.push({ userId: u.id, mode: r.mode, amount: lost });
  }
  return refunds;
}

// --- 🚩 Bayroqlar bellashuvi (war_*) ---
async function ratingHistorySeason(userId) {
  const rows = await dbAll('SELECT mode, rating_before as "before", rating, created_at as "t", opponent_id as "opponentId" FROM rating_history WHERE user_id = ? ORDER BY created_at ASC', [userId]);
  return rows;
}
async function addWarPoints(row) {
  await dbRun('INSERT INTO war_points (id, season, club_country, club_code, user_id, opponent_code, points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), row.season, row.club, row.code, row.userId || null, row.opponentCode || null, row.points, new Date().toISOString()]);
}
async function warTotals(season) {
  const rows = await dbAll('SELECT club_code as "code", club_country as "country", SUM(points) as "points", COUNT(DISTINCT user_id) as "fighters" FROM war_points WHERE season = ? GROUP BY club_code, club_country', [season]);
  return rows.map(r => ({ code: r.code, country: r.country, points: Number(r.points) || 0, fighters: Number(r.fighters) || 0 }));
}
async function warUserPoints(season, userId) {
  const r = await dbGet('SELECT SUM(points) as "p", COUNT(*) as "n" FROM war_points WHERE season = ? AND user_id = ?', [season, userId]);
  return { points: Number(r && r.p) || 0, games: Number(r && r.n) || 0 };
}
async function warTopContributors(season, code) {
  const rows = await dbAll('SELECT w.user_id as "userId", u.username, SUM(w.points) as "points" FROM war_points w JOIN users u ON u.id = w.user_id WHERE w.season = ? AND w.club_code = ? GROUP BY w.user_id, u.username', [season, code]);
  return rows.map(r => ({ username: r.username, points: Number(r.points) || 0 })).sort((a, b) => b.points - a.points).slice(0, 5);
}
async function getWarSeason(season) {
  return dbGet('SELECT season, ruler_country as "country", ruler_code as "code", territories, points FROM war_seasons WHERE season = ?', [season]);
}
async function saveWarSeason(season, ruler) {
  if (await getWarSeason(season)) return false;
  await dbRun('INSERT INTO war_seasons (id, season, ruler_country, ruler_code, territories, points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), season, ruler ? ruler.country : null, ruler ? ruler.code : null, ruler ? ruler.territories : 0, ruler ? ruler.points : 0, new Date().toISOString()]);
  return true;
}
async function listWarSeasons(limit) {
  return dbAll(`SELECT season, ruler_country as "country", ruler_code as "code", territories, points FROM war_seasons WHERE ruler_code IS NOT NULL ORDER BY season DESC LIMIT ${Number(limit) || 6}`);
}
async function getClubMemberIdsByCode(code) {
  return (await dbAll('SELECT id FROM users WHERE club_code = ?', [code])).map(r => r.id);
}

// --- Chat moderatsiyasi ---
async function adminIds() {
  return (await dbAll("SELECT id FROM users WHERE role = 'admin'")).map(r => r.id);
}
async function setMute(userId, until) {
  await dbRun('UPDATE users SET muted_until = ? WHERE id = ?', [until, userId]);
}
async function loadMutes() {
  return dbAll("SELECT id, muted_until as \"until\" FROM users WHERE muted_until IS NOT NULL");
}
async function listChatFilter() {
  return (await dbAll('SELECT word FROM chat_filter ORDER BY word')).map(r => r.word);
}
async function addChatFilterWord(word) {
  const exists = await dbGet('SELECT id FROM chat_filter WHERE word = ?', [word]);
  if (!exists) await dbRun('INSERT INTO chat_filter (id, word, created_at) VALUES (?, ?, ?)', [uuidv4(), word, new Date().toISOString()]);
}
async function removeChatFilterWord(word) {
  await dbRun('DELETE FROM chat_filter WHERE word = ?', [word]);
}
async function recentClubMessages(filter) {
  let sql = "SELECT cm.id, cm.room_id as \"roomId\", cm.message, cm.created_at as \"createdAt\", u.id as \"userId\", u.username, u.muted_until as \"mutedUntil\" FROM chat_messages cm JOIN users u ON u.id = cm.sender_id WHERE cm.room_id LIKE 'club%'";
  const params = [];
  if (filter.club) { sql += ' AND cm.room_id = ?'; params.push('club_' + filter.club); }
  if (filter.user) { sql += ' AND LOWER(u.username) LIKE ?'; params.push('%' + String(filter.user).toLowerCase() + '%'); }
  sql += ' ORDER BY cm.created_at DESC LIMIT 100';
  return dbAll(sql, params);
}

function userClub(user) {
  return user && user.club_country ? { name: user.club_country, code: user.club_code || null, joinedAt: user.club_joined_at || null } : null;
}

async function setUserCountryClub(userId, name, code) {
  const joinedAt = new Date().toISOString();
  await dbRun('UPDATE users SET club_country = ?, club_code = ?, club_joined_at = ? WHERE id = ?', [name, code, joinedAt, userId]);
  return { name, code, joinedAt };
}

async function clearUserCountryClub(userId) {
  await dbRun('UPDATE users SET club_country = NULL, club_code = NULL, club_joined_at = NULL WHERE id = ?', [userId]);
  await dbRun('DELETE FROM club_roles WHERE user_id = ?', [userId]);
}

// --- Klub rollari: bitta kapitan + moderatorlar. Kapitan bo'lmasa — klubga eng birinchi qo'shilgan a'zo ---
async function getClubStaff(club) {
  const rows = await dbAll('SELECT r.user_id as "userId", r.role, u.username, u.club_country as "club" FROM club_roles r JOIN users u ON u.id = r.user_id WHERE r.club_country = ?', [club]);
  const current = [];
  for (const r of rows) {
    if (r.club === club) current.push(r);
    else await dbRun('DELETE FROM club_roles WHERE club_country = ? AND user_id = ?', [club, r.userId]);
  }
  let captain = current.find(r => r.role === 'captain') || null;
  let autoCaptain = null;
  if (!captain) {
    const first = await dbGet('SELECT id, username FROM users WHERE club_country = ? ORDER BY (club_joined_at IS NULL), club_joined_at ASC, username ASC LIMIT 1', [club]);
    if (first) {
      await setClubRole(club, first.id, 'captain');
      captain = { userId: first.id, username: first.username, role: 'captain' };
      autoCaptain = captain;
    }
  }
  const moderators = current.filter(r => r.role === 'moderator' && (!captain || r.userId !== captain.userId))
    .map(r => ({ userId: r.userId, username: r.username }));
  return { captain: captain ? { userId: captain.userId, username: captain.username } : null, moderators, autoCaptain };
}

// role: 'captain' | 'moderator' | 'member' (member — rol olib tashlanadi)
async function setClubRole(club, userId, role) {
  await dbRun('DELETE FROM club_roles WHERE club_country = ? AND user_id = ?', [club, userId]);
  if (role === 'captain' || role === 'moderator') {
    await dbRun('INSERT INTO club_roles (id, club_country, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)', [uuidv4(), club, userId, role, new Date().toISOString()]);
  }
}

async function listClubNews(club) {
  const rows = await dbAll('SELECT n.id, n.title, n.body, n.pinned, n.created_at as "createdAt", n.author_id as "authorId", u.username as "author" FROM club_news n LEFT JOIN users u ON u.id = n.author_id WHERE n.club_country = ? ORDER BY n.created_at DESC LIMIT 30', [club]);
  return rows.map(r => ({ ...r, pinned: !!Number(r.pinned) }))
    .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function addClubNews(club, authorId, title, body, pinned) {
  const id = uuidv4();
  await dbRun('INSERT INTO club_news (id, club_country, author_id, title, body, pinned, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, club, authorId, title, body, pinned ? 1 : 0, new Date().toISOString()]);
  return id;
}

async function getClubNews(id) {
  return dbGet('SELECT id, club_country as "club", pinned FROM club_news WHERE id = ?', [id]);
}

async function deleteClubNews(id) {
  await dbRun('DELETE FROM club_news WHERE id = ?', [id]);
}

async function setClubNewsPinned(id, pinned) {
  await dbRun('UPDATE club_news SET pinned = ? WHERE id = ?', [pinned ? 1 : 0, id]);
}

async function getClubMemberIds(club) {
  const rows = await dbAll('SELECT id FROM users WHERE club_country = ?', [club]);
  return rows.map(r => r.id);
}

async function getChatMessageById(id) {
  return dbGet('SELECT id, room_id as "roomId", sender_id as "senderId" FROM chat_messages WHERE id = ?', [id]);
}

async function deleteChatMessage(id) {
  await dbRun('DELETE FROM chat_messages WHERE id = ?', [id]);
}

// --- Bildirishnomalar ---
// collapseKey berilsa — shu kalitli o'qilmagan bildirishnoma yangilanadi (masalan, bir suhbatdoshdan bir nechta xabar)
async function addNotification(userId, type, data, collapseKey) {
  const now = new Date().toISOString();
  if (collapseKey) {
    const rows = await dbAll('SELECT id, data FROM notifications WHERE user_id = ? AND type = ? AND is_read = 0', [userId, type]);
    const same = rows.find(r => (parseJson(r.data) || {}).key === collapseKey);
    if (same) {
      const prev = parseJson(same.data) || {};
      const merged = { ...data, key: collapseKey, count: (prev.count || 1) + 1 };
      await dbRun('UPDATE notifications SET data = ?, created_at = ? WHERE id = ?', [JSON.stringify(merged), now, same.id]);
      return { id: same.id, type, data: merged, read: false, createdAt: now };
    }
  }
  const id = uuidv4();
  const payload = collapseKey ? { ...data, key: collapseKey, count: 1 } : data;
  await dbRun('INSERT INTO notifications (id, user_id, type, data, is_read, created_at) VALUES (?, ?, ?, ?, 0, ?)', [id, userId, type, JSON.stringify(payload || {}), now]);
  // Har foydalanuvchida oxirgi 100 tasi saqlanadi
  const old = await dbAll('SELECT id FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1000 OFFSET 100', [userId]);
  for (const o of old) await dbRun('DELETE FROM notifications WHERE id = ?', [o.id]);
  return { id, type, data: payload || {}, read: false, createdAt: now };
}

async function listNotifications(userId) {
  const rows = await dbAll('SELECT id, type, data, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [userId]);
  const unreadRow = await dbGet('SELECT COUNT(*) as "n" FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
  return {
    notifications: rows.map(r => ({ id: r.id, type: r.type, data: parseJson(r.data) || {}, read: !!Number(r.is_read), createdAt: r.created_at })),
    unread: Number(unreadRow && unreadRow.n) || 0
  };
}

async function markNotificationsRead(userId) {
  await dbRun('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
}

async function clearNotifications(userId) {
  await dbRun('DELETE FROM notifications WHERE user_id = ?', [userId]);
}

function statsTotals(stats) {
  const s = stats || {};
  return { wins: s.wins || 0, losses: s.losses || 0, draws: s.draws || 0 };
}

// Har bir davlat klubidagi a'zolar soni
async function getCountryClubSummary() {
  const rows = await dbAll('SELECT club_country, club_code, COUNT(*) as "members" FROM users WHERE club_country IS NOT NULL GROUP BY club_country, club_code');
  return rows.map(r => ({ name: r.club_country, code: r.club_code, members: Number(r.members) || 0 }));
}

// Klub a'zolari va umumiy statistika (o'yinlar soni, klub ballari: g'alaba 10, durrang 5, mag'lubiyat 1)
// Klub a'zolari va statistikasi. Musobaqalar va klub ballari — faqat ligadagi ishtirokdan:
// o'ynab bo'lingan liga/Chempionlar ligasi bahslari soni va ularda yig'ilgan ochkolar (g'alaba 3, durrang 1)
async function getCountryClubMembers(name) {
  const rows = await dbAll('SELECT username, rating, ratings_by_mode, stats, club_joined_at FROM users WHERE club_country = ? ORDER BY rating DESC', [name]);
  const members = rows.map(r => {
    const s = statsTotals(parseJson(r.stats));
    return { username: r.username, rating: r.rating || 1500, ratingsByMode: normalizeRatingsByMode(r), ...s, joinedAt: r.club_joined_at };
  });
  const eventsRow = await dbGet("SELECT COUNT(*) as \"n\" FROM league_matches WHERE status = 'finished' AND (home_club = ? OR away_club = ?)", [name, name]);
  const pointsRow = await dbGet('SELECT COALESCE(SUM(match_points), 0) as \"p\" FROM league_clubs WHERE club_name = ?', [name]);
  const events = Number(eventsRow && eventsRow.n) || 0;
  const points = Number(pointsRow && pointsRow.p) || 0;
  return { members, stats: { members: members.length, events, points } };
}

async function getUserGames(userId) {
  const user = await getUserById(userId);
  if (!user) return null;
  return user.history || [];
}

async function saveGame(userId, gameData) {
  const id = uuidv4();
  await dbRun('INSERT INTO games (id, user_id, result, opponent, mode, time_control, moves, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, userId, gameData.result, gameData.opponent || 'Online', gameData.mode || 'Online o\'yin', gameData.timeControl || 'blitz', JSON.stringify(gameData.moves || []), new Date().toISOString()]);
  return { id, ...gameData };
}

function eloChange(playerRating, opponentRating, result) {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const score = result === 'win' ? 1 : (result === 'loss' ? 0 : 0.5);
  return Math.round(32 * (score - expectedScore));
}

// Umumiy reyting va (berilgan bo'lsa) o'yin rejimi reytingini yangilaydi
async function updateUserRatingByResult(userId, result, opponentRating, timeControl, opponentModeRating, opponentId) {
  const user = await getUserById(userId);
  if (!user) return null;
  const playerRating = user.rating || 1500;
  // Chess960 o'yini umumiy reytingni o'zgartirmaydi — faqat o'z reytingini
  const ratingChange = timeControl === 'chess960' ? 0 : eloChange(playerRating, Number(opponentRating) || 1500, result);
  const newRating = Math.max(100, playerRating + ratingChange);

  const ratingsByMode = user.ratings_by_mode;
  let modeChange = null;
  if (RATING_MODES.includes(timeControl)) {
    const modeRating = ratingsByMode[timeControl];
    modeChange = eloChange(modeRating, Number(opponentModeRating) || Number(opponentRating) || 1500, result);
    ratingsByMode[timeControl] = Math.max(100, modeRating + modeChange);
    await dbRun('INSERT INTO rating_history (id, user_id, mode, rating_before, rating, created_at, opponent_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), userId, timeControl, modeRating, ratingsByMode[timeControl], new Date().toISOString(), opponentId || null]);
  }

  await dbRun('UPDATE users SET rating = ?, ratings_by_mode = ? WHERE id = ?', [newRating, JSON.stringify(ratingsByMode), userId]);
  return { success: true, newRating, change: ratingChange, mode: modeChange === null ? null : timeControl, modeChange, ratingsByMode };
}

async function matchmakingJoin(username, rating) {
  // This is handled in server.js with in-memory queue
  return { success: true };
}

async function matchmakingLeave(username) {
  return { success: true };
}

async function createTournament(tournamentData) {
  const id = uuidv4();
  const { name, description, maxPlayers, creatorId, clubId, tournamentType, timeControl, rounds, clubIdA, clubIdB } = tournamentData;
  await dbRun('INSERT INTO tournaments (id, name, description, max_players, creator_id, club_id, tournament_type, time_control, rounds, current_round, club_id_a, club_id_b, is_arena, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, name, description || '', maxPlayers || 16, creatorId, clubId || null, tournamentType || 'arena', timeControl || '5+3', rounds || 7, 0, clubIdA || null, clubIdB || null, tournamentType === 'arena' ? 1 : 0, new Date().toISOString()]);
  return { id, name };
}

async function getTournaments(filter) {
  let sql = 'SELECT * FROM tournaments WHERE 1=1';
  const params = [];
  if (filter && filter.type) { sql += ' AND tournament_type = ?'; params.push(filter.type); }
  sql += ' ORDER BY created_at DESC';
  const rows = await dbAll(sql, ...params);
  return rows.map(t => ({ ...t, is_arena: !!t.is_arena }));
}

async function getTournamentById(id) {
  return await dbGet('SELECT * FROM tournaments WHERE id = ?', id);
}

// Joriy soat uchun arena mavjud bo'lmasa, uni yaratadi.
async function ensureCurrentArena(slot) {
  let arena = await dbGet(
    "SELECT * FROM tournaments WHERE is_arena = 1 AND time_control = ? AND status = 'active' AND started_at >= ? AND started_at < ? ORDER BY created_at DESC LIMIT 1",
    [slot.code, slot.slotStart, slot.slotEnd]
  );
  if (!arena) {
    const id = uuidv4();
    await dbRun(
      'INSERT INTO tournaments (id, name, description, max_players, creator_id, tournament_type, time_control, rounds, current_round, is_arena, status, started_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, `Arena ${slot.name}`, '24/7 avtomatik aylanuvchi arena', 9999, null, 'arena', slot.code, slot.rounds, 0, 1, 'active', slot.slotStart, slot.slotStart]
    );
    arena = await getTournamentById(id);
  }
  return { ...arena, is_arena: true };
}

async function tournamentJoin(tournamentId, userId, club) {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) return { success: false, message: 'Turnir topilmadi!' };
  if (!tournament.is_arena && tournament.status !== 'waiting') return { success: false, message: 'Turnir allaqachon boshlangan!' };
  if (tournament.current_players >= tournament.max_players) return { success: false, message: 'Turnir to\'la!' };

  const existing = await dbGet('SELECT id FROM tournament_participants WHERE tournament_id = ? AND user_id = ?', [tournamentId, userId]);
  if (existing) return { success: false, message: 'Siz allaqachon turnirdasiz!' };

  await dbRun('INSERT INTO tournament_participants (id, tournament_id, user_id, club, joined_at) VALUES (?, ?, ?, ?, ?)', [uuidv4(), tournamentId, userId, club || null, new Date().toISOString()]);
  await dbRun('UPDATE tournaments SET current_players = current_players + 1 WHERE id = ?', [tournamentId]);

  if (tournament.is_arena) {
    await dbRun("UPDATE tournaments SET status = 'active' WHERE id = ?", [tournamentId]);
  }

  return { success: true, message: 'Turnirga qo\'shildingiz!' };
}

async function tournamentStart(tournamentId, creatorId) {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) return { success: false, message: 'Turnir topilmadi!' };
  if (tournament.creator_id !== creatorId) return { success: false, message: 'Faqat yaratuvchi boshlashi mumkin!' };
  if (tournament.current_players < 2) return { success: false, message: 'Kamida 2 o\'yinchi kerak!' };

  await dbRun("UPDATE tournaments SET status = 'active', started_at = ? WHERE id = ?", [new Date().toISOString(), tournamentId]);
  return { success: true, message: 'Turnir boshlandi!' };
}

async function getTournamentParticipants(tournamentId) {
  const rows = await dbAll(`SELECT tp.id, tp.user_id as "userId", tp.score, tp.club, tp.opponents, u.username, u.rating FROM tournament_participants tp JOIN users u ON tp.user_id = u.id WHERE tp.tournament_id = ?`, [tournamentId]);
  return rows.map(r => ({ id: r.id, userId: r.userId, username: r.username, rating: r.rating || 1500, score: r.score || 0, club: r.club || null, opponents: parseJson(r.opponents) || [] }));
}

async function getTournamentMatches(tournamentId, round) {
  let sql = `SELECT tm.id, tm.tournament_id, tm.round, tm.board, tm.game_num as "gameNum", tm.player1_id as "player1Id", tm.player2_id as "player2Id", tm.team_a_player as "teamAPlayerId", tm.team_b_player as "teamBPlayerId", tm.white_id as "whiteId", tm.black_id as "blackId", tm.winner_id as "winnerId", tm.status, tm.completed_at, u1.username as "player1Username", u2.username as "player2Username" FROM tournament_matches tm LEFT JOIN users u1 ON tm.player1_id = u1.id LEFT JOIN users u2 ON tm.player2_id = u2.id WHERE tm.tournament_id = ?`;
  const params = [tournamentId];
  if (round !== undefined && round !== null) { sql += ' AND tm.round = ?'; params.push(round); }
  sql += ' ORDER BY tm.round ASC, tm.board ASC, tm.game_num ASC, tm.created_at ASC';
  const matches = await dbAll(sql, ...params);
  return matches.map(m => ({
    ...m,
    teamAPlayerUsername: m.teamAPlayerId ? (m.player1Username || m.player2Username) : undefined,
    teamBPlayerUsername: m.teamBPlayerId ? (m.player2Username || m.player1Username) : undefined,
    whiteUsername: m.whiteId ? m.player1Username : undefined,
    blackUsername: m.blackId ? m.player2Username : undefined
  }));
}

async function saveTournamentMatch(match) {
  const existing = await dbGet('SELECT id FROM tournament_matches WHERE id = ?', [match.id]);
  const values = [match.id, match.tournamentId, match.round || 1, match.board || null, match.gameNum || null, match.player1Id || null, match.player2Id || null, match.teamAPlayerId || null, match.teamBPlayerId || null, match.whiteId || null, match.blackId || null, match.winnerId || null, match.status || 'active', match.completedAt || null];
  if (existing) {
    await dbRun('UPDATE tournament_matches SET winner_id = ?, status = ?, board = ?, game_num = ?, team_a_player = ?, team_b_player = ?, white_id = ?, black_id = ? WHERE id = ?', [match.winnerId || null, match.status || 'active', match.board || null, match.gameNum || null, match.teamAPlayerId || null, match.teamBPlayerId || null, match.whiteId || null, match.blackId || null, match.id]);
  } else {
    await dbRun('INSERT INTO tournament_matches (id, tournament_id, round, board, game_num, player1_id, player2_id, team_a_player, team_b_player, white_id, black_id, winner_id, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', values.concat([new Date().toISOString()]));
  }
}

async function updateTournamentRound(tournamentId, round, status) {
  if (status) await dbRun('UPDATE tournaments SET current_round = ?, status = ? WHERE id = ?', [round, status, tournamentId]);
  else await dbRun('UPDATE tournaments SET current_round = ? WHERE id = ?', [round, tournamentId]);
}

async function addParticipantScore(tournamentId, userId, scoreDelta, opponentId) {
  const p = await dbGet('SELECT * FROM tournament_participants WHERE tournament_id = ? AND user_id = ?', [tournamentId, userId]);
  if (p) {
    const newScore = (p.score || 0) + scoreDelta;
    let opponents = parseJson(p.opponents) || [];
    if (opponentId) opponents.push(opponentId);
    await dbRun('UPDATE tournament_participants SET score = ?, opponents = ? WHERE tournament_id = ? AND user_id = ?', [newScore, JSON.stringify(opponents), tournamentId, userId]);
  }
}

async function getTournamentStandings(tournamentId) {
  const rows = await dbAll(`SELECT tp.score, u.username, u.rating, tp.club FROM tournament_participants tp JOIN users u ON tp.user_id = u.id WHERE tp.tournament_id = ? ORDER BY tp.score DESC, u.rating DESC`, [tournamentId]);
  return rows;
}

async function sendFriendRequest(senderId, receiverId) {
  const already = await dbGet('SELECT id FROM friends WHERE user_id = ? AND friend_id = ?', [senderId, receiverId]);
  if (already) return { success: false, message: 'Siz allaqachon do\'stsiz!' };
  // U ham bizga so'rov yuborgan bo'lsa — darhol do'st bo'lamiz
  const reverse = await dbGet('SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = ?', [receiverId, senderId, 'pending']);
  if (reverse) return acceptFriendRequest(reverse.id, senderId);
  const existing = await dbGet('SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = ?', [senderId, receiverId, 'pending']);
  if (existing) return { success: false, message: 'So\'rov allaqachon yuborilgan!' };
  // Juftlik uchun bitta qator (UNIQUE): avval rad etilgan/bekor qilingan so'rov bo'lsa — qayta faollashtiramiz
  const now = new Date().toISOString();
  const old = await dbGet('SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ?', [senderId, receiverId]);
  if (old) await dbRun("UPDATE friend_requests SET status = 'pending', created_at = ?, updated_at = ? WHERE id = ?", [now, now, old.id]);
  else await dbRun('INSERT INTO friend_requests (id, sender_id, receiver_id, status, created_at) VALUES (?, ?, ?, ?, ?)', [uuidv4(), senderId, receiverId, 'pending', now]);
  return { success: true, message: 'Do\'stlik so\'rovi yuborildi!' };
}

async function acceptFriendRequest(requestId, receiverId) {
  const req = await dbGet('SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = ?', [requestId, receiverId, 'pending']);
  if (!req) return { success: false, message: 'So\'rov topilmadi!' };
  await dbRun("UPDATE friend_requests SET status = 'accepted', updated_at = ? WHERE id = ?", [new Date().toISOString(), requestId]);
  await dbRun('INSERT INTO friends (id, user_id, friend_id, created_at) VALUES (?, ?, ?, ?)', [uuidv4(), req.sender_id, req.receiver_id, new Date().toISOString()]);
  await dbRun('INSERT INTO friends (id, user_id, friend_id, created_at) VALUES (?, ?, ?, ?)', [uuidv4(), req.receiver_id, req.sender_id, new Date().toISOString()]);
  return { success: true, message: 'Do\'stlik qabul qilindi!', senderId: req.sender_id };
}

async function declineFriendRequest(requestId, receiverId) {
  const req = await dbGet('SELECT id FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = ?', [requestId, receiverId, 'pending']);
  if (!req) return { success: false, message: 'So\'rov topilmadi!' };
  await dbRun("UPDATE friend_requests SET status = 'declined', updated_at = ? WHERE id = ?", [new Date().toISOString(), requestId]);
  return { success: true, message: 'So\'rov rad etildi!' };
}

// Ikki o'yinchi orasidagi holat: friends | outgoing (men so'radim) | incoming (u so'radi) | none
async function getFriendshipStatus(userId, otherId) {
  if (await dbGet('SELECT id FROM friends WHERE user_id = ? AND friend_id = ?', [userId, otherId])) return { status: 'friends' };
  const out = await dbGet('SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = ?', [userId, otherId, 'pending']);
  if (out) return { status: 'outgoing', requestId: out.id };
  const inc = await dbGet('SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = ?', [otherId, userId, 'pending']);
  if (inc) return { status: 'incoming', requestId: inc.id };
  return { status: 'none' };
}

async function removeFriend(userId, otherId) {
  await dbRun('DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', [userId, otherId, otherId, userId]);
  return { success: true, message: 'Do\'stlik bekor qilindi' };
}

async function cancelFriendRequest(senderId, receiverId) {
  await dbRun("UPDATE friend_requests SET status = 'cancelled', updated_at = ? WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'", [new Date().toISOString(), senderId, receiverId]);
  return { success: true, message: 'So\'rov bekor qilindi' };
}

async function getFriends(userId) {
  const rows = await dbAll(`SELECT u.id, u.username, u.rating, u.last_active FROM friends f JOIN users u ON f.friend_id = u.id WHERE f.user_id = ? ORDER BY u.last_active DESC`, [userId]);
  return rows;
}

async function getFriendRequests(receiverId) {
  const rows = await dbAll(`SELECT fr.id, u.username, u.rating, fr.created_at FROM friend_requests fr JOIN users u ON fr.sender_id = u.id WHERE fr.receiver_id = ? AND fr.status = ?`, [receiverId, 'pending']);
  return rows;
}

async function getChatMessages({ userId, roomId, viewerId }) {
  let sql = 'SELECT cm.*, u.username FROM chat_messages cm JOIN users u ON cm.sender_id = u.id';
  const params = [];
  if (roomId) {
    sql += ' WHERE cm.room_id = ?'; params.push(roomId);
    const cleared = await clearedAt(viewerId, roomId);
    if (cleared) { sql += ' AND cm.created_at > ?'; params.push(cleared); }
  }
  else if (userId) { sql += ' WHERE (cm.sender_id = ? AND cm.receiver_id = ?) OR (cm.sender_id = ? AND cm.receiver_id = ?)'; params.push(userId, userId, userId, userId); }
  else { sql += ' WHERE cm.receiver_id IS NULL AND cm.room_id IS NULL'; }
  sql += ' ORDER BY cm.created_at DESC LIMIT 100';
  const rows = await dbAll(sql, ...params);
  return rows.reverse();
}

// --- Shaxsiy xabarlar (dm_<id1>_<id2> xonalari) ---
async function markRoomRead(userId, roomId) {
  const now = new Date().toISOString();
  const existing = await dbGet('SELECT id FROM chat_reads WHERE user_id = ? AND room_id = ?', [userId, roomId]);
  if (existing) await dbRun('UPDATE chat_reads SET last_read_at = ? WHERE id = ?', [now, existing.id]);
  else await dbRun('INSERT INTO chat_reads (id, user_id, room_id, last_read_at) VALUES (?, ?, ?, ?)', [uuidv4(), userId, roomId, now]);
}

async function clearedAt(userId, roomId) {
  if (!userId || !roomId) return '';
  const row = await dbGet('SELECT cleared_at FROM chat_clears WHERE user_id = ? AND room_id = ?', [userId, roomId]);
  return row ? row.cleared_at : '';
}

async function clearChat(userId, roomId) {
  const now = new Date().toISOString();
  const existing = await dbGet('SELECT id FROM chat_clears WHERE user_id = ? AND room_id = ?', [userId, roomId]);
  if (existing) await dbRun('UPDATE chat_clears SET cleared_at = ? WHERE id = ?', [now, existing.id]);
  else await dbRun('INSERT INTO chat_clears (id, user_id, room_id, cleared_at) VALUES (?, ?, ?, ?)', [uuidv4(), userId, roomId, now]);
}

async function unreadInRoom(userId, roomId) {
  const read = await dbGet('SELECT last_read_at FROM chat_reads WHERE user_id = ? AND room_id = ?', [userId, roomId]);
  const since = [read ? read.last_read_at : '', await clearedAt(userId, roomId)].sort().pop();
  const row = await dbGet('SELECT COUNT(*) as "n" FROM chat_messages WHERE room_id = ? AND sender_id <> ? AND created_at > ?',
    [roomId, userId, since]);
  return Number(row && row.n) || 0;
}

// Foydalanuvchining suhbatlari: sherik, oxirgi xabar va o'qilmaganlar soni (yangisi birinchi)
async function getConversations(userId) {
  const rooms = await dbAll(`SELECT room_id, MAX(created_at) as "last_at" FROM chat_messages
    WHERE room_id LIKE 'dm%' AND (sender_id = ? OR receiver_id = ?)
    GROUP BY room_id ORDER BY MAX(created_at) DESC LIMIT 50`, [userId, userId]);
  const result = [];
  for (const r of rooms) {
    if (!r.room_id.startsWith('dm_')) continue;
    const partnerId = r.room_id.slice(3).split('_').find(id => id !== userId);
    if (!partnerId) continue;
    const partner = await dbGet('SELECT id, username, country FROM users WHERE id = ?', [partnerId]);
    if (!partner) continue;
    const cleared = await clearedAt(userId, r.room_id);
    if (cleared && String(r.last_at) <= cleared) continue;
    const last = await dbGet('SELECT message, sender_id, created_at FROM chat_messages WHERE room_id = ? ORDER BY created_at DESC LIMIT 1', [r.room_id]);
    result.push({
      roomId: r.room_id,
      partner: { id: partner.id, username: partner.username, country: partner.country || null },
      lastMessage: last ? last.message : '',
      lastFromMe: last ? last.sender_id === userId : false,
      lastAt: last ? last.created_at : r.last_at,
      unread: await unreadInRoom(userId, r.room_id)
    });
  }
  return result;
}

async function getUnreadTotal(userId) {
  const conversations = await getConversations(userId);
  return conversations.reduce((sum, c) => sum + c.unread, 0);
}

async function sendChatMessage(senderId, receiverId, roomId, message) {
  const id = uuidv4();
  await dbRun('INSERT INTO chat_messages (id, sender_id, receiver_id, room_id, message, created_at) VALUES (?, ?, ?, ?, ?, ?)', [id, senderId, receiverId || null, roomId || null, message, new Date().toISOString()]);
  return { id };
}

async function createClub({ name, description, icon, creatorId }) {
  const id = uuidv4();
  await dbRun('INSERT INTO clubs (id, name, description, icon, creator_id, max_members, current_members, is_public, created_at) VALUES (?, ?, ?, ?, ?, 50, 1, 1, ?)', [id, name, description || '', icon || '♟️', creatorId, new Date().toISOString()]);
  await dbRun('INSERT INTO club_members (id, club_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)', [uuidv4(), id, creatorId, 'admin', new Date().toISOString()]);
  return { id, name };
}

async function getClubs() {
  return await dbAll('SELECT id, name, icon, current_members FROM clubs WHERE is_public = 1 ORDER BY created_at DESC');
}

async function getClubById(id) {
  return await dbGet('SELECT * FROM clubs WHERE id = ?', id);
}

async function joinClub(clubId, userId) {
  const club = await getClubById(clubId);
  if (!club) return { success: false, message: 'Klub topilmadi!' };
  if (club.current_members >= club.max_members) return { success: false, message: 'Klub to\'la!' };
  const existing = await dbGet('SELECT id FROM club_members WHERE club_id = ? AND user_id = ?', [clubId, userId]);
  if (existing) return { success: false, message: 'Siz allaqachon klubdasiz!' };
  await dbRun('INSERT INTO club_members (id, club_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)', [uuidv4(), clubId, userId, 'member', new Date().toISOString()]);
  await dbRun('UPDATE clubs SET current_members = current_members + 1 WHERE id = ?', [clubId]);
  return { success: true, message: 'Klubga qo\'shildingiz!' };
}

async function getClubMembers(clubId) {
  return await dbAll(`SELECT cm.role, u.username, u.rating, u.last_active FROM club_members cm JOIN users u ON cm.user_id = u.id WHERE cm.club_id = ? ORDER BY cm.joined_at ASC`, [clubId]);
}

// Klublar reytingi — davlat klublari, a'zolarning umumiy natijalari bo'yicha
async function getClubLeaderboard() {
  const rows = await dbAll('SELECT username, rating, club_country, club_code, stats FROM users WHERE club_country IS NOT NULL');
  const byClub = {};
  for (const r of rows) {
    const club = byClub[r.club_country] || (byClub[r.club_country] = { name: r.club_country, code: r.club_code, members: 0, wins: 0, losses: 0, draws: 0, ratingSum: 0, top: null });
    const s = statsTotals(parseJson(r.stats));
    const rating = Number(r.rating) || 1500;
    club.members++; club.wins += s.wins; club.losses += s.losses; club.draws += s.draws; club.ratingSum += rating;
    if (!club.top || rating > club.top.rating) club.top = { username: r.username, rating };
  }
  // Liga ochkolari va o'ynalgan bahslar (league.js jadvallaridan)
  const points = await dbAll('SELECT club_name as "name", COALESCE(SUM(match_points), 0) as "points" FROM league_clubs GROUP BY club_name');
  const pointsBy = new Map(points.map(p => [p.name, Number(p.points) || 0]));
  const leaderboard = Object.values(byClub).map(c => {
    const games = c.wins + c.losses + c.draws;
    const { ratingSum, ...rest } = c;
    return {
      ...rest, games,
      avgRating: c.members ? Math.round(ratingSum / c.members) : 0,
      leaguePoints: pointsBy.get(c.name) || 0,
      winPercentage: games > 0 ? Math.round((c.wins / games) * 1000) / 10 : 0
    };
  });
  // Tartib: liga ochkolari, o'rtacha reyting, a'zolar soni
  leaderboard.sort((x, y) => (y.leaguePoints - x.leaguePoints) || (y.avgRating - x.avgRating) || (y.members - x.members));
  return { success: true, leaderboard };
}

module.exports = {
  initDatabase,
  closeStaleArenas,
  getUserByUsername,
  getUserById,
  createUser,
  updateUserStats,
  updateUserRating,
  touchUserLastActive,
  updateUserCountry,
  deleteUserSessions,
  getLeaderboard,
  getDailyWinners,
  getStatsByUsername,
  getUserGames,
  saveGame,
  updateUserRatingByResult,
  matchmakingJoin,
  matchmakingLeave,
  createTournament,
  getTournaments,
  getTournamentById,
  ensureCurrentArena,
  tournamentJoin,
  tournamentStart,
  getTournamentParticipants,
  getTournamentMatches,
  saveTournamentMatch,
  updateTournamentRound,
  addParticipantScore,
  getTournamentStandings,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getFriends,
  getFriendRequests,
  getChatMessages,
  sendChatMessage,
  createClub,
  getClubs,
  getClubById,
  joinClub,
  getClubMembers,
  getClubLeaderboard,
  setUserCountryClub,
  clearUserCountryClub,
  getCountryClubSummary,
  getCountryClubMembers,
  userClub,
  getPublicProfile,
  markRoomRead,
  clearChat,
  addWarPoints,
  ratingHistorySeason,
  warTotals,
  warUserPoints,
  warTopContributors,
  getWarSeason,
  saveWarSeason,
  listWarSeasons,
  getClubMemberIdsByCode,
  getAchievements,
  addAchievement,
  countFriends,
  setFollow,
  followCounts,
  isFollowing,
  getFollowerIds,
  getCircle,
  listNewsPosts,
  addNewsPost,
  deleteNewsPost,
  historyEntries,
  filterHistory,
  getExtendedStats,
  addFairplayGame,
  recentFairplay,
  setFairplayFlag,
  fairplayOverview,
  refundAgainst,
  setMute,
  adminIds,
  loadMutes,
  listChatFilter,
  addChatFilterWord,
  removeChatFilterWord,
  recentClubMessages,
  getClubStaff,
  setClubRole,
  listClubNews,
  addClubNews,
  getClubNews,
  deleteClubNews,
  setClubNewsPinned,
  getClubMemberIds,
  getChatMessageById,
  deleteChatMessage,
  addNotification,
  listNotifications,
  markNotificationsRead,
  clearNotifications,
  getGameReplay,
  blockUser,
  unblockUser,
  getBlockedUsers,
  loadAllBlocks,
  createReport,
  listReports,
  resolveReport,
  setAdmins,
  setBan,
  loadBans,
  adminSearchUsers,
  adminStats,
  saveActiveGame,
  deleteActiveGame,
  loadActiveGames,
  userPrivacy,
  updatePrivacy,
  areFriends,
  getFriendshipStatus,
  removeFriend,
  cancelFriendRequest,
  setAvatar,
  deleteAvatar,
  getAvatarByUsername,
  getUserByEmail,
  updateUserEmail,
  updateUserPassword,
  createPasswordReset,
  usePasswordReset,
  getConversations,
  getUnreadTotal,
  usePostgres,
  // Liga moduli (league.js) uchun past darajadagi so'rovlar
  dbGet,
  dbAll,
  dbRun,
  parseJson,
};
