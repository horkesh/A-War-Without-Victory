import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { updateEventReadiness, isEventReady } from '../src/sim/events/pressure_system.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
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

    it('decays modifier-boosted readiness when a local runtime gate closes', () => {
        const localGateEvent: EventDefinition = {
            id: 'test_local_gate_event',
            trigger: {
                turn_min: 10,
                phase: 'war',
                condition: { type: 'flag_equals', flag: 'local_gate_open', value: true },
            },
            effect: { kind: 'narrative', text: 'test' },
            pressure: {
                base_rate: 1,
                threshold: 5,
                decay_rate: 1,
                modifiers: [{
                    condition: { type: 'territory_control', osid: 'test:route', faction: 'RS' },
                    rate_bonus: 3,
                }],
            },
        };
        const state = minState();
        state.military.event_flags = { local_gate_open: true };
        state.political.political_controllers = { 'test:route': 'RS' };

        updateEventReadiness(state, [localGateEvent]);
        expect(state.military.event_readiness!.test_local_gate_event).toBe(4);

        state.military.event_flags = { local_gate_open: false };
        updateEventReadiness(state, [localGateEvent]);
        expect(state.military.event_readiness!.test_local_gate_event).toBe(3);
    });

    it('does not apply a pressure modifier written later in the same event-evaluation turn', () => {
        const state = minState();
        const pressureEvent: EventDefinition = {
            id: 'future_modifier_target',
            trigger: { turn_min: 10, phase: 'war' },
            effect: { kind: 'narrative', text: 'target' },
            pressure: {
                base_rate: 1,
                threshold: 10,
                decay_rate: 0,
                modifiers: [{
                    condition: { type: 'flag_equals', flag: 'future_modifier', value: true },
                    rate_bonus: 4,
                }],
            },
        };
        const writer: EventDefinition = {
            id: 'future_modifier_writer',
            trigger: { turn_min: 10, phase: 'war' },
            effect: { kind: 'narrative', text: 'writer' },
            sets_flags: { future_modifier: true },
            once: true,
        };

        updateEventReadiness(state, [pressureEvent]);
        evaluateEvents(state, () => { throw new Error('unexpected RNG'); }, 10, [writer, pressureEvent]);

        expect(state.military.event_readiness?.future_modifier_target).toBe(1);
    });

    it('reaches Srebrenica readiness at turn 171 with the RRF brake before the unchanged expiry', () => {
        const events = JSON.parse(readFileSync('data/scenarios/events/war_1995.json', 'utf8')) as EventDefinition[];
        const srebrenica = events.find((event) => event.id === 'srebrenica_falls_1995')!;
        const state = minState();
        state.military.event_flags = {
            srebrenica_enclave_formed: true,
            srebrenica_demilitarized: true,
            coha_expired: true,
            rrf_deployed: true,
            un_hostage_crisis_occurred: true,
        };
        state.political.political_controllers = { 'op:srebrenica:srebrenica_2': 'RBiH' };

        for (const turn of [169, 170, 171]) {
            state.meta.turn = turn;
            updateEventReadiness(state, [srebrenica]);
        }

        expect(srebrenica.trigger.turn_max).toBe(185);
        expect(state.military.event_readiness?.srebrenica_falls_1995).toBe(10.5);
        expect(isEventReady(state, srebrenica)).toBe(true);
    });
});
