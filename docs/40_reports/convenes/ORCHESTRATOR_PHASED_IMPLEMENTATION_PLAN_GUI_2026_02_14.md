# Phased implementation plan — Launchable GUI (play myself + rewatch)

**Date:** 2026-02-14  
**Owner:** PM (deputy) (T9)  
**Purpose:** Synthesize T1–T8 into a single priority and phased implementation plan. Plan only; handoff to dev when building starts. **Recommended stack:** Electron + electron-builder + tactical map + sim in main process (per T8).

---

## 1. Single priority

**Deliver one launchable application** (Windows first) that supports:
1. **Play myself** — Load a starting state (scenario or saved game); advance turns; see map and state update.
2. **Rewatch runs** — Load `replay_timeline.json`; play/pause/step through weeks.

**Non-goals for this phase:** Web-only deployment; war system (order-giving UI); full warroom polish (P0/P1 can follow in a later phase).

---

## 2. Phase sequence

### Phase 1: Packaging and shell (launchable exe)

- **Goal:** User can double-click an executable and see the tactical map (or a minimal shell that loads the map). No “play” or “rewatch” yet; prove packaging and data loading.
- **Tasks:**
  - Add Electron + electron-builder to the project; create main process entry (e.g. `src/desktop/main.js` or .ts) that opens a BrowserWindow and loads the built tactical map (file:// or custom protocol).
  - Add or extend Vite build for tactical map so it produces a static bundle loadable by Electron (no dev-server assumption for /data/).
  - Resolve map data path: bundle required `data/derived` files (or subset) in app resources, or copy to user data dir on first run; ensure map can load settlements_a1_viewer.geojson and political_control_data.json.
  - Configure electron-builder to produce a Windows exe (portable or installer). Test: run exe, map loads, base geography and control visible.
- **Output:** One executable that opens the map; map renders with baseline or bundled data. **Handoff checkpoint:** Dev runs exe on clean machine (or VM), confirms map loads.

### Phase 2: Rewatch in launchable app

- **Goal:** From the same app, user can “Load replay…” (file picker for replay_timeline.json), play/pause/step weeks. Same behavior as tactical map replay today.
- **Tasks:**
  - Ensure replay playback logic (existing in tactical map) works when loaded from file:// or from paths supplied by Electron (e.g. IPC “load replay” with path or content).
  - Add “Load replay…” (and optionally “Open last run” if we persist last run dir) in the app UI. Wire to existing replay timeline parser and frame stepper.
  - Test with a replay_timeline.json produced by `npm run sim:scenario:run -- --video`.
- **Output:** User can open app → Load replay → select file → play. **Handoff checkpoint:** Rewatch works from packaged app.

### Phase 3: Play myself (load start, advance turn)

- **Goal:** User can load a scenario or saved state and advance turns; map and state update after each advance. Sim runs in Electron main process (same code as runScenario / browser turn runners).
- **Tasks:**
  - Expose “New game” / “Load scenario” / “Load state file” from UI. Main process: load scenario JSON or state JSON; run init or use as initial state; write or keep state in memory.
  - Expose “Advance turn” (or “Next week”). Main process calls existing Phase 0 / Phase I / Phase II browser-safe turn runner; updates state; optionally writes intermediate saves to user data dir; sends new state (or path) to renderer. Renderer refreshes map and panels from new state.
  - Optional: “Run to end” (full runScenario) for scenarios; show progress; when done, offer “Rewatch” with generated replay_timeline. Requires main to run runScenario with emitWeeklySavesForVideo and return paths to renderer.
  - Determinism: no new randomness or timestamps; use same pipeline and ordering as today.
- **Output:** User can start from scenario or save, advance week by week, see map and state update. **Handoff checkpoint:** Play myself flow works; one full scenario run from app produces replay that can be rewatched in same app.

### Phase 4 (optional): Polish and P0 backlog

- **Goal:** Apply P0 items from gui_improvements_backlog where they apply to the launchable app (e.g. placeholder labels, phase/turn always visible). If warroom is integrated later, WR-1–WR-6 apply there.
- **Tasks:** Per backlog; low risk, mechanics-neutral. Can be interleaved or done after Phase 3.

---

## 3. Dependencies and order

- Phase 1 is prerequisite for Phase 2 and 3 (no rewatch or play without a launchable app).
- Phase 2 can be done before or in parallel with Phase 3 (rewatch does not depend on “advance turn” in app; only on replay file).
- Phase 3 depends on Phase 1 (main process must load map and have IPC); can share Phase 2 work (state/replay loading paths).

**Recommended order:** 1 → 2 → 3 → 4 (optional).

---

## 4. Handoff to dev (when implementation starts)

- **Scope:** Implement Phases 1–3 (and optionally 4) per this plan. Use **Electron + electron-builder** and **tactical map + sim in main** as the chosen stack (T8). Do not change canon or sim determinism.
- **Inputs:** All convene memos (T1–T8): scope (T1), convene note (T2), GUI state and gaps (T3), runner/replay options (T4), canon checklist (T5), backlog priority (T6), architecture options (T7), tool recommendation and list (T8). This phased plan (T9).
- **Entrypoints:** `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`, `src/scenario/scenario_runner.ts` (runScenario), `src/ui/warroom/run_phase0_turn.ts` and Phase I/II browser runners, `tools/scenario_runner/run_scenario.ts` (CLI reference).
- **Verification:** After each phase, run packaged app (or dev Electron); confirm play and/or rewatch as specified. Process QA (T10) after planning phase is complete; before merge, run project test suite and determinism checks per context/napkin.

---

## 5. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Map data path wrong in packaged app | Define single strategy (extraResources vs userData copy) and document; test on clean install. |
| runScenario long-running blocks UI | Run in main process; consider progress IPC (e.g. “week 12/52”) so renderer can show progress; optional “Cancel” in future. |
| Determinism regression | No new randomness or timestamps; reuse existing pipeline; run hash comparison test after changes. |

---

*T9 deliverable; handoff to dev for implementation. Process QA (T10) validates planning phase.*
