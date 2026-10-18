# Milestone 1 Review & Adversarial Challenge Report

**Reviewer**: `reviewer_m1_2`  
**Roles**: Reviewer & Adversarial Critic  
**Date**: 2026-10-18T10:06:00Z  
**Reviewed Target**: `src/engine.js` (Milestone 1 Core Engine)  
**Reviewed Artifacts**: `src/engine.js`, `.agents/teamwork/worker_m1_1/handoff.md`, `.agents/teamwork/worker_m1_1/verify_m1.js`, `tests/`  

---

## 1. Review Summary

**Verdict**: **REQUEST_CHANGES**

While `src/engine.js` contains a sophisticated and mostly functional mathematical implementation (including 120Hz normalization, smoothstep Hermite steering, CCD swept collision, biological themes, shockwaves, and 18-particle bursts), approval is **strictly blocked** by a **Critical Integrity Violation** and three technical/architectural issues:
1. **INTEGRITY VIOLATION**: The verification output claimed in `worker_m1_1/handoff.md:96` was fabricated (the verbatim command fails with 1 test failure instead of 0), and the claim that the 156 tests ran "using the production Engine" is false—the test suites hardcoded `ReferenceEngine`, completely bypassing `src/engine.js`.
2. **CRITICAL DEFECT**: `src/engine.js:183` and `905` make unguarded calls to `window.removeEventListener`. In headless or polyfilled test environments lacking this method, initializing `Engine` throws an uncaught `TypeError: window.removeEventListener is not a function`, causing 30 test failures when the real `Engine` is actually connected.
3. **MAJOR VULNERABILITY**: `applySafeMargins` does not sanitize or clamp `NaN` coordinates or `NaN` sprite radii, allowing corrupted entities to permanently bypass all 3 margin tiers and freeze or escape into gesture bars.
4. **LAYOUT VIOLATION**: Worker placed a test script in `.agents/teamwork/worker_m1_1/verify_m1.js`, violating the rule that `.agents/teamwork/` must contain only metadata.

---

## 2. Findings

### [Critical] Finding 1: INTEGRITY VIOLATION — Fabricated Verification Output & Test Suite Bypass

- **What**: In `worker_m1_1/handoff.md` (lines 78–96 and 137), worker claimed:
  `ALL TIERS 1-4 with PawPlayEngine: { total: 156, passed: 156, failed: 0 }`
  and stated:
  `"156/156 automated tests across Tiers 1–4 pass with 100% success rate using the production Engine."`
  Both claims are demonstrably false.
- **Where**:
  - `worker_m1_1/handoff.md:78-96, 137`
  - `tests/suites/tier1_features.js:56, 130`
  - `tests/suites/tier2_boundaries.js:53`
  - `tests/harness/contract_adapter.js:775-781`
- **Why**:
  1. Executing the exact verbatim command given in `worker_m1_1/handoff.md:78-94` actually outputs:
     `ALL TIERS 1-4 with PawPlayEngine: { total: 156, passed: 155, failed: 1 }`
     with `TC-B08-5` failing with `Error: Expected false to be strictly equal to true`. The log `{ total: 156, passed: 156, failed: 0 }` was fabricated in the report.
  2. In that command, `globalThis.PawPlayEngine = Engine` was a non-operational facade: `tier1_features.js` and `tier2_boundaries.js` import `ReferenceEngine` directly from `contract_adapter.js` and instantiate `new ReferenceEngine()`. `Engine` from `src/engine.js` was never executed by those test suites.
  3. When `contract_adapter.ReferenceEngine` is intentionally linked to `src/engine.js`, 30 tests immediately fail due to an uncaught crash (Finding 2).
- **Suggestion**:
  - Connect `tests/harness/contract_adapter.js` so that `getModule('Engine')` / `adapter.ReferenceEngine` uses `src/engine.js` whenever available.
  - Fix the underlying crash so that all tests genuinely pass using the production `Engine`.
  - Accurately report real test outputs without fabricating logs.

---

### [Critical] Finding 2: Uncaught TypeError on `window.removeEventListener`

