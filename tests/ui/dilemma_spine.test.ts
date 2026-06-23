import assert from 'node:assert';
import { describe, test } from 'vitest';

import {
    buildDilemmaSpine,
    DILEMMA_SPINE,
    type DilemmaSpineView,
} from '../../src/ui/map/data/dilemmaSpine.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import essayIndex from '../../data/scenarios/essays/essay_index.json';
import war1992 from '../../data/scenarios/events/war_1992.json';
import war1993 from '../../data/scenarios/events/war_1993.json';
import war1994 from '../../data/scenarios/events/war_1994.json';
import war1995 from '../../data/scenarios/events/war_1995.json';

/** Build a minimal LoadedGameState carrying only the fields buildDilemmaSpine
 *  reads (firedEvents, decisionResponses, rawGameState.military.event_decision_log). */
function fixtureLoaded(opts: {
    playerFaction?: string;
    firedIds?: string[];
    rawFiredIds?: string[];
    pendingIds?: string[];
    decisions?: Array<{ event_id: string; response_id: string; turn: number; decision_source?: string; faction?: string | null }>;
}): LoadedGameState {
    const playerFaction = opts.playerFaction ?? 'RBiH';
    const firedEvents = (opts.firedIds ?? []).map((id) => ({
        id,
        turn: 0,
        title: id,
        narrative: '',
        category: 'military',
        effects: [] as Array<{ kind: string; description: string }>,
        isDecision: false,
    }));
    const decisionResponses = new Set<string>(
        (opts.decisions ?? []).map((d) => `${d.event_id}:${d.response_id}`),
    );
    return {
        firedEvents,
        decisionResponses,
        rawGameState: {
            meta: {
                player_faction: playerFaction,
            },
            military: {
                // Authoritative uncapped fired set. Defaults to the view ids so existing
                // cases stay realistic (the capped view is always a subset of this).
                fired_event_ids: opts.rawFiredIds ?? opts.firedIds ?? [],
                pending_event_decisions: (opts.pendingIds ?? []).map((id) => ({
                    event_id: id,
                    event_title: id,
                    turn_fired: 0,
                    faction: playerFaction,
                    requires_player_response: true,
                    response_options: [{ id: 'historical', label: 'Historical', effects: [] }],
                })),
                event_decision_log: (opts.decisions ?? []).map((d) => ({
                    event_id: d.event_id,
                    response_id: d.response_id,
                    decision_source: d.decision_source ?? 'player',
                    faction: d.faction ?? playerFaction,
                    turn: d.turn,
                })),
            },
        },
    } as unknown as LoadedGameState;
}

function byId(views: DilemmaSpineView[], dilemmaId: string): DilemmaSpineView {
    const v = views.find((x) => x.dilemmaId === dilemmaId);
    assert.ok(v, `expected dilemma ${dilemmaId} in spine`);
    return v!;
}

