import { describe, expect, it } from 'vitest';

import { resolveAttackOrdersOsid } from '../src/sim/combat/attack_resolution_osid.js';
import {
    advanceSectorOffensives,
    updateSectorOffensiveResults,
} from '../src/sim/combat/sector_offensive.js';
import type { CorpsOperation, FactionId, FormationState, GameState } from '../src/state/game_state.js';
import {
    isVlasicCohaExceptionAttackOrder,
    isVlasicCohaExceptionOperation,
    isVlasicCohaWindow,
} from '../src/sim/combat/coha_operation_exception.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import { buildOperationCombatDiagnostics } from '../src/scenario/combat_causality.js';
import { turnToCompletedWeekRange } from '../src/ui/map/utils/formatters.js';

function makeState(): GameState {
    const operation: CorpsOperation = {
        name: 'Operacija Kalem',
        type: 'sector_attack',
        phase: 'execution',
        started_turn: 145,
        phase_started_turn: 148,
        participating_brigades: ['b1'] as any,
        objectives: ['op:enemy:objective'],
        current_objective_index: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
    } as CorpsOperation;

    const formations: Record<string, FormationState> = {
        corps_1: {
            id: 'corps_1',
            name: 'Corps 1',
            faction: 'RBiH' as FactionId,
            kind: 'corps',
            status: 'active',
            personnel: 0,
        } as FormationState,
        b1: {
            id: 'b1',
            name: 'Brigade 1',
            faction: 'RBiH' as FactionId,
            corps_id: 'corps_1',
            kind: 'brigade',
            status: 'active',
            personnel: 1800,
            cohesion: 70,
            posture: 'attack',
            location_osid: 'op:friendly:staging',
        } as FormationState,
    };

    return {
        schema_version: 1,
        meta: {
            turn: 150,
            phase: 'war',
            seed: 'coha-test',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
        } as GameState['meta'],
        factions: [{ id: 'RBiH' as FactionId }] as GameState['factions'],
        military: {
            formations,
            event_flags: { coha_active: true },
            brigade_attack_orders: { b1: 'op:enemy:objective' },
            corps_command: {
                corps_1: {
                    command_span: 0,
                    subordinate_count: 1,
                    og_slots: 0,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: [operation],
                },
            },
            corps_front_sectors: {
                sector_1: {
                    sector_id: 'sector_1',
                    corps_id: 'corps_1',
                    faction: 'RBiH',
                    opposing_factions: ['RS'],
                    edge_ids: ['edge_1'],
                    sub_segments: [{
                        sub_segment_id: 'subsegment_1',
                        edge_ids: ['edge_1'],
                        friendly_osids: ['op:friendly:staging'],
                        enemy_osids: ['op:enemy:objective'],
                        primary_brigade_ids: ['b1'],
                        length_edges: 1,
                    }],
                    length_edges: 1,
                    territory_osids: ['op:friendly:staging'],
                    assigned_brigade_ids: ['b1'],
                    reserve_brigade_ids: [],
                    density: 1,
                    threat_ratio: 1,
                    defensive_power: 100,
                    sector_stance: 'attack',
                    stance_source: 'bot',
                },
            },
        } as any,
        political: {
            political_controllers: {
                'op:friendly:staging': 'RBiH',
                'op:enemy:objective': 'RS',
            },
        } as any,
        displacement: {} as any,
    } as GameState;
}

