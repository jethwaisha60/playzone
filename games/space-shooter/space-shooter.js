/**
 * PlayZone - Space Shooter
 * Smooth 2D Canvas space combat game:
 * - Parallax starfield, procedural sci-fi ships, thruster exhaust
 * - 3 distinct enemy classes with unique AI movement and bullet spreads
 * - Wave progression system with increasing difficulty
 * - Power-up drops: Rapid Fire, Energy Shield, Extra Life
 * - High-speed particle explosions and screen shake
 * - Desktop keyboard, on-screen touch buttons, and direct canvas touch-drag
 * - Tab visibility auto-pause, Web Audio sound effects, and LocalStorage high scores
 */

(function () {
  'use strict';

  // 1. Constants & Configuration
  const CANVAS_WIDTH = 480;
  const CANVAS_HEIGHT = 640;
  const STORAGE_KEY_BEST = 'playzone_score_space_shooter';

  // 2. DOM Elements
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // HUD
  const livesDisplay = document.getElementById('livesDisplay');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const waveDisplay = document.getElementById('waveDisplay');
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
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const finalScoreVal = document.getElementById('finalScoreVal');
  const finalWaveVal = document.getElementById('finalWaveVal');
  const finalBestVal = document.getElementById('finalBestVal');
  const newBestBadge = document.getElementById('newBestBadge');
  const retryBtn = document.getElementById('retryBtn');

  // Mobile Touch Controls
  const touchLeft = document.getElementById('touchLeft');
  const touchRight = document.getElementById('touchRight');
  const touchFire = document.getElementById('touchFire');

  // Sound Toggle
  const soundToggleBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const soundLabel = soundToggleBtn.querySelector('.btn-label');

  // 3. Audio Integration
  function playSound(type) {
    if (!window.playZoneAudio || !window.playZoneAudio.enabled) return;

    switch (type) {
      case 'shoot':
        if (typeof window.playZoneAudio.playTone === 'function') {
          window.playZoneAudio.playTone(840, 'square', 0.04, 0.08);
        }
        break;
      case 'enemyShoot':
        if (typeof window.playZoneAudio.playTone === 'function') {
          window.playZoneAudio.playTone(320, 'sawtooth', 0.05, 0.06);
        }
        break;
      case 'explosion':
        if (typeof window.playZoneAudio.playTone === 'function') {
          window.playZoneAudio.playTone(160, 'sawtooth', 0.16, 0.18);
        }
        break;
      case 'powerup':
        if (typeof window.playZoneAudio.playSuccess === 'function') {
          window.playZoneAudio.playSuccess();
        }
        break;
      case 'hit':
        if (typeof window.playZoneAudio.playTone === 'function') {
          window.playZoneAudio.playTone(110, 'sawtooth', 0.22, 0.22);
        }
        break;
      case 'waveClear':
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
  let gameState = 'start'; // 'start' | 'playing' | 'paused' | 'gameover'
  let score = 0;
  let bestScore = 0;
  let wave = 1;
  let animationFrameId = null;
  let screenShake = 0;
  let waveBannerTimer = 0;

  // Starfield
  let stars = [];
  const STAR_COUNT = 75;

  // Entities
  let player = null;
  let playerLasers = [];
  let enemies = [];
  let enemyLasers = [];
  let powerups = [];
  let particles = [];
  let floatingTexts = [];

  // Input states
  const keys = {
    left: false,
    right: false,
    fire: false
  };

  /**
   * Starfield Parallax Initialization
   */
  function initStarfield() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        speed: 0.5 + Math.random() * 2.5,
        size: Math.random() < 0.2 ? 2.2 : 1.2,
        alpha: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.02 + Math.random() * 0.04
      });
    }
  }

  function updateStars() {
    stars.forEach(star => {
      star.y += star.speed;
      if (star.y > CANVAS_HEIGHT) {
        star.y = 0;
        star.x = Math.random() * CANVAS_WIDTH;
      }
      star.alpha += Math.sin(Date.now() * star.twinkleSpeed) * 0.02;
      star.alpha = Math.max(0.2, Math.min(1, star.alpha));
    });
  }

  function renderStars() {
    stars.forEach(star => {
      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });
  }

  /**
   * Player Setup & Logic
   */
  function createPlayer() {
    return {
      x: CANVAS_WIDTH / 2 - 20,
      y: CANVAS_HEIGHT - 75,
      w: 40,
      h: 46,
      speed: 6.5,
      lives: 3,
      shield: false,
      rapidFireTimer: 0,
      shootCooldown: 0,
      invulnerableTimer: 0,
      thrusterFrame: 0
    };
  }

  function updatePlayer() {
    // Movement
    if (keys.left && player.x > 8) {
      player.x -= player.speed;
    }
    if (keys.right && player.x < CANVAS_WIDTH - player.w - 8) {
      player.x += player.speed;
    }

    // Shooting
    if (player.shootCooldown > 0) {
      player.shootCooldown--;
    }

    if (keys.fire && player.shootCooldown <= 0) {
      shootPlayerLaser();
      player.shootCooldown = player.rapidFireTimer > 0 ? 8 : 15;
    }

    // Timers
    if (player.rapidFireTimer > 0) {
      player.rapidFireTimer--;
    }
    if (player.invulnerableTimer > 0) {
      player.invulnerableTimer--;
    }
    player.thrusterFrame++;
  }

  function shootPlayerLaser() {
    playSound('shoot');

    if (player.rapidFireTimer > 0) {
      // Twin lasers
      playerLasers.push({
        x: player.x + 8,
        y: player.y + 4,
        w: 4,
        h: 16,
        vy: -13,
        color: '#00f0ff'
      });
      playerLasers.push({
        x: player.x + player.w - 12,
        y: player.y + 4,
        w: 4,
        h: 16,
        vy: -13,
        color: '#00f0ff'
      });
    } else {
      // Center single bolt
      playerLasers.push({
        x: player.x + player.w / 2 - 2,
        y: player.y + 2,
        w: 4,
        h: 18,
        vy: -12,
        color: '#00f0ff'
      });
    }
  }

  function renderPlayer() {
    // Flashing during invulnerability
    if (player.invulnerableTimer > 0 && Math.floor(player.invulnerableTimer / 4) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(player.x, player.y);

    // 1. Thruster Flames
    const flameH = 10 + Math.sin(player.thrusterFrame * 0.4) * 6;
    ctx.fillStyle = player.rapidFireTimer > 0 ? '#00f0ff' : '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(player.w / 2 - 6, player.h - 2);
    ctx.lineTo(player.w / 2 + 6, player.h - 2);
    ctx.lineTo(player.w / 2, player.h + flameH);
    ctx.closePath();
    ctx.fill();

    // 2. Spaceship Hull (Procedural Neon Sci-Fi Fighter)
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;

    // Wings
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.w / 2, 0); // Nose tip
    ctx.lineTo(player.w, player.h - 8); // Right wingtip
    ctx.lineTo(player.w - 8, player.h); // Right inner wing
    ctx.lineTo(player.w / 2 + 5, player.h - 4);
    ctx.lineTo(player.w / 2 - 5, player.h - 4);
    ctx.lineTo(8, player.h); // Left inner wing
    ctx.lineTo(0, player.h - 8); // Left wingtip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit Canopy
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(player.w / 2, 18, 5, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Twin Cannons
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(4, 14, 3, 10);
    ctx.fillRect(player.w - 7, 14, 3, 10);

    // 3. Shield Bubble
    if (player.shield) {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(player.w / 2, player.h / 2, player.w / 2 + 12, player.h / 2 + 10, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Enemy Types & Wave Management
   */
  function spawnWave(waveNum) {
    enemies = [];
    enemyLasers = [];

    // Wave announcements
    addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20, `WAVE ${waveNum}`, '#00f0ff', 28);
    waveBannerTimer = 90;

    const baseSpeed = 1.2 + Math.min(2.0, waveNum * 0.2);

    // Rows and columns based on wave level
    const rows = Math.min(5, 2 + Math.floor(waveNum / 2));
    const cols = 6;
    const startX = 40;
    const spacingX = 65;
    const startY = 50;
    const spacingY = 46;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type = 'scout';
        let hp = 1;
        let points = 100;
        let color = '#ec4899';
        let w = 32;
        let h = 28;

        // Wave composition
        if (r === 0 && waveNum >= 3 && (c === 2 || c === 3)) {
          // Heavy Dreadnought
          type = 'dreadnought';
          hp = 5 + Math.floor(waveNum * 0.8);
          points = 500;
          color = '#a855f7';
          w = 46;
          h = 38;
        } else if (r <= 1 && waveNum >= 2) {
          // Cruiser
          type = 'cruiser';
          hp = 2 + (waveNum >= 4 ? 1 : 0);
          points = 250;
          color = '#f59e0b';
          w = 38;
          h = 32;
        }

        enemies.push({
          x: startX + c * spacingX,
          y: startY + r * spacingY,
          originX: startX + c * spacingX,
          w: w,
          h: h,
          type: type,
          hp: hp,
          maxHp: hp,
          points: points,
          color: color,
          vx: baseSpeed,
          vy: 0.15,
          shootCooldown: Math.floor(60 + Math.random() * 180),
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  function updateEnemies() {
    let touchedEdge = false;

    enemies.forEach(enemy => {
      // Movement patterns
      if (enemy.type === 'scout') {
        enemy.x += Math.sin(Date.now() * 0.003 + enemy.phase) * 2.2;
        enemy.y += enemy.vy;
      } else if (enemy.type === 'cruiser') {
        enemy.x += enemy.vx;
        enemy.y += enemy.vy * 0.8;
        if (enemy.x <= 15 || enemy.x >= CANVAS_WIDTH - enemy.w - 15) {
          touchedEdge = true;
        }
      } else if (enemy.type === 'dreadnought') {
        enemy.x += Math.cos(Date.now() * 0.002 + enemy.phase) * 1.5;
        enemy.y += enemy.vy * 0.5;
      }

      // Check if enemies reached bottom
      if (enemy.y + enemy.h >= player.y) {
        damagePlayer();
        enemy.hp = 0; // Destroy enemy that collided with player base
      }

      // Enemy Shooting AI
      enemy.shootCooldown--;
      if (enemy.shootCooldown <= 0) {
        shootEnemyLaser(enemy);
        enemy.shootCooldown = Math.max(80, 220 - wave * 12) + Math.floor(Math.random() * 100);
      }
    });

    // Invert cruisers direction when touching boundaries
    if (touchedEdge) {
      enemies.forEach(enemy => {
        if (enemy.type === 'cruiser') {
          enemy.vx *= -1;
          enemy.y += 10;
        }
      });
    }

    // Clean dead enemies
    enemies = enemies.filter(e => e.hp > 0);

    // Wave Clear Check
    if (enemies.length === 0 && gameState === 'playing' && waveBannerTimer <= 0) {
      waveCleared();
    }
  }

  function shootEnemyLaser(enemy) {
    playSound('enemyShoot');

    if (enemy.type === 'dreadnought') {
      // 3-way spread lasers
      [-1.5, 0, 1.5].forEach(vx => {
        enemyLasers.push({
          x: enemy.x + enemy.w / 2 - 2,
          y: enemy.y + enemy.h,
          w: 4,
          h: 12,
          vx: vx,
          vy: 4.5,
          color: '#ec4899'
        });
      });
    } else if (enemy.type === 'cruiser') {
      // Twin lasers
      enemyLasers.push({
        x: enemy.x + 6,
        y: enemy.y + enemy.h,
        w: 3.5,
        h: 11,
        vx: 0,
        vy: 4.8,
        color: '#f59e0b'
      });
      enemyLasers.push({
        x: enemy.x + enemy.w - 9,
        y: enemy.y + enemy.h,
        w: 3.5,
        h: 11,
        vx: 0,
        vy: 4.8,
        color: '#f59e0b'
      });
    } else {
      // Scout single shot
      enemyLasers.push({
        x: enemy.x + enemy.w / 2 - 2,
        y: enemy.y + enemy.h,
        w: 3.5,
        h: 10,
        vx: 0,
        vy: 4.2,
        color: '#f43f5e'
      });
    }
  }

  function renderEnemies() {
    enemies.forEach(enemy => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.shadowColor = enemy.color;
      ctx.shadowBlur = 10;

      if (enemy.type === 'scout') {
        // Scout Drone: sleek inverted neon dart
        ctx.fillStyle = '#1e112a';
        ctx.strokeStyle = enemy.color;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(enemy.w / 2, enemy.h); // Bottom point
        ctx.lineTo(enemy.w, 0); // Top right wing
        ctx.lineTo(enemy.w / 2, 8); // Center indent
        ctx.lineTo(0, 0); // Top left wing
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Eye core
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(enemy.w / 2, 14, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'cruiser') {
        // Cruiser Assault Ship: angular chevron
        ctx.fillStyle = '#221910';
        ctx.strokeStyle = enemy.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(enemy.w / 2, enemy.h);
        ctx.lineTo(enemy.w, 4);
        ctx.lineTo(enemy.w - 8, 0);
        ctx.lineTo(enemy.w / 2, 10);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Twin thrusters
        ctx.fillStyle = enemy.color;
        ctx.fillRect(8, 2, 4, 4);
        ctx.fillRect(enemy.w - 12, 2, 4, 4);
      } else if (enemy.type === 'dreadnought') {
        // Heavy Dreadnought: wide cyber battleship
        ctx.fillStyle = '#170c2a';
        ctx.strokeStyle = enemy.color;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(enemy.w / 2, enemy.h);
        ctx.lineTo(enemy.w, enemy.h - 10);
        ctx.lineTo(enemy.w - 4, 0);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, enemy.h - 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Core energy reactor
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(enemy.w / 2, 16, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  /**
   * Projectiles & Collision Physics
   */
  function updateLasers() {
    // 1. Update Player Lasers
    playerLasers.forEach(laser => {
      laser.y += laser.vy;
    });
    playerLasers = playerLasers.filter(laser => laser.y + laser.h > 0);

    // 2. Update Enemy Lasers
    enemyLasers.forEach(laser => {
      laser.x += laser.vx;
      laser.y += laser.vy;
    });
    enemyLasers = enemyLasers.filter(laser => laser.y < CANVAS_HEIGHT && laser.x > -20 && laser.x < CANVAS_WIDTH + 20);

    // 3. Collision: Player Lasers vs Enemies
    playerLasers.forEach((laser, lIndex) => {
      enemies.forEach(enemy => {
        if (
          laser.x < enemy.x + enemy.w &&
          laser.x + laser.w > enemy.x &&
          laser.y < enemy.y + enemy.h &&
          laser.y + laser.h > enemy.y
        ) {
          // Hit detected
          enemy.hp--;
          createSparks(laser.x, laser.y, enemy.color, 8);
          playerLasers.splice(lIndex, 1);

          if (enemy.hp <= 0) {
            destroyEnemy(enemy);
          }
        }
      });
    });

    // 4. Collision: Enemy Lasers vs Player
    enemyLasers.forEach((laser, index) => {
      if (
        player.invulnerableTimer <= 0 &&
        laser.x < player.x + player.w &&
        laser.x + laser.w > player.x &&
        laser.y < player.y + player.h &&
        laser.y + laser.h > player.y
      ) {
        enemyLasers.splice(index, 1);
        damagePlayer();
      }
    });

    // 5. Collision: Enemy Collision vs Player
    enemies.forEach(enemy => {
      if (
        player.invulnerableTimer <= 0 &&
        enemy.x < player.x + player.w &&
        enemy.x + enemy.w > player.x &&
        enemy.y < player.y + player.h &&
        enemy.y + enemy.h > player.y
      ) {
        enemy.hp = 0;
        destroyEnemy(enemy);
        damagePlayer();
      }
    });
  }

  function renderLasers() {
    // Player Lasers (Cyan)
    ctx.save();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    playerLasers.forEach(laser => {
      ctx.fillStyle = laser.color;
      ctx.fillRect(laser.x, laser.y, laser.w, laser.h);
    });
    ctx.restore();

    // Enemy Lasers (Red / Amber / Pink)
    ctx.save();
    enemyLasers.forEach(laser => {
      ctx.shadowColor = laser.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = laser.color;
      ctx.fillRect(laser.x, laser.y, laser.w, laser.h);
    });
    ctx.restore();
  }

  function destroyEnemy(enemy) {
    playSound('explosion');
    createExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.color, 24);
    score += enemy.points;
    scoreDisplay.textContent = score;

    // Check Best Score
    if (score > bestScore) {
      bestScore = score;
      bestScoreDisplay.textContent = bestScore;
      localStorage.setItem(STORAGE_KEY_BEST, String(bestScore));
    }

    // 18% Power-up drop chance
    if (Math.random() < 0.18) {
      spawnPowerup(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
    }
  }

  function damagePlayer() {
    if (player.shield) {
      // Shield absorbs hit
      player.shield = false;
      createExplosion(player.x + player.w / 2, player.y + player.h / 2, '#38bdf8', 20);
      addFloatingText(player.x, player.y - 15, 'SHIELD BROKEN!', '#38bdf8', 14);
      player.invulnerableTimer = 45;
      playSound('hit');
      return;
    }

    player.lives--;
    playSound('hit');
    createExplosion(player.x + player.w / 2, player.y + player.h / 2, '#f43f5e', 28);
    screenShake = 12;
    player.invulnerableTimer = 75;
    updateLivesUI();

    if (player.lives <= 0) {
      triggerGameOver();
    }
  }

  function updateLivesUI() {
    livesDisplay.innerHTML = '';
    for (let i = 0; i < player.lives; i++) {
      const heart = document.createElement('span');
      heart.className = 'heart-icon';
      heart.textContent = '❤️';
      livesDisplay.appendChild(heart);
    }
  }

  /**
   * Power-ups (Rapid Fire, Shield, Extra Life)
   */
  function spawnPowerup(x, y) {
    const types = ['rapid', 'shield', 'life'];
    const chosenType = types[Math.floor(Math.random() * types.length)];

    let color = '#00f0ff';
    let icon = '⚡';
    if (chosenType === 'shield') {
      color = '#c084fc';
      icon = '🛡️';
    } else if (chosenType === 'life') {
      color = '#ec4899';
      icon = '❤️';
    }

    powerups.push({
      x: x,
      y: y,
      type: chosenType,
      color: color,
      icon: icon,
      vy: 1.8,
      w: 24,
      h: 24,
      angle: 0
    });
  }

  function updatePowerups() {
    powerups.forEach(p => {
      p.y += p.vy;
      p.angle += 0.04;

      // Collision with player
      if (
        p.x < player.x + player.w &&
        p.x + p.w > player.x &&
        p.y < player.y + player.h &&
        p.y + p.h > player.y
      ) {
        applyPowerup(p.type);
        p.collected = true;
      }
    });

    powerups = powerups.filter(p => !p.collected && p.y < CANVAS_HEIGHT + 30);
  }

  function applyPowerup(type) {
    playSound('powerup');

    if (type === 'rapid') {
      player.rapidFireTimer = 600; // 10 seconds of rapid fire
      addFloatingText(player.x, player.y - 20, '⚡ RAPID FIRE!', '#00f0ff', 16);
    } else if (type === 'shield') {
      player.shield = true;
      addFloatingText(player.x, player.y - 20, '🛡️ SHIELD ACTIVE!', '#c084fc', 16);
    } else if (type === 'life') {
      if (player.lives < 5) {
        player.lives++;
        updateLivesUI();
        addFloatingText(player.x, player.y - 20, '❤️ +1 LIFE!', '#ec4899', 16);
      } else {
        score += 500;
        scoreDisplay.textContent = score;
        addFloatingText(player.x, player.y - 20, '+500 PTS!', '#f59e0b', 16);
      }
    }
  }

  function renderPowerups() {
    powerups.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;

      // Glowing capsule circle
      ctx.fillStyle = 'rgba(10, 16, 30, 0.85)';
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Icon symbol
      ctx.font = '13px sans-serif';
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
      const speed = 1.5 + Math.random() * 3.5;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: 2 + Math.random() * 2,
        alpha: 1,
        decay: 0.035 + Math.random() * 0.04
      });
    }
  }

  function createExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5.5;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() < 0.4 ? '#ffffff' : color,
        size: 3 + Math.random() * 3.5,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.03
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
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
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
   * Wave Progression
   */
  function waveCleared() {
    playSound('waveClear');
    wave++;
    waveDisplay.textContent = wave;
    addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'SECTOR CLEARED!', '#10b981', 24);

    setTimeout(() => {
      if (gameState === 'playing') {
        spawnWave(wave);
      }
    }, 1200);
  }

  /**
   * Game Over & High Score Management
   */
  function triggerGameOver() {
    gameState = 'gameover';
    playSound('gameover');

    finalScoreVal.textContent = score;
    finalWaveVal.textContent = `Wave ${wave}`;

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
      // 1. Update entities
      updateStars();
      updatePlayer();
      updateEnemies();
      updateLasers();
      updatePowerups();
      updateParticles();
      updateFloatingTexts();

      // Screen Shake
      if (screenShake > 0) {
        screenShake--;
      }

      // 2. Render
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.save();
      if (screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * screenShake;
        const shakeY = (Math.random() - 0.5) * screenShake;
        ctx.translate(shakeX, shakeY);
      }

      renderStars();
      renderPowerups();
      renderPlayer();
      renderEnemies();
      renderLasers();
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
    wave = 1;
    scoreDisplay.textContent = '0';
    waveDisplay.textContent = '1';

    player = createPlayer();
    updateLivesUI();

    playerLasers = [];
    enemyLasers = [];
    powerups = [];
    particles = [];
    floatingTexts = [];

    startOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');

    pauseToggleBtn.disabled = false;
    pauseBtnIcon.textContent = '⏸️';
    pauseBtnLabel.textContent = 'Pause';

    spawnWave(wave);
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
   * Event Listeners & Input Handlers
   */
  function attachEventListeners() {
    // 1. Desktop Keyboard Controls
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

      // Shooting
      if (e.key === ' ' || e.key === 'Spacebar') {
        if (gameState === 'start') {
          startGame();
          return;
        }
        keys.fire = true;
      }

      // Pause (P or Escape)
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        togglePause();
      }

      // Enter to start
      if (e.key === 'Enter') {
        if (gameState === 'start' || gameState === 'gameover') {
          startGame();
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
      if (e.key === ' ' || e.key === 'Spacebar') {
        keys.fire = false;
      }
    });

    // 2. Mobile On-Screen Buttons
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

    // Fire
    touchFire.addEventListener('touchstart', (e) => {
      e.preventDefault();
      keys.fire = true;
    }, { passive: false });
    touchFire.addEventListener('touchend', (e) => {
      e.preventDefault();
      keys.fire = false;
    });
    touchFire.addEventListener('mousedown', () => { keys.fire = true; });
    touchFire.addEventListener('mouseup', () => { keys.fire = false; });
    touchFire.addEventListener('mouseleave', () => { keys.fire = false; });

    // 3. Direct Canvas Touch Dragging for Fluid Mobile Control
    let isTouchingCanvas = false;

    function handleCanvasTouch(e) {
      if (gameState !== 'playing' || !player) return;
      const touch = e.touches[0];
      if (!touch) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const touchCanvasX = (touch.clientX - rect.left) * scaleX;

      // Position ship centered on finger
      player.x = Math.max(10, Math.min(CANVAS_WIDTH - player.w - 10, touchCanvasX - player.w / 2));
      keys.fire = true; // Auto-fire while steering with direct touch
    }

    canvas.addEventListener('touchstart', (e) => {
      if (e.cancelable) e.preventDefault();
      isTouchingCanvas = true;
      handleCanvasTouch(e);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      if (e.cancelable) e.preventDefault();
      if (isTouchingCanvas) {
        handleCanvasTouch(e);
      }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
      isTouchingCanvas = false;
      keys.fire = false;
    });

    // 4. Buttons and Overlays
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

    retryBtn.addEventListener('click', () => {
      playSound('click');
      startGame();
    });

    // 5. Tab Visibility Auto-Pause
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && gameState === 'playing') {
        pauseGame();
      }
    });

    // 6. Sound Toggle
    soundToggleBtn.addEventListener('click', () => {
      if (window.playZoneAudio && typeof window.playZoneAudio.toggle === 'function') {
        window.playZoneAudio.toggle();
        updateSoundUI();
      }
    });
  }

  // 5. Initializer
  function init() {
    loadBestScore();
    updateSoundUI();
    initStarfield();
    player = createPlayer();
    updateLivesUI();
    attachEventListeners();

    // Start background render loop
    gameLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
