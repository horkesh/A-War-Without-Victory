# AAR Canonical Attack Counter Fix

**Date:** 2026-05-01
**Type:** Reporting / AAR truth fix
**Evidence source:** LANE D 188w run `runs/apr1992_definitive_188w__210e69404d054959__w188_n1604`

## Summary

- Fixed operation AAR `total_attacks` so it reads the operation lifecycle counters that sector offensive execution already owns.
- Preserved weekly-log aggregation for casualties and equipment, where weekly rows are still the correct ledger.
- Closed the false `did_not_launch` class seen on Operation Sana: the AAR layer can no longer erase real operation attempts merely because `weekly_log[*].attacks_this_turn` was not populated.

## Problem

LANE D found that Operation Sana had a linked AAR with `total_attacks=0` and opportunity `exit_class='did_not_launch'`, even though the completed `CorpsOperation` had `attack_attempt_count=7` across three axes and failed through `recovery_reason='max_failures'`.

The root cause was in `finalizeOperationAAR(...)`: it summed `weekly_log[*].attacks_this_turn` for `total_attacks`. That parallel counter is not consistently written for every operation path. The lifecycle truth already exists on `op.attack_attempt_count` and `axis.attack_attempt_count`, written by `sector_offensive.ts`.

## Changes Made

### `src/sim/combat/operation_aar.ts`

- Added canonical attack-count helpers:
  - multi-axis operations sum `axis.attack_attempt_count`
  - legacy flat operations use `op.attack_attempt_count`
  - old or partial shapes fall back to weekly-log totals
- Kept casualties, equipment losses, equipment destroyed, and equipment captured aggregated from `weekly_log`.
- Changed axis AAR summaries to use each axis lifecycle counter for `axis_summaries[*].total_attacks`.

### `src/scenario/anomaly_detector.ts`

- Updated the `operation_zero_eligible_execution` comment so it no longer claims AAR attack totals are weekly-log aggregates.

### `tests/operation_aar.test.ts`

- Added a regression where `op.attack_attempt_count=7` but the weekly log reports zero attacks.
- Added a multi-axis regression where axis lifecycle counters report 3 + 4 attempts while weekly axis rows are missing.
- Updated the existing multi-axis summary expectation to treat lifecycle counters as authoritative.

## Validation

- Red-first proof: the two new operation AAR tests failed before the implementation (`total_attacks` remained `0`).
- `npx.cmd vitest run tests/operation_aar.test.ts`: 44/44 pass.
- `npx.cmd tsc --noEmit`: clean.
- `npx.cmd vitest run tests/operation_aar.test.ts tests/operation_opportunities_substrate.test.ts tests/opportunity_health_diagnostic.test.ts tests/cost_ledger_comparison.test.ts tests/integration_anomaly.test.ts tests/scenario_operation_diagnostics.test.ts`: 116/116 pass.

No fresh 40w/188w scenario run was started in this lane because `data/derived/latest_run_final_save.json` was already dirty from concurrent work. This fix changes persisted AAR/reporting truth and can move final-state hashes where completed operations are serialized, but it does not alter combat math, control flips, OOB, scenario data, or opportunity catalog eligibility.

## Determinism

No randomness, wall-clock values, locale ordering, or new collection iteration order was introduced. The helper reads counters already present on the operation object being finalized. This aligns with `docs/20_engineering/DETERMINISM_TEST_MATRIX.md` stable-output rules and `docs/20_engineering/CODE_CANON.md` deterministic serialization expectations.

## Next Steps

1. Re-run an 188w opportunity stress after the current concurrent lane finishes; expected result is Sana `exit_class='failed'` rather than `did_not_launch`.
2. Run a catalog predicate topology lane for the six 5th Corps opportunities blocked by the saturated logistics axis.
3. Keep the combat-execution gap separate: force ratio 7.19 with 0/31 captures is not an AAR bug.
