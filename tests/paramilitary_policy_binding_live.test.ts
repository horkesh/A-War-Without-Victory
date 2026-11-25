/**
 * §6 D1 stage 2 on the live desktop campaign path (ruling §1/§9 with round-2 amendment A1).
 *
 * A human-controlled faction's staff follow the human's current standing order at Assisted,
 * Delegated and Observer. Unanswered or `ask` sends no sweep; nothing is sent before the human
 * answers; Always allow sends sweeps and each one counts against the side. At Observer the card's
 * automatic answer writes the order on its fire turn, so the side sweeps from then on and is charged.
 */

import { describe, expect, it } from 'vitest';

import {
    advanceTurn,
    deserializeState,
    resolveDesktopEventDecision,
    serializeState,
    startNewCampaign,
} from '../src/desktop/desktop_sim.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { currentCondemnationFlags } from '../src/sim/negotiation/scoring.js';
import type { FactionId, GameState } from '../src/state/game_state.js';

const RBIH_CARD = 'rbih_paramilitary_policy_1992';
const RS_CARD = 'rs_paramilitary_policy_1992';
const EVENT_DEFINITIONS = loadEventDefinitions(0);

async function rbihPolicyPending(): Promise<GameState> {
    const opening = (await startNewCampaign(process.cwd(), 'RBiH', 'apr_1992', 'historical')).state;
    return resolveDesktopEventDecision(opening, 'rbih_state_identity', 'civic', process.cwd());
}

function paramilitaryCaptures(state: GameState, faction: FactionId, turn?: number): string[] {
    return (state.political.control_events ?? [])
        .filter((event) => event.mechanism === 'paramilitary' && event.to === faction && (turn === undefined || event.turn === turn))
        .map((event) => event.settlement_id)
        .sort();
}

function paramilitaryFormations(state: GameState, faction: FactionId): string[] {
    return Object.entries(state.military.formations ?? {})
        .filter(([, formation]) => formation.faction === faction && formation.kind === 'paramilitary')
        .map(([id]) => id)
        .sort();
}

function standing(state: GameState): number {
    return state.military.negotiation?.strategic_dimensions?.RBiH?.international_standing?.effective_value ?? 0;
}

/** The event-driven part of RBiH's international standing: where a card answer's dimension shift lands. */
function standingModifier(state: GameState): number {
    return state.military.negotiation?.strategic_dimensions?.RBiH?.international_standing?.event_modifier ?? 0;
}

