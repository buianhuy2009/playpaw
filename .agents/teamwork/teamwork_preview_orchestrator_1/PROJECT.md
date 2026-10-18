# Project: PawPlay

## Architecture
PawPlay is structured into a clean, zero-external-dependency, ES-module architecture targeting 120Hz mobile and tablet displays:

```
pawplay/
├── index.html              # Clean modern HTML5 shell, viewport, PWA meta tags, overlay containers
├── manifest.json           # PWA standalone manifest (strips browser navigation bars)
├── sw.js                   # Service Worker (cache-first offline asset delivery)
├── vercel.json             # Vercel security headers, permissions policies, service worker caching
├── src/
│   ├── engine.js           # High-DPI canvas scaling, 120Hz dt-normalized render loop, margin physics, themes, ripples, shockwave/particles
│   ├── prey.js             # 5-state Markov FSM, high-fidelity dichromatic sprites (Bumblebee, Roach, Mouse, Koi, Laser), multi-prey manager
│   ├── input.js            # Multi-touch raycast swipe detection (line-segment to circle +42px pad), static sitting-paw filter (<12px / 400ms)
│   ├── defense.js          # Tab Defense Shield: beforeunload, overscroll defense, visibilitychange auto-pause/mute, 8s annulus exit lock
│   ├── audio.js            # Procedural Web Audio API synth (FM rodent squeak, bandpass bug clicks, water splash, 12s acoustic lure, treat chime)
│   ├── ui.js               # 5-step onboarding carousel, customization deck, wake lock manager, session timer, treat completion modal
│   ├── camera.js           # Pounce-Cam getUserMedia capture, retro watermark stamp, IndexedDB storage, human photo gallery modal
│   └── state.js            # Centralized settings store with localStorage persistence ('pawplay_state_v1', 'pawplay_onboarded_v1')
└── tests/
    ├── e2e_runner.html     # Browser-based test harness for automated E2E execution
    └── suites/             # Test suites for Tiers 1–4
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | High-DPI Canvas Scaling | Canvas backing store scaled by `Math.min(window.devicePixelRatio, 2)` | M1 | IMPLEMENTATION_PLAN.md:92 |
| 2 | 120Hz Delta-Time Loop | Uncapped rAF loop normalized by `dt = Math.min((now - lastTime)/1000, 0.05)` | M1 | IMPLEMENTATION_PLAN.md:93 |
| 3 | Safe-Zone Margin Repulsion | Steering acceleration and hard clamp keeping prey inside Top 72px, Bottom 72px, Sides 48px | M1 | ORIGINAL_REQUEST.md:17 |
| 4 | Contrast Theme: Daylight Floor | Light warm parchment background (`#F4F1EA`) with high contrast | M1 | IMPLEMENTATION_PLAN.md:99 |
| 5 | Contrast Theme: Night Stalker | Dark background (`#10121A`) optimized for night hunting | M1 | IMPLEMENTATION_PLAN.md:99 |
| 6 | Contrast Theme: Koi Pond with Ripples | Deep pond background (`#0A2239`) with touch-generated expanding water ripples | M1 | IMPLEMENTATION_PLAN.md:99 |
| 7 | Shockwave & Burst Particles | Expanding ring + 18 burst particles in `#FFD600` and `#00E5FF` upon catch | M1 | IMPLEMENTATION_PLAN.md:98 |
| 8 | Prey State: FREEZE_TREMOR | Prey stops for 0.6s–2.2s with micro-jitter `Math.sin(t*45)*1.5px` | M2 | IMPLEMENTATION_PLAN.md:108 |
| 9 | Prey State: DART_SPRINT | High-acceleration curved escape burst (600–950 px/s) for 0.4s–0.9s | M2 | IMPLEMENTATION_PLAN.md:109 |
| 10 | Prey State: STALK_CREEP | Sinusoidal creeping movement (120–220 px/s) with oscillating heading | M2 | IMPLEMENTATION_PLAN.md:110 |
| 11 | Prey State: EDGE_SKITTER | Thigmotaxis wall-hugging along safe margin perimeter before darting across center | M2 | IMPLEMENTATION_PLAN.md:111 |
| 12 | Prey State: CAUGHT_RESPAWN | 180ms squish animation followed by 0.7s offscreen delay and safe margin spawn | M2 | IMPLEMENTATION_PLAN.md:112 |
| 13 | Dichromatic Laser Dot Sprite | Core `#FFFFFF`, halo `#FFD600`, outer glow `#0066FF`, trailing ribbon particles | M2 | IMPLEMENTATION_PLAN.md:114 |
| 14 | Scurrying Roach / Beetle Sprite | Espresso carapace (`#1A110B`), yellow/cyan highlights, 6 animated cycling legs, twitching antennae | M2 | IMPLEMENTATION_PLAN.md:115 |
| 15 | Field Mouse Sprite | Grey-blue body (`#4A5568`), cream/yellow ears, whiskers, 4-node whipping tail | M2 | IMPLEMENTATION_PLAN.md:116 |
| 16 | Pond Koi Sprite | Golden-yellow (`#FFB703`) & cobalt-blue (`#219EBC`) 3-segment spinal kinematics | M2 | IMPLEMENTATION_PLAN.md:117 |
| 17 | Bumblebee Sprite | High-contrast yellow/black striped bee with high-speed fluttering wing pairs | M2 | ORIGINAL_REQUEST.md:20 |
| 18 | Multi-Prey Concurrency | Support 1 to 4 concurrent prey sprites with independent state machines | M2 | ORIGINAL_REQUEST.md:20 |
| 19 | Multi-Touch Raycast Swipe Engine | Continuous line-segment-to-circle intersection test with +42px pad tolerance | M3 | ORIGINAL_REQUEST.md:23 |
| 20 | Static Sitting-Paw Filter | Suppress stationary touches moving <12px over 400ms from false hits/ripples | M3 | ORIGINAL_REQUEST.md:24 |
| 21 | `beforeunload` Interceptor | Confirmation dialog if tab is closed or reloaded while `isPlaying === true` | M3 | ORIGINAL_REQUEST.md:25 |
| 22 | Overscroll Defense | CSS `overscroll-behavior: none` blocking pull-to-refresh & navigation bounce | M3 | ORIGINAL_REQUEST.md:25 |
| 23 | `visibilitychange` Auto-Pause & Mute | Auto-pause gameplay and suspend Web Audio when tab is hidden; unlock overlay on return | M3 | ORIGINAL_REQUEST.md:25 |
| 24 | 8-Second Annulus Exit Lock | Faint `✕` (opacity ~0.15) requiring continuous 8s clockwise donut fill; reset on release <8s | M3 | ORIGINAL_REQUEST.md:26 |
| 25 | Singleton Web Audio Manager | Auto-unlock AudioContext on first gesture, handle iOS suspended state | M4 | IMPLEMENTATION_PLAN.md:166 |
| 26 | FM Rodent Squeak Generator | Dual-oscillator FM sweep 4800Hz -> 2600Hz -> 3900Hz over 110ms with 45Hz vibrato | M4 | ORIGINAL_REQUEST.md:28 |
| 27 | Bandpass Bug Noise Generator | Bandpass white noise (5200Hz, Q = 3.5) with 25ms percussive pulses | M4 | ORIGINAL_REQUEST.md:28 |
| 28 | Resonant Water Splash Generator | Low-pass sweep (1200Hz -> 280Hz) + droplet sine bend (600Hz -> 1400Hz) | M4 | ORIGINAL_REQUEST.md:28 |
| 29 | 12-Second Idle Acoustic Lure | Emit 60ms high-pitch chirp/rustle synchronized with prey sprint if no touch for 12s | M4 | ORIGINAL_REQUEST.md:29 |
| 30 | Android Haptic Vibration | Patterned vibration `[30, 20, 40]` ms on catch when supported | M4 | IMPLEMENTATION_PLAN.md:172 |
| 31 | Treat Completion Chime | Ascending 3-chord chime (C5-E5-G5) signaling session end and treat reward | M4 | IMPLEMENTATION_PLAN.md:203 |
| 32 | First-Time Onboarding Walkthrough | 5-step full-screen carousel shown when `!localStorage.getItem('pawplay_onboarded_v1')` | M5 | ORIGINAL_REQUEST.md:32 |
| 33 | Customization Deck UI | Settings for prey type, count (1–4), speeds (Kitten, Hunter, Apex, Ludicrous), sizes (Tiny, Normal, Chonky), volume, themes, timers | M5 | ORIGINAL_REQUEST.md:33 |
| 34 | Screen Wake Lock Integration | Request screen wake lock on game start; auto-reacquire on visibility change | M5 | PROJECT_PLAN.md:99 |
| 35 | Session Timer HUD & Modes | Timer modes: 1m, 3m, 5m, Unlimited; countdown display and graceful completion | M5 | ORIGINAL_REQUEST.md:33 |
| 36 | Anti-Frustration Treat Modal | "Complete the Hunt" modal reminding human to provide physical treat/toy | M5 | IMPLEMENTATION_PLAN.md:203 |
| 37 | Settings State Persistence | Store user configuration in `localStorage` key `'pawplay_state_v1'` | M5 | IMPLEMENTATION_PLAN.md:183 |
| 38 | Guided Access & PWA Guidance | Educational modal explaining iOS Guided Access & Android Screen Pinning | M5 | PROJECT_PLAN.md:334 |
| 39 | Pounce-Cam Front Camera Access | `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })` with human permission toggle | M6 | ORIGINAL_REQUEST.md:36 |
| 40 | Pounce-Cam Trigger Modes | Configurable snapshot triggers: On Catch, On Near-Miss, Every Pounce, Disabled | M6 | ORIGINAL_REQUEST.md:36 |
| 41 | Offscreen Watermark Canvas | Capture frame to offscreen canvas with retro digital timestamp and PawPlay watermark | M6 | ORIGINAL_REQUEST.md:36 |
| 42 | IndexedDB Photo Vault | Client-side IndexedDB database (`pawplay_photos_v1`) preventing localStorage quota exhaustion | M6 | ORIGINAL_REQUEST.md:36 |
| 43 | Human Photo Review Gallery | In-app modal gallery displaying captured cat photos with export/delete options | M6 | ORIGINAL_REQUEST.md:36 |
| 44 | Complete App Integration | Harmonize all modules into clean `index.html` shell with responsive UI | M6 | ORIGINAL_REQUEST.md:5 |
| 45 | PWA Web App Manifest | `manifest.json` configured with `"display": "standalone"`, icons, and mobile orientations | M7 | ORIGINAL_REQUEST.md:58 |
| 46 | Offline Service Worker | `sw.js` cache-first service worker for complete offline reliability | M7 | ORIGINAL_REQUEST.md:68 |
| 47 | Git Repository Initialization | Initialize git, stage all files, create comprehensive initial commit | M7 | ORIGINAL_REQUEST.md:39 |
| 48 | `vercel.json` Security & Cache Headers | Strict security headers (nosniff, DENY, CSP) and SW no-cache headers | M7 | ORIGINAL_REQUEST.md:39 |
| 49 | Vercel MCP Automated Deployment | Deploy to `playpaw.vercel.app` via Vercel MCP under team `team_i6w55Xr6YiuTbLK4AOxUv2le` | M7 | ORIGINAL_REQUEST.md:39 |
| 50 | 100% E2E Test Suite Pass | Complete verification of Tiers 1–4 across all 51 features and edge cases | Final Milestone | ORIGINAL_REQUEST.md:67 |
| 51 | Tier 5 Adversarial Coverage Hardening | White-box adversarial testing, boundary attacks, and gap elimination | Final Milestone | Project Pattern |
| 52 | Autonomous 3-Pass Rule Verification | 3 consecutive browser test passes with zero bugs and zero console warnings/errors | Final Milestone | ORIGINAL_REQUEST.md:42 |
| 53 | Continuous Documentation | Update Section 9 of `PROJECT_PLAN.md` with all architectural changes, test logs, and live URLs | Final Milestone | ORIGINAL_REQUEST.md:45 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Engine & Physics | High-DPI canvas, 120Hz dt render loop, margin repulsion (Top 72px, Bottom 72px, Sides 48px), 3 themes, ripples, particles | none | PLANNED |
| M2 | Prey AI & Sprites | 5-state Markov FSM, high-fidelity dichromatic sprites (Bumblebee, Roach, Mouse, Koi, Laser), 1–4 multi-prey manager | M1 | PLANNED |
| M3 | Input & Tab Defense Shield | Multi-touch continuous raycast swipe (+42px pad), sitting-paw filter (<12px/400ms), beforeunload, overscroll-behavior, visibilitychange auto-pause/mute, 8s annulus exit lock | M1 | PLANNED |
| M4 | Procedural Audio & Lures | Singleton Web Audio API synth, FM squeaks, bandpass clicks, water splash, 12s acoustic lure, treat chime, Android haptics | none | PLANNED |
| M5 | Onboarding & UI Deck | 5-step onboarding carousel, customization deck, wake lock, session timer HUD, anti-frustration treat modal, state persistence | M1, M2, M4 | PLANNED |
| M6 | Pounce-Cam & Integration | getUserMedia front camera, triggers, offscreen watermark, IndexedDB storage, gallery modal, index.html full wiring | M1, M2, M3, M4, M5 | PLANNED |
| M7 | PWA & Vercel MCP Deployment | manifest.json, sw.js, git init/commit, vercel.json, automated deployment to playpaw.vercel.app | M6 | PLANNED |
| Final | E2E Pass, Hardening & 3-Pass Certification | 100% E2E test pass, Tier 5 adversarial hardening, 3-Pass DevTools zero-error certification, Section 9 documentation | M7, E2E Track | PLANNED |

