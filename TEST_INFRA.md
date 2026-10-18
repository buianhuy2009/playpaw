# PawPlay E2E Test Infrastructure Specification

**Document Version**: 1.0.0  
**Author**: `test_writer_e2e_1`  
**Target Project**: PawPlay (Interactive Feline Web Application)  
**Authoritative References**: `ORIGINAL_REQUEST.md`, `PROJECT_PLAN.md`, `IMPLEMENTATION_PLAN.md`, `explorer_survey_2/handoff.md`  

---

## 1. Overview & Testing Philosophy

PawPlay is an interactive, biological-calibrated web application designed for feline sensory physiology (dichromatic vision, high flicker-fusion rate up to 120Hz, rapid multi-touch swat kinematics, and erratic prey motion). Testing such an application requires an **opaque-box end-to-end (E2E) testing infrastructure** capable of verifying:
1. **Biomechanical & Physiological Constraints**: Dichromatic palettes, 120Hz delta-time normalization, raycasting intersection with +42px paw pad tolerance, and resting-paw suppression (<12px over 400ms).
2. **Browser Tab Defense & Child-Lock Invariants**: Hard perimeter margins (72px top/bottom, 48px sides), `beforeunload` unload interceptors, `visibilitychange` auto-pause & Web Audio mute, and the tamper-proof 8-second continuous clockwise annulus exit lock.
3. **Procedural Synthesis & Sensor Hardware**: Procedural Web Audio API sound generators, 12-second acoustic recall lure, and Pounce-Cam front-camera reaction engine with IndexedDB persistence.
4. **Execution Agility**: Zero-external-dependency dual execution harness running natively in modern web browsers (`tests/e2e_runner.html`), in headless environments via Node.js (`node tests/run_tests.js`), and programmatically through Chrome DevTools MCP (`evaluate_script`).

---

## 2. Authoritative Requirements Traceability Matrix

Every test in this suite is derived from explicit specifications in `ORIGINAL_REQUEST.md` and `PROJECT_PLAN.md`:

| Req ID | Requirement Description | Implementation Target | Test Tier & IDs | Primary Assertion Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **R1** | 120Hz Delta-Time Loop & Contrast Themes | `src/engine.js` | Tier 1: TC-F01, TC-F02<br>Tier 2: TC-B01, TC-B04, TC-B05 | $dt \in (0, 0.050]$, DPR clamped to 2.0, margins strictly enforced ($y \in [72, H-72]$, $x \in [48, W-48]$). |
| **R2** | 5-State Biomimetic Prey AI & Sprites | `src/prey.js` | Tier 1: TC-F03, TC-F04, TC-F05<br>Tier 3: Vectors 1–25 | All 5 states observed; 5 distinct prey models; 1–4 concurrent agents. |
| **R3** | Browser Tab Defense & 8s Annulus Exit Lock | `src/defense.js`<br>`src/input.js` | Tier 1: TC-F06, TC-F12, TC-F13<br>Tier 2: TC-B02, TC-B03, TC-B10<br>Tier 4: Scenario 2, 4 | Multi-touch raycasting ($\le r + 42\text{px}$); resting paw suppressed; release <8.0s resets to 0.0; full 8.0s hold completes exit. |
| **R4** | Procedural Web Audio & Acoustic Lures | `src/audio.js` | Tier 1: TC-F07, TC-F08<br>Tier 2: TC-B07<br>Tier 4: Scenario 3 | FM squeaks, bandpass clicks, splash synth nodes; 12s idle trigger; auto-mute on tab hide. |
| **R5** | First-Time Onboarding & Customization Deck | `src/ui.js`<br>`src/state.js` | Tier 1: TC-F09, TC-F10<br>Tier 4: Scenario 1 | 5-step carousel shown when un-onboarded; persistent state in `localStorage['pawplay_state_v1']`. |
| **R6** | "Pounce-Cam" Reaction Snapshot Engine | `src/camera.js` | Tier 1: TC-F11<br>Tier 2: TC-B08, TC-B09<br>Tier 4: Scenario 2 | Front camera access; offscreen watermark canvas; IndexedDB storage; graceful fallback if denied or quota exceeded. |
| **R7** | Automated Vercel MCP Deployment & PWA | `vercel.json`<br>`manifest.json`<br>`sw.js` | Tier 1: TC-F13<br>Tier 4: Live Check | Standalone PWA manifest; SW cache headers (`max-age=0, must-revalidate`); live https resolution. |
| **R8** | Autonomous 3-Pass Zero-Error Rule | DevTools Protocol | All Tiers & Passes | Zero unhandled exceptions; zero console errors; zero warnings. |
| **R9** | Continuous Project Documentation | Project Root | TEST_INFRA.md, TEST_READY.md | Verifiable test execution instructions and complete matrix summary. |

