/**
 * §6 D1 stage 2, ruling A1: an order the human gives in person wins.
 *
 * Pinning test for a suspected defect (historian code read, 2026-11-18): an RS human sets Always deny
 * in the paramilitary review modal before the RS policy card has fired, then switches to Observer.
 * When the card fires, Observer answers it automatically. That automatic answer must not replace the
 * order the human gave in person: the standing order stays Always deny and the paramilitary gate
 * still sends no sweep. Since F1-B (2026-11-19) the automatic answer is the card's Always deny
 * itself, not the historical Always allow (tests/paramilitary_observer_in_person_order_f1b.test.ts);
 * E1's guard in the mirror stays as a second guard.
 *
 * Both automatic-answer paths are driven through the real `evaluateEvents`: the fire-time branch
 * (the card fires while Observer is on) and the Observer drain (the card fired at Full Control,
 * waited, and Observer was switched on before the human answered it). The modal step is the
 * `resolve-paramilitary-requests` IPC body: write the standing order, mark each request, then
 * `resolvePlayerParamilitaryDecisions`. The live case runs the desktop campaign path.
 *
 * Round 4a (b), 2026-11-22: the RS card fires at t1 (after the goals card, no longer enabled by its answer), so the legacy
 * in-person Always deny now meets the card in the same week: the fire-time case fires it at t1, the drain case fires it at t1 at
 * Full Control and drains it at t2, and the live card waits on the manual desk from t1.
 */

import { describe, expect, it } from 'vitest';

import type { FactionState, GameState } from '../src/state/game_state.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import {
    detectParamilitaryTargets,
    resolvePlayerParamilitaryDecisions,
} from '../src/sim/combat/paramilitary_sweep.js';
import { resolveNonManualParamilitaryPolicy } from '../src/sim/combat/paramilitary_policy.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { resolveEventDecisionCore } from '../src/sim/events/resolve_decision_core.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import { advanceTurn, resolveDesktopEventDecision, startNewCampaign } from '../src/desktop/desktop_sim.js';

const CATALOG = loadEventDefinitions(0);
const RS_CARD_ID = 'rs_paramilitary_policy_1992';
const RS_GOALS_ID = 'rs_strategic_goals';
const RS_CARD = CATALOG.find((def) => def.id === RS_CARD_ID)!;
const RS_GOALS = CATALOG.find((def) => def.id === RS_GOALS_ID)!;

const TARGET = 'op:testmun:pocket';
const RING = ['op:testmun:ring_a', 'op:testmun:ring_b', 'op:testmun:ring_c'];

function graph(): { edges: EdgeRecord[]; reverseMap: OperationalToCanonicalReverseMap } {
    const edges = [
        ...RING.map((cell) => ({ a: cell, b: TARGET }) as EdgeRecord),
        { a: RING[0], b: RING[1] } as EdgeRecord,
        { a: RING[1], b: RING[2] } as EdgeRecord,
    ];
    const reverseMap = new Map<string, string[]>();
    for (const cell of [TARGET, ...RING]) reverseMap.set(cell, [cell]);
    return { edges, reverseMap };
}

