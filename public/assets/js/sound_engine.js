/**
 * Procedural Web Audio API Sound Engine for Anime Religion Quiz Arena
 * Zero external mp3 dependencies, 100% offline, zero latency!
 */

class QuizSoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('quiz_sound_muted') === 'true';
    this.initAudioContext = this.initAudioContext.bind(this);
  }

  getAudioContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('quiz_sound_muted', this.muted);
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('quiz_sound_muted', this.muted);
  }

  // 1. Golden Bell Chime (Chuông Vàng)
  playBell() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Multi-harmonic bell frequencies
    const fundamental = 587.33; // D5
    const ratios = [1, 2.05, 3.02, 4.2, 5.4];
    const gains = [0.6, 0.4, 0.25, 0.15, 0.08];

    ratios.forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(fundamental * ratio, now);

      gain.gain.setValueAtTime(gains[i], now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8 + i * 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 2.5);
    });
  }

  // 2. Buzzer Press / Trigger
  playBuzzer() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // 3. Correct Answer Fanfare
  playCorrect() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Arpeggio: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.4, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.6);
    });
  }

  // 4. Wrong Answer Buzz
  playWrong() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(146.83, now); // D3
    osc2.frequency.setValueAtTime(155.56, now); // D#3 (dissonant semitone)

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.52);
    osc2.stop(now + 0.52);
  }

  // 5. Countdown Tick
  playTick() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // 6. Urgent Countdown Tick (Last 3 seconds)
  playUrgentTick() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  // 7. Puzzle Unlock Shimmer
  playPuzzleUnlock() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const freqs = [659.25, 880, 1046.50, 1318.51, 1567.98, 1760];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + i * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, start);

      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.75);
    });
  }

  // 8. Wager Confirm / Lock
  playWagerLock() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.15);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // 9. Grand Finale Victory Fanfare
  playVictory() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Fanfare chords
    const chord1 = [523.25, 659.25, 783.99]; // C major
    const chord2 = [587.33, 739.99, 880.00]; // D major
    const chord3 = [659.25, 830.61, 987.77]; // E major
    const chordFinal = [1046.50, 1318.51, 1567.98, 2093.00]; // High C major victory

    const playChord = (notes, time, dur) => {
      notes.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.35 / notes.length, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + dur + 0.05);
      });
    };

    playChord(chord1, now, 0.4);
    playChord(chord2, now + 0.4, 0.4);
    playChord(chord3, now + 0.8, 0.5);
    playChord(chordFinal, now + 1.3, 2.5);
  }

  // Dispatch sound by event name
  playSound(name) {
    if (this.muted) return;
    switch (name) {
      case 'bell':
        this.playBell();
        break;
      case 'buzzer':
        this.playBuzzer();
        break;
      case 'correct':
        this.playCorrect();
        break;
      case 'wrong':
        this.playWrong();
        break;
      case 'tick':
        this.playTick();
        break;
      case 'urgent_tick':
        this.playUrgentTick();
        break;
      case 'puzzle_unlock':
        this.playPuzzleUnlock();
        break;
      case 'wager_lock':
        this.playWagerLock();
        break;
      case 'victory':
        this.playVictory();
        break;
    }
  }
}

// Global instance for browser usage
window.quizSound = new QuizSoundEngine();

// Auto-unlock Web Audio on first user interaction anywhere
['click', 'touchstart', 'keydown'].forEach(evt => {
  window.addEventListener(evt, () => {
    if (window.quizSound) {
      window.quizSound.getAudioContext();
    }
  }, { once: true });
});
