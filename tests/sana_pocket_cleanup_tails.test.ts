import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { generateAllBotOrdersOsid } from '../src/sim/combat/bot_brigade_ai_osid.js';
import { resolveAttackOrdersOsid } from '../src/sim/combat/attack_resolution_osid.js';
import { SANA_95_OPPORTUNITY } from '../src/sim/combat/operation_opportunity_catalog_5th_corps.js';
import { advanceLatePhaseGates, buildAttackOrderOwner } from '../src/sim/combat/operation_phase_gate.js';
import { processOsidColumnMovement } from '../src/sim/combat/osid_column_movement.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { CorpsOperation, FactionId, GameState, OperationAxis } from '../src/state/game_state.js';

const trubar = 'op:bihac:trubar';
const vodjenica = 'op:bosanski_petrovac:vodjenica';
const velikiBadic = 'op:bosanska_krupa:veliki_badic';
const matavazi = 'op:bosanski_novi:matavazi_2';
const donjiDubovik = 'op:bosanska_krupa:donji_dubovik_2';
const ivanjska = 'op:bosanska_krupa:ivanjska_2';

function realContactEdges(): EdgeRecord[] {
    return (JSON.parse(readFileSync(
        'data/derived/operational/operational_contact_graph.json',
        'utf8',
    )) as { edges: EdgeRecord[] }).edges;
}

function cleanupRouteEdges(): EdgeRecord[] {
    const wanted = new Set([
        `${vodjenica}|${trubar}`,
        `${trubar}|${vodjenica}`,
        `${matavazi}|${donjiDubovik}`,
        `${donjiDubovik}|${matavazi}`,
        `${donjiDubovik}|${ivanjska}`,
        `${ivanjska}|${donjiDubovik}`,
        `${ivanjska}|${velikiBadic}`,
        `${velikiBadic}|${ivanjska}`,
    ]);
    return realContactEdges().filter(({ a, b }) => wanted.has(`${a}|${b}`));
}

