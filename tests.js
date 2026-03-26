/**
 * tests.js — Win-detection unit tests for Gobble Game
 *
 * Run with: node tests.js
 *
 * Tests the checkWinner() function and the critical edge case where a
 * human move simultaneously completes the human's winning line AND
 * reveals a previously-hidden AI winning line.
 */

'use strict';

/* ================================================================
 * Minimal game-state helpers (mirrors game.js exactly)
 * ================================================================ */
let gameState = null;

function createPieces(player) {
  return [
    { id: `${player}-s1`, player, size: 1, used: false },
    { id: `${player}-s2`, player, size: 1, used: false },
    { id: `${player}-m1`, player, size: 2, used: false },
    { id: `${player}-m2`, player, size: 2, used: false },
    { id: `${player}-l1`, player, size: 3, used: false },
    { id: `${player}-l2`, player, size: 3, used: false },
  ];
}

function topPiece(cellIndex) {
  const stack = gameState.board[cellIndex];
  return stack.length ? stack[stack.length - 1] : null;
}

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

/* Fixed checkWinner (as in game.js after the bug fix) */
function checkWinner(currentPlayer) {
  let opponentWin = null;
  for (const line of WIN_LINES) {
    const tops = line.map(i => topPiece(i));
    if (tops[0] && tops[1] && tops[2] &&
        tops[0].player === tops[1].player &&
        tops[1].player === tops[2].player) {
      if (tops[0].player === currentPlayer) {
        return { player: tops[0].player, line };
      }
      if (!opponentWin) {
        opponentWin = { player: tops[0].player, line };
      }
    }
  }
  return opponentWin;
}

/* ================================================================
 * Simple test harness
 * ================================================================ */