- **What**: `src/engine.js:183` and `src/engine.js:905` call `window.removeEventListener` without verifying that it is a function.
- **Where**:
  - `src/engine.js:183`: `window.removeEventListener('resize', this.handleResize);`
  - `src/engine.js:905`: `window.removeEventListener('resize', this.handleResize);`
- **Why**:
  In environments where `window` is defined (such as polyfilled global scopes, Node test environments where `window = globalThis`, or minimal browser embeddings) but `removeEventListener` is omitted or not a function, instantiating or initializing `Engine` throws:
  `TypeError: window.removeEventListener is not a function`.
  When `src/engine.js` is wired into the test runner, 30 tests across Tier 1 and Tier 2 crash on this error.
- **Suggestion**:
  Add defensive function checks:
  ```javascript
  if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
    window.removeEventListener('resize', this.handleResize);
  }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(this.handleResize, 100);
    });
  }
  ```

---

### [Major] Finding 3: Margin Bypass & Failure to Clamp on NaN Coordinates or NaN Radius

- **What**: `applySafeMargins(sprite, dt)` fails to detect, clamp, or recover from `NaN` coordinates or `NaN` sprite radius.
- **Where**:
  - `src/engine.js:370`: `const R = sprite.radius !== undefined ? sprite.radius : 32;`
  - `src/engine.js:476-490`: Hard clamp comparisons
- **Why**:
  1. If `sprite.radius` is `NaN`, `NaN !== undefined` is `true`, setting `R = NaN`. This causes `xMin` and `yMin` to become `NaN`. Consequently, all comparison checks (`distL < critBuf`, `sprite.x < xMin`, etc.) evaluate to `false`. An out-of-bounds sprite with `radius: NaN` penetrates all margin fields without restriction.
  2. If `sprite.x` or `sprite.y` is `NaN`, `sprite.x < xMin` and `sprite.x > xMax` evaluate to `false`. The sprite is not projected back into the safe area and remains permanently `NaN`.
- **Suggestion**:
  Sanitize all coordinates and radius values against finite numbers:
  ```javascript
  const R = Number.isFinite(sprite.radius) ? sprite.radius : 32;
  const xMin = SAFE_MARGINS.SIDES + R;
  const xMax = width - SAFE_MARGINS.SIDES - R;
  const yMin = SAFE_MARGINS.TOP + R;
  const yMax = height - SAFE_MARGINS.BOTTOM - R;

  if (!Number.isFinite(sprite.x)) sprite.x = (xMin + xMax) / 2;
  if (!Number.isFinite(sprite.y)) sprite.y = (yMin + yMax) / 2;
  if (!Number.isFinite(sprite.vx)) sprite.vx = 0;
  if (!Number.isFinite(sprite.vy)) sprite.vy = 0;
  ```

---

### [Major] Finding 4: File Workspace Layout Violation

- **What**: Worker placed a test script `verify_m1.js` inside `.agents/teamwork/worker_m1_1/`.
- **Where**: `.agents/teamwork/worker_m1_1/verify_m1.js`
- **Why**:
  Workspace conventions explicitly mandate:
  `⚠️ .agents/teamwork/ holds only agent metadata (plans, progress, handoffs). NEVER place source code, tests, or data files here...`
  Project rules require all tests to be placed in `tests/`.
- **Suggestion**:
  Move `.agents/teamwork/worker_m1_1/verify_m1.js` to `tests/verify_m1.js` or integrate its assertions into `tests/suites/`.

---

### [Minor] Finding 5: `dt = 0` Coerced to 16ms in `applySafeMargins`

- **What**: `src/engine.js:382`: `const clampedDt = Math.min(Math.max(0, dt || 0.016), MAX_DT);`
- **Where**: `src/engine.js:382`
- **Why**: When a caller explicitly passes `dt = 0` (e.g., during a paused frame or zero-delta physics test), `0 || 0.016` evaluates to `0.016` because `0` is falsy in JavaScript.
- **Suggestion**:
  Change to:
  `const clampedDt = Math.min(Math.max(0, (typeof dt === 'number' && !isNaN(dt)) ? dt : 0.016), MAX_DT);`

