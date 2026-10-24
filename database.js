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
  // sslmode=require/prefer/verify-ca ni pg hozir verify-full deb tushunadi, lekin keyingi versiyada yumshatadi (startda ogohlantirish).
  // Joriy qat'iy tekshiruv saqlanib qolishi uchun aniq verify-full yoziladi.
  const connectionString = DATABASE_URL.replace(/([?&]sslmode=)(require|prefer|verify-ca)\b/i, '$1verify-full');
  pool = new Pool({ connectionString, ssl: !noSsl });
} else {
  const sqlite3 = require('sqlite3').verbose();
  // SQLITE_FILE — boshqa fayl (avtomatik testlar vaqtinchalik baza bilan ishlaydi)
  sqliteDb = new sqlite3.Database(process.env.SQLITE_FILE || path.join(__dirname, 'database.sqlite'));
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


  await dbExec(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON tournament_participants(tournament_id)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id)`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id)`);

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

  // 🤝 Odob reytingi: o'yindan keyin raqibga 👍 (1) / 👎 (-1), bir o'yinda bir marta; oyning eng odobli o'yinchisi
  await dbExec(`
    CREATE TABLE IF NOT EXISTS sportsmanship (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      rater_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      rated_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      value INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS sportsmanship_awards (
      id TEXT PRIMARY KEY,
      month TEXT NOT NULL UNIQUE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      up INTEGER DEFAULT 0,
      total INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);
  for (const sql of [
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_sport_unique ON sportsmanship (room_id, rater_id)',
    'CREATE INDEX IF NOT EXISTS idx_sport_rated ON sportsmanship (rated_id, created_at)'
  ]) { try { await dbExec(sql); } catch (e) {} }

  // 🔮 Bashorat o'yini: tomoshabinlar natijani (kind='result', ply=-1, pick w|d|b) va keyingi yurishni (kind='move', ply, pick SAN) taxmin qiladi
  await dbExec(`
    CREATE TABLE IF NOT EXISTS predictions (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      pick TEXT NOT NULL,
      ply INTEGER NOT NULL DEFAULT -1,
      club_code TEXT,
      points INTEGER DEFAULT 0,
      correct INTEGER,
      resolved INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS prediction_awards (
      id TEXT PRIMARY KEY,
      month TEXT NOT NULL UNIQUE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      points INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);
  for (const sql of [
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_pred_unique ON predictions (room_id, user_id, kind, ply)',
    'CREATE INDEX IF NOT EXISTS idx_pred_user ON predictions (user_id, resolved_at)',
    'CREATE INDEX IF NOT EXISTS idx_pred_resolved ON predictions (resolved, resolved_at)'
  ]) { try { await dbExec(sql); } catch (e) {} }

  // id — eski history[].id bilan bir xil. moves alohida ustunda: ro'yxatlar yurishlarsiz o'qiladi.
  await dbExec(`
    CREATE TABLE IF NOT EXISTS user_games (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      played_at TEXT,
      seq INTEGER DEFAULT 0,
      result TEXT,
      opponent TEXT,
      time_control TEXT,
      color TEXT,
      reason TEXT,
      variant TEXT,
      move_count INTEGER DEFAULT 0,
      moves TEXT,
      data TEXT NOT NULL
    )
  `);
  // 🎯 Haftalik vazifalar: uchala vazifa bajarilgan haftalar (nishon)
  await dbExec(`
    CREATE TABLE IF NOT EXISTS quest_weeks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      UNIQUE (user_id, week)
    )
  `);
  // ⚔️ Bahs: do'st bilan 3/5/7 o'yinlik seriya (hisob yarim ochkolarda: g'alaba 2, durrang 1)
  await dbExec(`
    CREATE TABLE IF NOT EXISTS duels (
      id TEXT PRIMARY KEY,
      player_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      player_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      best_of INTEGER NOT NULL,
      score_a INTEGER NOT NULL DEFAULT 0,
      score_b INTEGER NOT NULL DEFAULT 0,
      games INTEGER NOT NULL DEFAULT 0,
      clock TEXT,
      variant TEXT,
      rated INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      winner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      finished_at TEXT
    )
  `);
  for (const sql of ['CREATE INDEX IF NOT EXISTS idx_duels_a ON duels (player_a)', 'CREATE INDEX IF NOT EXISTS idx_duels_b ON duels (player_b)']) { try { await dbExec(sql); } catch (e) {} }
  // ⭐ Kun o'yini: har kun (Toshkent vaqti) uchun tanlangan o'yin — oq o'yinchining user_games yozuvi
  await dbExec(`
    CREATE TABLE IF NOT EXISTS game_of_day (
      day TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      game_id TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);
  // Ko'chirishdan oldingi asl JSON (xavfsizlik uchun; oddiy so'rovlarda o'qilmaydi, keyinchalik o'chirsa bo'ladi)
  await dbExec(`
    CREATE TABLE IF NOT EXISTS user_history_archive (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      history TEXT,
      archived_at TEXT NOT NULL
    )
  `);
  for (const sql of [
    'CREATE INDEX IF NOT EXISTS idx_user_games_user ON user_games (user_id, played_at)',
    'CREATE INDEX IF NOT EXISTS idx_user_games_played ON user_games (played_at)',
    'CREATE INDEX IF NOT EXISTS idx_user_games_opp ON user_games (user_id, opponent)'
  ]) { try { await dbExec(sql); } catch (e) {} }
  await migrateHistoryToTable();
  // 📲 Push-bildirishnomalar: qurilma obunalari (bitta foydalanuvchida bir nechta qurilma) va server sozlamalari (VAPID kalitlari)
  await dbExec(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      lang TEXT,
      created_at TEXT NOT NULL,
      last_used_at TEXT
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
  for (const sql of ['CREATE UNIQUE INDEX IF NOT EXISTS idx_push_endpoint ON push_subscriptions (endpoint)', 'CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions (user_id)']) { try { await dbExec(sql); } catch (e) {} }
  try { await dbExec('ALTER TABLE users ADD COLUMN push_prefs TEXT DEFAULT NULL'); } catch (e) {}
  // 🧵 Shahar naqshi (Karvon yo'li shahri kaliti; banners.js)
  try { await dbExec('ALTER TABLE users ADD COLUMN profile_banner TEXT DEFAULT NULL'); } catch (e) {}
  // O'chirilgan akkauntlar (FK siz): eski tokenlar bilan kirib bo'lmasligi uchun
  await dbExec(`
    CREATE TABLE IF NOT EXISTS deleted_accounts (
      user_id TEXT PRIMARY KEY,
      deleted_at TEXT NOT NULL
    )
  `);
  // 🐞 Xatolar jurnali (server va brauzer): bir xil xato bitta qatorda — fingerprint bo'yicha, count oshadi
  await dbExec(`
    CREATE TABLE IF NOT EXISTS error_log (
      id TEXT PRIMARY KEY,
      fingerprint TEXT UNIQUE NOT NULL,
      source TEXT NOT NULL,
      message TEXT NOT NULL,
      stack TEXT,
      context TEXT,
      count INTEGER DEFAULT 1,
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      resolved INTEGER DEFAULT 0
    )
  `);
  try { await dbExec('CREATE INDEX IF NOT EXISTS idx_error_log_seen ON error_log (resolved, last_seen)'); } catch (e) {}

  // 🔗 Taklif havolasi: har o'yinchining doimiy kodi (/?invite=<kod>) va kim taklif qilgani (faqat ro'yxatdan o'tishda yoziladi)
  for (const col of ['invite_code', 'invited_by', 'invited_at']) { try { await dbExec(`ALTER TABLE users ADD COLUMN ${col} TEXT DEFAULT NULL`); } catch (e) {} }
  // 👤 Mehmon (ro'yxatdan o'tmagan) akkauntlar — reytingsiz o'ynaydi, ro'yxatdan o'tsa oddiy akkauntga aylanadi
  try { await dbExec('ALTER TABLE users ADD COLUMN is_guest INTEGER DEFAULT 0'); } catch (e) {}
  try { await dbExec('CREATE INDEX IF NOT EXISTS idx_users_guest ON users (is_guest)'); } catch (e) {}
  for (const sql of ['CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_code ON users (invite_code)', 'CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users (invited_by)']) { try { await dbExec(sql); } catch (e) {} }
  // ✈️ Telegram bot: o'yinchi ↔ Telegram chat (bir chatga bitta akkaunt)
  await dbExec(`
    CREATE TABLE IF NOT EXISTS telegram_links (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      chat_id TEXT NOT NULL UNIQUE,
      tg_username TEXT,
      lang TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // 📜 Admin harakatlari jurnali: kim, qachon, kimga nima qildi. target_id da FK yo'q — o'yinchi o'chirilsa ham yozuv qoladi (nomi target_name da)
  await dbExec(`
    CREATE TABLE IF NOT EXISTS admin_actions (
      id TEXT PRIMARY KEY,
      admin_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      admin_name TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      target_name TEXT,
      details TEXT,
      created_at TEXT NOT NULL
    )
  `);
  try { await dbExec('CREATE INDEX IF NOT EXISTS idx_admin_actions_time ON admin_actions (created_at)'); } catch (e) {}

  // Eski, ishlatilmaydigan jadvallar (2026-10-21): o'yinlar endi user_games da, sessiyalar JWT bilan, sayt yangiliklari va
  // foydalanuvchi yaratgan klublar olib tashlangan. clubs jadvali qoladi — tournaments unga FK bilan bog'langan.
  // 2026-10-24: Ustoz-shogird funksiyasi foydalanuvchi so'rovi bilan butunlay olib tashlandi — jadvallar, yutuq va bildirishnomalar ham
  try { await dbRun("DELETE FROM user_achievements WHERE key = 'mentor'"); } catch (e) {}
  try { await dbRun("DELETE FROM notifications WHERE type IN ('mentor_request', 'mentor_accepted', 'mentor_ended', 'mentor_note', 'student_game', 'mentor_milestone')"); } catch (e) {}
  for (const t of ['games', 'sessions', 'news_posts', 'club_members', 'game_notes', 'mentorships']) {
    try { await dbExec(`DROP TABLE IF EXISTS ${t}`); } catch (e) { console.error(`${t} jadvalini o'chirib bo'lmadi:`, e.message); }
  }

  await migrateRatingsByMode();
  await migrateDirectChatRooms();

  console.log(usePostgres ? '✅ PostgreSQL jadvallari tayyor.' : '✅ Database SQLite sahifalari yaratildi.');
}

// chess960 — alohida reyting (umumiy reytingga ta'sir qilmaydi)
const RATING_MODES = ['rapid', 'blitz', 'bullet', 'chess960', 'shatranj'];
// Variant reytinglari umumiy reytingga ta'sir qilmaydi
const VARIANT_MODES = ['chess960', 'shatranj'];

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

// --- 🗂 O'yinlar tarixi (user_games) ---
// Yozuv shakli eski users.history[] bilan bir xil: {id, date, timestamp, result, opponent, mode, timeControl, color, reason, clock, variant, startFen, league, moves}
const USER_GAME_COLS = 'id, user_id, played_at, seq, result, opponent, time_control, color, reason, variant, move_count, moves, data';
function userGameParams(userId, g, seq) {
  const { moves, ...rest } = g;
  const list = Array.isArray(moves) ? moves : [];
  // Vaqti yo'q eski yozuvlar uchun '' (NULL SQLite va Postgres da turlicha tartiblanadi)
  return [g.id, userId, g.timestamp || '', seq || 0, g.result || null, g.opponent || null, g.timeControl || null, g.color || null, g.reason || null,
    g.variant || null, list.length, JSON.stringify(list), JSON.stringify(rest)];
}
function rowToGame(row, withMoves) {
  const g = { ...(parseJson(row.data) || {}), id: row.id, moveCount: Number(row.move_count) || 0 };
  if (withMoves) g.moves = parseJson(row.moves) || [];
  return g;
}
async function addUserGame(userId, g) {
  await dbRun(`INSERT INTO user_games (${USER_GAME_COLS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, userGameParams(userId, g, 0));
}
// Eskidan yangiga tartibda. opts: withMoves, from/to (ISO, played_at oralig'i)
async function getUserHistory(userId, opts) {
  const o = opts || {};
  const where = ['user_id = ?'], params = [userId];
  if (o.from) { where.push('played_at >= ?'); params.push(o.from); }
  if (o.to) { where.push('played_at < ?'); params.push(o.to); }
  const cols = o.withMoves ? USER_GAME_COLS : USER_GAME_COLS.replace(', moves', '');
  const rows = await dbAll(`SELECT ${cols} FROM user_games WHERE ${where.join(' AND ')} ORDER BY played_at ASC, seq ASC`, params);
  return rows.map(r => rowToGame(r, o.withMoves));
}
// --- 🎯 Haftalik vazifalar ---
async function addQuestWeek(userId, week) {
  const r = await dbRun('INSERT INTO quest_weeks (id, user_id, week, completed_at) VALUES (?, ?, ?, ?) ON CONFLICT (user_id, week) DO NOTHING', [uuidv4(), userId, week, new Date().toISOString()]);
  return !!(r && (r.changes || r.rowCount));
}
// --- ⚔️ Bahslar ---
async function createDuel(d) {
  const id = uuidv4(), now = new Date().toISOString();
  await dbRun(`INSERT INTO duels (id, player_a, player_b, best_of, score_a, score_b, games, clock, variant, rated, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?, ?, 'active', ?, ?)`, [id, d.a, d.b, d.bestOf, d.clock || null, d.variant || 'standard', d.rated ? 1 : 0, now, now]);
  return id;
}
async function updateDuel(id, f) {
  const now = new Date().toISOString();
  await dbRun('UPDATE duels SET score_a = ?, score_b = ?, games = ?, status = ?, winner_id = ?, updated_at = ?, finished_at = ? WHERE id = ?',
    [f.scoreA, f.scoreB, f.games, f.status, f.winnerId || null, now, f.status === 'active' ? null : now, id]);
}
// Uzoq vaqt o'ynalmagan bahslar to'xtatiladi
async function stopStaleDuels(cutoffIso) {
  await dbRun("UPDATE duels SET status = 'stopped', finished_at = ? WHERE status = 'active' AND updated_at < ?", [new Date().toISOString(), cutoffIso]);
}
// Profil: bahslar soni, natijalari va oxirgilari (o'yinchi nuqtai nazaridan; hisob ochkolarda)
async function duelSummary(userId) {
  const rows = await dbAll(`SELECT d.player_a as "a", d.best_of as "bestOf", d.score_a as "scoreA", d.score_b as "scoreB", d.games as "games",
      d.status as "status", d.winner_id as "winnerId", d.updated_at as "at", ua.username as "aName", ub.username as "bName"
    FROM duels d LEFT JOIN users ua ON ua.id = d.player_a LEFT JOIN users ub ON ub.id = d.player_b
    WHERE (d.player_a = ? OR d.player_b = ?) AND d.games > 0 ORDER BY d.updated_at DESC LIMIT 300`, [userId, userId]);
  const out = { total: 0, won: 0, lost: 0, drawn: 0, recent: [] };
  for (const r of rows) {
    const mine = r.a === userId;
    const item = {
      opponent: (mine ? r.bName : r.aName) || null, bestOf: Number(r.bestOf), games: Number(r.games), status: r.status, at: r.at,
      me: Number(mine ? r.scoreA : r.scoreB) / 2, opp: Number(mine ? r.scoreB : r.scoreA) / 2,
      result: r.status === 'finished' ? (!r.winnerId ? 'draw' : r.winnerId === userId ? 'win' : 'loss') : r.status
    };
    if (r.status === 'finished') { out.total++; if (item.result === 'win') out.won++; else if (item.result === 'loss') out.lost++; else out.drawn++; }
    if (out.recent.length < 8) out.recent.push(item);
  }
  return out;
}

// 🎖️ Nishonlar: bajarilgan haftalar (yangidan eskiga) va Kun o'yini bo'lgan o'yinlar (oq — user_id, qora — raqib nomi bo'yicha)
async function listQuestWeeks(userId) {
  const rows = await dbAll('SELECT week FROM quest_weeks WHERE user_id = ? ORDER BY week DESC', [userId]);
  return rows.map((r) => r.week);
}
async function gameOfDayFor(userId, username) {
  return dbAll(`SELECT g.day as "day", CASE WHEN g.user_id = ? THEN ug.opponent ELSE u.username END as "opponent"
    FROM game_of_day g JOIN user_games ug ON ug.id = g.game_id AND ug.user_id = g.user_id JOIN users u ON u.id = g.user_id
    WHERE g.user_id = ? OR ug.opponent = ? ORDER BY g.day DESC LIMIT 60`, [userId, userId, username]);
}

async function countQuestWeeks(userId) {
  const r = await dbGet('SELECT COUNT(*) as "n" FROM quest_weeks WHERE user_id = ?', [userId]);
  return Number(r && r.n) || 0;
}
async function hasQuestWeek(userId, week) {
  return !!(await dbGet('SELECT id FROM quest_weeks WHERE user_id = ? AND week = ?', [userId, week]));
}

// --- ⭐ Kun o'yini ---
// Nomzodlar: oq o'yinchi yozuvi (har o'yin bir marta), kamida 20 yarim yurish, ikkala o'yinchi ham mehmon emas
async function gameOfDayCandidates(fromIso, toIso) {
  return dbAll(`SELECT g.id, g.user_id as "userId", g.result, g.opponent, g.reason, g.variant, g.move_count as "moveCount",
      u.username, u.rating, o.id as "oppId", o.rating as "oppRating"
    FROM user_games g JOIN users u ON u.id = g.user_id JOIN users o ON o.username = g.opponent
    WHERE g.color = 'w' AND g.played_at >= ? AND g.played_at < ? AND g.move_count >= 20
      AND COALESCE(u.is_guest, 0) = 0 AND COALESCE(o.is_guest, 0) = 0`, [fromIso, toIso]);
}
async function getGameOfDay(day) {
  return dbGet('SELECT day, user_id as "userId", game_id as "gameId" FROM game_of_day WHERE day = ?', [day]);
}
async function recentGameOfDayIds(sinceDay) {
  return (await dbAll('SELECT game_id as "gameId" FROM game_of_day WHERE day >= ?', [sinceDay])).map((r) => r.gameId);
}
async function setGameOfDay(day, userId, gameId, score) {
  await dbRun('INSERT INTO game_of_day (day, user_id, game_id, score, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (day) DO NOTHING', [day, userId, gameId, score, new Date().toISOString()]);
}

async function getUserGameById(userId, gameId) {
  const row = await dbGet(`SELECT ${USER_GAME_COLS} FROM user_games WHERE user_id = ? AND id = ?`, [userId, gameId]);
  return row ? rowToGame(row, true) : null;
}
// Raqiblar bo'yicha hisob: [{name, games, win, draw, loss}]
async function opponentSummary(userId, opponent) {
  const rows = await dbAll(`SELECT opponent, result, COUNT(*) as "n" FROM user_games WHERE user_id = ? AND opponent IS NOT NULL${opponent ? ' AND opponent = ?' : ''} GROUP BY opponent, result`,
    opponent ? [userId, opponent] : [userId]);
  const map = new Map();
  for (const r of rows) {
    const o = map.get(r.opponent) || { name: r.opponent, games: 0, win: 0, draw: 0, loss: 0 };
    const n = Number(r.n) || 0;
    o.games += n;
    if (r.result in o) o[r.result] += n;
    map.set(r.opponent, o);
  }
  return [...map.values()];
}
// Bir martalik ko'chirish: users.history JSON → user_games. Takroriy ishga tushirishga chidamli
// (id lar bo'yicha o'tkazib yuboriladi), har foydalanuvchi uchun soni tekshirilgandan keyingina history tozalanadi.
async function migrateHistoryToTable() {
  const rows = await dbAll("SELECT id, history FROM users WHERE history IS NOT NULL AND history <> '' AND history <> '[]'");
  if (!rows.length) return;
  let moved = 0;
  for (const row of rows) {
    const list = parseJson(row.history);
    if (!Array.isArray(list)) { console.error("Tarixni ko'chirib bo'lmadi (JSON emas):", row.id); continue; }
    const games = list.filter(g => g && typeof g === 'object').map((g, i) => ({ ...g, id: g.id || `legacy-${row.id}-${i}`, __seq: i }));
    const existing = new Set((await dbAll('SELECT id FROM user_games WHERE user_id = ?', [row.id])).map(r => r.id));
    const fresh = games.filter(g => !existing.has(g.id));
    for (let i = 0; i < fresh.length; i += 50) {
      const chunk = fresh.slice(i, i + 50);
      const params = [];
      for (const g of chunk) { const { __seq, ...entry } = g; params.push(...userGameParams(row.id, entry, __seq)); }
      await dbRun(`INSERT INTO user_games (${USER_GAME_COLS}) VALUES ${chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`, params);
    }
    const ids = new Set((await dbAll('SELECT id FROM user_games WHERE user_id = ?', [row.id])).map(r => r.id));
    if (!games.every(g => ids.has(g.id))) { console.error("Tarix to'liq ko'chmadi, tozalanmaydi:", row.id); continue; }
    await dbRun('DELETE FROM user_history_archive WHERE user_id = ?', [row.id]);
    await dbRun('INSERT INTO user_history_archive (id, user_id, history, archived_at) VALUES (?, ?, ?, ?)', [uuidv4(), row.id, row.history, new Date().toISOString()]);
    await dbRun("UPDATE users SET history = '[]' WHERE id = ?", [row.id]);
    moved += fresh.length;
  }
  console.log(`🗂 O'yinlar tarixi ko'chirildi: ${rows.length} foydalanuvchi, ${moved} o'yin`);
}

// Akkauntni butunlay o'chirish. users qatori o'chirilganda bog'liq jadvallar (o'yinlar, xabarlar, do'stlar,
// bildirishnomalar, izohlar...) FK ON DELETE CASCADE / SET NULL orqali tozalanadi. Raqiblarning tarixida
// o'yinchi nomi anonim yorliq bilan almashtiriladi (bu nomni keyin boshqa odam olishi mumkin).
// --- 👤 Mehmon akkauntlari ---
async function markGuest(userId) {
  await dbRun('UPDATE users SET is_guest = 1 WHERE id = ?', [userId]);
}
async function listGuestIds() {
  return (await dbAll('SELECT id FROM users WHERE is_guest = 1')).map((r) => r.id);
}
// Mehmon ro'yxatdan o'tdi: o'sha akkaunt (o'yinlari bilan) oddiy akkauntga aylanadi; raqiblar tarixidagi eski nom ham yangilanadi
async function claimGuest(userId, { username, email, passwordHash }) {
  const old = await dbGet('SELECT username FROM users WHERE id = ? AND is_guest = 1', [userId]);
  if (!old) return null;
  await dbRun('UPDATE users SET username = ?, email = ?, password_hash = ?, is_guest = 0 WHERE id = ?', [username, email, passwordHash, userId]);
  const rows = await dbAll('SELECT id, data FROM user_games WHERE opponent = ?', [old.username]);
  for (const r of rows) {
    const data = parseJson(r.data) || {};
    data.opponent = username;
    await dbRun('UPDATE user_games SET opponent = ?, data = ? WHERE id = ?', [username, JSON.stringify(data), r.id]);
  }
  return getUserById(userId);
}
// Ro'yxatdan o'tmagan eski mehmonlar o'chiriladi (bog'liq jadvallar FK ON DELETE bilan tozalanadi)
async function deleteExpiredGuests(cutoffIso) {
  const rows = await dbAll('SELECT id FROM users WHERE is_guest = 1 AND created_at < ?', [cutoffIso]);
  for (const r of rows) await dbRun('DELETE FROM users WHERE id = ?', [r.id]);
  return rows.map((r) => r.id);
}

async function deleteUserAccount(userId) {
  const user = await dbGet('SELECT id, username FROM users WHERE id = ?', [userId]);
  if (!user) return null;
  const label = 'deleted-' + uuidv4().slice(0, 8);
  await dbRun('DELETE FROM users WHERE id = ?', [userId]);
  const rows = await dbAll('SELECT id, data FROM user_games WHERE opponent = ?', [user.username]);
  for (const r of rows) {
    const data = parseJson(r.data) || {};
    data.opponent = label;
    await dbRun('UPDATE user_games SET opponent = ?, data = ? WHERE id = ?', [label, JSON.stringify(data), r.id]);
  }
  await dbRun('INSERT INTO deleted_accounts (user_id, deleted_at) VALUES (?, ?)', [userId, new Date().toISOString()]);
  return { username: user.username, label, renamedGames: rows.length };
}
// --- 📲 Push ---
async function getAppSetting(key) {
  const r = await dbGet('SELECT value FROM app_settings WHERE key = ?', [key]);
  return r ? r.value : null;
}
async function setAppSetting(key, value) {
  await dbRun('DELETE FROM app_settings WHERE key = ?', [key]);
  await dbRun('INSERT INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
}
// Bir qurilma (endpoint) — bitta obuna; boshqa foydalanuvchi shu qurilmada kirsa, obuna unga o'tadi
async function savePushSubscription(userId, sub, lang) {
  await dbRun('DELETE FROM push_subscriptions WHERE endpoint = ?', [sub.endpoint]);
  await dbRun('INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, lang, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth, lang || null, new Date().toISOString()]);
}
async function deletePushSubscription(endpoint, userId) {
  if (userId) await dbRun('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?', [endpoint, userId]);
  else await dbRun('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
}
async function listPushSubscriptions(userId) {
  return dbAll('SELECT endpoint, p256dh, auth, lang FROM push_subscriptions WHERE user_id = ?', [userId]);
}
async function touchPushSubscription(endpoint) {
  await dbRun('UPDATE push_subscriptions SET last_used_at = ? WHERE endpoint = ?', [new Date().toISOString(), endpoint]);
}
const PUSH_DEFAULTS = { challenge: true, message: true, social: true, events: true };
async function getPushPrefs(userId) {
  const r = await dbGet('SELECT push_prefs FROM users WHERE id = ?', [userId]);
  return { ...PUSH_DEFAULTS, ...((r && parseJson(r.push_prefs)) || {}) };
}
async function setPushPrefs(userId, prefs) {
  const clean = {};
  for (const k of Object.keys(PUSH_DEFAULTS)) clean[k] = prefs[k] !== false;
  await dbRun('UPDATE users SET push_prefs = ? WHERE id = ?', [JSON.stringify(clean), userId]);
  return clean;
}

async function loadDeletedAccountIds() {
  return (await dbAll('SELECT user_id as "id" FROM deleted_accounts')).map(r => r.id);
}

function mapUserRow(row) {
  const { history, ...rest } = row; // tarix endi user_games jadvalida (getUserHistory)
  return { ...rest, stats: parseJson(row.stats), stats_by_mode: parseJson(row.stats_by_mode), ratings_by_mode: normalizeRatingsByMode(row) };
}

async function getUserByUsername(username) {
  const row = await dbGet('SELECT * FROM users WHERE username = ?', username);
  return row ? mapUserRow(row) : null;
}

// Ro'yxatdan o'tishda: "Ali" bor bo'lsa "ali"/"ALI" ham band (katta-kichik harf farqlanmaydi)
async function usernameTaken(username) {
  const name = String(username);
  if (await dbGet('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [name])) return true;
  // SQLite LOWER faqat lotin harflarini kichraytiradi — kirill va boshqalar uchun JS da solishtiriladi
  if (usePostgres || /^[\x00-\x7f]*$/.test(name)) return false;
  const rows = await dbAll('SELECT username FROM users');
  const low = name.toLowerCase();
  return rows.some((r) => String(r.username).toLowerCase() === low);
}

async function setProfileBanner(userId, key) {
  await dbRun('UPDATE users SET profile_banner = ? WHERE id = ?', [key || null, userId]);
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
  return { id, username: user.username, email: user.email, rating: user.rating || 1500, ratingsByMode: { rapid: 1500, blitz: 1500, bullet: 1500 }, stats: user.stats || { wins: 0, losses: 0, draws: 0 }, statsByMode: user.statsByMode || { rapid: { wins: 0, losses: 0, draws: 0 }, blitz: { wins: 0, losses: 0, draws: 0 }, bullet: { wins: 0, losses: 0, draws: 0 } }, created_at: new Date().toISOString() };
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

  const game = { id: uuidv4(), date: new Date().toLocaleDateString(), timestamp: new Date().toISOString(), result, opponent: opponent || 'Online', mode: mode || 'Online o\'yin', timeControl: timeControl || 'blitz', moves: moves || [], ...(extra || {}) };
  await addUserGame(userId, game);

  await dbRun('UPDATE users SET stats = ?, stats_by_mode = ?, last_active = ? WHERE id = ?', [JSON.stringify(stats), JSON.stringify(statsByMode), new Date().toISOString(), userId]);

  return { stats, statsByMode, gameId: game.id };
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
  return dbGet('SELECT r.target_id as "targetId", u.username as "target", r.reason FROM reports r LEFT JOIN users u ON u.id = r.target_id WHERE r.id = ?', [id]);
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
    games24h: Math.round(await one('SELECT COUNT(*) as "n" FROM user_games WHERE played_at >= ?', [dayAgo]) / 2),
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

async function getLeaderboard() {
  const rows = await dbAll('SELECT username, rating, ratings_by_mode, stats, stats_by_mode, country, club_country, club_code, avatar_version FROM users WHERE COALESCE(is_guest, 0) = 0 ORDER BY rating DESC LIMIT 300');
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
// 🐪 Karvon yo'li uchun: statistikasi bor oddiy (mehmon emas) o'yinchilar
async function caravanRows() {
  const rows = await dbAll('SELECT username, stats, country, avatar_version FROM users WHERE COALESCE(is_guest, 0) = 0');
  return rows.map((r) => ({ username: r.username, stats: parseJson(r.stats) || {}, country: r.country || null, avatarVersion: r.avatar_version || null }));
}

async function getDailyWinners(period) {
  const span = period === 'week' ? 7 : 1;
  const cutoff = Date.now() - span * 24 * 60 * 60 * 1000;
  const users = await dbAll(`SELECT u.username, u.rating, u.country, u.avatar_version, COUNT(*) as "games", SUM(CASE WHEN g.result = 'win' THEN 1 ELSE 0 END) as "wins"
    FROM user_games g JOIN users u ON u.id = g.user_id WHERE g.played_at >= ? AND COALESCE(u.is_guest, 0) = 0 GROUP BY u.id, u.username, u.rating, u.country, u.avatar_version`, [new Date(cutoff).toISOString()]);
  const winners = users.map(u => {
    const games = Number(u.games) || 0, wins = Number(u.wins) || 0;
    return {
      username: u.username, dailyWins: wins, games, winRate: games ? Math.round(wins / games * 100) : 0,
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
  const g = await getUserGameById(user.id, gameId);
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
  const history = await getUserHistory(user.id);
  const recentGames = history.slice(-10).reverse().map(g => ({
    id: g.id || null,
    hasMoves: g.moveCount > 0,
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

// --- O'yinlar tarixi (filtr va sahifalash) ---
// Yangidan eskiga; withMoves — PGN uchun
async function historyEntries(user, withMoves) {
  return (await getUserHistory(user.id, { withMoves })).reverse();
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
  const history = await getUserHistory(user.id);
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
  const lengths = history.map(g => g.moveCount || 0).filter(Boolean);
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
    const overall = VARIANT_MODES.includes(r.mode) ? (u.rating || 1500) : (u.rating || 1500) + lost;
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

// --- 🤝 Odob reytingi ---
async function addSportRating({ roomId, raterId, ratedId, value }) {
  if (await dbGet('SELECT id FROM sportsmanship WHERE room_id = ? AND rater_id = ?', [roomId, raterId])) return false;
  await dbRun('INSERT INTO sportsmanship (id, room_id, rater_id, rated_id, value, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [uuidv4(), roomId, raterId, ratedId, value > 0 ? 1 : -1, new Date().toISOString()]);
  return true;
}
// Oxirgi 100 ta baho bo'yicha foiz + oylik mukofotlar
async function sportSummary(userId) {
  const rows = await dbAll('SELECT value FROM sportsmanship WHERE rated_id = ? ORDER BY created_at DESC LIMIT 100', [userId]);
  const up = rows.filter(r => Number(r.value) > 0).length;
  const awards = await dbAll('SELECT month FROM sportsmanship_awards WHERE user_id = ? ORDER BY month DESC', [userId]);
  return { up, down: rows.length - up, total: rows.length, percent: rows.length ? Math.round(up / rows.length * 100) : null, awards: awards.map(a => a.month) };
}
async function sportMonthLeaders(fromIso, toIso) {
  const rows = await dbAll(`SELECT rated_id as "userId", SUM(CASE WHEN value > 0 THEN 1 ELSE 0 END) as "up", COUNT(*) as "total"
    FROM sportsmanship WHERE created_at >= ? AND created_at < ? GROUP BY rated_id`, [fromIso, toIso]);
  return rows.map(r => ({ userId: r.userId, up: Number(r.up) || 0, total: Number(r.total) || 0 }));
}
async function getSportAward(month) {
  return dbGet('SELECT month, user_id as "userId" FROM sportsmanship_awards WHERE month = ?', [month]);
}
async function saveSportAward(month, winner) {
  if (await getSportAward(month)) return false;
  await dbRun('INSERT INTO sportsmanship_awards (id, month, user_id, up, total, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [uuidv4(), month, winner ? winner.userId : null, winner ? winner.up : 0, winner ? winner.total : 0, new Date().toISOString()]);
  return true;
}

// --- 🔮 Bashorat o'yini ---
async function addResultPrediction({ roomId, userId, pick, clubCode }) {
  if (await dbGet("SELECT id FROM predictions WHERE room_id = ? AND user_id = ? AND kind = 'result'", [roomId, userId])) return false;
  await dbRun("INSERT INTO predictions (id, room_id, user_id, kind, pick, ply, club_code, created_at) VALUES (?, ?, ?, 'result', ?, -1, ?, ?)",
    [uuidv4(), roomId, userId, pick, clubCode || null, new Date().toISOString()]);
  return true;
}
async function roomResultPredictions(roomId) {
  return dbAll(`SELECT p.user_id as "userId", p.pick, p.club_code as "clubCode", u.username FROM predictions p
    LEFT JOIN users u ON u.id = p.user_id WHERE p.room_id = ? AND p.kind = 'result' AND p.resolved = 0`, [roomId]);
}
async function resolveResultPrediction(roomId, userId, correct, points) {
  await dbRun("UPDATE predictions SET resolved = 1, correct = ?, points = ?, resolved_at = ? WHERE room_id = ? AND user_id = ? AND kind = 'result'",
    [correct === null ? null : (correct ? 1 : 0), points, new Date().toISOString(), roomId, userId]);
}
// Yurish taxminlari tur tugagach darhol yoziladi (xotiradan)
async function saveMoveGuesses(roomId, ply, rows) {
  const now = new Date().toISOString();
  for (const r of rows) {
    try {
      await dbRun("INSERT INTO predictions (id, room_id, user_id, kind, pick, ply, points, correct, resolved, created_at, resolved_at) VALUES (?, ?, ?, 'move', ?, ?, ?, ?, 1, ?, ?)",
        [uuidv4(), roomId, r.userId, r.pick, ply, r.points, r.correct ? 1 : 0, now, now]);
    } catch (e) {}
  }
}
async function predictionLeaders(fromIso, limit) {
  const where = fromIso ? 'AND p.resolved_at >= ?' : '';
  const rows = await dbAll(`SELECT p.user_id as "userId", u.username, u.country, u.avatar_version as "avatarVersion",
      SUM(p.points) as "points", SUM(CASE WHEN p.correct = 1 THEN 1 ELSE 0 END) as "correct", COUNT(*) as "total"
    FROM predictions p JOIN users u ON u.id = p.user_id
    WHERE p.resolved = 1 AND p.correct IS NOT NULL ${where}
    GROUP BY p.user_id, u.username, u.country, u.avatar_version`, fromIso ? [fromIso] : []);
  return rows.map(r => ({ userId: r.userId, username: r.username, country: r.country || null, avatarVersion: r.avatarVersion || null, points: Number(r.points) || 0, correct: Number(r.correct) || 0, total: Number(r.total) || 0 }))
    .filter(r => r.points > 0 || r.total > 0)
    .sort((a, b) => b.points - a.points || b.correct - a.correct || a.username.localeCompare(b.username))
    .slice(0, limit || 1000);
}
async function predictionSummary(userId, monthFromIso) {
  const all = await dbGet(`SELECT SUM(points) as "points", SUM(CASE WHEN correct = 1 THEN 1 ELSE 0 END) as "correct", COUNT(*) as "total"
    FROM predictions WHERE user_id = ? AND resolved = 1 AND correct IS NOT NULL`, [userId]);
  const month = await dbGet(`SELECT SUM(points) as "points" FROM predictions WHERE user_id = ? AND resolved = 1 AND resolved_at >= ?`, [userId, monthFromIso]);
  const awards = await dbAll('SELECT month FROM prediction_awards WHERE user_id = ? ORDER BY month DESC', [userId]);
  return { points: Number(all && all.points) || 0, correct: Number(all && all.correct) || 0, total: Number(all && all.total) || 0, monthPoints: Number(month && month.points) || 0, awards: awards.map(a => a.month) };
}
async function getPredictionAward(month) {
  return dbGet('SELECT month, user_id as "userId" FROM prediction_awards WHERE month = ?', [month]);
}
async function savePredictionAward(month, winner) {
  if (await getPredictionAward(month)) return false;
  await dbRun('INSERT INTO prediction_awards (id, month, user_id, points, created_at) VALUES (?, ?, ?, ?, ?)',
    [uuidv4(), month, winner ? winner.userId : null, winner ? winner.points : 0, new Date().toISOString()]);
  return true;
}
async function monthPredictionLeaders(fromIso, toIso) {
  const rows = await dbAll(`SELECT user_id as "userId", SUM(points) as "points" FROM predictions
    WHERE resolved = 1 AND resolved_at >= ? AND resolved_at < ? GROUP BY user_id`, [fromIso, toIso]);
  return rows.map(r => ({ userId: r.userId, points: Number(r.points) || 0 })).sort((a, b) => b.points - a.points);
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
  return dbGet('SELECT id, club_country as "club", title, pinned FROM club_news WHERE id = ?', [id]);
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
  return dbGet('SELECT m.id, m.room_id as "roomId", m.sender_id as "senderId", m.message, u.username as "sender" FROM chat_messages m LEFT JOIN users u ON u.id = m.sender_id WHERE m.id = ?', [id]);
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
  return getUserHistory(userId, { withMoves: true });
}

function eloChange(playerRating, opponentRating, result, k) {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const score = result === 'win' ? 1 : (result === 'loss' ? 0 : 0.5);
  return Math.round((k || 32) * (score - expectedScore));
}

// 🌱 Yumshoq start: rejimdagi dastlabki PROVISIONAL_GAMES o'yinda reyting "taxminiy" — tezroq o'zgaradi (K=64),
// shunda yangi o'yinchi o'z darajasini tez topadi. Tajribali o'yinchi taxminiy reytingli raqibdan kamroq yo'qotadi/oladi (K=16).
const PROVISIONAL_GAMES = 15;
const gamesIn = (stats) => stats ? (stats.wins || 0) + (stats.losses || 0) + (stats.draws || 0) : 0;
function modeGames(user, mode) {
  if (!user) return 0;
  return mode === 'overall' ? gamesIn(user.stats) : gamesIn((user.stats_by_mode || {})[mode]);
}
// endGame da statistika reytingdan oldin yoziladi — joriy o'yin ham sanaladi (<=)
function isProvisional(user, mode, includesCurrent) {
  const n = modeGames(user, mode);
  return includesCurrent ? n <= PROVISIONAL_GAMES : n < PROVISIONAL_GAMES;
}
function kFactor(meProvisional, oppProvisional) {
  if (meProvisional) return 64;
  if (oppProvisional) return 16;
  return 32;
}

// Umumiy reyting va (berilgan bo'lsa) o'yin rejimi reytingini yangilaydi
async function updateUserRatingByResult(userId, result, opponentRating, timeControl, opponentModeRating, opponentId) {
  const user = await getUserById(userId);
  if (!user) return null;
  const opp = opponentId ? await getUserById(opponentId) : null;
  const playerRating = user.rating || 1500;
  // Chess960 o'yini umumiy reytingni o'zgartirmaydi — faqat o'z reytingini
  const kOverall = kFactor(isProvisional(user, 'overall', true), !!opp && isProvisional(opp, 'overall', false));
  const ratingChange = VARIANT_MODES.includes(timeControl) ? 0 : eloChange(playerRating, Number(opponentRating) || 1500, result, kOverall);
  const newRating = Math.max(100, playerRating + ratingChange);

  const ratingsByMode = user.ratings_by_mode;
  let modeChange = null;
  if (RATING_MODES.includes(timeControl)) {
    const modeRating = ratingsByMode[timeControl];
    const kMode = kFactor(isProvisional(user, timeControl, true), !!opp && isProvisional(opp, timeControl, false));
    modeChange = eloChange(modeRating, Number(opponentModeRating) || Number(opponentRating) || 1500, result, kMode);
    ratingsByMode[timeControl] = Math.max(100, modeRating + modeChange);
    await dbRun('INSERT INTO rating_history (id, user_id, mode, rating_before, rating, created_at, opponent_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), userId, timeControl, modeRating, ratingsByMode[timeControl], new Date().toISOString(), opponentId || null]);
  }

  await dbRun('UPDATE users SET rating = ?, ratings_by_mode = ? WHERE id = ?', [newRating, JSON.stringify(ratingsByMode), userId]);
  return { success: true, newRating, change: ratingChange, mode: modeChange === null ? null : timeControl, modeChange, ratingsByMode };
}

async function getTournamentById(id) {
  return await dbGet('SELECT * FROM tournaments WHERE id = ?', id);
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

// --- 🔗 Taklif havolasi ---
const INVITE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
async function getInviteCode(userId) {
  const row = await dbGet('SELECT invite_code as "code" FROM users WHERE id = ?', [userId]);
  if (!row) return null;
  if (row.code) return row.code;
  for (let i = 0; i < 5; i++) {
    const bytes = require('crypto').randomBytes(8);
    const code = [...bytes].map(b => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join('');
    try {
      await dbRun('UPDATE users SET invite_code = ? WHERE id = ? AND invite_code IS NULL', [code, userId]);
      const again = await dbGet('SELECT invite_code as "code" FROM users WHERE id = ?', [userId]);
      if (again && again.code) return again.code;
    } catch (e) { /* kod band — boshqasi */ }
  }
  throw new Error('Taklif kodi yaratilmadi');
}
async function getUserByInviteCode(code) {
  if (!code || !/^[a-z0-9]{4,16}$/i.test(String(code))) return null;
  const row = await dbGet('SELECT id FROM users WHERE invite_code = ?', [String(code).toLowerCase()]);
  return row ? getUserById(row.id) : null;
}
async function setInvitedBy(userId, inviterId) {
  await dbRun('UPDATE users SET invited_by = ?, invited_at = ? WHERE id = ? AND invited_by IS NULL', [inviterId, new Date().toISOString(), userId]);
}
async function inviteStats(userId) {
  const rows = await dbAll('SELECT username, stats, avatar_version as "avatarVersion", invited_at as "invitedAt" FROM users WHERE invited_by = ? ORDER BY invited_at DESC', [userId]);
  return {
    count: rows.length,
    recent: rows.slice(0, 20).map(r => {
      const s = parseJson(r.stats) || {};
      return { username: r.username, avatarVersion: r.avatarVersion || null, invitedAt: r.invitedAt, games: (s.wins || 0) + (s.losses || 0) + (s.draws || 0) };
    })
  };
}
async function countInvited(userId) {
  return Number((await dbGet('SELECT COUNT(*) as n FROM users WHERE invited_by = ?', [userId])).n) || 0;
}
// Taklif qabul qilinganda — ikkalasi darhol do'st (kutayotgan so'rovlar ham yopiladi)
async function makeFriends(a, b) {
  if (a === b || await areFriends(a, b)) return false;
  const now = new Date().toISOString();
  await dbRun("UPDATE friend_requests SET status = 'accepted', updated_at = ? WHERE status = 'pending' AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))", [now, a, b, b, a]);
  await dbRun('INSERT INTO friends (id, user_id, friend_id, created_at) VALUES (?, ?, ?, ?)', [uuidv4(), a, b, now]);
  await dbRun('INSERT INTO friends (id, user_id, friend_id, created_at) VALUES (?, ?, ?, ?)', [uuidv4(), b, a, now]);
  return true;
}

// --- ✈️ Telegram ---
async function linkTelegram(userId, chatId, tgUsername, lang) {
  await dbRun('DELETE FROM telegram_links WHERE user_id = ? OR chat_id = ?', [userId, String(chatId)]);
  await dbRun('INSERT INTO telegram_links (user_id, chat_id, tg_username, lang, created_at) VALUES (?, ?, ?, ?, ?)', [userId, String(chatId), tgUsername || null, lang || null, new Date().toISOString()]);
}
async function getTelegramLink(userId) {
  return dbGet('SELECT user_id as "userId", chat_id as "chatId", tg_username as "tgUsername", lang FROM telegram_links WHERE user_id = ?', [userId]);
}
async function getTelegramLinkByChat(chatId) {
  return dbGet('SELECT t.user_id as "userId", t.chat_id as "chatId", t.lang, u.username FROM telegram_links t JOIN users u ON u.id = t.user_id WHERE t.chat_id = ?', [String(chatId)]);
}
async function unlinkTelegram({ userId, chatId }) {
  if (userId) await dbRun('DELETE FROM telegram_links WHERE user_id = ?', [userId]);
  if (chatId) await dbRun('DELETE FROM telegram_links WHERE chat_id = ?', [String(chatId)]);
}
async function setTelegramLang(chatId, lang) {
  await dbRun('UPDATE telegram_links SET lang = ? WHERE chat_id = ?', [lang, String(chatId)]);
}

// --- 📜 Admin harakatlari jurnali ---
const ADMIN_LOG_LIMIT = 20000;
async function addAdminAction({ adminId, adminName, action, targetType, targetId, targetName, details }) {
  await dbRun('INSERT INTO admin_actions (id, admin_id, admin_name, action, target_type, target_id, target_name, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), adminId || null, adminName || '?', action, targetType || null, targetId || null, targetName || null, details ? JSON.stringify(details).slice(0, 2000) : null, new Date().toISOString()]);
  if (Math.random() < 0.02) {
    const total = await dbGet('SELECT COUNT(*) as n FROM admin_actions');
    if (Number(total.n) > ADMIN_LOG_LIMIT) await dbRun('DELETE FROM admin_actions WHERE id IN (SELECT id FROM admin_actions ORDER BY created_at ASC LIMIT ?)', [Number(total.n) - ADMIN_LOG_LIMIT]);
  }
}
// Filtr: action (aniq nom yoki "ban" kabi guruh boshi), q — admin yoki nishon nomi; 50 tadan sahifalab
async function listAdminActions({ action, q, page } = {}) {
  const where = [], params = [];
  if (action) { where.push('action LIKE ?'); params.push(String(action).replace(/[%_]/g, '') + '%'); }
  if (q) { const like = '%' + String(q).replace(/[%_]/g, '').toLowerCase() + '%'; where.push('(LOWER(admin_name) LIKE ? OR LOWER(target_name) LIKE ?)'); params.push(like, like); }
  const per = 50, p = Math.max(0, Number(page) || 0);
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = await dbAll(`SELECT id, admin_name as "admin", action, target_type as "targetType", target_id as "targetId", target_name as "target", details, created_at as "createdAt"
    FROM admin_actions ${w} ORDER BY created_at DESC LIMIT ${per + 1} OFFSET ${p * per}`, params);
  return { actions: rows.slice(0, per).map(r => ({ ...r, details: parseJson(r.details) })), more: rows.length > per, page: p };
}

// --- 🐞 Xatolar jurnali ---
const ERROR_LOG_LIMIT = 500;
// Natija: isNew — bu xato birinchi marta (yoki hal qilingandan keyin qayta) chiqdi
async function logError({ fingerprint, source, message, stack, context, times }) {
  const n = Math.max(1, Number(times) || 1);
  const now = new Date().toISOString();
  const ctx = context ? JSON.stringify(context).slice(0, 2000) : null;
  const row = await dbGet('SELECT id, resolved FROM error_log WHERE fingerprint = ?', [fingerprint]);
  if (row) {
    await dbRun('UPDATE error_log SET count = count + ?, last_seen = ?, message = ?, stack = ?, context = ?, resolved = 0 WHERE id = ?',
      [n, now, message, stack || null, ctx, row.id]);
    return { id: row.id, isNew: Number(row.resolved) === 1 };
  }
  const id = uuidv4();
  await dbRun('INSERT INTO error_log (id, fingerprint, source, message, stack, context, count, first_seen, last_seen, resolved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
    [id, fingerprint, source, message, stack || null, ctx, n, now, now]);
  // Eng eski qatorlar o'chiriladi (jadval cheksiz o'smasin)
  const total = await dbGet('SELECT COUNT(*) as n FROM error_log');
  if (Number(total.n) > ERROR_LOG_LIMIT) {
    await dbRun('DELETE FROM error_log WHERE id IN (SELECT id FROM error_log ORDER BY resolved DESC, last_seen ASC LIMIT ?)', [Number(total.n) - ERROR_LOG_LIMIT]);
  }
  return { id, isNew: true };
}
async function listErrors(status, source) {
  const where = ['resolved = ?'], params = [status === 'resolved' ? 1 : 0];
  if (source === 'server' || source === 'client') { where.push('source = ?'); params.push(source); }
  const rows = await dbAll(`SELECT id, source, message, stack, context, count, first_seen as "firstSeen", last_seen as "lastSeen", resolved
    FROM error_log WHERE ${where.join(' AND ')} ORDER BY last_seen DESC LIMIT 200`, params);
  return rows.map(r => ({ ...r, count: Number(r.count) || 0, resolved: Number(r.resolved) === 1, context: parseJson(r.context) }));
}
async function errorCounts() {
  const rows = await dbAll('SELECT source, COUNT(*) as n FROM error_log WHERE resolved = 0 GROUP BY source');
  const out = { server: 0, client: 0 };
  for (const r of rows) out[r.source] = Number(r.n) || 0;
  return out;
}
async function setErrorResolved(id, resolved) {
  await dbRun('UPDATE error_log SET resolved = ? WHERE id = ?', [resolved ? 1 : 0, id]);
}
async function deleteResolvedErrors() {
  await dbRun('DELETE FROM error_log WHERE resolved = 1');
}

// --- 💾 Zaxira nusxa: barcha jadvallar (FK tartibida) ---
const quoteId = (name) => '"' + String(name).replace(/"/g, '""') + '"';
async function tableNames() {
  if (usePostgres) {
    return (await dbAll("SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")).map(r => r.name);
  }
  return (await dbAll("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")).map(r => r.name);
}
async function tableColumns(table) {
  if (usePostgres) {
    return (await dbAll("SELECT column_name as name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ? ORDER BY ordinal_position", [table])).map(r => r.name);
  }
  return (await dbAll(`PRAGMA table_info(${quoteId(table)})`)).map(r => r.name);
}
// Jadvallar: avval murojaat qilinadiganlari (users), keyin ularga bog'langanlari
async function tablesInFkOrder() {
  const names = await tableNames();
  const deps = new Map(names.map(n => [n, new Set()]));
  if (usePostgres) {
    const rows = await dbAll(`SELECT tc.table_name as child, ccu.table_name as parent FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`);
    for (const r of rows) if (deps.has(r.child) && r.child !== r.parent) deps.get(r.child).add(r.parent);
  } else {
    for (const n of names) {
      for (const fk of await dbAll(`PRAGMA foreign_key_list(${quoteId(n)})`)) if (fk.table !== n && deps.has(fk.table)) deps.get(n).add(fk.table);
    }
  }
  const order = [], seen = new Set();
  const visit = (n, stack = new Set()) => {
    if (seen.has(n) || stack.has(n)) return;
    stack.add(n);
    for (const p of deps.get(n) || []) visit(p, stack);
    seen.add(n); order.push(n);
  };
  names.sort().forEach(n => visit(n));
  return order;
}
async function dumpDatabase() {
  const tables = {};
  let rowsTotal = 0;
  for (const name of await tablesInFkOrder()) {
    const rows = await dbAll(`SELECT * FROM ${quoteId(name)}`);
    tables[name] = rows;
    rowsTotal += rows.length;
  }
  return { format: 'chessdom-backup', version: 1, createdAt: new Date().toISOString(), engine: usePostgres ? 'postgres' : 'sqlite', rows: rowsTotal, tables };
}
function closeDatabase() {
  if (usePostgres) return pool.end();
  return new Promise((resolve) => sqliteDb.close(() => resolve()));
}
async function isDatabaseEmpty() {
  return Number((await dbGet('SELECT COUNT(*) as n FROM users')).n) === 0;
}
// Zaxiradan tiklash (jadvallar initDatabase bilan yaratilgan bo'lishi kerak). force — mavjud ma'lumot o'chiriladi.
// Faqat ikkala tomonda bor ustunlar yoziladi; mavjud qator (bir xil kalit) o'tkazib yuboriladi.
async function restoreDump(dump, { force = false, onTable } = {}) {
  if (!dump || dump.format !== 'chessdom-backup' || !dump.tables) throw new Error("Zaxira fayli formati noto'g'ri");
  const order = await tablesInFkOrder();
  if (force) {
    for (const name of [...order].reverse()) await dbRun(`DELETE FROM ${quoteId(name)}`);
  } else if (!(await isDatabaseEmpty())) {
    throw new Error("Baza bo'sh emas (--force bilan mavjud ma'lumot o'chiriladi)");
  }
  const result = {};
  const pending = [];
  for (const name of order) {
    const rows = dump.tables[name];
    if (!Array.isArray(rows) || !rows.length) continue;
    const have = new Set(await tableColumns(name));
    const cols = Object.keys(rows[0]).filter(c => have.has(c));
    if (!cols.length) continue;
    const sql = `INSERT INTO ${quoteId(name)} (${cols.map(quoteId).join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) ON CONFLICT DO NOTHING`;
    let ok = 0;
    for (const row of rows) {
      const vals = cols.map(c => {
        const v = row[c];
        return v !== null && typeof v === 'object' ? JSON.stringify(v) : (v === undefined ? null : v);
      });
      // O'ziga bog'langan jadvallar (masalan, javob xabari) — tartib buzilsa, oxirida qayta urinish
      try { await dbRun(sql, vals); ok++; } catch (e) { pending.push({ name, sql, vals, err: e }); }
    }
    result[name] = ok;
    if (onTable) onTable(name, ok, rows.length);
  }
  const failed = [];
  for (const p of pending) {
    try { await dbRun(p.sql, p.vals); result[p.name] = (result[p.name] || 0) + 1; } catch (e) { failed.push({ table: p.name, error: e.message }); }
  }
  return { tables: result, failed };
}

module.exports = {
  PROVISIONAL_GAMES,
  isProvisional,
  getInviteCode,
  getUserByInviteCode,
  setInvitedBy,
  inviteStats,
  countInvited,
  makeFriends,
  linkTelegram,
  getTelegramLink,
  getTelegramLinkByChat,
  unlinkTelegram,
  setTelegramLang,
  addAdminAction,
  listAdminActions,
  logError,
  listErrors,
  errorCounts,
  setErrorResolved,
  deleteResolvedErrors,
  dumpDatabase,
  restoreDump,
  isDatabaseEmpty,
  closeDatabase,
  initDatabase,
  getUserByUsername,
  getUserById,
  createUser,
  updateUserStats,
  touchUserLastActive,
  updateUserCountry,
  getLeaderboard,
  getDailyWinners,
  getStatsByUsername,
  getUserGames,
  updateUserRatingByResult,
  getTournamentById,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getFriends,
  getFriendRequests,
  getChatMessages,
  sendChatMessage,
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
  addSportRating,
  addResultPrediction,
  roomResultPredictions,
  resolveResultPrediction,
  saveMoveGuesses,
  predictionLeaders,
  predictionSummary,
  getPredictionAward,
  savePredictionAward,
  monthPredictionLeaders,
  sportSummary,
  sportMonthLeaders,
  getSportAward,
  saveSportAward,
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
  historyEntries,
  deleteUserAccount,
  getAppSetting,
  setAppSetting,
  savePushSubscription,
  deletePushSubscription,
  listPushSubscriptions,
  touchPushSubscription,
  getPushPrefs,
  setPushPrefs,
  setProfileBanner,
  listQuestWeeks,
  gameOfDayFor,
  createDuel,
  updateDuel,
  stopStaleDuels,
  duelSummary,
  loadDeletedAccountIds,
  getUserHistory,
  getUserGameById,
  opponentSummary,
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
  usernameTaken,
  markGuest,
  listGuestIds,
  gameOfDayCandidates,
  addQuestWeek,
  countQuestWeeks,
  hasQuestWeek,
  getGameOfDay,
  recentGameOfDayIds,
  setGameOfDay,
  caravanRows,
  claimGuest,
  deleteExpiredGuests,
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
