import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AttackResolutionOsidReport } from '../src/sim/combat/attack_resolution_osid.js';
import type { FactionId, FormationState, GameState } from '../src/state/game_state.js';
import {
    buildCombatCausalitySummary,
    buildOperationCombatDiagnostics,
    type BotOrderDiagnosticsSnapshot
} from '../src/scenario/combat_causality.js';

function makeState(): GameState {
    const formations: Record<string, FormationState> = {
        corps_1: {
            id: 'corps_1' as any,
            name: '1st Corps',
            faction: 'RS' as FactionId,
            kind: 'corps' as any,
            status: 'active',
            personnel: 0,
            location_osid: 'op:rs:staging',
        } as FormationState,
        b1: {
            id: 'b1' as any,
            name: 'Brigade 1',
            faction: 'RS' as FactionId,
            corps_id: 'corps_1' as any,
            kind: 'brigade',
            status: 'active',
            personnel: 1500,
            location_osid: 'op:rs:staging',
        } as FormationState,
        b2: {
            id: 'b2' as any,
            name: 'Brigade 2',
            faction: 'RS' as FactionId,
            corps_id: 'corps_1' as any,
            kind: 'brigade',
            status: 'active',
            personnel: 1400,
            location_osid: 'op:rs:staging',
        } as FormationState,
    };

    return {
        schema_version: 1,
        meta: { turn: 5, phase: 'war', seed: 'test' } as GameState['meta'],
        factions: [{ id: 'RS' as FactionId }] as GameState['factions'],
        formations,
        political_controllers: {
            'op:enemy:obj1': 'RBiH',
        },
        corps_command: {
            corps_1: {
                command_span: 0,
                subordinate_count: 2,
                og_slots: 0,
                active_ogs: [],
                corps_exhaustion: 0,
                stance: 'offensive' as any,
                active_operation: {
                    name: 'Operacija Test',
                    type: 'sector_attack',
                    phase: 'execution',
                    started_turn: 1,
                    phase_started_turn: 2,
                    participating_brigades: ['b1', 'b2'] as any,
                    objectives: ['op:enemy:obj1'],
                    current_objective_index: 0,
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                }
            } as any
        }
    } as unknown as GameState;
}

function makeOrderSnapshot(
    attackOrdersByBrigade: Record<string, string>,
    movementOrdersByBrigade: Record<string, string> = {},
    eligibleAttackersByCorps: Record<string, number> = {}
): BotOrderDiagnosticsSnapshot {
    return {
        attack_orders_by_brigade: attackOrdersByBrigade,
        movement_orders_by_brigade: movementOrdersByBrigade,
        attack_orders_by_corps: { corps_1: Object.keys(attackOrdersByBrigade).length },
        attack_orders_by_faction: { RS: Object.keys(attackOrdersByBrigade).length },
        eligible_attackers_by_corps: eligibleAttackersByCorps
    };
}

function makeOsidReport(
    battles: AttackResolutionOsidReport['battles']
): AttackResolutionOsidReport {
    return {
        orders_processed: battles.length,
        unique_attack_targets: battles.length,
        flips_applied: 0,
        casualty_attacker: 0,
        casualty_defender: 0,
        orders_by_faction: battles.length > 0 ? { RS: battles.length } : {},
        engaged_formation_ids: [],
        snap_events: [],
        snap_event_counts: {},
        battles
    };
}

