// 24/7 Arena: har soatda yangi turnir (vaqt nazorati jadval bo'yicha almashadi).
//
// O'yinchi "O'ynash" tugmasini bosadi → arena navbatiga turadi → server navbatdagilarni ochkosi
// yaqin raqib bilan juftlab, o'yin xonasini ochadi. O'yin tugagach yana "O'ynash" bosiladi.
// Ochko: g'alaba 2, durrang 1, mag'lubiyat 0. Soat tugaganda eng ko'p ochko to'plagan — g'olib.
// Soat tugashidan oldin boshlangan o'yinlar natijasi ham hisoblanadi.
const { v4: uuidv4 } = require('uuid');
const { getArenaSchedule, getCurrentArenaSlot } = require('./server-helpers');

const CFG = {
  pairMs: Number(process.env.ARENA_PAIR_MS) || 3000,
  slotMs: 60 * 60 * 1000,
  closingMs: 30 * 1000 // tugashiga shuncha qolganda yangi o'yin boshlanmaydi
};
const POINTS = { win: 2, draw: 1, loss: 0 };

let deps = null; // { db, io, rooms, createGameRoom, scheduleRoomTimer, generateRoomId }
const queue = new Map(); // userId -> { arenaId, socketId, username, since }
const lastOpponent = new Map(); // `${arenaId}:${userId}` -> raqib userId (ketma-ket bir xil raqib tushmasin)
const colorBalance = new Map(); // `${arenaId}:${userId}` -> oq o'yinlar soni − qora o'yinlar soni
let pairing = false;

const nowIso = () => new Date().toISOString();
const q = {
  get: (sql, params) => deps.db.dbGet(sql, params || []),
  all: (sql, params) => deps.db.dbAll(sql, params || []),
  run: (sql, params) => deps.db.dbRun(sql, params || [])
};

function init(dependencies) {
  deps = dependencies;
}

function parseClock(code) {
  const m = String(code || '').match(/^(\d+)\+(\d+)$/);
  return m ? { initial: Number(m[1]) * 60, increment: Number(m[2]) } : { initial: 300, increment: 0 };
}

function modeOf(code) {
  const c = parseClock(code);
  const estimate = c.initial + 40 * c.increment;
  return estimate < 180 ? 'bullet' : (estimate < 480 ? 'blitz' : 'rapid');
}

function endsAt(arena) {
  return new Date(arena.started_at).getTime() + CFG.slotMs;
}

async function currentArena() {
  return deps.db.ensureCurrentArena(getCurrentArenaSlot(new Date()));
}

function isInActiveGame(userId) {
  for (const room of deps.rooms.values()) {
    if (room.status === 'active' && room.players.some(p => p.userId === userId)) return true;
  }
  return false;
}

function activeRoomOf(userId) {
  for (const [roomId, room] of deps.rooms.entries()) {
    if (room.status === 'active' && room.arenaId && room.players.some(p => p.userId === userId)) return roomId;
  }
  return null;
}

// Ko'p o'yin bir vaqtda tugasa ham klientlarga sekundiga bir martadan ko'p xabar yubormaymiz
let updateTimer = null;
function emitUpdate() {
  if (updateTimer) return;
  updateTimer = setTimeout(() => { updateTimer = null; deps.io.emit('arena-update'); }, 700);
}

async function play(socket, arenaId) {
  const userId = socket.data.userId;
  if (!userId) return socket.emit('arena-error', { reason: 'auth' });
  const arena = await currentArena();
  if (!arena || arena.id !== arenaId) return socket.emit('arena-error', { reason: 'not_current' });
  if (endsAt(arena) - Date.now() < CFG.closingMs) return socket.emit('arena-error', { reason: 'closing' });
  if (isInActiveGame(userId)) return socket.emit('arena-error', { reason: 'in_game' });
  if (deps.leaveMatchmaking) deps.leaveMatchmaking(userId);

  const joined = await q.get('SELECT id FROM tournament_participants WHERE tournament_id = ? AND user_id = ?', [arena.id, userId]);
  if (!joined) await deps.db.tournamentJoin(arena.id, userId, null);

  queue.set(userId, { arenaId: arena.id, socketId: socket.id, username: socket.data.username, since: Date.now() });
  socket.emit('arena-waiting', { arenaId: arena.id });
  emitUpdate();
  setTimeout(pairPlayers, 200);
}

function leave(socket) {
  const entry = queue.get(socket.data.userId);
  if (entry && entry.socketId === socket.id) {
    queue.delete(socket.data.userId);
    emitUpdate();
  }
}

function leaveUser(userId) {
  if (queue.delete(userId)) emitUpdate();
}

function socketGone(socketId) {
  for (const [userId, entry] of queue) {
    if (entry.socketId === socketId) { queue.delete(userId); emitUpdate(); }
  }
}

