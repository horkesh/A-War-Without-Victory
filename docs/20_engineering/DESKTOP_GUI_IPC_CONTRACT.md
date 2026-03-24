# Desktop GUI IPC Contract

## Scope

This document defines the Electron main <-> renderer IPC used by the desktop app (warroom-first launcher flow). The tactical map is embedded as an iframe in the warroom window (same-origin, `awwv://warroom/tactical-map/...`), not a separate `BrowserWindow`. **Map assets (PMTiles, style, GeoJSON, Load run):** MapLibre blob workers do not work under `awwv://`; the main process starts a local HTTP server (127.0.0.1, random port) and exposes `getMapServerUrl` via preload. The map and warroom load map data from `http://127.0.0.1:<port>/data/source/...` and `/data/runs/<id>/final_save.json`. See [TACTICAL_MAP_SYSTEM.md](TACTICAL_MAP_SYSTEM.md) §0 and [20260303_MAP_RUNTIME_CONTRACT_FIXES.md](../40_reports/implemented/20260303_MAP_RUNTIME_CONTRACT_FIXES.md).

- Main process: `src/desktop/electron-main.cjs`
- Preload bridge: `src/desktop/preload.cjs`
- Renderer consumers: `src/ui/warroom/warroom.ts`, `src/ui/map/MapApp.ts` (via embedded iframe)
- Sim adapter: `src/desktop/desktop_sim.ts`

**State contract (front assignment and theatres):** The same serialized `GameState` is pushed to all renderers via `game-state-updated`. It includes `front_edges`, `assignable_front_segments`, `brigade_front_assignment`, `theatres`, `army_theatre_assignment`, and `military.campaign_plans` (read-only; CampaignPlan objects produced by Army HQ Gathering — see `army_hq_gathering.ts`). The 2D tactical map and 3D operational map both read these from the same payload; see [TACTICAL_MAP_SYSTEM.md](TACTICAL_MAP_SYSTEM.md) §10.4 for single-source and verification.

**Derived adapter fields (not IPC channels):** `GameStateAdapter.ts` derives additional view-model fields from the raw `GameState` payload. Notable: `sectorIntel` (`SectorIntelRecordView[]`) — derived from `state.sector_intel` and `state.military.corps_front_sectors` in a single merged pass (also produces `fogOfWar`). Exposes 11 fields per enemy sector: sector ID, faction, corps, strength category, posture, offensive_signs, confidence, visible brigades, friendly OSIDs, enemy OSIDs, assessed turn. Consumed by Army HQ intelligence panels (ThreatAssessment, ForceReadiness, SupplyIntelligence) and corps card threat badges. No IPC round-trip — entirely client-side derivation from the `game-state-updated` payload.

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
  - Behavior: advances exactly one turn on current in-memory state using phase-aware desktop sim (`peace` -> runPeaceTurn, `war` -> runTurn). If `phase0Directives` are provided, they are applied deterministically before peace-phase advance. Returns updated serialized state plus phase report metadata.

- `stage-attack-order` (invoke)
  - Payload: `{ brigadeId: string, targetSettlementId: string }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: sets `state.brigade_attack_orders[brigadeId] = targetSettlementId`, reserializes, sends state via `game-state-updated`. The 3D operational warmap ATTACK mode and Selection panel use this via DesktopBridge `stageAttackOrder()`.

- `stage-posture-order` (invoke)
  - Payload: `{ brigadeId: string, posture: string }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: pushes or replaces entry in `state.brigade_posture_orders` for the brigade, reserializes, sends state via `game-state-updated`. The 3D operational warmap Selection panel and mode toolbar call this via DesktopBridge `stagePostureOrder()`.

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

- `assign-brigade-to-front` (invoke)
  - Payload: `{ brigadeId: string, frontId: string | null }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: validates brigade and front segment ID (`assignable_front_segments`), writes `state.brigade_front_assignment[brigadeId] = frontId` (`null` = reserve), reserializes, sends state via `game-state-updated`.

- `assign-brigade-to-sector` (invoke)
  - Payload: `{ brigadeId: string, sectorId: string | null }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: permanent player sector override. Validates same-corps constraint: sector `corps_id` must match brigade `corps_id`. Writes `state.military.brigade_sector_override[brigadeId] = sectorId`; `null` clears the override. Persists until explicitly cleared. `classifyBrigadesByTerritory` respects this override before its Phase 1 (frontline-by-position) logic. Invalid/stale overrides (wrong corps, brigade dissolved) fall through silently to normal assignment. Reserializes and broadcasts update. Source: `desktop_sim.ts::assignBrigadeToSector`.

