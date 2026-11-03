/**
 * PlayZone - Main Homepage Logic
 * Handles dynamic game rendering, category filtering, search, and sound interactions.
 */

// 1. Catalog of Mini-Games
const GAMES_CATALOG = [
  {
    id: 'snake',
    title: 'Neon Snake',
    category: 'arcade',
    badge: 'Classic',
    difficulty: 'Medium',
    icon: '🐍',
    description: 'Guide the glowing neon snake, eat cyber-orbs, grow longer, and avoid crashing into walls or yourself.',
    scoreKey: 'playzone_score_snake',
    scoreUnit: 'pts',
    path: 'games/snake/index.html'
  },
  {
    id: 'memory-match',
    title: 'Memory Flip',
    category: 'puzzle',
    badge: 'Brain',
    difficulty: 'Easy',
    icon: '🃏',
    description: 'Flip and match pairs of colorful arcade cards before the timer runs out. Test and train your visual memory.',
    scoreKey: 'playzone_score_memory',
    scoreUnit: 's',
    path: 'games/memory-match/index.html'
  },
  {
    id: 'tic-tac-toe',
    title: 'Tic-Tac-Toe AI',
    category: 'puzzle',
    badge: 'Popular',
    difficulty: 'Custom',
    icon: '⭕',
    description: 'Play the timeless Xs and Os showdown against an unbeatable AI or challenge a friend in 2-player local mode.',
    scoreKey: 'playzone_score_tictactoe',
    scoreUnit: 'wins',
    path: 'games/tic-tac-toe/index.html'
  },
  {
    id: 'reaction-timer',
    title: 'Reflex Speed Test',
    category: 'reflex',
    badge: 'Fast',
    difficulty: 'Hard',
    icon: '⚡',
    description: 'Wait for the signal to change color and click as fast as humanly possible. Discover your millisecond reaction speed.',
    scoreKey: 'playzone_score_reaction',
    scoreUnit: 'ms',
    path: 'games/reaction-timer/index.html'
  },
  {
    id: '2048',
    title: '2048 Puzzle',
    category: 'puzzle',
    badge: 'Logic',
    difficulty: 'Medium',
    icon: '🔢',
    description: 'Slide numbered tiles, merge matching numbers, and reach the 2048 tile in this addictive puzzle challenge.',
    scoreKey: 'playzone_score_2048',
    scoreUnit: 'pts',
    path: 'games/2048/index.html'
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    category: 'puzzle',
    badge: 'Logic',
    difficulty: 'Medium',
    icon: '💣',
    description: 'Find hidden mines, reveal safe cells, and use number clues to clear the board.',
    scoreKey: 'playzone_score_minesweeper',
    scoreUnit: 's',
    path: 'games/minesweeper/index.html'
  },
  {
    id: 'sudoku',
    title: 'Sudoku',
    category: 'puzzle',
    badge: 'Logic',
    difficulty: 'Medium',
    icon: '🔢',
    description: 'Complete the 9×9 Sudoku grid using logic, number clues, and careful thinking.',
    scoreKey: 'playzone_score_sudoku',
    scoreUnit: 's',
    path: 'games/sudoku/index.html'
  },
  {
    id: 'space-shooter',
    title: 'Space Shooter',
    category: 'arcade',
    badge: 'Action',
    difficulty: 'Medium',
    icon: '🚀',
    description: 'Pilot your spaceship, defeat enemy waves, collect power-ups, and protect the galaxy.',
    scoreKey: 'playzone_score_space_shooter',
    scoreUnit: 'pts',
    path: 'games/space-shooter/index.html'
  },
  {
    id: 'brick-breaker',
    title: 'Brick Breaker',
    category: 'arcade',
    badge: 'Action',
    difficulty: 'Medium',
    icon: '🧱',
    description: 'Bounce the ball, smash neon bricks, collect power-ups, and clear every level.',
    scoreKey: 'playzone_score_brick_breaker',
    scoreUnit: 'pts',
    path: 'games/brick-breaker/index.html'
  },
  {
    id: 'whack-a-mole',
    title: 'Whack-a-Mole',
    category: 'reflex',
    badge: 'Reaction',
    difficulty: 'Easy',
    icon: '🔨',
    description: 'Smash popping moles, catch golden bonuses, and avoid bombs in this fast reflex challenge.',
    scoreKey: 'playzone_score_whack_a_mole',
    scoreUnit: 'pts',
    path: 'games/whack-a-mole/index.html'
  },
  {
    id: 'flappy',
    title: 'Flappy Challenge',
    category: 'arcade',
    badge: 'Endless',
    difficulty: 'Easy',
    icon: '🐦',
    description: 'Fly through challenging pipe gaps, avoid obstacles, and beat your highest score.',
    scoreKey: 'playzone_score_flappy',
    scoreUnit: 'pts',
    path: 'games/flappy/index.html'
  },
  {
    id: 'connect-four',
    title: 'Connect Four',
    category: 'puzzle',
    badge: 'Strategy',
    difficulty: 'Medium',
    icon: '🔴',
    description: 'Drop colored discs, align four in a row, and outsmart your opponent or the AI.',
    scoreKey: 'playzone_score_connect_four',
    scoreUnit: 'wins',
    path: 'games/connect-four/index.html'
  },
  {
    id: 'word-guess',
    title: 'Word Guess',
    category: 'puzzle',
    badge: 'Brain Game',
    difficulty: 'Medium',
    icon: '🔤',
    description: 'Guess the hidden five-letter word in six attempts using color clues.',
    scoreKey: 'playzone_score_word_guess',
    scoreUnit: 'wins',
    path: 'games/word-guess/index.html'
  },
  {
    id: 'endless-runner',
    title: 'Endless Runner',
    category: 'arcade',
    badge: 'Endless',
    difficulty: 'Medium',
    icon: '🏃',
    description: 'Run through a neon world, dodge obstacles, collect coins, and beat your distance record.',
    scoreKey: 'playzone_score_endless_runner',
    scoreUnit: 'pts',
    path: 'games/endless-runner/index.html'
  }
];

