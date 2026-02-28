# AWWV GUI Architecture Rework v2

**Project:** A War Without Victory  
**Date:** 27 February 2026  
**Status:** Approved direction — for agent implementation  
**Author:** Haris (via Claude Opus 4.6 architecture session)  
**Audience:** All repo agents, desktop agent, UI/UX agent, orchestrator  
**Supersedes:** AWWV_GUI_ARCHITECTURE_REWORK.md v1 (same date; deck.gl version)

**Source of truth:** The **React + MapLibre map app** in `src/ui/map/` (Vite, React, Tailwind, Zustand, MapContainer) is the **canonical GUI**. All GUI work must be applied to this app. Run it via `npm run dev:map`. The legacy HoI 3D stack (`map_hoi.html`), tactical map (`tactical_map.html`), and other archived renderers are **not** targets for new work.

---

## 0. Implementation Status (vs this document)

*This section tracks what exists in the React map app relative to §5.2 Component Inventory and §8 Migration Plan. Update as work completes. Implementation priorities follow **HOI_VISUAL_GUI_OVERHAUL_SPEC.md** §10 (Phase A/B complete; **Phase C complete** 2026-02-28).*

**Document roles:** **HOI_VISUAL_GUI_OVERHAUL_SPEC.md** (in `docs/30_planning/20260221_settlement remapping and GUI rework/`) is the **aesthetic and design authority** for look-and-feel, sidebar structure (Army / SITUATION tabs), and panel interaction patterns (§3.8). This document (v2) is the **implementation reference** — stack, components, migration plan, and status.

| Area | Done | Not yet |
|------|------|--------|
| **Phase 1 (Scaffold + Map)** | Vite + React + MapLibre; `awwv_map_style.json`; MapContainer; OSID control layer; front lines; formations; order arrows; PMTiles/base map | — |
| **Phase 2 (Game state)** | Load save → store; GeoJSON builders (control, front lines, formations, order arrows); formations + orders on map | — |
| **Phase 3 (UI panels)** | TopToolbar, BottomStatusStrip, SelectionPanel (Settlement Info, OSID humanized), FormationDetail, OOBSidebar, CorpsCard, BrigadeRow; click OSID/formation → panels; Storybook. **Phase A complete:** §9.2 panel palette, headers, faction gradient TopToolbar, BrigadeRow cohesion bars + supply dots. **Phase B complete:** tabbed sidebar (Army/Situation), Situation tab, front on CorpsCard, Reserve, stance controls, hover preview, Escape clears selection. **Phase C complete (2026-02-28):** Rich tooltips (§7), MapModeToolbar + MapLayerToggles (bottom-right), useKeyboardShortcuts (Enter, 1–4, Escape), AttackConfirmation modal, OrderQueue. | Minimap, ZoomControls; CorpsDetail, ArmyDetail; MovementPreview |
| **Phase 4 (Desktop)** | — | useIPC; advance-turn, order staging, recruitment; SidePickerOverlay; fog-of-war; PMTiles in Electron |
| **Phase 5 (Polish)** | — | ZoC overlay, battle markers, War Summary modal, Replay scrubber, Attack confirmation with odds, Movement preview, visual sign-off |

---

## 0. What Changed from v1

v1 recommended **deck.gl with OrthographicView** because the document assumed all settlement data was in a custom SVG coordinate space. Haris confirmed that **all geographic data is also available in WGS84 lat/lng** — settlement polygons, municipality boundaries, OSM PBF, and DEM elevation data.

This changes the optimal map renderer from deck.gl to **MapLibre GL JS**, which gives us:

- **Real terrain** — hillshaded DEM underneath the political control layer
- **Real geographic base map** — OSM roads, rivers, forests, buildings from vector tiles
- **Vector tile rendering** — GPU-accelerated, smooth zoom, automatic LOD
- **Style-driven rendering** — change the entire map appearance via a JSON style spec, not code
- **Industry-standard tooling** — massive ecosystem, well-documented, battle-tested

The UI layer (React + Tailwind + Zustand) is unchanged from v1. Only the map layer changes.

---

## 1. Why This Document Exists

The current GUI and map rendering stack contains **three parallel rendering paths** (2D Canvas tactical map, Three.js 3D operational map, HoI-style renderer), **hand-rolled UI** (raw DOM manipulation, class-based components without a framework), and a **2,600+ line monolithic orchestrator** (MapApp.ts). The result works but is fragile, slow to iterate on, and expensive to maintain.

This document defines a **new architecture** that:

1. Replaces all three rendering paths with **one map renderer** (MapLibre GL JS)
2. Replaces hand-rolled UI with **React + Tailwind CSS**
3. Preserves the existing **simulation engine, IPC contract, and data pipeline** untouched
4. Gives Haris a workflow where visual iteration happens through **Claude-generated React components and MapLibre style edits** rather than manual Canvas/Three.js code

**The simulation engine (`src/sim/`, `src/state/`, `src/scenario/`) is NOT touched by this rework.** Only `src/ui/` changes.

---

## 2. What We Are Replacing

### 2.1 Files Being Retired

Everything under `src/ui/map/` is replaced. The following are **archived, not deleted** (move to `src/_archived/ui_legacy/`):

| Current file/dir | Lines | Why it's being replaced |
|------------------|------:|------------------------|
| `MapApp.ts` | ~2,640 | Monolithic orchestrator mixing rendering, interaction, state, UI |
| `tactical_map.html` | ~200 | Raw HTML entry point |
| `map_hoi.html` + `map_hoi.ts` | ~170 | Parallel HoI entrypoint |
| `map_hoi/*.ts` | ~800 | Class-based UI components (TopCommandBar, ArmySidebar, CorpsCard, etc.) |
| `renderer/HoIMapRenderer.ts` | ~530 | Three.js 2.5D renderer |
| `map_operational_3d.ts` | varies | 3D operational map |
| `tactical_sandbox.ts` | varies | Sandbox viewer |
| `state/MapState.ts` | 164 | Hand-rolled pub/sub state |
| `geo/MapProjection.ts` | 182 | Custom coordinate transforms (MapLibre handles this) |
| `geo/SpatialIndex.ts` | 102 | Spatial index for hit testing (MapLibre handles this) |
| `styles/tactical-map.css` | ~400 | Will be replaced by Tailwind + CSS module |
| `styles_hoi.css` | ~250 | HoI warm palette styles |

### 2.2 Files Being Preserved

| Current file/dir | Why it stays |
|------------------|-------------|
| `data/DataLoader.ts` | Data fetching logic is sound; will be adapted to new module structure |
| `data/GameStateAdapter.ts` | Parses GameState into view models; will be imported by React layer |
| `data/ControlLookup.ts` | SID key normalization; no change needed |
| `types.ts` | Shared TypeScript interfaces; will be extended, not replaced |
| `constants.ts` | Color tokens and theme values; will be migrated into Tailwind config and MapLibre style |

### 2.3 What We Are NOT Replacing

| System | Status |
|--------|--------|
| Simulation engine (`src/sim/`) | **Untouched** |
| Game state (`src/state/`) | **Untouched** |
| Scenario loading (`src/scenario/`) | **Untouched** |
| Electron main process (`src/desktop/electron-main.cjs`) | **Untouched** — IPC contract stays identical |
| IPC contract (`DESKTOP_GUI_IPC_CONTRACT.md`) | **Untouched** — all channel names, payloads, and behaviors preserved |
| Data pipeline (`scripts/map/`, `data/derived/`) | **Extended** — new tile generation step added (see §4.4) |
| Warroom (`src/ui/warroom/`) | **Separate effort** — not part of this rework |
| `src/map/nato_tokens.ts` | **Untouched** — canonical color source |

---

