/**
 * PlayZone - Neon Bubble Shooter Game Engine
 * 100% Vanilla HTML5 Canvas, Glossy Procedural Bubbles, Honeycomb Hex Grid,
 * Wall Bouncing, Matching, Disconnected Cluster Falling & Sound Synth.
 */

(function () {
  'use strict';

  // --- Configuration & Constants ---
  const STORAGE_KEY = 'playzone_score_bubble_shooter';
  const CANVAS_WIDTH = 480;
  const CANVAS_HEIGHT = 640;
  const BUBBLE_RADIUS = 24; // Diameter = 48px
  const BUBBLE_DIAMETER = BUBBLE_RADIUS * 2;
  const ROW_HEIGHT = BUBBLE_RADIUS * Math.sqrt(3); // ~41.57px
  const EVEN_COLS = 10;
  const ODD_COLS = 9;
  const MAX_ROWS = 14;
  const DANGER_LINE_Y = 505; // Danger threshold near bottom
  const LAUNCHER_X = CANVAS_WIDTH / 2; // 240
  const LAUNCHER_Y = 585;

  // 6 Distinct Vibrant Cyber Colors
  const BUBBLE_COLORS = {
    red: {
      name: 'Crimson',
      primary: '#ef4444',
      light: '#fca5a5',
      dark: '#991b1b',
      glow: 'rgba(239, 68, 68, 0.6)'
    },
    blue: {
      name: 'Cyan',
      primary: '#00f0ff',
      light: '#cffafe',
      dark: '#0891b2',
      glow: 'rgba(0, 240, 255, 0.6)'
    },
    green: {
      name: 'Emerald',
      primary: '#10b981',
      light: '#a7f3d0',
      dark: '#047857',
      glow: 'rgba(16, 185, 129, 0.6)'
    },
    yellow: {
      name: 'Amber',
      primary: '#f59e0b',
      light: '#fef08a',
      dark: '#b45309',
      glow: 'rgba(245, 158, 11, 0.6)'
    },
    purple: {
      name: 'Violet',
      primary: '#a855f7',
      light: '#f3e8ff',
      dark: '#6b21a8',
      glow: 'rgba(168, 85, 247, 0.6)'
    },
    pink: {
      name: 'Magenta',
      primary: '#ec4899',
      light: '#fce7f3',
      dark: '#9d174d',
      glow: 'rgba(236, 72, 153, 0.6)'
    }
  };

  // Difficulty Settings
  const DIFFICULTY_CONFIG = {
    easy: {
      colors: ['red', 'blue', 'green', 'yellow'],
      initialRows: 5,
      maxMisses: 6,
      bulletSpeed: 15
    },
    medium: {
      colors: ['red', 'blue', 'green', 'yellow', 'purple'],
      initialRows: 5,
      maxMisses: 5,
      bulletSpeed: 16
    },
    hard: {
      colors: ['red', 'blue', 'green', 'yellow', 'purple', 'pink'],
      initialRows: 6,
      maxMisses: 4,
      bulletSpeed: 18
    }
  };

  // --- Game State ---
  let currentDifficulty = 'medium';
  let activeColorKeys = [...DIFFICULTY_CONFIG.medium.colors];
  let grid = []; // 2D array [row][col] storing colorKey or null
  let currentBubbleColor = 'red';
  let nextBubbleColor = 'blue';
  let activeBullet = null; // flying bullet { x, y, vx, vy, color, radius }
  let launcherAngle = -Math.PI / 2; // aiming straight up (-90 degrees)
  let isAiming = false;
  let remainingMisses = 5;
  let score = 0;
  let bestScore = 0;
  let currentLevel = 1;
  let bubblesPoppedCount = 0;
  let chainDropsCount = 0;
  let isGameRunning = false;
  let isPaused = false;
  let isGameOver = false;

  // Particle & Drop Animations
  let particles = [];
  let fallingBubbles = [];
  let floatingTexts = [];

  // DOM Elements
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const nextBubbleCanvas = document.getElementById('nextBubbleCanvas');
  const nextCtx = nextBubbleCanvas.getContext('2d');

  const scoreDisplay = document.getElementById('scoreDisplay');
  const bestScoreDisplay = document.getElementById('bestScoreDisplay');
  const levelDisplay = document.getElementById('levelDisplay');
  const missesDisplay = document.getElementById('missesDisplay');
  const diffButtons = document.querySelectorAll('#difficultySelector .toggle-btn');

  // Overlays
  const startOverlay = document.getElementById('startOverlay');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const winOverlay = document.getElementById('winOverlay');
  const startGameBtn = document.getElementById('startGameBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const pauseToggleBtn = document.getElementById('pauseToggleBtn');
  const pauseBtnLabel = document.getElementById('pauseBtnLabel');
  const pauseBtnIcon = document.getElementById('pauseBtnIcon');
  const restartBtn = document.getElementById('restartBtn');
  const swapBubbleBtn = document.getElementById('swapBubbleBtn');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const nextLevelBtn = document.getElementById('nextLevelBtn');
  const winRestartBtn = document.getElementById('winRestartBtn');
  const soundToggleBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');

  // --- Audio Synth Helpers ---
  function playAudioTone(freq, type = 'sine', duration = 0.1, volume = 0.2) {
    if (window.playZoneAudio && window.playZoneAudio.enabled) {
      window.playZoneAudio.playTone(freq, type, duration, volume);
    }
  }

  function playShootSound() {
    if (!window.playZoneAudio || !window.playZoneAudio.enabled) return;
    try {
      const actx = window.playZoneAudio.ctx;
      if (!actx) return;
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, actx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(780, actx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start();
      osc.stop(actx.currentTime + 0.12);
    } catch (e) {
      // fallback
      playAudioTone(520, 'triangle', 0.08, 0.15);
    }
  }

  function playBounceSound() {
    playAudioTone(440, 'sine', 0.05, 0.12);
  }

  function playPopSound(combo = 3) {
    if (!window.playZoneAudio || !window.playZoneAudio.enabled) return;
    try {
      const actx = window.playZoneAudio.ctx;
      if (!actx) return;
      const baseFreq = 500 + Math.min(combo * 40, 400);
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, actx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, actx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.25, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start();
      osc.stop(actx.currentTime + 0.09);
    } catch (e) {
      playAudioTone(680, 'sine', 0.08, 0.18);
    }
  }

  function playChainReactionSound() {
    if (!window.playZoneAudio || !window.playZoneAudio.enabled) return;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        playAudioTone(freq, 'triangle', 0.14, 0.16);
      }, idx * 60);
    });
  }

  function playWinSound() {
    if (window.playZoneAudio) window.playZoneAudio.playSuccess();
  }

  function playGameOverSound() {
    if (window.playZoneAudio) window.playZoneAudio.playGameOver();
  }

  function updateSoundUI() {
    if (window.playZoneAudio) {
      const muted = !window.playZoneAudio.enabled;
      soundIcon.textContent = muted ? '🔇' : '🔊';
      soundToggleBtn.classList.toggle('muted', muted);
    }
  }

  // --- LocalStorage Helper ---
  function loadBestScore() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      bestScore = saved ? parseInt(saved, 10) || 0 : 0;
    } catch (e) {
      bestScore = 0;
    }
    bestScoreDisplay.textContent = `${bestScore.toLocaleString()} pts`;
  }

  function saveBestScore(newScore) {
    if (newScore > bestScore) {
      bestScore = newScore;
      try {
        localStorage.setItem(STORAGE_KEY, bestScore.toString());
      } catch (e) {
        // ignore
      }
      bestScoreDisplay.textContent = `${bestScore.toLocaleString()} pts`;
      return true;
    }
    return false;
  }

  // --- Hexagonal Grid Math ---
  function getNumCols(row) {
    return (row % 2 === 0) ? EVEN_COLS : ODD_COLS;
  }

  function getSlotPos(row, col) {
    const isEven = (row % 2 === 0);
    const x = isEven
      ? BUBBLE_RADIUS + col * BUBBLE_DIAMETER
      : BUBBLE_DIAMETER + col * BUBBLE_DIAMETER;
    const y = BUBBLE_RADIUS + row * ROW_HEIGHT;
    return { x, y };
  }

  function getNeighbors(row, col) {
    const neighbors = [];
    const isEven = (row % 2 === 0);
    const numCols = getNumCols(row);

    // Left and Right
    if (col > 0) neighbors.push({ r: row, c: col - 1 });
    if (col < numCols - 1) neighbors.push({ r: row, c: col + 1 });

    // Top Neighbors
    if (row > 0) {
      if (isEven) {
        // Even row connects to col-1 and col of odd row
        if (col > 0) neighbors.push({ r: row - 1, c: col - 1 });
        if (col < ODD_COLS) neighbors.push({ r: row - 1, c: col });
      } else {
        // Odd row connects to col and col+1 of even row
        neighbors.push({ r: row - 1, c: col });
        if (col + 1 < EVEN_COLS) neighbors.push({ r: row - 1, c: col + 1 });
      }
    }

    // Bottom Neighbors
    if (row < MAX_ROWS - 1) {
      if (isEven) {
        if (col > 0) neighbors.push({ r: row + 1, c: col - 1 });
        if (col < ODD_COLS) neighbors.push({ r: row + 1, c: col });
      } else {
        neighbors.push({ r: row + 1, c: col });
        if (col + 1 < EVEN_COLS) neighbors.push({ r: row + 1, c: col + 1 });
      }
    }

    return neighbors;
  }

  // --- Board Initialization ---
  function initBoard() {
    grid = [];
    const cfg = DIFFICULTY_CONFIG[currentDifficulty];
    activeColorKeys = [...cfg.colors];
    remainingMisses = cfg.maxMisses;
    updateMissesUI();

    for (let r = 0; r < MAX_ROWS; r++) {
      const cols = getNumCols(r);
      const rowArr = [];
      for (let c = 0; c < cols; c++) {
        if (r < cfg.initialRows) {
          // Fill top rows with random colors
          const randColor = activeColorKeys[Math.floor(Math.random() * activeColorKeys.length)];
          rowArr.push(randColor);
        } else {
          rowArr.push(null);
        }
      }
      grid.push(rowArr);
    }

    // Pick launcher bubbles
    currentBubbleColor = getRandomActiveBoardColor();
    nextBubbleColor = getRandomActiveBoardColor();
    renderNextBubblePreview();
  }

  // Get random color from colors currently present on the grid so the shot is always useful
  function getRandomActiveBoardColor() {
    const presentColors = new Set();
    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < getNumCols(r); c++) {
        if (grid[r][c]) {
          presentColors.add(grid[r][c]);
        }
      }
    }

    const available = Array.from(presentColors);
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }
    return activeColorKeys[Math.floor(Math.random() * activeColorKeys.length)];
  }

  function renderNextBubblePreview() {
    nextCtx.clearRect(0, 0, nextBubbleCanvas.width, nextBubbleCanvas.height);
    drawGlossyBubble(
      nextCtx,
      nextBubbleCanvas.width / 2,
      nextBubbleCanvas.height / 2,
      15,
      nextBubbleColor
    );
  }

  function updateMissesUI() {
    const cfg = DIFFICULTY_CONFIG[currentDifficulty];
    missesDisplay.innerHTML = '';
    for (let i = 0; i < cfg.maxMisses; i++) {
      const dot = document.createElement('span');
      dot.className = `foul-dot ${i < remainingMisses ? 'active' : ''}`;
      missesDisplay.appendChild(dot);
    }
  }

  // --- Swap Current and Next Bubble ---
  function swapBubbles() {
    if (!isGameRunning || isPaused || isGameOver || activeBullet) return;
    const temp = currentBubbleColor;
    currentBubbleColor = nextBubbleColor;
    nextBubbleColor = temp;
    renderNextBubblePreview();
    playAudioTone(480, 'sine', 0.05, 0.1);
  }

  // --- Procedural Glossy 3D Bubble Drawing ---
  function drawGlossyBubble(targetCtx, x, y, radius, colorKey, scale = 1, alpha = 1) {
    const col = BUBBLE_COLORS[colorKey] || BUBBLE_COLORS.red;

    targetCtx.save();
    targetCtx.translate(x, y);
    if (scale !== 1) targetCtx.scale(scale, scale);
    targetCtx.globalAlpha = alpha;

    // Outer Glow
    targetCtx.shadowColor = col.glow;
    targetCtx.shadowBlur = 10;

    // Sphere Base Radial Gradient (Upper-left light source)
    const baseGrad = targetCtx.createRadialGradient(
      -radius * 0.35,
      -radius * 0.35,
      radius * 0.1,
      0,
      0,
      radius
    );
    baseGrad.addColorStop(0, col.light);
    baseGrad.addColorStop(0.35, col.primary);
    baseGrad.addColorStop(0.75, col.dark);
    baseGrad.addColorStop(1, 'rgba(10, 10, 20, 0.85)');

    targetCtx.fillStyle = baseGrad;
    targetCtx.beginPath();
    targetCtx.arc(0, 0, radius, 0, Math.PI * 2);
    targetCtx.fill();

    // Turn off shadow for crisp highlights
    targetCtx.shadowBlur = 0;

    // Primary Glossy Reflection Spot (Upper-left specular ellipse)
    targetCtx.save();
    targetCtx.rotate(-Math.PI / 4);
    const hlGrad = targetCtx.createLinearGradient(0, -radius * 0.8, 0, -radius * 0.2);
    hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.88)');
    hlGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
    hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    targetCtx.fillStyle = hlGrad;
    targetCtx.beginPath();
    targetCtx.ellipse(-radius * 0.15, -radius * 0.45, radius * 0.42, radius * 0.22, 0, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.restore();

    // Secondary Bottom-Right Soft Rim Reflection
    targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    targetCtx.lineWidth = 1.5;
    targetCtx.beginPath();
    targetCtx.arc(0, 0, radius - 1.5, 0.4, 1.4);
    targetCtx.stroke();

    targetCtx.restore();
  }

  // --- Aiming Ray-Casting & Guide Line ---
  function drawAimingGuide() {
    if (activeBullet || !isGameRunning || isPaused || isGameOver) return;

    let rx = LAUNCHER_X;
    let ry = LAUNCHER_Y;
    let dx = Math.cos(launcherAngle);
    let dy = Math.sin(launcherAngle);

    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;

    ctx.beginPath();
    ctx.moveTo(rx, ry);

    let maxSteps = 120;
    let stepSize = 8;
    let targetSlot = null;

    for (let i = 0; i < maxSteps; i++) {
      rx += dx * stepSize;
      ry += dy * stepSize;

      // Bounce off left wall
      if (rx - BUBBLE_RADIUS <= 0) {
        rx = BUBBLE_RADIUS;
        dx = -dx;
        ctx.lineTo(rx, ry);
      }
      // Bounce off right wall
      else if (rx + BUBBLE_RADIUS >= CANVAS_WIDTH) {
        rx = CANVAS_WIDTH - BUBBLE_RADIUS;
        dx = -dx;
        ctx.lineTo(rx, ry);
      }

      // Check collision with ceiling
      if (ry - BUBBLE_RADIUS <= 0) {
        ctx.lineTo(rx, ry);
        targetSlot = findClosestSlot(rx, ry);
        break;
      }

      // Check collision with any existing grid bubble
      let hit = false;
      for (let r = 0; r < MAX_ROWS; r++) {
        for (let c = 0; c < getNumCols(r); c++) {
          if (grid[r][c]) {
            const pos = getSlotPos(r, c);
            const dist = Math.hypot(rx - pos.x, ry - pos.y);
            if (dist <= BUBBLE_DIAMETER - 2) {
              hit = true;
              break;
            }
          }
        }
        if (hit) break;
      }

      if (hit) {
        ctx.lineTo(rx, ry);
        targetSlot = findClosestSlot(rx, ry);
        break;
      }
    }

    ctx.stroke();
    ctx.restore();

    // Draw ghost landing indicator if slot found
    if (targetSlot) {
      const slotPos = getSlotPos(targetSlot.r, targetSlot.c);
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(slotPos.x, slotPos.y, BUBBLE_RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      // Ghost bubble hint
      drawGlossyBubble(ctx, slotPos.x, slotPos.y, BUBBLE_RADIUS, currentBubbleColor, 0.85, 0.35);
      ctx.restore();
    }
  }

  // --- Launcher Turret Drawing ---
  function drawLauncher() {
    ctx.save();
    ctx.translate(LAUNCHER_X, LAUNCHER_Y);

    // Mechanical Turret Base
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#00f0ff';
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Glowing Inner Ring
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.stroke();

    // Rotatable Cannon Barrel Pointer
    ctx.save();
    ctx.rotate(launcherAngle + Math.PI / 2);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-6, -46, 12, 22, [4, 4, 0, 0]);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Loaded Current Bubble inside launcher
    if (!activeBullet) {
      drawGlossyBubble(ctx, 0, 0, BUBBLE_RADIUS - 2, currentBubbleColor);
    }

    ctx.restore();
  }

  // --- Danger Line Drawing ---
  function drawDangerLine() {
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(0, DANGER_LINE_Y);
    ctx.lineTo(CANVAS_WIDTH, DANGER_LINE_Y);
    ctx.stroke();

    // Danger text
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(248, 113, 113, 0.75)';
    ctx.fillText('⚠ DANGER ZONE', 12, DANGER_LINE_Y - 6);
    ctx.restore();
  }

  // --- Bullet Shooting & Physics ---
  function shootBubble() {
    if (activeBullet || !isGameRunning || isPaused || isGameOver) return;

    const cfg = DIFFICULTY_CONFIG[currentDifficulty];
    const speed = cfg.bulletSpeed;

    activeBullet = {
      x: LAUNCHER_X,
      y: LAUNCHER_Y,
      vx: Math.cos(launcherAngle) * speed,
      vy: Math.sin(launcherAngle) * speed,
      color: currentBubbleColor,
      radius: BUBBLE_RADIUS
    };

    playShootSound();

    // Advance queue
    currentBubbleColor = nextBubbleColor;
    nextBubbleColor = getRandomActiveBoardColor();
    renderNextBubblePreview();
  }

  function updateBullet() {
    if (!activeBullet) return;

    // Sub-stepping to prevent tunneling
    const totalDist = Math.hypot(activeBullet.vx, activeBullet.vy);
    const stepCount = Math.ceil(totalDist / 4);
    const stepVx = activeBullet.vx / stepCount;
    const stepVy = activeBullet.vy / stepCount;

    for (let s = 0; s < stepCount; s++) {
      activeBullet.x += stepVx;
      activeBullet.y += stepVy;

      // Left Wall Bounce
      if (activeBullet.x - activeBullet.radius <= 0) {
        activeBullet.x = activeBullet.radius;
        activeBullet.vx = -activeBullet.vx;
        playBounceSound();
      }
      // Right Wall Bounce
      else if (activeBullet.x + activeBullet.radius >= CANVAS_WIDTH) {
        activeBullet.x = CANVAS_WIDTH - activeBullet.radius;
        activeBullet.vx = -activeBullet.vx;
        playBounceSound();
      }

      // Ceiling Collision
      if (activeBullet.y - activeBullet.radius <= 0) {
        handleBulletCollision();
        return;
      }

      // Collision with Grid Bubbles
      let collided = false;
      for (let r = 0; r < MAX_ROWS; r++) {
        for (let c = 0; c < getNumCols(r); c++) {
          if (grid[r][c]) {
            const pos = getSlotPos(r, c);
            const dist = Math.hypot(activeBullet.x - pos.x, activeBullet.y - pos.y);
            if (dist <= BUBBLE_DIAMETER - 2) {
              collided = true;
              break;
            }
          }
        }
        if (collided) break;
      }

      if (collided) {
        handleBulletCollision();
        return;
      }
    }
  }

  // Find the closest valid empty slot
  function findClosestSlot(bx, by) {
    let closest = null;
    let minDist = Infinity;

    for (let r = 0; r < MAX_ROWS; r++) {
      const numCols = getNumCols(r);
      for (let c = 0; c < numCols; c++) {
        if (!grid[r][c]) {
          // Slot must be in row 0 OR adjacent to at least one existing bubble
          let isAttachable = (r === 0);
          if (!isAttachable) {
            const nbrs = getNeighbors(r, c);
            for (let n of nbrs) {
              if (grid[n.r][n.c]) {
                isAttachable = true;
                break;
              }
            }
          }

          if (isAttachable) {
            const pos = getSlotPos(r, c);
            const dist = Math.hypot(bx - pos.x, by - pos.y);
            if (dist < minDist) {
              minDist = dist;
              closest = { r, c };
            }
          }
        }
      }
    }

    return closest;
  }

  // Handle Collision & Grid Snap
  function handleBulletCollision() {
    const slot = findClosestSlot(activeBullet.x, activeBullet.y);
    const color = activeBullet.color;
    activeBullet = null;

    if (!slot) {
      // Emergency overflow
      handleGameOver('Grid overflow!');
      return;
    }

    // Attach bubble to grid
    grid[slot.r][slot.c] = color;

    // Check Matches
    const matchCluster = findConnectedCluster(slot.r, slot.c, color);

    if (matchCluster.length >= 3) {
      // Pop matching cluster!
      popCluster(matchCluster, color);

      // Check and drop floating disconnected bubbles
      dropDisconnectedBubbles();

      // Check win condition
      checkWinCondition();
    } else {
      // Foul / Missed shot: deduct 1 from remaining misses
      remainingMisses--;
      updateMissesUI();

      if (remainingMisses <= 0) {
        pushNewRow();
        const cfg = DIFFICULTY_CONFIG[currentDifficulty];
        remainingMisses = cfg.maxMisses;
        updateMissesUI();
      }

      // Check if bubbles crossed danger line
      checkDangerLineCrossing();
    }
  }

  // --- Matching (Breadth-First Search) ---
  function findConnectedCluster(startR, startC, targetColor) {
    const cluster = [];
    const visited = new Set();
    const queue = [{ r: startR, c: startC }];
    visited.add(`${startR},${startC}`);

    while (queue.length > 0) {
      const curr = queue.shift();
      cluster.push(curr);

      const nbrs = getNeighbors(curr.r, curr.c);
      for (let n of nbrs) {
        const key = `${n.r},${n.c}`;
        if (!visited.has(key) && grid[n.r][n.c] === targetColor) {
          visited.add(key);
          queue.push(n);
        }
      }
    }

    return cluster;
  }

  function popCluster(cluster, colorKey) {
    playPopSound(cluster.length);
    const pointsGained = cluster.length * 10;
    score += pointsGained;
    bubblesPoppedCount += cluster.length;
    scoreDisplay.textContent = score.toLocaleString();

    cluster.forEach(cell => {
      const pos = getSlotPos(cell.r, cell.c);
      grid[cell.r][cell.c] = null;
      spawnBubbleParticles(pos.x, pos.y, colorKey);
      spawnFloatingText(`+10`, pos.x, pos.y, '#00f0ff');
    });
  }

  // --- Disconnected / Floating Bubbles Drop ---
  function dropDisconnectedBubbles() {
    const connectedToCeiling = new Set();
    const queue = [];

    // All bubbles in row 0 are anchored
    for (let c = 0; c < getNumCols(0); c++) {
      if (grid[0][c]) {
        queue.push({ r: 0, c });
        connectedToCeiling.add(`0,${c}`);
      }
    }

    // BFS to find all reachable bubbles
    while (queue.length > 0) {
      const curr = queue.shift();
      const nbrs = getNeighbors(curr.r, curr.c);
      for (let n of nbrs) {
        const key = `${n.r},${n.c}`;
        if (!connectedToCeiling.has(key) && grid[n.r][n.c] !== null) {
          connectedToCeiling.add(key);
          queue.push(n);
        }
      }
    }

    // Any bubble not connected to ceiling must fall!
    const droppedCells = [];
    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < getNumCols(r); c++) {
        if (grid[r][c] !== null && !connectedToCeiling.has(`${r},${c}`)) {
          droppedCells.push({ r, c, color: grid[r][c] });
          grid[r][c] = null;
        }
      }
    }

    if (droppedCells.length > 0) {
      playChainReactionSound();
      const dropBonus = droppedCells.length * 20;
      score += dropBonus;
      chainDropsCount += droppedCells.length;
      scoreDisplay.textContent = score.toLocaleString();

      droppedCells.forEach(cell => {
        const pos = getSlotPos(cell.r, cell.c);
        spawnFallingBubble(pos.x, pos.y, cell.color);
        spawnFloatingText(`+20`, pos.x, pos.y, '#fbbf24');
      });
    }
  }

  // --- Push New Row from Top ---
  function pushNewRow() {
    // Shift all rows down by 1
    for (let r = MAX_ROWS - 1; r > 0; r--) {
      grid[r] = [...grid[r - 1]];
    }

    // Generate fresh top row
    const newTopRow = [];
    for (let c = 0; c < getNumCols(0); c++) {
      const randColor = activeColorKeys[Math.floor(Math.random() * activeColorKeys.length)];
      newTopRow.push(randColor);
    }
    grid[0] = newTopRow;

    playBounceSound();
    checkDangerLineCrossing();
  }

  // --- Danger Line Check ---
  function checkDangerLineCrossing() {
    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < getNumCols(r); c++) {
        if (grid[r][c]) {
          const pos = getSlotPos(r, c);
          if (pos.y + BUBBLE_RADIUS >= DANGER_LINE_Y) {
            handleGameOver('Bubbles breached the danger line!');
            return true;
          }
        }
      }
    }
    return false;
  }

  // --- Win / Clear Condition Check ---
  function checkWinCondition() {
    let remaining = 0;
    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < getNumCols(r); c++) {
        if (grid[r][c]) remaining++;
      }
    }

    if (remaining === 0) {
      handleVictory();
    }
  }

  // --- Particle Systems ---
  function spawnBubbleParticles(x, y, colorKey) {
    const col = BUBBLE_COLORS[colorKey] || BUBBLE_COLORS.red;
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3.5,
        color: Math.random() > 0.4 ? col.primary : col.light,
        alpha: 1.0,
        decay: 0.025 + Math.random() * 0.02
      });
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
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

  // Falling Disconnected Bubbles Animation
  function spawnFallingBubble(x, y, colorKey) {
    fallingBubbles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: -1 - Math.random() * 2,
      gravity: 0.45,
      color: colorKey,
      alpha: 1.0,
      scale: 1.0
    });
  }

  function updateFallingBubbles() {
    for (let i = fallingBubbles.length - 1; i >= 0; i--) {
      const fb = fallingBubbles[i];
      fb.x += fb.vx;
      fb.y += fb.vy;
      fb.vy += fb.gravity;
      fb.scale *= 0.98;
      fb.alpha -= 0.015;

      if (fb.y > CANVAS_HEIGHT + 40 || fb.alpha <= 0) {
        fallingBubbles.splice(i, 1);
      }
    }
  }

  function drawFallingBubbles() {
    fallingBubbles.forEach(fb => {
      drawGlossyBubble(ctx, fb.x, fb.y, BUBBLE_RADIUS, fb.color, fb.scale, fb.alpha);
    });
  }

  // Floating Score Pops (+10, +20)
  function spawnFloatingText(text, x, y, color = '#00f0ff') {
    floatingTexts.push({
      text,
      x,
      y,
      vy: -1.4,
      alpha: 1.0,
      color
    });
  }

  function updateFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.025;
      if (ft.alpha <= 0) {
        floatingTexts.splice(i, 1);
      }
    }
  }

  function drawFloatingTexts() {
    ctx.save();
    ctx.font = '800 14px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    floatingTexts.forEach(ft => {
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.restore();
  }

  // --- Game Loop ---
  function gameLoop() {
    if (!isPaused && isGameRunning) {
      updateBullet();
      updateParticles();
      updateFallingBubbles();
      updateFloatingTexts();
    }

    render();
    requestAnimationFrame(gameLoop);
  }

  // --- Render Frame ---
  function render() {
    // Clear Canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle background cyber grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }

    // Draw Danger Zone Line
    drawDangerLine();

    // Draw Aiming Guide
    drawAimingGuide();

    // Draw Grid Bubbles
    for (let r = 0; r < MAX_ROWS; r++) {
      const cols = getNumCols(r);
      for (let c = 0; c < cols; c++) {
        if (grid[r] && grid[r][c]) {
          const pos = getSlotPos(r, c);
          drawGlossyBubble(ctx, pos.x, pos.y, BUBBLE_RADIUS, grid[r][c]);
        }
      }
    }

    // Draw Falling Chain Reaction Bubbles
    drawFallingBubbles();

    // Draw Burst Particles
    drawParticles();

    // Draw Floating Score Texts
    drawFloatingTexts();

    // Draw Active Flying Bullet
    if (activeBullet) {
      drawGlossyBubble(ctx, activeBullet.x, activeBullet.y, activeBullet.radius, activeBullet.color);
    }

    // Draw Launcher Turret
    drawLauncher();
  }

  // --- Aim Angle Calculation ---
  function updateAimAngle(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    const targetX = (clientX - rect.left) * scaleX;
    const targetY = (clientY - rect.top) * scaleY;

    // Angle from launcher to pointer
    let angle = Math.atan2(targetY - LAUNCHER_Y, targetX - LAUNCHER_X);

    // Clamp angle to upper hemisphere (-165 deg to -15 deg)
    const minAngle = -Math.PI + 0.25; // ~ -165 deg
    const maxAngle = -0.25; // ~ -15 deg
    angle = Math.max(minAngle, Math.min(maxAngle, angle));

    launcherAngle = angle;
  }

  // --- Game Lifecycle & Flow ---
  function startGame() {
    hideAllOverlays();
    isGameRunning = true;
    isPaused = false;
    isGameOver = false;
    score = 0;
    currentLevel = 1;
    bubblesPoppedCount = 0;
    chainDropsCount = 0;
    activeBullet = null;
    particles = [];
    fallingBubbles = [];
    floatingTexts = [];

    scoreDisplay.textContent = '0';
    levelDisplay.textContent = '1';

    initBoard();
    playAudioTone(520, 'triangle', 0.1, 0.2);
  }

  function handleGameOver(reason = 'Bubbles reached danger line!') {
    isGameOver = true;
    isGameRunning = false;
    playGameOverSound();

    const isNew = saveBestScore(score);

    document.getElementById('gameOverReason').textContent = reason;
    document.getElementById('finalScoreVal').textContent = `${score.toLocaleString()} pts`;
    document.getElementById('finalBestVal').textContent = `${bestScore.toLocaleString()} pts`;
    document.getElementById('finalPoppedVal').textContent = bubblesPoppedCount.toString();
    document.getElementById('finalLevelVal').textContent = currentLevel.toString();
    document.getElementById('finalDropsVal').textContent = chainDropsCount.toString();

    const newBadge = document.getElementById('newBestBadge');
    newBadge.classList.toggle('hidden', !isNew);

    setTimeout(() => {
      gameOverOverlay.classList.remove('hidden');
    }, 400);
  }

  function handleVictory() {
    isGameRunning = false;
    playWinSound();

    score += 500; // Level Clear Bonus
    saveBestScore(score);
    scoreDisplay.textContent = score.toLocaleString();

    document.getElementById('winScoreVal').textContent = `${score.toLocaleString()} pts`;
    document.getElementById('winLevelVal').textContent = currentLevel.toString();

    setTimeout(() => {
      winOverlay.classList.remove('hidden');
    }, 400);
  }

  function nextLevel() {
    winOverlay.classList.add('hidden');
    currentLevel++;
    levelDisplay.textContent = currentLevel.toString();
    isGameRunning = true;
    isGameOver = false;
    activeBullet = null;
    initBoard();
    playAudioTone(660, 'sine', 0.12, 0.2);
  }

  function togglePause() {
    if (!isGameRunning || isGameOver) return;
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

  function hideAllOverlays() {
    startOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    winOverlay.classList.add('hidden');
  }

  // --- Auto-Pause on Tab Visibility Change ---
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isGameRunning && !isPaused && !isGameOver) {
      togglePause();
    }
  });

  // --- Input & Event Listeners ---
  function setupEvents() {
    // Canvas Mouse Events
    canvas.addEventListener('mousemove', (e) => {
      if (!isGameRunning || isPaused || isGameOver) return;
      updateAimAngle(e.clientX, e.clientY);
    });

    canvas.addEventListener('click', (e) => {
      if (!isGameRunning || isPaused || isGameOver) return;
      updateAimAngle(e.clientX, e.clientY);
      shootBubble();
    });

    // Touch / Pointer Events (Smooth Mobile Support)
    canvas.addEventListener('pointerdown', (e) => {
      if (!isGameRunning || isPaused || isGameOver) return;
      isAiming = true;
      updateAimAngle(e.clientX, e.clientY);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!isGameRunning || isPaused || isGameOver || !isAiming) return;
      updateAimAngle(e.clientX, e.clientY);
    });

    canvas.addEventListener('pointerup', (e) => {
      if (!isGameRunning || isPaused || isGameOver || !isAiming) return;
      isAiming = false;
      updateAimAngle(e.clientX, e.clientY);
      shootBubble();
    });

    canvas.addEventListener('pointercancel', () => {
      isAiming = false;
    });

    // Keyboard Spacebar to Swap, Arrow Keys to Aim, Enter/Space to Shoot
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP') {
        togglePause();
      } else if (e.code === 'KeyS' || e.code === 'KeyC') {
        swapBubbles();
      } else if (e.code === 'ArrowLeft') {
        launcherAngle = Math.max(-Math.PI + 0.25, launcherAngle - 0.05);
      } else if (e.code === 'ArrowRight') {
        launcherAngle = Math.min(-0.25, launcherAngle + 0.05);
      } else if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (isGameRunning && !isPaused && !isGameOver) {
          e.preventDefault();
          shootBubble();
        }
      }
    });

    // Difficulty Selector
    diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDifficulty = btn.dataset.diff;
        startGame();
      });
    });

    // Action Buttons
    startGameBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', togglePause);
    pauseToggleBtn.addEventListener('click', togglePause);
    restartBtn.addEventListener('click', startGame);
    playAgainBtn.addEventListener('click', startGame);
    nextLevelBtn.addEventListener('click', nextLevel);
    winRestartBtn.addEventListener('click', startGame);
    swapBubbleBtn.addEventListener('click', swapBubbles);

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
    loadBestScore();
    updateSoundUI();
    setupEvents();
    initBoard();
    requestAnimationFrame(gameLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
