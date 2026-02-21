# Canon Compliance Review: Tactical Sandbox 3D Map Implementation

**Document reviewed:** `docs/30_planning/TACTICAL_SANDBOX_3D_MAP_IMPLEMENTATION.md`  
**Reviewer:** Canon Compliance Reviewer (Paradox subagent)  
**Date:** 2026-02-20  
**Context:** User requested that selected mechanics (AoR reshaping, deploy/undeploy brigades, movement, GUI elements such as movement radius) be canonized; this review maps each to canon and proposes how to do that, flags conflicts, and gives a verdict.

---

## 1. Mechanic-by-mechanic: current location and canonization recommendation

| Mechanic | Where it currently lives | What "canonizing" means | Recommendation |
|----------|--------------------------|--------------------------|----------------|
| **AoR reshaping** | **Phase II spec** §5 (pipeline: apply-aor-reshaping), §7.1 (brigade AoR at entry, municipality + settlement layers). **Systems Manual** §2.1, §6.2 (municipality movement orders, settlement reshape orders, validation, cohesion costs). **DESKTOP_GUI_IPC_CONTRACT:** `stage-brigade-aor-order`. | (a) Already normative in Phase II and Systems Manual. (c) IPC and map system already reference it. Sandbox adds "AoR expansion on deploy" (HQ + adjacent, cap min(4, max(1, floor(personnel/400)))) — that part is **new** and tied to deploy/undeploy. | **(a)** Keep existing Phase II / Systems Manual §6.2 as-is. **(b)** Add implementation-note that sandbox "expansion on deploy" is a deploy-state effect; if deploy/undeploy is canonized, add one sentence to Systems Manual §6.2 or new §6.x that deployed AoR may expand to HQ + adjacent (personnel cap 1–4) on completion of deploy. |
| **Deploying and undeploying brigades** | **Sandbox doc only** (§4.2). Canon: **Systems Manual** §6 has posture and AoR, no deploy/undeploy state machine. Code has `BrigadeMovementStatus` (packed / in_transit / unpacked) in `brigade_movement.ts`; no "deploying"/"undeploying" or dual movement rates in Phase II spec or Systems Manual. | (a) Add to Phase II and Systems Manual as normative: states (undeployed/deploying/deployed/undeploying), 1-turn transitions, movement rate 6 (undeployed) vs 3 (deployed). (b) Add as implementation-note only (sandbox convention mapping to packed/unpacked). | **(a)** if the team wants deploy/undeploy as a first-class player-facing mechanic (same rules for 3D sandbox and main tactical map). **(b)** if this remains a sandbox-only UX abstraction; then add one implementation-note in Systems Manual §6 referencing the plan and mapping to packed/unpacked. |
| **Movement** | **Phase II spec** §5: apply-municipality-orders; §7.1: brigade_mun_orders. **Systems Manual** §6.2: municipality movement orders. **DESKTOP_GUI_IPC_CONTRACT:** `stage-move-order` (mun), `stage-brigade-movement-order` (1–4 contiguous settlements). **Code:** `processBrigadeMovement`, `shortestPathThroughFriendly` (friendly-only). Pipeline consumes `brigade_movement_orders`; not explicitly listed in Phase II spec §5. | (a) Add to Phase II / Systems Manual: settlement-level movement orders, pathfinding rule (friendly-only vs friendly+uncontrolled), movement rate, contiguity and max settlements. (c) IPC already defines staging; add that UI shows reachable set. | **(a)** Phase II spec: add pipeline step that consumes `brigade_movement_orders` (processBrigadeMovement) and state field to §4.3; Systems Manual §6: add movement (settlement-level orders, path through friendly-only, rate 3 or 6 by deploy state). **(c)** TACTICAL_MAP_SYSTEM + DESKTOP_GUI_IPC_CONTRACT: require that map shows movement radius / reachable set when placing movement orders. **Conflict:** Plan uses BFS through friendly/**uncontrolled** and "pre-claim" — see §2 below. |
| **GUI elements (e.g. seeing how far you can move)** | **TACTICAL_MAP_SYSTEM:** Phase K "Move brigade here", order targeting, formation panel; no movement radius or reachable-set visualization. **DESKTOP_GUI_IPC_CONTRACT:** `stage-brigade-movement-order` validation (1–4 contiguous, same-faction). | (c) Add to TACTICAL_MAP_SYSTEM and DESKTOP_GUI_IPC_CONTRACT: when placing movement orders, the map must show reachable settlements (or movement radius) using the same BFS/rate rules as the engine. | **(c)** Add to TACTICAL_MAP_SYSTEM §2 (or a dedicated GUI requirements subsection): "Movement order mode: show reachable settlements (or movement radius) for selected brigade, using same depth limit and territory rule as engine." DESKTOP_GUI_IPC_CONTRACT: note that main process validates reachability (BFS, friendly-only unless canon amended) when validating `stage-brigade-movement-order`. |

---

## 2. Conflicts with existing canon and suggested resolution

| Issue | Plan statement | Canon / code | Suggested resolution |
|-------|----------------|--------------|----------------------|
| **Movement through uncontrolled territory** | §4.3: "BFS from brigade's current AoR settlements through **friendly/uncontrolled** territory"; "Pre-claim BFS in turn advance: … sandbox **claims uncontrolled settlements** along the movement path for the moving faction"; "necessary because the canon engine's BFS only traverses **faction-controlled** territory." | **Code:** `shortestPathThroughFriendly` in `brigade_movement.ts`: pathfinding is **friendly-controlled only** (`pc[n] !== factionId` → skip). No "pre-claim" or uncontrolled traversal in engine. | **Option A (recommended):** Treat pre-claim and BFS-through-uncontrolled as **sandbox-only**. Plan §4.8 already lists "Movement pre-claim: BFS claims uncontrolled path" under Sandbox. Do **not** add movement through uncontrolled to Phase II or Systems Manual. When porting to main game (§6.2), use engine as-is: path must be through **friendly-controlled** settlements only; no pre-claim. **Option B:** If design intends main game to allow movement through uncontrolled: amend Phase II and Systems Manual to allow BFS through friendly + uncontrolled, and add a canonical "pre-claim" or control-transfer rule for path settlements; then update `shortestPathThroughFriendly` (or add a new pathfinder) and document determinism. |
| **AoR caps** | Plan: deployed AoR and move destinations capped at `min(4, max(1, floor(personnel/400)))`. | **Code:** `formation_constants.ts`: PERSONNEL_PER_SETTLEMENT_SLOT 400, same 1–4 formula. **Systems Manual:** No explicit 1–4 settlement cap; §2.1 mentions density and operational coverage. **BRIGADE_OPERATIONAL_AOR_HARD_CAP** (48) is operational coverage (different layer). | No contradiction. Optionally add one sentence to Systems Manual §2.1 or §6: settlement-level AoR (and movement destination count) cap per brigade = min(4, max(1, floor(personnel/400))). |
| **Deployment transitions** | Plan: 1-turn "deploying" and "undeploying"; on completion AoR expands (deploy) or contracts to HQ (undeploy). | Phase II spec and Systems Manual do not define deploy/undeploy or 1-turn transitions. Code has packed → in_transit → unpacked only. | No conflict — canon is silent. If canonizing: add deploy/undeploy states and 1-turn transitions to Phase II §4.3 (state) and Systems Manual §6; align pipeline with `processDeploymentStates()`-style step or document that deploy/undeploy is a sandbox mapping onto packed/unpacked. |

---

## 3. Canon update checklist (after team agreement)

Use this once the team agrees which mechanics are normative and how to resolve movement territory.

- [ ] **Phase II Specification**
  - [ ] §4.3: If deploy/undeploy is canonical: add state (e.g. deployment state or explicit mapping from BrigadeMovementStatus) and movement rates (6 undeployed, 3 deployed).
  - [ ] §4.3: Add `brigade_movement_orders` to persisted state list if not already.
  - [ ] §5: Add pipeline step that consumes `brigade_movement_orders` (processBrigadeMovement) and its place relative to apply-municipality-orders and apply-aor-reshaping.
  - [ ] Add one sentence on pathfinding: movement path is through **friendly-controlled settlements only** (or, if Option B in §2: through friendly + uncontrolled, with pre-claim rule).
- [ ] **Systems Manual**
  - [ ] §6: If deploy/undeploy is canonical: add subsection (e.g. 6.2a) Deploy/undeploy states, 1-turn transitions, movement rate 6 vs 3.
  - [ ] §6.2 or §2.1: Optionally add settlement AoR/destination cap formula: min(4, max(1, floor(personnel/400))).
  - [ ] §6: Add settlement-level movement orders: 1–4 contiguous settlements, path through friendly-only (or per Phase II), validation rules.
- [ ] **TACTICAL_MAP_SYSTEM**
  - [ ] Add requirement: when in movement-order mode, show reachable settlements (or movement radius) for the selected brigade using the same depth and territory rules as the engine.
  - [ ] If 3D/sandbox becomes a supported view: add reference to deploy/undeploy UI (DEPLOY/UNDEPLOY buttons, status labels) and movement radius overlay as canonical UX.
- [ ] **DESKTOP_GUI_IPC_CONTRACT**
  - [ ] Under `stage-brigade-movement-order`: state that main process validates reachability (BFS, same depth and territory rule as engine).
  - [ ] If deploy/undeploy is canonical: add IPC or note for deploy/undeploy actions if they are ever exposed (optional).
- [ ] **Planning doc**
  - [ ] In TACTICAL_SANDBOX_3D_MAP_IMPLEMENTATION.md §4.8, make explicit: "Movement pre-claim and BFS through uncontrolled = sandbox only; main game movement remains friendly-only unless canon is amended."

---

## 4. Verdict and single most important canon change

**Verdict:** **Conditional approve.** The plan is consistent with reusing the real engine and can be implemented as written for the sandbox. To canonize the requested mechanics without conflict:

1. **Do not** canonize movement through uncontrolled territory or pre-claim unless the team explicitly amends canon (Phase II + Systems Manual) and engine behavior.
2. **Clarify** in the plan that the sandbox’s "pre-claim BFS" and "friendly/uncontrolled" movement are sandbox-only; main-game movement stays **friendly-only** per current code and canon.
3. **Choose** whether deploy/undeploy is a first-class mechanic: if yes, add it normatively to Phase II and Systems Manual (§6) with states, 1-turn transitions, and movement rates (6/3); if no, add an implementation-note that the sandbox’s deploy/undeploy is a UX mapping to packed/unpacked.

**Single most important canon change to make first:** **Normatively define deploy/undeploy and movement rates in Phase II and Systems Manual §6** (states, 1-turn transitions, movement rate 6 for undeployed/column vs 3 for deployed). That gives one set of rules for both the 3D sandbox and the main tactical map, aligns the sandbox table in §4.2 with canon, and makes "seeing how far you can move" (movement radius / reachable set) a well-defined requirement (same depth and territory rule everywhere). Until that is done, deploy/undeploy and dual movement rates remain sandbox-only and risk divergence between sandbox and main game.

---

*Canon Compliance Reviewer — Paradox convene report section*
