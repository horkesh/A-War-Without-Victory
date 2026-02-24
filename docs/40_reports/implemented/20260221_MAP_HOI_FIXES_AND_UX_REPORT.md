# Map HoI — Blank Fix, Zoom/Pan, and Container Sizing

**Date:** 2026-02-21  
**Status:** Complete  
**Scope:** map_hoi entrypoint (HoI-style 2.5D map); fixes for blank map, zoom/pan, and container size to align with 2D tactical map.

---

## Document indexing rule

**From this date onward, all new reports and dated docs in `docs/40_reports/` (and similar doc folders) must begin the filename with the date in format `YYYYMMDD` (e.g. `20260221`).** This ensures chronological ordering and consistent indexing. Existing files may keep their current names; new files use the date prefix.

---

## Overview

After the initial map_hoi implementation (Phases 3–5 of the HoI Settlement Remapping and GUI Rework plan), the map area was blank, zoom/pan did not work, and the map container did not size correctly compared to the 2D tactical map. This report documents the fixes applied.

**Outcome:**

- Map area always shows content (2D placeholder first, then WebGL when ready).
- WebGL renderer has correct background color and lighting so terrain is visible.
- Scroll zoom and middle-drag pan work; container uses same layout and resize behavior as the 2D map.

---

## 1. Blank map fix

**Problem:** The map area was blank except for the GUI (top bar, sidebar, bottom strip). Either the WebGL canvas was 0×0 or the 2D placeholder was never shown.

**Root causes:**

- When WebGL init succeeded, the placeholder was hidden immediately; if the Three.js canvas was still 0×0 (layout not yet run), nothing was visible.
- When WebGL failed, the 2D placeholder was only then initialized, so users who had WebGL saw a blank canvas until resize ran (if at all).

**Fixes:**

1. **Show 2D placeholder first** (`map_hoi.ts`): Call `initMapPlaceholder(mapWrapEl)` at bootstrap, before trying WebGL. The user always sees “Loading map…” or the operational settlement outlines. When WebGL later succeeds, the placeholder is hidden and its canvas removed (via class `hoi-map-placeholder-canvas`).
2. **Placeholder canvas identity** (`MapPlaceholder.ts`): The placeholder canvas has class `hoi-map-placeholder-canvas` so only it is removed when switching to WebGL.
3. **Non-zero size fallbacks:**  
   - **HoIMapRenderer:** `resize()` uses `container.getBoundingClientRect()` and no longer returns early for zero size; initial size in `init()` also uses `getBoundingClientRect()`.  
   - **MapPlaceholder.draw():** Uses `getBoundingClientRect()` when canvas has no client size; always draws at least background and “Loading map…” or “Map (data unavailable)” on fetch error.
4. **WebGL canvas styling** (`HoIMapRenderer.ts`): Canvas gets `position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: auto` so it fills the container and receives events.
5. **Animate-loop resize:** In the renderer’s animation loop, compare `getBoundingClientRect()` dimensions to last known size and call `resize()` when they change so the canvas picks up correct dimensions after layout.

**Files changed:** `src/ui/map/map_hoi.ts`, `src/ui/map/map_hoi/MapPlaceholder.ts`, `src/ui/map/renderer/HoIMapRenderer.ts`.

---

## 2. WebGL appearance (background and lighting)

**Problem:** Map area was black with faint grey fragments; terrain was not visibly lit.

**Fixes:**

