# Sector Enemy Personnel Index

**Date:** 2026-05-23
**Status:** Implemented and locally verified
**Lane:** Sector performance / buildFactionSectors brigade-classification
**Scope:** Invocation-local enemy-personnel indexing in sector brigade assignment. No scenario data, combat math, operation behavior, save schema, UI, calibration/army-arc tuning, event content, turn ordering, painted target, or output contract changed.

## Summary

`classifyBrigadesByTerritory(...)` and `recomputeSectorPowerAndThreat(...)` both needed the same question repeatedly: how much active enemy personnel is located on each OSID?

Before this slice, each sector rebuilt that answer by scanning all formations. The new helper:

```ts
countActiveEnemyPersonnelByOsid(formations, faction)
```

builds a deterministic `Map<location_osid, personnel>` once per invocation, then each sector sums only its own `enemy_osids`.

## Determinism

- The helper iterates `Object.keys(formations).sort(strictCompare)`.
- The map is local to the current function invocation and is not retained across turns or calls.
- It reads active enemy combat formations only, matching the previous filters.
- It preserves the existing integer personnel totals and sector threat formulas.

## Measurement

Fresh pre-change profile references from the current lane:

- Baseline profile: `totalWallS=91.90`, `partition-corps-front-sectors=7305.867ms`, `reconcile-final-sector-truth=7492.307ms`.
- Baseline partition profile: `totalWallS=92.93`, `partition-corps-front-sectors=7637.439ms`, `reconcile-final-sector-truth=7797.154ms`.

Post-change profile:

- `npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_enemy_personnel_index_profile --report data/derived/_debug/sector_enemy_personnel_index_profile_40w.json`
- Result: `totalWallS=89.54`, `partition-corps-front-sectors=6799.566ms`, `reconcile-final-sector-truth=7071.455ms`, final hash unchanged by the matching timed run.

Post-change sector child profile, normalized against the prior 380-row profile as one 95-invocation slice:

| Bucket | Before | After |
|---|---:|---:|
| `buildFactionSectors:RS:brigade-classification:territory-assignment` | `430.764ms` | `237.213ms` |
| `buildFactionSectors:RBiH:brigade-classification:territory-assignment` | `378.724ms` | `244.236ms` |
| `buildFactionSectors:HRHB:brigade-classification:territory-assignment` | `223.073ms` | `157.843ms` |
| `buildFactionSectors:RS:post-classification-truth-normalization:recompute-power` | `107.362ms` | `25.238ms` |
| `buildFactionSectors:RBiH:post-classification-truth-normalization:recompute-power` | `89.722ms` | `23.900ms` |
| `buildFactionSectors:HRHB:post-classification-truth-normalization:recompute-power` | `47.336ms` | `29.580ms` |

## Verification

| Check | Result |
|---|---|
| Red characterization | `npx.cmd vitest run tests\sector_partition_instrumentation.test.ts --reporter=dot` failed before implementation because the reusable enemy-personnel index was absent. |
| Static/focused instrumentation guard | PASS, 20/20: `npx.cmd vitest run tests\sector_partition_instrumentation.test.ts --reporter=dot`. |
| Sector regression pack | PASS, 38/38: `tests\sector_partition_buildCorpsFrontSectors_integration.test.ts`, `tests\final_sector_truth_reconciliation_cache.test.ts`, `tests\final_sector_truth_reconciliation.test.ts`, `tests\war_phase_step_order.test.ts`, and `tests\sector_partition_instrumentation.test.ts`. |
| Brigade assignment pack | PASS, 57/57: `tests\sector_coverage_truth_preservation.test.ts`, `tests\sector_severe_undercoverage_rebalance.test.ts`, `tests\sector_split_brigade_assignment.test.ts`, `tests\brigade_territory_reconciliation.test.ts`, and `tests\rear_sector_bucket_truth.test.ts`. |
| Typecheck | PASS: `npm.cmd run typecheck`. |
| 40w timed scenario | PASS: `npm.cmd run sim:scenario:run:40w:timed`; final hash `30abd0696b9d7e24`; run `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n9`. |
| Post-change profile | PASS: `totalWallS=89.54`; report `data/derived/_debug/sector_enemy_personnel_index_profile_40w.json`. |
| Post-change sector child profile | PASS: `totalWallS=91.24`; report `data/derived/_debug/sector_enemy_personnel_index_partition_profile_40w.json`. |
| Baseline regression | PASS: `npm.cmd run test:baselines`; all scenarios match. |

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/brigade_assignment.ts` | Adds `countActiveEnemyPersonnelByOsid(...)` and reuses it in sector territory assignment and sector power recomputation. |
| `tests/sector_partition_instrumentation.test.ts` | Adds a static guard preventing the repeated per-sector formation scans from returning in these paths. |
