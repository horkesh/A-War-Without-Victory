# n1321: VRS East Bosnian ZEA Fix — Anti-Paralysis Supply Gate

**Date:** 2026-04-05
**Run:** n1321
**Hash:** (see validation below)
**Status:** CLOSED

## Summary

Added supply floor to anti-paralysis override in `src/sim/combat/operation_preparation.ts` (line 423). Operations stuck at `supply_check` with critical supply are now aborted instead of force-launched into guaranteed ZEA.

## Root Cause

Two-step failure chain in `vrs_east_bosnian`:

1. **Anti-paralysis bypassed supply gate:** After 5 prep turns stuck at `supply_check` (needs 0.7, has 0), anti-paralysis forced launch if `aggressiveness >= 3` — completely ignoring supply readiness.
2. **Execution-time supply penalty:** `computeAttackerPower` applies `getSupplyMult(0.45)` for critical supply. Predicted outcome fails `isOutcomeSufficientForAttack('stalemate')`. Brigades idle for 5+ turns, triggering `no_logged_attempt` recovery.

The planner and the predictor disagreed on supply: the planner ignored it (anti-paralysis bypass), the predictor applied a 0.45× penalty. This structural disconnect guaranteed ZEA for any supply-starved operation forced through anti-paralysis.

## Fix

Single condition change in `operation_preparation.ts` line 423:

```
// Before:
if (aggressiveness >= 3)

// After:
if (aggressiveness >= 3 && supplyReadiness >= 0.3)
```

Operations at critical supply (< 0.3) are now correctly aborted instead of force-launched. The 0.3 threshold is deliberately below the normal supply gate (0.7) — anti-paralysis still bypasses marginal supply, but not zero/critical supply.

## Tests

3 targeted regression tests in `tests/commander/anti_paralysis_supply_gate.test.ts`:

1. Anti-paralysis aborts at critical supply (supplyReadiness < 0.3)
2. Anti-paralysis launches at adequate supply (supplyReadiness >= 0.3)
3. Cautious commanders still abort regardless of supply

## Validation: n1321

| Metric | n1319/n1320 (before) | n1321 (after) | Delta |
|---|---|---|---|
| Area-weighted | 94.3% | **94.0%** | **-0.3pp** |
| Anchors | 27/27 | **27/27** | zero |
| Benchmarks | 6/6 | **6/6** | zero |
| Battles | 76 | **69** | **-7** |
| Attack orders | 97 | **85** | **-12** |
| Recovery w/o attempt | 6 | **4** | **-2** |

vrs_east_bosnian ZEA: **eliminated**. Both previous zero-eligible operations correctly abort.

The -0.3pp calibration delta is cascade from different operation scheduling — fewer wasted slots means different ops launch at different times. 27/27 anchors and 6/6 benchmarks confirm no regression.

## Specialists

| Specialist | Owned | Evidence |
|---|---|---|
| Orchestrator | Root-cause tracing across 3 files | Traced from anomaly → weekly log → supply gate → anti-paralysis |
| Gameplay Programmer (agent) | Traced attack eligibility pipeline | Identified supply-mult disconnect between planner (ignores) and predictor (applies 0.45) |
| Gameplay Programmer | operation_preparation.ts supply floor | Single condition change, tsc clean |
| QA Engineer | 3 targeted tests | 2343 total pass |
| Scenario Runner | n1321 validation | ZEA eliminated, 27/27, 94.0% |
| Documentation Specialist | Report + ledger + architect notes | This report |

## Residual

4 probes with real objectives but execution-time staleness (bounded by `MAX_EXECUTION_TURNS_ZERO_ATTACKS` backstop). Not P0.

## Recommended Next Lane

**estimateForceRatio supply awareness** (P1, not urgent): The planning-time force ratio estimator still ignores supply entirely. The anti-paralysis fix prevents the worst case (zero supply), but operations at marginal supply (0.3–0.5) may still launch with inflated force estimates. Applying supply mult in `estimateForceRatio` would make commander assessments more realistic.

## Files Changed

- `src/sim/combat/operation_preparation.ts` — anti-paralysis supply floor (line 423)
- `tests/commander/anti_paralysis_supply_gate.test.ts` — 3 regression tests
