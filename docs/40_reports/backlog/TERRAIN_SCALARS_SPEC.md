# Terrain Scalars Specification (H6.6-PREP)

Design-level specification for canonical terrain scalar fields. **No execution. No data generated.** This document defines schema and contracts only.

---

## 1. Scope and intent

- **Terrain scalars are DATA-ONLY until explicitly consumed.** They are derived (when H6.6 execution runs) and stored per settlement or per aggregation unit. No scalar directly modifies combat, control, or legitimacy until a future phase explicitly wires consumption.
- This spec locks field names, meanings, and allowed ranges so that derivation (H6.6) and future consumers share a single contract.

---

## 2. Canonical scalar list (locked names)

| Scalar | Type | Range | Description |
|--------|------|--------|-------------|
| **road_access_index** | number | ∈ [0, 1] | Normalized measure of road network presence / accessibility over the aggregation unit. 0 = none, 1 = high. |
| **river_crossing_penalty** | number | ∈ [0, 1] | Normalized impediment from waterways (rivers, major streams). 0 = no penalty, 1 = maximum crossing difficulty. |
| **elevation_mean_m** | number | ∈ ℝ⁺ | Mean elevation in metres (above same vertical datum as DEM). Non-negative. |
| **elevation_stddev_m** | number | ∈ ℝ⁺ | Standard deviation of elevation within the aggregation unit, in metres. Non-negative. |
| **slope_index** | number | ∈ [0, 1] | Normalized slope (e.g. mean or max slope normalized to [0,1]). 0 = flat, 1 = steep. |
| **terrain_friction_index** | number | ∈ [0, 1] | Normalized “going” difficulty (roughness, vegetation, surface). 0 = easy, 1 = maximum friction. |

All scalars are **per aggregation unit** (see §3). No scalar directly modifies combat, control, or legitimacy in this phase.

---

## 3. Derivation source (specification only — NO execution)

For each scalar, the **intended** source and aggregation rule is specified below. No code or tool execution is implied by this phase.

| Scalar | Source dataset | Aggregation unit | Deterministic aggregation rule |
|--------|----------------|------------------|---------------------------------|
| **road_access_index** | OSM roads (H6.2 snapshot) | Settlement polygon footprint | Density or binary presence; normalized to [0,1] (e.g. road length per area or max 1). |
| **river_crossing_penalty** | OSM waterways (H6.2 snapshot) | Settlement polygon footprint | Presence / density of waterways; normalized to [0,1]. |
| **elevation_mean_m** | DEM clip (H6.2) | Settlement polygon footprint | Mean of pixel values within footprint (same vertical datum). |
| **elevation_stddev_m** | DEM clip (H6.2) | Settlement polygon footprint | Standard deviation of pixel values within footprint. |
| **slope_index** | DEM-derived slope (from H6.2 DEM) | Settlement polygon footprint | Mean or max slope within footprint; normalized to [0,1]. |
| **terrain_friction_index** | DEM + optional land cover / OSM | Settlement polygon footprint | Composite of slope and/or roughness; normalized to [0,1]. |

- **Source dataset:** OSM = OpenStreetMap (roads, waterways); DEM = Copernicus DEM (or equivalent) clipped to AWWV area.
- **Aggregation unit:** Settlement polygon footprint (or equivalent substrate geometry used for derivation).
- **Deterministic:** Same inputs and rules must produce the same scalar values; stable ordering and fixed precision for outputs.

---

## 4. Explicit non-goals

- **No pathfinding.** Scalars do not define graph weights for A* or similar.
- **No tactical movement.** No hex/tile movement or movement cost tables.
- **No line-of-sight.** No LOS computation or visibility.
- **No real-time traversal.** Scalars are precomputed per unit; no runtime spatial queries for movement.

---

## References

- `docs/TERRAIN_PIPELINE_AUDIT.md` — H6.0–H6.4.2 pipeline and H6.6 preview
- `docs/PROJECT_LEDGER.md` — Phase H6.6-PREP entry
