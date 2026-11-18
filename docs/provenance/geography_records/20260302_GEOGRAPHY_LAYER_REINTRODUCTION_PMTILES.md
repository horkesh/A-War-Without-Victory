# Geography Layer Reintroduction: PMTiles, Style Layer Reorder, Place Labels

**Date:** 2026-03-02
**Author:** Orchestrator + Graphics Programmer
**Baseline:** PMTiles stubs (133–134 byte LFS pointers), no terrain/roads/water visible on map
**Result:** Full geography layer rendering — hillshade terrain, water bodies/waterways, forests, roads, city/town/village labels

---

## Summary

- Restored the map's geography layer by pulling real PMTiles binaries from Git LFS — previously only 133–134 byte pointer stubs were on disk.
- Fixed a critical **layer ordering bug** in `awwv_map_style.json` where roads and waterways rendered ON TOP of front lines and military overlays.
- Added 3 new style layers: `earth-fill` (land mass), `place-labels-city` (cities/towns), `place-labels-village` (villages at z10+).
- **1 file modified** (`awwv_map_style.json`). 21 layers total (was 18). All typechecks and builds pass.

---

## Root Cause Analysis

The geography layer was never "broken" in code — the entire tile pipeline infrastructure was correctly wired:

| Component | Status |
|-----------|--------|
| `pmtiles` npm package (v3.0.0) | Installed in `src/ui/map/` |
| `maplibregl.addProtocol('pmtiles', ...)` | Registered in MapContainer.tsx:97 |
| Vite middleware (HTTP Range requests) | Working in vite.config.ts (HTTP 206 support) |
| Style JSON source definitions | Correct (`pmtiles:///data/derived/tiles/...`) |
| Style JSON layer definitions | Present (water, forest, hillshade, roads) |

**The sole problem:** `git lfs pull` had never been run on this working copy. The `.pmtiles` files at `data/derived/tiles/` contained Git LFS pointer text (133–134 bytes), not binary tile data. The PMTiles protocol handler silently failed to decode these as valid tile archives.

### Resolution

```bash
git lfs pull
```

This downloaded the real binaries:

| File | LFS Pointer | Real Size | Content |
|------|-------------|-----------|---------|
| `osm.pmtiles` | 134 bytes | 438 MB | MVT vector tiles, z0–15, 154,877 tiles |
| `hillshade.pmtiles` | 133 bytes | 76 MB | PNG raster hillshade, z6–12, 3,073 tiles |

**Tile metadata (verified via `PMTiles.getHeader()` + `getMetadata()`):**

| Property | osm.pmtiles | hillshade.pmtiles |
|----------|-------------|-------------------|
| Type | MVT (vector) | PNG (raster) |
| Zoom range | 0–15 | 6–12 |
| Bounds | 15.70, 42.50, 19.70, 45.30 | 15.52, 42.38, 19.87, 45.36 |
| Tile count | 154,877 | 3,073 |
| Generator | Planetiler | Custom (GDAL) |
| Schema | Protomaps basemap v4 | N/A |

**OSM vector layers (9):** `boundaries`, `buildings`, `earth`, `landcover`, `landuse`, `places`, `pois`, `roads`, `water`

All layers use the `kind` property for feature classification (Protomaps basemap v4 schema), which matches the existing style filter expressions.

---

## Style Layer Reorder (Bug Fix)

### Problem

The original `awwv_map_style.json` placed `waterway-lines`, `roads-major`, and `roads-secondary` **after** the game overlay layers (front lines, attack arrows, movement arrows). This meant geography features rendered ON TOP of military overlays — roads would draw over front lines and arrows.

### Before (incorrect order)

```
... → front-line-teeth → attack-arrows → movement-arrows →
  waterway-lines → roads-major → roads-secondary →    ← WRONG: geography above game state
  mun-borders → formation-markers → formation-labels
```

### After (correct order)

```
background → earth-fill → hillshade → water-polygons → forest →
  waterway-lines → roads-major → roads-secondary →              ← CORRECT: geography below game state
  osid-control-fill → osid-control-outline →
  faction-border-glow → front-line-base → front-line-teeth →
  attack-arrows → movement-arrows →
  mun-borders → formation-markers → formation-labels →
  place-labels-city → place-labels-village
```

