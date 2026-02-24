# Operational Settlement Merger Tool & HoI Map Control Layer Rework

**Date:** 2026-02-22
**Status:** Complete
**Scope:** Interactive settlement merger tool; derive pipeline migration from algorithmic clustering to hand-curated merges; HoI map renderer rewrite (single merged mesh, gap-free control layer).

---

## Overview

This report covers three interconnected bodies of work:

1. **Settlement Merger Tool** — a new standalone Vite page (`settlement_merger.html`) for manually selecting and merging canonical settlements into operational settlements, replacing the automated clustering algorithm.
2. **Derive Pipeline Migration** — rewrote `derive_operational_settlements.ts` to import hand-curated merge groups from the merger tool output, replacing Phases 2–4.6 (algorithmic clustering).
3. **HoI Map Renderer Rework** — replaced per-feature mesh rendering with a single merged mesh using per-vertex colors and a global vertex table, eliminating gaps and overlaps between adjacent settlement polygons.

**Key outcome:** 753 operational settlements (OSIDs) are now the canonical map unit for all simulation, rendering, and political control data. These are derived from 5,823 canonical settlements via 702 hand-curated merge groups + 51 singleton settlements.

---

## 1. Settlement Merger Tool

### Purpose

The automated clustering algorithm (`derive_operational_settlements.ts` Phases 2–4.6) produced inter-polygon gaps and imperfect merges. The merger tool provides a visual interface for hand-curating merge groups with live population/ethnic feedback.

### Architecture

- **2D canvas renderer** with pan/zoom/click/hover, reusing patterns from `MapApp.ts` (drawPolygonPath, pointInPolygon, SpatialIndex)
- **Observable state store** following `HoIMapState.ts` patterns (subscribe/notify/getSnapshot)
- **Standalone Vite page** like `map_hoi.html`, served on port 3002

### New Files (7)

| File | Purpose |
|------|---------|
| `src/ui/map/settlement_merger.html` | HTML page (toolbar + canvas + sidebar + status bar) |
| `src/ui/map/settlement_merger.ts` | Entry point: load data, apply Mostar split, wire modules |
| `src/ui/map/merger/types.ts` | Shared type definitions |
| `src/ui/map/merger/MergerState.ts` | Observable state store (selection, merge groups, filters) |
| `src/ui/map/merger/MergerRenderer.ts` | 2D canvas renderer with pan/zoom/click/hover |
| `src/ui/map/merger/MergerSidebar.ts` | Right sidebar UI (selection panel, merge groups, export) |
| `src/ui/map/merger/MergerExporter.ts` | Export: topological merge via TopoJSON, browser download |

### Modified Files

| File | Change |
|------|---------|
| `src/ui/map/vite.config.ts` | Added `'settlement_merger'` to `rollupOptions.input` |

### Features

- **Municipality filter** — dropdown filters the view to a single municipality
- **Color modes** — toggle between ethnic-key coloring and merge-group coloring (12-color cycling palette)
- **Click-to-select** — click settlements to build a selection; sidebar shows aggregated population, ethnic bar chart, and computed ethnic key
- **Contiguity validation** — warns if selection is not graph-connected in the adjacency graph
- **Cross-municipality warnings** — red dashed outlines and prominent red warnings for groups spanning multiple municipalities
- **Confirm/Undo merge** — create or dissolve merge groups with live visual feedback
- **Click-to-show-group** — clicking any merged settlement's polygon shows its group info in the sidebar
- **Save/Load** — JSON serialization of merge progress for incremental work sessions
- **Export** — generates three pipeline-compatible output files via TopoJSON topology merge

### Mostar Split (Phase 0)

Before merging begins, the tool applies the Mostar split (ported from the derive script):
- Splits canonical Mostar settlement at longitude 17.810
- Creates `Mostar Zapad` (West, Croat-majority) and `Mostar Istok` (East, Bosniak-majority)
- Population split ratios: 20/80 B, 75/25 C, 55/45 S, 55/45 O
- Result: 5,823 canonical → 5,824 features displayed (5,823 + 1 split − 1 original)

---

## 2. Derive Pipeline Migration

### What Changed

Rewrote `scripts/derive_operational_settlements.ts` to replace algorithmic clustering with import of hand-curated merge groups.

**Removed (dead code):**
- `areKeysCompatible()` — ethnic key compatibility check
- `SARAJEVO_MUNICIPALITIES` — special-case Sarajevo set
- `bfsDistance()` — BFS graph traversal
- `findComponents()` — connected component finder
- `clusterComponent()` — the main clustering algorithm
- Phases 2–4.6: initial clustering, merging, small-op absorption, validation

