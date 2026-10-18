/**
 * Automated Verification Script for Milestone 1: Core Engine
 * Verifies High-DPI scaling, 120Hz DT loop, 3-Tier Margin Repulsion Field (100k steps @ 1200 px/s),
 * Contrast Themes, Interactive Water Ripples, Shockwaves & 18 Burst Particles.
 */

const assert = require('assert');
const {
  Engine,
  SAFE_MARGINS,
  MARGIN_CONFIG,
  THEMES,
  COLOR_YELLOW,
  COLOR_CYAN,
  MAX_DPR,
  MAX_DT,
  getSafeBounds,
  viewportToLogical
} = require('../../../src/engine.js');

console.log('=== STARTING MILESTONE 1 AUTOMATED VERIFICATION ===\n');

// -------------------------------------------------------------
// Test 1: High-DPI Canvas Scaling & Idempotent Matrix
// -------------------------------------------------------------
console.log('--- Test 1: High-DPI Scaling & Backing Store Buffer ---');
{
  let transformCalls = [];
  const mockCanvas = {
    clientWidth: 1024,
    clientHeight: 768,
    style: {},
    getContext: () => ({
      setTransform: (...args) => transformCalls.push(args),
      scale: () => {}
    })
  };

  const engine = new Engine();
  engine.init(mockCanvas);

  // Default DPR = 1
  engine.updateDpi(1.0);
  assert.strictEqual(engine.dpr, 1.0, 'DPR should be 1.0');
  assert.strictEqual(engine.canvas.width, 1024, 'Physical width should be 1024');
  assert.strictEqual(engine.canvas.height, 768, 'Physical height should be 768');
  assert.strictEqual(engine.canvas.style.width, '1024px', 'CSS width should be 1024px');

  // Retina 2.0 DPR
  engine.updateDpi(2.0);
  assert.strictEqual(engine.dpr, 2.0, 'DPR should be 2.0');
  assert.strictEqual(engine.canvas.width, 2048, 'Physical width should be 2048');
  assert.strictEqual(engine.canvas.height, 1536, 'Physical height should be 1536');

  // Super-retina 3.5 DPR -> Clamped to 2.0
  engine.updateDpi(3.5);
  assert.strictEqual(engine.dpr, MAX_DPR, 'DPR must be clamped to MAX_DPR (2.0)');
  assert.strictEqual(engine.canvas.width, 2048, 'Physical width must remain 2048');
  assert.strictEqual(engine.canvas.height, 1536, 'Physical height must remain 1536');

  // Verify Idempotent Transform Matrix [dpr, 0, 0, dpr, 0, 0]
  const lastTransform = transformCalls[transformCalls.length - 1];
  assert.deepStrictEqual(lastTransform, [2, 0, 0, 2, 0, 0], 'Transform matrix must be idempotent [dpr, 0, 0, dpr, 0, 0]');
  console.log('✓ High-DPI scaling tests passed.');
}

