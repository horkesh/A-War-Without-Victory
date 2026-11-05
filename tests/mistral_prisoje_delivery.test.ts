import { describe, expect, it } from 'vitest';

import { loadOperationalData, loadOperationalEdges } from '../src/data/operational_data.js';
import { loadTerrainScalars } from '../src/map/terrain_scalars_node.js';
import { generateAllBotOrdersOsid } from '../src/sim/combat/bot_brigade_ai_osid.js';
import { findBrigadeOperationAnywhere } from '../src/sim/combat/corps_operation_helpers.js';
import { processJnaWithdrawals } from '../src/sim/combat/jna_phantom_brigades.js';
import { processOsidColumnMovement } from '../src/sim/combat/osid_column_movement.js';
import { MISTRAL_2_95_OPPORTUNITY } from '../src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { CorpsOperation, GameState, OperationAxis } from '../src/state/game_state.js';

const HGZ = 'hv_1st_hgz_1995';
const ABB = 'hvo_1st_guard_abb';
const OPERATION_ID = 'hvo_tomislavgrad:Operation Mistral 2:t175';
const MALESEVCI = 'op:bosansko_grahovo:malesevci';
const BRAVNICE = 'op:jajce:bravnice';
const JEZERO = 'op:jajce:jezero_2';
const PRISOJE = 'op:jajce:prisoje';
const MISTRAL_SIPOVO_OBJECTIVES = [
    'op:sipovo:brdjani',
    'op:sipovo:gornji_mujdzici_2',
    'op:sipovo:sipovo_2',
    'op:sipovo:volari_2',
    'op:sipovo:pribeljci_2',
    BRAVNICE,
    'op:jajce:vinac_2',
    'op:jajce:jajce_3',
    'op:jajce:lupnica',
    'op:jajce:barevo_2',
    JEZERO,
    PRISOJE,
] as const;

// Minimal actual n75 scalar slice copied from retained evidence; CI never reads ignored run files.
// Source: save_w187.json raw SHA-256 390f9f04a53c49e79eb9506c2ffcb53c7528fc58eed2917f24e255d578a85cbe.
// Cross-check: 638-prisoje-clock-supplement.json raw SHA-256
// 3264b4ac3bac66c87440072995bdf1b82a46e38026fba7be13be7d3c5a657ffa.
const ACTUAL_N75_T187 = {
    turn: 187,
    operation: {
        id: OPERATION_ID,
        started_turn: 175,
        phase_started_turn: 177,
        participating_brigades: [
            'hv_112th_infantry_1995', HGZ, 'hv_4th_guards_split', ABB, 'hvo_3rd_guard_jastrebovi',
        ],
        other_axis_brigades: ['hv_112th_infantry_1995', 'hv_4th_guards_split', 'hvo_3rd_guard_jastrebovi'],
        sipovo_axis_brigades: [HGZ, ABB],
        sipovo_objective_index: 11,
        sipovo_objective: PRISOJE,
    },
    hgz: {
        kind: 'hv_phantom', status: 'active', created_turn: 174, withdrawal_turn: 188,
        location_osid: JEZERO, personnel: 539, cohesion: 100, morale: 100, fatigue: 30,
    },
    abb: {
        corps_id: 'hvo_main_staff', status: 'active', location_osid: MALESEVCI,
        personnel: 2800, cohesion: 45, morale: 91, fatigue: 0,
        movement: {
            status: 'in_transit', stance: 'column', owner: 'bot_discretionary', turns_remaining: 4,
            destination_sids: [BRAVNICE],
            path: [
                MALESEVCI,
                'op:bosansko_grahovo:crni_lug',
                'op:glamoc:halapic',
                'op:sipovo:brdjani',
                'op:sipovo:gornji_mujdzici_2',
                'op:sipovo:pribeljci_2',
                BRAVNICE,
            ],
        },
    },
} as const;

function axis(axis_id: string, assigned_brigades: string[], objectives: string[], current: number): OperationAxis {
    return {
        axis_id, name: axis_id, assigned_brigades: [...assigned_brigades], objectives: [...objectives],
        current_objective_index: current, staging_osid: 'op:livno:livno_2', status: 'executing',
        failure_count: 0, consecutive_failures_on_current: 0, momentum: 3,
        attack_attempt_count: 11, objective_capture_count: 11,
        movement_only_execution_turns: 0, idle_execution_turn_streak: 0,
    };
}

