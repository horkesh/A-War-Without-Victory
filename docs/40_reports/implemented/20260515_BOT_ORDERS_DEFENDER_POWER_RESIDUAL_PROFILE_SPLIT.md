# Bot Orders Defender-Power Residual Profile Split

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1835`
**Baseline:** n1834 uncontested residual profile split, hash `0cb626c032204372`
**Result:** n1835 kept hash `0cb626c032204372`

## Summary

- Added finer default-off profile labels inside shared `computeDefenderPower(...)` for the direct-objective sectorAttack prediction path.
- The new labels did not expose a dominant residual child. The useful conclusion is negative: do not chase posture, fatigue, morale, environment-cap, or final multiplication from this path.
- The same labels also illuminate commander direct-probe defender power because that path shares `computeDefenderPower(...)`.

## Changes Made

### Combat Math

- `src/sim/combat/combat_math.ts`
  - Added `.postureContext` around existing posture, entrenchment, corps stance, resilience, and disruption calculations.
  - Added `.fatigue`, `.morale`, `.environmentCap`, and `.powerProduct` labels.
  - Preserved the existing combat formula, multiplier order, caller contract, profile callback shape, save schema, and serialized outputs.

### Test Guard

- `tests/bot_orders_perf_profile.test.ts`
  - Added static wiring guards for the new `computeDefenderPower(...)` sub-labels.
  - Red proof failed on missing `.postureContext`; green proof passed after the instrumentation landed.

## Scenario Results

### Hash And Gates

- Final hash: `0cb626c032204372`
- Anchor checks: 26/27
- Bot benchmarks: 6/6
- Anomalies: 9 total, 0 critical, 2 warning

### Direct-Objective SectorAttack Defender Power

Under `bot_orders.executeFactionDirectives.eval.sectorAttack.executionDirectObjective.predictCombatOutcome.rankDefendersByPower.computeDefenderPower`:

| Label | Time | Count |
|---|---:|---:|
| parent | 20.467ms | 104 |
| `.terrainFactors` | 1.381ms | 434 |
| `.postureContext` | 1.282ms | 434 |
| `.base` | 1.251ms | 434 |
| `.officer` | 0.668ms | 434 |
| `.supply` | 0.481ms | 434 |
| `.home` | 0.475ms | 434 |
| `.frontDensity` | 0.347ms | 434 |
| `.environmentCap` | 0.284ms | 434 |
| `.fatigue` | 0.243ms | 434 |
| `.equipmentQuality` | 0.221ms | 434 |
| `.morale` | 0.193ms | 434 |
| `.powerProduct` | 0.169ms | 434 |

### Commander Direct-Probe Defender Power

Under `commander.runCommanderForCorps.decide.emitCommanderOutput.buildOperations.probe.deriveObjectives.predictDirectTargets.predictCombatOutcome.rankDefendersByPower.computeDefenderPower`:

| Label | Time | Count |
|---|---:|---:|
| parent | 68.154ms | 571 |
| `.terrainFactors` | 5.201ms | 1419 |
| `.postureContext` | 4.471ms | 1419 |
| `.base` | 3.424ms | 1419 |
| `.officer` | 2.959ms | 1419 |
| `.frontDensity` | 2.201ms | 1419 |
| `.supply` | 1.690ms | 1419 |
| `.home` | 1.596ms | 1419 |
| `.environmentCap` | 0.942ms | 1419 |
| `.fatigue` | 0.751ms | 1419 |
| `.equipmentQuality` | 0.742ms | 1419 |
| `.powerProduct` | 0.557ms | 1419 |
| `.morale` | 0.504ms | 1419 |

## Lessons Learned

- The direct-objective defender-power residual is not concentrated in the newly split local math. The measured children are all too small to justify a targeted optimization.
- Parent labels in this area are nested-profiler inflated. Treat the parent as attribution context, not as proof that each wrapped arithmetic block is expensive.
- Future sectorAttack work should use a fresh profile and prefer larger buckets or a different predictor structure. Do not optimize posture, fatigue, morale, environment cap, or final multiplication from n1835 evidence.

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/combat_math.ts` | Added default-off defender-power residual sub-labels. |
| `tests/bot_orders_perf_profile.test.ts` | Added static profile-label guards. |
| `docs/40_reports/implemented/20260515_BOT_ORDERS_DEFENDER_POWER_RESIDUAL_PROFILE_SPLIT.md` | This report. |

## Next Steps

- Pick the next CPU lane from a fresh profile rather than optimizing these small defender-power children.
- If sectorAttack remains the target, inspect broader predictor control flow or caller frequency before adding more local math micro-labels.
- Candidate-gate splitting inside uncontested occupation remains a possible attribution lane, but it is smaller than the current broad parent labels.