## 3. New Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                      Electron Shell                       │
│               (electron-main.cjs — unchanged)             │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                React Application                      │ │
│  │           (Vite + React + Tailwind CSS)               │ │
│  │                                                        │ │
│  │  ┌──────────────┐  ┌───────────────────────────────┐ │ │
│  │  │  Game State   │  │       React UI Layer           │ │ │
│  │  │  (Zustand)    │  │                                 │ │ │
│  │  │              │  │  TopBar / Toolbar                │ │ │
│  │  │  - gameState │  │  OOB Sidebar                    │ │ │
│  │  │  - uiState   │  │  Settlement Panel               │ │ │
│  │  │  - mapMode   │  │  Corps/Brigade Cards            │ │ │
│  │  │  - selection │  │  Order Queue                    │ │ │
│  │  │              │  │  War Summary Modal              │ │ │
│  │  └──────┬───────┘  │  AAR / Replay Scrubber          │ │ │
│  │         │           │  Attack Confirmation            │ │ │
│  │         │           │  Recruitment Modal              │ │ │
│  │         ▼           └───────────────────────────────┘ │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │           MapLibre GL JS Map Layer                 │ │ │
│  │  │                                                    │ │ │
│  │  │  ┌─── Base Tile Layers (style-driven) ──────────┐│ │ │
│  │  │  │  Hillshade raster  — DEM terrain relief       ││ │ │
│  │  │  │  OSM vector tiles  — roads, rivers, forests   ││ │ │
│  │  │  │  BiH boundary      — national border          ││ │ │
│  │  │  └───────────────────────────────────────────────┘│ │ │
│  │  │                                                    │ │ │
│  │  │  ┌─── Game Data Layers (GeoJSON sources) ───────┐│ │ │
│  │  │  │  OSID polygons     — political control fill   ││ │ │
│  │  │  │  Municipality lines — 1990 opštine borders    ││ │ │
│  │  │  │  Front lines       — hostile boundary edges   ││ │ │
│  │  │  │  Formation markers  — NATO symbology icons    ││ │ │
│  │  │  │  Order arrows       — attack/movement paths   ││ │ │
│  │  │  │  ZoC overlay        — zone of control fill    ││ │ │
│  │  │  │  Labels             — city/town names         ││ │ │
│  │  │  │  Battle markers     — control change events   ││ │ │
│  │  │  └───────────────────────────────────────────────┘│ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │         IPC Bridge (unchanged contract)           │ │ │
│  │  │   advance-turn, stage-attack-order, etc.          │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 3.1 Three Layers, Clean Separation

1. **State Layer (Zustand store):** Holds game state (from IPC or file load), UI state (selection, mode, zoom), and derived view state. Replaces `MapState.ts` pub/sub. Single source of truth.

2. **UI Layer (React + Tailwind):** All panels, modals, toolbars, sidebars. Pure React components that read from Zustand and dispatch actions (IPC calls, state updates). Replaces all DOM manipulation in MapApp.ts and the class-based HoI components.

3. **Map Layer (MapLibre GL JS):** All geographic rendering. **Two tiers of content:**
   - **Base tiles** (terrain, roads, rivers, land cover) — rendered from pre-generated vector/raster tiles via a MapLibre style spec. Static. Beautiful. Free performance.
   - **Game data** (political control, front lines, formations, orders) — rendered from GeoJSON sources that update each turn. Dynamic. Driven by game state.

---

## 4. The Map Layer: MapLibre GL JS (The Heart of the Game)

This is where we spare no expense. The map is the central visual element of the game. With your full WGS84 data stack, we can build something that looks like a real military operations map draped over real Bosnian terrain.

### 4.1 Why MapLibre GL JS

| Requirement | How MapLibre meets it |
|-------------|----------------------|
| Real terrain visualization | Raster hillshade tiles from DEM — actual mountains, valleys, ridges visible |
| Geographic roads and rivers | OSM vector tiles — real road network, real rivers, real forests and land use |
| 753 OSID polygons with dynamic fill | GeoJSON source + `fill` layer with data-driven `fill-color` |
| Front lines along hostile boundaries | GeoJSON source + `line` layer with per-feature styling |
| Formation markers (NATO symbology) | GeoJSON source + `symbol` layer with icon atlas |
| Smooth continuous zoom | Native — MapLibre invented this. Butter-smooth at any zoom level |
| Click detection on everything | Built-in `queryRenderedFeatures()` — no spatial index needed |
| Order arrows | GeoJSON source + `line` layer with arrows via `symbol` placement along lines |
| ZoC / AoR overlays | Additional GeoJSON source + `fill` layer with translucent paint |
| Labels with automatic collision avoidance | `symbol` layer with `text-field` — MapLibre handles declutter, priority, overlap |
| Style-driven visual changes | Change colors, widths, visibility via JSON style spec — no code changes |
| Offline / Electron friendly | Self-hosted tiles; no external tile server needed |
| 60fps performance | WebGL2 vector tile rendering; thousands of features trivially |

### 4.2 The Tile Pipeline (One-Time Build Step)

We need to convert your source data into tiles that MapLibre can render. This is a **build step**, not a runtime operation. Run once (or when source data changes), output to `data/derived/tiles/`.

#### 4.2.1 Hillshade Raster Tiles (from DEM)

```bash
# Input: data/source/dem/raw/*.tif (your DEM files)
# Output: data/derived/tiles/hillshade/{z}/{x}/{y}.png

# Step 1: Generate hillshade from DEM
gdaldem hillshade data/source/dem/raw/bih_dem.tif data/derived/tiles/hillshade_raw.tif \
  -z 2.0 -az 315 -alt 45

# Step 2: Slice into tiles using gdal2tiles or rio-mbtiles
# Option A: Directory of PNGs
gdal2tiles.py --zoom=6-14 --processes=4 \
  data/derived/tiles/hillshade_raw.tif data/derived/tiles/hillshade/

# Option B: Single PMTiles file (preferred — one file, no directory mess)
# Use pmtiles CLI or rio-mbtiles → pmtiles convert
rio mbtiles data/derived/tiles/hillshade_raw.tif data/derived/tiles/hillshade.mbtiles \
  --zoom-levels 6..14
pmtiles convert data/derived/tiles/hillshade.mbtiles data/derived/tiles/hillshade.pmtiles
```

**PMTiles** is the recommended format — it's a single file that MapLibre can read directly via HTTP range requests. No tile server needed. Perfect for Electron (serve from local filesystem).

#### 4.2.2 OSM Vector Tiles (from PBF)

```bash
# Input: data/source/osm/bosnia-herzegovina-latest.osm.pbf
# Output: data/derived/tiles/osm.pmtiles

# Use tilemaker (fast, single binary, OSM PBF → PMTiles directly)
tilemaker \
  --input data/source/osm/bosnia-herzegovina-latest.osm.pbf \
  --output data/derived/tiles/osm.pmtiles \
  --config scripts/map/tilemaker_config.json \
  --process scripts/map/tilemaker_process.lua

# Alternative: planetiler (Java, very fast for large extracts)
# java -jar planetiler.jar --osm-path=data/source/osm/bosnia-herzegovina-latest.osm.pbf \
#   --output=data/derived/tiles/osm.pmtiles --area=bosnia-herzegovina
```

The tilemaker config controls which OSM features are included and at which zoom levels. For AWWV, we want:

- **Roads:** motorway, trunk, primary, secondary, tertiary (no residential/service — too noisy)
- **Rivers/streams:** waterway=river, waterway=stream (larger ones only)
- **Water bodies:** natural=water, landuse=reservoir
- **Forests:** landuse=forest, natural=wood
- **Built-up areas:** landuse=residential (at higher zoom only)
- **National boundary:** admin_level=2

This gives us the geographic context without overwhelming the political control layer.

