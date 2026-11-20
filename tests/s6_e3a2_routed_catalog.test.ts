/**
 * §6 E3a2 (ruled 2026-11-17): the routed peace-plan cards in the shipped catalog.
 *
 * - Ruling item 2: `plan_answer` on every routed option, exactly the historian's table
 *   (s6_e3a2_answer_mapping.md): every "yes, but" option is R; the Owen-Stoltenberg Presidency
 *   accept writes nothing; override_assembly is A; the one conditional row is the HRHB
 *   reciprocity option.
 * - Ruling item 3 (check): the historical path reproduces today's rows (RBiH/RS/HRHB: VOPP
 *   A/R/A, OS R/A/A, CG A/R/A) through the Presidency -> Assembly chain for OS; Dayton is
 *   never in the record.
 * - Ruling item 4: contact_group_plan_1994 is a no-choice presentation card; its +10 rides on
 *   rbih_contact_group_response_1994#accept_51_49_plan; rbih_cg's identity gate cannot fail
 *   once the plan is tabled.
 * - Ruling item 6 and the E3 ruling: no routed card carries an international_standing shift;
 *   one patron carrier per routed answer.
 * - Packet §8.3 and §8.7: every routed option records its mapped answer on the bot path and the
 *   player path; RS negotiate_amendments is a refusal, so CONTACT_GROUP_REJECTION fires.
 */
import { describe, expect, it } from 'vitest';
import type { EventDefinition, EventResponseOption } from '../src/sim/events/event_types.js';
import type { FactionId, GameState } from '../src/state/game_state.js';
import type { NegotiationState } from '../src/state/negotiation_types.js';
import { createDefaultPatronRelationship, createEmptyCapital } from '../src/state/negotiation_types.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { selectBotEventResponse } from '../src/sim/events/evaluate_events.js';
import { resolveEventDecision } from '../src/sim/events/resolve_decision.js';
import { evaluatePeacePlans } from '../src/sim/negotiation/peace_plans.js';
import { PEACE_PLANS, getPeacePlanById } from '../src/sim/negotiation/peace_plan_data.js';
import {
    collectRoutedPeacePlanCards,
    finalizePlanAnswers,
    readRecordedPlanAnswers,
    routedCardPlanId,
} from '../src/sim/negotiation/plan_answer.js';
import { evaluatePatronEvents } from '../src/sim/negotiation/patron_events.js';
import { updatePatronPressure } from '../src/sim/negotiation/patron_pressure.js';
import { DILEMMA_SPINE } from '../src/ui/map/data/dilemmaSpine.js';

const FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

let cached: EventDefinition[] | null = null;
function catalog(): EventDefinition[] {
    cached ??= loadEventDefinitions(0);
    return cached;
}
function def(id: string): EventDefinition {
    const found = catalog().find((row) => row.id === id);
    if (!found) throw new Error(`no event ${id}`);
    return found;
}
function option(eventId: string, optionId: string): EventResponseOption {
    const found = def(eventId).response_options?.find((candidate) => candidate.id === optionId);
    if (!found) throw new Error(`${eventId} has no option ${optionId}`);
    return found;
}

const A = (plan_id: string) => ({ plan_id, response: 'accepted' });
const R = (plan_id: string) => ({ plan_id, response: 'rejected' });

