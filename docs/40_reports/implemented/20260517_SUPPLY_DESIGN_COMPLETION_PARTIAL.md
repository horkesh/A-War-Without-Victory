# Supply Design Completion Partial Implementation Report

**Date:** 2026-05-17
**Plan:** `docs/plans/2026-05-17-supply-design-completion-plan.md`
**Result:** Tasks 1-4 partially implemented; remaining sensitive-history smoke/cascade follow-ups stay open.

## Summary

- Added a deterministic supply-design diagnostic and focused test coverage for the legacy spec-vs-code mapping.
- Locked the live-vs-cumulative supply contract: `war_supply_pressure` remains cumulative legacy pressure, while live current supply consumers should use `war_supply_condition` helpers.
- Added bounded bot supply-awareness multipliers and SupplyPanel summary contract coverage without adding new saved state.

## Changes Made

### Diagnostics

- `tools/diagnostics/supply_design_completion.cjs` emits a deterministic spec-mapping table for the implemented supply surface.
- `tests/supply_design_completion_diagnostic.test.ts` verifies stable output and file-anchor coverage.

### Supply Truth Contract

- `src/state/game_state.ts` documents `war_supply_pressure` as cumulative.
- `src/sim/combat/corps_operation_readiness.ts` exposes and uses `computeFactionPoolPressureFactor(...)` through the live supply helper.
- `tests/supply_pressure_vs_condition_reconciliation.test.ts` guards live-vs-cumulative behavior.

### Bot Scoring and UI Contract

- `src/sim/combat/bot_corps_directives.ts` adds bounded enemy-target and own-defense supply multipliers.
- `src/ui/map/data/GameStateAdapter.ts`, `src/ui/map/data/types.ts`, and `src/ui/map/components/SupplyPanel.tsx` expose/consume deterministic faction supply summary counts.
- `tests/bot_supply_awareness_target_scoring.test.ts` and `tests/supply_panel_contract.test.ts` cover the scoring and UI contracts.

## Verification

- `npx.cmd vitest run tests\supply_design_completion_diagnostic.test.ts`
- `npx.cmd vitest run tests\supply_pressure_vs_condition_reconciliation.test.ts tests\combat_supply_pressure.test.ts tests\supply_reserves.test.ts`
- `npx.cmd vitest run tests\bot_supply_awareness_target_scoring.test.ts tests\bot_corps_corridor.test.ts tests\operation_opportunities*.test.ts`
- Parent integration reran the supply tests inside a 10-file / 74-test integrated focused suite.

## Scenario Results

- Parent-verified integrated 40w n1864: hash `c0d8212847398b8f`, 27/27 anchors, 6/6 benchmarks.
- Integrated 188w n1863: hash `c757c82da8cd8b67`, 25/27 anchors, 6/6 benchmarks.

## Remaining Work

- Complete cascade deterministic-order and sensitive-history supply-window smoke tasks.
- Run the diagnostic against the final retained run artifact after the remaining supply tasks land.
- Keep direct `war_supply_pressure` readers classified as cumulative-only; route live current-supply reads through helpers.
