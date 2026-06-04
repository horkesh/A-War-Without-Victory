# Army HQ Overrides Validate-When-Present

**Date:** 2026-06-04
**Branch:** `codex/army-hq-overrides-contract`
**Lane:** Optional `GameState` schema contract
**Type:** Save/schema validator hardening

## Summary

`state.military.army_hq_overrides` remains an optional per-turn Army HQ directive bus, but malformed present payloads now fail save validation.

This is a validate-when-present contract only. It does not add a save-schema version, migration, fixture default, TypeScript required-field promotion, simulation behavior change, scenario data change, Tactical Group change, `army_hq_operations` change, UI routing change, or player-facing command change.

## Contract

`military.army_hq_overrides` is optional because Army HQ directives are generated or staged only for the current turn and are cleared after consumption. Absence means no active Army HQ override directive.

When present it must be an array of `ArmyHQOverride` objects:

- `corps_id`: non-empty string.
- `operation_name`: non-empty string.
- `min_brigades`: positive integer.
- `target_osids`: string array. Empty arrays are valid for synchronized-operation participants with no current offensive targets.
- `reason`: non-empty string.
- `issued_turn`: non-negative integer.
- `type`: `offensive`, `probe`, or `feint`.
- Optional `max_brigades`: positive integer when present.

The validator does not normalize, sort, migrate, clear, or materialize the bus. It also deliberately avoids the separate v34 Tactical Group / `army_hq_operations` records.

## Verification

Focused validation and consumers passed:

- Red proof: `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` failed because malformed/non-array `army_hq_overrides` payloads were accepted.
- `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` - 150/150.
- `node node_modules\vitest\vitest.mjs run tests\commander_override.test.ts tests\army_hq_gathering.test.ts --reporter=dot` - 98/98.
- `npm.cmd run typecheck -- --pretty false`.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` stayed count-neutral at total 507 (`state: 172`, `sim: 327`).

Baseline regression is not required for this slice because it only rejects malformed present saves and does not change valid turn execution or scenario data.