/** The historian's table (s6_e3a2_answer_mapping.md), as ruled (item 2). */
const MAPPING: Record<string, unknown> = {
    'vance_owen_plan_1993#accept': A('vance_owen'),
    'vance_owen_plan_1993#reject': R('vance_owen'),
    'hrhb_vance_owen_acceptance_1993#accept_vance_owen_plan': A('vance_owen'),
    'hrhb_vance_owen_acceptance_1993#accept_with_modifications': R('vance_owen'),
    'hrhb_vance_owen_acceptance_1993#condition_on_arbih_reciprocity': {
        plan_id: 'vance_owen',
        response: 'rejected',
        accepted_if: { type: 'peace_plan_response', plan_id: 'vance_owen', faction: 'RBiH', response: 'accepted' },
    },
    'hrhb_vance_owen_acceptance_1993#reject_plan': R('vance_owen'),
    'rs_assembly_rejects_voplan_1993#accept_rejection': R('vance_owen'),
    'rs_assembly_rejects_voplan_1993#override_assembly': A('vance_owen'),
    'owen_stoltenberg_plan_1993#accept': null,
    'owen_stoltenberg_plan_1993#reject': R('owen_stoltenberg'),
    'os_rbih_tactical_acceptance_1993#reject_via_assembly': R('owen_stoltenberg'),
    'os_rbih_tactical_acceptance_1993#accept_for_optics': A('owen_stoltenberg'),
    'rs_owen_stoltenberg_response_1993#accept_union_three_republics': A('owen_stoltenberg'),
    'rs_owen_stoltenberg_response_1993#accept_with_modifications': R('owen_stoltenberg'),
    'rs_owen_stoltenberg_response_1993#reject_plan': R('owen_stoltenberg'),
    'hrhb_owen_stoltenberg_response_1993#accept_union_three_republics': A('owen_stoltenberg'),
    'hrhb_owen_stoltenberg_response_1993#accept_with_modifications': R('owen_stoltenberg'),
    'hrhb_owen_stoltenberg_response_1993#reject_plan': R('owen_stoltenberg'),
    'rs_contact_group_response_1994#reject_51_49_plan': R('contact_group'),
    'rs_contact_group_response_1994#accept_51_49_plan': A('contact_group'),
    'rs_contact_group_response_1994#negotiate_amendments': R('contact_group'),
    'rbih_contact_group_response_1994#accept_51_49_plan': A('contact_group'),
    'rbih_contact_group_response_1994#reject_51_49_plan': R('contact_group'),
    'rbih_contact_group_response_1994#accept_with_public_reservations': R('contact_group'),
    'hrhb_contact_group_response_1994#accept_51_49_plan': A('contact_group'),
    'hrhb_contact_group_response_1994#reject_51_49_plan': R('contact_group'),
    'hrhb_contact_group_response_1994#accept_with_amendments': R('contact_group'),
};
const ROUTED_IDS = [...new Set(Object.keys(MAPPING).map((key) => key.split('#')[0]!))].sort();

function makeNegotiation(): NegotiationState {
    const capital: NegotiationState['capital'] = {};
    const patron_relationships: NegotiationState['patron_relationships'] = {};
    for (const faction of FACTIONS) {
        capital[faction] = createEmptyCapital();
        patron_relationships[faction] = createDefaultPatronRelationship(faction);
    }
    return { capital, patron_relationships, peace_plan_history: [], strategic_dimensions: initializeStrategicDimensions() };
}

function makeState(turn: number, playerFaction?: FactionId): GameState {
    return {
        meta: {
            turn, phase: 'war', seed: 1, date: '1993-01-01', war_start_turn: 0, decision_mode: 'historical',
            ...(playerFaction ? { player_faction: playerFaction } : {}),
        },
        factions: FACTIONS.map((id) => ({ id })),
        military: { formations: {}, fired_event_ids: [], negotiation: makeNegotiation(), event_flags: {} },
        political: { political_controllers: {} },
        displacement: {},
    } as unknown as GameState;
}

function log(state: GameState, eventId: string, responseId: string, faction: FactionId, turn: number, source: 'player' | 'bot_ai_default'): void {
    (state.military.event_decision_log ??= []).push({ event_id: eventId, response_id: responseId, decision_source: source, faction, turn });
}

describe('§6 E3a2 item 2: plan_answer on every routed option, as the historian\'s table', () => {
    it('the routed cards are exactly the ten peace-plan response cards (the CG presentation card answers nothing)', () => {
        const routed = [...collectRoutedPeacePlanCards(catalog()).keys()].sort();
        expect(routed).toEqual(ROUTED_IDS);
        expect(ROUTED_IDS).toHaveLength(10);
        expect(routed).not.toContain('contact_group_plan_1994');
    });

    it('every routed option carries exactly its mapped answer; every option of a routed card declares one', () => {
        const actual: Record<string, unknown> = {};
        for (const id of ROUTED_IDS) {
            for (const candidate of def(id).response_options ?? []) {
                expect(Object.prototype.hasOwnProperty.call(candidate, 'plan_answer'), `${id}#${candidate.id}`).toBe(true);
                actual[`${id}#${candidate.id}`] = candidate.plan_answer;
            }
        }
        expect(actual).toEqual(MAPPING);
    });

    it('the one conditional form is the HRHB reciprocity row', () => {
        const conditional = Object.entries(MAPPING)
            .filter(([, answer]) => (answer as { accepted_if?: unknown } | null)?.accepted_if != null)
            .map(([key]) => key);
        expect(conditional).toEqual(['hrhb_vance_owen_acceptance_1993#condition_on_arbih_reciprocity']);
    });

    it('each routed card answers one plan, and each plan has a writer for every side', () => {
        const writers: Record<string, Set<string>> = {};
        for (const id of ROUTED_IDS) {
            const planId = routedCardPlanId(def(id))!;
            (writers[planId] ??= new Set()).add(def(id).responding_faction!);
        }
        for (const planId of ['vance_owen', 'owen_stoltenberg', 'contact_group']) {
            expect([...writers[planId]!].sort(), planId).toEqual(['HRHB', 'RBiH', 'RS']);
        }
    });
});

