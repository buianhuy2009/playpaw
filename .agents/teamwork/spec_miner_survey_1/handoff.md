# Handoff Report: Specification Survey & Comprehensive Feature Inventory

- **Author**: `spec_miner_survey_1`
- **Date**: 2026-10-18T09:32:00Z
- **Target Recipient**: Orchestrator (`46512a29-cba5-437c-ab6d-761bb6fb87d0`)
- **Status**: Complete / Hard Handoff

---

## 1. Observation

Direct observations from authoritative project sources:

### A. Authoritative Source Documents
1. **`/Users/buianhuy/.gemini/antigravity/scratch/pawplay/.agents/teamwork/ORIGINAL_REQUEST.md`**:
   - Lines 5–6: Directs upgrade from single-file prototype into biologically calibrated web application for cats with Browser Tab Defense Shield, Pounce-Cam reaction engine, full-screen onboarding, and automated Vercel MCP deployment to `playpaw.vercel.app`.
   - Lines 16–46: Mandates requirements R1 through R9.
   - Lines 49–69: Defines explicit acceptance criteria across Browser Tab Defense & Exit Lock, First-Time Onboarding & Customizations, Touch/Camera/Sprites, and 3-Pass Verification & Live Deployment.

2. **`/Users/buianhuy/.gemini/antigravity/scratch/pawplay/PROJECT_PLAN.md`**:
   - Lines 5–7 & 278–282: Mandatory Documentation Directive requiring continuous logging of upgrades, decisions, test logs, and live URLs in Section 9.
   - Lines 45–55: Feline scratch physics: claws are non-conductive keratin (Mohs 2.5), screen glass is Mohs 5.5–6.5. Paw pads ("toe beans") conduct electricity. Cat swiping requires continuous `touchmove` drag detection.
   - Lines 193–219: Zero-latency procedural Web Audio synthesizer specifications.
   - Lines 250–260: Scale monetization strategy (marked dormant / archived reference only).
   - Lines 317–321: Biological facts: Cats are dichromats with blue (~450nm) and yellow/green (~550nm) cones; lacking red sensitivity. Yellow (`#FFD600`) and blue (`#0077FF`) provide maximum feline visual contrast. Feline Flicker Fusion Frequency (FFF) is 70–100Hz (human is 50–60Hz), demanding a 120Hz delta-time normalized loop.
   - Lines 327–335: Tab Defense Shield specification: PWA standalone mode, `beforeunload`, `overscroll-behavior: none`, 72px top margin, `visibilitychange` auto-pause/mute, and 8-second clockwise annulus exit lock.
   - Lines 342–346: Pounce-Cam engine specification with IndexedDB storage and human gallery.
   - Lines 348–356: 5-step onboarding walkthrough carousel triggered on `!localStorage.getItem('pawplay_onboarded_v1')`.

3. **`/Users/buianhuy/.gemini/antigravity/scratch/pawplay/IMPLEMENTATION_PLAN.md`**:
   - Lines 15–30: Scientific matrix mapping technical implementations to biological/physical/OS rationales.
   - Lines 35–82: 6 multi-agent workstreams.
   - Lines 87–100 (Workstream 1): Canvas scaling `Math.min(window.devicePixelRatio || 1, 2)`; normalization `dt = Math.min((now - lastTime) / 1000, 0.05)`; safe margins `SAFE_MARGIN_TOP = 72`, `SAFE_MARGIN_BOTTOM = 72`, `SAFE_MARGIN_SIDES = 48` with steering acceleration and hard clamping; themes `Daylight Floor` (`#F4F1EA`), `Night Stalker` (`#10121A`), `Koi Pond` (`#0A2239` with touch ripples); shockwave + 18 burst particles in `#FFD600` and `#00E5FF`.
   - Lines 103–119 (Workstream 2): 5-state Markov FSM (`FREEZE_TREMOR`, `DART_SPRINT`, `STALK_CREEP`, `EDGE_SKITTER`, `CAUGHT_RESPAWN`); 5 prey types (Bumblebee, Roach, Mouse, Koi, Laser); multi-prey scaling (1 to 4).
   - Lines 122–160 (Workstream 3): `beforeunload` interceptor; `overscroll-behavior: none`; `visibilitychange` auto-pause; continuous swipe raycast (line-segment to circle intersection with +42px pad tolerance); static sitting-paw filter (`< 12px` over `400ms`); 8-second clockwise annulus exit lock (opacity ~0.15, reset on release <8s).
   - Lines 162–173 (Workstream 4): FM squeak (`4800Hz -> 2600Hz -> 3900Hz` over 110ms with 45Hz vibrato); bandpass bug noise (`5200Hz`, `Q = 3.5`, 25ms pulses); water splash (`1200Hz -> 280Hz` + droplet bend `600Hz -> 1400Hz`); 12s idle acoustic lure; Android haptics `[30, 20, 40]`.
   - Lines 176–213 (Workstream 5): Customization deck; Pounce-Cam (`getUserMedia({ video: { facingMode: 'user' } })`, triggers: On Catch, On Near-Miss, Every Pounce, Disabled, offscreen canvas watermarking, IndexedDB vault, human gallery modal); anti-frustration treat screen; 5-step onboarding walkthrough; Guided Access / PWA guide; `localStorage` key `pawplay_state_v1`.
   - Lines 215–255 (Workstream 6): Git repo, Vercel MCP `create_git_project`, `vercel.json` security/caching headers, PWA `manifest.json` (`display: standalone`), `sw.js` cache-first service worker, target domain `https://playpaw.vercel.app`, team `team_i6w55Xr6YiuTbLK4AOxUv2le`.
   - Lines 258–280: Autonomous "Build - View - Fix" quality loop and strict 3-pass certification rule.

