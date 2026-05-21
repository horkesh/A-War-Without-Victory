# Strict-Null Displacement Tail

**Date:** 2026-05-21
**Type:** Strict-null cleanup; behavior-equivalent runtime refactor with explicit invariant check.

## Summary

Cleaned the remaining inventory-counted index non-null assertions from `src/state/displacement.ts`.

Both displacement routing paths already initialize `state.displacement.displacement_state` through `getOrInitDisplacementState(...)` before route calculation. The old code still read destination original populations through indexed non-null assertions. The new code narrows the initialized displacement-state map into a local before routing and uses that local for destination lookups.

No displacement formulas, routing rules, population loss fractions, militia-pool reductions, save schema, scenario data, or output tuning changed.

## Inventory Result

Current strict-null inventory floor after this slice:

```text
as_factionid_casts 2
as_unknown_casts 4
as_any_casts 179
non_null_assertions_dot 5
non_null_assertions_index 11
optional_fields_game_state 473
```

`src/state/displacement.ts` now contributes zero inventory-counted index non-null assertions.

## Verification

```text
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/displacement.test.ts tests/displacement_routing.test.ts tests/bilateral_displacement_cascade.test.ts tests/displacement_pipeline_displacement_accumulation.test.ts --reporter=dot
PASS 103/103

npm.cmd run typecheck
PASS

npm.cmd run test:baselines
PASS - Baseline regression: all scenarios match.
```
