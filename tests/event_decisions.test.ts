/**
 * v0.4.1 Phase 2: Event Decision tests.
 * - Decision event adds to pending list for player faction
 * - Bot auto-responds with accept_first / reject_all
 * - resolveEventDecision applies effects and removes pending
 * Tests pass event definitions via the registry parameter (no global mutation).
 */

import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/state/game_state';
import type { EventDefinition } from '../src/sim/events/event_types';
import { resolveEventDecision } from '../src/sim/events/resolve_decision';
import { evaluateEvents } from '../src/sim/events/evaluate_events';

function makeMinimalState(playerFaction?: string): GameState {
    return {
        schema_version: 1,
        factions: { RBiH: {} as any, RS: {} as any, HRHB: {} as any },
        meta: { turn: 5, phase: 'war', player_faction: playerFaction } as any,
        military: {
            formations: {},
            front_segments: {},
            front_posture: {} as any,
            front_posture_regions: {} as any,
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { RBiH: 50, RS: 50, HRHB: 50 },
        },
        political: {} as any,
        displacement: {} as any,
        economic: {} as any,
    } as unknown as GameState;
}

const DECISION_EVENT: EventDefinition = {
    id: 'test_decision_event',
    trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
    effect: { kind: 'narrative', text: 'A diplomatic proposal arrives.' },
    once: true,
    requires_player_response: true,
    bot_response_logic: 'accept_first',
    response_options: [
        {
            id: 'accept',
            label: 'Accept the proposal',
            description: 'Improves supply situation.',
            effects: [{ kind: 'supply_delta', faction: 'RBiH', delta: 10 }],
        },
        {
            id: 'reject',
            label: 'Reject the proposal',
            description: 'Maintains current position.',
            effects: [{ kind: 'morale_change', faction: 'RBiH', delta: -5 }],
        },
    ],
};

const REJECT_ALL_EVENT: EventDefinition = {
    id: 'test_reject_event',
    trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
    effect: { kind: 'narrative', text: 'A ceasefire is proposed.' },
    once: true,
    bot_response_logic: 'reject_all',
    response_options: [
        {
            id: 'accept',
            label: 'Accept ceasefire',
            effects: [{ kind: 'supply_delta', faction: 'RS', delta: 5 }],
        },
        {
            id: 'reject',
            label: 'Reject ceasefire',
            effects: [{ kind: 'supply_delta', faction: 'RS', delta: -5 }],
        },
    ],
};

describe('Event Decisions', () => {
    it('decision event adds to pending list for player faction', () => {
        const state = makeMinimalState('RBiH');
        const rng = () => 0.5;

        evaluateEvents(state, rng, 5, [DECISION_EVENT]);

        expect(state.military.pending_event_decisions).toBeDefined();
        expect(state.military.pending_event_decisions!.length).toBe(1);
        const pending = state.military.pending_event_decisions![0];
        expect(pending.event_id).toBe('test_decision_event');
        expect(pending.faction).toBe('RBiH');
        expect(pending.response_options.length).toBe(2);
        expect(pending.turn_fired).toBe(5);
    });

    it('bot factions auto-respond with accept_first', () => {
        // No player faction — all factions are bots
        const state = makeMinimalState(undefined);
        const initialSupply = state.military.general_supply_reserve!['RBiH'];
        const rng = () => 0.5;

        evaluateEvents(state, rng, 5, [DECISION_EVENT]);

        // All 3 factions are bots, each picks 'accept' → +10 supply to RBiH × 3
        expect(state.military.general_supply_reserve!['RBiH']).toBe(initialSupply + 30);
        // No pending decisions (no player faction)
        expect(state.military.pending_event_decisions ?? []).toHaveLength(0);
    });

    it('bot factions auto-respond with reject_all (picks last option)', () => {
        const state = makeMinimalState(undefined);
        const initialSupply = state.military.general_supply_reserve!['RS'];
        const rng = () => 0.5;

        evaluateEvents(state, rng, 5, [REJECT_ALL_EVENT]);

        // 3 bots × reject → -5 supply to RS each = -15
        expect(state.military.general_supply_reserve!['RS']).toBe(initialSupply - 15);
    });

    it('resolveEventDecision applies effects and removes pending', () => {
        const state = makeMinimalState('RBiH');
        state.military.pending_event_decisions = [
            {
                event_id: 'test_decision_event',
                event_title: 'A diplomatic proposal arrives.',
                turn_fired: 5,
                faction: 'RBiH',
                response_options: DECISION_EVENT.response_options!,
            },
        ];
        const initialSupply = state.military.general_supply_reserve!['RBiH'];

        resolveEventDecision(state, 'test_decision_event', 'accept');

        expect(state.military.general_supply_reserve!['RBiH']).toBe(initialSupply + 10);
        expect(state.military.pending_event_decisions!.length).toBe(0);
    });

    it('resolveEventDecision throws on unknown event_id', () => {
        const state = makeMinimalState('RBiH');
        state.military.pending_event_decisions = [];

        expect(() => resolveEventDecision(state, 'nonexistent', 'accept')).toThrow('No pending decision');
    });

    it('resolveEventDecision throws on unknown response_id', () => {
        const state = makeMinimalState('RBiH');
        state.military.pending_event_decisions = [
            {
                event_id: 'test_decision_event',
                event_title: 'Test',
                turn_fired: 5,
                faction: 'RBiH',
                response_options: DECISION_EVENT.response_options!,
            },
        ];

        expect(() => resolveEventDecision(state, 'test_decision_event', 'nonexistent')).toThrow('No response option');
    });
});
