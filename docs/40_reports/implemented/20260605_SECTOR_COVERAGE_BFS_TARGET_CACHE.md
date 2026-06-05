# Sector Coverage BFS Target Cache

Date: 2026-06-05
Branch: `codex/sector-coverage-bfs-target-cache`
Base: `50a2d8d99`
Type: Engine performance / sector-frontline byte-identical optimization

## Summary

`ensureMinimumSectorCoverage(...)` now finds the nearest vacant local front target with one bounded breadth-first search from the brigade location instead of running `bfsDistance(...)` once per vacant target. The search keeps the prior contract: distance wins first, `strictCompare(...)` breaks same-distance ties, expansion still moves only through friendly OSIDs, and the target check preserves the old direct-neighbor target semantics.

No sector semantics, combat math, operation choice, save schema, scenario data, calibration, command model, UI, or player-facing behavior changed.

## Evidence

Pre-change current-main profile:

- 40w final hash: `aa8f7a07962cecaf`
- partition profile `totalWallS`: 98.1264053
- `reconcile-final-sector-truth`: 11193.073ms
- `partition-corps-front-sectors`: 9908.247ms
- `sealMergedSectorTruth:ensure-coverage`: 4235.998ms
- `ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned`: 1638.629ms
- `ensureMinimumSectorCoverage:severe-rescue`: 2206.261ms

Post-change profile:

- 40w final hash: `aa8f7a07962cecaf`
- timed run `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n2021`
- partition profile `totalWallS`: 89.7784172
- `reconcile-final-sector-truth`: 7864.033ms
- `partition-corps-front-sectors`: 7508.578ms
- `sealMergedSectorTruth:ensure-coverage`: 5309.416ms in the sidecar aggregate
- `ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned`: 1899.334ms in the sidecar aggregate
- `ensureMinimumSectorCoverage:severe-rescue`: 2821.102ms in the sidecar aggregate

Treat wall-clock and sidecar totals as directional same-machine evidence. The binding proof is the preserved 40w hash, consistency validation, and baseline regression.

## Current Residuals

The nearest-target search is closed for now. The next sector/frontline pass must re-profile again before implementation and should start from the current largest measured owners:

- `buildFactionSectors:RS`
- `buildFactionSectors:RBiH`
- `sealMergedSectorTruth:ensure-coverage`
- `enforceFinalSectorGeometryInvariants:split-pieces`

## Verification

- `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts tests/sector_coverage_truth_preservation.test.ts --reporter=dot` passed 34/34.
- `npx.cmd vitest run tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/final_sector_truth_reconciliation_cache.test.ts tests/final_sector_truth_reconciliation.test.ts tests/war_phase_step_order.test.ts tests/sector_split_brigade_assignment.test.ts tests/sector_severe_undercoverage_rebalance.test.ts tests/rear_sector_bucket_truth.test.ts tests/brigade_territory_reconciliation.test.ts --reporter=dot` passed.
- `npm.cmd run typecheck -- --pretty false` passed.
- `node tools/diagnostics/strict_null_inventory.cjs --field-domains` reported total 507 (`state: 172`, `sim: 327`, `derived: 8`).
- `npm.cmd run sim:scenario:run:40w:timed` preserved final hash `aa8f7a07962cecaf`.
- `$env:PERF_PROFILE_SECTOR_PARTITION='true'; npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_bfs_target_cache_partition_profile --report data/derived/_debug/sector_bfs_target_cache_partition_profile_40w.json` completed.
- `node tools/validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n2021` passed with 0 unresolved brigade assignments, 0 ghost paramilitaries, exact war-front faction-side coverage, 0 disconnected sectors, 0 empty contested sectors, 0 wide-gap undefended subsegments, and 0 adjacent uncontested territory.
- `npm.cmd run test:baselines` passed with all scenarios matching.

## Files

- `src/sim/combat/brigade_assignment.ts`
- `tests/sector_partition_instrumentation.test.ts`
- `tests/sector_coverage_truth_preservation.test.ts`
- `docs/40_reports/implemented/20260605_SECTOR_COVERAGE_BFS_TARGET_CACHE.md`
