/**
 * PawPlay Feline Capacitive Touch Input Engine & Static Sitting-Paw Filter
 *
 * Implements:
 * - Multi-touch continuous pointer and touch tracking
 * - Line-segment raycast swipe detection (+42px paw pad tolerance)
 * - Static sitting-paw filter suppressing stationary resting paws (<12px over 400ms)
 * - Multi-finger concurrent tracking (tested up to 10 simultaneous touches)
 * - Automatic ripple triggers on pond theme
 */

export const PAW_PAD_TOLERANCE = 42;
export const RESTING_DISPLACEMENT_LIMIT = 12; // px
export const RESTING_TIME_LIMIT = 400; // ms

/**
 * Calculates perpendicular distance from point P to line segment AB.
 */
export function distPointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const rx = px - ax;
    const ry = py - ay;
    return Math.sqrt(rx * rx + ry * ry);
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;
  const diffX = px - projX;
  const diffY = py - projY;

  return Math.sqrt(diffX * diffX + diffY * diffY);
}

/**
 * Continuous line-segment to circle intersection test with paw pad tolerance (+42px)
 */
export function checkRaycastHit(ax, ay, bx, by, circleX, circleY, circleRadius, padTolerance = PAW_PAD_TOLERANCE) {
  const dist = distPointToSegment(circleX, circleY, ax, ay, bx, by);
  return dist <= (circleRadius + padTolerance);
}

/**
 * SittingPawFilter suppresses stationary touch contacts (cat resting chest or chin)
 * while allowing other active paws to swat freely.
 */
export class SittingPawFilter {
  /**
   * @param {number} [distanceThreshold=12]
   * @param {number} [timeThresholdMs=400]
   */
  constructor(distanceThreshold = RESTING_DISPLACEMENT_LIMIT, timeThresholdMs = RESTING_TIME_LIMIT) {
    this.distanceThreshold = distanceThreshold;
    this.timeThresholdMs = timeThresholdMs;
    // pointerId -> { startX, startY, startTime, currentX, currentY, isResting }
    this.touches = new Map();
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
    const entry = this.touches.get(id);
    if (!entry) {
      this.touchDown(id, x, y, timeMs);
      return;
    }

    entry.currentX = x;
    entry.currentY = y;

    const dx = x - entry.startX;
    const dy = y - entry.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const elapsed = timeMs - entry.startTime;

    if (entry.isResting) {
      // If previously resting, an active displacement >= threshold wakes up the paw
      if (dist >= this.distanceThreshold) {
        entry.isResting = false;
        entry.startX = x;
        entry.startY = y;
        entry.startTime = timeMs;
      }
    } else {
      if (elapsed >= this.timeThresholdMs) {
        if (dist < this.distanceThreshold) {
          entry.isResting = true;
        } else {
          // Paw moved significantly, update anchor
          entry.startX = x;
          entry.startY = y;
          entry.startTime = timeMs;
        }
      }
    }
  }

  touchUp(id) {
    this.touches.delete(id);
  }

  isResting(id) {
    const entry = this.touches.get(id);
    return Boolean(entry && entry.isResting);
  }

  clear() {
    this.touches.clear();
  }
}

/**
 * InputController manages multi-touch / pointer events, sitting paw filtering,
 * and raycast pounce dispatch.
 */
export class InputController {
  constructor() {
    this.filter = new SittingPawFilter(RESTING_DISPLACEMENT_LIMIT, RESTING_TIME_LIMIT);
    this.activeTouches = new Map(); // pointerId -> { x, y, time }
    this.canvas = null;
    this.onPounce = null; // (prevX, prevY, currX, currY, pointerId) => void
    this.onRipple = null; // (x, y) => void

    this._onPointerDown = this._handlePointerDown.bind(this);
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerUp = this._handlePointerUp.bind(this);
    this._onPointerCancel = this._handlePointerCancel.bind(this);
  }

