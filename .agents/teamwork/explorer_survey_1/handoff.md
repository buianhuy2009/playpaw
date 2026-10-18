# Architectural Survey & Modularization Handoff Report

**Agent**: `explorer_survey_1`  
**Role**: Codebase Surveyor & Architectural Mapper  
**Date**: 2026-10-18T09:34:00Z  
**Target Path**: `/Users/buianhuy/.gemini/antigravity/scratch/pawplay/.agents/teamwork/explorer_survey_1/handoff.md`

---

## 1. Observation

### 1.1 Existing Prototype Codebase Inspection (`index.html`)
The current workspace contains a single monolithic prototype file (`index.html`, 469 lines, 12,297 bytes) with zero modular separation, zero build tools, and no external dependencies. A line-by-line inspection reveals the following concrete implementation components:

1. **HTML Shell & Viewport** (`lines 1–7`):
   - `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">`
   - Missing PWA links: no `<link rel="manifest">`, no Apple mobile web app tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`), no favicon or touch icons.

2. **CSS Reset & Styling** (`lines 8–137`):
   - Global touch reset: `* { user-select: none; -webkit-user-select: none; touch-action: none; }` (`lines 11–15`).
   - `#gameCanvas` (`lines 25–30`): Hardcoded background `radial-gradient(circle at center, #2b2b36 0%, #15151a 100%)`.
   - `#menuOverlay` (`lines 33–48`): Centered flex overlay (`z-index: 10`, `background: rgba(15, 15, 20, 0.92)`).
   - `.options` & `.btn-option` (`lines 63–84`): Simple 3-button selector for `laser`, `bug`, and `mouse`.
   - `#startBtn` (`lines 86–102`): Single start button.
   - `#scoreBadge` (`lines 112–124`): Absolute badge at `top: 16px, left: 16px`.
   - `#exitHint` (`lines 126–136`): Immediate single-tap button at `top: 16px, right: 16px` (`padding: 8px, cursor: pointer`).
   - Missing CSS: No `overscroll-behavior: none` on `body` or `html` (allows mobile pull-to-refresh). No styling for onboarding carousel, customization deck, camera gallery, session timer, or annulus exit lock.

3. **Global State Variables** (`lines 164–176`):
   - `let pounceCount = 0;`
   - `let selectedPreyType = 'laser';`
   - `let isPlaying = false;`
   - `let wakeLock = null;`
   - `let audioCtx = null;`
   - `let particles = [];`
   - State is entirely global and non-encapsulated; no settings persistence in `localStorage`.

4. **Audio Subsystem** (`lines 178–213`):
   - `initAudio()` (`lines 179–186`): Initializes `AudioContext` and resumes if suspended.
   - `playSqueak()` (`lines 188–213`): Single sine wave oscillator sweeping `4200Hz -> 2200Hz` over `0.1s`, gain `0.3 -> 0.01`. Triggers `navigator.vibrate(40)`.
   - Missing: Procedural FM synthesis, bandpass insect clicks, resonant water splashes, 12s idle acoustic lure, treat completion chime, volume control, or mute states.

5. **Screen Wake Lock** (`lines 215–224`):
   - `requestWakeLock()`: Calls `navigator.wakeLock.request('screen')`.
   - Missing: Auto-re-acquisition on `visibilitychange` (critical on iOS/Android when tab switches or device locks).

6. **Canvas Resolution & Resizing** (`lines 226–233`):
   - `function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }`
   - **Critical defect**: Does NOT account for `window.devicePixelRatio`. On Retina / OLED displays (iPad, iPhone, modern Android), canvas renders at 1x scale, resulting in blurry, non-retina rendering.

7. **Prey AI & Kinematics** (`lines 234–354`):
   - Single object `prey` (`x`, `y`, `vx: 4`, `vy: 4`, `radius: 35`, `state: 'SCURRY'`, `timer: 0`, `opacity: 1`).
   - Movement: Framerate-dependent `this.x += this.vx; this.y += this.vy;` (`lines 269–270`). No delta-time (`dt`) calculation. On 120Hz displays, moves twice as fast as on 60Hz.
   - Edge bouncing: `if (this.x < this.radius || this.x > canvas.width - this.radius) this.vx *= -1;` (`lines 272–273`). Zero margin defense: prey travels directly against 0px boundaries, causing cat paws to hit browser tabs and OS gesture bars.
   - States: Only 3 states (`SCURRY`, `FREEZE`, `HIDDEN`).
   - Sprites: Crude 2D canvas drawing. `laser` uses pure red (`#ff3b30`, which cats cannot perceive due to dichromacy); `bug` is a brown ellipse with 6 static lines; `mouse` is a grey ellipse with sine wave tail. Missing Bumblebee, Koi Fish, spinal kinematics, and multi-prey support.

