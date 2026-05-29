# Triggered Operation Bookkeeping Schema Contract

**Date:** 2026-05-27
**Status:** Implemented
**Owner lane:** Optional `GameState` schema contract / triggered-operation bookkeeping save contract

## Summary

`military.triggered_operations_accepted`, `military.declined_operations`, and `military.used_operation_names` are now persisted save/load contracts at schema v29. Legacy v28-and-older saves materialize the three records as `{}`, and current-version saves reject missing or malformed records.

The TypeScript fields remain optional in `GameState` for legacy/in-memory compatibility. This slice does not change triggered-operation proposals, resolutions, event prose, bot choices, calibration, scenario data, sector/frontline behavior, GUI routing, or replay artifacts beyond schema-owned generated outputs.

## Implementation

- Bumped `CURRENT_SCHEMA_VERSION` from 28 to 29.
- Added migration v29 in `src/state/save_migration.ts` using inert `ensureRecord(...)` defaults.
- Added v29 required-field validation in `src/state/validateGameState.ts`.
- Added conservative shape validation:
  - `triggered_operations_accepted`: string keys to non-negative integer turn.
  - `declined_operations`: string keys to `{ declined_turn, decline_count }`, both non-negative integers.
  - `used_operation_names`: string keys to non-negative integer turn.
- Added `tests/fixtures/save_migration/v28_triggered_operation_bookkeeping.json`.
- Refreshed `tools/diagnostics/output/save_migration_drift.json` to schema v29, 29 registered migrations, and 68 strict required fields.
- Rebuilt `data/derived/startup/apr_1992_initial_save.json` so the committed startup save matches the v29 persisted contract.

## Verification

- Red proof before production change: focused migration/validator/round-trip/drift tests failed on missing v29 version, migration defaults, and current-save required-field/shape validation.
- `npx.cmd vitest run tests\save_migration.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts tests\save_migration_round_trip_contract.test.ts tests\save_migration_drift_audit.test.ts tests\startup_snapshot_contract.test.ts --reporter=dot` - PASS; 169/169 tests.
- `node tools\diagnostics\save_migration_drift_audit.cjs` - PASS; `save migration drift audit: 0 anonymous defaults`.
- `npm.cmd run desktop:startup-snapshot:check` - FAIL before rebuild with startup snapshot drift.
- `npm.cmd run desktop:startup-snapshot:build` - PASS; wrote the v29 startup snapshot.
- `npm.cmd run desktop:startup-snapshot:check` - PASS; startup snapshot OK.
- Parent verification with triggered-operation/sector-offensive coverage passed, 199/199 tests.
- `npm.cmd run typecheck` - PASS.
- `node tools\diagnostics\strict_null_inventory.cjs` - PASS; optional-field floor remains 465.
- `git diff --check` - PASS.
- Independent save/schema QA found no blockers and confirmed validator strictness against triggered-operation/name writers.
- Independent determinism/artifact review found no behavior-surface drift and confirmed generated artifacts are schema-v29 only.

## Determinism Notes

The migration is pure and inserts only empty records when absent. Existing record insertion order and contents are preserved. No operation opportunity runtime behavior, event content, bot selection, scenario source data, sector/frontline logic, GUI routing, replay emission, or calibration artifacts were changed.
