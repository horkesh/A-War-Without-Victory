# OPSEC Sectors Validate-When-Present Contract

**Date:** 2026-06-04

**Lane:** Optional `GameState` schema contract / engine health.

## Summary

`state.military.opsec_sectors` is now validated when present. This closes the OPSEC sector-list slice without promoting the field to required current-save state.

The field remains optional because it is runtime-written by OPSEC/intelligence warfare paths and absence is legitimate when no sectors currently carry OPSEC. No save-schema version bump, migration, fixture, simulation logic, UI routing, scenario data, or TypeScript optionality changed.

## Contract

When present, `military.opsec_sectors` must be a string array of sector ids.

## Evidence

Red proof: `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` failed because malformed and non-array `opsec_sectors` payloads were accepted before the validator existed.

Green proof:

- `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` passed 126/126.
- `node node_modules\vitest\vitest.mjs run tests\attack_resolution_osid_intel_friction.test.ts tests\h_phase_intelligence_warfare.test.ts --reporter=dot` passed 13/13.
- `node node_modules\vitest\vitest.mjs run tests\save_migration_versioned_steps.test.ts tests\save_migration_round_trip_contract.test.ts tests\save_migration_validator_rejection.test.ts tests\state\player_faction_contract.test.ts tests\validate_game_state_shape.test.ts tests\state.test.ts --reporter=dot` passed 217/217.
- `npm.cmd run typecheck` passed.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` remained count-neutral at total 507, with `state: 172` and `sim: 327`.

## Follow-Up

Continue the Optional `GameState` schema lane by classifying one optional family at a time. Runtime-written arrays should receive validate-when-present coverage when absence is legitimate; already-materialized records can be promoted only when migration and current validation already prove required presence.
