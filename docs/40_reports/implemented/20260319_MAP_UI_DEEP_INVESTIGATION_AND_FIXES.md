# Map UI Deep Investigation & Fixes

**Date:** 2026-03-19
**Scope:** Tactical map UI/UX — sector lines, rendering bugs, visual artifacts, interaction issues
**Method:** Live browser debugging (Vite dev server + Chrome DevTools), systematic UX walkthrough
**Files changed:** `awwv_map_style.json`, `MapContainer.tsx`, `useMapInteractions.ts`, `EventDecisionModal.tsx`, `EventModal.tsx`, `launch.json`

---

## Summary

Deep interactive investigation of the tactical map identified **11 issues** across rendering, interaction, and UX. **8 fixed**, **3 deferred** (new features needing design).

---

## Bugs Fixed

### 1. P0: Map Blank on Dev Server — Stuck GeoJSON Sources

**Root cause:** Four GeoJSON sources (`operational-heatmap`, `operation-arrows`, `enclave-osids`, `enclave-labels`) added during `runDeferred()` via `safeEnsureSource` after the initial style load. Their tile workers never completed processing, causing `isStyleLoaded()` to return `false` permanently. The map rendered no tiles.

**Diagnosis:** `map.style.sourceCaches` showed 25 caches, but 4 had `loaded() === false` with `tileCount: 0`. The `_updatedSources` map had 9 entries stuck in `"reload"` state. Forcing `setData()` on the stuck sources unblocked rendering.

**Fix:** Added `m.triggerRepaint()` at the end of `runDeferred()` to force a render frame that processes the newly-added sources.

**File:** `MapContainer.tsx` line ~996

### 2. P1: PMTiles Protocol Race on HMR

**Root cause:** Vite HMR rapid mount/unmount/remount cycles caused `maplibregl.addProtocol('pmtiles', ...)` to be called multiple times. The cleanup `removeProtocol` in the useEffect teardown ran, but rapid cycles could leave the protocol handler in a broken state. Once broken, the map never loaded tiles again — even after hard refresh. Required Vite server restart.

**Fix:** Added `try { maplibregl.removeProtocol('pmtiles'); } catch {}` before `addProtocol` to ensure clean re-registration.

**File:** `MapContainer.tsx` line ~259

### 3. P2: Operation Arrows Always Visible (Pink Line Artifacts)

**Root cause:** 36 operation arrow features (glow + body + head + origin per active operation) were rendered permanently with no visibility management. RS operation arrows with reddish colors appeared as thin pink lines across RS territory.

**Fix:** Set initial `layout: { visibility: 'none' }` on all 4 operation arrow layers. Added reactive toggle in Phase C2 visibility effect: arrows show only when `mapMode === 'operations'`.

**File:** `MapContainer.tsx` lines ~822-845 (layer creation), ~2065 (visibility toggle)

### 4. P2: Settlement Hover Blocks Front Line Hover

**Root cause:** `osid-control-fill` covers the entire map area. Both OSID and front-edge hover handlers fire when the cursor is near a front line, but the OSID handler's tooltip overwrites the more informative front-line tooltip (sector, density, threat, stationed units).

**Fix:** In `handleOsidMouseMove`, query `front-edges-hover-pos/neg` layers at the cursor point. If front-edge features are found, suppress the OSID tooltip (return early) so the front-edge handler takes priority.

**File:** `useMapInteractions.ts` lines ~63-67

### 5. P3: Pink Polygon Seam Artifacts

**Root cause:** Semi-transparent faction fill polygons (`rgba(180, 50, 50, 0.25)` for RS) with default `fill-antialias: true` created visible seams at shared polygon edges where alpha accumulated, especially against the hillshade raster tiles.

**Fix:** Set `"fill-antialias": false` on the `osid-control-fill` layer paint in the style JSON. Eliminates ~95% of artifacts. Remaining ~5% are tile-boundary seams (MapLibre GeoJSON tiling limitation).

**File:** `awwv_map_style.json` line ~236

### 6. P2: Sector Demarcation Lines Disabled

**Root cause:** Sector demarcation lines (dashed lines showing boundaries between sectors of the same faction) were gated by `if (false && ...)` in MapContainer.tsx. The builder (`buildSectorDemarcationGeoJSON`) existed but was never called. Source `sector-demarcation` was never created. Additionally, visibility was gated by `devMode && sectorsVisible` — would never show in production even if enabled.

