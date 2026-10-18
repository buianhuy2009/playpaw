/**
 * PawPlay Centralized Application State & Settings Persistence
 *
 * Implements:
 * - LocalStorage state management under key 'pawplay_state_v1'
 * - First-time onboarding tracking under key 'pawplay_onboarded_v1'
 * - Failsafe fallback on corrupted JSON or storage quota errors
 * - Reactive update propagation to listeners
 */

export const DEFAULT_SETTINGS = {
  prey: 'mouse',
  speed: 'hunter',
  size: 'normal',
  theme: 'daylight',
  count: 1,
  volume: 0.8,
  timerMode: 'unlimited',
  cameraTrigger: 'catch',
  haptics: 'strong',
  lureEnabled: true
};

export class AppState {
  /**
   * @param {Storage} [storageEngine] - Defaults to global localStorage
   */
  constructor(storageEngine) {
    this.storage = storageEngine || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.defaults = { ...DEFAULT_SETTINGS };
    this.state = { ...this.defaults };
    this.listeners = new Set();
    this.load();
  }

  /**
   * Loads settings from localStorage. Falls back to defaults safely on error.
   */
  load() {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem('pawplay_state_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.state = { ...this.defaults, ...parsed };
        }
      }
    } catch (e) {
      // JSON parse failure or storage security block: gracefully revert to defaults
      this.state = { ...this.defaults };
    }
  }

  /**
   * Saves current state to localStorage.
   */
  save() {
    if (!this.storage) return;
    try {
      this.storage.setItem('pawplay_state_v1', JSON.stringify(this.state));
    } catch (e) {}
  }

  /**
   * Returns specific key value or copy of full state object.
   * @param {string} [key]
   * @returns {*}
   */
  get(key) {
    return key ? this.state[key] : { ...this.state };
  }

  /**
   * Updates state with partial changes, persists to storage, and notifies listeners.
   * @param {object} partial
   * @returns {object} Updated state
   */
  update(partial) {
    if (!partial || typeof partial !== 'object') return this.state;
    this.state = { ...this.state, ...partial };
    this.save();
    this.listeners.forEach((fn) => {
      try { fn(this.state); } catch (e) {}
    });
    return this.state;
  }

  /**
   * Subscribes a listener callback to state changes.
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    return () => {};
  }

  /**
   * Checks whether the user has completed the first-time onboarding walkthrough.
   * @returns {boolean}
   */
  isOnboarded() {
    if (!this.storage) return false;
    try {
      return this.storage.getItem('pawplay_onboarded_v1') === 'true';
    } catch (e) {
      return false;
    }
  }

  /**
   * Sets onboarding status in localStorage.
   * @param {boolean} [flag=true]
   */
  setOnboarded(flag = true) {
    if (!this.storage) return;
    try {
      this.storage.setItem('pawplay_onboarded_v1', flag ? 'true' : 'false');
    } catch (e) {}
  }

  /**
   * Resets settings back to factory defaults.
   */
  resetToDefaults() {
    this.state = { ...this.defaults };
    this.save();
  }
}

export default AppState;

// -------------------------------------------------------------
// Universal Global & Module Exports
// -------------------------------------------------------------
if (typeof globalThis !== 'undefined') {
  globalThis.PawPlayState = AppState;
}
if (typeof window !== 'undefined') {
  window.PawPlayState = AppState;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AppState,
    DEFAULT_SETTINGS
  };
}