---

## 3. 4-Tier Test Architecture & Matrix

The test suite is structured into four distinct, progressive tiers totaling **156+ automated assertions**:

```
+----------------------------------------------------------------------------------------------------+
|                                    PAWPLAY 4-TIER TEST MATRIX                                      |
+----------------------------------------------------------------------------------------------------+
| Tier 1: Feature Coverage (>=65 tests)    | >=5 tests per feature across all 13 core features       |
| Tier 2: Boundary & Corner (>=50 tests)   | >=5 tests per feature across 10 safety & boundary domains   |
| Tier 3: Pairwise Combinations (25 tests) | 25 Orthogonal vectors (Prey × Speed × Size × Theme × Count) |
| Tier 4: Real-World Scenarios (16+ tests) | 4 Multi-step end-to-end feline behavioral journeys       |
+----------------------------------------------------------------------------------------------------+
```

### 3.1 Tier 1: Feature Coverage (13 Features × 5 Tests = 65 Tests)
- **TC-F01: High-DPI 120Hz Delta-Time Render Loop** (5 tests)
  - 1.1 Canvas backing store matches CSS dimensions × clamped DPR (`Math.min(DPR, 2)`).
  - 1.2 Uncapped delta-time calculation produces valid seconds (`dt <= 0.05`).
  - 1.3 High frame-rate compensation scales velocity uniformly across 60Hz and 120Hz ticks.
  - 1.4 Render loop starts on play and halts cleanly on pause/stop.
  - 1.5 Frame timestamp updates monotonically without negative intervals.
- **TC-F02: 3 Feline Contrast Themes** (5 tests)
  - 2.1 Daylight Floor applies light warm parchment (`#F4F1EA`) background.
  - 2.2 Night Stalker applies deep dark palette (`#10121A`).
  - 2.3 Koi Pond applies water background (`#0A2239`) and initializes ripple buffers.
  - 2.4 Theme switching preserves active prey state and game physics.
  - 2.5 Touch input in Koi Pond theme spawns expanding water ripples with damped attenuation.
- **TC-F03: 5 Biomimetic Prey Types & Dichromatic Palettes** (5 tests)
  - 3.1 Laser sprite renders with bright core (`#FFFFFF`), yellow halo (`#FFD600`), and blue outer glow (`#0066FF`).
  - 3.2 Roach/Beetle sprite renders espresso carapace (`#1A110B`) and 6 articulated leg nodes.
  - 3.3 Field Mouse sprite renders body, cream ears, whiskers, and 4-node whipping tail.
  - 3.4 Koi Fish sprite renders golden-yellow/cobalt segments with sinusoidal spinal bend.
  - 3.5 Bumblebee sprite renders high-contrast yellow/black stripes and fluttering wing pairs.
- **TC-F04: 5-State Prey Markov State Machine** (5 tests)
  - 4.1 `FREEZE_TREMOR` generates micro-jitter (`sin(t*45)*1.5px`) and transitions after 0.6s–2.2s.
  - 4.2 `DART_SPRINT` executes sudden curved escape velocity (600–950 px/s) for 0.4s–0.9s.
  - 4.3 `STALK_CREEP` moves at slow sinusoidal stalking speed (120–220 px/s).
  - 4.4 `EDGE_SKITTER` hugs the perimeter margin before cutting toward screen center.
  - 4.5 `CAUGHT_RESPAWN` plays 180ms squish animation, 0.7s delay, and respawns within safe margins.
