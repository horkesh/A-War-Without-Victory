# Strict-Null SupplyIntelligence As-Any Tail

**Date:** 2026-05-21
**Type:** Strict-null cleanup; UI data-contract correction.

## Summary

Cleaned the three `as any` reads in `src/ui/map/components/army_hq/SupplyIntelligence.tsx`.

`getMobilizationInfo(...)` now reads the current `MobilizationSummaryView` contract directly:

- `exhaustion_pct`
- `top_pools.length`
- `total_available`

The Army HQ mobilization footer now labels those derived values as pool exhaustion, active municipality pools, and current manpower pool. This replaces stale legacy reads for `exhausted_municipality_count`, `total_municipalities`, and `current_pool_total`, which were no longer present on the loaded-state adapter shape and could display zeroes despite valid mobilization data.

No mobilization simulation, save schema, scenario data, adapter serialization, or output tuning changed.

## Inventory Result

Current strict-null inventory floor after this slice:

```text
as_factionid_casts 2
as_unknown_casts 2
as_any_casts 176
non_null_assertions_dot 0
non_null_assertions_index 0
optional_fields_game_state 473
```

## Verification

```text
npx.cmd vitest run tests/ui/supply_intelligence_mobilization.test.ts tests/strict_null_inventory_progress.test.ts --reporter=dot
PASS 75/75

npm.cmd run typecheck
PASS

npm.cmd run desktop:map:build
PASS with existing Vite browser-external/dynamic-import/chunk-size warnings
```
