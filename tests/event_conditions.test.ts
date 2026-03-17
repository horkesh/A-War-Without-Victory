import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../src/sim/events/event_types.js';
import type { EventCondition } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';

function makeState(overrides: any = {}): GameState {
    return {
        meta: { turn: 10, phase: 'war', seed: 'test' },
        political: {
            political_controllers: {
                'op:jajce:jajce_2': 'RS',
                'op:jajce:divicani': 'RS',
                'op:jajce:podmilacje': 'RBiH',
                'op:brcko:brcko_2': 'RBiH',
                'op:prijedor:prijedor_2': 'RS',
                'op:prijedor:kozarac_2': 'RS',
            },
            war_alliance_rbih_hrhb: 0.5,
            ...overrides.political,
        },
        military: { formations: {}, ...overrides.military },
        displacement: {},
    } as any;
}

describe('event condition evaluation', () => {
    it('territory_control by municipality', () => {
        const state = makeState();
        const cond: EventCondition = { type: 'faction_controls_municipality', faction: 'RS', municipality: 'jajce', threshold: 0.5 };
        // RS controls 2/3 jajce OSIDs = 66% > 50%
        expect(evaluateCondition(cond, state)).toBe(true);
    });

    it('territory_control fails when below threshold', () => {
        const state = makeState();
        const cond: EventCondition = { type: 'faction_controls_municipality', faction: 'RS', municipality: 'brcko', threshold: 0.5 };
        // RS controls 0/1 brcko OSIDs
        expect(evaluateCondition(cond, state)).toBe(false);
    });

    it('territory_control by osid', () => {
        const state = makeState();
        const cond: EventCondition = { type: 'territory_control', osid: 'op:jajce:jajce_2', faction: 'RS' };
        expect(evaluateCondition(cond, state)).toBe(true);
    });

    it('territory_control by osid fails for wrong faction', () => {
        const state = makeState();
        const cond: EventCondition = { type: 'territory_control', osid: 'op:jajce:jajce_2', faction: 'RBiH' };
        expect(evaluateCondition(cond, state)).toBe(false);
    });

    it('territory_control by municipality via territory_control type', () => {
        const state = makeState();
        const cond: EventCondition = { type: 'territory_control', municipality: 'prijedor', faction: 'RS', threshold: 0.5 };
        expect(evaluateCondition(cond, state)).toBe(true);
    });

    it('alliance_below', () => {
        const state = makeState();
        expect(evaluateCondition({ type: 'alliance_below', value: 0.6 }, state)).toBe(true);
        expect(evaluateCondition({ type: 'alliance_below', value: 0.4 }, state)).toBe(false);
    });

    it('alliance_above', () => {
        const state = makeState();
        expect(evaluateCondition({ type: 'alliance_above', value: 0.4 }, state)).toBe(true);
        expect(evaluateCondition({ type: 'alliance_above', value: 0.6 }, state)).toBe(false);
    });

    it('and combinator', () => {
        const state = makeState();
        const cond: EventCondition = {
            type: 'and',
            conditions: [
                { type: 'alliance_above', value: 0.3 },
                { type: 'faction_controls_municipality', faction: 'RS', municipality: 'prijedor', threshold: 0.5 },
            ]
        };
        expect(evaluateCondition(cond, state)).toBe(true);
    });

    it('and combinator fails when one is false', () => {
        const state = makeState();
        const cond: EventCondition = {
            type: 'and',
            conditions: [
                { type: 'alliance_below', value: 0.1 }, // false
                { type: 'faction_controls_municipality', faction: 'RS', municipality: 'prijedor', threshold: 0.5 },
            ]
        };
        expect(evaluateCondition(cond, state)).toBe(false);
    });

    it('or combinator', () => {
        const state = makeState();
        const cond: EventCondition = {
            type: 'or',
            conditions: [
                { type: 'alliance_below', value: 0.1 }, // false
                { type: 'faction_controls_municipality', faction: 'RS', municipality: 'jajce', threshold: 0.5 }, // true
            ]
        };
        expect(evaluateCondition(cond, state)).toBe(true);
    });

    it('not combinator', () => {
        const state = makeState();
        expect(evaluateCondition({ type: 'not', condition: { type: 'alliance_below', value: 0.3 } }, state)).toBe(true);
        expect(evaluateCondition({ type: 'not', condition: { type: 'alliance_below', value: 0.6 } }, state)).toBe(false);
    });

    it('empty municipality returns false', () => {
        const state = makeState();
        const cond: EventCondition = { type: 'faction_controls_municipality', faction: 'RS', municipality: 'nonexistent', threshold: 0.5 };
        expect(evaluateCondition(cond, state)).toBe(false);
    });

    it('territory_control with no osid or municipality returns false', () => {
        const state = makeState();
        const cond: EventCondition = { type: 'territory_control', faction: 'RS' };
        expect(evaluateCondition(cond, state)).toBe(false);
    });
});
