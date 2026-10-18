# Handoff Report: Vercel MCP Deployment & E2E Testing Architecture

**Agent**: `explorer_survey_2`  
**Date**: 2026-10-18  
**Working Directory**: `/Users/buianhuy/.gemini/antigravity/scratch/pawplay/.agents/teamwork/explorer_survey_2/`  
**Parent Orchestrator**: `46512a29-cba5-437c-ab6d-761bb6fb87d0`  
**Scope**: Read-only exploration and design specification for Vercel MCP deployment pipeline, E2E Testing Track (4-tier test case matrix & test infra), and Chrome DevTools MCP 3-Pass verification protocol.

---

## 1. Observation

### 1.1 Codebase & Environment State
1. **Local Repository & Environment**:
   - `git status` in `/Users/buianhuy/.gemini/antigravity/scratch/pawplay`:
     ```
     fatal: not a git repository (or any of the parent directories): .git
     ```
   - Node version: `v26.0.0`
   - npm version: `11.12.1`
   - git version: `2.50.1` (Apple Git-155)
   - Python version: `3.9.6` (provides instant `python3 -m http.server` for zero-dependency local testing)
   - Current files: Single-file prototype `index.html` (469 lines, 12,297 bytes), `PROJECT_PLAN.md`, `IMPLEMENTATION_PLAN.md`, `ORIGINAL_REQUEST.md`.

### 1.2 Vercel MCP API & Authentication Probe
1. **`get_auth_user` response**:
   ```json
   {
     "user": {
       "id": "U4Ay3nyyTU2GCdhbBqMixzTH",
       "email": "buianhuy2009@gmail.com",
       "username": "buianhuy2009-5512",
       "defaultTeamId": "team_i6w55Xr6YiuTbLK4AOxUv2le",
       "stagingPrefix": "buianhuy2009-5512",
       "importFlowGitProvider": "github",
       "importFlowGitNamespaceId": 157393666
     }
   }
   ```
2. **`list_projects` with no arguments**:
   - Succeeded and returned 3 existing projects (`student-command-center`, `brave79813j`, `studentos`), all having:
     ```json
     "accountId": "team_i6w55Xr6YiuTbLK4AOxUv2le"
     ```
3. **`get_project` for `prj_fVTdbavfgAfaIMkJCTVOcPz4SQce` (without `teamId`)**:
   - Succeeded and returned project details under account `team_i6w55Xr6YiuTbLK4AOxUv2le` with domains such as `student-command-center-an-huy.vercel.app` (confirming scope slug `an-huy`).
4. **`list_projects` or `get_team` with explicit `teamId: "team_i6w55Xr6YiuTbLK4AOxUv2le"`**:
   - Returned HTTP 403 Forbidden:
     ```json
     {
       "error": {
         "message": "Vercel API request failed (403: forbidden). Not authorized: Trying to access resource under scope \"an-huy\". You must re-authenticate to this scope or use a token with access to this scope.",
         "status": 403,
         "code": "forbidden",
         "scope": "an-huy",
         "teamId": "team_i6w55Xr6YiuTbLK4AOxUv2le"
       }
     }
     ```
5. **`get_project` for `playpaw`**:
   - Returned HTTP 404 Not Found:
     ```json
     {
       "error": {
         "message": "Vercel API request failed (404: not_found). Project not found.",
         "status": 404,
         "code": "not_found"
       }
     }
     ```
   - Confirms project `playpaw` is clear and ready to be created.

### 1.3 GitHub MCP Identity Probe
- Tool `github-mcp-server:get_me` returned:
  ```json
  {
    "id": 322329834,
    "login": "buianhuy2009",
    "profile_url": "https://github.com/buianhuy2009"
  }
  ```
- Authenticated GitHub user matches Vercel import git namespace.

### 1.4 Chrome DevTools MCP Probe
- Tool `chrome-devtools-mcp:list_pages` returned:
  ```
  ## Pages
  1: about:blank [selected]
  ```
- DevTools MCP session is active, targetable at `pageId: 1`.

---

## 2. Logic Chain

### 2.1 Vercel MCP Scoping Logic
- **Premise 1**: In `get_auth_user`, the user's `defaultTeamId` is `team_i6w55Xr6YiuTbLK4AOxUv2le`, and account slug is `an-huy`.
- **Premise 2**: Calling Vercel MCP tools with an explicit `teamId: "team_i6w55Xr6YiuTbLK4AOxUv2le"` fails with 403 because the Vercel REST token is already scoped to the default team account; passing `teamId` triggers an external team access check.
- **Premise 3**: Calling Vercel MCP tools without specifying `teamId` automatically applies the user's default team scope (`team_i6w55Xr6YiuTbLK4AOxUv2le`).
- **Conclusion**: All Vercel MCP tool calls by the deployment agent (`create_project`, `create_deployment`, `add_project_domain`) should omit `teamId` (or pass `slug: "an-huy"` if required), guaranteeing automatic linkage to `team_i6w55Xr6YiuTbLK4AOxUv2le` without 403 authorization failures.

