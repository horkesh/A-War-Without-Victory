# Officer Decision Queue Schema Contract

**Date:** 2026-05-27
**Status:** Implemented
**Owner lane:** Optional `GameState` schema contract / officer decision queue save contract

## Summary

`military.pending_officer_events` and `military.officer_decision_history` are now persisted save/load contracts at schema v30. Legacy v29-and-older saves materialize both queues as `[]`, and current-version saves reject missing or malformed officer decision queues.

The TypeScript fields remain optional in `GameState` for legacy/in-memory compatibility. This slice does not change officer behavior, desktop IPC routing, UI mapping, operation opportunities, event prose/content, bot choices, calibration, scenario data, sector/frontline behavior, GUI routing, or replay artifacts beyond schema-owned generated outputs.

## Implementation

- Bumped `CURRENT_SCHEMA_VERSION` from 29 to 30.
- Added migration v30 in `src/state/save_migration.ts` using inert `ensureArray(...)` defaults for pending officer events and filed officer decision history.
- Added v30 required-field validation in `src/state/validateGameState.ts`.
- Added conservative shape validation:
  - `pending_officer_events`: required event id, known officer event type, canonical faction, non-negative turn, officer id, acknowledged flag, optional non-empty ids, optional strings/booleans, and optional order snapshots.
  - `OrderSnapshot`: valid order type, string `corps_id` with empty string allowed, optional string fields, optional string objectives, and optional non-negative `delay_turns`.
  - `officer_decision_history`: required id, turn, faction, event id/type, officer id, and decision enum; optional officer/corps ids are non-empty when present. History `event_type` remains string-only and is not enum-validated.
- Added `tests/fixtures/save_migration/v29_officer_decision_queues.json`.
- Added migration/validator/runtime tests for v29 default materialization, existing row order/content preservation, current-save missing/malformed rejection, officer runtime history round-trip proof, and focused existing officer coverage.
- Refreshed `tools/diagnostics/output/save_migration_drift.json` to schema v30, 30 registered migrations, and 70 strict required fields.
- Rebuilt `data/derived/startup/apr_1992_initial_save.json` so the committed startup save matches the v30 persisted contract.

## Verification

- Red proof before production change: focused migration/validator/round-trip/officer tests failed on missing v30 version, migration defaults, required-field checks, and malformed-row rejection.
- `npx.cmd vitest run tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts tests\event_state_shape_validation.test.ts tests\desktop_officer_decision_history.test.ts tests\save_migration_round_trip_contract.test.ts --reporter=dot` - PASS; 176/176 tests.
- `node tools\diagnostics\save_migration_drift_audit.cjs` - PASS; `save migration drift audit: 0 anonymous defaults`.
- `npm.cmd run desktop:startup-snapshot:check` - FAIL before rebuild with startup snapshot drift.
- `npm.cmd run desktop:startup-snapshot:build` - PASS; wrote the v30 startup snapshot.
- Parent verification: `npx.cmd vitest run tests\desktop_officer_decision_history.test.ts tests\sim\combat\order_interpretation.test.ts tests\a3_army_order_interpretation.test.ts tests\sim\command\phase4_ui_data_layer.test.ts tests\player_decision_manifest.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts tests\save_migration_round_trip_contract.test.ts tests\save_migration_drift_audit.test.ts tests\event_state_shape_validation.test.ts tests\migration_nested_ownership.test.ts tests\state.test.ts --reporter=dot` - PASS; 227/227 tests.
- `npm.cmd run desktop:startup-snapshot:check` - PASS.
- `npm.cmd run typecheck` - PASS.
- `node tools\diagnostics\strict_null_inventory.cjs` - PASS; counted escape categories remain 0 and optional-field floor remains 465.
- `git diff --check` - PASS.
- Independent save/schema QA review - no blockers; confirmed v30 promotes only officer pending/history queues, validates against real officer producers and desktop history rows, preserves optional TypeScript fields, and keeps docs schema-only.
- Independent determinism/artifact review - no blockers; confirmed no officer behavior, desktop IPC, UI mapping, operation opportunities, event prose/content, bot choices, calibration inputs, scenario data, sector/frontline behavior, GUI routing, or replay artifacts changed. Generated artifact drift is explained by schema v30 only.

## Determinism Notes

The migration is pure and inserts only empty arrays when absent. Existing pending/history array order and row contents are preserved. No officer runtime behavior, desktop IPC routing, UI mapping, operation opportunity logic, event prose/content, bot policy, scenario source, sector/frontline logic, GUI routing, replay emission, or calibration artifacts were changed.
