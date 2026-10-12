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
          round,
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
      round,
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
    matchups.push({
      round,
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

// 24/7 Arena: har soatda yangi vaqt nazorati bilan avtomatik arena.
const ARENA_SCHEDULE = [
  { hour: 0, name: '10+5 Rapid', code: '10+5', type: 'rapid', rounds: 5, icon: '🚀' },
  { hour: 1, name: '3+2 Blitz', code: '3+2', type: 'blitz', rounds: 7, icon: '⚡' },
  { hour: 2, name: '1+1 Bullet', code: '1+1', type: 'bullet', rounds: 9, icon: '🔫' },
  { hour: 3, name: '15+10 Rapid', code: '15+10', type: 'rapid', rounds: 5, icon: '🚀' },
  { hour: 4, name: '5+3 Blitz', code: '5+3', type: 'blitz', rounds: 7, icon: '⚡' },
  { hour: 5, name: '2+1 Bullet', code: '2+1', type: 'bullet', rounds: 9, icon: '🔫' },
  { hour: 6, name: '10+0 Rapid', code: '10+0', type: 'rapid', rounds: 5, icon: '🚀' },
  { hour: 7, name: '3+0 Blitz', code: '3+0', type: 'blitz', rounds: 7, icon: '⚡' },
  { hour: 8, name: '1+0 Bullet', code: '1+0', type: 'bullet', rounds: 9, icon: '🔫' },
  { hour: 9, name: '15+0 Rapid', code: '15+0', type: 'rapid', rounds: 5, icon: '🚀' },
  { hour: 10, name: '5+0 Blitz', code: '5+0', type: 'blitz', rounds: 7, icon: '⚡' },
  { hour: 11, name: '1+1 Bullet', code: '1+1', type: 'bullet', rounds: 9, icon: '🔫' },
  { hour: 12, name: '10+5 Rapid', code: '10+5', type: 'rapid', rounds: 5, icon: '🚀' },
  { hour: 13, name: '3+2 Blitz', code: '3+2', type: 'blitz', rounds: 7, icon: '⚡' },
  { hour: 14, name: '2+1 Bullet', code: '2+1', type: 'bullet', rounds: 9, icon: '🔫' },
  { hour: 15, name: '30+0 Rapid', code: '30+0', type: 'rapid', rounds: 5, icon: '🚀' },
  { hour: 16, name: '5+3 Blitz', code: '5+3', type: 'blitz', rounds: 7, icon: '⚡' },
  { hour: 17, name: '1+0 Bullet', code: '1+0', type: 'bullet', rounds: 9, icon: '🔫' },
  { hour: 18, name: '15+10 Rapid', code: '15+10', type: 'rapid', rounds: 5, icon: '🚀' },
  { hour: 19, name: '3+0 Blitz', code: '3+0', type: 'blitz', rounds: 7, icon: '⚡' },
  { hour: 20, name: '10+0 Rapid', code: '10+0', type: 'rapid', rounds: 5, icon: '🚀' },
  { hour: 21, name: '5+0 Blitz', code: '5+0', type: 'blitz', rounds: 7, icon: '⚡' },
  { hour: 22, name: '1+1 Bullet', code: '1+1', type: 'bullet', rounds: 9, icon: '🔫' },
  { hour: 23, name: '15+0 Rapid', code: '15+0', type: 'rapid', rounds: 5, icon: '🚀' }
];

function getArenaSchedule(now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return ARENA_SCHEDULE.map(entry => {
    const slotStart = new Date(today);
    slotStart.setHours(entry.hour, 0, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
    let status = 'upcoming';
    if (slotEnd <= now) status = 'completed';
    else if (slotStart <= now) status = 'current';
    return { ...entry, slotStart: slotStart.toISOString(), slotEnd: slotEnd.toISOString(), status };
  });
}

function getCurrentArenaSlot(now = new Date()) {
  const entry = ARENA_SCHEDULE[now.getHours()];
  const slotStart = new Date(now);
  slotStart.setHours(now.getHours(), 0, 0, 0);
  const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
  return { ...entry, slotStart: slotStart.toISOString(), slotEnd: slotEnd.toISOString() };
}

module.exports = { swissPairings, teamPairings, getArenaSchedule, getCurrentArenaSlot };
