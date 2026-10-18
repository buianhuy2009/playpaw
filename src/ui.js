/**
 * PawPlay UI Controller, Onboarding Carousel & Customization Deck
 *
 * Implements:
 * - 5-Step First-Time Fullscreen Onboarding Walkthrough Carousel:
 *   Step 1: Stability (mats/cases)
 *   Step 2: Tab Defense Shield (iOS Guided Access / PWA Add to Home Screen)
 *   Step 3: Feline Vision & Acoustics (high-contrast yellow/blue vision & 12s lure)
 *   Step 4: Pounce-Cam (human camera toggle for instant reaction snapshots)
 *   Step 5: Complete the Hunt (crucial real treat reminder)
 * - Customization Deck: Prey selection, count (1–4), speeds, sizes, volume, timers
 * - Anti-Frustration "Complete the Hunt" Treat Reward Modal
 * - Screen Wake Lock API integration
 * - Session Timer (1m, 3m, 5m, Unlimited)
 */

export const ONBOARDING_STEPS = [
  {
    step: 1,
    title: '🐾 Cat-Proofing & Stability',
    icon: '📱',
    desc: 'Place your phone or tablet on a non-slip rug, silicone mat, or protective case so active predatory pounces do not slide the device across the floor.'
  },
  {
    step: 2,
    title: '🛡️ Browser Tab Defense Shield',
    icon: '🔒',
    desc: 'Cat paws swat everywhere! PawPlay features built-in unload protection. For 100% cat-proofing, enable iOS Guided Access (triple-click power button) or Add to Home Screen (PWA).'
  },
  {
    step: 3,
    title: '👁️ Dichromatic Feline Vision',
    icon: '🎨',
    desc: 'Cats lack red cones but excel at detecting high-frequency motion in blue and yellow spectrums. PawPlay sprites and contrast themes are calibrated specifically for feline ocular perception.'
  },
  {
    step: 4,
    title: '📸 "Pounce-Cam" Reaction Snapshots',
    icon: '📷',
    desc: 'Enable the optional front-facing camera to capture hilarious mid-air pounce reactions with retro timestamps saved securely to your private device gallery.'
  },
  {
    step: 5,
    title: '🍖 Complete the Hunt!',
    icon: '🥩',
    desc: 'Always toss your cat a real physical treat or crinkle toy when session ends. Catching virtual prey without tactile reward can cause predatory frustration!'
  }
];

export class UIController {
  /**
   * @param {AppState} appState
   * @param {object} [elements] - Optional DOM element references
   */
  constructor(appState, elements = {}) {
    this.state = appState;
    this.elements = elements;

    this.currentSlide = 0;
    this.totalSlides = 5;
    this.sessionDurationMinutes = 0; // 0 = unlimited
    this.remainingSeconds = 0;
    this.wakeLock = null;
    this.onDone = null;

    this.isSettingsOpen = false;
    this.isGuideOpen = false;
  }

  /**
   * Opens the 5-step onboarding walkthrough.
   * @param {Function} [onDone] - Callback upon completion
   */
  showOnboarding(onDone) {
    this.currentSlide = 0;
    this.onDone = onDone || null;
    this._renderOnboarding();
  }

  nextSlide() {
    if (this.currentSlide < this.totalSlides - 1) {
      this.currentSlide++;
      this._renderOnboarding();
    }
    return this.currentSlide;
  }