- `rename-front-segment` (invoke)
  - Payload: `{ frontId: string, name: string | null }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: updates optional `name` on `state.assignable_front_segments[*]`; null/empty clears the name. Reserializes and broadcasts update.

- `rename-theatre` (invoke)
  - Payload: `{ theatreId: string, name: string | null }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: updates `state.theatres[theatreId].name`; null/empty restores default `<faction> Theatre`. Reserializes and broadcasts update.

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

- `stage-sector-stance-order` (invoke)
  - Payload: `{ corpsId: string, sectorId: string, stance: 'hold' | 'defend' | 'defend_at_all_costs' | 'elastic_defense' | 'counterattack' | 'dig_in' }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: stages sector-level defensive intent in `state.sector_stance_orders`; the live sim translates that intent into brigade posture orders during the war pipeline rather than mutating brigades directly in IPC.

- `stage-logistics-priority` (invoke)
  - Payload: `{ corpsId: string, priority: 'balanced' | 'sustain_operations' | 'frontline_reserve' | 'emergency_recovery' }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: stages corps logistics priority in `state.corps_command[corpsId]`, reserializes, and broadcasts the updated state.

- `stage-airdrop-allocation` (invoke)
  - Payload: `{ enclaveId: string, allocation: number }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: writes deterministic enclave airdrop allocation into `state.airdrop_allocation`, reserializes, and broadcasts the updated state for enclave/supply UI surfaces.

- `stage-convoy-decision` (invoke)
  - Payload: `{ convoyId: string, decision: 'allow' | 'block' | 'divert' }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: resolves one pending convoy choice in `state.pending_convoy_decisions`, reserializes, and broadcasts the updated state.

- `stage-municipality-support-order` (invoke)
  - Payload: `{ faction: 'RS' | 'RBiH' | 'HRHB', munId: string, type: 'weapons_shipment' | 'staff_priority' | 'croatian_support_package' }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: validates the selected municipality against the faction's militia pools, stages or replaces `state.municipality_support_orders[faction]`, reserializes, and broadcasts the updated state. When `meta.player_faction` is present, only that faction may stage support.

- `stage-opsec-toggle` (invoke)
  - Payload: `{ sectorId: string, enabled: boolean }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: adds or removes the sector from `state.opsec_sectors`, reserializes, and broadcasts the updated state. OPSEC affects sector-intel buildup; it is not a direct combat modifier.

- `stage-corps-front-order` (invoke)
    - Payload: `{ corpsId: string, edgeIds: string[] }`
    - Returns: `{ ok: boolean, error?: string }`
    - Behavior: validates and normalizes front edge IDs for the corps (`A__B` sorted), writes `state.corps_front_edges[corpsId] = sortedUnique(edgeIds)`, reserializes, sends state via `game-state-updated`.

- `stage-corps-attack-axis-order` (invoke)
    - Payload: `{ corpsId: string, edgeIds: string[] }`
    - Returns: `{ ok: boolean, error?: string }`
    - Behavior: validates and normalizes edge IDs, writes `state.corps_attack_axis_orders[corpsId] = { edge_ids: sortedUnique(edgeIds), created_turn }`, reserializes, sends state via `game-state-updated`.

- `stage-og-subfront-order` (invoke)
    - Payload: `{ ogId: string, corpsId: string, edgeIds: string[] }`
    - Returns: `{ ok: boolean, error?: string }`
    - Behavior: validates OG/corps linkage and edge subset intent, writes `state.og_subfront_edges[ogId] = sortedUnique(edgeIds)` (derived against corps front in main), reserializes, sends state via `game-state-updated`.

- `assign-commander` (invoke)
    - Payload: `{ officerId: string, corpsId: string }`
    - Returns: `{ ok: boolean, error?: string, stateJson?: string }`
    - Behavior: validates officer exists in pool and corps exists. Sets `officer.assignment = corpsId`, `officer.status = "active"`. If a previous commander existed, they return to the pool. Reserializes, sends update.

