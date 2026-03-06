# Refactor Pass — GUI Polish Session (Post–Orchestrated Execution)

**Date:** 2026-03-05
**Scope:** Files modified or created in the GUI Polish Overhaul session (pressure mode, Ops Planning modal, status strip, minimap, arrows, polish). Refactor focused on dead code, duplication, and shared utilities.

## Summary

- **Deduplicated** OpsPlanningModal: merged identical `buildObjectiveFeatures` and `buildSectorOverlayFeatures` into a single `buildOsidFilteredFeatures(controlGeo, osids)` helper; tightened `controlGeoRef` type to `FeatureCollection<Polygon | MultiPolygon> | null`.
- **Simplified** useKeyboardShortcuts: replaced long ternary chain for keys 1–5 with `Number(event.key)` and range check.
- **Extracted** shared PMTiles URL rewriter: new `src/ui/map/map/rewritePmtilesUrls.ts` used by MapContainer and OpsPlanningModal; removed duplicate in-file implementations.

No behavior or API changes; `npx tsc --noEmit` passes. Vitest: 7 pre-existing failures in supply_reserves and supply_phase_e1 (unchanged by this refactor).

## Changes Made

### 1. OpsPlanningModal.tsx

- Replaced `buildObjectiveFeatures(osids)` and `buildSectorOverlayFeatures(osids)` with one helper:
  - `buildOsidFilteredFeatures(controlGeo: FeatureCollection<Polygon | MultiPolygon> | null, osids: string[])`
- Call sites: `refreshOverlaySources` now calls `buildOsidFilteredFeatures(controlGeoRef.current, friendlyOsids)` and `buildOsidFilteredFeatures(controlGeoRef.current, objectiveOsids)`.
- Typed `controlGeoRef` as `useRef<FeatureCollection<Polygon | MultiPolygon> | null>(null)`; assignment from `buildControlGeoJSON` cast to that type.

### 2. useKeyboardShortcuts.ts

- Digit handling was: `event.key === '1' ? 1 : event.key === '2' ? 2 : ... ? 5 : 0`.
- Now: `const n = Number(event.key); const digit = n >= 1 && n <= 5 ? n : 0;`

### 3. rewritePmtilesUrls — shared module

- **New file:** `src/ui/map/map/rewritePmtilesUrls.ts`
  - Exports `rewritePmtilesUrls(style: Record<string, unknown>, origin: string): Record<string, unknown>` (rewrites `pmtiles:///` to `pmtiles://${origin}/` in the style JSON).
- **MapContainer.tsx:** Removed local `rewritePmtilesUrls`; added `import { rewritePmtilesUrls } from './rewritePmtilesUrls'`.
- **OpsPlanningModal.tsx:** Removed local `rewritePmtilesUrls`; added `import { rewritePmtilesUrls } from '../map/rewritePmtilesUrls'`.

## Verification

- `npx tsc --noEmit`: **pass**
- `npx vitest run`: **7 failed** (all in `supply_reserves.test.ts`, `supply_phase_e1.test.ts`) — pre-existing supply baseline/constant mismatch; no refactored code in supply path.

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/map/rewritePmtilesUrls.ts` | **New** — shared PMTiles URL rewriter |
| `src/ui/map/components/OpsPlanningModal.tsx` | Single `buildOsidFilteredFeatures`; import rewritePmtilesUrls; controlGeoRef type |
| `src/ui/map/map/MapContainer.tsx` | Import rewritePmtilesUrls; remove local rewriter |
| `src/ui/map/hooks/useKeyboardShortcuts.ts` | Simplified digit parsing for keys 1–5 |

## Next Steps

- None required for this refactor. Optional: add `rewritePmtilesUrls.ts` to MAP_UI_MASTER directory layout and CONSOLIDATED_IMPLEMENTED index; document in PROJECT_LEDGER.

## Propagation

This report is referenced from CONSOLIDATED_IMPLEMENTED. Engineering docs (MAP_UI_MASTER, REPO_MAP) updated to include the new `rewritePmtilesUrls.ts` path and keyboard shortcut 5 for Density where applicable.
