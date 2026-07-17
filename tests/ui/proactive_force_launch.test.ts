/**
 * "Override without proposal" — proactive presidential force-launch read-model.
 *
 * buildForceableReadyPlans projects the corps plans the officer holds at 'ready'
 * but never surfaced as an APPROVE_OP proposal — the candidates the president may
 * proactively force-launch. Pure / deterministic; no state mutation.
 *
 * Cases:
 *  - a ready plan with NO pending proposal IS listed,
 *  - a ready plan WITH a pending proposal is NOT (the existing override path owns it),
 *  - a non-ready plan (concentrating/executing) is NOT,
 *  - the cost is PROACTIVE_FORCE_LAUNCH_COST (25),
 *  - the projection does not mutate the state it reads.
 */

import { describe, expect, it } from 'vitest';
import {
    buildForceableReadyPlans,
    type BackTheOfficerRosterRow,
} from '../../src/ui/map/data/backTheOfficer.js';
import { PROACTIVE_FORCE_LAUNCH_COST } from '../../src/ui/map/utils/commandAuthority.js';

function makeState(status: string, planId = 'plan_a') {
    return {
        military: {
            formations: { '1st_corps': { name: '1st Corps' } },
            named_officers: {
                off_x: { status: 'active', assigned_corps_id: '1st_corps' },
            },
            corps_command: {
                '1st_corps': {
                    active_operations: [],
                    commander_state: {
                        last_plan_reason: 'staged; awaiting moment',
                        current_plan: {
                            plan_id: planId,
                            status,
                            objective_description: 'Seize the ridge above the valley',
                        },
                    },
                },
            },
        },
    };
}

function makeStateWithoutObjectiveDescription(status: string, planId = 'plan_alpha') {
    const state = makeState(status, planId);
    delete (state.military.corps_command['1st_corps'].commander_state.current_plan as { objective_description?: string }).objective_description;
    return state;
}

const ROSTER: BackTheOfficerRosterRow[] = [
    { id: 'off_x', name: 'Atif Dudaković', rank: 'corps_commander', status: 'active' },
];

