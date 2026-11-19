import { describe, it, expect } from 'vitest';
import { evaluatePeacePlans, getFactionTerritoryAreaPct, resolvePeacePlan } from '../src/sim/negotiation/peace_plans.js';
import { getOsidAreas } from '../src/sim/osid_areas.js';
import { strictCompare } from '../src/state/validateGameState.js';
import { PEACE_PLANS, getPeacePlanById } from '../src/sim/negotiation/peace_plan_data.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../src/state/negotiation_types.js';
import type { NegotiationState } from '../src/state/negotiation_types.js';
import { computeInternationalStandingBase, initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';
import { resolveEventDecision } from '../src/sim/events/resolve_decision.js';
import { computeNegotiationBreakdown } from '../src/sim/negotiation/compute_capital.js';
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

/** §6 E3a2: a routed Vance-Owen RBiH card (synthetic catalog row; plan_answer on every option). */
const VOPP_RBIH_CARD: EventDefinition = {
    id: 'vance_owen_plan_1993',
    trigger: { turn_min: 39, turn_max: 39, phase: 'war' },
    effect: { kind: 'narrative', text: 'Vance-Owen.' },
    once: true,
    responding_faction: 'RBiH',
    requires_player_response: true,
    historical_default_response_id: 'accept',
    response_options: [
        { id: 'accept', label: 'Accept', effects: [], sets_flags: { vance_owen_accepted: true }, plan_answer: { plan_id: 'vance_owen', response: 'accepted' } },
        { id: 'reject', label: 'Reject', effects: [], plan_answer: { plan_id: 'vance_owen', response: 'rejected' } },
    ],
} as EventDefinition;

function attachVanceOwenEventDecision(state: GameState): void {
    state.military.pending_event_decisions = [
        {
            event_id: 'vance_owen_plan_1993',
            event_title: 'Vance-Owen Peace Plan Presented',
            turn_fired: 39,
            faction: 'RBiH',
            requires_player_response: true,
            response_options: VOPP_RBIH_CARD.response_options!,
        },
    ];
}

describe('Peace Plan Data', () => {
    it('defines 4 historical peace plans', () => {
        // Cutileiro removed 2026-08-31: pre-war (March 1992), see peace_plan_data.ts.
        expect(PEACE_PLANS).toHaveLength(4);
        expect(PEACE_PLANS.map(p => p.id)).toEqual([
            'vance_owen', 'owen_stoltenberg', 'contact_group', 'dayton',
        ]);
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
    // §6 E3a2: no pointer at a plan's trigger week. A human player side with no recorded
    // answer gets the pointer (the modal) only as the close-week fallback.
    it('Vance-Owen: no pointer at war week 40; the fallback pointer at its close week 58', () => {
        const state = makeState({ turn: 50, war_start_turn: 10 }); // war week = 40
        evaluatePeacePlans(state);
        expect(state.military.negotiation?.pending_peace_plan).toBeUndefined();

        state.meta.turn = 68; // war week = 58
        evaluatePeacePlans(state);
        const pending = state.military.negotiation?.pending_peace_plan;
        expect(pending).toBeDefined();
        expect(pending!.plan_id).toBe('vance_owen');
        expect(pending!.turn_offered).toBe(50);
    });

    it('Owen-Stoltenberg: the fallback pointer at its close week 78', () => {
        const state = makeState({ turn: 70, war_start_turn: 0 });
        evaluatePeacePlans(state);
        expect(state.military.negotiation?.pending_peace_plan).toBeUndefined();
        state.meta.turn = 78;
        evaluatePeacePlans(state);
        expect(state.military.negotiation?.pending_peace_plan?.plan_id).toBe('owen_stoltenberg');
    });

    it('Contact Group: the fallback pointer at its close week 120', () => {
        const state = makeState({ turn: 118, war_start_turn: 0 });
        evaluatePeacePlans(state);
        expect(state.military.negotiation?.pending_peace_plan).toBeUndefined();
        state.meta.turn = 120;
        evaluatePeacePlans(state);
        expect(state.military.negotiation?.pending_peace_plan?.plan_id).toBe('contact_group');
    });

    it('does not trigger at non-matching war week', () => {
        const state = makeState({ turn: 15, war_start_turn: 10 }); // war week = 5
        evaluatePeacePlans(state);

        expect(state.military.negotiation?.pending_peace_plan).toBeUndefined();
    });

    it('does not trigger if plan already offered', () => {
        const neg = makeNegotiationState();
        neg.peace_plan_history.push({
            plan_id: 'vance_owen',
            turn_offered: 5,
            responses: { RBiH: 'rejected', RS: 'rejected', HRHB: 'rejected' },
            resolved: true,
        });
        const state = makeState({ turn: 68, war_start_turn: 10, negotiation: neg }); // VOPP close week
        evaluatePeacePlans(state);

        expect(state.military.negotiation?.pending_peace_plan).toBeUndefined();
        expect(neg.peace_plan_history).toHaveLength(1);
    });

    it('does not open another plan while a fallback is pending', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'vance_owen',
            turn_offered: 50,
            bot_responses: { RS: 'rejected', HRHB: 'accepted' },
        };
        // war week 78 = Owen-Stoltenberg close week, but the Vance-Owen fallback is still pending
        const state = makeState({ turn: 88, war_start_turn: 10, negotiation: neg });
        evaluatePeacePlans(state);

        // Should still be Vance-Owen, not replaced by Owen-Stoltenberg
        expect(state.military.negotiation?.pending_peace_plan?.plan_id).toBe('vance_owen');
    });

    it('does not trigger if game_over is true', () => {
        const state = makeState({ turn: 68, war_start_turn: 10 });
        state.meta.game_over = true;
        evaluatePeacePlans(state);

        expect(state.military.negotiation?.pending_peace_plan).toBeUndefined();
    });

    it('keeps an emergent RS campaign running when RS accepts Owen-Stoltenberg before the non-player RBiH Assembly disposition', () => {
        const neg = makeNegotiationState({
            override_authority: { RBiH: 60, RS: 10, HRHB: 60 },
        });
        const state = makeState({
            turn: 78,
            war_start_turn: 0,
            player_faction: 'RS',
            decision_mode: 'emergent',
            controllers: makeControllers({ RBiH: 20, RS: 70, HRHB: 10 }),
            negotiation: neg,
        });

        evaluatePeacePlans(state);

        // The RBiH Owen-Stoltenberg lock: its fallback is the historical Assembly refusal.
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
        const state = makeState({ turn: 68, war_start_turn: 10, player_faction: 'RS' }); // VOPP close week
        evaluatePeacePlans(state);

        const pending = state.military.negotiation?.pending_peace_plan;
        expect(pending).toBeDefined();
        // RS is player — should not appear in bot_responses
        expect(pending!.bot_responses.RS).toBeUndefined();
        // RBiH and HRHB should have responses
        expect(pending!.bot_responses.RBiH).toBeDefined();
        expect(pending!.bot_responses.HRHB).toBeDefined();
    });

    it('historical headless evaluation with no answering cards resolves every pre-Dayton plan at its close week, without ending the war early', () => {
        const neg = makeNegotiationState({ override_authority: { RBiH: 10, RS: 10, HRHB: 10 } });
        const state = makeState({
            turn: 0,
            war_start_turn: 0,
            no_player: true,
            controllers: makeControllers({ RBiH: 20, RS: 60, HRHB: 20 }),
            negotiation: neg,
        });

        for (let turn = 0; turn <= 125; turn++) {
            state.meta.turn = turn;
            evaluatePeacePlans(state);
        }

        expect(neg.pending_peace_plan).toBeUndefined();
        expect(neg.peace_plan_history.map(entry => ({
            plan_id: entry.plan_id,
            turn_offered: entry.turn_offered,
            responses: entry.responses,
            resolved: entry.resolved,
            resolved_turn: entry.resolved_turn,
        }))).toEqual([
            {
                plan_id: 'vance_owen',
                turn_offered: 40,
                responses: { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' },
                resolved: true,
                resolved_turn: 58,
            },
            {
                plan_id: 'owen_stoltenberg',
                turn_offered: 70,
                responses: { RBiH: 'rejected', RS: 'accepted', HRHB: 'accepted' },
                resolved: true,
                resolved_turn: 78,
            },
            {
                plan_id: 'contact_group',
                turn_offered: 118,
                responses: { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' },
                resolved: true,
                resolved_turn: 120,
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

describe('Bot response logic (the close-week fallback)', () => {
    it('bot accepts when override_authority > 50', () => {
        const neg = makeNegotiationState({
            override_authority: { RS: 60, HRHB: 60 },
        });
        // RS holds 60% territory, Vance-Owen offers 43% — normally would reject.
        // But override > 50 forces acceptance.
        const controllers = makeControllers({ RBiH: 20, RS: 60, HRHB: 20 });
        const state = makeState({
            turn: 68,
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

    // REMOVED 2026-08-31 with the Cutileiro plan: 'bot rejects when override low and
    // territory favorable' asserted the LEGACY fallback (proposed >= current ? accept :
    // reject), which only ran because Cutileiro was excluded from personality scoring.
    // With that exclusion gone every plan routes through pickPoliticalResponse, whose
    // territory behaviour is owned by tests/sim/political/political_peace_plan.test.ts
    // (Group 2: RS territory floor; Group 4: Territory signal) on states built for it.
    // Re-pointing this integration test at Vance-Owen made it assert scorer output from
    // a synthetic minimal state, which is not what it was written to check.

    it('RS measures its holding by AREA, the unit of the plan split (B0: no Vance-Owen peace)', () => {
        // RS takes the largest settlements until it holds 40% of them. By count that is
        // under Vance-Owen's 43% offer; by area it is far above 43% + the 18pp floor.
        // The settlement-count measure accepted here and ended the war in January 1993.
        const { areas, total } = getOsidAreas();
        const bySize = Object.keys(areas).sort((a, b) => (areas[b]! - areas[a]!) || strictCompare(a, b));
        const rsCount = Math.floor(bySize.length * 0.4);
        const controllers: Record<string, string> = {};
        bySize.forEach((osid, i) => { controllers[osid] = i < rsCount ? 'RS' : (i % 2 === 0 ? 'RBiH' : 'HRHB'); });
        const rsArea = bySize.slice(0, rsCount).reduce((s, o) => s + areas[o]!, 0) / total * 100;
        expect(rsCount / bySize.length * 100).toBeLessThan(43);
        expect(rsArea).toBeGreaterThan(43 + 18);
        expect(getFactionTerritoryAreaPct({ political: { political_controllers: controllers } } as unknown as GameState, 'RS'))
            .toBeCloseTo(rsArea, 6);

        const state = makeState({
            turn: 68, // VOPP close week (war week 58): the fallback answers every side
            war_start_turn: 10,
            decision_mode: 'emergent',
            no_player: true,
            controllers,
            negotiation: makeNegotiationState({ override_authority: { RS: 10, HRHB: 10, RBiH: 10 } }),
        });
        evaluatePeacePlans(state);

        const history = state.military.negotiation?.peace_plan_history ?? [];
        expect(history.find(h => h.plan_id === 'vance_owen')?.responses.RS).toBe('rejected');
        expect(state.meta.game_over).not.toBe(true);
    });

    it('ground moves the RS answer: RS on little AREA accepts Vance-Owen however many settlements it holds', () => {
        // The played half of B0. RS holds the SMALLEST 65% of settlements: by count a
        // 22pp gap over the 43% offer (the old measure hard-rejected on the 18pp floor),
        // by area well under the offer. A player who takes ground from RS moves this answer.
        const { areas, total } = getOsidAreas();
        const bySize = Object.keys(areas).sort((a, b) => (areas[a]! - areas[b]!) || strictCompare(a, b));
        const rsCount = Math.ceil(bySize.length * 0.65);
        const controllers: Record<string, string> = {};
        bySize.forEach((osid, i) => { controllers[osid] = i < rsCount ? 'RS' : (i % 2 === 0 ? 'RBiH' : 'HRHB'); });
        const rsArea = bySize.slice(0, rsCount).reduce((s, o) => s + areas[o]!, 0) / total * 100;
        expect(rsCount / bySize.length * 100 - 43).toBeGreaterThan(18);
        expect(rsArea).toBeLessThan(43);

        const state = makeState({
            turn: 68,
            war_start_turn: 10,
            decision_mode: 'emergent',
            controllers,
            negotiation: makeNegotiationState({ override_authority: { RS: 10, HRHB: 10, RBiH: 10 } }),
        });
        evaluatePeacePlans(state);
        expect(state.military.negotiation?.pending_peace_plan?.bot_responses.RS).toBe('accepted');
    });

    it('bot accepts when plan offers more than current territory', () => {
        const neg = makeNegotiationState({
            override_authority: { RS: 10, HRHB: 10 },
        });
        // RS holds 30%, Vance-Owen offers 43% — should accept
        const controllers = makeControllers({ RBiH: 50, RS: 30, HRHB: 20 });
        const state = makeState({
            turn: 68,
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
            plan_id: 'vance_owen',
            turn_offered: 10,
            bot_responses: { RS: 'accepted', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 10, war_start_turn: 10, negotiation: neg });

        const result = resolvePeacePlan(state, 'vance_owen', 'accepted');

        expect(result.all_accepted).toBe(true);
        expect(result.rejection_factions).toHaveLength(0);
        expect(state.meta.game_over).toBe(true);
        expect(state.meta.outcome).toBe('negotiated_peace:vance_owen');
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

    it('rejection is charged through the record: the base reads the graded value, no modifier write (§6 E3a2 item 5)', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'vance_owen',
            turn_offered: 50,
            bot_responses: { RS: 'rejected', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 50, war_start_turn: 10, negotiation: neg });

        resolvePeacePlan(state, 'vance_owen', 'accepted');

        // The resolution writes no international_standing modifier for anyone.
        for (const faction of CANONICAL_FACTIONS) {
            expect(neg.strategic_dimensions![faction].international_standing.event_modifier, faction).toBe(0);
        }
        // RS rejected Vance-Owen: the base reads credibility_change_on_reject.RS = -20 from the record.
        expect(computeInternationalStandingBase(state, 'RS')).toBe(50 - 20);
        expect(computeInternationalStandingBase(state, 'RBiH')).toBe(50 + 10);
        // §6 E3a1 D3: the rejection is recorded once, in peace_plan_history (resolvePeacePlan no
        // longer pushes capital.peace_plans_rejected; computeNegotiationBreakdown rebuilds it).
        expect(neg.peace_plan_history[neg.peace_plan_history.length - 1]?.responses.RS).toBe('rejected');
        computeNegotiationBreakdown(state);
        expect(neg.capital.RS.peace_plans_rejected).toContain('vance_owen');
    });

    it('rejection leaves override authority alone (§6 E3a2 ruling item 7: override_change_on_reject retired)', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'contact_group',
            turn_offered: 118,
            bot_responses: { RS: 'rejected', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 118, war_start_turn: 0, negotiation: neg });

        const overrideBefore = Object.fromEntries(
            CANONICAL_FACTIONS.map((faction) => [faction, neg.patron_relationships[faction].override_authority]),
        );

        resolvePeacePlan(state, 'contact_group', 'accepted');

        // The per-turn rebuild (update-patron-pressure) owns override_authority; the plan writes none.
        for (const faction of CANONICAL_FACTIONS) {
            expect(neg.patron_relationships[faction].override_authority, faction).toBe(overrideBefore[faction]);
        }
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
            plan_id: 'vance_owen',
            turn_offered: 10,
            bot_responses: { RS: 'rejected', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 10, war_start_turn: 10, negotiation: neg });

        resolvePeacePlan(state, 'vance_owen', 'accepted');
        // §6 E3a1 D3: credit comes from peace_plan_history via the per-turn rebuild, not from a
        // push at resolution time.
        computeNegotiationBreakdown(state);

        // RBiH (player) accepted, HRHB (bot) accepted — both should have credit
        expect(neg.capital.RBiH.peace_plans_accepted).toContain('vance_owen');
        expect(neg.capital.HRHB.peace_plans_accepted).toContain('vance_owen');
        // RS rejected — should NOT have credit
        expect(neg.capital.RS.peace_plans_accepted).not.toContain('vance_owen');
    });

    it('records plan in peace_plan_history after resolution', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'vance_owen',
            turn_offered: 10,
            bot_responses: { RS: 'accepted', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 10, war_start_turn: 10, negotiation: neg });

        resolvePeacePlan(state, 'vance_owen', 'rejected');

        expect(neg.peace_plan_history).toHaveLength(1);
        expect(neg.peace_plan_history[0].plan_id).toBe('vance_owen');
        expect(neg.peace_plan_history[0].resolved).toBe(true);
        expect(neg.peace_plan_history[0].responses.RBiH).toBe('rejected');
        expect(neg.peace_plan_history[0].responses.RS).toBe('accepted');
    });

    it('clears pending_peace_plan after resolution', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'vance_owen',
            turn_offered: 10,
            bot_responses: { RS: 'accepted', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 10, war_start_turn: 10, negotiation: neg });

        resolvePeacePlan(state, 'vance_owen', 'accepted');

        expect(neg.pending_peace_plan).toBeUndefined();
    });

    it('throws for unknown plan ID', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'vance_owen',
            turn_offered: 10,
            bot_responses: { RS: 'accepted', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 10, war_start_turn: 10, negotiation: neg });

        expect(() => resolvePeacePlan(state, 'nonexistent', 'accepted')).toThrow('Unknown peace plan ID');
    });

    it('throws when no pending plan matches', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'vance_owen',
            turn_offered: 10,
            bot_responses: { RS: 'accepted', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 10, war_start_turn: 10, negotiation: neg });

        expect(() => resolvePeacePlan(state, 'contact_group', 'accepted')).toThrow('No pending peace plan');
    });

    // §6 E3a2 retired the Vance-Owen and Owen-Stoltenberg special cases (the card used to write
    // the plan record itself and to consume the modal). The routed engine is pinned in
    // tests/s6_e3a2_plan_chain.test.ts; here only the fallback/card interplay of an older save.

    it('a v42 pointer is settled from the log when the player answers the routed card instead of the modal', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'vance_owen',
            turn_offered: 40,
            bot_responses: { RS: 'rejected', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 40, war_start_turn: 0, negotiation: neg });
        attachVanceOwenEventDecision(state);

        resolveEventDecision(state, 'vance_owen_plan_1993', 'reject');
        // The card only applies and logs; it writes no plan record.
        expect(neg.peace_plan_history).toEqual([]);
        expect(neg.pending_peace_plan?.plan_id).toBe('vance_owen');
        expect(state.military.pending_event_decisions).toEqual([]);

        // The next evaluate-peace-plans step reads the routed answer and settles the pointer.
        state.meta.turn = 41;
        evaluatePeacePlans(state, [VOPP_RBIH_CARD]);
        expect(neg.pending_peace_plan).toBeUndefined();
        expect(neg.peace_plan_history.map((row) => [row.plan_id, row.turn_offered, row.responses, row.resolved_turn])).toEqual([
            ['vance_owen', 40, { RBiH: 'rejected', RS: 'rejected', HRHB: 'accepted' }, 41],
        ]);
    });

    it('resolving the fallback modal leaves a pending routed card alone; its later answer is ignored', () => {
        const neg = makeNegotiationState();
        neg.pending_peace_plan = {
            plan_id: 'vance_owen',
            turn_offered: 40,
            bot_responses: { RS: 'rejected', HRHB: 'accepted' },
        };
        const state = makeState({ turn: 40, war_start_turn: 0, negotiation: neg });
        attachVanceOwenEventDecision(state);

        resolvePeacePlan(state, 'vance_owen', 'accepted');
        expect(neg.peace_plan_history).toHaveLength(1);
        expect(state.military.pending_event_decisions?.map((decision) => decision.event_id)).toEqual(['vance_owen_plan_1993']);

        resolveEventDecision(state, 'vance_owen_plan_1993', 'reject');
        state.meta.turn = 41;
        const before = structuredClone(neg);
        evaluatePeacePlans(state, [VOPP_RBIH_CARD]);
        expect(neg).toEqual(before);
    });
});

describe('Determinism', () => {
    it('same inputs produce identical outputs across runs', () => {
        const makeTestState = () => {
            const neg = makeNegotiationState({ override_authority: { RS: 10, HRHB: 10 } });
            const controllers = makeControllers({ RBiH: 40, RS: 40, HRHB: 20 });
            return makeState({ turn: 68, war_start_turn: 10, decision_mode: 'emergent', controllers, negotiation: neg });
        };

        const state1 = makeTestState();
        const state2 = makeTestState();

        evaluatePeacePlans(state1);
        evaluatePeacePlans(state2);

        const pending1 = state1.military.negotiation?.pending_peace_plan;
        const pending2 = state2.military.negotiation?.pending_peace_plan;

        expect(pending1).toBeDefined();
        expect(pending1).toEqual(pending2);
    });
});
