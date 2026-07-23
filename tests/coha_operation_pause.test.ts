import { describe, expect, it } from 'vitest';

import { resolveAttackOrdersOsid } from '../src/sim/combat/attack_resolution_osid.js';
import {
    advanceSectorOffensives,
    updateSectorOffensiveResults,
} from '../src/sim/combat/sector_offensive.js';
import type { CorpsOperation, FactionId, FormationState, GameState } from '../src/state/game_state.js';

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

describe('COHA operation pause', () => {
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