describe('buildForceableReadyPlans — proactive force-launch read-model', () => {
    it('lists a ready plan that has NO pending proposal', () => {
        const views = buildForceableReadyPlans(makeState('ready'), ROSTER, []);
        expect(views).toHaveLength(1);
        const v = views[0];
        expect(v.corps_id).toBe('1st_corps');
        expect(v.corps_name).toBe('1st Corps');
        expect(v.plan_id).toBe('plan_a');
        expect(v.op_name).toBe('Seize the ridge above the valley');
        expect(v.commander?.officer_id).toBe('off_x');
        expect(v.commander?.name).toBe('Atif Dudaković');
        expect(v.commander_assessment).toBe('staged; awaiting moment');
        expect(v.force_ca_cost).toBe(PROACTIVE_FORCE_LAUNCH_COST);
        expect(v.force_ca_cost).toBe(25);
    });

    it('EXCLUDES a ready plan that already has a pending APPROVE_OP proposal', () => {
        const proposals = [
            { proposed_action: 'APPROVE_OP:1st_corps:plan_a' },
        ];
        const views = buildForceableReadyPlans(makeState('ready'), ROSTER, proposals);
        expect(views).toEqual([]);
    });

    it('still lists the ready plan when a proposal targets a DIFFERENT plan', () => {
        const proposals = [
            { proposed_action: 'APPROVE_OP:1st_corps:some_other_plan' },
        ];
        const views = buildForceableReadyPlans(makeState('ready'), ROSTER, proposals);
        expect(views).toHaveLength(1);
        expect(views[0].plan_id).toBe('plan_a');
    });

    it('does not expose the raw plan id when a ready plan has no objective description', () => {
        const views = buildForceableReadyPlans(makeStateWithoutObjectiveDescription('ready'), ROSTER, []);
        expect(views).toHaveLength(1);
        expect(views[0].plan_id).toBe('plan_alpha');
        expect(views[0].op_name).toBe('Unspecified operation');
        expect(views[0].op_name).not.toContain('plan_alpha');
    });

    it('humanizes a generated opportunity origin instead of exposing zone and corps ids', () => {
        const state = makeState('ready');
        state.military.corps_command['1st_corps'].commander_state.current_plan.objective_description =
            'offensive opportunity from zone:vrs_1st_krajina:op:banja_luka:banja_luka_2';

        const views = buildForceableReadyPlans(state, ROSTER, []);

        expect(views).toHaveLength(1);
        expect(views[0].op_name).toBe('Advance from Banja Luka');
        expect(views[0].op_name).not.toMatch(/zone:|op:|vrs_1st_krajina|banja_luka_2/);
    });

    it('uses the staging settlement when a pre-planned objective is opaque', () => {
        const state = makeState('ready');
        const plan = state.military.corps_command['1st_corps'].commander_state.current_plan;
        plan.objective_description = 'pre_planned_op';
        (plan as typeof plan & { staging_zone: string }).staging_zone =
            'zone:vrs_1st_krajina:op:banja_luka:banja_luka_2';

        const views = buildForceableReadyPlans(state, ROSTER, []);

        expect(views[0].op_name).toBe('Advance from Banja Luka');
        expect(views[0].op_name).not.toBe('Unspecified operation');
    });

    it('EXCLUDES a non-ready plan (concentrating)', () => {
        const views = buildForceableReadyPlans(makeState('concentrating'), ROSTER, []);
        expect(views).toEqual([]);
    });

    it('EXCLUDES a non-ready plan (executing)', () => {
        const views = buildForceableReadyPlans(makeState('executing'), ROSTER, []);
        expect(views).toEqual([]);
    });

    it('does not mutate the state it reads', () => {
        const state = makeState('ready');
        const before = JSON.stringify(state);
        buildForceableReadyPlans(state, ROSTER, []);
        expect(JSON.stringify(state)).toBe(before);
    });

    it('returns [] when no corps holds a current_plan', () => {
        const state = {
            military: {
                formations: { '1st_corps': { name: '1st Corps' } },
                named_officers: {},
                corps_command: { '1st_corps': { active_operations: [], commander_state: { current_plan: null } } },
            },
        };
        expect(buildForceableReadyPlans(state, ROSTER, [])).toEqual([]);
    });

    it('EXCLUDES an enemy-faction ready plan (only player-faction corps are forceable)', () => {
        // Corps→faction is the corps formation's faction (corps_command key is a
        // FormationId in military.formations). With player_faction set, an enemy
        // corps's held-ready plan must never be surfaced as forceable.
        const state = {
            meta: { player_faction: 'RBiH' },
            military: {
                formations: {
                    arbih_1st_corps: { name: '1st Corps', faction: 'RBiH' },
                    vrs_drina_corps: { name: 'Drina Corps', faction: 'RS' },
                },
                named_officers: {},
                corps_command: {
                    arbih_1st_corps: {
                        commander_state: { current_plan: { plan_id: 'p_own', status: 'ready' } },
                    },
                    vrs_drina_corps: {
                        commander_state: { current_plan: { plan_id: 'p_enemy', status: 'ready' } },
                    },
                },
            },
        };
        const views = buildForceableReadyPlans(state, ROSTER, []);
        // Only the player's own corps plan is forceable; the enemy corps is filtered out.
        expect(views.map((v) => v.corps_id)).toEqual(['arbih_1st_corps']);
        expect(views.some((v) => v.corps_id === 'vrs_drina_corps')).toBe(false);
    });

    it('EXCLUDES stale corps_command rows when player faction is known and no corps formation resolves', () => {
        const state = {
            meta: { player_faction: 'RBiH' },
            military: {
                formations: {
                    arbih_1st_corps: { name: '1st Corps', faction: 'RBiH' },
                },
                named_officers: {},
                corps_command: {
                    stale_vrs_corps: {
                        commander_state: {
                            current_plan: {
                                plan_id: 'stale_plan',
                                status: 'ready',
                                objective_description: 'Foreign stale operation',
                            },
                        },
                    },
                },
            },
        };

        expect(buildForceableReadyPlans(state, ROSTER, [])).toEqual([]);
    });

    it('is deterministic — sorted by corps id then plan id', () => {
        const state = {
            military: {
                formations: { a_corps: { name: 'A Corps' }, b_corps: { name: 'B Corps' } },
                named_officers: {},
                corps_command: {
                    b_corps: { commander_state: { current_plan: { plan_id: 'p1', status: 'ready' } } },
                    a_corps: { commander_state: { current_plan: { plan_id: 'p2', status: 'ready' } } },
                },
            },
        };
        const views = buildForceableReadyPlans(state, ROSTER, []);
        expect(views.map((v) => v.corps_id)).toEqual(['a_corps', 'b_corps']);
    });
});
