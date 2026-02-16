# Recruitment UI from Map — Implementation Report

**Date:** 2026-02-14  
**Status:** Implemented  
**Canon:** Systems Manual §13 (recruitment and militarization); GUI Design Blueprint §12 (Recruitment panel)

---

## 1. Summary

The tactical map now supports **player-driven recruitment** when a loaded game state has `recruitment_state` (e.g. `player_choice` scenarios): a toolbar shows recruitment capital by faction, a **Recruit** button and **R** hotkey open a modal with the OOB brigade catalog and eligibility, and in the desktop app the player can confirm activation; the backend applies the recruitment and the map shows placement feedback. Desktop **Advance turn** runs accrual so capital and equipment increase each turn without running bot recruitment.

---

## 2. What Was Implemented

### 2.1 Toolbar and recruitment state (Phase 1)

- **LoadedGameState** (`src/ui/map/types.ts`): optional `recruitment?: RecruitmentView` with `capitalByFaction`, `equipmentByFaction`, and `recruitedBrigadeIds` (deterministic sorted keys).
- **GameStateAdapter** (`src/ui/map/data/GameStateAdapter.ts`): when `state.recruitment_state` exists, populates `recruitment` from `recruitment_capital`, `equipment_pools`, and `recruited_brigade_ids`; uses shared `pointsByFaction()` for capital/equipment extraction.
- **Toolbar**: `#recruitment-capital` span shows e.g. "Capital: RBiH 42 | RS 38 | HRHB 12"; visible only when `loadedGameState.recruitment` is set. **Recruit** button opens the recruitment modal.

### 2.2 Recruitment modal (Phase 2)

- **Modal** (`#recruitment-modal` in `tactical_map.html`): overlay with header, content area, and footer with **Activate brigade** (confirm) button. Close via **Escape** or close button.
- **Catalog**: In desktop, catalog is loaded via IPC `get-recruitment-catalog` (main loads OOB brigades from baseDir and returns a serializable list). In browser-only, a message explains that the catalog requires the desktop app.
- **Eligibility**: For each brigade: not already in `recruitedBrigadeIds`; `available_from` ≤ current turn; faction has enough capital, equipment (from EQUIPMENT_CLASS_TEMPLATES), and militia pool manpower in home municipality. Ineligible rows are disabled; **Select** sets the chosen brigade and equipment class and enables the confirm button.
- **Hotkey R**: When `lastLoadedGameState?.recruitment` exists, **R** opens the recruitment modal; otherwise **R** focuses the replay scrubber (unchanged).

### 2.3 Apply recruitment and placement feedback (Phase 3)

- **Desktop backend** (`src/desktop/desktop_sim.ts`): `applyPlayerRecruitment(state, baseDir, brigadeId, equipmentClass)` loads OOB brigades, `municipalityHqSettlement`, and settlement graph; builds `sidToMun` via `buildSidToMunFromSettlements`; calls `recruitBrigade()` then `applyRecruitment()` from `src/sim/recruitment_engine.ts`. Returns `{ ok, state }` or `{ ok: false, error }`.
- **IPC** (`electron-main.cjs`, `preload.cjs`): `apply-recruitment` handler with payload `{ brigadeId, equipmentClass }`; on success main updates `currentGameStateJson`, sends state to renderer via `game-state-updated`, and returns `{ ok: true, stateJson, newFormationId }`.
- **MapApp confirm**: When user confirms and `awwv.applyRecruitment` exists, the renderer calls it; on success applies state via `applyGameStateFromJson(result.stateJson)`, sets the new formation as selected for 4 seconds (highlight), then clears selection. In browser-only, confirm shows "Recruitment apply only in desktop app."

### 2.4 Desktop advance runs accrual (Phase 4)

- **advanceTurn** (`src/desktop/desktop_sim.ts`): For Phase II, when `state.recruitment_state` exists, calls `accrueRecruitmentResources(state, graph.settlements, undefined)` before `runPhaseIITurn`. Bot recruitment (`runOngoingRecruitment`) is **not** run on desktop advance so the player recruits via the UI; capital and equipment accrue each turn.

### 2.5 Refactor pass (post-implementation)

- **desktop_sim.ts**: Extracted `settlementGraphOptions(baseDir)` to remove duplicated graph path configuration in `advanceTurn` and `applyPlayerRecruitment`.
- **GameStateAdapter.ts**: Extracted `pointsByFaction(rec)` for capital/equipment extraction; removed duplicate loops.
- **MapApp.ts**: Removed unused `footer` variable in recruitment modal setup.

### 2.6 UX refinement: player-side only, recruitable-only list, cost legend (2026-02-14)

- **Player-side only:** The modal shows only brigades of the player's faction (`LoadedGameState.player_faction`). If `player_faction` is not set, the modal prompts to start a New Campaign and choose a side.
- **Recruitable-only list:** The table lists only brigades the player can recruit at that moment (eligible: not already recruited, `available_from` ≤ turn, sufficient Capital/Equipment/Manpower). If none are recruitable, a single message is shown instead of a table. Removed disabled-row styling (no longer used).
- **Cost clarity:** Legend above the table: **C** = Capital, **E** = Equipment, **M** = Manpower (from militia pool). Resources line shows only the player's Capital and Equipment. Cost column format: e.g. `10 C, 5 E, 800 M`; table header "Pool (M)" for manpower.
- **Refactor (same session):** Local `setMsg(html)` helper for all modal error/empty states; single eligibility loop building `recruitable` entries `{ b, equipCost, manpowerAvail }` to avoid duplicate computation; `getEquipCost(cls)` helper; removed dead CSS `.tm-recruitment-row-disabled`. See TACTICAL_MAP_SYSTEM §13.8.

---

## 3. Files Touched

| Area | Files |
|------|--------|
| Types / adapter | `src/ui/map/types.ts`, `src/ui/map/data/GameStateAdapter.ts` |
| Toolbar / map | `src/ui/map/tactical_map.html`, `src/ui/map/MapApp.ts`, `src/ui/map/styles/tactical-map.css` |
| Desktop | `src/desktop/desktop_sim.ts`, `src/desktop/electron-main.cjs`, `src/desktop/preload.cjs` |
| Docs | `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`, `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`, `docs/10_canon/context.md`, `docs/10_canon/Systems_Manual_v0_5_0.md`, `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` |

---

## 4. Canon and determinism

- **Canon:** Systems Manual §13 and the recruitment implementation reports already define ongoing activation with capital/equipment accrual. This work adds a **player UI** and defers application to explicit player confirm in desktop; no change to `recruitBrigade` / `applyRecruitment` rules.
- **Determinism:** One recruitment action per IPC call; accrual uses existing deterministic logic in `recruitment_turn.ts`. No timestamps or randomness in UI-driven apply. Catalog and adapter use sorted faction/key ordering.

---

## 5. References

- Implementation plan: recruitment UI callable from map (phases 1–4).
- [DESKTOP_GUI_IPC_CONTRACT.md](../../20_engineering/DESKTOP_GUI_IPC_CONTRACT.md) — `get-recruitment-catalog`, `apply-recruitment`.
- [TACTICAL_MAP_SYSTEM.md](../../20_engineering/TACTICAL_MAP_SYSTEM.md) — §2 overview, §12.4 R hotkey, §13.8 Recruitment modal, §14.2 recruitment in adapter, §21 desktop.
- [recruitment_system_implementation_report.md](recruitment_system_implementation_report.md), [ongoing_recruitment_implementation_report_2026_02_11.md](ongoing_recruitment_implementation_report_2026_02_11.md) — engine and pipeline.
