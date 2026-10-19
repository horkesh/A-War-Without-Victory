import { beforeAll, describe, expect, it } from 'vitest';

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
import type { CorpsOperation, GameState } from '../src/state/game_state.js';

const ABB = 'hvo_1st_guard_abb';
const MALESEVCI = 'op:bosansko_grahovo:malesevci';
const BRAVNICE = 'op:jajce:bravnice';
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

let inputs: PortableInputs;

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

async function runToColumnMovement(state: GameState): Promise<{
    observations: AbbObservation[];
    report: TurnReport;
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
    for (const phase of warPhases.slice(0, movementIndex + 1)) {
        await runNamedPhase(context, phase, 'war');
        observations.push(observe(state, phase.name));
    }
    return { observations, report };
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
});
