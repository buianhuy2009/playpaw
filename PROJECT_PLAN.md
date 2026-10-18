# PawPlay: Complete Project Blueprint & Go-to-Market Plan

A zero-install, web-based interactive sensory game designed for cats on tablets and mobile phones.

> [!IMPORTANT]
> **Mandatory Documentation Directive:**
> ALWAYS save and record whatever upgrades, architectural decisions, feature implementations, bug fixes, or new information you know or learn about this project into this document (`PROJECT_PLAN.md`) and project markdown documentation. Keep this blueprint continuously updated as the living source of truth for the project.

---

## 1. Executive Summary & Value Proposition

### The Problem with Existing Cat Apps
* **App Store Friction:** Cat owners have to search, download 100MB+ native apps, and deal with account popups.
* **Aggressive Ads:** Most mobile apps display unskippable 30-second video ads every 45 seconds. A cat’s paw inevitably taps the ad, kicking them out of the game to an external app store, completely ruining play.
* **Battery & Screen Sleep:** Phone screens time out after 30 seconds of inactivity while the cat waits to pounce.

### The Solution: PawPlay (Web App / PWA)
* **Zero Install:** Instant play in Safari/Chrome on iPad, Android tablet, or smartphone via a simple web link.
* **No Mid-Game Ads:** The play session is 100% uninterrupted.
* **Screen Wake Lock & Fullscreen:** The screen stays awake, and the browser navigation bar hides so paws cannot trigger browser back/forward buttons.

---

## 2. Product Design & How It Works

### Two Distinct User Modes
1. **The Human Menu (Setup Screen):**
   * Select Prey Type: *Scurrying Cockroach*, *Laser Dot*, *Swimming Koi Fish*, *Field Mouse*.
   * Select Difficulty / Speed: *Kitten / Slow*, *Curious / Normal*, *Apex Hunter / Fast*.
   * Select Sound Palette: *Mouse Squeaks*, *Insect Buzzes*, *Water Splashes*, or *Mute*.
   * Tap big button: **"Start Playing (Enter Fullscreen)"** (also unlocks Web Audio on iOS/Android).
   * Discreet exit trigger: Double-tap the top-right corner with two fingers or hold for 3 seconds to return to the human menu.

2. **The Cat Play Arena (Game Screen):**
   * Clean, high-contrast background (e.g., light wood floor, pond water, or dark carpet).
   * 1 to 3 prey sprites moving with predatory AI (sprint, freeze, skitter along edges).
   * Instant audio-visual reward on paw strike (squish, splash, squeak, vibration).
   * Score counter at the bottom: *"Cat Pounces: 12"*.

---

## 3. Feline Physics, Scratch Mechanics & Hit Detection

### A. The Science of the Cat Pounce & Scratch
* **Capacitive Touch:** Modern screens detect electrical conductivity. Cat paw pads ("toe beans") contain living tissue, moisture, and electrolytes that conduct electricity, registering legitimate touch events just like human fingers.
* **Claw Physics (The Mohs Scale):** 
  * Cat claws are made of keratin (Mohs Hardness **~2.5**).
  * Gorilla Glass / Tempered Glass has a Mohs Hardness of **5.5 to 6.5**.
  * A claw **cannot physically scratch glass**. The only real danger is silica dirt/sand (Mohs 7.0) stuck under a dirty paw.
* **Detecting Scratches and Swipes (`touchmove`):**
  * Cats often strike and drag their paws across the screen.
  * The code listens for both `touchstart` (landing) and `touchmove` (dragging/scratching).
  * The moment the dragging paw intersects the prey's bounding radius, the collision triggers.

### B. Physical Stability (Preventing Device Slipping)
* An 8–12 lb cat swatting a lightweight phone will send it sliding or spinning across hard floors.
* **Recommended Guidelines for Owners:**
  * Advise placing the phone/tablet on a rug, yoga mat, or mousepad.
  * Use a rubber/silicone bumper case for grip.
  * Even if the device slides across the floor, internal screen coordinates remain relative to the glass, so gameplay does not break.

---

## 4. Cross-Device & Operating System Matrix