// 2. Application State
let activeCategory = 'all';
let searchQuery = '';

// 3. DOM Elements
const gamesGrid = document.getElementById('gamesGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('gameSearch');
const clearSearchBtn = document.getElementById('clearSearch');
const filterTabs = document.querySelectorAll('.filter-tab');
const soundToggleBtn = document.getElementById('soundToggle');
const soundIcon = document.getElementById('soundIcon');
const soundLabel = soundToggleBtn.querySelector('.btn-label');
const randomGameBtn = document.getElementById('randomGameBtn');
const resetFilterBtn = document.getElementById('resetFilterBtn');
const totalGamesCount = document.getElementById('totalGamesCount');

// 4. Initialize Homepage
function init() {
  if (totalGamesCount) {
    totalGamesCount.textContent = GAMES_CATALOG.length;
  }
  updateSoundUI();
  renderGames();
  attachEventListeners();
}

/**
 * Format High Score display from LocalStorage
 */
function getHighScoreDisplay(game) {
  const savedScore = localStorage.getItem(game.scoreKey);
  if (!savedScore) {
    return 'Not Played';
  }
  if (game.scoreUnit === 'ms') {
    return `${savedScore} ms`;
  }
  if (game.scoreUnit === 's') {
    return `${savedScore}s`;
  }
  if (game.scoreUnit === 'wins') {
    return `${savedScore} Wins`;
  }
  return `${savedScore} pts`;
}

/**
 * Render game cards based on active filter and search query
 */
function renderGames() {
  gamesGrid.innerHTML = '';

  const filteredGames = GAMES_CATALOG.filter(game => {
    const matchesCategory = activeCategory === 'all' || game.category === activeCategory;
    const matchesSearch = game.title.toLowerCase().includes(searchQuery) ||
                          game.description.toLowerCase().includes(searchQuery) ||
                          game.category.toLowerCase().includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  if (filteredGames.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  filteredGames.forEach(game => {
    const card = document.createElement('article');
    card.className = 'game-card';
    card.setAttribute('data-category', game.category);

    const highScore = getHighScoreDisplay(game);

    card.innerHTML = `
      <div class="card-banner">
        <span class="card-badge">${game.badge}</span>
        <span class="card-difficulty">${game.difficulty}</span>
        <div class="card-icon">${game.icon}</div>
      </div>
      <div class="card-body">
        <h3 class="card-title">${game.title}</h3>
        <p class="card-desc">${game.description}</p>
        <div class="card-meta">
          <span class="meta-label">Best Record</span>
          <span class="high-score-val">${highScore}</span>
        </div>
        <a href="${game.path}" class="play-btn" data-game-id="${game.id}">
          <span>Play Now</span>
          <span class="play-arrow">➔</span>
        </a>
      </div>
    `;

    // Add audio feedback on card button hover and click
    const playBtn = card.querySelector('.play-btn');
    playBtn.addEventListener('mouseenter', () => {
      if (window.playZoneAudio && typeof window.playZoneAudio.playHover === 'function') {
        window.playZoneAudio.playHover();
      }
    });
    playBtn.addEventListener('click', () => {
      if (window.playZoneAudio && typeof window.playZoneAudio.playClick === 'function') {
        window.playZoneAudio.playClick();
      }
    });

    gamesGrid.appendChild(card);
  });
}

/**
 * Sync UI with Sound System State
 */
function updateSoundUI() {
  const isEnabled = window.playZoneAudio.enabled;
  soundIcon.textContent = isEnabled ? '🔊' : '🔇';
  soundLabel.textContent = isEnabled ? 'Sound On' : 'Muted';
}

/**
 * Attach UI event listeners
 */
function attachEventListeners() {
  // 1. Category tab click handler
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      window.playZoneAudio.playClick();
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategory = tab.dataset.category;
      renderGames();
    });
  });

  // 2. Real-time Search input handler
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    clearSearchBtn.style.display = searchQuery.length > 0 ? 'block' : 'none';
    renderGames();
  });

  // 3. Clear search button
  clearSearchBtn.addEventListener('click', () => {
    window.playZoneAudio.playClick();
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
    renderGames();
  });

  // 4. Reset filters button (from empty state)
  resetFilterBtn.addEventListener('click', () => {
    window.playZoneAudio.playClick();
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    activeCategory = 'all';
    filterTabs.forEach(t => t.classList.remove('active'));
    document.querySelector('.filter-tab[data-category="all"]').classList.add('active');
    renderGames();
  });

  // 5. Sound toggle button
  soundToggleBtn.addEventListener('click', () => {
    window.playZoneAudio.toggle();
    updateSoundUI();
  });

  // 6. Surprise Me / Random Game picker
  randomGameBtn.addEventListener('click', () => {
    window.playZoneAudio.playClick();
    const randomIndex = Math.floor(Math.random() * GAMES_CATALOG.length);
    const randomGame = GAMES_CATALOG[randomIndex];
    
    // Highlight the chosen card briefly
    const cards = document.querySelectorAll('.game-card');
    cards.forEach(card => card.style.outline = 'none');
    
    // Make sure it's visible in current view
    if (activeCategory !== 'all' && randomGame.category !== activeCategory) {
      activeCategory = 'all';
      filterTabs.forEach(t => t.classList.remove('active'));
      document.querySelector('.filter-tab[data-category="all"]').classList.add('active');
      renderGames();
    }

    const targetCard = Array.from(document.querySelectorAll('.card-title'))
      .find(el => el.textContent === randomGame.title)?.closest('.game-card');

    if (targetCard) {
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetCard.style.outline = '2px solid var(--neon-cyan)';
      targetCard.style.boxShadow = '0 0 30px rgba(0, 240, 255, 0.4)';
      setTimeout(() => {
        targetCard.style.outline = 'none';
        targetCard.style.boxShadow = '';
      }, 1500);
    }
  });
}

// Start on DOM ready
document.addEventListener('DOMContentLoaded', init);
