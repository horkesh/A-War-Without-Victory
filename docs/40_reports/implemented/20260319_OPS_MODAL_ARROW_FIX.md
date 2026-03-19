# Ops Modal Arrow Rendering Fix — Implementation Report

**Date**: 2026-03-19
**File**: `src/ui/map/components/ops_modal/OpsMap.tsx`
**Commits**: `df21813`, `9101042`, `4a424f5`, `ab58861`

---

## Summary

Advance arrows in the ops planning modal (staging OSID to objective) were broken and never rendered on the map. The fix required addressing three distinct failure modes that compounded into complete arrow invisibility, plus a fourth fix for the known `setData()` modal bug.

## Background

The ops planning modal was redesigned as a 4-phase corps-level flow (Commander, Plan, G2 Assessment, Authorize) in 16 files under `src/ui/map/components/ops_modal/`. Each phase shares a persistent MapLibre map rendered by `OpsMap.tsx`. During the Plan phase, users click enemy OSIDs to set objectives; the map should draw red tapered arrows from the staging OSID to each objective centroid with a glow effect and numbered labels.

After the redesign, arrows never appeared despite the rendering code being present and the overlay update effect firing correctly.

## Root Causes (three compounding failures)

### Failure 1: Empty staging OSID (df21813)

`defaultStagingOsid` was an empty string when no `sub_segments` had friendly OSIDs for the selected corps. `centroidLookup.get('')` returned `undefined`, making `stagingPt` null. The `fromPt` guard in the arrow builder skipped generation entirely, so zero features were ever produced.

**Fix**: When no staging point is available from the centroid lookup, `findNearestCentroid()` searches all friendly OSID centroids for the nearest one to the first objective. Arrows always have an origin point to draw from.

### Failure 2: Fixed arrow dimensions collapsed at short distances (9101042)

Arrow geometry used fixed constants (0.02 offset, 0.008/0.004 body width) that collapsed to sub-pixel invisible size at short map distances typical in the ops modal view. The main map arrows used distance-scaled dimensions (offset = len * 0.10, body = len * 0.04 / 0.012, head = len * 0.035) that adapted to zoom level and feature spacing.

**Fix**: Ops modal arrows now use the same distance-proportional scaling as the main map, with minimum size floors (0.006 / 0.002 / 0.009) to prevent collapse at very short distances.

### Failure 3: `setData()` silently fails on modal map updates (4a424f5)

`setData()` on dynamically-added GeoJSON sources does not reliably trigger re-render in MapLibre modal contexts. This is a known bug documented in GUI_MASTER section 4. The initial render works, but subsequent updates (changing staging OSID, adding/removing objectives) are silently swallowed. The `replaceArrowSource()` function originally used `setData()` to update arrow features.

**Fix**: `replaceArrowSource()` now removes all arrow layers and the source, then re-adds them with new data. This is the remove+re-add pattern that the old `OpsPlanningModal.tsx` used successfully.

### Additional: Init arrow source creation (inline bypass)

During `map.on('load', init)`, calling `replaceArrowSource(map, EMPTY_FC)` to create the initial empty arrow source failed silently because adding many GeoJSON sources earlier in the same callback put the MapLibre style back into a loading state. An `isStyleLoaded()` guard (intended to prevent "Style is not done loading" errors during HMR) blocked the call.

**Fix**: Init now creates the arrow source and layers inline using direct `map.addSource()` and `map.addLayer()` calls, bypassing the guard. The `replaceArrowSource()` function is only called from the overlay update effect, which gates on `mapReady` (set at the end of init).

## Implementation Details

### Shared layer specifications

Arrow layer specs were extracted into a module-level `ARROW_LAYER_SPECS` constant (typed as `any[]` to avoid MapLibre discriminated union type issues with the `filter` property). Six layer specs define the arrow rendering stack:

1. `ops-advance-glow` — line layer, 18px blur for glow effect
2. `ops-advance-body` — fill layer, tapered polygon body
3. `ops-advance-body-outline` — line layer, body outline
4. `ops-advance-heads` — fill layer, arrowhead triangle
5. `ops-advance-head-outline` — line layer, arrowhead outline
6. `ops-obj-labels` — symbol layer, numbered objective labels (e.g., "1.1", "1.2")

