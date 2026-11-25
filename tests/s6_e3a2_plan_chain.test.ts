/**
 * §6 E3a2 (ruled 2026-11-17, three seats, two rounds): the peace-plan chain, engine.
 *
 * Ruling items covered here (synthetic catalogs; the shipped catalog is pinned by
 * tests/s6_e3a2_routed_catalog.test.ts):
 * 1. The answer store is (a′): each routed option declares `plan_answer`; a side's answer is
 *    read from `event_decision_log`. evaluate-peace-plans is the only resolver; it writes one
 *    complete row when all three answers are recorded, or at the close week with today's
 *    fallback (bots: historical_responses / plan scorer; a human player: the pointer + modal;
 *    Observer answers it). Write-once; a routed row whose option is missing throws.
 * 2. The conditional form (`accepted_if`) is evaluated at resolution.
 * 3. Bots: the plan owner decides A/R; the card applies the matching data-declared option.
 * 5. Plan terms enter the clamped base: accept +10, reject = credibility_change_on_reject.
 * 8. The nine graded values are unchanged and unsourced; the list may only shrink.
 * 9. Window test (trigger week to close week); the advance gate blocks while a fallback or a
 *    routed card is pending; the harness defer asserts.
 * 10. The Owen-Stoltenberg counter-offers retire on the player path for routed plans.
 */
import { describe, expect, it } from 'vitest';
import type { EventDefinition, EventResponseOption } from '../src/sim/events/event_types.js';
import type { FactionId, GameState } from '../src/state/game_state.js';
import type { NegotiationState, PeacePlanResponse } from '../src/state/negotiation_types.js';
import { createDefaultPatronRelationship, createEmptyCapital } from '../src/state/negotiation_types.js';
import {
    computeInternationalStandingBase,
    derivePeacePlanResponseLists,
    initializeStrategicDimensions,
} from '../src/sim/events/strategic_dimensions.js';
import * as peacePlans from '../src/sim/negotiation/peace_plans.js';
import { PEACE_PLANS, getPeacePlanById } from '../src/sim/negotiation/peace_plan_data.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { resolveEventDecision } from '../src/sim/events/resolve_decision.js';
import { resolveCounterOffers } from '../src/sim/negotiation/counter_offer_generator.js';
import { listBlockingPlayerDecisions } from '../src/state/player_decision_manifest.js';
import { shouldShowPeacePlanModal } from '../src/ui/map/utils/peacePlanDismissal.js';
import { getOsidAreas } from '../src/sim/osid_areas.js';
import { strictCompare } from '../src/state/validateGameState.js';
import { computeBotPlanResponse } from '../src/sim/negotiation/plan_answer.js';
import { validatePlanAnswers } from '../src/sim/events/event_loader.js';
import { ANSWER_AHEAD_EVENT_IDS, OPENING_FOUNDATIONAL_EVENT_IDS } from '../src/sim/events/answer_ahead_of_firing.js';
import { readFileSync } from 'node:fs';

const FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];
type Answer = 'accepted' | 'rejected';
type PlanAnswerSpec = { plan_id: string; response: Answer; accepted_if?: Record<string, unknown> } | null;

// The engine entry point takes the event catalog as its second argument (E3a2).
const evaluatePeacePlans = peacePlans.evaluatePeacePlans as (state: GameState, defs?: readonly EventDefinition[]) => void;
const { resolvePeacePlan } = peacePlans;

// ─── Synthetic routed catalog (ids mirror the shipped cards) ───────────────────────────────

const A = (plan_id: string): PlanAnswerSpec => ({ plan_id, response: 'accepted' });
const R = (plan_id: string): PlanAnswerSpec => ({ plan_id, response: 'rejected' });

function routedCard(
    id: string,
    faction: FactionId,
    window: [number, number],
    defaultId: string,
    options: Array<[string, PlanAnswerSpec]>,
): EventDefinition {
    return {
        id,
        trigger: { turn_min: window[0], turn_max: window[1], phase: 'war' },
        effect: { kind: 'narrative', text: id },
        once: true,
        requires_player_response: true,
        responding_faction: faction,
        bot_response_logic: 'historical',
        historical_default_response_id: defaultId,
        response_options: options.map(([optionId, answer]) => ({
            id: optionId,
            label: optionId,
            effects: [],
            aggression_affinity: 0,
            risk_level: 0.5,
            plan_answer: answer,
        }) as unknown as EventResponseOption),
    } as EventDefinition;
}