// Navbatdagilarni juftlash: ochkosi bo'yicha saralab, yonma-yonlarini (oldingi raqibdan boshqasini) juftlaymiz
async function pairPlayers() {
  if (pairing || !deps) return;
  pairing = true;
  try {
    const arena = queue.size ? await currentArena() : null;
    const byArena = new Map();
    for (const [userId, entry] of queue) {
      const socket = deps.io.sockets.sockets.get(entry.socketId);
      const expired = !arena || entry.arenaId !== arena.id || endsAt(arena) - Date.now() < CFG.closingMs;
      if (!socket || expired || isInActiveGame(userId)) {
        queue.delete(userId);
        if (socket && expired) socket.emit('arena-error', { reason: 'closing' });
        continue;
      }
      if (!byArena.has(entry.arenaId)) byArena.set(entry.arenaId, []);
      byArena.get(entry.arenaId).push({ userId, ...entry });
    }
    for (const [arenaId, list] of byArena) {
      if (list.length < 2) continue;
      const rows = await q.all('SELECT user_id as "userId", score FROM tournament_participants WHERE tournament_id = ?', [arenaId]);
      const score = new Map(rows.map(r => [r.userId, Number(r.score) || 0]));
      list.sort((a, b) => (score.get(b.userId) || 0) - (score.get(a.userId) || 0) || a.since - b.since);
      while (list.length >= 2) {
        const a = list.shift();
        let idx = list.findIndex(b => lastOpponent.get(`${arenaId}:${a.userId}`) !== b.userId);
        if (idx === -1) idx = 0;
        const [b] = list.splice(idx, 1);
        queue.delete(a.userId);
        queue.delete(b.userId);
        await startGame(arena, a, b);
      }
    }
  } catch (err) {
    console.error('Arena juftlash xatoligi:', err);
  } finally {
    pairing = false;
  }
}

async function startGame(arena, a, b) {
  const balance = (p) => colorBalance.get(`${arena.id}:${p.userId}`) || 0;
  let white = a, black = b;
  if (balance(a) > balance(b) || (balance(a) === balance(b) && Math.random() < 0.5)) { white = b; black = a; }
  const [whiteUser, blackUser] = await Promise.all([deps.db.getUserById(white.userId), deps.db.getUserById(black.userId)]);
  const clock = parseClock(arena.time_control);
  const roomId = deps.generateRoomId();
  const room = deps.createGameRoom(
    { socketId: white.socketId, userId: white.userId, username: white.username },
    { socketId: black.socketId, userId: black.userId, username: black.username },
    clock, true
  );
  room.arenaId = arena.id;
  deps.rooms.set(roomId, room);

  lastOpponent.set(`${arena.id}:${white.userId}`, black.userId);
  lastOpponent.set(`${arena.id}:${black.userId}`, white.userId);
  colorBalance.set(`${arena.id}:${white.userId}`, balance(white) + 1);
  colorBalance.set(`${arena.id}:${black.userId}`, balance(black) - 1);

  const info = (u) => ({ username: u.username, rating: u.rating || 1500, ratingsByMode: u.ratings_by_mode, country: u.country || null });
  const arenaInfo = { id: arena.id, name: arena.name, timeControl: arena.time_control };
  for (const [socketId, color, opponent] of [[white.socketId, 'w', blackUser], [black.socketId, 'b', whiteUser]]) {
    const s = deps.io.sockets.sockets.get(socketId);
    if (s) s.join(roomId);
    deps.io.to(socketId).emit('match-found', { roomId, color, opponent: info(opponent), clock, rated: true, mode: room.mode, arena: arenaInfo });
  }
  deps.scheduleRoomTimer(roomId, room);
  emitUpdate();
}

// Server endGame() dan chaqiriladi
async function recordGameResult(room, winnerColor, reason) {
  if (reason !== 'aborted') {
    const players = room.players.slice();
    const white = players.find(p => p.color === 'w');
    const black = players.find(p => p.color === 'b');
    for (const p of players) {
      const result = winnerColor === null ? 'draw' : (p.color === winnerColor ? 'win' : 'loss');
      const opponent = players.find(o => o.color !== p.color);
      const row = await q.get('SELECT * FROM tournament_participants WHERE tournament_id = ? AND user_id = ?', [room.arenaId, p.userId]);
      if (!row) continue;
      const opponents = deps.db.parseJson(row.opponents, []);
      if (opponent) opponents.push(opponent.userId);
      await q.run(`UPDATE tournament_participants SET score = ?, games = ?, wins = ?, draws = ?, losses = ?, opponents = ? WHERE id = ?`, [
        (Number(row.score) || 0) + POINTS[result],
        (Number(row.games) || 0) + 1,
        (Number(row.wins) || 0) + (result === 'win' ? 1 : 0),
        (Number(row.draws) || 0) + (result === 'draw' ? 1 : 0),
        (Number(row.losses) || 0) + (result === 'loss' ? 1 : 0),
        JSON.stringify(opponents.slice(-200)),
        row.id
      ]);
    }
    if (white && black) {
      const winnerId = winnerColor === 'w' ? white.userId : (winnerColor === 'b' ? black.userId : null);
      await deps.db.saveTournamentMatch({
        id: uuidv4(), tournamentId: room.arenaId, round: 0,
        player1Id: white.userId, player2Id: black.userId, whiteId: white.userId, blackId: black.userId,
        winnerId, status: 'finished', completedAt: nowIso()
      });
    }
  }
  emitUpdate();
}

