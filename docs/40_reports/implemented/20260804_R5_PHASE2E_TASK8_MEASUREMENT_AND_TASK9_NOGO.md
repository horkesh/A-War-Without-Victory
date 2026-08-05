# R5 Phase 2e Task 8 measurement packet and Task 9 disposition: FAIL_REVERT

**Date:** 2026-08-04
**Plan:** [2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md](../../plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md)
**Manifest:** `data/derived/_debug/r5_phase2e_task8/measurement_manifest.json` (SHA-256 `c601730102fad7e3126bf59dea2e4e1b116f88728ae1ae438194530034ba9480`)
**Revert commit:** `5a1624e10`

## Summary

R5 Phase 2e built a pure-solve/serial-commit extraction of the sector-topology builder (`captureSectorTopologySolveInput` → `solveCorpsFrontSectorsPure` → `commitSectorTopologySolve`), replacing three production call sites' direct `buildCorpsFrontSectors` calls. Tasks 1–7 shipped this cleanly: byte-identical output at every step, two real capture-fidelity bugs found and fixed, a stale test mock found and fixed, a 300-case reconciliation-level equivalence oracle passed 100%, and all three required independent Task 6 reviewers (Technical Architect, Systems/Determinism, Performance) returned PASS. The Performance reviewer flagged one real, disclosed, non-blocking concern: `buildDetachedWorkingFormations` copies every formation a second time on top of capture's own copy, a cost multiplied by `reconcileFinalSectorTruth`'s multi-pass receipt loop, and recommended it be explicitly measured in Task 8 rather than assumed covered.

Task 8's exact-parent measurement packet confirmed that concern as a real, material regression. Task 9's pre-declared retention gates fail: FAIL_REVERT.

## Exact-parent correction

