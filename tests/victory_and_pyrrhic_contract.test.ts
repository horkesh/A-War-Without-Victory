/**
 * v0.9.0 Victory Conditions + Pyrrhic Scoring contract.
 *
 * Locks the invariants documented in docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md §7
 * and docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md §1 (Ring 3 — refused).
 *
 * These assertions are the regression surface for the canon gate. If one of them
 * fails, the gate has been violated and requires the sign-off structure in
 * VICTORY_AND_PYRRHIC_SCORING.md §8 before being weakened or removed.
 */

import { describe, expect, test } from 'vitest';

import { evaluateVictoryConditions } from '../src/scenario/victory_conditions.js';
import {
    classifyOutcome,
    computeFactionGrade,
    computePyrrhicScore,
} from '../src/sim/negotiation/scoring.js';
import {
    collectCondemnationFlags,
    evaluateRuptureConsequences,
} from '../src/sim/negotiation/rupture_consequences.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { NegotiationBreakdown } from '../src/state/negotiation_types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

function emptyBreakdown(overrides: Partial<NegotiationBreakdown> = {}): NegotiationBreakdown {
    return {
        territory_controlled_pct: 0,
        territory_controlled_km2: 0,
        civilians_under_protection: 0,
        refugees_created: 0,
        refugees_received: 0,
        military_casualties_inflicted: 0,
        military_casualties_taken: 0,
        civilian_casualties_caused: 0,
        enclaves_held: [],
        enclaves_lost: [],
        peace_plans_accepted: [],
        peace_plans_rejected: [],
        operations_launched: 0,
        operations_successful: 0,
        war_crimes_events: 0,
        ...overrides,
    };
}

function minimalState(overrides: Partial<GameState> = {}): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 200, seed: 'contract-test', phase: 'war' },
        factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 50 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 50 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 50 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as any,
        political: { political_controllers: {} } as any,
        displacement: {} as any,
        ...overrides,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario contract: termination
// ─────────────────────────────────────────────────────────────────────────────