- **TC-F05: Multi-Prey Spawner & Concurrency** (5 tests)
  - 5.1 Spawning 1 prey initializes exactly 1 active agent.
  - 5.2 Spawning 2, 3, and 4 prey updates each agent independently without state cross-contamination.
  - 5.3 Prey agents initialize with randomized heading angles and separated initial coordinates.
  - 5.4 Dynamic count reconfiguration cleanly adds or prunes active agents.
  - 5.5 Active prey count is strictly clamped within the valid range `[1, 4]`.
- **TC-F06: Multi-Touch Raycasting & Pad Tolerance** (5 tests)
  - 6.1 Direct tap on prey center triggers catch event.
  - 6.2 Rapid swipe line segment passing within `radius + 42px` triggers catch event.
  - 6.3 Swipe missing prey by $> 42\text{px}$ does not trigger catch.
  - 6.4 Zero-length touch tap with pad tolerance registers valid hit.
  - 6.5 Simultaneous multi-finger touches independently evaluate raycasting.
- **TC-F07: Procedural Web Audio API Synthesizer** (5 tests)
  - 7.1 Catching a mouse triggers FM rodent squeak sweep (4800Hz $\to$ 2600Hz $\to$ 3900Hz).
  - 7.2 Catching a bug triggers bandpass noise pulse (5200Hz, Q=3.5).
  - 7.3 Catching a koi fish triggers resonant water splash sound nodes.
  - 7.4 Session end triggers ascending 3-chord treat chime (C5-E5-G5).
  - 7.5 Global mute setting silences audio output without throwing node disconnect errors.
- **TC-F08: 12-Second Acoustic Idle Lure System** (5 tests)
  - 8.1 Idle timer accumulates during absence of touch/swat events.
  - 8.2 Any user touch event resets the idle timer back to 0.0 seconds.
  - 8.3 Reaching 12.0 seconds idle triggers acoustic lure chirp.
  - 8.4 Acoustic lure trigger synchronizes with a prey `DART_SPRINT` escape burst.
  - 8.5 Acoustic lure re-arms cleanly for subsequent 12-second idle periods.
- **TC-F09: First-Time Onboarding Walkthrough Carousel** (5 tests)
  - 9.1 First visit with clean `localStorage` displays onboarding modal.
  - 9.2 Carousel contains 5 informational steps (Stability, Defense, Vision, Cam, Treat).
  - 9.3 Next / Previous navigation buttons cycle active slide index correctly.
  - 9.4 Finishing onboarding sets `localStorage['pawplay_onboarded_v1'] = 'true'` and closes modal.
  - 9.5 Reloading page when onboarded flag is set bypasses onboarding directly to menu.
- **TC-F10: Customization Deck UI & Persistence** (5 tests)
  - 10.1 UI options deck updates prey type, speed, size, theme, count, and session duration.
  - 10.2 Config changes synchronize immediately with `localStorage['pawplay_state_v1']`.
  - 10.3 Loading saved state restores user preferences on page boot.
  - 10.4 Invalid or corrupted localStorage payload falls back to safe default settings.
  - 10.5 Session timers configure 1 min, 3 min, 5 min, or Unlimited mode.
- **TC-F11: Pounce-Cam Front Camera Engine** (5 tests)
  - 11.1 Camera toggle initiates `navigator.mediaDevices.getUserMedia` with `facingMode: 'user'`.
  - 11.2 Catch snapshot stamps video frame to offscreen canvas with retro timestamp & badge.
  - 11.3 Captured snapshots are stored into IndexedDB store `pawplay_photos_v1`.
  - 11.4 Camera trigger modes (On Catch, On Near-Miss, Every Pounce, Disabled) filter captures.
  - 11.5 Photos can be retrieved and deleted via `PounceCam` interface methods.
