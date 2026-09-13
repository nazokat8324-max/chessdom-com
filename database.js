const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');
});

function dbGet(sql, ...params) {
  return new Promise((resolve, reject) => {
    db.get(sql, ...params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, ...params) {
  return new Promise((resolve, reject) => {
    db.all(sql, ...params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(sql, ...params) {
  return new Promise((resolve, reject) => {
    db.run(sql, ...params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbExec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
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
      score INTEGER DEFAULT 0,
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

  console.log('✅ Database SQLite sahifalari yaratildi.');
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

async function getUserByUsername(username) {
  const row = await dbGet('SELECT * FROM users WHERE username = ?', username);
  if (!row) return null;
  return { ...row, stats: parseJson(row.stats), stats_by_mode: parseJson(row.stats_by_mode), history: parseJson(row.history) };
}

async function getUserById(id) {
  const row = await dbGet('SELECT * FROM users WHERE id = ?', id);
  if (!row) return null;
  return { ...row, stats: parseJson(row.stats), stats_by_mode: parseJson(row.stats_by_mode), history: parseJson(row.history) };
}

async function createUser(user) {
  const id = uuidv4();
  await dbRun(
    'INSERT INTO users (id, username, email, password_hash, rating, stats, stats_by_mode, history, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, user.username, user.email, user.passwordHash, user.rating || 1500, JSON.stringify(user.stats || { wins: 0, losses: 0, draws: 0 }), JSON.stringify(user.statsByMode || { rapid: { wins: 0, losses: 0, draws: 0 }, blitz: { wins: 0, losses: 0, draws: 0 }, bullet: { wins: 0, losses: 0, draws: 0 } }), JSON.stringify(user.history || []), new Date().toISOString()]
  );
  return { id, username: user.username, email: user.email, rating: user.rating || 1500, stats: user.stats || { wins: 0, losses: 0, draws: 0 }, statsByMode: user.statsByMode, history: user.history || [], created_at: new Date().toISOString() };
}

async function updateUserStats(userId, result, opponent, mode, moves, timeControl) {
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
  history.push({ id: uuidv4(), date: new Date().toLocaleDateString(), timestamp: new Date().toISOString(), result, opponent: opponent || 'Online', mode: mode || 'Online o\'yin', timeControl: timeControl || 'blitz', moves: moves || [] });

  await dbRun('UPDATE users SET stats = ?, stats_by_mode = ?, history = ?, last_active = ? WHERE id = ?', [JSON.stringify(stats), JSON.stringify(statsByMode), JSON.stringify(history), new Date().toISOString(), userId]);

  return { stats, statsByMode, history };
}

async function updateUserRating(userId, newRating) {
  await dbRun('UPDATE users SET rating = ? WHERE id = ?', [newRating, userId]);
}

async function getLeaderboard() {
  const rows = await dbAll('SELECT username, rating, stats, stats_by_mode FROM users ORDER BY rating DESC LIMIT 100');
  return rows.map(u => ({
    username: u.username,
    wins: parseInt(u.stats ? JSON.parse(u.stats).wins : 0) || 0,
    losses: parseInt(u.stats ? JSON.parse(u.stats).losses : 0) || 0,
    draws: parseInt(u.stats ? JSON.parse(u.stats).draws : 0) || 0,
    rating: u.rating || 1500,
    statsByMode: u.stats_by_mode ? JSON.parse(u.stats_by_mode) : { rapid: { wins: 0, losses: 0, draws: 0 }, blitz: { wins: 0, losses: 0, draws: 0 }, bullet: { wins: 0, losses: 0, draws: 0 } }
  }));
}

async function getDailyWinners() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const users = await dbAll('SELECT username, stats, history, rating FROM users');
  const dailyWins = users.map(u => {
    const history = parseJson(u.history) || [];
    const wins = history.filter(game => {
      if (game.result !== 'win') return false;
      const ts = game.timestamp || game.date;
      if (!ts) return false;
      const gameDate = new Date(ts);
      return !isNaN(gameDate.getTime()) && gameDate >= cutoff;
    }).length;
    return { username: u.username, dailyWins: wins, rating: u.rating || 1500 };
  }).filter(u => u.dailyWins > 0).sort((a, b) => b.dailyWins - a.dailyWins).slice(0, 5);
  return { success: true, winners: dailyWins };
}

async function getStatsByUsername(username) {
  const user = await getUserByUsername(username);
  if (!user) return null;
  return { success: true, stats: user.stats || { wins: 0, losses: 0, draws: 0 }, rating: user.rating || 1500 };
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

async function updateUserRatingByResult(userId, result, opponentRating) {
  const user = await getUserById(userId);
  if (!user) return null;
  const playerRating = user.rating || 1500;
  const opponent = opponentRating || 1500;
  const expectedScore = 1 / (1 + Math.pow(10, (opponent - playerRating) / 400));
  let score = 0.5;
  if (result === 'win') score = 1;
  else if (result === 'loss') score = 0;
  const kFactor = 32;
  const ratingChange = Math.round(kFactor * (score - expectedScore));
  const newRating = Math.max(100, playerRating + ratingChange);
  await updateUserRating(userId, newRating);
  return { success: true, newRating, change: ratingChange };
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

async function tournamentJoin(tournamentId, userId, club) {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) return { success: false, message: 'Turnir topilmadi!' };
  if (!tournament.is_arena && tournament.status !== 'waiting') return { success: false, message: 'Turnir allaqachon boshlangan!' };
  if (tournament.current_players >= tournament.max_players) return { success: false, message: 'Turnir to\'la!' };

  const existing = await dbGet('SELECT id FROM tournament_participants WHERE tournament_id = ? AND user_id = ?', [tournamentId, userId]);
  if (existing) return { success: false, message: 'Siz allaqachon turnirdasiz!' };

  await dbRun('INSERT INTO tournament_participants (tournament_id, user_id, club) VALUES (?, ?, ?)', [tournamentId, userId, club || null]);
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
  const existing = await dbGet('SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = ?', [senderId, receiverId, 'pending']);
  if (existing) return { success: false, message: 'So\'rov allaqachon yuborilgan!' };
  await dbRun('INSERT INTO friend_requests (id, sender_id, receiver_id, status, created_at) VALUES (?, ?, ?, ?, ?)', [uuidv4(), senderId, receiverId, 'pending', new Date().toISOString()]);
  return { success: true, message: 'Do\'stlik so\'rovi yuborildi!' };
}

async function acceptFriendRequest(requestId, receiverId) {
  const req = await dbGet('SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = ?', [requestId, receiverId, 'pending']);
  if (!req) return { success: false, message: 'So\'rov topilmadi!' };
  await dbRun("UPDATE friend_requests SET status = 'accepted', updated_at = ? WHERE id = ?", [new Date().toISOString(), requestId]);
  await dbRun('INSERT INTO friends (id, user_id, friend_id, created_at) VALUES (?, ?, ?, ?)', [uuidv4(), req.sender_id, req.receiver_id, new Date().toISOString()]);
  await dbRun('INSERT INTO friends (id, user_id, friend_id, created_at) VALUES (?, ?, ?, ?)', [uuidv4(), req.receiver_id, req.sender_id, new Date().toISOString()]);
  return { success: true, message: 'Do\'stlik qabul qilindi!' };
}

async function getFriends(userId) {
  const rows = await dbAll(`SELECT u.id, u.username, u.rating, u.last_active FROM friends f JOIN users u ON f.friend_id = u.id WHERE f.user_id = ? ORDER BY u.last_active DESC`, [userId]);
  return rows;
}

async function getFriendRequests(receiverId) {
  const rows = await dbAll(`SELECT fr.id, u.username, u.rating, fr.created_at FROM friend_requests fr JOIN users u ON fr.sender_id = u.id WHERE fr.receiver_id = ? AND fr.status = ?`, [receiverId, 'pending']);
  return rows;
}

async function getChatMessages({ userId, roomId }) {
  let sql = 'SELECT cm.*, u.username FROM chat_messages cm JOIN users u ON cm.sender_id = u.id';
  const params = [];
  if (roomId) { sql += ' WHERE cm.room_id = ?'; params.push(roomId); }
  else if (userId) { sql += ' WHERE (cm.sender_id = ? AND cm.receiver_id = ?) OR (cm.sender_id = ? AND cm.receiver_id = ?)'; params.push(userId, userId, userId, userId); }
  else { sql += ' WHERE cm.receiver_id IS NULL AND cm.room_id IS NULL'; }
  sql += ' ORDER BY cm.created_at ASC LIMIT 100';
  return await dbAll(sql, ...params);
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
  await dbRun('INSERT INTO club_members (club_id, user_id, role) VALUES (?, ?, ?)', [clubId, userId, 'member']);
  await dbRun('UPDATE clubs SET current_members = current_members + 1 WHERE id = ?', [clubId]);
  return { success: true, message: 'Klubga qo\'shildingiz!' };
}

async function getClubMembers(clubId) {
  return await dbAll(`SELECT cm.role, u.username, u.rating, u.last_active FROM club_members cm JOIN users u ON cm.user_id = u.id WHERE cm.club_id = ? ORDER BY cm.joined_at ASC`, [clubId]);
}

async function getClubLeaderboard() {
  const clubs = await dbAll('SELECT id, name, icon, current_members FROM clubs WHERE is_public = 1');
  const users = await dbAll('SELECT id, stats FROM users');
  const userStatsMap = {};
  users.forEach(u => {
    const stats = u.stats ? JSON.parse(u.stats) : { wins: 0, losses: 0, draws: 0 };
    userStatsMap[u.id] = stats;
  });
  const leaderboard = [];
  for (const club of clubs) {
    const members = await dbAll('SELECT user_id FROM club_members WHERE club_id = ?', [club.id]);
    const memberIds = members.map(r => r.user_id);
    let totalWins = 0, totalLosses = 0, totalDraws = 0;
    memberIds.forEach(userId => {
      const s = userStatsMap[userId] || { wins: 0, losses: 0, draws: 0 };
      totalWins += s.wins || 0; totalLosses += s.losses || 0; totalDraws += s.draws || 0;
    });
    const games = totalWins + totalLosses + totalDraws;
    const winPercentage = games > 0 ? ((totalWins / games) * 100).toFixed(1) : '0.0';
    leaderboard.push({ name: club.name || club.icon || '♟️', games, wins: totalWins, losses: totalLosses, winPercentage: parseFloat(winPercentage) });
  }
  leaderboard.sort((a, b) => { if (b.games !== a.games) return b.games - a.games; return parseFloat(b.winPercentage) - parseFloat(a.winPercentage); });
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
  db,
};
