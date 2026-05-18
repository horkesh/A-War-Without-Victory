# Batch 37 — Sector `:split-pieces` Redundant Normalize Skip (Byte-Identical)

**Date:** 2026-05-18
**Baseline:** 40w `b14179d65639860c`
**Status:** Edits applied; typecheck PASS; focused sector suites 53/53 PASS; 40w byte-identity proof n1913 hash `b14179d65639860c` (matches baseline); consistency validator PASS.

## Goal

Attack the dominant child of `enforceFinalSectorGeometryInvariants` exposed by Batch 32 attribution: `:split-pieces` at 1198 ms / 243 calls (55.5% of outer Σ, 4.93 ms/call). Target hypothesis #2 from Batch 32 next-step candidates: `normalizeSectorSubSegmentsFromEdges` is invoked once on the input sector AND again on each contiguous piece. In the common 1-contiguous-piece pass-through case, the second call repeats already-canonical work.

## Change

`src/sim/combat/corps_front_sectors.ts` `enforceFinalSectorGeometryInvariants:split-pieces` inner loop: gate the per-piece `normalizeSectorSubSegmentsFromEdges(contiguousPiece, edgeMeta)` call on `contiguousPiece !== sector`. The condition is true iff `splitNonContiguousSectors` returned an actually-split new piece object; it is false iff the function returned the input `sector` reference as a pass-through (1 contiguous piece, common case).

```ts
for (const contiguousPiece of contiguousPieces) {
    if (contiguousPiece !== sector) {
        normalizeSectorSubSegmentsFromEdges(contiguousPiece, edgeMeta);
    }
    const splitPieces = contiguousPiece.edge_ids.length > MAX_SECTOR_EDGES
        ? splitOversizedSubSegments(...)
        : contiguousPiece.sub_segments;
    // ...
}
```

The first normalize call (line 960, BEFORE `splitNonContiguousSectors`) is preserved — it canonicalizes every input sector before contiguity analysis. The optimization only skips the redundant second normalize on the pass-through reference.

### Why Byte-Identical

`splitNonContiguousSectors` has seven pass-through code paths (single edge, single-friendly trivial accept, single-friendly + 1 hostile component, ≤1 OSID component, ≤1 strict-case-B component, ≤1 edge component). Each `result.push(sector); continue;` returns the SAME object reference. The function's only mutation on pass-through is the trailing `result[i]!.sector_id = sector:${corpsId}:${i}` renumbering — `edge_ids`, `sub_segments[0].edge_ids`, `sub_segments[0].friendly_osids`, `sub_segments[0].enemy_osids`, `sub_segments[0].length_edges`, and `sub_segments[0].primary_brigade_ids` are untouched between the line-960 normalize and the would-be line-977 normalize.

`normalizeSectorSubSegmentsFromEdges` is idempotent on already-normalized input: `[...new Set(edge_ids)].sort(strictCompare)` on an already-sorted-deduped array is a no-op; the rebuilt `sub_segments[0]` reads from `edge_ids` and `faction` (unchanged) and inherits the existing `sub_segment_id` and `primary_brigade_ids` (unchanged). The downstream loop at lines 992-995 then unconditionally overwrites `sub_segment_id` with `subseg:${sectorId}:${subIndex}`, so even the renumbered sector_id has no observable effect on the final sub_segment_id.

In the multi-piece split path, `contiguousPiece !== sector` (new objects built by `splitNonContiguousSectors`), so the normalize call still runs and continues to canonicalize the ad-hoc `sub_segments[0]` built inline at lines 139-164 / 234-259 / 304-336 of `sector_splitting.ts`.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS (clean) |
| `vitest run tests/sector_partition_instrumentation.test.ts tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/sector_frontline_truth.test.ts` | 53/53 PASS |
| ↪ G1.5 cache ON vs OFF byte-equality across ≥100 deterministic state variants | PASS |
| ↪ G1.5 cache ON vs OFF byte-equality on pristine real-save fixture | PASS |
| ↪ G1.5 cache ON vs OFF byte-equality on final-pass real-save fixture | PASS |
| ↪ G1.5 stability across back-to-back invocations | PASS |
| ↪ G1.5 cache ON vs OFF byte-equality across war-pass + final-pass split | PASS |
| 40w byte-identity (n1913, default) vs `b14179d65639860c` | PASS — hash matches |
| `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1913` | PASS |
| ↪ 0 false owners / 0 disconnected sectors / 0 empty contested / 0 below-floor missed legal donors | PASS |
| ↪ Sector geometry, role-bucket truth, war-front faction-side coverage, reserve cap | PASS |

The four "below floor with no legal same-corps donor" tildes in the consistency report are informational and identical to the n1912 prior baseline run.

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/corps_front_sectors.ts` | `enforceFinalSectorGeometryInvariants:split-pieces` inner loop guards the per-piece `normalizeSectorSubSegmentsFromEdges` call on `contiguousPiece !== sector` (skips the redundant pass-through normalize). |
| `docs/40_reports/implemented/20260518_BATCH37_SECTOR_SPLIT_PIECES_PERF.md` | This report. |

Plus parent-doc propagation (PROJECT_LEDGER, SECTOR_MASTER, lane-bank queue).

## Expected Perf Effect (Inference — not formally re-instrumented)

Batch 32 attribution showed `:split-pieces` at 4.93 ms/call across 243 outer-loop entries. The skipped second `normalizeSectorSubSegmentsFromEdges` runs once per (corps × sector) iteration of the inner loop; in production most sectors are single-component pass-throughs, so this optimization eliminates ~one `normalizeSectorSubSegmentsFromEdges` invocation per sector. Re-running the perf sidecar in a follow-up batch would confirm the magnitude; this batch is intentionally measurement-light because the optimization is byte-identical and the 40w hash already proves no behavioral drift.

## Next-Step Candidates (Carried Forward)

Batch 32's other split-pieces hypotheses remain open:

1. **`splitNonContiguousSectors` BFS reuse**: each per-corps per-sector call rebuilds reachability over the same adjacency maps. Reuse-of-BFS-visited-set within a single `enforceFinalSectorGeometryInvariants` invocation could amortize across same-corps sectors.
2. **`buildSectorSliceFromSubSegment` sort fold**: line 982 builds `orderedPieces` via `.map(...).sort(...)` immediately after the sub_segments themselves were sorted — comparator chain could fold.
3. **Renumbering inside `splitNonContiguousSectors`**: the trailing `sort + reassign` at lines 343-346 of `sector_splitting.ts` is wasted in callers that immediately reassign `sector_id` (lines 988-991 of `corps_front_sectors.ts`). Skip in pass-through OR refactor caller to use unrenumbered intermediate IDs.

`:voronoi-repair` (568 ms / 26%) is the runner-up parent for the next perf batch after split-pieces hypotheses are exhausted.

## Why This Matters

`enforceFinalSectorGeometryInvariants` is invoked 4× per turn × 40 turns × ~94 outer-pass calls. The `:split-pieces` child dominated at 55% of total cost with 243 calls. Eliminating the redundant per-piece normalize in the common pass-through case removes pure compute work without changing observable state — byte-identical 40w hash and validator-PASS consistency confirm zero behavioral drift. The optimization is small in code surface (a 1-line `if`-guard around an existing call) but cumulative across the inner loop's per-sector iterations.