- **TC-F12: 8-Second Clockwise Annulus Exit Lock** (5 tests)
  - 12.1 Exit icon renders faintly (opacity ~0.15) in corner to prevent cat distraction.
  - 12.2 Holding exit button advances annulus ring progress clockwise linearly over 8.0 seconds.
  - 12.3 Releasing before 8.0 seconds immediately cancels and resets progress to 0.0%.
  - 12.4 Completing 8.0 seconds continuous hold triggers exit and returns to menu.
  - 12.5 Multiple interrupted hold attempts reset cleanly without accumulator drift.
- **TC-F13: PWA Manifest & Tab Defense Shield** (5 tests)
  - 13.1 `beforeunload` event handler warns user when `isPlaying === true`.
  - 13.2 `beforeunload` allows smooth navigation when `isPlaying === false`.
  - 13.3 `visibilitychange: hidden` auto-pauses engine and mutes audio context.
  - 13.4 Returning to tab (`visibilitychange: visible`) displays resume overlay.
  - 13.5 PWA manifest specifies `"display": "standalone"` and mobile orientation lock.

---

### 3.2 Tier 2: Boundary & Corner Cases (10 Areas × 5 Tests = 50 Tests)
- **TC-B01: Perimeter Repulsion & Margin Clamping** (5 tests)
  - B01.1 Prey at boundary experiences inward steering acceleration vector.
  - B01.2 Hard clamp guarantees prey $y \in [72, H-72]$ under extreme velocity ($1200\text{ px/s}$).
  - B01.3 Hard clamp guarantees prey $x \in [48, W-48]$ across full duration.
  - B01.4 60-second continuous simulation at Ludicrous speed produces 0 margin violations.
  - B01.5 Safe area adapts immediately when canvas dimensions resize.
- **TC-B02: Static Sitting-Paw Filter Thresholds** (5 tests)
  - B02.1 Touch stationary for 450ms with displacement 5px ($< 12\text{px}$) is marked `isResting = true`.
  - B02.2 Touch moving 25px ($> 12\text{px}$) over 450ms is NOT marked resting.
  - B02.3 Resting paw does not trigger continuous hits on prey passing beneath.
  - B02.4 Second active swipe registers hits even while a resting paw is held stationary.
  - B02.5 Releasing resting paw cleans up internal pointer tracking tables.
- **TC-B03: Annulus Exit Lock Precision Timing** (5 tests)
  - B03.1 Releasing at $7.9\text{s}$ resets progress to 0.0 and aborts exit.
  - B03.2 Releasing at $7.99\text{s}$ does NOT trigger exit.
  - B03.3 Holding for $8.01\text{s}$ successfully triggers exit.
  - B03.4 Moving touch outside button bounds during hold cancels the exit attempt.
  - B03.5 Annulus canvas arc calculations map exactly $0 \to 2\pi$ radians.
- **TC-B04: Extreme Viewport Dimensions & Aspect Ratios** (5 tests)
  - B04.1 Mobile portrait viewport ($360 \times 640$) maintains valid safe margins and prey scale.
  - B04.2 Tablet landscape viewport ($1024 \times 768$) computes correct diagonal velocity scaling.
  - B04.3 Ultrawide monitor viewport ($2560 \times 1080$) preserves sprite proportions.
  - B04.4 Minimal boundary viewport ($320 \times 320$) computes positive safe interior.
  - B04.5 Dynamic resize event recomputes bounds without crashing or leaking animation frames.
- **TC-B05: Device Pixel Ratio (DPR) Clamping & High-DPI Safety** (5 tests)
  - B05.1 Standard DPR = 1.0 sets backing store scale 1.0.
  - B05.2 Retina DPR = 2.0 sets backing store scale 2.0.
  - B05.3 High-density mobile DPR = 3.0 or 4.0 clamps backing store to max 2.0 to protect GPU RAM.
  - B05.4 Fractional DPR (e.g., 1.25, 1.5) rounds backing store pixels to clean integers.
  - B05.5 Canvas context scale matches DPR clamp factor.
- **TC-B06: Zero vs Extreme High Swat Volume Stress** (5 tests)
  - B06.1 0 swats over full 60s session runs smoothly with zero allocations.
  - B06.2 500 rapid catches recycle particle pools without unbounded memory growth.
  - B06.3 Particles cleanly expire when alpha $\le 0$ and are removed from update array.
  - B06.4 Score counter handles 3+ digits cleanly without layout overflow.
  - B06.5 Rapid successive hits do not trigger NaN coordinates in prey spawner.
