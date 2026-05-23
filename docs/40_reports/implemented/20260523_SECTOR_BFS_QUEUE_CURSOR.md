# Sector BFS Queue Cursor

**Date:** 2026-05-23  
**Status:** Implemented and locally verified  
**Lane:** EQ-1 / sector split-pieces performance  
**Scope:** Compute-only BFS queue optimization in sector splitting/building. No scenario data, combat math, operation behavior, save schema, UI, calibration, or output contract changed.

## Summary

Two sector split-path BFS loops used `Array.shift()`:

- `mergeUndersizedSectors(...)` friendly component precompute in `src/sim/combat/sector_splitting.ts`
- `walkEdgeChain(...)` in `src/sim/combat/sector_building.ts`

Both now use a monotonically increasing `head` cursor:

```ts
let head = 0;
while (head < queue.length) {
    const current = queue[head++]!;
    ...
}
```

This preserves FIFO traversal and neighbor insertion order while avoiding repeated array reindexing.

## Determinism

- No cache was added.
- Queue insertion order is unchanged.
- Neighbor ordering remains exactly as before.
- Traversal still consumes the same queue entries in the same order.

## Verification

| Check | Result |
|---|---|
| Red characterization | `npx.cmd vitest run tests\sector_partition_instrumentation.test.ts --reporter=dot` failed before implementation because the sector split BFS regions still contained `.shift()`. |
| Focused sector tests | PASS, 31/31: `tests\sector_partition_instrumentation.test.ts`, `tests\sector_contiguity_split.test.ts`. |
| Typecheck | PASS: `npm.cmd run typecheck`. |
| Sector regression pack | PASS, 67/67: `tests\sector_partition_instrumentation.test.ts`, `tests\sector_partition_buildCorpsFrontSectors_integration.test.ts`, `tests\sector_frontline_truth.test.ts`, `tests\sector_contiguity_split.test.ts`. |
| 40w profiled scenario | PASS: `PERF_PROFILE_SECTOR_PARTITION=true npm.cmd run sim:scenario:run:40w`; final hash `30abd0696b9d7e24`; run `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n2`. |
| Consistency validation | PASS: `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n2` with 0 unresolved assignments, 0 false owners, 0 disconnected sectors, 0 empty contested sectors, 0 missed legal floor donors, and 0 wide undefended front gaps. |
| Diff hygiene | PASS: `git diff --check`. |

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/sector_splitting.ts` | `mergeUndersizedSectors(...)` friendly component BFS now uses a head cursor. |
| `src/sim/combat/sector_building.ts` | `walkEdgeChain(...)` BFS now uses a head cursor. |
| `tests/sector_partition_instrumentation.test.ts` | Adds static guards against `.shift()` in these sector split BFS regions. |
