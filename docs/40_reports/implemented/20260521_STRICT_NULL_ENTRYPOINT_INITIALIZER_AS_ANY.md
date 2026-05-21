# Strict Null Entrypoint Initializer As-Any Cleanup

Date: 2026-05-21

## Summary

`src/cli/sim_run.ts` and `src/index.ts` now contribute zero inventory-counted `as_any_casts`.

Both entrypoints used broad casts only to assemble minimal `GameState` initializers. The cleanup types those initializer domains directly. While verifying the smoke entrypoint, `src/index.ts` also exposed a pre-existing hollow-state failure: it serialized after `executeTurn` without running canonical political-control initialization. The smoke harness now calls `prepareNewGameState` before `executeTurn`, matching its documented role as a deterministic smoke entrypoint.

## Scope

- Replaced six broad initializer casts across `src/cli/sim_run.ts` and `src/index.ts`.
- Added a strict-null progress assertion pinning both entrypoint files at zero `as_any_casts`.
- Updated `src/index.ts` to load the settlement graph and run `prepareNewGameState` before the legacy smoke `executeTurn`.
- Did not run `src/cli/sim_run.ts` during verification because it writes save and derived artifacts by design.
- No live gameplay entrypoint, scenario behavior, save schema, or output tuning changed.

## Verification

- `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts --reporter=dot` PASS (80/80)
- `npm.cmd run typecheck` PASS
- `npx.cmd tsx src\index.ts > $env:TEMP\awwv_index_smoke.json` PASS (`exit=0`)
- `node tools\diagnostics\strict_null_inventory.cjs`
  - `as_factionid_casts`: 2
  - `as_unknown_casts`: 2
  - `as_any_casts`: 153
  - `non_null_assertions_dot`: 0
  - `non_null_assertions_index`: 0
  - `optional_fields_game_state`: 473
