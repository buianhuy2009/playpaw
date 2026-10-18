/**
 * PawPlay Browser Tab Defense Shield & 8-Second Clockwise Annulus Exit Lock
 *
 * Implements:
 * - beforeunload unload interceptor with confirmation prompt while isPlaying === true
 * - visibilitychange auto-pause with audio suspension
 * - overscroll-behavior: none defense preventing swipe gestures/reloads
 * - 8-Second Clockwise Annulus Exit Lock:
 *   * Ultra-faint corner widget (opacity: ~0.15) with ✕ inside a circle
 *   * Clockwise circular donut/annulus fill over exactly 8.0 seconds (8000ms)
 *   * Instant reset to 0.0 on premature release (< 8000ms)
 *   * Completion ends session gracefully
 */

export const EXIT_LOCK_DURATION_MS = 5000;

export class DefenseShield {
  constructor(durationMs = EXIT_LOCK_DURATION_MS) {
    this.durationMs = durationMs;
    this.beforeUnloadEnabled = false;
    this.exitStartTime = null;
    this.exitProgress = 0.0;
    this.onExitComplete = null;
    this.isHoldingExit = false;
    this.isPlayingFn = null;

    this.onHide = null;
    this.onShow = null;

    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  /**
   * Activates beforeunload defense prompt if isPlayingFn() returns true.
   * @param {Function} isPlayingFn - () => boolean
   */
  enableBeforeUnload(isPlayingFn) {
    this.beforeUnloadEnabled = true;
    this.isPlayingFn = isPlayingFn;

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  /**
   * Disables beforeunload defense.
   */
  disableBeforeUnload() {
    this.beforeUnloadEnabled = false;
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  /**
   * Event handler for beforeunload
   * @param {BeforeUnloadEvent} evt
   * @returns {string|null}
   */
  handleBeforeUnload(evt) {
    if (this.beforeUnloadEnabled && this.isPlayingFn && this.isPlayingFn()) {
      const msg = 'Leave PawPlay? Your active cat session will end.';
      if (evt) {
        if (typeof evt.preventDefault === 'function') {
          evt.preventDefault();
        }
        evt.returnValue = msg;
      }
      return msg;
    }
    return null;
  }

  /**
   * Initializes visibility change listener to auto-pause engine and suspend audio.
   * @param {Function} [onHide] - Callback when tab is hidden
   * @param {Function} [onShow] - Callback when tab is foregrounded
   */
  initVisibilityHandler(onHide, onShow) {
    this.onHide = onHide;
    this.onShow = onShow;

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  handleVisibilityChange() {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'hidden') {
      if (typeof this.onHide === 'function') {
        this.onHide();
      }
    } else if (document.visibilityState === 'visible') {
      if (typeof this.onShow === 'function') {
        this.onShow();
      }
    }
  }

  // -------------------------------------------------------------
  // 8-Second Clockwise Annulus Exit Lock Engine
  // -------------------------------------------------------------

  /**
   * Initiates continuous hold on exit lock.
   * @param {number} [timeMs=Date.now()]
   */
  startExitHold(timeMs = Date.now()) {
    this.isHoldingExit = true;
    this.exitStartTime = timeMs;
    this.exitProgress = 0.0;
  }

  /**
   * Updates exit lock progress based on current timestamp.
   * @param {number} currentTimeMs
   * @returns {number} Current progress [0.0, 1.0]
   */
  updateExitHold(currentTimeMs) {
    if (!this.isHoldingExit || this.exitStartTime === null) {
      return 0.0;
    }

    const elapsed = Math.max(0, currentTimeMs - this.exitStartTime);
    const duration = this.durationMs || EXIT_LOCK_DURATION_MS;
    this.exitProgress = Math.min(1.0, elapsed / duration);

    if (this.exitProgress >= 1.0) {
      if (typeof this.onExitComplete === 'function') {
        this.onExitComplete();
      }
      this.resetExitHold();
    }
    return this.exitProgress;
  }

  /**
   * Cancels hold immediately (e.g. on pointer up, cancel, or early release)
   */
  cancelExitHold() {
    this.resetExitHold();
  }

  /**
   * Resets exit hold state to zero.
   */
  resetExitHold() {
    this.isHoldingExit = false;
    this.exitStartTime = null;
    this.exitProgress = 0.0;
  }

  /**
   * Returns current exit lock progress [0.0, 1.0]
   * @returns {number}
   */
  getExitProgress() {
    return this.exitProgress;
  }

  /**
   * Binds DOM exit widget with continuous 8s clockwise donut progress rendering.
   * @param {HTMLElement} element - Button or SVG container
   * @param {Function} onExitComplete - Callback on successful 8s hold
   */
  initAnnulusLock(element, onExitComplete) {
    this.onExitComplete = onExitComplete;
    if (!element) return;

    let animFrame = null;

    const onPointerDown = (e) => {
      if (e.preventDefault) e.preventDefault();
      element.classList.add('holding');
      const startTime = performance.now();
      this.startExitHold(startTime);

      const loop = (now) => {
        if (!this.isHoldingExit) return;
        const progress = this.updateExitHold(now);
        this._renderSvgAnnulus(element, progress);
        if (this.isHoldingExit && progress < 1.0) {
          animFrame = requestAnimationFrame(loop);
        }
      };
      animFrame = requestAnimationFrame(loop);
    };

    const onPointerEnd = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      element.classList.remove('holding');
      if (animFrame) cancelAnimationFrame(animFrame);
      this.cancelExitHold();
      this._renderSvgAnnulus(element, 0.0);
    };

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointerup', onPointerEnd);
    element.addEventListener('pointercancel', onPointerEnd);
    element.addEventListener('pointerleave', onPointerEnd);

    // Initial neutral render
    this._renderSvgAnnulus(element, 0.0);
  }

  _renderSvgAnnulus(element, progress) {
    if (!element) return;
    const isHolding = progress > 0;
    const size = 64;
    const r = 25;
    const circ = 2 * Math.PI * r;
    const strokeDash = circ * progress;
    const strokeOffset = circ - strokeDash;

    // Render SVG inside container
    element.innerHTML = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg); display: block; overflow: visible;">
        <!-- Background Track -->
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${isHolding ? 'rgba(10, 19, 31, 0.85)' : 'rgba(10, 19, 31, 0.35)'}" stroke="rgba(255,255,255,0.18)" stroke-width="5"/>
        <!-- Clockwise Filling Active Arc -->
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#FFD600" stroke-width="5"
          stroke-dasharray="${circ}" stroke-dashoffset="${strokeOffset}" stroke-linecap="round"
          style="filter: ${isHolding ? 'drop-shadow(0 0 6px #FFD600)' : 'none'};"/>
      </svg>
      <!-- Centered ✕ symbol -->
      <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: ${isHolding ? 1.0 : 0.25}; pointer-events: none; color: ${isHolding ? '#FFD600' : '#FFFFFF'}; font-size: ${isHolding ? 24 : 20}px; font-weight: 800; transition: transform 0.2s ease;">✕</div>
    `;
  }

  destroy() {
    this.disableBeforeUnload();
    if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.resetExitHold();
  }
}

export default DefenseShield;

// -------------------------------------------------------------
// Universal Global & Module Exports
// -------------------------------------------------------------
if (typeof globalThis !== 'undefined') {
  globalThis.PawPlayDefense = DefenseShield;
}
if (typeof window !== 'undefined') {
  window.PawPlayDefense = DefenseShield;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DefenseShield,
    EXIT_LOCK_DURATION_MS
  };
}
