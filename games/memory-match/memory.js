/**
 * PlayZone - Memory Flip Game Engine
 * Features: Easy/Med/Hard modes, 3D CSS flips, Moves & Timer, Best Score saving, Audio FX.
 */

(function () {
  'use strict';

  // 1. Arcade Card Symbols Pool
  const SYMBOL_POOL = [
    '🚀', '💎', '👾', '⚡', '🔮', '🌟', 
    '🎯', '🪐', '🕹️', '👑', '🔥', '🛸'
  ];

  // 2. Difficulty Configurations
  const DIFFICULTY_CONFIG = {
    easy: {
      pairs: 4,
      gridClass: 'grid-easy',
      starThresholds: [6, 9] // <= 6 moves = 3 stars, <= 9 moves = 2 stars
    },
    medium: {
      pairs: 6,
      gridClass: 'grid-medium',
      starThresholds: [9, 13]
    },
    hard: {
      pairs: 8,
      gridClass: 'grid-hard',
      starThresholds: [12, 18]
    }
  };

  const GLOBAL_STORAGE_KEY = 'playzone_score_memory';

  // 3. DOM Elements
  const memoryGrid = document.getElementById('memoryGrid');
  const timerDisplay = document.getElementById('timerDisplay');
  const movesDisplay = document.getElementById('movesDisplay');
  const matchesDisplay = document.getElementById('matchesDisplay');
  const bestTimeDisplay = document.getElementById('bestTimeDisplay');
  const difficultyTabs = document.querySelectorAll('.diff-tab');

  // Control Buttons
  const restartBtn = document.getElementById('restartBtn');
  const newGameBtn = document.getElementById('newGameBtn');
  const soundToggleBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const soundLabel = soundToggleBtn.querySelector('.btn-label');

  // Victory Modal Elements
  const winModal = document.getElementById('winModal');
  const winSubtitle = document.getElementById('winSubtitle');
  const starRating = document.getElementById('starRating');
  const finalTimeVal = document.getElementById('finalTimeVal');
  const finalMovesVal = document.getElementById('finalMovesVal');
  const finalBestVal = document.getElementById('finalBestVal');
  const newBestBadge = document.getElementById('newBestBadge');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const nextDiffBtn = document.getElementById('nextDiffBtn');

  // 4. Game State
  let currentDifficulty = 'easy';
  let cards = [];
  let flippedCards = [];
  let matchedPairsCount = 0;
  let moves = 0;
  let timerSeconds = 0;
  let timerInterval = null;
  let gameStarted = false;
  let isBoardLocked = false;

  // 5. Sound Effects using PlayZone Audio Engine
  function playSound(type) {
    if (!window.playZoneAudio || !window.playZoneAudio.enabled) return;

    switch (type) {
      case 'flip':
        window.playZoneAudio.playTone(520, 'sine', 0.05, 0.12);
        break;
      case 'match':
        // Ascending pleasant chord
        window.playZoneAudio.playTone(600, 'triangle', 0.08, 0.16);
        setTimeout(() => {
          window.playZoneAudio.playTone(850, 'triangle', 0.14, 0.2);
        }, 60);
        break;
      case 'mismatch':
        window.playZoneAudio.playTone(220, 'sawtooth', 0.09, 0.1);
        break;
      case 'win':
        window.playZoneAudio.playSuccess();
        break;
      case 'click':
        window.playZoneAudio.playClick();
        break;
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

  // 6. Best Score Helpers
  function getDiffStorageKey(diff) {
    return `playzone_score_memory_${diff}`;
  }

  function getBestTimeForDiff(diff) {
    const saved = localStorage.getItem(getDiffStorageKey(diff));
    return saved ? parseInt(saved, 10) : null;
  }

  function updateBestTimeUI() {
    const best = getBestTimeForDiff(currentDifficulty);
    bestTimeDisplay.textContent = best !== null ? `${best}s` : '--';
  }

  // 7. Timer Mechanics
  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timerSeconds++;
      timerDisplay.textContent = formatTime(timerSeconds);
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // 8. Board Setup & Card Generation
  function initGame() {
    updateSoundUI();
    updateBestTimeUI();
    setupBoard();
    setupEventListeners();
  }

  function setupBoard() {
    stopTimer();
    gameStarted = false;
    isBoardLocked = false;
    flippedCards = [];
    matchedPairsCount = 0;
    moves = 0;
    timerSeconds = 0;

    // Reset UI Counters
    timerDisplay.textContent = '00:00';
    movesDisplay.textContent = '0';
    const config = DIFFICULTY_CONFIG[currentDifficulty];
    matchesDisplay.textContent = `0 / ${config.pairs}`;
    updateBestTimeUI();

    // Set grid class
    memoryGrid.className = `memory-grid ${config.gridClass}`;
    memoryGrid.innerHTML = '';

    // Pick random symbols for this round
    const shuffledPool = [...SYMBOL_POOL].sort(() => Math.random() - 0.5);
    const selectedSymbols = shuffledPool.slice(0, config.pairs);

    // Create paired deck
    const deck = [...selectedSymbols, ...selectedSymbols];
    shuffleArray(deck);

    // Generate DOM Cards
    deck.forEach((symbol, index) => {
      const card = document.createElement('div');
      card.className = 'memory-card';
      card.setAttribute('data-symbol', symbol);
      card.setAttribute('data-index', index);
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'Memory card');

      card.innerHTML = `
        <div class="card-inner">
          <div class="card-back"></div>
          <div class="card-front">${symbol}</div>
        </div>
      `;

      card.addEventListener('click', () => handleCardClick(card));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick(card);
        }
      });

      memoryGrid.appendChild(card);
    });
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // 9. Card Click & Match Logic
  function handleCardClick(card) {
    // Prevent interaction if locked, already flipped, or already matched
    if (isBoardLocked) return;
    if (card.classList.contains('flipped') || card.classList.contains('matched')) return;

    // Start timer on first interaction
    if (!gameStarted) {
      gameStarted = true;
      startTimer();
    }

    // Flip this card
    playSound('flip');
    card.classList.add('flipped');
    flippedCards.push(card);

    // Check when two cards are flipped
    if (flippedCards.length === 2) {
      moves++;
      movesDisplay.textContent = moves;
      checkForMatch();
    }
  }

  function checkForMatch() {
    const [card1, card2] = flippedCards;
    const isMatch = card1.dataset.symbol === card2.dataset.symbol;

    if (isMatch) {
      handleMatch(card1, card2);
    } else {
      handleMismatch(card1, card2);
    }
  }

  function handleMatch(card1, card2) {
    playSound('match');
    card1.classList.add('matched');
    card2.classList.add('matched');

    matchedPairsCount++;
    const totalPairs = DIFFICULTY_CONFIG[currentDifficulty].pairs;
    matchesDisplay.textContent = `${matchedPairsCount} / ${totalPairs}`;

    flippedCards = [];

    // Check Victory Condition
    if (matchedPairsCount === totalPairs) {
      handleVictory();
    }
  }

  function handleMismatch(card1, card2) {
    isBoardLocked = true;
    setTimeout(() => {
      playSound('mismatch');
      card1.classList.remove('flipped');
      card2.classList.remove('flipped');
      flippedCards = [];
      isBoardLocked = false;
    }, 750);
  }

  // 10. Victory & High Score Handling
  function handleVictory() {
    stopTimer();
    playSound('win');

    const totalSeconds = timerSeconds;
    const currentBest = getBestTimeForDiff(currentDifficulty);
    const isNewBest = currentBest === null || totalSeconds < currentBest;

    if (isNewBest) {
      localStorage.setItem(getDiffStorageKey(currentDifficulty), totalSeconds);
      updateBestTimeUI();
      newBestBadge.classList.remove('hidden');
    } else {
      newBestBadge.classList.add('hidden');
    }

    // Safely update global best record for the PlayZone homepage:
    // Read the existing global best time and update ONLY if no record exists
    // or if the new time is strictly lower (faster).
    const savedGlobal = localStorage.getItem(GLOBAL_STORAGE_KEY);
    const existingGlobalBest = (savedGlobal !== null && !isNaN(parseInt(savedGlobal, 10)))
      ? parseInt(savedGlobal, 10)
      : null;

    if (existingGlobalBest === null || totalSeconds < existingGlobalBest) {
      localStorage.setItem(GLOBAL_STORAGE_KEY, totalSeconds);
    }

    // Populate Victory Modal Stats
    finalTimeVal.textContent = formatTime(totalSeconds);
    finalMovesVal.textContent = moves;
    const bestToDisplay = isNewBest ? totalSeconds : currentBest;
    finalBestVal.textContent = `${bestToDisplay}s`;

    // Star calculation
    const [threeStar, twoStar] = DIFFICULTY_CONFIG[currentDifficulty].starThresholds;
    let starsEarned = 1;
    if (moves <= threeStar) {
      starsEarned = 3;
      winSubtitle.textContent = 'Flawless visual memory! 🌟🌟🌟';
    } else if (moves <= twoStar) {
      starsEarned = 2;
      winSubtitle.textContent = 'Great memory skills! 🌟🌟';
    } else {
      starsEarned = 1;
      winSubtitle.textContent = 'Good effort! Can you beat it in fewer moves?';
    }

    renderStars(starsEarned);

    // Show next difficulty button only if not on Hard
    nextDiffBtn.style.display = currentDifficulty === 'hard' ? 'none' : 'inline-flex';

    setTimeout(() => {
      winModal.classList.remove('hidden');
    }, 450);
  }

  function renderStars(count) {
    starRating.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
      const star = document.createElement('span');
      star.className = `star ${i <= count ? 'filled' : ''}`;
      star.textContent = '★';
      starRating.appendChild(star);
    }
  }

  // 11. Event Listeners
  function setupEventListeners() {
    // Difficulty Tabs
    difficultyTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        playSound('click');
        difficultyTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentDifficulty = tab.dataset.difficulty;
        setupBoard();
      });
    });

    // Control Buttons
    restartBtn.addEventListener('click', () => {
      playSound('click');
      setupBoard();
    });

    newGameBtn.addEventListener('click', () => {
      playSound('click');
      setupBoard();
    });

    // Modal Actions
    playAgainBtn.addEventListener('click', () => {
      playSound('click');
      winModal.classList.add('hidden');
      setupBoard();
    });

    nextDiffBtn.addEventListener('click', () => {
      playSound('click');
      winModal.classList.add('hidden');
      if (currentDifficulty === 'easy') {
        currentDifficulty = 'medium';
      } else if (currentDifficulty === 'medium') {
        currentDifficulty = 'hard';
      }
      difficultyTabs.forEach(t => {
        t.classList.toggle('active', t.dataset.difficulty === currentDifficulty);
      });
      setupBoard();
    });

    // In-game Sound Toggle
    soundToggleBtn.addEventListener('click', () => {
      if (window.playZoneAudio) {
        window.playZoneAudio.toggle();
        updateSoundUI();
      }
    });
  }

  // Launch on DOM ready
  document.addEventListener('DOMContentLoaded', initGame);
})();
