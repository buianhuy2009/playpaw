/**
 * Adversarial Stress-Test Suite for PawPlay Engine (Milestone 1)
 * Authored by reviewer_m1_1 (reviewer & critic)
 */

const assert = require('assert');
const {
  Engine,
  SAFE_MARGINS,
  MARGIN_CONFIG,
  THEMES,
  MAX_DPR,
  MAX_DT,
  getSafeBounds,
  viewportToLogical
} = require('../../../src/engine.js');

console.log('=== STARTING ADVERSARIAL STRESS-TESTS ===\n');

let passCount = 0;
let failCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    failCount++;
  }
}

// --------------------------------------------------------------------
// 1. Extreme & Adversarial Physics / Margins
// --------------------------------------------------------------------
console.log('--- 1. Extreme & Adversarial Physics / Margins ---');

runTest('Corner velocity deflection: sprite headed exactly into corner at 5000 px/s', () => {
  const engine = new Engine();
  engine.width = 1024;
  engine.height = 768;
  const sprite = { x: 50, y: 75, vx: -5000, vy: -5000, radius: 32 };

  // Run 100 steps of physics at dt = 0.016
  for (let i = 0; i < 100; i++) {
    sprite.x += sprite.vx * 0.016;
    sprite.y += sprite.vy * 0.016;
    engine.applySafeMargins(sprite, 0.016);

    const dims = engine.getDimensions();
    assert(sprite.x - sprite.radius >= dims.safeArea.left - 1e-9, `Left margin violated: x=${sprite.x}`);
    assert(sprite.y - sprite.radius >= dims.safeArea.top - 1e-9, `Top margin violated: y=${sprite.y}`);
    assert(!isNaN(sprite.x) && !isNaN(sprite.y), 'Coordinates became NaN');
    assert(!isNaN(sprite.vx) && !isNaN(sprite.vy), 'Velocities became NaN');
  }
});

runTest('Extreme speed bullet penetration test: 100,000 px/s heading straight for top tab bar', () => {
  const engine = new Engine();
  engine.width = 1024;
  engine.height = 768;
  const sprite = { x: 500, y: 300, vx: 0, vy: -100000, radius: 32 };

  sprite.y += sprite.vy * 0.05; // Teleports far into negative territory (-4700)
  engine.applySafeMargins(sprite, 0.05);

  const dims = engine.getDimensions();
  assert(sprite.y - sprite.radius >= dims.safeArea.top, `Top deadzone penetrated! y=${sprite.y}`);
  assert(sprite.vy >= 0, `Velocity should be directed downward into playing field, got ${sprite.vy}`);
});

runTest('Zero & negative dt inputs: applySafeMargins with dt = 0, dt = -1, dt = NaN', () => {
  const engine = new Engine();
  engine.width = 1024;
  engine.height = 768;
  const sprite = { x: 500, y: 300, vx: 100, vy: 100, radius: 32 };

  engine.applySafeMargins(sprite, 0);
  assert(!isNaN(sprite.x) && !isNaN(sprite.vx));

  engine.applySafeMargins(sprite, -0.05);
  assert(!isNaN(sprite.x) && !isNaN(sprite.vx));

  engine.applySafeMargins(sprite, NaN);
  assert(!isNaN(sprite.x) && !isNaN(sprite.vx));
});

runTest('Null/missing sprite handling: engine.applySafeMargins(null) / undefined', () => {
  const engine = new Engine();
  // Should not throw
  engine.applySafeMargins(null);
  engine.applySafeMargins(undefined);
});

runTest('Sprite with missing radius, vx, vy', () => {
  const engine = new Engine();
  const sprite = { x: 10, y: 10 };
  engine.applySafeMargins(sprite, 0.016);
  assert(sprite.x >= SAFE_MARGINS.SIDES + 32);
  assert(sprite.y >= SAFE_MARGINS.TOP + 32);
});

// --------------------------------------------------------------------
// 2. High-DPI & Viewport Stress
// --------------------------------------------------------------------
console.log('\n--- 2. High-DPI & Viewport Stress ---');

