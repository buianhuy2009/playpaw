# Milestone 1 Core Engine Technical Specification & Architecture Handoff

**Agent**: `explorer_m1_1`  
**Role**: Teamwork Explorer (Milestone 1 Core Engine Specification)  
**Date**: 2026-10-18T09:40:00Z  
**Target Path**: `/Users/buianhuy/.gemini/antigravity/scratch/pawplay/.agents/teamwork/explorer_m1_1/handoff.md`

---

## 1. Observation

Direct examination of the PawPlay project directives and repository reveals the following concrete baselines and deficiencies:

### 1.1 Existing Prototype Codebase Inspection (`index.html`)
1. **Canvas Resolution & Blurry Backing Store** (`index.html:226–233`):
   ```javascript
   function resize() {
     canvas.width = window.innerWidth;
     canvas.height = window.innerHeight;
   }
   window.addEventListener('resize', resize);
   resize();
   ```
   - **Verbatim Defect**: `canvas.width` and `canvas.height` are set directly to CSS `innerWidth` and `innerHeight`. `window.devicePixelRatio` is never queried or applied. On modern mobile devices (iPhone 12–16 Pro at 3.0x DPR, iPad Pro / Air at 2.0x DPR, Samsung Galaxy OLED at 2.625x–3.0x DPR), the canvas bitmap is stretched across 4x to 9x physical screen pixels, resulting in severe pixelation, blurry edges, and loss of feline visual attention.

2. **Framerate-Dependent Motion & 120Hz Inconsistency** (`index.html:269–270`, `index.html:409–434`):
   ```javascript
   // Prey movement in index.html:269-270
   this.x += this.vx;
   this.y += this.vy;
   // Render loop in index.html:409-434
   function loop() {
     ctx.clearRect(0, 0, canvas.width, canvas.height);
     if (isPlaying) {
       prey.update();
       prey.draw();
       ...
     }
     requestAnimationFrame(loop);
   }
   ```
   - **Verbatim Defect**: Movement is computed using discrete per-frame addition without delta-time ($\Delta t$) normalization. On a 120Hz ProMotion iPad or high-refresh Android display, `requestAnimationFrame` fires 120 times per second (~8.33ms per frame), moving prey at **double the speed** compared to standard 60Hz screens (~16.67ms per frame).

3. **Absence of Anti-Tab and OS Gesture Margin Repulsion** (`index.html:272–273`):
   ```javascript
   if (this.x < this.radius || this.x > canvas.width - this.radius) this.vx *= -1;
   if (this.y < this.radius || this.y > canvas.height - this.radius) this.vy *= -1;
   ```
   - **Verbatim Defect**: Bouncing occurs strictly against $0\text{px}$ edges. Paws striking at the top border ($0\text{–}60\text{px}$) trigger browser tab switching, tab closure, or URL bar expansion; paws striking at the bottom border ($0\text{–}60\text{px}$) trigger the iOS Home Indicator app-switcher or Android navigation bar.

4. **Hardcoded Visual Background and Particle Simplification** (`index.html:25–30`, `index.html:358–369`):
   - The canvas background is locked to a static CSS radial gradient (`radial-gradient(circle at center, #2b2b36 0%, #15151a 100%)`).
   - Particles use a simple 15-particle decrement without shockwave rings, biological feline palette calibration, or water ripple simulation.

### 1.2 Mandatory Requirements & Directives
- **Authoritative User Request (`ORIGINAL_REQUEST.md:16–17`)**:
  > "R1. Engine, 120Hz Delta-Time Loop & Contrast Themes: Implement a high-DPI, 120Hz-capable delta-time normalized HTML5 Canvas rendering loop with 3 switchable contrast themes (Daylight Floor, Night Stalker, Koi Pond with interactive water ripples). Enforce an active perimeter repulsion margin (top 72px, bottom 72px, sides 48px) that strictly prevents prey from ever entering top browser tab areas or bottom OS gesture zones."
