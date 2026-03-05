import { describe, expect, it } from 'vitest';

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
    movementOrdersByBrigade: Record<string, string> = {}
): BotOrderDiagnosticsSnapshot {
    return {
        attack_orders_by_brigade: attackOrdersByBrigade,
        movement_orders_by_brigade: movementOrdersByBrigade,
        attack_orders_by_corps: { corps_1: Object.keys(attackOrdersByBrigade).length },
        attack_orders_by_faction: { RS: Object.keys(attackOrdersByBrigade).length }
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

        expect(diagnostics.length).toBe(1);
        expect(diagnostics[0]!.invalid_for_combat_calibration).toBe(true);
        expect(diagnostics[0]!.invalidation_reasons).toContain('execution_without_attack_orders');
    });

    it('flags execution-phase operation with attack orders but zero battles', () => {
        const diagnostics = buildOperationCombatDiagnostics(
            makeState(),
            makeOrderSnapshot({ b1: 'op:enemy:obj1' }),
            makeOsidReport([])
        );

        expect(diagnostics.length).toBe(1);
        expect(diagnostics[0]!.attack_attempt_count).toBe(1);
        expect(diagnostics[0]!.battle_count).toBe(0);
        expect(diagnostics[0]!.invalidation_reasons).toContain('attack_orders_without_battles');
    });

    it('does not flag execution-phase operation that is still maneuvering into position', () => {
        const diagnostics = buildOperationCombatDiagnostics(
            makeState(),
            makeOrderSnapshot({}, { b1: 'op:rs:approach' }),
            makeOsidReport([])
        );

        expect(diagnostics.length).toBe(1);
        expect(diagnostics[0]!.movement_order_count).toBe(1);
        expect(diagnostics[0]!.invalid_for_combat_calibration).toBe(false);
        expect(diagnostics[0]!.invalidation_reasons).toEqual([]);
    });

    it('treats operation as valid when attack orders and battles exist', () => {
        const state = makeState();
        const diagnostics = buildOperationCombatDiagnostics(
            state,
            makeOrderSnapshot({ b1: 'op:enemy:obj1' }),
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

        expect(diagnostics[0]!.invalid_for_combat_calibration).toBe(false);
        expect(diagnostics[0]!.current_objective_attack_count).toBe(1);
        expect(diagnostics[0]!.current_objective_battle_count).toBe(1);

        const summary = buildCombatCausalitySummary(
            diagnostics,
            makeOrderSnapshot({ b1: 'op:enemy:obj1' }),
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

        expect(summary.valid_for_combat_calibration).toBe(true);
        expect(summary.total_battles).toBe(1);
        expect(summary.total_orders_by_faction).toEqual({ RS: 1 });
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

        expect(summary.valid_for_combat_calibration).toBe(false);
        expect(summary.invalidation_reasons).toContain('zero_battles');
    });
});
