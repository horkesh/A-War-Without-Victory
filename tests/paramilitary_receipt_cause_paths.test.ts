/**
 * §6 D1 stage 2: the receipt cause on the paths the §4 copy panel (narrative designer + historian, 2026-11-18) named, driven
 * through the real engine functions (the detect gate, the review-modal IPC body, the card answer, `evaluateEvents`,
 * `advanceParamilitaries`) and read back through the real adapter (`parseGameState`) and ledger.
 *
 * - 6a row: the cause-less receipt (`...unrequested` / `...unrequestedDissolved`) dropped its Full Control clause because a Full
 *   Control Always-allow sweep always has a derivable cause: a card answer gives `standing_order`, and the review modal files
 *   history, which gives `neutral`.
 * - Condition C1 (both seats): an RS human picks Always allow in the review modal at Full Control, then switches to Observer;
 *   the card is answered automatically, and E1 keeps the in-person order. The receipt must not credit that order to "the
 *   historical policy" (6d/6g). The saved basis cannot tell a kept modal Always allow from per-request answers followed by the
 *   automatic write (both file `allow` records), so the honest cause is A3's neutral line.
 *
 * Round 4a (b), 2026-11-22: the RS card fires at t1, after the goals card and no longer enabled by its answer (it was t2, enabled
 * by goals), so each card path below fires the card at t1.
 */

import { describe, expect, it } from 'vitest';

import type { FactionState, GameState } from '../src/state/game_state.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import {
    advanceParamilitaries,
    detectParamilitaryTargets,
    resolvePlayerParamilitaryDecisions,
} from '../src/sim/combat/paramilitary_sweep.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { resolveEventDecisionCore } from '../src/sim/events/resolve_decision_core.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import { buildDecisionConsequenceLedger } from '../src/ui/map/data/decisionConsequenceLedger.js';

const CATALOG = loadEventDefinitions(0);
const RS_CARD_ID = 'rs_paramilitary_policy_1992';
const RS_GOALS_ID = 'rs_strategic_goals';
const RS_CARD = CATALOG.find((def) => def.id === RS_CARD_ID)!;
const RS_GOALS = CATALOG.find((def) => def.id === RS_GOALS_ID)!;

/** Two undefended RBiH pockets in one municipality, each ringed by RS: one deployment per municipality per turn. */
const POCKETS = ['op:testmun:pocket_a', 'op:testmun:pocket_b'];
const RINGS = [
    ['op:testmun:ring_a1', 'op:testmun:ring_a2', 'op:testmun:ring_a3'],
    ['op:testmun:ring_b1', 'op:testmun:ring_b2', 'op:testmun:ring_b3'],
];

function graph(): { edges: EdgeRecord[]; reverseMap: OperationalToCanonicalReverseMap } {
    const edges: EdgeRecord[] = [];
    POCKETS.forEach((pocket, i) => {
        for (const cell of RINGS[i]!) edges.push({ a: cell, b: pocket } as EdgeRecord);
        edges.push({ a: RINGS[i]![0], b: RINGS[i]![1] } as EdgeRecord, { a: RINGS[i]![1], b: RINGS[i]![2] } as EdgeRecord);
    });
    edges.push({ a: RINGS[0]![2], b: RINGS[1]![0] } as EdgeRecord);
    const reverseMap = new Map<string, string[]>();
    for (const cell of [...POCKETS, ...RINGS.flat()]) reverseMap.set(cell, [cell]);
    return { edges, reverseMap };
}

/** A turn-1 war state: an RS human at Full Control, no standing order yet. */
function rsHumanState(): GameState {
    const controllers: Record<string, string> = {};
    for (const pocket of POCKETS) controllers[pocket] = 'RBiH';
    for (const cell of RINGS.flat()) controllers[cell] = 'RS';
    return {
        meta: {
            turn: 1,
            phase: 'war',
            schema_version: 1,
            seed: 'receipt-cause-paths',
            player_faction: 'RS',
            autonomy_level: 0,
            headless_scenario_auto_control: false,
        } as GameState['meta'],
        factions: [{ id: 'HRHB' } as FactionState, { id: 'RBiH' } as FactionState, { id: 'RS' } as FactionState],
        paramilitary_policy: 'ask',
        military: {
            formations: {},
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']),
            fired_event_ids: [],
            event_flags: {},
            pending_event_decisions: [],
        } as any,
        political: {
            political_controllers: controllers,
            municipalities: {
                testmun: {
                    organizational_penetration: {
                        patriotska_liga: 0, sda_penetration: 0,
                        paramilitary_rs: 70, sds_penetration: 60,
                        paramilitary_hrhb: 0, hdz_penetration: 0,
                    },
                },
            },
        } as any,
        displacement: {
            civilian_casualties: {
                RS: { killed: 0, fled_abroad: 0 },
                RBiH: { killed: 0, fled_abroad: 0 },
                HRHB: { killed: 0, fled_abroad: 0 },
            },
        } as any,
    } as GameState;
}

