# Milestone 1 Exploration Report: Safe Event Listener Detachment & Attachment Pattern

**Explorer**: `explorer_m1_iter2_1`  
**Roles**: Explorer, Investigator, Synthesist  
**Date**: 2026-10-18T10:12:00Z  
**Target File**: `src/engine.js`  
**Working Directory**: `/Users/buianhuy/.gemini/antigravity/scratch/pawplay/.agents/teamwork/explorer_m1_iter2_1/`

---

## 1. Observation

### A. Direct Code Observations in `src/engine.js`
1. In `src/engine.js`, lines 182–190:
   ```javascript
   182:    if (typeof window !== 'undefined') {
   183:      window.removeEventListener('resize', this.handleResize);
   184:      window.addEventListener('resize', this.handleResize);
   185:      if (typeof window.addEventListener === 'function') {
   186:        window.addEventListener('orientationchange', () => {
   187:          setTimeout(this.handleResize, 100);
   188:        });
   189:      }
   190:    }
   ```
   - Line 183 calls `window.removeEventListener` unconditionally without verifying `typeof window.removeEventListener === 'function'`.
   - Line 184 calls `window.addEventListener` unconditionally without verifying `typeof window.addEventListener === 'function'`.
   - Line 186 registers an anonymous arrow function `() => { setTimeout(this.handleResize, 100); }` to `'orientationchange'`. Because this is an anonymous closure, its reference is not stored on the instance and cannot be detached via `removeEventListener`.

2. In `src/engine.js`, lines 903–912:
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
   - Line 906 calls `window.removeEventListener` unconditionally without verifying `typeof window.removeEventListener === 'function'`.
   - The `'orientationchange'` listener registered at line 186 is never removed in `destroy()`.

3. In `src/engine.js`, lines 159–165 (Constructor):
   ```javascript
   159:    // Bound listeners for event cleanup
   160:    this.handleResize = this.resize.bind(this);
   161: 
   162:    if (this.canvas) {
   163:      this.init(this.canvas);
   164:    }
   ```
   - `this.handleResize` is bound at line 160.
   - There is no bound handler defined for orientation changes prior to calling `this.init(this.canvas)`.

### B. Empirical Error Reproduction in Headless Environment
4. Running the reproduction snippet in Node.js v26:
   ```bash
   node -e "
   const envMock = require('./tests/harness/environment_mock.js');
   envMock.setupMockEnvironment(globalThis);
   const { Engine } = require('./src/engine.js');
   const e = new Engine();
   e.init({ clientWidth: 1024, clientHeight: 768, getContext: () => ({ setTransform(){}, scale(){} }) });
   console.log('Engine init successful!');
   "
   ```
   **Output**:
   ```
   file:///Users/buianhuy/.gemini/antigravity/scratch/pawplay/src/engine.js:183
         window.removeEventListener('resize', this.handleResize);
                ^

   TypeError: window.removeEventListener is not a function
       at Engine.init (file:///Users/buianhuy/.gemini/antigravity/scratch/pawplay/src/engine.js:183:14)
   ```

5. Running `destroy()` in the same headless environment:
   ```bash
   node -e "
   const envMock = require('./tests/harness/environment_mock.js');
   envMock.setupMockEnvironment(globalThis);
   const { Engine } = require('./src/engine.js');
   const e = new Engine();
   e.destroy();
   "
   ```
   **Output**:
   ```
   file:///Users/buianhuy/.gemini/antigravity/scratch/pawplay/src/engine.js:906
         window.removeEventListener('resize', this.handleResize);
                ^

   TypeError: window.removeEventListener is not a function
       at Engine.destroy (file:///Users/buianhuy/.gemini/antigravity/scratch/pawplay/src/engine.js:906:14)
   ```

### C. Blast Radius Across Test Matrix
6. When `contract_adapter.ReferenceEngine` is mapped to `src/engine.js:Engine`, exactly 30 tests fail across Tiers 1 and 2:
   - **Tier 1 (15 test failures)**:
     - `TC-F01-1`, `TC-F01-2`, `TC-F01-3`, `TC-F01-4`, `TC-F01-5`
     - `TC-F02-1`, `TC-F02-2`, `TC-F02-3`, `TC-F02-4`, `TC-F02-5`
     - `TC-F08-1`, `TC-F08-2`, `TC-F08-3`, `TC-F08-4`, `TC-F08-5`
   - **Tier 2 (15 test failures)**:
     - `TC-B01-1`, `TC-B01-2`, `TC-B01-3`, `TC-B01-4`, `TC-B01-5`
     - `TC-B05-1`, `TC-B05-2`, `TC-B05-3`, `TC-B05-4`, `TC-B05-5`
     - `TC-B06-1`, `TC-B06-2`, `TC-B06-3`, `TC-B06-4`, `TC-B06-5`
   - In all 30 failures, the exact error is:
     `TypeError: window.removeEventListener is not a function`

