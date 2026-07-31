import { describe, it, expect } from 'vitest';
import { evaluatePeacePlans, resolvePeacePlan } from '../src/sim/negotiation/peace_plans.js';
import { PEACE_PLANS, getPeacePlanById } from '../src/sim/negotiation/peace_plan_data.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../src/state/negotiation_types.js';
import type { NegotiationState } from '../src/state/negotiation_types.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import { resolveEventDecision } from '../src/sim/events/resolve_decision.js';
import { advanceTurn, startNewCampaign } from '../src/desktop/desktop_sim.js';
import type { GameState, FactionId } from '../src/state/game_state.js';

const CANONICAL_FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

function makeState(overrides: {
    turn?: number;
    war_start_turn?: number;
    player_faction?: FactionId;
    no_player?: boolean;
    decision_mode?: 'historical' | 'emergent';
    controllers?: Record<string, string>;
    negotiation?: any;
} = {}): GameState {
    const warStart = overrides.war_start_turn ?? 0;
    const turn = overrides.turn ?? warStart;

    return {
        meta: {
            turn,
            phase: 'war',
            seed: 1,
            date: '1992-06-15',
            war_start_turn: warStart,
            ...(overrides.decision_mode ? { decision_mode: overrides.decision_mode } : {}),
            ...(overrides.no_player ? {} : { player_faction: overrides.player_faction ?? 'RBiH' }),
        },
        factions: [
            { id: 'RBiH' },
            { id: 'RS' },
            { id: 'HRHB' },
        ],
        military: {
            formations: {},
            negotiation: overrides.negotiation ?? undefined,
        },
        political: {
            political_controllers: overrides.controllers ?? {},
        },
        displacement: {},
    } as unknown as GameState;
}

/** Build OSID controllers where each faction gets a given percentage of 100 OSIDs. */
function makeControllers(split: Record<string, number>): Record<string, string> {
    const controllers: Record<string, string> = {};
    let idx = 0;
    for (const faction of ['RBiH', 'RS', 'HRHB']) {
        const count = split[faction] ?? 0;
        for (let i = 0; i < count; i++) {
            controllers[`op:test:osid_${idx}`] = faction;
            idx++;
        }
    }
    return controllers;
}

function makeNegotiationState(overrides: {
    override_authority?: Record<string, number>;
} = {}): NegotiationState {
    const capital: NegotiationState['capital'] = {};
    const patron_relationships: NegotiationState['patron_relationships'] = {};
    for (const faction of CANONICAL_FACTIONS) {
        capital[faction] = createEmptyCapital();
        const pr = createDefaultPatronRelationship(faction);
        if (overrides.override_authority && overrides.override_authority[faction] !== undefined) {
            pr.override_authority = overrides.override_authority[faction];
        }
        patron_relationships[faction] = pr;
    }
    return {
        capital,
        patron_relationships,
        peace_plan_history: [],
        strategic_dimensions: initializeStrategicDimensions(),
    };
}

function attachVanceOwenEventDecision(state: GameState): void {
    state.military.pending_event_decisions = [
        {
            event_id: 'ic_pressure_vopp_engagement',
            event_title: 'Vance-Owen engagement pressure',
            turn_fired: 39,
            faction: 'RBiH',
            response_options: [
                { id: 'acknowledge_pressure', label: 'Acknowledge', description: 'Acknowledge pressure.', effects: [] },
            ],
        },
        {
            event_id: 'vance_owen_plan_1993',
            event_title: 'Vance-Owen Peace Plan Presented',
            turn_fired: 39,
            faction: 'RBiH',
            response_options: [
                {
                    id: 'accept',
                    label: 'Accept',
                    description: 'Accept the plan.',
                    effects: [],
                    sets_flags: { vance_owen_accepted: true },
                },
                {
                    id: 'reject',
                    label: 'Reject',
                    description: 'Reject the plan.',
                    effects: [],
                },
            ],
            notifications_to_other_factions: {
                accept: {
                    RS: { headline: 'Sarajevo accepts', body: 'RBiH accepts Vance-Owen.' },
                    HRHB: { headline: 'Sarajevo accepts', body: 'RBiH accepts Vance-Owen.' },
                },
                reject: {
                    RS: { headline: 'Sarajevo rejects', body: 'RBiH rejects Vance-Owen.' },
                    HRHB: { headline: 'Sarajevo rejects', body: 'RBiH rejects Vance-Owen.' },
                },
            },
        },
    ];
}

