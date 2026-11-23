/**
 * §6 design T, must-fix (ui-ux F1): an answer filed ahead of its card's firing is logged on the turn it
 * was filed (turn 0), but the response's `enables` edges are written on the turn the card fires and the
 * filed answer applies. The realized-consequence matcher must match on that applied turn, or the
 * "consequence realized" receipts never confirm. This was silently broken for HRHB since 163bee0e5.
 */

import { describe, expect, it } from 'vitest';

import { buildRealizedConsequenceReceipts } from '../src/sim/events/realized_consequence_receipts.js';
import { buildConsequenceReceipts } from '../src/ui/map/data/consequenceReceipts.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';
import type { CausalityLogEntry, GameState } from '../src/state/game_state.js';
import { EVENT_CATALOG } from './helpers/s6_opening_lane_fixtures.js';

interface Case {
    faction: 'RBiH' | 'RS' | 'HRHB';
    eventId: string;
    responseId: string;
    appliedTurn: number;
    consequenceId: string;
    consequenceTurn: number;
}

const CASES: Case[] = [
    { faction: 'HRHB', eventId: 'hrhb_political_goal', responseId: 'croat_republic', appliedTurn: 4, consequenceId: 'hrhb_1992_graz_cooperation_collapse', consequenceTurn: 5 },
    // §6 D1 stage 2 round 4a (b), 2026-11-22: the RS policy card fires at t1 on its own and no goals answer opens it any more,
    // so the RS filed-answer receipt is pinned on a card the goals answer really opens: the May 1993 VOPP-rejection decision
    // (war_1993.json, window t56-58, requires_enabled).
    { faction: 'RS', eventId: 'rs_strategic_goals', responseId: 'all_six', appliedTurn: 1, consequenceId: 'rs_assembly_rejects_voplan_1993', consequenceTurn: 56 },
    { faction: 'RBiH', eventId: 'rbih_state_identity', responseId: 'civic', appliedTurn: 3, consequenceId: 'rbih_paramilitary_policy_1992', consequenceTurn: 4 },
];

function stateFor(c: Case, decisionTurn: number, edgeTurn: number): GameState {
    const edge: CausalityLogEntry = {
        turn: edgeTurn,
        from_event: c.eventId,
        to_event: c.consequenceId,
        to_flag: null,
        kind: 'enables',
        source_response_id: c.responseId,
    };
    return {
        meta: { player_faction: c.faction },
        military: {
            fired_event_ids: [c.eventId, c.consequenceId],
            enabled_event_ids: [],
            closed_event_ids: [],
            event_causality_log: [edge],
            event_decision_log: [{ event_id: c.eventId, response_id: c.responseId, decision_source: 'player', faction: c.faction, turn: decisionTurn }],
            event_last_fired_turn: { [c.eventId]: c.appliedTurn, [c.consequenceId]: c.consequenceTurn },
        },
    } as unknown as GameState;
}

describe('realized consequence receipts for answers filed ahead of firing', () => {
    it.each(CASES)('confirms $eventId filed at t0 and applied at t$appliedTurn -> $consequenceId', (c) => {
        // The authored data really links them: the option opens the consequence.
        const def = EVENT_CATALOG.find((row) => row.id === c.eventId)!;
        const option = def.response_options!.find((row) => row.id === c.responseId)!;
        expect(option.enables_events_runtime).toContain(c.consequenceId);

        const receipts = buildRealizedConsequenceReceipts(stateFor(c, 0, c.appliedTurn));
        expect(receipts).toHaveLength(1);
        const receipt = receipts[0]!;
        // The receipt keeps the filed turn in its id and source record; the edge turn is the applied turn.
        expect(receipt.receipt_id).toBe(`${c.eventId}::${c.responseId}::0::${c.consequenceId}`);
        expect(receipt.source_record_id).toBe(`decision:${c.eventId}::${c.responseId}::0`);
        expect(receipt.decision_turn).toBe(0);
        expect(receipt.applied_turn).toBe(c.appliedTurn);
        expect(receipt.fired_turn).toBe(c.consequenceTurn);
        expect(receipt.turns_elapsed).toBe(c.consequenceTurn);
        const causality = receipt.claim_predicate.operands.find((operand) => operand.owner_path === 'state.military.event_causality_log')!;
        expect(causality.expected_value).toBe(`${c.eventId}::${c.consequenceId}::${c.responseId}::${c.appliedTurn}::enables`);
        expect(causality.expression).toContain(`turn=${c.appliedTurn}`);
    });

    it('keeps the old match for answers applied when given (old-lane saves and in-window answers)', () => {
        const c = CASES[1]!;
        const old = stateFor({ ...c, appliedTurn: 0 }, 0, 0);
        const [receipt] = buildRealizedConsequenceReceipts(old);
        expect(receipt?.applied_turn).toBe(0);
        expect(receipt?.claim_predicate.operands.find((operand) => operand.owner_path === 'state.military.event_causality_log')?.expected_value)
            .toBe(`${c.eventId}::${c.consequenceId}::${c.responseId}::0::enables`);
    });

    it('does not confirm a filed answer whose card has not applied yet, or an edge from another turn', () => {
        const c = CASES[0]!;
        const unapplied = stateFor(c, 0, 0);
        delete (unapplied.military.event_last_fired_turn as Record<string, number>)[c.eventId];
        unapplied.military.fired_event_ids = [c.consequenceId];
        expect(buildRealizedConsequenceReceipts(unapplied)).toEqual([]);
        expect(buildRealizedConsequenceReceipts(stateFor(c, 0, c.appliedTurn + 1))).toEqual([]);
    });

    it('surfaces the HRHB filed-answer receipt on the player consequence surface', () => {
        const c = CASES[0]!;
        const catalog = new Map<string, EventDefinition>(EVENT_CATALOG.map((def) => [def.id, def]));
        const receipts = buildConsequenceReceipts(stateFor(c, 0, c.appliedTurn), catalog, 'en');
        expect(receipts.map((receipt) => [receipt.predictedEventId, receipt.status, receipt.decisionTurn, receipt.firedTurn]))
            .toEqual([[c.consequenceId, 'confirmed', 0, c.consequenceTurn]]);
        expect(receipts[0]?.appliedTurn).toBe(c.appliedTurn);
    });
});
