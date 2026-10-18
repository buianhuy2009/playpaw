# Handoff Report: applySafeMargins NaN Sanitization & Recovery Blueprint

**Agent**: `explorer_m1_iter2_2`  
**Role**: Explorer & Synthesizer  
**Date**: 2026-10-18T10:12:00Z  
**Target File**: `src/engine.js` (lines 79–93, 364–491)  
**Task**: Investigate and design a robust sanitization and recovery mechanism in `applySafeMargins(sprite, dt)` to eliminate margin bypass vulnerabilities caused by `NaN` or non-finite coordinates, velocities, and radius values.

---

## 1. Observation

### A. Root Cause in `src/engine.js`
In `/Users/buianhuy/.gemini/antigravity/scratch/pawplay/src/engine.js`, lines 364–382:
```javascript
364:   applySafeMargins(sprite, dt = 0.016) {
365:     if (!sprite) return;
366: 
367:     const width = this.width || this.logicalWidth || (this.canvas ? this.canvas.clientWidth : 1024);
368:     const height = this.height || this.logicalHeight || (this.canvas ? this.canvas.clientHeight : 768);
369: 
370:     const R = sprite.radius !== undefined ? sprite.radius : 32;
371:     const xMin = SAFE_MARGINS.SIDES + R;
372:     const xMax = width - SAFE_MARGINS.SIDES - R;
373:     const yMin = SAFE_MARGINS.TOP + R;
374:     const yMax = height - SAFE_MARGINS.BOTTOM - R;
...
382:     const clampedDt = Math.min(Math.max(0, dt || 0.016), MAX_DT);
```
And lines 476–491:
```javascript
476:     if (sprite.x < xMin) {
477:       sprite.x = xMin;
478:       if (sprite.vx < 0) sprite.vx = Math.abs(sprite.vx) * e;
479:     } else if (sprite.x > xMax) {
480:       sprite.x = xMax;
481:       if (sprite.vx > 0) sprite.vx = -Math.abs(sprite.vx) * e;
482:     }
483: 
484:     if (sprite.y < yMin) {
485:       sprite.y = yMin;
486:       if (sprite.vy < 0) sprite.vy = Math.abs(sprite.vy) * e;
487:     } else if (sprite.y > yMax) {
488:       sprite.y = yMax;
489:       if (sprite.vy > 0) sprite.vy = -Math.abs(sprite.vy) * e;
490:     }
```

### B. Empirical Defect Reproduction
1. **Adversarial NaN Radius Injection**:
   Executing the adversarial test command:
   ```bash
   node -e "
   const { Engine } = require('./src/engine.js');
   const e = new Engine();
   const s = { x: 10, y: 10, vx: -100, vy: -100, radius: NaN };
   e.applySafeMargins(s, 0.016);
   console.log('Clamped sprite:', s);
   if (s.x < 48 + 32 || s.y < 72 + 32 || isNaN(s.x) || isNaN(s.y)) {
     console.error('MARGIN VIOLATION DETECTED');
     process.exit(1);
   }
   "
   ```
   **Result**: Exited with code 1:
   ```
   Clamped sprite: { x: 10, y: 10, vx: -100, vy: -100, radius: NaN }
   MARGIN VIOLATION DETECTED
   ```
   Because `NaN !== undefined` is `true`, `R` is set to `NaN`. Consequently, `xMin = 48 + NaN = NaN` and `yMin = 72 + NaN = NaN`. The comparison `10 < NaN` evaluates to `false`. The sprite is not repelled or clamped, remaining inside the top 72px / side 48px dead zone.

2. **NaN Coordinate Ingestion**:
   Executing:
   ```bash
   node -e "
   const { Engine } = require('./src/engine.js');
   const e = new Engine();
   const s = { x: NaN, y: NaN, vx: 50, vy: 50, radius: 32 };
   e.applySafeMargins(s, 0.016);
   console.log('Clamped sprite:', s);
   "
   ```
   **Result**:
   ```
   Clamped sprite: { x: NaN, y: NaN, vx: 50, vy: 50, radius: 32 }
   ```
   `sprite.x` and `sprite.y` remain permanently `NaN`.

3. **`dt = 0` Coercion Bug**:
   In line 382: `const clampedDt = Math.min(Math.max(0, dt || 0.016), MAX_DT);`
   When `dt = 0`, `0 || 0.016` evaluates to `0.016`, forcing a 16ms delta step even when physics should be paused or evaluated with zero time delta.

