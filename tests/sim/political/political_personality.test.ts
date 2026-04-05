/**
 * Tests for v0.8.2 Phase 1 — Political Personality Framework.
 *
 * Covers:
 * 1. Personality profiles — all 3 factions present, RS archetype, unknown faction error
 * 2. Dimension weights validation — each faction's weights sum to 1.0 (±0.001)
 * 3. Historian-verified parameters — war_crimes_tolerance bounds per ICTY verdicts
 * 4. computeSituationWeight — early/late/mid-game interpolation
 * 5. computePoliticalAssessment — determinism, field presence, numeric bounds
 * 6. Faction differentiation — RS vs RBiH score ordering, territory_trend fallback
 * 7. Presidential play guard — function does NOT mutate frozen GameState
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import { describe, it, expect } from 'vitest';
import type { FactionId, GameState } from '../../../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../../../src/state/game_state.js';
import {
    POLITICAL_PERSONALITIES,
    getPoliticalPersonality,
    computeSituationWeight,
    computePoliticalAssessment,
} from '../../../src/sim/political/political_personality.js';

// ═══════════════════════════════════════════════════════════════════════════
// Fixture helpers — minimal GameState for political assessment tests
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Minimal GameState sufficient for computePoliticalAssessment fallback paths.
 * All optional political/negotiation fields absent — safe-fallback paths fire.
 */
function makeMinimalPoliticalState(turnOverride = 0): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: turnOverride,
            seed: 'political-personality-test',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10,
        },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
            },
            {
                id: 'RS',
                profile: { authority: 70, legitimacy: 60, control: 70, logistics: 60, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
            },
            {
                id: 'HRHB',
                profile: { authority: 40, legitimacy: 40, control: 40, logistics: 40, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
            },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            war_exhaustion: {},
            negotiation: {
                capital: {},
                patron_relationships: {},
                peace_plan_history: [],
            },
        } as any,
        political: {
            political_controllers: {},
        } as any,
        displacement: {} as any,
        turn_summaries: [],
    };
}

/**
 * Slightly richer state with RS holding more territory and better military strength
 * for faction-differentiation tests.
 */
