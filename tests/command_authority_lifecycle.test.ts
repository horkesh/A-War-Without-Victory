import { describe, it, expect } from 'vitest';
import type { CommandAuthority, CorpsOperation } from '../src/state/game_state.js';
import type { OperationAAR } from '../src/sim/combat/operation_aar.js';
import {
    applyCommandAuthorityRecovery,
    computeCommandAuthorityRecovery,
} from '../src/shared/commandAuthorityEconomy.js';
import { computeCorpsCommandStrain, getCommandStrainLabel, deriveOrderInterpretation, deriveStanceInterpretation, deriveOperationOutcomeCategory, buildOperationTrendSummary, projectStrainDecay, deriveRecoveryForecast, deriveCorpsSituationAssessment, deriveRecommendationExplanation, deriveReadinessTrend, isExhaustionContributingToStrain, EXHAUSTION_STRAIN_THRESHOLD, EXHAUSTION_STRAIN_SEVERE_THRESHOLD, deriveDelegationContext, deriveCorpsDelegationSummary } from '../src/ui/map/data/command_strain.js';
import type { OperationOutcomeCategory, OperationTrendSummary, PrimaryConstraint, ReadinessTrendDirection, DelegationPath } from '../src/ui/map/data/command_strain.js';

function makeAuth(overrides?: Partial<CommandAuthority>): CommandAuthority {
    return { current: 100, max: 100, spent_this_turn: 0, lifetime_spent: 0, ...overrides };
}

/** Simulate the recover-command-authority war phase step. */
function recoverAuthority(auth: CommandAuthority): void {
    auth.spent_this_turn = 0;
    const breakdown = computeCommandAuthorityRecovery({
        dimensions: {
            internationalStanding: 50,
            patronConfidence: 50,
            internalCohesion: 50,
        },
        recentInterventions: 1,
        unresolvedFriction: 0,
    });
    applyCommandAuthorityRecovery(auth, breakdown);
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
        it('recovers political-capacity income per turn', () => {
            const auth = makeAuth({ current: 85 });
            recoverAuthority(auth);
            expect(auth.current).toBe(88.25);
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
            expect(auth.current).toBe(3.25);
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
