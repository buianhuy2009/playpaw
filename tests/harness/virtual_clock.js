/**
 * PawPlay Deterministic Virtual Clock
 * Controls performance.now, Date.now, setTimeout, and rAF for discrete time-slice testing.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PawPlayVirtualClock = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  class VirtualClock {
    constructor() {
      this.currentTime = 1000000; // arbitrary stable starting baseline (ms)
      this.timers = new Map();
      this.rafCallbacks = new Map();
      this.nextTimerId = 1;
      this.nextRafId = 1;
      this.installed = false;
      this.realGlobals = {};
    }

    install(target = typeof globalThis !== 'undefined' ? globalThis : window) {
      if (this.installed) return;
      this.target = target;
      this.realGlobals = {
        DateNow: target.Date ? target.Date.now : null,
        performanceNow: target.performance ? target.performance.now.bind(target.performance) : null,
        setTimeout: target.setTimeout ? target.setTimeout.bind(target) : null,
        clearTimeout: target.clearTimeout ? target.clearTimeout.bind(target) : null,
        requestAnimationFrame: target.requestAnimationFrame ? target.requestAnimationFrame.bind(target) : null,
        cancelAnimationFrame: target.cancelAnimationFrame ? target.cancelAnimationFrame.bind(target) : null
      };

      if (!target.performance) {
        target.performance = {};
      }

      target.performance.now = () => this.currentTime;
      if (target.Date) {
        target.Date.now = () => Math.floor(this.currentTime);
      }

      target.setTimeout = (callback, delay = 0, ...args) => {
        const id = this.nextTimerId++;
        this.timers.set(id, {
          callback,
          dueTime: this.currentTime + Math.max(0, delay),
          args
        });
        return id;
      };

      target.clearTimeout = (id) => {
        this.timers.delete(id);
      };

      target.requestAnimationFrame = (callback) => {
        const id = this.nextRafId++;
        this.rafCallbacks.set(id, callback);
        return id;
      };

      target.cancelAnimationFrame = (id) => {
        this.rafCallbacks.delete(id);
      };

      this.installed = true;
    }

    uninstall() {
      if (!this.installed || !this.target) return;
      const t = this.target;
      if (this.realGlobals.performanceNow && t.performance) {
        t.performance.now = this.realGlobals.performanceNow;
      }
      if (this.realGlobals.DateNow && t.Date) {
        t.Date.now = this.realGlobals.DateNow;
      }
      if (this.realGlobals.setTimeout) t.setTimeout = this.realGlobals.setTimeout;
      if (this.realGlobals.clearTimeout) t.clearTimeout = this.realGlobals.clearTimeout;
      if (this.realGlobals.requestAnimationFrame) t.requestAnimationFrame = this.realGlobals.requestAnimationFrame;
      if (this.realGlobals.cancelAnimationFrame) t.cancelAnimationFrame = this.realGlobals.cancelAnimationFrame;

      this.timers.clear();
      this.rafCallbacks.clear();
      this.installed = false;
    }

    reset(startMs = 1000000) {
      this.currentTime = startMs;
      this.timers.clear();
      this.rafCallbacks.clear();
    }

    now() {
      return this.currentTime;
    }

    tickTime(ms) {
      const targetTime = this.currentTime + ms;
      this.currentTime = targetTime;

      // Execute due timers in order of dueTime
      const due = [];
      for (const [id, timer] of this.timers.entries()) {
        if (timer.dueTime <= targetTime) {
          due.push({ id, timer });
        }
      }

      due.sort((a, b) => a.timer.dueTime - b.timer.dueTime);
      for (const { id, timer } of due) {
        if (this.timers.has(id)) {
          this.timers.delete(id);
          try {
            timer.callback(...timer.args);
          } catch (e) {
            console.error('VirtualClock timer callback error:', e);
          }
        }
      }
    }

    stepFrame(dtSeconds = 1 / 60) {
      this.tickTime(dtSeconds * 1000);
      const callbacks = Array.from(this.rafCallbacks.values());
      this.rafCallbacks.clear();
      for (const cb of callbacks) {
        try {
          cb(this.currentTime);
        } catch (e) {
          console.error('VirtualClock rAF callback error:', e);
        }
      }
    }
  }

  return VirtualClock;
});
