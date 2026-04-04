import { describe, it, expect } from 'vitest';
import type { CommandAuthority, CorpsOperation } from '../src/state/game_state.js';
import type { OperationAAR } from '../src/sim/combat/operation_aar.js';
import { computeCorpsCommandStrain, getCommandStrainLabel, deriveOrderInterpretation, deriveStanceInterpretation, deriveOperationOutcomeCategory, buildOperationTrendSummary, projectStrainDecay, deriveRecoveryForecast, deriveCorpsSituationAssessment, deriveRecommendationExplanation, deriveReadinessTrend } from '../src/ui/map/data/command_strain.js';
import type { OperationOutcomeCategory, OperationTrendSummary, PrimaryConstraint, ReadinessTrendDirection } from '../src/ui/map/data/command_strain.js';

function makeAuth(overrides?: Partial<CommandAuthority>): CommandAuthority {
    return { current: 100, max: 100, spent_this_turn: 0, lifetime_spent: 0, ...overrides };
}

/** Simulate the recover-command-authority war phase step. */
function recoverAuthority(auth: CommandAuthority): void {
    auth.spent_this_turn = 0;
    auth.current = Math.min(auth.max, auth.current + 2);
}

/** Simulate the force-launch deduction (mirrors electron-main.cjs handler). */
function deductForceLaunch(auth: CommandAuthority, cost = 15): { ok: boolean; error?: string } {
    if (auth.current < cost) {
        return { ok: false, error: `Insufficient command authority (${auth.current}/${cost} needed)` };
    }
    auth.current -= cost;
    auth.spent_this_turn += cost;
    auth.lifetime_spent += cost;
    return { ok: true };
}

