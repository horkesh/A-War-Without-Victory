/**
 * Consequence Substrate Ownership — proof tests.
 *
 * Verifies dead-wire fixes:
 * 1. Grade anchors for RS/HRHB read internal_cohesion dimension (not political_cohesion).
 * 2. internal_cohesion dimension computation uses canonical political war_exhaustion.
 * 3. Substrate owner boundaries: compute_capital produces breakdown,
 *    dimensions consume it, scoring consumes dimensions.
 *
 * Deterministic: no Math.random(), no timestamps.
 */

import { describe, it, expect } from 'vitest';
import {
    computeFactionGrade,
    computePyrrhicScore,
    computeDimensionGrades,
} from '../src/sim/negotiation/scoring.js';
import {
    initializeStrategicDimensions,
    computeDimensionBaseValues,
    getDimensionEffective,
} from '../src/sim/events/strategic_dimensions.js';
import type { DimensionStore } from '../src/sim/events/strategic_dimensions.js';
import {
    createEmptyCapital,
} from '../src/state/negotiation_types.js';
import type { NegotiationBreakdown } from '../src/state/negotiation_types.js';
import type { GameState } from '../src/state/game_state.js';

// ── Helpers ──────────────────────────────────────────────────────────────

function makeBreakdown(overrides: Partial<NegotiationBreakdown> = {}): NegotiationBreakdown {
    return { ...createEmptyCapital(), ...overrides };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
    return {
        meta: { turn: 40, phase: 'war', seed: 1, date: '1993-01-15', ...(overrides.meta ?? {}) },
        factions: overrides.factions ?? [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: overrides.military?.formations ?? {},
            ...(overrides.military ?? {}),
        },
        political: {
            political_controllers: {},
            ...(overrides.political ?? {}),
        },
        displacement: overrides.displacement ?? {},
        ...overrides,
    } as unknown as GameState;
}

function makeDimStore(perFaction: Record<string, Record<string, number>> = {}): DimensionStore {
    const store = initializeStrategicDimensions();
    for (const [faction, dims] of Object.entries(perFaction)) {
        for (const [dim, val] of Object.entries(dims)) {
            if (store[faction]?.[dim]) {
                store[faction][dim] = { base_value: val, event_modifier: 0, effective_value: val };
            }
        }
    }
    return store;
}

// ═════════════════════════════════════════════════════════════════════════
// Fix 1: Grade anchors read internal_cohesion dimension
// ═════════════════════════════════════════════════════════════════════════

