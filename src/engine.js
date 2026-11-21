// Oware (Abapa rules) engine. No DOM code here, so the same file runs in the browser and in Node tests.
// Pits 0-5 belong to player 0 (bottom row, left to right). Pits 6-11 belong to player 1.
// Sowing goes counter-clockwise: 0 -> 1 -> ... -> 11 -> 0.
const Engine = (() => {
  const QUIET_LIMIT = 80; // moves without a capture before the game is called

  const start = () => ({ pits: Array(12).fill(4), score: [0, 0], turn: 0, quiet: 0, over: false, winner: null, sweep: null });
  const owner = (i) => (i < 6 ? 0 : 1);
  const sideSum = (pits, p) => {
    let s = 0;
    for (let i = p * 6; i < p * 6 + 6; i++) s += pits[i];
    return s;
  };

  function legalMoves(st) {
    if (st.over) return [];
    const p = st.turn, base = p * 6, moves = [];
    const mustFeed = sideSum(st.pits, 1 - p) === 0;
    for (let li = 0; li < 6; li++) {
      const s = st.pits[base + li];
      if (s === 0) continue;
      if (mustFeed && s <= 5 - li) continue; // this move does not reach the opponent
      moves.push(base + li);
    }
    return moves;
  }

  function settle(st) {
    const decided = st.score[0] >= 25 || st.score[1] >= 25;
    if (!decided && (st.quiet >= QUIET_LIMIT || legalMoves(st).length === 0)) {
      // No move possible (or an endless loop): each player keeps the seeds on their side.
      st.sweep = [sideSum(st.pits, 0), sideSum(st.pits, 1)];
      st.score[0] += st.sweep[0];
      st.score[1] += st.sweep[1];
      st.pits.fill(0);
    }
    if (decided || st.sweep) {
      st.over = true;
      st.winner = st.score[0] > st.score[1] ? 0 : st.score[1] > st.score[0] ? 1 : -1;
    }
  }

  // Plays `pit` for the player to move. Does not change `st`.
  function play(st, pit) {
    const p = st.turn, pits = st.pits.slice(), score = st.score.slice();
    let seeds = pits[pit];
    pits[pit] = 0;
    const steps = [];
    let i = pit;
    while (seeds > 0) {
      i = (i + 1) % 12;
      if (i === pit) continue; // a big sowing skips the pit it came from
      pits[i]++;
      seeds--;
      steps.push(i);
    }
    let captured = [];
    for (let j = i; owner(j) !== p && (pits[j] === 2 || pits[j] === 3); j = (j + 11) % 12) captured.push(j);
    let gain = captured.reduce((a, k) => a + pits[k], 0);
    if (gain === sideSum(pits, 1 - p)) { captured = []; gain = 0; } // grand slam: taking everything captures nothing
    for (const k of captured) pits[k] = 0;
    score[p] += gain;
    const next = { pits, score, turn: 1 - p, quiet: gain ? 0 : st.quiet + 1, over: false, winner: null, sweep: null };
    settle(next);
    return { state: next, steps, captured, gain };
  }

  function negamax(st, depth, a, b) {
    if (st.over) return st.winner === -1 ? 0 : st.winner === st.turn ? 1000 + depth : -1000 - depth;
    if (depth === 0) return st.score[st.turn] - st.score[1 - st.turn];
    let best = -Infinity;
    for (const m of legalMoves(st)) {
      const v = -negamax(play(st, m).state, depth - 1, -b, -a);
      if (v > best) best = v;
      if (v > a) a = v;
      if (a >= b) break;
    }
    return best;
  }

  // `blunder` is the chance (0-1) of a random move, used for the easy level.
  function bestMove(st, depth, blunder = 0, rnd = Math.random) {
    const moves = legalMoves(st);
    if (!moves.length) return null;
    if (rnd() < blunder) return moves[Math.floor(rnd() * moves.length)];
    let best = -Infinity, picks = [];
    for (const m of moves) {
      const v = -negamax(play(st, m).state, depth - 1, -Infinity, Infinity);
      if (v > best) { best = v; picks = [m]; } else if (v === best) picks.push(m);
    }
    return picks[Math.floor(rnd() * picks.length)];
  }

  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // One puzzle per calendar date, the same for every player:
  // a position where exactly one pit captures the most seeds.
  function dailyPuzzle(dateStr) {
    let seed = 0;
    for (const c of dateStr) seed = (seed * 31 + c.charCodeAt(0)) | 0;
    for (let attempt = 0; attempt < 2000; attempt++) {
      const r = rng(seed + attempt * 7919);
      let st = start();
      const plies = 12 + Math.floor(r() * 24);
      for (let k = 0; (k < plies || st.turn !== 0) && !st.over; k++) {
        const ms = legalMoves(st);
        st = play(st, ms[Math.floor(r() * ms.length)]).state;
      }
      if (st.over) continue;
      const gains = legalMoves(st).map((m) => ({ m, g: play(st, m).gain })).sort((x, y) => y.g - x.g);
      if (gains.length >= 3 && gains[0].g >= 4 && gains[0].g > gains[1].g) {
        return { state: st, best: gains[0].m, gain: gains[0].g };
      }
    }
    return null;
  }

  return { start, owner, sideSum, legalMoves, play, bestMove, dailyPuzzle };
})();

if (typeof module !== 'undefined') module.exports = Engine;