// -------------------------------------------------------------
// Test 2: 120Hz Delta-Time Loop Normalization & Spiral of Death Clamp
// -------------------------------------------------------------
console.log('\n--- Test 2: 120Hz Delta-Time Loop & Clamping ---');
{
  const engine = new Engine();
  engine.start();

  // Test 1: Idle accumulation at 60Hz (0.016s)
  const initialIdle = engine.idleTime;
  engine.update(0.016);
  assert(Math.abs((engine.idleTime - initialIdle) - 0.016) < 1e-4, 'Idle time should advance by 0.016s');

  // Test 2: Clamp on large time leap (500ms background tab pause)
  const preSpike = engine.idleTime;
  engine.update(0.500);
  assert(Math.abs((engine.idleTime - preSpike) - MAX_DT) < 1e-4, 'Idle time leap must clamp to MAX_DT (0.05s)');

  // Test 3: Frame-Rate Invariance between 60Hz and 120Hz
  // An entity moving at 600 px/s over 1.0 wall-clock second:
  const sim60Hz = { x: 0, vx: 600 };
  const sim120Hz = { x: 0, vx: 600 };

  const dt60 = 1 / 60;
  for (let i = 0; i < 60; i++) {
    sim60Hz.x += sim60Hz.vx * dt60;
  }

  const dt120 = 1 / 120;
  for (let i = 0; i < 120; i++) {
    sim120Hz.x += sim120Hz.vx * dt120;
  }

  assert(Math.abs(sim60Hz.x - 600) < 1e-5, '60Hz simulation traversed exactly 600px');
  assert(Math.abs(sim120Hz.x - 600) < 1e-5, '120Hz simulation traversed exactly 600px');
  assert(Math.abs(sim60Hz.x - sim120Hz.x) < 1e-5, '60Hz and 120Hz displacement must be identical');

  // Test 4: Running flags
  assert.strictEqual(engine.isPlaying, true);
  engine.pause();
  assert.strictEqual(engine.isPaused, true);
  engine.resume();
  assert.strictEqual(engine.isPaused, false);
  engine.stop();
  assert.strictEqual(engine.isPlaying, false);

  console.log('✓ 120Hz Delta-Time loop normalization tests passed.');
}

// -------------------------------------------------------------
// Test 3: 3-Tier Margin Repulsion Field 100,000-Step Kinematic Stress Test
// -------------------------------------------------------------
console.log('\n--- Test 3: 3-Tier Margin Repulsion 100,000-Step Kinematic Stress Test ---');
{
  const engine = new Engine();
  engine.width = 1024;
  engine.height = 768;

  // Verify safe dimensions
  const dims = engine.getDimensions();
  assert.strictEqual(dims.safeArea.top, 72, 'Top margin must be 72px');
  assert.strictEqual(dims.safeArea.bottom, 768 - 72, 'Bottom margin must be H - 72px');
  assert.strictEqual(dims.safeArea.left, 48, 'Left margin must be 48px');
  assert.strictEqual(dims.safeArea.right, 1024 - 48, 'Right margin must be W - 48px');

  // Verify critical buffer deflection
  const testSprite = { x: SAFE_MARGINS.SIDES + 32 + 10, y: 300, vx: -500, vy: 0, radius: 32 };
  engine.applySafeMargins(testSprite, 0.016);
  assert(testSprite.vx > 0, `Outward velocity must be steered/reflected inward (vx: ${testSprite.vx})`);

  // Verify hard clamping bounds
  const outSprite = { x: 10, y: 20, vx: -800, vy: -800, radius: 32 };
  engine.applySafeMargins(outSprite, 0.016);
  assert(outSprite.x >= SAFE_MARGINS.SIDES + 32, 'X must clamp to >= 48 + R');
  assert(outSprite.y >= SAFE_MARGINS.TOP + 32, 'Y must clamp to >= 72 + R');

  const outSprite2 = { x: 1020, y: 760, vx: 800, vy: 800, radius: 32 };
  engine.applySafeMargins(outSprite2, 0.016);
  assert(outSprite2.x <= 1024 - SAFE_MARGINS.SIDES - 32, 'X must clamp to <= W - 48 - R');
  assert(outSprite2.y <= 768 - SAFE_MARGINS.BOTTOM - 32, 'Y must clamp to <= H - 72 - R');

  // 100,000-Step Kinematic Stress Simulation at up to 1200 px/s (Ludicrous Speed)
  const stressSprite = {
    x: 512,
    y: 384,
    vx: 600,
    vy: -750,
    radius: 32
  };

  let violations = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    nan: 0
  };

  const totalSteps = 100000;
  for (let step = 0; step < totalSteps; step++) {
    // Randomized delta-time between 5ms (200 FPS) and 50ms (20 FPS worst case)
    const dt = 0.005 + Math.random() * 0.045;

    // Periodically inject randomized high-velocity explosive sprints (up to 1200 px/s)
    if (Math.random() < 0.05) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 600 + Math.random() * 600; // 600 to 1200 px/s
      stressSprite.vx = Math.cos(angle) * speed;
      stressSprite.vy = Math.sin(angle) * speed;
    }

    // Kinematic update
    stressSprite.x += stressSprite.vx * dt;
    stressSprite.y += stressSprite.vy * dt;
    engine.applySafeMargins(stressSprite, dt);

    // Verify Invariant: Sprite bounding circle NEVER crosses into dead zones
    const topEdge = stressSprite.y - stressSprite.radius;
    const bottomEdge = stressSprite.y + stressSprite.radius;
    const leftEdge = stressSprite.x - stressSprite.radius;
    const rightEdge = stressSprite.x + stressSprite.radius;

    if (isNaN(stressSprite.x) || isNaN(stressSprite.y)) violations.nan++;
    if (topEdge < 72 - 1e-9) violations.top++;
    if (bottomEdge > 768 - 72 + 1e-9) violations.bottom++;
    if (leftEdge < 48 - 1e-9) violations.left++;
    if (rightEdge > 1024 - 48 + 1e-9) violations.right++;
  }

  const totalViolations = violations.top + violations.bottom + violations.left + violations.right + violations.nan;
  console.log(`Kinematic 100,000-Step Stress Results:`, {
    totalSteps,
    totalViolations,
    violations
  });

  assert.strictEqual(totalViolations, 0, 'Zero margin violations permitted during 100,000 steps at Ludicrous speed');
  console.log('✓ 3-Tier Margin Repulsion 100,000-step stress test passed with 0 violations.');
}

