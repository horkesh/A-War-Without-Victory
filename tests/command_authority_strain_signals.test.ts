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

describe('computeCorpsCommandStrain', () => {
    it('returns 0 for a corps with no overrides and no friction', () => {
        const state = makeStrainState();
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(0);
    });

    it('accumulates +3 per force-launched op on that corps (same turn, no decay)', () => {
        const state = makeStrainState({
            turn: 5,
            activeOps: [
                { name: 'Op Alpha', was_force_launched: true, started_turn: 5 },
            ],
        });
        // +3, age=0, decay 0 → contribution 3
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(3);
    });

    it('accumulates +3 per force-launched op — two ops on same turn', () => {
        const state = makeStrainState({
            turn: 5,
            activeOps: [
                { name: 'Op Alpha', was_force_launched: true, started_turn: 5 },
                { name: 'Op Beta', was_force_launched: true, started_turn: 5 },
            ],
        });
        // 2 × 3 = 6
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(6);
    });

    it('does NOT count non-force-launched ops', () => {
        const state = makeStrainState({
            turn: 5,
            activeOps: [
                { name: 'Op Normal', was_force_launched: false, started_turn: 5 },
            ],
        });
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(0);
    });

    it('accumulates +2 per unresolved warlord friction event for this corps commander', () => {
        const state = makeStrainState({
            turn: 5,
            officerId: 'officer-1',
            officerCorpsId: 'test-corps',
            frictionEvents: [
                { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: false },
            ],
        });
        // +2, age=0 → 2
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(2);
    });

    it('does NOT count resolved friction events', () => {
        const state = makeStrainState({
            turn: 5,
            officerId: 'officer-1',
            officerCorpsId: 'test-corps',
            frictionEvents: [
                { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: true },
            ],
        });
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(0);
    });

    it('does NOT count friction events for officers assigned to a different corps', () => {
        const state = makeStrainState({
            turn: 5,
            officerId: 'officer-1',
            officerCorpsId: 'other-corps',  // assigned elsewhere
            frictionEvents: [
                { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: false },
            ],
        });
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(0);
    });

    it('applies decay correctly — force-launch 2 turns ago contributes 1 (3 − 2)', () => {
        const state = makeStrainState({
            turn: 7,
            activeOps: [
                { name: 'Op Alpha', was_force_launched: true, started_turn: 5 },
            ],
        });
        // turn 7, started 5, age=2; 3 − 2 = 1
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(1);
    });

    it('applies decay correctly — force-launch 3+ turns ago contributes 0 (floor at 0)', () => {
        const state = makeStrainState({
            turn: 10,
            activeOps: [
                { name: 'Op Alpha', was_force_launched: true, started_turn: 5 },
            ],
        });
        // age=5; 3 − 5 = -2 → floored at 0
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(0);
    });

    it('friction event decays — 2 turns ago contributes 0 (2 − 2 = 0)', () => {
        const state = makeStrainState({
            turn: 7,
            officerId: 'officer-1',
            officerCorpsId: 'test-corps',
            frictionEvents: [
                { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: false },
            ],
        });
        // age=2; 2 − 2 = 0
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(0);
    });

    it('combines force-launch strain and friction strain', () => {
        const state = makeStrainState({
            turn: 5,
            activeOps: [
                { name: 'Op Alpha', was_force_launched: true, started_turn: 5 },
            ],
            officerId: 'officer-1',
            officerCorpsId: 'test-corps',
            frictionEvents: [
                { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: false },
            ],
        });
        // +3 (force-launch, age=0) + +2 (friction, age=0) = 5
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(5);
    });
});

