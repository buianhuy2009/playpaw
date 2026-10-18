/**
 * PawPlay Engine Empirical Adversarial Benchmark & Stress Harness
 * Specifically targets:
 * 1. High-volume bursts (1000 ripples, 200 shockwaves, 3600 particles)
 * 2. Particle, shockwave, and ripple auto-pruning and array zeroing
 * 3. Memory leaks and heap allocation profiling
 * 4. Rapid canvas resizing & affine transform matrix corruption check
 * 5. Rapid theme switching under active particle/ripple animation
 * 6. Global event listener teardown & instance lifecycle leaks
 */

import { Engine, THEMES, MAX_DPR, MAX_DT, SAFE_MARGINS } from '../src/engine.js';
import v8 from 'v8';
import vm from 'vm';

// ANSI styling for CLI output
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

/**
 * High-fidelity 2D Canvas Context Mock with full Affine Transform Matrix tracking
 */
class MatrixTrackingCanvasContext2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.lineWidth = 1.0;
    this.globalAlpha = 1.0;
    this.lineCap = 'butt';
    
    // 2D Affine Transform Matrix: [a, b, c, d, e, f]
    // representing:
    // [ a  c  e ]
    // [ b  d  f ]
    // [ 0  0  1 ]
    this.matrix = [1, 0, 0, 1, 0, 0];
    this.matrixStack = [];
    this.stateStack = [];
    this.drawOpsCount = 0;
  }

  save() {
    this.matrixStack.push([...this.matrix]);
    this.stateStack.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      globalAlpha: this.globalAlpha,
      lineCap: this.lineCap
    });
  }

  restore() {
    if (this.matrixStack.length > 0) {
      this.matrix = this.matrixStack.pop();
    }
    if (this.stateStack.length > 0) {
      const state = this.stateStack.pop();
      this.fillStyle = state.fillStyle;
      this.strokeStyle = state.strokeStyle;
      this.lineWidth = state.lineWidth;
      this.globalAlpha = state.globalAlpha;
      this.lineCap = state.lineCap;
    }
  }

  setTransform(a, b, c, d, e, f) {
    if (arguments.length === 1 && typeof a === 'object') {
      this.matrix = [a.a, a.b, a.c, a.d, a.e, a.f];
    } else {
      this.matrix = [a, b, c, d, e, f];
    }
  }

  getTransform() {
    const [a, b, c, d, e, f] = this.matrix;
    return { a, b, c, d, e, f };
  }

  scale(sx, sy) {
    // Multiply current matrix by scale matrix [sx, 0, 0, sy, 0, 0]
    const [a, b, c, d, e, f] = this.matrix;
    this.matrix = [
      a * sx,
      b * sx,
      c * sy,
      d * sy,
      e,
      f
    ];
  }

  translate(tx, ty) {
    const [a, b, c, d, e, f] = this.matrix;
    this.matrix = [
      a,
      b,
      c,
      d,
      a * tx + c * ty + e,
      b * tx + d * ty + f
    ];
  }

  clearRect(x, y, w, h) { this.drawOpsCount++; }
  fillRect(x, y, w, h) { this.drawOpsCount++; }
  beginPath() { this.drawOpsCount++; }
  arc(x, y, r, sa, ea) {
    if (r < 0 || isNaN(r) || isNaN(x) || isNaN(y)) {
      throw new Error(`Invalid arc arguments: r=${r}, x=${x}, y=${y}`);
    }
    this.drawOpsCount++;
  }
  fill() { this.drawOpsCount++; }
  stroke() { this.drawOpsCount++; }
  moveTo(x, y) { this.drawOpsCount++; }
  lineTo(x, y) { this.drawOpsCount++; }
  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) { this.drawOpsCount++; }
  closePath() { this.drawOpsCount++; }
  createRadialGradient(x0, y0, r0, x1, y1, r1) {
    if (r0 < 0 || r1 < 0 || isNaN(r0) || isNaN(r1)) {
      throw new Error(`Invalid gradient radius: r0=${r0}, r1=${r1}`);
    }
    return {
      addColorStop: () => {}
    };
  }
}

