# Soft Handoff: Project Orchestrator (Generation 1 -> Generation 2)

- **Date**: 2026-10-18T10:13:00Z
- **Author**: `teamwork_preview_orchestrator_1` (Project Orchestrator, Gen 1)
- **Successor**: `teamwork_preview_orchestrator_2` (Gen 2)
- **Parent Conversation ID**: `02d566d0-53e1-478a-b46e-26e4ef5ebe91` (Sentinel)
- **Project Root**: `/Users/buianhuy/.gemini/antigravity/scratch/pawplay`
- **Orchestrator Workspace**: `/Users/buianhuy/.gemini/antigravity/scratch/pawplay/.agents/teamwork/teamwork_preview_orchestrator_1/`

---

## 1. Observation & Completed Work

### Phase 0: Survey & Scope Mapping (COMPLETED)
- Dispatched 3 parallel survey explorers (`spec_miner_survey_1`, `explorer_survey_1`, `explorer_survey_2`).
- Generated authoritative `PROJECT.md` at `/Users/buianhuy/.gemini/antigravity/scratch/pawplay/.agents/teamwork/teamwork_preview_orchestrator_1/PROJECT.md` capturing all 53 discrete features, 7 milestones, and cross-module interface contracts.

### Dual Track: E2E Testing Track (COMPLETED & READY)
- Dispatched `test_writer_e2e_1`.
- Published `TEST_INFRA.md` and `TEST_READY.md` at project root.
- Created `tests/e2e_runner.html`, `tests/run_tests.js`, harness, and suites for Tiers 1–4 (156 automated test cases).
- 100% of 156 tests passing in Node CLI (28ms) and Chrome DevTools MCP browser (46ms).

### Milestone 1: Core Engine, 120Hz Loop & Contrast Themes
- **Iteration 1**:
  - Explored by `explorer_m1_1`, `explorer_m1_2`, `explorer_m1_3`.
  - Implemented in `src/engine.js` by `worker_m1_1`.
  - Verified by 5 gate agents:
    * `reviewer_m1_1`: APPROVE
    * `reviewer_m1_2`: REQUEST_CHANGES (window listener guards, NaN sanitization)
    * `challenger_m1_1`: APPROVE (890k steps, 0 violations at 3000 px/s)
    * `challenger_m1_2`: REQUEST_CHANGES (orientationchange memory leak, start() rAF concurrency)
    * `auditor_m1_1`: CLEAN (zero cheating, zero dummy facades)
  - Gate Result: **FAIL** on 4 specific review/challenge findings.
- **Iteration 2 Exploration**:
  - Dispatched 3 targeted explorers:
    * `explorer_m1_iter2_1`: Formulated window listener attachment & detachment guards.
    * `explorer_m1_iter2_2`: Formulated airtight NaN coordinate & radius sanitization in `applySafeMargins`.
    * `explorer_m1_iter2_3`: Formulated orientationchange cleanup and `start()` loop idempotency guard, verified against `tests/engine_stress_benchmark.mjs` with patch at `.agents/teamwork/explorer_m1_iter2_3/engine_fixes.patch`.

---

## 2. Milestone State

| # | Milestone | Status | Key Outputs / Location |
|---|-----------|--------|------------------------|
| E2E | E2E Testing Track | **DONE** | `TEST_INFRA.md`, `TEST_READY.md`, `tests/` (156 tests passing) |
| M1 | Engine & Physics | **IN_PROGRESS (Iteration 2)** | `src/engine.js` implemented; 4 targeted fixes ready for worker |
| M2 | Prey AI & Sprites | **PLANNED** | Ready to dispatch after M1 gate passes |
| M3 | Input & Tab Defense | **PLANNED** | Ready to dispatch after M1 |
| M4 | Procedural Audio | **PLANNED** | Independent module, can run concurrent with M2/M3 |
| M5 | Onboarding & UI Deck | **PLANNED** | Depends on M1, M2, M4 |
| M6 | Pounce-Cam & Integration | **PLANNED** | Full wiring of index.html shell |
| M7 | PWA & Vercel MCP Deploy | **PLANNED** | Deploy to https://playpaw.vercel.app |
| Final | 100% E2E + 3-Pass Rule | **PLANNED** | Zero console warnings/errors, Section 9 docs |

---

## 3. Active Subagents & Threshold
- Cumulative spawn count: 16 / 16 (Succession threshold reached).
- All 16 subagents have completed and delivered reports.
- Zero pending subagents.

---

## 4. Immediate Concrete Next Steps for Successor (Gen 2)

1. **Milestone 1 Iteration 2 Implementation**:
   - Spawn a Worker (`worker_m1_2`) with exclusive ownership of `src/engine.js`.
   - Provide the worker with the 3 Iteration 2 explorer blueprints:
     * `/Users/buianhuy/.gemini/antigravity/scratch/pawplay/.agents/teamwork/explorer_m1_iter2_1/handoff.md`
     * `/Users/buianhuy/.gemini/antigravity/scratch/pawplay/.agents/teamwork/explorer_m1_iter2_2/handoff.md`
     * `/Users/buianhuy/.gemini/antigravity/scratch/pawplay/.agents/teamwork/explorer_m1_iter2_3/handoff.md` (and `engine_fixes.patch`)
   - Worker applies the 4 fixes to `src/engine.js`:
     1. Guard `window.removeEventListener` and `window.addEventListener` with `typeof window !== 'undefined' && typeof window.removeEventListener === 'function'`.
     2. Add `NaN` coordinate and radius sanitization in `applySafeMargins(sprite, dt)`.
     3. Attach/detach bound `this._onOrientationChange` in `init()` / `destroy()`.
     4. Add `if (this.isPlaying) return;` at top of `start()`.
   - Run tests: `node tests/run_tests.js` (must pass 156/156) and `node --expose-gc tests/engine_stress_benchmark.mjs` (must pass all 9 benchmarks).
2. **Milestone 1 Gate Iteration 2**:
   - Dispatch 2 Reviewers, 2 Challengers, and 1 Forensic Auditor (`teamwork_preview_auditor`).
   - If all APPROVE and auditor is CLEAN -> Mark M1 **DONE** in `PROJECT.md` and `progress.md`.
3. **Dispatch Downstream Milestones**:
   - Milestone 2: 5-State Biomimetic Prey AI & Sprites (`src/prey.js`).
   - Milestone 3: Capacitive Raycast Touch & Tab Defense Shield (`src/input.js`, `src/defense.js`).
   - Milestone 4: Procedural Web Audio API Synthesizer (`src/audio.js`).
   - Milestone 5: Onboarding Carousel & Customization Deck (`src/ui.js`, `src/state.js`).
   - Milestone 6: Pounce-Cam & Full App Wiring (`src/camera.js`, `index.html`).
   - Milestone 7: Vercel MCP Deployment (`vercel.json`, `sw.js`, deployment to https://playpaw.vercel.app under team `team_i6w55Xr6YiuTbLK4AOxUv2le`).
   - Final Milestone: Pass 100% E2E tests + Tier 5 Hardening + Chrome DevTools 3-Pass Rule Verification + Section 9 Documentation in `PROJECT_PLAN.md`.

---

## 5. Key Decisions & Hard Constraints
- Vercel MCP: Omit `teamId` in tool calls; user default team is already `team_i6w55Xr6YiuTbLK4AOxUv2le` (slug `an-huy`).
- Orchestrator rules: NEVER write source code directly. Write only to `.agents/teamwork/` metadata files. Delegate all implementation and test execution to workers.
- Auditor veto is BINARY: never advance milestone if auditor reports INTEGRITY VIOLATION.
