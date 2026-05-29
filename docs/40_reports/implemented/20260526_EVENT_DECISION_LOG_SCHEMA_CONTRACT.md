# Event Decision Log Schema Contract

**Date:** 2026-05-26
**Result:** `military.event_decision_log` is now a required persisted v14 contract field with legacy `[]` migration proof.

## Summary
- Promoted `military.event_decision_log` from optional `MilitaryState` field to required persisted state.
- Added current-version validator rejection coverage for missing v14 `military.event_decision_log`.
- Added v1/v13 migration proof that legacy saves materialize `event_decision_log: []`.

## Changes Made

### State Contract
- `src/state/game_state.ts` now types `military.event_decision_log` as required.
- `src/state/validateGameState.ts` lists `military.event_decision_log` as a v14 required field.
- `src/state/save_migration.ts` initializes missing legacy values to `[]` inside the v14 migration before the headless `player_faction` exemption.

### Tests And Diagnostics
- `tests/save_migration_validator_rejection.test.ts` covers current-version rejection and v1 migration materialization.
- `tests/save_migration_versioned_steps.test.ts` covers v13-to-v14 default materialization.
- `tests/strict_null_inventory_progress.test.ts` pins the optional-field floor at 487 after this promotion.
- `tools/diagnostics/output/save_migration_drift.json` records the new v14 required path.

### Fixture Alignment
- Current-version synthetic state fixtures and CLI/UI mock states now include `event_decision_log: []` wherever they instantiate `MilitaryState` directly.
- `data/derived/startup/apr_1992_initial_save.json` was refreshed only to add the required empty `military.event_decision_log` array, plus the final newline normalization emitted by the JSON writer. No event JSON, scenario/calibration data, event ordering, or simulation logic changed.

## Files Changed

| File | Change |
| --- | --- |
| `src/state/game_state.ts` | Required `MilitaryState.event_decision_log`. |
| `src/state/save_migration.ts` | Added legacy `[]` default in v14 migration. |
| `src/state/validateGameState.ts` | Added v14 required-field check. |
| `tests/save_migration_validator_rejection.test.ts` | Added missing-field rejection and migration expectation. |
| `tests/save_migration_versioned_steps.test.ts` | Added v14 default materialization proof. |
| `tests/strict_null_inventory_progress.test.ts` | Updated strict-null optional-field floor. |
| `tools/diagnostics/output/save_migration_drift.json` | Refreshed required-field inventory. |
| `data/derived/startup/apr_1992_initial_save.json` | Added required empty `military.event_decision_log` to the committed startup snapshot. |
| Direct `MilitaryState` fixtures in `src/cli`, `src/index.ts`, `src/ui/warroom`, and focused tests | Added required empty `event_decision_log` defaults. |

## Verification
- Red first: focused save migration validator/versioned tests failed before production changes because current v14 missing `military.event_decision_log` was accepted and legacy migration returned `undefined`.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` reports total `487` optional fields (`sim 304`, `state 175`, `derived 8`).
- `node tools\diagnostics\save_migration_drift_audit.cjs` reports `0 anonymous defaults`.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\save_migration_validator_rejection.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_round_trip_contract.test.ts tests\event_decisions.test.ts tests\save_migration_drift_audit.test.ts tests\strict_null_inventory_progress.test.ts --reporter=dot` passed 145/145 tests.
- `F:\A-War-Without-Victory\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json` passed after adding an ignored local junction from this worktree's `src\ui\map\node_modules` to the already-installed parent dependency folder.
- `git diff --check` passed.

## Residual Risk
- This is a schema/default-only persisted-contract change. It should not alter simulation behavior or event ordering; the only serialized shape change is legacy saves gaining an empty audit-log array when absent.