#### 4.2.3 OSID Polygons in WGS84 — Already Done

The **753 OSID polygons are already in WGS84.** The file `data/derived/operational/operational_settlements.geojson` contains 753 features with WGS84 lat/lng coordinates (confirmed: first feature at `[16.15, 44.56]`). The derive pipeline (`scripts/derive_operational_settlements.ts`) reads from WGS84 source (`data/derived/settlements_wgs84_1990.geojson`) and outputs WGS84. No reprojection or re-merge is needed.

**Action:** Either reference the existing path directly in the MapLibre style, or create a symlink/copy for naming clarity:

```bash
# Option A: symlink for naming consistency (recommended)
ln -s operational_settlements.geojson data/derived/operational/operational_settlements_wgs84.geojson

# Option B: reference the existing file directly in awwv_map_style.json
# "data": "data/derived/operational/operational_settlements.geojson"
```

Similarly, the **1990 municipality boundaries** are already WGS84 at `data/source/boundaries/bih_adm3_1990.geojson` (110 features). Reference this file directly in the MapLibre style rather than creating a new derived copy.

#### 4.2.4 File Outputs

| File | Format | Size (est.) | Contents |
|------|--------|-------------|----------|
| `data/derived/tiles/hillshade.pmtiles` | PMTiles (raster) | ~50-200 MB | Hillshade terrain z6-14 |
| `data/derived/tiles/osm.pmtiles` | PMTiles (vector) | ~20-80 MB | Roads, rivers, forests, boundary |
| `data/derived/operational/operational_settlements.geojson` | GeoJSON | ~2 MB | **Already exists.** 753 OSID polygons in WGS84 |
| `data/source/boundaries/bih_adm3_1990.geojson` | GeoJSON | ~1 MB | **Already exists.** 110 municipality boundaries in WGS84 |

### 4.3 MapLibre Style Spec (The Visual Heart)

MapLibre renders everything according to a **style spec** — a JSON document that defines sources, layers, and their visual properties. This is where the map's look is defined. Changing the style changes the entire visual output without touching any code.

```jsonc
// awwv_map_style.json — simplified structure
{
  "version": 8,
  "name": "AWWV Operations Map",
  "glyphs": "fonts/{fontstack}/{range}.pbf",
  "sprite": "sprites/nato",

  "sources": {
    // ── Base tile sources (static) ──
    "hillshade-source": {
      "type": "raster-dem",
      "url": "pmtiles://data/derived/tiles/hillshade.pmtiles",
      "tileSize": 256
    },
    "osm-source": {
      "type": "vector",
      "url": "pmtiles://data/derived/tiles/osm.pmtiles"
    },

    // ── Game data sources (dynamic, updated from game state) ──
    "osid-control": {
      "type": "geojson",
      "data": { "type": "FeatureCollection", "features": [] }
    },
    "front-lines": {
      "type": "geojson",
      "data": { "type": "FeatureCollection", "features": [] }
    },
    "formations": {
      "type": "geojson",
      "data": { "type": "FeatureCollection", "features": [] }
    },
    "order-arrows": {
      "type": "geojson",
      "data": { "type": "FeatureCollection", "features": [] }
    },
    "mun-borders": {
      "type": "geojson",
      "data": "data/source/boundaries/bih_adm3_1990.geojson"
    }
  },

  "layers": [
    // ── 1. Terrain hillshade (bottom) ──
    {
      "id": "hillshade",
      "type": "hillshade",
      "source": "hillshade-source",
      "paint": {
        "hillshade-exaggeration": 0.3,
        "hillshade-shadow-color": "#3a3226",
        "hillshade-highlight-color": "#f5eed8",
        "hillshade-accent-color": "#5c4a32"
      }
    },

    // ── 2. Paper-tone background tint ──
    {
      "id": "background",
      "type": "background",
      "paint": {
        "background-color": "#ebe1cd",
        "background-opacity": 0.4
      }
    },

    // ── 3. Forests / land use (from OSM) ──
    {
      "id": "forest",
      "type": "fill",
      "source": "osm-source",
      "source-layer": "landuse",
      "filter": ["in", "class", "forest", "wood"],
      "paint": {
        "fill-color": "#b5c9a0",
        "fill-opacity": 0.15
      }
    },

    // ── 4. Water bodies (from OSM) ──
    {
      "id": "water",
      "type": "fill",
      "source": "osm-source",
      "source-layer": "water",
      "paint": {
        "fill-color": "rgb(100, 150, 200)",
        "fill-opacity": 0.5
      }
    },

    // ── 5. Rivers (from OSM) ──
    {
      "id": "rivers",
      "type": "line",
      "source": "osm-source",
      "source-layer": "waterway",
      "paint": {
        "line-color": "rgb(100, 150, 200)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.5, 12, 2.5],
        "line-opacity": 0.7
      }
    },

    // ── 6. OSID political control fill (GAME DATA) ──
    {
      "id": "osid-control-fill",
      "type": "fill",
      "source": "osid-control",
      "paint": {
        "fill-color": [
          "match", ["get", "controller"],
          "RS",   "rgba(180, 50, 50, 0.55)",
          "RBiH", "rgba(55, 140, 75, 0.55)",
          "HRHB", "rgba(50, 110, 170, 0.55)",
          "rgba(60, 60, 70, 0.25)"
        ],
        "fill-opacity": 0.65
      }
    },

    // ── 7. OSID polygon outlines ──
    {
      "id": "osid-control-outline",
      "type": "line",
      "source": "osid-control",
      "paint": {
        "line-color": "rgba(40, 40, 50, 0.3)",
        "line-width": 0.5
      }
    },

    // ── 8. Municipality borders (1990 opštine) ──
    {
      "id": "mun-borders",
      "type": "line",
      "source": "mun-borders",
      "paint": {
        "line-color": "rgba(80, 60, 40, 0.35)",
        "line-width": 1.5,
        "line-dasharray": [4, 2]
      },
      "layout": {
        "visibility": "visible"
      }
    },

    // ── 9. Roads (from OSM) ──
    {
      "id": "roads-major",
      "type": "line",
      "source": "osm-source",
      "source-layer": "transportation",
      "filter": ["in", "class", "motorway", "trunk", "primary"],
      "paint": {
        "line-color": "#A0A0A0",
        "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.8, 12, 3],
        "line-opacity": 0.6
      }
    },
    {
      "id": "roads-secondary",
      "type": "line",
      "source": "osm-source",
      "source-layer": "transportation",
      "filter": ["in", "class", "secondary", "tertiary"],
      "paint": {
        "line-color": "#D0D0D0",
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.3, 14, 1.5],
        "line-opacity": 0.4
      },
      "minzoom": 8
    },

    // ── 10. Front lines (GAME DATA) ──
    {
      "id": "front-lines-glow",
      "type": "line",
      "source": "front-lines",
      "paint": {
        "line-color": "rgba(255, 200, 100, 0.25)",
        "line-width": 8,
        "line-blur": 4
      }
    },
    {
      "id": "front-lines",
      "type": "line",
      "source": "front-lines",
      "paint": {
        "line-color": [
          "match", ["get", "side_a"],
          "RS",   "rgb(180, 50, 50)",
          "RBiH", "rgb(55, 140, 75)",
          "HRHB", "rgb(50, 110, 170)",
          "#ffffff"
        ],
        "line-width": 2.5,
        "line-dasharray": [3, 2]
      }
    },

    // ── 11. Order arrows (GAME DATA) ──
    {
      "id": "attack-arrows",
      "type": "line",
      "source": "order-arrows",
      "filter": ["==", ["get", "type"], "attack"],
      "paint": {
        "line-color": "rgba(220, 50, 50, 0.8)",
        "line-width": 3
      }
    },
    {
      "id": "movement-arrows",
      "type": "line",
      "source": "order-arrows",
      "filter": ["==", ["get", "type"], "movement"],
      "paint": {
        "line-color": "rgba(50, 200, 50, 0.6)",
        "line-width": 2,
        "line-dasharray": [4, 3]
      }
    },

    // ── 12. Formation markers (GAME DATA) ──
    {
      "id": "formation-markers",
      "type": "symbol",
      "source": "formations",
      "layout": {
        "icon-image": ["concat", ["get", "kind"], "-", ["get", "faction"]],
        "icon-size": ["interpolate", ["linear"], ["zoom"],
          6, 0.4,
          10, 0.8,
          14, 1.2
        ],
        "icon-allow-overlap": false,
        "icon-ignore-placement": false,
        "icon-padding": 4,
        "symbol-sort-key": [
          "match", ["get", "kind"],
          "army_hq", 0,
          "corps", 1,
          "brigade", 2,
          3
        ]
      },
      "paint": {
        "icon-opacity": 1.0
      }
    },

    // ── 13. City/town labels ──
    {
      "id": "labels-cities",
      "type": "symbol",
      "source": "osid-control",
      "filter": ["==", ["get", "nato_class"], "URBAN_CENTER"],
      "layout": {
        "text-field": ["get", "display_name"],
        "text-font": ["IBM Plex Mono Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 6, 10, 12, 16],
        "text-anchor": "top",
        "text-offset": [0, 0.5],
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "text-optional": true
      },
      "paint": {
        "text-color": "#2a2420",
        "text-halo-color": "rgba(235, 225, 205, 0.85)",
        "text-halo-width": 2
      }
    },
    {
      "id": "labels-towns",
      "type": "symbol",
      "source": "osid-control",
      "filter": ["==", ["get", "nato_class"], "TOWN"],
      "minzoom": 9,
      "layout": {
        "text-field": ["get", "display_name"],
        "text-font": ["IBM Plex Mono Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 8, 14, 13],
        "text-anchor": "top",
        "text-offset": [0, 0.4],
        "text-allow-overlap": false,
        "text-optional": true
      },
      "paint": {
        "text-color": "#3a3530",
        "text-halo-color": "rgba(235, 225, 205, 0.75)",
        "text-halo-width": 1.5
      }
    }
  ]
}
```

