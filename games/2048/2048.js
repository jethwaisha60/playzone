/**
 * PlayZone - 2048 Puzzle
 * Complete game logic: sliding/merging engine, score tracking, touch swipe detection,
 * Web Audio integration, undo state, and responsive tile rendering.
 */

(function () {
  'use strict';

  // 1. Constants & Configuration
  const GRID_SIZE = 4;
  const STORAGE_KEY_BEST = 'playzone_score_2048';
  const STORAGE_KEY_STATE = 'playzone_state_2048';

  // 2. DOM Elements
  const boardContainer = document.getElementById('boardContainer');
  const tileLayer = document.getElementById('tileLayer');
  const currentScoreEl = document.getElementById('currentScore');
  const bestScoreEl = document.getElementById('bestScore');
  const scoreAddEl = document.getElementById('scoreAdd');
  const undoBtn = document.getElementById('undoBtn');
  const newGameBtn = document.getElementById('newGameBtn');

  // Modals & Overlays
  const winOverlay = document.getElementById('winOverlay');
  const winScoreVal = document.getElementById('winScoreVal');
  const winBestVal = document.getElementById('winBestVal');
  const keepGoingBtn = document.getElementById('keepGoingBtn');
  const winRestartBtn = document.getElementById('winRestartBtn');

  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const finalScoreVal = document.getElementById('finalScoreVal');
  const finalBestVal = document.getElementById('finalBestVal');
  const newBestBadge = document.getElementById('newBestBadge');
  const retryBtn = document.getElementById('retryBtn');

  // Sound Toggle
  const soundToggleBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const soundLabel = soundToggleBtn.querySelector('.btn-label');

  // Virtual D-Pad
  const dpadUp = document.getElementById('dpadUp');
  const dpadDown = document.getElementById('dpadDown');
  const dpadLeft = document.getElementById('dpadLeft');
  const dpadRight = document.getElementById('dpadRight');

  // 3. Game State
  let grid = [];
  let score = 0;
  let bestScore = 0;
  let won = false;
  let keepPlaying = false;
  let isGameOver = false;
  let previousState = null; // For Undo
  let newlySpawnedTile = null; // Coordinates { r, c }
  let mergedPositions = []; // Array of { r, c }

  /**
   * Sound Helpers using window.playZoneAudio
   */
  function playSound(type, extra = 0) {
    if (!window.playZoneAudio || !window.playZoneAudio.enabled) return;

    switch (type) {
      case 'move':
        if (typeof window.playZoneAudio.playTone === 'function') {
          window.playZoneAudio.playTone(380, 'sine', 0.04, 0.08);
        }
        break;
      case 'merge':
        if (typeof window.playZoneAudio.playTone === 'function') {
          // Dynamic pitch rising with tile value
          const baseFreq = 480;
          const pitchBonus = Math.min(600, Math.log2(Math.max(4, extra)) * 45);
          window.playZoneAudio.playTone(baseFreq + pitchBonus, 'triangle', 0.08, 0.16);
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
   * Initialize Grid & State
   */
  function initGame() {
    loadBestScore();
    updateSoundUI();

    // Check if saved state exists in localStorage
    const savedStateJSON = localStorage.getItem(STORAGE_KEY_STATE);
    let stateLoaded = false;

    if (savedStateJSON) {
      try {
        const savedState = JSON.parse(savedStateJSON);
        if (savedState && Array.isArray(savedState.grid) && savedState.grid.length === GRID_SIZE) {
          grid = savedState.grid;
          score = savedState.score || 0;
          won = !!savedState.won;
          keepPlaying = !!savedState.keepPlaying;
          stateLoaded = true;
        }
      } catch (e) {
        stateLoaded = false;
      }
    }

    if (!stateLoaded) {
      startFreshGame();
    } else {
      updateScoreboard(0);
      renderBoard();
      checkGameStatus();
    }

    attachEventListeners();
  }

  function startFreshGame() {
    grid = createEmptyGrid();
    score = 0;
    won = false;
    keepPlaying = false;
    isGameOver = false;
    previousState = null;
    undoBtn.disabled = true;

    hideOverlays();
    spawnRandomTile();
    spawnRandomTile();

    updateScoreboard(0);
    renderBoard();
    saveState();
  }

  function createEmptyGrid() {
    const matrix = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      matrix.push(new Array(GRID_SIZE).fill(0));
    }
    return matrix;
  }

  function cloneGrid(sourceGrid) {
    return sourceGrid.map(row => [...row]);
  }

  function loadBestScore() {
    const saved = localStorage.getItem(STORAGE_KEY_BEST);
    bestScore = saved ? parseInt(saved, 10) || 0 : 0;
    bestScoreEl.textContent = bestScore;
  }

  function saveState() {
    if (isGameOver) {
      localStorage.removeItem(STORAGE_KEY_STATE);
      return;
    }
    const stateObj = {
      grid,
      score,
      won,
      keepPlaying
    };
    try {
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(stateObj));
    } catch (e) {
      // Ignore if localStorage quota exceeded
    }
  }

  function spawnRandomTile() {
    const emptyCells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === 0) {
          emptyCells.push({ r, c });
        }
      }
    }

    if (emptyCells.length === 0) return false;

    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const cell = emptyCells[randomIndex];
    const value = Math.random() < 0.9 ? 2 : 4;
    grid[cell.r][cell.c] = value;
    newlySpawnedTile = { r: cell.r, c: cell.c };
    return true;
  }

  /**
   * Responsive Board Rendering
   */
  function renderBoard() {
    tileLayer.innerHTML = '';

    const layerRect = tileLayer.getBoundingClientRect();
    const layerWidth = layerRect.width;
    const gap = window.innerWidth <= 480 ? 8 : 12;
    const tileSize = (layerWidth - (GRID_SIZE - 1) * gap) / GRID_SIZE;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = grid[r][c];
        if (val === 0) continue;

        const tileEl = document.createElement('div');
        tileEl.className = 'tile';
        tileEl.setAttribute('data-val', val);

        // Digit length styling for font-size scaling
        const digitCount = val.toString().length;
        tileEl.classList.add(`digits-${Math.min(5, digitCount)}`);

        // Check animations
        if (newlySpawnedTile && newlySpawnedTile.r === r && newlySpawnedTile.c === c) {
          tileEl.classList.add('tile-new');
        } else if (mergedPositions.some(pos => pos.r === r && pos.c === c)) {
          tileEl.classList.add('tile-merged');
        }

        const leftPos = c * (tileSize + gap);
        const topPos = r * (tileSize + gap);

        tileEl.style.width = `${tileSize}px`;
        tileEl.style.height = `${tileSize}px`;
        tileEl.style.left = `${leftPos}px`;
        tileEl.style.top = `${topPos}px`;
        tileEl.textContent = val;

        tileLayer.appendChild(tileEl);
      }
    }

    // Reset temporary animation markers
    newlySpawnedTile = null;
    mergedPositions = [];
  }

  /**
   * Scoreboard & Floating Animation
   */
  function updateScoreboard(addedPoints) {
    currentScoreEl.textContent = score;

    if (score > bestScore) {
      bestScore = score;
      bestScoreEl.textContent = bestScore;
      localStorage.setItem(STORAGE_KEY_BEST, bestScore.toString());
    }

    if (addedPoints > 0) {
      scoreAddEl.textContent = `+${addedPoints}`;
      scoreAddEl.classList.remove('hidden');
      scoreAddEl.style.animation = 'none';
      // Force DOM reflow to re-trigger CSS animation
      void scoreAddEl.offsetWidth;
      scoreAddEl.style.animation = 'floatScore 0.65s ease-out forwards';
    }
  }

  /**
   * Line Sliding & Merging Algorithm
   */
  function slideAndMergeRow(row) {
    const nonZeroes = row.filter(val => val !== 0);
    const result = [];
    let points = 0;
    const mergedIndices = [];

    let i = 0;
    while (i < nonZeroes.length) {
      if (i + 1 < nonZeroes.length && nonZeroes[i] === nonZeroes[i + 1]) {
        const mergedVal = nonZeroes[i] * 2;
        result.push(mergedVal);
        points += mergedVal;
        mergedIndices.push(result.length - 1);
        i += 2;
      } else {
        result.push(nonZeroes[i]);
        i += 1;
      }
    }

    while (result.length < GRID_SIZE) {
      result.push(0);
    }

    return { result, points, mergedIndices };
  }

  /**
   * Execute Move in specified direction ('up' | 'down' | 'left' | 'right')
   */
  function move(direction) {
    if (isGameOver) return;

    const previousGrid = cloneGrid(grid);
    const previousScore = score;

    let pointsEarned = 0;
    const newMergedPositions = [];
    let moved = false;

    if (direction === 'left') {
      for (let r = 0; r < GRID_SIZE; r++) {
        const line = grid[r];
        const { result, points, mergedIndices } = slideAndMergeRow(line);
        grid[r] = result;
        pointsEarned += points;
        mergedIndices.forEach(c => newMergedPositions.push({ r, c }));
      }
    } else if (direction === 'right') {
      for (let r = 0; r < GRID_SIZE; r++) {
        const reversedLine = [...grid[r]].reverse();
        const { result, points, mergedIndices } = slideAndMergeRow(reversedLine);
        grid[r] = result.reverse();
        pointsEarned += points;
        mergedIndices.forEach(cRev => newMergedPositions.push({ r, c: GRID_SIZE - 1 - cRev }));
      }
    } else if (direction === 'up') {
      for (let c = 0; c < GRID_SIZE; c++) {
        const colLine = [];
        for (let r = 0; r < GRID_SIZE; r++) {
          colLine.push(grid[r][c]);
        }
        const { result, points, mergedIndices } = slideAndMergeRow(colLine);
        for (let r = 0; r < GRID_SIZE; r++) {
          grid[r][c] = result[r];
        }
        pointsEarned += points;
        mergedIndices.forEach(r => newMergedPositions.push({ r, c }));
      }
    } else if (direction === 'down') {
      for (let c = 0; c < GRID_SIZE; c++) {
        const colLine = [];
        for (let r = GRID_SIZE - 1; r >= 0; r--) {
          colLine.push(grid[r][c]);
        }
        const { result, points, mergedIndices } = slideAndMergeRow(colLine);
        result.reverse();
        for (let r = 0; r < GRID_SIZE; r++) {
          grid[r][c] = result[r];
        }
        pointsEarned += points;
        mergedIndices.forEach(rRev => newMergedPositions.push({ r: GRID_SIZE - 1 - rRev, c }));
      }
    }

    // Verify if board state changed
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] !== previousGrid[r][c]) {
          moved = true;
          break;
        }
      }
      if (moved) break;
    }

    if (!moved) return;

    // Save previous state for Undo
    previousState = {
      grid: previousGrid,
      score: previousScore
    };
    undoBtn.disabled = false;

    // Update state & animation marks
    score += pointsEarned;
    mergedPositions = newMergedPositions;
    spawnRandomTile();

    // Audio feedback
    if (pointsEarned > 0) {
      playSound('merge', pointsEarned);
    } else {
      playSound('move');
    }

    updateScoreboard(pointsEarned);
    renderBoard();
    saveState();
    checkGameStatus();
  }

  /**
   * Undo Move
   */
  function handleUndo() {
    if (!previousState) return;
    playSound('click');

    grid = cloneGrid(previousState.grid);
    score = previousState.score;
    previousState = null;
    undoBtn.disabled = true;

    hideOverlays();
    isGameOver = false;

    updateScoreboard(0);
    renderBoard();
    saveState();
  }

  /**
   * Win & Game Over Condition Checks
   */
  function checkGameStatus() {
    // 1. Check for 2048 tile reached
    if (!won && !keepPlaying) {
      let reached2048 = false;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (grid[r][c] >= 2048) {
            reached2048 = true;
            break;
          }
        }
        if (reached2048) break;
      }

      if (reached2048) {
        won = true;
        showWinModal();
        playSound('win');
        return;
      }
    }

    // 2. Check for game over (no empty spaces and no adjacent equal values)
    if (!hasAvailableMoves()) {
      isGameOver = true;
      showGameOverModal();
      playSound('gameover');
      saveState();
    }
  }

  function hasAvailableMoves() {
    // Any empty cell?
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === 0) return true;
      }
    }

    // Any horizontal adjacent match?
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 1; c++) {
        if (grid[r][c] === grid[r][c + 1]) return true;
      }
    }

    // Any vertical adjacent match?
    for (let c = 0; c < GRID_SIZE; c++) {
      for (let r = 0; r < GRID_SIZE - 1; r++) {
        if (grid[r][c] === grid[r + 1][c]) return true;
      }
    }

    return false;
  }

  function showWinModal() {
    winScoreVal.textContent = score;
    winBestVal.textContent = bestScore;
    winOverlay.classList.remove('hidden');
  }

  function showGameOverModal() {
    finalScoreVal.textContent = score;
    finalBestVal.textContent = bestScore;

    if (score >= bestScore && score > 0) {
      newBestBadge.classList.remove('hidden');
    } else {
      newBestBadge.classList.add('hidden');
    }

    gameOverOverlay.classList.remove('hidden');
  }

  function hideOverlays() {
    winOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    newBestBadge.classList.add('hidden');
  }

  /**
   * Event Listeners & Input Handling
   */
  function attachEventListeners() {
    // 1. Keyboard Controls
    window.addEventListener('keydown', (e) => {
      // Prevent default scrolling with arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          move('up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          move('down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          move('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          move('right');
          break;
        case 'z':
        case 'Z':
          if (e.ctrlKey || e.metaKey) {
            handleUndo();
          }
          break;
        default:
          break;
      }
    });

    // 2. Touch Swipes on Game Board
    let touchStartX = 0;
    let touchStartY = 0;
    const SWIPE_THRESHOLD = 30;

    boardContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    boardContainer.addEventListener('touchmove', (e) => {
      // Prevent page scrolling while swiping on the 2048 board
      if (e.cancelable) {
        e.preventDefault();
      }
    }, { passive: false });

    boardContainer.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 0) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;
      const distance = Math.hypot(dx, dy);

      if (distance < SWIPE_THRESHOLD) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        if (dx > 0) {
          move('right');
        } else {
          move('left');
        }
      } else {
        // Vertical swipe
        if (dy > 0) {
          move('down');
        } else {
          move('up');
        }
      }
    }, { passive: true });

    // 3. Virtual Direction Buttons (D-Pad)
    dpadUp.addEventListener('click', () => move('up'));
    dpadDown.addEventListener('click', () => move('down'));
    dpadLeft.addEventListener('click', () => move('left'));
    dpadRight.addEventListener('click', () => move('right'));

    // 4. Action Buttons
    undoBtn.addEventListener('click', handleUndo);
    newGameBtn.addEventListener('click', () => {
      playSound('click');
      startFreshGame();
    });

    retryBtn.addEventListener('click', () => {
      playSound('click');
      startFreshGame();
    });

    winRestartBtn.addEventListener('click', () => {
      playSound('click');
      startFreshGame();
    });

    keepGoingBtn.addEventListener('click', () => {
      playSound('click');
      keepPlaying = true;
      winOverlay.classList.add('hidden');
      saveState();
    });

    // 5. Sound Toggle
    soundToggleBtn.addEventListener('click', () => {
      if (window.playZoneAudio && typeof window.playZoneAudio.toggle === 'function') {
        window.playZoneAudio.toggle();
        updateSoundUI();
      }
    });

    // 6. Window Resize Handler for responsive tile grid recalculations
    window.addEventListener('resize', () => {
      renderBoard();
    });
  }

  // Start when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }
})();
