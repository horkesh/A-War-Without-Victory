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

/** The turn each policy card fired in these saves: RBiH's answer filed at t0 applies at t4 (§6 T2); RS fires at t1 (round 4a). */
const DEFAULT_FIRED: Record<string, number> = { rbih_paramilitary_policy_1992: 4, rs_paramilitary_policy_1992: 1 };

function rawSave(
    faction: FactionId,
    log: unknown[],
    history: unknown[] = [],
    options: { fired?: Record<string, number>; captured?: boolean } = {},
): any {
    // Round 4 R3: a card answer is a receipt cause only once the card has applied it, so a save says when each card fired.
    const fired = options.fired ?? Object.fromEntries(
        [...new Set((log as Array<{ event_id: string }>).map((entry) => entry.event_id))]
            .filter((id) => id in DEFAULT_FIRED)
            .map((id) => [id, DEFAULT_FIRED[id]!]),
    );
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
            fired_event_ids: Object.keys(fired),
            event_fire_counts: Object.fromEntries(Object.keys(fired).map((id) => [id, 1])),
            event_last_fired_turn: fired,
        },
        political: {
            political_controllers: {},
            control_events: options.captured === false
                ? []
                : [{ turn: 5, settlement_id: 'op:kakanj:biljesevo', mechanism: 'paramilitary', from: 'RS', to: faction }],
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
        // An answer given after the sweep is not its basis. Player-override model (H-14/H-21, 2026-11-25; was: the stage-1
        // cause): before its card applied an answer, with none filed, the RS side's staff sent the bot's sweep, its card's
        // historical default, so the receipt names that default. RBiH's default refuses, so it keeps the stage-1 cause.
        expect(causeOf(rawSave('RS', [
            { event_id: 'rs_paramilitary_policy_1992', response_id: 'always_allow', decision_source: 'player', faction: 'RS', turn: 7 },
        ]))).toBe('historical_default_staff');
        // A side with no card and nothing filed is no longer a stage-1 case: round 4s P2 names the historical default (below).
    });

    it('round 4 R3: an RBiH Always allow filed at t0 whose card has not fired by the sweep never names the cause', () => {
        const filed = [{ event_id: 'rbih_paramilitary_policy_1992', response_id: 'always_allow', decision_source: 'player', faction: 'RBiH', turn: 0 }];
        // Not fired at all (an older build's save): no cause from the answer, so the stage-1 cause stays.
        expect(causeOf(rawSave('RBiH', filed, [], { fired: {} }))).toBeUndefined();
        // Fired only after the sweep (t6 > t5): the same.
        expect(causeOf(rawSave('RBiH', filed, [], { fired: { rbih_paramilitary_policy_1992: 6 } }))).toBeUndefined();
        // Applied by the sweep turn: the standing order sent it.
        expect(causeOf(rawSave('RBiH', filed, [], { fired: { rbih_paramilitary_policy_1992: 4 } }))).toBe('standing_order');
    });

    describe('round 4s P2: a side with no policy card (owner rule 2026-11-22)', () => {
        it('no card and no own record up to the sweep: the historical default the staff followed, swept and dissolved alike', () => {
            expect(PARAMILITARY_POLICY_CARD_ID_BY_FACTION.HRHB).toBeUndefined();
            expect(causeOf(rawSave('HRHB', []))).toBe('historical_default_staff');
            expect(causeOf(rawSave('HRHB', [], [], { captured: false }))).toBe('historical_default_staff');
            // A pre-stage-2 save looks the same (HRHB staff then swept as the bot did, the same default): pinned on purpose.
        });

        it('an own record on the basis (an in-person Always allow filed at or before the sweep) gives the neutral line', () => {
            for (const filedTurn of [3, 5]) {
                expect(causeOf(rawSave('HRHB', [], [
                    { id: `paramilitary:${filedTurn}:op:x:y`, turn: filedTurn, target_osid: 'op:x:y', faction: 'HRHB', strength: 150, decision: 'allow' },
                ])), `t${filedTurn}`).toBe('neutral');
            }
        });

        it('an Always deny filed AFTER the sweep does not change that sweep\'s cause', () => {
            expect(causeOf(rawSave('HRHB', [], [
                { id: 'paramilitary:7:op:x:y', turn: 7, target_osid: 'op:x:y', faction: 'HRHB', strength: 150, decision: 'deny' },
            ]))).toBe('historical_default_staff');
        });

        it('another side\'s record is not HRHB\'s, and the card sides are unchanged', () => {
            expect(causeOf(rawSave('HRHB', [], [
                { id: 'paramilitary:3:op:x:y', turn: 3, target_osid: 'op:x:y', faction: 'RS', strength: 150, decision: 'allow' },
            ]))).toBe('historical_default_staff');
            expect(causeOf(rawSave('RBiH', []))).toBeUndefined();
            // Player-override model (2026-11-25; was undefined): an RS side with no card answer by the sweep sent the bot's sweep.
            expect(causeOf(rawSave('RS', []))).toBe('historical_default_staff');
        });
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

    it('a real stage-2 campaign: Always allow at Delegated gives standing-order receipts, all from t4, when the filed answer applies', async () => {
        // §6 T: the answer given at t0 is filed and the card applies it at t4; before that nothing is sent in its name.
        const opening = (await startNewCampaign(process.cwd(), 'RBiH', 'apr_1992', 'historical')).state;
        const pending = resolveDesktopEventDecision(opening, 'rbih_state_identity', 'civic', process.cwd());
        pending.meta.autonomy_level = 2;
        let state = resolveDesktopEventDecision(pending, 'rbih_paramilitary_policy_1992', 'always_allow', process.cwd());
        for (let turn = 1; turn <= 4; turn += 1) {
            const advanced = await advanceTurn(state, process.cwd());
            expect(advanced.error).toBeUndefined();
            state = advanced.state;
        }
        const rows = parseGameState(JSON.parse(JSON.stringify(state))).paramilitaryUnrequested ?? [];
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.every((row) => row.turn === 4)).toBe(true);
        expect(rows.every((row) => row.cause === 'standing_order' && row.captured)).toBe(true);
    }, 300_000);
});

