// Swiss turnirlari: har soatda yangi turnir (vaqt nazorati navbat bilan almashadi).
//
// Ro'yxatga olish turnir boshlanishidan oldin ochiq (oldingi soat davomida). Boshlanganda kamida 2 o'yinchi
// bo'lsa 1-tur juftlanadi. Har turda: ochkolari yaqin o'yinchilar juftlanadi (bir-biri bilan qayta o'ynamaydi,
// ranglar navbatma-navbat), toq bo'lsa eng pastdagi o'yinchiga "bye" (+1). Hamma o'yin tugagach, qisqa
// tanaffusdan keyin keyingi tur. Ochko: g'alaba 1, durrang ½, mag'lubiyat 0. Tenglikda — Buchholz.
// Tur boshlanganda saytda bo'lmagan o'yinchi texnik mag'lubiyat oladi va turnirdan chiqariladi (qaytib qo'shilishi mumkin).
const { v4: uuidv4 } = require('uuid');

const CFG = {
  slotMs: Number(process.env.SWISS_SLOT_MS) || 60 * 60 * 1000,
  breakMs: Number(process.env.SWISS_BREAK_MS) || 20 * 1000,
  tickMs: Number(process.env.SWISS_TICK_MS) || 5 * 1000
};
const POINTS = { win: 1, draw: 0.5, loss: 0, bye: 1 };

// Har soat navbatdagisi: [vaqt nazorati, turlar soni]
const CYCLE = [
  { code: '3+2', rounds: 5 },
  { code: '1+0', rounds: 7 },
  { code: '10+0', rounds: 3 },
  { code: '5+0', rounds: 5 },
  { code: '2+1', rounds: 7 },
  { code: '10+5', rounds: 3 }
];

let deps = null; // { db, io, rooms, createGameRoom, scheduleRoomTimer, generateRoomId }
const matchRooms = new Map(); // matchId -> { roomId, room } (server qayta ishga tushsa bo'sh — o'sha o'yinlar durrang deb yopiladi)
let ticking = false;
const reminded = new Set(); // eslatma yuborilganlar: "<turnir>:<o'yinchi>"
const REMIND_MS = Number(process.env.SWISS_REMIND_MS) || 60 * 1000;

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

function slotOf(startMs) {
  const entry = CYCLE[Math.floor(startMs / CFG.slotMs) % CYCLE.length];
  const mode = modeOf(entry.code);
  return { ...entry, mode, startsAt: new Date(startMs).toISOString(), name: `${mode[0].toUpperCase()}${mode.slice(1)} ${entry.code}` };
}

let updateTimer = null;
function emitUpdate() {
  if (updateTimer) return;
  updateTimer = setTimeout(() => { updateTimer = null; deps.io.emit('swiss-update'); }, 500);
}