- `query-operation-prediction` (invoke) — **READ-ONLY**
    - Payload: `OperationPredictionRequest` — `{ corpsId: string, axes: Array<{ axisId, brigadeIds[], objectiveOsids[], stagingOsid? }>, tempo: 'methodical' | 'standard' | 'all_out', artilleryPreparation: boolean, commanderOfficerId?: string }`
    - Returns: `{ ok: boolean, data?: OperationPredictionResponse, error?: string }`
    - Behavior: read-only prediction query for the ops planning G-2 panel. Deserializes state, loads OSID adjacency + terrain cache (module-level cached), calls `computeOperationPrediction()` which runs `predictCombatOutcome()` per axis using the full combat predictor (terrain, entrenchment, fatigue, concentration, urban defense, etc.). Returns per-axis predicted outcomes, force ratios, estimated casualties, terrain/entrenchment classification, plus personality-driven commander assessment text. Does NOT mutate state or call `sendGameStateToRenderer()`. Debounced at 300ms on the UI side. Consumer: OpsPlanningModal → G2BriefingPanel (`src/ui/map/components/plan_ui/G2BriefingPanel.tsx`). Engine: `src/sim/combat/operation_prediction.ts`.

- `stage-corps-operation-order` (invoke)
    - Payload: `CorpsOperationOrderPayload` — `{ corpsId: string, name: string, type: 'sector_attack' | 'general_offensive' | 'feint' | 'probe', targetSettlements: string[], participatingBrigades: string[], sectorId?: string, objectives?: string[], planningDuration?: number, stagingOsid?: string, minAttackOutcome?: string, tempo?: 'methodical' | 'standard' | 'all_out', schwerpunktOsid?: string, artilleryPreparation?: boolean, axes?: Array<{ axis_id, name, assigned_brigades, objectives, staging_osid?, current_objective_index, status, ... }> }`
    - Returns: `{ ok: boolean, error?: string }`
    - Behavior: creates a `CorpsOperation` on `state.corps_operations` for the given corps. If `axes` array provided, creates multi-axis operation with per-axis brigade assignment, objective chains, and optional staging OSIDs. Single-axis operations omit the `axes` field and use top-level `objectives`/`participatingBrigades`. Validates corps exists, at least one brigade, at least one objective. Sets operation status to `planning`, reserializes, sends state via `game-state-updated`. Consumer: OpsPlanningModal (`src/ui/map/components/OpsPlanningModal.tsx`). Operation name pre-generated from faction `OPERATION_NAMES` pools via `simpleHash(corps_id)` — user can override.

- `stage-assign-operation-commander` (invoke)
    - Payload: `{ corpsId: string, operationName: string, officerId: string }`
    - Returns: `{ ok: boolean, error?: string }`
    - Behavior: assigns a named officer as commander for a specific operation. Sets `op.commander_officer_id` on the matching `CorpsOperation`, updates the officer's `assigned_operation` and `assigned_corps_id` in `state.named_officers`. Triggered from CommanderSelectionModal after player drafts a directive. Reserializes, sends state via `game-state-updated`.

- `stage-operation-decision` (invoke)
    - Payload: `{ corpsId: string, operationName: string, decision: 'launch' | 'postpone' | 'abort' | 'probe' }`
    - Returns: `{ ok: boolean, error?: string }`
    - Behavior: player decision during Operation Briefing. `launch` sets `force_launch=true` on the operation; `postpone` increments `postponement_count`; `abort` sets `recovery_reason='commander_abort'`; `probe` creates `active_probe` on the operation. Triggered from OperationBriefingModal. Reserializes, sends state via `game-state-updated`.

- `approve-reserve-request` (invoke)
    - Payload: `{ corpsId: string, brigadeId: string }`
    - Returns: `{ ok: boolean, error?: string }`
    - Behavior: deploys `brigadeId` on loan to `corpsId`. Validates brigade has `elite_loan_state`, is not already on loan, and is in cooldown. Calls `deployEliteLoan` and removes the fulfilled request from `state.military.pending_reserve_requests`. Reserializes, sends state via `game-state-updated`. Triggered from ArmyReservePanel APPROVE button.