/** One pass of the real detect gate, then the march step: [RS sweeps spawned, RS requests pending]. */
function detectAndMarch(state: GameState): [number, number] {
    const { edges, reverseMap } = graph();
    const report = detectParamilitaryTargets(state, edges, reverseMap, CATALOG);
    advanceParamilitaries(state, edges, reverseMap);
    const pending = (state.pending_paramilitary_requests ?? []).filter((request) => request.faction === 'RS').length;
    return [report.spawned.filter((spawn) => spawn.faction === 'RS').length, pending];
}

/** March every sweep still on its way to its outcome (the receipt shows only an action with an outcome). */
function marchToOutcome(state: GameState): void {
    const { edges, reverseMap } = graph();
    for (let step = 0; step < 6; step++) {
        const active = Object.values(state.military.formations ?? {})
            .some((formation) => formation.kind === 'paramilitary' && formation.status === 'active');
        if (!active) return;
        state.meta.turn = (state.meta.turn ?? 0) + 1;
        advanceParamilitaries(state, edges, reverseMap);
    }
    throw new Error('a paramilitary sweep never reached its outcome');
}

/**
 * The request an older build raised for the first pocket at t1. Since §6 T merged (T3), no request reaches a manual
 * player before the side's card has applied, so only a save an older build wrote carries it.
 */
function restoreLegacyRequest(state: GameState): void {
    state.pending_paramilitary_requests = [{ target_osid: POCKETS[0]!, faction: 'RS', strength: 150, mode: 'rear_pocket' }];
}

/** The review modal's Always allow (the `resolve-paramilitary-requests` IPC body). */
function modalAlwaysAllow(state: GameState): void {
    state.paramilitary_policy = 'always_allow';
    for (const request of state.pending_paramilitary_requests ?? []) {
        if (request.faction === 'RS') request.decision = 'allow';
    }
    resolvePlayerParamilitaryDecisions(state);
}

/** The strategic-goals card answered in person. Since round 4a (b) it no longer enables the RS card, which fires at t1 on its own. */
function answerGoalsInPerson(state: GameState): void {
    state.military.fired_event_ids.push(RS_GOALS_ID);
    state.military.pending_event_decisions!.push({
        event_id: RS_GOALS_ID,
        event_title: RS_GOALS.title ?? RS_GOALS_ID,
        turn_fired: state.meta.turn,
        response_options: RS_GOALS.response_options!,
        faction: 'RS',
        requires_player_response: true,
    } as any);
    resolveEventDecisionCore(state, RS_GOALS_ID, 'all_six');
    expect(state.military.enabled_event_ids ?? []).not.toContain(RS_CARD_ID);
}

function cardDecision(state: GameState) {
    return (state.military.event_decision_log ?? []).find((entry) => entry.event_id === RS_CARD_ID);
}

/** The receipts the player would see: [cause, ledger detail key] per unrequested sweep. */
function receipts(state: GameState): { cause: string | undefined; key: string | undefined }[] {
    const parsed = parseGameState(JSON.parse(JSON.stringify(state)));
    const rows = parsed.paramilitaryUnrequested ?? [];
    const ledger = buildDecisionConsequenceLedger(parsed, 100).filter((record) => record.familyId === 'paramilitary-receipt');
    return rows.map((row) => ({
        cause: row.cause,
        key: ledger.find((record) => record.id === `paramilitary-staff:${row.id}`)?.detailToken?.key,
    }));
}

const CAUSE_LESS_KEYS = [
    'decisionConsequences.detail.paramilitary.unrequested',
    'decisionConsequences.detail.paramilitary.unrequestedDissolved',
];

const noRng = () => 0;

