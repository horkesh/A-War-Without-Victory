/**
 * Decision -> Consequence coverage telemetry — pure aggregator contract.
 *
 * Proves:
 *   (a) Absent / empty state collapses to a fully-zeroed digest (defensive).
 *   (b) Catalog-free mode yields null `coverage` + null `player_divergence_count`
 *       but still produces substrate-only counts.
 *   (c) Catalog mode classifies promise->receipt coverage as
 *       confirmed / pending / contradicted, matching the per-receipt
 *       classification rules in `consequenceReceipts.ts`.
 *   (d) Determinism: same state in -> byte-identical serialized digest out;
 *       all id lists are sorted via strictCompare.
 *   (e) Bot decisions never earn coverage; only the player's promise->receipt
 *       loop is scored. Foreclosed (closed) ids surface as `contradicted` +
 *       `foreclosed_event_ids`.
 *
 * Determinism: no clock, no RNG. Fixtures are minimal structurally-typed shapes.
 */

import { describe, expect, it } from 'vitest';

import type { GameState } from '../src/state/game_state.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';
import {
    DECISION_CONSEQUENCE_TELEMETRY_SCHEMA,
    buildDecisionConsequenceTelemetry,
    serializeDecisionConsequenceTelemetry,
} from '../src/diagnostics/telemetry/decision_consequence_telemetry.js';

// ---------------------------------------------------------------------------
// Minimal fixtures. We only populate the fields the aggregator reads, then
// cast through `unknown` to the full GameState shape (the aggregator is
// defensive over every field it touches).
// ---------------------------------------------------------------------------

type DecisionEntry = GameState['military']['event_decision_log'][number];

function makeState(military: Partial<GameState['military']>): GameState {
    return { military } as unknown as GameState;
}

function dec(
    event_id: string,
    response_id: string,
    decision_source: DecisionEntry['decision_source'],
    faction: DecisionEntry['faction'],
    turn: number,
): DecisionEntry {
    return { event_id, response_id, decision_source, faction, turn };
}

/** Minimal catalog entry with one option carrying future_consequences. */
function evt(
    id: string,
    optionId: string,
    opensEvents: string[],
    historicalDefault?: string,
): EventDefinition {
    return {
        id,
        title: id,
        response_options: [
            {
                id: optionId,
                label: optionId,
                effects: [],
                future_consequences: [
                    {
                        id: `${id}__fc`,
                        label: 'predicted',
                        timing: 'future',
                        certainty: 'conditional',
                        opens_events: opensEvents,
                        explanation: '',
                    },
                ],
            },
        ],
        historical_default_response_id: historicalDefault,
    } as unknown as EventDefinition;
}

function catalogOf(defs: EventDefinition[]): ReadonlyMap<string, EventDefinition> {
    return new Map(defs.map((d) => [d.id, d]));
}

describe('decision-consequence telemetry — defensive / empty', () => {
    it('(a) null state -> fully zeroed digest, coverage null without catalog', () => {
        const d = buildDecisionConsequenceTelemetry(null);
        expect(d.schema).toBe(DECISION_CONSEQUENCE_TELEMETRY_SCHEMA);
        expect(d.player_decision_count).toBe(0);
        expect(d.player_decisions_by_faction).toEqual([]);
        expect(d.decided_event_ids).toEqual([]);
        expect(d.foreclosed_event_ids).toEqual([]);
        expect(d.player_enabled_edge_count).toBe(0);
        expect(d.patron_defiance_cut_count).toBe(0);
        expect(d.coverage).toBeNull();
        expect(d.player_divergence_count).toBeNull();
    });

    it('(a2) null state WITH catalog -> zeroed coverage object, divergence 0', () => {
        const d = buildDecisionConsequenceTelemetry(null, catalogOf([evt('e1', 'opt', ['p1'])]));
        expect(d.coverage).toEqual({
            total_promises: 0,
            confirmed: 0,
            pending: 0,
            contradicted: 0,
            confirmed_ratio: 0,
        });
        expect(d.player_divergence_count).toBe(0);
    });

    it('empty military substrate -> zeroed digest', () => {
        const d = buildDecisionConsequenceTelemetry(makeState({}));
        expect(d.player_decision_count).toBe(0);
        expect(d.coverage).toBeNull();
    });
});

