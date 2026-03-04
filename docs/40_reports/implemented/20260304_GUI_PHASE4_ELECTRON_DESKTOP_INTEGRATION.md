# GUI Phase 4 — Electron Desktop Integration

**Date:** 2026-03-04
**Phase:** GUI Phase 4 — Desktop Integration
**Baseline:** Phase 3 complete (map, sector visualization, corps panels, UI polish). Electron backend fully implemented (40+ IPC handlers). React map app missing thin wiring layer.
**Result:** Full single-player desktop flow wired end-to-end: faction selection → campaign start → map rendering → order staging (IPC-backed) → advance turn → recruitment → fog-of-war overlay.

---

## Summary

- The Electron IPC backend (`electron-main.cjs`) was already complete with 40+ `ipcMain.handle()` handlers covering `advance-turn`, all order types, recruitment, and campaign start. The gap was the React wiring layer connecting these handlers to the map UI.
- A `saved/` directory in `src/ui/map/saved/` held pre-written Phase 4 versions of all major UI components, importing from `./desktop/useIPC`, `./desktop/types`, etc. — files that didn't yet exist. Once those files were created and the `saved/` components were promoted (merged carefully against the HEAD version), Phase 4 was largely complete.
- Key complexity: the live `MapContainer.tsx` was more advanced than the `saved/` version (it had supply mode, sector demarcation, staged-orders pulse animation from recent UI polish work). The `saved/` version was NOT promoted wholesale; instead, Phase 4 additions were applied surgically to the HEAD version to avoid regressing newer features.

---

## Architecture

### IPC Bridge Pattern

```
Electron main process (electron-main.cjs)
    └─ ipcMain.handle('advance-turn', ...)   ← 40+ handlers
          ↓
preload.cjs (contextBridge)
    └─ window.awwv = { advanceTurn, stageAttackOrder, ... }
          ↓
src/ui/map/desktop/useIPC.ts
    └─ useMemo([], () => wrap window.awwv or return no-ops)
          ↓
Components (TopToolbar, FormationDetail, CorpsDetail, MapContainer)
    └─ const ipc = useIPC();
       await ipc.advanceTurn() / ipc.stageMoveOrder(...)
```

### Fog-of-War Layer Pattern

```
loadedGameState.player_faction  +  loadedGameState.reconIntelligence
    └─ buildFogOfWarGeoJSON(baseGeoJson, controlBySettlement, faction, recon)
          └─ fog polygon = enemy-controlled OSID not in recon.confirmed_empty
          ↓
MapLibre source: 'fog-overlay' (GeoJSON, empty init)
MapLibre layer:  'fog-fill' (fill, rgba(0,0,0,0.42), before 'formation-markers')
    └─ updated in runDeferred() inside the loadedGameState useEffect
    └─ visibility: only when player_faction && reconIntelligence present
```

---

## Changes Made

### Phase 1 — Desktop Module (`src/ui/map/desktop/`)

**`types.ts`** (new)
- `RecruitmentCatalogBrigade`: fields `id`, `name`, `faction`, `home_mun`, `capital_cost`, `manpower_cost`, `default_equipment_class`, `available_from`, `mandatory`
- `StartNewCampaignPayload`: `playerFaction: 'RBiH' | 'RS' | 'HRHB'`, optional `scenarioKey`
- Field names derived from `desktop_sim.ts::getRecruitmentCatalog()` return shape — initial plan used wrong field names (`cost_capital`/`cost_equipment`); corrected after cross-checking the backend.