describe('§6 D1 stage 2: receipt causes on the panel\'s engine paths', () => {
    it('6a row: a Full Control sweep under a review-modal Always allow never reaches the cause-less receipt', () => {
        const state = rsHumanState();
        // t1: §6 T3 holds the manual player, so no request is raised; an older build's save carries one, and its
        // modal Always allow was filed against it.
        // Player-override model (H-14, 2026-11-25): with no order of the player's, the held side sends the bot's sweep, as
        // headless does that week (was: none). Checked on a copy, so the older build's save below stays as it was built.
        expect(detectAndMarch(structuredClone(state))).toEqual([1, 0]);
        restoreLegacyRequest(state);
        modalAlwaysAllow(state);
        expect(state.paramilitary_decision_history?.map((record) => [record.faction, record.decision])).toEqual([['RS', 'allow']]);
        // t2, still Full Control: the RS card has not applied, so T3 still holds and the modal order sends nothing
        // (before §6 T, the standing order sent the second pocket's sweep here with no request).
        state.meta.turn = 2;
        expect(detectAndMarch(state)).toEqual([0, 0]);
        marchToOutcome(state);
        // No sweep was sent without a request, so no receipt, and none with the cause-less text.
        expect(receipts(state)).toEqual([]);
    });

    it('6a row: a Full Control sweep under the card\'s Always allow answered in person never reaches the cause-less receipt', () => {
        const state = rsHumanState();
        answerGoalsInPerson(state);
        // t1, Full Control: the card fires and waits; the human answers it in person.
        expect(state.meta.turn).toBe(1);
        evaluateEvents(state, noRng, 1, [RS_CARD] as EventDefinition[]);
        expect((state.military.pending_event_decisions ?? []).map((pending) => pending.event_id)).toEqual([RS_CARD_ID]);
        resolveEventDecisionCore(state, RS_CARD_ID, 'always_allow');
        expect(cardDecision(state)).toMatchObject({ response_id: 'always_allow', decision_source: 'player', faction: 'RS' });
        expect(state.paramilitary_policy).toBe('always_allow');
        expect(detectAndMarch(state)).toEqual([1, 0]);
        marchToOutcome(state);

        const shown = receipts(state);
        expect(shown).toHaveLength(1);
        expect(shown[0]!.cause).toBe('standing_order');
        expect(CAUSE_LESS_KEYS).not.toContain(shown[0]!.key);
    });

    it('C1: a review-modal Always allow kept at Observer is never credited to the historical policy (the cause is neutral)', () => {
        const state = rsHumanState();
        // t1, Full Control: T3 raises no request; on the request an older build's save carries, the human picks Always
        // allow in the modal, then answers the goals card.
        // Player-override model (H-14, 2026-11-25): with no order of the player's, the held side sends the bot's sweep, as
        // headless does that week (was: none). Checked on a copy, so the older build's save below stays as it was built.
        expect(detectAndMarch(structuredClone(state))).toEqual([1, 0]);
        restoreLegacyRequest(state);
        modalAlwaysAllow(state);
        answerGoalsInPerson(state);
        // Still t1: the human is at Observer; the card fires and is answered automatically with the historical default.
        state.meta.autonomy_level = 3;
        evaluateEvents(state, noRng, 1, [RS_CARD] as EventDefinition[]);
        expect(cardDecision(state)).toMatchObject({ response_id: 'always_allow', decision_source: 'bot_ai_default', faction: 'RS' });
        // E1 keeps the in-person order (the same value here). At the next detect (t2: t1's detect already ran, before the
        // legacy request was answered) the staff sends the second pocket's sweep under it.
        expect(state.paramilitary_policy).toBe('always_allow');
        state.meta.turn = 2;
        expect(detectAndMarch(state)).toEqual([1, 0]);
        marchToOutcome(state);

        const shown = receipts(state);
        expect(shown).toHaveLength(1);
        expect(shown[0]!.key).not.toMatch(/AutomaticOrder$/);
        expect(shown[0]!.cause).toBe('neutral');
        expect(shown[0]!.key).toMatch(/^decisionConsequences\.detail\.paramilitary\.unrequested(Dissolved)?Neutral$/);
    });

    it('C1 control: with no in-person order, the automatic answer is the cause (6d/6g)', () => {
        const state = rsHumanState();
        answerGoalsInPerson(state);
        state.meta.autonomy_level = 3;
        evaluateEvents(state, noRng, 1, [RS_CARD] as EventDefinition[]);
        expect(cardDecision(state)).toMatchObject({ response_id: 'always_allow', decision_source: 'bot_ai_default', faction: 'RS' });
        expect(state.paramilitary_policy).toBe('always_allow');
        expect(detectAndMarch(state)).toEqual([1, 0]);
        marchToOutcome(state);

        const shown = receipts(state);
        expect(shown).toHaveLength(1);
        expect(shown[0]!.cause).toBe('standing_order_automatic');
        expect(shown[0]!.key).toMatch(/^decisionConsequences\.detail\.paramilitary\.unrequested(Dissolved)?AutomaticOrder$/);
    });
});