**What this style gives you:** Real hillshaded terrain with a paper-tone wash, OSM forests as subtle green areas, real rivers and water bodies, real roads at correct geographic positions, political control draped over all of this as translucent faction-colored polygons, front lines with amber glow, NATO formation markers with automatic collision avoidance, and city/town labels with paper-colored halos that never overlap.

**To change any visual property**, edit the style JSON. No code changes. No rebuild. The map hot-reloads.

### 4.4 Dynamic Game Data Updates

MapLibre GeoJSON sources can be updated at runtime. When game state changes (turn advance, order staged, save loaded), we update the relevant sources:

```typescript
// hooks/useMapSources.ts — simplified

function updateMapFromGameState(map: maplibregl.Map, state: LoadedGameState) {
  // 1. Update OSID political control
  const osidSource = map.getSource('osid-control') as GeoJSONSource;
  osidSource.setData(buildControlGeoJSON(state));

  // 2. Update front lines
  const frontSource = map.getSource('front-lines') as GeoJSONSource;
  frontSource.setData(buildFrontLinesGeoJSON(state));

  // 3. Update formations
  const formSource = map.getSource('formations') as GeoJSONSource;
  formSource.setData(buildFormationsGeoJSON(state));

  // 4. Update order arrows
  const orderSource = map.getSource('order-arrows') as GeoJSONSource;
  orderSource.setData(buildOrderArrowsGeoJSON(state));
}

function buildControlGeoJSON(state: LoadedGameState): FeatureCollection {
  // Take OSID polygons, inject current controller as property
  return {
    type: 'FeatureCollection',
    features: osidFeatures.map(f => ({
      ...f,
      properties: {
        ...f.properties,
        controller: state.controlByOsid[f.properties.osid] ?? null,
      }
    }))
  };
}
```

This is **dramatically simpler** than the current rendering pipeline. No render loops. No offscreen canvas caching. No manual polygon drawing. You set data, MapLibre renders it.

### 4.5 Interaction Handling

```typescript
// Map click handling
map.on('click', 'osid-control-fill', (e) => {
  const feature = e.features?.[0];
  if (feature) {
    store.selectOsid(feature.properties.osid);
  }
});

map.on('click', 'formation-markers', (e) => {
  const feature = e.features?.[0];
  if (feature) {
    store.selectFormation(feature.properties.id);
  }
});

// Hover
map.on('mousemove', 'osid-control-fill', (e) => {
  map.getCanvas().style.cursor = 'pointer';
  store.hoverOsid(e.features?.[0]?.properties.osid);
});

map.on('mouseleave', 'osid-control-fill', () => {
  map.getCanvas().style.cursor = '';
  store.hoverOsid(null);
});
```

No spatial index. No hit-test radius. No `getFormationAtScreenPos()`. MapLibre handles all of this through its render-based picking.

### 4.6 Serving Tiles in Electron

MapLibre needs to fetch tiles. In Electron, we serve them locally:

**Option A: PMTiles protocol (recommended).** The `pmtiles` npm package provides a protocol handler that reads directly from `.pmtiles` files. No HTTP server needed. MapLibre supports custom protocols:

```typescript
import { PMTiles, Protocol } from 'pmtiles';

const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

// Sources reference local files via pmtiles:// protocol
// "url": "pmtiles://data/derived/tiles/hillshade.pmtiles"
```

**Option B: Use the existing `awwv://` protocol.** Extend `electron-main.cjs` to serve tile files from `data/derived/tiles/` when the path matches `awwv://tiles/*`. This works but requires more boilerplate.

**Recommendation: Option A.** PMTiles protocol is zero-config and designed exactly for this use case.

### 4.7 Visual Quality Goals

The map should look like a **military operations map on a general's desk** — real topography visible through translucent political control overlays, with professional cartographic labels and NATO-standard formation markers.

1. **Real terrain:** Hillshade gives depth. Mountains around Sarajevo, the Drina valley, the Posavina corridor — all visible as actual geographic features, not flat colored polygons.
2. **Paper-tone wash over terrain:** The `#ebe1cd` background at 40% opacity over hillshade creates the aged-map look while preserving terrain visibility.
3. **Faction colors as translucent overlays:** Settlement polygons at 55-65% alpha let terrain show through. You see that RS controls mountainous eastern Bosnia; you see that the Posavina corridor is flat farmland.
4. **Real infrastructure:** OSM roads show the actual road network. Supply routes become visually obvious — you can see why the Posavina corridor matters, why the road from Sarajevo to Goražde is critical.
5. **Real hydrography:** OSM rivers and water bodies. The Drina, the Neretva, the Bosna, the Sava — all rendered from actual geographic data.
6. **Front lines as active boundaries:** Amber glow + faction-colored dashed line over the terrain. You can see that front lines follow ridgelines and river valleys.
7. **NATO symbology:** MIL-STD-2525 rectangles with proper unit size indicators, positioned at OSID centroids. MapLibre handles collision avoidance automatically.
8. **Cartographic labels:** Real place names at geographically correct positions, with paper-colored halos for readability, automatically decluttered by zoom level.

### 4.8 What MapLibre Gives Us for Free

Things we currently hand-code that become automatic:

- **Terrain visualization** — impossible with Canvas 2D; trivial with MapLibre hillshade
- **Viewport culling** — only renders tiles and features in view
- **Smooth continuous zoom** — not 3 discrete levels; butter-smooth with LOD
- **Label collision avoidance** — no more `computePrimaryLabels()` dedup logic
- **Hit testing / picking** — per-feature click/hover via `queryRenderedFeatures()`
- **WebGL acceleration** — all rendering on GPU
- **Layer composition** — z-ordering, blending, transparency handled correctly
- **Resize handling** — automatic
- **Coordinate transforms** — WGS84 ↔ screen pixels handled natively
- **Touch support** — pinch-zoom, rotate on mobile/tablet for free

