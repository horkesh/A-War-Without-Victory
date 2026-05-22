# Strict-Null Scenario Runner Startup Tail

Date: 2026-05-22

## Scope

Type-only cleanup in the scenario runner startup and scenario input contract. No simulation behavior, save schema version, scenario data, baseline manifest, painted-control target, combat math, operation delivery, or calibration/army-arc tuning changed.

## Change

- Added `max_turns?: number` to the scenario input type because `scenario_runner.ts` already consumed that field into `state.meta.max_turns`.
- Replaced the remaining scenario-runner startup scaffold `as any` casts with `GameState['military']`, `GameState['political']`, and `GameState['displacement']` property casts.
- Removed the `scenario as any` max-turn reads.
- Added a strict-null inventory guard pinning `src/scenario/scenario_runner.ts` at zero `as_any_casts`.

## Inventory

`node tools\diagnostics\strict_null_inventory.cjs` current floor after this slice:

- `as_factionid_casts`: 2
- `as_unknown_casts`: 0
- `as_any_casts`: 122
- `non_null_assertions_dot`: 0
- `non_null_assertions_index`: 0
- `optional_fields_game_state`: 477

## Verification

- `npm.cmd run typecheck` passed.
- `npx.cmd vitest run tests\scenario_runner_artifact_repair.test.ts tests\integration_run_summary.test.ts tests\scenario_reporting_contracts.test.ts --reporter=dot` passed 12/12.
- `node tools\diagnostics\strict_null_inventory.cjs` reports the floor above.

## Roadmap Delta

`src/scenario/scenario_runner.ts` is now closed for inventory-counted `as_any_casts`. Remaining `as_any_casts` are concentrated in the Phase 3A/3ABC CLI harnesses, `sim_scenario.ts`, save migration, and `GameStateAdapter`.