4. **Existing Prototype Inspection (`index.html`)**:
   - `index.html` lines 235–281: Prey movement uses discrete fixed addition `this.x += this.vx` with no `deltaTime` normalization, causing 2x speed variance between 60Hz and 120Hz displays.
   - `index.html` lines 272–273: Prey bounces off canvas edges with zero margin clearance, violating the 72px/48px defense margins.
   - `index.html` lines 289–350: Only 3 crude geometric drawings (red laser dot, brown ellipse bug, grey ellipse mouse). No Bumblebee, no Koi fish, no high-fidelity sprites.
   - `index.html` lines 371–385: Hit detection uses discrete point distance `Math.hypot(touchX - prey.x, touchY - prey.y)` without line-segment raycasting. Fast paw swipes tunnel right through.
   - `index.html` line 462: Exit button is a clickable `✕ Menu` in top right corner. A single cat paw tap instantly ends the game.
   - `index.html`: Completely lacks `beforeunload`, `overscroll-behavior: none`, `visibilitychange` auto-pause, resting paw filter, 8-second annulus lock, onboarding carousel, session timers, treat modal, Pounce-Cam engine, IndexedDB, and PWA manifest/service worker.

---

## 2. Logic Chain

1. **Feline Vision and Display Pacing Connection**:
   - Cats are dichromatic (blue ~450nm and green/yellow ~550nm photoreceptors) and lack red cones. Red laser dots appear dull grey-brown. Therefore, all sprites and visual feedback must feature `#FFD600` (yellow) and `#0077FF` / `#00E5FF` (blue/cyan).
   - Feline Flicker Fusion Frequency is 70–100Hz. At standard 60Hz, motion appears stuttered. A 120Hz delta-time normalized loop (`dt = Math.min((now - lastTime)/1000, 0.05)`) ensures smooth motion matching feline visual processing.

2. **Browser Tab Defense & Operating System Boundary Connection**:
   - Web applications running in standard mobile browsers cannot capture or disable OS-level edge gestures (iOS Home Bar swipe, Android Back swipe, Notification Center pull-down). Furthermore, cats swatting near the top edge hit browser tabs, address bars, or close buttons.
   - PWA standalone mode (`"display": "standalone"`) eliminates tabs when installed.
   - Active repulsion margins (`SAFE_MARGIN_TOP = 72px`, `SAFE_MARGIN_BOTTOM = 72px`, `SAFE_MARGIN_SIDES = 48px`) keep prey strictly away from edges so cats swat towards the center.
   - `beforeunload` provides a browser-level confirmation modal if the tab is closed or reloaded during active play.
   - `overscroll-behavior: none` prevents mobile pull-to-refresh and bounce effects.
   - `visibilitychange` pauses gameplay and mutes Web Audio immediately upon tab backgrounding.
   - An 8-second clockwise filling annulus exit lock with immediate reset on release prevents accidental paw exits while remaining accessible to human owners.

3. **Touch Raycasting & Sitting-Paw Filter Connection**:
   - Feline claws are non-conductive keratin (Mohs 2.5); only conductive paw pads ("toe beans") register touch.
   - Cats swipe dynamically with lateral claw drags. Discrete point collision misses fast swipes. Continuous line-segment raycasting (`prev` to `curr`) with `+42px` pad expansion guarantees hit registration.
   - Cats frequently rest a paw or chest against tablet edges. Tracking `pointerId` with movement `< 12px` over `400ms` suppresses stationary touches, preventing continuous false hits and allowing active swatting paws to register unhindered.

4. **Procedural Web Audio & Predatory Frustration Mitigation Connection**:
   - Cats hear up to 64kHz and respond to high-pitch FM squeaks (3800Hz–5500Hz) and bug clicks (5200Hz bandpass). External audio files incur network latency and loading failures; procedural Web Audio API provides zero-latency instant feedback.
   - A 12-second idle acoustic lure recalls distracted cats to the screen.
   - Hunting virtual prey without physical tactile capture causes neurotic frustration in domestic felines. Session timers (1m, 3m, 5m, Unlimited) coupled with the "Complete the Hunt" treat modal instruct owners to provide a physical treat/toy at session end.

5. **Pounce-Cam & Human Engagement Connection**:
   - Front-facing camera access (`getUserMedia`) captures high-speed reaction snapshots at moments of peak intensity (*On Catch*, *On Near-Miss*, *Every Pounce*).
   - Offscreen canvas watermarking (retro timestamp + PawPlay badge) and client-side IndexedDB storage avoid localStorage quota limits (5MB) while enabling human gallery viewing and photo export.

