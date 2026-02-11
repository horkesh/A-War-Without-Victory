# A War Without Victory - Geographic & Census Data Package

## Overview

This package contains the extracted geographic boundaries and 1991 census data for Bosnia and Herzegovina, prepared for use in the AWWV game engine.

## Files Included

### GeoJSON Files (in this package)

| File | Description |
|------|-------------|
| `boundaries/bih_adm3_1990.geojson` | **Canonical** 1990 municipality boundaries (110 opštine, WGS84). |
| `boundaries/bih_adm0.geojson` | Country outline. `boundaries/bih_adm3.geojson` is post-1995 only. |

**Settlement geometry (canonical):** Use **`data/derived/settlements_wgs84_1990.geojson`** (WGS84, Voronoi-tessellated; 6002 settlements). It is produced by the map pipeline from census + ADM3; do not use SVG-space sources for new work. Obsolete GeoJSON (bih_master, bih_settlements*, bosnia_settlements_1991, geography*) and HTML viewers were moved to `data/_deprecated/` — see that folder's README.

### Data Files

| File | Size | Description |
|------|------|-------------|
| `bih_census_1991.json` | ~420 KB | Compact census data for game logic (no geometry) |

### TypeScript Types

| File | Description |
|------|-------------|
| `settlement.ts` | Core type definitions for settlements, populations, and game state |
| `census-loader.ts` | Utilities for loading and querying census data |

### Visualization

Map viewers and preview HTML that showed SVG-space or legacy data have been moved to `data/_deprecated/source/viewers/`. For current map viewing use the pipeline viewers (e.g. `data/derived/A1_viewer.html`, `npm run map:view`).

## Canonical sources

- **Settlements (geometry):** **`data/derived/settlements_wgs84_1990.geojson`** — WGS84 settlement polygons (6002 emitted after tessellation merges). Produced by `npm run map:derive:settlements:wgs84`. For day-to-day rebuilds without tessellation, use `npm run map:build:wgs84:from-geometry` (see MAP_BUILD_SYSTEM.md). All new map work builds on this file.
- **Municipalities (1990):** **`boundaries/bih_adm3_1990.geojson`** — canonical 1990 municipality boundary dataset (110 opštine, WGS84). `boundaries/bih_adm3.geojson` is post-1995 only.
- **Historical OOB:** **Primary source for brigades:** `oob_brigades.json`. **Primary source for corps:** `oob_corps.json`. Validate/normalize brigades: `npx tsx tools/formation/derive_oob_brigades.ts`.

## Data Statistics

- **Total Population (1991):** 4,377,033
- **Municipalities:** 142
- **Settlements with Geometry:** 6,135
- **Settlements with Census Data:** 6,140

## Census Data Structure

### Compact JSON Format (`bih_census_1991.json`)

```json
{
  "settlements": {
    "100013": {
      "n": "Banovići",           // name
      "m": "10014",              // municipality ID
      "p": [8637, 3843, 495, 2534, 1765]  // [total, bosniaks, croats, serbs, others]
    }
  },
  "municipalities": {
    "10014": {
      "n": "Banovići",           // name
      "s": ["100013", "100021", ...],  // settlement IDs
      "p": [26590, 19162, 550, 4514, 2364]  // aggregated population
    }
  }
}
```

### GeoJSON Properties

Each settlement feature includes:

```json
{
  "type": "Feature",
  "id": "sett_100013",
  "properties": {
    "id": "100013",
    "name": "Banovići",
    "layer": "settlement",
    "municipality_id": "10014",
    "municipality_name": "Banovići",
    "population_1991": {
      "total": 8637,
      "bosniaks": 3843,
      "croats": 495,
      "serbs": 2534,
      "others": 1765
    }
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[x1, y1], [x2, y2], ...]]
  }
}
```

## Coordinate System

- **Canonical settlement geometry** (`data/derived/settlements_wgs84_1990.geojson`) and **municipality boundaries** (`boundaries/bih_adm3_1990.geojson`) are in **WGS84 (EPSG:4326)** — standard lon/lat.
- Legacy SVG-space sources (formerly in this package) were moved to `data/_deprecated/`. They used canvas-style coordinates (origin top-left, y down); do not use for new work.

## Usage in Game Engine

### Loading Census Data (TypeScript)

```typescript
import { loadCensusData, initializeRegistry, getCensusStatistics } from './census-loader';

// Async loading
const census = await loadCensusData('/data/bih_census_1991.json');
const registry = initializeRegistry(census);

// Get statistics
const stats = getCensusStatistics(registry);
console.log(`Total population: ${stats.totalPopulation.toLocaleString()}`);
```

### Tracking Population Changes

```typescript
import { SettlementState, calculateCurrentPopulation } from './settlement';

// When casualties occur
state.populationDelta.casualties.bosniaks += 50;
state.populationDelta.casualties.serbs += 30;

// Recalculate current population
state.currentPopulation = calculateCurrentPopulation(
  registry.census.get(settlementId)!.population,
  state.populationDelta
);
```

### Querying by Municipality

```typescript
import { getMunicipalityPopulation } from './census-loader';

const munPop = getMunicipalityPopulation(registry, '10014');
console.log(`Banovići municipality: ${munPop.total.toLocaleString()} people`);
```

## Data Integrity Notes

1. **Census Total Verified:** The sum of all settlement populations exactly matches the known 1991 census total of 4,377,033.

2. **Summary Rows Excluded:** All rows marked with `∑` in the source data were properly excluded to prevent double-counting.

3. **Post-1995 Borders:** The census data has been applied to post-1995 (Dayton Agreement) administrative boundaries, which differ slightly from the original 1991 borders.

4. **Missing Geometry:** 5 settlements have census data but no corresponding SVG geometry in the source files.

## Visualization

To preview the map:

1. Start a local HTTP server:
   ```bash
   python3 -m http.server 8000
   ```

2. Open `http://localhost:8000/map_preview.html` in a browser

The preview supports:
- Color by ethnic majority/plurality or population
- Toggle between settlement and municipality views
- Pan and zoom (mouse wheel or buttons)
- Hover tooltips with full demographic breakdown

## Future Enhancements

1. **Geographic Projection:** Add affine transformation to convert SVG coords to EPSG:4326 (lat/lon)

2. **Adjacency Graph:** Compute settlement adjacency for pathfinding and corridor calculations

3. **Connectivity Data:** Add road network and supply route information

4. **Historical Boundaries:** Include pre-1991 and wartime boundary changes

## Source Data Attribution

- Settlement boundaries: Extracted from municipality SVG files
- Municipality boundaries: Extracted from `drzava.js`
- Census data: 1991 Yugoslav census, applied to post-1995 borders
