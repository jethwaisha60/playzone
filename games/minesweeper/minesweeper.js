/**
 * PlayZone - Cyber Minesweeper
 * Classic 9x9 board with 10 hidden mines, first-click safety,
 * cascade flood-fill, mobile flag mode & long-press, chording,
 * Web Audio integration, and local high score persistence.
 */

(function () {
  'use strict';

  // 1. Constants & Configuration
  const ROWS = 9;
  const COLS = 9;
  const TOTAL_CELLS = ROWS * COLS; // 81
  const TOTAL_MINES = 10;
  const STORAGE_KEY_BEST = 'playzone_score_minesweeper';

  // 2. DOM Elements
  const minesGrid = document.getElementById('minesGrid');
  const minesLeftEl = document.getElementById('minesLeft');
  const timerDisplayEl = document.getElementById('timerDisplay');
  const bestScoreDisplayEl = document.getElementById('bestScoreDisplay');
  const faceBtn = document.getElementById('faceBtn');
  const faceIcon = document.getElementById('faceIcon');
  const flagModeToggleBtn = document.getElementById('flagModeToggleBtn');
  const flagModeLabel = document.getElementById('flagModeLabel');
  const newGameBtn = document.getElementById('newGameBtn');

  // Modals & Overlays
  const winOverlay = document.getElementById('winOverlay');
  const winTimeVal = document.getElementById('winTimeVal');
  const winBestVal = document.getElementById('winBestVal');
  const newBestBadge = document.getElementById('newBestBadge');
  const winPlayAgainBtn = document.getElementById('winPlayAgainBtn');
  const winViewBoardBtn = document.getElementById('winViewBoardBtn');

  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const finalTimeVal = document.getElementById('finalTimeVal');
  const finalBestVal = document.getElementById('finalBestVal');
  const retryBtn = document.getElementById('retryBtn');
  const loseViewBoardBtn = document.getElementById('loseViewBoardBtn');

  // Sound Toggle
  const soundToggleBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const soundLabel = soundToggleBtn.querySelector('.btn-label');

  // 3. Game State
  let board = [];
  let isFirstClick = true;
  let isGameOver = false;
  let isGameWon = false;
  let isFlagMode = false;
  let timerInterval = null;
  let elapsedSeconds = 0;
  let flagCount = 0;
  let bestTime = null;

  // Touch Long-Press tracking
  let touchTimer = null;
  let touchMoved = false;

  /**
   * Procedural Audio Helper using window.playZoneAudio
   */
  function playSound(type, extra = 0) {
    if (!window.playZoneAudio || !window.playZoneAudio.enabled) return;

    switch (type) {
      case 'reveal':
        if (typeof window.playZoneAudio.playTone === 'function') {
          // Dynamic pitch slightly higher if near more mines
          const freq = 480 + extra * 40;
          window.playZoneAudio.playTone(freq, 'sine', 0.04, 0.1);
        }
        break;
      case 'flag':
        if (typeof window.playZoneAudio.playTone === 'function') {
          window.playZoneAudio.playTone(850, 'triangle', 0.05, 0.15);
        }
        break;
      case 'unflag':
        if (typeof window.playZoneAudio.playTone === 'function') {
          window.playZoneAudio.playTone(420, 'triangle', 0.04, 0.12);
        }
        break;
      case 'chord':
        if (typeof window.playZoneAudio.playTone === 'function') {
          window.playZoneAudio.playTone(600, 'triangle', 0.05, 0.12);
        }
        break;
      case 'win':
        if (typeof window.playZoneAudio.playSuccess === 'function') {
          window.playZoneAudio.playSuccess();
        }
        break;
      case 'gameover':
        if (typeof window.playZoneAudio.playGameOver === 'function') {
          window.playZoneAudio.playGameOver();
        }
        break;
      case 'click':
        if (typeof window.playZoneAudio.playClick === 'function') {
          window.playZoneAudio.playClick();
        }
        break;
      default:
        break;
    }
  }

  function updateSoundUI() {
    if (!window.playZoneAudio) return;
    const isEnabled = window.playZoneAudio.enabled;
    soundIcon.textContent = isEnabled ? '🔊' : '🔇';
    soundLabel.textContent = isEnabled ? 'Sound' : 'Muted';
  }

  /**
   * Load Saved Personal Best Record
   */
  function loadBestScore() {
    const saved = localStorage.getItem(STORAGE_KEY_BEST);
    if (saved) {
      bestTime = parseInt(saved, 10);
      bestScoreDisplayEl.textContent = `${bestTime}s`;
    } else {
      bestTime = null;
      bestScoreDisplayEl.textContent = '--';
    }
  }

  /**
   * Timer Utilities
   */
  function startTimer() {
    stopTimer();
    elapsedSeconds = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      elapsedSeconds++;
      if (elapsedSeconds > 999) {
        elapsedSeconds = 999;
        stopTimer();
      }
      updateTimerDisplay();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateTimerDisplay() {
    const formatted = String(elapsedSeconds).padStart(3, '0');
    timerDisplayEl.textContent = formatted;
  }

  function updateMinesCounter() {
    const remaining = TOTAL_MINES - flagCount;
    if (remaining < 0) {
      minesLeftEl.textContent = `-${String(Math.abs(remaining)).padStart(2, '0')}`;
    } else {
      minesLeftEl.textContent = String(remaining).padStart(3, '0');
    }
  }

  /**
   * Initialize a Fresh 9x9 Board
   */
  function initGame() {
    stopTimer();
    elapsedSeconds = 0;
    updateTimerDisplay();

    isFirstClick = true;
    isGameOver = false;
    isGameWon = false;
    flagCount = 0;
    updateMinesCounter();

    faceIcon.textContent = '😊';
    hideOverlays();

    board = [];
    minesGrid.innerHTML = '';

    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const cellData = {
          row: r,
          col: c,
          isMine: false,
          neighborMines: 0,
          isRevealed: false,
          isFlagged: false,
          el: null
        };

        const cellEl = document.createElement('div');
        cellEl.className = 'ms-cell';
        cellEl.setAttribute('data-row', r);
        cellEl.setAttribute('data-col', c);
        cellEl.setAttribute('role', 'gridcell');
        cellEl.setAttribute('aria-label', `Cell ${r + 1}, ${c + 1}`);

        // Attach DOM reference
        cellData.el = cellEl;
        minesGrid.appendChild(cellEl);
        row.push(cellData);
      }
      board.push(row);
    }
  }

  /**
   * Place Mines After First Safe Click
   * Reserves the first-clicked cell and ideally its 3x3 surrounding cluster
   * so the player always gets a clean, safe opening pocket.
   */
  function plantMines(firstR, firstC) {
    const safeCoords = new Set();

    // Mark 3x3 region around first click as safe
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = firstR + dr;
        const nc = firstC + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          safeCoords.add(`${nr},${nc}`);
        }
      }
    }

    // Collect all candidates outside the reserved safe pocket
    let candidates = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!safeCoords.has(`${r},${c}`)) {
          candidates.push({ r, c });
        }
      }
    }

    // Fallback: If not enough candidates, just protect the clicked cell itself
    if (candidates.length < TOTAL_MINES) {
      candidates = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (r !== firstR || c !== firstC) {
            candidates.push({ r, c });
          }
        }
      }
    }

    // Shuffle candidates (Fisher-Yates)
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = candidates[i];
      candidates[i] = candidates[j];
      candidates[j] = temp;
    }

    // Plant the 10 mines
    for (let i = 0; i < TOTAL_MINES; i++) {
      const { r, c } = candidates[i];
      board[r][c].isMine = true;
    }

    // Calculate neighbor counts for all cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!board[r][c].isMine) {
          board[r][c].neighborMines = countNeighborMines(r, c);
        }
      }
    }
  }

  function countNeighborMines(r, c) {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          if (board[nr][nc].isMine) count++;
        }
      }
    }
    return count;
  }

  /**
   * Reveal Cell Logic with Cascade Flood-Fill
   */
  function revealCell(r, c) {
    if (isGameOver || isGameWon) return;

    const cell = board[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    // Handle First Click
    if (isFirstClick) {
      isFirstClick = false;
      plantMines(r, c);
      startTimer();
    }

    // Step on a Mine -> Defeat
    if (cell.isMine) {
      triggerGameOver(r, c);
      return;
    }

    // Safe Cell: Reveal
    cell.isRevealed = true;
    cell.el.classList.add('revealed');

    if (cell.neighborMines > 0) {
      cell.el.textContent = cell.neighborMines;
      cell.el.setAttribute('data-count', cell.neighborMines);
      playSound('reveal', cell.neighborMines);
    } else {
      // 0 neighbor mines -> Recursive Cascade Flood-Fill
      playSound('reveal', 0);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            revealCell(nr, nc);
          }
        }
      }
    }

    checkWinCondition();
  }

  /**
   * Chording (Fast Reveal Around Number)
   * If a revealed number cell's surrounding flag count matches its clue,
   * reveal all remaining adjacent unflagged cells.
   */
  function chordCell(r, c) {
    if (isGameOver || isGameWon) return;

    const cell = board[r][c];
    if (!cell.isRevealed || cell.neighborMines === 0) return;

    let adjacentFlags = 0;
    const neighbors = [];

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          const neighbor = board[nr][nc];
          if (neighbor.isFlagged) {
            adjacentFlags++;
          } else if (!neighbor.isRevealed) {
            neighbors.push(neighbor);
          }
        }
      }
    }

    if (adjacentFlags === cell.neighborMines && neighbors.length > 0) {
      playSound('chord');
      neighbors.forEach(n => revealCell(n.row, n.col));
    }
  }

  /**
   * Toggle Flag on Cell
   */
  function toggleFlag(r, c) {
    if (isGameOver || isGameWon) return;

    const cell = board[r][c];
    if (cell.isRevealed) return;

    cell.isFlagged = !cell.isFlagged;
    if (cell.isFlagged) {
      cell.el.classList.add('flagged');
      flagCount++;
      playSound('flag');
    } else {
      cell.el.classList.remove('flagged');
      flagCount--;
      playSound('unflag');
    }

    updateMinesCounter();
  }

  /**
   * Check Victory Condition
   * Player wins if all 71 safe cells are revealed
   */
  function checkWinCondition() {
    let revealedSafeCount = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c].isRevealed && !board[r][c].isMine) {
          revealedSafeCount++;
        }
      }
    }

    if (revealedSafeCount === TOTAL_CELLS - TOTAL_MINES) {
      triggerVictory();
    }
  }

  /**
   * Victory Handler
   */
  function triggerVictory() {
    isGameWon = true;
    stopTimer();
    faceIcon.textContent = '😎';

    // Auto-flag all remaining unflagged mines
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c].isMine && !board[r][c].isFlagged) {
          board[r][c].isFlagged = true;
          board[r][c].el.classList.add('flagged');
        }
      }
    }
    flagCount = TOTAL_MINES;
    updateMinesCounter();

    playSound('win');

    // Check & save personal record
    const isNewRecord = bestTime === null || elapsedSeconds < bestTime;
    if (isNewRecord) {
      bestTime = elapsedSeconds;
      localStorage.setItem(STORAGE_KEY_BEST, String(bestTime));
      bestScoreDisplayEl.textContent = `${bestTime}s`;
      newBestBadge.classList.remove('hidden');
    } else {
      newBestBadge.classList.add('hidden');
    }

    winTimeVal.textContent = `${elapsedSeconds}s`;
    winBestVal.textContent = `${bestTime}s`;
    winOverlay.classList.remove('hidden');
  }

  /**
   * Defeat Handler
   */
  function triggerGameOver(hitR, hitC) {
    isGameOver = true;
    stopTimer();
    faceIcon.textContent = '😵';

    // Mark the triggered mine
    board[hitR][hitC].el.classList.add('mine-hit');

    // Reveal all remaining mines and highlight misflags
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c];
        if (cell.isMine) {
          if (!cell.isFlagged && (r !== hitR || c !== hitC)) {
            cell.el.classList.add('mine-revealed');
          }
        } else if (cell.isFlagged) {
          // Flagged a safe cell -> Misflag
          cell.el.classList.remove('flagged');
          cell.el.classList.add('misflagged');
        }
      }
    }

    playSound('gameover');

    finalTimeVal.textContent = `${elapsedSeconds}s`;
    finalBestVal.textContent = bestTime !== null ? `${bestTime}s` : '--';
    gameOverOverlay.classList.remove('hidden');
  }

  function hideOverlays() {
    winOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
  }

  /**
   * Event Listeners & Input Handling
   */
  function attachEventListeners() {
    // 1. Grid Click & Chording
    minesGrid.addEventListener('click', (e) => {
      const cellEl = e.target.closest('.ms-cell');
      if (!cellEl) return;

      const r = parseInt(cellEl.getAttribute('data-row'), 10);
      const c = parseInt(cellEl.getAttribute('data-col'), 10);

      const cell = board[r][c];

      // If already revealed and has a number, attempt chording
      if (cell.isRevealed && cell.neighborMines > 0) {
        chordCell(r, c);
        return;
      }

      // If mobile flag mode is ON, toggle flag
      if (isFlagMode) {
        toggleFlag(r, c);
      } else {
        revealCell(r, c);
      }
    });

    // 2. Right Click (Desktop Flagging)
    minesGrid.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const cellEl = e.target.closest('.ms-cell');
      if (!cellEl) return;

      const r = parseInt(cellEl.getAttribute('data-row'), 10);
      const c = parseInt(cellEl.getAttribute('data-col'), 10);
      toggleFlag(r, c);
    });

    // 3. Face Expression on Mouse/Touch Down
    minesGrid.addEventListener('mousedown', (e) => {
      if (isGameOver || isGameWon) return;
      const cellEl = e.target.closest('.ms-cell');
      if (cellEl && !cellEl.classList.contains('revealed')) {
        faceIcon.textContent = '😮';
      }
    });

    window.addEventListener('mouseup', () => {
      if (!isGameOver && !isGameWon) {
        faceIcon.textContent = '😊';
      }
    });

    // 4. Touch Long-Press Flagging for Mobile
    minesGrid.addEventListener('touchstart', (e) => {
      const cellEl = e.target.closest('.ms-cell');
      if (!cellEl) return;

      touchMoved = false;
      const r = parseInt(cellEl.getAttribute('data-row'), 10);
      const c = parseInt(cellEl.getAttribute('data-col'), 10);

      // Long press duration (380ms)
      touchTimer = setTimeout(() => {
        if (!touchMoved && !isGameOver && !isGameWon) {
          toggleFlag(r, c);
          // Vibrate if supported
          if (navigator.vibrate) {
            navigator.vibrate(40);
          }
        }
      }, 380);
    }, { passive: true });

    minesGrid.addEventListener('touchmove', () => {
      touchMoved = true;
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    }, { passive: true });

    minesGrid.addEventListener('touchend', () => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
      if (!isGameOver && !isGameWon) {
        faceIcon.textContent = '😊';
      }
    }, { passive: true });

    // 5. Flag Mode Toggle Button (Mobile-friendly)
    flagModeToggleBtn.addEventListener('click', () => {
      playSound('click');
      isFlagMode = !isFlagMode;
      if (isFlagMode) {
        flagModeToggleBtn.classList.add('active');
        flagModeLabel.textContent = 'Flag: ON';
      } else {
        flagModeToggleBtn.classList.remove('active');
        flagModeLabel.textContent = 'Flag: OFF';
      }
    });

    // 6. Action / Restart Buttons
    faceBtn.addEventListener('click', () => {
      playSound('click');
      initGame();
    });

    newGameBtn.addEventListener('click', () => {
      playSound('click');
      initGame();
    });

    retryBtn.addEventListener('click', () => {
      playSound('click');
      initGame();
    });

    winPlayAgainBtn.addEventListener('click', () => {
      playSound('click');
      initGame();
    });

    // 7. View Field (Hide Overlay Temporarily)
    winViewBoardBtn.addEventListener('click', () => {
      playSound('click');
      winOverlay.classList.add('hidden');
    });

    loseViewBoardBtn.addEventListener('click', () => {
      playSound('click');
      gameOverOverlay.classList.add('hidden');
    });

    // 8. Sound Toggle
    soundToggleBtn.addEventListener('click', () => {
      if (window.playZoneAudio && typeof window.playZoneAudio.toggle === 'function') {
        window.playZoneAudio.toggle();
        updateSoundUI();
      }
    });
  }

  // Initial Load
  document.addEventListener('DOMContentLoaded', () => {
    loadBestScore();
    updateSoundUI();
    initGame();
    attachEventListeners();
  });
})();
