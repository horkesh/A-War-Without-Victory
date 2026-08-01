/**
 * Consequence-Receipt read-model test suite.
 *
 * Proves the promise→receipt classification of `buildConsequenceReceipts`:
 *   - CONFIRMED: a player decision's predicted opens_events fired AND an
 *     enables causal edge {from_event=E, to_event=P, response_id=R} exists.
 *   - PENDING: predicted but neither fired-with-edge nor closed.
 *   - CONTRADICTED: predicted id is in the closed-event set.
 *
 * Also covers determinism (sort order), defensive empties, bot-decision
 * exclusion, and exact recurring-decision identity semantics.
 */

import { afterEach, describe, it, expect } from 'vitest';
import {
    buildConsequenceReceipts,
    receiptsRealizedOnTurn,
} from '../../src/ui/map/data/consequenceReceipts.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';
import type { GameState, CausalityLogEntry } from '../../src/state/game_state.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

afterEach(() => {
    setLocale('en');
});

interface DecisionInput {
    event_id: string;
    response_id: string;
    turn: number;
    decision_source?: 'player' | 'bot_political' | 'bot_v1' | 'bot_ai_default';
    faction?: string | null;
}

/** Build a decision event def whose chosen option predicts `opensEvents`. */
function buildEventDef(
    id: string,
    opensEvents: string[],
    opts: { responseId?: string; label?: string; title?: string; explanation?: string; consequenceLabel?: string } = {},
): EventDefinition {
    const responseId = opts.responseId ?? 'opt_a';
    return {
        id,
        title: opts.title ?? `Event ${id}`,
        trigger: { turn_min: 1, phase: 'war' },
        effect: { kind: 'narrative', text: 'noop' },
        family: 'test_family',
        source_tier: 'icty_icj_un',
        response_options: [
            {
                id: responseId,
                label: opts.label ?? 'Chosen Option',
                effects: [],
                enables_events_runtime: opensEvents,
                future_consequences: [
                    {
                        id: `${id}_fc`,
                        label: opts.consequenceLabel ?? 'Predicted consequence',
                        timing: 'future',
                        certainty: 'guaranteed',
                        opens_events: opensEvents,
                        explanation: opts.explanation ?? 'The dossier warns this opens downstream events.',
                    },
                ],
            },
        ],
    } as unknown as EventDefinition;
}

/** Build a plain downstream event def (the predicted target). */
function buildTargetDef(id: string, title?: string): EventDefinition {
    return {
        id,
        title: title ?? `Target ${id}`,
        trigger: { turn_min: 1, phase: 'war' },
        effect: { kind: 'narrative', text: 'noop' },
        family: 'test_family',
        source_tier: 'icty_icj_un',
        response_options: [],
    } as unknown as EventDefinition;
}

function buildState(opts: {
    decisions: DecisionInput[];
    playerFaction?: string;
    firedEventIds?: string[];
    closedEventIds?: string[];
    lastFiredTurn?: Record<string, number>;
    causalityLog?: CausalityLogEntry[];
}): GameState {
    const playerFaction = opts.playerFaction ?? 'RBiH';
    return {
        meta: {
            player_faction: playerFaction,
        },
        military: {
            fired_event_ids: opts.firedEventIds ?? [],
            enabled_event_ids: [],
            closed_event_ids: opts.closedEventIds ?? [],
            event_causality_log: opts.causalityLog ?? [],
            event_decision_log: opts.decisions.map((d) => ({
                event_id: d.event_id,
                response_id: d.response_id,
                decision_source: d.decision_source ?? 'player',
                faction: d.faction ?? playerFaction,
                turn: d.turn,
            })),
            event_last_fired_turn: opts.lastFiredTurn ?? {},
        },
    } as unknown as GameState;
}