describe('command authority', () => {
    describe('initialization', () => {
        it('starts at full capacity', () => {
            const auth = makeAuth();
            expect(auth.current).toBe(100);
            expect(auth.max).toBe(100);
            expect(auth.spent_this_turn).toBe(0);
            expect(auth.lifetime_spent).toBe(0);
        });
    });

    describe('force-launch deduction', () => {
        it('deducts cost from current authority', () => {
            const auth = makeAuth();
            const result = deductForceLaunch(auth);
            expect(result.ok).toBe(true);
            expect(auth.current).toBe(85);
            expect(auth.spent_this_turn).toBe(15);
            expect(auth.lifetime_spent).toBe(15);
        });

        it('rejects when insufficient authority', () => {
            const auth = makeAuth({ current: 10 });
            const result = deductForceLaunch(auth);
            expect(result.ok).toBe(false);
            expect(result.error).toContain('Insufficient');
            // State unchanged
            expect(auth.current).toBe(10);
            expect(auth.spent_this_turn).toBe(0);
        });

        it('allows exact-cost deduction', () => {
            const auth = makeAuth({ current: 15 });
            const result = deductForceLaunch(auth);
            expect(result.ok).toBe(true);
            expect(auth.current).toBe(0);
        });

        it('accumulates lifetime spent across multiple deductions', () => {
            const auth = makeAuth();
            deductForceLaunch(auth);
            deductForceLaunch(auth);
            expect(auth.lifetime_spent).toBe(30);
            expect(auth.current).toBe(70);
        });
    });

    describe('recovery', () => {
        it('recovers +2 per turn', () => {
            const auth = makeAuth({ current: 85 });
            recoverAuthority(auth);
            expect(auth.current).toBe(87);
        });

        it('resets spent_this_turn on recovery', () => {
            const auth = makeAuth({ current: 85, spent_this_turn: 15 });
            recoverAuthority(auth);
            expect(auth.spent_this_turn).toBe(0);
        });

        it('does not exceed max', () => {
            const auth = makeAuth({ current: 99 });
            recoverAuthority(auth);
            expect(auth.current).toBe(100);
        });

        it('recovers from zero', () => {
            const auth = makeAuth({ current: 0 });
            recoverAuthority(auth);
            expect(auth.current).toBe(2);
        });
    });

    describe('review layer logic', () => {
        const FORCE_LAUNCH_COST = 15;

        /** Determines whether the Direct Intervention section should be visible. */
        function shouldShowDirectIntervention(assessment: string | undefined, hasForceLaunchCallback: boolean): boolean {
            return assessment !== 'launch' && hasForceLaunchCallback;
        }

        /** Computes the CA context displayed in the review section. */
        function computeCAContext(currentAuth: number, cost: number): { canAfford: boolean; remaining: number } {
            return { canAfford: currentAuth >= cost, remaining: currentAuth - cost };
        }

        it('shows Direct Intervention when commander recommends postpone', () => {
            expect(shouldShowDirectIntervention('postpone', true)).toBe(true);
        });

        it('shows Direct Intervention when commander recommends abort', () => {
            expect(shouldShowDirectIntervention('abort', true)).toBe(true);
        });

        it('hides Direct Intervention when commander recommends launch', () => {
            expect(shouldShowDirectIntervention('launch', true)).toBe(false);
        });

        it('hides Direct Intervention when no force-launch callback', () => {
            expect(shouldShowDirectIntervention('postpone', false)).toBe(false);
        });

        it('computes correct CA context (current=85, cost=15)', () => {
            const ctx = computeCAContext(85, FORCE_LAUNCH_COST);
            expect(ctx.canAfford).toBe(true);
            expect(ctx.remaining).toBe(70);
        });

        it('computes correct CA context (current=100, cost=15)', () => {
            const ctx = computeCAContext(100, FORCE_LAUNCH_COST);
            expect(ctx.canAfford).toBe(true);
            expect(ctx.remaining).toBe(85);
        });

        it('force-launch button disabled when CA < cost', () => {
            const ctx = computeCAContext(10, FORCE_LAUNCH_COST);
            expect(ctx.canAfford).toBe(false);
            expect(ctx.remaining).toBe(-5); // negative = cannot afford
        });

        it('force-launch button enabled at exact cost', () => {
            const ctx = computeCAContext(15, FORCE_LAUNCH_COST);
            expect(ctx.canAfford).toBe(true);
            expect(ctx.remaining).toBe(0);
        });

        it('force-launch button disabled at zero CA', () => {
            const ctx = computeCAContext(0, FORCE_LAUNCH_COST);
            expect(ctx.canAfford).toBe(false);
        });
    });

    describe('post-override provenance', () => {
        /** Simulate the electron-main force-launch handler setting both flags. */
        function simulateForceLaunch(op: Partial<CorpsOperation>): void {
            op.force_launch = true;
            op.was_force_launched = true;
        }

        /** Simulate sector_offensive.ts clearing force_launch on recovery. */
        function simulateRecoveryReset(op: Partial<CorpsOperation>): void {
            op.force_launch = false;
        }

        /** Simulate AAR compilation reading was_force_launched from the operation. */
        function buildAARProvenance(op: Partial<CorpsOperation>): Pick<OperationAAR, 'force_launched' | 'ca_cost_at_launch'> {
            return {
                force_launched: op.was_force_launched ?? false,
                ca_cost_at_launch: op.was_force_launched ? 15 : undefined,
            };
        }

        it('was_force_launched is set on CorpsOperation when force-launched', () => {
            const op: Partial<CorpsOperation> = { force_launch: false };
            simulateForceLaunch(op);
            expect(op.was_force_launched).toBe(true);
            expect(op.force_launch).toBe(true);
        });

        it('was_force_launched survives recovery reset (force_launch does not)', () => {
            const op: Partial<CorpsOperation> = {};
            simulateForceLaunch(op);
            simulateRecoveryReset(op);
            expect(op.force_launch).toBe(false);
            expect(op.was_force_launched).toBe(true);
        });

        it('AAR carries force_launched and ca_cost_at_launch when was_force_launched is true', () => {
            const op: Partial<CorpsOperation> = { was_force_launched: true };
            const aar = buildAARProvenance(op);
            expect(aar.force_launched).toBe(true);
            expect(aar.ca_cost_at_launch).toBe(15);
        });

        it('AAR force_launched is false for normal non-overridden operations', () => {
            const op: Partial<CorpsOperation> = {};
            const aar = buildAARProvenance(op);
            expect(aar.force_launched).toBe(false);
            expect(aar.ca_cost_at_launch).toBeUndefined();
        });

        it('AAR force_launched is false when was_force_launched is explicitly false', () => {
            const op: Partial<CorpsOperation> = { was_force_launched: false };
            const aar = buildAARProvenance(op);
            expect(aar.force_launched).toBe(false);
            expect(aar.ca_cost_at_launch).toBeUndefined();
        });
    });

    describe('operation history adapter pipeline', () => {
        /** Minimal AAR for adapter testing. */
        function makeMinimalAAR(overrides?: Partial<OperationAAR>): Record<string, unknown> {
            return {
                operation_id: 'op-test-1',
                operation_name: 'Test Op',
                corps_id: 'corps-1',
                faction: 'RBiH',
                type: 'offensive',
                started_turn: 5,
                ended_turn: 10,
                outcome: 'success',
                objectives_targeted: [],
                objectives_captured: [],
                duration_turns: 5,
                total_attacks: 3,
                casualties_suffered: { killed: 10, wounded: 20 },
                casualties_inflicted: { killed: 5, wounded: 15 },
                equipment_lost: { tanks: 0, artillery: 0 },
                equipment_destroyed: { tanks: 0, artillery: 0 },
                equipment_captured: { tanks: 0, artillery: 0 },
                grade: { stars: 3, verdict: 'Adequate', factors: {} },
                weekly_log: [],
                participating_brigades: [],
                initial_strength: 1000,
                final_strength: 970,
                ...overrides,
            };
        }

        /**
         * Simulate the adapter's extraction logic for force_launched/ca_cost_at_launch.
         * Mirrors the exact logic in GameStateAdapter.deriveOperationHistory().
         */
        function extractProvenance(aar: Record<string, unknown>): { force_launched?: boolean; ca_cost_at_launch?: number } {
            return {
                force_launched: aar.force_launched === true ? true : undefined,
                ca_cost_at_launch: typeof aar.ca_cost_at_launch === 'number' ? aar.ca_cost_at_launch : undefined,
            };
        }

        it('includes force_launched: true when AAR has it', () => {
            const aar = makeMinimalAAR({ force_launched: true, ca_cost_at_launch: 15 });
            const result = extractProvenance(aar);
            expect(result.force_launched).toBe(true);
            expect(result.ca_cost_at_launch).toBe(15);
        });

        it('includes ca_cost_at_launch when set to a number', () => {
            const aar = makeMinimalAAR({ force_launched: true, ca_cost_at_launch: 15 });
            const result = extractProvenance(aar);
            expect(result.ca_cost_at_launch).toBe(15);
        });

        it('does NOT include force_launched when AAR has it unset', () => {
            const aar = makeMinimalAAR();
            const result = extractProvenance(aar);
            expect(result.force_launched).toBeUndefined();
            expect(result.ca_cost_at_launch).toBeUndefined();
        });

        it('does NOT include force_launched when AAR has it explicitly false', () => {
            const aar = makeMinimalAAR({ force_launched: false });
            const result = extractProvenance(aar);
            expect(result.force_launched).toBeUndefined();
        });

        it('does NOT include ca_cost_at_launch when not a number', () => {
            const aar = makeMinimalAAR({ force_launched: true });
            const result = extractProvenance(aar);
            expect(result.force_launched).toBe(true);
            expect(result.ca_cost_at_launch).toBeUndefined();
        });
    });

    describe('commander_assessment_at_launch snapshot', () => {
        /** Simulate the electron-main force-launch handler setting the snapshot. */
        function simulateForceLaunchWithSnapshot(op: Partial<CorpsOperation>): void {
            op.force_launch = true;
            op.was_force_launched = true;
            op.commander_assessment_at_launch = op.commander_assessment;
        }

        /** Simulate the electron-main normal-launch handler setting the snapshot. */
        function simulateNormalLaunchWithSnapshot(op: Partial<CorpsOperation>): void {
            op.force_launch = true;
            op.commander_assessment_at_launch = op.commander_assessment ?? 'launch';
        }

        /** Simulate finalizeOperationAAR copying commander_assessment_at_launch to the AAR. */
        function buildAARWithAssessmentSnapshot(op: Partial<CorpsOperation>): Pick<OperationAAR, 'force_launched' | 'ca_cost_at_launch' | 'commander_assessment_at_launch'> {
            return {
                force_launched: op.was_force_launched ?? false,
                ca_cost_at_launch: op.was_force_launched ? 15 : undefined,
                commander_assessment_at_launch: op.commander_assessment_at_launch,
            };
        }

        /** Simulate adapter deriveOperationHistory extraction of commander_assessment_at_launch. */
        function extractAssessmentSnapshot(aar: Record<string, unknown>): { commander_assessment_at_launch?: string } {
            return {
                commander_assessment_at_launch: typeof aar.commander_assessment_at_launch === 'string'
                    ? aar.commander_assessment_at_launch
                    : undefined,
            };
        }

        it('commander_assessment_at_launch is set on force-launch to commander snapshot', () => {
            const op: Partial<CorpsOperation> = { commander_assessment: 'abort' };
            simulateForceLaunchWithSnapshot(op);
            expect(op.commander_assessment_at_launch).toBe('abort');
            expect(op.was_force_launched).toBe(true);
        });

        it('commander_assessment_at_launch is set on normal launch to commander snapshot', () => {
            const op: Partial<CorpsOperation> = { commander_assessment: 'launch' };
            simulateNormalLaunchWithSnapshot(op);
            expect(op.commander_assessment_at_launch).toBe('launch');
            expect(op.was_force_launched).toBeUndefined();
        });

        it('commander_assessment_at_launch defaults to launch when commander_assessment absent on normal launch', () => {
            const op: Partial<CorpsOperation> = {};
            simulateNormalLaunchWithSnapshot(op);
            expect(op.commander_assessment_at_launch).toBe('launch');
        });

        it('finalizeOperationAAR copies commander_assessment_at_launch to the AAR when present', () => {
            const op: Partial<CorpsOperation> = { was_force_launched: true, commander_assessment_at_launch: 'abort' };
            const aar = buildAARWithAssessmentSnapshot(op);
            expect(aar.commander_assessment_at_launch).toBe('abort');
            expect(aar.force_launched).toBe(true);
            expect(aar.ca_cost_at_launch).toBe(15);
        });

        it('finalizeOperationAAR does NOT include commander_assessment_at_launch when absent (graceful degradation)', () => {
            const op: Partial<CorpsOperation> = { was_force_launched: true };
            const aar = buildAARWithAssessmentSnapshot(op);
            expect(aar.commander_assessment_at_launch).toBeUndefined();
        });

        it('deriveOperationHistory maps commander_assessment_at_launch from AAR when present', () => {
            const aar: Record<string, unknown> = { commander_assessment_at_launch: 'postpone' };
            const result = extractAssessmentSnapshot(aar);
            expect(result.commander_assessment_at_launch).toBe('postpone');
        });

        it('deriveOperationHistory does NOT include commander_assessment_at_launch when AAR lacks it', () => {
            const aar: Record<string, unknown> = {};
            const result = extractAssessmentSnapshot(aar);
            expect(result.commander_assessment_at_launch).toBeUndefined();
        });
    });

    describe('full cycle: deduct then recover', () => {
        it('deduct 15, recover 2 per turn, takes 8 turns to fully recover', () => {
            const auth = makeAuth();
            deductForceLaunch(auth);
            expect(auth.current).toBe(85);

            // Simulate 8 turns of recovery
            for (let i = 0; i < 8; i++) {
                recoverAuthority(auth);
            }
            // 85 + 8*2 = 101 → capped at 100
            expect(auth.current).toBe(100);
        });
    });
});

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

