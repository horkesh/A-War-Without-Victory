# Paradox Convene: Tactical Map Canonical — Deprecate Unused Map Assets

**Date:** 2026-02-08  
**Convened by:** Orchestrator  
**Goal:** Treat the tactical map pipeline as canonical; deprecate and move leftover/unused files (especially large GeoJSONs) without breaking the tactical map or any declared dependencies.

---

## 1. Big-Picture Summary

- **Canonical map consumer:** The **Tactical Map** in `src/ui/map/` is declared canonical. Whatever it uses for its pipeline is canonical (per user and napkin).
- **Single priority:** Safely deprecate and relocate unused/duplicate map assets while guaranteeing no loss of tactical map dependencies.
- **Roles involved:** Technical Architect (architecture, entrypoints, REPO_MAP), Map-Geometry-Integrity-Reviewer (map data, GeoJSON integrity), Orchestrator (direction, handoff). Asset-integration may be invoked if we touch staging or warroom public copies.

---

## 2. Tactical Map Canonical Dependency Matrix

The tactical map loads data from **project root** `data/derived/` via the Vite plugin in `src/ui/map/vite.config.ts`. All paths are relative to project root.

### 2.1 Required (must not remove or break)

| File | Path | Produced by | Notes |
|------|------|-------------|-------|
| settlements_a1_viewer.geojson | data/derived/ | map:derive:settlements-a1-viewer | ~2.4 MB; 5,823 settlement polygons; required by DataLoader |
| political_control_data.json | data/derived/ | map:viewer:political-control-data (build_political_control_data.ts) | Required; by_settlement_id, control_status |

### 2.2 Optional (tactical map works without; enhance UX)

| File | Path | Produced by | Notes |
|------|------|-------------|-------|
| A1_BASE_MAP.geojson | data/derived/ | map:a1:derive (phase_A1_derive_base_map.ts) | ~17 MB; roads, rivers, boundary, control regions |
| settlement_edges.json | data/derived/ | map:derive:graph:wgs84 | Front lines; shared border computation |
| settlement_names.json | data/derived/ | phase_h6_10_0_build_settlement_names_from_census | Search/labels |
| mun1990_names.json | data/derived/ | build_political_control_data.ts (H3.10), build_mun1990_names_dataset_h3_7 | Municipality display names |
| settlement_ethnicity_data.json | data/derived/ | map:build:ethnicity (build_settlement_ethnicity_data) | Ethnicity panel |

### 2.3 On-demand (loaded when user selects dataset)

| File | Path | Produced by | Notes |
|------|------|-------------|-------|
| political_control_data_sep1992.json | data/derived/ | map:viewer:political-control-data --control-key=sep1992 | September 1992 control layer |

### 2.4 Canonical map build chain (produces the above)

From MAP_BUILD_SYSTEM.md and package.json, the **canonical build** is:

- `npm run map:build:new` → `map:build:wgs84` (full) or `map:build:wgs84:from-geometry` (when settlements_wgs84_1990 exists).
- Pipeline: map:derive:settlements:wgs84 → map:build:census-rolled-up-wgs84 → map:derive:graph:wgs84 → map:build:settlements-initial-master:wgs84 → map:viewer:political-control-data:wgs84 → map:build:settlement-attributes:wgs84 → **map:a1:derive** → **map:derive:settlements-a1-viewer** → map:derive:mun1990-boundaries:a1 → map:viewer:map:build.
- **control_zones_A1.geojson** is produced by `map:control-zones:a1` (derive_control_zones_a1.ts), which currently reads **settlements_viewer_v1.geojson**. That script can be switched to read **settlements_a1_viewer.geojson** (same feature schema: sid, municipality_id, geometry) so the pipeline does not depend on the legacy viewer_v1 product.

**Conclusion:** No file in §2.1–2.3 may be removed from `data/derived/` for the tactical map. The tactical map does **not** reference `settlements_viewer_v1.geojson`; it only uses `settlements_a1_viewer.geojson`.

---

## 3. Other Consumers (do not break)

