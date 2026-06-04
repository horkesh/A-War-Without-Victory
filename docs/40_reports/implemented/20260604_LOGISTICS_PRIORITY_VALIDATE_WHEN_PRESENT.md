# Logistics Priority Validate-When-Present Contract

**Date:** 2026-06-04

**Lane:** Optional `GameState` schema contract / engine health.

## Summary

`state.military.logistics_priority` is now validated when present. This closes the logistics-priority slice without promoting the field to required current-save state.

The field remains optional because it is player-entered and runtime-normalized logistics weighting. Absence is legitimate before any priority map is staged or written. No save-schema version bump, migration, fixture, simulation logic, UI routing, scenario data, or TypeScript optionality changed.

## Contract

When present, `military.logistics_priority` must be an object mapping canonical faction ids to object maps of target id to finite non-negative priority numbers.

The validator intentionally does not cap values to the runtime `[0.5, 1.5]` logistics multiplier band. Runtime consumers clamp entered priority through `clampLogisticsPriority(...)`; the save validator only rejects malformed shape and nonsensical numeric payloads.

## Evidence

Red proof: `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` failed because malformed and non-record `logistics_priority` payloads were accepted before the validator existed.

Green proof:

- `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` passed 129/129.
- `node node_modules\vitest\vitest.mjs run tests\logistics_priority_wiring_red.test.ts tests\logistics_priority_ipc_path.test.ts --reporter=dot` passed 7/7.
- `node node_modules\vitest\vitest.mjs run tests\save_migration_versioned_steps.test.ts tests\save_migration_round_trip_contract.test.ts tests\save_migration_validator_rejection.test.ts tests\state\player_faction_contract.test.ts tests\validate_game_state_shape.test.ts tests\state.test.ts --reporter=dot` passed 220/220.
- `npm.cmd run typecheck` passed.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` remained count-neutral at total 507, with `state: 172` and `sim: 327`.

## Follow-Up

Continue the Optional `GameState` schema lane by classifying one optional family at a time. Player-entered/runtime-normalized maps should receive validate-when-present coverage when absence is legitimate; already-materialized records can be promoted only when migration and current validation already prove required presence.