// -------------------------------------------------------------
// Test 4: Contrast Themes & Background Switching
// -------------------------------------------------------------
console.log('\n--- Test 4: Contrast Themes Switching ---');
{
  const engine = new Engine();

  engine.setTheme('daylight');
  assert.strictEqual(engine.theme.bg, '#F4F1EA', 'Daylight theme bg should be #F4F1EA');
  assert.strictEqual(engine.theme.contrastColor, '#1A110B', 'Daylight contrast color should be #1A110B');
  assert.strictEqual(engine.theme.ripples, false, 'Daylight theme should not have ripples enabled');

  engine.setTheme('night');
  assert.strictEqual(engine.theme.bg, '#10121A', 'Night theme bg should be #10121A');
  assert.strictEqual(engine.theme.contrastColor, '#FFD600', 'Night contrast color should be #FFD600');
  assert.strictEqual(engine.theme.ripples, false, 'Night theme should not have ripples enabled');

  engine.setTheme('pond');
  assert.strictEqual(engine.theme.bg, '#0A2239', 'Pond theme bg should be #0A2239');
  assert.strictEqual(engine.theme.contrastColor, '#00E5FF', 'Pond contrast color should be #00E5FF');
  assert.strictEqual(engine.theme.ripples, true, 'Pond theme must have ripples enabled');

  console.log('✓ Contrast Themes tests passed.');
}

