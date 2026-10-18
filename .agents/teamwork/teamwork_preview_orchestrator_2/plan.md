# Project Plan: Generation 2 Orchestration

## Execution Track
1. **Milestone 1 Iteration 2**:
   - Patch `src/engine.js` with the 4 validated fixes:
     1. Constructor: initialize `this._onOrientationChange = () => setTimeout(this.handleResize, 100); this.handleOrientation = this._onOrientationChange;`
     2. `init()`: Safe guards for `window.removeEventListener` and `window.addEventListener` for `resize` and `orientationchange`.
     3. `start()`: Add `if (this.isPlaying) return;` idempotency guard.
     4. `applySafeMargins()` and `getSafeBounds()`: NaN, non-finite, and negative radius recovery; coordinate centering recovery.
     5. `destroy()`: Safe detachment of `resize` and `orientationchange`.
   - Run verification commands:
     - `node tests/run_tests.js`
     - `node tests/engine_stress_benchmark.mjs`
     - Clean gate assessment.

2. **Milestone 2: Biomimetic Prey AI & High-Fidelity Sprites (`src/prey.js`)**:
   - 5 states: `STALK_CREEP`, `DART_SPRINT`, `FREEZE_TREMOR`, `EDGE_SKITTER`, `CAUGHT_RESPAWN`.
   - Kinematics, heading smoothing, biological pause timers, edge avoidance integration.
   - High-fidelity procedural rendering for Bumblebee (fluttering wings), Scurrying Roach (legs + antennae), Field Mouse (whipping tail kinematics), Koi Fish (spinal segments), Laser dot with dispersion particles.
   - Support 1 to 4 concurrent prey.

3. **Milestone 3: Input & Tab Defense Shield (`src/input.js`, `src/defense.js`)**:
   - Continuous line-segment-to-circle intersection with +42px paw pad tolerance.
   - Resting paw filter (<12px over 400ms).
   - Tab defense: beforeunload interception, overscroll-behavior: none, visibilitychange auto-pause with Web Audio mute.
   - 8-Second Clockwise Annulus Exit Lock (corner hidden, 0.15 opacity, clockwise circular arc fill, reset on release).

4. **Milestone 4: Procedural Web Audio API Synthesizer (`src/audio.js`)**:
   - Zero-latency FM rodent squeaks, bandpass bug clicks, resonant water splashes.
   - 12-second idle acoustic lure system.
   - Master volume, mute, audio context unlocking on user interaction.

5. **Milestone 5: Onboarding Carousel & Customization Deck (`src/ui.js`, `src/state.js`)**:
   - First-time walkthrough carousel (mats/cases, tab defense, feline vision, pounce-cam, treat reminder), persisted in `localStorage('pawplay_onboarded_v1')`.
   - Customization deck: prey selection, count (1-4), speeds (Kitten, Hunter, Apex, Ludicrous), sizes (Tiny, Normal, Chonky), sound volume, haptic intensity, session timers (1m, 3m, 5m, Unlimited).

6. **Milestone 6: Pounce-Cam & Full App Wiring (`src/camera.js`, `index.html`)**:
   - getUserMedia front camera with user toggle.
   - Triggers: On Catch, On Near-Miss, Every Pounce, Disabled.
   - Offscreen canvas capture with retro timestamp and badge.
   - IndexedDB storage & photo gallery modal.
   - Full integration into `index.html`.

7. **Milestone 7: Vercel MCP Deploy to https://playpaw.vercel.app**:
   - `vercel.json` headers, service worker `sw.js`, PWA `manifest.json`.
   - Deploy via Vercel MCP.

8. **Final Verification & Documentation**:
   - Tier 5 adversarial tests.
   - 3-Pass Rule via Chrome DevTools MCP.
   - Section 9 documentation in `PROJECT_PLAN.md`.
   - Completion message to Sentinel.