/** A turn-1 war state: an RS human at Full Control whose side surrounds one undefended RBiH cell. */
function rsHumanState(): GameState {
    const controllers: Record<string, string> = { [TARGET]: 'RBiH' };
    for (const cell of RING) controllers[cell] = 'RS';
    return {
        meta: {
            turn: 1,
            phase: 'war',
            schema_version: 1,
            seed: 'observer-keeps-deny',
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

/** RS sweeps spawned and RS requests raised by one pass of the real detect gate. */
function rsOutcome(state: GameState): [number, number] {
    const { edges, reverseMap } = graph();
    const report = detectParamilitaryTargets(state, edges, reverseMap, CATALOG);
    const spawns = report.spawned.filter((spawn) => spawn.faction === 'RS').length;
    const pending = (state.pending_paramilitary_requests ?? []).filter((request) => request.faction === 'RS').length;
    return [spawns, pending];
}

/** The review modal's Always deny (the `resolve-paramilitary-requests` IPC body). */
function modalAlwaysDeny(state: GameState): void {
    state.paramilitary_policy = 'always_deny';
    for (const request of state.pending_paramilitary_requests ?? []) {
        if (request.faction === 'RS') request.decision = 'deny';
    }
    resolvePlayerParamilitaryDecisions(state);
}

/**
 * The request an older build raised for the pocket at t1. Since §6 T merged (T3), no request reaches a
 * manual player before the side's card has applied, so a new campaign never raises it; a save an older
 * build wrote still can carry it, and the review IPC still files an Always deny against it.
 */
function restoreLegacyRequest(state: GameState): void {
    state.pending_paramilitary_requests = [{ target_osid: TARGET, faction: 'RS', strength: 150, mode: 'rear_pocket' }];
}

/**
 * At Full Control, t1: the human picks Always deny in the modal on the request an older build left
 * (the T3 gate holds a new one), then answers the strategic-goals card in person. Since round 4a (b)
 * that answer no longer enables the RS policy card: the card fires at t1 on its own.
 */
function inPersonDenyBeforeTheCard(): GameState {
    const state = rsHumanState();
    expect(rsOutcome(state)).toEqual([0, 0]);
    restoreLegacyRequest(state);
    modalAlwaysDeny(state);
    expect(state.paramilitary_policy).toBe('always_deny');
    expect(state.paramilitary_decision_history?.map((record) => [record.faction, record.decision])).toEqual([['RS', 'deny']]);

    // The goals card fired at t1 and waits for the human (a fired event, so the answer applies now).
    state.military.fired_event_ids.push(RS_GOALS_ID);
    state.military.pending_event_decisions!.push({
        event_id: RS_GOALS_ID,
        event_title: RS_GOALS.title ?? RS_GOALS_ID,
        turn_fired: 1,
        response_options: RS_GOALS.response_options!,
        faction: 'RS',
        requires_player_response: true,
    } as any);
    resolveEventDecisionCore(state, RS_GOALS_ID, 'all_six');
    expect(state.military.enabled_event_ids ?? []).not.toContain(RS_CARD_ID);
    expect(state.military.event_flags?.rs_strategic_goals).toBe('all_six');
    return state;
}

function cardDecision(state: GameState) {
    return (state.military.event_decision_log ?? []).find((entry) => entry.event_id === RS_CARD_ID);
}

const noRng = () => 0;

describe('§6 D1 stage 2 A1: Observer\'s automatic card answer keeps the human\'s in-person Always deny', () => {
    it('fire-time: the card fires at Observer and is answered automatically; the order stays Always deny and the gate denies', () => {
        const state = inPersonDenyBeforeTheCard();
        expect(state.meta.turn).toBe(1);
        state.meta.autonomy_level = 3;

        evaluateEvents(state, noRng, 1, [RS_CARD] as EventDefinition[]);
        // The card did fire and Observer answered it automatically with the in-person order (F1-B).
        expect(cardDecision(state)).toMatchObject({ response_id: 'always_deny', decision_source: 'bot_ai_default', faction: 'RS' });

        expect(state.paramilitary_policy).toBe('always_deny');
        expect(resolveNonManualParamilitaryPolicy(state, 'RS', CATALOG)).toBe('always_deny');
        expect(rsOutcome(state)).toEqual([0, 0]);
    });

    it('drain: the card fired at Full Control and waited; Observer drains it; the order stays Always deny and the gate denies', () => {
        const state = inPersonDenyBeforeTheCard();
        expect(state.meta.turn).toBe(1);
        evaluateEvents(state, noRng, 1, [RS_CARD] as EventDefinition[]);
        expect((state.military.pending_event_decisions ?? []).map((pending) => pending.event_id)).toEqual([RS_CARD_ID]);
        expect(cardDecision(state)).toBeUndefined();

        state.meta.turn = 2;
        state.meta.autonomy_level = 3;
        evaluateEvents(state, noRng, 2, [RS_CARD] as EventDefinition[]);
        expect(state.military.pending_event_decisions ?? []).toEqual([]);
        expect(cardDecision(state)).toMatchObject({ response_id: 'always_deny', decision_source: 'bot_ai_default', faction: 'RS' });

        expect(state.paramilitary_policy).toBe('always_deny');
        expect(resolveNonManualParamilitaryPolicy(state, 'RS', CATALOG)).toBe('always_deny');
        expect(rsOutcome(state)).toEqual([0, 0]);
    });

    it('control: with no in-person order, Observer\'s automatic answer still writes the historical Always allow and the side sweeps', () => {
        const state = rsHumanState();
        state.military.fired_event_ids.push(RS_GOALS_ID);
        state.military.pending_event_decisions!.push({
            event_id: RS_GOALS_ID,
            event_title: RS_GOALS.title ?? RS_GOALS_ID,
            turn_fired: 1,
            response_options: RS_GOALS.response_options!,
            faction: 'RS',
            requires_player_response: true,
        } as any);
        resolveEventDecisionCore(state, RS_GOALS_ID, 'all_six');
        state.meta.autonomy_level = 3;
        evaluateEvents(state, noRng, 1, [RS_CARD] as EventDefinition[]);
        expect(cardDecision(state)).toMatchObject({ response_id: 'always_allow', decision_source: 'bot_ai_default' });
        expect(state.paramilitary_policy).toBe('always_allow');
        expect(rsOutcome(state)).toEqual([1, 0]);
    });

    it('live desktop path: the card fires at t1 and waits on the manual desk; modal Always deny at t1 (on an older build\'s request), goals answered in person, Observer; the card is drained at t2 with the Always deny and no RS sweep follows', async () => {
        const opening = (await startNewCampaign(process.cwd(), 'RS', 'apr_1992', 'historical')).state;
        opening.meta.autonomy_level = 0;
        expect(opening.paramilitary_policy).toBe('ask');
        const t1 = await advanceTurn(opening, process.cwd());
        expect(t1.error).toBeUndefined();
        expect(t1.state.meta.turn).toBe(1);
        // §6 T3: no request reaches the manual RS player before the RS card applies.
        expect((t1.state.pending_paramilitary_requests ?? []).filter((request) => request.faction === 'RS')).toEqual([]);
        // Round 4a (b): the card fired at t1 and waits, unanswered, on the manual desk; nothing was sent in the side's name.
        expect(t1.state.military.event_last_fired_turn?.[RS_CARD_ID]).toBe(1);
        expect((t1.state.military.pending_event_decisions ?? []).map((pending) => pending.event_id)).toContain(RS_CARD_ID);
        expect(cardDecision(t1.state)).toBeUndefined();
        expect((t1.state.political.control_events ?? [])
            .filter((event) => event.mechanism === 'paramilitary' && event.to === 'RS')).toEqual([]);
        restoreLegacyRequest(t1.state);

        modalAlwaysDeny(t1.state);
        const answered = resolveDesktopEventDecision(t1.state, RS_GOALS_ID, 'all_six', process.cwd());
        expect(answered.military.enabled_event_ids ?? []).not.toContain(RS_CARD_ID);
        answered.meta.autonomy_level = 3;

        const t2 = await advanceTurn(answered, process.cwd());
        expect(t2.error).toBeUndefined();
        expect(t2.state.meta.turn).toBe(2);
        expect(cardDecision(t2.state)).toMatchObject({ response_id: 'always_deny', decision_source: 'bot_ai_default', faction: 'RS' });
        expect(t2.state.military.event_flags?.rs_paramilitary_refused).toBe(true);
        expect(t2.state.military.event_flags).not.toHaveProperty('rs_paramilitary_authorized');
        expect(t2.state.paramilitary_policy).toBe('always_deny');
        expect(resolveNonManualParamilitaryPolicy(t2.state, 'RS', CATALOG)).toBe('always_deny');
        const rsSweeps = (t2.state.political.control_events ?? [])
            .filter((event) => event.mechanism === 'paramilitary' && event.to === 'RS');
        expect(rsSweeps).toEqual([]);
        const rsParamilitaries = Object.values(t2.state.military.formations ?? {})
            .filter((formation) => formation.faction === 'RS' && formation.kind === 'paramilitary');
        expect(rsParamilitaries).toEqual([]);
    }, 240_000);
});
