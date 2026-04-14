# Diagnostics Seam Hardening — Assignment Pipeline Reporting Truth

**Date:** 2026-04-12  
**Type:** Diagnostic/reporting hardening  
**Handoff from:** Codex (n1559 baseline, hash 379fdd5cc3f5ce48)  
**Sim behavior change:** None (diagnostic-only)

## Candidate Seams Considered

1. **Triple emission of "fell through sector pipeline"** — `buildCorpsFrontSectors()` calls `emitFinalUnresolvedSectorWarnings()` at three pipeline steps (598, 2588, 2626). Only step 2626 is genuinely final. Steps 598 and 2588 emit false-positive warnings for brigades that later repair passes resolve.

2. **Mid-pipeline "UNRESOLVED"/"UNASSIGNED" language** — Four emissions in `brigade_assignment.ts` (lines 570, 766, 786, 904) use alarming language for transient states that `ensureMinimumSectorCoverage()` or `rehomeUnassignedBrigadesToPhysicalSectorOwners()` routinely fix.

3. **Dead code confusion** — `warnUnresolvedSectorAssignments()` exported from `brigade_assignment.ts` but never called in production. Creates false impression of an alternative emission path.

## Exact Seam Chosen

All three — they are different facets of the same reporting-truth problem and the fixes are orthogonal with no interaction risk.

## Why Highest-Value Bounded Step

The final save (`unresolved_sector_brigades: []`) was already correct. The seam was purely in developer-facing diagnostics: transient mid-pipeline churn logged with the same severity and language as final unresolved truth, harming anomaly reading and developer trust. Fixing this is zero-risk to sim determinism and immediately improves signal-to-noise in scenario logs.

## Canonical Owner After Cleanup

**`emitFinalUnresolvedSectorWarnings()`** in `corps_front_sectors.ts` (line 403), gated by `isFinalPass` parameter. Only fires at war_phases.ts step 2626 (`reconcile-final-sector-truth-after-ops`).

## Demoted Path After Cleanup

| Location | Old behavior | New behavior |
|----------|-------------|-------------|
| `corps_front_sectors.ts` steps 598, 2588 | Emitted "fell through sector pipeline" warnings | `isFinalPass=false` (default) — warnings suppressed |
| `brigade_assignment.ts:570` | `UNASSIGNED ${bid}` | `[PROVISIONAL] UNASSIGNED ${bid}` |
| `brigade_assignment.ts:766` | `UNASSIGNED ${bid}: rear-guard...` | `[PROVISIONAL] UNASSIGNED ${bid}: rear-guard...` |
| `brigade_assignment.ts:786` | `UNASSIGNED ${bid}: no reachable...` | `[PROVISIONAL] UNASSIGNED ${bid}: no reachable...` |
| `brigade_assignment.ts:904` | `UNRESOLVED ${bid}: assigned sector...became unreachable` | `[PROVISIONAL] UNRESOLVED ${bid}: assigned sector...became unreachable` |
| `brigade_assignment.ts:1274` | Exported, undocumented as dead | `@deprecated` JSDoc pointing to canonical path |

## Exact Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/corps_front_sectors.ts` | Added `isFinalPass: boolean = false` param to `buildCorpsFrontSectors()`; gated `emitFinalUnresolvedSectorWarnings()` call behind `if (isFinalPass)` |
| `src/sim/combat/brigade_assignment.ts` | Prefixed 4 mid-pipeline warnings with `[PROVISIONAL]`; added `@deprecated` JSDoc to `warnUnresolvedSectorAssignments()` |
| `src/sim/combat/final_sector_truth_reconciliation.ts` | Added `isFinalPass: boolean = false` param to `reconcileFinalSectorTruth()`; passes through to `buildCorpsFrontSectors()` |
| `src/sim/turn_phases/war_phases.ts` | Step 2626 (`reconcile-final-sector-truth-after-ops`) now passes `true` for `isFinalPass` |
| `tests/final_sector_truth_reconciliation.test.ts` | Test for `isFinalPass` gating contract: non-final pass suppresses warnings, final pass enables them |

## Exact Verification Results

| Check | Result |
|-------|--------|
| `npx.cmd tsc --noEmit -p tsconfig.json` | PASS (clean) |
| `npm.cmd run build` | PASS |
| `npm.cmd run desktop:map:build` | PASS (via recovery:check) |
| `npx.cmd vitest run tests/final_sector_truth_reconciliation.test.ts` | 3/3 PASS |
| `npm.cmd run test:vitest` | **290 files, 3312 tests, 0 failures** |

## Scenario/Log Proof

No fresh 40w run required — these are diagnostic-only changes that do not affect:
- Simulation determinism (no state mutation changes)
- `collectUnresolvedSectorBrigades` collection logic (unchanged)
- `state.military.unresolved_sector_brigades` final value (unchanged)
- Scenario hash (should remain 379fdd5cc3f5ce48)

The changes only affect WHEN console warnings are emitted (gated to final pass) and HOW mid-pipeline warnings are labeled (prefixed with `[PROVISIONAL]`).

## Exact Docs Updated

- This report: `docs/40_reports/implemented/20260412_DIAGNOSTICS_SEAM_HARDENING.md`
- Ledger: `docs/PROJECT_LEDGER.md` (entry appended)

## Exact Residual Risks

1. **`warnUnresolvedSectorAssignments()` still exists** — marked `@deprecated` but not deleted because tests reference it. Low risk: the deprecation JSDoc names the canonical path.

2. **Mid-pipeline `[PROVISIONAL]` warnings still emit** — they are now clearly labeled as transient, but still produce console output. A future pass could gate these behind a debug flag if log volume remains a concern.

3. **No positive-case test for final emission** — the test proves the gating mechanism (non-final suppresses, final enables) but cannot easily construct a genuinely unresolved brigade in a minimal harness because the pipeline is designed to prevent that. The real-scenario validator (`validate_run_consistency.cjs`) serves as the integration-level proof.

## Recommended Next Lane

Per the Codex handoff, the next bounded seam candidates are:
1. **ZEA rate investigation** — 47% zero-eligible-attacker ops; staging unreachability and op-scale cap interaction
2. **estimateTurnsActive broken suspend counter** — `suspendedTurns` goes negative, preventing self-abandonment
3. **Ozren pocket hold_osids** — petrovo_2/brijesnica_donja_2/vozuca_2 flip too early