- **TC-B07: Web Audio Auto-Unlock & Policy Fallback** (5 tests)
  - B07.1 Sound triggers before user gesture do not crash the engine.
  - B07.2 First pointer gesture resumes suspended AudioContext.
  - B07.3 Calling `mute(true)` mutes master gain node instantly.
  - B07.4 Calling `mute(false)` restores master gain to configured volume level.
  - B07.5 AudioContext state transitions are reported accurately via getter methods.
- **TC-B08: Camera Permission Denied & Hardware Unavailable** (5 tests)
  - B08.1 `getUserMedia` rejection with `NotAllowedError` toggles camera setting to disabled.
  - B08.2 Denied camera displays non-intrusive status indicator without blocking game start.
  - B08.3 Catch triggers continue normal gameplay animations when camera is unavailable.
  - B08.4 `NotFoundError` (no physical camera) is caught gracefully.
  - B08.5 Camera toggle in settings permits retry if permission status changes.
- **TC-B09: IndexedDB Storage Failure & Quota Exceeded** (5 tests)
  - B09.1 IndexedDB `QuotaExceededError` routes captures to transient memory buffer.
  - B09.2 Database open errors fall back gracefully without unhandled promise rejections.
  - B09.3 Gallery gracefully handles empty or partially corrupted photo records.
  - B09.4 Photo deletion removes record from database and updates gallery view.
  - B09.5 Stored photo records validate timestamp, blob/dataURL, and preview badge.
- **TC-B10: 10-Finger Paw Slap Burst Concurrency** (5 tests)
  - B10.1 10 simultaneous touch events are registered within the same frame.
  - B10.2 Raycasting evaluates each touch segment against active prey hitboxes.
  - B10.3 Releasing 8 fingers while holding 2 preserves active tracking of the 2 remaining.
  - B10.4 Touch cancellation events (`touchcancel`) clean up pointer records immediately.
  - B10.5 Heavy touch bursts maintain consistent 120Hz/60Hz frame timing.

---

### 3.3 Tier 3: Pairwise Combinations (25 Orthogonal Vectors)
To guarantee comprehensive coverage across interacting configuration parameters without running all 2,880 combinations, 25 orthogonal test vectors are defined:

- **Parameters**:
  - Prey: `[Bee, Roach, Mouse, Koi, Laser]` (5)
  - Speed: `[Kitten, Hunter, Apex, Ludicrous]` (4)
  - Size: `[Tiny, Normal, Chonky]` (3)
  - Theme: `[Daylight Floor, Night Stalker, Koi Pond]` (3)
  - Count: `[1, 2, 3, 4]` (4)
  - Camera Trigger: `[Off, On Catch, On Near-Miss, Every Pounce]` (4)

