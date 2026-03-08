# Ops Planning Modal — Phase 1+2: Multi-Axis Operations, Staging Areas, Force-Ratio Preview

**Date:** 2026-03-08
**Status:** Implemented
**Files:** `src/ui/map/components/OpsPlanningModal.tsx`, `src/ui/map/desktop/useIPC.ts`
**Build:** `npm run desktop:map:build` — verified clean
**Typecheck:** `npx tsc --noEmit` — no new errors
**Calibration impact:** None (GUI-only)

---

## Summary

Complete rewrite of the Ops Planning Modal from a single-objective planner into a multi-axis operational planning interface. The modal now supports:

- **Multi-axis operations**: Create, name, and manage independent axes of advance with per-axis brigade assignment and objective chains
- **Staging areas**: Per-axis staging OSID selection via map click mode toggle
- **Force-ratio preview**: Real-time enemy strength estimates per objective (color-coded)
- **Post-submit confirmation**: Full plan summary overlay before staging the order
- **Color-coded visualization**: Per-axis Bezier arrow rendering with numbered objective markers and staging diamonds

---

## Phase 1: Multi-Axis Core (committed earlier this session)

### Multi-axis state model

```typescript
interface AxisState {
    id: string;
    name: string;
    brigadeIds: Set<string>;
    objectives: string[];
    stagingOsid?: string;
}
```

- **Exclusive brigade assignment**: Toggling a brigade onto one axis removes it from others
- **Per-axis objective chain**: Ordered OSID sequence per axis with reorder (up/down) and remove
- **Auto-initialization**: First axis created as "Main Advance" with all sector brigades

### Map visualization

- **Bezier curves**: Origin (centroid of brigade locations) → obj1 → obj2 → obj3 per axis
- **AXIS_COLORS**: 4-color palette (white, cyan, orange, purple) applied via MapLibre data-driven styling (`['get', 'color']`)
- **Pencil circle scratches** around each objective + numbered labels (1, 2, 3...)
- **Arrowhead polygons** at segment endpoints

### Brigade stat cards

Each brigade shows: name, personnel count, tanks, artillery, fatigue, cohesion. Checkbox toggle for axis assignment with color dot per axis.

### Operation parameters

- Type selector: sector_attack / general_offensive / strategic_defense / reorganization / feint / probe (with tooltip descriptions)
- Tolerance (min attack outcome), tempo, main effort (schwerpunkt), artillery preparation
- All wired to IPC payload

---

## Phase 2: Staging, Force Preview, Confirmation

### 1. Per-axis staging areas

- **MapClickMode toggle**: 'objectives' (default) vs 'staging' — button in axis detail panel switches mode
- **Ref sync pattern**: `mapClickModeRef` stays in sync with `mapClickMode` state via useEffect, solving the stale closure problem for the map click handler registered during initialization
- **Visual**: Diamond polygon marker + "S" label at staging OSID, colored per axis
- **Map layers**: `ops-staging-markers` (fill), `ops-staging-outline` (line), `ops-staging-labels` (symbol) — all filter from `ops-advance-arrows` source
- **IPC payload**: `staging_osid` per axis, with fallback to first sector-friendly OSID for single-axis operations

### 2. Force-ratio preview

- **Enemy aggregation**: `enemyStrengthByOsid` memo iterates all formations, groups non-player active brigades by `location_osid`. Aggregates: brigadeCount, totalPersonnel, tanks, artillery.
- **Player faction**: Uses `loadedGameState.player_faction` directly (simplified from formation iteration in /simplify pass)
- **Display per objective row**:
  - `{friendlyPersonnel} vs ~{enemyPersonnel} est. (T/A) — N bdes`
  - Color-coded: **green** (>1.5× advantage), **yellow** (>1× but <1.5×), **red** (outnumbered)
  - "No known enemy forces" shown in gray when no intel
- **Computation**: `axisFriendlyPersonnel` computed once per axis render (hoisted outside `.map()` in /simplify pass)

### 3. Post-submit confirmation overlay

- **Trigger**: "Draft Orders" button opens confirmation instead of submitting
- **Content**: Operation name, type, tolerance, tempo, artillery prep, per-axis breakdown (brigade count, objective count, staging area, objective chain)
- **Actions**: "Back" returns to editing, "Confirm & Stage" executes `submitDraft()`
- **Error handling**: Confirmation closes, then status message + error display in main panel if submission fails

---

## IPC Payload (CorpsOperationOrderPayload)

```typescript
{
    corpsId: string;
    name: string;
    type: 'sector_attack' | 'general_offensive' | 'strategic_defense' | 'reorganization' | 'feint' | 'probe';
    targetSettlements: string[];
    participatingBrigades: string[];
    sectorId?: string;
    objectives?: string[];
    planningDuration?: number;
    stagingOsid?: string;
    minAttackOutcome?: string;
    tempo?: string;
    schwerpunktOsid?: string;
    artilleryPreparation?: boolean;
    axes?: Array<{
        axis_id: string;
        name: string;
        assigned_brigades: string[];
        objectives: string[];
        current_objective_index: number;
        status: 'executing';
        staging_osid?: string;
        // ... momentum/failure counters initialized to 0
    }>;
}
```

