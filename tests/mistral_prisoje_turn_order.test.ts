import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { loadOperationalCentroids, loadOperationalData, loadOperationalEdges } from '../src/data/operational_data.js';
import { computeFrontEdges } from '../src/map/front_edges.js';
import { loadSettlementGraph, type LoadedSettlementGraph } from '../src/map/settlements.js';
import { buildScenarioStartupState } from '../src/scenario/scenario_runner.js';
import { loadScenario } from '../src/scenario/scenario_loader.js';
import type { Scenario } from '../src/scenario/scenario_types.js';
import { BotManager } from '../src/sim/bot/bot_manager.js';
import { buildSettlementsByMun } from '../src/sim/early_war/control_strain.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { runNamedPhase } from '../src/sim/turn_pipeline.js';
import type { OperationalDataCache, TurnContext, TurnReport } from '../src/sim/turn_pipeline_types.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import { resetReasonCodeTopicCacheForTests } from '../src/sim/combat/reason_code_debug.js';
import {
    isDestinationAuthorizedByOperation,
    isMovementAuthorizedByCorpsReassignment,
    isRoutineScopeEnforcedForOrder,
    resolveRoutineMovementScope,
} from '../src/sim/combat/brigade_routine_scope.js';
import type { CorpsOperation, GameState } from '../src/state/game_state.js';

const ABB = 'hvo_1st_guard_abb';
const MALESEVCI = 'op:bosansko_grahovo:malesevci';
const BRAVNICE = 'op:jajce:bravnice';
const JAJCE_3 = 'op:jajce:jajce_3';
const LUPNICA = 'op:jajce:lupnica';
const BLOCKED_ROUTE_OSID = 'op:sipovo:gornji_mujdzici_2';
const ROUTE = [
    MALESEVCI,
    'op:bosansko_grahovo:crni_lug',
    'op:glamoc:halapic',
    'op:sipovo:brdjani',
    BLOCKED_ROUTE_OSID,
    'op:sipovo:pribeljci_2',
    BRAVNICE,
] as const;

type AbbObservation = {
    boundary: string;
    order: unknown;
    movement: unknown;
    location_osid: string | null;
};

type PortableInputs = {
    scenario: Scenario;
    startup: Awaited<ReturnType<typeof buildScenarioStartupState>>;
    operationalSettlementGraph: LoadedSettlementGraph;
    operationalData: OperationalDataCache;
};

type T3InputReceipt = {
    turn: number;
    order: unknown;
    assignment: unknown;
    assigned_sub_segment_id: string | null;
    loan: unknown;
    scope: { restricted: boolean; source: string; destinations: string[] };
    operation_authorized: boolean;
    reassignment_authorized: boolean;
    routine_scope_enforced: boolean;
};

let inputs: PortableInputs;

afterEach(() => {
    delete process.env.AWWV_DEBUG_REASON_CODES;
    resetReasonCodeTopicCacheForTests();
});

function observe(state: GameState, boundary: string): AbbObservation {
    return {
        boundary,
        order: structuredClone(state.military.brigade_movement_orders?.[ABB] ?? null),
        movement: structuredClone(state.military.brigade_movement_state?.[ABB] ?? null),
        location_osid: state.military.formations?.[ABB]?.location_osid ?? null,
    };
}

function mistralOperation(): CorpsOperation {
    return {
        name: 'Operation Mistral 2', type: 'sector_attack', phase: 'execution',
        started_turn: 175, phase_started_turn: 177, planning_duration: 4,
        participating_brigades: [ABB], objectives: [BRAVNICE], current_objective_index: 0,
        axes: [{
            axis_id: 'mistral_sipovo', name: 'mistral_sipovo', assigned_brigades: [ABB],
            objectives: [BRAVNICE], current_objective_index: 0, staging_osid: 'op:livno:livno_2',
            status: 'executing', failure_count: 0, consecutive_failures_on_current: 0,
            momentum: 3, attack_attempt_count: 11, objective_capture_count: 11,
            movement_only_execution_turns: 0, idle_execution_turn_streak: 0,
        }],
        min_attack_outcome: 'repulsed', occupies_on_victory: true,
    } as CorpsOperation;
}

