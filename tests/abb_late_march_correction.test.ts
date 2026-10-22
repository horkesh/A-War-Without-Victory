import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { loadOperationalData, loadOperationalEdges } from '../src/data/operational_data.js';
import { generateAllBotOrdersOsid } from '../src/sim/combat/bot_brigade_ai_osid.js';
import { correctTransitStates } from '../src/sim/combat/commander_march_correction.js';
import { processOsidColumnMovement } from '../src/sim/combat/osid_column_movement.js';
import {
    getOperationAuthorizedDestinations,
    isDestinationAuthorizedByOperation,
    isMovementAuthorizedByCorpsReassignment,
    resolveRoutineMovementScope,
} from '../src/sim/combat/brigade_routine_scope.js';
import { resetReasonCodeTopicCacheForTests } from '../src/sim/combat/reason_code_debug.js';
import type { CorpsOperation, GameState } from '../src/state/game_state.js';

const ABB = 'hvo_1st_guard_abb';
const MALESEVCI = 'op:bosansko_grahovo:malesevci';
const CRNI_LUG = 'op:bosansko_grahovo:crni_lug';
const HALAPIC = 'op:glamoc:halapic';
const BRAVNICE = 'op:jajce:bravnice';
const LUPNICA = 'op:jajce:lupnica';
const ROUTE = [
    MALESEVCI, CRNI_LUG, HALAPIC,
    'op:sipovo:brdjani', 'op:sipovo:gornji_mujdzici_2',
    'op:sipovo:pribeljci_2', BRAVNICE,
];

let edges: Awaited<ReturnType<typeof loadOperationalEdges>>;
let reverseMap: Awaited<ReturnType<typeof loadOperationalData>>['operationalToCanonical'];
let adjacency: Map<string, string[]>;

beforeAll(async () => {
    [edges, { operationalToCanonical: reverseMap }] = await Promise.all([
        loadOperationalEdges(), loadOperationalData(),
    ]);
    adjacency = new Map();
    for (const edge of edges) {
        const a = edge.a as string;
        const b = edge.b as string;
        if (!adjacency.has(a)) adjacency.set(a, []);
        if (!adjacency.has(b)) adjacency.set(b, []);
        adjacency.get(a)!.push(b);
        adjacency.get(b)!.push(a);
    }
});

afterEach(() => {
    delete process.env.AWWV_DEBUG_REASON_CODES;
    resetReasonCodeTopicCacheForTests();
});

function mistral2(): CorpsOperation {
    return {
        name: 'Operation Mistral 2', type: 'sector_attack', phase: 'execution',
        started_turn: 175, phase_started_turn: 177, planning_duration: 4,
        participating_brigades: [
            'hv_112th_infantry_1995', 'hv_1st_hgz_1995', 'hv_4th_guards_split',
            ABB, 'hvo_3rd_guard_jastrebovi',
        ],
        objectives: [
            'op:jajce:barevo_2', BRAVNICE, 'op:jajce:jajce_3', 'op:jajce:jezero_2',
            LUPNICA, 'op:jajce:prisoje', 'op:jajce:vinac_2', 'op:sipovo:brdjani',
            'op:sipovo:gornji_mujdzici_2', 'op:sipovo:pribeljci_2',
            'op:sipovo:sipovo_2', 'op:sipovo:volari_2',
            'op:titov_drvar:drvar_2', 'op:titov_drvar:sipovljani_2',
        ],
        current_objective_index: 0,
        axes: [
            {
                axis_id: 'mistral_drvar_grahovo', name: 'Drvar / Grahovo Axis',
                assigned_brigades: ['hv_112th_infantry_1995', 'hv_4th_guards_split', 'hvo_3rd_guard_jastrebovi'],
                objectives: ['op:titov_drvar:drvar_2', 'op:titov_drvar:sipovljani_2'],
                current_objective_index: 0, staging_osid: 'op:livno:misi_2', status: 'executing',
                failure_count: 0, consecutive_failures_on_current: 0, momentum: 0,
                attack_attempt_count: 0, objective_capture_count: 0,
                movement_only_execution_turns: 0, idle_execution_turn_streak: 0,
            },
            {
                axis_id: 'mistral_sipovo', name: 'Sipovo Axis',
                assigned_brigades: ['hv_1st_hgz_1995', ABB],
                objectives: [
                    'op:sipovo:brdjani', 'op:sipovo:gornji_mujdzici_2', 'op:sipovo:sipovo_2',
                    'op:sipovo:volari_2', 'op:sipovo:pribeljci_2', BRAVNICE,
                    'op:jajce:vinac_2', 'op:jajce:jajce_3', LUPNICA,
                    'op:jajce:barevo_2', 'op:jajce:jezero_2', 'op:jajce:prisoje',
                ],
                current_objective_index: 8, staging_osid: 'op:livno:livno_2', status: 'executing',
                failure_count: 0, consecutive_failures_on_current: 0, momentum: 3,
                attack_attempt_count: 8, objective_capture_count: 8,
                movement_only_execution_turns: 0, idle_execution_turn_streak: 0,
            },
        ],
        min_attack_outcome: 'repulsed', occupies_on_victory: true,
    } as CorpsOperation;
}

