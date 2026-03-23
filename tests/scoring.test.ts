import { describe, it, expect } from 'vitest';
import {
    computePyrrhicScore,
    computeFactionGrade,
    computeDimensionGrades,
    computeFactionVerdict,
    computeFullVerdict,
} from '../src/sim/negotiation/scoring.js';
import {
    createEmptyCapital,
    createDefaultPatronRelationship,
} from '../src/state/negotiation_types.js';
import type { NegotiationBreakdown } from '../src/state/negotiation_types.js';
import type { GameState } from '../src/state/game_state.js';
import { initializeStrategicDimensions, DIMENSION_WEIGHTS } from '../src/sim/events/strategic_dimensions.js';
import type { DimensionStore } from '../src/sim/events/strategic_dimensions.js';

function makeBreakdown(overrides: Partial<NegotiationBreakdown> = {}): NegotiationBreakdown {
    return { ...createEmptyCapital(), ...overrides };
}

function makeDimStore(perFaction: Record<string, number> = {}): DimensionStore {
    const store = initializeStrategicDimensions();
    for (const faction of ['RBiH', 'RS', 'HRHB']) {
        const v = perFaction[faction] ?? 50;
        for (const dim of Object.keys(store[faction])) {
            store[faction][dim] = { base_value: v, event_modifier: 0, effective_value: v };
        }
    }
    return store;
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

function makeStateWithCapital(factionBreakdowns: Record<string, Partial<NegotiationBreakdown>>, dimStore?: DimensionStore): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, any> = {};
    for (const fid of ['RBiH', 'RS', 'HRHB']) {
        capital[fid] = makeBreakdown(factionBreakdowns[fid] ?? {});
        patron_relationships[fid] = createDefaultPatronRelationship(fid);
    }
    return makeState({
        military: {
            formations: {},
            negotiation: {
                capital,
                patron_relationships,
                peace_plan_history: [],
                strategic_dimensions: dimStore ?? initializeStrategicDimensions(),
            },
        } as any,
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// Pyrrhic Score (now uses DIMENSION_WEIGHTS via strategic_dimensions)
// ═══════════════════════════════════════════════════════════════════════════

describe('computePyrrhicScore', () => {
    it('returns 50 when no dimension store provided', () => {
        const bd = makeBreakdown();
        const score = computePyrrhicScore(bd, 'RBiH');
        expect(score).toBe(50);
    });

    it('computes weighted sum from strategic dimensions', () => {
        const bd = makeBreakdown();
        const store = makeDimStore({ RBiH: 70 });
        const score = computePyrrhicScore(bd, 'RBiH', store);
        // All dimensions at 70, weights sum to 1.0 => 70
        expect(score).toBeCloseTo(70, 1);
    });

    it('uses faction-specific DIMENSION_WEIGHTS', () => {
        const bd = makeBreakdown();
        // RS has different weights than RBiH — same dimension values should produce same score
        // since all dimensions are uniform
        const store = makeDimStore({ RS: 60, RBiH: 60 });
        const rsScore = computePyrrhicScore(bd, 'RS', store);
        const rbihScore = computePyrrhicScore(bd, 'RBiH', store);
        // Both should be 60 since all dims are uniform
        expect(rsScore).toBeCloseTo(60, 1);
        expect(rbihScore).toBeCloseTo(60, 1);
    });

    it('clamps to 0-100', () => {
        const bd = makeBreakdown();
        const lowStore = makeDimStore({ RS: 0 });
        expect(computePyrrhicScore(bd, 'RS', lowStore)).toBeGreaterThanOrEqual(0);

        const highStore = makeDimStore({ RS: 100 });
        expect(computePyrrhicScore(bd, 'RS', highStore)).toBeLessThanOrEqual(100);
    });

    it('returns 50 for unknown faction (no dimension store)', () => {
        const bd = makeBreakdown();
        expect(computePyrrhicScore(bd, 'UNKNOWN')).toBe(50);
    });

    it('is deterministic', () => {
        const bd = makeBreakdown();
        const store = makeDimStore({ HRHB: 55 });
        const score1 = computePyrrhicScore(bd, 'HRHB', store);
        const score2 = computePyrrhicScore(bd, 'HRHB', store);
        expect(score1).toBe(score2);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Faction Grade (uses raw breakdown fields: territory_controlled_pct, enclaves, war_crimes)
// ═══════════════════════════════════════════════════════════════════════════

describe('computeFactionGrade', () => {
    describe('RBiH grades', () => {
        it('A+ for high territory + enclaves held + no war crimes', () => {
            const bd = makeBreakdown({
                territory_controlled_pct: 35,
                war_crimes_events: 0,
                enclaves_held: ['sarajevo', 'srebrenica', 'zepa', 'gorazde', 'bihac'],
                enclaves_lost: [],
            });
            const state = makeState();
            const result = computeFactionGrade(bd, 'RBiH', state);
            expect(result.grade).toBe('A+');
        });

        it('A for ~30% territory + Sarajevo held', () => {
            const bd = makeBreakdown({
                territory_controlled_pct: 31,
                enclaves_held: ['sarajevo', 'bihac'],
                enclaves_lost: ['srebrenica'],
            });
            const state = makeState();
            const result = computeFactionGrade(bd, 'RBiH', state);
            expect(result.grade).toBe('A');
        });

        it('F for very low territory', () => {
            const bd = makeBreakdown({
                territory_controlled_pct: 5,
                enclaves_lost: ['sarajevo', 'srebrenica', 'zepa', 'gorazde', 'bihac'],
            });
            const state = makeState();
            const result = computeFactionGrade(bd, 'RBiH', state);
            expect(result.grade).toBe('F');
        });

        it('D when Sarajevo lost but some territory remains', () => {
            const bd = makeBreakdown({
                territory_controlled_pct: 15,
                enclaves_lost: ['sarajevo', 'srebrenica', 'zepa', 'gorazde'],
                enclaves_held: ['bihac'],
            });
            const state = makeState();
            const result = computeFactionGrade(bd, 'RBiH', state);
            expect(result.grade).toBe('D');
        });
    });

    describe('RS grades', () => {
        it('A+ for >55% territory + few war crimes', () => {
            const bd = makeBreakdown({
                territory_controlled_pct: 58,
                war_crimes_events: 1,
            });
            const state = makeState();
            const result = computeFactionGrade(bd, 'RS', state);
            expect(result.grade).toBe('A+');
        });

        it('A for 49% territory', () => {
            const bd = makeBreakdown({
                territory_controlled_pct: 50,
            });
            const state = makeState();
            const result = computeFactionGrade(bd, 'RS', state);
            expect(result.grade).toBe('A');
        });

        it('F for <30% territory', () => {
            const bd = makeBreakdown({ territory_controlled_pct: 25 });
            const state = makeState();
            const result = computeFactionGrade(bd, 'RS', state);
            expect(result.grade).toBe('F');
        });
    });

    describe('HRHB grades', () => {
        it('A+ for >20% territory', () => {
            const bd = makeBreakdown({
                territory_controlled_pct: 22,
            });
            const state = makeState();
            const result = computeFactionGrade(bd, 'HRHB', state);
            expect(result.grade).toBe('A+');
        });

        it('F for very low territory', () => {
            const bd = makeBreakdown({ territory_controlled_pct: 2 });
            const state = makeState();
            const result = computeFactionGrade(bd, 'HRHB', state);
            expect(result.grade).toBe('F');
        });
    });

    it('returns F for unknown faction', () => {
        const bd = makeBreakdown({ territory_controlled_pct: 50 });
        const state = makeState();
        const result = computeFactionGrade(bd, 'UNKNOWN', state);
        expect(result.grade).toBe('F');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Dimension Grades (now 6 strategic dimensions)
// ═══════════════════════════════════════════════════════════════════════════

describe('computeDimensionGrades', () => {
    it('returns 6 strategic dimensions', () => {
        const bd = makeBreakdown();
        const grades = computeDimensionGrades(bd);
        expect(grades).toHaveLength(6);
    });

    it('grades each dimension from dimension store', () => {
        const bd = makeBreakdown();
        const store = initializeStrategicDimensions();
        store.RS.military_credibility = { base_value: 95, event_modifier: 0, effective_value: 95 };
        store.RS.territorial_legitimacy = { base_value: 70, event_modifier: 0, effective_value: 70 };
        store.RS.international_standing = { base_value: 45, event_modifier: 0, effective_value: 45 };
        store.RS.patron_confidence = { base_value: 25, event_modifier: 0, effective_value: 25 };
        store.RS.internal_cohesion = { base_value: 10, event_modifier: 0, effective_value: 10 };
        store.RS.negotiating_leverage = { base_value: 50, event_modifier: 0, effective_value: 50 };

        const grades = computeDimensionGrades(bd, 'RS', store);
        const gradeMap = Object.fromEntries(grades.map(g => [g.dimension, g.grade]));

        expect(gradeMap.military_credibility).toBe('A+');
        expect(gradeMap.territorial_legitimacy).toBe('B');
        expect(gradeMap.international_standing).toBe('C');
        expect(gradeMap.patron_confidence).toBe('D');
        expect(gradeMap.internal_cohesion).toBe('F');
        expect(gradeMap.negotiating_leverage).toBe('C');
    });

    it('includes human-readable labels', () => {
        const bd = makeBreakdown();
        const grades = computeDimensionGrades(bd);
        for (const g of grades) {
            expect(g.label).toBeTruthy();
            expect(g.label).not.toContain('_'); // underscores replaced
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Full Verdict
// ═══════════════════════════════════════════════════════════════════════════

describe('computeFullVerdict', () => {
    it('produces valid structure with all 3 factions', () => {
        const state = makeStateWithCapital({
            RBiH: { territory_controlled_pct: 30 },
            RS: { territory_controlled_pct: 52 },
            HRHB: { territory_controlled_pct: 18 },
        });

        const verdict = computeFullVerdict(state);

        expect(verdict.turn).toBe(40);
        expect(verdict.date).toBe('1993-01-15');
        expect(verdict.duration_weeks).toBe(40);
        expect(verdict.outcome_type).toBeDefined();
        expect(verdict.outcome_label).toBeDefined();

        expect(verdict.faction_verdicts.RBiH).toBeDefined();
        expect(verdict.faction_verdicts.RS).toBeDefined();
        expect(verdict.faction_verdicts.HRHB).toBeDefined();

        for (const fid of ['RBiH', 'RS', 'HRHB']) {
            const fv = verdict.faction_verdicts[fid];
            expect(fv.faction).toBe(fid);
            expect(fv.pyrrhic_score).toBeGreaterThanOrEqual(0);
            expect(fv.pyrrhic_score).toBeLessThanOrEqual(100);
            expect(['A+', 'A', 'B', 'C', 'D', 'F']).toContain(fv.grade);
            expect(fv.grade_description).toBeTruthy();
            expect(fv.dimension_grades).toHaveLength(6);
        }
    });

    it('detects dayton outcome type', () => {
        const state = makeStateWithCapital({
            RBiH: { territory_controlled_pct: 30 },
            RS: { territory_controlled_pct: 49 },
            HRHB: { territory_controlled_pct: 21 },
        });
        (state.military as any).negotiation.dayton_result = {
            territorial_packages_accepted: ['gorazde_corridor'],
            territorial_packages_rejected: [],
            institutional_choices: {},
            final_territory_split: { RBiH: 30, RS: 49, HRHB: 21 },
            patron_overrides_applied: [],
        };

        const verdict = computeFullVerdict(state);
        expect(verdict.outcome_type).toBe('dayton');
        expect(verdict.outcome_label).toBe('Dayton Agreement');
        expect(verdict.dayton_result).toBeDefined();
    });

    it('handles state without negotiation data gracefully', () => {
        const state = makeState();
        const verdict = computeFullVerdict(state);

        expect(verdict.faction_verdicts.RBiH).toBeDefined();
        expect(verdict.faction_verdicts.RBiH.grade).toBe('F');
        expect(verdict.faction_verdicts.RBiH.pyrrhic_score).toBe(0);
    });

    it('is deterministic', () => {
        const state = makeStateWithCapital({
            RBiH: { territory_controlled_pct: 30 },
            RS: { territory_controlled_pct: 52 },
            HRHB: { territory_controlled_pct: 18 },
        });

        const v1 = computeFullVerdict(state);
        const v2 = computeFullVerdict(state);

        expect(v1.faction_verdicts.RBiH.pyrrhic_score).toBe(v2.faction_verdicts.RBiH.pyrrhic_score);
        expect(v1.faction_verdicts.RS.grade).toBe(v2.faction_verdicts.RS.grade);
        expect(v1.faction_verdicts.HRHB.pyrrhic_score).toBe(v2.faction_verdicts.HRHB.pyrrhic_score);
    });
});

describe('computeFactionVerdict', () => {
    it('returns correct pyrrhic score from dimension store', () => {
        const store = makeDimStore({ RS: 65 });
        const state = makeStateWithCapital({
            RS: { territory_controlled_pct: 52 },
        }, store);

        const verdict = computeFactionVerdict(state, 'RS');
        expect(verdict.faction).toBe('RS');
        // All dims at 65, weights sum to 1 => pyrrhic score ~65
        expect(verdict.pyrrhic_score).toBeCloseTo(65, 1);
    });
});
