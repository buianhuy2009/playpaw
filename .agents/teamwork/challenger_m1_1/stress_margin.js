/**
 * PawPlay Adversarial Kinematic Stress Test Harness
 * Author: challenger_m1_1 (Adversarial Verifier for Milestone 1)
 *
 * Requirements:
 * - 500,000 kinematic steps at extreme velocities (up to 3000 px/s, Ludicrous and beyond)
 * - Severe delta-time lag spikes (10ms to 200ms)
 * - Randomized angle collisions directly into the 4 corners
 * - Strict verification of Top 72px, Bottom 72px, Sides 48px margins
 * - Edge clearance and stability telemetry
 */

const { Engine, SAFE_MARGINS, MARGIN_CONFIG, getSafeBounds } = require('../../../src/engine.js');

const EPSILON = 1e-7; // Numerical tolerance for floating point boundary equality

function runStressTests() {
  console.log('======================================================================');
  console.log('🐾 PAWPLAY ADVERSARIAL STRESS TEST: MARGIN REPULSION FIELD 🐾');
  console.log('Target Module: src/engine.js');
  console.log('Test Parameters: 500,000 Steps | 3000+ px/s | 10ms - 200ms dt Spikes');
  console.log('======================================================================\n');

  let overallPassed = true;
  const suiteResults = [];

  // =========================================================================
  // SUITE 1: 500,000-Step Adversarial Kinematic Challenge (Main Benchmark)
  // =========================================================================
  console.log('--- SUITE 1: 500,000-Step Kinematic Loop (Corner Bombardment & DT Jitter) ---');
  {
    const engine = new Engine();
    engine.width = 1024;
    engine.height = 768;

    const radius = 32;
    const sprite = {
      x: 512,
      y: 384,
      vx: 1500,
      vy: -2000,
      radius
    };

    const telemetry = {
      totalSteps: 500000,
      lagSpikesInjected: 0,
      cornerAimEvents: 0,
      deflections: 0,
      minTopEdge: Infinity,
      maxBottomEdge: -Infinity,
      minLeftEdge: Infinity,
      maxRightEdge: -Infinity,
      violations: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        nanOrInf: 0
      }
    };

    const startTime = Date.now();

    for (let step = 0; step < telemetry.totalSteps; step++) {
      // 1. Delta-time injection:
      // Base: 120Hz (8.33ms) to 60Hz (16.67ms)
      // Every ~12 steps, inject severe lag spike (10ms to 200ms)
      let dt;
      if (step % 12 === 0) {
        // Lag spike between 0.010 and 0.200 seconds
        dt = 0.010 + Math.random() * 0.190;
        telemetry.lagSpikesInjected++;
      } else {
        // Normal 60Hz - 120Hz frame time
        dt = 0.00833 + Math.random() * 0.00833;
      }

      // 2. Velocity & Angle Steering:
      // High-frequency injection of extreme velocities (up to 3000+ px/s)
      if (step % 15 === 0) {
        const speed = 1200 + Math.random() * 2000; // 1200 to 3200 px/s
        const aimStrategy = Math.random();

        telemetry.cornerAimEvents++;
        if (aimStrategy < 0.25) {
          // Direct shot toward Top-Left corner (0, 0)
          const angle = Math.atan2(0 - sprite.y, 0 - sprite.x) + (Math.random() - 0.5) * 0.2;
          sprite.vx = Math.cos(angle) * speed;
          sprite.vy = Math.sin(angle) * speed;
        } else if (aimStrategy < 0.50) {
          // Direct shot toward Top-Right corner (1024, 0)
          const angle = Math.atan2(0 - sprite.y, 1024 - sprite.x) + (Math.random() - 0.5) * 0.2;
          sprite.vx = Math.cos(angle) * speed;
          sprite.vy = Math.sin(angle) * speed;
        } else if (aimStrategy < 0.75) {
          // Direct shot toward Bottom-Left corner (0, 768)
          const angle = Math.atan2(768 - sprite.y, 0 - sprite.x) + (Math.random() - 0.5) * 0.2;
          sprite.vx = Math.cos(angle) * speed;
          sprite.vy = Math.sin(angle) * speed;
        } else if (aimStrategy < 0.90) {
          // Direct shot toward Bottom-Right corner (1024, 768)
          const angle = Math.atan2(768 - sprite.y, 1024 - sprite.x) + (Math.random() - 0.5) * 0.2;
          sprite.vx = Math.cos(angle) * speed;
          sprite.vy = Math.sin(angle) * speed;
        } else {
          // Completely unconstrained random impulse
          const angle = Math.random() * Math.PI * 2;
          sprite.vx = Math.cos(angle) * speed;
          sprite.vy = Math.sin(angle) * speed;
        }
      }

      const prevVx = sprite.vx;
      const prevVy = sprite.vy;

      // 3. Kinematic motion update (pre-move integration)
      sprite.x += sprite.vx * dt;
      sprite.y += sprite.vy * dt;

      // 4. Safe Margins Enforcement
      engine.applySafeMargins(sprite, dt);

      if (Math.sign(sprite.vx) !== Math.sign(prevVx) || Math.sign(sprite.vy) !== Math.sign(prevVy)) {
        telemetry.deflections++;
      }

      // 5. Invariant Checks
      if (
        !Number.isFinite(sprite.x) ||
        !Number.isFinite(sprite.y) ||
        !Number.isFinite(sprite.vx) ||
        !Number.isFinite(sprite.vy)
      ) {
        telemetry.violations.nanOrInf++;
      }

      const topEdge = sprite.y - sprite.radius;
      const bottomEdge = sprite.y + sprite.radius;
      const leftEdge = sprite.x - sprite.radius;
      const rightEdge = sprite.x + sprite.radius;

      if (topEdge < telemetry.minTopEdge) telemetry.minTopEdge = topEdge;
      if (bottomEdge > telemetry.maxBottomEdge) telemetry.maxBottomEdge = bottomEdge;
      if (leftEdge < telemetry.minLeftEdge) telemetry.minLeftEdge = leftEdge;
      if (rightEdge > telemetry.maxRightEdge) telemetry.maxRightEdge = rightEdge;

      // Strict boundary violations:
      // Top margin: Top 72px
      if (topEdge < SAFE_MARGINS.TOP - EPSILON) {
        telemetry.violations.top++;
      }
      // Bottom margin: Bottom 72px (H - 72)
      if (bottomEdge > engine.height - SAFE_MARGINS.BOTTOM + EPSILON) {
        telemetry.violations.bottom++;
      }
      // Left margin: Side 48px
      if (leftEdge < SAFE_MARGINS.SIDES - EPSILON) {
        telemetry.violations.left++;
      }
      // Right margin: Side 48px (W - 48)
      if (rightEdge > engine.width - SAFE_MARGINS.SIDES + EPSILON) {
        telemetry.violations.right++;
      }
    }

    const durationMs = Date.now() - startTime;
    const totalViolations =
      telemetry.violations.top +
      telemetry.violations.bottom +
      telemetry.violations.left +
      telemetry.violations.right +
      telemetry.violations.nanOrInf;

    const passed = totalViolations === 0;
    if (!passed) overallPassed = false;

    suiteResults.push({
      name: '500,000-Step Adversarial Kinematic Loop',
      totalSteps: telemetry.totalSteps,
      durationMs,
      passed,
      telemetry
    });

    console.log(`Execution Completed in ${durationMs}ms (~${Math.round(telemetry.totalSteps / (durationMs / 1000))} steps/sec)`);
    console.log(`  Lag Spikes Injected (10-200ms) : ${telemetry.lagSpikesInjected}`);
    console.log(`  Corner Aim Injections          : ${telemetry.cornerAimEvents}`);
    console.log(`  Boundary Deflections           : ${telemetry.deflections}`);
    console.log(`  Min Top Edge Observed          : ${telemetry.minTopEdge.toFixed(4)}px (Target >= 72.0000px)`);
    console.log(`  Max Bottom Edge Observed       : ${telemetry.maxBottomEdge.toFixed(4)}px (Target <= ${(768 - 72).toFixed(4)}px)`);
    console.log(`  Min Left Edge Observed         : ${telemetry.minLeftEdge.toFixed(4)}px (Target >= 48.0000px)`);
    console.log(`  Max Right Edge Observed        : ${telemetry.maxRightEdge.toFixed(4)}px (Target <= ${(1024 - 48).toFixed(4)}px)`);
    console.log(`  Violations Breakdown           :`, telemetry.violations);
    console.log(`  Total Margin Violations        : ${totalViolations} ${passed ? '✓ [PASS]' : '✗ [FAIL]'}\n`);
  }

  // =========================================================================
  // SUITE 2: Focused 4-Corner Wedge Collision Bombardment
  // =========================================================================
  console.log('--- SUITE 2: Focused 4-Corner Wedge Collision Bombardment (40,000 steps) ---');
  {
    const engine = new Engine();
    engine.width = 1024;
    engine.height = 768;
    const R = 32;

    const bounds = getSafeBounds(1024, 768, R);
    const corners = [
      { name: 'Top-Left (48, 72)', startX: bounds.xMin, startY: bounds.yMin, vx: -3000, vy: -3000 },
      { name: 'Top-Right (976, 72)', startX: bounds.xMax, startY: bounds.yMin, vx: 3000, vy: -3000 },
      { name: 'Bottom-Left (48, 696)', startX: bounds.xMin, startY: bounds.yMax, vx: -3000, vy: 3000 },
      { name: 'Bottom-Right (976, 696)', startX: bounds.xMax, startY: bounds.yMax, vx: 3000, vy: 3000 }
    ];

    let cornerViolations = 0;

    for (const c of corners) {
      const sprite = { x: c.startX, y: c.startY, vx: c.vx, vy: c.vy, radius: R };
      let localViolations = 0;

      for (let i = 0; i < 10000; i++) {
        // Continuous lag spikes and random impulses directly into the corner vertex
        const dt = 0.05 + Math.random() * 0.15; // 50ms - 200ms extreme lag spikes
        if (i % 5 === 0) {
          // Re-fire directly into corner
          sprite.vx = c.vx * (0.8 + Math.random() * 0.5);
          sprite.vy = c.vy * (0.8 + Math.random() * 0.5);
        }

        sprite.x += sprite.vx * dt;
        sprite.y += sprite.vy * dt;
        engine.applySafeMargins(sprite, dt);

        const top = sprite.y - R;
        const bottom = sprite.y + R;
        const left = sprite.x - R;
        const right = sprite.x + R;

        if (top < SAFE_MARGINS.TOP - EPSILON || bottom > 768 - SAFE_MARGINS.BOTTOM + EPSILON ||
            left < SAFE_MARGINS.SIDES - EPSILON || right > 1024 - SAFE_MARGINS.SIDES + EPSILON ||
            !Number.isFinite(sprite.x) || !Number.isFinite(sprite.y)) {
          localViolations++;
        }
      }

      cornerViolations += localViolations;
      console.log(`  Corner ${c.name}: 10,000 steps at 3000+ px/s with 50-200ms lag -> Violations: ${localViolations}`);
    }

    const passed = cornerViolations === 0;
    if (!passed) overallPassed = false;
    suiteResults.push({ name: 'Corner Wedge Bombardment', passed, violations: cornerViolations });
    console.log(`  Corner Bombardment Result: ${passed ? '✓ [PASS]' : '✗ [FAIL]'}\n`);
  }

  // =========================================================================
  // SUITE 3: Multi-Size Prey Matrix (Tiny, Normal, Chonky, Fractional)
  // =========================================================================
  console.log('--- SUITE 3: Multi-Size Prey Spectrum Stress (100,000 steps) ---');
  {
    const engine = new Engine();
    engine.width = 1024;
    engine.height = 768;

    const sizes = [
      { name: 'Tiny (R=20)', r: 20 },
      { name: 'Normal (R=32)', r: 32 },
      { name: 'Chonky (R=50)', r: 50 },
      { name: 'Fractional (R=33.333)', r: 33.333333 },
      { name: 'Super-Chonky (R=64)', r: 64 }
    ];

    let sizeViolations = 0;

    for (const s of sizes) {
      const sprite = { x: 512, y: 384, vx: 2500, vy: -2800, radius: s.r };
      let localViolations = 0;

      for (let i = 0; i < 20000; i++) {
        const dt = 0.01 + Math.random() * 0.09;
        if (i % 20 === 0) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1500 + Math.random() * 1500;
          sprite.vx = Math.cos(angle) * speed;
          sprite.vy = Math.sin(angle) * speed;
        }

        sprite.x += sprite.vx * dt;
        sprite.y += sprite.vy * dt;
        engine.applySafeMargins(sprite, dt);

        const top = sprite.y - s.r;
        const bottom = sprite.y + s.r;
        const left = sprite.x - s.r;
        const right = sprite.x + s.r;

        if (top < SAFE_MARGINS.TOP - EPSILON || bottom > 768 - SAFE_MARGINS.BOTTOM + EPSILON ||
            left < SAFE_MARGINS.SIDES - EPSILON || right > 1024 - SAFE_MARGINS.SIDES + EPSILON ||
            !Number.isFinite(sprite.x) || !Number.isFinite(sprite.y)) {
          localViolations++;
        }
      }

      sizeViolations += localViolations;
      console.log(`  Size ${s.name}: 20,000 steps -> Violations: ${localViolations}`);
    }

    const passed = sizeViolations === 0;
    if (!passed) overallPassed = false;
    suiteResults.push({ name: 'Multi-Size Spectrum Stress', passed, violations: sizeViolations });
    console.log(`  Multi-Size Stress Result: ${passed ? '✓ [PASS]' : '✗ [FAIL]'}\n`);
  }

  // =========================================================================
  // SUITE 4: Multi-Viewport Geometry Stress & Mid-Flight Dynamic Resizing
  // =========================================================================
  console.log('--- SUITE 4: Multi-Viewport Geometry & Dynamic Resizing Stress ---');
  {
    const viewports = [
      { name: 'Mobile Portrait (360x640)', w: 360, h: 640 },
      { name: 'Standard Tablet (1024x768)', w: 1024, h: 768 },
      { name: 'Ultrawide Desktop (2560x1080)', w: 2560, h: 1080 },
      { name: 'Compact Square (500x500)', w: 500, h: 500 },
      { name: 'Minimum Viewport (320x320)', w: 320, h: 320 }
    ];

    let vpViolations = 0;

    for (const vp of viewports) {
      const engine = new Engine();
      engine.width = vp.w;
      engine.height = vp.h;
      const R = 32;
      const sprite = { x: vp.w / 2, y: vp.h / 2, vx: 2000, vy: -2000, radius: R };
      let localViolations = 0;

      for (let i = 0; i < 10000; i++) {
        const dt = 0.01 + Math.random() * 0.08;
        if (i % 25 === 0) {
          const angle = Math.random() * Math.PI * 2;
          sprite.vx = Math.cos(angle) * 2500;
          sprite.vy = Math.sin(angle) * 2500;
        }

        sprite.x += sprite.vx * dt;
        sprite.y += sprite.vy * dt;
        engine.applySafeMargins(sprite, dt);

        const top = sprite.y - R;
        const bottom = sprite.y + R;
        const left = sprite.x - R;
        const right = sprite.x + R;

        if (top < SAFE_MARGINS.TOP - EPSILON || bottom > vp.h - SAFE_MARGINS.BOTTOM + EPSILON ||
            left < SAFE_MARGINS.SIDES - EPSILON || right > vp.w - SAFE_MARGINS.SIDES + EPSILON ||
            !Number.isFinite(sprite.x) || !Number.isFinite(sprite.y)) {
          localViolations++;
        }
      }

      vpViolations += localViolations;
      console.log(`  Viewport ${vp.name}: 10,000 steps -> Violations: ${localViolations}`);
    }

    // Dynamic resize test mid-flight
    console.log('  Testing dynamic viewport mutation mid-flight at 3000 px/s...');
    const engine = new Engine();
    engine.width = 1024;
    engine.height = 768;
    const sprite = { x: 900, y: 700, vx: 3000, vy: 3000, radius: 32 };
    let resizeViolations = 0;

    // Viewport suddenly shrinks to 600x400 while sprite is at (900, 700)
    engine.width = 600;
    engine.height = 400;
    engine.applySafeMargins(sprite, 0.016);

    const top = sprite.y - 32;
    const bottom = sprite.y + 32;
    const left = sprite.x - 32;
    const right = sprite.x + 32;

    if (top < SAFE_MARGINS.TOP - EPSILON || bottom > 400 - SAFE_MARGINS.BOTTOM + EPSILON ||
        left < SAFE_MARGINS.SIDES - EPSILON || right > 600 - SAFE_MARGINS.SIDES + EPSILON) {
      resizeViolations++;
    }
    vpViolations += resizeViolations;
    console.log(`  Dynamic resize projection: sprite projected from (900,700) -> (${sprite.x}, ${sprite.y}) with ${resizeViolations} violations`);

    const passed = vpViolations === 0;
    if (!passed) overallPassed = false;
    suiteResults.push({ name: 'Multi-Viewport & Dynamic Resize Stress', passed, violations: vpViolations });
    console.log(`  Viewport Stress Result: ${passed ? '✓ [PASS]' : '✗ [FAIL]'}\n`);
  }

  // =========================================================================
  // SUITE 5: Extreme Out-of-Bounds Injection & Negative Coordinate Recovery
  // =========================================================================
  console.log('--- SUITE 5: Out-of-Bounds Injection & Negative Recovery ---');
  {
    const engine = new Engine();
    engine.width = 1024;
    engine.height = 768;
    const R = 32;

    const extremePoints = [
      { name: 'Deep Negative X/Y (-1000, -1000)', x: -1000, y: -1000, vx: -3000, vy: -3000 },
      { name: 'Far Beyond Screen (5000, 5000)', x: 5000, y: 5000, vx: 3000, vy: 3000 },
      { name: 'Zero Point (0, 0)', x: 0, y: 0, vx: -500, vy: -500 },
      { name: 'Tab Bar Penetration (500, 10)', x: 500, y: 10, vx: 0, vy: -1000 },
      { name: 'Home Indicator Penetration (500, 760)', x: 500, y: 760, vx: 0, vy: 1000 }
    ];

    let recoveryViolations = 0;

    for (const pt of extremePoints) {
      const sprite = { x: pt.x, y: pt.y, vx: pt.vx, vy: pt.vy, radius: R };
      engine.applySafeMargins(sprite, 0.05);

      const top = sprite.y - R;
      const bottom = sprite.y + R;
      const left = sprite.x - R;
      const right = sprite.x + R;

      const violated =
        top < SAFE_MARGINS.TOP - EPSILON ||
        bottom > 768 - SAFE_MARGINS.BOTTOM + EPSILON ||
        left < SAFE_MARGINS.SIDES - EPSILON ||
        right > 1024 - SAFE_MARGINS.SIDES + EPSILON ||
        !Number.isFinite(sprite.x) ||
        !Number.isFinite(sprite.y);

      if (violated) recoveryViolations++;
      console.log(`  ${pt.name} -> Recovered to (${sprite.x}, ${sprite.y}) | vx: ${sprite.vx}, vy: ${sprite.vy}`);
    }

    const passed = recoveryViolations === 0;
    if (!passed) overallPassed = false;
    suiteResults.push({ name: 'Out-of-Bounds Recovery', passed, violations: recoveryViolations });
    console.log(`  Out-of-Bounds Recovery Result: ${passed ? '✓ [PASS]' : '✗ [FAIL]'}\n`);
  }

  // =========================================================================
  // SUITE 6: Multi-Prey Engine.update() Integration (50,000 engine ticks)
  // =========================================================================
  console.log('--- SUITE 6: Multi-Prey Engine.update() Integration (50,000 ticks) ---');
  {
    const engine = new Engine();
    engine.width = 1024;
    engine.height = 768;
    engine.start();

    // Create 4 high-speed prey agents
    const preyList = [
      { id: 1, x: 200, y: 200, vx: 2200, vy: -2500, radius: 20, update(dt, sa) { this.x += this.vx * dt; this.y += this.vy * dt; } },
      { id: 2, x: 800, y: 200, vx: -2500, vy: -2500, radius: 32, update(dt, sa) { this.x += this.vx * dt; this.y += this.vy * dt; } },
      { id: 3, x: 200, y: 600, vx: 2800, vy: 2800, radius: 50, update(dt, sa) { this.x += this.vx * dt; this.y += this.vy * dt; } },
      { id: 4, x: 800, y: 600, vx: -3000, vy: 3000, radius: 32, update(dt, sa) { this.x += this.vx * dt; this.y += this.vy * dt; } }
    ];
    engine.preyList = preyList;

    let engineViolations = 0;

    for (let tick = 0; tick < 50000; tick++) {
      const dt = 0.01 + Math.random() * 0.15; // 10ms - 160ms lag spikes
      engine.update(dt);

      for (const p of engine.preyList) {
        const top = p.y - p.radius;
        const bottom = p.y + p.radius;
        const left = p.x - p.radius;
        const right = p.x + p.radius;

        if (top < SAFE_MARGINS.TOP - EPSILON || bottom > 768 - SAFE_MARGINS.BOTTOM + EPSILON ||
            left < SAFE_MARGINS.SIDES - EPSILON || right > 1024 - SAFE_MARGINS.SIDES + EPSILON ||
            !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
          engineViolations++;
        }
      }
    }

    const passed = engineViolations === 0;
    if (!passed) overallPassed = false;
    suiteResults.push({ name: 'Multi-Prey Engine.update Integration', passed, violations: engineViolations });
    console.log(`  50,000 Ticks across 4 concurrent prey agents -> Violations: ${engineViolations}`);
    console.log(`  Engine.update Integration Result: ${passed ? '✓ [PASS]' : '✗ [FAIL]'}\n`);
  }

  // =========================================================================
  // FINAL VERDICT & SUMMARY
  // =========================================================================
  console.log('======================================================================');
  console.log('📊 EMPIRICAL STRESS TEST SUMMARY REPORT 📊');
  console.log('======================================================================');
  let totalStepsAccumulator = 0;
  let totalViolationsAccumulator = 0;

  for (const res of suiteResults) {
    const steps = res.totalSteps || (res.name.includes('Corner') ? 40000 : res.name.includes('Size') ? 100000 : res.name.includes('Viewport') ? 50000 : res.name.includes('Engine') ? 200000 : 5);
    const violations = res.telemetry ? (res.telemetry.violations.top + res.telemetry.violations.bottom + res.telemetry.violations.left + res.telemetry.violations.right + res.telemetry.violations.nanOrInf) : res.violations;
    totalStepsAccumulator += steps;
    totalViolationsAccumulator += violations;
    console.log(`  ${res.passed ? '✓' : '✗'} ${res.name.padEnd(45)}: ${violations} violations`);
  }

  console.log('----------------------------------------------------------------------');
  console.log(`  Total Simulated Steps Tested : ${totalStepsAccumulator.toLocaleString()}`);
  console.log(`  Total Margin Violations      : ${totalViolationsAccumulator}`);
  console.log(`  Final Challenger Verdict     : ${overallPassed ? '🟢 APPROVE' : '🔴 REQUEST_CHANGES'}`);
  console.log('======================================================================\n');

  return {
    overallPassed,
    verdict: overallPassed ? 'APPROVE' : 'REQUEST_CHANGES',
    totalSteps: totalStepsAccumulator,
    totalViolations: totalViolationsAccumulator,
    suites: suiteResults
  };
}

if (require.main === module) {
  const result = runStressTests();
  process.exit(result.overallPassed ? 0 : 1);
}

module.exports = { runStressTests };
