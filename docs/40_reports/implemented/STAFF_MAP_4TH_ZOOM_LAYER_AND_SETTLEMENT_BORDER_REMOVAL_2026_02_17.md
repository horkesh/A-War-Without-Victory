# Implemented Work — Staff Map (4th Zoom Layer) & Settlement Border Removal

**Date:** 2026-02-17
**Status:** Complete
**Scope:** New procedural paper-map overlay for detail viewing + settlement border cleanup

---

## 1. Staff Map — 4th Zoom Layer

**What:** Added a 4th viewing layer to the tactical map — a procedurally generated paper-map overlay styled like a hand-drawn military map on parchment. The user draws a rectangle to define a region; the staff map renders that region at 8x zoom with terrain hatching, serif typography, desaturated faction fills, full-detail formation counters, and cartographic decorations.

**Why:** At the existing max zoom (Tactical 5x), dense areas like Sarajevo have overlapping unit markers, cramped labels, and indistinguishable front lines. The staff map provides a purpose-built detail view with a fundamentally different aesthetic — paper vs dark C2 — that makes dense areas legible.

### Architecture: Overlay Canvas with Independent Render Pipeline

Paper aesthetic (parchment, hatching, serif fonts, sepia ink) is incompatible with the dark NATO C2 theme. Rather than branching the main render() method, the staff map uses a **separate overlay canvas** with its own 10-pass render pipeline and three-tier offscreen caching.

### Render Pipeline (10 passes)

| Pass | Layer | Cache Tier |
|------|-------|-----------|
| 1 | Parchment background (procedural grain + aging spots) | Tier 1: resize only |
| 2 | Terrain hatching (clip per settlement, parallel lines by friction/slope) | Tier 2: region change |
| 3 | Elevation tinting (lowland green → mountain brown) | Tier 2: region change |
| 4 | Settlement outlines (thin ink, thicker for urban) | Tier 2: region change |
| 5 | Roads (MSR dark brown 1.2px, secondary lighter 0.8px) | Tier 2: region change |
| 6 | Rivers (blue-gray 1.5px + watercolor bleed halo) | Tier 2: region change |
| 7 | Front lines (crimson 3px, hand-drawn wobble via detHash) | Dynamic: every frame |
| 8 | Formation counters (100×60px, full detail) | Dynamic: every frame |
| 9 | Labels (serif font, URBAN_CENTER + TOWN only) | Dynamic: every frame |
| 10 | Decorations (compass rose, scale bar, cartouche, vignette) | Dynamic: every frame |

### Three-Tier Caching

| Tier | Contents | Invalidation |
|------|----------|-------------|
| Parchment | Grain texture, aging spots | Canvas resize only |
| Terrain + geography | Hatching, outlines, roads, rivers | Region or control change |
| Dynamic | Formations, labels, front lines, decorations | Every frame (~3-5ms) |

### Formation Counters (Full Detail)

Each 100×60px counter displays:
- Formation name (top, serif font)
- NATO symbol (center, sized by kind)
- Strength number (bottom-left, mono font)
- Cohesion bar (60×4px, color-coded)
- Fatigue indicator (green/amber/red)
- Posture badge (defend/probe/attack/elastic_defense)

### User Interaction

**Entry:** Press `4` → enters drag-to-define selection mode → draw rectangle → staff map opens for all settlements whose centroids fall in the rectangle.

**Exit:** Press `Escape`, press `4` again, or click the exit button (✕) in the top-right corner.

**Fixed view:** No panning within the staff map. Exit and re-draw to see a different area.

**Minimum region:** Must contain ≥5 settlements or a "Region too small" toast appears.

**Orders/interaction:** All clicks delegate to the existing MapApp infrastructure — same SpatialIndex, same IPC bridge, same panel system.

### Visual Theme

| Token | Value | Usage |
|-------|-------|-------|
| Parchment base | `#f4e8c8` | Background |
| Parchment aged | `#e8d8b0` | Grain variation |
| Ink dark | `#2a1a0a` | Labels, outlines |
| Ink medium | `#5a3a1a` | Secondary labels |
| Water blue | `#2a5a7a` | Rivers |
| Front crimson | `#8a1a1a` | Front lines |
| Place name font | Palatino Linotype, Georgia, serif | Settlement labels |
| Data font | IBM Plex Mono, Consolas, monospace | Strength numbers |
| Faction fills | Desaturated earth tones at 12% alpha | Settlement polygons |

### Determinism

All procedural effects (parchment grain, aging spots, terrain hatching angle, front line wobble) use `detHash(x, y, seed)` — a deterministic hash function. No Math.random() anywhere.

### Files Created

**`src/ui/map/staff/StaffMapTheme.ts`** (198 lines)
- Parchment palette, ink colors, desaturated faction colors, serif fonts
- Terrain hatching parameters, road/river styling
- Counter dimensions and colors (cohesion, fatigue, posture)
- Decoration constants (compass, scale bar, cartouche, vignette)
- Helper functions: `paperFactionFill()`, `paperFactionBorder()`, `paperFactionText()`