describe('buildConsequenceReceipts', () => {
    it('returns [] defensively when state or catalog is absent/empty', () => {
        expect(buildConsequenceReceipts(undefined, undefined)).toEqual([]);
        expect(buildConsequenceReceipts(null, new Map())).toEqual([]);
        const state = buildState({ decisions: [{ event_id: 'e', response_id: 'opt_a', turn: 1 }] });
        expect(buildConsequenceReceipts(state, new Map())).toEqual([]);
        expect(buildConsequenceReceipts(state, undefined)).toEqual([]);
    });

    it('materializes only CONFIRMED downstream receipts on one constructed state', () => {
        // Decision E@turn 3, chose opt_a, predicts opening: p_confirmed, p_pending, p_closed.
        const catalog = new Map<string, EventDefinition>([
            ['E', buildEventDef('E', ['p_confirmed', 'p_pending', 'p_closed'], {
                title: 'Authorize the Goražde relief column',
                label: 'Send the column through',
                consequenceLabel: 'A counter-offensive on the Drina',
            })],
            ['p_confirmed', buildTargetDef('p_confirmed', 'VRS counter-offensive launched')],
            ['p_pending', buildTargetDef('p_pending')],
            ['p_closed', buildTargetDef('p_closed')],
        ]);

        const state = buildState({
            decisions: [{ event_id: 'E', response_id: 'opt_a', turn: 3 }],
            firedEventIds: ['E', 'p_confirmed'],
            closedEventIds: ['p_closed'],
            lastFiredTurn: { E: 3, p_confirmed: 9 },
            causalityLog: [
                { turn: 3, from_event: 'E', to_event: 'p_confirmed', to_flag: null, kind: 'enables', source_response_id: 'opt_a' },
            ],
        });

        const receipts = buildConsequenceReceipts(state, catalog);
        expect(receipts).toHaveLength(1);

        const byPredicted = new Map(receipts.map((r) => [r.predictedEventId, r]));

        const confirmed = byPredicted.get('p_confirmed')!;
        expect(confirmed.status).toBe('confirmed');
        expect(confirmed.firedTurn).toBe(9);
        expect(confirmed.turnsElapsed).toBe(6);
        expect(confirmed.sourceRecordId).toBe('decision:E::opt_a::3');
        expect(confirmed.receiptRecordId).toBe('receipt:E::opt_a::3::p_confirmed');
        // Originating decision resolved to TITLES + option prose, not raw ids.
        expect(confirmed.decisionTitle).toBe('Authorize the Goražde relief column');
        expect(confirmed.decisionOptionLabel).toBe('Send the column through');
        expect(confirmed.predictedLabel).toBe('A counter-offensive on the Drina');
        expect(confirmed.predictedExplanation).toContain('dossier');

        expect(byPredicted.has('p_pending')).toBe(false);
        expect(byPredicted.has('p_closed')).toBe(false);
    });

    it('does not materialize pending or foreclosed future consequence labels before realization', () => {
        const catalog = new Map<string, EventDefinition>([
            ['E', buildEventDef('E', ['future_peace_plan', 'foreclosed_peace_plan'], {
                consequenceLabel: 'The Vance-Owen Peace Plan',
                explanation: 'Would expose a future diplomatic track.',
            })],
            ['future_peace_plan', buildTargetDef('future_peace_plan', 'The Vance-Owen Peace Plan')],
            ['foreclosed_peace_plan', buildTargetDef('foreclosed_peace_plan', 'The Contact Group Plan')],
        ]);
        const state = buildState({
            decisions: [{ event_id: 'E', response_id: 'opt_a', turn: 3 }],
            firedEventIds: ['E'],
            closedEventIds: ['foreclosed_peace_plan'],
            lastFiredTurn: { E: 3 },
        });

        const receipts = buildConsequenceReceipts(state, catalog);
        const visibleReceiptText = receipts.map((receipt) => [
            receipt.predictedLabel,
            receipt.predictedExplanation,
        ].join(' ')).join('\n');

        expect(receipts).toEqual([]);
        expect(visibleReceiptText).not.toMatch(/Vance-Owen|Contact Group|future diplomatic/i);
    });

    it('keeps fallback visible labels player-safe while retaining raw ids internally', () => {
        const catalog = new Map<string, EventDefinition>([
            ['evt_internal_crisis_1994', buildEventDef('evt_internal_crisis_1994', ['csq_patron_recovery_offer'], {
                responseId: 'approve_emergency_measure',
                title: '',
                label: '   ',
                consequenceLabel: '   ',
                explanation: 'Downstream dossier entry.',
            })],
            ['csq_patron_recovery_offer', buildTargetDef('csq_patron_recovery_offer', '')],
        ]);
        const state = buildState({
            decisions: [{ event_id: 'evt_internal_crisis_1994', response_id: 'approve_emergency_measure', turn: 6 }],
            firedEventIds: ['evt_internal_crisis_1994', 'csq_patron_recovery_offer'],
            lastFiredTurn: { csq_patron_recovery_offer: 10 },
            causalityLog: [
                {
                    turn: 6,
                    from_event: 'evt_internal_crisis_1994',
                    to_event: 'csq_patron_recovery_offer',
                    to_flag: null,
                    kind: 'enables',
                    source_response_id: 'approve_emergency_measure',
                },
            ],
        });

        const [receipt] = buildConsequenceReceipts(state, catalog);
        expect(receipt.id).toBe('evt_internal_crisis_1994::approve_emergency_measure::6::csq_patron_recovery_offer');
        expect(receipt.decisionEventId).toBe('evt_internal_crisis_1994');
        expect(receipt.predictedEventId).toBe('csq_patron_recovery_offer');

        const visibleLabels = [
            receipt.decisionTitle,
            receipt.decisionOptionLabel,
            receipt.predictedLabel,
        ].join(' | ');
        expect(visibleLabels).not.toContain('evt_internal_crisis_1994');
        expect(visibleLabels).not.toContain('approve_emergency_measure');
        expect(visibleLabels).not.toContain('csq_');
        expect(receipt.decisionTitle).toBe('Internal Crisis 1994');
        expect(receipt.decisionOptionLabel).toBe('Approve Emergency Measure');
        expect(receipt.predictedLabel).toBe('Patron Recovery Offer');
    });

    it('requires the response-tagged enables edge for CONFIRMED (fired alone is not enough)', () => {
        const catalog = new Map<string, EventDefinition>([
            ['E', buildEventDef('E', ['p'])],
            ['p', buildTargetDef('p')],
        ]);
        // p fired but the enables edge is tagged with a DIFFERENT response_id.
        const state = buildState({
            decisions: [{ event_id: 'E', response_id: 'opt_a', turn: 2 }],
            firedEventIds: ['E', 'p'],
            lastFiredTurn: { p: 5 },
            causalityLog: [
                { turn: 2, from_event: 'E', to_event: 'p', to_flag: null, kind: 'enables', source_response_id: 'opt_other' },
            ],
        });
        expect(buildConsequenceReceipts(state, catalog)).toEqual([]);
    });

    it('does NOT confirm when P fired BEFORE the decision turn (no false causality)', () => {
        // The engine records an enables edge even when a response "enables" an
        // already-fired event. P fired at week 8, the decision is at week 14 —
        // confirming would falsely claim the week-14 choice caused the week-8
        // event. Must classify as pending, not confirmed.
        const catalog = new Map<string, EventDefinition>([
            ['E', buildEventDef('E', ['p_early'])],
            ['p_early', buildTargetDef('p_early')],
        ]);
        const state = buildState({
            decisions: [{ event_id: 'E', response_id: 'opt_a', turn: 14 }],
            firedEventIds: ['E', 'p_early'],
            lastFiredTurn: { p_early: 8 }, // fired BEFORE the decision turn
            causalityLog: [
                { turn: 14, from_event: 'E', to_event: 'p_early', to_flag: null, kind: 'enables', source_response_id: 'opt_a' },
            ],
        });
        expect(buildConsequenceReceipts(state, catalog)).toEqual([]);
    });

    it('confirms (with correct non-negative elapsed) when P fired AT/AFTER the decision turn', () => {
        const catalog = new Map<string, EventDefinition>([
            ['E', buildEventDef('E', ['p_same', 'p_after'])],
            ['p_same', buildTargetDef('p_same')],
            ['p_after', buildTargetDef('p_after')],
        ]);
        const state = buildState({
            decisions: [{ event_id: 'E', response_id: 'opt_a', turn: 6 }],
            firedEventIds: ['E', 'p_same', 'p_after'],
            lastFiredTurn: { p_same: 6, p_after: 11 }, // at-turn and after-turn
            causalityLog: [
                { turn: 6, from_event: 'E', to_event: 'p_same', to_flag: null, kind: 'enables', source_response_id: 'opt_a' },
                { turn: 6, from_event: 'E', to_event: 'p_after', to_flag: null, kind: 'enables', source_response_id: 'opt_a' },
            ],
        });
        const receipts = buildConsequenceReceipts(state, catalog);
        const byId = new Map(receipts.map((r) => [r.predictedEventId, r]));
        expect(byId.get('p_same')!.status).toBe('confirmed');
        expect(byId.get('p_same')!.turnsElapsed).toBe(0);
        expect(byId.get('p_after')!.status).toBe('confirmed');
        expect(byId.get('p_after')!.turnsElapsed).toBe(5);
    });

    it('excludes bot decisions — only the player promise→receipt loop earns a receipt', () => {
        const catalog = new Map<string, EventDefinition>([
            ['E', buildEventDef('E', ['p'])],
            ['p', buildTargetDef('p')],
        ]);
        const state = buildState({
            decisions: [{ event_id: 'E', response_id: 'opt_a', turn: 1, decision_source: 'bot_political' }],
            firedEventIds: ['E', 'p'],
            lastFiredTurn: { p: 4 },
            causalityLog: [
                { turn: 1, from_event: 'E', to_event: 'p', to_flag: null, kind: 'enables', source_response_id: 'opt_a' },
            ],
        });
        expect(buildConsequenceReceipts(state, catalog)).toEqual([]);
    });

    it('excludes foreign player decisions from the loaded player promise-to-receipt loop', () => {
        const catalog = new Map<string, EventDefinition>([
            ['E', buildEventDef('E', ['p'])],
            ['p', buildTargetDef('p')],
        ]);
        const state = buildState({
            playerFaction: 'RBiH',
            decisions: [{ event_id: 'E', response_id: 'opt_a', turn: 1, faction: 'RS' }],
            firedEventIds: ['E', 'p'],
            lastFiredTurn: { p: 4 },
            causalityLog: [
                { turn: 1, from_event: 'E', to_event: 'p', to_flag: null, kind: 'enables', source_response_id: 'opt_a' },
            ],
        });

        expect(buildConsequenceReceipts(state, catalog)).toEqual([]);
    });

    it('sorts CONFIRMED by fired turn ascending and omits pending rows', () => {
        const catalog = new Map<string, EventDefinition>([
            ['E', buildEventDef('E', ['p_late', 'p_early', 'p_pending'])],
            ['p_late', buildTargetDef('p_late')],
            ['p_early', buildTargetDef('p_early')],
            ['p_pending', buildTargetDef('p_pending')],
        ]);
        const state = buildState({
            decisions: [{ event_id: 'E', response_id: 'opt_a', turn: 1 }],
            firedEventIds: ['E', 'p_late', 'p_early'],
            lastFiredTurn: { p_late: 12, p_early: 4 },
            causalityLog: [
                { turn: 1, from_event: 'E', to_event: 'p_late', to_flag: null, kind: 'enables', source_response_id: 'opt_a' },
                { turn: 1, from_event: 'E', to_event: 'p_early', to_flag: null, kind: 'enables', source_response_id: 'opt_a' },
            ],
        });
        const receipts = buildConsequenceReceipts(state, catalog);
        expect(receipts.map((r) => r.predictedEventId)).toEqual(['p_early', 'p_late']);
    });

    it('receiptsRealizedOnTurn filters to CONFIRMED rows firing on the given turn', () => {
        const catalog = new Map<string, EventDefinition>([
            ['E', buildEventDef('E', ['p1', 'p2'])],
            ['p1', buildTargetDef('p1')],
            ['p2', buildTargetDef('p2')],
        ]);
        const state = buildState({
            decisions: [{ event_id: 'E', response_id: 'opt_a', turn: 1 }],
            firedEventIds: ['E', 'p1', 'p2'],
            lastFiredTurn: { p1: 5, p2: 8 },
            causalityLog: [
                { turn: 1, from_event: 'E', to_event: 'p1', to_flag: null, kind: 'enables', source_response_id: 'opt_a' },
                { turn: 1, from_event: 'E', to_event: 'p2', to_flag: null, kind: 'enables', source_response_id: 'opt_a' },
            ],
        });
        const receipts = buildConsequenceReceipts(state, catalog);
        const onTurn5 = receiptsRealizedOnTurn(receipts, 5);
        expect(onTurn5.map((r) => r.predictedEventId)).toEqual(['p1']);
    });

    it('keeps generated patron-defiance receipt copy localized in BCS mode', () => {
        setLocale('bcs');
        const state = {
            military: {
                patron_defiance_supply_cuts: [{
                    faction: 'RS',
                    turn: 12,
                    cut_fraction: 0.25,
                    support_after: 0.55,
                }],
            },
        } as unknown as GameState;

        const [receipt] = buildConsequenceReceipts(state, undefined);
        const text = [
            receipt.decisionTitle,
            receipt.decisionOptionLabel,
            receipt.predictedLabel,
            receipt.predictedExplanation,
        ].join(' ');

        expect(text).toContain('Prkos pokrovitelju');
        expect(text).toContain('Odbijen zahtjev Beograda');
        expect(text).toContain('Materijalna podrska Beograda smanjena za 25%');
        expect(text).not.toMatch(/Patron defiance|Refused|materiel cut|front fell|refusal stands/i);
    });

    it('filters patron-defiance receipts to the loaded player faction when ownership is known', () => {
        const state = {
            meta: { player_faction: 'RS' },
            military: {
                patron_defiance_supply_cuts: [
                    { faction: 'RS', turn: 12, cut_fraction: 0.25, support_after: 0.55 },
                    { faction: 'HRHB', turn: 12, cut_fraction: 0.2, support_after: 0.6 },
                ],
            },
        } as unknown as GameState;

        const receipts = buildConsequenceReceipts(state, undefined);

        expect(receipts.map((receipt) => receipt.id)).toEqual(['patron_defiance::RS::12']);
        expect(receipts.map((receipt) => receipt.predictedEventId)).toEqual(['patron_supply_cut_RS']);
    });
});
