/**
 * Desktop (Electron main) sim API: load scenario/state, advance turn.
 * Used by electron-main.cjs via a CJS bundle. No browser/DOM deps; Node fs/path OK.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildAdjacencyMap } from '../map/adjacency_map.js';
import { loadSettlementGraph } from '../map/settlements.js';
import { loadTerrainScalars } from '../map/terrain_scalars_node.js';
import type { LoadedSettlementGraph } from '../map/settlements_parse.js';
import { loadMunicipalityHqSettlement, loadOobBrigades } from '../scenario/oob_loader.js';
import { buildSidToMunFromSettlements } from '../scenario/oob_early_war_entry.js';
import { createStateFromScenario } from '../scenario/scenario_runner.js';
import { shortestPathThroughFriendly } from '../sim/combat/brigade_movement.js';
import { buildAdjacencyFromEdges, isSettlementSetContiguous } from '../sim/combat/war_adjacency.js';
import { estimateAttackCost, type AttackEstimate } from '../sim/combat/combat_estimate.js';
import {
    applyCorpsFrontAutoDistributionForCorps,
    ensureDerivedCorpsFrontEdges,
} from '../sim/combat/corps_front_assign.js';
import { computeFrontWidthMetrics } from '../sim/combat/front_width_metrics.js';
import { applyRecruitment, initializeRecruitmentResources, recruitBrigade } from '../sim/recruitment_engine.js';
import { runTurn } from '../sim/turn_pipeline.js';
import {
    queryMovementPath as computeMovementPathQuery,
    queryMovementRange as computeMovementRangeQuery,
    type MovementPathQuery,
    type MovementRangeQuery,
} from '../sim/combat/brigade_movement_query.js';
import { computeSupplyReachability, type SupplyReachabilityReport } from '../state/supply_reachability.js';
import {
    deriveCorridors,
    deriveSupplyState,
    type CorridorDerivationReport,
    type SupplyStateDerivationReport
} from '../state/supply_state_derivation.js';
import type { FactionId, GameState } from '../state/game_state.js';
import type { EquipmentClass } from '../state/recruitment_types.js';
import { isValidEquipmentClass } from '../state/recruitment_types.js';
import { deserializeState, serializeState } from '../state/serialize.js';
import { strictCompare } from '../state/validateGameState.js';
import { deployEliteLoan, recallEliteLoan } from '../sim/combat/army_reserve_system.js';

function settlementGraphOptions(baseDir: string): { settlementsPath: string; edgesPath: string } {
    return {
        settlementsPath: join(baseDir, 'data/source/settlements_initial_master.json'),
        edgesPath: join(baseDir, 'data/derived/settlement_edges.json'),
    };
}

function terrainScalarsPath(baseDir: string): string {
    return join(baseDir, 'data/derived/terrain/settlements_terrain_scalars.json');
}

export interface DesktopSimAdvanceResult {
    state: GameState;
    error?: string;
    game_over?: boolean;
    outcome?: string;
    report?: {
        phase: string;
        turn: number;
        details?: unknown;
    };
}

/** Scenario file used for "New Game" (April 1992 definitive war start, hybrid_1992). */
export const NEW_GAME_SCENARIO_RELATIVE = 'data/scenarios/apr1992_definitive_52w.json';
export type DesktopScenarioKey = 'apr_1992';
const DEFAULT_DESKTOP_SCENARIO_KEY: DesktopScenarioKey = 'apr_1992';
const SCENARIO_KEY_TO_PATH: Record<DesktopScenarioKey, string> = {
    apr_1992: NEW_GAME_SCENARIO_RELATIVE,
};

/** April 1992 game start: initial recruitment capital and equipment for desktop recruitment UI (from apr1992_definitive_52w). */
const NEW_GAME_RECRUITMENT_CAPITAL: Record<string, number> = { HRHB: 300, RBiH: 400, RS: 600 };
const NEW_GAME_EQUIPMENT_POINTS: Record<string, number> = { HRHB: 350, RBiH: 100, RS: 800 };

/** Load a scenario file and return initial GameState. */
export async function loadScenarioFromPath(
    scenarioPath: string,
    baseDir: string
): Promise<{ state: GameState }> {
    const state = await createStateFromScenario(scenarioPath, baseDir);
    return { state };
}