1. **Clear color** (`HoIMapRenderer.ts`): `this.renderer.setClearColor(0x252220, 1)` so the WebGL clear matches the warm panel background (#252220) from the HoI spec.
2. **Lighting** (`HoIMapRenderer.ts`): Terrain uses `MeshStandardMaterial`, which requires lights. Added `AmbientLight` (0.85) and `DirectionalLight` (0.5) so the terrain is visibly lit (brown/grey with relief).

**Files changed:** `src/ui/map/renderer/HoIMapRenderer.ts`.

---

## 3. Zoom and pan

**Problem:** Scroll zoom and middle-drag pan did not work.

**Fixes:**

1. **Wheel zoom** (`HoIMapRenderer.ts`):  
   - Wheel listener attached to both the **container** (with `capture: true`) and the **canvas** so zoom is captured even when the event hits the container.  
   - `preventDefault()` and `stopPropagation()` so the page does not scroll when zooming over the map.
2. **Middle-drag pan** (`HoIMapRenderer.ts`):  
   - Pan logic corrected so the full camera position (including Y from zoom and tilt) and `lookAt` are updated; previously only `position.x` and `position.z` were set, leaving the view inconsistent.  
   - Cursor set to `grabbing` while panning and cleared on mouseup/mouseleave.
3. **Canvas events:** Canvas has `pointer-events: auto` and fills the wrap so it receives all pointer events.

**Files changed:** `src/ui/map/renderer/HoIMapRenderer.ts`.

---

## 4. Container size (match 2D tactical map)

**Problem:** Map container did not size like the 2D tactical map; layout and resize behavior differed.

**Fixes:**

1. **Root and layout** (`styles_hoi.css`):  
   - `#map-hoi-root`: `position: fixed; inset: 0; overflow: hidden` so the app fills the viewport (same idea as 2D `#map-root`).  
   - `.hoi-main`: `flex: 1 1 auto`, `min-height: 0`, `overflow: hidden`.  
   - `.hoi-map-wrap`: `flex: 1 1 auto`, `min-width: 0`, `min-height: 0`, `overflow: hidden` to align with `.tm-map-wrap`. Removed fixed `min-height: 120px` so flex can size the map area correctly.
2. **Map canvas in CSS** (`styles_hoi.css`): Rule for `.hoi-map-wrap canvas`: `position: absolute; inset: 0; width: 100%; height: 100%` so the WebGL (or placeholder) canvas always fills the wrap. Added `:focus-visible` outline for accessibility.
3. **Resize handling:**  
   - **ResizeObserver** (`map_hoi.ts`): When WebGL is active, a `ResizeObserver` on `mapWrapEl` calls `renderer.resize()` when the wrap resizes (e.g. window or flex layout change).  
   - **resize()** (`HoIMapRenderer.ts`): Uses `container.getBoundingClientRect()` for width/height so the renderer uses the actual rendered size.  
   - **animate()** (`HoIMapRenderer.ts`): Uses `getBoundingClientRect()` to detect size changes and call `resize()` so dimensions stay in sync.  
   - Initial camera aspect and renderer size in `init()` use the same rect-based size.

**Files changed:** `src/ui/map/styles_hoi.css`, `src/ui/map/map_hoi.ts`, `src/ui/map/renderer/HoIMapRenderer.ts`.

---

## 5. Files modified (summary)

| File | Changes |
|------|--------|
| `src/ui/map/map_hoi.ts` | Init placeholder first; on WebGL success remove placeholder canvas and hide placeholder div; add ResizeObserver and double rAF resize. |
| `src/ui/map/map_hoi/MapPlaceholder.ts` | Class `hoi-map-placeholder-canvas`; draw() uses getBoundingClientRect fallback and no-data message; error path calls draw() with message. |
| `src/ui/map/renderer/HoIMapRenderer.ts` | setClearColor; ambient + directional light; canvas position/inset/pointer-events; init/resize/animate use getBoundingClientRect; setupControls: wheel on container (capture) + canvas, pan camera fix, cursor. |
| `src/ui/map/styles_hoi.css` | #map-hoi-root fixed inset 0; .hoi-main flex and overflow; .hoi-map-wrap flex/min-height 0, overflow; .hoi-map-wrap canvas absolute inset 0, focus-visible. |

---

## 6. Verification

- **Zoom:** Scroll over map → zoom in/out; page does not scroll.
- **Pan:** Middle-click and drag → map pans; cursor shows grabbing.
- **Home:** Focus map, press Home → view resets.
- **Container:** Resize window or change layout → map area resizes with viewport like 2D tactical map.
- **No blank map:** On load, “Loading map…” or 2D outlines appear; then either 2.5D terrain or placeholder remains visible.

---

## 7. References

- Plan: `docs/30_planning/20260221_settlement remapping and GUI rework/` (implementation_plan, HOI_VISUAL_GUI_OVERHAUL_SPEC, ADDENDUM_25D_AND_MOSTAR_SPLIT).
- Engineering: `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` (§2 map_hoi, §3 file inventory).
- 2D map layout: `src/ui/map/styles/tactical-map.css` (.tm-map-wrap), `src/ui/map/MapApp.ts` (resize, ResizeObserver on wrap).
