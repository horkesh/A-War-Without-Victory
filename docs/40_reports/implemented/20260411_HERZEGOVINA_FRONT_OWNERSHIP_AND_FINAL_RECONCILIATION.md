# 2026-04-11 - Herzegovina Rim Front Ownership And Final Reconciliation

## Lane

Herzegovina / Foca-Kalinovik rim front-ownership hardening.

## Why This Lane Won

The live Foča/Kalinovik complaint had crossed out of "just renderer weirdness" and into a deeper ownership seam:

- a smaller shared-front child sector could be starved of its only truthful anchor brigade
- late final reconciliation could reuse cached mid-turn spatial truth after control and front ownership had already changed

That combination produced the worst kind of map lie: a territorially plausible sector packet that still failed to own all live war-front edges on the rim.

## Exact Root Causes

### 1. Shared-front brigade anchors were being assigned by threat bias instead of need

When a brigade sat on a front OSID claimed by multiple same-corps sibling sectors, `classifyBrigadesByTerritory(...)` broke the tie by enemy pressure. That let a larger, already-covered sibling keep winning the anchor brigade while the smaller child sector stayed empty and was later pruned.

The result was not random geometry drift. It was deterministic starvation of the child sector that actually needed the shared-front brigade to survive serialization.

### 2. Final sector reconciliation could read stale spatial truth

`reconcile-final-sector-truth` reused cached spatial context from earlier in the turn (`postCombat ?? preCombat`). When late control/front ownership changed after that cache was built, final sector truth could be reconciled against an out-of-date map of front edges.

That meant a sector packet could finish internally coherent relative to stale spatial context while still missing ownership on the real end-of-turn rim.

## Exact Changes

### `src/sim/combat/brigade_assignment.ts`

Shared-front tie-breaking now prefers the neediest sibling sector first:

1. sector with zero assigned brigades
2. sector with higher unmet frontage need (`length_edges - assigned_brigade_ids.length`)
3. sector with higher enemy pressure
4. deterministic `sector_id` tie-break

This keeps a truthful shared-front anchor from being magnetized into the largest sibling every time.

### `src/sim/turn_phases/war_phases.ts`

Final reconciliation now recomputes fresh end-of-turn spatial truth with `computeSpatialContext(...)` from current control/front state instead of trusting the cached earlier-turn packet.

This makes final sector ownership answer to actual end-of-turn war-front truth.

## Tests Added / Updated

- `tests/sector_shared_front_assignment.test.ts`
  - proves shared-front brigades reinforce the neediest sibling sector instead of the highest-threat sibling
- `tests/sector_foca_kalinovik_front_ownership_real_save.test.ts`
  - proves every live Herzegovina-rim war edge in the real save is owned by a `sector:vrs_herzegovina:*` packet side
- `tests/front_edge_foca_shared_border_real_save.test.ts`
  - now derives current hostile Foča neighbors dynamically from the live save instead of pinning one historical edge
- `tests/ui_front_edge_display_ownership_real_save.test.ts`
  - now proves every current `donje_zesce` front edge keeps display ownership on both faction-sides

## Verification

### Targeted

- `npx.cmd vitest run tests/sector_shared_front_assignment.test.ts tests/sector_foca_kalinovik_front_ownership_real_save.test.ts tests/trnovo_kalinovik_sector_fix.test.ts tests/final_sector_edge_cap_real_save.test.ts tests/front_edge_foca_shared_border_real_save.test.ts tests/ui_front_edge_display_ownership_real_save.test.ts`
  - passed: `6/6` files, `23/23` tests

### Full bar

- `npm.cmd run sim:scenario:run:40w`
  - passed, produced `runs\apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1429`
  - final hash: `37a55b98638790be`
- `node tools/validate_run_consistency.cjs runs\apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1429`
  - failed only on the pre-existing known residual:
    - `rs_65th_protection_motorized_regiment (vrs_main_staff, RS) is canonically unresolved in military.unresolved_sector_brigades`
- `npm.cmd run test:vitest`
  - passed: `258/258` files, `3164/3164` tests
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - passed
- `npm.cmd run build`
  - passed
- `npm.cmd run recovery:check`
  - passed

## Real-Save Outcome

In `n1429`, the Foča / Kalinovik / Trnovo rim now has `0` unowned live war edges on the VRS Herzegovina side.

Important nuance: the previously troublesome `op:foca:donje_zesce__op:foca:mazlina` edge is no longer a live war edge in `n1429`, because `op:foca:mazlina` is now RBiH-controlled in the fresh final save. The proof was therefore tightened around the live invariant that matters:

- every current Herzegovina-rim war edge has a VRS Herzegovina sector owner
- current `donje_zesce` front edges serialize display ownership on both faction-sides

## Residuals

- The validator still reports the known pre-existing 65th unresolved-sector residual; this lane did not introduce it.
- This lane proves engine/save truth and display ownership truth. It does not by itself certify final Electron rendering polish from a screenshot.

## Files

- `src/sim/combat/brigade_assignment.ts`
- `src/sim/turn_phases/war_phases.ts`
- `tests/sector_shared_front_assignment.test.ts`
- `tests/sector_foca_kalinovik_front_ownership_real_save.test.ts`
- `tests/front_edge_foca_shared_border_real_save.test.ts`
- `tests/ui_front_edge_display_ownership_real_save.test.ts`
- `data/derived/latest_run_final_save.json`
