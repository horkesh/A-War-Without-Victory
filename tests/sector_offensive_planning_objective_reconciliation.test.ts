import { describe, expect, it } from 'vitest';

import { reconcilePlanningObjectives } from '../src/sim/combat/sector_offensive.js';
import type { CorpsOperation, GameState } from '../src/state/game_state.js';

describe('planning objective reconciliation', () => {
    it('retains foreign-controlled objectives during reconciliation, including a combat-blocked one', () => {
        const axis = (axis_id: string, objective: string) => ({
            axis_id,
            name: axis_id,
            assigned_brigades: ['arbih_bde'],
            objectives: [objective],
            current_objective_index: 0,
            status: 'executing' as const,
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
        });
        const op: CorpsOperation = {
            name: 'Post-Washington operation',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 101,
            phase_started_turn: 101,
            participating_brigades: ['arbih_bde'],
            objectives: ['op:allied', 'op:enemy'],
            axes: [axis('allied_axis', 'op:allied'), axis('enemy_axis', 'op:enemy')],
        };
        const state = {
            meta: { turn: 101, phase: 'war' },
            military: {
                war_front_edges_osid: [{
                    edge_id: 'enemy-front',
                    a: 'op:approach',
                    b: 'op:enemy',
                    side_a: 'RBiH',
                    side_b: 'RS',
                }],
            },
            political: {
                war_alliance_rbih_hrhb: -0.5,
                rbih_hrhb_state: { washington_signed: true },
                political_controllers: {
                    'op:approach': 'RBiH',
                    'op:allied': 'HRHB',
                    'op:enemy': 'RS',
                },
            },
        } as unknown as GameState;

        expect(reconcilePlanningObjectives(state, 'arbih_corps', op, 'RBiH')).toBe('valid');
        expect(op.axes?.map((entry) => entry.axis_id)).toEqual(['allied_axis', 'enemy_axis']);
        expect(op.objectives).toEqual(['op:allied', 'op:enemy']);
    });

    it('does not misclassify a combat-blocked foreign objective as completed', () => {
        const op: CorpsOperation = {
            name: 'Operacija Osvit shape',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 101,
            phase_started_turn: 101,
            participating_brigades: ['arbih_bde'],
            objectives: ['op:jablanica:doljani_2'],
            current_objective_index: 0,
        };
        const state = {
            meta: { turn: 101, phase: 'war' },
            military: {
                war_front_edges_osid: [{
                    edge_id: 'blocked-front',
                    a: 'op:jablanica:approach',
                    b: 'op:jablanica:doljani_2',
                    side_a: 'RBiH',
                    side_b: 'HRHB',
                }],
            },
            political: {
                war_alliance_rbih_hrhb: -0.5,
                rbih_hrhb_state: { washington_signed: true },
                political_controllers: {
                    'op:jablanica:approach': 'RBiH',
                    'op:jablanica:doljani_2': 'HRHB',
                },
            },
        } as unknown as GameState;

        expect(reconcilePlanningObjectives(state, 'arbih_4th_corps', op, 'RBiH')).toBe('valid');
        expect(op.objectives).toEqual(['op:jablanica:doljani_2']);
    });

    it('drops a stale objective prefix when a later objective still has a live corps approach', () => {
        const op: CorpsOperation = {
            name: 'Generated operation',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 10,
            phase_started_turn: 10,
            participating_brigades: ['hvo_a', 'hv_b'],
            objectives: ['op:stale', 'op:viable'],
            current_objective_index: 0,
            axes: [{
                axis_id: 'main',
                name: 'Main Axis',
                assigned_brigades: ['hvo_a', 'hv_b'],
                objectives: ['op:stale', 'op:viable'],
                current_objective_index: 0,
                status: 'executing',
                failure_count: 0,
                consecutive_failures_on_current: 0,
                momentum: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
            }],
        };
        const state = {
            meta: { turn: 12, phase: 'war' },
            military: {
                war_front_edges_osid: [{
                    edge_id: 'live-front',
                    a: 'op:approach',
                    b: 'op:viable',
                    side_a: 'HRHB',
                    side_b: 'RS',
                }],
            },
            political: {
                political_controllers: {
                    'op:stale': 'RBiH',
                    'op:approach': 'HRHB',
                    'op:viable': 'RS',
                },
            },
        } as unknown as GameState;

        expect(reconcilePlanningObjectives(state, 'hvo_corps', op, 'HRHB')).toBe('valid');
        expect(op.axes?.[0]?.objectives).toEqual(['op:viable']);
        expect(op.objectives).toEqual(['op:viable']);
    });

    it('does not treat pre-planned provenance as an authored sequence constraint', () => {
        const op: CorpsOperation = {
            name: 'Pre-planned operation with stale prefix',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 10,
            phase_started_turn: 10,
            participating_brigades: ['bde'],
            objectives: ['op:stale', 'op:viable'],
            current_objective_index: 0,
            is_pre_planned: true,
            axes: [{
                axis_id: 'main',
                name: 'Main Axis',
                assigned_brigades: ['bde'],
                objectives: ['op:stale', 'op:viable'],
                current_objective_index: 0,
                status: 'executing',
                failure_count: 0,
                consecutive_failures_on_current: 0,
                momentum: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
            }],
        };
        const state = {
            meta: { turn: 12, phase: 'war' },
            military: {
                war_front_edges_osid: [{
                    edge_id: 'live-front',
                    a: 'op:approach',
                    b: 'op:viable',
                    side_a: 'HRHB',
                    side_b: 'RS',
                }],
            },
            political: {
                political_controllers: {
                    'op:stale': 'RS',
                    'op:approach': 'HRHB',
                    'op:viable': 'RS',
                },
            },
        } as unknown as GameState;

        expect(reconcilePlanningObjectives(state, 'hvo_corps', op, 'HRHB')).toBe('valid');
        expect(op.axes?.[0]?.objectives).toEqual(['op:viable']);
        expect(op.objectives).toEqual(['op:viable']);
    });

    it('keeps a reachable first objective and its deeper objective chain', () => {
        const op: CorpsOperation = {
            name: 'Reachable operation',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 10,
            phase_started_turn: 10,
            participating_brigades: ['bde'],
            objectives: ['op:first', 'op:deep'],
            current_objective_index: 0,
        };
        const state = {
            meta: { turn: 12, phase: 'war' },
            military: {
                war_front_edges_osid: [{
                    edge_id: 'live-front',
                    a: 'op:approach',
                    b: 'op:first',
                    side_a: 'HRHB',
                    side_b: 'RS',
                }],
            },
            political: {
                political_controllers: {
                    'op:approach': 'HRHB',
                    'op:first': 'RS',
                    'op:deep': 'RS',
                },
            },
        } as unknown as GameState;

        expect(reconcilePlanningObjectives(state, 'hvo_corps', op, 'HRHB')).toBe('valid');
        expect(op.objectives).toEqual(['op:first', 'op:deep']);
    });

    it('does not bypass an unreachable objective to attack deeper territory held by the same defender', () => {
        const op: CorpsOperation = {
            name: 'Authored sequential operation',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 10,
            phase_started_turn: 10,
            participating_brigades: ['bde'],
            objectives: ['op:first', 'op:deep'],
            current_objective_index: 0,
            preserve_objective_sequence: true,
            axes: [{
                axis_id: 'main',
                name: 'Main Axis',
                assigned_brigades: ['bde'],
                objectives: ['op:first', 'op:deep'],
                current_objective_index: 0,
                status: 'executing',
                failure_count: 0,
                consecutive_failures_on_current: 0,
                momentum: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
            }],
        };
        const state = {
            meta: { turn: 12, phase: 'war' },
            military: {
                war_front_edges_osid: [{
                    edge_id: 'live-front',
                    a: 'op:approach',
                    b: 'op:deep',
                    side_a: 'HRHB',
                    side_b: 'RS',
                }],
            },
            political: {
                political_controllers: {
                    'op:first': 'RS',
                    'op:approach': 'HRHB',
                    'op:deep': 'RS',
                },
            },
        } as unknown as GameState;

        expect(reconcilePlanningObjectives(state, 'hvo_corps', op, 'HRHB')).toBe('valid');
        expect(op.axes?.[0]?.objectives).toEqual(['op:first', 'op:deep']);
        expect(op.objectives).toEqual(['op:deep', 'op:first']);
    });

    it('leaves a wholly unreachable chain for the existing invalidation path', () => {
        const op: CorpsOperation = {
            name: 'Invalidated operation',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 10,
            phase_started_turn: 10,
            participating_brigades: ['bde'],
            objectives: ['op:first', 'op:deep'],
            current_objective_index: 0,
        };
        const state = {
            meta: { turn: 12, phase: 'war' },
            military: { war_front_edges_osid: [] },
            political: {
                political_controllers: {
                    'op:first': 'RS',
                    'op:deep': 'RS',
                },
            },
        } as unknown as GameState;

        expect(reconcilePlanningObjectives(state, 'hvo_corps', op, 'HRHB')).toBe('invalidated');
        expect(op.objectives).toEqual(['op:first', 'op:deep']);
    });

    it('retains a staged sibling axis when another axis has an immediate approach', () => {
        const axis = (axis_id: string, objectives: string[]) => ({
            axis_id,
            name: axis_id,
            assigned_brigades: ['bde'],
            objectives,
            current_objective_index: 0,
            status: 'executing' as const,
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
        });
        const op: CorpsOperation = {
            name: 'Mixed-axis operation',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 1,
            phase_started_turn: 1,
            participating_brigades: ['bde'],
            objectives: ['op:dead', 'op:live'],
            axes: [axis('dead', ['op:dead']), axis('live', ['op:live'])],
        };
        const state = {
            meta: { turn: 2, phase: 'war' },
            military: {
                war_front_edges_osid: [{
                    edge_id: 'live-front',
                    a: 'op:approach',
                    b: 'op:live',
                    side_a: 'HRHB',
                    side_b: 'RS',
                }],
            },
            political: {
                political_controllers: {
                    'op:dead': 'RS',
                    'op:approach': 'HRHB',
                    'op:live': 'RS',
                },
            },
        } as unknown as GameState;

        expect(reconcilePlanningObjectives(state, 'hvo_corps', op, 'HRHB')).toBe('valid');
        expect(op.axes?.map((entry) => entry.axis_id)).toEqual(['dead', 'live']);
        expect(op.objectives).toEqual(['op:dead', 'op:live']);
    });
});
