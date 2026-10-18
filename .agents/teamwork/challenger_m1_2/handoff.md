# Milestone 1 Challenger Handoff Report: Core Engine Performance & Memory

**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

Direct empirical observations from inspecting `/Users/buianhuy/.gemini/antigravity/scratch/pawplay/src/engine.js` and executing `/Users/buianhuy/.gemini/antigravity/scratch/pawplay/tests/engine_stress_benchmark.mjs`:

### A. High-Volume Bursts & Auto-Pruning (Passed)
1. **Burst Scale**: Running 200 `spawnBurst(x, y)` calls and 800 `addRipple(x, y)` calls generated:
   - `engine.shockwaves.length === 200`
   - `engine.particles.length === 3600` (18 particles × 200 bursts)
   - `engine.ripples.length === 30` (strictly capped by pool limit at line 504: `if (this.ripples.length >= 30) this.ripples.shift();`)
   - Completed in 2.97ms with zero NaN or non-finite coordinates.
2. **Auto-Pruning Timers**: Advancing simulation clock via `engine.update(dt)`:
   - At $t = 0.36\text{s}$ ($> 0.300\text{s}$ lifetime), `engine.shockwaves.length` dropped to `0`.
   - At $t = 0.57\text{s}$ ($> 0.450\text{s}$ lifetime), `engine.particles.length` dropped to `0`.
   - At $t = 1.54\text{s}$ ($> 1.350\text{s}$ lifetime), `engine.ripples.length` dropped to `0`.
   - Continuous 1200-frame test with sustained bursts reached a steady-state equilibrium of ~100 particles, decaying to `0` upon burst cessation.

### B. V8 Heap Profiling & Memory Stability (Passed)
3. Running 100 cycles of 100 bursts (10,000 total bursts / 180,000 particles allocated and destroyed) under Node.js V8 heap tracking (`--expose-gc`):
   - Initial Heap: `3.80 MB`
   - Final Heap after complete entity expiration and GC: `3.82 MB`
   - Net Heap Delta: `+0.02 MB` ($< 0.025\text{MB}$ delta across 180k objects).
   - Confirms that particle, shockwave, and ripple objects are reclaimed by V8 without unreferenced memory retention.

### C. Rapid Canvas Resizing & Transform Matrix Stability (Passed)
4. Running 500 rapid resize iterations across resolutions ($320\times 480$ to $3840\times 2160$) and DPR values ($1.0$ to $4.0$):
   - DPR is strictly clamped to $[1.0, 2.0]$ via line 205: `Math.min(Math.max(1, rawDpr || 1), MAX_DPR)`.
   - Canvas backing store dimensions match `Math.round(cssW * dpr)`.
   - Context 2D affine matrix is set via line 227: `this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)`.
   - Across all 500 iterations, matrix remained $[dpr, 0, 0, dpr, 0, 0]$ with zero shear ($b=0, c=0$) and zero translation drift ($e=0, f=0$).
   - Post-render context state was restored with `ctx.globalAlpha === 1.0`.

### D. Rapid Theme Switching Under Active FX (Passed)
5. 1000 rapid theme switches between `'daylight'`, `'floor'`, `'night'`, and `'pond'` while active particles and ripples animated:
   - Completed in 5.22ms with zero unhandled exceptions.
   - Post-render `globalAlpha` remained `1.0`.
   - Invalid inputs (`null`, `undefined`, `'invalid'`) were safely rejected without mutating active theme state.

### E. Kinematic Safe Margin Repulsion (Passed)
6. Tested sprites diving at extreme velocities ($v = 12,000\text{ to }20,000\text{ px/s}$) directly into boundary margins across 120 integration steps:
   - Zero penetrations occurred beyond Top 72px, Bottom 72px, Sides 48px.

### F. Critical Implementation Defect 1: `orientationchange` Event Listener Leak (Failed)
7. In `/Users/buianhuy/.gemini/antigravity/scratch/pawplay/src/engine.js`, lines 185–189:
   ```javascript
   185:      if (typeof window.addEventListener === 'function') {
   186:        window.addEventListener('orientationchange', () => {
   187:          setTimeout(this.handleResize, 100);
   188:        });
   189:      }
   ```
   In lines 903–912 (`destroy()`):
   ```javascript
   903:  destroy() {
   904:    this.stop();
   905:    if (typeof window !== 'undefined') {
   906:      window.removeEventListener('resize', this.handleResize);
   907:    }
   908:    this.particles = [];
   909:    this.shockwaves = [];
   910:    this.ripples = [];
   911:    this.preyList = [];
   912:  }
   ```
   - **Audit Result**: Initial listeners = 0; after creating 50 instances = 50; after `destroy()` on all 50 instances = 50.
   - The anonymous arrow function registered to `orientationchange` is **never removed**. Because the callback captures `this.handleResize` (which binds `this`), the destroyed `Engine` instance, along with any attached canvas references, is pinned in memory by the global `window` object for the lifetime of the browser session.

### G. Critical Implementation Defect 2: Duplicate `start()` Concurrent rAF Loop & Orphaned Task (Failed)
8. In `/Users/buianhuy/.gemini/antigravity/scratch/pawplay/src/engine.js`, lines 279–320:
   `Engine.start()` contains no re-entrancy / idempotence guard (`if (this.isPlaying) return;`).
   - **Audit Result**:
     - Calling `engine.start()` schedules rAF loop 1 (`activeIds = 1`).
     - Calling `engine.start()` a second time schedules rAF loop 2 (`activeIds = 2`).
     - Calling `engine.stop()` invokes `cancelAnimationFrame(this.animationFrameId)`, which only cancels loop 2 (`activeIds = 1`).
     - Loop 1 is orphaned and continues executing `update()` and `render()` indefinitely in the background at 60/120Hz.