4. **`getSafeBounds` in `src/engine.js:79–93`**:
   `export function getSafeBounds(width, height, radius = 32)` uses `const r = radius !== undefined ? radius : 32;`, exhibiting the exact same `NaN` poisoning pattern if an invalid radius is passed.

---

## 2. Logic Chain

1. **Failure of `undefined` Checks Against `NaN`**:
   JavaScript represents invalid arithmetic results as `NaN` (type `'number'`). Any condition checking `value !== undefined` evaluates to `true` when `value` is `NaN`. Thus, line 370 fails to fall back to the default radius of `32`.
2. **IEEE 754 NaN Poisoning of Safe Boundaries**:
   Because `SAFE_MARGINS.SIDES + NaN` produces `NaN`, `xMin`, `xMax`, `yMin`, and `yMax` all become `NaN`. In IEEE 754 floating-point semantics, any comparison involving `NaN` (`<`, `>`, `<=`, `>=`) evaluates unconditionally to `false`.
3. **Bypass of All Three Margin Defense Tiers**:
   - In **Tier 1** (Smooth Steering): `distL = sprite.x - xMin` evaluates to `NaN`. `distL < D_buf` evaluates to `false`. No inward steering acceleration is accumulated.
   - In **Tier 2** (Continuous Collision Detection): `xPred < xMin` evaluates to `false`. No swept line reflection occurs.
   - In **Tier 3** (Hard Clamping): `sprite.x < xMin` and `sprite.x > xMax` evaluate to `false`. No coordinate projection occurs.
   - As a result, any corrupted entity with `radius: NaN` or `x: NaN` completely bypasses the perimeter repulsion system and penetrates into OS gesture zones or browser tab margins.
4. **Necessary and Sufficient Defense**:
   - Replacing `sprite.radius !== undefined` with `Number.isFinite(sprite.radius) && sprite.radius > 0` guarantees that `R`, `xMin`, `xMax`, `yMin`, and `yMax` are always valid, finite real numbers.
   - Validating `Number.isFinite(sprite.x)` and `Number.isFinite(sprite.y)` ensures that if coordinates are corrupted (`NaN`, `Infinity`, `null`, `undefined`), they are safely recovered to the geometric center of the safe margin bounds:
     $$\text{safeCenterX} = \frac{x_{\min} + x_{\max}}{2}$$
     $$\text{safeCenterY} = \frac{y_{\min} + y_{\max}}{2}$$
   - Validating `Number.isFinite(sprite.vx)` and `Number.isFinite(sprite.vy)` and resetting velocity to `0` upon coordinate or velocity corruption halts runaway momentum.
   - Guarding `dt` via `(typeof dt === 'number' && Number.isFinite(dt) && dt >= 0) ? dt : 0.016` handles `dt = 0` correctly while rejecting `NaN` or negative time deltas.

---

## 3. Caveats

- **Scope Constraint**: As a read-only explorer agent, no direct modifications have been made to `src/engine.js`. The blueprint below must be applied by a worker agent.
- **Asymmetric Viewports**: If `xMin > xMax` or `yMin > yMax` occurs (e.g., in a tiny viewport where $W < 2 \times (\text{MARGIN\_SIDES} + R)$), the safe center formula falls back safely to $W / 2$ and $H / 2$.
- **Downstream Callers**: All entities in `this.preyList` pass through `applySafeMargins(prey, normalizedDt)` in `Engine.prototype.update` (line 640). Hardening `applySafeMargins` protects all prey agents and any custom sprite objects.

---

## 4. Conclusion

`applySafeMargins` must be updated with an explicit 5-point validation and recovery sequence:
1. Validate `sprite` object existence.
2. Validate viewport dimensions `width` and `height` to positive finite numbers.
3. Validate `sprite.radius` using `Number.isFinite(sprite.radius) && sprite.radius > 0`, defaulting to `32`.
4. Validate `sprite.x`, `sprite.y`, `sprite.vx`, `sprite.vy` with `Number.isFinite`. On corruption, reset position to `(safeCenterX, safeCenterY)` and velocities to `0`.
5. Normalize `dt` without falsy coercion.

### Implementation Blueprint for `src/engine.js`

#### A. Target 1: `applySafeMargins` (Replace lines 364–491 in `src/engine.js`)

