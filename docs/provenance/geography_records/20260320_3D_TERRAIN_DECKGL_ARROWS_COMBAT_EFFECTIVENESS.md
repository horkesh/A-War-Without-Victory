# 3D Terrain, Deck.gl Animated Arrows, Combat Effectiveness, and Ops Modal Overhaul

**Date:** 2026-03-20
**Baseline:** v0.4.9, 1,244 tests, 91.4% area-weighted. Ops modal with static MapLibre polygon arrows, no terrain info, no selectability constraints.
**Result:** 1,246 tests, 103 suites. 3D terrain in ops modal, animated Deck.gl arrows, combat effectiveness at all hierarchy levels, terrain info visible to player, staging/objective selectability constraints.

## Summary

- Built an offline DEM-to-PMTiles terrain pipeline and wired real 3D terrain into the ops planning modal (pitch 30, exaggeration 2.5)
- Replaced static MapLibre polygon arrows with Deck.gl animated PathLayer arrows (marching dashes)
- Created `ModalMapSource` utility to structurally eliminate the 3x-violated `setData()` modal MapLibre bug
- Added bidirectional staging/objective selectability constraints with front-edge adjacency
- Added terrain-aware camera bearing (looks down the attack corridor)
- Surfaced terrain info (elevation, slope, defense bonus, river/road) to the player in tooltips and settlement panels
- Created `combatEffectiveness.ts` — composite combat power number visible at brigade, sector, corps, and army levels

## Changes Made

### 1. 3D Terrain Pipeline

Built a fully offline terrain tile pipeline from existing project DEM data:

| Step | Tool | Input | Output |
|------|------|-------|--------|
| Source | Copernicus GLO-30 | `data/source/dem/` | 30m resolution DEM |
| Clip | GDAL (prior session) | Raw DEM | `data/derived/terrain/dem_clip_h6_2.tif` (2737x1946, Float32, -2.5m to 2,434m) |
| Encode | Node.js | Float32 elevation | Mapbox Terrain RGB (`elevation = -10000 + (R*65536 + G*256 + B) * 0.1`) |
| VRT wrap | GDAL | Raw RGB binary | `dem_terrainrgb.vrt` → `dem_terrainrgb.tif` (3-band Byte GeoTIFF) |
| Reproject | `gdalwarp` | EPSG:4326 | EPSG:3857 (`dem_terrainrgb_3857.tif`, 4096x4043) |
| Tile | `gdal_translate` | Web Mercator TIFF | MBTiles (PNG format, z6-z10, 247 tiles) |
| Overviews | `gdaladdo` | MBTiles | Zoom levels 6-10 with overviews |
| Package | `pmtiles convert` | MBTiles | `data/derived/tiles/terrain.pmtiles` (11MB) |
| Fix header | Python | PMTiles header | Patched tile_type byte 7 from 3 (JPEG) to 2 (PNG) |

**Integration:**
- Main map: `pitch: 15` (perspective only, no terrain extrusion)
- Ops modal: `pitch: 30`, `map.setTerrain({ source: 'terrain-dem', exaggeration: 2.5 })` — real 3D
- Source added programmatically after `map.on('load')` to avoid PMTiles protocol timing issues

### 2. Deck.gl Animated Advance Arrows

Replaced the 6-layer MapLibre GeoJSON arrow system (`ModalMapSource` with `ARROW_LAYER_SPECS`) with 5 Deck.gl layers on `MapboxOverlay`:

| Layer | Type | Purpose |
|-------|------|---------|
| `ops-arrow-glow` | PathLayer | Wide semi-transparent halo behind arrows |
| `ops-arrow-outline` | PathLayer | Solid body outline giving definition |
| `ops-arrow-body` | PathLayer + PathStyleExtension | Animated marching dashes (`dash: true`, `offset: true`) |
| `ops-arrow-heads` | PolygonLayer | Arrowhead triangles at each objective |
| `ops-arrow-labels` | TextLayer | Objective numbering (1.1, 1.2, etc.) |

**Animation:** `requestAnimationFrame` loop increments `dashOffsetRef`, updating the PathStyleExtension offset continuously. Dashes march forward from staging toward objectives.

**Geometry:** Reuses existing `buildBezierCurve()` and `buildArrowheadTriangle()` from `arrowGeometry.ts`. Arrow body is a PathLayer (not tapered polygon) — width is uniform but the glow+outline create visual weight.

### 3. ModalMapSource Utility

`src/ui/map/utils/ModalMapSource.ts` — structural fix for the #1 recurring life lesson violation (setData() on modal MapLibre dynamic sources).