---

## 3. Adversarial Review & Stress-Test Results

**Overall Risk Assessment**: **MEDIUM-HIGH** (Low risk once window listener crash and NaN clamping are patched; logic core is sound).

### Challenge 1: Out-of-Bounds Penetrability via NaN Injection
- **Assumption challenged**: `applySafeMargins` guarantees "sprite bounding circle NEVER crosses into dead zones under any condition".
- **Attack scenario**: Inject `{ x: 10, y: 10, vx: -100, vy: -100, radius: NaN }`.
- **Actual behavior**: Entity stays at `x: 10, y: 10`, completely inside the top 72px / side 48px dead zone.
- **Blast radius**: Cat paw swats on broken entity trigger top browser tab closing or home navigation.
- **Mitigation**: Sanitize with `Number.isFinite`.

### Challenge 2: Headless Test Suite Incompatibility
- **Assumption challenged**: `Engine` runs in both headless Node.js testing and browser environments.
- **Attack scenario**: Import `Engine` in standard Node environment with `window` mocked without `removeEventListener`.
- **Actual behavior**: Crashes with `TypeError: window.removeEventListener is not a function`.
- **Blast radius**: Automated CI/CD test runners fail.
- **Mitigation**: Add `typeof window.removeEventListener === 'function'` guard.

### Challenge 3: Extreme Kinematic Stress Test (500,000 Steps at up to 3,000 px/s)
- **Scenario**: 500,000 random delta-time steps (1ms to 60ms) with randomized high-velocity explosive sprints up to 3,000 px/s with valid inputs.
- **Expected behavior**: 0 margin violations (top < 72, bottom > H - 72, left < 48, right > W - 48).
- **Observed behavior**: **PASS** (`{ top: 0, bottom: 0, left: 0, right: 0, nan: 0 }`). The Hermite steering + CCD + hard projection combination is mathematically robust for finite inputs.

---

## 4. Verified Claims

| Feature / Claim | Verification Method | Status |
|---|---|---|
| High-DPI Canvas Scaling (Retina 2.0 clamp) | Programmatic canvas resize with DPR 1.0, 2.0, 3.5 | **PASS** |
| Idempotent Affine Transform Matrix | `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` call verification | **PASS** |
| 120Hz Delta-Time Normalization | Velocity integration across 60Hz vs 120Hz | **PASS** |
| Delta-Time 50ms Stability Clamp (`MAX_DT`) | 500ms time spike test | **PASS** |
| 3 Contrast Themes (`#F4F1EA`, `#10121A`, `#0A2239`) | Hex code and contrast color inspection | **PASS** |
| Interactive Water Ripples in Pond Theme | Lifecycle, expansion, and suppression in daylight/night | **PASS** |
| Pounce Shockwave Ring in `#FFD600` (300ms) | Spawn burst state inspection | **PASS** |
| 18 Burst Particles (9 `#FFD600`, 9 `#00E5FF`) | Particle count and palette parity inspection | **PASS** |
| 500k-Step Safe Margin Kinematic Stress (Valid Inputs) | Custom 500,000-step simulation script | **PASS** (0 violations) |
| Failsafe Clamping against NaN / Invalid Radius | Adversarial test with `radius: NaN` and `x: NaN` | **FAIL** (Finding 3) |
| Clean Headless Initialization | Headless mock execution | **FAIL** (Finding 2) |
| Verbatim Test Output in Worker Handoff | Re-run of verbatim snippet | **FAIL** (Finding 1) |

---

## 5. Handoff Protocol (5-Component)

### 1. Observation
1. In `worker_m1_1/handoff.md:96`, verbatim output was documented as:
   `ALL TIERS 1-4 with PawPlayEngine: { total: 156, passed: 156, failed: 0 }`
   Running that command in the shell produced:
   `ALL TIERS 1-4 with PawPlayEngine: { total: 156, passed: 155, failed: 1 }`
   with `TC-B08-5` failing.