describe('§6 E3a2 items 5 and 6: one carrier for a routed answer\'s standing and patron cost', () => {
    it('no routed card or option carries an international_standing shift', () => {
        for (const id of ROUTED_IDS) {
            const row = def(id);
            expect((row.dimension_shifts ?? []).filter((s) => s.dimension === 'international_standing'), id).toEqual([]);
            for (const candidate of row.response_options ?? []) {
                expect((candidate.dimension_shifts ?? []).filter((s) => s.dimension === 'international_standing'), `${id}#${candidate.id}`).toEqual([]);
            }
        }
    });

    it('an option that can be recorded R carries no patron effect; routed cards carry no card-level patron effect', () => {
        for (const id of ROUTED_IDS) {
            const row = def(id);
            expect((row.dimension_shifts ?? []).filter((s) => s.dimension === 'patron_confidence'), `${id}#card`).toEqual([]);
            for (const candidate of row.response_options ?? []) {
                const answer = candidate.plan_answer;
                if (answer == null || (answer.response === 'accepted' && answer.accepted_if == null)) continue;
                expect((candidate.effects ?? []).filter((e) => e.kind === 'patron_support'), `${id}#${candidate.id}`).toEqual([]);
                expect((candidate.dimension_shifts ?? []).filter((s) => s.dimension === 'patron_confidence'), `${id}#${candidate.id}`).toEqual([]);
            }
        }
        // The stripped rows, named (ruling item 6).
        expect(option('hrhb_vance_owen_acceptance_1993', 'reject_plan').dimension_shifts?.some((s) => s.dimension === 'patron_confidence')).toBeFalsy();
        expect(option('hrhb_owen_stoltenberg_response_1993', 'reject_plan').dimension_shifts?.some((s) => s.dimension === 'patron_confidence')).toBeFalsy();
        expect(option('hrhb_contact_group_response_1994', 'reject_51_49_plan').dimension_shifts?.some((s) => s.dimension === 'patron_confidence')).toBeFalsy();
        expect(option('hrhb_contact_group_response_1994', 'accept_with_amendments').dimension_shifts?.some((s) => s.dimension === 'patron_confidence')).toBeFalsy();
        expect(option('rs_owen_stoltenberg_response_1993', 'accept_with_modifications').effects.some((e) => e.kind === 'patron_support')).toBe(false);
        expect(def('os_rbih_tactical_acceptance_1993').dimension_shifts ?? []).toEqual([]);
    });

    it('the A-only options keep their own patron effects', () => {
        const pc = (eventId: string, optionId: string) => (option(eventId, optionId).dimension_shifts ?? [])
            .filter((s) => s.dimension === 'patron_confidence').map((s) => s.delta);
        const ps = (eventId: string, optionId: string) => option(eventId, optionId).effects
            .filter((e) => e.kind === 'patron_support').map((e) => (e as { delta: number }).delta);
        expect(pc('hrhb_vance_owen_acceptance_1993', 'accept_vance_owen_plan')).toEqual([10]);
        expect(ps('rs_assembly_rejects_voplan_1993', 'override_assembly')).toEqual([5]);
        expect(pc('os_rbih_tactical_acceptance_1993', 'accept_for_optics')).toEqual([8]);
        expect(pc('rs_owen_stoltenberg_response_1993', 'accept_union_three_republics')).toEqual([10]);
        expect(pc('hrhb_owen_stoltenberg_response_1993', 'accept_union_three_republics')).toEqual([10]);
        expect(ps('rs_contact_group_response_1994', 'accept_51_49_plan')).toEqual([20]);
        expect(ps('rbih_contact_group_response_1994', 'accept_51_49_plan')).toEqual([10]);
        expect(pc('hrhb_contact_group_response_1994', 'accept_51_49_plan')).toEqual([10]);
    });
});

