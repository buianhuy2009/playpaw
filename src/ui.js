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
    title: 'Placement & Stability',
    iconType: 'tablet_flat',
    desc: 'Lay your tablet or phone flat on a rug or floor mat so it stays in place when your cat pounces.'
  },
  {
    step: 2,
    title: 'Lock the Screen',
    iconType: 'screen_lock',
    desc: 'Turn on Guided Access (Apple) or App Pinning (Android) so accidental paw swipes will not close the game.'
  },
  {
    step: 3,
    title: 'Cat-Friendly Sights & Sounds',
    iconType: 'cat_sights',
    desc: 'Cats see blue and yellow best. Fast prey and high-pitched chirps keep their hunting instincts engaged.'
  },
  {
    step: 4,
    title: 'Selfie Reaction Photos',
    iconType: 'pounce_cam',
    desc: 'Turn on the camera to capture fun photos whenever your cat catches prey. You can download them anytime!'
  },
  {
    step: 5,
    title: 'Reward with a Real Treat',
    iconType: 'real_treat',
    desc: 'When playtime is done, toss your cat a real crunchy treat or toy to reward their natural hunting drive!'
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
      this.elements.onboardingIcon.innerHTML = this._getStepIllustrationSvg(stepData.iconType);
    }

    if (this.elements.onboardingTitle) {
      this.elements.onboardingTitle.textContent = stepData.title;
    }
    if (this.elements.onboardingDesc) {
      this.elements.onboardingDesc.textContent = stepData.desc;
    }

    if (this.elements.onboardingNextBtn) {
      if (this.currentSlide === this.totalSlides - 1) {
        this.elements.onboardingNextBtn.textContent = 'Got It - Start Playing';
      } else {
        this.elements.onboardingNextBtn.textContent = 'Next >';
      }
    }

    if (this.elements.onboardingPrevBtn) {
      this.elements.onboardingPrevBtn.style.visibility = this.currentSlide === 0 ? 'hidden' : 'visible';
    }
  }

  _getStepIllustrationSvg(type) {
    switch (type) {
      case 'tablet_flat':
        return `<svg viewBox="0 0 160 100" width="160" height="100" style="display:block; margin:0 auto;">
          <rect x="10" y="10" width="140" height="80" rx="8" fill="#1E293B" stroke="#00E5FF" stroke-width="2"/>
          <rect x="18" y="18" width="124" height="64" rx="4" fill="#0A2239"/>
          <ellipse cx="65" cy="50" rx="14" ry="9" fill="#94A3B8"/>
          <circle cx="76" cy="48" r="3" fill="#F43F5E"/>
          <path d="M51 50 Q40 45 42 38" stroke="#F6E05E" stroke-width="2" fill="none"/>
          <ellipse cx="115" cy="55" rx="12" ry="16" fill="#F59E0B" opacity="0.9"/>
          <circle cx="108" cy="40" r="5" fill="#F59E0B"/>
          <circle cx="116" cy="38" r="5" fill="#F59E0B"/>
          <circle cx="124" cy="40" r="5" fill="#F59E0B"/>
        </svg>`;
      case 'screen_lock':
        return `<svg viewBox="0 0 160 100" width="160" height="100" style="display:block; margin:0 auto;">
          <rect x="25" y="10" width="110" height="80" rx="8" fill="#1E293B" stroke="#64748B" stroke-width="2"/>
          <rect x="33" y="18" width="94" height="64" rx="4" fill="#0F172A"/>
          <rect x="68" y="44" width="24" height="20" rx="3" fill="#FFD600"/>
          <path d="M72 44 V36 A8 8 0 0 1 88 36 V44" stroke="#FFD600" stroke-width="3" fill="none"/>
          <circle cx="80" cy="53" r="2.5" fill="#0A2239"/>
        </svg>`;
      case 'cat_sights':
        return `<svg viewBox="0 0 160 100" width="160" height="100" style="display:block; margin:0 auto;">
          <rect x="15" y="10" width="130" height="80" rx="8" fill="#0A2239" stroke="#00E5FF" stroke-width="1.5"/>
          <circle cx="45" cy="50" r="16" fill="rgba(0,229,255,0.25)"/>
          <circle cx="45" cy="50" r="9" fill="#FFD600"/>
          <circle cx="45" cy="50" r="4" fill="#FFFFFF"/>
          <ellipse cx="105" cy="50" rx="16" ry="10" fill="#1A110B"/>
          <ellipse cx="118" cy="50" rx="5" ry="6" fill="#0D0805"/>
          <path d="M123 48 Q135 44 140 40 M123 52 Q135 56 140 60" stroke="#FFD600" stroke-width="1.5" fill="none"/>
        </svg>`;
      case 'pounce_cam':
        return `<svg viewBox="0 0 160 100" width="160" height="100" style="display:block; margin:0 auto;">
          <rect x="15" y="10" width="130" height="80" rx="8" fill="#1E293B" stroke="#00E5FF" stroke-width="2"/>
          <rect x="22" y="17" width="116" height="66" rx="4" fill="#0B132B"/>
          <path d="M60 70 L65 48 L75 56 L85 56 L95 48 L100 70 Z" fill="#F59E0B"/>
          <polygon points="63,50 72,55 60,38" fill="#F59E0B"/>
          <polygon points="97,50 88,55 100,38" fill="#F59E0B"/>
          <rect x="22" y="70" width="116" height="13" fill="rgba(0,229,255,0.85)"/>
          <text x="80" y="80" fill="#0A2239" font-size="8" font-weight="bold" font-family="sans-serif" text-anchor="middle">PAWPLAY CATCH</text>
        </svg>`;
      case 'real_treat':
      default:
        return `<svg viewBox="0 0 160 100" width="160" height="100" style="display:block; margin:0 auto;">
          <ellipse cx="80" cy="65" rx="45" ry="18" fill="#FFD600"/>
          <ellipse cx="80" cy="60" rx="42" ry="14" fill="#FFE066"/>
          <ellipse cx="70" cy="58" rx="8" ry="4" fill="#B45309"/>
          <ellipse cx="90" cy="57" rx="8" ry="4" fill="#B45309"/>
          <ellipse cx="80" cy="55" rx="7" ry="4" fill="#92400E"/>
          <polygon points="40,30 43,36 49,39 43,42 40,48 37,42 31,39 37,36" fill="#00E5FF"/>
          <polygon points="120,30 122,34 126,36 122,38 120,42 118,38 114,36 118,34" fill="#00E5FF"/>
        </svg>`;
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
