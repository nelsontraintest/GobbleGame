/**
 * game.js — Gobble Game core logic and UI rendering
 *
 * Board: 9-cell array. Each cell is a stack (array) of pieces.
 * Piece: { id, player: 'human'|'ai', size: 1|2|3, used: bool }
 */

'use strict';

/* ================================================================
 * State
 * ================================================================ */
let gameState = null;     // { board, humanReserve, aiReserve }
let selection = null;     // { type:'reserve'|'board', pieceId, fromCell? }
let gameOver  = false;
let aiThinking = false;
let lastMovedPieceId = null;  // track the most recently placed/moved piece for animation

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

/* ================================================================
 * Initialise
 * ================================================================ */
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

function initGame(firstTurn = 'human') {
  gameState = {
    board: Array.from({ length: 9 }, () => []),
    humanReserve: createPieces('human'),
    aiReserve:    createPieces('ai'),
    turn: firstTurn,
  };
  selection = null;
  gameOver  = false;
  aiThinking = false;
  lastMovedPieceId = null;
  render();
  if (firstTurn === 'ai') {
    triggerAI();
  }
}

function showFirstTurnModal() {
  const overlay = document.getElementById('first-turn-overlay');
  overlay.classList.remove('hidden');

  function onChoice(e) {
    const btn = e.target.closest('.first-turn-btn');
    if (!btn) return;
    let choice = btn.dataset.choice;
    if (choice === 'random') {
      choice = Math.random() < 0.5 ? 'human' : 'ai';
    }
    overlay.classList.add('hidden');
    document.getElementById('first-turn-options').removeEventListener('click', onChoice);
    initGame(choice);
  }

  document.getElementById('first-turn-options').addEventListener('click', onChoice);
}

/* ================================================================
 * Helpers
 * ================================================================ */
function topPiece(cellIndex) {
  const stack = gameState.board[cellIndex];
  return stack.length ? stack[stack.length - 1] : null;
}

function canPlace(size, cellIndex) {
  const t = topPiece(cellIndex);
  return !t || t.size < size;
}

/* ================================================================
 * Win / draw detection
 * ================================================================ */
