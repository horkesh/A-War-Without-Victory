/**
 * Command loop L6 (owner decision 1, 2026-11-14): Authority that binds.
 *
 * Backing a general's offensive costs Authority: 10 for a corps operation, 20 for a
 * named campaign or an authored historical operation. Saying no stays free and income is
 * unchanged. Regeneration becomes visible through `command_authority.last_recovery_breakdown`,
 * written only by the live recovery step. Headless runs never debit, never carry the
 * breakdown, and stay byte-identical.
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
    BACK_CAMPAIGN_COST,
    BACK_CORPS_OPERATION_COST,
    proposalBackingCost,
} from '../src/ui/map/utils/commandAuthority';
import { validateGameStateShape } from '../src/state/validateGameState';
import { warPhases } from '../src/sim/turn_phases/war_phases';
import { computeCommandAuthorityRecovery, toRecoveryBreakdownRecord } from '../src/shared/commandAuthorityEconomy';

const require_ = createRequire(import.meta.url);
const ipc = require_('../src/desktop/autonomy_ipc_contract.cjs') as {
    BACK_CORPS_OPERATION_COST: number;
    BACK_CAMPAIGN_COST: number;
    proposalBackingCost: (action: unknown) => number;
    opportunityDecisionBackingCost: (decision: string) => number;
    debitCommandAuthority: (state: unknown, cost: number) => { ok: boolean; error?: string };
};

function breakdownErrors(state: unknown): string[] {
    const result = validateGameStateShape(state as any) as { ok: boolean; errors?: string[] };
    return (result.ok ? [] : result.errors ?? []).filter((error) => error.includes('last_recovery_breakdown'));
}

/** The demand table: what each answer to a staff proposal costs. */
const DEMAND_TABLE: Array<[string, number]> = [
    ['APPROVE_OP:arbih_2nd_corps:plan_7', 10],
    ['HISTORICAL_OP:preplanned:arbih_2nd_corps:Operation Vozuća', 20],
    ['OPPORTUNITY:OPP_40_farz', 20],
    ['SET_STANCE:arbih_2nd_corps:offensive', 0],
    ['SOMETHING_ELSE:x', 0],
];

describe('backing prices (owner decision 1)', () => {
    it('prices a corps operation at 10 and a campaign or historical operation at 20', () => {
        expect(BACK_CORPS_OPERATION_COST).toBe(10);
        expect(BACK_CAMPAIGN_COST).toBe(20);
    });

    it('keeps the TS and IPC prices and the demand table in parity', () => {
        expect(ipc.BACK_CORPS_OPERATION_COST).toBe(BACK_CORPS_OPERATION_COST);
        expect(ipc.BACK_CAMPAIGN_COST).toBe(BACK_CAMPAIGN_COST);
        for (const [action, cost] of DEMAND_TABLE) {
            expect(proposalBackingCost(action), action).toBe(cost);
            expect(ipc.proposalBackingCost(action), action).toBe(cost);
        }
        expect(proposalBackingCost(undefined)).toBe(0);
        expect(ipc.proposalBackingCost(null)).toBe(0);
    });

    it('charges an opportunity only when the decision backs it', () => {
        expect(ipc.opportunityDecisionBackingCost('approve')).toBe(20);
        expect(ipc.opportunityDecisionBackingCost('redirect')).toBe(20);
        expect(ipc.opportunityDecisionBackingCost('under_resource')).toBe(20);
        expect(ipc.opportunityDecisionBackingCost('delay')).toBe(0);
        expect(ipc.opportunityDecisionBackingCost('decline')).toBe(0);
    });
});

describe('debitCommandAuthority', () => {
    function account(current: number) {
        return { military: { command_authority: { current, max: 100, spent_this_turn: 5, lifetime_spent: 40 } } };
    }

    it('debits current, spent this turn and lifetime spent', () => {
        const state = account(34);
        expect(ipc.debitCommandAuthority(state, 10)).toEqual({ ok: true });
        expect(state.military.command_authority).toEqual({ current: 24, max: 100, spent_this_turn: 15, lifetime_spent: 50 });
    });

    it('refuses without touching the account when the balance cannot cover the price', () => {
        const state = account(19);
        const before = structuredClone(state);
        expect(ipc.debitCommandAuthority(state, 20)).toEqual({ ok: false, error: 'insufficient_command_authority (19/20)' });
        expect(state).toEqual(before);
    });

    it('charges nothing for a free answer or a state without an account', () => {
        const state = account(3);
        expect(ipc.debitCommandAuthority(state, 0)).toEqual({ ok: true });
        expect(state.military.command_authority.current).toBe(3);
        const legacy = { military: {} };
        expect(ipc.debitCommandAuthority(legacy, 10)).toEqual({ ok: true });
        expect(legacy).toEqual({ military: {} });
    });
});

describe('visible regeneration: last_recovery_breakdown', () => {
    const step = warPhases.find((phase) => phase.name === 'recover-command-authority')!;

    function liveState(extraMeta: Record<string, unknown> = {}): any {
        return {
            meta: { phase: 'war', turn: 30, player_faction: 'RBiH', ...extraMeta },
            military: {
                command_authority: { current: 40, max: 100, spent_this_turn: 10, lifetime_spent: 60 },
                negotiation: {
                    strategic_dimensions: {
                        RBiH: {
                            international_standing: { effective_value: 70 },
                            patron_confidence: { effective_value: 60 },
                            internal_cohesion: { effective_value: 50 },
                        },
                    },
                },
                corps_command: {},
                friction_events: [],
            },
            political: {},
            displacement: {},
        };
    }

    it('writes the week\'s income breakdown for a live president', async () => {
        const state = liveState();
        await step.run({ state, report: { phases: [] }, input: {}, rng: () => 0 } as any);
        const expected = toRecoveryBreakdownRecord(computeCommandAuthorityRecovery({
            dimensions: { internationalStanding: 70, patronConfidence: 60, internalCohesion: 50 },
            recentInterventions: 0,
            unresolvedFriction: 0,
        }));
        expect(state.military.command_authority.last_recovery_breakdown).toEqual(expected);
        expect(state.military.command_authority.last_recovery_breakdown.recovery).toBe(state.military.command_authority.last_recovery);
        expect(breakdownErrors(state)).toEqual([]);
    });

    it('never writes it under headless auto-control, even with an authored player faction', async () => {
        const state = liveState({ headless_scenario_auto_control: true });
        await step.run({ state, report: { phases: [] }, input: {}, rng: () => 0 } as any);
        expect('last_recovery_breakdown' in state.military.command_authority).toBe(false);
    });

    it('validates the breakdown when present', () => {
        const state = liveState();
        state.military.command_authority.last_recovery_breakdown = {
            recovery: -1, base: 3.25, political_bonus: Number.NaN, quiet_front_dividend: 2, friction_penalty: 0, top_source: 'atrocity_bonus',
        };
        expect(breakdownErrors(state)).toEqual([
            'military.command_authority.last_recovery_breakdown.recovery must be a finite non-negative number',
            'military.command_authority.last_recovery_breakdown.political_bonus must be a finite number',
            'military.command_authority.last_recovery_breakdown.top_source must be a Section 6-approved command authority income source',
        ]);
    });
});