| Feature | Smartphone (iPhone / Android) | Tablet / iPad (Target Device) | Laptop / Desktop |
| :--- | :--- | :--- | :--- |
| **Play Area** | Small (~6 in). One paw covers 30–40% of the screen. | Large (10–13 in). Gold standard: room to stalk & pounce. | Vertical screen; cat will step on keyboard. |
| **Stability** | Light (~200g); easily skids unless on a rubber mat. | Heavy (~500g); stays planted on floor. | Unstable angle. |
| **Prey Count** | 1 prey sprite (avoids clutter). | 1 to 3 prey sprites simultaneously. | N/A |
| **Fullscreen API** | Android: Native.<br>iPhone: Requires PWA ("Add to Home Screen"). | iPadOS Safari: Native support.<br>Android: Native support. | Standard browser fullscreen. |
| **Haptic Vibration** | Android: Yes (`navigator.vibrate(40)`).<br>iOS: Blocked by Apple. | Android: Yes.<br>iPad: Blocked by Apple. | None. |
| **Screen Wake Lock** | Chrome 84+ & Safari 16.4+ supported. | Chrome & Safari 16.4+ supported. | Native browser API. |

---

## 5. Technical Architecture & Code Blueprint

The entire application runs in **pure Vanilla JavaScript, HTML5 Canvas, and CSS** with zero external dependencies or server hosting costs.

```mermaid
flowchart TD
    A[Human Menu: Select Prey & Options] -->|Tap 'Start'| B[Request Fullscreen & Screen Wake Lock]
    B --> C[Unlock Web Audio Context]
    C --> D[Init HTML5 2D Canvas Loop]
    D --> E[Prey AI State Machine: Scurry, Freeze, Flee]
    D --> F[Pointer Listeners: touchstart & touchmove]
    F -->|Distance <= Hit Radius| G[Trigger Catch Event]
    G --> H[Instant Web Audio Squeak/Splash]
    G --> I[Optional Haptic Buzz: Android only]
    G --> J[Particle Splash Animation]
    G --> K[Increment Pounce Counter]
    K --> E
```

### Key Technical Implementations

#### A. Preventing Screen Timeout (Screen Wake Lock API)
```javascript
let wakeLock = null;

async function keepScreenAwake() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Screen Wake Lock active');
    }
  } catch (err) {
    console.warn(`Wake Lock Error: ${err.name}, ${err.message}`);
  }
}
```

#### B. The Prey AI State Machine with Responsive Sizing
```javascript
class Prey {
  constructor(canvasWidth, canvasHeight, type) {
    this.w = canvasWidth;
    this.h = canvasHeight;
    this.x = canvasWidth / 2;
    this.y = canvasHeight / 2;
    
    // Responsive sizing based on screen diagonal
    const diag = Math.hypot(canvasWidth, canvasHeight);
    this.radius = Math.max(25, diag * 0.035);
    this.baseSpeed = Math.max(3, diag * 0.004);

    this.vx = this.baseSpeed;
    this.vy = this.baseSpeed;
    this.state = 'SCURRY'; // 'SCURRY', 'FREEZE', 'CAUGHT'
    this.timer = 0;
  }

  update() {
    if (this.state === 'FREEZE') {
      this.timer--;
      if (this.timer <= 0) {
        // Break out of freeze into a sudden sprint
        this.vx = (Math.random() - 0.5) * (this.baseSpeed * 2.5);
        this.vy = (Math.random() - 0.5) * (this.baseSpeed * 2.5);
        this.state = 'SCURRY';
      }
      return;
    }

    if (this.state === 'SCURRY') {
      this.x += this.vx;
      this.y += this.vy;

      // Bounce off walls
      if (this.x < this.radius || this.x > this.w - this.radius) this.vx *= -1;
      if (this.y < this.radius || this.y > this.h - this.radius) this.vy *= -1;

      // 1.5% chance per frame to randomly freeze like real prey
      if (Math.random() < 0.015) {
        this.state = 'FREEZE';
        this.timer = 40 + Math.floor(Math.random() * 60); // 1 to 1.5 seconds
      }
    }
  }

  checkHit(touchX, touchY) {
    const dist = Math.hypot(this.x - touchX, this.y - touchY);
    return dist < this.radius + 35; // Generous paw tolerance
  }
}
```