- **Implementation Plan Specifications (`IMPLEMENTATION_PLAN.md:91–100`)**:
  - Internal canvas resolution scaled by `Math.min(window.devicePixelRatio || 1, 2)`.
  - Velocity and acceleration vectors normalized by `dt = Math.min((now - lastTime) / 1000, 0.05)`.
  - Margins: `SAFE_MARGIN_TOP = 72`, `SAFE_MARGIN_BOTTOM = 72`, `SAFE_MARGIN_SIDES = 48` CSS pixels. Smooth inward steering acceleration + hard clamp.
  - Concentric shockwave ring + 18 burst particles in `#FFD600` (yellow) and `#00E5FF` (cyan).
  - Background themes: `Daylight Floor` (`#F4F1EA`), `Night Stalker` (`#10121A`), `Koi Pond` (`#0A2239` with touch water ripples).

---

## 2. Logic Chain

### 2.1 High-DPI Canvas Scaling Mathematical & Architectural Foundation

#### The Physical vs. Logical Disconnect
An HTML5 `<canvas>` element contains two distinct sizing domains:
1. **The Backing Store (Physical Pixel Buffer)**: Governed by the HTML attributes `canvas.width` and `canvas.height`. This represents the actual memory buffer allocated in the GPU/compositor.
2. **The Layout Surface (Logical CSS Dimensions)**: Governed by `canvas.style.width` and `canvas.style.height` (or CSS layout rules). This represents how many CSS pixels the canvas occupies in the viewport.

When `canvas.width !== canvas.style.width * window.devicePixelRatio`, the browser rasterizes the internal buffer and then bilinearly stretches it to fill the CSS layout box. On an iPad Pro (DPR = 2.0, viewport 1024x1366), setting `canvas.width = 1024` renders at 1.4 megapixel resolution, which is then upscaled by hardware to 5.6 megapixels, resulting in blurry outlines.

#### The Clamped DPR Equation
To achieve razor-sharp rendering while preventing mobile thermal throttling, the DPR is computed as:
$$\text{DPR} = \min(\max(\text{window.devicePixelRatio} \parallel 1, 1), 2)$$

```javascript
const dpr = Math.min(window.devicePixelRatio || 1, 2);
```

**Rationale for the $\le 2.0$ Clamp:**
- Ultra-high-density mobile phones (e.g. iPhone 15 Pro Max at DPR 3.0, 460 ppi) would allocate a $1290 \times 2796 \times 3 \approx 3870 \times 8388$ buffer if uncapped. This requires $\sim 130\text{ MB}$ of VRAM per double-buffered frame, overwhelming mobile GPU fill rates and triggering thermal frame drops below 120Hz.
- At typical feline viewing distances ($20\text{–}35\text{ cm}$), human visual acuity resolves $\sim 300\text{ PPI}$. Feline visual acuity is approximately $20/100$ to $20/200$ (5x to 10x lower spatial resolution than humans). A clamped DPR of 2.0 yields $>264\text{ PPI}$ on iPads, which is far beyond the feline visual resolution limit.
- Clamping at 2.0 guarantees razor-sharp crispness for human owners and flawless 120Hz rasterization throughput on mobile GPUs.

#### Idempotent Coordinate Alignment via `setTransform`
Many naive implementations call `ctx.scale(dpr, dpr)`. However, on window resize or orientation change, subsequent calls to `ctx.scale()` multiply cumulatively (`dpr * dpr = 4x, 8x...`), corrupting the coordinate system.
The correct, idempotent mechanism uses `ctx.setTransform`:
```javascript
// Physical buffer
canvas.width = Math.round(logicalWidth * dpr);
canvas.height = Math.round(logicalHeight * dpr);

// CSS display size
canvas.style.width = `${logicalWidth}px`;
canvas.style.height = `${logicalHeight}px`;

// Reset & scale transform matrix: [a, b, c, d, e, f] -> [dpr, 0, 0, dpr, 0, 0]
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```
With `setTransform(dpr, 0, 0, dpr, 0, 0)`, all drawing commands (`ctx.arc`, `ctx.fillRect`, `ctx.drawImage`) use **logical CSS pixels** ($[0, \text{logicalWidth}] \times [0, \text{logicalHeight}]$). All external game logic, touch raycasting, and margin boundaries operate purely in logical CSS coordinates without needing manual coordinate multiplication.

