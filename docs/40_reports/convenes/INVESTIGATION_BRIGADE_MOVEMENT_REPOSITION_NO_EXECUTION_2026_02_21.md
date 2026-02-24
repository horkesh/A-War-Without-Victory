# Investigation: Brigade movement and reposition not executing

**Date:** 2026-02-21  
**Issue:** Brigades do not move after move orders and do not reposition after reposition orders (Electron warmap and tactical sandbox).  
**Status:** Root cause identified; fix implemented. tsc + vitest (143 tests) pass.

---

## 1. Data flow (staging → state → pipeline)

### Move orders (settlement-level)

| Stage | Location | Behavior |
|------|----------|----------|
| **Staging (IPC)** | `electron-main.cjs`: `stage-brigade-movement-order` | Validates via `desktop_sim.validateBrigadeMovementOrder`, sets `state.brigade_movement_orders[brigadeId] = { destination_sids: [...sids].sort() }`, clears same brigade from `brigade_mun_orders`, reserializes, broadcasts state. |
| **State keys** | `GameState` | `brigade_movement_orders?: Record<FormationId, { destination_sids: SettlementId[] }>`. Serialized in `serializeGameState.ts`. |
| **Pipeline step** | `turn_pipeline.ts`: **process-brigade-movement** (Phase II) | Calls `processBrigadeMovement(state, edges, terrainData)`. No early-exit on empty orders; step runs every Phase II turn. |

### Reposition orders

| Stage | Location | Behavior |
|------|----------|----------|
| **Staging (IPC)** | `electron-main.cjs`: `stage-brigade-reposition-order` | Validates via `desktop_sim.validateBrigadeRepositionOrder`, sets `state.brigade_reposition_orders[brigadeId] = { settlement_ids: [...sids].sort() }`, reserializes, broadcasts. |
| **State keys** | `GameState` | `brigade_reposition_orders?: Record<FormationId, { settlement_ids: SettlementId[] }>`. |
| **Pipeline step** | `turn_pipeline.ts`: **apply-brigade-reposition** (Phase II) | Runs after apply-aor-reshaping. Calls `applyBrigadeRepositionOrders(state, edges)` when `brigade_reposition_orders` is non-empty. |

### Municipality move orders (separate path)

- **Staging:** `stage-move-order` → `brigade_mun_orders[brigadeId] = [targetMunicipalityId]`.
- **Pipeline:** **apply-municipality-orders** → `applyBrigadeMunicipalityOrders`. Same front-assignment gate does **not** apply (no `isBrigadeAssignedToFront` in that path).

---

## 2. Execution gates (why movement/reposition did not run)

### Front-assignment gate (root cause)

- **Movement:** `src/sim/phase_ii/brigade_movement.ts` — `processBrigadeMovement`:
  - **Pass 0 (deploy/undeploy):** skips brigade if `!isBrigadeAssignedToFront(state, formationId)`.
  - **Pass 1 (apply orders → set packing):** skips brigade if `!isBrigadeAssignedToFront(state, formationId)`.
  - **Pass 2 (advance packing → in_transit → unpacking):** removes from movement state if `!isBrigadeAssignedToFront(state, formationId)`.
- **Reposition:** `src/sim/phase_ii/apply_brigade_reposition.ts` — `applyBrigadeRepositionOrders`: skips brigade if `!isBrigadeAssignedToFront(state, formationId)`.

**`isBrigadeAssignedToFront`** (`front_assignment.ts`):

- Delegates to `hasValidFrontAssignment(state, formationId)`.
- **Backward compat:** if `assignable_front_segments.length === 0` or `brigade_front_assignment` is empty → returns **true** (all brigades “allowed”).
- **When segments exist and assignment map is non-empty:** if this brigade’s assignment is missing or `null` (reserve) → returns **false**.

**When does a brigade get `null` assignment?**

- **ensureBrigadeFrontAssignments** (run in pipeline steps **sync-front-segments** and **ensure-brigade-front-assignment**, and in `refreshFrontEdgeSnapshot`): assigns each brigade to the front segment with best AoR overlap; if **no** AoR overlap with any segment (e.g. rear, or no front edges yet), sets `brigade_front_assignment[brigadeId] = null`.
- So: any brigade with no AoR on a hostile boundary is treated as “reserve” and **fails** `isBrigadeAssignedToFront`, so movement and reposition orders are **never applied**.

### Other gates (not the cause of “no movement”)