6. **Automated Deployment & Quality Certification Connection**:
   - The application requires HTTPS for Screen Wake Lock API, PWA Service Worker, and `getUserMedia` camera permissions.
   - Vercel MCP deployment to `playpaw.vercel.app` with `vercel.json` security headers and service worker caching satisfies production hosting.
   - The 3-Pass Rule ensures that no code is shipped until 3 consecutive test passes complete with zero errors and zero console warnings.

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | R1: Engine | High-DPI Canvas Scaling | Scales canvas backing store by device pixel ratio to ensure sharp rendering on Retina/OLED screens | `window.devicePixelRatio`, window dimensions | Crisp canvas context scaled by `Math.min(dpr, 2)` | Fallback to `dpr = 1` if undefined | IMPLEMENTATION_PLAN.md:92 |
| 2 | R1: Engine | 120Hz Delta-Time Loop | Uncapped `requestAnimationFrame` loop normalized by elapsed time | `performance.now()` timestamps | Normalized position updates `x += vx * dt` | Clamped to `dt <= 0.05` to prevent explosion on tab drop | IMPLEMENTATION_PLAN.md:93 |
| 3 | R1: Engine | Safe-Zone Perimeter Repulsion | Inward steering acceleration and hard boundary clamping away from edges (Top: 72px, Bottom: 72px, Sides: 48px) | Sprite coordinates `(x, y)`, velocity `(vx, vy)` | Modified steering velocity keeping sprite inside safe zone | Hard position clamp if steering overshoot occurs | ORIGINAL_REQUEST.md:17, IMPLEMENTATION_PLAN.md:95 |
| 4 | R1: Engine | Contrast Theme: Daylight Floor | Light warm parchment background (`#F4F1EA`) with high-contrast prey | Theme selector value `'daylight'` | Canvas background rendered with `#F4F1EA` | Defaults to Daylight Floor if unknown theme | IMPLEMENTATION_PLAN.md:99 |
| 5 | R1: Engine | Contrast Theme: Night Stalker | Dark room background (`#10121A`) optimized for night hunting | Theme selector value `'night'` | Canvas background rendered with `#10121A` | Defaults to Daylight Floor if unknown theme | IMPLEMENTATION_PLAN.md:99 |
| 6 | R1: Engine | Contrast Theme: Koi Pond with Ripples | Deep pond water background (`#0A2239`) with interactive expanding water ripples on touch | Theme selector value `'pond'`, touch coordinates | Canvas renders water background with concentric animated ripple rings | Ripples gracefully expire after life counter hits 0 | IMPLEMENTATION_PLAN.md:99 |
| 7 | R1: Engine | Pounce Shockwave & Burst Particles | Concentric expanding ring + 18 burst particles in `#FFD600` and `#00E5FF` upon catch | Catch coordinates `(x, y)` | Animated shockwave ring and 18 fading particle entities | Array auto-prunes dead particles | IMPLEMENTATION_PLAN.md:98 |
| 8 | R2: Prey AI | State: FREEZE_TREMOR | Prey freezes for 0.6s–2.2s with micro-jitter `Math.sin(t*45)*1.5px` and twitching appendages | Prey state timer, delta-time | Zero translational velocity, high-frequency rotational/position jitter | Transitions to `DART_SPRINT` on timeout | IMPLEMENTATION_PLAN.md:108 |
| 9 | R2: Prey AI | State: DART_SPRINT | High-acceleration curved escape burst (600–950 px/s) lasting 0.4s–0.9s | Prey state timer, heading angle | Rapid curved velocity vectors across safe zone | Transitions to `STALK_CREEP` or `EDGE_SKITTER` | IMPLEMENTATION_PLAN.md:109 |
| 10 | R2: Prey AI | State: STALK_CREEP | Sinusoidal creeping movement (120–220 px/s) simulating cautious prey | Prey state timer, sine phase | Gentle wandering motion with oscillating heading | Random probability transition to `FREEZE_TREMOR` | IMPLEMENTATION_PLAN.md:110 |
| 11 | R2: Prey AI | State: EDGE_SKITTER | Thigmotaxis wall-hugging along `SAFE_MARGIN` perimeter before darting across center | Margin boundary distance, velocity | Path tangent to margin perimeter with inward dart trigger | Smooth turn away from corners | IMPLEMENTATION_PLAN.md:111 |
| 12 | R2: Prey AI | State: CAUGHT_RESPAWN | 180ms squish animation followed by 0.7s off-screen delay and safe margin re-entry | Catch event trigger | Scale deformation, opacity fade, respawn at random safe margin | Safe coordinate re-clamping on spawn | IMPLEMENTATION_PLAN.md:112 |
| 13 | R2: Sprites | Dichromatic Laser Dot Sprite | Core `#FFFFFF`, halo `#FFD600` (yellow), outer glow `#0066FF` (blue), 8-point motion blur ribbon and particle dispersion | Position, motion history | Multi-layered radial gradient with fading trailing ribbon | Clamped ribbon buffer length | IMPLEMENTATION_PLAN.md:114 |
| 14 | R2: Sprites | Scurrying Roach / Beetle Sprite | Espresso carapace (`#1A110B`), yellow/cyan highlights, 6 animated cycling legs, twitching antennae | Heading angle, leg phase | Rendered directional beetle with walking leg kinematics | Graceful fallback if leg phase wraps | IMPLEMENTATION_PLAN.md:115 |
| 15 | R2: Sprites | Field Mouse Sprite | Grey-blue body (`#4A5568`), cream/yellow ears, whiskers, 4-node whipping tail kinematics | Heading angle, tail node physics | Rendered directional mouse with sine-wave whipping tail | Tail node distance constraints clamped | IMPLEMENTATION_PLAN.md:116 |
| 16 | R2: Sprites | Pond Koi Sprite | Golden-yellow (`#FFB703`) & cobalt-blue (`#219EBC`) 3-segment spinal kinematics with swimming fins | Heading angle, segment angles | Segmented fish body with swimming oscillation | Joint rotation angles clamped to +/-35 deg | IMPLEMENTATION_PLAN.md:117 |
| 17 | R2: Sprites | Bumblebee Sprite | High-contrast yellow/black striped bee with high-speed fluttering wing pairs | Heading angle, wing flutter phase | Directional insect with oscillating translucent wing pairs | Wing flutter phase driven by performance.now() | ORIGINAL_REQUEST.md:20, IMPLEMENTATION_PLAN.md:181 |
| 18 | R2: Multi-Prey | Multi-Prey Concurrency Spawner | Support 1 to 4 concurrent active prey sprites with independent FSMs | Prey count setting (1, 2, 3, 4), screen width | Array of active `PreyAgent` instances rendered in loop | Default to 1 on screens `<768px` | ORIGINAL_REQUEST.md:20, IMPLEMENTATION_PLAN.md:118 |
| 19 | R3: Tab Defense | Multi-Touch Raycast Swipe Engine | Line-segment-to-circle intersection test between previous and current touch points with +42px pad expansion | `pointerdown`, `pointermove`, `touchstart`, `touchmove` | Catch event fired if segment intersects `(x, y, radius + 42)` | Prevents touch event default scrolling | ORIGINAL_REQUEST.md:23, IMPLEMENTATION_PLAN.md:148 |
| 20 | R3: Tab Defense | Static Sitting-Paw Filter | Suppresses stationary touches moving `< 12px` over `400ms` from triggering continuous hits or ripples | `pointerId`, `(x, y)`, timestamp | Marks pointer as `isResting = true`, blocks ripple/catch | Re-activates if pointer moves > 12px | ORIGINAL_REQUEST.md:24, IMPLEMENTATION_PLAN.md:151 |
| 21 | R3: Tab Defense | `beforeunload` Interceptor | Prompts browser confirmation dialog if user/paw attempts to close or reload tab while playing | Window `beforeunload` event, `isPlaying` | `e.preventDefault()`, sets `e.returnValue = ''` | Ignored if `isPlaying === false` | ORIGINAL_REQUEST.md:25, IMPLEMENTATION_PLAN.md:128 |
| 22 | R3: Tab Defense | Overscroll Defense | Blocks elastic scrolling and pull-to-refresh gestures in mobile Safari and Chrome | CSS `overscroll-behavior: none` on `html, body, canvas` | Disables browser reload/tab bar emergence on edge drag | Native CSS support across modern browsers | ORIGINAL_REQUEST.md:25, IMPLEMENTATION_PLAN.md:136 |
| 23 | R3: Tab Defense | `visibilitychange` Auto-Pause & Mute | Automatically pauses gameplay and suspends Web Audio when tab is hidden; presents pause overlay on return | Document `visibilitychange` event | Game loop paused, `audioCtx.suspend()`, pause modal shown | Safe resume via user unlock button | ORIGINAL_REQUEST.md:25, IMPLEMENTATION_PLAN.md:137 |
| 24 | R3: Exit Lock | 8-Second Clockwise Annulus Exit Lock | Ultra-faint `✕` widget (opacity ~0.15); holding fills clockwise annulus ring over exactly 8.0s | Continuous pointer hold on corner widget | Annulus stroke animates clockwise 0% to 100% over 8s | Releasing before 8.0s immediately resets to 0% | ORIGINAL_REQUEST.md:26, IMPLEMENTATION_PLAN.md:153 |
| 25 | R4: Audio | Singleton Web Audio Context Manager | Initializes AudioContext on first user interaction, handles iOS suspended state and auto-resume | User click/tap gesture | Unlocked, running `AudioContext` instance | Fallback to `webkitAudioContext` on legacy WebKit | IMPLEMENTATION_PLAN.md:166 |
| 26 | R4: Audio | FM Rodent Squeak Generator | Dual-oscillator FM synthesis sweeping 4800Hz -> 2600Hz -> 3900Hz over 110ms with 45Hz vibrato | Catch event on Mouse prey | High-pitch FM squeak audio output | Silently ignored if audio muted or context suspended | ORIGINAL_REQUEST.md:28, IMPLEMENTATION_PLAN.md:168 |
| 27 | R4: Audio | Bandpass Bug Noise Generator | Bandpass-filtered white noise burst (5200Hz, Q = 3.5) with 25ms percussive pulses | Catch event on Roach/Bumblebee prey | Insectoid clicking/fluttering sound output | Silently ignored if audio muted | ORIGINAL_REQUEST.md:28, IMPLEMENTATION_PLAN.md:169 |
| 28 | R4: Audio | Resonant Water Splash Generator | Low-pass sweep (1200Hz -> 280Hz) + droplet sine bend (600Hz -> 1400Hz) | Catch event on Koi Fish prey | Realistic procedural water bloop/splash | Silently ignored if audio muted | ORIGINAL_REQUEST.md:28, IMPLEMENTATION_PLAN.md:170 |
| 29 | R4: Audio | 12-Second Idle Acoustic Lure | Emits 60ms high-pitch chirp/rustle synchronized with a prey `DART_SPRINT` if no touch detected for 12s | Elapsed touch idle timer (>= 12s) | Audio chirp and synchronized prey sprint | Timer resets immediately upon any touch | ORIGINAL_REQUEST.md:29, IMPLEMENTATION_PLAN.md:171 |
| 30 | R4: Audio | Android Haptic Vibration | Triggers patterned haptic vibration `[30, 20, 40]` ms on catch | Catch event trigger | Physical device vibration | Checked via `'vibrate' in navigator`; no-op on iOS | IMPLEMENTATION_PLAN.md:172 |
| 31 | R5: Onboarding | First-Time Fullscreen Carousel | Displays 5-step walkthrough on first visit (!`localStorage.getItem('pawplay_onboarded_v1')`) | Page load, localStorage check | Fullscreen modal with steps: Stability, Defense, Biology, Cam, Hunt | Persists `'true'` to `pawplay_onboarded_v1` on dismiss | ORIGINAL_REQUEST.md:32, IMPLEMENTATION_PLAN.md:198 |
| 32 | R5: UI Deck | Human Customization Deck | Configuration panel for prey, speed, size, theme, count, sound, haptics, timer | User touch selections | Updates active configuration and persists to localStorage | Defaults applied for missing options | ORIGINAL_REQUEST.md:33, IMPLEMENTATION_PLAN.md:180 |
| 33 | R5: UI Deck | Session Timer Modes | Configurable session duration: 1 min, 3 min, 5 min, or Unlimited (Endless) | Selected mode in settings | Countdown timer during play, triggers session end | Unlimited mode runs indefinitely | ORIGINAL_REQUEST.md:33, IMPLEMENTATION_PLAN.md:187 |
| 34 | R5: UI Deck | Anti-Frustration Treat Screen | Smoothly decelerates prey off-screen, plays chime, displays catch count, photo thumbnail, and treat prompt | Session timer expiry or exit lock complete | Treat reminder modal ("🍖 Complete the Hunt!") | Safe return to Human Menu | IMPLEMENTATION_PLAN.md:196 |
| 35 | R5: UI Deck | Screen Wake Lock Manager | Prevents screen dimming or sleep during active play sessions | `navigator.wakeLock.request('screen')` | Active ScreenWakeLockSentinel instance | Re-requests on `visibilitychange` visible; try/catch guard | PROJECT_PLAN.md:99, IMPLEMENTATION_PLAN.md:64 |
| 36 | R5: UI Deck | Fullscreen API Integration | Requests browser fullscreen on game start to hide address and tab bars | User click on Start Playing | Screen enters fullscreen display | Handled gracefully if rejected by browser/OS | PROJECT_PLAN.md:32, IMPLEMENTATION_PLAN.md:64 |
| 37 | R5: UI Deck | Hardware & OS Setup Guide Modal | Step-by-step visual instructions for iOS Guided Access (triple-click) and PWA Home Screen install | Click on "❓ Guide" in Human Menu | Instructional modal with screenshots/diagrams | Dismissible back to menu | IMPLEMENTATION_PLAN.md:207 |
| 38 | R5: UI Deck | Settings Persistence Engine | Serializes settings and lifetime statistics under key `pawplay_state_v1` in `localStorage` | Configuration changes, catch events | JSON stored in `localStorage` | Fallback to memory defaults if storage disabled | IMPLEMENTATION_PLAN.md:211 |
| 39 | R6: Camera | Pounce-Cam WebRTC Stream Manager | Connects to front-facing camera via `getUserMedia({ video: { facingMode: 'user' } })` with human toggle | User camera toggle in settings | Silent offscreen `<video>` stream | Gracefully disabled if permission denied | ORIGINAL_REQUEST.md:36, IMPLEMENTATION_PLAN.md:188 |
| 40 | R6: Camera | Settable Capture Trigger Engine | Evaluates camera capture conditions: *On Catch*, *On Near-Miss*, *Every Pounce*, *Disabled* | Pounce events, distance to prey | Triggers frame grab when event matches active trigger | No-op if camera disabled or unpermitted | ORIGINAL_REQUEST.md:36, IMPLEMENTATION_PLAN.md:190 |
| 41 | R6: Camera | Watermarked Frame Renderer | Draws current video frame to offscreen canvas with retro digital timestamp and "PawPlay Catch!" badge | Video element frame, current time | 2D Canvas converted to image Blob | Fallback if frame cannot be grabbed | ORIGINAL_REQUEST.md:36, IMPLEMENTATION_PLAN.md:191 |
| 42 | R6: Camera | IndexedDB Photo Vault | Asynchronously stores captured reaction snapshots in dedicated IndexedDB object store (`pawplay_photos`) | Photo Blob, timestamp, score | Record saved in IndexedDB | Fallback with console warning if IndexedDB blocked | ORIGINAL_REQUEST.md:36, IMPLEMENTATION_PLAN.md:192 |
| 43 | R6: Camera | Cat Cam Photo Gallery Modal | Human review modal to browse captured snapshots, download images to device, or delete album | User click on "📷 Cat Cam" in menu | Responsive photo grid modal with download buttons | Handles empty gallery state gracefully | ORIGINAL_REQUEST.md:36, IMPLEMENTATION_PLAN.md:193 |
| 44 | R7: DevOps | Git Version Control Initialization | Initializes clean git repository and commits all project files with `.gitignore` | Local project files | Git repository at `pawplay` | Ignores `.DS_Store`, `.vercel`, etc. | ORIGINAL_REQUEST.md:40, IMPLEMENTATION_PLAN.md:219 |
| 45 | R7: DevOps | Vercel MCP Automated Deployment | Deploys codebase to Vercel via Vercel MCP targeting domain `https://playpaw.vercel.app` | Vercel MCP credentials, team `team_i6w55Xr6YiuTbLK4AOxUv2le` | Production URL `https://playpaw.vercel.app` | Error logged and retried if API rate-limited | ORIGINAL_REQUEST.md:40, IMPLEMENTATION_PLAN.md:223 |
| 46 | R7: DevOps | Security & Service Worker Headers | `vercel.json` configuring `nosniff`, `DENY` framing, `strict-origin-when-cross-origin`, and `sw.js` cache-control | `vercel.json` config | HTTP response headers on production CDN | Validated against Vercel schema | IMPLEMENTATION_PLAN.md:229 |
| 47 | R7: DevOps | Standalone PWA Manifest | `manifest.json` with `"display": "standalone"`, `"orientation": "any"`, icons, and theme color | Browser PWA installation | Standalone full-screen window with zero tabs | Validated via DevTools Application tab | ORIGINAL_REQUEST.md:58, IMPLEMENTATION_PLAN.md:253 |
| 48 | R7: DevOps | Offline Service Worker | `sw.js` implementing cache-first strategy for offline feline play | Service worker install and fetch events | Cached shell and assets served offline | Updates on service worker byte change | ORIGINAL_REQUEST.md:68, IMPLEMENTATION_PLAN.md:253 |
| 49 | R8: QA | Autonomous "Build - View - Fix" Loop | Iterative build, DevTools browser inspection (`navigate_page`, `evaluate_script`, `take_screenshot`), and fix cycle | Live browser session | Inspected rendering, touch, audio, camera, and console | Fixes bugs proactively until 3-pass certified | ORIGINAL_REQUEST.md:42, IMPLEMENTATION_PLAN.md:260 |
| 50 | R8: QA | Strict 3-Pass Certification Standard | 3 consecutive, independent test passes with zero console warnings, zero errors, and flawless execution | Test execution runs 1, 2, and 3 | Final certification report | Resets pass count to 0 upon any failure | ORIGINAL_REQUEST.md:43, IMPLEMENTATION_PLAN.md:265 |
| 51 | R9: Docs | Mandatory Living Documentation Log | Continuous logging of all architectural upgrades, test run logs, and live deployment URLs in Section 9 of `PROJECT_PLAN.md` | New implementations, bug fixes, metrics | Updated `PROJECT_PLAN.md` Section 9 | Never ship code without updating docs | ORIGINAL_REQUEST.md:45, PROJECT_PLAN.md:278 |

