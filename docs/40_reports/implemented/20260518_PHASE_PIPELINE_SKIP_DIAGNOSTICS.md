# Phase Pipeline Skip Diagnostics

**Date:** 2026-05-18
**Run ID:** N/A
**Baseline:** War-phase steps could return early on absent optional inputs without a persisted turn-report diagnostic.
**Result:** `runTurn` now supports typed per-step skip predicates that append deterministic `{phase, step, skip_reason}` rows to `TurnReport.phase_skip_diagnostics`.

## Summary
- Added a typed phase skip diagnostic structure and a small phase-runner wrapper so prerequisite skips are persisted in the turn report rather than console-only logs.
- Annotated the `sync-front-segments` missing `settlementEdges` prerequisite with `missing_settlement_edges`.
- Added focused Vitest coverage for missing-data diagnostic emission and deterministic normal war-phase diagnostic output.

## Changes Made
### Pipeline Types And Runner
- `src/sim/turn_pipeline_types.ts` adds `PhaseSkipDiagnostic`, `PhaseSkipPredicate`, optional `NamedPhase.skipIf`, `TurnReport.phase_skip_diagnostics`, `missingSettlementEdges(...)`, and `recordPhaseSkipDiagnostic(...)`.
- `src/sim/turn_pipeline.ts` routes war and bottom-up phase execution through `runNamedPhase(...)`, preserving `report.phases` ordering while recording the first matching skip predicate before skipping the step body.

### War Phase Wiring
- `src/sim/turn_phases/war_phases.ts` annotates `sync-front-segments` with `skipIf: [missingSettlementEdges]`.

### Tests
- `tests/pipeline_skip_diagnostics.test.ts` verifies a missing `settlementEdges` early-skip records `{ phase: 'war', step: 'sync-front-segments', skip_reason: 'missing_settlement_edges' }`.
- The same test file verifies repeated normal war-phase runs with explicit edges produce identical phase and skip-diagnostic output and do not emit the missing-edges diagnostic.

## Verification
- RED: `cmd /c npm.cmd run test:ui -- tests/pipeline_skip_diagnostics.test.ts`
  - Failed as expected before implementation: `undefined is not iterable` at the missing diagnostic assertion.
- GREEN focused: `cmd /c npm.cmd run test:ui -- tests/pipeline_skip_diagnostics.test.ts`
  - `Test Files 1 passed (1)`
  - `Tests 2 passed (2)`
- Nearby pipeline regression: `cmd /c npm.cmd run test:ui -- tests/combat_pipeline.test.ts tests/pipeline_step_execution_proof.test.ts tests/pipeline_skip_diagnostics.test.ts`
  - `Test Files 3 passed (3)`
  - `Tests 16 passed (16)`
- Typecheck: `cmd /c npm.cmd run typecheck`
  - Blocked by existing out-of-scope `src/sim/combat/sector_offensive.ts` errors:
    - `src/sim/combat/sector_offensive.ts(716,45): error TS2345 ... Type '"recent_catastrophic_losses_at_objective"' is not assignable ...`
    - `src/sim/combat/sector_offensive.ts(870,45): error TS2345 ... Type '"recent_catastrophic_losses_at_objective"' is not assignable ...`
- Diff hygiene: `git diff --check -- src/sim/turn_pipeline_types.ts src/sim/turn_pipeline.ts src/sim/turn_phases/war_phases.ts tests/pipeline_skip_diagnostics.test.ts`
  - Exit 0; no whitespace errors. Git warned that touched TypeScript files will normalize from CRLF to LF when Git next touches them.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/turn_pipeline_types.ts` | Added typed skip diagnostics and reusable missing-edges predicate/helper. |
| `src/sim/turn_pipeline.ts` | Added wrapper execution path for `NamedPhase.skipIf`. |
| `src/sim/turn_phases/war_phases.ts` | Wired missing `settlementEdges` skip diagnostic for `sync-front-segments`. |
| `tests/pipeline_skip_diagnostics.test.ts` | Added focused diagnostic and determinism tests. |
| `docs/40_reports/implemented/20260518_PHASE_PIPELINE_SKIP_DIAGNOSTICS.md` | Implementation report. |

## Next Steps
- Extend `skipIf` annotations to additional pure missing-prerequisite returns after each candidate step is checked for side effects before return.
- Re-run full `npm run typecheck` after the out-of-scope `sector_offensive.ts` blocker is resolved.
