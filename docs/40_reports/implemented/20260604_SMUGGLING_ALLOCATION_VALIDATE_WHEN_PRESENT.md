# Smuggling Allocation Validate-When-Present Contract

**Date:** 2026-06-04

**Lane:** Optional `GameState` schema contract / engine health.

## Summary

`state.military.smuggling_allocation` is now validated when present. This closes the smuggling allocation slice without promoting the field to required current-save state.

The field remains optional because it is a player-entered/runtime-normalized allocation record and absence is legitimate before any smuggling allocation is staged or normalized. No save-schema version bump, migration, fixture, simulation logic, UI routing, scenario data, or TypeScript optionality changed.

## Contract

When present, `military.smuggling_allocation` must be an object mapping enclave ids to allocation entries. Each entry must contain:

- `type`: `ammo` or `food`.
- `amount`: finite non-negative number.

Zero remains valid because the existing allocation normalizer can preserve an explicitly empty share while runtime distribution ignores non-positive allocation weight for delivery.

## Evidence

Red proof: `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` failed because malformed and non-record `smuggling_allocation` payloads were accepted before the validator existed.

Green proof:

- `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` passed 120/120.
- `node node_modules\vitest\vitest.mjs run tests\phase_c_supply_agency.test.ts tests\supply_airdrop.test.ts --reporter=dot` passed 13/13.
- `node node_modules\vitest\vitest.mjs run tests\save_migration_versioned_steps.test.ts tests\save_migration_round_trip_contract.test.ts tests\save_migration_validator_rejection.test.ts tests\state\player_faction_contract.test.ts tests\validate_game_state_shape.test.ts tests\state.test.ts --reporter=dot` passed 211/211.
- `npm.cmd run typecheck` passed.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` remained count-neutral at total 507, with `state: 172` and `sim: 327`.

## Follow-Up

Continue the Optional `GameState` schema lane by classifying one optional family at a time. Player-entered or lazily normalized records should receive validate-when-present coverage; already-materialized records can be promoted only when migration and current validation already prove required presence.
