/**
 * §6 D1 stage 2, round-2 amendment A3: the receipt for a sweep sent without a request names one true cause, derived from the
 * saved basis at the sweep's turn (`event_decision_log`, `paramilitary_decision_history`). No new state field. Where the basis
 * shows no Always allow (an old save made under the stage-1 rule), the stage-1 cause stays.
 */

import { describe, expect, it } from 'vitest';

import { advanceTurn, resolveDesktopEventDecision, startNewCampaign } from '../src/desktop/desktop_sim.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { paramilitaryPolicyFlagKey, PARAMILITARY_POLICY_CARD_ID_BY_FACTION } from '../src/sim/events/paramilitary_policy_flag.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import type { FactionId } from '../src/state/game_state.js';

function rawSave(faction: FactionId, log: unknown[], history: unknown[] = []): any {
    return {
        meta: { turn: 9, phase: 'war', player_faction: faction },
        military: {
            formations: {
                [`para_${faction.toLowerCase()}_t5_0`]: {
                    id: `para_${faction.toLowerCase()}_t5_0`, faction, kind: 'paramilitary', status: 'inactive',
                    created_turn: 5, paramilitary_target: 'op:kakanj:biljesevo',
                },
            },
            event_decision_log: log,
        },
        political: {
            political_controllers: {},
            control_events: [{ turn: 5, settlement_id: 'op:kakanj:biljesevo', mechanism: 'paramilitary', from: 'RS', to: faction }],
        },
        paramilitary_decision_history: history,
    };
}

function causeOf(raw: any): string | undefined {
    const rows = parseGameState(raw).paramilitaryUnrequested ?? [];
    expect(rows).toHaveLength(1);
    return rows[0]!.cause;
}

describe('the unrequested-sweep receipt cause is derived from the saved basis', () => {
    it('the policy cards\' response ids equal the orders they write (the receipt reads the id from the decision log)', () => {
        const catalog = loadEventDefinitions(0);
        for (const [faction, cardId] of Object.entries(PARAMILITARY_POLICY_CARD_ID_BY_FACTION)) {
            const card = catalog.find((def) => def.id === cardId)!;
            expect(card, cardId).toBeDefined();
            for (const option of card.response_options ?? []) {
                expect(option.sets_flags?.[paramilitaryPolicyFlagKey(faction as FactionId)], `${cardId}:${option.id}`).toBe(option.id);
            }
        }
    });

    it('Always allow answered in person before the sweep: the standing order sent it', () => {
        expect(causeOf(rawSave('RBiH', [
            { event_id: 'rbih_paramilitary_policy_1992', response_id: 'always_allow', decision_source: 'player', faction: 'RBiH', turn: 0 },
        ]))).toBe('standing_order');
    });

    it('Always allow answered automatically with the historical policy (Observer): the side\'s forces acted under that order', () => {
        expect(causeOf(rawSave('RS', [
            { event_id: 'rs_paramilitary_policy_1992', response_id: 'always_allow', decision_source: 'bot_ai_default', faction: 'RS', turn: 2 },
        ]))).toBe('standing_order_automatic');
    });

    it('an old save made under the stage-1 rule (staff swept under Always deny, Review, or before any answer) keeps the stage-1 cause', () => {
        for (const responseId of ['always_deny', 'ask']) {
            expect(causeOf(rawSave('RBiH', [
                { event_id: 'rbih_paramilitary_policy_1992', response_id: responseId, decision_source: 'player', faction: 'RBiH', turn: 0 },
            ])), responseId).toBeUndefined();
        }
        expect(causeOf(rawSave('RBiH', []))).toBeUndefined();
        // An answer given after the sweep is not its basis.
        expect(causeOf(rawSave('RS', [
            { event_id: 'rs_paramilitary_policy_1992', response_id: 'always_allow', decision_source: 'player', faction: 'RS', turn: 7 },
        ]))).toBeUndefined();
        // No card for the side (HRHB) and nothing filed: the stage-1 cause.
        expect(causeOf(rawSave('HRHB', []))).toBeUndefined();
    });

    it('a decision filed for the side after the card answer (the review modal can change the order there): one cause-neutral line', () => {
        expect(causeOf(rawSave('RBiH', [
            { event_id: 'rbih_paramilitary_policy_1992', response_id: 'always_allow', decision_source: 'player', faction: 'RBiH', turn: 0 },
        ], [
            { id: 'paramilitary:3:op:x:y', turn: 3, target_osid: 'op:x:y', faction: 'RBiH', strength: 150, decision: 'allow' },
        ]))).toBe('neutral');
        // Another side's filed decision does not touch this side's basis.
        expect(causeOf(rawSave('RBiH', [
            { event_id: 'rbih_paramilitary_policy_1992', response_id: 'always_allow', decision_source: 'player', faction: 'RBiH', turn: 0 },
        ], [
            { id: 'paramilitary:3:op:x:y', turn: 3, target_osid: 'op:x:y', faction: 'RS', strength: 150, decision: 'allow' },
        ]))).toBe('standing_order');
    });

    it('C1: an automatic answer with the side\'s own decision filed at or before it is not credited with the order (neutral)', () => {
        const automatic = { event_id: 'rs_paramilitary_policy_1992', response_id: 'always_allow', decision_source: 'bot_ai_default', faction: 'RS', turn: 2 };
        for (const filedTurn of [1, 2]) {
            expect(causeOf(rawSave('RS', [automatic], [
                { id: `paramilitary:${filedTurn}:op:x:y`, turn: filedTurn, target_osid: 'op:x:y', faction: 'RS', strength: 150, decision: 'allow' },
            ])), `filed at t${filedTurn}`).toBe('neutral');
        }
        // Another side's filed decision does not touch this side's basis.
        expect(causeOf(rawSave('RS', [automatic], [
            { id: 'paramilitary:1:op:x:y', turn: 1, target_osid: 'op:x:y', faction: 'RBiH', strength: 150, decision: 'allow' },
        ]))).toBe('standing_order_automatic');
        // An in-person card answer is still the cause when the decision was filed before it.
        expect(causeOf(rawSave('RS', [{ ...automatic, decision_source: 'player' }], [
            { id: 'paramilitary:1:op:x:y', turn: 1, target_osid: 'op:x:y', faction: 'RS', strength: 150, decision: 'allow' },
        ]))).toBe('standing_order');
    });

    it('a real stage-2 campaign: Always allow at Delegated, then the first Advance, gives standing-order receipts', async () => {
        const opening = (await startNewCampaign(process.cwd(), 'RBiH', 'apr_1992', 'historical')).state;
        const pending = resolveDesktopEventDecision(opening, 'rbih_state_identity', 'civic', process.cwd());
        pending.meta.autonomy_level = 2;
        const resolved = resolveDesktopEventDecision(pending, 'rbih_paramilitary_policy_1992', 'always_allow', process.cwd());
        const advanced = await advanceTurn(resolved, process.cwd());
        expect(advanced.error).toBeUndefined();
        const rows = parseGameState(JSON.parse(JSON.stringify(advanced.state))).paramilitaryUnrequested ?? [];
        expect(rows.map((row) => row.target_osid).sort()).toEqual(['op:brcko:bukvik_gornji_2', 'op:srebrenica:obadi']);
        expect(rows.every((row) => row.cause === 'standing_order' && row.captured)).toBe(true);
    }, 120_000);
});