### H. Architectural Observation: Existing Test Suite Separation
9. In `/Users/buianhuy/.gemini/antigravity/scratch/pawplay/tests/suites/tier1_features.js`, lines 56 and 130 instantiate `ReferenceEngine` from `/Users/buianhuy/.gemini/antigravity/scratch/pawplay/tests/harness/contract_adapter.js`, rather than importing `src/engine.js`. The 156 passed tests in `tests/run_tests.js` were exercising the reference stub, not the production code.

---

## 2. Logic Chain

1. **Step 1 (Burst Handling & Auto-Pruning)**:
   Observations 1 & 2 show that `spawnBurst` creates the exact specified particle and shockwave counts, and `addRipple` enforces a hard cap of 30 ripples to prevent memory exhaustion under high touch frequency. In addition, when simulation time advances past each entity's lifespan (0.30s for shockwaves, 0.45s for particles, 1.35s for ripples), backward array iteration correctly removes expired elements until all arrays reach exactly `0`.
2. **Step 2 (Memory Stability)**:
   Observation 3 shows that across 10,000 bursts and 180,000 allocated particle objects, V8 heap memory usage returns to within 0.02MB of its initial baseline after garbage collection. This demonstrates that particle and ripple objects do not retain lingering circular references or memory leaks.
3. **Step 3 (Render & Transform Matrix Integrity)**:
   Observations 4 & 5 verify that DPR clamping to $[1.0, 2.0]$, canvas backing store sizing, and context transformation matrix management via `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` are fully idempotent. The matrix does not drift, scale cumulatively, or shear across 500 resizes or 1000 theme switches.
4. **Step 4 (Root Cause of Listener Leak)**:
   Observation 7 demonstrates that while `resize` listeners are properly bound and unbound via `this.handleResize`, the `orientationchange` listener in `Engine.init()` is registered as an anonymous arrow function `() => setTimeout(this.handleResize, 100)`. Because it is an anonymous function, it cannot be passed to `removeEventListener`. In `Engine.destroy()`, there is no attempt to unbind `orientationchange`. Since `this.handleResize` binds the engine instance, the engine cannot be garbage collected.
5. **Step 5 (Root Cause of rAF Concurrency)**:
   Observation 8 demonstrates that `Engine.start()` unconditionally sets `this.lastTime = 0` and schedules `requestAnimationFrame(loop)`. If `start()` is invoked while `isPlaying === true`, multiple rAF loops run simultaneously, doubling physics integration frequency, causing frame-rate stutter, and preventing `stop()` from halting all loops.

---

## 3. Caveats

- **WebGL**: PawPlay uses 2D Canvas rendering per specifications. WebGL context loss/restoration was not evaluated as it is not part of the Milestone 1 architecture.
- **Browser File Protocol vs HTTP**: In local headless Chrome via DevTools MCP, ES module imports (`import()`) across `file://` URIs are blocked by CORS. The benchmark was executed in Node.js v26 with native ES module loading and full V8 heap statistics.

---

## 4. Conclusion

The core rendering engine, 120Hz normalization, high-DPI scaling, 3-tier margin repulsion, contrast themes, and particle/ripple allocation systems in `src/engine.js` are performant, mathematically sound, and robust under extreme burst loads.

However, two critical bugs require remediation before Milestone 1 can be approved:
1. **Memory Leak**: `orientationchange` listener on `window` is not detached in `destroy()`.
2. **Re-entrancy Bug**: `start()` lacks an idempotency check, spawning duplicate unkillable rAF loops if triggered more than once.

### Required Actions for Worker:
1. In `src/engine.js` constructor:
   Bind the orientation change handler:
   ```javascript
   this.handleOrientation = () => setTimeout(this.handleResize, 100);
   ```
2. In `init()` (around line 186):
   Use the bound handler:
   ```javascript
   window.removeEventListener('orientationchange', this.handleOrientation);
   window.addEventListener('orientationchange', this.handleOrientation);
   ```
3. In `destroy()` (around line 906):
   Remove the listener:
   ```javascript
   window.removeEventListener('orientationchange', this.handleOrientation);
   ```
4. In `start()` (around line 283):
   Add the re-entrancy guard:
   ```javascript
   if (this.isPlaying) return;
   ```

---

## 5. Verification Method

To independently verify all findings and confirm remediation:

1. **Run the Empirical Stress Benchmark Suite**:
   ```bash
   node --expose-gc tests/engine_stress_benchmark.mjs
   ```
   **Pass Criteria**:
   - All 9 benchmarks report `PASSED`.
   - Benchmark 6 reports `resize: 0 -> 50 -> 0` and `orientationchange: 0 -> 50 -> 0` with zero leaked listeners.
   - Benchmark 9 reports `Active rAF after 2nd start = 1` and `Active rAF after stop() = 0`.
   - Benchmark 7 reports V8 Heap Delta $< 1.0\text{ MB}$ over 10,000 bursts.

2. **Run the Full 4-Tier Regression Test Suite**:
   ```bash
   node tests/run_tests.js
   ```
   **Pass Criteria**: All 156 tests in Tiers 1–4 pass with 0 failures.