function attachOwenStoltenbergPresidencyDecision(state: GameState): void {
    state.military.pending_event_decisions = [
        {
            event_id: 'owen_stoltenberg_plan_1993',
            event_title: 'Owen-Stoltenberg Presidency Review',
            turn_fired: 70,
            faction: 'RBiH',
            response_options: [
                {
                    id: 'accept',
                    label: 'Conditionally accept',
                    description: 'The Presidency conditionally accepts the framework.',
                    effects: [],
                    sets_flags: { owen_stoltenberg_accepted: true },
                },
                {
                    id: 'reject',
                    label: 'Reject',
                    description: 'The Presidency rejects the framework.',
                    effects: [],
                },
            ],
        },
    ];
}

function attachOwenStoltenbergAssemblyDecision(state: GameState): void {
    state.military.pending_event_decisions = [
        {
            event_id: 'os_rbih_tactical_acceptance_1993',
            event_title: 'Owen-Stoltenberg Assembly Vote',
            turn_fired: 72,
            faction: 'RBiH',
            response_options: [
                {
                    id: 'reject_via_assembly',
                    label: 'Assembly rejects',
                    description: 'The Assembly rejects the partition framework.',
                    effects: [],
                },
                {
                    id: 'accept_for_optics',
                    label: 'Assembly ratifies',
                    description: 'The Assembly ratifies the Presidency acceptance.',
                    effects: [],
                },
            ],
        },
    ];
}

describe('Peace Plan Data', () => {
    it('defines 5 historical peace plans', () => {
        expect(PEACE_PLANS).toHaveLength(5);
    });

    it('plans are in chronological order', () => {
        for (let i = 1; i < PEACE_PLANS.length; i++) {
            expect(PEACE_PLANS[i].trigger_week).toBeGreaterThan(PEACE_PLANS[i - 1].trigger_week);
        }
    });

    it('each plan has valid proposed_split summing to ~100', () => {
        for (const plan of PEACE_PLANS) {
            const total = (plan.proposed_split.RBiH ?? 0)
                + (plan.proposed_split.RS ?? 0)
                + (plan.proposed_split.HRHB ?? 0);
            expect(total).toBe(100);
        }
    });

    it('getPeacePlanById returns correct plan', () => {
        expect(getPeacePlanById('vance_owen')?.name).toBe('Vance-Owen Peace Plan');
        expect(getPeacePlanById('nonexistent')).toBeUndefined();
    });
});

