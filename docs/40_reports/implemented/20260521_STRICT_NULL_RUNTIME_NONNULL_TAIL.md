# Strict-Null Runtime Non-Null Tail

**Date:** 2026-05-21
**Type:** Strict-null cleanup; behavior-equivalent runtime refactor.

## Summary

Cleaned the remaining inventory-counted dot/index non-null assertions from four runtime files:

- `src/scenario/anomaly_detector.ts`
- `src/scenario/scenario_runner.ts`
- `src/sim/negotiation/counter_offer_generator.ts`
- `src/state/displacement_takeover.ts`

This is a type-safety cleanup only. It does not change scenario data, save schema, operation logic, combat math, negotiation rules, anomaly semantics, or output contracts.

## Changes

- Replaced anomaly-sector singleton indexing with explicit tuple/local checks.
- Replaced same-sector stack `assignment!` mapping with a narrowed `frontSectorIds` list.
- Replaced scenario-runner split-edge indexing, coercion-pressure writes, and initial-formation snapshot access with explicit locals.
- Replaced displacement takeover census `rec!.properties!` with an explicit properties guard.
- Replaced negotiation `last_counter_turn!` writes with local initialized records.
- Added a strict-null inventory progress assertion pinning the four-file runtime tail at zero for both `non_null_assertions_dot` and `non_null_assertions_index`.

## Inventory Result

Current strict-null inventory floor after this slice:

```text
as_factionid_casts 2
as_unknown_casts 4
as_any_casts 180
non_null_assertions_dot 8
non_null_assertions_index 32
optional_fields_game_state 473
```

The four cleaned files now contribute zero inventory-counted dot/index non-null assertions.

## Verification

```text
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/counter_offer_generator.test.ts tests/resolve_counter_offers_phase.test.ts tests/anomaly_detector_sector_subtype.test.ts tests/territorial_anomaly_sector_coverage_truth.test.ts tests/brigade_stacking_sector_truth.test.ts --reporter=dot
PASS 82/82

npm.cmd run typecheck
PASS

npm.cmd run test:baselines
PASS - Baseline regression: all scenarios match.
```
