/**
 * §6 design T1/T2 (signed 2026-11-19): the opening cards are answered at birth and applied on the bot's turn.
 *
 * T1: no opening foundational card is fired at campaign birth; its answer is filed and applied when the
 *     card fires in its authored window. Old saves that hold a card fired at birth keep the old timing.
 * T2: the RBiH paramilitary-policy card is still put to the player before the first Advance, keyed on
 *     the FILED identity answer, and its answer is FILED too; evaluate-events applies it when the card
 *     fires (t4). The old turn-0 lane stays for saves that already hold a fired t0 identity or a fired,
 *     pending t0 policy card. Lanes are chosen by save shape only.
 */

import { describe, expect, it } from 'vitest';

import { resolveDesktopEventDecision, serializeState } from '../src/desktop/desktop_sim.js';
import {
    filedIdentityOptionEnablesPolicy,
    preFiresOpeningDecisionAtBirth,
    resolvePlayerEventDecisionWithOpeningPolicy,
} from '../src/sim/events/opening_policy_transition.js';
import {
    ANSWER_AHEAD_EVENT_IDS,
    OPENING_FOUNDATIONAL_EVENT_IDS,
    isAnswerAheadOfFiringDecision,
} from '../src/sim/events/answer_ahead_of_firing.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { updateEventReadiness } from '../src/sim/events/pressure_system.js';
import type { GameState } from '../src/state/game_state.js';
import { resolveBrowserEventDecision } from '../src/ui/map/desktop/campaignRecruitmentActions.js';
import {
    EVENT_CATALOG,
    HRHB_GOAL,
    IDENTITY,
    RBIH_POLICY,
    RS_GOALS,
    asPreTBirthSave,
    cloneState,
    dimensions,
    eventDef,
    newCampaign,
} from './helpers/s6_opening_lane_fixtures.js';

const POLICY_OPTIONS = ['always_deny', 'ask', 'always_allow'] as const;

function answer(state: GameState, eventId: string, responseId: string): GameState {
    return resolveDesktopEventDecision(state, eventId, responseId, process.cwd());
}

function receipts(state: GameState, eventId: string) {
    return (state.military.event_decision_log ?? []).filter((row) => row.event_id === eventId);
}

function pendingIds(state: GameState): string[] {
    return (state.military.pending_event_decisions ?? []).map((decision) => decision.event_id);
}

function fired(state: GameState, eventId: string): boolean {
    return state.military.fired_event_ids.includes(eventId) || (state.military.event_fire_counts[eventId] ?? 0) > 0;
}

/** Run evaluate-events on the identity and policy cards only, turn by turn (the pressure/readiness path the engine runs). */
function runOpeningWindow(state: GameState, fromTurn: number, toTurn: number): void {
    const defs = [eventDef(IDENTITY), eventDef(RBIH_POLICY)];
    for (let turn = fromTurn; turn <= toTurn; turn += 1) {
        state.meta.turn = turn;
        updateEventReadiness(state, defs);
        evaluateEvents(state, () => 0.5, turn, defs);
    }
}

describe('T1: no opening card fires at birth', () => {
    it('preFiresOpeningDecisionAtBirth is false for all three opening cards', () => {
        for (const id of [IDENTITY, RS_GOALS, HRHB_GOAL]) {
            expect(preFiresOpeningDecisionAtBirth(eventDef(id), 0), id).toBe(false);
        }
    });

    it.each(['RBiH', 'RS', 'HRHB'] as const)('%s: the card is on the desk at birth, unfired, with nothing applied', async (faction) => {
        const state = await newCampaign(faction);
        const eventId = { RBiH: IDENTITY, RS: RS_GOALS, HRHB: HRHB_GOAL }[faction];
        expect(pendingIds(state)).toEqual([eventId]);
        expect(fired(state, eventId)).toBe(false);
        expect(state.military.event_last_fired_turn[eventId]).toBeUndefined();
        expect(state.military.event_flags?.[eventId]).toBeUndefined();
    });

    it('the policy card has its own answer-ahead entry, apart from the three foundational cards', () => {
        expect([...OPENING_FOUNDATIONAL_EVENT_IDS].sort()).toEqual([HRHB_GOAL, IDENTITY, RS_GOALS]);
        expect([...ANSWER_AHEAD_EVENT_IDS].sort()).toEqual([HRHB_GOAL, RBIH_POLICY, IDENTITY, RS_GOALS].sort());
        expect(OPENING_FOUNDATIONAL_EVENT_IDS).not.toContain(RBIH_POLICY);
    });

    it('RS: answering the goals card at birth only files it (old saves apply at once)', async () => {
        const state = await newCampaign('RS');
        const before = dimensions(state);
        const filed = answer(state, RS_GOALS, 'all_six');
        expect(receipts(filed, RS_GOALS)).toEqual([{ event_id: RS_GOALS, response_id: 'all_six', decision_source: 'player', faction: 'RS', turn: 0 }]);
        expect(filed.military.event_flags?.rs_strategic_goals).toBeUndefined();
        expect(filed.military.enabled_event_ids).not.toContain('rs_paramilitary_policy_1992');
        expect(dimensions(filed)).toEqual(before);

        const old = answer(asPreTBirthSave(state), RS_GOALS, 'all_six');
        expect(old.military.event_flags?.rs_strategic_goals).toBe('all_six');
        expect(old.military.enabled_event_ids).toContain('rs_paramilitary_policy_1992');
    });
});