8. **Collision Detection & Input Handling** (`lines 356–406`):
   - Euclidean distance check: `Math.hypot(touchX - prey.x, touchY - prey.y) < prey.radius + 40` (`line 374`).
   - **Critical defect (Tunneling)**: Discrete single-point check on `touchstart` and `touchmove`. Fast cat swipes between animation frames pass straight through prey without triggering collision.
   - **No Resting-Paw Filter**: Stationary contact points continuously trigger checks or block touches.
   - Desktop mouse fallback via `mousedown` (`lines 402–406`).

9. **Game Loop & Mode Transitions** (`lines 408–466`):
   - `function loop() { ctx.clearRect(...); if (isPlaying) { prey.update(); prey.draw(); ... } requestAnimationFrame(loop); }` (`lines 408–434`).
   - `startBtn.addEventListener('click', ...)` (`lines 445–460`): Calls `requestFullscreen()`, sets `isPlaying = true`.
   - `exitHint.addEventListener('click', ...)` (`lines 462–465`): Immediate single-click exit (`isPlaying = false; menuOverlay.style.display = 'flex'`). Cat paws easily tap this accidentally.

### 1.2 Target Architectural Scope (from `ORIGINAL_REQUEST.md` & `IMPLEMENTATION_PLAN.md`)
The target system transforms PawPlay into a modular, biological-calibrated Progressive Web Application organized into 7 core modules, modern CSS, PWA assets, and Vercel configuration:
- `src/engine.js`: High-DPI Canvas scaling, 120Hz dt loop, perimeter margin repulsion (top 72px, bottom 72px, sides 48px), 3 switchable contrast themes, water ripples, particle burst shaders.
- `src/prey.js`: 5-state Markov FSM (`STALK_CREEP`, `DART_SPRINT`, `FREEZE_TREMOR`, `EDGE_SKITTER`, `CAUGHT_RESPAWN`), high-fidelity dichromatic sprites (Bumblebee with 40Hz wings, Roach with 6-leg cycle, Mouse with 4-node whipping tail, Koi with 3-segment spine, Laser with particle dispersion), 1–4 concurrent multi-prey.
- `src/input.js`: Multi-touch continuous raycast line-segment collision (`P1 -> P2` distance to circle + 42px pad tolerance), static sitting-paw filter (`< 12px` over `400ms`).
- `src/defense.js`: Browser Tab Defense Shield (`beforeunload` interceptor, `overscroll-behavior: none`, `visibilitychange` auto-pause & audio mute, 8-second clockwise annulus exit lock).
- `src/audio.js`: Zero-latency procedural Web Audio synthesizer (FM rodent squeak, bandpass bug clicks, resonant water splashes, 12s acoustic lure, treat chime, Android haptics).
- `src/ui.js`: First-time fullscreen 5-step onboarding carousel, customization deck (prey, count, speed, size, themes, timers, audio/haptics), Screen Wake Lock re-acquisition, session timer HUD, anti-frustration treat modal.
- `src/camera.js`: "Pounce-Cam" front camera (`getUserMedia`), offscreen canvas stamp (retro timestamp + watermark), IndexedDB photo vault (`pawplay_photos_v1`), human gallery review modal.
- PWA & Hosting: `manifest.json` (`"display": "standalone"`), `sw.js` (cache-first offline), `vercel.json` (headers, caching).

---

## 2. Logic Chain

### 2.1 Component Mapping Matrix (Current Prototype vs. Target Architecture)