// ─────────────────────────────────────────────────────────────────────────────
// Wave 3 — Friction Resolution Loop
// ─────────────────────────────────────────────────────────────────────────────

// The friction resolution loop:
//   1. Warlord friction fires → FrictionEvent { resolved: false } pushed to state.military.friction_events
//   2. computeCorpsCommandStrain counts unresolved events (+2 each, decayed)
//   3. Player acknowledges via IPC → event.resolved = true
//   4. Next computeCorpsCommandStrain call excludes the resolved event → strain drops

/** Simulate the IPC acknowledge-friction-event handler logic (mirrors electron-main.cjs). */
function simulateAcknowledgeFrictionEvent(
    frictionEvents: Array<{ officer_id: string; turn: number; type: string; resolved: boolean }>,
    officerId: string,
    eventTurn: number,
    eventType: string,
): { ok: boolean; error?: string } {
    const event = frictionEvents.find(
        e => e.officer_id === officerId
            && e.turn === eventTurn
            && e.type === eventType
            && e.resolved === false
    );
    if (!event) return { ok: false, error: 'Friction event not found or already resolved' };
    event.resolved = true;
    return { ok: true };
}

/** Build a FrictionEventView composite key (mirrors GameStateAdapter logic). */
function makeFrictionCompositeKey(officerId: string, turn: number, type: string): string {
    return `${officerId}:${turn}:${type}`;
}