const VOPP_RBIH = routedCard('vance_owen_plan_1993', 'RBiH', [39, 39], 'accept', [
    ['accept', A('vance_owen')],
    ['reject', R('vance_owen')],
]);
const VOPP_HRHB = routedCard('hrhb_vance_owen_acceptance_1993', 'HRHB', [51, 54], 'accept_vance_owen_plan', [
    ['accept_vance_owen_plan', A('vance_owen')],
    ['accept_with_modifications', R('vance_owen')],
    ['condition_on_arbih_reciprocity', {
        plan_id: 'vance_owen',
        response: 'rejected',
        accepted_if: { type: 'peace_plan_response', plan_id: 'vance_owen', faction: 'RBiH', response: 'accepted' },
    }],
    ['reject_plan', R('vance_owen')],
]);
const VOPP_RS = routedCard('rs_assembly_rejects_voplan_1993', 'RS', [56, 58], 'accept_rejection', [
    ['accept_rejection', R('vance_owen')],
    ['override_assembly', A('vance_owen')],
]);
const OS_PRESIDENCY = routedCard('owen_stoltenberg_plan_1993', 'RBiH', [70, 70], 'accept', [
    ['accept', null],
    ['reject', R('owen_stoltenberg')],
]);
const OS_ASSEMBLY = routedCard('os_rbih_tactical_acceptance_1993', 'RBiH', [72, 76], 'reject_via_assembly', [
    ['reject_via_assembly', R('owen_stoltenberg')],
    ['accept_for_optics', A('owen_stoltenberg')],
]);
const OS_RS = routedCard('rs_owen_stoltenberg_response_1993', 'RS', [75, 78], 'accept_union_three_republics', [
    ['accept_union_three_republics', A('owen_stoltenberg')],
    ['reject_plan', R('owen_stoltenberg')],
]);
const OS_HRHB = routedCard('hrhb_owen_stoltenberg_response_1993', 'HRHB', [75, 78], 'accept_union_three_republics', [
    ['accept_union_three_republics', A('owen_stoltenberg')],
    ['accept_with_modifications', R('owen_stoltenberg')],
    ['reject_plan', R('owen_stoltenberg')],
]);
const CG_RBIH = routedCard('rbih_contact_group_response_1994', 'RBiH', [118, 120], 'accept_51_49_plan', [
    ['accept_51_49_plan', A('contact_group')],
    ['reject_51_49_plan', R('contact_group')],
    ['accept_with_public_reservations', R('contact_group')],
]);
const CG_RS = routedCard('rs_contact_group_response_1994', 'RS', [118, 120], 'reject_51_49_plan', [
    ['reject_51_49_plan', R('contact_group')],
    ['accept_51_49_plan', A('contact_group')],
    ['negotiate_amendments', R('contact_group')],
]);
const CG_HRHB = routedCard('hrhb_contact_group_response_1994', 'HRHB', [118, 120], 'accept_51_49_plan', [
    ['accept_51_49_plan', A('contact_group')],
    ['reject_51_49_plan', R('contact_group')],
    ['accept_with_amendments', R('contact_group')],
]);
const CATALOG: EventDefinition[] = [
    VOPP_RBIH, VOPP_HRHB, VOPP_RS, OS_PRESIDENCY, OS_ASSEMBLY, OS_RS, OS_HRHB, CG_RBIH, CG_RS, CG_HRHB,
];

// ─── State helpers ─────────────────────────────────────────────────────────────────────────

function makeNegotiation(): NegotiationState {
    const capital: NegotiationState['capital'] = {};
    const patron_relationships: NegotiationState['patron_relationships'] = {};
    for (const faction of FACTIONS) {
        capital[faction] = createEmptyCapital();
        patron_relationships[faction] = createDefaultPatronRelationship(faction);
    }
    return { capital, patron_relationships, peace_plan_history: [], strategic_dimensions: initializeStrategicDimensions() };
}

function makeState(opts: {
    turn: number;
    player_faction?: FactionId;
    decision_mode?: 'historical' | 'emergent';
    autonomy_level?: number;
    controllers?: Record<string, string>;
} ): GameState {
    return {
        meta: {
            turn: opts.turn,
            phase: 'war',
            seed: 1,
            date: '1993-01-01',
            war_start_turn: 0,
            ...(opts.player_faction ? { player_faction: opts.player_faction } : {}),
            ...(opts.decision_mode ? { decision_mode: opts.decision_mode } : {}),
            ...(opts.autonomy_level != null ? { autonomy_level: opts.autonomy_level } : {}),
        },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: { formations: {}, fired_event_ids: [], negotiation: makeNegotiation(), event_flags: {} },
        political: { political_controllers: opts.controllers ?? {} },
        displacement: {},
    } as unknown as GameState;
}

function logAnswer(state: GameState, eventId: string, responseId: string, faction: FactionId, turn: number): void {
    (state.military.event_decision_log ??= []).push({
        event_id: eventId,
        response_id: responseId,
        decision_source: 'bot_ai_default',
        faction,
        turn,
    });
}

