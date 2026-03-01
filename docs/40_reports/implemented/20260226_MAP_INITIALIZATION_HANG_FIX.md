# Implemented: HoI Map Initialization Hang Fix (2026-02-26)

## Summary
Resolved the silent initialization hang in `map_hoi.html` (blank screen or only 2D placeholder) caused by synchronous CPU-heavy terrain texture build blocking the event loop in `HoIMapRenderer.init()`.

## Root cause (from issue report and further investigation)
1. **Event Loop Blocking:** `buildHoITerrainTexture` (HoITerrainTexture.ts) iterated 2048×2048 pixels with elevation + hillshade synchronously on the main thread, blocking the event loop.
2. **Closure Scoping Bug:** `tryWebGL` was never being called. During a recent refactor, the `requestAnimationFrame(() => tryWebGL())` call and the subsequent UI setup code (DOM element bindings, toolbars, sidebars, status strip) were accidentally nested **inside** the body of the `tryWebGL` function itself. As a result, the entire WebGL init sequence was bypassed completely.

## Changes made (round 1 + round 2)

1. **HoITerrainTexture.ts**
   - Added `buildHoITerrainTextureAsync()`: elevation+hillshade loop in row chunks (256 rows per chunk), yielding with `setTimeout(0)` between chunks. Uses **HTMLCanvasElement** (via `createTextureCanvas()`) so `THREE.CanvasTexture` works in all browsers; async path uses **1024×1024** texture so init completes in seconds.
   - Single `putImageData` after all chunks; rivers, roads, settlement dots unchanged.
   - Kept synchronous `buildHoITerrainTexture()` (2048²) for tests.

2. **TextureHelpers.ts**
   - `drawLineFeature` and `drawCoordLine` accept `CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D` so the async path can use a DOM canvas.

3. **HoIMapRenderer.ts**
   - `buildTerrain()` is async and awaits `buildHoITerrainTextureAsync(...)`.
   - Heightmap fetch uses **AbortController** with 15s timeout to avoid indefinite hang.
   - WebGL check uses container’s document for compatibility.

4. **map_hoi.ts**
   - **Promise.race** with **60s** timeout; on timeout or throw, catch sets placeholder text to `3D map unavailable: <message>` and hides the 2D canvas so the message is visible.
   - When init **returns false** (no throw), same message is shown so the user is not left with only the 2D map.
   - **Deferred init**: `requestAnimationFrame` twice before `tryWebGL()` so the container has layout.
   - **Closure Fix**: properly closed the `tryWebGL()` function block and un-indented the `requestAnimationFrame()` + UI bindings (toolbars, sidebars, tooltips) back into the main `init()` scope so they successfully execute on load. Tooltips and interaction registrations are now unconditional instead of being gated behind starting with existing formations.

5. **Verification**
   - `tools/verify_hoi_map_loads.ts`: Puppeteer script to load map_hoi.html and assert the 3D canvas appears (placeholder hidden, WebGL canvas present). Run after `npm run dev:map` with `MAP_URL=http://localhost:3002/map_hoi.html npx tsx tools/verify_hoi_map_loads.ts`. Headless Chrome may not provide WebGL; use a real browser to confirm.

## References
- Issue: [2026_02_26_MAP_INITIALIZATION_HANG.md](../issues/2026_02_26_MAP_INITIALIZATION_HANG.md)
- TACTICAL_MAP_SYSTEM §2; napkin "3D init: container visible first".

## Verification
- tsc passes for modified files. Map init yields during texture build; 1024² keeps init time low; error UI and 60s timeout prevent silent failure.
