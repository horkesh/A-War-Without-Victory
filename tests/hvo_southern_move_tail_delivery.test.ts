import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { resolveAttackOrdersOsid } from '../src/sim/combat/attack_resolution_osid.js';
import { generateAllBotOrdersOsid } from '../src/sim/combat/bot_brigade_ai_osid.js';
import { SOUTHERN_MOVE_95_OPPORTUNITY } from '../src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.js';
import {
    applyOpportunityDecisionDetailed,
    preflightOpportunityAdmission,
} from '../src/sim/combat/operation_opportunities.js';
import { advanceLatePhaseGates, buildAttackOrderOwner } from '../src/sim/combat/operation_phase_gate.js';
import { processOsidColumnMovement } from '../src/sim/combat/osid_column_movement.js';
import { updateSectorOffensiveResults } from '../src/sim/combat/sector_offensive.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { CorpsOperation, FactionId, GameState, OperationAxis } from '../src/state/game_state.js';

const GERZOVO = 'op:mrkonjic_grad:gerzovo_2';
const MAJDAN = 'op:mrkonjic_grad:majdan_2';
const PODRASNICA = 'op:mrkonjic_grad:podrasnica_2';
const MRKONJIC = 'op:mrkonjic_grad:mrkonjic_grad_2';
const BJELAJCE = 'op:mrkonjic_grad:bjelajce_2';
const BALJVINE = 'op:mrkonjic_grad:baljvine_2';
const DONJI_VRBLJANI = 'op:kljuc:donji_vrbljani_2';
const DONOR = 'hv_5th_guards_karlovac';
const FORWARD_DONOR = 'F_HRHB_0001';
const OP_ID = 'hvo_tomislavgrad:Operation Southern Move:t182';
const ACTUAL_N74_SAVE_W184_SHA256 = 'af1056ccfbeb45de3b2584548db6aff55f807c388bdc710ac41291e18049ac96';
const ACTUAL_N74_SAVE_W186_SHA256 = '7d9d481f57d6e34e4b2e8bea89ac65accc6c02abc04dcb508fb6ba13cb9dab96';
const ACTUAL_N74_WEEKLY_REPORT_SHA256 = 'f66dea46d0a068d7da225cc1af2061d63019b1dfe2a7d1be8e8841f5ab838ca5';

/** Portable exact fields extracted from retained n74 save_w186 and weekly_report.jsonl. */
const ACTUAL_N74_FORWARD_DONOR_T186 = {
    formation: {
        id: FORWARD_DONOR, name: 'Kralj Tomislav Brigade', faction: 'HRHB', status: 'active',
        readiness: 'active', location_osid: MAJDAN, personnel: 2851, cohesion: 46,
        morale: 98, posture: 'attack',
    },
    movement_state: null,
    attack_order: null,
    movement_order: null,
    operation: {
        id: OP_ID, name: 'Operation Southern Move', type: 'sector_attack', phase: 'execution',
        started_turn: 182, phase_started_turn: 186, axis_id: 'southern_move_mrkonjic',
        axis_status: 'executing', current_objective_index: 1,
        assigned: true, participating: true, other_planning_or_execution_commitments: [] as string[],
    },
    gate_receipt: {
        osid: MAJDAN, turn: 186,
        battle_id: '186:op:mrkonjic_grad:majdan_2:F_HRHB_0001:rs_16th_krajina_motorized',
        attacker_brigade: FORWARD_DONOR, operation_id: OP_ID, axis_id: 'southern_move_mrkonjic',
    },
} as const;

const ACTUAL_N74_RECORDED_PREFIX = [
    { turn: 187, target: PODRASNICA, issuer: FORWARD_DONOR, operation_id: OP_ID },
    { turn: 188, target: MRKONJIC, issuer: FORWARD_DONOR, operation_id: OP_ID },
] as const;

function contactEdges(): EdgeRecord[] {
    return (JSON.parse(readFileSync(
        'data/derived/operational/operational_contact_graph.json',
        'utf8',
    )) as { edges: EdgeRecord[] }).edges;
}

