# Batch 32 — `enforceFinalSectorGeometryInvariants` Sub-Attribution

**Date:** 2026-05-18
**Baseline:** 40w `b14179d65639860c`
**Status:** Edits applied; static-contract test + typecheck PASS; 40w byte-identity proof n1907 + flagged attribution proof n1909 PASS. `:split-pieces` is the dominant child at 1198 ms / 55.5%.

## Goal

Attribute the three outer-wrapped passes of `enforceFinalSectorGeometryInvariants` (n1906 evidence: `:1` 833ms / `:2` 736ms / `:3` 442ms = ~2011ms combined across 3 passes, 241 invocations) into deterministic child labels so the next optimization target is visible. The function had no inner instrumentation pre-Batch 32.

## Change

`src/sim/combat/corps_front_sectors.ts` `enforceFinalSectorGeometryInvariants` body wrapped into 5 nested `_perfTime` child labels following the established pattern (Batches 21/23/26):

| Label | Phase body |
|---|---|
| `enforceFinalSectorGeometryInvariants:setup` | Initial loop building `byCorps` / `friendlyByFaction` / `osidToCorpsByFaction` indexes from input sectors |
| `enforceFinalSectorGeometryInvariants:split-pieces` | Per-corps split logic: `normalizeSectorSubSegmentsFromEdges` → `splitNonContiguousSectors` → `splitOversizedSubSegments` → `buildSectorSliceFromSubSegment` → write `nextSectors` |
| `enforceFinalSectorGeometryInvariants:replace-sectors` | Delete input `sectors` keys and re-insert `nextSectors` sorted |
| `enforceFinalSectorGeometryInvariants:voronoi-repair` | Per-faction `assignTerritoryVoronoi` + `repairDisconnectedTerritory` |
| `enforceFinalSectorGeometryInvariants:seed-buckets` | Final `seedSplitPieceBrigadeBuckets` per split group (when formations present) |

### Closure-Mutation Pattern

All shared state (`nextSectors`, `splitGroups`, `byCorps`, `friendlyByFaction`, `osidToCorpsByFaction`) is declared `const` at function-body scope BEFORE the `_perfTime` wrappers — Maps/Records are mutated through the captured reference, references themselves never reassigned (the standard pattern documented in [`feedback_closure_mutation_attribution_wrappers`] PROJECT_LEDGER_KNOWLEDGE Batch 21).

### Narrowing-Loss Workaround

`if (formations)` is followed by `const formationsResolved = formations;` inside the if block so TypeScript's narrowing survives the `_perfTime` callback closure. This matches the pattern in `applyFinalSectorOwnerTruthPass` and avoids an `as` cast.

## Static Contract Extended

`tests/sector_partition_instrumentation.test.ts` — added a 5-label static-grep contract test mirroring the existing `applyFinalSectorOwnerTruthPass` / `sealMergedSectorTruth` / `normalizeFinalSectorBuckets` contracts. 17/17 instrumentation tests pass after the addition.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS (clean) |
| `vitest run tests/sector_partition_instrumentation.test.ts` | 17/17 PASS |
| 40w byte-identity vs `b14179d65639860c` (n1907, default) | PASS — hash matches; 27/27 anchors; 6/6 benchmarks |
| 40w attribution proof (n1909, `PERF_PROFILE_SECTOR_PARTITION=true`) | PASS — hash unchanged `b14179d65639860c`; child Σ (2186 ms) accounts for outer Σ (2158 ms) plus the 2-call line-1719 surplus |

## Attribution Evidence (n1909)