`ARROW_LAYER_IDS` is derived from the specs array rather than maintained as a separate hardcoded list.

### `replaceArrowSource()` function

```
function replaceArrowSource(map, data) {
    // Remove existing layers + source
    for (const id of ARROW_LAYER_IDS) {
        if (map.getLayer(id)) map.removeLayer(id);
    }
    if (map.getSource(ARROW_SOURCE_ID)) map.removeSource(ARROW_SOURCE_ID);
    // Re-add with new data
    map.addSource(ARROW_SOURCE_ID, { type: 'geojson', data });
    for (const spec of ARROW_LAYER_SPECS) {
        map.addLayer({ ...spec, source: ARROW_SOURCE_ID });
    }
}
```

### `findNearestCentroid()` function

Searches all OSID centroids controlled by the player faction, returning the one closest (Euclidean) to the target objective point. Used as fallback when `defaultStagingOsid` has no centroid entry.

### Debug cleanup

All `console.log('[OpsMap click]...')` statements and `window.__opsMap` debug assignments were removed.

## Fix Sequence (chronological)

| Commit | Description |
|--------|-------------|
| `df21813` | Fallback to nearest friendly OSID when staging centroid unavailable |
| `9101042` | Scale arrow dimensions with distance (match main map scaling) |
| `4a424f5` | Replace `setData()` with remove+re-add for arrow source updates |
| `ab58861` | Life lesson documented: never use `setData()` on modal MapLibre sources |

Earlier commits in the session also contributed prerequisite fixes:

| Commit | Description |
|--------|-------------|
| `c008063` | Single map-level click handler (fix double-fire) + mapReady gate |
| `1bbe998` | Use defaultStagingOsid as arrow origin fallback |

## Verification

All 4 phases tested in Chrome against Vite dev server with a loaded 40-week save:

1. **Commander phase**: Officer cards render with personality pips, regional fit badges, prep times. Click-to-select advances to Plan.
2. **Plan phase**: Map-click objectives work (contiguity-validated against `sub_segments.enemy_osids`). Auto-propose populates brigades with march times. Arrows render correctly: red tapered arrow from staging OSID to objective centroid with glow effect.
3. **G2 Assessment phase**: Clipboard with Assessment/Raw Intel tabs. Shows expected placeholder without Electron IPC.
4. **Authorize phase**: Formal OPORD document (faction-localized Serbian). ODOBRENO stamp animation renders on authorization.

### Test results

- `npx tsc --noEmit` — clean
- `npm run test:vitest` — 1203 tests pass, 98 suites
- No application console errors

## Lessons Learned

### 1. `isStyleLoaded()` is unreliable during `on('load')` callbacks

The `load` event fires when the base style finishes loading. However, calling `addSource()` within that callback puts the style back into a loading state. Subsequent `isStyleLoaded()` checks return `false`, which blocked the arrow source creation. Init code should add sources/layers directly without guards, since the `load` event guarantees the base style is ready. Guards belong on update paths (effects that may fire before init completes).

### 2. Never use `setData()` on dynamic sources in modal maps

This is a confirmed MapLibre bug specific to modal/overlay map instances. `setData()` works for the initial data but silently fails on subsequent updates. The workaround (remove all layers + source, re-add with new data) was already documented in GUI_MASTER section 4 and in the old `OpsPlanningModal.tsx`. Three fix iterations were wasted before recognizing this as the same documented bug. Added to `docs/life_lessons.md` as a recently-violated lesson.

### 3. Don't conflate init and update guards

Init and update have different timing guarantees. The `isStyleLoaded()` guard was added to protect the overlay update effect from firing before the map loaded (e.g., during HMR). But sharing that guard with the init path blocked arrow creation entirely. The correct pattern: init creates sources/layers inline (no guard needed inside `on('load')`), and the update effect gates on `mapReady` state (set at the end of init).

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/components/ops_modal/OpsMap.tsx` | Arrow source init fix, `replaceArrowSource` refactor to remove+re-add, shared `ARROW_LAYER_SPECS` constant, `findNearestCentroid` fallback, distance-scaled arrow dimensions, debug cleanup |
