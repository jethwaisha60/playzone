/**
 * PlayZone - Reflex Speed Test Game Engine
 * Features: High-precision performance.now() reaction timer, Single & 5-Round modes,
 * Early click protection, Performance tiers, Audio FX, LocalStorage persistence.
 */

(function () {
  'use strict';

  // 1. Constants
  const STORAGE_KEY = 'playzone_score_reaction';
  const MIN_DELAY_MS = 2000; // 2 seconds minimum wait
  const MAX_DELAY_MS = 5000; // 5 seconds maximum wait
  const TOTAL_CHALLENGE_ROUNDS = 5;

  // 2. DOM Elements
  const reactionPad = document.getElementById('reactionPad');
  const padIcon = document.getElementById('padIcon');
  const padTitle = document.getElementById('padTitle');
  const padSubtitle = document.getElementById('padSubtitle');
  const padActionTag = document.getElementById('padActionTag');

  // Mode & Scoreboard Elements
  const modeTabs = document.querySelectorAll('.mode-tab');
  const roundProgressLabel = document.getElementById('roundProgressLabel');
  const roundProgressDisplay = document.getElementById('roundProgressDisplay');
  const lastTimeDisplay = document.getElementById('lastTimeDisplay');
  const bestTimeDisplay = document.getElementById('bestTimeDisplay');

  // 5-Round Challenge Tracker
  const challengeRoundsCard = document.getElementById('challengeRoundsCard');
  const challengeAvgDisplay = document.getElementById('challengeAvgDisplay');
  const roundChips = document.querySelectorAll('.round-chip');

  // Action Buttons
  const resetTestBtn = document.getElementById('resetTestBtn');
  const resetBestBtn = document.getElementById('resetBestBtn');
  const soundToggleBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const soundLabel = soundToggleBtn.querySelector('.btn-label');

  // Summary Modal Elements
  const summaryModal = document.getElementById('summaryModal');
  const summaryTier = document.getElementById('summaryTier');
  const summaryAvgVal = document.getElementById('summaryAvgVal');
  const summaryBestVal = document.getElementById('summaryBestVal');
  const summaryRoundsList = document.getElementById('summaryRoundsList');
  const newBestBadge = document.getElementById('newBestBadge');
  const playAgainChallengeBtn = document.getElementById('playAgainChallengeBtn');
  const closeSummaryBtn = document.getElementById('closeSummaryBtn');

  // 3. Application State
  // States: 'idle' | 'waiting' | 'ready' | 'early' | 'result'
  let currentState = 'idle';
  let activeMode = 'single'; // 'single' or 'challenge'
  let waitTimeoutId = null;
  let triggerTimestamp = 0;
  let bestReactionTime = null; // Saved in ms (lower is better)

  // 5-Round Challenge State
  let currentChallengeRound = 0; // 1 to 5
  let challengeRoundTimes = []; // array of ms numbers

  // 4. Safe Audio Helper using PlayZone Audio Engine
  function playSound(type) {
    if (!window.playZoneAudio || typeof window.playZoneAudio.enabled === 'undefined' || !window.playZoneAudio.enabled) {
      return;
    }

    try {
      switch (type) {
        case 'waiting':
          if (typeof window.playZoneAudio.playTone === 'function') {
            window.playZoneAudio.playTone(330, 'sine', 0.08, 0.08);
          }
          break;
        case 'green':
          // High crisp trigger ping
          if (typeof window.playZoneAudio.playTone === 'function') {
            window.playZoneAudio.playTone(880, 'sine', 0.08, 0.2);
          }
          break;
        case 'click':
          if (typeof window.playZoneAudio.playClick === 'function') {
            window.playZoneAudio.playClick();
          }
          break;
        case 'early':
          // Low error buzzer
          if (typeof window.playZoneAudio.playTone === 'function') {
            window.playZoneAudio.playTone(180, 'sawtooth', 0.15, 0.15);
          }
          break;
        case 'result':
          // Cheery double chime
          if (typeof window.playZoneAudio.playTone === 'function') {
            window.playZoneAudio.playTone(587, 'triangle', 0.08, 0.15);
            setTimeout(() => {
              window.playZoneAudio.playTone(880, 'triangle', 0.12, 0.18);
            }, 70);
          }
          break;
        case 'celebration':
          if (typeof window.playZoneAudio.playSuccess === 'function') {
            window.playZoneAudio.playSuccess();
          }
          break;
      }
    } catch (e) {
      console.warn('Audio effect error:', e);
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

  // 5. Score Management & LocalStorage
  function loadBestScore() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        bestReactionTime = parseInt(saved, 10);
        bestTimeDisplay.textContent = `${bestReactionTime} ms`;
      } else {
        bestReactionTime = null;
        bestTimeDisplay.textContent = '--';
      }
    } catch (e) {
      console.warn('Failed to load reaction score:', e);
    }
  }

  function checkAndSaveBestScore(scoreMs) {
    if (bestReactionTime === null || scoreMs < bestReactionTime) {
      bestReactionTime = scoreMs;
      try {
        // Save as integer ms for compatibility with js/app.js (renders as `${savedScore} ms`)
        localStorage.setItem(STORAGE_KEY, bestReactionTime);
      } catch (e) {
        console.warn('Failed to save reaction score:', e);
      }
      bestTimeDisplay.textContent = `${bestReactionTime} ms`;
      return true; // New record achieved
    }
    return false;
  }

  // 6. Performance Tier Assessment
  function getPerformanceTier(ms) {
    if (ms < 190) {
      return { tier: 'Superhuman Reflexes! ⚡🤖', desc: 'Pro esports level reaction speed.' };
    } else if (ms <= 240) {
      return { tier: 'Pro Gamer Speed! 🎮🔥', desc: 'Significantly faster than average humans.' };
    } else if (ms <= 300) {
      return { tier: 'Solid Human Average! 🚀', desc: 'Healthy, swift human reaction time.' };
    } else if (ms <= 420) {
      return { tier: 'A Bit Sluggish ☕', desc: 'A cup of coffee or a stretch might help.' };
    } else {
      return { tier: 'Slow Reflexes 🐢', desc: 'Take a breath and try again!' };
    }
  }

  // 7. Core State Machine Transitions
  function setPadState(newState, data = {}) {
    currentState = newState;
    reactionPad.className = `reaction-pad state-${newState}`;

    switch (newState) {
      case 'idle':
        padIcon.textContent = '⚡';
        padTitle.textContent = 'Tap Anywhere to Start';
        padSubtitle.textContent = 'When the red screen turns bright green, click as fast as humanly possible.';
        padActionTag.textContent = 'START TEST';
        break;

      case 'waiting':
        padIcon.textContent = '🛑';
        padTitle.textContent = 'Wait for Green...';
        padSubtitle.textContent = 'Keep your finger or cursor ready, but DO NOT click yet!';
        padActionTag.textContent = 'WAITING...';
        playSound('waiting');
        break;

      case 'ready':
        padIcon.textContent = '⚡';
        padTitle.textContent = 'CLICK NOW!';
        padSubtitle.textContent = 'Tap as fast as you can!';
        padActionTag.textContent = 'CLICK!';
        playSound('green');
        break;

      case 'early':
        padIcon.textContent = '⚠️';
        padTitle.textContent = 'Too Early!';
        padSubtitle.textContent = 'You clicked before the screen turned green. Take a breath!';
        padActionTag.textContent = 'TAP TO RETRY';
        playSound('early');
        break;

      case 'result':
        padIcon.textContent = '⏱️';
        padTitle.textContent = `${data.ms} ms`;
        padSubtitle.textContent = data.tier.tier;
        padActionTag.textContent = activeMode === 'challenge' && currentChallengeRound < TOTAL_CHALLENGE_ROUNDS
          ? 'NEXT ROUND ➔'
          : 'TAP TO RETRY';
        playSound('result');
        break;
    }
  }

  // 8. Pad Click / Tap Handler
  function handlePadInteraction() {
    if (currentState === 'idle') {
      startWaitingPhase();
    } else if (currentState === 'waiting') {
      // Clicked too early while still red!
      clearTimeout(waitTimeoutId);
      setPadState('early');
    } else if (currentState === 'ready') {
      // Legitimate reaction click on green!
      const elapsedMs = Math.round(performance.now() - triggerTimestamp);
      processReactionClick(elapsedMs);
    } else if (currentState === 'early') {
      // Retry after false start
      startWaitingPhase();
    } else if (currentState === 'result') {
      // Progress to next round or restart
      if (activeMode === 'challenge') {
        if (currentChallengeRound < TOTAL_CHALLENGE_ROUNDS) {
          startWaitingPhase();
        } else {
          // Finished all 5 rounds, reset and start fresh
          resetChallengeMode();
          startWaitingPhase();
        }
      } else {
        startWaitingPhase();
      }
    }
  }

  function startWaitingPhase() {
    if (activeMode === 'challenge' && currentChallengeRound === 0) {
      currentChallengeRound = 1;
      updateChallengeUI();
    }

    setPadState('waiting');

    // Random duration between 2000ms and 5000ms
    const randomDelay = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;

    waitTimeoutId = setTimeout(() => {
      triggerGreenPhase();
    }, randomDelay);
  }

  function triggerGreenPhase() {
    triggerTimestamp = performance.now();
    setPadState('ready');
  }

  function processReactionClick(ms) {
    lastTimeDisplay.textContent = `${ms} ms`;
    const rating = getPerformanceTier(ms);
    const isNewBest = checkAndSaveBestScore(ms);

    if (activeMode === 'single') {
      setPadState('result', { ms, tier: rating });
    } else {
      // 5-Round Challenge Mode
      challengeRoundTimes.push(ms);
      updateChallengeUI();

      if (currentChallengeRound >= TOTAL_CHALLENGE_ROUNDS) {
        // All 5 rounds complete!
        setPadState('result', { ms, tier: rating });
        setTimeout(() => {
          showChallengeSummary(isNewBest);
        }, 600);
      } else {
        currentChallengeRound++;
        roundProgressDisplay.textContent = `Round ${currentChallengeRound}/${TOTAL_CHALLENGE_ROUNDS}`;
        setPadState('result', { ms, tier: rating });
      }
    }
  }

  // 9. 5-Round Challenge UI Management
  function updateChallengeUI() {
    if (activeMode !== 'challenge') return;

    roundProgressDisplay.textContent = `Round ${currentChallengeRound || 1}/${TOTAL_CHALLENGE_ROUNDS}`;

    // Update round chips
    roundChips.forEach((chip, idx) => {
      const chipVal = chip.querySelector('.chip-val');
      const roundIdx = idx + 1;

      if (challengeRoundTimes[idx] !== undefined) {
        chipVal.textContent = `${challengeRoundTimes[idx]}ms`;
        chip.className = 'round-chip completed';
      } else if (roundIdx === currentChallengeRound) {
        chipVal.textContent = '...';
        chip.className = 'round-chip active';
      } else {
        chipVal.textContent = '--';
        chip.className = 'round-chip';
      }
    });

    // Update Running Average
    if (challengeRoundTimes.length > 0) {
      const sum = challengeRoundTimes.reduce((acc, t) => acc + t, 0);
      const avg = Math.round(sum / challengeRoundTimes.length);
      challengeAvgDisplay.textContent = `Average: ${avg} ms`;
    } else {
      challengeAvgDisplay.textContent = 'Average: --';
    }
  }

  function resetChallengeMode() {
    currentChallengeRound = 1;
    challengeRoundTimes = [];
    challengeAvgDisplay.textContent = 'Average: --';
    roundChips.forEach(chip => {
      chip.className = 'round-chip';
      chip.querySelector('.chip-val').textContent = '--';
    });
    roundProgressDisplay.textContent = `Round 1/${TOTAL_CHALLENGE_ROUNDS}`;
  }

  function showChallengeSummary(achievedNewBest) {
    playSound('celebration');

    const sum = challengeRoundTimes.reduce((acc, t) => acc + t, 0);
    const avg = Math.round(sum / challengeRoundTimes.length);
    const best = Math.min(...challengeRoundTimes);
    const tierInfo = getPerformanceTier(avg);

    summaryAvgVal.textContent = `${avg} ms`;
    summaryBestVal.textContent = `${best} ms`;
    summaryTier.textContent = tierInfo.tier;

    // Render list of round chips
    summaryRoundsList.innerHTML = '';
    challengeRoundTimes.forEach((time, index) => {
      const chip = document.createElement('div');
      chip.className = 'sum-chip';
      chip.innerHTML = `<strong>R${index + 1}:</strong> ${time} ms`;
      summaryRoundsList.appendChild(chip);
    });

    if (achievedNewBest) {
      newBestBadge.classList.remove('hidden');
    } else {
      newBestBadge.classList.add('hidden');
    }

    summaryModal.classList.remove('hidden');
  }

  // 10. Switch Mode (Single vs 5-Round Challenge)
  function switchMode(newMode) {
    if (activeMode === newMode && currentState === 'idle') return;

    playSound('click');
    clearTimeout(waitTimeoutId);
    activeMode = newMode;

    modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === newMode));

    if (activeMode === 'challenge') {
      roundProgressLabel.textContent = 'Challenge';
      roundProgressDisplay.textContent = `Round 1/${TOTAL_CHALLENGE_ROUNDS}`;
      challengeRoundsCard.classList.remove('hidden');
      resetChallengeMode();
    } else {
      roundProgressLabel.textContent = 'Test Mode';
      roundProgressDisplay.textContent = 'Single';
      challengeRoundsCard.classList.add('hidden');
    }

    lastTimeDisplay.textContent = '--';
    setPadState('idle');
  }

  // 11. Event Listeners
  function setupEventListeners() {
    // Reaction Pad Tap/Click and Keyboard Space/Enter
    reactionPad.addEventListener('click', handlePadInteraction);
    reactionPad.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handlePadInteraction();
      }
    });

    // Spacebar listener on window to test reflexes with keyboard spacebar
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        handlePadInteraction();
      }
    });

    // Mode Switcher Tabs
    modeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        switchMode(tab.dataset.mode);
      });
    });

    // Action Controls
    resetTestBtn.addEventListener('click', () => {
      playSound('click');
      clearTimeout(waitTimeoutId);
      if (activeMode === 'challenge') {
        resetChallengeMode();
      }
      lastTimeDisplay.textContent = '--';
      setPadState('idle');
    });

    resetBestBtn.addEventListener('click', () => {
      playSound('click');
      if (confirm('Clear your saved best reaction record?')) {
        localStorage.removeItem(STORAGE_KEY);
        bestReactionTime = null;
        bestTimeDisplay.textContent = '--';
      }
    });

    // Summary Modal Actions
    playAgainChallengeBtn.addEventListener('click', () => {
      playSound('click');
      summaryModal.classList.add('hidden');
      resetChallengeMode();
      startWaitingPhase();
    });

    closeSummaryBtn.addEventListener('click', () => {
      playSound('click');
      summaryModal.classList.add('hidden');
    });

    // In-game Sound Toggle
    soundToggleBtn.addEventListener('click', () => {
      if (window.playZoneAudio && typeof window.playZoneAudio.toggle === 'function') {
        window.playZoneAudio.toggle();
        updateSoundUI();
      }
    });
  }

  // 12. Initialization
  function initGame() {
    loadBestScore();
    updateSoundUI();
    setPadState('idle');
    setupEventListeners();
  }

  // Launch on DOM ready
  document.addEventListener('DOMContentLoaded', initGame);
})();
