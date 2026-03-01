# React Map App — Formation Icon Freeze Investigation and Fix

**Date:** 2026-03-01  
**Phase:** AWWV_GUI_ARCHITECTURE_REWORK_v2 (React + MapLibre canonical GUI)  
**Status:** Fix implemented and build-verified

---

## 1. Summary

After prior load-save and layer-visibility fixes, the map app was freezing again; formation icons were suspected. This report documents the investigation (Orchestrator + performance reasoning), root cause, and the fix.

---

## 2. Investigation

### 2.1 Hot path

- **Overlay effect** (`MapContainer.tsx`, effect on `[loadedGameState, mapReady]`): Runs a triple-rAF chain. In the **third** rAF it:
  1. Builds `formationsGeoJson` and `orderArrowsGeoJson`
  2. Calls **ensureFormationIcons(map, iconIds)** — synchronous
  3. Calls **setData(formations)**, **setData(order-arrows)**
  4. Re-applies formation layer visibility from store

- **ensureFormationIcons** (`formationIcons.ts`): For each unique `icon_id` (e.g. `brigade__RS`, `corps__RBiH`), if the map doesn’t already have the image, it calls **createFormationIcon(iconId)** then **map.addImage(iconId, imageData, { pixelRatio: 2 })**.  
- **createFormationIcon**: Creates a 48×48 canvas, gets 2D context, draws rect + text, then **getImageData(0, 0, 48, 48)**. All on the main thread.

### 2.2 Root cause (performance)

- Unique icon count is bounded by (formation kinds × factions) — typically on the order of 10–20. Each icon does: canvas creation, draw, **getImageData** (~9 KB per icon), and MapLibre **addImage** (GPU upload / style update). Doing all of that **synchronously inside a single rAF** blocks the main thread for hundreds of milliseconds and causes the perceived freeze.
- The overlay effect does **not** re-run the heavy build repeatedly: `appliedStateRef` ensures one overlay build per `loadedGameState`, and the 500ms source poll only checks for sources and does not run the build (per napkin). So the freeze is from **one-shot cost in the third rAF**, not from a poll or effect loop.

### 2.3 Roles used

- **Orchestrator:** Coordinated investigation and fix.
- **Performance reasoning:** Main-thread blocking identified in the formation-icon path; deferral chosen to keep rAF short.
- **Systematic debugging:** Confirmed no re-entrancy or visibility-effect loop; single heavy rAF identified as cause.

---

## 3. Fix

- **Defer** the heavy work (ensureFormationIcons + setData for formations and order-arrows + re-apply formation/label visibility) off the third rAF:
  - Use **requestIdleCallback(fn, { timeout: 400 })** when available so the work runs when the main thread is idle (or after 400 ms at latest).
  - Fallback to **setTimeout(fn, 0)** for environments without `requestIdleCallback`.
- The third rAF now only builds the GeoJSON and the `iconIds` list, then schedules the deferred callback. The rAF returns quickly, so the UI stays responsive.
- **Cleanup:** Store the idle/timeout handle in `deferredOverlayHandleRef` and cancel it in the effect’s return (cancelIdleCallback / clearTimeout) so the callback does not run after unmount or after a new load.

### 3.1 Code changes

- **MapContainer.tsx**
  - Added `deferredOverlayHandleRef` to hold the requestIdleCallback/setTimeout handle.
  - In the third rAF: build formations + order-arrows GeoJSON and `iconIds`; define `runDeferred()` that calls ensureFormationIcons, setData(formations), setData(order-arrows), and re-applies formation/label visibility; schedule `runDeferred` via requestIdleCallback (timeout 400) or setTimeout(0); store handle in ref.
  - In effect cleanup: cancel the deferred handle (cancelIdleCallback or clearTimeout) and clear the ref.
- **formationIcons.ts**: No change; still used from the deferred callback.

### 3.2 Trade-offs

- **Brief delay before markers appear:** Icons and formation data are applied in the next idle (or after 400 ms). In practice this is a short delay (often one frame or a few dozen ms) and avoids a long freeze.
- **Alternative considered:** Batch icon creation across multiple rAFs (e.g. 4 icons per frame). Deferral was chosen first to fix the freeze with minimal code; batching can be added later if needed.

---

## 4. Verification

- `src/ui/map`: `npm run build` (tsc -b && vite build) **passes**.
- No changes to simulation, determinism, or persisted outputs; UI only.

---

## 5. Artifacts

- **Modified:** `src/ui/map/map/MapContainer.tsx` (deferred overlay handle ref, schedule runDeferred, cleanup cancel).
- **Unchanged:** `src/ui/map/map/formationIcons.ts`, `src/ui/map/store/gameStore.ts`.

---

## 6. References

- Napkin: Map overlay poll must not run build when sources are missing; load-freeze fixes (double rAF, appliedStateRef).
- Prior report: Load-save freeze troubleshooting (2026-03-01) in PROJECT_LEDGER.