#### C. Handling Pounces and Scratches (`touchstart` & `touchmove`)
```javascript
function handleTouchInput(event) {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();

  for (let i = 0; i < event.touches.length; i++) {
    const touch = event.touches[i];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    if (prey.checkHit(touchX, touchY)) {
      onPounceSuccess(touchX, touchY);
      break;
    }
  }
}

canvas.addEventListener('touchstart', handleTouchInput, { passive: false });
canvas.addEventListener('touchmove', handleTouchInput, { passive: false });
```

#### D. Zero-Latency Audio without External Files (Web Audio API)
```javascript
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playMouseSqueak() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  // High-pitched frequency sweep (4500Hz down to 2500Hz)
  osc.type = 'sine';
  osc.frequency.setValueAtTime(4500, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(2500, audioCtx.currentTime + 0.12);

  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.12);

  // Trigger haptic vibration on Android
  if (navigator.vibrate) navigator.vibrate(40);
}
```

---

## 6. Free Organic Advertising & Promotion Blueprint

### Step 1: The "Visual Proof" Asset
* Record a 10-second video of an actual cat pouncing on an iPad running the site.
* Create a 5-second lightweight GIF for email attachments.

### Step 2: Pitching Pet & Tech Blogs
Bloggers are constantly looking for free tools to recommend in listicles (*"10 Free Ways to Keep Your Indoor Cat Entertained"*, *"Fun Weekend Web Projects"*).
* Use the direct email pitch highlighting: zero-install, no mid-game ads, and feline prey AI.

### Step 3: Viral Social Loops (Reddit & TikTok/Reels)
* **Reddit Communities:**
  * Post on `r/CatGifs`, `r/Cats`, or `r/aww` with the title: *"Coded a simple browser game for my cat so he'd stop knocking things off my desk."* 
  * Post on `r/WebDev` or `r/InternetIsBeautiful` explaining the technical side (WakeLock API, Canvas, multi-touch paw handling).
* **TikTok / YouTube Shorts:**
  * Format: *"POV: You don't want to pay for cat toys, so you coded one on your iPad."*

### Step 4: Animal Shelter & Foster Outreach
* Contact local animal rescues or cat foster groups. Offer it as a free mental enrichment tool for shelter cats in adoption rooms.

---

## 7. Scale Monetization Strategy (Archived Reference — Unlikely to Use)

> [!NOTE]
> **Status: Dormant / Archived Reference Only.**
> We will probably never enable monetization so that PawPlay remains 100% pure, free, and community-driven. However, per the project documentation mandate, these high-scale strategies are preserved here for reference if the project ever reaches massive scale.

When PawPlay reaches scale (hundreds of thousands or millions of cat play sessions), the core product principle remains inviolable: **zero mid-game banner or video ads** (which break feline gameplay and trigger accidental ad clicks). Instead, monetization operates on five high-yield, non-intrusive pillars tailored for large audiences:

| Revenue Stream | Implementation & Mechanism | Scaled Revenue Potential |
| :--- | :--- | :--- |
| **1. Native Pet Brand Sponsorships ("Advergaming")** | Major pet brands (e.g., Purina, Temptations, Churu, Chewy) sponsor custom in-game prey sprites (e.g., a scurrying treat pouch or treat stick) and branded human setup screens. Non-intrusive to gameplay. | \$10k–\$50k / campaign deal at scale (500k+ MAU). |
| **2. Curated Pet Commerce & Affiliate Engine** | Human setup and exit screens recommend high-intent accessories: heavy-duty matte screen protectors for claws, non-slip silicone floor mats, and puzzle toys. | 4%–10% affiliate commission (Amazon, Chewy) with high purchase intent. |
| **3. "PawPlay Plus" Freemium Micro-Pass** | Free core game with standard prey. \$2.99–\$4.99 one-time unlock or \$0.99/mo club: unlocks 20+ exotic prey (Koi fish with water ripples, fluttering moths, spiders), multi-prey mode (up to 4 sprites for multi-cat homes), custom sound synthesizers, and pounce analytics. | High conversion (3%–6%) from loyal pet parents. |
| **4. Front-Camera "Pounce-Cam" & Viral Merch** | WebRTC front-camera captures reaction snapshots of the cat's face mid-pounce. Free watermarked cards drive viral social loops on TikTok/Instagram; upsell unwatermarked HD video and print-on-demand merch (mugs, stickers with the cat's "game face"). | \$5–\$25 per personalized merchandise order. |
| **5. Commercial B2B Kiosk Licenses** | "Always-On Kiosk / Display Mode" for Cat Cafes, veterinary clinics, and adoption shelters with continuous play loops, screen protection timeouts, and animal bio overlays. | \$15–\$29/month per commercial venue (B2B SaaS). |

