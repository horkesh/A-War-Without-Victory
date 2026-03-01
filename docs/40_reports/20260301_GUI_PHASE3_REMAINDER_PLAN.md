# GUI Architecture v2 — Phase 3 Remainder Assessment & Execution Plan

**Date:** 2026-03-01  
**Author:** Orchestrator  
**Reference:** AWWV_GUI_ARCHITECTURE_REWORK_v2.md §0, §5.2, §8; 20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md

---

## 1. Assessment: Current GUI State vs v2 §0

### 1.1 What is actually present in `src/ui/map/`

| v2 §0 / §5.2 item | Present | Notes |
|-------------------|--------|--------|
| **Phase 3 Done** | | |
| TopToolbar, BottomStatusStrip | ✓ | App.tsx |
| SelectionPanel, FormationDetail | ✓ | SettlementDetailContent used in SelectionPanel + Tooltip; SituationTab in OOBSidebar |
| OOBSidebar, CorpsCard, BrigadeRow | ✓ | |
| Phase A (panel styling) | ✓ | |
| Phase B (tabbed Army/Situation, hover preview, Escape) | ✓ | OOBSidebar → SituationTab; hoveredOsids → sidebar-hover-outline |
| Phase C: Rich tooltips | ✓ | Tooltip.tsx, 300ms delay, store tooltipTarget/tooltipPosition |
| Phase C: MapModeToolbar + MapLayerToggles | ✓ | MapModeToolbar.tsx includes layer toggles (Fronts, Formations, Labels) inline; bottom-right |
| Phase C: useKeyboardShortcuts | ✓ | Enter, 1–4, Escape |
| Phase C: AttackConfirmation modal | ✓ | With combat odds via queryCombatEstimate when awwv exists |
| Phase C: OrderQueue | ✓ | Staged orders list; addStagedOrder on confirm would sync with IPC when Phase 4 wired |
| Storybook (key components) | ✓ | BrigadeRow, CorpsCard, FormationDetail, BottomStatusStrip, SelectionPanel, TopToolbar |

### 1.2 Phase 3 "Not yet" (v2 §0) — confirmed absent

| Item | Status |
|------|--------|
| **Minimap** | Not present. MapModeToolbar is positioned at `bottom: 200` (space reserved per Phase C report). |
| **ZoomControls** | Only MapLibre's built-in NavigationControl in MapContainer; no separate ZoomControls component. |
| **CorpsDetail** | Not present. No `selectedCorpsId` in store; no right-panel view for corps. |
| **ArmyDetail** | Not present. No `selectedArmyId`; OOB groups by corps, not by army. |
| **MovementPreview** | Not present. No reachable-OSID highlight layer or `orderModeForFormation: 'move'` → preview. |

### 1.3 Drift and notes

- **v2 §0** is accurate: Phase C is complete; Phase 3 "Not yet" correctly lists Minimap, ZoomControls, CorpsDetail, ArmyDetail, MovementPreview.
- **20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md** is outdated: it was written before/during Phase C and still lists MapModeToolbar, OrderQueue, AttackConfirmation, useKeyboardShortcuts as "Not implemented." In reality they are implemented. No code drift; only the status report is stale.
- **MapLayerToggles:** Implemented inside MapModeToolbar (not a separate component). v2 §5.2 lists them separately; functionally done.

---

## 2. Next priority choice and rationale

**Chosen priority: (a) Complete Phase 3 remainder**

**Rationale:**

- **Phase 3 remainder** closes the "UI panels" phase and makes the canonical browser map app feature-complete before Desktop integration. Minimap and ZoomControls improve navigation UX; CorpsDetail and ArmyDetail complete the OOB → detail flow; MovementPreview is high value for move mode.
- **Phase 4** (useIPC, advance-turn, order staging, recruitment, SidePickerOverlay, fog-of-war, PMTiles in Electron) is the next logical step after Phase 3 so the same UI runs in Electron with full gameplay loop. Doing Phase 3 remainder first avoids half-finished panels when switching to desktop.
- **Phase 5 polish** (ZoC overlay, battle markers, War Summary, Replay scrubber, etc.) is better after Phase 4 so the loop exists and polish can be validated in-context.

**Deferred:** Phase 4 start until Phase 3 remainder is done (or explicitly reprioritized by PM).

---

## 3. Execution plan for Phase 3 remainder

### Slice 1: Map overlays — Minimap + ZoomControls  
**Owner:** UI/UX developer  
**Scope:**

1. **Minimap**
   - Add a small overview map (same style or simplified) in a corner, with viewport rectangle synced to main map (MapLibre `getBounds()`, `fitBounds()` on minimap click/drag).
   - Position: e.g. bottom-right, below MapModeToolbar (MapModeToolbar currently `bottom: 200`; place minimap below it or adjust so both fit).
   - Store: optional `minimapVisible: boolean` if we add a toggle; else always visible.
2. **ZoomControls**
   - Either keep MapLibre NavigationControl only, or add a small custom ZoomControls component (zoom in/out/home) if product wants a different look or placement. If no product ask, **recommend keeping NavigationControl** and closing "ZoomControls" as "satisfied by NavigationControl" in v2 §0.