```typescript
class ModalMapSource {
    constructor(map, sourceId, layerSpecs[])
    setData(data)    // removes all layers + source, re-adds with new data
    init()           // setData with empty FeatureCollection
    destroy()        // removes all layers + source
}
```

Applied to:
- `OpsMap.tsx`: objectives source, staging source (arrows moved to Deck.gl)
- `OpsMapRenderer.ts`: arrows source, OSID data source, markers source

**Code review findings fixed:**
- Dead `map` parameter removed from `updateArrows`
- `ARROW_LAYER_SPECS` retyped from `any[]` to `ModalLayerSpec[]`
- Dead `initialized`/`isInitialized` field removed
- Phantom `schwerpunktOsid` dependency removed from effect
- Dead `EMPTY_FC` constant removed

### 4. Staging/Objective Selectability Constraints

Bidirectional constraint enforcement using front edge adjacency from `frontEdgesOsid`:

| State | Selectable Objectives | Selectable Staging |
|-------|----------------------|-------------------|
| Nothing selected | All front-adjacent enemy OSIDs | All front-adjacent friendly OSIDs |
| Staging set, no objectives | Only enemy OSIDs adjacent to staging OSID | All front-friendly (to change staging) |
| Objectives set, no explicit staging | All front-enemy (for more objectives) | Only friendly OSIDs adjacent to at least one objective |
| Both set | Staging-reachable enemies + already-selected | All front-friendly |

**Data structures:**
- `friendlyToEnemy: Map<string, Set<string>>` — for each friendly front OSID, which enemy OSIDs are directly across the front line
- `enemyToFriendly: Map<string, Set<string>>` — inverse

**Visual feedback:**
- Non-selectable OSIDs dimmed with 45% dark overlay via `ModalMapSource` (`ops-dimmed-osids`)
- Cursor shows pointer only on selectable OSIDs
- Click handler enforces constraints (silent rejection of non-selectable clicks)

### 5. Terrain-Aware Camera

`computeAttackBearing()` computes camera bearing from the centroid of friendly OSIDs → centroid of enemy OSIDs for the selected corps. On modal open, `map.fitBounds()` uses this bearing + pitch 30 so the player looks *down the attack corridor*.

### 6. Terrain Info Visible to Player

**Data pipeline:** `loadTerrainScalars()` fetches `settlements_terrain_scalars.json` (6,137 SID entries), cached. Merged into `osidPropertiesMap` at map init in `MapContainer.tsx` — single enrichment point feeds all consumers.

**Derived fields added to osidPropertiesMap:**
- `elevation_mean_m` — meters above sea level
- `slope_index` — 0-1 slope steepness
- `terrain_friction_index` — 0-1 movement/combat difficulty
- `road_access_index` — 0-1 road quality
- `river_crossing_penalty` — 0/1 penalty flag
- `terrain` — derived label: Flat (<0.15), Forest (0.15-0.3), Hilly (0.3-0.5), Mountain (>0.5)

**Display locations (3):**
1. **Main map OSID hover tooltip** — via `SettlementDetailContent`, automatic from enriched props
2. **Main map settlement detail panel** — terrain type badge with defense modifier (+15%/+30%/+50%), elevation, river crossing warning, road access warning
3. **Ops modal hover tooltip** — dedicated terrain popup with selectable/out-of-range indicator

**Defense modifier mapping:**
- Friction > 0.5 → Mountain → +50% Def
- Friction > 0.3 → Hilly → +30% Def
- Friction > 0.15 → Forest → +15% Def
- Friction ≤ 0.15 → Flat → no modifier

### 7. Combat Effectiveness System

`src/ui/map/utils/combatEffectiveness.ts` — pure UI-side calculation mirroring `combat_math.ts` without GameState dependency.

**Brigade formula:**
```
base = personnel x equipmentRatio x experience x (cohesion/100) x honorMult
effectiveness = base x fatigue x officer x homeDistance x morale x disruption x supply
```

**Modifier sources (all from FormationView):**
| Modifier | Source | Range |
|----------|--------|-------|
| fatigue | `fatigue` field, max 30 | 0.675 - 1.0 |
| officer | `officer_quality` [0.05, 0.90] | 0.87 - 1.15 |
| homeDistance | `homeDistanceMult` | 0.70 - 1.0 |
| morale | `morale`, critical threshold 15 | 0.30 - 1.0 |
| disruption | `disrupted_turns > 0` | 0.5 or 1.0 |
| supply | `equipment_decay` as proxy | 0.6 - 1.0 |

