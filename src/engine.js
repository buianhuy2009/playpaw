/**
 * PawPlay Core Engine (src/engine.js)
 * Milestone 1: High-DPI Canvas Scaling, 120Hz Delta-Time Normalized Render Loop,
 * 3-Tier Margin Repulsion Field, Contrast Themes, Water Ripples, Shockwaves & Burst Particles.
 *
 * Biologically calibrated for feline dichromacy (M-cone ~555nm / S-cone ~450nm)
 * and high flicker fusion frequency (70-100Hz).
 */

// -------------------------------------------------------------
// Authoritative Constants & Palettes
// -------------------------------------------------------------
export const SAFE_MARGINS = {
  TOP: 72,     // Clearance from top browser tab bar & address bar
  BOTTOM: 72,  // Clearance from iOS Home Indicator & Android gesture bar
  SIDES: 48    // Clearance from iPad split-view & side edge gestures
};

export const MARGIN_CONFIG = {
  SAFE_TOP: 72,
  SAFE_BOTTOM: 72,
  SAFE_SIDES: 48,
  BUFFER_DIST: 100,        // D_buf = 100px (Smooth steering buffer depth)
  CRITICAL_BUFFER: 40,     // Critical proximity buffer for active deflection
  MAX_STEER_ACCEL: 7500,   // A_max = 7500 px/s^2 (Peak inward steering acceleration)
  DAMPING_RATE: 12.0,      // k_damp = 12.0 s^-1 (Velocity-aligned directional damping)
  RESTITUTION: 0.5         // Restitution coefficient on boundary reflection
};

export const COLOR_YELLOW = '#FFD600'; // Peak feline M-cone excitation (~555nm)
export const COLOR_CYAN = '#00E5FF';   // Peak feline S-cone excitation (~450nm)
export const COLOR_WHITE = '#FFFFFF';

export const MAX_DPR = 2.0;            // Retina sharpness without GPU thermal throttling
export const MAX_DT = 0.05;            // 50ms clamp (prevents spiral of death / tunneling)

export const THEMES = {
  daylight: {
    id: 'daylight',
    name: 'Oak Wood Floor',
    bg: '#F4F1EA',
    contrastColor: '#1A110B',
    ripples: false
  },
  floor: {
    id: 'daylight',
    name: 'Oak Wood Floor',
    bg: '#F4F1EA',
    contrastColor: '#1A110B',
    ripples: false
  },
  wood: {
    id: 'wood',
    name: 'Oak Wood Floor',
    bg: '#F4F1EA',
    contrastColor: '#1A110B',
    ripples: false
  },
  rug: {
    id: 'rug',
    name: 'Cozy Amber Rug',
    bg: '#B85D19',
    contrastColor: '#FFFFFF',
    ripples: false
  },
  pond: {
    id: 'pond',
    name: 'Koi Pond',
    bg: '#0A2239',
    contrastColor: '#00E5FF',
    ripples: true
  },
  night: {
    id: 'night',
    name: 'Night Stalker',
    bg: '#10121A',
    contrastColor: '#FFD600',
    ripples: false
  },
  grass: {
    id: 'grass',
    name: 'Garden Grass',
    bg: '#1E4620',
    contrastColor: '#FFD600',
    ripples: false
  },
  marble: {
    id: 'marble',
    name: 'Kitchen Marble',
    bg: '#E2E6EA',
    contrastColor: '#1A202C',
    ripples: false
  },
  tatami: {
    id: 'tatami',
    name: 'Tatami Mat',
    bg: '#C5A96A',
    contrastColor: '#212529',
    ripples: false
  },
  space: {
    id: 'space',
    name: 'Cosmic Nebula',
    bg: '#0B081A',
    contrastColor: '#00E5FF',
    ripples: false
  }
};

// -------------------------------------------------------------
// Kinematic Geometric Utility Functions
// -------------------------------------------------------------

/**
 * Calculates active safe boundaries accounting for sprite visual radius.
 * @param {number} width - Logical canvas width
 * @param {number} height - Logical canvas height
 * @param {number} [radius=32] - Sprite visual radius
 * @returns {object} Safe boundary coordinates and safeArea rectangle
 */
export function getSafeBounds(width, height, radius = 32) {
  const r = (Number.isFinite(radius) && radius > 0) ? radius : 32;
  const w = (Number.isFinite(width) && width > 0) ? width : 1024;
  const h = (Number.isFinite(height) && height > 0) ? height : 768;
  return {
    xMin: SAFE_MARGINS.SIDES + r,
    xMax: w - SAFE_MARGINS.SIDES - r,
    yMin: SAFE_MARGINS.TOP + r,
    yMax: h - SAFE_MARGINS.BOTTOM - r,
    safeArea: {
      top: SAFE_MARGINS.TOP,
      bottom: h - SAFE_MARGINS.BOTTOM,
      left: SAFE_MARGINS.SIDES,
      right: w - SAFE_MARGINS.SIDES
    }
  };
}

