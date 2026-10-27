// 🕵️ Fair-play: dvigatelga moslik tahlili (server-faqat). Reytingli standart o'yin tugagach navbatga qo'yiladi; worker (fairplay-worker.js)
// har pozitsiyani Stockfish bilan baholaydi, shu yerda har o'yinchi uchun hisoblanadi:
//   match — eng yaxshi yurish bilan bir xil yurishlar ulushi, acpl — o'rtacha yo'qotish (santipeshka).
// Debyut (dastlabki 12 yarim yurish), majburiy yurishlar (bitta qonuniy yurish) va hal bo'lgan pozitsiyalar (|baho| > 500) sanalmaydi.
const path = require('path');
const { Chess } = require('chess.js');

const OPENING_PLIES = 12;
const DECIDED_CP = 500;
const MIN_MOVES = 12;        // o'yinchining tahlil qilingan yurishlari kamida shuncha bo'lsa — baho beriladi
const MAX_PLIES = 120;
// Dvigatelga o'xshash o'yin: juda past yo'qotish va juda yuqori moslik (kuchli o'yinchilar uchun chegara qattiqroq)
function isEngineLike(m, rating) {
  if (!m || m.moves < MIN_MOVES) return false;
  const strong = Number(rating) >= 2000;
  return strong ? m.acpl <= 8 && m.match >= 0.85 : m.acpl <= 15 && m.match >= 0.7;
}
// Oxirgi tahlil qilingan o'yinlar (yangidan eskiga): 10 tadan kamida 3 tasi dvigatelga o'xshash → belgilash
function shouldFlag(recent) {
  const last = (recent || []).slice(0, 10);
  return last.filter((r) => Number(r.suspicious)).length >= 3;
}

const toCp = (e) => (!e ? 0 : e.mate !== null && e.mate !== undefined ? (e.mate > 0 ? 1000 : -1000) : Math.max(-1000, Math.min(1000, e.cp || 0)));

// moves: [{from, to, promotion, color}], evals[i] — i-pozitsiya (i ta yurishdan keyin) bahosi yurayotgan tomon nuqtai nazaridan,
// legal[i] — i-pozitsiyadagi qonuniy yurishlar soni. Natija: { w: {moves, match, acpl}, b: {...} }
function gameMetrics(moves, evals, legal) {
  const acc = { w: { n: 0, hit: 0, loss: 0 }, b: { n: 0, hit: 0, loss: 0 } };
  for (let i = OPENING_PLIES; i < moves.length && i < MAX_PLIES; i++) {
    const before = evals[i], after = evals[i + 1];
    if (!before || !after || !before.best) continue;
    if (legal && legal[i] <= 1) continue;
    const b = toCp(before);
    if (Math.abs(b) > DECIDED_CP) continue;
    const m = moves[i];
    const uci = m.from + m.to + (m.promotion || '');
    const a = acc[m.color];
    a.n++;
    if (before.best === uci || before.best === m.from + m.to) a.hit++;
    // yurishdan keyingi baho raqib nuqtai nazaridan — bizniki uchun teskari
    a.loss += Math.min(300, Math.max(0, b + toCp(after)));
  }
  const out = {};
  for (const c of ['w', 'b']) {
    const a = acc[c];
    out[c] = { moves: a.n, match: a.n ? Math.round((a.hit / a.n) * 100) / 100 : 0, acpl: a.n ? Math.round(a.loss / a.n) : 0 };
  }
  return out;
}

// SAN yurishlardan FEN va qonuniy yurishlar soni (standart shaxmat)
function positions(sans) {
  const c = new Chess();
  const fens = [c.fen()], legal = [c.moves().length], moves = [];
  for (const san of sans.slice(0, MAX_PLIES)) {
    const m = c.move(san);
    if (!m) break;
    moves.push({ from: m.from, to: m.to, promotion: m.promotion, color: m.color });
    fens.push(c.game_over() ? null : c.fen());
    legal.push(c.moves().length);
  }
  return { fens, legal, moves };
}

// Navbat: bir vaqtda bitta o'yin tahlil qilinadi (CPU tejaladi)
function createAnalyzer(opts) {
  const depth = Number(opts && opts.depth) || 9;
  const onResult = opts.onResult;
  const queue = [], seen = new Set();
  const MAX_QUEUE = 300;
  let worker = null, busy = false, seq = 0;
  const pending = new Map();
  function ensureWorker() {
    if (worker) return worker;
    const { Worker } = require('worker_threads');
    worker = new Worker(path.join(__dirname, 'fairplay-worker.js'));
    worker.on('message', (msg) => { const p = pending.get(msg.id); if (p) { pending.delete(msg.id); p(msg); } });
    worker.on('error', (err) => { console.error('Fair-play worker xatoligi:', err.message); worker = null; for (const p of pending.values()) p({ error: err.message }); pending.clear(); });
    // Ishchi xatosiz to'xtasa ham (masalan, xotira) kutayotgan tahlil osilib qolmasin — aks holda navbat abadiy to'xtardi
    worker.on('exit', () => { worker = null; for (const p of pending.values()) p({ error: 'worker exited' }); pending.clear(); });
    return worker;
  }
  async function run() {
    if (busy) return;
    busy = true;
    while (queue.length) {
      const job = queue.shift();
      try {
        const { fens, legal, moves } = positions(job.moves);
        const id = ++seq;
        const res = await new Promise((resolve) => { pending.set(id, resolve); ensureWorker().postMessage({ id, fens, depth }); });
        if (res.error) throw new Error(res.error);
        // Tugash pozitsiyasi (mat) — baho yo'q: oxirgi yurish sanalmaydi
        await onResult(job, gameMetrics(moves, res.evals, legal));
      } catch (err) { console.error('Fair-play tahlil xatoligi:', err.message); }
    }
    busy = false;
  }
  return {
    // job: { ref, moves (SAN), players: [{userId, color, rating}] }
    enqueue(job) {
      if (!job || !job.ref || seen.has(job.ref) || !Array.isArray(job.moves) || job.moves.length < OPENING_PLIES + 2 * MIN_MOVES - 2) return false;
      seen.add(job.ref);
      if (seen.size > 5000) seen.clear();
      // Navbat chegarasi: ko'p o'yin bo'lsa eng eski avtomatik (room:) tahlil tashlanadi, shikoyat/admin so'ragani qoladi
      if (queue.length >= MAX_QUEUE) {
        const i = queue.findIndex((j) => String(j.ref).startsWith('room:'));
        if (i === -1) return false;
        queue.splice(i, 1);
      }
      queue.push(job);
      setImmediate(run);
      return true;
    },
    size: () => queue.length + (busy ? 1 : 0),
    stop() { if (worker) worker.terminate(); worker = null; }
  };
}

module.exports = { createAnalyzer, gameMetrics, isEngineLike, shouldFlag, positions, MIN_MOVES, OPENING_PLIES };