- **Warroom (WarPlanningMap.ts):** Uses same set: settlements_a1_viewer, political_control_data, settlement_edges, settlement_names, mun1990_names, settlement_ethnicity_data (and political_control_data_sep1992). Served from warroom public or project root depending on dev setup.
- **Warroom (TacticalMap.ts component):** Loads settlement_edges, A1_BASE_MAP, control_zones_A1, and **settlements_viewer_v1**. The warroom staging script copies `settlements_a1_viewer.geojson` → `settlements_viewer_v1.geojson` for backward compatibility. So warroom can be updated to use **settlements_a1_viewer** only and drop the viewer_v1 alias in code and staging.
- **Warroom (ClickableRegionManager):** settlement_edges.json.
- **Sim / scenario:** settlement_edges.json (data_prereq_registry), settlements_index.json; political_control_data and settlements_initial_master for control init.
- **Map build scripts:** Various scripts read political_control_data, settlement_edges, settlement_names, mun1990_names, settlement_ethnicity_data, A1_BASE_MAP, settlements_a1_viewer (and some legacy settlements_viewer_v1). See §4 for scripts that should be switched to settlements_a1_viewer.

---

## 4. Deprecation and Move Plan

### 4.1 Canonical pipeline alignment (no file moves)

- **derive_control_zones_a1.ts:** Change input from `settlements_viewer_v1.geojson` to `settlements_a1_viewer.geojson` (same centroid/SID logic). Then control_zones_A1 is fully fed by the canonical A1 pipeline; no dependency on viewer_v1.
- **Warroom:** In `TacticalMap.ts` and any other warroom code, replace references to `settlements_viewer_v1.geojson` with `settlements_a1_viewer.geojson`. In `warroom_stage_assets.ts`, remove the copy that writes settlements_viewer_v1.geojson (keep only settlements_a1_viewer.geojson). Update docs that mention "settlements_viewer_v1" for the warroom to say "settlements_a1_viewer (canonical)" where appropriate.
- **build_substrate_viewer_index.ts / data_index.json:** Can keep optional settlements_viewer_v1 dataset for legacy tooling that still expects it, or mark it deprecated and prefer settlements_a1_viewer; if nothing uses it, the dataset entry can be deprecated in docs only and removed later.

### 4.2 Leftover / duplicate assets to deprecate or move

