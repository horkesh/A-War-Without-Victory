# Tactical Sandbox 3D Map — Gameplay Programmer Assessment

**Date:** 2026-02-20  
**Reference:** docs/30_planning/TACTICAL_SANDBOX_3D_MAP_IMPLEMENTATION.md (§3.4 Sandbox Turn Pipeline, §4 Mechanics, §6.2 Porting to Canon)  
**Role:** Gameplay Programmer (phase logic, state, simulation behavior per phase specs and Systems Manual)

---

## 1. Gaps: 7-step subset vs full canon pipeline

The sandbox runs a **7-step subset**: processDeploymentStates (sandbox-only), applyPostureOrders, processBrigadeMovement, degradeEquipment, applyBrigadePressureToState, resolveAttackOrders, applyWiaTrickleback. The **full canon Phase II pipeline** (src/sim/turn_pipeline.ts) has 30+ steps. The following gaps can cause wrong or inconsistent behavior if the 3D map is treated as canon-equivalent or if state is ever merged with the main game:

| Gap | Risk |
|-----|------|
| **Recruitment** (phase-ii-recruitment) | No accrual of capital/equipment; no ongoing mandatory/elective recruitment. Pools and faction resources never grow; state diverges from canon after a few turns. |
| **Reinforcement** (phase-ii-brigade-reinforcement) | Brigades never receive personnel from militia pools after combat. Depleted brigades stay depleted. |
| **Displacement** (phase-ii-hostile-takeover-displacement, phase-ii-minority-flight) | No displacement on control flip; no takeover timers, camps, or minority flight. Population and displacement_state wrong. |
| **Consolidation flips** (phase-ii-consolidation-flips) | Municipal consolidation (pressure-eligible flips) not applied; control can be inconsistent with canon. |
| **AoR validate / rebalance / contiguity / surrounded-reform** | No validate-brigade-aor, enforce-brigade-aor-contiguity, enforce-corps-aor-contiguity, surrounded-brigade-reform. AoR can become invalid, non-contiguous, or encircled brigades never reform (no HQ reset to main territory or inactive). |
| **Apply municipality orders & AoR reshaping** | apply-municipality-orders, apply-aor-reshaping not run. Player/corps municipality and AoR reshape orders are never applied. |
| **Formation lifecycle & HQ sync** | No update-formation-lifecycle, formation-hq-relocation, formation-hq-aor-depth-sync. Brigade HQ not moved to depth-2; forming→active and supply-driven lifecycle not updated. |
| **Corps / OG** | No update-corps-effects, advance-corps-operations, activate-operational-groups, update-og-lifecycle. Corps stance and OG activation have no effect. |
| **Posture costs** (apply-posture-costs) | Cohesion and fatigue not updated by posture; formation state drifts. |
| **Encirclement** (detect-brigade-encirclement) | brigade_encircled never set. Encircled brigades are not blocked from movement or penalized (garrison ×0.8, cohesion -5). |
| **Consolidation / supply / exhaustion** (phase-ii-consolidation, front-emergence, recon-intelligence) | No supply pressure, exhaustion, or recon; derived state missing for any UI or later steps that depend on it. |

**Conclusion:** The 7-step subset is suitable only for a **self-contained sandbox** (tactical toy, same engine functions but not canon-equivalent). Any integration that shares state with the main game or persists saves must use the full pipeline, not this subset.

---

## 2. Movement “pre-claim”: canon vs sandbox-only

**Current behavior:** The sandbox pre-claims uncontrolled settlements along the movement path for the moving faction before calling `processBrigadeMovement()`, so the engine’s BFS can find a path (canon BFS only traverses faction-controlled territory).

**Canon:** In `src/sim/phase_ii/brigade_movement.ts`, `shortestPathThroughFriendly()` and order validation require `political_controllers[sid] === factionId` for every node on the path and for all destination settlements. So **movement is through friendly (faction-controlled) territory only**. Phase II spec §5 and §7.1 do not explicitly say “no movement through uncontrolled”; the implementation and file comment (“pathfinding through friendly territory only”) define the rule.