function brigade(id: string, location_osid: string, faction: FactionId = 'HRHB') {
    return {
        id, name: id, faction, kind: 'brigade', status: 'active', readiness: 'active',
        corps_id: faction === 'HRHB' ? 'hvo_tomislavgrad' : 'vrs_1st_krajina',
        personnel: 3000, cohesion: 85, morale: 90, experience: 0.6, posture: 'attack',
        location_osid, hq_sid: location_osid,
        equipment: { infantry: 3000, tanks: 10, artillery: 15, air_defense: 2 },
        composition: {
            infantry: 3000, tanks: 10, artillery: 15, aa_systems: 2,
            tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
            artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
        },
    };
}

function axis(axis_id: string, assigned_brigades: string[], objectives: string[]): OperationAxis {
    return {
        axis_id, name: axis_id, assigned_brigades, objectives, current_objective_index: 0,
        staging_osid: GERZOVO, status: 'executing', failure_count: 0,
        consecutive_failures_on_current: 0, momentum: 0, attack_attempt_count: 0,
        objective_capture_count: 0, movement_only_execution_turns: 0, idle_execution_turn_streak: 0,
    };
}

/**
 * Constructed production-mechanics fixture. It intentionally supplies uniform friendly strength,
 * invented weak defenders, and a preloaded t186 receipt; it is not a retained n74 state slice or
 * a turn-184 counterfactual. Retained facts are carried separately above so CI reads no ignored run.
 */
function constructedMechanicsState(handoffDonor = DONOR): GameState {
    const ids = [
        'F_HRHB_0001',
        'hrhb_kralj_petar_kreimir_iv_brigade',
        'hv_1st_guards_tigers',
        DONOR,
        'hvo_rama_brigade',
    ];
    const main = axis('southern_move_mrkonjic', ids, [MAJDAN, PODRASNICA, MRKONJIC]);
    main.current_objective_index = 1;
    const tail = axis('southern_move_bjelajce_baljvine', [], [BJELAJCE, BALJVINE]);
    tail.late_phase = {
        phase: 'holding', main_axis_id: main.axis_id, requires: [MAJDAN],
        gated_objectives: [BJELAJCE, BALJVINE], receipts: [{
            osid: MAJDAN, turn: 186,
            battle_id: '186:op:mrkonjic_grad:majdan_2:F_HRHB_0001:rs_22nd_krajina_infantry',
            attacker_brigade: 'F_HRHB_0001', operation_id: OP_ID, axis_id: main.axis_id,
        }],
        handoff: { brigade_id: handoffDonor, source_axis_id: main.axis_id },
    };
    const operation = {
        name: 'Operation Southern Move', type: 'sector_attack', phase: 'execution',
        started_turn: 182, phase_started_turn: 186, planning_duration: 2,
        participating_brigades: ids, objectives: [MAJDAN, PODRASNICA, MRKONJIC, BJELAJCE, BALJVINE],
        current_objective_index: 1, axes: [main, tail], min_attack_outcome: 'repulsed',
        occupies_on_victory: true,
    } as CorpsOperation;
    return {
        schema_version: 0,
        meta: { turn: 186, phase: 'war', seed: 'constructed-southern-move-tail-mechanics' },
        factions: [{ id: 'HRHB' }, { id: 'RS' }] as GameState['factions'],
        political: { political_controllers: {
            [GERZOVO]: 'HRHB', [MAJDAN]: 'HRHB', [PODRASNICA]: 'RS', [MRKONJIC]: 'RS',
            [BJELAJCE]: 'RS', [BALJVINE]: 'RS',
        }, control_events: [] },
        military: {
            formations: {
                hvo_tomislavgrad: { ...brigade('hvo_tomislavgrad', GERZOVO), kind: 'corps' },
                F_HRHB_0001: brigade('F_HRHB_0001', MAJDAN),
                hrhb_kralj_petar_kreimir_iv_brigade: brigade('hrhb_kralj_petar_kreimir_iv_brigade', GERZOVO),
                hv_1st_guards_tigers: brigade('hv_1st_guards_tigers', 'op:sipovo:sipovo_2'),
                [DONOR]: brigade(DONOR, GERZOVO),
                hvo_rama_brigade: brigade('hvo_rama_brigade', GERZOVO),
                rs_bjelajce_defender: {
                    ...brigade('rs_bjelajce_defender', BJELAJCE, 'RS'),
                    personnel: 150, cohesion: 20, morale: 20, experience: 0.1, posture: 'defend',
                },
                rs_baljvine_defender: {
                    ...brigade('rs_baljvine_defender', BALJVINE, 'RS'),
                    personnel: 150, cohesion: 20, morale: 20, experience: 0.1, posture: 'defend',
                },
            },
            corps_command: { hvo_tomislavgrad: {
                stance: 'offensive', corps_exhaustion: 0, active_operations: [operation],
            } },
            front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {},
            militia_pools: {}, brigade_attack_orders: {}, brigade_movement_orders: {}, brigade_posture_orders: [],
            casualty_ledger: initializeCasualtyLedger(['HRHB', 'RS']),
        },
        displacement: {},
    } as unknown as GameState;
}