- **data/_deprecated/** already exists. Use it for:
  - **Legacy viewer geometry:** `settlements_viewer_v1.geojson` (and .gz) — not produced by canonical map:build:wgs84; produced only by map:derive:settlements-viewer:v1 (legacy). If any script still writes to data/derived/settlements_viewer_v1.geojson, move that output to data/_deprecated/derived/legacy_substrate/ and update the script, or stop producing it and document that tactical map + warroom use settlements_a1_viewer only.
  - **Other large GeoJSONs** in data/derived/ that are **not** in the tactical map list (§2): e.g. control_zones_A1 is used by warroom TacticalMap; keep in data/derived. Anything that is not read by src/ui/map, warroom, sim, or map build scripts can be audited for move to _deprecated (e.g. municipality_outlines.geojson, polygon_fabric.geojson, etc. — see glob list below). This requires a file-by-file audit against the dependency matrix.
- **Warroom public copies:** `src/ui/warroom/public/data/derived/` holds copies of A1_BASE_MAP, settlements_a1_viewer, settlements_viewer_v1, control_zones_A1, political_control_data*, settlement_edges, settlement_ethnicity_data, settlement_names, mun1990_names. These are for warroom dev server when it does not proxy /data to project root. **Do not delete** until warroom is confirmed to serve /data from project root (or we keep staging for dev). Deprecation here = “prefer single source in data/derived/ at project root; staging is a copy for warroom build/dev only.”

### 4.3 Large GeoJSONs inventory (for audit)

From repo glob, candidates for deprecation/move (must verify no tactical map or pipeline dependency):

- data/derived: municipalities_1990_boundaries.geojson, control_zones_A1.geojson (keep — warroom), settlements_wgs84_1990.geojson (keep — pipeline input for from-geometry), municipalities_*_viewer*.geojson, municipality_borders*.geojson, municipality_outline*.geojson, polygon_fabric*.geojson, settlement_points*.geojson, settlement_polygons*.geojson, national_outline.geojson, mun_code_outline.geojson, terrain/*.geojson, georef/*.geojson.
- data/source: boundaries and geo — keep; source is authoritative.
- data/_deprecated: already deprecated.
- tools/map_viewer*, tools/map_viewer_simple: legacy viewers; can stay or be marked deprecated in docs.
- dev_ui: references settlements_viewer_v1; update to settlements_a1_viewer or mark dev_ui as legacy.

**Rule:** Before moving any file, grep for its path and filename in code and scripts; if any consumer exists, either keep in place or update the consumer and then move.

---

## 5. Role Inputs and Handoffs

### Technical Architect

- **Question:** Do PIPELINE_ENTRYPOINTS.md and REPO_MAP.md need updates so that “canonical map data” is explicitly defined as “whatever the Tactical Map loads from data/derived/” and all other map assets are either optional or deprecated?
- **Recommendation:** Update PIPELINE_ENTRYPOINTS.md § “Tactical Map System” to state that the **canonical map data set** is the exact list in TACTICAL_MAP_SYSTEM.md §5 (required + optional + on-demand). Update MAP_BUILD_SYSTEM.md to state that map:build:wgs84 produces the canonical viewer artifact **settlements_a1_viewer.geojson** and that settlements_viewer_v1 is legacy/deprecated. REPO_MAP already points to TACTICAL_MAP_SYSTEM; no change required unless we add a “Canonical map data” bullet.

### Map-Geometry-Integrity-Reviewer

- **Question:** For any GeoJSON we move to _deprecated or delete from derived: ensure no geometry contract (ordering, CRS, feature schema) is relied on by the tactical map or the map build scripts we keep. Confirm that switching derive_control_zones_a1 to settlements_a1_viewer preserves deterministic output (same centroid/extent logic).
- **Recommendation:** Validate derive_control_zones_a1 with settlements_a1_viewer input (and optionally compare control_zones_A1.geojson output to current if both inputs exist). Enforce stable ordering in any script that writes artifacts consumed by the tactical map.

### Orchestrator decision

- **Single priority:** Implement §4.1 (pipeline alignment: control_zones script + warroom use settlements_a1_viewer; drop viewer_v1 from staging/code where it’s redundant), then document §4.2/4.3 in a short “Map asset deprecation” note in MAP_BUILD_SYSTEM or a new docs/20_engineering/ map-asset policy. File-by-file move of leftover GeoJSONs to _deprecated is a **follow-up task** (hand off to PM or Technical Architect for sequencing) so we don’t scatter work.
- **Handoff:** Orchestrator → **Technical Architect** (and/or **gameplay-programmer** / **build-engineer** as implementors): (1) Update derive_control_zones_a1.ts to read settlements_a1_viewer; (2) Update warroom TacticalMap.ts and warroom_stage_assets.ts to use only settlements_a1_viewer and remove settlements_viewer_v1 copy; (3) Update PIPELINE_ENTRYPOINTS and MAP_BUILD_SYSTEM as above. **Map-Geometry-Integrity-Reviewer:** Validate control_zones derivation and ordering. **Orchestrator** will add a ledger entry and napkin note for tactical-map canonical and deprecation plan.

---

## 6. Summary

| Item | Action |
|------|--------|
| Tactical map canonical | Yes; its data list in TACTICAL_MAP_SYSTEM.md §5 is the canonical set. |
| Required data | data/derived: settlements_a1_viewer.geojson, political_control_data.json. |
| Optional/on-demand | A1_BASE_MAP, settlement_edges, settlement_names, mun1990_names, settlement_ethnicity_data, political_control_data_sep1992. |
| settlements_viewer_v1 | Deprecate: use settlements_a1_viewer everywhere; update derive_control_zones_a1 + warroom + staging. |
| Leftover large GeoJSONs | Audit against dependency matrix; move to data/_deprecated only when no consumer remains; follow-up task. |
| Warroom public copies | Keep as staging copy until/unless warroom serves /data from project root; document as copy of canonical. |

No tactical map dependency will be lost; deprecation is additive (alias removal and optional file moves) with explicit consumer checks before any move.

---

## Executed (2026-02-08)

- **§4.1** — Done previously: derive_control_zones_a1 reads settlements_a1_viewer; warroom TacticalMap and staging use settlements_a1_viewer only.
- **§4.2** — **Removed:** `src/ui/warroom/public/data/derived/settlements_viewer_v1.geojson` (redundant copy, ~2.4 MB). Warroom dev now relies on `settlements_a1_viewer.geojson` in that folder (staged from project root).
- **Other data/derived GeoJSONs** — Audit confirmed they are still consumed by `tools/map/` or `scripts/map/` (e.g. polygon_fabric, municipality_outlines, municipality_borders, municipalities_1990_boundaries). Not moved; moving would require deprecating or updating those tools first. Policy documented in MAP_BUILD_SYSTEM.md § "Map asset deprecation policy".