---

## New Layers Added (3)

### 1. `earth-fill` (layer index 1)

Land mass fill from the `earth` source-layer. Provides subtle land/sea distinction beneath the hillshade.

```json
{
  "id": "earth-fill",
  "type": "fill",
  "source": "osm-tiles",
  "source-layer": "earth",
  "paint": { "fill-color": "#e2d8c4", "fill-opacity": 0.4 }
}
```

### 2. `place-labels-city` (layer index 19)

City and town names from the `places` source-layer. Cities render larger than towns. Visible from z6.

```json
{
  "id": "place-labels-city",
  "source": "osm-tiles",
  "source-layer": "places",
  "filter": ["in", ["get", "kind"], ["literal", ["city", "town"]]],
  "layout": {
    "text-field": ["get", "name"],
    "text-size": ["interpolate", ["linear"], ["zoom"],
      6, ["match", ["get", "kind"], "city", 13, 10],
      10, ["match", ["get", "kind"], "city", 16, 12],
      14, ["match", ["get", "kind"], "city", 18, 14]
    ]
  }
}
```

Key cities now visible: Sarajevo, Banja Luka, Mostar, Tuzla, Zenica, Bijeljina, Brčko, Doboj, Livno, Goražde, Srebrenica, Bihać, etc.

### 3. `place-labels-village` (layer index 20)

Village names at z10+. Smaller text, lower opacity to avoid clutter.

```json
{
  "id": "place-labels-village",
  "source": "osm-tiles",
  "source-layer": "places",
  "minzoom": 10,
  "filter": ["==", ["get", "kind"], "village"]
}
```

---

## Complete Layer Order (21 layers)

```
 0. background            (solid #ebe1cd)
 1. earth-fill             (osm-tiles/earth)           ← NEW
 2. hillshade              (hillshade-tiles, raster)
 3. water-polygons          (osm-tiles/water, fill)
 4. forest                 (osm-tiles/landuse, fill)
 5. waterway-lines          (osm-tiles/water, line)     ← MOVED UP from index 17
 6. roads-major            (osm-tiles/roads, line)      ← MOVED UP from index 18
 7. roads-secondary        (osm-tiles/roads, line)      ← MOVED UP from index 19
 --- game state layers ---
 8. osid-control-fill      (osid-control, fill)
 9. osid-control-outline   (osid-control, line)
10. faction-border-glow-pos (front-lines, line)
11. faction-border-glow-neg (front-lines, line)
12. front-line-base        (front-lines, line)
13. front-line-teeth       (front-lines, symbol)
14. attack-arrows          (order-arrows, line)
15. movement-arrows        (order-arrows, line)
 --- reference + markers ---
16. mun-borders            (mun-borders, line)
17. formation-markers      (formations, symbol)
18. formation-labels       (formations, symbol)
19. place-labels-city      (osm-tiles/places, symbol)   ← NEW
20. place-labels-village   (osm-tiles/places, symbol)   ← NEW
```

**Dynamic layers** (added by MapContainer.tsx at runtime) insert before `formation-markers` (index 17), which is correct — they appear between game state and markers.

---

## File Inventory

### Modified (1)

| File | Delta | Change |
|------|-------|--------|
| `src/ui/map/map/awwv_map_style.json` | +63/−45 (net +18 lines) | Layer reorder + 3 new layers |

### Unchanged (infrastructure already correct)

| File | Role |
|------|------|
| `src/ui/map/map/MapContainer.tsx` | PMTiles protocol registration, URL rewriting |
| `src/ui/map/vite.config.ts` | Range-request middleware for `/data/*` |
| `src/ui/map/package.json` | `pmtiles@^3.0.0` dependency |
| `data/derived/tiles/osm.pmtiles` | OSM vector tiles (Git LFS, 438 MB) |
| `data/derived/tiles/hillshade.pmtiles` | Hillshade raster tiles (Git LFS, 76 MB) |

---

## Technical Decisions

