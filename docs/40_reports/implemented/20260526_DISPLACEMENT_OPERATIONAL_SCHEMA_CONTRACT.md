# Displacement Operational Schema Contract

**Date:** 2026-05-26
**Owner:** Pyrrhic systems/save-schema worker
**Branch:** `codex/displacement-operational-contract`

## Summary

Promoted exactly three displacement operational substrate records from optional `DisplacementDomainState` fields to required persisted v17 contract fields:

- `displacement.hostile_takeover_timers`
- `displacement.displacement_camp_state`
- `displacement.war_displacement_initiated`

The v17 migration materializes missing legacy values with inert empty `{}` records. Current-version validation rejects missing nested fields, and current-version top-level legacy residue no longer silently repairs malformed v17 saves for these fields. Pre-v17 legacy rescue is preserved.

No event prose, calibration, UI behavior, scenario output, generated scenario artifact, or displacement mechanics changed.

## Strict-Null Floor

Previous optional `GameState` floor: `472` (`sim 298`, `state 166`, `derived 8`).

New optional `GameState` floor: `469` (`sim 298`, `state 163`, `derived 8`, `unknown 0`).

## Implementation Notes

- Bumped `CURRENT_SCHEMA_VERSION` to `17`.
- Added a v17 migration with empty-record defaults only.
- Added v17 `VERSION_REQUIRED_FIELDS` entries for the three displacement paths.
- Added current-version rejection tests for each missing field.
- Added v16 legacy migration/default tests proving `{}` materialization.
- Added a malformed v17 top-level legacy residue guard while retaining pre-v17 top-level rescue.
- Aligned direct current-version `DisplacementDomainState` literals in CLI, UI, and tests.
- Updated save migration drift output for schema version 17.

## Verification

- Red first: focused save-schema tests failed before implementation because latest schema remained v16, current-version saves accepted missing fields, and v16 saves left the new fields undefined.
- `.\vitest.cmd run tests\save_migration_validator_rejection.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_round_trip_contract.test.ts tests\save_migration_drift_audit.test.ts tests\save_migration_counter_offers.test.ts tests\strict_null_inventory_progress.test.ts tests\state\player_faction_contract.test.ts tests\migration_nested_ownership.test.ts --reporter=dot` - PASS; 166/166 tests.
- `node tools\diagnostics\strict_null_inventory.cjs` - PASS; `optional_fields_game_state 469`, counted escape categories all zero.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` - PASS; total 469, `sim 298`, `state 163`, `derived 8`, `unknown 0`.
- `node tools\diagnostics\save_migration_drift_audit.cjs` - PASS; `save migration drift audit: 0 anonymous defaults`.
- `npx.cmd tsc --noEmit -p tsconfig.json --pretty false` - PASS.
- `git diff --check` - PASS.
