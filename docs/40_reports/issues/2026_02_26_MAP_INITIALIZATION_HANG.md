# Issue Report: HoIMapRenderer Initialization Hang (2026-02-26)

**Status: FIXED.** See [20260226_MAP_INITIALIZATION_HANG_FIX.md](../implemented/20260226_MAP_INITIALIZATION_HANG_FIX.md).

## Summary
The map view (`map_hoi.html`) currently appears completely blank (black screen with faint province outlines, lacking all UI layout such as sidebars or toolbars). The root cause is a silent initialization hang within `HoIMapRenderer.init()`. 

Because `tryWebGL` awaiting `renderer.init()` in `map_hoi.ts` never actually resolves, the surrounding UI layout sequence to attach and run all the toolbars, sidebar panels, and data loaders is never triggered.

## Detailed Findings
The application hangs when building the WebGL map context and constructing the 3D terrain representation:
1. **Network Initialization Passes:** All the GeoJSON and JSON fetch operations required for normal mapping (`operational_settlements.geojson`, `heightmap_3d_viewer.json`, etc.) successfully return `HTTP 200` and are parsed correctly. It is not an IO/network bug.
2. **WebGL Context Succeeds:** Headless debug scripts verified that the application can successfully acquire a `webgl2` drawing context from the invisible canvas element created.
3. **Execution Freezes in `init()`:** Internal console checkpoints proved that `HoIMapRenderer.init()` enters its `try` block, fetches data, constructs the OrthographicCamera, dimensions the renderer, and begins to call the internal rendering routines (`this.buildTerrain()`, `this.buildControlLayer()`, etc.). However, it never reaches the end of the method; the promise remains endlessly unresolved.
4. **No Console Errors:** Despite completely blocking the event loop and never showing up on screen, the JavaScript engine does not crash or emit any unhandled exceptions to the developer console.
5. **Vite Build Error:** While testing, executing `npx vite build --config src/ui/map/vite.config.ts` failed due to server-side Node libraries (`node:fs/promises`, `node:path`) being imported into browser code in `src/data/operational_data.ts` and `src/map/terrain_scalars.ts`. The recent refactoring may have accidentally introduced dependencies from the Node simulation side into the React/Vite map UI side. This may be related to the hang if Vite dev server is failing to resolve a silent error inside the chunk.

## Likely Culprits
The culprit lies inside one of the synchronous terrain generation subroutines, most notably:
- `buildHoITerrainTexture` (in `HoITerrainTexture.ts`) which manually iterates 2048 x 2048 pixels (4,194,304 operations). It calculates pixel elevation colors and hillshading on the CPU using `ArrayBuffers` and `OffscreenCanvas`.
- `buildTerrainMesh` (in `TerrainMeshBuilder.ts`) which loops 1,048,576 times to translate the WGS84 coordinates of the heightmap array into 3D positions, and then builds 1024x1024 indexed buffered geometries.

Given that JavaScript is single-threaded, if any of these massive array loops miscalculate their termination bounds (e.g. infinite loop), or scale exponentially, it will indefinitely block execution without throwing.

### Recommended Next Steps for Fix
1. Insert verbose `performance.now()` logging inside the innermost `for` loops of `buildHoITerrainTexture` and `buildTerrainMesh` to identify which specific looping computation causes the stall.
2. Refactor any CPU-bound synchronous map-generation loops into chunks using `requestAnimationFrame` yielding, or completely offload them to a WebWorker so they do not block the page thread during initialization.
3. Consider catching promise timeouts in `map_hoi.ts` around `renderer.init()` so if WebGL initialization takes longer than N seconds or fails silently, the 2D SVG map fallback can take over.
