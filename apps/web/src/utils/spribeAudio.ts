// apps/web/src/utils/spribeAudio.ts

export class SpribeAudioEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;
  private flightThemeInterval: any = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('rivexa_sound_enabled') ?? localStorage.getItem('game_sound_enabled') ?? localStorage.getItem('aviator_sound_muted');
        if (saved !== null) {
          this.isMuted = saved === 'false' || saved === 'true' && localStorage.getItem('aviator_sound_muted') === 'true';
        }
      } catch (e) {}
    }
  }

  public toggleMute(muted?: boolean): boolean {
    this.isMuted = muted !== undefined ? muted : !this.isMuted;
    if (typeof window !== 'undefined') {
      try {
        const soundEnabledStr = String(!this.isMuted);
        localStorage.setItem('rivexa_sound_enabled', soundEnabledStr);
        localStorage.setItem('game_sound_enabled', soundEnabledStr);
        localStorage.setItem('pushparani_sound_enabled', soundEnabledStr);
        localStorage.setItem('aviator_sound_muted', String(this.isMuted));
      } catch (e) {}
    }
    if (this.isMuted) {
      this.stopFlightTheme();
    }
    return this.isMuted;
  }

  private initCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Pre-flight countdown chime sound (high bell pings)
   */
  public playPreFlightChime() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const notes = [659.25, 880.00, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + idx * 0.1 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.4);
      });
    } catch (e) {}
  }

  /**
   * Continuous Flight Theme & Turbine Engine Audio Loop
   */
  public startFlightTheme() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    this.stopFlightTheme();

    // 1. Turbine Engine Sound (Continuous Warm Low Hum)
    try {
      this.engineOsc = ctx.createOscillator();
      this.engineFilter = ctx.createBiquadFilter();
      this.engineGain = ctx.createGain();

      this.engineOsc.type = 'triangle';
      this.engineOsc.frequency.setValueAtTime(140, ctx.currentTime);

      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(650, ctx.currentTime);

      this.engineGain.gain.setValueAtTime(0.05, ctx.currentTime);

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(ctx.destination);

      this.engineOsc.start();
    } catch (e) {}

    // 2. Continuous Spribe Aviator Flight Music Loop (Melodic synth + bass line)
    const melodyNotes = [523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 440.00, 493.88, 523.25, 659.25, 783.99, 880.00, 783.99, 659.25, 523.25, 440.00];
    const bassNotes = [130.81, 130.81, 164.81, 164.81, 110.00, 110.00, 146.83, 146.83];
    let step = 0;

    const playNextStep = () => {
      if (this.isMuted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;

        // Lead synth melody
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const freq = melodyNotes[step % melodyNotes.length];
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);

        // Bass rhythm pulse on alternate beats
        if (step % 2 === 0) {
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bassOsc.type = 'sine';
          const bassFreq = bassNotes[Math.floor(step / 2) % bassNotes.length];
          bassOsc.frequency.setValueAtTime(bassFreq, now);

          bassGain.gain.setValueAtTime(0.04, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

          bassOsc.connect(bassGain);
          bassGain.connect(this.ctx.destination);
          bassOsc.start(now);
          bassOsc.stop(now + 0.22);
        }

        step++;
      } catch (e) {}
    };

    playNextStep();
    this.flightThemeInterval = setInterval(playNextStep, 160);
  }

  /**
   * Update engine pitch - kept ultra-smooth & gentle (capped at 160Hz max)
   */
  public updateFlightMultiplier(multiplier: number) {
    if (this.isMuted || !this.engineOsc || !this.ctx) return;
    try {
      // Gentle subtle warmth shift capped at 160Hz (no high frequency screeching at high multipliers)
      const targetFreq = Math.min(160, 140 + Math.min(20, (multiplier - 1.0) * 1.5));
      const targetCutoff = Math.min(800, 650 + Math.min(150, (multiplier - 1.0) * 5));

      this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.2);
      if (this.engineFilter) {
        this.engineFilter.frequency.setTargetAtTime(targetCutoff, this.ctx.currentTime, 0.2);
      }
    } catch (e) {}
  }

  /**
   * Stop flight audio and reset turbine hum
   */
  public stopFlightTheme() {
    if (this.flightThemeInterval) {
      clearInterval(this.flightThemeInterval);
      this.flightThemeInterval = null;
    }
    if (this.engineOsc) {
      try {
        if (this.engineGain && this.ctx) {
          this.engineGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        }
        setTimeout(() => {
          try {
            this.engineOsc?.stop();
          } catch (e) {}
          this.engineOsc = null;
        }, 120);
      } catch (e) {
        this.engineOsc = null;
      }
    }
  }

  public destroy() {
    this.stopFlightTheme();
    if (this.ctx) {
      try {
        if (this.ctx.state !== 'closed') {
          this.ctx.close().catch(() => {});
        }
      } catch (e) {}
      this.ctx = null;
    }
  }

  /**
   * Fanfare sound effect when player cashes out successfully
   */
  public playCashoutFanfare() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const jingle = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      jingle.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);

        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.32);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.07);
        osc.stop(ctx.currentTime + idx * 0.07 + 0.32);
      });
    } catch (e) {}
  }

  /**
   * Explosion sound effect when plane crashes
   */
  public playCrashExplosion() {
    this.stopFlightTheme();
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      // Low rumble sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(18, ctx.currentTime + 0.7);

      gain.gain.setValueAtTime(0.45, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.7);

      // Noise burst for explosion crackle
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(1000, ctx.currentTime);
      noiseFilter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start();
    } catch (e) {}
  }
}