### 4.9 Coordinate System Migration

**The SVG coordinate space is no longer the rendering coordinate system.** All map rendering uses WGS84. The implications:

- `data/derived/operational/operational_settlements.geojson` is already in WGS84 — **753 OSID polygons in lat/lng, ready to use**
- No SVG→WGS84 conversion needed; the derive pipeline already outputs WGS84
- `operational_settlements.geojson` (existing, SVG coords) remains for simulation (topology/adjacency — coordinate-independent)
- `canonical_to_operational_map.json` is unchanged (OSID mapping is ID-based, not coordinate-based)
- The simulation engine never uses coordinates for gameplay — it uses the contact graph (adjacency). **No simulation changes needed.**
- Centroids for formation marker placement are computed from WGS84 OSID polygons instead of SVG OSID polygons
- Individual canonical settlements (5,823) are **not rendered on the map**. The map unit is the OSID. Settlement-level detail (population, ethnicity) is aggregated per OSID and shown in the UI panels, not on the map.

### 4.10 deck.gl Integration (Optional, for Advanced Overlays)

MapLibre and deck.gl can be used together via `@deck.gl/mapbox` (works with MapLibre). If any overlay proves too complex for MapLibre's built-in layer types (e.g. animated ZoC pulses, complex arrow geometries), we can add individual deck.gl layers on top of the MapLibre base map without replacing the entire renderer. This is a fallback, not the primary path.

---

## 5. The UI Layer: React + Tailwind

*Unchanged from v1 — see v1 §5 for full detail. Summary below.*

### 5.1 Stack

- **React 18** — UI framework. Claude generates components fluently.
- **Tailwind CSS** — Utility classes with AWWV theme tokens (`bg-faction-rs`, `font-mono`, `text-text-primary`).
- **Zustand** — Lightweight state management. Single store for game state + UI state.

### 5.2 Component Inventory

Same as v1 §5.3. Full component list:

**Layout:** `AppShell`, `TopToolbar`, `BottomStatusStrip`  
**Map overlays:** `MapModeToolbar`, `MapLayerToggles`, `Minimap`, `ZoomControls`  
**Right panel:** `SelectionPanel`, `SettlementDetail`, `FormationDetail`, `CorpsDetail`, `ArmyDetail`  
**Left sidebar:** `OOBSidebar`, `CorpsCard`, `BrigadeRow`  
**Orders:** `OrderQueue`, `AttackConfirmation`, `MovementPreview`  
**Modals:** `WarSummaryModal`, `RecruitmentModal`, `MainMenu`, `SidePickerOverlay`  
**Replay:** `ReplayScrubber`