function portableFixture(blockRoute = false): GameState {
    const state = structuredClone(inputs.startup.state);
    state.meta = { ...state.meta, turn: 184, seed: 'portable-prisoje-writer-order', phase: 'war' };
    state.military.formations ??= {};
    state.military.formations[ABB] = {
        id: ABB, name: "1st Guards Brigade 'Ante Bruno Bušić'", faction: 'HRHB',
        created_turn: 0, assignment: null,
        kind: 'brigade', status: 'active', readiness: 'active', corps_id: 'hvo_main_staff',
        location_osid: MALESEVCI, personnel: 2800, max_personnel: 2800,
        cohesion: 45, morale: 91, posture: 'defend',
        composition: {
            infantry: 800, tanks: 9, artillery: 10, aa_systems: 2,
            tank_condition: { operational: 0.077, degraded: 0.8315, non_operational: 0.0915 },
            artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
        },
        elite_loan_state: {
            on_loan: true,
            loaned_to_corps: 'hvo_tomislavgrad',
            loan_start_turn: 175,
            last_recall_turn: null,
            loan_start_personnel: 2800,
            permanently_degraded: false,
            current_episode_id: 0,
        },
    };
    state.military.brigade_movement_orders = {
        ...(state.military.brigade_movement_orders ?? {}),
        [ABB]: { destination_sids: [BRAVNICE], owner: 'bot_discretionary', stance: 'column' },
    };
    delete state.military.brigade_movement_state?.[ABB];
    for (const osid of ROUTE) state.political.political_controllers![osid] = 'HRHB';
    if (blockRoute) state.political.political_controllers![BLOCKED_ROUTE_OSID] = 'RS';
    state.military.corps_command ??= {};
    const command = state.military.corps_command.hvo_tomislavgrad ??= {
        command_span: 14, subordinate_count: 14, og_slots: 2, active_ogs: [],
        stance: 'offensive', corps_exhaustion: 0, active_operations: [],
    };
    command.active_operations = [mistralOperation()];
    return state;
}