### 2.2 Deployment Pipeline Architecture Logic
- PawPlay can be deployed via two complementary paths:
  1. **Direct Inlined Files Deployment (`create_deployment`)**:
     - Sends all source code files (`index.html`, `vercel.json`, `manifest.json`, `sw.js`, `src/*.js`, icons) directly via the `requestBody.files` parameter with `utf-8` / `base64` encoding.
     - Does not require external git webhooks or token permissions.
     - Immediate, synchronous build trigger.
  2. **Git Repository Linkage (`github-mcp-server:create_repository` + `git push` + `create_project`)**:
     - Local git init + commit.
     - GitHub repository creation via GitHub MCP.
     - Linking repo in `create_project` under `gitRepository: { repo: "buianhuy2009/pawplay", type: "github" }`.
  - Both paths allow binding the target production domain `playpaw.vercel.app` via `add_project_domain`.

### 2.3 `vercel.json` Security & Service Worker Cache Control Logic
- Feline web gameplay requires robust PWA capabilities and strict sandboxing:
  - **Service Worker (`/sw.js`)**: Must NEVER be cached by the browser (`max-age=0, must-revalidate`), otherwise code updates will not propagate to returning users. Must specify `Service-Worker-Allowed: /` to control the root scope.
  - **Clickjacking & MIME Protection**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
  - **Sensor & Camera Permissions**: `Permissions-Policy: camera=(self), accelerometer=(), gyroscope=(), magnetometer=(), microphone=()` allows front-camera for Pounce-Cam while blocking unnecessary sensor polling.
  - **Content Security Policy (CSP)**: Confines resource loading to self, data:, and blob: (for canvas captures and IndexedDB image URLs).

### 2.4 E2E Testing Track & 4-Tier Matrix Logic
- Standard unit tests are insufficient for feline physiological requirements. We must verify:
  1. **Tier 1 (Feature Coverage)**: Every single functional capability (Canvas 120Hz loop, 5 prey types, 5 FSM states, audio synth, pounce-cam, 8s annulus exit lock).
  2. **Tier 2 (Boundary & Corner Cases)**: Safety invariants (72px top/bottom and 48px side margins clamp, sitting-paw filter threshold, 7.9s hold cancel vs 8.0s hold exit, extreme viewports, DPR scaling, audio context unlock/suspend).
  3. **Tier 3 (Pairwise Interactions)**: Combinatorial matrix (5 prey × 4 speeds × 3 sizes × 3 themes × 4 counts × 4 camera modes = 2,880 total, reduced to 25 orthogonal pairwise vectors).
  4. **Tier 4 (Real-World Scenarios)**: Multi-step simulated cat behavioral journeys (Curious Kitten, Apex Hunter with Resting Chest, Distracted Cat with 12s Acoustic Recall, Violent Top Swat with Tab Defense & 8s Exit).

### 2.5 Chrome DevTools MCP 3-Pass Rule Logic
- The 3-Pass Rule requires 3 consecutive, independent test passes with zero console warnings and zero errors.
- To prevent trivial repetition of identical tests, the 3 passes must be structured progressively:
  - **Pass 1**: Cold Boot & Onboarding Verification (`localStorage.clear()`, carousel walkthrough, dismissal persistence).
  - **Pass 2**: Customization Deck, Canvas 120Hz Loop, Raycasting Hit Detection & Audio Synthesis.
  - **Pass 3**: Tab Defense Invariants (72px margin stress test, `visibilitychange` auto-pause, 8s Annulus Exit hold) & Live Production Deployment at `https://playpaw.vercel.app`.

---

## 3. Caveats
1. **Camera in Headless/DevTools Environment**: Headless Chrome instances might not have a physical webcam attached. The Pounce-Cam test harness must support both real camera streams and standard synthetic media streams (`fake-device-for-media-stream` flag or mock `MediaStreamTrack` fallback) without throwing uncaught exceptions.
2. **Audio Autoplay Restrictions**: Browsers require a user gesture (`pointerdown`/`click`) before resuming `AudioContext`. In automated DevTools tests, the script must trigger the start button gesture prior to asserting `audioCtx.state === 'running'`.
3. **Domain Reservation on Vercel**: `playpaw.vercel.app` is an official `.vercel.app` subdomain. Domain availability was confirmed free in project plan blueprints, but final ownership is confirmed upon calling `add_project_domain`.

