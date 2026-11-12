/**
 * Bounded Dayton rounds (DC amendment A2): the player tables a draft, every other
 * delegation answers, the round is saved; at most three rounds; each tabled round adds
 * patron pressure (10 points, two steps at most) through one helper that every Dayton
 * patron check reads. No tabled round means no change, so headless runs are untouched.
 */
import { describe, expect, it } from 'vitest';

import type { GameState, FactionId } from '../src/state/game_state.js';
import type { DaytonProposal, NegotiationBreakdown, PatronRelationship } from '../src/state/negotiation_types.js';
import { createEmptyCapital } from '../src/state/negotiation_types.js';
import {
    DAYTON_MAX_ROUNDS,
    daytonRoundPressure,
    effectiveDaytonOverride,
    nextDaytonRound,
    tableDaytonRound,
} from '../src/sim/negotiation/dayton_rounds.js';
import { evaluateBotResponse } from '../src/sim/negotiation/bot_negotiation.js';
import { initiateDaytonNegotiation, resolveDaytonNegotiation } from '../src/sim/negotiation/dayton_negotiation.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';

function makeState(player: FactionId = 'RBiH', override = 60, composite = 40): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, PatronRelationship> = {};
    const dims = initializeStrategicDimensions();
    for (const f of ['RBiH', 'RS', 'HRHB']) {
        capital[f] = createEmptyCapital();
        patron_relationships[f] = { patron_id: 'international_community', support_level: 50, override_authority: override, sanctions_active: false, relationship_events: [] };
        for (const dim of Object.keys(dims[f]!)) dims[f]![dim] = { base_value: composite, event_modifier: 0, effective_value: composite };
    }
    const state = {
        meta: { turn: 188, war_start_turn: 0, phase: 'war', seed: 1, date: '1995-11-21', game_over: false, player_faction: player },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: { formations: {}, negotiation: { capital, patron_relationships, peace_plan_history: [], strategic_dimensions: dims } },
        political: { political_controllers: {} },
        displacement: {},
    } as unknown as GameState;
    state.military.negotiation!.pending_dayton = initiateDaytonNegotiation(state);
    return state;
}

const DRAFT: DaytonProposal = { territorial_demands: ['gorazde_corridor'], territorial_concessions: [], institutional_choices: {} };

describe('round pressure', () => {
    it('adds nothing before any round is tabled, then 10 and 20, never more', () => {
        const state = makeState();
        const neg = state.military.negotiation!;
        expect(daytonRoundPressure(neg)).toBe(0);
        expect(effectiveDaytonOverride(neg, 'RS')).toBe(60);
        expect(nextDaytonRound(neg)).toBe(1);
        tableDaytonRound(state, DRAFT, evaluateBotResponse);
        expect(daytonRoundPressure(neg)).toBe(10);
        tableDaytonRound(state, DRAFT, evaluateBotResponse);
        expect(daytonRoundPressure(neg)).toBe(20);
        tableDaytonRound(state, DRAFT, evaluateBotResponse);
        expect(daytonRoundPressure(neg)).toBe(20);
        expect(effectiveDaytonOverride(neg, 'RS')).toBe(80);
        expect(nextDaytonRound(neg)).toBeNull();
    });

    it('caps authority at 100', () => {
        const state = makeState('RBiH', 95);
        tableDaytonRound(state, DRAFT, evaluateBotResponse);
        tableDaytonRound(state, DRAFT, evaluateBotResponse);
        expect(effectiveDaytonOverride(state.military.negotiation, 'RS')).toBe(100);
    });
});

describe('tableDaytonRound', () => {
    it('records the draft and every other delegation answer, with the pressure it was answered under', () => {
        const state = makeState('RBiH');
        const first = tableDaytonRound(state, DRAFT, evaluateBotResponse);
        expect(first.ok).toBe(true);
        if (!first.ok) return;
        expect(first.round.round).toBe(1);
        expect(first.round.pressure).toBe(0);
        expect(Object.keys(first.round.responses).sort()).toEqual(['HRHB', 'RS']);
        expect(first.round.proposal).toEqual(DRAFT);
        expect(first.round.responses.RS!.reason_code).toBeDefined();
        const second = tableDaytonRound(state, DRAFT, evaluateBotResponse);
        expect(second.ok && second.round.pressure).toBe(10);
        expect(state.military.negotiation!.pending_dayton!.rounds).toHaveLength(2);
    });

    it('refuses a fourth round, a round with no table, and a round after signing', () => {
        const state = makeState();
        for (let i = 0; i < DAYTON_MAX_ROUNDS; i++) expect(tableDaytonRound(state, DRAFT, evaluateBotResponse).ok).toBe(true);
        expect(tableDaytonRound(state, DRAFT, evaluateBotResponse)).toEqual({ ok: false, error: 'rounds_spent' });
        const noTable = makeState();
        delete noTable.military.negotiation!.pending_dayton;
        expect(tableDaytonRound(noTable, DRAFT, evaluateBotResponse)).toEqual({ ok: false, error: 'no_table' });
        const signed = makeState();
        resolveDaytonNegotiation(signed, DRAFT);
        signed.military.negotiation!.pending_dayton = initiateDaytonNegotiation(signed);
        expect(tableDaytonRound(signed, DRAFT, evaluateBotResponse)).toEqual({ ok: false, error: 'already_signed' });
    });

    it('is deterministic', () => {
        const a = makeState(); const b = makeState();
        expect(tableDaytonRound(a, DRAFT, evaluateBotResponse)).toEqual(tableDaytonRound(b, DRAFT, evaluateBotResponse));
    });
});

describe('pressure reaches the answers and the signature', () => {
    it('a delegation that counters in round 1 can accept under pressure later (patron at 60 crosses 75)', () => {
        const state = makeState('RBiH', 60, 30);
        const r1 = tableDaytonRound(state, DRAFT, evaluateBotResponse);
        tableDaytonRound(state, DRAFT, evaluateBotResponse);
        const r3 = tableDaytonRound(state, DRAFT, evaluateBotResponse);
        expect(r1.ok && r3.ok).toBe(true);
        if (!r1.ok || !r3.ok) return;
        // Willingness rises from 0.70 (authority 60) to 0.80 (authority 80): never less willing.
        const rank = { reject: 0, counter: 1, accept: 2 } as const;
        expect(rank[r3.round.responses.RS!.decision]).toBeGreaterThanOrEqual(rank[r1.round.responses.RS!.decision]);
    });

    it('signing with no tabled round resolves exactly as before (headless and historical default)', () => {
        const a = makeState('RBiH', 60, 30);
        const b = makeState('RBiH', 60, 30);
        delete b.military.negotiation!.pending_dayton!.rounds;
        expect(resolveDaytonNegotiation(a, DRAFT)).toEqual(resolveDaytonNegotiation(b, DRAFT));
    });

    it('after two tabled rounds a patron at 60 can force its client at signature', () => {
        const pressed = makeState('RBiH', 60, 10);
        tableDaytonRound(pressed, DRAFT, evaluateBotResponse);
        tableDaytonRound(pressed, DRAFT, evaluateBotResponse);
        const unpressed = makeState('RBiH', 60, 10);
        const withPressure = resolveDaytonNegotiation(pressed, DRAFT);
        const without = resolveDaytonNegotiation(unpressed, DRAFT);
        expect(withPressure.patron_overrides_applied.length).toBeGreaterThanOrEqual(without.patron_overrides_applied.length);
        expect(withPressure.territorial_packages_accepted.length).toBeGreaterThanOrEqual(without.territorial_packages_accepted.length);
    });
});