function checkWinner(currentPlayer) {
  // When a move simultaneously completes the current player's line and reveals
  // an opponent line (by un-gobbling), the mover's win must take priority.
  // We therefore scan all lines, immediately return if the current player's
  // line is found, and only fall back to an opponent win if no such line exists.
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

function hasMoves(player) {
  const reserve = player === 'human' ? gameState.humanReserve : gameState.aiReserve;
  // any reserve piece can go somewhere?
  const sizes = [...new Set(reserve.filter(p => !p.used).map(p => p.size))];
  for (const sz of sizes) {
    for (let i = 0; i < 9; i++) {
      if (canPlace(sz, i)) return true;
    }
  }
  // any board piece can move?
  for (let from = 0; from < 9; from++) {
    const t = topPiece(from);
    if (!t || t.player !== player) continue;
    for (let to = 0; to < 9; to++) {
      if (from !== to && canPlace(t.size, to)) return true;
    }
  }
  return false;
}

/* ================================================================
 * Move execution
 * ================================================================ */
function executeMove(move) {
  if (move.type === 'place') {
    const reserve = move.player === 'human' ? gameState.humanReserve : gameState.aiReserve;
    const piece = reserve.find(p => p.id === move.pieceId);
    piece.used = true;
    gameState.board[move.toCell].push({ id: piece.id, player: piece.player, size: piece.size });
    lastMovedPieceId = piece.id;
  } else if (move.type === 'move') {
    const fromStack = gameState.board[move.fromCell];
    const piece = fromStack.pop();
    gameState.board[move.toCell].push(piece);
    lastMovedPieceId = piece.id;
  }

  // Check result
  const win = checkWinner(move.player);
  if (win) {
    render(win.line);
    showGameOver(win.player);
    gameOver = true;
    return;
  }

  // Switch turns
  const next = move.player === 'human' ? 'ai' : 'human';
  gameState.turn = next;

  if (!hasMoves(next)) {
    // Check if the opponent also has no moves → draw
    const other = next === 'human' ? 'ai' : 'human';
    if (!hasMoves(other)) {
      render();
      showGameOver(null);
      gameOver = true;
      return;
    }
    // Skip this player's turn
    gameState.turn = other;
  }

  render();

  if (gameState.turn === 'ai' && !gameOver) {
    triggerAI();
  }
}

/* ================================================================
 * AI trigger
 * ================================================================ */
function triggerAI() {
  aiThinking = true;
  setStatus('🤖 AI is thinking…', 'ai');
  getStatusBar().classList.add('thinking');

  setTimeout(() => {
    const aiState = {
      board:        gameState.board.map(stack => stack.map(p => ({...p}))),
      humanReserve: gameState.humanReserve.map(p => ({...p})),
      aiReserve:    gameState.aiReserve.map(p => ({...p})),
    };
    const move = AI.getBestMove(aiState);
    aiThinking = false;
    getStatusBar().classList.remove('thinking');

    if (move) {
      executeMove(move);
    } else {
      // No moves for AI — pass
      gameState.turn = 'human';
      render();
    }
  }, 600);
}

/* ================================================================
 * Selection logic
 * ================================================================ */
function getValidTargets(size) {
  const targets = [];
  for (let i = 0; i < 9; i++) {
    if (canPlace(size, i)) targets.push(i);
  }
  return targets;
}

function handleReservePieceTap(pieceId) {
  if (gameOver || aiThinking || gameState.turn !== 'human') return;
  const piece = gameState.humanReserve.find(p => p.id === pieceId);
  if (!piece || piece.used) return;

  // Toggle selection
  if (selection && selection.pieceId === pieceId) {
    selection = null;
  } else {
    selection = { type: 'reserve', pieceId, size: piece.size };
  }
  render();
}

function handleBoardPieceTap(cellIndex) {
  if (gameOver || aiThinking || gameState.turn !== 'human') return;
  const t = topPiece(cellIndex);
  if (!t || t.player !== 'human') return;

  // Toggle selection
  if (selection && selection.type === 'board' && selection.fromCell === cellIndex) {
    selection = null;
  } else {
    selection = { type: 'board', pieceId: t.id, size: t.size, fromCell: cellIndex };
  }
  render();
}

function handleCellTap(cellIndex) {
  if (gameOver || aiThinking || gameState.turn !== 'human') return;

  const t = topPiece(cellIndex);

  if (!selection) {
    // Try to select a human piece on this cell
    if (t && t.player === 'human') {
      handleBoardPieceTap(cellIndex);
    }
    return;
  }

  // We have a selection — check if this is a valid target
  const validTargets = getValidTargets(selection.size);
  if (validTargets.includes(cellIndex)) {
    // Execute move
    const move = selection.type === 'reserve'
      ? { type: 'place', player: 'human', size: selection.size, pieceId: selection.pieceId, toCell: cellIndex }
      : { type: 'move',  player: 'human', size: selection.size, pieceId: selection.pieceId, fromCell: selection.fromCell, toCell: cellIndex };

    selection = null;
    executeMove(move);
    return;
  }

  // Tapped a different human piece on the board
  if (t && t.player === 'human') {
    if (selection.type === 'board' && selection.fromCell === cellIndex) {
      selection = null;
    } else {
      selection = { type: 'board', pieceId: t.id, size: t.size, fromCell: cellIndex };
    }
    render();
    return;
  }

  // Tapped invalid cell — deselect
  selection = null;
  render();
}

/* ================================================================
 * Rendering
 * ================================================================ */
function getStatusBar() {
  return document.getElementById('status-bar');
}

function setStatus(text, turn) {
  const el = document.getElementById('status-text');
  el.textContent = text;
  const bar = getStatusBar();
  bar.setAttribute('data-turn', turn || '');
}

function render(winLine) {
  renderReserve('human');
  renderReserve('ai');
  renderBoard(winLine);
  renderStatusBar();
}

function renderStatusBar() {
  if (gameOver) return;
  if (aiThinking) return; // handled separately
  const validTargets = selection ? getValidTargets(selection.size) : [];
  if (gameState.turn === 'human') {
    if (selection) {
      setStatus(`✅ Select where to place it (${validTargets.length} options)`, 'human');
    } else {
      setStatus('👤 Your turn — tap a piece', 'human');
    }
  } else {
    setStatus('🤖 AI is thinking…', 'ai');
  }
}

function renderReserve(player) {
  const reserve = player === 'human' ? gameState.humanReserve : gameState.aiReserve;
  const container = document.getElementById(player === 'human' ? 'human-pieces' : 'ai-pieces');
  container.innerHTML = '';

  // Group by size for display
  [3, 2, 1].forEach(size => {
    const piecesOfSize = reserve.filter(p => p.size === size);
    piecesOfSize.forEach(piece => {
      const el = document.createElement('div');
      el.className = 'piece' + (piece.used ? ' used' : '');
      el.dataset.player = player;
      el.dataset.size   = size;
      el.dataset.pid    = piece.id;
      el.innerHTML = '<div class="size-dot"></div>';

      if (!piece.used && player === 'human') {
        el.addEventListener('click', () => handleReservePieceTap(piece.id));
        el.addEventListener('touchend', e => { e.preventDefault(); handleReservePieceTap(piece.id); });
      }

      if (selection && selection.pieceId === piece.id && selection.type === 'reserve') {
        el.classList.add('selected');
      }

      container.appendChild(el);
    });
  });
}

function renderBoard(winLine) {
  const cells = document.querySelectorAll('.cell');
  const validTargets = selection ? getValidTargets(selection.size) : [];

  cells.forEach((cell, i) => {
    cell.innerHTML = '';
    cell.className = 'cell';

    // Win line highlight
    if (winLine && winLine.includes(i)) {
      cell.classList.add('win-cell');
    }

    // Valid target highlight
    if (validTargets.includes(i)) {
      cell.classList.add('valid-target');
    }

    // Render top piece
    const t = topPiece(i);
    if (t) {
      const el = document.createElement('div');
      // Only animate the most recently placed/moved piece
      el.className = 'piece' + (t.id === lastMovedPieceId ? ' just-placed' : '');
      el.dataset.player = t.player;
      el.dataset.size   = t.size;
      el.dataset.pid    = t.id;
      el.innerHTML = '<div class="size-dot"></div>';

      if (!winLine) {
        // Add click/touch for both selection and cell tap
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (t.player === 'human') {
            handleBoardPieceTap(i);
          } else {
            // Tapped AI piece — if we have selection with valid target here, treat as cell tap
            handleCellTap(i);
          }
        });
        el.addEventListener('touchend', e => {
          e.preventDefault();
          e.stopPropagation();
          if (t.player === 'human') {
            handleBoardPieceTap(i);
          } else {
            handleCellTap(i);
          }
        });
      }

      // Selected piece highlight
      if (selection && selection.type === 'board' && selection.fromCell === i) {
        el.classList.add('selected');
      }

      // Stack indicator (hidden pieces)
      const stack = gameState.board[i];
      if (stack.length > 1) {
        const indicator = document.createElement('div');
        indicator.className = 'stack-indicator';
        indicator.textContent = `+${stack.length - 1}`;
        cell.appendChild(indicator);
      }

      cell.appendChild(el);
    }

    // Cell tap handler (for placing on empty or gobbling)
    cell.addEventListener('click', () => handleCellTap(i));
    cell.addEventListener('touchend', e => {
      // Only handle if not from a piece inside
      if (e.target === cell) {
        e.preventDefault();
        handleCellTap(i);
      }
    });
  });
}