**`useIPC.ts`** (new)
- Stable React hook (`useMemo` on `[]`) — never re-renders, never changes reference
- Wraps all `window.awwv` methods: `advanceTurn`, `startNewCampaign`, `getRecruitmentCatalog`, `applyRecruitment`, `stageAttackOrder`, `stagePostureOrder`, `stageMoveOrder`, `stageDeployOrder`, `stageUndeployOrder`, `stageBrigadeMovementOrder`, `stageBrigadeRepositionOrder`, `stageBrigadeAoROrder`, `stageCorpsFrontOrder`, `stageCorpsAttackAxisOrder`, `stageOgSubfrontOrder`, `stageCorpsStanceOrder`, `clearOrders`, `assignBrigadeToFront`, `renameFrontSegment`, `renameTheatre`, `setBrigadeDesiredAoRCap`, `queryMovementRange`, `queryMovementPath`, `queryCombatEstimate`, `querySupplyPaths`, `queryCorpsSectors`, `queryBattleEvents`, `getMapServerUrl`, `focusWarroom`, `loadScenarioDialog`, `loadStateDialog`, `openTacticalMapWindow`
- Returns `isAvailable: boolean` — true only when `window.awwv` is present (Electron mode)
- All methods return safe `Promise.resolve({ ok: false, error: '...' })` no-ops in browser mode
- Added `stageCorpsOperationOrder` as a stub no-op — called by `CorpsDetail` but backend handler not yet implemented; UI shows graceful error

**`orderActions.ts`** (new)
- `advanceTurnAndSync({ ipc, loadSave, clearStagedOrders, setLoadError })` — calls `ipc.advanceTurn()`, on success calls `loadSave(stateJson)` and `clearStagedOrders()`, on failure sets load error. `TopToolbar` wraps this with `setAdvancing(true/false)` guard.
- `stageMoveOrderFromOsid({ ipc, addStagedOrder, setLoadError }, brigadeId, targetOsid)` — calls `ipc.stageMoveOrder(brigadeId, targetOsid)`, on success calls `addStagedOrder` locally.
- `stagePostureOrderAction({ ipc, addStagedOrder, setLoadError }, formationId, posture)` — calls `ipc.stagePostureOrder(formationId, posture)`, on success calls `addStagedOrder`.

**`campaignRecruitmentActions.ts`** (new)
- `startCampaignFromSidePicker({ ipc, loadSave, setLoadError }, faction, scenarioKey?)` — calls `ipc.startNewCampaign(...)`, on success calls `loadSave(stateJson)`. Returns `boolean` success.
- `fetchRecruitmentCatalog({ ipc, setLoadError })` — calls `ipc.getRecruitmentCatalog()`, returns typed `RecruitmentCatalogBrigade[]` or `[]` on error.
- `applyRecruitmentAndSync({ ipc, loadSave, setLoadError, brigadeId, equipmentClass })` — calls `ipc.applyRecruitment(...)`, on success calls `loadSave(stateJson)`. Returns `boolean` success.

### Phase 2 — Desktop Session Hook (`src/ui/map/hooks/`)

**`useDesktopSession.ts`** (new)
- Extracts bootstrap logic previously inline in `App.tsx`
- On mount: calls `ipc.getCurrentGameState()` and if present, calls `loadSave(stateJson)` to restore last session
- Registers `ipc.setGameStateUpdatedCallback` — reactive state updates from backend push new state into the store
- Registers `ipc.setTurnReportUpdatedCallback` — turn report updates routed to store
- Cleanup: unregisters both callbacks (passes `null`) on unmount

### Phase 3 — Component Promotion from `saved/`

The `saved/` directory held pre-authored Phase 4 components. Each was promoted as-is; no logic changes made during promotion.

| Component | Key Phase 4 Addition |
|-----------|---------------------|
| `SidePickerOverlay.tsx` | Faction picker UI; calls `startCampaignFromSidePicker` on confirm |
| `RecruitmentModal.tsx` | Brigade list filtered by player faction; `fetchRecruitmentCatalog` + `applyRecruitmentAndSync` |
| `FormationDetail.tsx` | Posture order buttons (defensive/balanced/offensive/reorganize) via `stagePostureOrderAction` |
| `CorpsDetail.tsx` | Corps stance selector + operation draft panel via `ipc.stageCorpsStanceOrder` / `ipc.stageCorpsOperationOrder` |
| `TopToolbar.tsx` | Advance Turn button with `isAdvancing` loading guard via `advanceTurnAndSync` |
| `App.tsx` | Orchestrates `useDesktopSession`, `useIPC`, `SidePickerOverlay`, `RecruitmentModal`; campaign start + recruitment flows |