## Interface Contracts

### 1. `Engine` (`src/engine.js`)
- `Engine.init(canvasElement)`: Initializes high-DPI canvas and context.
- `Engine.setTheme(themeName)`: Switches active background theme ('daylight', 'night', 'pond').
- `Engine.applySafeMargins(sprite, dt)`: Clamps and steers sprite within Top 72px, Bottom 72px, Sides 48px.
- `Engine.spawnBurst(x, y, palette)`: Spawns 18 burst particles + expanding shockwave ring.
- `Engine.addRipple(x, y)`: Adds an interactive expanding water ripple (used in Pond theme).
- `Engine.getDimensions()`: Returns `{ width, height, safeArea: { top: 72, bottom, left: 48, right } }`.

### 2. `PreyManager` & `PreyAgent` (`src/prey.js`)
- `PreyManager.init(count, type, speedMode, sizeMode)`: Configures active prey pool.
- `PreyManager.update(dt, safeArea)`: Updates all active prey FSMs and positions.
- `PreyManager.draw(ctx)`: Renders all active high-fidelity sprites.
- `PreyManager.checkHits(raycastChecker)`: Tests collision and triggers `CAUGHT_RESPAWN`.
- `PreyAgent.state`: Current state enum (`STALK_CREEP`, `DART_SPRINT`, `FREEZE_TREMOR`, `EDGE_SKITTER`, `CAUGHT_RESPAWN`).

