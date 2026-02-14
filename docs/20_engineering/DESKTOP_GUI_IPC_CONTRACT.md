# Desktop GUI IPC Contract

## Scope

This document defines the Electron main <-> renderer IPC used by the tactical-map desktop app.

- Main process: `src/desktop/electron-main.cjs`
- Preload bridge: `src/desktop/preload.cjs`
- Renderer consumer: `src/ui/map/MapApp.ts`
- Sim adapter: `src/desktop/desktop_sim.ts`

## Channels

- `load-scenario-dialog` (invoke)
  - Returns: `{ ok: boolean, error?: string, stateJson?: string }`
  - Behavior: opens scenario file picker, builds initial state via `loadScenarioFromPath()`.

- `start-new-campaign` (invoke)
  - Payload: `{ playerFaction: 'RBiH' | 'RS' | 'HRHB' }`
  - Returns: `{ ok: boolean, error?: string, stateJson?: string }`
  - Behavior: loads fixed April 1992 scenario (`data/scenarios/apr1992_historical_52w.json`), sets `meta.player_faction`, injects `recruitment_state` for desktop recruitment UI (capital/equipment from apr1992_phase_ii_4w), then serializes and sends state via `game-state-updated`. No file picker.

- `load-state-dialog` (invoke)
  - Returns: `{ ok: boolean, error?: string, stateJson?: string }`
  - Behavior: opens state file picker, loads serialized GameState via `loadStateFromPath()`.

- `advance-turn` (invoke)
  - Returns: `{ ok: boolean, error?: string, stateJson?: string, report?: { phase: string, turn: number, details?: unknown } | null }`
  - Behavior: advances exactly one turn on current in-memory state and returns updated serialized state plus phase report metadata.

- `game-state-updated` (event)
  - Payload: `stateJson: string`
  - Behavior: pushed from main process whenever scenario/state load or turn advance mutates current desktop state.

- `get-recruitment-catalog` (invoke)
  - Returns: `{ brigades: Array<{ id, faction, name, home_mun, manpower_cost, capital_cost, default_equipment_class, available_from, mandatory }>, error?: string }`
  - Behavior: loads OOB brigade catalog from baseDir for recruitment UI; used when opening Recruitment modal.

- `apply-recruitment` (invoke)
  - Payload: `{ brigadeId: string, equipmentClass: string }`
  - Returns: `{ ok: boolean, error?: string, stateJson?: string, newFormationId?: string }`
  - Behavior: applies one player recruitment (recruitBrigade + applyRecruitment); on success main updates current state and sends via `game-state-updated`; returns updated stateJson and newFormationId for placement feedback.

- `load-replay-dialog` / `get-last-replay` / `replay-loaded`
  - Existing replay ingestion channels unchanged; renderer treats replay as read-only timeline data.

## Determinism Notes

- UI does not mutate canonical sim ordering.
- Turn execution remains in deterministic phase runners (`run_phase_0`, `run_phase_i_browser`, `run_phase_ii_browser`).
- IPC reports are metadata only and do not affect game-state evolution.