  /**
   * Initializes input listeners on canvas element.
   * @param {HTMLCanvasElement} canvas
   * @param {Function} [onPounce] - (x1, y1, x2, y2, id) => void
   * @param {Function} [onRipple] - (x, y) => void
   * @returns {InputController}
   */
  init(canvas, onPounce, onRipple) {
    this.canvas = canvas;
    this.onPounce = onPounce || null;
    this.onRipple = onRipple || null;

    if (canvas && typeof canvas.addEventListener === 'function') {
      canvas.addEventListener('pointerdown', this._onPointerDown, { passive: false });
      canvas.addEventListener('pointermove', this._onPointerMove, { passive: false });
      canvas.addEventListener('pointerup', this._onPointerUp, { passive: false });
      canvas.addEventListener('pointercancel', this._onPointerCancel, { passive: false });

      // Fallback touch events for older mobile Safari engines
      canvas.addEventListener('touchstart', (e) => { e.preventDefault(); }, { passive: false });
      canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
    }
    return this;
  }

  /**
   * Direct manual touch simulation methods (used by E2E test harness)
   */
  touchDown(id, x, y, timeMs = Date.now()) {
    this.activeTouches.set(id, { x, y, time: timeMs });
    this.filter.touchDown(id, x, y, timeMs);
    if (this.onRipple) {
      this.onRipple(x, y);
    }
  }

  touchMove(id, x, y, timeMs = Date.now()) {
    const prev = this.activeTouches.get(id);
    this.filter.touchMove(id, x, y, timeMs);

    if (prev && !this.filter.isResting(id)) {
      if (this.onPounce) {
        this.onPounce(prev.x, prev.y, x, y, id);
      }
    }
    this.activeTouches.set(id, { x, y, time: timeMs });
  }

  touchUp(id) {
    this.activeTouches.delete(id);
    this.filter.touchUp(id);
  }

  isRestingPaw(id) {
    return this.filter.isResting(id);
  }

  // -------------------------------------------------------------
  // Private DOM Event Handlers
  // -------------------------------------------------------------
  _getCanvasCoords(e) {
    if (!this.canvas) return { x: e.clientX || 0, y: e.clientY || 0 };
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / (rect.width || 1);
    const scaleY = this.canvas.height / (rect.height || 1);
    return {
      x: (e.clientX - rect.left) * (this.canvas.clientWidth ? 1 : scaleX),
      y: (e.clientY - rect.top) * (this.canvas.clientHeight ? 1 : scaleY)
    };
  }

  _handlePointerDown(e) {
    if (e.preventDefault) e.preventDefault();
    const coords = this._getCanvasCoords(e);
    const timeMs = e.timeStamp ? (performance.timeOrigin + e.timeStamp) : Date.now();
    this.touchDown(e.pointerId || 1, coords.x, coords.y, timeMs);
  }

  _handlePointerMove(e) {
    if (e.preventDefault) e.preventDefault();
    const coords = this._getCanvasCoords(e);
    const timeMs = e.timeStamp ? (performance.timeOrigin + e.timeStamp) : Date.now();
    this.touchMove(e.pointerId || 1, coords.x, coords.y, timeMs);
  }

  _handlePointerUp(e) {
    if (e.preventDefault) e.preventDefault();
    this.touchUp(e.pointerId || 1);
  }

  _handlePointerCancel(e) {
    if (e.preventDefault) e.preventDefault();
    this.touchUp(e.pointerId || 1);
  }

  destroy() {
    if (this.canvas && typeof this.canvas.removeEventListener === 'function') {
      this.canvas.removeEventListener('pointerdown', this._onPointerDown);
      this.canvas.removeEventListener('pointermove', this._onPointerMove);
      this.canvas.removeEventListener('pointerup', this._onPointerUp);
      this.canvas.removeEventListener('pointercancel', this._onPointerCancel);
    }
    this.activeTouches.clear();
    this.filter.clear();
  }
}

export default InputController;

// -------------------------------------------------------------
// Universal Global & Module Exports
// -------------------------------------------------------------
if (typeof globalThis !== 'undefined') {
  globalThis.PawPlayInput = InputController;
  globalThis.SittingPawFilter = SittingPawFilter;
}
if (typeof window !== 'undefined') {
  window.PawPlayInput = InputController;
  window.SittingPawFilter = SittingPawFilter;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    InputController,
    SittingPawFilter,
    PAW_PAD_TOLERANCE,
    RESTING_DISPLACEMENT_LIMIT,
    RESTING_TIME_LIMIT,
    distPointToSegment,
    checkRaycastHit
  };
}