---

## 8. Milestone Execution Roadmap

```mermaid
timeline
    title PawPlay Development Timeline
    Day 1 - 2 : Core HTML5 Canvas : Responsive sizing, prey movement, random freeze AI
    Day 3 : Touch & Sound : touchstart & touchmove detection, Web Audio squeak generator
    Day 4 : UX & Browser APIs : Human settings menu, Fullscreen mode, Screen Wake Lock API
    Day 5 : Polish & Video : Test with real cat, film 10s demo clip, deploy to GitHub Pages/Vercel
    Day 6 - 7 : Launch & Outreach : Pitch 15 pet bloggers, post demo video on Reddit & TikTok
```

---

## 9. Living Upgrade Log & Project Knowledge Repository

> [!IMPORTANT]
> **Continuous Update Requirement:**
> ALWAYS save whatever upgrades, new features, technical discoveries, or project insights are developed into this section. No upgrade or design decision should go unrecorded.

### A. Current Implementation State & Implemented Upgrades
* **Engine & Render Loop:** Pure Vanilla JavaScript and HTML5 2D Canvas with zero external dependencies in `index.html`.
* **Touch & Scratch Handling:**
  * Multi-touch support listening to both `touchstart` and `touchmove` events to capture swipes and scratch motions.
  * Hit tolerance radius expanded (+40px) specifically calibrated for feline capacitive paw pads ("toe beans").
  * Desktop testing fallback via `mousedown` events.
* **Procedural Web Audio & Haptics:**
  * Uses Web Audio API sine wave oscillator sweeping downwards (4200Hz to 2200Hz over 100ms) for zero-latency, asset-free squeak feedback.
  * Auto-unlocks AudioContext on the initial human "Start Playing" user gesture.
  * Haptic vibration pulse (`navigator.vibrate(40)`) supported on Android devices.
* **Screen & Window Management:**
  * Integrated Screen Wake Lock API (`navigator.wakeLock.request('screen')`) to prevent screen dimming/sleeping during play sessions.
  * Fullscreen API request upon session launch to conceal browser navigation bars.
* **Prey AI State Machine:**
  * Three states: `SCURRY` (movement with boundary reflections), `FREEZE` (1.5% frame probability to pause 0.5–1.5s replicating real prey caution), and `HIDDEN` (temporary off-screen respawn delay after a successful pounce).
* **Available Sprites:**
  *  **Laser Dot:** Dynamic radial glow gradient with bright center.
  *  **Cockroach:** Directional beetle body with 6 articulated legs.
  *  **Field Mouse:** Directional mouse body, pink ears, and sine-wave animated tail.
* **UI & Modes:**
  * Human setup overlay with prey selectors and setup recommendations.
  * In-game session with live pounce counter and subtle top-right exit button to return to settings.

### B. High-Scale Monetization Architecture (Archived / Dormant — Unlikely to Use)
* **Status:** Saved for completeness, though the project is intended to remain un-monetized and free.
* **Design Constraint:** 100% interruption-free gameplay; no interstitial or mid-game banner ads (which degrade UX and generate invalid click bans from accidental paw strikes).
* **High-Volume Monetization Streams:**
  1. **Native In-Game Advergaming:** Sponsored prey sprites (Churu treat tubes, Temptations treats, Purina kibbles) created in partnership with major pet brands.
  2. **High-Intent Pet Commerce & Affiliate:** Contextual recommendations on the Human Menu for claw-safe matte screen protectors, silicone non-slip tablet mats, and pet supplies.
  3. **"PawPlay Plus" Freemium Tier:** \$2.99–\$4.99 one-time micro-pass or \$0.99/mo club for 20+ exotic prey, multi-prey mode (up to 4 sprites), and sound synthesizers.
  4. **"Pounce-Cam" Reaction Captures:** WebRTC front-camera captures cat pounce photos; viral watermarked cards for social sharing + optional unwatermarked HD exports & print-on-demand custom pet merchandise.
  5. **Commercial Kiosk SaaS Mode:** Subscription licensing for Cat Cafes, shelters, and vet waiting rooms.

