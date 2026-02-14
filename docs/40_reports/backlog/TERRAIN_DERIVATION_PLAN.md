# Terrain Scalar Derivation Plan (H6.7-PREP)

Design-level specification for deterministic terrain scalar derivation. **Phase H6.7-PREP — design and audit only. NO EXECUTION. No data generated.** This document defines derivation order, edge-case fallbacks, and non-goals before any execution phase (H6.6).

---

## 1. High-level pipeline order

### 1.1 Snapshot inputs (already defined in H6.2)

- **OSM roads:** `data/derived/terrain/osm_roads_snapshot_h6_2.geojson` (or .gz)
- **OSM waterways:** `data/derived/terrain/osm_waterways_snapshot_h6_2.geojson` (or .gz)
- **DEM clip:** `data/derived/terrain/dem_clip_h6_2.tif`
- **Georeferencing:** `data/derived/georef/svg_to_world_transform.json` (SVG → world)
- **Settlement substrate:** `data/derived/settlements_substrate.geojson` (SVG space)

All snapshots and georeferencing must exist before scalar derivation runs. Preflight must fail fast if any required input is missing.

### 1.2 Settlement footprint selection

- **Aggregation unit:** Settlement polygon footprint. Each settlement is represented by one feature in `settlements_substrate.geojson` (or equivalent substrate).
- **Geometry source:** Feature `geometry` (Polygon or MultiPolygon). No fallback to centroid-only; footprint is authoritative.
- **Coordinate transform:** SVG coordinates → world (EPSG:4326) via `svg_to_world_transform.json` before intersecting OSM/DEM. DEM clip is already in world CRS; OSM features are in EPSG:4326.
- **Ordering:** Process settlements in deterministic order (e.g. by `sid` or `settlement_id` ascending). Stable sort; no timestamp or random tie-breaker.

### 1.3 Scalar-by-scalar derivation order

Derivation must respect dependencies. Order within each tier is irrelevant if scalars are independent.

| Step | Scalar(s) | Rationale |
|------|-----------|-----------|
| 1 | elevation_mean_m, elevation_stddev_m | DEM-only; no OSM; base statistics |
| 2 | slope_index | DEM-derived (from DEM clip); no OSM |
| 3 | road_access_index | OSM roads only; no elevation/slope dependency |
| 4 | river_crossing_penalty | OSM waterways only; no road/elevation dependency |
| 5 | terrain_friction_index | May combine slope_index + optional land cover; computed after slope |

### 1.4 Normalization and clamping

- **elevation_mean_m, elevation_stddev_m:** ∈ ℝ⁺ (non-negative). No clamp to [0,1]; raw metres.
- **slope_index, road_access_index, river_crossing_penalty, terrain_friction_index:** Clamp to [0, 1]. Normalization rules must be deterministic (e.g. percentile-based with fixed quantiles, or min-max from global stats with fixed bounds).
- **Fixed precision:** Output scalars use fixed decimal places (e.g. 3 for normalized indices, 1 for elevation metres) for determinism.

### 1.5 Final attachment (data-only)

- Attach scalars to settlement properties in output GeoJSON (or equivalent). No simulation consumption in this phase.
- Output dataset: e.g. `settlements_terrain_scalars.json` or extended substrate with `terrain_*` properties. Schema must match `docs/TERRAIN_SCALARS_SPEC.md`.

---

## 2. Explicit dependency graph

Relationships only; no formulae.

- **road_access_index** — Depends on: OSM roads. Does NOT depend on: elevation, slope, waterways.
- **river_crossing_penalty** — Depends on: OSM waterways. Does NOT depend on: elevation, slope, roads.
- **elevation_mean_m** — Depends on: DEM clip only. Does NOT depend on: OSM.
- **elevation_stddev_m** — Depends on: DEM clip only. Does NOT depend on: OSM.
- **slope_index** — Depends on: DEM clip (slope derived from DEM). Does NOT depend on: OSM roads, waterways.
- **terrain_friction_index** — Depends on: slope_index (and optionally DEM roughness / land cover if available). May combine with road_access or river_crossing only if explicitly designed; default is slope-only to avoid circular dependency. Does NOT depend on: road_access_index, river_crossing_penalty (unless documented as composite).

**Stability:** Same inputs + same derivation order + same fallback rules → same output. No non-determinism.

**Monotonicity:** Not required. Scalars are observational; increasing road density or slope does not guarantee monotonic change in composite indices if normalization uses global stats.

---

## 3. Edge cases and deterministic fallbacks

### 3.1 Zero roads within footprint

| Aspect | Expected behavior | Fallback value | Logging |
|--------|-------------------|----------------|----------|
| road_access_index | No road geometry intersects the settlement polygon | 0 | Logged in edge-case audit (count of settlements with zero roads) |
| Determinism | Same result every run | — | — |

### 3.2 Zero waterways within footprint