describe('decision-consequence telemetry — catalog-free counts', () => {
    it('(b) counts player decisions by faction; bot decisions ignored for divergence/coverage', () => {
        const state = makeState({
            event_decision_log: [
                dec('e_rbih', 'civic', 'player', 'RBiH', 2),
                dec('e_rs', 'aggressive', 'player', 'RS', 3),
                dec('e_bot', 'x', 'bot_political', 'RS', 1),
                dec('e_null', 'y', 'player', null, 4),
            ],
            closed_event_ids: ['z_closed', 'a_closed'],
            patron_defiance_supply_cuts: [
                { faction: 'RS', turn: 5, cut_fraction: 0.3, support_after: 0.5 },
            ],
            event_causality_log: [
                { turn: 2, from_event: 'e_rbih', to_event: 'down1', to_flag: null, kind: 'enables', source_response_id: 'civic' },
                { turn: 3, from_event: 'e_bot', to_event: 'down2', to_flag: null, kind: 'enables' },
            ],
        } as Partial<GameState['military']>);

        const d = buildDecisionConsequenceTelemetry(state);
        // 3 player decisions (bot excluded).
        expect(d.player_decision_count).toBe(3);
        // Sorted by faction id; null -> 'unknown'.
        expect(d.player_decisions_by_faction).toEqual([
            { faction: 'RBiH', decisions: 1 },
            { faction: 'RS', decisions: 1 },
            { faction: 'unknown', decisions: 1 },
        ]);
        // Distinct decided event ids sorted.
        expect(d.decided_event_ids).toEqual(['e_null', 'e_rbih', 'e_rs']);
        // Foreclosed sorted.
        expect(d.foreclosed_event_ids).toEqual(['a_closed', 'z_closed']);
        // Only e_rbih edge originates from a decided event; e_bot is not in the
        // player-decided set used for this count... wait, e_bot IS decided (by a
        // bot). countPlayerEnabledEdges keys off ALL decided events regardless of
        // source — but bot decisions are filtered out of getPlayerDecisionHistory,
        // so e_bot is NOT in decidedEventIds. Only the e_rbih edge counts.
        expect(d.player_enabled_edge_count).toBe(1);
        expect(d.patron_defiance_cut_count).toBe(1);
        // No catalog -> coverage + divergence null.
        expect(d.coverage).toBeNull();
        expect(d.player_divergence_count).toBeNull();
    });
});