### Phase 4 — Map Container Surgical Edits

**Problem encountered:** The `saved/MapContainer.tsx` was based on a pre-supply, pre-sector-demarcation version of the component. Promoting it wholesale would have regressed: supply map mode, sector demarcation lines, staged-orders pulse animation, sector-center auto-pan, and `stagedOrders` change tracking. Instead, the HEAD version of `MapContainer.tsx` was preserved and Phase 4 additions applied surgically:

1. **Imports added:**
   - `buildFogOfWarGeoJSON` from `./builders/buildFogOfWarGeoJSON`
   - `useIPC` from `../desktop/useIPC`
   - `stageMoveOrderFromOsid` from `../desktop/orderActions`

2. **Constants added:**
   - `FOG_OVERLAY_SOURCE_ID = 'fog-overlay'`
   - `FOG_FILL_LAYER_ID = 'fog-fill'`

3. **Component body additions:**
   - `const setLoadError = useGameStore((s) => s.setLoadError);`
   - `const ipc = useIPC();`

4. **Move order handler updated** (in `useMapInteractions` callback):
   - Before: `useGameStore.getState().addStagedOrder(...)` — local staging only, no backend call
   - After: `void stageMoveOrderFromOsid({ ipc, addStagedOrder: ..., setLoadError }, selectedFormationId, osid)` — IPC-backed

5. **Fog source initialized** in `init()` style pre-population:
   - `(sources as ...)['fog-overlay'] = { type: 'geojson', data: emptyGeoJson };`

6. **Fog layer added** in `runDeferred()` (inside the third nested `requestAnimationFrame`):
   - Calls `buildFogOfWarGeoJSON(base, state.controlBySettlement, state.player_faction, state.reconIntelligence)`
   - Lazily adds `fog-fill` layer before `formation-markers` if not yet present
   - Calls `(m.getSource(FOG_OVERLAY_SOURCE_ID) as GeoJSONSource)?.setData(fogGeoJson)`
   - Sets layer visibility: `!!state.player_faction && !!state.reconIntelligence`

### Phase 5 — Fog-of-War Builder

**`src/ui/map/map/builders/buildFogOfWarGeoJSON.ts`** (new)

```
Signature:
  buildFogOfWarGeoJSON(
    baseGeoJson: FeatureCollection,
    controlBySettlement: Record<string, string | null>,
    playerFaction: string | null | undefined,
    reconIntelligence: ReconIntelligenceView | undefined,
  ): FeatureCollection
```

**Logic:**
1. If no `playerFaction` or no `reconIntelligence` → return empty FeatureCollection (observer/browser mode)
2. Build `confirmedVisible = new Set(reconIntelligence.confirmed_empty)`
3. Filter `baseGeoJson.features` to: `controller !== null && controller !== playerFaction && !confirmedVisible.has(osid)`
4. Return FeatureCollection of matching polygon geometries with `{ osid }` property only

**Result:** Fog covers all enemy-controlled OSIDs that the player has not confirmed empty. Own territory is always clear. Observer mode (no player faction) shows no fog.

### Phase 6 — Utility Stubs

**`src/ui/map/map/frontLineIcons.ts`** (new, no-op)
- `addFrontLineIcons(_map: maplibregl.Map): void` — stub only
- Front lines use `line-dasharray` paint expressions in `awwv_map_style.json`, not icon sprites
- Required because `saved/MapContainer.tsx` (still in `saved/`) imports it; HEAD MapContainer does not

