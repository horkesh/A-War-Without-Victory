# Operation Opportunity AAR Loop Closure

**Date:** 2026-05-01
**Baseline:** Lane B Operation Opportunity MVP (`4deedf06`) plus VRS equipment floor integration (`6b8991d1`)
**Result:** Opportunity resolutions now link to completed operation AARs

## Summary
- Closed the opportunity observability loop: an approved opportunity that spawns a normal `CorpsOperation` now records the completed `OperationAAR` id and exit class on its `OperationOpportunityResolution`.
- Kept the lifecycle single-owner rule intact. `sector_offensive.ts` still finalizes normal AARs; the opportunity layer only links the resulting AAR back to its resolution row.
- Added red/green coverage for the linker and exit-class mapping.

## Changes Made

### AAR Return Value
- `src/sim/combat/operation_aar.ts`
  - `finalizeOperationAAR(...)` now returns the `OperationAAR` it just appended to `state.operation_history`.
  - Existing callers that ignore the return remain compatible.

### Opportunity Resolution Linker
- `src/sim/combat/operation_opportunities.ts`
  - Added `exitClassFromOperationAAR(aar)`.
  - Added `linkOpportunityResolutionToAAR(state, aar)`.
  - Matching is narrow and deterministic: same operation name, same response/start turn, unresolved `executed_op_aar_id`, stable sort by response turn and proposal id.

### Lifecycle Wiring
- `src/sim/combat/sector_offensive.ts`
  - After `finalizeOperationAAR(...)`, calls `linkOpportunityResolutionToAAR(...)`.
  - Commander experience now uses the returned AAR directly instead of re-reading the latest operation-history row.

## Exit-Class Mapping

| AAR outcome | Opportunity exit_class |
|---|---|
| `success` | `decisive_success` |
| `partial` | `partial_success` |
| `failure` with `total_attacks === 0` | `did_not_launch` |
| `failure` with attacks | `failed` |
| `orphaned` | `aborted` |

## Verification
- Red test: `npx.cmd vitest run tests/operation_opportunities_substrate.test.ts -t "links a completed operation AAR"` failed with `linkOpportunityResolutionToAAR is not a function`.
- Green focused test: same command passed after implementation.
- Linker suite: `npx.cmd vitest run tests/operation_opportunities_substrate.test.ts` -> 21/21 pass.
- Integration coverage: `tests/operation_completion_truth.test.ts` verifies `advanceSectorOffensives(...)` links the resolution when a sector attack completes recovery and finalizes its AAR.
- TypeScript: `npx.cmd tsc --noEmit` -> clean.
- Focused regression pack: `npx.cmd vitest run tests/operation_opportunities_substrate.test.ts tests/operation_opportunities_phase2_decisions.test.ts tests/operation_opportunities_5th_corps_sana.test.ts tests/operation_aar.test.ts tests/sector_offensive_idle_recovery.test.ts tests/operation_completion_truth.test.ts tests/triggered_operations.test.ts tests/triggered_operations_late_1995.test.ts tests/corps_operation_readiness.test.ts tests/force_quality_trace_persistence.test.ts tests/multi_corps_operation_visibility.test.ts tests/war_phase_step_order.test.ts` -> 152/152 pass.
- `git diff --check` -> clean (line-ending warnings only).

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/operation_aar.ts` | Return the finalized AAR. |
| `src/sim/combat/operation_opportunities.ts` | Add AAR linker and exit-class mapper. |
| `src/sim/combat/sector_offensive.ts` | Link opportunity resolutions immediately after normal AAR finalization. |
| `tests/operation_opportunities_substrate.test.ts` | Add linker and exit-class coverage. |
| `tests/operation_completion_truth.test.ts` | Add sector-offensive integration coverage for opportunity AAR links. |
| `src/state/game_state.ts` | Clarify resolution-log ownership comment. |

## Next Steps
- Future UI/Cost Ledger work can now consume `operation_opportunity_resolutions[*].executed_op_aar_id` and `exit_class` instead of inferring from operation names.