runTest('Adversarial DPR values: -5, 0, NaN, null, undefined, 100', () => {
  const engine = new Engine();
  
  engine.updateDpi(-5);
  assert(engine.dpr >= 1.0 && engine.dpr <= 2.0, `DPR should be between 1 and 2, got ${engine.dpr}`);

  engine.updateDpi(0);
  assert(engine.dpr >= 1.0 && engine.dpr <= 2.0, `DPR should be between 1 and 2, got ${engine.dpr}`);

  engine.updateDpi(NaN);
  assert(engine.dpr >= 1.0 && engine.dpr <= 2.0, `DPR should be between 1 and 2, got ${engine.dpr}`);

  engine.updateDpi(null);
  assert(engine.dpr >= 1.0 && engine.dpr <= 2.0, `DPR should be between 1 and 2, got ${engine.dpr}`);

  engine.updateDpi(undefined);
  assert(engine.dpr >= 1.0 && engine.dpr <= 2.0, `DPR should be between 1 and 2, got ${engine.dpr}`);

  engine.updateDpi(100);
  assert.strictEqual(engine.dpr, 2.0, `Extreme DPR should clamp to 2.0, got ${engine.dpr}`);
});

runTest('Idempotent setTransform verification over 20 repeated resize cycles', () => {
  let callHistory = [];
  const mockCanvas = {
    clientWidth: 800,
    clientHeight: 600,
    style: {},
    getContext: () => ({
      setTransform: (...args) => callHistory.push(args)
    })
  };
  const engine = new Engine();
  engine.init(mockCanvas);

  assert.deepStrictEqual(callHistory[0], [1, 0, 0, 1, 0, 0], 'Initial transform without window.devicePixelRatio is 1');

  for (let i = 0; i < 20; i++) {
    engine.updateDpi(2.0);
  }

  assert.strictEqual(callHistory.length, 21);
  for (let i = 1; i <= 20; i++) {
    assert.deepStrictEqual(callHistory[i], [2, 0, 0, 2, 0, 0], 'Transform matrix must always be [2,0,0,2,0,0]');
  }
});

// --------------------------------------------------------------------
// 3. Render Loop, Cold-Start & Lag Spikes
// --------------------------------------------------------------------
console.log('\n--- 3. Render Loop, Cold-Start & Lag Spikes ---');

runTest('Cold start & rAF loop: first frame dt is 0, frame 2 with 10s lag clamps to MAX_DT (0.05)', () => {
  let rAFCallback = null;
  globalThis.requestAnimationFrame = (cb) => {
    rAFCallback = cb;
    return 1;
  };

  const recordedDts = [];
  const engine = new Engine();
  engine.start((dt) => {
    recordedDts.push(dt);
  });

  // Frame 1: cold start at now = 1000ms
  rAFCallback(1000);
  assert.strictEqual(recordedDts[0], 0, 'First frame dt must be 0 (cold start guard)');

  // Frame 2: huge lag spike (10 seconds later at now = 11000ms)
  rAFCallback(11000);
  assert.strictEqual(recordedDts[1], MAX_DT, `Lag spike must clamp to MAX_DT (0.05), got ${recordedDts[1]}`);

  // Frame 3: normal 120Hz frame (8.33ms later at now = 11008.33ms)
  rAFCallback(11008.33);
  assert(Math.abs(recordedDts[2] - 0.00833) < 1e-4, `120Hz frame dt must be ~0.00833, got ${recordedDts[2]}`);

  delete globalThis.requestAnimationFrame;
});

runTest('Lag spike clamp: delta-times > 50ms (e.g. 5 seconds GC pause)', () => {
  const engine = new Engine();
  engine.start();
  const preIdle = engine.idleTime;
  engine.update(5.0); // 5s tab backgrounding
  assert(Math.abs((engine.idleTime - preIdle) - 0.05) < 1e-4, 'Lag spike must be clamped to 50ms');
});

runTest('Negative dt in update: update(-1.0)', () => {
  const engine = new Engine();
  const preIdle = engine.idleTime;
  engine.update(-1.0);
  assert(engine.idleTime >= preIdle, 'Idle time must not decrease on negative dt');
});