function makeRichRSState(): GameState {
    const base = makeMinimalPoliticalState(20);
    // Simulate RS controlling ~65% of area by populating political_controllers
    // and giving RS a strong military posture via profile.
    base.factions = base.factions.map(f => {
        if (f.id === 'RS') {
            return {
                ...f,
                profile: { authority: 85, legitimacy: 75, control: 85, logistics: 75, exhaustion: 50 },
            };
        }
        if (f.id === 'RBiH') {
            return {
                ...f,
                profile: { authority: 30, legitimacy: 50, control: 30, logistics: 30, exhaustion: 200 },
            };
        }
        return f;
    });
    // Set war_exhaustion on political state so computePoliticalAssessment reads
    // different exhaustion levels: RS low, RBiH high (clamped to 100 internally).
    (base.political as any).war_exhaustion = { RS: 10, RBiH: 80 };
    return base;
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 1: Personality profiles
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 1: Personality profiles', () => {
    it('1. All 3 factions have entries in POLITICAL_PERSONALITIES', () => {
        expect(POLITICAL_PERSONALITIES).toBeDefined();
        const factions: FactionId[] = ['RS', 'RBiH', 'HRHB'];
        for (const faction of factions) {
            expect(
                POLITICAL_PERSONALITIES[faction],
                `Expected POLITICAL_PERSONALITIES to contain entry for ${faction}`
            ).toBeDefined();
        }
    });

    it('2. getPoliticalPersonality("RS") returns entry matching RS archetype', () => {
        const personality = getPoliticalPersonality('RS');
        expect(personality).toBeDefined();
        expect(personality.faction).toBe('RS');
        // RS archetype: maximalist territorial, high war_crimes_tolerance, high military reliance
        expect(personality.war_crimes_tolerance).toBeGreaterThanOrEqual(0.65);
        // Must have dimension_weights (the negotiation capital scoring axes)
        expect(personality.dimension_weights).toBeDefined();
        expect(typeof personality.dimension_weights).toBe('object');
    });

    it('3. getPoliticalPersonality with unknown faction throws an error', () => {
        expect(() => {
            getPoliticalPersonality('unknown_faction' as FactionId);
        }).toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 2: Dimension weights validation
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 2: Dimension weights sum to 1.0', () => {
    const TOLERANCE = 0.001;

    function sumWeights(faction: FactionId): number {
        const personality = getPoliticalPersonality(faction);
        const weights = Object.values(personality.dimension_weights) as number[];
        return weights.reduce((acc, w) => acc + w, 0);
    }

    it('4. RS dimension_weights sum to 1.0 (±0.001)', () => {
        expect(sumWeights('RS')).toBeCloseTo(1.0, 3);
        const sum = sumWeights('RS');
        expect(Math.abs(sum - 1.0)).toBeLessThanOrEqual(TOLERANCE);
    });

    it('5. RBiH dimension_weights sum to 1.0 (±0.001)', () => {
        const sum = sumWeights('RBiH');
        expect(Math.abs(sum - 1.0)).toBeLessThanOrEqual(TOLERANCE);
    });

    it('6. HRHB dimension_weights sum to 1.0 (±0.001)', () => {
        const sum = sumWeights('HRHB');
        expect(Math.abs(sum - 1.0)).toBeLessThanOrEqual(TOLERANCE);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 3: Historian-verified parameters (ICTY verdicts + Prlic/Kordic)
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 3: Historian-verified parameters', () => {
    it('7. RS war_crimes_tolerance >= 0.65 (ICTY-verified: four JCEs, Directive 7)', () => {
        const rs = getPoliticalPersonality('RS');
        expect(rs.war_crimes_tolerance).toBeGreaterThanOrEqual(0.65);
    });

    it('8. RBiH war_crimes_tolerance <= 0.15 (ICTY-verified: no leadership JCE)', () => {
        const rbih = getPoliticalPersonality('RBiH');
        expect(rbih.war_crimes_tolerance).toBeLessThanOrEqual(0.15);
    });

    it('9. HRHB war_crimes_tolerance >= 0.50 (Historian correction: Prlic/Kordic → raised to 0.55)', () => {
        const hrhb = getPoliticalPersonality('HRHB');
        expect(hrhb.war_crimes_tolerance).toBeGreaterThanOrEqual(0.50);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 4: computeSituationWeight
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 4: computeSituationWeight', () => {
    const rsPersonality = getPoliticalPersonality('RS');

    it('10. At warWeek=0 returns early weight (0.7)', () => {
        const weight = computeSituationWeight(0, rsPersonality);
        expect(weight).toBeCloseTo(0.7, 5);
    });

    it('11. At warWeek >= 120 returns late weight (0.4)', () => {
        const weight = computeSituationWeight(120, rsPersonality);
        expect(weight).toBeCloseTo(0.4, 5);
        // Also check well past the late boundary
        const weightFar = computeSituationWeight(200, rsPersonality);
        expect(weightFar).toBeCloseTo(0.4, 5);
    });

    it('12. At warWeek=60 returns value strictly between 0.4 and 0.7 (linear interpolation)', () => {
        const weight = computeSituationWeight(60, rsPersonality);
        expect(weight).toBeGreaterThan(0.4);
        expect(weight).toBeLessThan(0.7);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 5: computePoliticalAssessment — determinism and bounds
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 5: computePoliticalAssessment — determinism and bounds', () => {
    it('13. Returns all required fields', () => {
        const state = makeMinimalPoliticalState();
        const personality = getPoliticalPersonality('RS');
        const result = computePoliticalAssessment(state, 'RS', personality);

        expect(result).toHaveProperty('situation_score');
        expect(result).toHaveProperty('dimension_score');
        expect(result).toHaveProperty('blended_score');
        expect(result).toHaveProperty('territory_trend');
        expect(result).toHaveProperty('military_strength');
        expect(result).toHaveProperty('patron_pressure');
        expect(result).toHaveProperty('exhaustion_level');
    });

    it('14. All numeric fields are within expected bounds', () => {
        const state = makeMinimalPoliticalState();
        const personality = getPoliticalPersonality('RBiH');
        const result = computePoliticalAssessment(state, 'RBiH', personality);

        // Scores: [0, 100]
        expect(result.situation_score).toBeGreaterThanOrEqual(0);
        expect(result.situation_score).toBeLessThanOrEqual(100);

        expect(result.dimension_score).toBeGreaterThanOrEqual(0);
        expect(result.dimension_score).toBeLessThanOrEqual(100);

        expect(result.blended_score).toBeGreaterThanOrEqual(0);
        expect(result.blended_score).toBeLessThanOrEqual(100);

        // military_strength: [0, 1]
        expect(result.military_strength).toBeGreaterThanOrEqual(0);
        expect(result.military_strength).toBeLessThanOrEqual(1);

        // patron_pressure: [0, 100]
        expect(result.patron_pressure).toBeGreaterThanOrEqual(0);
        expect(result.patron_pressure).toBeLessThanOrEqual(100);

        // exhaustion_level: [0, 100]
        expect(result.exhaustion_level).toBeGreaterThanOrEqual(0);
        expect(result.exhaustion_level).toBeLessThanOrEqual(100);
    });

    it('15. Same inputs produce identical output (determinism)', () => {
        const state = makeMinimalPoliticalState(10);
        const personality = getPoliticalPersonality('HRHB');

        const result1 = computePoliticalAssessment(state, 'HRHB', personality);
        const result2 = computePoliticalAssessment(state, 'HRHB', personality);

        expect(result1.situation_score).toBe(result2.situation_score);
        expect(result1.dimension_score).toBe(result2.dimension_score);
        expect(result1.blended_score).toBe(result2.blended_score);
        expect(result1.territory_trend).toBe(result2.territory_trend);
        expect(result1.military_strength).toBe(result2.military_strength);
        expect(result1.patron_pressure).toBe(result2.patron_pressure);
        expect(result1.exhaustion_level).toBe(result2.exhaustion_level);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 6: computePoliticalAssessment — faction differentiation
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 6: computePoliticalAssessment — faction differentiation', () => {
    it('16. RS personality + high military profile yields higher situation_score than RBiH under same state', () => {
        const state = makeRichRSState();
        const rsPersonality = getPoliticalPersonality('RS');
        const rbihPersonality = getPoliticalPersonality('RBiH');

        const rsResult = computePoliticalAssessment(state, 'RS', rsPersonality);
        const rbihResult = computePoliticalAssessment(state, 'RBiH', rbihPersonality);

        expect(rsResult.situation_score).toBeGreaterThan(rbihResult.situation_score);
    });

    it('17. RBiH territory_trend = "stable" when turn_summaries is empty (safe fallback)', () => {
        const state = makeMinimalPoliticalState();
        state.turn_summaries = [];
        const personality = getPoliticalPersonality('RBiH');

        const result = computePoliticalAssessment(state, 'RBiH', personality);

        // With no turn summaries there is no trend data — must fall back to 'stable'
        expect(result.territory_trend).toBe('stable');
    });

    it('18. Empty/minimal GameState does not throw — all fallbacks fire safely', () => {
        // Absolute minimum: only required fields, no optional political/military state
        const bareState: GameState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: {
                turn: 0,
                seed: 'bare',
                phase: 'war',
                referendum_held: false,
                referendum_turn: null as any,
                war_start_turn: null as any,
            },
            factions: [],
            military: {
                formations: {},
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
            } as any,
            political: {
                political_controllers: {},
            } as any,
            displacement: {} as any,
        };

        const personality = getPoliticalPersonality('RS');

        expect(() => {
            computePoliticalAssessment(bareState, 'RS', personality);
        }).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 7: Presidential play guard — no GameState mutation
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 7: Presidential play guard — no mutation', () => {
    it('19. computePoliticalAssessment does NOT mutate a frozen GameState', () => {
        const state = makeMinimalPoliticalState(5);

        // Deep-freeze state to catch any writes at runtime
        const frozenState = deepFreeze(state) as GameState;
        const personality = getPoliticalPersonality('HRHB');

        // Must not throw a TypeError from writing to a frozen object
        expect(() => {
            computePoliticalAssessment(frozenState, 'HRHB', personality);
        }).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Bonus Group 8: Personality interface shape completeness
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 8: Personality interface shape completeness', () => {
    it('20. All 3 faction personalities have the expected top-level fields', () => {
        const requiredFields = [
            'faction',
            'war_crimes_tolerance',
            'dimension_weights',
        ];

        for (const faction of ['RS', 'RBiH', 'HRHB'] as FactionId[]) {
            const p = getPoliticalPersonality(faction);
            for (const field of requiredFields) {
                expect(p, `${faction} personality missing field: ${field}`).toHaveProperty(field);
            }
        }
    });

    it('21. war_crimes_tolerance is a number in [0, 1] for all factions', () => {
        for (const faction of ['RS', 'RBiH', 'HRHB'] as FactionId[]) {
            const p = getPoliticalPersonality(faction);
            expect(typeof p.war_crimes_tolerance).toBe('number');
            expect(p.war_crimes_tolerance).toBeGreaterThanOrEqual(0);
            expect(p.war_crimes_tolerance).toBeLessThanOrEqual(1);
        }
    });

    it('22. dimension_weights values are all non-negative numbers', () => {
        for (const faction of ['RS', 'RBiH', 'HRHB'] as FactionId[]) {
            const p = getPoliticalPersonality(faction);
            const weights = Object.values(p.dimension_weights) as number[];
            expect(weights.length).toBeGreaterThan(0);
            for (const w of weights) {
                expect(typeof w).toBe('number');
                expect(w).toBeGreaterThanOrEqual(0);
            }
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Utility: deep-freeze for mutation guard test
// ═══════════════════════════════════════════════════════════════════════════

function deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    Object.getOwnPropertyNames(obj).forEach(name => {
        const value = (obj as any)[name];
        if (value && typeof value === 'object') {
            deepFreeze(value);
        }
    });
    return Object.freeze(obj);
}
