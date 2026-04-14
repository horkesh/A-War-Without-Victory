/**
 * Tests for v0.8.2 Phase 2 — Political Event Decision Engine.
 *
 * Covers:
 * 1. scorePoliticalOption — dimension score (4 tests)
 * 2. scorePoliticalOption — risk and aggression (4 tests)
 * 3. scorePoliticalOption — patron pressure (2 tests)
 * 4. pickPoliticalResponse — selection (4 tests)
 * 5. pickPoliticalResponse — determinism (2 tests)
 * 6. pickPoliticalResponse — faction archetypes on srebrenica scenario (3 tests)
 * 7. Fallback and contract (3 tests)
 *
 * Scoring formula (for reference):
 *   dimensionScore = sum(shift.delta * personality.dimension_weights[shift.dimension] ?? 0)
 *                    for shifts where shift.faction === respondingFaction
 *   riskScore      = (personality.risk_tolerance - (option.risk_level ?? 0.5)) * 2.0
 *   aggressionScore= (option.aggression_affinity ?? 0) * ((assessment.blended_score / 100) - 0.5) * 1.5
 *   patronScore    = (assessment.patron_pressure / 100) * personality.patron_sensitivity
 *                    * ((option.aggression_affinity ?? 0) < 0 ? 0.5 : -0.5)
 *   total          = dimensionScore + riskScore + aggressionScore + patronScore
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import { describe, it, expect } from 'vitest';
import { getPoliticalPersonality } from '../../../src/sim/political/political_personality.js';
import type { PoliticalAssessment } from '../../../src/sim/political/political_personality.js';
import { scorePoliticalOption, pickPoliticalResponse } from '../../../src/sim/political/political_event_decision.js';
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
        exhaustion_level: 20,
        negotiation_pressure: 0,
        ...overrides,
    };
}

/**
 * Minimal EventResponseOption with sensible defaults.
 * Effects are irrelevant to scoring — use empty array.
 */
