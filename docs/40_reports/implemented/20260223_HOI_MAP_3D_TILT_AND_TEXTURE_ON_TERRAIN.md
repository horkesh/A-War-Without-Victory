# HoI Map 3D Tilt Fix & Political Control Texture-on-Terrain

**Date:** 2026-02-23  
**Status:** Completed  
**Spec / context:** HOI_VISUAL_GUI_OVERHAUL_SPEC §2; TACTICAL_MAP_SYSTEM §2 (map_hoi); ADDENDUM_25D_AND_MOSTAR_SPLIT Part B

---

## 1. Summary

Two related fixes to the HoI-style 2.5D map (`map_hoi.html`, `HoIMapRenderer.ts`) so that political control and front lines remain visually correct at all camera tilt angles (10°–50°):

1. **Phase 1 — Layer separation at tilt:** Eliminated visible floating of overlay layers above the terrain by reducing physical Y-offsets and using polygon offset + depth ordering instead.
2. **Phase 2 — Texture-on-terrain:** Replaced the separate floating political-control polygon mesh with a **faction overlay texture** rasterized onto a 2048×2048 canvas and applied directly to the terrain mesh geometry. Control colors now follow the terrain surface exactly; no gaps or terrain poke-through at any tilt.

Result: Political control and front lines stay flush with the terrain at all viewing angles. Raycasting for settlement hover/click is unchanged (invisible control mesh retained for hit-detection).

---

## 2. Problem Statement

- **Tilt artifacts:** When the orthographic camera was tilted beyond ~20°, the political control layer and front line ribbons visibly separated from the terrain. Large Y-offsets (0.02–0.104) had been used to resolve depth ordering; at steep angles these produced visible gaps and “floating” overlays.
- **Uncolored terrain:** Even after reducing Y-offsets, the control layer was a separate mesh whose polygons did not perfectly tile the terrain surface. At ridges and slopes, bare terrain showed through (“not all of the terrain is colored”).
- **User ask:** “Apply the control/fronts directly to terrain and not overlay it somehow.”

---

## 3. Phase 1: Depth and Tilt Fixes (No Physical Float)

### 3.1 Camera

- **Orthographic camera far plane:** `1000` → `100` for ~10× better depth buffer precision in the relevant depth range.

### 3.2 Political Control Layer (Pre–texture-on-terrain)

- **Base Y:** `CONTROL_Y_OFFSET` reduced from `0.02` to `0.001`.
- **Per-feature Y step removed:** All features share the same Y. Overlap between operational polygons is resolved by **reverse iteration** (highest feature index drawn first) plus **`depthFunc: THREE.LessDepth`** so the first-drawn fragment wins at equal depth.
- **Material:** `polygonOffset: true`, `polygonOffsetFactor: -1`, `polygonOffsetUnits: -4` for stable ordering vs. terrain.

### 3.3 Front Ribbons and Other Overlays

- **Front line ribbons:** Y reduced from `0.10` to `0.002`; center line from `0.102` to `0.003`.
- **ZoC layer:** Y from `0.03` to `0.004`.
- **Assignable front segments:** Y from `0.104` to `0.005`.
- All use **`polygonOffset`** (increasing bias by layer) for z-fighting insurance; `depthTest: true`, `depthWrite: true` (or as appropriate per layer).

### 3.4 Tilt UX

- **Keyboard shortcuts:** `t` increases tilt by 5°, `T` (Shift+t) decreases by 5° (within MIN_TILT_DEG 10°–MAX_TILT_DEG 50°).

---

## 4. Phase 2: Political Control as Texture on Terrain

### 4.1 Approach

Instead of a second mesh of draped polygons above the terrain:

- **Faction overlay texture:** A 2048×2048 `OffscreenCanvas` is filled by rasterizing each operational settlement polygon (from `operational_settlements.geojson`) in canvas 2D with faction color at 75% opacity (`rgba(r,g,b,0.75)`). Coordinate mapping uses the heightmap bbox so (lon, lat) maps 1:1 to texture (u, v) used by the terrain mesh.
- **Same geometry:** A second mesh is created with **the same `BufferGeometry`** as the terrain mesh (shared reference). It uses a `MeshBasicMaterial` with this texture, `transparent: true`, `depthWrite: false`, and `polygonOffset` so it draws in front of the base terrain. Because it uses the same vertices and UVs, the control colors sit exactly on the terrain surface—no gaps, no poke-through at any tilt.
- **Control mesh retained for raycasting:** The original per-vertex-colored control mesh (one merged mesh of all operational polygons) is still built and kept in memory but **not added to the scene** and **not visible**. The raycaster continues to use it for hover and click; `featureFromIntersection()` and `featureByTriIndex` are unchanged.