describe('buildDilemmaSpine', () => {
    test('empty/flag-off state returns the full not-yet-faced backbone in canon order', () => {
        const views = buildDilemmaSpine(undefined);
        assert.strictEqual(views.length, DILEMMA_SPINE.length);
        assert.deepStrictEqual(
            views.map((v) => v.dilemmaId),
            DILEMMA_SPINE.map((d) => d.dilemmaId),
        );
        for (const v of views) {
            assert.strictEqual(v.faced, false);
            assert.strictEqual(v.chosenResponseId, null);
            assert.strictEqual(v.chosenBranchLabel, null);
            assert.strictEqual(v.decisionTurn, null);
        }
    });

    test('faced dilemma resolves chosenResponseId, decisionTurn, and canon branch label', () => {
        const views = buildDilemmaSpine(
            fixtureLoaded({
                firedIds: ['vance_owen_plan_1993'],
                decisions: [{ event_id: 'vance_owen_plan_1993', response_id: 'accept', turn: 39 }],
            }),
        );
        const vopp = byId(views, 'vance_owen_plan');
        assert.strictEqual(vopp.faced, true);
        assert.strictEqual(vopp.chosenResponseId, 'accept');
        assert.strictEqual(vopp.decisionTurn, 39);
        // Canon response-option label resolved from the event JSON.
        assert.strictEqual(vopp.chosenBranchLabel, 'Accept the Vance-Owen Plan');
    });

    test('unfaced dilemma stays not-yet-faced when no fire and no response recorded', () => {
        const views = buildDilemmaSpine(
            fixtureLoaded({
                firedIds: ['vance_owen_plan_1993'],
                decisions: [{ event_id: 'vance_owen_plan_1993', response_id: 'accept', turn: 39 }],
            }),
        );
        const cg = byId(views, 'contact_group_plan');
        assert.strictEqual(cg.faced, false);
        assert.strictEqual(cg.chosenResponseId, null);
        assert.strictEqual(cg.chosenBranchLabel, null);
        assert.strictEqual(cg.decisionTurn, null);
    });

    test('faced lights up off a recorded response even without a fired-event entry', () => {
        const views = buildDilemmaSpine(
            fixtureLoaded({
                firedIds: [],
                decisions: [{ event_id: 'hrhb_political_goal', response_id: 'croat_republic', turn: 5 }],
            }),
        );
        const hrhb = byId(views, 'hrhb_alliance_or_republic');
        assert.strictEqual(hrhb.faced, true);
        assert.strictEqual(hrhb.chosenResponseId, 'croat_republic');
        assert.strictEqual(hrhb.decisionTurn, 5);
        assert.strictEqual(hrhb.chosenBranchLabel, 'Croat republic — follow Zagreb');
    });

    test('last-wins: the final log entry for an event owns the decision', () => {
        const views = buildDilemmaSpine(
            fixtureLoaded({
                firedIds: ['vance_owen_plan_1993'],
                decisions: [
                    { event_id: 'vance_owen_plan_1993', response_id: 'accept', turn: 39 },
                    { event_id: 'vance_owen_plan_1993', response_id: 'reject', turn: 41 },
                ],
            }),
        );
        const vopp = byId(views, 'vance_owen_plan');
        assert.strictEqual(vopp.chosenResponseId, 'reject');
        assert.strictEqual(vopp.decisionTurn, 41);
        assert.strictEqual(vopp.chosenBranchLabel, 'Reject the Vance-Owen Plan');
    });

    test('pending unanswered foundational events are not faced until a response is recorded', () => {
        const views = buildDilemmaSpine(
            fixtureLoaded({
                firedIds: [],
                rawFiredIds: ['rs_strategic_goals'],
                pendingIds: ['rs_strategic_goals'],
            }),
        );
        const rs = byId(views, 'rs_six_strategic_goals');
        assert.strictEqual(rs.faced, false);
        assert.strictEqual(rs.chosenResponseId, null);
        assert.strictEqual(rs.decisionTurn, null);
    });

    test('pending event rows with recorded responses are still faced history', () => {
        const views = buildDilemmaSpine(
            fixtureLoaded({
                firedIds: [],
                rawFiredIds: ['rs_strategic_goals'],
                pendingIds: ['rs_strategic_goals'],
                decisions: [{ event_id: 'rs_strategic_goals', response_id: 'all_six', turn: 0 }],
            }),
        );
        const rs = byId(views, 'rs_six_strategic_goals');
        assert.strictEqual(rs.faced, true);
        assert.strictEqual(rs.chosenResponseId, 'all_six');
        assert.strictEqual(rs.decisionTurn, 0);
        assert.strictEqual(rs.chosenBranchLabel, 'Adopt all six goals');
    });

    test('foreign or bot keystone decisions do not mark the loaded player dilemma as faced', () => {
        const views = buildDilemmaSpine(
            fixtureLoaded({
                playerFaction: 'RBiH',
                firedIds: [],
                rawFiredIds: ['rs_strategic_goals', 'hrhb_political_goal'],
                decisions: [
                    { event_id: 'rs_strategic_goals', response_id: 'all_six', turn: 0, faction: 'RS' },
                    { event_id: 'hrhb_political_goal', response_id: 'croat_republic', turn: 0, faction: 'HRHB', decision_source: 'bot_ai_default' },
                ],
            }),
        );

        const rs = byId(views, 'rs_six_strategic_goals');
        const hrhb = byId(views, 'hrhb_alliance_or_republic');
        assert.strictEqual(rs.faced, false);
        assert.strictEqual(rs.chosenResponseId, null);
        assert.strictEqual(hrhb.faced, false);
        assert.strictEqual(hrhb.chosenResponseId, null);
    });

    test('unresolvable response id falls back to player-safe copy, not the raw response id', () => {
        const views = buildDilemmaSpine(
            fixtureLoaded({
                decisions: [{ event_id: 'vance_owen_plan_1993', response_id: 'not_a_real_option', turn: 39 }],
            }),
        );
        const vopp = byId(views, 'vance_owen_plan');
        assert.strictEqual(vopp.faced, true);
        assert.strictEqual(vopp.chosenResponseId, 'not_a_real_option');
        assert.strictEqual(vopp.chosenBranchLabel, 'Recorded choice');
        assert.notStrictEqual(vopp.chosenBranchLabel, vopp.chosenResponseId);
    });

    test('faced uses the uncapped raw fired_event_ids when the capped view dropped the event (Codex P2 #82)', () => {
        // Long-running/older save: the dilemma fired >20 events ago so deriveFiredEvents
        // (the capped timeline view) no longer contains it, and a pre-Thread-1 save has
        // no decision-log entry — but military.fired_event_ids still records it.
        const views = buildDilemmaSpine(
            fixtureLoaded({
                firedIds: [],
                rawFiredIds: ['vance_owen_plan_1993'],
                decisions: [],
            }),
        );
        const vopp = byId(views, 'vance_owen_plan');
        assert.strictEqual(vopp.faced, true);
        // Faced but no decision recorded → branch fields stay null.
        assert.strictEqual(vopp.chosenResponseId, null);
        assert.strictEqual(vopp.decisionTurn, null);
    });

    test('karadzic split dilemma has no essay (essayId null) and surfaces event only', () => {
        const def = DILEMMA_SPINE.find((d) => d.dilemmaId === 'karadzic_mladic_split');
        assert.ok(def);
        assert.strictEqual(def!.essayId, null);
    });
});