/**
 * Start a new campaign: load April 1992 scenario, set player_faction, inject recruitment_state for desktop UI.
 * Deterministic: faction order and resource keys sorted.
 */
export async function startNewCampaign(
    baseDir: string,
    playerFaction: 'RBiH' | 'RS' | 'HRHB',
    scenarioKey: DesktopScenarioKey = DEFAULT_DESKTOP_SCENARIO_KEY
): Promise<{ state: GameState }> {
    const key = scenarioKey in SCENARIO_KEY_TO_PATH ? scenarioKey : DEFAULT_DESKTOP_SCENARIO_KEY;
    const scenarioPath = join(baseDir, SCENARIO_KEY_TO_PATH[key]);
    const state = await createStateFromScenario(scenarioPath, baseDir);

    const factionIds = (state.factions ?? []).map((f) => f.id).sort();
    if (factionIds.length === 0) {
        return { state };
    }

    if (key === 'apr_1992' && !state.military.recruitment_state) {
        state.military.recruitment_state = initializeRecruitmentResources(
            factionIds,
            NEW_GAME_RECRUITMENT_CAPITAL,
            NEW_GAME_EQUIPMENT_POINTS,
            undefined,
            undefined,
            1
        );
    }

    if (state.meta) state.meta.player_faction = playerFaction;
    return { state };
}

/** Load a saved state file (final_save.json or any GameState JSON). */
export async function loadStateFromPath(statePath: string): Promise<{ state: GameState }> {
    const content = await readFile(statePath, 'utf8');
    return { state: deserializeState(content) };
}

/**
 * Advance one war-phase turn via the war pipeline (`runTurn`).
 * Returns new state; does not mutate the argument.
 */
export async function advanceTurn(state: GameState, baseDir: string): Promise<DesktopSimAdvanceResult> {
    const phase = state.meta?.phase ?? 'war';
    const seed = state.meta?.seed ?? 'desktop-seed';

    const graph = await loadSettlementGraph(settlementGraphOptions(baseDir));

    const graphForBrowser = graph as LoadedSettlementGraph;

    try {
        if (phase === 'war') {
            const { nextState, report } = await runTurn(state, {
                seed,
                settlementGraph: graphForBrowser,
                settlementEdges: graph.edges,
            });
            return {
                state: nextState,
                game_over: nextState.meta.game_over === true ? true : undefined,
                outcome: nextState.meta.outcome ?? undefined,
                report: { phase, turn: nextState.meta.turn, details: report }
            };
        }
        return { state, error: `Unknown phase: ${phase}` };
    } catch (err) {
        return { state, error: err instanceof Error ? err.message : String(err) };
    }
}


/** Read-only query: movement range preview for deployed vs column stance. */
export async function queryMovementRangeForBrigade(
    state: GameState,
    brigadeId: string,
    baseDir: string
): Promise<MovementRangeQuery> {
    const graph = await loadSettlementGraph(settlementGraphOptions(baseDir));
    const terrain = await loadTerrainScalars(terrainScalarsPath(baseDir));
    return computeMovementRangeQuery(state, graph.edges, terrain, brigadeId);
}

/** Read-only query: movement path and ETA preview to destination settlement. */
export async function queryMovementPathForBrigade(
    state: GameState,
    brigadeId: string,
    destinationSid: string,
    baseDir: string
): Promise<MovementPathQuery | null> {
    const graph = await loadSettlementGraph(settlementGraphOptions(baseDir));
    const terrain = await loadTerrainScalars(terrainScalarsPath(baseDir));
    return computeMovementPathQuery(state, graph.edges, terrain, brigadeId, destinationSid);
}

/** Read-only query: deterministic pre-attack estimate for brigade->target. */
export async function queryCombatEstimateForBrigade(
    state: GameState,
    brigadeId: string,
    targetSid: string,
    baseDir: string
): Promise<AttackEstimate | null> {
    const formation = state.military.formations?.[brigadeId];
    if (!formation || (formation.kind ?? 'brigade') !== 'brigade') return null;
    const graph = await loadSettlementGraph(settlementGraphOptions(baseDir));
    const terrain = await loadTerrainScalars(terrainScalarsPath(baseDir));
    const settlementToMun = new Map<string, string>();
    for (const [sid, record] of graph.settlements.entries()) {
        settlementToMun.set(sid, record.mun1990_id ?? record.mun_code ?? sid);
    }
    return estimateAttackCost(state, formation, targetSid, graph.edges, terrain, settlementToMun);
}

