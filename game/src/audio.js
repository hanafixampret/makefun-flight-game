// Ridge Runner — synthesized sound: engine hum, wind rush, ring chimes.
// Everything is generated with WebAudio; no audio files are loaded.
const AudioSys = {
  ctx: null,
  engineOsc1: null,
  engineOsc2: null,
  engineGain: null,
  windGain: null,
  windFilter: null,
  muted: false,
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      // Engine: two detuned saws through a lowpass.
      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      this.engineOsc1 = ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.value = 52;
      this.engineOsc2 = ctx.createOscillator();
      this.engineOsc2.type = 'square';
      this.engineOsc2.frequency.value = 26;
      const g2 = ctx.createGain();
      g2.gain.value = 0.4;
      this.engineOsc1.connect(filter);
      this.engineOsc2.connect(g2);
      g2.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(ctx.destination);
      this.engineOsc1.start();
      this.engineOsc2.start();
      // Wind: looped noise buffer through a bandpass.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      this.windFilter = ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.value = 600;
      this.windFilter.Q.value = 0.6;
      this.windGain = ctx.createGain();
      this.windGain.gain.value = 0;
      src.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(ctx.destination);
      src.start();
    } catch (err) {
      this.ctx = null;
    }
  },
  // Called every frame while flying.
  update(throttle, speed01, flying) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const eng = flying ? 0.05 + throttle * 0.075 : 0;
    this.engineGain.gain.setTargetAtTime(eng, t, 0.1);
    this.engineOsc1.frequency.setTargetAtTime(46 + throttle * 66, t, 0.1);
    this.engineOsc2.frequency.setTargetAtTime(23 + throttle * 33, t, 0.1);
    this.windGain.gain.setTargetAtTime(flying ? speed01 * 0.11 : 0, t, 0.15);
    this.windFilter.frequency.setTargetAtTime(400 + speed01 * 900, t, 0.15);
  },
  chime() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    for (const [freq, when] of [[880, 0], [1318, 0.09]]) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.16, t + when);
      g.gain.exponentialRampToValueAtTime(0.001, t + when + 0.5);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(t + when);
      o.stop(t + when + 0.55);
    }
  },
  thud() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.35);
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + 0.45);
  },
  fanfare() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.14, t + i * 0.13);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.13 + 0.6);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(t + i * 0.13);
      o.stop(t + i * 0.13 + 0.65);
    });
  },
};