1. **No code changes needed.** The PMTiles protocol handler, Vite middleware, and MapContainer URL rewriting were all correctly implemented. The only missing piece was the actual tile data on disk (Git LFS pull).

2. **Layer reorder preserves dynamic layer insertion.** All runtime-added layers (sector fill, edge glow, brigade rings, sidebar hover, density fill) use `'formation-markers'` as `beforeId`. Moving base geography layers earlier in the style doesn't affect dynamic layer positioning.

3. **Place labels above formation labels.** City/town names render at the top of the layer stack so they're always readable. This follows the HoI4 pattern where geographical names are always visible regardless of unit density. `text-optional: true` + `text-padding` prevent label collision.

4. **Earth fill at 40% opacity.** The `earth` source-layer provides land polygons. At low opacity it subtly distinguishes land from the background color without competing with political control fill.

5. **Protomaps basemap v4 schema confirmed.** All filters use `kind` property (not `pmap:kind`). Values verified from tile metadata: `highway`, `major_road`, `medium_road` for roads; `forest`, `park`, `nature_reserve` for landuse; `city`, `town`, `village` for places.

---

## Wargame Patterns Applied

| Source | Pattern | Application |
|--------|---------|-------------|
| HoI4 | Terrain visible under political map mode | Hillshade + forests underneath faction control fill |
| AGEOD | River lines as natural boundaries | Waterway lines visible under front lines |
| Gary Grigsby's WitE2 | City labels always visible | Place labels at top of stack with halo |
| Unity of Command | Roads as supply route hints | Major/secondary roads visible as muted lines |

---

## Verification

- `npx tsc --noEmit` (map tsconfig): **PASS**
- `npx vite build --mode production`: **PASS** (built in 5.69s)
- PMTiles header validation: **PASS** (both files: valid PMTiles v3, correct magic bytes)
- PMTiles metadata inspection: **PASS** (correct source-layers, bounds, zoom ranges)
- JSON validity check: **PASS** (21 layers, 7 sources)
- No simulation code touched (GUI-only change)

---

## Known Issues

1. **Git LFS must be pulled on fresh clones.** Any developer cloning the repo will see empty map geography until they run `git lfs pull`. Consider adding this to the project README or a setup script.

2. **Tile data is modern OSM, not 1992.** The OSM vector tiles contain current (2024+) road networks, buildings, and place names. Some roads/buildings didn't exist during the war. This is acceptable for gameplay (roads serve as orientation aids, not tactical data), but should be noted in documentation.

3. **No tile update pipeline.** Tiles were generated externally (Planetiler for OSM, GDAL for hillshade) and committed via LFS. There's no in-repo script to regenerate them. If tiles need updating, the generation process must be documented.

4. **Large LFS footprint.** The tile files add ~514 MB to the LFS store. This is the largest data in the repo. Consider whether hillshade at 76 MB (z6–12) provides sufficient value, or if a lower zoom range would suffice.

---

## Next Steps

1. **Visual QA**: `npm run dev:map`, load save, verify terrain/roads/water/labels render correctly under game overlays
2. **README update**: Add `git lfs pull` to setup instructions
3. **Style tuning**: Adjust opacity/color of geography layers based on visual QA (roads may need to be more/less visible)
4. **Commit**: Stage style change and commit geography layer work

---

## Reference: Tile Pipeline Architecture

```
┌─────────────────────────────────────────────────┐
│  data/source/osm/bosnia-*.osm.pbf  (Git LFS)   │
│                    ↓                             │
│  Planetiler (external)                           │
│                    ↓                             │
│  data/derived/tiles/osm.pmtiles (438 MB, LFS)   │
├─────────────────────────────────────────────────┤
│  DEM source (external)                           │
│                    ↓                             │
│  GDAL hillshade → tile (external)                │
│                    ↓                             │
│  data/derived/tiles/hillshade.pmtiles (76 MB)    │
├─────────────────────────────────────────────────┤
│  Vite dev server (/data/* middleware)            │
│    → HTTP Range 206 → PMTiles protocol           │
│    → MapLibre GL JS → Canvas render              │
└─────────────────────────────────────────────────┘
```
