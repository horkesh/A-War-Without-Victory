# Sector Zero-Assigned Rescue Reuse

Date: 2026-06-04
Branch: `codex/sector-coverage-zero-assigned`
Base: `f9eeee9b`
Type: Engine performance / sector-frontline byte-identical optimization

## Summary

`ensureMinimumSectorCoverage(...)` now reuses local views inside the zero-assigned territory-claim rescue path. The slice reuses the target sector front OSID set across promote/pull checks, reuses same-component donor filtering, skips active-count construction when no reserve or rear donor exists, and reuses the same active-count map between candidate selection and the immediate move.

No sector semantics, ordering, save schema, scenario data, calibration, command model, UI, or player-facing behavior changed.

## Evidence

Pre-change profile from `f9eeee9b`:

- 40w final hash: `41c72b13ad2e91b9`
- `totalWallS`: 123.2417545
- `rssMB`: 547.3
- `ensureMinimumSectorCoverage:territory-claim-rescue`: 1346.687ms
- `ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned`: 1284.387ms
- `sealMergedSectorTruth:ensure-coverage`: 2687.134ms

Post-change profile:

- 40w final hash: `41c72b13ad2e91b9`
- `totalWallS`: 96.5428407
- `rssMB`: 409.0
- `ensureMinimumSectorCoverage:territory-claim-rescue`: 442.645ms
- `ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned`: 375.727ms
- `sealMergedSectorTruth:ensure-coverage`: 1921.618ms

Treat wall-clock and RSS as directional same-machine evidence. The binding proof is byte identity, consistency validation, and baseline regression.

## Current Residuals

The next sector/frontline pass must re-profile again before implementation. In the post-change partition profile, the largest remaining sector children are:

- `buildFactionSectors:RBiH`: 2700.760ms
- `buildFactionSectors:RS`: 2532.737ms
- `sealMergedSectorTruth:ensure-coverage`: 1921.618ms
- `ensureMinimumSectorCoverage:severe-rescue`: 1317.702ms

## Verification

- `node node_modules\vitest\vitest.mjs run tests\sector_partition_instrumentation.test.ts tests\sector_coverage_truth_preservation.test.ts tests\sector_severe_undercoverage_rebalance.test.ts tests\rear_sector_bucket_truth.test.ts --reporter=dot` passed 49/49.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npx.cmd tsx tools\perf\profile_scenario.ts --scenario data\scenarios\apr1992_definitive_40w.json --out runs_perf\sector_zero_assigned_profile_20260604 --report data\derived\_debug\sector_zero_assigned_profile_20260604_40w.json` preserved final hash `41c72b13ad2e91b9`.
- `node tools\validate_run_consistency.cjs runs_perf\sector_zero_assigned_profile_20260604\apr1992_definitive_40w__3649b3861a87e6ea__w40_n0` passed with 0 unresolved brigade assignments, 0 ghost paramilitaries, exact war-front faction-side coverage, 0 disconnected sectors, 0 empty contested sectors, 0 wide-gap undefended subsegments, and 0 adjacent uncontested territory.
- `npm.cmd run test:baselines` passed with all scenarios matching.

## Files

- `src/sim/combat/brigade_assignment.ts`
- `tests/sector_partition_instrumentation.test.ts`
- `docs/40_reports/implemented/20260604_SECTOR_ZERO_ASSIGNED_RESCUE_REUSE.md`