**Single-axis optimization**: When only 1 axis exists, `axes` field is omitted and objectives/brigades sent flat.

---

## /simplify Pass Findings & Fixes

1. **Double-refresh eliminated**: Removed all `setTimeout(() => refreshOverlaySources(...), 0)` calls (6 instances). The existing `useEffect` on `axes` already handles overlay refresh after state commits.
2. **playerFaction simplified**: Replaced useMemo iteration of all formations with direct `loadedGameState.player_faction` access.
3. **friendlyPersonnel hoisted**: Moved per-axis personnel sum outside the objectives `.map()` callback — computed once per axis instead of once per objective.
4. **Staging clear deduplicated**: Extracted `clearStagingOnActiveAxis()` helper, replacing inline `setAxes` + `setTimeout` in the clear button.
5. **Axis mutation functions simplified**: All `setAxes` callbacks now return the new state directly without manual refresh scheduling.

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ OPERATIONAL PLANNING                                        [X] │
│ Sector: {name} • Corps: {id}                                   │
├──────────────────────┬──────────────────────────────────────────┤
│ Left Panel (440px)   │ Right Panel (flex-1)                    │
│                      │                                          │
│ [Name] [Type ▾]      │ ┌──────────────────────────────────────┐ │
│ Type description     │ │                                      │ │
│ [Toler.][Tempo][Main]│ │          Staff Map (MapLibre)         │ │
│ □ Arty preparation   │ │                                      │ │
│                      │ │   ═══► Axis arrows + objectives      │ │
│ AXES OF ADVANCE      │ │   ◇ Staging diamonds                 │ │
│ [Main▪][Axis B▪]+Add │ │   ① ② ③ Numbered markers            │ │
│ ┌──────────────────┐ │ │                                      │ │
│ │ Axis name [Del]  │ │ │                        ┌──────────┐  │ │
│ │ BRIGADES         │ │ │                        │Map Ctrl  │  │ │
│ │ ☑ 1st Bde 2.4k  │ │ │                        │Click to..│  │ │
│ │ ☐ 2nd Bde 1.8k  │ │ │                        └──────────┘  │ │
│ │ STAGING          │ │ └──────────────────────────────────────┘ │
│ │ [Set Staging] ◇n │ │                                          │
│ │ OBJECTIVES       │ │                                          │
│ │ ① Obj (2.4k vs   │ │                                          │
│ │    ~1.8k ▲▼ ✕)  │ │                                          │
│ └──────────────────┘ │                                          │
│ PLAN SUMMARY         │                                          │
│ Status message       │                                          │
├──────────────────────┤                                          │
│ [Cancel] [Draft ▶]   │                                          │
└──────────────────────┴──────────────────────────────────────────┘

Confirmation Overlay (z-20, centered):
┌───────────────────────────────┐
│ CONFIRM OPERATION             │
│ Operation Krajina Push        │
│ Type: Sector Attack           │
│ Tolerance: Victory Req.       │
│ Tempo: Standard               │
│ ▪ Main Advance: 5 bdes → 3 o │
│   Staging: Bihać              │
│   1. Obj A → 2. Obj B → 3. C │
│ ▪ Axis B: 3 bdes → 2 objs    │
│         [Back] [Confirm ▶]    │
└───────────────────────────────┘
```

---

## Engine Integration

The engine already fully supports multi-axis operations via `CorpsOperation.axes?: OperationAxis[]`. This modal exposes that capability to the player for the first time. Pre-planned VRS operations (e.g., Operation Koridor) prove the axis system works end-to-end. The IPC handler `stage-corps-operation-order` in `electron-main.cjs` accepts and writes the full axes array to state.

---

## Files Modified

| File | Change |
|------|--------|
| `src/ui/map/components/OpsPlanningModal.tsx` | Full rewrite: multi-axis, staging, force preview, confirmation |
| `src/ui/map/desktop/useIPC.ts` | Extended `CorpsOperationOrderPayload` with axes array + staging_osid |

---

## Related Reports

- [20260305_GUI_POLISH_ORCHESTRATED_EXECUTION.md](20260305_GUI_POLISH_ORCHESTRATED_EXECUTION.md) — Original OpsPlanningModal implementation
- [20260305_REFACTOR_PASS_GUI_POLISH.md](20260305_REFACTOR_PASS_GUI_POLISH.md) — Previous refactor pass (shared helpers)
- [20260304_GUI_PHASE5_BATTLE_MARKERS_FOG_STRATEGIC_CORPS_OP_WAR_SUMMARY.md](20260304_GUI_PHASE5_BATTLE_MARKERS_FOG_STRATEGIC_CORPS_OP_WAR_SUMMARY.md) — `stageCorpsOperationOrder` IPC backend
- [20260307_PLAYER_AGENCY_IMPLEMENTATION_A_TO_H.md](20260307_PLAYER_AGENCY_IMPLEMENTATION_A_TO_H.md) — Operation shaping levers (Phase C)
- [20260307_OPERATIONS_SYSTEM_COMPREHENSIVE.md](20260307_OPERATIONS_SYSTEM_COMPREHENSIVE.md) — Operations commander + faction name pools
