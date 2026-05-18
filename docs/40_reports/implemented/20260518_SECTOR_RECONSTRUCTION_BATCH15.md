# Sector Reconstruction Batch 15

**Date:** 2026-05-18
**Baseline:** 40w n1890 `248202ee4fd13027`
**Result:** `buildFactionSectors(...)` now builds one faction-level active-combat formation index and reuses it across per-corps construction, brigade-location/component lookups, and active-combat counts.

## Summary

- Replaced several repeated full-formation scans inside `buildFactionSectors(...)` with one invocation-local active-combat index.
- Kept all reuse local to the current faction build; no module/global cache, save field, scenario artifact, random source, timestamp, or cross-turn state was added.
- Preserved all-faction active-combat location/component sets separately from per-corps maps so formations without a corps ID still participate in faction-level reachability while avoiding nullable corps-key writes.

## Profiling Evidence

Fresh Batch 15 sidecar aggregation over 94 sector profiling samples still names sector reconstruction as the owner, with these remaining leaders:

| Label | Aggregate ms | Count |
|---|---:|---:|
| `buildFactionSectors:RS` | 3268.501 | 94 |
| `buildFactionSectors:RBiH` | 3183.130 | 94 |
| `recoverDroppedFrontEdges:1` | 1639.243 | 94 |
| `buildFactionSectors:RBiH:corps-sector-construction` | 1367.905 | 94 |
| `recoverDroppedFrontEdges:faction-front-claim-setup` | 1308.836 | 282 |
| `buildFactionSectors:RS:corps-sector-construction` | 985.099 | 94 |
| `buildFactionSectors:RS:brigade-classification` | 795.102 | 94 |
| `buildFactionSectors:RBiH:brigade-classification` | 601.831 | 94 |

The next sector lane should choose between the remaining per-corps construction labels and the brigade-classification/final-invariant labels from this fresh profile. Do not infer a full-harness speed win from one noisy scenario wall-clock.

## Verification

| Command | Result |
|---|---|
| `npm.cmd run typecheck` | Passed after the parent nullable-corps guard fix. |
| `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/sector_frontline_truth.test.ts --reporter=dot` | Passed: 3 files, 48 tests. |
| `npm.cmd run sim:scenario:run:40w` | Produced n1891 `0d8d9ccdc477d77a`, 27/27 anchors, 6/6 bot benchmarks. |
| `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1891` | Passed. |

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/corps_front_sectors.ts` | Added faction-level active-combat formation index and reused its count/location/component maps. |
| `tests/sector_partition_instrumentation.test.ts` | Added coverage for the new `active-combat-formation-index` profile label. |

## Residual Risk

This lane intentionally optimizes repeated read-only scan setup while leaving the larger sector reconstruction owners in place. Further cuts should start from the fresh Batch 15 profile, keep cache scope invocation-local, and require focused sector equivalence tests plus 40w proof.
