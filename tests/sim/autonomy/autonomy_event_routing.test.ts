/**
 * Tests for v0.8.4 Phase A — Observer event routing in evaluateEvents.
 *
 * Covers:
 * 1. Level 0 (default, undefined): event with response_options queues as PendingEventDecision
 * 2. Level 3 (Observer): event auto-responds, no PendingEventDecision created
 * 3. Level 3 + no client faction set: event auto-responds via pickBotResponseV1 formula path
 *
 * Uses a synthetic EventDefinition registry so no real event IDs are loaded.
 * Deterministic: no Math.random(), no Date.now().
 */

import { describe, it, expect } from 'vitest';
import { evaluateEvents } from '../../../src/sim/events/evaluate_events.js';
import type { GameState } from '../../../src/state/game_state.js';
import type { EventDefinition } from '../../../src/sim/events/event_types.js';

// ═══════════════════════════════════════════════════════════════════════════
// Minimal state factory
// ═══════════════════════════════════════════════════════════════════════════

function makeState(metaOverrides: Record<string, unknown> = {}): GameState {
    return {
        meta: {
            turn: 10,
            seed: 'test',
            phase: 'war',
            ...metaOverrides,
        },
        factions: [
            { id: 'RBiH' },
            { id: 'RS' },
            { id: 'HRHB' },
        ],
        military: {
            formations: {},
            fired_event_ids: [],
            pending_event_decisions: [],
            strategic_dimensions: undefined,
            negotiation: undefined,
        },
        displacement: {},
        economy: {},
        political: {},
    } as unknown as GameState;
}

/** Deterministic RNG: always returns 0 (below any probability gate). */
const alwaysRng = () => 0;

// ═══════════════════════════════════════════════════════════════════════════
// Synthetic event with response_options
// ═══════════════════════════════════════════════════════════════════════════

const SYNTHETIC_DECISION_EVENT: EventDefinition = {
    id: 'test_decision_event',
    once: true,
    priority: 1,
    effect: { kind: 'narrative', text: 'A test decision has arisen.' },
    trigger: { type: 'turn_gte', value: 1 },
    response_options: [
        {
            id: 'opt_a',
            label: 'Accept',
            effects: [],
        },
        {
            id: 'opt_b',
            label: 'Reject',
            effects: [],
        },
    ],
    bot_response_logic: 'default',
} as unknown as EventDefinition;

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('autonomy event routing — PendingEventDecision queuing', () => {
    it('1. Level 0 (default undefined): event queues as PendingEventDecision', () => {
        // autonomy_level not set → defaults to 0 → player gets the decision
        const state = makeState({ player_faction: 'RBiH' });
        evaluateEvents(state, alwaysRng, 10, [SYNTHETIC_DECISION_EVENT]);
        expect(state.military.pending_event_decisions).toBeDefined();
        expect(state.military.pending_event_decisions!.length).toBe(1);
        expect(state.military.pending_event_decisions![0].event_id).toBe('test_decision_event');
        expect(state.military.pending_event_decisions![0].faction).toBe('RBiH');
    });

    it('2. Level 3 (Observer): event auto-responds, no PendingEventDecision created', () => {
        const state = makeState({
            player_faction: 'RBiH',
            autonomy_level: 3,
        });
        evaluateEvents(state, alwaysRng, 10, [SYNTHETIC_DECISION_EVENT]);
        // Observer: bot auto-responds, no pending decision queued
        const pending = state.military.pending_event_decisions ?? [];
        expect(pending.length).toBe(0);
    });

    it('3. Level 3 + no player_faction: event auto-responds via bot path (no error)', () => {
        // Headless/spectator scenario: playerFaction undefined, level doesn't matter
        const state = makeState({
            autonomy_level: 3,
            // player_faction deliberately absent
        });
        // Should not throw and should not create any pending decisions
        expect(() => {
            evaluateEvents(state, alwaysRng, 10, [SYNTHETIC_DECISION_EVENT]);
        }).not.toThrow();
        const pending = state.military.pending_event_decisions ?? [];
        expect(pending.length).toBe(0);
    });
});
