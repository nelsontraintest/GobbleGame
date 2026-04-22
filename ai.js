/**
 * ai_ultimate.js — High-Performance Minimax AI for Gobble Game
 * Successfully optimized via Autonomous AutoResearch Loop
 */

'use strict';

const AI = (() => {
  /* ---- constants ---- */
  const MAX_DEPTH   = 5;   
  const INF         = 1e9;
  const WIN_SCORE   = 100000;

  /* ---- Hyperparameters (Expert/Optimized) ---- */
  const HP_EXPERT = {
    WIN_LINE_BONUS_2: 10,
    WIN_LINE_BONUS_1: 2,
    CONTESTED_ADVANTAGE: 2,
    CENTER_CONTROL: 3,
    RESERVE_LARGE_PIECE_WEIGHT: 1,
    GOBBLE_POTENTIAL_WEIGHT: 2,
    VULNERABILITY_PENALTY: 3
  };

  const WIN_LINES = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  function cloneState(state) {
    return {
      board: state.board.map(stack => stack.map(p => ({...p}))),
      humanReserve: state.humanReserve.map(p => ({...p})),
      aiReserve:    state.aiReserve.map(p => ({...p})),
    };
  }

  function top(stack) {
    return stack.length ? stack[stack.length - 1] : null;
  }

  function generateMoves(state, player) {
    const moves = [];
    const reserve = player === 'ai' ? state.aiReserve : state.humanReserve;
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

  function applyMove(state, move) {
    if (move.type === 'place') {
      const reserve = move.player === 'ai' ? state.aiReserve : state.humanReserve;
      const idx = reserve.findIndex(p => p.id === move.pieceId);
      reserve[idx].used = true;
      state.board[move.toCell].push({ id: move.pieceId, player: move.player, size: move.size });
    } else {
      const fromStack = state.board[move.fromCell];
      const piece = fromStack.pop();
      state.board[move.toCell].push(piece);
    }
  }

  function checkWinner(state, currentPlayer) {
    let opponentWin = null;
    for (const line of WIN_LINES) {
      const tops = line.map(i => top(state.board[i]));
      if (tops[0] && tops[1] && tops[2] &&
          tops[0].player === tops[1].player &&
          tops[1].player === tops[2].player) {
        if (currentPlayer && tops[0].player === currentPlayer) {
          return tops[0].player;
        }
        if (!opponentWin) {
          opponentWin = tops[0].player;
        }
      }
    }
    return opponentWin;
  }

  /* ================================================================
   * Heuristic evaluations
   * ================================================================ */

  function evaluateEasy(state, lastPlayer) {
    const winner = checkWinner(state, lastPlayer);
    if (winner === 'ai')    return WIN_SCORE;
    if (winner === 'human') return -WIN_SCORE;

    let score = 0;
    for (const line of WIN_LINES) {
      let aiCount = 0, humanCount = 0;
      let aiSize = 0, humanSize = 0;
      for (const i of line) {
        const t = top(state.board[i]);
        if (!t) continue;
        if (t.player === 'ai') { aiCount++; aiSize = Math.max(aiSize, t.size); }
        else { humanCount++; humanSize = Math.max(humanSize, t.size); }
      }
      if (aiCount > 0 && humanCount > 0) {
        if (aiSize > humanSize) score += 2;
        else if (humanSize > aiSize) score -= 2;
        continue;
      }
      if (aiCount === 2)    score += 10;
      if (aiCount === 1)    score += 2;
      if (humanCount === 2) score -= 10;
      if (humanCount === 1) score -= 2;
    }
    const c = top(state.board[4]);
    if (c) score += (c.player === 'ai' ? 3 : -3);
    const aiLargeLeft    = state.aiReserve.filter(p => !p.used && p.size === 3).length;
    const humanLargeLeft = state.humanReserve.filter(p => !p.used && p.size === 3).length;
    score += (aiLargeLeft - humanLargeLeft);
    return score;
  }

  function evaluateExpert(state, lastPlayer) {
    const winner = checkWinner(state, lastPlayer);
    if (winner === 'ai')    return WIN_SCORE;
    if (winner === 'human') return -WIN_SCORE;

    let score = 0;
    for (const line of WIN_LINES) {
      let aiCount = 0, humanCount = 0;
      let aiSize = 0, humanSize = 0;
      for (const i of line) {
        const t = top(state.board[i]);
        if (!t) continue;
        if (t.player === 'ai') { aiCount++; aiSize = Math.max(aiSize, t.size); }
        else { humanCount++; humanSize = Math.max(humanSize, t.size); }
      }
      if (aiCount > 0 && humanCount > 0) {
        if (aiSize > humanSize)   score += HP_EXPERT.CONTESTED_ADVANTAGE;
        else if (humanSize > aiSize) score -= HP_EXPERT.CONTESTED_ADVANTAGE;
        continue;
      }
      if (aiCount === 2)    score += HP_EXPERT.WIN_LINE_BONUS_2;
      if (aiCount === 1)    score += HP_EXPERT.WIN_LINE_BONUS_1;
      if (humanCount === 2) score -= HP_EXPERT.WIN_LINE_BONUS_2;
      if (humanCount === 1) score -= HP_EXPERT.WIN_LINE_BONUS_1;
    }

    for (let i = 0; i < 9; i++) {
        const stack = state.board[i];
        if (!stack.length) continue;
        const t = stack[stack.length - 1];
        if (i === 4) score += (t.player === 'ai' ? HP_EXPERT.CENTER_CONTROL : -HP_EXPERT.CENTER_CONTROL);
        if (stack.length > 1) {
            const below = stack[stack.length - 2];
            if (below.player !== t.player) {
                score += (t.player === 'ai' ? HP_EXPERT.GOBBLE_POTENTIAL_WEIGHT : -HP_EXPERT.GOBBLE_POTENTIAL_WEIGHT);
            }
        }
        for (let idx = 0; idx < stack.length - 1; idx++) {
            const p = stack[idx];
            if (p.player === 'ai') score -= HP_EXPERT.VULNERABILITY_PENALTY;
            else score += HP_EXPERT.VULNERABILITY_PENALTY;
        }
    }
    const aiLargeLeft    = state.aiReserve.filter(p => !p.used && p.size === 3).length;
    const humanLargeLeft = state.humanReserve.filter(p => !p.used && p.size === 3).length;
    score += (aiLargeLeft - humanLargeLeft) * HP_EXPERT.RESERVE_LARGE_PIECE_WEIGHT;
    return score;
  }

  function minimax(state, depth, alpha, beta, maximising, difficulty) {
    const lastPlayer = maximising ? 'human' : 'ai';
    const winner = checkWinner(state, lastPlayer);
    if (winner === 'ai')    return WIN_SCORE + depth;
    if (winner === 'human') return -WIN_SCORE - depth;
    if (depth === 0) return difficulty === 'expert' ? evaluateExpert(state, lastPlayer) : evaluateEasy(state, lastPlayer);

    const player = maximising ? 'ai' : 'human';
    const moves  = generateMoves(state, player);
    if (moves.length === 0) return maximising ? -1 : 1;

    if (maximising) {
      let best = -INF;
      for (const move of moves) {
        const saved = cloneState(state);
        applyMove(state, move);
        const val = minimax(state, depth - 1, alpha, beta, false, difficulty);
        state.board = saved.board; state.humanReserve = saved.humanReserve; state.aiReserve = saved.aiReserve;
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
        const val = minimax(state, depth - 1, alpha, beta, true, difficulty);
        state.board = saved.board; state.humanReserve = saved.humanReserve; state.aiReserve = saved.aiReserve;
        best = Math.min(best, val);
        beta = Math.min(beta, val);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  function getBestMove(state, difficulty = 'expert') {
    const moves = generateMoves(state, 'ai');
    if (!moves.length) return null;
    let bestVal  = -INF;
    let bestMove = moves[0];
    const depth = difficulty === 'expert' ? MAX_DEPTH : 2; // Easy uses shallow search for fast, human-level play
    for (const move of moves) {
      const saved = cloneState(state);
      applyMove(state, move);
      const val = minimax(state, depth - 1, -INF, INF, false, difficulty);
      state.board = saved.board; state.humanReserve = saved.humanReserve; state.aiReserve = saved.aiReserve;
      if (val > bestVal) { bestVal = val; bestMove = move; }
    }
    return bestMove;
  }

  return { getBestMove };
})();