function operation(state: GameState): CorpsOperation {
    return state.military.corps_command!.hvo_tomislavgrad!.active_operations[0]!;
}

function destination(state: GameState): OperationAxis {
    return operation(state).axes!.find((candidate) => candidate.axis_id === 'southern_move_bjelajce_baljvine')!;
}

function activate(state: GameState): void {
    advanceLatePhaseGates(state, operation(state), 'hvo_tomislavgrad', 'HRHB', 186);
}

function southernMoveAdmissionState(aliasTags: string[] = ['oob:hrhb_kralj_tomislav_brigade']): GameState {
    const state = constructedMechanicsState();
    state.meta.turn = 182;
    state.military.corps_command!.hvo_tomislavgrad!.active_operations = [];
    state.military.formations![FORWARD_DONOR]!.tags = aliasTags;
    state.military.operation_opportunities = [{
        opportunity_id: SOUTHERN_MOVE_95_OPPORTUNITY.opportunity_id,
        proposal_id: 'OPP_182_southern_move_95',
        eligibility_turn: 182,
        expires_turn: 188,
        status: 'eligible_pending_review',
        approver_faction: 'HRHB',
        last_axis_evaluation: [],
    }];
    return state;
}

function approveSouthernMove(state: GameState) {
    return applyOpportunityDecisionDetailed(
        state,
        182,
        'OPP_182_southern_move_95',
        'approve',
        [SOUTHERN_MOVE_95_OPPORTUNITY],
    );
}

