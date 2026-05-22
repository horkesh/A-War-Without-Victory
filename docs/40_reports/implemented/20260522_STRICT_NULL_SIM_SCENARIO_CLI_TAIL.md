# Strict-Null Sim Scenario CLI Tail

**Date:** 2026-05-22

## Summary

`src/cli/sim_scenario.ts` no longer contributes any `as_any_casts` to the strict-null inventory. The CLI now parses scenario scripts through local `unknown`/record guards, passes typed `EdgeRecord[]` through the turn and front-edge paths, and reads typed formation, pressure, front-segment, and militia-pool fields without broad `any` widening.

This is a tooling/type-safety cleanup only. It does not change scenario data, save schema, calibration/army-arc tuning, combat math, operation behavior, or turn ordering.

## Inventory Delta

- Before: top-level `as_any_casts 122`; `src/cli/sim_scenario.ts` contributed 27.
- After: top-level `as_any_casts 95`; `src/cli/sim_scenario.ts` contributes 0.
- Remaining `as_any_casts` are confined to:
  - `src/cli/phase3a_ab_harness.ts` (31)
  - `src/cli/phase3abc_audit_harness.ts` (33)
  - `src/state/save_migration.ts` (23)
  - `src/ui/map/data/GameStateAdapter.ts` (8)

## Verification

- Red guard: `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts --reporter=dot` failed before the source cleanup because the new `sim_scenario` cap saw 27 `as_any_casts`.
- Green guard and focused CLI tests: `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts tests\sim_scenario.test.ts tests\phase10_ops_fatigue_scenario.test.ts --reporter=dot` passed 89/89.
- `npm.cmd run typecheck` passed.
- `node tools\diagnostics\strict_null_inventory.cjs` reported `as_any_casts 95`, `as_unknown_casts 0`, `non_null_assertions_dot 0`, and `non_null_assertions_index 0`.

## Follow-Up

The next non-calibration strict-null slices should choose between the two Phase 3 harnesses. `save_migration.ts` remains a dedicated save-shape lane, and `GameStateAdapter.ts` remains gated by the UI/engine FactionId and adapter-contract decisions.