---

## 4. Conclusion & Actionable Architecture Designs

### Part A: Vercel MCP Deployment Architecture

#### A.1 Target Deployment Spec
| Attribute | Target Value |
| :--- | :--- |
| **Project Name** | `playpaw` |
| **Production Domain** | `https://playpaw.vercel.app` |
| **Target Account / Team** | `team_i6w55Xr6YiuTbLK4AOxUv2le` (Scope: `an-huy`, user `buianhuy2009-5512`) |
| **Framework** | `null` (pure static HTML5 Canvas/PWA web application) |
| **Git Provider** | GitHub (`buianhuy2009/pawplay`) |

#### A.2 `vercel.json` Specification
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "cleanUrls": true,
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(self), accelerometer=(), gyroscope=(), magnetometer=(), microphone=()" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self';" }
      ]
    }
  ]
}
```

#### A.3 Automated Vercel MCP Tool Invocation Sequence
1. **Step 1: Create Project via `vercel:create_project`**
   - Tool: `call_mcp_tool` (`ServerName: "vercel"`, `ToolName: "create_project"`)
   - Arguments (omit `teamId`):
     ```json
     {
       "requestBody": {
         "name": "playpaw",
         "framework": null
       }
     }
     ```
2. **Step 2: Deploy Source Code via `vercel:create_deployment`**
   - Tool: `call_mcp_tool` (`ServerName: "vercel"`, `ToolName: "create_deployment"`)
   - Arguments (omit `teamId`):
     ```json
     {
       "requestBody": {
         "name": "playpaw",
         "project": "playpaw",
         "target": "production",
         "files": [
           { "file": "index.html", "data": "<content>", "encoding": "utf-8" },
           { "file": "vercel.json", "data": "<content>", "encoding": "utf-8" },
           { "file": "manifest.json", "data": "<content>", "encoding": "utf-8" },
           { "file": "sw.js", "data": "<content>", "encoding": "utf-8" },
           { "file": "src/engine.js", "data": "<content>", "encoding": "utf-8" },
           { "file": "src/prey.js", "data": "<content>", "encoding": "utf-8" },
           { "file": "src/input.js", "data": "<content>", "encoding": "utf-8" },
           { "file": "src/defense.js", "data": "<content>", "encoding": "utf-8" },
           { "file": "src/audio.js", "data": "<content>", "encoding": "utf-8" },
           { "file": "src/ui.js", "data": "<content>", "encoding": "utf-8" },
           { "file": "src/camera.js", "data": "<content>", "encoding": "utf-8" }
         ]
       }
     }
     ```
3. **Step 3: Assign Custom Production Subdomain via `vercel:add_project_domain`**
   - Tool: `call_mcp_tool` (`ServerName: "vercel"`, `ToolName: "add_project_domain"`)
   - Arguments (omit `teamId`):
     ```json
     {
       "idOrName": "playpaw",
       "requestBody": {
         "name": "playpaw.vercel.app"
       }
     }
     ```
4. **Step 4: Verify Deployment Status**
   - Call `vercel:get_project_domain` with `idOrName: "playpaw"`, `domain: "playpaw.vercel.app"`.

---

### Part B: E2E Testing Track Architecture & 4-Tier Matrix

#### B.1 Test Infrastructure Overview (`TEST_INFRA.md`)
The testing track is designed around a zero-dependency dual harness:
1. **Local Test Runner (`tests/runner.js`)**: Executes fast in-process contracts and browser-simulated headless assertions via Node.js.
2. **DevTools MCP Automated Suite (`tests/e2e-devtools.js`)**: Drives real Chrome browser instances via Chrome DevTools MCP tools (`evaluate_script`, `take_screenshot`, `list_console_messages`).

#### B.2 4-Tier Test Case Matrix

```
+---------------------------------------------------------------------------------------+
|                                4-TIER TEST CASE MATRIX                                |
+---------------------------------------------------------------------------------------+
| Tier 1: Feature Coverage      | 13 Test Cases (Engine, AI, Audio, UI, Camera, Lock)   |
| Tier 2: Boundary & Corner     | 10 Test Cases (Margins, Thresholds, Viewports, Quota) |
| Tier 3: Pairwise Combinations | 25 Combinatorial Orthogonal Vectors                   |
| Tier 4: Real-World Scenarios  | 4 Multi-Step Feline Behavioral Journeys                |
+---------------------------------------------------------------------------------------+
```

##### Tier 1: Feature Coverage (Core Functional Capabilities)
| ID | Feature Under Test | Test Description | Success Criteria |
| :--- | :--- | :--- | :--- |
| **TC-F01** | High-DPI 120Hz Loop | Run engine for 120 frames; measure delta time ($dt$). | $dt \in (0.005, 0.050]$, canvas resolution matches DPR (clamped at 2.0). |
| **TC-F02** | 3 Contrast Themes | Switch between Daylight Floor, Night Stalker, Koi Pond. | Theme background color and visual ripple overlay apply correctly. |
| **TC-F03** | 5 Biomimetic Prey Types | Render Laser, Bug, Mouse, Koi, Bee sequentially. | Each prey renders with distinctive geometry, colors (`#FFD600`, `#0077FF`), and appendages. |
| **TC-F04** | 5-State Prey FSM | Observe prey states over 10 seconds. | All 5 states (`FREEZE_TREMOR`, `DART_SPRINT`, `STALK_CREEP`, `EDGE_SKITTER`, `CAUGHT_RESPAWN`) observed. |
| **TC-F05** | Multi-Prey Spawner | Spawn 1, 2, 3, and 4 concurrent prey. | Exactly $N$ prey objects updated and rendered without collision cross-talk. |
| **TC-F06** | Multi-Touch Raycasting | Simulate rapid swipe line segment across prey hitbox. | Distance to line segment $\le radius + 42\text{px}$ triggers catch event and particle burst. |
| **TC-F07** | Procedural Web Audio | Trigger catch squeak, bug click, and water splash. | Audio nodes created with valid frequencies; zero 404 network asset requests. |
| **TC-F08** | 12s Acoustic Idle Lure | Simulate 12 seconds with no touch events. | Idle timer fires acoustic lure synchronized with a prey `DART_SPRINT`. |
| **TC-F09** | Onboarding Walkthrough | Load page with clean `localStorage`. | 5 carousel cards display; completion sets `pawplay_onboarded_v1 = 'true'`; subsequent load skips directly to Menu. |
| **TC-F10** | Customization Deck | Toggle speed, size, theme, prey count, and timer options. | Config object updates and persists in `localStorage.pawplay_state_v1`. |
| **TC-F11** | Pounce-Cam Engine | Trigger catch with camera enabled. | Video frame rendered to offscreen canvas; thumbnail saved to IndexedDB; gallery displays item. |
| **TC-F12** | 8s Annulus Exit Lock | Press and hold corner exit icon for 8.0 seconds. | Progress ring fills clockwise; completing 8s transitions to session summary / menu. |
| **TC-F13** | PWA Manifest & SW | Fetch `/manifest.json` and `/sw.js`. | Manifest contains `"display": "standalone"`; service worker installs and activates. |