### 3. `InputController` & `DefenseShield` (`src/input.js`, `src/defense.js`)
- `InputController.init(canvas, onPounceCallback, onRippleCallback)`: Binds pointer/touch listeners with line-segment raycasting.
- `InputController.isRestingPaw(pointerId)`: Returns boolean indicating static resting-paw suppression.
- `DefenseShield.enableBeforeUnload()`: Activates beforeunload dialog while `isPlaying === true`.
- `DefenseShield.initVisibilityHandler(onHide, onShow)`: Pauses loop and mutes audio when tab is backgrounded.
- `DefenseShield.initAnnulusLock(container, onExitComplete)`: Binds 8-second clockwise filling donut lock; resets on early release.

### 4. `SoundSynthesizer` (`src/audio.js`)
- `SoundSynthesizer.unlock()`: Resumes/initializes Web Audio API context on first gesture.
- `SoundSynthesizer.playPreyCatch(preyType)`: Plays FM rodent squeak, bandpass bug click, or resonant water splash.
- `SoundSynthesizer.triggerAcousticLure()`: Emits high-pitch chirp/rustle after 12s idle.
- `SoundSynthesizer.playTreatChime()`: Plays ascending C5-E5-G5 completion chime.
- `SoundSynthesizer.mute(boolean)`: Toggles global audio output.

