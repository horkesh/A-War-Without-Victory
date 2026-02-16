# New Game Side Picker and April 1992 Start — Implementation Report

**Date:** 2026-02-14  
**Scope:** Desktop GUI — New Campaign flow, side selection, fixed April 1992 scenario, `meta.player_faction`, recruitment state injection.

---

## 1. What was implemented

- **New Campaign** in the desktop app no longer opens a scenario file picker. Instead it shows a **side-selection overlay** with three options (RBiH, RS, HRHB), each with a faction flag and label.
- Choosing a side invokes the **`start-new-campaign`** IPC with `playerFaction`. The main process loads the fixed scenario `data/scenarios/apr1992_historical_52w.json` (April 1992, full OOB, ethnic_1991, Phase II), sets **`state.meta.player_faction`**, and **injects `recruitment_state`** (capital/equipment from apr1992_phase_ii_4w) so the toolbar and Recruitment modal work. State is serialized and sent to the renderer via `game-state-updated`.
- **LoadedGameState** exposes **`player_faction`** from `state.meta.player_faction` for future UI use (e.g. player-side highlighting).
- In the **browser** (no desktop IPC), New Campaign still triggers "Load scenario…" (file picker).

---

## 2. Canon and engineering docs

| Document | Update |
|----------|--------|
| **DESKTOP_GUI_IPC_CONTRACT.md** | New channel `start-new-campaign` (payload, return shape, behavior). |
| **GUI_DESIGN_BLUEPRINT.md** | §19.2 New Campaign (desktop): side picker, flags, fixed scenario, capital source. §19.3 Scenario Selection for file-picker path. |
| **TACTICAL_MAP_SYSTEM.md** | §2 Desktop bullet (New Game); §13.6 Main menu / side picker; §14.2 GameStateAdapter `player_faction`; §21 IPC and New Game; Appendix LoadedGameState `player_faction`. |
| **GUI_PLAYBOOK_DESKTOP.md** | Step 2: New Campaign → side picker → April 1992 load; Load Save / Load Replay unchanged. |
| **Systems_Manual_v0_5_0.md** | Implementation-note: New Game flow (side picker, fixed scenario, `meta.player_faction`) specified in DESKTOP_GUI_IPC_CONTRACT and GUI_DESIGN_BLUEPRINT §19.2. |
| **context.md** | Implementation reference: New Game side picker, `meta.player_faction` non-normative. |
| **CONSOLIDATED_IMPLEMENTED.md** | §7 Launchable desktop: row for New Game side picker with link to this report. |
| **docs_index.md** | DESKTOP_GUI_IPC_CONTRACT line: mention start-new-campaign / New Game. |

---

## 3. Files touched

- **State:** `src/state/game_state.ts` — `StateMeta.player_faction?: FactionId`
- **Desktop:** `src/desktop/desktop_sim.ts` — `NEW_GAME_SCENARIO_RELATIVE`, `NEW_GAME_RECRUITMENT_CAPITAL` / `NEW_GAME_EQUIPMENT_POINTS`, `startNewCampaign(baseDir, playerFaction)`; `src/desktop/electron-main.cjs` — `start-new-campaign` handler; `src/desktop/preload.cjs` — `startNewCampaign(payload)`
- **UI:** `src/ui/map/MapApp.ts` — awwvDesktop hoisted; New Campaign → side picker; side-picker overlay and option handlers; `src/ui/map/tactical_map.html` — side-picker overlay markup; `src/ui/map/styles/tactical-map.css` — `.tm-side-picker-*` styles
- **Adapter:** `src/ui/map/types.ts` — `LoadedGameState.player_faction`; `src/ui/map/data/GameStateAdapter.ts` — extract `player_faction` from `meta`
- **Tests:** `tests/ui_map_game_state_adapter.test.ts` — test that `parseGameState` preserves `meta.player_faction`
- **Ledger:** `docs/PROJECT_LEDGER.md` — 2026-02-14 entry

---

## 4. Determinism

- Faction list for recruitment injection: sorted (`factionIds` from `state.factions`).
- Resource maps use fixed constants; no timestamps or randomness.
- Serialization already includes `meta`; `player_faction` is a normal field.

---

## 5. References

- Plan: New Game side picker + April 1992 start (orchestrator plan).
- Scenario: `data/scenarios/apr1992_historical_52w.json`; capital/equipment from `apr1992_phase_ii_4w.json`.
- Flags: `assets/sources/crests/` — `flag_RBiH.png`, `flag_RS.png`, `flag_HRHB.png` (see README there).
