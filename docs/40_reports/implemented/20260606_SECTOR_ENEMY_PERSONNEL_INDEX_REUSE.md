# Sector Enemy Personnel Index Reuse

**Date:** 2026-06-06
**Type:** Deterministic sector/frontline performance optimization.

## Change

`classifyBrigadesByTerritory(...)` now reuses the existing invocation-local `countActiveEnemyPersonnelByOsid(...)` view when computing per-sector enemy personnel for garrison budgeting. The old path rebuilt a sorted full-formation scan inside that phase and filtered every formation against each sector's enemy OSID set.

The new path builds the same active-enemy personnel totals once by OSID, then sums those totals over each sector's unique enemy OSIDs.

## Determinism

The helper uses the existing `strictCompare`-sorted formation iteration and the optimization remains local to the current classification pass. No sector truth, combat math, operation behavior, scenario data, save schema, UI, baseline manifest, replay writer, or generated artifact contract changed. Generated profile and run outputs remained transient and unstaged.

## Evidence

Pre-change profile on current `main` preserved final hash `d1ace172a29b2353` with `totalWallS=85.3396469`; top phase totals included `partition-corps-front-sectors=7146.0785ms`, `generate-bot-corps-orders=7157.5752ms`, and `reconcile-final-sector-truth=7288.2321ms`.

Changed profile preserved final hash `d1ace172a29b2353` with `totalWallS=83.782036`; `partition-corps-front-sectors` moved to `6964.4334ms`. Fresh sector sidecar evidence showed brigade-classification per invocation moving from roughly `4.35ms` to `3.34ms` for RS and from roughly `3.85ms` to `2.84ms` for RBiH.

The changed 40-week timed run preserved `d1ace172a29b2353`; `timing.json` reported `total=83801.915ms` and `simulation=81436.531ms`. Run consistency validation passed.

## Verification

- `npx.cmd vitest run tests\sector_partition_instrumentation.test.ts tests\brigade_territory_reconciliation.test.ts tests\sector_frontline_truth.test.ts --reporter=dot` - PASS; 96/96 tests.
- `npm.cmd run typecheck -- --pretty false` - PASS.
- `$env:PERF_PROFILE_SECTOR_PARTITION='true'; npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_next_target_partition_profile_20260606 --report data/derived/_debug/sector_next_target_partition_profile_20260606_40w.json` - PASS; pre-change hash `d1ace172a29b2353`.
- `Remove-Item -LiteralPath data\derived\_debug\sector_partition_perf.jsonl -Force -ErrorAction SilentlyContinue; $env:PERF_PROFILE_SECTOR_PARTITION='true'; npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_enemy_personnel_index_partition_profile --report data/derived/_debug/sector_enemy_personnel_index_partition_profile_40w.json` - PASS; changed hash `d1ace172a29b2353`.
- `node tools\validate_run_consistency.cjs runs_perf\sector_enemy_personnel_index_partition_profile\apr1992_definitive_40w__3649b3861a87e6ea__w40_n0` - PASS.
- `npm.cmd run sim:scenario:run:40w:timed` - PASS; changed hash `d1ace172a29b2353`.
- `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n2` - PASS.
- `npm.cmd run test:baselines` - PASS; all scenarios match.
- `git diff --check` - PASS.

## Next Gate

Re-profile again before the next sector pass. The remaining residuals still include broader `buildFactionSectors:RS/RBiH` work plus final-sector truth/recovery labels; avoid unmeasured cache expansion.
