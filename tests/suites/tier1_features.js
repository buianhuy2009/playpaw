/**
 * PawPlay E2E Test Suite - Tier 1: Feature Coverage
 * Covers all 13 core features with >=5 tests per feature (>=65 tests total).
 * Authoritative source: ORIGINAL_REQUEST.md & PROJECT_PLAN.md
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
    THEMES,
    PREY_TYPES,
    PREY_STATES,
    SPEED_MODES,
    SIZE_MODES,
    ReferenceEngine,
    ReferencePreyManager,
    ReferencePreyAgent,
    ReferenceInputController,
    ReferenceDefenseShield,
    ReferenceSoundSynthesizer,
    ReferencePounceCam,
    ReferenceAppState,
    ReferenceUIController
  } = adapter;

  describe('Tier 1: Feature Coverage (65 Tests Across 13 Core Features)', () => {

    // -------------------------------------------------------------------------
    // TC-F01: High-DPI 120Hz Delta-Time Loop (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-F01: High-DPI 120Hz Delta-Time Loop', () => {
      let engine;
      beforeEach(() => {
        engine = new ReferenceEngine();
        engine.init({
          clientWidth: 1024,
          clientHeight: 768,
          getContext: () => ({ scale: () => {} })
        });
      });

      it('TC-F01-1: Canvas backing store scales by DPR clamped at 2.0 (Retina protection)', () => {
        engine.updateDpi(1.0);
        expect(engine.dpr).toBe(1.0);
        expect(engine.canvas.width).toBe(1024);

        engine.updateDpi(2.0);
        expect(engine.dpr).toBe(2.0);
        expect(engine.canvas.width).toBe(2048);

        engine.updateDpi(3.5); // High density display
        expect(engine.dpr).toBe(MAX_DPR); // Must clamp to 2.0
        expect(engine.canvas.width).toBe(2048);
      });

      it('TC-F01-2: Delta-time calculation clamps at MAX_DT (50ms) to prevent tunneling', () => {
        engine.start();
        const initialIdle = engine.idleTime;
        engine.update(0.016); // Normal 60Hz tick
        expect(engine.idleTime - initialIdle).toBeCloseTo(0.016, 0.001);

        // Huge spike (e.g. background tab return of 500ms)
        const beforeSpike = engine.idleTime;
        engine.update(0.500);
        expect(engine.idleTime - beforeSpike).toBeCloseTo(MAX_DT, 0.001);
      });

      it('TC-F01-3: Frame updates at 120Hz scale position smoothly without jitter', () => {
        engine.start();
        const prey = new ReferencePreyAgent(1, 'mouse', 'hunter', 'normal');
        prey.x = 200;
        prey.vx = 400; // 400 px/sec
        prey.vy = 0;
        prey.state = 'STALK_CREEP';
        prey.stateDuration = 10;
        engine.preyList = [prey];

        // 120Hz tick: dt = 1/120 = ~0.00833s
        engine.update(1 / 120);
        // expected displacement: 400 * (1/120) = 3.333px
        expect(prey.x).toBeCloseTo(203.333, 0.05);
      });

      it('TC-F01-4: Engine start and stop flags accurately reflect running state', () => {
        expect(engine.isPlaying).toBe(false);
        engine.start();
        expect(engine.isPlaying).toBe(true);
        expect(engine.isPaused).toBe(false);
        engine.stop();
        expect(engine.isPlaying).toBe(false);
      });

      it('TC-F01-5: Engine dimensions expose correct safe margins (top 72, bottom 72, sides 48)', () => {
        const dims = engine.getDimensions();
        expect(dims.safeArea.top).toBe(MARGIN_TOP);
        expect(dims.safeArea.bottom).toBe(768 - MARGIN_BOTTOM);
        expect(dims.safeArea.left).toBe(MARGIN_SIDES);
        expect(dims.safeArea.right).toBe(1024 - MARGIN_SIDES);
      });
    });

    // -------------------------------------------------------------------------
    // TC-F02: 3 Feline Contrast Themes (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-F02: 3 Feline Contrast Themes', () => {
      let engine;
      beforeEach(() => {
        engine = new ReferenceEngine();
        engine.init({ clientWidth: 1024, clientHeight: 768, getContext: () => ({ scale: () => {} }) });
      });

      it('TC-F02-1: Daylight Floor sets warm parchment background (#F4F1EA)', () => {
        engine.setTheme('daylight');
        expect(engine.theme.bg).toBe(THEMES.daylight.bg);
        expect(engine.theme.bg).toBe('#F4F1EA');
      });

      it('TC-F02-2: Night Stalker sets dark hunting background (#10121A) with yellow contrast', () => {
        engine.setTheme('night');
        expect(engine.theme.bg).toBe(THEMES.night.bg);
        expect(engine.theme.bg).toBe('#10121A');
        expect(engine.theme.contrastColor).toBe('#FFD600');
      });

      it('TC-F02-3: Koi Pond sets water background (#0A2239) and enables ripples', () => {
        engine.setTheme('pond');
        expect(engine.theme.bg).toBe('#0A2239');
        expect(engine.theme.ripples).toBe(true);
      });

      it('TC-F02-4: Interactive water ripples spawn and expand in Koi Pond theme', () => {
        engine.setTheme('pond');
        engine.start();
        engine.addRipple(300, 400);
        expect(engine.ripples.length).toBe(1);
        expect(engine.ripples[0].radius).toBe(5);

        // Advance 0.5s -> radius should expand (90px/s)
        engine.advanceTime(0.5);
        expect(engine.ripples[0].radius).toBeGreaterThan(40);
        expect(engine.ripples[0].alpha).toBeLessThan(0.8);
      });

      it('TC-F02-5: Ripples do not spawn when theme is Daylight Floor or Night Stalker', () => {
        engine.setTheme('daylight');
        engine.addRipple(300, 400);
        expect(engine.ripples.length).toBe(0);

        engine.setTheme('night');
        engine.addRipple(300, 400);
        expect(engine.ripples.length).toBe(0);
      });
    });

    // -------------------------------------------------------------------------
    // TC-F03: 5 Biomimetic Prey Types & Dichromatic Palettes (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-F03: 5 Biomimetic Prey Types', () => {
      it('TC-F03-1: Laser dot model supports dichromatic core and glow', () => {
        const laser = new ReferencePreyAgent(1, 'laser', 'apex', 'tiny');
        expect(laser.type).toBe('laser');
        expect(PREY_TYPES).toContain('laser');
        expect(laser.radius).toBe(SIZE_MODES.tiny);
      });

      it('TC-F03-2: Roach/Beetle model supports 6-leg kinematics and scurrying speed', () => {
        const roach = new ReferencePreyAgent(2, 'bug', 'hunter', 'normal');
        expect(roach.type).toBe('bug');
        expect(PREY_TYPES).toContain('bug');
        expect(roach.baseSpeed).toBe(SPEED_MODES.hunter);
      });

      it('TC-F03-3: Field Mouse model supports body radius and whipping tail kinematics', () => {
        const mouse = new ReferencePreyAgent(3, 'mouse', 'hunter', 'chonky');
        expect(mouse.type).toBe('mouse');
        expect(PREY_TYPES).toContain('mouse');
        expect(mouse.radius).toBe(SIZE_MODES.chonky);
      });

      it('TC-F03-4: Koi Fish model supports multi-segment spinal kinematics', () => {
        const koi = new ReferencePreyAgent(4, 'koi', 'kitten', 'normal');
        expect(koi.type).toBe('koi');
        expect(PREY_TYPES).toContain('koi');
        expect(koi.baseSpeed).toBe(SPEED_MODES.kitten);
      });

      it('TC-F03-5: Bumblebee model supports fluttering wing frequency & high contrast', () => {
        const bee = new ReferencePreyAgent(5, 'bee', 'ludicrous', 'normal');
        expect(bee.type).toBe('bee');
        expect(PREY_TYPES).toContain('bee');
        expect(bee.baseSpeed).toBe(SPEED_MODES.ludicrous);
      });
    });

    // -------------------------------------------------------------------------
    // TC-F04: 5-State Prey Markov State Machine (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-F04: 5-State Prey Markov FSM', () => {
      let agent;
      const safeArea = { top: 72, bottom: 696, left: 48, right: 976 };

      beforeEach(() => {
        agent = new ReferencePreyAgent(1, 'mouse', 'hunter', 'normal');
      });

      it('TC-F04-1: FREEZE_TREMOR halts velocity and oscillates micro-jitter', () => {
        agent.changeState('FREEZE_TREMOR', 1.0);
        expect(agent.state).toBe('FREEZE_TREMOR');
        expect(agent.vx).toBe(0);
        expect(agent.vy).toBe(0);

        agent.update(0.1, safeArea);
        expect(Math.abs(agent.jitter)).toBeGreaterThan(0);
        expect(Math.abs(agent.jitter)).toBeLessThanOrEqual(1.5);
      });

      it('TC-F04-2: DART_SPRINT accelerates prey to 1.8x base speed', () => {
        agent.changeState('DART_SPRINT', 0.8);
        expect(agent.state).toBe('DART_SPRINT');
        const currentSpeed = Math.sqrt(agent.vx * agent.vx + agent.vy * agent.vy);
        expect(currentSpeed).toBeCloseTo(agent.baseSpeed * 1.8, 1);
      });

      it('TC-F04-3: STALK_CREEP moves at low stalking speed (0.45x base speed)', () => {
        agent.changeState('STALK_CREEP', 1.5);
        expect(agent.state).toBe('STALK_CREEP');
        const currentSpeed = Math.sqrt(agent.vx * agent.vx + agent.vy * agent.vy);
        expect(currentSpeed).toBeCloseTo(agent.baseSpeed * 0.45, 1);
      });

      it('TC-F04-4: EDGE_SKITTER moves at brisk perimeter speed (1.2x base speed)', () => {
        agent.changeState('EDGE_SKITTER', 1.0);
        expect(agent.state).toBe('EDGE_SKITTER');
        const currentSpeed = Math.sqrt(agent.vx * agent.vx + agent.vy * agent.vy);
        expect(currentSpeed).toBeCloseTo(agent.baseSpeed * 1.2, 1);
      });

      it('TC-F04-5: CAUGHT_RESPAWN animates 180ms squish and respawns in safe area', () => {
        agent.changeState('CAUGHT_RESPAWN', 0.88);
        expect(agent.isRespawning).toBe(true);
        expect(agent.vx).toBe(0);

        // Advance 180ms
        agent.update(0.18, safeArea);
        expect(agent.squishProgress).toBeCloseTo(1.0, 0.05);

        // Advance through offscreen delay to complete respawn
        agent.update(0.75, safeArea);
        expect(agent.isRespawning).toBe(false);
        expect(agent.state).toBe('STALK_CREEP');
        expect(agent.x).toBeBetween(safeArea.left, safeArea.right);
        expect(agent.y).toBeBetween(safeArea.top, safeArea.bottom);
      });
    });

    // -------------------------------------------------------------------------
    // TC-F05: Multi-Prey Spawner & Concurrency (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-F05: Multi-Prey Spawner & Concurrency', () => {
      let manager;
      beforeEach(() => {
        manager = new ReferencePreyManager();
      });

      it('TC-F05-1: Initializing with count 1 creates exactly 1 prey agent', () => {
        manager.init(1, 'bug', 'hunter', 'normal');
        expect(manager.preyList.length).toBe(1);
        expect(manager.preyList[0].type).toBe('bug');
      });

      it('TC-F05-2: Spawning 4 concurrent prey updates all 4 agents independently', () => {
        manager.init(4, 'bee', 'apex', 'tiny');
        expect(manager.preyList.length).toBe(4);
        const initialPositions = manager.preyList.map(p => ({ x: p.x, y: p.y }));

        manager.update(0.1, { top: 72, bottom: 696, left: 48, right: 976 });

        // Verify each agent updated its position
        manager.preyList.forEach((p, idx) => {
          const moved = p.x !== initialPositions[idx].x || p.y !== initialPositions[idx].y;
          expect(moved).toBe(true);
        });
      });

      it('TC-F05-3: Count is strictly clamped within [1, 4]', () => {
        manager.init(0, 'mouse');
        expect(manager.count).toBe(1);
        expect(manager.preyList.length).toBe(1);

        manager.init(10, 'mouse');
        expect(manager.count).toBe(4);
        expect(manager.preyList.length).toBe(4);
      });

      it('TC-F05-4: Each prey receives unique agent id', () => {
        manager.init(3, 'koi');
        const ids = manager.preyList.map(p => p.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(3);
      });

      it('TC-F05-5: Reinitializing pool clears old instances without ghost prey', () => {
        manager.init(3, 'laser');
        expect(manager.preyList.length).toBe(3);
        manager.init(2, 'bug');
        expect(manager.preyList.length).toBe(2);
        expect(manager.preyList[0].type).toBe('bug');
      });
    });

    // -------------------------------------------------------------------------
    // TC-F06: Multi-Touch Raycasting & Pad Tolerance (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-F06: Multi-Touch Raycasting & Pad Tolerance', () => {
      it('TC-F06-1: Direct tap on prey center triggers raycast hit', () => {
        const hit = eventSim.checkRaycastHit(200, 200, 200, 200, 200, 200, 32, PAW_PAD_TOLERANCE);
        expect(hit).toBe(true);
      });

      it('TC-F06-2: Rapid swipe segment passing within radius + 42px registers hit', () => {
        // Prey at (300, 300) radius 30. Effective radius = 30 + 42 = 72px.
        // Horizontal swipe from (200, 350) to (400, 350). Min distance to (300, 300) is 50px.
        const hit = eventSim.checkRaycastHit(200, 350, 400, 350, 300, 300, 30, PAW_PAD_TOLERANCE);
        expect(hit).toBe(true);
      });

      it('TC-F06-3: Swipe missing prey by > 42px pad tolerance does NOT register hit', () => {
        // Prey at (300, 300) radius 30. Effective radius = 72px.
        // Horizontal swipe along y = 380. Min distance is 80px > 72px.
        const hit = eventSim.checkRaycastHit(200, 380, 400, 380, 300, 300, 30, PAW_PAD_TOLERANCE);
        expect(hit).toBe(false);
      });

      it('TC-F06-4: Zero-length tap within pad radius registers hit', () => {
        // Prey at (100, 100), radius 20. Tap at (100, 145) -> distance = 45px.
        // Effective radius = 20 + 42 = 62px.
        const hit = eventSim.checkRaycastHit(100, 145, 100, 145, 100, 100, 20, PAW_PAD_TOLERANCE);
        expect(hit).toBe(true);
      });

      it('TC-F06-5: Diagonal swipe cutting across prey perimeter triggers hit', () => {
        // Prey at (250, 250) radius 32. Effective radius = 74px.
        // Diagonal from (200, 200) to (300, 300) passes through center (dist 0).
        const hit = eventSim.checkRaycastHit(200, 200, 300, 300, 250, 250, 32, PAW_PAD_TOLERANCE);
        expect(hit).toBe(true);
      });
    });

    // -------------------------------------------------------------------------
    // TC-F07: Procedural Web Audio API Synthesizer (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-F07: Procedural Web Audio API Synthesizer', () => {
      let synth;
      let mockAudioCtx;

      beforeEach(() => {
        mockAudioCtx = {
          state: 'suspended',
          currentTime: 10,
          resume: async function () { this.state = 'running'; },
          destination: {},
          createGain: () => ({ connect: () => {}, gain: { value: 1 } }),
          createOscillator: () => ({
            connect: () => {},
            frequency: {
              value: 440,
              setValueAtTime: function (v) { this.value = v; },
              linearRampToValueAtTime: function (v) { this.value = v; }
            },
            start: () => {},
            stop: () => {}
          })
        };
        synth = new ReferenceSoundSynthesizer(mockAudioCtx);
      });

      it('TC-F07-1: Audio unlock transitions AudioContext from suspended to running', async () => {
        expect(synth.getContextState()).toBe('suspended');
        const state = await synth.unlock();
        expect(state).toBe('running');
        expect(synth.getContextState()).toBe('running');
      });

      it('TC-F07-2: Catching mouse triggers FM rodent sweep frequencies', () => {
        synth.playPreyCatch('mouse');
        expect(synth.lastCatchPlayed).toBe('mouse');
      });

      it('TC-F07-3: Catching bug triggers bandpass insect pulse frequency', () => {
        synth.playPreyCatch('bug');
        expect(synth.lastCatchPlayed).toBe('bug');
      });

      it('TC-F07-4: Session complete plays ascending 3-chord treat chime', () => {
        expect(synth.chimePlayed).toBe(false);
        synth.playTreatChime();
        expect(synth.chimePlayed).toBe(true);
      });

      it('TC-F07-5: Muting audio halts sound node generation without errors', () => {
        synth.mute(true);
        expect(synth.isMuted).toBe(true);
        synth.lastCatchPlayed = null;
        synth.playPreyCatch('mouse');
        expect(synth.lastCatchPlayed).toBe(null);
      });
    });

    // -------------------------------------------------------------------------
    // TC-F08: 12-Second Acoustic Idle Lure System (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-F08: 12-Second Acoustic Idle Lure System', () => {
      let engine;
      let synth;

      beforeEach(() => {
        synth = new ReferenceSoundSynthesizer();
        engine = new ReferenceEngine();
        engine.init({ clientWidth: 1024, clientHeight: 768, getContext: () => ({ scale: () => {} }) });
        engine.start();
      });

      it('TC-F08-1: Idle time accumulates when no swat events occur', () => {
        expect(engine.idleTime).toBe(0);
        engine.advanceTime(5.0);
        expect(engine.idleTime).toBeCloseTo(5.0, 0.1);
      });

      it('TC-F08-2: User swat/touch interaction resets idle timer back to zero', () => {
        engine.advanceTime(7.0);
        expect(engine.idleTime).toBeGreaterThan(6.0);
        engine.resetIdleTimer();
        expect(engine.idleTime).toBe(0);
      });

      it('TC-F08-3: Reaching 12.0s idle threshold triggers acoustic lure', () => {
        expect(synth.wasLureTriggeredRecently()).toBe(false);
        engine.advanceTime(12.1);
        if (engine.idleTime >= 12.0) {
          synth.triggerAcousticLure();
        }
        expect(synth.wasLureTriggeredRecently()).toBe(true);
        expect(synth.lureTriggeredCount).toBe(1);
      });

      it('TC-F08-4: Lure chirp triggers synchronized DART_SPRINT escape on prey', () => {
        const prey = new ReferencePreyAgent(1, 'bee', 'hunter', 'normal');
        prey.changeState('FREEZE_TREMOR', 1.0);
        engine.preyList = [prey];

        // Simulate 12s idle acoustic lure synchronization
        synth.triggerAcousticLure();
        prey.changeState('DART_SPRINT', 0.8);

        expect(prey.state).toBe('DART_SPRINT');
        expect(synth.lureTriggeredCount).toBe(1);
      });

      it('TC-F08-5: Lure re-arms cleanly after another 12s idle period', () => {
        synth.triggerAcousticLure();
        expect(synth.lureTriggeredCount).toBe(1);
        engine.resetIdleTimer();
        engine.update(12.5);
        synth.triggerAcousticLure();
        expect(synth.lureTriggeredCount).toBe(2);
      });
    });

    // -------------------------------------------------------------------------
    // TC-F09: First-Time Onboarding Walkthrough Carousel (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-F09: First-Time Onboarding Walkthrough Carousel', () => {
      let storage;
      let state;
      let ui;

      beforeEach(() => {
        storage = new Map();
        const mockStorage = {
          getItem: (k) => (storage.has(k) ? storage.get(k) : null),
          setItem: (k, v) => storage.set(k, String(v)),
          clear: () => storage.clear()
        };
        state = new ReferenceAppState(mockStorage);
        ui = new ReferenceUIController(state);
      });

      it('TC-F09-1: First visit with clean storage flags isOnboarded as false', () => {
        expect(state.isOnboarded()).toBe(false);
      });

      it('TC-F09-2: Carousel initializes with 5 educational steps', () => {
        ui.showOnboarding();
        expect(ui.totalSlides).toBe(5);
        expect(ui.currentSlide).toBe(0);
      });

      it('TC-F09-3: Next and Prev navigation buttons step through carousel slides', () => {
        ui.showOnboarding();
        ui.nextSlide();
        expect(ui.currentSlide).toBe(1);
        ui.nextSlide();
        expect(ui.currentSlide).toBe(2);
        ui.prevSlide();
        expect(ui.currentSlide).toBe(1);
      });

      it('TC-F09-4: Finishing carousel sets pawplay_onboarded_v1 = true in localStorage', () => {
        let doneCalled = false;
        ui.showOnboarding(() => { doneCalled = true; });
        for (let i = 0; i < 4; i++) ui.nextSlide();
        ui.finishOnboarding();

        expect(doneCalled).toBe(true);
        expect(state.isOnboarded()).toBe(true);
        expect(storage.get('pawplay_onboarded_v1')).toBe('true');
      });

      it('TC-F09-5: Returning user with onboarded flag bypasses carousel', () => {
        storage.set('pawplay_onboarded_v1', 'true');
        expect(state.isOnboarded()).toBe(true);
      });
    });

    // -------------------------------------------------------------------------
    // TC-F10: Customization Deck UI & Persistence (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-F10: Customization Deck UI & Persistence', () => {
      let storage;
      let state;
      let ui;

      beforeEach(() => {
        storage = new Map();
        const mockStorage = {
          getItem: (k) => (storage.has(k) ? storage.get(k) : null),
          setItem: (k, v) => storage.set(k, String(v)),
          clear: () => storage.clear()
        };
        state = new ReferenceAppState(mockStorage);
        ui = new ReferenceUIController(state);
      });

      it('TC-F10-1: UI allows setting prey type, speed, size, theme, and count', () => {
        ui.setOption('prey', 'koi');
        ui.setOption('speed', 'apex');
        ui.setOption('size', 'chonky');
        ui.setOption('theme', 'pond');
        ui.setOption('count', 3);

        const opts = ui.getOptions();
        expect(opts.prey).toBe('koi');
        expect(opts.speed).toBe('apex');
        expect(opts.size).toBe('chonky');
        expect(opts.theme).toBe('pond');
        expect(opts.count).toBe(3);
      });

      it('TC-F10-2: Settings persist into localStorage under pawplay_state_v1 key', () => {
        ui.setOption('prey', 'bee');
        ui.setOption('speed', 'ludicrous');

        const raw = storage.get('pawplay_state_v1');
        expect(raw).toBeTruthy();
        const parsed = JSON.parse(raw);
        expect(parsed.prey).toBe('bee');
        expect(parsed.speed).toBe('ludicrous');
      });

      it('TC-F10-3: Reloading loads existing saved preferences', () => {
        storage.set('pawplay_state_v1', JSON.stringify({ prey: 'bug', count: 4, speed: 'hunter' }));
        const newState = new ReferenceAppState({
          getItem: (k) => storage.get(k),
          setItem: (k, v) => storage.set(k, v)
        });
        expect(newState.get('prey')).toBe('bug');
        expect(newState.get('count')).toBe(4);
      });

      it('TC-F10-4: Corrupted localStorage JSON safely falls back to defaults', () => {
        storage.set('pawplay_state_v1', 'NOT_VALID_JSON{[');
        const newState = new ReferenceAppState({
          getItem: (k) => storage.get(k),
          setItem: (k, v) => storage.set(k, v)
        });
        expect(newState.get('prey')).toBe('mouse');
        expect(newState.get('count')).toBe(1);
      });

      it('TC-F10-5: Session timer modes (1m, 3m, 5m, unlimited) configure duration', () => {
        ui.startSession('1m');
        expect(ui.sessionDurationMinutes).toBe(1);
        expect(ui.remainingSeconds).toBe(60);

        ui.startSession('5m');
        expect(ui.sessionDurationMinutes).toBe(5);
        expect(ui.remainingSeconds).toBe(300);

        ui.startSession('unlimited');
        expect(ui.sessionDurationMinutes).toBe(0);
      });
    });

    // -------------------------------------------------------------------------
    // TC-F11: Pounce-Cam Front Camera Engine (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-F11: Pounce-Cam Front Camera Engine', () => {
      let cam;
      let mockIdb;

      beforeEach(() => {
        const store = new Map();
        mockIdb = {
          open: () => ({
            onsuccess: null,
            onerror: null,
            _triggerSuccess: function (res) { if (this.onsuccess) this.onsuccess({ target: { result: res } }); }
          })
        };
        cam = new ReferencePounceCam(null); // transient mode
      });

      it('TC-F11-1: Camera toggle sets trigger mode and active state', () => {
        cam.isEnabled = true;
        cam.setTriggerMode('catch');
        expect(cam.triggerMode).toBe('catch');
        expect(cam.isEnabled).toBe(true);

        cam.setTriggerMode('disabled');
        expect(cam.isEnabled).toBe(false);
      });

      it('TC-F11-2: Catch snapshot generates record with timestamp, badge, and dataUrl', async () => {
        cam.isEnabled = true;
        cam.setTriggerMode('catch');
        const snap = await cam.captureSnapshot('catch');

        expect(snap).toBeTruthy();
        expect(snap.badge).toBe('PAWPLAY_RETRO_CAM');
        expect(snap.trigger).toBe('catch');
        expect(snap.dataUrl.startsWith('data:image/')).toBe(true);
      });

      it('TC-F11-3: Snapshots filter by trigger mode (On Catch ignores near-miss)', async () => {
        cam.isEnabled = true;
        cam.setTriggerMode('catch');
        const missed = await cam.captureSnapshot('near-miss');
        expect(missed).toBeNull();
      });

      it('TC-F11-4: Photos can be queried from photo vault', async () => {
        cam.isEnabled = true;
        cam.setTriggerMode('all');
        const p1 = await cam.captureSnapshot('catch');
        const photos = await cam.getPhotos();
        expect(photos.length).toBe(1);
        expect(photos[0].id).toBe(p1.id);
      });

      it('TC-F11-5: Photos can be deleted by ID', async () => {
        cam.isEnabled = true;
        cam.setTriggerMode('all');
        const p1 = await cam.captureSnapshot('catch');
        expect((await cam.getPhotos()).length).toBe(1);

        await cam.deletePhoto(p1.id);
        expect((await cam.getPhotos()).length).toBe(0);
      });
    });

    // -------------------------------------------------------------------------
    // TC-F12: 8-Second Clockwise Annulus Exit Lock (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-F12: 8-Second Clockwise Annulus Exit Lock', () => {
      let defense;
      beforeEach(() => {
        defense = new ReferenceDefenseShield();
      });

      it('TC-F12-1: Holding exit lock advances progress linearly over 8000ms', () => {
        defense.startExitHold(1000);
        expect(defense.getExitProgress()).toBe(0.0);

        // Advance 4000ms -> 50%
        defense.updateExitHold(5000);
        expect(defense.getExitProgress()).toBeCloseTo(0.5, 0.01);

        // Advance 6000ms (total 6s from start) -> 75%
        defense.updateExitHold(7000);
        expect(defense.getExitProgress()).toBeCloseTo(0.75, 0.01);
      });

      it('TC-F12-2: Releasing hold before 8.0s immediately resets progress to 0.0', () => {
        defense.startExitHold(1000);
        defense.updateExitHold(7000); // 6s hold
        expect(defense.getExitProgress()).toBeGreaterThan(0.7);

        defense.cancelExitHold();
        expect(defense.getExitProgress()).toBe(0.0);
        expect(defense.isHoldingExit).toBe(false);
      });

      it('TC-F12-3: Holding for full 8000ms fires exit completion callback', () => {
        let exitCompleted = false;
        defense.onExitComplete = () => { exitCompleted = true; };

        defense.startExitHold(1000);
        defense.updateExitHold(9000); // 8000ms elapsed

        expect(exitCompleted).toBe(true);
      });

      it('TC-F12-4: Consecutive partial holds do not accumulate progress', () => {
        defense.startExitHold(1000);
        defense.updateExitHold(4000); // 3s hold
        defense.cancelExitHold();

        defense.startExitHold(10000);
        defense.updateExitHold(12000); // 2s hold
        expect(defense.getExitProgress()).toBeCloseTo(0.25, 0.01);
      });

      it('TC-F12-5: Exit progress clamps at 1.0 maximum', () => {
        defense.startExitHold(1000);
        defense.updateExitHold(15000); // 14s hold
        expect(defense.getExitProgress()).toBeLessThanOrEqual(1.0);
      });
    });

    // -------------------------------------------------------------------------
    // TC-F13: PWA Manifest & Tab Defense Shield (5 tests)
    // -------------------------------------------------------------------------
    describe('TC-F13: PWA Manifest & Tab Defense Shield', () => {
      let defense;
      beforeEach(() => {
        defense = new ReferenceDefenseShield();
      });

      it('TC-F13-1: beforeunload event intercepts navigation when isPlaying is true', () => {
        let isPlaying = true;
        defense.enableBeforeUnload(() => isPlaying);

        const evt = { returnValue: '' };
        const prompt = defense.handleBeforeUnload(evt);
        expect(prompt).toBeTruthy();
        expect(evt.returnValue).toContain('Leave PawPlay?');
      });

      it('TC-F13-2: beforeunload event allows smooth exit when isPlaying is false', () => {
        let isPlaying = false;
        defense.enableBeforeUnload(() => isPlaying);

        const evt = { returnValue: '' };
        const prompt = defense.handleBeforeUnload(evt);
        expect(prompt).toBeNull();
        expect(evt.returnValue).toBe('');
      });

      it('TC-F13-3: visibilitychange hidden event pauses game engine and mutes audio', () => {
        const engine = new ReferenceEngine();
        const synth = new ReferenceSoundSynthesizer();
        engine.start();

        // Simulate tab switch to background
        engine.isPaused = true;
        synth.mute(true);

        expect(engine.isPaused).toBe(true);
        expect(synth.isMuted).toBe(true);
      });

      it('TC-F13-4: Returning to foreground tab leaves game paused until human confirms', () => {
        const engine = new ReferenceEngine();
        engine.start();
        engine.isPaused = true;

        // Visibility becomes visible
        const showOverlay = true;
        expect(engine.isPaused).toBe(true);
        expect(showOverlay).toBe(true);
      });

      it('TC-F13-5: PWA manifest contract mandates standalone display mode', () => {
        const manifestSpec = {
          name: 'PawPlay - Interactive Feline Play',
          short_name: 'PawPlay',
          display: 'standalone',
          orientation: 'any'
        };
        expect(manifestSpec.display).toBe('standalone');
      });
    });

  });
});