/* ================================================================
 * Game over
 * ================================================================ */
function showGameOver(winner) {
  const card    = document.getElementById('game-over-card');
  const emoji   = document.getElementById('game-over-emoji');
  const title   = document.getElementById('game-over-title');
  const msg     = document.getElementById('game-over-message');

  if (winner === 'human') {
    emoji.textContent = '🎉';
    title.textContent = 'You Win!';
    msg.textContent   = 'Excellent! You outsmarted the AI. Congratulations!';
    setStatus('🎉 You win!', 'human');
  } else if (winner === 'ai') {
    emoji.textContent = '🤖';
    title.textContent = 'AI Wins!';
    msg.textContent   = 'The AI got three in a row. Try again!';
    setStatus('🤖 AI wins!', 'ai');
  } else {
    emoji.textContent = '🤝';
    title.textContent = "It's a Draw!";
    msg.textContent   = 'No moves left and no winner. Well played!';
    setStatus("🤝 It's a draw!", '');
  }

  card.classList.remove('hidden');
}

/* ================================================================
 * UI Event Bindings
 * ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('new-game-btn').addEventListener('click', showFirstTurnModal);
  document.getElementById('play-again-btn').addEventListener('click', () => {
    document.getElementById('game-over-card').classList.add('hidden');
    showFirstTurnModal();
  });

  document.getElementById('rules-btn').addEventListener('click', () => {
    document.getElementById('rules-overlay').classList.remove('hidden');
  });
  document.getElementById('close-rules-btn').addEventListener('click', () => {
    document.getElementById('rules-overlay').classList.add('hidden');
  });
  document.getElementById('rules-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('rules-overlay')) {
      document.getElementById('rules-overlay').classList.add('hidden');
    }
  });

  // Prevent default touch scroll on board area (CSS touch-action handles it but belt+suspenders for older iOS)
  document.getElementById('board').addEventListener('touchmove', e => {
    if (e.cancelable) e.preventDefault();
  }, { passive: false });

  showFirstTurnModal();
});