export interface CorpsSectorQueryEntry {
    corps_id: string;
    faction: string;
    brigade_ids: string[];
    settlement_ids: string[];
    front_width_score: number;
    overextended: boolean;
}

export interface BattleEventQueryEntry {
    turn: number;
    settlement_id: string;
    from: string | null;
    to: string | null;
    mechanism: string;
    mun_id: string | null;
}

/** Result of supply query: reachability plus supply state and corridor summary for UI. */
export interface SupplyPathsQueryResult extends SupplyReachabilityReport {
    supply_state?: SupplyStateDerivationReport;
    corridors?: CorridorDerivationReport;
}

/** Read-only query: supply reachability, state (adequate/strained/critical counts), and corridor summary. */
export async function querySupplyPaths(
    state: GameState,
    baseDir: string
): Promise<SupplyPathsQueryResult> {
    const graph = await loadSettlementGraph(settlementGraphOptions(baseDir));
    const adjacency = buildAdjacencyMap(graph.edges);
    const reachability = computeSupplyReachability(state, adjacency);
    const corridorReport = deriveCorridors(state, adjacency, reachability);
    const supplyStateReport = deriveSupplyState(state, adjacency, reachability, corridorReport);
    return {
        ...reachability,
        supply_state: supplyStateReport,
        corridors: corridorReport
    };
}

/** Read-only query: derived corps sectors from brigade location (AoR or location_osid). */
export function queryCorpsSectors(
    state: GameState
): CorpsSectorQueryEntry[] {
    const formations = state.military.formations ?? {};
    const phase = state.meta?.phase as string | undefined;
    const corpsMap = new Map<string, { faction: string; brigades: Set<string>; settlements: Set<string> }>();

    for (const formationId of Object.keys(formations).sort()) {
        const formation = formations[formationId];
        if (!formation || (formation.kind ?? 'brigade') !== 'brigade' || !formation.corps_id) continue;
        const corpsId = formation.corps_id;
        if (!corpsMap.has(corpsId)) {
            corpsMap.set(corpsId, {
                faction: formation.faction ?? 'null',
                brigades: new Set<string>(),
                settlements: new Set<string>(),
            });
        }
        corpsMap.get(corpsId)!.brigades.add(formationId);
        const loc = (formation as { location_osid?: string }).location_osid;
        if (typeof loc === 'string' && loc) corpsMap.get(corpsId)!.settlements.add(loc);
    }

    const sectors: CorpsSectorQueryEntry[] = [];
    for (const corpsId of [...corpsMap.keys()].sort((a, b) => a.localeCompare(b))) {
        const entry = corpsMap.get(corpsId)!;
        const metrics = computeFrontWidthMetrics(entry.settlements.size, entry.brigades.size);
        sectors.push({
            corps_id: corpsId,
            faction: entry.faction,
            brigade_ids: [...entry.brigades].sort((a, b) => a.localeCompare(b)),
            settlement_ids: [...entry.settlements].sort((a, b) => a.localeCompare(b)),
            front_width_score: metrics.front_width_score,
            overextended: metrics.overextended,
        });
    }
    return sectors;
}

/** Read-only query: normalized battle/control events sorted for deterministic replay. */
export function queryBattleEvents(
    state: GameState
): { turn: number; events: BattleEventQueryEntry[] } {
    const turn = state.meta?.turn ?? 0;
    const raw = Array.isArray((state as unknown as { military: { control_events?: unknown[] } }).military.control_events)
        ? ((state as unknown as { military: { control_events?: unknown[] } }).military.control_events as unknown[])
        : [];
    const events: BattleEventQueryEntry[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const r = item as Record<string, unknown>;
        if (typeof r.turn !== 'number' || typeof r.settlement_id !== 'string') continue;
        events.push({
            turn: r.turn,
            settlement_id: r.settlement_id,
            from: typeof r.from === 'string' ? r.from : null,
            to: typeof r.to === 'string' ? r.to : null,
            mechanism: typeof r.mechanism === 'string' ? r.mechanism : 'unknown',
            mun_id: typeof r.mun_id === 'string' ? r.mun_id : null,
        });
    }
    events.sort((a, b) => {
        if (a.turn !== b.turn) return a.turn - b.turn;
        const mech = a.mechanism.localeCompare(b.mechanism);
        if (mech !== 0) return mech;
        return a.settlement_id.localeCompare(b.settlement_id);
    });
    return { turn, events };
}

