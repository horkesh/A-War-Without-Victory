# Settlement Attributes (WGS84) — Specification

**Status:** Spec (implementation in progress).  
**Builds on:** `data/derived/settlements_wgs84_1990.geojson`, `data/derived/census_rolled_up_wgs84.json`, DEM/OSM enrichment.  
**Authority:** This document defines the canonical settlement-level attributes used for map enrichment and downstream gameplay. Implementation must conform.

---

## 1. Purpose

Settlement attributes attach **population**, **ethnicity**, and (when implemented) **terrain/transport** fields to each WGS84 settlement (`sid`). All attributes are derived from canonical inputs only; no invention. Used by A1 base map, political control, and future gameplay (e.g. pressure eligibility, movement).

---

## 2. Canonical inputs

| Input | Path | Role |
|-------|------|------|
| **Settlement geometry (WGS84)** | `data/derived/settlements_wgs84_1990.geojson` | 6002 features; `sid` (source_id), `mun1990_id`, polygon. |
| **Census rollup** | `data/derived/census_rolled_up_wgs84.json` | `by_sid[sid]`: `{ n, m, p }` — name, mun1990_id, population array. |
| **Merge report** | `data/derived/settlements_wgs84_1990_report.json` | `merged_settlements` for traceability (from → into). |
| **DEM (elevation)** | Per pipeline (e.g. phase_h6_2 snapshot) | Slope/terrain scalars per settlement (to be wired). |
| **OSM (hydrography, roads)** | Per pipeline | River proximity, road proximity/classification (to be wired). |

---

## 3. Attribute definitions

### 3.1 Population

- **Source:** `census_rolled_up_wgs84.json` → `by_sid[sid].p` (array of 5 counts: Bosniak, Serb, Croat, Yugoslav, Other — 1991 census).
- **Total population:** `population_total = sum(p)`.
- **Units:** Count (integer). Merged settlements already have population summed into the "into" sid per merge report.

### 3.2 Ethnicity

- **Source:** Same `p` array. No separate ethnicity table for WGS84; ethnicity is derived from `p`.
- **Conventions:** Order of `p`: `[Bosniak, Serb, Croat, Yugoslav, Other]`. Plurality/majority can be computed from `p` when needed (document in implementation; stable tie-break by index order).

### 3.3 Slope (terrain)

- **Source:** DEM-derived scalar per settlement (e.g. mean or max slope within settlement polygon). To be produced by enrichment script from DEM clip.
- **Units:** Degrees or normalized scalar; exact definition TBD in implementation (deterministic, stable).

### 3.4 River

- **Source:** OSM or hydrography layer. Binary or distance: e.g. "has river within X m" or "distance to nearest river."
- **Definition:** TBD in implementation (deterministic, stable; no inference beyond defined rules).

### 3.5 Road

- **Source:** OSM roads (MSR, secondary, etc.). Binary or classification: e.g. "on MSR", "on secondary", "nearest road class."
- **Definition:** TBD in implementation (deterministic, stable).

---

## 4. Outputs and contracts

- **Settlements initial master:** `data/source/settlements_initial_master.json` — already includes population (from census rollup) and ethnicity (from `p`). Built by `map:build:settlements-initial-master:wgs84`.
- **Settlement attributes (enriched):** `data/derived/settlement_attributes_wgs84.json` — built by `npm run map:build:settlement-attributes:wgs84`. Keyed by `sid`; fields: `n`, `m`, `p`, `population_total`, and when terrain is available: `slope_index`, `road_access_index`, `river_crossing_penalty`, `elevation_mean_m`, `elevation_stddev_m`, `terrain_friction_index`. Deterministic key order (sid lexicographic).

---

## 5. Determinism and ordering

- **Determinism:** All derived attributes must be deterministic: same inputs → same outputs. No timestamps, no randomness, stable sort orders.
- **Sid ordering:** Any emitted object keyed by `sid` must use stable sort (e.g. lexicographic) for keys.
- **JSON key order:** Canonical key ordering for emitted JSON (e.g. alphabetical or fixed schema order).

---

## 6. Game Designer sign-off

- **Population / ethnicity:** Aligned with 1991 census and merged-settlement rollup; no design change.
- **Slope / river / road:** Pending Game Designer review for gameplay use (e.g. movement cost, supply, pressure eligibility). Implementation will follow this spec and any design addenda.

**Sign-off:** *Pending Game Designer review for terrain/transport attributes.*

---

## 7. Related docs

- [A1_BASE_MAP_REFERENCE.md](A1_BASE_MAP_REFERENCE.md) — A1 uses settlement population/ethnicity from WGS84 pipeline.
- [MAP_BUILD_SYSTEM.md](../../MAP_BUILD_SYSTEM.md) — Canonical geometry and build commands.
- [phase2_contact_graph_enrichment.md](phase2_contact_graph_enrichment.md) — Legacy Phase 2 enrichment (substrate-based); WGS84 enrichment is separate and builds on this attributes spec.