**Aggregate function:** `aggregateEffectiveness(formations[])` sums across brigades and computes:
- Total effectiveness, total personnel, brigade count
- Average effectiveness per brigade
- Ineffective count (personnel < 400), disrupted count
- Letter grade: A (≥85% avg modifier), B (≥70%), C (≥55%), D (≥40%), F (<40%)

**Display hierarchy:**

| Level | Component | Shows |
|-------|-----------|-------|
| Brigade | `FormationDetail.tsx` | Effectiveness number (color-coded) + worst modifier label |
| Sector | `CorpsDetail.tsx` Sectors tab | Aggregate effectiveness + personnel per sector |
| Corps | `CorpsDetail.tsx` Overview | Total effectiveness + grade + weak/disrupted counts |
| Army | `ArmyDetail.tsx` Overview | Whole-army aggregate + grade + weak/disrupted counts |

Personnel always visible alongside effectiveness at every level.

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/utils/ModalMapSource.ts` | NEW — safe modal map source management |
| `src/ui/map/utils/combatEffectiveness.ts` | NEW — combat effectiveness calculation + aggregation |
| `src/ui/map/data/DataLoader.ts` | Added `loadTerrainScalars()` with `TerrainScalars` interface |
| `src/ui/map/components/ops_modal/OpsMap.tsx` | Deck.gl overlay, 3D terrain, terrain camera, terrain tooltip, dimming layer, selectability |
| `src/ui/map/components/ops_modal/OpsPlanningModal.tsx` | Front-edge adjacency maps, selectableOsids computation |
| `src/ui/map/components/ops_modal/OpsMapRenderer.ts` | Refactored to use ModalMapSource |
| `src/ui/map/components/FormationDetail.tsx` | Brigade combat effectiveness display |
| `src/ui/map/components/CorpsDetail.tsx` | Corps + sector combat effectiveness |
| `src/ui/map/components/ArmyDetail.tsx` | Army-level combat effectiveness |
| `src/ui/map/components/SettlementDetailContent.tsx` | Terrain info: elevation, friction-based defense modifier, river/road warnings |
| `src/ui/map/map/MapContainer.tsx` | Pitch 15, terrain scalars merge into osidPropertiesMap |
| `src/ui/map/map/awwv_map_style.json` | Municipality borders layer (visibility: none default) |
| `data/derived/tiles/terrain.pmtiles` | NEW — 11MB terrain RGB tiles (z6-z10, 247 PNG tiles) |
| `data/derived/terrain/dem_terrainrgb.*` | Intermediate terrain RGB files (VRT, TIF, raw) |

## Lessons Learned

1. **PMTiles tile type mis-detection:** `pmtiles convert` auto-detected PNG tiles as JPEG (tile_type byte = 3 instead of 2). Patching the header byte fixed it. When converting raster-dem tiles, always verify the PMTiles header tile type matches the actual tile format.

2. **`raster-dem` sources should be added programmatically** — adding them in the style JSON before the PMTiles protocol is registered can cause silent failures. Adding via `map.addSource()` after `map.on('load')` is more reliable.

3. **`setData()` is now structurally eliminated** — the `ModalMapSource` utility makes the violation impossible for any source that uses it. The pattern should be used for all future modal/secondary map sources.

4. **Terrain data was invisible to the player** — the sim calculated terrain effects on combat (friction, defense bonus, movement cost) but none of this was shown in the UI. Merging terrain scalars into `osidPropertiesMap` at map init was a single-point fix that feeds all display components.

5. **Combat effectiveness needs to be a single number** — players in strategy games expect a composite strength indicator. The raw stats (personnel, cohesion, morale) are important but the player needs to compare units at a glance. The letter grade (A-F) provides instant readability.

## Next Steps (Backlog)

### Ops Modal Deck.gl Upgrades (P3)
1. Brigade ScatterplotLayer — personnel-scaled dots at current positions
2. Force flow ArcLayer — brigade → staging → objective flow network
3. Threat heat underlayer — enemy density HeatmapLayer from sector_intel
4. Pulsing objective/staging markers — animated ScatterplotLayer rings
5. Floating axis labels — "Axis 1: 3 bde, PR 2.1" from usePrediction

### 3D Terrain Leverage (P3)
1. Elevation profile on advance axes — sample DEM along bezier, show elevation strip
2. Terrain-colored front lines — high-elevation edges get mountain tint
3. LOS/visibility cones — ray-cast against DEM from brigade positions
4. Terrain cost for movement — mountain passes cost more turns
5. 3D battle replay — camera swoops to battle site after resolution
6. Main map terrain tooltip — port ops modal tooltip to main map OSID hover