// Portable current-source projection. Retained n80 save_w184.json (raw SHA-256
// e97ed2e154be0738773e326392347741d7aa17e730138b1f669008d045a879b4) supplies
// ABB's order, formation/loan/assignment identifiers, Mistral commitments and route control.
// The retained save persists corps_front_sectors as an empty object. The non-empty Maleševci-only
// sector below is wholly injected counterfactual topology used to exercise branch selectivity; it
// is not recovered historical topology. The named-phase fixture also skips private T1/T2 inputs,
// so its rejection cannot establish the historical n80 predicate.
function counterfactualTurn184Projection(options: { includeBravniceInScope?: boolean; blockRoute?: boolean } = {}): GameState {
    const state = portableFixture(options.blockRoute ?? false);
    state.military.corps_command!.hvo_main_staff ??= {
        command_span: 0, subordinate_count: 0, og_slots: 0, active_ogs: [],
        stance: 'balanced', corps_exhaustion: 0, active_operations: [],
    };
    const formation = state.military.formations![ABB]!;
    formation.assignment = { kind: 'sector', role: 'front', sector_id: 'sector:hvo_tomislavgrad:0' };
    formation.assigned_sub_segment_id = 'subseg:sector:hvo_tomislavgrad:0:0';
    state.military.corps_front_sectors = {
        'sector:hvo_tomislavgrad:0': {
            sector_id: 'sector:hvo_tomislavgrad:0', corps_id: 'hvo_tomislavgrad', faction: 'HRHB',
            opposing_factions: ['RS'], edge_ids: [`${MALESEVCI}__${LUPNICA}`], length_edges: 1,
            territory_osids: [MALESEVCI], assigned_brigade_ids: [ABB], reserve_brigade_ids: [],
            rear_brigade_ids: [], density: 1, threat_ratio: 1, defensive_power: 2800,
            sector_stance: 'defend', stance_source: 'bot',
            sub_segments: [{
                sub_segment_id: 'subseg:sector:hvo_tomislavgrad:0:0',
                edge_ids: [`${MALESEVCI}__${LUPNICA}`],
                friendly_osids: options.includeBravniceInScope ? [MALESEVCI, BRAVNICE] : [MALESEVCI],
                enemy_osids: [LUPNICA], primary_brigade_ids: [ABB], length_edges: 1,
            }],
        },
    };
    const operation = state.military.corps_command!.hvo_tomislavgrad!.active_operations[0]!;
    operation.participating_brigades = [
        'hv_112th_infantry_1995', 'hv_1st_hgz_1995', 'hv_4th_guards_split', ABB,
        'hvo_3rd_guard_jastrebovi',
    ];
    operation.objectives = [
        'op:jajce:barevo_2', BRAVNICE, JAJCE_3, 'op:jajce:jezero_2', LUPNICA,
        'op:jajce:prisoje', 'op:jajce:vinac_2', 'op:sipovo:brdjani',
        'op:sipovo:gornji_mujdzici_2', 'op:sipovo:pribeljci_2',
        'op:sipovo:sipovo_2', 'op:sipovo:volari_2', 'op:titov_drvar:drvar_2',
        'op:titov_drvar:sipovljani_2',
    ];
    operation.axes = [
        {
            axis_id: 'mistral_drvar_grahovo', name: 'Drvar / Grahovo Axis',
            assigned_brigades: ['hv_112th_infantry_1995', 'hv_4th_guards_split', 'hvo_3rd_guard_jastrebovi'],
            objectives: ['op:titov_drvar:drvar_2', 'op:titov_drvar:sipovljani_2'], current_objective_index: 0,
            staging_osid: 'op:livno:misi_2', status: 'executing', failure_count: 0,
            consecutive_failures_on_current: 0, momentum: 0, attack_attempt_count: 0,
            objective_capture_count: 0, movement_only_execution_turns: 0, idle_execution_turn_streak: 0,
        },
        {
            axis_id: 'mistral_sipovo', name: 'Sipovo Axis', assigned_brigades: ['hv_1st_hgz_1995', ABB],
            objectives: [
                'op:sipovo:brdjani', 'op:sipovo:gornji_mujdzici_2', 'op:sipovo:sipovo_2',
                'op:sipovo:volari_2', 'op:sipovo:pribeljci_2', BRAVNICE,
                'op:jajce:vinac_2', JAJCE_3, LUPNICA, 'op:jajce:barevo_2',
                'op:jajce:jezero_2', 'op:jajce:prisoje',
            ],
            current_objective_index: 8,
            staging_osid: 'op:livno:livno_2', status: 'executing', failure_count: 0,
            consecutive_failures_on_current: 0, momentum: 3, attack_attempt_count: 8,
            objective_capture_count: 8, movement_only_execution_turns: 0, idle_execution_turn_streak: 0,
        },
    ];
    // Match every Lupnica-neighbor controller in retained authoritative n80
    // runs/apr1992_definitive_188w__6deb5845c150c196__w188_n80/save_w184.json
    // (8,704,869 bytes; SHA-256 e97ed2e154be0738773e326392347741d7aa17e730138b1f669008d045a879b4): barevo_2,
    // divicani_2 and kruscica are RS; jajce_3 is HRHB. This preserves the fixture's explicitly
    // counterfactual one-cell sector topology while using retained control truth for approach
    // selection. Livno_2 remains staging, outside the Lupnica-neighbor set.
    state.political.political_controllers![JAJCE_3] = 'HRHB';
    state.political.political_controllers![LUPNICA] = 'RS';
    state.political.political_controllers!['op:jajce:barevo_2'] = 'RS';
    state.political.political_controllers!['op:jajce:divicani_2'] = 'RS';
    state.political.political_controllers!['op:jajce:kruscica'] = 'RS';
    return state;
}