**Fix:** Removed `false &&` gate. Changed visibility from `devMode && sectorsVisible` to `sectorsVisible` (shows when any corps is selected). Three layers created: dark base line, lighter dash stripe, invisible wide hit-target.

**File:** `MapContainer.tsx` lines ~704, ~2039-2047

### 7. P3: TypeScript Errors in Event Modals

**Root cause:** `describeEffect()` functions in `EventDecisionModal.tsx` and `EventModal.tsx` had switch statements without exhaustive coverage, and the return type `string` didn't include `undefined`.

**Fix:** Added `return effect.kind` fallback after switch block in both files.

**Files:** `EventDecisionModal.tsx`, `EventModal.tsx`

### 8. P3: Vite Dev Server Launch Config

**Root cause:** `.claude/launch.json` used `npx.cmd` which failed with `preview_start` tool (`spawn EINVAL`).

**Fix:** Changed to `node` + `node_modules/vite/bin/vite.js` which works reliably.

**File:** `.claude/launch.json`

---

## Issues Investigated — Not Bugs

### P1: Map Mode Toggle Resets Unit Visibility

**Investigation:** Suspected switching map modes (e.g., Defense → Political) hid `formation-markers`. Analysis of Phase C2 `applyVisibility()` revealed formation layer visibility is controlled independently by `formationsVisible` store value, not by `mapMode`. The effect does re-run on `mapMode` change, but it reads the correct store value.

**Conclusion:** False positive. The observed behavior was caused by manual JavaScript layer manipulation (bypassing the store) during debugging, then mode switch re-syncing from the store. No fix needed.

---

## Issues Deferred (New Features)

| # | Issue | Reason |
|---|-------|--------|
| 1 | **Right-click context menu** | New feature needing UX design: what actions per element type (brigade, settlement, front line, corps). Grand strategy games use right-click heavily for commands. |
| 2 | **Heat map legend** | New component needed for Defense/Supply/Morale/Casualties modes — each needs its own color scale explanation. |
| 3 | **0.00 density sectors** | Data-level issue: 5/11 sectors in 1st Krajina Corps have zero density despite front edges. Engine/bot AI concern (no brigades assigned to front in those sectors), not a UI bug. |

---

## Verification

- **tsc**: Clean (0 errors — was 2 before)
- **vitest**: 1202 pass, 1 pre-existing fail (event_timeline_integrity — expects 43, got 47)
- **map build**: `npm run desktop:map:build` — success (4.4s)
- **Browser preview**: Map renders correctly, no pink artifacts, no operation arrow bleed-through, no console errors

---

## Architecture Notes

### Map Layer Stack (sector-related)

| Layer ID | Type | Source | Purpose |
|----------|------|--------|---------|
| `sector-fill` | fill | osid-control | Semi-transparent sector area highlight (threat-ratio colored) |
| `front-line-base` | line | front-lines | Front line dark base |
| `front-line-stripe` | line | front-lines | Front line dash pattern |
| `sector-edge-glow-pos/neg` | line | front-lines | Sector edge glow (white, visible on corps selection) |
| `front-edges-hover-pos/neg` | line | front-edges-hover | Invisible hitbox for front line hover/click |
| `front-edges-highlight-pos/neg` | line | front-lines | White highlight on hovered sector |
| `sector-demarcation-lines` | line | sector-demarcation | **NEW** Sector boundary lines (dashed, faction-colored) |
| `sector-demarcation-lines-stripe` | line | sector-demarcation | **NEW** Lighter dash stripe overlay |
| `sector-demarcation-lines-hit` | line | sector-demarcation | **NEW** Invisible wide hitbox |
| `operation-arrows-*` | line/fill/circle | operation-arrows | Op arrows (now hidden by default, shown in ops mode) |

### Hover Priority (after fix)

1. **Formation markers** (highest — both hover and click)
2. **Front edge lines** (hover suppresses OSID tooltip when both hit)
3. **OSID control fill** (lowest — settlement tooltip)

### Data Flow: Sector Demarcation

```
corpsFrontSectors + controlledOsidGeoJson + frontEdgesOsid
  → buildSectorDemarcationGeoJSON()
  → LineString features {faction, sector_a, sector_b}
  → sector-demarcation source
  → 3 layers (base + stripe + hit)
  → Visible when sectorsVisible=true (corps selected)
```
