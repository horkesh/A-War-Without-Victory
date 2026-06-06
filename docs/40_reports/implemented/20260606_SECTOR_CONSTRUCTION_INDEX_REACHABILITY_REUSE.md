# Sector Construction Index And Reachability Reuse

**Date:** 2026-06-06

## Summary

`buildFactionSectors(...)` now reuses two invocation-local sector construction indexes:

- a per-corps `SectorFormationScanIndex` built from the already sorted active-combat id universe, avoiding repeated per-corps active formation scans inside `buildMultiSectorsForCorps(...)`;
- precomputed faction/corps reachable-OSID sets for the staffability filter, replacing repeated bounded BFS probes against each candidate sector's unique front OSIDs.

Direct `buildMultiSectorsForCorps(...)` callers retain the old fallback scan path.

## Determinism

Both indexes are scoped to one `buildFactionSectors(...)` invocation and discarded before the next sector reconstruction pass. Formation ids still originate from the `strictCompare`-sorted active-combat list built by `buildCorpsFrontSectors(...)`; reachable sets expand over existing sorted adjacency lists and are used only for boolean membership checks. No sector truth, combat math, operation behavior, scenario data, save schema, UI behavior, baseline manifest, replay writer, or generated artifact changed.

## Proof

- `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\sector_partition_instrumentation.test.ts tests\final_sector_truth_reconciliation_cache.test.ts --reporter=dot` - PASS, 40/40.
- `npm.cmd run typecheck -- --pretty false` - PASS.
- `git diff --check` - PASS.
- `node F:\A-War-Without-Victory\node_modules\tsx\dist\cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_40w.json --unique --map --timing-json --out runs` - PASS, final hash `d1ace172a29b2353`.
- `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n0` - PASS.
- `$env:PERF_PROFILE_SECTOR_PARTITION='true'; node F:\A-War-Without-Victory\node_modules\tsx\dist\cli.mjs tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_reachable_scan_profile --report data/derived/_debug/sector_reachable_scan_profile_40w.json` - PASS, `totalWallS=88.2679765`.

## Performance Evidence

Fresh profile evidence after the slice:

- sector partition sidecar total: `25,931.774ms` before this slice -> `17,795.054ms`;
- `buildFactionSectors:*:corps-sector-construction`: `2,425.651ms` -> `1,556.985ms`;
- `buildMultiSectorsForCorps:*:sector-formation-scan-index`: `191.770ms` -> `0.256ms`;
- `buildFactionSectors:*:corps-sector-construction:*:staffability-filter`: `200.307ms` -> `38.366ms`;
- new one-time reachability builds cost `105.175ms` per-corps plus `43.434ms` faction-wide.

Remaining measured owners are still in sector reconstruction/final-sector truth, led by `buildFactionSectors:RS/RBiH`, `enforceFinalSectorGeometryInvariants:split-pieces`, `recoverDroppedFrontEdges:1`, and `sealMergedSectorTruth:ensure-coverage`.

## Files

- `src/sim/combat/corps_front_sectors.ts`
- `src/sim/combat/sector_building.ts`
- `tests/sector_partition_instrumentation.test.ts`
