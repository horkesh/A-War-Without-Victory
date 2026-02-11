# Map Build System — Operational entrypoints

## Canonical geometry (WGS84)

- **Settlement polygons:** `data/derived/settlements_wgs84_1990.geojson` — 6002 settlements, WGS84, Voronoi-tessellated inside 1990 municipalities. Produced by `npm run map:derive:settlements:wgs84`. Merge report: `data/derived/settlements_wgs84_1990_report.json` (lists `merged_settlements` for census rollup).
- **Municipality boundaries (1990):** `data/source/boundaries/bih_adm3_1990.geojson` — 110 opštine, WGS84.

All new map pipeline work (graph, political control, enrichment, A1) builds on these. **Canonical map build:** `npm run map:build:new` (runs `map:build:wgs84`): WGS84 settlements → census rollup → graph → settlements_initial_master → political_control_data → settlement_attributes (enriched) → A1 derive. Legacy substrate and v1/v2/v3 graph artifacts are in `data/_deprecated/derived/legacy_substrate/`; georef remains in `data/derived/georef/` for A1 TPS projection.

## A1 Tactical Base Map (STABLE — basis for game)

The **Phase A1 tactical base map** is the canonical geographical substrate for the warroom and tactical modules.

- **Canonical reference:** [docs/20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md](specs/map/A1_BASE_MAP_REFERENCE.md)
- **Data product:** `data/derived/A1_BASE_MAP.geojson` (~25,000 features: borders, MSRs, secondary roads, hydrography, settlements with 1991 ethnicity/control)
- **Interactive viewer:** `data/derived/A1_viewer.html` — serve via `npx http-server -p 8080`, open `http://localhost:8080/data/derived/A1_viewer.html`
- **Derivation:** `npm run map:a1:derive` — runs `scripts/map/phase_A1_derive_base_map.ts`
- **Design system:** `src/map/nato_tokens.ts` — "1990s Paper" aesthetic

---

## WGS84 build paths (full vs from-geometry)

The canonical map pipeline runs **census rollup → graph → settlements_initial_master → political_control_data → settlement_attributes → A1 derive**. The slowest step is **Voronoi tessellation**, which produces `settlements_wgs84_1990.geojson` from the legacy substrate. You can skip it when that file already exists.

| Command | When to use | What it does |
|---------|-------------|--------------|
| `npm run map:build:wgs84` | Full rebuild: geometry inputs changed (substrate, ADM3, TPS, census) | Runs tessellation first, then the rest. Slow. |
| `npm run map:build:wgs84:from-geometry` | Day-to-day: `settlements_wgs84_1990.geojson` exists | Skips tessellation; runs census rollup through A1. Fast. |

**Prerequisite for `map:build:wgs84:from-geometry`:** `data/derived/settlements_wgs84_1990.geojson` must exist. Run `map:build:wgs84` once (or `map:derive:settlements:wgs84` alone) to create it.

---

## Canonical commands

- **Canonical viewer:** `npm run map:view` — serves `tools/map_viewer/server.js`.
- **Legacy viewer (if kept):** `npm run map:view:legacy` — serves `tools/map/serve_viewer.js`.
- **Canonical map build:** `npm run map:build:new` — runs `map:build:wgs84` (full chain with tessellation).

To confirm which viewer is canonical: `npm run map:view:about`.

### Map/warroom UI and scenario data

- **Canonical viewer geometry:** `data/derived/settlements_a1_viewer.geojson` is the canonical settlement polygon set for the Tactical Map and warroom. Produced by `npm run map:derive:settlements-a1-viewer` (from A1_BASE_MAP). **Deprecated:** `settlements_viewer_v1.geojson` is legacy; all consumers use `settlements_a1_viewer.geojson`. Control zones (`map:control-zones:a1`) read from settlements_a1_viewer.
- **Political control (Turn 0):** `npm run map:viewer:political-control-data` — produces `data/derived/political_control_data.json`. Canonical for warroom and map viewers. See [docs/20_engineering/PIPELINE_ENTRYPOINTS.md](PIPELINE_ENTRYPOINTS.md) (Canonical data for map/warroom UI).
- **Settlement edges:** Consumed by scenario runner and warroom turn pipeline. Source: `data/derived/settlement_edges.json`. Built by `npm run map:derive:graph:wgs84` (S-prefixed sids). Legacy graph scripts (v1/v2/v3 from substrate) are deprecated; outputs moved to `data/_deprecated/derived/legacy_substrate/`.

Full list of `map:*` scripts: see `package.json` (search for `"map:`). Scripts live under `scripts/map/` and `tools/map/`.

## Data contracts

- **political_control_data.json:** Canonical initial political control; contract in [docs/20_engineering/PIPELINE_ENTRYPOINTS.md](PIPELINE_ENTRYPOINTS.md).
- **settlement_edges.json:** Array of `{ a, b }` settlement IDs; used by scenario harness and turn pipeline.
- **settlements_initial_master.json:** Turn-0 settlement metadata; load path type-safe via `src/state/political_control_init.ts` (validated cast).
- **settlement_attributes_wgs84.json:** Enriched per-settlement attributes (population, ethnicity, optional terrain). Built by `npm run map:build:settlement-attributes:wgs84`. Spec: [specs/map/SETTLEMENT_ATTRIBUTES_WGS84.md](specs/map/SETTLEMENT_ATTRIBUTES_WGS84.md).
- **bih_adm3_1990.geojson:** Canonical 1990 municipality polygon boundaries. `data/source/boundaries/bih_adm3_1990.geojson` — 110 opštine, WGS84, properties `mun1990_id` and `mun1990_name`. Regenerate via `npm run map:merge:adm3-1990`. Used by A1 base map, georef, and snapshot scripts.

For full pipeline and build-process details, see [docs/_old/MAP_BUILD_SYSTEM.md](_old/MAP_BUILD_SYSTEM.md).

---

## Map asset deprecation policy (tactical map canonical)

- **Canonical map data** is the set of files the Tactical Map loads: see [TACTICAL_MAP_SYSTEM.md](TACTICAL_MAP_SYSTEM.md) §5 (required: `settlements_a1_viewer.geojson`, `political_control_data.json`; optional: A1_BASE_MAP, settlement_edges, settlement_names, mun1990_names, settlement_ethnicity_data; on-demand: political_control_data_sep1992).
- **Deprecated:** `settlements_viewer_v1.geojson` is no longer produced by the canonical build; not staged for warroom. Warroom and control_zones use `settlements_a1_viewer.geojson` only. The duplicate copy in `src/ui/warroom/public/data/derived/settlements_viewer_v1.geojson` has been removed.
- **Do not move** other `data/derived/*.geojson` or pipeline artifacts without auditing: `tools/map/` and `scripts/map/` still reference polygon_fabric, municipality_outlines, municipality_borders, municipalities_1990_boundaries, etc. Moving them would break `map:check`, `map:view-munis`, and other map tooling. To deprecate further, either update those tools to use canonical outputs or deprecate the tools and then move artifacts to `data/_deprecated/`. See [PARADOX_TACTICAL_MAP_CANONICAL_DEPRECATION_CONVENE.md](../40_reports/PARADOX_TACTICAL_MAP_CANONICAL_DEPRECATION_CONVENE.md).
- **Repo cleanup 2026:** Unused or earlier map artifacts are moved (not deleted) to `data/_deprecated/derived/earlier_geojsons_2026/` or `legacy_map_tooling_2026/`. The canonical map data set above is never moved. See [REPO_CLEANUP_2026_PHASE0_DISCOVER.md](../40_reports/REPO_CLEANUP_2026_PHASE0_DISCOVER.md).