function pendingCard(state: GameState, def: EventDefinition, turn: number): void {
    (state.military.pending_event_decisions ??= []).push({
        event_id: def.id,
        event_title: def.id,
        turn_fired: turn,
        response_options: def.response_options!,
        faction: def.responding_faction!,
        requires_player_response: true,
    });
}

function rowsOf(state: GameState): Array<Pick<PeacePlanResponse, 'plan_id' | 'turn_offered' | 'responses' | 'resolved' | 'resolved_turn'>> {
    return (state.military.negotiation?.peace_plan_history ?? []).map((row) => ({
        plan_id: row.plan_id,
        turn_offered: row.turn_offered,
        responses: row.responses,
        resolved: row.resolved,
        resolved_turn: row.resolved_turn,
    }));
}

function at(state: GameState, turn: number): GameState {
    state.meta.turn = turn;
    return state;
}

// ─── Item 9: plan windows ─────────────────────────────────────────────────────────────────

describe('§6 E3a2 item 9: plan windows and close weeks', () => {
    it('each routed plan closes at its last card window: VOPP 58, OS 78, CG 120; windows never overlap', () => {
        const close = (id: string) => (getPeacePlanById(id) as { close_week?: number } | undefined)?.close_week;
        expect(close('vance_owen')).toBe(58);
        expect(close('owen_stoltenberg')).toBe(78);
        expect(close('contact_group')).toBe(120);
        expect(close('dayton')).toBeUndefined();
        const routed = PEACE_PLANS.filter((plan) => plan.id !== 'dayton');
        for (let i = 1; i < routed.length; i++) {
            expect(routed[i]!.trigger_week, routed[i]!.id).toBeGreaterThan(close(routed[i - 1]!.id)!);
        }
    });
});

// ─── Item 1: the (a′) store and the one resolver ──────────────────────────────────────────

