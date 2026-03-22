import { describe, it, expect } from 'vitest';
import { canEventFire } from '../src/sim/events/evaluate_events.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';

function minState(turn: number = 10): GameState {
    return {
        meta: { turn, phase: 'war' },
        political: { political_controllers: {} },
        military: {
            formations: {},
            fired_event_ids: [],
            event_fire_counts: {},
            event_last_fired_turn: {},
        },
    } as unknown as GameState;
}

describe('canEventFire — recurrence model', () => {
    it('once:true event cannot fire again', () => {
        const state = minState();
        state.military.fired_event_ids = ['test'];
        const def = { id: 'test', once: true } as EventDefinition;
        expect(canEventFire(def, state, 10)).toBe(false);
    });

    it('once:true event can fire first time', () => {
        const state = minState();
        const def = { id: 'test', once: true } as EventDefinition;
        expect(canEventFire(def, state, 10)).toBe(true);
    });

    it('max_fires blocks after reaching count', () => {
        const state = minState();
        (state.military as any).event_fire_counts = { test: 3 };
        const def = { id: 'test', recurrence: { max_fires: 3, cooldown_turns: 0, escalation: 'static' as const } } as EventDefinition;
        expect(canEventFire(def, state, 10)).toBe(false);
    });

    it('max_fires allows when below count', () => {
        const state = minState();
        (state.military as any).event_fire_counts = { test: 2 };
        const def = { id: 'test', recurrence: { max_fires: 3, cooldown_turns: 0, escalation: 'static' as const } } as EventDefinition;
        expect(canEventFire(def, state, 10)).toBe(true);
    });

    it('cooldown prevents firing too soon', () => {
        const state = minState(10);
        (state.military as any).event_fire_counts = { test: 1 };
        (state.military as any).event_last_fired_turn = { test: 8 };
        const def = { id: 'test', recurrence: { max_fires: 5, cooldown_turns: 4, escalation: 'static' as const } } as EventDefinition;
        expect(canEventFire(def, state, 10)).toBe(false); // 10 - 8 = 2 < 4
    });

    it('cooldown allows after enough turns', () => {
        const state = minState(10);
        (state.military as any).event_fire_counts = { test: 1 };
        (state.military as any).event_last_fired_turn = { test: 5 };
        const def = { id: 'test', recurrence: { max_fires: 5, cooldown_turns: 4, escalation: 'static' as const } } as EventDefinition;
        expect(canEventFire(def, state, 10)).toBe(true); // 10 - 5 = 5 >= 4
    });

    it('event without once or recurrence always passes', () => {
        const state = minState();
        const def = { id: 'test' } as EventDefinition;
        expect(canEventFire(def, state, 10)).toBe(true);
    });
});
