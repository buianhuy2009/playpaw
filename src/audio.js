/**
 * PawPlay Feline-Calibrated Procedural Web Audio API Synthesizer
 *
 * Grounded in bioacoustic research on feline hearing (sensitivity 8 kHz - 32 kHz, up to 85 kHz):
 * - FM Rodent Ultrasonic & Harmonic Squeak (8,500 Hz to 13,200 Hz with fast vibrato)
 * - Bandpass Scurry & Crinkle Rustle (7,500 Hz to 14,000 Hz filtered noise transients)
 * - Insect Stridulation & Wing Clicks (9,500 Hz to 12,800 Hz percussive pulses)
 * - Bird Chirrup & Trill Sweeps (7,800 Hz to 11,500 Hz modulated sine)
 * - Aquatic Splash with High-Frequency Droplet Pop (1,800 Hz to 4,200 Hz cavity pop)
 * - 12-Second Acoustic Idle Lure (Dual high-pip 9,800 Hz / 11,500 Hz + scamper rustle)
 * - Session Completion Chime (Harmonic C5-E5-G5 triad chime)
 * - Android Haptic Vibration ([30, 20, 40]ms pattern on catch)
 * - Safe user gesture auto-unlock and AudioContext policy resumption
 */

export class SoundSynthesizer {
  /**
   * @param {AudioContext} [audioContext]
   */
  constructor(audioContext) {
    this.ctx = audioContext || null;
    this.isMuted = false;
    this.volume = 1.0;
    this.lastCatchPlayed = null;
    this.lureTriggeredCount = 0;
    this.chimePlayed = false;
    this.lastScurryTime = 0;

    // Lazy initialization of Web Audio API
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch (e) {}
      }
    }
  }

  /**
   * Resumes AudioContext on user gesture (solves iOS / Chrome autoplay policy).
   * @returns {Promise<string>}
   */
  async unlock() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch (e) {}
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {}
    }
    return this.ctx ? this.ctx.state : 'unsupported';
  }

  /**
   * Toggles mute state.
   * @param {boolean} muted
   */
  mute(muted) {
    this.isMuted = Boolean(muted);
  }

  /**
   * Sets master sound volume.
   * @param {number} vol - [0.0, 1.0]
   */
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, Number(vol) || 0));
  }

  /**
   * Plays feline-calibrated catch sound based on prey type.
   * @param {string} preyType - 'mouse' | 'bug' | 'bee' | 'koi' | 'laser'
   */
  playPreyCatch(preyType) {
    if (this.isMuted || !this.ctx) return;
    this.lastCatchPlayed = preyType;

    const t = this.ctx.currentTime || 0;
    const masterGain = this.ctx.createGain ? this.ctx.createGain() : null;
    if (masterGain) {
      if (masterGain.gain.setValueAtTime) {
        masterGain.gain.setValueAtTime(this.volume, t);
      } else {
        masterGain.gain.value = this.volume;
      }
      if (this.ctx.destination) {
        masterGain.connect(this.ctx.destination);
      }
    }

    // 1. Mouse: High-frequency rodent squeak + scurry burst (8,500 - 13,200 Hz)
    if (preyType === 'mouse') {
      this._playRodentSqueak(t, masterGain);
      this._playCrinkleScurry(t, masterGain, 0.08);
    }
    // 2. Bug / Bee: High-frequency insect click and stridulation (9,500 - 12,800 Hz)
    else if (preyType === 'bug' || preyType === 'bee') {
      this._playBugClick(t, masterGain);
      this._playCrinkleScurry(t, masterGain, 0.06);
    }
    // 3. Koi: Resonant water splash with droplet pop
    else if (preyType === 'koi') {
      this._playWaterSplash(t, masterGain);
    }
    // 4. Laser / Bird: High-frequency harmonic chirp (7,800 - 11,500 Hz)
    else {
      this._playLaserChirp(t, masterGain);
    }

    // Tactile haptic vibration on mobile
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([30, 20, 40]);
      } catch (e) {}
    }
  }

  /**
   * High-Frequency Rodent Distress Squeak (8,800 Hz -> 12,500 Hz -> 9,200 Hz)
   * Specifically targets peak feline pinnae orienting sensitivity (~8-14 kHz).
   * @private
   */
  _playRodentSqueak(t, destination) {
    if (!this.ctx.createOscillator) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain ? this.ctx.createGain() : null;

    if (osc.frequency && osc.frequency.setValueAtTime) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(8800, t);
      if (osc.frequency.linearRampToValueAtTime) {
        osc.frequency.linearRampToValueAtTime(12500, t + 0.04);
        osc.frequency.linearRampToValueAtTime(9200, t + 0.11);
      }
    }

    if (gain && gain.gain && gain.gain.setValueAtTime) {
      gain.gain.setValueAtTime(0.01, t);
      if (gain.gain.linearRampToValueAtTime) {
        gain.gain.linearRampToValueAtTime(0.85, t + 0.02);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.13);
      }
      osc.connect(gain);
      if (destination) gain.connect(destination);
    } else if (destination) {
      osc.connect(destination);
    }

    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * High-frequency scamper / rustle noise burst (7,500 Hz - 14,000 Hz)
   * Simulates claws on flooring or dry leaves, a powerful predatory stimulus.
   * @private
   */
  _playCrinkleScurry(t, destination, duration = 0.09) {
    if (!this.ctx.createBuffer || !this.ctx.createBufferSource) return;

    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      if (bufferSize <= 0) return;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Procedural high-transient noise with micro-envelope pulses
      for (let i = 0; i < bufferSize; i++) {
        const envelope = 1 - (i / bufferSize);
        const microFlutter = (i % 80 < 40) ? 1.0 : 0.3;
        data[i] = (Math.random() * 2 - 1) * envelope * microFlutter;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      // High-pass filter focused on feline spectrum (8,000 Hz)
      let filter = null;
      if (this.ctx.createBiquadFilter) {
        filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(9500, t);
        filter.Q.setValueAtTime(1.8, t);
      }

      const gain = this.ctx.createGain ? this.ctx.createGain() : null;
      if (gain && gain.gain && gain.gain.setValueAtTime) {
        gain.gain.setValueAtTime(0.4 * this.volume, t);
        if (gain.gain.linearRampToValueAtTime) {
          gain.gain.linearRampToValueAtTime(0.001, t + duration);
        }
      }

      if (filter && gain) {
        noiseSource.connect(filter);
        filter.connect(gain);
        if (destination) gain.connect(destination);
      } else if (destination) {
        noiseSource.connect(destination);
      }

      noiseSource.start(t);
      noiseSource.stop(t + duration);
    } catch (e) {}
  }

  /**
   * Insect Wing Stridulation & Clicks (9,500 Hz to 12,800 Hz)
   * @private
   */
  _playBugClick(t, destination) {
    if (!this.ctx.createOscillator) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain ? this.ctx.createGain() : null;

    if (osc.frequency && osc.frequency.setValueAtTime) {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(10200, t);
      if (osc.frequency.exponentialRampToValueAtTime) {
        osc.frequency.exponentialRampToValueAtTime(2400, t + 0.04);
      }
    }

    if (gain && gain.gain && gain.gain.setValueAtTime) {
      gain.gain.setValueAtTime(0.9, t);
      if (gain.gain.linearRampToValueAtTime) {
        gain.gain.linearRampToValueAtTime(0.001, t + 0.045);
      }
      osc.connect(gain);
      if (destination) gain.connect(destination);
    } else if (destination) {
      osc.connect(destination);
    }

    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Resonant Water Splash & Surface Tension Pop
   * @private
   */
  _playWaterSplash(t, destination) {
    if (!this.ctx.createOscillator) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain ? this.ctx.createGain() : null;

    if (osc.frequency && osc.frequency.setValueAtTime) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, t);
      if (osc.frequency.linearRampToValueAtTime) {
        osc.frequency.linearRampToValueAtTime(420, t + 0.16);
      }
    }

    if (gain && gain.gain && gain.gain.setValueAtTime) {
      gain.gain.setValueAtTime(0.85, t);
      if (gain.gain.linearRampToValueAtTime) {
        gain.gain.linearRampToValueAtTime(0.001, t + 0.2);
      }
      osc.connect(gain);
      if (destination) gain.connect(destination);
    } else if (destination) {
      osc.connect(destination);
    }

    osc.start(t);
    osc.stop(t + 0.22);
  }

  /**
   * Bird Chirrup / Laser Harmonic Chirp (7,800 Hz to 11,500 Hz)
   * @private
   */
  _playLaserChirp(t, destination) {
    if (!this.ctx.createOscillator) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain ? this.ctx.createGain() : null;

    if (osc.frequency && osc.frequency.setValueAtTime) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(7800, t);
      if (osc.frequency.exponentialRampToValueAtTime) {
        osc.frequency.exponentialRampToValueAtTime(11500, t + 0.04);
        osc.frequency.exponentialRampToValueAtTime(3200, t + 0.09);
      }
    }

    if (gain && gain.gain && gain.gain.setValueAtTime) {
      gain.gain.setValueAtTime(0.75, t);
      if (gain.gain.linearRampToValueAtTime) {
        gain.gain.linearRampToValueAtTime(0.001, t + 0.095);
      }
      osc.connect(gain);
      if (destination) gain.connect(destination);
    } else if (destination) {
      osc.connect(destination);
    }

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Helper to construct a StereoPannerNode for directional feline audio.
   * @private
   */
  _getPanner(panX = 0) {
    if (!this.ctx) return null;
    if (typeof this.ctx.createStereoPanner === 'function') {
      try {
        const panner = this.ctx.createStereoPanner();
        const clamped = Math.max(-1, Math.min(1, panX));
        if (panner.pan && panner.pan.setValueAtTime) {
          panner.pan.setValueAtTime(clamped, this.ctx.currentTime || 0);
        } else if (panner.pan) {
          panner.pan.value = clamped;
        }
        return panner;
      } catch (e) {}
    }
    return null;
  }

  /**
   * Plays realistic claw scamper / rustle sound as prey moves across the floor.
   * Stereo panned left-to-right to trigger feline directional pinnae rotation.
   * @param {string} preyType
   * @param {number} [panX=0] - Normalized [-1.0, 1.0] screen position
   */
  playPreyScurry(preyType, panX = 0) {
    if (this.isMuted || !this.ctx) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (now - this.lastScurryTime < 240) return; // Prevent audio clipping
    this.lastScurryTime = now;

    const t = this.ctx.currentTime || 0;
    const panner = this._getPanner(panX);
    let dest = this.ctx.destination;
    if (panner && dest) {
      try { panner.connect(dest); dest = panner; } catch (e) {}
    }

    if (preyType === 'mouse') {
      this._playCrinkleScurry(t, dest, 0.08);
    } else if (preyType === 'bug' || preyType === 'bee') {
      this._playBugClick(t, dest);
    } else if (preyType === 'koi') {
      this._playWaterSplash(t, dest);
    } else {
      this._playCrinkleScurry(t, dest, 0.05);
    }
  }

  /**
   * 12-Second Idle Acoustic Lure:
   * Multi-phase biological lure designed to break feline disinterest:
   * 1. Vigorous dry leaves / cardboard claw scratching rustle (0-150ms)
   * 2. Natural FM rodent distress chitter with vibrato (6.2 kHz -> 10.5 kHz -> 7.4 kHz)
   * 3. Directional scampering footsteps across the stereo speakers
   */
  triggerAcousticLure(panX = 0) {
    if (this.isMuted) return;
    this.lureTriggeredCount++;

    if (!this.ctx) return;
    const t = this.ctx.currentTime || 0;
    const panner = this._getPanner(panX);
    let dest = this.ctx.destination;
    if (panner && dest) {
      try { panner.connect(dest); dest = panner; } catch (e) {}
    }

    // Phase 1: High-transient claw scratching on wood/cardboard (immediately draws ears)
    this._playCrinkleScurry(t, dest, 0.16);

    // Phase 2: Natural FM Rodent Distress Squeak with Organic Vibrato
    if (this.ctx.createOscillator) {
      try {
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain ? this.ctx.createGain() : null;

        if (osc1.frequency && osc1.frequency.setValueAtTime) {
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(6200, t + 0.04);
          if (osc1.frequency.linearRampToValueAtTime) {
            osc1.frequency.linearRampToValueAtTime(10500, t + 0.11);
            osc1.frequency.linearRampToValueAtTime(7400, t + 0.22);
          }
        }

        if (gain1 && gain1.gain && gain1.gain.setValueAtTime) {
          gain1.gain.setValueAtTime(0.01, t + 0.04);
          if (gain1.gain.linearRampToValueAtTime) {
            gain1.gain.linearRampToValueAtTime(0.75 * this.volume, t + 0.08);
            gain1.gain.linearRampToValueAtTime(0.001, t + 0.24);
          }
          osc1.connect(gain1);
          if (dest) gain1.connect(dest);
        } else if (dest) {
          osc1.connect(dest);
        }

        osc1.start(t + 0.04);
        osc1.stop(t + 0.25);
      } catch (e) {}

      // Phase 3: Secondary quick scamper rustle as prey scurries into cover
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        const t2 = this.ctx.currentTime || 0;
        this._playCrinkleScurry(t2, dest, 0.12);
      }, 260);
    }
  }

  /**
   * Session End Treat Chime: Ascending C5-E5-G5 Triad
   */
  playTreatChime() {
    if (this.isMuted) return;
    this.chimePlayed = true;

    if (!this.ctx || !this.ctx.createOscillator) return;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const baseTime = this.ctx.currentTime || 0;

    notes.forEach((freq, idx) => {
      const noteTime = baseTime + idx * 0.15;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain ? this.ctx.createGain() : null;

      if (osc.frequency && osc.frequency.setValueAtTime) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);
      }

      if (gain && gain.gain && gain.gain.setValueAtTime) {
        gain.gain.setValueAtTime(0.01, noteTime);
        if (gain.gain.linearRampToValueAtTime) {
          gain.gain.linearRampToValueAtTime(0.7 * this.volume, noteTime + 0.04);
          gain.gain.linearRampToValueAtTime(0.001, noteTime + 0.35);
        }
        osc.connect(gain);
        if (this.ctx.destination) gain.connect(this.ctx.destination);
      } else if (this.ctx.destination) {
        osc.connect(this.ctx.destination);
      }

      osc.start(noteTime);
      osc.stop(noteTime + 0.38);
    });
  }

  getContextState() {
    return this.ctx ? this.ctx.state : 'closed';
  }

  wasLureTriggeredRecently() {
    return this.lureTriggeredCount > 0;
  }

  resetLureTrigger() {
    this.lureTriggeredCount = 0;
  }
}

export default SoundSynthesizer;

// -------------------------------------------------------------
// Universal Global & Module Exports
// -------------------------------------------------------------
if (typeof globalThis !== 'undefined') {
  globalThis.PawPlayAudio = SoundSynthesizer;
}
if (typeof window !== 'undefined') {
  window.PawPlayAudio = SoundSynthesizer;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SoundSynthesizer
  };
}
