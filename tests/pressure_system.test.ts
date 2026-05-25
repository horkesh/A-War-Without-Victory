import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { updateEventReadiness, isEventReady } from '../src/sim/events/pressure_system.js';
import type { GameState } from '../src/state/game_state.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';

function minState(): GameState {
    return {
        meta: { turn: 10, phase: 'war' },
        political: { political_controllers: {}, war_alliance_rbih_hrhb: 0.5 },
        military: {
            formations: {},
            event_readiness: {},
            event_flags: {},
            general_supply_reserve: { RBiH: 30 },
            negotiation: { capital: {}, patron_relationships: {}, peace_plan_history: [], strategic_dimensions: {} },
        },
    } as unknown as GameState;
}

const testEvent: EventDefinition = {
    id: 'test_event',
    trigger: { condition: { type: 'alliance_below', value: 0.6 } },
    effect: { kind: 'narrative', text: 'test' },
    pressure: { base_rate: 1.0, threshold: 5, decay_rate: 0.3 },
};

describe('pressure system', () => {
    it('increments readiness when conditions met', () => {
        const state = minState();
        updateEventReadiness(state, [testEvent]);
        expect(state.military.event_readiness!['test_event']).toBe(1.0);
    });

    it('accumulates readiness over multiple calls', () => {
        const state = minState();
        updateEventReadiness(state, [testEvent]);
        updateEventReadiness(state, [testEvent]);
        updateEventReadiness(state, [testEvent]);
        expect(state.military.event_readiness!['test_event']).toBe(3.0);
    });

    it('decays readiness when conditions NOT met', () => {
        const state = minState();
        state.military.event_readiness = { test_event: 4.0 };
        state.political.war_alliance_rbih_hrhb = 0.8;
        updateEventReadiness(state, [testEvent]);
        expect(state.military.event_readiness!['test_event']).toBeCloseTo(3.7);
    });

    it('does not go below zero', () => {
        const state = minState();
        state.military.event_readiness = { test_event: 0.1 };
        state.political.war_alliance_rbih_hrhb = 0.8;
        updateEventReadiness(state, [testEvent]);
        expect(state.military.event_readiness!['test_event']).toBe(0);
    });

    it('skips events without pressure config', () => {
        const state = minState();
        const noPressure: EventDefinition = {
            id: 'old_event',
            trigger: { turn_min: 5 },
            effect: { kind: 'narrative', text: 'old' },
        };
        updateEventReadiness(state, [noPressure]);
        expect(state.military.event_readiness!['old_event']).toBeUndefined();
    });

    it('applies pressure modifiers when sub-conditions met', () => {
        const state = minState();
        const eventWithMod: EventDefinition = {
            ...testEvent,
            pressure: {
                base_rate: 1.0, threshold: 5, decay_rate: 0.3,
                modifiers: [{ condition: { type: 'supply_below', faction: 'RBiH', threshold: 40 }, rate_bonus: 0.5 }],
            },
        };
        updateEventReadiness(state, [eventWithMod]);
        expect(state.military.event_readiness!['test_event']).toBe(1.5);
    });

    it('isEventReady returns true at threshold', () => {
        const state = minState();
        state.military.event_readiness = { test_event: 5.0 };
        expect(isEventReady(state, testEvent)).toBe(true);
    });

    it('isEventReady returns false below threshold', () => {
        const state = minState();
        state.military.event_readiness = { test_event: 4.9 };
        expect(isEventReady(state, testEvent)).toBe(false);
    });

    it('isEventReady returns false for events without pressure', () => {
        const state = minState();
        const noPressure: EventDefinition = { id: 'x', trigger: {}, effect: { kind: 'narrative', text: '' } };
        expect(isEventReady(state, noPressure)).toBe(false);
    });

    it('decays Lukavac route proxy readiness when the local Sarajevo gate closes', () => {
        const events = JSON.parse(readFileSync('data/scenarios/events/war_1993.json', 'utf8')) as EventDefinition[];
        const lukavac = events.find((event) => event.id === 'operation_lukavac_93');
        const state = minState();
        state.meta.turn = 65;
        state.military.event_flags = { sarajevo_siege_active: true };
        state.political.political_controllers = {
            'op:trnovo:trnovo_2': 'RS',
            'op:trnovo:dejcici': 'RBiH',
            'op:hadzici:lokve': 'RS',
            'op:hadzici:pazaric': 'RS',
            'op:hadzici:tarcin_2': 'RS',
        };

        expect(lukavac).toBeDefined();
        updateEventReadiness(state, [lukavac!]);
        expect(state.military.event_readiness!['operation_lukavac_93']).toBe(4);

        state.military.event_flags = { sarajevo_siege_active: false };
        updateEventReadiness(state, [lukavac!]);
        expect(state.military.event_readiness!['operation_lukavac_93']).toBe(3);
    });
});