describe('§6 E3a2 item 1: answers from the decision log, one resolver', () => {
    it('no pointer and no row at the trigger week, even with a player faction', () => {
        const state = makeState({ turn: 40, player_faction: 'RS' });
        logAnswer(state, 'vance_owen_plan_1993', 'accept', 'RBiH', 39);
        evaluatePeacePlans(state, CATALOG);
        expect(state.military.negotiation!.pending_peace_plan).toBeUndefined();
        expect(rowsOf(state)).toEqual([]);
    });

    it('resolves at the first step where all three answers are recorded, on the last answer\'s turn', () => {
        const state = makeState({ turn: 40 });
        logAnswer(state, 'vance_owen_plan_1993', 'accept', 'RBiH', 39);
        evaluatePeacePlans(at(state, 40), CATALOG);
        logAnswer(state, 'hrhb_vance_owen_acceptance_1993', 'accept_vance_owen_plan', 'HRHB', 51);
        evaluatePeacePlans(at(state, 51), CATALOG);
        expect(rowsOf(state)).toEqual([]);
        logAnswer(state, 'rs_assembly_rejects_voplan_1993', 'accept_rejection', 'RS', 56);
        evaluatePeacePlans(at(state, 56), CATALOG);
        expect(rowsOf(state)).toEqual([{
            plan_id: 'vance_owen',
            turn_offered: 40,
            responses: { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' },
            resolved: true,
            resolved_turn: 56,
        }]);
        // Costs land at resolution: RS pays the plan's −5 support and the relationship event.
        const rs = state.military.negotiation!.patron_relationships.RS!;
        expect(rs.support_level).toBe(createDefaultPatronRelationship('RS').support_level - 5);
        expect(rs.relationship_events).toEqual(['rejected_vance_owen']);
    });

    it('the Owen-Stoltenberg Presidency accept writes nothing; the Assembly writes RBiH\'s answer', () => {
        const state = makeState({ turn: 70 });
        logAnswer(state, 'owen_stoltenberg_plan_1993', 'accept', 'RBiH', 70);
        logAnswer(state, 'rs_owen_stoltenberg_response_1993', 'accept_union_three_republics', 'RS', 70);
        logAnswer(state, 'hrhb_owen_stoltenberg_response_1993', 'accept_union_three_republics', 'HRHB', 70);
        evaluatePeacePlans(state, CATALOG);
        expect(rowsOf(state)).toEqual([]);
        logAnswer(state, 'os_rbih_tactical_acceptance_1993', 'reject_via_assembly', 'RBiH', 75);
        evaluatePeacePlans(at(state, 75), CATALOG);
        expect(rowsOf(state).map((row) => [row.plan_id, row.responses, row.resolved_turn])).toEqual([
            ['owen_stoltenberg', { RBiH: 'rejected', RS: 'accepted', HRHB: 'accepted' }, 75],
        ]);
        expect(state.meta.game_over).not.toBe(true);
    });

    it('close-week fallback (headless, historical): missing bot answers come from historical_responses', () => {
        const state = makeState({ turn: 57 });
        logAnswer(state, 'vance_owen_plan_1993', 'reject', 'RBiH', 39);
        evaluatePeacePlans(state, CATALOG);
        expect(rowsOf(state)).toEqual([]);
        evaluatePeacePlans(at(state, 58), CATALOG);
        expect(rowsOf(state).map((row) => [row.responses, row.resolved_turn])).toEqual([
            [{ RBiH: 'rejected', RS: 'rejected', HRHB: 'accepted' }, 58],
        ]);
    });

    it('close-week fallback for a silent human player side: the plan owner answers their seat as headless does (§14.10a)', () => {
        // Player-override model (2026-11-25): a live RS president who left the plan unanswered
        // by its close week gets the answer headless gives RS; no pointer (modal) opens.
        const state = makeState({ turn: 58, player_faction: 'RS' });
        logAnswer(state, 'vance_owen_plan_1993', 'reject', 'RBiH', 39);
        const headless = makeState({ turn: 58 });
        logAnswer(headless, 'vance_owen_plan_1993', 'reject', 'RBiH', 39);
        evaluatePeacePlans(state, CATALOG);
        evaluatePeacePlans(headless, CATALOG);
        expect(state.military.negotiation!.pending_peace_plan).toBeUndefined();
        expect(rowsOf(state)).toEqual(rowsOf(headless));
        expect(rowsOf(state).map((row) => row.responses)).toEqual([{ RBiH: 'rejected', RS: 'rejected', HRHB: 'accepted' }]);
        expect(state.meta.proposal_decision_history?.map((row) => row.resolved_by)).toEqual(['silence']);
    });

    it('an explicit answer on a pending fallback (an older save\'s pointer) still wins over the staff', () => {
        const state = makeState({ turn: 58, player_faction: 'RS' });
        logAnswer(state, 'vance_owen_plan_1993', 'reject', 'RBiH', 39);
        state.military.negotiation!.pending_peace_plan = {
            plan_id: 'vance_owen',
            turn_offered: 40,
            bot_responses: { RBiH: 'rejected', HRHB: 'accepted' },
        };
        resolvePeacePlan(state, 'vance_owen', 'accepted');
        expect(rowsOf(state).map((row) => row.responses)).toEqual([{ RBiH: 'rejected', RS: 'accepted', HRHB: 'accepted' }]);
    });

    it('the fallback never pre-empts the player\'s pending routed card; the plan resolves once the card is answered', () => {
        const state = makeState({ turn: 58, player_faction: 'RS' });
        logAnswer(state, 'vance_owen_plan_1993', 'accept', 'RBiH', 39);
        logAnswer(state, 'hrhb_vance_owen_acceptance_1993', 'accept_vance_owen_plan', 'HRHB', 51);
        pendingCard(state, VOPP_RS, 58);
        evaluatePeacePlans(state, CATALOG);
        expect(state.military.negotiation!.pending_peace_plan).toBeUndefined();
        expect(rowsOf(state)).toEqual([]);
        // Answered between turns (the card blocks the advance); the next step resolves from the log.
        state.military.pending_event_decisions = [];
        logAnswer(state, 'rs_assembly_rejects_voplan_1993', 'accept_rejection', 'RS', 58);
        evaluatePeacePlans(at(state, 59), CATALOG);
        expect(rowsOf(state).map((row) => [row.responses, row.resolved_turn])).toEqual([
            [{ RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' }, 59],
        ]);
    });

    it('Observer answers the fallback automatically with the historical owner', () => {
        const state = makeState({ turn: 58, player_faction: 'RS', autonomy_level: 3 });
        logAnswer(state, 'vance_owen_plan_1993', 'accept', 'RBiH', 39);
        evaluatePeacePlans(state, CATALOG);
        expect(state.military.negotiation!.pending_peace_plan).toBeUndefined();
        expect(rowsOf(state).map((row) => row.responses)).toEqual([{ RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' }]);
    });

    it('a plan whose window has passed is never opened (no catch-up)', () => {
        const state = makeState({ turn: 60 });
        evaluatePeacePlans(state, CATALOG);
        expect(rowsOf(state)).toEqual([]);
    });

    it('write-once: a second non-null answer for one (plan, side) is a runtime error', () => {
        const state = makeState({ turn: 75 });
        logAnswer(state, 'owen_stoltenberg_plan_1993', 'reject', 'RBiH', 70);
        logAnswer(state, 'os_rbih_tactical_acceptance_1993', 'accept_for_optics', 'RBiH', 72);
        expect(() => evaluatePeacePlans(state, CATALOG)).toThrow(/second answer/i);
    });

    it('a routed log row whose option is missing from the catalog throws', () => {
        const state = makeState({ turn: 56 });
        logAnswer(state, 'rs_assembly_rejects_voplan_1993', 'no_such_option', 'RS', 56);
        expect(() => evaluatePeacePlans(state, CATALOG)).toThrow(/no_such_option/);
    });

    it('a plan already resolved (a v42 save) ignores a late card: it writes nothing and costs nothing', () => {
        const state = makeState({ turn: 56 });
        const neg = state.military.negotiation!;
        neg.peace_plan_history.push({
            plan_id: 'vance_owen', turn_offered: 40, resolved: true, resolved_turn: 40,
            responses: { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' },
        });
        const before = structuredClone(neg);
        logAnswer(state, 'rs_assembly_rejects_voplan_1993', 'override_assembly', 'RS', 56);
        evaluatePeacePlans(state, CATALOG);
        expect(neg).toEqual(before);
    });
});

// ─── Item 2: the conditional row ──────────────────────────────────────────────────────────

describe('§6 E3a2 item 2: the reciprocity row is evaluated at resolution', () => {
    it.each([
        ['accept', 'accepted'],
        ['reject', 'rejected'],
    ] as const)('RBiH %s on the record → HRHB recorded %s', (rbihOption, hrhbExpected) => {
        const state = makeState({ turn: 56 });
        logAnswer(state, 'vance_owen_plan_1993', rbihOption, 'RBiH', 39);
        logAnswer(state, 'hrhb_vance_owen_acceptance_1993', 'condition_on_arbih_reciprocity', 'HRHB', 51);
        logAnswer(state, 'rs_assembly_rejects_voplan_1993', 'accept_rejection', 'RS', 56);
        evaluatePeacePlans(state, CATALOG);
        expect(rowsOf(state)[0]!.responses.HRHB).toBe(hrhbExpected);
    });

    it('reads an RBiH fallback answer too (RBiH never answered by card; historical = accepted)', () => {
        const state = makeState({ turn: 58 });
        logAnswer(state, 'hrhb_vance_owen_acceptance_1993', 'condition_on_arbih_reciprocity', 'HRHB', 51);
        logAnswer(state, 'rs_assembly_rejects_voplan_1993', 'accept_rejection', 'RS', 56);
        evaluatePeacePlans(state, CATALOG);
        expect(rowsOf(state)[0]!.responses).toEqual({ RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' });
    });
});

// ─── Item 5: the floor (plan terms in the clamped base) ───────────────────────────────────

describe('§6 E3a2 item 5: plan terms enter the clamped base; the flat −15 goes', () => {
    function stateWithHistory(history: PeacePlanResponse[]): GameState {
        const state = makeState({ turn: 130 });
        state.military.negotiation!.peace_plan_history = history;
        return state;
    }
    const row = (plan_id: string, responses: Record<string, Answer>, resolved = true): PeacePlanResponse => ({
        plan_id, turn_offered: 0, responses, resolved,
    });

    it('a rejection costs the plan\'s own credibility_change_on_reject, an acceptance +10', () => {
        const state = stateWithHistory([
            row('vance_owen', { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' }),
            row('owen_stoltenberg', { RBiH: 'rejected', RS: 'accepted', HRHB: 'accepted' }),
            row('contact_group', { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' }),
        ]);
        // RS: 50 + 10 (OS) − 20 (VOPP) − 25 (CG) = 15 (the flat rule gave 50 + 10 − 30 = 30).
        expect(computeInternationalStandingBase(state, 'RS')).toBe(15);
        // RBiH: 50 + 20 − 10 (OS) = 60 (flat: 55).
        expect(computeInternationalStandingBase(state, 'RBiH')).toBe(60);
        expect(computeInternationalStandingBase(state, 'HRHB')).toBe(80);
    });

    it('the plan terms sit inside the base clamp (absorbed at 0): recorded rule, E3c moves them out', () => {
        const state = stateWithHistory([row('contact_group', { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' })]);
        state.military.negotiation!.capital.RS!.war_crimes_events = 5;
        expect(computeInternationalStandingBase(state, 'RS')).toBe(0);
    });

    it('derivePeacePlanResponseLists and the base count resolved rows only', () => {
        const history = [
            row('vance_owen', { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' }),
            row('owen_stoltenberg', { RBiH: 'rejected', RS: 'pending' as Answer, HRHB: 'accepted' }, false),
        ];
        expect(derivePeacePlanResponseLists(history, 'RBiH')).toEqual({ accepted: ['vance_owen'], rejected: [] });
        expect(derivePeacePlanResponseLists(history, 'HRHB')).toEqual({ accepted: ['vance_owen'], rejected: [] });
        expect(computeInternationalStandingBase(stateWithHistory(history), 'RBiH')).toBe(60);
    });

    it('the resolution writes no international_standing modifier; the −5 support and relationship event stay', () => {
        const state = makeState({ turn: 58, player_faction: 'RBiH' });
        const neg = state.military.negotiation!;
        neg.pending_peace_plan = { plan_id: 'vance_owen', turn_offered: 40, bot_responses: { RS: 'rejected', HRHB: 'accepted' } };
        const supportBefore = neg.patron_relationships.RS!.support_level;
        resolvePeacePlan(state, 'vance_owen', 'rejected');
        for (const faction of FACTIONS) {
            expect(neg.strategic_dimensions![faction]!.international_standing!.event_modifier, faction).toBe(0);
        }
        expect(neg.patron_relationships.RS!.support_level).toBe(supportBefore - 5);
        expect(neg.patron_relationships.RS!.relationship_events).toContain('rejected_vance_owen');
        expect(neg.patron_relationships.RBiH!.relationship_events).toContain('rejected_vance_owen');
    });
});

// ─── Item 8: the graded values (unchanged here) ───────────────────────────────────────────

describe('§6 E3a2 item 8: the nine graded values land unchanged, marked unsourced (shrink-only)', () => {
    // Status per cell. A cell leaves this list only when the historian's signed table lands as
    // its own measured step (ruling item 8). The list may only shrink; values never move here.
    const UNSOURCED: ReadonlyArray<[string, FactionId, number]> = [
        ['vance_owen', 'RBiH', -5], ['vance_owen', 'RS', -20], ['vance_owen', 'HRHB', -5],
        ['owen_stoltenberg', 'RBiH', -10], ['owen_stoltenberg', 'RS', -5], ['owen_stoltenberg', 'HRHB', -10],
        ['contact_group', 'RBiH', -10], ['contact_group', 'RS', -25], ['contact_group', 'HRHB', -10],
    ];

    it('every live cell is on the unsourced list at today\'s value; no new cell appears', () => {
        const live: Array<[string, FactionId, number]> = [];
        for (const plan of PEACE_PLANS) {
            for (const faction of FACTIONS) {
                const value = plan.credibility_change_on_reject?.[faction];
                if (value !== undefined) live.push([plan.id, faction, value]);
            }
        }
        expect(live).toEqual(UNSOURCED);
        expect(UNSOURCED.length).toBeLessThanOrEqual(9);
    });
});

// ─── Item 3: the bot rule ─────────────────────────────────────────────────────────────────

describe('§6 E3a2 item 3: bots — the plan owner decides A/R, the card applies the matching option', () => {
    function pickFor(state: GameState, def: EventDefinition): string | undefined {
        evaluateEvents(state, () => 0.5, state.meta.turn, [def]);
        return state.military.event_decision_log?.find((row) => row.event_id === def.id)?.response_id;
    }

    /** RS holds the largest settlements, well above the Owen-Stoltenberg map + its 18pp floor. */
    function rsBigControllers(): Record<string, string> {
        const { areas, total } = getOsidAreas();
        const bySize = Object.keys(areas).sort((a, b) => (areas[b]! - areas[a]!) || strictCompare(a, b));
        const controllers: Record<string, string> = {};
        let rsArea = 0;
        for (const osid of bySize) {
            if (rsArea / total * 100 < 80) {
                controllers[osid] = 'RS';
                rsArea += areas[osid]!;
            } else {
                controllers[osid] = 'RBiH';
            }
        }
        return controllers;
    }

    it('historical mode: the bot applies the authored default (it maps to historical_responses)', () => {
        const state = makeState({ turn: 75, decision_mode: 'historical' });
        expect(pickFor(state, OS_RS)).toBe('accept_union_three_republics');
    });

    it('emergent mode: the plan scorer\'s refusal makes the card apply a refusal option', () => {
        const state = makeState({ turn: 75, decision_mode: 'emergent', controllers: rsBigControllers() });
        // Premise: RS holds far more than the map's 52.5% + its 18pp floor, so the scorer refuses.
        expect(computeBotPlanResponse(state, getPeacePlanById('owen_stoltenberg')!, 'RS')).toBe('rejected');
        expect(pickFor(state, OS_RS)).toBe('reject_plan');
    });

    it('Observer: the historical owner answers the player\'s routed card', () => {
        const state = makeState({ turn: 75, decision_mode: 'emergent', player_faction: 'RS', autonomy_level: 3, controllers: rsBigControllers() });
        expect(pickFor(state, OS_RS)).toBe('accept_union_three_republics');
    });

    it('the RBiH Owen-Stoltenberg lock holds on the Assembly card even when the scorer would accept', () => {
        const state = makeState({ turn: 72, decision_mode: 'emergent' });
        state.military.negotiation!.patron_relationships.RBiH!.override_authority = 100;
        (state.political as { war_exhaustion?: Record<string, number> }).war_exhaustion = { RBiH: 10000 };
        // Premise: on this state the plan scorer alone would accept for RBiH.
        expect(computeBotPlanResponse(state, getPeacePlanById('owen_stoltenberg')!, 'RBiH')).toBe('accepted');
        expect(pickFor(state, OS_ASSEMBLY)).toBe('reject_via_assembly');
    });
});

// ─── Player path: the card no longer resolves the plan itself ─────────────────────────────

describe('§6 E3a2: the player path only records; evaluate-peace-plans resolves', () => {
    it('answering the Vance-Owen card writes the log and no plan row', () => {
        const state = makeState({ turn: 39, player_faction: 'RBiH' });
        pendingCard(state, VOPP_RBIH, 39);
        resolveEventDecision(state, 'vance_owen_plan_1993', 'accept');
        expect(state.military.event_decision_log?.map((row) => [row.event_id, row.response_id, row.faction])).toEqual([
            ['vance_owen_plan_1993', 'accept', 'RBiH'],
        ]);
        expect(rowsOf(state)).toEqual([]);
        expect(state.military.negotiation!.pending_peace_plan).toBeUndefined();
    });

    it('answering the Owen-Stoltenberg Presidency reject records R and resolves nothing', () => {
        const state = makeState({ turn: 70, player_faction: 'RBiH' });
        pendingCard(state, OS_PRESIDENCY, 70);
        resolveEventDecision(state, 'owen_stoltenberg_plan_1993', 'reject');
        expect(rowsOf(state)).toEqual([]);
    });
});

// ─── Item 9: the advance gate and the harness ─────────────────────────────────────────────

describe('§6 E3a2 item 9: the advance gate blocks while a fallback or a routed card is pending', () => {
    it('a pending fallback pointer is a hard block', () => {
        const state = makeState({ turn: 58, player_faction: 'RS' });
        state.military.negotiation!.pending_peace_plan = { plan_id: 'vance_owen', turn_offered: 40, bot_responses: { RBiH: 'accepted', HRHB: 'accepted' } };
        const blocking = listBlockingPlayerDecisions(state as never, 'RS');
        expect(blocking.map((item) => [item.familyId, item.id])).toContainEqual(['peace_plan', 'vance_owen']);
    });

    it('a pending routed card is a hard block', () => {
        const state = makeState({ turn: 56, player_faction: 'RS' });
        pendingCard(state, VOPP_RS, 56);
        const blocking = listBlockingPlayerDecisions(state as never, 'RS');
        expect(blocking.map((item) => [item.familyId, item.id, item.gatePolicy])).toContainEqual(['event_decision', 'rs_assembly_rejects_voplan_1993', 'hard_block']);
    });

    it('the harness defer asserts: a fallback still pending when another plan\'s window opens throws', () => {
        const assertNoSkip = (peacePlans as unknown as { assertNoPeacePlanWindowSkipped?: (state: GameState) => void })
            .assertNoPeacePlanWindowSkipped;
        expect(typeof assertNoSkip).toBe('function');
        const state = makeState({ turn: 69, player_faction: 'RS' });
        state.military.negotiation!.pending_peace_plan = { plan_id: 'vance_owen', turn_offered: 40, bot_responses: { RBiH: 'accepted', HRHB: 'accepted' } };
        expect(() => assertNoSkip!(state)).not.toThrow();
        expect(() => assertNoSkip!(at(state, 70))).toThrow(/owen_stoltenberg/);
    });
});

describe('§6 E3a2: load-time rules for routed cards', () => {
    const clone = (def: EventDefinition): EventDefinition => structuredClone(def);
    const optionOf = (def: EventDefinition, id: string) => def.response_options!.find((option) => option.id === id)!;

    it('the synthetic routed catalog passes', () => {
        expect(() => validatePlanAnswers(CATALOG, OPENING_FOUNDATIONAL_EVENT_IDS)).not.toThrow();
    });

    it('every option of a routed card declares plan_answer (a value or null)', () => {
        const def = clone(VOPP_RS);
        delete (optionOf(def, 'override_assembly') as { plan_answer?: unknown }).plan_answer;
        expect(() => validatePlanAnswers([def])).toThrow(/every option of a routed card declares plan_answer/);
    });

    it('a routed card carries no international_standing shift, card or option', () => {
        const def = clone(VOPP_RS);
        optionOf(def, 'accept_rejection').dimension_shifts = [{ faction: 'RS', dimension: 'international_standing', delta: -15 }];
        expect(() => validatePlanAnswers([def])).toThrow(/international_standing shift on a routed option/);
        const card = clone(VOPP_RS);
        card.dimension_shifts = [{ faction: 'RS', dimension: 'international_standing', delta: -5 }];
        expect(() => validatePlanAnswers([card])).toThrow(/international_standing shift on a routed card/);
    });

    it('one patron carrier: an option that can be recorded rejected (conditional included) carries no patron effect; an A option keeps its own', () => {
        const rejecting = clone(VOPP_RS);
        optionOf(rejecting, 'accept_rejection').effects = [{ kind: 'patron_support', faction: 'RS', delta: -10 } as never];
        expect(() => validatePlanAnswers([rejecting])).toThrow(/can be recorded rejected carries no patron effect/);
        const conditional = clone(VOPP_HRHB);
        optionOf(conditional, 'condition_on_arbih_reciprocity').dimension_shifts = [{ faction: 'HRHB', dimension: 'patron_confidence', delta: -10 }];
        expect(() => validatePlanAnswers([conditional])).toThrow(/condition_on_arbih_reciprocity: an option that can be recorded rejected/);
        const accepting = clone(VOPP_RS);
        optionOf(accepting, 'override_assembly').effects = [{ kind: 'patron_support', faction: 'RS', delta: 5 } as never];
        expect(() => validatePlanAnswers([accepting])).not.toThrow();
        const cardLevel = clone(OS_ASSEMBLY);
        cardLevel.dimension_shifts = [{ faction: 'RBiH', dimension: 'patron_confidence', delta: -5 }];
        expect(() => validatePlanAnswers([cardLevel])).toThrow(/card-level patron effect/);
    });

    it('plan_answer names a routed plan; accepted_if is the one conditional form on the same plan', () => {
        const dayton = clone(VOPP_RS);
        optionOf(dayton, 'override_assembly').plan_answer = { plan_id: 'dayton', response: 'accepted' };
        expect(() => validatePlanAnswers([dayton])).toThrow(/plan_answer.plan_id must be a routed plan/);
        const twoPlans = clone(VOPP_RS);
        optionOf(twoPlans, 'override_assembly').plan_answer = { plan_id: 'contact_group', response: 'accepted' };
        expect(() => validatePlanAnswers([twoPlans])).toThrow(/a routed card answers one plan/);
        const badCondition = clone(VOPP_HRHB);
        optionOf(badCondition, 'condition_on_arbih_reciprocity').plan_answer = {
            plan_id: 'vance_owen', response: 'rejected',
            accepted_if: { type: 'peace_plan_response', plan_id: 'contact_group', faction: 'RBiH', response: 'accepted' },
        };
        expect(() => validatePlanAnswers([badCondition])).toThrow(/accepted_if must be/);
    });

    it('a routed card is not an answer-ahead opening event; the shipped loader runs this rule', () => {
        const opener = { ...clone(VOPP_RS), id: 'rs_strategic_goals' } as EventDefinition;
        expect(() => validatePlanAnswers([opener], OPENING_FOUNDATIONAL_EVENT_IDS)).toThrow(/answer-ahead opening event/);
        // §6 design T2: the RBiH policy card is answered ahead too, so the loader checks the full answer-ahead list.
        const policyOpener = { ...clone(VOPP_RS), id: 'rbih_paramilitary_policy_1992' } as EventDefinition;
        expect(() => validatePlanAnswers([policyOpener], ANSWER_AHEAD_EVENT_IDS)).toThrow(/answer-ahead opening event/);
        const loaderSource = readFileSync('src/sim/events/event_loader.ts', 'utf8');
        expect(loaderSource).toContain('validatePlanAnswers(allEvents, ANSWER_AHEAD_EVENT_IDS);');
    });
});

describe('§6 E3a2 item 10 and the modal: no Owen-Stoltenberg counter-offers on the player path; the modal yields to a pending card', () => {
    it('an RBiH player at week 70 gets no pointer, so no counter-offers', () => {
        const state = makeState({ turn: 70, player_faction: 'RBiH' });
        evaluatePeacePlans(state, CATALOG);
        resolveCounterOffers(state);
        expect(state.military.negotiation!.pending_peace_plan).toBeUndefined();
        expect(state.military.negotiation!.pending_counter_offers ?? []).toEqual([]);
    });

    it('the modal is hidden while any pending card declares an answer to that plan (data, not a table)', () => {
        const plan = { planId: 'vance_owen', planName: 'Vance-Owen', turnOffered: 40 } as never;
        const pending = [{ event_id: 'vance_owen_plan_1993', response_options: VOPP_RBIH.response_options }] as never;
        expect(shouldShowPeacePlanModal(plan, null, pending)).toBe(false);
        expect(shouldShowPeacePlanModal(plan, null, [] as never)).toBe(true);
    });
});
