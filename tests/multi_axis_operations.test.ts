/**
 * Tests for multi-axis operation infrastructure.
 *
 * Verifies:
 * - Axis contiguity validation
 * - Multi-axis helper functions (isMultiAxis, getAllAxisObjectives, getAllAxisBrigades)
 * - createSingleAxis wrapping
 * - Brigade axis lookup in bot AI
 */
import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
    isMultiAxis,
    getAllAxisObjectives,
    getAllAxisBrigades,
    createSingleAxis,
    validateAxisContiguity,
} from '../src/sim/combat/sector_offensive.js';
import {
    applySectorOffensiveDirectiveOverride,
} from '../src/sim/combat/bot_brigade_ai_osid.js';
import type { CorpsOperation, OperationAxis, FormationId } from '../src/state/game_state.js';

function makeAxis(overrides: Partial<OperationAxis> & { axis_id: string; name: string }): OperationAxis {
    return {
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
        ...overrides,
    };
}

function makeOp(overrides: Partial<CorpsOperation> = {}): CorpsOperation {
    return {
        name: 'Test Op',
        type: 'sector_attack',
        phase: 'execution',
        started_turn: 0,
        phase_started_turn: 0,
        participating_brigades: ['brig_a', 'brig_b'] as FormationId[],
        objectives: ['op:test:1', 'op:test:2'],
        current_objective_index: 0,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        ...overrides,
    } as CorpsOperation;
}

describe('Multi-Axis — isMultiAxis', () => {
    it('returns false for ops without axes', () => {
        assert.equal(isMultiAxis(makeOp()), false);
    });

    it('returns false for empty axes array', () => {
        assert.equal(isMultiAxis(makeOp({ axes: [] })), false);
    });

    it('returns true for ops with axes', () => {
        const op = makeOp({
            axes: [makeAxis({ axis_id: 'north', name: 'North' })],
        });
        assert.equal(isMultiAxis(op), true);
    });
});

describe('Multi-Axis — getAllAxisObjectives', () => {
    it('falls back to flat objectives when no axes', () => {
        const op = makeOp({ objectives: ['op:a:1', 'op:a:2'] });
        assert.deepEqual(getAllAxisObjectives(op), ['op:a:1', 'op:a:2']);
    });

    it('deduplicates shared objectives across axes', () => {
        const op = makeOp({
            axes: [
                makeAxis({ axis_id: 'north', name: 'North', objectives: ['op:a:1', 'op:a:shared'] }),
                makeAxis({ axis_id: 'south', name: 'South', objectives: ['op:a:2', 'op:a:shared'] }),
            ],
        });
        const result = getAllAxisObjectives(op);
        assert.equal(result.length, 3);
        assert.ok(result.includes('op:a:1'));
        assert.ok(result.includes('op:a:2'));
        assert.ok(result.includes('op:a:shared'));
    });
});

describe('Multi-Axis — getAllAxisBrigades', () => {
    it('falls back to participating_brigades when no axes', () => {
        const op = makeOp({ participating_brigades: ['b1', 'b2'] as FormationId[] });
        const result = getAllAxisBrigades(op);
        assert.deepEqual(result, ['b1', 'b2']);
    });

    it('collects brigades from all axes (sorted)', () => {
        const op = makeOp({
            axes: [
                makeAxis({ axis_id: 'a', name: 'A', assigned_brigades: ['brig_c', 'brig_a'] as FormationId[] }),
                makeAxis({ axis_id: 'b', name: 'B', assigned_brigades: ['brig_b'] as FormationId[] }),
            ],
        });
        const result = getAllAxisBrigades(op);
        assert.deepEqual(result, ['brig_a', 'brig_b', 'brig_c']);
    });
});

describe('Multi-Axis — createSingleAxis', () => {
    it('creates a valid axis with defaults', () => {
        const axis = createSingleAxis(['b1', 'b2'] as FormationId[], ['op:x:1', 'op:x:2'], 'op:x:staging');
        assert.equal(axis.axis_id, 'main');
        assert.equal(axis.name, 'Main Advance');
        assert.deepEqual(axis.objectives, ['op:x:1', 'op:x:2']);
        assert.equal(axis.staging_osid, 'op:x:staging');
        assert.equal(axis.status, 'executing');
        assert.equal(axis.current_objective_index, 0);
        assert.equal(axis.momentum, 0);
    });

    it('sorts brigades deterministically', () => {
        const axis = createSingleAxis(['z_brig', 'a_brig'] as FormationId[], [], undefined);
        assert.deepEqual(axis.assigned_brigades, ['a_brig', 'z_brig']);
    });
});

