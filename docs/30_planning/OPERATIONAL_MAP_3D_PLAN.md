# Planning Report: 2.5D Operational Map View

**Date:** 2026-02-18
**Status:** Design complete — not yet implemented
**Scope:** Promote the existing standalone Three.js 2.5D terrain viewer into the live tactical map as a zoom-triggered operational view

---

## Problem

The tactical map (`MapApp.ts`, 4,710 lines) renders everything in Canvas 2D — flat top-down view with no terrain depth. A standalone `map_2_5d.ts` (238 lines) already demonstrates real 3D terrain using Three.js, but it is disconnected from the game engine and wired to no game state.

The user wants to see actual terrain relief and isometric perspective when zoomed in, without losing the clean strategic overview at full zoom.

---

## Proposed Solution: Dual-Mode Map

**Strategic zoom (zoomFactor = 1.0)** — Canvas 2D, exactly as today. Unchanged.

**Operational zoom (zoomFactor > 1.2)** — CSS crossfade reveals a Three.js 2.5D canvas layered on top, showing the same pan center with real terrain geometry, settlement polygons draped on the mesh, floating NATO formation counters, and 3D front lines.

Both modes share `MapState` as single source of truth. The 2D canvas is dimmed but never destroyed during operational mode (destroying a Canvas element also destroys any attached WebGL context). The switch is purely visual — no simulation or game state changes.

---

## Why This Is Feasible Now

The infrastructure is nearly ready:

| Component | Status |
|-----------|--------|
| `three@0.170.0` | Already in `package.json` |
| `data/derived/terrain/heightmap_3d_viewer.json` | Already generated (1.4 MB, 512×512 WGS84 grid) |
| `src/ui/map/map_2_5d.ts` | Working terrain mesh + coordinate math (238 lines, directly reusable) |
| `src/ui/map/map_3d.ts` | Working 3D viewer with OrbitControls (151 lines, reference) |
| Settlement GeoJSON | `data/derived/settlements_wgs84_1990.geojson` — 5,823 features, WGS84 (8 MB) |
| Vite plugin | `serveTacticalMapData()` already serves `/data/` path — no infra changes needed |

No new data pipeline work is needed. The `heightmap_3d_viewer.json` export script (`npm run map:export:heightmap-3d`) is already written and working.

---

## Architecture

### New module

```
src/ui/map/operational/
├── CoordUtils.ts               (~40 lines)   WGS84 ↔ Three.js world math
├── TerrainMeshBuilder.ts       (~120 lines)  heightmap JSON → BufferGeometry
├── SettlementLayer.ts          (~180 lines)  batched settlement meshes by faction (4 draw calls)
├── FormationBillboardLayer.ts  (~160 lines)  NATO counter sprites + raycasting
├── FrontLineLayer.ts           (~100 lines)  3D front line segments on terrain
├── NatoCounterPainter.ts       (~160 lines)  shared counter drawing (extracted from MapApp.ts)
└── OperationalMapRenderer.ts   (~280 lines)  Three.js scene, mode control, wiring
```

Total: ~1,040 new lines across 7 files.

### Existing files modified (surgical changes only)

| File | Change | Risk |
|------|--------|------|
| `src/ui/map/types.ts` | Add `operationalMode: boolean` to `MapStateSnapshot` | Low — additive |
| `src/ui/map/state/MapState.ts` | Add `setOperationalMode()`, init `operationalMode: false` | Low — additive |
| `src/ui/map/MapApp.ts` | New field + 4 methods touched: `init()`, `render()`, `resize()`, `wireInteraction()` | Medium — surgical |
| `src/ui/map/tactical_map.html` | Add `<canvas id="operational-canvas">` in `.tm-map-wrap` | Low |
| `src/ui/map/styles/tactical-map.css` | Add 3 CSS rules | Low |

The Canvas 2D rendering path in `MapApp.ts` is not touched. The changes are confined to the initialization and mode-dispatch sections.

---

## Coordinate System

Derived from and compatible with the existing `map_2_5d.ts` viewer:

```
WORLD_SCALE = 2.0          // lon/lat delta → Three.js world units
VERT_EXAG   = 0.0018       // vertical exaggeration (same as map_2_5d.ts)

x = (lon - centerLon) * WORLD_SCALE
z = -(lat - centerLat) * WORLD_SCALE   // negated: latitude↑ = −Z
y = elevMeters * VERT_EXAG
```

`centerLon/Lat` is derived from `MapState.panCenter` (normalized [0,1] → WGS84 via `dataBounds`) on every `updateFromMapState()` call. When the center shifts >0.5°, the terrain mesh is rebuilt asynchronously (debounced 500ms, deferred to `setTimeout(0)`) to avoid blocking the animation frame.

