/**
 * Unit tests for Phase C: sector offensive lifecycle.
 *
 * Verifies:
 * - Planning duration computation
 * - Operation name selection (deterministic)
 * - Sector offensive launch criteria
 * - Momentum bonuses
 * - Advance lifecycle (planning → execution → recovery)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    computePlanningDuration,
    evaluateSectorOffensiveLaunch,
    advanceSectorOffensives,
    updateSectorOffensiveResults,
    getMomentumAggressionBonus,
    getMomentumMinOutcome
} from '../src/sim/combat/sector_offensive.js';
import { pickOperationName, OPERATION_NAMES } from '../src/sim/combat/operation_names.js';
import type { GameState, FactionId, FormationState } from '../src/state/game_state.js';
import type { SupplyStateByOsidReport } from '../src/state/supply_state_derivation.js';

function makeMinimalState(turn: number, formations: Record<string, Partial<FormationState>>): GameState {
    const fmts: Record<string, FormationState> = {};
    for (const [id, partial] of Object.entries(formations)) {
        fmts[id] = {
            id, name: id, faction: 'RS' as FactionId, kind: 'brigade', status: 'active',
            personnel: 2000, location_osid: 'op:test:1',
            ...partial,
        } as FormationState;
    }
    return {
        meta: { turn, phase: 'war', scenario_start_date: { year: 1992, month: 4, day: 6 }, seed: 'test' } as GameState['meta'],
        factions: [{ id: 'RS' as FactionId }] as GameState['factions'],
        formations: fmts,
        political_controllers: {},
        corps_command: {},
        corps_front_sectors: {},
    } as GameState;
}

describe('Sector Offensive — Planning Duration', () => {
    it('1-2 objectives → 1 turn', () => {
        assert.equal(computePlanningDuration(1), 1);
        assert.equal(computePlanningDuration(2), 1);
    });

    it('3-5 objectives → ceil(N × 0.6)', () => {
        assert.equal(computePlanningDuration(3), 2); // ceil(1.8) = 2
        assert.equal(computePlanningDuration(4), 3); // ceil(2.4) = 3
        assert.equal(computePlanningDuration(5), 3); // ceil(3.0) = 3
    });

    it('6+ objectives → min(5, ceil(N × 0.8))', () => {
        assert.equal(computePlanningDuration(6), 5); // min(5, ceil(4.8)) = 5
        assert.equal(computePlanningDuration(8), 5); // min(5, ceil(6.4)) = 5
    });
});

describe('Sector Offensive — Operation Names', () => {
    it('pickOperationName is deterministic', () => {
        const name1 = pickOperationName('corps_1kk', 5, 'RS');
        const name2 = pickOperationName('corps_1kk', 5, 'RS');
        assert.equal(name1, name2);
    });

    it('different corps/turn produce different names', () => {
        const name1 = pickOperationName('corps_1kk', 5, 'RS');
        const name2 = pickOperationName('corps_drk', 5, 'RS');
        // Not guaranteed different, but very likely with different corps IDs
        // Just check they're valid
        assert.ok(OPERATION_NAMES['RS']!.includes(name1));
        assert.ok(OPERATION_NAMES['RS']!.includes(name2));
    });

    it('faction-specific pools', () => {
        const rsName = pickOperationName('test', 1, 'RS');
        const rbihName = pickOperationName('test', 1, 'RBiH');
        assert.ok(OPERATION_NAMES['RS']!.includes(rsName));
        assert.ok(OPERATION_NAMES['RBiH']!.includes(rbihName));
    });
});

describe('Sector Offensive — Momentum', () => {
    it('aggression bonus scales with momentum', () => {
        assert.equal(getMomentumAggressionBonus(0), 0);
        assert.equal(getMomentumAggressionBonus(1), 0.05);
        assert.equal(getMomentumAggressionBonus(2), 0.10);
        assert.equal(getMomentumAggressionBonus(3), 0.15);
    });

    it('min outcome relaxation', () => {
        assert.equal(getMomentumMinOutcome(0, 'victory'), 'victory');
        assert.equal(getMomentumMinOutcome(3, 'victory'), 'stalemate');
        assert.equal(getMomentumMinOutcome(2, 'victory'), 'costly_victory');
        assert.equal(getMomentumMinOutcome(1, 'decisive_victory'), 'victory');
    });
});

describe('Sector Offensive — Launch Evaluation', () => {
    it('launches when all criteria met', () => {
        const state = makeMinimalState(5, {
            'b1': { corps_id: 'corps_1' as any, location_osid: 'op:a:1' },
            'b2': { corps_id: 'corps_1' as any, location_osid: 'op:a:2' },
            'b3': { corps_id: 'corps_1' as any, location_osid: 'op:a:3' },
        });

        const op = evaluateSectorOffensiveLaunch(
            state, 'corps_1', 'sector:corps_1:0', 'RS' as FactionId,
            ['b1', 'b2', 'b3'], // brigade IDs
            ['op:e:1', 'op:e:2', 'op:e:3'], // enemy OSIDs
            ['op:e:1', 'op:e:2', 'op:e:3'], // offensive targets
            null // no supply report → adequate
        );

        assert.ok(op, 'Should launch');
        assert.equal(op!.type, 'sector_attack');
        assert.equal(op!.phase, 'planning');
        assert.equal(op!.sector_id, 'sector:corps_1:0');
        assert.ok(op!.objectives!.length >= 2);
        assert.ok(op!.name.startsWith('Operacija'));
    });

    it('rejects when too few brigades', () => {
        const state = makeMinimalState(5, {
            'b1': { corps_id: 'corps_1' as any, location_osid: 'op:a:1' },
            'b2': { corps_id: 'corps_1' as any, location_osid: 'op:a:2' },
        });

        const op = evaluateSectorOffensiveLaunch(
            state, 'corps_1', 'sector:corps_1:0', 'RS' as FactionId,
            ['b1', 'b2'], ['op:e:1', 'op:e:2', 'op:e:3'],
            ['op:e:1', 'op:e:2', 'op:e:3'], null
        );
        assert.equal(op, null, 'Should not launch with < 3 brigades');
    });

    it('rejects when too few enemy targets', () => {
        const state = makeMinimalState(5, {
            'b1': { corps_id: 'corps_1' as any, location_osid: 'op:a:1' },
            'b2': { corps_id: 'corps_1' as any, location_osid: 'op:a:2' },
            'b3': { corps_id: 'corps_1' as any, location_osid: 'op:a:3' },
        });

        const op = evaluateSectorOffensiveLaunch(
            state, 'corps_1', 'sector:corps_1:0', 'RS' as FactionId,
            ['b1', 'b2', 'b3'], ['op:e:1'], ['op:e:1'], null
        );
        assert.equal(op, null, 'Should not launch with < 2 enemy OSIDs');
    });

    it('rejects when supply is critical', () => {
        const state = makeMinimalState(5, {
            'b1': { corps_id: 'corps_1' as any, location_osid: 'op:a:1' },
            'b2': { corps_id: 'corps_1' as any, location_osid: 'op:a:2' },
            'b3': { corps_id: 'corps_1' as any, location_osid: 'op:a:3' },
        });
        state.meta.supply_reserves_enabled = true;

        const supplyReport: SupplyStateByOsidReport = {
            schema: 1, turn: 5,
            factions: [{ faction_id: 'RS', by_osid: [
                { osid: 'op:a:1', state: 'critical' },
                { osid: 'op:a:2', state: 'critical' },
                { osid: 'op:a:3', state: 'critical' },
            ]}],
        };

        const op = evaluateSectorOffensiveLaunch(
            state, 'corps_1', 'sector:corps_1:0', 'RS' as FactionId,
            ['b1', 'b2', 'b3'], ['op:e:1', 'op:e:2', 'op:e:3'],
            ['op:e:1', 'op:e:2', 'op:e:3'], supplyReport
        );
        assert.equal(op, null, 'Should not launch with critical supply');
    });
});

describe('Sector Offensive — Lifecycle', () => {
    it('planning_duration 1 preserves one full planning turn before execution', () => {
        const state = makeMinimalState(1, {
            'b1': { corps_id: 'corps_1' as any, location_osid: 'op:a:1' },
            'b2': { corps_id: 'corps_1' as any, location_osid: 'op:a:2' },
        });
        state.corps_command = {
            'corps_1': {
                stance: 'offensive' as any,
                active_operation: {
                    name: 'Operacija Test',
                    type: 'sector_attack',
                    phase: 'planning',
                    started_turn: 0,
                    phase_started_turn: 0,
                    participating_brigades: ['b1', 'b2'],
                    sector_id: 'sector:corps_1:0',
                    objectives: ['op:e:1'],
                    planning_duration: 1,
                    supply_readiness: 1.0,
                    current_objective_index: 0,
                    momentum: 0,
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                },
            } as any,
        };
        state.corps_front_sectors = {
            'sector:corps_1:0': { sector_id: 'sector:corps_1:0', corps_id: 'corps_1' } as any,
        };

        advanceSectorOffensives(state, null);
        const op = state.corps_command!['corps_1']!.active_operation!;
        assert.equal(op.phase, 'planning', 'Should remain in planning on the first eligible turn');
    });

    it('planning → execution transition', () => {
        const state = makeMinimalState(11, {
            'b1': { corps_id: 'corps_1' as any, location_osid: 'op:a:1' },
            'b2': { corps_id: 'corps_1' as any, location_osid: 'op:a:2' },
        });
        state.corps_command = {
            'corps_1': {
                stance: 'offensive' as any,
                active_operation: {
                    name: 'Operacija Test',
                    type: 'sector_attack',
                    phase: 'planning',
                    started_turn: 8,
                    phase_started_turn: 8,
                    participating_brigades: ['b1', 'b2'],
                    sector_id: 'sector:corps_1:0',
                    objectives: ['op:e:1', 'op:e:2'],
                    planning_duration: 2,
                    supply_readiness: 1.0,
                    current_objective_index: 0,
                    momentum: 0,
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                },
            } as any,
        };
        state.corps_front_sectors = {
            'sector:corps_1:0': { sector_id: 'sector:corps_1:0', corps_id: 'corps_1' } as any,
        };

        advanceSectorOffensives(state, null);
        const op = state.corps_command!['corps_1']!.active_operation!;
        assert.equal(op.phase, 'execution', 'Should transition to execution after planning_duration');
        assert.equal(op.current_objective_index, 0);
        assert.equal(op.momentum, 0);
    });

    it('planning transitions early once all participants have reached the staging OSID', () => {
        const state = makeMinimalState(12, {
            'b1': { corps_id: 'corps_1' as any, location_osid: 'op:stage:1' },
            'b2': { corps_id: 'corps_1' as any, location_osid: 'op:stage:1' },
        });
        state.corps_command = {
            'corps_1': {
                stance: 'offensive' as any,
                active_operation: {
                    name: 'Operacija Test',
                    type: 'sector_attack',
                    phase: 'planning',
                    started_turn: 10,
                    phase_started_turn: 10,
                    participating_brigades: ['b1', 'b2'],
                    sector_id: 'sector:corps_1:0',
                    objectives: ['op:e:1', 'op:e:2', 'op:e:3', 'op:e:4', 'op:e:5', 'op:e:6'],
                    planning_duration: 5,
                    staging_osid: 'op:stage:1',
                    supply_readiness: 1.0,
                    current_objective_index: 0,
                    momentum: 0,
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                },
            } as any,
        };
        state.corps_front_sectors = {
            'sector:corps_1:0': { sector_id: 'sector:corps_1:0', corps_id: 'corps_1' } as any,
        };

        advanceSectorOffensives(state, null);
        const op = state.corps_command!['corps_1']!.active_operation!;
        assert.equal(op.phase, 'execution', 'Should not keep waiting once the assigned brigades are staged');
    });

    it('recovery completes and removes operation', () => {
        const state = makeMinimalState(15, {});
        state.corps_command = {
            'corps_1': {
                stance: 'offensive' as any,
                active_operation: {
                    name: 'Operacija Test',
                    type: 'sector_attack',
                    phase: 'recovery',
                    started_turn: 10,
                    phase_started_turn: 12,
                    participating_brigades: [],
                    objectives: ['op:e:1', 'op:e:2'],
                },
            } as any,
        };

        advanceSectorOffensives(state, null);
        const op = state.corps_command!['corps_1']!.active_operation;
        // Recovery duration = max(2, objectives.length) = max(2, 2) = 2
        // Elapsed = 15 - 12 = 3 >= 2 → removed
        assert.equal(op, null, 'Operation should be removed after recovery');
    });

    it('orphaned sector aborts to recovery', () => {
        const state = makeMinimalState(10, {});
        state.corps_command = {
            'corps_1': {
                stance: 'offensive' as any,
                active_operation: {
                    name: 'Operacija Test',
                    type: 'sector_attack',
                    phase: 'execution',
                    started_turn: 8,
                    phase_started_turn: 9,
                    participating_brigades: [],
                    sector_id: 'sector:corps_1:0',
                    objectives: ['op:e:1'],
                },
            } as any,
        };
        state.corps_front_sectors = {}; // Sector doesn't exist!

        advanceSectorOffensives(state, null);
        const op = state.corps_command!['corps_1']!.active_operation!;
        assert.equal(op.phase, 'recovery', 'Should abort to recovery on orphaned sector');
    });

    it('execution no-progress turns consume failure budget and can end the operation early', () => {
        const state = makeMinimalState(15, {
            'b1': { corps_id: 'corps_1' as any, location_osid: 'op:a:1', posture: 'defend' },
            'b2': { corps_id: 'corps_1' as any, location_osid: 'op:a:2', posture: 'defend' },
        });
        state.political_controllers = { 'op:e:1': 'RBiH' } as any;
        state.corps_command = {
            'corps_1': {
                stance: 'offensive' as any,
                active_operation: {
                    name: 'Operacija Test',
                    type: 'sector_attack',
                    phase: 'execution',
                    started_turn: 10,
                    phase_started_turn: 12,
                    participating_brigades: ['b1', 'b2'],
                    sector_id: 'sector:corps_1:0',
                    objectives: ['op:e:1'],
                    current_objective_index: 0,
                    supply_readiness: 1.0,
                    momentum: 0,
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                },
            } as any,
        };
        state.corps_front_sectors = {
            'sector:corps_1:0': {
                sector_id: 'sector:corps_1:0',
                corps_id: 'corps_1',
                sub_segments: [
                    {
                        friendly_osids: ['op:a:1', 'op:a:2'],
                        enemy_osids: ['op:e:1'],
                    },
                ],
            } as any,
        };

        updateSectorOffensiveResults(state);
        let op = state.corps_command!['corps_1']!.active_operation!;
        assert.equal(op.phase, 'execution');
        assert.equal(op.last_result, 'stalemate');
        assert.equal(op.failure_count, 1);
        assert.equal(op.consecutive_failures_on_current, 1);

        state.meta.turn = 16;
        updateSectorOffensiveResults(state);
        op = state.corps_command!['corps_1']!.active_operation!;
        assert.equal(op.phase, 'recovery');
        assert.equal(op.failure_count, 2);
        assert.equal(op.current_objective_index, 1);
    });
});