/**
 * Apply a single player recruitment action (desktop only). Mutates state in place.
 * Returns updated state on success so main can serialize and send to renderer.
 */
export async function applyPlayerRecruitment(
    state: GameState,
    baseDir: string,
    brigadeId: string,
    equipmentClass: string
): Promise<{ ok: true; state: GameState } | { ok: false; error: string }> {
    if (!state.military.recruitment_state) {
        return { ok: false, error: 'No recruitment state' };
    }
    const cls = equipmentClass.trim() as EquipmentClass;
    if (!isValidEquipmentClass(cls)) {
        return { ok: false, error: `Invalid equipment class: ${equipmentClass}` };
    }

    const [brigades, municipalityHqSettlement, graph] = await Promise.all([
        loadOobBrigades(baseDir),
        loadMunicipalityHqSettlement(baseDir),
        loadSettlementGraph(settlementGraphOptions(baseDir)),
    ]);

    const brigade = brigades.find((b) => b.id === brigadeId);
    if (!brigade) {
        return { ok: false, error: `Brigade not found: ${brigadeId}` };
    }

    const sidToMun = buildSidToMunFromSettlements(graph.settlements);

    const result = recruitBrigade(
        state,
        brigade,
        cls,
        state.military.recruitment_state,
        sidToMun,
        municipalityHqSettlement
    );

    if (!result.success) {
        return { ok: false, error: result.reason ?? 'Recruitment failed' };
    }

    applyRecruitment(state, result, state.military.recruitment_state);
    return { ok: true, state };
}

/**
 * Load OOB brigade catalog for recruitment UI. Returns serializable list for renderer.
 */
export async function getRecruitmentCatalog(baseDir: string): Promise<{
    brigades: Array<{
        id: string;
        faction: string;
        name: string;
        home_mun: string;
        manpower_cost: number;
        capital_cost: number;
        default_equipment_class: string;
        available_from: number;
        mandatory: boolean;
    }>
}> {
    const brigades = await loadOobBrigades(baseDir);
    return {
        brigades: brigades.map((b) => ({
            id: b.id,
            faction: b.faction,
            name: b.name,
            home_mun: b.home_mun,
            manpower_cost: b.manpower_cost,
            capital_cost: b.capital_cost,
            default_equipment_class: b.default_equipment_class,
            available_from: b.available_from,
            mandatory: b.mandatory,
        })),
    };
}

/** Re-export for main process (serialize/deserialize state for IPC). */
export { deserializeState, serializeState };

// ── Operation Prediction Query ─────────────────────────────────────────

import { loadOperationalData, loadOperationalEdges } from '../data/operational_data.js';
import { buildOsidAdjacency } from '../sim/combat/osid_adjacency.js';
import { buildTerrainCache } from '../sim/combat/combat_predictor.js';
import {
    computeOperationPrediction,
    type OperationPredictionRequest,
    type OperationPredictionResponse,
} from '../sim/combat/operation_prediction.js';

/**
 * Read-only query: predict operation outcomes using the full combat predictor.
 * Loads operational data, builds adjacency + terrain cache, delegates to computeOperationPrediction.
 */
/** Cached operational data for prediction queries (immutable during gameplay). */
let cachedOpData: Awaited<ReturnType<typeof loadOperationalData>> | null = null;
let cachedEdges: Awaited<ReturnType<typeof loadOperationalEdges>> | null = null;

