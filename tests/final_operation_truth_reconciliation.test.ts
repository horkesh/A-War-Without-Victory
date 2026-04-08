import { describe, expect, it } from 'vitest';
import { reconcileFinalOperationTruth } from '../src/sim/combat/final_operation_truth_reconciliation.js';
import type { GameState } from '../src/state/game_state.js';
import { makeFormation, makeSector } from './test_factories.js';

function makeState(): GameState {
    return {
        meta: {
            turn: 12,
            phase: 'war',
        },
        military: {
            formations: {},
            corps_command: {},
            corps_front_sectors: {},
        },
        political: { political_controllers: {} },
        factions: [],
    } as unknown as GameState;
}

describe('reconcileFinalOperationTruth', () => {
    it('removes stale participants and axis brigades, then reanchors to truthful final sectors', () => {
        const state = makeState();
        state.military.formations = {
            b_active: makeFormation({
                id: 'b_active',
                faction: 'RS',
                corps_id: 'test_corps',
                location_osid: 'front_truth',
                home_osid: 'front_truth',
                status: 'active',
            }),
            b_destroyed: makeFormation({
                id: 'b_destroyed',
                faction: 'RS',
                corps_id: 'test_corps',
                location_osid: 'rear_old',
                home_osid: 'rear_old',
                status: 'inactive',
            }),
        };
        state.military.corps_front_sectors = {
            stale: makeSector({
                sector_id: 'sector:test:stale',
                corps_id: 'test_corps',
                assigned_brigade_ids: ['b_active', 'b_destroyed'],
                territory_osids: ['rear_old'],
                friendly_osids: ['rear_old'],
                edge_ids: ['rear_old__enemy'],
            }),
            truth: makeSector({
                sector_id: 'sector:test:truth',
                corps_id: 'test_corps',
                assigned_brigade_ids: [],
                territory_osids: ['front_truth'],
                friendly_osids: ['front_truth'],
                edge_ids: ['front_truth__enemy'],
            }),
        };
        state.military.corps_command = {
            test_corps: {
                active_operations: [{
                    name: 'Operation Test',
                    type: 'sector_attack',
                    phase: 'execution',
                    started_turn: 10,
                    phase_started_turn: 10,
                    participating_brigades: ['b_active', 'b_destroyed'],
                    sector_id: 'sector:test:stale',
                    axes: [
                        {
                            axis_id: 'axis:test',
                            name: 'Main Axis',
                            assigned_brigades: ['b_active', 'b_destroyed'],
                            objectives: ['enemy'],
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
                    objectives: ['enemy'],
                }],
            } as any,
        };

        reconcileFinalOperationTruth(state);

        const op = state.military.corps_command!.test_corps.active_operations[0];
        expect(op.participating_brigades).toEqual(['b_active']);
        expect(op.axes?.[0]?.assigned_brigades).toEqual(['b_active']);
        expect(op.sector_id).toBe('sector:test:truth');
    });

    it('forces empty execution operations into recovery with brigade attrition reason', () => {
        const state = makeState();
        state.military.formations = {
            b_destroyed: makeFormation({
                id: 'b_destroyed',
                faction: 'RS',
                corps_id: 'test_corps',
                location_osid: 'front_a',
                home_osid: 'front_a',
                status: 'inactive',
            }),
        };
        state.military.corps_front_sectors = {
            truth: makeSector({
                sector_id: 'sector:test:truth',
                corps_id: 'test_corps',
                assigned_brigade_ids: [],
                territory_osids: ['front_a'],
                friendly_osids: ['front_a'],
                edge_ids: ['front_a__enemy'],
            }),
        };
        state.military.corps_command = {
            test_corps: {
                active_operations: [{
                    name: 'Operation Empty',
                    type: 'sector_attack',
                    phase: 'execution',
                    started_turn: 10,
                    phase_started_turn: 10,
                    participating_brigades: ['b_destroyed'],
                    sector_id: 'sector:test:truth',
                    objectives: ['enemy'],
                }],
            } as any,
        };

        reconcileFinalOperationTruth(state);

        const op = state.military.corps_command!.test_corps.active_operations[0];
        expect(op.participating_brigades).toEqual([]);
        expect(op.phase).toBe('recovery');
        expect(op.recovery_reason).toBe('brigade_attrition');
        expect(op.phase_started_turn).toBe(12);
    });
});