describe('evaluatePeacePlans', () => {
    it('triggers Cutileiro plan at war week 0', () => {
        const state = makeState({ turn: 10, war_start_turn: 10 }); // war week = 0
        evaluatePeacePlans(state);

        const pending = state.military.negotiation?.pending_peace_plan;
        expect(pending).toBeDefined();
        expect(pending!.plan_id).toBe('cutileiro');
        expect(pending!.turn_offered).toBe(10);
    });

    it('triggers Vance-Owen plan at war week 40', () => {
        const state = makeState({ turn: 50, war_start_turn: 10 }); // war week = 40
        evaluatePeacePlans(state);

        const pending = state.military.negotiation?.pending_peace_plan;
        expect(pending).toBeDefined();
        expect(pending!.plan_id).toBe('vance_owen');
    });

    it('triggers Owen-Stoltenberg plan at war week 70', () => {
        const state = makeState({ turn: 70, war_start_turn: 0 }); // war week = 70
        evaluatePeacePlans(state);

        const pending = state.military.negotiation?.pending_peace_plan;
        expect(pending).toBeDefined();
        expect(pending!.plan_id).toBe('owen_stoltenberg');
    });

    it('triggers Contact Group plan at war week 118', () => {
        const state = makeState({ turn: 118, war_start_turn: 0 }); // war week = 118
        evaluatePeacePlans(state);

        const pending = state.military.negotiation?.pending_peace_plan;
        expect(pending).toBeDefined();
        expect(pending!.plan_id).toBe('contact_group');
    });

    it('does not trigger at non-matching war week', () => {
        const state = makeState({ turn: 15, war_start_turn: 10 }); // war week = 5
        evaluatePeacePlans(state);

        expect(state.military.negotiation?.pending_peace_plan).toBeUndefined();
    });

    it('does not trigger if plan already offered', () => {
        const neg = makeNegotiationState();
        neg.peace_plan_history.push({
            plan_id: 'cutileiro',
            turn_offered: 5,
            responses: { RBiH: 'rejected', RS: 'rejected', HRHB: 'rejected' },
            resolved: true,
        });
        const state = makeState({ turn: 10, war_start_turn: 10, negotiation: neg });
        evaluatePeacePlans(state);

        expect(state.military.negotiation?.pending_peace_plan).toBeUndefined();
    });

    it('does not trigger if another plan is already pending', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'cutileiro',
            turn_offered: 10,
            bot_responses: { RS: 'rejected', HRHB: 'accepted' },
        };
        // war week 40 = Vance-Owen trigger, but Cutileiro still pending
        const state = makeState({ turn: 50, war_start_turn: 10, negotiation: neg });
        evaluatePeacePlans(state);

        // Should still be Cutileiro, not replaced by Vance-Owen
        expect(state.military.negotiation?.pending_peace_plan?.plan_id).toBe('cutileiro');
    });

    it('does not trigger if game_over is true', () => {
        const state = makeState({ turn: 10, war_start_turn: 10 });
        state.meta.game_over = true;
        evaluatePeacePlans(state);

        expect(state.military.negotiation?.pending_peace_plan).toBeUndefined();
    });

    it('uses the Presidency and Assembly events as the staged RBiH Owen-Stoltenberg owner', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'owen_stoltenberg',
            turn_offered: 70,
            bot_responses: { RS: 'accepted', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 70, war_start_turn: 0, negotiation: neg });
        attachOwenStoltenbergPresidencyDecision(state);

        resolveEventDecision(state, 'owen_stoltenberg_plan_1993', 'accept');

        expect(neg.pending_peace_plan).toBeUndefined();
        expect(neg.peace_plan_history).toEqual([]);
        expect(state.meta.game_over).not.toBe(true);
        expect(state.military.event_flags?.owen_stoltenberg_accepted).toBe(true);

        state.meta.turn = 71;
        evaluatePeacePlans(state);
        expect(neg.pending_peace_plan).toBeUndefined();

        state.meta.turn = 72;
        attachOwenStoltenbergAssemblyDecision(state);
        resolveEventDecision(state, 'os_rbih_tactical_acceptance_1993', 'reject_via_assembly');

        expect(neg.pending_peace_plan).toBeUndefined();
        expect(neg.peace_plan_history).toEqual([
            expect.objectContaining({
                plan_id: 'owen_stoltenberg',
                turn_offered: 70,
                responses: {
                    RBiH: 'rejected',
                    RS: 'accepted',
                    HRHB: 'accepted',
                },
                resolved: true,
            }),
        ]);
        expect(state.meta.game_over).not.toBe(true);
        expect(state.military.event_decision_log?.map((entry) => [
            entry.event_id,
            entry.response_id,
        ])).toEqual([
            ['owen_stoltenberg_plan_1993', 'accept'],
            ['os_rbih_tactical_acceptance_1993', 'reject_via_assembly'],
        ]);
    });

    it('keeps an emergent RS campaign running when RS accepts Owen-Stoltenberg before the non-player RBiH Assembly disposition', () => {
        const neg = makeNegotiationState({
            override_authority: { RBiH: 60, RS: 10, HRHB: 60 },
        });
        const state = makeState({
            turn: 70,
            war_start_turn: 0,
            player_faction: 'RS',
            decision_mode: 'emergent',
            controllers: makeControllers({ RBiH: 20, RS: 70, HRHB: 10 }),
            negotiation: neg,
        });

        evaluatePeacePlans(state);

        expect(neg.pending_peace_plan).toMatchObject({
            plan_id: 'owen_stoltenberg',
            bot_responses: {
                RBiH: 'rejected',
                HRHB: 'accepted',
            },
        });

        const result = resolvePeacePlan(state, 'owen_stoltenberg', 'accepted');

        expect(result).toEqual({
            all_accepted: false,
            rejection_factions: ['RBiH'],
        });
        expect(state.meta.game_over).not.toBe(true);
        expect(state.military.event_flags?.war_ended_early).not.toBe(true);
    });

    it('skips player faction in bot responses', () => {
        const state = makeState({ turn: 10, war_start_turn: 10, player_faction: 'RS' });
        evaluatePeacePlans(state);

        const pending = state.military.negotiation?.pending_peace_plan;
        expect(pending).toBeDefined();
        // RS is player — should not appear in bot_responses
        expect(pending!.bot_responses.RS).toBeUndefined();
        // RBiH and HRHB should have responses
        expect(pending!.bot_responses.RBiH).toBeDefined();
        expect(pending!.bot_responses.HRHB).toBeDefined();
    });

    it('historical headless evaluation records the documented Cutileiro outcome', () => {
        const neg = makeNegotiationState({ override_authority: { RBiH: 10, RS: 10, HRHB: 10 } });
        const state = makeState({
            turn: 0,
            war_start_turn: 0,
            no_player: true,
            controllers: makeControllers({ RBiH: 20, RS: 60, HRHB: 20 }),
            negotiation: neg,
        });

        evaluatePeacePlans(state);

        expect(neg.pending_peace_plan).toBeUndefined();
        expect(neg.peace_plan_history).toHaveLength(1);
        expect(neg.peace_plan_history[0]).toMatchObject({
            plan_id: 'cutileiro',
            turn_offered: 0,
            resolved: true,
        });
        expect(neg.peace_plan_history[0].responses).toEqual({
            RBiH: 'rejected',
            RS: 'accepted',
            HRHB: 'accepted',
        });
        expect(state.meta.game_over).not.toBe(true);
    });

    it('historical headless evaluation resolves every pre-Dayton plan without ending the war early', () => {
        const neg = makeNegotiationState({ override_authority: { RBiH: 10, RS: 10, HRHB: 10 } });
        const state = makeState({
            turn: 0,
            war_start_turn: 0,
            no_player: true,
            controllers: makeControllers({ RBiH: 20, RS: 60, HRHB: 20 }),
            negotiation: neg,
        });

        evaluatePeacePlans(state);
        state.meta.turn = 40;
        evaluatePeacePlans(state);
        state.meta.turn = 70;
        evaluatePeacePlans(state);
        state.meta.turn = 118;
        evaluatePeacePlans(state);

        expect(neg.pending_peace_plan).toBeUndefined();
        expect(neg.peace_plan_history.map(entry => ({
            plan_id: entry.plan_id,
            turn_offered: entry.turn_offered,
            responses: entry.responses,
            resolved: entry.resolved,
        }))).toEqual([
            {
                plan_id: 'cutileiro',
                turn_offered: 0,
                responses: { RBiH: 'rejected', RS: 'accepted', HRHB: 'accepted' },
                resolved: true,
            },
            {
                plan_id: 'vance_owen',
                turn_offered: 40,
                responses: { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' },
                resolved: true,
            },
            {
                plan_id: 'owen_stoltenberg',
                turn_offered: 70,
                responses: { RBiH: 'rejected', RS: 'accepted', HRHB: 'accepted' },
                resolved: true,
            },
            {
                plan_id: 'contact_group',
                turn_offered: 118,
                responses: { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' },
                resolved: true,
            },
        ]);
        expect(state.meta.game_over).not.toBe(true);
        expect(state.military.event_flags?.war_ended_early).toBeUndefined();
    });

    it('leaves the Dayton trigger to the dedicated negotiation system', () => {
        const neg = makeNegotiationState();
        const state = makeState({
            turn: 185,
            war_start_turn: 0,
            no_player: true,
            negotiation: neg,
        });

        evaluatePeacePlans(state);

        expect(neg.pending_peace_plan).toBeUndefined();
        expect(neg.peace_plan_history).toEqual([]);
        expect(state.meta.game_over).not.toBe(true);
    });
});