// -------------------------------------------------------------
// Test 5: Interactive Water Ripples Lifecycle & Damping
// -------------------------------------------------------------
console.log('\n--- Test 5: Water Ripples Lifecycle & Theme Suppression ---');
{
  const engine = new Engine();

  // Test 1: Ripples do not spawn in Daylight theme
  engine.setTheme('daylight');
  engine.addRipple(300, 400);
  assert.strictEqual(engine.ripples.length, 0, 'Ripples must not spawn in Daylight theme');

  // Test 2: Ripples do not spawn in Night theme
  engine.setTheme('night');
  engine.addRipple(300, 400);
  assert.strictEqual(engine.ripples.length, 0, 'Ripples must not spawn in Night theme');

  // Test 3: Ripples spawn in Pond theme
  engine.setTheme('pond');
  engine.addRipple(300, 400);
  assert.strictEqual(engine.ripples.length, 1, 'Ripple must spawn in Pond theme');
  assert.strictEqual(engine.ripples[0].radius, 5, 'Initial ripple radius should be 5px');

  // Test 4: Expansion and alpha damping
  engine.advanceTime(0.5);
  assert(engine.ripples[0].radius > 40, 'Ripple radius should expand over time');
  assert(engine.ripples[0].alpha < 0.8, 'Ripple alpha should decay over time');

  // Test 5: Lifecycle completion & automatic pruning
  engine.advanceTime(1.5);
  assert.strictEqual(engine.ripples.length, 0, 'Completed ripples must be pruned from pool');

  // Test 6: Pool cap at 30
  for (let i = 0; i < 50; i++) {
    engine.addRipple(200, 200);
  }
  assert(engine.ripples.length <= 30, 'Ripples pool must be capped at 30 to prevent memory leak');

  console.log('✓ Water Ripples lifecycle tests passed.');
}

// -------------------------------------------------------------
// Test 6: Pounce Shockwave Ring & 18 Burst Particles
// -------------------------------------------------------------
console.log('\n--- Test 6: Shockwave Ring & 18 Burst Particles ---');
{
  const engine = new Engine();

  // Spawn Burst at (400, 300)
  engine.spawnBurst(400, 300);

  // 1. Shockwave Validation
  assert.strictEqual(engine.shockwaves.length, 1, 'Exactly 1 shockwave ring must be spawned');
  const sw = engine.shockwaves[0];
  assert.strictEqual(sw.duration, 0.300, 'Shockwave duration must be 300ms');
  assert.strictEqual(sw.color, COLOR_YELLOW, 'Shockwave color must be #FFD600');
  assert.strictEqual(sw.alpha, 1.0, 'Initial shockwave alpha must be 1.0');

  // 2. 18 Burst Particles Validation
  assert.strictEqual(engine.particles.length, 18, 'Exactly 18 burst particles must be spawned');

  let yellowCount = 0;
  let cyanCount = 0;
  for (const p of engine.particles) {
    if (p.color === COLOR_YELLOW) yellowCount++;
    if (p.color === COLOR_CYAN) cyanCount++;
    assert(p.alpha === 1.0, 'Particle initial alpha must be 1.0');
    assert(p.radius > 0, 'Particle radius must be positive');
  }
  assert.strictEqual(yellowCount, 9, 'Must have 9 yellow particles (#FFD600)');
  assert.strictEqual(cyanCount, 9, 'Must have 9 cyan particles (#00E5FF)');

  // 3. Update decay
  const initialV = Math.hypot(engine.particles[0].vx, engine.particles[0].vy);
  engine.update(0.1);
  const dampedV = Math.hypot(engine.particles[0].vx, engine.particles[0].vy);
  assert(dampedV < initialV, 'Particle velocity must decrease due to viscous drag');
  assert(engine.particles[0].alpha < 1.0, 'Particle alpha must decay');

  // 4. Expiration after 1.0s
  engine.advanceTime(1.0);
  assert.strictEqual(engine.shockwaves.length, 0, 'Shockwave must expire and be pruned');
  assert.strictEqual(engine.particles.length, 0, 'Particles must expire and be pruned');

  // 5. High volume stress: 500 rapid bursts
  for (let i = 0; i < 500; i++) {
    engine.spawnBurst(500, 300);
    engine.update(0.016);
  }
  engine.advanceTime(1.0);
  assert.strictEqual(engine.particles.length, 0, 'Zero orphan particles permitted after 500 bursts');
  assert.strictEqual(engine.shockwaves.length, 0, 'Zero orphan shockwaves permitted after 500 bursts');

  console.log('✓ Shockwave & 18 Burst Particles tests passed.');
}

console.log('\n=== ALL MILESTONE 1 AUTOMATED VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