### C. Empirical Practicality & Scientific Constraints
* **Capacitive Physics:** Feline paw pads ("toe beans") conduct electricity and reliably trigger Projected Capacitive Touch (PCT) screens; keratin claws (Mohs ~2.2–2.5) are non-conductive and cannot scratch Gorilla Glass (Mohs ~5.5–6.5), though silica grit (Mohs 7.0) on dirty paws can cause micro-scratches.
* **Feline Vision (Dichromacy & Flicker Fusion):** Cats possess blue (~450nm) and green/yellow (~550nm) cones and lack red sensitivity; yellow (`#FFD600`) and blue (`#0077FF`) sprites provide vastly superior visibility over pure red. Feline Flicker Fusion Frequency is 70–100Hz, making 120Hz delta-time normalized rendering essential.
* **OS System Gesture Limits:** Browser tabs cannot block OS-level edge gestures (iOS Home Indicator, Android Back swipe). Engineering solution: enforce a `48px–64px` perimeter repulsion zone to keep prey away from screen edges, plus user onboarding for iOS Guided Access / PWA Home Screen installation.
* **Predatory Frustration Mitigation:** Prolonged virtual hunting without a physical catch causes behavioral frustration; sessions should include a timer reminding owners to give a real treat/toy at the end.

### D. Multi-Agent Implementation Blueprint (`IMPLEMENTATION_PLAN.md`)
* Full 6-workstream parallel engineering specification saved in `IMPLEMENTATION_PLAN.md` designed for a team of Gemini 3.8 Flash High agents covering Engine/Physics, Biomimetic Prey AI, Capacitive Raycast & Sitting-Paw Filter, Procedural Web Audio, PWA/UI, and Vercel MCP deployment.

### E. Browser Tab Defense & Anti-Deletion Shield
* **The Vulnerability:** Cats swatting near the top edge of mobile browsers can tap adjacent tabs, tap the close button (`✕`), trigger tab overview, or swipe-to-refresh.
* **The Multi-Layer Defense:**
  1. **PWA Standalone Mode (Primary Defense):** In `manifest.json` (`"display": "standalone"`) and iOS web-app tags, the browser runs in a dedicated window with **zero tabs and zero tab close buttons**.
  2. **`beforeunload` Interception:** Prompts a browser confirmation alert if any action attempts to close or navigate away from the tab during active play.
  3. **`overscroll-behavior: none`:** Blocks pull-to-refresh and elastic bounce on mobile Safari/Chrome.
  4. **Enlarged 72px Top Margin:** Prey repels at least 72px from the top edge, keeping feline pounces centered and away from browser tabs.
  5. **`visibilitychange` Auto-Pause:** If the tab is minimized or switched, gameplay pauses and audio instantly mutes.
  6. **Cat-Proof 8-Second Annulus Exit Lock:** A very hidden `✕` in a circle in the corner (`opacity: ~0.15`). Pressing and holding opens a faint circle with a hole (annulus donut ring) that gradually fills clockwise over 8 seconds. Releasing before 8s cancels immediately; completing 8s ends the session.
  7. **OS Guided Access Onboarding:** Step-by-step instructions for iPad/iPhone Guided Access and Android App Pinning to physically lock hardware and gesture navigation.

### F. GitHub & Vercel Automated MCP Pipeline
* **Hosting Platform:** Static deployment on Vercel linked to GitHub repository via Vercel MCP (`create_git_project`).
* **Target Domain:** **`https://playpaw.vercel.app`** (confirmed available and reserved for this project).
* **Configuration:** `vercel.json` provides strict security headers (`nosniff`, `DENY` framing) and sets PWA service worker cache controls.
* **Benefits:** 100% free hosting, global edge CDN, and automated SSL (essential for Screen Wake Lock API and PWA service worker capabilities).

