/**
 * v0.8.4 Phase E test suite.
 *
 * Covers the turn-advance block logic:
 *   - advance-turn is blocked when a requires_player_response:true decision is pending
 *   - advance-turn is NOT blocked when pending_event_decisions is empty
 *   - advance-turn is NOT blocked when only non-requires-player-response decisions are pending
 *   - blocked_decisions list contains correct event_id, event_title, and faction
 *   - requires_player_response is stamped onto PendingEventDecision by evaluateEvents
 */

import { describe, it, expect } from 'vitest';
import type { GameState, FactionId } from '../../../src/state/game_state.js';
import type { PendingEventDecision } from '../../../src/sim/events/event_types.js';
import { evaluateEvents } from '../../../src/sim/events/evaluate_events.js';
import type { EventDefinition } from '../../../src/sim/events/event_types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic RNG: always returns 0. */
const alwaysRng = () => 0;

/** Build a minimal GameState with the given pending decisions. */
function makeState(opts: {
    pendingDecisions?: PendingEventDecision[];
    autonomyLevel?: 0 | 1 | 2 | 3;
    turn?: number;
    playerFaction?: FactionId;
}): GameState {
    const {
        pendingDecisions,
        autonomyLevel = 1,
        turn = 5,
        playerFaction = 'RBiH',
    } = opts;

    return {
        meta: {
            turn,
            seed: 'test',
            phase: 'war',
            player_faction: playerFaction,
            autonomy_level: autonomyLevel,
        },
        military: {
            formations: {},
            corps_command: {},
            pending_event_decisions: pendingDecisions,
        },
    } as unknown as GameState;
}

/**
 * The block logic extracted from the electron-main.cjs advance-turn handler,
 * tested here at the unit level without Electron.
 * Returns the same shape as the IPC handler.
 */
function simulateAdvanceTurnBlock(state: GameState): {
    ok: boolean;
    error?: string;
    blocked_decisions?: Array<{ event_id: string; event_title: string; faction: string }>;
} {
    const pending = state.military.pending_event_decisions ?? [];
    const blocked = pending.filter((d: PendingEventDecision) => d.requires_player_response === true);
    if (blocked.length > 0) {
        return {
            ok: false,
            error: 'pending_required_decisions',
            blocked_decisions: blocked.map((d: PendingEventDecision) => ({
                event_id: d.event_id,
                event_title: d.event_title,
                faction: d.faction,
            })),
        };
    }
    return { ok: true };
}

// ---------------------------------------------------------------------------
// Sample decisions
// ---------------------------------------------------------------------------

const HIGH_STAKES_DECISION: PendingEventDecision = {
    event_id: 'nato_ultimatum_sarajevo_1994',
    event_title: 'NATO Ultimatum: Sarajevo',
    turn_fired: 5,
    response_options: [],
    faction: 'RBiH',
    requires_player_response: true,
};

const NORMAL_DECISION: PendingEventDecision = {
    event_id: 'some_routine_event',
    event_title: 'Routine Political Event',
    turn_fired: 5,
    response_options: [],
    faction: 'RBiH',
    // requires_player_response intentionally absent
};

const ANOTHER_NORMAL_DECISION: PendingEventDecision = {
    event_id: 'another_routine_event',
    event_title: 'Another Routine Event',
    turn_fired: 4,
    response_options: [],
    faction: 'RS',
    requires_player_response: false,
};

// ---------------------------------------------------------------------------
// Group 1: Block behaviour
// ---------------------------------------------------------------------------

describe('advance-turn block: requires_player_response gate', () => {
    it('is blocked when a requires_player_response:true decision is pending', () => {
        const state = makeState({ pendingDecisions: [HIGH_STAKES_DECISION] });
        const result = simulateAdvanceTurnBlock(state);
        expect(result.ok).toBe(false);
        expect(result.error).toBe('pending_required_decisions');
    });

    it('is NOT blocked when pending_event_decisions is empty', () => {
        const state = makeState({ pendingDecisions: [] });
        const result = simulateAdvanceTurnBlock(state);
        expect(result.ok).toBe(true);
        expect(result.error).toBeUndefined();
    });

    it('is NOT blocked when pending_event_decisions is undefined', () => {
        const state = makeState({ pendingDecisions: undefined });
        const result = simulateAdvanceTurnBlock(state);
        expect(result.ok).toBe(true);
        expect(result.error).toBeUndefined();
    });

    it('is NOT blocked when only non-requires-player-response decisions are pending', () => {
        const state = makeState({ pendingDecisions: [NORMAL_DECISION, ANOTHER_NORMAL_DECISION] });
        const result = simulateAdvanceTurnBlock(state);
        expect(result.ok).toBe(true);
    });

    it('is NOT blocked when requires_player_response is explicitly false', () => {
        const state = makeState({ pendingDecisions: [ANOTHER_NORMAL_DECISION] });
        const result = simulateAdvanceTurnBlock(state);
        expect(result.ok).toBe(true);
    });

    it('is blocked when high-stakes decision is mixed with normal decisions', () => {
        const state = makeState({
            pendingDecisions: [NORMAL_DECISION, HIGH_STAKES_DECISION, ANOTHER_NORMAL_DECISION],
        });
        const result = simulateAdvanceTurnBlock(state);
        expect(result.ok).toBe(false);
        expect(result.error).toBe('pending_required_decisions');
    });
});