export async function queryOperationPrediction(
    state: GameState,
    request: OperationPredictionRequest,
    baseDir: string
): Promise<OperationPredictionResponse> {
    if (!cachedOpData) cachedOpData = await loadOperationalData(baseDir);
    if (!cachedEdges) cachedEdges = await loadOperationalEdges(baseDir);
    const adjacency = buildOsidAdjacency(cachedEdges);
    const terrain = await loadTerrainScalars(terrainScalarsPath(baseDir));
    const terrainCache = buildTerrainCache(cachedOpData.operationalToCanonical, terrain);

    return computeOperationPrediction(
        state,
        request,
        adjacency,
        cachedOpData.operationalToCanonical,
        terrainCache,
    );
}

export type { OperationPredictionRequest, OperationPredictionResponse };

/** Phase K: Validate settlement-level movement order (1-4 contiguous, same-faction). */
export async function validateBrigadeMovementOrder(
    state: GameState,
    brigadeId: string,
    destinationSids: string[],
    baseDir: string
): Promise<{ valid: boolean; error?: string }> {
    if (!destinationSids.length || destinationSids.length > 4) {
        return { valid: false, error: 'Destination must be 1–4 settlements' };
    }
    const formation = state.military.formations?.[brigadeId];
    if (!formation || (formation.kind ?? 'brigade') !== 'brigade' || !formation.faction) {
        return { valid: false, error: 'Invalid brigade' };
    }
    const factionId = formation.faction as FactionId;
    const pc = state.political.political_controllers ?? {};
    for (const sid of destinationSids) {
        if (pc[sid] !== factionId) {
            return { valid: false, error: 'All destinations must be controlled by your faction' };
        }
    }
    const graph = await loadSettlementGraph(settlementGraphOptions(baseDir));
    const adj = buildAdjacencyFromEdges(graph.edges);
    const sidSet = new Set(destinationSids);
    const queue = [destinationSids[0]];
    const reached = new Set<string>();
    reached.add(destinationSids[0]);
    while (queue.length > 0) {
        const s = queue.shift()!;
        const neighbors = adj.get(s);
        if (neighbors) {
            for (const n of neighbors) {
                if (sidSet.has(n) && !reached.has(n)) {
                    reached.add(n);
                    queue.push(n);
                }
            }
        }
    }
    if (reached.size !== destinationSids.length) {
        return { valid: false, error: 'Destination settlements must be contiguous' };
    }

    const startSid = (formation as { location_osid?: string }).location_osid ?? formation.hq_sid ?? null;
    if (!startSid) {
        return { valid: false, error: 'Brigade has no current settlement to path from' };
    }
    const path = shortestPathThroughFriendly(
        state,
        graph.edges,
        startSid,
        destinationSids,
        factionId
    );
    if (!path) {
        return { valid: false, error: 'No friendly-only path to destination settlements' };
    }
    return { valid: true };
}

/** Retired compatibility validator: brigade reposition orders are no longer a live player command. */
export async function validateBrigadeRepositionOrder(
    state: GameState,
    brigadeId: string,
    settlementIds: string[],
    baseDir: string
): Promise<{ valid: boolean; error?: string }> {
    void state;
    void brigadeId;
    void settlementIds;
    void baseDir;
    return {
        valid: false,
        error: 'Brigade reposition orders are retired; use movement or sector assignment instead',
    };

    /*
    if (!settlementIds.length || settlementIds.length > 4) {
        return { valid: false, error: 'Settlements must be 1–4' };
    }
    const formation = state.military.formations?.[brigadeId];
    if (!formation || (formation.kind ?? 'brigade') !== 'brigade' || !formation.faction) {
        return { valid: false, error: 'Invalid brigade' };
    }
    const factionId = formation.faction as FactionId;
    const pc = state.political.political_controllers ?? {};
    for (const sid of settlementIds) {
        if (pc[sid] !== factionId) {
            return { valid: false, error: 'All settlements must be controlled by your faction' };
        }
    }
    const graph = await loadSettlementGraph(settlementGraphOptions(baseDir));
    const adj = buildAdjacencyFromEdges(graph.edges);
    if (!isSettlementSetContiguous(settlementIds, adj)) {
        return { valid: false, error: 'Settlements must be contiguous' };
    }
    return { valid: true };
    */
}

function normalizeEdgeId(edgeId: string): string | null {
    const parts = edgeId.split('__');
    if (parts.length !== 2) return null;
    const a = parts[0]?.trim();
    const b = parts[1]?.trim();
    if (!a || !b) return null;
    return a < b ? `${a}__${b}` : `${b}__${a}`;
}

