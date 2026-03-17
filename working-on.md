# Map Fill Artifacts — Needs Proper Investigation

## Status
- Map is working: fronts, sectors, roads, rivers, formations — all good
- Political control fill DISABLED (opacity 0) — artifacts gone
- Artifacts appear when fill opacity > 0

## What We Tried (all failed)
1. Merged per-faction MultiPolygons — artifacts persisted
2. Spike vertex removal (716 removed) — large triangles persisted
3. fill-antialias: false — made it worse
4. Separate fill-opacity property — no change
5. Filter by _merged — no change

## What We Know
- Artifacts are semi-transparent triangles
- They appear BEFORE loading a save — NOT from osid-control-fill layer
- After loading, they take on faction colors (appear in same shade but slightly different)
- Source must be a STATIC style layer or the PMTiles vector data itself
- The style JSON is imported via `import styleJson` — bundled by Vite
- All OSM tile layers (earth, water, forest, roads) use non-red colors
- No dynamic layers in MapContainer add red fills before save load
- Merged MultiPolygons for osid-control-fill were a red herring — wrong layer entirely
- ACTUAL source still unidentified — needs browser-side debugging with queryRenderedFeatures

## Next Approach
Use MapLibre's `map.queryRenderedFeatures()` in the browser console to click
on an artifact and identify exactly which feature/OSID creates it. Then inspect
that specific polygon's geometry for self-intersections or topology errors.
Fix the source geometry in operational_settlements.geojson.

Alternatively: use turf.js `buffer(0)` or `cleanCoords` to repair all polygon
geometries before rendering.

## Key Learnings
- `start cmd /c` from bash opens EMPTY windows — use run_in_background
- Always kill stale Vite PIDs with `taskkill //F //PID` before restart
- Style JSON is imported via `import styleJson` — Vite bundles it, clear node_modules/.vite