describe('combat causality diagnostics', () => {
    it('flags execution-phase operation with zero attack attempts', () => {
        const diagnostics = buildOperationCombatDiagnostics(
            makeState(),
            makeOrderSnapshot({}),
            makeOsidReport([])
        );

        assert.equal(diagnostics.length, 1);
        assert.equal(diagnostics[0]!.invalid_for_combat_calibration, true);
        assert.ok(diagnostics[0]!.invalidation_reasons.includes('execution_without_attack_orders'));
    });

    it('flags execution-phase operation with participants but zero eligible attackers', () => {
        const diagnostics = buildOperationCombatDiagnostics(
            makeState(),
            makeOrderSnapshot({}, {}, { corps_1: 0 }),
            makeOsidReport([])
        );

        assert.equal(diagnostics.length, 1);
        assert.equal(diagnostics[0]!.eligible_attacker_count, 0);
        assert.ok(diagnostics[0]!.invalidation_reasons.includes('execution_without_eligible_attackers'));

        const summary = buildCombatCausalitySummary(
            diagnostics,
            makeOrderSnapshot({}, {}, { corps_1: 0 }),
            makeOsidReport([])
        );

        assert.ok(summary.invalidation_reasons.includes('operation_execution_without_eligible_attackers'));
    });

    it('flags execution-phase operation with attack orders but zero battles', () => {
        const diagnostics = buildOperationCombatDiagnostics(
            makeState(),
            makeOrderSnapshot({ b1: 'op:enemy:obj1' }, {}, { corps_1: 1 }),
            makeOsidReport([])
        );

        assert.equal(diagnostics.length, 1);
        assert.equal(diagnostics[0]!.attack_attempt_count, 1);
        assert.equal(diagnostics[0]!.battle_count, 0);
        assert.ok(diagnostics[0]!.invalidation_reasons.includes('attack_orders_without_battles'));
    });

    it('does not flag execution-phase operation that is still maneuvering into position', () => {
        const diagnostics = buildOperationCombatDiagnostics(
            makeState(),
            makeOrderSnapshot({}, { b1: 'op:rs:approach' }, { corps_1: 1 }),
            makeOsidReport([])
        );

        assert.equal(diagnostics.length, 1);
        assert.equal(diagnostics[0]!.movement_order_count, 1);
        assert.equal(diagnostics[0]!.invalid_for_combat_calibration, false);
        assert.deepEqual(diagnostics[0]!.invalidation_reasons, []);
    });

    it('treats operation as valid when attack orders and battles exist', () => {
        const state = makeState();
        const diagnostics = buildOperationCombatDiagnostics(
            state,
            makeOrderSnapshot({ b1: 'op:enemy:obj1' }, {}, { corps_1: 1 }),
            makeOsidReport([{
                attacker_brigade: 'b1' as any,
                attacker_faction: 'RS',
                defender_faction: 'RBiH',
                target_osid: 'op:enemy:obj1' as any,
                outcome: 'victory' as any,
                power_ratio: 1.2,
                attacker_won: true,
                defender_brigade: null,
                snap_events: []
            }])
        );

        assert.equal(diagnostics[0]!.invalid_for_combat_calibration, false);
        assert.equal(diagnostics[0]!.current_objective_attack_count, 1);
        assert.equal(diagnostics[0]!.current_objective_battle_count, 1);

        const summary = buildCombatCausalitySummary(
            diagnostics,
            makeOrderSnapshot({ b1: 'op:enemy:obj1' }, {}, { corps_1: 1 }),
            makeOsidReport([{
                attacker_brigade: 'b1' as any,
                attacker_faction: 'RS',
                defender_faction: 'RBiH',
                target_osid: 'op:enemy:obj1' as any,
                outcome: 'victory' as any,
                power_ratio: 1.2,
                attacker_won: true,
                defender_brigade: null,
                snap_events: []
            }])
        );

        assert.equal(summary.valid_for_combat_calibration, true);
        assert.equal(summary.total_battles, 1);
        assert.deepEqual(summary.total_orders_by_faction, { RS: 1 });
    });

    it('invalidates summary when total battles are zero', () => {
        const diagnostics = buildOperationCombatDiagnostics(
            makeState(),
            makeOrderSnapshot({}),
            makeOsidReport([])
        );
        const summary = buildCombatCausalitySummary(
            diagnostics,
            makeOrderSnapshot({}),
            makeOsidReport([])
        );

        assert.equal(summary.valid_for_combat_calibration, false);
        assert.ok(summary.invalidation_reasons.includes('zero_battles'));
    });

    it('flags recovery-phase operation that never logged an objective attempt', () => {
        const state = makeState();
        state.corps_command!['corps_1']!.active_operation = {
            ...state.corps_command!['corps_1']!.active_operation!,
            phase: 'recovery',
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
            recovery_reason: 'no_logged_attempt',
        } as any;

        const diagnostics = buildOperationCombatDiagnostics(
            state,
            makeOrderSnapshot({}),
            makeOsidReport([])
        );

        assert.equal(diagnostics.length, 1);
        assert.ok(diagnostics[0]!.invalidation_reasons.includes('recovery_without_logged_attempt'));

        const summary = buildCombatCausalitySummary(
            diagnostics,
            makeOrderSnapshot({}),
            makeOsidReport([])
        );

        assert.ok(summary.invalidation_reasons.includes('operation_recovery_without_logged_attempt'));
        assert.equal(summary.recovery_without_logged_attempt_count, 1);
    });

    it('surfaces persisted operation counters in diagnostics and summary', () => {
        const state = makeState();
        state.corps_command!['corps_1']!.active_operation = {
            ...state.corps_command!['corps_1']!.active_operation!,
            attack_attempt_count: 2,
            objective_capture_count: 1,
            movement_only_execution_turns: 3,
            idle_execution_turn_streak: 0,
        } as any;

        const diagnostics = buildOperationCombatDiagnostics(
            state,
            makeOrderSnapshot({ b1: 'op:enemy:obj1' }, {}, { corps_1: 1 }),
            makeOsidReport([{
                attacker_brigade: 'b1' as any,
                attacker_faction: 'RS',
                defender_faction: 'RBiH',
                target_osid: 'op:enemy:obj1' as any,
                outcome: 'victory' as any,
                power_ratio: 1.2,
                attacker_won: true,
                defender_brigade: null,
                snap_events: []
            }])
        );

        assert.equal(diagnostics[0]!.objective_attempt_count, 2);
        assert.equal(diagnostics[0]!.objective_capture_count, 1);
        assert.equal(diagnostics[0]!.movement_only_execution_turns, 3);

        const summary = buildCombatCausalitySummary(
            diagnostics,
            makeOrderSnapshot({ b1: 'op:enemy:obj1' }, {}, { corps_1: 1 }),
            makeOsidReport([{
                attacker_brigade: 'b1' as any,
                attacker_faction: 'RS',
                defender_faction: 'RBiH',
                target_osid: 'op:enemy:obj1' as any,
                outcome: 'victory' as any,
                power_ratio: 1.2,
                attacker_won: true,
                defender_brigade: null,
                snap_events: []
            }])
        );

        assert.equal(summary.total_objective_attempts, 2);
        assert.equal(summary.total_objective_captures, 1);
        assert.equal(summary.movement_only_execution_turns, 3);
    });
});