// ---------------------------------------------------------------------------
// Group 2: blocked_decisions payload shape
// ---------------------------------------------------------------------------

describe('advance-turn block: blocked_decisions payload', () => {
    it('blocked_decisions contains correct event_id', () => {
        const state = makeState({ pendingDecisions: [HIGH_STAKES_DECISION] });
        const result = simulateAdvanceTurnBlock(state);
        expect(result.blocked_decisions).toHaveLength(1);
        expect(result.blocked_decisions![0].event_id).toBe('nato_ultimatum_sarajevo_1994');
    });

    it('blocked_decisions contains correct event_title', () => {
        const state = makeState({ pendingDecisions: [HIGH_STAKES_DECISION] });
        const result = simulateAdvanceTurnBlock(state);
        expect(result.blocked_decisions![0].event_title).toBe('NATO Ultimatum: Sarajevo');
    });

    it('blocked_decisions contains correct faction', () => {
        const state = makeState({ pendingDecisions: [HIGH_STAKES_DECISION] });
        const result = simulateAdvanceTurnBlock(state);
        expect(result.blocked_decisions![0].faction).toBe('RBiH');
    });

    it('blocked_decisions only includes high-stakes decisions, not normal ones', () => {
        const state = makeState({
            pendingDecisions: [NORMAL_DECISION, HIGH_STAKES_DECISION, ANOTHER_NORMAL_DECISION],
        });
        const result = simulateAdvanceTurnBlock(state);
        expect(result.blocked_decisions).toHaveLength(1);
        expect(result.blocked_decisions![0].event_id).toBe('nato_ultimatum_sarajevo_1994');
    });

    it('blocked_decisions lists all high-stakes decisions when multiple are pending', () => {
        const secondHighStakes: PendingEventDecision = {
            event_id: 'second_critical_event',
            event_title: 'Second Critical Event',
            turn_fired: 5,
            response_options: [],
            faction: 'RS',
            requires_player_response: true,
        };
        const state = makeState({
            pendingDecisions: [HIGH_STAKES_DECISION, NORMAL_DECISION, secondHighStakes],
        });
        const result = simulateAdvanceTurnBlock(state);
        expect(result.blocked_decisions).toHaveLength(2);
        const ids = result.blocked_decisions!.map(d => d.event_id);
        expect(ids).toContain('nato_ultimatum_sarajevo_1994');
        expect(ids).toContain('second_critical_event');
    });
});

// ---------------------------------------------------------------------------
// Group 3: evaluateEvents stamps requires_player_response onto PendingEventDecision
// ---------------------------------------------------------------------------

const HIGH_STAKES_EVENT_DEF: EventDefinition = {
    id: 'test_high_stakes_stamping',
    once: true,
    priority: 50,
    requires_player_response: true,
    responding_faction: 'RBiH',
    effect: { kind: 'narrative', text: 'Critical decision required.' },
    trigger: { type: 'turn_gte', value: 1 },
    bot_response_logic: 'strategic_weighted',
    response_options: [
        { id: 'comply', label: 'Comply', effects: [] },
        { id: 'defy', label: 'Defy', effects: [] },
    ],
} as unknown as EventDefinition;

const NORMAL_EVENT_DEF: EventDefinition = {
    id: 'test_normal_event_no_stamp',
    once: true,
    priority: 10,
    responding_faction: 'RBiH',
    effect: { kind: 'narrative', text: 'Routine event.' },
    trigger: { type: 'turn_gte', value: 1 },
    response_options: [
        { id: 'ok', label: 'OK', effects: [] },
    ],
} as unknown as EventDefinition;

describe('evaluateEvents: requires_player_response stamped onto PendingEventDecision', () => {
    it('stamps requires_player_response:true when event definition has it set', () => {
        const state = makeState({ pendingDecisions: [], autonomyLevel: 1, playerFaction: 'RBiH' });
        evaluateEvents(state, alwaysRng, 5, [HIGH_STAKES_EVENT_DEF]);
        const pending = state.military.pending_event_decisions ?? [];
        const decision = pending.find(d => d.event_id === 'test_high_stakes_stamping');
        expect(decision).toBeDefined();
        expect(decision!.requires_player_response).toBe(true);
    });

    it('does not stamp requires_player_response when event definition omits it', () => {
        const state = makeState({ pendingDecisions: [], autonomyLevel: 1, playerFaction: 'RBiH' });
        evaluateEvents(state, alwaysRng, 5, [NORMAL_EVENT_DEF]);
        const pending = state.military.pending_event_decisions ?? [];
        const decision = pending.find(d => d.event_id === 'test_normal_event_no_stamp');
        expect(decision).toBeDefined();
        // undefined is correct — field is absent; the block filter checks === true
        expect(decision!.requires_player_response).toBeFalsy();
    });

    it('queues high-stakes event at autonomy level 3 (must-show-player gate)', () => {
        // At level 3, mustShowPlayer requires requires_player_response:true
        const state = makeState({ pendingDecisions: [], autonomyLevel: 3, playerFaction: 'RBiH' });
        evaluateEvents(state, alwaysRng, 5, [HIGH_STAKES_EVENT_DEF]);
        const pending = state.military.pending_event_decisions ?? [];
        const decision = pending.find(d => d.event_id === 'test_high_stakes_stamping');
        expect(decision).toBeDefined();
        expect(decision!.requires_player_response).toBe(true);
    });
});
