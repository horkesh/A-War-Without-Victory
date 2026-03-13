# Sector Contiguity Fix — Triple-Junction Split + Shared Front-Edge Territory (n664)

**Date:** 2026-03-13
**Run:** n664, hash `0ca780c065365530`
**Calibration:** 88.7% area-weighted (+0.8pp from n653), 6/6 benchmarks PASS, RS w40 0.525, RS delta -18

---

## Problem Statement

Two bugs in the sector construction pipeline:

### Bug 1: Kakanj/Visoko sector bridging across enemy lines
ARBiH 2nd Corps had a single sector containing both the Zavidovići front and the Kakanj/Visoko front. These are disconnected front segments — the front at `hajderovici_2` faces north toward Zavidovići (`vozuca_2`) and south toward Kakanj (`gornja_borovica_2`). The hostile sides (`vozuca_2` and `gornja_borovica_2`) are in different municipalities with **no edge between them** in the contact graph. The sector should have been split.

### Bug 2: Olovo/Kladanj interrupted by single-OSID sector
The Olovo/Kladanj front was broken by territory exclusivity — a one-OSID sector interrupted a contiguous front line because each territory OSID could only belong to one sector.

---

## Root Causes

### Root Cause 1: `splitNonContiguousSectors` used shared-OSID connectivity (too permissive)

The function (Step 4b of the pipeline) checked whether front edges shared ANY OSID endpoint. At a polygon triple junction, edges facing different directions both touch the same OSID — this connected edges that face **completely different front segments**.

**Example:** At `hajderovici_2`, the edge `hajderovici_2__vozuca_2` (facing north, Zavidovići) and the edge `hajderovici_2__gornja_borovica_2` (facing south, Vareš) both share `hajderovici_2`. Shared-OSID connectivity treated them as adjacent. But `vozuca_2` and `gornja_borovica_2` have no edge between them — they are NOT part of the same front line.

**Fix:** Replaced shared-OSID connectivity with triple-junction adjacency (calling `buildEdgeAdjacency` with faction info). Two edges are now adjacent only if:
- **Case A:** Same friendly OSID + hostile OSIDs are adjacent to each other
- **Case B:** Same hostile OSID + friendly OSIDs are adjacent to each other

This correctly identifies that the Zavidovići and Kakanj fronts are disconnected at `hajderovici_2`.

### Root Cause 2: Territory OSIDs were exclusive (one sector per OSID)

