/**
 * ai.js — Minimax AI with alpha-beta pruning for Gobble Game
 *
 * Exposed API:
 *   getBestMove(state) → { type, player, size, pieceId, fromCell, toCell }
 */

'use strict';

const AI = (() => {
  /* ---- constants ---- */
  const MAX_DEPTH   = 10;   // search depth (lower = faster on mobile)
  const INF         = 1e9;
  const WIN_SCORE   = 100000;

  /* ---- win line definitions ---- */
  const WIN_LINES = [
    [0,1,2],[3,4,5],[6,7,8],   // rows
    [0,3,6],[1,4,7],[2,5,8],   // cols
    [0,4,8],[2,4,6]            // diagonals
  ];

  /* ================================================================
   * State serialisation helpers (deep cloning without JSON overhead)
   * ================================================================ */
  function cloneState(state) {
    return {
      board: state.board.map(stack => stack.map(p => ({...p}))),
      humanReserve: state.humanReserve.map(p => ({...p})),
      aiReserve:    state.aiReserve.map(p => ({...p})),
    };
  }

  /* top piece of a cell (or null) */
  function top(stack) {
    return stack.length ? stack[stack.length - 1] : null;
  }

  /* ================================================================
   * Move generation
   * ================================================================ */
  function generateMoves(state, player) {
    const moves = [];
    const reserve = player === 'ai' ? state.aiReserve : state.humanReserve;

    // 1. Place from reserve
    // Deduplicate by size: two pieces of the same size are functionally identical,
    // so we only need one representative per size to generate all unique moves.
    const reserveAvail = {};
    reserve.forEach(p => {
      if (!p.used) reserveAvail[p.size] = reserveAvail[p.size] || p;
    });
    Object.values(reserveAvail).forEach(piece => {
      for (let to = 0; to < 9; to++) {
        const t = top(state.board[to]);
        if (!t || t.size < piece.size) {
          moves.push({ type: 'place', player, size: piece.size, pieceId: piece.id, toCell: to });
        }
      }
    });

    // 2. Move from board
    for (let from = 0; from < 9; from++) {
      const t = top(state.board[from]);
      if (!t || t.player !== player) continue;
      for (let to = 0; to < 9; to++) {
        if (from === to) continue;
        const dest = top(state.board[to]);
        if (!dest || dest.size < t.size) {
          moves.push({ type: 'move', player, size: t.size, pieceId: t.id, fromCell: from, toCell: to });
        }
      }
    }
    return moves;
  }

  /* ================================================================
   * Apply / undo move (mutates state in-place for speed)
   * ================================================================ */
  function applyMove(state, move) {
    if (move.type === 'place') {
      const reserve = move.player === 'ai' ? state.aiReserve : state.humanReserve;
      const idx = reserve.findIndex(p => p.id === move.pieceId);
      reserve[idx].used = true;
      state.board[move.toCell].push({ id: move.pieceId, player: move.player, size: move.size });
    } else {
      // move on board
      const fromStack = state.board[move.fromCell];
      const piece = fromStack.pop();
      state.board[move.toCell].push(piece);
    }
  }

  /* ================================================================
   * Win / draw detection
   * ================================================================ */
  function checkWinner(state) {
    for (const line of WIN_LINES) {
      const tops = line.map(i => top(state.board[i]));
      if (tops[0] && tops[1] && tops[2] &&
          tops[0].player === tops[1].player &&
          tops[1].player === tops[2].player) {
        return tops[0].player;
      }
    }
    return null;
  }

  function isTerminal(state, depth) {
    return checkWinner(state) !== null || depth === 0;
  }

  /* ================================================================
   * Heuristic evaluation
   * ================================================================ */
  function evaluate(state) {
    const winner = checkWinner(state);
    if (winner === 'ai')    return WIN_SCORE;
    if (winner === 'human') return -WIN_SCORE;

    let score = 0;

    // Score each win line based on piece count / size advantage
    for (const line of WIN_LINES) {
      let aiCount = 0, humanCount = 0;
      let aiSize = 0, humanSize = 0;

      for (const i of line) {
        const t = top(state.board[i]);
        if (!t) continue;
        if (t.player === 'ai') {
          aiCount++;
          aiSize = Math.max(aiSize, t.size);
        } else {
          humanCount++;
          humanSize = Math.max(humanSize, t.size);
        }
      }

      // Both sides in line — contested
      if (aiCount > 0 && humanCount > 0) {
        if (aiSize > humanSize)   score += 2;
        else if (humanSize > aiSize) score -= 2;
        continue;
      }

      if (aiCount === 2)    score += 10;
      if (aiCount === 1)    score += 2;
      if (humanCount === 2) score -= 10;
      if (humanCount === 1) score -= 2;
    }

    // Bonus for controlling center
    const c = top(state.board[4]);
    if (c) score += (c.player === 'ai' ? 3 : -3);

    // Piece size advantage in reserve
    const aiLargeLeft    = state.aiReserve.filter(p => !p.used && p.size === 3).length;
    const humanLargeLeft = state.humanReserve.filter(p => !p.used && p.size === 3).length;
    score += (aiLargeLeft - humanLargeLeft);

    return score;
  }

  /* ================================================================
   * Minimax with alpha-beta pruning
   * ================================================================ */
  function minimax(state, depth, alpha, beta, maximising) {
    const winner = checkWinner(state);
    if (winner === 'ai')    return WIN_SCORE + depth;  // faster win = higher score
    if (winner === 'human') return -WIN_SCORE - depth;
    if (depth === 0) return evaluate(state);

    const player = maximising ? 'ai' : 'human';
    const moves  = generateMoves(state, player);

    if (moves.length === 0) {
      // No moves = draw-ish (small penalty for the mover)
      return maximising ? -1 : 1;
    }

    if (maximising) {
      let best = -INF;
      for (const move of moves) {
        const saved = cloneState(state);
        applyMove(state, move);
        const val = minimax(state, depth - 1, alpha, beta, false);
        // restore
        state.board         = saved.board;
        state.humanReserve  = saved.humanReserve;
        state.aiReserve     = saved.aiReserve;

        best  = Math.max(best, val);
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = INF;
      for (const move of moves) {
        const saved = cloneState(state);
        applyMove(state, move);
        const val = minimax(state, depth - 1, alpha, beta, true);
        state.board         = saved.board;
        state.humanReserve  = saved.humanReserve;
        state.aiReserve     = saved.aiReserve;

        best = Math.min(best, val);
        beta = Math.min(beta, val);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  /* ================================================================
   * Public: get best move for AI
   * ================================================================ */
  function getBestMove(state) {
    const moves = generateMoves(state, 'ai');
    if (!moves.length) return null;

    let bestVal  = -INF;
    let bestMove = moves[0];

    for (const move of moves) {
      const saved = cloneState(state);
      applyMove(state, move);
      const val = minimax(state, MAX_DEPTH - 1, -INF, INF, false);
      state.board         = saved.board;
      state.humanReserve  = saved.humanReserve;
      state.aiReserve     = saved.aiReserve;

      if (val > bestVal) {
        bestVal  = val;
        bestMove = move;
      }
    }

    return bestMove;
  }

  return { getBestMove };
})();