| Vector | Prey | Speed | Size | Theme | Count | Camera Trigger | Verification Focus |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **V01** | Bee | Kitten | Tiny | Daylight Floor | 1 | Off | High-contrast bee wings, low velocity, single target |
| **V02** | Roach | Hunter | Normal | Night Stalker | 2 | On Catch | Dark theme insect legs, camera trigger on catch |
| **V03** | Mouse | Apex | Chonky | Koi Pond | 3 | On Near-Miss | High speed whipping tail, near-miss trigger |
| **V04** | Koi | Ludicrous | Tiny | Daylight Floor | 4 | Every Pounce | Maximum speed, 4-agent spinal kinematics, rapid capture |
| **V05** | Laser | Kitten | Normal | Night Stalker | 1 | Every Pounce | Dichromatic laser glow, every swat trigger |
| **V06** | Bee | Hunter | Chonky | Koi Pond | 2 | Off | Water ripples under fluttering bee |
| **V07** | Roach | Apex | Tiny | Daylight Floor | 3 | On Catch | Rapid skittering, multiple small hitboxes |
| **V08** | Mouse | Ludicrous | Normal | Night Stalker | 4 | On Near-Miss | Max speed multi-prey evasion |
| **V09** | Koi | Kitten | Chonky | Koi Pond | 1 | On Catch | Smooth sinusoidal swimming in natural theme |
| **V10** | Laser | Hunter | Tiny | Daylight Floor | 2 | On Near-Miss | Dual laser dots with particle trails |
| **V11** | Bee | Apex | Normal | Night Stalker | 3 | Every Pounce | Night flight kinematics with camera capture |
| **V12** | Roach | Ludicrous | Chonky | Koi Pond | 4 | Off | Heavy insect margin bouncing in pond theme |
| **V13** | Mouse | Kitten | Tiny | Night Stalker | 2 | Every Pounce | Gentle mouse chasing in night mode |
| **V14** | Koi | Hunter | Normal | Koi Pond | 3 | Off | School of 3 koi fish with spine joints |
| **V15** | Laser | Apex | Chonky | Daylight Floor | 4 | On Catch | Quad high-speed laser points |
| **V16** | Bee | Ludicrous | Tiny | Night Stalker | 1 | On Near-Miss | High-velocity micro target |
| **V17** | Roach | Kitten | Normal | Koi Pond | 3 | On Near-Miss | Slow crawling roaches over pond background |
| **V18** | Mouse | Hunter | Chonky | Daylight Floor | 1 | Every Pounce | Solitary large rodent hunt |
| **V19** | Koi | Apex | Tiny | Night Stalker | 2 | Off | Glowing koi silhouettes in dark water |
| **V20** | Laser | Ludicrous | Normal | Koi Pond | 2 | On Catch | Dual hyperspeed laser dots generating ripples |
| **V21** | Bee | Kitten | Normal | Daylight Floor | 4 | On Catch | Full swarm of 4 gentle bees |
| **V22** | Roach | Hunter | Tiny | Night Stalker | 4 | Every Pounce | Dark colony scurrying under camera surveillance |
| **V23** | Mouse | Apex | Tiny | Koi Pond | 1 | Off | Agile mouse hugging pond safe perimeter |
| **V24** | Koi | Ludicrous | Normal | Daylight Floor | 3 | On Catch | High-speed fish evasion on light background |
| **V25** | Laser | Kitten | Chonky | Night Stalker | 3 | Off | Triple slow laser points with large hitboxes |

---

### 3.4 Tier 4: Real-World Scenarios (End-to-End Behavioral Journeys)
Four end-to-end multi-step behavioral journeys modeling genuine feline interactions:

1. **Scenario 1: "The Curious Kitten" (Onboarding $\to$ Gentle Hunt $\to$ Anti-Frustration Treat)**
   - Phase 1: Un-onboarded client opens app $\to$ Fullscreen carousel displays 5 steps.
   - Phase 2: User completes onboarding $\to$ `pawplay_onboarded_v1 = 'true'`.
   - Phase 3: Setup configured: 1 Chonky Mouse, Kitten Speed, Daylight Floor, 1-Minute Timer.
   - Phase 4: Session started $\to$ Wake lock acquired, Audio context unlocked, countdown HUD active.
   - Phase 5: Simulated cat swats 3 times, catching mouse $\to$ FM rodent squeak plays, score increments.
   - Phase 6: Timer reaches 0 $\to$ Prey decelerates off-screen, Treat Reward Chime plays, anti-frustration modal displays.

2. **Scenario 2: "The Apex Hunter & The Resting Chest" (Resting Paw $\to$ Violent Swat $\to$ Pounce-Cam)**
   - Phase 1: Setup: 3 Scurrying Roaches, Apex Speed, Night Stalker, Pounce-Cam On Catch.
   - Phase 2: Cat approaches tablet and rests chest/left paw on bottom margin ($< 12\text{px}$ over $450\text{ms}$).
   - Phase 3: Resting-paw filter flags pointer as `isResting = true`, suppressing false catches and ripple noise.
   - Phase 4: Cat violently swats with right paw across prey $\to$ continuous raycast detects hit.
   - Phase 5: Catch triggers bandpass bug sound, 18-particle burst, and Pounce-Cam snapshot saved to IndexedDB.
   - Phase 6: Stray tail touches corner exit icon for 2.0s and releases $\to$ annulus progress cancels to 0.0%, session remains active.

