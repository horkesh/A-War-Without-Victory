# GUI Phase 5 — Battle Markers, Fog Toggle, Strategic Points, Corps Op IPC, War Summary

**Date:** 2026-03-04
**Phase:** GUI Phase 5 (visual polish + IPC backend completion)
**Baseline:** Phase 5 partially complete — posture stripes, enclave visualization, and movement preview already done. Seven items outstanding.
**Result:** All remaining Phase 5 items implemented. Build clean, 312 tests pass. Visual sign-off pending user review.

---

## Summary

- **Five workstreams completed in one session:** fog-of-war toggle, battle markers (sim schema + UI layer), strategic point markers, `stageCorpsOperationOrder` IPC backend, and War Summary modal.
- **One pre-existing defect fixed:** `FormationDetail.tsx` and `CorpsDetail.tsx` promoted from `saved/` in Phase 4 had stale type references (`operationsPanelOpen`, `brigadeHistory`, `formationCasualtyLedger`) that were never fixed. Resolved as part of this session.
- **One item already done:** Movement preview (`MOVE_PREVIEW_LAYER_ID`) was discovered to be fully implemented in `MapContainer.tsx` lines 961–1015 — not re-done. Replay scrubber remains deferred (requires `--video` flag data, 13.6 GB per run).

---

## Changes Made

### Task 1 — Fog Toggle Button

**Problem:** The fog-of-war fill layer existed in MapContainer and was already conditionally rendered (`!!player_faction && !!reconIntelligence`), but there was no UI toggle — once fog was on, it could not be turned off.

**Solution:** Added `fogVisible: boolean` (default `true`) and `setFogVisible` to `gameStore.ts`. MapContainer's fog visibility effect now AND-gates all three conditions: `fogVisible && !!player_faction && !!reconIntelligence`. Added a new `useEffect` that reacts to `fogVisible` changes at runtime without requiring a full layer rebuild. Added "Fog" to `LAYER_TOGGLES` in `MapModeToolbar.tsx`.

**Files:**
- `src/ui/map/store/gameStore.ts` — `fogVisible`, `battlesVisible`, `strategicVisible` + setters
- `src/ui/map/components/MapModeToolbar.tsx` — Fog, Battles, Points buttons
- `src/ui/map/map/MapContainer.tsx` — reactive `useEffect` for three new toggles

---

### Task 2 — Battle Markers (2a sim + 2b UI)

#### 2a — Sim: GameState.control_events

`recentControlEvents` in `LoadedGameState` was always an empty array because the adapter was ready but the upstream `control_events` field on `GameState` did not exist.

**Added:**
```typescript
export interface ControlEvent {
    turn: number;
    settlement_id: string;
    mechanism: 'combat' | 'consolidation' | 'abandoned';
    from: string | null;
    to: string | null;
    mun_id?: string;
}
// On GameState:
control_events?: ControlEvent[];
```

In `attack_resolution_osid.ts`, the OSID flip block now captures `prevController` before overwriting `political_controllers`, then pushes a `ControlEvent` via `(state.control_events ??= []).push(...)`.

In `war_phases.ts`, two bookend operations surround `resolveAttackOrdersOsid`:
- **Before:** trim `control_events` to last 3 turns (`turn >= currentTurn - 2`)
- **After:** sort `control_events` by `(turn, settlement_id)` — string comparison, fully deterministic

**Determinism:** No randomness. Sort is over stable, deterministic fields. `control_events` never affects combat resolution — it is written-to only after the flip is applied.

#### 2b — UI: Builder + Layer

New `buildBattleMarkersGeoJSON.ts`:
- Input: `recentControlEvents`, `baseGeoJson: FeatureCollection`, `currentTurn`
- Filters to `mechanism === 'combat'` AND `turn >= currentTurn - 2`
- Deduplicates by OSID (keep latest flip per settlement, sorted deterministically)
- Computes polygon centroid via ring vertex averaging (same method as formation markers)
- Returns `FeatureCollection<Point>` with `{ osid, from, to, turn, age }`, sorted by OSID

MapContainer additions:
- Source: `battle-markers` (empty FeatureCollection at init)
- Layer: `battle-markers-pulse` — circle, white fill `#ffffff`, opacity interpolated by `age` (`1` → opacity `1.0`, `3` → opacity `0.3`), radius 7px, inserted before `formation-markers`
- Toggle: `battlesVisible` store field + Battles button

