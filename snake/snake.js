/**
 * PlayZone - Neon Snake Game Engine
 * Features: Responsive Canvas, Arrow/WASD/Touch/D-pad controls, High Score persistence, Sound FX.
 */

(function () {
  'use strict';

  // 1. Game Grid Constants
  const GRID_SIZE = 20; // 20x20 grid
  const CELL_SIZE = 20; // 20px per cell in logical space
  const LOGICAL_WIDTH = GRID_SIZE * CELL_SIZE; // 400px
  const LOGICAL_HEIGHT = GRID_SIZE * CELL_SIZE; // 400px
  const BASE_SPEED = 120; // Milliseconds per move tick (lower = faster)
  const MIN_SPEED = 60; // Max speed cap
  const STORAGE_KEY = 'playzone_score_snake';

  // 2. DOM Elements
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const currentScoreEl = document.getElementById('currentScore');
  const bestScoreEl = document.getElementById('bestScore');
  const speedLevelEl = document.getElementById('speedLevel');
  const startOverlay = document.getElementById('startOverlay');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const finalScoreVal = document.getElementById('finalScoreVal');
  const finalBestVal = document.getElementById('finalBestVal');
  const newBestBadge = document.getElementById('newBestBadge');

  // Control Buttons
  const startBtn = document.getElementById('startBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const retryBtn = document.getElementById('retryBtn');
  const restartFromPauseBtn = document.getElementById('restartFromPauseBtn');
  const pauseToggleBtn = document.getElementById('pauseToggleBtn');
  const pauseBtnIcon = document.getElementById('pauseBtnIcon');
  const pauseBtnLabel = document.getElementById('pauseBtnLabel');
  const restartBtn = document.getElementById('restartBtn');
  const soundToggleBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const soundLabel = soundToggleBtn.querySelector('.btn-label');

  // D-Pad Touch Buttons
  const dpadUp = document.getElementById('dpadUp');
  const dpadDown = document.getElementById('dpadDown');
  const dpadLeft = document.getElementById('dpadLeft');
  const dpadRight = document.getElementById('dpadRight');

  // 3. Game State
  let snake = [];
  let food = { x: 15, y: 10 };
  let direction = { x: 1, y: 0 };
  let inputQueue = []; // Maximum 2 buffered direction inputs
  let score = 0;
  let bestScore = parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0;
  let currentSpeed = BASE_SPEED;
  let gameState = 'idle'; // 'idle' | 'running' | 'paused' | 'gameover'
  let lastTickTime = 0;
  let animationFrameId = null;
  let foodPulse = 0;

  // Touch Swipe Variables
  let touchStartX = 0;
  let touchStartY = 0;
  let swipeTriggered = false;
  const SWIPE_THRESHOLD = 20;

  // Phase 2 Visual Effects: Neon Particles, Floating Score, Wall Portals
  let particles = [];
  let floatingTexts = [];
  let wallGlows = [];
  const PARTICLE_COLORS = ['#00f0ff', '#a855f7', '#ec4899', '#ffffff'];

  // Phase 3 Arcade Progression: Golden Apple & Combo Streak
  let lastFrameTime = 0;
  let foodsEatenCount = 0;
  let goldenFood = null; // { x, y, maxDuration, remaining, pulse }
  let goldenFoodCooldown = 22000; // ~20-30s between golden apples
  const GOLDEN_DURATION = 8000; // 8s countdown
  let comboMultiplier = 1; // 1x, 2x, 3x, 4x, max 5x
  let comboTimer = 0; // ms remaining in combo
  const COMBO_DURATION = 5000; // 5s combo window
  const GOLDEN_PARTICLE_COLORS = ['#fbbf24', '#f59e0b', '#fef08a', '#ffffff'];

  function createFoodParticles(x, y) {
    const count = 14; // 12-16 particles
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const speed = 1.8 + Math.random() * 2.8;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.8 + Math.random() * 1.8,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        life: 1.0,
        decay: 0.035 + Math.random() * 0.02
      });
    }
  }

  function createGoldenParticles(x, y, count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const speed = 1.6 + Math.random() * 2.8;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.8 + Math.random() * 1.8,
        color: GOLDEN_PARTICLE_COLORS[Math.floor(Math.random() * GOLDEN_PARTICLE_COLORS.length)],
        life: 1.0,
        decay: 0.03 + Math.random() * 0.02
      });
    }
  }

  function createFloatingText(text, x, y, color = '#00f0ff') {
    floatingTexts.push({
      text: text,
      x: x,
      y: y,
      color: color,
      alpha: 1.0,
      vy: -1.2
    });
  }

  function triggerWallPortal(exitEdge, entryEdge) {
    wallGlows.push({
      edge: exitEdge,
      color: '#00f0ff', // Cyan portal glow
      alpha: 0.85
    });
    wallGlows.push({
      edge: entryEdge,
      color: '#a855f7', // Purple portal glow
      alpha: 0.85
    });
  }

  // 4. Sound Helpers using PlayZone Audio Engine
  function playSound(type) {
    if (!window.playZoneAudio || !window.playZoneAudio.enabled) return;

    switch (type) {
      case 'turn':
        window.playZoneAudio.playTone(320, 'sine', 0.04, 0.06);
        break;
      case 'eat':
        // Ascending pleasant double-tone
        window.playZoneAudio.playTone(600, 'triangle', 0.07, 0.16);
        setTimeout(() => {
          if (window.playZoneAudio && window.playZoneAudio.enabled) {
            window.playZoneAudio.playTone(900, 'triangle', 0.09, 0.18);
          }
        }, 50);
        break;
      case 'goldenSpawn':
        // Shimmering ascending chime
        window.playZoneAudio.playTone(587.33, 'sine', 0.06, 0.12);
        setTimeout(() => {
          if (window.playZoneAudio && window.playZoneAudio.enabled) {
            window.playZoneAudio.playTone(880, 'sine', 0.08, 0.14);
          }
        }, 70);
        break;
      case 'goldenEat':
        // Rich harmonic fanfare for +50 bonus
        window.playZoneAudio.playTone(784, 'triangle', 0.08, 0.2);
        setTimeout(() => {
          if (window.playZoneAudio && window.playZoneAudio.enabled) {
            window.playZoneAudio.playTone(987.77, 'triangle', 0.08, 0.2);
          }
        }, 60);
        setTimeout(() => {
          if (window.playZoneAudio && window.playZoneAudio.enabled) {
            window.playZoneAudio.playTone(1174.66, 'triangle', 0.12, 0.25);
          }
        }, 120);
        break;
      case 'combo':
        // Dynamic pitch based on combo multiplier (520Hz up to 1070Hz)
        const pitch = 520 + Math.min(5, comboMultiplier) * 110;
        window.playZoneAudio.playTone(pitch, 'sine', 0.07, 0.16);
        break;
      case 'gameover':
        window.playZoneAudio.playGameOver();
        break;
      case 'newbest':
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

  // 5. CrazyGames HTML5 SDK v3 Integration Module
  let isCrazyGamesSDKInitialized = false;
  let isCrazyGamesGameplayRunning = false;
  let sdkInitPromise = null;

  async function initCrazyGamesSDK() {
    if (typeof window === 'undefined' || !window.CrazyGames || !window.CrazyGames.SDK) {
      console.log('[CrazyGames SDK] SDK script not available on window. Game running in standalone mode.');
      return;
    }

    try {
      console.log('[CrazyGames SDK] Initializing CrazyGames SDK v3...');
      await window.CrazyGames.SDK.init();
      isCrazyGamesSDKInitialized = true;
      const env = window.CrazyGames.SDK.environment;
      console.log(`[CrazyGames SDK] Initialized successfully. Environment: "${env}"`);
      if (env === 'disabled') {
        console.log('[CrazyGames SDK] Environment is disabled (running on Vercel/external domain). SDK methods will be safely bypassed.');
      }
    } catch (err) {
      isCrazyGamesSDKInitialized = false;
      console.warn('[CrazyGames SDK] Initialization encountered an error:', err);
    }
  }

  function isCrazyGamesAvailable() {
    if (!isCrazyGamesSDKInitialized) return false;
    if (typeof window === 'undefined' || !window.CrazyGames || !window.CrazyGames.SDK) return false;
    const env = window.CrazyGames.SDK.environment;
    // Environments: 'crazygames', 'local', or 'disabled'
    // SDK methods must never be invoked in a disabled environment
    if (env === 'disabled') {
      return false;
    }
    return true;
  }

  async function crazyGamesStartGameplay() {
    if (isCrazyGamesGameplayRunning) {
      console.log('[CrazyGames SDK] gameplayStart() skipped: gameplay already marked active.');
      return;
    }
    isCrazyGamesGameplayRunning = true;

    if (sdkInitPromise) {
      try {
        await sdkInitPromise;
      } catch (_) {}
    }

    if (!isCrazyGamesAvailable()) {
      console.log('[CrazyGames SDK] gameplayStart() bypassed: SDK unavailable or environment disabled.');
      return;
    }

    try {
      if (window.CrazyGames.SDK.game && typeof window.CrazyGames.SDK.game.gameplayStart === 'function') {
        window.CrazyGames.SDK.game.gameplayStart();
        console.log('[CrazyGames SDK] gameplayStart() called.');
      }
    } catch (err) {
      console.warn('[CrazyGames SDK] Error calling gameplayStart():', err);
    }
  }

  async function crazyGamesStopGameplay() {
    if (!isCrazyGamesGameplayRunning) {
      console.log('[CrazyGames SDK] gameplayStop() skipped: gameplay already marked stopped.');
      return;
    }
    isCrazyGamesGameplayRunning = false;

    if (sdkInitPromise) {
      try {
        await sdkInitPromise;
      } catch (_) {}
    }

    if (!isCrazyGamesAvailable()) {
      console.log('[CrazyGames SDK] gameplayStop() bypassed: SDK unavailable or environment disabled.');
      return;
    }

    try {
      if (window.CrazyGames.SDK.game && typeof window.CrazyGames.SDK.game.gameplayStop === 'function') {
        window.CrazyGames.SDK.game.gameplayStop();
        console.log('[CrazyGames SDK] gameplayStop() called.');
      }
    } catch (err) {
      console.warn('[CrazyGames SDK] Error calling gameplayStop():', err);
    }
  }

  // 6. Game Initialization & Reset
  function setupHiDPI() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(LOGICAL_WIDTH * dpr);
    canvas.height = Math.round(LOGICAL_HEIGHT * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initGame() {
    setupHiDPI();
    bestScoreEl.textContent = bestScore;
    updateSoundUI();
    resetSnake();
    drawScene();
    setupEventListeners();
    sdkInitPromise = initCrazyGamesSDK();
  }

  function resetSnake() {
    snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    inputQueue = [];
    particles = [];
    floatingTexts = [];
    wallGlows = [];
    goldenFood = null;
    goldenFoodCooldown = getRandomGoldenCooldown();
    comboMultiplier = 1;
    comboTimer = 0;
    foodsEatenCount = 0;
    score = 0;
    currentSpeed = BASE_SPEED;
    currentScoreEl.textContent = '0';
    speedLevelEl.textContent = '1.0x';
    spawnFood();
  }

  function getEmptyCells() {
    const occupied = new Set();
    for (let i = 0; i < snake.length; i++) {
      occupied.add(`${snake[i].x},${snake[i].y}`);
    }
    const empty = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        if (!occupied.has(`${x},${y}`)) {
          empty.push({ x, y });
        }
      }
    }
    return empty;
  }

  function spawnFood() {
    let emptyCells = getEmptyCells();
    // Normal food must never spawn on the golden apple
    if (goldenFood) {
      emptyCells = emptyCells.filter(c => !(c.x === goldenFood.x && c.y === goldenFood.y));
    }
    if (emptyCells.length === 0) {
      triggerVictory();
      return;
    }
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    food = emptyCells[randomIndex];
  }

  function getRandomGoldenCooldown() {
    // 20 to 30 seconds of active gameplay between golden apples
    return 20000 + Math.random() * 10000;
  }

  function spawnGoldenFood() {
    if (goldenFood) return;
    // Golden apple must never spawn on snake or normal food
    const emptyCells = getEmptyCells().filter(c => !(c.x === food.x && c.y === food.y));
    if (emptyCells.length === 0) {
      goldenFoodCooldown = 5000; // Retry shortly if no space
      return;
    }

    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const cell = emptyCells[randomIndex];
    goldenFood = {
      x: cell.x,
      y: cell.y,
      maxDuration: GOLDEN_DURATION,
      remaining: GOLDEN_DURATION,
      pulse: 0
    };

    const gx = cell.x * CELL_SIZE + CELL_SIZE / 2;
    const gy = cell.y * CELL_SIZE + CELL_SIZE / 2;
    createGoldenParticles(gx, gy, 14);
    createFloatingText('★ GOLDEN APPLE! ★', gx, gy - 8, '#fbbf24');
    playSound('goldenSpawn');
  }

  function triggerVictory() {
    gameState = 'gameover';
    pauseToggleBtn.disabled = true;

    // CrazyGames SDK: Stop gameplay on victory
    crazyGamesStopGameplay();

    // Clean up temporary Phase 3 state
    goldenFood = null;
    comboMultiplier = 1;
    comboTimer = 0;

    finalScoreVal.textContent = score;
    const isNewBest = score > bestScore;

    if (isNewBest) {
      bestScore = score;
      localStorage.setItem(STORAGE_KEY, bestScore);
      bestScoreEl.textContent = bestScore;
      finalBestVal.textContent = bestScore;
      newBestBadge.classList.remove('hidden');
    } else {
      finalBestVal.textContent = bestScore;
      newBestBadge.classList.add('hidden');
    }

    const gameOverIcon = document.getElementById('gameOverIcon');
    const gameOverTitle = document.getElementById('gameOverTitle');
    if (gameOverIcon) gameOverIcon.textContent = '👑';
    if (gameOverTitle) gameOverTitle.textContent = 'Grid Conquered! Victory!';

    playSound('newbest');
    gameOverOverlay.classList.remove('hidden');
  }

  // 7. State Transitions (Start, Pause, Resume, Over)
  function startGame() {
    playSound('click');

    const gameOverIcon = document.getElementById('gameOverIcon');
    const gameOverTitle = document.getElementById('gameOverTitle');
    if (gameOverIcon) gameOverIcon.textContent = '💀';
    if (gameOverTitle) gameOverTitle.textContent = 'Game Over!';

    resetSnake();
    gameState = 'running';

    startOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');

    pauseToggleBtn.disabled = false;
    pauseBtnIcon.textContent = '⏸️';
    pauseBtnLabel.textContent = 'Pause';

    lastTickTime = performance.now();
    lastFrameTime = performance.now();
    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);

    // CrazyGames SDK: Stop any previous run before starting a fresh gameplay session
    if (isCrazyGamesGameplayRunning) {
      crazyGamesStopGameplay();
    }
    crazyGamesStartGameplay();
  }

  function pauseGame(isAutoPause = false) {
    if (gameState !== 'running') return;
    if (!isAutoPause) {
      playSound('click');
      // CrazyGames SDK: Stop gameplay on manual pause
      crazyGamesStopGameplay();
    }
    gameState = 'paused';
    pauseOverlay.classList.remove('hidden');
    pauseBtnIcon.textContent = '▶';
    pauseBtnLabel.textContent = 'Resume';
  }

  function resumeGame() {
    if (gameState !== 'paused') return;
    playSound('click');
    gameState = 'running';
    pauseOverlay.classList.add('hidden');
    pauseBtnIcon.textContent = '⏸️';
    pauseBtnLabel.textContent = 'Pause';
    lastTickTime = performance.now();
    lastFrameTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);

    // CrazyGames SDK: Resume gameplay
    crazyGamesStartGameplay();
  }

  function togglePause() {
    if (gameState === 'running') {
      pauseGame(false);
    } else if (gameState === 'paused') {
      resumeGame();
    }
  }

  function triggerGameOver() {
    gameState = 'gameover';
    pauseToggleBtn.disabled = true;

    // CrazyGames SDK: Stop gameplay on game over
    crazyGamesStopGameplay();

    // Clean up temporary Phase 3 state
    goldenFood = null;
    comboMultiplier = 1;
    comboTimer = 0;

    // Subtle 2-3px Screen Shake (respects prefers-reduced-motion)
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      const container = document.getElementById('canvasContainer');
      if (container) {
        container.classList.remove('shake-impact');
        void container.offsetWidth; // Force CSS reflow to retrigger animation
        container.classList.add('shake-impact');
        setTimeout(() => {
          container.classList.remove('shake-impact');
        }, 320);
      }
    }

    const gameOverIcon = document.getElementById('gameOverIcon');
    const gameOverTitle = document.getElementById('gameOverTitle');
    if (gameOverIcon) gameOverIcon.textContent = '💀';
    if (gameOverTitle) gameOverTitle.textContent = 'Game Over!';

    finalScoreVal.textContent = score;
    const isNewBest = score > bestScore;

    if (isNewBest) {
      bestScore = score;
      localStorage.setItem(STORAGE_KEY, bestScore);
      bestScoreEl.textContent = bestScore;
      finalBestVal.textContent = bestScore;
      newBestBadge.classList.remove('hidden');
      playSound('newbest');
    } else {
      finalBestVal.textContent = bestScore;
      newBestBadge.classList.add('hidden');
      playSound('gameover');
    }

    gameOverOverlay.classList.remove('hidden');
  }

  // 7. Movement & Direction Control
  function setDirection(newDir) {
    if (gameState !== 'running') return;
    if (inputQueue.length >= 2) return;

    // Reference direction is the last queued direction, or current direction if queue empty
    const lastDir = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : direction;

    // Ignore duplicate inputs in the same direction
    if (newDir.x === lastDir.x && newDir.y === lastDir.y) return;

    // Prevent 180-degree immediate reversal into own neck
    const isOpposite = (newDir.x === -lastDir.x && newDir.x !== 0) ||
                       (newDir.y === -lastDir.y && newDir.y !== 0);

    if (!isOpposite) {
      inputQueue.push(newDir);
      playSound('turn');
    }
  }

  // 8. Core Game Loop & Arcade Progression
  function updateTimers(dt) {
    // 1. Combo Timer Countdown
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) {
        comboTimer = 0;
        comboMultiplier = 1;
      }
    }

    // 2. Golden Apple Spawner & Countdown
    if (goldenFood) {
      goldenFood.remaining -= dt;
      goldenFood.pulse += 0.08;
      if (goldenFood.remaining <= 0) {
        // Expiration puff particles
        const gx = goldenFood.x * CELL_SIZE + CELL_SIZE / 2;
        const gy = goldenFood.y * CELL_SIZE + CELL_SIZE / 2;
        createGoldenParticles(gx, gy, 8);
        goldenFood = null;
        goldenFoodCooldown = getRandomGoldenCooldown();
      }
    } else {
      goldenFoodCooldown -= dt;
      if (goldenFoodCooldown <= 0) {
        spawnGoldenFood();
      }
    }
  }

  function gameLoop(currentTime) {
    if (gameState !== 'running') return;

    if (!lastFrameTime) lastFrameTime = currentTime;
    const dt = Math.min(100, currentTime - lastFrameTime);
    lastFrameTime = currentTime;

    foodPulse += 0.08;
    updateTimers(dt);

    // Tick logic when enough time has elapsed
    if (currentTime - lastTickTime >= currentSpeed) {
      lastTickTime = currentTime;
      update();
    }

    drawScene();

    if (gameState === 'running') {
      animationFrameId = requestAnimationFrame(gameLoop);
    }
  }

  function handleFoodEaten(isGolden) {
    // 1. Combo Streak Logic
    if (comboTimer > 0) {
      comboMultiplier = Math.min(5, comboMultiplier + 1);
    } else {
      comboMultiplier = 1;
    }
    comboTimer = COMBO_DURATION;

    // 2. Score Calculation
    const basePoints = isGolden ? 50 : 10;
    const earnedPoints = basePoints * comboMultiplier;
    score += earnedPoints;
    currentScoreEl.textContent = score;

    // 3. Audio & Particle Feedback
    const targetFood = isGolden ? goldenFood : food;
    const cx = targetFood.x * CELL_SIZE + CELL_SIZE / 2;
    const cy = targetFood.y * CELL_SIZE + CELL_SIZE / 2;

    if (isGolden) {
      playSound('goldenEat');
      createGoldenParticles(cx, cy, 18);
      createFloatingText(`+${earnedPoints}`, cx, cy - 6, '#fbbf24');
    } else {
      playSound('eat');
      createFoodParticles(cx, cy);
      createFloatingText(`+${earnedPoints}`, cx, cy - 6, '#00f0ff');
    }

    // Floating Combo notification on streak increase
    if (comboMultiplier > 1) {
      playSound('combo');
      setTimeout(() => {
        const comboColor = comboMultiplier >= 5 ? '#fbbf24' : (comboMultiplier >= 3 ? '#ec4899' : '#38bdf8');
        createFloatingText(`x${comboMultiplier} COMBO!`, cx, cy - 20, comboColor);
      }, 60);
    }

    // 4. Balanced Progression
    // Smooth speed progression every 4 foods eaten, avoiding skips from combo multipliers
    foodsEatenCount++;
    if (foodsEatenCount % 4 === 0 && currentSpeed > MIN_SPEED) {
      currentSpeed = Math.max(MIN_SPEED, currentSpeed - 5);
      const speedMultiplier = (BASE_SPEED / currentSpeed).toFixed(1);
      speedLevelEl.textContent = `${speedMultiplier}x`;
    }
  }

  function update() {
    // Consume next direction from queue if available
    if (inputQueue.length > 0) {
      direction = inputQueue.shift();
    }

    const head = {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y
    };

    // 1. Wall Wrap-Around (Screen Wrapping) with Portal FX
    if (head.x < 0) {
      head.x = GRID_SIZE - 1; // Left to Right
      triggerWallPortal('left', 'right');
    } else if (head.x >= GRID_SIZE) {
      head.x = 0;             // Right to Left
      triggerWallPortal('right', 'left');
    }

    if (head.y < 0) {
      head.y = GRID_SIZE - 1; // Top to Bottom
      triggerWallPortal('top', 'bottom');
    } else if (head.y >= GRID_SIZE) {
      head.y = 0;             // Bottom to Top
      triggerWallPortal('bottom', 'top');
    }

    // 2. Check Self-Collision
    // Allow movement into tail's current cell only when tail moves away (no food eaten)
    const willEatNormal = (head.x === food.x && head.y === food.y);
    const willEatGolden = (goldenFood && head.x === goldenFood.x && head.y === goldenFood.y);
    const willEatFood = willEatNormal || willEatGolden;
    const checkLimit = willEatFood ? snake.length : snake.length - 1;

    for (let i = 0; i < checkLimit; i++) {
      if (head.x === snake[i].x && head.y === snake[i].y) {
        triggerGameOver();
        return;
      }
    }

    // Move Snake
    snake.unshift(head);

    // 3. Handle Food Collision
    if (willEatGolden) {
      handleFoodEaten(true);
      goldenFood = null;
      goldenFoodCooldown = getRandomGoldenCooldown();
    } else if (willEatNormal) {
      handleFoodEaten(false);
      spawnFood();
    } else {
      snake.pop(); // Remove tail if no food eaten
    }
  }

  // 9. Canvas Rendering
  function drawScene() {
    // Clear canvas using logical dimensions
    ctx.fillStyle = '#080b12';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Draw Subtle Cyber Background Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, LOGICAL_HEIGHT);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(LOGICAL_WIDTH, i * CELL_SIZE);
      ctx.stroke();
    }

    // Render Wall Portal Glow Flare along borders
    drawWallGlows();

    // Draw Glowing Food Orb
    const foodCenterX = food.x * CELL_SIZE + CELL_SIZE / 2;
    const foodCenterY = food.y * CELL_SIZE + CELL_SIZE / 2;
    const pulseRadius = (CELL_SIZE / 2.6) + Math.sin(foodPulse) * 1.5;

    ctx.save();
    ctx.shadowColor = '#ec4899';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(foodCenterX, foodCenterY, pulseRadius, 0, Math.PI * 2);
    ctx.fill();

    // Food inner bright core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(foodCenterX, foodCenterY, pulseRadius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Phase 3 Golden Apple with visible countdown arc
    drawGoldenFood();

    // Draw Neon Snake
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      const x = segment.x * CELL_SIZE;
      const y = segment.y * CELL_SIZE;
      const pad = 1.5;

      ctx.save();
      if (isHead) {
        // Bright cyan head with glow
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#00f0ff';
      } else {
        // Body color gradient toward purple
        const ratio = index / snake.length;
        ctx.shadowColor = 'rgba(168, 85, 247, 0.5)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = ratio > 0.6 ? '#9333ea' : '#a855f7';
      }

      // Rounded rectangle for cyber segment
      const radius = isHead ? 6 : 4;
      drawRoundedRect(ctx, x + pad, y + pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2, radius);
      ctx.fill();

      // Draw eyes on the head
      if (isHead) {
        ctx.fillStyle = '#05070a';
        ctx.shadowBlur = 0;
        const eyeOffset = 5;
        const eyeSize = 3;

        let eye1 = { x: x + eyeOffset, y: y + eyeOffset };
        let eye2 = { x: x + CELL_SIZE - eyeOffset, y: y + eyeOffset };

        if (direction.x === 1) { // Moving right
          eye1 = { x: x + CELL_SIZE - 6, y: y + 5 };
          eye2 = { x: x + CELL_SIZE - 6, y: y + CELL_SIZE - 8 };
        } else if (direction.x === -1) { // Moving left
          eye1 = { x: x + 6, y: y + 5 };
          eye2 = { x: x + 6, y: y + CELL_SIZE - 8 };
        } else if (direction.y === 1) { // Moving down
          eye1 = { x: x + 5, y: y + CELL_SIZE - 6 };
          eye2 = { x: x + CELL_SIZE - 8, y: y + CELL_SIZE - 6 };
        } else if (direction.y === -1) { // Moving up
          eye1 = { x: x + 5, y: y + 6 };
          eye2 = { x: x + CELL_SIZE - 8, y: y + 6 };
        }

        ctx.beginPath();
        ctx.arc(eye1.x, eye1.y, eyeSize, 0, Math.PI * 2);
        ctx.arc(eye2.x, eye2.y, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    // Render Neon Particles on top
    drawParticles();

    // Render Floating Score Popups on top
    drawFloatingTexts();

    // Render Phase 3 Combo Streak HUD on top
    drawComboHUD();
  }

  function drawGoldenFood() {
    if (!goldenFood) return;

    const gx = goldenFood.x * CELL_SIZE + CELL_SIZE / 2;
    const gy = goldenFood.y * CELL_SIZE + CELL_SIZE / 2;
    const pulse = Math.sin(goldenFood.pulse);
    const baseRadius = (CELL_SIZE / 2.5);
    const pulseRadius = baseRadius + pulse * 1.2;

    ctx.save();

    // 1. Countdown Ring around Golden Apple
    const timerRatio = Math.max(0, goldenFood.remaining / goldenFood.maxDuration);
    const ringRadius = (CELL_SIZE / 2) + 2.5;

    // Background track ring
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(gx, gy, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Active countdown arc (depleting clockwise)
    const isUrgent = goldenFood.remaining < 2500;
    const ringColor = (isUrgent && Math.floor(goldenFood.remaining / 200) % 2 === 0) ? '#ef4444' : '#fbbf24';
    ctx.strokeStyle = ringColor;
    ctx.shadowColor = ringColor;
    ctx.shadowBlur = isUrgent ? 10 : 6;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    // Arc starts from -Math.PI / 2 (top) clockwise
    ctx.arc(gx, gy, ringRadius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * timerRatio), false);
    ctx.stroke();

    // 2. Outer Golden Glow & Apple Body
    ctx.shadowColor = ringColor;
    ctx.shadowBlur = 16 + pulse * 4;

    const grad = ctx.createRadialGradient(gx - 2, gy - 2, 1, gx, gy, Math.max(1, pulseRadius));
    grad.addColorStop(0, '#fffbeb');
    grad.addColorStop(0.4, '#fbbf24');
    grad.addColorStop(1, '#d97706');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.arc(gx, gy, Math.max(1, pulseRadius), 0, Math.PI * 2);
    ctx.fill();

    // 3. Apple leaf accent
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(gx + 2, gy - pulseRadius - 1, 2.5, 1.2, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // 4. Sparkle highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(gx - 2, gy - 2, pulseRadius * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawComboHUD() {
    if (comboMultiplier <= 1 || comboTimer <= 0) return;

    ctx.save();
    const x = 12;
    const y = 12;
    const width = 114;
    const height = 26;
    const radius = 6;
    const comboRatio = Math.max(0, comboTimer / COMBO_DURATION);

    // Multiplier theme colors
    let themeColor = '#00f0ff';
    if (comboMultiplier === 3) themeColor = '#a855f7';
    else if (comboMultiplier === 4) themeColor = '#ec4899';
    else if (comboMultiplier >= 5) themeColor = '#fbbf24';

    // Badge Background
    ctx.fillStyle = 'rgba(8, 12, 22, 0.88)';
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = themeColor;
    ctx.shadowBlur = comboMultiplier >= 5 ? 12 : 6;
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.fill();
    ctx.stroke();

    // Text: e.g. "COMBO x3" or "MAX x5"
    ctx.shadowBlur = 4;
    ctx.fillStyle = themeColor;
    ctx.font = '700 11px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const label = comboMultiplier >= 5 ? '★ MAX COMBO x5' : `⚡ COMBO x${comboMultiplier}`;
    ctx.fillText(label, x + 8, y + 10);

    // Depleting timer bar at bottom of pill
    const barX = x + 8;
    const barY = y + 19;
    const barMaxWidth = width - 16;
    const barWidth = barMaxWidth * comboRatio;

    // Track
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(barX, barY, barMaxWidth, 2.5);

    // Active progress
    ctx.fillStyle = themeColor;
    ctx.shadowColor = themeColor;
    ctx.shadowBlur = 4;
    ctx.fillRect(barX, barY, barWidth, 2.5);

    ctx.restore();
  }

  function drawWallGlows() {
    for (let i = wallGlows.length - 1; i >= 0; i--) {
      const wg = wallGlows[i];
      wg.alpha -= 0.045; // ~20 frames / ~300ms fade
      if (wg.alpha <= 0) {
        wallGlows.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, wg.alpha);
      const thickness = 28;
      let grad;

      if (wg.edge === 'left') {
        grad = ctx.createLinearGradient(0, 0, thickness, 0);
        grad.addColorStop(0, wg.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, thickness, LOGICAL_HEIGHT);
      } else if (wg.edge === 'right') {
        grad = ctx.createLinearGradient(LOGICAL_WIDTH, 0, LOGICAL_WIDTH - thickness, 0);
        grad.addColorStop(0, wg.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(LOGICAL_WIDTH - thickness, 0, thickness, LOGICAL_HEIGHT);
      } else if (wg.edge === 'top') {
        grad = ctx.createLinearGradient(0, 0, 0, thickness);
        grad.addColorStop(0, wg.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, LOGICAL_WIDTH, thickness);
      } else if (wg.edge === 'bottom') {
        grad = ctx.createLinearGradient(0, LOGICAL_HEIGHT, 0, LOGICAL_HEIGHT - thickness);
        grad.addColorStop(0, wg.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, LOGICAL_HEIGHT - thickness, LOGICAL_WIDTH, thickness);
      }
      ctx.restore();
    }
  }

  function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94; // subtle friction
      p.vy *= 0.94;
      p.life -= p.decay;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.radius * p.life), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.028; // ~35 frames / ~0.58s fade

      if (ft.alpha <= 0) {
        floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = '700 13px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 10;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  function drawRoundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  // 10. Event Listeners (Keyboard, Touch Swipe, D-Pad, Buttons)
  function setupEventListeners() {
    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      // Prevent browser scroll with arrows and spacebar
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ' || e.code === 'Space') {
        if (gameState === 'running' || gameState === 'paused') {
          togglePause();
        } else if (gameState === 'idle') {
          startGame();
        }
        return;
      }

      if (e.key === 'Enter') {
        if (gameState === 'idle' || gameState === 'gameover') {
          startGame();
        }
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        startGame();
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          setDirection({ x: 1, y: 0 });
          break;
      }
    });

    // Touch D-Pad Buttons
    const dpadMap = [
      { el: dpadUp, dir: { x: 0, y: -1 } },
      { el: dpadDown, dir: { x: 0, y: 1 } },
      { el: dpadLeft, dir: { x: -1, y: 0 } },
      { el: dpadRight, dir: { x: 1, y: 0 } }
    ];

    dpadMap.forEach(({ el, dir }) => {
      const handlePress = (e) => {
        e.preventDefault();
        if (gameState === 'idle') {
          startGame();
        }
        setDirection(dir);
      };

      el.addEventListener('touchstart', handlePress, { passive: false });
      el.addEventListener('mousedown', handlePress);
    });

    // Canvas Swipe Gestures with touchmove
    const canvasContainer = document.getElementById('canvasContainer');

    canvasContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        swipeTriggered = false;
      }
    }, { passive: true });

    canvasContainer.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 1 || swipeTriggered) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const dx = currentX - touchStartX;
      const dy = currentY - touchStartY;

      if (Math.abs(dx) >= SWIPE_THRESHOLD || Math.abs(dy) >= SWIPE_THRESHOLD) {
        if (e.cancelable) e.preventDefault();
        swipeTriggered = true;

        if (gameState === 'idle') {
          startGame();
        }

        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal swipe
          setDirection(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
        } else {
          // Vertical swipe
          setDirection(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
        }
      }
    }, { passive: false });

    canvasContainer.addEventListener('touchend', () => {
      swipeTriggered = false;
    }, { passive: true });

    canvasContainer.addEventListener('touchcancel', () => {
      swipeTriggered = false;
    }, { passive: true });

    // Auto-pause when page loses focus or tab is hidden
    // Preserves local game pause without triggering CrazyGames SDK lifecycle (CrazyGames handles focus changes itself)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && gameState === 'running') {
        pauseGame(true);
      }
    });

    window.addEventListener('blur', () => {
      if (gameState === 'running') {
        pauseGame(true);
      }
    });

    // Window resize to maintain High-DPI sharpness
    window.addEventListener('resize', () => {
      setupHiDPI();
      drawScene();
    });

    // UI Buttons
    startBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', resumeGame);
    retryBtn.addEventListener('click', startGame);
    restartFromPauseBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', () => {
      playSound('click');
      startGame();
    });
    pauseToggleBtn.addEventListener('click', togglePause);

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
