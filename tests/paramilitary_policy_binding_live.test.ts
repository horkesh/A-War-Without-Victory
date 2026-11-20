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

    it('RS at Observer from the start: no sweep at t1, the order is still unanswered', async () => {
        const opening = (await startNewCampaign(process.cwd(), 'RS', 'apr_1992', 'historical')).state;
        opening.meta.autonomy_level = 3;
        expect(opening.paramilitary_policy).toBe('ask');
        const t1 = await advanceTurn(opening, process.cwd());
        expect(t1.error).toBeUndefined();
        expect(t1.state.meta.turn).toBe(1);
        expect(t1.state.paramilitary_policy).toBe('ask');
        expect(paramilitaryCaptures(t1.state, 'RS')).toEqual([]);
        expect(paramilitaryFormations(t1.state, 'RS')).toEqual([]);
    }, 120_000);

    it('RS at Observer: no sweep at t1; the card\'s automatic historical answer at t2 writes Always allow, and the side sweeps from then on, charged', async () => {
        // The strategic-goals card is answered in person, so the policy card is enabled; then Observer.
        const opening = resolveDesktopEventDecision(
            (await startNewCampaign(process.cwd(), 'RS', 'apr_1992', 'historical')).state,
            'rs_strategic_goals',
            'all_six',
            process.cwd(),
        );
        opening.meta.autonomy_level = 3;
        expect(opening.paramilitary_policy).toBe('ask');
        const t1 = await advanceTurn(opening, process.cwd());
        expect(t1.error).toBeUndefined();
        expect(t1.state.meta.turn).toBe(1);
        expect(paramilitaryCaptures(t1.state, 'RS', 1)).toEqual([]);
        expect(paramilitaryFormations(t1.state, 'RS')).toEqual([]);

        const t2 = await advanceTurn(t1.state, process.cwd());
        expect(t2.error).toBeUndefined();
        expect(t2.state.meta.turn).toBe(2);
        const decision = (t2.state.military.event_decision_log ?? []).find((entry) => entry.event_id === RS_CARD);
        expect(decision).toMatchObject({ response_id: 'always_allow', faction: 'RS' });
        expect(t2.state.paramilitary_policy).toBe('always_allow');
        // Acts are charged: whatever the side's forces sweep under the automatically answered order counts against RS.
        const swept = paramilitaryCaptures(t2.state, 'RS', 2);
        expect(swept.length).toBeGreaterThan(0);
        expect(t2.state.military.negotiation?.capital?.RS?.war_crimes_events_emergent ?? 0).toBe(swept.length);
    }, 180_000);

    it('an Observer -> Delegated toggle sends no sweep before the card is answered', async () => {
        const opening = resolveDesktopEventDecision(
            (await startNewCampaign(process.cwd(), 'RS', 'apr_1992', 'historical')).state,
            'rs_strategic_goals',
            'all_six',
            process.cwd(),
        );
        opening.meta.autonomy_level = 3;
        const t1 = await advanceTurn(opening, process.cwd());
        expect(t1.error).toBeUndefined();
        expect(paramilitaryCaptures(t1.state, 'RS')).toEqual([]);
        t1.state.meta.autonomy_level = 2;
        const t2 = await advanceTurn(t1.state, process.cwd());
        expect(t2.error).toBeUndefined();
        expect(t2.state.meta.turn).toBe(2);
        // The RS card fired at t2 and waits for the human; until it is answered, the staff send none.
        expect((t2.state.military.pending_event_decisions ?? []).map((decision) => decision.event_id)).toContain(RS_CARD);
        expect((t2.state.military.event_decision_log ?? []).some((entry) => entry.event_id === RS_CARD)).toBe(false);
        expect(t2.state.paramilitary_policy).toBe('ask');
        expect(paramilitaryCaptures(t2.state, 'RS')).toEqual([]);
        expect(paramilitaryFormations(t2.state, 'RS')).toEqual([]);
    }, 180_000);
});