- `recall-elite-brigade` (invoke)
    - Payload: `{ brigadeId: string }`
    - Returns: `{ ok: boolean, error?: string }`
    - Behavior: recalls `brigadeId` from its current loan using reason `'player_recall'`. Validates brigade is currently on loan. Calls `recallEliteLoan`. Reserializes, sends state via `game-state-updated`. Triggered from ArmyReservePanel Recall button and FormationDetail Orders tab Recall button.

- `redirect-reserve-loan` (invoke)
    - Payload: `{ brigadeId: string, newCorpsId: string }`
    - Returns: `{ ok: boolean, error?: string }`
    - Behavior: recalls brigade from current corps and immediately re-deploys to `newCorpsId`. Validates both corps exist and brigade is currently on loan. Reserializes, sends state via `game-state-updated`. (IPC wired; UI redirect button not yet implemented.)

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
  - Returns: `{ ok: boolean, error?: string, report?: SupplyPathsQueryResult }`. Report includes reachability (factions, reachable_controlled, isolated_controlled), optional `supply_state` (per-faction adequate_count, strained_count, critical_count), and optional `corridors` (Open/Brittle/Cut per faction). See desktop_sim.querySupplyPaths.
  - Behavior: computes current supply reachability, supply state derivation, and corridor derivation from canonical state and adjacency. Read-only. Used by 3D map supply mode and supply summary panel.

- `query-corps-sectors` (invoke)
  - Payload: none
  - Returns: `{ ok: boolean, error?: string, sectors?: Array<{ corps_id, faction, brigade_ids, settlement_ids }> }`
  - Behavior: derives deterministic corps-sector partition via multi-source BFS from corps HQs through friendly-controlled OSIDs. Sectors split by opposing faction and capped at MAX_SECTOR_EDGES=25 / MAX_SECTOR_BRIGADES=8. Interior brigades assigned as reserves via BFS; exempt corps (general staff, HVO Central Bosnia) excluded. Each sector includes sub-segments (connected components of front edges), assigned/reserve brigade lists, density, and threat metrics. Read-only.

- `set-ai-commander-config` (invoke)
  - Payload: `{ mode: string, anthropic_api_key?: string }`
  - Returns: `{ ok: boolean, error?: string }`
  - Behavior: stores AI commander config on `state.meta.ai_commander_config`, preserving `session_cost_estimate`. Validates mode is string. Broadcasts state. v0.4.9.

- `get-ai-commander-config` (invoke)
  - Payload: none
  - Returns: `{ mode: string, session_cost_estimate: number, anthropic_api_key?: string }` or default `{ mode: 'cadet', session_cost_estimate: 0 }`
  - Behavior: returns current AI commander config from state. Read-only. v0.4.9.

- `get-advisor-recommendation` (invoke)
  - Payload: `{ faction?: string, context_type?: 'situation_analysis' | 'operation_planning' | 'peace_plan' }`
  - Returns: `AdvisorResponse | { error: string }`
  - Behavior: guards cadet mode (returns error). Lazy-imports `createAiClient` + `getAdvisorRecommendation` from `src/sim/ai_commander/`. Defaults faction to `player_faction`, context_type to `situation_analysis`. Async API call. v0.4.9.

- `query-battle-events` (invoke)
  - Payload: none
  - Returns: `{ ok: boolean, error?: string, turn?: number, events?: Array<{ turn, settlement_id, from, to, mechanism, mun_id }> }`
  - Behavior: returns normalized and stable-sorted battle/control events for replay markers. Read-only.

- `game-state-updated` (event)
  - Payload: `stateJson: string`
  - Behavior: pushed from main process whenever scenario/state load, order staging, recruitment, or turn advance mutates current desktop state. Broadcast to warroom and tactical-map renderers.

- `turn-report-updated` (event)
  - Payload: `report: { phase: string, turn: number, details?: { officer_succession?: ... } | unknown }`
  - Behavior: sent from main process after each successful advance-turn (same report object returned by advance-turn). Both warroom and tactical-map renderers receive it; used for officer succession UI (FormationDetail, FactionOverviewPanel).

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
- Turn execution remains in deterministic phase runners (`run_peace_browser`, `run_combat_browser`).
- IPC reports are metadata only and do not affect game-state evolution.