describe('decision-consequence telemetry — coverage classification', () => {
    it('(c) confirmed / pending / contradicted classification', () => {
        const catalog = catalogOf([
            evt('e_conf', 'opt', ['p_conf'], 'opt'),    // historical default = chosen
            evt('e_pend', 'opt', ['p_pend'], 'other'),  // diverged from default
            evt('e_contra', 'opt', ['p_contra'], 'opt'),
        ]);
        const state = makeState({
            event_decision_log: [
                dec('e_conf', 'opt', 'player', 'RBiH', 2),
                dec('e_pend', 'opt', 'player', 'RS', 3),
                dec('e_contra', 'opt', 'player', 'HRHB', 4),
            ],
            fired_event_ids: ['p_conf'],
            closed_event_ids: ['p_contra'],
            event_last_fired_turn: { p_conf: 5 },
            event_causality_log: [
                { turn: 5, from_event: 'e_conf', to_event: 'p_conf', to_flag: null, kind: 'enables', source_response_id: 'opt' },
            ],
        } as Partial<GameState['military']>);

        const d = buildDecisionConsequenceTelemetry(state, catalog);
        expect(d.coverage).not.toBeNull();
        expect(d.coverage!.total_promises).toBe(3);
        expect(d.coverage!.confirmed).toBe(1);     // p_conf fired+edge+at-or-after
        expect(d.coverage!.pending).toBe(1);       // p_pend never fired / no edge
        expect(d.coverage!.contradicted).toBe(1);  // p_contra in closed set
        expect(d.coverage!.confirmed_ratio).toBeCloseTo(0.3333, 4);
        // Two divergences: e_pend chose 'opt' but default 'other'; e_conf + e_contra
        // chose the historical default -> not divergent.
        expect(d.player_divergence_count).toBe(1);
    });

    it('(c2) confirmed requires fired turn AT OR AFTER decision turn (no retro-credit)', () => {
        const catalog = catalogOf([evt('e1', 'opt', ['p1'])]);
        const state = makeState({
            event_decision_log: [dec('e1', 'opt', 'player', 'RBiH', 10)],
            fired_event_ids: ['p1'],
            // p1 fired BEFORE the decision -> not a receipt of this decision.
            event_last_fired_turn: { p1: 3 },
            event_causality_log: [
                { turn: 10, from_event: 'e1', to_event: 'p1', to_flag: null, kind: 'enables', source_response_id: 'opt' },
            ],
        } as Partial<GameState['military']>);
        const d = buildDecisionConsequenceTelemetry(state, catalog);
        expect(d.coverage!.confirmed).toBe(0);
        expect(d.coverage!.pending).toBe(1);
    });

    it('(c3) only the LAST-WINS decision for a recurring event is scored', () => {
        const catalog = catalogOf([evt('e1', 'optB', ['pB'])]);
        const state = makeState({
            event_decision_log: [
                dec('e1', 'optA', 'player', 'RBiH', 1),
                dec('e1', 'optB', 'player', 'RBiH', 5), // last-wins owner
            ],
            fired_event_ids: ['pB'],
            event_last_fired_turn: { pB: 6 },
            event_causality_log: [
                { turn: 6, from_event: 'e1', to_event: 'pB', to_flag: null, kind: 'enables', source_response_id: 'optB' },
            ],
        } as Partial<GameState['military']>);
        const d = buildDecisionConsequenceTelemetry(state, catalog);
        // catalog only knows optB; optA decision is skipped (no matching option),
        // optB owns the event and its promise pB is confirmed.
        expect(d.coverage!.total_promises).toBe(1);
        expect(d.coverage!.confirmed).toBe(1);
    });

    it('(c4) bot decisions earn no coverage', () => {
        const catalog = catalogOf([evt('e1', 'opt', ['p1'])]);
        const state = makeState({
            event_decision_log: [dec('e1', 'opt', 'bot_political', 'RS', 1)],
            fired_event_ids: ['p1'],
            event_last_fired_turn: { p1: 2 },
            event_causality_log: [
                { turn: 2, from_event: 'e1', to_event: 'p1', to_flag: null, kind: 'enables', source_response_id: 'opt' },
            ],
        } as Partial<GameState['military']>);
        const d = buildDecisionConsequenceTelemetry(state, catalog);
        expect(d.coverage!.total_promises).toBe(0);
        expect(d.player_decision_count).toBe(0);
    });
});

describe('decision-consequence telemetry — determinism', () => {
    it('(d) same state -> byte-identical serialized digest; lists sorted', () => {
        const catalog = catalogOf([evt('z_evt', 'opt', ['p2', 'p1'])]);
        const state = makeState({
            event_decision_log: [
                dec('z_evt', 'opt', 'player', 'RS', 1),
                dec('a_evt', 'opt2', 'player', 'RBiH', 2),
            ],
            closed_event_ids: ['z_close', 'a_close', 'a_close'],
        } as Partial<GameState['military']>);

        const s1 = serializeDecisionConsequenceTelemetry(buildDecisionConsequenceTelemetry(state, catalog));
        const s2 = serializeDecisionConsequenceTelemetry(buildDecisionConsequenceTelemetry(state, catalog));
        expect(s1).toBe(s2);

        const d = buildDecisionConsequenceTelemetry(state, catalog);
        // decided ids sorted, foreclosed deduped+sorted.
        expect(d.decided_event_ids).toEqual(['a_evt', 'z_evt']);
        expect(d.foreclosed_event_ids).toEqual(['a_close', 'z_close']);
    });
});
