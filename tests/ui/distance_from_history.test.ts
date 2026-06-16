import assert from 'node:assert';
import { describe, test } from 'vitest';

import {
    buildDistanceFromHistory,
    type DistanceFromHistoryInput,
} from '../../src/ui/map/data/distanceFromHistory.js';

/**
 * Build a minimal DistanceFromHistoryInput carrying only the raw substrate the
 * read-model reads: rawGameState.military.event_decision_log. Mirrors
 * dilemma_spine.test.ts's fixtureLoaded pattern, narrowed to this read-model's
 * input.
 *
 * Real catalog events are used so the historical-default join is exercised
 * against actual data:
 *   - vance_owen_plan_1993        historical default = 'accept'
 *   - contact_group_plan_1994     historical default = 'accept'
 *   - karadzic_mladic_split_1995  historical default = 'back_down'
 *   - arms_embargo_impact_1992    NO historical default (must be skipped)
 */
function fixtureInput(
    decisions: Array<{
        event_id: string;
        response_id: string;
        turn: number;
        decision_source?: 'bot_political' | 'bot_v1' | 'bot_ai_default' | 'player';
        faction?: string | null;
    }>,
): DistanceFromHistoryInput {
    return {
        rawGameState: {
            military: {
                event_decision_log: decisions.map((d) => ({
                    event_id: d.event_id,
                    response_id: d.response_id,
                    decision_source: d.decision_source ?? 'bot_ai_default',
                    faction: d.faction ?? null,
                    turn: d.turn,
                })),
            },
        },
    };
}

describe('buildDistanceFromHistory', () => {
    test('no log → zero-divergence view (never throws)', () => {
        for (const input of [undefined, null, {}, { rawGameState: {} }, fixtureInput([])]) {
            const view = buildDistanceFromHistory(input as DistanceFromHistoryInput | null | undefined);
            assert.strictEqual(view.totalDecided, 0);
            assert.strictEqual(view.matchedHistory, 0);
            assert.strictEqual(view.diverged, 0);
            assert.strictEqual(view.divergencePct, 0);
            assert.strictEqual(view.playerDiverged, 0);
            assert.deepStrictEqual(view.divergences, []);
        }
    });

    test('counts matched + diverged + player-diverged; skips events with no historical default', () => {
        const view = buildDistanceFromHistory(
            fixtureInput([
                // MATCHED — chose the historical default ('accept').
                { event_id: 'vance_owen_plan_1993', response_id: 'accept', turn: 39, decision_source: 'bot_political' },
                // DIVERGED (bot) — chose other than the historical default ('back_down').
                { event_id: 'karadzic_mladic_split_1995', response_id: 'purge', turn: 180, decision_source: 'bot_political' },
                // DIVERGED + PLAYER-AUTHORED (default 'accept', chose 'reject').
                {
                    event_id: 'contact_group_plan_1994',
                    response_id: 'reject',
                    turn: 60,
                    decision_source: 'player',
                    faction: 'RBiH',
                },
                // SKIPPED — arms_embargo_impact_1992 has no historical_default_response_id.
                { event_id: 'arms_embargo_impact_1992', response_id: 'whatever', turn: 5, decision_source: 'player' },
            ]),
        );

        // arms_embargo_impact_1992 is skipped → 3 decided, not 4.
        assert.strictEqual(view.totalDecided, 3);
        assert.strictEqual(view.matchedHistory, 1);
        assert.strictEqual(view.diverged, 2);
        // 2 / 3 → 67%.
        assert.strictEqual(view.divergencePct, 67);
        // Only the player-sourced divergence counts toward playerDiverged.
        assert.strictEqual(view.playerDiverged, 1);

        // Divergences sorted by turn asc: contact_group (60) before karadzic (180).
        assert.strictEqual(view.divergences.length, 2);
        assert.strictEqual(view.divergences[0].eventId, 'contact_group_plan_1994');
        assert.strictEqual(view.divergences[0].source, 'player');
        assert.strictEqual(view.divergences[0].faction, 'RBiH');
        assert.strictEqual(view.divergences[1].eventId, 'karadzic_mladic_split_1995');
        assert.strictEqual(view.divergences[1].chosenResponseId, 'purge');
        assert.strictEqual(view.divergences[1].historicalResponseId, 'back_down');

        // No divergent row is for the skipped no-default event.
        assert.ok(!view.divergences.some((d) => d.eventId === 'arms_embargo_impact_1992'));
    });

    test('resolves a readable title from the event catalog', () => {
        const view = buildDistanceFromHistory(
            fixtureInput([
                { event_id: 'vance_owen_plan_1993', response_id: 'reject', turn: 39 },
            ]),
        );
        assert.strictEqual(view.diverged, 1);
        // Title comes from the catalog (war_1993.json), not the raw id.
        assert.strictEqual(view.divergences[0].title, 'Vance-Owen Peace Plan Presented');
    });

    test('last-wins: the final log entry for an event owns the decision', () => {
        const view = buildDistanceFromHistory(
            fixtureInput([
                // Initial choice matched history…
                { event_id: 'vance_owen_plan_1993', response_id: 'accept', turn: 39 },
                // …then a later re-decision diverged. Last entry wins.
                { event_id: 'vance_owen_plan_1993', response_id: 'reject', turn: 41, decision_source: 'player' },
            ]),
        );
        assert.strictEqual(view.totalDecided, 1);
        assert.strictEqual(view.matchedHistory, 0);
        assert.strictEqual(view.diverged, 1);
        assert.strictEqual(view.playerDiverged, 1);
        assert.strictEqual(view.divergences[0].chosenResponseId, 'reject');
        assert.strictEqual(view.divergences[0].turn, 41);
    });

    test('surfaces response labels while preserving raw response ids internally', () => {
        const view = buildDistanceFromHistory(
            fixtureInput([
                { event_id: 'vance_owen_plan_1993', response_id: 'reject', turn: 39 },
            ]),
        );
        assert.strictEqual(view.diverged, 1);
        assert.strictEqual(view.divergences[0].chosen, 'Reject the Vance-Owen Plan');
        assert.strictEqual(view.divergences[0].historical, 'Accept the Vance-Owen Plan');
        assert.strictEqual(view.divergences[0].chosenResponseId, 'reject');
        assert.strictEqual(view.divergences[0].historicalResponseId, 'accept');
    });

    test('missing response labels use player-safe fallback copy, not raw ids', () => {
        const view = buildDistanceFromHistory(
            fixtureInput([
                { event_id: 'vance_owen_plan_1993', response_id: 'not_a_real_option', turn: 39 },
            ]),
        );
        assert.strictEqual(view.diverged, 1);
        assert.strictEqual(view.divergences[0].chosen, 'Recorded choice');
        assert.notStrictEqual(view.divergences[0].chosen, 'not_a_real_option');
        assert.strictEqual(view.divergences[0].chosenResponseId, 'not_a_real_option');
    });

    test('all-matched run → zero divergence, 0%', () => {
        const view = buildDistanceFromHistory(
            fixtureInput([
                { event_id: 'vance_owen_plan_1993', response_id: 'accept', turn: 39 },
                { event_id: 'karadzic_mladic_split_1995', response_id: 'back_down', turn: 180 },
            ]),
        );
        assert.strictEqual(view.totalDecided, 2);
        assert.strictEqual(view.matchedHistory, 2);
        assert.strictEqual(view.diverged, 0);
        assert.strictEqual(view.divergencePct, 0);
        assert.strictEqual(view.playerDiverged, 0);
        assert.deepStrictEqual(view.divergences, []);
    });
});
