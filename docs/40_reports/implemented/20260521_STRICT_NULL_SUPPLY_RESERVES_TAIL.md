# Strict-Null Supply Reserves Tail

**Date:** 2026-05-21
**Type:** Strict-null cleanup; behavior-equivalent runtime refactor with explicit invariant check.

## Summary

Cleaned the remaining inventory-counted index non-null assertions from `src/state/supply_reserves.ts`.

`updateSupplyReserves(...)` already calls `ensureSupplyReserves(...)` before reading and writing faction reserve pools. The old code still wrote through `state.military.general_supply_reserve!` and `state.military.heavy_munitions_reserve!` after initialization. The new code narrows both initialized maps into locals, writes computed reserve values through those locals, and reuses the computed values in the report rows.

No reserve formulas, siege drain, patron aid, embargo caps, save schema, scenario data, or output tuning changed.

## Inventory Result

Current strict-null inventory floor after this slice:

```text
as_factionid_casts 2
as_unknown_casts 4
as_any_casts 179
non_null_assertions_dot 5
non_null_assertions_index 13
optional_fields_game_state 473
```

`src/state/supply_reserves.ts` now contributes zero inventory-counted index non-null assertions.

## Verification

```text
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/supply_reserves.test.ts tests/supply_reserves_phase_b.test.ts tests/supply_reserves_embargo_cap.test.ts --reporter=dot
PASS 100/100

npm.cmd run typecheck
PASS

npm.cmd run test:baselines
PASS - Baseline regression: all scenarios match.
```