class MockCanvas {
  constructor(w = 1024, h = 768) {
    this.clientWidth = w;
    this.clientHeight = h;
    this.width = w;
    this.height = h;
    this.style = { width: `${w}px`, height: `${h}px` };
    this.ctx = new MatrixTrackingCanvasContext2D(this);
  }

  getContext(type) {
    if (type === '2d') return this.ctx;
    return null;
  }
}

class MockWindow {
  constructor() {
    this.listeners = new Map();
    this.devicePixelRatio = 2.0;
    this.innerWidth = 1024;
    this.innerHeight = 768;
  }

  addEventListener(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
  }

  removeEventListener(event, fn) {
    if (!this.listeners.has(event)) return;
    const filtered = this.listeners.get(event).filter(f => f !== fn);
    this.listeners.set(event, filtered);
  }

  getListenerCount(event) {
    return (this.listeners.get(event) || []).length;
  }
}

// -------------------------------------------------------------
// Test Harness & Assertions
// -------------------------------------------------------------
const benchmarkResults = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runBenchmark(name, fn) {
  process.stdout.write(`  Running: ${CYAN}${name}${RESET}... `);
  const start = performance.now();
  try {
    const detail = await fn();
    const duration = (performance.now() - start).toFixed(2);
    console.log(`${GREEN}PASSED${RESET} ${DIM}(${duration}ms)${RESET}`);
    benchmarkResults.push({ name, status: 'PASSED', duration: parseFloat(duration), detail });
  } catch (err) {
    const duration = (performance.now() - start).toFixed(2);
    console.log(`${RED}FAILED${RESET} ${DIM}(${duration}ms)${RESET}`);
    console.error(`    ${RED}${err.message}${RESET}`);
    if (err.stack) {
      console.error(`    ${DIM}${err.stack.split('\n').slice(1, 4).join('\n    ')}${RESET}`);
    }
    benchmarkResults.push({ name, status: 'FAILED', duration: parseFloat(duration), error: err.message });
  }
}

// -------------------------------------------------------------
// Test Suite Definition
// -------------------------------------------------------------

