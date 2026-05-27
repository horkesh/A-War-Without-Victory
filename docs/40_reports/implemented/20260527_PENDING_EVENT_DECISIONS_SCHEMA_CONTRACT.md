# Pending Event Decisions Schema Contract

**Date:** 2026-05-27
**Status:** Implemented
**Owner lane:** Optional `GameState` schema contract / event-system save contract

## Summary

`military.pending_event_decisions` is now a persisted save/load contract at schema v24. Legacy v23-and-older saves materialize the queue as `[]`, and current-version saves reject a missing or malformed pending-decision queue.

The TypeScript field remains optional in `GameState` so legacy/in-memory event paths and UI read models can continue using `state.military.pending_event_decisions ?? []`. This slice does not change event firing, event JSON/prose, event ordering, bot historical defaults, GUI routing, scenario data, consequence application, or calibration tuning.

## Implementation

- Bumped `CURRENT_SCHEMA_VERSION` from 23 to 24.
- Added migration v24 in `src/state/save_migration.ts` using `ensureArray(asRecord(state.military), 'pending_event_decisions')`.
- Added v24 required-field validation in `src/state/validateGameState.ts`, including non-empty response-option queues, nested pending decision response-option object/id/label validation, unique response IDs, kinded response effects, and historical-default target validation.
- Added `tests/fixtures/save_migration/v23_pending_event_decisions.json`.
- Updated strict current-version test states and nested migration fixtures to carry the new empty queue.
- Refreshed `tools/diagnostics/output/save_migration_drift.json` to reflect schema v24, 24 registered migrations, and 57 strict required fields.
- Rebuilt `data/derived/startup/apr_1992_initial_save.json` so the committed startup save matches the v24 persisted contract.

## Verification

- Red proof before production change: focused migration/validator/roundtrip tests failed on missing v24 version, migration default, and current-save required-field validation.
- `npx.cmd vitest run tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts tests\save_migration_round_trip_contract.test.ts tests\event_state_shape_validation.test.ts tests\state\player_faction_contract.test.ts tests\state\serialize.notifications.test.ts tests\state.test.ts tests\ui_adapter_boundary.test.ts tests\sim\autonomy\autonomy_phase_e_block.test.ts tests\integration_save_load.test.ts tests\save_migration_counter_offers.test.ts tests\migration_nested_ownership.test.ts tests\save_migration_drift_audit.test.ts --reporter=dot` - PASS, 180/180 tests.
- `npm.cmd run typecheck` - PASS.
- `node tools\diagnostics\strict_null_inventory.cjs` - PASS; optional-field floor remains 465 because the TypeScript optional marker is intentionally retained.

## Determinism Notes

The migration is pure and inserts only an empty array when absent. Existing pending decision array order and contents are preserved. Runtime decision queue ordering remains owned by the event evaluator and resolver paths.
