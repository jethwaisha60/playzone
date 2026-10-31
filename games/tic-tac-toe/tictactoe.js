/**
 * PlayZone - Tic-Tac-Toe AI Engine
 * Features: Unbeatable Minimax AI, 2-Player mode, Symbol Selection,
 * Live Scoreboard, Audio FX, LocalStorage Persistence.
 */

(function () {
  'use strict';

  // 1. Constants & Winning Combinations
  const WINNING_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  const STORAGE_KEY_SCORE = 'playzone_score_tictactoe';
  const STORAGE_KEY_STATS = 'playzone_ttt_stats';

  // 2. DOM Elements
  const tttBoard = document.getElementById('tttBoard');
  const cells = document.querySelectorAll('.cell');
  const statusBanner = document.getElementById('statusBanner');
  const turnSymbol = document.getElementById('turnSymbol');
  const statusText = document.getElementById('statusText');

  // Mode & Setting Elements
  const modeButtons = document.querySelectorAll('#modeSelector .toggle-btn');
  const diffButtons = document.querySelectorAll('#difficultySelector .toggle-btn');
  const symbolButtons = document.querySelectorAll('#symbolSelector .toggle-btn');
  const difficultyRow = document.getElementById('difficultyRow');
  const symbolRow = document.getElementById('symbolRow');

  // Scoreboard Elements
  const xScoreLabel = document.getElementById('xScoreLabel');
  const oScoreLabel = document.getElementById('oScoreLabel');
  const xScoreDisplay = document.getElementById('xScoreDisplay');
  const oScoreDisplay = document.getElementById('oScoreDisplay');
  const drawsScoreDisplay = document.getElementById('drawsScoreDisplay');

  // Action Buttons
  const restartRoundBtn = document.getElementById('restartRoundBtn');
  const resetScoreBtn = document.getElementById('resetScoreBtn');
  const soundToggleBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const soundLabel = soundToggleBtn.querySelector('.btn-label');

  // Result Modal Elements
  const resultModal = document.getElementById('resultModal');
  const resultIcon = document.getElementById('resultIcon');
  const resultTitle = document.getElementById('resultTitle');
  const resultSubtitle = document.getElementById('resultSubtitle');
  const modalXScore = document.getElementById('modalXScore');
  const modalOScore = document.getElementById('modalOScore');
  const modalDraws = document.getElementById('modalDraws');
  const nextRoundBtn = document.getElementById('nextRoundBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');

  // 3. Application State
  let boardState = Array(9).fill('');
  let currentTurn = 'X'; // 'X' always goes first in Tic-Tac-Toe
  let gameMode = 'ai'; // 'ai' or 'pvp'
  let difficulty = 'hard'; // 'easy', 'medium', 'hard'
  let playerSymbol = 'X'; // Symbol chosen by human player in AI mode
  let isGameOver = false;
  let isBoardLocked = false;

  // Scores State
  let scores = {
    xWins: 0,
    oWins: 0,
    draws: 0,
    playerWins: 0
  };

  // 4. Safe Sound Helper using PlayZone Audio Engine
  function playSound(type) {
    if (!window.playZoneAudio || typeof window.playZoneAudio.enabled === 'undefined' || !window.playZoneAudio.enabled) {
      return;
    }

    try {
      switch (type) {
        case 'moveX':
          if (typeof window.playZoneAudio.playTone === 'function') {
            window.playZoneAudio.playTone(620, 'sine', 0.06, 0.14);
          }
          break;
        case 'moveO':
          if (typeof window.playZoneAudio.playTone === 'function') {
            window.playZoneAudio.playTone(440, 'triangle', 0.08, 0.14);
          }
          break;
        case 'win':
          if (typeof window.playZoneAudio.playSuccess === 'function') {
            window.playZoneAudio.playSuccess();
          }
          break;
        case 'lose':
          if (typeof window.playZoneAudio.playGameOver === 'function') {
            window.playZoneAudio.playGameOver();
          }
          break;
        case 'draw':
          if (typeof window.playZoneAudio.playTone === 'function') {
            window.playZoneAudio.playTone(392, 'sine', 0.1, 0.1);
            setTimeout(() => {
              window.playZoneAudio.playTone(330, 'sine', 0.18, 0.1);
            }, 100);
          }
          break;
        case 'click':
          if (typeof window.playZoneAudio.playClick === 'function') {
            window.playZoneAudio.playClick();
          }
          break;
      }
    } catch (e) {
      console.warn('Audio effect error:', e);
    }
  }

  function updateSoundUI() {
    if (!window.playZoneAudio) return;
    const isEnabled = window.playZoneAudio.enabled;
    soundIcon.textContent = isEnabled ? '🔊' : '🔇';
    if (soundLabel) {
      soundLabel.textContent = isEnabled ? 'Sound' : 'Muted';
    }
  }

  // 5. LocalStorage & Scoreboard Management
  function loadSavedScores() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATS);
      if (saved) {
        scores = JSON.parse(saved);
      } else {
        const legacyPlayerWins = parseInt(localStorage.getItem(STORAGE_KEY_SCORE), 10) || 0;
        scores.playerWins = legacyPlayerWins;
      }
    } catch (e) {
      console.warn('Error reading saved scores:', e);
    }
    updateScoreboardUI();
  }

  function saveScores() {
    try {
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(scores));
      // Keep playzone_score_tictactoe synced for homepage card (e.g. "X Wins")
      localStorage.setItem(STORAGE_KEY_SCORE, scores.playerWins);
    } catch (e) {
      console.warn('Error saving scores:', e);
    }
    updateScoreboardUI();
  }

  function updateScoreboardUI() {
    xScoreDisplay.textContent = scores.xWins;
    oScoreDisplay.textContent = scores.oWins;
    drawsScoreDisplay.textContent = scores.draws;

    // Update labels depending on game mode and picked symbol
    if (gameMode === 'ai') {
      if (playerSymbol === 'X') {
        xScoreLabel.textContent = 'You (X)';
        oScoreLabel.textContent = 'AI (O)';
      } else {
        xScoreLabel.textContent = 'AI (X)';
        oScoreLabel.textContent = 'You (O)';
      }
    } else {
      xScoreLabel.textContent = 'Player X';
      oScoreLabel.textContent = 'Player O';
    }
  }

  // 6. Game Initialization & Round Reset
  function initGame() {
    loadSavedScores();
    updateSoundUI();
    resetRound();
    setupEventListeners();
  }

  function resetRound() {
    boardState = Array(9).fill('');
    currentTurn = 'X';
    isGameOver = false;
    isBoardLocked = false;

    // Reset visual board
    cells.forEach(cell => {
      cell.textContent = '';
      cell.className = 'cell';
    });

    resultModal.classList.add('hidden');
    updateTurnIndicator();

    // If in AI mode and human chose O, AI (X) plays the first move!
    if (gameMode === 'ai' && playerSymbol === 'O') {
      isBoardLocked = true;
      statusText.textContent = 'AI is making the first move...';
      setTimeout(() => {
        if (!isGameOver) {
          executeAiTurn();
        }
      }, 500);
    }
  }

  function updateTurnIndicator() {
    if (isGameOver) return;

    turnSymbol.textContent = currentTurn === 'X' ? '✕' : '○';
    turnSymbol.className = `turn-symbol ${currentTurn === 'X' ? 'x-turn' : 'o-turn'}`;

    if (gameMode === 'ai') {
      if (currentTurn === playerSymbol) {
        statusText.textContent = 'Your Turn';
      } else {
        statusText.textContent = 'AI is thinking...';
      }
    } else {
      statusText.textContent = currentTurn === 'X' ? "Player X's Turn" : "Player O's Turn";
    }
  }

  // 7. Move Execution & Validation
  function handleCellClick(index) {
    if (isGameOver || isBoardLocked) return;
    if (boardState[index] !== '') return; // Cell already occupied

    // If it's AI mode, player can only move on their turn
    if (gameMode === 'ai' && currentTurn !== playerSymbol) return;

    makeMove(index, currentTurn);

    // If game continues and it's now AI's turn, trigger AI move
    if (!isGameOver && gameMode === 'ai' && currentTurn !== playerSymbol) {
      isBoardLocked = true;
      updateTurnIndicator();
      const delay = difficulty === 'hard' ? 380 : 420;
      setTimeout(() => {
        if (!isGameOver) {
          executeAiTurn();
        }
      }, delay);
    }
  }

  function makeMove(index, symbol) {
    boardState[index] = symbol;

    const cell = cells[index];
    cell.textContent = symbol === 'X' ? '✕' : '○';
    cell.classList.add(symbol.toLowerCase());
    cell.classList.add('disabled');

    playSound(symbol === 'X' ? 'moveX' : 'moveO');

    // Check for Win or Draw
    const winningCombo = checkWin(boardState, symbol);

    if (winningCombo) {
      handleGameOver(symbol, winningCombo);
      return;
    }

    if (checkDraw(boardState)) {
      handleGameOver('draw', null);
      return;
    }

    // Switch turn
    currentTurn = currentTurn === 'X' ? 'O' : 'X';
    updateTurnIndicator();
  }

  // 8. Win & Draw Checking
  function checkWin(board, symbol) {
    for (const combo of WINNING_COMBOS) {
      const [a, b, c] = combo;
      if (board[a] === symbol && board[b] === symbol && board[c] === symbol) {
        return combo;
      }
    }
    return null;
  }

  function checkDraw(board) {
    return board.every(cell => cell !== '');
  }

  // 9. Game Over & Result Presentation
  function handleGameOver(result, combo) {
    isGameOver = true;
    isBoardLocked = false;

    if (combo) {
      // Highlight winning row/col/diagonal
      combo.forEach(idx => {
        cells[idx].classList.add('winning-cell');
      });
    }

    if (result === 'draw') {
      scores.draws++;
      saveScores();
      playSound('draw');

      statusText.textContent = "It's a Draw!";
      resultIcon.textContent = '🤝';
      resultTitle.textContent = "It's a Draw!";
      resultSubtitle.textContent = 'Well fought! Neither side gave in.';
    } else {
      // Someone won (X or O)
      if (result === 'X') scores.xWins++;
      if (result === 'O') scores.oWins++;

      const isHumanWinner = (gameMode === 'ai' && result === playerSymbol) || (gameMode === 'pvp');
      const isAiWinner = (gameMode === 'ai' && result !== playerSymbol);

      if (gameMode === 'ai' && isHumanWinner) {
        scores.playerWins++;
      }
      saveScores();

      if (isAiWinner) {
        playSound('lose');
        statusText.textContent = 'AI Won!';
        resultIcon.textContent = '🤖';
        resultTitle.textContent = 'AI Takes the Win!';
        resultSubtitle.textContent = 'The machine saw all possible futures. Try again!';
      } else {
        playSound('win');
        statusText.textContent = `Player ${result} Won!`;
        resultIcon.textContent = '🏆';
        resultTitle.textContent = gameMode === 'ai' ? 'You Won!' : `Player ${result} Wins!`;
        resultSubtitle.textContent = `Three in a row! Masterful tactical play.`;
      }
    }

    // Populate modal stats
    modalXScore.textContent = scores.xWins;
    modalOScore.textContent = scores.oWins;
    modalDraws.textContent = scores.draws;

    // Show modal after slight delay so player can appreciate the winning strike
    setTimeout(() => {
      resultModal.classList.remove('hidden');
    }, 750);
  }

  // ===================================================================
  // 10. AI Implementations (Easy, Medium, Unbeatable Minimax)
  // ===================================================================
  function executeAiTurn() {
    isBoardLocked = false;
    const aiSymbol = playerSymbol === 'X' ? 'O' : 'X';
    let chosenIndex = null;

    if (difficulty === 'easy') {
      chosenIndex = getEasyMove();
    } else if (difficulty === 'medium') {
      chosenIndex = getMediumMove(aiSymbol, playerSymbol);
    } else {
      // Unbeatable Hard mode (Minimax)
      chosenIndex = getBestMinimaxMove(aiSymbol, playerSymbol);
    }

    if (chosenIndex !== null && chosenIndex >= 0) {
      makeMove(chosenIndex, aiSymbol);
    }
  }

  // Easy: Pure random valid move
  function getEasyMove() {
    const emptyIndices = getEmptyIndices(boardState);
    if (emptyIndices.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * emptyIndices.length);
    return emptyIndices[randomIndex];
  }

  // Medium: Heuristic / 70% smart move
  function getMediumMove(ai, human) {
    // 1. Can AI win right now? Take it!
    for (const combo of WINNING_COMBOS) {
      const spot = findWinningSpot(boardState, combo, ai);
      if (spot !== null) return spot;
    }

    // 2. Can Human win next turn? Block it!
    for (const combo of WINNING_COMBOS) {
      const spot = findWinningSpot(boardState, combo, human);
      if (spot !== null) return spot;
    }

    // 3. Take Center if available (50% chance)
    if (boardState[4] === '' && Math.random() < 0.6) {
      return 4;
    }

    // 4. Otherwise, pick randomly from remaining
    return getEasyMove();
  }

  function findWinningSpot(board, combo, symbol) {
    const [a, b, c] = combo;
    const values = [board[a], board[b], board[c]];
    const count = values.filter(v => v === symbol).length;
    const emptyCount = values.filter(v => v === '').length;

    if (count === 2 && emptyCount === 1) {
      if (board[a] === '') return a;
      if (board[b] === '') return b;
      if (board[c] === '') return c;
    }
    return null;
  }

  // Hard: Unbeatable Minimax Algorithm
  function getBestMinimaxMove(aiSymbol, humanSymbol) {
    const emptyIndices = getEmptyIndices(boardState);
    if (emptyIndices.length === 0) return null;

    // Fast-path: If entire board is empty, picking center or corner is optimal and instant
    if (emptyIndices.length === 9) {
      const openingMoves = [0, 2, 4, 6, 8];
      return openingMoves[Math.floor(Math.random() * openingMoves.length)];
    }

    let bestScore = -Infinity;
    let bestMove = emptyIndices[0];

    for (const index of emptyIndices) {
      boardState[index] = aiSymbol;
      const score = minimax(boardState, 0, false, aiSymbol, humanSymbol);
      boardState[index] = ''; // backtrack

      if (score > bestScore) {
        bestScore = score;
        bestMove = index;
      }
    }

    return bestMove;
  }

  function minimax(board, depth, isMaximizing, aiSymbol, humanSymbol) {
    // Terminal states check
    if (checkWin(board, aiSymbol)) return 10 - depth;
    if (checkWin(board, humanSymbol)) return depth - 10;
    if (checkDraw(board)) return 0;

    const emptySpots = getEmptyIndices(board);

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const index of emptySpots) {
        board[index] = aiSymbol;
        const score = minimax(board, depth + 1, false, aiSymbol, humanSymbol);
        board[index] = '';
        maxScore = Math.max(score, maxScore);
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (const index of emptySpots) {
        board[index] = humanSymbol;
        const score = minimax(board, depth + 1, true, aiSymbol, humanSymbol);
        board[index] = '';
        minScore = Math.min(score, minScore);
      }
      return minScore;
    }
  }

  function getEmptyIndices(board) {
    const empty = [];
    for (let i = 0; i < board.length; i++) {
      if (board[i] === '') empty.push(i);
    }
    return empty;
  }

  // ===================================================================
  // 11. Event Listeners & Controls
  // ===================================================================
  function setupEventListeners() {
    // 3x3 Grid Cells
    cells.forEach(cell => {
      const idx = parseInt(cell.dataset.index, 10);
      cell.addEventListener('click', () => handleCellClick(idx));
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCellClick(idx);
        }
      });
    });

    // Mode Toggle (vs AI / 2 Players)
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        playSound('click');
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameMode = btn.dataset.mode;

        // Hide/show AI-specific rows
        if (gameMode === 'pvp') {
          difficultyRow.style.display = 'none';
          symbolRow.style.display = 'none';
        } else {
          difficultyRow.style.display = 'flex';
          symbolRow.style.display = 'flex';
        }

        updateScoreboardUI();
        resetRound();
      });
    });

    // Difficulty Toggle (Easy, Medium, Hard)
    diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        playSound('click');
        diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
        resetRound();
      });
    });

    // Symbol Picker (Play as X or O)
    symbolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        playSound('click');
        symbolButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        playerSymbol = btn.dataset.symbol;
        updateScoreboardUI();
        resetRound();
      });
    });

    // Action Buttons
    restartRoundBtn.addEventListener('click', () => {
      playSound('click');
      resetRound();
    });

    resetScoreBtn.addEventListener('click', () => {
      playSound('click');
      if (confirm('Reset all scoreboard records for Tic-Tac-Toe?')) {
        scores = { xWins: 0, oWins: 0, draws: 0, playerWins: 0 };
        saveScores();
        resetRound();
      }
    });

    // Modal Actions
    nextRoundBtn.addEventListener('click', () => {
      playSound('click');
      resetRound();
    });

    closeModalBtn.addEventListener('click', () => {
      playSound('click');
      resultModal.classList.add('hidden');
    });

    // In-game Sound Toggle
    soundToggleBtn.addEventListener('click', () => {
      if (window.playZoneAudio && typeof window.playZoneAudio.toggle === 'function') {
        window.playZoneAudio.toggle();
        updateSoundUI();
      }
    });
  }

  // Initialize once DOM is ready
  document.addEventListener('DOMContentLoaded', initGame);
})();