describe('§6 E3a2 item 4: Sarajevo\'s Contact Group writer is the Assembly card', () => {
    it('contact_group_plan_1994 is a no-choice presentation card (never capped), still the chain\'s anchor', () => {
        const presentation = def('contact_group_plan_1994');
        expect(presentation.response_options ?? []).toEqual([]);
        expect(presentation.requires_player_response).toBeUndefined();
        expect(presentation.historical_default_response_id).toBeUndefined();
        expect(presentation.notifications_to_other_factions).toBeUndefined();
        for (const id of ['rbih_contact_group_response_1994', 'rs_contact_group_response_1994', 'hrhb_contact_group_response_1994']) {
            expect(def(id).trigger.requires_events, id).toEqual(['contact_group_plan_1994']);
        }
    });

    it('rbih_cg\'s identity gate cannot fail once the plan is tabled: its only gate is the presentation card', () => {
        const card = def('rbih_contact_group_response_1994');
        expect(card.requires_enabled).toBeUndefined();
        expect(card.trigger.condition).toBeUndefined();
        expect(card.trigger).toMatchObject({ turn_min: 118, turn_max: 120, requires_events: ['contact_group_plan_1994'] });
        expect(card.tags).toContain('keystone_dilemma');
        const spine = DILEMMA_SPINE.find((entry) => entry.dilemmaId === 'contact_group_plan')!;
        expect(spine.decisionEventId).toBe('rbih_contact_group_response_1994');
    });
});