---

## 4. Edge Cases

| # | Feature | Input / Condition | Observed / Required Behavior |
|---|---------|-------------------|-----------------------------|
| 1 | Multi-Touch Raycasting | Two paws striking simultaneously across two distinct screen regions | Raycasting must iterate over all active touches in `e.touches` independently; each line-segment tests intersection against all active prey circles without dropping touches. |
| 2 | High-Speed Paw Swipe | Lateral claw swipe jumping 250px in a single frame (e.g. from x:100 to x:350) | Line-segment intersection test `distancePointToSegment(prey.x, prey.y, prevX, prevY, currX, currY) <= radius + 42` guarantees catch registration, preventing discrete point tunneling. |
| 3 | Static Sitting-Paw Filter | Cat rests chin or resting paw on edge (<12px movement over 400ms) | Touch identified by `pointerId` is flagged `isResting = true`; continuous ripple spawning and catch collisions are suppressed for this pointer, while second swatting paw registers hits normally. |
| 4 | Sitting Paw Movement | Previously resting paw suddenly twitches or moves > 12px | `isResting` flag resets to `false`; touch returns to active swat detection instantly. |
| 5 | Annulus Exit Lock Early Release | User holds exit widget for 4.2 seconds then lifts finger | Clockwise filling stroke immediately cancels, resets progress to 0.0%, and widget fades back to faint opacity (~0.15); session does NOT end. |
| 6 | Annulus Exit Lock Accidental Tap | Cat swat taps or double-taps the exit icon for 50–150ms | Hold duration is < 8.0s; annulus fill barely registers (<2%) and instantly resets to 0%; game continues uninterrupted. |
| 7 | Tab Close Attempt (`beforeunload`) | Human or stray paw attempts to close tab or reload browser while `isPlaying = true` | `beforeunload` event handler intercepts with `e.preventDefault()` and `e.returnValue = ''`, triggering native browser modal: *"Changes that you made may not be saved."* |
| 8 | Tab Backgrounding (`visibilitychange`) | User switches to another tab or minimizes browser window | `document.visibilityState === 'hidden'` triggers immediate game pause and calls `audioCtx.suspend()`, preventing background battery drain and rogue audio squeaks. |
| 9 | Tab Foregrounding (`visibilitychange`) | User returns to PawPlay tab after switching away | Pause overlay is displayed with explicit "Resume Play" button; game does not instantly unpause into cat paws; `audioCtx.resume()` is called on human touch gesture. |
| 10 | Overscroll Pull-to-Refresh | Fast downward paw swipe along top edge of iPad Safari or Android Chrome | CSS `overscroll-behavior: none` suppresses pull-to-refresh reload and elastic canvas displacement. |
| 11 | Boundary Repulsion at Ludicrous Speed | Prey moving at maximum speed (950 px/s) diagonally towards corner margin | Repulsion field calculates inward vector; hard clamp `Math.max(SAFE_MARGIN_SIDES, Math.min(canvas.width - SAFE_MARGIN_SIDES, x))` guarantees prey never crosses safe margin boundaries even on frame drop. |
| 12 | 120Hz vs 60Hz Display Pacing | Device running at 120Hz ProMotion vs 60Hz standard screen vs 30Hz throttled mode | Velocity updates are multiplied by `dt = Math.min((now - lastTime)/1000, 0.05)`, ensuring identical physical travel speed in pixels/second across all refresh rates; dt cap at 0.05s prevents tunneling if animation freezes. |
| 13 | 12-Second Acoustic Lure Timer | No screen touch occurs for 12.0 seconds while prey is scurrying | System triggers 60ms high-pitch chirp/rustle and forces prey into `DART_SPRINT` across screen center; timer resets immediately upon any registered touch. |
| 14 | Rapid Catches in Succession | Multi-cat household catching 2 prey sprites within 200ms | Each prey instance transitions to `CAUGHT_RESPAWN` independently; each spawns its own particle burst; audio synthesizer handles overlapping voice nodes cleanly without clipping. |
| 15 | Camera Permission Denied | User denies camera access in browser prompt or device lacks front camera | Pounce-Cam engine catches `NotAllowedError` or `NotFoundError`, gracefully updates settings UI to indicate "Camera Unavailable", and disables snapshot capture without crashing game. |
| 16 | IndexedDB Quota / Private Browsing | Browser in Incognito/Private mode where IndexedDB may be restricted or full | Photo vault wraps `idb` operations in `try/catch`; if storage fails, captures are discarded gracefully and a non-intrusive warning is logged to console without breaking active gameplay. |
| 17 | Rapid Camera Triggers | Cat swats prey 3 times within 1 second while camera trigger is "Every Pounce" | Snapshot engine throttles frame capture with a 500ms debounce guard to prevent video frame buffer starvation and redundant writes. |
| 18 | Screen Wake Lock Release | OS automatically releases Screen Wake Lock when tab is minimized | System listens for `wakeLock.addEventListener('release')`; upon tab returning to foreground (`visibilityState === 'visible'`), re-requests wake lock automatically. |
| 19 | Fullscreen API Rejection | Fullscreen request rejected on iPhone Safari (where element fullscreen is unsupported) | `requestFullscreen()` wrapped in `Promise.catch()`; app gracefully proceeds using CSS 100vw/100vh standalone layout without halting execution. |
| 20 | First-Time Visit vs Reload | User visits site for first time (`pawplay_onboarded_v1` is null) vs subsequent visits | First visit displays full-screen 5-step onboarding walkthrough; tapping "Got It — Let's Play!" writes `'true'`; subsequent reloads immediately load Game Menu. |
| 21 | Corrupted LocalStorage | `localStorage` item `pawplay_state_v1` contains malformed JSON or is cleared | State loader wraps `JSON.parse` in `try/catch` and falls back to default settings object if parsing fails. |
| 22 | Session Timer Expiry During Stalk | Countdown timer hits 0:00 while prey is mid-sprint | Game state smoothly transitions to `ENDING`: prey decelerates off-screen, chime plays, summary statistics and photo thumbnail display, and owner treat prompt opens. |
| 23 | Offline Network Disconnect | Cat plays on tablet in car/airplane with no WiFi connection | Service Worker (`sw.js`) intercepts requests and serves cached static shell and assets from Cache Storage; game functions 100% offline. |
| 24 | Window Resize / Screen Rotation | Device rotated from portrait to landscape during active hunt | Resize handler updates canvas dimensions, recalculates responsive prey radius (`diag * 0.035`), and immediately re-clamps all active prey inside new `SAFE_MARGIN` boundaries. |

