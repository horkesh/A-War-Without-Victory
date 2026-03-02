# Phase 4 Desktop Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate the canonical React + MapLibre app with Electron IPC so a player can start a campaign, stage orders, recruit, advance turns, and see updated state in one desktop loop.

**Architecture:** Keep `src/ui/map/` as the single GUI authority and add a typed desktop bridge layer (`useIPC`) between React UI and `window.awwv` preload APIs. Route all desktop-only behavior through this bridge while preserving browser fallback behavior for `npm run dev:map`.

**Tech Stack:** React 18, Zustand, MapLibre, Electron preload bridge (`window.awwv`), IPC handlers in `src/desktop/electron-main.cjs`, desktop sim bundle (`src/desktop/desktop_sim.ts`), Vitest + TypeScript.

---

## Scope and priority statement

- **Priority:** Phase 4 Desktop integration only (no Phase 5 polish work).
- **In-scope:** `useIPC`, `advance-turn`, order staging flow, recruitment UI wiring, side picker flow, fog-of-war filtering for player faction, Electron PMTiles loading path.
- **Out-of-scope:** replay scrubber polish, visual-only refinements, new game mechanics, canon rule changes.

## Approach options (brainstormed) and recommendation

1. **Recommended: typed bridge + feature adapters**
   - Add `useIPC` and typed methods; keep components mostly unchanged.
   - Pros: low churn, testable seam, preserves browser mode.
   - Cons: adds one abstraction layer.
2. **Direct `window.awwv` access in each component**
   - Pros: fastest initial edits.
   - Cons: scattered coupling, hard to test, fragile null checks.
3. **Global desktop service singleton**
   - Pros: centralized API.
   - Cons: hidden state and lifecycle complexity with React effects.

**Decision:** Option 1.

## Required reading before implementation

- `docs/20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md` (Phase 4 section)
- `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`
- `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` (canonical map guidance)
- `src/desktop/preload.cjs`
- `src/desktop/electron-main.cjs`
- `src/ui/map/App.tsx`
- `src/ui/map/map/MapContainer.tsx`
- `src/ui/map/store/gameStore.ts`

## Assumptions and risks

- **Assumption (medium):** Preload bridge (`window.awwv`) remains backward compatible with documented IPC names.
- **Assumption (low):** `game-state-updated` payload shape remains parseable by `GameStateAdapter`.
- **Risk (high):** Duplicate state application (invoke return + broadcast event) causes flicker or stale UI.
- **Risk (medium):** Browser mode regressions if desktop checks leak into shared UI paths.
- **Risk (medium):** PMTiles path differences under `awwv://` protocol in packaged builds.

## Determinism safeguards checklist

- No randomization, timestamps, or wall-clock driven branching in UI state transforms.
- Sort any newly introduced collections before rendering or serialization.
- Preserve canonical IPC payload shapes and key ordering from existing serializers.
- Do not mutate simulation state client-side; UI only stages/orders via IPC.
- If AoR/SID legacy terms are encountered in touched code/docs, replace/address with Phase II OSID model.

## Phased implementation tasks

### Task 1: Build typed desktop bridge (`useIPC`) and remove inline bridge usage

**Files:**
- Create: `src/ui/map/desktop/types.ts`
- Create: `src/ui/map/desktop/useIPC.ts`
- Create: `src/ui/map/desktop/bridge.ts`
- Modify: `src/ui/map/App.tsx`
- Modify: `src/ui/map/components/FormationDetail.tsx`
- Test: `tests/ui_map_desktop_bridge.test.ts`

**Step 1: Write failing tests**
- Add tests for: browser fallback (`awwv` absent), method passthrough mapping, and error normalization.

**Step 2: Run tests (expect fail)**
- Run: `npm run test:vitest -- tests/ui_map_desktop_bridge.test.ts`
- Expected: missing desktop bridge module / failing expectations.

**Step 3: Implement minimal bridge**
- Add typed wrappers for at least: `getCurrentGameState`, `setGameStateUpdatedCallback`, `advanceTurn`, `stageAttackOrder`, `stageMoveOrder`, `stagePostureOrder`, `startNewCampaign`, `getRecruitmentCatalog`, `applyRecruitment`.

**Step 4: Re-run tests (expect pass)**
- Run: `npm run test:vitest -- tests/ui_map_desktop_bridge.test.ts`

**Step 5: Commit**
- `git add src/ui/map/desktop src/ui/map/App.tsx src/ui/map/components/FormationDetail.tsx tests/ui_map_desktop_bridge.test.ts`
- `git commit -m "feat(map): add typed desktop IPC bridge"`