**`src/ui/map/map/pmtilesRoute.ts`** (new)
- `rewritePmtilesUrlsForRuntime(style, origin)` — rewrites `pmtiles:///path` → `pmtiles://http://host:port/path`
- Required because `saved/MapContainer.tsx` imports it; HEAD MapContainer has inline equivalent `rewritePmtilesUrls`

---

## Issues Encountered and Resolutions

### 1. Wrong type field names in `types.ts`
- **Problem:** Initial `RecruitmentCatalogBrigade` used `cost_capital`/`cost_equipment` (from plan)
- **Root cause:** Plan was written without cross-checking the actual backend API
- **Fix:** Read `desktop_sim.ts::getRecruitmentCatalog()` return shape; corrected to `capital_cost`/`manpower_cost`; added missing fields `home_mun`, `available_from`, `mandatory`

### 2. Missing modules (`frontLineIcons`, `pmtilesRoute`)
- **Problem:** `saved/MapContainer.tsx` imports `./frontLineIcons` and `./pmtilesRoute` which did not exist
- **Fix:** Created both as new files (stub and utility respectively)

### 3. Missing `stageMoveOrderFromOsid` export
- **Problem:** `saved/MapContainer.tsx` imports `stageMoveOrderFromOsid` from `../desktop/orderActions` which only had `advanceTurnAndSync` and `stagePostureOrderAction`
- **Fix:** Added `stageMoveOrderFromOsid` to `orderActions.ts`

### 4. Missing `stageCorpsOperationOrder` in backend
- **Problem:** `saved/CorpsDetail.tsx` calls `ipc.stageCorpsOperationOrder()` but `electron-main.cjs` has no handler for this
- **Fix:** Added `stageCorpsOperationOrder: makeNoop<{ ok: boolean; error?: string }>()` to `useIPC.ts` — graceful failure showing error to player. Backend implementation deferred.

### 5. saved/MapContainer.tsx vs HEAD divergence
- **Problem:** The `saved/` version was based on a pre-supply, pre-sector-demarcation MapContainer. Promoting it wholesale would have lost: supply map mode, sector demarcation lines, staged-orders pulse animation, sector-center auto-pan, `stagedOrders` guard
- **Fix:** Reverted promoted `MapContainer.tsx` to HEAD, then applied Phase 4 additions surgically (6 targeted edits)

---

## Files Changed

| File | Status | Change |
|------|--------|--------|
| `src/ui/map/desktop/types.ts` | New | RecruitmentCatalogBrigade, StartNewCampaignPayload |
| `src/ui/map/desktop/useIPC.ts` | New | Stable React hook wrapping window.awwv |
| `src/ui/map/desktop/orderActions.ts` | New | advanceTurnAndSync, stageMoveOrderFromOsid, stagePostureOrderAction |
| `src/ui/map/desktop/campaignRecruitmentActions.ts` | New | Campaign start + recruitment actions |
| `src/ui/map/hooks/useDesktopSession.ts` | New | IPC bootstrap hook |
| `src/ui/map/map/builders/buildFogOfWarGeoJSON.ts` | New | Fog-of-war polygon filter |
| `src/ui/map/map/frontLineIcons.ts` | New | No-op stub |
| `src/ui/map/map/pmtilesRoute.ts` | New | PMTiles URL rewriter utility |
| `src/ui/map/components/SidePickerOverlay.tsx` | Promoted | Faction picker dialog |
| `src/ui/map/components/RecruitmentModal.tsx` | Promoted | Brigade recruitment modal |
| `src/ui/map/components/FormationDetail.tsx` | Promoted | Posture order buttons via IPC |
| `src/ui/map/components/CorpsDetail.tsx` | Promoted | Corps stance + operation draft via IPC |
| `src/ui/map/components/TopToolbar.tsx` | Promoted | Advance Turn with loading guard |
| `src/ui/map/App.tsx` | Promoted | Campaign start + recruitment orchestration |
| `src/ui/map/map/MapContainer.tsx` | Surgical | +useIPC, +stageMoveOrderFromOsid, +fog-overlay, +fog-fill |
| `docs/PROJECT_LEDGER.md` | Updated | Ledger entry appended |