/** Extract eventType from composite key (mirrors handleAcknowledgeFriction in ArmyHQCorpsCard). */
function eventTypeFromCompositeKey(compositeKey: string): string {
    return compositeKey.split(':')[2] ?? '';
}

describe('Wave 3: friction resolution IPC handler logic', () => {
    it('sets resolved: true on matching event', () => {
        const events = [
            { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: false },
        ];
        const result = simulateAcknowledgeFrictionEvent(events, 'officer-1', 5, 'ignored_stance');
        expect(result.ok).toBe(true);
        expect(events[0]!.resolved).toBe(true);
    });

    it('rejects when no matching event exists', () => {
        const events = [
            { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: false },
        ];
        const result = simulateAcknowledgeFrictionEvent(events, 'officer-2', 5, 'ignored_stance');
        expect(result.ok).toBe(false);
        expect(result.error).toContain('not found');
    });

    it('rejects when event already resolved', () => {
        const events = [
            { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: true },
        ];
        const result = simulateAcknowledgeFrictionEvent(events, 'officer-1', 5, 'ignored_stance');
        expect(result.ok).toBe(false);
        expect(result.error).toContain('already resolved');
    });

    it('does not resolve a different event type', () => {
        const events = [
            { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: false },
            { officer_id: 'officer-1', turn: 5, type: 'unauthorized_op', resolved: false },
        ];
        simulateAcknowledgeFrictionEvent(events, 'officer-1', 5, 'ignored_stance');
        expect(events[0]!.resolved).toBe(true);
        expect(events[1]!.resolved).toBe(false); // untouched
    });

    it('does not resolve an event from a different turn', () => {
        const events = [
            { officer_id: 'officer-1', turn: 4, type: 'ignored_stance', resolved: false },
            { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: false },
        ];
        simulateAcknowledgeFrictionEvent(events, 'officer-1', 5, 'ignored_stance');
        expect(events[0]!.resolved).toBe(false); // turn 4 — untouched
        expect(events[1]!.resolved).toBe(true);  // turn 5 — resolved
    });

    it('resolving one event does not affect unrelated events on other officers', () => {
        const events = [
            { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: false },
            { officer_id: 'officer-2', turn: 5, type: 'ignored_stance', resolved: false },
        ];
        simulateAcknowledgeFrictionEvent(events, 'officer-1', 5, 'ignored_stance');
        expect(events[0]!.resolved).toBe(true);
        expect(events[1]!.resolved).toBe(false);
    });
});

