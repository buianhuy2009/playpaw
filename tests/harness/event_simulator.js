/**
 * PawPlay Event Simulator & Raycast Math Utilities
 * Dispatches touch/pointer events and performs geometric raycasting calculations.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PawPlayEventSimulator = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Distance from point P to line segment AB
   */
  function distPointToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      // A and B are the same point
      const rx = px - ax;
      const ry = py - ay;
      return Math.sqrt(rx * rx + ry * ry);
    }

    // Project vector AP onto AB
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = ax + t * dx;
    const projY = ay + t * dy;
    const diffX = px - projX;
    const diffY = py - projY;

    return Math.sqrt(diffX * diffX + diffY * diffY);
  }

  /**
   * Continuous line segment to circle intersection test with paw pad tolerance (+42px)
   */
  function checkRaycastHit(ax, ay, bx, by, circleX, circleY, circleRadius, padTolerance = 42) {
    const dist = distPointToSegment(circleX, circleY, ax, ay, bx, by);
    const effectiveRadius = circleRadius + padTolerance;
    return dist <= effectiveRadius;
  }

  /**
   * Sitting-paw filter state tracker
   */
  class SittingPawFilter {
    constructor(distanceThreshold = 12, timeThresholdMs = 400) {
      this.distanceThreshold = distanceThreshold;
      this.timeThresholdMs = timeThresholdMs;
      this.touches = new Map(); // pointerId -> { startX, startY, startTime, currentX, currentY, isResting }
    }

    touchDown(id, x, y, timeMs = Date.now()) {
      this.touches.set(id, {
        startX: x,
        startY: y,
        startTime: timeMs,
        currentX: x,
        currentY: y,
        isResting: false
      });
    }

    touchMove(id, x, y, timeMs = Date.now()) {
      const state = this.touches.get(id);
      if (!state) return;

      state.currentX = x;
      state.currentY = y;
      const elapsed = timeMs - state.startTime;
      const dx = x - state.startX;
      const dy = y - state.startY;
      const displacement = Math.sqrt(dx * dx + dy * dy);

      if (elapsed >= this.timeThresholdMs && displacement < this.distanceThreshold) {
        state.isResting = true;
      } else if (displacement >= this.distanceThreshold) {
        // Active movement resets resting state
        state.isResting = false;
        // Move starting anchor forward to permit future stationary detection
        state.startX = x;
        state.startY = y;
        state.startTime = timeMs;
      }
    }

    touchUp(id) {
      this.touches.delete(id);
    }

    isResting(id) {
      const state = this.touches.get(id);
      return state ? state.isResting : false;
    }
  }

  /**
   * Event Dispatchers
   */
  function createSyntheticPointerEvent(type, { x = 0, y = 0, pointerId = 1, pointerType = 'touch', buttons = 1 } = {}) {
    if (typeof PointerEvent !== 'undefined') {
      try {
        return new PointerEvent(type, {
          clientX: x,
          clientY: y,
          pointerId,
          pointerType,
          buttons,
          bubbles: true,
          cancelable: true
        });
      } catch (e) {
        // Fallback for mock environments
      }
    }
    // Generic event
    const event = {
      type,
      clientX: x,
      clientY: y,
      pointerId,
      pointerType,
      buttons,
      bubbles: true,
      cancelable: true,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() {}
    };
    return event;
  }

  function simulatePointerDown(element, x, y, pointerId = 1) {
    const evt = createSyntheticPointerEvent('pointerdown', { x, y, pointerId });
    if (element && element.dispatchEvent) element.dispatchEvent(evt);
    return evt;
  }

  function simulatePointerMove(element, x, y, pointerId = 1) {
    const evt = createSyntheticPointerEvent('pointermove', { x, y, pointerId });
    if (element && element.dispatchEvent) element.dispatchEvent(evt);
    return evt;
  }

  function simulatePointerUp(element, x, y, pointerId = 1) {
    const evt = createSyntheticPointerEvent('pointerup', { x, y, pointerId, buttons: 0 });
    if (element && element.dispatchEvent) element.dispatchEvent(evt);
    return evt;
  }

  function simulateSwipe(element, x1, y1, x2, y2, steps = 5, onStep = null) {
    simulatePointerDown(element, x1, y1, 1);
    const results = [{ x: x1, y: y1 }];
    if (onStep) onStep(x1, y1, 0);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const cx = x1 + (x2 - x1) * t;
      const cy = y1 + (y2 - y1) * t;
      simulatePointerMove(element, cx, cy, 1);
      results.push({ x: cx, y: cy });
      if (onStep) onStep(cx, cy, t);
    }

    simulatePointerUp(element, x2, y2, 1);
    return results;
  }

  function simulateVisibilityChange(doc, state = 'hidden') {
    Object.defineProperty(doc, 'visibilityState', { value: state, writable: true, configurable: true });
    Object.defineProperty(doc, 'hidden', { value: state === 'hidden', writable: true, configurable: true });
    let evt;
    try {
      evt = new Event('visibilitychange');
    } catch (e) {
      evt = { type: 'visibilitychange' };
    }
    if (doc.dispatchEvent) doc.dispatchEvent(evt);
    return evt;
  }

  function simulateBeforeUnload(win) {
    let evt;
    try {
      evt = new Event('beforeunload', { cancelable: true });
    } catch (e) {
      evt = {
        type: 'beforeunload',
        cancelable: true,
        returnValue: '',
        defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; }
      };
    }
    if (win.dispatchEvent) win.dispatchEvent(evt);
    return evt;
  }

  return {
    distPointToSegment,
    checkRaycastHit,
    SittingPawFilter,
    createSyntheticPointerEvent,
    simulatePointerDown,
    simulatePointerMove,
    simulatePointerUp,
    simulateSwipe,
    simulateVisibilityChange,
    simulateBeforeUnload
  };
});