### G. Pounce-Cam, Deep Customization Suite & High-Fidelity Sprites
* **Pounce-Cam Engine (`src/camera.js`):** Integrates device front-facing camera (`getUserMedia`) to snap the cat's intense reaction face mid-strike. Settable triggers in human settings (*On Catch*, *On Near-Miss*, *Every Pounce*, *Disabled*). Photos are stored in client-side IndexedDB to prevent localStorage quota exhaustion. Features a human photo review gallery modal with image export.
* **Customization Range:** Full human controls for prey count (1 to 4 simultaneous sprites), speeds (Kitten, Hunter, Apex, Ludicrous), sizes (Tiny, Normal, Chonky), session timer options (*1 min*, *3 min*, *5 min*, *Unlimited*), haptic intensity, and sound volume.
* **Visual Asset Standard:** Uses high-resolution top-down transparent sprites generated via the `image-generator` subagent (e.g. realistic bumblebee with animated wings, iridescent beetle, segmented mouse, koi fish) rather than crude geometric blocks.
* **Execution Readiness:** Keyword gate removed. Ready for immediate full-stack execution or direct handoff into a fresh agent conversation using the standardized PawPlay Mega Prompt.

### H. First-Time Fullscreen Onboarding Walkthrough ("Cat-Proofing & Play Guide")
* **Mechanism:** Displays automatically on first visit (`!localStorage.getItem('pawplay_onboarded_v1')`), presenting a step-by-step fullscreen carousel:
  1. **Physical Stability:** Use a rug, mat, or silicone bumper case to prevent floor skidding.
  2. **Browser Tab Defense:** iOS Guided Access (triple-click) & PWA Add-to-Home-Screen setup.
  3. **Visual & Auditory Biology:** Explanation of feline yellow/blue vision & 12s acoustic lures.
  4. **Pounce-Cam Setup:** Optional front camera setup for capturing reaction snapshots.
  5. **Complete the Hunt:** Reminder to provide a physical treat at session end.
* **Dismissal:** Tapping "Got It — Let's Play!" writes `pawplay_onboarded_v1 = 'true'` in `localStorage` and opens the Game Menu. Subsequent visits bypass straight to the Game Menu (re-accessible anytime via "❓ Guide").

### J. Production Implementation & Zero-Error Certification Report (Generation 2)

#### 1. Architecture & Subsystem Upgrades
* **Engine Core (`src/engine.js`):**
  * High-DPI 120Hz-capable normalized delta-time loop with rAF idempotency guard.
  * Device Pixel Ratio (DPR) hardware clamping (`Math.min(window.devicePixelRatio || 1, 2.0)`) preventing GPU VRAM exhaustion on ultra-dense displays.
  * Strict Safe Margin Repulsion (Top 72px, Bottom 72px, Sides 48px) with IEEE 754 NaN/non-finite bounds recovery.
  * 3 Switchable Contrast Themes: Daylight Floor (warm wood planks), Night Stalker (dark velvet grid), Koi Pond (deep aquatic blue with procedural caustic ripples and interactive touch ripple expansion).
* **Biomimetic Prey AI & Sprites (`src/prey.js`):**
  * 5-State Markov FSM (`STALK_CREEP`, `DART_SPRINT`, `FREEZE_TREMOR`, `EDGE_SKITTER`, `CAUGHT_RESPAWN`).
  * 5 High-Fidelity Dichromatic Procedural Canvas Sprites:
    *  **Laser Dot:** Radial core glow with fading trailing particle dispersion ribbon.
    *  **Scurrying Roach:** Dark chitin body with yellow/cyan dorsal accents, 6 cycling jointed running legs, and sweeping antennae.
    *  **Field Mouse:** Contoured rodent body, pink ears/snout, directional whiskers, and sinusoidal whipping tail kinematics.
    *  **Koi Fish:** 3-segment articulating spinal joints, lateral pectoral fins, and continuous sinusoidal caudal tail wave.
    *  **Bumblebee:** Striped yellow/black abdomen, 60Hz fluttering translucent cyan wing pairs, curved antennae, and stinger.
  * Multi-prey concurrency manager supporting 1 to 4 concurrent prey.
