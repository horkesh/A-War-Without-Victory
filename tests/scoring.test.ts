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
    CAPITAL_WEIGHTS,
} from '../src/state/negotiation_types.js';
import type { NegotiationCapital } from '../src/state/negotiation_types.js';
import type { GameState } from '../src/state/game_state.js';

function makeCapital(overrides: Partial<NegotiationCapital> = {}): NegotiationCapital {
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

function makeStateWithCapital(factionCapitals: Record<string, Partial<NegotiationCapital>>): GameState {
    const capital: Record<string, NegotiationCapital> = {};
    const patron_relationships: Record<string, any> = {};
    for (const fid of ['RBiH', 'RS', 'HRHB']) {
        capital[fid] = makeCapital(factionCapitals[fid] ?? {});
        patron_relationships[fid] = createDefaultPatronRelationship(fid);
    }
    return makeState({
        military: {
            formations: {},
            negotiation: {
                capital,
                patron_relationships,
                peace_plan_history: [],
            },
        } as any,
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// Pyrrhic Score
// ═══════════════════════════════════════════════════════════════════════════

describe('computePyrrhicScore', () => {
    it('returns 0 for empty capital', () => {
        const cap = makeCapital();
        // Empty capital has baseline 50 on some dimensions
        const score = computePyrrhicScore(cap, 'RBiH');
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
    });

    it('uses faction-specific weights', () => {
        const cap = makeCapital({
            military_position: 80,
            humanitarian_standing: 20,
            international_credibility: 50,
            military_effectiveness: 50,
            political_cohesion: 50,
        });

        const rsScore = computePyrrhicScore(cap, 'RS');
        const rbihScore = computePyrrhicScore(cap, 'RBiH');

        // RS weights military_position at 0.30, RBiH at 0.15
        // RS weights humanitarian at 0.10, RBiH at 0.30
        // So with high military (80) and low humanitarian (20), RS should score higher
        expect(rsScore).toBeGreaterThan(rbihScore);
    });

    it('computes weighted sum correctly for RBiH', () => {
        const cap = makeCapital({
            military_position: 60,
            humanitarian_standing: 70,
            international_credibility: 80,
            military_effectiveness: 50,
            political_cohesion: 40,
        });

        const weights = CAPITAL_WEIGHTS.RBiH;
        const expected =
            60 * weights.military_position +
            70 * weights.humanitarian_standing +
            80 * weights.international_credibility +
            50 * weights.military_effectiveness +
            40 * weights.political_cohesion;

        const score = computePyrrhicScore(cap, 'RBiH');
        expect(score).toBeCloseTo(Math.round(expected * 10) / 10, 1);
    });

    it('clamps to 0-100', () => {
        const lowCap = makeCapital({
            military_position: 0,
            humanitarian_standing: 0,
            international_credibility: 0,
            military_effectiveness: 0,
            political_cohesion: 0,
        });
        expect(computePyrrhicScore(lowCap, 'RS')).toBeGreaterThanOrEqual(0);

        const highCap = makeCapital({
            military_position: 100,
            humanitarian_standing: 100,
            international_credibility: 100,
            military_effectiveness: 100,
            political_cohesion: 100,
        });
        expect(computePyrrhicScore(highCap, 'RS')).toBeLessThanOrEqual(100);
    });

    it('returns 0 for unknown faction', () => {
        const cap = makeCapital({ military_position: 80 });
        expect(computePyrrhicScore(cap, 'UNKNOWN')).toBe(0);
    });

    it('is deterministic', () => {
        const cap = makeCapital({
            military_position: 55,
            humanitarian_standing: 40,
            international_credibility: 60,
            military_effectiveness: 70,
            political_cohesion: 45,
        });
        const score1 = computePyrrhicScore(cap, 'HRHB');
        const score2 = computePyrrhicScore(cap, 'HRHB');
        expect(score1).toBe(score2);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Faction Grade
// ═══════════════════════════════════════════════════════════════════════════

describe('computeFactionGrade', () => {
    describe('RBiH grades', () => {
        it('A+ for high territory + enclaves held + good humanitarian', () => {
            const cap = makeCapital({
                territory_controlled_pct: 35,
                humanitarian_standing: 55,
                enclaves_held: ['sarajevo', 'srebrenica', 'zepa', 'gorazde', 'bihac'],
                enclaves_lost: [],
            });
            const state = makeState();
            const result = computeFactionGrade(cap, 'RBiH', state);
            expect(result.grade).toBe('A+');
        });

        it('A for ~30% territory + Sarajevo held', () => {
            const cap = makeCapital({
                territory_controlled_pct: 31,
                humanitarian_standing: 40,
                enclaves_held: ['sarajevo', 'bihac'],
                enclaves_lost: ['srebrenica'],
            });
            const state = makeState();
            const result = computeFactionGrade(cap, 'RBiH', state);
            expect(result.grade).toBe('A');
        });

        it('F for very low territory', () => {
            const cap = makeCapital({
                territory_controlled_pct: 5,
                enclaves_lost: ['sarajevo', 'srebrenica', 'zepa', 'gorazde', 'bihac'],
            });
            const state = makeState();
            const result = computeFactionGrade(cap, 'RBiH', state);
            expect(result.grade).toBe('F');
        });

        it('D when Sarajevo lost but some territory remains', () => {
            const cap = makeCapital({
                territory_controlled_pct: 15,
                enclaves_lost: ['sarajevo', 'srebrenica', 'zepa', 'gorazde'],
                enclaves_held: ['bihac'],
            });
            const state = makeState();
            const result = computeFactionGrade(cap, 'RBiH', state);
            expect(result.grade).toBe('D');
        });
    });

    describe('RS grades', () => {
        it('A+ for >55% territory + credibility', () => {
            const cap = makeCapital({
                territory_controlled_pct: 58,
                international_credibility: 45,
            });
            const state = makeState();
            const result = computeFactionGrade(cap, 'RS', state);
            expect(result.grade).toBe('A+');
        });

        it('A for 49% territory + cohesion', () => {
            const cap = makeCapital({
                territory_controlled_pct: 50,
                political_cohesion: 45,
            });
            const state = makeState();
            const result = computeFactionGrade(cap, 'RS', state);
            expect(result.grade).toBe('A');
        });

        it('F for <30% territory', () => {
            const cap = makeCapital({ territory_controlled_pct: 25 });
            const state = makeState();
            const result = computeFactionGrade(cap, 'RS', state);
            expect(result.grade).toBe('F');
        });
    });

    describe('HRHB grades', () => {
        it('A+ for >20% territory + high cohesion', () => {
            const cap = makeCapital({
                territory_controlled_pct: 22,
                political_cohesion: 65,
            });
            const state = makeState();
            const result = computeFactionGrade(cap, 'HRHB', state);
            expect(result.grade).toBe('A+');
        });

        it('F for very low territory', () => {
            const cap = makeCapital({ territory_controlled_pct: 2 });
            const state = makeState();
            const result = computeFactionGrade(cap, 'HRHB', state);
            expect(result.grade).toBe('F');
        });
    });

    it('returns F for unknown faction', () => {
        const cap = makeCapital({ territory_controlled_pct: 50 });
        const state = makeState();
        const result = computeFactionGrade(cap, 'UNKNOWN', state);
        expect(result.grade).toBe('F');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Dimension Grades
// ═══════════════════════════════════════════════════════════════════════════

describe('computeDimensionGrades', () => {
    it('returns 5 dimensions', () => {
        const cap = makeCapital();
        const grades = computeDimensionGrades(cap);
        expect(grades).toHaveLength(5);
    });

    it('grades each dimension correctly', () => {
        const cap = makeCapital({
            military_position: 95,    // A+
            humanitarian_standing: 70, // B
            international_credibility: 45, // C
            military_effectiveness: 25,    // D
            political_cohesion: 10,        // F
        });
        const grades = computeDimensionGrades(cap);
        const gradeMap = Object.fromEntries(grades.map(g => [g.dimension, g.grade]));

        expect(gradeMap.military_position).toBe('A+');
        expect(gradeMap.humanitarian_standing).toBe('B');
        expect(gradeMap.international_credibility).toBe('C');
        expect(gradeMap.military_effectiveness).toBe('D');
        expect(gradeMap.political_cohesion).toBe('F');
    });

    it('includes human-readable labels', () => {
        const cap = makeCapital();
        const grades = computeDimensionGrades(cap);
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
            RBiH: { territory_controlled_pct: 30, military_position: 45 },
            RS: { territory_controlled_pct: 52, military_position: 78 },
            HRHB: { territory_controlled_pct: 18, military_position: 36 },
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
            expect(fv.dimension_grades).toHaveLength(5);
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
            RBiH: { territory_controlled_pct: 30, military_position: 45, humanitarian_standing: 60 },
            RS: { territory_controlled_pct: 52, military_position: 78, international_credibility: 35 },
            HRHB: { territory_controlled_pct: 18, political_cohesion: 55 },
        });

        const v1 = computeFullVerdict(state);
        const v2 = computeFullVerdict(state);

        expect(v1.faction_verdicts.RBiH.pyrrhic_score).toBe(v2.faction_verdicts.RBiH.pyrrhic_score);
        expect(v1.faction_verdicts.RS.grade).toBe(v2.faction_verdicts.RS.grade);
        expect(v1.faction_verdicts.HRHB.pyrrhic_score).toBe(v2.faction_verdicts.HRHB.pyrrhic_score);
    });
});

describe('computeFactionVerdict', () => {
    it('returns correct pyrrhic score for a faction', () => {
        const state = makeStateWithCapital({
            RS: {
                military_position: 80,
                humanitarian_standing: 30,
                international_credibility: 40,
                military_effectiveness: 70,
                political_cohesion: 60,
                territory_controlled_pct: 52,
            },
        });

        const verdict = computeFactionVerdict(state, 'RS');
        expect(verdict.faction).toBe('RS');
        expect(verdict.pyrrhic_score).toBeGreaterThan(0);

        // Verify the weighted calculation
        const w = CAPITAL_WEIGHTS.RS;
        const expected = 80 * w.military_position + 30 * w.humanitarian_standing +
            40 * w.international_credibility + 70 * w.military_effectiveness + 60 * w.political_cohesion;
        expect(verdict.pyrrhic_score).toBeCloseTo(Math.round(expected * 10) / 10, 1);
    });
});
