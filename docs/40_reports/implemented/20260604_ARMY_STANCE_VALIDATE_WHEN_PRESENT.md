# Army Stance Validate-When-Present Contract

**Date:** 2026-06-04

**Lane:** Optional `GameState` schema contract / engine health.

## Summary

`state.military.army_stance` is now validated when present. This closes the army-level stance record slice without promoting the field to required current-save state.

The field remains optional because it is runtime-written by standing-order / corps-command phases and absence is legitimate before those phases have populated a save. No save-schema version bump, migration, fixture, simulation logic, UI routing, scenario data, or TypeScript optionality changed.

## Contract

When present, `military.army_stance` must be an object mapping canonical faction ids to valid `ArmyStance` values:

- `general_defensive`
- `balanced`
- `general_offensive`
- `total_mobilization`

Unknown faction keys and unknown stance values now fail current-save validation.

## Evidence

Red proof: `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` failed because malformed and non-record `army_stance` payloads were accepted before the validator existed.

Green proof:

- `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` passed 123/123.
- `node node_modules\vitest\vitest.mjs run tests\corps_command.test.ts tests\bot_three_sides_validation.test.ts --reporter=dot` passed 34/34.
- `node node_modules\vitest\vitest.mjs run tests\save_migration_versioned_steps.test.ts tests\save_migration_round_trip_contract.test.ts tests\save_migration_validator_rejection.test.ts tests\state\player_faction_contract.test.ts tests\validate_game_state_shape.test.ts tests\state.test.ts --reporter=dot` passed 214/214.
- `npm.cmd run typecheck` passed.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` remained count-neutral at total 507, with `state: 172` and `sim: 327`.

## Follow-Up

Continue the Optional `GameState` schema lane by classifying one optional family at a time. Runtime-written records should receive validate-when-present coverage when absence is legitimate; already-materialized records can be promoted only when migration and current validation already prove required presence.
