/**
 * Tests for v0.8.2 Phase 3 — survivalScore component in scorePoliticalOption
 *
 * survivalScore fires only for survival_internationalist archetype (RBiH)
 * when situation_score < 50, and only for options with aggression_affinity > 0.
 *
 * Formula:
 *   defianceIntensity = (personality.archetype === 'survival_internationalist' && situation_score < 50)
 *                       ? Math.max(0, (50 - situation_score) / 50) : 0
 *   survivalScore = (option.aggression_affinity ?? 0) > 0
 *                   ? defianceIntensity * intStandingWeight * 0.40 : 0
 *
 * For RBiH: intStandingWeight = 0.30.
 * At situation_score = 0: defianceIntensity = 1.0 → survivalScore = 1.0 * 0.30 * 0.40 = 0.12
 * At situation_score = 25: defianceIntensity = 0.5 → survivalScore = 0.5 * 0.30 * 0.40 = 0.06
 * At situation_score = 50: defianceIntensity = 0 → survivalScore = 0
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import { describe, it, expect } from 'vitest';
import { scorePoliticalOption } from '../../../src/sim/political/political_event_decision.js';
import { getPoliticalPersonality } from '../../../src/sim/political/political_personality.js';
import type { PoliticalAssessment } from '../../../src/sim/political/political_personality.js';
import type { EventResponseOption } from '../../../src/sim/events/event_types.js';

// ═══════════════════════════════════════════════════════════════════════════
// Fixture helpers
// ═══════════════════════════════════════════════════════════════════════════

function makeAssessment(overrides: Partial<PoliticalAssessment> = {}): PoliticalAssessment {
    return {
        situation_score: 50,
        dimension_score: 50,
        blended_score: 50,
        territory_trend: 'stable',
        military_strength: 0.5,
        patron_pressure: 0,
        exhaustion_level: 0,
        ...overrides,
    };
}

/**
 * Option designed to isolate survivalScore:
 * - risk_level = personality.risk_tolerance → riskScore = 0
 * - no dimension_shifts → dimensionScore = 0
 * - blended_score = 50 → aggressionScore = 0
 * - patron_pressure = 0 → patronScore = 0
 * So total score = survivalScore only.
 *
 * For RBiH: risk_tolerance = 0.35 → use risk_level = 0.35
 * For RS: risk_tolerance = 0.65 → use risk_level = 0.65
 * For HRHB: risk_tolerance = 0.50 → use risk_level = 0.50
 */
