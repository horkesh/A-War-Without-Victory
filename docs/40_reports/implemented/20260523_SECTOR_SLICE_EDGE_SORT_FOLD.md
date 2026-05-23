# Sector Slice Edge Sort Fold

**Date:** 2026-05-23
**Status:** Implemented and locally verified
**Lane:** EQ-1 / sector split-pieces performance
**Scope:** Compute-only optimization inside final sector slice construction. No scenario data, combat math, operation behavior, save schema, UI, calibration, or output contract changed.

## Summary

`buildSectorSliceFromSubSegment(...)` sorted `subSegment.edge_ids` twice while constructing one sector slice:

- once for the sector-level `edge_ids`
- again for the nested sub-segment `edge_ids`

The second sort produced the same ordered list. This batch sorts once into `sortedEdgeIds`, assigns that list to the sector, and gives the nested sub-segment a copied `[...]` version of the already sorted list. That preserves the previous no-aliasing property while removing the duplicate comparator pass.

## Determinism

- No cache was added.
- The sorted order still uses `strictCompare`.
- The nested sub-segment still gets a separate array copy.
- Existing final sector canonicalization, sorting, and id assignment are unchanged.

## Verification

| Check | Result |
|---|---|
| Red characterization | `npx.cmd vitest run tests\sector_partition_instrumentation.test.ts --reporter=dot` failed before implementation because the function sorted `subSegment.edge_ids` twice. |
| Instrumentation/static contract | PASS, 18/18. |
| Typecheck | PASS: `npm.cmd run typecheck`. |
| Sector regression pack | PASS, 66/66: `tests\sector_partition_instrumentation.test.ts`, `tests\sector_partition_buildCorpsFrontSectors_integration.test.ts`, `tests\sector_frontline_truth.test.ts`, `tests\sector_contiguity_split.test.ts`. |
| 40w profiled scenario | PASS: `PERF_PROFILE_SECTOR_PARTITION=true npm.cmd run sim:scenario:run:40w`; final hash `30abd0696b9d7e24`; run `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1`. |
| Consistency validation | PASS: `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1` with 0 unresolved assignments, 0 false owners, 0 disconnected sectors, 0 empty contested sectors, 0 missed legal floor donors, and 0 wide undefended front gaps. |
| Diff hygiene | PASS: `git diff --check`. |

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/corps_front_sectors.ts` | `buildSectorSliceFromSubSegment(...)` now reuses one sorted edge-id list and copies it for the nested sub-segment. |
| `tests/sector_partition_instrumentation.test.ts` | Adds a static regression guard that the helper does not sort `subSegment.edge_ids` twice. |
