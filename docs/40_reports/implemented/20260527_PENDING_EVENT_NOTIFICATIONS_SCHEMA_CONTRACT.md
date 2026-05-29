# Pending Event Notifications Schema Contract

**Date:** 2026-05-27
**Status:** Implemented
**Owner lane:** Optional `GameState` schema contract / event-system save contract

## Summary

`military.pending_event_notifications` is now a persisted save/load contract at schema v23. Legacy v22-and-older saves materialize the field as `[]`, and current-version saves reject a missing or malformed notification queue.

The TypeScript field remains optional in `GameState` so legacy/in-memory event paths can continue using `state.military.pending_event_notifications ?? []`. This slice does not initialize the queue in event runtime and does not change notification emission, event firing, event JSON/prose, event ordering, bot choices, GUI behavior, scenario data, baseline artifacts, or calibration tuning.

## Implementation

- Bumped `CURRENT_SCHEMA_VERSION` from 22 to 23.
- Added migration v23 in `src/state/save_migration.ts` using `ensureArray(asRecord(state.military), 'pending_event_notifications')`.
- Added v23 required-field validation in `src/state/validateGameState.ts`.
- Added `tests/fixtures/save_migration/v22_pending_event_notifications.json`.
- Updated current-version test fixtures that exercise strict save validation to carry the new empty queue.
- Refreshed `tools/diagnostics/output/save_migration_drift.json` to reflect schema v23, 23 registered migrations, and 56 strict required fields.

## Verification

- Red proof before production change: focused migration/notification tests failed on missing v23 migration/default/validator coverage.
- `npx.cmd vitest run tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts tests\state\serialize.notifications.test.ts --reporter=dot` - PASS, 91/91 tests.
- `npx.cmd vitest run tests\event_state_shape_validation.test.ts tests\events_evaluate.test.ts tests\save_migration_round_trip_contract.test.ts tests\save_migration_drift_audit.test.ts tests\migration_nested_ownership.test.ts tests\state.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts tests\state\serialize.notifications.test.ts --reporter=dot` - PASS, 160/160 tests.
- `npx.cmd vitest run tests\save_migration_counter_offers.test.ts tests\state\player_faction_contract.test.ts tests\combat_state_schema.test.ts tests\displacement_pipeline_state_schema.test.ts tests\early_war_state_schema.test.ts tests\emergence_pressure_schema.test.ts tests\game_state_shape.test.ts tests\game_state_no_derived_fields.test.ts tests\turn_pipeline_determinism_smoke.test.ts tests\event_state_shape_validation.test.ts tests\migration_nested_ownership.test.ts tests\state.test.ts --reporter=dot` - PASS, 56/56 tests.
- `node tools\diagnostics\strict_null_inventory.cjs` - PASS; optional-field floor remains 465 because the TypeScript optional marker is intentionally retained.

## Determinism Notes

The migration is pure and inserts only an empty array when absent. Existing notification array order and contents are preserved. Runtime notification ordering remains owned by `emit_notifications.ts`, which sorts recipients and final queue output deterministically.
