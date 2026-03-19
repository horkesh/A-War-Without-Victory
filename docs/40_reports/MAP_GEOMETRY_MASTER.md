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
        ↓   Phase 5d: Vertex snapping — snap near-miss boundary vertices between clusters
        ↓   Phase 6: normalizeGeometry() — close rings, remove tiny holes, fix winding
        ↓
data/derived/operational/operational_settlements.geojson  (744 OSID polygons)
data/derived/operational/operational_contact_graph.json   (2,118 adjacency edges)
```

## Known Issues

### 1. TopoJSON merge does not create shared arcs between clusters — PARTIALLY FIXED

**Status:** PARTIALLY FIXED 2026-03-19 (vertex snapping + renderer bridging)

**Root cause:** `topojsonClient.merge()` dissolves internal boundaries within a cluster but does NOT rebuild shared arcs between the resulting cluster polygons. After merge, adjacent clusters have different intermediate vertices along their shared boundary (~50-100m apart).

**Two-layer fix applied:**

**Layer 1 — Data pipeline (Phase 5d vertex snapping):** Snap near-miss boundary vertices between adjacent OSID clusters to their midpoint. Creates shared polygon edges without altering polygon shapes. Results: 126 vertices snapped across 40 OSID pairs, +536 shared edges (12,038→12,574), Sarajevo east edge fixed (0→5 shared edges). Zero calibration regression.

**Layer 2 — Game renderer (BFS gap bridging):** After stitching front segments via exact endpoint matching, BFS-bridge remaining dead ends through friendly polygon edges (max 3 hops). Results: 359 chains → 28 chains (331 bridges). Front line is now continuous.

**IMPORTANT: Topology rebuild approach FAILED.** Rebuilding topology via `topojson.topology()` from merged polygons quantizes coordinates, regressing calibration from 91% to 87%. Even at 1e8 quantization. TopoJSON is a serialization format, not a geometry repair tool.

**IMPORTANT: Data pipeline coupling.** Regenerating `operational_settlements.geojson` via `derive_operational_settlements.ts` also regenerates the contact graph with different `min_dist` values, which changes front edge computation and cascades through combat. Never regenerate the contact graph without recalibrating.

**Remaining:** ~19 chain dead-end pairs that can't be bridged within 3 hops. These are genuine front discontinuities (e.g., enclaves) or vertices where all edges are hostile.

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

### Game (buildCorpsFrontLinesGeoJSON.ts) — UPDATED 2026-03-19
Three-step algorithm (same as edges viewer):
1. **Edge walk:** Every polygon vertex pair → hash → track which 2 OSIDs share each segment → hostile if different controllers
2. **Stitch:** Flatten ALL segments across sector groups, chain via exact endpoint matching into continuous polylines
3. **BFS bridge:** Connect dead-end chain endpoints through ALL non-hostile polygon edges (including exterior), max 3 hops. Merges chains in-place.

**Critical detail:** `friendlyAdj` must include ALL non-hostile edges, not just edges shared by 2 OSIDs. Exterior polygon edges (shared by 1 OSID) are essential for boundary walks at triple junctions. Previous bug: `osids.size !== 2` filter excluded exterior edges → only 2 bridges instead of 345.

**Result:** 359 chains → 28 after 331 BFS bridges. Largest chain: 832 vertices.

### Edges Viewer (docs/60_visualisations/edges_viewer.html)
Same three-step algorithm as game renderer, plus:
- **Fragment filter:** Removes chains with < 4 vertices (isolated short segments)
- **Faction wash:** Colors front-line OSIDs (depth 0) and 1 hop behind (depth 1) with faction color
- **Political control fill:** Toggle to show faction territory

### Front Line Gap Analysis (2026-03-19, after vertex snapping)

| Category | Count | Description |
|----------|-------|-------------|
| Total hostile boundary segments | 2,704 | Polygon edges shared by 2 OSIDs with different controllers |
| Shared polygon edges | 12,574 | After vertex snapping (was 12,038) |
| Chains after exact stitch | 359 | Greedy endpoint matching |
| Chains after BFS bridge | 28 | BFS through friendly edges, max 3 hops |
| BFS bridges found | 331 | Dead-end pairs connected through friendly polygon edges |
| Remaining dead ends | ~38 | Genuine discontinuities (enclaves, all-hostile vertices) |

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
