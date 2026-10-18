/**
 * PawPlay E2E Test Suite - Tier 2: Boundary & Corner Cases
 * Covers 10 boundary scenarios with >=5 tests per scenario (>=50 tests total).
 * Authoritative source: ORIGINAL_REQUEST.md & IMPLEMENTATION_PLAN.md
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('../harness/test_framework.js'),
      require('../harness/contract_adapter.js'),
      require('../harness/event_simulator.js')
    );
  } else {
    factory(
      root.PawPlayTestFramework,
      root.PawPlayAdapter,
      root.PawPlayEventSimulator
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (framework, adapter, eventSim) {
  'use strict';

  const { describe, it, expect, beforeEach } = framework;
  const {
    MARGIN_TOP,
    MARGIN_BOTTOM,
    MARGIN_SIDES,
    MAX_DPR,
    MAX_DT,
    PAW_PAD_TOLERANCE,
    RESTING_DISPLACEMENT_LIMIT,
    RESTING_TIME_LIMIT,
    EXIT_LOCK_DURATION_MS,
    ReferenceEngine,
    ReferencePreyAgent,
    ReferencePreyManager,
    ReferenceInputController,
    ReferenceDefenseShield,
    ReferenceSoundSynthesizer,
    ReferencePounceCam,
    ReferenceAppState
  } = adapter;

  describe('Tier 2: Boundary & Corner Cases (50 Tests Across 10 Safety Domains)', () => {

    // -------------------------------------------------------------------------
    // TC-B01: Perimeter Repulsion & Margin Clamping (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-B01: Perimeter Repulsion & Margin Clamping', () => {
      let engine;
      beforeEach(() => {
        engine = new ReferenceEngine();
        engine.init({ clientWidth: 1024, clientHeight: 768, getContext: () => ({ scale: () => {} }) });
        engine.start();
      });

      it('TC-B01-1: Inward steering force applies when approaching margin buffer', () => {
        const prey = new ReferencePreyAgent(1, 'roach', 'ludicrous', 'tiny');
        prey.x = MARGIN_SIDES + prey.radius + 10; // Inside buffer
        prey.vx = -500; // Heading outward
        engine.applySafeMargins(prey, 0.016);
        expect(prey.vx).toBeGreaterThan(0); // Steered inward
      });

      it('TC-B01-2: Hard clamp strictly keeps prey Y coordinate >= 72px and <= H - 72px', () => {
        const prey = new ReferencePreyAgent(1, 'mouse', 'ludicrous', 'normal');
        prey.y = 20; // Attempting to enter browser tab area
        engine.applySafeMargins(prey, 0.016);
        expect(prey.y).toBeGreaterThanOrEqual(MARGIN_TOP + prey.radius);

        prey.y = 760; // Attempting to enter bottom OS home bar
        engine.applySafeMargins(prey, 0.016);
        expect(prey.y).toBeLessThanOrEqual(768 - MARGIN_BOTTOM - prey.radius);
      });

      it('TC-B01-3: Hard clamp strictly keeps prey X coordinate >= 48px and <= W - 48px', () => {
        const prey = new ReferencePreyAgent(1, 'bee', 'ludicrous', 'chonky');
        prey.x = 10;
        engine.applySafeMargins(prey, 0.016);
        expect(prey.x).toBeGreaterThanOrEqual(MARGIN_SIDES + prey.radius);

        prey.x = 1020;
        engine.applySafeMargins(prey, 0.016);
        expect(prey.x).toBeLessThanOrEqual(1024 - MARGIN_SIDES - prey.radius);
      });

      it('TC-B01-4: 60-second Ludicrous speed simulation produces exactly 0 margin violations', () => {
        const prey = new ReferencePreyAgent(1, 'laser', 'ludicrous', 'normal');
        prey.vx = 1100;
        prey.vy = 1100;
        engine.preyList = [prey];

        let violations = 0;
        const totalSteps = 60 * 60; // 3,600 ticks
        const dt = 1 / 60;

        for (let i = 0; i < totalSteps; i++) {
          engine.update(dt);
          const dims = engine.getDimensions();
          if (
            prey.y - prey.radius < dims.safeArea.top ||
            prey.y + prey.radius > dims.safeArea.bottom ||
            prey.x - prey.radius < dims.safeArea.left ||
            prey.x + prey.radius > dims.safeArea.right
          ) {
            violations++;
          }
        }
        expect(violations).toBe(0);
      });

      it('TC-B01-5: Resizing viewport updates safe boundary clamps dynamically', () => {
        const prey = new ReferencePreyAgent(1, 'koi', 'hunter', 'normal');
        prey.x = 900;
        prey.y = 700;

        // Viewport shrinks to 800 x 600
        engine.width = 800;
        engine.height = 600;
        engine.applySafeMargins(prey, 0.016);

        expect(prey.x).toBeLessThanOrEqual(800 - MARGIN_SIDES - prey.radius);
        expect(prey.y).toBeLessThanOrEqual(600 - MARGIN_BOTTOM - prey.radius);
      });
    });

    // -------------------------------------------------------------------------
    // TC-B02: Static Sitting-Paw Filter Thresholds (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-B02: Static Sitting-Paw Filter Thresholds', () => {
      let filter;
      beforeEach(() => {
        filter = new eventSim.SittingPawFilter(RESTING_DISPLACEMENT_LIMIT, RESTING_TIME_LIMIT);
      });

      it('TC-B02-1: Touch with displacement < 12px over 450ms is flagged as resting', () => {
        filter.touchDown(1, 300, 300, 1000);
        // Small micro-tremors (total 4px) over 450ms
        filter.touchMove(1, 302, 303, 1450);
        expect(filter.isResting(1)).toBe(true);
      });

      it('TC-B02-2: Touch with displacement >= 12px over 450ms is NOT flagged as resting', () => {
        filter.touchDown(1, 300, 300, 1000);
        // Active movement (25px displacement)
        filter.touchMove(1, 320, 315, 1450);
        expect(filter.isResting(1)).toBe(false);
      });

      it('TC-B02-3: Touch stationary for only 250ms (< 400ms) is not yet flagged resting', () => {
        filter.touchDown(1, 300, 300, 1000);
        filter.touchMove(1, 300, 300, 1250); // only 250ms elapsed
        expect(filter.isResting(1)).toBe(false);
      });

      it('TC-B02-4: Active swipe after resting state clears resting suppression', () => {
        filter.touchDown(1, 300, 300, 1000);
        filter.touchMove(1, 301, 301, 1500); // marked resting
        expect(filter.isResting(1)).toBe(true);

        // Cat wakes up and pounces 60px
        filter.touchMove(1, 360, 300, 1550);
        expect(filter.isResting(1)).toBe(false);
      });

      it('TC-B02-5: Releasing pointer cleans up resting paw state cleanly', () => {
        filter.touchDown(1, 300, 300, 1000);
        filter.touchMove(1, 300, 300, 1500);
        expect(filter.isResting(1)).toBe(true);

        filter.touchUp(1);
        expect(filter.isResting(1)).toBe(false);
      });
    });

    // -------------------------------------------------------------------------
    // TC-B03: Annulus Exit Lock Precision Timing (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-B03: Annulus Exit Lock Precision Timing', () => {
      let defense;
      beforeEach(() => {
        defense = new ReferenceDefenseShield();
      });

      it('TC-B03-1: Releasing at 7900ms (7.9s) resets progress to 0.0 and aborts exit', () => {
        let exitCalled = false;
        defense.onExitComplete = () => { exitCalled = true; };

        defense.startExitHold(1000);
        defense.updateExitHold(8900); // 7.9s hold
        expect(defense.getExitProgress()).toBeCloseTo(0.9875, 0.01);
        expect(exitCalled).toBe(false);

        defense.cancelExitHold();
        expect(defense.getExitProgress()).toBe(0.0);
        expect(exitCalled).toBe(false);
      });

      it('TC-B03-2: Releasing at 7990ms (7.99s) still cancels without exit', () => {
        let exitCalled = false;
        defense.onExitComplete = () => { exitCalled = true; };

        defense.startExitHold(1000);
        defense.updateExitHold(8990); // 7.99s hold
        expect(exitCalled).toBe(false);

        defense.cancelExitHold();
        expect(defense.getExitProgress()).toBe(0.0);
      });

      it('TC-B03-3: Continuous hold reaching exactly 8000ms completes exit', () => {
        let exitCalled = false;
        defense.onExitComplete = () => { exitCalled = true; };

        defense.startExitHold(1000);
        defense.updateExitHold(9000); // Exactly 8000ms
        expect(exitCalled).toBe(true);
      });

      it('TC-B03-4: Progress at 4000ms is exactly 50% (0.50)', () => {
        defense.startExitHold(0);
        defense.updateExitHold(4000);
        expect(defense.getExitProgress()).toBeCloseTo(0.5, 0.001);
      });

      it('TC-B03-5: Rapid tap (< 200ms) does not visibly budge progress ring', () => {
        defense.startExitHold(0);
        defense.updateExitHold(150);
        expect(defense.getExitProgress()).toBeLessThan(0.02);
        defense.cancelExitHold();
        expect(defense.getExitProgress()).toBe(0.0);
      });
    });

    // -------------------------------------------------------------------------
    // TC-B04: Extreme Viewport Dimensions & Aspect Ratios (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-B04: Extreme Viewport Dimensions & Aspect Ratios', () => {
      let engine;
      beforeEach(() => {
        engine = new ReferenceEngine();
      });

      it('TC-B04-1: Compact mobile portrait viewport (360 x 640) retains valid safe margins', () => {
        engine.width = 360;
        engine.height = 640;
        const dims = engine.getDimensions();
        expect(dims.safeArea.top).toBe(72);
        expect(dims.safeArea.bottom).toBe(568);
        expect(dims.safeArea.left).toBe(48);
        expect(dims.safeArea.right).toBe(312);
        expect(dims.safeArea.right - dims.safeArea.left).toBeGreaterThan(200);
      });

      it('TC-B04-2: Standard tablet landscape (1024 x 768) maintains proportional interior', () => {
        engine.width = 1024;
        engine.height = 768;
        const dims = engine.getDimensions();
        expect(dims.safeArea.right - dims.safeArea.left).toBe(928);
        expect(dims.safeArea.bottom - dims.safeArea.top).toBe(624);
      });

      it('TC-B04-3: Ultrawide display (2560 x 1080) maintains lateral boundary limits', () => {
        engine.width = 2560;
        engine.height = 1080;
        const dims = engine.getDimensions();
        expect(dims.safeArea.left).toBe(48);
        expect(dims.safeArea.right).toBe(2512);
      });

      it('TC-B04-4: Square viewport (500 x 500) computes positive safe region', () => {
        engine.width = 500;
        engine.height = 500;
        const dims = engine.getDimensions();
        expect(dims.safeArea.bottom - dims.safeArea.top).toBe(356);
      });

      it('TC-B04-5: Minimum boundary viewport (320 x 320) guarantees positive clearance', () => {
        engine.width = 320;
        engine.height = 320;
        const dims = engine.getDimensions();
        expect(dims.safeArea.right - dims.safeArea.left).toBe(224);
        expect(dims.safeArea.bottom - dims.safeArea.top).toBe(176);
      });
    });

    // -------------------------------------------------------------------------
    // TC-B05: Device Pixel Ratio (DPR) Clamping & High-DPI Safety (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-B05: DPR Clamping & High-DPI Safety', () => {
      let engine;
      beforeEach(() => {
        engine = new ReferenceEngine();
        engine.init({ clientWidth: 800, clientHeight: 600, getContext: () => ({ scale: () => {} }) });
      });

      it('TC-B05-1: Standard DPR 1.0 creates 1x backing store', () => {
        engine.updateDpi(1.0);
        expect(engine.dpr).toBe(1.0);
        expect(engine.canvas.width).toBe(800);
        expect(engine.canvas.height).toBe(600);
      });

      it('TC-B05-2: Retina DPR 2.0 creates 2x backing store', () => {
        engine.updateDpi(2.0);
        expect(engine.dpr).toBe(2.0);
        expect(engine.canvas.width).toBe(1600);
        expect(engine.canvas.height).toBe(1200);
      });

      it('TC-B05-3: Ultra-dense DPR 3.0 (iPhone Super Retina) is clamped at 2.0', () => {
        engine.updateDpi(3.0);
        expect(engine.dpr).toBe(MAX_DPR);
        expect(engine.canvas.width).toBe(1600);
      });

      it('TC-B05-4: Extreme DPR 4.0 is clamped at 2.0 to prevent GPU RAM exhaust', () => {
        engine.updateDpi(4.0);
        expect(engine.dpr).toBe(MAX_DPR);
        expect(engine.canvas.width).toBe(1600);
      });

      it('TC-B05-5: Fractional DPR 1.5 scales backing store cleanly', () => {
        engine.updateDpi(1.5);
        expect(engine.dpr).toBe(1.5);
        expect(engine.canvas.width).toBe(1200);
        expect(engine.canvas.height).toBe(900);
      });
    });

    // -------------------------------------------------------------------------
    // TC-B06: Zero vs Extreme High Swat Volume Stress (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-B06: Zero vs Extreme High Swat Volume Stress', () => {
      let engine;
      beforeEach(() => {
        engine = new ReferenceEngine();
        engine.init({ clientWidth: 1024, clientHeight: 768, getContext: () => ({ scale: () => {} }) });
        engine.start();
      });

      it('TC-B06-1: 0 swats over 60 seconds produces zero memory leak or orphan particles', () => {
        engine.advanceTime(60);
        expect(engine.particles.length).toBe(0);
        expect(engine.ripples.length).toBe(0);
      });

      it('TC-B06-2: 500 rapid bursts cleanly recycle and expire particles', () => {
        for (let i = 0; i < 500; i++) {
          engine.spawnBurst(500, 300);
          engine.update(0.016);
        }
        // Advance time by 1.0s to allow all expired particles to be culled
        engine.advanceTime(1.0);
        expect(engine.particles.length).toBe(0);
      });

      it('TC-B06-3: Particle alpha degradation scales monotonically toward zero', () => {
        engine.spawnBurst(400, 400);
        const p = engine.particles[0];
        expect(p.alpha).toBe(1.0);
        engine.update(0.1);
        expect(p.alpha).toBeLessThan(1.0);
      });

      it('TC-B06-4: High score accumulator handles 3+ digits cleanly', () => {
        engine.score = 999;
        engine.score++;
        expect(engine.score).toBe(1000);
      });

      it('TC-B06-5: Rapid successive hits do not produce NaN or Infinity coordinates', () => {
        const prey = new ReferencePreyAgent(1, 'laser', 'ludicrous', 'tiny');
        for (let i = 0; i < 50; i++) {
          prey.changeState('CAUGHT_RESPAWN');
          prey.update(0.9, { top: 72, bottom: 696, left: 48, right: 976 });
        }
        expect(Number.isFinite(prey.x)).toBe(true);
        expect(Number.isFinite(prey.y)).toBe(true);
      });
    });

    // -------------------------------------------------------------------------
    // TC-B07: Web Audio Auto-Unlock & Policy Fallback (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-B07: Web Audio Auto-Unlock & Policy Fallback', () => {
      let synth;
      let mockAudioCtx;

      beforeEach(() => {
        mockAudioCtx = {
          state: 'suspended',
          resume: async function () { this.state = 'running'; },
          destination: {},
          createGain: () => ({ connect: () => {}, gain: { value: 1 } }),
          createOscillator: () => ({
            connect: () => {},
            frequency: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
            start: () => {},
            stop: () => {}
          })
        };
        synth = new ReferenceSoundSynthesizer(mockAudioCtx);
      });

      it('TC-B07-1: Sound triggers before gesture do not throw uncaught errors', () => {
        expect(() => {
          synth.playPreyCatch('mouse');
        }).not.toThrow();
      });

      it('TC-B07-2: First user interaction gesture resumes suspended AudioContext', async () => {
        expect(mockAudioCtx.state).toBe('suspended');
        await synth.unlock();
        expect(mockAudioCtx.state).toBe('running');
      });

      it('TC-B07-3: Calling mute(true) blocks subsequent audio play requests', () => {
        synth.mute(true);
        synth.playPreyCatch('bug');
        expect(synth.lastCatchPlayed).toBeNull();
      });

      it('TC-B07-4: Calling mute(false) unblocks audio play requests', () => {
        synth.mute(true);
        synth.mute(false);
        synth.playPreyCatch('bug');
        expect(synth.lastCatchPlayed).toBe('bug');
      });

      it('TC-B07-5: Volume level is clamped between 0.0 and 1.0', () => {
        synth.setVolume(1.5);
        expect(synth.volume).toBe(1.0);
        synth.setVolume(-0.5);
        expect(synth.volume).toBe(0.0);
      });
    });

    // -------------------------------------------------------------------------
    // TC-B08: Camera Permission Denied & Hardware Unavailable (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-B08: Camera Permission Denied & Hardware Unavailable', () => {
      let cam;
      beforeEach(() => {
        cam = new ReferencePounceCam(null);
      });

      it('TC-B08-1: Camera rejection with NotAllowedError flags camera as disabled', async () => {
        cam.simulatedError = new Error('Permission denied');
        cam.simulatedError.name = 'NotAllowedError';

        let threw = false;
        try {
          await cam.init();
        } catch (e) {
          threw = true;
          expect(e.name).toBe('NotAllowedError');
        }
        expect(threw).toBe(true);
        expect(cam.isEnabled).toBe(false);
      });

      it('TC-B08-2: Camera rejection with NotFoundError (no hardware) handled gracefully', async () => {
        cam.simulatedError = new Error('No device');
        cam.simulatedError.name = 'NotFoundError';

        try {
          await cam.init();
        } catch (e) {
          expect(e.name).toBe('NotFoundError');
        }
        expect(cam.isEnabled).toBe(false);
      });

      it('TC-B08-3: Catch snapshot returns null when camera is disabled without crashing', async () => {
        cam.isEnabled = false;
        const snap = await cam.captureSnapshot('catch');
        expect(snap).toBeNull();
      });

      it('TC-B08-4: Trigger mode change to disabled forces isEnabled to false', () => {
        cam.isEnabled = true;
        cam.setTriggerMode('disabled');
        expect(cam.isEnabled).toBe(false);
      });

      it('TC-B08-5: Permission re-request is permitted if user enables toggle', async () => {
        cam.simulatedError = null;
        let origGetUserMedia = null;
        if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
          origGetUserMedia = navigator.mediaDevices.getUserMedia;
          navigator.mediaDevices.getUserMedia = async () => ({
            getVideoTracks: () => [{ stop() {} }]
          });
        }
        try {
          await cam.init();
          expect(cam.isEnabled).toBe(true);
        } finally {
          if (typeof navigator !== 'undefined' && navigator.mediaDevices && origGetUserMedia) {
            navigator.mediaDevices.getUserMedia = origGetUserMedia;
          }
        }
      });
    });

    // -------------------------------------------------------------------------
    // TC-B09: IndexedDB Storage Failure & Quota Exceeded (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-B09: IndexedDB Storage Failure & Quota Exceeded', () => {
      it('TC-B09-1: Storage quota error safely falls back to transient in-memory array', async () => {
        const mockQuotaDb = {
          open: () => {
            const req = { onsuccess: null, onerror: null };
            setTimeout(() => {
              const err = new Error('Quota exceeded');
              err.name = 'QuotaExceededError';
              if (req.onerror) req.onerror({ target: { error: err } });
            }, 0);
            return req;
          }
        };

        const cam = new ReferencePounceCam(mockQuotaDb);
        cam.isEnabled = true;
        cam.setTriggerMode('all');

        const snap = await cam.captureSnapshot('catch');
        expect(snap).toBeTruthy();
        expect(cam.transientPhotos.length).toBe(1);
      });

      it('TC-B09-2: Transient photo vault retrieves saved photos after DB error', async () => {
        const cam = new ReferencePounceCam(null);
        cam.isEnabled = true;
        cam.setTriggerMode('all');
        await cam.captureSnapshot('catch');
        const photos = await cam.getPhotos();
        expect(photos.length).toBe(1);
      });

      it('TC-B09-3: Transient photo vault deletes photos cleanly', async () => {
        const cam = new ReferencePounceCam(null);
        cam.isEnabled = true;
        cam.setTriggerMode('all');
        const p1 = await cam.captureSnapshot('catch');
        await cam.deletePhoto(p1.id);
        const photos = await cam.getPhotos();
        expect(photos.length).toBe(0);
      });

      it('TC-B09-4: Deleting non-existent photo ID does not corrupt store', async () => {
        const cam = new ReferencePounceCam(null);
        cam.isEnabled = true;
        await cam.captureSnapshot('catch');
        await cam.deletePhoto(999999);
        const photos = await cam.getPhotos();
        expect(photos.length).toBe(1);
      });

      it('TC-B09-5: Capture record includes retro badge and ISO timestamp', async () => {
        const cam = new ReferencePounceCam(null);
        cam.isEnabled = true;
        const snap = await cam.captureSnapshot('catch');
        expect(snap.badge).toBe('PAWPLAY_RETRO_CAM');
        expect(Date.parse(snap.timestamp)).toBeGreaterThan(0);
      });
    });

    // -------------------------------------------------------------------------
    // TC-B10: 10-Finger Paw Slap Burst Concurrency (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-B10: 10-Finger Paw Slap Burst Concurrency', () => {
      let controller;
      beforeEach(() => {
        controller = new ReferenceInputController();
      });

      it('TC-B10-1: 10 simultaneous touches register within single time step', () => {
        const now = 1000;
        for (let i = 1; i <= 10; i++) {
          controller.touchDown(i, 100 + i * 20, 200 + i * 15, now);
        }
        expect(controller.activeTouches.size).toBe(10);
      });

      it('TC-B10-2: Releasing 8 touches leaves remaining 2 touches active and tracked', () => {
        for (let i = 1; i <= 10; i++) {
          controller.touchDown(i, 100 + i * 20, 200 + i * 15, 1000);
        }
        for (let i = 1; i <= 8; i++) {
          controller.touchUp(i);
        }
        expect(controller.activeTouches.size).toBe(2);
        expect(controller.activeTouches.has(9)).toBe(true);
        expect(controller.activeTouches.has(10)).toBe(true);
      });

      it('TC-B10-3: Multi-finger swipe triggers pounce callback for each moving finger', () => {
        let pounceCount = 0;
        controller.init(null, () => { pounceCount++; });

        for (let i = 1; i <= 5; i++) {
          controller.touchDown(i, 200, 200 + i * 30, 1000);
          controller.touchMove(i, 300, 200 + i * 30, 1020);
        }
        expect(pounceCount).toBe(5);
      });

      it('TC-B10-4: Sitting paw among 10 fingers does not suppress other active fingers', () => {
        let activeSwats = 0;
        controller.init(null, () => { activeSwats++; });

        // Finger 1 is stationary resting paw
        controller.touchDown(1, 100, 100, 1000);
        controller.touchMove(1, 102, 101, 1450); // resting!

        // Finger 2 swats actively across screen
        controller.touchDown(2, 400, 400, 1450);
        controller.touchMove(2, 500, 400, 1470);

        expect(controller.isRestingPaw(1)).toBe(true);
        expect(controller.isRestingPaw(2)).toBe(false);
        expect(activeSwats).toBe(1);
      });

      it('TC-B10-5: Complete touch cleanup leaves activeTouches map empty', () => {
        for (let i = 1; i <= 5; i++) controller.touchDown(i, 100, 100, 1000);
        for (let i = 1; i <= 5; i++) controller.touchUp(i);
        expect(controller.activeTouches.size).toBe(0);
      });
    });

  });
});
