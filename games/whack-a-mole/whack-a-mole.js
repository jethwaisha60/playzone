/**
 * PlayZone - Neon Whack-a-Mole Game Engine
 * Pure vanilla JavaScript (ES6+), Web Audio API, responsive touch/pointer handling.
 */

(function () {
  'use strict';

  // --- Constants & Config ---
  const STORAGE_KEY = 'playzone_score_whack_a_mole';
  const SOUND_KEY = 'playzone_sound';
  const TOTAL_GAME_TIME = 30.0; // 30 seconds

  // Difficulty profiles
  const DIFFICULTY_CONFIG = {
    easy: {
      name: 'Easy',
      stayMin: 700,
      stayMax: 1100,
      spawnMin: 520,
      spawnMax: 760,
      goldenChance: 0.18,
      bombChance: 0.10,
      allowDouble: false
    },
    medium: {
      name: 'Medium',
      stayMin: 500,
      stayMax: 850,
      spawnMin: 380,
      spawnMax: 600,
      goldenChance: 0.18,
      bombChance: 0.18,
      allowDouble: true,
      doubleThreshold: 8.0 // last 8 seconds
    },
    hard: {
      name: 'Hard',
      stayMin: 360,
      stayMax: 650,
      spawnMin: 300,
      spawnMax: 480,
      goldenChance: 0.20,
      bombChance: 0.24,
      allowDouble: true,
      doubleThreshold: 14.0 // last 14 seconds
    }
  };

  // SVG Graphics definitions
  const MOLE_SVG = `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="moleGrad" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#8d5b4c"/>
          <stop offset="100%" stop-color="#543328"/>
        </radialGradient>
        <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00f0ff"/>
          <stop offset="100%" stop-color="#a855f7"/>
        </linearGradient>
      </defs>
      <!-- Ears -->
      <circle cx="27" cy="38" r="8.5" fill="#543328"/>
      <circle cx="27" cy="38" r="4.5" fill="#f472b6"/>
      <circle cx="73" cy="38" r="8.5" fill="#543328"/>
      <circle cx="73" cy="38" r="4.5" fill="#f472b6"/>
      <!-- Main Body -->
      <path d="M 23 96 Q 22 34 50 30 Q 78 34 77 96 Z" fill="url(#moleGrad)"/>
      <!-- Soft Tummy -->
      <ellipse cx="50" cy="85" rx="17" ry="12" fill="#9c6d5e"/>
      <!-- Cyber Visor -->
      <rect x="29" y="43" width="42" height="13" rx="6.5" fill="#090d16" stroke="url(#visorGrad)" stroke-width="2"/>
      <line x1="33" y1="49.5" x2="67" y2="49.5" stroke="#00f0ff" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="40" cy="49.5" r="1.5" fill="#ffffff"/>
      <!-- Snout -->
      <ellipse cx="50" cy="64" rx="15" ry="10" fill="#dfbeab"/>
      <ellipse cx="50" cy="61" rx="5.5" ry="3.8" fill="#1e293b"/>
      <!-- Cute Mouth -->
      <path d="M 46 66 Q 50 70 54 66" fill="none" stroke="#543328" stroke-width="1.5" stroke-linecap="round"/>
      <!-- Whiskers -->
      <path d="M 33 63 Q 21 61 14 65" fill="none" stroke="#00f0ff" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
      <path d="M 33 66 Q 22 67 15 72" fill="none" stroke="#00f0ff" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
      <path d="M 67 63 Q 79 61 86 65" fill="none" stroke="#00f0ff" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
      <path d="M 67 66 Q 78 67 85 72" fill="none" stroke="#00f0ff" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
      <!-- Paws grabbing the hole -->
      <ellipse cx="29" cy="94" rx="7" ry="5" fill="#9c6d5e"/>
      <ellipse cx="71" cy="94" rx="7" ry="5" fill="#9c6d5e"/>
    </svg>
  `;

  const GOLDEN_MOLE_SVG = `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="goldGrad" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#fde047"/>
          <stop offset="60%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#b45309"/>
        </radialGradient>
      </defs>
      <!-- Crown on top -->
      <path d="M 34 29 L 39 15 L 50 23 L 61 15 L 66 29 Z" fill="#fbbf24" stroke="#d97706" stroke-width="1.5"/>
      <circle cx="50" cy="20" r="2.2" fill="#ec4899"/>
      <circle cx="39" cy="15" r="1.5" fill="#00f0ff"/>
      <circle cx="61" cy="15" r="1.5" fill="#00f0ff"/>
      <!-- Ears -->
      <circle cx="27" cy="38" r="8.5" fill="#b45309"/>
      <circle cx="27" cy="38" r="4.5" fill="#fbbf24"/>
      <circle cx="73" cy="38" r="8.5" fill="#b45309"/>
      <circle cx="73" cy="38" r="4.5" fill="#fbbf24"/>
      <!-- Main Body -->
      <path d="M 23 96 Q 22 34 50 30 Q 78 34 77 96 Z" fill="url(#goldGrad)"/>
      <!-- Soft Tummy -->
      <ellipse cx="50" cy="85" rx="17" ry="12" fill="#fef08a"/>
      <!-- Shiny Visor -->
      <rect x="29" y="43" width="42" height="13" rx="6.5" fill="#090d16" stroke="#fbbf24" stroke-width="2"/>
      <line x1="33" y1="49.5" x2="67" y2="49.5" stroke="#fbbf24" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="40" cy="49.5" r="1.8" fill="#ffffff"/>
      <!-- Snout -->
      <ellipse cx="50" cy="64" rx="15" ry="10" fill="#fef3c7"/>
      <ellipse cx="50" cy="61" rx="5.5" ry="3.8" fill="#92400e"/>
      <!-- Mouth -->
      <path d="M 46 66 Q 50 70 54 66" fill="none" stroke="#92400e" stroke-width="1.5" stroke-linecap="round"/>
      <!-- Whiskers -->
      <path d="M 33 63 Q 21 61 14 65" fill="none" stroke="#fbbf24" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M 33 66 Q 22 67 15 72" fill="none" stroke="#fbbf24" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M 67 63 Q 79 61 86 65" fill="none" stroke="#fbbf24" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M 67 66 Q 78 67 85 72" fill="none" stroke="#fbbf24" stroke-width="1.2" stroke-linecap="round"/>
      <!-- Sparkle stars -->
      <path d="M 20 45 L 22 41 L 24 45 L 22 49 Z" fill="#ffffff"/>
      <path d="M 78 48 L 80 44 L 82 48 L 80 52 Z" fill="#ffffff"/>
      <!-- Paws -->
      <ellipse cx="29" cy="94" rx="7" ry="5" fill="#fef08a"/>
      <ellipse cx="71" cy="94" rx="7" ry="5" fill="#fef08a"/>
    </svg>
  `;

  const BOMB_SVG = `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bombGrad" cx="40%" cy="45%" r="60%">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="70%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#020617"/>
        </radialGradient>
      </defs>
      <!-- Fuse -->
      <path d="M 50 32 Q 55 18 68 15" fill="none" stroke="#94a3b8" stroke-width="3.5" stroke-linecap="round"/>
      <!-- Spark at Fuse Tip -->
      <circle cx="68" cy="15" r="4.5" fill="#f59e0b"/>
      <circle cx="68" cy="15" r="2.5" fill="#ef4444"/>
      <!-- Cap -->
      <rect x="42" y="30" width="16" height="6" rx="2" fill="#475569" stroke="#64748b" stroke-width="1"/>
      <!-- Main Bomb Sphere -->
      <circle cx="50" cy="62" r="30" fill="url(#bombGrad)" stroke="#ef4444" stroke-width="2.5"/>
      <!-- Hazard Warning Bands -->
      <circle cx="50" cy="62" r="24" fill="none" stroke="#ef4444" stroke-width="1" stroke-dasharray="4 3" opacity="0.6"/>
      <!-- Hazard Center Icon: Warning Exclamation / Skull -->
      <polygon points="50,47 62,68 38,68" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linejoin="round"/>
      <line x1="50" y1="53" x2="50" y2="61" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="50" cy="64.5" r="1.3" fill="#ef4444"/>
    </svg>
  `;

  // --- Game State Variables ---
  let currentDifficulty = 'easy';
  let gameState = 'ready'; // 'ready', 'playing', 'paused', 'gameover'
  let score = 0;
  let bestScore = 0;
  let timeLeft = TOTAL_GAME_TIME;
  let totalClicks = 0;
  let hits = 0;
  let molesHit = 0;
  let goldenMolesHit = 0;
  let bombsHit = 0;

  // Timers & Active Hole States
  let timerIntervalId = null;
  let spawnTimeoutId = null;
  let lastTimestamp = 0;

  // 9 holes state tracker
  const holes = [];
  for (let i = 0; i < 9; i++) {
    holes.push({
      index: i,
      isActive: false,
      isHit: false,
      type: null, // 'mole', 'golden', 'bomb'
      clearTimer: null,
      containerEl: null
    });
  }

  // --- DOM Elements ---
  const scoreDisplay = document.getElementById('scoreDisplay');
  const timerDisplay = document.getElementById('timerDisplay');
  const bestDisplay = document.getElementById('bestDisplay');
  const accuracyDisplay = document.getElementById('accuracyDisplay');
  const timerProgressBar = document.getElementById('timerProgressBar');
  const stageContainer = document.getElementById('stageContainer');
  const moleGrid = document.getElementById('moleGrid');
  const effectsLayer = document.getElementById('effectsLayer');

  const diffTabs = document.querySelectorAll('.diff-tab');
  const soundToggleBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');

  const startOverlay = document.getElementById('startOverlay');
  const startBtn = document.getElementById('startBtn');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const resumeBtn = document.getElementById('resumeBtn');
  const pauseRestartBtn = document.getElementById('pauseRestartBtn');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const playAgainBtn = document.getElementById('playAgainBtn');

  const pauseToggleBtn = document.getElementById('pauseToggleBtn');
  const pauseBtnLabel = document.getElementById('pauseBtnLabel');
  const restartBtn = document.getElementById('restartBtn');

  // Stats in Game Over Modal
  const finalScoreVal = document.getElementById('finalScoreVal');
  const finalBestVal = document.getElementById('finalBestVal');
  const finalAccuracyVal = document.getElementById('finalAccuracyVal');
  const finalMolesVal = document.getElementById('finalMolesVal');
  const finalGoldenVal = document.getElementById('finalGoldenVal');
  const finalBombsVal = document.getElementById('finalBombsVal');
  const finalDiffVal = document.getElementById('finalDiffVal');
  const newBestBadge = document.getElementById('newBestBadge');
  const gameOverMessage = document.getElementById('gameOverMessage');

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

  function playHitMoleSound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      window.playZoneAudio.playTone(560, 'sine', 0.08, 0.22);
      setTimeout(() => {
        if (window.playZoneAudio) window.playZoneAudio.playTone(840, 'triangle', 0.1, 0.24);
      }, 40);
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playHitGoldenSound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      const notes = [784, 988, 1175, 1568]; // G5, B5, D6, G6
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          if (window.playZoneAudio) window.playZoneAudio.playTone(freq, 'triangle', 0.12, 0.22);
        }, idx * 60);
      });
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playBombExplosionSound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      window.playZoneAudio.playTone(120, 'sawtooth', 0.25, 0.35);
      setTimeout(() => {
        if (window.playZoneAudio) window.playZoneAudio.playTone(65, 'sawtooth', 0.35, 0.4);
      }, 60);
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playMissSound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      window.playZoneAudio.playTone(160, 'sine', 0.04, 0.08);
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playGameOverFanfare(isNewRecord) {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    if (isNewRecord) {
      window.playZoneAudio.playSuccess();
    } else {
      window.playZoneAudio.playGameOver();
    }
  }

  // --- High Score Persistence ---
  function loadBestScore() {
    const saved = localStorage.getItem(STORAGE_KEY);
    bestScore = saved ? parseInt(saved, 10) || 0 : 0;
    bestDisplay.textContent = `${bestScore} pts`;
  }

  function saveBestScoreIfNeeded() {
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(STORAGE_KEY, bestScore.toString());
      bestDisplay.textContent = `${bestScore} pts`;
      return true;
    }
    return false;
  }

  // --- UI Update Helpers ---
  function updateScoreboard() {
    scoreDisplay.textContent = `${score} pts`;

    const formattedTime = Math.max(0, Math.ceil(timeLeft));
    timerDisplay.textContent = `${formattedTime}s`;

    if (timeLeft <= 5.0 && gameState === 'playing') {
      timerDisplay.classList.add('time-warning');
      timerProgressBar.classList.add('urgent');
    } else {
      timerDisplay.classList.remove('time-warning');
      timerProgressBar.classList.remove('urgent');
    }

    const progressPct = Math.max(0, Math.min(100, (timeLeft / TOTAL_GAME_TIME) * 100));
    timerProgressBar.style.width = `${progressPct}%`;

    const acc = totalClicks > 0 ? Math.round((hits / totalClicks) * 100) : 100;
    accuracyDisplay.textContent = `${acc}%`;
  }

  function updateSoundUI() {
    const enabled = isSoundEnabled();
    if (soundIcon) {
      soundIcon.textContent = enabled ? '🔊' : '🔇';
    }
  }

  // --- Floating Visual Effects ---
  function showFloatingEffect(x, y, text, typeClass) {
    const el = document.createElement('div');
    el.className = `floating-score ${typeClass}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    effectsLayer.appendChild(el);

    setTimeout(() => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, 800);
  }

  function showImpactRing(x, y, ringClass) {
    const ring = document.createElement('div');
    ring.className = `impact-ring ${ringClass}`;
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    effectsLayer.appendChild(ring);

    setTimeout(() => {
      if (ring && ring.parentNode) {
        ring.parentNode.removeChild(ring);
      }
    }, 450);
  }

  function triggerStageShake() {
    stageContainer.classList.remove('shake-stage');
    // Force DOM reflow
    void stageContainer.offsetWidth;
    stageContainer.classList.add('shake-stage');
    setTimeout(() => {
      stageContainer.classList.remove('shake-stage');
    }, 380);
  }

  // --- Dynamic Mole Spawning Engine ---
  function getCurrentSpeedSettings() {
    const cfg = DIFFICULTY_CONFIG[currentDifficulty];
    // Progression factor from 0.0 (start) to 1.0 (end)
    const factor = Math.min(1.0, Math.max(0.0, (TOTAL_GAME_TIME - timeLeft) / TOTAL_GAME_TIME));

    // Stay duration decreases linearly
    const stayDuration = cfg.stayMax - (cfg.stayMax - cfg.stayMin) * factor;

    // Spawn interval decreases linearly
    const spawnInterval = cfg.spawnMax - (cfg.spawnMax - cfg.spawnMin) * factor;

    return {
      stayDuration: Math.round(stayDuration),
      spawnInterval: Math.round(spawnInterval),
      allowDouble: cfg.allowDouble && timeLeft <= (cfg.doubleThreshold || 0),
      goldenChance: cfg.goldenChance,
      bombChance: cfg.bombChance
    };
  }

  function spawnTarget(forcedIndex) {
    if (gameState !== 'playing') return;

    // Find all inactive holes
    const availableHoles = holes.filter(h => !h.isActive);
    if (availableHoles.length === 0) return;

    const chosenHole = typeof forcedIndex === 'number'
      ? holes[forcedIndex]
      : availableHoles[Math.floor(Math.random() * availableHoles.length)];

    if (!chosenHole || chosenHole.isActive) return;

    const speed = getCurrentSpeedSettings();

    // Determine target type
    const roll = Math.random();
    let type = 'mole';
    if (roll < speed.bombChance) {
      type = 'bomb';
    } else if (roll < speed.bombChance + speed.goldenChance) {
      type = 'golden';
    }

    chosenHole.isActive = true;
    chosenHole.isHit = false;
    chosenHole.type = type;

    // Render target inside container
    const container = chosenHole.containerEl;
    container.innerHTML = '';
    container.className = 'target-container';

    const entity = document.createElement('div');
    entity.className = `target-entity ${type}`;

    if (type === 'mole') {
      entity.innerHTML = MOLE_SVG;
    } else if (type === 'golden') {
      entity.innerHTML = GOLDEN_MOLE_SVG;
    } else {
      entity.innerHTML = BOMB_SVG;
    }

    container.appendChild(entity);

    // Pop up animation
    requestAnimationFrame(() => {
      container.classList.add('active');
    });

    // Schedule burrow down if not hit
    chosenHole.clearTimer = setTimeout(() => {
      burrowDown(chosenHole);
    }, speed.stayDuration);
  }

  function burrowDown(hole) {
    if (!hole.isActive) return;

    const container = hole.containerEl;
    container.classList.remove('active');
    container.classList.add('burrow');

    hole.isActive = false;

    setTimeout(() => {
      if (!hole.isActive) {
        container.className = 'target-container';
        container.innerHTML = '';
      }
    }, 180);
  }

  function scheduleNextSpawn() {
    if (gameState !== 'playing') return;

    const speed = getCurrentSpeedSettings();

    spawnTimeoutId = setTimeout(() => {
      if (gameState !== 'playing') return;

      spawnTarget();

      // Check if frenzy allows a second simultaneous target
      if (speed.allowDouble) {
        const activeCount = holes.filter(h => h.isActive).length;
        if (activeCount < 2 && Math.random() < 0.6) {
          setTimeout(() => {
            if (gameState === 'playing') spawnTarget();
          }, 120);
        }
      }

      scheduleNextSpawn();
    }, speed.spawnInterval);
  }

  // --- Hit Registration ---
  function handleHoleInteraction(holeIndex, clientX, clientY) {
    if (gameState !== 'playing') return;

    const hole = holes[holeIndex];
    const rect = stageContainer.getBoundingClientRect();
    const effectX = clientX - rect.left;
    const effectY = clientY - rect.top;

    totalClicks++;

    if (hole && hole.isActive && !hole.isHit) {
      hole.isHit = true;
      hits++;

      if (hole.clearTimer) {
        clearTimeout(hole.clearTimer);
        hole.clearTimer = null;
      }

      const container = hole.containerEl;
      const entity = container.querySelector('.target-entity');

      if (hole.type === 'mole') {
        score += 10;
        molesHit++;
        playHitMoleSound();
        showFloatingEffect(effectX, effectY, '+10', 'plus-cyan');
        showImpactRing(effectX, effectY, 'cyan-ring');
        if (entity) entity.classList.add('whacked-mole');
      } else if (hole.type === 'golden') {
        score += 50;
        goldenMolesHit++;
        playHitGoldenSound();
        showFloatingEffect(effectX, effectY, '+50', 'plus-gold');
        showImpactRing(effectX, effectY, 'gold-ring');
        if (entity) entity.classList.add('whacked-mole');
      } else if (hole.type === 'bomb') {
        score = Math.max(0, score - 20);
        bombsHit++;
        playBombExplosionSound();
        showFloatingEffect(effectX, effectY, '-20', 'minus-red');
        showImpactRing(effectX, effectY, 'red-ring');
        triggerStageShake();
        if (entity) entity.classList.add('exploded-bomb');
      }

      container.classList.add('hit');

      // Slide down after hit animation
      setTimeout(() => {
        burrowDown(hole);
      }, 160);

      updateScoreboard();
    } else {
      // Missed tap on empty hole
      playMissSound();
      showFloatingEffect(effectX, effectY, 'MISS', 'miss-gray');
      updateScoreboard();
    }
  }

  // --- Game Lifecycle ---
  function startGame() {
    gameState = 'playing';
    score = 0;
    timeLeft = TOTAL_GAME_TIME;
    totalClicks = 0;
    hits = 0;
    molesHit = 0;
    goldenMolesHit = 0;
    bombsHit = 0;

    // Reset all holes
    holes.forEach(hole => {
      if (hole.clearTimer) clearTimeout(hole.clearTimer);
      hole.isActive = false;
      hole.isHit = false;
      hole.type = null;
      if (hole.containerEl) {
        hole.containerEl.className = 'target-container';
        hole.containerEl.innerHTML = '';
      }
    });

    effectsLayer.innerHTML = '';
    startOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');

    pauseToggleBtn.disabled = false;
    pauseBtnLabel.textContent = 'Pause';

    updateScoreboard();
    playUiClick();

    // Start timer loop with delta time for high precision
    lastTimestamp = performance.now();
    startTimerLoop();

    // Kick off spawning
    setTimeout(() => {
      spawnTarget();
      scheduleNextSpawn();
    }, 350);
  }

  function startTimerLoop() {
    if (timerIntervalId) clearInterval(timerIntervalId);

    timerIntervalId = setInterval(() => {
      if (gameState !== 'playing') return;

      const now = performance.now();
      const delta = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      timeLeft -= delta;

      if (timeLeft <= 0) {
        timeLeft = 0;
        updateScoreboard();
        endGame();
      } else {
        updateScoreboard();
      }
    }, 100);
  }

  function pauseGame() {
    if (gameState !== 'playing') return;

    gameState = 'paused';
    if (timerIntervalId) clearInterval(timerIntervalId);
    if (spawnTimeoutId) clearTimeout(spawnTimeoutId);

    holes.forEach(hole => {
      if (hole.clearTimer) clearTimeout(hole.clearTimer);
    });

    pauseOverlay.classList.remove('hidden');
    pauseBtnLabel.textContent = 'Resume';
    playUiClick();
  }

  function resumeGame() {
    if (gameState !== 'paused') return;

    gameState = 'playing';
    pauseOverlay.classList.add('hidden');
    pauseBtnLabel.textContent = 'Pause';
    playUiClick();

    lastTimestamp = performance.now();
    startTimerLoop();

    // Clear stuck targets and start fresh spawn wave
    holes.forEach(hole => {
      if (hole.isActive) {
        burrowDown(hole);
      }
    });

    setTimeout(() => {
      if (gameState === 'playing') {
        spawnTarget();
        scheduleNextSpawn();
      }
    }, 300);
  }

  function endGame() {
    gameState = 'gameover';
    if (timerIntervalId) clearInterval(timerIntervalId);
    if (spawnTimeoutId) clearTimeout(spawnTimeoutId);

    holes.forEach(hole => {
      if (hole.clearTimer) clearTimeout(hole.clearTimer);
      if (hole.isActive) burrowDown(hole);
    });

    pauseToggleBtn.disabled = true;

    // Check personal record
    const isNewRecord = saveBestScoreIfNeeded();

    // Populate Game Over stats
    finalScoreVal.textContent = `${score} pts`;
    finalBestVal.textContent = `${bestScore} pts`;

    const finalAcc = totalClicks > 0 ? Math.round((hits / totalClicks) * 100) : 100;
    finalAccuracyVal.textContent = `${finalAcc}%`;
    finalMolesVal.textContent = molesHit;
    finalGoldenVal.textContent = goldenMolesHit;
    finalBombsVal.textContent = bombsHit;
    finalDiffVal.textContent = DIFFICULTY_CONFIG[currentDifficulty].name;

    if (isNewRecord && score > 0) {
      newBestBadge.classList.remove('hidden');
      gameOverMessage.textContent = '🔥 Spectacular reflexes! You smashed your high score!';
    } else {
      newBestBadge.classList.add('hidden');
      if (score >= 400) {
        gameOverMessage.textContent = '⚡ Lightning fast! Master tier reflex skills!';
      } else if (score >= 200) {
        gameOverMessage.textContent = 'Great reflex workout! Keep pushing for the leaderboard!';
      } else {
        gameOverMessage.textContent = 'Keep practicing! Quick eyes and steady hands win!';
      }
    }

    gameOverOverlay.classList.remove('hidden');
    playGameOverFanfare(isNewRecord && score > 0);
  }

  function setDifficulty(diff) {
    if (!DIFFICULTY_CONFIG[diff]) return;
    currentDifficulty = diff;

    diffTabs.forEach(tab => {
      if (tab.dataset.difficulty === diff) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    playUiClick();

    if (gameState === 'playing' || gameState === 'paused') {
      startGame();
    }
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Cache hole DOM containers
    const slotElements = moleGrid.querySelectorAll('.hole-slot');
    slotElements.forEach((slot, index) => {
      const container = slot.querySelector('.target-container');
      holes[index].containerEl = container;

      // Handle pointer down (touch & click unified, responsive without 300ms mobile delay)
      slot.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        handleHoleInteraction(index, e.clientX, e.clientY);
      });
    });

    // Difficulty buttons
    diffTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        setDifficulty(tab.dataset.difficulty);
      });
    });

    // Start Button
    startBtn.addEventListener('click', () => {
      startGame();
    });

    // Pause / Resume Toggle
    pauseToggleBtn.addEventListener('click', () => {
      if (gameState === 'playing') {
        pauseGame();
      } else if (gameState === 'paused') {
        resumeGame();
      }
    });

    resumeBtn.addEventListener('click', () => {
      resumeGame();
    });

    // Restart buttons
    restartBtn.addEventListener('click', () => {
      playUiClick();
      startGame();
    });

    pauseRestartBtn.addEventListener('click', () => {
      startGame();
    });

    playAgainBtn.addEventListener('click', () => {
      startGame();
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

    // Auto-pause when tab is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && gameState === 'playing') {
        pauseGame();
      }
    });

    // Keyboard shortcuts (Space/P to pause/resume, R to restart)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP') {
        if (gameState === 'playing') pauseGame();
        else if (gameState === 'paused') resumeGame();
      } else if (e.code === 'KeyR' && (gameState === 'playing' || gameState === 'paused')) {
        startGame();
      }
    });
  }

  // --- Initialization ---
  function init() {
    loadBestScore();
    updateScoreboard();
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
