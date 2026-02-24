# HoI Map Improvement Proposals — Orchestrator Convene

**Date:** 2026-02-23  
**Convened:** Technical Architect  
**Status:** Proposals only — no implementation  
**References:** TACTICAL_MAP_SYSTEM §2; HOI_VISUAL_GUI_OVERHAUL_SPEC §2.3, §9.1; 20260223_HOI_MAP_3D_TILT_AND_TEXTURE_ON_TERRAIN

---

## Context

The main HoI map (`map_hoi.html`, `HoIMapRenderer`) is in a scrollable HTML container, causing dead space on the sides. The user requested **proposals** (options with trade-offs) for five UX and visual improvements. The Technical Architect was convened to produce structured options; the Orchestrator adds recommended direction for each.

---

## 1. Map + GUI integration (layout)

**Current:** Map sits in `.hoi-map-wrap` (flex: 1 1 auto, overflow: hidden). Orthographic camera uses container aspect. Result: dead space on the sides.

**Goal:** Clean integration of map with GUI (sidebar, toolbar, etc.) so the map uses available space well.

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A** | **Full-bleed map with overlaid panels** — Map fills the entire viewport; top bar, sidebar, and status strip are absolutely positioned over the map. | No dead space; map uses all pixels; aligns with “map on the desk” (HOI_VISUAL_GUI_OVERHAUL_SPEC). | Panels cover map; hit-test and focus order must be correct. |
| **B** | **Fixed-aspect viewport with letterboxing** — Fixed map aspect (e.g. 16:9); size to largest fitting rectangle; letterbox on sides or top/bottom. | Predictable; no distortion. | Permanent letterbox = dead space; underuses narrow/wide windows. |
| **C** | **Responsive flex, map always fills** — Keep current flex; ensure map-wrap is the only growing child (sidebar fixed, map flex: 1 1 auto, min-width: 0); remove any scroll/gap from ancestors. | Minimal change; fixes layout/scroll. | If root cause is aspect vs. window shape, dead space may remain. |

**Architect recommends:** A (full-bleed with overlaid panels). If scope is constrained, do C first to remove scroll/gap, then move to A.

**Orchestrator recommends:** **A**, with **C as a low-risk first step** if we want to validate “no scroll/gap” before committing to overlay layout. Document layout decision in TACTICAL_MAP_SYSTEM §2.

---

## 2. Terrain smoothing

**Current:** Terrain mesh built from raw heightmap grid (TerrainMeshBuilder); no smoothing on HoI path. `map_operational_3d` uses `smoothHeightmap(hm, 2, 2)` box-blur; HoI does not.

**Goal:** Smooth terrain mesh/height sampling to reduce jaggedness; minimal scope.

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A** | **Height smoothing before build** — Apply box-blur (or small Gaussian) to elevations before buildTerrainMesh. Reuse `smoothHeightmap(hm, passes, radius)` as in map_operational_3d (e.g. 2, 2). | Small change; reuses existing deterministic logic; no new geometry. | Slight loss of fine detail; clone or in-place contract for HoI load. |
| **B** | **Vertex normal smoothing post-build** — Recompute normals with larger smoothing angle or multiple passes. | Keeps elevation; only shading changes. | Silhouette still jagged; only lighting smoother. |
| **C** | **Subdivision in TerrainMeshBuilder** — Midpoint or linear subdivision to increase vertices and smooth. | Can reduce faceting. | Larger change; more triangles; perf and determinism impact. |
| **D** | **Post-process (e.g. SSAO/blur)** — Keep geometry; soften with post-pass. | No terrain build change. | Does not fix geometry jaggedness; adds pipeline. |

**Architect recommends:** A (height smoothing before build). Run `smoothHeightmap` on HoI heightmap (e.g. 2, 2) before buildTerrainMesh; document shared smoothing contract with operational 3D in TACTICAL_MAP_SYSTEM or tilt report.

**Orchestrator recommends:** **A**. Architect recommendation accepted; minimal and consistent with existing operational 3D path.

---

## 3. Left–right tilt (yaw/roll) for inspection

**Current:** Only vertical tilt (pitch 10°–50°); right-drag vertical adjusts tilt; camera looks at (pan.x, 0, pan.z). No yaw/orbit.

**Goal:** Add left/right tilt so the user can inspect terrain from an angle (e.g. east vs west).

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A** | **Orbit yaw (camera orbits around look-at)** — Camera orbits horizontally around same look-at; horizontal drag (e.g. middle-button or Shift+right-drag) changes yaw; clamp yaw (e.g. ±25°–±35°). | Intuitive “inspect from east/west”; up-axis fixed. | Store yaw; update camera position each frame; pan in sync with look-at. |
| **B** | **Roll only (tilt view left/right)** — Apply roll so map tilts sideways. | Easiest (single axis). | Disorienting; north no longer up. |
| **C** | **Orbit yaw + middle-drag** — Same as A; bind yaw to middle-drag horizontal; left-drag = pan, right-drag vertical = pitch. Optional: Shift+right-drag horizontal as fallback. | Clear separation of pan / pitch / yaw. | Some users lack middle button; need fallback. |

**Architect recommends:** A (orbit yaw) with C’s interaction: middle-drag horizontal for yaw, Shift+right-drag horizontal as fallback. Limit yaw to e.g. ±30°. Do not add roll (B).

**Orchestrator recommends:** **A + C**. Architect recommendation accepted. Document interaction and limits in TACTICAL_MAP_SYSTEM §2.

---

## 4. Zoom and resolution (labels and details)

**Current:** Labels use fixed 128×32 canvas, 14px font; settlement labels scale by zoom (scaleFactor = zoom/DEFAULT_ZOOM) but texture resolution is fixed, so they look soft when zoomed in.

