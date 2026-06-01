/**
 * Free War Phase 3 — verdict cost-floor + conquest-win disarm.
 *
 * Part A: a long, bloody war (high war_cost_index) can never read as a clean
 *         triumph — the grade is capped downward by accrued cost, independent
 *         of territory. The cap can only LOWER, never raise.
 * Part B: in emergent mode the conquest victory-condition never fires; the war
 *         ends only via the other termination paths. Historical/unset unchanged.
 *
 * Deterministic: pure arithmetic over persisted state. No randomness.
 */

import { describe, it, expect } from 'vitest';
import {
    computeWarCostIndex,
    capGradeByCost,
    computeFactionVerdict,
} from '../src/sim/negotiation/scoring.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../src/state/negotiation_types.js';
import type { NegotiationBreakdown } from '../src/state/negotiation_types.js';
import type { GameState } from '../src/state/game_state.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import { checkWarTermination } from '../src/sim/war_termination.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

// ── helpers ─────────────────────────────────────────────────────────────────

function makeBreakdown(overrides: Partial<NegotiationBreakdown> = {}): NegotiationBreakdown {
    return { ...createEmptyCapital(), ...overrides };
}

interface CostInputs {
    turn?: number;
    exhaustion?: Partial<Record<string, number>>;
    casualties?: Partial<Record<string, { killed?: number; wounded?: number; missing_captured?: number }>>;
}

function makeVerdictState(
    factionBreakdowns: Record<string, Partial<NegotiationBreakdown>>,
    cost: CostInputs = {},
): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, any> = {};
    const casualty_ledger: Record<string, any> = {};
    for (const fid of ['RBiH', 'RS', 'HRHB']) {
        capital[fid] = makeBreakdown(factionBreakdowns[fid] ?? {});
        patron_relationships[fid] = createDefaultPatronRelationship(fid);
        const c = cost.casualties?.[fid] ?? {};
        casualty_ledger[fid] = {
            killed: c.killed ?? 0,
            wounded: c.wounded ?? 0,
            missing_captured: c.missing_captured ?? 0,
            equipment_lost: { tanks: 0, artillery: 0, aa_systems: 0 },
            per_formation: {},
        };
    }
    return {
        meta: { turn: cost.turn ?? 40, phase: 'war', seed: 1, date: '1995-01-15' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {},
            casualty_ledger,
            negotiation: {
                capital,
                patron_relationships,
                peace_plan_history: [],
                strategic_dimensions: initializeStrategicDimensions(),
            },
        },
        political: {
            political_controllers: {},
            war_exhaustion: { RBiH: 0, RS: 0, HRHB: 0, ...(cost.exhaustion ?? {}) },
        },
        displacement: {},
    } as unknown as GameState;
}

// ── Part A: war_cost_index ────────────────────────────────────────────────────

describe('computeWarCostIndex', () => {
    it('is 0 for a pristine, week-0, casualty-free war', () => {
        const state = makeVerdictState({ RS: { territory_controlled_pct: 58 } }, { turn: 0 });
        expect(computeWarCostIndex(state, 'RS')).toBe(0);
    });

    it('is high for a long, bloody, exhausted war', () => {
        const state = makeVerdictState(
            { RS: { territory_controlled_pct: 58 } },
            { turn: 156, exhaustion: { RS: 8000 }, casualties: { RS: { killed: 30000, wounded: 15000 } } },
        );
        expect(computeWarCostIndex(state, 'RS')).toBeCloseTo(1, 5);
    });

    it('is monotonic — more cost never lowers the index', () => {
        const low = makeVerdictState({ RS: {} }, { turn: 20, exhaustion: { RS: 1000 } });
        const high = makeVerdictState({ RS: {} }, { turn: 80, exhaustion: { RS: 5000 }, casualties: { RS: { killed: 5000 } } });
        expect(computeWarCostIndex(high, 'RS')).toBeGreaterThan(computeWarCostIndex(low, 'RS'));
    });

    it('is deterministic', () => {
        const state = makeVerdictState(
            { RS: {} },
            { turn: 100, exhaustion: { RS: 4000 }, casualties: { RS: { killed: 8000, wounded: 4000 } } },
        );
        expect(computeWarCostIndex(state, 'RS')).toBe(computeWarCostIndex(state, 'RS'));
    });
});

// ── Part A: capGradeByCost (cap only lowers) ──────────────────────────────────

describe('capGradeByCost', () => {
    it('does not change the grade below all cost thresholds', () => {
        expect(capGradeByCost('A+', 0.0)).toBe('A+');
        expect(capGradeByCost('A+', 0.44)).toBe('A+');
    });

    it('caps A+ to A in the costly band', () => {
        expect(capGradeByCost('A+', 0.45)).toBe('A');
        expect(capGradeByCost('A+', 0.59)).toBe('A');
    });

    it('caps to B in the pyrrhic band', () => {
        expect(capGradeByCost('A+', 0.60)).toBe('B');
        expect(capGradeByCost('A', 0.60)).toBe('B');
    });

    it('caps to C in the hollow band', () => {
        expect(capGradeByCost('A+', 0.78)).toBe('C');
        expect(capGradeByCost('A', 0.95)).toBe('C');
    });

    it('only LOWERS — never raises an already-worse grade', () => {
        // A D-grade faction stays D even at max cost (cap of C would be a raise).
        expect(capGradeByCost('D', 1.0)).toBe('D');
        expect(capGradeByCost('F', 1.0)).toBe('F');
        // B is already at/below the A cap → unchanged.
        expect(capGradeByCost('B', 0.45)).toBe('B');
    });
});

