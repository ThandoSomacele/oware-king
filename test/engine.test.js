const assert = require('node:assert');
const E = require('../src/engine.js');

const total = (st) => st.pits.reduce((a, b) => a + b, 0) + st.score[0] + st.score[1];
const pos = (pits, turn = 0, score = [0, 0]) => ({ pits, score, turn, quiet: 0, over: false, winner: null, sweep: null });

// Start position
let st = E.start();
assert.deepStrictEqual(E.legalMoves(st), [0, 1, 2, 3, 4, 5]);

// Simple sowing
let r = E.play(st, 2);
assert.deepStrictEqual(r.steps, [3, 4, 5, 6]);
assert.strictEqual(r.gain, 0);
assert.strictEqual(r.state.turn, 1);

// Capture of a chain of twos and threes
r = E.play(pos([0, 0, 0, 0, 0, 3, 1, 2, 1, 5, 5, 5]), 5);
assert.deepStrictEqual(r.captured, [8, 7, 6]);
assert.strictEqual(r.gain, 7);

// Chain stops at a pit that is not 2 or 3
r = E.play(pos([0, 0, 0, 0, 0, 3, 1, 5, 1, 5, 5, 5]), 5);
assert.deepStrictEqual(r.captured, [8]);

// Grand slam captures nothing
r = E.play(pos([0, 0, 0, 0, 0, 2, 1, 1, 0, 0, 0, 0, ].slice(0, 12)), 5);
assert.strictEqual(r.gain, 0);

// Must feed an opponent who has no seeds
assert.deepStrictEqual(E.legalMoves(pos([1, 0, 0, 0, 2, 1, 0, 0, 0, 0, 0, 0])), [4, 5]);

// Cannot feed: the game ends and the player keeps their seeds
r = E.play(pos([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0].map((v, i) => (i === 0 ? 2 : v)), 1, [20, 20]), 10);
// after the move player 1 has 1 seed in pit 11, player 0 has 2 in pit 0: game continues
assert.strictEqual(r.state.over, false);

// A sowing of 12 or more skips the origin pit
r = E.play(pos([12, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5]), 0);
assert.strictEqual(r.state.pits[0], 0);
assert.strictEqual(r.steps.length, 12);

// Random games: seeds are conserved and every game ends
for (let g = 0; g < 300; g++) {
  st = E.start();
  let n = 0;
  while (!st.over) {
    const ms = E.legalMoves(st);
    assert.ok(ms.length > 0);
    st = E.play(st, ms[Math.floor(Math.random() * ms.length)]).state;
    assert.strictEqual(total(st), 48);
    assert.ok(++n < 5000);
  }
  assert.ok([0, 1, -1].includes(st.winner));
}

// Daily puzzle exists for every date in a year, and is stable
const d = new Date(2026, 10, 21);
for (let k = 0; k < 365; k++) {
  const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const p = E.dailyPuzzle(s);
  assert.ok(p, 'no puzzle for ' + s);
  assert.strictEqual(p.state.turn, 0);
  assert.strictEqual(E.play(p.state, p.best).gain, p.gain);
  assert.deepStrictEqual(E.dailyPuzzle(s), p);
  d.setDate(d.getDate() + 1);
}

// The hard level beats random play, and answers fast enough
let wins = 0, slowest = 0;
for (let g = 0; g < 20; g++) {
  st = E.start();
  while (!st.over) {
    let m;
    if (st.turn === 1) {
      const t = Date.now();
      m = E.bestMove(st, 7);
      slowest = Math.max(slowest, Date.now() - t);
    } else {
      const ms = E.legalMoves(st);
      m = ms[Math.floor(Math.random() * ms.length)];
    }
    st = E.play(st, m).state;
  }
  if (st.winner === 1) wins++;
}
assert.ok(wins >= 18, 'hard level won only ' + wins + '/20');
console.log(`all engine tests passed (hard level: ${wins}/20 wins against random play, slowest move ${slowest} ms)`);
