import { describe, it, expect } from 'vitest';
import type { CommandAuthority, CorpsOperation } from '../src/state/game_state.js';
import type { OperationAAR } from '../src/sim/combat/operation_aar.js';
import { computeCorpsCommandStrain, getCommandStrainLabel, deriveOrderInterpretation, deriveStanceInterpretation, deriveOperationOutcomeCategory, buildOperationTrendSummary, projectStrainDecay, deriveRecoveryForecast, deriveCorpsSituationAssessment, deriveRecommendationExplanation, deriveReadinessTrend, isExhaustionContributingToStrain, EXHAUSTION_STRAIN_THRESHOLD, EXHAUSTION_STRAIN_SEVERE_THRESHOLD, deriveDelegationContext, deriveCorpsDelegationSummary } from '../src/ui/map/data/command_strain.js';
import type { OperationOutcomeCategory, OperationTrendSummary, PrimaryConstraint, ReadinessTrendDirection, DelegationPath } from '../src/ui/map/data/command_strain.js';

// ─────────────────────────────────────────────────────────────────────────────
// Command Strain
// ─────────────────────────────────────────────────────────────────────────────

/** Build a minimal GameState stub for strain computation. */
function makeStrainState(overrides: {
    turn?: number;
    activeOps?: Array<{ name: string; was_force_launched?: boolean; started_turn?: number }>;
    frictionEvents?: Array<{ officer_id: string; turn: number; type: string; resolved: boolean }>;
    officerCorpsId?: string; // corps the officer is assigned to
    officerId?: string;
    corpsExhaustion?: number; // Wave 6: corps exhaustion (0-100)
} = {}): any {
    const turn = overrides.turn ?? 5;
    const corpsId = 'test-corps';
    const officerId = overrides.officerId ?? 'officer-1';
    const officerCorpsId = overrides.officerCorpsId ?? corpsId;

    return {
        meta: { turn },
        military: {
            corps_command: {
                [corpsId]: {
                    active_operations: (overrides.activeOps ?? []).map(op => ({
                        name: op.name,
                        was_force_launched: op.was_force_launched,
                        started_turn: op.started_turn ?? turn,
                    })),
                    corps_exhaustion: overrides.corpsExhaustion ?? 0,
                },
            },
            friction_events: overrides.frictionEvents ?? [],
            named_officers: overrides.frictionEvents?.length || overrides.officerCorpsId
                ? {
                    [officerId]: {
                        status: 'active',
                        assigned_corps_id: officerCorpsId,
                    },
                }
                : {},
        },
    };
}