function makeIsolatingOption(faction: 'RBiH' | 'RS' | 'HRHB', aggression: number): EventResponseOption {
    const riskByFaction = { RBiH: 0.35, RS: 0.65, HRHB: 0.50 };
    return {
        id: 'test_option',
        label: 'Test Option',
        effects: [],
        aggression_affinity: aggression,
        risk_level: riskByFaction[faction],
        // no dimension_shifts
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 1: survivalScore = 0 for non-survival_internationalist archetypes
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 1: survivalScore = 0 for non-survival_internationalist archetypes', () => {
    it('1. RS (expansionist_nationalist) + situation_score = 20 + aggression_affinity = 1.0 → survivalScore = 0', () => {
        const personality = getPoliticalPersonality('RS');
        const assessment = makeAssessment({ situation_score: 20, blended_score: 50, patron_pressure: 0 });
        const option = makeIsolatingOption('RS', 1.0);

        // riskScore = 0 (risk_level=0.65=risk_tolerance), dimensionScore=0, aggressionScore=0 (blended=50), patronScore=0
        // survivalScore = 0 (RS is expansionist_nationalist, not survival_internationalist)
        const score = scorePoliticalOption(option, 'RS', assessment, personality);
        expect(score).toBeCloseTo(0.0, 5);
    });

    it('2. HRHB (opportunist_patron_dependent) + situation_score = 20 + aggression_affinity = 1.0 → survivalScore = 0', () => {
        const personality = getPoliticalPersonality('HRHB');
        const assessment = makeAssessment({ situation_score: 20, blended_score: 50, patron_pressure: 0 });
        const option = makeIsolatingOption('HRHB', 1.0);

        // riskScore = 0 (risk_level=0.50=risk_tolerance), survivalScore = 0 (wrong archetype)
        const score = scorePoliticalOption(option, 'HRHB', assessment, personality);
        expect(score).toBeCloseTo(0.0, 5);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 2: survivalScore = 0 when situation_score >= 50 for RBiH
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 2: survivalScore = 0 when situation_score >= 50', () => {
    it('3. RBiH + situation_score = 50 → defianceIntensity = 0 → survivalScore = 0', () => {
        const personality = getPoliticalPersonality('RBiH');
        const assessment = makeAssessment({ situation_score: 50, blended_score: 50, patron_pressure: 0 });
        const option = makeIsolatingOption('RBiH', 1.0);

        // defianceIntensity = max(0, (50-50)/50) = 0 → survivalScore = 0
        const score = scorePoliticalOption(option, 'RBiH', assessment, personality);
        expect(score).toBeCloseTo(0.0, 5);
    });

    it('4. RBiH + situation_score = 60 → survivalScore = 0 (above threshold)', () => {
        const personality = getPoliticalPersonality('RBiH');
        const assessment = makeAssessment({ situation_score: 60, blended_score: 50, patron_pressure: 0 });
        const option = makeIsolatingOption('RBiH', 1.0);

        const score = scorePoliticalOption(option, 'RBiH', assessment, personality);
        expect(score).toBeCloseTo(0.0, 5);
    });

    it('5. RBiH + situation_score = 100 → survivalScore = 0', () => {
        const personality = getPoliticalPersonality('RBiH');
        const assessment = makeAssessment({ situation_score: 100, blended_score: 50, patron_pressure: 0 });
        const option = makeIsolatingOption('RBiH', 1.0);

        const score = scorePoliticalOption(option, 'RBiH', assessment, personality);
        expect(score).toBeCloseTo(0.0, 5);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 3: survivalScore > 0 for RBiH when situation_score < 50 + aggression > 0
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 3: survivalScore fires for RBiH below threshold', () => {
    it('6. RBiH + situation_score = 0 + aggression = 1.0 → survivalScore = 1.0 * 0.30 * 0.40 = 0.12', () => {
        const personality = getPoliticalPersonality('RBiH');
        const assessment = makeAssessment({ situation_score: 0, blended_score: 50, patron_pressure: 0 });
        const option = makeIsolatingOption('RBiH', 1.0);

        // defianceIntensity = (50-0)/50 = 1.0
        // intStandingWeight = 0.30
        // survivalScore = 1.0 * 0.30 * 0.40 = 0.12
        const score = scorePoliticalOption(option, 'RBiH', assessment, personality);
        expect(score).toBeCloseTo(0.12, 5);
    });

    it('7. RBiH + situation_score = 25 + aggression = 1.0 → survivalScore = 0.5 * 0.30 * 0.40 = 0.06', () => {
        const personality = getPoliticalPersonality('RBiH');
        const assessment = makeAssessment({ situation_score: 25, blended_score: 50, patron_pressure: 0 });
        const option = makeIsolatingOption('RBiH', 1.0);

        // defianceIntensity = (50-25)/50 = 0.5
        // survivalScore = 0.5 * 0.30 * 0.40 = 0.06
        const score = scorePoliticalOption(option, 'RBiH', assessment, personality);
        expect(score).toBeCloseTo(0.06, 5);
    });

    it('8. RBiH + situation_score = 30 + aggression_affinity = -1.0 → survivalScore = 0 (conciliatory option excluded)', () => {
        const personality = getPoliticalPersonality('RBiH');
        const assessment = makeAssessment({ situation_score: 30, blended_score: 50, patron_pressure: 0 });
        const option = makeIsolatingOption('RBiH', -1.0);

        // aggression_affinity <= 0 → survivalScore = 0
        // riskScore = (0.35 - 0.35)*2 = 0, aggressionScore = 0 (blended=50), patronScore=0
        const score = scorePoliticalOption(option, 'RBiH', assessment, personality);
        expect(score).toBeCloseTo(0.0, 5);
    });

    it('9. RBiH + situation_score = 30 + aggression_affinity = 0 → survivalScore = 0 (zero aggression excluded)', () => {
        const personality = getPoliticalPersonality('RBiH');
        const assessment = makeAssessment({ situation_score: 30, blended_score: 50, patron_pressure: 0 });
        const option = makeIsolatingOption('RBiH', 0);

        // aggression_affinity = 0 → survivalScore = 0 (requires > 0)
        const score = scorePoliticalOption(option, 'RBiH', assessment, personality);
        expect(score).toBeCloseTo(0.0, 5);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 4: Smooth gradient and weight scaling
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 4: Smooth gradient and weight scaling', () => {
    it('10. survivalScore smooth gradient: situation_score=0 gives 2× the score of situation_score=25', () => {
        const personality = getPoliticalPersonality('RBiH');
        const option = makeIsolatingOption('RBiH', 1.0);

        const scoreAt0 = scorePoliticalOption(option, 'RBiH',
            makeAssessment({ situation_score: 0, blended_score: 50, patron_pressure: 0 }), personality);
        const scoreAt25 = scorePoliticalOption(option, 'RBiH',
            makeAssessment({ situation_score: 25, blended_score: 50, patron_pressure: 0 }), personality);

        // defianceIntensity at 0 = 1.0, at 25 = 0.5 → ratio is 2:1
        expect(scoreAt0).toBeCloseTo(2 * scoreAt25, 5);
    });

    it('11. survivalScore is monotonically decreasing as situation_score increases from 0 to 50', () => {
        const personality = getPoliticalPersonality('RBiH');
        const option = makeIsolatingOption('RBiH', 1.0);

        const scores = [0, 10, 20, 30, 40, 49].map(ss =>
            scorePoliticalOption(option, 'RBiH',
                makeAssessment({ situation_score: ss, blended_score: 50, patron_pressure: 0 }),
                personality)
        );

        for (let i = 1; i < scores.length; i++) {
            expect(scores[i]).toBeLessThan(scores[i - 1]);
        }
    });

    it('12. Higher international_standing weight → higher survivalScore (custom personality)', () => {
        // Compare RBiH real personality (intStandingWeight=0.30) vs a hypothetical with 0.60
        const realPersonality = getPoliticalPersonality('RBiH');
        const doubleWeightPersonality = {
            ...realPersonality,
            dimension_weights: {
                ...realPersonality.dimension_weights,
                international_standing: 0.60,
            },
        };

        const option = makeIsolatingOption('RBiH', 1.0);
        const assessment = makeAssessment({ situation_score: 20, blended_score: 50, patron_pressure: 0 });

        const realScore = scorePoliticalOption(option, 'RBiH', assessment, realPersonality);
        const doubleScore = scorePoliticalOption(option, 'RBiH', assessment, doubleWeightPersonality);

        // doubleWeightPersonality.international_standing = 0.60, so survivalScore = 2× real
        expect(doubleScore).toBeCloseTo(2 * realScore, 5);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 5: Full integration
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 5: Full integration', () => {
    it('13. RBiH personality + situation_score = 20 + aggression = 1.0 → total score HIGHER than situation_score = 60', () => {
        // Both use identical option and blended_score; only situation_score differs.
        // At situation_score=20: survivalScore = 0.40 * 0.30 * 0.40 = 0.048 > 0
        // At situation_score=60: survivalScore = 0
        // The option at 20 should score higher because survivalScore adds to it.
        const personality = getPoliticalPersonality('RBiH');
        const option: EventResponseOption = {
            id: 'defiant',
            label: 'Defiant',
            effects: [],
            aggression_affinity: 1.0,
            risk_level: 0.35, // neutralises riskScore for RBiH
        };

        const assessmentWeak = makeAssessment({ situation_score: 20, blended_score: 50, patron_pressure: 0 });
        const assessmentStrong = makeAssessment({ situation_score: 60, blended_score: 50, patron_pressure: 0 });

        const scoreWeak = scorePoliticalOption(option, 'RBiH', assessmentWeak, personality);
        const scoreStrong = scorePoliticalOption(option, 'RBiH', assessmentStrong, personality);

        expect(scoreWeak).toBeGreaterThan(scoreStrong);
    });

    it('14. survivalScore does not fire for non-aggression option even under extreme weakness', () => {
        const personality = getPoliticalPersonality('RBiH');
        const conciliatoryOption: EventResponseOption = {
            id: 'concede',
            label: 'Concede',
            effects: [],
            aggression_affinity: -1.0,
            risk_level: 0.35, // neutralises riskScore
        };

        // Extreme weakness: situation_score = 0
        const extremeAssessment = makeAssessment({ situation_score: 0, blended_score: 50, patron_pressure: 0 });
        const neutralAssessment = makeAssessment({ situation_score: 60, blended_score: 50, patron_pressure: 0 });

        const scoreExtreme = scorePoliticalOption(conciliatoryOption, 'RBiH', extremeAssessment, personality);
        const scoreNeutral = scorePoliticalOption(conciliatoryOption, 'RBiH', neutralAssessment, personality);

        // Both should be equal: survivalScore = 0 for negative aggression regardless of situation_score
        expect(scoreExtreme).toBeCloseTo(scoreNeutral, 5);
    });
});
