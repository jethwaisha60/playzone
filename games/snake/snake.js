 /**
 * PlayZone - Neon Snake Game Engine
 * Features: Responsive Canvas, Arrow/WASD/Touch/D-pad controls, High Score persistence, Sound FX.
 */

(function () {
  'use strict';

  // 1. Game Grid Constants
  const GRID_SIZE = 20; // 20x20 grid
  const CELL_SIZE = 20; // 400px / 20 = 20px per cell
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
  let nextDirection = { x: 1, y: 0 };
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
          window.playZoneAudio.playTone(900, 'triangle', 0.09, 0.18);
        }, 50);
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

  // 5. Game Initialization & Reset
  function initGame() {
    bestScoreEl.textContent = bestScore;
    updateSoundUI();
    resetSnake();
    drawScene();
    setupEventListeners();
  }

  function resetSnake() {
    snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    currentSpeed = BASE_SPEED;
    currentScoreEl.textContent = '0';
    speedLevelEl.textContent = '1.0x';
    spawnFood();
  }

  function spawnFood() {
    let valid = false;
    while (!valid) {
      const rx = Math.floor(Math.random() * GRID_SIZE);
      const ry = Math.floor(Math.random() * GRID_SIZE);
      const onSnake = snake.some(segment => segment.x === rx && segment.y === ry);
      if (!onSnake) {
        food = { x: rx, y: ry };
        valid = true;
      }
    }
  }

  // 6. State Transitions (Start, Pause, Resume, Over)
  function startGame() {
    playSound('click');
    resetSnake();
    gameState = 'running';

    startOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');

    pauseToggleBtn.disabled = false;
    pauseBtnIcon.textContent = '⏸️';
    pauseBtnLabel.textContent = 'Pause';

    lastTickTime = performance.now();
    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function pauseGame() {
    if (gameState !== 'running') return;
    playSound('click');
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
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function togglePause() {
    if (gameState === 'running') {
      pauseGame();
    } else if (gameState === 'paused') {
      resumeGame();
    }
  }

  function triggerGameOver() {
    gameState = 'gameover';
    pauseToggleBtn.disabled = true;

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

    // Prevent 180-degree immediate reversal into own neck
    const isOpposite = (newDir.x === -direction.x && newDir.x !== 0) ||
                       (newDir.y === -direction.y && newDir.y !== 0);

    if (!isOpposite) {
      // If valid change, queue it and play soft blip
      if (newDir.x !== nextDirection.x || newDir.y !== nextDirection.y) {
        playSound('turn');
      }
      nextDirection = newDir;
    }
  }

  // 8. Core Game Loop
  function gameLoop(currentTime) {
    if (gameState !== 'running') return;

    foodPulse += 0.08;

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

  function update() {
    direction = nextDirection;

    const head = {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y
    };

    // 1. Check Wall Collision
 if (head.x < 0) {
  head.x = GRID_SIZE - 1;
} else if (head.x >= GRID_SIZE) {
  head.x = 0;
}

if (head.y < 0) {
  head.y = GRID_SIZE - 1;
} else if (head.y >= GRID_SIZE) {
  head.y = 0;
}

// 2. Check Self-Collision
for (let i = 0; i < snake.length; i++) {
  if (head.x === snake[i].x && head.y === snake[i].y) {
    triggerGameOver();
    return;
  }
}

    // 2. Check Self-Collision
    for (let i = 0; i < snake.length; i++) {
      if (head.x === snake[i].x && head.y === snake[i].y) {
        triggerGameOver();
        return;
      }
    }

    // Move Snake
    snake.unshift(head);

    // 3. Check Food Collision
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      currentScoreEl.textContent = score;
      playSound('eat');

      // Speed up slightly every 40 points
      if (score % 40 === 0 && currentSpeed > MIN_SPEED) {
        currentSpeed = Math.max(MIN_SPEED, currentSpeed - 8);
        const speedMultiplier = (BASE_SPEED / currentSpeed).toFixed(1);
        speedLevelEl.textContent = `${speedMultiplier}x`;
      }

      spawnFood();
    } else {
      snake.pop(); // Remove tail if no food eaten
    }
  }

  // 9. Canvas Rendering
  function drawScene() {
    // Clear canvas
    ctx.fillStyle = '#080b12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Subtle Cyber Background Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(canvas.width, i * CELL_SIZE);
      ctx.stroke();
    }

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

    // Canvas Swipe Gestures
    const canvasContainer = document.getElementById('canvasContainer');

    canvasContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    canvasContainer.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        const minSwipeDistance = 25;

        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal swipe
          if (Math.abs(dx) > minSwipeDistance) {
            if (gameState === 'idle') startGame();
            setDirection(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
          }
        } else {
          // Vertical swipe
          if (Math.abs(dy) > minSwipeDistance) {
            if (gameState === 'idle') startGame();
            setDirection(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
          }
        }
      }
    }, { passive: true });

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
