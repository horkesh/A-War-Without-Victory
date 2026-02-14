# GUI state and gaps memo (warroom + tactical map)

**Date:** 2026-02-14  
**Owner:** UI/UX Developer + Technical Architect (T3)  
**Purpose:** Short summary of what works today and what is missing for a launchable “play myself + rewatch” GUI.

---

## 1. Warroom (`src/ui/warroom/`)

**What works:**
- Command HQ scene: wall, desk, calendar, crests, clickable regions (newspaper, magazine, reports, ticker, red phone, advance turn, wall map).
- **Advance turn:** Phase 0, Phase I, and Phase II browser-safe turn advancement via `ClickableRegionManager.advanceTurn()`. Uses `runPhase0TurnAndAdvance`, Phase I/II browser runners; updates `gameState` in memory and refreshes map.
- **Map scene (War Planning Map):** Loads base geography (GeoJSON) and political control from `/data/derived/political_control_data.json` or from `gameState.political_controllers` after load/advance. Turn/date display; settlement click → SettlementInfoPanel (settlement/municipality/side info). Contested hatch when control_status available.
- **Data source for map:** Initial control from `political_control_data.json` or `settlements_initial_master.json`; after advance, `WarPlanningMap.driveControlFromGameState(state)` updates map from `state.political_controllers`.
- Build: `npm run warroom:build` produces Vite build + staged assets; `npm run dev:warroom` serves on port 3000.

**Gaps / stub / placeholder:**
- No scenario load from UI (warroom starts with fixed Phase 0 / Sep 1991-style state built in code).
- No “load saved game” or “pick scenario” in warroom; no integration with scenario runner or `replay_timeline.json`.
- Diplomacy (red phone): disabled or placeholder “Phase II+”.
- Faction overview / newspaper / magazine / reports: placeholder or static content per gui_improvements_backlog.
- **Not launchable:** Dev server only; no packaged desktop executable.

---

## 2. Tactical map (`src/ui/map/`)

**What works:**
- Standalone map app: base geography, political control layer, front lines, labels, formation markers, brigade AoR highlight, settlement panel (4 tabs), brigade panel, OOB sidebar, search, minimap, ethnic 1991 mode.
- **Load state:** “Latest run” (fetches `data/derived/latest_run_final_save.json`), “Load State…” (file picker for any `final_save.json`). GameStateAdapter parses state → control lookups, formations, militia pools, brigade_aor.
- **Replay:** “Load Replay…” loads `replay_timeline.json`; play/pause/step week-by-week; control events and formation positions per frame. Export replay (WebM) via MediaRecorder.
- **Data:** Requires `settlements_a1_viewer.geojson`, `political_control_data.json`; optional A1_BASE_MAP, settlement_edges, mun1990_names, ethnicity, etc. Served by Vite plugin from project root `/data/`.
- Dev: `npm run dev:map` → port 3001; open `tactical_map.html`.

**Gaps (from TACTICAL_MAP_SYSTEM §20 and napkin):**
- **No production build script:** No dedicated `build:map`; dev server only. No packaged exe.
- **Run from repo root:** Dev server resolves `/data/` from `process.cwd()`; running from another directory breaks “Latest run” and data loads.
- Synchronous file serving (readFileSync) for large GeoJSON; blocks event loop.
- ADMIN tab: some municipality names show as numeric IDs (key format mismatch).
- CTRL tab: stability score placeholder.
- OOB: no filter/sort UI. Shared border gaps ~8% edges (no front line segment).
- **No “play myself” flow:** Tactical map is view-only (load state / replay). It does not advance turns or run the sim; it only displays state produced elsewhere (CLI or future launchable app).

---

## 3. Scenario execution (CLI only)

- Runs via `npm run sim:scenario:run -- --scenario <path> [--video] [--map] --out runs`. No UI triggers a run.
- `--map` copies final state to `data/derived/latest_run_final_save.json` so tactical map “Latest run” can show it.
- Replay artifacts: `replay_timeline.json`, `save_w1.json` … `save_wN.json` in run directory when `--video` is set.

---

## 4. Summary for launchable “play myself + rewatch”

| Need | Warroom | Tactical map | Gap |
|------|---------|--------------|-----|
| Launchable (one exe) | No | No | Both dev-server only; no packaging. |
| Play myself (load start, advance turn) | Partial (advance turn works; no scenario load) | No (view only) | Warroom has no “load scenario” or “load saved game”; tactical map doesn’t advance. |
| Rewatch (replay timeline) | No | Yes | Only tactical map; requires dev server and repo root. |
| Single app | — | — | Two separate UIs; no unified launchable app. |

**Conclusion:** Current state supports rewatch only in the tactical map (dev server). Play-myself exists only in warroom (advance turn) but without scenario/save load and without packaging. Delivering “play myself + rewatch” in one launchable app requires tool choice (T8), packaging, and either unifying the two UIs or having one host the other (e.g. launchable shell around tactical map + run/advance from same process or subprocess).

---

*T3 deliverable; feeds T9 phased plan.*