// ── Part A (a): high territory + HIGH cost → NOT strategic_success ─────────────

describe('verdict cost-floor — high territory + HIGH cost is capped', () => {
    it('RS holding A+ territory but in a long bloody war is NOT strategic_success', () => {
        const state = makeVerdictState(
            { RS: { territory_controlled_pct: 58, war_crimes_events: 1 } },
            { turn: 156, exhaustion: { RS: 8000 }, casualties: { RS: { killed: 30000, wounded: 15000 } } },
        );
        const verdict = computeFactionVerdict(state, 'RS');
        expect(verdict.grade).not.toBe('A+');
        expect(verdict.outcome_class).not.toBe('strategic_success');
    });

    it('the cap is reflected in the grade description', () => {
        const state = makeVerdictState(
            { RS: { territory_controlled_pct: 58, war_crimes_events: 1 } },
            { turn: 156, exhaustion: { RS: 8000 }, casualties: { RS: { killed: 30000, wounded: 15000 } } },
        );
        const verdict = computeFactionVerdict(state, 'RS');
        expect(verdict.grade_description).toContain('war cost');
    });
});

// ── Part A (b): high territory + LOW cost → still high grade ───────────────────

describe('verdict cost-floor — high territory + LOW cost keeps the high grade', () => {
    it('RS holding A+ territory in a short, cheap war stays A+ / strategic_success', () => {
        const state = makeVerdictState(
            { RS: { territory_controlled_pct: 58, war_crimes_events: 1 } },
            { turn: 8, exhaustion: { RS: 500 }, casualties: { RS: { killed: 200 } } },
        );
        const verdict = computeFactionVerdict(state, 'RS');
        expect(verdict.grade).toBe('A+');
        expect(verdict.outcome_class).toBe('strategic_success');
    });
});

// ── Part A (c): the cap only lowers, never raises ─────────────────────────────

describe('verdict cost-floor — cap only lowers, never raises', () => {
    it('a low-territory faction is not raised by a low cost index', () => {
        // RS at ~30% territory earns D from anchors; low cost must not raise it.
        const state = makeVerdictState(
            { RS: { territory_controlled_pct: 30 } },
            { turn: 4, exhaustion: { RS: 0 } },
        );
        const verdict = computeFactionVerdict(state, 'RS');
        expect(verdict.grade).toBe('D');
    });
});

// ── Part B: emergent mode disarms the conquest win ────────────────────────────

function minimalWarState(overrides?: Partial<GameState['meta']>): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 30,
            seed: 'test-seed',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10,
            ...overrides,
        },
        factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {
                'rbih_1st_bde': { faction: 'RBiH', kind: 'brigade', corps_id: 'rbih_1st_corps', personnel: 2000 },
                'rs_1st_bde': { faction: 'RS', kind: 'brigade', corps_id: 'rs_1st_corps', personnel: 2000 },
                'hrhb_1st_bde': { faction: 'HRHB', kind: 'brigade', corps_id: 'hrhb_1st_corps', personnel: 2000 },
            },
            event_flags: {},
        } as any,
        political: {
            political_controllers: { S1: 'RS', S2: 'RS', S3: 'RS', S4: 'RBiH' },
        } as any,
        displacement: {} as any,
    } as unknown as GameState;
}

describe('Part B — conquest win disarmed in emergent mode', () => {
    it('emergent mode + a state meeting victory_conditions does NOT terminate with victory', () => {
        const state = minimalWarState({ decision_mode: 'emergent' });
        state.meta.victory_conditions = {
            by_faction: { RS: { min_controlled_settlements: 2, max_exhaustion: 50 } },
        };
        const result = checkWarTermination(state);
        expect(result.game_over).toBe(false);
        expect(result.trigger).not.toBe('victory_condition');
        expect(result.outcome).toBeNull();
    });

    it('historical mode still fires the conquest victory', () => {
        const state = minimalWarState({ decision_mode: 'historical' });
        state.meta.victory_conditions = {
            by_faction: { RS: { min_controlled_settlements: 2, max_exhaustion: 50 } },
        };
        const result = checkWarTermination(state);
        expect(result.game_over).toBe(true);
        expect(result.trigger).toBe('victory_condition');
        expect(result.winner).toBe('RS');
        expect(result.outcome).toBe('victory:RS');
    });

    it('unset mode (default) still fires the conquest victory (migration safety)', () => {
        const state = minimalWarState(); // no decision_mode
        state.meta.victory_conditions = {
            by_faction: { RS: { min_controlled_settlements: 2, max_exhaustion: 50 } },
        };
        const result = checkWarTermination(state);
        expect(result.game_over).toBe(true);
        expect(result.trigger).toBe('victory_condition');
        expect(result.winner).toBe('RS');
    });

    it('emergent mode still ends on turn limit (other termination paths intact)', () => {
        const state = minimalWarState({ decision_mode: 'emergent', turn: 208, max_turns: 208 });
        const result = checkWarTermination(state);
        expect(result.game_over).toBe(true);
        expect(result.trigger).toBe('turn_limit');
        expect(result.outcome).toBe('timeout_stalemate');
    });
});