**Added:**
- **Phase 2: Manual Merge Import** — reads `data/source/merge_progress.json`, imports 702 merge groups with their OSIDs and member SIDs
- **Singleton generation** — any canonical SID not in a merge group becomes a singleton operational settlement with auto-generated OSID (`op:<mun>:<slug>`)
- **Cross-municipality validation** — warns if any group spans multiple municipalities (0 found)

**Preserved unchanged:**
- Phase 0: Mostar split
- Phase 1: Municipality grouping
- Phase 5: Topology merge (TopoJSON-based, ensures shared boundary vertices)
- Phase 6: Simplification
- Phase 7: Output generation (GeoJSON, contact graph, canonical→operational map)

### Source Data

| File | Contents |
|------|----------|
| `data/source/merge_progress.json` | 702 merge groups, 5,772 merged SIDs |

### Pipeline Output

The derive script produces the following files, all keyed by **operational settlement ID (OSID)**:

| File | Contents | Count |
|------|----------|-------|
| `data/derived/operational/operational_settlements.geojson` | GeoJSON FeatureCollection with geometry + all properties | 753 features |
| `data/derived/operational/canonical_to_operational_map.json` | `{ canonicalSid: osid }` mapping | 5,823 entries |
| `data/derived/operational/operational_contact_graph.json` | Adjacency graph (nodes + edges) | 753 nodes, 3,259 edges |
| `data/derived/operational/operational_political_control.json` | Initial political control by faction | 753 settlements |
| `data/derived/operational/operational_initial_master.json` | Master init data (controller, status, stability) | 753 settlements |

### Political Control Breakdown

| Faction | Settlements | Percentage |
|---------|-------------|------------|
| RBiH | 372 | 49.4% |
| RS | 266 | 35.3% |
| HRHB | 115 | 15.3% |
| **Total** | **753** | **100%** |

### OSID Format

Operational settlement IDs follow the format: `op:<mun1990_id>:<slugified_name>`

Examples:
- `op:banovici:banovici` — Banovici (merged from S100013, S100056, S100137)
- `op:mostar:mostar_zapad` — Mostar West (from Mostar split)
- `op:sarajevo_stari_grad:stari_grad` — Stari Grad, Sarajevo

### Feature Properties (per operational settlement)

| Property | Type | Description |
|----------|------|-------------|
| `osid` | string | Operational settlement ID |
| `sid` | string | Seed canonical SID (largest member) |
| `mun1990_id` | string | Municipality ID (1990 boundaries) |
| `mun1990_name` | string | Municipality display name |
| `settlement_name` | string | Display name (with merge count suffix) |
| `constituent_sids` | string[] | All canonical SIDs merged into this op |
| `population_total` | number | Aggregated total population |
| `population_bosniaks` | number | Bosniak population |
| `population_croats` | number | Croat population |
| `population_serbs` | number | Serb population |
| `population_others` | number | Other population |
| `ethnic_key` | string | Ethnic majority code (B/S/C/Bm/Sm/Cm/X) |

---

## 3. HoI Map Renderer Rework

### Problem

The HoI-style 2.5D WebGL map (`HoIMapRenderer.ts`) rendered each settlement as an independent `THREE.Mesh`. Each mesh had its own vertex buffer built via independent Earcut triangulation + barycentric subdivision. This caused:

1. **Gaps between adjacent settlements** — Earcut does not guarantee consistent edge decomposition across adjacent polygons. Subdivision generates different intermediate vertices along shared edges, creating micro-gaps visible at certain zoom levels.
2. **753 draw calls** — one mesh per settlement, poor GPU batching.
3. **Selection border mismatch** — the selection highlight (line segments from raw ring vertices) didn't align with the control fill (subdivided triangles draped on heightmap).

### Root Cause Analysis

The operational settlements GeoJSON has 16,576 unique vertices, of which **82.3% (13,643) are shared by 2+ features** — the TopoJSON merge did its job perfectly. The shared vertices are bitwise-identical in the GeoJSON. However, during rendering:

- Each polygon's `ptMap` was local (per-feature), so shared boundary vertices were processed independently
- Earcut triangulation of adjacent polygons could split shared edges at different internal vertices
- Barycentric subdivision then generated different intermediate points along the same shared boundary
- After heightmap sampling (nonlinear bilinear interpolation), the triangulated surfaces traced different paths through 3D space

### Solution: Single Merged Mesh with Per-Vertex Colors

Replaced the per-feature mesh system with a **single `BufferGeometry`** containing all 753 settlements:

