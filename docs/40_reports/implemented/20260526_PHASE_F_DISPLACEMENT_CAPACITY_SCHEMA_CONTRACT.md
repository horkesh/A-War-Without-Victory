# Phase F Displacement Capacity Schema Contract

**Date:** 2026-05-26
**Run ID:** N/A
**Baseline:** Optional `GameState` floor 475 (`sim` 298, `state` 169, `derived` 8)
**Result:** Optional `GameState` floor 472 (`sim` 298, `state` 166, `derived` 8)

## Summary

- Promoted three Phase F displacement capacity maps from optional `DisplacementDomainState` fields to required persisted v16 contract fields.
- Added current-version rejection coverage and v15 legacy migration proof for inert `{}` defaults.
- Kept the slice schema/default-only; no displacement mechanics, event prose, scenario data, calibration tuning, combat logic, GUI behavior, or generated scenario outputs changed.

## Changes Made

### Schema Contract

- `src/state/game_state.ts`: bumped `CURRENT_SCHEMA_VERSION` to 16 and made `displacement.settlement_displacement`, `displacement.settlement_displacement_started_turn`, and `displacement.municipality_displacement` required.
- `src/state/save_migration.ts`: added v16 migration defaults that materialize the three maps as `{}` for legacy saves.
- `src/state/validateGameState.ts`: added v16 required-field validation entries.
- `src/state/serialize.ts`: removed current-version silent canonicalization for the three fields and limited legacy top-level Phase F capacity rescue to pre-v16 saves, so malformed v16 saves reject instead of being repaired after migration.

### Tests And Fixtures

- `tests/save_migration_validator_rejection.test.ts`: added current-version rejection coverage for all three fields, a legacy top-level bypass regression, v15-to-v16 migration proof, and pre-v16 top-level rescue proof.
- `tests/fixtures/save_migration/v15_displacement_capacity_maps.json`: added a focused legacy fixture that intentionally omits the new v16 maps.
- `tests/save_migration_counter_offers.test.ts` and `tests/save_migration_drift_audit.test.ts`: updated current-schema expectations to v16.
- Direct current-version `DisplacementDomainState` literals in CLI, warroom, and focused tests now include empty capacity maps.

### Diagnostics

- `tests/strict_null_inventory_progress.test.ts`: updated optional `GameState` pin from 475 to 472 and state-domain count from 169 to 166.
- `tools/diagnostics/output/save_migration_drift.json`: regenerated drift artifact for schema v16; strict required field count is now 45.

## Files Changed

| File | Change |
| --- | --- |
| `src/state/game_state.ts` | Required three Phase F displacement capacity maps; schema v16. |
| `src/state/save_migration.ts` | Added v16 inert `{}` defaults. |
| `src/state/validateGameState.ts` | Added v16 required-field validator inventory entries. |
| `src/state/serialize.ts` | Removed current-version silent backfill and blocked legacy top-level bypass for the promoted maps. |
| `src/cli/*`, `src/index.ts`, `src/ui/warroom/warroom.ts` | Added empty displacement capacity maps to direct minimal current-state fixtures. |
| Focused displacement/alliance test fixtures | Added empty displacement capacity maps to direct `DisplacementDomainState` literals. |
| Save migration / strict-null tests | Added v16 rejection/default/inventory proof. |
| `tests/state/player_faction_contract.test.ts` | Refreshed the minimal current-schema fixture so player-faction validation is isolated from required schema fields. |
| `docs/20_engineering/PIPELINE_ENTRYPOINTS.md` | Updated migration registry prose to v1-v16. |
| `tools/diagnostics/output/save_migration_drift.json` | Regenerated drift artifact. |

## Verification

- Red first: focused save-migration validator and strict-null tests failed before promotion because current-version saves accepted missing capacity maps, legacy v15 saves left them undefined, schema version remained 15, and strict-null inventory remained 475.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\save_migration_validator_rejection.test.ts tests\save_migration_round_trip_contract.test.ts tests\save_migration_drift_audit.test.ts tests\save_migration_counter_offers.test.ts --reporter=dot` - PASS; 48/48 tests.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\save_migration_validator_rejection.test.ts tests\state\player_faction_contract.test.ts --reporter=dot` - PASS; 32/32 tests.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\save_migration_versioned_steps.test.ts tests\save_migration_drift_artifact_ownership.test.ts tests\save_migration_drift_audit.test.ts tests\migration_nested_ownership.test.ts tests\displacement_pipeline_state_schema.test.ts tests\save_migration_validator_rejection.test.ts tests\save_migration_round_trip_contract.test.ts tests\save_migration_counter_offers.test.ts tests\strict_null_inventory_progress.test.ts tests\state\player_faction_contract.test.ts --reporter=dot` - PASS; 164/164 tests.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\state.test.ts tests\migration_nested_ownership.test.ts tests\save_migration_round_trip_contract.test.ts tests\save_migration_validator_rejection.test.ts tests\strict_null_inventory_progress.test.ts --reporter=dot` - PASS; 144/144 tests.
- `node tools\diagnostics\strict_null_inventory.cjs` - PASS; `optional_fields_game_state 472`, counted escape categories all zero.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` - PASS; total 472, `sim 298`, `state 166`, `derived 8`, `unknown 0`.
- `npx.cmd tsc --noEmit -p tsconfig.json --pretty false` - PASS.
- `git diff --check` - PASS.

## Notes

The three maps are persisted substrate for Phase F displacement capacity accounting. They are empty by default and this slice does not alter how displacement is triggered, counted, surfaced, or calibrated.