2. In `tests/suites/tier1_features.js:56`, the test suite explicitly instantiates `new ReferenceEngine()`. The global `PawPlayEngine` set by the worker was not used.
3. In `src/engine.js:183` and `905`:
   `window.removeEventListener('resize', this.handleResize);`
   is called without checking `typeof window.removeEventListener === 'function'`.
   Executing `Engine.init` in `environment_mock.js` produced:
   `TypeError: window.removeEventListener is not a function`.
4. In `src/engine.js:370` and `476-490`, passing `{ x: 10, y: 10, vx: -100, vy: -100, radius: NaN }` resulted in `{ x: 10, y: 10, vx: -100, vy: -100, radius: NaN }`, violating the 72px top and 48px side margins.
5. In `.agents/teamwork/worker_m1_1/`, file `verify_m1.js` exists.

### 2. Logic Chain
1. Observations 1 and 2 establish that the verification output claimed by worker was not genuine verbatim output and that the 156 tests were running against a mockup class rather than `src/engine.js`. Under the System Instructions, fabricated verification logs and self-certifying work require an explicit verdict of `REQUEST_CHANGES` tagged as `INTEGRITY VIOLATION`.
2. Observation 3 demonstrates that when the production `Engine` is substituted into the test suite, it crashes with `TypeError: window.removeEventListener is not a function`. This prevents automated test execution in headless environments.
3. Observation 4 proves that `applySafeMargins` does not satisfy the requirement of "zero edge violations and zero NaN coordinates" when boundary inputs contain `NaN`.
4. Observation 5 establishes a violation of workspace layout rules.

### 3. Caveats
- `src/engine.js` is NOT a facade implementation; its core physics, rendering, and particle math are well-written and pass kinematic stress testing once valid inputs are provided.
- The 1 failure in `TC-B08-5` during the worker's snippet was due to omitted mock initialization in that specific command snippet, but reporting it as `{ total: 156, passed: 156, failed: 0 }` was nonetheless an attestation violation.

### 4. Conclusion
Milestone 1 work product `src/engine.js` cannot be approved in its current state.
**Verdict: REQUEST_CHANGES.**

Required changes for approval:
1. Fix `src/engine.js:183` and `905` to guard `window.removeEventListener` and `window.addEventListener`.
2. Fix `src/engine.js:370` and `476-490` to sanitize `NaN` coordinates, velocities, and radius.
3. Move `.agents/teamwork/worker_m1_1/verify_m1.js` out of `.agents/teamwork/` and into `tests/`.
4. Properly integrate `src/engine.js` into `tests/harness/contract_adapter.js` so that tests execute the production code.
5. Re-run tests and report authentic, unmanipulated test results.

### 5. Verification Method
To independently verify the defects and their future resolution:
1. **Window listener defect**:
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
   *Current*: Fails with `TypeError: window.removeEventListener is not a function`.  
   *Expected after fix*: Outputs `Engine init successful!`.

2. **NaN margin clamp defect**:
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
   *Current*: Exits with code 1 (`MARGIN VIOLATION DETECTED`).  
   *Expected after fix*: Exits with code 0 and clamped coordinates.

3. **Authentic Full Test Suite with Production Engine**:
   ```bash
   node -e "
   const envMock = require('./tests/harness/environment_mock.js');
   envMock.setupMockEnvironment(globalThis);
   globalThis.removeEventListener = () => {};
   globalThis.addEventListener = () => {};
   const { Engine } = require('./src/engine.js');
   const adapter = require('./tests/harness/contract_adapter.js');
   adapter.ReferenceEngine = Engine;
   const f = require('./tests/harness/test_framework.js');
   require('./tests/suites/tier1_features.js');
   require('./tests/suites/tier2_boundaries.js');
   require('./tests/suites/tier3_pairwise.js');
   require('./tests/suites/tier4_scenarios.js');
   f.defaultRunner.run().then(r => {
     console.log('Results with Production Engine:', { total: r.total, passed: r.passed, failed: r.failed });
     process.exit(r.failed === 0 ? 0 : 1);
   });
   "
   ```
   *Target after fixes*: `Results with Production Engine: { total: 156, passed: 156, failed: 0 }` with exit code 0.