function makeOption(overrides: Partial<EventResponseOption>): EventResponseOption {
    return {
        id: 'test_option',
        label: 'Test Option',
        effects: [],
        ...overrides,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 1: scorePoliticalOption — dimension score
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 1: scorePoliticalOption — dimension score', () => {
    it('1. RS territorial_legitimacy +15 shift: RS personality scores higher than RBiH personality', () => {
        // RS weight for territorial_legitimacy = 0.30 → dimensionScore = 15 * 0.30 = 4.5
        // RBiH weight for territorial_legitimacy = 0.15 → dimensionScore = 15 * 0.15 = 2.25
        // With identical neutral assessment (blended=50, patron=0), riskScore is equal,
        // aggressionScore = 0, patronScore = 0. Only dimensionScore differs.
        const option = makeOption({
            dimension_shifts: [
                { faction: 'RS', dimension: 'territorial_legitimacy', delta: 15 },
            ],
            risk_level: 0.5, // risk_tolerance=0.65 for RS, 0.35 for RBiH — set to neutral midpoint (0.5) so riskScores differ
        });

        const assessment = makeAssessment({ blended_score: 50, patron_pressure: 0 });
        const rsPersonality = getPoliticalPersonality('RS');
        const rbihPersonality = getPoliticalPersonality('RBiH');

        const rsScore = scorePoliticalOption(option, 'RS', assessment, rsPersonality);
        const rbihScore = scorePoliticalOption(option, 'RBiH', assessment, rbihPersonality);

        // RS dimension gain (4.5) > RBiH dimension gain (2.25) even after accounting for
        // difference in risk scores: RS riskScore=(0.65-0.5)*2=0.30, RBiH riskScore=(0.35-0.5)*2=-0.30
        expect(rsScore).toBeGreaterThan(rbihScore);
    });

    it('2. international_standing +10 shift: RBiH personality scores higher than RS personality', () => {
        // RBiH weight for international_standing = 0.30 → dimensionScore = 10 * 0.30 = 3.0
        // RS weight for international_standing = 0.10 → dimensionScore = 10 * 0.10 = 1.0
        // Use risk_level=0.5 to equalise riskScores, no aggression, no patron pressure.
        const option = makeOption({
            dimension_shifts: [
                { faction: 'RBiH', dimension: 'international_standing', delta: 10 },
            ],
            risk_level: 0.5,
        });

        const assessment = makeAssessment({ blended_score: 50, patron_pressure: 0 });
        const rsPersonality = getPoliticalPersonality('RS');
        const rbihPersonality = getPoliticalPersonality('RBiH');

        const rbihScore = scorePoliticalOption(option, 'RBiH', assessment, rbihPersonality);
        const rsScore = scorePoliticalOption(option, 'RS', assessment, rsPersonality);

        // RS evaluates as 'RS' respondingFaction — the shift is for 'RBiH', so RS gets 0.
        // RBiH evaluates as 'RBiH' respondingFaction — picks up the full 3.0.
        expect(rbihScore).toBeGreaterThan(rsScore);
    });

    it('3. Option with dimension_shifts for a different faction: shifts are ignored for responding faction', () => {
        // Shift is for RS, but responding faction is RBiH → dimensionScore contribution = 0
        const option = makeOption({
            dimension_shifts: [
                { faction: 'RS', dimension: 'territorial_legitimacy', delta: 50 },
            ],
            risk_level: 0.5, // neutral risk so riskScore = (0.35-0.5)*2 = -0.3 for RBiH
            // No aggression, no patron pressure
        });

        const assessment = makeAssessment({ blended_score: 50, patron_pressure: 0 });
        const rbihPersonality = getPoliticalPersonality('RBiH');

        const score = scorePoliticalOption(option, 'RBiH', assessment, rbihPersonality);

        // Only riskScore contributes: (0.35 - 0.5) * 2.0 = -0.30
        // aggressionScore = 0, patronScore = 0
        // Expected: -0.30
        expect(score).toBeCloseTo(-0.30, 5);
    });

    it('4. Option with no dimension_shifts: dimensionScore = 0', () => {
        // No shifts → dimensionScore = 0. Verify via two options: one with shifts, one without.
        const withShifts = makeOption({
            dimension_shifts: [
                { faction: 'RS', dimension: 'territorial_legitimacy', delta: 20 },
            ],
            risk_level: 0.5,
        });
        const withoutShifts = makeOption({
            // dimension_shifts absent
            risk_level: 0.5,
        });

        const assessment = makeAssessment({ blended_score: 50, patron_pressure: 0 });
        const rsPersonality = getPoliticalPersonality('RS');

        const scoreWithShifts = scorePoliticalOption(withShifts, 'RS', assessment, rsPersonality);
        const scoreWithout = scorePoliticalOption(withoutShifts, 'RS', assessment, rsPersonality);

        // scoreWithShifts = 20 * 0.30 + (0.65-0.5)*2 = 6.0 + 0.3 = 6.3
        // scoreWithout = 0 + (0.65-0.5)*2 = 0.3
        expect(scoreWithShifts).toBeGreaterThan(scoreWithout);
        // And without shifts, only riskScore: (0.65-0.5)*2 = 0.30
        expect(scoreWithout).toBeCloseTo(0.30, 5);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 2: scorePoliticalOption — risk and aggression
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 2: scorePoliticalOption — risk and aggression', () => {
    it('5. High-risk option (risk_level=0.9) scores lower for low-risk RBiH (0.35) than high-risk RS (0.65)', () => {
        // RS riskScore  = (0.65 - 0.9) * 2.0 = -0.50
        // RBiH riskScore = (0.35 - 0.9) * 2.0 = -1.10
        const option = makeOption({
            risk_level: 0.9,
            // No dimension_shifts, no aggression
        });

        const assessment = makeAssessment({ blended_score: 50, patron_pressure: 0 });
        const rsPersonality = getPoliticalPersonality('RS');
        const rbihPersonality = getPoliticalPersonality('RBiH');

        const rsScore = scorePoliticalOption(option, 'RS', assessment, rsPersonality);
        const rbihScore = scorePoliticalOption(option, 'RBiH', assessment, rbihPersonality);

        expect(rsScore).toBeGreaterThan(rbihScore);
        expect(rsScore).toBeCloseTo(-0.50, 5);
        expect(rbihScore).toBeCloseTo(-1.10, 5);
    });

    it('6. Aggressive option (aggression_affinity=1.0) scores higher when blended_score > 50 (winning faction)', () => {
        // blended_score=70: aggressionScore = 1.0 * ((70/100) - 0.5) * 1.5 = 1.0 * 0.20 * 1.5 = 0.30
        // blended_score=50: aggressionScore = 1.0 * ((50/100) - 0.5) * 1.5 = 0
        const option = makeOption({
            aggression_affinity: 1.0,
            risk_level: 0.5, // neutral risk
        });

        const assessmentWinning = makeAssessment({ blended_score: 70, patron_pressure: 0 });
        const assessmentNeutral = makeAssessment({ blended_score: 50, patron_pressure: 0 });
        const rsPersonality = getPoliticalPersonality('RS');

        const scoreWinning = scorePoliticalOption(option, 'RS', assessmentWinning, rsPersonality);
        const scoreNeutral = scorePoliticalOption(option, 'RS', assessmentNeutral, rsPersonality);

        expect(scoreWinning).toBeGreaterThan(scoreNeutral);
    });

    it('7. Aggressive option (aggression_affinity=1.0) scores lower when blended_score < 50 (losing faction)', () => {
        // blended_score=30: aggressionScore = 1.0 * ((30/100) - 0.5) * 1.5 = 1.0 * (-0.20) * 1.5 = -0.30
        // blended_score=50: aggressionScore = 0
        const option = makeOption({
            aggression_affinity: 1.0,
            risk_level: 0.5, // neutral risk
        });

        const assessmentLosing = makeAssessment({ blended_score: 30, patron_pressure: 0 });
        const assessmentNeutral = makeAssessment({ blended_score: 50, patron_pressure: 0 });
        const rsPersonality = getPoliticalPersonality('RS');

        const scoreLosing = scorePoliticalOption(option, 'RS', assessmentLosing, rsPersonality);
        const scoreNeutral = scorePoliticalOption(option, 'RS', assessmentNeutral, rsPersonality);

        expect(scoreLosing).toBeLessThan(scoreNeutral);
    });

    it('8. Neutral option (aggression_affinity=0) is unaffected by blended_score', () => {
        // aggressionScore = 0 * anything = 0 regardless of blended_score
        const option = makeOption({
            aggression_affinity: 0,
            risk_level: 0.5, // neutral risk so riskScore=0 for RS
        });

        const rsPersonality = getPoliticalPersonality('RS');

        const score30 = scorePoliticalOption(option, 'RS', makeAssessment({ blended_score: 30 }), rsPersonality);
        const score50 = scorePoliticalOption(option, 'RS', makeAssessment({ blended_score: 50 }), rsPersonality);
        const score80 = scorePoliticalOption(option, 'RS', makeAssessment({ blended_score: 80 }), rsPersonality);

        // All three must equal riskScore for RS with risk_level=0.5: (0.65-0.5)*2=0.30
        expect(score30).toBeCloseTo(score50, 10);
        expect(score50).toBeCloseTo(score80, 10);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 3: scorePoliticalOption — patron pressure
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 3: scorePoliticalOption — patron pressure', () => {
    it('9. High patron_pressure + HRHB patron_sensitivity + negative aggression_affinity → positive patronScore', () => {
        // patronScore = (patron_pressure / 100) * patron_sensitivity * (affinity < 0 ? 0.5 : -0.5)
        // With patron_pressure=80, HRHB patron_sensitivity=0.80, aggression_affinity=-0.5:
        // patronScore = (80/100) * 0.80 * 0.5 = 0.64 * 0.5 = 0.32 (positive)
        const option = makeOption({
            aggression_affinity: -0.5,
            risk_level: 0.5, // neutral for HRHB (risk_tolerance=0.50) → riskScore=0
        });

        const assessment = makeAssessment({ blended_score: 50, patron_pressure: 80 });
        const hrhbPersonality = getPoliticalPersonality('HRHB');

        const score = scorePoliticalOption(option, 'HRHB', assessment, hrhbPersonality);

        // dimensionScore=0 (no shifts), riskScore=(0.50-0.5)*2=0, aggressionScore=0 (blended=50),
        // patronScore = 0.80 * 0.80 * 0.5 = 0.32
        expect(score).toBeCloseTo(0.32, 5);
        expect(score).toBeGreaterThan(0);
    });

    it('10. Zero patron_pressure → patronScore = 0 regardless of patron_sensitivity', () => {
        // patronScore = (0 / 100) * patron_sensitivity * ±0.5 = 0
        const optionPositive = makeOption({ aggression_affinity: 1.0, risk_level: 0.5 });
        const optionNegative = makeOption({ aggression_affinity: -1.0, risk_level: 0.5 });

        const assessment = makeAssessment({ blended_score: 50, patron_pressure: 0 });
        const hrhbPersonality = getPoliticalPersonality('HRHB');

        // With risk_level=0.5 and HRHB risk_tolerance=0.5 → riskScore=0
        // With blended_score=50 → aggressionScore=0
        // → total = dimensionScore + 0 + 0 + 0 = 0
        const scorePos = scorePoliticalOption(optionPositive, 'HRHB', assessment, hrhbPersonality);
        const scoreNeg = scorePoliticalOption(optionNegative, 'HRHB', assessment, hrhbPersonality);

        expect(scorePos).toBeCloseTo(0, 10);
        expect(scoreNeg).toBeCloseTo(0, 10);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 4: pickPoliticalResponse — selection
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 4: pickPoliticalResponse — selection', () => {
    it('11. Returns highest-scoring option', () => {
        // optionA: territorial_legitimacy +20 for RS → dimensionScore = 20 * 0.30 = 6.0
        // optionB: territorial_legitimacy +5 for RS → dimensionScore = 5 * 0.30 = 1.5
        // Both with identical risk_level=0.5 and no aggression/patron, so optionA scores higher
        const optionA = makeOption({
            id: 'high_score',
            label: 'High Score',
            dimension_shifts: [{ faction: 'RS', dimension: 'territorial_legitimacy', delta: 20 }],
            risk_level: 0.5,
        });
        const optionB = makeOption({
            id: 'low_score',
            label: 'Low Score',
            dimension_shifts: [{ faction: 'RS', dimension: 'territorial_legitimacy', delta: 5 }],
            risk_level: 0.5,
        });

        const assessment = makeAssessment({ blended_score: 50, patron_pressure: 0 });
        const rsPersonality = getPoliticalPersonality('RS');

        const picked = pickPoliticalResponse([optionA, optionB], 'RS', assessment, rsPersonality);
        expect(picked.id).toBe('high_score');
    });

    it('12. Tie-break: equal scores → picks lexicographically smaller id', () => {
        // Both options identical except id — same score → tie-break by id
        const optionAlpha = makeOption({
            id: 'alpha',
            label: 'Alpha',
            risk_level: 0.5, // neutral for equal scoring
        });
        const optionBeta = makeOption({
            id: 'beta',
            label: 'Beta',
            risk_level: 0.5,
        });

        const assessment = makeAssessment({ blended_score: 50, patron_pressure: 0 });
        const rsPersonality = getPoliticalPersonality('RS');

        // Test both orderings to ensure it's not position-dependent
        const pickedAB = pickPoliticalResponse([optionAlpha, optionBeta], 'RS', assessment, rsPersonality);
        const pickedBA = pickPoliticalResponse([optionBeta, optionAlpha], 'RS', assessment, rsPersonality);

        expect(pickedAB.id).toBe('alpha');
        expect(pickedBA.id).toBe('alpha');
    });

    it('13. Single option: always returns it', () => {
        const only = makeOption({ id: 'only', label: 'Only Option' });
        const assessment = makeAssessment();
        const rsPersonality = getPoliticalPersonality('RS');

        const picked = pickPoliticalResponse([only], 'RS', assessment, rsPersonality);
        expect(picked.id).toBe('only');
    });

    it('14. Throws when options array is empty', () => {
        const assessment = makeAssessment();
        const rsPersonality = getPoliticalPersonality('RS');

        expect(() => {
            pickPoliticalResponse([], 'RS', assessment, rsPersonality);
        }).toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 5: pickPoliticalResponse — determinism
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 5: pickPoliticalResponse — determinism', () => {
    it('15. Same inputs produce identical output on two consecutive calls', () => {
        const options = [
            makeOption({
                id: 'option_a',
                label: 'Option A',
                dimension_shifts: [{ faction: 'RBiH', dimension: 'international_standing', delta: 8 }],
                risk_level: 0.3,
                aggression_affinity: -0.4,
            }),
            makeOption({
                id: 'option_b',
                label: 'Option B',
                dimension_shifts: [{ faction: 'RBiH', dimension: 'military_credibility', delta: 5 }],
                risk_level: 0.6,
                aggression_affinity: 0.5,
            }),
            makeOption({
                id: 'option_c',
                label: 'Option C',
                risk_level: 0.5,
            }),
        ];
        const assessment = makeAssessment({ blended_score: 45, patron_pressure: 20 });
        const rbihPersonality = getPoliticalPersonality('RBiH');

        const result1 = pickPoliticalResponse(options, 'RBiH', assessment, rbihPersonality);
        const result2 = pickPoliticalResponse(options, 'RBiH', assessment, rbihPersonality);

        expect(result1.id).toBe(result2.id);
    });

    it('16. Different faction personalities on same options produce different selections (faction differentiation)', () => {
        // Design: one option favours RS (high territorial_legitimacy, high risk acceptable),
        // another favours RBiH (high international_standing, low risk).
        const options = [
            makeOption({
                id: 'rs_favored',
                label: 'Territorial Grab',
                dimension_shifts: [
                    { faction: 'RS', dimension: 'territorial_legitimacy', delta: 30 },
                    { faction: 'RBiH', dimension: 'territorial_legitimacy', delta: 5 },
                ],
                risk_level: 0.8,       // high risk — RS tolerates it better
                aggression_affinity: 0.9,
            }),
            makeOption({
                id: 'rbih_favored',
                label: 'Diplomatic Overture',
                dimension_shifts: [
                    { faction: 'RBiH', dimension: 'international_standing', delta: 30 },
                    { faction: 'RS', dimension: 'international_standing', delta: 5 },
                ],
                risk_level: 0.2,       // low risk — RBiH prefers this
                aggression_affinity: -0.8,
            }),
        ];

        // RS: winning (blended=70) and zero patron pressure to maximise aggression
        const rsAssessment = makeAssessment({ blended_score: 70, patron_pressure: 0 });
        // RBiH: losing (blended=30), zero patron pressure
        const rbihAssessment = makeAssessment({ blended_score: 30, patron_pressure: 0 });

        const rsPersonality = getPoliticalPersonality('RS');
        const rbihPersonality = getPoliticalPersonality('RBiH');

        const rsPicked = pickPoliticalResponse(options, 'RS', rsAssessment, rsPersonality);
        const rbihPicked = pickPoliticalResponse(options, 'RBiH', rbihAssessment, rbihPersonality);

        expect(rsPicked.id).toBe('rs_favored');
        expect(rbihPicked.id).toBe('rbih_favored');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 6: pickPoliticalResponse — faction archetypes on srebrenica scenario
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 6: Srebrenica demilitarization scenario', () => {
    /**
     * Simplified srebrenica_demilitarization response options.
     * See mission spec — these are the three canonical responses.
     */
    const complyFully = makeOption({
        id: 'comply_fully',
        label: 'Comply Fully',
        dimension_shifts: [
            { faction: 'RBiH', dimension: 'international_standing', delta: 10 },
            { faction: 'RBiH', dimension: 'military_credibility', delta: -10 },
        ],
        risk_level: 0.2,
        aggression_affinity: -0.8,
    });

    const hideWeapons = makeOption({
        id: 'hide_weapons',
        label: 'Hide Weapons',
        dimension_shifts: [
            { faction: 'RBiH', dimension: 'military_credibility', delta: 3 },
        ],
        risk_level: 0.6,
        aggression_affinity: 0.3,
    });

    const refuse = makeOption({
        id: 'refuse',
        label: 'Refuse',
        dimension_shifts: [
            { faction: 'RBiH', dimension: 'international_standing', delta: -10 },
        ],
        risk_level: 0.8,
        aggression_affinity: 0.9,
    });

    const srebrenicaOptions = [complyFully, hideWeapons, refuse];

    it('17. RBiH personality with nominal assessment does NOT pick "refuse" (international_standing -10 heavily penalised)', () => {
        // RBiH: international_standing weight=0.30 → -10 shift costs 3.0 dimension points.
        // Additionally risk_tolerance=0.35 for refuse (risk_level=0.8): (0.35-0.8)*2=-0.9 penalty.
        // These combined penalties should be decisive — RBiH must not pick refuse.
        const assessment = makeAssessment({ blended_score: 60, patron_pressure: 0 });
        const rbihPersonality = getPoliticalPersonality('RBiH');

        const picked = pickPoliticalResponse(srebrenicaOptions, 'RBiH', assessment, rbihPersonality);
        expect(picked.id).not.toBe('refuse');
    });

    it('18. RS personality with territorial options prefers higher-aggression option when winning', () => {
        // For RS, build RS-faction variants of the options to give RS-labelled dimension shifts.
        const rsOptions = [
            makeOption({
                id: 'soft_concession',
                label: 'Soft Concession',
                dimension_shifts: [
                    { faction: 'RS', dimension: 'territorial_legitimacy', delta: -5 },
                ],
                risk_level: 0.2,
                aggression_affinity: -0.8,
            }),
            makeOption({
                id: 'hold_ground',
                label: 'Hold Ground',
                dimension_shifts: [
                    { faction: 'RS', dimension: 'territorial_legitimacy', delta: 10 },
                    { faction: 'RS', dimension: 'military_credibility', delta: 5 },
                ],
                risk_level: 0.75,
                aggression_affinity: 0.9,
            }),
        ];

        // RS winning scenario: high blended_score amplifies aggression bonus
        const rsAssessment = makeAssessment({ blended_score: 75, patron_pressure: 0 });
        const rsPersonality = getPoliticalPersonality('RS');

        const picked = pickPoliticalResponse(rsOptions, 'RS', rsAssessment, rsPersonality);
        expect(picked.id).toBe('hold_ground');
    });

    it('19. HRHB under high patron_pressure picks lower-aggression option when patron signals compliance', () => {
        // HRHB patron_sensitivity=0.80.
        // patronScore for negative-aggression option:
        //   = (80/100) * 0.80 * 0.5 = +0.32 (positive reward for compliance)
        // patronScore for positive-aggression option:
        //   = (80/100) * 0.80 * (-0.5) = -0.32 (penalty for defying patron)
        // This 0.64 swing should push HRHB toward the low-aggression option.
        const hrhbOptions = [
            makeOption({
                id: 'comply',
                label: 'Comply',
                dimension_shifts: [
                    { faction: 'HRHB', dimension: 'patron_confidence', delta: 5 },
                ],
                risk_level: 0.5, // neutral risk for HRHB (risk_tolerance=0.50)
                aggression_affinity: -0.8,
            }),
            makeOption({
                id: 'defy',
                label: 'Defy Patron',
                dimension_shifts: [
                    { faction: 'HRHB', dimension: 'patron_confidence', delta: -5 },
                ],
                risk_level: 0.5, // same risk level
                aggression_affinity: 0.8,
            }),
        ];

        const assessment = makeAssessment({ blended_score: 50, patron_pressure: 80 });
        const hrhbPersonality = getPoliticalPersonality('HRHB');

        const picked = pickPoliticalResponse(hrhbOptions, 'HRHB', assessment, hrhbPersonality);
        expect(picked.id).toBe('comply');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 6b: scorePoliticalOption — trendScore component
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 6b: scorePoliticalOption — trendScore component', () => {
    // TREND_MAGNITUDE = 0.25 (from political_event_decision.ts)
    // trendScore = trendRaw * (option.aggression_affinity ?? 0)
    // where trendRaw = +0.25 (gaining) | -0.25 (losing) | 0 (stable)

    it('23. territory_trend=gaining + aggression_affinity=1.0 → trendScore = +0.25 vs stable baseline', () => {
        // Two assessments differing only in territory_trend; same aggressive option.
        // Score difference = TREND_MAGNITUDE * aggression_affinity = 0.25 * 1.0 = +0.25.
        const option = makeOption({
            aggression_affinity: 1.0,
            risk_level: 0.65, // RS risk_tolerance=0.65 → riskScore=0
        });
        const rsPersonality = getPoliticalPersonality('RS');

        const scoreGaining = scorePoliticalOption(
            option, 'RS',
            makeAssessment({ blended_score: 50, patron_pressure: 0, territory_trend: 'gaining' }),
            rsPersonality,
        );
        const scoreStable = scorePoliticalOption(
            option, 'RS',
            makeAssessment({ blended_score: 50, patron_pressure: 0, territory_trend: 'stable' }),
            rsPersonality,
        );

        expect(scoreGaining - scoreStable).toBeCloseTo(0.25, 5);
    });

    it('24. territory_trend=losing + aggression_affinity=1.0 → trendScore = -0.25 vs stable baseline', () => {
        // trendRaw = -0.25; trendScore = -0.25 * 1.0 = -0.25
        const option = makeOption({
            aggression_affinity: 1.0,
            risk_level: 0.65,
        });
        const rsPersonality = getPoliticalPersonality('RS');

        const scoreLosing = scorePoliticalOption(
            option, 'RS',
            makeAssessment({ blended_score: 50, patron_pressure: 0, territory_trend: 'losing' }),
            rsPersonality,
        );
        const scoreStable = scorePoliticalOption(
            option, 'RS',
            makeAssessment({ blended_score: 50, patron_pressure: 0, territory_trend: 'stable' }),
            rsPersonality,
        );

        expect(scoreLosing - scoreStable).toBeCloseTo(-0.25, 5);
    });

    it('25. territory_trend=stable → trendScore = 0 regardless of aggression_affinity', () => {
        // trendRaw = 0 for stable → trendScore = 0 * aggression_affinity = 0 for any aggression
        const optionHigh = makeOption({ aggression_affinity: 1.0, risk_level: 0.65 });
        const optionLow  = makeOption({ aggression_affinity: -1.0, risk_level: 0.65 });
        const rsPersonality = getPoliticalPersonality('RS');
        const assessment = makeAssessment({ blended_score: 50, patron_pressure: 0, territory_trend: 'stable' });

        const scoreHigh = scorePoliticalOption(optionHigh, 'RS', assessment, rsPersonality);
        const scoreLow  = scorePoliticalOption(optionLow,  'RS', assessment, rsPersonality);

        // trendScore contributes 0 in both cases; the only difference is aggressionScore.
        // With blended=50: aggressionScore = affinity * (0.5 - 0.5) * 1.5 = 0 as well.
        // So riskScore dominates: both options have risk_level=0.65 → riskScore=0.
        // Result: scoreHigh == scoreLow (both = 0).
        expect(scoreHigh).toBeCloseTo(scoreLow, 5);
    });

    it('26. territory_trend=gaining + aggression_affinity=0.0 → trendScore = 0 (affinity zeroes it)', () => {
        // trendScore = trendRaw * aggression_affinity = 0.25 * 0.0 = 0
        // Score with gaining trend must equal score with stable trend when affinity=0.
        const option = makeOption({
            aggression_affinity: 0.0,
            risk_level: 0.65,
        });
        const rsPersonality = getPoliticalPersonality('RS');

        const scoreGaining = scorePoliticalOption(
            option, 'RS',
            makeAssessment({ blended_score: 50, patron_pressure: 0, territory_trend: 'gaining' }),
            rsPersonality,
        );
        const scoreStable = scorePoliticalOption(
            option, 'RS',
            makeAssessment({ blended_score: 50, patron_pressure: 0, territory_trend: 'stable' }),
            rsPersonality,
        );

        expect(scoreGaining).toBeCloseTo(scoreStable, 5);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 7: Fallback and contract
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 7: Fallback and contract', () => {
    it('20. pickPoliticalResponse does not modify the input options array (immutability check)', () => {
        const options = [
            makeOption({ id: 'a', label: 'A', risk_level: 0.3 }),
            makeOption({ id: 'b', label: 'B', risk_level: 0.7 }),
        ];
        const originalLength = options.length;
        const originalA = { ...options[0] };
        const originalB = { ...options[1] };

        const assessment = makeAssessment();
        const rsPersonality = getPoliticalPersonality('RS');

        pickPoliticalResponse(options, 'RS', assessment, rsPersonality);

        // Array must not be mutated
        expect(options.length).toBe(originalLength);
        expect(options[0].id).toBe(originalA.id);
        expect(options[0].risk_level).toBe(originalA.risk_level);
        expect(options[1].id).toBe(originalB.id);
        expect(options[1].risk_level).toBe(originalB.risk_level);
    });

    it('21. scorePoliticalOption returns a finite number (no NaN, no Infinity) for any valid input', () => {
        const option = makeOption({
            id: 'edge_case',
            label: 'Edge Case',
            dimension_shifts: [
                { faction: 'RS', dimension: 'territorial_legitimacy', delta: 100 },
                { faction: 'RS', dimension: 'international_standing', delta: -100 },
            ],
            risk_level: 1.0,
            aggression_affinity: -1.0,
        });

        const assessment = makeAssessment({
            blended_score: 100,
            patron_pressure: 100,
            exhaustion_level: 100,
        negotiation_pressure: 0,
        });
        const rsPersonality = getPoliticalPersonality('RS');

        const score = scorePoliticalOption(option, 'RS', assessment, rsPersonality);

        expect(Number.isFinite(score)).toBe(true);
        expect(Number.isNaN(score)).toBe(false);
    });

    it('22. scorePoliticalOption with all-default option fields returns a finite number', () => {
        // option has no dimension_shifts, no aggression_affinity, no risk_level
        // → all optional fields absent, formula must use defaults safely
        const option = makeOption({
            id: 'default_fields',
            label: 'Default',
            // dimension_shifts: omitted
            // aggression_affinity: omitted
            // risk_level: omitted — formula uses 0.5 default
        });

        for (const faction of ['RS', 'RBiH', 'HRHB'] as const) {
            const personality = getPoliticalPersonality(faction);
            const assessment = makeAssessment();
            const score = scorePoliticalOption(option, faction, assessment, personality);

            expect(Number.isFinite(score)).toBe(true);
        }
    });
});