---

## 5. Comprehensive Feature Inventory & Acceptance Criteria (R1 – R9)

### R1. Engine, 120Hz Delta-Time Loop & Contrast Themes
* **Scope**: High-DPI canvas, uncapped `requestAnimationFrame`, delta-time normalization, 72px top/bottom and 48px side margins, 3 contrast themes (`Daylight Floor`, `Night Stalker`, `Koi Pond` with ripples), shockwave & particle VFX.
* **Explicit Acceptance Criteria**:
  - [ ] Canvas backing store resolution matches `Math.min(window.devicePixelRatio || 1, 2) * clientWidth/clientHeight` with zero CSS distortion.
  - [ ] Movement vectors are multiplied by `dt = Math.min((now - lastTime) / 1000, 0.05)`; prey moves at identical physical speeds on 60Hz and 120Hz displays.
  - [ ] During a 60-second automated simulation at *Apex* speed, no prey sprite coordinates `(x, y)` penetrate `y < 72`, `y > height - 72`, `x < 48`, or `x > width - 48`.
  - [ ] Switching between Daylight Floor (`#F4F1EA`), Night Stalker (`#10121A`), and Koi Pond (`#0A2239`) updates background canvas color immediately.
  - [ ] On the Koi Pond theme, touches spawn interactive expanding water ripples that smoothly fade out.
  - [ ] A pounce catch triggers a concentric shockwave ring and 18 burst particles in `#FFD600` (yellow) and `#00E5FF` (cyan).

