# Event Bookkeeping Schema Contract

**Date:** 2026-05-26
**Run ID:** N/A
**Baseline:** Optional `GameState` floor 481 (`sim` 304, `state` 169, `derived` 8)
**Result:** Optional `GameState` floor 475 (`sim` 298, `state` 169, `derived` 8)

## Summary

- Promoted six military event bookkeeping records from optional `MilitaryState` fields to required persisted v15 contract fields.
- Added current-version rejection coverage and legacy migration proof for the full field family.
- Kept defaults deterministic and inert; no event eligibility, event prose, event response selection, scenario data, GUI behavior, combat logic, or calibration tuning changed.

## Changes Made

### Schema Contract

- `src/state/game_state.ts`: bumped `CURRENT_SCHEMA_VERSION` to 15 and made `military.fired_event_ids`, `military.event_readiness`, `military.event_fire_counts`, `military.event_last_fired_turn`, `military.event_flags`, and `military.enabled_event_ids` required.
- `src/state/save_migration.ts`: added v15 migration defaults: `[]` for event ID arrays and `{}` for readiness/count/turn/flag records.
- `src/state/validateGameState.ts`: added v15 required-field inventory entries.

### Tests And Fixtures

- `tests/save_migration_validator_rejection.test.ts`: added current-version rejection coverage for all six fields.
- `tests/save_migration_versioned_steps.test.ts`: added v14-to-v15 migration proof and updated schema-version registry expectations.
- Updated direct current-version `MilitaryState` literals in CLI, smoke, warroom, and focused sector tests with empty event bookkeeping substrate records.
- `tests/save_migration_counter_offers.test.ts`: updated current-schema assertion to v15.

### Diagnostics

- `tests/strict_null_inventory_progress.test.ts`: updated optional `GameState` pin from 481 to 475 and sim-domain count from 304 to 298.
- `tools/diagnostics/output/save_migration_drift.json`: regenerated drift artifact for schema v15; strict required field count is now 42.

## Files Changed

| File | Change |
| --- | --- |
| `src/state/game_state.ts` | Required six event bookkeeping fields; schema v15. |
| `src/state/save_migration.ts` | Added v15 inert defaults. |
| `src/state/validateGameState.ts` | Added v15 required-field validator inventory entries. |
| `src/cli/*`, `src/index.ts`, `src/ui/warroom/warroom.ts` | Added empty event bookkeeping records to direct minimal state fixtures. |
| Focused sector test fixtures | Added empty event bookkeeping records to direct `MilitaryState` literals. |
| Save migration / strict-null tests | Added v15 rejection/default/inventory proof. |
| `tools/diagnostics/output/save_migration_drift.json` | Regenerated drift artifact. |

## Verification

- Red first: focused validator/versioned/drift/strict-null tests failed before promotion because missing current-version event bookkeeping records were accepted, legacy saves left them undefined, schema version remained 14, and strict-null inventory remained 481.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\save_migration_validator_rejection.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_drift_audit.test.ts tests\strict_null_inventory_progress.test.ts --reporter=dot` - PASS; 123/123 tests.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\recurrence.test.ts tests\event_decisions.test.ts tests\pressure_system.test.ts tests\sim\events\two_level_surfacing.test.ts --reporter=dot` - PASS; 41/41 tests.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` - PASS; total 475, `sim 298`, `state 169`, `derived 8`, `unknown 0`.
- `F:\A-War-Without-Victory\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json` - PASS after temporarily linking this worktree's missing `src\ui\map\node_modules` to the root dependency install; the temporary junction was removed after verification.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\corps_front_sector_corps_ownership.test.ts tests\emergency_retreat_reachability.test.ts tests\final_sector_reserve_band_truth.test.ts tests\final_sector_truth_reconciliation.test.ts tests\final_sector_truth_reconciliation_cache.test.ts tests\hvo_central_bosnia_sectors.test.ts tests\sector_split_brigade_assignment.test.ts tests\sector_truth_audit.test.ts --reporter=dot` - PASS; 37/37 tests.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\save_migration_counter_offers.test.ts tests\save_migration_validator_rejection.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_drift_audit.test.ts tests\strict_null_inventory_progress.test.ts --reporter=dot` - PASS; 125/125 tests.
- `git diff --check` - PASS.

## Notes

`enabled_event_ids` is promoted here only as persisted bookkeeping because the event engine already writes it. This slice intentionally does not add event-gating semantics; that would be a separate event-system behavior lane.
