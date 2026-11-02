/**
 * PlayZone - Cyber Sudoku
 * Complete 9x9 Sudoku generator & solver engine:
 * - Easy, Medium, Hard procedural generation
 * - Pencil Notes drafting mode
 * - Undo, Erase, Hints, Conflict checks, Mistake tracker
 * - Cell & number cross-highlighting
 * - Web Audio API integration and local high score persistence
 */

(function () {
  'use strict';

  // 1. Constants & Configuration
  const GRID_SIZE = 9;
  const SUBGRID_SIZE = 3;
  const TOTAL_CELLS = 81;
  const STORAGE_KEY_BEST = 'playzone_score_sudoku';

  // Number of clues remaining per difficulty
  const DIFFICULTY_CLUES = {
    easy: 38,
    medium: 30,
    hard: 24
  };

  // 2. DOM Elements
  const sudokuGrid = document.getElementById('sudokuGrid');
  const timerDisplayEl = document.getElementById('timerDisplay');
  const mistakesDisplayEl = document.getElementById('mistakesDisplay');
  const bestScoreDisplayEl = document.getElementById('bestScoreDisplay');
  const difficultyTabs = document.querySelectorAll('.diff-tab');

  // Tools & Actions
  const undoBtn = document.getElementById('undoBtn');
  const eraseBtn = document.getElementById('eraseBtn');
  const notesToggleBtn = document.getElementById('notesToggleBtn');
  const notesLabel = document.getElementById('notesLabel');
  const hintBtn = document.getElementById('hintBtn');
  const hintLabel = document.getElementById('hintLabel');
  const keypad = document.getElementById('keypad');
  const restartBtn = document.getElementById('restartBtn');
  const newGameBtn = document.getElementById('newGameBtn');

  // Overlays
  const winOverlay = document.getElementById('winOverlay');
  const winTimeVal = document.getElementById('winTimeVal');
  const winMistakesVal = document.getElementById('winMistakesVal');
  const winBestVal = document.getElementById('winBestVal');
  const newBestBadge = document.getElementById('newBestBadge');
  const winPlayAgainBtn = document.getElementById('winPlayAgainBtn');
  const winViewBoardBtn = document.getElementById('winViewBoardBtn');

  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const finalTimeVal = document.getElementById('finalTimeVal');
  const finalDiffVal = document.getElementById('finalDiffVal');
  const keepSolvingBtn = document.getElementById('keepSolvingBtn');
  const retryBtn = document.getElementById('retryBtn');

  // Sound Toggle
  const soundToggleBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const soundLabel = soundToggleBtn.querySelector('.btn-label');

  // 3. Game State
  let board = [];
  let solutionGrid = [];
  let initialClues = [];
  let selectedCell = null; // { r, c }
  let currentDiff = 'medium';
  let isNotesMode = false;
  let mistakes = 0;
  let maxMistakes = 3;
  let hintsRemaining = 3;
  let undoStack = [];
  let timerInterval = null;
  let elapsedSeconds = 0;
  let isGameWon = false;
  let isGameOver = false;
  let bestTime = null;

  /**
   * Procedural Audio Helper using window.playZoneAudio
   */
  function playSound(type, extra = 0) {
    if (!window.playZoneAudio || !window.playZoneAudio.enabled) return;

    switch (type) {
      case 'select':
        if (typeof window.playZoneAudio.playTone === 'function') {
          window.playZoneAudio.playTone(420, 'sine', 0.03, 0.06);
        }
        break;
      case 'place':
        if (typeof window.playZoneAudio.playTone === 'function') {
          const freq = 480 + extra * 35;
          window.playZoneAudio.playTone(freq, 'triangle', 0.06, 0.14);
        }
        break;
      case 'note':
        if (typeof window.playZoneAudio.playTone === 'function') {
          window.playZoneAudio.playTone(750, 'sine', 0.03, 0.08);
        }
        break;
      case 'erase':
        if (typeof window.playZoneAudio.playTone === 'function') {
          window.playZoneAudio.playTone(320, 'sawtooth', 0.05, 0.1);
        }
        break;
      case 'error':
        if (typeof window.playZoneAudio.playTone === 'function') {
          window.playZoneAudio.playTone(180, 'sawtooth', 0.16, 0.2);
        }
        break;
      case 'hint':
        if (typeof window.playZoneAudio.playTone === 'function') {
          window.playZoneAudio.playTone(660, 'sine', 0.08, 0.15);
          setTimeout(() => {
            if (window.playZoneAudio && window.playZoneAudio.enabled) {
              window.playZoneAudio.playTone(990, 'triangle', 0.12, 0.18);
            }
          }, 80);
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
   * High Score Persistence
   */
  function loadBestScore() {
    const saved = localStorage.getItem(STORAGE_KEY_BEST);
    if (saved) {
      bestTime = parseInt(saved, 10);
      bestScoreDisplayEl.textContent = formatTime(bestTime);
    } else {
      bestTime = null;
      bestScoreDisplayEl.textContent = '--';
    }
  }

  /**
   * Timer Helpers
   */
  function formatTime(totalSecs) {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function startTimer() {
    stopTimer();
    elapsedSeconds = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      elapsedSeconds++;
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
    timerDisplayEl.textContent = formatTime(elapsedSeconds);
  }

  function updateMistakesDisplay() {
    mistakesDisplayEl.textContent = `${mistakes}/${maxMistakes}`;
  }

  /**
   * 4. Sudoku Puzzle Generation Engine
   */
  function create2DArray(rows, cols, val = 0) {
    return Array.from({ length: rows }, () => Array(cols).fill(val));
  }

  function isSafePlacement(grid, r, c, num) {
    // Check row
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[r][col] === num) return false;
    }
    // Check column
    for (let row = 0; row < GRID_SIZE; row++) {
      if (grid[row][c] === num) return false;
    }
    // Check 3x3 block
    const boxR = Math.floor(r / SUBGRID_SIZE) * SUBGRID_SIZE;
    const boxC = Math.floor(c / SUBGRID_SIZE) * SUBGRID_SIZE;
    for (let row = 0; row < SUBGRID_SIZE; row++) {
      for (let col = 0; col < SUBGRID_SIZE; col++) {
        if (grid[boxR + row][boxC + col] === num) return false;
      }
    }
    return true;
  }

  function fillDiagonalBoxes(grid) {
    for (let box = 0; box < GRID_SIZE; box += SUBGRID_SIZE) {
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
      let idx = 0;
      for (let r = 0; r < SUBGRID_SIZE; r++) {
        for (let c = 0; c < SUBGRID_SIZE; c++) {
          grid[box + r][box + c] = numbers[idx++];
        }
      }
    }
  }

  function solveSudokuBacktracking(grid) {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === 0) {
          const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          for (let i = 0; i < numbers.length; i++) {
            const num = numbers[i];
            if (isSafePlacement(grid, r, c, num)) {
              grid[r][c] = num;
              if (solveSudokuBacktracking(grid)) {
                return true;
              }
              grid[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  function generateFullSolution() {
    const grid = create2DArray(GRID_SIZE, GRID_SIZE, 0);
    fillDiagonalBoxes(grid);
    solveSudokuBacktracking(grid);
    return grid;
  }

  function createPuzzleFromSolution(solution, cluesCount) {
    const puzzle = solution.map(row => [...row]);
    const cellsToRemove = TOTAL_CELLS - cluesCount;

    const allPositions = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        allPositions.push({ r, c });
      }
    }
    allPositions.sort(() => Math.random() - 0.5);

    for (let i = 0; i < cellsToRemove; i++) {
      const { r, c } = allPositions[i];
      puzzle[r][c] = 0;
    }

    return puzzle;
  }

  /**
   * 5. Game Board Initialization
   */
  function startNewGame() {
    stopTimer();
    isGameWon = false;
    isGameOver = false;
    mistakes = 0;
    hintsRemaining = 3;
    undoStack = [];
    selectedCell = null;
    isNotesMode = false;
    notesToggleBtn.classList.remove('active');
    notesLabel.textContent = 'Notes: OFF';
    hintLabel.textContent = `Hint (${hintsRemaining})`;

    updateMistakesDisplay();
    hideOverlays();

    // 1. Generate solution & puzzle
    solutionGrid = generateFullSolution();
    const cluesCount = DIFFICULTY_CLUES[currentDiff] || 30;
    initialClues = createPuzzleFromSolution(solutionGrid, cluesCount);

    // 2. Build DOM & Data Model
    sudokuGrid.innerHTML = '';
    board = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      const row = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const clueVal = initialClues[r][c];
        const isGiven = clueVal !== 0;

        const cellData = {
          row: r,
          col: c,
          value: clueVal,
          solution: solutionGrid[r][c],
          isGiven: isGiven,
          notes: new Set(),
          isError: false,
          el: null
        };

        const cellEl = document.createElement('div');
        cellEl.className = 'sudoku-cell';
        cellEl.setAttribute('data-row', r);
        cellEl.setAttribute('data-col', c);
        cellEl.setAttribute('role', 'gridcell');

        if (isGiven) {
          cellEl.classList.add('given');
          cellEl.textContent = clueVal;
        }

        cellData.el = cellEl;
        sudokuGrid.appendChild(cellEl);
        row.push(cellData);
      }
      board.push(row);
    }

    startTimer();
    updateKeypadCompletedStatus();
  }

  /**
   * Restart Current Puzzle (reset to initial given clues)
   */
  function restartCurrentPuzzle() {
    stopTimer();
    isGameWon = false;
    isGameOver = false;
    mistakes = 0;
    undoStack = [];
    selectedCell = null;

    updateMistakesDisplay();
    hideOverlays();

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = board[r][c];
        if (!cell.isGiven) {
          cell.value = 0;
          cell.notes.clear();
          cell.isError = false;
          renderCell(cell);
        }
      }
    }

    clearHighlights();
    startTimer();
    updateKeypadCompletedStatus();
  }

  /**
   * Cell Rendering (Value or Notes)
   */
  function renderCell(cell) {
    cell.el.className = 'sudoku-cell';
    cell.el.innerHTML = '';

    if (cell.isGiven) {
      cell.el.classList.add('given');
      cell.el.textContent = cell.value;
      return;
    }

    if (cell.value !== 0) {
      cell.el.textContent = cell.value;
      if (cell.isError) {
        cell.el.classList.add('error');
      }
    } else if (cell.notes.size > 0) {
      // Render 3x3 Notes Grid
      const notesGrid = document.createElement('div');
      notesGrid.className = 'notes-grid';
      for (let n = 1; n <= 9; n++) {
        const noteEl = document.createElement('span');
        noteEl.className = 'note-num';
        noteEl.textContent = cell.notes.has(n) ? n : '';
        notesGrid.appendChild(noteEl);
      }
      cell.el.appendChild(notesGrid);
    }
  }

  /**
   * Selection & Dynamic Highlighting
   */
  function selectCell(r, c) {
    if (isGameOver || isGameWon) return;

    selectedCell = { r, c };
    clearHighlights();

    const currentCell = board[r][c];
    const targetValue = currentCell.value;

    // 1. Highlight related row, col, and 3x3 subgrid
    const boxR = Math.floor(r / SUBGRID_SIZE) * SUBGRID_SIZE;
    const boxC = Math.floor(c / SUBGRID_SIZE) * SUBGRID_SIZE;

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = board[row][col];
        const inSameRow = row === r;
        const inSameCol = col === c;
        const inSameBox = row >= boxR && row < boxR + SUBGRID_SIZE && col >= boxC && col < boxC + SUBGRID_SIZE;

        if (inSameRow || inSameCol || inSameBox) {
          cell.el.classList.add('related');
        }

        // 2. Highlight identical numbers across the board
        if (targetValue > 0 && cell.value === targetValue) {
          cell.el.classList.add('same-number');
        }
      }
    }

    // 3. Highlight selected cell
    currentCell.el.classList.add('selected');
    playSound('select');
  }

  function clearHighlights() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const el = board[r][c].el;
        el.classList.remove('selected', 'related', 'same-number');
      }
    }
  }

  /**
   * Number Input Handling (Keyboard or Keypad)
   */
  function inputNumber(num) {
    if (!selectedCell || isGameOver || isGameWon) return;

    const { r, c } = selectedCell;
    const cell = board[r][c];

    // Cannot modify given clues
    if (cell.isGiven) return;

    // Notes Mode Handling
    if (isNotesMode) {
      if (cell.value !== 0) return; // Cannot add notes to filled cell

      if (cell.notes.has(num)) {
        cell.notes.delete(num);
      } else {
        cell.notes.add(num);
      }
      renderCell(cell);
      selectCell(r, c); // Re-apply highlights
      playSound('note');
      return;
    }

    // Normal Input Mode
    if (cell.value === num) return;

    // Save previous state for Undo
    undoStack.push({
      r,
      c,
      prevVal: cell.value,
      newVal: num,
      prevNotes: new Set(cell.notes),
      newNotes: new Set(),
      prevError: cell.isError
    });

    cell.notes.clear();
    cell.value = num;

    // Conflict & Accuracy Check
    if (num !== cell.solution) {
      cell.isError = true;
      mistakes++;
      updateMistakesDisplay();
      playSound('error');

      if (mistakes >= maxMistakes) {
        triggerGameOver();
      }
    } else {
      cell.isError = false;
      playSound('place', num);

      // Auto-erase this number from notes in same row, col, and 3x3 block
      eraseNumberFromRelatedNotes(r, c, num);
    }

    renderCell(cell);
    selectCell(r, c);
    updateKeypadCompletedStatus();
    checkVictory();
  }

  function eraseNumberFromRelatedNotes(r, c, num) {
    const boxR = Math.floor(r / SUBGRID_SIZE) * SUBGRID_SIZE;
    const boxC = Math.floor(c / SUBGRID_SIZE) * SUBGRID_SIZE;

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const inSameRow = row === r;
        const inSameCol = col === c;
        const inSameBox = row >= boxR && row < boxR + SUBGRID_SIZE && col >= boxC && col < boxC + SUBGRID_SIZE;

        if (inSameRow || inSameCol || inSameBox) {
          const neighbor = board[row][col];
          if (neighbor.notes.has(num)) {
            neighbor.notes.delete(num);
            renderCell(neighbor);
          }
        }
      }
    }
  }

  /**
   * Erase Cell Value / Notes
   */
  function eraseSelectedCell() {
    if (!selectedCell || isGameOver || isGameWon) return;

    const { r, c } = selectedCell;
    const cell = board[r][c];

    if (cell.isGiven) return;
    if (cell.value === 0 && cell.notes.size === 0) return;

    undoStack.push({
      r,
      c,
      prevVal: cell.value,
      newVal: 0,
      prevNotes: new Set(cell.notes),
      newNotes: new Set(),
      prevError: cell.isError
    });

    cell.value = 0;
    cell.notes.clear();
    cell.isError = false;

    renderCell(cell);
    selectCell(r, c);
    updateKeypadCompletedStatus();
    playSound('erase');
  }

  /**
   * Undo Last Action
   */
  function handleUndo() {
    if (undoStack.length === 0 || isGameOver || isGameWon) return;

    const action = undoStack.pop();
    const cell = board[action.r][action.c];

    cell.value = action.prevVal;
    cell.notes = new Set(action.prevNotes);
    cell.isError = action.prevError || false;

    renderCell(cell);
    selectCell(action.r, action.c);
    updateKeypadCompletedStatus();
    playSound('click');
  }

  /**
   * Smart Hint Provider
   */
  function giveHint() {
    if (hintsRemaining <= 0 || isGameOver || isGameWon) return;

    let target = null;

    // 1. If currently selected cell is empty or incorrect, use it
    if (selectedCell) {
      const cell = board[selectedCell.r][selectedCell.c];
      if (!cell.isGiven && (cell.value === 0 || cell.value !== cell.solution)) {
        target = cell;
      }
    }

    // 2. Otherwise find the first empty or wrong cell
    if (!target) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const cell = board[r][c];
          if (!cell.isGiven && (cell.value === 0 || cell.value !== cell.solution)) {
            target = cell;
            break;
          }
        }
        if (target) break;
      }
    }

    if (!target) return;

    hintsRemaining--;
    hintLabel.textContent = `Hint (${hintsRemaining})`;

    target.value = target.solution;
    target.notes.clear();
    target.isError = false;
    eraseNumberFromRelatedNotes(target.row, target.col, target.solution);

    renderCell(target);
    selectCell(target.row, target.col);
    updateKeypadCompletedStatus();
    playSound('hint');
    checkVictory();
  }

  /**
   * Update Keypad Completed State (when all 9 numbers are placed correctly)
   */
  function updateKeypadCompletedStatus() {
    const counts = Array(10).fill(0);

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = board[r][c].value;
        if (val >= 1 && val <= 9 && board[r][c].value === board[r][c].solution) {
          counts[val]++;
        }
      }
    }

    const keypadBtns = keypad.querySelectorAll('.keypad-btn');
    keypadBtns.forEach(btn => {
      const num = parseInt(btn.getAttribute('data-number'), 10);
      if (counts[num] >= 9) {
        btn.classList.add('completed');
      } else {
        btn.classList.remove('completed');
      }
    });
  }

  /**
   * Check Victory Condition
   */
  function checkVictory() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (board[r][c].value !== board[r][c].solution) {
          return false;
        }
      }
    }

    triggerVictory();
    return true;
  }

  /**
   * Victory Handler
   */
  function triggerVictory() {
    isGameWon = true;
    stopTimer();
    playSound('win');

    const formattedTime = formatTime(elapsedSeconds);
    winTimeVal.textContent = formattedTime;
    winMistakesVal.textContent = `${mistakes}`;

    const isNewRecord = bestTime === null || elapsedSeconds < bestTime;
    if (isNewRecord) {
      bestTime = elapsedSeconds;
      localStorage.setItem(STORAGE_KEY_BEST, String(bestTime));
      bestScoreDisplayEl.textContent = formatTime(bestTime);
      newBestBadge.classList.remove('hidden');
    } else {
      newBestBadge.classList.add('hidden');
    }

    winBestVal.textContent = formatTime(bestTime);
    winOverlay.classList.remove('hidden');
  }

  /**
   * Game Over Handler
   */
  function triggerGameOver() {
    isGameOver = true;
    stopTimer();
    playSound('gameover');

    finalTimeVal.textContent = formatTime(elapsedSeconds);
    finalDiffVal.textContent = currentDiff.charAt(0).toUpperCase() + currentDiff.slice(1);
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
    // 1. Grid Cell Click
    sudokuGrid.addEventListener('click', (e) => {
      const cellEl = e.target.closest('.sudoku-cell');
      if (!cellEl) return;

      const r = parseInt(cellEl.getAttribute('data-row'), 10);
      const c = parseInt(cellEl.getAttribute('data-col'), 10);
      selectCell(r, c);
    });

    // 2. Physical Keyboard Controls
    window.addEventListener('keydown', (e) => {
      // Numbers 1 to 9
      if (e.key >= '1' && e.key <= '9') {
        inputNumber(parseInt(e.key, 10));
        return;
      }

      // Erase
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        eraseSelectedCell();
        return;
      }

      // Notes Mode Toggle ('N' or 'n')
      if (e.key === 'n' || e.key === 'N') {
        notesToggleBtn.click();
        return;
      }

      // Hint ('H' or 'h')
      if (e.key === 'h' || e.key === 'H') {
        giveHint();
        return;
      }

      // Undo (Ctrl+Z / Meta+Z)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Arrow Key Navigation
      if (selectedCell) {
        let { r, c } = selectedCell;
        if (e.key === 'ArrowUp' && r > 0) r--;
        else if (e.key === 'ArrowDown' && r < GRID_SIZE - 1) r++;
        else if (e.key === 'ArrowLeft' && c > 0) c--;
        else if (e.key === 'ArrowRight' && c < GRID_SIZE - 1) c++;
        else return;

        e.preventDefault();
        selectCell(r, c);
      }
    });

    // 3. On-Screen Keypad (1 to 9)
    keypad.addEventListener('click', (e) => {
      const btn = e.target.closest('.keypad-btn');
      if (!btn) return;
      const num = parseInt(btn.getAttribute('data-number'), 10);
      inputNumber(num);
    });

    // 4. Tools Actions
    undoBtn.addEventListener('click', handleUndo);
    eraseBtn.addEventListener('click', eraseSelectedCell);

    notesToggleBtn.addEventListener('click', () => {
      playSound('click');
      isNotesMode = !isNotesMode;
      if (isNotesMode) {
        notesToggleBtn.classList.add('active');
        notesLabel.textContent = 'Notes: ON';
      } else {
        notesToggleBtn.classList.remove('active');
        notesLabel.textContent = 'Notes: OFF';
      }
    });

    hintBtn.addEventListener('click', giveHint);

    // 5. Difficulty Tabs
    difficultyTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        playSound('click');
        difficultyTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentDiff = tab.getAttribute('data-diff');
        startNewGame();
      });
    });

    // 6. Action Buttons
    restartBtn.addEventListener('click', () => {
      playSound('click');
      restartCurrentPuzzle();
    });

    newGameBtn.addEventListener('click', () => {
      playSound('click');
      startNewGame();
    });

    retryBtn.addEventListener('click', () => {
      playSound('click');
      startNewGame();
    });

    winPlayAgainBtn.addEventListener('click', () => {
      playSound('click');
      startNewGame();
    });

    keepSolvingBtn.addEventListener('click', () => {
      playSound('click');
      gameOverOverlay.classList.add('hidden');
      isGameOver = false;
      maxMistakes = 999; // Unlimited mistakes for casual continue
      updateMistakesDisplay();
      startTimer();
    });

    winViewBoardBtn.addEventListener('click', () => {
      playSound('click');
      winOverlay.classList.add('hidden');
    });

    // 7. Sound Toggle
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
    startNewGame();
    attachEventListeners();
  });
})();