// --- Turnirlarni yaratish ---
async function ensureUpcoming() {
  const nextStart = (Math.floor(Date.now() / CFG.slotMs) + 1) * CFG.slotMs;
  const slot = slotOf(nextStart);
  const exists = await q.get("SELECT id FROM tournaments WHERE tournament_type = 'swiss' AND started_at = ?", [slot.startsAt]);
  if (exists) return;
  await q.run(`INSERT INTO tournaments (id, name, description, max_players, current_players, status, tournament_type, time_control, rounds, current_round, is_arena, started_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [uuidv4(), slot.name, 'Swiss', 9999, 0, 'registration', 'swiss', slot.code, slot.rounds, 0, 0, slot.startsAt, nowIso()]);
  emitUpdate();
}

// --- Ishtirokchilar ---
async function participants(tournamentId) {
  return q.all(`SELECT tp.id, tp.user_id as "userId", tp.score, tp.games, tp.wins, tp.draws, tp.losses, tp.withdrawn,
      u.username, u.country, u.rating, u.ratings_by_mode as "ratingsByMode"
    FROM tournament_participants tp JOIN users u ON u.id = tp.user_id WHERE tp.tournament_id = ?`, [tournamentId]);
}

async function matchesOf(tournamentId) {
  return q.all(`SELECT id, round, white_id as "whiteId", black_id as "blackId", result, status
    FROM tournament_matches WHERE tournament_id = ? ORDER BY round, board`, [tournamentId]);
}

// O'yinchining natijalari: { score, opponents[], colors[], hadBye }
function historyOf(userId, matches) {
  const h = { opponents: [], colors: [], hadBye: false };
  for (const m of matches) {
    if (m.whiteId === userId) {
      if (m.result === 'bye') h.hadBye = true;
      else { h.opponents.push(m.blackId); h.colors.push('w'); }
    } else if (m.blackId === userId) {
      h.opponents.push(m.whiteId); h.colors.push('b');
    }
  }
  return h;
}

// --- Juftlash ---
// Ro'yxat ochko (keyin reyting) bo'yicha saralangan. Har kim o'zidan keyingi eng yaqin, hali o'ynamagan
// raqib bilan juftlanadi; iloji bo'lmasa orqaga qaytib (backtracking) boshqa variant izlanadi.
function pairPlayers(list, played) {
  const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  const result = [];
  let steps = 0;
  function dfs(rest) {
    if (!rest.length) return true;
    if (++steps > 20000) return false;
    const [a, ...others] = rest;
    for (let i = 0; i < others.length; i++) {
      if (played.has(key(a.userId, others[i].userId))) continue;
      result.push([a, others[i]]);
      if (dfs(others.filter((_, j) => j !== i))) return true;
      result.pop();
    }
    return false;
  }
  if (dfs(list)) return result;
  // Qayta uchrashuvsiz juftlab bo'lmasa — yonma-yonlarni juftlaymiz
  const fallback = [];
  for (let i = 0; i + 1 < list.length; i += 2) fallback.push([list[i], list[i + 1]]);
  return fallback;
}

function assignColors(a, b, histories) {
  const balance = (p) => histories.get(p.userId).colors.reduce((s, c) => s + (c === 'w' ? 1 : -1), 0);
  const last = (p) => histories.get(p.userId).colors.slice(-1)[0];
  const ba = balance(a), bb = balance(b);
  if (ba !== bb) return ba < bb ? [a, b] : [b, a];
  if (last(a) && last(a) !== last(b)) return last(a) === 'b' ? [a, b] : [b, a];
  return Math.random() < 0.5 ? [a, b] : [b, a];
}

function socketOf(userId) {
  const room = deps.io.sockets.adapter.rooms.get(`user_${userId}`);
  if (!room) return null;
  for (const id of room) {
    const s = deps.io.sockets.sockets.get(id);
    if (s && s.connected) return s;
  }
  return null;
}

function isInActiveGame(userId) {
  for (const room of deps.rooms.values()) {
    if (room.status === 'active' && room.players.some(p => p.userId === userId)) return true;
  }
  return false;
}

async function addResult(tournamentId, userId, kind) {
  const row = await q.get('SELECT * FROM tournament_participants WHERE tournament_id = ? AND user_id = ?', [tournamentId, userId]);
  if (!row) return;
  const isGame = kind !== 'bye';
  await q.run('UPDATE tournament_participants SET score = ?, games = ?, wins = ?, draws = ?, losses = ? WHERE id = ?', [
    (Number(row.score) || 0) + POINTS[kind],
    (Number(row.games) || 0) + (isGame ? 1 : 0),
    (Number(row.wins) || 0) + (kind === 'win' ? 1 : 0),
    (Number(row.draws) || 0) + (kind === 'draw' ? 1 : 0),
    (Number(row.losses) || 0) + (kind === 'loss' ? 1 : 0),
    row.id
  ]);
}

async function withdraw(tournamentId, userId) {
  await q.run('UPDATE tournament_participants SET withdrawn = 1 WHERE tournament_id = ? AND user_id = ?', [tournamentId, userId]);
}

// Natija: '1-0' | '0-1' | '1/2' | '+-' / '-+' (texnik) | '--' (ikkalasi ham kelmadi)
async function applyResult(t, match, result) {
  await q.run('UPDATE tournament_matches SET result = ?, status = ?, winner_id = ?, completed_at = ? WHERE id = ?', [
    result, 'finished',
    (result === '1-0' || result === '+-') ? match.whiteId : ((result === '0-1' || result === '-+') ? match.blackId : null),
    nowIso(), match.id
  ]);
  const w = { '1-0': 'win', '+-': 'win', '0-1': 'loss', '-+': 'loss', '1/2': 'draw', '--': 'loss' }[result];
  const b = { '1-0': 'loss', '+-': 'loss', '0-1': 'win', '-+': 'win', '1/2': 'draw', '--': 'loss' }[result];
  await addResult(t.id, match.whiteId, w);
  await addResult(t.id, match.blackId, b);
}

async function startTournament(t) {
  const list = (await participants(t.id)).filter(p => !Number(p.withdrawn));
  if (list.length < 2) {
    await q.run("UPDATE tournaments SET status = 'cancelled', finished_at = ? WHERE id = ?", [nowIso(), t.id]);
    emitUpdate();
    return;
  }
  await q.run("UPDATE tournaments SET status = 'active' WHERE id = ?", [t.id]);
  await startRound({ ...t, status: 'active' }, 1);
}

async function finishTournament(t) {
  await q.run("UPDATE tournaments SET status = 'completed', finished_at = ?, next_round_at = NULL WHERE id = ?", [nowIso(), t.id]);
  emitUpdate();
}

async function startRound(t, roundNo) {
  const matches = await matchesOf(t.id);
  const all = await participants(t.id);
  const active = all.filter(p => !Number(p.withdrawn));
  if (active.length < 2) return finishTournament(t);

  const histories = new Map(all.map(p => [p.userId, historyOf(p.userId, matches)]));
  const played = new Set();
  for (const m of matches) if (m.blackId) played.add(m.whiteId < m.blackId ? m.whiteId + '|' + m.blackId : m.blackId + '|' + m.whiteId);
  const mode = modeOf(t.time_control);
  const ratingOf = (p) => Number(deps.db.parseJson(p.ratingsByMode, {})[mode]) || Number(p.rating) || 1500;
  active.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0) || ratingOf(b) - ratingOf(a));

  // Toq bo'lsa — eng pastdagi (hali bye olmagan) o'yinchiga bye
  let bye = null;
  if (active.length % 2 === 1) {
    let idx = active.length - 1;
    while (idx >= 0 && histories.get(active[idx].userId).hadBye) idx--;
    if (idx < 0) idx = active.length - 1;
    [bye] = active.splice(idx, 1);
  }

  await q.run('UPDATE tournaments SET current_round = ?, next_round_at = NULL WHERE id = ?', [roundNo, t.id]);
  const pairs = pairPlayers(active, played);
  const clock = parseClock(t.time_control);
  const info = { id: t.id, name: t.name, round: roundNo, rounds: t.rounds };
  let board = 0;
  for (const [a, b] of pairs) {
    const [white, black] = assignColors(a, b, histories);
    const match = { id: uuidv4(), whiteId: white.userId, blackId: black.userId };
    await q.run(`INSERT INTO tournament_matches (id, tournament_id, round, board, player1_id, player2_id, white_id, black_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [match.id, t.id, roundNo, ++board, white.userId, black.userId, white.userId, black.userId, 'playing', nowIso()]);
    const ws = !isInActiveGame(white.userId) && socketOf(white.userId);
    const bs = !isInActiveGame(black.userId) && socketOf(black.userId);
    if (!ws || !bs) {
      // Saytda yo'q o'yinchi texnik mag'lubiyat oladi va keyingi turlarga juftlanmaydi
      await applyResult(t, match, ws ? '+-' : (bs ? '-+' : '--'));
      if (!ws) await withdraw(t.id, white.userId);
      if (!bs) await withdraw(t.id, black.userId);
      continue;
    }
    const roomId = deps.generateRoomId();
    const room = deps.createGameRoom(
      { socketId: ws.id, userId: white.userId, username: white.username },
      { socketId: bs.id, userId: black.userId, username: black.username },
      clock, true
    );
    room.swissMatch = { tournamentId: t.id, matchId: match.id };
    deps.rooms.set(roomId, room);
    matchRooms.set(match.id, { roomId, room });
    const opp = (p) => ({ username: p.username, rating: ratingOf(p), ratingsByMode: deps.db.parseJson(p.ratingsByMode, null), country: p.country || null });
    for (const [s, color, opponent] of [[ws, 'w', black], [bs, 'b', white]]) {
      s.join(roomId);
      s.emit('match-found', { roomId, color, opponent: opp(opponent), clock, rated: true, mode: room.mode, swiss: info });
    }
    deps.scheduleRoomTimer(roomId, room);
  }
  if (bye) {
    await q.run(`INSERT INTO tournament_matches (id, tournament_id, round, board, player1_id, white_id, result, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [uuidv4(), t.id, roundNo, ++board, bye.userId, bye.userId, 'bye', 'finished', nowIso()]);
    await addResult(t.id, bye.userId, 'bye');
  }
  emitUpdate();
  await checkRoundDone(t.id);
}

async function checkRoundDone(tournamentId) {
  const t = await q.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId]);
  if (!t || t.status !== 'active' || t.next_round_at) return;
  const playing = await q.get("SELECT COUNT(*) as \"n\" FROM tournament_matches WHERE tournament_id = ? AND round = ? AND status = 'playing'", [t.id, t.current_round]);
  if (Number(playing && playing.n) > 0) return;
  if (t.current_round >= t.rounds) return finishTournament(t);
  await q.run('UPDATE tournaments SET next_round_at = ? WHERE id = ?', [new Date(Date.now() + CFG.breakMs).toISOString(), t.id]);
  emitUpdate();
}

// Server endGame() dan chaqiriladi
async function recordGameResult(room, winnerColor, reason) {
  const { tournamentId, matchId } = room.swissMatch;
  const t = await q.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId]);
  const match = await q.get('SELECT id, white_id as "whiteId", black_id as "blackId", status FROM tournament_matches WHERE id = ?', [matchId]);
  if (!t || !match || match.status !== 'playing') { matchRooms.delete(matchId); return; }
  let result;
  if (reason === 'aborted') {
    // Birinchi yurishni qilmagan tomon texnik mag'lubiyat oladi va turnirdan chiqariladi
    const moves = room.chess.history().length;
    result = moves === 0 ? '-+' : '+-';
    await withdraw(t.id, moves === 0 ? match.whiteId : match.blackId);
  } else {
    result = winnerColor === 'w' ? '1-0' : (winnerColor === 'b' ? '0-1' : '1/2');
  }
  await applyResult(t, match, result);
  // Natija yozilguncha o'yin 'playing' — tick uni yo'qolgan deb hisoblamasligi uchun shundan keyin o'chiramiz
  matchRooms.delete(matchId);
  emitUpdate();
  await checkRoundDone(t.id);
}

async function tick() {
  if (ticking || !deps) return;
  ticking = true;
  try {
    await ensureUpcoming();
    const now = nowIso();
    // Boshlanishiga 1 daqiqa qolganda ro'yxatdagilarga eslatma
    const soon = new Date(Date.now() + REMIND_MS).toISOString();
    for (const t of await q.all("SELECT * FROM tournaments WHERE tournament_type = 'swiss' AND status = 'registration' AND started_at <= ? AND started_at > ?", [soon, now])) {
      const players = await q.all('SELECT user_id as "userId" FROM tournament_participants WHERE tournament_id = ? AND withdrawn = 0', [t.id]);
      for (const p of players) {
        const key = t.id + ':' + p.userId;
        if (reminded.has(key)) continue;
        reminded.add(key);
        deps.io.to(`user_${p.userId}`).emit('swiss-reminder', { id: t.id, name: t.name, startsAt: t.started_at });
      }
    }
    for (const t of await q.all("SELECT * FROM tournaments WHERE tournament_type = 'swiss' AND status = 'registration' AND started_at <= ?", [now])) {
      await startTournament(t);
    }
    for (const t of await q.all("SELECT * FROM tournaments WHERE tournament_type = 'swiss' AND status = 'active'")) {
      // Server qayta ishga tushgan bo'lsa, xonasi yo'qolgan o'yinlar durrang bilan yopiladi
      const stale = await q.all("SELECT id, white_id as \"whiteId\", black_id as \"blackId\" FROM tournament_matches WHERE tournament_id = ? AND status = 'playing'", [t.id]);
      for (const m of stale) {
        if (!matchRooms.has(m.id)) await applyResult(t, m, '1/2');
      }
      if (stale.length) await checkRoundDone(t.id);
      const fresh = await q.get('SELECT * FROM tournaments WHERE id = ?', [t.id]);
      if (fresh.status === 'active' && fresh.next_round_at && fresh.next_round_at <= now) await startRound(fresh, fresh.current_round + 1);
    }
  } catch (err) {
    console.error('Swiss tick xatoligi:', err);
  } finally {
    ticking = false;
  }
}

// --- Qo'shilish / chiqish ---
async function join(tournamentId, userId) {
  const t = await q.get("SELECT * FROM tournaments WHERE id = ? AND tournament_type = 'swiss'", [tournamentId]);
  if (!t) return { success: false, message: 'Turnir topilmadi!' };
  const lateOk = t.status === 'active' && t.current_round < t.rounds;
  if (t.status !== 'registration' && !lateOk) return { success: false, message: "Turnirga qo'shilish yopilgan!" };
  const busy = await q.get(`SELECT t.id FROM tournament_participants tp JOIN tournaments t ON t.id = tp.tournament_id
    WHERE tp.user_id = ? AND tp.withdrawn = 0 AND t.tournament_type = 'swiss' AND t.status IN ('registration', 'active') AND t.id <> ?`, [userId, t.id]);
  if (busy) return { success: false, message: "Siz boshqa turnirda ishtirok etyapsiz!" };
  const row = await q.get('SELECT id FROM tournament_participants WHERE tournament_id = ? AND user_id = ?', [t.id, userId]);
  if (row) await q.run('UPDATE tournament_participants SET withdrawn = 0 WHERE id = ?', [row.id]);
  else {
    await q.run('INSERT INTO tournament_participants (id, tournament_id, user_id, score, games, wins, draws, losses, withdrawn, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), t.id, userId, 0, 0, 0, 0, 0, 0, nowIso()]);
    await q.run('UPDATE tournaments SET current_players = current_players + 1 WHERE id = ?', [t.id]);
  }
  emitUpdate();
  return { success: true };
}

async function leave(tournamentId, userId) {
  const t = await q.get("SELECT * FROM tournaments WHERE id = ? AND tournament_type = 'swiss'", [tournamentId]);
  if (!t) return { success: false, message: 'Turnir topilmadi!' };
  if (t.status === 'registration') {
    const row = await q.get('SELECT id FROM tournament_participants WHERE tournament_id = ? AND user_id = ?', [t.id, userId]);
    if (row) {
      await q.run('DELETE FROM tournament_participants WHERE id = ?', [row.id]);
      await q.run('UPDATE tournaments SET current_players = current_players - 1 WHERE id = ?', [t.id]);
    }
  } else if (t.status === 'active') {
    await withdraw(t.id, userId);
  }
  emitUpdate();
  return { success: true };
}

// --- API uchun ma'lumotlar ---
function tournamentInfo(t, players) {
  return {
    id: t.id, name: t.name, timeControl: t.time_control, mode: modeOf(t.time_control), status: t.status,
    rounds: t.rounds, round: t.current_round || 0, startsAt: t.started_at, nextRoundAt: t.next_round_at || null,
    finishedAt: t.finished_at || null, players
  };
}

async function standings(t, matches) {
  const rows = await participants(t.id);
  const mode = modeOf(t.time_control);
  const scoreOf = new Map(rows.map(r => [r.userId, Number(r.score) || 0]));
  const list = rows.map(r => {
    const ratings = deps.db.parseJson(r.ratingsByMode, {});
    const results = [];
    for (const m of matches) {
      if (m.whiteId !== r.userId && m.blackId !== r.userId) continue;
      if (m.result === 'bye') { results.push({ round: m.round, r: 'B' }); continue; }
      const white = m.whiteId === r.userId;
      const res = m.status === 'playing' ? '*' : ({
        '1-0': white ? '1' : '0', '0-1': white ? '0' : '1', '1/2': '½',
        '+-': white ? '+' : '-', '-+': white ? '-' : '+', '--': '-'
      }[m.result] || '?');
      results.push({ round: m.round, r: res, color: white ? 'w' : 'b' });
    }
    const opponents = historyOf(r.userId, matches).opponents;
    return {
      userId: r.userId, username: r.username, country: r.country || null,
      rating: Number(ratings[mode]) || Number(r.rating) || 1500,
      score: Number(r.score) || 0, games: Number(r.games) || 0,
      wins: Number(r.wins) || 0, draws: Number(r.draws) || 0, losses: Number(r.losses) || 0,
      withdrawn: !!Number(r.withdrawn),
      buchholz: opponents.reduce((s, id) => s + (scoreOf.get(id) || 0), 0),
      results
    };
  });
  return list.sort((a, b) => b.score - a.score || b.buchholz - a.buchholz || b.rating - a.rating || a.username.localeCompare(b.username));
}

async function detail(tournamentId, userId) {
  const t = await q.get("SELECT * FROM tournaments WHERE id = ? AND tournament_type = 'swiss'", [tournamentId]);
  if (!t) return null;
  const matches = await matchesOf(t.id);
  const table = await standings(t, matches);
  const names = new Map(table.map(p => [p.userId, { username: p.username, country: p.country }]));
  const rounds = {};
  for (const m of matches) {
    (rounds[m.round] = rounds[m.round] || []).push({
      white: names.get(m.whiteId) || null, black: m.blackId ? (names.get(m.blackId) || null) : null,
      result: m.status === 'playing' ? null : m.result,
      roomId: m.status === 'playing' && matchRooms.has(m.id) ? matchRooms.get(m.id).roomId : null
    });
  }
  const meIndex = userId ? table.findIndex(p => p.userId === userId) : -1;
  let roomId = null;
  if (userId) {
    for (const entry of matchRooms.values()) {
      const room = entry.room;
      if (room.status === 'active' && room.swissMatch.tournamentId === t.id && room.players.some(p => p.userId === userId)) roomId = entry.roomId;
    }
  }
  return {
    serverNow: nowIso(),
    points: POINTS,
    tournament: tournamentInfo(t, table.filter(p => !p.withdrawn).length),
    standings: table,
    rounds,
    me: userId ? {
      registered: meIndex !== -1 && !table[meIndex].withdrawn,
      withdrawn: meIndex !== -1 && table[meIndex].withdrawn,
      rank: meIndex === -1 ? null : meIndex + 1,
      row: meIndex === -1 ? null : table[meIndex],
      roomId
    } : null
  };
}

// Sahifa uchun ro'yxat: hozirgi, keyingi va bugungi tugaganlar (g'olibi bilan)
async function overview(userId) {
  await ensureUpcoming();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const rows = await q.all(`SELECT * FROM tournaments WHERE tournament_type = 'swiss' AND (started_at >= ? OR status IN ('registration', 'active')) ORDER BY started_at DESC LIMIT 30`, [since]);
  const list = [];
  for (const t of rows) {
    const players = await q.all('SELECT tp.user_id as "userId", tp.withdrawn, u.username, u.country FROM tournament_participants tp JOIN users u ON u.id = tp.user_id WHERE tp.tournament_id = ?', [t.id]);
    let winner = null;
    if (t.status === 'completed') {
      const top = (await standings(t, await matchesOf(t.id)))[0];
      if (top) winner = { username: top.username, country: top.country, score: top.score };
    }
    list.push({ ...tournamentInfo(t, players.filter(p => !Number(p.withdrawn)).length), winner,
      joined: !!userId && players.some(p => p.userId === userId && !Number(p.withdrawn)) });
  }
  // Asosiy turnir: o'zim qatnashayotgani, bo'lmasa davom etayotgani, bo'lmasa ro'yxatga ochig'i
  const featured = list.find(t => t.joined && (t.status === 'active' || t.status === 'registration'))
    || list.find(t => t.status === 'active') || list.find(t => t.status === 'registration') || list[0] || null;
  return { serverNow: nowIso(), tournaments: list, featuredId: featured ? featured.id : null };
}

// Admin: ro'yxatga olinayotgan yoki davom etayotgan turnirni bekor qilish (davom etayotgan o'yinlar natijasi yozilmaydi)
async function cancelTournament(tournamentId) {
  const t = await q.get("SELECT * FROM tournaments WHERE id = ? AND tournament_type = 'swiss'", [tournamentId]);
  if (!t) return { success: false, message: 'Turnir topilmadi!' };
  if (t.status !== 'registration' && t.status !== 'active') return { success: false, message: 'Turnir allaqachon tugagan' };
  await q.run("UPDATE tournaments SET status = 'cancelled', finished_at = ?, next_round_at = NULL WHERE id = ?", [nowIso(), t.id]);
  await q.run("UPDATE tournament_matches SET status = 'finished', result = '1/2' WHERE tournament_id = ? AND status = 'playing'", [t.id]);
  for (const [matchId, entry] of matchRooms) {
    if (entry.room.swissMatch && entry.room.swissMatch.tournamentId === t.id) { entry.room.swissMatch = null; matchRooms.delete(matchId); }
  }
  emitUpdate();
  return { success: true };
}

// Server qayta ishga tushganda tiklangan turnir o'yinini qayta bog'lash
function adoptRoom(matchId, roomId, room) {
  matchRooms.set(matchId, { roomId, room });
}

module.exports = { CFG, POINTS, CYCLE, init, tick, adoptRoom, cancelTournament, join, leave, recordGameResult, overview, detail, pairPlayers };