**Goal:** Labels and details scale up with zoom so they stay crisp and readable when zoomed in.

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A** | **LOD: higher-res label texture at close zoom** — When zoom past threshold (e.g. 1.3×–1.5× DEFAULT_ZOOM), use higher-res atlas (e.g. 256×64) and/or larger font (e.g. 18px). | Crisp when zoomed in without always paying cost. | Two asset paths or re-raster per zoom band; LOD thresholds. |
| **B** | **Single higher-res texture, scale sprites by zoom** — One larger texture (e.g. 256×64); scale sprite by zoom so at 2× zoom same texture fills 2× pixels. | One texture; sharp when zoomed. | Higher VRAM/draw at all zoom; may cap scale. |
| **C** | **Re-rasterize faction overlay at close zoom** — When zoomed in, re-rasterize control overlay at e.g. 4096×4096. | Control edges crisp at close zoom. | More GPU memory; LOD switch must avoid pops. |

**Architect recommends:** A (LOD for labels). Zoom band above ~1.3×–1.5× DEFAULT_ZOOM uses 2× resolution or 18px font. Defer faction-overlay LOD (C) unless control edges become a visible issue.

**Orchestrator recommends:** **A**. Architect recommendation accepted. Defer C until control-edge crispness is a reported problem.

---

## 5. Front line definition and style (HoI-like)

**Current:** Fronts drawn for all front_edges (shared borders between hostile-controlled OSIDs). Ribbons: band each side (BAND_HALF_WGS), center line, faction colors each side.

**Goal:** (a) Define front line as **only where we have units** (for now). (b) “Color in more to the inside” of the OSID. (c) Match HoI style.

### (i) HoI4-style front drawing

From HOI_VISUAL_GUI_OVERHAUL_SPEC §2.3 and §9.1: thick band straddling the boundary; **neutral warm grey** fill `rgba(80, 60, 40, 0.6)`; **dark center line** `rgba(40, 30, 20, 0.8)` along the boundary; width zoom-dependent (e.g. 4px strategic, 8px operational, 12px tactical). Optionally intensity by persistence (entrenched vs. new contact) and pressure overlay (green–yellow–red). So: one band, one center line, zoom-scaled width.

### (ii) Restrict fronts to “where we have units”

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Adapter filter** | In GameStateAdapter/ViewerStateAdapter: build set of OSIDs with at least one deployed brigade (location_osid); filter front_edges to edges where edge.a or edge.b in that set. Expose e.g. `frontEdgesOsidWithUnits` or flag “onlyWithUnits”. | Single canonical list for 2D/3D; rendering stays simple. | Adapter contract change. |
| **Renderer filter** | Pass full edges + set of “occupied OSIDs”; filter in HoIMapRenderer before drawing. | No adapter change. | Duplicates logic; 2D/3D could diverge. |

**Architect recommends:** Filter in adapter; expose one list (or “onlyWithUnits”) so map_hoi and HoIMapRenderer stay simple.

### (iii) “Color in more to the inside”

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A** | **Wider ribbon on friendly side** — Larger BAND_HALF_WGS (or second inner band) on “friendly” side so band extends farther into that OSID. | Simple; one width our side, one their side. | Less literal “fill inside” than B. |
| **B** | **Fill band inside polygon** — Offset boundary inward toward centroid; fill between boundary and offset. | More HoI-like interior fill. | Robust inward offset and clipping; more work. |

**Architect recommends:** Start with A (asymmetric band width); consider B as follow-up if needed.

### (iv) Short recommendation matching HoI style

- **Style:** Adopt HOI_VISUAL_GUI_OVERHAUL_SPEC §2.3/§9.1: single neutral band, dark center line, width scaled by zoom. Optionally persistence and pressure later.
- **Definition:** Restrict drawn fronts to edges where at least one adjacent OSID has a deployed brigade (filter in adapter; single list or “onlyWithUnits”).
- **“Color in more”:** Asymmetric band width (wider on friendly side) first; consider inward polygon fill later.

**Orchestrator recommends:** **Architect’s full recommendation.** Filter in adapter for “where we have units”; adopt spec style (neutral band + center line, zoom-scaled width); asymmetric width for “color in more.” Game Designer may need to confirm “front = where we have units” as the intended rule for the current phase.

---

## Summary table

| Area | Architect recommendation | Orchestrator direction |
|------|---------------------------|-------------------------|
| 1. Layout | A (full-bleed); C first if constrained | A; C as low-risk first step if desired |
| 2. Terrain smoothing | A (height smoothing before build) | A — defer to Architect |
| 3. Left–right tilt | A + C (orbit yaw, middle-drag, ±30°) | A + C — defer to Architect |
| 4. Zoom/labels | A (LOD higher-res at close zoom) | A — defer to Architect |
| 5. Fronts | Spec style; adapter filter; asymmetric width | Concur; confirm “front = where units” with Game Designer if needed |

---

## References

- **TACTICAL_MAP_SYSTEM** — `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` §2 (map_hoi, HoIMapRenderer).
- **HOI_VISUAL_GUI_OVERHAUL_SPEC** — `docs/30_planning/20260221_settlement remapping and GUI rework/HOI_VISUAL_GUI_OVERHAUL_SPEC.md` §2.3 (front bands), §9.1 (palette).
- **20260223_HOI_MAP_3D_TILT_AND_TEXTURE_ON_TERRAIN** — `docs/40_reports/implemented/20260223_HOI_MAP_3D_TILT_AND_TEXTURE_ON_TERRAIN.md`.

No implementation in this convene; proposals only. For layout (full-bleed), front-edge adapter contract, and LOD thresholds, document assumptions and get confirmation before implementation.