function retainedTurn187State(): GameState {
    const routeControls = Object.fromEntries(ACTUAL_N75_T187.abb.movement.path.map((osid) => [osid, 'HRHB']));
    const sipovo = axis(
        'mistral_sipovo',
        [...ACTUAL_N75_T187.operation.sipovo_axis_brigades],
        [JEZERO, PRISOJE],
        1,
    );
    const other = axis(
        'mistral_drvar_grahovo',
        [...ACTUAL_N75_T187.operation.other_axis_brigades],
        ['op:titov_drvar:drvar_2', 'op:titov_drvar:sipovljani_2'],
        2,
    );
    other.status = 'complete';
    const operation = {
        name: 'Operation Mistral 2', type: 'sector_attack', phase: 'execution',
        started_turn: 175, phase_started_turn: 177, planning_duration: 4,
        participating_brigades: [...ACTUAL_N75_T187.operation.participating_brigades],
        objectives: [JEZERO, PRISOJE], current_objective_index: 1,
        axes: [other, sipovo], min_attack_outcome: 'repulsed', occupies_on_victory: true,
    } as CorpsOperation;
    return {
        schema_version: 0,
        meta: { turn: 187, phase: 'war', seed: 'retained-n75-prisoje-slice' },
        factions: [{ id: 'HRHB' }, { id: 'RS' }] as GameState['factions'],
        political: {
            political_controllers: { ...routeControls, [JEZERO]: 'HRHB', [PRISOJE]: 'RS' },
            control_events: [],
        },
        military: {
            formations: {
                [HGZ]: {
                    id: HGZ, name: 'HV 1st Croatian Guards Corps (1. HGZ)', faction: 'HRHB',
                    corps_id: 'hvo_tomislavgrad', kind: 'hv_phantom', status: 'active', readiness: 'overextended',
                    created_turn: 174, withdrawal_turn: 188, location_osid: JEZERO,
                    personnel: 539, cohesion: 100, morale: 100, fatigue: 30,
                    equipment: { infantry: 539, tanks: 25, artillery: 25, air_defense: 0 },
                    composition: {
                        infantry: 539, tanks: 25, artillery: 25, aa_systems: 0,
                        tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
                        artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
                    },
                },
                [ABB]: {
                    id: ABB, name: "1st Guards Brigade 'Ante Bruno Busic'", faction: 'HRHB',
                    corps_id: 'hvo_main_staff', kind: 'brigade', status: 'active', readiness: 'active',
                    location_osid: MALESEVCI, personnel: 2800, cohesion: 45, morale: 91, fatigue: 0,
                    posture: 'defend', equipment: { infantry: 2800, tanks: 9, artillery: 10, air_defense: 2 },
                    assignment: { kind: 'sector', role: 'front', sector_id: 'sector:hvo_tomislavgrad:0' },
                    assigned_sub_segment_id: 'subseg:sector:hvo_tomislavgrad:0:0',
                    composition: {
                        infantry: 800, tanks: 9, artillery: 10, aa_systems: 2,
                        tank_condition: { operational: 0.077, degraded: 0.8315, non_operational: 0.0915 },
                        artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
                    },
                    elite_loan_state: { on_loan: true, loaned_to_corps: 'hvo_tomislavgrad' },
                },
            },
            corps_command: {
                hvo_tomislavgrad: { stance: 'offensive', corps_exhaustion: 0, active_operations: [operation] },
                hvo_main_staff: { stance: 'balanced', corps_exhaustion: 0, active_operations: [] },
            },
            front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {},
            militia_pools: {}, brigade_attack_orders: {}, brigade_movement_orders: {}, brigade_posture_orders: [],
            brigade_movement_state: { [ABB]: structuredClone(ACTUAL_N75_T187.abb.movement) },
        },
        displacement: {},
    } as unknown as GameState;
}

function operation(state: GameState): CorpsOperation {
    return state.military.corps_command!.hvo_tomislavgrad!.active_operations[0]!;
}

function sipovoAxis(state: GameState): OperationAxis {
    return operation(state).axes!.find((candidate) => candidate.axis_id === 'mistral_sipovo')!;
}

const ROUTE_EDGES: EdgeRecord[] = ACTUAL_N75_T187.abb.movement.path.slice(1).map((to, index) => ({
    edge_id: `retained-route-${index}`,
    a: ACTUAL_N75_T187.abb.movement.path[index]!,
    b: to,
}) as EdgeRecord);

