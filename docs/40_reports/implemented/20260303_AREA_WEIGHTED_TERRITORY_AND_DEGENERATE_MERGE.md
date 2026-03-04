# Area-Weighted Territory Percentages & Degenerate OSID Merge

**Date:** 2026-03-03
**OSID count:** 753 → 744 (9 degenerate OSIDs merged)
**Total area:** 51,337.26 km² (unchanged)

## Motivation

Territory control percentages were calculated by counting OSIDs equally (each = 1 unit). This produced misleading results: RS showed 55.2% by count but actually controlled 65.1% by area — a 10pp gap. The historical consensus is RS held ~65% of BiH territory by Jan 1993, which only matches the area-weighted calculation.

Additionally, 34 OSIDs had degenerate geometry (< 0.1 km²), of which 9 were truly degenerate (< 0.01 km²) — zero-area point features or sub-centimeter polygon fragments, all graph-isolated (unreachable by movement or combat).

## Deliverables

### 1. OSID Area Precomputation

**New file:** `tools/generate_osid_areas.cjs`
- Reads `data/derived/operational/operational_settlements.geojson`
- Computes `turf.area(feature) / 1e6` (km²) per OSID
- Writes `data/derived/operational/osid_areas.json`: `{ total_area_km2, osid_count, areas: { osid: km², ... } }`
- Deterministic: sorted keys, 3 decimal places

**New generated file:** `data/derived/operational/osid_areas.json` (~15KB)
- 744 entries, total 51,337.26 km²

**GeoJSON enrichment:** `scripts/derive_operational_settlements.ts`
- Added `area_km2` property to each output feature (enables future map tooltips)

**Runtime loader:** `src/data/operational_data.ts`
- Added `OsidAreaMap` type, `OsidAreaData` interface, `loadOsidAreas()` function
- Node.js consumers load via `readFile`; browser consumers fetch the JSON

### 2. Area-Weighted Territory Throughout Codebase

#### Warroom data extractor (`src/ui/warroom/data/war_data_extractor.ts`)
- `TerritorySnapshot` extended: `areaControlledKm2?`, `areaTotalKm2?`
- `extractTerritory()` accepts optional `osidAreas` parameter
- `extractWarData()` threads `osidAreas` through to `extractTerritory()`
- When area data provided: `territoryPercent` = area-weighted; when absent: count-based fallback

#### Map UI SituationTab (`src/ui/map/components/SituationTab.tsx`)
- `computeTerritoryPercentages()` accepts optional `osidAreas` parameter
- `useOsidAreas()` React hook: fetches `osid_areas.json` once, module-scoped cache
- Territory percentages now area-weighted when data available, count-based fallback

#### FactionOverviewPanel (`src/ui/warroom/components/FactionOverviewPanel.ts`)
- Territory quadrant: shows `Territory Control: X.X%` (area-weighted primary)
- Shows `Settlements Controlled: N / 744` (count secondary)
- Shows `Area Controlled: X / 51337 km²` when area data available

#### Comparison tool (`tools/compare_painted_vs_sim.cjs`)
- Loads `osid_areas.json` at startup (graceful fallback if missing)
- OVERALL section: area-weighted match line
- FACTION TOTALS: separate count and area-weighted sections with percentages
- BY REGION: area-weighted percentage column per region

### 3. Degenerate OSID Merge

**9 OSIDs merged** (area < 0.01 km², all graph-isolated singletons):

| OSID | Area | Pop | Target |
|------|------|-----|--------|
| `op:cajnice:djakovici` | 0.000 | 233 | `op:cajnice:miljeno_2` |
| `op:gorazde:novakovici` | 0.000 | 105 | `op:gorazde:ustipraca_2` |
| `op:travnik:krusevo_brdo_i` | 0.000 | 0 | `op:travnik:cukle_2` |
| `op:vares:pobilje` | 0.000 | 34 | `op:vares:gornja_borovica_2` |
| `op:gorazde:zorlaci` | 0.001 | 41 | `op:gorazde:ustipraca_2` |
| `op:konjic:falanovo_brdo` | 0.002 | 81 | `op:konjic:buturovic_polje_2` |
| `op:cajnice:metaljka` | 0.005 | 4 | `op:cajnice:zaborak` |
| `op:prijedor:alisici` | 0.009 | 263 | `op:prijedor:ljubija_2` |
| `op:rudo:kosovici` | 0.009 | 84 | `op:rudo:mrsovo_2` |

