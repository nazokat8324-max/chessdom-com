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
    if (Math.random() < 0.5) { [ga, gb] = [gb, ga]; }
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

module.exports = { swissPairings, teamPairings };