### 5.3 Tailwind Theme

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        paper: '#ebe1cd',
        'panel-bg': '#1a1c22',
        'panel-border': '#2a2d35',
        'panel-header': '#22252c',
        'faction-rs': 'rgb(180, 50, 50)',
        'faction-rbih': 'rgb(55, 140, 75)',
        'faction-hrhb': 'rgb(50, 110, 170)',
        'accent-phosphor': '#33ff66',
        'text-primary': '#e0dcd4',
        'text-secondary': '#a0a0a0',
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        sans: ['IBM Plex Sans Condensed', 'sans-serif'],
      },
    },
  },
};
```

### 5.4 IPC Integration

Same as v1 §5.5. All IPC channels from `DESKTOP_GUI_IPC_CONTRACT.md` wrapped in a `useIPC()` hook. No channel names change. No payload shapes change.

### 5.5 Implementation Notes (panel positioning, hover preview, dev UX)

- **Overlay panel positioning:** Use **inline styles** as the source of truth for overlay panels (e.g. SelectionPanel): `position: absolute`, `left: auto`, `right`, `top`, `bottom`, `width`, `zIndex`, `direction: ltr`. This prevents Tailwind purge or RTL from overriding placement. Do not rely on Tailwind classes alone for overlay position.
- **Dev layout verification:** When `import.meta.env.DEV`, support `?showPanel=1` in the URL to show the selection panel with a placeholder selection so the panel is visible without clicking the map, for layout verification.
- **Sidebar hover-preview:** Drive map hover preview from store-owned `hoveredOsids` and a dedicated MapLibre outline layer (e.g. `sidebar-hover-outline`) with **deterministic sorted OSID filters**. Brigade/corps hover events in the sidebar set/clear only this list; the map renders the outline from the same source. Avoid duplicating hover state or ad-hoc layer updates.

---

## 6. Design Workflow

Before building UI panels (Phase 3), key screens must be designed and components built in isolation. This section defines the design-first workflow and Storybook strategy recommended by the GUI design advisor.

### 6.1 Design Before Code — Screen Layouts

Before building UI panels (Phase 3 / Step 5 in the implementation guide), the key screens must be designed first. Every hour spent on layout design saves 3–4 hours of build–screenshot–rebuild cycles in code.

**Screens to design (in priority order):**

1. **Main warroom view** — the default screen when the game is running. Layout:
   - Full-screen MapLibre map as the base layer
   - **Top toolbar:** turn counter, date display, faction indicator, phase indicator, action buttons (Advance Turn, Save, Load)
   - **Bottom status strip:** selected OSID info, population, controller, supply status
   - **Left sidebar (collapsible):** OOB tree (Theatre → Army → Corps → Brigade hierarchy)
   - **Right panel (context-sensitive):** appears when clicking an OSID, formation, or front line. Shows detail for the selected entity.
   - **Map mode toolbar (floating, bottom-left or top-left):** toggle between Political Control, Ethnic Majority, Supply State, Front Pressure map modes

2. **Settlement/OSID detail panel** — right panel content when an OSID is selected:
   - OSID name, municipality, controller
   - Population breakdown (Bosniaks, Croats, Serbs, Others) — bar chart or stacked bar
   - Supply status indicator
   - Formations present (list of brigade cards)
   - Stability score
   - Adjacent OSIDs (contact graph neighbors)

3. **Formation detail panel** — right panel content when a formation marker is clicked:
   - Formation name, type, faction
   - Strength (current/max), fatigue, equipment
   - Current orders (if any)
   - Assigned front segment
   - Subordinate units (for corps/army level)

4. **OOB sidebar** — left sidebar showing the full order of battle:
   - Tree hierarchy: Theatre → Army → Corps → Brigade
   - Each brigade row shows: name, strength bar, fatigue indicator, assigned/reserve status
   - Corps cards show aggregate strength and front assignment
   - Expand/collapse at each level
   - Color-coded by faction

5. **Attack confirmation modal** — when staging an attack order:
   - Attacking formation(s) and strength
   - Target OSID(s)
   - Defending formation(s) and estimated strength
   - Terrain modifier summary
   - Confirm / Cancel buttons

6. **War summary modal** — end-of-turn summary:
   - Territory changes (OSIDs flipped)
   - Casualties by faction
   - Supply status changes
   - Displacement events
   - Negotiation pressure changes

7. **Recruitment modal** — when recruiting new formations:
   - Available manpower pool by municipality
   - Formation type selection
   - Estimated strength and time to deploy
   - Deployment location selection

8. **Replay scrubber** — for reviewing past turns:
   - Timeline bar showing all turns
   - Play/pause/step controls
   - Map updates to show state at selected turn

**Tool recommendations:**

- **Excalidraw** (free, fast) for initial layout sketches and flow diagrams. Good for brainstorming panel positions, information hierarchy, and interaction flows. Do this FIRST, even before Figma.
- **Figma or Penpot** (Penpot is open-source) for higher-fidelity mockups if needed. Most useful for the warroom layout and panel sizing/spacing. Not strictly required if Excalidraw sketches are clear enough.

**Key things to decide in design phase:** panel widths (fixed vs. percentage), collapse behavior, which panels can coexist vs. replace each other, mobile/small-screen behavior (if any).

### 6.2 Storybook for Component Development

Before integrating UI panels into the map application, build them in isolation using Storybook. This is the recommended approach from the GUI design advisor for avoiding "build → screenshot → rebuild" cycles.

**Setup:** Add Storybook to the `src/ui/map/` project:

```bash
npx storybook@latest init --type react
```

**Build components in this order (each as a Storybook story first):**

| Priority | Component | Props/Data needed | Notes |
|----------|-----------|-------------------|-------|
| 1 | CorpsCard | Corps object with brigades array | Compact card showing corps name, strength, front assignment. Appears in OOB sidebar. |
| 2 | BrigadeRow | Brigade object | Single row in a corps card. Name, strength bar, fatigue, status badge (assigned/reserve/in-combat). |
| 3 | SelectionPanel | Selected OSID feature properties | Right panel showing OSID detail. Population bars, controller, supply status. |
| 4 | FormationDetail | Formation object | Right panel showing formation detail when a marker is clicked. |
| 5 | TopToolbar | Turn number, date, faction, phase | Thin bar across top. Turn counter, date, action buttons. |
| 6 | BottomStatusStrip | Hovered/selected entity summary | Thin bar across bottom. One-line summary of whatever is under the cursor. |
| 7 | OOBSidebar | Full OOB tree for one faction | Left sidebar. Collapsible tree: Theatre → Army → Corps (CorpsCard) → Brigade (BrigadeRow). |
| 8 | MapModeToolbar | Current mode, available modes | Floating panel with toggle buttons for map modes. |
| 9 | OrderQueue | List of staged orders | Panel showing orders staged for this turn before committing. |
| 10 | AttackConfirmation | Attack order details | Modal overlay. Attacker, defender, terrain, confirm/cancel. |
| 11 | WarSummaryModal | Turn results | Modal overlay. Territory changes, casualties, events. |
| 12 | RecruitmentModal | Manpower pools, formation types | Modal overlay. Formation creation flow. |
| 13 | ReplayScrubber | Turn history | Timeline bar with playback controls. |

**Each Storybook story should:**

- Use **mock data** (not real game state) — create a `src/ui/map/__mocks__/` directory with sample OSID features, formations, corps, etc.
- Demonstrate **all visual states:** default, hover, selected, disabled, loading, error, empty
- Use the **AWWV Tailwind theme tokens** (`panel-bg`, `panel-border`, faction colors, `text-primary`, etc.)
- Be **self-contained** — no dependency on MapLibre, Zustand store, or IPC

**Benefits:**

- Each component is visually verified before integration
- Designer (Haris) can review and tweak styling in isolation
- Components are reusable and testable
- Avoids breaking the map while iterating on panel layouts

### 6.3 Integration Strategy

After components are designed (Excalidraw/Figma) and built in isolation (Storybook), integration into the map app follows this pattern:

1. **Component passes Storybook review** → copy to `src/ui/map/components/`
2. **Wire to Zustand store** — replace mock data with real state selectors
3. **Position in the map layout** — absolute positioning over the MapLibre canvas
4. **Test with real game state** — load a save, verify data flows correctly

This **design → isolate → integrate** pipeline prevents the pattern of building UI directly against the map and discovering layout/data issues only when everything is wired together.

---

## 7. Directory Structure

```
src/ui/map/                         # NEW — clean React + MapLibre app
├── index.html                      # Vite entry point
├── main.tsx                        # React root mount
├── App.tsx                         # AppShell + MapContainer + panels
├── vite.config.ts                  # Vite + React plugin
├── tailwind.config.ts              # AWWV theme tokens
├── postcss.config.ts               # Tailwind PostCSS
│
├── store/
│   ├── gameStore.ts                # Zustand store (game state + UI state)
│   └── selectors.ts               # Derived state selectors
│
├── map/
│   ├── MapContainer.tsx            # MapLibre GL JS component wrapper
│   ├── awwv_map_style.json         # MapLibre style spec (THE visual definition)
│   ├── useMapSources.ts            # Hook: update GeoJSON sources from game state
│   ├── useMapInteractions.ts       # Hook: click, hover, keyboard on map
│   ├── useMapLayers.ts             # Hook: dynamic layer visibility/filtering
│   ├── builders/
│   │   ├── buildControlGeoJSON.ts  # GameState → OSID control FeatureCollection
│   │   ├── buildFrontLinesGeoJSON.ts   # front_edges → LineString features
│   │   ├── buildFormationsGeoJSON.ts   # formations → Point features at OSID centroids
│   │   ├── buildOrderArrowsGeoJSON.ts  # orders → LineString features
│   │   └── buildZocGeoJSON.ts          # selected formation → ZoC polygon features
│   └── assets/
│       ├── nato-sprites.png        # Pre-built NATO symbology sprite atlas
│       ├── nato-sprites.json       # Sprite atlas metadata
│       └── fonts/                  # IBM Plex Mono .pbf glyph files for MapLibre
│
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── TopToolbar.tsx
│   │   └── BottomStatusStrip.tsx
│   ├── panels/
│   │   ├── SelectionPanel.tsx
│   │   ├── SettlementDetail.tsx
│   │   ├── FormationDetail.tsx
│   │   ├── CorpsDetail.tsx
│   │   └── ArmyDetail.tsx
│   ├── sidebar/
│   │   ├── OOBSidebar.tsx
│   │   ├── CorpsCard.tsx
│   │   └── BrigadeRow.tsx
│   ├── orders/
│   │   ├── OrderQueue.tsx
│   │   ├── AttackConfirmation.tsx
│   │   └── MovementPreview.tsx
│   ├── modals/
│   │   ├── WarSummaryModal.tsx
│   │   ├── RecruitmentModal.tsx
│   │   ├── MainMenu.tsx
│   │   └── SidePickerOverlay.tsx
│   └── replay/
│       └── ReplayScrubber.tsx
│
├── data/
│   ├── DataLoader.ts               # MIGRATED from current (fetch + parse)
│   ├── GameStateAdapter.ts          # MIGRATED from current (state → view models)
│   ├── ControlLookup.ts             # MIGRATED from current (SID normalization)
│   └── types.ts                     # MIGRATED + extended
│
├── hooks/
│   ├── useIPC.ts                    # Electron IPC bridge
│   ├── useGameState.ts              # Subscribe to game state changes
│   └── useKeyboardShortcuts.ts      # Global keyboard bindings
│
└── styles/
    └── globals.css                  # Tailwind directives + CRT scanline + custom scrollbars

