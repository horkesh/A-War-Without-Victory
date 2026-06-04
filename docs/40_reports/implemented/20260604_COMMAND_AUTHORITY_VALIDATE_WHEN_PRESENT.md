# Command Authority Validate-When-Present Contract

**Date:** 2026-06-04

## Summary

`state.military.command_authority` now validates when present. The field remains optional because it is a player-only presidential resource that is absent from headless/calibration saves, pre-Phase-2 saves, and any state before the presidential command shell materializes it.

This is a save-validator contract only. It does not bump the save schema, add a migration, alter fixtures, change TypeScript optionality, move simulation behavior, or change UI routing.

## Contract

When `military.command_authority` is present, it must be an object with:

- `current`: finite non-negative number
- `max`: finite non-negative number
- `spent_this_turn`: finite non-negative number
- `lifetime_spent`: finite non-negative number
- `current <= max`

Absent `military.command_authority` remains valid.

## Verification

Red proof:

```powershell
node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot
```

The focused validator file failed before the production validator change because malformed and non-record `military.command_authority` payloads were accepted.

Green proof:

```powershell
node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot
node node_modules\vitest\vitest.mjs run tests\author_op_staging.test.ts tests\co_replacement_staging.test.ts tests\elite_deploy_staging.test.ts tests\front_visit_action.test.ts tests\op_directive_staging.test.ts tests\op_halt_staging.test.ts tests\ui\author_op_eligibility.test.ts --reporter=dot
node node_modules\vitest\vitest.mjs run tests\save_migration_versioned_steps.test.ts tests\save_migration_round_trip_contract.test.ts tests\save_migration_validator_rejection.test.ts tests\state\player_faction_contract.test.ts tests\validate_game_state_shape.test.ts tests\state.test.ts --reporter=dot
npm.cmd run typecheck
node tools\diagnostics\strict_null_inventory.cjs --field-domains
```

Observed green counts:

- focused validator file: 132/132
- command-authority consumer pack: 74/74
- broader save/schema pack: 223/223
- typecheck: pass
- strict-null inventory: count-neutral total 507 (`derived: 8`, `sim: 327`, `state: 172`)

## Files

- `src/state/validateGameState.ts`
- `tests/save_migration_validator_rejection.test.ts`
- `docs/40_reports/implemented/20260604_COMMAND_AUTHORITY_VALIDATE_WHEN_PRESENT.md`
- `docs/PROJECT_LEDGER.md`
- `docs/plans/MASTER_ROADMAP.md`
- `docs/plans/COMMAND_BOARD.md`
- `docs/40_reports/README.md`
- `.claude/napkin.md`