describe('test-only Southern Move Bjelajce-Baljvine handoff feasibility', () => {
    it('authors the approved Southern Move main axis and empty gated tail without changing operation identity', () => {
        expect(ACTUAL_N74_SAVE_W184_SHA256).toHaveLength(64);
        expect(SOUTHERN_MOVE_95_OPPORTUNITY.axes).toHaveLength(3);
        expect(SOUTHERN_MOVE_95_OPPORTUNITY.axes[0]).toMatchObject({
            axis_id: 'southern_move_mrkonjic',
            objectives: [GERZOVO, MAJDAN, PODRASNICA, MRKONJIC],
            staging_osid: 'op:sipovo:sipovo_2',
        });
        expect(SOUTHERN_MOVE_95_OPPORTUNITY.axes[1]).toEqual(expect.objectContaining({
            axis_id: 'southern_move_bjelajce_baljvine',
            brigades: [],
            objectives: [BJELAJCE, BALJVINE],
            phase_gate: {
                main_axis_id: 'southern_move_mrkonjic',
                requires_operation_captures: [MAJDAN],
                handoff: {
                    brigade_id: 'hrhb_kralj_tomislav_brigade',
                    source_axis_id: 'southern_move_mrkonjic',
                },
            },
        }));
        expect(SOUTHERN_MOVE_95_OPPORTUNITY.axes[2]).toEqual(expect.objectContaining({
            axis_id: 'southern_move_donji_vrbljani',
            brigades: [],
            objectives: [DONJI_VRBLJANI],
            phase_gate: {
                main_axis_id: 'southern_move_mrkonjic',
                requires_operation_captures: [PODRASNICA],
                handoff: {
                    brigade_id: 'hvo_rama_brigade',
                    source_axis_id: 'southern_move_mrkonjic',
                },
            },
        }));
        expect(SOUTHERN_MOVE_95_OPPORTUNITY.name).toBe('Operation Southern Move');
    });

    it('binds the canonical Tomislav handoff to the unique actual runtime OOB alias at admission and spawn', () => {
        const state = southernMoveAdmissionState();

        expect(preflightOpportunityAdmission(state, SOUTHERN_MOVE_95_OPPORTUNITY)).toMatchObject({
            admitted: true,
            selected_participants: 5,
        });
        const outcome = approveSouthernMove(state);
        expect(outcome).toMatchObject({ decision_applied: true, reason: null });
        const spawned = state.military.corps_command!.hvo_tomislavgrad!.active_operations[0]!;
        expect(spawned.name).toBe('Operation Southern Move');
        expect(spawned.axes).toHaveLength(3);
        expect(spawned.axes![0]!.assigned_brigades).toContain(FORWARD_DONOR);
        const bjelajce = spawned.axes!.find((axis) => axis.axis_id === 'southern_move_bjelajce_baljvine')!;
        const donji = spawned.axes!.find((axis) => axis.axis_id === 'southern_move_donji_vrbljani')!;
        expect(bjelajce.late_phase?.handoff).toEqual({
            brigade_id: FORWARD_DONOR,
            source_axis_id: 'southern_move_mrkonjic',
        });
        expect(donji).toMatchObject({
            assigned_brigades: [], objectives: [DONJI_VRBLJANI],
            late_phase: {
                phase: 'holding', main_axis_id: 'southern_move_mrkonjic',
                requires: [PODRASNICA], gated_objectives: [DONJI_VRBLJANI],
                handoff: { brigade_id: 'hvo_rama_brigade', source_axis_id: 'southern_move_mrkonjic' },
            },
        });
        expect(spawned.participating_brigades.filter((id) => id === 'hvo_rama_brigade')).toHaveLength(1);
    });

    it('keeps exact runtime identity ahead of an OOB alias for the handoff binding', () => {
        const state = southernMoveAdmissionState();
        state.military.formations!.hrhb_kralj_tomislav_brigade = {
            ...state.military.formations![FORWARD_DONOR]!,
            id: 'hrhb_kralj_tomislav_brigade',
            tags: [],
        };
        expect(preflightOpportunityAdmission(state, SOUTHERN_MOVE_95_OPPORTUNITY).selected_participants).toBe(5);
        approveSouthernMove(state);
        const spawned = state.military.corps_command!.hvo_tomislavgrad!.active_operations[0]!;
        expect(spawned.axes).toHaveLength(3);
        expect(spawned.axes!.find((axis) => axis.axis_id === 'southern_move_bjelajce_baljvine')!.late_phase?.handoff?.brigade_id)
            .toBe('hrhb_kralj_tomislav_brigade');
        expect(spawned.axes!.find((axis) => axis.axis_id === 'southern_move_donji_vrbljani')!.late_phase?.handoff?.brigade_id)
            .toBe('hvo_rama_brigade');
    });

    it.each([
        ['missing', [] as string[], false],
        ['ambiguous', ['oob:hrhb_kralj_tomislav_brigade'] as string[], true],
    ] as const)('rejects the gated tail for a %s canonical handoff binding', (_label, tags, duplicate) => {
        const state = southernMoveAdmissionState(tags);
        if (duplicate) {
            state.military.formations!.F_HRHB_9999 = {
                ...state.military.formations![FORWARD_DONOR]!,
                id: 'F_HRHB_9999',
            };
        }
        approveSouthernMove(state);
        const spawned = state.military.corps_command!.hvo_tomislavgrad!.active_operations[0]!;
        expect(spawned.axes).toHaveLength(2);
        expect(spawned.axes!.map((axis) => axis.axis_id)).toEqual([
            'southern_move_mrkonjic',
            'southern_move_donji_vrbljani',
        ]);
        expect(spawned.axes![1]).toMatchObject({
            assigned_brigades: [], objectives: [DONJI_VRBLJANI],
            late_phase: {
                main_axis_id: 'southern_move_mrkonjic', gated_objectives: [DONJI_VRBLJANI],
                handoff: { brigade_id: 'hvo_rama_brigade', source_axis_id: 'southern_move_mrkonjic' },
            },
        });
    });

    it('hands one constructed uncommitted donor exactly once; this five-to-four fixture leaves four', () => {
        const state = constructedMechanicsState();
        const beforeControl = structuredClone(state.political);
        activate(state);
        activate(state);
        const [source, tail] = operation(state).axes!;
        expect(source!.assigned_brigades).toHaveLength(4);
        expect(source!.assigned_brigades).not.toContain(DONOR);
        expect(tail!.assigned_brigades).toEqual([DONOR]);
        expect(operation(state).participating_brigades.filter((id) => id === DONOR)).toHaveLength(1);
        expect(buildAttackOrderOwner(state, DONOR, BJELAJCE, 187)).toMatchObject({
            operation_id: OP_ID, axis_id: tail!.axis_id, target: BJELAJCE,
        });
        expect(state.political).toEqual(beforeControl);
    });

    it.each([
        ['missing receipt', (state: GameState) => { destination(state).late_phase!.receipts = []; }],
        ['foreign receipt', (state: GameState) => { destination(state).late_phase!.receipts[0]!.operation_id = 'foreign'; }],
        ['controller only, no receipt', (state: GameState) => { destination(state).late_phase!.receipts = []; }],
        ['missing donor', (state: GameState) => { delete state.military.formations![DONOR]; }],
        ['inactive donor', (state: GameState) => { state.military.formations![DONOR]!.status = 'inactive'; }],
        ['foreign donor', (state: GameState) => { state.military.formations![DONOR]!.faction = 'RS'; }],
        ['duplicate axis ownership', (state: GameState) => { destination(state).assigned_brigades.push(DONOR); }],
        ['separate live commitment', (state: GameState) => {
            state.military.corps_command!.hvo_tomislavgrad!.active_operations.push({
                ...structuredClone(operation(state)), name: 'Other Operation', started_turn: 185,
                participating_brigades: [DONOR], axes: undefined,
            });
        }],
    ] as const)('keeps handoff atomic for %s', (_label, mutate) => {
        const state = constructedMechanicsState();
        mutate(state);
        const before = structuredClone(operation(state).axes);
        activate(state);
        expect(operation(state).axes).toEqual(before);
        expect(destination(state).late_phase!.phase).toBe('holding');
    });

    it('invalidates a stale lost-control receipt without transferring ownership', () => {
        const state = constructedMechanicsState();
        state.political.political_controllers![MAJDAN] = 'RS';
        activate(state);
        expect(destination(state).late_phase).toMatchObject({ phase: 'holding', receipts: [] });
        expect(operation(state).axes![0]!.assigned_brigades).toContain(DONOR);
        expect(destination(state).assigned_brigades).toEqual([]);
    });

    it('pins the actual n74 forward donor fields and exposes its recorded predecessor obligation', () => {
        expect(ACTUAL_N74_SAVE_W186_SHA256).toHaveLength(64);
        expect(ACTUAL_N74_WEEKLY_REPORT_SHA256).toHaveLength(64);
        expect(ACTUAL_N74_FORWARD_DONOR_T186).toMatchObject({
            formation: {
                id: FORWARD_DONOR, faction: 'HRHB', status: 'active', readiness: 'active',
                location_osid: MAJDAN, personnel: 2851, cohesion: 46, morale: 98, posture: 'attack',
            },
            movement_state: null, attack_order: null, movement_order: null,
            operation: {
                id: OP_ID, phase: 'execution', axis_id: 'southern_move_mrkonjic',
                axis_status: 'executing', current_objective_index: 1,
                assigned: true, participating: true, other_planning_or_execution_commitments: [],
            },
            gate_receipt: { osid: MAJDAN, turn: 186, attacker_brigade: FORWARD_DONOR, operation_id: OP_ID },
        });
        expect(ACTUAL_N74_RECORDED_PREFIX).toEqual([
            { turn: 187, target: PODRASNICA, issuer: FORWARD_DONOR, operation_id: OP_ID },
            { turn: 188, target: MRKONJIC, issuer: FORWARD_DONOR, operation_id: OP_ID },
        ]);

        const state = constructedMechanicsState(FORWARD_DONOR);
        state.military.formations![FORWARD_DONOR] = {
            ...state.military.formations![FORWARD_DONOR]!,
            ...ACTUAL_N74_FORWARD_DONOR_T186.formation,
        };
        destination(state).late_phase!.receipts = [{ ...ACTUAL_N74_FORWARD_DONOR_T186.gate_receipt }];
        activate(state);

        const [source, tail] = operation(state).axes!;
        expect(source!.assigned_brigades).not.toContain(FORWARD_DONOR);
        expect(tail!.assigned_brigades).toEqual([FORWARD_DONOR]);
        expect(buildAttackOrderOwner(state, FORWARD_DONOR, BJELAJCE, 187)).toMatchObject({
            operation_id: OP_ID, axis_id: tail!.axis_id, target: BJELAJCE,
        });
        expect(ACTUAL_N74_RECORDED_PREFIX.map(({ target, issuer }) => ({ target, issuer }))).toEqual([
            { target: PODRASNICA, issuer: FORWARD_DONOR },
            { target: MRKONJIC, issuer: FORWARD_DONOR },
        ]);
    });

    it('preserves pending transit precedence, arrives normally, then permits legal retasking', () => {
        const state = constructedMechanicsState();
        const edges = contactEdges();
        const reverseMap = new Map();
        state.military.brigade_movement_state = { [DONOR]: {
            status: 'in_transit', stance: 'column', owner: 'bot_discretionary', turns_remaining: 1,
            path: [GERZOVO, MAJDAN], destination_sids: [MAJDAN],
        } } as GameState['military']['brigade_movement_state'];
        state.military.brigade_movement_orders = { [DONOR]: {
            destination_sids: [MAJDAN], stance: 'column', owner: 'bot_discretionary',
        } };
        const beforeTransit = structuredClone(state.military.brigade_movement_state![DONOR]);
        const beforeOrder = structuredClone(state.military.brigade_movement_orders[DONOR]);
        activate(state);
        expect(destination(state).assigned_brigades).toEqual([DONOR]);
        expect(destination(state).late_phase!.phase).toBe('capture');
        expect(state.military.brigade_movement_state![DONOR]).toEqual(beforeTransit);
        expect(state.military.brigade_attack_orders?.[DONOR]).toBeUndefined();

        state.meta.turn = 187;
        generateAllBotOrdersOsid(state, ['HRHB'], {
            edges, reverseMap, supplyStateByOsid: {} as never, osidPopulationMap: new Map(),
        }, { brigadeFilter: (formation) => formation.id === DONOR });
        expect(state.military.brigade_attack_orders?.[DONOR]).toBeUndefined();
        expect(state.military.brigade_movement_orders?.[DONOR]).toEqual(beforeOrder);

        const arrival = processOsidColumnMovement(state, edges, reverseMap, { by_sid: {} });
        expect(arrival.column_arrivals).toBe(1);
        expect(state.military.formations![DONOR]!.location_osid).toBe(MAJDAN);
        expect(state.military.brigade_movement_state?.[DONOR]).toBeUndefined();
        expect(state.military.brigade_movement_orders?.[DONOR]).toBeUndefined();

        generateAllBotOrdersOsid(state, ['HRHB'], {
            edges, reverseMap, supplyStateByOsid: {} as never, osidPopulationMap: new Map(),
        }, { brigadeFilter: (formation) => formation.id === DONOR });
        expect(state.military.brigade_attack_orders?.[DONOR]).toBe(BJELAJCE);
    });

    it('is deterministic under reversed formation and axis insertion order', () => {
        const project = (state: GameState) => {
            activate(state);
            return operation(state).axes!.map((a) => ({
                id: a.axis_id, brigades: a.assigned_brigades, phase: a.late_phase?.phase ?? null,
            })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
        };
        const forward = constructedMechanicsState();
        const reversed = constructedMechanicsState();
        reversed.military.formations = Object.fromEntries(Object.entries(reversed.military.formations!).reverse());
        operation(reversed).axes!.reverse();
        expect(project(reversed)).toEqual(project(forward));
    });

    it('measures the constructed Gerzovo-donor branch as one transit turn, leaving Baljvine queued at 188', () => {
        const state = constructedMechanicsState();
        const edges = contactEdges();
        const reverseMap = new Map();
        activate(state);
        const beforeControl = structuredClone(state.political);

        state.meta.turn = 187;
        generateAllBotOrdersOsid(state, ['HRHB'], {
            edges, reverseMap, supplyStateByOsid: {} as never, osidPopulationMap: new Map(),
        }, { brigadeFilter: (formation) => formation.id === DONOR });
        expect(state.military.brigade_attack_orders?.[DONOR]).toBeUndefined();
        expect(state.military.brigade_movement_orders?.[DONOR]).toMatchObject({
            destination_sids: [MAJDAN], stance: 'column',
        });
        const start = processOsidColumnMovement(state, edges, reverseMap, { by_sid: {} });
        expect(start.column_starts).toBe(1);
        expect(state.military.formations![DONOR]!.location_osid).toBe(GERZOVO);
        expect(state.political).toEqual(beforeControl);

        state.meta.turn = 188;
        const arrival = processOsidColumnMovement(state, edges, reverseMap, { by_sid: {} });
        expect(arrival.column_arrivals).toBe(1);
        expect(state.military.formations![DONOR]!.location_osid).toBe(MAJDAN);
        generateAllBotOrdersOsid(state, ['HRHB'], {
            edges, reverseMap, supplyStateByOsid: {} as never, osidPopulationMap: new Map(),
        }, { brigadeFilter: (formation) => formation.id === DONOR });
        expect(state.military.brigade_attack_orders?.[DONOR]).toBe(BJELAJCE);
        const report = resolveAttackOrdersOsid(state, edges, reverseMap);
        expect(report.battles).toHaveLength(1);
        expect(report.battles[0]).toMatchObject({
            attacker_brigade: DONOR, target_osid: BJELAJCE, attacker_won: true,
        });
        updateSectorOffensiveResults(state, reverseMap);
        expect(state.political.political_controllers![BJELAJCE]).toBe('HRHB');
        expect(state.political.political_controllers![BALJVINE]).toBe('RS');
        expect(destination(state).current_objective_index).toBe(1);
    });

    it('does not bypass a broken route or write direct control', () => {
        const state = constructedMechanicsState();
        activate(state);
        const beforeControl = structuredClone(state.political);
        state.meta.turn = 187;
        generateAllBotOrdersOsid(state, ['HRHB'], {
            edges: [], reverseMap: new Map(), supplyStateByOsid: {} as never, osidPopulationMap: new Map(),
        }, { brigadeFilter: (formation) => formation.id === DONOR });
        expect(state.military.brigade_attack_orders?.[DONOR]).toBeUndefined();
        expect(state.military.brigade_movement_orders?.[DONOR]).toBeUndefined();
        expect(state.political).toEqual(beforeControl);
    });

    it('separately proves constructed defended-combat mechanics can take both tails from Majdan', () => {
        const state = constructedMechanicsState();
        const edges = contactEdges();
        const reverseMap = new Map();
        state.military.formations![DONOR]!.location_osid = MAJDAN;
        activate(state);

        for (const [turn, target] of [[187, BJELAJCE], [188, BALJVINE]] as const) {
            state.meta.turn = turn;
            generateAllBotOrdersOsid(state, ['HRHB'], {
                edges, reverseMap, supplyStateByOsid: {} as never, osidPopulationMap: new Map(),
            }, { brigadeFilter: (formation) => formation.id === DONOR });
            expect(state.military.brigade_attack_orders?.[DONOR]).toBe(target);
            const report = resolveAttackOrdersOsid(state, edges, reverseMap);
            expect(report.battles).toHaveLength(1);
            expect(report.battles[0]).toMatchObject({
                attacker_brigade: DONOR, target_osid: target, attacker_won: true,
            });
            updateSectorOffensiveResults(state, reverseMap);
            expect(state.political.political_controllers![target]).toBe('HRHB');
        }
        expect(destination(state).current_objective_index).toBe(2);
        expect(operation(state).axes![0]!.current_objective_index).toBe(1);
    });
});