async function runToColumnMovement(state: GameState): Promise<{
    observations: AbbObservation[];
    report: TurnReport;
    t3Input: T3InputReceipt;
}> {
    const observations = [observe(state, 'bounded-counterfactual-post-184')];
    const botManager = new BotManager({
        seed: `${state.meta.seed}:smart-bots`,
        difficulty: inputs.scenario.bot_difficulty,
        scenarioStartWeek: inputs.scenario.scenario_start_week,
    });
    botManager.runBots(state, computeFrontEdges(state, inputs.startup.graph.edges), {
        edges: inputs.startup.graph.edges,
        sidToMun: inputs.startup.sidToMun,
        settlementsByMun: buildSettlementsByMun(inputs.startup.graph.settlements),
    });
    observations.push(observe(state, 'scenario-bot-manager'));

    state.meta = { ...state.meta, turn: state.meta.turn + 1 };
    const report: TurnReport = { seed: state.meta.seed, phases: [] };
    const context: TurnContext = {
        state,
        rng: () => { throw new Error('Engine Invariants 11.1 prohibits simulation randomness'); },
        report,
        input: {
            seed: state.meta.seed,
            settlementGraph: inputs.startup.graph,
            operationalSettlementGraph: inputs.operationalSettlementGraph,
            operationalData: inputs.operationalData,
            settlementEdges: inputs.startup.graph.edges,
            municipalityPopulation1991: inputs.startup.municipalityPopulation1991,
            settlementPopulationBySid: inputs.startup.settlementPopulationBySid,
            settlementDataRaw: inputs.startup.settlementDataRaw,
            municipalityHqSettlement: inputs.startup.municipalityHqSettlement,
            historicalNameLookup: inputs.startup.historicalNameLookup,
            historicalCorpsLookup: inputs.startup.historicalCorpsLookup,
            historicalOobIdLookup: inputs.startup.historicalOobIdLookup,
            eventDefinitions: loadEventDefinitions(inputs.scenario.scenario_start_week ?? 0),
        },
    };
    const movementIndex = warPhases.findIndex((phase) => phase.name === 'osid-column-movement');
    expect(movementIndex).toBeGreaterThan(0);
    for (const phase of warPhases.slice(0, movementIndex)) {
        await runNamedPhase(context, phase, 'war');
        observations.push(observe(state, phase.name));
    }
    const adjacency = new Map<string, string[]>();
    for (const edge of inputs.operationalData.edges) {
        const a = edge.a as string;
        const b = edge.b as string;
        if (!adjacency.has(a)) adjacency.set(a, []);
        if (!adjacency.has(b)) adjacency.set(b, []);
        adjacency.get(a)!.push(b);
        adjacency.get(b)!.push(a);
    }
    const formation = state.military.formations![ABB]!;
    const order = state.military.brigade_movement_orders?.[ABB];
    const destination = order?.destination_sids?.[0] ?? '';
    const scope = resolveRoutineMovementScope(state, formation, 'routing');
    const t3Input: T3InputReceipt = {
        turn: state.meta.turn,
        order: structuredClone(order ?? null),
        assignment: structuredClone(formation.assignment ?? null),
        assigned_sub_segment_id: formation.assigned_sub_segment_id ?? null,
        loan: structuredClone(formation.elite_loan_state ?? null),
        scope: { restricted: scope.restricted, source: scope.source, destinations: [...scope.destinations].sort() },
        operation_authorized: isDestinationAuthorizedByOperation(
            state, ABB, destination, adjacency, inputs.operationalData.opData.operationalToCanonical,
        ),
        reassignment_authorized: isMovementAuthorizedByCorpsReassignment(
            state, formation, destination, adjacency, inputs.operationalData.opData.operationalToCanonical,
        ),
        routine_scope_enforced: isRoutineScopeEnforcedForOrder(
            state, formation, order, adjacency, inputs.operationalData.opData.operationalToCanonical,
        ),
    };
    const movementPhase = warPhases[movementIndex]!;
    await runNamedPhase(context, movementPhase, 'war');
    observations.push(observe(state, movementPhase.name));
    return { observations, report, t3Input };
}

