import { describe, it, expect, vi } from 'vitest';
import { snapshotPoliticalControllers, assertControlEventConsistency } from '../src/sim/combat/assert_control_events.js';
import type { GameState } from '../src/state/game_state.js';

function makeMinimalState(overrides: Partial<{
    turn: number;
    political_controllers: Record<string, string>;
    control_events: Array<{ turn: number; settlement_id: string; mechanism: string; from: string | null; to: string | null }>;
}>): GameState {
    return {
        meta: { turn: overrides.turn ?? 5, phase: 'war' },
        political: {
            political_controllers: overrides.political_controllers ?? {},
            control_events: overrides.control_events ?? [],
        },
    } as unknown as GameState;
}

describe('assertControlEventConsistency', () => {
    it('logs error when OSID flips without a matching control_event', () => {
        const state = makeMinimalState({
            turn: 5,
            political_controllers: { 'op:foo:bar': 'RBiH' },
        });
        const snapshot = snapshotPoliticalControllers(state);

        // Flip controller without adding event
        state.political.political_controllers!['op:foo:bar'] = 'RS';

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        assertControlEventConsistency(state, snapshot);

        expect(errorSpy).toHaveBeenCalledTimes(1);
        const msg = errorSpy.mock.calls[0]![0] as string;
        expect(msg).toContain('CONTROL EVENT CONSISTENCY VIOLATION');
        expect(msg).toContain('op:foo:bar');
        expect(msg).toContain('RBiH');
        expect(msg).toContain('RS');
        errorSpy.mockRestore();
    });

    it('does not log when OSID flip has matching control_event', () => {
        const state = makeMinimalState({
            turn: 5,
            political_controllers: { 'op:foo:bar': 'RBiH' },
        });
        const snapshot = snapshotPoliticalControllers(state);

        // Flip controller AND add matching event
        state.political.political_controllers!['op:foo:bar'] = 'RS';
        (state.political.control_events ??= []).push({
            turn: 5,
            settlement_id: 'op:foo:bar',
            mechanism: 'combat',
            from: 'RBiH',
            to: 'RS',
        });

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        assertControlEventConsistency(state, snapshot);

        expect(errorSpy).not.toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    it('does not log when no flips occur', () => {
        const state = makeMinimalState({
            turn: 5,
            political_controllers: { 'op:foo:bar': 'RBiH', 'op:baz:qux': 'RS' },
        });
        const snapshot = snapshotPoliticalControllers(state);

        // No changes to controllers
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        assertControlEventConsistency(state, snapshot);

        expect(errorSpy).not.toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    it('detects removal of OSID from political_controllers', () => {
        const state = makeMinimalState({
            turn: 5,
            political_controllers: { 'op:foo:bar': 'RBiH' },
        });
        const snapshot = snapshotPoliticalControllers(state);

        // Remove OSID entirely
        delete state.political.political_controllers!['op:foo:bar'];

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        assertControlEventConsistency(state, snapshot);

        expect(errorSpy).toHaveBeenCalledTimes(1);
        const msg = errorSpy.mock.calls[0]![0] as string;
        expect(msg).toContain('removed');
        errorSpy.mockRestore();
    });

    it('detects newly added OSID not in snapshot', () => {
        const state = makeMinimalState({
            turn: 5,
            political_controllers: {},
        });
        const snapshot = snapshotPoliticalControllers(state);

        // Add new OSID without event
        state.political.political_controllers!['op:new:one'] = 'HRHB';

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        assertControlEventConsistency(state, snapshot);

        expect(errorSpy).toHaveBeenCalledTimes(1);
        const msg = errorSpy.mock.calls[0]![0] as string;
        expect(msg).toContain('op:new:one');
        expect(msg).toContain('null');
        expect(msg).toContain('HRHB');
        errorSpy.mockRestore();
    });

    it('snapshotPoliticalControllers returns a shallow copy', () => {
        const state = makeMinimalState({
            political_controllers: { 'op:a:b': 'RS' },
        });
        const snapshot = snapshotPoliticalControllers(state);

        // Mutate original — snapshot should be unaffected
        state.political.political_controllers!['op:a:b'] = 'RBiH';

        expect(snapshot['op:a:b']).toBe('RS');
    });
});
