# Displacement Civilian Casualties Schema Contract

**Date:** 2026-05-26
**Status:** Implemented
**Scope:** Optional `GameState` schema-contract slice for `displacement.civilian_casualties`

## Summary

`displacement.civilian_casualties` is now a required persisted v19 field. The migration materializes legacy saves with the inert default `{}`, current-version validation rejects missing/non-record/malformed casualty maps, and the strict-null optional `GameState` floor drops from 466 to 465 (`state` 160 to 159).

## Writer Trap Fixed

This field was not a simple empty-map promotion. `recordCivilianDisplacementCasualties(...)` previously initialized faction buckets only when the entire `civilian_casualties` map was absent. After migration, legacy saves can correctly contain `civilian_casualties: {}`; that shape caused the first casualty for a faction to be silently dropped. The writer now creates the per-faction `{ killed: 0, fled_abroad: 0 }` bucket on first write, so an empty persisted map records the first casualty.

The v19 migration intentionally does not preseed all factions. It only ensures the outer record exists.

## Validation

The validator now requires `displacement.civilian_casualties` as of v19 and validates every present entry:

- entry must be a record
- `killed` must be a finite non-negative number
- `fled_abroad` must be a finite non-negative number

The scenario runner run-summary gate now checks for at least one non-empty finite casualty record before emitting `civilian_casualties`, so the required `{}` default does not create empty summaries.

## Artifacts

- `src/state/game_state.ts`
- `src/state/save_migration.ts`
- `src/state/validateGameState.ts`
- `src/state/displacement_state_utils.ts`
- `src/scenario/scenario_runner.ts`
- `tests/displacement_civilian_casualties_contract.test.ts`
- `tests/state.test.ts`
- `tests/save_migration_validator_rejection.test.ts`
- `tests/save_migration_versioned_steps.test.ts`
- `tests/fixtures/save_migration/v18_civilian_casualties.json`
- `tests/strict_null_inventory_progress.test.ts`
- `tools/diagnostics/output/save_migration_drift.json`
- `docs/40_reports/strict_null_inventory_baseline.json`
- `docs/40_reports/strict_null_field_domains.json`

## Verification

- Red first: focused save/writer tests failed before production changes because v19 was absent, current saves accepted missing/malformed casualty maps, v18 migration left `civilian_casualties` undefined, the empty-map writer dropped the first record, and the run-summary helper was absent.
- Focused green: `npx.cmd vitest run tests/save_migration_validator_rejection.test.ts tests/save_migration_versioned_steps.test.ts tests/save_migration_round_trip_contract.test.ts tests/displacement_civilian_casualties_contract.test.ts` - PASS; 91/91 tests.
- Post-hotfix integration first failed `tests/state.test.ts` because the v19 required field was missing from the current-schema base round-trip fixture; `civilian_casualties: {}` was added beside the v18 displacement map defaults.
- Merged focused pack: `.\vitest.cmd run tests\save_migration_validator_rejection.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_round_trip_contract.test.ts tests\save_migration_drift_audit.test.ts tests\save_migration_counter_offers.test.ts tests\strict_null_inventory_progress.test.ts tests\state\player_faction_contract.test.ts tests\migration_nested_ownership.test.ts tests\displacement_civilian_casualties_contract.test.ts tests\state.test.ts --reporter=dot` - PASS; 196/196 tests.
- `node tools/diagnostics/strict_null_inventory.cjs` - PASS; `optional_fields_game_state 465`, counted escape categories all zero.
- `node tools/diagnostics/strict_null_inventory.cjs --field-domains` - PASS; total 465, `sim 298`, `state 159`, `derived 8`, `unknown 0`.
- `node tools/diagnostics/save_migration_drift_audit.cjs` - PASS; `save migration drift audit: 0 anonymous defaults`.
- `npx.cmd tsc --noEmit -p tsconfig.json --pretty false` - PASS.
- `git diff --check` - PASS.