// --- API uchun ma'lumotlar ---

async function standings(arenaId) {
  const rows = await q.all(`SELECT tp.user_id as "userId", tp.score, tp.games, tp.wins, tp.draws, tp.losses,
      u.username, u.country, u.rating, u.ratings_by_mode as "ratingsByMode"
    FROM tournament_participants tp JOIN users u ON u.id = tp.user_id WHERE tp.tournament_id = ?`, [arenaId]);
  const arena = await q.get('SELECT time_control FROM tournaments WHERE id = ?', [arenaId]);
  const mode = modeOf(arena && arena.time_control);
  return rows.map(r => {
    const ratings = deps.db.parseJson(r.ratingsByMode, {});
    return {
      userId: r.userId, username: r.username, country: r.country || null,
      rating: Number(ratings[mode]) || Number(r.rating) || 1500,
      score: Number(r.score) || 0, games: Number(r.games) || 0,
      wins: Number(r.wins) || 0, draws: Number(r.draws) || 0, losses: Number(r.losses) || 0,
      inQueue: queue.has(r.userId) && queue.get(r.userId).arenaId === arenaId,
      playing: !!activeRoomOf(r.userId)
    };
  }).sort((a, b) => b.score - a.score || b.wins - a.wins || a.games - b.games || a.username.localeCompare(b.username));
}

async function recentGames(arenaId, limit) {
  const rows = await q.all(`SELECT tm.white_id as "whiteId", tm.black_id as "blackId", tm.winner_id as "winnerId", tm.created_at as "at",
      w.username as "white", b.username as "black"
    FROM tournament_matches tm LEFT JOIN users w ON w.id = tm.white_id LEFT JOIN users b ON b.id = tm.black_id
    WHERE tm.tournament_id = ? AND tm.status = 'finished' ORDER BY tm.created_at DESC LIMIT ${Number(limit) || 10}`, [arenaId]);
  return rows.map(r => ({
    white: r.white, black: r.black, at: r.at,
    result: r.winnerId === null || r.winnerId === undefined ? '½-½' : (r.winnerId === r.whiteId ? '1-0' : '0-1')
  }));
}

function arenaInfo(arena) {
  return {
    id: arena.id, name: arena.name, timeControl: arena.time_control, mode: modeOf(arena.time_control),
    startsAt: arena.started_at, endsAt: new Date(endsAt(arena)).toISOString()
  };
}

// Bugungi jadval: tugagan turnirlarning g'olibi bilan
async function schedule(now) {
  const slots = getArenaSchedule(now);
  const first = slots[0].slotStart, last = slots[slots.length - 1].slotEnd;
  const arenas = await q.all("SELECT id, started_at FROM tournaments WHERE is_arena = 1 AND started_at >= ? AND started_at < ?", [first, last]);
  const byStart = new Map(arenas.map(a => [new Date(a.started_at).getTime(), a.id]));
  const result = [];
  for (const s of slots) {
    const id = byStart.get(new Date(s.slotStart).getTime()) || null;
    let winner = null, players = 0;
    if (id && s.status !== 'upcoming') {
      const table = (await standings(id)).filter(p => p.games > 0);
      players = table.length;
      if (s.status === 'completed' && table.length) winner = { username: table[0].username, score: table[0].score, country: table[0].country };
    }
    result.push({ hour: s.hour, name: s.name, code: s.code, type: s.type, icon: s.icon, slotStart: s.slotStart, slotEnd: s.slotEnd, status: s.status, arenaId: id, winner, players });
  }
  return result;
}

async function overview(userId) {
  const now = new Date();
  const arena = await currentArena();
  const table = await standings(arena.id);
  const meIndex = userId ? table.findIndex(p => p.userId === userId) : -1;
  const entry = userId ? queue.get(userId) : null;
  return {
    serverNow: now.toISOString(),
    points: POINTS,
    arena: arenaInfo(arena),
    standings: table.slice(0, 50),
    counts: {
      players: table.length,
      inQueue: table.filter(p => p.inQueue).length,
      playing: table.filter(p => p.playing).length
    },
    me: userId ? {
      joined: meIndex !== -1,
      rank: meIndex === -1 ? null : meIndex + 1,
      row: meIndex === -1 ? null : table[meIndex],
      inQueue: !!(entry && entry.arenaId === arena.id),
      roomId: activeRoomOf(userId)
    } : null,
    recentGames: await recentGames(arena.id, 8),
    schedule: await schedule(now)
  };
}

async function results(arenaId) {
  const arena = await q.get('SELECT * FROM tournaments WHERE id = ? AND is_arena = 1', [arenaId]);
  if (!arena) return null;
  return {
    arena: arenaInfo(arena),
    standings: (await standings(arenaId)).filter(p => p.games > 0).slice(0, 50),
    recentGames: await recentGames(arenaId, 10)
  };
}

module.exports = { CFG, POINTS, init, play, leave, leaveUser, socketGone, pairPlayers, recordGameResult, overview, results };
