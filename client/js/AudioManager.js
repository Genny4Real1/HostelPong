export class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.enabled = true;
    this._master = null;
    try {
      const m = localStorage.getItem('hp_muted');
      if (m === '1') this.muted = true;
    } catch {}
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this._master = this.ctx.createGain();
    this._master.gain.value = this.muted ? 0 : 0.5;
    this._master.connect(this.ctx.destination);
  }

  setMuted(m) {
    this.muted = !!m;
    if (this._master) this._master.gain.value = this.muted ? 0 : 0.5;
    try { localStorage.setItem('hp_muted', this.muted ? '1' : '0'); } catch {}
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  vibrate(ms = 50) {
    if (this.muted) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(ms); } catch {}
    }
  }

  _tone(freq, durationMs, type = 'square', gain = 0.3) {
    if (!this.ctx || !this._master || this.muted || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + durationMs / 1000);
    osc.connect(g);
    g.connect(this._master);
    osc.start(t);
    osc.stop(t + durationMs / 1000);
  }

  blip() {
    this._tone(440, 80, 'square', 0.25);
  }

  bloop() {
    this._tone(180, 120, 'sine', 0.3);
  }

  crash() {
    if (!this.ctx || !this._master || this.muted || !this.enabled) return;
    const t = this.ctx.currentTime;
    const dur = 0.25;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 800;
    src.connect(filter);
    filter.connect(g);
    g.connect(this._master);
    src.start(t);
    src.stop(t + dur);
  }
}
