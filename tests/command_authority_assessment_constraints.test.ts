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
    describe('projectStrainDecay', () => {
        it('one force-launch at current turn → decays [3, 2, 1, 0] over 3 turns', () => {
            const state = makeStrainState({
                turn: 5,
                activeOps: [{ name: 'Op Alpha', was_force_launched: true, started_turn: 5 }],
            });
            const result = projectStrainDecay('test-corps', state, 3);
            expect(result).toEqual([
                { turn: 5, projectedStrain: 3 },
                { turn: 6, projectedStrain: 2 },
                { turn: 7, projectedStrain: 1 },
                { turn: 8, projectedStrain: 0 },
            ]);
        });

        it('one friction event at current turn → decays [2, 1, 0] over 2 turns', () => {
            const state = makeStrainState({
                turn: 5,
                frictionEvents: [{ officer_id: 'officer-1', turn: 5, type: 'warlord_disobedience', resolved: false }],
            });
            const result = projectStrainDecay('test-corps', state, 2);
            expect(result).toEqual([
                { turn: 5, projectedStrain: 2 },
                { turn: 6, projectedStrain: 1 },
                { turn: 7, projectedStrain: 0 },
            ]);
        });

        it('combined sources → correct sum at each turn', () => {
            const state = makeStrainState({
                turn: 5,
                activeOps: [{ name: 'Op Alpha', was_force_launched: true, started_turn: 5 }],
                frictionEvents: [{ officer_id: 'officer-1', turn: 5, type: 'warlord_disobedience', resolved: false }],
            });
            const result = projectStrainDecay('test-corps', state, 3);
            // Force-launch: 3, 2, 1, 0. Friction: 2, 1, 0, 0. Sum: 5, 3, 1, 0.
            expect(result).toEqual([
                { turn: 5, projectedStrain: 5 },
                { turn: 6, projectedStrain: 3 },
                { turn: 7, projectedStrain: 1 },
                { turn: 8, projectedStrain: 0 },
            ]);
        });

        it('all sources expired → all zeros', () => {
            const state = makeStrainState({
                turn: 20,
                activeOps: [{ name: 'Op Alpha', was_force_launched: true, started_turn: 5 }],
                frictionEvents: [{ officer_id: 'officer-1', turn: 5, type: 'warlord_disobedience', resolved: false }],
            });
            const result = projectStrainDecay('test-corps', state, 2);
            expect(result).toEqual([
                { turn: 20, projectedStrain: 0 },
                { turn: 21, projectedStrain: 0 },
                { turn: 22, projectedStrain: 0 },
            ]);
        });
    });

    describe('deriveRecoveryForecast', () => {
        it('healthy (strain 0) → returns null (silence=healthy)', () => {
            const projections = [{ turn: 5, projectedStrain: 0 }];
            expect(deriveRecoveryForecast(projections)).toBeNull();
        });

        it('recovery in 2 turns → "Strain resolving in 2 turns"', () => {
            const projections = [
                { turn: 5, projectedStrain: 2 },
                { turn: 6, projectedStrain: 1 },
                { turn: 7, projectedStrain: 0 },
            ];
            expect(deriveRecoveryForecast(projections)).toBe('Strain resolving in 2 turns');
        });

        it('persistent strain beyond horizon → "Recovery: strain drops to N (label) next turn"', () => {
            const projections = [
                { turn: 5, projectedStrain: 8 },
                { turn: 6, projectedStrain: 6 },
                { turn: 7, projectedStrain: 4 },
            ];
            // Next turn drops from 8 to 6 (still compromised)
            expect(deriveRecoveryForecast(projections)).toBe('Recovery: strain drops to 6 (compromised) next turn');
        });
    });

    describe('CA recovery reduction', () => {
        it('one recent force-launch → recovery reduced by 0.5 (1.5 effective)', () => {
            // Simulate the inline logic from recover-command-authority step
            const currentTurn = 5;
            const recentInterventions = 1; // 1 force-launched op within 3 turns
            const unresolvedFriction = 0;
            const penalty = Math.min(2, (recentInterventions + unresolvedFriction) * 0.5);
            const recovery = Math.max(0, 2 - penalty);
            expect(recovery).toBe(1.5);
        });

        it('two force-launches + one friction → recovery reduced to 0.5', () => {
            const recentInterventions = 2;
            const unresolvedFriction = 1;
            const penalty = Math.min(2, (recentInterventions + unresolvedFriction) * 0.5);
            const recovery = Math.max(0, 2 - penalty);
            expect(recovery).toBe(0.5);
        });

        it('four+ interventions → recovery capped at 0 (full loss)', () => {
            const recentInterventions = 3;
            const unresolvedFriction = 2;
            const penalty = Math.min(2, (recentInterventions + unresolvedFriction) * 0.5);
            const recovery = Math.max(0, 2 - penalty);
            expect(recovery).toBe(0);
        });

        it('no interventions → full recovery of 2', () => {
            const recentInterventions = 0;
            const unresolvedFriction = 0;
            const penalty = Math.min(2, (recentInterventions + unresolvedFriction) * 0.5);
            const recovery = Math.max(0, 2 - penalty);
            expect(recovery).toBe(2);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Wave 11: Corps Situation Assessment (Commander Explanation Surfaces)
    // ═══════════════════════════════════════════════════════════════════════

    describe('Wave 11: Corps Situation Assessment', () => {
        it('returns null postureSummary when healthy projecting corps', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'projecting', deficit: 0, surplus_brigades: ['b1', 'b2'], front_edge_count: 5 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 8, combat_effective: 8, total_surplus: 3 },
                    current_plan: null,
                },
                'balanced',
                10, // low exhaustion
                0,  // no strain
            );
            expect(result.postureSummary).toBeNull();
            expect(result.militaryFactors).toHaveLength(0);
            expect(result.institutionalFactors).toHaveLength(0);
            expect(result.planExplanation).toBeNull();
            expect(result.threatContext).toBeNull();
        });

        it('returns posture explanation for defending corps with deficit', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'defending', deficit: 3, surplus_brigades: [], front_edge_count: 12 }],
                    threat_assessment: { overall_pressure: 'moderate' },
                    force_assessment: { total_brigades: 5, combat_effective: 5, total_surplus: 0 },
                    current_plan: null,
                },
                'defensive',
                20,
                0,
            );
            expect(result.postureSummary).toContain('Garrison requirements exceed');
            expect(result.militaryFactors).toContain('No surplus brigades — all forces committed to garrison duties');
            expect(result.institutionalFactors).toContain('Corps directed to defensive posture — no offensive planning');
        });

        it('reports exhaustion as military factor', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'balanced', deficit: 0, surplus_brigades: ['b1'], front_edge_count: 6 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 6, combat_effective: 6, total_surplus: 1 },
                    current_plan: null,
                },
                'balanced',
                65, // heavy exhaustion
                0,
            );
            expect(result.militaryFactors.some(f => f.includes('heavily exhausted'))).toBe(true);
        });

        it('reports command strain as institutional factor', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'projecting', deficit: 0, surplus_brigades: ['b1', 'b2'], front_edge_count: 5 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 8, combat_effective: 8, total_surplus: 2 },
                    current_plan: null,
                },
                'balanced',
                10,
                7, // compromised
            );
            expect(result.institutionalFactors.some(f => f.includes('compromised'))).toBe(true);
        });

        it('explains concentrating plan with progress', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'projecting', deficit: 0, surplus_brigades: ['b1', 'b2', 'b3'], front_edge_count: 5 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 8, combat_effective: 8, total_surplus: 3 },
                    current_plan: {
                        objective_description: 'Op Corridor',
                        status: 'concentrating',
                        concentration_progress: 0.6,
                    },
                },
                'offensive',
                10,
                0,
            );
            expect(result.planExplanation).toContain('Concentrating forces for Op Corridor');
            expect(result.planExplanation).toContain('60%');
        });

        it('explains suspended plan with reason', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'defending', deficit: 1, surplus_brigades: [], front_edge_count: 8 }],
                    threat_assessment: { overall_pressure: 'heavy' },
                    force_assessment: { total_brigades: 6, combat_effective: 5, total_surplus: 0 },
                    current_plan: {
                        objective_description: 'Op Thunder',
                        status: 'suspended',
                        suspension_reason: 'threat on flank increased',
                    },
                },
                'balanced',
                30,
                0,
            );
            expect(result.planExplanation).toContain('Op Thunder suspended');
            expect(result.planExplanation).toContain('threat on flank');
        });

        it('explains abandoned plan from last_plan_reason', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'balanced', deficit: 0, surplus_brigades: ['b1'], front_edge_count: 6 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 6, combat_effective: 6, total_surplus: 1 },
                    current_plan: null,
                    last_plan_action: 'abandoned',
                    last_plan_reason: 'viability dropped to 0.15',
                },
                'balanced',
                20,
                0,
            );
            expect(result.planExplanation).toContain('abandoned');
            expect(result.planExplanation).toContain('viability');
        });

        it('reports critical threat context', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'defending', deficit: 2, surplus_brigades: [], front_edge_count: 15 }],
                    threat_assessment: { overall_pressure: 'critical' },
                    force_assessment: { total_brigades: 5, combat_effective: 4, total_surplus: 0 },
                    current_plan: null,
                },
                'defensive',
                30,
                0,
            );
            expect(result.threatContext).toContain('critical pressure');
        });

        it('reports besieged posture summary', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'besieged', deficit: 3, surplus_brigades: [], front_edge_count: 20, corridor_width: 1 }],
                    threat_assessment: { overall_pressure: 'heavy' },
                    force_assessment: { total_brigades: 4, combat_effective: 3, total_surplus: 0 },
                    current_plan: null,
                },
                'defensive',
                50,
                0,
            );
            expect(result.postureSummary).toContain('siege');
            expect(result.militaryFactors.some(f => f.includes('siege'))).toBe(true);
        });

        it('returns all-null for null commanderState', () => {
            const result = deriveCorpsSituationAssessment(null, 'balanced', 10, 0);
            expect(result.postureSummary).toBeNull();
            expect(result.militaryFactors).toHaveLength(0);
            expect(result.institutionalFactors).toHaveLength(0);
            expect(result.planExplanation).toBeNull();
            expect(result.threatContext).toBeNull();
        });

        it('shows no-plan reason for defensive stance', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'balanced', deficit: 0, surplus_brigades: ['b1'], front_edge_count: 6 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 6, combat_effective: 6, total_surplus: 1 },
                    current_plan: null,
                    last_plan_action: 'none',
                    last_plan_reason: 'corps in defensive stance — no new plans',
                },
                'defensive',
                10,
                0,
            );
            expect(result.planExplanation).toContain('defensive stance');
        });

        it('reports low combat effectiveness as military factor', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'defending', deficit: 1, surplus_brigades: [], front_edge_count: 10 }],
                    threat_assessment: { overall_pressure: 'moderate' },
                    force_assessment: { total_brigades: 10, combat_effective: 4, total_surplus: 0 },
                    current_plan: null,
                },
                'balanced',
                20,
                0,
            );
            expect(result.militaryFactors.some(f => f.includes('4 of 10'))).toBe(true);
        });

        it('reports enemy concentration as threat context', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'balanced', deficit: 0, surplus_brigades: ['b1'], front_edge_count: 8 }],
                    threat_assessment: { overall_pressure: 'moderate', enemy_concentration_zones: ['zone_1'] },
                    force_assessment: { total_brigades: 6, combat_effective: 6, total_surplus: 1 },
                    current_plan: null,
                },
                'balanced',
                20,
                0,
            );
            expect(result.threatContext).toContain('concentration detected');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Wave 12: Primary Constraint Classification (Commander Explanation Wave 2)
    // ═══════════════════════════════════════════════════════════════════════

    describe('Wave 12: Primary Constraint Classification', () => {
        it('healthy projecting corps → primaryConstraint=none, dominantReason=null', () => {
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
        });

        it('besieged zone → primaryConstraint=siege (highest priority)', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'besieged', deficit: 3, surplus_brigades: [], front_edge_count: 20 }],
                    threat_assessment: { overall_pressure: 'critical' },
                    force_assessment: { total_brigades: 4, combat_effective: 3, total_surplus: 0 },
                    current_plan: null,
                },
                'defensive', 70, 8, // also exhausted + compromised — but siege wins
            );
            expect(result.primaryConstraint).toBe('siege');
            expect(result.dominantReason).toContain('siege');
        });

        it('critical threat pressure → primaryConstraint=threat_pressure', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'defending', deficit: 2, surplus_brigades: [], front_edge_count: 15 }],
                    threat_assessment: { overall_pressure: 'critical' },
                    force_assessment: { total_brigades: 6, combat_effective: 5, total_surplus: 0 },
                    current_plan: null,
                },
                'balanced', 50, 0,
            );
            expect(result.primaryConstraint).toBe('threat_pressure');
            expect(result.dominantReason).toContain('offensive threatens');
        });

        it('heavy threat pressure → primaryConstraint=threat_pressure', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'defending', deficit: 1, surplus_brigades: [], front_edge_count: 10 }],
                    threat_assessment: { overall_pressure: 'heavy' },
                    force_assessment: { total_brigades: 6, combat_effective: 6, total_surplus: 0 },
                    current_plan: null,
                },
                'balanced', 20, 0,
            );
            expect(result.primaryConstraint).toBe('threat_pressure');
            expect(result.dominantReason).toContain('Heavy enemy pressure');
        });

        it('must-hold deficit → primaryConstraint=defensive_duty (over force_condition)', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'defending', deficit: 2, surplus_brigades: [], front_edge_count: 10, is_must_hold: true }],
                    threat_assessment: { overall_pressure: 'moderate' },
                    force_assessment: { total_brigades: 6, combat_effective: 3, total_surplus: 0 },
                    current_plan: null,
                },
                'balanced', 45, 0, // also exhausted — but must-hold wins
            );
            expect(result.primaryConstraint).toBe('defensive_duty');
            expect(result.dominantReason).toContain('Critical positions');
        });

        it('garrison deficit > 2 → primaryConstraint=defensive_duty', () => {
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
            expect(result.dominantReason).toContain('4 brigades');
        });

        it('no surplus → primaryConstraint=defensive_duty', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'balanced', deficit: 0, surplus_brigades: [], front_edge_count: 8 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 6, combat_effective: 6, total_surplus: 0 },
                    current_plan: null,
                },
                'balanced', 20, 0,
            );
            expect(result.primaryConstraint).toBe('defensive_duty');
            expect(result.dominantReason).toContain('no surplus');
        });

        it('heavy exhaustion → primaryConstraint=force_condition', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'balanced', deficit: 0, surplus_brigades: ['b1'], front_edge_count: 6 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 6, combat_effective: 6, total_surplus: 1 },
                    current_plan: null,
                },
                'balanced', 65, 0,
            );
            expect(result.primaryConstraint).toBe('force_condition');
            expect(result.dominantReason).toContain('heavily exhausted');
        });

        it('low combat effectiveness → primaryConstraint=force_condition', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'balanced', deficit: 0, surplus_brigades: ['b1'], front_edge_count: 6 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 10, combat_effective: 4, total_surplus: 1 },
                    current_plan: null,
                },
                'balanced', 20, 0,
            );
            expect(result.primaryConstraint).toBe('force_condition');
            expect(result.dominantReason).toContain('4 of 10');
        });

        it('reorganize stance → primaryConstraint=institutional_strain', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'balanced', deficit: 0, surplus_brigades: ['b1'], front_edge_count: 6 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 6, combat_effective: 6, total_surplus: 1 },
                    current_plan: null,
                },
                'reorganize', 20, 0,
            );
            expect(result.primaryConstraint).toBe('institutional_strain');
            expect(result.dominantReason).toContain('reorganizing');
        });

        it('command compromised → primaryConstraint=institutional_strain', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'projecting', deficit: 0, surplus_brigades: ['b1', 'b2'], front_edge_count: 5 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 8, combat_effective: 8, total_surplus: 2 },
                    current_plan: null,
                },
                'balanced', 10, 7,
            );
            expect(result.primaryConstraint).toBe('institutional_strain');
            expect(result.dominantReason).toContain('compromised');
        });

        it('defensive stance → primaryConstraint=institutional_strain', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'balanced', deficit: 0, surplus_brigades: ['b1'], front_edge_count: 6 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 6, combat_effective: 6, total_surplus: 1 },
                    current_plan: null,
                },
                'defensive', 10, 0,
            );
            expect(result.primaryConstraint).toBe('institutional_strain');
            expect(result.dominantReason).toContain('defensive posture');
        });

        it('suspended plan → primaryConstraint=plan_lifecycle', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'balanced', deficit: 0, surplus_brigades: ['b1'], front_edge_count: 6 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 6, combat_effective: 6, total_surplus: 1 },
                    current_plan: { objective_description: 'Op Vrbas', status: 'suspended', suspension_reason: 'threat on flank' },
                },
                'balanced', 10, 0,
            );
            expect(result.primaryConstraint).toBe('plan_lifecycle');
            expect(result.dominantReason).toContain('suspended');
            expect(result.dominantReason).toContain('threat on flank');
        });

        it('abandoned plan from last_plan_reason → primaryConstraint=plan_lifecycle', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'balanced', deficit: 0, surplus_brigades: ['b1'], front_edge_count: 6 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 6, combat_effective: 6, total_surplus: 1 },
                    current_plan: null,
                    last_plan_action: 'abandoned',
                    last_plan_reason: 'viability dropped to 0.15',
                },
                'balanced', 10, 0,
            );
            expect(result.primaryConstraint).toBe('plan_lifecycle');
            expect(result.dominantReason).toContain('abandoned');
        });

        it('moderate threat with concentration → primaryConstraint=threat_pressure (lower priority)', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'balanced', deficit: 0, surplus_brigades: ['b1'], front_edge_count: 8 }],
                    threat_assessment: { overall_pressure: 'moderate', enemy_concentration_zones: ['zone_1'] },
                    force_assessment: { total_brigades: 6, combat_effective: 6, total_surplus: 1 },
                    current_plan: null,
                },
                'balanced', 10, 0,
            );
            expect(result.primaryConstraint).toBe('threat_pressure');
            expect(result.dominantReason).toContain('concentration detected');
        });

        it('strained command (not compromised) → primaryConstraint=institutional_strain (lowest non-none)', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'projecting', deficit: 0, surplus_brigades: ['b1', 'b2'], front_edge_count: 5 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 8, combat_effective: 8, total_surplus: 2 },
                    current_plan: null,
                },
                'balanced', 10, 3,
            );
            expect(result.primaryConstraint).toBe('institutional_strain');
            expect(result.dominantReason).toContain('under strain');
        });

        it('priority ordering: siege beats everything', () => {
            // Besieged + critical threat + exhausted + compromised + deficit → siege wins
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'besieged', deficit: 5, surplus_brigades: [], front_edge_count: 20, is_must_hold: true }],
                    threat_assessment: { overall_pressure: 'critical' },
                    force_assessment: { total_brigades: 4, combat_effective: 1, total_surplus: 0 },
                    current_plan: { objective_description: 'Op X', status: 'suspended', suspension_reason: 'lost' },
                },
                'defensive', 80, 10,
            );
            expect(result.primaryConstraint).toBe('siege');
        });

        it('null commanderState → primaryConstraint=none', () => {
            const result = deriveCorpsSituationAssessment(null, 'balanced', 10, 0);
            expect(result.primaryConstraint).toBe('none');
            expect(result.dominantReason).toBeNull();
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Wave 13: Relief Path (Commander Explanation Surfaces Wave 3)
    // ═══════════════════════════════════════════════════════════════════════

    describe('Wave 13: Relief Path', () => {
        it('siege → relief path mentions encirclement or corridor', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'besieged', deficit: 3, surplus_brigades: [], front_edge_count: 20 }],
                    threat_assessment: { overall_pressure: 'heavy' },
                    force_assessment: { total_brigades: 4, combat_effective: 3, total_surplus: 0 },
                    current_plan: null,
                },
                'defensive', 50, 0,
            );
            expect(result.reliefPath).not.toBeNull();
            expect(result.reliefPath).toContain('encirclement');
        });

        it('threat_pressure (critical) → relief path mentions defense or reinforcement', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'defending', deficit: 2, surplus_brigades: [], front_edge_count: 15 }],
                    threat_assessment: { overall_pressure: 'critical' },
                    force_assessment: { total_brigades: 6, combat_effective: 5, total_surplus: 0 },
                    current_plan: null,
                },
                'balanced', 30, 0,
            );
            expect(result.reliefPath).not.toBeNull();
            expect(result.reliefPath).toContain('reinforcement');
        });

        it('defensive_duty (deficit) → relief path mentions brigade count needed', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'defending', deficit: 4, surplus_brigades: [], front_edge_count: 12 }],
                    threat_assessment: { overall_pressure: 'moderate' },
                    force_assessment: { total_brigades: 5, combat_effective: 5, total_surplus: 0 },
                    current_plan: null,
                },
                'balanced', 20, 0,
            );
            expect(result.reliefPath).not.toBeNull();
            expect(result.reliefPath).toContain('4');
            expect(result.reliefPath).toContain('brigade');
        });

        it('force_condition (heavy exhaustion) → relief path mentions exhaustion % and recovery', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'balanced', deficit: 0, surplus_brigades: ['b1'], front_edge_count: 6 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 6, combat_effective: 6, total_surplus: 1 },
                    current_plan: null,
                },
                'balanced', 65, 0,
            );
            expect(result.reliefPath).not.toBeNull();
            expect(result.reliefPath).toContain('65%');
            expect(result.reliefPath).toContain('recover');
        });

        it('institutional_strain (compromised) → relief path mentions stabilize or decay', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'projecting', deficit: 0, surplus_brigades: ['b1', 'b2'], front_edge_count: 5 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 8, combat_effective: 8, total_surplus: 2 },
                    current_plan: null,
                },
                'balanced', 10, 7,
            );
            expect(result.reliefPath).not.toBeNull();
            expect(result.reliefPath!.toLowerCase()).toMatch(/stabilize|decay/);
        });

        it('institutional_strain (defensive stance) → relief path mentions stance change', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'balanced', deficit: 0, surplus_brigades: ['b1'], front_edge_count: 6 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 6, combat_effective: 6, total_surplus: 1 },
                    current_plan: null,
                },
                'defensive', 10, 0,
            );
            expect(result.reliefPath).not.toBeNull();
            expect(result.reliefPath).toContain('stance');
        });

        it('plan_lifecycle (suspended) → relief path mentions suspension cause', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'balanced', deficit: 0, surplus_brigades: ['b1'], front_edge_count: 6 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 6, combat_effective: 6, total_surplus: 1 },
                    current_plan: { objective_description: 'Op Vrbas', status: 'suspended', suspension_reason: 'threat on flank' },
                },
                'balanced', 10, 0,
            );
            expect(result.reliefPath).not.toBeNull();
            expect(result.reliefPath).toContain('suspension');
        });

        it('none (healthy) → relief path is null', () => {
            const result = deriveCorpsSituationAssessment(
                {
                    zone_assessments: [{ posture: 'projecting', deficit: 0, surplus_brigades: ['b1', 'b2'], front_edge_count: 5 }],
                    threat_assessment: { overall_pressure: 'low' },
                    force_assessment: { total_brigades: 8, combat_effective: 8, total_surplus: 3 },
                    current_plan: null,
                },
                'balanced', 10, 0,
            );
            expect(result.reliefPath).toBeNull();
        });

        it('null commanderState → relief path is null', () => {
            const result = deriveCorpsSituationAssessment(null, 'balanced', 10, 0);
            expect(result.reliefPath).toBeNull();
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Wave 14: Operation Constraint Context (Commander Explanation Surfaces Wave 4)
    // Tests that the existing situation assessment derivation produces the right
    // data shape for the OperationBriefingModal constraint context surface.
    // ═══════════════════════════════════════════════════════════════════════

});