**Files:**
- `src/state/game_state.ts` — ControlEvent interface + field
- `src/sim/combat/attack_resolution_osid.ts` — push on flip
- `src/sim/turn_phases/war_phases.ts` — trim + sort
- `src/ui/map/map/builders/buildBattleMarkersGeoJSON.ts` — NEW
- `src/ui/map/map/MapContainer.tsx` — source, layer, reactive toggle

---

### Task 3 — Strategic Point Markers

**Problem:** OSID master has no `population` or `municipal_seat` fields — strategic points must be derived from naming conventions.

**Solution:** `buildStrategicPointGeoJSON.ts` classifies OSIDs using two rules:
- **Tier `'city'` (radius 8):** OSID's municipality part (`op:{mun}:`) is in the hardcoded set `{banja_luka, sarajevo, tuzla, mostar, bihac, zenica}` AND the slug equals `{mun}_2` (the canonical town-center settlement)
- **Tier `'seat'` (radius 5):** Slug equals `{mun}_2` (any municipality's seat OSID)

Returns `FeatureCollection<Point>` with `{ osid, tier, mun_id }`. Gold fill `#c4a35a`, visible at all zoom levels (no zoom gate — city stars visible even at strategic zoom). Toggle: `strategicVisible` + Points button.

**Files:**
- `src/ui/map/map/builders/buildStrategicPointGeoJSON.ts` — NEW
- `src/ui/map/map/MapContainer.tsx` — source, layer, reactive toggle

---

### Task 4 — stageCorpsOperationOrder IPC Backend

**Problem:** `CorpsDetail.tsx` called `ipc.stageCorpsOperationOrder(payload)` with a full payload object, but the implementation in `useIPC.ts` was `makeNoop<{ok:boolean;error?:string}>()` — a zero-argument noop — causing a TypeScript error and silently ignoring all operation staging.

**Solution (three-file change following `stage-corps-stance-order` pattern):**

1. **`useIPC.ts`** — Added `CorpsOperationOrderPayload` interface (exported). Replaced noop with typed real call when `awwv` is available, typed noop when not. Added `stageCorpsOperationOrder` to `WindowAwwv` interface.

2. **`electron-main.cjs`** — New handler `ipcMain.handle('stage-corps-operation-order', ...)`:
   - Validates `corpsId`, `name`, `type` as strings; validates type against whitelist
   - Deserializes state, lazy-initializes `corps_command[corpsId]` if missing
   - Sets `active_operation` with all planning fields: `name, type, phase: 'planning', started_turn, phase_started_turn, target_settlements, participating_brigades, sector_id, objectives, planning_duration, staging_osid, momentum: 0, current_objective_index: 0`
   - Re-serializes and broadcasts via `sendGameStateToRenderer`

3. **`preload.cjs`** — Added `stageCorpsOperationOrder: (payload) => ipcRenderer.invoke('stage-corps-operation-order', payload)`

**Files:**
- `src/ui/map/desktop/useIPC.ts` — CorpsOperationOrderPayload + real call
- `src/desktop/electron-main.cjs` — handler
- `src/desktop/preload.cjs` — bridge

---

### Task 5 — War Summary Modal

**New component `WarSummaryModal.tsx`** — full-screen backdrop modal (warm charcoal palette, §3.1). Triggered by "Summary" button in TopToolbar (disabled when no save loaded). State owned in `App.tsx` as `summaryOpen`.

**Data sources (all read-only from `LoadedGameState`):**

| Section | Source |
|---------|--------|
| Territory | `controlBySettlement` × static import of `data/derived/operational/osid_areas.json` |
| Personnel | `formations` filtered by `status !== 'destroyed'`, summed by `faction` |
| KIA / WIA | `casualtyLedger[faction].killed / wounded` |
| Displacement | `departedByOsid` summed per faction (fallback: `displacementByMun.displacedOut` totals) |
| Turn label | `turn` + `label` |

Territory computation is local to the modal — no changes to `LoadedGameState` type or `GameStateAdapter.ts`. `osid_areas.json` is imported as a static Vite module (JSON import, 51,337 km² total, 744 OSIDs).

**Files:**
- `src/ui/map/components/WarSummaryModal.tsx` — NEW
- `src/ui/map/components/TopToolbar.tsx` — `onOpenSummary` prop + Summary button
- `src/ui/map/App.tsx` — `summaryOpen` state + `<WarSummaryModal>` render

---

### Pre-existing Defect Fix

`FormationDetail.tsx` and `CorpsDetail.tsx` were promoted from `saved/` in Phase 4 with stale type assumptions:

| File | Stale reference | Fix |
|------|----------------|-----|
| `FormationDetail.tsx` | `s.operationsPanelOpen` | `s.isOperationsPanelOpen` |
| `FormationDetail.tsx` | `loadedGameState?.formationCasualtyLedger?.[id]` | Removed (no per-formation ledger exists) |
| `FormationDetail.tsx` | `formation.brigadeHistory.*` | `formation.combatSummary.*` (same tallies); `recent_engagements` section dropped (not in `FormationView`) |
| `CorpsDetail.tsx` | `s.operationsPanelOpen` | `s.isOperationsPanelOpen` |

---

## Architecture Notes

### Layer Toggle Pattern (canonical for Phase 5+)

All three new toggles follow the same pattern:
1. Store field (default `true`) + setter in `gameStore.ts`
2. Button entry in `LAYER_TOGGLES` array in `MapModeToolbar.tsx`
3. Reactive `useEffect([mapReady, toggleVar])` in `MapContainer.tsx` calling `safeSetLayoutVisibility`
4. Layer initialized in `init()` effect; data populated in `runDeferred`

### Battle Markers Centroid Algorithm

Reuses the same polygon ring vertex averaging used elsewhere in the codebase. For a GeoJSON Polygon, the centroid is the mean of all ring coordinates of the outer ring. MultiPolygon: mean of all outer rings.

### Strategic Points Naming Convention

The `{mun}_2` suffix is the canonical "town center" OSID pattern across all ~90 municipalities in the operational dataset. This is a stable naming invariant — it was established when the OSID master was built and is not expected to change.

---

## Files Changed

| File | Change |
|------|--------|
| `src/state/game_state.ts` | `ControlEvent` interface + `control_events?: ControlEvent[]` |
| `src/sim/combat/attack_resolution_osid.ts` | Push `ControlEvent` on OSID flip |
| `src/sim/turn_phases/war_phases.ts` | Trim + sort `control_events` around `resolveAttackOrdersOsid` |
| `src/ui/map/store/gameStore.ts` | `fogVisible`, `battlesVisible`, `strategicVisible` + setters |
| `src/ui/map/components/MapModeToolbar.tsx` | Fog, Battles, Points toggle buttons |
| `src/ui/map/map/builders/buildBattleMarkersGeoJSON.ts` | NEW — combat flip → Point features |
| `src/ui/map/map/builders/buildStrategicPointGeoJSON.ts` | NEW — city/seat classification → Point features |
| `src/ui/map/map/MapContainer.tsx` | New sources/layers + reactive toggle effect |
| `src/ui/map/desktop/useIPC.ts` | `CorpsOperationOrderPayload` type + real IPC call |
| `src/desktop/electron-main.cjs` | `stage-corps-operation-order` handler |
| `src/desktop/preload.cjs` | `stageCorpsOperationOrder` bridge |
| `src/ui/map/components/WarSummaryModal.tsx` | NEW — war summary display modal |
| `src/ui/map/components/TopToolbar.tsx` | `onOpenSummary` prop + Summary button |
| `src/ui/map/App.tsx` | `summaryOpen` state + `<WarSummaryModal>` render |
| `src/ui/map/components/FormationDetail.tsx` | Pre-existing type error fixes |
| `src/ui/map/components/CorpsDetail.tsx` | `isOperationsPanelOpen` fix |

---

## Verification

- **Build:** `npm run desktop:map:build` — clean (pre-existing chunk-size warnings only; no errors)
- **Tests:** `npm run test:vitest` — 312 pass, 1 skipped, 0 failures
- **Movement preview:** Confirmed already implemented (`MOVE_PREVIEW_LAYER_ID` in MapContainer lines 961–1015); not duplicated
- **Replay scrubber:** Deferred — requires `--video` flag scenario run (13.6 GB/run, disabled by default)

---

## Next Steps

1. **Visual sign-off (Task 7):** Run `npm run dev:map`, load a 40w save, verify fog toggle, battle markers, strategic points, War Summary modal numbers
2. **Electron end-to-end:** Run `npm run desktop`, stage a corps operation via CorpsDetail UI, confirm `active_operation` appears in next game state
3. **Phase 6 planning:** Replay scrubber (needs `--video` flag infrastructure), additional IPC operations, multiplayer considerations
4. **`propagate-to-canon`:** GUI Architecture Rework doc, TACTICAL_MAP_SYSTEM doc, PIPELINE_ENTRYPOINTS (control_events step), REPO_MAP