function fixture(destination = BRAVNICE): GameState {
    const controllers: Record<string, 'HRHB' | 'RS'> = {};
    for (const osid of ROUTE) controllers[osid] = 'HRHB';
    controllers[LUPNICA] = 'RS';
    return {
        meta: { turn: 184, phase: 'war', seed: 'abb-late-march-correction', headless_scenario_auto_control: true },
        political: { political_controllers: controllers, control_events: [] },
        factions: [],
        displacement: { settlement_displacement: {}, municipality_displacement: {}, displacement_state: {} },
        military: {
            formations: {
                [ABB]: {
                    id: ABB, name: "1st Guards Brigade 'Ante Bruno Busic'", faction: 'HRHB',
                    kind: 'brigade', status: 'active', readiness: 'active', corps_id: 'hvo_main_staff',
                    location_osid: MALESEVCI, personnel: 2800, max_personnel: 2800,
                    cohesion: 48.5, morale: 92, posture: 'defend', assigned_sub_segment_id: 'subseg:sector:hvo_tomislavgrad:0:0',
                    elite_loan_state: { on_loan: true, loaned_to_corps: 'hvo_tomislavgrad', loan_start_turn: 160, last_recall_turn: 154, loan_start_personnel: 2800, permanently_degraded: false, current_episode_id: 1 },
                },
            },
            corps_command: {
                hvo_main_staff: { command_span: 0, subordinate_count: 0, og_slots: 0, active_ogs: [], stance: 'balanced', corps_exhaustion: 0, active_operations: [] },
                hvo_tomislavgrad: {
                    command_span: 5, subordinate_count: 5, og_slots: 0, active_ogs: [], stance: 'balanced', corps_exhaustion: 0,
                    active_operations: [mistral2()],
                    directive: { assigned_front_ids: [], offensive_targets: [LUPNICA], hold_osids: [], avoid_osids: [], max_attackers_per_target: 2, reserve_fraction: 0, min_attack_outcome: 'repulsed', aggression_modifier: 0 },
                },
            },
            corps_front_sectors: {
                'sector:hvo_tomislavgrad:0': {
                    sector_id: 'sector:hvo_tomislavgrad:0', corps_id: 'hvo_tomislavgrad', faction: 'HRHB', opposing_factions: ['RS'],
                    edge_ids: [`${MALESEVCI}__${LUPNICA}`], length_edges: 1, territory_osids: [MALESEVCI],
                    assigned_brigade_ids: [ABB], reserve_brigade_ids: [], rear_brigade_ids: [], density: 1, threat_ratio: 1, defensive_power: 2800,
                    sector_stance: 'attack', stance_source: 'bot',
                    sub_segments: [{ sub_segment_id: 'subseg:sector:hvo_tomislavgrad:0:0', edge_ids: [`${MALESEVCI}__${LUPNICA}`], friendly_osids: [MALESEVCI], enemy_osids: [LUPNICA], primary_brigade_ids: [ABB], length_edges: 1 }],
                },
            },
            brigade_attack_orders: {}, brigade_posture_orders: [], brigade_movement_orders: {},
            brigade_movement_state: {
                [ABB]: { status: 'in_transit', destination_sids: [destination], path: destination === BRAVNICE ? ROUTE : [MALESEVCI], turns_remaining: 4, stance: 'column', owner: 'bot_discretionary' },
            },
        },
    } as unknown as GameState;
}

function firstAcceptedMistralTransit(): GameState {
    const state = fixture(HALAPIC);
    state.meta.turn = 178;
    state.military.brigade_movement_state![ABB] = {
        status: 'in_transit', destination_sids: [HALAPIC], path: [MALESEVCI, CRNI_LUG, HALAPIC],
        turns_remaining: 2, stance: 'column', owner: 'bot_discretionary',
    };
    const operation = state.military.corps_command!.hvo_tomislavgrad!.active_operations[0]!;
    const axis = operation.axes!.find((candidate) => candidate.axis_id === 'mistral_sipovo')!;
    axis.current_objective_index = 2;
    axis.objective_capture_count = 2;
    operation.current_objective_index = 2;
    operation.objective_capture_count = 2;
    return state;
}

