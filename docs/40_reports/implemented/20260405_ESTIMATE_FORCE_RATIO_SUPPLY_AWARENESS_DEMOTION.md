# estimateForceRatio Supply Awareness — Demoted (No Code Changes)

**Date:** 2026-04-05
**Run:** n1323 (current HEAD — no new run needed)
**Status:** DEMOTED — investigation-only

## Summary

Investigated whether `estimateForceRatio` supply blindness still causes real bad decisions now that supply readiness has meaningful differentiation (after graduated scoring + BFS corridor fixes). Conclusion: the mismatch is real but practically inert. No code change warranted.

## Specialists Used

| Specialist | Owned | Evidence |
|---|---|---|
| Gameplay Programmer | Full assessment pipeline trace, practical harm quantification, fix/demote recommendation | Traced supply_check gate (0.7/0.5), assessment scoring (30% supply weight), anti-paralysis floor (0.3). Quantified: 25% force ratio overestimate for strained corps, but only about a 0.07 assessment score swing under current weights, which was not observed to flip decisions on current HEAD. |
| Scenario Runner | n1323 operation evidence | 5/6 strained-corps ops fail, but from ZEA/staging issues, not estimator optimism. |
| Orchestrator | Dispatch, synthesis, demotion decision | Both specialists converge on "practically inert." |

## Finding

`estimateForceRatio` (operation_preparation.ts:171-228) uses raw `b.personnel` headcounts without supply multiplier. `computeAttackerPower` (combat_math.ts:962-986) applies `getSupplyMult` (adequate=1.0, strained=0.75, critical=0.45) plus 10+ other multipliers. The estimator overstates strained-corps capability by ~25%.

However, the assessment pipeline has **defense in depth** that makes this harmless:

### Layer 1: supply_check hard gate (line 516-525)
`supplyReadiness >= 0.7` required (or >= 0.5 with aggressiveness >= 4). Strained corps (readiness 0.5) only pass if the commander is aggressive. This blocks before assessment even runs.

### Layer 2: 30% supply weight in assessment (line 527-553)
Assessment score = `confidenceMet * 0.4 + forceRatioMet * 0.3 + supplyReadiness * 0.3`. At readiness 0.5, the supply term contributes 0.15 instead of 0.30 — a 0.15 penalty independent of force ratio.

### Layer 3: Anti-paralysis supply floor (line 423)
`supplyReadiness >= 0.3` required even for aggressive force-launch.

### Combined effect
The force ratio overestimate (25%) translates to only about a 0.07 assessment score swing. Under current readiness gates and observed `n1323` operations, that did not appear to be the proximate decision-flipping factor.

## Operation Evidence (n1323)

| Supply state | Ops | Successes | Failures | Failure causes |
|---|---|---|---|---|
| Adequate | 9 | 7 | 2 | Herzegovina (exchange), Herzegovina Consol. (objectives) |
| Strained | 6 | 1 | 5 | ZEA (2), staging (1), exchange (2) |

Strained-corps failures are predominantly from ZEA (zero eligible attackers) and staging issues — NOT from the estimator overstating force ratios. The planner's supply blindness is not the proximate cause of these failures.

## Demotion Rationale

1. The 25% overestimate is real but only matters in a narrow band near the required force ratio threshold
2. Defense-in-depth (3 layers) already compensates for supply blindness
3. The estimator also ignores 10+ other multipliers (equipment, terrain, entrenchment, morale, fatigue, officer quality, home distance) — fixing supply alone creates false precision
4. `estimateForceRatio` is deliberately a simplified headcount proxy
5. When the estimator is eventually upgraded to a fuller combat power estimate (P1 COMBAT-P14), supply should be included as part of that broader overhaul

## Completion Block

- **Canonical owner:** `src/sim/combat/operation_preparation.ts` (`estimateForceRatio` at line 171)
- **Demoted path:** Adding supply mult to `estimateForceRatio` alone — practically inert due to defense-in-depth. Revisit when the estimator is upgraded to full combat power estimate (COMBAT-P14).
- **Player-visible truth:** No change. The force ratio estimator remains a headcount proxy. Supply reality is enforced by the supply_check gate, assessment supply weight, and anti-paralysis floor.
- **Canonical UI surface:** No UI change.
- **Done means:** Investigation complete. Supply blindness confirmed but demoted — adding supply awareness alone would be technically more truthful but practically inert. The real next step is a fuller combat power estimator (COMBAT-P14) that addresses all 12+ missing multipliers together.

## Recommended Next Lane

1. **COMBAT-P14: Combat predictor overhaul** (P1): `checkLaunchFeasibility` and `estimateForceRatio` both ignore defender artillery/terrain/entrenchment. This is the primary driver of ZEA (predicted outcome fails at execution time). Supply should be included when this broader overhaul happens.
2. **gradacac_2 P0 investigation**: Next engine-truth lane once current defects are no longer masking front behavior.
3. **v0.8.1 Commander Maturity gate check**: Full two-tier post-run panel go/no-go.