### D. Empirical Listener Leak Audit (`tests/engine_stress_benchmark.mjs`)
7. Running `node tests/engine_stress_benchmark.mjs` (Benchmark 6: Adversarial Lifecycle & Event Listener Teardown Analysis):
   - Peak resize listeners: `50`, after destroy: `0` (clean)
   - Peak orientationchange listeners: `50`, after destroy: `50` (**50 leaked listeners**)
   - Verbatim audit discovery logged:
     `⚠️ DISCOVERY: orientationchange listeners are NOT cleaned up in Engine.destroy()!`
     `src/engine.js lines 186-188 binds anonymous arrow function to orientationchange without removing in destroy()!`

---

## 2. Logic Chain

1. **Root Cause Analysis (Observations 1, 2, 4, 5)**:
   In `tests/harness/environment_mock.js` line 397, `target.window = target` is set where `target = globalThis`. In Node.js, `globalThis` does not inherit from `EventTarget` and has no `addEventListener` or `removeEventListener` methods by default. Therefore, `typeof window !== 'undefined'` evaluates to `true`, but `typeof window.removeEventListener` evaluates to `'undefined'`.
   When `Engine.prototype.init` or `Engine.prototype.destroy` attempts to call `window.removeEventListener(...)`, V8 throws an uncatchable `TypeError: window.removeEventListener is not a function`.

2. **Test Suite Impact (Observation 6)**:
   All unit test suites in `tests/suites/tier1_features.js` and `tests/suites/tier2_boundaries.js` run in `environment_mock.js` and call `new ReferenceEngine().init(canvas)`. Because of the missing guard on line 183, every single test instantiating `Engine` terminates in error before executing assertions, causing 30 cascading failures.

3. **Memory Retention Mechanism (Observations 1, 2, 7)**:
   Line 186 registers an anonymous arrow function to `window.addEventListener('orientationchange', ...)`.
   Because:
   - The callback is anonymous, it cannot be passed to `window.removeEventListener`.
   - The closure captures `this.handleResize`, which retains `this` (`Engine` instance) and its attached `this.canvas`.
   - `destroy()` does not attempt to remove `'orientationchange'`.
   Every instantiated `Engine` remains permanently anchored to the global `window` object for the lifetime of the browser process, leaking memory on every lifecycle cycle.

4. **Idempotence and Safety Requirements (Observations 1, 3)**:
   To prevent duplicate registrations if `init()` is called multiple times on an instance:
   - `removeEventListener` must be invoked prior to `addEventListener` for both `'resize'` and `'orientationchange'`.
   - A dedicated bound method (`this.handleOrientation`) must be instantiated in the constructor before `if (this.canvas) this.init(this.canvas)` executes.
   - Any pending orientation timer (`this.orientationTimeoutId`) must be cancelled via `clearTimeout` in `destroy()` to eliminate dangling asynchronous callbacks on destroyed instances.

---

## 3. Caveats

- **Scope Boundary**: This investigation focuses strictly on the event listener lifecycle in `src/engine.js`. It does not modify source code directly (in compliance with the read-only Explorer boundary).
- **Other Gate Failure Items**: Additional fixes required for Milestone 1 approval (e.g. `NaN` coordinate sanitization in `applySafeMargins`, `start()` idempotency guard, and relocating `verify_m1.js`) are handled by companion explorer agents (`explorer_m1_iter2_2`, `explorer_m1_iter2_3`) and must be integrated alongside this listener blueprint by the worker.

---

## 4. Conclusion & Fix Blueprint

### Executive Assessment
The defect is fully identified and isolated to lines 159–161, 182–190, and 905–907 of `src/engine.js`. The solution requires a coordinated 3-point pattern:
1. Initialize `this.orientationTimeoutId = null` and bind `this.handleOrientation` in the constructor.
2. In `init()`, guard both `window.removeEventListener` and `window.addEventListener` with explicit `typeof ... === 'function'` checks, handling both `'resize'` and `'orientationchange'`.
3. In `destroy()`, guard `window.removeEventListener` with `typeof ... === 'function'`, unbind both `'resize'` and `'orientationchange'`, and clear `this.orientationTimeoutId`.

### Concrete Blueprint for Worker

