## 2026-10-18T09:29:52Z
[Message] sender=46512a29-cba5-437c-ab6d-761bb6fb87d0 priority=MESSAGE_PRIORITY_HIGH
Task: Thoroughly examine the existing single-file prototype index.html and codebase structure. Map existing functions/components vs target modular architecture:
- src/engine.js (Canvas scaling, 120Hz dt loop, margin repulsion, themes, ripples, particles)
- src/prey.js (5-state FSM, high-fidelity sprites, kinematics, multi-prey)
- src/input.js & src/defense.js (raycast swipe, static sitting-paw filter, beforeunload, overscroll-behavior, visibilitychange, 8s annulus exit lock)
- src/audio.js (procedural Web Audio API synthesizer, FM squeaks, rustles, splashes, 12s acoustic lure)
- src/ui.js (onboarding carousel, customization deck, wake lock, session timer)
- src/camera.js (Pounce-Cam getUserMedia, offscreen canvas, IndexedDB storage, gallery modal)
- PWA assets (sw.js, manifest.json, icons)
Identify code layout, interfaces, shared contracts, and step-by-step refactoring/modularization path.
Boundary: Read-only explorer. Deliver findings in handoff.md and notify parent via send_message.
