# Empty-Objective Probe Guard Fix

**Date:** 2026-04-05
**Mission:** Eliminate dominant remaining family of recovery-without-attempt cases: probes created without enemy-adjacent OSID targets that immediately "completed" with zero attacks.

## Specialists Used

| Specialist | Owned | Evidence |
|---|---|---|
| Gameplay Programmer | emit.ts probe guard implementation | Guard added at line 772, tsc clean |
| QA Engineer | 3 targeted regression tests | All pass, 2338 total |
| Scenario Runner (orchestrator) | n1319 validation | 94.3%, 27/27, kopcic_2 recovered |
| Documentation Specialist | Report + ledger + architect notes | This report |

## Root Cause: Empty-objective probes

When a probe sector had no enemy-adjacent OSIDs, `probeObjectives` was `[]`. `buildProbeOperation` with an empty objectives array created no axis. The probe with `planning_duration: 0` immediately entered execution, checked `0 >= 0` (objectives exhausted), entered recovery as `'completed'` with zero attacks. Commander ops already had this guard (emit.ts:685). Probes did not.

### Execution path

1. `emit.ts` derives `probeObjectives` from sector front — enemy-adjacent OSIDs via `strictCompare`
2. If sector has no enemy-adjacent OSIDs, `probeObjectives = []`
3. `buildProbeOperation([])` creates op with empty objectives array and no axis
4. `advanceSectorOffensives` transitions to execution: `(0) >= (0)` → TRUE
5. Immediately enters recovery with reason `'completed'` — zero attacks, zero turns in execution
6. Each recovery-turn counted as `recovery_without_logged_attempt`

## Fix Applied

**Guard in `src/sim/combat/commander/emit.ts` (line 772):** Skip probe creation when `probeObjectives.length === 0`. Mirrors the existing commander-op guard at line 685.

## Regression Tests

3 targeted tests added to `tests/commander/elite_formation_utilization.test.ts`:

1. **Probe NOT created when no enemy-adjacent OSIDs exist** — verifies guard prevents empty-objective probe
2. **Probe IS created when enemy-adjacent OSID exists** — verifies guard does not block valid probes
3. **Empty probeObjectives array does not create axis-less probe** — verifies the array-length check specifically

## Validation: n1319

| Metric | n1318 (before) | n1319 (after) | Delta |
|---|---|---|---|
| Area-weighted | 94.0% | **94.3%** | **+0.3pp** |
| Anchors | 26/27 | **27/27** | **+1 (kopcic_2 recovered)** |
| Benchmarks | 6/6 | **6/6** | neutral |
| Battles | 71 | **76** | **+5** |
| Attack orders | 91 | **97** | **+6** |
| RS w40 | 53.9% | **53.9%** | neutral |
| hash | ba51aa8a18074932 | **a6a231f68172c085** | changed |

Recovery-without-attempt at final turn: 6 (all probes with real objectives — brigade reachability failures, NOT empty-objective).

## Remaining Residual

**6 probes** at final turn in recovery-without-attempt with REAL objectives (1 obj, 1 axis each). These are brigade reachability failures — the probe has a valid target but the assigned brigade cannot reach it. This is a different family (reachability/staging) from the empty-objective family fixed here.

**2 `operation_zero_eligible_execution` anomalies** (vrs_east_bosnian) — pre-existing, separate from probe fix.

## Completion Block

- **Canonical owner:** `src/sim/combat/commander/emit.ts` (probe creation guard)
- **Demoted path:** Empty-objective probes cycling through immediate completion → recovery with zero attacks
- **Player-visible truth:** Probes are now only created when there is a real enemy target to probe. Fewer wasted operations. kopcic_2 anchor recovered. +5 battles, +6 attack orders.
- **Canonical UI surface:** No new UI — behavioral engine change
- **Done means:** Empty-objective probe family eliminated. 94.3%, 27/27, 6/6. 3 targeted tests. Residual 6 probes are reachability failures (different family). Full suite green (2338/2338). Smoke triad passed.

## Recommended Next Lane

**Probe brigade reachability**: 6 probes have valid objectives but assigned brigades are unreachable. Investigate whether probe brigade selection should include a reachability check (same pattern as the commander-op reachability filter at emit.ts:584-592).