| Component / Function in Prototype | Current Location (`index.html`) | Deficiencies & Gaps | Target Module | Target Function / Class / Signature |
| :--- | :--- | :--- | :--- | :--- |
| **Canvas Init & Resize** | `resize()` (lines 226–233) | Ignores `devicePixelRatio`, renders blurry on mobile/retina. No logical vs physical coordinate scaling. | `src/engine.js` | `Engine.resize()`, `Engine.initCanvas(canvas)` with `Math.min(window.devicePixelRatio, 2)` |
| **Render Loop & Timing** | `loop()` (lines 408–434) | Refresh-rate dependent (`x += vx`). At 120Hz, speed doubles. No frame-capping or dt normalization. | `src/engine.js` | `Engine.start()`, `Engine.tick(now)` using `dt = Math.min((now - lastTime)/1000, 0.05)` |
| **Screen Boundaries** | Bouncing logic (lines 272–273) | 0px edge clearance. Sprites hit browser tabs and OS gesture bars. | `src/engine.js` | `Engine.applyMarginRepulsion(prey, dt)`: Top 72px, Bottom 72px, Sides 48px safe bounds with steering vector + clamp |
| **Themes & Backgrounds** | CSS radial gradient (lines 25–30) | Static dark gradient only. No visual themes. No interactive ripples. | `src/engine.js` | `Engine.renderTheme(ctx)`: Daylight Floor (`#F4F1EA`), Night Stalker (`#10121A`), Koi Pond (`#0A2239` + water ripple simulation) |
| **Particle FX** | `spawnParticles()` (lines 358–369) | 15 simple dots, linear decay. No shockwave ring. | `src/engine.js` | `Engine.spawnPounceBurst(x, y, palette)`: 18 burst particles + concentric shockwave in `#FFD600` & `#00E5FF` |
| **Prey State Machine** | `prey.update()` (lines 245–281) | Only 3 states (SCURRY, FREEZE, HIDDEN). Predictable linear bouncing. | `src/prey.js` | `PreyAgent.update(dt)`: 5-state FSM (`STALK_CREEP`, `DART_SPRINT`, `FREEZE_TREMOR`, `EDGE_SKITTER`, `CAUGHT_RESPAWN`) |
| **Prey Graphics & Sprites** | `prey.draw()` (lines 283–353) | Red laser (`#ff3b30`, invisible to cats), crude ellipses. No wings, fins, or joint kinematics. | `src/prey.js` | `PreyAgent.draw(ctx)`: High-fidelity dichromatic sprites (Bumblebee, Roach, Mouse, Koi, Laser) with 40Hz wings & 3-segment spine |
| **Multi-Prey Spawning** | Single `prey` object (line 235) | Only 1 target sprite supported. | `src/prey.js` | `PreyManager`: Manages 1 to 4 `PreyAgent` instances with spatial distribution and flocking avoidance |
| **Touch Hit Detection** | `checkCollision()` (lines 371–385) | Discrete Euclidean distance check. Suffers from high-speed tunneling. | `src/input.js` | `InputController.checkRaycastHit(p1, p2, prey)`: Continuous line-segment to circle distance + 42px pad tolerance |
| **Sitting-Paw Rejection** | None | Stationary paws trigger false hits or block swatting. | `src/input.js` | `InputController.filterSittingPaw(touch)`: Suppresses touches moving `< 12px` over `400ms` |
| **Tab Defense Interception** | None | No `beforeunload` dialog. Accidental swipes close or reload tabs. | `src/defense.js` | `DefenseController.initBeforeUnload()`: Intercepts unload when `isPlaying === true` |
| **Visibility Auto-Pause** | None | Tab continues running and playing sound in background. | `src/defense.js` | `DefenseController.initVisibilityChange()`: Pauses game and mutes audio when hidden; shows unlock overlay |
| **Session Exit Mechanism** | `#exitHint` click (lines 462–465) | Single tap instantly exits. Cats accidentally trigger it. | `src/defense.js` & `src/ui.js` | `DefenseController.initAnnulusExitLock()`: Ultra-faint `✕` (`opacity: 0.15`), 8.0s continuous clockwise annulus donut hold |
| **Audio Synthesizer** | `playSqueak()` (lines 188–213) | Single sine sweep oscillator. No sound palettes. | `src/audio.js` | `AudioController`: Procedural FM squeak (`4800->2600->3900Hz`), bandpass bug clicks (`5200Hz`), water splash (`1200->280Hz`) |
| **Acoustic Lure** | None | Distracted cats wander away. | `src/audio.js` | `AudioController.scheduleIdleLure()`: 12-second idle timer triggers high-frequency chirp synced with sprint |
| **Haptic Feedback** | `navigator.vibrate(40)` (line 211) | Hardcoded single pulse. | `src/audio.js` | `AudioController.triggerHaptic(intensity)`: Multi-pulse vibration patterns (`[30, 20, 40]`) |
| **Onboarding Walkthrough** | None | No first-visit tutorial or device stability tips. | `src/ui.js` | `UIController.showOnboarding()`: 5-step fullscreen carousel; sets `pawplay_onboarded_v1 = 'true'` |
| **Customization Deck** | Option buttons (lines 437–443) | Only 3 prey choices. No speed, size, count, or timer settings. | `src/ui.js` | `UIController.initCustomizationDeck()`: Prey (5), Count (1–4), Speed (4), Size (3), Themes (3), Timers (4) |
| **Anti-Frustration Treat** | None | Endless chasing without physical reward causes neurotic frustration. | `src/ui.js` | `UIController.showTreatModal()`: End chime, stats, photo thumbnail, "Complete the Hunt! Toss a real treat" prompt |
| **Screen Wake Lock** | `requestWakeLock()` (lines 215–224) | No re-acquisition after tab switch. | `src/ui.js` | `UIController.acquireWakeLock()`: Handles sentinel release and auto-reacquires on document visibility |
| **Pounce-Cam Engine** | None | No reaction photo capture. | `src/camera.js` | `CameraController`: `getUserMedia`, offscreen frame stamp, IndexedDB storage (`pawplay_photos_v1`), gallery modal |
| **PWA & Offline** | None | Standard web page with browser chrome. | Root assets | `manifest.json` (`display: standalone`), `sw.js` (offline cache-first), `vercel.json` (headers) |

