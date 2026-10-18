/**
 * PawPlay Procedural Web Audio API Synthesizer & Feline Acoustic Lures
 *
 * Implements:
 * - Zero-latency procedural synthesis without external sound files
 * - FM Rodent Squeak (dual-oscillator FM 4800Hz -> 2600Hz -> 3900Hz over 110ms)
 * - Bandpass Bug Pulse (5200Hz bandpass white noise burst with 25ms percussive clicks)
 * - Resonant Water Splash (1200Hz -> 280Hz low-pass sweep + 600Hz -> 1400Hz droplet chirp)
 * - 12-Second Distracted Cat Idle Acoustic Lure (6500Hz 60ms high-pitch recall chirp)
 * - Session Completion Treat Chime (ascending C5-E5-G5 triad chime)
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
      masterGain.gain.setValueAtTime ? masterGain.gain.setValueAtTime(this.volume, t) : (masterGain.gain.value = this.volume);
      if (this.ctx.destination) {
        masterGain.connect(this.ctx.destination);
      }
    }

    // 1. Mouse: Dual-oscillator FM rodent sweep (4800 -> 2600 -> 3900 Hz over 110ms)
    if (preyType === 'mouse') {
      this._playRodentSqueak(t, masterGain);
    }
    // 2. Bug / Bee: Bandpass percussive pulse (5200Hz)
    else if (preyType === 'bug' || preyType === 'bee') {
      this._playBugClick(t, masterGain);
    }
    // 3. Koi: Resonant water splash
    else if (preyType === 'koi') {
      this._playWaterSplash(t, masterGain);
    }
    // 4. Laser: High-speed harmonic chirp
    else {
      this._playLaserChirp(t, masterGain);
    }

    // Android tactile haptic vibration
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([30, 20, 40]);
      } catch (e) {}
    }
  }

  /**
   * FM Rodent Squeak Generator
   * @private
   */
  _playRodentSqueak(t, destination) {
    if (!this.ctx.createOscillator) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain ? this.ctx.createGain() : null;

    if (osc.frequency && osc.frequency.setValueAtTime) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(4800, t);
      if (osc.frequency.linearRampToValueAtTime) {
        osc.frequency.linearRampToValueAtTime(2600, t + 0.06);
        osc.frequency.linearRampToValueAtTime(3900, t + 0.11);
      }
    }

    if (gain && gain.gain && gain.gain.setValueAtTime) {
      gain.gain.setValueAtTime(0.01, t);
      if (gain.gain.linearRampToValueAtTime) {
        gain.gain.linearRampToValueAtTime(0.85, t + 0.02);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.14);
      }
      osc.connect(gain);
      if (destination) gain.connect(destination);
    } else if (destination) {
      osc.connect(destination);
    }

    osc.start(t);
    osc.stop(t + 0.16);
  }

  /**
   * Bandpass Bug / Bee Click Generator
   * @private
   */
  _playBugClick(t, destination) {
    if (!this.ctx.createOscillator) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain ? this.ctx.createGain() : null;

    if (osc.frequency && osc.frequency.setValueAtTime) {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(5200, t);
      if (osc.frequency.exponentialRampToValueAtTime) {
        osc.frequency.exponentialRampToValueAtTime(1400, t + 0.04);
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
   * Resonant Water Splash Generator
   * @private
   */
  _playWaterSplash(t, destination) {
    if (!this.ctx.createOscillator) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain ? this.ctx.createGain() : null;

    if (osc.frequency && osc.frequency.setValueAtTime) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      if (osc.frequency.linearRampToValueAtTime) {
        osc.frequency.linearRampToValueAtTime(280, t + 0.15);
      }
    }

    if (gain && gain.gain && gain.gain.setValueAtTime) {
      gain.gain.setValueAtTime(0.8, t);
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
   * Laser Harmonic Energy Chirp
   * @private
   */
  _playLaserChirp(t, destination) {
    if (!this.ctx.createOscillator) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain ? this.ctx.createGain() : null;

    if (osc.frequency && osc.frequency.setValueAtTime) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2200, t);
      if (osc.frequency.exponentialRampToValueAtTime) {
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);
      }
    }

    if (gain && gain.gain && gain.gain.setValueAtTime) {
      gain.gain.setValueAtTime(0.7, t);
      if (gain.gain.linearRampToValueAtTime) {
        gain.gain.linearRampToValueAtTime(0.001, t + 0.09);
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
   * 12-Second Idle Acoustic Lure: high-pitch 6500Hz chirp to recall distracted cats
   */
  triggerAcousticLure() {
    if (this.isMuted) return;
    this.lureTriggeredCount++;

    if (this.ctx && this.ctx.createOscillator) {
      const t = this.ctx.currentTime || 0;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain ? this.ctx.createGain() : null;

      if (osc.frequency && osc.frequency.setValueAtTime) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(6500, t);
        if (osc.frequency.linearRampToValueAtTime) {
          osc.frequency.linearRampToValueAtTime(7200, t + 0.03);
          osc.frequency.linearRampToValueAtTime(6100, t + 0.06);
        }
      }

      if (gain && gain.gain && gain.gain.setValueAtTime) {
        gain.gain.setValueAtTime(0.6 * this.volume, t);
        if (gain.gain.linearRampToValueAtTime) {
          gain.gain.linearRampToValueAtTime(0.001, t + 0.07);
        }
        osc.connect(gain);
        if (this.ctx.destination) gain.connect(this.ctx.destination);
      } else if (this.ctx.destination) {
        osc.connect(this.ctx.destination);
      }

      osc.start(t);
      osc.stop(t + 0.07);
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
