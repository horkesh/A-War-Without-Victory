# HoI 3D Formations, Selection ZoC, and Corps Lines — Implementation Report

**Date:** 2026-02-24  
**Plan:** HoI 3D Formations ZoC Implementation (5 phases)  
**Convene:** [ORCHESTRATOR_HOI_3D_FORMATIONS_ZOC_CONVENE_2026_02_23.md](../convenes/ORCHESTRATOR_HOI_3D_FORMATIONS_ZOC_CONVENE_2026_02_23.md)

## Summary

Implemented visible formation markers on the HoI 3D canonical map, click-on-formation selection, selection-driven Zone of Control (ZoC), and corps–brigade lines with multi-ZoC, per the convene recommendations (R1–R8).

## Phases Delivered

### Phase 1: Visible formations (R1, R2)
- **HoIMapRenderer:** Added `getWorldPositionForSettlement(osidOrSid): [number, number, number] | null` using `centroidBySid` + `sampleHeight` + `wgsToWorld`. Deterministic; no state mutation.
- **map_hoi:** In `applyStateJson`, build `FormationMarkerInput[]` from `loaded.formations` (position from `location_osid ?? hq_sid` via renderer; sort by `id`); call `renderer.setFormations(markers)`. Pending formations applied when renderer becomes ready (same pattern as control/edges).

### Phase 2: Formation selection / hit-test (R3)
- **HoIMapRenderer:** In `setFormations`, added invisible hit-proxy meshes (one `PlaneGeometry(0.05, 0.025)` per formation at sprite position) in `formationHitProxies` group; `formationProxyMeshes` + `formationIdByProxy` for raycast lookup. Cleanup on `setFormations` (dispose, clear).
- **Click path:** In `handleSettlementClick`, raycast formation proxies first (when formations layer visible); if hit, call `onClickFormation(formationId)` and return; else proceed with control raycast and `onClickSettlement`; on settlement/empty click call `onClickFormation(null)`.
- **map_hoi:** Added `selectedFormationIdRef`; `setClickFormationCallback` updates it. Selection drives ZoC/lines in Phases 3–4.

### Phase 3: Selection-driven ZoC (R4, R5)
- **operationalContactGraph.ts:** New helper under `src/ui/map/data/`: loads `operational_contact_graph.json`, builds `Map<string, string[]>` adjacency (neighbors sorted `localeCompare`), cached; `getOsidAdjacency(getBaseUrl)`.
- **map_hoi:** Load adjacency on init (async). On formation click: brigade/og → ZoC = `adjacency.get(location_osid) ?? []` (copy, sort); call `renderer.setSelectionZocOsids(zocOsids, formation.faction)`. Corps left for Phase 4. Clear selection ZoC on new state load.
- **HoIMapRenderer:** `setSelectionZocOsids(osids, factionId)`: clear existing selection ZoC mesh; if `osids.length && factionId`, build one mesh via shared `buildZocMeshFromOsidSet` (same SUBDIV, sampleHeight, wgsToWorld, Y 0.004). Selection ZoC visible independently of F6.

### Phase 4: Corps lines + multi-ZoC (R6)
- **HoIMapRenderer:** `setCorpsBrigadeLines(segments, factionId?)`: one `LineSegments` from corps centroid to each subordinate; faction color when provided; clear when `segments.length === 0`.
- **map_hoi:** When selected formation is corps: subordinate IDs from `formation.subordinateIds` or filter by `corps_id`; for each brigade get `location_osid ?? hq_sid` and world position; corps position = centroid of subordinate world positions; build segments; `setCorpsBrigadeLines(segments, formation.faction)`. Union ZoC: for each subordinate, add `adjacency.get(loc)` to a Set; sorted array → `setSelectionZocOsids(combinedOsids, formation.faction)`.