describe('Bot response logic', () => {
    it('uses the documented Cutileiro rejection in a real emergent HRHB desktop campaign', async () => {
        const { state } = await startNewCampaign(process.cwd(), 'HRHB', 'apr_1992');
        resolveEventDecision(state, 'hrhb_political_goal', 'croat_republic');

        const advanced = await advanceTurn(state, process.cwd());
        expect(advanced.error).toBeUndefined();
        expect(advanced.state.military.negotiation?.pending_peace_plan).toMatchObject({
            plan_id: 'cutileiro',
            bot_responses: {
                RBiH: 'accepted',
                RS: 'accepted',
            },
        });
        const result = resolvePeacePlan(advanced.state, 'cutileiro', 'accepted');
        expect(result).toEqual({
            all_accepted: false,
            rejection_factions: ['RBiH'],
        });
        expect(advanced.state.military.negotiation?.peace_plan_history.at(-1)?.responses).toEqual({
            RBiH: 'rejected',
            RS: 'accepted',
            HRHB: 'accepted',
        });
        expect(advanced.state.meta.game_over).not.toBe(true);
    }, 120_000);

    it('keeps an HRHB historical campaign running when HRHB accepts Cutileiro', () => {
        const state = makeState({
            turn: 10,
            war_start_turn: 10,
            player_faction: 'HRHB',
            decision_mode: 'emergent',
            controllers: makeControllers({ RBiH: 45, RS: 45, HRHB: 10 }),
        });

        evaluatePeacePlans(state);

        expect(state.military.negotiation?.pending_peace_plan?.bot_responses.RBiH).toBe('rejected');
        const result = resolvePeacePlan(state, 'cutileiro', 'accepted');
        expect(result).toEqual({
            all_accepted: false,
            rejection_factions: ['RBiH'],
        });
        expect(state.meta.game_over).not.toBe(true);
    });

    it('uses documented Cutileiro responses for non-player factions in an RS historical campaign', () => {
        const state = makeState({
            turn: 10,
            war_start_turn: 10,
            player_faction: 'RS',
            controllers: makeControllers({ RBiH: 20, RS: 60, HRHB: 20 }),
        });

        evaluatePeacePlans(state);

        const pending = state.military.negotiation?.pending_peace_plan;
        expect(pending?.bot_responses).toEqual({
            RBiH: 'rejected',
            HRHB: 'accepted',
        });

        resolvePeacePlan(state, 'cutileiro', 'accepted');
        expect(state.military.negotiation?.peace_plan_history.at(-1)?.responses).toEqual({
            RBiH: 'rejected',
            RS: 'accepted',
            HRHB: 'accepted',
        });
    });

    it('bot accepts when override_authority > 50', () => {
        const neg = makeNegotiationState({
            override_authority: { RS: 60, HRHB: 60 },
        });
        // RS holds 60% territory, plan offers 44% — normally would reject.
        // But override > 50 forces acceptance.
        const controllers = makeControllers({ RBiH: 20, RS: 60, HRHB: 20 });
        const state = makeState({
            turn: 10,
            war_start_turn: 10,
            decision_mode: 'emergent',
            controllers,
            negotiation: neg,
        });
        evaluatePeacePlans(state);

        const pending = state.military.negotiation?.pending_peace_plan;
        expect(pending).toBeDefined();
        expect(pending!.bot_responses.RS).toBe('accepted');
        expect(pending!.bot_responses.HRHB).toBe('accepted');
    });

    it('bot rejects when override low and territory favorable', () => {
        const neg = makeNegotiationState({
            override_authority: { RS: 10, HRHB: 10 },
        });
        // RS holds 60%, Cutileiro offers 44% — should reject
        const controllers = makeControllers({ RBiH: 20, RS: 60, HRHB: 20 });
        const state = makeState({
            turn: 10,
            war_start_turn: 10,
            decision_mode: 'emergent',
            controllers,
            negotiation: neg,
        });
        evaluatePeacePlans(state);

        const pending = state.military.negotiation?.pending_peace_plan;
        expect(pending).toBeDefined();
        expect(pending!.bot_responses.RS).toBe('rejected');
    });

    it('bot accepts when plan offers more than current territory', () => {
        const neg = makeNegotiationState({
            override_authority: { RS: 10, HRHB: 10 },
        });
        // RS holds 30%, Cutileiro offers 44% — should accept
        const controllers = makeControllers({ RBiH: 50, RS: 30, HRHB: 20 });
        const state = makeState({
            turn: 10,
            war_start_turn: 10,
            decision_mode: 'emergent',
            controllers,
            negotiation: neg,
        });
        evaluatePeacePlans(state);

        const pending = state.military.negotiation?.pending_peace_plan;
        expect(pending).toBeDefined();
        expect(pending!.bot_responses.RS).toBe('accepted');
    });
});