function makeVlasicState(turn = 155): GameState {
    const state = makeState();
    state.meta.turn = turn;
    const operation = state.military.corps_command!.corps_1!.active_operations[0]!;
    operation.name = 'Operation Vlasic Ridge';
    operation.phase = 'execution';
    operation.phase_started_turn = turn - 1;
    operation.staging_osid = 'op:travnik:travnik_2';
    operation.objectives = [
        'op:travnik:paklarevo',
        'op:travnik:varosluk',
        'op:travnik:gornje_krcevine',
    ];
    operation.participating_brigades = [
        'arbih_17th_vitezka_mountain',
        'arbih_705th_slavna_mountain',
        'arbih_712th_mountain',
        'arbih_727th_slavna',
        'arbih_737th_muslim_light',
        'arbih_717th_slavna_mountain',
        'arbih_303rd_vitezka_mountain',
    ] as any;
    operation.axes = [{
        axis_id: 'vlasic_travnik_ridge',
        name: 'Travnik Ridge Line',
        assigned_brigades: ['arbih_17th_vitezka_mountain'],
        objectives: [
            'op:travnik:paklarevo',
            'op:travnik:varosluk',
            'op:travnik:gornje_krcevine',
        ],
        staging_osid: 'op:travnik:turbe_2',
        current_objective_index: 0,
        status: 'executing',
    }] as any;
    const brigade = state.military.formations!.b1!;
    delete state.military.formations!.b1;
    brigade.id = 'arbih_17th_vitezka_mountain';
    brigade.name = '17th Vitezka';
    brigade.corps_id = 'arbih_3rd_corps';
    brigade.location_osid = 'op:travnik:turbe_2';
    state.military.formations![brigade.id] = brigade;
    const corps = state.military.formations!.corps_1!;
    delete state.military.formations!.corps_1;
    corps.id = 'arbih_3rd_corps';
    state.military.formations![corps.id] = corps;
    const command = state.military.corps_command!.corps_1!;
    delete state.military.corps_command!.corps_1;
    command.active_operations = [operation];
    state.military.corps_command!.arbih_3rd_corps = command;
    state.military.brigade_attack_orders = {
        [brigade.id]: 'op:travnik:paklarevo',
    };
    state.political.political_controllers!['op:travnik:turbe_2'] = 'RBiH';
    state.political.political_controllers!['op:travnik:paklarevo'] = 'RS';
    state.military.casualty_ledger = initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']);
    return state;
}

