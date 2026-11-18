# AWWV GUI Rework — Progress Report
**Date:** 2026-02-28
**Session:** Tile generation + MapLibre scaffold + visual tuning

---

## Completed

### Prerequisites (Step 0) ✅
- **tilemaker** v3.0.0 — installed at `C:\Tools\Tilemaker\`, in PATH
- **GDAL** 3.12.1 — installed at `C:\Program Files\GDAL\`, in PATH. `PROJ_DATA` env var should point to `C:\Program Files\GDAL\projlib` (set but may need verification — PROJ warnings still appeared in some commands)
- **pmtiles CLI** — Go binary installed, in PATH
- **Node.js** — already present
- **WGS84 data** — all confirmed present, no conversion needed

### Tile Generation (Step 1) ✅

#### 1A: Hillshade ✅
- **Source:** `data/source/dem/raw/copernicus_dem_glo30_raw.tiff` (Copernicus GLO-30, 30m resolution)
- **Pipeline:** `gdaldem hillshade` → `gdal_translate` (4× upscale to 10000px) → MBTiles → `gdaladdo` (overviews) → `pmtiles convert`
- **Output:** `data/derived/tiles/hillshade.pmtiles`
  - Zoom 6–12, 3,345 tiles, PNG format
  - Bounds: 15.52°E to 19.87°E, 42.38°N to 45.36°N (covers all of Bosnia)
- **Intermediate files cleaned up** (hillshade.tif, hillshade_4x.tif, .mbtiles all deleted)

#### 1B: OSM Vector Tiles ✅
- **Source:** `data/source/osm/bosnia-herzegovina-latest.osm.pbf`
- **Pipeline:** tilemaker binary had issues (version mismatch, "version not set"). Used **Protomaps daily build extract** instead:
  ```
  pmtiles extract https://build.protomaps.com/20260227.pmtiles data\derived\tiles\osm.pmtiles --bbox=15.7,42.5,19.7,45.3
  ```
- **Output:** `data/derived/tiles/osm.pmtiles`
  - Zoom 0–15, 173,244 tiles, MVT format, 459 MB
  - Protomaps basemap v4 schema (NOT OpenMapTiles)
  - OSM data from 2026-02-27
- **Important schema note:** Layer/property names differ from OpenMapTiles:
  - Roads: source-layer `roads`, property `kind` (values: `highway`, `major_road`, `medium_road`, `minor_road`, `other`)
  - Water: source-layer `water`, filter by `geometry-type` to separate polygons (lakes) from lines (rivers)
  - Landuse: source-layer `landuse`, property `kind` (values: `forest`, `park`, etc.)
  - Places: source-layer `places`
  - Boundaries: source-layer `boundaries`

#### 1C: OSID & Municipality Data ✅
- Already in WGS84, no work needed
- `data/derived/operational/operational_settlements.geojson` — 753 OSID polygons, WGS84
- `data/source/boundaries/bih_adm3_1990.geojson` — 110 municipality boundaries, WGS84
- `data/derived/operational/operational_political_control.json` — 753 controller assignments

### React + MapLibre Scaffold (Step 2) ✅
- New app scaffolded at `src/ui/map/` (Vite + React + TypeScript + Tailwind + MapLibre GL JS)
- Old UI archived to `src/_archived/ui_legacy/`
- Dev server: `npm run dev:map` → `localhost:3002`

#### Vite Configuration
- Custom middleware in `vite.config.ts` serves `data/` directory with **HTTP Range Request** support (required for PMTiles)
- `dataDir` path: `path.resolve(__dirname, '../../../data')` (three levels up from `src/ui/map/`)
- PMTiles protocol registered: `maplibregl.addProtocol('pmtiles', new Protocol().tile)`
- URL rewriting: `pmtiles:///path` → `pmtiles://localhost:3002/path`

#### Map Style (`awwv_map_style.json`)
- **Sources:** hillshade-tiles (raster PMTiles), osm-tiles (vector PMTiles), osid-control (GeoJSON), mun-borders (GeoJSON), front-lines (GeoJSON)
- **Layer order (bottom to top):**
  1. `background` — paper color `#ebe1cd`
  2. `hillshade` — raster terrain at 0.5 opacity over paper
  3. `water-polygons` — lakes/sea, fill, filtered to Polygon geometry
  4. `forest` — landuse polygons, kind in [forest, park, nature_reserve]
  5. `osid-control-fill` — 753 OSIDs with faction colors (RS red, RBiH green, HRHB blue) at alpha 0.25
  6. `osid-control-outline` — faint OSID borders at alpha 0.1
  7. `faction-border-glow` — soft faction-colored line where factions meet, uses `line-blur`
  8. `front-line-base` — thick dark line at faction boundaries
  9. `front-line-dash` — white dashed line on top (HoI-style barbed wire)
  10. `waterway-lines` — rivers/streams, filtered to LineString geometry
  11. `roads-major` — highways + major roads, subtle dark lines
  12. `roads-secondary` — medium roads, very subtle, minzoom 10
  13. `mun-borders` — municipality boundaries, dashed lines

