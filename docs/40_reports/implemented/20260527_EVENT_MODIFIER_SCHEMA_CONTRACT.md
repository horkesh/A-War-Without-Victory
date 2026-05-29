# Event Modifier Schema Contract

**Date:** 2026-05-27
**Status:** Implemented
**Owner lane:** Optional `GameState` schema contract / event-system save contract

## Summary

`military.event_aggression_modifiers`, `military.recruitment_modifiers`, and `military.equipment_quality_modifiers` are now persisted save/load contracts at schema v25. Legacy v24-and-older saves materialize the three modifier queues as `[]`, and current-version saves reject missing or malformed modifier queues.

The TypeScript fields remain optional in `GameState` so legacy/in-memory event paths and read models can continue using defensive `?? []` access. This slice does not change event firing, event JSON/prose, effect values, bot historical defaults, GUI routing, scenario data, modifier expiry/cleanup behavior, consequence application, or calibration tuning.

## Implementation

- Bumped `CURRENT_SCHEMA_VERSION` from 24 to 25.
- Added migration v25 in `src/state/save_migration.ts` using inert `ensureArray(...)` defaults for the three active event modifier queues.
- Added v25 required-field validation in `src/state/validateGameState.ts`.
- Reused existing active modifier shape validation for current-version malformed array/entry rejection.
- Added `tests/fixtures/save_migration/v24_event_modifiers.json`.
- Updated strict current-version test states and nested migration fixtures to carry the three empty queues.
- Refreshed `tools/diagnostics/output/save_migration_drift.json` to reflect schema v25, 25 registered migrations, and 60 strict required fields.
- Rebuilt `data/derived/startup/apr_1992_initial_save.json` so the committed startup save matches the v25 persisted contract.

## Verification

- Red proof before production change: focused migration/validator tests failed on missing v25 version, migration defaults, and current-save required-field validation.
- `npx.cmd vitest run tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts tests\save_migration_round_trip_contract.test.ts tests\event_state_shape_validation.test.ts tests\state\player_faction_contract.test.ts tests\state\serialize.notifications.test.ts tests\state.test.ts tests\ui_adapter_boundary.test.ts tests\sim\autonomy\autonomy_phase_e_block.test.ts tests\integration_save_load.test.ts tests\save_migration_counter_offers.test.ts tests\migration_nested_ownership.test.ts tests\save_migration_drift_audit.test.ts --reporter=dot` - PASS, 188/188 tests.
- `npm.cmd run desktop:startup-snapshot:check` - PASS.
- `npm.cmd run typecheck` - PASS.
- `node tools\diagnostics\strict_null_inventory.cjs` - PASS; optional-field floor remains 465 because the TypeScript optional markers are intentionally retained.
- `git diff --check` - PASS.
- Independent schema QA review: PASS, no blocking findings; focused 116-test slice and `git diff --check` clean.
- Independent determinism/artifact review: PASS, no v25 blocking findings; noted only unrelated `.claude/scheduled_tasks.lock` runtime noise, excluded from the commit.

## Determinism Notes

The migration is pure and inserts only empty arrays when absent. Existing modifier queue order and contents are preserved. Empty queues are no-ops in current consumers, and this change deliberately avoids broader modifier families, expiry semantics, cleanup behavior, event definitions, scenario sources, and calibration artifacts.
