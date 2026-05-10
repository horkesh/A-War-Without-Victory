# Commander Probe Emission Predictor Gate Profile

**Date:** 2026-05-10  
**Lane:** v0.9.3/v0.9.4 CPU performance profiling / commander emit  
**Commit:** this commit  
**Ring:** N/A, pure performance refactor

## Summary

After the briefing cuts, `commander.runCommanderForCorps.decide.emitCommanderOutput.buildOperations` became the largest measured commander sub-bucket. Inspection showed the probe-emission branch could call `predictAllAdjacentTargets(...)` before proving that any sector enemy target was directly adjacent to the selected probe brigade. Later filters already require direct adjacency, so predictor work is wasted when no target can survive.

## Implementation

- Build `enemyTargets` from the probe sector first.
- Derive `directEnemyTargets` from target neighbors and the selected probe brigade location.
- Run `predictAllAdjacentTargets(...)` only when at least one direct enemy target exists.
- Store predictions in `predictedTargetByOsid` for O(1) lookup while ranking candidates.

The candidate set is narrowed only to targets that the existing downstream filter already required (`direct === true`), so operation eligibility semantics are preserved.

## Measured Result

Baseline retained profile:

- Run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1772`
- Final hash: `ea9f3db7ac59a443`
- `commander.runCommanderForCorps.decide.emitCommanderOutput`: 378.031 ms
- `commander.runCommanderForCorps.decide.emitCommanderOutput.buildOperations`: 306.524 ms
- `commander.runCommanderForCorps.total`: 1,313.706 ms

Post-change profile:

- Run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1773`
- Final hash: `ea9f3db7ac59a443`
- `commander.runCommanderForCorps.decide.emitCommanderOutput`: 330.146 ms
- `commander.runCommanderForCorps.decide.emitCommanderOutput.buildOperations`: 258.813 ms
- `commander.runCommanderForCorps.total`: 1,256.282 ms

## Validation

- Red first: `npx.cmd vitest run tests/bot_orders_perf_profile.test.ts --reporter=dot` failed on missing direct-target/prediction-map guards.
- Green focused: `npx.cmd vitest run tests/bot_orders_perf_profile.test.ts tests/commander/corridor_quality_guard.test.ts tests/commander/elite_formation_utilization.test.ts --reporter=dot` passed 47/47.
- Profile proof: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs` produced `n1773` with final hash `ea9f3db7ac59a443`.

## Canon Posture

No scenario data, OOB, operation definition, combat math, probe eligibility semantics, commander decision semantics, event trigger, score rule, save schema, player command lever, or sensitive-history canon changed. This is a deterministic early-filter and lookup refactor in the operation emission read path.

## Next CPU Target

`commander.runCommanderForCorps.decide.assessSituation.detectZones` is now the largest measured commander sub-bucket left. The next pass should add or use sub-bucket evidence there and retain only measured wall-clock wins.