### Task 2: Desktop session bootstrap + game-state sync

**Files:**
- Create: `src/ui/map/hooks/useDesktopSession.ts`
- Modify: `src/ui/map/App.tsx`
- Modify: `src/ui/map/store/gameStore.ts`
- Test: `tests/ui_map_desktop_session_sync.test.ts`

**Step 1: Write failing test**
- Assert boot flow: on desktop mount, fetch current state once, subscribe to `game-state-updated`, and apply state exactly once per update.

**Step 2: Run test (expect fail)**
- Run: `npm run test:vitest -- tests/ui_map_desktop_session_sync.test.ts`

**Step 3: Implement**
- Add `useDesktopSession` to initialize from IPC and subscribe/unsubscribe safely.
- Ensure store update path is deterministic and idempotent.

**Step 4: Run test (expect pass)**
- Run: `npm run test:vitest -- tests/ui_map_desktop_session_sync.test.ts`

**Step 5: Commit**
- `git add src/ui/map/hooks/useDesktopSession.ts src/ui/map/App.tsx src/ui/map/store/gameStore.ts tests/ui_map_desktop_session_sync.test.ts`
- `git commit -m "feat(map): bootstrap desktop state sync"`

### Task 3: Advance-turn + order staging integration

**Files:**
- Modify: `src/ui/map/components/TopToolbar.tsx`
- Modify: `src/ui/map/components/OrderQueue.tsx`
- Modify: `src/ui/map/components/BottomStatusStrip.tsx`
- Modify: `src/ui/map/components/AttackConfirmation.tsx`
- Test: `tests/ui_map_orders_desktop_integration.test.ts`

**Step 1: Write failing test**
- Verify staged UI actions call the correct IPC methods and clear local queue only on success.

**Step 2: Run test (expect fail)**
- Run: `npm run test:vitest -- tests/ui_map_orders_desktop_integration.test.ts`

**Step 3: Implement**
- Add `Advance Turn` action wired to `advance-turn`.
- Route attack/move/posture staging to IPC bridge.
- Keep browser fallback behavior explicit (no-op or local staging per current behavior).

**Step 4: Run test (expect pass)**
- Run: `npm run test:vitest -- tests/ui_map_orders_desktop_integration.test.ts`

**Step 5: Commit**
- `git add src/ui/map/components/TopToolbar.tsx src/ui/map/components/OrderQueue.tsx src/ui/map/components/BottomStatusStrip.tsx src/ui/map/components/AttackConfirmation.tsx tests/ui_map_orders_desktop_integration.test.ts`
- `git commit -m "feat(map): wire turn advance and order staging to IPC"`

### Task 4: Recruitment modal + side picker flow

**Files:**
- Create: `src/ui/map/components/RecruitmentModal.tsx`
- Create: `src/ui/map/components/SidePickerOverlay.tsx`
- Modify: `src/ui/map/App.tsx`
- Modify: `src/ui/map/components/TopToolbar.tsx`
- Test: `tests/ui_map_recruitment_and_side_picker.test.ts`

**Step 1: Write failing test**
- Validate side picker invokes `start-new-campaign` with selected faction.
- Validate recruitment fetch/apply uses IPC and updates local UI state.

**Step 2: Run test (expect fail)**
- Run: `npm run test:vitest -- tests/ui_map_recruitment_and_side_picker.test.ts`

**Step 3: Implement**
- Add overlay for faction selection.
- Add recruitment modal wired to `get-recruitment-catalog` and `apply-recruitment`.

**Step 4: Run test (expect pass)**
- Run: `npm run test:vitest -- tests/ui_map_recruitment_and_side_picker.test.ts`

**Step 5: Commit**
- `git add src/ui/map/components/RecruitmentModal.tsx src/ui/map/components/SidePickerOverlay.tsx src/ui/map/App.tsx src/ui/map/components/TopToolbar.tsx tests/ui_map_recruitment_and_side_picker.test.ts`
- `git commit -m "feat(map): add side picker and recruitment desktop flows"`

### Task 5: Fog-of-war rendering filter by `player_faction`

**Files:**
- Modify: `src/ui/map/map/builders/buildFormationsGeoJSON.ts`
- Modify: `src/ui/map/map/MapContainer.tsx`
- Test: `tests/ui_map_fog_of_war_filter.test.ts`

**Step 1: Write failing test**
- Assert enemy formations are filtered when `player_faction` exists; all formations visible otherwise.

