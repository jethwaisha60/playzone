/**
 * PlayZone - Neon Cyber Endless Runner Game Engine
 * HTML5 Canvas 2D, procedural vector cyber art, particle physics, Web Audio API.
 */

(function () {
  'use strict';

  // --- Constants & Config ---
  const STORAGE_KEY = 'playzone_score_endless_runner';
  const SOUND_KEY = 'playzone_sound';

  const CANVAS_WIDTH = 640;
  const CANVAS_HEIGHT = 360;
  const GROUND_Y = 295; // Ground surface level
  const GROUND_HEIGHT = CANVAS_HEIGHT - GROUND_Y; // 65px

  // Physics constants
  const BASE_GRAVITY = 0.58;
  const JUMP_IMPULSE = -11.5;
  const INITIAL_SPEED = 5.2;
  const MAX_SPEED = 10.5;
  const SLIDE_DURATION = 650; // ms

  // --- DOM Elements ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const scoreDisplay = document.getElementById('scoreDisplay');
  const distanceDisplay = document.getElementById('distanceDisplay');
  const coinsDisplay = document.getElementById('coinsDisplay');
  const bestScoreDisplay = document.getElementById('bestScoreDisplay');
  const speedDisplay = document.getElementById('speedDisplay');
  const powerupBanner = document.getElementById('powerupBanner');
  const shieldPill = document.getElementById('shieldPill');
  const magnetPill = document.getElementById('magnetPill');
  const magnetTimer = document.getElementById('magnetTimer');

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

  const mobileJumpBtn = document.getElementById('mobileJumpBtn');
  const mobileSlideBtn = document.getElementById('mobileSlideBtn');

  // Stats in Game Over Modal
  const finalScoreVal = document.getElementById('finalScoreVal');
  const finalBestVal = document.getElementById('finalBestVal');
  const finalDistVal = document.getElementById('finalDistVal');
  const finalCoinsVal = document.getElementById('finalCoinsVal');
  const finalSpeedVal = document.getElementById('finalSpeedVal');
  const newBestBadge = document.getElementById('newBestBadge');
  const gameOverMessage = document.getElementById('gameOverMessage');

  // --- Game State Variables ---
  let gameState = 'ready'; // 'ready', 'playing', 'paused', 'gameover'
  let bestScore = 0;
  let distance = 0;
  let coinsCollected = 0;
  let score = 0;
  let currentSpeed = INITIAL_SPEED;

  let animFrameId = null;
  let lastTimestamp = 0;
  let shakeFrames = 0;

  // Power-up States
  let hasShield = false;
  let magnetTimeRemaining = 0; // ms
  let invulnerabilityTimer = 0; // ms after shield break

  // Runner Character Object
  const runner = {
    x: 90,
    y: GROUND_Y - 52,
    baseWidth: 28,
    baseHeight: 52,
    slideWidth: 46,
    slideHeight: 24,
    width: 28,
    height: 52,
    vy: 0,
    isGrounded: true,
    isSliding: false,
    slideEndTime: 0,
    runFrame: 0
  };

  // World lists
  let obstacles = [];
  let coins = [];
  let powerups = [];
  let particles = [];
  let floatingTexts = [];

  // Parallax environment
  let bgOffsetFar = 0;
  let bgOffsetMid = 0;
  let groundOffset = 0;
  let citySkyline = [];
  let stars = [];

  // Spawn timers
  let nextObstacleDistance = 280;

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

  function playJumpSound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      window.playZoneAudio.playTone(520, 'sine', 0.1, 0.18);
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playSlideSound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      window.playZoneAudio.playTone(280, 'triangle', 0.12, 0.14);
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playCoinSound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      window.playZoneAudio.playTone(980, 'sine', 0.08, 0.2);
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playPowerupSound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      const notes = [587, 740, 880, 1175]; // D5, F#5, A5, D6
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          if (window.playZoneAudio) window.playZoneAudio.playTone(freq, 'triangle', 0.12, 0.2);
        }, idx * 60);
      });
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playShieldBreakSound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      window.playZoneAudio.playTone(240, 'sawtooth', 0.2, 0.25);
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playCrashSound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      window.playZoneAudio.playTone(110, 'sawtooth', 0.3, 0.35);
      setTimeout(() => {
        if (window.playZoneAudio) window.playZoneAudio.playTone(60, 'sawtooth', 0.35, 0.4);
      }, 50);
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
    bestScoreDisplay.textContent = `${bestScore} pts`;
  }

  function saveBestScoreIfNeeded() {
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(STORAGE_KEY, bestScore.toString());
      bestScoreDisplay.textContent = `${bestScore} pts`;
      return true;
    }
    return false;
  }

  // --- Scoreboard UI Updates ---
  function updateScoreboard() {
    score = Math.floor(distance) + (coinsCollected * 10);

    scoreDisplay.textContent = score;
    distanceDisplay.textContent = `${Math.floor(distance)} m`;
    coinsDisplay.textContent = coinsCollected;

    const mult = (currentSpeed / INITIAL_SPEED).toFixed(1);
    speedDisplay.textContent = `${mult}x`;

    // Power-up Banner UI
    if (hasShield || magnetTimeRemaining > 0) {
      powerupBanner.classList.remove('hidden');
      if (hasShield) {
        shieldPill.style.display = 'inline-flex';
      } else {
        shieldPill.style.display = 'none';
      }

      if (magnetTimeRemaining > 0) {
        magnetPill.style.display = 'inline-flex';
        magnetTimer.textContent = `${Math.ceil(magnetTimeRemaining / 1000)}s`;
      } else {
        magnetPill.style.display = 'none';
      }
    } else {
      powerupBanner.classList.add('hidden');
    }
  }

  function updateSoundUI() {
    const enabled = isSoundEnabled();
    if (soundIcon) {
      soundIcon.textContent = enabled ? '🔊' : '🔇';
    }
  }

  // --- Environment & Background Generation ---
  function initEnvironment() {
    // Stars
    stars = [];
    for (let i = 0; i < 40; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * (GROUND_Y - 50),
        size: Math.random() * 2 + 0.8,
        speed: Math.random() * 0.4 + 0.1,
        alpha: Math.random() * 0.7 + 0.3
      });
    }

    // Distant cyber skyline buildings
    citySkyline = [];
    let curX = 0;
    while (curX < CANVAS_WIDTH + 140) {
      const w = Math.random() * 45 + 30;
      const h = Math.random() * 110 + 60;
      citySkyline.push({
        x: curX,
        width: w,
        height: h,
        hasNeon: Math.random() > 0.4
      });
      curX += w + (Math.random() * 10 + 6);
    }
  }

  // --- Character Action Controls ---
  function jump() {
    if (gameState === 'ready') {
      startRun();
      return;
    }
    if (gameState !== 'playing') return;

    if (runner.isGrounded) {
      runner.vy = JUMP_IMPULSE;
      runner.isGrounded = false;
      runner.isSliding = false;
      runner.width = runner.baseWidth;
      runner.height = runner.baseHeight;

      spawnThrustSparks(runner.x + 8, runner.y + runner.height);
      playJumpSound();
    }
  }

  function slide() {
    if (gameState === 'ready') {
      startRun();
      return;
    }
    if (gameState !== 'playing') return;

    if (runner.isGrounded && !runner.isSliding) {
      runner.isSliding = true;
      runner.width = runner.slideWidth;
      runner.height = runner.slideHeight;
      runner.y = GROUND_Y - runner.slideHeight;
      runner.slideEndTime = performance.now() + SLIDE_DURATION;

      spawnSlideSparks(runner.x + 20, GROUND_Y);
      playSlideSound();
    }
  }

  function endSlide() {
    if (runner.isSliding) {
      runner.isSliding = false;
      runner.width = runner.baseWidth;
      runner.height = runner.baseHeight;
      runner.y = GROUND_Y - runner.baseHeight;
    }
  }

  // --- Particles & Popups ---
  function spawnThrustSparks(x, y) {
    for (let i = 0; i < 6; i++) {
      particles.push({
        x: x,
        y: y,
        vx: -(Math.random() * 3 + 1),
        vy: Math.random() * 2 + 1,
        size: Math.random() * 3 + 2,
        color: Math.random() > 0.5 ? '#00f0ff' : '#ec4899',
        life: 1.0,
        decay: 0.05
      });
    }
  }

  function spawnSlideSparks(x, y) {
    for (let i = 0; i < 5; i++) {
      particles.push({
        x: x,
        y: y - 2,
        vx: -(Math.random() * 4 + 2),
        vy: -(Math.random() * 2),
        size: Math.random() * 3 + 1.5,
        color: '#fbbf24',
        life: 1.0,
        decay: 0.06
      });
    }
  }

  function spawnCrashSparks(x, y) {
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 1.5;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: ['#00f0ff', '#ec4899', '#fbbf24', '#ffffff', '#10b981'][Math.floor(Math.random() * 5)],
        life: 1.0,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  }

  function spawnFloatingText(text, x, y, color = '#00f0ff') {
    floatingTexts.push({
      text: text,
      x: x,
      y: y,
      color: color,
      alpha: 1.0,
      vy: -1.2
    });
  }

  // --- Spawning Procedural Obstacles & Collectibles ---
  function spawnObstacleCluster() {
    const roll = Math.random();

    // 1. Ground Spike Barrier (Jump over)
    if (roll < 0.32) {
      obstacles.push({
        type: 'spike',
        x: CANVAS_WIDTH + 40,
        y: GROUND_Y - 34,
        width: 32,
        height: 34
      });
      spawnCoinArc(CANVAS_WIDTH + 140, 4);
    }
    // 2. High Laser Gate (Slide under)
    else if (roll < 0.62) {
      obstacles.push({
        type: 'laser_gate',
        x: CANVAS_WIDTH + 40,
        y: 0,
        width: 32,
        height: GROUND_Y - 36 // 36px clearance at bottom for sliding!
      });
      // Ground coins to slide through
      spawnCoinRow(CANVAS_WIDTH + 40, GROUND_Y - 14, 3);
    }
    // 3. Plasma Crate / Cyber Block (Jump over)
    else if (roll < 0.84) {
      obstacles.push({
        type: 'crate',
        x: CANVAS_WIDTH + 40,
        y: GROUND_Y - 42,
        width: 38,
        height: 42
      });
      spawnCoinArc(CANVAS_WIDTH + 40, 3);
    }
    // 4. Hovering Drone (Mid-air)
    else {
      obstacles.push({
        type: 'drone',
        x: CANVAS_WIDTH + 40,
        y: GROUND_Y - 82,
        width: 34,
        height: 28,
        bobAngle: 0
      });
    }

    // Occasional Power-up Spawning (Shield or Magnet)
    if (Math.random() < 0.16 && powerups.length === 0) {
      const pType = Math.random() > 0.5 ? 'shield' : 'magnet';
      powerups.push({
        type: pType,
        x: CANVAS_WIDTH + 180,
        y: GROUND_Y - 70,
        radius: 16
      });
    }
  }

  function spawnCoinRow(startX, y, count) {
    for (let i = 0; i < count; i++) {
      coins.push({
        x: startX + i * 28,
        y: y,
        radius: 10,
        angle: Math.random() * Math.PI
      });
    }
  }

  function spawnCoinArc(startX, count) {
    for (let i = 0; i < count; i++) {
      const angle = (i / (count - 1)) * Math.PI;
      const cy = GROUND_Y - 55 - Math.sin(angle) * 45;
      coins.push({
        x: startX + i * 28,
        y: cy,
        radius: 10,
        angle: Math.random() * Math.PI
      });
    }
  }

  // --- Game Lifecycle ---
  function startRun() {
    gameState = 'playing';
    distance = 0;
    coinsCollected = 0;
    currentSpeed = INITIAL_SPEED;
    hasShield = false;
    magnetTimeRemaining = 0;
    invulnerabilityTimer = 0;
    shakeFrames = 0;

    runner.y = GROUND_Y - runner.baseHeight;
    runner.vy = 0;
    runner.isGrounded = true;
    runner.isSliding = false;
    runner.width = runner.baseWidth;
    runner.height = runner.baseHeight;

    obstacles = [];
    coins = [];
    powerups = [];
    particles = [];
    floatingTexts = [];
    nextObstacleDistance = 300;

    startOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');

    pauseToggleBtn.disabled = false;
    pauseBtnLabel.textContent = 'Pause';

    updateScoreboard();
    playUiClick();
  }

  function pauseRun() {
    if (gameState !== 'playing') return;

    gameState = 'paused';
    pauseOverlay.classList.remove('hidden');
    pauseBtnLabel.textContent = 'Resume';
    playUiClick();
  }

  function resumeRun() {
    if (gameState !== 'paused') return;

    gameState = 'playing';
    pauseOverlay.classList.add('hidden');
    pauseBtnLabel.textContent = 'Pause';
    playUiClick();
    lastTimestamp = performance.now();
  }

  function endRun() {
    gameState = 'gameover';
    pauseToggleBtn.disabled = true;

    shakeFrames = 18;
    spawnCrashSparks(runner.x + 16, runner.y + 20);
    playCrashSound();

    const isNewRecord = saveBestScoreIfNeeded();

    // Populate Game Over stats
    finalScoreVal.textContent = score;
    finalBestVal.textContent = bestScore;
    finalDistVal.textContent = `${Math.floor(distance)} m`;
    finalCoinsVal.textContent = coinsCollected;
    finalSpeedVal.textContent = `${(currentSpeed / INITIAL_SPEED).toFixed(1)}x`;

    if (isNewRecord && score > 0) {
      newBestBadge.classList.remove('hidden');
      gameOverMessage.textContent = '🏆 Electrifying sprint! You shattered your distance record!';
    } else {
      newBestBadge.classList.add('hidden');
      if (score >= 800) {
        gameOverMessage.textContent = '⚡ Legendary speed! Elite reflex navigation!';
      } else if (score >= 400) {
        gameOverMessage.textContent = 'Great run! Watch out for those overhead laser gates!';
      } else {
        gameOverMessage.textContent = 'Keep practicing! Slide early and time your jumps.';
      }
    }

    setTimeout(() => {
      gameOverOverlay.classList.remove('hidden');
      playGameOverFanfare(isNewRecord && score > 0);
    }, 500);
  }

  // --- Collision Detection ---
  function checkCollision(r, obs) {
    // 3px forgiving inset for fair, smooth arcade feel
    const rx = r.x + 3;
    const ry = r.y + 3;
    const rw = r.width - 6;
    const rh = r.height - 6;

    const ox = obs.x + 3;
    const oy = obs.y + 3;
    const ow = obs.width - 6;
    const oh = obs.height - 6;

    return (
      rx < ox + ow &&
      rx + rw > ox &&
      ry < oy + oh &&
      ry + rh > oy
    );
  }

  // --- Update Loop ---
  function update(delta) {
    if (gameState === 'ready') {
      runner.runFrame += 0.2;
      return;
    }

    if (gameState !== 'playing') {
      updateParticles();
      return;
    }

    // Distance & Speed Progression
    distance += currentSpeed * 0.05;
    currentSpeed = Math.min(MAX_SPEED, INITIAL_SPEED + (distance / 180) * 0.35);

    // Parallax background offsets
    bgOffsetFar = (bgOffsetFar + currentSpeed * 0.3) % CANVAS_WIDTH;
    bgOffsetMid = (bgOffsetMid + currentSpeed * 0.6) % CANVAS_WIDTH;
    groundOffset = (groundOffset + currentSpeed) % 24;

    // Slide timer check
    if (runner.isSliding && performance.now() >= runner.slideEndTime) {
      endSlide();
    }

    // Runner physics
    if (!runner.isGrounded) {
      runner.vy += BASE_GRAVITY;
      runner.y += runner.vy;

      // Ground landing
      if (runner.y >= GROUND_Y - runner.height) {
        runner.y = GROUND_Y - runner.height;
        runner.vy = 0;
        runner.isGrounded = true;
        spawnThrustSparks(runner.x + 8, GROUND_Y);
      }
    } else {
      runner.runFrame += currentSpeed * 0.05;
      if (runner.isSliding) {
        spawnSlideSparks(runner.x + 20, GROUND_Y);
      }
    }

    // Invulnerability timer
    if (invulnerabilityTimer > 0) {
      invulnerabilityTimer -= delta * 1000;
    }

    // Magnet timer
    if (magnetTimeRemaining > 0) {
      magnetTimeRemaining -= delta * 1000;
      if (magnetTimeRemaining < 0) magnetTimeRemaining = 0;
    }

    // Move & Manage Obstacles
    nextObstacleDistance -= currentSpeed;
    if (nextObstacleDistance <= 0) {
      spawnObstacleCluster();
      // Distance between next obstacle groups (220px to 380px)
      nextObstacleDistance = Math.floor(Math.random() * 160) + 220;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.x -= currentSpeed;

      if (obs.type === 'drone') {
        obs.bobAngle = (obs.bobAngle || 0) + 0.08;
        obs.y += Math.sin(obs.bobAngle) * 0.7;
      }

      // Check collision
      if (invulnerabilityTimer <= 0 && checkCollision(runner, obs)) {
        if (hasShield) {
          hasShield = false;
          invulnerabilityTimer = 1400; // 1.4s immunity after breaking shield
          playShieldBreakSound();
          spawnCrashSparks(runner.x + 16, runner.y + 20);
          spawnFloatingText('SHIELD BROKEN!', runner.x, runner.y - 15, '#ec4899');
        } else {
          endRun();
          return;
        }
      }

      if (obs.x + obs.width < -30) {
        obstacles.splice(i, 1);
      }
    }

    // Move & Collect Coins
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.x -= currentSpeed;
      c.angle += 0.08;

      // Magnet attraction
      if (magnetTimeRemaining > 0) {
        const dx = (runner.x + runner.width / 2) - c.x;
        const dy = (runner.y + runner.height / 2) - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 220) {
          c.x += (dx / dist) * 7.5;
          c.y += (dy / dist) * 7.5;
        }
      }

      // Coin pickup detection
      const rx = runner.x + runner.width / 2;
      const ry = runner.y + runner.height / 2;
      const cDist = Math.hypot(rx - c.x, ry - c.y);

      if (cDist < runner.width / 2 + c.radius) {
        coinsCollected++;
        playCoinSound();
        spawnFloatingText('+10', c.x, c.y - 10, '#fbbf24');
        coins.splice(i, 1);
        continue;
      }

      if (c.x + c.radius < -20) {
        coins.splice(i, 1);
      }
    }

    // Move & Collect Power-ups
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.x -= currentSpeed;

      const rx = runner.x + runner.width / 2;
      const ry = runner.y + runner.height / 2;
      const pDist = Math.hypot(rx - p.x, ry - p.y);

      if (pDist < runner.width / 2 + p.radius) {
        if (p.type === 'shield') {
          hasShield = true;
          spawnFloatingText('SHIELD ACTIVATED! 🛡️', runner.x, runner.y - 20, '#00f0ff');
        } else if (p.type === 'magnet') {
          magnetTimeRemaining = 10000; // 10s magnet
          spawnFloatingText('MAGNET ON! 🧲', runner.x, runner.y - 20, '#fbbf24');
        }

        playPowerupSound();
        powerups.splice(i, 1);
        continue;
      }

      if (p.x + p.radius < -20) {
        powerups.splice(i, 1);
      }
    }

    updateParticles();
    updateFloatingTexts();
    updateScoreboard();
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function updateFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.025;
      if (ft.alpha <= 0) floatingTexts.splice(i, 1);
    }
  }

  // --- Render Engine ---
  function render() {
    ctx.save();

    // Screen rumble on crash
    if (shakeFrames > 0) {
      shakeFrames--;
      const mag = (shakeFrames / 18) * 6;
      ctx.translate((Math.random() * 2 - 1) * mag, (Math.random() * 2 - 1) * mag);
    }

    // 1. Deep Cyber Sky Background
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    skyGrad.addColorStop(0, '#060814');
    skyGrad.addColorStop(0.65, '#0b1328');
    skyGrad.addColorStop(1, '#111d38');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Stars
    stars.forEach(s => {
      ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });

    // 3. Distant Cyber City Skyline Silhouettes
    ctx.fillStyle = '#0a1022';
    citySkyline.forEach(b => {
      const sx = b.x - bgOffsetFar;
      const sy = GROUND_Y - b.height;
      ctx.fillRect(sx, sy, b.width, b.height);
      if (b.hasNeon) {
        ctx.fillStyle = 'rgba(0, 240, 255, 0.45)';
        ctx.fillRect(sx + b.width / 2 - 1, sy - 6, 2, 6);
        ctx.fillStyle = '#0a1022';
      }
    });

    // 4. Ground (Cyber Rooftop Highway)
    renderGround();

    // 5. Obstacles
    obstacles.forEach(obs => {
      renderObstacle(obs);
    });

    // 6. Collectible Coins
    coins.forEach(c => {
      renderCoin(c);
    });

    // 7. Power-up Items
    powerups.forEach(p => {
      renderPowerup(p);
    });

    // 8. Particles
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;

    // 9. Procedural Cyber-Runner Character
    if (gameState !== 'gameover' || shakeFrames > 0) {
      renderRunner();
    }

    // 10. Floating Texts (+10, SHIELD ACTIVATED)
    floatingTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = '800 15px "JetBrains Mono", monospace';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 8;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    ctx.restore();
  }

  function renderGround() {
    const gy = GROUND_Y;

    // Ground Plate
    const groundGrad = ctx.createLinearGradient(0, gy, 0, CANVAS_HEIGHT);
    groundGrad.addColorStop(0, '#111827');
    groundGrad.addColorStop(0.5, '#0c1220');
    groundGrad.addColorStop(1, '#060913');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, gy, CANVAS_WIDTH, GROUND_HEIGHT);

    // Glowing Neon Cyan Horizon Line
    ctx.save();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(CANVAS_WIDTH, gy);
    ctx.stroke();
    ctx.restore();

    // Diagonal hazard stripes scrolling
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
    ctx.lineWidth = 2.5;
    for (let x = -30; x < CANVAS_WIDTH + 30; x += 24) {
      const sx = x - groundOffset;
      ctx.beginPath();
      ctx.moveTo(sx, gy + 3);
      ctx.lineTo(sx + 14, CANVAS_HEIGHT);
      ctx.stroke();
    }
    ctx.restore();
  }

  function renderRunner() {
    ctx.save();

    // Invulnerability blink
    if (invulnerabilityTimer > 0 && Math.floor(invulnerabilityTimer / 80) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    const rx = runner.x;
    const ry = runner.y;

    // Active Shield Bubble
    if (hasShield) {
      ctx.save();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.beginPath();
      ctx.arc(rx + runner.width / 2, ry + runner.height / 2, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (runner.isSliding) {
      // --- SLIDING POSE ---
      // Leaning torso
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(rx, ry + 4, runner.width, runner.height - 4, 8);
      ctx.fill();
      ctx.stroke();

      // Glowing Cyan Visor
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(rx + runner.width - 12, ry + 6, 10, 5);
      ctx.shadowBlur = 0;

      // Sliding Thruster sparks at back
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(rx - 4, ry + runner.height - 8, 6, 4);
    } else {
      // --- STANDING / RUNNING / JUMPING POSE ---
      const armSwing = Math.sin(runner.runFrame) * 8;
      const legSwing = Math.cos(runner.runFrame) * 10;

      // Head with Cyber Visor
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(rx + 14, ry + 10, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Neon Cyan Visor
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(rx + 14, ry + 7, 8, 4);
      ctx.shadowBlur = 0;

      // Body Torso (Cyber Jacket)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(rx + 4, ry + 18, 20, 20, 4);
      ctx.fill();
      ctx.stroke();

      // Arms
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(rx + 8, ry + 22);
      ctx.lineTo(rx + 2 + armSwing, ry + 32);
      ctx.stroke();

      // Legs with Neon Cyber Sneakers
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      // Left leg
      ctx.moveTo(rx + 9, ry + 38);
      ctx.lineTo(rx + 8 - legSwing, ry + 50);
      // Right leg
      ctx.moveTo(rx + 19, ry + 38);
      ctx.lineTo(rx + 18 + legSwing, ry + 50);
      ctx.stroke();

      // Sneakers
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(rx + 5 - legSwing, ry + 49, 7, 3);
      ctx.fillRect(rx + 15 + legSwing, ry + 49, 7, 3);
    }

    ctx.restore();
  }

  function renderObstacle(obs) {
    ctx.save();

    if (obs.type === 'spike') {
      // Ground Spikes (Hazard Neon Amber)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(obs.x, obs.y + obs.height);
      ctx.lineTo(obs.x + obs.width / 2, obs.y);
      ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (obs.type === 'laser_gate') {
      // High Overhead Laser Gate (Must Slide Under!)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.fillRect(obs.x + 8, 0, obs.width - 16, obs.height - 12);

      // Glowing Laser Emitter Cap
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.fillRect(obs.x, obs.height - 12, obs.width, 12);

      // Warning pulsing beam
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(obs.x + 6, obs.height - 2);
      ctx.lineTo(obs.x + obs.width - 6, obs.height - 2);
      ctx.stroke();
    } else if (obs.type === 'crate') {
      // Plasma Crate (Jump Over)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 6);
      ctx.fill();
      ctx.stroke();

      // Inner X cross pattern
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.beginPath();
      ctx.moveTo(obs.x + 6, obs.y + 6);
      ctx.lineTo(obs.x + obs.width - 6, obs.y + obs.height - 6);
      ctx.moveTo(obs.x + obs.width - 6, obs.y + 6);
      ctx.lineTo(obs.x + 6, obs.y + obs.height - 6);
      ctx.stroke();
    } else if (obs.type === 'drone') {
      // Hovering Drone (Slide or Jump)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Center Eye
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function renderCoin(c) {
    ctx.save();
    ctx.translate(c.x, c.y);

    const scaleX = Math.abs(Math.cos(c.angle));
    ctx.scale(scaleX, 1);

    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner concentric ring
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, c.radius * 0.55, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  function renderPowerup(p) {
    ctx.save();
    ctx.translate(p.x, p.y);

    const color = p.type === 'shield' ? '#00f0ff' : '#ec4899';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    ctx.fillStyle = 'rgba(18, 23, 36, 0.9)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Icon in center
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.type === 'shield' ? '🛡️' : '🧲', 0, 0);

    ctx.restore();
  }

  // --- Animation Frame Loop ---
  function gameLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    if (gameState !== 'paused') {
      update(delta);
    }
    render();

    animFrameId = requestAnimationFrame(gameLoop);
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        jump();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        slide();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === 'playing') pauseRun();
        else if (gameState === 'paused') resumeRun();
      } else if (e.code === 'KeyR') {
        if (gameState === 'playing' || gameState === 'paused' || gameState === 'gameover') {
          startRun();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        endSlide();
      }
    });

    // Mobile Virtual Touch Buttons
    if (mobileJumpBtn) {
      mobileJumpBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        jump();
      });
    }

    if (mobileSlideBtn) {
      mobileSlideBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        slide();
      });
      mobileSlideBtn.addEventListener('pointerup', (e) => {
        e.preventDefault();
        endSlide();
      });
      mobileSlideBtn.addEventListener('pointercancel', (e) => {
        e.preventDefault();
        endSlide();
      });
    }

    // Canvas swipe gesture detection
    let touchStartY = 0;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
      if (e.changedTouches && e.changedTouches[0]) {
        const touchEndY = e.changedTouches[0].clientY;
        const diffY = touchEndY - touchStartY;
        if (diffY < -30) {
          jump(); // Swiped up
        } else if (diffY > 30) {
          slide(); // Swiped down
        } else {
          jump(); // Simple tap jumps
        }
      }
    }, { passive: true });

    // Overlay Buttons
    startBtn.addEventListener('click', () => {
      startRun();
    });

    pauseToggleBtn.addEventListener('click', () => {
      if (gameState === 'playing') pauseRun();
      else if (gameState === 'paused') resumeRun();
    });

    resumeBtn.addEventListener('click', () => {
      resumeRun();
    });

    pauseRestartBtn.addEventListener('click', () => {
      startRun();
    });

    restartBtn.addEventListener('click', () => {
      startRun();
    });

    playAgainBtn.addEventListener('click', () => {
      startRun();
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
        pauseRun();
      }
    });
  }

  // --- Initialization ---
  function init() {
    loadBestScore();
    updateScoreboard();
    updateSoundUI();
    initEnvironment();
    setupEventListeners();

    // Start render loop in ready state
    animFrameId = requestAnimationFrame(gameLoop);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
