# Phase 4 Bot AI Modularization

**Date:** 2026-03-09  
**Context:** Phase 4 of the [2026-03-09 Evaluation Remediation Plan](../../plans/2026-03-09-evaluation-remediation-plan.md)  

## Goal
Break down the monolithic brigade evaluation loop in `bot_brigade_ai_osid.ts` (~1000 lines) to prevent priority collisions and improve maintainability, while strictly preserving zero behavioral changes.

## Implementation Details

The monolithic `executeFactionDirectives` loop evaluated a massive set of overlapping conditions and nested scopes to determine each brigade's order. This has been refactored into a composed chain of functional evaluators.

1. **Context Encapsulation (`bot_brigade_eval_types.ts`)**: 
   - Introduced `BrigadeEvaluationContext` to hold all static mappings (`adjacency`, `reverseMap`, `terrainCache`), mutable trackers (`chosenTargets`, `columnAssignments`, `result`), and pre-computed brigade states (`adjEnemy`, `brigadeSupplyState`, `corpsStance`).
   
2. **Purely Functional Evaluation Modules**:
   - `bot_brigade_eval_hold.ts`: Handles static defensive states (`evaluateGarrisonAndDetachments`, `evaluateReserve`, `evaluateHold`).
   - `bot_brigade_eval_attack.ts`: Evaluates offensive capability. Includes `evaluateHomeDefense` (opportunistic counter-attacks), `evaluateSectorAttack` (named operation planning/execution/recovery), `evaluateReorganize`, `evaluateDefensive`, and the mainline `evaluateOffensive`.
   - `bot_brigade_eval_front.ts`: Manages front coverage with `evaluateSectorMarch` and `evaluateFrontCoverage` (density rebalancing, gap filling).
   - `bot_brigade_eval_movement.ts`: Contains the final fallback `evaluateInteriorMovement` to drive deep-rear units toward the front.

3. **Duplication Elimination**:
   - Abstracted duplicated BFS search logic (for nearest offensive target) into `findNearestOffensiveTarget` inside `bot_brigade_movement_ai.ts`.
   - Refactored redundant default fallback directive initializations.

## Validation

- **Type Safety**: `npx tsc --noEmit` passes with 0 errors.
- **Unit Tests**: All 436 Vitest pipeline tests passed instantly.
- **Determinism / Behavioral Integrity**: `npm run sim:scenario:probe` executed a full 52-week run (`noop_52w_probe_intent`) against the pre-refactor baseline, resulting in **zero behavioral deltas**. No downstream consequence pathways were toggled, confirming absolute parity with the monolith logic.

## Ledger Entry
Logged to `PROJECT_LEDGER.md` on 2026-03-09.