### R2. 5-State Biomimetic Prey AI & High-Fidelity Sprites
* **Scope**: 5-state Markov FSM (`FREEZE_TREMOR`, `DART_SPRINT`, `STALK_CREEP`, `EDGE_SKITTER`, `CAUGHT_RESPAWN`), 5 high-fidelity transparent sprites (Bumblebee with animated wings, Scurrying Roach with cycling legs, Field Mouse with whipping tail, Koi Fish with spinal joints, Laser Dot with blur ribbon), 1–4 concurrent prey.
* **Explicit Acceptance Criteria**:
  - [ ] Prey state machine transitions dynamically between all 5 states with verified micro-jitter during `FREEZE_TREMOR` (`Math.sin(t*45)*1.5px`) and wall-hugging during `EDGE_SKITTER`.
  - [ ] High-fidelity sprites render with biological realism rather than crude single-color circles or rectangles.
  - [ ] Bumblebee displays oscillating wing fluttering; Roach displays 6 cycling legs; Mouse displays animated sinusoidal tail; Koi displays 3-joint spinal swimming motion.
  - [ ] Laser Dot displays `#FFFFFF` core, `#FFD600` yellow halo, `#0066FF` blue outer glow, and trailing ribbon.
  - [ ] Customization setting allows selecting 1, 2, 3, or 4 simultaneous prey sprites on screen.