/** Validate and stage corps front edges; auto-distribute nearby front settlements to corps brigades. */
export async function stageCorpsFrontOrder(
    state: GameState,
    corpsId: string,
    edgeIds: string[],
    baseDir: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const corps = state.military.formations?.[corpsId];
    const kind = corps?.kind ?? 'corps';
    const isCorpsLike = kind === 'corps' || kind === 'corps_asset' || kind === 'army_hq';
    if (!corps || !isCorpsLike) {
        return { ok: false, error: 'Invalid corps formation' };
    }
    const normalized = edgeIds
        .map((id) => normalizeEdgeId(id))
        .filter((id): id is string => id !== null)
        .sort(strictCompare);
    if (normalized.length === 0) {
        return { ok: false, error: 'At least one valid edge_id is required' };
    }
    const graph = await loadSettlementGraph(settlementGraphOptions(baseDir));
    const validEdgeIds = new Set<string>();
    for (const e of graph.edges) {
        validEdgeIds.add(e.a < e.b ? `${e.a}__${e.b}` : `${e.b}__${e.a}`);
    }
    for (const id of normalized) {
        if (!validEdgeIds.has(id)) {
            return { ok: false, error: `Unknown edge_id: ${id}` };
        }
    }
    if (!state.military.corps_front_edges) state.military.corps_front_edges = {};
    state.military.corps_front_edges[corpsId] = [...new Set(normalized)].sort(strictCompare);
    ensureDerivedCorpsFrontEdges(state, graph.edges);
    applyCorpsFrontAutoDistributionForCorps(state, corpsId);
    return { ok: true };
}

/** Stage corps attack axis and project it to deterministic per-brigade attack orders. */
export function stageCorpsAttackAxisOrder(
    state: GameState,
    corpsId: string,
    edgeIds: string[]
): { ok: true } | { ok: false; error: string } {
    const corps = state.military.formations?.[corpsId];
    const kind = corps?.kind ?? 'corps';
    const isCorpsLike = kind === 'corps' || kind === 'corps_asset' || kind === 'army_hq';
    if (!corps || !corps.faction || !isCorpsLike) return { ok: false, error: 'Invalid corps formation' };
    const normalized = edgeIds
        .map((id) => normalizeEdgeId(id))
        .filter((id): id is string => id !== null)
        .sort(strictCompare);
    if (normalized.length === 0) return { ok: false, error: 'At least one valid edge_id is required' };
    if (!state.military.corps_attack_axis_orders) state.military.corps_attack_axis_orders = {};
    state.military.corps_attack_axis_orders[corpsId] = { edge_ids: [...new Set(normalized)].sort(strictCompare), created_turn: state.meta?.turn ?? 0 };
    const pc = state.political.political_controllers ?? {};
    const enemyTargets = new Set<string>();
    for (const eid of normalized) {
        const parts = eid.split('__');
        if (parts.length !== 2) continue;
        const a = parts[0];
        const b = parts[1];
        if (pc[a] && pc[a] !== corps.faction) enemyTargets.add(a);
        if (pc[b] && pc[b] !== corps.faction) enemyTargets.add(b);
    }
    const targets = [...enemyTargets].sort(strictCompare);
    if (targets.length === 0) return { ok: true };
    const brigades = Object.keys(state.military.formations ?? {})
        .filter((id) => {
            const f = state.military.formations?.[id];
            return !!f && (f.kind ?? 'brigade') === 'brigade' && f.corps_id === corpsId && f.faction === corps.faction;
        })
        .sort(strictCompare);
    if (brigades.length === 0) return { ok: true };
    if (!state.military.brigade_attack_orders) state.military.brigade_attack_orders = {};
    for (let i = 0; i < brigades.length; i++) {
        state.military.brigade_attack_orders[brigades[i]] = targets[i % targets.length];
    }
    return { ok: true };
}

