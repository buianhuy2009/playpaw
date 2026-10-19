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
   * Authentic Trapped Bee / Housefly Buzz (190-250 Hz fundamental + wing flutter harmonics)
   * Simulates an insect trapped against glass or spinning on the floor.
   * @param {number} t - AudioContext current time
   * @param {AudioNode} destination - Destination or StereoPanner
   * @param {number} [duration=0.18] - Duration in seconds
   * @private
   */
  _playInsectBuzz(t, destination, duration = 0.18) {
    if (!this.ctx || !this.ctx.createOscillator) return;
    try {
      // 1. Thorax vibration (Sawtooth 205-245 Hz with micro-flutter FM)
      const osc = this.ctx.createOscillator();
      const oscHarmonic = this.ctx.createOscillator();
      const buzzGain = this.ctx.createGain ? this.ctx.createGain() : null;
      const buzzFilter = this.ctx.createBiquadFilter ? this.ctx.createBiquadFilter() : null;

      const baseFreq = 215 + (Math.random() - 0.5) * 30; // 200 - 230 Hz
      osc.type = 'sawtooth';
      if (osc.frequency && osc.frequency.setValueAtTime) {
        osc.frequency.setValueAtTime(baseFreq, t);
        if (osc.frequency.linearRampToValueAtTime) {
          osc.frequency.linearRampToValueAtTime(baseFreq + 35, t + duration * 0.4);
          osc.frequency.linearRampToValueAtTime(baseFreq - 15, t + duration * 0.8);
          osc.frequency.linearRampToValueAtTime(baseFreq + 10, t + duration);
        }
      }

      // Harmonic overtone for realistic buzzing resonance
      oscHarmonic.type = 'sawtooth';
      if (oscHarmonic.frequency && oscHarmonic.frequency.setValueAtTime) {
        oscHarmonic.frequency.setValueAtTime(baseFreq * 2, t);
        if (oscHarmonic.frequency.linearRampToValueAtTime) {
          oscHarmonic.frequency.linearRampToValueAtTime(baseFreq * 2 + 50, t + duration * 0.5);
        }
      }

      // Bandpass shaping for insect exoskeleton acoustics
      if (buzzFilter && buzzFilter.frequency && buzzFilter.frequency.setValueAtTime) {
        buzzFilter.type = 'bandpass';
        buzzFilter.frequency.setValueAtTime(950, t);
        buzzFilter.Q.setValueAtTime(1.8, t);
      }

      // Volume envelope with struggle bursts
      let outputNode = null;
      if (buzzGain && buzzGain.gain && buzzGain.gain.setValueAtTime) {
        buzzGain.gain.setValueAtTime(0.01, t);
        if (buzzGain.gain.linearRampToValueAtTime) {
          buzzGain.gain.linearRampToValueAtTime(0.65 * this.volume, t + 0.015);
          buzzGain.gain.linearRampToValueAtTime(0.50 * this.volume, t + duration * 0.7);
          buzzGain.gain.linearRampToValueAtTime(0.001, t + duration);
        }
        osc.connect(buzzGain);
        oscHarmonic.connect(buzzGain);
        outputNode = buzzGain;

        if (buzzFilter) {
          buzzGain.connect(buzzFilter);
          outputNode = buzzFilter;
        }
      } else {
        outputNode = destination;
        if (destination) {
          osc.connect(destination);
          oscHarmonic.connect(destination);
        }
      }

      if (outputNode && destination && outputNode !== destination) {
        outputNode.connect(destination);
      }

      osc.start(t);
      oscHarmonic.start(t);
      osc.stop(t + duration);
      oscHarmonic.stop(t + duration);

      // 2. High-frequency papery wing flutter against surface (3.5 kHz - 7.5 kHz)
      this._playCrinkleScurry(t, destination, duration * 0.75);
    } catch (e) {}
  }

  /**
   * Leaf Rustle / Crinkle sound when prey scurries or trembles under cover.
   * @param {number} t
   * @param {AudioNode} destination
   * @param {number} [duration=0.15]
   * @private
   */
  _playLeafRustle(t, destination, duration = 0.15) {
    if (!this.ctx || !this.ctx.createBuffer || !this.ctx.createBufferSource) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      if (bufferSize <= 0) return;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const envelope = Math.sin((i / bufferSize) * Math.PI);
        const rustlePulse = (i % 120 < 60) ? 1.0 : 0.4;
        data[i] = (Math.random() * 2 - 1) * envelope * rustlePulse;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const filter = this.ctx.createBiquadFilter ? this.ctx.createBiquadFilter() : null;
      if (filter && filter.frequency && filter.frequency.setValueAtTime) {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(5400, t);
        filter.Q.setValueAtTime(1.5, t);
      }

      const gain = this.ctx.createGain ? this.ctx.createGain() : null;
      if (gain && gain.gain && gain.gain.setValueAtTime) {
        gain.gain.setValueAtTime(0.45 * this.volume, t);
        if (gain.gain.linearRampToValueAtTime) {
          gain.gain.linearRampToValueAtTime(0.001, t + duration);
        }
      }

      if (filter && gain) {
        source.connect(filter);
        filter.connect(gain);
        if (destination) gain.connect(destination);
      } else if (destination) {
        source.connect(destination);
      }

      source.start(t);
      source.stop(t + duration);
    } catch (e) {}
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

    if (preyType === 'bee') {
      this._playInsectBuzz(t, dest, 0.22);
    } else if (preyType === 'bug') {
      this._playInsectBuzz(t, dest, 0.16);
      this._playBugClick(t, dest);
    } else if (preyType === 'mouse') {
      this._playCrinkleScurry(t, dest, 0.08);
    } else if (preyType === 'koi') {
      this._playWaterSplash(t, dest);
    } else {
      this._playCrinkleScurry(t, dest, 0.05);
    }
  }

  /**
   * Explicitly triggers an authentic insect wing buzz burst.
   * @param {number} [panX=0]
   * @param {number} [duration=0.2]
   */
  playInsectBuzz(panX = 0, duration = 0.2) {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime || 0;
    const panner = this._getPanner(panX);
    let dest = this.ctx.destination;
    if (panner && dest) {
      try { panner.connect(dest); dest = panner; } catch (e) {}
    }
    this._playInsectBuzz(t, dest, duration);
  }

  /**
   * Explicitly triggers an ambush cover leaf rustle sound.
   * @param {number} [panX=0]
   * @param {number} [duration=0.18]
   */
  playLeafRustle(panX = 0, duration = 0.18) {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime || 0;
    const panner = this._getPanner(panX);
    let dest = this.ctx.destination;
    if (panner && dest) {
      try { panner.connect(dest); dest = panner; } catch (e) {}
    }
    this._playLeafRustle(t, dest, duration);
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