```javascript
  /**
   * Applies 3-Tier Margin Repulsion Field to sprite with failsafe NaN/invalid sanitization:
   * Tier 1: Smooth Inward Steering Field (C1-Hermite smoothstep, D_buf=100px, A_max=7500, k_damp=12)
   * Tier 2: Continuous Collision Detection (CCD) Swept Integration
   * Tier 3: Absolute Failsafe Hard Clamping Projection (Top/Bottom 72px, Sides 48px)
   *
   * @param {Object} sprite - Entity with { x, y, vx, vy, radius }
   * @param {number} [dt=0.016] - Delta-time in seconds
   */
  applySafeMargins(sprite, dt = 0.016) {
    if (!sprite || typeof sprite !== 'object') return;

    // Viewport dimensions with strict positive finite checks
    const rawW = this.width || this.logicalWidth || (this.canvas ? this.canvas.clientWidth : 1024);
    const rawH = this.height || this.logicalHeight || (this.canvas ? this.canvas.clientHeight : 768);
    const width = (Number.isFinite(rawW) && rawW > 0) ? rawW : 1024;
    const height = (Number.isFinite(rawH) && rawH > 0) ? rawH : 768;

    // 1. Radius sanitization: ensure positive finite number; recover corrupted radius
    const DEFAULT_RADIUS = 32;
    if (!Number.isFinite(sprite.radius) || sprite.radius <= 0) {
      sprite.radius = DEFAULT_RADIUS;
    }
    const R = sprite.radius;

    // 2. Safe boundaries calculation
    const xMin = SAFE_MARGINS.SIDES + R;
    const xMax = width - SAFE_MARGINS.SIDES - R;
    const yMin = SAFE_MARGINS.TOP + R;
    const yMax = height - SAFE_MARGINS.BOTTOM - R;

    // 3. Compute geometric center of safe margins
    const safeCenterX = (xMin <= xMax) ? (xMin + xMax) / 2 : width / 2;
    const safeCenterY = (yMin <= yMax) ? (yMin + yMax) / 2 : height / 2;

    // 4. Validate and recover coordinates & velocities:
    // If coordinate is NaN or non-finite, reset safely to center of safe margins and halt velocity
    let positionCorrupted = false;
    if (!Number.isFinite(sprite.x)) {
      sprite.x = safeCenterX;
      positionCorrupted = true;
    }
    if (!Number.isFinite(sprite.y)) {
      sprite.y = safeCenterY;
      positionCorrupted = true;
    }
    if (positionCorrupted || !Number.isFinite(sprite.vx)) {
      sprite.vx = 0;
    }
    if (positionCorrupted || !Number.isFinite(sprite.vy)) {
      sprite.vy = 0;
    }

    // 5. Delta-time normalization: handle 0 correctly without falsy coercion, reject NaN/negative
    const validDt = (typeof dt === 'number' && Number.isFinite(dt) && dt >= 0) ? dt : 0.016;
    const clampedDt = Math.min(validDt, MAX_DT);

    const D_buf = MARGIN_CONFIG.BUFFER_DIST;
    const critBuf = MARGIN_CONFIG.CRITICAL_BUFFER;
    const A_max = MARGIN_CONFIG.MAX_STEER_ACCEL;
    const k_damp = MARGIN_CONFIG.DAMPING_RATE;
    const e = MARGIN_CONFIG.RESTITUTION;

    let ax = 0;
    let ay = 0;

    // -------------------------------------------------------------
    // TIER 1: Smooth Inward Steering Field
    // -------------------------------------------------------------
    // Left Boundary
    const distL = sprite.x - xMin;
    if (distL < D_buf) {
      const eta = Math.max(0, Math.min(1, 1 - distL / D_buf));
      const S = 3 * eta * eta - 2 * eta * eta * eta; // C1 Smoothstep
      const vToward = Math.max(0, -(sprite.vx || 0));
      ax += (A_max * S) + (k_damp * vToward * S);
    }

    // Right Boundary
    const distR = xMax - sprite.x;
    if (distR < D_buf) {
      const eta = Math.max(0, Math.min(1, 1 - distR / D_buf));
      const S = 3 * eta * eta - 2 * eta * eta * eta;
      const vToward = Math.max(0, sprite.vx || 0);
      ax -= (A_max * S) + (k_damp * vToward * S);
    }

    // Top Boundary
    const distT = sprite.y - yMin;
    if (distT < D_buf) {
      const eta = Math.max(0, Math.min(1, 1 - distT / D_buf));
      const S = 3 * eta * eta - 2 * eta * eta * eta;
      const vToward = Math.max(0, -(sprite.vy || 0));
      ay += (A_max * S) + (k_damp * vToward * S);
    }

    // Bottom Boundary
    const distB = yMax - sprite.y;
    if (distB < D_buf) {
      const eta = Math.max(0, Math.min(1, 1 - distB / D_buf));
      const S = 3 * eta * eta - 2 * eta * eta * eta;
      const vToward = Math.max(0, sprite.vy || 0);
      ay -= (A_max * S) + (k_damp * vToward * S);
    }

    sprite.vx = (sprite.vx || 0) + ax * clampedDt;
    sprite.vy = (sprite.vy || 0) + ay * clampedDt;

    // Critical proximity inward deflection: If moving outward within critical buffer, actively steer inward
    if (distL < critBuf && sprite.vx <= 0) {
      sprite.vx = Math.max(Math.abs(sprite.vx) * e, 100);
    }
    if (distR < critBuf && sprite.vx >= 0) {
      sprite.vx = -Math.max(Math.abs(sprite.vx) * e, 100);
    }
    if (distT < critBuf && sprite.vy <= 0) {
      sprite.vy = Math.max(Math.abs(sprite.vy) * e, 100);
    }
    if (distB < critBuf && sprite.vy >= 0) {
      sprite.vy = -Math.max(Math.abs(sprite.vy) * e, 100);
    }

    // -------------------------------------------------------------
    // TIER 2: Continuous Collision Detection (CCD) Swept Integration
    // -------------------------------------------------------------
    const xPred = sprite.x + sprite.vx * clampedDt;
    if (xPred < xMin && sprite.vx < 0) {
      const tHit = Math.max(0, (xMin - sprite.x) / sprite.vx);
      const tRem = Math.max(0, clampedDt - tHit);
      sprite.vx = Math.abs(sprite.vx) * e;
      sprite.x = xMin + sprite.vx * tRem;
    } else if (xPred > xMax && sprite.vx > 0) {
      const tHit = Math.max(0, (xMax - sprite.x) / sprite.vx);
      const tRem = Math.max(0, clampedDt - tHit);
      sprite.vx = -Math.abs(sprite.vx) * e;
      sprite.x = xMax + sprite.vx * tRem;
    }

    const yPred = sprite.y + sprite.vy * clampedDt;
    if (yPred < yMin && sprite.vy < 0) {
      const tHit = Math.max(0, (yMin - sprite.y) / sprite.vy);
      const tRem = Math.max(0, clampedDt - tHit);
      sprite.vy = Math.abs(sprite.vy) * e;
      sprite.y = yMin + sprite.vy * tRem;
    } else if (yPred > yMax && sprite.vy > 0) {
      const tHit = Math.max(0, (yMax - sprite.y) / sprite.vy);
      const tRem = Math.max(0, clampedDt - tHit);
      sprite.vy = -Math.abs(sprite.vy) * e;
      sprite.y = yMax + sprite.vy * tRem;
    }

    // -------------------------------------------------------------
    // TIER 3: Absolute Failsafe Hard Clamping Projection
    // Inviolable guarantee: sprite disc never penetrates dead zones
    // -------------------------------------------------------------
    if (sprite.x < xMin) {
      sprite.x = xMin;
      if (sprite.vx < 0) sprite.vx = Math.abs(sprite.vx) * e;
    } else if (sprite.x > xMax) {
      sprite.x = xMax;
      if (sprite.vx > 0) sprite.vx = -Math.abs(sprite.vx) * e;
    }

    if (sprite.y < yMin) {
      sprite.y = yMin;
      if (sprite.vy < 0) sprite.vy = Math.abs(sprite.vy) * e;
    } else if (sprite.y > yMax) {
      sprite.y = yMax;
      if (sprite.vy > 0) sprite.vy = -Math.abs(sprite.vy) * e;
    }

    // Final velocity sanity assurance
    if (!Number.isFinite(sprite.vx)) sprite.vx = 0;
    if (!Number.isFinite(sprite.vy)) sprite.vy = 0;
  }
```

