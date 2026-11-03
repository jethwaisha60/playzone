/**
 * PlayZone - Neon Connect Four Game Engine
 * Full vanilla JavaScript (ES6+), Minimax AI with Alpha-Beta Pruning, tactile Web Audio API.
 */

(function () {
  'use strict';

  // --- Constants & Config ---
  const STORAGE_KEY_P1 = 'playzone_score_connect_four';
  const STORAGE_KEY_P2 = 'playzone_c4_p2_wins';
  const STORAGE_KEY_DRAWS = 'playzone_c4_draws';
  const SOUND_KEY = 'playzone_sound';

  const ROWS = 6;
  const COLS = 7;

  // --- DOM Elements ---
  const boardGrid = document.getElementById('boardGrid');
  const dropIndicators = document.getElementById('dropIndicators');
  const statusBanner = document.getElementById('statusBanner');
  const turnDisc = document.getElementById('turnDisc');
  const statusText = document.getElementById('statusText');

  const p1ScoreLabel = document.getElementById('p1ScoreLabel');
  const p1ScoreDisplay = document.getElementById('p1ScoreDisplay');
  const p2ScoreLabel = document.getElementById('p2ScoreLabel');
  const p2ScoreDisplay = document.getElementById('p2ScoreDisplay');
  const drawsScoreDisplay = document.getElementById('drawsScoreDisplay');
  const moveCountDisplay = document.getElementById('moveCountDisplay');

  const modeButtons = document.querySelectorAll('#modeSelector .toggle-btn');
  const diffRow = document.getElementById('difficultyRow');
  const diffButtons = document.querySelectorAll('#difficultySelector .toggle-btn');
  const soundToggleBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');

  const newRoundBtn = document.getElementById('newRoundBtn');
  const undoBtn = document.getElementById('undoBtn');
  const resetScoreBtn = document.getElementById('resetScoreBtn');

  // Result Modal Elements
  const resultOverlay = document.getElementById('resultOverlay');
  const resultIcon = document.getElementById('resultIcon');
  const resultTitle = document.getElementById('resultTitle');
  const resultMessage = document.getElementById('resultMessage');
  const resultBadge = document.getElementById('resultBadge');
  const modalWinnerVal = document.getElementById('modalWinnerVal');
  const modalMovesVal = document.getElementById('modalMovesVal');
  const modalP1WinsVal = document.getElementById('modalP1WinsVal');
  const modalP2WinsVal = document.getElementById('modalP2WinsVal');
  const playAgainBtn = document.getElementById('playAgainBtn');

  // --- State Variables ---
  let board = []; // 6 rows x 7 cols: 0 = empty, 1 = Player 1 (Cyan), 2 = Player 2/AI (Pink)
  let currentPlayer = 1;
  let gameMode = 'ai'; // 'ai' or 'pvp'
  let aiDifficulty = 'medium'; // 'easy', 'medium', 'hard'
  let isGameOver = false;
  let isAiThinking = false;
  let moveHistory = []; // Stack of { row, col, player }

  let p1Wins = 0;
  let p2Wins = 0;
  let drawCount = 0;

  // --- Audio Helpers ---
  function isSoundEnabled() {
    if (window.playZoneAudio) {
      return window.playZoneAudio.enabled;
    }
    return localStorage.getItem(SOUND_KEY) !== 'disabled';
  }

  function playUiClick() {
    if (window.playZoneAudio) {
      window.playZoneAudio.playClick();
    }
  }

  function playDropSound(row) {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      // Lower row landing sounds slightly deeper
      const freq = 340 - (row * 18);
      window.playZoneAudio.playTone(freq, 'sine', 0.08, 0.22);
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playWinFanfare() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      window.playZoneAudio.playSuccess();
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playDrawSound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      window.playZoneAudio.playGameOver();
    } catch (e) {
      // Audio fallback silent
    }
  }

  // --- LocalStorage Win Tracker ---
  function loadScores() {
    p1Wins = parseInt(localStorage.getItem(STORAGE_KEY_P1), 10) || 0;
    p2Wins = parseInt(localStorage.getItem(STORAGE_KEY_P2), 10) || 0;
    drawCount = parseInt(localStorage.getItem(STORAGE_KEY_DRAWS), 10) || 0;
    updateScoreboardUI();
  }

  function saveScores() {
    localStorage.setItem(STORAGE_KEY_P1, p1Wins.toString());
    localStorage.setItem(STORAGE_KEY_P2, p2Wins.toString());
    localStorage.setItem(STORAGE_KEY_DRAWS, drawCount.toString());
  }

  function resetAllScores() {
    p1Wins = 0;
    p2Wins = 0;
    drawCount = 0;
    saveScores();
    updateScoreboardUI();
    playUiClick();
  }

  function updateScoreboardUI() {
    p1ScoreDisplay.textContent = p1Wins;
    p2ScoreDisplay.textContent = p2Wins;
    drawsScoreDisplay.textContent = drawCount;
    moveCountDisplay.textContent = moveHistory.length;

    if (gameMode === 'ai') {
      p1ScoreLabel.textContent = 'Player 1 (Cyan)';
      p2ScoreLabel.textContent = `Computer (${aiDifficulty.toUpperCase()})`;
    } else {
      p1ScoreLabel.textContent = 'Player 1 (Cyan)';
      p2ScoreLabel.textContent = 'Player 2 (Pink)';
    }
  }

  function updateSoundUI() {
    const enabled = isSoundEnabled();
    if (soundIcon) {
      soundIcon.textContent = enabled ? '🔊' : '🔇';
    }
  }

  // --- Turn Indicator & Status Banner ---
  function updateTurnBanner() {
    if (isGameOver) return;

    turnDisc.className = 'turn-disc-indicator';

    if (currentPlayer === 1) {
      turnDisc.classList.add('p1-turn');
      statusText.textContent = gameMode === 'ai' ? "Your Turn (Cyan)" : "Player 1's Turn (Cyan)";
      statusText.style.color = '#00f0ff';
    } else {
      turnDisc.classList.add('p2-turn');
      if (gameMode === 'ai') {
        statusText.textContent = "Computer Thinking...";
        statusText.style.color = '#ec4899';
      } else {
        statusText.textContent = "Player 2's Turn (Pink)";
        statusText.style.color = '#ec4899';
      }
    }

    // Update column drop buttons enabled state
    const dropButtons = dropIndicators.querySelectorAll('.drop-col-btn');
    dropButtons.forEach((btn, col) => {
      btn.disabled = isGameOver || isAiThinking || getLowestEmptyRow(board, col) === -1;
    });

    undoBtn.disabled = moveHistory.length === 0 || isAiThinking;
  }

  // --- Board Grid Initialization & DOM Rendering ---
  function initBoardDOM() {
    boardGrid.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'c4-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `Row ${r + 1}, Column ${c + 1}`);

        // Click / Touch on cell drops into that column
        cell.addEventListener('click', () => {
          handleColumnSelect(c);
        });

        // Hover effect for the whole column
        cell.addEventListener('mouseenter', () => {
          highlightColumn(c, true);
        });
        cell.addEventListener('mouseleave', () => {
          highlightColumn(c, false);
        });

        boardGrid.appendChild(cell);
      }
    }
  }

  function highlightColumn(col, isHover) {
    if (isGameOver || isAiThinking) return;
    const cells = boardGrid.querySelectorAll(`[data-col="${col}"]`);
    cells.forEach(cell => {
      if (isHover) {
        cell.classList.add('col-hover');
      } else {
        cell.classList.remove('col-hover');
      }
    });
  }

  // --- Board State Logic ---
  function createEmptyBoard() {
    const b = [];
    for (let r = 0; r < ROWS; r++) {
      b.push(new Array(COLS).fill(0));
    }
    return b;
  }

  function getLowestEmptyRow(b, col) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (b[r][col] === 0) return r;
    }
    return -1; // Column full
  }

  function startNewRound() {
    board = createEmptyBoard();
    currentPlayer = 1;
    isGameOver = false;
    isAiThinking = false;
    moveHistory = [];

    // Clear DOM discs
    const cells = boardGrid.querySelectorAll('.c4-cell');
    cells.forEach(cell => {
      cell.innerHTML = '';
    });

    resultOverlay.classList.add('hidden');
    updateTurnBanner();
    updateScoreboardUI();
    playUiClick();
  }

  // --- Disc Drop Action ---
  function handleColumnSelect(col) {
    if (isGameOver || isAiThinking) return;
    if (gameMode === 'ai' && currentPlayer !== 1) return;

    makeMove(col);
  }

  function makeMove(col) {
    const row = getLowestEmptyRow(board, col);
    if (row === -1) return false; // Column is full

    // Update board state
    board[row][col] = currentPlayer;
    moveHistory.push({ row, col, player: currentPlayer });

    // Render animated disc in DOM
    const targetCell = boardGrid.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (targetCell) {
      const disc = document.createElement('div');
      disc.className = `c4-disc ${currentPlayer === 1 ? 'cyan-disc' : 'pink-disc'}`;
      // Drop distance based on landing row
      const dropDistance = -((row + 1) * 65);
      disc.style.setProperty('--drop-offset', `${dropDistance}px`);
      targetCell.appendChild(disc);
    }

    playDropSound(row);
    updateScoreboardUI();

    // Check for win
    const winResult = checkWin(board);
    if (winResult) {
      handleWin(winResult);
      return true;
    }

    // Check for draw
    if (isBoardFull(board)) {
      handleDraw();
      return true;
    }

    // Switch turns
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    updateTurnBanner();

    // Trigger AI move if in vs Computer mode
    if (gameMode === 'ai' && currentPlayer === 2 && !isGameOver) {
      triggerAiMove();
    }

    return true;
  }

  // --- Win & Draw Checking ---
  function checkWin(b) {
    // 1. Horizontal Check
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const p = b[r][c];
        if (p !== 0 && p === b[r][c + 1] && p === b[r][c + 2] && p === b[r][c + 3]) {
          return {
            player: p,
            cells: [{ r, c }, { r, c: c + 1 }, { r, c: c + 2 }, { r, c: c + 3 }]
          };
        }
      }
    }

    // 2. Vertical Check
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = b[r][c];
        if (p !== 0 && p === b[r + 1][c] && p === b[r + 2][c] && p === b[r + 3][c]) {
          return {
            player: p,
            cells: [{ r, c }, { r: r + 1, c }, { r: r + 2, c }, { r: r + 3, c }]
          };
        }
      }
    }

    // 3. Diagonal Down-Right Check (\)
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const p = b[r][c];
        if (p !== 0 && p === b[r + 1][c + 1] && p === b[r + 2][c + 2] && p === b[r + 3][c + 3]) {
          return {
            player: p,
            cells: [{ r, c }, { r: r + 1, c: c + 1 }, { r: r + 2, c: c + 2 }, { r: r + 3, c: c + 3 }]
          };
        }
      }
    }

    // 4. Diagonal Up-Right Check (/)
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const p = b[r][c];
        if (p !== 0 && p === b[r - 1][c + 1] && p === b[r - 2][c + 2] && p === b[r - 3][c + 3]) {
          return {
            player: p,
            cells: [{ r, c }, { r: r - 1, c: c + 1 }, { r: r - 2, c: c + 2 }, { r: r - 3, c: c + 3 }]
          };
        }
      }
    }

    return null;
  }

  function isBoardFull(b) {
    for (let c = 0; c < COLS; c++) {
      if (b[0][c] === 0) return false;
    }
    return true;
  }

  function handleWin(winResult) {
    isGameOver = true;
    undoBtn.disabled = true;

    // Highlight the 4 winning discs
    winResult.cells.forEach(({ r, c }) => {
      const cell = boardGrid.querySelector(`[data-row="${r}"][data-col="${c}"]`);
      if (cell) {
        const disc = cell.querySelector('.c4-disc');
        if (disc) disc.classList.add('winning-disc');
      }
    });

    // Update tallies
    let winnerName = '';
    if (winResult.player === 1) {
      p1Wins++;
      winnerName = gameMode === 'ai' ? 'You (Player 1)' : 'Player 1 (Cyan)';
      statusText.textContent = `${winnerName} Wins! 🎉`;
      statusText.style.color = '#00f0ff';
    } else {
      p2Wins++;
      winnerName = gameMode === 'ai' ? 'Computer' : 'Player 2 (Pink)';
      statusText.textContent = `${winnerName} Wins! 🎉`;
      statusText.style.color = '#ec4899';
    }

    saveScores();
    updateScoreboardUI();
    playWinFanfare();

    // Show modal overlay after short celebration delay
    setTimeout(() => {
      modalWinnerVal.textContent = winnerName;
      modalWinnerVal.className = winResult.player === 1 ? 'cyan' : 'pink';
      modalMovesVal.textContent = moveHistory.length;
      modalP1WinsVal.textContent = p1Wins;
      modalP2WinsVal.textContent = p2Wins;

      resultIcon.textContent = winResult.player === 1 ? '🏆' : '🤖';
      resultTitle.textContent = winResult.player === 1 ? 'Victory!' : 'Round Over!';
      resultMessage.textContent = `${winnerName} aligned 4 connected discs in a row!`;
      resultBadge.textContent = '✨ Four Connected! ✨';

      resultOverlay.classList.remove('hidden');
    }, 850);
  }

  function handleDraw() {
    isGameOver = true;
    undoBtn.disabled = true;

    drawCount++;
    saveScores();
    updateScoreboardUI();
    playDrawSound();

    statusText.textContent = "It's a Draw! 🤝";
    statusText.style.color = '#fbbf24';

    setTimeout(() => {
      modalWinnerVal.textContent = 'Draw (Stalemate)';
      modalWinnerVal.className = 'gold';
      modalMovesVal.textContent = moveHistory.length;
      modalP1WinsVal.textContent = p1Wins;
      modalP2WinsVal.textContent = p2Wins;

      resultIcon.textContent = '🤝';
      resultTitle.textContent = 'Stalemate Draw!';
      resultMessage.textContent = 'The board is completely full with no four-in-a-row connections.';
      resultBadge.textContent = '⚡ Deadlock! ⚡';

      resultOverlay.classList.remove('hidden');
    }, 700);
  }

  // --- Undo Move Logic ---
  function undoMove() {
    if (isGameOver || isAiThinking || moveHistory.length === 0) return;

    if (gameMode === 'ai') {
      // Undo both AI and player moves
      const movesToUndo = moveHistory.length >= 2 ? 2 : 1;
      for (let i = 0; i < movesToUndo; i++) {
        const lastMove = moveHistory.pop();
        if (lastMove) {
          board[lastMove.row][lastMove.col] = 0;
          const cell = boardGrid.querySelector(`[data-row="${lastMove.row}"][data-col="${lastMove.col}"]`);
          if (cell) cell.innerHTML = '';
        }
      }
      currentPlayer = 1;
    } else {
      // 2-player mode: undo 1 move
      const lastMove = moveHistory.pop();
      if (lastMove) {
        board[lastMove.row][lastMove.col] = 0;
        const cell = boardGrid.querySelector(`[data-row="${lastMove.row}"][data-col="${lastMove.col}"]`);
        if (cell) cell.innerHTML = '';
        currentPlayer = lastMove.player;
      }
    }

    playUiClick();
    updateTurnBanner();
    updateScoreboardUI();
  }

  // --- AI Opponent Engine ---
  function triggerAiMove() {
    isAiThinking = true;
    updateTurnBanner();

    // Natural 350ms thinking delay
    setTimeout(() => {
      if (isGameOver || currentPlayer !== 2) {
        isAiThinking = false;
        return;
      }

      const bestCol = computeAiMove(aiDifficulty);
      isAiThinking = false;
      if (bestCol !== null && bestCol !== undefined) {
        makeMove(bestCol);
      }
    }, 380);
  }

  function computeAiMove(diff) {
    const validCols = [];
    for (let c = 0; c < COLS; c++) {
      if (getLowestEmptyRow(board, c) !== -1) validCols.push(c);
    }
    if (validCols.length === 0) return null;

    // --- Easy AI: 35% chance tactical, otherwise random ---
    if (diff === 'easy') {
      if (Math.random() < 0.35) {
        const winMove = findImmediateWinningMove(board, 2);
        if (winMove !== null) return winMove;
        const blockMove = findImmediateWinningMove(board, 1);
        if (blockMove !== null) return blockMove;
      }
      return validCols[Math.floor(Math.random() * validCols.length)];
    }

    // --- Medium AI: Blocks/Wins 100%, prefers center ---
    if (diff === 'medium') {
      // 1. Can AI win immediately?
      const winMove = findImmediateWinningMove(board, 2);
      if (winMove !== null) return winMove;

      // 2. Can Player 1 win immediately? Block!
      const blockMove = findImmediateWinningMove(board, 1);
      if (blockMove !== null) return blockMove;

      // 3. Prefer center columns: 3, 2, 4, 1, 5, 0, 6
      const centerOrder = [3, 2, 4, 1, 5, 0, 6];
      for (const col of centerOrder) {
        if (validCols.includes(col)) {
          // Verify move doesn't give human an immediate winning spot above it
          const row = getLowestEmptyRow(board, col);
          if (row > 0) {
            board[row][col] = 2;
            const humanCanWinAbove = canPlayerWin(board, row - 1, col, 1);
            board[row][col] = 0;
            if (humanCanWinAbove) continue; // Avoid giving opponent the win!
          }
          return col;
        }
      }

      return validCols[0];
    }

    // --- Hard AI: Minimax with Alpha-Beta Pruning (Depth 5) ---
    let bestScore = -Infinity;
    let chosenCol = validCols[0];
    const centerOrder = [3, 2, 4, 1, 5, 0, 6].filter(c => validCols.includes(c));

    for (const c of centerOrder) {
      const r = getLowestEmptyRow(board, c);
      board[r][c] = 2; // AI move
      const scoreVal = minimax(board, 4, -Infinity, Infinity, false);
      board[r][c] = 0;

      if (scoreVal > bestScore) {
        bestScore = scoreVal;
        chosenCol = c;
      }
    }

    return chosenCol;
  }

  function findImmediateWinningMove(b, player) {
    for (let c = 0; c < COLS; c++) {
      const r = getLowestEmptyRow(b, c);
      if (r !== -1) {
        b[r][c] = player;
        const win = checkWin(b);
        b[r][c] = 0;
        if (win && win.player === player) return c;
      }
    }
    return null;
  }

  function canPlayerWin(b, r, c, player) {
    b[r][c] = player;
    const win = checkWin(b);
    b[r][c] = 0;
    return win && win.player === player;
  }

  // --- Minimax with Alpha-Beta Pruning ---
  function minimax(b, depth, alpha, beta, isMaximizing) {
    const win = checkWin(b);
    if (win) {
      return win.player === 2 ? 10000 + depth : -10000 - depth;
    }
    if (isBoardFull(b) || depth === 0) {
      return evaluateBoard(b);
    }

    const centerOrder = [3, 2, 4, 1, 5, 0, 6];

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const c of centerOrder) {
        const r = getLowestEmptyRow(b, c);
        if (r !== -1) {
          b[r][c] = 2;
          const evaluation = minimax(b, depth - 1, alpha, beta, false);
          b[r][c] = 0;
          maxEval = Math.max(maxEval, evaluation);
          alpha = Math.max(alpha, evaluation);
          if (beta <= alpha) break; // Pruning
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const c of centerOrder) {
        const r = getLowestEmptyRow(b, c);
        if (r !== -1) {
          b[r][c] = 1;
          const evaluation = minimax(b, depth - 1, alpha, beta, true);
          b[r][c] = 0;
          minEval = Math.min(minEval, evaluation);
          beta = Math.min(beta, evaluation);
          if (beta <= alpha) break; // Pruning
        }
      }
      return minEval;
    }
  }

  function evaluateBoard(b) {
    let totalScore = 0;

    // Center column control bonus
    for (let r = 0; r < ROWS; r++) {
      if (b[r][3] === 2) totalScore += 4;
      else if (b[r][3] === 1) totalScore -= 4;
    }

    // Evaluate 4-slot windows horizontally
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        totalScore += evaluateWindow([b[r][c], b[r][c + 1], b[r][c + 2], b[r][c + 3]]);
      }
    }

    // Vertically
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r <= ROWS - 4; r++) {
        totalScore += evaluateWindow([b[r][c], b[r + 1][c], b[r + 2][c], b[r + 3][c]]);
      }
    }

    // Diagonals
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        totalScore += evaluateWindow([b[r][c], b[r + 1][c + 1], b[r + 2][c + 2], b[r + 3][c + 3]]);
      }
    }
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        totalScore += evaluateWindow([b[r][c], b[r - 1][c + 1], b[r - 2][c + 2], b[r - 3][c + 3]]);
      }
    }

    return totalScore;
  }

  function evaluateWindow(window) {
    let aiCount = 0;
    let humanCount = 0;
    let emptyCount = 0;

    for (const val of window) {
      if (val === 2) aiCount++;
      else if (val === 1) humanCount++;
      else emptyCount++;
    }

    let scoreVal = 0;
    if (aiCount === 3 && emptyCount === 1) scoreVal += 60;
    else if (aiCount === 2 && emptyCount === 2) scoreVal += 12;

    if (humanCount === 3 && emptyCount === 1) scoreVal -= 90; // Defend!
    else if (humanCount === 2 && emptyCount === 2) scoreVal -= 15;

    return scoreVal;
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Drop Arrow Buttons
    const dropButtons = dropIndicators.querySelectorAll('.drop-col-btn');
    dropButtons.forEach((btn, col) => {
      btn.addEventListener('click', () => {
        handleColumnSelect(col);
      });
      btn.addEventListener('mouseenter', () => {
        highlightColumn(col, true);
      });
      btn.addEventListener('mouseleave', () => {
        highlightColumn(col, false);
      });
    });

    // Mode Toggle
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const selectedMode = btn.dataset.mode;
        if (selectedMode === gameMode) return;

        gameMode = selectedMode;
        modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === gameMode));
        diffRow.style.display = gameMode === 'ai' ? 'flex' : 'none';

        startNewRound();
      });
    });

    // Difficulty Toggle
    diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const selectedDiff = btn.dataset.diff;
        if (selectedDiff === aiDifficulty) return;

        aiDifficulty = selectedDiff;
        diffButtons.forEach(b => b.classList.toggle('active', b.dataset.diff === aiDifficulty));

        startNewRound();
      });
    });

    // Action Buttons
    newRoundBtn.addEventListener('click', () => {
      startNewRound();
    });

    undoBtn.addEventListener('click', () => {
      undoMove();
    });

    resetScoreBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all win records?')) {
        resetAllScores();
      }
    });

    playAgainBtn.addEventListener('click', () => {
      startNewRound();
    });

    // Sound toggle
    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', () => {
        if (window.playZoneAudio) {
          window.playZoneAudio.toggle();
        } else {
          const current = localStorage.getItem(SOUND_KEY) !== 'disabled';
          localStorage.setItem(SOUND_KEY, current ? 'disabled' : 'enabled');
        }
        updateSoundUI();
      });
    }

    // Keyboard Shortcuts (1-7 to drop in columns 1-7, U to undo, N to new round)
    window.addEventListener('keydown', (e) => {
      if (e.key >= '1' && e.key <= '7') {
        const col = parseInt(e.key, 10) - 1;
        handleColumnSelect(col);
      } else if (e.code === 'KeyU') {
        undoMove();
      } else if (e.code === 'KeyN' || e.code === 'KeyR') {
        startNewRound();
      }
    });
  }

  // --- Initialization ---
  function init() {
    board = createEmptyBoard();
    loadScores();
    initBoardDOM();
    updateTurnBanner();
    updateSoundUI();
    setupEventListeners();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
