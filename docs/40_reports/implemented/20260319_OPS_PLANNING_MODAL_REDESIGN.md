# Ops Planning Modal Redesign — Implementation Report

**Date:** 2026-03-19
**Version:** v0.4.9 → v0.5.0 (ops modal)
**Commits:** 10 (6889d98..281879a)
**Net lines:** +2,578 / -1,424 = +1,154 (24 files changed)
**Tests:** 1203 pass (98 suites) — 10 new auto-propose tests

---

## Summary

Replaced the monolithic 1,415-line `OpsPlanningModal.tsx` (sector-scoped, single-file) with a 16-file corps-level, 4-phase planning flow. Full-bleed MapLibre map as background with floating glass panels. "Analog soul, digital skeleton" aesthetic — paper textures, typewriter fonts, faction-colored arrows.

## Architecture

### Before
- Single `OpsPlanningModal.tsx` (1,415 lines)
- Sector-scoped: one sector's brigades/objectives
- Commander selection via separate `CommanderSelectionModal` post-submission
- No G2 prediction integration (IPC existed but was never called from UI)
- Combined UI: everything in one file (map init, click handlers, force shelf, G2 panel, submission)

### After
- 16 files in `src/ui/map/components/ops_modal/`
- Corps-level: all corps brigades, all corps sectors' objectives
- Commander selection integrated as Phase 1 (before planning, not after)
- G2 prediction live via `usePrediction` hook (debounced IPC to `queryOperationPrediction`)
- Clean separation: types → shell → phase components → pure logic → hooks

### File Inventory

| File | Lines | Purpose |
|------|-------|---------|
| `types.ts` | 73 | Shared types: OpsPhase, OpType, Tempo, Tolerance, AxisState, OpsPlanState, FACTION_ARMY_HEADERS |
| `OpsPlanningModal.tsx` | 259 | Shell: 4-phase state machine, keyboard nav (Esc/arrows/1-4), plan state management |
| `CommanderPhase.tsx` | 237 | Phase 1: corps identity card + officer selection grid with personality pips |
| `OpsMap.tsx` | 355 | Full-bleed MapLibre: territory fills, front lines, advance arrows, click handlers |
| `PlanPhase.tsx` | 117 | Phase 2 orchestrator: auto-propose trigger, centroid lookup, brigade/objective wiring |
| `ObjectiveList.tsx` | 141 | Floating panel (top-right): numbered objectives, schwerpunkt star, reorder, remove |
| `BrigadeTray.tsx` | 120 | Bottom panel: parameters strip + scrollable brigade cards + assembly time |
| `BrigadeCard.tsx` | 111 | Card component (React.memo): click to toggle, march time, cohesion bar, equipment |
| `PlanParameters.tsx` | 107 | Pill buttons: op type, tempo, tolerance, artillery prep toggle |
| `autoPropose.ts` | 82 | Pure logic: score brigades by proximity (0.5), combat power (0.3), readiness (0.2) |
| `usePrediction.ts` | 115 | Debounced IPC hook: 500ms delay, stable key serialization, ref-based plan access |
| `G2Phase.tsx` | 142 | Phase 3 clipboard: binder clip, cream paper body, 2 tabs, intel gate warning |
| `NarrativeTab.tsx` | 86 | Military document: OGRANIČENO stamp, NEPRIJATELJ/VLASTITE/PROCJENA sections |
| `RawIntelTab.tsx` | 118 | Quantitative data: ReadinessBar, force ratio, outcome badges, per-axis breakdown |
| `AuthorizePhase.tsx` | 206 | Phase 4: OPORD display, ODOBRENO stamp animation, IPC submission, probe fallback |
| `OpordDocument.tsx` | 150 | Formal OPORD: faction headers, 6 sections (ZADAĆA/SNAGE/ZAPOVJEDNIK/PROVEDBA/CILJEVI/LOGISTIKA) |

**Test:** `tests/ui/ops_modal_auto_propose.test.ts` (108 lines, 10 tests)

### Modified Files

| File | Change |
|------|--------|
| `gameStore.ts` | +25 lines: `opsPlanningCorpsId`, `opsPlanningOriginSectorId`, `opsPlanningSelectedOfficerId`, `setOpsPlanningContext()`, `clearOpsPlanningContext()` |
| `App.tsx` | Import path: `./components/OpsPlanningModal` → `./components/ops_modal/OpsPlanningModal` |
| `CorpsDetail.tsx` | Launch: `setOpsPlanningContext(corpsId, sectorId)` replaces `setSelectedCorpsFrontSectorId` + `setOpsPlanningModalOpen` |
| `CorpsFrontPanel.tsx` | Same pattern: `setOpsPlanningContext(corpsId, sectorId)` |
| `formatters.ts` | +20 lines: `turnToISODate()`, `formatCorpsDisplayName()` |
| `vitest.config.ts` | Added `tests/ui/ops_modal_auto_propose.test.ts` to include list |

### Deleted Files

| File | Lines | Reason |
|------|-------|--------|
| `OpsPlanningModal.tsx` | 1,415 | Replaced by 16-file ops_modal/ directory |