/** Stage OG subfront edges; must be subset of parent corps front edge set. */
export function stageOgSubfrontOrder(
    state: GameState,
    ogId: string,
    corpsId: string,
    edgeIds: string[]
): { ok: true } | { ok: false; error: string } {
    const normalized = edgeIds
        .map((id) => normalizeEdgeId(id))
        .filter((id): id is string => id !== null)
        .sort(strictCompare);
    if (normalized.length === 0) return { ok: false, error: 'At least one valid edge_id is required' };
    const corpsEdges = new Set((state.military.corps_front_edges?.[corpsId] ?? []).map((id) => normalizeEdgeId(id)).filter((id): id is string => id !== null));
    if (corpsEdges.size === 0) return { ok: false, error: 'Parent corps has no front edges' };
    for (const id of normalized) {
        if (!corpsEdges.has(id)) return { ok: false, error: `Subfront edge ${id} is outside corps front` };
    }
    if (!state.military.og_subfront_edges) state.military.og_subfront_edges = {};
    state.military.og_subfront_edges[ogId] = [...new Set(normalized)].sort(strictCompare);
    return { ok: true };
}

/** Assign brigade to a corps front sector (permanent player override).
 *  sectorId = null clears the override, returning the brigade to bot assignment. */
export function assignBrigadeToSector(
    state: GameState,
    brigadeId: string,
    sectorId: string | null,
): { ok: true } | { ok: false; error: string } {
    const formation = state.military.formations?.[brigadeId];
    if (!formation || (formation.kind ?? 'brigade') !== 'brigade') {
        return { ok: false, error: 'Invalid brigade formation' };
    }
    if (sectorId !== null) {
        const sectors = state.military.corps_front_sectors ?? {};
        const sector = sectors[sectorId];
        if (!sector) return { ok: false, error: `Unknown sector: ${sectorId}` };
        if (sector.corps_id !== formation.corps_id) {
            return { ok: false, error: `Sector ${sectorId} belongs to ${sector.corps_id}, not brigade corps ${formation.corps_id}` };
        }
    }
    if (!state.military.brigade_sector_override) state.military.brigade_sector_override = {};
    if (sectorId === null) {
        delete state.military.brigade_sector_override[brigadeId];
    } else {
        state.military.brigade_sector_override[brigadeId] = sectorId;
    }
    return { ok: true };
}

/** Player approves a pending reserve request, deploying the suggested (or specified) brigade. */
export function approveReserveRequest(
    state: GameState,
    corpsId: string,
    brigadeId: string,
    decisionReason?: string
): { ok: true } | { ok: false; error: string } {
    const f = state.military.formations?.[brigadeId];
    if (!f) return { ok: false, error: `Brigade not found: ${brigadeId}` };
    if (!f.elite_loan_state) return { ok: false, error: `${brigadeId} is not an elite brigade` };
    if (f.elite_loan_state.on_loan) return { ok: false, error: `${brigadeId} is already on loan` };
    if (f.elite_loan_state.permanently_degraded) return { ok: false, error: `${brigadeId} has permanently lost elite status` };
    // Find the pending request to get the reason; fall back to 'offensive_support'
    const req = state.military.pending_reserve_requests?.find(r => r.corps_id === corpsId);
    const reason = req?.reason ?? 'offensive_support';
    const hops = req?.travel_hops ?? 0;
    const purpose = req?.purpose ?? 'defensive';
    const whyNeeded = req?.why_needed ?? req?.description ?? 'Corps requires immediate reinforcement.';
    const howToUse = req?.how_to_use ?? 'Stabilize front pressure and reinforce key sub-segments.';
    const requestId = req?.request_id ?? `req:${state.meta.turn}:${corpsId}:${reason}`;
    const armyReason = (decisionReason && decisionReason.trim().length > 0)
        ? decisionReason.trim()
        : 'Army CO accepted: request is actionable and priority justifies elite commitment.';
    deployEliteLoan(
        state,
        brigadeId,
        corpsId,
        reason,
        hops,
        state.meta.turn,
        { purpose, why_needed: whyNeeded, how_to_use: howToUse },
        armyReason,
        'player'
    );
    if (!state.military.reserve_request_history) state.military.reserve_request_history = [];
    state.military.reserve_request_history.push({
        request_id: requestId,
        turn: state.meta.turn,
        faction: req?.faction ?? f.faction,
        corps_id: corpsId,
        brigade_id: brigadeId,
        outcome: 'accepted',
        reason: armyReason,
        decided_by: 'player',
        purpose,
        why_needed: whyNeeded,
        how_to_use: howToUse,
    });
    // Remove the fulfilled request from pending list
    if (state.military.pending_reserve_requests) {
        state.military.pending_reserve_requests = state.military.pending_reserve_requests.filter(r => r.corps_id !== corpsId);
    }
    return { ok: true };
}