#### Location 1: `src/engine.js` Constructor (Lines 159–165)
**Existing Code**:
```javascript
    // Bound listeners for event cleanup
    this.handleResize = this.resize.bind(this);

    if (this.canvas) {
      this.init(this.canvas);
    }
```
**Replacement Code**:
```javascript
    // Bound listeners for event cleanup
    this.orientationTimeoutId = null;
    this.handleResize = this.resize.bind(this);
    this.handleOrientation = () => {
      if (this.orientationTimeoutId) {
        clearTimeout(this.orientationTimeoutId);
      }
      this.orientationTimeoutId = setTimeout(() => {
        if (typeof this.handleResize === 'function') {
          this.handleResize();
        }
      }, 100);
    };

    if (this.canvas) {
      this.init(this.canvas);
    }
```

#### Location 2: `src/engine.js` `init()` Method (Lines 182–190)
**Existing Code**:
```javascript
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize);
      window.addEventListener('resize', this.handleResize);
      if (typeof window.addEventListener === 'function') {
        window.addEventListener('orientationchange', () => {
          setTimeout(this.handleResize, 100);
        });
      }
    }
```
**Replacement Code**:
```javascript
    if (typeof window !== 'undefined') {
      if (typeof window.removeEventListener === 'function') {
        window.removeEventListener('resize', this.handleResize);
        if (typeof this.handleOrientation === 'function') {
          window.removeEventListener('orientationchange', this.handleOrientation);
        }
      }
      if (typeof window.addEventListener === 'function') {
        window.addEventListener('resize', this.handleResize);
        if (typeof this.handleOrientation === 'function') {
          window.addEventListener('orientationchange', this.handleOrientation);
        }
      }
    }
```

#### Location 3: `src/engine.js` `destroy()` Method (Lines 905–907)
**Existing Code**:
```javascript
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize);
    }
```
**Replacement Code**:
```javascript
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('resize', this.handleResize);
      if (typeof this.handleOrientation === 'function') {
        window.removeEventListener('orientationchange', this.handleOrientation);
      }
    }
    if (this.orientationTimeoutId) {
      clearTimeout(this.orientationTimeoutId);
      this.orientationTimeoutId = null;
    }
```

---

## 5. Verification Method

To independently verify this pattern and ensure zero regressions:

### 1. Headless Mock Environment Test (Reproduction Fix Verification)
Verify that `Engine.init` and `Engine.destroy` execute without throwing `TypeError: window.removeEventListener is not a function`:
```bash
node -e "
const envMock = require('./tests/harness/environment_mock.js');
envMock.setupMockEnvironment(globalThis);
const { Engine } = require('./src/engine.js');
const e = new Engine();
e.init({ clientWidth: 1024, clientHeight: 768, getContext: () => ({ setTransform(){}, scale(){} }) });
e.destroy();
console.log('PASS: Headless Engine init and destroy executed cleanly without TypeError!');
"
```
**Expected Output**: `PASS: Headless Engine init and destroy executed cleanly without TypeError!` (exit code 0).

### 2. Tier 1 & Tier 2 Full Regression Unblock Verification
Verify that connecting `src/engine.js` to `contract_adapter.ReferenceEngine` resolves all 30 failing tests in Tiers 1 and 2:
```bash
node -e "
const envMock = require('./tests/harness/environment_mock.js');
envMock.setupMockEnvironment(globalThis);
const { Engine } = require('./src/engine.js');
const adapter = require('./tests/harness/contract_adapter.js');
adapter.ReferenceEngine = Engine;
const f = require('./tests/harness/test_framework.js');
require('./tests/suites/tier1_features.js');
require('./tests/suites/tier2_boundaries.js');
f.defaultRunner.run().then(r => {
  console.log('Tier 1 + Tier 2 with Production Engine:', { total: r.total, passed: r.passed, failed: r.failed });
  process.exit(r.failed === 0 ? 0 : 1);
});
"
```
**Expected Output**: `{ total: 115, passed: 115, failed: 0 }` (exit code 0).

### 3. Lifecycle Teardown & Listener Leak Audit (Benchmark 6)
Verify that Benchmark 6 reports 0 leaked listeners:
```bash
node tests/engine_stress_benchmark.mjs
```
**Pass Criteria**:
- `[Listener Audit] resize: before=0, peak=50, after=0`
- `[Listener Audit] orientationchange: before=0, peak=50, after=0`
- Zero memory leak warnings logged for `orientationchange`.

### 4. Edge Environment Matrix Assertion
Verify that `Engine` operates cleanly across 5 distinct runtime environments:
1. `window` is `undefined`
2. `window` is an empty object (`{}`)
3. `window` has only `addEventListener`
4. `window` has only `removeEventListener`
5. `window` is a full `EventTarget` mock with listener counting and multiple re-entrant `init()` calls
All 5 cases must complete with exit code 0.
