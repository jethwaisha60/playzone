/**
 * PlayZone - Built-in Audio Engine (Web Audio API)
 * Generates retro arcade sound effects directly in the browser with zero external audio assets.
 */

class SoundEffects {
  constructor() {
    this.ctx = null;
    // Load sound preference from localStorage (defaults to enabled)
    this.enabled = localStorage.getItem('playzone_sound') !== 'disabled';
    this.initAudioContext();
  }

  /**
   * Lazily initialize or resume AudioContext to satisfy modern browser autoplay policies.
   */
  initAudioContext() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      const resume = () => {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        document.removeEventListener('click', resume);
        document.removeEventListener('keydown', resume);
        document.removeEventListener('touchstart', resume);
      };
      document.addEventListener('click', resume);
      document.addEventListener('keydown', resume);
      document.addEventListener('touchstart', resume);
    }
  }

  /**
   * Toggle sound state on/off
   */
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('playzone_sound', this.enabled ? 'enabled' : 'disabled');
    if (this.enabled) {
      this.playTone(523.25, 'sine', 0.1, 0.15); // gentle high beep to confirm sound is on
    }
    return this.enabled;
  }

  /**
   * Generic synthesizer tone builder
   */
  playTone(frequency, type = 'sine', duration = 0.1, volume = 0.2) {
    if (!this.enabled) return;
    this.initAudioContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio playback not allowed yet", e);
    }
  }

  /**
   * Quick snappy UI click sound
   */
  playClick() {
    if (!this.enabled) return;
    this.playTone(600, 'triangle', 0.06, 0.12);
  }

  /**
   * Subtle hover blip
   */
  playHover() {
    if (!this.enabled) return;
    this.playTone(880, 'sine', 0.03, 0.03);
  }

  /**
   * Victory / Success fanfare
   */
  playSuccess() {
    if (!this.enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.18, 0.18);
      }, index * 90);
    });
  }

  /**
   * Game Over descending sound
   */
  playGameOver() {
    if (!this.enabled) return;
    const notes = [440, 370, 311, 220];
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, 'sawtooth', 0.22, 0.15);
      }, index * 120);
    });
  }
}

// Global audio instance accessible by all scripts
window.playZoneAudio = new SoundEffects();
