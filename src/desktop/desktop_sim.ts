/**
 * Desktop (Electron main) sim API: load scenario/state, advance turn.
 * Used by electron-main.cjs via a CJS bundle. No browser/DOM deps; Node fs/path OK.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildAdjacencyMap } from '../map/adjacency_map.js';
import { loadSettlementGraph } from '../map/settlements.js';
import { loadTerrainScalars } from '../map/terrain_scalars.js';
import type { LoadedSettlementGraph } from '../map/settlements_parse.js';
import { initializePhase0Relationships, updateAllianceAfterInvestment } from '../phase0/alliance.js';
import type { InvestmentScope, InvestmentType } from '../phase0/investment.js';
import { applyInvestment } from '../phase0/investment.js';
import { loadMunicipalityHqSettlement, loadOobBrigades } from '../scenario/oob_loader.js';
import { buildSidToMunFromSettlements } from '../scenario/oob_phase_i_entry.js';
import { createStateFromScenario } from '../scenario/scenario_runner.js';
import { validateReshapeOrder } from '../sim/phase_ii/aor_reshaping.js';
import { getBrigadeAoRSettlements } from '../sim/phase_ii/brigade_aor.js';
import { shortestPathThroughFriendly } from '../sim/phase_ii/brigade_movement.js';
import { buildAdjacencyFromEdges, isSettlementSetContiguous } from '../sim/phase_ii/phase_ii_adjacency.js';
import { estimateAttackCost, type AttackEstimate } from '../sim/phase_ii/combat_estimate.js';
import { applyRecruitment, initializeRecruitmentResources, recruitBrigade } from '../sim/recruitment_engine.js';
import { runPhaseITurn } from '../sim/run_phase_i_browser.js';
import { runTurn } from '../sim/turn_pipeline.js';
import {
    queryMovementPath as computeMovementPathQuery,
    queryMovementRange as computeMovementRangeQuery,
    type MovementPathQuery,
    type MovementRangeQuery,
} from '../sim/phase_ii/brigade_movement_query.js';
import { computeSupplyReachability, type SupplyReachabilityReport } from '../state/supply_reachability.js';
import type { BrigadeAoROrder, FactionId, GameState, MunicipalityId } from '../state/game_state.js';
import { applyMunicipalityControllersFromMun1990Only } from '../state/political_control_init.js';
import type { EquipmentClass } from '../state/recruitment_types.js';
import { isValidEquipmentClass } from '../state/recruitment_types.js';
import { deserializeState, serializeState } from '../state/serialize.js';
import { strictCompare } from '../state/validateGameState.js';
import { runPhase0TurnAndAdvance } from '../ui/warroom/run_phase0_turn.js';

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
    report?: {
        phase: string;
        turn: number;
        details?: unknown;
    };
}

/** Scenario file used for "New Game" (April 1992 definitive start, Phase II, ethnic_1991). */
export const NEW_GAME_SCENARIO_RELATIVE = 'data/scenarios/apr1992_definitive_52w.json';
export const SEP_1991_SCENARIO_RELATIVE = 'data/scenarios/sep_1991_phase0.json';
export type DesktopScenarioKey = 'apr_1992' | 'sep_1991';
const DEFAULT_DESKTOP_SCENARIO_KEY: DesktopScenarioKey = 'apr_1992';
const SCENARIO_KEY_TO_PATH: Record<DesktopScenarioKey, string> = {
    apr_1992: NEW_GAME_SCENARIO_RELATIVE,
    sep_1991: SEP_1991_SCENARIO_RELATIVE,
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

    if (key === 'apr_1992' && !state.recruitment_state) {
        state.recruitment_state = initializeRecruitmentResources(
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
 * Advance one turn using browser-safe Phase 0 / I / II runners.
 * Returns new state; does not mutate the argument.
 */
export async function advanceTurn(state: GameState, baseDir: string): Promise<DesktopSimAdvanceResult> {
    const phase = state.meta?.phase ?? 'phase_ii';
    const seed = state.meta?.seed ?? 'desktop-seed';

    const graph = await loadSettlementGraph(settlementGraphOptions(baseDir));

    const graphForBrowser = graph as LoadedSettlementGraph;

    try {
        if (phase === 'phase_0') {
            const playerFaction = state.meta?.player_faction;
            const phaseBefore = state.meta.phase;
            const next = runPhase0TurnAndAdvance(state, seed, playerFaction);
            if (
                phaseBefore === 'phase_0' &&
                next.meta.phase === 'phase_i' &&
                next.meta.phase_0_war_start_control_path
            ) {
                await applyMunicipalityControllersFromMun1990Only(
                    next,
                    graphForBrowser,
                    next.meta.phase_0_war_start_control_path
                );
            }
            return { state: next, report: { phase, turn: next.meta.turn } };
        }
        if (phase === 'phase_i') {
            const { nextState, report } = await runPhaseITurn(state, { seed, settlementGraph: graphForBrowser });
            return { state: nextState, report: { phase, turn: nextState.meta.turn, details: report } };
        }
        if (phase === 'phase_ii') {
            const { nextState, report } = await runTurn(state, {
                seed,
                settlementGraph: graphForBrowser,
                settlementEdges: graph.edges,
            });
            return { state: nextState, report: { phase, turn: nextState.meta.turn, details: report } };
        }
        return { state, error: `Unknown phase: ${phase}` };
    } catch (err) {
        return { state, error: err instanceof Error ? err.message : String(err) };
    }
}

export interface Phase0DirectivePayload {
    id: string;
    factionId: FactionId;
    investmentType: InvestmentType;
    scope: InvestmentScope;
    targetMunIds: MunicipalityId[];
    coordinated?: boolean;
}

/**
 * Apply staged Phase 0 directives in deterministic order before advancing.
 * Returns number of directives successfully applied.
 */
export function applyPhase0Directives(state: GameState, directives: Phase0DirectivePayload[]): number {
    if (!Array.isArray(directives) || directives.length === 0) return 0;

    const sorted = [...directives].sort((a, b) => {
        const byId = strictCompare(a.id, b.id);
        if (byId !== 0) return byId;
        const byFaction = strictCompare(a.factionId, b.factionId);
        if (byFaction !== 0) return byFaction;
        return strictCompare(a.investmentType, b.investmentType);
    });

    let applied = 0;
    for (const directive of sorted) {
        const result = applyInvestment(state, directive.factionId, directive.investmentType, directive.scope, {
            coordinated: directive.coordinated === true,
        });
        if (!result.ok) continue;
        if (!state.phase0_relationships) {
            state.phase0_relationships = initializePhase0Relationships();
        }
        updateAllianceAfterInvestment(
            state.phase0_relationships,
            directive.factionId,
            directive.coordinated === true
        );
        applied++;
    }
    return applied;
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
    const formation = state.formations?.[brigadeId];
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
}

export interface BattleEventQueryEntry {
    turn: number;
    settlement_id: string;
    from: string | null;
    to: string | null;
    mechanism: string;
    mun_id: string | null;
}

/** Read-only query: current supply reachability report by faction. */
export async function querySupplyPaths(
    state: GameState,
    baseDir: string
): Promise<SupplyReachabilityReport> {
    const graph = await loadSettlementGraph(settlementGraphOptions(baseDir));
    const adjacency = buildAdjacencyMap(graph.edges);
    return computeSupplyReachability(state, adjacency);
}

/** Read-only query: derived corps sectors from brigade AoR ownership. */
export function queryCorpsSectors(
    state: GameState
): CorpsSectorQueryEntry[] {
    const formations = state.formations ?? {};
    const brigadeAor = state.brigade_aor ?? {};
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
    }

    for (const sid of Object.keys(brigadeAor).sort()) {
        const brigadeId = brigadeAor[sid];
        if (!brigadeId) continue;
        const formation = formations[brigadeId];
        const corpsId = formation?.corps_id;
        if (!corpsId) continue;
        const entry = corpsMap.get(corpsId);
        if (!entry) continue;
        entry.settlements.add(sid);
    }

    const sectors: CorpsSectorQueryEntry[] = [];
    for (const corpsId of [...corpsMap.keys()].sort((a, b) => a.localeCompare(b))) {
        const entry = corpsMap.get(corpsId)!;
        sectors.push({
            corps_id: corpsId,
            faction: entry.faction,
            brigade_ids: [...entry.brigades].sort((a, b) => a.localeCompare(b)),
            settlement_ids: [...entry.settlements].sort((a, b) => a.localeCompare(b)),
        });
    }
    return sectors;
}

/** Read-only query: normalized battle/control events sorted for deterministic replay. */
export function queryBattleEvents(
    state: GameState
): { turn: number; events: BattleEventQueryEntry[] } {
    const turn = state.meta?.turn ?? 0;
    const raw = Array.isArray((state as unknown as { control_events?: unknown[] }).control_events)
        ? ((state as unknown as { control_events?: unknown[] }).control_events as unknown[])
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
    if (!state.recruitment_state) {
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
        state.recruitment_state,
        sidToMun,
        municipalityHqSettlement
    );

    if (!result.success) {
        return { ok: false, error: result.reason ?? 'Recruitment failed' };
    }

    applyRecruitment(state, result, state.recruitment_state);
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

/**
 * Validate a brigade AoR reshape order (contiguity, same-faction, adjacency).
 * Used by main process when staging player AoR orders. Loads graph from baseDir.
 */
export async function validateBrigadeAoROrder(
    state: GameState,
    order: BrigadeAoROrder,
    baseDir: string
): Promise<{ valid: boolean; error?: string }> {
    const graph = await loadSettlementGraph(settlementGraphOptions(baseDir));
    const err = validateReshapeOrder(state, order, graph.edges);
    return err != null ? { valid: false, error: err } : { valid: true };
}

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
    const formation = state.formations?.[brigadeId];
    if (!formation || (formation.kind ?? 'brigade') !== 'brigade' || !formation.faction) {
        return { valid: false, error: 'Invalid brigade' };
    }
    const factionId = formation.faction as FactionId;
    const pc = state.political_controllers ?? {};
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

    const startSid = getBrigadeAoRSettlements(state, brigadeId)[0] ?? formation.hq_sid ?? null;
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

/** Validate reposition order: 1–4 contiguous, same-faction (no path check). */
export async function validateBrigadeRepositionOrder(
    state: GameState,
    brigadeId: string,
    settlementIds: string[],
    baseDir: string
): Promise<{ valid: boolean; error?: string }> {
    if (!settlementIds.length || settlementIds.length > 4) {
        return { valid: false, error: 'Settlements must be 1–4' };
    }
    const formation = state.formations?.[brigadeId];
    if (!formation || (formation.kind ?? 'brigade') !== 'brigade' || !formation.faction) {
        return { valid: false, error: 'Invalid brigade' };
    }
    const factionId = formation.faction as FactionId;
    const pc = state.political_controllers ?? {};
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
}
