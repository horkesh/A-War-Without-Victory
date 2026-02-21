# PM Assessment: Tactical Sandbox 3D Map Implementation Plan

**Date:** 2026-02-20  
**Subject:** docs/30_planning/TACTICAL_SANDBOX_3D_MAP_IMPLEMENTATION.md — scope, phasing, canon handoff  
**For:** Paradox convene report inclusion

---

## 1. Scope and Phased Delivery (Section 6 — Replacing 2D with 3D)

### MVP (first shippable 3D integration)

- **3D view parity:** Terrain mesh + base texture, faction overlay, formation counters (NATO sprites), settlement/formation picking — fed from **same** data and IPC as current 2D map (`LoadedGameState`, `game-state-updated`, `GameStateAdapter`). No new mechanics.
- **Single decision:** 3D as **optional view** (toolbar toggle 2D/3D) vs **full replacement** (remove 2D). Plan does not specify; this drives scope and risk (see below).
- **Acceptance:** All current 2D features that affect gameplay (control, formations, AoR highlight, orders, panels) available and correct in 3D; determinism and replay unchanged.

### Later (post-MVP)

- AoR overlay with front-line teeth (nice-to-have for clarity; 2D has equivalent).
- Movement radius overlay and multi-click move destination (canon mechanics — see §3).
- Deploy/undeploy as canon player actions (spec + IPC + UI).
- Full BiH at 3D (plan notes “may need dynamic resolution”; sandbox uses region cropping — performance risk if not phased).
- Staff Map, replay scrubber, recruitment modal, etc.: either reuse existing 2D panels over 3D viewport or port later.

### Main risks to schedule/scope

- **No phased cut:** Section 6 mixes (a) “port 3D rendering into main game” and (b) “port sandbox mechanics to canon” in one integration blob. Doing both in one phase is high scope; handoff is unclear.
- **Integration path underspecified:** Unclear whether we **embed** the 3D viewer inside current MapApp (replace canvas with WebGL viewport, reuse panels/state wiring) or **rewrite** MapApp around 3D. MapApp is large (~2,600+ lines per TACTICAL_MAP_SYSTEM); “critical code to port” list does not say who owns the merged codebase or how 2D and 3D share state.
- **Data flow gap:** Sandbox uses `loadSliceData` → `SliceData` → `sliceToGameState`. Main game uses IPC/file → `LoadedGameState`. Section 6 does not state how the 3D view gets `LoadedGameState` and how often textures/overlays rebuild (e.g. on `game-state-updated` only).
- **Full-map performance:** Sandbox is region-cropped; “dynamic resolution for full BiH” is deferred. If MVP is “full map in 3D,” that may slip until cropping or LOD is decided.

---

## 2. Pushback: Over-Scope and Under-Spec

### Over-scope

- **Two phases in one:** “Replacing 2D canvas with 3D” (Section 6.1) and “Porting sandbox mechanics to canon” (Section 6.2) should be **separate phases**. Phase 1: 3D view of **current** canon (same features as 2D, same IPC, same panels). Phase 2: Canonize deploy/undeploy, movement radius UI, multi-click move, front teeth; then port those to the 3D (or shared) UI. Otherwise integration becomes a single large deliverable with no intermediate milestone.
- **No 2D fallback decision:** If we replace 2D entirely, we lose a fallback for performance/accessibility. If we keep both, we double maintenance unless 3D is clearly “default” and 2D “legacy.” Plan should require an explicit product decision here.

### Under-spec for handoff

- **Ownership:** No handoff note on who owns the integrated map (e.g. graphics-programmer for rendering, gameplay-programmer for mechanics, UI/UX for panels). Canon propagation (TACTICAL_MAP_SYSTEM, DESKTOP_GUI_IPC_CONTRACT) is not mentioned in the plan.
- **Done criteria:** No acceptance criteria for “integration complete” (e.g. “all TACTICAL_MAP_SYSTEM §2 features work in 3D” or “determinism test matrix unchanged”).
- **Determinism:** Sandbox inherits engine determinism; plan does not say how we verify that 3D integration (texture build order, render order, overlay updates) does not introduce nondeterminism.

### More elegant phasing proposal

