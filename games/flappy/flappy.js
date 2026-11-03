/**
 * PlayZone - Neon Flappy Challenge Game Engine
 * HTML5 Canvas 2D, procedural vector cyber art, Web Audio API, responsive touch/keyboard controls.
 */

(function () {
  'use strict';

  // --- Constants & Config ---
  const STORAGE_KEY = 'playzone_score_flappy';
  const SOUND_KEY = 'playzone_sound';

  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 600;
  const GROUND_HEIGHT = 70;
  const PLAYABLE_HEIGHT = CANVAS_HEIGHT - GROUND_HEIGHT; // 530px

  // Difficulty configurations
  const DIFFICULTY_CONFIG = {
    easy: {
      name: 'Easy',
      gap: 160,
      spacing: 240,
      baseSpeed: 2.2,
      gravity: 0.36,
      jumpImpulse: -7.5
    },
    medium: {
      name: 'Medium',
      gap: 138,
      spacing: 210,
      baseSpeed: 2.7,
      gravity: 0.42,
      jumpImpulse: -8.1
    },
    hard: {
      name: 'Hard',
      gap: 118,
      spacing: 185,
      baseSpeed: 3.3,
      gravity: 0.48,
      jumpImpulse: -8.7
    }
  };

  // --- DOM Elements ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const scoreDisplay = document.getElementById('scoreDisplay');
  const bestScoreDisplay = document.getElementById('bestScoreDisplay');
  const pipesDisplay = document.getElementById('pipesDisplay');
  const speedDisplay = document.getElementById('speedDisplay');

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
  const mobileFlapBtn = document.getElementById('mobileFlapBtn');

  // Stats in Game Over Modal
  const finalScoreVal = document.getElementById('finalScoreVal');
  const finalBestVal = document.getElementById('finalBestVal');
  const finalPipesVal = document.getElementById('finalPipesVal');
  const finalTimeVal = document.getElementById('finalTimeVal');
  const finalDiffVal = document.getElementById('finalDiffVal');
  const newBestBadge = document.getElementById('newBestBadge');
  const gameOverMessage = document.getElementById('gameOverMessage');

  // --- Game State Variables ---
  let currentDifficulty = 'easy';
  let gameState = 'ready'; // 'ready', 'playing', 'paused', 'gameover'
  let score = 0;
  let bestScore = 0;
  let pipesCleared = 0;
  let flightStartTime = 0;
  let flightDuration = 0;

  let animFrameId = null;
  let lastTime = 0;
  let shakeFrames = 0;

  // Background parallax layers
  let stars = [];
  let groundOffset = 0;
  let cityBuildings = [];

  // Active game objects
  let bird = {
    x: 95,
    y: 260,
    radius: 14,
    hitRadius: 11,
    velocity: 0,
    rotation: 0,
    wingAngle: 0,
    hoverTime: 0
  };

  let pipes = [];
  let particles = [];
  let scorePopups = [];

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

  function playFlapSound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      window.playZoneAudio.playTone(540, 'triangle', 0.08, 0.16);
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playScorePointSound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      window.playZoneAudio.playTone(880, 'sine', 0.12, 0.22);
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playMilestoneSound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      const notes = [659, 880, 1046]; // E5, A5, C6
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          if (window.playZoneAudio) window.playZoneAudio.playTone(freq, 'triangle', 0.14, 0.22);
        }, idx * 70);
      });
    } catch (e) {
      // Audio fallback silent
    }
  }

  function playCrashSound() {
    if (!isSoundEnabled() || !window.playZoneAudio) return;
    try {
      window.playZoneAudio.playTone(120, 'sawtooth', 0.28, 0.35);
      setTimeout(() => {
        if (window.playZoneAudio) window.playZoneAudio.playTone(65, 'sawtooth', 0.35, 0.4);
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

  // --- Scoreboard Display Updates ---
  function updateScoreboard() {
    scoreDisplay.textContent = `${score} pts`;
    pipesDisplay.textContent = pipesCleared;

    const currentSpeed = getEffectiveSpeed();
    const multiplier = (currentSpeed / DIFFICULTY_CONFIG[currentDifficulty].baseSpeed).toFixed(1);
    speedDisplay.textContent = `${multiplier}x`;
  }

  function updateSoundUI() {
    const enabled = isSoundEnabled();
    if (soundIcon) {
      soundIcon.textContent = enabled ? '🔊' : '🔇';
    }
  }

  // --- Procedural World Generation ---
  function initBackground() {
    // Generate stars with depth layers
    stars = [];
    for (let i = 0; i < 45; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * (PLAYABLE_HEIGHT - 40),
        size: Math.random() * 2 + 0.8,
        speed: Math.random() * 0.4 + 0.2,
        alpha: Math.random() * 0.6 + 0.4
      });
    }

    // Generate distant cyberpunk skyline silhouettes
    cityBuildings = [];
    let curX = 0;
    while (curX < CANVAS_WIDTH + 100) {
      const bWidth = Math.random() * 35 + 25;
      const bHeight = Math.random() * 120 + 70;
      cityBuildings.push({
        x: curX,
        width: bWidth,
        height: bHeight,
        windows: Math.random() > 0.3
      });
      curX += bWidth + (Math.random() * 8 + 4);
    }
  }

  function getEffectiveSpeed() {
    const cfg = DIFFICULTY_CONFIG[currentDifficulty];
    // Speed increases smoothly every 4 points cleared, up to +1.2 max
    const speedBoost = Math.min(1.2, Math.floor(score / 4) * 0.08);
    return cfg.baseSpeed + speedBoost;
  }

  function spawnPipe(startX) {
    const cfg = DIFFICULTY_CONFIG[currentDifficulty];
    const gap = cfg.gap;
    const minTop = 60;
    const maxTop = PLAYABLE_HEIGHT - gap - 60;
    const topHeight = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;

    pipes.push({
      x: startX,
      width: 56,
      capWidth: 64,
      capHeight: 22,
      top: topHeight,
      bottom: topHeight + gap,
      passed: false
    });
  }

  function spawnFlapParticles() {
    for (let i = 0; i < 4; i++) {
      particles.push({
        x: bird.x - 12,
        y: bird.y + (Math.random() * 8 - 4),
        vx: -(Math.random() * 2 + 1.5),
        vy: (Math.random() * 2 - 1),
        size: Math.random() * 3 + 2,
        color: Math.random() > 0.5 ? '#00f0ff' : '#ec4899',
        life: 1.0,
        decay: Math.random() * 0.04 + 0.04
      });
    }
  }

  function spawnCrashParticles(x, y) {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1.5;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: ['#00f0ff', '#ec4899', '#a855f7', '#fbbf24', '#ffffff'][Math.floor(Math.random() * 5)],
        life: 1.0,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  }

  function spawnScorePopup(x, y) {
    scorePopups.push({
      x: x,
      y: y,
      text: '+1',
      alpha: 1.0,
      vy: -1.2
    });
  }

  // --- Input & Flap Handling ---
  function handleFlap() {
    if (gameState === 'ready') {
      startFlight();
      return;
    }

    if (gameState === 'playing') {
      const cfg = DIFFICULTY_CONFIG[currentDifficulty];
      bird.velocity = cfg.jumpImpulse;
      bird.wingAngle = -Math.PI / 3; // Wing snaps up
      spawnFlapParticles();
      playFlapSound();
    }
  }

  // --- Game Lifecycle ---
  function startFlight() {
    gameState = 'playing';
    score = 0;
    pipesCleared = 0;
    flightStartTime = performance.now();
    flightDuration = 0;
    shakeFrames = 0;

    bird.x = 95;
    bird.y = 260;
    bird.velocity = DIFFICULTY_CONFIG[currentDifficulty].jumpImpulse * 0.7;
    bird.rotation = -0.2;

    pipes = [];
    particles = [];
    scorePopups = [];

    // Pre-spawn first pipe at a friendly forward distance
    spawnPipe(CANVAS_WIDTH + 60);

    startOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');

    pauseToggleBtn.disabled = false;
    pauseBtnLabel.textContent = 'Pause';

    updateScoreboard();
    playUiClick();
  }

  function pauseFlight() {
    if (gameState !== 'playing') return;

    gameState = 'paused';
    pauseOverlay.classList.remove('hidden');
    pauseBtnLabel.textContent = 'Resume';
    playUiClick();
  }

  function resumeFlight() {
    if (gameState !== 'paused') return;

    gameState = 'playing';
    pauseOverlay.classList.add('hidden');
    pauseBtnLabel.textContent = 'Pause';
    playUiClick();
    lastTime = performance.now();
  }

  function endFlight() {
    gameState = 'gameover';
    pauseToggleBtn.disabled = true;

    flightDuration = Math.round((performance.now() - flightStartTime) / 1000);
    shakeFrames = 18; // Camera rumble
    spawnCrashParticles(bird.x, bird.y);
    playCrashSound();

    const isNewRecord = saveBestScoreIfNeeded();

    // Populate Game Over stats
    finalScoreVal.textContent = `${score} pts`;
    finalBestVal.textContent = `${bestScore} pts`;
    finalPipesVal.textContent = pipesCleared;
    finalTimeVal.textContent = `${flightDuration}s`;
    finalDiffVal.textContent = DIFFICULTY_CONFIG[currentDifficulty].name;

    if (isNewRecord && score > 0) {
      newBestBadge.classList.remove('hidden');
      gameOverMessage.textContent = '🏆 Sensational flight! You shattered your personal record!';
    } else {
      newBestBadge.classList.add('hidden');
      if (score >= 20) {
        gameOverMessage.textContent = '⚡ Ace Pilot! Masterful reflex navigation!';
      } else if (score >= 10) {
        gameOverMessage.textContent = 'Great run! Keep practicing the gate rhythm!';
      } else {
        gameOverMessage.textContent = 'Timing is key! Keep practicing gentle, steady flaps.';
      }
    }

    setTimeout(() => {
      gameOverOverlay.classList.remove('hidden');
      playGameOverFanfare(isNewRecord && score > 0);
    }, 450);
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
      startFlight();
    }
  }

  // --- Collision Detection ---
  function checkCollision(pipe) {
    const bx = bird.x;
    const by = bird.y;
    const br = bird.hitRadius;

    // Check ceiling & ground
    if (by - br <= 0 || by + br >= PLAYABLE_HEIGHT) {
      return true;
    }

    // Top pipe bounds
    const topCapX = pipe.x - (pipe.capWidth - pipe.width) / 2;
    const topCapY = pipe.top - pipe.capHeight;

    // Circle vs Axis-Aligned Bounding Box (AABB) with forgiveness
    if (circleRectIntersects(bx, by, br, pipe.x, 0, pipe.width, pipe.top) ||
        circleRectIntersects(bx, by, br, topCapX, topCapY, pipe.capWidth, pipe.capHeight)) {
      return true;
    }

    // Bottom pipe bounds
    const botCapX = pipe.x - (pipe.capWidth - pipe.width) / 2;
    const botCapY = pipe.bottom;

    if (circleRectIntersects(bx, by, br, pipe.x, pipe.bottom, pipe.width, PLAYABLE_HEIGHT - pipe.bottom) ||
        circleRectIntersects(bx, by, br, botCapX, botCapY, pipe.capWidth, pipe.capHeight)) {
      return true;
    }

    return false;
  }

  function circleRectIntersects(cx, cy, r, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const distanceX = cx - closestX;
    const distanceY = cy - closestY;
    return (distanceX * distanceX + distanceY * distanceY) < (r * r);
  }

  // --- Main Update Loop ---
  function update(delta) {
    const currentSpeed = getEffectiveSpeed();

    // Background stars & ground scroll
    groundOffset = (groundOffset + currentSpeed) % 24;

    stars.forEach(star => {
      star.x -= star.speed * (gameState === 'playing' ? 1.5 : 0.5);
      if (star.x < 0) {
        star.x = CANVAS_WIDTH;
        star.y = Math.random() * (PLAYABLE_HEIGHT - 40);
      }
    });

    // Ready state hover idle
    if (gameState === 'ready') {
      bird.hoverTime += 0.05;
      bird.y = 260 + Math.sin(bird.hoverTime * 3) * 6;
      bird.rotation = Math.sin(bird.hoverTime * 3) * 0.08;
      bird.wingAngle = Math.sin(bird.hoverTime * 10) * 0.4;
      return;
    }

    if (gameState !== 'playing') {
      // Still update death particles
      updateParticles();
      return;
    }

    // Apply physics
    const cfg = DIFFICULTY_CONFIG[currentDifficulty];
    bird.velocity += cfg.gravity;
    bird.y += bird.velocity;

    // Smooth rotational tilt
    const targetRotation = Math.min(Math.PI / 2.3, Math.max(-Math.PI / 4.5, bird.velocity * 0.07));
    bird.rotation += (targetRotation - bird.rotation) * 0.18;

    // Wing oscillation smoothly settles
    bird.wingAngle += (0 - bird.wingAngle) * 0.12;

    // Trailing exhaust particles
    if (Math.random() < 0.6) {
      particles.push({
        x: bird.x - 12,
        y: bird.y + (Math.random() * 4 - 2),
        vx: -currentSpeed * 0.8,
        vy: (Math.random() * 0.8 - 0.4),
        size: Math.random() * 2.5 + 1.5,
        color: '#00f0ff',
        life: 0.8,
        decay: 0.04
      });
    }

    // Move & spawn pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= currentSpeed;

      // Check collision
      if (checkCollision(p)) {
        endFlight();
        return;
      }

      // Check if bird passed the pipe pair
      if (!p.passed && p.x + p.width < bird.x) {
        p.passed = true;
        score++;
        pipesCleared++;
        spawnScorePopup(bird.x, bird.y - 15);

        if (score % 10 === 0) {
          playMilestoneSound();
        } else {
          playScorePointSound();
        }

        updateScoreboard();
      }

      // Remove offscreen pipes
      if (p.x + p.capWidth < -20) {
        pipes.splice(i, 1);
      }
    }

    // Spawn new pipes based on spacing
    const lastPipe = pipes[pipes.length - 1];
    if (lastPipe && CANVAS_WIDTH - lastPipe.x >= cfg.spacing) {
      spawnPipe(CANVAS_WIDTH);
    }

    // Ground collision
    if (bird.y + bird.hitRadius >= PLAYABLE_HEIGHT) {
      bird.y = PLAYABLE_HEIGHT - bird.hitRadius;
      endFlight();
      return;
    }

    // Ceiling clamp
    if (bird.y - bird.hitRadius <= 0) {
      bird.y = bird.hitRadius;
      bird.velocity = 0;
    }

    updateParticles();
    updateScorePopups();
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function updateScorePopups() {
    for (let i = scorePopups.length - 1; i >= 0; i--) {
      const sp = scorePopups[i];
      sp.y += sp.vy;
      sp.alpha -= 0.025;
      if (sp.alpha <= 0) {
        scorePopups.splice(i, 1);
      }
    }
  }

  // --- Render Engine ---
  function render() {
    ctx.save();

    // Camera rumble on crash
    if (shakeFrames > 0) {
      shakeFrames--;
      const shakeMag = (shakeFrames / 18) * 6;
      ctx.translate((Math.random() * 2 - 1) * shakeMag, (Math.random() * 2 - 1) * shakeMag);
    }

    // 1. Deep Cyber Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, PLAYABLE_HEIGHT);
    skyGrad.addColorStop(0, '#060814');
    skyGrad.addColorStop(0.7, '#0b1328');
    skyGrad.addColorStop(1, '#111d38');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Stars
    stars.forEach(star => {
      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // 3. Distant City Skyline Silhouettes
    ctx.fillStyle = '#0a1020';
    cityBuildings.forEach(b => {
      const bY = PLAYABLE_HEIGHT - b.height;
      ctx.fillRect(b.x, bY, b.width, b.height);
      // Subtle glowing neon antenna on top
      ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
      ctx.fillRect(b.x + b.width / 2 - 1, bY - 6, 2, 6);
      ctx.fillStyle = '#0a1020';
    });

    // 4. Pipes (Neon Cyber Conduits)
    pipes.forEach(p => {
      renderPipe(p);
    });

    // 5. Particles
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

    // 6. Flying Cyber Bird (Drone)
    if (gameState !== 'gameover' || shakeFrames > 0) {
      renderBird();
    }

    // 7. Ground (Cyber Grid Floor)
    renderGround();

    // 8. Floating Score Popups (+1)
    scorePopups.forEach(sp => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sp.alpha);
      ctx.font = '800 20px "JetBrains Mono", monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.textAlign = 'center';
      ctx.fillText(sp.text, sp.x, sp.y);
      ctx.restore();
    });

    // 9. In-game live score counter centered in airspace
    if (gameState === 'playing') {
      ctx.save();
      ctx.font = '800 36px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 14;
      ctx.textAlign = 'center';
      ctx.fillText(score.toString(), CANVAS_WIDTH / 2, 75);
      ctx.restore();
    }

    ctx.restore();
  }

  function renderPipe(p) {
    const capExtra = (p.capWidth - p.width) / 2;

    // Pipe Body Gradient
    const pipeGrad = ctx.createLinearGradient(p.x, 0, p.x + p.width, 0);
    pipeGrad.addColorStop(0, '#121a2f');
    pipeGrad.addColorStop(0.35, '#1e2d4d');
    pipeGrad.addColorStop(0.7, '#141f38');
    pipeGrad.addColorStop(1, '#0c1426');

    // Gap Light Glow
    ctx.save();
    const gapGlow = ctx.createRadialGradient(
      p.x + p.width / 2, (p.top + p.bottom) / 2, 10,
      p.x + p.width / 2, (p.top + p.bottom) / 2, 90
    );
    gapGlow.addColorStop(0, 'rgba(0, 240, 255, 0.12)');
    gapGlow.addColorStop(1, 'rgba(0, 240, 255, 0)');
    ctx.fillStyle = gapGlow;
    ctx.fillRect(p.x - 20, p.top, p.width + 40, p.bottom - p.top);
    ctx.restore();

    // --- TOP PIPE ---
    // Main column
    ctx.fillStyle = pipeGrad;
    ctx.fillRect(p.x, 0, p.width, p.top);

    // Neon accent side stripe
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(p.x + 4, 0);
    ctx.lineTo(p.x + 4, p.top);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Top Pipe Cap (at bottom of top pipe)
    const topCapY = p.top - p.capHeight;
    ctx.fillStyle = '#1e2942';
    ctx.fillRect(p.x - capExtra, topCapY, p.capWidth, p.capHeight);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.strokeRect(p.x - capExtra, topCapY, p.capWidth, p.capHeight);

    // --- BOTTOM PIPE ---
    // Main column
    ctx.fillStyle = pipeGrad;
    ctx.fillRect(p.x, p.bottom, p.width, PLAYABLE_HEIGHT - p.bottom);

    // Neon accent side stripe
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(p.x + 4, p.bottom);
    ctx.lineTo(p.x + 4, PLAYABLE_HEIGHT);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Bottom Pipe Cap (at top of bottom pipe)
    ctx.fillStyle = '#1e2942';
    ctx.fillRect(p.x - capExtra, p.bottom, p.capWidth, p.capHeight);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.strokeRect(p.x - capExtra, p.bottom, p.capWidth, p.capHeight);
    ctx.shadowBlur = 0;
  }

  function renderBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    // Thruster glow exhaust
    const thrustGlow = ctx.createRadialGradient(-16, 0, 2, -16, 0, 12);
    thrustGlow.addColorStop(0, '#00f0ff');
    thrustGlow.addColorStop(0.5, '#ec4899');
    thrustGlow.addColorStop(1, 'rgba(236, 72, 153, 0)');
    ctx.fillStyle = thrustGlow;
    ctx.beginPath();
    ctx.arc(-16, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Body Fuselage (Aerodynamic Cyber Egg)
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    const bodyGrad = ctx.createRadialGradient(2, -2, 2, 0, 0, 16);
    bodyGrad.addColorStop(0, '#67e8f9');
    bodyGrad.addColorStop(0.6, '#06b6d4');
    bodyGrad.addColorStop(1, '#0e7490');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Metallic Outer Rim
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Cyber Wing
    ctx.save();
    ctx.translate(-2, 2);
    ctx.rotate(bird.wingAngle);
    ctx.fillStyle = '#a855f7';
    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 6, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Cute Cyber Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(6, -4, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Iris / Pupil
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(7.5, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(8.2, -4.8, 1, 0, Math.PI * 2);
    ctx.fill();

    // Aerodynamic Neon Orange Beak
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(13, -2);
    ctx.lineTo(21, 2);
    ctx.lineTo(13, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function renderGround() {
    const gy = PLAYABLE_HEIGHT;

    // Ground Plate Gradient
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
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(CANVAS_WIDTH, gy);
    ctx.stroke();
    ctx.restore();

    // Diagonal hazard stripes scrolling
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
    ctx.lineWidth = 3;
    for (let x = -30; x < CANVAS_WIDTH + 30; x += 24) {
      const sx = x - groundOffset;
      ctx.beginPath();
      ctx.moveTo(sx, gy + 4);
      ctx.lineTo(sx + 14, CANVAS_HEIGHT);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Animation Frame Loop ---
  function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const delta = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (gameState !== 'paused') {
      update(delta);
    }
    render();

    animFrameId = requestAnimationFrame(gameLoop);
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Jump input listeners
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        handleFlap();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === 'playing') pauseFlight();
        else if (gameState === 'paused') resumeFlight();
      } else if (e.code === 'KeyR') {
        if (gameState === 'playing' || gameState === 'paused' || gameState === 'gameover') {
          startFlight();
        }
      }
    });

    // Tap directly on canvas
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      handleFlap();
    });

    // Mobile Flap Button
    if (mobileFlapBtn) {
      mobileFlapBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        handleFlap();
      });
    }

    // Difficulty tabs
    diffTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        setDifficulty(tab.dataset.difficulty);
      });
    });

    // Overlay Buttons
    startBtn.addEventListener('click', () => {
      startFlight();
    });

    pauseToggleBtn.addEventListener('click', () => {
      if (gameState === 'playing') {
        pauseFlight();
      } else if (gameState === 'paused') {
        resumeFlight();
      }
    });

    resumeBtn.addEventListener('click', () => {
      resumeFlight();
    });

    pauseRestartBtn.addEventListener('click', () => {
      startFlight();
    });

    restartBtn.addEventListener('click', () => {
      startFlight();
    });

    playAgainBtn.addEventListener('click', () => {
      startFlight();
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

    // Auto-pause when browser tab is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && gameState === 'playing') {
        pauseFlight();
      }
    });
  }

  // --- Initialization ---
  function init() {
    loadBestScore();
    updateScoreboard();
    updateSoundUI();
    initBackground();
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
