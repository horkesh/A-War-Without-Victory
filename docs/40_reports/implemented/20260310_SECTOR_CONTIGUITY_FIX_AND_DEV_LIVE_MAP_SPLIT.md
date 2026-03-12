# Sector Contiguity Fix (Point-Contact Bridging) + Dev/Live Map Split

**Date:** 2026-03-10
**Run ID:** `apr1992_definitive_40w__819a5354397182c1__w40_n554`
**Baseline:** n532 (triple-junction sector fix, 87.0% area-weighted)
**Result:** n554 — 88.5% area-weighted, 78 sectors. 0 sectors spanning Srebrenica+Visegrad.

## Summary

- **Sector contiguity fix**: Front edges no longer bridge across enemy territory via polygon point contacts. `buildSharedBoundaryAdjacency()` uses `min_dist` from the operational contact graph to distinguish real shared boundaries (min_dist=0) from point contacts (min_dist>0). Applied in Case B of `buildEdgeAdjacency` and `splitNonContiguousSectors`.
- **Dev/live map split**: Single codebase, `devMode` flag. Live map auto-loads latest save as RBiH, hides Load/Run tools, merges Fronts+Sectors into one "Front" toggle. Dev map (Vite dev or `?dev=1`) shows all tools.
- **Front lines as sectors (live mode)**: Front line segments now carry `sector_id`; merge key changed from `corps_id` to `sector_id` so lines break at sector boundaries. Sector glow renders centered on the front line (no offset), replacing the front line visually when selected. Lateral sector demarcation lines hidden in live mode.

## Changes Made

### 1. Sector Contiguity: Point-Contact Bridging Fix

**Root cause**: In `buildEdgeAdjacency` Case B (same hostile OSID, friendly OSIDs adjacent), `bostahovine_2` and `pomol_2` were connected via polygon point contact (min_dist=1.7e-13), bridging the Srebrenica and Visegrad fronts across RS-controlled `sebiocina`.

**Fix**:
- Added `min_dist` field to `EdgeRecord` interface and `parseEdges()` in `src/map/settlements.ts`
- Added `buildSharedBoundaryAdjacency()` to `src/sim/combat/osid_adjacency.ts` — filters edges where `min_dist > SHARED_BOUNDARY_THRESHOLD (0)`
- Threaded `sharedBoundaryAdj` through the entire sector pipeline: `buildCorpsFrontSectors` → `buildFactionSectors` → `buildMultiSectorsForCorps` → `findSubSegments` → `buildEdgeAdjacency` and `splitNonContiguousSectors`
- Case B in both `buildEdgeAdjacency` and `splitNonContiguousSectors` now uses `sharedBoundaryAdj` for friendly-OSID adjacency check

**Dead code cleanup**: Removed `consolidateSharedFriendlyOsids` (~100 lines) and `consolidateSharedEdgesAcrossSectors` (~120 lines) — abandoned edge-movement approach from prior session attempts.

### 2. Dev/Live Map Mode

- `gameStore.ts`: Added `devMode` boolean + `isDevMode()` helper. Auto-ON during Vite dev; opt-in via `?dev=1` in production. Force live via `?live=1`.
- `TopToolbar.tsx`: Load Save, Load Latest, Run ID, Load Run wrapped in `{devMode && ...}`. "DEV" badge shown when active.
- `App.tsx`: Live mode auto-loads `latest_run_final_save.json` as RBiH on startup.

### 3. Front Lines as Sectors (Live Mode)

- `buildCorpsFrontLinesGeoJSON.ts`: Added `sector_id` to `CorpsGlowProperties` and `CorpsFrontProperties`. Merge group key now includes `sector_id` — front line segments from different sectors won't merge, creating natural visual breaks at sector boundaries.
- `MapModeToolbar.tsx`: Live mode shows 7 toggles (no separate "Fronts" — replaced by "Front" controlling `sectorsVisible`). Dev mode keeps all 8.
- `MapContainer.tsx`:
  - `effectiveFrontsVisible = devMode ? frontsVisible : sectorsVisible` — in live mode front layers follow sectors toggle
  - Sector edge glow + highlight layers: no `line-offset` in live mode (centered on front line, wider, with `line-blur` for soft glow)
  - Lateral sector demarcation lines hidden in live mode

## Scenario Results

### OSID Match Rate (n554)
- **Overall**: 641/744 (86.2% count), **88.5% area-weighted** (up from 87.0% at n532)
- Krajina 98.2%, Posavina 90.5%, Drina 79.1%, Central Corridor 91.3%, Central Bosnia 77.9%, Sarajevo 74.2%, Herzegovina 91.5%

### Faction Totals (area-weighted)
- RS: 60.7% (painted 65.3%, delta -29 count)
- RBiH: 26.5% (painted 23.2%, delta +25 count)
- HRHB: 12.7% (painted 11.5%, delta +4 count)

### Sector Validation
- Total sectors: 78 (was 77 at n532)
- Sectors spanning Srebrenica+Visegrad: **0** (was the bug)
- `bostahovine_2` and `pomol_2` never in same sector: **confirmed**

## Files Changed

| File | Change |
|------|--------|
| `src/map/settlements.ts` | Added `min_dist` to `EdgeRecord`, parsing in `parseEdges()` |
| `src/sim/combat/osid_adjacency.ts` | Added `buildSharedBoundaryAdjacency()`, `SHARED_BOUNDARY_THRESHOLD=0` |
| `src/sim/combat/corps_front_sectors.ts` | Thread `sharedBoundaryAdj` through pipeline; Case B uses it; removed 2 dead functions (~220 lines) |
| `src/ui/map/store/gameStore.ts` | Added `devMode`, `isDevMode()` with `?dev=1`/`?live=1` support |
| `src/ui/map/components/TopToolbar.tsx` | Dev-only load controls, DEV badge |
| `src/ui/map/components/MapModeToolbar.tsx` | Separate `DEV_LAYER_TOGGLES` / `LIVE_LAYER_TOGGLES` |
| `src/ui/map/App.tsx` | Live mode auto-load latest save as RBiH |
| `src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.ts` | `sector_id` on glow+front features; merge key by sector |
| `src/ui/map/map/MapContainer.tsx` | `effectiveFrontsVisible`; live mode centered glow; demarcation hidden |

## Lessons Learned

- **Point contacts vs shared boundaries**: Polygon adjacency graphs must distinguish real shared boundary segments (min_dist=0) from vertex-only contacts (min_dist>0). The operational contact graph already has `min_dist` — just needed to use it.
- **Edge-movement consolidation doesn't work**: Moving edges between sub-segments/sectors to fix shared friendly OSIDs causes cascading size/brigade changes. Splitting at the geometry level (shared boundary adjacency) is cleaner and less disruptive.
- **Front line merge key = sector demarcation**: By grouping the merge by `sector_id`, natural gaps appear at sector boundaries without any additional geometry computation.
- **Live/dev split via store flag**: Single codebase with a boolean is much cleaner than separate entry points or build configs.

## Next Steps

1. Visual polish: sector boundary markers (perpendicular ticks or color pulses) at front line breaks if gaps alone aren't distinctive enough
2. Live mode: faction switcher for dev inspection without full dev toolbar
3. Sector contiguity: monitor for other point-contact bridges in different regions
4. Calibration: RS w20 benchmark still needs tuning (failed at -8.7% in n532)