3. **Scenario 3: "The Distracted Cat & 12s Acoustic Recall" (Idle Timeout $\to$ Chirp Lure $\to$ Re-Engagement)**
   - Phase 1: Setup: 2 Bees, Hunter Speed, Koi Pond Theme.
   - Phase 2: Cat plays actively for 15 seconds, then walks away.
   - Phase 3: No touch input for 12.0 seconds $\to$ Engine idle detector trips.
   - Phase 4: Audio engine emits high-frequency chirp lure synchronized with a bee `DART_SPRINT` burst.
   - Phase 5: Cat returns, swats screen $\to$ Idle timer resets to 0.0 and normal gameplay resumes.

4. **Scenario 4: "Violent Top Swat, Tab Defense Shield & 8s Child-Lock Exit"**
   - Phase 1: Cat swats aggressively at the top edge of the screen ($y < 72\text{px}$).
   - Phase 2: Active margin repulsion prevents any prey from entering the top 72px zone, preventing tab bar / URL taps.
   - Phase 3: Browser tab is backgrounded (`visibilitychange: hidden`) $\to$ Engine auto-pauses, Web Audio context mutes.
   - Phase 4: Tab is brought back to foreground $\to$ "Resume Hunt" overlay appears, preventing stray paws from catching off-guard.
   - Phase 5: Human presses and holds corner exit icon continuously for 8.0 seconds $\to$ Annulus ring fills 100%, session ends cleanly and returns to settings.

---

## 4. Test Harness & Infrastructure Design

The E2E test harness is located under `/Users/buianhuy/.gemini/antigravity/scratch/pawplay/tests/`:

```
tests/
├── e2e_runner.html          # Interactive browser test runner with visual dashboard & export
├── run_tests.js             # Headless Node.js test runner with colorized terminal output
├── harness/
│   ├── test_framework.js    # BDD test runner core (describe, it, expect, beforeEach, afterEach)
│   ├── virtual_clock.js     # Deterministic clock ticker (tickTime, advanceTime, rAF mock)
│   ├── event_simulator.js   # Pointer down, move, up, swipe, multi-touch, resting paw simulator
│   └── environment_mock.js  # Clean DOM, AudioContext, getUserMedia, IndexedDB mocks for headless mode
└── suites/
    ├── tier1_features.js    # 65 feature tests (TC-F01 to TC-F13)
    ├── tier2_boundaries.js  # 50 boundary tests (TC-B01 to TC-B10)
    ├── tier3_pairwise.js    # 25 orthogonal combination vector tests (V01 to V25)
    └── tier4_scenarios.js   # 16 multi-step scenario tests (Scenarios 1 to 4)
```

### 4.1 Test Framework API (`tests/harness/test_framework.js`)
- `describe(name, fn)`: Declares a test suite block.
- `it(name, fn)`: Declares a synchronous or asynchronous test case.
- `beforeEach(fn)` / `afterEach(fn)`: Lifecycle hooks for clean state setup and teardown.
- `expect(actual)`: Provides matchers:
  - `toBe(expected)`: Strict equality (`===`).
  - `toEqual(expected)`: Deep value equality for objects and arrays.
  - `toBeCloseTo(expected, delta)`: Floating point tolerance comparison.
  - `toBeGreaterThan(expected)` / `toBeLessThan(expected)`.
  - `toBeBetween(min, max)`: Range inclusion assertion $[min, max]$.
  - `toBeTruthy()` / `toBeFalsy()`.
  - `toBeNull()` / `toBeUndefined()`.
  - `toContain(item)`.
  - `toThrow(optPattern)`.
- `runner.run()`: Asynchronously executes all registered suites and returns aggregated results:
  ```json
  {
    "total": 156,
    "passed": 156,
    "failed": 0,
    "skipped": 0,
    "durationMs": 420,
    "suites": [...]
  }
  ```