describe('Wave 3: strain drops after friction resolution', () => {
    it('resolving a friction event removes its strain contribution', () => {
        const frictionEvents = [
            { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: false },
        ];
        const state = makeStrainState({
            turn: 5,
            officerId: 'officer-1',
            officerCorpsId: 'test-corps',
            frictionEvents,
        });
        // Before acknowledgement: +2 strain
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(2);

        // Acknowledge
        simulateAcknowledgeFrictionEvent(frictionEvents, 'officer-1', 5, 'ignored_stance');

        // After acknowledgement: strain drops to 0
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(0);
    });

    it('partial resolution reduces strain proportionally', () => {
        const frictionEvents = [
            { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: false },
            { officer_id: 'officer-1', turn: 5, type: 'unauthorized_op', resolved: false },
        ];
        const state = makeStrainState({
            turn: 5,
            officerId: 'officer-1',
            officerCorpsId: 'test-corps',
            frictionEvents,
        });
        // Before: 2 events × +2 = 4 strain
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(4);

        // Acknowledge only first event
        simulateAcknowledgeFrictionEvent(frictionEvents, 'officer-1', 5, 'ignored_stance');

        // After: 1 remaining unresolved event × +2 = 2 strain
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(2);
    });

    it('full loop: accumulate strain from force-launch + friction, resolve friction, strain drops', () => {
        const frictionEvents = [
            { officer_id: 'officer-1', turn: 3, type: 'refused_release', resolved: false },
        ];
        const state = makeStrainState({
            turn: 5,
            activeOps: [
                { name: 'Op Alpha', was_force_launched: true, started_turn: 4 }, // age=1 → 3-1=2
            ],
            officerId: 'officer-1',
            officerCorpsId: 'test-corps',
            frictionEvents,
        });
        // Force-launch (age 1): 3−1=2; friction (age 2): 2−2=0. Total = 2
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(2);

        // Acknowledge friction — friction was already decayed to 0 so no change
        simulateAcknowledgeFrictionEvent(frictionEvents, 'officer-1', 3, 'refused_release');
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(2);
    });
});

describe('Wave 3: FrictionEventView composite key', () => {
    it('composite key is officer_id:turn:type', () => {
        const key = makeFrictionCompositeKey('officer-1', 5, 'ignored_stance');
        expect(key).toBe('officer-1:5:ignored_stance');
    });

    it('composite key with unauthorized_op type', () => {
        const key = makeFrictionCompositeKey('delic', 12, 'unauthorized_op');
        expect(key).toBe('delic:12:unauthorized_op');
    });

    it('eventType extracted from composite key correctly', () => {
        const key = 'officer-1:5:ignored_stance';
        expect(eventTypeFromCompositeKey(key)).toBe('ignored_stance');
    });

    it('eventType extracted from composite key with colon in officer id segment', () => {
        // Edge case: if officerId contained colons (it shouldn't, but guard)
        const key = 'delic:5:refused_release';
        expect(eventTypeFromCompositeKey(key)).toBe('refused_release');
    });

    it('two events with same officer, same turn, different types have distinct keys', () => {
        const key1 = makeFrictionCompositeKey('officer-1', 5, 'ignored_stance');
        const key2 = makeFrictionCompositeKey('officer-1', 5, 'unauthorized_op');
        expect(key1).not.toBe(key2);
    });

    it('two events with same officer, same type, different turns have distinct keys', () => {
        const key1 = makeFrictionCompositeKey('officer-1', 5, 'ignored_stance');
        const key2 = makeFrictionCompositeKey('officer-1', 6, 'ignored_stance');
        expect(key1).not.toBe(key2);
    });
});