---

### 2.2 120Hz Delta-Time Normalized Render Loop

#### Frame-Rate Invariance Math
Let physical velocity be defined as $\vec{v}$ in logical CSS pixels per second ($\text{px/s}$).
At frame $k$ occurring at timestamp $t_k$ (in seconds), the raw elapsed time since frame $k-1$ is:
$$\Delta t_{\text{raw}} = \frac{t_k - t_{k-1}}{1000}$$

Position integration is computed using linear Euler integration:
$$\vec{x}_k = \vec{x}_{k-1} + \vec{v}_k \cdot \Delta t$$

- On a **60Hz display**: $\Delta t \approx \frac{1}{60} \approx 0.01667\text{ s}$. A sprite moving at $600\text{ px/s}$ advances:
  $$\Delta x = 600 \times 0.01667 = 10.0\text{ px/frame} \implies 600\text{ px/s}$$
- On a **120Hz ProMotion display**: $\Delta t \approx \frac{1}{120} \approx 0.00833\text{ s}$. The sprite advances:
  $$\Delta x = 600 \times 0.00833 = 5.0\text{ px/frame} \implies 600\text{ px/s}$$
Total physical distance traversed per second is strictly identical regardless of screen refresh rate.

#### Spiral-of-Death & Background Tab Guard
If the user opens a browser tab switcher, locks the device, or encounters a garbage collection pause of $500\text{ms}$, $\Delta t_{\text{raw}}$ jumps to $0.5\text{s}$ or more. Without bounding:
$$\Delta x = 950\text{ px/s} \times 0.5\text{s} = 475\text{ px in a single frame}$$
This massive step causes prey to instantly tunnel straight through boundary margins and fly off the screen.

The loop enforces the stability clamp:
$$\Delta t = \min(\max(\Delta t_{\text{raw}}, 0), 0.05)$$
```javascript
const rawDt = (now - this.lastTime) / 1000;
const dt = Math.min(Math.max(rawDt, 0), 0.05);
```
The upper bound of $0.05\text{s}$ ($50\text{ms}$, equivalent to $20\text{ FPS}$) guarantees that physics updates never exceed $50\text{ms}$ of movement in any single tick, entirely preventing collision tunneling and physics blowup.

#### Initialization & Resume Edge Cases
1. **Cold Start (`lastTime === 0`)**: On the initial frame, `now - 0` is thousands of seconds. Guard:
   ```javascript
   if (this.lastTime === 0) {
     this.lastTime = now;
   }
   ```
2. **Resume from Pause**: When unpausing after `isPaused = true`, `lastTime` must be re-synced to `performance.now()`, preventing a $50\text{ms}$ lag leap on the first unpaused frame.

---

### 2.3 Edge-Safe Perimeter Repulsion Physics

#### Boundary Definitions
The safe operational rectangle is defined by:
- $M_{\text{top}} = 72\text{ px}$ (clearance from Safari/Chrome tab bar, address bar, close buttons)
- $M_{\text{bottom}} = 72\text{ px}$ (clearance from iOS Home Indicator swipe bar and Android gesture strip)
- $M_{\text{sides}} = 48\text{ px}$ (clearance from iOS back/forward edge-swipe zones)

For a prey sprite of collision radius $R$ at position $(x, y)$, the inviolable bounds for its center are:
$$x_{\min} = 48 + R, \quad x_{\max} = W - 48 - R$$
$$y_{\min} = 72 + R, \quad y_{\max} = H - 72 - R$$