| Label | ms | calls | % of outer Σ | ms/call |
|---|---:|---:|---:|---:|
| `enforceFinalSectorGeometryInvariants:1` (outer) | 912.79 | 94 | 42.3% | 9.71 |
| `enforceFinalSectorGeometryInvariants:2` (outer) | 786.59 | 94 | 36.4% | 8.37 |
| `enforceFinalSectorGeometryInvariants:3` (outer) | 458.85 | 53 | 21.3% | 8.66 |
| **outer Σ (:1+:2+:3)** | **2158.23** | 241 | 100% | — |
| `enforceFinalSectorGeometryInvariants:setup` | 65.97 | 243 | 3.1% | 0.27 |
| `enforceFinalSectorGeometryInvariants:split-pieces` | **1198.22** | 243 | **55.5%** | **4.93** |
| `enforceFinalSectorGeometryInvariants:replace-sectors` | 24.94 | 243 | 1.2% | 0.10 |
| `enforceFinalSectorGeometryInvariants:voronoi-repair` | 568.04 | 243 | 26.3% | 2.34 |
| `enforceFinalSectorGeometryInvariants:seed-buckets` | 328.57 | 243 | 15.2% | 1.35 |
| **child Σ (5)** | **2185.75** | 243 each | 101.3% | — |

Attribution residual: +27.52 ms / +1.3% — accounted for by the 2 extra child invocations vs outer (243 vs 241), traceable to the un-labeled line-1719 call-site that runs the children but no outer wrapper. ≈ 13.8 ms/call surplus matches the ~13 ms average per-call across `:1`/`:2`/`:3`. No leaked or unaccounted cost.

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/corps_front_sectors.ts` | 5 nested `_perfTime` wrappers inside `enforceFinalSectorGeometryInvariants`; `formationsResolved` narrowing-capture for the seed-buckets phase. |
| `tests/sector_partition_instrumentation.test.ts` | New static-contract test enumerating the 5 new label literals. |
| `docs/40_reports/implemented/20260518_BATCH32_ENFORCE_FINAL_GEOMETRY_ATTRIBUTION.md` | This report. |

Plus parent-doc propagation (PROJECT_LEDGER, napkin, SECTOR_MASTER, queue audit).

## Why This Matters

`enforceFinalSectorGeometryInvariants` is invoked 4× per turn (3 outer-wrapped passes at lines 431/472/535 + 1 unlabeled at line 1719). With 40 turns × ~7 ms/invocation, the sum is consistently in the top-10 sector-perf parents but had no internal visibility before this batch. The five new child labels expose whether the cost concentrates in setup, split-pieces (likely — calls `splitNonContiguousSectors`), replace-sectors, voronoi-repair, or seed-buckets — enabling targeted future optimization within the byte-identity envelope.

## Next-Step Candidates

n1909 evidence makes `:split-pieces` (1198 ms / 243 calls, 55% of outer-wrapper sum, 4.93 ms/call) the unambiguous next optimization target. The body calls `normalizeSectorSubSegmentsFromEdges` → `splitNonContiguousSectors` (likely the hot inner) → `splitOversizedSubSegments` → `buildSectorSliceFromSubSegment` and re-runs sub-segment normalization on each contiguous piece. Likely byte-identical patterns to investigate next batch:

1. **`splitNonContiguousSectors` BFS**: each per-corps per-sector call rebuilds reachability from scratch over `adjacency`/`sharedBoundaryAdj`/`caseBSplitAdj`. If the same adjacency is reused across all sectors in a corps, the BFS visited-set could be reused or the reachability graph pre-computed once per corps.
2. **`normalizeSectorSubSegmentsFromEdges` double-call**: it's invoked once on each input sector and again on each contiguous piece. If the piece is the original sector (1 contiguous piece, common case), the second call repeats the same work.
3. **`buildSectorSliceFromSubSegment`** sort + `.map(...).sort(...)` pipeline duplicates a comparator chain — fold-and-sort possible.

Distant runner-up is `:voronoi-repair` at 568 ms (26%, 2.34 ms/call); the cheaper children (`:setup` 66 ms, `:replace-sectors` 25 ms, `:seed-buckets` 329 ms) are not worth drilling further in isolation.