### 4.2 Implementation Details

| Component | Behavior |
|-----------|----------|
| **`buildFactionOverlay()`** | Called from `buildControlLayer()` after the control mesh is built. Clears a 2048×2048 canvas; for each operational feature, gets `getMajorityController(feature)`, maps hex to `rgba(r,g,b,0.75)`; for each polygon coord set, draws outer ring + holes with `fill('evenodd')`. Creates `THREE.CanvasTexture`, then a mesh with `terrainMesh.geometry` and `MeshBasicMaterial` with that texture, `polygonOffset`, `depthTest: true`, `depthWrite: false`. Mesh added to scene; visibility follows F2 Political layer toggle. |
| **`factionOverlayMesh`** | New private field; disposed in `dispose()` and when rebuilding overlay (e.g. control data change). |
| **Layer visibility** | `applyLayerVisibility()` sets `factionOverlayMesh.visible = layerVisibility.control` (no longer toggles the visible control mesh, which is now hidden). |
| **Rebuild trigger** | `setControlBySettlement()` → `buildControlLayer()` → builds invisible control mesh + `buildFactionOverlay()`. |

### 4.3 What Stays the Same

- **Front line ribbons** remain separate geometry (border-based ribbons at Y ≈ 0.002–0.003 with polygon offset). They are not baked into the terrain texture.
- **ZoC, assignable segments, formations, labels** unchanged.
- **Settlement tooltips and click** still use the invisible control mesh and `featureByTriIndex`.

---

## 5. Files Touched

| File | Change |
|------|--------|
| **`src/ui/map/renderer/HoIMapRenderer.ts`** | Camera far 1000→100; CONTROL_Y_OFFSET 0.02→0.001; removed per-feature Y step; control mesh no longer added to scene (invisible), still built for raycasting; added `buildFactionOverlay()`, `factionOverlayMesh`; applyLayerVisibility toggles faction overlay; dispose cleans up faction overlay texture/mesh; front/ZoC/assignable Y and polygonOffset as above; `t`/`T` tilt shortcuts. |
| **`.agent/napkin.md`** | Session notes: HoI 3D tilt fix (phase 1 + phase 2 texture-on-terrain), verification at 20°/35°/50° tilt. |

No changes to TerrainMeshBuilder, HoITerrainTexture, or operational GeoJSON loading.

---

## 6. Verification

- **Visual:** At 20°, 35°, and 50° tilt, political control colors stay on the terrain with no visible separation, gaps, or brown terrain showing through. Front ribbons remain aligned with borders.
- **Interaction:** Settlement hover tooltip and click still resolve to the correct operational feature (OSID, controller, etc.) via the invisible control mesh.
- **Build:** `npx tsc --noEmit` clean.

---

## 7. Canon and Docs Propagation

- **TACTICAL_MAP_SYSTEM.md:** §2 map_hoi bullet updated to reference texture-on-terrain and tilt fix (see propagation below).
- **context.md:** Implementation references updated to include this report and §35 of IMPLEMENTED_WORK_CONSOLIDATED.
- **40_reports:** New report in `implemented/`; CONSOLIDATED_IMPLEMENTED and IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md §35; README §2.
- **PROJECT_LEDGER.md / PROJECT_LEDGER_KNOWLEDGE.md:** Changelog and Map & visualization knowledge updated.

---

## 8. Patterns for Future Work

- **Layering in 2.5D:** Prefer **polygon offset** and **depthFunc** over large physical Y-offsets so layers stay visually flush with the terrain at all tilt angles.
- **“Overlay” vs “on terrain”:** For full coverage and no gaps, paint into a **texture** using the same UV space as the terrain and draw with **shared geometry**; keep a separate invisible mesh for hit-detection if needed.
- **Orthographic depth:** Tightening the camera far plane (e.g. 1000→100) improves depth precision when the scene depth range is small.
