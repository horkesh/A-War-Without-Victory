# Map Geometry Master Reference

**Purpose:** Living reference for OSID polygon geometry, front edge rendering, and map data pipeline issues.
**Updated:** 2026-03-18 (edges viewer investigation)

## Pipeline Overview

```
data/derived/settlements_wgs84_1990.geojson     (5,823 canonical settlement polygons)
        ↓ derive_operational_settlements.ts
        ↓   Phase 1-4: Cluster canonical settlements → 744 OSIDs
        ↓   Phase 5a: Build global TopoJSON topology (shared arcs)
        ↓   Phase 5b: Simplify topology (shared arcs simplified together)
        ↓   Phase 5c: topojsonClient.merge() per cluster
        ↓   Phase 6: normalizeGeometry() — close rings, remove tiny holes, fix winding
        ↓
data/derived/operational/operational_settlements.geojson  (744 OSID polygons)
data/derived/operational/operational_contact_graph.json   (2,118 adjacency edges)
```

## Known Issues

### 1. CRITICAL: TopoJSON merge does not create shared arcs between clusters

**Status:** Open — root cause identified 2026-03-18
**Impact:** ~37 OSID pairs have no shared polygon edges despite being adjacent. Front lines have gaps at these boundaries. Visible at Sarajevo enclave east edge.

**Root cause:** `topojsonClient.merge()` dissolves internal boundaries within a cluster but does NOT rebuild shared arcs between the resulting cluster polygons. After merge:
- Cluster A's boundary uses vertices from settlement S144959's outer ring
- Cluster B's boundary uses vertices from settlement S166472's outer ring
- Where A and B should share a boundary, each has different intermediate vertices (~100m apart)

**Example:** `op:stari_grad_sarajevo:sarajevo_dio_stari_grad_sarajevo` (2 SIDs) and `op:stari_grad_sarajevo:faletici` (6 SIDs) share 2 corner vertices but zero edge segments. Their canonical constituent settlements (S144959, S166472, etc.) DO share edges, but those shared edges are dissolved during merge because they're internal to cluster B.

**Fix:** After merging all clusters in Phase 5c, rebuild topology from the merged polygons and re-export GeoJSON:
```
Current:  canonical → topology → simplify → merge per cluster → export GeoJSON
Fixed:    canonical → topology → simplify → merge per cluster → NEW topology from merged → export GeoJSON
```
This second topology pass creates new shared arcs for inter-cluster boundaries.

**Affected OSID pairs (zero shared edges, confirmed):**
- `op:stari_grad_sarajevo:sarajevo_dio_stari_grad_sarajevo` ↔ `op:stari_grad_sarajevo:faletici`
- `op:trnovo:delijas` ↔ `op:novo_sarajevo:lukavica`
- Plus ~35 others (see edges viewer stats)

### 2. SID → OSID key mismatch in UI (FIXED 2026-03-18)

**Status:** Fixed
**Fix:** Enriched `OsidCentroidLookup` with SID aliases from `canonical_to_operational_map.json`. All centroid lookups now resolve both key formats.

### 3. Polygon artifacts visible on faction fill

**Status:** Open — documented in `memory/polygon_artifacts.md`
**Impact:** Slivers, micro-gaps, and wedge artifacts at triple junctions visible when applying area fills (faction wash, political control). Invisible on outline-only rendering.
**Root cause:** TopoJSON simplification threshold (0.0000005) may be too aggressive. Also related to issue #1 (non-shared boundaries between clusters).

### 4. Front edge rendering: 13 phantom edges between non-adjacent OSIDs

**Status:** Open
**Impact:** 13 front edges exist between OSID pairs not in the contact graph. These produce centroid-to-centroid straight lines in the old viewer, filtered out in the new viewer.
**Root cause:** `computeFrontEdgesOsid()` uses `min_dist` filter but the contact graph has no `min_dist` data (all undefined → filter is dead code).
**Fix:** Add `min_dist` computation to the contact graph generation pipeline, or filter front edges against the polygon edge-sharing set.

### 5. `front_edges` (SID-keyed) vs `war_front_edges_osid` (OSID-keyed)

**Status:** Legacy coexistence
**Impact:** `front_edges` uses SID keys, cannot resolve in OSID centroid lookup. `war_front_edges_osid` is the correct source for war-phase rendering.
**Note:** `buildOrderArrowsGeoJSON.ts` was using `frontEdges` (SID) for edge snapping — fixed 2026-03-18 to use `frontEdgesOsid`.

## Front Line Rendering Algorithms

### Game (buildCorpsFrontLinesGeoJSON.ts)
Walks every polygon vertex pair → hashes → tracks which 2 OSIDs share each segment → if different controllers → front segment. Uses `toFixed(6)` coordKey. Renders individual segments with `line-cap: round` and `line-join: round` — the glow layer visually bridges small gaps.

### Edges Viewer (docs/60_visualisations/edges_viewer.html)
Same polygon-edge-walking algorithm, plus:
- **Stitcher:** Chains segments into continuous polylines via exact endpoint matching (color-agnostic)
- **BFS bridge:** Connects dead-end chain endpoints through friendly polygon edges (max 3 hops)
- **Fragment filter:** Removes chains with < 4 vertices
- **Faction wash:** Colors front-line OSIDs (depth 0) and 1 hop behind (depth 1) with faction color

### Front Line Gap Analysis (2026-03-18)

| Category | Count | Description |
|----------|-------|-------------|
| Total hostile boundary segments | 2,577 | Polygon edges shared by 2 OSIDs with different controllers |
| Proper shared borders | 459/496 OSID pairs | Both polygons have matching vertex-pair edges |
| Triple junction (1 shared vertex) | 24/496 | Polygons meet at a corner point only |
| No shared geometry (phantom) | 13/496 | Not in contact graph — distance contacts |
| Dead-end chain endpoints | 712 | After exact stitching |
| Dead-end nearest gap (median) | 835m | These are real geographic distances between front sections |
| Dead-end gap < 100m | 4 | Bridgeable via BFS through friendly polygon edges |

## Diagnostic Tools

- **Edges viewer:** `docs/60_visualisations/edges_viewer.html` — serve from project root via HTTP
- **Faction wash toggle:** Immediately reveals polygon artifacts
- **Contact graph toggle:** Shows centroid-to-centroid adjacency network
- **Click any edge:** Shows properties (a, b, side_a, side_b, edge_id)

## Key Files

| File | Purpose |
|------|---------|
| `scripts/derive_operational_settlements.ts` | OSID polygon generation pipeline |
| `src/map/front_edges.ts` | Front edge computation (computeFrontEdgesOsid) |
| `src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.ts` | Game front line renderer |
| `src/ui/map/map/builders/geojsonLookup.ts` | Centroid lookup (enriched with SID aliases) |
| `data/derived/operational/operational_settlements.geojson` | 744 OSID polygons |
| `data/derived/operational/operational_contact_graph.json` | 2,118 adjacency edges |
| `data/derived/operational/canonical_to_operational_map.json` | 5,797 SID→OSID mappings |
