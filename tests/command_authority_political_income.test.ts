import { describe, expect, it } from 'vitest';

import {
    COMMAND_AUTHORITY_ALLOWED_INCOME_SOURCES,
    COMMAND_AUTHORITY_RESERVE_MAX,
    applyCommandAuthorityRecovery,
    computeCommandAuthorityRecovery,
    type CommandAuthorityAccount,
} from '../src/shared/commandAuthorityEconomy';
import { FRONT_VISIT_COST, REQUEST_OP_COST } from '../src/ui/map/utils/commandAuthority';
import { validateGameStateShape } from '../src/state/validateGameState';
import { warPhases } from '../src/sim/turn_phases/war_phases';

function turnsToAfford(cost: number, recovery: number): number {
    return Math.ceil(cost / recovery);
}

describe('CA-2 political-income recovery model', () => {
    it('healthy political standing sustains one override every 2-3 quiet turns', () => {
        const result = computeCommandAuthorityRecovery({
            dimensions: {
                internationalStanding: 90,
                patronConfidence: 85,
                internalCohesion: 80,
            },
            recentInterventions: 0,
            unresolvedFriction: 0,
        });

        expect(result.recovery).toBeGreaterThanOrEqual(REQUEST_OP_COST / 3);
        expect(result.recovery).toBeLessThanOrEqual(REQUEST_OP_COST / 2);
        expect(turnsToAfford(REQUEST_OP_COST, result.recovery)).toBe(3);
        expect(result.topSource).toBe('international_standing');
    });

    it('neutral strained recovery keeps 10-CA gestures roughly monthly', () => {
        const result = computeCommandAuthorityRecovery({
            dimensions: {
                internationalStanding: 50,
                patronConfidence: 50,
                internalCohesion: 50,
            },
            recentInterventions: 1,
            unresolvedFriction: 0,
        });

        expect(turnsToAfford(FRONT_VISIT_COST, result.recovery)).toBe(4);
    });

    it('bounds the force-launch and friction spiral to an 8-turn post-crisis drought', () => {
        const result = computeCommandAuthorityRecovery({
            dimensions: {
                internationalStanding: 35,
                patronConfidence: 40,
                internalCohesion: 35,
            },
            recentInterventions: 4,
            unresolvedFriction: 4,
        });

        expect(result.recovery).toBeGreaterThan(0);
        expect(turnsToAfford(REQUEST_OP_COST, result.recovery)).toBeLessThanOrEqual(8);
        expect(result.frictionPenalty).toBeGreaterThan(0);
    });

    it('banks overflow at cap and refills current from the bank on later recovery', () => {
        const account = {
            current: 100,
            max: 100,
            reserve: 0,
            reserve_max: COMMAND_AUTHORITY_RESERVE_MAX,
            spent_this_turn: 0,
            lifetime_spent: 0,
        };

        applyCommandAuthorityRecovery(account, {
            recovery: 9,
            base: 3.25,
            politicalBonus: 3.75,
            quietFrontDividend: 2,
            frictionPenalty: 0,
            topSource: 'international_standing',
        });

        expect(account.current).toBe(100);
        expect(account.reserve).toBe(9);

        account.current = 80;
        applyCommandAuthorityRecovery(account, {
            recovery: 5,
            base: 3.25,
            politicalBonus: -0.25,
            quietFrontDividend: 2,
            frictionPenalty: 0,
            topSource: 'quiet_front_restraint',
        });

        expect(account.current).toBe(94);
        expect(account.reserve).toBe(0);
    });

    it('normalizes old-shape command_authority saves without a schema bump', () => {
        const account: CommandAuthorityAccount = {
            current: 98,
            max: 100,
            spent_this_turn: 0,
            lifetime_spent: 0,
        };

        applyCommandAuthorityRecovery(account, {
            recovery: 5,
            base: 3.25,
            politicalBonus: -0.25,
            quietFrontDividend: 2,
            frictionPenalty: 0,
            topSource: 'quiet_front_restraint',
        });

        expect(account.current).toBe(100);
        expect(account.reserve).toBe(3);
        expect(account.reserve_max).toBe(COMMAND_AUTHORITY_RESERVE_MAX);
    });

    it('war-phase recovery advances an old-shape command_authority object and preserves headless absence', async () => {
        const step = warPhases.find((phase) => phase.name === 'recover-command-authority');
        expect(step).toBeTruthy();
        if (!step) return;

        const state: any = {
            meta: { phase: 'war', turn: 1, player_faction: 'RBiH' },
            military: {
                command_authority: { current: 98, max: 100, spent_this_turn: 7, lifetime_spent: 30 },
                negotiation: {
                    strategic_dimensions: {
                        RBiH: {
                            international_standing: { effective_value: 90 },
                            patron_confidence: { effective_value: 85 },
                            internal_cohesion: { effective_value: 80 },
                        },
                    },
                },
                corps_command: {},
                friction_events: [],
            },
            political: {},
            displacement: {},
        };

        await step.run({ state, report: { phases: [] }, input: {}, rng: () => 0 } as any);

        expect(state.military.command_authority.current).toBe(100);
        expect(state.military.command_authority.reserve).toBe(6.75);
        expect(state.military.command_authority.reserve_max).toBe(COMMAND_AUTHORITY_RESERVE_MAX);
        expect(state.military.command_authority.spent_this_turn).toBe(0);
        expect(state.military.command_authority.last_recovery_source).toBe('international_standing');

        const headlessState = {
            meta: { phase: 'war', turn: 1, player_faction: 'RBiH' },
            military: {},
            political: {},
            displacement: {},
        };
        await step.run({ state: headlessState, report: { phases: [] }, input: {}, rng: () => 0 } as any);
        expect(headlessState.military).toEqual({});

        const legacyHeadlessState = {
            meta: { phase: 'war', turn: 1 },
            military: {
                command_authority: { current: 100, max: 100, spent_this_turn: 0, lifetime_spent: 0 },
            },
            political: {},
            displacement: {},
        };
        await step.run({ state: legacyHeadlessState, report: { phases: [] }, input: {}, rng: () => 0 } as any);
        expect(legacyHeadlessState.military.command_authority).toEqual({
            current: 100,
            max: 100,
            spent_this_turn: 0,
            lifetime_spent: 0,
        });
    });

    it('exposes only Section 6-approved income source identifiers', () => {
        expect(COMMAND_AUTHORITY_ALLOWED_INCOME_SOURCES).toEqual([
            'international_standing',
            'patron_confidence',
            'internal_cohesion',
            'quiet_front_restraint',
            'base_recovery',
        ]);

        const sourceText = COMMAND_AUTHORITY_ALLOWED_INCOME_SOURCES.join(' ');
        expect(sourceText).not.toMatch(/ethnic|displacement|camp|atrocity|siege|starvation|casualt|safe-area/i);
    });

    it('rejects persisted command-authority recovery sources outside the approved vocabulary', () => {
        const result = validateGameStateShape({
            schema_version: 36,
            meta: { turn: 1, seed: 'test', phase: 'war' },
            factions: [],
            political: {},
            displacement: { displacement_flows_by_osid: {} },
            military: {
                command_authority: {
                    current: 50,
                    max: 100,
                    reserve: 0,
                    reserve_max: COMMAND_AUTHORITY_RESERVE_MAX,
                    spent_this_turn: 0,
                    lifetime_spent: 0,
                    last_recovery: 3.25,
                    last_recovery_source: 'atrocity_bonus',
                },
            },
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors.join('\n')).toMatch(/Section 6-approved command authority income source/);
        }
    });
});