The `sampleHeight()` bilinear interpolation function is copied verbatim from `map_2_5d.ts`. No changes to settlement coordinate handling.

---

## Scene Components

### Terrain
- Full 512×512 mesh for all of Bosnia built once on load
- Stride=2 immediately (fast, 16K triangles), then stride=1 async (~262K triangles)
- Vertex colors by elevation: valley green → forest brown → rock → alpine grey
- `MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })`

### Settlement Layer
- 5,823 settlements batched into **4 merged BufferGeometries** (RS / RBiH / HRHB / neutral)
- 4 draw calls total — not 5,823
- Per settlement: outer polygon ring triangulated via `THREE.ShapeUtils.triangulateShape()` (handles concave polygons)
- Each vertex elevated to `sampleHeight(lon, lat) + 0.05` world units above terrain
- Rebuilt only on game-state change, in 500-settlement batches to avoid main-thread jank
- Material: `{ color: factionColor, opacity: 0.72, transparent: true, depthWrite: false }`

### Formation Billboards
- `THREE.Sprite` per formation, texture painted to `OffscreenCanvas(128, 80)` via `NatoCounterPainter.ts`
- `NatoCounterPainter.ts` is a direct extraction of `MapApp.drawNatoFormationMarker()` — identical visual output, works on both Canvas2D and OffscreenCanvas contexts
- Textures cached by `stateHash` (derived from readiness + cohesion + personnel + posture) — repaint only on state change
- Scale computed per-frame from camera height so counters maintain a constant screen pixel size
- Positioned at `sampleHeight(hq_lon, hq_lat) + 0.3` world units

### Front Lines
- `THREE.Line` segments at terrain height + 0.1 world units
- Faction-pairing predicate extracted from `MapApp.ts` into a shared utility called by both 2D and 3D renderers
- Barb tick marks as short `THREE.LineSegments` perpendicular to each segment (same spacing as 2D)

### Lighting
- `DirectionalLight(#c8d8ff, 1.2)` — northwest sun (cool blue-white, low angle)
- `AmbientLight(#203040, 0.6)` — dark cool fill
- `FogExp2(#0a0a1a, 0.04)` — atmospheric haze, consistent with NATO dark theme

### Camera
- `PerspectiveCamera(fov=45)`, fixed isometric-ish pitch ~50°
- Height: 5.0 world units at zoomFactor ≤ 2.5, lerped to 2.5 at higher zoom
- Always looks at `(0,0,0)` = current `panCenter` in world space
- `OrbitControls`: `enablePan=false`, `enableZoom=false`, `enableRotate=false` — camera is fully driven by `MapState`, not user-controlled orbiting
- `enableDamping=true` for smooth transitions

---

## Mode Switch Logic

Added to `MapApp.render()` preamble:

```typescript
const shouldBeOperational = this.state.snapshot.zoomFactor > 1.2
  && !this.state.snapshot.staffMapRegion;

if (shouldBeOperational !== this.operationalModeActive) {
  this.setOperationalMode(shouldBeOperational);
}

if (this.operationalModeActive) {
  this.operationalRenderer?.updateFromMapState(
    this.state.snapshot, this.data, this.activeControlLookup
  );
  return;  // Three.js RAF loop renders independently
}
// ... existing 2D render path unchanged below ...
```

### Canvas visibility

**Critical rule: never use `display:none` on the Three.js canvas** — it destroys the WebGL context in most browsers and requires expensive re-initialization. Always use `opacity` + `pointer-events`:

```css
.tm-operational-canvas               { opacity: 0; pointer-events: none; transition: opacity 350ms ease; }
.tm-operational-canvas.tm-op-active  { opacity: 1; pointer-events: auto; }
.tm-map-canvas-fading                { opacity: 0.15; transition: opacity 350ms ease; }
```

The crossfade is compositor-thread only (no JS cost). The 2D canvas is dimmed to 15% during operational mode so the transition has a physical "depth reveal" feel.

---

## Interaction (Raycasting)

`OperationalMapRenderer` listens to `mousemove` on its canvas and fires a `THREE.Raycaster`:

1. Test against the 4 faction settlement meshes → `getSidAtWorldPoint()` (XZ AABB scan, O(n) over visible settlements) → `callbacks.onSettlementHover(sid)`
2. Test against formation sprites → `callbacks.onFormationClick(id)`

These callbacks are wired to the **same** `MapState` mutations and panel-open logic as the existing 2D `wireInteraction()` handlers. All HUD panels, tooltips, and the minimap work unchanged — they sit in HTML absolutely positioned above both canvases.

---

## Key Code Reuse