### Political Control Layer (Step 3 partial) ✅
- OSID GeoJSON enriched with `controller` property from `operational_political_control.json`
- Data injected into style BEFORE map creation (avoids race condition with source initialization)
- Faction colors render correctly: RS=red (east/north), RBiH=green (center), HRHB=blue (west/south)
- Click handler logs all features at click point to console

### Front Line Generation ✅
- `generateFactionBorders.ts` computes shared edges between differently-controlled OSIDs
- Segments merged into longer LineStrings for smooth dash rendering
- Two rendering modes implemented:
  - Faction color glow (soft blurred line in faction color)
  - HoI-style dashed front (dark base + white dash on top)

---

## Known Issues

1. **PROJ warnings:** GDAL still shows `Cannot find proj.db` errors despite setting `PROJ_DATA`. The env var value was set to `C:\Program Files\GDAL\projlib\proj.db` (the file) instead of `C:\Program Files\GDAL\projlib` (the directory). Fix: update `PROJ_DATA` to the directory path, not the file path. Does not affect output quality.

2. **tilemaker broken on Windows:** The downloaded tilemaker binary reports "version not set" and silently produces no output. The Protomaps extract workaround works perfectly, but if you need to regenerate OSM tiles from local PBF in the future, either fix the tilemaker install (try Docker: `docker run ghcr.io/systemed/tilemaker:master`) or use the Protomaps daily build extract.

3. **Hillshade zoom ceiling:** Max zoom 12 from 4× upscaled 30m DEM. At zoom 13+ MapLibre will overzoom (stretch zoom-12 tiles). Looks acceptable — terrain appears smooth, not pixelated. If sharper terrain needed at extreme zoom, could go to 8× upscale but file size grows significantly.

4. **Front line chevron style:** User wants a HoI4-style colored barbed/chevron front line as a selectable option (in addition to current dashed style). Not yet implemented — requires either `symbol-placement: line` with custom sprites or geometry-based chevron generation. Deferred to visual polish phase.

---

## Not Yet Started

### Step 4: Game State Wiring
- Wire `GameStateAdapter.ts` and `DataLoader.ts` to new React app
- Create Zustand store with full game state
- Load/save game functionality
- Update map from game state (control colors, formations, orders)

### Step 5: UI Panels
- SelectionPanel, TopToolbar, OOBSidebar, FormationDetail
- MapModeToolbar, OrderQueue, AttackConfirmation
- WarSummaryModal, RecruitmentModal, ReplayScrubber

### Step 6: Electron Desktop Integration
- Wire IPC channels via `useIPC` hook
- Serve PMTiles from Electron (pmtiles protocol or custom scheme)

### Step 7: Visual Polish
- Selectable front line styles (dashed, chevron, colored barbed)
- City/town labels from OSM places layer
- Formation markers (NATO symbology sprites)
- Order arrows
- Fog of war
- CRT/warroom scanline overlay
- Hillshade contrast tuning
- Paper-tone warmth adjustment

---

## File Inventory

### New Files Created
| File | Purpose |
|------|---------|
| `data/derived/tiles/hillshade.pmtiles` | Hillshade terrain, zoom 6-12, ~20 MB |
| `data/derived/tiles/osm.pmtiles` | OSM vector tiles, zoom 0-15, ~459 MB |
| `src/ui/map/` | New React + MapLibre app (entire directory) |
| `src/ui/map/vite.config.ts` | Vite config with Range Request middleware |
| `src/ui/map/map/awwv_map_style.json` | MapLibre style specification |
| `src/ui/map/map/MapContainer.tsx` | Main map component |
| `src/ui/map/map/generateFactionBorders.ts` | Front line edge computation |
| `src/ui/map/store/gameStore.ts` | Zustand store (minimal) |

### Files Archived (not deleted)
| From | To |
|------|-----|
| `src/ui/map/*` (old) | `src/_archived/ui_legacy/` |

### Files Unchanged
- `src/sim/` — simulation engine (all 9 files)
- `src/state/` — game state (all 77 files)
- `src/scenario/` — scenario loading (all 16 files)
- `electron-main.cjs` — Electron main process
- `DESKTOP_GUI_IPC_CONTRACT.md` — IPC channel spec
- All `data/` files except new tiles

---

## Architecture Docs
- `AWWV_GUI_ARCHITECTURE_REWORK_v2.md` — full technical spec (updated with confirmed file paths)
- `AWWV_Implementation_Guide.docx` — step-by-step guide (updated with confirmed data state)

---

## Key Decisions Made
1. **MapLibre GL JS** over deck.gl (WGS84 data available, real terrain, industry-standard)
2. **Protomaps daily build extract** over local tilemaker (tilemaker Windows binary broken, extract gives identical result)
3. **OSID data injected into style before map creation** (avoids race condition vs. post-load setData)
4. **Protomaps v4 schema** (not OpenMapTiles) — property names differ: `kind` not `pmap:kind`, water layer has both polygons and lines
5. **Front lines computed client-side** from OSID contact edges (not pre-generated) — allows dynamic updates when control changes