**Step 2: Run test (expect fail)**
- Run: `npm run test:vitest -- tests/ui_map_fog_of_war_filter.test.ts`

**Step 3: Implement**
- Add deterministic filter logic in builder layer (not in map click handlers).

**Step 4: Run test (expect pass)**
- Run: `npm run test:vitest -- tests/ui_map_fog_of_war_filter.test.ts`

**Step 5: Commit**
- `git add src/ui/map/map/builders/buildFormationsGeoJSON.ts src/ui/map/map/MapContainer.tsx tests/ui_map_fog_of_war_filter.test.ts`
- `git commit -m "feat(map): apply player-faction fog-of-war filter"`

### Task 6: Electron PMTiles serving verification and fallback

**Files:**
- Modify: `src/desktop/electron-main.cjs`
- Modify: `src/ui/map/map/MapContainer.tsx`
- Modify: `src/ui/map/map/awwv_map_style.json` (only if route rewrite is required)
- Test: `tests/desktop_pmtiles_protocol_route.test.ts`

**Step 1: Write failing test**
- Assert PMTiles URLs resolve in desktop runtime path conventions.

**Step 2: Run test (expect fail)**
- Run: `npm run test:vitest -- tests/desktop_pmtiles_protocol_route.test.ts`

**Step 3: Implement**
- Verify `awwv://app/data/derived/tiles/*.pmtiles` compatibility.
- Add minimal fallback only if current protocol path fails.

**Step 4: Run test (expect pass)**
- Run: `npm run test:vitest -- tests/desktop_pmtiles_protocol_route.test.ts`

**Step 5: Commit**
- `git add src/desktop/electron-main.cjs src/ui/map/map/MapContainer.tsx src/ui/map/map/awwv_map_style.json tests/desktop_pmtiles_protocol_route.test.ts`
- `git commit -m "fix(desktop): stabilize PMTiles routing in Electron"`

### Task 7: Verification, docs propagation, and ledger/report updates

**Files:**
- Modify: `docs/PROJECT_LEDGER.md`
- Modify: `docs/10_canon/context.md` (if behavior surface changed)
- Modify: `docs/20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md`
- Add: `docs/40_reports/implemented/20260302_PHASE4_DESKTOP_INTEGRATION_IMPLEMENTATION.md`
- Modify: `docs/40_reports/README.md`

**Step 1: Run required gates**
- `npm run typecheck`
- `npm run test:vitest`
- `npm run desktop:map:build`
- `npm run warroom:build`
- Manual desktop smoke: `npm run desktop` (new campaign -> stage orders -> recruit -> advance turn)

**Step 2: Run phase-specific checks**
- Confirm no duplicate state apply on `game-state-updated`.
- Confirm browser mode still works (`npm run dev:map`).

**Step 3: Append ledger entries**
- Pre-implementation blast-radius entry.
- Post-verification evidence entry with commands + outcomes.

**Step 4: Report and docs**
- Add dated implementation report in `docs/40_reports/implemented/`.
- Update `docs/40_reports/README.md` index entry.

**Step 5: Commit**
- `git add docs/PROJECT_LEDGER.md docs/10_canon/context.md docs/20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md docs/40_reports/implemented/20260302_PHASE4_DESKTOP_INTEGRATION_IMPLEMENTATION.md docs/40_reports/README.md`
- `git commit -m "docs: record phase 4 desktop integration completion"`

## Required tests and evidence checklist

- Unit/adapter tests for desktop bridge and session sync.
- UI integration tests for order staging, side picker, recruitment, fog filter.
- Desktop packaging/build checks (`desktop:map:build`, `warroom:build`).
- Manual Electron loop evidence (screenshots/log snippets in report).

## Ledger notes template (use during execution)

**Pre-implementation entry**
- Summary: Phase 4 desktop integration blast radius and acceptance criteria.
- Change: planned files and IPC channels.
- Failure mode prevented: desktop/browser divergence and nondeterministic UI state.

**Post-verification entry**
- Summary: completed Phase 4 wiring and validation evidence.
- Change: implemented bridge, flow wiring, fog filter, PMTiles path handling.
- Failure mode prevented: stale/duplicated state and broken desktop map loads.

## STOP AND ASK triggers

- If any change requires canon reinterpretation (not implementation note).
- If Phase 4 work spills into Phase 5 polish scope.
- If IPC payloads require contract-breaking changes in `DESKTOP_GUI_IPC_CONTRACT.md`.
- If determinism risks appear in ordering/serialization during desktop state application.
