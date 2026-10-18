# PawPlay: Master Teamwork Multi-Agent Task Prompt

Copy and paste the exact prompt block below into `/teamwork-preview` or into any new conversation to spin up an autonomous multi-agent team:

```text
Upgrade PawPlay from a single-file prototype into a polished, biological-calibrated web application for cats based on PROJECT_PLAN.md and IMPLEMENTATION_PLAN.md, with an active Browser Tab Defense Shield, Pounce-Cam reaction engine, full-screen first-time onboarding, and automated Vercel MCP deployment to playpaw.vercel.app.

Working directory: /Users/buianhuy/.gemini/antigravity/scratch/pawplay
Integrity mode: development

## Reference Documentation
- PROJECT_PLAN.md: Complete project blueprint, feline biological rationale, and Mandatory Documentation Directive.
- IMPLEMENTATION_PLAN.md: Detailed 6-workstream engineering specifications, Tab Defense Shield, and acceptance criteria.

## Requirements

### R1. Engine, 120Hz Delta-Time Loop & Contrast Themes
Implement a high-DPI, 120Hz-capable delta-time normalized HTML5 Canvas rendering loop with 3 switchable contrast themes (Daylight Floor, Night Stalker, Koi Pond with interactive water ripples). Enforce an active perimeter repulsion margin (top 72px, bottom 72px, sides 48px) that strictly prevents prey from ever entering top browser tab areas or bottom OS gesture zones.

### R2. 5-State Biomimetic Prey AI & High-Fidelity Sprites
Implement a biomimetic state machine (STALK_CREEP, DART_SPRINT, FREEZE_TREMOR, EDGE_SKITTER, CAUGHT_RESPAWN). Use high-resolution, high-fidelity top-down transparent sprites (Bumblebee with animated fluttering wings, Scurrying Roach, Field Mouse with whipping tail kinematics, Koi Fish with spinal joints, Laser with particle dispersion). Support 1 to 4 concurrent prey.

### R3. Browser Tab Defense & 8-Second Annulus Exit Lock
- Multi-touch raycast swipe detection with continuous line-segment-to-circle intersection (+42px paw pad tolerance).
- Static resting-paw filter suppressing stationary touches (<12px over 400ms).
- Tab Defense Shield: beforeunload unload interceptor, overscroll-behavior: none, and visibilitychange auto-pause with instant Web Audio mute.
- 8-Second Clockwise Annulus Exit Lock: In the corner, place a very hidden, ultra-faint icon showing an ✕ inside a circle (opacity: ~0.15). Pressing and holding opens a faint circle with a hole (annulus ring) that gradually fills clockwise over exactly 8 seconds. Releasing before 8 seconds immediately cancels and resets to 0%. Completing the 8-second hold ends the session.

### R4. Procedural Web Audio API Synthesizer & Acoustic Lures
Zero-latency FM rodent squeaks, bandpass bug clicks, and resonant water splashes. Implement a 12-second idle acoustic lure system that chirps to recall distracted cats back to the screen.

### R5. First-Time Fullscreen Onboarding & Customization Deck
- First-Time Walkthrough: On first visit (!localStorage.getItem('pawplay_onboarded_v1')), display a full-screen step-by-step carousel covering stability (mats/cases), tab defense (Guided Access/PWA), feline vision, pounce-cam, and the "Complete the Hunt" treat reminder. Dismissing it marks pawplay_onboarded_v1 = 'true'.
- Customization Deck: Prey selection, prey count (1–4), speeds (Kitten, Hunter, Apex, Ludicrous), sizes (Tiny, Normal, Chonky), sound volume, haptic intensity, and session time modes: 1 minute, 3 minutes, 5 minutes, or Unlimited.

### R6. "Pounce-Cam" Reaction Snapshot Engine
Access device front-facing camera (getUserMedia) with human permission toggle. Provide settable triggers (On Catch, On Near-Miss, Every Pounce, Disabled). Capture frames to an offscreen canvas with retro timestamp and PawPlay badge. Save snapshots in client-side IndexedDB with a human photo gallery modal.

### R7. Automated Vercel MCP Deployment (playpaw.vercel.app)
Initialize git, commit all files, configure vercel.json with security and PWA caching headers, and deploy to Vercel targeting https://playpaw.vercel.app via Vercel MCP (create_git_project or create_deployment) under team team_i6w55Xr6YiuTbLK4AOxUv2le.

### R8. Autonomous "Build - View - Fix" Quality Loop & 3-Pass Rule
Iteratively build, view in browser via Chrome DevTools MCP (navigate_page, evaluate_script, take_screenshot), and fix bugs. Proactively add new features whenever necessary. Do NOT stop until 3 consecutive, independent test passes show zero bugs, zero console warnings, and flawless execution.

### R9. Continuous Project Documentation
Strictly follow the Mandatory Documentation Directive in PROJECT_PLAN.md: record all upgrades, test logs, and live deployment URLs in Section 9 of PROJECT_PLAN.md.

## Acceptance Criteria

### Browser Tab Defense & Exit Lock
- [ ] Attempting to close or reload the tab while isPlaying = true triggers a confirmation prompt via beforeunload.
- [ ] Switching away from the tab triggers visibilitychange auto-pause, muting sound and requiring an explicit unlock to resume.
- [ ] Releasing the exit lock before 8 seconds cancels progress immediately; completing the continuous 8-second hold smoothly ends the session.
- [ ] No prey sprite penetrates the top/bottom 72px margin during 60s Apex simulation.

### First-Time Onboarding & Customizations
- [ ] Full-screen onboarding carousel displays on first device visit and stays dismissed on subsequent reloads.
- [ ] Session timer correctly supports 1 min, 3 min, 5 min, and Unlimited modes.
- [ ] PWA manifest specifies "display": "standalone", running without browser tab bars when added to Home Screen.

### Touch, Camera & Sprites
- [ ] Continuous pointer swipes across prey trigger catches via line-segment raycasting.
- [ ] Resting stationary touches do not block active swatting or trigger continuous hits.
- [ ] Pounce-Cam snapshots save to IndexedDB without throwing storage quota errors.
- [ ] Sprites use high-resolution biological assets (not crude polygons).

### 3-Pass Verification & Live Deployment
- [ ] 3 consecutive automated test passes complete with zero console errors or unhandled exceptions.
- [ ] Live Vercel deployment at https://playpaw.vercel.app resolves with valid HTTPS and offline Service Worker.
```