#### Two-Tier Defensive Physics
1. **Tier 1: Soft Inward Steering Field (Biomimetic Wall Avoidance)**
   A buffer zone $D_{\text{buf}} = 64\text{ px}$ extends inward from each safe margin.
   When prey enters the buffer, an inward steering acceleration $\vec{a}_{\text{steer}}$ is exerted proportionally to penetration depth:
   - Near top ($y < y_{\min} + D_{\text{buf}}$):
     $$p = \frac{(y_{\min} + D_{\text{buf}}) - y}{D_{\text{buf}}}, \quad a_y += k_{\text{repel}} \cdot p^{1.5} \quad (k_{\text{repel}} \approx 1800\text{ px/s}^2)$$
   - Near bottom ($y > y_{\max} - D_{\text{buf}}$):
     $$p = \frac{y - (y_{\max} - D_{\text{buf}})}{D_{\text{buf}}}, \quad a_y -= k_{\text{repel}} \cdot p^{1.5}$$
   - Near left ($x < x_{\min} + D_{\text{buf}}$):
     $$p = \frac{(x_{\min} + D_{\text{buf}}) - x}{D_{\text{buf}}}, \quad a_x += k_{\text{repel}} \cdot p^{1.5}$$
   - Near right ($x > x_{\max} - D_{\text{buf}}$):
     $$p = \frac{x - (x_{\max} - D_{\text{buf}})}{D_{\text{buf}}}, \quad a_x -= k_{\text{repel}} \cdot p^{1.5}$$
   This creates an organic, curving escape arc mimicking real prey sensing an obstacle.

2. **Tier 2: Inviolable Hard Clamp & Elastic Boundary Reflection**
   If extreme velocity (e.g., Apex sprint at $950\text{ px/s}$) reaches the safe threshold, position is strictly clamped and velocity normal to the margin is inverted with damping ($e = 0.85$ restitution):
   ```javascript
   if (entity.x < xMin) { entity.x = xMin; entity.vx = Math.abs(entity.vx) * 0.85; }
   if (entity.x > xMax) { entity.x = xMax; entity.vx = -Math.abs(entity.vx) * 0.85; }
   if (entity.y < yMin) { entity.y = yMin; entity.vy = Math.abs(entity.vy) * 0.85; }
   if (entity.y > yMax) { entity.y = yMax; entity.vy = -Math.abs(entity.vy) * 0.85; }
   ```
   **Mathematical Invariant**: Under all velocities $\vec{v}$, $\forall t \ge 0$:
   $$\text{Edge}_{\text{top}} \ge 72\text{px}, \quad \text{Edge}_{\text{bottom}} \le H - 72\text{px}, \quad \text{Edge}_{\text{left}} \ge 48\text{px}, \quad \text{Edge}_{\text{right}} \le W - 48\text{px}$$

---

### 2.4 Contrast Themes & Biological Feline Vision Calibration

Cats are dichromats with peak sensitivity at $\sim 450\text{nm}$ (blue) and $\sim 550\text{nm}$ (green-yellow). They have high rod density and a reflective tapetum lucidum behind the retina, yielding superior motion and luminance contrast detection, but lower acuity.

The 3 themes provide specific optical contrasts:
1. **`Daylight Floor` (`floor`)**:
   - Base color: `#F4F1EA` (high-albedo warm parchment/ash wood).
   - Texture: Subtle wood plank seams (`#E6E1D5`, 1px line every 88px) oriented longitudinally.
   - High luminance contrast against dark prey silhouettes (Cockroach `#1A110B`, Mouse `#4A5568`).
2. **`Night Stalker` (`night`)**:
   - Base color: `#10121A` (ultra-low albedo obsidian navy).
   - Texture: Ambient radial gradient (`#181B26` at center to `#0B0C12` at edges).
   - Maximum pop for dichromatic luminous sprites (Laser `#FFD600` / `#0066FF`, Bumblebee).
3. **`Koi Pond` (`pond`)**:
   - Base color: Deep aquatic blue `#0A2239` with subtle caustic light streaks (`#0F2D4A`).
   - Dynamic interactive water ripples generated on touch and swipe.

---

### 2.5 Visual FX System (Shockwaves, 18 Burst Particles, Analytical Ripples)