describe('COHA operation pause', () => {
    it('allows only the authored Vlašić operation identity in the March window', () => {
        const state = makeVlasicState();
        const op = state.military.corps_command!.arbih_3rd_corps!.active_operations[0]!;
        expect(isVlasicCohaExceptionOperation(state, 'arbih_3rd_corps', op)).toBe(true);
        expect(isVlasicCohaExceptionAttackOrder(
            state,
            'arbih_17th_vitezka_mountain' as any,
            'op:travnik:paklarevo',
        )).toBe(true);
        expect(isVlasicCohaExceptionAttackOrder(
            state,
            'arbih_17th_vitezka_mountain' as any,
            'op:travnik:varosluk',
        )).toBe(false);
        const wrongOperationStaging = makeVlasicState();
        const wrongOp = wrongOperationStaging.military.corps_command!.arbih_3rd_corps!.active_operations[0]!;
        wrongOp.staging_osid = 'op:travnik:turbe_2';
        expect(isVlasicCohaExceptionOperation(
            wrongOperationStaging,
            'arbih_3rd_corps',
            wrongOp,
        )).toBe(false);
    });

    it('advances the approved Vlašić operation while leaving its phase clock unshifted', () => {
        const state = makeVlasicState(155);
        const operation = state.military.corps_command!.arbih_3rd_corps!.active_operations[0]!;
        advanceSectorOffensives(state);
        expect(operation.phase_started_turn).toBe(154);
        expect(operation.phase).toBe('execution');
    });

    it('uses the actual completed-week formatter at the 20 March operation boundary', () => {
        expect(turnToCompletedWeekRange(153)).toBe('6-12 Mar 1995');
        expect(turnToCompletedWeekRange(154)).toBe('13-19 Mar 1995');
        expect(turnToCompletedWeekRange(155)).toBe('20-26 Mar 1995');
        expect(turnToCompletedWeekRange(156)).toBe('27 Mar-2 Apr 1995');
        expect(isVlasicCohaWindow(153)).toBe(false);
        expect(isVlasicCohaWindow(154)).toBe(false);
        expect(isVlasicCohaWindow(155)).toBe(true);
        expect(isVlasicCohaWindow(156)).toBe(false);
    });

    it('accepts the exact eleven-ID authored roster and rejects active unrelated 330/327', () => {
        const authored = [
            'arbih_17th_vitezka_mountain',
            'arbih_706th_muslim_mountain',
            'arbih_727th_slavna',
            'arbih_712th_mountain',
            'arbih_737th_muslim_light',
            'arbih_705th_slavna_mountain',
            'arbih_7th_vitezka_muslim_liberation',
            'arbih_guards_brigade',
            'arbih_314th_slavna_liberation',
            'arbih_717th_slavna_mountain',
            'arbih_303rd_vitezka_mountain',
        ];

        for (const brigadeId of [
            'arbih_7th_vitezka_muslim_liberation',
            'arbih_guards_brigade',
            'arbih_314th_slavna_liberation',
            'arbih_717th_slavna_mountain',
            'arbih_303rd_vitezka_mountain',
        ]) {
            const state = makeVlasicState(155);
            const op = state.military.corps_command!.arbih_3rd_corps!.active_operations[0]!;
            op.participating_brigades = [brigadeId] as any;
            op.axes![0]!.assigned_brigades = [brigadeId] as any;
            expect(isVlasicCohaExceptionOperation(state, 'arbih_3rd_corps', op)).toBe(true);
        }

        const full = makeVlasicState(155);
        const fullOp = full.military.corps_command!.arbih_3rd_corps!.active_operations[0]!;
        fullOp.participating_brigades = [...authored] as any;
        fullOp.axes![0]!.assigned_brigades = [...authored] as any;
        expect(isVlasicCohaExceptionOperation(full, 'arbih_3rd_corps', fullOp)).toBe(true);

        const unauthorized = makeVlasicState(155);
        const unauthorizedOp = unauthorized.military.corps_command!.arbih_3rd_corps!.active_operations[0]!;
        const template = unauthorized.military.formations!['arbih_17th_vitezka_mountain']!;
        unauthorized.military.formations!['arbih_327th_vitezka_mountain'] = {
            ...template,
            id: 'arbih_327th_vitezka_mountain',
        } as any;
        expect(unauthorized.military.formations!['arbih_327th_vitezka_mountain']!.status).toBe('active');
        unauthorizedOp.participating_brigades = [
            ...authored,
            'arbih_327th_vitezka_mountain',
        ] as any;
        expect(isVlasicCohaExceptionOperation(unauthorized, 'arbih_3rd_corps', unauthorizedOp)).toBe(false);

        const unauthorized330 = makeVlasicState(155);
        const unauthorized330Op = unauthorized330.military.corps_command!.arbih_3rd_corps!.active_operations[0]!;
        const template330 = unauthorized330.military.formations!['arbih_17th_vitezka_mountain']!;
        unauthorized330.military.formations!['arbih_330th_liberation'] = {
            ...template330,
            id: 'arbih_330th_liberation',
        } as any;
        unauthorized330Op.participating_brigades = [
            ...authored,
            'arbih_330th_liberation',
        ] as any;
        expect(isVlasicCohaExceptionOperation(unauthorized330, 'arbih_3rd_corps', unauthorized330Op)).toBe(false);
    });

    it('pauses the lifecycle and consumes the Vlasic order at receipts 153 and 154', () => {
        for (const turn of [153, 154]) {
            const lifecycleState = makeVlasicState(turn);
            const lifecycleOperation = lifecycleState.military.corps_command!.arbih_3rd_corps!.active_operations[0]!;
            expect(isVlasicCohaExceptionOperation(lifecycleState, 'arbih_3rd_corps', lifecycleOperation)).toBe(false);

            advanceSectorOffensives(lifecycleState);

            expect(lifecycleOperation.phase).toBe('execution');
            expect(lifecycleOperation.phase_started_turn).toBe(turn);

            const orderState = makeVlasicState(turn);
            const report = resolveAttackOrdersOsid(
                orderState,
                [],
                new Map<string, string[]>(),
            );
            expect(report.combat_suppressed_reason).toBe('coha_ceasefire');
            expect(report.operation_lifecycle_paused_reason).toBe('coha_ceasefire');
            expect(report.orders_processed).toBe(0);
            expect(report.battles).toEqual([]);
            expect(report.suppressed_attack_orders).toEqual([{
                brigade_id: 'arbih_17th_vitezka_mountain',
                target_osid: 'op:travnik:paklarevo',
                reason: 'coha_ceasefire',
            }]);
            expect(orderState.military.brigade_attack_orders).toBeUndefined();
        }
    });

    it('admits only the completed 20-26 March receipt through ordinary resolution', () => {
        expect(turnToCompletedWeekRange(155)).toBe('20-26 Mar 1995');
        expect(isVlasicCohaWindow(155)).toBe(true);
        const state = makeVlasicState(155);
        const operation = state.military.corps_command!.arbih_3rd_corps!.active_operations[0]!;
        expect(isVlasicCohaExceptionOperation(state, 'arbih_3rd_corps', operation)).toBe(true);
        advanceSectorOffensives(state);
        expect(operation.phase_started_turn).toBe(154);

        const orderState = makeVlasicState(155);
        const report = resolveAttackOrdersOsid(
            orderState,
            [],
            new Map<string, string[]>(),
            undefined,
            undefined,
            undefined,
            undefined,
            new Map([
                ['op:travnik:turbe_2', ['op:travnik:paklarevo']],
                ['op:travnik:paklarevo', ['op:travnik:turbe_2']],
            ]),
        );
        expect(report.suppressed_attack_orders ?? []).toEqual([]);
        expect(report.orders_processed).toBe(1);
        expect(report.battles[0]?.operation_name).toBe('Operation Vlasic Ridge');
        expect(report.battles[0]?.operation_id).toContain('arbih_3rd_corps:Operation Vlasic Ridge');
    });

    it('pauses the lifecycle and consumes the Vlasic order again at receipt 156', () => {
        expect(turnToCompletedWeekRange(156)).toBe('27 Mar-2 Apr 1995');
        expect(isVlasicCohaWindow(156)).toBe(false);
        const lifecycleState = makeVlasicState(156);
        const lifecycleOperation = lifecycleState.military.corps_command!.arbih_3rd_corps!.active_operations[0]!;
        expect(isVlasicCohaExceptionOperation(lifecycleState, 'arbih_3rd_corps', lifecycleOperation)).toBe(false);

        advanceSectorOffensives(lifecycleState);

        expect(lifecycleOperation.phase).toBe('execution');
        expect(lifecycleOperation.phase_started_turn).toBe(156);

        const orderState = makeVlasicState(156);
        const report = resolveAttackOrdersOsid(
            orderState,
            [],
            new Map<string, string[]>(),
        );
        expect(report.combat_suppressed_reason).toBe('coha_ceasefire');
        expect(report.operation_lifecycle_paused_reason).toBe('coha_ceasefire');
        expect(report.orders_processed).toBe(0);
        expect(report.battles).toEqual([]);
        expect(report.suppressed_attack_orders).toEqual([{
            brigade_id: 'arbih_17th_vitezka_mountain',
            target_osid: 'op:travnik:paklarevo',
            reason: 'coha_ceasefire',
        }]);
        expect(orderState.military.brigade_attack_orders).toBeUndefined();
    });

    it('keeps identity, corps, roster, current-objective, and ambiguous-ownership negatives closed', () => {
        const base = makeVlasicState(155);
        const op = base.military.corps_command!.arbih_3rd_corps!.active_operations[0]!;
        expect(isVlasicCohaExceptionOperation(base, 'arbih_other_corps', op)).toBe(false);

        const wrongIdentity = makeVlasicState(155);
        const wrongOp = wrongIdentity.military.corps_command!.arbih_3rd_corps!.active_operations[0]!;
        wrongOp.name = 'Operation Ordinary';
        expect(isVlasicCohaExceptionOperation(wrongIdentity, 'arbih_3rd_corps', wrongOp)).toBe(false);

        const wrongRoster = makeVlasicState(155);
        const wrongRosterOp = wrongRoster.military.corps_command!.arbih_3rd_corps!.active_operations[0]!;
        wrongRosterOp.participating_brigades = [
            ...wrongRosterOp.participating_brigades,
            'arbih_unrelated_brigade',
        ] as any;
        expect(isVlasicCohaExceptionOperation(wrongRoster, 'arbih_3rd_corps', wrongRosterOp)).toBe(false);

        const objectiveState = makeVlasicState(155);
        const objectiveOp = objectiveState.military.corps_command!.arbih_3rd_corps!.active_operations[0]!;
        objectiveOp.axes![0]!.current_objective_index = 1;
        expect(isVlasicCohaExceptionAttackOrder(
            objectiveState,
            'arbih_17th_vitezka_mountain' as any,
            'op:travnik:paklarevo',
        )).toBe(false);

        const ambiguous = makeVlasicState(155);
        const duplicate = JSON.parse(JSON.stringify(
            ambiguous.military.corps_command!.arbih_3rd_corps!.active_operations[0],
        )) as CorpsOperation;
        ambiguous.military.corps_command!.arbih_3rd_corps!.active_operations.push(duplicate);
        expect(isVlasicCohaExceptionAttackOrder(
            ambiguous,
            'arbih_17th_vitezka_mountain' as any,
            'op:travnik:paklarevo',
        )).toBe(false);

        const unrelated = makeState();
        expect(isVlasicCohaExceptionAttackOrder(
            unrelated,
            'b1' as any,
            'op:enemy:objective',
        )).toBe(false);
    });

    it('passes the approved operation order to ordinary resolution and preserves attribution', () => {
        const state = makeVlasicState();
        const report = resolveAttackOrdersOsid(
            state,
            [],
            new Map<string, string[]>(),
            undefined,
            undefined,
            undefined,
            undefined,
            new Map([
                ['op:travnik:turbe_2', ['op:travnik:paklarevo']],
                ['op:travnik:paklarevo', ['op:travnik:turbe_2']],
            ]),
        );
        expect(report.suppressed_attack_orders ?? []).toEqual([]);
        expect(report.orders_processed).toBe(1);
        expect(report.battles[0]?.operation_name).toBe('Operation Vlasic Ridge');
        expect(report.battles[0]?.operation_id).toContain('arbih_3rd_corps:Operation Vlasic Ridge');
    });

    it('emits the COHA pause receipt with zero orders and does not invalidate an unrelated operation', () => {
        const state = makeState();
        state.military.brigade_attack_orders = undefined;
        const report = resolveAttackOrdersOsid(
            state,
            [],
            new Map<string, string[]>(),
        );

        expect(report.combat_suppressed_reason).toBe('coha_ceasefire');
        expect(report.operation_lifecycle_paused_reason).toBe('coha_ceasefire');

        const diagnostic = buildOperationCombatDiagnostics(
            state,
            {
                attack_orders_by_brigade: {},
                movement_orders_by_brigade: {},
                attack_orders_by_corps: {},
                attack_orders_by_faction: {},
                eligible_attackers_by_corps: {},
            },
            report,
        )[0]!;
        expect(diagnostic.invalidation_reasons).not.toContain('execution_without_attack_orders');
    });

    it('keeps the exception closed outside the window and for unrelated operations', () => {
        const outside = makeVlasicState(156);
        const outsideOp = outside.military.corps_command!.arbih_3rd_corps!.active_operations[0]!;
        expect(isVlasicCohaExceptionOperation(outside, 'arbih_3rd_corps', outsideOp)).toBe(false);
        const unrelated = makeState();
        expect(isVlasicCohaExceptionAttackOrder(
            unrelated,
            'b1' as any,
            'op:enemy:objective',
        )).toBe(false);
    });

    it('keeps a mixed Vlašić battle and unrelated suppression out of Vlašić diagnostics', () => {
        const state = makeVlasicState();
        const operation = state.military.corps_command!.arbih_3rd_corps!.active_operations[0]!;
        state.military.brigade_attack_orders = {
            arbih_17th_vitezka_mountain: 'op:travnik:paklarevo',
            unrelated_brigade: 'op:unrelated:objective',
        } as any;
        const report = resolveAttackOrdersOsid(
            state,
            [],
            new Map<string, string[]>(),
            undefined,
            undefined,
            undefined,
            undefined,
            new Map([
                ['op:travnik:turbe_2', ['op:travnik:paklarevo']],
                ['op:travnik:paklarevo', ['op:travnik:turbe_2']],
            ]),
        );
        expect(report.battles).toHaveLength(1);
        expect(report.suppressed_attack_orders).toEqual([{
            brigade_id: 'unrelated_brigade',
            target_osid: 'op:unrelated:objective',
            reason: 'coha_ceasefire',
        }]);
        const diagnostics = buildOperationCombatDiagnostics(
            state,
            {
                attack_orders_by_brigade: {
                    arbih_17th_vitezka_mountain: 'op:travnik:paklarevo',
                },
                movement_orders_by_brigade: {},
                attack_orders_by_corps: {},
                attack_orders_by_faction: {},
                eligible_attackers_by_corps: {},
            },
            report,
        );
        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0]?.operation_name).toBe(operation.name);
        expect(diagnostics[0]?.invalidation_reasons).not.toContain('execution_without_attack_orders');
        expect(diagnostics[0]?.invalidation_reasons).not.toContain('execution_without_eligible_attackers');
    });

    it('preserves automatic operation elapsed time while combat is suspended', () => {
        const state = makeState();
        const operation = state.military.corps_command!.corps_1!.active_operations[0]!;

        advanceSectorOffensives(state);

        expect(operation.phase).toBe('execution');
        expect(operation.phase_started_turn).toBe(149);
        expect(operation.attack_attempt_count).toBe(0);
        expect(operation.movement_only_execution_turns).toBe(0);
        expect(operation.recovery_reason).toBeUndefined();
    });

    it('does not turn ceasefire attack posture into operation progress or failure', () => {
        const state = makeState();
        const operation = state.military.corps_command!.corps_1!.active_operations[0]!;

        updateSectorOffensiveResults(state);

        expect(operation.attack_attempt_count).toBe(0);
        expect(operation.failure_count).toBe(0);
        expect(operation.movement_only_execution_turns).toBe(0);
        expect(operation.idle_execution_turn_streak).toBe(0);
        expect(operation.last_result).toBeUndefined();
    });

    it('audits and consumes attack orders suppressed by the ceasefire', () => {
        const state = makeState();

        const report = resolveAttackOrdersOsid(
            state,
            [],
            {} as any,
        );

        expect(report.combat_suppressed_reason).toBe('coha_ceasefire');
        expect(report.operation_lifecycle_paused_reason).toBe('coha_ceasefire');
        expect(report.suppressed_attack_orders).toEqual([{
            brigade_id: 'b1',
            target_osid: 'op:enemy:objective',
            reason: 'coha_ceasefire',
        }]);
        expect(report.orders_seen_by_brigade).toEqual({
            b1: 'op:enemy:objective',
        });
        expect(state.military.brigade_attack_orders).toBeUndefined();
        expect(report.battles).toEqual([]);
    });
});