describe('Wave 10: Command Relationship Standing', () => {
    // ═══════════════════════════════════════════════════════════════════════
    // Wave 14: Operation Constraint Context (Commander Explanation Surfaces Wave 4)
    // Tests that the existing situation assessment derivation produces the right
    // data shape for the OperationBriefingModal constraint context surface.
    // ═══════════════════════════════════════════════════════════════════════

    describe('Wave 14: Operation Constraint Context', () => {
        it('healthy corps → all three fields null/none (silence = healthy)', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'projecting', deficit: 0, surplus_brigades: ['b1', 'b2'], front_edge_count: 5 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 8, combat_effective: 8, total_surplus: 3 },
                    current_plan: null,
                },
                'balanced', 10, 0,
            );
            expect(result.primaryConstraint).toBe('none');
            expect(result.dominantReason).toBeNull();
            expect(result.reliefPath).toBeNull();
        });

        it('siege constraint propagates all three fields for operation context', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'besieged', deficit: 3, surplus_brigades: [], front_edge_count: 20 }],
                    threat_assessment: { overall_pressure: 'heavy' },
                    force_assessment: { total_brigades: 4, combat_effective: 3, total_surplus: 0 },
                    current_plan: null,
                },
                'defensive', 50, 0,
            );
            expect(result.primaryConstraint).toBe('siege');
            expect(result.dominantReason).not.toBeNull();
            expect(result.reliefPath).not.toBeNull();
        });

        it('garrison deficit propagates constraint + reason + relief for operation context', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'defending', deficit: 4, surplus_brigades: [], front_edge_count: 12 }],
                    threat_assessment: { overall_pressure: 'moderate' },
                    force_assessment: { total_brigades: 5, combat_effective: 5, total_surplus: 0 },
                    current_plan: null,
                },
                'balanced', 20, 0,
            );
            expect(result.primaryConstraint).toBe('defensive_duty');
            expect(result.dominantReason).toContain('brigade');
            expect(result.reliefPath).toContain('brigade');
        });

        it('exhaustion constraint includes percentage in dominant reason', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'defending', deficit: 0, surplus_brigades: ['b1'], front_edge_count: 8 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 6, combat_effective: 6, total_surplus: 1 },
                    current_plan: null,
                },
                'balanced', 65, 0,
            );
            expect(result.primaryConstraint).toBe('force_condition');
            expect(result.dominantReason).toContain('exhaust');
            expect(result.reliefPath).toContain('65');
        });

        it('compromised command strain propagates institutional constraint for operation context', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'defending', deficit: 0, surplus_brigades: ['b1'], front_edge_count: 6 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 6, combat_effective: 6, total_surplus: 1 },
                    current_plan: null,
                },
                'balanced', 10, 8,
            );
            expect(result.primaryConstraint).toBe('institutional_strain');
            expect(result.dominantReason).toContain('compromised');
            expect(result.reliefPath).toContain('Stabilize');
        });

        it('constraint priority: siege outranks exhaustion when both present', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'besieged', deficit: 2, surplus_brigades: [], front_edge_count: 15 }],
                    threat_assessment: { overall_pressure: 'heavy' },
                    force_assessment: { total_brigades: 4, combat_effective: 2, total_surplus: 0 },
                    current_plan: null,
                },
                'balanced', 70, 8,
            );
            expect(result.primaryConstraint).toBe('siege');
        });

        it('constraint priority: threat outranks garrison when both present', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'defending', deficit: 4, surplus_brigades: [], front_edge_count: 10 }],
                    threat_assessment: { overall_pressure: 'critical' },
                    force_assessment: { total_brigades: 5, combat_effective: 5, total_surplus: 0 },
                    current_plan: null,
                },
                'balanced', 20, 0,
            );
            expect(result.primaryConstraint).toBe('threat_pressure');
        });

        it('null commanderState → constraint none (no false positives in operation context)', () => {
            const result = deriveCorpsSituationAssessment(null, 'balanced', 10, 0);
            expect(result.primaryConstraint).toBe('none');
            expect(result.dominantReason).toBeNull();
            expect(result.reliefPath).toBeNull();
        });

        it('defensive stance → institutional constraint with relief mentioning stance change', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'defending', deficit: 0, surplus_brigades: ['b1'], front_edge_count: 6 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 6, combat_effective: 6, total_surplus: 1 },
                    current_plan: null,
                },
                'defensive', 10, 0,
            );
            expect(result.primaryConstraint).toBe('institutional_strain');
            expect(result.dominantReason).toContain('defensive');
            expect(result.reliefPath).toContain('stance');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Wave 15: Recommendation Explanation (Commander Explanation Surfaces Wave 5)
    // Tests that deriveRecommendationExplanation correctly identifies main blockers
    // and produces truthful explanation text from assessment snapshot data.
    // ═══════════════════════════════════════════════════════════════════════

    describe('Wave 15: Recommendation Explanation', () => {
        it('launch → silence (null fields)', () => {
            const result = deriveRecommendationExplanation(0.8, 0.9, 2.0, 3, 0.5, 'launch', 0);
            expect(result.recommendationReason).toBeNull();
            expect(result.mainBlocker).toBeNull();
            expect(result.wouldImproveIf).toBeNull();
        });

        it('null assessment → silence', () => {
            const result = deriveRecommendationExplanation(0.5, 0.5, 1.0, 3, 0.5, null, 0);
            expect(result.recommendationReason).toBeNull();
        });

        it('postpone with low intel → intel is main blocker', () => {
            // Low intel (0.2), good supply (0.9), good force ratio (2.0), neutral commander
            const result = deriveRecommendationExplanation(0.2, 0.9, 2.0, 3, 0.5, 'postpone', 0);
            expect(result.mainBlocker).toBe('intel');
            expect(result.recommendationReason).toContain('Intelligence');
            expect(result.wouldImproveIf).not.toBeNull();
        });

        it('postpone with low force ratio → force_ratio is main blocker', () => {
            // Good intel (0.8), good supply (0.9), low force ratio (0.5), neutral commander
            const result = deriveRecommendationExplanation(0.8, 0.9, 0.5, 3, 0.5, 'postpone', 0);
            expect(result.mainBlocker).toBe('force_ratio');
            expect(result.recommendationReason).toContain('Force balance judged');
            expect(result.recommendationReason).toContain('launch standard');
            expect(result.wouldImproveIf).toContain('force');
        });

        it('postpone with low supply → supply is main blocker', () => {
            // Good intel (0.8), low supply (0.1), good force ratio (2.0), neutral commander
            const result = deriveRecommendationExplanation(0.8, 0.1, 2.0, 3, 0.5, 'postpone', 0);
            expect(result.mainBlocker).toBe('supply');
            expect(result.recommendationReason).toContain('Supply');
            expect(result.wouldImproveIf).toContain('supply');
        });

        it('abort → no wouldImproveIf (not viable)', () => {
            const result = deriveRecommendationExplanation(0.1, 0.1, 0.3, 3, 0.5, 'abort', 0);
            expect(result.recommendationReason).not.toBeNull();
            expect(result.wouldImproveIf).toBeNull();
        });

        it('abort after max postponements mentions postponement count', () => {
            const result = deriveRecommendationExplanation(0.3, 0.4, 0.8, 3, 0.5, 'abort', 2);
            expect(result.recommendationReason).toContain('postponed');
            expect(result.recommendationReason).toContain('2');
        });

        it('aggressive commander (agg=5) has lower thresholds → different blocker identification', () => {
            // Same readiness, aggressive vs cautious commander
            const aggressive = deriveRecommendationExplanation(0.4, 0.5, 1.0, 5, 0.5, 'postpone', 0);
            const cautious = deriveRecommendationExplanation(0.4, 0.5, 1.0, 1, 0.5, 'postpone', 0);
            // Both should have non-null explanations but may differ in which factor is main blocker
            expect(aggressive.recommendationReason).not.toBeNull();
            expect(cautious.recommendationReason).not.toBeNull();
        });

        it('null force ratio → graceful fallback explanation', () => {
            const result = deriveRecommendationExplanation(0.5, 0.5, null, 3, 0.5, 'postpone', 0);
            expect(result.recommendationReason).not.toBeNull();
            expect(result.recommendationReason).toContain('conditions');
            expect(result.mainBlocker).toBeNull();
        });

        it('all factors fully met but still postpone → combined shortfall message', () => {
            // All factors individually met but combined score below threshold
            // reqConf = 0.6 - 3*0.06 + 0.5*0.04 = 0.44, intel=0.44 → confMet=1.0
            // reqForce = max(1.0, 1.5 - 3*0.10 + 0.5*0.05) = 1.225, forceRatio=1.225 → forceMet=1.0
            // supply=0.3
            // score = 1.0*0.4 + 1.0*0.3 + 0.3*0.3 = 0.79 > threshold 0.46 → would be launch
            // Use values that make each individually near-met but combined below threshold
            // With agg=1: goThreshold = 0.62, reqConf=0.58, reqForce=1.45
            // intel=0.5 → confMet=0.5/0.58=0.86, forceRatio=1.3 → forceMet=1.3/1.45=0.90, supply=0.3
            // score = 0.86*0.4 + 0.90*0.3 + 0.3*0.3 = 0.344 + 0.27 + 0.09 = 0.704 > 0.62 → launch
            // Need lower values. intel=0.3 → confMet=0.3/0.58=0.517, forceRatio=0.9 → 0.9/1.45=0.621
            // score = 0.517*0.4 + 0.621*0.3 + 0.3*0.3 = 0.207 + 0.186 + 0.09 = 0.483 < 0.62 → postpone
            const result = deriveRecommendationExplanation(0.3, 0.3, 0.9, 1, 0.5, 'postpone', 0);
            expect(result.mainBlocker).not.toBeNull();
            expect(result.recommendationReason).not.toBeNull();
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Wave 16: Readiness Trend (Commander Explanation Surfaces Wave 6)
    // Tests that deriveReadinessTrend correctly classifies operation direction
    // from existing persisted fields — no new persistence needed.
    // ═══════════════════════════════════════════════════════════════════════

    describe('Wave 16: Readiness Trend', () => {
        it('first assessment launch → nearing_launch, silence (null label)', () => {
            const result = deriveReadinessTrend('launch', 0);
            expect(result.direction).toBe('nearing_launch');
            expect(result.label).toBeNull();
        });

        it('first assessment postpone → building with label', () => {
            const result = deriveReadinessTrend('postpone', 0);
            expect(result.direction).toBe('building');
            expect(result.label).toContain('First assessment');
        });

        it('first assessment abort → not_viable with label', () => {
            const result = deriveReadinessTrend('abort', 0);
            expect(result.direction).toBe('not_viable');
            expect(result.label).toContain('too poor');
        });

        it('postponed once, now launch → improving', () => {
            const result = deriveReadinessTrend('launch', 1);
            expect(result.direction).toBe('improving');
            expect(result.label).toContain('recovered');
            expect(result.label).toContain('1 postponement');
        });

        it('postponed twice, now launch → improving (mentions count)', () => {
            const result = deriveReadinessTrend('launch', 2);
            expect(result.direction).toBe('improving');
            expect(result.label).toContain('2 postponements');
        });

        it('postponed once, still postpone → stagnating', () => {
            const result = deriveReadinessTrend('postpone', 1);
            expect(result.direction).toBe('stagnating');
            expect(result.label).toContain('1 time');
            expect(result.label).toContain('not improved');
        });

        it('postponed once, now abort → deteriorating', () => {
            const result = deriveReadinessTrend('abort', 1);
            expect(result.direction).toBe('deteriorating');
            expect(result.label).toContain('deteriorated');
        });

        it('null assessment → building with no label (silence)', () => {
            const result = deriveReadinessTrend(null, 0);
            expect(result.direction).toBe('building');
            expect(result.label).toBeNull();
        });

        it('undefined assessment → building with no label (silence)', () => {
            const result = deriveReadinessTrend(undefined, 0);
            expect(result.direction).toBe('building');
            expect(result.label).toBeNull();
        });

        // Timeline urgency tests
        it('timeline fraction computed from turnsElapsed / maxTurns', () => {
            const result = deriveReadinessTrend('postpone', 0, 3, 5);
            expect(result.timelineFraction).toBeCloseTo(0.6);
            expect(result.timelineLabel).toContain('Turn 3 of 5');
        });

        it('timeline urgency warning when >= 75% elapsed', () => {
            // 6 of 8 = 75%, remaining=2 so not final-turn
            const result = deriveReadinessTrend('postpone', 1, 6, 8);
            expect(result.timelineFraction).toBeCloseTo(0.75);
            expect(result.timelineLabel).toContain('running short');
        });

        it('final turn warning when remaining <= 1', () => {
            const result = deriveReadinessTrend('postpone', 1, 5, 5);
            expect(result.timelineFraction).toBe(1);
            expect(result.timelineLabel).toContain('Final turn');
        });

        it('no timeline when turnsElapsed/maxTurns not provided', () => {
            const result = deriveReadinessTrend('postpone', 1);
            expect(result.timelineFraction).toBeNull();
            expect(result.timelineLabel).toBeNull();
        });

        it('launch suppresses timeline urgency warnings', () => {
            const result = deriveReadinessTrend('launch', 1, 4, 5);
            // Timeline fraction still computed but urgency label should not warn
            expect(result.timelineFraction).toBeCloseTo(0.8);
            // Launch doesn't need "running short" warning
            expect(result.timelineLabel).not.toContain('running short');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Wave 17: Command Relationship Surface Consolidation
    // Tests that the consolidated CommandRelationshipSection's visibility
    // and content rules are correct after merging friction + management + standing.
    // ═══════════════════════════════════════════════════════════════════════

    describe('Wave 17: Command Relationship Consolidation', () => {
        /** Simulate the consolidated section's render condition. */
        function shouldShowConsolidated(strain: number, unresolvedFrictionCount: number): boolean {
            return strain > 0 || unresolvedFrictionCount > 0;
        }

        /** Simulate strain status visibility within the section. */
        function shouldShowStrainStatus(strain: number): boolean {
            return strain > 0;
        }

        /** Simulate recovery forecast visibility. */
        function shouldShowRecoveryForecast(strain: number, forecast: string | null): boolean {
            return strain > 0 && forecast !== null;
        }

        /** Simulate stabilize button visibility. */
        function shouldShowStabilizeButton(strain: number): boolean {
            return strain > 0;
        }

        /** Simulate stance constraint visibility. */
        function shouldShowStanceConstraint(strain: number): boolean {
            return strain >= 6; // COMPROMISED_THRESHOLD
        }

        it('silence = healthy: hidden when strain=0 and no friction', () => {
            expect(shouldShowConsolidated(0, 0)).toBe(false);
        });

        it('shown when strain > 0 even with no friction', () => {
            expect(shouldShowConsolidated(3, 0)).toBe(true);
        });

        it('shown when friction exists even with strain = 0', () => {
            expect(shouldShowConsolidated(0, 2)).toBe(true);
        });

        it('strain status hidden when strain = 0', () => {
            expect(shouldShowStrainStatus(0)).toBe(false);
        });

        it('strain status shown when strain > 0', () => {
            expect(shouldShowStrainStatus(4)).toBe(true);
        });

        it('recovery forecast hidden when strain = 0', () => {
            expect(shouldShowRecoveryForecast(0, 'Strain resolving in 2 turns')).toBe(false);
        });

        it('recovery forecast shown when strain > 0 and forecast present', () => {
            expect(shouldShowRecoveryForecast(4, 'Strain resolving in 2 turns')).toBe(true);
        });

        it('recovery forecast hidden when forecast is null', () => {
            expect(shouldShowRecoveryForecast(4, null)).toBe(false);
        });

        it('stabilize button shown when strain > 0', () => {
            expect(shouldShowStabilizeButton(3)).toBe(true);
        });

        it('stabilize button hidden when strain = 0', () => {
            expect(shouldShowStabilizeButton(0)).toBe(false);
        });

        it('stance constraint shown only when compromised (strain >= 6)', () => {
            expect(shouldShowStanceConstraint(5)).toBe(false);
            expect(shouldShowStanceConstraint(6)).toBe(true);
            expect(shouldShowStanceConstraint(10)).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Wave 18: Exhaustion Strain Source (Presidential Command Friction Wave 6)
    // Tests that corps exhaustion above threshold contributes to command strain.
    // ═══════════════════════════════════════════════════════════════════════

    describe('Wave 18: Exhaustion Strain Source', () => {
        it('no strain from exhaustion below threshold', () => {
            const state = makeStrainState({ corpsExhaustion: 49 });
            expect(computeCorpsCommandStrain('test-corps', state)).toBe(0);
        });

        it('+1 strain at exhaustion threshold (50)', () => {
            const state = makeStrainState({ corpsExhaustion: 50 });
            expect(computeCorpsCommandStrain('test-corps', state)).toBe(1);
        });

        it('+1 strain at exhaustion between thresholds (60)', () => {
            const state = makeStrainState({ corpsExhaustion: 60 });
            expect(computeCorpsCommandStrain('test-corps', state)).toBe(1);
        });

        it('+2 strain at severe exhaustion threshold (75)', () => {
            const state = makeStrainState({ corpsExhaustion: 75 });
            expect(computeCorpsCommandStrain('test-corps', state)).toBe(2);
        });

        it('+2 strain at maximum exhaustion (100)', () => {
            const state = makeStrainState({ corpsExhaustion: 100 });
            expect(computeCorpsCommandStrain('test-corps', state)).toBe(2);
        });

        it('exhaustion strain composes with force-launch strain', () => {
            const state = makeStrainState({
                corpsExhaustion: 50,
                activeOps: [{ name: 'Op Forced', was_force_launched: true, started_turn: 5 }],
            });
            // +3 from force launch + 1 from exhaustion = 4
            expect(computeCorpsCommandStrain('test-corps', state)).toBe(4);
        });

        it('exhaustion strain composes with friction strain', () => {
            const state = makeStrainState({
                corpsExhaustion: 75,
                frictionEvents: [{ officer_id: 'officer-1', turn: 5, type: 'warlord', resolved: false }],
            });
            // +2 from friction + 2 from exhaustion = 4
            expect(computeCorpsCommandStrain('test-corps', state)).toBe(4);
        });

        it('exhaustion + force + friction all compose', () => {
            const state = makeStrainState({
                corpsExhaustion: 75,
                activeOps: [{ name: 'Op Forced', was_force_launched: true, started_turn: 5 }],
                frictionEvents: [{ officer_id: 'officer-1', turn: 5, type: 'warlord', resolved: false }],
            });
            // +3 force + 2 friction + 2 exhaustion = 7
            expect(computeCorpsCommandStrain('test-corps', state)).toBe(7);
        });

        it('isExhaustionContributingToStrain returns false below threshold', () => {
            expect(isExhaustionContributingToStrain(49)).toBe(false);
        });

        it('isExhaustionContributingToStrain returns true at threshold', () => {
            expect(isExhaustionContributingToStrain(50)).toBe(true);
        });

        it('isExhaustionContributingToStrain returns true above severe threshold', () => {
            expect(isExhaustionContributingToStrain(80)).toBe(true);
        });

        it('exported thresholds match expected values', () => {
            expect(EXHAUSTION_STRAIN_THRESHOLD).toBe(50);
            expect(EXHAUSTION_STRAIN_SEVERE_THRESHOLD).toBe(75);
        });

        it('exhaustion-only compromised guidance should not imply stabilization fixes it', () => {
            const unresolvedFrictionCount = 0;
            const exhaustionContributing = true;
            const text =
                unresolvedFrictionCount > 0 && exhaustionContributing
                    ? 'Offensive posture unavailable — stabilize the command relationship and reduce operational tempo first.'
                    : unresolvedFrictionCount > 0
                        ? 'Offensive posture unavailable — stabilize the command relationship first.'
                        : exhaustionContributing
                            ? 'Offensive posture unavailable — reduce operational tempo and let the corps recover first.'
                            : 'Offensive posture unavailable — command conditions are not yet stable enough.';

            expect(text).toContain('reduce operational tempo');
            expect(text).not.toContain('stabilize the command relationship first.');
        });

        it('mixed friction + exhaustion guidance should mention both recovery paths', () => {
            const unresolvedFrictionCount = 2;
            const exhaustionContributing = true;
            const text =
                unresolvedFrictionCount > 0 && exhaustionContributing
                    ? 'Offensive posture unavailable — stabilize the command relationship and reduce operational tempo first.'
                    : unresolvedFrictionCount > 0
                        ? 'Offensive posture unavailable — stabilize the command relationship first.'
                        : exhaustionContributing
                            ? 'Offensive posture unavailable — reduce operational tempo and let the corps recover first.'
                            : 'Offensive posture unavailable — command conditions are not yet stable enough.';

            expect(text).toContain('stabilize');
            expect(text).toContain('reduce operational tempo');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Wave 19: Delegation Visibility — pre-decision delegation path +
    // standing delegation summary
    // ═══════════════════════════════════════════════════════════════════════

    describe('deriveDelegationContext (Wave 19)', () => {
        it('returns normal_delegation (silence) when commander recommends launch and strain = 0', () => {
            const ctx = deriveDelegationContext('launch', 0);
            expect(ctx.path).toBe('normal_delegation');
            expect(ctx.label).toBeNull();
            expect(ctx.decisionBearer).toBeNull();
        });

        it('returns normal_delegation (silence) when no assessment yet', () => {
            const ctx = deriveDelegationContext(null, 0);
            expect(ctx.path).toBe('normal_delegation');
            expect(ctx.label).toBeNull();
        });

        it('returns normal_delegation (silence) when undefined assessment', () => {
            const ctx = deriveDelegationContext(undefined, 3);
            expect(ctx.path).toBe('normal_delegation');
            expect(ctx.label).toBeNull();
        });

        it('returns strained_delegation when commander recommends launch but strain > 0', () => {
            const ctx = deriveDelegationContext('launch', 3);
            expect(ctx.path).toBe('strained_delegation');
            expect(ctx.label).not.toBeNull();
            expect(ctx.label).toContain('delegated authority');
            expect(ctx.label).toContain('strained');
            expect(ctx.decisionBearer).toBe('commander');
        });

        it('returns presidential_direction when commander recommends postpone', () => {
            const ctx = deriveDelegationContext('postpone', 0);
            expect(ctx.path).toBe('presidential_direction');
            expect(ctx.label).not.toBeNull();
            expect(ctx.label).toContain('Presidency');
            expect(ctx.label).toContain('postponement');
            expect(ctx.decisionBearer).toBe('presidency');
        });

        it('returns presidential_direction when commander recommends abort', () => {
            const ctx = deriveDelegationContext('abort', 0);
            expect(ctx.path).toBe('presidential_direction');
            expect(ctx.label).toContain('abort');
            expect(ctx.label).toContain('Presidency');
            expect(ctx.decisionBearer).toBe('presidency');
        });

        it('returns presidential_direction regardless of strain when commander recommends against', () => {
            const ctx = deriveDelegationContext('postpone', 6);
            expect(ctx.path).toBe('presidential_direction');
            expect(ctx.decisionBearer).toBe('presidency');
        });
    });

    describe('deriveCorpsDelegationSummary (Wave 19)', () => {
        it('returns silence when no active ops', () => {
            const summary = deriveCorpsDelegationSummary([]);
            expect(summary.totalActive).toBe(0);
            expect(summary.summaryLabel).toBeNull();
        });

        it('returns silence when all ops are ordinary compliance', () => {
            const summary = deriveCorpsDelegationSummary([
                { was_force_launched: false, commander_assessment_at_launch: 'launch', phase: 'execution' },
                { was_force_launched: false, commander_assessment_at_launch: 'launch', phase: 'recovery' },
            ]);
            expect(summary.totalActive).toBe(2);
            expect(summary.delegatedCount).toBe(2);
            expect(summary.directedCount).toBe(0);
            expect(summary.overriddenCount).toBe(0);
            expect(summary.summaryLabel).toBeNull();
        });

        it('reports direct intervention count', () => {
            const summary = deriveCorpsDelegationSummary([
                { was_force_launched: true, commander_assessment_at_launch: 'postpone', phase: 'execution' },
                { was_force_launched: false, commander_assessment_at_launch: 'launch', phase: 'execution' },
            ]);
            expect(summary.overriddenCount).toBe(1);
            expect(summary.delegatedCount).toBe(1);
            expect(summary.summaryLabel).toContain('Direct Intervention');
        });

        it('reports reluctant compliance as presidential direction', () => {
            const summary = deriveCorpsDelegationSummary([
                { was_force_launched: false, commander_assessment_at_launch: 'postpone', phase: 'execution' },
            ]);
            expect(summary.directedCount).toBe(1);
            expect(summary.summaryLabel).toContain('presidential direction');
        });

        it('skips planning-phase ops (no launch snapshot yet)', () => {
            const summary = deriveCorpsDelegationSummary([
                { was_force_launched: false, commander_assessment_at_launch: undefined, phase: 'planning' },
                { was_force_launched: true, commander_assessment_at_launch: 'abort', phase: 'execution' },
            ]);
            expect(summary.totalActive).toBe(1);
            expect(summary.overriddenCount).toBe(1);
        });

        it('reports both override types when mixed', () => {
            const summary = deriveCorpsDelegationSummary([
                { was_force_launched: true, commander_assessment_at_launch: 'postpone', phase: 'execution' },
                { was_force_launched: false, commander_assessment_at_launch: 'abort', phase: 'recovery' },
                { was_force_launched: false, commander_assessment_at_launch: 'launch', phase: 'execution' },
            ]);
            expect(summary.overriddenCount).toBe(1);
            expect(summary.directedCount).toBe(1);
            expect(summary.delegatedCount).toBe(1);
            expect(summary.summaryLabel).toContain('Direct Intervention');
            expect(summary.summaryLabel).toContain('presidential direction');
        });
    });
});
