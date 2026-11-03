/**
 * PlayZone - Typing Speed Test Engine
 * Live WPM/CPM/Accuracy Calculation, Caret Tracking, Time & Passage Challenges,
 * 30+ Original Passages, Native Share / Clipboard Fallback & Audio Synth.
 */

(function () {
  'use strict';

  // --- Configuration & Constants ---
  const STORAGE_KEY_WPM = 'playzone_score_typing_speed_test';
  const STORAGE_KEY_ACC = 'playzone_accuracy_typing_speed_test';

  // 30+ Original Passages grouped by difficulty
  const PASSAGES = {
    easy: [
      "The sun rises in the east and warms the morning air.",
      "Fast brown foxes jump over sleepy green dogs in the park.",
      "Code runs line by line to build modern software apps.",
      "A cup of hot coffee helps you start a productive day.",
      "Music plays softly while students read books in the library.",
      "Bright stars shine across the dark midnight sky.",
      "Learning to type with all fingers takes time and patience.",
      "Fresh air and green trees make walking in nature peaceful.",
      "Computers process data at high speed to solve real problems.",
      "The quick blue bird sang a sweet song from the tree branch.",
      "Keep calm and focus on one single goal at a time.",
      "Good food and happy friends make every weekend special."
    ],
    medium: [
      "Technology is advancing at a breathtaking pace, transforming the way we work, communicate, and learn every single day.",
      "Practice doesn't just make perfect; it builds the muscle memory and neural pathways necessary for effortless speed.",
      "The digital universe connects billions of curious minds, allowing ideas to travel across continents in milliseconds.",
      "Creativity is intelligence having fun, turning abstract dreams into functional code and inspiring interactive experiences.",
      "Every master was once a beginner who refused to quit when the keyboard felt clumsy and mistakes happened.",
      "Responsive web design ensures that digital interfaces look elegant and intuitive, whether viewed on a phone or desktop.",
      "The quiet hours before sunrise often hold the clearest thoughts, free from noisy distractions and notification pings.",
      "Effective problem solving requires patience, keen observation, and the courage to rethink traditional assumptions.",
      "Curiosity is the engine of human progress; without it, our greatest inventions would remain hidden in the dark.",
      "A balanced lifestyle combines intense mental focus with deliberate rest, nutritious meals, and quality sleep.",
      "Writing clean code is like composing prose: clarity, elegance, and purpose should guide every single sentence."
    ],
    hard: [
      "In 1969, Apollo 11's guidance computer possessed a mere 64KB of memory—yet it successfully navigated humans to the moon and back!",
      "Quantum computing exploits quantum superposition and entanglement, potentially solving complex optimization problems in O(sqrt(N)) time.",
      "The algorithmic complexity of quicksort is O(n log n) on average, whereas pathological worst-case inputs degrade performance to O(n^2).",
      "By 2030, autonomous systems and synthetic intelligence will process petabytes of real-time telemetry across 5G networks.",
      "Philosophers have long debated epistemological dilemmas: can deterministic algorithms ever develop authentic subjective consciousness?",
      "High-frequency trading engines execute financial arbitrage within 250 microseconds, leveraging specialized FPGA hardware and fiber optics.",
      "Bioinformatics merges molecular genomics with distributed computing, decoding 3.2 billion base pairs of the human genome.",
      "Cybersecurity protocols like RSA-4096 and elliptic-curve cryptography (ECDSA) protect global cryptographic keys from malicious intrusion.",
      "The thermodynamics of computation, formulated by Rolf Landauer in 1961, dictates that erasing one bit of information dissipates kT ln(2) energy.",
      "Microservices architecture decouples monolithic systems into resilient, containerized services orchestrated via Kubernetes and Envoy proxies.",
      "Neuroplasticity proves that adult brains retain the remarkable capacity to reorganize synaptic connections through repetitive, deliberate practice."
    ]
  };

  // --- State Variables ---
  let currentMode = 'time'; // 'time' or 'passage'
  let targetDuration = 30; // 15, 30, 60, 120 (seconds)
  let currentDifficulty = 'medium'; // 'easy', 'medium', 'hard'

  let targetText = '';
  let lastPassageIndex = -1;
  let typedText = '';

  let isTestActive = false;
  let isTestFinished = false;
  let isPaused = false;

  let startTime = null;
  let elapsedBeforePause = 0;
  let pauseStartTime = null;
  let timerInterval = null;

  let currentWpm = 0;
  let currentCpm = 0;
  let currentAccuracy = 100;
  let correctCount = 0;
  let errorCount = 0;
  let timeRemaining = 30;
  let bestWpm = 0;

  // DOM Elements
  const passageBox = document.getElementById('passageBox');
  const hiddenInput = document.getElementById('hiddenInput');
  const typingCard = document.getElementById('typingCard');
  const focusHint = document.getElementById('focusHint');
  const toastContainer = document.getElementById('toastContainer');

  const wpmDisplay = document.getElementById('wpmDisplay');
  const accuracyDisplay = document.getElementById('accuracyDisplay');
  const timerDisplay = document.getElementById('timerDisplay');
  const timerLabel = document.getElementById('timerLabel');
  const cpmDisplay = document.getElementById('cpmDisplay');
  const bestWpmDisplay = document.getElementById('bestWpmDisplay');

  const timeRow = document.getElementById('timeRow');
  const modeButtons = document.querySelectorAll('#modeSelector .toggle-btn');
  const timeButtons = document.querySelectorAll('#timeSelector .toggle-btn');
  const diffButtons = document.querySelectorAll('#difficultySelector .toggle-btn');

  const restartBtn = document.getElementById('restartBtn');
  const newPassageBtn = document.getElementById('newPassageBtn');
  const pauseToggleBtn = document.getElementById('pauseToggleBtn');
  const pauseBtnLabel = document.getElementById('pauseBtnLabel');
  const pauseBtnIcon = document.getElementById('pauseBtnIcon');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const resumeBtn = document.getElementById('resumeBtn');

  // Results Modal Elements
  const resultsOverlay = document.getElementById('resultsOverlay');
  const finalWpmVal = document.getElementById('finalWpmVal');
  const finalAccuracyVal = document.getElementById('finalAccuracyVal');
  const finalCpmVal = document.getElementById('finalCpmVal');
  const finalCorrectCharsVal = document.getElementById('finalCorrectCharsVal');
  const finalErrorsVal = document.getElementById('finalErrorsVal');
  const finalTimeVal = document.getElementById('finalTimeVal');
  const finalBestWpmVal = document.getElementById('finalBestWpmVal');
  const newBestBadge = document.getElementById('newBestBadge');
  const tryAgainBtn = document.getElementById('tryAgainBtn');
  const nextPassageBtn = document.getElementById('nextPassageBtn');
  const shareResultBtn = document.getElementById('shareResultBtn');

  const soundToggleBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');

  // --- Sound Effects Helper ---
  function playAudioTone(freq, type = 'sine', duration = 0.05, volume = 0.15) {
    if (window.playZoneAudio && window.playZoneAudio.enabled) {
      window.playZoneAudio.playTone(freq, type, duration, volume);
    }
  }

  function playKeyClickSound() {
    // Pleasant mechanical key clack
    playAudioTone(800 + Math.random() * 120, 'triangle', 0.03, 0.08);
  }

  function playKeyErrorSound() {
    playAudioTone(240, 'sawtooth', 0.08, 0.12);
  }

  function playVictoryFanfare() {
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
  function loadBestScore() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WPM);
      bestWpm = saved ? parseInt(saved, 10) || 0 : 0;
    } catch (e) {
      bestWpm = 0;
    }
    bestWpmDisplay.textContent = `${bestWpm} WPM`;
  }

  function saveBestScore(newWpm, newAcc) {
    let isNewRecord = false;
    if (newWpm > bestWpm) {
      bestWpm = newWpm;
      try {
        localStorage.setItem(STORAGE_KEY_WPM, bestWpm.toString());
        localStorage.setItem(STORAGE_KEY_ACC, newAcc.toString());
      } catch (e) {
        // ignore
      }
      bestWpmDisplay.textContent = `${bestWpm} WPM`;
      isNewRecord = true;
    }
    return isNewRecord;
  }

  // --- Toast Notification Helper ---
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 2500);
  }

  // --- Passage Selection & Rendering ---
  function getRandomPassage() {
    const list = PASSAGES[currentDifficulty] || PASSAGES.medium;
    let idx = Math.floor(Math.random() * list.length);
    if (list.length > 1 && idx === lastPassageIndex) {
      idx = (idx + 1) % list.length;
    }
    lastPassageIndex = idx;
    return list[idx];
  }

  function renderPassage() {
    passageBox.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < targetText.length; i++) {
      const span = document.createElement('span');
      span.className = 'char untyped';
      span.dataset.idx = i.toString();
      span.textContent = targetText[i];
      fragment.appendChild(span);
    }

    passageBox.appendChild(fragment);

    // Initial current cursor mark
    const firstSpan = passageBox.querySelector('.char[data-idx="0"]');
    if (firstSpan) {
      firstSpan.classList.add('current');
    }
  }

  // Append extra text seamlessly during Time Challenge if user finishes current passage
  function appendMoreText() {
    const nextText = ' ' + getRandomPassage();
    const startIndex = targetText.length;
    targetText += nextText;

    const fragment = document.createDocumentFragment();
    for (let i = startIndex; i < targetText.length; i++) {
      const span = document.createElement('span');
      span.className = 'char untyped';
      span.dataset.idx = i.toString();
      span.textContent = targetText[i];
      fragment.appendChild(span);
    }
    passageBox.appendChild(fragment);
  }

  // --- Live Typing Input Handler ---
  function handleInput() {
    if (isTestFinished || isPaused) {
      hiddenInput.value = typedText;
      return;
    }

    const val = hiddenInput.value;

    // Start timer on first keystroke
    if (!isTestActive && val.length > 0) {
      startTest();
    }

    // Play feedback sound
    if (val.length > typedText.length) {
      const newCharIdx = val.length - 1;
      if (val[newCharIdx] === targetText[newCharIdx]) {
        playKeyClickSound();
      } else {
        playKeyErrorSound();
      }
    }

    typedText = val;
    updateCharacterHighlights();
    updateLiveStats();

    // Check completion condition
    if (currentMode === 'passage' && typedText.length >= targetText.length) {
      finishTest();
    } else if (currentMode === 'time' && typedText.length >= targetText.length - 5) {
      // Keep feed flowing in time challenge mode
      appendMoreText();
    }
  }

  function updateCharacterHighlights() {
    const spans = passageBox.children;
    const len = spans.length;
    let localCorrect = 0;
    let localErrors = 0;

    for (let i = 0; i < len; i++) {
      const span = spans[i];
      span.classList.remove('current');

      if (i < typedText.length) {
        if (typedText[i] === targetText[i]) {
          span.className = 'char correct';
          localCorrect++;
        } else {
          span.className = 'char incorrect';
          localErrors++;
        }
      } else if (i === typedText.length) {
        span.className = 'char untyped current';

        // Keep active typing line visible in view
        const offsetTop = span.offsetTop - passageBox.offsetTop;
        if (offsetTop > passageBox.scrollTop + 140 || offsetTop < passageBox.scrollTop) {
          passageBox.scrollTop = Math.max(0, offsetTop - 60);
        }
      } else {
        span.className = 'char untyped';
      }
    }

    correctCount = localCorrect;
    errorCount = localErrors;
  }

  // --- Live Statistics Calculation ---
  function updateLiveStats() {
    if (!isTestActive) return;

    const totalTyped = typedText.length;
    const now = Date.now();
    const elapsedSeconds = Math.max(0.2, (now - startTime - elapsedBeforePause) / 1000);
    const elapsedMinutes = elapsedSeconds / 60;

    // Standard WPM = (Correct Characters / 5) / Elapsed Minutes
    currentWpm = Math.max(0, Math.round((correctCount / 5) / elapsedMinutes));
    currentCpm = Math.max(0, Math.round(correctCount / elapsedMinutes));

    // Accuracy = (Correct Characters / Total Typed Characters) * 100
    currentAccuracy = totalTyped > 0 ? Math.max(0, Math.round((correctCount / totalTyped) * 100)) : 100;

    wpmDisplay.textContent = currentWpm.toString();
    cpmDisplay.textContent = currentCpm.toString();
    accuracyDisplay.textContent = `${currentAccuracy}%`;
  }

  // --- Timer Engine ---
  function startTest() {
    isTestActive = true;
    isTestFinished = false;
    isPaused = false;
    startTime = Date.now();
    elapsedBeforePause = 0;

    clearInterval(timerInterval);
    timerInterval = setInterval(onTimerTick, 250);
  }

  function onTimerTick() {
    if (!isTestActive || isPaused || isTestFinished) return;

    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime - elapsedBeforePause) / 1000);

    if (currentMode === 'time') {
      timeRemaining = Math.max(0, targetDuration - elapsedSeconds);
      timerDisplay.textContent = `${timeRemaining}s`;

      if (timeRemaining <= 0) {
        finishTest();
      }
    } else {
      // Passage challenge: timer counts up
      const mins = Math.floor(elapsedSeconds / 60);
      const secs = elapsedSeconds % 60;
      timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    updateLiveStats();
  }

  function finishTest() {
    if (isTestFinished) return;
    isTestFinished = true;
    isTestActive = false;
    clearInterval(timerInterval);

    // Final calculations
    updateLiveStats();
    hiddenInput.blur();

    const isNewRecord = saveBestScore(currentWpm, currentAccuracy);
    playVictoryFanfare();

    // Calculate final time taken
    const now = Date.now();
    const totalElapsedSecs = Math.max(1, Math.round((now - startTime - elapsedBeforePause) / 1000));

    // Populate Results Modal
    finalWpmVal.textContent = currentWpm.toString();
    finalAccuracyVal.textContent = `${currentAccuracy}%`;
    finalCpmVal.textContent = `${currentCpm} CPM`;
    finalCorrectCharsVal.textContent = correctCount.toString();
    finalErrorsVal.textContent = errorCount.toString();
    finalTimeVal.textContent = currentMode === 'time' ? `${targetDuration}s` : `${totalElapsedSecs}s`;
    finalBestWpmVal.textContent = `${bestWpm} WPM`;

    newBestBadge.classList.toggle('hidden', !isNewRecord);

    setTimeout(() => {
      resultsOverlay.classList.remove('hidden');
    }, 350);
  }

  // --- Pause & Resume ---
  function togglePause() {
    if (!isTestActive || isTestFinished) return;

    isPaused = !isPaused;

    if (isPaused) {
      pauseStartTime = Date.now();
      pauseOverlay.classList.remove('hidden');
      pauseBtnLabel.textContent = 'Resume';
      pauseBtnIcon.textContent = '▶';
      hiddenInput.blur();
    } else {
      if (pauseStartTime) {
        elapsedBeforePause += Date.now() - pauseStartTime;
        pauseStartTime = null;
      }
      pauseOverlay.classList.add('hidden');
      pauseBtnLabel.textContent = 'Pause';
      pauseBtnIcon.textContent = '⏸️';
      hiddenInput.focus();
    }
  }

  // --- Reset & New Passage ---
  function resetTest(loadNewText = false) {
    clearInterval(timerInterval);
    isTestActive = false;
    isTestFinished = false;
    isPaused = false;
    startTime = null;
    elapsedBeforePause = 0;
    pauseStartTime = null;

    typedText = '';
    hiddenInput.value = '';

    currentWpm = 0;
    currentCpm = 0;
    currentAccuracy = 100;
    correctCount = 0;
    errorCount = 0;

    wpmDisplay.textContent = '0';
    cpmDisplay.textContent = '0';
    accuracyDisplay.textContent = '100%';

    pauseOverlay.classList.add('hidden');
    resultsOverlay.classList.add('hidden');
    pauseBtnLabel.textContent = 'Pause';
    pauseBtnIcon.textContent = '⏸️';

    if (currentMode === 'time') {
      timeRemaining = targetDuration;
      timerLabel.textContent = 'Time Left';
      timerDisplay.textContent = `${timeRemaining}s`;
    } else {
      timerLabel.textContent = 'Time';
      timerDisplay.textContent = '00:00';
    }

    if (loadNewText || !targetText) {
      targetText = getRandomPassage();
    }

    renderPassage();
    passageBox.scrollTop = 0;
    focusTypingInput();
  }

  function focusTypingInput() {
    hiddenInput.focus();
    typingCard.classList.add('focused');
  }

  // --- Share Result Functionality ---
  function shareResult() {
    const shareText = `⚡ I scored ${currentWpm} WPM with ${currentAccuracy}% accuracy on PlayZone Typing Speed Test! Can you beat my record?`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: 'PlayZone Typing Speed Test',
        text: shareText,
        url: shareUrl
      }).catch(() => {
        copyToClipboard(shareText);
      });
    } else {
      copyToClipboard(shareText);
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Result copied to clipboard! 📋');
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = text;
    tempTextArea.style.position = 'fixed';
    tempTextArea.style.left = '-9999px';
    document.body.appendChild(tempTextArea);
    tempTextArea.focus();
    tempTextArea.select();
    try {
      document.execCommand('copy');
      showToast('Result copied to clipboard! 📋');
    } catch (e) {
      showToast('Unable to copy automatically');
    }
    document.body.removeChild(tempTextArea);
  }

  // --- Auto-Pause on Tab Visibility Change ---
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isTestActive && !isPaused && !isTestFinished) {
      togglePause();
    }
  });

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Hidden Input events
    hiddenInput.addEventListener('input', handleInput);
    hiddenInput.addEventListener('focus', () => typingCard.classList.add('focused'));
    hiddenInput.addEventListener('blur', () => typingCard.classList.remove('focused'));

    // Clicking anywhere on passage card focuses input
    typingCard.addEventListener('click', () => {
      if (!isPaused && !isTestFinished) {
        focusTypingInput();
      }
    });

    // Challenge Mode Toggle (Time vs Passage)
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        timeRow.style.display = currentMode === 'time' ? 'flex' : 'none';
        resetTest(true);
      });
    });

    // Time Duration Selector (15, 30, 60, 120s)
    timeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        timeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        targetDuration = parseInt(btn.dataset.time, 10);
        resetTest(false);
      });
    });

    // Difficulty Selector (Easy, Medium, Hard)
    diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDifficulty = btn.dataset.diff;
        resetTest(true);
      });
    });

    // Control Buttons
    restartBtn.addEventListener('click', () => resetTest(false));
    newPassageBtn.addEventListener('click', () => resetTest(true));
    pauseToggleBtn.addEventListener('click', togglePause);
    resumeBtn.addEventListener('click', togglePause);

    // Modal Buttons
    tryAgainBtn.addEventListener('click', () => resetTest(false));
    nextPassageBtn.addEventListener('click', () => resetTest(true));
    shareResultBtn.addEventListener('click', shareResult);

    // Sound Toggle
    soundToggleBtn.addEventListener('click', () => {
      if (window.playZoneAudio) {
        window.playZoneAudio.toggle();
        updateSoundUI();
      }
    });

    // Global Keybindings (Tab to quickly restart test)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        resetTest(false);
      } else if (e.key === 'Escape') {
        if (isTestActive) togglePause();
      }
    });
  }

  // --- Initialization ---
  function init() {
    loadBestScore();
    updateSoundUI();
    setupEventListeners();
    resetTest(true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
