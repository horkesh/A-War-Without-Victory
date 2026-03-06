# Sector Visualization: Per-Segment Hover + Cross-Corps Consolidation Fix

**Date:** 2026-03-06
**Baseline:** Sectors post-OSID-adjacency fix (2026-03-05); hover/click partially broken
**Result:** Full sector hover + click working; hostile-side adjacency prevents cross-corps splits

## Summary
- Fixed sector hover to highlight entire sector (was showing only one polygon boundary segment)
- Fixed cross-corps front splits where edges connect only through hostile-side OSIDs (e.g., Bosanska Gradiska)
- Removed centroid-to-centroid fallback lines that created straight-line artifacts across the map
- Removed phantom grey front edges by filtering through authoritative contact graph pairs

## Problem Analysis

### Dual adjacency system mismatch
The engine uses an operational contact graph (615 edges at w40) while the GUI uses geometric polygon boundary sharing (~2,026 pairs). This creates three categories:

1. **Rendered edges** (~522): Present in both contact graph AND polygon boundaries
2. **Phantom edges** (~1,504): Polygon boundaries between differently-controlled OSIDs NOT in the contact graph. Previously rendered as grey lines.
3. **Invisible edges** (~93): Contact graph edges WITHOUT shared polygon boundaries. No visual geometry exists.

### Cross-corps front splits
`consolidateCrossCorpsFronts()` used only friendly-side OSID adjacency to find connected components. Edges facing the same enemy through different friendly OSIDs were treated as disconnected if those friendly OSIDs weren't themselves adjacent. Example: orahova and gradiska_3 (both RBiH) connect through RS-held kruskik_2 — invisible to friendly-only adjacency.

### Hover showing single segment
The hover highlight used MapLibre `setFeatureState({source, id: edgeId}, {hover: true})` with `promoteId: 'edge_id'`. With per-segment features (each polygon boundary segment is its own feature), this only highlighted segments sharing the same OSID-pair edge_id — not the entire sector.

### Per-segment offset requirement
A single offset_side value for an entire merged chain fails because polygon boundary segment direction is arbitrary (depends on iteration order) and varies along curved fronts. Per-segment offset computation using centroid cross products is required.

## Changes Made

### Engine: Hostile-Side OSID Adjacency (`corps_front_sectors.ts`)
Added hostile-side OSID adjacency to `consolidateCrossCorpsFronts()` after the friendly-side `buildEdgeAdjacency()` call. Edges facing the same hostile OSID are now adjacent for consolidation purposes. Result: all three factions show NO cross-corps splits.

### GUI: Per-Segment Hover Features (`buildFrontEdgesHoverGeoJSON.ts`)
Replaced the grouped/merged approach (one feature per sector+faction) with per-segment features matching `buildCorpsFrontLinesGeoJSON`'s approach:
- Each polygon boundary segment gets its own feature with per-segment offset
- Each feature carries `sector_id` for click/glow filtering and `edge_id` with faction suffix for tooltip lookup
- Offset computed per-segment via centroid cross product: `cross > 0 ? -1 : 1`

### GUI: Sector-Based Hover Highlight (`useMapInteractions.ts`)
Replaced `setFeatureState`-based hover (per-edge) with `setFilter`-based hover (per-sector):
- `setHoverHighlight(sectorId)` sets highlight layer filters to `['==', ['get', 'sector_id'], sectorId]`
- Highlights entire sector on hover, not just one segment
- Removed `promoteId: 'edge_id'` from GeoJSON source (no longer needed)
- Removed `safeSetFeatureState` helper (no longer used)

### GUI: Highlight Layer Filters (`MapContainer.tsx`)
Changed highlight layers from feature-state opacity to filter-based visibility:
- **Before:** `filter: ['==', ['get', 'offset_side'], 1]` + `line-opacity: ['case', ['feature-state', 'hover'], 0.8, 0]`
- **After:** `filter: ['all', ['==', ['get', 'offset_side'], 1], ['==', ['get', 'sector_id'], '__none__']]` + `line-opacity: 0.8`

### GUI: Authoritative Pair Filtering (`buildCorpsFrontLinesGeoJSON.ts`)
Front line rendering now filters by `authoritativePairs` from the contact graph. Phantom edges (polygon-only adjacencies not in any sector) are suppressed. Centroid-to-centroid fallback for invisible edges was removed entirely — those edges exist in sectors but don't produce visible front lines.

## Offset Convention (Reference)

For MapLibre line-offset with geographic coordinates:
- **Positive line-offset** = push RIGHT of line direction
- **Cross product** `dx*(centY-ay) - dy*(centX-ax)`: positive means centroid is LEFT of directed segment
- **Convention:** `cross > 0 → offset_side = -1` (negative offset = push LEFT = toward centroid)
- Both `buildCorpsFrontLinesGeoJSON` and `buildFrontEdgesHoverGeoJSON` use this same convention

## Layer Architecture (Sector Visualization)

| Layer | Source | Purpose | Filter mechanism |
|-------|--------|---------|-----------------|
| `front-edges-hover-pos` | front-edges-hover | Invisible hitbox (offset_side=1) | Static: `offset_side == 1` |
| `front-edges-hover-neg` | front-edges-hover | Invisible hitbox (offset_side=-1) | Static: `offset_side == -1` |
| `front-edges-highlight-pos` | front-edges-hover | Hover glow (offset_side=1) | Dynamic: `sector_id == hoveredSectorId` |
| `front-edges-highlight-neg` | front-edges-hover | Hover glow (offset_side=-1) | Dynamic: `sector_id == hoveredSectorId` |
| `sector-edge-glow-pos` | front-edges-hover | Click glow (offset_side=1) | Dynamic: `sector_id == selectedSectorId` |
| `sector-edge-glow-neg` | front-edges-hover | Click glow (offset_side=-1) | Dynamic: `sector_id == selectedSectorId` |
| `sector-fill` | osid-control | Territory fill | Dynamic: `osid in friendlyOsids` |
| `sector-brigade-rings` | formations | Brigade markers | Dynamic: `id in brigadeIds` |

## Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/corps_front_sectors.ts` | Hostile-side OSID adjacency in `consolidateCrossCorpsFronts()` |
| `src/ui/map/map/builders/buildFrontEdgesHoverGeoJSON.ts` | Per-segment features with per-segment offset |
| `src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.ts` | Authoritative pair filtering, centroid fallback removed |
| `src/ui/map/map/MapContainer.tsx` | Highlight layers: filter-based instead of feature-state; removed `promoteId` |
| `src/ui/map/map/useMapInteractions.ts` | Sector-based hover highlight via `setFilter` instead of `setFeatureState` |

## Lessons Learned

1. **Per-segment offset is non-negotiable** for polygon boundary lines — merged chains invert mid-way because segment direction is arbitrary
2. **Feature-state hover doesn't scale** to per-segment features — use filter-based highlighting by `sector_id` instead
3. **Dual adjacency systems** (engine contact graph vs polygon geometry) require explicit reconciliation: filter by authoritative set, don't render centroid fallbacks
4. **Hostile-side OSID adjacency** is essential for front consolidation — friendly-only adjacency misses fronts that face the same enemy through different friendly OSIDs

## Next Steps
- Visual sign-off on all sector areas
- Commit and propagate to canon/engineering docs