**Acceptance:** Minimap shows extent and viewport; zoom controls (built-in or custom) available. Refactor-pass after Slice 1; `tsc --noEmit`, `vitest run`, map build.

---

### Slice 2: Corps and Army detail panels  
**Owner:** UI/UX developer (+ gameplay programmer if formation/corps/army aggregates need clarification)  
**Scope:**

1. **Store**
   - Add `selectedCorpsId: string | null`, `setSelectedCorpsId(id)`; clear on selectedOsid/selectedFormationId (and vice versa).
   - Add `selectedArmyId: string | null`, `setSelectedArmyId(id)` if OOB has army-level grouping; else derive "army" from corps (e.g. first corps in faction) and defer ArmyDetail to "corps-level view when multiple corps" or document as future.
2. **OOBSidebar**
   - Make corps header (and army header if present) clickable; on click set `selectedCorpsId` / `selectedArmyId` and clear selection of OSID/formation.
3. **CorpsDetail**
   - New component: right panel when `selectedCorpsId` is set. Content: corps name, faction, list of brigades (reuse BrigadeRow or summary), front assignment, stance if available from LoadedGameState. Close button clears `selectedCorpsId`.
4. **ArmyDetail**
   - New component or "Army" tab/section: right panel when `selectedArmyId` is set. If OOB has no army level, implement as "army = all corps of faction" or single panel showing faction-level summary; otherwise show army name, corps list, aggregate stats.
5. **App layout**
   - Render CorpsDetail / ArmyDetail in the same right-panel slot as SelectionPanel/FormationDetail (mutually exclusive with selectedOsid/selectedFormationId). Order of precedence: Formation > Corps > Army > OSID (or as product prefers).

**Acceptance:** Click corps in OOB opens CorpsDetail; optional army click opens ArmyDetail. No duplicate state; Escape clears. Refactor-pass; smoke-test triad.

---

### Slice 3: Movement preview  
**Owner:** Gameplay programmer (reachability) + UI/UX developer (map layer + mode)  
**Scope:**

1. **Reachability**
   - Define "reachable OSIDs" for a brigade: e.g. same-faction control, within N steps on contact graph, or use existing engine/desktop logic (e.g. `stage-brigade-movement-order` validation). Prefer read-only query (no state mutation). Option: add `query-reachable-osids` IPC or compute in renderer from LoadedGameState + contact graph if exposed.
2. **Store / mode**
   - Use existing `orderModeForFormation` or add `orderModeForFormation: 'attack' | 'move' | null`. When in move mode and a formation is "selected for order," set which formation is in move mode (already partially there via orderModeForFormation).
3. **Map**
   - When in move mode and formation F is chosen, compute reachable OSIDs for F; add a GeoJSON source + fill layer (e.g. semi-transparent highlight) for those OSIDs. Click on reachable OSID → stage move order (Phase 4) or show in OrderQueue; click elsewhere or Escape → clear move mode.
4. **MovementPreview component**
   - Optional: small panel "Moving: &lt;formation&gt; — click destination" when in move mode. Else rely on map highlight + tooltip.

**Acceptance:** In move mode, reachable OSIDs are highlighted; click to stage move (or placeholder); Escape clears. Refactor-pass; determinism check (no random; stable sort of OSIDs). Canon-compliance review if reachability rules touch engine contracts.

---

### Gates (all slices)

- **Validation-first:** Read v2 §5.2, §6.2, HOI_VISUAL_GUI_OVERHAUL_SPEC §3.2 (minimap), §3.8 (panels).
- **After each slice:** Refactor-pass (dead code, duplicates); `npx tsc --noEmit`, `npx vitest run`, map app build.
- **Ledger:** One entry per slice when behavior/outputs change; optional single entry for "Phase 3 remainder plan" at start.
- **Commit:** One commit per slice (or per logical unit within slice if large).

---

### Handoff

- **Orchestrator → PM:** Use this plan for sequencing and assignment. Slice 1 can be executed immediately by UI/UX; Slices 2 and 3 can run in parallel after Slice 1 if two devs available (Slice 2 pure UI; Slice 3 needs reachability contract).
- **Orchestrator → Dev:** If the slice is small enough (e.g. Slice 1 only), a single agent/session can implement it and then update v2 §0 and ledger; otherwise hand off this doc and v2 §0 to dev for implementation and report back.

---

## 4. Doc updates (this session)

- **v2 §0:** Update "Not yet" to reflect that Phase 3 remainder is planned (Minimap, ZoomControls, CorpsDetail, ArmyDetail, MovementPreview) and add "Next priority: Phase 3 remainder (see 20260301_GUI_PHASE3_REMAINDER_PLAN.md)."
- **Ledger:** Append entry for assessment + Phase 3 remainder plan (no behavior change; planning only).
- **Status report:** Optional: add a short "As of 2026-03-01" note to 20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md that Phase C is complete and Phase 3 "Not yet" items are planned per this report.

---

*End of plan.*
