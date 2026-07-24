import { describe, expect, it } from 'vitest';

import {
    assertControlEventConsistency,
    snapshotPoliticalControllers,
} from '../src/sim/combat/assert_control_events.js';
import type { ControlEvent, GameState } from '../src/state/game_state.js';

function makeMinimalState(overrides: Partial<{
    turn: number;
    political_controllers: Record<string, string | null>;
    control_events: ControlEvent[];
}>): GameState {
    return {
        meta: { turn: overrides.turn ?? 5, phase: 'war' },
        military: { formations: {} },
        political: {
            political_controllers: overrides.political_controllers ?? {},
            control_events: overrides.control_events ?? [],
        },
    } as unknown as GameState;
}

describe('assertControlEventConsistency', () => {
    it('requires exact from, to, and recognized mechanism evidence', () => {
        const state = makeMinimalState({
            turn: 5,
            political_controllers: { 'op:foo:bar': 'RBiH' },
        });
        const snapshot = snapshotPoliticalControllers(state);
        state.political.political_controllers!['op:foo:bar'] = 'RS';
        state.political.control_events = [
            { turn: 5, settlement_id: 'op:foo:bar', mechanism: 'combat', from: null, to: 'RS' },
            { turn: 5, settlement_id: 'op:foo:bar', mechanism: 'combat', from: 'RBiH', to: 'HRHB' },
            { turn: 5, settlement_id: 'op:foo:bar', mechanism: 'setup_control', from: 'RBiH', to: 'RS' },
            { turn: 5, settlement_id: 'op:foo:bar', mechanism: 'invalid' as ControlEvent['mechanism'], from: 'RBiH', to: 'RS' },
        ];

        expect(assertControlEventConsistency(state, snapshot)).toEqual([
            {
                severity: 'error',
                code: 'control_event.missing_evidence',
                message: 'Control change op:foo:bar from RBiH to RS has no matching turn 5 control_event with recognized mechanism',
                path: 'political.political_controllers.op:foo:bar',
            },
        ]);
    });

    it.each(['combat', 'paramilitary', 'consolidation', 'abandoned', 'event'] as const)(
        'accepts exact same-turn %s control evidence',
        (mechanism) => {
            const state = makeMinimalState({
                turn: 5,
                political_controllers: { 'op:foo:bar': 'RBiH' },
            });
            const snapshot = snapshotPoliticalControllers(state);
            state.political.political_controllers!['op:foo:bar'] = 'RS';
            state.political.control_events = [
                { turn: 5, settlement_id: 'op:foo:bar', mechanism, from: 'RBiH', to: 'RS' },
            ];

            expect(assertControlEventConsistency(state, snapshot)).toEqual([]);
        },
    );

    it('normalizes added and removed controller keys to null and sorts by OSID', () => {
        const state = makeMinimalState({
            turn: 5,
            political_controllers: { 'op:z:last': 'RS' },
        });
        const snapshot = snapshotPoliticalControllers(state);
        delete state.political.political_controllers!['op:z:last'];
        state.political.political_controllers!['op:a:first'] = 'HRHB';

        expect(assertControlEventConsistency(state, snapshot).map(issue => issue.message)).toEqual([
            'Control change op:a:first from null to HRHB has no matching turn 5 control_event with recognized mechanism',
            'Control change op:z:last from RS to null has no matching turn 5 control_event with recognized mechanism',
        ]);
    });

    it('returns no issues when control is unchanged', () => {
        const state = makeMinimalState({
            political_controllers: { 'op:a:b': 'RS' },
        });

        expect(assertControlEventConsistency(state, snapshotPoliticalControllers(state))).toEqual([]);
    });

    it('snapshots political controllers by value', () => {
        const state = makeMinimalState({
            political_controllers: { 'op:a:b': 'RS' },
        });
        const snapshot = snapshotPoliticalControllers(state);
        state.political.political_controllers!['op:a:b'] = 'RBiH';

        expect(snapshot['op:a:b']).toBe('RS');
    });
});