---

## Determinism Impact

**None.** No simulation code was touched. All changes are pure React/UI/IPC wiring:
- `buildFogOfWarGeoJSON` is deterministic — iterates `baseGeoJson.features` in stable insertion order, no `Math.random()`, no `Date.now()`
- `useIPC` is a stable hook memoized on `[]` — no side effects on render
- No new engine pipeline steps, no new state mutations server-side

---

## Test Results

- **Build:** `npm run desktop:map:build` — passes clean (pre-existing bundle-size warning only)
- **Vitest:** 288 pass, 2 pre-existing failures in `tests/war_timeline.test.ts` (round-trip parity for RS attack share 0.28 vs 0.26 — unrelated to Phase 4, present before this session)
- **No new test failures introduced**

---

## Lessons Learned

1. **Check backend API shape before writing types.** The plan documented `cost_capital`/`cost_equipment` but the backend actually returns `capital_cost`/`manpower_cost`. Always read `desktop_sim.ts` (or the actual handler) before writing type definitions.

2. **`saved/` components can become outdated.** The `saved/` directory is a staging area written at a point in time. When the live codebase advances past that point (supply mode, sector demarcation, etc. were added after the saved/ versions were written), promoting blindly regresses features. The correct approach: promote only the components that are strictly additive, and apply surgical edits to advanced files.

3. **Stub the missing IPC methods, don't block.** `stageCorpsOperationOrder` has no backend handler yet. Rather than blocking the UI or throwing, a no-op in `useIPC.ts` allows the operation draft UI to render and show a graceful error message. This is preferable to a hard crash.

4. **Function hoisting in MapContainer effects.** `safeSetLayoutVisibility` and `safeHasLayer` are declared after the `useEffect` that uses them. JavaScript hoists `function` declarations to the enclosing function scope, so this works. The pattern is already used in the file (same functions called inside `runDeferred` which is inside the effect).

---

## Deferred Work

| Item | Reason deferred | Suggested next step |
|------|-----------------|---------------------|
| `stageCorpsOperationOrder` backend handler | Backend not yet wired in `electron-main.cjs` | Add `ipcMain.handle('stage-corps-operation-order', ...)` handler; expose in `preload.cjs`; remove no-op from `useIPC.ts` |
| Manual smoke test (desktop run) | Requires local Electron build + scenario file | `npm run desktop` → load apr1992 → select RBiH → stage move → advance turn → verify fog |
| `saved/` cleanup | `saved/` directory still contains the original versions | Delete `saved/` directory or archive; no longer needed |
| PMTiles Electron verification | Requires running the app | Verify basemap tiles load under Electron HTTP server; check `rewritePmtilesUrls` handles the `http://127.0.0.1:PORT` origin |
| Fog toggle button | No UI control yet | Add toggle button to `MapModeToolbar` or `TopToolbar`; wire to a new `fogVisible` store flag |
| `war_timeline.test.ts` failures | Pre-existing; RS attack share mismatch 0.28 vs 0.26 | Investigate `getEffectiveAttackShare` round-trip parity; likely a calibration value that diverged from the test fixture |

---

## Next Steps

1. **Manual smoke test** — run `npm run desktop`, load `apr1992_definitive_40w`, select RBiH, stage a move order, advance one turn, verify state updates and fog renders
2. **`stageCorpsOperationOrder` backend** — implement the backend handler to make the operation draft UI functional
3. **`saved/` directory cleanup** — delete or archive `src/ui/map/saved/`
4. **Fog toggle** — add `fogVisible` store flag and toggle button in toolbar
5. **`war_timeline.test.ts` parity fix** — RS attack share fixture mismatch needs investigation (calibration value vs test expectation)
