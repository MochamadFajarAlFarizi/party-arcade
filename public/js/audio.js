/**
 * Procedural Cartoon Web Audio Synthesizer — zero audio file downloads!
 * Produces bouncy pops, marimba ticks, dash whooshes, cartoon explosions, and victory jingles.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  _ensure() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  unlock() {
    this._ensure();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  _tone(freq, dur = 0.12, type = 'triangle', gainVal = 0.14, slideTo = null, delay = 0) {
    const ctx = this._ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.001, t0);
    g.gain.linearRampToValueAtTime(gainVal, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise(dur = 0.25, gainVal = 0.18) {
    const ctx = this._ensure();
    if (!ctx) return;
    const size = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gainVal, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start();
  }

  play(name) {
    if (this.muted) return;
    switch (name) {
      case 'pop':
        this._tone(520, 0.07, 'sine', 0.12, 780);
        break;
      case 'tick':
        this._tone(440, 0.09, 'triangle', 0.14, 380);
        break;
      case 'go':
        this._tone(523, 0.1, 'triangle', 0.16, null, 0);
        this._tone(784, 0.22, 'triangle', 0.18, 880, 0.08);
        break;
      case 'dash':
        this._tone(320, 0.14, 'sawtooth', 0.08, 720);
        break;
      case 'bump':
        this._tone(210, 0.11, 'sine', 0.16, 95);
        break;
      case 'pass':
        this._tone(480, 0.08, 'triangle', 0.15, 720);
        this._tone(720, 0.08, 'triangle', 0.12, 920, 0.05);
        break;
      case 'bombTick':
        this._tone(680, 0.05, 'square', 0.07, 500);
        break;
      case 'bombFast':
        this._tone(960, 0.05, 'square', 0.1, 700);
        break;
      case 'explode':
        this._noise(0.36, 0.24);
        this._tone(160, 0.3, 'sawtooth', 0.18, 38);
        break;
      case 'powerup':
        this._tone(523, 0.08, 'triangle', 0.14, null, 0);
        this._tone(659, 0.08, 'triangle', 0.14, null, 0.07);
        this._tone(1046, 0.16, 'triangle', 0.15, null, 0.14);
        break;
      case 'correct':
        this._tone(587, 0.09, 'triangle', 0.16, null, 0);
        this._tone(880, 0.18, 'triangle', 0.16, null, 0.08);
        break;
      case 'wrong':
        this._tone(240, 0.14, 'sawtooth', 0.12, 160);
        break;
      case 'laser':
        this._tone(1100, 0.18, 'sawtooth', 0.09, 240);
        break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, idx) => this._tone(f, 0.18, 'triangle', 0.15, null, idx * 0.09));
        break;
      default:
        break;
    }
  }
}

export const sfx = new SoundEngine();