### Phase 5: Determinism and docs
- **Determinism:** Formation list sorted by `id` before `setFormations`; ZoC OSID lists sorted `localeCompare`; corps subordinates from adapter (deterministic); no `Date.now` or `Math.random`. Single code path for ZoC mesh (buildZocMeshFromOsidSet).
- **TACTICAL_MAP_SYSTEM:** §2 updated: formation markers wired via `getWorldPositionForSettlement` and `setFormations`; selection-driven ZoC and corps lines implemented per convene (link to convene report).
- **PROJECT_LEDGER:** Entry appended (behavior: visible formations, click unit → ZoC, click corps → lines + multi-ZoC).
- **Report:** This document; CONSOLIDATED_IMPLEMENTED and README §2 updated.

### Phase 6: Strategic zoom (max zoom out) and corps HQ placement (2026-02-24)
- **Strategic zoom:** When zoom ≥ ZOOM_CORPS_ONLY_THRESHOLD (2.6), only corps, corps_asset, and army_hq markers are visible and clickable; brigades are hidden. HoIMapRenderer: `FormationMarkerInput.showWhenZoomedOut`; `formationSpriteData` and `showWhenZoomedOutByFormationId`; in `animate()` visibility = `layerVisibility.formations && (!onlyCorpsLevel || showWhenZoomedOut)`; in `handleSettlementClick`, formation hit accepted only when not at strategic zoom or when `showWhenZoomedOutByFormationId.get(formationId)`.
- **Corps HQ placement:** Corps and army_hq use `location_osid` when set in state (historical HQ OSID from scenario); otherwise position = centroid of subordinates’ positions. map_hoi: two-pass `buildFormationMarkersFromFormations` — pass 1: all formations get position from `location_osid ?? hq_sid` via renderer; pass 2: corps/army_hq still without position get centroid of subordinates (from `positionById`); markers built only when position exists; `showWhenZoomedOut: isCorpsOrArmyHq(f.kind)`.
- **Canon:** TACTICAL_MAP_SYSTEM §2 and Strategic zoom bullet updated; scenario authors should set `location_osid` on corps for historical HQ placement.

## Architect Decisions (flagged for later review)

- **Placement API:** Single public `getWorldPositionForSettlement` on HoIMapRenderer; no separate placement service. *Review if other entrypoints need the same API later.*
- **Selection/ZoC ownership:** map_hoi holds `selectedFormationId`; renderer receives data via `setSelectionZocOsids` and `setCorpsBrigadeLines`; no selection state in renderer. *Review testability of renderer in isolation.*
- **ZoC geometry:** Reused draped construction (buildZocMeshFromOsidSet); selection ZoC = one mesh. *Review depthTest/depthWrite for selection ZoC vs F6.*
- **Corps position:** Use `location_osid` when set (historical HQ OSID from scenario); else centroid of subordinates. Scenario data should set `location_osid` on corps for correct placement.
- **Formation hit-test:** Invisible hit-proxy planes; THREE.Sprite raycasting not used. *Review performance with 200+ formations.*

## Verification

- `npx tsc --noEmit`: 0 errors.
- `npx vitest run`: 2 pre-existing failures in `operational_data_osid.test.ts` (getPoliticalControllerOSID); all other tests pass.
- Manual: Load map_hoi with a save → formations visible; F4 toggles layer; click formation → ZoC appears; click corps → lines to brigades + combined ZoC; click terrain/settlement → selection and ZoC clear.

## Files Touched

- **New:** `src/ui/map/data/operationalContactGraph.ts`
- **Modified:** `src/ui/map/renderer/HoIMapRenderer.ts` (getWorldPositionForSettlement, setFormations hit proxies, setClickFormationCallback, handleSettlementClick formation raycast, buildZocMeshFromOsidSet, setSelectionZocOsids, setCorpsBrigadeLines)
- **Modified:** `src/ui/map/map_hoi.ts` (buildFormationMarkers, applyStateJson formations + refs, formation callback with ZoC/corps lines, adjacency load, FormationSelectionRefs)
- **Modified:** `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` (§2)
- **Modified:** `docs/PROJECT_LEDGER.md` (changelog)
- **Modified:** `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md`, `docs/40_reports/README.md` (§2)