- **Phase:** Both steps run only when `context.state.meta.phase === 'phase_ii'`. Desktop advance-turn uses same pipeline for Phase II.
- **Encircled:** Movement skips brigades in `state.brigade_encircled?.[formationId]`.
- **Deployment:** Movement supports both deployed (combat) and column (undeployed); no gate that would prevent all movement.

---

## 3. Desktop vs headless

- **Desktop:** `advance-turn` → `desktop_sim.advanceTurn(state)` → `runTurn(state, { settlementGraph, settlementEdges })`. Full Phase II pipeline runs; **process-brigade-movement** and **apply-brigade-reposition** are in the same step list. Staged orders are in the state passed into `runTurn`.
- **Headless (scenario runner):** Uses same `runTurn` / pipeline; no separate path. Movement/reposition would be gated the same way if state had `assignable_front_segments` and `brigade_front_assignment` (e.g. after first turn or from a saved state).

Conclusion: **same pipeline and same front-assignment gate** in desktop and headless; no desktop-only skip.

---

## 4. Sandbox-specific path

- **Pipeline:** `sandbox_engine.ts` → `advanceSandboxTurn(state, edges, terrain, sidToMun, deploymentStates)`.
- **Movement:** Calls `processBrigadeMovement(state, edges)` when `brigade_movement_orders` is non-empty. **Same** `isBrigadeAssignedToFront` gate applies; if sandbox state has no `assignable_front_segments` / empty `brigade_front_assignment`, gate passes (backward compat).
- **Reposition:** **Not applied.** `advanceSandboxTurn` does **not** call `applyBrigadeRepositionOrders`. So reposition orders are never executed in the tactical sandbox.

---

## 5. Root causes summary

| Cause | Where | Impact |
|-------|--------|--------|
| **Front-assignment gate on movement/reposition** | `processBrigadeMovement` and `applyBrigadeRepositionOrders` require `isBrigadeAssignedToFront`. Brigades with `brigade_front_assignment[id] === null` (reserve) or unassigned are skipped. | **Desktop & headless:** move/reposition never run for reserve or unassigned brigades once fronts exist. |
| **Reposition missing in sandbox** | `advanceSandboxTurn` never calls `applyBrigadeRepositionOrders`. | **Sandbox only:** reposition orders staged but never applied. |

---

## 6. Fixes applied

### 6.1 Allow movement and reposition without front assignment (desktop + headless)

**Design:** Reserve brigades (and brigades not yet assigned to a front) can still receive and execute move and reposition orders; front assignment continues to gate pressure, posture, and battle participation only.

**Code:**

- **`src/sim/phase_ii/brigade_movement.ts`:** Removed the `isBrigadeAssignedToFront` checks from:
  - Pass 0 (deploy/undeploy),
  - Pass 1 (apply movement orders),
  - Pass 2 (advance movement state).
- **`src/sim/phase_ii/apply_brigade_reposition.ts`:** Removed the `isBrigadeAssignedToFront` check so all brigades with valid reposition orders are applied.

No change to `brigade_pressure`, `brigade_posture`, `battle_resolution`, or `bot_brigade_ai`, which still use `isBrigadeAssignedToFront` for their intended behavior.

### 6.2 Apply reposition in sandbox

**`src/ui/map/sandbox/sandbox_engine.ts`:**

- Import `applyBrigadeRepositionOrders` from `apply_brigade_reposition.js`.
- After processing brigade movement, if `state.brigade_reposition_orders` is non-empty, call `applyBrigadeRepositionOrders(state, edges)`.
- Optionally extend `SandboxTurnReport` with `repositionApplied: boolean` for consistency.

---

## 7. Verification

- Run `npx tsc --noEmit` and `npx vitest run` after changes.
- Manual: Desktop — stage move/reposition for a brigade (with or without assigning to front), advance turn; brigade should move / reposition. Sandbox — stage reposition, advance turn; AoR should update to the ordered settlements.

---

## 8. References

- Pipeline step order: `src/sim/turn_pipeline.ts` (Phase II steps: sync-front-segments, ensure-brigade-front-assignment, process-brigade-movement, apply-brigade-reposition).
- Front assignment: `src/sim/phase_ii/front_assignment.ts` (`hasValidFrontAssignment`, `isBrigadeAssignedToFront`, `ensureBrigadeFrontAssignments`).
- Canon/context: Phase II spec §5, Systems Manual §6, DESKTOP_GUI_IPC_CONTRACT (stage-brigade-movement-order, stage-brigade-reposition-order), TACTICAL_MAP_SYSTEM (§2 order arrows).
- Napkin: ORCHESTRATOR_FRONTS_AND_RESERVE_GAP_2026_02_21, brigade AoR / front assignment patterns.