describe('Grade anchors use internal_cohesion dimension', () => {
    describe('RS grade A requires internal_cohesion >= 30', () => {
        it('grants A when territory >= 49% and cohesion >= 30', () => {
            const dimStore = makeDimStore({ RS: { internal_cohesion: 50 } });
            const state = makeState({
                military: {
                    formations: {},
                    negotiation: { capital: {}, patron_relationships: {}, peace_plan_history: [], strategic_dimensions: dimStore },
                } as any,
            });
            const bd = makeBreakdown({ territory_controlled_pct: 50 });
            const result = computeFactionGrade(bd, 'RS', state);
            expect(result.grade).toBe('A');
        });

        it('denies A when territory >= 49% but cohesion < 30 (falls to B at >= 45%)', () => {
            const dimStore = makeDimStore({ RS: { internal_cohesion: 10 } });
            const state = makeState({
                military: {
                    formations: {},
                    negotiation: { capital: {}, patron_relationships: {}, peace_plan_history: [], strategic_dimensions: dimStore },
                } as any,
            });
            const bd = makeBreakdown({ territory_controlled_pct: 50 });
            const result = computeFactionGrade(bd, 'RS', state);
            // Should fall through to B (territory >= 45) since A cohesion check fails
            expect(result.grade).toBe('B');
        });
    });

    describe('HRHB grade A+ requires internal_cohesion >= 50', () => {
        it('grants A+ when territory > 20% and cohesion >= 50', () => {
            const dimStore = makeDimStore({ HRHB: { internal_cohesion: 60 } });
            const state = makeState({
                military: {
                    formations: {},
                    negotiation: { capital: {}, patron_relationships: {}, peace_plan_history: [], strategic_dimensions: dimStore },
                } as any,
            });
            const bd = makeBreakdown({ territory_controlled_pct: 22 });
            const result = computeFactionGrade(bd, 'HRHB', state);
            expect(result.grade).toBe('A+');
        });

        it('denies A+ when cohesion < 50 (falls to A at >= 15%)', () => {
            const dimStore = makeDimStore({ HRHB: { internal_cohesion: 30 } });
            const state = makeState({
                military: {
                    formations: {},
                    negotiation: { capital: {}, patron_relationships: {}, peace_plan_history: [], strategic_dimensions: dimStore },
                } as any,
            });
            const bd = makeBreakdown({ territory_controlled_pct: 22 });
            const result = computeFactionGrade(bd, 'HRHB', state);
            // Cohesion 30 < 50 for A+, falls to A (territory >= 15, but cohesion 30 < 40 for A)
            // Falls to B (territory >= 12, cohesion 30 >= 30)
            expect(result.grade).toBe('B');
        });
    });

    describe('HRHB grade A requires internal_cohesion >= 40', () => {
        it('grants A when territory >= 15% and cohesion >= 40', () => {
            const dimStore = makeDimStore({ HRHB: { internal_cohesion: 45 } });
            const state = makeState({
                military: {
                    formations: {},
                    negotiation: { capital: {}, patron_relationships: {}, peace_plan_history: [], strategic_dimensions: dimStore },
                } as any,
            });
            const bd = makeBreakdown({ territory_controlled_pct: 16 });
            const result = computeFactionGrade(bd, 'HRHB', state);
            expect(result.grade).toBe('A');
        });
    });

    describe('HRHB grade B requires internal_cohesion >= 30', () => {
        it('grants B when territory >= 12% and cohesion >= 30', () => {
            const dimStore = makeDimStore({ HRHB: { internal_cohesion: 35 } });
            const state = makeState({
                military: {
                    formations: {},
                    negotiation: { capital: {}, patron_relationships: {}, peace_plan_history: [], strategic_dimensions: dimStore },
                } as any,
            });
            const bd = makeBreakdown({ territory_controlled_pct: 13 });
            const result = computeFactionGrade(bd, 'HRHB', state);
            expect(result.grade).toBe('B');
        });

        it('denies B when cohesion < 30 (falls to C at >= 8%)', () => {
            const dimStore = makeDimStore({ HRHB: { internal_cohesion: 15 } });
            const state = makeState({
                military: {
                    formations: {},
                    negotiation: { capital: {}, patron_relationships: {}, peace_plan_history: [], strategic_dimensions: dimStore },
                } as any,
            });
            const bd = makeBreakdown({ territory_controlled_pct: 13 });
            const result = computeFactionGrade(bd, 'HRHB', state);
            expect(result.grade).toBe('C');
        });
    });

    it('RBiH grade anchors are unaffected (no cohesion gate)', () => {
        // RBiH anchors were never wired to political_cohesion — verify they still work
        const state = makeState();
        const bd = makeBreakdown({
            territory_controlled_pct: 31,
            enclaves_held: ['sarajevo', 'bihac'],
            enclaves_lost: ['srebrenica'],
        });
        const result = computeFactionGrade(bd, 'RBiH', state);
        expect(result.grade).toBe('A');
    });
});

// ═════════════════════════════════════════════════════════════════════════
// Fix 2: internal_cohesion uses canonical political war_exhaustion
// ═════════════════════════════════════════════════════════════════════════

describe('internal_cohesion dimension uses canonical political war_exhaustion', () => {
    it('zero exhaustion yields higher cohesion than high exhaustion', () => {
        const store1 = initializeStrategicDimensions();
        const store2 = initializeStrategicDimensions();

        const baseState = {
            military: {
                formations: {},
                negotiation: {
                    capital: { RS: createEmptyCapital() },
                    patron_relationships: {},
                },
            },
            political: { war_alliance_rbih_hrhb: 1 },
        };

        const stateNoExhaustion = { ...baseState, political: { ...baseState.political, war_exhaustion: { RS: 0, RBiH: 0, HRHB: 0 } } };
        const stateHighExhaustion = { ...baseState, political: { ...baseState.political, war_exhaustion: { RS: 300, RBiH: 300, HRHB: 300 } } };

        computeDimensionBaseValues(store1, stateNoExhaustion, 'RS');
        computeDimensionBaseValues(store2, stateHighExhaustion, 'RS');

        const cohesionLow = getDimensionEffective(store1, 'RS', 'internal_cohesion');
        const cohesionHigh = getDimensionEffective(store2, 'RS', 'internal_cohesion');

        expect(cohesionLow).toBeGreaterThan(cohesionHigh);
    });

    it('reads from political.war_exhaustion, not war_phase_exhaustion', () => {
        const store = initializeStrategicDimensions();

        // State has canonical political war_exhaustion but NOT war_phase_exhaustion (the dead field)
        const state = {
            military: {
                formations: {},
                negotiation: {
                    capital: { RBiH: createEmptyCapital() },
                    patron_relationships: {},
                },
            },
            political: { war_alliance_rbih_hrhb: 1, war_exhaustion: { RBiH: 150, RS: 0, HRHB: 0 } },
        };

        computeDimensionBaseValues(store, state, 'RBiH');
        const cohesion = getDimensionEffective(store, 'RBiH', 'internal_cohesion');

        // Post the 2026-05-22 100× war_exhaustion rescale the divisor is /300, so
        // exhaustion 150 subtracts 150/300 = 0.5 from the base.
        // Alliance val for RBiH = 1 * 40 = 40, avgCohesion = 50 (default), avgCohesion/2 = 25
        // Total = 40 + 25 - 0.5 = 64.5
        expect(cohesion).toBe(64.5);
    });

    it('ignores stale military.war_exhaustion shadow data', () => {
        const store = initializeStrategicDimensions();

        const state = {
            military: {
                formations: {},
                negotiation: {
                    capital: { RS: createEmptyCapital() },
                    patron_relationships: {},
                },
                war_exhaustion: { RS: 999 },
            },
            political: { war_alliance_rbih_hrhb: 1, war_exhaustion: { RS: 0 } },
        };

        computeDimensionBaseValues(store, state, 'RS');
        const cohesion = getDimensionEffective(store, 'RS', 'internal_cohesion');

        // Canonical political exhaustion is 0, so stale military shadow data must be ignored.
        expect(cohesion).toBe(45);
    });

    it('dead war_phase_exhaustion field has no effect', () => {
        const store = initializeStrategicDimensions();

        // State has ONLY the dead field (war_phase_exhaustion), not the real one
        const state = {
            military: {
                formations: {},
                negotiation: {
                    capital: { RS: createEmptyCapital() },
                    patron_relationships: {},
                },
                war_phase_exhaustion: { RS: 999 },
            },
            political: { war_alliance_rbih_hrhb: 1 },
        };

        computeDimensionBaseValues(store, state, 'RS');
        const cohesion = getDimensionEffective(store, 'RS', 'internal_cohesion');

        // The dead field should not be read, so exhaustion defaults to 0
        // Alliance val for RS = 20, avgCohesion = 50 (default), avgCohesion/2 = 25
        // Total = 20 + 25 - 0 = 45
        expect(cohesion).toBe(45);
    });
});