#### B. Target 2: `getSafeBounds` (Replace lines 79–93 in `src/engine.js`)

```javascript
/**
 * Calculates active safe boundaries accounting for sprite visual radius.
 * @param {number} width - Logical canvas width
 * @param {number} height - Logical canvas height
 * @param {number} [radius=32] - Sprite visual radius
 * @returns {object} Safe boundary coordinates and safeArea rectangle
 */
export function getSafeBounds(width, height, radius = 32) {
  const r = (Number.isFinite(radius) && radius > 0) ? radius : 32;
  const w = (Number.isFinite(width) && width > 0) ? width : 1024;
  const h = (Number.isFinite(height) && height > 0) ? height : 768;
  return {
    xMin: SAFE_MARGINS.SIDES + r,
    xMax: w - SAFE_MARGINS.SIDES - r,
    yMin: SAFE_MARGINS.TOP + r,
    yMax: h - SAFE_MARGINS.BOTTOM - r,
    safeArea: {
      top: SAFE_MARGINS.TOP,
      bottom: h - SAFE_MARGINS.BOTTOM,
      left: SAFE_MARGINS.SIDES,
      right: w - SAFE_MARGINS.SIDES
    }
  };
}
```

---

## 5. Verification Method

To independently verify the implementation once applied:

### Verification Command 1: Adversarial NaN and Non-Finite Recovery Suite
Execute the following automated script against `src/engine.js`:
```bash
node -e "
const { Engine } = require('./src/engine.js');
const engine = new Engine();

const testCases = [
  { name: 'Adversarial NaN radius near margin', sprite: { x: 10, y: 10, vx: -100, vy: -100, radius: NaN } },
  { name: 'All coordinates NaN', sprite: { x: NaN, y: NaN, vx: NaN, vy: NaN, radius: NaN } },
  { name: 'Infinity coordinates', sprite: { x: Infinity, y: -Infinity, vx: Infinity, vy: -Infinity, radius: Infinity } },
  { name: 'Negative radius', sprite: { x: 500, y: 300, vx: 100, vy: 100, radius: -20 } },
  { name: 'Null and undefined properties', sprite: { x: null, y: undefined, vx: null, vy: undefined, radius: null } },
  { name: 'Zero delta-time (dt = 0)', sprite: { x: 500, y: 300, vx: 100, vy: 100, radius: 32 }, dt: 0 },
  { name: 'NaN delta-time (dt = NaN)', sprite: { x: 500, y: 300, vx: 100, vy: 100, radius: 32 }, dt: NaN }
];

for (const tc of testCases) {
  const s = { ...tc.sprite };
  engine.applySafeMargins(s, tc.dt);
  console.log('Test:', tc.name, '-> Result:', s);

  if (!Number.isFinite(s.x) || !Number.isFinite(s.y) || !Number.isFinite(s.vx) || !Number.isFinite(s.vy) || !Number.isFinite(s.radius)) {
    console.error('FAILED: Non-finite value in', tc.name);
    process.exit(1);
  }
  if (s.x < 48 + s.radius || s.x > 1024 - 48 - s.radius || s.y < 72 + s.radius || s.y > 768 - 72 - s.radius) {
    console.error('FAILED: Margin violation in', tc.name);
    process.exit(1);
  }
}
console.log('ALL 7 ADVERSARIAL RECOVERY TESTS PASSED!');
"
```
**Pass Criteria**:
- Output displays `ALL 7 ADVERSARIAL RECOVERY TESTS PASSED!` with exit code 0.
- All non-finite or `NaN` coordinate sprites are safely recovered to `x: 512, y: 384, vx: 0, vy: 0, radius: 32`.
- Out-of-bounds sprites with invalid radius are safely clamped to `x: 80, y: 104, radius: 32`.