describe('§6 D1 stage 2 live: staff follow the standing order', () => {
    for (const autonomy of [1, 2, 3] as const) {
        for (const responseId of ['always_deny', 'ask'] as const) {
            it(`RBiH staff at autonomy ${autonomy} under ${responseId}: no sweep, no request, no booked act after the first Advance`, async () => {
                const pending = await rbihPolicyPending();
                pending.meta.autonomy_level = autonomy;
                const resolved = resolveDesktopEventDecision(pending, RBIH_CARD, responseId, process.cwd());
                const advanced = await advanceTurn(resolved, process.cwd());
                expect(advanced.error).toBeUndefined();
                expect(advanced.state.meta.turn).toBe(1);
                expect(paramilitaryCaptures(advanced.state, 'RBiH')).toEqual([]);
                expect(paramilitaryFormations(advanced.state, 'RBiH')).toEqual([]);
                expect((advanced.state.pending_paramilitary_requests ?? []).filter((request) => request.faction === 'RBiH')).toEqual([]);
                expect(advanced.state.military.negotiation?.capital?.RBiH?.war_crimes_events_emergent ?? 0).toBe(0);
            }, 120_000);
        }
    }

    it('positive control: Always allow at Delegated sends nothing before the card applies at t4, then sends the sweeps and books each act against RBiH', async () => {
        // §6 T: the answer given at t0 is filed, and the card applies it at t4 (the no-player turn). Before that it has
        // no effect (§6 T+M condition, D1's own proof): no sweep at t1-t3.
        const pending = await rbihPolicyPending();
        pending.meta.autonomy_level = 2;
        let state = resolveDesktopEventDecision(pending, RBIH_CARD, 'always_allow', process.cwd());
        for (let turn = 1; turn <= 4; turn += 1) {
            const advanced = await advanceTurn(state, process.cwd());
            expect(advanced.error).toBeUndefined();
            state = advanced.state;
            if (turn < 4) expect(paramilitaryCaptures(state, 'RBiH'), `t${turn}`).toEqual([]);
        }
        expect(state.military.event_last_fired_turn[RBIH_CARD]).toBe(4);
        const swept = paramilitaryCaptures(state, 'RBiH', 4);
        expect(swept.length).toBeGreaterThan(0);
        expect(paramilitaryCaptures(state, 'RBiH')).toEqual(swept);
        expect(state.military.negotiation?.capital?.RBiH?.war_crimes_events_emergent ?? 0).toBe(swept.length);
        expect(currentCondemnationFlags(state, 'RBiH')).toContain('authorized_cleansing_condemnation');
    }, 300_000);

    it('verdict: Refuse at Delegated has no effect before it applies at t4, then keeps its +5 standing, books no act, and RBiH is not condemned', async () => {
        const pending = await rbihPolicyPending();
        pending.meta.autonomy_level = 2;
        const twin = deserializeState(serializeState(pending));
        const refused = resolveDesktopEventDecision(pending, RBIH_CARD, 'always_deny', process.cwd());
        // Filed at t0: no effect yet (§6 T2).
        expect(standing(refused)).toBe(standing(twin));
        // A twin campaign filed Review (ask): the two differ only in the card answer, which applies at t4.
        const review = resolveDesktopEventDecision(twin, RBIH_CARD, 'ask', process.cwd());
        let refuseState = refused;
        let reviewState = review;
        for (let turn = 1; turn <= 4; turn += 1) {
            const a = await advanceTurn(refuseState, process.cwd());
            const b = await advanceTurn(reviewState, process.cwd());
            expect(a.error).toBeUndefined();
            expect(b.error).toBeUndefined();
            refuseState = a.state;
            reviewState = b.state;
            if (turn < 4) expect(standingModifier(refuseState), `t${turn}`).toBe(standingModifier(reviewState));
        }
        const options = EVENT_DEFINITIONS.find((def) => def.id === RBIH_CARD)?.response_options ?? [];
        const shift = (id: string) => (options.find((option) => option.id === id)?.dimension_shifts ?? [])
            .filter((entry) => entry.faction === 'RBiH' && entry.dimension === 'international_standing')
            .reduce((sum, entry) => sum + entry.delta, 0);
        expect(shift('always_deny')).toBe(5);
        expect(standingModifier(refuseState) - standingModifier(reviewState)).toBe(shift('always_deny') - shift('ask'));
        expect(paramilitaryCaptures(refuseState, 'RBiH')).toEqual([]);
        expect(refuseState.military.negotiation?.capital?.RBiH?.war_crimes_events_emergent ?? 0).toBe(0);
        expect(currentCondemnationFlags(refuseState, 'RBiH')).not.toContain('authorized_cleansing_condemnation');
    }, 400_000);

    // Round 4a (b), 2026-11-22: the RS card fires at t1 (after the goals card, not gated on it; it was t2, enabled by the goals
    // answer). At Observer its automatic answer applies at t1, in the event phase, before paramilitary-detect, so the side's t1
    // sweeps go out under an answered order. A1 still holds: before the card applies (birth, t0) nothing has been sent and the
    // order is unanswered; nothing is sent at t1 without the card's row.
    it('RS at Observer from the start: nothing before the card; the card is answered automatically at t1, and every t1 sweep is sent under it, charged', async () => {
        const opening = (await startNewCampaign(process.cwd(), 'RS', 'apr_1992', 'historical')).state;
        opening.meta.autonomy_level = 3;
        expect(opening.paramilitary_policy).toBe('ask');
        expect(paramilitaryCaptures(opening, 'RS')).toEqual([]);
        expect(paramilitaryFormations(opening, 'RS')).toEqual([]);
        expect((opening.military.event_decision_log ?? []).some((entry) => entry.event_id === RS_CARD)).toBe(false);
        const t1 = await advanceTurn(opening, process.cwd());
        expect(t1.error).toBeUndefined();
        expect(t1.state.meta.turn).toBe(1);
        const decision = (t1.state.military.event_decision_log ?? []).find((entry) => entry.event_id === RS_CARD);
        expect(decision).toMatchObject({ response_id: 'always_allow', decision_source: 'bot_ai_default', faction: 'RS', turn: 1 });
        expect(t1.state.paramilitary_policy).toBe('always_allow');
        const swept = paramilitaryCaptures(t1.state, 'RS', 1);
        expect(swept.length).toBeGreaterThan(0);
        expect(t1.state.military.negotiation?.capital?.RS?.war_crimes_events_emergent ?? 0).toBe(swept.length);
    }, 120_000);

    it('RS at Observer, goals answered in person at birth: the card\'s automatic historical answer at t1 writes Always allow, and the side sweeps from t1, charged', async () => {
        // The strategic-goals card is answered in person (it no longer enables the policy card); then Observer.
        const opening = resolveDesktopEventDecision(
            (await startNewCampaign(process.cwd(), 'RS', 'apr_1992', 'historical')).state,
            'rs_strategic_goals',
            'all_six',
            process.cwd(),
        );
        expect(opening.military.enabled_event_ids ?? []).not.toContain(RS_CARD);
        opening.meta.autonomy_level = 3;
        expect(opening.paramilitary_policy).toBe('ask');
        expect(paramilitaryCaptures(opening, 'RS')).toEqual([]);
        expect(paramilitaryFormations(opening, 'RS')).toEqual([]);

        const t1 = await advanceTurn(opening, process.cwd());
        expect(t1.error).toBeUndefined();
        expect(t1.state.meta.turn).toBe(1);
        const decision = (t1.state.military.event_decision_log ?? []).find((entry) => entry.event_id === RS_CARD);
        expect(decision).toMatchObject({ response_id: 'always_allow', faction: 'RS', turn: 1 });
        expect(t1.state.paramilitary_policy).toBe('always_allow');
        // Acts are charged: whatever the side's forces sweep under the automatically answered order counts against RS.
        const swept = paramilitaryCaptures(t1.state, 'RS', 1);
        expect(swept.length).toBeGreaterThan(0);
        expect(t1.state.military.negotiation?.capital?.RS?.war_crimes_events_emergent ?? 0).toBe(swept.length);
    }, 180_000);

    it('an Observer -> Delegated toggle: the card left unanswered is answered by silence in its fire turn and the staff follow it', async () => {
        const opening = resolveDesktopEventDecision(
            (await startNewCampaign(process.cwd(), 'RS', 'apr_1992', 'historical')).state,
            'rs_strategic_goals',
            'all_six',
            process.cwd(),
        );
        opening.meta.autonomy_level = 3;
        // The toggle comes before the card fires: since round 4a (b) the card fires at t1, so the human leaves Observer at
        // birth (an Observer t1 would answer it automatically, as the tests above pin).
        opening.meta.autonomy_level = 2;
        const t1 = await advanceTurn(opening, process.cwd());
        expect(t1.error).toBeUndefined();
        expect(t1.state.meta.turn).toBe(1);
        // Player-override model (§6 HOW ruling lane C s8, 2026-11-25; was: the card waited and the staff sent none): the RS
        // card fired at t1 and, left unanswered, was answered by the staff in that turn with the bot's choice (the card's
        // historical Always allow), with a "staff proceeded" receipt; the staff then follow it, as the RS bot does.
        expect(t1.state.military.event_last_fired_turn?.[RS_CARD]).toBe(1);
        expect((t1.state.military.pending_event_decisions ?? []).map((decision) => decision.event_id)).not.toContain(RS_CARD);
        expect((t1.state.military.event_decision_log ?? []).filter((entry) => entry.event_id === RS_CARD)
            .map((entry) => [entry.response_id, entry.decision_source, entry.turn])).toEqual([['always_allow', 'bot_ai_default', 1]]);
        expect((t1.state.meta.proposal_decision_history ?? []).some((row) =>
            row.id === `EVENT_SILENCE_${RS_CARD}` && row.resolved_by === 'silence')).toBe(true);
        expect(t1.state.paramilitary_policy).toBe('always_allow');
        const t2 = await advanceTurn(t1.state, process.cwd());
        expect(t2.error).toBeUndefined();
        expect(t2.state.meta.turn).toBe(2);
        expect((t2.state.military.event_decision_log ?? []).filter((entry) => entry.event_id === RS_CARD)).toHaveLength(1);
        expect(t2.state.paramilitary_policy).toBe('always_allow');
    }, 180_000);
});
