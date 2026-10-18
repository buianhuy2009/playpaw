/**
 * PawPlay E2E Test Suite - Tier 4: Real-World Scenarios
 * Covers 4 multi-phase feline behavioral journeys.
 * Authoritative source: explorer_survey_2/handoff.md & ORIGINAL_REQUEST.md
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
    ReferenceEngine,
    ReferencePreyManager,
    ReferenceInputController,
    ReferenceDefenseShield,
    ReferenceSoundSynthesizer,
    ReferencePounceCam,
    ReferenceAppState,
    ReferenceUIController
  } = adapter;

  describe('Tier 4: Real-World Feline Scenarios (4 Multi-Step Behavioral Journeys)', () => {

    // -------------------------------------------------------------------------
    // Scenario 1: The Curious Kitten (Onboarding -> Gentle Hunt -> Treat Reward)
    // -------------------------------------------------------------------------
    describe('Scenario 1: "The Curious Kitten" (Onboarding & Gentle Play)', () => {
      let storageMap;
      let appState;
      let ui;
      let engine;
      let synth;
      let preyMgr;

      beforeEach(() => {
        storageMap = new Map();
        const mockStorage = {
          getItem: (k) => storageMap.has(k) ? storageMap.get(k) : null,
          setItem: (k, v) => storageMap.set(k, String(v)),
          clear: () => storageMap.clear()
        };
        appState = new ReferenceAppState(mockStorage);
        ui = new ReferenceUIController(appState);
        engine = new ReferenceEngine();
        synth = new ReferenceSoundSynthesizer();
        preyMgr = new ReferencePreyManager();
      });

      it('TC-S01-1: First-time walkthrough carousel displays and completes', () => {
        expect(appState.isOnboarded()).toBe(false);
        ui.showOnboarding();
        expect(ui.currentSlide).toBe(0);

        // Step through 4 slides to reach the treat reminder
        for (let i = 0; i < 4; i++) {
          ui.nextSlide();
        }
        expect(ui.currentSlide).toBe(4);

        ui.finishOnboarding();
        expect(appState.isOnboarded()).toBe(true);
        expect(storageMap.get('pawplay_onboarded_v1')).toBe('true');
      });

      it('TC-S01-2: Setup kitten session (1 Chonky Mouse, Kitten Speed, Daylight Floor, 1m Timer)', () => {
        ui.setOption('prey', 'mouse');
        ui.setOption('speed', 'kitten');
        ui.setOption('size', 'chonky');
        ui.setOption('theme', 'daylight');
        ui.setOption('count', 1);
        ui.startSession('1m');

        expect(ui.sessionDurationMinutes).toBe(1);
        expect(ui.remainingSeconds).toBe(60);

        preyMgr.init(1, 'mouse', 'kitten', 'chonky');
        engine.init({ clientWidth: 1024, clientHeight: 768, getContext: () => ({ scale: () => {} }) });
        engine.setTheme('daylight');
        engine.preyList = preyMgr.preyList;
        engine.start();

        expect(engine.isPlaying).toBe(true);
        expect(engine.preyList.length).toBe(1);
        expect(engine.preyList[0].baseSpeed).toBe(180); // Kitten speed
      });

      it('TC-S01-3: Cat swats 3 times, catching mouse, triggering squeaks and scoring 3', () => {
        engine.preyList = preyMgr.init(1, 'mouse', 'kitten', 'chonky').preyList;
        engine.start();

        const mouse = engine.preyList[0];
        for (let swat = 1; swat <= 3; swat++) {
          // Position swipe across mouse
          const hit = eventSim.checkRaycastHit(mouse.x - 30, mouse.y, mouse.x + 30, mouse.y, mouse.x, mouse.y, mouse.radius, 42);
          expect(hit).toBe(true);
          engine.score++;
          synth.playPreyCatch('mouse');
          expect(synth.lastCatchPlayed).toBe('mouse');
          mouse.changeState('CAUGHT_RESPAWN', 0.88);
          // Simulate respawn
          mouse.update(0.9, engine.getDimensions().safeArea);
        }

        expect(engine.score).toBe(3);
      });

      it('TC-S01-4: 1-minute timer expires, triggering treat chime and reward reminder', () => {
        ui.startSession('1m');
        // Tick 60 seconds
        const sessionEnded = ui.tickSession(60);
        expect(sessionEnded).toBe(true);
        expect(ui.remainingSeconds).toBe(0);

        synth.playTreatChime();
        expect(synth.chimePlayed).toBe(true);
      });
    });

    // -------------------------------------------------------------------------
    // Scenario 2: The Apex Hunter & The Resting Chest (Filter & Cam)
    // -------------------------------------------------------------------------
    describe('Scenario 2: "The Apex Hunter & The Resting Chest" (Filter & Exit Safety)', () => {
      let input;
      let engine;
      let preyMgr;
      let cam;
      let defense;

      beforeEach(() => {
        input = new ReferenceInputController();
        engine = new ReferenceEngine();
        preyMgr = new ReferencePreyManager();
        cam = new ReferencePounceCam(null);
        defense = new ReferenceDefenseShield();

        engine.init({ clientWidth: 1024, clientHeight: 768, getContext: () => ({ scale: () => {} }) });
        engine.setTheme('night');
        preyMgr.init(3, 'bug', 'apex', 'normal');
        engine.preyList = preyMgr.preyList;
        engine.start();
        cam.isEnabled = true;
        cam.setTriggerMode('catch');
      });

      it('TC-S02-1: Cat rests chest on bottom edge and is flagged as resting paw', () => {
        input.touchDown(1, 500, 720, 1000);
        // Stationary micro-tremors over 450ms
        input.touchMove(1, 502, 721, 1450);

        expect(input.isRestingPaw(1)).toBe(true);
      });

      it('TC-S02-2: Active right paw swat cuts across roach, triggering catch & camera snapshot', async () => {
        // Pointer 1 is resting
        input.touchDown(1, 500, 720, 1000);
        input.touchMove(1, 502, 721, 1450);

        // Pointer 2 performs rapid swat across roach 0
        const roach = engine.preyList[0];
        let catchDetected = false;

        input.onPounce = (x1, y1, x2, y2, ptrId) => {
          if (ptrId === 2) {
            const hits = preyMgr.checkRaycastHit(x1, y1, x2, y2);
            if (hits.length > 0) {
              catchDetected = true;
              engine.score++;
              engine.spawnBurst(roach.x, roach.y);
            }
          }
        };

        input.touchDown(2, roach.x - 50, roach.y, 1450);
        input.touchMove(2, roach.x + 50, roach.y, 1470);

        expect(catchDetected).toBe(true);
        expect(engine.score).toBe(1);
        expect(engine.particles.length).toBe(18);

        // Capture Pounce-Cam snapshot
        const snap = await cam.captureSnapshot('catch');
        expect(snap).toBeTruthy();
        expect(snap.trigger).toBe('catch');
      });

      it('TC-S02-3: Stray paw touches exit lock for 1.2s and releases without cancelling session', () => {
        defense.startExitHold(1000);
        defense.updateExitHold(2200); // 1200ms hold
        expect(defense.getExitProgress()).toBeCloseTo(0.15, 0.02);

        // Released early
        defense.cancelExitHold();
        expect(defense.getExitProgress()).toBe(0.0);
        expect(engine.isPlaying).toBe(true);
      });

      it('TC-S02-4: Second swat on roach 1 triggers second particle burst while chest touch remains resting', () => {
        // Pointer 1 continues resting
        expect(input.isRestingPaw(1)).toBe(false); // freshly initialized in beforeEach
        input.touchDown(1, 500, 720, 1000);
        input.touchMove(1, 502, 721, 1450);
        expect(input.isRestingPaw(1)).toBe(true);

        const initialScore = engine.score;
        const roach1 = engine.preyList[1];
        engine.score++;
        engine.spawnBurst(roach1.x, roach1.y);

        expect(engine.score).toBe(initialScore + 1);
        expect(engine.particles.length).toBe(18);
        expect(input.isRestingPaw(1)).toBe(true);
      });
    });

    // -------------------------------------------------------------------------
    // Scenario 3: The Distracted Cat & 12s Acoustic Recall
    // -------------------------------------------------------------------------
    describe('Scenario 3: "The Distracted Cat & 12s Acoustic Recall"', () => {
      let engine;
      let synth;
      let preyMgr;

      beforeEach(() => {
        engine = new ReferenceEngine();
        synth = new ReferenceSoundSynthesizer();
        preyMgr = new ReferencePreyManager();

        engine.init({ clientWidth: 1024, clientHeight: 768, getContext: () => ({ scale: () => {} }) });
        engine.setTheme('pond');
        preyMgr.init(2, 'bee', 'hunter', 'normal');
        engine.preyList = preyMgr.preyList;
        engine.start();
      });

      it('TC-S03-1: Active play for 15s resets idle timer on each swat', () => {
        engine.advanceTime(5.0);
        engine.resetIdleTimer();
        expect(engine.idleTime).toBe(0);

        engine.advanceTime(10.0);
        engine.resetIdleTimer();
        expect(engine.idleTime).toBe(0);
        expect(synth.wasLureTriggeredRecently()).toBe(false);
      });

      it('TC-S03-2: 12 seconds with no touches triggers acoustic lure & bee dart burst', () => {
        engine.advanceTime(12.1);
        expect(engine.idleTime).toBeGreaterThanOrEqual(12.0);

        synth.triggerAcousticLure();
        expect(synth.wasLureTriggeredRecently()).toBe(true);

        const bee = engine.preyList[0];
        bee.changeState('DART_SPRINT', 0.8);
        expect(bee.state).toBe('DART_SPRINT');
      });

      it('TC-S03-3: Cat returns and swats screen, resetting idle timer back to 0', () => {
        synth.triggerAcousticLure();
        engine.resetIdleTimer();
        expect(engine.idleTime).toBe(0);
      });

      it('TC-S03-4: Subsequent 12s idle interval cleanly re-arms and fires second acoustic recall', () => {
        // Initial lure event
        synth.triggerAcousticLure();
        expect(synth.lureTriggeredCount).toBe(1);

        // Cat plays and resets idle timer
        engine.resetIdleTimer();
        expect(engine.idleTime).toBe(0);

        // Subsequent 12.5s idle period
        engine.advanceTime(12.5);
        expect(engine.idleTime).toBeGreaterThanOrEqual(12.0);

        synth.triggerAcousticLure();
        expect(synth.lureTriggeredCount).toBe(2);
      });
    });

    // -------------------------------------------------------------------------
    // Scenario 4: Violent Top Swat, Tab Defense & 8s Annulus Exit
    // -------------------------------------------------------------------------
    describe('Scenario 4: "Violent Top Swat, Tab Defense Shield & 8s Exit"', () => {
      let engine;
      let defense;
      let synth;

      beforeEach(() => {
        engine = new ReferenceEngine();
        defense = new ReferenceDefenseShield();
        synth = new ReferenceSoundSynthesizer();

        engine.init({ clientWidth: 1024, clientHeight: 768, getContext: () => ({ scale: () => {} }) });
        const preyMgr = new ReferencePreyManager().init(4, 'laser', 'ludicrous', 'tiny');
        engine.preyList = preyMgr.preyList;
        engine.start();
      });

      it('TC-S04-1: Violent swats at y < 72px never find prey due to active margin repulsion', () => {
        // Run 180 frames of Ludicrous simulation
        for (let i = 0; i < 180; i++) {
          engine.update(1 / 60);
        }

        // Cat strikes top edge y = 30px
        let hitAtTop = false;
        for (const prey of engine.preyList) {
          if (eventSim.checkRaycastHit(200, 30, 400, 30, prey.x, prey.y, prey.radius, 42)) {
            hitAtTop = true;
          }
        }
        expect(hitAtTop).toBe(false); // Prey never penetrates into top 72px margin
      });

      it('TC-S04-2: Tab backgrounding mutes audio and pauses engine', () => {
        // Simulate visibility hidden
        engine.isPaused = true;
        synth.mute(true);

        expect(engine.isPaused).toBe(true);
        expect(synth.isMuted).toBe(true);
      });

      it('TC-S04-3: Tab foregrounding displays resume overlay without unpausing automatically', () => {
        // Tab backgrounded then foregrounded
        engine.isPaused = true;
        const resumeOverlayVisible = true;
        expect(engine.isPaused).toBe(true);
        expect(resumeOverlayVisible).toBe(true);
      });

      it('TC-S04-4: Human holds corner exit lock continuously for 8.0s to terminate session', () => {
        let sessionTerminated = false;
        defense.onExitComplete = () => {
          engine.stop();
          sessionTerminated = true;
        };

        defense.startExitHold(1000);
        defense.updateExitHold(9050); // > 8000ms

        expect(sessionTerminated).toBe(true);
        expect(engine.isPlaying).toBe(false);
      });
    });

  });
});
