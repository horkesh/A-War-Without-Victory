# Sector Split-Pieces Renumber Elision

**Date:** 2026-05-23  
**Status:** Implemented and locally verified  
**Lane:** EQ-1 / sector split-pieces performance  
**Scope:** Compute-only optimization in final sector geometry enforcement. No scenario data, combat math, operation behavior, save schema, UI, calibration, or output contract changed.

## Summary

`splitNonContiguousSectors(...)` historically always sorted and renumbered its result. That remains the default contract for public/back-compat callers.

`enforceFinalSectorGeometryInvariants(...)` is different: it calls `splitNonContiguousSectors([sector], ...)`, immediately applies its own deterministic sort, and then assigns canonical `sector:${corpsId}:${nextIndex}` ids and `subseg:${sectorId}:${subIndex}` ids. In this call path, the inner sort/renumber is redundant work.

This batch adds an explicit `SplitNonContiguousSectorsOptions` parameter:

```ts
{ renumberResult: false }
```

Only the final-geometry `:split-pieces` caller uses it. All existing callers continue to receive the original sorted/renumbered result by default.

## Why This Is Deterministic

- The option is invocation-local and does not cache across runs.
- The final-geometry caller already sorts `contiguousPieces` before consuming them.
- The final-geometry caller overwrites every output sector id and sub-segment id before writing to `nextSectors`.
- Public/default `splitNonContiguousSectors(...)` semantics are preserved and tested.
- Pass-through sectors no longer mutate `sector_id` in this internal caller, but the caller-owned canonicalization still assigns the same observable ids.

## Verification

| Check | Result |
|---|---|
| Red characterization | `npx.cmd vitest run tests\sector_contiguity_split.test.ts --reporter=dot` failed before implementation because pass-through `sector_id` was still mutated. |
| Focused split test | PASS, 12/12. |
| Sector regression pack | PASS, 65/65: `tests\sector_partition_instrumentation.test.ts`, `tests\sector_partition_buildCorpsFrontSectors_integration.test.ts`, `tests\sector_frontline_truth.test.ts`, `tests\sector_contiguity_split.test.ts`. |
| Typecheck | PASS: `npm.cmd run typecheck`. |
| 40w profiled scenario | PASS: `PERF_PROFILE_SECTOR_PARTITION=true npm.cmd run sim:scenario:run:40w`; final hash `30abd0696b9d7e24`; run `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`. |
| Consistency validation | PASS: `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n0` with 0 unresolved assignments, 0 false owners, 0 disconnected sectors, 0 empty contested sectors, 0 missed legal floor donors, and 0 wide undefended front gaps. |
| Baseline regression | PASS: `npm.cmd run test:baselines`; all scenarios match, no manifest update. |
| Diff hygiene | PASS: `git diff --check`. |

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/sector_splitting.ts` | Added `SplitNonContiguousSectorsOptions` and default-preserving optional renumber gate. |
| `src/sim/combat/corps_front_sectors.ts` | Final-geometry split-pieces caller passes `{ renumberResult: false }` because it owns canonical id assignment. |
| `tests/sector_contiguity_split.test.ts` | Guards default renumbering plus caller-owned id preservation for the new option. |

## Residual Sector Perf Work

The larger EQ-1 hypotheses are still open:

1. Reuse BFS/component work across same-corps sectors inside a single final-geometry invocation.
2. Fold repeated sorts around `buildSectorSliceFromSubSegment(...)`.
3. Move to the runner-up `:voronoi-repair` hotspot after split-pieces hypotheses are exhausted.
