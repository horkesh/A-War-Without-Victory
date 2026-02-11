# Map: River Clipping & Layer Alignment — External Expert Handover

**Date:** 2026-02-07  
**Status:** Open — both issues unresolved  
**Audience:** External expert advisor (map/geometry, GIS, or spatial data)

---

## Executive Summary

Two map issues require expert resolution:

1. **River clipping:** Rivers (and optionally roads) still draw outside the Bosnia and Herzegovina (BiH) national boundary. They must be clipped to the BiH border.
2. **Layer misalignment:** The tactical map layers (base map vs control zones vs settlement polygons) do not align visually. Different datasets use different coordinate spaces.

---

## Issue 1: River Clipping

### Requirement
- Rivers and roads must not render outside the BiH national boundary.
- Areas outside the border should be pure white.
- Preferred approach: clip geometry at **derivation time** (in the data pipeline), not at render time.

### Current Implementation
- **Derivation script:** `scripts/map/phase_A1_derive_base_map.ts`
- **Boundary source:** `data/source/boundaries/bih_adm0.geojson` (WGS84 GeoJSON)
- **River/road source:** OSM data in WGS84, projected via Thin Plate Spline (TPS) to project SVG space
- The script loads `bih_adm0.geojson`, projects it via TPS, and attempts to clip rivers/roads using `clipLineToPolygon()` (turf.js `lineSplit` + `booleanPointInPolygon`).
- **Observed:** Rivers still appear outside BiH. The clipping logic may be faulty, or the boundary/line coordinate spaces may not match correctly.

### Output
- `data/derived/A1_BASE_MAP.geojson` — contains roads, rivers, settlements, boundary, control regions.

### Commands to Run
```powershell
# Regenerate base map after edits
npm run map:a1:derive

# Stage for warroom (copy to public assets)
# Manual: copy data/derived/A1_BASE_MAP.geojson → src/ui/warroom/public/data/derived/
```

---

## Issue 2: Layer Misalignment

### Requirement
- Base map (rivers, roads), control zones (faction polygons), and settlement polygons must render in the same coordinate space and align visually.

### Current Coordinate Spaces (as understood)
| Dataset | File | Coordinate Space | Notes |
|---------|------|------------------|-------|
| Roads, rivers, boundary | A1_BASE_MAP.geojson | TPS-projected from OSM (via world_to_svg_transform) | From `scripts/map/phase_A1_derive_base_map.ts` |
| Settlements (polygons) | settlements_viewer_v1.geojson | SVG_PIXELS_LEGACY | Passed through unchanged; not TPS-projected |
| Control zones | control_zones_A1.geojson | Derived from settlements_viewer_v1 centroids | Same space as settlements |
| Municipality control | A1_BASE_MAP.geojson (control_region role) | Assumed SVG space | From bih_municipalities.geojson |

### Root Cause Hypothesis
- Roads/rivers: projected from WGS84 via TPS.
- Settlements: pre-projected SVG substrate; no TPS applied in phase_A1.
- Control zones: concave hulls of settlement centroids from settlements_viewer_v1.
- If TPS output does not match SVG_PIXELS_LEGACY, layers will misalign.

### Critical Constraint
- **Do not merge bounds** from different coordinate spaces at render time. This has caused white screen and corrupted map. Fix in data/derivation, not in UI.

### Warroom Integration
- Tactical map: `src/ui/warroom/components/TacticalMap.ts`
- Loads: `A1_BASE_MAP.geojson`, `control_zones_A1.geojson`, `settlements_viewer_v1.geojson`
- Bounds computed from polygons; expanded from base features (risk: mixing spaces).

---

## Relevant Paths

| Purpose | Path |
|---------|------|
| Derivation script | `scripts/map/phase_A1_derive_base_map.ts` |
| Control zones script | `scripts/map/derive_control_zones_a1.ts` |
| TPS transform | `data/derived/georef/world_to_svg_transform.json` |
| BiH boundary | `data/source/boundaries/bih_adm0.geojson` |
| OSM roads | `data/derived/terrain/osm_roads_snapshot_h6_2.geojson` |
| OSM waterways | `data/derived/terrain/osm_waterways_snapshot_h6_2.geojson` |
| Settlements substrate | `data/derived/settlements_substrate.geojson` |
| Settlements viewer | `data/derived/settlements_viewer_v1.geojson` |
| A1 output | `data/derived/A1_BASE_MAP.geojson` |
| Control zones output | `data/derived/control_zones_A1.geojson` |
| Canonical reference | `docs/20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md` |
| Constraints & patterns | `.agent/napkin.md` (read at session start) |

---

## Constraints & Preferences (Must Follow)

From `.agent/napkin.md` (and context):

1. **Coordinate space:** Do not guess East/North mapping; verify bounds. Do not merge bounds from different coordinate systems.
2. **Clipping:** Prefer derivation-time clip over render-time. BiH boundary: `data/source/boundaries/bih_adm0.geojson`.
3. **Render-time clip:** Only when boundary and base layers share the same coordinate space. Otherwise clip at derivation.
4. **Determinism:** All outputs must be deterministic (stable sort, no timestamps, no random seeds).
5. **North-up:** Mandatory orientation.
6. **Labels:** Render labels outside the boundary clip to avoid cutoff.

---

## Viewing the Map

- Do not open via `file://`. Run:
  ```powershell
  npx http-server -p 8080
  ```
  Then open:
  - `http://localhost:8080/data/derived/A1_viewer.html` — standalone A1 map
  - Warroom: run warroom dev server and open tactical map view

---

## Suggested Approach for Expert

1. **Verify coordinate spaces:** Inspect raw bounds of A1 roads/rivers vs settlements vs control zones. Document which space each uses and whether they match.
2. **Fix river clipping:** Debug `clipLineToPolygon` in phase_A1; ensure boundary polygon and line geometry are in the same projected space before turf operations. Consider alternative: `turf.lineClip` or manual line-polygon intersection.
3. **Resolve alignment:** Either (a) reproject all layers to a single canonical space, or (b) apply a documented transform so control zones and settlements match the TPS-projected base. Do not mix bounds at render time.
4. **Update docs:** If derivation logic changes, update `docs/20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md` and add a PROJECT_LEDGER entry.

---

## Contact & Repo

Project: AWWV (tactical wargame). Repo: local workspace. This handover is self-contained; the expert can work from the paths and constraints above.
