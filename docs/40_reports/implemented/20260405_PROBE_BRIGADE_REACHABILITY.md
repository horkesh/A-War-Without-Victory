# Probe Brigade Reachability Guard

**Date:** 2026-04-05
**Mission:** Add BFS reachability check to probe brigade selection — prevent creation of probes where the assigned brigade cannot reach the target.

## Specialists Used

| Specialist | Owned | Evidence |
|---|---|---|
| Orchestrator | Root-cause analysis, dispatch, diagnosis reclassification | Traced 6 probes through creation-to-execution, identified execution-time family |
| Gameplay Programmer | emit.ts reachability guard implementation | Guard at lines 773-786, tsc clean |
| QA Engineer | 2 targeted regression tests | 2340 total pass |
| Scenario Runner | n1320 validation | Hash-identical to n1319, zero behavioral delta |
| Scenario Analyst | Residual assessment | Confirmed execution-time staleness family |
| Documentation Specialist | Report + ledger + architect notes | This report |

## Root Cause Reclassification

The 6 remaining recovery-without-attempt probes were initially hypothesized as creation-time reachability failures (brigade cannot reach target at probe creation). Investigation proved this wrong: **all 6 probes were reachable at creation time.** The reachability guard produced zero behavioral delta (hash identical).

The true root cause is **execution-time staleness**:
- **4 probes** still "executing" at turn 40 with 0 attacks — brigade assigned but never entered combat (front shifted, brigade moved, or brigade could not find attack path during execution)
- **2 probes** "completed" with 0 attacks — objective captured by another operation, probe gets false completion

This reclassifies the residual from "creation-time unreachable" to "execution-time staleness" — a different, narrower family.

## Fix Applied

**BFS reachability check in `src/sim/combat/commander/emit.ts` (lines 773-786):** Probe brigade must reach a friendly OSID adjacent to the probe target within `MAX_REACHABILITY_HOPS` (8) to create the probe. Same pattern as the commander-op reachability check at lines 574-594.

The guard is a correct structural safety net — it prevents future creation-time reachability failures even though the current simulation does not produce any.

## Regression Tests

2 targeted tests added to `tests/commander/elite_formation_utilization.test.ts`:

1. **Probe NOT created when brigade cannot reach target** — disconnected graph, brigade isolated from probe target
2. **Probe IS created when brigade can reach target** — connected graph, brigade within hop limit

## Validation: n1320

| Metric | n1319 (before) | n1320 (after) | Delta |
|---|---|---|---|
| Area-weighted | 94.3% | **94.3%** | zero-delta |
| Anchors | 27/27 | **27/27** | zero-delta |
| Benchmarks | 6/6 | **6/6** | zero-delta |
| Battles | 76 | **76** | zero-delta |
| Attack orders | 97 | **97** | zero-delta |
| Hash | a6a231f68172c085 | **a6a231f68172c085** | **identical** |

Recovery-without-attempt at final turn: 6 (unchanged — all were reachable at creation).

## Remaining Residual

The 6 probes are execution-time staleness, not creation-time reachability. They fall into two sub-families:

- **4 executing-zero-attack:** Brigade assigned, probe in execution for multiple turns, but brigade never enters combat. Likely: front shifted away, brigade moved by another system, or `evaluateSectorAttack` cannot find an attack path at execution time.
- **2 false-completion:** Another operation captures the probe's objective OSID. Probe checks objectives-met, sees the OSID is now friendly, enters recovery as "completed" with zero attacks.

The existing `MAX_EXECUTION_TURNS_ZERO_ATTACKS` (5-turn) backstop already limits damage from both sub-families. This may be acceptable operational friction rather than a bug.

## Completion Block

- **Canonical owner:** `src/sim/combat/commander/emit.ts` (probe reachability guard, lines 773-786)
- **Demoted path:** Creation-time unreachable probe brigades (prevented as safety net)
- **Player-visible truth:** Zero behavioral change. The reachability guard is a structural safety net against future creation-time failures.
- **Canonical UI surface:** No new UI — behavioral engine change (safety net)
- **Done means:** Creation-time probe reachability guard delivered. Zero-delta confirmed. Root cause reclassified from "creation-time unreachable" to "execution-time staleness." 2 targeted tests. Full suite green (2340/2340). Smoke triad passed.

## Recommended Next Lane

**Execution-time probe staleness** (if warranted — bounded friction, not a P0):
- 4 probes execute for multiple turns without attacking — likely brigade cannot find attack path during `evaluateSectorAttack`
- 2 probes false-complete when another operation captures their objective
- The 5-turn `MAX_EXECUTION_TURNS_ZERO_ATTACKS` backstop already limits damage
- This may be acceptable operational friction rather than a bug