describe('resolvePeacePlan', () => {
    it('all-accept ends game', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'cutileiro',
            turn_offered: 10,
            bot_responses: { RS: 'accepted', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 10, war_start_turn: 10, negotiation: neg });

        const result = resolvePeacePlan(state, 'cutileiro', 'accepted');

        expect(result.all_accepted).toBe(true);
        expect(result.rejection_factions).toHaveLength(0);
        expect(state.meta.game_over).toBe(true);
        expect(state.meta.outcome).toBe('negotiated_peace:cutileiro');
    });

    it('player rejection prevents game over', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'vance_owen',
            turn_offered: 50,
            bot_responses: { RS: 'accepted', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 50, war_start_turn: 10, negotiation: neg });

        const result = resolvePeacePlan(state, 'vance_owen', 'rejected');

        expect(result.all_accepted).toBe(false);
        expect(result.rejection_factions).toContain('RBiH');
        expect(state.meta.game_over).toBeUndefined();
    });

    it('bot rejection prevents game over', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'vance_owen',
            turn_offered: 50,
            bot_responses: { RS: 'rejected', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 50, war_start_turn: 10, negotiation: neg });

        const result = resolvePeacePlan(state, 'vance_owen', 'accepted');

        expect(result.all_accepted).toBe(false);
        expect(result.rejection_factions).toContain('RS');
        expect(state.meta.game_over).toBeUndefined();
    });

    it('rejection applies credibility cost to rejecting faction', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'vance_owen',
            turn_offered: 50,
            bot_responses: { RS: 'rejected', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 50, war_start_turn: 10, negotiation: neg });

        const rsDimBefore = neg.strategic_dimensions!.RS.international_standing.event_modifier; // 0

        resolvePeacePlan(state, 'vance_owen', 'accepted');

        // RS rejected Vance-Owen: credibility_change_on_reject.RS = -20 → applied to international_standing
        expect(neg.strategic_dimensions!.RS.international_standing.event_modifier).toBe(rsDimBefore - 20);
        expect(neg.capital.RS.peace_plans_rejected).toContain('vance_owen');
    });

    it('rejection applies override authority increase', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'contact_group',
            turn_offered: 118,
            bot_responses: { RS: 'rejected', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 118, war_start_turn: 0, negotiation: neg });

        const rsOverrideBefore = neg.patron_relationships.RS.override_authority; // 10

        resolvePeacePlan(state, 'contact_group', 'accepted');

        // RS rejected Contact Group: override_change_on_reject.RS = 30
        expect(neg.patron_relationships.RS.override_authority).toBe(rsOverrideBefore + 30);
        expect(neg.patron_relationships.RS.relationship_events).toContain('rejected_contact_group');
    });

    it('rejection applies support loss to rejecting faction', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'contact_group',
            turn_offered: 118,
            bot_responses: { RS: 'rejected', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 118, war_start_turn: 0, negotiation: neg });

        const rsSupportBefore = neg.patron_relationships.RS.support_level;

        resolvePeacePlan(state, 'contact_group', 'accepted');

        expect(neg.patron_relationships.RS.support_level).toBe(rsSupportBefore - 5);
    });

    it('accepting factions get credit in peace_plans_accepted', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'cutileiro',
            turn_offered: 10,
            bot_responses: { RS: 'rejected', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 10, war_start_turn: 10, negotiation: neg });

        resolvePeacePlan(state, 'cutileiro', 'accepted');

        // RBiH (player) accepted, HRHB (bot) accepted — both should have credit
        expect(neg.capital.RBiH.peace_plans_accepted).toContain('cutileiro');
        expect(neg.capital.HRHB.peace_plans_accepted).toContain('cutileiro');
        // RS rejected — should NOT have credit
        expect(neg.capital.RS.peace_plans_accepted).not.toContain('cutileiro');
    });

    it('records plan in peace_plan_history after resolution', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'cutileiro',
            turn_offered: 10,
            bot_responses: { RS: 'accepted', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 10, war_start_turn: 10, negotiation: neg });

        resolvePeacePlan(state, 'cutileiro', 'rejected');

        expect(neg.peace_plan_history).toHaveLength(1);
        expect(neg.peace_plan_history[0].plan_id).toBe('cutileiro');
        expect(neg.peace_plan_history[0].resolved).toBe(true);
        expect(neg.peace_plan_history[0].responses.RBiH).toBe('rejected');
        expect(neg.peace_plan_history[0].responses.RS).toBe('accepted');
    });

    it('clears pending_peace_plan after resolution', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'cutileiro',
            turn_offered: 10,
            bot_responses: { RS: 'accepted', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 10, war_start_turn: 10, negotiation: neg });

        resolvePeacePlan(state, 'cutileiro', 'accepted');

        expect(neg.pending_peace_plan).toBeUndefined();
    });

    it('throws for unknown plan ID', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'cutileiro',
            turn_offered: 10,
            bot_responses: { RS: 'accepted', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 10, war_start_turn: 10, negotiation: neg });

        expect(() => resolvePeacePlan(state, 'nonexistent', 'accepted')).toThrow('Unknown peace plan ID');
    });

    it('throws when no pending plan matches', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'cutileiro',
            turn_offered: 10,
            bot_responses: { RS: 'accepted', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 10, war_start_turn: 10, negotiation: neg });

        expect(() => resolvePeacePlan(state, 'vance_owen', 'accepted')).toThrow('No pending peace plan');
    });

    it.each([
        ['accepted', 'accept', true],
        ['rejected', 'reject', false],
    ] as const)(
        'Vance-Owen %s consumes its duplicate event blocker with one durable event receipt',
        (peaceResponse, eventResponse, accepted) => {
            const previousNotificationFlag = process.env.AWWV_TWO_LEVEL_NOTIFICATIONS;
            process.env.AWWV_TWO_LEVEL_NOTIFICATIONS = 'true';
            try {
                const neg = makeNegotiationState();
                neg.pending_peace_plan = {
                    plan_id: 'vance_owen',
                    turn_offered: 40,
                    bot_responses: { RS: 'rejected', HRHB: 'accepted' },
                };
                const state = makeState({ turn: 40, war_start_turn: 0, negotiation: neg });
                attachVanceOwenEventDecision(state);

                resolvePeacePlan(state, 'vance_owen', peaceResponse);

                expect(neg.peace_plan_history).toHaveLength(1);
                expect(neg.peace_plan_history[0].responses.RBiH).toBe(peaceResponse);
                expect(state.military.pending_event_decisions?.map(decision => decision.event_id)).toEqual([
                    'ic_pressure_vopp_engagement',
                ]);
                expect(state.military.event_decision_log?.filter(
                    decision => decision.event_id === 'vance_owen_plan_1993',
                )).toEqual([expect.objectContaining({
                    response_id: eventResponse,
                    decision_source: 'player',
                    faction: 'RBiH',
                    turn: 40,
                })]);
                expect(state.military.event_flags?.vance_owen_accepted).toBe(accepted ? true : undefined);
                expect(state.military.pending_event_notifications?.map(
                    notification => notification.notification_id,
                )).toEqual([
                    'vance_owen_plan_1993:RBiH:HRHB',
                    'vance_owen_plan_1993:RBiH:RS',
                ]);
            } finally {
                if (previousNotificationFlag === undefined) {
                    delete process.env.AWWV_TWO_LEVEL_NOTIFICATIONS;
                } else {
                    process.env.AWWV_TWO_LEVEL_NOTIFICATIONS = previousNotificationFlag;
                }
            }
        },
    );

    it.each([
        ['accept', 'accepted'],
        ['reject', 'rejected'],
    ] as const)(
        'Vance-Owen event decision %s also resolves the duplicate peace-plan surface',
        (eventResponse, peaceResponse) => {
            const neg = makeNegotiationState();
            neg.pending_peace_plan = {
                plan_id: 'vance_owen',
                turn_offered: 40,
                bot_responses: { RS: 'rejected', HRHB: 'accepted' },
            };
            const state = makeState({ turn: 40, war_start_turn: 0, negotiation: neg });
            attachVanceOwenEventDecision(state);

            resolveEventDecision(state, 'vance_owen_plan_1993', eventResponse);

            expect(neg.pending_peace_plan).toBeUndefined();
            expect(neg.peace_plan_history).toHaveLength(1);
            expect(neg.peace_plan_history[0].responses.RBiH).toBe(peaceResponse);
            expect(state.military.pending_event_decisions?.map(decision => decision.event_id)).toEqual([
                'ic_pressure_vopp_engagement',
            ]);
            expect(state.military.event_decision_log?.filter(
                decision => decision.event_id === 'vance_owen_plan_1993',
            )).toHaveLength(1);
        },
    );

    it('records Vance-Owen once when the turn-39 event is resolved before the turn-40 negotiation offer exists', () => {
        const neg = makeNegotiationState();
        const state = makeState({ turn: 39, war_start_turn: 0, negotiation: neg });
        attachVanceOwenEventDecision(state);

        resolveEventDecision(state, 'vance_owen_plan_1993', 'accept');

        expect(neg.pending_peace_plan).toBeUndefined();
        expect(neg.peace_plan_history).toEqual([
            expect.objectContaining({
                plan_id: 'vance_owen',
                turn_offered: 39,
                responses: {
                    RBiH: 'accepted',
                    RS: 'rejected',
                    HRHB: 'accepted',
                },
                resolved: true,
            }),
        ]);
        expect(state.military.pending_event_decisions?.map(decision => decision.event_id)).toEqual([
            'ic_pressure_vopp_engagement',
        ]);
        expect(state.military.event_decision_log?.filter(
            decision => decision.event_id === 'vance_owen_plan_1993',
        )).toHaveLength(1);

        state.meta.turn = 40;
        evaluatePeacePlans(state);
        expect(neg.pending_peace_plan).toBeUndefined();
        expect(neg.peace_plan_history).toHaveLength(1);
    });
});

describe('Determinism', () => {
    it('same inputs produce identical outputs across runs', () => {
        const makeTestState = () => {
            const neg = makeNegotiationState({ override_authority: { RS: 10, HRHB: 10 } });
            const controllers = makeControllers({ RBiH: 40, RS: 40, HRHB: 20 });
            return makeState({ turn: 10, war_start_turn: 10, controllers, negotiation: neg });
        };

        const state1 = makeTestState();
        const state2 = makeTestState();

        evaluatePeacePlans(state1);
        evaluatePeacePlans(state2);

        const pending1 = state1.military.negotiation?.pending_peace_plan;
        const pending2 = state2.military.negotiation?.pending_peace_plan;

        expect(pending1).toEqual(pending2);
    });
});