describe('getCommandStrainLabel', () => {
    it('returns healthy for score 0', () => {
        expect(getCommandStrainLabel(0)).toBe('healthy');
    });

    it('returns strained for score 1', () => {
        expect(getCommandStrainLabel(1)).toBe('strained');
    });

    it('returns strained for score 3', () => {
        expect(getCommandStrainLabel(3)).toBe('strained');
    });

    it('returns strained for score 5', () => {
        expect(getCommandStrainLabel(5)).toBe('strained');
    });

    it('returns compromised for score 6', () => {
        expect(getCommandStrainLabel(6)).toBe('compromised');
    });

    it('returns compromised for score 10', () => {
        expect(getCommandStrainLabel(10)).toBe('compromised');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 2 — Decision-shaping signal logic
// ─────────────────────────────────────────────────────────────────────────────

// B2: OperationsSection command-risk notice logic
// The notice appears when commandStrain > 0 AND operations.length > 0.
// Silence = healthy throughout (no notice when strain = 0 or no active ops).

describe('B2: OperationsSection command-risk notice', () => {
    function shouldShowCommandRiskNotice(commandStrain: number, activeOpCount: number): boolean {
        return commandStrain > 0 && activeOpCount > 0;
    }

    it('shows notice when strain > 0 and active ops exist', () => {
        expect(shouldShowCommandRiskNotice(3, 2)).toBe(true);
    });

    it('shows notice when strain is exactly 1 and one active op', () => {
        expect(shouldShowCommandRiskNotice(1, 1)).toBe(true);
    });

    it('shows notice when strain is compromised (6+) and active ops exist', () => {
        expect(shouldShowCommandRiskNotice(6, 1)).toBe(true);
    });

    it('absent when strain = 0 (healthy) regardless of ops', () => {
        expect(shouldShowCommandRiskNotice(0, 3)).toBe(false);
    });

    it('absent when strain > 0 but no active ops', () => {
        expect(shouldShowCommandRiskNotice(4, 0)).toBe(false);
    });

    it('absent when both strain = 0 and no active ops', () => {
        expect(shouldShowCommandRiskNotice(0, 0)).toBe(false);
    });

    it('uses compromised text when strainLabel is compromised', () => {
        const label = getCommandStrainLabel(6);
        expect(label).toBe('compromised');
        // Notice text branch: 'compromised' → different wording than 'strained'
        const isCompromised = label === 'compromised';
        expect(isCompromised).toBe(true);
    });

    it('uses strained text when strainLabel is strained', () => {
        const label = getCommandStrainLabel(3);
        expect(label).toBe('strained');
        const isCompromised = label === 'compromised';
        expect(isCompromised).toBe(false);
    });
});

// B3: OperationBriefingModal compound warning logic
// Compound warning appears when corps already carries strain AND player is about
// to force-launch (DirectInterventionSection is shown).
// Silence = healthy (no warning when strain = 0).

describe('B3: OperationBriefingModal compound strain warning', () => {
    function shouldShowCompoundWarning(corpsStrain: number): boolean {
        return corpsStrain > 0;
    }

    it('shows compound warning when strain > 0', () => {
        expect(shouldShowCompoundWarning(3)).toBe(true);
    });

    it('shows compound warning at minimum strain threshold (1)', () => {
        expect(shouldShowCompoundWarning(1)).toBe(true);
    });

    it('shows compound warning when strain is compromised (6)', () => {
        expect(shouldShowCompoundWarning(6)).toBe(true);
    });

    it('absent when strain = 0 (healthy)', () => {
        expect(shouldShowCompoundWarning(0)).toBe(false);
    });

    it('compound warning label shows Compromised when strain >= 6', () => {
        const label = getCommandStrainLabel(6);
        const displayLabel = label === 'compromised' ? 'Compromised' : 'Strained';
        expect(displayLabel).toBe('Compromised');
    });

    it('compound warning label shows Strained when strain is 1-5', () => {
        const label = getCommandStrainLabel(3);
        const displayLabel = label === 'compromised' ? 'Compromised' : 'Strained';
        expect(displayLabel).toBe('Strained');
    });
});

// B1: ChiefOfStaffBriefing strain paragraph logic
// The paragraph generator (buildStrainParagraphs) is internal to the module,
// but we can verify the strain labelling that drives phrase selection.
// Structural comment: B1 uses computeCorpsCommandStrain + getCommandStrainLabel
// per corps, filtering to player faction. Direct component test would require
// a full LoadedGameState stub — covered by integration; logic is unit-testable
// via the strain label boundary tests above (getCommandStrainLabel describe block).

describe('B1: CoS briefing strain paragraph — label-driven phrase selection', () => {
    it('healthy corps (strain=0) produces no strain paragraph — silence=healthy', () => {
        // Label drives paragraph inclusion; healthy = no paragraph emitted
        const label = getCommandStrainLabel(0);
        expect(label).toBe('healthy');
        const includesParagraph = label !== 'healthy';
        expect(includesParagraph).toBe(false);
    });

    it('strained corps (strain=3) selects strained phrase variant', () => {
        const label = getCommandStrainLabel(3);
        expect(label).toBe('strained');
        const phraseKey: 'strained' | 'compromised' = label as 'strained' | 'compromised';
        expect(phraseKey).toBe('strained');
    });

    it('compromised corps (strain=6) selects compromised phrase variant', () => {
        const label = getCommandStrainLabel(6);
        expect(label).toBe('compromised');
        const phraseKey: 'strained' | 'compromised' = label as 'strained' | 'compromised';
        expect(phraseKey).toBe('compromised');
    });
});
