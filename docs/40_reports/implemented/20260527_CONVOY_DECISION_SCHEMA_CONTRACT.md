# Convoy Decision Schema Contract

**Date:** 2026-05-27
**Status:** Implemented
**Owner lane:** Optional `GameState` schema contract / convoy decision save contract

## Summary

`military.pending_convoy_decisions` and `military.convoy_decision_history` are now persisted save/load contracts at schema v27. Legacy v26-and-older saves materialize both queues as `[]`, and current-version saves reject missing or malformed convoy decision queues.

The TypeScript fields remain optional in `GameState` so legacy/in-memory convoy paths can continue using defensive queue initialization. This slice does not change convoy generation, convoy resolution, supply amount math, bot default decisions, GUI routing, scenario data, event content, or calibration tuning.

## Implementation

- Bumped `CURRENT_SCHEMA_VERSION` from 26 to 27.
- Added migration v27 in `src/state/save_migration.ts` using inert `ensureArray(...)` defaults for the pending convoy queue and filed decision history.
- Added v27 required-field validation in `src/state/validateGameState.ts`.
- Added current-version shape validation for pending convoy decisions and filed convoy decision history rows.
- Added `tests/fixtures/save_migration/v26_convoy_decisions.json`.
- Added save round-trip coverage for pending and filed convoy decisions.
- Refreshed `tools/diagnostics/output/save_migration_drift.json` to reflect schema v27, 27 registered migrations, and 63 strict required fields.
- Rebuilt `data/derived/startup/apr_1992_initial_save.json` so the committed startup save matches the v27 persisted contract.
- Corrected the desktop IPC contract doc to name canonical `state.military.pending_convoy_decisions`.

## Verification

- Red proof before production change: focused migration/validator tests failed on missing v27 version, migration defaults, and current-save required-field/shape validation.
- Green proof after production change: convoy lifecycle plus focused migration/validator tests passed, 134/134 tests.
- Expanded schema/behavior pack passed, 187/187 tests.
- `npm.cmd run desktop:startup-snapshot:check` passed.
- `npm.cmd run typecheck` passed.
- `node tools\diagnostics\strict_null_inventory.cjs` passed with optional-field floor still 465.
- `git diff --check` passed.
- Independent save/schema QA found no blockers and ran a 163-test focused save/migration pack.
- Independent determinism/artifact review found no behavior-surface drift and confirmed generated artifacts are schema-v27 only.

## Determinism Notes

The migration is pure and inserts only empty arrays when absent. Existing pending/history array order and contents are preserved. No convoy runtime behavior, supply math, player routing, scenario source, event data, or calibration artifacts were changed.