describe('Multi-Axis — Contiguity Validation', () => {
    const adjacency = new Map<string, string[]>([
        ['op:staging:1', ['op:a:1', 'op:a:2']],
        ['op:a:1', ['op:staging:1', 'op:a:2', 'op:a:3']],
        ['op:a:2', ['op:staging:1', 'op:a:1']],
        ['op:a:3', ['op:a:1', 'op:a:4']],
        ['op:a:4', ['op:a:3']],
        ['op:a:isolated', []],
    ]);

    it('accepts contiguous chain from staging', () => {
        const axis = makeAxis({
            axis_id: 'test', name: 'Test',
            staging_osid: 'op:staging:1',
            objectives: ['op:a:1', 'op:a:3', 'op:a:4'],
        });
        assert.equal(validateAxisContiguity(axis, adjacency), null);
    });

    it('accepts branching chain (A -> B, A -> C)', () => {
        const axis = makeAxis({
            axis_id: 'test', name: 'Test',
            staging_osid: 'op:staging:1',
            objectives: ['op:a:1', 'op:a:2', 'op:a:3'],
        });
        // op:a:2 is adjacent to staging AND op:a:1; op:a:3 is adjacent to op:a:1
        assert.equal(validateAxisContiguity(axis, adjacency), null);
    });

    it('rejects disconnected first objective', () => {
        const axis = makeAxis({
            axis_id: 'test', name: 'Test',
            staging_osid: 'op:staging:1',
            objectives: ['op:a:isolated'],
        });
        const err = validateAxisContiguity(axis, adjacency);
        assert.ok(err !== null);
        assert.ok(err.includes('objective[0]'));
        assert.ok(err.includes('not adjacent to staging'));
    });

    it('rejects disconnected later objective', () => {
        const axis = makeAxis({
            axis_id: 'test', name: 'Test',
            staging_osid: 'op:staging:1',
            objectives: ['op:a:1', 'op:a:isolated'],
        });
        const err = validateAxisContiguity(axis, adjacency);
        assert.ok(err !== null);
        assert.ok(err.includes('objective[1]'));
        assert.ok(err.includes('not adjacent to any prior'));
    });

    it('accepts empty objectives', () => {
        const axis = makeAxis({
            axis_id: 'test', name: 'Test',
            staging_osid: 'op:staging:1',
            objectives: [],
        });
        assert.equal(validateAxisContiguity(axis, adjacency), null);
    });

    it('skips staging check when no staging_osid', () => {
        const axis = makeAxis({
            axis_id: 'test', name: 'Test',
            objectives: ['op:a:1', 'op:a:3'],
        });
        // No staging, so first objective has no staging check; op:a:3 is adjacent to op:a:1
        assert.equal(validateAxisContiguity(axis, adjacency), null);
    });
});

describe('Multi-Axis — Brigade Directive Override', () => {
    it('uses axis objectives for brigade in multi-axis op', () => {
        const op = makeOp({
            phase: 'execution',
            objectives: ['op:flat:1'],
            current_objective_index: 0,
            axes: [
                makeAxis({
                    axis_id: 'north', name: 'North',
                    assigned_brigades: ['brig_a'] as FormationId[],
                    objectives: ['op:north:1', 'op:north:2'],
                    current_objective_index: 1,
                }),
                makeAxis({
                    axis_id: 'south', name: 'South',
                    assigned_brigades: ['brig_b'] as FormationId[],
                    objectives: ['op:south:1'],
                    current_objective_index: 0,
                }),
            ],
        });
        const baseDirective = {
            assigned_front_ids: [],
            offensive_targets: ['op:default:x'],
            hold_osids: [],
            avoid_osids: [],
            max_attackers_per_target: 3,
            reserve_fraction: 0.2,
            min_attack_outcome: 'costly_victory' as const,
            aggression_modifier: 0.1,
        };

        // brig_a is on north axis at index 1 → op:north:2
        const overrideA = applySectorOffensiveDirectiveOverride(baseDirective, op, 'brig_a' as FormationId);
        assert.deepEqual(overrideA.offensive_targets, ['op:north:2']);

        // brig_b is on south axis at index 0 → op:south:1
        const overrideB = applySectorOffensiveDirectiveOverride(baseDirective, op, 'brig_b' as FormationId);
        assert.deepEqual(overrideB.offensive_targets, ['op:south:1']);
    });

    it('falls back to flat objectives when no brigadeId provided', () => {
        const op = makeOp({
            phase: 'execution',
            objectives: ['op:flat:target'],
            current_objective_index: 0,
            axes: [
                makeAxis({
                    axis_id: 'main', name: 'Main',
                    assigned_brigades: ['brig_a'] as FormationId[],
                    objectives: ['op:axis:target'],
                    current_objective_index: 0,
                }),
            ],
        });
        const baseDirective = {
            assigned_front_ids: [],
            offensive_targets: [],
            hold_osids: [],
            avoid_osids: [],
            max_attackers_per_target: 3,
            reserve_fraction: 0.2,
            min_attack_outcome: 'costly_victory' as const,
            aggression_modifier: 0.1,
        };
        const override = applySectorOffensiveDirectiveOverride(baseDirective, op);
        assert.deepEqual(override.offensive_targets, ['op:flat:target']);
    });

    it('returns unchanged directive during planning phase', () => {
        const op = makeOp({ phase: 'planning' });
        const baseDirective = {
            assigned_front_ids: [],
            offensive_targets: ['op:keep:this'],
            hold_osids: [],
            avoid_osids: [],
            max_attackers_per_target: 3,
            reserve_fraction: 0.2,
            min_attack_outcome: 'costly_victory' as const,
            aggression_modifier: 0.1,
        };
        const result = applySectorOffensiveDirectiveOverride(baseDirective, op, 'brig_a' as FormationId);
        assert.deepEqual(result.offensive_targets, ['op:keep:this']);
    });
});
