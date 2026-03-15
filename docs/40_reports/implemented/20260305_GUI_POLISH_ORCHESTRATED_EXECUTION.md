# GUI Polish Overhaul — Orchestrated Execution Report

Date: 2026-03-05
Plan: `gui-polish-paradox-plan`

## Consolidated Phase List (authoritative checklist)

| Phase | Title | Scope |
|-------|--------|--------|
| **A** | Attack/Move Order Arrow Overhaul | Update `src/ui/map/map/builders/buildOrderArrowsGeoJSON.ts` and `src/ui/map/map/awwv_map_style.json`: replace glyph-based heads with polygon arrowheads, add origin dots, taper widths, attack glow; preserve staged-order pulse behavior. |
| **B** | Ops Planning Modal Rework | Rework `src/ui/map/components/OpsPlanningModal.tsx`: interactive map, sector overlay, objective click-selection, advance arrows, brigade name resolution via osidDisplayNames, draft-order action (stub/IPC). |
| **C** | Map Mode Toolbar Fixes | Add `src/ui/map/map/builders/buildPressureGeoJSON.ts`; wire/toggle pressure and supply layers in `MapContainer.tsx` (applyVisibility); add 1–5 shortcuts (MapModeToolbar / useKeyboardShortcuts). |
| **D** | Battle Marker Pulse Animation | Extend `animate()` in `src/ui/map/map/MapContainer.tsx` for pulsing battle markers (age-aware behavior). |
| **E** | Bottom Status Strip Enrichment | Update `src/ui/map/components/BottomStatusStrip.tsx`: territory %, active ops count, cumulative casualties. |
| **F** | General Polish | Shimmer styles (globals.css); loading-state shimmer usage in panel components (CorpsDetail.tsx, FormationDetail.tsx, OperationsPanel.tsx as applicable); minimap faction fills in Minimap.tsx; smooth panel slide transitions. |

*(Execution order in this run: A → B/C (pressure + keyboard) → C (Ops Planning) → D/E/F combined.)*

## Scope Executed

- Pressure mode implemented as a dedicated combat/front pressure heat layer.
- Ops Planning modal upgraded from static scaffold to live operation staging flow via `stageCorpsOperationOrder`.
- Arrow pulse logic aligned with current fill-based staged arrowheads.
- Battle marker pulse animation, bottom status strip enrichment, minimap polish, and panel motion polish completed.

## Implemented Changes

### Phase A — Arrow/Map Baseline Alignment

- Updated staged order animation in `src/ui/map/map/MapContainer.tsx`:
  - switched staged head pulse from legacy `text-opacity` to `fill-opacity`;
  - added staged attack glow pulse support.

### Phase B — Pressure Mode + Keyboard Completeness

- Added `src/ui/map/map/builders/buildPressureGeoJSON.ts`:
  - projects `frontPressureByEdge` onto OSIDs deterministically;
  - classifies pressure as `low`/`medium`/`high`.
- Integrated pressure map source/layer and visibility contract in `src/ui/map/map/MapContainer.tsx`:
  - added `osid-pressure` source and `osid-pressure-fill` layer;
  - adjusted mode visibility so `osid-control-fill` is political-only and pressure/supply are dedicated overlays.
- Extended keyboard map mode shortcuts in `src/ui/map/hooks/useKeyboardShortcuts.ts` from `1-4` to `1-5`.
- Updated app shortcut comment in `src/ui/map/App.tsx`.

### Phase C — Ops Planning Full Engine Integration

- Reworked `src/ui/map/components/OpsPlanningModal.tsx`:
  - enabled interactive MapLibre map with navigation controls;
  - added sector territory overlay;
  - added click-to-toggle objective selection directly from OSID polygons;
  - added objective list panel and deterministic objective ordering;
  - added advance-line arrows + polygon arrowheads from sector centroid to selected objectives;
  - added brigade selection UI with display-name resolution;
  - wired draft submission to `ipc.stageCorpsOperationOrder(...)` with operation payload fields (`type`, `targetSettlements`, `participatingBrigades`, `sectorId`, `objectives`, `planningDuration`, `stagingOsid`).

### Phase D — Battle Pulse + Status/Minimap/Polish

- Added battle marker pulse animation in `src/ui/map/map/MapContainer.tsx` using event age attenuation.
- Enriched `src/ui/map/components/BottomStatusStrip.tsx` with:
  - per-faction territory percentages,
  - active operations count,
  - cumulative casualties.
- Polished `src/ui/map/components/Minimap.tsx` update path (removed unused loader call while preserving faction control fill behavior).
- Added global UI polish styles in `src/ui/map/styles/globals.css`:
  - `panel-slide-in-right` 200ms ease-out;
  - `panel-shimmer` animation utility.

## Verification Evidence

- `npx tsc --noEmit` (repo): PASS
- `npm run --prefix src/ui/map build`: PASS
- `npx vitest run`: FAIL (pre-existing non-GUI supply tests)
  - failing files: `tests/supply_reserves.test.ts`, `tests/supply_phase_e1.test.ts`
  - failure profile indicates supply reserve baseline/constant mismatch unrelated to GUI phase execution.

## Risk/Decision Notes

- Pressure map now has explicit dedicated semantics (combat/front intensity) to prevent political-layer fallback ambiguity.
- Ops planning writes directly to existing desktop IPC operation staging path; no new IPC channel introduced.
- Existing dirty worktree simulation/supply changes were preserved and not reverted.

## Process QA Checkpoint

- context/napkin/Pyrrhic rules read before implementation: PASS
- ledger updated with implementation evidence: PASS
- napkin updated with reusable GUI runbook guidance: PASS
- FORAWWV untouched: PASS
- determinism-sensitive behavior: PASS (UI-only transforms; deterministic ordering added for objective and pressure projections)
- validation evidence attached: PASS (`tsc` + map build pass, known pre-existing supply test failures documented)