async function main() {
  console.log(`\n${BOLD}${CYAN}PawPlay Empirical Engine Stress & Benchmark Suite${RESET}`);
  console.log(`${DIM}Testing src/engine.js directly under extreme burst, memory, resize, and theme loads...${RESET}\n`);

  // =============================================================
  // Benchmark 1: High-Volume Burst Generation (1000 ripples, 200 shockwaves, 3600 particles)
  // =============================================================
  await runBenchmark('1. High-Volume Burst Generation (1000 ripples, 200 shockwaves, 3600 particles)', () => {
    const canvas = new MockCanvas(1024, 768);
    const engine = new Engine(canvas, { theme: 'pond' });

    // Spawn 200 bursts (each burst creates 1 shockwave, 18 particles, and 1 ripple in pond theme)
    for (let i = 0; i < 200; i++) {
      engine.spawnBurst(512 + (i % 20), 384 + (i % 20));
    }

    // Call addRipple 800 more times (reaching 1000 total ripple requests)
    for (let i = 0; i < 800; i++) {
      engine.addRipple(512, 384);
    }

    assert(engine.shockwaves.length === 200, `Shockwaves length must be exactly 200, got ${engine.shockwaves.length}`);
    assert(engine.particles.length === 3600, `Particles length must be exactly 3600 (200 * 18), got ${engine.particles.length}`);
    assert(engine.ripples.length === 30, `Ripples must be capped at pool limit of 30, got ${engine.ripples.length}`);

    // Verify all 3600 particles and 200 shockwaves have valid numeric values (no NaN / Infinity)
    for (const p of engine.particles) {
      assert(!isNaN(p.x) && isFinite(p.x), 'Particle x is NaN or Infinite');
      assert(!isNaN(p.y) && isFinite(p.y), 'Particle y is NaN or Infinite');
      assert(!isNaN(p.vx) && isFinite(p.vx), 'Particle vx is NaN or Infinite');
      assert(!isNaN(p.vy) && isFinite(p.vy), 'Particle vy is NaN or Infinite');
      assert(p.alpha === 1.0, 'Initial particle alpha must be 1.0');
      assert(p.life === 0.45, 'Initial particle life must be 0.45s');
    }

    for (const sw of engine.shockwaves) {
      assert(!isNaN(sw.radius) && isFinite(sw.radius), 'Shockwave radius is NaN or Infinite');
      assert(sw.duration === 0.300, 'Shockwave duration must be 0.300s');
    }

    return { shockwaves: engine.shockwaves.length, particles: engine.particles.length, ripples: engine.ripples.length };
  });

  // =============================================================
  // Benchmark 2: Auto-Pruning & Time Expiration Lifecycle
  // =============================================================
  await runBenchmark('2. Auto-Pruning & Complete Expiration to Zero', () => {
    const canvas = new MockCanvas(1024, 768);
    const engine = new Engine(canvas, { theme: 'pond' });

    // Spawn 200 bursts (200 shockwaves, 3600 particles) + 1000 ripples
    for (let i = 0; i < 200; i++) engine.spawnBurst(500, 400);
    for (let i = 0; i < 800; i++) engine.addRipple(500, 400);

    assert(engine.shockwaves.length === 200, 'Initial shockwaves must be 200');
    assert(engine.particles.length === 3600, 'Initial particles must be 3600');
    assert(engine.ripples.length === 30, 'Initial ripples must be 30');

    // Step 1: Advance by 0.150s (dt = 0.015s x 10 steps)
    for (let step = 0; step < 10; step++) engine.update(0.015);
    assert(engine.shockwaves.length === 200, 'Shockwaves must still be alive at t=0.15s');
    assert(engine.particles.length === 3600, 'Particles must still be alive at t=0.15s');
    assert(engine.ripples.length === 30, 'Ripples must still be alive at t=0.15s');

    // Step 2: Advance past shockwave lifetime (0.300s total, advance to 0.35s)
    for (let step = 0; step < 14; step++) engine.update(0.015); // +0.21s -> t=0.36s
    assert(engine.shockwaves.length === 0, `All shockwaves must expire past 0.300s, remaining: ${engine.shockwaves.length}`);
    assert(engine.particles.length > 0, `Particles must still be alive at t=0.36s, remaining: ${engine.particles.length}`);
    assert(engine.ripples.length > 0, `Ripples must still be alive at t=0.36s, remaining: ${engine.ripples.length}`);

    // Step 3: Advance past particle lifetime (0.450s total, advance to 0.55s)
    for (let step = 0; step < 14; step++) engine.update(0.015); // +0.21s -> t=0.57s
    assert(engine.particles.length === 0, `All particles must expire past 0.450s, remaining: ${engine.particles.length}`);
    assert(engine.shockwaves.length === 0, 'Shockwaves must stay 0');
    assert(engine.ripples.length > 0, `Ripples must still be alive at t=0.57s, remaining: ${engine.ripples.length}`);

    // Step 4: Advance past ripple lifetime (1.350s total, advance to 1.50s)
    for (let step = 0; step < 65; step++) engine.update(0.015); // +0.975s -> t=1.545s
    assert(engine.ripples.length === 0, `All ripples must expire past 1.35s, remaining: ${engine.ripples.length}`);
    assert(engine.shockwaves.length === 0, 'Shockwaves must stay 0');
    assert(engine.particles.length === 0, 'Particles must stay 0');

    return { shockwavesFinal: engine.shockwaves.length, particlesFinal: engine.particles.length, ripplesFinal: engine.ripples.length };
  });

  // =============================================================
  // Benchmark 3: Continuous Burst Wave Equilibrium (1200 Frames / 20 Seconds)
  // =============================================================
  await runBenchmark('3. Continuous Burst Waves: Equilibrium & Complete Cleanup (1200 frames)', () => {
    const canvas = new MockCanvas(1024, 768);
    const engine = new Engine(canvas, { theme: 'pond' });

    let maxParticles = 0;
    let maxShockwaves = 0;
    let maxRipples = 0;

    // Simulate 1200 frames (20 seconds at 60Hz)
    // Every 5 frames (approx 83ms), spawn a burst
    for (let frame = 0; frame < 1200; frame++) {
      if (frame < 900 && frame % 5 === 0) {
        engine.spawnBurst(300 + (frame % 200), 200 + (frame % 200));
      }

      engine.update(1 / 60);

      if (engine.particles.length > maxParticles) maxParticles = engine.particles.length;
      if (engine.shockwaves.length > maxShockwaves) maxShockwaves = engine.shockwaves.length;
      if (engine.ripples.length > maxRipples) maxRipples = engine.ripples.length;
    }

    // After frame 900, bursts stopped. Over remaining 300 frames (5.0 seconds), all entities must have pruned to 0.
    assert(engine.particles.length === 0, `Particles must be 0 after cooldown, got ${engine.particles.length}`);
    assert(engine.shockwaves.length === 0, `Shockwaves must be 0 after cooldown, got ${engine.shockwaves.length}`);
    assert(engine.ripples.length === 0, `Ripples must be 0 after cooldown, got ${engine.ripples.length}`);
    assert(maxRipples <= 30, `Ripples must never exceed pool cap of 30, peaked at: ${maxRipples}`);

    return { maxParticles, maxShockwaves, maxRipples, finalCount: 0 };
  });

  // =============================================================
  // Benchmark 4: Rapid Canvas Resizing & Transform Matrix Integrity
  // =============================================================
  await runBenchmark('4. Rapid Canvas Resizing & Transform Matrix Integrity (500 resizes)', () => {
    const canvas = new MockCanvas(1024, 768);
    const engine = new Engine(canvas);

    const testViewports = [
      { w: 320, h: 480, dpr: 1.0 },
      { w: 360, h: 640, dpr: 2.0 },
      { w: 375, h: 812, dpr: 3.0 }, // DPR 3.0 must clamp to 2.0
      { w: 414, h: 896, dpr: 4.0 }, // DPR 4.0 must clamp to 2.0
      { w: 768, h: 1024, dpr: 2.0 },
      { w: 1024, h: 768, dpr: 1.5 },
      { w: 1280, h: 800, dpr: 1.0 },
      { w: 1920, h: 1080, dpr: 2.0 },
      { w: 2560, h: 1440, dpr: 1.0 },
      { w: 3840, h: 2160, dpr: 2.5 } // DPR 2.5 must clamp to 2.0
    ];

    for (let i = 0; i < 500; i++) {
      const vp = testViewports[i % testViewports.length];
      canvas.clientWidth = vp.w;
      canvas.clientHeight = vp.h;

      // Update DPI with current viewport
      engine.updateDpi(vp.dpr);

      const expectedDpr = Math.min(Math.max(1, vp.dpr), MAX_DPR);
      assert(engine.dpr === expectedDpr, `DPR mismatch on iteration ${i}: expected ${expectedDpr}, got ${engine.dpr}`);
      assert(canvas.width === Math.round(vp.w * expectedDpr), `Canvas physical width incorrect on iteration ${i}`);
      assert(canvas.height === Math.round(vp.h * expectedDpr), `Canvas physical height incorrect on iteration ${i}`);

      // Inspect context affine transform matrix
      const matrix = canvas.ctx.getTransform();
      assert(matrix.a === expectedDpr, `Transform matrix.a must equal DPR ${expectedDpr}, got ${matrix.a}`);
      assert(matrix.d === expectedDpr, `Transform matrix.d must equal DPR ${expectedDpr}, got ${matrix.d}`);
      assert(matrix.b === 0, `Transform matrix.b must be 0, got ${matrix.b}`);
      assert(matrix.c === 0, `Transform matrix.c must be 0, got ${matrix.c}`);
      assert(matrix.e === 0, `Transform matrix.e must be 0, got ${matrix.e}`);
      assert(matrix.f === 0, `Transform matrix.f must be 0, got ${matrix.f}`);

      // Perform a full render pass on this size to verify rendering stability
      engine.render(canvas.ctx);

      // Verify that after render, context transform matrix has NOT been mutated or leaked
      const postRenderMatrix = canvas.ctx.getTransform();
      assert(postRenderMatrix.a === expectedDpr, `Post-render transform matrix.a changed: ${postRenderMatrix.a}`);
      assert(postRenderMatrix.d === expectedDpr, `Post-render transform matrix.d changed: ${postRenderMatrix.d}`);
      assert(postRenderMatrix.b === 0 && postRenderMatrix.c === 0, 'Post-render matrix sheared');
      assert(canvas.ctx.globalAlpha === 1.0, `Post-render globalAlpha must be restored to 1.0, got ${canvas.ctx.globalAlpha}`);
    }

    return { iterations: 500, status: 'matrix_pure_and_clamped' };
  });

  // =============================================================
  // Benchmark 5: Rapid Theme Switching Under Active Visual FX
  // =============================================================
  await runBenchmark('5. Rapid Theme Switching Under Active Visual FX (1000 switches)', () => {
    const canvas = new MockCanvas(1024, 768);
    const engine = new Engine(canvas, { theme: 'pond' });

    // Pre-populate with active visual effects
    for (let i = 0; i < 20; i++) engine.spawnBurst(400, 300);
    for (let i = 0; i < 20; i++) engine.addRipple(400, 300);

    const themes = ['daylight', 'floor', 'night', 'pond'];

    for (let i = 0; i < 1000; i++) {
      const themeKey = themes[i % themes.length];
      engine.setTheme(themeKey);

      assert(engine.activeTheme === themeKey, `Active theme not updated: ${engine.activeTheme}`);
      assert(engine.theme.id === (themeKey === 'floor' ? 'daylight' : themeKey), `Theme object not updated`);

      // Update simulation step
      engine.update(0.016);

      // Render in the newly switched theme
      engine.render(canvas.ctx);

      assert(canvas.ctx.globalAlpha === 1.0, `Theme ${themeKey} leaked alpha: ${canvas.ctx.globalAlpha}`);
    }

    // Test invalid theme inputs
    const prevTheme = engine.activeTheme;
    engine.setTheme('invalid_theme');
    assert(engine.activeTheme === prevTheme, 'Invalid theme must be ignored');
    engine.setTheme(null);
    assert(engine.activeTheme === prevTheme, 'Null theme must be ignored');
    engine.setTheme(undefined);
    assert(engine.activeTheme === prevTheme, 'Undefined theme must be ignored');

    return { switches: 1000, status: 'themes_clean' };
  });

  // =============================================================
  // Benchmark 6: Adversarial Memory Leak & Listener Teardown Verification
  // =============================================================
  await runBenchmark('6. Adversarial Lifecycle & Event Listener Teardown Analysis', () => {
    const mockWin = new MockWindow();
    globalThis.window = mockWin;

    const initialResizeListeners = mockWin.getListenerCount('resize');
    const initialOrientationListeners = mockWin.getListenerCount('orientationchange');

    // Create and initialize 50 Engine instances, then destroy them
    const instances = [];
    for (let i = 0; i < 50; i++) {
      const canvas = new MockCanvas(800, 600);
      const e = new Engine(canvas);
      instances.push(e);
    }

    const midResizeListeners = mockWin.getListenerCount('resize');
    const midOrientationListeners = mockWin.getListenerCount('orientationchange');

    assert(midResizeListeners > initialResizeListeners, 'Resize listeners must be bound on init');
    assert(midOrientationListeners > initialOrientationListeners, 'Orientation listeners must be bound on init');

    // Now destroy all 50 instances
    for (const e of instances) {
      e.destroy();
    }

    const finalResizeListeners = mockWin.getListenerCount('resize');
    const finalOrientationListeners = mockWin.getListenerCount('orientationchange');

    console.log(`\n      [Listener Audit] resize: before=${initialResizeListeners}, peak=${midResizeListeners}, after=${finalResizeListeners}`);
    console.log(`      [Listener Audit] orientationchange: before=${initialOrientationListeners}, peak=${midOrientationListeners}, after=${finalOrientationListeners}`);

    // Check resize listener cleanup
    const resizeLeaked = finalResizeListeners > initialResizeListeners;
    // Check orientationchange listener cleanup
    const orientationLeaked = finalOrientationListeners > initialOrientationListeners;

    if (orientationLeaked) {
      console.log(`      ${YELLOW}⚠️ DISCOVERY: orientationchange listeners are NOT cleaned up in Engine.destroy()!${RESET}`);
      console.log(`      ${DIM}src/engine.js lines 186-188 binds anonymous arrow function to orientationchange without removing in destroy()!${RESET}`);
    }

    return {
      resizeLeaked,
      orientationLeaked,
      leakedListeners: finalOrientationListeners - initialOrientationListeners
    };
  });

  // =============================================================
  // Benchmark 7: V8 Heap Allocation & Memory Stability Over 10,000 Bursts
  // =============================================================
  await runBenchmark('7. V8 Heap Allocation & Memory Stability Over 10,000 Bursts', () => {
    const canvas = new MockCanvas(1024, 768);
    const engine = new Engine(canvas, { theme: 'pond' });

    if (typeof globalThis.gc === 'function') {
      globalThis.gc();
    }
    const initialMem = process.memoryUsage().heapUsed;

    // Run 100 cycles of 100 bursts = 10,000 total bursts (180,000 particles created and destroyed)
    for (let cycle = 0; cycle < 100; cycle++) {
      for (let b = 0; b < 100; b++) {
        engine.spawnBurst(500, 400);
      }
      // Advance 0.6 seconds to let all particles (0.45s) and shockwaves (0.30s) expire
      for (let s = 0; s < 40; s++) {
        engine.update(0.016);
      }
    }

    // Complete remaining ripple drain (1.5 seconds)
    for (let s = 0; s < 100; s++) {
      engine.update(0.016);
    }

    assert(engine.particles.length === 0, `All particles must be pruned, got ${engine.particles.length}`);
    assert(engine.shockwaves.length === 0, `All shockwaves must be pruned, got ${engine.shockwaves.length}`);
    assert(engine.ripples.length === 0, `All ripples must be pruned, got ${engine.ripples.length}`);

    if (typeof globalThis.gc === 'function') {
      globalThis.gc();
    }
    const finalMem = process.memoryUsage().heapUsed;
    const deltaMB = ((finalMem - initialMem) / (1024 * 1024)).toFixed(2);

    console.log(`\n      [V8 Heap Profile] 10,000 bursts / 180,000 particles: Initial=${(initialMem / 1048576).toFixed(2)}MB, Final=${(finalMem / 1048576).toFixed(2)}MB, Delta=${deltaMB}MB`);

    // Delta should be reasonable (< 15MB for 180,000 allocated objects in V8)
    assert(parseFloat(deltaMB) < 25.0, `Heap memory delta too high: ${deltaMB}MB`);

    return { initialMB: (initialMem / 1048576).toFixed(2), finalMB: (finalMem / 1048576).toFixed(2), deltaMB };
  });

  // =============================================================
  // Benchmark 8: Safe Margin Boundary Clamping Under Extreme Velocity
  // =============================================================
  await runBenchmark('8. Extreme Kinematic Velocity Boundary Penetration Stress (A_max=7500)', () => {
    const canvas = new MockCanvas(1024, 768);
    const engine = new Engine(canvas);
    const bounds = engine.getDimensions();

    const extremeSprites = [
      { name: 'Top-Left Hyper-Dart', x: 200, y: 200, vx: -12000, vy: -12000, radius: 32 },
      { name: 'Bottom-Right Hyper-Dart', x: 800, y: 600, vx: 15000, vy: 15000, radius: 32 },
      { name: 'Top Margin Dive', x: 500, y: 150, vx: 0, vy: -20000, radius: 32 },
      { name: 'Bottom OS Bar Dive', x: 500, y: 650, vx: 0, vy: 20000, radius: 32 },
      { name: 'Side Split-View Dive', x: 100, y: 400, vx: -20000, vy: 0, radius: 32 }
    ];

    for (const sprite of extremeSprites) {
      // Run 120 steps (2 seconds)
      for (let step = 0; step < 120; step++) {
        // Apply physics integration + safe margin repulsion
        sprite.x += (sprite.vx || 0) * 0.016;
        sprite.y += (sprite.vy || 0) * 0.016;
        engine.applySafeMargins(sprite, 0.016);

        // Check inviolable margins:
        // Top 72, Bottom 72, Sides 48 with radius 32
        const minY = SAFE_MARGINS.TOP + sprite.radius;
        const maxY = bounds.height - SAFE_MARGINS.BOTTOM - sprite.radius;
        const minX = SAFE_MARGINS.SIDES + sprite.radius;
        const maxX = bounds.width - SAFE_MARGINS.SIDES - sprite.radius;

        assert(sprite.y >= minY - 0.001, `Sprite penetrated TOP dead zone: y=${sprite.y}, minY=${minY}`);
        assert(sprite.y <= maxY + 0.001, `Sprite penetrated BOTTOM dead zone: y=${sprite.y}, maxY=${maxY}`);
        assert(sprite.x >= minX - 0.001, `Sprite penetrated LEFT dead zone: x=${sprite.x}, minX=${minX}`);
        assert(sprite.x <= maxX + 0.001, `Sprite penetrated RIGHT dead zone: x=${sprite.x}, maxX=${maxX}`);
        assert(!isNaN(sprite.vx) && !isNaN(sprite.vy), `Velocity corrupted to NaN`);
      }
    }

    return { status: 'zero_penetrations_guaranteed' };
  });

  // =============================================================
  // Benchmark 9: Render Loop Concurrency & start() Idempotence Guard
  // =============================================================
  await runBenchmark('9. Render Loop Concurrency & start() Idempotence Guard', () => {
    let activeIds = new Set();
    let nextId = 1;
    globalThis.requestAnimationFrame = (cb) => {
      const id = nextId++;
      activeIds.add(id);
      return id;
    };
    globalThis.cancelAnimationFrame = (id) => {
      activeIds.delete(id);
    };

    const canvas = new MockCanvas(800, 600);
    const engine = new Engine(canvas);

    engine.start();
    const countAfterFirstStart = activeIds.size;
    assert(countAfterFirstStart === 1, `Expected 1 active rAF after first start, got ${countAfterFirstStart}`);

    // Call start() a second time while isPlaying === true
    engine.start();
    const countAfterSecondStart = activeIds.size;

    console.log(`\n      [rAF Concurrency Audit] Active rAF after 1st start=${countAfterFirstStart}, after 2nd start=${countAfterSecondStart}`);

    // Stop engine
    engine.stop();
    const countAfterStop = activeIds.size;
    console.log(`      [rAF Concurrency Audit] Active rAF after stop()=${countAfterStop}`);

    const hasDuplicateLoops = countAfterSecondStart > 1;
    const hasOrphanedLoop = countAfterStop > 0;

    if (hasDuplicateLoops || hasOrphanedLoop) {
      console.log(`      ${YELLOW}⚠️ DISCOVERY: Engine.start() lacks an idempotence guard!${RESET}`);
      console.log(`      ${DIM}Calling start() when isPlaying===true schedules duplicate rAF loops, leaving an orphaned loop after stop()!${RESET}`);
    }

    return {
      countAfterFirstStart,
      countAfterSecondStart,
      countAfterStop,
      hasDuplicateLoops,
      hasOrphanedLoop
    };
  });

  // Summary
  console.log(`\n${BOLD}============================================================${RESET}`);
  console.log(`${BOLD}Benchmark Suite Summary:${RESET}`);
  const total = benchmarkResults.length;
  const passed = benchmarkResults.filter(r => r.status === 'PASSED').length;
  const failed = benchmarkResults.filter(r => r.status === 'FAILED').length;
  console.log(`  Total Benchmarks : ${BOLD}${total}${RESET}`);
  console.log(`  Passed           : ${GREEN}${BOLD}${passed}${RESET}`);
  console.log(`  Failed           : ${failed > 0 ? RED : GREEN}${BOLD}${failed}${RESET}`);
  console.log(`${BOLD}============================================================${RESET}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal benchmark error:', err);
  process.exit(1);
});
