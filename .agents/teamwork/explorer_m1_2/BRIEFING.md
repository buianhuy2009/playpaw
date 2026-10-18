# BRIEFING — 2026-10-18T09:41:30Z

## Mission
Investigate and design the exact mathematical and kinematic specifications for Milestone 1 Margin Repulsion Field, perimeter dead zones, steering acceleration, high-speed hard clamping, and coordinate transforms.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, kinematic & physics modeling, specification design
- Working directory: /Users/buianhuy/.gemini/antigravity/scratch/pawplay/.agents/teamwork/explorer_m1_2/
- Original parent: 46512a29-cba5-437c-ab6d-761bb6fb87d0
- Milestone: Milestone 1 - Margin Repulsion Field & Kinematics

## 🔒 Key Constraints
- Read-only investigation — do NOT modify source code files
- Coordinate transforms between CSS viewport, HTML canvas backing store, and logical simulation units
- Perimeter dead-zone boundaries: Top 72px, Bottom 72px, Sides 48px
- Smooth inward steering acceleration vector when entering buffer zone
- Hard clamping boundary condition ensuring no sprite penetrates margin even at Ludicrous speed (1200px/s)
- Deliver findings in handoff.md and notify orchestrator via send_message

## Current Parent
- Conversation ID: 46512a29-cba5-437c-ab6d-761bb6fb87d0
- Updated: 2026-10-18T09:37:35Z

## Investigation State
- **Explored paths**:
  - `ORIGINAL_REQUEST.md`: R1 & Acceptance criteria on margin penetration
  - `IMPLEMENTATION_PLAN.md`: Workstream 1 margin repulsion field & speed definitions
  - `teamwork_preview_orchestrator_1/PROJECT.md`: Engine interface contract & feature definitions
  - `explorer_survey_1/handoff.md`: Monolithic prototype inspection & architectural contract
  - `index.html`: Existing edge collision logic (lines 272-273) with 0px margin defect
  - Inline simulations: Multirate dt simulation (120Hz down to 20Hz), 100k step kinematic stress test, multi-device screen suite, and 1200 px/s adversarial penetration tests
- **Key findings**:
  - Existing prototype bounces off 0px edges (`this.x < this.radius`), allowing sprite body directly against browser tabs and OS bars.
  - Safe boundary center bounds require factoring sprite radius $R$: $X \in [48+R, W-48-R]$, $Y \in [72+R, H-72-R]$.
  - Smooth inward steering field using cubic Hermite smoothstep $S(\eta) = 3\eta^2 - 2\eta^3$ combined with velocity-dependent damping $a_{\text{damp}} = k_{\text{damp}} v_{\text{toward}} S(\eta)$ gently turns sprites before contact at $A_{\max} = 7500\text{ px/s}^2, k_{\text{damp}} = 12\text{ s}^{-1}, D_{\text{buffer}} = 100\text{px}$.
  - Continuous Collision Detection (CCD) swept-step calculation ($t_{\text{hit}} = (X_{\min}-x)/v_x$) + restitution ($e = 0.5$) + failsafe hard projection guarantees mathematically zero margin penetration (0.0000px) even at 1200 px/s with 50ms lag spikes.
  - Coordinate transformations formalize Viewport Client $\leftrightarrow$ Logical Simulation Space (1:1 with CSS px) $\leftrightarrow$ Canvas Backing Store (`dpr` scaled).
- **Unexplored areas**: None for M1 Kinematics; all parameters tested and validated.

## Key Decisions Made
- Define safe margin as physical perimeter dead zone: Top 72px, Bottom 72px, Sides 48px.
- Use 3-tiered defense: (1) Smoothstep potential field with velocity damping, (2) Swept-step Continuous Collision Detection (CCD) integration, (3) Hard clamping projection failsafe.
- Standardize all gameplay physics and hit detection on Logical Simulation Coordinates (CSS pixels) scaled to canvas backing store by `devicePixelRatio` clamp `Math.min(window.devicePixelRatio || 1, 2)`.

## Artifact Index
- DISPATCH.md — dispatch message record
- progress.md — liveness heartbeat
- handoff.md — final handoff report