1. **Global vertex table** — keyed by `lon.toFixed(7),lat.toFixed(7):colorHex`. Shared boundary vertices between same-color settlements map to the **exact same vertex buffer index**, guaranteeing zero gaps.

2. **Per-vertex colors** — `THREE.MeshBasicMaterial({ vertexColors: true })`. The color tag in the vertex key ensures that two adjacent settlements with *different* faction colors get separate vertex entries (correct rendering) while same-color neighbors share vertices (gap-free).

3. **Triangle-to-feature mapping** — `featureByTriIndex[]` array maps each triangle face index to its GeoJSON feature, replacing the old `featureByMesh` Map. Raycast hit-testing uses `intersection.faceIndex` to look up the feature.

4. **Border lines removed** — the old `buildBorderLines()` drew per-settlement dark outlines using a different subdivision (linear, 3 parts per edge) than the control fill (Earcut + barycentric). Since TopoJSON merge already produces gap-free shared boundaries, per-settlement outlines were unnecessary and caused visual misalignment. Removed entirely.

5. **Selection border from control mesh** — the old `buildSelectionBorder()` used raw ring vertices from `getRings()`, which traced a different path than the Earcut-triangulated control fill. Replaced with boundary edge extraction: for the selected feature, collect all triangles from `featureByTriIndex`, count edge occurrences, and emit edges that appear exactly once (silhouette edges). Uses the exact same vertex positions from the control mesh → pixel-perfect alignment. A tiny Y bump (0.005) lifts the gold lines above the fill.

6. **Performance** — 1 draw call instead of 753. Single mesh with indexed geometry is much more GPU-friendly.

### Additional Changes

| Change | Details |
|--------|---------|
| **Tilt** | `TILT_DEG = 35` (const) → `DEFAULT_TILT_DEG = 20` (const) + `this.tilt` (mutable instance variable). Camera uses `this.tilt` instead of constant. Home key resets tilt. |
| **Zoom** | `DEFAULT_ZOOM` reverted from 3.2 to 4.5 |
| **Cleanup** | Removed duplicate constants `WORLD_SCALE`, `VERT_EXAG`, `BIH_CENTER_LON`, `BIH_CENTER_LAT` (already defined in `TerrainMeshBuilder.ts`). Removed `buildBorderLines()` method, `borderLines` field, `addGlobalVertex()` static method. |
| **`openRing()`** | Extracted from inline closure to module-level function for reuse |
| **Selection data** | Added `controlIndices` and `controlPositions` instance fields to store mesh triangle data for selection border extraction |

### Files Modified

| File | Change |
|------|---------|
| `src/ui/map/renderer/HoIMapRenderer.ts` | Full rewrite of `buildControlLayer()`, `buildSelectionBorder()`, `handleSettlementClick()`, hover raycasting. Removed `buildBorderLines()`. New: `GlobalVertexTable`, `featureByTriIndex`, `controlIndices`, `controlPositions`, `featureFromIntersection()`. |

---

## Verification

1. `npx tsc --noEmit` — passes clean, no type errors
2. Settlement merger tool: `npm run dev:map` → `http://localhost:3002/settlement_merger.html`
3. HoI map: `npm run dev:map` → `http://localhost:3002/map_hoi.html`
4. Derive script: `npx tsx scripts/derive_operational_settlements.ts` → 753 operational settlements
5. Political control: 372 RBiH + 266 RS + 115 HRHB = 753 total
6. No cross-municipality merge groups (0 found in validation)
7. All 5,823 canonical SIDs accounted for (702 groups × avg ~8.2 members + 51 singletons)

---

## Summary: OSID as the New Map Unit

**Operational Settlement IDs (OSIDs) are now the basis of all map rendering, political control, and simulation data.**

| Aspect | Old (Algorithmic) | New (Hand-Curated) |
|--------|-------------------|-------------------|
| Clustering method | Automated BFS + ethnic compatibility | Hand-curated in visual merger tool |
| Source | Algorithm parameters | `data/source/merge_progress.json` |
| Quality | Inter-polygon gaps, imperfect merges | Visual verification, TopoJSON-merged boundaries |
| Count | ~750 (variable) | **753** (fixed) |
| Rendering | 753 independent meshes | 1 merged mesh, per-vertex colors |
| Gap-free | No (subdivision inconsistencies) | Yes (global vertex table) |

**All downstream systems should use OSID as the settlement identifier.** The canonical SID layer (5,823 settlements) is preserved via `canonical_to_operational_map.json` for any system that needs to map back to the original granularity.