`assignTerritoryVoronoi` used first-claim BFS — once a territory OSID was claimed by one sector, no other sector could claim it. Front-edge OSIDs at sector junctions naturally belong to multiple sectors (they're the shared polygon at the boundary).

**Fix:** Front-edge OSIDs (those on `sub_segments.friendly_osids`) can now be claimed by **multiple sectors**. Rear territory remains exclusive (BFS first-claim). A `sharedClaims` map tracks multi-sector front-edge assignments, and these are included in ALL claiming sectors' `territory_osids`.

### Root Cause 3: Brigade assignment at shared OSIDs needed tiebreaking

With front-edge OSIDs shared across sectors, a brigade standing at a shared OSID could be assigned to multiple sectors. The old single-sector lookup (`frontOsidToSectorIdx`) couldn't handle this.

**Fix:** Changed to `frontOsidToSectorIndices` (Map → number[]). When a brigade is at a shared front OSID claimed by multiple same-corps sectors, it's assigned to the **neediest** sector (highest `length_edges - assigned_brigade_ids.length`), with stable sector_id tiebreaking.

---

## Key Gotcha Moments

### Gotcha 1: "Comments lie" — shared-OSID connectivity was described as strict but was permissive

The code comment in `splitNonContiguousSectors` said it used "shared-OSID connectivity" to "prevent sectors spanning disconnected fronts." This was true for the Srebrenica↔Cerska case (n620) but **false for the Zavidovići↔Kakanj case**. At triple junctions, shared-OSID is too permissive — it connects ANY edges touching the same polygon, regardless of which direction they face. The real invariant is "edges must be part of the same front line," which requires knowing hostile-side adjacency (triple-junction), not just shared endpoints.

**Lesson:** The same adjacency algorithm can be correct for one topology (preventing Srebrenica↔Cerska bridging) and wrong for another (allowing Zavidovići↔Kakanj bridging). Always test adjacency changes against BOTH split-required and join-required cases.

### Gotcha 2: Over-splitting from adjacency map mismatch (31 sectors → 11)

First attempt passed `sharedBoundaryAdj` (the restrictive polygon-boundary adjacency, threshold 0.00005) to `splitNonContiguousSectors`. This was MORE restrictive than the full `osidAdjacency` used in the initial grouping step (`findSubSegments`). Result: 31 sectors for 2nd Corps (was 13). Edges that were grouped together by `findSubSegments` using `osidAdjacency` were then split apart by `splitNonContiguousSectors` using `sharedBoundaryAdj`.

**Fix:** Use the SAME adjacency source (full `osidAdjacency`) for both grouping and splitting. The split function now calls `buildEdgeAdjacency` with `osidAdjacency`, not `sharedBoundaryAdj`.

**Lesson:** When a pipeline has a grouping step and a splitting step, they MUST use compatible adjacency definitions. If the splitter is stricter than the grouper, it will over-fragment everything the grouper created.

### Gotcha 3: Test failures from non-parseable edge IDs

4 tests used synthetic edge IDs (`e1`, `e2`, `e3`) that can't be parsed as `osidA__osidB`. The new code couldn't build adjacency from them, so every edge was isolated and every sector was split into single-edge fragments.

**Fix:** Added a fallback: when `parsedEdgeCount === 0` (no `__`-separated edge IDs), fall back to the original OSID-level BFS through `osidAdjacency` on friendly_osids.

### Gotcha 4: Two residual sectors with bending front lines

Post-fix deep dive (92 sectors, triple-junction contiguity test) found 2 sectors with multi-component front lines:
- `arbih_3rd_corps:1` (Doboj/Maglaj): `kosova_2` is friendly and borders both `boljanic_2` (Doboj) and `jablanica` (Maglaj), but those hostiles aren't adjacent to each other.
- `vrs_1st_krajina:7` (Maglaj/Zavidovići, mirror): `donja_bocinja_2` is RS-friendly and borders both `lijesnica` (Maglaj) and `cinovici` (Zavidovići), but those hostiles aren't adjacent.

Both represent **bending front lines** where a friendly polygon faces two non-adjacent enemy polygons. The front wraps around the friendly polygon's perimeter — geographically continuous but no triple-junction link exists. The engine already marks `arbih_3rd_corps:1` with 2 sub-segments, acknowledging the bend.

**Status:** Under review — may need visual map inspection to decide if these should be split or joined.

---

## Three-Part Change Summary

### Change 1: `splitNonContiguousSectors` — triple-junction connectivity
**File:** `src/sim/combat/corps_front_sectors.ts`
- Added optional params: `faction`, `edgeMeta`, `sharedBoundaryAdj`
- When faction info available: calls `buildEdgeAdjacency` with triple-junction logic
- Fallback for non-parseable edge IDs: OSID-level BFS through `osidAdjacency`
- Call site passes `faction` and `edgeMeta` but NOT `sharedBoundaryAdj`

### Change 2: `assignTerritoryVoronoi` — shared front-edge territory
**File:** `src/sim/combat/corps_front_sectors.ts`
- Front-edge OSIDs (from `sub_segments.friendly_osids`) tracked in `sharedClaims` map
- Multiple sectors can claim the same front-edge OSID
- Rear territory remains exclusive via BFS first-claim
- All claiming sectors include shared OSIDs in their `territory_osids`

### Change 3: `classifyBrigadesByTerritory` — need-based shared-OSID assignment
**File:** `src/sim/combat/corps_front_sectors.ts`
- Phase 1 now uses `frontOsidToSectorIndices` (multi-sector mapping)
- When brigade at shared OSID: assigned to neediest same-corps sector
- Tiebreak: highest need (edges minus brigades), then stable `strictCompare` on sector_id

---

## Verification

### Calibration comparison (n653 → n664)

| Metric | n653 | n664 | Delta |
|---|---|---|---|
| Area-weighted match | 87.9% | 88.7% | **+0.8pp** |
| RS w40 share | 0.522 | 0.525 | +0.003 |
| RS OSID delta | -20 | -18 | improved |
| Benchmarks | 6/6 PASS | 6/6 PASS | held |
| Hash | 10a33b05dbcb94a9 | 0ca780c065365530 | changed |

### Sector contiguity audit

| Metric | Value |
|---|---|
| Total sectors | 92 |
| Contiguous (strict triple-junction) | 90 |
| Bending front (under review) | 2 |
| Shared territory OSIDs (all factions) | 67 |
| Shared territory OSIDs (2nd Corps) | 5 |

### Bug 1 verification: Kakanj/Visoko split
- Zavidovići front → `arbih_3rd_corps:14` (5 edges, 1 sub-segment)
- Kakanj/Visoko front → `arbih_3rd_corps:10` (11 edges, 1 sub-segment)
- Separate sectors. `hajderovici_2` shared as junction OSID across sectors 14, 15, 9.

### Bug 2 verification: Olovo/Kladanj continuity
- `arbih_3rd_corps:2` (Kladanj/Olovo, 6 edges), `arbih_3rd_corps:3` (Kladanj, 9 edges), `arbih_3rd_corps:4` (Olovo/Šaševci, 3 edges)
- `sasevci_2` shared between sector 4 and sector 6 — no single-OSID interruption.
- All sectors have single sub-segments (contiguous lines).

---

## Diagnostic Tools

| Tool | Purpose |
|---|---|
| `tools/check_sector_split.cjs` | 2nd Corps sector listing with territory/brigade detail |
| `tools/check_sector_split2.cjs` | All-faction sector check with shared territory count |

---

## Design Principle Established

> **A sector is a contiguous segment of the front LINE (edge chain), not an area.**

Territory supports the line but doesn't define it. Two edges are part of the same sector iff they are connected through triple-junction adjacency (Cases A and B). A territory OSID can support multiple sectors. Brigade assignment at shared OSIDs uses need-based tiebreaking.

The pipeline now uses:
- **Triple-junction adjacency** for BOTH sub-segment construction (Step 1) AND contiguity enforcement (Step 4b)
- **Shared front-edge territory** for territory assignment (Step 5)
- **Need-based multi-sector tiebreaking** for brigade classification (Step 6)