1. **Phase 6A — 3D view only:** Embed 3D viewer in MapApp (or new route) with same `LoadedGameState` and IPC. Terrain + faction + formations + picking; existing panels and order staging unchanged. Ship as optional 2D/3D toggle. **Exit:** Playable 3D map with current canon behavior.
2. **Phase 6B — Canon mechanics:** In **canon** (Phase II spec, Systems Manual, TACTICAL_MAP_SYSTEM, DESKTOP_GUI_IPC_CONTRACT): define deploy/undeploy as player actions, movement radius as required UI, multi-click move and contiguity rules. Add any new IPC (e.g. deploy/undeploy) and pipeline steps. **Exit:** Spec and engine support new mechanics; 2D map can show move radius and deploy/undeploy if desired.
3. **Phase 6C — 3D mechanics parity:** Port movement radius overlay, deploy/undeploy UI, multi-click move, front teeth from sandbox to the integrated 3D (or shared) view. **Exit:** 3D matches 2D plus new canon mechanics.

---

## 3. Canon Mechanics: What the Plan Covers vs Missing for Handoff

User-called-out mechanics: **AoR reshaping, deploying/undeploying brigades, movement, GUI elements (e.g. seeing how far you can move).**

| Mechanic | Plan coverage | Missing for clear canon handoff |
|----------|----------------|----------------------------------|
| **AoR reshaping** | Canon already has `stage-brigade-aor-order` and `aor_reshaping` / municipality orders. Sandbox “AoR expansion on deploy” is a **different** mechanic (expand from 1→N on deploy). | Plan does not explicitly say “AoR transfer UI in 3D” in Section 6; 2D already has it. For 3D handoff: confirm AoR transfer remains available in 3D (same IPC, same panel or equivalent). |
| **Deploying/undeploying brigades** | §4.2 and §6.2 describe state machine and mapping to `BrigadeMovementStatus`. | **Canon docs:** No update to Phase II spec or Systems Manual that deploy/undeploy is an official player action. **IPC:** DESKTOP_GUI_IPC_CONTRACT has no deploy/undeploy channel. **Pipeline:** Clarify whether a dedicated step or existing movement step applies deployment orders. Plan covers design and code port but not “add to TACTICAL_MAP_SYSTEM + DESKTOP_GUI_IPC_CONTRACT.” |
| **Movement** | §4.3 and §6.2 cover flow, validation, multi-click, contiguity, pre-claim BFS. Engine has `processBrigadeMovement`; desktop has `stage-brigade-movement-order`. | **Path claiming:** Sandbox “pre-claim BFS” (claim uncontrolled along path) is called out as sandbox-only (§4.8). For canon handoff, decide: movement only through **faction-controlled** territory, or add “claim along path” to canon and document. Plan does not resolve this. |
| **GUI — “how far you can move”** | **Well covered:** `computeReachableSettlements`, movement radius overlay, port to main UI in §6.2. | None for handoff; ensure TACTICAL_MAP_SYSTEM (or GUI blueprint) states that “movement radius / reachable settlements” is the canonical UX for move orders. |

**Summary:** Movement radius and movement flow are well specified for implementation. For **canon handoff** we need: (1) explicit canon doc updates (Phase II, Systems Manual, TACTICAL_MAP_SYSTEM, IPC contract) for deploy/undeploy and movement radius; (2) resolution of “movement through uncontrolled” (canon or not); (3) AoR transfer UI explicitly in scope for 3D (or “reuse 2D panel”).

---

## 4. Recommended Priority, Sequencing, and Next Step

**Priority and sequencing:** Treat “3D view” and “canon mechanics” as two tracks. **First:** Ship 3D as an optional view with full parity to the current 2D map (same state, same IPC, same panels). That delivers visible 3D without committing to a single “replace 2D” big-bang. **Second:** Canonize deploy/undeploy and movement-radius (and, if desired, multi-click move and front teeth) in specs and engine, and expose them in the 2D map so both 2D and 3D share one source of truth. **Third:** Port those mechanics into the 3D view so 3D matches 2D plus the new canon behavior. This order keeps integration testable at each step and avoids a single oversized “3D + new mechanics” release.

**Single next step for team agreement:** Decide and document (in the plan or a short decision memo): **(1)** Whether 3D is an **optional view** (2D/3D toggle) or a **full replacement** for 2D, and **(2)** Whether **canon mechanics** (deploy/undeploy, movement radius as required UI) are added to the Phase II spec and DESKTOP_GUI_IPC_CONTRACT **before** or **after** the first 3D view ships. That decision unblocks scope (toggle vs replacement) and sequencing (mechanics first vs view first) for the integration work.

---

*Product Manager assessment for Paradox convene; not an implementation commitment.*