---

### 2.2 Module Architecture & Interface Contracts

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 index.html                                  │
│   (Semantic shell: Canvas, UI Overlays, Annulus Exit SVG, Gallery Modal)    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ imports
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                src/main.js                                  │
│             (Master Orchestrator, Event Hub & Lifecycle Bridge)             │
└───────┬──────────────┬──────────────┬──────────────┬──────────────┬─────────┘
        │              │              │              │              │
        ▼              ▼              ▼              ▼              ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│ src/state.js ││src/engine.js ││ src/prey.js  ││ src/input.js ││src/defense.js│
│ Central Store││Canvas / dt / ││5-State FSM / ││Raycast Swipe ││beforeunload /│
│ localStorage ││72px Margins /││Sprites /     ││Sitting-Paw   ││overscroll /  │
│ Event Emitter││Ripples / FX  ││Multi-Prey    ││Filter        ││8s Annulus Lock
└───────┬──────┘└──────────────┘└──────────────┘└──────────────┘└──────────────┘
        │              │              │
        ▼              ▼              ▼
┌──────────────┐┌──────────────┐┌──────────────┐
│ src/audio.js ││  src/ui.js   ││src/camera.js │
│Procedural FM ││Onboarding /  ││getUserMedia /│
│12s Idle Lure ││Deck / Timer /││IndexedDB /   │
│Android Haptic││Treat Modal   ││Photo Gallery │
└──────────────┘└──────────────┘└──────────────┘
```

#### Contract 1: `src/state.js` (State Model & Event Bus)
```javascript
// State Shape
export const state = {
  isPlaying: false,
  isPaused: false,
  onboarded: false,
  settings: {
    preyType: 'laser',   // 'laser' | 'bug' | 'mouse' | 'fish' | 'bee'
    preyCount: 1,        // 1 to 4
    speed: 'hunter',     // 'kitten' | 'hunter' | 'apex' | 'ludicrous'
    size: 'normal',      // 'tiny' | 'normal' | 'chonky'
    theme: 'floor',      // 'floor' | 'night' | 'pond'
    volume: 0.8,         // 0.0 to 1.0
    haptics: 'strong',   // 'off' | 'light' | 'strong'
    luresEnabled: true,  // boolean
    sessionDuration: 0,  // 0 (unlimited), 60, 180, 300 seconds
    cameraTrigger: 'catch' // 'disabled' | 'catch' | 'near-miss' | 'all'
  },
  stats: {
    pounceCount: 0,
    sessionStartTime: null,
    sessionTimeRemaining: 0,
    lifetimePounces: 0
  }
};

