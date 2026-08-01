/**
 * Desktop (Electron main) sim API: load scenario/state, advance turn.
 * Used by electron-main.cjs via a CJS bundle. No browser/DOM deps; Node fs/path OK.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadOperationalCentroids, loadOperationalData, loadOperationalEdges } from '../data/operational_data.js';
import { buildAdjacencyMap } from '../map/adjacency_map.js';
import { loadSettlementGraph } from '../map/settlements.js';
import { loadTerrainScalars } from '../map/terrain_scalars_node.js';
import type { LoadedSettlementGraph } from '../map/settlements_parse.js';
import { loadMunicipalityHqSettlement, loadOobBrigades } from '../scenario/oob_loader.js';
import { canonicalizeStartupState, createStateFromScenario } from '../scenario/scenario_runner.js';
import { loadStartupSnapshotState } from '../scenario/startup_snapshot.js';
import { shortestPathThroughFriendly } from '../sim/combat/brigade_movement.js';
import { isSrkStranglePostureEnabled } from '../sim/combat/contain_posture_gate.js';
import { buildAdjacencyFromEdges, isSettlementSetContiguous } from '../sim/combat/war_adjacency.js';
import { estimateAttackCost, type AttackEstimate } from '../sim/combat/combat_estimate.js';
import { computeFrontWidthMetrics } from '../sim/combat/front_width_metrics.js';
import { applyRecruitment, evaluateRecruitmentEligibility, initializeRecruitmentResources, recruitBrigade } from '../sim/recruitment_engine.js';
import { buildRecruitmentContext } from '../sim/recruitment_context.js';
import { assertTurnSuccess, runTurn } from '../sim/turn_pipeline.js';
import { loadEventDefinitionsFromDir } from '../sim/events/event_loader.js';
import { applyEventEffects } from '../sim/events/apply_effects.js';
import { resolveEventDecision } from '../sim/events/resolve_decision.js';
import { deferUnauthorizedHistoricalOperationsForPlayer } from '../sim/combat/historical_operation_authorization.js';
import {
    applyDefinitionDimensionShifts,
    applyDefinitionFlags,
} from '../sim/events/evaluate_events.js';
import { isTwoLevelNotificationsEnabled } from '../sim/events/emit_notifications.js';
import type { EventDefinition, EventEffect, PendingEventDecision } from '../sim/events/event_types.js';
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
import { deserializeState, serializeRuntimeState, serializeState } from '../state/serialize.js';
import { strictCompare } from '../state/validateGameState.js';
import { asArray, asRecord } from '../state/schema_validators.js';
import type { Osid } from '../sim/combat/osid_adjacency.js';
import {
    canEliteLoanReachCorpsTerritory,
    deployEliteLoan,
    holdReserveAtMainStaff,
    recallEliteLoan,
} from '../sim/combat/army_reserve_system.js';
import { ELITE_DEPLOY_COST } from '../ui/map/utils/commandAuthority.js';
import { resolvePlayerParamilitaryDecisions } from '../sim/combat/paramilitary_sweep.js';

// Electron main consumes simulation code through this built bundle. Direct
// source-relative imports from electron-main.cjs do not exist in packaged output.
export { interpretOperationLaunch, overrideInterpretation } from '../sim/combat/order_interpretation.js';
export { dismissEventNotification } from '../sim/events/dismiss_notifications.js';
export { resolvePeacePlan } from '../sim/negotiation/peace_plans.js';
export { submitPlayerCounterOffer } from '../sim/negotiation/counter_offer_generator.js';
export { resolveDaytonNegotiation } from '../sim/negotiation/dayton_negotiation.js';
export { evaluateBotResponse } from '../sim/negotiation/bot_negotiation.js';
export { createAiClient } from '../sim/ai_commander/ai_client.js';
export { getAdvisorRecommendation } from '../sim/ai_commander/player_advisor.js';
export { holdReserveAtMainStaff };

// Event definitions are static per build. Load + validate once per events dir and
// reuse across turns — the scenario runner likewise loads them once before its loop.
// Without this, the desktop turn ran evaluateEvents with no registry, so registry-driven
// decision events (rs_strategic_goals, war_199x, consequence chains) never fired.
let _eventDefinitionsCache: { dir: string; defs: EventDefinition[] } | null = null;
function loadDesktopEventDefinitions(baseDir: string): EventDefinition[] {
    const dir = join(baseDir, 'data/scenarios/events');
    if (_eventDefinitionsCache && _eventDefinitionsCache.dir === dir) {
        return _eventDefinitionsCache.defs;
    }
    // Start week 0: load the full April-1992 campaign event set. Each event still fires
    // only at its own trigger.turn_min inside evaluateEvents, not at load time.
    const defs = loadEventDefinitionsFromDir(0, dir);
    _eventDefinitionsCache = { dir, defs };
    return defs;
}

function settlementGraphOptions(baseDir: string): { settlementsPath: string; edgesPath: string } {
    return {
        settlementsPath: join(baseDir, 'data/source/settlements_initial_master.json'),
        edgesPath: join(baseDir, 'data/derived/settlement_edges.json'),
    };
}

function operationalSettlementGraphOptions(baseDir: string): { settlementsPath: string; edgesPath: string } {
    return {
        settlementsPath: join(baseDir, 'data/derived/operational/operational_settlements.geojson'),
        edgesPath: join(baseDir, 'data/derived/operational/operational_contact_graph.json'),
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
const OPENING_FOUNDATIONAL_EVENT_BY_FACTION: Record<'RBiH' | 'RS' | 'HRHB', string> = {
    RBiH: 'rbih_state_identity',
    RS: 'rs_strategic_goals',
    HRHB: 'hrhb_political_goal',
};

/** April 1992 game start: initial recruitment capital and equipment for desktop recruitment UI (from apr1992_definitive_52w). */
const NEW_GAME_RECRUITMENT_CAPITAL: Record<string, number> = { HRHB: 300, RBiH: 400, RS: 600 };
const NEW_GAME_EQUIPMENT_POINTS: Record<string, number> = { HRHB: 350, RBiH: 100, RS: 800 };