## Phase Flow

```
Phase 1: Commander    → Select officer (clickable cards, personality, prep time)
Phase 2: Plan         → Click objectives on map, auto-propose brigades, set parameters
Phase 3: G2 Assessment → Clipboard with narrative + raw intel tabs, live predictions
Phase 4: Authorize    → OPORD document, stamp animation, IPC submission
```

### Backtracking
- Arrow keys navigate between visited phases
- Number keys (1-4) jump directly to any visited phase
- Plan state persists across backtracking (lifted to shell)

### Keyboard Shortcuts
- `Escape` — close modal
- `←` / `→` — navigate phases (backtrack only, can't skip forward)
- `1` / `2` / `3` / `4` — jump to visited phase

## IPC Integration

| Channel | Direction | Usage |
|---------|-----------|-------|
| `queryOperationPrediction` | UI → Engine | G2 prediction (debounced, first time called from UI) |
| `stageCorpsOperationOrder` | UI → Engine | Submit operation on authorize |
| `stageAssignOperationCommander` | UI → Engine | Assign selected officer (parallel with above) |

## Design Decisions

### No Checkboxes
All selection uses clickable cards with visual state changes:
- **Officer cards**: click to select and advance
- **Brigade cards**: click to toggle assignment (faction-colored border = assigned)
- **Objective list**: click map to add, × to remove, ★ for schwerpunkt
- **Parameters**: pill buttons for type/tempo/tolerance, toggle for artillery

### Auto-Propose Algorithm
When first objective is added, `autoProposeBrigades` scores all eligible corps brigades:
- `proximityScore` (0.5 weight): inverse distance to nearest objective centroid
- `combatPowerScore` (0.3 weight): `(personnel + tanks×50 + arty×30) / 5000`
- `readinessScore` (0.2 weight): `(cohesion/100) × (1 - fatigue/30)`
- Filtered: ≥400 personnel, active, not disrupted, brigade kind
- Capped at `MAX_PARTICIPATING_BRIGADES = 12`

### Intel Gate
If `prediction.overall.intelConfidence < 0.4`:
- G2 Phase shows prominent "INTEL INSUFFICIENT" warning
- Authorize Phase shows "ORDER PROBE" as primary action instead of "AUTHORIZE"
- "Authorize Anyway" available as subdued secondary action

### Faction Localization
- Document headers in Bosnian/Serbian/Croatian per faction
- Classification stamp: "OGRANIČENO" (RBiH), faction-appropriate variants
- OPORD sections: ZADAĆA, SNAGE, ZAPOVJEDNIK, PROVEDBA, CILJEVI, LOGISTIKA
- Authorize button: "ODOBRITI OPERACIJU" / stamp: "ODOBRENO"
- Transmitted: "ZAPOVIJED PROSLIJEĐENA"

## Simplify Passes (2 rounds)

### Round 1 (11 fixes)
- **High**: Removed `Math.random()` from G2 skeleton (determinism), fixed PlanPhase unstable effect deps (refs), fixed usePrediction debounce (stable key serialization)
- **Medium**: Reused `FACTION_HEX_COLORS` from opsConstants, extracted `formatCorpsDisplayName` + `turnToISODate` to formatters.ts, unified `FACTION_ARMY_HEADERS` in types.ts, passed `corpsBrigades` as prop
- **Low**: Removed dead `getOpsMapCentroidLookup` export, extracted `pillClass` helper, passed `faction` prop to OpsMap

### Round 2 (6 fixes from 3 review agents)
- **High**: Memoized `assignedIds` Set in BrigadeTray (was breaking sortedBrigades memo every render)
- **Medium**: Wrapped BrigadeCard in `React.memo` with `onToggle` pattern, memoized `allObjectives`, stabilized `toggleBrigade` with `useCallback`, deduplicated `handleAuthorize`/`handleProbe` into `submitOperation()`, parallelized IPC calls
- **Low**: Removed unused `BrigadePlanView` type

## Kept (Reused)

| File | Reason |
|------|--------|
| `plan_ui/ReadinessBar.tsx` | Reused by RawIntelTab for intel/force ratio bars |
| `plan_ui/opsConstants.ts` | Reused: FACTION_HEX_COLORS, INTEL_LABELS, FORCE_RATIO_LABELS, OUTCOME_STYLES, etc. |
| `CommanderSelectionModal.tsx` | Still used for mid-operation commander replacement (non-planning) |
| `OperationBriefingModal.tsx` | Used during operation execution (preparation phase briefings) |

## Known Limitations

1. **G2 predictions depend on IPC** — dev map (port 3001) has no Electron backend, so predictions return null. Full flow only testable in desktop mode (port 3002).
2. **MapLibre arrow rendering** — uses `setData()` on dynamic GeoJSON sources, which works correctly in this implementation (previous setData bug was in the old modal's context).
3. **Operation name determinism** — `generateOpName()` uses `simpleHash(corpsId + turn)` which is deterministic per corps/turn but not across sessions (module-level counter for axis IDs is not reset).