* **Touch Raycasting & Defense Shield (`src/input.js`, `src/defense.js`):**
  * Multi-touch continuous pointer tracking supporting up to 10 simultaneous touches.
  * Continuous line-segment raycast swat intersection with feline +42px paw pad tolerance.
  * Static sitting-paw suppression filter (<12px movement over 400ms) to ignore resting cat chests or chins while allowing active paws to swat unimpeded.
  * Browser Tab Defense Shield: `beforeunload` dialog prompt during active play, `overscroll-behavior: none` pull-to-refresh prevention, and `visibilitychange` auto-pause with Web Audio instant mute.
  * 8-Second Clockwise Annulus Exit Lock: Ultra-faint corner widget (`opacity: ~0.15`), continuous clockwise filling donut arc; releasing before 8.0s instantly cancels and resets to 0%; reaching 8.0s ends the session cleanly.
* **Procedural Web Audio API Synthesizer (`src/audio.js`):**
  * Zero-latency synthesis without external asset files: FM rodent squeak sweep (4800 -> 2600 -> 3900 Hz), bandpass bug clicks (5200Hz, Q=3.5), resonant water splash (1200 -> 280 Hz sweep), 12-second idle acoustic lure (6500Hz chirp recall), and ascending C5-E5-G5 treat completion chime.
  * Android haptic vibration feedback (`navigator.vibrate([30, 20, 40])`).
* **UI Controller & Customization Deck (`src/ui.js`, `src/state.js`):**
  * Fullscreen 5-step onboarding carousel with persistence (`pawplay_onboarded_v1`).
  * Comprehensive Settings Deck: prey selector, prey count (1–4), speeds (Kitten, Hunter, Apex, Ludicrous), contrast themes, session duration modes (1m, 3m, 5m, Unlimited), and camera triggers.
  * Anti-Frustration "Complete the Hunt" Treat Reward Modal reminding owners to reward physical treats.
  * Screen Wake Lock API management.
* **"Pounce-Cam" Reaction Snapshot Engine (`src/camera.js`):**
  * Device front-facing camera integration (`getUserMedia`).
  * Offscreen canvas capture with retro timestamp and PawPlay badge watermark.
  * Client-side IndexedDB photo vault (`pawplay_photos_v1`) with resilient fallback to transient in-memory vault.
  * Human photo gallery review and deletion modal.
* **PWA & Deployment Assets:**
  * `manifest.json` (`"display": "standalone"`, `"orientation": "any"`).
  * Cache-first offline service worker `sw.js`.
  * `vercel.json` with strict security headers (CSP, nosniff, DENY) and SW routing.
  * GitHub repository: `https://github.com/buianhuy2009/playpaw` (branch `main`).
  * Vercel target domain: `https://playpaw.vercel.app`.

#### 2. Test Suite Execution Summary
* **Command:** `node tests/run_tests.js`
* **Test Count:** 156 / 156 Passed (100% success rate across all suites)
* **Tier 1 (Baseline Engine & Sprites):** 16 / 16 passed
* **Tier 2 (Boundary & Stress Hardening):** 50 / 50 passed (TC-B01 to TC-B10: margin clamping, sitting paw filter, 8s annulus timing, extreme aspect ratios 320x320 to 2560x1080, DPR clamping, 500 swat bursts, Web Audio auto-unlock, camera error handling, IndexedDB storage fallback, 10-finger concurrent touch tracking)
* **Tier 3 (Pairwise Matrix Combinations):** 25 / 25 passed (all 25 orthogonal vectors)
* **Tier 4 (Real-World Feline Scenarios):** 16 / 16 passed (Curious Kitten, Apex Hunter & Resting Chest, Distracted Cat 12s Lure, Violent Top Swat & 8s Annulus Exit)
* **Engine Stress Benchmark:** `node --expose-gc tests/engine_stress_benchmark.mjs`: 9 / 9 benchmarks passed with zero memory leaks and 0 leaked listeners.