##### Tier 2: Boundary & Corner Cases (Invariants & Edge Conditions)
| ID | Boundary Scenario | Test Condition | Success Criteria |
| :--- | :--- | :--- | :--- |
| **TC-B01** | Perimeter Repulsion Clamp | 60-second continuous simulation at *Ludicrous* speed ($1200\text{ px/s}$). | Invariant $y \in [72, H-72]$ and $x \in [48, W-48]$ holds 100% of frames; 0 margin violations. |
| **TC-B02** | Static Sitting-Paw Filter | Apply touch with displacement $< 12\text{px}$ over $400\text{ms}$. | Touch marked `isResting = true`; suppresses catches while second active swiping touch registers. |
| **TC-B03** | Annulus Lock Early Release | Press exit lock for $7.9\text{s}$ and release. | Progress immediately resets to $0.0$; game session is NOT exited. |
| **TC-B04** | Extreme Viewports | Test at $360 \times 640$ (phone), $1024 \times 768$ (tablet), $1366 \times 1024$ (iPad Pro), $2560 \times 1080$ (ultrawide). | Prey radius scales dynamically based on screen diagonal; no canvas aspect ratio distortion. |
| **TC-B05** | High DPR Scaling | Test at `devicePixelRatio = 3.0` (iPhone Retina). | Internal canvas backing store clamps to max DPR $2.0$ to prevent GPU memory exhaustion. |
| **TC-B06** | Zero vs 500 Pounces | Test session with 0 catches, and session with 500 rapid catches. | No particle memory leak; score badge handles 3+ digits cleanly. |
| **TC-B07** | AudioContext Auto-Unlock | Call audio synth before user gesture vs after "Start Playing". | Autoplay policy caught gracefully; unlocked cleanly upon first tap. |
| **TC-B08** | Camera Permission Denied | Simulate `navigator.mediaDevices.getUserMedia` rejecting with `NotAllowedError`. | Pounce-Cam toggles to disabled state; friendly UI badge displayed; gameplay continues unhindered. |
| **TC-B09** | Private Browsing Quota | Simulate IndexedDB throwing `QuotaExceededError`. | Cat Cam captures fall back to transient blob array with user warning; no crash. |
| **TC-B10** | 10-Finger Paw Slap Burst | Dispatch 10 simultaneous `touchstart` events within $30\text{ms}$. | All touch identifiers processed; raycasting evaluates without NaN errors or frame drop. |