**Recommendation:** **Keep pre-claim sandbox-only.** Do not make it canon unless Phase II and the Systems Manual are explicitly amended to define movement through uncontrolled territory (e.g. “march through neutral” with a defined rule and ordering). Making pre-claim canon would (1) change control semantics (implicit claim on path) and (2) require a clear rule for when/how uncontrolled is claimed and how it interacts with displacement and consolidation. Until then, the main game should continue to use **friendly-only** pathfinding; the 3D sandbox remains a special case where all settlements start uncontrolled and pre-claim is a workaround for that setup.

---

## 3. Cleaner way to share “one turn advance” (2D vs 3D)

**Requirement:** One authoritative turn advance; determinism and step ordering preserved; 2D and 3D maps stay consistent.

**Option A — Single runTurn in main process; maps only render state (recommended):**  
- Main process holds canonical state. On “Advance Turn,” only the main process runs the full pipeline (`runTurn()` in desktop_sim → turn_pipeline).  
- 2D and 3D maps are **view-only**: they receive state via IPC (`game-state-updated`) and render it; they send orders (movement, attack, posture, AoR) to main via IPC; they do **not** run the turn pipeline.  
- Determinism and ordering are preserved because there is a single execution of the pipeline.  
- If the 3D map is embedded as a second window (e.g. tactical + 3D), both windows get the same state after each advance.

**Option B — 3D map runs same full pipeline in renderer:**  
- 3D renderer (or a worker) runs the same `runTurn()` with identical inputs (graph, edges, seed, state). Same code path and step order.  
- Drawback: two places can advance state (main and 3D) if both expose an advance button; requires strict discipline and/or disabling advance in 3D when running under desktop.  
- Use only if 3D must work standalone without a main process (e.g. browser-only); then document that the same pipeline and inputs are used for determinism.

**Recommendation:** **Option A.** Main process owns state and runs `runTurn` once per advance; 2D and 3D maps only render state and submit orders. Disable or remove turn advance in the 3D map when it is used as a companion to the desktop app so the single source of truth is clear.

---

## 4. Implementation recommendations and canon changes

**Implementation**

- **Do not use the 7-step sandbox pipeline for canonical saves or for state shared with the main game.** Treat the sandbox as a prototype: same engine functions (resolveAttackOrders, processBrigadeMovement, etc.), but a subset of steps and sandbox-only mechanics (deployment states, pre-claim).
- **Integration:** Use a single turn advance in the main process. On “Advance Turn,” main runs the full `runTurn()` and broadcasts the new state; 2D and 3D maps only consume and render that state. If 3D is shown alongside the 2D tactical map, do not run a separate pipeline in the 3D window; remove or hide its own “Advance Turn” when running under desktop.
- **Documentation:** In TACTICAL_SANDBOX_3D_MAP_IMPLEMENTATION.md (or Systems Manual), document the 7-step subset and the list of missing steps (recruitment, reinforcement, displacement, AoR/rebalance/contiguity/surrounded-reform, consolidation, encirclement, etc.) so the sandbox is clearly “same engine, subset of steps, not canon-equivalent.”

**Phase II / Systems Manual**

- **Phase II spec:** Add an explicit sentence that brigade movement pathfinding uses **only faction-controlled (friendly) settlements**; movement through uncontrolled territory is not defined in the current canon. If “march through uncontrolled” is ever adopted, add a dedicated clause (e.g. claim-on-arrival vs pre-claim, ordering, and interaction with displacement).
- **Systems Manual (§6 or movement section):** State that brigade movement is restricted to friendly-controlled territory per `shortestPathThroughFriendly`; destination settlements must be faction-controlled when the order is applied. This aligns the written canon with the implementation and avoids treating sandbox pre-claim as canon.

---

*Gameplay Programmer assessment for Paradox convene; determinism and ordering preserved; no new mechanics invented.*