| Source | Reused in |
|--------|-----------|
| `map_2_5d.ts` → `sampleHeight()` | Copied verbatim into `TerrainMeshBuilder.ts` |
| `map_2_5d.ts` → `buildTerrainMesh()` | Adapted into `TerrainMeshBuilder.buildTerrainGeometry()` |
| `MapApp.ts` → `drawNatoFormationMarker()` | Extracted into `NatoCounterPainter.ts`; both renderers call it |
| `MapApp.ts` → `shouldDrawFrontSegment()` | Extracted as shared pure function; both renderers call it |
| `MapApp.ts` → `wireInteraction()` callbacks | Replicated exactly in `OperationalMapRenderer` event handlers |
| `MapState` → `panCenter`, `zoomFactor`, `loadedGameState` | Read directly via `snapshot` in `updateFromMapState()` |

---

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Settlement geometry rebuild blocks main thread (~200ms for 5,823 settlements) | Medium | Batch 500 settlements per `setTimeout` tick; old geometry stays visible until new geometry is ready |
| `heightmap_3d_viewer.json` missing in some dev environments | Low | `loadHeightmap()` catches errors and logs warning; renderer degrades to a flat dark plane (settlements and formations still visible) |
| WebGL context limit on Windows (8–16 per page) | Very low | Only 1 extra WebGL context; existing map uses Canvas 2D only |
| Concave settlement polygons produce artifacts with fan triangulation | Medium | Use `THREE.ShapeUtils.triangulateShape(outerRing, [])` — handles any simple polygon correctly |
| `OffscreenCanvas` TypeScript typing conflict with `THREE.CanvasTexture` | Low | Assign to `texture.image` directly and call `texture.needsUpdate = true` rather than using the constructor |
| Staff map region conflict — operational mode must not activate during staff map usage | Low | `shouldBeOperational` check includes `&& !this.state.snapshot.staffMapRegion` |

---

## Implementation Sequence (Suggested Phases)

### Phase A — Terrain rendering (standalone test)
Create `CoordUtils.ts`, `TerrainMeshBuilder.ts`, `OperationalMapRenderer.ts` (terrain + lighting only). Verify terrain renders in isolation by temporarily loading it from `map_2_5d.html` or a test HTML page.

### Phase B — Settlement layer
Add `SettlementLayer.ts`. Wire to baseline `controlLookup` from `LoadedData` (no game state required yet). Verify faction color patches appear on terrain surface at correct locations.

### Phase C — Mode switch wiring
Modify `MapApp.ts`, `tactical_map.html`, `tactical-map.css`. Wire `updateFromMapState()` call. Verify crossfade on zoom in/out. Verify pan center tracks correctly.

### Phase D — Formation billboards
Extract `NatoCounterPainter.ts`. Add `FormationBillboardLayer.ts`. Verify counters appear at correct positions, maintain screen size on zoom.

### Phase E — Front lines + raycasting
Add `FrontLineLayer.ts`. Add raycasting for settlement hover/click and formation click. Verify all interactions work identically to 2D mode.

### Phase F — Polish
Camera lerp tuning, fog density, settlement city labels as `THREE.Sprite` billboards, barb ticks on front lines.

---

## What Does NOT Change

- **All simulation code** — untouched
- **GameState** — untouched
- **Turn pipeline** — untouched
- **Canvas 2D render path** — untouched (Strategic zoom still uses it exclusively)
- **Staff map** — untouched
- **All existing tests** (`npm test`, `npm run test:vitest`) — no new test surface on the simulation side
- **MapState API** — additive only (`operationalMode` field + `setOperationalMode()` method)
- **NATO counter visual design** — pixel-identical in 3D view

---

## Verification Plan

1. `npm run dev:map` → `localhost:3002` → confirm strategic view works as before (zoom 0)
2. Scroll in → canvas crossfades, Three.js terrain appears, settlement colors match faction control
3. Pan → camera target moves, terrain re-centers
4. Load a game run (`?run=...`) → formation counters appear floating above terrain, correct factions
5. Hover settlement → same tooltip as 2D map
6. Click formation → brigade panel opens (same as 2D map)
7. Scroll out → returns to Canvas 2D, no visual artifacts
8. Activate staff map (draw region) → operational mode does NOT activate during staff map session
9. `npm run desktop` → verify same behavior in Electron app window
10. No `npm test` regressions

---

## Related Documents

- `docs/plans/2026-02-18-brigade-aor-redesign-study.md` — settlement-level brigade positioning (independent implementation, no dependency)
- `docs/plans/2026-02-18-warroom-war-phase-modals-design.md` — warroom modal upgrades (independent implementation)
- `src/ui/map/map_2_5d.ts` — prototype to derive terrain code from
- `src/ui/map/MapApp.ts` — target file for surgical modifications
- `data/derived/terrain/heightmap_3d_viewer.json` — pre-built terrain data