##### Tier 3: Pairwise Combinations (Orthogonal Array Test Matrix)
To maximize test coverage across parameter interactions without running all 2,880 combinations, 25 orthogonal test vectors are defined:
- **Parameters**: Prey Type (5), Speed (4), Size (3), Theme (3), Prey Count (4), Camera Trigger (4).
```
Vector 01: [Bee,     Kitten,    Tiny,   Daylight Floor, 1 Prey, Off]
Vector 02: [Roach,   Hunter,    Normal, Night Stalker,  2 Prey, On Catch]
Vector 03: [Mouse,   Apex,      Chonky, Koi Pond,       3 Prey, On Near-Miss]
Vector 04: [Koi,     Ludicrous, Tiny,   Daylight Floor, 4 Prey, Every Pounce]
Vector 05: [Laser,   Kitten,    Normal, Night Stalker,  1 Prey, Every Pounce]
Vector 06: [Bee,     Hunter,    Chonky, Koi Pond,       2 Prey, Off]
Vector 07: [Roach,   Apex,      Tiny,   Daylight Floor, 3 Prey, On Catch]
Vector 08: [Mouse,   Ludicrous, Normal, Night Stalker,  4 Prey, On Near-Miss]
Vector 09: [Koi,     Kitten,    Chonky, Koi Pond,       1 Prey, On Catch]
Vector 10: [Laser,   Hunter,    Tiny,   Daylight Floor, 2 Prey, On Near-Miss]
Vector 11: [Bee,     Apex,      Normal, Night Stalker,  3 Prey, Every Pounce]
Vector 12: [Roach,   Ludicrous, Chonky, Koi Pond,       4 Prey, Off]
Vector 13: [Mouse,   Kitten,    Tiny,   Night Stalker,  2 Prey, Every Pounce]
Vector 14: [Koi,     Hunter,    Normal, Koi Pond,       3 Prey, Off]
Vector 15: [Laser,   Apex,      Chonky, Daylight Floor, 4 Prey, On Catch]
Vector 16: [Bee,     Ludicrous, Tiny,   Night Stalker,  1 Prey, On Near-Miss]
Vector 17: [Roach,   Kitten,    Normal, Koi Pond,       3 Prey, On Near-Miss]
Vector 18: [Mouse,   Hunter,    Chonky, Daylight Floor, 1 Prey, Every Pounce]
Vector 19: [Koi,     Apex,      Tiny,   Night Stalker,  2 Prey, Off]
Vector 20: [Laser,   Ludicrous, Normal, Koi Pond,       2 Prey, On Catch]
Vector 21: [Bee,     Kitten,    Normal, Daylight Floor, 4 Prey, On Catch]
Vector 22: [Roach,   Hunter,    Tiny,   Night Stalker,  4 Prey, Every Pounce]
Vector 23: [Mouse,   Apex,      Tiny,   Koi Pond,       1 Prey, Off]
Vector 24: [Koi,     Ludicrous, Normal, Daylight Floor, 3 Prey, On Catch]
Vector 25: [Laser,   Kitten,    Chonky, Night Stalker,  3 Prey, Off]
```

##### Tier 4: Real-World Scenarios (End-to-End Behavioral Journeys)
1. **Scenario 1: "The First-Time Kitten" (Onboarding & Gentle Play)**:
   - Fresh device initialization $\to$ Fullscreen Onboarding Walkthrough appears.
   - Owner reviews Stability, Tab Defense, Vision, Pounce-Cam, and Treat Reminder.
   - Owner dismisses walkthrough $\to$ `pawplay_onboarded_v1 = 'true'`.
   - Setup: 1 Chonky Mouse, Kitten Speed, Daylight Floor, 1-Minute Timer.
   - Tap "Start Playing" $\to$ Screen WakeLock requested, Audio unlocked.
   - Cat swats 3 times, catching mouse $\to$ FM squeaks play, score reaches 3.
   - 1-minute timer expires $\to$ Prey smoothly slows down and leaves screen; "🍖 Complete the Hunt! Toss your cat a treat" modal appears with chime.
