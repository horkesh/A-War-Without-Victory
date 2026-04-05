# BFS Corridor Reachability Fix — Bridge Detection on Full Subgraph

**Date:** 2026-04-05
**Run:** n1323
**Hash:** `b3355614a82d13d7`
**Status:** CLOSED

## Summary

Fixed `deriveCorridorsOsid` and `deriveSupplyStateByOsid` in `src/state/supply_state_derivation.ts` to test bridge-ness against the full reachable-controlled subgraph instead of the BFS spanning tree. The BFS spanning tree has zero cycles by definition, so every edge was trivially a bridge — producing 100% brittle corridors, 0% open, and collapsing the adequate-BFS to source nodes only.

## Specialists Used

| Specialist | Owned | Evidence |
|---|---|---|
| Gameplay Programmer | Root cause trace, fix recommendation | Identified `runSupplyBfs` only records tree edges (skips visited neighbors). Traced `isBridgeInSubgraphOsid` trivially returning true for all tree edges. Recommended fix: bridge check against full subgraph. |
| Systems Programmer | Graph structure analysis, invariant review | Confirmed OSID graph is dense mesh (712 nodes, 2047 edges, avg degree 5.75, cycle rank 1336). True bridges should be rare. BFS tree is root cause, not graph topology. Determinism safe. |
| Scenario Runner | n1322 evidence, graph statistics | Quantified: 14/712 adequate OSIDs (source nodes only). Per-faction internal edge counts: RS ~953, RBiH ~506, HRHB ~163. BFS tree captures ~N-1 edges; redundant edges discarded. |
| Post-Run Analyst | n1323 verification | Supply readiness: 13/21 ops at 1.0, 8/21 at 0.5 (vs n1322: 2/20 at 1.0, 18/20 at 0.5). Differentiation restored with historically plausible faction pattern. |
| Orchestrator | Dispatch, synthesis, go/no-go | All specialists converged on same root cause and fix independently. |

## Root Cause

**Bridge detection operated on the BFS spanning tree, not the actual graph topology.**

1. `runSupplyBfs` (`supply_reachability.ts:73`) skips already-visited neighbors: `if (visited.has(neighbor)) continue`. This means `edges_used` contains only BFS tree edges — N-1 edges for N reachable nodes, with zero cycles.

2. `isBridgeInSubgraphOsid` (`supply_state_derivation.ts:344`) tests whether removing an edge from `edgesUsed` disconnects the graph. In a tree, removing ANY edge disconnects it. Therefore **100% of edges_used were classified as brittle**.

3. `deriveCorridorsOsid` (`supply_state_derivation.ts:400`) only checked bridge status for `edgesUsed` edges. All other edges between controlled nodes were classified as `cut` (not traversed).

4. `deriveSupplyStateByOsid` (`supply_state_derivation.ts:490`) built `openEdges` from `edgesUsed` filtered to open corridors. Since 0% were open, the adequate-BFS had no edges to traverse and could only reach source nodes themselves (~5-6 per faction).

The OSID graph itself is a well-connected planar mesh (avg degree 5.75, cycle rank 1336). True topological bridges are rare. The problem was entirely in which edge set was used for bridge detection.

## Fix

Two changes in `supply_state_derivation.ts`:

### 1. `deriveCorridorsOsid` (lines 385-408)
Build `reachableEdges` — all edges where both endpoints are in `reachableSet` AND `controlledSet`. Run bridge detection against this full subgraph instead of `edgesUsed`.

### 2. `deriveSupplyStateByOsid` (lines 487-498)
Build `openEdges` by iterating all edges between reachable controlled OSIDs and filtering by corridor state from the (now-correct) corridor report, instead of iterating only `edgesUsed`.

## Validation: n1323

| Metric | n1322 (before) | n1323 (after) | Delta |
|---|---|---|---|
| Area-weighted | 94.3% | **94.0%** | **-0.3pp** |
| Anchors | 27/27 | **27/27** | zero |
| Benchmarks | 6/6 | **6/6** | zero |
| Battles | 76 | **74** | **-2** |
| Attack orders | 97 | **90** | **-7** |
| Hash | `5203382e9aa2018d` | `b3355614a82d13d7` | changed |

Supply readiness differentiation:
- n1322: 2/20 ops at 1.0, 18/20 at 0.5 (flat — no signal)
- **n1323: 13/21 ops at 1.0, 8/21 at 0.5** (meaningful differentiation)

Faction pattern: VRS 6/7 at 1.0 (Drina at 0.5), HRHB 3/3 at 1.0, ARBiH 4/9 at 1.0 and 5/9 at 0.5. Historically plausible.

The -0.3pp is the expected calibration shift from well-supplied corps now getting 1.0x supply mult instead of 0.75x. 27/27 anchors and 6/6 benchmarks confirm no regression.

## Residual

- **Performance**: Bridge detection is now O(E*V) per faction on the full subgraph (~1000 edges for RS) instead of the BFS tree (~400 edges). Still fast for 40-week runs. Tarjan's O(V+E) bridge algorithm is a valid follow-up optimization.
- **Binary 1.0/0.5 split**: The graduated scoring (adequate=1.0, strained=0.5, critical=0.0) produces a binary split for most corps. Finer granularity (continuous interpolation) is a P2 follow-up.
- **vrs_east_bosnian ZEA**: 2 ops still zero-eligible (pre-existing, bounded by backstop).

## Files Changed

- `src/state/supply_state_derivation.ts` — `deriveCorridorsOsid` (bridge detection on full subgraph) + `deriveSupplyStateByOsid` (open edges from full subgraph)

## Test Count

167 files, 2344 tests, 0 failures.

## Completion Block

- **Canonical owner:** `src/state/supply_state_derivation.ts` (`deriveCorridorsOsid` + `deriveSupplyStateByOsid`)
- **Demoted path:** Continuous supply readiness interpolation (P2) — the 1.0/0.5 binary split is now correct but coarse. Not blocking.
- **Player-visible truth:** Well-connected corps (VRS heartland, HRHB) have adequate supply readiness. Logistics-constrained corps (ARBiH enclaves, VRS Drina) are correctly strained. Supply now meaningfully differentiates operations.
- **Canonical UI surface:** No UI change. Supply readiness values in operation briefing modals now show meaningful differentiation.
- **Done means:** Bridge detection operates on the correct graph. 100%-brittle collapse eliminated. Supply readiness differentiates by faction and corps. 27/27 anchors, 6/6 benchmarks, historically plausible supply pattern.

## Recommended Next Lane

1. **estimateForceRatio supply awareness** (P1): Now unblocked — supply readiness has meaningful differentiation. Can add supply mult to force ratio estimator.
2. **Tarjan's bridge algorithm** (P3): Performance optimization — replace per-edge BFS with O(V+E) Tarjan's. Not needed yet.
3. **Continuous supply readiness interpolation** (P2): Replace three-tier (1.0/0.5/0.0) with distance-from-source or reserve-based curve.