### 5. `PounceCam` (`src/camera.js`)
- `PounceCam.init()`: Requests `getUserMedia({ video: { facingMode: 'user' } })` upon user toggle.
- `PounceCam.captureSnapshot(triggerType)`: Snaps current video frame to offscreen canvas, applies retro timestamp + PawPlay badge, saves record to IndexedDB.
- `PounceCam.getPhotos()`: Returns Promise resolving to array of stored snapshot records from IndexedDB.
- `PounceCam.deletePhoto(id)`: Removes snapshot record from IndexedDB.

### 6. `UIController` & `AppState` (`src/ui.js`, `src/state.js`)
- `AppState.get()` / `AppState.update(partial)`: Reactive store synced to `localStorage['pawplay_state_v1']`.
- `UIController.showOnboarding(onDone)`: Displays 5-step carousel if `!localStorage['pawplay_onboarded_v1']`.
- `UIController.openSettings()` / `UIController.closeSettings()`: Controls human customization deck.
- `UIController.startSession(mode)`: Initiates session timer (1m, 3m, 5m, unlimited) and wake lock.
- `UIController.showTreatModal()`: Displays anti-frustration treat reward overlay.

## Code Layout
All production code will be located in the project root:
- `index.html` (entry point)
- `manifest.json`, `sw.js`, `vercel.json`
- `src/` (ES modules)
- `assets/` (SVG icons, splash artwork)
- `tests/` (E2E test runner and automated suites)
