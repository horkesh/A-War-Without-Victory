import assert from 'node:assert';
import { describe, expect, it } from 'vitest';

import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import type { EventDefinition, EventEffect, Rng } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

const EVENT_ID = 'gorazde_pocket_consolidation_1992';
const GLAMOC = 'op:gorazde:glamoc';
const KAMEN = 'op:gorazde:kamen';

const rejectRandomness: Rng = () => {
    throw new Error('Gorazde event truth must not consume RNG');
};

function gorazdeEvent(): EventDefinition {
    const event = loadEventDefinitions(0).find((candidate) => candidate.id === EVENT_ID);
    assert.ok(event, `${EVENT_ID} must remain in the loaded catalog`);
    return event;
}

function makeState(controllers: Record<string, string>): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 18, seed: 'gorazde-event-truth', phase: 'war' },
        military: { formations: {}, fired_event_ids: [] },
        political: { political_controllers: { ...controllers }, control_events: [] },
        factions: [],
        displacement: {},
    } as unknown as GameState;
}

function authoredEffects(event: EventDefinition): EventEffect[] {
    return [event.effect, ...(event.effects ?? [])].filter((effect): effect is EventEffect => Boolean(effect));
}

describe('Goražde pocket consolidation current-state truth', () => {
    it('does not manufacture the two named settlements from a 30 percent municipality share', () => {
        const state = makeState({
            'op:gorazde:held_a': 'RBiH',
            'op:gorazde:held_b': 'RBiH',
            'op:gorazde:held_c': 'RBiH',
            'op:gorazde:other_a': 'RS',
            'op:gorazde:other_b': 'RS',
            'op:gorazde:other_c': 'RS',
            'op:gorazde:other_d': 'RS',
            'op:gorazde:other_e': 'RS',
            [GLAMOC]: 'RS',
            [KAMEN]: 'RS',
        });

        const result = evaluateEvents(state, rejectRandomness, 18, [gorazdeEvent()]);

        expect(result.fired).toEqual([]);
        expect(state.political.political_controllers?.[GLAMOC]).toBe('RS');
        expect(state.political.political_controllers?.[KAMEN]).toBe('RS');
        expect(state.military.event_flags?.gorazde_pocket_consolidated).toBeUndefined();
        expect(state.political.control_events).toEqual([]);
    });

    it('files the informational receipt only when both exact OSIDs are already RBiH-held', () => {
        const state = makeState({
            [GLAMOC]: 'RBiH',
            [KAMEN]: 'RBiH',
            'op:gorazde:other_a': 'RS',
            'op:gorazde:other_b': 'RS',
            'op:gorazde:other_c': 'RS',
            'op:gorazde:other_d': 'RS',
            'op:gorazde:other_e': 'RS',
            'op:gorazde:other_f': 'RS',
            'op:gorazde:other_g': 'RS',
            'op:gorazde:other_h': 'RS',
        });
        const beforeControl = JSON.stringify(state.political.political_controllers);

        const result = evaluateEvents(state, rejectRandomness, 18, [gorazdeEvent()]);

        expect(result.fired.map((event) => event.id)).toEqual([EVENT_ID]);
        expect(state.military.event_flags?.gorazde_pocket_consolidated).toBe(true);
        expect(JSON.stringify(state.political.political_controllers)).toBe(beforeControl);
        expect(state.political.control_events).toEqual([]);
    });

    it('does not file the receipt when only one exact OSID is RBiH-held', () => {
        const state = makeState({
            [GLAMOC]: 'RBiH',
            [KAMEN]: 'RS',
        });

        const result = evaluateEvents(state, rejectRandomness, 18, [gorazdeEvent()]);

        expect(result.fired).toEqual([]);
        expect(state.military.event_flags?.gorazde_pocket_consolidated).toBeUndefined();
        expect(state.political.political_controllers?.[GLAMOC]).toBe('RBiH');
        expect(state.political.political_controllers?.[KAMEN]).toBe('RS');
        expect(state.political.control_events).toEqual([]);
    });

    it('has no authored control-change effect', () => {
        expect(authoredEffects(gorazdeEvent()).some((effect) => effect.kind === 'control_change')).toBe(false);
    });
});