describe('v0.9.0 — scenario victory condition contract', () => {
    test('undefined victory_conditions returns null (canonical fallback)', () => {
        const state = minimalState();
        expect(evaluateVictoryConditions(state, undefined)).toBeNull();
    });

    test('empty by_faction produces no_winner (explicit-but-zero semantic, distinct from undefined)', () => {
        // Canon distinction: undefined = no victory-condition termination at all.
        // {} = author explicitly declared conditions for zero factions — nobody wins.
        const state = minimalState();
        const result = evaluateVictoryConditions(state, { by_faction: {} as any });
        expect(result).not.toBeNull();
        expect(result?.result).toBe('no_winner');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Judgment: outcome classification
// ─────────────────────────────────────────────────────────────────────────────

describe('v0.9.0 — classifyOutcome canon', () => {
    test('territory <=0 always produces collapse regardless of grade', () => {
        const breakdown = emptyBreakdown({ territory_controlled_pct: 0 });
        expect(classifyOutcome('RBiH', breakdown, undefined, 'A+', 100, [])).toBe('collapse');
        expect(classifyOutcome('RS', breakdown, undefined, 'B', 50, [])).toBe('collapse');
    });

    test('grade F always produces collapse', () => {
        const breakdown = emptyBreakdown({ territory_controlled_pct: 15 });
        expect(classifyOutcome('RBiH', breakdown, undefined, 'F', 40, [])).toBe('collapse');
    });

    test('genocide_condemnation forces failure regardless of grade or score', () => {
        const breakdown = emptyBreakdown({ territory_controlled_pct: 60 });
        expect(
            classifyOutcome('RS', breakdown, undefined, 'A+', 95, ['genocide_condemnation']),
        ).toBe('failure');
    });

    test('grade D forces failure', () => {
        const breakdown = emptyBreakdown({ territory_controlled_pct: 12 });
        expect(classifyOutcome('RBiH', breakdown, undefined, 'D', 35, [])).toBe('failure');
    });

    test('any condemnation flag + territory >30 forces hollow_victory', () => {
        const breakdown = emptyBreakdown({ territory_controlled_pct: 50 });
        // Non-genocide flag path (defense in depth for future ruptures).
        expect(
            classifyOutcome('RS', breakdown, undefined, 'B', 70, ['some_future_condemnation']),
        ).toBe('hollow_victory');
    });

    test('A+ without condemnation produces strategic_success', () => {
        const breakdown = emptyBreakdown({ territory_controlled_pct: 40 });
        expect(classifyOutcome('RBiH', breakdown, undefined, 'A+', 88, [])).toBe('strategic_success');
    });

    test('outcome class is deterministic (same inputs → same output)', () => {
        const breakdown = emptyBreakdown({ territory_controlled_pct: 35 });
        const first = classifyOutcome('RBiH', breakdown, undefined, 'B', 65, []);
        const second = classifyOutcome('RBiH', breakdown, undefined, 'B', 65, []);
        expect(first).toBe(second);
        expect(first).toBe('negotiated_escape');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Grade anchor canon (subset — spot checks on the published table)
// ─────────────────────────────────────────────────────────────────────────────

describe('v0.9.0 — faction grade anchor canon', () => {
    test('RBiH A+ requires zero war_crimes_events', () => {
        const state = minimalState();
        const cleanCap = emptyBreakdown({ territory_controlled_pct: 40, war_crimes_events: 0 });
        const tainted = emptyBreakdown({ territory_controlled_pct: 40, war_crimes_events: 1 });
        expect(computeFactionGrade(cleanCap, 'RBiH', state).grade).toBe('A+');
        expect(computeFactionGrade(tainted, 'RBiH', state).grade).not.toBe('A+');
    });

    test('RBiH B requires Sarajevo held (not in enclaves_lost)', () => {
        const state = minimalState();
        const sarajevoHeld = emptyBreakdown({ territory_controlled_pct: 27, enclaves_lost: ['gorazde'] });
        const sarajevoLost = emptyBreakdown({ territory_controlled_pct: 27, enclaves_lost: ['sarajevo'] });
        expect(computeFactionGrade(sarajevoHeld, 'RBiH', state).grade).toBe('B');
        expect(computeFactionGrade(sarajevoLost, 'RBiH', state).grade).not.toBe('B');
    });

    test('RS A+ permits up to 2 war_crimes_events', () => {
        const state = minimalState();
        const acceptable = emptyBreakdown({ territory_controlled_pct: 60, war_crimes_events: 2 });
        const excessive = emptyBreakdown({ territory_controlled_pct: 60, war_crimes_events: 3 });
        expect(computeFactionGrade(acceptable, 'RS', state).grade).toBe('A+');
        expect(computeFactionGrade(excessive, 'RS', state).grade).not.toBe('A+');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ring 3 — refused surface (non-inversion proofs)
// ─────────────────────────────────────────────────────────────────────────────

describe('v0.9.0 — Pyrrhic score non-inversion (SENSITIVE_HISTORY Ring 3)', () => {
    test('score does not increase when war_crimes_events rises (grade path)', () => {
        const state = minimalState();
        const clean = emptyBreakdown({ territory_controlled_pct: 40, war_crimes_events: 0 });
        const dirty = emptyBreakdown({ territory_controlled_pct: 40, war_crimes_events: 5 });
        const cleanGrade = computeFactionGrade(clean, 'RBiH', state).grade;
        const dirtyGrade = computeFactionGrade(dirty, 'RBiH', state).grade;
        // Grade ranking (numeric ordering: A+ < A < B < C < D < F by desirability)
        const rank: Record<string, number> = { 'A+': 6, A: 5, B: 4, C: 3, D: 2, F: 1 };
        expect(rank[dirtyGrade]!).toBeLessThanOrEqual(rank[cleanGrade]!);
    });

    test('pyrrhic score is bounded 0..100 regardless of input', () => {
        // Score clamps via negotiating capital. Absence of dimension store falls back to 50.
        const bd = emptyBreakdown();
        const score = computePyrrhicScore(bd, 'RBiH', undefined);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rupture consequence contract (Ring 2 — locked, idempotent)
// ─────────────────────────────────────────────────────────────────────────────

describe('v0.9.0 — rupture_consequences canon', () => {
    function srebrenicaFallState(turn: number): GameState {
        const state = minimalState({
            meta: { turn, seed: 'rupture-test', phase: 'war' } as any,
        });
        state.military!.negotiation = {
            capital: {},
            patron_relationships: {},
            strategic_dimensions: undefined,
            rupture_consequences: [],
        } as any;
        state.military!.event_flags = { srebrenica_enclave_formed: true } as any;
        state.political.political_controllers = {
            'op:srebrenica:srebrenica_2': 'RS',
        } as any;
        return state;
    }

    test('rupture fires when all preconditions met', () => {
        const state = srebrenicaFallState(160);
        evaluateRuptureConsequences(state);
        const ruptures = state.military!.negotiation!.rupture_consequences ?? [];
        expect(ruptures).toHaveLength(1);
        expect(ruptures[0]!.id).toBe('srebrenica_genocide_1995');
        expect(ruptures[0]!.perpetrator_faction).toBe('RS');
        expect(ruptures[0]!.condemnation_flag).toBe('genocide_condemnation');
    });

    test('rupture is idempotent (second call does not duplicate)', () => {
        const state = srebrenicaFallState(160);
        evaluateRuptureConsequences(state);
        evaluateRuptureConsequences(state);
        evaluateRuptureConsequences(state);
        const ruptures = state.military!.negotiation!.rupture_consequences ?? [];
        expect(ruptures).toHaveLength(1);
    });

    test('rupture does not fire before the event-owned receipt window', () => {
        const state = srebrenicaFallState(159);
        evaluateRuptureConsequences(state);
        expect(state.military!.negotiation!.rupture_consequences ?? []).toHaveLength(0);
    });

    test('rupture does not fire without enclave_formed flag', () => {
        const state = srebrenicaFallState(160);
        state.military!.event_flags = {} as any;
        evaluateRuptureConsequences(state);
        expect(state.military!.negotiation!.rupture_consequences ?? []).toHaveLength(0);
    });

    test('rupture does not fire when Srebrenica OSID is not RS-controlled', () => {
        const state = srebrenicaFallState(160);
        state.political.political_controllers = {
            'op:srebrenica:srebrenica_2': 'RBiH',
        } as any;
        evaluateRuptureConsequences(state);
        expect(state.military!.negotiation!.rupture_consequences ?? []).toHaveLength(0);
    });

    test('collectCondemnationFlags returns perpetrator flags sorted', () => {
        const state = srebrenicaFallState(160);
        evaluateRuptureConsequences(state);
        expect(collectCondemnationFlags(state, 'RS')).toEqual(['genocide_condemnation']);
        expect(collectCondemnationFlags(state, 'RBiH')).toEqual([]);
        expect(collectCondemnationFlags(state, 'HRHB')).toEqual([]);
    });
});