function makeTailOrderState(): GameState {
    const approachAxis = SANA_95_OPPORTUNITY.axes.find(
        (axis) => axis.axis_id === 'sana_bihac_petrovac_approach',
    )!;
    const krupaAxis = SANA_95_OPPORTUNITY.axes.find((axis) => axis.axis_id === 'sana_krupa')!;
    const velikiBadicAxis = SANA_95_OPPORTUNITY.axes.find(
        (axis) => axis.axis_id === 'sana_veliki_badic_505th',
    )!;
    const formation = (id: string, location_osid: string, faction: FactionId = 'RBiH') => ({
        id,
        name: id,
        faction,
        kind: 'brigade',
        status: 'active',
        corps_id: 'arbih_5th_corps',
        personnel: 1800,
        cohesion: 85,
        morale: 90,
        experience: 0.6,
        posture: 'attack',
        location_osid,
        hq_sid: location_osid,
        equipment: { infantry: 1800, tanks: 0, artillery: 0, air_defense: 0 },
        composition: {
            infantry: 1800,
            tanks: 0,
            artillery: 0,
            aa_systems: 0,
            tank_condition: { operational: 0, degraded: 0, non_operational: 0 },
            artillery_condition: { operational: 0, degraded: 0, non_operational: 0 },
        },
    });
    const axes = [
        {
            axis_id: approachAxis.axis_id,
            name: approachAxis.name,
            assigned_brigades: ['arbih_504th_cazin_light'],
            objectives: [...approachAxis.objectives],
            current_objective_index: approachAxis.objectives.length - 1,
            staging_osid: approachAxis.staging_osid,
            status: 'executing',
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
        },
        {
            axis_id: krupaAxis.axis_id,
            name: krupaAxis.name,
            assigned_brigades: [],
            objectives: [...krupaAxis.objectives],
            current_objective_index: krupaAxis.objectives.length - 1,
            staging_osid: krupaAxis.staging_osid,
            status: 'executing',
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
        },
        {
            axis_id: velikiBadicAxis.axis_id,
            name: velikiBadicAxis.name,
            assigned_brigades: ['arbih_505th_vitezka_mountain'],
            objectives: [...velikiBadicAxis.objectives],
            current_objective_index: 0,
            staging_osid: velikiBadicAxis.staging_osid,
            preserve_objective_sequence: true,
            status: 'executing',
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
            late_phase: {
                phase: 'capture',
                main_axis_id: 'sana_krupa',
                requires: [ivanjska],
                gated_objectives: [velikiBadic],
                receipts: [],
                activated_turn: 178,
                handoff: {
                    brigade_id: 'arbih_505th_vitezka_mountain',
                    source_axis_id: 'sana_krupa',
                },
            },
        },
    ];

    const receiptWitness = (
        axisId: string,
        mainAxisId: string,
        requiredTarget: string,
    ): OperationAxis => ({
        axis_id: axisId,
        name: axisId,
        assigned_brigades: [],
        objectives: [],
        current_objective_index: 0,
        status: 'executing',
        failure_count: 0,
        consecutive_failures_on_current: 0,
        momentum: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
        late_phase: {
            phase: 'holding',
            main_axis_id: mainAxisId,
            requires: [requiredTarget],
            gated_objectives: [],
            receipts: [],
            hold_started_turn: 188,
        },
    } as OperationAxis);

    return {
        meta: {
            turn: 188,
            phase: 'war',
            seed: 'sana-pocket-cleanup-tail-orders',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
        },
        factions: [{ id: 'RBiH' }, { id: 'RS' }] as GameState['factions'],
        political: {
            political_controllers: {
                [vodjenica]: 'RBiH',
                [trubar]: 'RS',
                [matavazi]: 'RBiH',
                [donjiDubovik]: 'RBiH',
                [ivanjska]: 'RBiH',
                [velikiBadic]: 'RS',
            },
            control_events: [],
        },
        military: {
            formations: {
                arbih_504th_cazin_light: formation('arbih_504th_cazin_light', vodjenica),
                arbih_505th_vitezka_mountain: formation('arbih_505th_vitezka_mountain', matavazi),
                arbih_5th_corps: {
                    ...formation('arbih_5th_corps', vodjenica),
                    kind: 'corps',
                },
                rs_trubar_defender: {
                    ...formation('rs_trubar_defender', trubar, 'RS'),
                    personnel: 150,
                    cohesion: 20,
                    morale: 20,
                    experience: 0.1,
                    posture: 'defend',
                    composition: {
                        infantry: 100,
                        tanks: 0,
                        artillery: 0,
                        aa_systems: 0,
                        tank_condition: { operational: 0, degraded: 0, non_operational: 0 },
                        artillery_condition: { operational: 0, degraded: 0, non_operational: 0 },
                    },
                },
                rs_veliki_badic_defender: {
                    ...formation('rs_veliki_badic_defender', velikiBadic, 'RS'),
                    personnel: 150,
                    cohesion: 20,
                    morale: 20,
                    experience: 0.1,
                    posture: 'defend',
                    composition: {
                        infantry: 100,
                        tanks: 0,
                        artillery: 0,
                        aa_systems: 0,
                        tank_condition: { operational: 0, degraded: 0, non_operational: 0 },
                        artillery_condition: { operational: 0, degraded: 0, non_operational: 0 },
                    },
                },
            },
            corps_command: {
                arbih_5th_corps: {
                    stance: 'offensive',
                    corps_exhaustion: 0,
                    active_operations: [{
                        name: 'Operation Sana',
                        type: 'sector_attack',
                        phase: 'execution',
                        started_turn: 175,
                        phase_started_turn: 188,
                        participating_brigades: [
                            'arbih_504th_cazin_light',
                            'arbih_505th_vitezka_mountain',
                        ],
                        objectives: [trubar, velikiBadic],
                        current_objective_index: 0,
                        axes: [
                            ...axes,
                            receiptWitness(
                                'sana_trubar_receipt_witness',
                                'sana_bihac_petrovac_approach',
                                trubar,
                            ),
                            receiptWitness(
                                'sana_badic_receipt_witness',
                                'sana_veliki_badic_505th',
                                velikiBadic,
                            ),
                        ],
                        occupies_on_victory: true,
                    } as CorpsOperation],
                },
            },
            casualty_ledger: initializeCasualtyLedger(['RBiH', 'RS']),
            brigade_attack_orders: {},
            brigade_movement_orders: {},
            brigade_posture_orders: [],
        },
        displacement: {},
    } as unknown as GameState;
}