async function runSelectedTurn185Boundaries(state: GameState): Promise<{
    observations: AbbObservation[];
    report: TurnReport;
    t3Input: T3InputReceipt;
}> {
    process.env.AWWV_DEBUG_REASON_CODES = 'movement_reject,dispatcher_decision';
    resetReasonCodeTopicCacheForTests();
    const result = await runToColumnMovement(state);
    // Once T3 identifies the first boundary, jump only to the two requested later owners. This
    // distinguishes T6 and the following bot actor without reconstructing skipped combat/front
    // writers; consequently the retained end-185 Jajce_3 replacement remains unproven here.
    for (const phaseName of ['commander-correct-march-orders', 'generate-bot-brigade-orders']) {
        const phase = warPhases.find((candidate) => candidate.name === phaseName);
        expect(phase).toBeDefined();
        await runNamedPhase({
            state,
            rng: () => { throw new Error('Engine Invariants 11.1 prohibits simulation randomness'); },
            report: result.report,
            input: {
                seed: state.meta.seed,
                settlementGraph: inputs.startup.graph,
                operationalSettlementGraph: inputs.operationalSettlementGraph,
                operationalData: inputs.operationalData,
                settlementEdges: inputs.startup.graph.edges,
                municipalityPopulation1991: inputs.startup.municipalityPopulation1991,
                settlementPopulationBySid: inputs.startup.settlementPopulationBySid,
                settlementDataRaw: inputs.startup.settlementDataRaw,
                municipalityHqSettlement: inputs.startup.municipalityHqSettlement,
                historicalNameLookup: inputs.startup.historicalNameLookup,
                historicalCorpsLookup: inputs.startup.historicalCorpsLookup,
                historicalOobIdLookup: inputs.startup.historicalOobIdLookup,
                eventDefinitions: loadEventDefinitions(inputs.scenario.scenario_start_week ?? 0),
            },
        }, phase!, 'war');
        result.observations.push(observe(state, phaseName));
    }
    return result;
}

function firstMutation(observations: AbbObservation[]): AbbObservation | undefined {
    const initial = JSON.stringify({ ...observations[0], boundary: '' });
    return observations.slice(1).find((entry) => JSON.stringify({ ...entry, boundary: '' }) !== initial);
}

beforeAll(async () => {
    const scenario = await loadScenario('data/scenarios/apr1992_definitive_188w.json');
    const startup = await buildScenarioStartupState(scenario, process.cwd(), 'portable-prisoje-writer-order');
    const [edges, opData, centroids, operationalSettlementGraph] = await Promise.all([
        loadOperationalEdges(), loadOperationalData(), loadOperationalCentroids(),
        loadSettlementGraph({
            settlementsPath: 'data/derived/operational/operational_settlements.geojson',
            edgesPath: 'data/derived/operational/operational_contact_graph.json',
        }),
    ]);
    inputs = { scenario, startup, operationalSettlementGraph, operationalData: { opData, edges, centroids } };
});