describe('§6 E3a2 item 3: the historical owner on the shipped cards', () => {
    it('in historical mode each routed card picks its authored default, which maps to historical_responses (OS Presidency: null)', () => {
        for (const id of ROUTED_IDS) {
            const row = def(id);
            const faction = row.responding_faction!;
            const { chosen, decisionSource } = selectBotEventResponse(makeState(row.trigger.turn_min ?? 0), row, faction, false);
            expect(chosen.id, id).toBe(row.historical_default_response_id);
            expect(decisionSource, id).toBe('bot_ai_default');
            const plan = getPeacePlanById(routedCardPlanId(row)!)!;
            if (id === 'owen_stoltenberg_plan_1993') {
                expect(chosen.plan_answer, id).toBeNull();
            } else {
                expect(chosen.plan_answer?.response, id).toBe(plan.historical_responses[faction]);
            }
        }
    });

    it('hands-off: the chain reproduces today\'s rows, resolving on the last answer\'s turn; Dayton never appears', () => {
        const state = makeState(0);
        const routed = ROUTED_IDS.map(def).sort((a, b) => (a.trigger.turn_min! - b.trigger.turn_min!) || (a.id < b.id ? -1 : 1));
        for (let turn = 39; turn <= 125; turn++) {
            state.meta.turn = turn;
            for (const row of routed) {
                if (row.trigger.turn_min !== turn) continue;
                // The Assembly card is gated on the Presidency's conditional acceptance.
                if (row.id === 'os_rbih_tactical_acceptance_1993' && state.military.event_flags?.owen_stoltenberg_accepted !== true) continue;
                const faction = row.responding_faction!;
                const { chosen, decisionSource } = selectBotEventResponse(state, row, faction, false);
                for (const [flag, value] of Object.entries(chosen.sets_flags ?? {})) state.military.event_flags![flag] = value;
                log(state, row.id, chosen.id, faction, turn, decisionSource as 'bot_ai_default');
            }
            evaluatePeacePlans(state, catalog());
        }
        expect(state.military.negotiation!.peace_plan_history.map((row) => [row.plan_id, row.responses, row.resolved_turn])).toEqual([
            ['vance_owen', { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' }, 56],
            ['owen_stoltenberg', { RBiH: 'rejected', RS: 'accepted', HRHB: 'accepted' }, 75],
            ['contact_group', { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' }, 118],
        ]);
        expect(state.military.event_decision_log!.filter((row) => row.event_id === 'owen_stoltenberg_plan_1993').map((row) => row.response_id)).toEqual(['accept']);
        expect(state.military.event_decision_log!.filter((row) => row.event_id === 'os_rbih_tactical_acceptance_1993').map((row) => row.response_id)).toEqual(['reject_via_assembly']);
        expect(state.military.negotiation!.peace_plan_history.some((row) => row.plan_id === 'dayton')).toBe(false);
        expect(state.meta.game_over).not.toBe(true);
    });
});

describe('§6 E3a2 packet §8.3: every routed option records its mapped answer on the bot path and the player path', () => {
    it.each(Object.keys(MAPPING))('%s', (key) => {
        const [eventId, optionId] = key.split('#') as [string, string];
        const row = def(eventId);
        const faction = row.responding_faction!;
        const planId = routedCardPlanId(row)!;
        const routed = collectRoutedPeacePlanCards(catalog());
        const expected = MAPPING[key] as { response: string } | null;

        // Bot path: the bot applier logs the choice under the card's responding faction.
        const bot = makeState(row.trigger.turn_min ?? 0);
        log(bot, eventId, optionId, faction, row.trigger.turn_min ?? 0, 'bot_ai_default');
        const botAnswer = readRecordedPlanAnswers(bot, routed, planId).get(faction)?.answer ?? null;

        // Player path: the stored snapshot is answered through the player resolver.
        const player = makeState(row.trigger.turn_min ?? 0, faction);
        player.military.pending_event_decisions = [{
            event_id: eventId, event_title: eventId, turn_fired: row.trigger.turn_min ?? 0, faction,
            response_options: structuredClone(row.response_options!), requires_player_response: true,
        }];
        resolveEventDecision(player, eventId, optionId);
        expect(player.military.event_decision_log?.at(-1)).toMatchObject({ event_id: eventId, response_id: optionId, decision_source: 'player', faction });
        const playerAnswer = readRecordedPlanAnswers(player, routed, planId).get(faction)?.answer ?? null;

        expect(botAnswer).toEqual(expected);
        expect(playerAnswer).toEqual(expected);
        // Answering a card never writes the plan record itself.
        expect(player.military.negotiation!.peace_plan_history).toEqual([]);
    });

    it('the reciprocity row resolves both ways on the shipped mapping', () => {
        const answer = option('hrhb_vance_owen_acceptance_1993', 'condition_on_arbih_reciprocity').plan_answer!;
        expect(finalizePlanAnswers({ RBiH: { plan_id: 'vance_owen', response: 'accepted' }, RS: { plan_id: 'vance_owen', response: 'rejected' }, HRHB: answer }).HRHB).toBe('accepted');
        expect(finalizePlanAnswers({ RBiH: { plan_id: 'vance_owen', response: 'rejected' }, RS: { plan_id: 'vance_owen', response: 'rejected' }, HRHB: answer }).HRHB).toBe('rejected');
    });
});

describe('§6 E3a2 packet §8.7: Belgrade\'s break follows the RS refusal on the record', () => {
    it.each([
        ['negotiate_amendments', true],
        ['reject_51_49_plan', true],
        ['accept_51_49_plan', false],
    ] as const)('RS %s → CONTACT_GROUP_REJECTION fires: %s', (rsOption, fires) => {
        const state = makeState(118);
        log(state, 'rbih_contact_group_response_1994', 'accept_51_49_plan', 'RBiH', 118, 'bot_ai_default');
        log(state, 'hrhb_contact_group_response_1994', 'reject_51_49_plan', 'HRHB', 118, 'bot_ai_default'); // keep the war going on an RS accept
        log(state, 'rs_contact_group_response_1994', rsOption, 'RS', 118, 'bot_ai_default');
        evaluatePeacePlans(state, catalog());
        updatePatronPressure(state);
        evaluatePatronEvents(state);
        expect(state.military.negotiation!.peace_plan_history.map((row) => [row.plan_id, row.resolved_turn])).toEqual([['contact_group', 118]]);
        expect(state.military.negotiation!.patron_relationships.RS!.relationship_events.includes('contact_group_rejection')).toBe(fires);
    });
});

describe('§6 E3a2: the plan data the routed cards answer', () => {
    it('every routed plan has a close week inside its last card window', () => {
        for (const plan of PEACE_PLANS.filter((candidate) => candidate.id !== 'dayton')) {
            const lastWindow = Math.max(...ROUTED_IDS.map(def)
                .filter((row) => routedCardPlanId(row) === plan.id)
                .map((row) => row.trigger.turn_max ?? row.trigger.turn_min ?? 0));
            expect(plan.close_week, plan.id).toBe(lastWindow);
        }
    });
});
