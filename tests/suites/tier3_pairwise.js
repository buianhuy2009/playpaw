/**
 * PawPlay E2E Test Suite - Tier 3: Pairwise Combinations
 * Covers 25 orthogonal combination vectors across Prey × Speed × Size × Theme × Count × Camera Mode.
 * Authoritative source: explorer_survey_2/handoff.md & ORIGINAL_REQUEST.md
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('../harness/test_framework.js'),
      require('../harness/contract_adapter.js')
    );
  } else {
    factory(
      root.PawPlayTestFramework,
      root.PawPlayAdapter
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (framework, adapter) {
  'use strict';

  const { describe, it, expect, beforeEach } = framework;
  const {
    THEMES,
    SPEED_MODES,
    SIZE_MODES,
    ReferenceEngine,
    ReferencePreyManager,
    ReferencePounceCam
  } = adapter;

  // 25 Orthogonal Matrix Vectors from explorer_survey_2/handoff.md
  const PAIRWISE_VECTORS = [
    { id: 'V01', prey: 'bee', speed: 'kitten', size: 'tiny', theme: 'daylight', count: 1, cam: 'disabled' },
    { id: 'V02', prey: 'bug', speed: 'hunter', size: 'normal', theme: 'night', count: 2, cam: 'catch' },
    { id: 'V03', prey: 'mouse', speed: 'apex', size: 'chonky', theme: 'pond', count: 3, cam: 'near-miss' },
    { id: 'V04', prey: 'koi', speed: 'ludicrous', size: 'tiny', theme: 'daylight', count: 4, cam: 'all' },
    { id: 'V05', prey: 'laser', speed: 'kitten', size: 'normal', theme: 'night', count: 1, cam: 'all' },
    { id: 'V06', prey: 'bee', speed: 'hunter', size: 'chonky', theme: 'pond', count: 2, cam: 'disabled' },
    { id: 'V07', prey: 'bug', speed: 'apex', size: 'tiny', theme: 'daylight', count: 3, cam: 'catch' },
    { id: 'V08', prey: 'mouse', speed: 'ludicrous', size: 'normal', theme: 'night', count: 4, cam: 'near-miss' },
    { id: 'V09', prey: 'koi', speed: 'kitten', size: 'chonky', theme: 'pond', count: 1, cam: 'catch' },
    { id: 'V10', prey: 'laser', speed: 'hunter', size: 'tiny', theme: 'daylight', count: 2, cam: 'near-miss' },
    { id: 'V11', prey: 'bee', speed: 'apex', size: 'normal', theme: 'night', count: 3, cam: 'all' },
    { id: 'V12', prey: 'bug', speed: 'ludicrous', size: 'chonky', theme: 'pond', count: 4, cam: 'disabled' },
    { id: 'V13', prey: 'mouse', speed: 'kitten', size: 'tiny', theme: 'night', count: 2, cam: 'all' },
    { id: 'V14', prey: 'koi', speed: 'hunter', size: 'normal', theme: 'pond', count: 3, cam: 'disabled' },
    { id: 'V15', prey: 'laser', speed: 'apex', size: 'chonky', theme: 'daylight', count: 4, cam: 'catch' },
    { id: 'V16', prey: 'bee', speed: 'ludicrous', size: 'tiny', theme: 'night', count: 1, cam: 'near-miss' },
    { id: 'V17', prey: 'bug', speed: 'kitten', size: 'normal', theme: 'pond', count: 3, cam: 'near-miss' },
    { id: 'V18', prey: 'mouse', speed: 'hunter', size: 'chonky', theme: 'daylight', count: 1, cam: 'all' },
    { id: 'V19', prey: 'koi', speed: 'apex', size: 'tiny', theme: 'night', count: 2, cam: 'disabled' },
    { id: 'V20', prey: 'laser', speed: 'ludicrous', size: 'normal', theme: 'pond', count: 2, cam: 'catch' },
    { id: 'V21', prey: 'bee', speed: 'kitten', size: 'normal', theme: 'daylight', count: 4, cam: 'catch' },
    { id: 'V22', prey: 'bug', speed: 'hunter', size: 'tiny', theme: 'night', count: 4, cam: 'all' },
    { id: 'V23', prey: 'mouse', speed: 'apex', size: 'tiny', theme: 'pond', count: 1, cam: 'disabled' },
    { id: 'V24', prey: 'koi', speed: 'ludicrous', size: 'normal', theme: 'daylight', count: 3, cam: 'catch' },
    { id: 'V25', prey: 'laser', speed: 'kitten', size: 'chonky', theme: 'night', count: 3, cam: 'disabled' }
  ];

  describe('Tier 3: Pairwise Combinations (25 Orthogonal Matrix Vectors)', () => {

    PAIRWISE_VECTORS.forEach((vector) => {
      it(`TC-P${vector.id.slice(1)}: Vector ${vector.id} [${vector.prey}, ${vector.speed}, ${vector.size}, ${vector.theme}, ${vector.count} prey, Cam: ${vector.cam}]`, async () => {
        // 1. Initialize Engine & Theme
        const engine = new ReferenceEngine();
        engine.init({ clientWidth: 1024, clientHeight: 768, getContext: () => ({ scale: () => {} }) });
        engine.setTheme(vector.theme);
        expect(engine.theme.bg).toBe(THEMES[vector.theme].bg);

        // 2. Initialize Prey Manager with specified combination
        const preyMgr = new ReferencePreyManager();
        preyMgr.init(vector.count, vector.prey, vector.speed, vector.size);
        expect(preyMgr.preyList.length).toBe(vector.count);

        // Validate each prey agent properties
        preyMgr.preyList.forEach((agent) => {
          expect(agent.type).toBe(vector.prey);
          expect(agent.baseSpeed).toBe(SPEED_MODES[vector.speed]);
          expect(agent.radius).toBe(SIZE_MODES[vector.size]);
        });

        // 3. Connect prey to engine and simulate 30 frames
        engine.preyList = preyMgr.preyList;
        engine.start();
        for (let f = 0; f < 30; f++) {
          engine.update(1 / 60);
        }

        // Verify all prey remain within safe area
        const dims = engine.getDimensions();
        preyMgr.preyList.forEach((agent) => {
          expect(agent.x).toBeGreaterThanOrEqual(dims.safeArea.left);
          expect(agent.x).toBeLessThanOrEqual(dims.safeArea.right);
          expect(agent.y).toBeGreaterThanOrEqual(dims.safeArea.top);
          expect(agent.y).toBeLessThanOrEqual(dims.safeArea.bottom);
        });

        // 4. Test Camera Trigger interaction
        const cam = new ReferencePounceCam(null);
        cam.isEnabled = vector.cam !== 'disabled';
        cam.setTriggerMode(vector.cam);

        if (vector.cam === 'catch' || vector.cam === 'all') {
          const snap = await cam.captureSnapshot('catch');
          expect(snap).toBeTruthy();
          expect(snap.trigger).toBe('catch');
        } else if (vector.cam === 'near-miss') {
          const snapCatch = await cam.captureSnapshot('catch');
          expect(snapCatch).toBeNull(); // Shouldn't fire on catch
          const snapNear = await cam.captureSnapshot('near-miss');
          expect(snapNear).toBeTruthy();
        } else {
          // Disabled
          const snap = await cam.captureSnapshot('catch');
          expect(snap).toBeNull();
        }
      });
    });

  });
});