describe('Codex P2 on #866: who authored an unrequested sweep is read apart from the cause line (§14.10e(6))', () => {
    const rowOf = (raw: any) => {
        const rows = parseGameState(raw).paramilitaryUnrequested ?? [];
        expect(rows).toHaveLength(1);
        return rows[0]!;
    };
    const standing = (order: string, turn = 3) => ({ id: `standing:${turn}`, kind: 'standing_order', turn, faction: 'HRHB', order });

    it('HRHB deciding each request (an `ask` standing order) then a sweep at Assisted-Observer: neutral cause, staff-attributed', () => {
        const row = rowOf(rawSave('HRHB', [], [standing('ask')]));
        expect(row.cause).toBe('neutral');
        expect(row.authored_by).toBe('staff_default');
    });

    it('a request allowed one by one reads as deciding each request: staff-attributed', () => {
        const row = rowOf(rawSave('HRHB', [], [
            { id: 'paramilitary:3:op:x:y', turn: 3, target_osid: 'op:x:y', faction: 'HRHB', strength: 150, decision: 'allow' },
        ]));
        expect(row.authored_by).toBe('staff_default');
    });

    it('the player\'s own Always allow in force at the sweep is the player\'s order: no staff attribution', () => {
        expect(rowOf(rawSave('HRHB', [], [standing('always_allow')])).authored_by).toBeUndefined();
        // Newest act wins: an Always allow given after deciding each request.
        expect(rowOf(rawSave('HRHB', [], [standing('ask', 2), standing('always_allow', 4)])).authored_by).toBeUndefined();
    });

    it('an act filed after the sweep does not change that sweep\'s author', () => {
        expect(rowOf(rawSave('HRHB', [], [standing('ask', 3), standing('always_allow', 7)])).authored_by).toBe('staff_default');
    });
});
