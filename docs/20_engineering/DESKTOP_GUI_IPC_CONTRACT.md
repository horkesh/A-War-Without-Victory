# Desktop GUI IPC Contract

## Scope

This document defines the Electron main <-> renderer IPC used by the desktop app (warroom-first launcher flow). The tactical map is embedded as an iframe in the warroom window (same-origin, `awwv://warroom/tactical-map/...`), not a separate `BrowserWindow`.

- Main process: `src/desktop/electron-main.cjs`
- Preload bridge: `src/desktop/preload.cjs`
- Renderer consumers: `src/ui/warroom/warroom.ts`, `src/ui/map/MapApp.ts` (via embedded iframe)
- Sim adapter: `src/desktop/desktop_sim.ts`

## Channels

- `load-scenario-dialog` (invoke)
  - Returns: `{ ok: boolean, error?: string, stateJson?: string }`
  - Behavior: opens scenario file picker, builds initial state via `loadScenarioFromPath()`.

- `start-new-campaign` (invoke)
  - Payload: `{ playerFaction: 'RBiH' | 'RS' | 'HRHB', scenarioKey?: 'sep_1991' | 'apr_1992' }`
  - Returns: `{ ok: boolean, error?: string, stateJson?: string }`
  - Behavior: loads scenario by key (`sep_1991` -> `data/scenarios/sep_1991_phase0.json`, `apr_1992` -> `data/scenarios/apr1992_definitive_52w.json`), sets `meta.player_faction`, and serializes + pushes state via `game-state-updated`. For April 1992 starts, recruitment_state is initialized for recruitment UI. Called by warroom launcher and tactical-map side picker.

- `load-state-dialog` (invoke)
  - Returns: `{ ok: boolean, error?: string, stateJson?: string }`
  - Behavior: opens state file picker, loads serialized GameState via `loadStateFromPath()`.

- `advance-turn` (invoke)
  - Payload (optional): `{ phase0Directives?: Array<{ id, factionId, investmentType, scope, targetMunIds }> }`
  - Returns: `{ ok: boolean, error?: string, stateJson?: string, report?: { phase: string, turn: number, details?: unknown } | null }`
  - Behavior: advances exactly one turn on current in-memory state using phase-aware desktop sim (`phase_0` -> runPhase0TurnAndAdvance, `phase_i` -> runPhaseITurn, `phase_ii` -> runTurn). If `phase0Directives` are provided, they are applied deterministically before Phase 0 advance. Returns updated serialized state plus phase report metadata.

- `stage-attack-order` (invoke)
  - Payload: `{ brigadeId: string, targetSettlementId: string }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: sets `state.brigade_attack_orders[brigadeId] = targetSettlementId`, reserializes, sends state via `game-state-updated`.

- `stage-posture-order` (invoke)
  - Payload: `{ brigadeId: string, posture: string }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: pushes or replaces entry in `state.brigade_posture_orders` for the brigade, reserializes, sends state via `game-state-updated`.

- `stage-move-order` (invoke)
  - Payload: `{ brigadeId: string, targetMunicipalityId: string }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: sets `state.brigade_mun_orders[brigadeId] = [targetMunicipalityId]`, reserializes, sends state via `game-state-updated`.

- `stage-deploy-order` (invoke)
  - Payload: `{ brigadeId: string }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: stages deploy posture transition by setting `state.brigade_deploy_orders[brigadeId] = "deploy"`, reserializes, sends state via `game-state-updated`.

- `stage-undeploy-order` (invoke)
  - Payload: `{ brigadeId: string }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: stages undeploy posture transition by setting `state.brigade_deploy_orders[brigadeId] = "undeploy"`, reserializes, sends state via `game-state-updated`.

- `stage-brigade-aor-order` (invoke)
  - Payload: `{ settlementId: string, fromBrigadeId: string, toBrigadeId: string }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: validates the AoR reshape order (same-faction, contiguity, adjacency) via settlement graph in main; if valid, appends `{ settlement_id, from_brigade, to_brigade }` to `state.brigade_aor_orders`, reserializes, sends state via `game-state-updated`. If invalid, returns `{ ok: false, error }` and does not mutate state.

- `stage-brigade-movement-order` (invoke) — Phase K
  - Payload: `{ brigadeId: string, targetSettlementIds: string[] }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: validates settlement-level movement order in main process (1–4 contiguous settlements, all same-faction, and reachable from current brigade position through friendly-only path traversal). If valid, sets `state.brigade_movement_orders[brigadeId] = { destination_sids: sorted targetSettlementIds }`, clears `brigade_mun_orders[brigadeId]`, reserializes, sends state via `game-state-updated`. If invalid, returns `{ ok: false, error }` and does not mutate state.

- `stage-brigade-reposition-order` (invoke)
  - Payload: `{ brigadeId: string, settlementIds: string[] }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: validates reposition order in main process (1–4 contiguous settlements, all same-faction). If valid, sets `state.brigade_reposition_orders[brigadeId] = { settlement_ids: sorted settlementIds }`, reserializes, sends state via `game-state-updated`. If invalid, returns `{ ok: false, error }` and does not mutate state.