describe('ABB late march correction and following bot-order writer', () => {
    it('retains the first accepted same-axis approach transit after HGZ advances the captured prefix', () => {
        const state = firstAcceptedMistralTransit();
        const before = structuredClone(state.military.brigade_movement_state?.[ABB]);

        expect(isDestinationAuthorizedByOperation(state, ABB, HALAPIC, adjacency)).toBe(false);
        correctTransitStates(state, adjacency);
        expect(state.military.brigade_movement_state?.[ABB]).toEqual(before);

        processOsidColumnMovement(state, edges, reverseMap, { by_sid: {} }, adjacency);
        expect(state.military.brigade_movement_state?.[ABB]).toMatchObject({
            destination_sids: [HALAPIC], status: 'in_transit', turns_remaining: 1,
        });
        expect(state.military.formations?.[ABB]?.location_osid).toBe(MALESEVCI);
    });

    it('cancels completed-prefix transit for an ordinary non-loan formation', () => {
        const state = firstAcceptedMistralTransit();
        delete state.military.formations![ABB]!.elite_loan_state;
        state.military.corps_command!.hvo_main_staff!.active_operations =
            state.military.corps_command!.hvo_tomislavgrad!.active_operations;
        state.military.corps_command!.hvo_tomislavgrad!.active_operations = [];
        correctTransitStates(state, adjacency);

        expect(state.military.brigade_movement_state?.[ABB]).toBeUndefined();
    });

    it.each([
        ['invalid loan receiver', (state: GameState) => {
            state.military.formations![ABB]!.elite_loan_state!.loaned_to_corps = 'missing_corps';
        }],
        ['duplicate operation membership', (state: GameState) => {
            state.military.corps_command!.hvo_main_staff!.active_operations = [structuredClone(mistral2())];
        }],
        ['incomplete capture prefix', (state: GameState) => {
            state.military.corps_command!.hvo_tomislavgrad!.active_operations[0]!.axes![1]!.objective_capture_count = 1;
        }],
        ['unfriendly completed objective', (state: GameState) => {
            state.political.political_controllers!['op:sipovo:brdjani'] = 'RS';
        }],
        ['hostile transit destination', (state: GameState) => {
            state.political.political_controllers![HALAPIC] = 'RS';
        }],
        ['broken transit path', (state: GameState) => {
            state.military.brigade_movement_state![ABB]!.path = [MALESEVCI, HALAPIC];
        }],
        ['unrelated pending order', (state: GameState) => {
            state.military.brigade_movement_orders![ABB] = { destination_sids: [BRAVNICE], stance: 'column', owner: 'bot_discretionary' };
        }],
        ['ended operation', (state: GameState) => {
            state.military.corps_command!.hvo_tomislavgrad!.active_operations[0]!.phase = 'recovery';
        }],
        ['held axis', (state: GameState) => {
            state.military.corps_command!.hvo_tomislavgrad!.active_operations[0]!.axes![1]!.status = 'stalled';
        }],
        ['wrong axis', (state: GameState) => {
            const operation = state.military.corps_command!.hvo_tomislavgrad!.active_operations[0]!;
            operation.axes![1]!.assigned_brigades = operation.axes![1]!.assigned_brigades.filter((id) => id !== ABB);
            operation.axes![0]!.assigned_brigades.push(ABB);
        }],
    ] as const)('cancels rather than broadening authority for %s', (_label, mutate) => {
        const state = firstAcceptedMistralTransit();
        mutate(state);

        correctTransitStates(state, adjacency);

        expect(state.military.brigade_movement_state?.[ABB]).toBeUndefined();
    });

    it('preserves an active-loan operation march and the following bot skips replacement', () => {
        const state = fixture();
        const beforeCommitments = structuredClone({
            main: state.military.corps_command?.hvo_main_staff?.active_operations,
            loan: state.military.corps_command?.hvo_tomislavgrad?.active_operations,
        });
        const beforeTransit = structuredClone(state.military.brigade_movement_state?.[ABB]);
        const formation = state.military.formations![ABB]!;
        const scope = resolveRoutineMovementScope(state, formation, 'correction');
        expect({ restricted: scope.restricted, destinations: [...scope.destinations] }).toEqual({ restricted: true, destinations: [MALESEVCI] });
        expect(scope.destinations.has(formation.location_osid!)).toBe(true);
        expect(scope.destinations.has(BRAVNICE)).toBe(false);
        expect(isDestinationAuthorizedByOperation(state, ABB, BRAVNICE, adjacency)).toBe(true);
        expect(isMovementAuthorizedByCorpsReassignment(state, formation, BRAVNICE, adjacency)).toBe(false);

        correctTransitStates(state, adjacency);
        expect(state.military.brigade_movement_state?.[ABB]).toEqual(beforeTransit);
        expect(state.military.brigade_movement_orders?.[ABB]).toBeUndefined();

        process.env.AWWV_DEBUG_REASON_CODES = 'dispatcher_decision';
        resetReasonCodeTopicCacheForTests();
        const result = generateAllBotOrdersOsid(state, ['HRHB'], { edges, reverseMap, adjacency }, {});
        const detail = result.dispatcher_decision_details?.find((entry) => entry.formation_id === ABB);
        expect(detail).toMatchObject({
            eligibility: 'eligible', corps_id: 'hvo_tomislavgrad', operation_name: 'Operation Mistral 2',
            operation_axis_id: 'mistral_sipovo', first_handler: 'active_column_skip',
            transit_status: 'in_transit', persistent_destination_osids: [BRAVNICE],
        });
        expect(state.military.corps_command?.hvo_main_staff?.active_operations).toEqual(beforeCommitments.main);
        expect(state.military.corps_command?.hvo_tomislavgrad?.active_operations).toEqual(beforeCommitments.loan);
        expect(state.military.brigade_movement_state?.[ABB]).toEqual(beforeTransit);
        expect(state.military.brigade_movement_orders?.[ABB]).toBeUndefined();
    });

    it('strict loan-operation context authorizes only the retained staging and later-objective Bravnice approach', () => {
        const state = fixture();
        const operation = state.military.corps_command?.hvo_tomislavgrad?.active_operations[0];
        expect(operation).toBeDefined();
        const authorized = getOperationAuthorizedDestinations(
            state, ABB, operation, adjacency, reverseMap,
        );
        expect([...authorized].sort()).toEqual([
            BRAVNICE,
            'op:livno:livno_2',
        ]);
        expect(authorized.has(BRAVNICE)).toBe(true);
        expect(operation?.axes?.find((axis) => axis.axis_id === 'mistral_sipovo')?.current_objective_index).toBe(8);
    });

    it('keeps active-loan ownership lookup strict', () => {
        const dormant = fixture();
        dormant.military.formations![ABB]!.elite_loan_state!.on_loan = false;
        expect(isDestinationAuthorizedByOperation(dormant, ABB, BRAVNICE, adjacency)).toBe(false);

        const absent = fixture();
        delete absent.military.formations![ABB]!.elite_loan_state;
        expect(isDestinationAuthorizedByOperation(absent, ABB, BRAVNICE, adjacency)).toBe(false);

        const homeOwned = fixture();
        delete homeOwned.military.formations![ABB]!.elite_loan_state;
        homeOwned.military.corps_command!.hvo_main_staff!.active_operations = [mistral2()];
        expect(isDestinationAuthorizedByOperation(homeOwned, ABB, BRAVNICE, adjacency)).toBe(true);

        const nonparticipant = fixture();
        const nonparticipantOp = nonparticipant.military.corps_command!.hvo_tomislavgrad!.active_operations[0]!;
        nonparticipantOp.participating_brigades = nonparticipantOp.participating_brigades.filter((id) => id !== ABB);
        for (const axis of nonparticipantOp.axes ?? []) {
            axis.assigned_brigades = axis.assigned_brigades.filter((id) => id !== ABB);
        }
        expect(isDestinationAuthorizedByOperation(nonparticipant, ABB, BRAVNICE, adjacency)).toBe(false);

        const wrongAxis = fixture();
        const wrongAxisOp = wrongAxis.military.corps_command!.hvo_tomislavgrad!.active_operations[0]!;
        wrongAxisOp.axes![1]!.assigned_brigades = wrongAxisOp.axes![1]!.assigned_brigades.filter((id) => id !== ABB);
        wrongAxisOp.axes![0]!.assigned_brigades.push(ABB);
        expect(isDestinationAuthorizedByOperation(wrongAxis, ABB, BRAVNICE, adjacency)).toBe(false);

        const wrongPhase = fixture();
        wrongPhase.military.corps_command!.hvo_tomislavgrad!.active_operations[0]!.phase = 'recovery';
        expect(isDestinationAuthorizedByOperation(wrongPhase, ABB, BRAVNICE, adjacency)).toBe(false);

        expect(isDestinationAuthorizedByOperation(fixture(), ABB, LUPNICA, adjacency)).toBe(false);
    });

    it('control: changing only the transit destination to the valid current front preserves transit through correction', () => {
        const state = fixture(MALESEVCI);
        correctTransitStates(state, adjacency);
        expect(state.military.brigade_movement_state?.[ABB]).toMatchObject({ destination_sids: [MALESEVCI], status: 'in_transit' });
    });
});
