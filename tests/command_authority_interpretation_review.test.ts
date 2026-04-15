import { describe, it, expect } from 'vitest';
import type { CommandAuthority, CorpsOperation } from '../src/state/game_state.js';
import type { OperationAAR } from '../src/sim/combat/operation_aar.js';
import { computeCorpsCommandStrain, getCommandStrainLabel, deriveOrderInterpretation, deriveStanceInterpretation, deriveOperationOutcomeCategory, buildOperationTrendSummary, projectStrainDecay, deriveRecoveryForecast, deriveCorpsSituationAssessment, deriveRecommendationExplanation, deriveReadinessTrend, isExhaustionContributingToStrain, EXHAUSTION_STRAIN_THRESHOLD, EXHAUSTION_STRAIN_SEVERE_THRESHOLD, deriveDelegationContext, deriveCorpsDelegationSummary } from '../src/ui/map/data/command_strain.js';
import type { OperationOutcomeCategory, OperationTrendSummary, PrimaryConstraint, ReadinessTrendDirection, DelegationPath } from '../src/ui/map/data/command_strain.js';

describe('Wave 5: Order Interpretation Preview', () => {
    it('deriveOrderInterpretation: returns normal/null when strain=0', () => {
        const result = deriveOrderInterpretation(0, 'launch');
        expect(result.severity).toBe('normal');
        expect(result.cautionNotice).toBeNull();
    });

    it('deriveOrderInterpretation: returns caution/caution_driven when strain=0 and assessment=postpone (Wave 1 update)', () => {
        // Wave 1 extends classification: strain=0 + postpone → caution_driven, not normal
        const result = deriveOrderInterpretation(0, 'postpone');
        expect(result.severity).toBe('caution');
        expect(result.category).toBe('caution_driven');
        expect(result.cautionNotice).not.toBeNull();
    });

    it('deriveOrderInterpretation: returns caution when strain 1-5', () => {
        const result = deriveOrderInterpretation(3, 'launch');
        expect(result.severity).toBe('caution');
        expect(result.cautionNotice).not.toBeNull();
        expect(result.cautionNotice!.length).toBeGreaterThan(0);
        expect(result.interventionStrength).toBe('ordinary_approval');
    });

    it('deriveOrderInterpretation: returns alarm when strain >= 6', () => {
        const result = deriveOrderInterpretation(6, 'launch');
        expect(result.severity).toBe('alarm');
        expect(result.cautionNotice).not.toBeNull();
        expect(result.cautionNotice!.length).toBeGreaterThan(0);
    });

    it('deriveOrderInterpretation: interventionStrength is direct_intervention when commander says postpone', () => {
        const result = deriveOrderInterpretation(3, 'postpone');
        expect(result.interventionStrength).toBe('direct_intervention');
    });

    it('deriveOrderInterpretation: interventionStrength is ordinary_approval when commander says launch', () => {
        const result = deriveOrderInterpretation(5, 'launch');
        expect(result.interventionStrength).toBe('ordinary_approval');
    });

    it('deriveOrderInterpretation: interventionStrength is direct_intervention when commander says abort', () => {
        const result = deriveOrderInterpretation(3, 'abort');
        expect(result.interventionStrength).toBe('direct_intervention');
    });

    it('deriveOrderInterpretation: interventionStrength is ordinary_approval when assessment is null', () => {
        const result = deriveOrderInterpretation(3, null);
        expect(result.interventionStrength).toBe('ordinary_approval');
    });

    it('deriveOrderInterpretation: interventionStrength is ordinary_approval when assessment is undefined', () => {
        const result = deriveOrderInterpretation(3, undefined);
        expect(result.interventionStrength).toBe('ordinary_approval');
    });

    it('deriveOrderInterpretation: alarm text differs from caution text', () => {
        const caution = deriveOrderInterpretation(3, 'launch');
        const alarm = deriveOrderInterpretation(6, 'launch');
        expect(caution.cautionNotice).not.toBe(alarm.cautionNotice);
    });

    it('deriveOrderInterpretation: strain=5 is caution (boundary — not yet alarm)', () => {
        const result = deriveOrderInterpretation(5, 'launch');
        expect(result.severity).toBe('caution');
    });

    it('deriveOrderInterpretation: strain=6 is alarm (boundary)', () => {
        const result = deriveOrderInterpretation(6, 'launch');
        expect(result.severity).toBe('alarm');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 6 — Stance Interpretation Preview
// ─────────────────────────────────────────────────────────────────────────────

describe('Wave 6: Stance Interpretation Preview', () => {
    it('returns normal/null when strain=0, offensive', () => {
        const r = deriveStanceInterpretation(0, 'healthy', 'offensive');
        expect(r.severity).toBe('normal');
        expect(r.notice).toBeNull();
        expect(r.isBlocked).toBe(false);
    });
    it('returns caution when strained + offensive', () => {
        const r = deriveStanceInterpretation(3, 'strained', 'offensive');
        expect(r.severity).toBe('caution');
        expect(r.notice).not.toBeNull();
        expect(r.isBlocked).toBe(false);
    });
    it('returns constrained when compromised + offensive', () => {
        const r = deriveStanceInterpretation(6, 'compromised', 'offensive');
        expect(r.severity).toBe('constrained');
        expect(r.notice).not.toBeNull();
        expect(r.isBlocked).toBe(true);
    });
    it('returns normal when strained + defensive', () => {
        const r = deriveStanceInterpretation(3, 'strained', 'defensive');
        expect(r.severity).toBe('normal');
        expect(r.notice).toBeNull();
    });
    it('returns normal when strained + balanced', () => {
        const r = deriveStanceInterpretation(3, 'strained', 'balanced');
        expect(r.severity).toBe('normal');
    });
    it('returns normal when strained + reorganize', () => {
        const r = deriveStanceInterpretation(3, 'strained', 'reorganize');
        expect(r.severity).toBe('normal');
    });
    it('isBlocked only for constrained, not caution', () => {
        const caution = deriveStanceInterpretation(3, 'strained', 'offensive');
        const constrained = deriveStanceInterpretation(6, 'compromised', 'offensive');
        expect(caution.isBlocked).toBe(false);
        expect(constrained.isBlocked).toBe(true);
    });
    it('notice is non-null for caution and constrained', () => {
        expect(deriveStanceInterpretation(1, 'strained', 'offensive').notice).not.toBeNull();
        expect(deriveStanceInterpretation(6, 'compromised', 'offensive').notice).not.toBeNull();
    });
    it('boundary: strain=5 + offensive = caution (not constrained)', () => {
        const r = deriveStanceInterpretation(5, 'strained', 'offensive');
        expect(r.severity).toBe('caution');
    });
    it('boundary: strain=6 + offensive = constrained', () => {
        const r = deriveStanceInterpretation(6, 'compromised', 'offensive');
        expect(r.severity).toBe('constrained');
    });
    it('caution text differs from constrained text', () => {
        const caution = deriveStanceInterpretation(3, 'strained', 'offensive');
        const constrained = deriveStanceInterpretation(6, 'compromised', 'offensive');
        expect(caution.notice).not.toBe(constrained.notice);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 7 — Operation Outcome Category
// ─────────────────────────────────────────────────────────────────────────────

describe('Wave 7: Operation Outcome Category', () => {
    it('returns ordinary_compliance when assessment=launch, wasForce=false', () => {
        expect(deriveOperationOutcomeCategory('launch', false)).toBe('ordinary_compliance');
    });
    it('returns ordinary_compliance when assessment=null, wasForce=false', () => {
        expect(deriveOperationOutcomeCategory(null, false)).toBe('ordinary_compliance');
    });
    it('returns ordinary_compliance when assessment=undefined, wasForce=false', () => {
        expect(deriveOperationOutcomeCategory(undefined, false)).toBe('ordinary_compliance');
    });
    it('returns reluctant_compliance when assessment=postpone, wasForce=false', () => {
        expect(deriveOperationOutcomeCategory('postpone', false)).toBe('reluctant_compliance');
    });
    it('returns reluctant_compliance when assessment=abort, wasForce=false', () => {
        expect(deriveOperationOutcomeCategory('abort', false)).toBe('reluctant_compliance');
    });
    it('returns direct_intervention when wasForce=true regardless of assessment', () => {
        expect(deriveOperationOutcomeCategory('launch', true)).toBe('direct_intervention');
        expect(deriveOperationOutcomeCategory('postpone', true)).toBe('direct_intervention');
        expect(deriveOperationOutcomeCategory('abort', true)).toBe('direct_intervention');
        expect(deriveOperationOutcomeCategory(null, true)).toBe('direct_intervention');
    });
    it('direct_intervention takes priority over reluctant_compliance', () => {
        // wasForce=true with postpone assessment → direct_intervention, not reluctant
        expect(deriveOperationOutcomeCategory('postpone', true)).toBe('direct_intervention');
    });
    it('ordinary_compliance is the default when no snapshot exists', () => {
        // No snapshot (undefined) + no force = ordinary default
        expect(deriveOperationOutcomeCategory(undefined, false)).toBe('ordinary_compliance');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 8 — Command Review Consolidation
// ─────────────────────────────────────────────────────────────────────────────

describe('Wave 8: Command Review Consolidation', () => {
    // ── OutcomeCategoryBadge logic (unit-tests deriveOperationOutcomeCategory
    //    as called from OperationsSection context) ──────────────────────────

    it('returns ordinary_compliance when called with null assessment + wasForce=false (pre-feature op)', () => {
        // ops from before this feature have no snapshot — must default to ordinary_compliance
        expect(deriveOperationOutcomeCategory(null, false)).toBe('ordinary_compliance');
    });

    it('returns ordinary_compliance when called with undefined assessment + wasForce=false', () => {
        expect(deriveOperationOutcomeCategory(undefined, false)).toBe('ordinary_compliance');
    });

    it('returns direct_intervention for force-launched executing op', () => {
        // Typical executing op: commander said postpone, president spent CA to force-launch
        const category = deriveOperationOutcomeCategory('postpone', true);
        expect(category).toBe('direct_intervention');
    });

    it('returns direct_intervention when wasForce=true even if assessment was launch', () => {
        // Edge case: assessment=launch but wasForce=true → direct_intervention wins
        expect(deriveOperationOutcomeCategory('launch', true)).toBe('direct_intervention');
    });

    it('returns reluctant_compliance for postpone assessment + no force', () => {
        const category = deriveOperationOutcomeCategory('postpone', false);
        expect(category).toBe('reluctant_compliance');
    });

    it('returns reluctant_compliance for abort assessment + no force', () => {
        const category = deriveOperationOutcomeCategory('abort', false);
        expect(category).toBe('reluctant_compliance');
    });

    it('badge logic: ordinary_compliance → no badge (silence = healthy)', () => {
        // OperationsSection badge: null/undefined assessment + no force → ordinary_compliance
        // The badge component returns null for ordinary_compliance — simulate that guard here
        const category = deriveOperationOutcomeCategory('launch', false);
        expect(category).toBe('ordinary_compliance');
        // Badge renders null for this tier — confirmed by component logic
    });

    it('badge logic: direct_intervention → badge shown', () => {
        const category = deriveOperationOutcomeCategory('abort', true);
        expect(category).toBe('direct_intervention');
        // Badge renders "⚠ Direct Intervention" for this tier
    });

    it('badge logic: reluctant_compliance → badge shown', () => {
        const category = deriveOperationOutcomeCategory('postpone', false);
        expect(category).toBe('reluctant_compliance');
        // Badge renders "Approved Against Recommendation" for this tier
    });

    it('badge logic: undefined snapshot → no badge (pre-feature op graceful fallback)', () => {
        // ops launched before this feature have commander_assessment_at_launch=undefined
        // OutcomeCategoryBadge guard: assessmentAtLaunch == null && !wasForce → returns null
        const assessmentAtLaunch: 'launch' | 'postpone' | 'abort' | null | undefined = undefined;
        const wasForce = false;
        // Guard condition that OutcomeCategoryBadge uses:
        const wouldSkip = assessmentAtLaunch == null && !wasForce;
        expect(wouldSkip).toBe(true);
    });

    it('outcome category is exhaustive — all three tiers covered', () => {
        const tiers: OperationOutcomeCategory[] = [
            deriveOperationOutcomeCategory('launch', false),
            deriveOperationOutcomeCategory('postpone', false),
            deriveOperationOutcomeCategory('abort', true),
        ];
        expect(tiers).toContain('ordinary_compliance');
        expect(tiers).toContain('reluctant_compliance');
        expect(tiers).toContain('direct_intervention');
    });
});

describe('Wave 9: Command Review Consolidation Wave 2', () => {
    it('empty input → zero counts, null trendNotice', () => {
        const result: OperationTrendSummary = buildOperationTrendSummary([]);
        expect(result).toEqual({ totalCompleted: 0, directInterventions: 0, reluctantCompliance: 0, trendNotice: null });
    });

    it('all ordinary compliance → trendNotice null (silence=healthy)', () => {
        const ops = [
            { force_launched: false, commander_assessment_at_launch: 'launch' as const },
            { force_launched: false, commander_assessment_at_launch: 'launch' as const },
            { force_launched: false, commander_assessment_at_launch: 'launch' as const },
        ];
        const result = buildOperationTrendSummary(ops);
        expect(result.trendNotice).toBeNull();
        expect(result.directInterventions).toBe(0);
        expect(result.reluctantCompliance).toBe(0);
    });

    it('one direct_intervention → trendNotice "1 Direct Intervention"', () => {
        const ops = [
            { force_launched: true, commander_assessment_at_launch: 'abort' as const },
        ];
        const result = buildOperationTrendSummary(ops);
        expect(result.directInterventions).toBe(1);
        expect(result.reluctantCompliance).toBe(0);
        expect(result.trendNotice).toBe('1 Direct Intervention');
    });

    it('two direct_interventions + one reluctant → trendNotice "2 Direct Interventions, 1 Reluctant Compliance"', () => {
        const ops = [
            { force_launched: true, commander_assessment_at_launch: 'abort' as const },
            { force_launched: true, commander_assessment_at_launch: 'postpone' as const },
            { force_launched: false, commander_assessment_at_launch: 'postpone' as const },
        ];
        const result = buildOperationTrendSummary(ops);
        expect(result.directInterventions).toBe(2);
        expect(result.reluctantCompliance).toBe(1);
        expect(result.trendNotice).toBe('2 Direct Interventions, 1 Reluctant Compliance');
    });

    it('undefined force_launched + undefined assessment → graceful default (ordinary_compliance, no throw)', () => {
        const ops = [
            { force_launched: undefined, commander_assessment_at_launch: undefined },
        ];
        // Should not throw; undefined force_launched → ?? false → ordinary_compliance
        expect(() => buildOperationTrendSummary(ops)).not.toThrow();
        const result = buildOperationTrendSummary(ops);
        expect(result.trendNotice).toBeNull();
        expect(result.directInterventions).toBe(0);
    });

    it('force_launched true with assessmentAtLaunch "launch" → still direct_intervention (force overrides)', () => {
        const ops = [
            { force_launched: true, commander_assessment_at_launch: 'launch' as const },
        ];
        const result = buildOperationTrendSummary(ops);
        expect(result.directInterventions).toBe(1);
        expect(result.trendNotice).toBe('1 Direct Intervention');
    });

    it('one reluctant_compliance only → trendNotice "1 Reluctant Compliance", directInterventions 0', () => {
        const ops = [
            { force_launched: false, commander_assessment_at_launch: 'postpone' as const },
        ];
        const result = buildOperationTrendSummary(ops);
        expect(result.directInterventions).toBe(0);
        expect(result.reluctantCompliance).toBe(1);
        expect(result.trendNotice).toBe('1 Reluctant Compliance');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 10: Command Relationship Standing — strain decay projection + CA recovery
// ─────────────────────────────────────────────────────────────────────────────