// Event Emitter API
export function on(event, callback);
export function off(event, callback);
export function emit(event, payload);
export function saveSettings();
export function loadSettings();
```

#### Contract 2: `src/engine.js` (Canvas, High-DPI, 120Hz Loop, Safe Margins)
```javascript
export class Engine {
  constructor(canvasElement, state);
  init(); // Sets up DPR scaling: Math.min(window.devicePixelRatio || 1, 2)
  resize(); // Recalculates logical & physical canvas dimensions
  start(updateCallback, drawCallback); // 120Hz normalized requestAnimationFrame loop
  stop();
  getBounds(); // Returns { width, height, safeTop: 72, safeBottom: 72, safeLeft: 48, safeRight: width - 48 }
  applyMarginRepulsion(prey, dt); // Inward steering force + hard clamp
  addRipple(x, y, intensity); // Water ripples for Koi Pond
  spawnPounceBurst(x, y, palette); // 18 particles + shockwave ring (#FFD600 & #00E5FF)
  setTheme(themeName); // 'floor' | 'night' | 'pond'
}
```

#### Contract 3: `src/prey.js` (5-State FSM, High-Fidelity Sprites, Multi-Prey)
```javascript
export const PREY_STATES = {
  STALK_CREEP: 'STALK_CREEP',     // 120-220 px/s sinusoidal sneak
  DART_SPRINT: 'DART_SPRINT',     // 600-950 px/s curved burst
  FREEZE_TREMOR: 'FREEZE_TREMOR', // 0.6-2.2s halt with micro-tremors (sin(t * 45) * 1.5px)
  EDGE_SKITTER: 'EDGE_SKITTER',   // Thigmotaxis along 72px/48px margin
  CAUGHT_RESPAWN: 'CAUGHT_RESPAWN'// 180ms squish, 0.7s delay, safe edge respawn
};

export class PreyAgent {
  constructor(id, type, bounds, config);
  update(dt, bounds, allPrey);
  draw(ctx);
  triggerCatch();
  getHitCircle(); // Returns { x, y, radius: this.radius + 42 }
}

export class PreyManager {
  constructor(state, engine);
  syncConfig(settings); // Spawns 1 to 4 prey instances
  update(dt, bounds);
  draw(ctx);
  checkHit(raycastP1, raycastP2); // Line-segment collision against all active prey
}
```

#### Contract 4: `src/input.js` & `src/defense.js` (Raycast Swipe, Sitting-Paw Filter, Tab Defense)
```javascript
export class InputController {
  constructor(canvasElement, preyManager, state, engine);
  init(); // pointerdown, pointermove, pointerup, pointercancel, touchstart, touchmove
  // Raycast Algorithm: Distance from line segment (P1 -> P2) to Prey Center C
  // Sitting-Paw Filter: Map<id, { startX, startY, startTime, isResting }>
  // Suppresses pointers moving < 12px over 400ms
}

