// Pure Web Audio API Sound Synthesizer for high performance & instant responsiveness

class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Click sound with dynamic combo pitch scaling
  public playClick(combo: number = 0, isCrit: boolean = false) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Base frequency rises with combo up to combo 30
      const baseFreq = isCrit ? 600 : 240 + Math.min(combo * 16, 500);
      osc.type = isCrit ? 'triangle' : combo > 10 ? 'sawtooth' : 'sine';

      // Pitch drop for punchy click
      osc.frequency.setValueAtTime(baseFreq * 1.8, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, t + 0.06);

      // Volume envelope
      const vol = Math.min(0.25 + (combo > 5 ? 0.05 : 0), 0.45);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (isCrit ? 0.12 : 0.06));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + (isCrit ? 0.13 : 0.07));

      // Extra sub thump for punch
      if (combo > 5 || isCrit) {
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(140, t);
        subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.05);
        subGain.gain.setValueAtTime(0.3, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        subOsc.connect(subGain);
        subGain.connect(this.ctx.destination);
        subOsc.start(t);
        subOsc.stop(t + 0.05);
      }
    } catch {
      // Audio fallback silent
    }
  }

  // Error / penalty sound
  public playError() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.linearRampToValueAtTime(70, t + 0.18);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    } catch {}
  }

  // Combo milestone fanfare / chime
  public playComboMilestone() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const t = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.04);
        gain.gain.setValueAtTime(0.18, t + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t + idx * 0.04);
        osc.stop(t + idx * 0.04 + 0.2);
      });
    } catch {}
  }

  // Dodging / Whoosh sound
  public playWhoosh() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(700, t + 0.08);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.16);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    } catch {}
  }

  // Level Win Fanfare
  public playWin() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [392, 523.25, 659.25, 783.99, 1046.5]; // G4, C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);
        gain.gain.setValueAtTime(0.25, t + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.4);
      });
    } catch {}
  }

  // Game Over Sad Trombone
  public playGameOver() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [311.13, 293.66, 277.18, 261.63]; // Eb4, D4, Db4, C4
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t + idx * 0.15);
        gain.gain.setValueAtTime(0.22, t + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.15 + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t + idx * 0.15);
        osc.stop(t + idx * 0.15 + 0.25);
      });
    } catch {}
  }

  // Urgent Clock Tick (speeds up when time is running low)
  public playTick(isUrgent: boolean = false) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(isUrgent ? 880 : 440, t);
      gain.gain.setValueAtTime(isUrgent ? 0.15 : 0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.03);
    } catch {}
  }

  // Fakeout dramatic siren / troll sting
  public playFakeout() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.linearRampToValueAtTime(1400, t + 0.15);
      osc.frequency.linearRampToValueAtTime(400, t + 0.35);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    } catch {}
  }

  // Boss hit / explosion
  public playBossHit() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 0.2);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    } catch {}
  }

  // Rhythm beat sync click
  public playRhythmHit(isPerfect: boolean) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isPerfect ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(isPerfect ? 880 : 180, t);
      gain.gain.setValueAtTime(isPerfect ? 0.3 : 0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } catch {}
  }

  // Punchy arcade pop / mole whack sound
  public playPop() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(1100, t + 0.04);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.1);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch {}
  }

  // Classic Mario-style Coin ding (B5 -> E6 chime)
  public playCoin() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, t); // B5
      osc.frequency.setValueAtTime(1318.51, t + 0.08); // E6
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    } catch {}
  }

  // Block bump sound
  public playBlockBump() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch {}
  }

  // Odd One Out Correct chime
  public playOddCorrect() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [659.25, 880, 1046.5]; // E5, A5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.05);
        gain.gain.setValueAtTime(0.22, t + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t + idx * 0.05);
        osc.stop(t + idx * 0.05 + 0.22);
      });
    } catch {}
  }

  // Alchemy Element Craft Discover Chime
  public playCraftSuccess(isNewDiscovery: boolean = true) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const freqs = isNewDiscovery ? [523.25, 659.25, 783.99, 1046.5, 1318.51] : [440, 554.37, 659.25];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.06);
        gain.gain.setValueAtTime(isNewDiscovery ? 0.25 : 0.15, t + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + (isNewDiscovery ? 0.4 : 0.2));
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t + idx * 0.06);
        osc.stop(t + idx * 0.06 + 0.45);
      });
    } catch {}
  }

  // Chain Reaction Particle Explosion Pop
  public playReactorPop(combo: number = 1) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const pitch = Math.min(300 + combo * 45, 1400);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pitch, t);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, t + 0.04);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.3, t + 0.12);
      gain.gain.setValueAtTime(Math.min(0.2 + combo * 0.02, 0.4), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch {}
  }

  // Chain Reaction Target / Quota Reached Chime
  public playTargetReached() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      // Vibrant ascending major chord with high shimmer (G5 -> C6 -> E6 -> G6)
      const freqs = [783.99, 1046.5, 1318.51, 1567.98];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.05);
        gain.gain.setValueAtTime(0.24, t + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.38);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t + idx * 0.05);
        osc.stop(t + idx * 0.05 + 0.42);
      });
    } catch {}
  }

  // Melodic Synth Pad Note
  public playSynthNote(freq: number, duration: number = 0.35, type: OscillatorType = 'sine') {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    } catch {}
  }

  // Firework whistle + crackle / pop burst sound
  public playFirework() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      // Whistle up
      const whistle = this.ctx.createOscillator();
      const wGain = this.ctx.createGain();
      whistle.type = 'sine';
      whistle.frequency.setValueAtTime(400 + Math.random() * 200, t);
      whistle.frequency.exponentialRampToValueAtTime(1400 + Math.random() * 400, t + 0.18);
      wGain.gain.setValueAtTime(0.08, t);
      wGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      whistle.connect(wGain);
      wGain.connect(this.ctx.destination);
      whistle.start(t);
      whistle.stop(t + 0.2);

      // Pop / Boom
      const boom = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      boom.type = 'triangle';
      boom.frequency.setValueAtTime(160 + Math.random() * 60, t + 0.18);
      boom.frequency.exponentialRampToValueAtTime(30, t + 0.45);
      bGain.gain.setValueAtTime(0.3, t + 0.18);
      bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      boom.connect(bGain);
      bGain.connect(this.ctx.destination);
      boom.start(t + 0.18);
      boom.stop(t + 0.46);

      // Shimmer chord
      const chords = [880, 1174.66, 1479.98, 1760];
      chords.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t + 0.19 + i * 0.03);
        g.gain.setValueAtTime(0.12, t + 0.19 + i * 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
        osc.connect(g);
        g.connect(this.ctx!.destination);
        osc.start(t + 0.19 + i * 0.03);
        osc.stop(t + 0.5);
      });
    } catch {}
  }
}

export const sound = new SoundEngine();
