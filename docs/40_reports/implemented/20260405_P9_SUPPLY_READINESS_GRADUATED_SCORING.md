# P9 Supply Readiness — Graduated Scoring Fix

**Date:** 2026-04-05
**Run:** n1322
**Hash:** `5203382e9aa2018d`
**Status:** CLOSED

## Summary

Changed `computeSupplyReadiness` in `src/sim/combat/sector_offensive.ts` (lines 898-910) from binary scoring (adequate=1, else=0) to graduated scoring (adequate=1.0, strained=0.5, critical=0.0). This eliminates the pathological zero-readiness collapse that made supply meaningless as a differentiator for 16/18 corps.

## Specialists Used

| Specialist | Owned | Evidence |
|---|---|---|
| Gameplay Programmer | Root cause trace, fix recommendation, consumer audit | Full trace of computeSupplyReadiness → getEffectiveSupplyState → thresholds. All 5 consumers documented. |
| Systems Programmer | Invariant review, threshold ownership audit, determinism check | Confirmed structural impossibility (RBiH cap 45 < threshold 50). No `=== 1.0` checks. Safe to change. |
| Scenario Runner | Run evidence, per-corps supply distribution | 16/18 corps at 0.000 confirmed. Faction reserves actually reasonable (RBiH=47.6, RS=74.0, HRHB=70.2). BFS reachability classifies 97-99% of OSIDs as strained. |
| Post-Run Analyst | n1322 verification | Zero collapse eliminated. 18/20 ops at 0.5, 2 at 1.0. No ops stuck at supply_check. |
| Orchestrator | Dispatch, synthesis, go/no-go | All specialists converged on same fix independently. |

## Root Cause

Dual threshold artifact — NOT real systemic starvation:

1. **BFS corridor reachability classifies 97-99% of OSIDs as "strained"**: Only 14 OSIDs across ALL factions were `adequate` from BFS reachability. Bridge-edge classification collapses the adequate frontier.

2. **`computeSupplyReadiness` counted only `adequate` brigades (binary)**: Strained brigades contributed 0 to readiness. Since 97%+ of brigades were on strained OSIDs, readiness = 0 for 16/18 corps.

3. **Structural impossibility for RBiH**: RBiH embargo cap (45) < RESERVE_ADEQUATE_THRESHOLD (50). RBiH could NEVER achieve adequate supply readiness — permanently 0.000.

4. **Planner/resolver disagreement**: `getSupplyMult` (combat resolver) used graduated multipliers (adequate=1.0, strained=0.75, critical=0.45). `computeSupplyReadiness` (planner) used binary (adequate=1, else=0). The planner was more restrictive than the resolver.

Faction reserves at w40 were actually reasonable: RBiH=47.6, RS=74.0, HRHB=70.2. The reserves system was working correctly. The problem was purely in the readiness aggregation function.

## Fix

Single function change in `sector_offensive.ts` (lines 898-910):

```typescript
// BEFORE: binary — only adequate counts
let adequate = 0;
// ...
if (st === 'adequate') adequate++;
return adequate / participatingBrigades.length;

// AFTER: graduated — aligns planner with resolver
let score = 0;
// ...
score += st === 'adequate' ? 1.0 : st === 'strained' ? 0.5 : 0.0;
return score / participatingBrigades.length;
```

## Downstream Impact

- **supply_check gate (0.7)**: RBiH at 0.5 still fails normal threshold. Aggressive commanders (aggr ≥ 4, threshold 0.5) can pass. Correct — RBiH ops should be harder but not impossible.
- **Anti-paralysis (0.3)**: Now passable at 0.5. Strained corps can force-launch. Unblocks the paralysis.
- **Assessment score**: 0.3 × 0.5 = 0.15 contribution instead of 0. Assessment can now pass for strained corps.
- **No thresholds break**: All existing gates work correctly with graduated values.

## Validation: n1322

| Metric | n1321 (before) | n1322 (after) | Delta |
|---|---|---|---|
| Area-weighted | 94.0% | **94.3%** | **+0.3pp** |
| Anchors | 27/27 | **27/27** | zero |
| Benchmarks | 6/6 | **6/6** | zero |
| Battles | 69 | **76** | **+7** |
| Attack orders | 85 | **97** | **+12** |
| Hash | — | `5203382e9aa2018d` | changed |

Supply readiness distribution (n1322): 18/20 active ops at 0.5, 2/20 at 1.0. No ops stuck at supply_check. Zero collapse eliminated for active operations. `valid_for_combat_calibration` remains `false`, so this should be read as an engine-truth fix with encouraging top-line outcomes, not as a full operational-health clearance.

## Residual

- **Within-tier clustering**: 90% of ops cluster at 0.5 because 97% of OSIDs are strained from BFS. Finer differentiation (continuous interpolation based on actual reserve level) is a valid P2 follow-up but not needed now.
- **BFS reachability collapse**: The deeper issue is that BFS bridge-edge classification is too aggressive, making almost all corridor edges "brittle." This is a separate investigation (BFS corridor reachability recalibration).
- **vrs_east_bosnian ZEA**: 2 ops still zero-eligible (pre-existing, bounded by MAX_EXECUTION_TURNS backstop).

## Files Changed

- `src/sim/combat/sector_offensive.ts` — graduated scoring in `computeSupplyReadiness` (lines 898-910)

## Test Count

167 files, 2344 tests, 0 failures.

## Completion Block

- **Canonical owner:** `src/sim/combat/sector_offensive.ts` (`computeSupplyReadiness` at line 880)
- **Demoted path:** estimateForceRatio supply awareness — still blocked by within-tier flat 0.5 clustering. Remains P1, gated by BFS reachability recalibration or continuous interpolation follow-up.
- **Player-visible truth:** Operations no longer permanently stall at supply_check. Strained corps can launch ops (with difficulty). Supply still matters — adequate corps (reserves ≥ 50) get readiness 1.0, strained get 0.5, critical get 0.0.
- **Canonical UI surface:** No UI change. Supply readiness values are now non-zero in operation briefing modals.
- **Done means:** Binary readiness collapse eliminated for active operations. Graduated scoring aligns planner with resolver. n1322 holds 27/27 anchors and 6/6 benchmarks while improving to 76 battles and 97 attack orders. This is accepted as an engine-truth fix, not a blanket calibration-health declaration.

## Recommended Next Lane

1. **BFS corridor reachability recalibration** (P2): Bridge-edge classification collapses 97-99% of OSIDs to strained. If fixed, supply readiness would naturally differentiate based on actual logistics routes. This is the deeper structural fix.
2. **Continuous supply readiness interpolation** (P2): Replace three-tier (1.0/0.5/0.0) with continuous function based on actual reserve level. Would restore RS-vs-RBiH differentiation within the strained tier.
3. **estimateForceRatio supply awareness** (P1): Still blocked until within-tier differentiation exists. Revisit after either #1 or #2.