scripts/map/
├── generate_tiles.sh               # NEW — master tile generation script
├── tilemaker_config.json            # NEW — OSM → vector tile config
├── tilemaker_process.lua            # NEW — OSM feature filtering rules
└── generate_hillshade.sh            # NEW — DEM → hillshade PMTiles
```

---

## 8. Migration Plan

### Phase 0: Tile Pipeline (Days 1–2)

**Goal:** Generate the tile assets that MapLibre needs.

1. Install tile generation tools (`tilemaker`, `gdal`, `pmtiles` CLI)
2. Generate hillshade PMTiles from DEM source
3. Generate OSM vector PMTiles from PBF source
4. Verify OSID polygons: confirm `data/derived/operational/operational_settlements.geojson` has 753 features in WGS84 (already confirmed — no action needed)
5. Verify municipality boundaries: confirm `data/source/boundaries/bih_adm3_1990.geojson` has 110 features in WGS84 (already confirmed)
6. Add `scripts/map/generate_tiles.sh` to automate the tile pipeline

**Acceptance:** `data/derived/tiles/` contains hillshade and OSM PMTiles. OSID and municipality GeoJSON files confirmed present and correct.

### Phase 1: Scaffold and Map (Days 3–5)

**Goal:** React app with MapLibre rendering the full base map + political control.

1. Initialize Vite + React + TypeScript project in `src/ui/map/`
2. Install dependencies: `react`, `react-dom`, `maplibre-gl`, `pmtiles`, `zustand`, `tailwindcss`
3. Create `awwv_map_style.json` with all base layers
4. Create `MapContainer.tsx` wrapping MapLibre
5. Load OSID WGS84 GeoJSON as a GeoJSON source, render with faction colors
6. Serve PMTiles locally (PMTiles protocol for dev; `awwv://` for Electron)
7. Verify: hillshade terrain visible, OSM roads/rivers visible, OSID control colors correct, smooth zoom works

**Acceptance:** `npm run dev:map` shows Bosnia with real terrain, real roads, real rivers, and 753 colored OSID polygons. Navigable via mouse. Looks dramatically better than current Canvas 2D.

### Phase 2: Game State Integration (Days 5–8)

**Goal:** Load a `final_save.json` and render dynamic state on the map.

1. Migrate `GameStateAdapter.ts` and `DataLoader.ts`
2. Create Zustand store with game state slice
3. Implement `useMapSources.ts` — update GeoJSON sources when state changes
4. Build GeoJSON builders (control, front lines, formations, orders)
5. Generate NATO sprite atlas
6. Wire "Load Save" → parse → display formations, front lines, orders on map
7. Verify: load existing save, see formations at correct geographic positions, front lines match

**Acceptance:** Load `final_save.json`; map shows formations, front lines, and orders. Visual output matches or exceeds current tactical map.

### Phase 3: UI Panels (Days 8–14)

**Goal:** All interactive panels working.

**Before building panels,** complete the design workflow in §6. Create Excalidraw layouts for all screens, set up Storybook, and build each component in isolation. Only integrate into the map app after components pass visual review in Storybook.

1. Create component shell: `AppShell`, `TopToolbar`, `BottomStatusStrip`
2. Implement `SelectionPanel` — click OSID → show settlement details
3. Implement `OOBSidebar` with `CorpsCard` / `BrigadeRow`
4. Implement `FormationDetail`, `CorpsDetail` panels
5. Implement map mode toolbar (SELECT / ATTACK / MOVE)
6. Implement keyboard shortcuts
7. Verify: full interactive session — click settlements, browse OOB, select formations

**Acceptance:** All panels from current tactical map are present and functional. No missing information.

### Phase 4: Desktop Integration (Days 14–18)

**Goal:** Running in Electron with full IPC.

1. Wire `useIPC.ts` to all existing IPC channels
2. Wire `advance-turn`, attack/move/posture order staging
3. Wire recruitment modal
4. Wire `SidePickerOverlay` → `start-new-campaign`
5. Wire fog-of-war (filter formations by `player_faction`)
6. Configure PMTiles serving in Electron (local file protocol)
7. Test full gameplay loop: pick side → advance turns → stage orders → see results

**Acceptance:** Full Electron desktop session from New Campaign through multiple turns with orders and AAR.

### Phase 5: Polish (Days 18–24)

**Goal:** The map looks the best it has ever looked.

1. Fine-tune hillshade parameters (exaggeration, shadow color, highlight)
2. Fine-tune OSM feature filtering (which roads at which zooms)
3. Polish label styling (font sizes, halo widths, zoom transitions)
4. Polish front line styling (glow intensity, dash patterns)
5. Add ZoC overlay for selected formations
6. Add battle replay markers (pulsing control-change indicators)
7. War Summary modal, Replay scrubber, Attack confirmation with odds preview
8. Movement preview (reachable OSIDs highlight)
9. CRT scanline CSS overlay if desired
10. Haris subjective sign-off on visual quality

**Acceptance:** Visual quality exceeds all current rendering paths. The map looks like a professional military operations display.

---

## 9. Dependencies

### 9.1 npm packages (new)

| Package | Version | Purpose | Size |
|---------|---------|---------|------|
| `react` | ^18 | UI framework | ~3KB gzipped |
| `react-dom` | ^18 | DOM rendering | ~40KB gzipped |
| `maplibre-gl` | ^4 | Map rendering engine | ~200KB gzipped |
| `pmtiles` | ^3 | PMTiles protocol for local tile serving | ~10KB gzipped |
| `zustand` | ^4 | State management | ~1KB gzipped |
| `tailwindcss` | ^3 | Utility CSS | 0 runtime (compile-time) |
| `@vitejs/plugin-react` | latest | Vite React support | dev only |
| `autoprefixer` | latest | PostCSS plugin for Tailwind | dev only |
| `postcss` | latest | CSS processing | dev only |

**Total added bundle size:** ~255KB gzipped. Removes `three` (~150KB gzipped). Net increase ~105KB.

### 9.2 Build tools (one-time install, for tile generation)

| Tool | Purpose | Install |
|------|---------|---------|
| `tilemaker` | OSM PBF → vector PMTiles | Binary download or `brew install tilemaker` |
| `gdal` | DEM → hillshade raster | `apt install gdal-bin` or `brew install gdal` |
| `pmtiles` CLI | mbtiles → pmtiles conversion | `npm install -g pmtiles` or binary download |

### 9.3 Removed dependencies

| Package | Reason |
|---------|--------|
| `three` | Replaced by MapLibre for all map rendering |

---

## 10. What Agents Need to Know

### 10.1 For the Desktop Agent (Electron)

**Almost nothing changes.** `electron-main.cjs` stays the same. All IPC channels stay the same. Two small additions:

1. The `awwv://` protocol handler may need a route for tile files if not using PMTiles protocol directly.
2. The renderer HTML entry point changes from `tactical_map.html` to the new React app's `index.html`.

### 10.2 For the Simulation / Engine Agent

**Nothing changes.** `src/sim/`, `src/state/`, `src/scenario/` are untouched. The simulation engine never uses geographic coordinates — it uses the contact graph (topology). WGS84 vs SVG coordinates is a rendering concern only.

### 10.3 For the UI Agent (Primary Owner)

You own everything in `src/ui/map/` (the new React + MapLibre app). **This app is the single source of truth for the GUI;** all new GUI work must be implemented there. Do not target the archived HoI 3D stack or other legacy renderers. **Aesthetic and interaction design** follow **HOI_VISUAL_GUI_OVERHAUL_SPEC.md** (sidebar Army/SITUATION tabs, panel interaction patterns §3.8, palette §9). Key principles:

1. **The style spec is king.** `awwv_map_style.json` defines what the map looks like. To change colors, widths, visibility, zoom behavior — edit the style. Don't write rendering code.
2. **GeoJSON builders are the bridge between engine and map.** Your main job is converting `LoadedGameState` into GeoJSON FeatureCollections that MapLibre renders. Each builder is a pure function: state in, GeoJSON out.
3. **React components are the UI chrome.** Same as v1.
4. **Don't fight MapLibre.** If something is hard to do with MapLibre layers, it's probably the wrong approach. MapLibre has expressions, data-driven styling, and filters that can handle almost any visual requirement declaratively.

### 10.4 For the Data Pipeline Agent

One new responsibility: the **tile generation pipeline** (`scripts/map/generate_tiles.sh`). This:
- Takes DEM → hillshade PMTiles
- Takes OSM PBF → vector PMTiles
- Outputs to `data/derived/tiles/`
- Is deterministic (same inputs → same outputs)
- Runs once, or when source data updates