/**
 * Transforms Viewport / Pointer event coordinates to Logical Simulation coordinates.
 * @param {number} clientX
 * @param {number} clientY
 * @param {HTMLCanvasElement} canvasElement
 * @param {number} logicalWidth
 * @param {number} logicalHeight
 * @returns {{ x: number, y: number }}
 */
export function viewportToLogical(clientX, clientY, canvasElement, logicalWidth, logicalHeight) {
  if (!canvasElement || typeof canvasElement.getBoundingClientRect !== 'function') {
    return { x: clientX, y: clientY };
  }
  const rect = canvasElement.getBoundingClientRect();
  const scaleX = rect.width > 0 ? (logicalWidth || 1024) / rect.width : 1;
  const scaleY = rect.height > 0 ? (logicalHeight || 768) / rect.height : 1;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

// -------------------------------------------------------------
// Core Engine Class
// -------------------------------------------------------------

export class Engine {
  /**
   * @param {HTMLCanvasElement} [canvasElement]
   * @param {Object} [options]
   */
  constructor(canvasElement = null, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement && typeof canvasElement.getContext === 'function'
      ? canvasElement.getContext('2d')
      : null;

    // Display & Dimensions
    this.dpr = 1.0;
    this.width = 1024;
    this.height = 768;
    this.logicalWidth = 1024;
    this.logicalHeight = 768;

    // Theme & Visual State
    const initialThemeKey = options.theme || 'daylight';
    this.activeTheme = initialThemeKey;
    this.theme = THEMES[initialThemeKey] || THEMES.daylight;

    // Timing & State Flags
    this.isPlaying = false;
    this.isPaused = false;
    this.animationFrameId = null;
    this.lastTime = 0;
    this.idleTime = 0;
    this.score = 0;

    // Simulation Entities & Visual FX Pools
    this.particles = [];
    this.shockwaves = [];
    this.ripples = [];
    this.preyList = [];
    this.onTick = null; // Callback: (dt, engine) => void

    // Bound listeners for event cleanup
    this.handleResize = this.resize.bind(this);
    this._onOrientationChange = () => setTimeout(this.handleResize, 100);
    this.handleOrientation = this._onOrientationChange;

    if (this.canvas) {
      this.init(this.canvas);
    }
  }

  /**
   * Initializes high-DPI scaling, binds resize listener, and configures context.
   * @param {HTMLCanvasElement} [canvasElement]
   * @returns {Engine}
   */
  init(canvasElement) {
    if (canvasElement) {
      this.canvas = canvasElement;
      if (typeof canvasElement.getContext === 'function') {
        this.ctx = canvasElement.getContext('2d');
      }
    }

    this.updateDpi();

    if (typeof window !== 'undefined') {
      if (typeof window.removeEventListener === 'function') {
        window.removeEventListener('resize', this.handleResize);
        if (this._onOrientationChange) {
          window.removeEventListener('orientationchange', this._onOrientationChange);
        }
      }
      if (typeof window.addEventListener === 'function') {
        window.addEventListener('resize', this.handleResize);
        if (this._onOrientationChange) {
          window.addEventListener('orientationchange', this._onOrientationChange);
        }
      }
    }
    return this;
  }

  /**
   * Updates DPR and recomputes logical and physical canvas backing store dimensions.
   * Clamped to Math.min(devicePixelRatio, 2.0).
   * Applies idempotent affine transform matrix.
   * @param {number} [dprValue]
   */
  updateDpi(dprValue) {
    const rawDpr = dprValue !== undefined
      ? dprValue
      : (typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1);

    this.dpr = Math.min(Math.max(1, rawDpr || 1), MAX_DPR);

    if (this.canvas) {
      const cssW = this.canvas.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : this.width) || 1024;
      const cssH = this.canvas.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : this.height) || 768;

      this.width = cssW;
      this.height = cssH;
      this.logicalWidth = cssW;
      this.logicalHeight = cssH;

      this.canvas.width = Math.round(cssW * this.dpr);
      this.canvas.height = Math.round(cssH * this.dpr);

      if (this.canvas.style) {
        this.canvas.style.width = `${cssW}px`;
        this.canvas.style.height = `${cssH}px`;
      }

      if (this.ctx) {
        if (typeof this.ctx.setTransform === 'function') {
          // Idempotent affine transform matrix: resets matrix to [dpr, 0, 0, dpr, 0, 0]
          this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        } else if (typeof this.ctx.scale === 'function') {
          this.ctx.scale(this.dpr, this.dpr);
        }
      }
    }
  }

  /**
   * Resize handler.
   */
  resize() {
    this.updateDpi();
  }

  /**
   * Returns current logical dimensions, DPR, and safe margin bounding box.
   * @returns {{ width: number, height: number, dpr: number, safeArea: { top: number, bottom: number, left: number, right: number } }}
   */
  getDimensions() {
    const width = this.width || this.logicalWidth || (this.canvas ? this.canvas.clientWidth : 1024);
    const height = this.height || this.logicalHeight || (this.canvas ? this.canvas.clientHeight : 768);

    return {
      width,
      height,
      dpr: this.dpr,
      safeArea: {
        top: SAFE_MARGINS.TOP,
        bottom: height - SAFE_MARGINS.BOTTOM,
        left: SAFE_MARGINS.SIDES,
        right: width - SAFE_MARGINS.SIDES
      }
    };
  }

  /**
   * Switches background theme ('daylight', 'floor', 'night', 'pond').
   * Updates both this.activeTheme and this.theme object with { id, name, bg, contrastColor, ripples }.
   * @param {string} themeKey
   */
  setTheme(themeKey) {
    if (THEMES[themeKey]) {
      this.activeTheme = themeKey;
      this.theme = THEMES[themeKey];
    }
  }

  /**
   * Starts uncapped 120Hz requestAnimationFrame delta-time normalized loop.
   * @param {Function} [tickCallback] - (dt, engine) => void
   */
  start(tickCallback) {
    if (this.isPlaying) return;
    if (typeof tickCallback === 'function') {
      this.onTick = tickCallback;
    }
    this.isPlaying = true;
    this.isPaused = false;
    this.lastTime = 0; // Cold-start guard against initial time leap

    if (typeof requestAnimationFrame !== 'undefined') {
      const loop = (now) => {
        if (!this.isPlaying) return;

        if (!this.lastTime) {
          this.lastTime = now;
        }

        // Delta-time normalized calculation with 50ms (20 FPS) stability clamp
        const rawDt = (now - this.lastTime) / 1000;
        const dt = Math.min(Math.max(0, rawDt), MAX_DT);
        this.lastTime = now;

        if (!this.isPaused) {
          this.update(dt);

          if (this.ctx) {
            this.render(this.ctx);
          }

          if (this.onTick) {
            this.onTick(dt, this);
          }
        }

        this.animationFrameId = requestAnimationFrame(loop);
      };

      this.animationFrameId = requestAnimationFrame(loop);
    } else {
      this.lastTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    }
  }

  /**
   * Stops the render loop.
   */
  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    if (this.animationFrameId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Pauses simulation.
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * Resumes simulation, resetting lastTime to prevent delta-time surge.
   */
  resume() {
    this.isPaused = false;
    this.lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  /**
   * Resets idle timer.
   */
  resetIdleTimer() {
    this.idleTime = 0;
  }

  /**
   * Applies 3-Tier Margin Repulsion Field to sprite with failsafe NaN/invalid sanitization:
   * Tier 1: Smooth Inward Steering Field (C1-Hermite smoothstep, D_buf=100px, A_max=7500, k_damp=12)
   * Tier 2: Continuous Collision Detection (CCD) Swept Integration
   * Tier 3: Absolute Failsafe Hard Clamping Projection (Top/Bottom 72px, Sides 48px)
   *
   * @param {Object} sprite - Entity with { x, y, vx, vy, radius }
   * @param {number} [dt=0.016] - Delta-time in seconds
   */
  applySafeMargins(sprite, dt = 0.016, allowOffscreen = false) {
    if (!sprite || typeof sprite !== 'object') return;

    // Viewport dimensions with strict positive finite checks
    const rawW = this.width || this.logicalWidth || (this.canvas ? this.canvas.clientWidth : 1024);
    const rawH = this.height || this.logicalHeight || (this.canvas ? this.canvas.clientHeight : 768);
    const width = (Number.isFinite(rawW) && rawW > 0) ? rawW : 1024;
    const height = (Number.isFinite(rawH) && rawH > 0) ? rawH : 768;

    // 1. Radius sanitization: ensure positive finite number; recover corrupted radius
    const DEFAULT_RADIUS = 32;
    if (!Number.isFinite(sprite.radius) || sprite.radius <= 0) {
      sprite.radius = DEFAULT_RADIUS;
    }
    const R = sprite.radius;

    // 2. Safe boundaries calculation (allows brief offscreen excursions when allowOffscreen is true)
    const xMin = allowOffscreen ? -R * 0.5 : SAFE_MARGINS.SIDES + R;
    const xMax = allowOffscreen ? width + R * 0.5 : width - SAFE_MARGINS.SIDES - R;
    const yMin = allowOffscreen ? -R * 0.5 : SAFE_MARGINS.TOP + R;
    const yMax = allowOffscreen ? height + R * 0.5 : height - SAFE_MARGINS.BOTTOM - R;

    // 3. Compute geometric center of safe margins
    const safeCenterX = (xMin <= xMax) ? (xMin + xMax) / 2 : width / 2;
    const safeCenterY = (yMin <= yMax) ? (yMin + yMax) / 2 : height / 2;

    // 4. Validate and recover coordinates & velocities:
    // If coordinate is NaN or non-finite, reset safely to center of safe margins and halt velocity
    let positionCorrupted = false;
    if (!Number.isFinite(sprite.x)) {
      sprite.x = safeCenterX;
      positionCorrupted = true;
    }
    if (!Number.isFinite(sprite.y)) {
      sprite.y = safeCenterY;
      positionCorrupted = true;
    }
    if (positionCorrupted || !Number.isFinite(sprite.vx)) {
      sprite.vx = 0;
    }
    if (positionCorrupted || !Number.isFinite(sprite.vy)) {
      sprite.vy = 0;
    }

    // 5. Delta-time normalization: handle 0 correctly without falsy coercion, reject NaN/negative
    const validDt = (typeof dt === 'number' && Number.isFinite(dt) && dt >= 0) ? dt : 0.016;
    const clampedDt = Math.min(validDt, MAX_DT);

    const D_buf = MARGIN_CONFIG.BUFFER_DIST;
    const critBuf = MARGIN_CONFIG.CRITICAL_BUFFER;
    const A_max = MARGIN_CONFIG.MAX_STEER_ACCEL;
    const k_damp = MARGIN_CONFIG.DAMPING_RATE;
    const e = MARGIN_CONFIG.RESTITUTION;

    let ax = 0;
    let ay = 0;

    // -------------------------------------------------------------
    // TIER 1: Smooth Inward Steering Field
    // -------------------------------------------------------------
    // Left Boundary
    const distL = sprite.x - xMin;
    if (distL < D_buf) {
      const eta = Math.max(0, Math.min(1, 1 - distL / D_buf));
      const S = 3 * eta * eta - 2 * eta * eta * eta; // C1 Smoothstep
      const vToward = Math.max(0, -(sprite.vx || 0));
      ax += (A_max * S) + (k_damp * vToward * S);
    }

    // Right Boundary
    const distR = xMax - sprite.x;
    if (distR < D_buf) {
      const eta = Math.max(0, Math.min(1, 1 - distR / D_buf));
      const S = 3 * eta * eta - 2 * eta * eta * eta;
      const vToward = Math.max(0, sprite.vx || 0);
      ax -= (A_max * S) + (k_damp * vToward * S);
    }

    // Top Boundary
    const distT = sprite.y - yMin;
    if (distT < D_buf) {
      const eta = Math.max(0, Math.min(1, 1 - distT / D_buf));
      const S = 3 * eta * eta - 2 * eta * eta * eta;
      const vToward = Math.max(0, -(sprite.vy || 0));
      ay += (A_max * S) + (k_damp * vToward * S);
    }

    // Bottom Boundary
    const distB = yMax - sprite.y;
    if (distB < D_buf) {
      const eta = Math.max(0, Math.min(1, 1 - distB / D_buf));
      const S = 3 * eta * eta - 2 * eta * eta * eta;
      const vToward = Math.max(0, sprite.vy || 0);
      ay -= (A_max * S) + (k_damp * vToward * S);
    }

    sprite.vx = (sprite.vx || 0) + ax * clampedDt;
    sprite.vy = (sprite.vy || 0) + ay * clampedDt;

    // Critical proximity inward deflection: If moving outward within critical buffer, actively steer inward
    if (distL < critBuf && sprite.vx <= 0) {
      sprite.vx = Math.max(Math.abs(sprite.vx) * e, 100);
    }
    if (distR < critBuf && sprite.vx >= 0) {
      sprite.vx = -Math.max(Math.abs(sprite.vx) * e, 100);
    }
    if (distT < critBuf && sprite.vy <= 0) {
      sprite.vy = Math.max(Math.abs(sprite.vy) * e, 100);
    }
    if (distB < critBuf && sprite.vy >= 0) {
      sprite.vy = -Math.max(Math.abs(sprite.vy) * e, 100);
    }

    // -------------------------------------------------------------
    // TIER 2: Continuous Collision Detection (CCD) Swept Integration
    // -------------------------------------------------------------
    const xPred = sprite.x + sprite.vx * clampedDt;
    if (xPred < xMin && sprite.vx < 0) {
      const tHit = Math.max(0, (xMin - sprite.x) / sprite.vx);
      const tRem = Math.max(0, clampedDt - tHit);
      sprite.vx = Math.abs(sprite.vx) * e;
      sprite.x = xMin + sprite.vx * tRem;
    } else if (xPred > xMax && sprite.vx > 0) {
      const tHit = Math.max(0, (xMax - sprite.x) / sprite.vx);
      const tRem = Math.max(0, clampedDt - tHit);
      sprite.vx = -Math.abs(sprite.vx) * e;
      sprite.x = xMax + sprite.vx * tRem;
    }

    const yPred = sprite.y + sprite.vy * clampedDt;
    if (yPred < yMin && sprite.vy < 0) {
      const tHit = Math.max(0, (yMin - sprite.y) / sprite.vy);
      const tRem = Math.max(0, clampedDt - tHit);
      sprite.vy = Math.abs(sprite.vy) * e;
      sprite.y = yMin + sprite.vy * tRem;
    } else if (yPred > yMax && sprite.vy > 0) {
      const tHit = Math.max(0, (yMax - sprite.y) / sprite.vy);
      const tRem = Math.max(0, clampedDt - tHit);
      sprite.vy = -Math.abs(sprite.vy) * e;
      sprite.y = yMax + sprite.vy * tRem;
    }

    // -------------------------------------------------------------
    // TIER 3: Absolute Failsafe Hard Clamping Projection
    // Inviolable guarantee: sprite disc never penetrates dead zones
    // -------------------------------------------------------------
    if (sprite.x < xMin) {
      sprite.x = xMin;
      if (sprite.vx < 0) sprite.vx = Math.abs(sprite.vx) * e;
    } else if (sprite.x > xMax) {
      sprite.x = xMax;
      if (sprite.vx > 0) sprite.vx = -Math.abs(sprite.vx) * e;
    }

    if (sprite.y < yMin) {
      sprite.y = yMin;
      if (sprite.vy < 0) sprite.vy = Math.abs(sprite.vy) * e;
    } else if (sprite.y > yMax) {
      sprite.y = yMax;
      if (sprite.vy > 0) sprite.vy = -Math.abs(sprite.vy) * e;
    }

    // Final velocity sanity assurance
    if (!Number.isFinite(sprite.vx)) sprite.vx = 0;
    if (!Number.isFinite(sprite.vy)) sprite.vy = 0;
  }

  /**
   * Adds an interactive expanding water ripple (used in Koi Pond theme).
   * Damped sinusoidal wavefront expanding with sub-linear dispersion.
   * @param {number} x
   * @param {number} y
   * @param {number} [intensity=1.0]
   */
  addRipple(x, y, intensity = 1.0) {
    if (!this.theme.ripples) return;

    // Cap active pool at 30 to prevent memory growth
    if (this.ripples.length >= 30) {
      this.ripples.shift();
    }

    this.ripples.push({
      x,
      y,
      radius: 5,
      maxRadius: 130 * Math.min(intensity, 1.5),
      speed: 100,
      alpha: 0.8 * Math.min(intensity, 1.0),
      initialAlpha: 0.8 * Math.min(intensity, 1.0),
      age: 0,
      duration: 1.35
    });
  }

  /**
   * Spawns expanding shockwave ring in #FFD600 (fading over 300ms) +
   * 18 burst particles in #FFD600 and #00E5FF with drag deceleration,
   * stratified angles, and opacity fade.
   * @param {number} x
   * @param {number} y
   * @param {string[]} [palette=['#FFD600', '#00E5FF']]
   */
  spawnBurst(x, y, palette = [COLOR_YELLOW, COLOR_CYAN]) {
    // 1. Concentric shockwave ring (300ms lifetime)
    this.shockwaves.push({
      x,
      y,
      radius: 10,
      maxRadius: 96,
      duration: 0.300,
      age: 0,
      alpha: 1.0,
      color: palette[0] || COLOR_YELLOW
    });

    // 2. Exactly 18 burst particles with stratified angular distribution
    const particleCount = 18;
    for (let i = 0; i < particleCount; i++) {
      const baseAngle = (Math.PI * 2 * i) / particleCount;
      const jitter = (Math.random() - 0.5) * ((Math.PI * 2) / particleCount) * 0.75;
      const angle = baseAngle + jitter;
      const speed = 200 + Math.random() * 260; // 200 to 460 px/s

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3.5 + Math.random() * 2.5,
        initialRadius: 4.5,
        color: palette[i % palette.length],
        alpha: 1.0,
        life: 0.45,
        maxLife: 0.45
      });
    }

    // Trigger water ripple if active theme has ripples
    if (this.theme.ripples) {
      this.addRipple(x, y, 1.2);
    }
  }

  /**
   * Advances simulation by normalized delta-time.
   * Updates idle timer, particles, shockwaves, ripples, and prey entities.
   * @param {number} dt
   */
  update(dt) {
    const normalizedDt = Math.min(Math.max(0, dt || 0.016), MAX_DT);
    this.idleTime += normalizedDt;

    // 1. Update particles with viscous drag deceleration
    const dragDecay = Math.max(0, 1 - 4.2 * normalizedDt);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= normalizedDt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vx *= dragDecay;
      p.vy *= dragDecay;
      p.x += p.vx * normalizedDt;
      p.y += p.vy * normalizedDt;

      const progress = Math.max(0, p.life / p.maxLife);
      p.alpha = Math.max(0, Math.pow(progress, 1.4));
      p.radius = p.initialRadius * Math.pow(progress, 0.85);

      if (p.alpha <= 0.01) {
        this.particles.splice(i, 1);
      }
    }

    // 2. Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.age += normalizedDt;
      if (s.age >= s.duration) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      const progress = s.age / s.duration;
      const easeOut = 1 - Math.pow(1 - progress, 3);
      s.radius = 10 + (s.maxRadius - 10) * easeOut;
      s.alpha = Math.max(0, Math.pow(1 - progress, 1.3));

      if (s.alpha <= 0.01) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 3. Update water ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.age += normalizedDt;
      r.radius += normalizedDt * (r.speed || 100);
      const progress = r.duration ? (r.age / r.duration) : (r.radius / r.maxRadius);
      r.alpha = Math.max(0, r.initialAlpha * (1 - progress));

      if (progress >= 1.0 || r.alpha <= 0.01 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }

    // 4. Update prey entities and enforce perimeter safe margins
    if (this.preyList && Array.isArray(this.preyList)) {
      const safeArea = this.getDimensions().safeArea;
      for (const prey of this.preyList) {
        if (prey && typeof prey.update === 'function') {
          prey.update(normalizedDt, safeArea);
        }
        this.applySafeMargins(prey, normalizedDt);
      }
    }
  }

  /**
   * Slices larger durations into 60Hz steps for stable integration.
   * @param {number} seconds
   */
  advanceTime(seconds) {
    let remaining = seconds;
    while (remaining > 0) {
      const slice = Math.min(remaining, 1 / 60);
      this.update(slice);
      remaining -= slice;
    }
  }

  /**
   * Renders background theme, water ripples, shockwaves, and particles.
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    if (!ctx) return;

    const w = this.width || this.logicalWidth || 1024;
    const h = this.height || this.logicalHeight || 768;

    ctx.save();

    // -------------------------------------------------------------
    // A. Render Active Theme Background
    // -------------------------------------------------------------
    switch (this.activeTheme) {
      case 'daylight':
      case 'floor': {
        // Warm Scandinavian birch/maple flooring (#F4F1EA)
        ctx.fillStyle = '#F4F1EA';
        ctx.fillRect(0, 0, w, h);

        const plankHeight = 110;
        const numPlanks = Math.ceil(h / plankHeight) + 1;

        for (let i = 0; i < numPlanks; i++) {
          const y = i * plankHeight;

          // Subtle tone variation between planks
          ctx.fillStyle = (i % 2 === 0) ? 'rgba(235, 230, 218, 0.25)' : 'rgba(255, 252, 245, 0.3)';
          ctx.fillRect(0, y, w, plankHeight);

          // Plank Bevel Seam Line
          ctx.strokeStyle = 'rgba(160, 140, 120, 0.25)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();

          // Specular Reflection Line Under Seam
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.beginPath();
          ctx.moveTo(0, y + 1);
          ctx.lineTo(w, y + 1);
          ctx.stroke();

          // Staggered Vertical Butt Joints
          const jointSpacing = 420;
          const xOffset = (i * 173) % jointSpacing;
          ctx.strokeStyle = 'rgba(160, 140, 120, 0.20)';
          ctx.beginPath();
          for (let jx = xOffset; jx < w; jx += jointSpacing) {
            ctx.moveTo(jx, y);
            ctx.lineTo(jx, y + plankHeight);
          }
          ctx.stroke();

          // Procedural Wood Grain Cathedral Streaks
          ctx.strokeStyle = 'rgba(165, 140, 115, 0.045)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          for (let g = 0; g < 2; g++) {
            const gy = y + 30 + g * 35;
            ctx.moveTo(0, gy);
            ctx.bezierCurveTo(w * 0.25, gy - 10, w * 0.75, gy + 12, w, gy - 4);
          }
          ctx.stroke();
        }
        break;
      }

      case 'night': {
        // Night Stalker (#10121A) with ambient radial vignette
        ctx.fillStyle = '#10121A';
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const maxR = Math.hypot(cx, cy) * 0.85;
        if (typeof ctx.createRadialGradient === 'function') {
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
          grad.addColorStop(0, '#191D2B'); // Elevated slate center
          grad.addColorStop(0.65, '#12141F');
          grad.addColorStop(1, '#0C0D14'); // Deep margin shadow
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);
        }

        // Faint Tactical Floor Grid (80px pitch) for feline distance perception
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.022)';
        ctx.lineWidth = 1.0;
        const gridPitch = 80;
        ctx.beginPath();
        for (let gx = 0; gx < w; gx += gridPitch) {
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, h);
        }
        for (let gy = 0; gy < h; gy += gridPitch) {
          ctx.moveTo(0, gy);
          ctx.lineTo(w, gy);
        }
        ctx.stroke();
        break;
      }

      case 'pond': {
        // Koi Pond (#0A2239) with deep sunlight gradient
        ctx.fillStyle = '#0A2239';
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        if (typeof ctx.createRadialGradient === 'function') {
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(cx, cy) * 0.85);
          grad.addColorStop(0, '#0E2E4E'); // Clear aquatic blue
          grad.addColorStop(0.55, '#0A2239');
          grad.addColorStop(1, '#051320'); // Deep murky margin
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);
        }

        // Ambient Caustic Shimmer Webs
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.028)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        for (let c = 0; c < 4; c++) {
          const cyStart = (h / 5) * (c + 1);
          ctx.moveTo(0, cyStart);
          ctx.bezierCurveTo(w * 0.3, cyStart + 25, w * 0.7, cyStart - 30, w, cyStart + 10);
        }
        ctx.stroke();

        // Render Pond Water Ripples
        for (const rip of this.ripples) {
          const u = rip.duration ? Math.min(1.0, rip.age / rip.duration) : Math.min(1.0, rip.radius / rip.maxRadius);
          const envelope = rip.alpha;
          if (envelope <= 0.01) continue;

          const wavelength = 18;
          for (let k = 0; k < 3; k++) {
            const rCrest = rip.radius - k * wavelength;
            if (rCrest <= 2) continue;

            const crestWeight = (k === 0) ? 1.0 : (k === 1 ? 0.65 : 0.35);
            const waveAlpha = envelope * crestWeight;

            // 1. Trough Shadow
            const rTrough = rCrest - 3.5;
            if (rTrough > 1) {
              ctx.globalAlpha = Math.min(1.0, waveAlpha * 0.70);
              ctx.strokeStyle = '#020C16';
              ctx.lineWidth = Math.max(0.5, 3.2 * (1 - u) + 1.0);
              ctx.beginPath();
              ctx.arc(rip.x, rip.y, rTrough, 0, Math.PI * 2);
              ctx.stroke();
            }

            // 2. Crest Highlight (Cyan)
            ctx.globalAlpha = Math.min(1.0, waveAlpha * 0.85);
            ctx.strokeStyle = COLOR_CYAN;
            ctx.lineWidth = Math.max(0.5, 2.4 * (1 - u) + 0.8);
            ctx.beginPath();
            ctx.arc(rip.x, rip.y, rCrest, 0, Math.PI * 2);
            ctx.stroke();

            // 3. Specular Glint (Leading crest)
            if (k === 0) {
              ctx.globalAlpha = Math.min(1.0, waveAlpha * 0.55);
              ctx.strokeStyle = COLOR_WHITE;
              ctx.lineWidth = 1.0;
              ctx.beginPath();
              ctx.arc(rip.x, rip.y, rCrest + 0.5, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }
        break;
      }

      case 'rug': {
        // Cozy Amber Rug with woven texture and subtle borders
        ctx.fillStyle = '#B85D19';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(255, 230, 200, 0.08)';
        ctx.lineWidth = 1.0;
        const rugSpacing = 28;
        ctx.beginPath();
        for (let x = -h; x < w + h; x += rugSpacing) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x + h, h);
          ctx.moveTo(x + h, 0);
          ctx.lineTo(x, h);
        }
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 215, 160, 0.25)';
        ctx.lineWidth = 6.0;
        ctx.strokeRect(16, 16, w - 32, h - 32);
        break;
      }

      case 'grass': {
        // Garden Green Grass with lawn stripes and clover
        ctx.fillStyle = '#1E4620';
        ctx.fillRect(0, 0, w, h);

        const stripeW = 90;
        for (let x = 0; x < w; x += stripeW * 2) {
          ctx.fillStyle = 'rgba(45, 106, 79, 0.25)';
          ctx.fillRect(x, 0, stripeW, h);
        }

        ctx.fillStyle = 'rgba(116, 198, 157, 0.15)';
        for (let gx = 40; gx < w; gx += 140) {
          for (let gy = 50; gy < h; gy += 130) {
            ctx.beginPath();
            ctx.arc(gx - 4, gy, 5, 0, Math.PI * 2);
            ctx.arc(gx + 4, gy, 5, 0, Math.PI * 2);
            ctx.arc(gx, gy - 4, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }

      case 'marble': {
        // Polished Kitchen Marble with subtle veins
        ctx.fillStyle = '#E2E6EA';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(140, 150, 165, 0.22)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.2);
        ctx.bezierCurveTo(w * 0.3, h * 0.35, w * 0.6, h * 0.1, w, h * 0.4);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(160, 170, 185, 0.15)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.7);
        ctx.bezierCurveTo(w * 0.4, h * 0.85, w * 0.7, h * 0.55, w, h * 0.75);
        ctx.stroke();
        break;
      }

      case 'tatami': {
        // Traditional Straw Tatami Mat
        ctx.fillStyle = '#C5A96A';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(120, 95, 45, 0.15)';
        ctx.lineWidth = 1.0;
        for (let y = 0; y < h; y += 14) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        ctx.fillStyle = '#212529';
        ctx.fillRect(0, 0, 36, h);
        ctx.fillRect(w - 36, 0, 36, h);
        break;
      }

      case 'space': {
        // Cosmic Nebula & Starfield
        ctx.fillStyle = '#080816';
        ctx.fillRect(0, 0, w, h);

        if (typeof ctx.createRadialGradient === 'function') {
          const nGrad = ctx.createRadialGradient(w * 0.4, h * 0.4, 10, w * 0.4, h * 0.4, Math.max(w, h) * 0.65);
          nGrad.addColorStop(0, 'rgba(114, 9, 183, 0.35)');
          nGrad.addColorStop(0.5, 'rgba(67, 97, 238, 0.2)');
          nGrad.addColorStop(1, 'rgba(8, 8, 22, 0)');
          ctx.fillStyle = nGrad;
          ctx.fillRect(0, 0, w, h);
        }

        ctx.fillStyle = '#FFFFFF';
        const numStars = 40;
        for (let i = 0; i < numStars; i++) {
          const sx = ((i * 197 + 37) % w);
          const sy = ((i * 311 + 61) % h);
          const sR = (i % 3 === 0) ? 1.5 : 1.0;
          ctx.globalAlpha = 0.3 + (i % 5) * 0.15;
          ctx.beginPath();
          ctx.arc(sx, sy, sR, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
        break;
      }
    }

    // -------------------------------------------------------------
    // B. Render Shockwave Rings (#FFD600 fading over 300ms)
    // -------------------------------------------------------------
    for (const sw of this.shockwaves) {
      const progress = Math.min(1.0, sw.age / sw.duration);
      const alpha = sw.alpha;
      if (alpha <= 0.01) continue;

      const strokeWidth = 7.5 * Math.pow(1 - progress, 2) + 1.2;

      // Outer Main Energy Ring in #FFD600
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = sw.color || COLOR_YELLOW;
      ctx.lineWidth = strokeWidth;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner White Core Highlight
      ctx.globalAlpha = alpha * 0.75;
      ctx.strokeStyle = COLOR_WHITE;
      ctx.lineWidth = Math.max(1.0, strokeWidth * 0.4);
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, Math.max(1, sw.radius - 1), 0, Math.PI * 2);
      ctx.stroke();

      // Soft Blast Fringe
      ctx.globalAlpha = alpha * 0.25;
      ctx.strokeStyle = COLOR_YELLOW;
      ctx.lineWidth = strokeWidth + 6;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius + 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // -------------------------------------------------------------
    // C. Render 18 Burst Particles (Directional Motion Streaks)
    // -------------------------------------------------------------
    ctx.lineCap = 'round';
    for (const p of this.particles) {
      if (p.alpha <= 0.01) continue;

      const progress = Math.max(0, p.life / p.maxLife);
      const streakDt = Math.min(0.022, 0.012 * progress);
      const tailX = p.x - p.vx * streakDt;
      const tailY = p.y - p.vy * streakDt;

      ctx.globalAlpha = p.alpha;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1.0, p.radius * 2);

      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  /**
   * Destroys engine instance and detaches global event listeners.
   */
  destroy() {
    this.stop();
    if (typeof window !== 'undefined') {
      if (typeof window.removeEventListener === 'function') {
        window.removeEventListener('resize', this.handleResize);
        if (this._onOrientationChange) {
          window.removeEventListener('orientationchange', this._onOrientationChange);
        }
      }
    }
    this.particles = [];
    this.shockwaves = [];
    this.ripples = [];
    this.preyList = [];
  }
}

// -------------------------------------------------------------
// Universal Global & Module Exports
// -------------------------------------------------------------
export default Engine;

if (typeof globalThis !== 'undefined') {
  globalThis.PawPlayEngine = Engine;
}
if (typeof window !== 'undefined') {
  window.PawPlayEngine = Engine;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SAFE_MARGINS,
    MARGIN_CONFIG,
    COLOR_YELLOW,
    COLOR_CYAN,
    COLOR_WHITE,
    MAX_DPR,
    MAX_DT,
    THEMES,
    getSafeBounds,
    viewportToLogical,
    Engine,
    default: Engine
  };
}