### 4.2 Deterministic Virtual Clock (`tests/harness/virtual_clock.js`)
To verify time-critical behaviors (such as the 8-second exit lock, 12-second acoustic lure, 400ms resting-paw filter, and 120Hz physics delta-time) without waiting real-world seconds:
- `VirtualClock.install()`: Replaces `performance.now`, `Date.now`, `requestAnimationFrame`, `setTimeout`, and `clearTimeout`.
- `VirtualClock.tick(dtSeconds)`: Advances virtual time by `dtSeconds` and steps engine simulations with precise time slices.
- `VirtualClock.tickTime(ms)`: Advances time by milliseconds and executes scheduled timers.
- `VirtualClock.uninstall()`: Restores native system timers.

### 4.3 Pointer & Touch Event Simulator (`tests/harness/event_simulator.js`)
- `simulatePointerDown(element, x, y, pointerId)`: Dispatches Pointer/Touch down event.
- `simulatePointerMove(element, x, y, pointerId)`: Dispatches Move event with updated coordinates.
- `simulatePointerUp(element, x, y, pointerId)`: Dispatches Up event.
- `simulateSwipe(element, x1, y1, x2, y2, durationMs, steps)`: Simulates continuous multi-frame swipe line segment.
- `simulateRestingPaw(element, x, y, holdMs, jitterPx)`: Simulates a cat resting its paw with $< 12\text{px}$ movement over $> 400\text{ms}$.

### 4.4 Headless Environment Polyfill (`tests/harness/environment_mock.js`)
Enables `node tests/run_tests.js` to execute fully without requiring browser dependencies:
- Lightweight DOM simulation: `window`, `document`, `HTMLElement`, `HTMLCanvasElement`, `CanvasRenderingContext2D`.
- Synthetic Web Audio: `AudioContext`, `GainNode`, `OscillatorNode`, `BiquadFilterNode`, `AudioBufferSourceNode`.
- Media Devices: `navigator.mediaDevices.getUserMedia` returning synthetic `MediaStreamTrack`.
- Storage: In-memory `localStorage` and `indexedDB` mock stores.
- Screen: `screen.orientation`, `navigator.wakeLock`.

---

## 5. Execution Methods & Automation

### 5.1 Browser-Based Interactive Runner
Open `tests/e2e_runner.html` in any modern web browser (or via local static server `python3 -m http.server 8080`):
- Interactive UI displaying real-time pass/fail indicators for each suite.
- Filter by Tier (Tier 1, Tier 2, Tier 3, Tier 4, or All).
- Exposes `window.__PAWPLAY_TEST_RESULTS__` for programmatic inspection.

### 5.2 Node.js Headless Runner
Execute directly in the terminal:
```bash
node tests/run_tests.js
```
- Executes all 4 tiers with zero external npm dependencies.
- Prints colorized test results, timing, and error traces.
- Exits with status code `0` on 100% pass, or status code `1` on any failure.

### 5.3 Chrome DevTools MCP Programmatic Protocol
Execute in automated pipelines via Chrome DevTools MCP:
```javascript
// Navigate to test runner
call_mcp_tool("chrome-devtools-mcp", "navigate_page", {
  pageId: 1,
  type: "url",
  url: "http://localhost:8080/tests/e2e_runner.html"
});

// Await test completion and retrieve results
call_mcp_tool("chrome-devtools-mcp", "evaluate_script", {
  pageId: 1,
  expression: "window.__PAWPLAY_TEST_RESULTS__ || new Promise(resolve => window.addEventListener('pawplay-tests-complete', e => resolve(e.detail)))"
});
```

---

## 6. Success Criteria & Certification Thresholds

A test pass is certified **ONLY** when:
1. **Pass Rate**: 100% of tests in Tiers 1–4 pass ($156 / 156$ passing, $0$ failures).
2. **Zero Errors/Warnings**: Chrome DevTools MCP `list_console_messages` returns zero `error` or `warn` entries during runner execution.
3. **Execution Time**: The complete headless test matrix completes in $< 2000\text{ms}$.