- `clear-orders` (invoke)
  - Payload: `{ brigadeId: string }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: removes brigade from `brigade_attack_orders`, `brigade_posture_orders`, `brigade_mun_orders`, `brigade_movement_orders`, `brigade_reposition_orders`, and `brigade_deploy_orders`; also removes any entries in `brigade_aor_orders` where `from_brigade === brigadeId` or `to_brigade === brigadeId`. Reserializes, sends state via `game-state-updated`.

- `stage-corps-stance-order` (invoke)
  - Payload: `{ corpsId: string, stance: string }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: sets or updates corps stance (e.g. defensive/balanced/offensive/reorganize) in state (corps_command), reserializes, sends state via `game-state-updated`.

### Read-only query channels (no state mutation)

- `query-movement-range` (invoke)
  - Payload: `{ brigadeId: string }`
  - Returns: `{ ok: boolean, error?: string, start_sid?: string | null, reachable_deployed?: string[], reachable_column?: string[] }`
  - Behavior: computes deterministic movement range preview for a brigade (deployed/combat vs column stance) from current state + graph + terrain. Does not mutate state and does not emit `game-state-updated`.

- `query-movement-path` (invoke)
  - Payload: `{ brigadeId: string, destinationSid: string }`
  - Returns: `{ ok: boolean, error?: string, path?: string[], eta_turns?: number, terrain_costs?: number[] }`
  - Behavior: computes deterministic friendly-path preview and ETA to destination settlement. Read-only.

- `query-combat-estimate` (invoke)
  - Payload: `{ brigadeId: string, targetSettlementId: string }`
  - Returns: `{ ok: boolean, error?: string, expected_loss_fraction?: number, win_probability?: number, power_ratio?: number }`
  - Behavior: reads deterministic attack estimate (`combat_estimate`) for UI preview. Read-only.

- `query-supply-paths` (invoke)
  - Payload: none
  - Returns: `{ ok: boolean, error?: string, report?: SupplyReachabilityReport }`
  - Behavior: computes current supply reachability report from canonical state and adjacency. Read-only.

- `query-corps-sectors` (invoke)
  - Payload: none
  - Returns: `{ ok: boolean, error?: string, sectors?: Array<{ corps_id, faction, brigade_ids, settlement_ids }> }`
  - Behavior: derives deterministic corps-sector settlement coverage from brigade AoR ownership and corps assignment. Read-only.

- `query-battle-events` (invoke)
  - Payload: none
  - Returns: `{ ok: boolean, error?: string, turn?: number, events?: Array<{ turn, settlement_id, from, to, mechanism, mun_id }> }`
  - Behavior: returns normalized and stable-sorted battle/control events for replay markers. Read-only.

- `game-state-updated` (event)
  - Payload: `stateJson: string`
  - Behavior: pushed from main process whenever scenario/state load, order staging, recruitment, or turn advance mutates current desktop state. Broadcast to warroom and tactical-map renderers.

- `get-current-game-state` (invoke)
  - Returns: `string | null`
  - Behavior: returns current serialized GameState held by main process; used by warroom at startup.

- `open-tactical-map-window` (invoke)
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: opens/focuses a secondary BrowserWindow at `awwv://app/map_operational_3d.html` (primary 3D tactical map companion window).

- `get-recruitment-catalog` (invoke)
  - Returns: `{ brigades: Array<{ id, faction, name, home_mun, manpower_cost, capital_cost, default_equipment_class, available_from, mandatory }>, error?: string }`
  - Behavior: loads OOB brigade catalog from baseDir for recruitment UI; used when opening Recruitment modal.

- `apply-recruitment` (invoke)
  - Payload: `{ brigadeId: string, equipmentClass: string }`
  - Returns: `{ ok: boolean, error?: string, stateJson?: string, newFormationId?: string }`
  - Behavior: applies one player recruitment (recruitBrigade + applyRecruitment); on success main updates current state and sends via `game-state-updated`; returns updated stateJson and newFormationId for placement feedback.

- `load-replay-dialog` / `get-last-replay` / `replay-loaded`
  - Existing replay ingestion channels unchanged; renderer treats replay as read-only timeline data.

## Protocol Routes (awwv:// scheme)

The `awwv` custom protocol is registered as standard+privileged with `supportFetchAPI: true`. Routes:

| Route | Serves from | Purpose |
|-------|------------|---------|
| `awwv://warroom/index.html` | `dist/warroom/` | Main warroom renderer (default window load) |
| `awwv://warroom/data/derived/*` | `data/derived/` | Derived map/control data |
| `awwv://warroom/data/source/*` | `data/source/` | Source data files |
| `awwv://warroom/assets/*` | `assets/` | Crests, flags, scenario images |
| `awwv://warroom/tactical-map/*` | `dist/tactical-map/` | Tactical map files under warroom origin (same-origin for iframe) |
| `awwv://app/*` | `dist/tactical-map/` | Standalone tactical map (legacy, still available from Electron menu) |
| `awwv://app/data/derived/*` | `data/derived/` | Map data for standalone mode |

**Note:** The `awwv://warroom/tactical-map/*` route exists so the tactical map iframe is same-origin with the warroom and can inherit `window.parent.awwv` for IPC bridge access. See [TACTICAL_MAP_SYSTEM.md](TACTICAL_MAP_SYSTEM.md) §21.1.

## Determinism Notes

- UI does not mutate canonical sim ordering.
- Turn execution remains in deterministic phase runners (`run_phase_0`, `run_phase_i_browser`, `run_phase_ii_browser`).
- IPC reports are metadata only and do not affect game-state evolution.