| Aspect | Expected behavior | Fallback value | Logging |
|--------|-------------------|----------------|----------|
| river_crossing_penalty | No waterway geometry intersects the settlement polygon | 0 | Logged in edge-case audit (count of settlements with zero waterways) |
| Determinism | Same result every run | — | — |

### 3.3 Extremely small polygon area

| Aspect | Expected behavior | Fallback value | Logging |
|--------|-------------------|----------------|----------|
| DEM / OSM intersection | Polygon may yield zero or very few pixels / line segments | Use all intersecting pixels; if zero pixels, use centroid-sampled value or nearest-neighbor | Logged if area below threshold (e.g. < 1e-6 sq units) or zero DEM pixels |
| road_access_index | Zero intersection → 0 | 0 | Logged |
| river_crossing_penalty | Zero intersection → 0 | 0 | Logged |
| elevation_mean_m, elevation_stddev_m | Zero pixels → use single pixel at centroid, or nearest valid pixel | Deterministic fallback (e.g. centroid sample); stddev = 0 if single pixel | Logged |
| slope_index | Zero pixels → 0 (flat) or centroid slope | 0 | Logged |
| terrain_friction_index | Inherits slope fallback | Same as slope_index if slope-only | Logged |

### 3.4 Coastal adjacency

| Aspect | Expected behavior | Fallback value | Logging |
|--------|-------------------|----------------|----------|
| DEM | Polygon may include NoData (sea) pixels | Exclude NoData from elevation/slope stats; if all NoData, use nearest land pixel or mark as special case | Logged if any NoData pixels in footprint |
| OSM | Coastline is not a waterway in OSM semantics | river_crossing_penalty does not treat coast as waterway | Silent (by design) |
| roads | Coastal settlements may have roads | Normal intersection | — |

### 3.5 Enclave geometry

| Aspect | Expected behavior | Fallback value | Logging |
|--------|-------------------|----------------|----------|
| Footprint | Settlement polygon fully enclosed by another | Treated as normal polygon; intersection with OSM/DEM over full footprint | — |
| OSM/DEM | May have different coverage inside enclave | Standard fallbacks (zero roads → 0, etc.) | Logged if anomalous (e.g. enclave with no roads but parent has roads) — diagnostic only |

### 3.6 Non-contiguous MultiPolygon footprints

| Aspect | Expected behavior | Fallback value | Logging |
|--------|-------------------|----------------|----------|
| Aggregation | Aggregate over all parts (union of polygons) | Stats (elevation, slope) over all pixels in all parts; OSM over all intersections | — |
| road_access_index | Sum or max over parts; rule must be fixed (e.g. area-weighted mean of road density per part) | 0 if no part has roads | Logged if parts have disjoint road coverage |
| river_crossing_penalty | Same aggregation rule as roads | 0 if no part has waterways | Logged if parts differ significantly |
| Determinism | Same ordering of parts (e.g. by winding order or part index) | — | — |

### 3.7 Invalid or empty geometry

| Aspect | Expected behavior | Fallback value | Logging |
|--------|-------------------|----------------|----------|
| Empty geometry / null | Skip scalar derivation for that settlement; or use centroid point | Omit from output, or emit with null scalars + flag | Logged; must not silently drop settlements |
| Self-intersecting / degenerate | Use render-valid gate per project; convex hull salvage only if documented | Deterministic salvage path; log hull inflation | Logged |
| Too few vertices | Below triangulation threshold | Convex hull or centroid fallback; log | Logged |

### 3.8 Missing inputs (snapshot or DEM unavailable)

| Aspect | Expected behavior | Fallback value | Logging |
|--------|-------------------|----------------|----------|
| OSM roads missing | Fail fast; do not derive road_access_index | — | Preflight error |
| OSM waterways missing | Fail fast; do not derive river_crossing_penalty | — | Preflight error |
| DEM missing | Fail fast; do not derive elevation/slope/friction | — | Preflight error |
| Georef missing | Fail fast; cannot transform SVG → world | — | Preflight error |

---

## 4. What this pipeline will NEVER do

- **No shortest paths.** Scalars are local to each aggregation unit. No A*, Dijkstra, or path-cost computation.
- **No movement simulation.** No hex/tile movement, movement cost tables, or tactical movement rules.
- **No tactical chokepoints.** No identification of passes, defiles, or bottlenecks. Scalars describe local terrain, not connectivity.
- **No dynamic terrain effects.** Scalars are static per settlement. No weather, seasons, or runtime terrain modification.
- **No consumption by simulation.** Until a future phase explicitly wires terrain into combat, control, or legitimacy, scalars remain data-only.

---

## References

- `docs/TERRAIN_SCALARS_SPEC.md` — Canonical scalar list and schema
- `docs/TERRAIN_PIPELINE_AUDIT.md` — H6.0–H6.4.2 pipeline and H6.6 preview
- `docs/PROJECT_LEDGER.md` — Phase H6.7-PREP entry
