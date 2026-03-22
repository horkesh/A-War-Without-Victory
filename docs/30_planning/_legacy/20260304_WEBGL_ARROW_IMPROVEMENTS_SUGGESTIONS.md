---
title: "WebGL Map Polish & Arrow Improvements Suggestions"
date: "2026-03-04"
status: "PROPOSAL"
---

# WebGL (MapLibre) Map Polish & Arrow Improvements

## 1. Current State & Architecture Context

Following the GUI Architecture Rework v2, the canonical map is now a **React + MapLibre GL JS WebGL app** (`src/ui/map/`), fed by PMTiles and GeoJSON sources. 
The legacy "3D" map (`map_hoi.html`) and "2D" maps (`tactical_map.html`) are no longer the target for UI/UX improvements. 

Currently, order arrows are built via `buildOrderArrowsGeoJSON.ts` as simple 2-point `LineString` GeoJSON features (from `source_osid` centroid to `target_osid` centroid) and styled via standard MapLibre `line` layers in `awwv_map_style.json`:
- **Attack Arrows:** Solid red lines, `line-cap/line-join: round`, scaling width (1.2px at z6 up to 3.8px at z14).
- **Movement Arrows:** Dashed green lines (`[3, 2]`), scaling width.

While functional, these read as basic GIS vectors rather than a polished operational wargame map.

## 2. High-Fidelity Arrow Suggestions (MapLibre Approach)

To emulate the "Hearts of Iron" swept operation arrow feel in our MapLibre stack, we need to move beyond simple straight lines. 

### A. Bézier Curves via GeoJSON Pre-Processing
**Concept:** Instead of `[fromPoint, toPoint]`, `buildOrderArrowsGeoJSON.ts` should emit a multi-segment `LineString` that forms a smooth sweeping curve.
**Implementation:**
- Calculate a midpoint perpendicular offset based on the distance between the source and target.
- Use a quadratic Bézier curve to generate 10–20 interpolated points.
- The offset direction (left or right) can be deterministically derived from the `brigadeId` hash, so multiple brigades attacking the same target fan out into distinct, non-overlapping sweeps.

### B. True Arrowheads with Symbol Layers
**Concept:** Lines alone don't definitively convey directionality without scrutinizing the origin.
**Implementation:**
- Add a new `symbol` layer to `awwv_map_style.json` linked to the `order-arrows` source.
- Configure `symbol-placement: "line"` or `"line-end"`. (Alternatively, calculate the arrowhead coordinates directly in `buildOrderArrowsGeoJSON.ts` and output it as a `Point` feature with an explicit `bearing` property).
- Configure `icon-image: "cone-arrowhead"` (adding the icon to the Sprite atlas in our tile generation).
- Configure `icon-keep-upright: false` so the arrowhead follows the rotation of the curve at the target.
- Configure `icon-color: ["get", "color"]` or rely on faction-specific layers.

### C. Faction-Colored vs. Semantic Coloring
**Concept:** The "NATO Ops Center" to "Printed War Map" shift implies warm, thematic colors. Instead of generic Red (attack) and Green (move).
**Implementation:**
- Color shafts in the acting faction's thematic color `get("factionColor")` but with different opacities/strokes.
- **Attack:** Bold faction-colored core with a dark outline.
- **Movement:** Thinner, dashed faction-colored core, lower opacity.
- *Status:* If the attacking brigade is out-of-supply/low cohesion, the arrow stroke could become jagged or faintly translucent.

### D. Multi-Unit Operations Visual Grouping (OP Corridors)
**Concept:** When multiple brigades participate in a named operation (`stageCorpsAttackAxisOrder` etc.), they shouldn't look like unconnected straight lines. 
**Implementation:**
- Detect common `target_osid` destinations or shared `corpsId` / operations. 
- Re-route their geometries to form a "trunk and branches" tree, or parallel sweeping arcs. 
- MapLibre's `line-offset` could be used to separate coincident shafts without overwriting their geometry.

## 3. Map Polish & Interactivity Layers

### A. Pulsing / Dynamic Staging Feedback
**Concept:** Pending orders should stand out and "breathe," while committed orders should look solid. 
**Implementation:**
- MapLibre doesn't have a native CSS `pulse` animation for GeoJSON lines, but we can animate layer opacity or `line-dasharray` offsets efficiently in React.
- Set up a lightweight `requestAnimationFrame` loop in `MapContainer.tsx` that calls `map.setPaintProperty('attack-arrows-staged', 'line-opacity', Math.sin(time) * 0.3 + 0.6)`.

### B. "Fog of War" / Recon Ghosting 
**Concept:** We need visual indicators for enemy intelligence staleness.
**Implementation:**
- Add an `intel_freshness` property to `formations` GeoJSON features.
- In `awwv_map_style.json`, bind `icon-opacity` to fade if intel is older, e.g., `["interpolate", ["linear"], ["get", "intel_age"], 0, 1.0, 3, 0.4]`.
- Consider changing `icon-color` to a desaturated or grayscale overlay on stale contacts to distinguish them from actively tracked enemies.

### C. Friction / Border Visuals
**Concept:** Entrenched, heavily fought borders should look like scars on the map.
**Implementation:**
- Currently we use a glowing neon style (`faction-border-glow-pos`).
- Introduce a data-driven line property based on the `front_pressure` or `active_streak`. Longer active streak = wider, darker, more opaque center line. Fluid fronts = thin and faint. 
- Consider a `line-pattern` (barbed wire or hatching) for entrenched front segments that repeats along the path in MapLibre.

## 4. Next Steps
1. Discuss and approve Bézier rendering math inside `buildOrderArrowsGeoJSON.ts`.
2. Generate/integrate the cone arrowhead sprite into the MapLibre style stack.
3. Validate performance of `requestAnimationFrame` opacity pulsing for staged vs. committed orders.