### R3. Browser Tab Defense & 8-Second Annulus Exit Lock
* **Scope**: Multi-touch raycast swipe detection (+42px paw pad tolerance), static resting-paw filter (<12px over 400ms), `beforeunload` interceptor, `overscroll-behavior: none`, `visibilitychange` auto-pause & Web Audio mute, 8-second clockwise annulus exit lock with reset on early release.
* **Explicit Acceptance Criteria**:
  - [ ] Continuous pointer drag across prey circle triggers a hit via line-segment intersection with `radius + 42px` tolerance.
  - [ ] A stationary touch held in place (<12px over 400ms) does not trigger continuous pounce hits and does not block a second swatting touch from catching prey.
  - [ ] Attempting to close or reload the browser tab while `isPlaying === true` triggers the browser confirmation dialog via `beforeunload`.
  - [ ] CSS `overscroll-behavior: none` is set on `html, body, canvas`, preventing pull-to-refresh on mobile browsers.
  - [ ] Switching away from the tab triggers `visibilitychange`, pausing gameplay, muting Web Audio, and requiring an explicit unlock to resume.
  - [ ] Exit widget in the corner is rendered faintly (opacity ~0.15).
  - [ ] Releasing the exit lock touch before 8.0 seconds resets progress immediately to 0.0%; completing an uninterrupted 8.0-second hold ends the session smoothly.

### R4. Procedural Web Audio API Synthesizer & Acoustic Lures
* **Scope**: Singleton `AudioContext`, FM rodent squeaks, bandpass bug clicks, resonant water splashes, 12-second idle acoustic lure system, Android haptics `[30, 20, 40]`.
* **Explicit Acceptance Criteria**:
  - [ ] Zero external audio files are loaded over the network; all audio is procedurally synthesized via Web Audio API.
  - [ ] Mouse catch produces FM-modulated squeak (`4800Hz -> 2600Hz -> 3900Hz` over 110ms with 45Hz vibrato).
  - [ ] Bug catch produces bandpass white noise burst (`5200Hz`, `Q = 3.5`, 25ms pulses).
  - [ ] Koi catch produces resonant water splash (`1200Hz -> 280Hz` + droplet bend `600Hz -> 1400Hz`).
  - [ ] When no touch is registered for 12 seconds, the system emits an acoustic lure chirp and synchronizes a prey sprint.
  - [ ] Android devices trigger vibration pulse `navigator.vibrate([30, 20, 40])` on catch where supported.

### R5. First-Time Fullscreen Onboarding & Customization Deck
* **Scope**: 5-step onboarding walkthrough carousel on `!localStorage.getItem('pawplay_onboarded_v1')`, human customization deck (prey, count 1–4, speeds Kitten/Hunter/Apex/Ludicrous, sizes Tiny/Normal/Chonky, volume, haptics, themes, timers 1m/3m/5m/Unlimited), Screen Wake Lock API, anti-frustration "Complete the Hunt" treat modal.
* **Explicit Acceptance Criteria**:
  - [ ] On first visit, full-screen onboarding carousel displays covering Stability, Tab Defense, Feline Vision/Sound, Pounce-Cam, and Treat Reminder.
  - [ ] Dismissing the walkthrough writes `pawplay_onboarded_v1 = 'true'` in `localStorage`; subsequent reloads open directly into Game Menu.
  - [ ] Walkthrough can be re-opened anytime from Game Menu via "❓ Guide" button.
  - [ ] Customization Deck controls prey type, count (1–4), speed (Kitten, Hunter, Apex, Ludicrous), size (Tiny, Normal, Chonky), and theme.
  - [ ] Session timer functions for 1 min, 3 min, 5 min, and Unlimited modes.
  - [ ] Screen Wake Lock API is requested upon session start and re-acquired on tab return.
  - [ ] When session timer expires, prey decelerates off-screen, chime plays, summary stats display, and "Complete the Hunt" physical treat prompt appears.

### R6. "Pounce-Cam" Reaction Snapshot Engine
* **Scope**: Front camera access via `getUserMedia`, settable triggers (On Catch, On Near-Miss, Every Pounce, Disabled), offscreen frame grab with retro timestamp and PawPlay badge watermark, client-side IndexedDB vault, human photo gallery modal.
* **Explicit Acceptance Criteria**:
  - [ ] Camera toggle requests front-facing camera (`facingMode: 'user'`); handles permission denial cleanly.
  - [ ] Offscreen video stream captures frame when active trigger condition is met (On Catch, On Near-Miss, Every Pounce).
  - [ ] Captured frame is rendered to offscreen canvas with retro digital timestamp and "PawPlay Catch!" watermark badge.
  - [ ] Snapshots are saved to IndexedDB (`pawplay_photos`) as Blobs without hitting localStorage 5MB size limits.
  - [ ] Human Photo Gallery modal displays saved snapshots in a grid with image download and delete capabilities.