  prevSlide() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this._renderOnboarding();
    }
    return this.currentSlide;
  }

  finishOnboarding() {
    this.state.setOnboarded(true);
    if (this.elements.onboardingModal) {
      this.elements.onboardingModal.style.display = 'none';
    }
    if (typeof this.onDone === 'function') {
      this.onDone();
    }
  }

  /**
   * Sets option and saves to state.
   */
  setOption(key, val) {
    return this.state.update({ [key]: val });
  }

  getOptions() {
    return this.state.get();
  }

  /**
   * Starts a timed or unlimited game session and acquires Screen Wake Lock.
   * @param {string} [mode='unlimited'] - '1m' | '3m' | '5m' | 'unlimited'
   */
  startSession(mode = 'unlimited') {
    const modeToMinutes = { '1m': 1, '3m': 3, '5m': 5, 'unlimited': 0 };
    this.sessionDurationMinutes = modeToMinutes[mode] !== undefined ? modeToMinutes[mode] : 0;
    this.remainingSeconds = this.sessionDurationMinutes * 60;

    // Acquire Screen Wake Lock if available
    this._requestWakeLock();
  }

  /**
   * Ticks session timer by dt seconds. Returns true when session time expires.
   * @param {number} dtSeconds
   * @returns {boolean}
   */
  tickSession(dtSeconds) {
    if (this.sessionDurationMinutes > 0 && this.remainingSeconds > 0) {
      this.remainingSeconds = Math.max(0, this.remainingSeconds - dtSeconds);
      this._updateTimerHUD();
      return this.remainingSeconds === 0;
    }
    return false;
  }

  _updateTimerHUD() {
    if (!this.elements.timerDisplay) return;
    if (this.sessionDurationMinutes === 0) {
      this.elements.timerDisplay.textContent = '∞';
      return;
    }
    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = Math.floor(this.remainingSeconds % 60);
    this.elements.timerDisplay.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  async _requestWakeLock() {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) {}
    }
  }

  releaseWakeLock() {
    if (this.wakeLock && typeof this.wakeLock.release === 'function') {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
  }

  /**
   * Displays the Anti-Frustration "Complete the Hunt" Treat Modal.
   * @param {object} [stats]
   */
  showTreatModal(stats = {}) {
    this.releaseWakeLock();
    if (this.elements.treatModal) {
      this.elements.treatModal.style.display = 'flex';
      if (this.elements.treatScore) {
        this.elements.treatScore.textContent = stats.score || 0;
      }
    }
  }

  hideTreatModal() {
    if (this.elements.treatModal) {
      this.elements.treatModal.style.display = 'none';
    }
  }

  openSettings() {
    this.isSettingsOpen = true;
    if (this.elements.settingsModal) {
      this.elements.settingsModal.style.display = 'flex';
    }
  }

  closeSettings() {
    this.isSettingsOpen = false;
    if (this.elements.settingsModal) {
      this.elements.settingsModal.style.display = 'none';
    }
  }

  openGuideModal() {
    this.isGuideOpen = true;
    if (this.elements.guideModal) {
      this.elements.guideModal.style.display = 'flex';
    }
  }

  closeGuideModal() {
    this.isGuideOpen = false;
    if (this.elements.guideModal) {
      this.elements.guideModal.style.display = 'none';
    }
  }

  _renderOnboarding() {
    if (!this.elements.onboardingModal) return;
    this.elements.onboardingModal.style.display = 'flex';

    const stepData = ONBOARDING_STEPS[this.currentSlide];
    if (!stepData) return;

    if (this.elements.onboardingStep) {
      this.elements.onboardingStep.textContent = `Step ${this.currentSlide + 1} of ${this.totalSlides}`;
    }
    if (this.elements.onboardingIcon) {
      this.elements.onboardingIcon.textContent = stepData.icon;
    }
    if (this.elements.onboardingTitle) {
      this.elements.onboardingTitle.textContent = stepData.title;
    }
    if (this.elements.onboardingDesc) {
      this.elements.onboardingDesc.textContent = stepData.desc;
    }

    if (this.elements.onboardingNextBtn) {
      if (this.currentSlide === this.totalSlides - 1) {
        this.elements.onboardingNextBtn.textContent = "Got It — Let's Play! 🐾";
      } else {
        this.elements.onboardingNextBtn.textContent = 'Next →';
      }
    }

    if (this.elements.onboardingPrevBtn) {
      this.elements.onboardingPrevBtn.style.visibility = this.currentSlide === 0 ? 'hidden' : 'visible';
    }
  }
}

export default UIController;

// -------------------------------------------------------------
// Universal Global & Module Exports
// -------------------------------------------------------------
if (typeof globalThis !== 'undefined') {
  globalThis.PawPlayUI = UIController;
}
if (typeof window !== 'undefined') {
  window.PawPlayUI = UIController;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    UIController,
    ONBOARDING_STEPS
  };
}
