// 🕵️ Fair-play tahlil oqimi (worker_threads, server-faqat): Stockfish 10 (npm stockfish@10.0.2, GPL-3.0) asosiy oqimni
// bloklamasligi uchun shu yerda ishlaydi. Kirish: { id, fens[], depth } → chiqish: { id, evals: [{ cp, mate, best }] } (yurayotgan tomon nuqtai nazaridan).
const { parentPort } = require('worker_threads');
const engine = require('stockfish')();

let onLine = null;
engine.onmessage = (l) => { const line = typeof l === 'string' ? l : (l && l.data) || ''; if (onLine) onLine(line); };
engine.postMessage('uci');

function evalFen(fen, depth) {
  return new Promise((resolve) => {
    let cp = 0, mate = null;
    const timer = setTimeout(() => { onLine = null; resolve({ cp, mate, best: null }); }, 15000);
    onLine = (line) => {
      const m = / score (cp|mate) (-?\d+)/.exec(line);
      if (m) { if (m[1] === 'cp') { cp = Number(m[2]); mate = null; } else mate = Number(m[2]); }
      if (line.startsWith('bestmove')) { clearTimeout(timer); onLine = null; const b = line.split(' ')[1]; resolve({ cp, mate, best: b && b !== '(none)' ? b : null }); }
    };
    engine.postMessage('position fen ' + fen);
    engine.postMessage('go depth ' + depth);
  });
}

parentPort.on('message', async (job) => {
  try {
    const evals = [];
    for (const fen of job.fens) evals.push(fen ? await evalFen(fen, job.depth) : null);
    parentPort.postMessage({ id: job.id, evals });
  } catch (err) {
    parentPort.postMessage({ id: job.id, error: String(err && err.message || err) });
  }
});