// --------------------------------------------------------------------
// 4. Memory Leak & Object Pool Safety
// --------------------------------------------------------------------
console.log('\n--- 4. Memory Leak & Object Pool Safety ---');

runTest('Ripple flooding: 10,000 addRipple calls in Koi Pond theme', () => {
  const engine = new Engine();
  engine.setTheme('pond');
  for (let i = 0; i < 10000; i++) {
    engine.addRipple(100, 100);
  }
  assert(engine.ripples.length <= 30, `Ripples array must be bounded to <= 30, got ${engine.ripples.length}`);
});

runTest('Particle flooding: 1,000 bursts (18,000 particles) with continuous simulation', () => {
  const engine = new Engine();
  for (let i = 0; i < 1000; i++) {
    engine.spawnBurst(200, 200);
    engine.update(0.016);
  }
  // After bursts stop, advance time by 1.0s
  engine.advanceTime(1.0);
  assert.strictEqual(engine.particles.length, 0, `All particles must be pruned, remaining: ${engine.particles.length}`);
  assert.strictEqual(engine.shockwaves.length, 0, `All shockwaves must be pruned, remaining: ${engine.shockwaves.length}`);
});

// --------------------------------------------------------------------
// 5. Render Robustness & Null Safety
// --------------------------------------------------------------------
console.log('\n--- 5. Render Robustness & Null Safety ---');

runTest('render() with null / undefined context does not throw', () => {
  const engine = new Engine();
  engine.render(null);
  engine.render(undefined);
});

runTest('render() with dummy/mock context across all 3 themes', () => {
  const engine = new Engine();
  const mockCtx = {
    save: () => {},
    restore: () => {},
    fillRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    arc: () => {},
    bezierCurveTo: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} })
  };

  engine.spawnBurst(300, 300);
  engine.setTheme('daylight');
  engine.render(mockCtx);

  engine.setTheme('night');
  engine.render(mockCtx);

  engine.setTheme('pond');
  engine.addRipple(300, 300);
  engine.render(mockCtx);
});

// --------------------------------------------------------------------
// 6. Theme Contract & Invariants
// --------------------------------------------------------------------
console.log('\n--- 6. Theme Contract & Invariants ---');

runTest('Invalid theme fallback: setTheme("unknown_theme")', () => {
  const engine = new Engine();
  const prevTheme = engine.activeTheme;
  engine.setTheme('nonexistent_theme');
  assert.strictEqual(engine.activeTheme, prevTheme, 'Invalid theme key must be ignored');
});

runTest('Theme properties conformance', () => {
  const requiredThemes = ['daylight', 'night', 'pond'];
  for (const key of requiredThemes) {
    const t = THEMES[key];
    assert(t, `Theme ${key} must exist`);
    assert(typeof t.id === 'string', `Theme ${key} must have id string`);
    assert(typeof t.name === 'string', `Theme ${key} must have name string`);
    assert(typeof t.bg === 'string' && t.bg.startsWith('#'), `Theme ${key} must have valid hex bg`);
    assert(typeof t.contrastColor === 'string' && t.contrastColor.startsWith('#'), `Theme ${key} must have contrastColor`);
    assert(typeof t.ripples === 'boolean', `Theme ${key} must have ripples boolean`);
  }
});

// --------------------------------------------------------------------
// 7. Lifecycle & Destroy
// --------------------------------------------------------------------
console.log('\n--- 7. Lifecycle & Destroy ---');

runTest('destroy() detaches listeners and empties pools', () => {
  const engine = new Engine();
  engine.spawnBurst(100, 100);
  engine.addRipple(100, 100);
  assert(engine.particles.length > 0);

  engine.destroy();
  assert.strictEqual(engine.particles.length, 0);
  assert.strictEqual(engine.shockwaves.length, 0);
  assert.strictEqual(engine.ripples.length, 0);
  assert.strictEqual(engine.isPlaying, false);
});

console.log(`\n============================================================`);
console.log(`Adversarial Test Summary: ${passCount} passed, ${failCount} failed`);
console.log(`============================================================\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
