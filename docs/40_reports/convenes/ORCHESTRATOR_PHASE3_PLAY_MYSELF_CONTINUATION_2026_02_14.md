# Phase 3 (Play myself) — continuation

**Date:** 2026-02-14  
**Owner:** Orchestrator  
**Purpose:** Set single priority and handoff for Phase 3 of the GUI Phased Implementation Plan (Play myself: load start, advance turn).

---

## 1. State of the game

- **Phase 1 (packaging and shell):** Done. Electron main (`src/desktop/electron-main.cjs`), awwv protocol, map + data/derived; scripts `desktop:map:build`, `desktop`. CONSOLIDATED_IMPLEMENTED §7.
- **Phase 2 (rewatch):** Done. File → Open replay, load-replay-dialog IPC, "Open last run", MapApp `loadReplayFromData()` and replay-loaded callback.
- **Phase 3 (play myself):** Next. Goal: user can load a scenario or saved state and advance turns; map and state update after each advance. Sim runs in Electron main (per T8/T9 plan).

---

## 2. Single priority

**Phase 3 — Play myself (load start, advance turn).**

Deliver in the **launchable desktop app** (Electron + tactical map):

1. **Load start:** "New game" / "Load scenario" / "Load state file" from UI. Main process loads scenario JSON or state JSON; runs init or uses as initial state; holds state in memory (or user data dir).
2. **Advance turn:** "Advance turn" (or "Next week") from UI. Main process runs existing Phase 0 / Phase I / Phase II browser-safe turn logic (same code as warroom: `runPhase0TurnAndAdvance`, `runPhaseITurn`, `runPhaseIITurn`); updates state; sends new state (or path) to renderer. Renderer (tactical map) refreshes map and panels from new state.
3. **Optional:** "Run to end" (full `runScenario`) with progress; when done, offer "Rewatch" with generated `replay_timeline.json`.

**Constraints:** No new randomness or timestamps; same pipeline and ordering as today. Do not change canon or sim determinism.

---

## 3. Handoff to dev

**Inputs:**

- [ORCHESTRATOR_PHASED_IMPLEMENTATION_PLAN_GUI_2026_02_14.md](ORCHESTRATOR_PHASED_IMPLEMENTATION_PLAN_GUI_2026_02_14.md) — Phase 3 tasks and output.
- [ORCHESTRATOR_GUI_STATE_AND_GAPS_MEMO_2026_02_14.md](ORCHESTRATOR_GUI_STATE_AND_GAPS_MEMO_2026_02_14.md) — warroom has advance turn + no scenario load; tactical map is view-only (no advance).
- [ORCHESTRATOR_RUNNER_AND_REPLAY_LAUNCHABLE_APP_2026_02_14.md](ORCHESTRATOR_RUNNER_AND_REPLAY_LAUNCHABLE_APP_2026_02_14.md) — Option B: sim in main process (runScenario / turn advance in-process).
- [TACTICAL_MAP_SYSTEM.md](../../20_engineering/TACTICAL_MAP_SYSTEM.md) — map data, GameStateAdapter, `prepareNewGameState` / state loading.

**Entrypoints:**

- `src/desktop/electron-main.cjs` — add IPC for load-scenario, load-state-file, advance-turn; main must run TypeScript sim (e.g. bundled sim or tsx/compiled entry).
- `src/scenario/scenario_runner.ts` — `runScenario`, `createInitialGameState`; scenario loader for init.
- `src/ui/warroom/run_phase0_turn.ts`, `src/sim/run_phase_i_browser.ts`, `src/sim/run_phase_ii_browser.ts` — Phase 0/I/II turn advance (browser-safe; reuse from warroom).
- `src/ui/map/MapApp.ts`, `DataLoader.ts`, `GameStateAdapter.ts` — renderer: accept state from IPC and refresh control/formations/panels (e.g. existing "Load state" path or new IPC "game-state-updated").

**Verification:**

- After implementation: run packaged app (or `npm run desktop`); load a scenario or state file; advance week by week; confirm map and state update. One full scenario run from app should produce a replay that can be rewatched in the same app (Phase 2 rewatch).

---

## 4. Owner and Process QA

- **Owner:** Gameplay Programmer + UI/UX Developer (implementation). Technical Architect for main-process sim wiring if needed.
- **Process QA:** Invoke quality-assurance-process after Phase 3 implementation (context, ledger, determinism, commit discipline).

---

*Orchestrator continuation; handoff to dev for Phase 3 implementation.*