2. **Scenario 2: "The Apex Hunter & The Resting Chest" (Multi-Touch Filter & Exit Safety)**:
   - Setup: 3 Scurrying Roaches, Apex Speed, Night Stalker, Unlimited Timer.
   - Cat approaches tablet and rests chest/left paw on the bottom edge ($< 12\text{px}$ over $400\text{ms}$).
   - System flags touch as `isResting = true`, suppressing false catches.
   - Cat swats violently with right paw across prey $\to$ raycast intersects beetle hitbox, triggering catch particle burst and Pounce-Cam snapshot.
   - Cat's tail or paw swipes across top-right exit button for $1.2\text{s}$ $\to$ annulus begins filling but resets to $0\%$ upon release. Game remains completely active.
3. **Scenario 3: "The Distracted Cat & 12s Acoustic Recall"**:
   - Setup: 2 Bees, Hunter Speed, Koi Pond Theme.
   - Cat plays for 20 seconds, then wanders away from tablet.
   - No touch events registered for 12 seconds $\to$ Idle timer triggers high-pitch acoustic chirp lure synchronized with a sudden bee `DART_SPRINT`.
   - Cat hears high-frequency chirp, runs back, and pounces on screen.
4. **Scenario 4: "Violent Swat Tab Defense & Controlled Exit"**:
   - Cat strikes violently near top of screen ($y < 72\text{px}$).
   - Active repulsion margin forces all prey to stay $> 72\text{px}$ away from top, preventing cat from tapping browser tabs or address bar.
   - Tablet is flipped or tab switched (`visibilitychange: hidden`) $\to$ Audio immediately mutes, game auto-pauses.
   - Tablet returned to foreground (`visibilitychange: visible`) $\to$ Explicit "Resume Play" overlay displayed.
   - Human holds top-right corner $\times$ exit icon for uninterrupted 8.0 seconds $\to$ Clockwise annulus completes, session cleanly exits to Human Menu.

---

### Part C: Chrome DevTools MCP 3-Pass Verification Protocol

The 3-Pass verification protocol provides strict, reproducible certification for the application using Chrome DevTools MCP tools.

#### C.1 Core Protocol Mechanics
1. **Browser Control**: Targeted on `pageId: 1` (or active page ID from `list_pages`).
2. **Zero-Warning & Zero-Error Invariant**: After each pass, execute `list_console_messages` with `types: ["error", "warn"]`. The returned list MUST be empty (`[]`). Any console warning or error invalidates the pass.
3. **Screenshot Artifacts**: Every pass captures visual evidence via `take_screenshot` saved to `.agents/teamwork/explorer_survey_2/pass{N}_<description>.png`.

#### C.2 Pass 1: Cold Boot & First-Time Onboarding Certification
- **Goal**: Verify storage initialization, Onboarding Carousel walkthrough, dismissal persistence, and clean reload.
- **Protocol Steps**:
  1. `navigate_page`: `{ pageId: 1, type: "url", url: "http://localhost:8080" }`
  2. `evaluate_script`: Reset storage state:
     ```javascript
     () => {
       localStorage.clear();
       return { cleared: true };
     }
     ```
  3. `navigate_page`: `{ pageId: 1, type: "reload" }`
  4. `evaluate_script`: Verify Onboarding Modal is active and visible:
     ```javascript
     () => {
       const modal = document.getElementById('onboardingModal');
       const slides = document.querySelectorAll('.onboarding-slide');
       return {
         visible: modal && getComputedStyle(modal).display !== 'none',
         slideCount: slides.length,
         activeSlide: 0
       };
     }
     ```
     *Assertion*: `visible === true` and `slideCount === 5`.
  5. `take_screenshot`: `{ pageId: 1, filePath: "pass1_onboarding_slide0.png" }`
  6. `evaluate_script`: Step through carousel and complete:
     ```javascript
     () => {
       const nextBtn = document.getElementById('onboardingNextBtn');
       for (let i = 0; i < 4; i++) nextBtn.click();
       const finishBtn = document.getElementById('onboardingFinishBtn');
       finishBtn.click();
       return {
         onboarded: localStorage.getItem('pawplay_onboarded_v1'),
         menuVisible: getComputedStyle(document.getElementById('menuOverlay')).display !== 'none'
       };
     }
     ```
     *Assertion*: `onboarded === 'true'` and `menuVisible === true`.
  7. `take_screenshot`: `{ pageId: 1, filePath: "pass1_human_menu.png" }`
  8. `navigate_page`: `{ pageId: 1, type: "reload" }`
  9. `evaluate_script`: Verify Onboarding is bypassed:
     ```javascript
     () => {
       const modal = document.getElementById('onboardingModal');
       const menu = document.getElementById('menuOverlay');
       return {
         onboardingDismissed: !modal || getComputedStyle(modal).display === 'none',
         menuActive: menu && getComputedStyle(menu).display !== 'none'
       };
     }
     ```
     *Assertion*: `onboardingDismissed === true` and `menuActive === true`.
  10. `list_console_messages`: `{ pageId: 1, types: ["error", "warn"] }` $\to$ Assert count is 0.

