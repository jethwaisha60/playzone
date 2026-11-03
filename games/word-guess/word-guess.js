/**
 * PlayZone - Neon Word Guess Game Engine
 * Wordle-style 5-letter puzzle with exact two-pass repeated letter evaluation,
 * procedural Web Audio API, difficulty word banks, and streak analytics.
 */

(function () {
  'use strict';

  // --- LocalStorage Keys ---
  const STORAGE_KEY_WINS = 'playzone_score_word_guess';
  const STORAGE_KEY_STREAK = 'playzone_word_guess_streak';
  const STORAGE_KEY_BEST_STREAK = 'playzone_word_guess_best_streak';
  const STORAGE_KEY_PLAYED = 'playzone_word_guess_played';
  const STORAGE_KEY_DIST = 'playzone_word_guess_dist';
  const SOUND_KEY = 'playzone_sound';

  const MAX_ATTEMPTS = 6;
  const WORD_LENGTH = 5;

  // --- Curated Word Banks ---
  const WORDS_EASY = [
    'APPLE', 'BEACH', 'BREAD', 'CHAIR', 'CLOCK', 'CLOUD', 'DANCE', 'DREAM',
    'EARTH', 'FRUIT', 'GLASS', 'GRAPE', 'GREEN', 'HEART', 'HOUSE', 'JUICE',
    'LEMON', 'LIGHT', 'MONEY', 'MUSIC', 'NIGHT', 'OCEAN', 'PAINT', 'PAPER',
    'PARTY', 'PEACE', 'PLANT', 'RIVER', 'SHIRT', 'SMILE', 'SNAKE', 'SPACE',
    'STONE', 'SUGAR', 'SWEET', 'TABLE', 'TIGER', 'TRAIN', 'WATER', 'WHITE',
    'WORLD', 'YOUTH', 'BLOOM', 'BRAVE', 'CANDY', 'CLEAN', 'CRANE', 'CROWN',
    'FLAME', 'FLASH', 'GIANT', 'HAPPY', 'LUCKY', 'MAGIC', 'PIZZA', 'POWER',
    'QUEEN', 'RADIO', 'SMART', 'STARS', 'STORM', 'SUNNY', 'TOWEL', 'TRACK',
    'VOICE', 'WATCH', 'WHEAT', 'ZEBRA', 'ACTOR', 'ANGEL', 'BROWN', 'CHEST',
    'CREAM', 'FRONT', 'HORSE', 'MOUSE', 'PLAZA', 'PRICE', 'SHINE', 'SKATE',
    'STAND', 'TRUCK', 'UNCLE', 'WHALE', 'WOMAN', 'YOUNG', 'BIRDY', 'CHILL'
  ];

  const WORDS_MEDIUM = [
    'ALERT', 'ALBUM', 'AMBER', 'ARROW', 'AUDIO', 'BLAZE', 'BLIND', 'BLOCK',
    'BOOST', 'BRAIN', 'BRICK', 'CABLE', 'CHAMP', 'CLIFF', 'CORAL', 'CRISP',
    'CYBER', 'DRIFT', 'DRIVE', 'EAGLE', 'FABLE', 'FIBER', 'FIELD', 'FLAIR',
    'FLOCK', 'FORGE', 'FROST', 'GHOST', 'GLIDE', 'GRAIN', 'GRILL', 'GUARD',
    'HOTEL', 'IMAGE', 'INDEX', 'JEWEL', 'KNIFE', 'LASER', 'LATCH', 'LEVER',
    'LODGE', 'LUNAR', 'MANGO', 'MEDAL', 'METAL', 'MODEL', 'MOTOR', 'NOBLE',
    'NORTH', 'NOVEL', 'ORBIT', 'PANEL', 'PHASE', 'PILOT', 'PIXEL', 'PRISM',
    'PULSE', 'QUEST', 'RADAR', 'RIDGE', 'ROBOT', 'RULER', 'SCALE', 'SCOPE',
    'SHARK', 'SHIELD', 'SOLAR', 'SPARK', 'SPEED', 'SWORD', 'TITAN', 'TORCH',
    'VALVE', 'VAULT', 'VIBES', 'VIVID', 'BLAST', 'CHASM', 'CLOAK', 'DRAKE',
    'EMBER', 'FLUTE', 'FORUM', 'HAVEN', 'HYDRA', 'MAPLE', 'NEXUS', 'ONYX'
  ];

  const WORDS_HARD = [
    'ABYSS', 'AFFIX', 'BAYOU', 'BLITZ', 'BUFFS', 'CHUMP', 'CLERK', 'CRYPT',
    'DIZZY', 'DWELT', 'EPOCH', 'EXPEL', 'FJORD', 'FLUFF', 'FOLLY', 'FUNKY',
    'GLYPH', 'GNOME', 'GRAVY', 'GUPPY', 'HAVOC', 'HYENA', 'IVORY', 'JAZZY',
    'JERKY', 'JOKER', 'JOUST', 'JUDGE', 'JUMBO', 'KAZOO', 'KIOSK', 'LYMPH',
    'MYTHS', 'NYMPH', 'ONION', 'OXIDE', 'OZONE', 'PHLOX', 'PIQUE', 'POPPY',
    'PROWL', 'PSALM', 'PUPPY', 'QUACK', 'QUAFF', 'QUIRK', 'RHYME', 'SHHY',
    'SLOTH', 'SNOOP', 'SPHINX', 'STIFF', 'SWAMP', 'TOXIC', 'UNIFY', 'VALET',
    'VAPOR', 'VORTEX', 'WALTZ', 'WRING', 'YACHT', 'ZEALOT', 'AGILE', 'AXIOM',
    'BEZEL', 'CLIQUE', 'DADDY', 'ENVOY', 'ETHOS', 'FERRY', 'FORTH', 'GAMMA',
    'GAUZE', 'GECKO', 'GUILD', 'HELIX', 'INBOX', 'KNEEL', 'MAXIM', 'MUMMY'
  ];

  // Extended valid guess dictionary (includes targets + common valid 5-letter words)
  const VALID_GUESSES = new Set([
    ...WORDS_EASY, ...WORDS_MEDIUM, ...WORDS_HARD,
    'ABOUT', 'ABOVE', 'ABUSE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN',
    'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALIEN', 'ALIKE', 'ALIVE', 'ALLOW',
    'ALONE', 'ALONG', 'ALTER', 'AMONG', 'ANGER', 'APPLY', 'ARENA', 'ARGUE',
    'ARISE', 'ARRAY', 'ASIDE', 'ASSET', 'AVOID', 'AWARD', 'AWARE', 'BADLY',
    'BAKER', 'BASES', 'BASIC', 'BASIS', 'BEAST', 'BEGAN', 'BEGIN', 'BEGUN',
    'BEING', 'BELOW', 'BENCH', 'BILLY', 'BIRTH', 'BLACK', 'BLAME', 'BLANK',
    'BLESS', 'BOBBY', 'BOUND', 'BOXES', 'BRAND', 'BRIEF', 'BRING', 'BROAD',
    'BUILD', 'BUILT', 'BUNCH', 'BURST', 'BUYER', 'CABIN', 'CANAL', 'CARRY',
    'CATCH', 'CAUSE', 'CHAIN', 'CHALK', 'CHAOS', 'CHARM', 'CHART', 'CHASE',
    'CHEAP', 'CHECK', 'CHEEK', 'CHEST', 'CHIEF', 'CHILD', 'CHOIR', 'CHOSE',
    'CIVIL', 'CLAIM', 'CLASS', 'CLEAR', 'CLICK', 'CLIMB', 'CLOSE', 'CLOTH',
    'COACH', 'COAST', 'COLOR', 'COUCH', 'COUNT', 'COURT', 'COVER', 'CRACK',
    'CRAFT', 'CRASH', 'CRAZY', 'CROSS', 'CROWD', 'CYCLE', 'DAILY', 'DELAY',
    'DELTA', 'DEPTH', 'DEVIL', 'DIRTY', 'DRAFT', 'DRAIN', 'DRAMA', 'DRAWN',
    'DRESS', 'DRINK', 'DRIVE', 'DYING', 'EARLY', 'EATEN', 'EMPTY', 'ENEMY',
    'ENJOY', 'ENTER', 'ENTRY', 'EQUAL', 'ERROR', 'EVENT', 'EVERY', 'EXACT',
    'EXIST', 'EXTRA', 'FAITH', 'FALSE', 'FAULT', 'FAVOR', 'FEAST', 'FIFTH',
    'FIFTY', 'FIGHT', 'FINAL', 'FIRST', 'FIXED', 'FLUID', 'FOCUS', 'FORCE',
    'FORTH', 'FORTY', 'FOUND', 'FRAME', 'FRANK', 'FRAUD', 'FRESH', 'FRONT',
    'GIVEN', 'GOING', 'GRACE', 'GRADE', 'GRAND', 'GRANT', 'GRASP', 'GRASS',
    'GREAT', 'GRIEF', 'GROUP', 'GROWN', 'GUESS', 'GUIDE', 'HABIT', 'HARSH',
    'HEAVY', 'HENCE', 'HONEY', 'HONOR', 'HUMAN', 'HURRY', 'IDEAL', 'ISSUE',
    'JAPAN', 'JOINT', 'JUDGE', 'KNOWN', 'LABEL', 'LABOR', 'LAYER', 'LEARN',
    'LEASE', 'LEAST', 'LEAVE', 'LEGAL', 'LEVEL', 'LIMIT', 'LOCAL', 'LOGIC',
    'LOOSE', 'LOVER', 'LOWER', 'LOYAL', 'LUNCH', 'MAJOR', 'MAKER', 'MARCH',
    'MATCH', 'MAYOR', 'MEANT', 'MIGHT', 'MINOR', 'MINUS', 'MIXED', 'MONTH',
    'MORAL', 'MOUNT', 'MOUTH', 'MOVIE', 'NAKED', 'NERVE', 'NEVER', 'NEWLY',
    'NOISE', 'NORTH', 'NOTED', 'NOVEL', 'NURSE', 'OCCUR', 'OFFER', 'OFTEN',
    'ORDER', 'OTHER', 'OUGHT', 'OUTER', 'OWNER', 'PANIC', 'PARK', 'PATCH',
    'PATIO', 'PHASE', 'PHONE', 'PHOTO', 'PIECE', 'PILOT', 'PITCH', 'PLACE',
    'PLAIN', 'PLANE', 'PLATE', 'POINT', 'POUND', 'PRESS', 'PRIDE', 'PRIME',
    'PRINT', 'PRIOR', 'PRIZE', 'PROOF', 'PROUD', 'PROVE', 'QUEEN', 'QUICK',
    'QUIET', 'QUITE', 'RAISE', 'RANGE', 'RAPID', 'RATIO', 'REACH', 'READY',
    'REALM', 'REBEL', 'REFER', 'RELAX', 'REPLY', 'RESET', 'RIDER', 'RIGHT',
    'ROUGH', 'ROUND', 'ROUTE', 'ROYAL', 'RURAL', 'SAUCE', 'SCALE', 'SCENE',
    'SCORE', 'SENSE', 'SERVE', 'SEVEN', 'SHALL', 'SHAME', 'SHAPE', 'SHARE',
    'SHARP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHOCK', 'SHOOT', 'SHORT',
    'SHOWN', 'SIGHT', 'SINCE', 'SIXTH', 'SIXTY', 'SIZED', 'SKILL', 'SLEEP',
    'SLICE', 'SLIDE', 'SMALL', 'SMOKE', 'SOLID', 'SOLVE', 'SORRY', 'SOUND',
    'SOUTH', 'SPARE', 'SPEAK', 'SPEND', 'SPLIT', 'SPORT', 'STAFF', 'STAGE',
    'STAKE', 'STAMP', 'START', 'STATE', 'STEAM', 'STEEL', 'STICK', 'STILL',
    'STOCK', 'STORY', 'STRIP', 'STUDY', 'STUFF', 'STYLE', 'SUITE', 'SUPER',
    'TAKEN', 'TASTE', 'TEACH', 'TEETH', 'THANK', 'THEFT', 'THEIR', 'THEME',
    'THERE', 'THESE', 'THICK', 'THING', 'THINK', 'THIRD', 'THOSE', 'THREE',
    'THREW', 'THROW', 'TIGHT', 'TIMES', 'TIRED', 'TITLE', 'TODAY', 'TOPIC',
    'TOTAL', 'TOUCH', 'TOUGH', 'TOWER', 'TOXIC', 'TRACE', 'TRADE', 'TRAIL',
    'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRICK', 'TRIP', 'TROOP', 'TRUCK',
    'TRULY', 'TRUTH', 'TWICE', 'UNDER', 'UNION', 'UNITY', 'UNTIL', 'UPPER',
    'UPSET', 'URBAN', 'USAGE', 'USUAL', 'VALID', 'VALUE', 'VIDEO', 'VIRUS',
    'VISIT', 'VITAL', 'WAGON', 'WASTE', 'WATCH', 'WAVE', 'WOUND', 'WRITE',
    'WRONG', 'YIELD', 'ZONES'
  ]);

  // --- Keyboard Rows Layout ---
  const KEYBOARD_LAYOUT = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
  ];

  // --- DOM Elements ---
  const wordGrid = document.getElementById('wordGrid');
  const toastContainer = document.getElementById('toastContainer');
  const kbRow1 = document.getElementById('kbRow1');
  const kbRow2 = document.getElementById('kbRow2');
  const kbRow3 = document.getElementById('kbRow3');

  const winsDisplay = document.getElementById('winsDisplay');
  const streakDisplay = document.getElementById('streakDisplay');
  const bestStreakDisplay = document.getElementById('bestStreakDisplay');
  const attemptDisplay = document.getElementById('attemptDisplay');

  const diffTabs = document.querySelectorAll('#difficultyTabs .diff-tab');
  const soundToggleBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const rulesBtn = document.getElementById('rulesBtn');
  const statsBtn = document.getElementById('statsBtn');

  const newGameBtn = document.getElementById('newGameBtn');
  const shareResultBtn = document.getElementById('shareResultBtn');

  // Stats Modal
  const statsOverlay = document.getElementById('statsOverlay');
  const closeStatsBtn = document.getElementById('closeStatsBtn');
  const statsIcon = document.getElementById('statsIcon');
  const statsTitle = document.getElementById('statsTitle');
  const statsSubtitle = document.getElementById('statsSubtitle');
  const statPlayed = document.getElementById('statPlayed');
  const statWinPct = document.getElementById('statWinPct');
  const statStreak = document.getElementById('statStreak');
  const statMaxStreak = document.getElementById('statMaxStreak');
  const distBars = document.getElementById('distBars');
  const answerRevealBox = document.getElementById('answerRevealBox');
  const revealWordVal = document.getElementById('revealWordVal');
  const modalShareBtn = document.getElementById('modalShareBtn');
  const modalPlayAgainBtn = document.getElementById('modalPlayAgainBtn');

  // Rules Modal
  const rulesOverlay = document.getElementById('rulesOverlay');
  const closeRulesBtn = document.getElementById('closeRulesBtn');
  const rulesGotItBtn = document.getElementById('rulesGotItBtn');

  // --- Game State Variables ---
  let secretWord = '';
  let currentDifficulty = 'medium';
  let currentRow = 0;
  let currentTile = 0;
  let isGameOver = false;
  let isAnimating = false;

  // Grid state: 6 rows of 5 letters
  let guesses = ['', '', '', '', '', ''];
  let evaluations = []; // [ ['correct', 'present', ...], ... ]

  // Key status tracking: { 'A': 'correct', 'B': 'absent', ... }
  let keyStatuses = {};

  // Lifetime Stats
  let stats = {
    played: 0,
    wins: 0,
    streak: 0,
    bestStreak: 0,
    distribution: [0, 0, 0, 0, 0, 0]
  };

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

  function playKeyClick() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      window.playZoneAudio.playTone(520, 'triangle', 0.04, 0.12);
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playDeleteSound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      window.playZoneAudio.playTone(320, 'sine', 0.05, 0.12);
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playFlipSound(index, status) {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      let freq = 440;
      if (status === 'correct') freq = 659 + index * 60;
      else if (status === 'present') freq = 523 + index * 40;
      else freq = 330;

      window.playZoneAudio.playTone(freq, 'sine', 0.1, 0.18);
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playShakeSound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      window.playZoneAudio.playTone(160, 'sawtooth', 0.16, 0.22);
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playVictorySound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      window.playZoneAudio.playSuccess();
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playLossSound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      window.playZoneAudio.playGameOver();
    } catch (e) {
      // Audio fallback silent
    }
  }

  // --- Floating Toast Notifications ---
  function showToast(message, duration = 2200) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, duration);
  }

  // --- LocalStorage Stats Management ---
  function loadLifetimeStats() {
    stats.wins = parseInt(localStorage.getItem(STORAGE_KEY_WINS), 10) || 0;
    stats.streak = parseInt(localStorage.getItem(STORAGE_KEY_STREAK), 10) || 0;
    stats.bestStreak = parseInt(localStorage.getItem(STORAGE_KEY_BEST_STREAK), 10) || 0;
    stats.played = parseInt(localStorage.getItem(STORAGE_KEY_PLAYED), 10) || 0;

    const savedDist = localStorage.getItem(STORAGE_KEY_DIST);
    if (savedDist) {
      try {
        stats.distribution = JSON.parse(savedDist);
      } catch (e) {
        stats.distribution = [0, 0, 0, 0, 0, 0];
      }
    } else {
      stats.distribution = [0, 0, 0, 0, 0, 0];
    }

    updateScoreboardUI();
  }

  function saveLifetimeStats() {
    localStorage.setItem(STORAGE_KEY_WINS, stats.wins.toString());
    localStorage.setItem(STORAGE_KEY_STREAK, stats.streak.toString());
    localStorage.setItem(STORAGE_KEY_BEST_STREAK, stats.bestStreak.toString());
    localStorage.setItem(STORAGE_KEY_PLAYED, stats.played.toString());
    localStorage.setItem(STORAGE_KEY_DIST, JSON.stringify(stats.distribution));
  }

  function updateScoreboardUI() {
    winsDisplay.textContent = stats.wins;
    streakDisplay.textContent = stats.streak;
    bestStreakDisplay.textContent = stats.bestStreak;
    attemptDisplay.textContent = `${Math.min(6, currentRow + 1)} / ${MAX_ATTEMPTS}`;
  }

  function updateSoundUI() {
    const enabled = isSoundEnabled();
    if (soundIcon) {
      soundIcon.textContent = enabled ? '🔊' : '🔇';
    }
  }

  // --- Pick Random Secret Word ---
  function chooseSecretWord(diff) {
    let bank = WORDS_MEDIUM;
    if (diff === 'easy') bank = WORDS_EASY;
    else if (diff === 'hard') bank = WORDS_HARD;

    const randomIndex = Math.floor(Math.random() * bank.length);
    return bank[randomIndex].toUpperCase();
  }

  // --- Build Grid DOM ---
  function initGridDOM() {
    wordGrid.innerHTML = '';
    for (let r = 0; r < MAX_ATTEMPTS; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'tile-row';
      rowEl.dataset.row = r;
      rowEl.setAttribute('role', 'row');

      for (let c = 0; c < WORD_LENGTH; c++) {
        const tileEl = document.createElement('div');
        tileEl.className = 'tile';
        tileEl.dataset.col = c;
        tileEl.setAttribute('role', 'gridcell');
        tileEl.setAttribute('aria-label', `Row ${r + 1}, Letter ${c + 1}`);
        rowEl.appendChild(tileEl);
      }
      wordGrid.appendChild(rowEl);
    }
  }

  // --- Build Keyboard DOM ---
  function initKeyboardDOM() {
    const rowContainers = [kbRow1, kbRow2, kbRow3];

    KEYBOARD_LAYOUT.forEach((rowKeys, rIndex) => {
      const container = rowContainers[rIndex];
      container.innerHTML = '';

      rowKeys.forEach(k => {
        const btn = document.createElement('button');
        btn.className = 'key';
        btn.dataset.key = k;
        btn.type = 'button';

        if (k === 'ENTER') {
          btn.textContent = 'ENTER';
          btn.classList.add('key-wide');
          btn.setAttribute('aria-label', 'Submit Guess');
        } else if (k === 'BACKSPACE') {
          btn.innerHTML = '⌫';
          btn.classList.add('key-wide');
          btn.setAttribute('aria-label', 'Backspace');
        } else {
          btn.textContent = k;
          btn.setAttribute('aria-label', `Letter ${k}`);
        }

        btn.addEventListener('click', () => {
          handleKeyInput(k);
        });

        container.appendChild(btn);
      });
    });
  }

  // --- Accurate Two-Pass Wordle Letter Evaluation ---
  function evaluateGuess(guess, target) {
    const result = new Array(WORD_LENGTH).fill('absent');
    const targetChars = target.split('');
    const guessChars = guess.split('');
    const targetCounts = {};

    // 1. Tally available letter counts in target word
    for (const ch of targetChars) {
      targetCounts[ch] = (targetCounts[ch] || 0) + 1;
    }

    // 2. First Pass: Exact matches (Correct / Green)
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (guessChars[i] === targetChars[i]) {
        result[i] = 'correct';
        targetCounts[guessChars[i]]--;
      }
    }

    // 3. Second Pass: Letter in target word but wrong position (Present / Yellow)
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (result[i] !== 'correct') {
        const ch = guessChars[i];
        if (targetCounts[ch] && targetCounts[ch] > 0) {
          result[i] = 'present';
          targetCounts[ch]--;
        }
      }
    }

    return result;
  }

  // --- Input Handlers ---
  function handleKeyInput(key) {
    if (isGameOver || isAnimating) return;

    if (key === 'ENTER') {
      submitGuess();
    } else if (key === 'BACKSPACE' || key === 'DELETE') {
      deleteLetter();
    } else if (/^[A-Z]$/.test(key)) {
      addLetter(key);
    }
  }

  function addLetter(letter) {
    if (currentTile >= WORD_LENGTH) return;

    const rowEl = wordGrid.querySelector(`[data-row="${currentRow}"]`);
    const tileEl = rowEl.querySelector(`[data-col="${currentTile}"]`);

    tileEl.textContent = letter;
    tileEl.classList.add('filled');
    guesses[currentRow] += letter;
    currentTile++;

    playKeyClick();
  }

  function deleteLetter() {
    if (currentTile <= 0) return;

    currentTile--;
    const rowEl = wordGrid.querySelector(`[data-row="${currentRow}"]`);
    const tileEl = rowEl.querySelector(`[data-col="${currentTile}"]`);

    tileEl.textContent = '';
    tileEl.classList.remove('filled');
    guesses[currentRow] = guesses[currentRow].slice(0, -1);

    playDeleteSound();
  }

  function shakeCurrentRow() {
    const rowEl = wordGrid.querySelector(`[data-row="${currentRow}"]`);
    rowEl.classList.remove('shake');
    void rowEl.offsetWidth; // Force reflow
    rowEl.classList.add('shake');
    playShakeSound();

    setTimeout(() => {
      rowEl.classList.remove('shake');
    }, 500);
  }

  // --- Submit Guess & Staggered Reveal Animation ---
  function submitGuess() {
    const guess = guesses[currentRow];

    // Check length
    if (guess.length < WORD_LENGTH) {
      shakeCurrentRow();
      showToast('Not enough letters');
      return;
    }

    // Validate in dictionary
    if (!VALID_GUESSES.has(guess)) {
      shakeCurrentRow();
      showToast('Not in word list');
      return;
    }

    isAnimating = true;
    const evaluation = evaluateGuess(guess, secretWord);
    evaluations.push(evaluation);

    const rowEl = wordGrid.querySelector(`[data-row="${currentRow}"]`);
    const tiles = rowEl.querySelectorAll('.tile');

    // Staggered Flip Animation (150ms per tile)
    tiles.forEach((tile, index) => {
      const status = evaluation[index];

      setTimeout(() => {
        tile.classList.add('flip');

        // Apply status color at midpoint of 3D rotation (250ms)
        setTimeout(() => {
          tile.classList.add(status);
          playFlipSound(index, status);
        }, 250);
      }, index * 160);
    });

    // After all 5 tiles finish flipping (5 * 160 + 500ms = 1300ms)
    setTimeout(() => {
      updateKeyboardKeys(guess, evaluation);

      const hasWon = evaluation.every(s => s === 'correct');

      if (hasWon) {
        handleWin();
      } else if (currentRow === MAX_ATTEMPTS - 1) {
        handleLoss();
      } else {
        // Move to next guess row
        currentRow++;
        currentTile = 0;
        isAnimating = false;
        updateScoreboardUI();
      }
    }, 5 * 160 + 500);
  }

  // --- Update Virtual Keyboard Keys ---
  function updateKeyboardKeys(guess, evaluation) {
    for (let i = 0; i < WORD_LENGTH; i++) {
      const letter = guess[i];
      const status = evaluation[i];
      const currentStatus = keyStatuses[letter];

      // Precedence: correct > present > absent
      if (status === 'correct') {
        keyStatuses[letter] = 'correct';
      } else if (status === 'present' && currentStatus !== 'correct') {
        keyStatuses[letter] = 'present';
      } else if (status === 'absent' && !currentStatus) {
        keyStatuses[letter] = 'absent';
      }

      const keyBtn = document.querySelector(`.key[data-key="${letter}"]`);
      if (keyBtn) {
        keyBtn.classList.remove('correct', 'present', 'absent');
        keyBtn.classList.add(keyStatuses[letter]);
      }
    }
  }

  // --- Win & Loss Logic ---
  function handleWin() {
    isGameOver = true;
    isAnimating = false;

    // Winning dance wave animation on current row
    const rowEl = wordGrid.querySelector(`[data-row="${currentRow}"]`);
    const tiles = rowEl.querySelectorAll('.tile');
    tiles.forEach((tile, idx) => {
      setTimeout(() => {
        tile.classList.add('bounce');
      }, idx * 90);
    });

    // Update Career Stats
    stats.played++;
    stats.wins++;
    stats.streak++;
    if (stats.streak > stats.bestStreak) {
      stats.bestStreak = stats.streak;
    }
    stats.distribution[currentRow]++;
    saveLifetimeStats();
    updateScoreboardUI();

    playVictorySound();

    const victoryPraise = ['Genius! 🌟', 'Magnificent! 🏆', 'Splendid! ✨', 'Great! 👍', 'Phew! 😅', 'Clutch! 🔥'];
    showToast(victoryPraise[currentRow] || 'Awesome!', 2800);

    shareResultBtn.classList.remove('hidden');

    // Show Stats Modal after celebratory delay
    setTimeout(() => {
      openStatsModal(true);
    }, 1800);
  }

  function handleLoss() {
    isGameOver = true;
    isAnimating = false;

    stats.played++;
    stats.streak = 0; // Reset streak on loss
    saveLifetimeStats();
    updateScoreboardUI();

    playLossSound();
    showToast(`The word was: ${secretWord}`, 3500);

    shareResultBtn.classList.remove('hidden');

    setTimeout(() => {
      openStatsModal(false);
    }, 2000);
  }

  // --- Share Result Emoji Grid Generator ---
  function generateShareGrid() {
    const attemptText = isGameOver && evaluations[evaluations.length - 1].every(s => s === 'correct')
      ? `${evaluations.length}/${MAX_ATTEMPTS}`
      : `X/${MAX_ATTEMPTS}`;

    let shareText = `PlayZone Word Guess ${attemptText}\n\n`;

    evaluations.forEach(rowEval => {
      rowEval.forEach(status => {
        if (status === 'correct') shareText += '🟩';
        else if (status === 'present') shareText += '🟨';
        else shareText += '⬛';
      });
      shareText += '\n';
    });

    return shareText.trim();
  }

  function shareResult() {
    const text = generateShareGrid();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copied results to clipboard! 📋');
      }).catch(() => {
        fallbackCopyText(text);
      });
    } else {
      fallbackCopyText(text);
    }
  }

  function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Copied results to clipboard! 📋');
    } catch (e) {
      showToast('Sharing not supported on this device');
    }
    document.body.removeChild(textArea);
  }

  // --- Start / Reset Game Session ---
  function startNewGame() {
    secretWord = chooseSecretWord(currentDifficulty);
    currentRow = 0;
    currentTile = 0;
    isGameOver = false;
    isAnimating = false;
    guesses = ['', '', '', '', '', ''];
    evaluations = [];
    keyStatuses = {};

    initGridDOM();

    // Reset virtual keyboard styling
    const allKeys = document.querySelectorAll('.key');
    allKeys.forEach(k => {
      k.classList.remove('correct', 'present', 'absent');
    });

    shareResultBtn.classList.add('hidden');
    statsOverlay.classList.add('hidden');
    rulesOverlay.classList.add('hidden');

    updateScoreboardUI();
    playUiClick();
  }

  function setDifficulty(diff) {
    if (diff === currentDifficulty) return;
    currentDifficulty = diff;

    diffTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.difficulty === diff);
    });

    playUiClick();
    startNewGame();
  }

  // --- Modals Display ---
  function openStatsModal(isWin) {
    statPlayed.textContent = stats.played;
    const winPct = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
    statWinPct.textContent = `${winPct}%`;
    statStreak.textContent = stats.streak;
    statMaxStreak.textContent = stats.bestStreak;

    // Build Guess Distribution Chart
    distBars.innerHTML = '';
    const maxVal = Math.max(...stats.distribution, 1);

    stats.distribution.forEach((count, i) => {
      const row = document.createElement('div');
      row.className = 'dist-row';

      const label = document.createElement('span');
      label.className = 'dist-label';
      label.textContent = i + 1;

      const track = document.createElement('div');
      track.className = 'dist-bar-track';

      const fill = document.createElement('div');
      fill.className = 'dist-bar-fill';
      const pct = Math.max(8, Math.round((count / maxVal) * 100));
      fill.style.width = `${pct}%`;
      fill.textContent = count;

      // Highlight bar if won on this exact attempt in current game
      if (isGameOver && isWin && currentRow === i) {
        fill.classList.add('highlight');
      }

      track.appendChild(fill);
      row.appendChild(label);
      row.appendChild(track);
      distBars.appendChild(row);
    });

    if (isGameOver) {
      modalShareBtn.classList.remove('hidden');
      if (!isWin) {
        answerRevealBox.classList.remove('hidden');
        revealWordVal.textContent = secretWord;
        statsIcon.textContent = '💔';
        statsTitle.textContent = 'Round Over';
        statsSubtitle.textContent = 'Keep your head high! You will get the next one.';
      } else {
        answerRevealBox.classList.add('hidden');
        statsIcon.textContent = '🏆';
        statsTitle.textContent = 'Splendid Job!';
        statsSubtitle.textContent = 'Another puzzle mastered in your record books.';
      }
    } else {
      modalShareBtn.classList.add('hidden');
      answerRevealBox.classList.add('hidden');
      statsIcon.textContent = '📊';
      statsTitle.textContent = 'Career Stats';
      statsSubtitle.textContent = 'Here is your current Word Guess record:';
    }

    statsOverlay.classList.remove('hidden');
    playUiClick();
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Physical Keyboard Listener
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleKeyInput('ENTER');
      } else if (e.key === 'Backspace') {
        handleKeyInput('BACKSPACE');
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKeyInput(e.key.toUpperCase());
      }
    });

    // Difficulty selector tabs
    diffTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        setDifficulty(tab.dataset.difficulty);
      });
    });

    // Top action buttons
    statsBtn.addEventListener('click', () => {
      openStatsModal(false);
    });

    rulesBtn.addEventListener('click', () => {
      rulesOverlay.classList.remove('hidden');
      playUiClick();
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

    // Modal close buttons
    closeStatsBtn.addEventListener('click', () => {
      statsOverlay.classList.add('hidden');
      playUiClick();
    });

    closeRulesBtn.addEventListener('click', () => {
      rulesOverlay.classList.add('hidden');
      playUiClick();
    });

    rulesGotItBtn.addEventListener('click', () => {
      rulesOverlay.classList.add('hidden');
      playUiClick();
    });

    // Control buttons
    newGameBtn.addEventListener('click', () => {
      startNewGame();
    });

    shareResultBtn.addEventListener('click', () => {
      shareResult();
    });

    modalShareBtn.addEventListener('click', () => {
      shareResult();
    });

    modalPlayAgainBtn.addEventListener('click', () => {
      startNewGame();
    });
  }

  // --- Initialization ---
  function init() {
    loadLifetimeStats();
    initGridDOM();
    initKeyboardDOM();
    updateSoundUI();
    setupEventListeners();
    startNewGame();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
