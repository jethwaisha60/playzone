/**
 * PlayZone - Jigsaw Puzzle Game Engine
 * Procedural Canvas Artworks, Grid Slicing, Drag & Drop, Touch & Tap Controls
 */

(function () {
  'use strict';

  // --- Game Configuration & Constants ---
  const STORAGE_KEY = 'playzone_score_jigsaw_puzzle';
  const MASTER_SIZE = 600; // 600x600 px high-res artwork canvas

  // Themes
  const THEMES = {
    neon_city: {
      name: 'Neon City',
      title: '🌆 Cyber Neon Metropolis',
      draw: drawNeonCity
    },
    nature: {
      name: 'Nature',
      title: '🌲 Aurora Mountain Night',
      draw: drawNatureAurora
    },
    space: {
      name: 'Space',
      title: '🚀 Cosmic Orbit & Nebula',
      draw: drawCosmicSpace
    },
    cute_animal: {
      name: 'Cyber Fox',
      title: '🦊 Celestial Kitsune & Spirit Tree',
      draw: drawCyberFox
    }
  };

  // State
  let currentThemeKey = 'neon_city';
  let gridSize = 3; // 3, 4, or 5
  let totalPieces = 9;
  let pieces = []; // array of piece data { id, correctSlot, currentSlot, canvas }
  let placedSlots = []; // array of piece ids in each slot, null if empty
  let lockedCount = 0;
  let moves = 0;
  let timerSeconds = 0;
  let timerInterval = null;
  let isTimerRunning = false;
  let isPaused = false;
  let isGameComplete = false;
  let bestScore = 0;

  // Selected piece for Tap-to-Place mobile friendly mode
  let selectedPieceId = null;

  // Dragging state (touch / mouse)
  let activeDragPiece = null;
  let dragGhostEl = null;

  // Master Offscreen Canvas
  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = MASTER_SIZE;
  masterCanvas.height = MASTER_SIZE;
  const masterCtx = masterCanvas.getContext('2d');

  // DOM Elements
  const boardEl = document.getElementById('puzzleBoard');
  const trayEl = document.getElementById('piecesTray');
  const timerDisplay = document.getElementById('timerDisplay');
  const movesDisplay = document.getElementById('movesDisplay');
  const progressDisplay = document.getElementById('progressDisplay');
  const bestScoreDisplay = document.getElementById('bestScoreDisplay');
  const progressBarFill = document.getElementById('progressBarFill');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const pauseToggleBtn = document.getElementById('pauseToggleBtn');
  const pauseBtnLabel = document.getElementById('pauseBtnLabel');
  const pauseBtnIcon = document.getElementById('pauseBtnIcon');
  const resumeBtn = document.getElementById('resumeBtn');
  const restartBtn = document.getElementById('restartBtn');
  const previewToggleBtn = document.getElementById('previewToggleBtn');
  const showPreviewBtn = document.getElementById('showPreviewBtn');
  const previewOverlay = document.getElementById('previewOverlay');
  const previewCanvas = document.getElementById('previewCanvas');
  const previewTitle = document.getElementById('previewTitle');
  const closePreviewBtn = document.getElementById('closePreviewBtn');
  const closePreviewBtnBottom = document.getElementById('closePreviewBtnBottom');
  const winOverlay = document.getElementById('winOverlay');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const soundToggleBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const themeButtons = document.querySelectorAll('#themeSelector .toggle-btn');
  const diffButtons = document.querySelectorAll('#difficultySelector .toggle-btn');

  // --- Sound Helper ---
  function playAudio(type) {
    if (window.playZoneAudio) {
      if (type === 'pop') window.playZoneAudio.playPop();
      else if (type === 'snap') window.playZoneAudio.playScore();
      else if (type === 'error') window.playZoneAudio.playHit();
      else if (type === 'win') window.playZoneAudio.playWin();
      else if (type === 'start') window.playZoneAudio.playStart();
    }
  }

  function updateSoundUI() {
    if (window.playZoneAudio) {
      const muted = window.playZoneAudio.isMuted;
      soundIcon.textContent = muted ? '🔇' : '🔊';
      soundToggleBtn.classList.toggle('muted', muted);
    }
  }

  // --- Storage Helper ---
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

  // --- Procedural Canvas Artworks ---

  // 1. Neon Cyber Metropolis
  function drawNeonCity(ctx, w, h) {
    // Sky background gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#060714');
    skyGrad.addColorStop(0.4, '#100a26');
    skyGrad.addColorStop(0.75, '#1e0836');
    skyGrad.addColorStop(1, '#080d21');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Distant stars & cyber grid dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (let i = 0; i < 90; i++) {
      const sx = (i * 123 + 45) % w;
      const sy = (i * 231 + 89) % (h * 0.65);
      const sr = (i % 3 === 0) ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glowing Neon Cyber Moon
    const moonX = w * 0.76;
    const moonY = h * 0.22;
    const moonR = 54;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.4, moonX, moonY, moonR * 2.2);
    moonGlow.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
    moonGlow.addColorStop(0.5, 'rgba(168, 85, 247, 0.25)');
    moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 2.2, 0, Math.PI * 2);
    ctx.fill();

    const moonCore = ctx.createRadialGradient(moonX - 10, moonY - 10, 5, moonX, moonY, moonR);
    moonCore.addColorStop(0, '#ffffff');
    moonCore.addColorStop(0.5, '#67e8f9');
    moonCore.addColorStop(1, '#a855f7');
    ctx.fillStyle = moonCore;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();

    // Distant Skyline Silhouettes (Layer 1)
    ctx.fillStyle = '#0c1022';
    const bgBuildings = [
      { x: 0, w: 70, h: 220 },
      { x: 60, w: 90, h: 280 },
      { x: 140, w: 80, h: 190 },
      { x: 210, w: 100, h: 320 },
      { x: 300, w: 75, h: 250 },
      { x: 365, w: 90, h: 300 },
      { x: 445, w: 80, h: 210 },
      { x: 515, w: 90, h: 270 }
    ];
    bgBuildings.forEach(b => {
      ctx.fillRect(b.x, h - b.h, b.w, b.h);
    });

    // Midground High-Tech Skyscrapers (Layer 2)
    const midBuildings = [
      { x: 20, w: 85, h: 360, color: '#111730', accent: '#00f0ff' },
      { x: 120, w: 110, h: 420, color: '#161338', accent: '#ec4899' },
      { x: 250, w: 95, h: 370, color: '#0f182c', accent: '#a855f7' },
      { x: 360, w: 125, h: 450, color: '#14143a', accent: '#00f0ff' },
      { x: 500, w: 85, h: 390, color: '#10162e', accent: '#38bdf8' }
    ];
    midBuildings.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, h - b.h, b.w, b.h);

      // Antenna beacon
      ctx.strokeStyle = b.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x + b.w / 2, h - b.h);
      ctx.lineTo(b.x + b.w / 2, h - b.h - 35);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, h - b.h - 35, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Glowing windows
      ctx.fillStyle = b.accent;
      for (let r = h - b.h + 20; r < h - 70; r += 24) {
        for (let c = b.x + 12; c < b.x + b.w - 12; c += 18) {
          if ((r * 13 + c * 7) % 5 !== 0) {
            ctx.globalAlpha = ((r + c) % 3 === 0) ? 0.85 : 0.35;
            ctx.fillRect(c, r, 9, 13);
          }
        }
      }
      ctx.globalAlpha = 1.0;
    });

    // Foreground Cyber Flyover Highway with Light Trails
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#00f0ff';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.78);
    ctx.bezierCurveTo(w * 0.3, h * 0.72, w * 0.65, h * 0.88, w, h * 0.82);
    ctx.stroke();

    ctx.shadowColor = '#ec4899';
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.83);
    ctx.bezierCurveTo(w * 0.35, h * 0.77, w * 0.7, h * 0.93, w, h * 0.87);
    ctx.stroke();

    ctx.shadowColor = '#fbbf24';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.87);
    ctx.bezierCurveTo(w * 0.25, h * 0.84, w * 0.75, h * 0.96, w, h * 0.92);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Flying Cyber Car Speeders with Thrusters
    const speeders = [
      { x: w * 0.28, y: h * 0.32, vx: 50, col: '#00f0ff' },
      { x: w * 0.62, y: h * 0.44, vx: -60, col: '#ec4899' },
      { x: w * 0.82, y: h * 0.28, vx: 45, col: '#38bdf8' }
    ];
    speeders.forEach(s => {
      // Glow streak
      ctx.shadowBlur = 12;
      ctx.shadowColor = s.col;
      ctx.strokeStyle = s.col;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx, s.y);
      ctx.stroke();
      // Vehicle pod
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 8, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Dark foreground street baseline
    ctx.fillStyle = 'rgba(7, 10, 18, 0.95)';
    ctx.fillRect(0, h - 35, w, 35);
  }

  // 2. Nature Aurora & Mountain Lake
  function drawNatureAurora(ctx, w, h) {
    // Night sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#030814');
    sky.addColorStop(0.5, '#08172c');
    sky.addColorStop(1, '#050c18');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 110; i++) {
      const sx = (i * 197 + 23) % w;
      const sy = (i * 311 + 67) % (h * 0.55);
      const sr = (i % 4 === 0) ? 1.4 : 0.7;
      ctx.globalAlpha = 0.5 + ((i % 5) * 0.1);
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Crescent Moon
    const mx = w * 0.18;
    const my = h * 0.18;
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#67e8f9';
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(mx, my, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Moon shadow cut
    ctx.fillStyle = '#061022';
    ctx.beginPath();
    ctx.arc(mx + 10, my - 4, 25, 0, Math.PI * 2);
    ctx.fill();

    // Aurora Borealis Curtains
    const drawAuroraCurtain = (color1, color2, yOffset, waveAmp) => {
      const grad = ctx.createLinearGradient(0, yOffset - 120, 0, yOffset + 120);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.5, color1);
      grad.addColorStop(0.8, color2);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, yOffset);
      for (let x = 0; x <= w; x += 30) {
        const y = yOffset + Math.sin(x * 0.015 + waveAmp) * 35 + Math.cos(x * 0.03) * 15;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, yOffset + 160);
      ctx.lineTo(0, yOffset + 160);
      ctx.closePath();
      ctx.fill();
    };

    drawAuroraCurtain('rgba(16, 185, 129, 0.45)', 'rgba(6, 182, 212, 0.3)', h * 0.28, 1.2);
    drawAuroraCurtain('rgba(56, 189, 248, 0.4)', 'rgba(168, 85, 247, 0.35)', h * 0.22, 2.5);
    drawAuroraCurtain('rgba(168, 85, 247, 0.3)', 'rgba(236, 72, 153, 0.25)', h * 0.33, 4.0);

    // Distant Mountain Peaks (snow-capped)
    ctx.fillStyle = '#0e172a';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.65);
    ctx.lineTo(w * 0.22, h * 0.42);
    ctx.lineTo(w * 0.45, h * 0.58);
    ctx.lineTo(w * 0.68, h * 0.38);
    ctx.lineTo(w * 0.88, h * 0.56);
    ctx.lineTo(w, h * 0.48);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Snow caps
    ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
    ctx.beginPath();
    ctx.moveTo(w * 0.22, h * 0.42);
    ctx.lineTo(w * 0.28, h * 0.47);
    ctx.lineTo(w * 0.24, h * 0.49);
    ctx.lineTo(w * 0.22, h * 0.47);
    ctx.lineTo(w * 0.17, h * 0.48);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.68, h * 0.38);
    ctx.lineTo(w * 0.74, h * 0.44);
    ctx.lineTo(w * 0.70, h * 0.46);
    ctx.lineTo(w * 0.68, h * 0.44);
    ctx.lineTo(w * 0.63, h * 0.45);
    ctx.closePath();
    ctx.fill();

    // Reflective Lake Base
    const lakeGrad = ctx.createLinearGradient(0, h * 0.68, 0, h);
    lakeGrad.addColorStop(0, '#081729');
    lakeGrad.addColorStop(0.5, '#051b32');
    lakeGrad.addColorStop(1, '#020b18');
    ctx.fillStyle = lakeGrad;
    ctx.fillRect(0, h * 0.68, w, h * 0.32);

    // Aurora reflections in lake
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(w * 0.2, h * 0.72, w * 0.6, 6);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(w * 0.15, h * 0.78, w * 0.7, 7);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(w * 0.3, h * 0.85, w * 0.4, 5);
    ctx.globalAlpha = 1.0;

    // Pine Forest Silhouettes on Lake Shore
    const drawPineTree = (x, y, scale) => {
      ctx.fillStyle = '#050a14';
      ctx.beginPath();
      ctx.moveTo(x, y - 40 * scale);
      ctx.lineTo(x + 14 * scale, y - 20 * scale);
      ctx.lineTo(x + 8 * scale, y - 20 * scale);
      ctx.lineTo(x + 18 * scale, y);
      ctx.lineTo(x + 4 * scale, y);
      ctx.lineTo(x + 4 * scale, y + 10 * scale);
      ctx.lineTo(x - 4 * scale, y + 10 * scale);
      ctx.lineTo(x - 4 * scale, y);
      ctx.lineTo(x - 18 * scale, y);
      ctx.lineTo(x - 8 * scale, y - 20 * scale);
      ctx.lineTo(x - 14 * scale, y - 20 * scale);
      ctx.closePath();
      ctx.fill();
    };

    for (let x = -10; x < w + 20; x += 22) {
      const scale = 0.8 + ((x * 17) % 5) * 0.12;
      const y = h * 0.70 + Math.sin(x * 0.05) * 8;
      drawPineTree(x, y, scale);
    }

    // Glowing fireflies
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#fef08a';
    ctx.fillStyle = '#fef08a';
    for (let i = 0; i < 25; i++) {
      const fx = (i * 139) % w;
      const fy = h * 0.74 + ((i * 47) % (h * 0.22));
      ctx.beginPath();
      ctx.arc(fx, fy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // 3. Cosmic Space & Nebula Planet
  function drawCosmicSpace(ctx, w, h) {
    // Deep Space Background
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 40, w * 0.5, h * 0.5, w * 0.8);
    bg.addColorStop(0, '#0f0524');
    bg.addColorStop(0.5, '#080316');
    bg.addColorStop(1, '#020108');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Glowing Nebula Dust Clouds
    const drawNebula = (cx, cy, r, col1, col2) => {
      const nGrad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      nGrad.addColorStop(0, col1);
      nGrad.addColorStop(0.6, col2);
      nGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = nGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    };

    drawNebula(w * 0.35, h * 0.45, 240, 'rgba(168, 85, 247, 0.4)', 'rgba(236, 72, 153, 0.15)');
    drawNebula(w * 0.72, h * 0.3, 200, 'rgba(0, 240, 255, 0.35)', 'rgba(56, 189, 248, 0.12)');
    drawNebula(w * 0.2, h * 0.8, 180, 'rgba(236, 72, 153, 0.3)', 'rgba(168, 85, 247, 0.1)');

    // Sparkling Multicolored Starfield
    for (let i = 0; i < 160; i++) {
      const sx = (i * 241 + 19) % w;
      const sy = (i * 373 + 51) % h;
      const r = (i % 6 === 0) ? 2.2 : (i % 3 === 0) ? 1.4 : 0.8;
      const col = (i % 4 === 0) ? '#00f0ff' : (i % 3 === 0) ? '#ec4899' : (i % 2 === 0) ? '#fbbf24' : '#ffffff';
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Swirling Spiral Galaxy
    const gx = w * 0.22;
    const gy = h * 0.24;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(-0.4);
    for (let arm = 0; arm < 2; arm++) {
      ctx.beginPath();
      for (let t = 0; t < 180; t += 4) {
        const rad = t * (Math.PI / 180);
        const dist = t * 0.45;
        const x = Math.cos(rad + arm * Math.PI) * dist;
        const y = Math.sin(rad + arm * Math.PI) * (dist * 0.45);
        ctx.fillStyle = `rgba(168, 85, 247, ${1 - t / 200})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Galaxy core
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#00f0ff';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Giant Ringed Gas Planet (Saturn-like)
    const px = w * 0.68;
    const py = h * 0.62;
    const pr = 95;

    // Outer Back Ring
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.35);

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.ellipse(0, 0, pr * 1.85, pr * 0.45, 0, Math.PI, 0); // top half ring behind planet
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, pr * 2.1, pr * 0.52, 0, Math.PI, 0);
    ctx.stroke();
    ctx.restore();

    // Planet Sphere with Gas Bands
    const planetGrad = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.2, px, py, pr);
    planetGrad.addColorStop(0, '#67e8f9');
    planetGrad.addColorStop(0.35, '#3b82f6');
    planetGrad.addColorStop(0.7, '#6366f1');
    planetGrad.addColorStop(1, '#090724');
    ctx.fillStyle = planetGrad;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();

    // Subtle atmospheric bands on planet
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.clip();
    for (let y = py - pr; y < py + pr; y += 18) {
      ctx.fillStyle = ((y + px) % 36 === 0) ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.18)';
      ctx.fillRect(px - pr, y, pr * 2, 8);
    }
    ctx.restore();

    // Front Ring Over Planet
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.35);

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.ellipse(0, 0, pr * 1.85, pr * 0.45, 0, 0, Math.PI); // bottom half ring in front
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, pr * 2.1, pr * 0.52, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();

    // Space Exploration Satellite / Probe
    const sx = w * 0.82;
    const sy = h * 0.18;
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(sx - 12, sy - 10, 24, 20);

    // Solar Wings
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(sx - 48, sy - 7, 32, 14);
    ctx.strokeRect(sx - 48, sy - 7, 32, 14);
    ctx.fillRect(sx + 16, sy - 7, 32, 14);
    ctx.strokeRect(sx + 16, sy - 7, 32, 14);

    // Antenna & Signal Waves
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy + 10);
    ctx.lineTo(sx - 12, sy + 28);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(sx - 12, sy + 28, 8, 0.8, 2.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx - 12, sy + 28, 15, 0.8, 2.2);
    ctx.stroke();
  }

  // 4. Cyber Kitsune & Cherry Blossom Spirit Tree
  function drawCyberFox(ctx, w, h) {
    // Mystical Midnight Violet Background
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0c071e');
    bg.addColorStop(0.5, '#1b0e36');
    bg.addColorStop(1, '#070b16');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Soft celestial moon in background
    const mx = w * 0.5;
    const my = h * 0.28;
    const mg = ctx.createRadialGradient(mx, my, 20, mx, my, 160);
    mg.addColorStop(0, 'rgba(255, 230, 245, 0.35)');
    mg.addColorStop(0.4, 'rgba(236, 72, 153, 0.2)');
    mg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(mx, my, 160, 0, Math.PI * 2);
    ctx.fill();

    // Cherry Blossom Tree Trunk & Silhouettes
    ctx.strokeStyle = '#1a102b';
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h);
    ctx.bezierCurveTo(w * 0.2, h * 0.65, w * 0.28, h * 0.45, w * 0.42, h * 0.32);
    ctx.stroke();

    // Branches
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(w * 0.28, h * 0.52);
    ctx.bezierCurveTo(w * 0.12, h * 0.42, w * 0.08, h * 0.28, w * 0.05, h * 0.22);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w * 0.36, h * 0.38);
    ctx.bezierCurveTo(w * 0.48, h * 0.25, w * 0.65, h * 0.22, w * 0.78, h * 0.18);
    ctx.stroke();

    // Glowing Sakura Blossoms
    const drawBlossomCluster = (cx, cy, radius, count) => {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius;
        const bx = cx + Math.cos(ang) * dist;
        const by = cy + Math.sin(ang) * dist;
        ctx.fillStyle = (i % 2 === 0) ? '#f472b6' : '#fbcfe8';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ec4899';
        ctx.beginPath();
        ctx.arc(bx, by, 3.5 + Math.random() * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    };

    drawBlossomCluster(w * 0.12, h * 0.22, 60, 45);
    drawBlossomCluster(w * 0.42, h * 0.24, 75, 65);
    drawBlossomCluster(w * 0.75, h * 0.18, 70, 55);

    // Falling petals
    for (let p = 0; p < 35; p++) {
      const px = (p * 83 + 20) % w;
      const py = (p * 117 + 50) % (h * 0.85);
      ctx.fillStyle = 'rgba(244, 114, 182, 0.85)';
      ctx.beginPath();
      ctx.ellipse(px, py, 4, 2, p * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mossy Rock Mound where Fox Sits
    ctx.fillStyle = '#0c1322';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.88, w * 0.38, 75, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Spirit Lanterns
    const lanterns = [
      { x: w * 0.25, y: h * 0.75 },
      { x: w * 0.78, y: h * 0.72 }
    ];
    lanterns.forEach(l => {
      // Glow
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#fbbf24';
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(l.x, l.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Cage
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(l.x - 7, l.y - 10, 14, 20);
    });

    // The Cyber Fox (Cute Celestial Kitsune Character)
    const fx = w * 0.5;
    const fy = h * 0.73;

    // Glowing Tails (Multiple Kitsune Tails)
    const tailColors = ['#f43f5e', '#ec4899', '#a855f7', '#6366f1', '#00f0ff'];
    tailColors.forEach((tCol, idx) => {
      const ang = -0.7 + idx * 0.35;
      ctx.save();
      ctx.translate(fx, fy + 20);
      ctx.rotate(ang);
      ctx.shadowBlur = 14;
      ctx.shadowColor = tCol;
      ctx.fillStyle = tCol;
      ctx.beginPath();
      ctx.ellipse(0, -65, 18, 55, 0.1, 0, Math.PI * 2);
      ctx.fill();
      // White tail tip
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, -100, 10, 20, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.shadowBlur = 0;

    // Fox Body
    ctx.fillStyle = '#ffedd5';
    ctx.beginPath();
    ctx.ellipse(fx, fy + 15, 34, 42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fox Head
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.ellipse(fx, fy - 22, 28, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fox Cheeks white fur
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(fx - 14, fy - 16, 12, 14, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(fx + 14, fy - 16, 12, 14, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Fox Ears
    ctx.fillStyle = '#fb923c';
    // Left ear
    ctx.beginPath();
    ctx.moveTo(fx - 24, fy - 32);
    ctx.lineTo(fx - 32, fy - 65);
    ctx.lineTo(fx - 8, fy - 40);
    ctx.closePath();
    ctx.fill();
    // Inner left ear
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(fx - 22, fy - 35);
    ctx.lineTo(fx - 28, fy - 58);
    ctx.lineTo(fx - 11, fy - 42);
    ctx.closePath();
    ctx.fill();

    // Right ear
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.moveTo(fx + 24, fy - 32);
    ctx.lineTo(fx + 32, fy - 65);
    ctx.lineTo(fx + 8, fy - 40);
    ctx.closePath();
    ctx.fill();
    // Inner right ear
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(fx + 22, fy - 35);
    ctx.lineTo(fx + 28, fy - 58);
    ctx.lineTo(fx + 11, fy - 42);
    ctx.closePath();
    ctx.fill();

    // Fox Eyes (Cyber glowing cyan)
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00f0ff';
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.ellipse(fx - 11, fy - 24, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(fx + 11, fy - 24, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Pupil catchlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(fx - 12, fy - 26, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx + 10, fy - 26, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Cute Nose & Mouth
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(fx, fy - 16, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(fx - 3.5, fy - 12, 3.5, 0.2, Math.PI * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(fx + 3.5, fy - 12, 3.5, 0.1, Math.PI * 0.8);
    ctx.stroke();

    // Forehead Mystic Cyber Mark
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, fy - 38);
    ctx.lineTo(fx, fy - 28);
    ctx.moveTo(fx - 5, fy - 33);
    ctx.lineTo(fx + 5, fy - 33);
    ctx.stroke();
  }

  // --- Render Master Artwork ---
  function renderMasterArtwork() {
    masterCtx.clearRect(0, 0, MASTER_SIZE, MASTER_SIZE);
    const theme = THEMES[currentThemeKey] || THEMES.neon_city;
    theme.draw(masterCtx, MASTER_SIZE, MASTER_SIZE);

    // Also update preview canvas if visible
    updatePreviewCanvas();
  }

  function updatePreviewCanvas() {
    const pCtx = previewCanvas.getContext('2d');
    pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    pCtx.drawImage(masterCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
    const theme = THEMES[currentThemeKey] || THEMES.neon_city;
    previewTitle.textContent = `${theme.title}`;
  }

  // --- Piece Generation & Grid Slicing ---
  function createPuzzlePieces() {
    pieces = [];
    totalPieces = gridSize * gridSize;
    placedSlots = new Array(totalPieces).fill(null);
    lockedCount = 0;

    const sliceSize = MASTER_SIZE / gridSize;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const id = r * gridSize + c;
        const pieceCanvas = document.createElement('canvas');
        pieceCanvas.width = sliceSize;
        pieceCanvas.height = sliceSize;
        const pCtx = pieceCanvas.getContext('2d');

        // Draw slice from master canvas
        pCtx.drawImage(
          masterCanvas,
          c * sliceSize,
          r * sliceSize,
          sliceSize,
          sliceSize,
          0,
          0,
          sliceSize,
          sliceSize
        );

        // Subtle inner beveled border for tactile jigsaw feel
        pCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        pCtx.lineWidth = 2;
        pCtx.strokeRect(1, 1, sliceSize - 2, sliceSize - 2);

        pieces.push({
          id: id,
          correctSlot: id,
          currentSlot: null, // null means it's in tray
          isLocked: false,
          canvas: pieceCanvas
        });
      }
    }
  }

  // --- Render Board Slots ---
  function renderBoard() {
    boardEl.innerHTML = '';
    boardEl.className = `puzzle-board grid-${gridSize}`;

    for (let i = 0; i < totalPieces; i++) {
      const slot = document.createElement('div');
      slot.className = 'puzzle-slot';
      slot.dataset.slotIndex = i;
      slot.dataset.slotNum = `${i + 1}`;

      // Desktop Drag & Drop listeners on slot
      slot.addEventListener('dragover', handleSlotDragOver);
      slot.addEventListener('dragleave', handleSlotDragLeave);
      slot.addEventListener('drop', handleSlotDrop);

      // Tap-to-Place listener on slot
      slot.addEventListener('click', () => handleSlotClick(i));

      boardEl.appendChild(slot);
    }
  }

  // --- Render Pieces Tray ---
  function renderTray() {
    trayEl.innerHTML = '';

    // Shuffled unplaced pieces
    const unplacedPieces = pieces.filter(p => !p.isLocked && p.currentSlot === null);

    if (unplacedPieces.length === 0) {
      trayEl.innerHTML = `
        <div class="tray-empty-hint">
          <span>✨ All pieces placed!</span>
        </div>
      `;
      return;
    }

    // Determine piece dimension for tray based on grid size
    const pieceSizePx = gridSize === 3 ? 92 : gridSize === 4 ? 74 : 60;

    unplacedPieces.forEach(p => {
      const pieceEl = createPieceElement(p, pieceSizePx);
      trayEl.appendChild(pieceEl);
    });
  }

  // Helper to create piece DOM element
  function createPieceElement(piece, sizePx) {
    const el = document.createElement('div');
    el.className = 'puzzle-piece';
    el.dataset.pieceId = piece.id;
    el.draggable = !piece.isLocked;

    if (sizePx) {
      el.style.width = `${sizePx}px`;
      el.style.height = `${sizePx}px`;
    }

    if (selectedPieceId === piece.id) {
      el.classList.add('selected');
    }

    // Clone piece canvas slice into element
    const pieceCanvas = document.createElement('canvas');
    pieceCanvas.width = piece.canvas.width;
    pieceCanvas.height = piece.canvas.height;
    const ctx = pieceCanvas.getContext('2d');
    ctx.drawImage(piece.canvas, 0, 0);
    el.appendChild(pieceCanvas);

    if (!piece.isLocked) {
      // Desktop Drag Events
      el.addEventListener('dragstart', handleDragStart);
      el.addEventListener('dragend', handleDragEnd);

      // Touch / Pointer Events for Mobile Drag
      el.addEventListener('pointerdown', handlePointerDown);

      // Tap to Select
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        handlePieceSelect(piece.id);
      });
    }

    return el;
  }

  // --- Shuffle Pieces Array ---
  function shufflePieces() {
    // Fisher-Yates shuffle
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = pieces[i];
      pieces[i] = pieces[j];
      pieces[j] = temp;
    }
  }

  // --- Placement & Snapping Logic ---
  function attemptPlacePiece(pieceId, slotIndex) {
    if (isGameComplete || isPaused) return false;

    const piece = pieces.find(p => p.id === pieceId);
    if (!piece || piece.isLocked) return false;

    // Check if slot already has a locked piece
    const slotEl = boardEl.querySelector(`.puzzle-slot[data-slot-index="${slotIndex}"]`);
    if (!slotEl || placedSlots[slotIndex] !== null) {
      return false;
    }

    // Start timer on first move
    startTimer();

    moves++;
    movesDisplay.textContent = moves.toString();

    // Check correctness
    if (piece.correctSlot === slotIndex) {
      // CORRECT SNAP!
      piece.isLocked = true;
      piece.currentSlot = slotIndex;
      placedSlots[slotIndex] = piece.id;
      lockedCount++;

      // Clear selection
      if (selectedPieceId === piece.id) {
        selectedPieceId = null;
      }

      // Render snapped piece into slot
      slotEl.innerHTML = '';
      slotEl.classList.add('filled', 'snapped');
      const pieceEl = createPieceElement(piece);
      pieceEl.classList.add('locked');
      slotEl.appendChild(pieceEl);

      // Remove from tray
      renderTray();
      updateProgress();

      playAudio('snap');

      // Check win condition
      if (lockedCount === totalPieces) {
        handleVictory();
      }
      return true;
    } else {
      // INCORRECT: Piece shakes and returns to tray
      playAudio('error');

      // Visual error indication
      const activeEl = document.querySelector(`.puzzle-piece[data-piece-id="${pieceId}"]`);
      if (activeEl) {
        activeEl.classList.add('shake');
        setTimeout(() => {
          activeEl.classList.remove('shake');
        }, 400);
      }

      // Flash target slot red
      slotEl.style.borderColor = 'rgba(239, 68, 68, 0.7)';
      slotEl.style.boxShadow = '0 0 14px rgba(239, 68, 68, 0.4)';
      setTimeout(() => {
        slotEl.style.borderColor = '';
        slotEl.style.boxShadow = '';
      }, 400);

      return false;
    }
  }

  // --- Tap-to-Place Logic ---
  function handlePieceSelect(pieceId) {
    if (isGameComplete || isPaused) return;

    if (selectedPieceId === pieceId) {
      // Deselect
      selectedPieceId = null;
    } else {
      selectedPieceId = pieceId;
      playAudio('pop');
    }

    // Refresh UI highlights
    document.querySelectorAll('.puzzle-piece').forEach(el => {
      const id = parseInt(el.dataset.pieceId, 10);
      el.classList.toggle('selected', id === selectedPieceId);
    });

    // Highlight slots when piece selected
    document.querySelectorAll('.puzzle-slot').forEach(s => {
      s.classList.toggle('selected-target', selectedPieceId !== null && !s.classList.contains('filled'));
    });
  }

  function handleSlotClick(slotIndex) {
    if (isGameComplete || isPaused) return;

    if (selectedPieceId !== null) {
      const placed = attemptPlacePiece(selectedPieceId, slotIndex);
      if (placed) {
        document.querySelectorAll('.puzzle-slot').forEach(s => s.classList.remove('selected-target'));
      }
    }
  }

  // --- Desktop HTML5 Drag & Drop ---
  function handleDragStart(e) {
    if (isGameComplete || isPaused) {
      e.preventDefault();
      return;
    }
    const pieceId = parseInt(this.dataset.pieceId, 10);
    e.dataTransfer.setData('text/plain', pieceId.toString());
    e.dataTransfer.effectAllowed = 'move';
    this.classList.add('dragging');
    playAudio('pop');
  }

  function handleDragEnd() {
    this.classList.remove('dragging');
    document.querySelectorAll('.puzzle-slot').forEach(s => s.classList.remove('drag-over'));
  }

  function handleSlotDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!this.classList.contains('filled')) {
      this.classList.add('drag-over');
    }
  }

  function handleSlotDragLeave() {
    this.classList.remove('drag-over');
  }

  function handleSlotDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    const pieceIdStr = e.dataTransfer.getData('text/plain');
    if (!pieceIdStr) return;

    const pieceId = parseInt(pieceIdStr, 10);
    const slotIndex = parseInt(this.dataset.slotIndex, 10);
    attemptPlacePiece(pieceId, slotIndex);
  }

  // --- Mobile Touch / Pointer Drag & Drop ---
  let pointerStartPos = { x: 0, y: 0 };
  let isDraggingPointer = false;

  function handlePointerDown(e) {
    if (isGameComplete || isPaused) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return; // only left click

    const pieceId = parseInt(this.dataset.pieceId, 10);
    const piece = pieces.find(p => p.id === pieceId);
    if (!piece || piece.isLocked) return;

    activeDragPiece = piece;
    pointerStartPos = { x: e.clientX, y: e.clientY };
    isDraggingPointer = false;

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }

  function handlePointerMove(e) {
    if (!activeDragPiece) return;

    const dx = e.clientX - pointerStartPos.x;
    const dy = e.clientY - pointerStartPos.y;

    if (!isDraggingPointer && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      isDraggingPointer = true;
      playAudio('pop');

      // Create floating ghost clone
      dragGhostEl = document.createElement('div');
      dragGhostEl.className = 'drag-clone';
      const ghostCanvas = document.createElement('canvas');
      ghostCanvas.width = activeDragPiece.canvas.width;
      ghostCanvas.height = activeDragPiece.canvas.height;
      const gCtx = ghostCanvas.getContext('2d');
      gCtx.drawImage(activeDragPiece.canvas, 0, 0);
      dragGhostEl.appendChild(ghostCanvas);

      const size = gridSize === 3 ? 90 : gridSize === 4 ? 74 : 60;
      dragGhostEl.style.width = `${size}px`;
      dragGhostEl.style.height = `${size}px`;
      document.body.appendChild(dragGhostEl);
    }

    if (isDraggingPointer && dragGhostEl) {
      dragGhostEl.style.left = `${e.clientX}px`;
      dragGhostEl.style.top = `${e.clientY}px`;

      // Check slot under pointer
      highlightSlotUnderPoint(e.clientX, e.clientY);
    }
  }

  function handlePointerUp(e) {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);

    // Clear ghost
    if (dragGhostEl && dragGhostEl.parentNode) {
      dragGhostEl.parentNode.removeChild(dragGhostEl);
      dragGhostEl = null;
    }

    document.querySelectorAll('.puzzle-slot').forEach(s => s.classList.remove('drag-over'));

    if (isDraggingPointer && activeDragPiece) {
      // Determine if dropped on a slot
      const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
      const slotEl = dropTarget ? dropTarget.closest('.puzzle-slot') : null;

      if (slotEl) {
        const slotIndex = parseInt(slotEl.dataset.slotIndex, 10);
        attemptPlacePiece(activeDragPiece.id, slotIndex);
      }
    }

    activeDragPiece = null;
    isDraggingPointer = false;
  }

  function highlightSlotUnderPoint(x, y) {
    document.querySelectorAll('.puzzle-slot').forEach(s => s.classList.remove('drag-over'));
    const target = document.elementFromPoint(x, y);
    const slot = target ? target.closest('.puzzle-slot') : null;
    if (slot && !slot.classList.contains('filled')) {
      slot.classList.add('drag-over');
    }
  }

  // --- Progress & UI Updates ---
  function updateProgress() {
    progressDisplay.textContent = `${lockedCount} / ${totalPieces}`;
    const pct = Math.round((lockedCount / totalPieces) * 100);
    progressBarFill.style.width = `${pct}%`;
  }

  // --- Timer Functions ---
  function startTimer() {
    if (isTimerRunning || isGameComplete || isPaused) return;
    isTimerRunning = true;
    timerInterval = setInterval(() => {
      timerSeconds++;
      updateTimerUI();
    }, 1000);
  }

  function pauseTimer() {
    isTimerRunning = false;
    clearInterval(timerInterval);
  }

  function resetTimer() {
    pauseTimer();
    timerSeconds = 0;
    updateTimerUI();
  }

  function updateTimerUI() {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // --- Score Calculation ---
  function calculateScore() {
    // Base difficulty points
    let base = 1000;
    if (gridSize === 4) base = 2500;
    if (gridSize === 5) base = 5000;

    // Time bonus: fast completion earns up to 1500 points
    const timeDecayPerSec = gridSize === 3 ? 10 : gridSize === 4 ? 6 : 4;
    const timeBonus = Math.max(100, 1500 - (timerSeconds * timeDecayPerSec));

    // Move efficiency bonus: perfect is exactly totalPieces moves
    const extraMoves = Math.max(0, moves - totalPieces);
    const moveBonus = Math.max(0, 500 - (extraMoves * 25));

    return base + timeBonus + moveBonus;
  }

  // --- Victory Handler ---
  function handleVictory() {
    isGameComplete = true;
    pauseTimer();

    playAudio('win');

    const score = calculateScore();
    const isNewRecord = saveBestScore(score);

    // Populate win modal
    document.getElementById('finalScoreVal').textContent = `${score.toLocaleString()} pts`;
    document.getElementById('finalBestVal').textContent = `${bestScore.toLocaleString()} pts`;
    document.getElementById('finalTimeVal').textContent = timerDisplay.textContent;
    document.getElementById('finalMovesVal').textContent = moves.toString();

    let diffText = 'Easy (3×3)';
    if (gridSize === 4) diffText = 'Medium (4×4)';
    if (gridSize === 5) diffText = 'Hard (5×5)';
    document.getElementById('finalDiffVal').textContent = diffText;

    const badge = document.getElementById('newBestBadge');
    badge.classList.toggle('hidden', !isNewRecord);

    setTimeout(() => {
      winOverlay.classList.remove('hidden');
    }, 600);
  }

  // --- Pause & Resume ---
  function togglePause() {
    if (isGameComplete) return;

    isPaused = !isPaused;
    if (isPaused) {
      pauseTimer();
      pauseOverlay.classList.remove('hidden');
      pauseBtnLabel.textContent = 'Resume';
      pauseBtnIcon.textContent = '▶';
    } else {
      if (moves > 0) startTimer();
      pauseOverlay.classList.add('hidden');
      pauseBtnLabel.textContent = 'Pause';
      pauseBtnIcon.textContent = '⏸️';
    }
  }

  // --- Restart Game ---
  function restartGame() {
    winOverlay.classList.add('hidden');
    previewOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');

    isGameComplete = false;
    isPaused = false;
    pauseBtnLabel.textContent = 'Pause';
    pauseBtnIcon.textContent = '⏸️';
    selectedPieceId = null;

    moves = 0;
    movesDisplay.textContent = '0';
    resetTimer();

    renderMasterArtwork();
    createPuzzlePieces();
    shufflePieces();
    renderBoard();
    renderTray();
    updateProgress();

    playAudio('start');
  }

  // --- Tab Visibility Change Listener (Auto-Pause) ---
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isTimerRunning && !isPaused && !isGameComplete) {
      togglePause();
    }
  });

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Theme Selector
    themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        themeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentThemeKey = btn.dataset.theme;
        restartGame();
      });
    });

    // Difficulty Selector
    diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gridSize = parseInt(btn.dataset.grid, 10);
        restartGame();
      });
    });

    // Control Buttons
    pauseToggleBtn.addEventListener('click', togglePause);
    resumeBtn.addEventListener('click', togglePause);
    restartBtn.addEventListener('click', restartGame);
    playAgainBtn.addEventListener('click', restartGame);

    // Preview Modal Controls
    const openPreview = () => {
      updatePreviewCanvas();
      previewOverlay.classList.remove('hidden');
    };
    const closePreview = () => {
      previewOverlay.classList.add('hidden');
    };

    previewToggleBtn.addEventListener('click', openPreview);
    showPreviewBtn.addEventListener('click', openPreview);
    closePreviewBtn.addEventListener('click', closePreview);
    closePreviewBtnBottom.addEventListener('click', closePreview);
    previewOverlay.addEventListener('click', (e) => {
      if (e.target === previewOverlay) closePreview();
    });

    // Sound Toggle
    soundToggleBtn.addEventListener('click', () => {
      if (window.playZoneAudio) {
        window.playZoneAudio.toggleMute();
        updateSoundUI();
      }
    });

    // Prevent default context menu on board & pieces
    boardEl.addEventListener('contextmenu', e => e.preventDefault());
    trayEl.addEventListener('contextmenu', e => e.preventDefault());
  }

  // --- Initialization ---
  function init() {
    loadBestScore();
    updateSoundUI();
    setupEventListeners();
    restartGame();
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
