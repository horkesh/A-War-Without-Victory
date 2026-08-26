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

const rejectRandomness: Rng = () => { throw new Error('Gorazde event truth must not consume RNG'); };

function gorazdeEvent(): EventDefinition {
    const event = loadEventDefinitions(0).find((candidate) => candidate.id === EVENT_ID);
    assert.ok(event, `${EVENT_ID} must remain in the loaded catalog`);
    return event;
}

function makeState(glamoc: 'RS' | 'RBiH', kamen: 'RS' | 'RBiH'): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 18, seed: 'gorazde-event-truth', phase: 'war' },
        military: { formations: {}, fired_event_ids: [] },
        political: { political_controllers: { [GLAMOC]: glamoc, [KAMEN]: kamen }, control_events: [] },
        factions: [],
        displacement: {},
    } as unknown as GameState;
}

function authoredEffects(event: EventDefinition): EventEffect[] {
    return [event.effect, ...(event.effects ?? [])].filter((effect): effect is EventEffect => Boolean(effect));
}

describe('Goražde pocket consolidation current-state truth', () => {
    it('observes an enclave perimeter already won through combat', () => {
        const state = makeState('RBiH', 'RBiH');
        const before = JSON.stringify(state.political.political_controllers);
        const result = evaluateEvents(state, rejectRandomness, 18, [gorazdeEvent()]);
        expect(result.fired.map((event) => event.id)).toEqual([EVENT_ID]);
        expect(state.military.event_flags?.gorazde_pocket_consolidated).toBe(true);
        expect(JSON.stringify(state.political.political_controllers)).toBe(before);
        expect(state.political.control_events).toEqual([]);
    });

    it.each([['RS', 'RBiH'], ['RBiH', 'RS'], ['RS', 'RS']] as const)(
        'does not fire unless both perimeter OSIDs already belong to RBiH (%s/%s)',
        (glamoc, kamen) => {
            const state = makeState(glamoc, kamen);
            const result = evaluateEvents(state, rejectRandomness, 18, [gorazdeEvent()]);
            expect(result.fired).toEqual([]);
            expect(state.political.control_events).toEqual([]);
        },
    );

    it('contains no authored territorial effect', () => {
        expect(authoredEffects(gorazdeEvent()).some((effect) => effect.kind === 'control_change')).toBe(false);
    });
});
