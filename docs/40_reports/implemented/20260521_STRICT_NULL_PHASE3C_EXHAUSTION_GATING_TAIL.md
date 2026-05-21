# Strict-Null Phase 3C Exhaustion-Gating Tail

**Date:** 2026-05-21
**Type:** Strict-null cleanup; behavior-equivalent runtime refactor with explicit invariant check.

## Summary

Cleaned the remaining inventory-counted dot non-null assertions from `src/sim/pressure/phase3c_exhaustion_collapse_gating.ts`.

`updateLocalStrain(...)` already initializes `state.political.local_strain` before reading and writing the entity strain accumulator. The old code still used non-null assertions after initialization. The new code narrows the initialized state into a local and throws a clear invariant error if initialization fails.

No Phase 3C thresholds, feature flags, eligibility rules, save schema, scenario data, or output tuning changed.

## Inventory Result

Current strict-null inventory floor after this slice:

```text
as_factionid_casts 2
as_unknown_casts 4
as_any_casts 179
non_null_assertions_dot 5
non_null_assertions_index 19
optional_fields_game_state 473
```

`src/sim/pressure/phase3c_exhaustion_collapse_gating.ts` now contributes zero inventory-counted dot non-null assertions.

## Verification

```text
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot
PASS 66/66

npm.cmd run typecheck
PASS

npm.cmd run test:baselines
PASS - Baseline regression: all scenarios match.
```
