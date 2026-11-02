/**
 * PlayZone - Neon Brick Breaker
 * Smooth 2D Canvas Brick Breaker engine:
 * - Dynamic paddle with mouse, keyboard (Arrows/A-D), and mobile touch controls
 * - Physics-based ball bounce angles and speed normalization
 * - Bricks with varied durability (1-hit, 2-hit, 3-hit armored)
 * - Multi-level progression with evolving brick layouts
 * - Power-up system: Multi-Ball, Wide Paddle, Slow Ball, Extra Life
 * - High-speed particle sparks and screen shake
 * - Tab visibility auto-pause, Web Audio sound effects, LocalStorage high scores
 */

(function () {
  'use strict';

  // 1. Constants & Configuration
  const CANVAS_WIDTH = 480;
  const CANVAS_HEIGHT = 640;
  const STORAGE_KEY_BEST = 'playzone_score_brick_breaker';

  // Bricks Grid Geometry
  const BRICK_COLS = 8;
  const BRICK_WIDTH = 52;
  const BRICK_HEIGHT = 20;
  const BRICK_GAP = 6;
  const BRICK_OFFSET_TOP = 65;
  const BRICK_OFFSET_LEFT = Math.floor((CANVAS_WIDTH - (BRICK_COLS * BRICK_WIDTH + (BRICK_COLS - 1) * BRICK_GAP)) / 2);

  // 2. DOM Elements
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // HUD
  const livesDisplay = document.getElementById('livesDisplay');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const levelDisplay = document.getElementById('levelDisplay');
  const bestScoreDisplay = document.getElementById('bestScoreDisplay');

  // Controls
  const pauseToggleBtn = document.getElementById('pauseToggleBtn');
  const pauseBtnIcon = document.getElementById('pauseBtnIcon');
  const pauseBtnLabel = document.getElementById('pauseBtnLabel');
  const restartBtn = document.getElementById('restartBtn');

  // Overlays
  const startOverlay = document.getElementById('startOverlay');
  const startBtn = document.getElementById('startBtn');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const resumeBtn = document.getElementById('resumeBtn');
  const restartFromPauseBtn = document.getElementById('restartFromPauseBtn');
  const levelCompleteOverlay = document.getElementById('levelCompleteOverlay');
  const lvlScoreVal = document.getElementById('lvlScoreVal');
  const lvlClearedVal = document.getElementById('lvlClearedVal');
  const nextLevelBtn = document.getElementById('nextLevelBtn');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const finalScoreVal = document.getElementById('finalScoreVal');
  const finalLevelVal = document.getElementById('finalLevelVal');
  const finalBestVal = document.getElementById('finalBestVal');
  const newBestBadge = document.getElementById('newBestBadge');
  const retryBtn = document.getElementById('retryBtn');

  // Mobile Controls
  const touchLeft = document.getElementById('touchLeft');
  const touchRight = document.getElementById('touchRight');
  const touchLaunch = document.getElementById('touchLaunch');

  // Sound Toggle
  const soundToggleBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const soundLabel = soundToggleBtn.querySelector('.btn-label');

  // 3. Audio Integration
  function playSound(type) {
    if (!window.playZoneAudio || !window.playZoneAudio.enabled) return;

    switch (type) {
      case 'paddle':
        if (typeof window.playZoneAudio.playTone === 'function') {
          window.playZoneAudio.playTone(560, 'triangle', 0.05, 0.15);
        }
        break;
      case 'brick':
        if (typeof window.playZoneAudio.playTone === 'function') {
          const freq = 420 + Math.random() * 260;
          window.playZoneAudio.playTone(freq, 'square', 0.05, 0.12);
        }
        break;
      case 'wall':
        if (typeof window.playZoneAudio.playTone === 'function') {
          window.playZoneAudio.playTone(280, 'sine', 0.03, 0.08);
        }
        break;
      case 'powerup':
        if (typeof window.playZoneAudio.playSuccess === 'function') {
          window.playZoneAudio.playSuccess();
        }
        break;
      case 'loseLife':
        if (typeof window.playZoneAudio.playTone === 'function') {
          window.playZoneAudio.playTone(150, 'sawtooth', 0.18, 0.2);
        }
        break;
      case 'levelClear':
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
    }
  }

  function updateSoundUI() {
    if (!window.playZoneAudio) return;
    const isEnabled = window.playZoneAudio.enabled;
    soundIcon.textContent = isEnabled ? '🔊' : '🔇';
    soundLabel.textContent = isEnabled ? 'Sound' : 'Muted';
  }

  // 4. Game State Variables
  let gameState = 'start'; // 'start' | 'playing' | 'paused' | 'levelclear' | 'gameover'
  let score = 0;
  let bestScore = 0;
  let level = 1;
  let lives = 3;
  let animationFrameId = null;
  let screenShake = 0;

  // Active Entities
  let paddle = null;
  let balls = [];
  let bricks = [];
  let powerups = [];
  let particles = [];
  let floatingTexts = [];

  // Input states
  const keys = {
    left: false,
    right: false
  };

  /**
   * Paddle Model
   */
  function createPaddle() {
    return {
      w: 86,
      h: 14,
      x: CANVAS_WIDTH / 2 - 43,
      y: CANVAS_HEIGHT - 38,
      speed: 7.5,
      wideTimer: 0,
      normalWidth: 86,
      expandedWidth: 130
    };
  }

  function updatePaddle() {
    // Width expansion power-up
    if (paddle.wideTimer > 0) {
      paddle.wideTimer--;
      paddle.w = paddle.expandedWidth;
    } else {
      paddle.w = paddle.normalWidth;
    }

    // Keyboard & Virtual Button Steering
    if (keys.left && paddle.x > 6) {
      paddle.x -= paddle.speed;
    }
    if (keys.right && paddle.x < CANVAS_WIDTH - paddle.w - 6) {
      paddle.x += paddle.speed;
    }

    // Clamp inside canvas
    paddle.x = Math.max(6, Math.min(CANVAS_WIDTH - paddle.w - 6, paddle.x));
  }

  function renderPaddle() {
    ctx.save();
    ctx.shadowColor = paddle.wideTimer > 0 ? '#ec4899' : '#00f0ff';
    ctx.shadowBlur = 12;

    // Outer cyber rail
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = paddle.wideTimer > 0 ? '#ec4899' : '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 7);
    ctx.fill();
    ctx.stroke();

    // Inner glowing core
    ctx.fillStyle = paddle.wideTimer > 0 ? '#f472b6' : '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(paddle.x + 8, paddle.y + 4, paddle.w - 16, paddle.h - 8, 3);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Balls Model (Supports Multi-Ball)
   */
  function createBall(isStuck = true, vx = 3.5, vy = -5.5) {
    const baseSpeed = 5.2 + Math.min(3.0, (level - 1) * 0.45);
    return {
      x: paddle ? paddle.x + paddle.w / 2 : CANVAS_WIDTH / 2,
      y: paddle ? paddle.y - 8 : CANVAS_HEIGHT - 46,
      radius: 6,
      vx: vx,
      vy: vy,
      baseSpeed: baseSpeed,
      isStuck: isStuck,
      slowTimer: 0,
      trail: []
    };
  }

  function launchBalls() {
    balls.forEach(ball => {
      if (ball.isStuck) {
        ball.isStuck = false;
        const dir = (Math.random() - 0.5) * 1.2;
        ball.vx = dir * ball.baseSpeed;
        ball.vy = -Math.sqrt(Math.max(4, ball.baseSpeed * ball.baseSpeed - ball.vx * ball.vx));
        playSound('paddle');
      }
    });
  }

  function updateBalls() {
    balls.forEach((ball, bIndex) => {
      // 1. Stuck on paddle before launch
      if (ball.isStuck) {
        ball.x = paddle.x + paddle.w / 2;
        ball.y = paddle.y - ball.radius - 2;
        return;
      }

      // Trail record
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 5) {
        ball.trail.shift();
      }

      // Speed control & slow-ball power-up
      if (ball.slowTimer > 0) {
        ball.slowTimer--;
      }
      const speedMultiplier = ball.slowTimer > 0 ? 0.72 : 1.0;
      const targetSpeed = ball.baseSpeed * speedMultiplier;

      // Normalize velocity
      const currentSpeed = Math.hypot(ball.vx, ball.vy);
      if (currentSpeed > 0) {
        ball.vx = (ball.vx / currentSpeed) * targetSpeed;
        ball.vy = (ball.vy / currentSpeed) * targetSpeed;
      }

      // Move
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Safeguard against near-horizontal angles
      if (Math.abs(ball.vy) < 1.4) {
        ball.vy = ball.vy < 0 ? -1.5 : 1.5;
      }

      // 2. Wall Collisions (Left, Right, Top)
      if (ball.x - ball.radius <= 0) {
        ball.x = ball.radius;
        ball.vx *= -1;
        playSound('wall');
        createSparks(ball.x, ball.y, '#00f0ff', 6);
      } else if (ball.x + ball.radius >= CANVAS_WIDTH) {
        ball.x = CANVAS_WIDTH - ball.radius;
        ball.vx *= -1;
        playSound('wall');
        createSparks(ball.x, ball.y, '#00f0ff', 6);
      }

      if (ball.y - ball.radius <= 0) {
        ball.y = ball.radius;
        ball.vy *= -1;
        playSound('wall');
        createSparks(ball.x, ball.y, '#00f0ff', 6);
      }

      // 3. Paddle Collision
      if (
        ball.vy > 0 &&
        ball.y + ball.radius >= paddle.y &&
        ball.y - ball.radius <= paddle.y + paddle.h &&
        ball.x >= paddle.x - ball.radius &&
        ball.x <= paddle.x + paddle.w + ball.radius
      ) {
        ball.y = paddle.y - ball.radius; // Reposition above paddle

        // Angle deflection based on hit position (-1 on left to +1 on right)
        const hitPoint = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
        const maxAngle = Math.PI * 0.42; // ~75 degrees
        const bounceAngle = Math.max(-maxAngle, Math.min(maxAngle, hitPoint * maxAngle));

        ball.vx = targetSpeed * Math.sin(bounceAngle);
        ball.vy = -targetSpeed * Math.cos(bounceAngle);

        playSound('paddle');
        createSparks(ball.x, ball.y, '#00f0ff', 8);
      }

      // 4. Brick Collisions
      checkBrickCollisions(ball);
    });

    // 5. Floor Drops & Ball Loss
    for (let i = balls.length - 1; i >= 0; i--) {
      if (balls[i].y - balls[i].radius > CANVAS_HEIGHT) {
        balls.splice(i, 1);
      }
    }

    // If all balls are lost
    if (balls.length === 0 && gameState === 'playing') {
      handleBallLost();
    }
  }

  function renderBalls() {
    balls.forEach(ball => {
      // Trail
      ball.trail.forEach((t, i) => {
        const alpha = (i + 1) / (ball.trail.length + 1) * 0.35;
        ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, ball.radius * 0.75, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ball Orb
      ctx.save();
      ctx.shadowColor = ball.slowTimer > 0 ? '#38bdf8' : '#00f0ff';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      // Colored rim
      ctx.strokeStyle = ball.slowTimer > 0 ? '#38bdf8' : '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    });
  }

  function handleBallLost() {
    lives--;
    playSound('loseLife');
    screenShake = 10;
    updateLivesUI();

    if (lives <= 0) {
      triggerGameOver();
    } else {
      // Reset paddle & spawn stuck ball
      paddle.x = CANVAS_WIDTH / 2 - paddle.w / 2;
      balls = [createBall(true)];
      addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'LAUNCH READY!', '#f59e0b', 18);
    }
  }

  function updateLivesUI() {
    livesDisplay.innerHTML = '';
    for (let i = 0; i < lives; i++) {
      const heart = document.createElement('span');
      heart.className = 'heart-icon';
      heart.textContent = '❤️';
      livesDisplay.appendChild(heart);
    }
  }

  /**
   * Bricks & Level Layouts
   */
  function buildLevelLayout(lvl) {
    bricks = [];

    // Distinct layouts cycling across levels
    const layoutIndex = (lvl - 1) % 5;
    const rows = 5 + Math.min(3, Math.floor((lvl - 1) / 2));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        let active = true;
        let hp = 1;
        let points = 50;
        let color = '#00f0ff'; // Cyan default

        if (layoutIndex === 0) {
          // Classic Horizontal Rows
          if (r === 0) { hp = 2; points = 100; color = '#ec4899'; }
          else if (r === 1) { hp = 2; points = 100; color = '#f59e0b'; }
          else if (r === 2) { hp = 1; points = 50; color = '#10b981'; }
          else if (r === 3) { hp = 1; points = 50; color = '#38bdf8'; }
          else { hp = 1; points = 50; color = '#a855f7'; }
        } else if (layoutIndex === 1) {
          // Fortress (Armored Core)
          if ((r === 1 || r === 2) && (c === 3 || c === 4)) {
            hp = 3; points = 200; color = '#facc15'; // Armored Gold
          } else if (r === 0 || r === 3) {
            hp = 2; points = 100; color = '#a855f7';
          } else {
            hp = 1; points = 50; color = '#00f0ff';
          }
        } else if (layoutIndex === 2) {
          // Checkered Diamond
          if ((r + c) % 2 === 0) {
            hp = 2; points = 100; color = '#ec4899';
          } else {
            hp = 1; points = 50; color = '#10b981';
          }
        } else if (layoutIndex === 3) {
          // Pyramid / Shield Arch
          if (c < r - 1 || c > (BRICK_COLS - r)) {
            active = false;
          } else if (r <= 1) {
            hp = 3; points = 200; color = '#facc15';
          } else {
            hp = 1; points = 50; color = '#38bdf8';
          }
        } else {
          // Boss Cyber Grid (High durability)
          if (r === 0) { hp = 3; points = 200; color = '#facc15'; }
          else if (r === 1 || r === 2) { hp = 2; points = 100; color = '#ec4899'; }
          else { hp = 1; points = 50; color = '#00f0ff'; }
        }

        if (active) {
          bricks.push({
            x: BRICK_OFFSET_LEFT + c * (BRICK_WIDTH + BRICK_GAP),
            y: BRICK_OFFSET_TOP + r * (BRICK_HEIGHT + BRICK_GAP),
            w: BRICK_WIDTH,
            h: BRICK_HEIGHT,
            hp: hp,
            maxHp: hp,
            points: points,
            color: color
          });
        }
      }
    }
  }

  function checkBrickCollisions(ball) {
    for (let i = bricks.length - 1; i >= 0; i--) {
      const b = bricks[i];

      // AABB closest point to circle collision
      const closestX = Math.max(b.x, Math.min(ball.x, b.x + b.w));
      const closestY = Math.max(b.y, Math.min(ball.y, b.y + b.h));

      const distX = ball.x - closestX;
      const distY = ball.y - closestY;
      const distanceSquared = distX * distX + distY * distY;

      if (distanceSquared < ball.radius * ball.radius) {
        // Collision confirmed! Determine bounce normal
        const overlapX = ball.radius - Math.abs(distX);
        const overlapY = ball.radius - Math.abs(distY);

        if (overlapX < overlapY) {
          ball.vx *= -1;
        } else {
          ball.vy *= -1;
        }

        // Damage brick
        b.hp--;
        playSound('brick');
        createSparks(closestX, closestY, b.color, 8);

        if (b.hp <= 0) {
          // Destroyed
          score += b.points;
          scoreDisplay.textContent = score;

          // Check Best Score
          if (score > bestScore) {
            bestScore = score;
            bestScoreDisplay.textContent = bestScore;
            localStorage.setItem(STORAGE_KEY_BEST, String(bestScore));
          }

          createExplosion(b.x + b.w / 2, b.y + b.h / 2, b.color, 16);

          // 18% Power-up drop chance
          if (Math.random() < 0.18) {
            spawnPowerup(b.x + b.w / 2, b.y + b.h / 2);
          }

          bricks.splice(i, 1);

          // Check Level Complete
          if (bricks.length === 0 && gameState === 'playing') {
            triggerLevelComplete();
            return;
          }
        }
        break; // Only 1 brick collision per ball frame
      }
    }
  }

  function renderBricks() {
    bricks.forEach(b => {
      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur = b.hp === b.maxHp ? 8 : 4;

      // Outer Brick Frame
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 4);
      ctx.fill();
      ctx.stroke();

      // Inner Core / Durability Indicator
      if (b.hp === 3) {
        // Armored Gold
        ctx.fillStyle = '#facc15';
        ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      } else if (b.hp === 2) {
        // Reinforced
        ctx.fillStyle = b.color;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      } else {
        // Single HP: subtle glow stripe
        ctx.fillStyle = b.color;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      }

      ctx.restore();
    });
  }

  /**
   * Power-ups (Multi-Ball, Wide Paddle, Slow Ball, Extra Life)
   */
  function spawnPowerup(x, y) {
    const types = ['multiball', 'wide', 'slow', 'life'];
    const chosen = types[Math.floor(Math.random() * types.length)];

    let color = '#00f0ff';
    let icon = '⚡';
    if (chosen === 'wide') { color = '#ec4899'; icon = '↔️'; }
    else if (chosen === 'slow') { color = '#38bdf8'; icon = '⏳'; }
    else if (chosen === 'life') { color = '#f43f5e'; icon = '❤️'; }

    powerups.push({
      x: x,
      y: y,
      type: chosen,
      color: color,
      icon: icon,
      vy: 2.0,
      radius: 12
    });
  }

  function updatePowerups() {
    powerups.forEach(p => {
      p.y += p.vy;

      // Paddle Catch
      if (
        p.y + p.radius >= paddle.y &&
        p.y - p.radius <= paddle.y + paddle.h &&
        p.x >= paddle.x &&
        p.x <= paddle.x + paddle.w
      ) {
        applyPowerup(p.type);
        p.collected = true;
      }
    });

    powerups = powerups.filter(p => !p.collected && p.y < CANVAS_HEIGHT + 20);
  }

  function applyPowerup(type) {
    playSound('powerup');

    if (type === 'multiball') {
      // Spawn 2 extra balls
      if (balls.length > 0) {
        const refBall = balls[0];
        balls.push(createBall(false, refBall.vx * 0.8 - 2.5, refBall.vy * 0.9));
        balls.push(createBall(false, refBall.vx * 0.8 + 2.5, refBall.vy * 0.9));
      }
      addFloatingText(paddle.x + paddle.w / 2, paddle.y - 20, '⚡ MULTI-BALL!', '#00f0ff', 16);
    } else if (type === 'wide') {
      paddle.wideTimer = 720; // 12 seconds
      addFloatingText(paddle.x + paddle.w / 2, paddle.y - 20, '↔️ WIDE PADDLE!', '#ec4899', 16);
    } else if (type === 'slow') {
      balls.forEach(b => { b.slowTimer = 600; }); // 10 seconds
      addFloatingText(paddle.x + paddle.w / 2, paddle.y - 20, '⏳ SLOW BALL!', '#38bdf8', 16);
    } else if (type === 'life') {
      if (lives < 5) {
        lives++;
        updateLivesUI();
        addFloatingText(paddle.x + paddle.w / 2, paddle.y - 20, '❤️ +1 LIFE!', '#f43f5e', 16);
      } else {
        score += 500;
        scoreDisplay.textContent = score;
        addFloatingText(paddle.x + paddle.w / 2, paddle.y - 20, '+500 PTS!', '#f59e0b', 16);
      }
    }
  }

  function renderPowerups() {
    powerups.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;

      // Capsule outline
      ctx.fillStyle = 'rgba(10, 16, 30, 0.9)';
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Icon
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.icon, 0, 0);

      ctx.restore();
    });
  }

  /**
   * Particles & Visual FX
   */
  function createSparks(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 1.5 + Math.random() * 3.5;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: color,
        size: 2 + Math.random() * 2,
        alpha: 1,
        decay: 0.04 + Math.random() * 0.04
      });
    }
  }

  function createExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 4.5;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: Math.random() < 0.3 ? '#ffffff' : color,
        size: 3 + Math.random() * 3,
        alpha: 1,
        decay: 0.025 + Math.random() * 0.03
      });
    }
  }

  function updateParticles() {
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.alpha -= p.decay;
    });
    particles = particles.filter(p => p.alpha > 0);
  }

  function renderParticles() {
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  /**
   * Floating Announcement Texts
   */
  function addFloatingText(x, y, text, color, fontSize = 16) {
    floatingTexts.push({
      x: x,
      y: y,
      text: text,
      color: color,
      fontSize: fontSize,
      alpha: 1,
      vy: -1.2
    });
  }

  function updateFloatingTexts() {
    floatingTexts.forEach(ft => {
      ft.y += ft.vy;
      ft.alpha -= 0.018;
    });
    floatingTexts = floatingTexts.filter(ft => ft.alpha > 0);
  }

  function renderFloatingTexts() {
    floatingTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `bold ${ft.fontSize}px 'Space Grotesk', sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 10;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  }

  /**
   * Level Clear & Game Over Transitions
   */
  function triggerLevelComplete() {
    gameState = 'levelclear';
    playSound('levelClear');

    const bonus = level * 500;
    score += bonus;
    scoreDisplay.textContent = score;

    lvlScoreVal.textContent = score;
    lvlClearedVal.textContent = `Level ${level}`;
    levelCompleteOverlay.classList.remove('hidden');
  }

  function nextLevel() {
    level++;
    levelDisplay.textContent = level;
    levelCompleteOverlay.classList.add('hidden');

    paddle = createPaddle();
    balls = [createBall(true)];
    powerups = [];
    particles = [];
    floatingTexts = [];

    buildLevelLayout(level);
    gameState = 'playing';

    addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20, `LEVEL ${level}`, '#00f0ff', 26);
    addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 15, 'PRESS SPACE / TAP TO LAUNCH', '#94a3b8', 14);
  }

  function triggerGameOver() {
    gameState = 'gameover';
    playSound('gameover');

    finalScoreVal.textContent = score;
    finalLevelVal.textContent = `Level ${level}`;

    const isNewBest = score >= bestScore && score > 0;
    if (isNewBest) {
      newBestBadge.classList.remove('hidden');
    } else {
      newBestBadge.classList.add('hidden');
    }

    finalBestVal.textContent = bestScore;
    gameOverOverlay.classList.remove('hidden');
  }

  function loadBestScore() {
    const saved = localStorage.getItem(STORAGE_KEY_BEST);
    bestScore = saved ? parseInt(saved, 10) || 0 : 0;
    bestScoreDisplay.textContent = bestScore;
  }

  /**
   * Main Game Loop
   */
  function gameLoop() {
    if (gameState === 'playing') {
      updatePaddle();
      updateBalls();
      updatePowerups();
      updateParticles();
      updateFloatingTexts();

      if (screenShake > 0) {
        screenShake--;
      }

      // Render
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.save();
      if (screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * screenShake;
        const shakeY = (Math.random() - 0.5) * screenShake;
        ctx.translate(shakeX, shakeY);
      }

      renderBricks();
      renderPowerups();
      renderPaddle();
      renderBalls();
      renderParticles();
      renderFloatingTexts();

      ctx.restore();
    }

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  /**
   * Flow Controls (Start, Pause, Resume, Restart)
   */
  function startGame() {
    gameState = 'playing';
    score = 0;
    level = 1;
    lives = 3;
    scoreDisplay.textContent = '0';
    levelDisplay.textContent = '1';

    paddle = createPaddle();
    balls = [createBall(true)];
    powerups = [];
    particles = [];
    floatingTexts = [];

    updateLivesUI();
    buildLevelLayout(level);

    startOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    levelCompleteOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');

    pauseToggleBtn.disabled = false;
    pauseBtnIcon.textContent = '⏸️';
    pauseBtnLabel.textContent = 'Pause';

    addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20, `LEVEL 1`, '#00f0ff', 26);
    addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 15, 'PRESS SPACE / TAP TO LAUNCH', '#94a3b8', 14);
  }

  function pauseGame() {
    if (gameState !== 'playing') return;
    gameState = 'paused';
    pauseOverlay.classList.remove('hidden');
    pauseBtnIcon.textContent = '▶';
    pauseBtnLabel.textContent = 'Resume';
  }

  function resumeGame() {
    if (gameState !== 'paused') return;
    gameState = 'playing';
    pauseOverlay.classList.add('hidden');
    pauseBtnIcon.textContent = '⏸️';
    pauseBtnLabel.textContent = 'Pause';
  }

  function togglePause() {
    playSound('click');
    if (gameState === 'playing') {
      pauseGame();
    } else if (gameState === 'paused') {
      resumeGame();
    }
  }

  /**
   * Input Handling & Event Listeners
   */
  function attachEventListeners() {
    // 1. Keyboard Controls
    window.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // Movement
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keys.left = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keys.right = true;
      }

      // Launch Ball
      if (e.key === ' ' || e.key === 'Spacebar') {
        if (gameState === 'start') {
          startGame();
          return;
        }
        launchBalls();
      }

      // Pause (P or Esc)
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        togglePause();
      }

      // Enter to start / retry
      if (e.key === 'Enter') {
        if (gameState === 'start' || gameState === 'gameover') {
          startGame();
        } else if (gameState === 'levelclear') {
          nextLevel();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keys.left = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keys.right = false;
      }
    });

    // 2. Mouse Movement on Canvas (Desktop)
    canvas.addEventListener('mousemove', (e) => {
      if (!paddle || (gameState !== 'playing' && gameState !== 'start')) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const mouseX = (e.clientX - rect.left) * scaleX;

      paddle.x = Math.max(6, Math.min(CANVAS_WIDTH - paddle.w - 6, mouseX - paddle.w / 2));
    });

    canvas.addEventListener('click', () => {
      if (gameState === 'start') {
        startGame();
      } else if (gameState === 'playing') {
        launchBalls();
      }
    });

    // 3. Mobile Touch Navigation Buttons
    // Left
    touchLeft.addEventListener('touchstart', (e) => {
      e.preventDefault();
      keys.left = true;
    }, { passive: false });
    touchLeft.addEventListener('touchend', (e) => {
      e.preventDefault();
      keys.left = false;
    });
    touchLeft.addEventListener('mousedown', () => { keys.left = true; });
    touchLeft.addEventListener('mouseup', () => { keys.left = false; });
    touchLeft.addEventListener('mouseleave', () => { keys.left = false; });

    // Right
    touchRight.addEventListener('touchstart', (e) => {
      e.preventDefault();
      keys.right = true;
    }, { passive: false });
    touchRight.addEventListener('touchend', (e) => {
      e.preventDefault();
      keys.right = false;
    });
    touchRight.addEventListener('mousedown', () => { keys.right = true; });
    touchRight.addEventListener('mouseup', () => { keys.right = false; });
    touchRight.addEventListener('mouseleave', () => { keys.right = false; });

    // Launch
    touchLaunch.addEventListener('touchstart', (e) => {
      e.preventDefault();
      launchBalls();
    }, { passive: false });
    touchLaunch.addEventListener('click', launchBalls);

    // 4. Direct Canvas Touch Dragging for Mobile
    function handleTouchMove(e) {
      if (!paddle || gameState !== 'playing') return;
      const touch = e.touches[0];
      if (!touch) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const touchX = (touch.clientX - rect.left) * scaleX;

      paddle.x = Math.max(6, Math.min(CANVAS_WIDTH - paddle.w - 6, touchX - paddle.w / 2));
    }

    canvas.addEventListener('touchstart', (e) => {
      if (e.cancelable) e.preventDefault();
      handleTouchMove(e);
      launchBalls(); // Tap launches ball if stuck
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      if (e.cancelable) e.preventDefault();
      handleTouchMove(e);
    }, { passive: false });

    // 5. Overlay and Flow Buttons
    startBtn.addEventListener('click', () => {
      playSound('click');
      startGame();
    });

    pauseToggleBtn.addEventListener('click', togglePause);

    resumeBtn.addEventListener('click', () => {
      playSound('click');
      resumeGame();
    });

    restartFromPauseBtn.addEventListener('click', () => {
      playSound('click');
      startGame();
    });

    restartBtn.addEventListener('click', () => {
      playSound('click');
      startGame();
    });

    nextLevelBtn.addEventListener('click', () => {
      playSound('click');
      nextLevel();
    });

    retryBtn.addEventListener('click', () => {
      playSound('click');
      startGame();
    });

    // 6. Tab Visibility Auto-Pause
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && gameState === 'playing') {
        pauseGame();
      }
    });

    // 7. Sound Toggle
    soundToggleBtn.addEventListener('click', () => {
      if (window.playZoneAudio && typeof window.playZoneAudio.toggle === 'function') {
        window.playZoneAudio.toggle();
        updateSoundUI();
      }
    });
  }

  // 6. Initializer
  function init() {
    loadBestScore();
    updateSoundUI();
    paddle = createPaddle();
    balls = [createBall(true)];
    buildLevelLayout(1);
    updateLivesUI();
    attachEventListeners();

    // Start render loop
    gameLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