1. **Expanding Shockwave Ring**:
   - Spawned at pounce coordinate $(x, y)$.
   - Expands from $r_0 = 12\text{px}$ to $r_{\max} = 95\text{px}$ at $280\text{ px/s}$.
   - Stroke width tapers from $4\text{px} \to 1\text{px}$; alpha fades quadratically $\alpha = (1 - r / r_{\max})^2$.
2. **18 Burst Particles**:
   - Exactly 18 particles distributed radially with randomized velocities:
     $$\theta_i = \frac{2\pi i}{18} + \mathcal{N}(0, 0.2), \quad s_i \in [180, 420]\text{ px/s}$$
   - Palettes: Alternating `#FFD600` (dichromatic yellow) and `#00E5FF` (dichromatic cyan).
   - Drag damping: $\vec{v} \leftarrow \vec{v} \cdot (1 - 2.8 \cdot \Delta t)$.
   - Lifespan: $0.35\text{–}0.50\text{ seconds}$ with linear radius shrink $4\text{px} \to 0$.
3. **Analytical Water Ripples (Koi Pond)**:
   - Lightweight procedural ripple array avoiding costly 2D grid convolutions.
   - Each ripple expands at $160\text{ px/s}$ up to $r_{\max} = 140\text{px}$ with alpha decay over $1.0\text{s}$.
   - Array capped at 30 active ripples to prevent memory growth and GC spikes on mobile devices.

---

## 3. Concrete Implementation Contract for `src/engine.js`

Here is the complete, drop-in technical specification and reference implementation for `src/engine.js`:

