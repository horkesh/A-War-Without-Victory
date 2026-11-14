/**
 * B11 (R8 dry-run Council, 2026-11-14): an accepted, free proposal came back as
 * "Order an unrequested operation: ... 25 Authority".
 *
 * Cause: accept-proposal marks the APPROVE_OP review resolved and stages
 * corps_command[c].player_op_response for the plan, which stays at status 'ready'
 * until Advance. The proactive force-launch projections only excluded plans with a
 * PENDING proposal, so the just-approved plan reappeared as "unrequested", and the
 * proactive-force-launch-op IPC accepted it (25 CA, re-tagged as a force-launch).
 *
 * A plan the President has already answered (staged player_op_response, or any
 * APPROVE_OP review for it, pending or resolved) is never "unrequested".
 */

import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { buildForceableReadyPlans } from '../../src/ui/map/data/backTheOfficer.js';

const require = createRequire(import.meta.url);
const {
    buildForceableReadyPlanData,
    resolveProactiveForceLaunchRefusal,
} = require('../../src/desktop/autonomy_ipc_contract.cjs') as {
    buildForceableReadyPlanData: (state: any, proposals: any[]) => any[];
    resolveProactiveForceLaunchRefusal: (state: any, corpsId: string, planId: string) => string | null;
};

type Review = {
    id: string;
    faction: string;
    proposed_action: string;
    accepted?: boolean;
    resolved_turn?: number;
};

function makeState(opts: {
    review?: Review;
    response?: { plan_id: string; approved: boolean; turn: number; force_launched?: boolean };
} = {}) {
    return {
        meta: {
            turn: 74,
            player_faction: 'RBiH',
            pending_proposal_reviews: opts.review ? [opts.review] : [],
        },
        military: {
            formations: { arbih_4th_corps: { name: '4th Corps', faction: 'RBiH' } },
            named_officer_data: [],
            named_officers: {},
            corps_command: {
                arbih_4th_corps: {
                    active_operations: [],
                    ...(opts.response ? { player_op_response: opts.response } : {}),
                    commander_state: {
                        current_plan: {
                            plan_id: 'plan_doljani',
                            status: 'ready',
                            objective_description: 'Advance from Doljani',
                        },
                    },
                },
            },
        },
    };
}

const ACTION = 'APPROVE_OP:arbih_4th_corps:plan_doljani';

/** The adapter and the IPC pass only unresolved reviews into the projections. */
function pendingOnly(state: ReturnType<typeof makeState>) {
    return state.meta.pending_proposal_reviews.filter(
        (r: Review) => r.accepted == null && r.resolved_turn == null,
    );
}

describe('B11: an answered plan is never offered as an unrequested operation', () => {
    const cases: Array<[string, ReturnType<typeof makeState>]> = [
        [
            'accepted proposal (the Council case)',
            makeState({
                review: { id: 'p1', faction: 'RBiH', proposed_action: ACTION, accepted: true, resolved_turn: 74 },
                response: { plan_id: 'plan_doljani', approved: true, turn: 74 },
            }),
        ],
        [
            'withheld proposal',
            makeState({
                review: { id: 'p1', faction: 'RBiH', proposed_action: ACTION, accepted: false, resolved_turn: 74 },
                response: { plan_id: 'plan_doljani', approved: false, turn: 74 },
            }),
        ],
        [
            'resolved review whose staged response was already consumed',
            makeState({
                review: { id: 'p1', faction: 'RBiH', proposed_action: ACTION, accepted: true, resolved_turn: 73 },
            }),
        ],
        [
            'staged response without a review row (already force-launched this week)',
            makeState({ response: { plan_id: 'plan_doljani', approved: true, turn: 74, force_launched: true } }),
        ],
    ];

    for (const [label, state] of cases) {
        it(`UI projection excludes it: ${label}`, () => {
            expect(buildForceableReadyPlans(state, [], pendingOnly(state))).toEqual([]);
        });

        it(`desktop projection excludes it: ${label}`, () => {
            expect(buildForceableReadyPlanData(state, pendingOnly(state))).toEqual([]);
        });

        it(`proactive-force-launch-op refuses it: ${label}`, () => {
            expect(resolveProactiveForceLaunchRefusal(state, 'arbih_4th_corps', 'plan_doljani'))
                .toBe('plan_already_answered');
        });
    }

    it('still offers a ready plan the officer never proposed and the President never answered', () => {
        const state = makeState();
        expect(buildForceableReadyPlans(state, [], []).map((v) => v.plan_id)).toEqual(['plan_doljani']);
        expect(buildForceableReadyPlanData(state, []).map((v: { plan_id: string }) => v.plan_id))
            .toEqual(['plan_doljani']);
        expect(resolveProactiveForceLaunchRefusal(state, 'arbih_4th_corps', 'plan_doljani')).toBeNull();
    });

    it('a staged response or review for a DIFFERENT plan does not hide this one', () => {
        const state = makeState({
            review: {
                id: 'p0',
                faction: 'RBiH',
                proposed_action: 'APPROVE_OP:arbih_4th_corps:plan_older',
                accepted: true,
                resolved_turn: 70,
            },
            response: { plan_id: 'plan_older', approved: true, turn: 70 },
        });
        expect(buildForceableReadyPlans(state, [], pendingOnly(state))).toHaveLength(1);
        expect(buildForceableReadyPlanData(state, pendingOnly(state))).toHaveLength(1);
        expect(resolveProactiveForceLaunchRefusal(state, 'arbih_4th_corps', 'plan_doljani')).toBeNull();
    });

    it('a pending proposal still routes through the proposal path, not the proactive one', () => {
        const state = makeState({ review: { id: 'p1', faction: 'RBiH', proposed_action: ACTION } });
        expect(buildForceableReadyPlans(state, [], pendingOnly(state))).toEqual([]);
        expect(resolveProactiveForceLaunchRefusal(state, 'arbih_4th_corps', 'plan_doljani'))
            .toBe('plan_has_pending_proposal');
    });

    it('another faction’s review for the same action key does not count', () => {
        const state = makeState({
            review: { id: 'p9', faction: 'HRHB', proposed_action: ACTION, accepted: true, resolved_turn: 74 },
        });
        expect(buildForceableReadyPlans(state, [], [])).toHaveLength(1);
        expect(buildForceableReadyPlanData(state, [])).toHaveLength(1);
        expect(resolveProactiveForceLaunchRefusal(state, 'arbih_4th_corps', 'plan_doljani')).toBeNull();
    });
});
