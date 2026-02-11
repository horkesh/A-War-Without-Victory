# Repo cleanup 2026 — Phase 0 Discover

**Date:** 2026-02-10  
**Plan:** Repo cleanup and deprecation (tactical viewer canonical; move only, no delete).

## 1. Size audit (top-level directories)

| Directory | Size (MB) | Notes |
|-----------|-----------|-------|
| data | 3807.74 | By far largest; target for deprecation moves |
| src | 341.25 | Core code; do not move |
| runs | 208.15 | Tracked; candidate for gitignore or archive |
| node_modules | 190.78 | Gitignored; contributes to working tree only |
| tools | 140.52 | Map tooling references many derived GeoJSONs |
| docs | 70.02 | docs/knowledge/maps already removed |
| assets | 67.22 | — |
| dist | 34.15 | — |
| .tmp_phase0_full_progression | 5.66 | Tracked; candidate for gitignore |
| .tmp_op_seed_run | 3.18 | — |
| runs_ops_compare | 3.06 | — |
| runs_probe | 3.06 | — |
| scripts | 1.79 | — |
| tests | 0.86 | — |
| (other .tmp_* and small dirs) | &lt; 1 each | — |

**Total from sampled:** ~4.9 GB in top dirs; data/ dominates (~3.8 GB).

## 2. Dependency matrix — data/derived GeoJSONs

### 2.1 Keep in place (canonical pipeline + build)

| File | Consumer(s) |
|------|-------------|
| settlements_a1_viewer.geojson | src/ui/map/DataLoader, WarPlanningMap, TacticalMap, map_viewer_app |
| political_control_data.json | (same + build_political_control_data) |
| A1_BASE_MAP.geojson | DataLoader, TacticalMap, phase_A1_derive_base_map |
| control_zones_A1.geojson | TacticalMap (warroom) |
| settlements_wgs84_1990.geojson | map build chain, derive_settlement_graph_v3_robust, build_census_rolled_up, etc. |
| municipalities_1990_boundaries.geojson | derive_mun1990_boundaries_a1, build_map_viewer, build_substrate_viewer_index, smoke_map_viewer_h5 |
| settlement_edges.json | (not GeoJSON; keep) |
| terrain/contours_A1.geojson | derive_contours.ts (output); optional for A1 |
| terrain/osm_roads_snapshot_h6_2.geojson | phase_A1_derive_base_map, phase_h6_2_snapshot, phase_h6_8, validate_map_contracts |
| terrain/osm_waterways_snapshot_h6_2.geojson | same |
| georef/* (except georef_debug_points) | A1/map build |

### 2.2 Tier 1 — No code references (safe to move)

| File | Notes |
|------|-------|
| georef/georef_debug_points.geojson | Only **written** by phase_h6_0_build_svg_to_world_georef.ts; no reader in src/scripts/tools. Safe to move to _deprecated. |

### 2.3 Tier 2 — Referenced by tools/map or scripts/map (move only after tool/script change)

| File | Consumer(s) |
|------|-------------|
| adm3_a1_viewer.geojson | tools/control_painter/painter.js; scripts/map/derive_modern_borders_a1.ts (writes) |
| municipality_outline.geojson | tools/map: derive_municipality_outlines, build_municipality_viewer_html, settlement_points, check_map, build_map, build_inspector_html, build_map_pipeline |
| mun_code_outline.geojson | same + build_map_pipeline |
| national_outline.geojson | same |
| municipality_outlines.geojson | tools/map_viewer/viewer.js, prep.js |
| municipality_outlines_from_html.geojson | tools/map: serve_svg_muni_viewer, serve_fit_viewer, clean_muni_outlines_by_fabric, extract_muni_outlines_from_html |
| municipality_outlines_from_settlement_fabric.geojson | tools/map: derive_municipality_outlines_from_fabric |
| polygon_fabric.geojson | tools/map: many (derive_municipality_outlines, derive_municipality_outlines_from_fabric, svgpath_to_geojson, check_map, build_inspector_html, etc.) |
| polygon_fabric_with_mid.geojson | tools/map: mun_code_crosswalk, derive_municipality_outlines, build_inspector_html, etc. |
| municipality_borders.geojson | tools/map: audit_settlement_muni_alignment, extract_municipality_borders_from_drzava, build_municipality_borders_viewer_html, diagnose_border_ids, check_map, audit_municipality_coverage |
| municipality_borders_from_drzava.geojson | tools/map: extract_municipality_borders_from_drzava, build_municipality_reconstructed_viewer_html |
| municipality_borders_from_settlements.geojson | tools/map: serve_simple_map_viewer, derive_municipality_borders_from_settlements, check_and_derive_muni_borders |
| municipality_borders_reconstructed.geojson | tools/map: reconstruct_municipalities_from_legacy, build_municipality_reconstructed_viewer_html |
| settlement_points.geojson | tools/map: rekey_geometry, build_map (writes), generate_geometry_report |
| settlement_points_rekeyed.geojson | tools/map: rekey_geometry, generate_geometry_report |
| settlement_points_from_excel.geojson | tools/map: settlement_points (writes), check_map, build_inspector_html |
| settlement_polygons.geojson | tools/map: rekey_geometry, build_map (writes), generate_geometry_report |
| settlement_polygons_rekeyed.geojson | tools/map: rekey_geometry, generate_geometry_report |
| municipalities_viewer_v1.geojson | scripts/map: build_substrate_viewer_index, validate_map_contracts; data_index.json |
| municipalities_mun1990_viewer_v1.geojson | scripts/map: validate_map_contracts, derive_municipalities_viewer_geometry_v1_h4_2 |

## 3. Conclusion

- **Tier 1:** Only `georef/georef_debug_points.geojson` has no readers; safe to move to `data/_deprecated/derived/earlier_geojsons_2026/`.
- **Tier 2:** All other candidate GeoJSONs are still consumed by `tools/map/` or `scripts/map/`. Moving them would require either deprecating those tools or switching them to canonical artifacts first (Phase 5).
- **Runs / .tmp (Phase 4 implemented):** `.gitignore` now includes `runs/`, `.tmp_*/`, `runs_ops_compare/`, `runs_probe/` so new run outputs and temp dirs are not tracked. Keep run artifacts locally or in CI; baseline regression can use a dedicated run artifact or last-N policy. Already-tracked run dirs remain in the index until removed with `git rm -r --cached runs/` if desired.

## 4. Phase 5 (Tier 2) — Deferred

Tier 2 artifacts (polygon_fabric, municipality_outlines, municipality_borders, settlement_points/polygons, municipalities_viewer_v1, adm3_a1_viewer, etc.) are still consumed by `tools/map/` and `scripts/map/`. Moving them requires either deprecating those tools or switching them to canonical A1/viewer artifacts first. No Tier 2 moves in this implementation; see dependency matrix (§2.3) for handoff to Technical Architect when sequencing follow-up work.
