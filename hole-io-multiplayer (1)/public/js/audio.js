export class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicEnabled = false;
    this.musicTimer = null;
    this.boostOsc = null;
    this.boostGain = null;
  }

  _init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.boostGain) {
      this.boostGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    return this.muted;
  }

  playSwallow(sizeTier = 1) {
    if (this.muted) return;
    this._init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (sizeTier === 1) {
      // Bloop
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.08);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    } else if (sizeTier === 2) {
      // Gulp
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.14);
      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.15);
    } else {
      // Deep Crunch / Thud
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.28);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  }

  playKill() {
    if (this.muted) return;
    this._init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Two harmonized triumphant tones
    [440, 660, 880].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);
      gain.gain.setValueAtTime(0.25, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.3);

      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.3);
    });
  }

  playLevelUp() {
    if (this.muted) return;
    this._init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.09);

      gain.gain.setValueAtTime(0.25, t + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + i * 0.09);
      osc.stop(t + i * 0.09 + 0.22);
    });
  }

  playDeath() {
    if (this.muted) return;
    this._init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(250, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.4);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  setBoostActive(active) {
    if (this.muted || !this.ctx) return;

    if (active) {
      if (!this.boostOsc) {
        this.boostOsc = this.ctx.createOscillator();
        this.boostGain = this.ctx.createGain();
        this.boostOsc.type = 'triangle';
        this.boostOsc.frequency.setValueAtTime(110, this.ctx.currentTime);
        this.boostGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

        this.boostOsc.connect(this.boostGain);
        this.boostGain.connect(this.ctx.destination);
        this.boostOsc.start();
      }
    } else {
      if (this.boostOsc) {
        try {
          this.boostOsc.stop();
          this.boostOsc.disconnect();
        } catch (e) {}
        this.boostOsc = null;
        this.boostGain = null;
      }
    }
  }
}
