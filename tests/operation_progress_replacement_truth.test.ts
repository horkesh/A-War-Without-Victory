import { describe, expect, it } from 'vitest';
import { evaluateOperationProgress } from '../src/sim/combat/sector_offensive.js';
import type { GameState } from '../src/state/game_state.js';
import { makeFormation } from './test_factories.js';

describe('evaluateOperationProgress', () => {
    it('keeps axis assignments in sync when a damaged participant is replaced', () => {
        const state = {
            meta: { turn: 12, phase: 'war' },
            factions: [{ id: 'RS' }],
            political: { political_controllers: {} },
            military: {
                formations: {
                    rs_corps: makeFormation({ id: 'rs_corps', faction: 'RS', kind: 'corps', corps_id: 'rs_corps', location_osid: 'rear', home_osid: 'rear' }),
                    rs_old: makeFormation({ id: 'rs_old', faction: 'RS', corps_id: 'rs_corps', personnel: 600, cohesion: 60, location_osid: 'front_a', home_osid: 'front_a' }),
                    rs_keep: makeFormation({ id: 'rs_keep', faction: 'RS', corps_id: 'rs_corps', personnel: 2200, cohesion: 60, location_osid: 'front_b', home_osid: 'front_b' }),
                    rs_fresh: makeFormation({ id: 'rs_fresh', faction: 'RS', corps_id: 'rs_corps', personnel: 2600, cohesion: 70, location_osid: 'reserve', home_osid: 'reserve' }),
                },
                corps_command: {
                    rs_corps: {
                        active_operations: [{
                            name: 'Operation Replace',
                            type: 'general_offensive',
                            phase: 'execution',
                            started_turn: 10,
                            phase_started_turn: 11,
                            participating_brigades: ['rs_old', 'rs_keep'],
                            target_settlements: ['enemy_a', 'enemy_b', 'enemy_c'],
                            axes: [
                                {
                                    axis_id: 'axis:a',
                                    name: 'Axis A',
                                    assigned_brigades: ['rs_old'],
                                    objectives: ['enemy_a'],
                                    current_objective_index: 0,
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
                                    axis_id: 'axis:b',
                                    name: 'Axis B',
                                    assigned_brigades: ['rs_keep'],
                                    objectives: ['enemy_b'],
                                    current_objective_index: 0,
                                    status: 'executing',
                                    failure_count: 0,
                                    consecutive_failures_on_current: 0,
                                    momentum: 0,
                                    attack_attempt_count: 0,
                                    objective_capture_count: 0,
                                    movement_only_execution_turns: 0,
                                    idle_execution_turn_streak: 0,
                                },
                            ],
                        }],
                    },
                },
            },
        } as unknown as GameState;

        evaluateOperationProgress(state, 'RS');

        const op = state.military.corps_command!.rs_corps.active_operations[0];
        expect(op.participating_brigades).toEqual(['rs_fresh', 'rs_keep']);
        expect(op.axes?.[0]?.assigned_brigades).toEqual(['rs_fresh']);
        expect(op.axes?.[1]?.assigned_brigades).toEqual(['rs_keep']);
    });
});