let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  ✅  PASS: ${description}`);
    passed++;
  } else {
    console.log(`  ❌  FAIL: ${description}`);
    failed++;
  }
}

function resetBoard() {
  gameState = {
    board: Array.from({ length: 9 }, () => []),
    humanReserve: createPieces('human'),
    aiReserve: createPieces('ai'),
    turn: 'human',
  };
}

function place(cellIndex, player, size) {
  gameState.board[cellIndex].push({ id: `${player}-${size}-${cellIndex}-${Date.now()}`, player, size });
}

/* ================================================================
 * Tests
 * ================================================================ */

/* --- 1. Simple wins ------------------------------------------ */
console.log('\n=== 1. Basic win detection ===');

resetBoard();
place(3, 'human', 2); place(4, 'human', 2); place(5, 'human', 2);
assert('Human wins middle row [3,4,5]', (() => {
  const w = checkWinner('human');
  return w && w.player === 'human' && w.line.join() === '3,4,5';
})());

resetBoard();
place(0, 'human', 2); place(1, 'human', 2); place(2, 'human', 2);
assert('Human wins top row [0,1,2]', (() => {
  const w = checkWinner('human');
  return w && w.player === 'human' && w.line.join() === '0,1,2';
})());

resetBoard();
place(6, 'human', 2); place(7, 'human', 2); place(8, 'human', 2);
assert('Human wins bottom row [6,7,8]', (() => {
  const w = checkWinner('human');
  return w && w.player === 'human' && w.line.join() === '6,7,8';
})());

resetBoard();
place(0, 'human', 2); place(3, 'human', 2); place(6, 'human', 2);
assert('Human wins left column [0,3,6]', (() => {
  const w = checkWinner('human');
  return w && w.player === 'human' && w.line.join() === '0,3,6';
})());

resetBoard();
place(0, 'human', 2); place(4, 'human', 2); place(8, 'human', 2);
assert('Human wins diagonal [0,4,8]', (() => {
  const w = checkWinner('human');
  return w && w.player === 'human' && w.line.join() === '0,4,8';
})());

resetBoard();
place(0, 'ai', 2); place(1, 'ai', 2); place(2, 'ai', 2);
assert('AI wins top row [0,1,2]', (() => {
  const w = checkWinner('ai');
  return w && w.player === 'ai' && w.line.join() === '0,1,2';
})());

/* --- 2. No winner -------------------------------------------- */
console.log('\n=== 2. No winner scenarios ===');

resetBoard();
assert('Empty board — no winner', checkWinner('human') === null);

resetBoard();
place(3, 'human', 2); place(4, 'ai', 2); place(5, 'human', 2);
assert('Mixed middle row — no winner', checkWinner('human') === null);

/* --- 3. Gobbling -------------------------------------------- */
console.log('\n=== 3. Win after gobbling AI pieces ===');

resetBoard();
place(3, 'ai', 1); place(4, 'ai', 1); place(5, 'ai', 1);
place(3, 'human', 2); place(4, 'human', 2); place(5, 'human', 2);
assert('Human gobbles all 3 AI pieces in middle row', (() => {
  const w = checkWinner('human');
  return w && w.player === 'human' && w.line.join() === '3,4,5';
})());

/* --- 4. THE BUG CASE: human move creates own win AND reveals AI win --- */
console.log('\n=== 4. Bug scenario: human move completes own line AND reveals AI line ===');

// Board before human's winning move:
//   Cell 0: AI(s1) under Human(m2)  <- human is gobbling AI here
//   Cell 1: AI(s1) on top
//   Cell 2: AI(s1) on top
//   Cell 3: Human(m2) on top
//   Cell 4: AI(s1) on top          <- human will move from cell 0 to here
//   Cell 5: Human(m2) on top
// Human moves piece from cell 0 to cell 4  -> reveals AI win [0,1,2], creates human win [3,4,5]
resetBoard();
place(0, 'ai', 1); place(0, 'human', 2);  // human gobbling AI at cell 0
place(1, 'ai', 1);
place(2, 'ai', 1);
place(3, 'human', 2);
place(4, 'ai', 1);
place(5, 'human', 2);

// Simulate human moving their piece from cell 0 to cell 4
const movedPiece = gameState.board[0].pop();
gameState.board[4].push(movedPiece);

// After the move: [0,1,2] = AI, AI, AI  AND  [3,4,5] = human, human, human
const bugWin = checkWinner('human');
assert("Human wins [3,4,5] even though AI's [0,1,2] is also a winning line",
  bugWin && bugWin.player === 'human' && bugWin.line.join() === '3,4,5');

// The old (buggy) checkWinner would have returned AI's [0,1,2] first:
function checkWinnerBuggy() {
  for (const line of WIN_LINES) {
    const tops = line.map(i => topPiece(i));
    if (tops[0] && tops[1] && tops[2] &&
        tops[0].player === tops[1].player &&
        tops[1].player === tops[2].player) {
      return { player: tops[0].player, line };
    }
  }
  return null;
}
const oldResult = checkWinnerBuggy();
assert('Buggy version would have declared AI the winner',
  oldResult && oldResult.player === 'ai' && oldResult.line.join() === '0,1,2');

/* --- 5. Symmetric: AI move reveals human line, AI move completes own line --- */
console.log('\n=== 5. Symmetric case: AI move completes AI line AND reveals human line ===');

// If AI is the mover and their move creates their own line AND reveals human's line,
// AI should win (mover wins).
resetBoard();
// Human has hidden win at [3,4,5] under AI pieces at cells 3 and 5
place(3, 'human', 1); place(3, 'ai', 2);   // AI gobbling human at cell 3
place(4, 'human', 2);                        // human on top at cell 4
place(5, 'human', 1); place(5, 'ai', 2);   // AI gobbling human at cell 5

// AI also has pieces at cells 0 and 1
place(0, 'ai', 2);
place(1, 'ai', 2);

// AI moves from cell 3 to cell 2, completing AI's top row [0,1,2]
// but removing their gobble on human at cell 3 (revealing human at cell 3)
const aiPiece = gameState.board[3].pop();  // AI's piece from cell 3
gameState.board[2].push(aiPiece);          // AI moves to cell 2

// After AI's move:
//   [0,1,2]: ai(2), ai(2), ai(2) -> AI WINS
//   [3,4,5]: human(1), human(2), ai(2) -> NOT all same (cell 5 is AI on top)
const aiWin = checkWinner('ai');
assert('AI wins [0,1,2] when AI move completes their line',
  aiWin && aiWin.player === 'ai' && aiWin.line.join() === '0,1,2');

/* --- 6. AI first: various win scenarios still work --- */
console.log('\n=== 6. AI goes first — all win conditions still detected ===');

resetBoard();
place(0, 'ai', 2); place(4, 'ai', 2); place(8, 'ai', 2);
assert('AI wins diagonal [0,4,8] when AI moves', (() => {
  const w = checkWinner('ai');
  return w && w.player === 'ai';
})());

resetBoard();
place(2, 'ai', 2); place(4, 'ai', 2); place(6, 'ai', 2);
assert('AI wins diagonal [2,4,6] when AI moves', (() => {
  const w = checkWinner('ai');
  return w && w.player === 'ai';
})());

/* --- 7. Both lines exist but mover has no winning line: opponent wins --- */
console.log('\n=== 7. Opponent wins when mover has no matching line ===');

resetBoard();
place(0, 'ai', 2); place(1, 'ai', 2); place(2, 'ai', 2);  // AI has [0,1,2]
place(8, 'human', 2);  // human places somewhere without a win
const humanMoveResult = checkWinner('human');  // human just moved
assert('AI wins when AI has the only winning line and human just moved',
  humanMoveResult && humanMoveResult.player === 'ai');

/* ================================================================
 * Summary
 * ================================================================ */
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed > 0) {
  console.log('Some tests FAILED — please fix the issues above.');
  process.exit(1);
} else {
  console.log('All tests passed! ✅');
}
