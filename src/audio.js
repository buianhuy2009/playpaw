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
   * 12-Second Idle Acoustic Lure:
   * Research-calibrated dual high-pip (9,800 Hz & 11,500 Hz) plus a rustle scamper transient
   * to immediately snap distracted feline attention back onto the screen.
   */
  triggerAcousticLure() {
    if (this.isMuted) return;
    this.lureTriggeredCount++;

    if (this.ctx && this.ctx.createOscillator) {
      const t = this.ctx.currentTime || 0;

      // Pip 1: 9,800 Hz chirp
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain ? this.ctx.createGain() : null;

      if (osc1.frequency && osc1.frequency.setValueAtTime) {
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(9800, t);
        if (osc1.frequency.linearRampToValueAtTime) {
          osc1.frequency.linearRampToValueAtTime(11500, t + 0.035);
          osc1.frequency.linearRampToValueAtTime(9200, t + 0.065);
        }
      }

      if (gain1 && gain1.gain && gain1.gain.setValueAtTime) {
        gain1.gain.setValueAtTime(0.65 * this.volume, t);
        if (gain1.gain.linearRampToValueAtTime) {
          gain1.gain.linearRampToValueAtTime(0.001, t + 0.07);
        }
        osc1.connect(gain1);
        if (this.ctx.destination) gain1.connect(this.ctx.destination);
      } else if (this.ctx.destination) {
        osc1.connect(this.ctx.destination);
      }

      osc1.start(t);
      osc1.stop(t + 0.07);

      // Pip 2: Follow-up 11,200 Hz pip at +0.09s
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        const t2 = this.ctx.currentTime || 0;
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain ? this.ctx.createGain() : null;

        if (osc2.frequency && osc2.frequency.setValueAtTime) {
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(11200, t2);
          if (osc2.frequency.linearRampToValueAtTime) {
            osc2.frequency.linearRampToValueAtTime(12800, t2 + 0.03);
          }
        }

        if (gain2 && gain2.gain && gain2.gain.setValueAtTime) {
          gain2.gain.setValueAtTime(0.55 * this.volume, t2);
          if (gain2.gain.linearRampToValueAtTime) {
            gain2.gain.linearRampToValueAtTime(0.001, t2 + 0.06);
          }
          osc2.connect(gain2);
          if (this.ctx.destination) gain2.connect(this.ctx.destination);
        } else if (this.ctx.destination) {
          osc2.connect(this.ctx.destination);
        }

        osc2.start(t2);
        osc2.stop(t2 + 0.06);

        // Rustle scurry immediately after chirp
        this._playCrinkleScurry(t2 + 0.02, this.ctx.destination, 0.1);
      }, 90);
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