function makeRetainedN73IvanjskaHandoffState(): GameState {
    const state = makeTailOrderState();
    state.meta.turn = 178;
    const operation = state.military.corps_command!.arbih_5th_corps!.active_operations[0]!;
    operation.phase_started_turn = 178;
    const source = operation.axes!.find((axis) => axis.axis_id === 'sana_krupa')!;
    const destination = operation.axes!.find((axis) => axis.axis_id === 'sana_veliki_badic_505th')!;
    const formation = state.military.formations!.arbih_505th_vitezka_mountain!;

    state.military.formations!.arbih_503rd_slavna_mountain = {
        ...structuredClone(formation),
        id: 'arbih_503rd_slavna_mountain',
        name: 'arbih_503rd_slavna_mountain',
        location_osid: ivanjska,
    };
    state.military.formations!.arbih_511th_slavna_mountain = {
        ...structuredClone(formation),
        id: 'arbih_511th_slavna_mountain',
        name: 'arbih_511th_slavna_mountain',
        location_osid: 'op:bosanska_krupa:otoka_2',
    };
    formation.location_osid = 'op:bosanska_krupa:otoka_2';
    source.assigned_brigades = [
        'arbih_511th_slavna_mountain',
        'arbih_505th_vitezka_mountain',
        'arbih_503rd_slavna_mountain',
    ];
    source.main_brigade = 'arbih_503rd_slavna_mountain';
    source.support_brigades = ['arbih_505th_vitezka_mountain', 'arbih_511th_slavna_mountain'];
    destination.assigned_brigades = [];
    delete destination.main_brigade;
    delete destination.support_brigades;
    destination.late_phase = {
        phase: 'holding',
        main_axis_id: 'sana_krupa',
        requires: [ivanjska],
        gated_objectives: [velikiBadic],
        receipts: [{
            osid: ivanjska,
            turn: 178,
            battle_id: '178:op:bosanska_krupa:ivanjska_2:arbih_503rd_slavna_mountain:rs_11th_krupa_light_infantry',
            attacker_brigade: 'arbih_503rd_slavna_mountain',
            operation_id: 'arbih_5th_corps:Operation Sana:t175',
            axis_id: 'sana_krupa',
        }],
        handoff: {
            brigade_id: 'arbih_505th_vitezka_mountain',
            source_axis_id: 'sana_krupa',
        },
    };
    operation.participating_brigades = [
        'arbih_504th_cazin_light',
        'arbih_503rd_slavna_mountain',
        'arbih_505th_vitezka_mountain',
        'arbih_511th_slavna_mountain',
    ];
    state.military.brigade_attack_orders = {};
    state.military.brigade_movement_orders = {};
    delete state.military.brigade_movement_state;
    return state;
}