// ═════════════════════════════════════════════════════════════════════════
// Substrate ownership boundary: capital -> dimensions -> scoring
// ═════════════════════════════════════════════════════════════════════════

describe('Substrate owner boundaries', () => {
    it('compute_capital produces NegotiationBreakdown fields consumed by dimensions', () => {
        const store = initializeStrategicDimensions();
        const capital = makeBreakdown({
            territory_controlled_pct: 45,
            operations_launched: 10,
            operations_successful: 6,
            military_casualties_inflicted: 500,
            military_casualties_taken: 300,
            war_crimes_events: 1,
            civilian_casualties_caused: 200,
            peace_plans_accepted: ['vance_owen'],
            peace_plans_rejected: [],
        });

        const state = {
            military: {
                formations: {},
                negotiation: {
                    capital: { RS: capital },
                    patron_relationships: { RS: { support_level: 70 } },
                },
            },
            political: { war_alliance_rbih_hrhb: 1, war_exhaustion: { RS: 50 } },
        };

        computeDimensionBaseValues(store, state, 'RS');

        // military_credibility uses ops success rate and casualty ratio from capital
        const milCred = getDimensionEffective(store, 'RS', 'military_credibility');
        expect(milCred).toBeGreaterThan(0);

        // territorial_legitimacy uses territory_controlled_pct from capital
        const terrLeg = getDimensionEffective(store, 'RS', 'territorial_legitimacy');
        expect(terrLeg).toBeGreaterThan(0);

        // international_standing uses war_crimes_events and civilian_casualties_caused from capital
        const intStand = getDimensionEffective(store, 'RS', 'international_standing');
        expect(intStand).toBeGreaterThan(0);

        // patron_confidence uses patron support_level
        const patConf = getDimensionEffective(store, 'RS', 'patron_confidence');
        expect(patConf).toBe(70);
    });

    it('scoring consumes dimension store to produce pyrrhic score', () => {
        const store = initializeStrategicDimensions();
        // Set all RS dimensions to 70
        for (const dim of Object.keys(store.RS)) {
            store.RS[dim] = { base_value: 70, event_modifier: 0, effective_value: 70 };
        }
        const bd = makeBreakdown();
        const score = computePyrrhicScore(bd, 'RS', store);
        expect(score).toBeCloseTo(70, 1);
    });

    it('scoring consumes dimension store to produce dimension grades', () => {
        const store = initializeStrategicDimensions();
        store.RBiH.internal_cohesion = { base_value: 80, event_modifier: 0, effective_value: 80 };
        store.RBiH.military_credibility = { base_value: 20, event_modifier: 0, effective_value: 20 };

        const bd = makeBreakdown();
        const grades = computeDimensionGrades(bd, 'RBiH', store);
        const gradeMap = Object.fromEntries(grades.map(g => [g.dimension, g.grade]));

        expect(gradeMap.internal_cohesion).toBe('A');
        expect(gradeMap.military_credibility).toBe('D');
    });
});