Note: the OSID GeoJSON (`operational_settlements.geojson`, 753 features) and municipality boundaries (`bih_adm3_1990.geojson`, 110 features) are already in WGS84 and do not need any conversion.

### 10.5 For the Orchestrator

This rework is **Phase 1 priority** for the GUI track. It supersedes:
- Any further Canvas 2D tactical map improvements
- Any further Three.js / HoI renderer improvements
- Any further class-based UI component development

The warroom (`src/ui/warroom/`) continues independently.

---

## 11. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Tile generation fails or produces artifacts | Medium | High | Test with small DEM/OSM extract first. GDAL and tilemaker are mature tools. Fall back to serving raw GeoJSON for roads/rivers (slower but works). |
| OSID polygon alignment with WGS84 terrain | Low | High | We're deriving OSIDs from WGS84 settlement source, so alignment is guaranteed. If existing SVG-derived merge groups don't map cleanly, re-validate merge groups against WGS84 polygons. |
| PMTiles serving in Electron | Low | Medium | PMTiles protocol is well-tested. Fallback: serve tiles via `awwv://` custom protocol (same pattern as existing data serving). |
| MapLibre label declutter not matching current dedup logic | Low | Low | MapLibre's symbol layer collision avoidance is more sophisticated than our `computePrimaryLabels()`. It will be equal or better. |
| Front line dual-arc style hard to replicate in MapLibre | Medium | Medium | MapLibre `line` layers support dashes, colors, widths, blur. For true dual-arc, use two line layers with offset geometry. Alternatively, accept that a single glowing dashed line looks excellent on real terrain. |
| Bundle size with MapLibre (~200KB) | Very Low | Very Low | Electron app. Users download once. Not a web page. |
| Agent unfamiliar with MapLibre style spec | Medium | Medium | Style spec is JSON. Extensively documented at maplibre.org. Expression language is powerful but learnable. Many examples exist. |

---

## 12. Success Criteria

The rework is complete when:

1. **One rendering path:** MapLibre GL JS. No Canvas 2D fallback, no Three.js.
2. **Real terrain visible:** Hillshade DEM shows actual Bosnian topography underneath political control.
3. **Real infrastructure visible:** OSM roads and rivers at geographically correct positions.
4. **Political control correct:** 753 OSID polygons with correct faction colors, updating per turn.
5. **Front lines, formations, orders:** All game data rendered correctly on the map.
6. **Full desktop integration:** New Campaign → play turns → stage orders → see results. All IPC channels working.
7. **Fog of war:** Enemy formations hidden when `player_faction` is set.
8. **Replay:** Load a replay timeline and scrub through turns.
9. **Visual quality dramatically exceeds current rendering.** The terrain alone makes this a step change.
10. **< 4,000 lines total** in `src/ui/map/` (compared to current ~6,000+).
11. **Style changes don't require code changes.** Visual tweaks happen in `awwv_map_style.json`.

---

## 13. Decision Log

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| **MapLibre GL JS** over deck.gl | All data available in WGS84. MapLibre gives us terrain hillshade, OSM base map, vector tile rendering, and style-driven visuals — none of which deck.gl provides natively. | deck.gl (no terrain/tiles, requires OrthographicView workaround), Three.js (manual everything), Canvas 2D (current, inadequate) |
| **PMTiles** over mbtiles or directory tiles | Single-file format, no tile server needed, works in Electron via protocol handler. | mbtiles (requires sqlite, harder in browser), directory tiles (thousands of files, messy) |
| **tilemaker** over planetiler for OSM tiles | Single binary, direct PMTiles output, configurable Lua filtering. | planetiler (Java dependency, faster for planet-scale but overkill for BiH), tippecanoe (requires intermediate GeoJSON step) |
| **React + Zustand + Tailwind** | Same as v1. Claude generates React fluently. Zustand is minimal. Tailwind maps to theme tokens. | Svelte, Vue (no advantage given Claude fluency with React) |
| **WGS84 as rendering coordinate system** | Source data is WGS84. MapLibre expects WGS84. Eliminates the SVG coordinate space for all rendering. Simulation continues using topology (coordinate-independent). | Keep SVG coordinates (forces deck.gl OrthographicView, loses terrain/tiles) |
| **Re-derive OSID polygons from WGS84 source** | Not needed — `operational_settlements.geojson` is already WGS84 (753 features, confirmed). Reference directly in MapLibre style. | Reprojection from SVG (unnecessary), separate WGS84 file (just a rename) |
| **deck.gl as optional overlay layer** | MapLibre + deck.gl interop exists. If any overlay needs capabilities beyond MapLibre layers (complex animations, GPU compute), deck.gl layers can be added individually without replacing the renderer. | Commit fully to one or the other (unnecessarily limiting) |

---

## Appendix A: Quick Reference for Agents

### Install new dependencies (UI app)
```bash
cd src/ui/map
npm install react react-dom maplibre-gl pmtiles zustand
npm install -D @vitejs/plugin-react tailwindcss postcss autoprefixer @types/react @types/react-dom
npx tailwindcss init -p
```

### Install tile generation tools (one-time, on build machine)
```bash
# macOS
brew install tilemaker gdal
npm install -g pmtiles

# Ubuntu/Debian
apt install gdal-bin
# tilemaker: download binary from https://github.com/systemed/tilemaker/releases
npm install -g pmtiles
```

### Generate tiles
```bash
# Run once (or when source data changes)
bash scripts/map/generate_tiles.sh
# Outputs: data/derived/tiles/hillshade.pmtiles, data/derived/tiles/osm.pmtiles
```

### Key docs to read before starting
- MapLibre style spec: https://maplibre.org/maplibre-style-spec/
- MapLibre GL JS docs: https://maplibre.org/maplibre-gl-js/docs/
- PMTiles spec: https://docs.protomaps.com/pmtiles/
- `DESKTOP_GUI_IPC_CONTRACT.md` — all IPC channels
- `TACTICAL_MAP_SYSTEM.md` §5 — data pipeline (what files exist)
- `TACTICAL_MAP_SYSTEM.md` §17 — color tokens and theme
- `data/derived/operational/operational_settlements.geojson` — 753 OSID polygons (already WGS84)
- `data/source/boundaries/bih_adm3_1990.geojson` — 110 municipality boundaries (already WGS84)
- `src/map/nato_tokens.ts` — canonical color source

### Smoke test
```bash
# After Phase 1 scaffold:
cd src/ui/map && npm run dev
# Opens browser at localhost:3002
# Should see: real Bosnian terrain (hillshade), OSM roads and rivers,
# 753 OSID polygons with faction colors, smooth zoom, click detection
# OSID data served from: data/derived/operational/operational_settlements.geojson
# Mun borders from: data/source/boundaries/bih_adm3_1990.geojson
```

---

## Appendix B: What the Map Will Look Like

For a mental model of the target visual quality, imagine:

1. **Zoom out (strategic):** Bosnia's mountainous terrain visible through translucent faction-colored regions. The Dinaric Alps, the Sava river valley, the Drina canyon — all visible as actual terrain. Major cities labeled. Corps HQ markers only.

2. **Zoom to Sarajevo (operational):** Individual OSIDs visible around the city. The besieged pocket's geography is clear — mountains on all sides, a few road corridors. Front lines glow along ridgelines. Brigade markers appear. The airport, Mount Igman, the tunnel route — all geographically positioned.

3. **Zoom to a front sector (tactical):** Individual OSID polygons large enough to see terrain within them. Entrenched brigade markers with posture indicators. Attack arrows pointing across the front. You can see why an attack across a river into a mountain OSID is suicidal, and why the Posavina corridor was fought over — it's flat, it's the only route.

This is the quality level that real terrain data makes possible. No amount of Canvas 2D code could achieve this.