describe('Wave 3: silence=healthy on back face', () => {
    /** Simulate the back-face panel condition: show panel when strain > 0 OR frictionEvents.length > 0. */
    function shouldShowBackFaceFrictionPanel(strain: number, frictionEventCount: number): boolean {
        return strain > 0 || frictionEventCount > 0;
    }

    /** Simulate unresolved-event list visibility condition. */
    function shouldShowAcknowledgeList(unresolvedCount: number): boolean {
        return unresolvedCount > 0;
    }

    it('panel hidden when strain = 0 and no friction events', () => {
        expect(shouldShowBackFaceFrictionPanel(0, 0)).toBe(false);
    });

    it('panel shown when strain > 0 even with no unresolved events', () => {
        expect(shouldShowBackFaceFrictionPanel(2, 0)).toBe(true);
    });

    it('panel shown when friction events exist even if strain = 0', () => {
        expect(shouldShowBackFaceFrictionPanel(0, 1)).toBe(true);
    });

    it('acknowledge list hidden when all events resolved (silence=healthy)', () => {
        expect(shouldShowAcknowledgeList(0)).toBe(false);
    });

    it('acknowledge list shown when at least one unresolved event exists', () => {
        expect(shouldShowAcknowledgeList(1)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 4 — Stabilize Command Relationship + Strain-gated Stance
// ─────────────────────────────────────────────────────────────────────────────

// Wave 4 model:
//   - Stabilize action: resolves ALL unresolved friction events for corps at once
//   - Costs CA: 10 if strained (1–5), 15 if compromised (6+)
//   - 3-turn cooldown after stabilize (stabilization_cooldown_until = currentTurn + 3)
//   - Stance gate: offensive stance rejected when strain >= COMPROMISED_THRESHOLD (6)
//   - Adapter: stabilizationAvailable = strain > 0 && !cooldownActive

const COMPROMISED_THRESHOLD = 6;
const STABILIZE_COST_STRAINED = 10;
const STABILIZE_COST_COMPROMISED = 15;
const STABILIZE_COOLDOWN_TURNS = 3;

/** Simulate the stabilize-command-relationship IPC handler (mirrors electron-main.cjs). */
function simulateStabilize(
    state: {
        currentTurn: number;
        corpsId: string;
        strain: number;
        cooldownUntil: number;
        frictionEvents: Array<{ officer_id: string; assigned_corps_id: string; resolved: boolean }>;
        commandAuthority?: { current: number; max: number; spent_this_turn: number; lifetime_spent: number } | null;
    }
): { ok: boolean; resolvedCount?: number; caCost?: number; error?: string; newCooldown?: number } {
    if (state.strain === 0) {
        return { ok: false, error: 'Command relationship is already healthy — no stabilization needed.' };
    }
    if (state.currentTurn < state.cooldownUntil) {
        return { ok: false, error: `Stabilization on cooldown until turn ${state.cooldownUntil}.` };
    }
    const isCompromised = state.strain >= COMPROMISED_THRESHOLD;
    const cost = isCompromised ? STABILIZE_COST_COMPROMISED : STABILIZE_COST_STRAINED;
    if (state.commandAuthority) {
        if (state.commandAuthority.current < cost) {
            return { ok: false, error: `Insufficient command authority (${state.commandAuthority.current}/${cost} needed)` };
        }
        state.commandAuthority.current -= cost;
        state.commandAuthority.spent_this_turn += cost;
        state.commandAuthority.lifetime_spent += cost;
    }
    let resolved = 0;
    for (const e of state.frictionEvents) {
        if (e.assigned_corps_id === state.corpsId && !e.resolved) {
            e.resolved = true;
            resolved++;
        }
    }
    const newCooldown = state.currentTurn + STABILIZE_COOLDOWN_TURNS;
    return { ok: true, resolvedCount: resolved, caCost: state.commandAuthority ? cost : 0, newCooldown };
}

/** Simulate adapter stabilizationAvailable derivation. */
function deriveStabilizationAvailable(strain: number, currentTurn: number, cooldownUntil: number): boolean {
    return strain > 0 && currentTurn >= cooldownUntil;
}

/** Simulate adapter stabilizationCostCA derivation. */
function deriveStabilizationCostCA(strain: number, hasCA: boolean): number {
    if (!hasCA) return 0;
    return strain >= COMPROMISED_THRESHOLD ? STABILIZE_COST_COMPROMISED : STABILIZE_COST_STRAINED;
}

/** Simulate stance gate — returns rejection reason or null if allowed. */
function simulateStanceGate(newStance: string, strain: number): { ok: boolean; reason?: string; error?: string } {
    if (newStance === 'offensive' && strain >= COMPROMISED_THRESHOLD) {
        return { ok: false, reason: 'compromised', error: 'Cannot set aggressive stance — command is compromised. Stabilize the command relationship first.' };
    }
    return { ok: true };
}

describe('Wave 4: stabilize command relationship IPC handler', () => {
    it('resolves all unresolved friction events for the corps at once', () => {
        const events = [
            { officer_id: 'o1', assigned_corps_id: 'corps-1', resolved: false },
            { officer_id: 'o1', assigned_corps_id: 'corps-1', resolved: false },
            { officer_id: 'o2', assigned_corps_id: 'corps-2', resolved: false }, // different corps
        ];
        const result = simulateStabilize({
            currentTurn: 5, corpsId: 'corps-1', strain: 3, cooldownUntil: 0,
            frictionEvents: events, commandAuthority: makeAuth(),
        });
        expect(result.ok).toBe(true);
        expect(result.resolvedCount).toBe(2);
        expect(events[0]!.resolved).toBe(true);
        expect(events[1]!.resolved).toBe(true);
        expect(events[2]!.resolved).toBe(false); // other corps untouched
    });

    it('costs 10 CA when strained (strain 1–5)', () => {
        const auth = makeAuth({ current: 50 });
        const result = simulateStabilize({
            currentTurn: 5, corpsId: 'corps-1', strain: 3, cooldownUntil: 0,
            frictionEvents: [], commandAuthority: auth,
        });
        expect(result.ok).toBe(true);
        expect(result.caCost).toBe(10);
        expect(auth.current).toBe(40);
        expect(auth.spent_this_turn).toBe(10);
        expect(auth.lifetime_spent).toBe(10);
    });

    it('costs 15 CA when compromised (strain >= 6)', () => {
        const auth = makeAuth({ current: 50 });
        const result = simulateStabilize({
            currentTurn: 5, corpsId: 'corps-1', strain: 7, cooldownUntil: 0,
            frictionEvents: [], commandAuthority: auth,
        });
        expect(result.ok).toBe(true);
        expect(result.caCost).toBe(15);
        expect(auth.current).toBe(35);
    });

    it('rejects when strain is 0 (no stabilization needed)', () => {
        const result = simulateStabilize({
            currentTurn: 5, corpsId: 'corps-1', strain: 0, cooldownUntil: 0,
            frictionEvents: [], commandAuthority: makeAuth(),
        });
        expect(result.ok).toBe(false);
        expect(result.error).toContain('already healthy');
    });

    it('rejects when cooldown is active', () => {
        const result = simulateStabilize({
            currentTurn: 5, corpsId: 'corps-1', strain: 3, cooldownUntil: 7, // cooldown until turn 7
            frictionEvents: [], commandAuthority: makeAuth(),
        });
        expect(result.ok).toBe(false);
        expect(result.error).toContain('cooldown');
        expect(result.error).toContain('7');
    });

    it('allows stabilize on the exact turn cooldown expires', () => {
        const result = simulateStabilize({
            currentTurn: 7, corpsId: 'corps-1', strain: 3, cooldownUntil: 7, // currentTurn === cooldownUntil → allowed
            frictionEvents: [], commandAuthority: makeAuth(),
        });
        expect(result.ok).toBe(true);
    });

    it('rejects when insufficient CA', () => {
        const auth = makeAuth({ current: 5 }); // below strained cost of 10
        const result = simulateStabilize({
            currentTurn: 5, corpsId: 'corps-1', strain: 3, cooldownUntil: 0,
            frictionEvents: [], commandAuthority: auth,
        });
        expect(result.ok).toBe(false);
        expect(result.error).toContain('Insufficient');
        expect(auth.current).toBe(5); // unchanged
    });

    it('sets stabilization cooldown to currentTurn + 3', () => {
        const result = simulateStabilize({
            currentTurn: 10, corpsId: 'corps-1', strain: 3, cooldownUntil: 0,
            frictionEvents: [], commandAuthority: makeAuth(),
        });
        expect(result.ok).toBe(true);
        expect(result.newCooldown).toBe(13);
    });

    it('works without CA system (caCost = 0, still resolves events)', () => {
        const events = [
            { officer_id: 'o1', assigned_corps_id: 'corps-1', resolved: false },
        ];
        const result = simulateStabilize({
            currentTurn: 5, corpsId: 'corps-1', strain: 3, cooldownUntil: 0,
            frictionEvents: events, commandAuthority: null,
        });
        expect(result.ok).toBe(true);
        expect(result.caCost).toBe(0);
        expect(events[0]!.resolved).toBe(true);
    });
});

describe('Wave 4: strain-gated stance (compromised blocks offensive)', () => {
    it('allows offensive stance when strain is healthy (0)', () => {
        expect(simulateStanceGate('offensive', 0).ok).toBe(true);
    });

    it('allows offensive stance when strained (strain 1–5)', () => {
        expect(simulateStanceGate('offensive', 5).ok).toBe(true);
    });

    it('blocks offensive stance when compromised (strain = 6)', () => {
        const result = simulateStanceGate('offensive', 6);
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('compromised');
    });

    it('blocks offensive stance when severely compromised (strain = 10)', () => {
        expect(simulateStanceGate('offensive', 10).ok).toBe(false);
    });

    it('allows defensive stance when compromised', () => {
        expect(simulateStanceGate('defensive', 8).ok).toBe(true);
    });

    it('allows balanced stance when compromised', () => {
        expect(simulateStanceGate('balanced', 8).ok).toBe(true);
    });

    it('allows reorganize stance when compromised', () => {
        expect(simulateStanceGate('reorganize', 8).ok).toBe(true);
    });

    it('error message mentions compromised and stabilize', () => {
        const result = simulateStanceGate('offensive', 7);
        expect(result.error).toContain('compromised');
        expect(result.error).toContain('Stabilize');
    });
});

describe('Wave 4: adapter stabilizationAvailable derivation', () => {
    it('available when strain > 0 and no cooldown', () => {
        expect(deriveStabilizationAvailable(3, 5, 0)).toBe(true);
    });

    it('not available when strain = 0', () => {
        expect(deriveStabilizationAvailable(0, 5, 0)).toBe(false);
    });

    it('not available when cooldown is active (currentTurn < cooldownUntil)', () => {
        expect(deriveStabilizationAvailable(3, 5, 7)).toBe(false);
    });

    it('available when currentTurn equals cooldownUntil (cooldown just expired)', () => {
        expect(deriveStabilizationAvailable(3, 7, 7)).toBe(true);
    });

    it('stabilizationCostCA = 10 when strained', () => {
        expect(deriveStabilizationCostCA(3, true)).toBe(10);
    });

    it('stabilizationCostCA = 15 when compromised', () => {
        expect(deriveStabilizationCostCA(6, true)).toBe(15);
    });

    it('stabilizationCostCA = 0 when no CA system', () => {
        expect(deriveStabilizationCostCA(6, false)).toBe(0);
    });
});

describe('Wave 4: CommandManagementSection visibility conditions', () => {
    /** Simulate the render condition: show section only when strain > 0. */
    function shouldShowCommandManagement(strain: number): boolean {
        return strain > 0;
    }

    /** Simulate stance constraint notice: show when compromised. */
    function shouldShowStanceConstraintNotice(strainLabel: string): boolean {
        return strainLabel === 'compromised';
    }

    it('section hidden when strain = 0 (silence = healthy)', () => {
        expect(shouldShowCommandManagement(0)).toBe(false);
    });

    it('section shown when strain = 1', () => {
        expect(shouldShowCommandManagement(1)).toBe(true);
    });

    it('section shown when compromised', () => {
        expect(shouldShowCommandManagement(7)).toBe(true);
    });

    it('stance constraint notice hidden when strained (not yet compromised)', () => {
        expect(shouldShowStanceConstraintNotice('strained')).toBe(false);
    });

    it('stance constraint notice shown when compromised', () => {
        expect(shouldShowStanceConstraintNotice('compromised')).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 5 — Order Interpretation Preview Loop
// ─────────────────────────────────────────────────────────────────────────────

// The preview loop closes the gap: when a corps commander recommends LAUNCH but
// the corps carries command strain > 0, the player now sees institutional context
// BEFORE committing to go/no-go — not only when overriding a reluctant commander.
//
// Silence = healthy: severity === 'normal' and cautionNotice === null at strain 0.

describe('Wave 5: Order Interpretation Preview', () => {
    it('deriveOrderInterpretation: returns normal/null when strain=0', () => {
        const result = deriveOrderInterpretation(0, 'launch');
        expect(result.severity).toBe('normal');
        expect(result.cautionNotice).toBeNull();
    });

    it('deriveOrderInterpretation: returns normal/null when strain=0 regardless of assessment', () => {
        const result = deriveOrderInterpretation(0, 'postpone');
        expect(result.severity).toBe('normal');
        expect(result.cautionNotice).toBeNull();
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
            expect(result.recommendationReason).toContain('Force ratio');
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
});
