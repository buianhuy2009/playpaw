/**
 * PawPlay E2E Test Suite - Tier 5: Stare-to-Pounce Feline Behavioral Overhaul
 * Covers:
 * - Ambush Cover & Peek-a-Boo Occlusion (Workstream 1)
 * - Trapped / Injured Prey Stop-Twitch Kinematics (Workstream 2)
 * - Bio-Acoustic Insect Buzz & Leaf Rustle (Workstream 3)
 * - High-Fidelity Biological Detailing & Micro-Twitch Audio (Workstream 4)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('../harness/test_framework.js'),
      require('../../src/engine.js'),
      require('../../src/prey.js'),
      require('../../src/audio.js')
    );
  } else {
    factory(
      root.PawPlayTestFramework,
      root.PawPlayEngine,
      root.PawPlayPrey,
      root.PawPlayAudio
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (framework, EngineModule, PreyModule, AudioModule) {
  'use strict';

  const { describe, it, expect, beforeEach } = framework;
  const Engine = EngineModule.Engine || EngineModule.default || EngineModule;
  const { PreyAgent, PreyManager, PREY_STATES } = PreyModule;
  const SoundSynthesizer = AudioModule.SoundSynthesizer || AudioModule.default || AudioModule;

  describe('Tier 5: Stare-to-Pounce Feline Behavioral Overhaul', () => {

    // -------------------------------------------------------------------------
    // TC-SP01: Ambush Covers & Safe Boundary Placement
    // -------------------------------------------------------------------------
    describe('TC-SP01: Ambush Covers Initialization & Safe Placement', () => {
      let engine;
      beforeEach(() => {
        engine = new Engine();
      });

      it('TC-SP01-1: Engine initializes 4 natural perimeter ambush covers', () => {
        const covers = engine.getAmbushCovers();
        expect(covers).toBeDefined();
        expect(covers.length).toBe(4);
      });

      it('TC-SP01-2: Ambush covers lie strictly within the safe margin boundary', () => {
        const covers = engine.getAmbushCovers();
        const dims = engine.getDimensions();
        const safe = dims.safeArea;

        covers.forEach(cover => {
          expect(cover.x).toBeGreaterThanOrEqual(safe.left);
          expect(cover.x).toBeLessThanOrEqual(safe.right);
          expect(cover.y).toBeGreaterThanOrEqual(safe.top);
          expect(cover.y).toBeLessThanOrEqual(safe.bottom);
        });
      });

      it('TC-SP01-3: Shaking a cover increases shakeAmount and decays smoothly to 0', () => {
        const covers = engine.getAmbushCovers();
        const coverId = covers[0].id;

        engine.shakeCover(coverId, 5.0);
        expect(covers[0].shakeAmount).toBe(5.0);

        // Advance 1 second across multiple ticks
        engine.advanceTime(1.0);
        expect(covers[0].shakeAmount).toBe(0);
      });
    });

    // -------------------------------------------------------------------------
    // TC-SP02: HIDE_AND_PEEK State Progression (Peek-a-Boo Occlusion)
    // -------------------------------------------------------------------------
    describe('TC-SP02: HIDE_AND_PEEK State Progression', () => {
      let prey;
      let engine;

      beforeEach(() => {
        engine = new Engine();
        prey = new PreyAgent(1, 'bee', 'hunter', 'normal');
      });

      it('TC-SP02-1: PREY_STATES includes HIDE_AND_PEEK and TRAPPED_BUZZ', () => {
        expect(PREY_STATES).toContain('HIDE_AND_PEEK');
        expect(PREY_STATES).toContain('TRAPPED_BUZZ');
      });

      it('TC-SP02-2: Transitioning to HIDE_AND_PEEK targets nearest ambush cover', () => {
        prey.x = 200;
        prey.y = 200;
        prey.changeState('HIDE_AND_PEEK', 3.5);

        expect(prey.state).toBe('HIDE_AND_PEEK');
        expect(prey.coverPhase).toBe('approaching');
        expect(prey.isUnderCover).toBe(false);
      });

      it('TC-SP02-3: Reaching cover triggers hiding subphase, shakes cover, and marks isUnderCover', () => {
        const covers = engine.getAmbushCovers();
        const target = covers[0];
        prey.x = target.x;
        prey.y = target.y;
        prey.changeState('HIDE_AND_PEEK', 3.5);

        let rustleTriggered = false;
        prey.onAudioTrigger = (type) => {
          if (type === 'rustle') rustleTriggered = true;
        };

        prey.update(0.016, engine.getDimensions().safeArea, covers);

        expect(prey.coverPhase).toBe('hiding');
        expect(prey.isUnderCover).toBe(true);
        expect(target.shakeAmount).toBeGreaterThan(0);
        expect(rustleTriggered).toBe(true);
      });

      it('TC-SP02-4: Hiding for >1.1s transitions to peeking subphase with head emerging', () => {
        const covers = engine.getAmbushCovers();
        prey.x = covers[0].x;
        prey.y = covers[0].y;
        prey.changeState('HIDE_AND_PEEK', 3.5);
        prey.update(0.016, engine.getDimensions().safeArea, covers); // switches to hiding

        // Advance 1.2s while hiding
        prey.update(1.2, engine.getDimensions().safeArea, covers);

        expect(prey.coverPhase).toBe('peeking');
      });

      it('TC-SP02-5: Peeking for >1.8s transitions to emerging and bolts into DART_SPRINT', () => {
        const covers = engine.getAmbushCovers();
        prey.x = covers[0].x;
        prey.y = covers[0].y;
        prey.changeState('HIDE_AND_PEEK', 3.5);
        prey.update(0.016, engine.getDimensions().safeArea, covers); // hiding
        prey.update(1.2, engine.getDimensions().safeArea, covers);   // peeking
        prey.update(1.9, engine.getDimensions().safeArea, covers);   // emerging -> DART_SPRINT

        expect(prey.isUnderCover).toBe(false);
        expect(prey.state).toBe('DART_SPRINT');
      });
    });

    // -------------------------------------------------------------------------
    // TC-SP03: TRAPPED_BUZZ State & Dead-Stop Transition
    // -------------------------------------------------------------------------
    describe('TC-SP03: TRAPPED_BUZZ State & Dead-Stop Transition', () => {
      it('TC-SP03-1: TRAPPED_BUZZ causes erratic angular spin and leg kick', () => {
        const bee = new PreyAgent(1, 'bee', 'hunter', 'normal');
        bee.changeState('TRAPPED_BUZZ', 0.6);

        expect(bee.state).toBe('TRAPPED_BUZZ');
        expect(bee.legKick).toBe(1.0);

        const initialHeading = bee.heading;
        bee.update(0.05);

        // Heading has changed due to erratic struggle spin
        expect(bee.heading).not.toBe(initialHeading);
      });

      it('TC-SP03-2: Completing TRAPPED_BUZZ transitions directly into FREEZE_TREMOR', () => {
        const bee = new PreyAgent(1, 'bee', 'hunter', 'normal');
        bee.changeState('TRAPPED_BUZZ', 0.5);

        // Advance past duration
        bee.update(0.55);

        expect(bee.state).toBe('FREEZE_TREMOR');
        expect(bee.stateDuration).toBeGreaterThanOrEqual(1.8);
      });
    });

    // -------------------------------------------------------------------------
    // TC-SP04: Extended Aiming Window & Micro-Twitch Snaps
    // -------------------------------------------------------------------------
    describe('TC-SP04: Extended Aiming Window & Micro-Twitch Snaps', () => {
      it('TC-SP04-1: FREEZE_TREMOR state duration is at least 1.8 seconds', () => {
        const bee = new PreyAgent(1, 'bee', 'hunter', 'normal');
        bee.changeState('FREEZE_TREMOR', 2.4);

        expect(bee.stateDuration).toBeGreaterThanOrEqual(1.8);
        bee.update(1.0);
        expect(bee.state).toBe('FREEZE_TREMOR'); // Still paused giving cat time to aim
      });

      it('TC-SP04-2: Micro-twitches trigger sharp heading angle snap and leg kick', () => {
        const bee = new PreyAgent(1, 'bee', 'hunter', 'normal');
        bee.changeState('FREEZE_TREMOR', 2.5);

        let twitchSoundFired = false;
        bee.onAudioTrigger = (type) => {
          if (type === 'twitch') twitchSoundFired = true;
        };

        // Advance ~0.5s in 16ms increments to trigger micro-twitch
        for (let i = 0; i < 32; i++) {
          bee.update(0.016);
          if (twitchSoundFired) break;
        }

        expect(twitchSoundFired).toBe(true);
      });
    });

    // -------------------------------------------------------------------------
    // TC-SP05: DART_SPRINT Erratic Zig-Zag Cuts
    // -------------------------------------------------------------------------
    describe('TC-SP05: DART_SPRINT Erratic Zig-Zag Cuts', () => {
      it('TC-SP05-1: DART_SPRINT changes heading mid-sprint via zig-zag cuts', () => {
        const bee = new PreyAgent(1, 'bee', 'hunter', 'normal');
        bee.changeState('DART_SPRINT', 1.0);

        const initialHeading = bee.heading;

        // Advance past cut interval (0.26s)
        bee.update(0.28);

        expect(bee.heading).not.toBe(initialHeading);
      });
    });

    // -------------------------------------------------------------------------
    // TC-SP06: Bio-Acoustic Insect Buzz & Leaf Rustle
    // -------------------------------------------------------------------------
    describe('TC-SP06: Bio-Acoustic Insect Buzz & Leaf Rustle', () => {
      let audio;
      beforeEach(() => {
        audio = new SoundSynthesizer();
      });

      it('TC-SP06-1: SoundSynthesizer provides playInsectBuzz without error', () => {
        expect(() => {
          audio.playInsectBuzz(0, 0.15);
        }).not.toThrow();
      });

      it('TC-SP06-2: SoundSynthesizer provides playLeafRustle without error', () => {
        expect(() => {
          audio.playLeafRustle(0, 0.15);
        }).not.toThrow();
      });

      it('TC-SP06-3: playPreyScurry for bee triggers insect buzz without error', () => {
        expect(() => {
          audio.playPreyScurry('bee', 0.5);
        }).not.toThrow();
      });
    });

  });
});