describe('641 — Prisoje retained roster and delivery clock', () => {
    it('pins the retained actors and confirms Mistral 2 has no authored handoff replacement', () => {
        expect(ACTUAL_N75_T187).toMatchObject({
            turn: 187,
            operation: {
                id: OPERATION_ID, sipovo_axis_brigades: [HGZ, ABB],
                sipovo_objective_index: 11, sipovo_objective: PRISOJE,
            },
            hgz: { withdrawal_turn: 188, location_osid: JEZERO },
            abb: {
                location_osid: MALESEVCI,
                movement: { destination_sids: [BRAVNICE], turns_remaining: 4, status: 'in_transit' },
            },
        });
        expect(MISTRAL_2_95_OPPORTUNITY.axes?.some((candidate) => candidate.phase_gate?.handoff)).toBe(false);
    });

    it('starts the copied save-184 Bravnice order through the normal tracked route, while a broken route blocks', async () => {
        // save_w184 raw SHA-256: 5ce77a0b6f60095721b5fc68c20c434f0bd1861d1e2f119f6d922e449d0a45a5.
        // The retained save has ABB at Malesevci, deployed, with this exact bot_discretionary
        // column order and no movement_state. All seven cells of the later retained path are HRHB.
        // This portable control proves the movement seam can consume those copied fields; it does
        // not reconstruct the missing live rejection/writer/ordering record from turns 183-186.
        const edges = await loadOperationalEdges();
        const reverseMap = (await loadOperationalData()).operationalToCanonical;
        const terrain = await loadTerrainScalars();
        const makePending = () => {
            const state = retainedTurn187State();
            state.meta.turn = 184;
            delete state.military.brigade_movement_state;
            state.military.brigade_movement_orders = {
                [ABB]: { destination_sids: [BRAVNICE], owner: 'bot_discretionary', stance: 'column' },
            };
            sipovoAxis(state).objectives = [...MISTRAL_SIPOVO_OBJECTIVES];
            sipovoAxis(state).current_objective_index = 8;
            return state;
        };

        const clear = makePending();
        const started = processOsidColumnMovement(clear, edges, reverseMap, terrain);
        expect(started).toMatchObject({ column_starts: 1, column_blocked: 0, column_arrivals: 0 });
        expect(clear.military.brigade_movement_state?.[ABB]).toMatchObject({
            destination_sids: [BRAVNICE], status: 'in_transit', turns_remaining: 4,
        });
        expect(clear.military.formations![ABB]!.location_osid).toBe(MALESEVCI);

        const blocked = makePending();
        blocked.political.political_controllers!['op:sipovo:gornji_mujdzici_2'] = 'RS';
        const rejected = processOsidColumnMovement(blocked, ROUTE_EDGES, reverseMap, terrain);
        expect(rejected).toMatchObject({ column_starts: 0, column_blocked: 1 });
        expect(blocked.military.brigade_movement_state?.[ABB]).toBeUndefined();
        expect(blocked.military.formations![ABB]!.location_osid).toBe(MALESEVCI);
    });

    it('advances only the retained transit, skips retasking, then withdraws HGZ without replacement', () => {
        const state = retainedTurn187State();
        const beforePolitical = structuredClone(state.political);
        const beforeOtherAxis = structuredClone(operation(state).axes![0]!.assigned_brigades);
        state.meta.turn = 188;

        const movement = processOsidColumnMovement(state, ROUTE_EDGES, new Map(), { by_sid: {} });
        expect(movement).toMatchObject({ column_advances: 1, column_arrivals: 0, column_starts: 0 });
        expect(state.military.formations![ABB]!.location_osid).toBe(MALESEVCI);
        expect(state.military.brigade_movement_state?.[ABB]).toMatchObject({
            destination_sids: [BRAVNICE], turns_remaining: 3, owner: 'bot_discretionary', status: 'in_transit',
        });

        generateAllBotOrdersOsid(state, ['HRHB'], {
            edges: ROUTE_EDGES,
            reverseMap: new Map(),
            supplyStateByOsid: {} as never,
            osidPopulationMap: new Map(),
        }, { brigadeFilter: (formation) => formation.id === ABB });
        expect(state.military.brigade_attack_orders?.[ABB]).toBeUndefined();
        expect(state.military.brigade_movement_orders?.[ABB]).toBeUndefined();
        expect(state.military.brigade_movement_state?.[ABB]?.destination_sids).toEqual([BRAVNICE]);

        const withdrawals = processJnaWithdrawals(state);
        expect(withdrawals.map((event) => event.phantom_id)).toContain(HGZ);
        expect(state.military.formations?.[HGZ]).toBeUndefined();
        expect(sipovoAxis(state).assigned_brigades).toEqual([ABB]);
        expect(operation(state).participating_brigades).toEqual(
            ACTUAL_N75_T187.operation.participating_brigades.filter((id) => id !== HGZ),
        );
        expect(operation(state).axes![0]!.assigned_brigades).toEqual(beforeOtherAxis);
        expect(findBrigadeOperationAnywhere(state, ABB)).toMatchObject({ corps_id: 'hvo_tomislavgrad' });
        expect(state.political).toEqual(beforePolitical);
    });

    it('keeps the same unreset four-tick march physical: Bravnice arrival is turn 191, not turn 188', () => {
        const state = retainedTurn187State();
        const beforePolitical = structuredClone(state.political);
        const observations: Array<{ turn: number; location: string | undefined; remaining: number | null }> = [];
        for (const turn of [188, 189, 190, 191]) {
            state.meta.turn = turn;
            processOsidColumnMovement(state, ROUTE_EDGES, new Map(), { by_sid: {} });
            observations.push({
                turn,
                location: state.military.formations![ABB]!.location_osid,
                remaining: state.military.brigade_movement_state?.[ABB]?.turns_remaining ?? null,
            });
        }
        expect(observations).toEqual([
            { turn: 188, location: MALESEVCI, remaining: 3 },
            { turn: 189, location: MALESEVCI, remaining: 2 },
            { turn: 190, location: MALESEVCI, remaining: 1 },
            { turn: 191, location: BRAVNICE, remaining: null },
        ]);
        expect(state.political).toEqual(beforePolitical);
        expect(state.political.political_controllers![PRISOJE]).toBe('RS');
    });
});