### Verification Command 2: 500,000-Step Kinematic Stress & Hyper-Dart Verification
```bash
node -e "
const { Engine } = require('./src/engine.js');
const engine = new Engine();

const sprite = { x: 500, y: 400, vx: 500, vy: -500, radius: 32 };
let violations = 0;

for (let i = 0; i < 500000; i++) {
  sprite.vx += (Math.random() - 0.5) * 500;
  sprite.vy += (Math.random() - 0.5) * 500;
  sprite.vx = Math.max(-3000, Math.min(3000, sprite.vx));
  sprite.vy = Math.max(-3000, Math.min(3000, sprite.vy));

  const dt = 0.001 + Math.random() * 0.05;
  sprite.x += sprite.vx * dt;
  sprite.y += sprite.vy * dt;

  engine.applySafeMargins(sprite, dt);

  const minY = 72 + sprite.radius;
  const maxY = 768 - 72 - sprite.radius;
  const minX = 48 + sprite.radius;
  const maxX = 1024 - 48 - sprite.radius;

  if (sprite.x < minX - 1e-4 || sprite.x > maxX + 1e-4 ||
      sprite.y < minY - 1e-4 || sprite.y > maxY + 1e-4 ||
      !Number.isFinite(sprite.x) || !Number.isFinite(sprite.y)) {
    violations++;
  }
}
console.log('500k-step stress test violations:', violations);
process.exit(violations === 0 ? 0 : 1);
"
```
**Pass Criteria**: Output displays `500k-step stress test violations: 0` with exit code 0.