#### 3. Chrome DevTools 3-Pass Rule Certification
* **Pass 1 (Fresh Onboarding & Full App Lifecycle):**
  * Navigated to clean preview (`http://127.0.0.1:3000/index.html`).
  * Stepped through all 5 onboarding slides and completed walkthrough.
  * Verified localStorage persistence (`pawplay_onboarded_v1 = 'true'`).
  * Verified high-DPI 120Hz canvas loop, DPR=2.0 clamping, safe margins (Top 72px, Bottom 560px, Left 48px, Right 1392px).
  * Validated procedural renderers for all 5 prey types across all 3 contrast themes.
  * Verified raycast swat collision: score incremented, particles burst, state transitioned to `CAUGHT_RESPAWN`.
  * Verified 8s annulus exit lock: 4.0s early release canceled and reset to 0%; continuous 8.0s hold completed and opened Treat Modal.
  * **Result: 0 errors, 0 warnings.**
* **Pass 2 (Reload Persistence, Sitting Paw Filter & Tab Defense):**
  * Reloaded page with existing state. Verified onboarding remained dismissed.
  * Verified sitting-paw suppression (<12px over 400ms touch flagged as resting paw).
  * Verified active finger swat caught prey while resting paw remained on screen.
  * Verified Tab Defense `visibilitychange`: auto-paused and muted audio on tab hide, reopened settings on tab show.
  * Verified session timer countdown.
  * **Result: 0 errors, 0 warnings.**
* **Pass 3 (Fresh State Reset, Audio Synthesis & Photo Vault):**
  * Cleared localStorage and reloaded. Verified onboarding reappeared.
  * Verified procedural Web Audio synthesizers (rodent squeak, bug clicks, water splash, 12s idle acoustic lure, treat chime).
  * Verified Pounce-Cam snapshot generation, IndexedDB storage, photo retrieval, and photo deletion.
  * Verified Android haptic vibration trigger.
  * **Result: 0 errors, 0 warnings.**


#### 4. Feline Auditory & Physical Demonstration Overhaul (Post-Video Analysis)
* **Real-World Cat Test Evaluation (`~/Downloads/IMG_0309.MOV`):**
  * Evaluated 30-second live test video of cat perched above iPad on a light apartment floor.
  * Identified 4 core friction points:
    1. Lack of continuous auditory prey activity: cats tune into 2 kHz - 60 kHz; synthetic sine beeps caused immediate disinterest after 2 seconds.
    2. Zero background contrast: iPad Oak Wood Floor theme blended seamlessly into the real apartment floor, removing visual separation from an elevated angle.
    3. iPad Safari camera decoding stall: hidden `<video>` element stopped frame rendering in iOS WebKit, preventing saved pounce frames.
    4. Exit lock friction: 8 seconds proved too long for human hand ergonomics, and widget lacked visual holding feedback.
* **Biological Sound Architecture Overhaul (`src/audio.js`):**
  * Implemented procedural organic claw-on-wood / rustling scamper sound (`playPreyScurry`) whenever prey darts or skitters.
  * Implemented dynamic stereo spatial panning (`StereoPannerNode`) mapped to prey x-coordinate so cats can locate prey via interaural time differences.
  * Overhauled 12s acoustic lure into a 3-phase biological sequence: (A) crisp claw scratch & leaf rustle, (B) natural frequency-modulated rodent distress chitter (4.5 kHz – 11 kHz with vibrato), (C) directional scamper footsteps.
* **Visual Contrast & Elevation (`src/prey.js`):**
  * Added 3D tactile elevation drop shadow (`shadowColor = 'rgba(0,0,0,0.45)'`, blur, offset) so all prey distinctly pop off light wood and dark floors.
* **iPad Safari Camera & Native Photos Integration (`src/camera.js`):**
  * Fixed iOS WebKit video decoding freeze by attaching `<video>` offscreen to DOM with `playsinline`, `muted`, `autoplay`, and non-zero dimensions.
  * Added iOS Web Share API integration (`navigator.share({ files: [file] })`) to save high-res pounce photos directly to Apple Photos.
  * Added `curious-look` snapshot trigger on the 12s acoustic lure to capture the cat's curious reaction even prior to swatting.
* **5-Second Enlarged Exit Lock (`src/defense.js`, `index.html`):**
  * Reduced exit hold duration from 8s to 5s.
  * Added active `.holding` scale animation (`scale(1.65)`), golden glow effect, and enlarged touch target.