describe('T2: the RBiH policy card is asked at t0, filed, and applied when it fires', () => {
    it('T2-a rbih_policy_filed_t0_inert_until_t4', async () => {
        const opening = await newCampaign('RBiH');
        const beforeDims = dimensions(opening);
        const beforePolicy = opening.paramilitary_policy;

        const identityFiled = answer(opening, IDENTITY, 'civic');
        expect(receipts(identityFiled, IDENTITY)).toEqual([{ event_id: IDENTITY, response_id: 'civic', decision_source: 'player', faction: 'RBiH', turn: 0 }]);
        expect(fired(identityFiled, IDENTITY)).toBe(false);
        expect(identityFiled.military.event_flags?.rbih_state_identity).toBeUndefined();
        // The lane puts the policy card on the desk, keyed on the filed identity: queued, not fired, not enabled.
        expect(pendingIds(identityFiled)).toEqual([RBIH_POLICY]);
        expect(identityFiled.military.pending_event_decisions![0]).toMatchObject({ event_id: RBIH_POLICY, faction: 'RBiH', turn_fired: 0, requires_player_response: true });
        expect(identityFiled.military.pending_event_decisions![0]!.response_options.map((option) => option.id)).toEqual([...POLICY_OPTIONS]);
        expect(fired(identityFiled, RBIH_POLICY)).toBe(false);
        expect(identityFiled.military.enabled_event_ids).not.toContain(RBIH_POLICY);
        expect(isAnswerAheadOfFiringDecision(identityFiled, RBIH_POLICY)).toBe(true);
        expect(identityFiled.paramilitary_policy).toBe(beforePolicy);
        expect(dimensions(identityFiled)).toEqual(beforeDims);

        for (const responseId of POLICY_OPTIONS) {
            const desktop = answer(identityFiled, RBIH_POLICY, responseId);
            const browser = cloneState(identityFiled);
            resolveBrowserEventDecision(browser, RBIH_POLICY, responseId, EVENT_CATALOG);
            expect(serializeState(browser), responseId).toBe(serializeState(desktop));

            expect(receipts(desktop, RBIH_POLICY)).toEqual([{ event_id: RBIH_POLICY, response_id: responseId, decision_source: 'player', faction: 'RBiH', turn: 0 }]);
            expect(pendingIds(desktop)).toEqual([]);
            expect(fired(desktop, RBIH_POLICY)).toBe(false);
            // Inert until it applies: no flag, no mirror, no shift, no modifier, no notification.
            for (const flag of ['rbih_paramilitary_policy', 'rbih_paramilitary_refused', 'rbih_paramilitary_authorized']) {
                expect(desktop.military.event_flags?.[flag], `${responseId}:${flag}`).toBeUndefined();
            }
            expect(desktop.paramilitary_policy).toBe(beforePolicy);
            expect(dimensions(desktop)).toEqual(beforeDims);
            expect(desktop.military.recruitment_modifiers ?? []).toEqual(opening.military.recruitment_modifiers ?? []);
            expect(desktop.military.bot_priority_shifts ?? []).toEqual(opening.military.bot_priority_shifts ?? []);
            expect((desktop.military.pending_event_notifications ?? []).filter((n) => n.event_id === RBIH_POLICY)).toEqual([]);
            expect(desktop.pending_paramilitary_requests ?? []).toEqual([]);
            const bytes = serializeState(desktop);
            expect(serializeState(cloneState(desktop))).toBe(bytes);
        }
    });

    it('applies the filed identity at its fire turn, then the filed policy at its own (identity first)', async () => {
        const filed = answer(answer(await newCampaign('RBiH'), IDENTITY, 'civic'), RBIH_POLICY, 'ask');
        runOpeningWindow(filed, 1, 4);
        expect(filed.military.event_last_fired_turn[IDENTITY]).toBe(3);
        expect(filed.military.event_last_fired_turn[RBIH_POLICY]).toBe(4);
        expect(filed.military.event_flags?.rbih_state_identity).toBe('civic');
        expect(filed.military.event_flags?.rbih_paramilitary_policy).toBe('ask');
        expect(filed.paramilitary_policy).toBe('ask');
        expect(pendingIds(filed)).toEqual([]);
        // Filed once each, never re-asked when the cards fired.
        expect(receipts(filed, IDENTITY).map((row) => [row.turn, row.decision_source])).toEqual([[0, 'player']]);
        expect(receipts(filed, RBIH_POLICY).map((row) => [row.turn, row.decision_source])).toEqual([[0, 'player']]);
    });

    it('T2-b opening_lanes_exclusive_by_save_shape', async () => {
        const opening = await newCampaign('RBiH');

        // (1) New build, identity unfired: the filing lane.
        const filing = answer(opening, IDENTITY, 'civic');
        expect(fired(filing, IDENTITY)).toBe(false);
        expect(fired(filing, RBIH_POLICY)).toBe(false);

        // (2) Pre-T t0 save with the identity fired at birth and pending: the old opening lane, applied at once,
        //     and the policy card FIRED at t0 as before.
        const preT = asPreTBirthSave(opening);
        const oldIdentity = answer(preT, IDENTITY, 'civic');
        expect(oldIdentity.military.event_flags?.rbih_state_identity).toBe('civic');
        expect(oldIdentity.military.event_last_fired_turn[RBIH_POLICY]).toBe(0);
        expect(oldIdentity.military.enabled_event_ids).toContain(RBIH_POLICY);
        expect(pendingIds(oldIdentity)).toEqual([RBIH_POLICY]);

        // (3) Pre-T t0 save with the policy card fired at t0 and pending: answered on the old lane, applied at once.
        const oldPolicy = answer(oldIdentity, RBIH_POLICY, 'always_deny');
        expect(oldPolicy.military.event_flags?.rbih_paramilitary_policy).toBe('always_deny');
        expect(oldPolicy.paramilitary_policy).toBe('always_deny');

        // (4) Legacy in-window lane: no birth card; the identity fires at t3 and is answered then, at once.
        const legacy = cloneState(opening);
        legacy.military.pending_event_decisions = [];
        runOpeningWindow(legacy, 1, 3);
        expect(legacy.military.pending_event_decisions?.map((d) => [d.event_id, d.turn_fired])).toEqual([[IDENTITY, 3]]);
        const legacyAnswered = answer(legacy, IDENTITY, 'civic');
        expect(legacyAnswered.military.event_flags?.rbih_state_identity).toBe('civic');
        expect(receipts(legacyAnswered, IDENTITY)[0]?.turn).toBe(3);
        expect(pendingIds(legacyAnswered)).toEqual([]);
        expect(fired(legacyAnswered, RBIH_POLICY)).toBe(false);
    });

    it('the filing lane refuses the policy card without exactly one filed player identity receipt', async () => {
        const filed = answer(await newCampaign('RBiH'), IDENTITY, 'civic');
        const forgeries: Array<[string, (state: GameState) => void]> = [
            ['no identity receipt', (state) => { state.military.event_decision_log = []; }],
            ['two identity receipts', (state) => { state.military.event_decision_log.push({ ...state.military.event_decision_log[0]! }); }],
            ['a bot identity receipt', (state) => { state.military.event_decision_log[0]!.decision_source = 'bot_ai_default'; }],
            ['a non-enabling identity answer', (state) => { state.military.event_decision_log[0]!.response_id = 'forged'; }],
            ['the card already enabled before the identity fired', (state) => { state.military.enabled_event_ids.push(RBIH_POLICY); }],
            ['a non-birth card', (state) => { state.military.pending_event_decisions![0]!.turn_fired = 2; }],
            ['headless marker', (state) => { state.meta.headless_scenario_auto_control = true; }],
            ['already filed', (state) => { state.military.event_decision_log.push({ event_id: RBIH_POLICY, response_id: 'ask', decision_source: 'player', faction: 'RBiH', turn: 0 }); }],
            ['forged effects', (state) => { state.military.pending_event_decisions![0]!.response_options[2]!.effects = []; }],
        ];
        for (const [label, forge] of forgeries) {
            const state = cloneState(filed);
            forge(state);
            const before = serializeState(state);
            expect(() => resolvePlayerEventDecisionWithOpeningPolicy(state, EVENT_CATALOG, RBIH_POLICY, 'always_deny'), label).toThrow();
            expect(serializeState(state), label).toBe(before);
        }
    });

    it('D1: the lane queues the card only when the filed identity option enables it and satisfies its trigger', () => {
        const identity = eventDef(IDENTITY);
        const policy = eventDef(RBIH_POLICY);
        for (const option of identity.response_options ?? []) {
            expect(filedIdentityOptionEnablesPolicy(option, policy), option.id).toBe(true);
        }
        const civic = identity.response_options!.find((option) => option.id === 'civic')!;
        expect(filedIdentityOptionEnablesPolicy({ ...civic, enables_events_runtime: [] }, policy)).toBe(false);
        expect(filedIdentityOptionEnablesPolicy({ ...civic, sets_flags: { ...civic.sets_flags, rbih_state_identity: 'unlisted' } }, policy)).toBe(false);
        expect(filedIdentityOptionEnablesPolicy(undefined, policy)).toBe(false);
    });

    it('D3: a birth card that outlives t0 stays answerable, before and after its card fires', async () => {
        const opening = await newCampaign('RBiH');

        // The identity card left on the desk past t0 still files (identity unfired), and still queues the policy.
        const lateIdentity = cloneState(opening);
        lateIdentity.meta.turn = 1;
        const lateFiled = answer(lateIdentity, IDENTITY, 'civic');
        expect(receipts(lateFiled, IDENTITY)[0]?.turn).toBe(1);
        expect(pendingIds(lateFiled)).toEqual([RBIH_POLICY]);

        // The policy card left on the desk files at t2 (its card unfired) ...
        const identityFiled = answer(opening, IDENTITY, 'civic');
        const t2 = cloneState(identityFiled);
        runOpeningWindow(t2, 1, 2);
        expect(fired(t2, IDENTITY)).toBe(false);
        expect(receipts(answer(t2, RBIH_POLICY, 'ask'), RBIH_POLICY)[0]).toMatchObject({ turn: 2, decision_source: 'player' });

        // ... and at t3, after the identity applied and enabled it, still unfired.
        const t3 = cloneState(identityFiled);
        runOpeningWindow(t3, 1, 3);
        expect(t3.military.enabled_event_ids).toContain(RBIH_POLICY);
        expect(fired(t3, RBIH_POLICY)).toBe(false);
        const t3Filed = answer(t3, RBIH_POLICY, 'ask');
        expect(t3Filed.military.event_flags?.rbih_paramilitary_policy).toBeUndefined();

        // Left pending through its t4 firing (harness defer): answered then, it applies at once on the legacy lane.
        const t4 = cloneState(identityFiled);
        runOpeningWindow(t4, 1, 4);
        expect(t4.military.event_last_fired_turn[RBIH_POLICY]).toBe(4);
        expect(pendingIds(t4)).toEqual([RBIH_POLICY]);
        expect(t4.military.pending_event_decisions![0]!.turn_fired).toBe(0);
        const t4Answered = answer(t4, RBIH_POLICY, 'always_deny');
        expect(t4Answered.military.event_flags?.rbih_paramilitary_policy).toBe('always_deny');
        expect(t4Answered.paramilitary_policy).toBe('always_deny');
        expect(receipts(t4Answered, RBIH_POLICY).map((row) => row.turn)).toEqual([4]);
    });

    it('a mid-lane new-build t0 save round-trips and resolves the same way', async () => {
        const identityFiled = answer(await newCampaign('RBiH'), IDENTITY, 'civic');
        const loaded = cloneState(identityFiled);
        expect(serializeState(loaded)).toBe(serializeState(identityFiled));
        for (const responseId of POLICY_OPTIONS) {
            expect(serializeState(answer(loaded, RBIH_POLICY, responseId)))
                .toBe(serializeState(answer(identityFiled, RBIH_POLICY, responseId)));
        }
    });
});