### R7. Automated Vercel MCP Deployment (playpaw.vercel.app)
* **Scope**: Git initialization and commit, Vercel MCP deployment targeting `playpaw.vercel.app` (team `team_i6w55Xr6YiuTbLK4AOxUv2le`), `vercel.json` security/caching headers, PWA `manifest.json` (`display: standalone`), `sw.js` cache-first service worker.
* **Explicit Acceptance Criteria**:
  - [ ] Git repository initialized, `.gitignore` created, and all application files committed.
  - [ ] Code deployed to Vercel via Vercel MCP under team `team_i6w55Xr6YiuTbLK4AOxUv2le` with production URL resolving at `https://playpaw.vercel.app`.
  - [ ] `vercel.json` applies `nosniff`, `DENY` framing, `strict-origin-when-cross-origin`, and `sw.js` no-cache headers.
  - [ ] `manifest.json` specifies `"display": "standalone"`, `"orientation": "any"`, application name, and icons.
  - [ ] Service worker (`sw.js`) installs and caches static assets for offline play.

### R8. Autonomous "Build - View - Fix" Quality Loop & 3-Pass Rule
* **Scope**: Repeated Build -> View (Chrome DevTools MCP: `navigate_page`, `evaluate_script`, `take_screenshot`, `list_console_messages`) -> Fix cycle until 3 consecutive test passes show zero bugs and zero warnings.
* **Explicit Acceptance Criteria**:
  - [ ] All pages and interactions are visually inspected using Chrome DevTools MCP across mobile and desktop viewports.
  - [ ] Console message logs inspected; zero uncaught exceptions, zero console errors, zero warnings.
  - [ ] 3 full, independent test passes completed consecutively before certification.

### R9. Continuous Project Documentation Directive
* **Scope**: Record all upgrades, architectural decisions, test run logs, and live deployment URLs in Section 9 of `PROJECT_PLAN.md`.
* **Explicit Acceptance Criteria**:
  - [ ] Section 9 of `PROJECT_PLAN.md` is updated with complete implementation details, performance metrics, and verified production URL.
  - [ ] Markdown documentation reflects current codebase reality with zero stale instructions.

---

## 6. Caveats

1. **Physical Claw Hardware Limitation**: Claws are made of non-conductive keratin and cannot register capacitive touch. Only the conductive fleshy paw pad ("toe beans") triggers touch events. This is an unavoidable physical constant of capacitive screens, properly mitigated by the expanded `+42px` hit tolerance and continuous raycasting.
2. **iOS Standalone Fullscreen**: Mobile Safari on iOS does not support the Fullscreen API on arbitrary HTML elements (`document.documentElement.requestFullscreen`). Fullscreen without browser chrome on iOS requires adding the PWA to the Home Screen (`"display": "standalone"`). This is addressed by the Onboarding Walkthrough and Guided Access guide.
3. **Audio Autoplay Policy**: Web browsers require a user gesture before starting or resuming an `AudioContext`. Starting audio on the initial human "Start Playing" click satisfies this requirement.
4. **Camera Permissions**: Camera access requires an explicit human permission grant via browser prompt and requires HTTPS. Vercel deployment provides mandatory HTTPS.

---

## 7. Conclusion

The specification survey is complete and authoritative. PawPlay's transformation from a basic single-file prototype into an enterprise-grade, biologically calibrated feline web application requires implementing modular components spanning 6 workstreams:
- Core 120Hz dt-normalized canvas engine with 72px/48px defense margins and 3 contrast themes.
- 5-state Markov biomimetic prey AI and high-fidelity dichromatic sprites (#FFD600, #0077FF).
- Capacitive raycast swipe detection (+42px tolerance) and resting-paw filter (<12px over 400ms).
- Complete Browser Tab Defense Shield (`beforeunload`, `overscroll-behavior: none`, `visibilitychange` auto-pause/mute, and 8-second clockwise annulus exit lock).
- Procedural Web Audio API synthesizer (FM squeak, bug click, splash, 12s idle lure).
- First-time 5-step fullscreen onboarding walkthrough and deep customization deck.
- Pounce-Cam reaction snapshot engine with IndexedDB storage and human gallery.
- Standalone PWA manifest and offline cache-first service worker.
- Automated Vercel MCP deployment targeting `https://playpaw.vercel.app`.
- Autonomous 3-pass DevTools verification loop and documentation updates in `PROJECT_PLAN.md`.

All requirements (R1–R9), 51 discrete features, 24 edge cases, and explicit acceptance criteria are fully documented and ready for implementation.

---

## 8. Verification Method

To independently verify these findings and acceptance criteria:

1. **Verify Authoritative Files**:
   ```bash
   test -f /Users/buianhuy/.gemini/antigravity/scratch/pawplay/.agents/teamwork/ORIGINAL_REQUEST.md && echo "ORIGINAL_REQUEST.md OK"
   test -f /Users/buianhuy/.gemini/antigravity/scratch/pawplay/PROJECT_PLAN.md && echo "PROJECT_PLAN.md OK"
   test -f /Users/buianhuy/.gemini/antigravity/scratch/pawplay/IMPLEMENTATION_PLAN.md && echo "IMPLEMENTATION_PLAN.md OK"
   ```
2. **Inspect Existing Prototype Gaps**:
   ```bash
   grep -n "requestAnimationFrame" /Users/buianhuy/.gemini/antigravity/scratch/pawplay/index.html
   grep -n "beforeunload" /Users/buianhuy/.gemini/antigravity/scratch/pawplay/index.html || echo "beforeunload missing in prototype"
   grep -n "overscroll-behavior" /Users/buianhuy/.gemini/antigravity/scratch/pawplay/index.html || echo "overscroll-behavior missing in prototype"
   grep -n "IndexedDB" /Users/buianhuy/.gemini/antigravity/scratch/pawplay/index.html || echo "IndexedDB missing in prototype"
   grep -n "pawplay_onboarded_v1" /Users/buianhuy/.gemini/antigravity/scratch/pawplay/index.html || echo "onboarding flag missing in prototype"
   ```
3. **Invalidation Conditions**:
   - If user requirements R1–R9 are modified in `ORIGINAL_REQUEST.md`.
   - If target domain `playpaw.vercel.app` or team ID changes.