export class DefenseController {
  constructor(state, uiController);
  initBeforeUnload(); // beforeunload alert when state.isPlaying === true
  initVisibilityChange(); // Auto-pause and Web Audio mute on tab switch
  initAnnulusExitLock(exitButtonElement, progressSvgElement); // 8-second clockwise filling donut ring
}
```

#### Contract 5: `src/audio.js` (Procedural Web Audio API Synthesizer)
```javascript
export class AudioController {
  constructor(state);
  unlock(); // Resumes AudioContext on initial human gesture
  playCatchSound(preyType); // FM Squeak, Bandpass Bug Click, Water Splash, Laser Pop
  playLureSound(); // 60ms high-pitch chirp (5500Hz) to recall cat after 12s idle
  playTreatChime(); // Harmonic chord on session timer completion
  triggerHaptic(pattern); // Android navigator.vibrate([30, 20, 40])
  suspend();
  resume();
}
```

#### Contract 6: `src/ui.js` (Onboarding, Customization Deck, Session Timer, Treat Modal)
```javascript
export class UIController {
  constructor(state, audioController);
  init();
  showOnboarding(); // 5-step walkthrough carousel; marks pawplay_onboarded_v1 = 'true'
  showCustomizationDeck();
  showTreatModal(stats, photoBlob); // "🍖 Complete the Hunt! Toss your cat a treat."
  startSessionTimer(durationSeconds);
  updateHUD(pounceCount, timeRemaining);
  acquireWakeLock(); // navigator.wakeLock.request('screen') with auto-re-acquire
}
```

#### Contract 7: `src/camera.js` (Pounce-Cam Engine & IndexedDB Vault)
```javascript
export class CameraController {
  constructor(state);
  init(); // Requests getUserMedia({ video: { facingMode: 'user' } })
  triggerCapture(eventReason); // 'catch' | 'near-miss' | 'pounce'
  stampFrameToCanvas(videoElement); // Overlays retro digital timestamp & PawPlay watermark
  savePhotoToDB(blob, metadata); // IndexedDB object store: 'pounce_photos'
  getPhotos(); // Returns all saved photo records
  deletePhoto(id);
  clearGallery();
}
```

---

### 2.3 Step-by-Step Refactoring & Modularization Path

1. **Step 1: Scaffolding Directory Structure**
   - Create directories: `src/`, `css/`, `icons/`.
   - Create `css/styles.css` containing modernized layout, touch-defense styling (`overscroll-behavior: none; touch-action: none;`), onboarding carousel styles, customization deck modal styles, 8-second annulus SVG ring styling, camera gallery modal styles, and treat completion screen.

2. **Step 2: Central State Store (`src/state.js`)**
   - Implement observable state model, event emitter (`on`, `emit`), and `localStorage` synchronization (`pawplay_state_v1`, `pawplay_onboarded_v1`).

3. **Step 3: Core Engine & Physics (`src/engine.js`)**
   - Extract canvas scaling logic with `devicePixelRatio` clamp (`Math.min(window.devicePixelRatio || 1, 2)`).
   - Implement `performance.now()` delta-time normalization ($dt \le 0.05$).
   - Implement active safe perimeter repulsion (`top: 72px`, `bottom: 72px`, `sides: 48px`).
   - Implement contrast themes: Daylight Floor (`#F4F1EA`), Night Stalker (`#10121A`), Koi Pond (`#0A2239` with touch water ripples).
   - Implement particle burst and shockwave ring FX.

4. **Step 4: Biomimetic Prey AI & Sprites (`src/prey.js`)**
   - Implement `PreyAgent` with the 5-state Markov FSM (`STALK_CREEP`, `DART_SPRINT`, `FREEZE_TREMOR`, `EDGE_SKITTER`, `CAUGHT_RESPAWN`).
   - Implement procedural dichromatic sprites: Bumblebee (40Hz wing flutter), Scurrying Roach (6-leg kinematics), Field Mouse (4-node whipping tail), Koi Fish (3-segment spinal flexion), Laser (particle dispersion).
   - Implement `PreyManager` supporting 1 to 4 concurrent prey.

5. **Step 5: Touch Raycasting & Browser Tab Defense (`src/input.js` & `src/defense.js`)**
   - Implement continuous raycast line-segment-to-circle collision (`prevPos -> currPos` distance $\le r + 42\text{px}$).
   - Implement static sitting-paw filter (`< 12px` over `400ms`).
   - Implement Tab Defense Shield: `beforeunload` interceptor, `overscroll-behavior: none`, `visibilitychange` auto-pause & Web Audio mute.
   - Implement 8-Second Clockwise Annulus Exit Lock with faint icon (`opacity: 0.15`).

6. **Step 6: Procedural Web Audio API Synthesizer (`src/audio.js`)**
   - Implement procedural FM rodent squeak, bandpass insect rustle, resonant water splash, and harmonic treat chime.
   - Implement 12-second idle acoustic lure system.
   - Implement Android haptics (`navigator.vibrate([30, 20, 40])`).

7. **Step 7: Pounce-Cam Reaction Engine (`src/camera.js`)**
   - Implement front camera `getUserMedia`, offscreen frame rendering with retro timestamp and PawPlay badge.
   - Implement IndexedDB photo storage (`pawplay_photos_v1`) avoiding localStorage size limits.
   - Implement human photo review gallery modal with image export and delete actions.

