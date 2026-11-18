/**
 * §6 D1 stage 2 on the live desktop campaign path (ruling §1/§9 with round-2 amendment A1).
 *
 * A human-controlled faction's staff follow the human's current standing order at Assisted,
 * Delegated and Observer. Unanswered or `ask` sends no sweep; nothing is sent before the human
 * answers; Always allow sends sweeps and each one counts against the side. At Observer the card's
 * automatic answer writes the order on its fire turn, so the side sweeps from then on and is charged.
 */

import { describe, expect, it } from 'vitest';

import { advanceTurn, resolveDesktopEventDecision, startNewCampaign } from '../src/desktop/desktop_sim.js';
import { currentCondemnationFlags } from '../src/sim/negotiation/scoring.js';
import type { FactionId, GameState } from '../src/state/game_state.js';

const RBIH_CARD = 'rbih_paramilitary_policy_1992';
const RS_CARD = 'rs_paramilitary_policy_1992';
const RBIH_EXPECTED_TARGETS = ['op:brcko:bukvik_gornji_2', 'op:srebrenica:obadi'];

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

    it('positive control: Always allow at Delegated sends the sweeps and books each act against RBiH', async () => {
        const pending = await rbihPolicyPending();
        pending.meta.autonomy_level = 2;
        const resolved = resolveDesktopEventDecision(pending, RBIH_CARD, 'always_allow', process.cwd());
        const advanced = await advanceTurn(resolved, process.cwd());
        expect(advanced.error).toBeUndefined();
        expect(paramilitaryCaptures(advanced.state, 'RBiH')).toEqual(RBIH_EXPECTED_TARGETS);
        expect(advanced.state.military.negotiation?.capital?.RBiH?.war_crimes_events_emergent ?? 0).toBe(2);
        expect(currentCondemnationFlags(advanced.state, 'RBiH')).toContain('authorized_cleansing_condemnation');
    }, 120_000);

    it('verdict: Refuse at Delegated keeps its +5 standing, books no act, and RBiH is not condemned', async () => {
        const pending = await rbihPolicyPending();
        pending.meta.autonomy_level = 2;
        const resolved = resolveDesktopEventDecision(pending, RBIH_CARD, 'always_deny', process.cwd());
        expect(standing(resolved) - standing(pending)).toBe(5);
        const advanced = await advanceTurn(resolved, process.cwd());
        expect(advanced.error).toBeUndefined();
        expect(paramilitaryCaptures(advanced.state, 'RBiH')).toEqual([]);
        expect(advanced.state.military.negotiation?.capital?.RBiH?.war_crimes_events_emergent ?? 0).toBe(0);
        expect(currentCondemnationFlags(advanced.state, 'RBiH')).not.toContain('authorized_cleansing_condemnation');
        expect(standing(advanced.state)).toBeGreaterThanOrEqual(standing(resolved));
    }, 120_000);

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
