# Patron Defiance Supply Cuts Validate-When-Present Contract

**Date:** 2026-06-04

**Lane:** Optional `GameState` schema contract / engine health.

## Summary

`state.military.patron_defiance_supply_cuts` is now validated when present. This closes another lazy runtime receipt-bus slice without promoting it to required current-save state.

The field remains optional because historical/unset calibration mode never writes it, RBiH defiance has zero coercive-patron severity, and emergent saves only materialize the array when a realized RS/HRHB patron-defiance support cut is greater than zero. No save-schema version bump, migration, fixture, simulation logic, UI routing, scenario data, or TypeScript optionality changed.

## Contract

When present, `military.patron_defiance_supply_cuts` must be an array. Each row must contain:

- `faction`: canonical faction id.
- `turn`: non-negative integer.
- `cut_fraction`: finite number greater than `0` and less than or equal to `1`.
- `support_after`: finite number in `[0,1]`.

## Evidence

Red proof: `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` failed because malformed and non-array `patron_defiance_supply_cuts` payloads were accepted before the validator existed.

Green proof:

- `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` passed 114/114.
- `node node_modules\vitest\vitest.mjs run tests\patron_defiance_receipt.test.ts tests\ui\diplomacy_view.test.ts --reporter=dot` passed 11/11.
- `node node_modules\vitest\vitest.mjs run tests\save_migration_versioned_steps.test.ts tests\save_migration_round_trip_contract.test.ts tests\save_migration_validator_rejection.test.ts tests\state\player_faction_contract.test.ts tests\validate_game_state_shape.test.ts tests\state.test.ts --reporter=dot` passed 205/205.
- `npm.cmd run typecheck` passed.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` remained count-neutral at total 507, with `state: 172` and `sim: 327`.

## Follow-Up

Continue the Optional `GameState` schema lane by classifying one optional family at a time. Lazy persisted buses should receive validate-when-present coverage; already-materialized records can be promoted only when migration and current validation already prove required presence.
