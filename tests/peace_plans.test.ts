import { describe, it, expect } from 'vitest';
import { evaluatePeacePlans, resolvePeacePlan } from '../src/sim/negotiation/peace_plans.js';
import { PEACE_PLANS, getPeacePlanById } from '../src/sim/negotiation/peace_plan_data.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../src/state/negotiation_types.js';
import type { NegotiationState } from '../src/state/negotiation_types.js';
import type { GameState, FactionId } from '../src/state/game_state.js';

const CANONICAL_FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

function makeState(overrides: {
    turn?: number;
    war_start_turn?: number;
    player_faction?: FactionId;
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
            player_faction: overrides.player_faction ?? 'RBiH',
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
    };
}

describe('Peace Plan Data', () => {
    it('defines 4 historical peace plans', () => {
        expect(PEACE_PLANS).toHaveLength(4);
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
});

describe('Bot response logic', () => {
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
        expect(state.meta.outcome).toBe('peace_plan:cutileiro');
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

        const rsBefore = neg.capital.RS.international_credibility; // 50

        resolvePeacePlan(state, 'vance_owen', 'accepted');

        // RS rejected Vance-Owen: credibility_change_on_reject.RS = -20
        expect(neg.capital.RS.international_credibility).toBe(rsBefore - 20);
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
