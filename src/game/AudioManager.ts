/**
 * Procedural Web Audio API sound generator for Trailbound: Wild Horizons.
 * Zero external audio files required — 100% resilient procedural audio.
 */

export class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Engine synth nodes
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private oscSub: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private isEngineRunning: boolean = false;

  // Tire skid / gravel noise
  private tireNoiseNode: AudioBufferSourceNode | null = null;
  private tireNoiseGain: GainNode | null = null;
  private tireNoiseFilter: BiquadFilterNode | null = null;

  // Ambient wind
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;

  private masterVol: number = 0.7;
  private engineVol: number = 0.65;
  private sfxVol: number = 0.8;

  constructor() {
    // AudioContext will be initialized on first user interaction to satisfy browser policies
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVol, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Sub-buses
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(this.engineVol, this.ctx.currentTime);
      this.engineGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.initEngineSynth();
      this.initTireNoise();
      this.initWindAmbience();
    } catch {
      // Audio not supported or blocked
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private initEngineSynth() {
    if (!this.ctx || !this.engineGain) return;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(260, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);
    this.engineFilter.connect(this.engineGain);

    // Primary engine cylinder firing (sawtooth)
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.setValueAtTime(38, this.ctx.currentTime);
    this.osc1.connect(this.engineFilter);

    // Harmonic engine rumble (triangle, 1.5x ratio)
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.setValueAtTime(57, this.ctx.currentTime);
    this.osc2.connect(this.engineFilter);

    // Sub rumble
    this.oscSub = this.ctx.createOscillator();
    this.oscSub.type = 'sine';
    this.oscSub.frequency.setValueAtTime(25, this.ctx.currentTime);
    this.oscSub.connect(this.engineFilter);

    try {
      this.osc1.start();
      this.osc2.start();
      this.oscSub.start();
      this.isEngineRunning = true;
    } catch {
      // Ignore if already started
    }
  }

  private initTireNoise() {
    if (!this.ctx || !this.sfxGain) return;

    // Create 2 seconds of looping white/pink noise for tire contact
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.15;
    }

    this.tireNoiseNode = this.ctx.createBufferSource();
    this.tireNoiseNode.buffer = noiseBuffer;
    this.tireNoiseNode.loop = true;

    this.tireNoiseFilter = this.ctx.createBiquadFilter();
    this.tireNoiseFilter.type = 'bandpass';
    this.tireNoiseFilter.frequency.setValueAtTime(700, this.ctx.currentTime);
    this.tireNoiseFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);

    this.tireNoiseGain = this.ctx.createGain();
    this.tireNoiseGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.tireNoiseNode.connect(this.tireNoiseFilter);
    this.tireNoiseFilter.connect(this.tireNoiseGain);
    this.tireNoiseGain.connect(this.sfxGain);

    try {
      this.tireNoiseNode.start();
    } catch {
      // Ignore
    }
  }

  private initWindAmbience() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 3;
    const windBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = windBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.08;
    }

    const windSource = this.ctx.createBufferSource();
    windSource.buffer = windBuffer;
    windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    try {
      windSource.start();
    } catch {
      // Ignore
    }
  }

  public updateEngine(rpm: number, throttle: number, speedKmh: number, slip: number) {
    if (!this.ctx || !this.isEngineRunning || !this.osc1 || !this.osc2 || !this.oscSub || !this.engineFilter) return;

    const t = this.ctx.currentTime;
    // Map RPM (800 - 6500) to fundamental frequencies
    const baseFreq = 28 + (rpm / 6500) * 115;
    this.osc1.frequency.setTargetAtTime(baseFreq, t, 0.06);
    this.osc2.frequency.setTargetAtTime(baseFreq * 1.5, t, 0.06);
    this.oscSub.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.08);

    // Filter cut-off opens with throttle and RPM
    const cutoff = 200 + (throttle * 900) + (rpm / 6500) * 1200;
    this.engineFilter.frequency.setTargetAtTime(cutoff, t, 0.05);

    // Update tire rolling / skidding noise
    if (this.tireNoiseGain && this.tireNoiseFilter) {
      const speedNorm = Math.min(1, speedKmh / 90);
      const targetGain = Math.min(0.6, (speedNorm * 0.15) + (slip * 0.45));
      this.tireNoiseGain.gain.setTargetAtTime(targetGain, t, 0.05);

      const targetBandpass = 400 + speedNorm * 1000 + slip * 800;
      this.tireNoiseFilter.frequency.setTargetAtTime(targetBandpass, t, 0.05);
    }
  }

  public stopEngine() {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  public startEngine() {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(this.engineVol, this.ctx.currentTime, 0.1);
    }
  }

  public playCollisionSound(intensity: number = 0.5) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.18);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, t);

    const impactVol = Math.min(0.7, Math.max(0.1, intensity * 0.6));
    gain.gain.setValueAtTime(impactVol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  public playWaterSplash() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const dur = 0.4;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(850, t);
    filter.Q.setValueAtTime(2.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    src.start(t);
  }

  public playCheckpointFanfare() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Chime notes: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const noteTime = t + idx * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.3, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.48);
    });
  }

  public playRecoverSound() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.2);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.28);
  }

  public playClick() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  public setVolumes(master: number, engine: number, sfx: number) {
    this.masterVol = master;
    this.engineVol = engine;
    this.sfxVol = sfx;

    if (this.ctx) {
      const t = this.ctx.currentTime;
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVol, t, 0.05);
      }
      if (this.engineGain) {
        this.engineGain.gain.setTargetAtTime(this.engineVol, t, 0.05);
      }
      if (this.sfxGain) {
        this.sfxGain.gain.setTargetAtTime(this.sfxVol, t, 0.05);
      }
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVol, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}