export interface DesktopRuntimeFeatureFlags {
    srkStranglePostureActive: boolean;
}

export function getRuntimeFeatureFlags(): DesktopRuntimeFeatureFlags {
    return {
        srkStranglePostureActive: isSrkStranglePostureEnabled(),
    };
}

function collectEventDefinitionEffects(def: EventDefinition): EventEffect[] {
    return [def.effect, ...(def.effects ?? [])];
}

function getOpeningDecisionTitle(def: EventDefinition): string {
    if (def.title) return def.title;
    if (def.narrative) return def.narrative;
    const narrativeEffects = collectEventDefinitionEffects(def)
        .filter((effect) => effect.kind === 'narrative')
        .map((effect) => effect.text);
    return narrativeEffects.length > 0 ? narrativeEffects.join(' ') : def.id;
}

function recordOpeningEventFiring(state: GameState, eventId: string, turn: number): void {
    if (!state.military.fired_event_ids.includes(eventId)) {
        state.military.fired_event_ids.push(eventId);
    }
    state.military.event_fire_counts[eventId] = (state.military.event_fire_counts[eventId] ?? 0) + 1;
    state.military.event_last_fired_turn[eventId] = turn;
    state.military.event_readiness[eventId] = 0;
}

function buildOpeningPendingDecision(
    def: EventDefinition,
    playerFaction: 'RBiH' | 'RS' | 'HRHB',
    turn: number,
): PendingEventDecision {
    const responseOptions = def.response_options ?? [];
    return {
        event_id: def.id,
        event_title: getOpeningDecisionTitle(def),
        ...(def.narrative ? { narrative: def.narrative } : {}),
        ...(def.category ? { category: def.category } : {}),
        ...(def.situation ? { situation: def.situation } : {}),
        ...(def.staff_assessment ? { staff_assessment: def.staff_assessment } : {}),
        ...(def.trigger_evidence && def.trigger_evidence.length > 0
            ? { trigger_evidence: [...def.trigger_evidence] }
            : {}),
        ...(def.historical_source ? { historical_source: def.historical_source } : {}),
        ...(def.source_note ? { source_note: def.source_note } : {}),
        ...(def.source ? { source: def.source } : {}),
        turn_fired: turn,
        response_options: responseOptions,
        faction: playerFaction,
        requires_player_response: def.requires_player_response,
        ...(def.historical_default_response_id
            ? { historical_default_response_id: def.historical_default_response_id }
            : {}),
        ...(def.staff_recommended_response_id
            ? { staff_recommended_response_id: def.staff_recommended_response_id }
            : {}),
        ...(isTwoLevelNotificationsEnabled()
            ? { notifications_to_other_factions: def.notifications_to_other_factions }
            : {}),
    };
}

