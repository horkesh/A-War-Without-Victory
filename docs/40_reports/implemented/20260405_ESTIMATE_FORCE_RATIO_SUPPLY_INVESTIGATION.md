# estimateForceRatio Supply Blindness Investigation

**Date:** 2026-04-05
**Mission:** Investigate whether adding supply awareness to `estimateForceRatio` would improve commander planning accuracy.
**Outcome:** Investigated and demoted. No code changes.

## Specialists Used

| Specialist | Owned | Evidence |
|---|---|---|
| Orchestrator | Estimator audit, live evidence analysis, demotion decision | Full trace of estimator vs predictor; 16/18 corps at supply 0 |
| Gameplay Programmer (previous lane) | Attack eligibility pipeline trace | Identified supply-mult disconnect |
| Scenario Runner (orchestrator) | n1321 corps supply survey | 16/18 corps have supply_readiness = 0 |

## Finding

`estimateForceRatio` in `src/sim/combat/operation_preparation.ts` (line 171) IS supply-blind (confirmed). It uses raw `personnel` headcounts with no supply multiplier. However, adding supply awareness would be **harmful** on current HEAD because:

1. `computeSupplyReadiness` returns 0 for 16 out of 18 corps across the entire 40-week run
2. Supply readiness is systemic zero — not marginal (0.3-0.5) as hypothesized
3. If `estimateForceRatio` applied the same supply penalty as `computeAttackerPower` (0.45x for critical supply), it would compute near-zero force ratios for ALL operations
4. ALL operations would fail assessment — complete operational paralysis

The estimator's supply-blindness is **load-bearing** — it represents the commander's optimistic headcount assessment. The supply reality check is handled separately by:
- `supply_check` sub-phase gate (needs >=0.7 supply, or >=0.5 for aggressive commanders)
- Assessment score (30% supply weight)
- Anti-paralysis supply floor (just fixed — aborts at <0.3)

## Root Issue

The real problem is NOT `estimateForceRatio` — it's the supply model itself. `computeSupplyReadiness` returns 0 for nearly all corps because the supply reserves system classifies almost every brigade as critically supplied. This is the existing P9 supply recalibration item (documented in memory as "94% RBiH strained = 0.75x permanent baseline, solo run").

## Demotion Rationale

- **Canonical owner:** `src/sim/combat/operation_preparation.ts` (`estimateForceRatio` at line 171)
- **Demoted path:** Adding supply to `estimateForceRatio` — would cause total operational paralysis given current supply model
- **Player-visible truth:** No change. The force ratio estimator remains supply-blind. This is correct behavior until the supply model (P9) is recalibrated.
- **Canonical UI surface:** No UI change
- **Done means:** Investigation complete. `estimateForceRatio` supply blindness confirmed but demoted — adding supply awareness would be harmful until P9 supply recalibration addresses the systemic zero-supply state. No code changes. No test changes.

## Recommended Next Lane

**P9 supply recalibration**: `computeSupplyReadiness` returns 0 for 16/18 corps. The supply reserves system classifies nearly all brigades as critically supplied, making supply meaningless as a differentiator. This is the real root cause — until supply produces realistic values, supply-aware planning is impossible. Documented in memory as existing P1.