The plan's literal control reference, `0fd36157bd7b92241ac48b8a9e4d94d69f8d2141`, had gone stale — 76 commits behind current HEAD, with the intervening range containing substantial unrelated work (R2, R4, R6, R7). Using it would have attributed ~20 unrelated commits' effects to Phase 2e. The true immediate parent of Phase 2e's first commit (`060eb9b2e`) is `0fcd80bee` — a 40-commit range to HEAD, spot-checked entirely Phase 2e Tasks 1–7. This matches the project's own established precedent (Task 8A's manifest used its own true immediate parent, not a fixed historical anchor). `0fcd80bee` was used as control.

## Functional exactness: PASS

All 14 timed 40-week scenario runs (2 warmups, 2 packets × 3 alternating pairs × 2 lineages) produced the exact same final save: `5,085,892` bytes, SHA-256 `9d2a59dc1097ff3b69d3cec2d19962af32b7199de9f0b311d1dea4c562a596b4`. Byte-identical between control and candidate, matching the documented Task 8A retention-checkpoint fingerprint. Zero drift.

## Timing: FAIL, confirmed by the mandatory repeat

| Packet | Pair 1 | Pair 2 | Pair 3 |
|---|---|---|---|
| First | -4.09% | -3.02% | -3.89% |
| Repeat (after noise check) | -4.06% | -5.73% | -6.92% |

Negative = candidate slower. Every one of 6 pairs across two independent packets regressed; the repeat packet (mandated by the plan when a packet fails, to rule out noise) confirmed and worsened the effect rather than resolving it. This fails all three whole-run timing gates: pairs-improved (0/6, threshold ≥2/3 per packet), median regression (~5.7% observed, threshold ≤1.0%), max regression (~6.9% observed, threshold ≤2.0%).

## Builder and memory: FAIL

- `buildCorpsFrontSectors` inclusive time (single V8 profile): control 15,758.174ms, candidate 17,796.961ms — **+12.94%** (threshold ≤3.0%).
- Phase-boundary sampled peak heap: control 200.09MB, candidate 291.15MB — **+45.5% of control** (threshold ≤105% of control, though both are under the 300MB absolute cap).
- RSS: control 366.11MB, candidate 461.13MB — **+26.0% of control** (threshold ≤110% of control, though both are under the 512MB absolute cap).

## Root cause

The Task 6 independent Performance reviewer's finding, confirmed by this measurement: `buildDetachedWorkingFormations` (`sector_topology_detached_state.ts`) performs a second full per-field copy of every formation on top of the copy `captureFormation` already made during capture. The pre-Phase-2e imperative call made zero formation copies (mutated live state in place). This cost is multiplied by `reconcileFinalSectorTruth`'s multi-pass receipt loop, which can trigger multiple full geometry builds — and therefore multiple full formation-set copies — within a single turn.

## Disposition and revert

FAIL_REVERT per the plan's pre-declared Task 9 rule ("if any exactness, journal, baseline, atomicity, or memory gate fails, reject and revert"). `war_phases.ts` and `scenario_runner.ts` restored verbatim to their pre-Task-4-step-5 bodies. `final_sector_truth_reconciliation.ts` keeps the `geometrySolveStrategy` option — Task 5's 300-case equivalence oracle still depends on it and remains valid, correctness-proven characterization infrastructure for a future re-attempt that fixes the double-copy cost — but its default flipped to `'test-only-imperative-legacy'`, restoring the direct call as the only reachable production path.

Verified after the revert: `npx tsc --noEmit` clean; fresh re-grep confirms `war_phases.ts`/`scenario_runner.ts` no longer reference the pipeline at all; 9 files / 78 tests pass (including 2 previously-failing `centroids: {}` tests, which now pass as an honest side-effect — that crash only occurred in the now-unreachable-by-default pipeline path); a fresh 188-week run produced `final_state_hash bfc7e2cbebfbb9bc`, matching the documented `CALIBRATION_MASTER.md` baseline exactly (638/712 matched_osids, 28/31 anchors, the same 3 already-known/routed R6 Task 0.3 failures) — territory-flat, zero calibration drift.

## What is preserved

- The full pure-solve/commit infrastructure (`sector_topology_snapshot.ts`, `sector_topology_solver.ts`, `sector_topology_commit.ts`, `sector_topology_solver_types.ts`, `sector_topology_detached_state.ts`, `sector_topology_mutation_journal.ts`) — correctness-proven, unreachable in production, reusable for a future re-attempt.
- Tasks 1–5's full test suite, including the 300-case reconciliation-level equivalence oracle — still valid, still exercises the pipeline via explicit `geometrySolveStrategy: 'pipeline'` opt-in.
- The two genuine capture-fidelity bug fixes (`unresolved_sector_brigades`, `entrenchment_turns`) and the stale-mock fix (`aa4ec5b62`) — these are correctness improvements to shared code/tests independent of the production-default question, unaffected by the revert.

## What a future re-attempt needs to fix first

The double formation-copy in `buildDetachedWorkingFormations`. A viable direction: avoid re-copying formations that `captureFormation` already captured immutably — either mutate the capture's own copy in place for the detached working projection (if capture ownership rules allow it) or restructure so the detached working state is derived without a second full-field copy per formation. Whoever picks this up should re-run Task 8's measurement packet (reusable via `data/derived/_debug/r5_phase2e_task8/run_sequence.sh` and `build_manifest.mjs`, parameterized for a fresh control commit) before re-attempting the production-default switch.

## Artifacts

- `data/derived/_debug/r5_phase2e_task8/measurement_manifest.json` (full gate table, raw timing/profile data references)
- `data/derived/_debug/r5_phase2e_task8/run_sequence.sh`, `build_manifest.mjs` (reusable orchestration for a future re-attempt)
- `data/derived/_debug/r5_phase2e_task8/profiles/`, `reports/`, `raw/` (V8 profiles, phase profiles, CPU analysis reports, raw scenario stdout logs)
- Revert commit: `5a1624e10`
