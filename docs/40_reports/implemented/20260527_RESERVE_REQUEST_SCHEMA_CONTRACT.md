# Reserve Request Schema Contract

**Date:** 2026-05-27
**Status:** Implemented
**Owner lane:** Optional `GameState` schema contract / reserve request save contract

## Summary

`military.pending_reserve_requests` and `military.reserve_request_history` are now persisted save/load contracts at schema v28. Legacy v27-and-older saves materialize both queues as `[]`, and current-version saves reject missing or malformed reserve request queues.

The TypeScript fields remain optional in `GameState` so legacy/in-memory reserve paths can continue using defensive queue initialization. This slice does not change reserve generation, approval, recall, bot choices, GUI routing, sector/frontline code, replay artifacts, scenario data, event content, or calibration tuning.

## Implementation

- Bumped `CURRENT_SCHEMA_VERSION` from 27 to 28.
- Added migration v28 in `src/state/save_migration.ts` using inert `ensureArray(...)` defaults for the pending reserve queue and filed reserve decision history.
- Added v28 required-field validation in `src/state/validateGameState.ts`.
- Added current-version shape validation for pending `ArmyReserveRequest` rows and filed `ArmyReserveDecisionRecord` rows.
- Added `tests/fixtures/save_migration/v27_reserve_requests.json`.
- Added migration/validator tests for v27 default materialization, existing row order/content preservation, malformed-row rejection, and save/load round-trip coverage.
- Refreshed `tools/diagnostics/output/save_migration_drift.json` to reflect schema v28, 28 registered migrations, and 65 strict required fields.
- Rebuilt `data/derived/startup/apr_1992_initial_save.json` so the committed startup save matches the v28 persisted contract.

## Verification

- Red proof before production change: focused migration/validator/round-trip tests failed on missing v28 version, migration defaults, and current-save required-field/shape validation.
- `npx.cmd vitest run tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts tests\save_migration_round_trip_contract.test.ts --reporter=dot` - PASS; 151/151 tests.
- `node tools\diagnostics\save_migration_drift_audit.cjs` - PASS; `save migration drift audit: 0 anonymous defaults`.
- `npm.cmd run desktop:startup-snapshot:build` - PASS; wrote the v28 startup snapshot.
- `npx.cmd vitest run tests\save_migration_drift_audit.test.ts --reporter=dot` - PASS; 1/1 test.
- `npx.cmd vitest run tests\startup_snapshot_contract.test.ts --reporter=dot` - PASS; 5/5 tests.
- Parent verification: reserve runtime plus save/migration/drift pack passed, 191/191 tests.
- `npm.cmd run desktop:startup-snapshot:check` passed.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed.
- Independent save/schema QA found no blockers and confirmed validator strictness against real reserve writers.
- Independent determinism/artifact review found no behavior-surface drift and confirmed generated artifacts are schema-v28 only.

## Determinism Notes

The migration is pure and inserts only empty arrays when absent. Existing pending/history array order and row contents are preserved. No reserve runtime behavior, player routing, scenario source, event data, replay emission, sector/frontline logic, or calibration artifacts were changed.
