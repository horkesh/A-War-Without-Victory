/**
 * R4 Phase 6 Task 6.1 — desktop Dayton close-out parity.
 *
 * The headless close-out (`resolvePendingDaytonCloseOut`, covered by
 * `dayton_headless_close_out.test.ts`) is gated on `meta.dayton_close_out` and is
 * never reachable from the desktop `resolve-dayton` path. The real player path calls
 * `resolveDaytonNegotiation` directly (from `electron-main.cjs`). Before this task it
 * signed the result and set `game_over` but never consumed `pending_dayton`, leaving a
 * dangling menu that the terminal-state decision gate treated as a forever-blocking
 * decision — the self-sealing deadlock the RS-playthrough Pyrrhic panel root-caused.
 *
 * These tests prove the desktop resolver now reaches the SAME cleared-`pending_dayton`
 * terminal state the headless proxy asserts, that the player-decision manifest then
 * reports zero blocking decisions, and that a repeat resolution call is first-write-wins.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import type { NegotiationBreakdown, PatronRelationship } from '../src/state/negotiation_types.js';
import { createEmptyCapital } from '../src/state/negotiation_types.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import {
    initiateDaytonNegotiation,
    resolveDaytonNegotiation,
    buildHistoricalDefaultDaytonProposal,
} from '../src/sim/negotiation/dayton_negotiation.js';
import { countBlockingPlayerDecisions } from '../src/state/player_decision_manifest.js';

function makeCapital(overrides: Partial<NegotiationBreakdown> = {}): NegotiationBreakdown {
    return { ...createEmptyCapital(), ...overrides };
}

function makePatron(overrides: Partial<PatronRelationship> = {}): PatronRelationship {
    return {
        patron_id: 'international_community',
        support_level: 50,
        override_authority: 10,
        sanctions_active: false,
        relationship_events: [],
        ...overrides,
    };
}

/** Mirrors the headless close-out test's terminal-state shape. */
function makeState(): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, PatronRelationship> = {};
    for (const faction of ['RBiH', 'RS', 'HRHB']) {
        capital[faction] = makeCapital({ territory_controlled_pct: 30 });
        patron_relationships[faction] = makePatron();
    }
    return {
        meta: {
            turn: 188,
            war_start_turn: 0,
            phase: 'war',
            seed: 1,
            date: '1995-11-21',
            game_over: false,
            player_faction: 'RS',
        },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {},
            negotiation: {
                capital,
                patron_relationships,
                peace_plan_history: [],
                strategic_dimensions: initializeStrategicDimensions(),
            },
        },
        political: { political_controllers: {} },
        displacement: {},
    } as unknown as GameState;
}

/** Arm a pending Dayton menu the way the pipeline step does. */
function armPendingMenu(state: GameState): void {
    const menu = initiateDaytonNegotiation(state);
    state.military.negotiation!.pending_dayton = menu as never;
}

describe('desktop Dayton close-out parity', () => {
    it('the desktop resolver consumes pending_dayton and reaches the terminal state', () => {
        const state = makeState();
        armPendingMenu(state);
        expect(state.military.negotiation!.pending_dayton).toBeDefined();
        expect(state.meta.game_over).toBe(false);

        const result = resolveDaytonNegotiation(state, buildHistoricalDefaultDaytonProposal());

        expect(result).toBeDefined();
        // Same terminal end state the headless proxy asserts:
        expect(state.meta.game_over).toBe(true);
        expect(state.meta.outcome).toBe('dayton');
        expect(state.military.negotiation!.pending_dayton).toBeUndefined();
        expect(state.military.negotiation!.dayton_result).toBeDefined();
        expect((state.meta as { endgame_snapshot?: unknown }).endgame_snapshot).toBeDefined();
    });

    it('the manifest then reports zero blocking decisions (no self-sealing deadlock)', () => {
        const state = makeState();
        armPendingMenu(state);
        // Pre-resolution the pending menu is a blocking Dayton decision. (The manifest
        // takes a GameStateLike structural type; cast the concrete GameState fixture.)
        expect(countBlockingPlayerDecisions(state as never, 'RS')).toBeGreaterThan(0);

        resolveDaytonNegotiation(state, buildHistoricalDefaultDaytonProposal());

        // Post-resolution: pending_dayton is consumed AND game_over neutralizes any
        // residual — advance-turn is no longer held shut.
        expect(countBlockingPlayerDecisions(state as never, 'RS')).toBe(0);
    });

    it('a repeat resolution call is first-write-wins (no re-sign, no re-freeze)', () => {
        const state = makeState();
        armPendingMenu(state);

        const first = resolveDaytonNegotiation(state, buildHistoricalDefaultDaytonProposal());
        const frozenSnapshot = (state.meta as { endgame_snapshot?: unknown }).endgame_snapshot;

        // A second call (e.g. Decline-Talks-then-resubmit) returns the SAME stored
        // result and leaves the frozen terminal state untouched.
        const second = resolveDaytonNegotiation(state, buildHistoricalDefaultDaytonProposal());
        expect(second).toBe(first);
        expect((state.meta as { endgame_snapshot?: unknown }).endgame_snapshot).toBe(frozenSnapshot);
        expect(state.military.negotiation!.pending_dayton).toBeUndefined();
    });
});