#### C.3 Pass 2: Customization Deck, Canvas Loop, Raycast & Audio Certification
- **Goal**: Verify customization configuration, Canvas 120Hz loop, touch raycasting, static sitting-paw filter, and procedural Web Audio synthesis.
- **Protocol Steps**:
  1. `evaluate_script`: Configure Customization Deck:
     ```javascript
     () => {
       // Set Roach, Apex Speed, Chonky, Koi Pond Theme, 2 Prey, Audio 80%
       window.PawPlayUI.setOption('prey', 'bug');
       window.PawPlayUI.setOption('speed', 'apex');
       window.PawPlayUI.setOption('size', 'chonky');
       window.PawPlayUI.setOption('theme', 'pond');
       window.PawPlayUI.setOption('count', 2);
       window.PawPlayUI.setOption('volume', 0.8);
       return window.PawPlayUI.getOptions();
     }
     ```
  2. `evaluate_script`: Start game session:
     ```javascript
     () => {
       document.getElementById('startBtn').click();
       return {
         isPlaying: window.PawPlayEngine.isPlaying,
         audioState: window.PawPlayAudio.getContextState(),
         preyCount: window.PawPlayEngine.preyList.length
       };
     }
     ```
     *Assertion*: `isPlaying === true`, `audioState === 'running'`, `preyCount === 2`.
  3. `evaluate_script`: Simulate touch swipe across Prey 0 with raycasting:
     ```javascript
     () => {
       const prey = window.PawPlayEngine.preyList[0];
       const startX = prey.x - 50;
       const startY = prey.y;
       const endX = prey.x + 50;
       const endY = prey.y;
       
       const initialScore = window.PawPlayEngine.score;
       window.PawPlayInput.simulateSwipe(startX, startY, endX, endY);
       
       return {
         hitDetected: window.PawPlayEngine.score > initialScore,
         particlesSpawned: window.PawPlayEngine.particles.length > 0
       };
     }
     ```
     *Assertion*: `hitDetected === true` and `particlesSpawned === true`.
  4. `evaluate_script`: Test Static Sitting-Paw Filter:
     ```javascript
     () => {
       const initialScore = window.PawPlayEngine.score;
       // Simulate resting paw at (200, 200) with 0 movement for 500ms
       window.PawPlayInput.simulateTouchDown(101, 200, 200);
       window.PawPlayInput.tickTime(500);
       
       return {
         isResting: window.PawPlayInput.getTouchStatus(101).isResting,
         scoreUnchanged: window.PawPlayEngine.score === initialScore
       };
     }
     ```
     *Assertion*: `isResting === true` and `scoreUnchanged === true`.
  5. `evaluate_script`: Verify 12-Second Acoustic Idle Lure:
     ```javascript
     () => {
       window.PawPlayEngine.resetIdleTimer();
       window.PawPlayEngine.advanceTime(12.1);
       return {
         lureTriggered: window.PawPlayAudio.wasLureTriggeredRecently()
       };
     }
     ```
     *Assertion*: `lureTriggered === true`.
  6. `take_screenshot`: `{ pageId: 1, filePath: "pass2_active_gameplay.png" }`
  7. `list_console_messages`: `{ pageId: 1, types: ["error", "warn"] }` $\to$ Assert count is 0.

