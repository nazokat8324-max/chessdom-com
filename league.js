// Jamoaviy ligalar: davlat klublari o'rtasida doskalar bo'yicha bahslar.
//
// Mavsum: 10+ a'zoli klublar o'z qit'a ligasida round-robin o'ynaydi (har bahs — 10 ta doska, har tur 48 soat).
// Liga g'oliblari Chempionlar ligasida o'ynaydi (har juftlik 3 ta bahs: 1, 3 va 10 daqiqa).
// So'ng 1 haftalik tanaffus va keyingi mavsum boshqa vaqt nazoratida boshlanadi.
const { v4: uuidv4 } = require('uuid');
const CONTINENTS = require('./continents');

const CFG = {
  roundMs: Number(process.env.LEAGUE_ROUND_MS) || 48 * 60 * 60 * 1000,
  breakMs: Number(process.env.LEAGUE_BREAK_MS) || 7 * 24 * 60 * 60 * 1000,
  minMembers: Number(process.env.LEAGUE_MIN_MEMBERS) || 10,
  minClubs: 2,
  boards: Number(process.env.LEAGUE_BOARDS) || 10,
  tickMs: Number(process.env.LEAGUE_TICK_MS) || 60 * 1000
};

// Har mavsum navbatdagi vaqt nazorati: blits, tezkor, bullet...
const SEASON_CLOCKS = [[180, 2], [600, 0], [60, 1], [300, 0], [900, 10], [120, 1]];
// Chempionlar ligasi: har juftlik 1, 3 va 10 daqiqalik bahslarda o'ynaydi
const CHAMPIONS_CLOCKS = [[60, 0], [180, 0], [600, 0]];

const CONTINENT_OF = {};
for (const [continent, list] of Object.entries(CONTINENTS)) {
  for (const c of list) CONTINENT_OF[c.name] = continent;
}

let deps = null; // { db, io, rooms, createGameRoom, scheduleRoomTimer, clockMode, generateRoomId }
const waiting = new Map(); // gameId -> { w: socketId, b: socketId } — "O'ynash" tugmasini bosib kutayotganlar
let ticking = false;

const nowIso = () => new Date().toISOString();
const q = {
  get: (sql, params) => deps.db.dbGet(sql, params || []),
  all: (sql, params) => deps.db.dbAll(sql, params || []),
  run: (sql, params) => deps.db.dbRun(sql, params || [])
};

function init(dependencies) {
  deps = dependencies;
}

// --- Round-robin jadval (aylana usuli). Har juftlik [uy, mehmon] ---
function roundRobin(clubs) {
  const list = clubs.slice();
  if (list.length % 2) list.push(null);
  const n = list.length;
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i], b = list[n - 1 - i];
      if (a && b) pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop());
  }
  return rounds;
}

// Natija → [oq ochkosi, qora ochkosi]. '+-' / '-+' — kelmaganlik uchun texnik g'alaba, '0-0' — ikkalasi kelmagan
function scoreOf(result) {
  switch (result) {
    case '1-0': case '+-': return [1, 0];
    case '0-1': case '-+': return [0, 1];
    case '1/2': return [0.5, 0.5];
    default: return [0, 0];
  }
}

// --- Klublar va tarkiblar ---
async function clubMembership() {
  const rows = await q.all('SELECT club_country, club_code, COUNT(*) as "members" FROM users WHERE club_country IS NOT NULL GROUP BY club_country, club_code');
  return rows.map(r => ({ name: r.club_country, code: r.club_code, members: Number(r.members) || 0, continent: CONTINENT_OF[r.club_country] || null }));
}

async function qualifiedByContinent() {
  const result = {};
  for (const club of await clubMembership()) {
    if (!club.continent || club.members < CFG.minMembers) continue;
    (result[club.continent] = result[club.continent] || []).push({ name: club.name, code: club.code });
  }
  return result;
}

