# PawPlay Project Plan

## Objective
Upgrade PawPlay from a single-file prototype into a polished, biological-calibrated web application for cats based on PROJECT_PLAN.md and IMPLEMENTATION_PLAN.md, featuring an active Browser Tab Defense Shield, Pounce-Cam reaction engine, full-screen first-time onboarding, automated Vercel MCP deployment to playpaw.vercel.app, autonomous 3-Pass Rule verification, and continuous Section 9 documentation.

## Milestones & Workstreams
- **Phase 0: Survey & Scope Mapping**
  - Parallel Explorers assess current prototype (`index.html`), environment, assets, and requirements.
  - Establish `PROJECT.md` at project root with Feature Inventory, Architecture, and Interface Contracts.
- **Phase 1: Dual Track Execution**
  - **Track A: E2E Testing Track**
    - E2E Test infrastructure & runner (`TEST_INFRA.md`).
    - Test suites: Tier 1 (Feature Coverage), Tier 2 (Boundary & Corner Cases), Tier 3 (Cross-Feature Combinations), Tier 4 (Real-World Scenarios).
    - Publish `TEST_READY.md`.
  - **Track B: Modular Implementation Track**
    - M1: Core Engine, 120Hz Delta-Time Loop, Contrast Themes & Margin Physics (`src/engine.js`).
    - M2: 5-State Biomimetic Prey AI & High-Fidelity Sprites (`src/prey.js`).
    - M3: Capacitive Raycast Touch, Static Paw Filter & Tab Defense Shield (`src/input.js`, `src/defense.js`).
    - M4: Procedural Web Audio API Synthesizer & 12s Acoustic Lures (`src/audio.js`).
    - M5: First-Time Onboarding Carousel & Customization Deck (`src/ui.js`).
    - M6: Pounce-Cam Reaction Snapshot Engine & IndexedDB Gallery (`src/camera.js`).
    - M7: Vercel MCP Deployment (`vercel.json`, Service Worker, git commit, deployment to playpaw.vercel.app).
- **Phase 2: Final Verification & Hardening**
  - Run comprehensive E2E tests across all tiers.
  - Phase 2 Adversarial Coverage Hardening (Tier 5).
  - 3-Pass Chrome DevTools Verification (navigate, evaluate_script, take_screenshot, zero console errors/warnings).
  - Update Section 9 of `PROJECT_PLAN.md` with full logs, architectural decisions, and live URLs.
  - Send completion report to Sentinel.