**`src/ui/map/staff/StaffMapRenderer.ts`** (1112 lines)
- Full 10-pass render pipeline with three-tier offscreen caching
- `render()` — orchestrates cache validation and compositing
- `ensureParchmentCache()` — procedural grain and aging spots
- `ensureTerrainCache()` — hatching, outlines, roads, rivers, elevation
- `drawFrontLines()` — crimson lines with deterministic hand-drawn wobble
- `drawFormations()` / `drawFormationCounter()` — full-detail 100×60px counters
- `drawLabels()` — URBAN_CENTER and TOWN only (serif font, sized by class)
- `drawDecorations()` — compass rose, scale bar, title cartouche
- `drawVignette()` — weathered border darkening
- `drawExitButton()` — top-right ✕ button
- Hit testing: `getSettlementAtPoint()`, `getFormationAtPoint()`, `isExitButtonHit()`

### Files Modified

**`src/ui/map/types.ts`**
- Added `TerrainScalars` interface (6 fields: road_access_index, river_crossing_penalty, elevation_mean_m, elevation_stddev_m, slope_index, terrain_friction_index)
- Added `StaffMapRegion` interface (regionSids, bbox, selectionRect)
- Extended `ZoomLevel` from `0 | 1 | 2` to `0 | 1 | 2 | 3`
- Added `staffMapRegion: StaffMapRegion | null` to `MapStateSnapshot`
- Added `terrainScalars: Record<string, TerrainScalars>` to `LoadedData`

**`src/ui/map/constants.ts`**
- `ZOOM_FACTORS`: `[1, 2.5, 5]` → `[1, 2.5, 5, 8]`
- `ZOOM_LABELS`: added `'STAFF MAP'` as 4th entry
- Added `STAFF_MAP_FORMATION_MARKER_SIZE = { w: 100, h: 60 }`
- Added `STAFF_MAP_FORMATION_HIT_RADIUS = 54`

**`src/ui/map/state/MapState.ts`**
- Added `staffMapRegion: null` to initial snapshot
- Added `enterStaffMap(region: StaffMapRegion)` method
- Added `exitStaffMap()` method

**`src/ui/map/data/DataLoader.ts`**
- Added parallel fetch for `data/derived/terrain/settlements_terrain_scalars.json`
- Added `terrainScalars` to return object

**`src/ui/map/MapApp.ts`** (major changes)
- Imported `StaffMapRenderer` and `StaffMapRegion`
- Added fields: staffMapRenderer, staffMapCanvas, staffMapSelectionMode, staffMapSelecting, staffMapSelectStart, staffMapSelectEnd
- Render guard: delegates to StaffMapRenderer when staff map active
- Region selection: rubber-band rectangle on mousedown/move/up
- Click delegation: exit button, formation click, settlement click
- Hover delegation: formation/settlement hover in staff map mode
- Keyboard: `4` toggles selection mode; `Escape` exits staff map
- New methods: enterStaffMapSelectionMode(), exitStaffMapSelectionMode(), finalizeStaffMapSelection(), exitStaffMap(), computeStaffMapRegionFromRect()
- Updated updateZoomPill() for "STAFF MAP" label with sepia styling class

**`src/ui/map/tactical_map.html`**
- Added `<canvas id="staff-map-canvas" class="tm-staff-map-canvas">` inside tm-map-wrap

**`src/ui/map/styles/tactical-map.css`**
- `.tm-staff-map-canvas`: absolute positioning, z-index 3, pointer-events: none
- `.tm-zoom-pill.staff-map-active`: warm sepia tone variant

---

## 2. Settlement Border Removal

**What:** Removed all settlement polygon border/outline rendering from the main tactical map. Settlement polygons still render their faction-colored fills, but no stroke outlines are drawn between them.

**Why:** User requested cleaner map visuals without settlement borders cluttering the view. The borders (same-faction thin gray + cross-faction thicker lines) added visual noise without proportional informational value.

### Changes

**`src/ui/map/MapApp.ts`**
- Removed the settlement border stroke block (lines that drew `SETTLEMENT_BORDER.sameColor` / `SETTLEMENT_BORDER.sameWidth` strokes after polygon fills)
- Removed `SETTLEMENT_BORDER` from the import statement

### Determinism

N/A. Presentation-only change. No simulation, state, or serialization affected.

---

## 3. Bug Fixes During Implementation

### Exit Button Not Working
**Problem:** Staff map overlay canvas (z-index 3) intercepted all pointer events, preventing clicks from reaching the delegation logic in MapApp.
**Fix:** Added `pointer-events: none` to `.tm-staff-map-canvas` CSS. All events pass through to the main canvas, which has the delegation logic.

### Village Labels Cluttering Staff Map
**Problem:** All settlement names (including villages) were rendered as labels, creating unreadable clutter.
**Fix:** Filtered `drawLabels()` to only render URBAN_CENTER and TOWN NATO classes.