**Merge process:**
1. Added each degenerate's canonical SID to target's `memberSids` in `data/source/merge_progress.json`
2. Removed 9 entries from `data/source/calibration/painted_control_jan1993.json` (753 → 744)
3. Re-derived operational settlements (`scripts/derive_operational_settlements.ts`) → 744 OSIDs
4. Re-generated `osid_areas.json` → 744 entries, same total area

**Two painted target faction mismatches** (negligible — sub-0.01 km² absorbed into much larger targets):
- `op:gorazde:novakovici` (RS) merged into `op:gorazde:ustipraca_2` (RBiH) — 0.000 km²
- `op:travnik:krusevo_brdo_i` (RBiH) merged into `op:travnik:cukle_2` (HRHB) — 0.000 km², uninhabited

**25 borderline OSIDs** (0.01–0.1 km²) remain graph-isolated. See `docs/40_reports/DEGENERATE_OSID_AUDIT.md`.

## Area-Weighted Reference Numbers

### Painted targets (Jan 1993)
| Faction | Count | Count % | Area (km²) | Area % |
|---------|-------|---------|------------|--------|
| RS | 411 | 55.2% | 33,414 | **65.1%** |
| RBiH | 246 | 33.1% | 11,918 | **23.2%** |
| HRHB | 87 | 11.7% | 6,005 | **11.7%** |
| **Total** | **744** | | **51,337** | |

The RS 65.1% area figure matches the historical consensus (~65% of BiH territory).

## Files Changed

| File | Action |
|------|--------|
| `tools/generate_osid_areas.cjs` | **Created** — area precomputation script |
| `data/derived/operational/osid_areas.json` | **Created** — generated lookup |
| `scripts/derive_operational_settlements.ts` | Modified — `area_km2` property on GeoJSON features |
| `src/data/operational_data.ts` | Modified — `OsidAreaMap`, `OsidAreaData`, `loadOsidAreas()` |
| `src/ui/warroom/data/war_data_extractor.ts` | Modified — area-weighted `extractTerritory()` |
| `src/ui/map/components/SituationTab.tsx` | Modified — area-weighted `computeTerritoryPercentages()` + `useOsidAreas()` hook |
| `src/ui/warroom/components/FactionOverviewPanel.ts` | Modified — territory display: area % primary, count secondary |
| `tools/compare_painted_vs_sim.cjs` | Modified — area-weighted columns in all sections |
| `data/source/merge_progress.json` | Modified — 9 SIDs added to existing target groups |
| `data/source/calibration/painted_control_jan1993.json` | Modified — 9 degenerate entries removed (753 → 744) |
| `data/derived/operational/operational_settlements.geojson` | Regenerated — 744 features |
| `data/derived/operational/canonical_to_operational_map.json` | Regenerated |
| `data/derived/operational/operational_contact_graph.json` | Regenerated |
| `data/derived/operational/operational_initial_master.json` | **Re-derive after merge:** run `npm run map:derive:operational-initial-master` so dev runner and political control init see 744 OSIDs (avoids "9 unknown settlement ids" when graph is 744). |
| `tools/area_compare.cjs` | **Deleted** — superseded by `generate_osid_areas.cjs` |
| `docs/40_reports/DEGENERATE_OSID_AUDIT.md` | **Created** — audit of 34 OSIDs < 0.1 km² |

## Verification

- `npx tsc --noEmit` — 0 errors
- `npm run test:vitest` — 260 passed, 1 skipped
- `node tools/generate_osid_areas.cjs` — 744 features, 51,337.26 km², 25 degenerate (< 0.1 km²)
- Painted targets: 744/744 resolved, area percentages RS 65.1% / RBiH 23.2% / HRHB 11.7%
- Comparison tool area-weighted output verified against standalone calculation