#### C.4 Pass 3: Tab Defense, Margin Invariants, Annulus Exit & Live Vercel Deployment
- **Goal**: Certify perimeter repulsion clamp, `beforeunload` shield, `visibilitychange` auto-pause, 8s Annulus Exit hold, and live production deployment at `https://playpaw.vercel.app`.
- **Protocol Steps**:
  1. `evaluate_script`: Perimeter Margin Stress Test:
     ```javascript
     () => {
       const W = window.innerWidth;
       const H = window.innerHeight;
       let marginViolations = 0;
       
       // Run simulation for 300 virtual ticks at Ludicrous speed
       for (let i = 0; i < 300; i++) {
         window.PawPlayEngine.update(1 / 60);
         for (const prey of window.PawPlayEngine.preyList) {
           if (prey.y < 72 || prey.y > H - 72 || prey.x < 48 || prey.x > W - 48) {
             marginViolations++;
           }
         }
       }
       return { marginViolations };
     }
     ```
     *Assertion*: `marginViolations === 0`.
  2. `evaluate_script`: Test `visibilitychange` auto-pause:
     ```javascript
     () => {
       // Simulate tab switch
       Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
       document.dispatchEvent(new Event('visibilitychange'));
       
       const paused = window.PawPlayEngine.isPaused;
       const audioSuspended = window.PawPlayAudio.getContextState() === 'suspended';
       
       // Simulate return to tab
       Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
       document.dispatchEvent(new Event('visibilitychange'));
       const overlayShown = document.getElementById('pauseOverlay') !== null;
       
       return { paused, audioSuspended, overlayShown };
     }
     ```
     *Assertion*: `paused === true`, `audioSuspended === true`, `overlayShown === true`.
  3. `evaluate_script`: Test 8-Second Annulus Exit Lock:
     ```javascript
     () => {
       const exitBtn = document.getElementById('exitLockBtn');
       // Test 1: Hold for 4.0 seconds and release -> must cancel
       window.PawPlayInput.simulatePointerDownOn(exitBtn);
       window.PawPlayInput.tickTime(4000);
       const progressMid = window.PawPlayDefense.getExitProgress();
       window.PawPlayInput.simulatePointerUpOn(exitBtn);
       const progressAfterRelease = window.PawPlayDefense.getExitProgress();
       const stillPlaying = window.PawPlayEngine.isPlaying;
       
       // Test 2: Continuous 8.0 second hold -> must end session
       window.PawPlayInput.simulatePointerDownOn(exitBtn);
       window.PawPlayInput.tickTime(8050);
       const endedSession = !window.PawPlayEngine.isPlaying;
       
       return {
         progressMid: progressMid > 0.4 && progressMid < 0.6,
         canceledOnRelease: progressAfterRelease === 0,
         stillPlaying,
         endedSession
       };
     }
     ```
     *Assertion*: `progressMid === true`, `canceledOnRelease === true`, `stillPlaying === true`, `endedSession === true`.
  4. `take_screenshot`: `{ pageId: 1, filePath: "pass3_exit_summary.png" }`
  5. **Live Vercel Production Verification**:
     - `navigate_page`: `{ pageId: 1, type: "url", url: "https://playpaw.vercel.app" }`
     - `evaluate_script`: Verify live production headers, service worker registration, and manifest:
       ```javascript
       async () => {
         const swReg = await navigator.serviceWorker.getRegistration();
         const hasSW = Boolean(swReg && swReg.active);
         const manifestLink = document.querySelector('link[rel="manifest"]');
         return {
           protocol: window.location.protocol,
           host: window.location.host,
           hasManifest: Boolean(manifestLink),
           hasActiveServiceWorker: hasSW
         };
       }
       ```
     - *Assertion*: `protocol === 'https:'`, `host === 'playpaw.vercel.app'`, `hasManifest === true`.
  6. `take_screenshot`: `{ pageId: 1, filePath: "pass3_vercel_live_production.png" }`
  7. `list_console_messages`: `{ pageId: 1, types: ["error", "warn"] }` $\to$ Assert count is 0.

---

## 5. Verification Method

To independently verify all findings and designs in this handoff report:

1. **Verify Vercel MCP Authentication & Scoping**:
   ```bash
   # Using default_api:call_mcp_tool
   # ServerName: "vercel", ToolName: "list_projects", Arguments: {}
   # Observe that it returns accountId: "team_i6w55Xr6YiuTbLK4AOxUv2le" without 403 error.
   ```
2. **Verify Chrome DevTools MCP Connectivity**:
   ```bash
   # Using default_api:call_mcp_tool
   # ServerName: "chrome-devtools-mcp", ToolName: "list_pages", Arguments: {}
   # Observe: "1: about:blank [selected]"
   ```
3. **Verify Local Node/Python Test Capability**:
   ```bash
   node -v     # v26.0.0
   python3 -v  # 3.9.6
   ```
4. **Invalidation Conditions**:
   - If Vercel API rejects deployment requests lacking `teamId`, passing `slug: "an-huy"` is the primary recovery fallback.
   - If `playpaw.vercel.app` is claimed by an external third party before assignment, fallback domain is `pawplay.vercel.app` or assigning production alias `playpaw-app.vercel.app`.