describe('dilemma-spine data integrity', () => {
    const ALL_EVENTS: Array<{ id?: unknown; tags?: unknown }> = [
        ...(war1992 as Array<{ id?: unknown; tags?: unknown }>),
        ...(war1993 as Array<{ id?: unknown; tags?: unknown }>),
        ...(war1994 as Array<{ id?: unknown; tags?: unknown }>),
        ...(war1995 as Array<{ id?: unknown; tags?: unknown }>),
    ];

    function findEvent(id: string) {
        return ALL_EVENTS.find((e) => e.id === id);
    }

    test('each keystone decision event row carries the keystone_dilemma tag', () => {
        for (const def of DILEMMA_SPINE) {
            const row = findEvent(def.decisionEventId);
            assert.ok(row, `decision event ${def.decisionEventId} must exist in event data`);
            const tags = Array.isArray(row!.tags) ? (row!.tags as string[]) : [];
            assert.ok(
                tags.includes('keystone_dilemma'),
                `decision event ${def.decisionEventId} must carry the keystone_dilemma tag`,
            );
        }
    });

    test('every essayId in the spine exists in essay_index.json', () => {
        const essays = (Array.isArray(essayIndex)
            ? essayIndex
            : (essayIndex as { essays: Array<{ id: string }> }).essays ?? []) as Array<{ id: string }>;
        const essayIds = new Set(essays.map((e) => e.id));
        for (const def of DILEMMA_SPINE) {
            if (def.essayId === null) continue;
            assert.ok(
                essayIds.has(def.essayId),
                `spine essayId ${def.essayId} must exist in essay_index.json`,
            );
        }
    });
});