describe('Operation Sana bounded pocket cleanup tails', () => {
    it('keeps both approved prefixes and authors Veliki Badic on one empty post-Ivanjska handoff axis', () => {
        const approach = SANA_95_OPPORTUNITY.axes.find(
            (axis) => axis.axis_id === 'sana_bihac_petrovac_approach',
        )!;
        const krupa = SANA_95_OPPORTUNITY.axes.find((axis) => axis.axis_id === 'sana_krupa')!;
        const velikiBadicCleanup = SANA_95_OPPORTUNITY.axes.find(
            (axis) => axis.axis_id === 'sana_veliki_badic_505th',
        );

        expect(approach.objectives).toEqual([
            'op:bihac:ripac',
            'op:bihac:racic',
            'op:bihac:orasac_2',
            'op:bosanski_petrovac:vrtoce',
            'op:bosanski_petrovac:prkosi',
            vodjenica,
            trubar,
        ]);
        expect(krupa.objectives).toEqual([
            'op:bosanska_krupa:ivanjska_2',
            'op:bosanska_krupa:arapusa_2',
            donjiDubovik,
            'op:bosanska_krupa:vranjska_2',
            'op:bosanska_krupa:jasenica_2',
            'op:bosanska_krupa:gornja_suvaja',
            'op:bosanski_petrovac:krnjeusa',
            'op:bosanski_novi:krslje_2',
            matavazi,
        ]);
        expect(velikiBadicCleanup).toMatchObject({
            brigades: [],
            objectives: [velikiBadic],
            staging_osid: ivanjska,
            preserve_objective_sequence: true,
            phase_gate: {
                main_axis_id: 'sana_krupa',
                requires_operation_captures: [ivanjska],
                handoff: {
                    brigade_id: 'arbih_505th_vitezka_mountain',
                    source_axis_id: 'sana_krupa',
                },
            },
        });
        expect(krupa.brigades).toEqual([
            'arbih_511th_slavna_mountain',
            'arbih_505th_vitezka_mountain',
            'arbih_503rd_slavna_mountain',
        ]);

        const edgeSet = new Set(realContactEdges().flatMap(({ a, b }) => [`${a}|${b}`, `${b}|${a}`]));
        for (const [a, b] of [
            [vodjenica, trubar],
            [matavazi, donjiDubovik],
            [donjiDubovik, ivanjska],
            [ivanjska, velikiBadic],
        ]) expect(edgeSet.has(`${a}|${b}`)).toBe(true);
    });

    it('hands the retained t178 505th from the three-brigade Krupa axis exactly once without changing physical state', () => {
        const state = makeRetainedN73IvanjskaHandoffState();
        const operation = state.military.corps_command!.arbih_5th_corps!.active_operations[0]!;
        const source = operation.axes!.find((axis) => axis.axis_id === 'sana_krupa')!;
        const destination = operation.axes!.find((axis) => axis.axis_id === 'sana_veliki_badic_505th')!;
        const beforePhysical = structuredClone({
            formation: state.military.formations!.arbih_505th_vitezka_mountain,
            movement: state.military.brigade_movement_state?.arbih_505th_vitezka_mountain,
            attackOrder: state.military.brigade_attack_orders?.arbih_505th_vitezka_mountain,
            movementOrder: state.military.brigade_movement_orders?.arbih_505th_vitezka_mountain,
        });

        expect(destination.assigned_brigades).toEqual([]);
        expect(source.assigned_brigades).toHaveLength(3);
        advanceLatePhaseGates(state, operation, 'arbih_5th_corps', 'RBiH', 178);
        advanceLatePhaseGates(state, operation, 'arbih_5th_corps', 'RBiH', 179);

        expect(source.assigned_brigades).toEqual([
            'arbih_511th_slavna_mountain',
            'arbih_503rd_slavna_mountain',
        ]);
        expect(destination).toMatchObject({
            assigned_brigades: ['arbih_505th_vitezka_mountain'],
            main_brigade: 'arbih_505th_vitezka_mountain',
            late_phase: { phase: 'capture', activated_turn: 178 },
        });
        expect(operation.participating_brigades.filter(
            (id) => id === 'arbih_505th_vitezka_mountain',
        )).toHaveLength(1);
        expect({
            formation: state.military.formations!.arbih_505th_vitezka_mountain,
            movement: state.military.brigade_movement_state?.arbih_505th_vitezka_mountain,
            attackOrder: state.military.brigade_attack_orders?.arbih_505th_vitezka_mountain,
            movementOrder: state.military.brigade_movement_orders?.arbih_505th_vitezka_mountain,
        }).toEqual(beforePhysical);
        expect(buildAttackOrderOwner(state, 'arbih_505th_vitezka_mountain', velikiBadic, 179))
            .toMatchObject({
                operation_id: 'arbih_5th_corps:Operation Sana:t175',
                axis_id: 'sana_veliki_badic_505th',
                target: velikiBadic,
            });
    });

    it.each([
        ['missing receipt', (state: GameState) => {
            state.military.corps_command!.arbih_5th_corps!.active_operations[0]!.axes!
                .find((axis) => axis.axis_id === 'sana_veliki_badic_505th')!.late_phase!.receipts = [];
        }],
        ['foreign receipt', (state: GameState) => {
            state.military.corps_command!.arbih_5th_corps!.active_operations[0]!.axes!
                .find((axis) => axis.axis_id === 'sana_veliki_badic_505th')!
                .late_phase!.receipts[0]!.operation_id = 'arbih_5th_corps:Other Operation:t175';
        }],
        ['ineligible 505th', (state: GameState) => {
            state.military.formations!.arbih_505th_vitezka_mountain!.status = 'inactive';
        }],
        ['separate live operation commitment', (state: GameState) => {
            const command = state.military.corps_command!.arbih_5th_corps!;
            command.active_operations.push({
                ...structuredClone(command.active_operations[0]!),
                name: 'Other Live Operation',
                started_turn: 177,
                participating_brigades: ['arbih_505th_vitezka_mountain'],
                axes: undefined,
            });
        }],
    ] as const)('keeps the production handoff atomic for %s', (_label, corrupt) => {
        const state = makeRetainedN73IvanjskaHandoffState();
        corrupt(state);
        const operation = state.military.corps_command!.arbih_5th_corps!.active_operations[0]!;
        const before = structuredClone(operation.axes);

        advanceLatePhaseGates(state, operation, 'arbih_5th_corps', 'RBiH', 178);

        expect(operation.axes).toEqual(before);
        expect(operation.axes!.find((axis) => axis.axis_id === 'sana_veliki_badic_505th')!
            .late_phase!.phase).toBe('holding');
    });

    it('produces the same production handoff under reversed formation and axis insertion order', () => {
        const forward = makeRetainedN73IvanjskaHandoffState();
        const reversed = makeRetainedN73IvanjskaHandoffState();
        reversed.military.formations = Object.fromEntries(Object.entries(reversed.military.formations!).reverse());
        reversed.military.corps_command!.arbih_5th_corps!.active_operations[0]!.axes!.reverse();
        const project = (state: GameState) => {
            const operation = state.military.corps_command!.arbih_5th_corps!.active_operations[0]!;
            advanceLatePhaseGates(state, operation, 'arbih_5th_corps', 'RBiH', 178);
            return operation.axes!.map(({ axis_id, assigned_brigades, late_phase }) => ({
                axis_id, assigned_brigades, phase: late_phase?.phase ?? null,
            })).sort((a, b) => a.axis_id.localeCompare(b.axis_id));
        };

        expect(project(reversed)).toEqual(project(forward));
    });

    it('uses ordinary attack and march orders without transferring political control', () => {
        const state = makeTailOrderState();
        const beforeControl = { ...state.political.political_controllers };

        generateAllBotOrdersOsid(state, ['RBiH'], {
            edges: realContactEdges() as any,
            reverseMap: new Map(),
            supplyStateByOsid: {} as any,
            osidPopulationMap: new Map(),
        }, {
            brigadeFilter: (brigade) => [
                'arbih_504th_cazin_light',
                'arbih_505th_vitezka_mountain',
            ].includes(brigade.id),
        });

        expect(state.military.brigade_attack_orders?.arbih_504th_cazin_light).toBe(trubar);
        expect(state.military.brigade_movement_orders?.arbih_505th_vitezka_mountain)
            .toMatchObject({ destination_sids: [ivanjska], stance: 'column' });
        expect(state.military.brigade_attack_orders?.arbih_505th_vitezka_mountain).toBeUndefined();
        expect(state.political.political_controllers).toEqual(beforeControl);
        expect(state.political.control_events).toEqual([]);
    });

    it('does not synthesize a move, attack, or control change when the Veliki Badic route is broken', () => {
        const state = makeTailOrderState();
        const beforeControl = structuredClone(state.political);

        generateAllBotOrdersOsid(state, ['RBiH'], {
            edges: [],
            reverseMap: new Map(),
            supplyStateByOsid: {} as any,
            osidPopulationMap: new Map(),
        }, {
            brigadeFilter: (brigade) => brigade.id === 'arbih_505th_vitezka_mountain',
        });

        expect(state.military.brigade_attack_orders?.arbih_505th_vitezka_mountain).toBeUndefined();
        expect(state.military.brigade_movement_orders?.arbih_505th_vitezka_mountain).toBeUndefined();
        expect(state.political).toEqual(beforeControl);
    });

    it('marches and resolves both tails through ordinary owned combat receipts', () => {
        const state = makeTailOrderState();
        const edges = cleanupRouteEdges();
        const reverseMap = new Map();
        const operation = state.military.corps_command!.arbih_5th_corps!.active_operations[0]!;
        const trubarWitness = operation.axes!.find(
            (axis) => axis.axis_id === 'sana_trubar_receipt_witness',
        )!;
        const badicWitness = operation.axes!.find(
            (axis) => axis.axis_id === 'sana_badic_receipt_witness',
        )!;
        const beforeControl = { ...state.political.political_controllers };

        generateAllBotOrdersOsid(state, ['RBiH'], {
            edges,
            reverseMap,
            supplyStateByOsid: {} as any,
            osidPopulationMap: new Map(),
        }, {
            brigadeFilter: (brigade) => [
                'arbih_504th_cazin_light',
                'arbih_505th_vitezka_mountain',
            ].includes(brigade.id),
        });

        expect(state.political.political_controllers).toEqual(beforeControl);
        expect(state.political.control_events).toEqual([]);
        expect(state.military.brigade_attack_orders?.arbih_504th_cazin_light).toBe(trubar);
        expect(state.military.brigade_movement_orders?.arbih_505th_vitezka_mountain)
            .toMatchObject({ destination_sids: [ivanjska], stance: 'column' });

        const movementStart = processOsidColumnMovement(
            state,
            edges,
            reverseMap,
            { by_sid: {} },
        );
        expect(movementStart.column_starts).toBe(1);
        expect(state.military.brigade_movement_state?.arbih_505th_vitezka_mountain?.path)
            .toEqual([matavazi, donjiDubovik, ivanjska]);
        expect(state.military.formations!.arbih_505th_vitezka_mountain!.location_osid).toBe(matavazi);

        const trubarReport = resolveAttackOrdersOsid(state, edges, reverseMap);
        expect(trubarReport.battles).toHaveLength(1);
        expect(trubarReport.battles[0]).toMatchObject({
            attacker_brigade: 'arbih_504th_cazin_light',
            target_osid: trubar,
            attacker_won: true,
        });
        expect(state.political.political_controllers![trubar]).toBe('RBiH');

        state.meta.turn = 189;
        const movementArrival = processOsidColumnMovement(
            state,
            edges,
            reverseMap,
            { by_sid: {} },
        );
        expect(movementArrival.column_arrivals).toBe(1);
        expect(state.military.formations!.arbih_505th_vitezka_mountain!.location_osid).toBe(ivanjska);
        expect(state.political.political_controllers![velikiBadic]).toBe('RS');

        generateAllBotOrdersOsid(state, ['RBiH'], {
            edges,
            reverseMap,
            supplyStateByOsid: {} as any,
            osidPopulationMap: new Map(),
        }, {
            brigadeFilter: (brigade) => brigade.id === 'arbih_505th_vitezka_mountain',
        });
        expect(state.military.brigade_attack_orders?.arbih_505th_vitezka_mountain).toBe(velikiBadic);
        expect(state.political.political_controllers![velikiBadic]).toBe('RS');

        const badicReport = resolveAttackOrdersOsid(state, edges, reverseMap);
        expect(badicReport.battles).toHaveLength(1);
        expect(badicReport.battles[0]).toMatchObject({
            attacker_brigade: 'arbih_505th_vitezka_mountain',
            target_osid: velikiBadic,
            attacker_won: true,
        });
        expect(state.political.political_controllers![velikiBadic]).toBe('RBiH');
        expect(trubarWitness.late_phase?.receipts).toEqual([
            {
                osid: trubar,
                turn: 188,
                battle_id: `188:${trubar}:arbih_504th_cazin_light:rs_trubar_defender`,
                attacker_brigade: 'arbih_504th_cazin_light',
                operation_id: 'arbih_5th_corps:Operation Sana:t175',
                axis_id: 'sana_bihac_petrovac_approach',
            },
        ]);
        expect(badicWitness.late_phase?.receipts).toEqual([
            {
                osid: velikiBadic,
                turn: 189,
                battle_id: `189:${velikiBadic}:arbih_505th_vitezka_mountain:rs_veliki_badic_defender`,
                attacker_brigade: 'arbih_505th_vitezka_mountain',
                operation_id: 'arbih_5th_corps:Operation Sana:t175',
                axis_id: 'sana_veliki_badic_505th',
            },
        ]);
    });
});
