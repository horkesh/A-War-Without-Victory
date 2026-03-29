import { describe, it, expect, vi } from 'vitest';
import { assertOperationLifecycle } from '../src/sim/combat/assert_operation_lifecycle.js';
import type { GameState, CorpsOperation, FormationState, CorpsCommandState } from '../src/state/game_state.js';

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
        ...overrides,
    } as CorpsOperation;
}

describe('assertOperationLifecycle', () => {
    it('logs error when participant is not found in formations', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const state = makeState({
            corps_command: {
                corps_1: { active_operations: [makeOp({ participating_brigades: ['ghost_brig'] })] } as any,
            },
            formations: {},
        });

        assertOperationLifecycle(state);

        expect(spy).toHaveBeenCalledOnce();
        expect(spy.mock.calls[0][0]).toContain('ghost_brig');
        expect(spy.mock.calls[0][0]).toContain('not found');
        spy.mockRestore();
    });

    it('logs error when participant is inactive', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const state = makeState({
            corps_command: {
                corps_1: { active_operations: [makeOp({ participating_brigades: ['brig_1'] })] } as any,
            },
            formations: {
                brig_1: { id: 'brig_1', status: 'inactive', faction: 'RS' } as any,
            },
        });

        assertOperationLifecycle(state);

        expect(spy).toHaveBeenCalledOnce();
        expect(spy.mock.calls[0][0]).toContain("status='inactive'");
        spy.mockRestore();
    });

    it('logs error for execution phase with zero active participants', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const state = makeState({
            corps_command: {
                corps_1: {
                    active_operations: [makeOp({
                        phase: 'execution',
                        participating_brigades: ['brig_1'],
                    })],
                } as any,
            },
            formations: {
                brig_1: { id: 'brig_1', status: 'inactive', faction: 'RS' } as any,
            },
        });

        assertOperationLifecycle(state);

        expect(spy).toHaveBeenCalledOnce();
        const msg = spy.mock.calls[0][0] as string;
        expect(msg).toContain('0/1 active participants');
        spy.mockRestore();
    });

    it('does not log when all participants are active', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const state = makeState({
            corps_command: {
                corps_1: {
                    active_operations: [makeOp({ participating_brigades: ['brig_1', 'brig_2'] })],
                } as any,
            },
            formations: {
                brig_1: { id: 'brig_1', status: 'active', faction: 'RS' } as any,
                brig_2: { id: 'brig_2', status: 'active', faction: 'RS' } as any,
            },
        });

        assertOperationLifecycle(state);

        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('does not log when no active operations exist', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const state = makeState({
            corps_command: {
                corps_1: { active_operations: [] } as any,
            },
        });

        assertOperationLifecycle(state);

        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });
});
