/**
 * PlayZone - Neon Pong Game Engine
 * 100% Vanilla HTML5 Canvas, 1P (Adaptive AI) vs 2P Local Couch PvP,
 * Accurate Angle Physics, Wall Bouncing, Ball Acceleration, Audio & Mobile Touch.
 */

(function () {
  'use strict';

  // --- Configuration & Constants ---
  const STORAGE_KEY = 'playzone_score_pong';
  const COURT_WIDTH = 800;
  const COURT_HEIGHT = 500;

  const PADDLE_WIDTH = 14;
  const PADDLE_HEIGHT = 88;
  const PADDLE_LEFT_X = 32;
  const PADDLE_RIGHT_X = COURT_WIDTH - 32 - PADDLE_WIDTH; // 754

  const BALL_RADIUS = 9;
  const INITIAL_BALL_SPEED = 8.5;
  const MAX_BALL_SPEED = 18.0;
  const SPEED_ACCELERATION = 0.45; // Speed gained per paddle return

  const AI_SPEEDS = {
    easy: 5.2,
    medium: 7.5,
    hard: 9.8
  };

  // --- Game State ---
  let gameMode = '1p'; // '1p' or '2p'
  let targetScore = 5; // 5, 7, 10
  let aiDifficulty = 'medium'; // 'easy', 'medium', 'hard'

  let leftScore = 0;
  let rightScore = 0;
  let rallyCount = 0;
  let longestRally = 0;
  let totalWins = 0;

  let isMatchRunning = false;
  let isPaused = false;
  let isMatchFinished = false;
  let isServing = false;
  let serveCountdown = 3;
  let serveTimer = null;
  let serveDirection = 1; // 1 = toward right, -1 = toward left

  // Paddles
  const paddleLeft = {
    x: PADDLE_LEFT_X,
    y: (COURT_HEIGHT - PADDLE_HEIGHT) / 2,
    w: PADDLE_WIDTH,
    h: PADDLE_HEIGHT,
    speed: 9.5,
    vy: 0,
    color: '#00f0ff',
    glow: 'rgba(0, 240, 255, 0.65)'
  };

  const paddleRight = {
    x: PADDLE_RIGHT_X,
    y: (COURT_HEIGHT - PADDLE_HEIGHT) / 2,
    w: PADDLE_WIDTH,
    h: PADDLE_HEIGHT,
    speed: 9.5,
    vy: 0,
    color: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.65)'
  };

  // Ball
  const ball = {
    x: COURT_WIDTH / 2,
    y: COURT_HEIGHT / 2,
    radius: BALL_RADIUS,
    vx: 0,
    vy: 0,
    speed: INITIAL_BALL_SPEED,
    trail: []
  };

  // Particles
  let particles = [];

  // Input Keys State
  const keys = {
    w: false,
    s: false,
    arrowUp: false,
    arrowDown: false
  };

  // Touch Controls State
  const touchState = {
    p1Up: false,
    p1Down: false,
    p2Up: false,
    p2Down: false
  };

  // DOM Elements
  const canvas = document.getElementById('pongCanvas');
  const ctx = canvas.getContext('2d');

  const leftScoreDisplay = document.getElementById('leftScoreDisplay');
  const rightScoreDisplay = document.getElementById('rightScoreDisplay');
  const rallyCountDisplay = document.getElementById('rallyCount');
  const matchTargetTag = document.getElementById('matchTargetTag');
  const leftPlayerBadge = document.getElementById('leftPlayerBadge');
  const rightPlayerBadge = document.getElementById('rightPlayerBadge');

  const modeButtons = document.querySelectorAll('#modeSelector .toggle-btn');
  const targetButtons = document.querySelectorAll('#targetSelector .toggle-btn');
  const diffButtons = document.querySelectorAll('#difficultySelector .toggle-btn');
  const difficultyRow = document.getElementById('difficultyRow');
  const p2Shortcut = document.getElementById('p2Shortcut');
  const p2TouchSide = document.getElementById('p2TouchSide');

  // Overlays
  const startOverlay = document.getElementById('startOverlay');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const victoryOverlay = document.getElementById('victoryOverlay');
  const startMatchBtn = document.getElementById('startMatchBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const pauseToggleBtn = document.getElementById('pauseToggleBtn');
  const pauseBtnLabel = document.getElementById('pauseBtnLabel');
  const pauseBtnIcon = document.getElementById('pauseBtnIcon');
  const restartBtn = document.getElementById('restartBtn');

  // Victory Overlay Elements
  const victoryTitle = document.getElementById('victoryTitle');
  const victoryDesc = document.getElementById('victoryDesc');
  const victoryIcon = document.getElementById('victoryIcon');
  const finalLeftScore = document.getElementById('finalLeftScore');
  const finalRightScore = document.getElementById('finalRightScore');
  const finalLongestRally = document.getElementById('finalLongestRally');
  const finalTotalWins = document.getElementById('finalTotalWins');
  const newBestBadge = document.getElementById('newBestBadge');

  const soundToggleBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');

  // --- Audio Synth Helpers ---
  function playAudioTone(freq, type = 'sine', duration = 0.08, volume = 0.2) {
    if (window.playZoneAudio && window.playZoneAudio.enabled) {
      window.playZoneAudio.playTone(freq, type, duration, volume);
    }
  }

  function playPaddleHitSound(isLeft) {
    // High resonant ping
    const freq = isLeft ? 580 : 720;
    playAudioTone(freq, 'triangle', 0.06, 0.18);
  }

  function playWallHitSound() {
    // Hollow wood/metal bounce tone
    playAudioTone(340, 'sine', 0.04, 0.12);
  }

  function playScoreSound() {
    playAudioTone(880, 'triangle', 0.12, 0.2);
    setTimeout(() => playAudioTone(1174.66, 'triangle', 0.15, 0.2), 90);
  }

  function playVictorySound() {
    if (window.playZoneAudio) {
      window.playZoneAudio.playSuccess();
    }
  }

  function updateSoundUI() {
    if (window.playZoneAudio) {
      const muted = !window.playZoneAudio.enabled;
      soundIcon.textContent = muted ? '🔇' : '🔊';
      soundToggleBtn.classList.toggle('muted', muted);
    }
  }

  // --- LocalStorage Helpers ---
  function loadTotalWins() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      totalWins = saved ? parseInt(saved, 10) || 0 : 0;
    } catch (e) {
      totalWins = 0;
    }
  }

  function incrementTotalWins() {
    totalWins++;
    try {
      localStorage.setItem(STORAGE_KEY, totalWins.toString());
    } catch (e) {
      // ignore
    }
    return true;
  }

  // --- Particle Systems ---
  function spawnSparks(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.5 + Math.random() * 2.5,
        color,
        alpha: 1.0,
        decay: 0.03 + Math.random() * 0.03
      });
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function drawParticles() {
    ctx.save();
    particles.forEach(p => {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // --- Ball Serve & Countdown ---
  function resetBallForServe() {
    ball.x = COURT_WIDTH / 2;
    ball.y = COURT_HEIGHT / 2;
    ball.vx = 0;
    ball.vy = 0;
    ball.speed = INITIAL_BALL_SPEED;
    ball.trail = [];

    rallyCount = 0;
    rallyCountDisplay.textContent = '0';

    isServing = true;
    serveCountdown = 3;

    clearInterval(serveTimer);
    serveTimer = setInterval(() => {
      serveCountdown--;
      if (serveCountdown > 0) {
        playAudioTone(440, 'triangle', 0.05, 0.1);
      } else {
        clearInterval(serveTimer);
        launchBall();
      }
    }, 450);

    playAudioTone(440, 'triangle', 0.05, 0.1);
  }

  function launchBall() {
    isServing = false;
    ball.speed = INITIAL_BALL_SPEED;

    // Slight random vertical trajectory angle (-25 to +25 degrees)
    const angle = (Math.random() * 0.8 - 0.4);
    ball.vx = serveDirection * ball.speed * Math.cos(angle);
    ball.vy = ball.speed * Math.sin(angle);

    playAudioTone(660, 'sine', 0.08, 0.15);
  }

  // --- Physics & Collision Updates ---
  function updatePhysics() {
    if (!isMatchRunning || isPaused || isMatchFinished) return;

    // 1. Move Left Paddle
    if (keys.w || touchState.p1Up) {
      paddleLeft.y = Math.max(0, paddleLeft.y - paddleLeft.speed);
    }
    if (keys.s || touchState.p1Down) {
      paddleLeft.y = Math.min(COURT_HEIGHT - paddleLeft.h, paddleLeft.y + paddleLeft.speed);
    }

    // 2. Move Right Paddle (Human P2 or Computer AI)
    if (gameMode === '2p') {
      if (keys.arrowUp || touchState.p2Up) {
        paddleRight.y = Math.max(0, paddleRight.y - paddleRight.speed);
      }
      if (keys.arrowDown || touchState.p2Down) {
        paddleRight.y = Math.min(COURT_HEIGHT - paddleRight.h, paddleRight.y + paddleRight.speed);
      }
    } else {
      updateAI();
    }

    // 3. Move Ball
    if (!isServing) {
      // Trail recording
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 8) ball.trail.shift();

      ball.x += ball.vx;
      ball.y += ball.vy;

      // Top Wall Collision
      if (ball.y - ball.radius <= 0) {
        ball.y = ball.radius;
        ball.vy = -ball.vy;
        playWallHitSound();
        spawnSparks(ball.x, 0, '#ffffff', 8);
      }
      // Bottom Wall Collision
      else if (ball.y + ball.radius >= COURT_HEIGHT) {
        ball.y = COURT_HEIGHT - ball.radius;
        ball.vy = -ball.vy;
        playWallHitSound();
        spawnSparks(ball.x, COURT_HEIGHT, '#ffffff', 8);
      }

      // Left Paddle Collision Check
      if (
        ball.vx < 0 &&
        ball.x - ball.radius <= paddleLeft.x + paddleLeft.w &&
        ball.x + ball.radius >= paddleLeft.x &&
        ball.y + ball.radius >= paddleLeft.y &&
        ball.y - ball.radius <= paddleLeft.y + paddleLeft.h
      ) {
        ball.x = paddleLeft.x + paddleLeft.w + ball.radius;
        handlePaddleReturn(paddleLeft, 1);
      }

      // Right Paddle Collision Check
      if (
        ball.vx > 0 &&
        ball.x + ball.radius >= paddleRight.x &&
        ball.x - ball.radius <= paddleRight.x + paddleRight.w &&
        ball.y + ball.radius >= paddleRight.y &&
        ball.y - ball.radius <= paddleRight.y + paddleRight.h
      ) {
        ball.x = paddleRight.x - ball.radius;
        handlePaddleReturn(paddleRight, -1);
      }

      // Goal Check: Left player missed (Right scores)
      if (ball.x + ball.radius < 0) {
        rightScore++;
        serveDirection = -1; // Serve toward left
        handleScorePoint();
      }
      // Goal Check: Right player missed (Left scores)
      else if (ball.x - ball.radius > COURT_WIDTH) {
        leftScore++;
        serveDirection = 1; // Serve toward right
        handleScorePoint();
      }
    }

    updateParticles();
  }

  // Handle Paddle Return & Angle Math
  function handlePaddleReturn(paddle, direction) {
    // Relative hit offset: -1 (top edge) to +1 (bottom edge)
    const paddleCenter = paddle.y + paddle.h / 2;
    const hitOffset = (ball.y - paddleCenter) / (paddle.h / 2);
    const clampedOffset = Math.max(-1, Math.min(1, hitOffset));

    // Max return angle: 60 degrees (Math.PI / 3)
    const bounceAngle = clampedOffset * (Math.PI / 3);

    // Speed acceleration
    ball.speed = Math.min(MAX_BALL_SPEED, ball.speed + SPEED_ACCELERATION);

    ball.vx = direction * ball.speed * Math.cos(bounceAngle);
    ball.vy = ball.speed * Math.sin(bounceAngle);

    rallyCount++;
    if (rallyCount > longestRally) longestRally = rallyCount;
    rallyCountDisplay.textContent = rallyCount.toString();

    playPaddleHitSound(direction === 1);
    spawnSparks(ball.x, ball.y, paddle.color, 14);
  }

  // Handle Point Scored
  function handleScorePoint() {
    playScoreSound();
    leftScoreDisplay.textContent = leftScore.toString();
    rightScoreDisplay.textContent = rightScore.toString();

    // Check Match Victory
    if (leftScore >= targetScore || rightScore >= targetScore) {
      handleMatchVictory();
    } else {
      resetBallForServe();
    }
  }

  // --- Computer AI Tracking ---
  function updateAI() {
    const aiSpeed = AI_SPEEDS[aiDifficulty] || AI_SPEEDS.medium;
    const paddleCenter = paddleRight.y + paddleRight.h / 2;
    let targetY = ball.y;

    if (aiDifficulty === 'easy') {
      // Reacts only once ball passes middle and has slight tracking lag
      if (ball.x < COURT_WIDTH * 0.45 || ball.vx < 0) {
        targetY = COURT_HEIGHT / 2; // return to center
      } else {
        targetY = ball.y + Math.sin(Date.now() * 0.003) * 28; // intentional offset error
      }
    } else if (aiDifficulty === 'medium') {
      // Smooth tracking with slight deadzone
      if (ball.vx < 0) {
        targetY = COURT_HEIGHT / 2;
      }
    } else if (aiDifficulty === 'hard') {
      // Trajectory predictive tracking
      if (ball.vx > 0) {
        // Simple trajectory projection to paddle right X
        const timeToIntercept = (paddleRight.x - ball.x) / ball.vx;
        let projectedY = ball.y + ball.vy * timeToIntercept;

        // Account for 1 wall bounce
        if (projectedY < 0) projectedY = -projectedY;
        if (projectedY > COURT_HEIGHT) projectedY = COURT_HEIGHT - (projectedY - COURT_HEIGHT);

        targetY = projectedY;
      } else {
        targetY = COURT_HEIGHT / 2;
      }
    }

    // Move toward target Y with max speed constraint
    const dy = targetY - paddleCenter;
    if (Math.abs(dy) > 6) {
      if (dy > 0) {
        paddleRight.y = Math.min(COURT_HEIGHT - paddleRight.h, paddleRight.y + aiSpeed);
      } else {
        paddleRight.y = Math.max(0, paddleRight.y - aiSpeed);
      }
    }
  }

  // --- Rendering ---
  function draw() {
    // Clear Court
    ctx.clearRect(0, 0, COURT_WIDTH, COURT_HEIGHT);

    // Court Outer Glow Boundaries
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, COURT_WIDTH - 2, COURT_HEIGHT - 2);

    // Center Net Line (Dashed neon line)
    ctx.setLineDash([8, 10]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(COURT_WIDTH / 2, 0);
    ctx.lineTo(COURT_WIDTH / 2, COURT_HEIGHT);
    ctx.stroke();

    // Center Court Ring
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(COURT_WIDTH / 2, COURT_HEIGHT / 2, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Draw Ball Trail
    if (!isServing && ball.trail.length > 0) {
      ball.trail.forEach((pos, idx) => {
        const alpha = (idx + 1) / ball.trail.length * 0.45;
        const rad = ball.radius * ((idx + 1) / ball.trail.length);
        ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, rad, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw Left Paddle (Cyan)
    ctx.save();
    ctx.shadowColor = paddleLeft.glow;
    ctx.shadowBlur = 14;
    ctx.fillStyle = paddleLeft.color;
    ctx.beginPath();
    ctx.roundRect(paddleLeft.x, paddleLeft.y, paddleLeft.w, paddleLeft.h, 6);
    ctx.fill();
    ctx.restore();

    // Draw Right Paddle (Purple)
    ctx.save();
    ctx.shadowColor = paddleRight.glow;
    ctx.shadowBlur = 14;
    ctx.fillStyle = paddleRight.color;
    ctx.beginPath();
    ctx.roundRect(paddleRight.x, paddleRight.y, paddleRight.w, paddleRight.h, 6);
    ctx.fill();
    ctx.restore();

    // Draw Glowing Ball
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Sparks / Particles
    drawParticles();

    // Draw Serve Countdown
    if (isServing && isMatchRunning && !isPaused) {
      ctx.save();
      ctx.font = '900 48px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 18;
      ctx.fillText(serveCountdown.toString(), COURT_WIDTH / 2, COURT_HEIGHT / 2 - 30);

      ctx.font = '700 14px "Space Grotesk", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('GET READY', COURT_WIDTH / 2, COURT_HEIGHT / 2 + 10);
      ctx.restore();
    }
  }

  // --- Game Loop ---
  function gameLoop() {
    updatePhysics();
    draw();
    requestAnimationFrame(gameLoop);
  }

  // --- Match Flow & Lifecycle ---
  function startMatch() {
    startOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    victoryOverlay.classList.add('hidden');

    leftScore = 0;
    rightScore = 0;
    rallyCount = 0;
    longestRally = 0;
    particles = [];

    leftScoreDisplay.textContent = '0';
    rightScoreDisplay.textContent = '0';
    rallyCountDisplay.textContent = '0';

    paddleLeft.y = (COURT_HEIGHT - PADDLE_HEIGHT) / 2;
    paddleRight.y = (COURT_HEIGHT - PADDLE_HEIGHT) / 2;

    isMatchRunning = true;
    isPaused = false;
    isMatchFinished = false;
    serveDirection = 1;

    resetBallForServe();
    playAudioTone(520, 'triangle', 0.1, 0.2);
  }

  function handleMatchVictory() {
    isMatchFinished = true;
    isMatchRunning = false;
    clearInterval(serveTimer);

    playVictorySound();

    let isP1Winner = leftScore >= targetScore;

    if (gameMode === '1p') {
      if (isP1Winner) {
        victoryIcon.textContent = '🏆';
        victoryTitle.innerHTML = 'You <span class="gradient-text">Win!</span>';
        victoryDesc.textContent = `Magnificent rally control! You defeated the Cyber AI.`;
        incrementTotalWins();
      } else {
        victoryIcon.textContent = '🤖';
        victoryTitle.innerHTML = 'Cyber AI <span class="gradient-text" style="background: linear-gradient(135deg, #f87171, #ec4899); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">Wins!</span>';
        victoryDesc.textContent = `The AI claimed match point. Sharpen your angles and rematch!`;
      }
    } else {
      victoryIcon.textContent = '🏆';
      if (isP1Winner) {
        victoryTitle.innerHTML = 'Player 1 <span class="gradient-text">Wins!</span>';
        victoryDesc.textContent = `Player 1 (Cyan) conquered the court!`;
      } else {
        victoryTitle.innerHTML = 'Player 2 <span class="gradient-text" style="background: linear-gradient(135deg, #a855f7, #ec4899); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">Wins!</span>';
        victoryDesc.textContent = `Player 2 (Purple) conquered the court!`;
      }
    }

    finalLeftScore.textContent = leftScore.toString();
    finalRightScore.textContent = rightScore.toString();
    finalLongestRally.textContent = `${longestRally} hits`;
    finalTotalWins.textContent = totalWins.toString();

    const isNew = isP1Winner && totalWins > 0;
    newBestBadge.classList.toggle('hidden', !isNew);

    setTimeout(() => {
      victoryOverlay.classList.remove('hidden');
    }, 400);
  }

  // --- Pause & Resume ---
  function togglePause() {
    if (!isMatchRunning || isMatchFinished) return;

    isPaused = !isPaused;
    if (isPaused) {
      pauseOverlay.classList.remove('hidden');
      pauseBtnLabel.textContent = 'Resume';
      pauseBtnIcon.textContent = '▶';
    } else {
      pauseOverlay.classList.add('hidden');
      pauseBtnLabel.textContent = 'Pause';
      pauseBtnIcon.textContent = '⏸️';
    }
  }

  // Auto-pause when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isMatchRunning && !isPaused && !isMatchFinished) {
      togglePause();
    }
  });

  // --- UI Updates for Game Mode & Settings ---
  function updateSettingsUI() {
    matchTargetTag.textContent = `FIRST TO ${targetScore}`;

    if (gameMode === '1p') {
      leftPlayerBadge.textContent = 'You';
      rightPlayerBadge.textContent = 'Cyber AI';
      difficultyRow.style.display = 'flex';
      p2Shortcut.style.display = 'none';
      p2TouchSide.style.display = 'none';
    } else {
      leftPlayerBadge.textContent = 'Player 1';
      rightPlayerBadge.textContent = 'Player 2';
      difficultyRow.style.display = 'none';
      p2Shortcut.style.display = 'flex';
      p2TouchSide.style.display = 'flex';
    }
  }

  // --- Input Event Listeners ---
  function setupInputListeners() {
    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyW') keys.w = true;
      if (e.code === 'KeyS') keys.s = true;
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        keys.arrowUp = true;
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        keys.arrowDown = true;
      }
      if (e.code === 'KeyP') {
        togglePause();
      }
      if (e.code === 'Space') {
        if (!isMatchRunning && !isMatchFinished) {
          startMatch();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW') keys.w = false;
      if (e.code === 'KeyS') keys.s = false;
      if (e.code === 'ArrowUp') keys.arrowUp = false;
      if (e.code === 'ArrowDown') keys.arrowDown = false;
    });

    // Mouse Movement for Left Paddle (1P Mode)
    canvas.addEventListener('mousemove', (e) => {
      if (!isMatchRunning || isPaused || isMatchFinished) return;
      if (gameMode === '1p') {
        const rect = canvas.getBoundingClientRect();
        const scaleY = COURT_HEIGHT / rect.height;
        const mouseY = (e.clientY - rect.top) * scaleY;
        paddleLeft.y = Math.max(0, Math.min(COURT_HEIGHT - paddleLeft.h, mouseY - paddleLeft.h / 2));
      }
    });

    // Touch Drag on Canvas (Ergonomic direct touch control)
    canvas.addEventListener('touchmove', (e) => {
      if (!isMatchRunning || isPaused || isMatchFinished) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleY = COURT_HEIGHT / rect.height;
      const scaleX = COURT_WIDTH / rect.width;

      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const touchX = (touch.clientX - rect.left) * scaleX;
        const touchY = (touch.clientY - rect.top) * scaleY;

        if (touchX < COURT_WIDTH / 2) {
          // Left paddle control
          paddleLeft.y = Math.max(0, Math.min(COURT_HEIGHT - paddleLeft.h, touchY - paddleLeft.h / 2));
        } else if (gameMode === '2p') {
          // Right paddle control in 2P mode
          paddleRight.y = Math.max(0, Math.min(COURT_HEIGHT - paddleRight.h, touchY - paddleRight.h / 2));
        }
      }
    }, { passive: false });

    // Touch Buttons Listeners
    const bindTouchButton = (btnId, stateProp) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      const start = (e) => { e.preventDefault(); touchState[stateProp] = true; };
      const end = (e) => { e.preventDefault(); touchState[stateProp] = false; };
      btn.addEventListener('pointerdown', start);
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointercancel', end);
      btn.addEventListener('pointerleave', end);
    };

    bindTouchButton('touchP1Up', 'p1Up');
    bindTouchButton('touchP1Down', 'p1Down');
    bindTouchButton('touchP2Up', 'p2Up');
    bindTouchButton('touchP2Down', 'p2Down');

    // Settings Toggle Handlers
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameMode = btn.dataset.mode;
        updateSettingsUI();
        startMatch();
      });
    });

    targetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        targetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        targetScore = parseInt(btn.dataset.target, 10);
        updateSettingsUI();
        startMatch();
      });
    });

    diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        aiDifficulty = btn.dataset.diff;
      });
    });

    // Control Buttons
    startMatchBtn.addEventListener('click', startMatch);
    playAgainBtn.addEventListener('click', startMatch);
    pauseToggleBtn.addEventListener('click', togglePause);
    resumeBtn.addEventListener('click', togglePause);
    restartBtn.addEventListener('click', startMatch);

    // Sound Toggle
    soundToggleBtn.addEventListener('click', () => {
      if (window.playZoneAudio) {
        window.playZoneAudio.toggle();
        updateSoundUI();
      }
    });

    // Prevent context menu on canvas
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  // --- Initialization ---
  function init() {
    loadTotalWins();
    updateSoundUI();
    updateSettingsUI();
    setupInputListeners();
    requestAnimationFrame(gameLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