// Klub tarkibi: shu vaqt nazorati reytingi bo'yicha eng kuchli o'yinchilar (1-doska — eng kuchlisi)
async function lineup(clubName, initial, increment) {
  const mode = deps.clockMode({ initial, increment });
  const rows = await q.all('SELECT id, username, rating, ratings_by_mode FROM users WHERE club_country = ?', [clubName]);
  const ratingOf = (r) => {
    const byMode = deps.db.parseJson(r.ratings_by_mode) || {};
    return Number(byMode[mode]) || 1500;
  };
  return rows
    .map(r => ({ id: r.id, username: r.username, modeRating: ratingOf(r), rating: r.rating || 1500 }))
    .sort((a, b) => (b.modeRating - a.modeRating) || (b.rating - a.rating) || a.username.localeCompare(b.username))
    .slice(0, CFG.boards);
}

function notifyUsers(userIds, event, payload) {
  for (const id of new Set(userIds.filter(Boolean))) deps.io.to(`user_${id}`).emit(event, payload || {});
}

// --- Mavsum, divizion, tur, bahs ---
async function currentSeason() {
  return q.get('SELECT * FROM league_seasons ORDER BY number DESC LIMIT 1');
}

async function startSeason(prev) {
  const byContinent = await qualifiedByContinent();
  const eligible = Object.entries(byContinent).filter(([, clubs]) => clubs.length >= CFG.minClubs);
  if (eligible.length === 0) return null;
  const number = prev ? prev.number + 1 : 1;
  const [initial, increment] = SEASON_CLOCKS[(number - 1) % SEASON_CLOCKS.length];
  const id = uuidv4();
  await q.run('INSERT INTO league_seasons (id, number, initial_time, increment, phase, started_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, number, initial, increment, 'league', nowIso(), nowIso()]);
  for (const [continent, clubs] of eligible) {
    await createDivision(id, 'league', continent, clubs, [[initial, increment]]);
  }
  console.log(`Liga mavsumi #${number} boshlandi (${eligible.map(e => e[0]).join(', ')})`);
  deps.io.emit('league-update');
  return id;
}

async function createDivision(seasonId, kind, continent, clubs, clocks) {
  const shuffled = clubs.slice().sort(() => Math.random() - 0.5);
  const rounds = roundRobin(shuffled).map(pairs => pairs.map(([h, a]) => [h.name, a.name]));
  const id = uuidv4();
  await q.run('INSERT INTO league_divisions (id, season_id, kind, continent, status, current_round, rounds_total, schedule, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, seasonId, kind, continent, 'active', 0, rounds.length, JSON.stringify({ rounds, clocks }), nowIso()]);
  for (const club of clubs) {
    await q.run('INSERT INTO league_clubs (id, division_id, club_name, club_code) VALUES (?, ?, ?, ?)', [uuidv4(), id, club.name, club.code || null]);
  }
  const division = await q.get('SELECT * FROM league_divisions WHERE id = ?', [id]);
  await startRound(division, 1);
  return division;
}

async function startRound(division, roundNo) {
  const schedule = deps.db.parseJson(division.schedule) || { rounds: [], clocks: [] };
  const pairs = schedule.rounds[roundNo - 1] || [];
  const deadline = new Date(Date.now() + CFG.roundMs).toISOString();
  const codes = {};
  for (const c of await q.all('SELECT club_name, club_code FROM league_clubs WHERE division_id = ?', [division.id])) codes[c.club_name] = c.club_code;
  const players = [];
  for (const [home, away] of pairs) {
    for (const [initial, increment] of schedule.clocks) {
      players.push(...await createMatch(division.id, roundNo, { name: home, code: codes[home] }, { name: away, code: codes[away] }, initial, increment, deadline));
    }
  }
  await q.run('UPDATE league_divisions SET current_round = ? WHERE id = ?', [roundNo, division.id]);
  notifyUsers(players, 'league-update', { type: 'round-started' });
}

// Bahs: 1-doskada uy jamoasi oq, 2-doskada qora va hokazo. Tarkibda o'yinchi yetmasa — o'sha doska texnik mag'lubiyat
async function createMatch(divisionId, round, home, away, initial, increment, deadline) {
  const matchId = uuidv4();
  await q.run('INSERT INTO league_matches (id, division_id, round, home_club, home_code, away_club, away_code, initial_time, increment, status, deadline, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [matchId, divisionId, round, home.name, home.code || null, away.name, away.code || null, initial, increment, 'active', deadline, nowIso()]);
  const homeLineup = await lineup(home.name, initial, increment);
  const awayLineup = await lineup(away.name, initial, increment);
  const players = [];
  for (let board = 1; board <= CFG.boards; board++) {
    const hp = homeLineup[board - 1], ap = awayLineup[board - 1];
    if (!hp && !ap) continue;
    const whiteIsHome = board % 2 === 1;
    const white = whiteIsHome ? hp : ap;
    const black = whiteIsHome ? ap : hp;
    let status = 'pending', result = null;
    if (!white || !black) { status = 'finished'; result = white ? '+-' : '-+'; }
    await q.run('INSERT INTO league_games (id, match_id, board, white_id, white_name, black_id, black_name, white_is_home, status, result, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), matchId, board, white ? white.id : null, white ? white.username : null, black ? black.id : null, black ? black.username : null, whiteIsHome ? 1 : 0, status, result, status === 'finished' ? nowIso() : null]);
    players.push(white && white.id, black && black.id);
  }
  return players;
}

async function finalizeMatch(match) {
  const games = await q.all('SELECT * FROM league_games WHERE match_id = ?', [match.id]);
  let home = 0, away = 0;
  for (const g of games) {
    const [w, b] = scoreOf(g.result);
    if (g.white_is_home) { home += w; away += b; } else { home += b; away += w; }
  }
  await q.run('UPDATE league_matches SET status = ?, home_score = ?, away_score = ? WHERE id = ?', ['finished', home, away, match.id]);
  const update = async (club, mine, theirs) => {
    const won = mine > theirs ? 1 : 0, drawn = mine === theirs ? 1 : 0, lost = mine < theirs ? 1 : 0;
    await q.run('UPDATE league_clubs SET played = played + 1, won = won + ?, drawn = drawn + ?, lost = lost + ?, match_points = match_points + ?, board_points = board_points + ? WHERE division_id = ? AND club_name = ?',
      [won, drawn, lost, won * 3 + drawn, mine, match.division_id, club]);
  };
  await update(match.home_club, home, away);
  await update(match.away_club, away, home);
}

// Xotirada shu liga o'yinining jonli xonasi bormi
function hasLiveRoom(gameId) {
  for (const room of deps.rooms.values()) if (room.leagueGameId === gameId && room.status === 'active') return true;
  return false;
}

// Muddat tugaganda boshlanmagan o'yinlar: kelgan (tayyor bo'lgan) o'yinchi texnik g'alaba oladi, ikkalasi kelmasa — 0:0.
// "playing" bo'lib qolgan, lekin xonasi yo'q o'yin (server qayta ishga tushib tiklanmagan) — durrang; aks holda bahs va butun
// divizion abadiy to'xtab qolardi. Jonli davom etayotgan o'yin kutiladi.
async function forfeitPending(match) {
  const stuck = await q.all('SELECT id FROM league_games WHERE match_id = ? AND status = ?', [match.id, 'playing']);
  for (const g of stuck) {
    if (hasLiveRoom(g.id)) continue;
    await q.run('UPDATE league_games SET status = ?, result = ?, finished_at = ? WHERE id = ? AND status = ?', ['finished', '1/2', nowIso(), g.id, 'playing']);
  }
  const pending = await q.all('SELECT * FROM league_games WHERE match_id = ? AND status = ?', [match.id, 'pending']);
  for (const g of pending) {
    const result = g.white_ready_at && !g.black_ready_at ? '+-' : (!g.white_ready_at && g.black_ready_at ? '-+' : '0-0');
    await q.run('UPDATE league_games SET status = ?, result = ?, finished_at = ? WHERE id = ?', ['finished', result, nowIso(), g.id]);
    waiting.delete(g.id);
  }
}

async function standings(divisionId) {
  const rows = await q.all('SELECT * FROM league_clubs WHERE division_id = ?', [divisionId]);
  return rows
    .map(r => ({ club: r.club_name, code: r.club_code, played: r.played, won: r.won, drawn: r.drawn, lost: r.lost, points: r.match_points, boardPoints: Number(r.board_points) || 0 }))
    .sort((a, b) => (b.points - a.points) || (b.boardPoints - a.boardPoints) || a.club.localeCompare(b.club));
}

// Divizionni oldinga surish: muddati o'tgan bahslarni yakunlash, tur tugasa — keyingi tur yoki divizion yakuni
async function processDivision(division) {
  const matches = await q.all('SELECT * FROM league_matches WHERE division_id = ? AND round = ?', [division.id, division.current_round]);
  let allFinished = true;
  for (const m of matches) {
    if (m.status === 'finished') continue;
    if (Date.now() >= new Date(m.deadline).getTime()) await forfeitPending(m);
    const open = await q.get('SELECT COUNT(*) as "n" FROM league_games WHERE match_id = ? AND status <> ?', [m.id, 'finished']);
    if (Number(open.n) === 0) await finalizeMatch(m);
    else allFinished = false;
  }
  if (!allFinished) return false;
  if (division.current_round < division.rounds_total) {
    await startRound(division, division.current_round + 1);
    deps.io.emit('league-update');
    return false;
  }
  const table = await standings(division.id);
  const champion = table[0] || null;
  await q.run('UPDATE league_divisions SET status = ?, champion_club = ?, champion_code = ? WHERE id = ?',
    ['finished', champion ? champion.club : null, champion ? champion.code : null, division.id]);
  deps.io.emit('league-update');
  return true;
}

async function finishSeason(season, champion) {
  await q.run('UPDATE league_seasons SET phase = ?, champion_club = ?, champion_code = ?, break_until = ? WHERE id = ?',
    ['finished', champion ? champion.club : null, champion ? champion.code : null, new Date(Date.now() + CFG.breakMs).toISOString(), season.id]);
  deps.io.emit('league-update');
}

async function processSeason(season) {
  const divisions = await q.all('SELECT * FROM league_divisions WHERE season_id = ?', [season.id]);
  if (season.phase === 'league') {
    const leagues = divisions.filter(d => d.kind === 'league');
    for (const d of leagues.filter(d => d.status === 'active')) await processDivision(d);
    const fresh = await q.all('SELECT * FROM league_divisions WHERE season_id = ? AND kind = ?', [season.id, 'league']);
    if (fresh.some(d => d.status !== 'finished')) return;
    const champions = fresh.filter(d => d.champion_club).map(d => ({ name: d.champion_club, code: d.champion_code }));
    if (champions.length >= 2) {
      await q.run('UPDATE league_seasons SET phase = ? WHERE id = ?', ['champions', season.id]);
      await createDivision(season.id, 'champions', null, champions, CHAMPIONS_CLOCKS);
      deps.io.emit('league-update');
    } else {
      await finishSeason(season, champions[0] ? { club: champions[0].name, code: champions[0].code } : null);
    }
  } else if (season.phase === 'champions') {
    const cl = divisions.find(d => d.kind === 'champions');
    if (!cl) return finishSeason(season, null);
    if (cl.status === 'active') await processDivision(cl);
    const fresh = await q.get('SELECT * FROM league_divisions WHERE id = ?', [cl.id]);
    if (fresh.status === 'finished') await finishSeason(season, fresh.champion_club ? { club: fresh.champion_club, code: fresh.champion_code } : null);
  }
}

async function tick() {
  if (!deps || ticking) return;
  ticking = true;
  try {
    const season = await currentSeason();
    if (!season || (season.phase === 'finished' && Date.now() >= new Date(season.break_until).getTime())) {
      await startSeason(season);
    } else if (season.phase !== 'finished') {
      await processSeason(season);
    }
  } catch (err) {
    console.error('Liga tick xatoligi:', err);
  } finally {
    ticking = false;
  }
}

// --- O'yinni boshlash: ikkala o'yinchi "O'ynash" ni bosganda server xona ochadi ---
async function loadGame(gameId) {
  return q.get(`SELECT g.*, m.status as "match_status", m.deadline, m.initial_time, m.increment, m.home_club, m.away_club, m.division_id
    FROM league_games g JOIN league_matches m ON g.match_id = m.id WHERE g.id = ?`, [gameId]);
}

async function ready(socket, gameId) {
  const userId = socket.data.userId;
  if (!userId) return socket.emit('league-error', { reason: 'auth' });
  const g = await loadGame(gameId);
  if (!g || (g.white_id !== userId && g.black_id !== userId)) return socket.emit('league-error', { reason: 'not_found' });
  if (g.status !== 'pending' || g.match_status !== 'active') return socket.emit('league-error', { reason: 'not_pending' });
  if (Date.now() >= new Date(g.deadline).getTime()) return socket.emit('league-error', { reason: 'expired' });
  // Boshqa o'yinda turgan o'yinchi liga o'yiniga tayyor bo'la olmaydi (bir vaqtda ikki o'yin bo'lmasin)
  const busy = (uid) => !!(deps.inActiveGame && deps.inActiveGame(uid));
  if (busy(userId)) return socket.emit('league-error', { reason: 'busy' });

  const side = g.white_id === userId ? 'w' : 'b';
  const readyCol = side === 'w' ? 'white_ready_at' : 'black_ready_at';
  if (!g[readyCol]) await q.run(`UPDATE league_games SET ${readyCol} = ? WHERE id = ?`, [nowIso(), g.id]);

  const entry = waiting.get(g.id) || {};
  entry[side] = socket.id;
  waiting.set(g.id, entry);
  const other = side === 'w' ? 'b' : 'w';
  const otherSocket = entry[other] && deps.io.sockets.sockets.get(entry[other]);
  // Raqib tayyor bo'lgandan keyin boshqa o'yinga kirib ketgan bo'lsa — uning tayyorligi bekor, bu o'yinchi kutadi
  if (otherSocket && busy(otherSocket.data.userId)) delete entry[other];
  else if (otherSocket) return startLeagueGame(g, entry);

  socket.emit('league-waiting', { gameId: g.id });
  const opponentId = side === 'w' ? g.black_id : g.white_id;
  notifyUsers([opponentId], 'league-opponent-ready', { gameId: g.id, opponent: socket.data.username });
  if (deps.notify) deps.notify(opponentId, 'league_ready', { gameId: g.id, opponent: socket.data.username }, 'lg:' + g.id);
}

function cancel(socket, gameId) {
  const entry = waiting.get(gameId);
  if (!entry) return;
  for (const side of ['w', 'b']) if (entry[side] === socket.id) delete entry[side];
  if (!entry.w && !entry.b) waiting.delete(gameId);
}

function socketGone(socketId) {
  for (const [gameId, entry] of waiting) {
    for (const side of ['w', 'b']) if (entry[side] === socketId) delete entry[side];
    if (!entry.w && !entry.b) waiting.delete(gameId);
  }
}

async function startLeagueGame(g, entry) {
  waiting.delete(g.id);
  // Atomar: o'yin faqat bir marta boshlanadi (ikki oyna / takroriy "O'ynash")
  const upd = await q.run('UPDATE league_games SET status = ? WHERE id = ? AND status = ?', ['playing', g.id, 'pending']);
  if (!(upd && (upd.changes || upd.rowCount))) return;
  const [whiteUser, blackUser] = await Promise.all([deps.db.getUserById(g.white_id), deps.db.getUserById(g.black_id)]);
  const busy = (uid) => !!(deps.inActiveGame && deps.inActiveGame(uid));
  const sockOk = (id) => { const s = deps.io.sockets.sockets.get(id); return !!(s && s.connected); };
  // Bazadan o'qish paytida kimdir uzilgan yoki boshqa o'yinga kirgan bo'lsa — o'yin qayta kutishga qaytadi
  if (!whiteUser || !blackUser || busy(g.white_id) || busy(g.black_id) || !sockOk(entry.w) || !sockOk(entry.b)) {
    await q.run('UPDATE league_games SET status = ? WHERE id = ? AND status = ?', ['pending', g.id, 'playing']);
    notifyUsers([g.white_id, g.black_id], 'league-update', { type: 'cancelled' });
    return;
  }
  const clock = { initial: g.initial_time, increment: g.increment };
  const roomId = deps.generateRoomId();
  const room = deps.createGameRoom(
    { socketId: entry.w, userId: g.white_id, username: g.white_name },
    { socketId: entry.b, userId: g.black_id, username: g.black_name },
    clock, true
  );
  room.leagueGameId = g.id;
  deps.rooms.set(roomId, room);
  const info = (u) => ({ username: u.username, rating: u.rating || 1500, ratingsByMode: u.ratings_by_mode, country: u.country || null });
  const league = { gameId: g.id, board: g.board, homeClub: g.home_club, awayClub: g.away_club };
  for (const [socketId, color, opponent] of [[entry.w, 'w', blackUser], [entry.b, 'b', whiteUser]]) {
    const s = deps.io.sockets.sockets.get(socketId);
    if (s) s.join(roomId);
    deps.io.to(socketId).emit('match-found', { roomId, color, opponent: info(opponent), clock, rated: true, mode: room.mode, league });
  }
  deps.scheduleRoomTimer(roomId, room);
}

// Server endGame() dan chaqiriladi
async function recordGameResult(gameId, winnerColor, reason) {
  if (reason === 'aborted') {
    // Birinchi yurish qilinmadi — o'yin qayta o'ynalishi mumkin
    await q.run('UPDATE league_games SET status = ? WHERE id = ? AND status = ?', ['pending', gameId, 'playing']);
    return;
  }
  const result = winnerColor === 'w' ? '1-0' : (winnerColor === 'b' ? '0-1' : '1/2');
  await q.run('UPDATE league_games SET status = ?, result = ?, finished_at = ? WHERE id = ?', ['finished', result, nowIso(), gameId]);
  deps.io.emit('league-update');
  setTimeout(tick, 0);
}

// --- API uchun ma'lumotlar ---
function seasonInfo(s) {
  if (!s) return null;
  return {
    id: s.id, number: s.number, phase: s.phase,
    clock: { initial: s.initial_time, increment: s.increment },
    mode: deps.clockMode({ initial: s.initial_time, increment: s.increment }),
    startedAt: s.started_at, breakUntil: s.break_until,
    champion: s.champion_club ? { name: s.champion_club, code: s.champion_code } : null
  };
}

async function divisionSummary(d) {
  const table = await standings(d.id);
  const deadlineRow = await q.get('SELECT MIN(deadline) as "deadline" FROM league_matches WHERE division_id = ? AND round = ? AND status = ?', [d.id, d.current_round, 'active']);
  return {
    id: d.id, kind: d.kind, continent: d.continent, status: d.status,
    round: d.current_round, roundsTotal: d.rounds_total,
    roundDeadline: deadlineRow && deadlineRow.deadline ? deadlineRow.deadline : null,
    clubs: table.length, leader: table[0] || null,
    champion: d.champion_club ? { name: d.champion_club, code: d.champion_code } : null
  };
}

async function overview() {
  const season = await currentSeason();
  const divisions = season ? await q.all('SELECT * FROM league_divisions WHERE season_id = ?', [season.id]) : [];
  const summaries = [];
  for (const d of divisions) summaries.push(await divisionSummary(d));

  // Keyingi mavsumga tayyorgarlik: har qit'ada klublar va a'zolar soni
  const qualification = {};
  for (const continent of Object.keys(CONTINENTS)) qualification[continent] = { qualified: 0, clubs: [] };
  for (const club of await clubMembership()) {
    if (!club.continent) continue;
    const entry = qualification[club.continent];
    entry.clubs.push({ name: club.name, code: club.code, members: club.members });
    if (club.members >= CFG.minMembers) entry.qualified++;
  }
  for (const entry of Object.values(qualification)) {
    // To'liq ro'yxat: klient kartada eng yaxshi 5 tasini, jadvalda hammasini ko'rsatadi
    entry.clubs.sort((a, b) => b.members - a.members);
  }

  const pastRows = await q.all('SELECT * FROM league_seasons WHERE champion_club IS NOT NULL ORDER BY number DESC LIMIT 5');
  return {
    season: seasonInfo(season),
    divisions: summaries,
    qualification,
    rules: { minMembers: CFG.minMembers, minClubs: CFG.minClubs, boards: CFG.boards, roundHours: Math.round(CFG.roundMs / 3600000 * 10) / 10, breakDays: Math.round(CFG.breakMs / 86400000 * 10) / 10 },
    pastChampions: pastRows.map(s => ({ number: s.number, name: s.champion_club, code: s.champion_code }))
  };
}

async function divisionDetail(divisionId) {
  const d = await q.get('SELECT * FROM league_divisions WHERE id = ?', [divisionId]);
  if (!d) return null;
  const matches = await q.all('SELECT * FROM league_matches WHERE division_id = ? ORDER BY round ASC, created_at ASC', [d.id]);
  const games = matches.length
    ? await q.all(`SELECT g.* FROM league_games g JOIN league_matches m ON g.match_id = m.id WHERE m.division_id = ? ORDER BY g.board ASC`, [d.id])
    : [];
  const byMatch = {};
  for (const g of games) (byMatch[g.match_id] = byMatch[g.match_id] || []).push({
    id: g.id, board: g.board, white: g.white_name, black: g.black_name, whiteIsHome: !!g.white_is_home, status: g.status, result: g.result
  });
  const season = await q.get('SELECT * FROM league_seasons WHERE id = ?', [d.season_id]);
  return {
    division: await divisionSummary(d),
    season: seasonInfo(season),
    standings: await standings(d.id),
    matches: matches.map(m => ({
      id: m.id, round: m.round, status: m.status, deadline: m.deadline,
      home: { name: m.home_club, code: m.home_code }, away: { name: m.away_club, code: m.away_code },
      clock: { initial: m.initial_time, increment: m.increment },
      homeScore: Number(m.home_score) || 0, awayScore: Number(m.away_score) || 0,
      games: byMatch[m.id] || []
    }))
  };
}

// Champions ligasi: joriy mavsumniki, bo'lmasa oxirgi o'tkazilgani
async function championsDivision() {
  const row = await q.get(`SELECT d.id FROM league_divisions d JOIN league_seasons s ON d.season_id = s.id WHERE d.kind = ? ORDER BY s.number DESC LIMIT 1`, ['champions']);
  return row ? divisionDetail(row.id) : null;
}

async function myGames(userId) {
  const rows = await q.all(`SELECT g.*, m.deadline, m.initial_time, m.increment, m.home_club, m.home_code, m.away_club, m.away_code, d.kind, d.continent
    FROM league_games g JOIN league_matches m ON g.match_id = m.id JOIN league_divisions d ON m.division_id = d.id
    WHERE (g.white_id = ? OR g.black_id = ?) AND g.status IN ('pending', 'playing') ORDER BY m.deadline ASC, g.board ASC`, [userId, userId]);
  return rows.map(g => {
    const isWhite = g.white_id === userId;
    const myHome = isWhite ? !!g.white_is_home : !g.white_is_home;
    return {
      id: g.id, board: g.board, status: g.status, deadline: g.deadline,
      color: isWhite ? 'w' : 'b',
      opponent: isWhite ? g.black_name : g.white_name,
      myClub: myHome ? { name: g.home_club, code: g.home_code } : { name: g.away_club, code: g.away_code },
      opponentClub: myHome ? { name: g.away_club, code: g.away_code } : { name: g.home_club, code: g.home_code },
      clock: { initial: g.initial_time, increment: g.increment },
      kind: g.kind, continent: g.continent,
      iAmReady: !!(isWhite ? g.white_ready_at : g.black_ready_at),
      opponentReady: !!(isWhite ? g.black_ready_at : g.white_ready_at)
    };
  });
}

module.exports = { CFG, init, tick, ready, cancel, socketGone, recordGameResult, overview, divisionDetail, championsDivision, myGames, roundRobin };