describe('645 — portable Prisoje caller and writer order', () => {
    it('preserves the bounded ABB order until the real column-movement phase starts it', async () => {
        const { observations, report } = await runToColumnMovement(portableFixture());
        expect(firstMutation(observations)?.boundary).toBe('osid-column-movement');
        expect(observations.at(-2)).toMatchObject({
            boundary: 'prestage-deferred-historical-elites',
            order: { destination_sids: [BRAVNICE], owner: 'bot_discretionary', stance: 'column' },
            movement: null, location_osid: MALESEVCI,
        });
        expect(observations.at(-1)).toMatchObject({
            boundary: 'osid-column-movement', order: null, location_osid: MALESEVCI,
            movement: {
                destination_sids: [BRAVNICE], owner: 'bot_discretionary', stance: 'column',
                status: 'in_transit', path: [...ROUTE], turns_remaining: 4,
            },
        });
        expect(report.phase_skip_diagnostics ?? []).toEqual([]);
    });

    it('blocks the same order when one intermediate route OSID is hostile', async () => {
        const { observations, report } = await runToColumnMovement(portableFixture(true));
        expect(firstMutation(observations)?.boundary).toBe('osid-column-movement');
        expect(observations.at(-2)).toMatchObject({
            order: { destination_sids: [BRAVNICE], owner: 'bot_discretionary', stance: 'column' },
            movement: null, location_osid: MALESEVCI,
        });
        expect(observations.at(-1)).toMatchObject({
            boundary: 'osid-column-movement', order: null, movement: null, location_osid: MALESEVCI,
        });
        expect(report.column_movement?.column_blocked).toBeGreaterThan(0);
    });

    it('749 counterfactual: injected one-cell scope reconciles the stale Bravnice order to the sealed current approach before T3', async () => {
        const state = counterfactualTurn184Projection();
        const commitments = structuredClone({
            home: state.military.corps_command!.hvo_main_staff!.active_operations,
            loan: state.military.corps_command!.hvo_tomislavgrad!.active_operations,
        });
        const initialLoan = structuredClone(state.military.formations![ABB]!.elite_loan_state);
        const { observations, report, t3Input } = await runSelectedTurn185Boundaries(state);
        expect(t3Input).toMatchObject({
            turn: 185,
            order: { destination_sids: [BRAVNICE], owner: 'bot_discretionary', stance: 'column' },
            assignment: { kind: 'sector', role: 'front', sector_id: 'sector:hvo_tomislavgrad:0' },
            assigned_sub_segment_id: 'subseg:sector:hvo_tomislavgrad:0:0',
            loan: { on_loan: true, loaned_to_corps: 'hvo_tomislavgrad' },
            scope: { restricted: true, source: 'assigned_sub_segment', destinations: [MALESEVCI] },
            operation_authorized: false,
            reassignment_authorized: false,
            routine_scope_enforced: true,
        });
        expect(observations.find((entry) => entry.boundary === 'osid-column-movement')).toMatchObject({
            order: null, location_osid: MALESEVCI,
            movement: { destination_sids: [JAJCE_3], owner: 'bot_discretionary', status: 'in_transit' },
        });
        expect(report.column_movement?.column_rejections ?? []).not.toContainEqual(expect.objectContaining({
            formation_id: ABB,
        }));
        expect(observations.find((entry) => entry.boundary === 'commander-correct-march-orders')).toMatchObject({
            order: null,
            movement: { destination_sids: [JAJCE_3], owner: 'bot_discretionary', status: 'in_transit' },
        });
        const botDetail = report.bot_order_diagnostics?.dispatcher_decision_details?.find((entry) => entry.formation_id === ABB);
        expect(botDetail)
            .toMatchObject({
                eligibility: 'eligible', corps_id: 'hvo_tomislavgrad', operation_name: 'Operation Mistral 2',
                operation_axis_id: 'mistral_sipovo',
            });
        expect(observations.find((entry) => entry.boundary === 'generate-bot-brigade-orders')).toMatchObject({
            order: null,
            movement: { destination_sids: [JAJCE_3], owner: 'bot_discretionary', status: 'in_transit' },
            location_osid: MALESEVCI,
        });
        expect(botDetail?.first_handler).not.toBeNull();
        expect(botDetail?.snapshot_output).toMatchObject({ column_march_destination_osid: null });
        expect(state.military.formations![ABB]!.elite_loan_state).toEqual(initialLoan);
        expect({
            home: state.military.corps_command!.hvo_main_staff!.active_operations,
            loan: state.military.corps_command!.hvo_tomislavgrad!.active_operations,
        }).toEqual(commitments);
    });

    it('749 controls: an admitted front-scope destination reaches transit while a hostile route rejects without changing commitments', async () => {
        const authorized = counterfactualTurn184Projection({ includeBravniceInScope: true });
        const authorizedCommitments = structuredClone(authorized.military.corps_command!.hvo_tomislavgrad!.active_operations);
        const authorizedResult = await runToColumnMovement(authorized);
        expect(authorizedResult.observations.at(-1)).toMatchObject({
            boundary: 'osid-column-movement', order: null, location_osid: MALESEVCI,
            movement: { destination_sids: [BRAVNICE], status: 'in_transit' },
        });
        expect(authorized.military.corps_command!.hvo_tomislavgrad!.active_operations).toEqual(authorizedCommitments);

        const hostile = counterfactualTurn184Projection({ includeBravniceInScope: true, blockRoute: true });
        const hostileCommitments = structuredClone(hostile.military.corps_command!.hvo_tomislavgrad!.active_operations);
        process.env.AWWV_DEBUG_REASON_CODES = 'movement_reject';
        resetReasonCodeTopicCacheForTests();
        const hostileResult = await runToColumnMovement(hostile);
        expect(hostileResult.report.column_movement?.column_rejections).toContainEqual(expect.objectContaining({
            formation_id: ABB, reason: 'no_friendly_path', destination_osid: BRAVNICE,
        }));
        expect(hostile.military.brigade_movement_state?.[ABB]).toBeUndefined();
        expect(hostile.military.corps_command!.hvo_tomislavgrad!.active_operations).toEqual(hostileCommitments);
    });
});