8. **Step 8: UI, Onboarding & Customizations (`src/ui.js`)**
   - Implement 5-step fullscreen onboarding walkthrough carousel (`pawplay_onboarded_v1`).
   - Implement deep customization deck (prey selection, 1–4 count, 4 speeds, 3 sizes, 3 themes, session timers).
   - Implement session timer HUD, Screen Wake Lock re-acquisition, and anti-frustration treat modal.

9. **Step 9: Application Assembly (`src/main.js` & `index.html`)**
   - Wire all modules together in `src/main.js`.
   - Update `index.html` to be a clean, semantic shell loading `<script type="module" src="src/main.js">`.

10. **Step 10: PWA Assets & Vercel Configuration**
    - Generate `manifest.json` (`display: standalone`), `sw.js` (cache-first offline), `vercel.json` (security headers, caching).
    - Deploy to Vercel targeting `https://playpaw.vercel.app`.

---

## 3. Caveats

1. **Read-Only Explorer Boundary**: This survey is strictly read-only. No source files (`index.html`, etc.) have been altered during this investigation.
2. **Native iOS Haptics Limitation**: WebKit on iOS/iPadOS intentionally disables `navigator.vibrate`. Haptic feedback will function exclusively on Android devices.
3. **Camera Permissions**: Front-camera access via `getUserMedia` requires an explicit user gesture and human approval. In environments where the user denies camera access, `src/camera.js` must fail gracefully without throwing unhandled exceptions or disrupting gameplay.
4. **Browser Tab Defenses vs. OS Gestures**: Web applications running in standard mobile browsers cannot override OS-level system edge gestures (such as the iOS Home Indicator swipe-up or Android system back gesture). The primary defense is physical margin repulsion (`72px` clearance) combined with PWA Add-to-Home-Screen / iOS Guided Access onboarding instructions.

---

## 4. Conclusion

The existing `index.html` prototype is a functional but rudimentary proof-of-concept. It possesses critical biological and technical deficiencies:
1. **Biological mismatch**: Sprites use colors cats struggle to see (pure red `#ff3b30`), simple linear movement, and lack 120Hz frame pacing.
2. **Input vulnerability**: Lacks continuous raycasting (fast swipes miss prey due to tunneling) and lacks a static sitting-paw filter.
3. **Browser tab vulnerability**: No `beforeunload` protection, no `visibilitychange` auto-pause, 0px edge clearance allowing prey into tab areas, and an accidental single-tap exit button.
4. **Lack of persistence & features**: No first-time onboarding, no deep customization deck, no session timer, no Pounce-Cam reaction engine, and no PWA offline support.

The target 7-module ES Architecture (`src/state.js`, `src/engine.js`, `src/prey.js`, `src/input.js`, `src/defense.js`, `src/audio.js`, `src/ui.js`, `src/camera.js`, `src/main.js`) with modern CSS, IndexedDB, and PWA assets completely resolves all identified gaps, fulfilling requirements R1 through R9.

---

## 5. Verification Method

To independently verify this architectural mapping:

1. **Inspect Existing Prototype**:
   - Run `grep -n "devicePixelRatio" /Users/buianhuy/.gemini/antigravity/scratch/pawplay/index.html` (returns 0 matches, confirming missing DPR scaling).
   - Run `grep -n "performance.now" /Users/buianhuy/.gemini/antigravity/scratch/pawplay/index.html` (returns 0 matches, confirming missing delta-time loop).
   - Run `grep -n "beforeunload" /Users/buianhuy/.gemini/antigravity/scratch/pawplay/index.html` (returns 0 matches, confirming missing tab defense).
   - Run `grep -n "visibilitychange" /Users/buianhuy/.gemini/antigravity/scratch/pawplay/index.html` (returns 0 matches, confirming missing auto-pause).
   - Inspect line 374: `Math.hypot(touchX - prey.x, touchY - prey.y) < prey.radius + 40` (confirms single-point Euclidean hit detection without raycasting).
   - Inspect lines 272–273: `if (this.x < this.radius || this.x > canvas.width - this.radius)` (confirms 0px safe margin clearance).

2. **Verify Target Modular Contracts**:
   - Compare the function and class signatures defined in Section 2.2 against `IMPLEMENTATION_PLAN.md` Workstreams 1 through 6.