function queueOpeningFoundationalDecision(
    state: GameState,
    eventDefinitions: EventDefinition[],
    playerFaction: 'RBiH' | 'RS' | 'HRHB',
): void {
    const eventId = OPENING_FOUNDATIONAL_EVENT_BY_FACTION[playerFaction];
    if ((state.military.pending_event_decisions ?? []).some((decision) => decision.event_id === eventId)) {
        return;
    }
    if (state.military.fired_event_ids.includes(eventId)) {
        return;
    }

    const def = eventDefinitions.find((entry) => entry.id === eventId);
    if (!def) {
        throw new Error(`Missing opening foundational event definition: ${eventId}`);
    }
    if (def.responding_faction !== playerFaction) {
        throw new Error(`Opening foundational event ${eventId} is authored for ${def.responding_faction ?? 'unknown'}, not ${playerFaction}`);
    }
    if (!def.response_options || def.response_options.length === 0) {
        throw new Error(`Opening foundational event ${eventId} has no response options`);
    }
    if (def.requires_player_response !== true) {
        throw new Error(`Opening foundational event ${eventId} must require player response`);
    }

    const turn = state.meta?.turn ?? 0;
    applyEventEffects(state, collectEventDefinitionEffects(def));
    applyDefinitionDimensionShifts(state, def.dimension_shifts);
    applyDefinitionFlags(state, def.sets_flags);
    recordOpeningEventFiring(state, eventId, turn);

    state.military.pending_event_decisions ??= [];
    state.military.pending_event_decisions.push(buildOpeningPendingDecision(def, playerFaction, turn));
}

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
    const state = key === 'apr_1992'
        ? await loadStartupSnapshotState(baseDir, key)
        : await createStateFromScenario(scenarioPath, baseDir);

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

    if (state.meta) {
        state.meta.player_faction = playerFaction;
        state.meta.headless_scenario_auto_control = false;
        // Free War Phase 0: the live player campaign is the FREE, emergent war —
        // AI factions choose event responses from battlefield/political signals,
        // not historical replay. Calibration (scenario_runner) never routes
        // through this entry, so it stays unset = historical = byte-identical.
        state.meta.decision_mode = 'emergent';
    }
    deferUnauthorizedHistoricalOperationsForPlayer(state);
    const canonicalState = canonicalizeStartupState(state).state;
    canonicalState.political.control_events = [];
    if (key === 'apr_1992') {
        queueOpeningFoundationalDecision(canonicalState, loadDesktopEventDefinitions(baseDir), playerFaction);
    }
    return { state: canonicalizeStartupState(canonicalState).state };
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

    const [graph, operationalSettlementGraph, operationalData, operationalCentroids] = await Promise.all([
        loadSettlementGraph(settlementGraphOptions(baseDir)),
        loadSettlementGraph(operationalSettlementGraphOptions(baseDir)),
        loadOperationalData(baseDir),
        loadOperationalCentroids(baseDir),
    ]);

    const graphForBrowser = graph as LoadedSettlementGraph;

    try {
        if (phase === 'war') {
            const result = await runTurn(state, {
                seed,
                settlementGraph: graphForBrowser,
                operationalSettlementGraph,
                operationalData: {
                    opData: operationalData,
                    edges: operationalSettlementGraph.edges,
                    centroids: operationalCentroids,
                },
                settlementEdges: graph.edges,
                eventDefinitions: loadDesktopEventDefinitions(baseDir),
            });
            assertTurnSuccess(result);
            const { nextState, report } = result;
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
    for (const corpsId of [...corpsMap.keys()].sort(strictCompare)) {
        const entry = corpsMap.get(corpsId)!;
        const metrics = computeFrontWidthMetrics(entry.settlements.size, entry.brigades.size);
        sectors.push({
            corps_id: corpsId,
            faction: entry.faction,
            brigade_ids: [...entry.brigades].sort(strictCompare),
            settlement_ids: [...entry.settlements].sort(strictCompare),
            front_width_score: metrics.front_width_score,
            overextended: metrics.overextended,
        });
    }
    return sectors;
}

// BATCH C §3.7: control_events is an optional IPC-bridge slot on
// PoliticalState. Helper accepts the typed `state.political` slot as `unknown` and walks
// down via `asRecord` / `asArray` from the Batch C0 schema_validators
// module. Returns an empty array when the parent or the field is missing
// or not an array — runtime-identical to the prior `Array.isArray(...)
// ? ... : []` ternary because the inner per-item narrowing inside
// queryBattleEvents still drops malformed entries.
function parseOptionalControlEvents(political: unknown): unknown[] {
    const parent = asRecord(political);
    if (parent === null) return [];
    return asArray(parent.control_events) ?? [];
}

/** Read-only query: normalized battle/control events sorted for deterministic replay. */
export function queryBattleEvents(
    state: GameState
): { turn: number; events: BattleEventQueryEntry[] } {
    const turn = state.meta?.turn ?? 0;
    const raw = parseOptionalControlEvents(state.political);
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
        const mech = strictCompare(a.mechanism, b.mechanism);
        if (mech !== 0) return mech;
        return strictCompare(a.settlement_id, b.settlement_id);
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

    const [brigades, municipalityHqSettlement, graph, operationalData] = await Promise.all([
        loadOobBrigades(baseDir),
        loadMunicipalityHqSettlement(baseDir),
        loadSettlementGraph(settlementGraphOptions(baseDir)),
        loadOperationalData(baseDir),
    ]);

    const brigade = brigades.find((b) => b.id === brigadeId);
    if (!brigade) {
        return { ok: false, error: `Brigade not found: ${brigadeId}` };
    }

    const context = buildRecruitmentContext(state, graph.settlements, municipalityHqSettlement, operationalData);
    const playerFaction = state.meta.player_faction;

    const result = recruitBrigade(
        state,
        brigade,
        cls,
        state.military.recruitment_state,
        context.sidToMun,
        context.municipalityHqSettlement,
        context.canonicalToOperational,
        playerFaction,
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

/** State-aware catalog used by the desktop player surface. */
export async function getPlayerRecruitmentCatalog(state: GameState, baseDir: string): Promise<{
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
        eligible: boolean;
        reason_codes: string[];
    }>;
}> {
    const [brigades, municipalityHqSettlement, graph, operationalData] = await Promise.all([
        loadOobBrigades(baseDir),
        loadMunicipalityHqSettlement(baseDir),
        loadSettlementGraph(settlementGraphOptions(baseDir)),
        loadOperationalData(baseDir),
    ]);
    const resources = state.military.recruitment_state;
    if (!resources) return { brigades: [] };
    const context = buildRecruitmentContext(state, graph.settlements, municipalityHqSettlement, operationalData);
    const playerFaction = state.meta.player_faction;

    return {
        brigades: brigades.map((brigade) => {
            const eligibility = evaluateRecruitmentEligibility(
                state,
                brigade,
                brigade.default_equipment_class,
                resources,
                context.sidToMun,
                context.municipalityHqSettlement,
                context.canonicalToOperational,
                playerFaction,
            );
            return {
                id: brigade.id,
                faction: brigade.faction,
                name: brigade.name,
                home_mun: brigade.home_mun,
                manpower_cost: brigade.manpower_cost,
                capital_cost: brigade.capital_cost,
                default_equipment_class: brigade.default_equipment_class,
                available_from: brigade.available_from,
                mandatory: brigade.mandatory,
                ...eligibility,
            };
        }),
    };
}

/** Re-export for main process (serialize/deserialize state for IPC). */
export {
    deserializeState,
    resolveEventDecision,
    resolvePlayerParamilitaryDecisions,
    serializeRuntimeState,
    serializeState,
};
export {
    PLAYER_DECISION_FAMILIES,
    summarizePlayerDecisions,
    countBlockingPlayerDecisions,
    listBlockingPlayerDecisions,
} from '../state/player_decision_manifest.js';

// TIER1-REPLAY-LIVE: browser-safe pure functions — no Node imports.
// Re-exported so electron-main.cjs can call sim.buildReplayFrameSummary /
// sim.buildReplaySaveManifest without an additional bundle entry.
export { buildReplayFrameSummary } from '../sim/replay/replay_frame_summary.js';
export { buildReplaySaveManifest } from '../sim/replay/replay_manifest.js';

function getReserveRequestId(request: {
    request_id?: string;
    turn_requested?: number;
    corps_id?: string;
    reason?: string;
}): string {
    return request.request_id ?? `req:${Number(request.turn_requested ?? 0)}:${String(request.corps_id ?? '')}:${String(request.reason ?? '')}`;
}

// ── Operation Prediction Query ─────────────────────────────────────────

import { buildOsidAdjacency } from '../sim/combat/osid_adjacency.js';
import { buildTerrainCache } from '../sim/combat/combat_predictor.js';
import {
    computeOperationPrediction,
    type OperationPredictionRequest,
    type OperationPredictionResponse,
} from '../sim/combat/operation_prediction.js';
import { planDirectiveOperation } from '../sim/turn_phases/war_phases.js';
import { hasAvailableSlot } from '../sim/combat/corps_operation_helpers.js';

/**
 * Read-only query: predict operation outcomes using the full combat predictor.
 * Loads operational data, builds adjacency + terrain cache, delegates to computeOperationPrediction.
 */
/** Cached operational data for prediction queries (immutable during gameplay). */
let cachedOpData: Awaited<ReturnType<typeof loadOperationalData>> | null = null;
let cachedEdges: Awaited<ReturnType<typeof loadOperationalEdges>> | null = null;

async function getCachedOsidAdjacency(baseDir: string): Promise<Map<Osid, Osid[]>> {
    if (!cachedEdges) cachedEdges = await loadOperationalEdges(baseDir);
    return buildOsidAdjacency(cachedEdges);
}

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

/**
 * Result of a force-op pushback OBJECTION query (Presidential Command Model
 * "force-op pushback"). Read-only: a candidate plan + the commander's predicted
 * judgment, computed on a deserialized-fresh state with ZERO mutation.
 *
 * `recommendedAction` is the commander's go/no-go from the predictor
 * ('launch' | 'delay' | 'abort'). The UI shows the disposition-tinted objection card
 * only when it is NOT 'launch'. When the candidate op cannot even be built
 * (no force / unreachable / already owned …) `rejectionReason` carries the plan
 * reason code and the prediction fields are 0 — the directive would no-op, so the UI
 * surfaces the rejection rather than a pushback.
 */
export interface DirectiveObjectionResult {
    /** Candidate plan reason code when the op could NOT be built (else undefined). */
    rejectionReason?: string;
    /** Predicted attacker:defender force ratio (0 when no candidate plan). */
    forceRatio: number;
    /** Predicted attacker casualties (0 when no candidate plan). */
    estimatedCasualties: number;
    /** Commander go/no-go recommendation; defaults to 'abort' when no candidate plan
     *  (an un-buildable directive is the strongest possible objection). */
    recommendedAction: 'launch' | 'delay' | 'abort';
}

/**
 * Read-only OBJECTION query for the REQUEST/force-op pushback card. Runs the SAME
 * auto-selection the consume step (`inject-op-directive`) would run — via the shared
 * pure `planDirectiveOperation` helper — to obtain a candidate plan WITHOUT mutating
 * state, then asks the existing combat predictor for the commander's force ratio,
 * casualty estimate, and go/no-go. The caller (electron-main IPC) deserializes a fresh
 * state, so this never touches the live GameState.
 *
 * Determinism: pure read; no Math.random / Date.now. Mirrors queryOperationPrediction's
 * data-loading and adjacency/terrain caches.
 */
export async function queryDirectiveObjection(
    state: GameState,
    payload: { corpsId: string; targetOsid: string },
    baseDir: string,
): Promise<DirectiveObjectionResult> {
    if (!cachedOpData) cachedOpData = await loadOperationalData(baseDir);
    if (!cachedEdges) cachedEdges = await loadOperationalEdges(baseDir);
    const adjacency = buildOsidAdjacency(cachedEdges);

    const cmd = state.military?.corps_command?.[payload.corpsId];
    if (!cmd) {
        return { rejectionReason: 'corps_not_found', forceRatio: 0, estimatedCasualties: 0, recommendedAction: 'abort' };
    }

    const plan = planDirectiveOperation(state, cmd, payload.corpsId, payload.targetOsid, adjacency as Map<string, string[]>);
    if (!plan.ok) {
        // An un-buildable directive would no-op (op_directive_rejection). Surface the
        // reason; recommend 'abort' (the strongest objection) so the UI does not stage it.
        return { rejectionReason: plan.reason, forceRatio: 0, estimatedCasualties: 0, recommendedAction: 'abort' };
    }

    // Mirror injectOpDirectives' SAME slot gate: a plan can be buildable yet still be
    // rejected at injection when the corps is at its operation-slot limit
    // (hasAvailableSlot). Without this, the predictor would report a launchable plan, the
    // UI would stage + debit command authority, and the directive would then fail with
    // 'no_available_slot' in the next war phase. Surface the rejection here so the
    // pre-commit query and the consume step agree.
    if (!hasAvailableSlot(cmd, plan.corpsBrigadeCount)) {
        return { rejectionReason: 'no_available_slot', forceRatio: 0, estimatedCasualties: 0, recommendedAction: 'abort' };
    }

    const terrain = await loadTerrainScalars(terrainScalarsPath(baseDir));
    const terrainCache = buildTerrainCache(cachedOpData.operationalToCanonical, terrain);

    const request: OperationPredictionRequest = {
        corpsId: payload.corpsId,
        axes: plan.axes.map((a) => ({
            axisId: a.axis_id,
            brigadeIds: a.assigned_brigades,
            objectiveOsids: a.objectives,
            stagingOsid: a.staging_osid,
        })),
        tempo: 'standard',
        artilleryPreparation: false,
    };

    const prediction = computeOperationPrediction(
        state,
        request,
        adjacency,
        cachedOpData.operationalToCanonical,
        terrainCache,
    );

    return {
        forceRatio: prediction.overall.forceRatio,
        estimatedCasualties: prediction.overall.totalEstimatedCasualties,
        recommendedAction: prediction.commanderAssessment.recommendation,
    };
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
    const formation = state.military.formations?.[brigadeId];
    if (!formation || (formation.kind ?? 'brigade') !== 'brigade' || !formation.faction) {
        return { valid: false, error: 'Invalid brigade' };
    }
    const factionId = formation.faction;
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
    let head = 0;
    while (head < queue.length) {
        const s = queue[head++]!;
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
    const factionId = formation.faction;
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
export async function approveReserveRequest(
    state: GameState,
    requestId: string,
    brigadeId: string,
    decisionReason?: string,
    baseDir?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
    const f = state.military.formations?.[brigadeId];
    if (!f) return { ok: false, error: `Brigade not found: ${brigadeId}` };
    if (!f.elite_loan_state) return { ok: false, error: `${brigadeId} is not an elite brigade` };
    if (f.elite_loan_state.on_loan) return { ok: false, error: `${brigadeId} is already on loan` };
    if (f.elite_loan_state.permanently_degraded) return { ok: false, error: `${brigadeId} has permanently lost elite status` };
    if (!baseDir) return { ok: false, error: 'Base directory required to validate reserve deployment route' };
    const pending = state.military.pending_reserve_requests ?? [];
    const req = pending.find((request) => getReserveRequestId(request) === requestId);
    if (!req) return { ok: false, error: `Reserve request not found: ${requestId}` };
    const corpsId = req.corps_id;
    if (typeof corpsId !== 'string' || corpsId.length === 0) {
        return { ok: false, error: `Reserve request ${requestId} has no corps owner` };
    }
    if (!canEliteLoanReachCorpsTerritory(state, brigadeId, corpsId, await getCachedOsidAdjacency(baseDir))) {
        return { ok: false, error: `No friendly route from ${brigadeId} to ${corpsId} sector territory` };
    }
    // ── ELITE-DEPLOY command-authority guard + debit (Presidential Command Model) ──
    // PLAYER IPC path ONLY. All deployability checks above (elite brigade exists, not
    // on loan / degraded, base dir present, request found, corps owner valid, friendly
    // route reachable) have passed — so reaching here means deployEliteLoan WILL succeed.
    // Ordering is therefore: validate deployability → CA guard → debit → deploy, which
    // guarantees the president is NEVER charged for a rejected approval.
    // `command_authority` is player-only and absent in headless/calibration, so the
    // entire guard is a no-op there (the bot/headless auto-deploy path is unaffected —
    // it never calls approveReserveRequest).
    const auth = state.military.command_authority;
    if (auth) {
        if (auth.current < ELITE_DEPLOY_COST) {
            return { ok: false, error: `insufficient_command_authority (${auth.current}/${ELITE_DEPLOY_COST})` };
        }
        auth.current -= ELITE_DEPLOY_COST;
        auth.spent_this_turn += ELITE_DEPLOY_COST;
        auth.lifetime_spent += ELITE_DEPLOY_COST;
    }
    const reason = req?.reason ?? 'offensive_support';
    const hops = req?.travel_hops ?? 0;
    const purpose = req?.purpose ?? 'defensive';
    const whyNeeded = req?.why_needed ?? req?.description ?? 'Corps requires immediate reinforcement.';
    const howToUse = req?.how_to_use ?? 'Stabilize front pressure and reinforce key sub-segments.';
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
    state.military.pending_reserve_requests = pending
        .filter((request) => getReserveRequestId(request) !== requestId)
        .map((request) => request.suggested_brigade_id === brigadeId
            ? { ...request, suggested_brigade_id: null }
            : request);
    return { ok: true };
}

/** Player declines a pending reserve request and records Army CO rationale. */
export function declineReserveRequest(
    state: GameState,
    requestId: string,
    reason?: string
): { ok: true } | { ok: false; error: string } {
    const pending = state.military.pending_reserve_requests ?? [];
    const req = pending.find((request) => getReserveRequestId(request) === requestId);
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
    state.military.pending_reserve_requests = pending.filter((request) => getReserveRequestId(request) !== requestId);
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
export async function redirectReserveLoan(
    state: GameState,
    brigadeId: string,
    newCorpsId: string,
    baseDir?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
    const f = state.military.formations?.[brigadeId];
    if (!f) return { ok: false, error: `Brigade not found: ${brigadeId}` };
    if (!f.elite_loan_state) return { ok: false, error: `${brigadeId} is not an elite brigade` };
    if (!baseDir) return { ok: false, error: 'Base directory required to validate reserve redeployment route' };
    if (!canEliteLoanReachCorpsTerritory(state, brigadeId, newCorpsId, await getCachedOsidAdjacency(baseDir))) {
        return { ok: false, error: `No friendly route from ${brigadeId} to ${newCorpsId} sector territory` };
    }
    if (f.elite_loan_state.on_loan) {
        recallEliteLoan(state, brigadeId, 'player_recall', state.meta.turn);
    }
    const req = state.military.pending_reserve_requests?.find(r => r.corps_id === newCorpsId);
    const reason = req?.reason ?? 'offensive_support';
    deployEliteLoan(state, brigadeId, newCorpsId, reason, 0, state.meta.turn);
    return { ok: true };
}
