# Supply Design Completion Closeout Report

**Date:** 2026-05-17
**Plan:** `docs/plans/2026-05-17-supply-design-completion-plan.md`
**Result:** Tasks 1-6 implemented for the supply design gap-close lane; canon wording remains queued for manual review.

## Summary

- Added a deterministic supply-design diagnostic and focused test coverage for the legacy spec-vs-code mapping.
- Locked the live-vs-cumulative supply contract: `war_supply_pressure` remains cumulative legacy pressure, while live current supply consumers should use `war_supply_condition` helpers.
- Added bounded bot supply-awareness multipliers and SupplyPanel summary contract coverage without adding new saved state.
- Added the Phase 2 cascade deterministic-order regression and sensitive-history 40w supply smoke gate.

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

### Cascade and Sensitive-History Gates

- `src/state/supply_state_derivation.ts` now uses `strictCompare` for supply derivation output ordering.
- `tests/supply_cascade_deterministic_order.test.ts` proves byte-identical corridor and per-OSID supply output across shuffled adjacency insertion order.
- `tests/supply_sensitive_history_smoke.test.ts` locks retained 40w supply windows for Srebrenica, Zepa, Gorazde, and Bihac.
- `docs/40_reports/CANON_REVIEW_QUEUE.md` records the manual Engine Invariants wording review request; no canon files were edited.

## Verification

- `npx.cmd vitest run tests\supply_design_completion_diagnostic.test.ts`
- `npx.cmd vitest run tests\supply_pressure_vs_condition_reconciliation.test.ts tests\combat_supply_pressure.test.ts tests\supply_reserves.test.ts`
- `npx.cmd vitest run tests\bot_supply_awareness_target_scoring.test.ts tests\bot_corps_corridor.test.ts tests\operation_opportunities*.test.ts`
- Parent integration reran the supply tests inside a 10-file / 74-test integrated focused suite.
- `npx.cmd vitest run tests\supply_design_completion_diagnostic.test.ts tests\supply_pressure_vs_condition_reconciliation.test.ts tests\bot_supply_awareness_target_scoring.test.ts tests\supply_panel_contract.test.ts tests\supply_cascade_deterministic_order.test.ts tests\supply_sensitive_history_smoke.test.ts` - 6 files / 8 tests passed.
- `node tools\diagnostics\supply_design_completion.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1866` - emitted deterministic mapping; cascade propagation row is DONE; canon wording row remains DRIFTED for queue review.
- `npm.cmd run sim:scenario:run:40w` - produced `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1866`, hash `e273e307534d23db`, 27/27 anchors, 6/6 bot benchmarks.
- `npm.cmd run typecheck` - failed on concurrent non-supply bilateral/Washington worktree edits: `alliance_update.ts`, bilateral tests, and Washington tests. No supply-owned TypeScript errors were reported.

## Scenario Results

- Parent-verified integrated 40w n1864: hash `c0d8212847398b8f`, 27/27 anchors, 6/6 benchmarks.
- Integrated 188w n1863: hash `c757c82da8cd8b67`, 25/27 anchors, 6/6 benchmarks.
- Fresh 40w smoke n1866: hash `e273e307534d23db`, 27/27 anchors, 6/6 benchmarks.
- Sensitive-history supply windows at weeks 10/20/30/40: Srebrenica `critical`, Zepa `critical`, Gorazde `strained`, Bihac `strained`; all four watched capital OSIDs remained RBiH-controlled.

## Stop Gates

- No Srebrenica, Zepa, Gorazde, or Bihac supply-window flip was observed.
- No 40w anchor failure or bot benchmark regression was observed.
- Fresh 40w hash changed from retained n1864 (`c0d8212847398b8f`) to n1866 (`e273e307534d23db`) in a dirty worktree containing concurrent non-supply edits; do not attribute this drift to the supply cascade test without a clean isolation rerun.

## Remaining Work

- Manual canon review queue item for Engine Invariants Section 4 supply cascade wording.
- Keep direct `war_supply_pressure` readers classified as cumulative-only; route live current-supply reads through helpers.
