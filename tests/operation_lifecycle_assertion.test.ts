import { describe, expect, it } from 'vitest';

import { assertOperationLifecycle } from '../src/sim/combat/assert_operation_lifecycle.js';
import type { CorpsCommandState, CorpsOperation, FormationState, GameState } from '../src/state/game_state.js';

function makeState(overrides: {
    corps_command?: Record<string, Partial<CorpsCommandState>>;
    formations?: Record<string, Partial<FormationState>>;
}): GameState {
    return {
        meta: { turn: 10, phase: 'war' },
        military: {
            corps_command: overrides.corps_command ?? {},
            formations: overrides.formations ?? {},
        },
        political: {},
    } as unknown as GameState;
}

function makeOp(overrides: Partial<CorpsOperation> = {}): CorpsOperation {
    return {
        name: 'Test Op',
        type: 'sector_attack',
        phase: 'execution',
        started_turn: 5,
        phase_started_turn: 8,
        participating_brigades: [],
        objectives: ['op:test:target'],
        ...overrides,
    } as CorpsOperation;
}

describe('assertOperationLifecycle', () => {
    it('returns structured issues for missing and inactive participants', () => {
        const state = makeState({
            corps_command: {
                corps_1: {
                    active_operations: [makeOp({ participating_brigades: ['ghost_brig', 'inactive_brig'] })],
                } as CorpsCommandState,
            },
            formations: {
                inactive_brig: { id: 'inactive_brig', status: 'inactive', faction: 'RS' },
            },
        });

        expect(assertOperationLifecycle(state)).toEqual([
            {
                severity: 'error',
                code: 'operation.execution_no_active_participants',
                message: "corps_1 operation 'Test Op' is executing without an active participant",
                path: 'military.corps_command.corps_1.active_operations.0.participating_brigades',
            },
            {
                severity: 'error',
                code: 'operation.participant_missing',
                message: "corps_1 operation 'Test Op' references missing participant ghost_brig",
                path: 'military.corps_command.corps_1.active_operations.0.participating_brigades.0',
            },
            {
                severity: 'error',
                code: 'operation.participant_inactive',
                message: "corps_1 operation 'Test Op' references inactive participant inactive_brig",
                path: 'military.corps_command.corps_1.active_operations.0.participating_brigades.1',
            },
        ]);
    });

    it('rejects execution operations with empty participants and targets', () => {
        const state = makeState({
            corps_command: {
                corps_1: {
                    active_operations: [makeOp({
                        participating_brigades: [],
                        objectives: [],
                        target_settlements: [],
                        axes: [],
                    })],
                } as CorpsCommandState,
            },
        });

        expect(assertOperationLifecycle(state).map(issue => issue.code)).toEqual([
            'operation.execution_no_targets',
            'operation.execution_no_active_participants',
        ]);
    });

    it('accepts active participants and axis targets', () => {
        const state = makeState({
            corps_command: {
                corps_1: {
                    active_operations: [makeOp({
                        participating_brigades: ['brig_1'],
                        objectives: [],
                        axes: [{ objectives: ['op:test:axis-target'] } as NonNullable<CorpsOperation['axes']>[number]],
                    })],
                } as CorpsCommandState,
            },
            formations: {
                brig_1: { id: 'brig_1', status: 'active', faction: 'RS' },
            },
        });

        expect(assertOperationLifecycle(state)).toEqual([]);
    });
});