/** Player declines a pending reserve request and records Army CO rationale. */
export function declineReserveRequest(
    state: GameState,
    requestId: string,
    reason?: string
): { ok: true } | { ok: false; error: string } {
    const pending = state.military.pending_reserve_requests ?? [];
    const req = pending.find((r) => (r.request_id ?? '') === requestId);
    if (!req) return { ok: false, error: `Reserve request not found: ${requestId}` };
    const declineReason = (reason && reason.trim().length > 0)
        ? reason.trim()
        : 'Army CO declined: insufficient reserve margin for current strategic commitments.';
    const purpose = req.purpose ?? 'defensive';
    const whyNeeded = req.why_needed ?? req.description;
    const howToUse = req.how_to_use ?? 'Reinforce key front positions.';
    if (!state.military.reserve_request_history) state.military.reserve_request_history = [];
    state.military.reserve_request_history.push({
        request_id: req.request_id ?? requestId,
        turn: state.meta.turn,
        faction: req.faction,
        corps_id: req.corps_id,
        brigade_id: null,
        outcome: 'declined',
        reason: declineReason,
        decided_by: 'player',
        purpose,
        why_needed: whyNeeded,
        how_to_use: howToUse,
    });
    state.military.pending_reserve_requests = pending.filter((r) => (r.request_id ?? '') !== requestId);
    return { ok: true };
}

/** Player manually recalls an elite brigade from its current loan. */
export function recallEliteBrigade(
    state: GameState,
    brigadeId: string,
    reasonOverride?: string
): { ok: true } | { ok: false; error: string } {
    const f = state.military.formations?.[brigadeId];
    if (!f) return { ok: false, error: `Brigade not found: ${brigadeId}` };
    if (!f.elite_loan_state?.on_loan) return { ok: false, error: `${brigadeId} is not currently on loan` };
    const loanedCorps = f.elite_loan_state.loaned_to_corps;
    const faction = f.faction;
    const purpose: 'offensive' | 'defensive' = 'defensive';
    const whyNeeded = `Loan for ${loanedCorps ?? 'unknown corps'} terminated by Army CO/player order.`;
    const howToUse = 'Terminate deployment and return brigade to reserve base.';
    recallEliteLoan(state, brigadeId, 'player_recall', state.meta.turn);
    if (!state.military.reserve_request_history) state.military.reserve_request_history = [];
    state.military.reserve_request_history.push({
        request_id: `terminate:${state.meta.turn}:${brigadeId}`,
        turn: state.meta.turn,
        faction,
        corps_id: loanedCorps ?? 'unknown',
        brigade_id: brigadeId,
        outcome: 'terminated',
        reason: (reasonOverride && reasonOverride.trim().length > 0)
            ? reasonOverride.trim()
            : 'Army CO terminated loan and returned brigade to base reserve.',
        decided_by: 'player',
        purpose,
        why_needed: whyNeeded,
        how_to_use: howToUse,
    });
    return { ok: true };
}

/** Player redirects a loaned elite brigade to a different corps (recall + re-deploy). */
export function redirectReserveLoan(
    state: GameState,
    brigadeId: string,
    newCorpsId: string
): { ok: true } | { ok: false; error: string } {
    const f = state.military.formations?.[brigadeId];
    if (!f) return { ok: false, error: `Brigade not found: ${brigadeId}` };
    if (!f.elite_loan_state) return { ok: false, error: `${brigadeId} is not an elite brigade` };
    if (f.elite_loan_state.on_loan) {
        recallEliteLoan(state, brigadeId, 'player_recall', state.meta.turn);
    }
    const req = state.military.pending_reserve_requests?.find(r => r.corps_id === newCorpsId);
    const reason = req?.reason ?? 'offensive_support';
    deployEliteLoan(state, brigadeId, newCorpsId, reason, 0, state.meta.turn);
    return { ok: true };
}