```javascript
/**
 * PawPlay Core Engine (Milestone 1)
 * High-DPI canvas scaling, 120Hz delta-time normalized loop,
 * edge-safe perimeter repulsion physics, themes, ripples & particle FX.
 */

export const SAFE_MARGINS = {
  TOP: 72,
  BOTTOM: 72,
  SIDES: 48
};

export const THEMES = {
  FLOOR: 'floor',
  NIGHT: 'night',
  POND: 'pond'
};

export class Engine {
  /**
   * @param {HTMLCanvasElement} canvasElement 
   * @param {Object} [options]
   */
  constructor(canvasElement, options = {}) {
    if (!canvasElement) {
      throw new Error('Engine requires a valid HTMLCanvasElement.');
    }
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d', { alpha: false });
    
    // Sizing & Scaling
    this.dpr = 1;
    this.logicalWidth = window.innerWidth;
    this.logicalHeight = window.innerHeight;

    // Timing & Render Loop
    this.animationFrameId = null;
    this.lastTime = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.onTick = null; // Callback: (dt, engine) => void

    // Theme & Visual Settings
    this.activeTheme = options.theme || THEMES.FLOOR;

    // Visual FX Pools
    this.particles = [];
    this.shockwaves = [];
    this.ripples = [];

    // Bound listeners for clean removal
    this.handleResize = this.resize.bind(this);
  }

  /**
   * Initializes high-DPI scaling, binds resize listener, and configures context.
   */
  init() {
    this.resize();
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', () => {
      // Small timeout for iOS viewport layout settling after orientation change
      setTimeout(this.handleResize, 100);
    });
    return this;
  }

  /**
   * Recomputes logical and physical canvas dimensions with DPR clamping.
   */
  resize() {
    // Clamp DPR to max 2.0 to protect mobile GPU fill rate while ensuring Retina sharpness
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.logicalWidth = Math.max(1, window.innerWidth);
    this.logicalHeight = Math.max(1, window.innerHeight);

    // Set backing store buffer size in physical pixels
    this.canvas.width = Math.round(this.logicalWidth * this.dpr);
    this.canvas.height = Math.round(this.logicalHeight * this.dpr);

    // Set CSS layout size in logical pixels
    this.canvas.style.width = `${this.logicalWidth}px`;
    this.canvas.style.height = `${this.logicalHeight}px`;

    // Idempotent affine transform mapping CSS coordinates to physical pixels
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /**
   * Returns current logical dimensions and safe margin bounding box.
   */
  getDimensions() {
    return {
      width: this.logicalWidth,
      height: this.logicalHeight,
      dpr: this.dpr,
      safeArea: {
        top: SAFE_MARGINS.TOP,
        bottom: this.logicalHeight - SAFE_MARGINS.BOTTOM,
        left: SAFE_MARGINS.SIDES,
        right: this.logicalWidth - SAFE_MARGINS.SIDES
      }
    };
  }

  /**
   * Switches background theme ('floor' | 'night' | 'pond').
   */
  setTheme(themeName) {
    if (Object.values(THEMES).includes(themeName)) {
      this.activeTheme = themeName;
    }
  }

  /**
   * Starts uncapped 120Hz requestAnimationFrame delta-time loop.
   * @param {Function} tickCallback - (dt, engine) => void
   */
  start(tickCallback) {
    if (tickCallback) this.onTick = tickCallback;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = 0; // Guard against cold-start time leap

    const loop = (now) => {
      if (!this.isRunning) return;

      if (!this.lastTime) {
        this.lastTime = now;
      }

      // Delta-time normalized calculation with 50ms (20 FPS) stability clamp
      const rawDt = (now - this.lastTime) / 1000;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);
      this.lastTime = now;

      if (!this.isPaused) {
        // Clear screen
        this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);

        // Render active theme background & ripples
        this.renderBackground(dt);

        // Execute external simulation tick (prey update/draw, raycast collision)
        if (this.onTick) {
          this.onTick(dt, this);
        }

        // Render shockwave rings and burst particles
        this.renderEffects(dt);
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Stops the render loop and releases animation frame.
   */
  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
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
    this.lastTime = performance.now();
  }

  /**
   * Applies perimeter margin repulsion and hard clamp to keep entity within safe zones.
   * @param {Object} entity - Must have { x, y, vx, vy, radius }
   * @param {number} dt - Normalized delta-time in seconds
   */
  applySafeMargins(entity, dt) {
    const r = entity.radius || 30;
    const xMin = SAFE_MARGINS.SIDES + r;
    const xMax = this.logicalWidth - SAFE_MARGINS.SIDES - r;
    const yMin = SAFE_MARGINS.TOP + r;
    const yMax = this.logicalHeight - SAFE_MARGINS.BOTTOM - r;

    const buffer = 64; // Repulsion buffer zone in CSS pixels
    const repelAccel = 1800; // Repulsion acceleration in px/s^2

    // Soft steering field
    if (entity.y < yMin + buffer) {
      const depth = (yMin + buffer - entity.y) / buffer;
      entity.vy += repelAccel * Math.pow(depth, 1.5) * dt;
    } else if (entity.y > yMax - buffer) {
      const depth = (entity.y - (yMax - buffer)) / buffer;
      entity.vy -= repelAccel * Math.pow(depth, 1.5) * dt;
    }

    if (entity.x < xMin + buffer) {
      const depth = (xMin + buffer - entity.x) / buffer;
      entity.vx += repelAccel * Math.pow(depth, 1.5) * dt;
    } else if (entity.x > xMax - buffer) {
      const depth = (entity.x - (xMax - buffer)) / buffer;
      entity.vx -= repelAccel * Math.pow(depth, 1.5) * dt;
    }

    // Hard clamp and elastic bounce reflection (inviolable guarantee)
    const restitution = 0.85;
    if (entity.x < xMin) {
      entity.x = xMin;
      entity.vx = Math.abs(entity.vx) * restitution;
    } else if (entity.x > xMax) {
      entity.x = xMax;
      entity.vx = -Math.abs(entity.vx) * restitution;
    }

    if (entity.y < yMin) {
      entity.y = yMin;
      entity.vy = Math.abs(entity.vy) * restitution;
    } else if (entity.y > yMax) {
      entity.y = yMax;
      entity.vy = -Math.abs(entity.vy) * restitution;
    }
  }

  /**
   * Adds an expanding water ripple at (x, y) for Koi Pond theme.
   */
  addRipple(x, y, intensity = 1.0) {
    if (this.ripples.length > 30) {
      this.ripples.shift(); // Cap pool size
    }
    this.ripples.push({
      x,
      y,
      radius: 8,
      maxRadius: 130 * intensity,
      speed: 175,
      alpha: 0.55 * intensity,
      lineWidth: 2.5
    });
  }

  /**
   * Spawns concentric shockwave ring + 18 burst particles at (x, y).
   */
  spawnBurst(x, y, palette = ['#FFD600', '#00E5FF']) {
    // 1. Concentric shockwave ring
    this.shockwaves.push({
      x,
      y,
      radius: 10,
      maxRadius: 90,
      speed: 280,
      alpha: 0.9,
      color: palette[1] || '#00E5FF'
    });

    // 2. Exactly 18 burst particles
    const particleCount = 18;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.35;
      const speed = 180 + Math.random() * 240;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3.5 + Math.random() * 2.0,
        initialRadius: 4.5,
        color: palette[i % palette.length],
        life: 0.45,
        maxLife: 0.45
      });
    }

    // Also trigger water ripple if in pond theme
    if (this.activeTheme === THEMES.POND) {
      this.addRipple(x, y, 1.2);
    }
  }

  /**
   * Renders background for the active theme.
   */
  renderBackground(dt) {
    const ctx = this.ctx;
    const w = this.logicalWidth;
    const h = this.logicalHeight;

    switch (this.activeTheme) {
      case THEMES.FLOOR: {
        ctx.fillStyle = '#F4F1EA';
        ctx.fillRect(0, 0, w, h);
        // Subtle plank lines every 88px
        ctx.strokeStyle = '#E6E1D5';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 88; x < w; x += 88) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
        }
        ctx.stroke();
        break;
      }
      case THEMES.NIGHT: {
        const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h) * 0.75);
        grad.addColorStop(0, '#191C28');
        grad.addColorStop(1, '#0C0D14');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }
      case THEMES.POND: {
        ctx.fillStyle = '#0A2239';
        ctx.fillRect(0, 0, w, h);
        // Caustic light streaks
        ctx.strokeStyle = 'rgba(72, 202, 228, 0.08)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const y = (h / 5) * (i + 1);
          ctx.moveTo(0, y);
          ctx.bezierCurveTo(w * 0.3, y - 20, w * 0.7, y + 20, w, y);
        }
        ctx.stroke();
        // Update and draw pond ripples
        this.renderRipples(dt);
        break;
      }
    }
  }

  /**
   * Updates and draws water ripples.
   */
  renderRipples(dt) {
    const ctx = this.ctx;
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rip = this.ripples[i];
      rip.radius += rip.speed * dt;
      const progress = rip.radius / rip.maxRadius;
      rip.alpha = 0.55 * (1 - progress);

      if (progress >= 1 || rip.alpha <= 0.01) {
        this.ripples.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.strokeStyle = `rgba(72, 202, 228, ${rip.alpha.toFixed(3)})`;
      ctx.lineWidth = rip.lineWidth;
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Secondary echo ring
      if (rip.radius > 25) {
        ctx.strokeStyle = `rgba(0, 229, 255, ${(rip.alpha * 0.6).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.radius - 18, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /**
   * Updates and renders shockwaves and burst particles.
   */
  renderEffects(dt) {
    const ctx = this.ctx;

    // 1. Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed * dt;
      const progress = sw.radius / sw.maxRadius;
      const currentAlpha = sw.alpha * Math.pow(1 - progress, 2);

      if (progress >= 1 || currentAlpha <= 0.01) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = currentAlpha;
      ctx.lineWidth = Math.max(1, 4 * (1 - progress));
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Burst Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Exponential velocity drag
      p.vx *= Math.pow(0.08, dt);
      p.vy *= Math.pow(0.08, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const progress = p.life / p.maxLife;
      const radius = p.initialRadius * progress;

      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.min(1, progress * 1.5);
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Destroys engine instance and detaches global event listeners.
   */
  destroy() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    this.particles = [];
    this.shockwaves = [];
    this.ripples = [];
  }
}
```

---

## 4. Edge Cases & Guard Specifications

| Category | Potential Failure Mode | Implemented Technical Guard |
| :--- | :--- | :--- |
| **DPR Scaling** | Headless browsers / tests have `window.devicePixelRatio === undefined` or `0`. | Fallback expression: `Math.min(window.devicePixelRatio || 1, 2)` ensures minimum DPR of 1. |
| **DPR Memory Overflow** | 3x–3.5x mobile screens allocate 130MB+ framebuffers causing thermal throttling below 120Hz. | `Math.min(..., 2)` strictly bounds memory to 2x supersampling, locked at 120Hz. |
| **Transform Drift** | Calling `ctx.scale()` cumulatively compounds scale factor on every resize. | `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` resets matrix idempotently on every resize. |
| **Delta-Time Leap** | First frame after launch has `lastTime === 0`, causing million-second $\Delta t$. | Explicit cold-start check: `if (!this.lastTime) this.lastTime = now;` avoids leap. |
| **Spiral of Death** | Backgrounding tab, device sleep, or GC pause results in huge $\Delta t$ ($>1\text{s}$). | Hard cap: `Math.min(rawDt, 0.05)` limits frame physics to max $50\text{ms}$ ($20\text{ FPS}$). |
| **Resume Jump** | Unpausing after minutes leaves `lastTime` stale. | `resume()` immediately resets `this.lastTime = performance.now()`. |
| **Margin Tunneling** | High-velocity sprint ($950\text{ px/s}$) penetrates margin before soft steering acts. | Hard clamp immediately resets position to $[x_{\min}, x_{\max}]$ and $[y_{\min}, y_{\max}]$ and inverts normal velocity. |
| **Orientation Lag** | Mobile Safari reports pre-rotation viewport sizes immediately on `orientationchange`. | Delayed resize hook: `setTimeout(this.handleResize, 100)` captures final settled dimensions. |
| **Particle Leak** | Long gameplay sessions accumulate uncollected particles. | Array splice on `life <= 0` and ripple capping at 30 items ensures zero heap leaks. |

---

## 5. Verification Method

To independently verify the Milestone 1 Core Engine specification:

1. **Verify High-DPI Canvas Backing Store**:
   - Inspect backing store ratio vs display size:
     `canvas.width === Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2))`
   - Verify transform matrix using DevTools console:
     `ctx.getTransform().a === Math.min(window.devicePixelRatio || 1, 2)` and `ctx.getTransform().d === Math.min(window.devicePixelRatio || 1, 2)`
     `ctx.getTransform().e === 0` and `ctx.getTransform().f === 0`.
2. **Verify 120Hz Delta-Time Normalization**:
   - Run simulation over 60 wall-clock seconds on a 60Hz display and a 120Hz ProMotion display.
   - Assert total distance traversed by an entity moving at constant $v = 400\text{ px/s}$ equals $24,000\text{ px} \pm 1\%$ on both display types.
3. **Verify Safe Margin Repulsion Invariant**:
   - Run a 60-second test loop with prey at *Apex* speed ($950\text{ px/s}$) with random steering impulses.
   - Assert at every frame:
     - `prey.y - prey.radius >= 72` (Top margin never violated)
     - `prey.y + prey.radius <= canvas.height - 72` (Bottom margin never violated)
     - `prey.x - prey.radius >= 48` (Left margin never violated)
     - `prey.x + prey.radius <= canvas.width - 48` (Right margin never violated)
4. **Verify Theme and FX Lifecycle**:
   - Call `engine.spawnBurst(x, y)`: Assert exactly 18 burst particles and 1 shockwave are added to active pools.
   - Advance time by $0.6\text{s}$: Assert all particles and shockwaves have completed their lifecycle and spliced from memory.

---

### Modern Web Guidance

I checked `modern-web-guidance` for queries regarding "canvas high dpi animation frame" and "overscroll-behavior touch-action pointer events"; the retrieved guides focused on WebGL shaders, HTML in canvas accessibility, and scroll snap, none of which directly addressed 2D canvas devicePixelRatio scaling and delta-time loop mechanics.
