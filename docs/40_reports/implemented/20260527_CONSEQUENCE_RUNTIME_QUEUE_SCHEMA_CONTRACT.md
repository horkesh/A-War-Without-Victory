# Consequence Runtime Queue Schema Contract

**Date:** 2026-05-27
**Status:** Implemented
**Owner lane:** Optional `GameState` schema contract / consequence runtime queue save contract

## Summary

`military.cascade_penalties`, `military.offensive_ops_suppressions`, `military.alliance_locks`, and `military.bot_priority_shifts` are now persisted save/load contracts at schema v31. Legacy v30-and-older saves materialize all four queues as `[]`, and current-version saves reject missing or malformed rows.

This is a schema/default-only slice. It does not include `military.event_constraints` and does not change event prose, bot choices, operation opportunities, GUI routing, scenario calibration, sector/frontline behavior, replay artifacts, or operation launch behavior.

## Implementation

- Bumped `CURRENT_SCHEMA_VERSION` from 30 to 31.
- Added migration v31 in `src/state/save_migration.ts` with inert `ensureArray(...)` defaults for the four consequence runtime queues.
- Added v31 required-field validation in `src/state/validateGameState.ts`.
- Added conservative shape validation based on current writers and consumers:
  - `cascade_penalties`: non-empty `osid`, finite `multiplier`, non-negative integer `expires_turn`.
  - `offensive_ops_suppressions`: canonical `faction`, non-negative integer `expires_turn`, optional string `reason`.
  - `alliance_locks`: `mode` in `floor|ceiling`, finite `value`, non-negative integer `expires_turn`.
  - `bot_priority_shifts`: canonical `faction`, optional string-array objective lists, non-negative integer `expires_turn`.
- Added `tests/fixtures/save_migration/v30_consequence_runtime_queues.json`.
- Refreshed `tools/diagnostics/output/save_migration_drift.json` to schema v31, 31 registered migrations, and 74 strict required fields.
- Rebuilt `data/derived/startup/apr_1992_initial_save.json` so the committed startup save matches the v31 persisted contract.

## Verification

- Red proof before production change: focused migration/validator/round-trip/state tests failed on missing schema v31, missing migration defaults, current-save required-field checks, and malformed-row rejection.
- `npx.cmd vitest run tests\consequence_effects.test.ts tests\consequence_consumers.test.ts tests\consequence_chains.test.ts tests\event_state_shape_validation.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts tests\save_migration_round_trip_contract.test.ts tests\save_migration_drift_audit.test.ts tests\state.test.ts --reporter=dot` - PASS; 273/273 tests.
- `npm.cmd run desktop:startup-snapshot:check` - PASS.
- `npm.cmd run typecheck` - PASS.
- `node tools\diagnostics\strict_null_inventory.cjs` - PASS; counted escape categories remain 0 and optional-field floor remains 465.
- `git diff --check` - PASS.
- Independent save/schema QA review - no blockers; confirmed v31 promotes only the four consequence runtime queues, leaves `military.event_constraints` out of scope, keeps TypeScript optionals, and validates row shapes against real writers and consumers.
- Independent determinism/artifact review - no blockers; confirmed no event prose/content, bot historical choice logic, operation opportunities, GUI/desktop routing, scenario calibration, sector/frontline behavior, replay artifacts, operation launch behavior, or `event_constraints` changes. Generated artifact drift is explained by schema v31 only.

## Determinism Notes

The migration is pure empty-array materialization and preserves existing array order and row content. Generated artifact drift is limited to the save-migration drift report and startup snapshot schema defaults.
