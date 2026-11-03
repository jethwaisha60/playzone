/**
 * PlayZone - Rock Paper Scissors Game Engine
 * Human vs Cyber AI, Animated Fist Showdown, Psychological Predictive AI,
 * Match Length Modes, Sound Synthesis & LocalStorage Persistence.
 */

(function () {
  'use strict';

  // --- Configuration & Constants ---
  const STORAGE_KEY = 'playzone_score_rock_paper_scissors';

  const MOVES = {
    rock: {
      name: 'Rock',
      emoji: '✊',
      beats: 'scissors',
      verb: 'crushes'
    },
    paper: {
      name: 'Paper',
      emoji: '✋',
      beats: 'rock',
      verb: 'covers'
    },
    scissors: {
      name: 'Scissors',
      emoji: '✌️',
      beats: 'paper',
      verb: 'cuts'
    }
  };

  const MOVE_KEYS = ['rock', 'paper', 'scissors'];

  const AI_DESCRIPTIONS = {
    easy: '🤖 <strong>Easy AI:</strong> Purely random choices. Friendly training mode.',
    medium: '🤖 <strong>Medium AI:</strong> Balanced strategic variations with mostly random choices.',
    hard: '🤖 <strong>Hard AI:</strong> Adaptive psychology model analyzing your previous move patterns.'
  };

  // --- State Variables ---
  let matchMode = '5'; // '3', '5', '10', 'endless'
  let difficulty = 'medium'; // 'easy', 'medium', 'hard'

  let currentRound = 1;
  let playerWins = 0;
  let aiWins = 0;
  let draws = 0;
  let score = 0;
  let bestScore = 0;

  let isRoundPlaying = false;
  let isPaused = false;
  let isMatchOver = false;

  // History tracking for AI predictive modeling
  let playerMoveHistory = [];
  let outcomeHistory = [];

  // DOM Elements
  const playerWinsDisplay = document.getElementById('playerWinsDisplay');
  const aiWinsDisplay = document.getElementById('aiWinsDisplay');
  const drawsDisplay = document.getElementById('drawsDisplay');
  const roundDisplay = document.getElementById('roundDisplay');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const bestScoreDisplay = document.getElementById('bestScoreDisplay');

  const playerChoiceBox = document.getElementById('playerChoiceBox');
  const playerSymbol = document.getElementById('playerSymbol');
  const playerChoiceLabel = document.getElementById('playerChoiceLabel');

  const aiChoiceBox = document.getElementById('aiChoiceBox');
  const aiSymbol = document.getElementById('aiSymbol');
  const aiChoiceLabel = document.getElementById('aiChoiceLabel');
  const aiIntelPill = document.getElementById('aiIntelPill');
  const aiNameDisplay = document.getElementById('aiNameDisplay');

  const vsEmblem = document.getElementById('vsEmblem');
  const countdownBadge = document.getElementById('countdownBadge');
  const roundBanner = document.getElementById('roundBanner');
  const bannerTitle = document.getElementById('bannerTitle');
  const bannerSubtitle = document.getElementById('bannerSubtitle');

  const weaponButtons = document.querySelectorAll('.weapon-btn');
  const roundButtons = document.querySelectorAll('#roundSelector .toggle-btn');
  const diffButtons = document.querySelectorAll('#difficultySelector .toggle-btn');

  const pauseToggleBtn = document.getElementById('pauseToggleBtn');
  const pauseBtnLabel = document.getElementById('pauseBtnLabel');
  const pauseBtnIcon = document.getElementById('pauseBtnIcon');
  const resumeBtn = document.getElementById('resumeBtn');
  const restartBtn = document.getElementById('restartBtn');
  const pauseOverlay = document.getElementById('pauseOverlay');

  const matchEndOverlay = document.getElementById('matchEndOverlay');
  const matchEndIcon = document.getElementById('matchEndIcon');
  const matchEndTitle = document.getElementById('matchEndTitle');
  const matchEndDesc = document.getElementById('matchEndDesc');
  const finalScoreVal = document.getElementById('finalScoreVal');
  const finalPlayerWins = document.getElementById('finalPlayerWins');
  const finalAiWins = document.getElementById('finalAiWins');
  const finalDraws = document.getElementById('finalDraws');
  const finalBestVal = document.getElementById('finalBestVal');
  const newBestBadge = document.getElementById('newBestBadge');
  const playAgainBtn = document.getElementById('playAgainBtn');

  const soundToggleBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');

  // --- Sound Engine Integration ---
  function playAudioTone(freq, type = 'sine', duration = 0.1, volume = 0.2) {
    if (window.playZoneAudio && window.playZoneAudio.enabled) {
      window.playZoneAudio.playTone(freq, type, duration, volume);
    }
  }

  function playTickSound() {
    playAudioTone(440, 'triangle', 0.06, 0.14);
  }

  function playWinSound() {
    if (window.playZoneAudio) {
      window.playZoneAudio.playSuccess();
    }
  }

  function playLoseSound() {
    playAudioTone(240, 'sawtooth', 0.25, 0.18);
  }

  function playDrawSound() {
    playAudioTone(380, 'sine', 0.1, 0.12);
    setTimeout(() => playAudioTone(380, 'sine', 0.1, 0.12), 120);
  }

  function playMatchVictoryFanfare() {
    if (window.playZoneAudio) {
      window.playZoneAudio.playSuccess();
      setTimeout(() => {
        playAudioTone(880, 'triangle', 0.3, 0.25);
      }, 400);
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

  // --- Cyber AI Decision Logic ---
  function getCounterMove(targetMove) {
    if (targetMove === 'rock') return 'paper';
    if (targetMove === 'paper') return 'scissors';
    return 'rock';
  }

  function getRandomMove() {
    return MOVE_KEYS[Math.floor(Math.random() * MOVE_KEYS.length)];
  }

  function chooseAIMove() {
    if (difficulty === 'easy') {
      // 100% Random
      return getRandomMove();
    }

    if (difficulty === 'medium') {
      // 60% Random, 40% counter to most frequent player move
      if (playerMoveHistory.length > 0 && Math.random() < 0.4) {
        const counts = { rock: 0, paper: 0, scissors: 0 };
        playerMoveHistory.forEach(m => counts[m]++);
        let favMove = 'rock';
        let maxCount = -1;
        MOVE_KEYS.forEach(k => {
          if (counts[k] > maxCount) {
            maxCount = counts[k];
            favMove = k;
          }
        });
        return getCounterMove(favMove);
      }
      return getRandomMove();
    }

    // Hard Mode: Psychological Adaptive Model (Win-Stay / Lose-Shift analysis)
    if (difficulty === 'hard') {
      if (playerMoveHistory.length >= 2 && Math.random() < 0.70) {
        const lastMove = playerMoveHistory[playerMoveHistory.length - 1];
        const lastOutcome = outcomeHistory[outcomeHistory.length - 1];

        // Psychology: Players who just won often repeat their winning move (Win-Stay)
        if (lastOutcome === 'win') {
          return getCounterMove(lastMove);
        }

        // Psychology: Players who just lost often shift to the move that would have beaten the AI
        if (lastOutcome === 'lose') {
          const aiPrevMove = getCounterMove(getCounterMove(lastMove));
          const expectedShift = getCounterMove(aiPrevMove);
          return getCounterMove(expectedShift);
        }

        // Draw: Player often shifts randomly or cycles; counter the predicted cycle
        return getCounterMove(getCounterMove(lastMove));
      }

      return getRandomMove();
    }

    return getRandomMove();
  }

  // --- Round Resolution ---
  function evaluateOutcome(playerMove, aiMove) {
    if (playerMove === aiMove) return 'draw';
    if (MOVES[playerMove].beats === aiMove) return 'win';
    return 'lose';
  }

  // --- Play Round (Showdown Sequence) ---
  function playRound(playerMove) {
    if (isRoundPlaying || isPaused || isMatchOver) return;

    isRoundPlaying = true;
    setWeaponButtonsDisabled(true);

    // Record player choice
    playerMoveHistory.push(playerMove);
    const aiMove = chooseAIMove();

    // Reset Visual Boxes for Tension Countdown
    playerChoiceBox.className = 'choice-avatar-box shake-anim';
    aiChoiceBox.className = 'choice-avatar-box shake-anim';
    playerSymbol.textContent = '✊';
    aiSymbol.textContent = '✊';
    playerChoiceLabel.textContent = 'Ready...';
    aiChoiceLabel.textContent = 'Calculating...';

    roundBanner.className = 'round-banner';
    bannerTitle.textContent = 'Rock... Paper... Scissors...';
    bannerSubtitle.textContent = 'Clashing moves in the cyber arena!';

    vsEmblem.classList.add('hidden');
    countdownBadge.classList.remove('hidden');

    let count = 3;
    countdownBadge.textContent = count.toString();
    playTickSound();

    const countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        countdownBadge.textContent = count.toString();
        playTickSound();
      } else {
        clearInterval(countdownTimer);
        revealRoundResult(playerMove, aiMove);
      }
    }, 400);
  }

  // Reveal Move & Announce Outcome
  function revealRoundResult(playerMove, aiMove) {
    countdownBadge.classList.add('hidden');
    vsEmblem.classList.remove('hidden');

    // Stop shaking
    playerChoiceBox.classList.remove('shake-anim');
    aiChoiceBox.classList.remove('shake-anim');

    // Display revealed choices
    playerSymbol.textContent = MOVES[playerMove].emoji;
    aiSymbol.textContent = MOVES[aiMove].emoji;
    playerChoiceLabel.textContent = MOVES[playerMove].name;
    aiChoiceLabel.textContent = MOVES[aiMove].name;

    const outcome = evaluateOutcome(playerMove, aiMove);
    outcomeHistory.push(outcome);

    // Apply outcome effects
    if (outcome === 'win') {
      playerWins++;
      score += 10;
      playerChoiceBox.classList.add('winner-pulse');
      aiChoiceBox.classList.add('loser-dim');
      roundBanner.className = 'round-banner win';
      bannerTitle.textContent = 'YOU WIN ROUND!';
      bannerSubtitle.textContent = `${MOVES[playerMove].name} ${MOVES[playerMove].verb} ${MOVES[aiMove].name}! (+10 pts)`;
      playWinSound();
    } else if (outcome === 'lose') {
      aiWins++;
      aiChoiceBox.classList.add('winner-pulse');
      playerChoiceBox.classList.add('loser-dim');
      roundBanner.className = 'round-banner lose';
      bannerTitle.textContent = 'CYBER AI WINS ROUND!';
      bannerSubtitle.textContent = `${MOVES[aiMove].name} ${MOVES[aiMove].verb} ${MOVES[playerMove].name}! (+0 pts)`;
      playLoseSound();
    } else {
      draws++;
      score += 2;
      playerChoiceBox.classList.add('draw-pulse');
      aiChoiceBox.classList.add('draw-pulse');
      roundBanner.className = 'round-banner draw';
      bannerTitle.textContent = "IT'S A DRAW!";
      bannerSubtitle.textContent = `Both selected ${MOVES[playerMove].name}. Great minds think alike! (+2 pts)`;
      playDrawSound();
    }

    saveBestScore(score);
    updateScoreboardUI();

    // Check Match Completion
    const targetRounds = matchMode === 'endless' ? Infinity : parseInt(matchMode, 10);

    setTimeout(() => {
      if (currentRound >= targetRounds) {
        // Match Finished!
        finishMatch();
      } else {
        // Next round
        currentRound++;
        updateRoundUI();
        isRoundPlaying = false;
        setWeaponButtonsDisabled(false);
      }
    }, 1200);
  }

  // --- Match Finished (Victory / Defeat Modal) ---
  function finishMatch() {
    isMatchOver = true;
    isRoundPlaying = false;

    let isMatchWin = playerWins > aiWins;
    let isMatchDraw = playerWins === aiWins;

    if (isMatchWin) {
      score += 50; // Match Victory Bonus
      saveBestScore(score);
      playMatchVictoryFanfare();
      matchEndIcon.textContent = '🏆';
      matchEndTitle.innerHTML = 'Match <span class="gradient-text">Victory!</span>';
      matchEndDesc.textContent = `Outstanding combat intuition! You triumphed with ${playerWins} win(s) and claimed the +50 pts bonus!`;
    } else if (isMatchDraw) {
      matchEndIcon.textContent = '🤝';
      matchEndTitle.innerHTML = 'Match <span class="gradient-text" style="background: linear-gradient(135deg, #fbbf24, #f59e0b); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">Tied!</span>';
      matchEndDesc.textContent = `Honorable contest! Both fighters finished with equal victories (${playerWins} - ${aiWins}).`;
    } else {
      matchEndIcon.textContent = '🤖';
      matchEndTitle.innerHTML = 'Cyber AI <span class="gradient-text" style="background: linear-gradient(135deg, #f87171, #ec4899); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">Wins!</span>';
      matchEndDesc.textContent = `The AI out-calculated you this match (${aiWins} - ${playerWins}). Study its patterns and strike back!`;
    }

    // Populate modal stats
    finalScoreVal.textContent = `${score.toLocaleString()} pts`;
    finalPlayerWins.textContent = playerWins.toString();
    finalAiWins.textContent = aiWins.toString();
    finalDraws.textContent = draws.toString();
    finalBestVal.textContent = `${bestScore.toLocaleString()} pts`;

    const isNewRecord = (score === bestScore && score > 0);
    newBestBadge.classList.toggle('hidden', !isNewRecord);

    matchEndOverlay.classList.remove('hidden');
    updateScoreboardUI();
  }

  // --- UI Helpers ---
  function updateScoreboardUI() {
    playerWinsDisplay.textContent = playerWins.toString();
    aiWinsDisplay.textContent = aiWins.toString();
    drawsDisplay.textContent = draws.toString();
    scoreDisplay.textContent = `${score.toLocaleString()} pts`;
  }

  function updateRoundUI() {
    if (matchMode === 'endless') {
      roundDisplay.textContent = `R${currentRound}`;
    } else {
      roundDisplay.textContent = `${currentRound} / ${matchMode}`;
    }
  }

  function setWeaponButtonsDisabled(disabled) {
    weaponButtons.forEach(btn => {
      btn.disabled = disabled;
    });
  }

  function updateDifficultyInfo() {
    aiIntelPill.innerHTML = AI_DESCRIPTIONS[difficulty] || AI_DESCRIPTIONS.medium;
    if (difficulty === 'easy') aiNameDisplay.textContent = 'Spark AI';
    else if (difficulty === 'medium') aiNameDisplay.textContent = 'Nexus AI';
    else aiNameDisplay.textContent = 'Quantum AI';
  }

  // --- Match Reset ---
  function resetMatch() {
    matchEndOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');

    isMatchOver = false;
    isPaused = false;
    isRoundPlaying = false;
    pauseBtnLabel.textContent = 'Pause';
    pauseBtnIcon.textContent = '⏸️';

    currentRound = 1;
    playerWins = 0;
    aiWins = 0;
    draws = 0;
    score = 0;
    playerMoveHistory = [];
    outcomeHistory = [];

    // Reset visual boxes
    playerChoiceBox.className = 'choice-avatar-box';
    aiChoiceBox.className = 'choice-avatar-box';
    playerSymbol.textContent = '❓';
    aiSymbol.textContent = '❓';
    playerChoiceLabel.textContent = 'Pick a move';
    aiChoiceLabel.textContent = 'Waiting...';

    roundBanner.className = 'round-banner';
    bannerTitle.textContent = 'Make Your Move!';
    bannerSubtitle.textContent = 'Select Rock, Paper, or Scissors below to start the round.';

    vsEmblem.classList.remove('hidden');
    countdownBadge.classList.add('hidden');

    setWeaponButtonsDisabled(false);
    updateScoreboardUI();
    updateRoundUI();
    updateDifficultyInfo();

    playAudioTone(520, 'triangle', 0.08, 0.15);
  }

  // --- Pause & Resume ---
  function togglePause() {
    if (isMatchOver) return;

    isPaused = !isPaused;
    if (isPaused) {
      pauseOverlay.classList.remove('hidden');
      pauseBtnLabel.textContent = 'Resume';
      pauseBtnIcon.textContent = '▶';
      setWeaponButtonsDisabled(true);
    } else {
      pauseOverlay.classList.add('hidden');
      pauseBtnLabel.textContent = 'Pause';
      pauseBtnIcon.textContent = '⏸️';
      if (!isRoundPlaying) {
        setWeaponButtonsDisabled(false);
      }
    }
  }

  // --- Auto-Pause on Tab Visibility Change ---
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !isPaused && !isMatchOver) {
      togglePause();
    }
  });

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Weapon Buttons (Rock, Paper, Scissors)
    weaponButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const move = btn.dataset.move;
        playRound(move);
      });
    });

    // Round Format Selector
    roundButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        roundButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        matchMode = btn.dataset.rounds;
        resetMatch();
      });
    });

    // Difficulty Selector
    diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
        updateDifficultyInfo();
      });
    });

    // Action Controls
    pauseToggleBtn.addEventListener('click', togglePause);
    resumeBtn.addEventListener('click', togglePause);
    restartBtn.addEventListener('click', resetMatch);
    playAgainBtn.addEventListener('click', resetMatch);

    // Keyboard Shortcuts (1 = Rock, 2 = Paper, 3 = Scissors, P = Pause, R = Restart)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Digit1' || e.code === 'KeyR') {
        if (!e.ctrlKey && !e.altKey && !isRoundPlaying && !isPaused && !isMatchOver) {
          playRound('rock');
        }
      } else if (e.code === 'Digit2' || e.code === 'KeyP') {
        if (e.code === 'KeyP') {
          togglePause();
        } else if (!isRoundPlaying && !isPaused && !isMatchOver) {
          playRound('paper');
        }
      } else if (e.code === 'Digit3' || e.code === 'KeyS') {
        if (!isRoundPlaying && !isPaused && !isMatchOver) {
          playRound('scissors');
        }
      }
    });

    // Sound Toggle
    soundToggleBtn.addEventListener('click', () => {
      if (window.playZoneAudio) {
        window.playZoneAudio.toggle();
        updateSoundUI();
      }
    });
  }

  // --- Initialization ---
  function init() {
    loadBestScore();
    updateSoundUI();
    setupEventListeners();
    resetMatch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
