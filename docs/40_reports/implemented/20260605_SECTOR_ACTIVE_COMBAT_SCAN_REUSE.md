# Sector Active-Combat Scan Reuse

**Date:** 2026-06-05
**Baseline:** current 40w floor `d1ace172a29b2353`
**Result:** byte-identical 40w floor `d1ace172a29b2353`

## Summary

- `buildCorpsFrontSectors(...)` now builds the sorted active-combat formation id list once per sector-reconstruction invocation.
- `buildFactionSectors(...)` and `buildMultiSectorsForCorps(...)` reuse that read-only list instead of rebuilding equivalent sorted scans inside each faction/corps path.
- This is a narrow sector-performance reuse slice: no sector truth, combat math, scenario data, save schema, UI, ordering contract, or baseline manifest changed.

## Changes Made

### Sector Reconstruction

- `src/sim/combat/corps_front_sectors.ts`
  - Imports `buildActiveCombatFormationScanIds(...)`.
  - Hoists one invocation-local `activeCombatFormationScanIds` list behind the existing perf wrapper.
  - Threads the list through `buildFactionSectors(...)`.
  - Keeps faction indexing order identical by iterating the same `strictCompare`-sorted active-combat ids and then filtering by faction.

- `src/sim/combat/sector_building.ts`
  - Exports `buildActiveCombatFormationScanIds(...)`.
  - Adds an optional `sharedActiveCombatFormationScanIds` parameter to `buildMultiSectorsForCorps(...)`.
  - Keeps the old direct-call fallback when no shared list is provided.

### Tests

- `tests/sector_partition_instrumentation.test.ts`
  - Pins the shared active-combat scan contract at the top-level sector pass.
  - Pins the `buildMultiSectorsForCorps(...)` fallback and shared-list parameter.

## Profile Evidence

Pre-change current-main proof:

- Timed 40w run reproduced `final_state_hash: d1ace172a29b2353`.
- Profile wall time: `82.2258202s`.
- Sector partition JSONL summary: `96` invocations, `16723.172ms`.
- Top sector children included `buildFactionSectors:RS` `2092.035ms`, `buildFactionSectors:RBiH` `1981.960ms`, `buildFactionSectors:RS:corps-sector-construction` `766.783ms`, and `buildFactionSectors:RBiH:corps-sector-construction` `733.139ms`.

Post-change proof:

- Timed 40w run preserved `final_state_hash: d1ace172a29b2353`.
- Partition-profile wall time: `81.7347955s`.
- Changed sector partition JSONL summary, last 96 invocation rows only: `16689.051ms`.
- Local sector-construction movement: `buildFactionSectors:RBiH:corps-sector-construction` `733.139ms -> 679.310ms`; `buildFactionSectors:RS:corps-sector-construction` `766.783ms -> 759.927ms`.

This is useful pass-boundary cleanup, not a headline optimization. The remaining dominant sector children are still `buildFactionSectors:RS/RBiH`, `enforceFinalSectorGeometryInvariants:split-pieces`, `recoverDroppedFrontEdges:1`, and `sealMergedSectorTruth:ensure-coverage`.

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/corps_front_sectors.ts` | Hoists and threads invocation-local active-combat scan ids. |
| `src/sim/combat/sector_building.ts` | Exports scan helper and accepts optional shared scan ids. |
| `tests/sector_partition_instrumentation.test.ts` | Adds static guards for the reuse contract. |

## Validation

- `npx.cmd vitest run tests\sector_partition_instrumentation.test.ts tests\final_sector_truth_reconciliation_cache.test.ts --reporter=dot` - 38/38 passed.
- `npm.cmd run typecheck -- --pretty false` - passed.
- `git diff --check` - passed.
- `npm.cmd run sim:scenario:run:40w:timed` - preserved `final_state_hash: d1ace172a29b2353`.
- `PERF_PROFILE_SECTOR_PARTITION=true npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_active_scan_reuse_partition_profile --report data/derived/_debug/sector_active_scan_reuse_profile_40w.json` - profile report written, wall `81.7347955s`.

## Next Steps

- Continue the sector-performance lane with a more material measured target.
- Next candidates from the latest profile: `enforceFinalSectorGeometryInvariants:split-pieces`, `recoverDroppedFrontEdges:1`, and `sealMergedSectorTruth:ensure-coverage`.
- Keep the `d1ace172a29b2353` floor as the stop gate until a later accepted engine or OOB change deliberately refloors it.
