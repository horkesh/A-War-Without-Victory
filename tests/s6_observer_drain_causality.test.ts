/**
 * §6 (owner rule 2026-11-22, "staff applies the headless historical default"): the Observer pending-decision drain must apply
 * a chosen response exactly as every other entry point does. Before this fix the drain (evaluate_events.ts, the OBSERVER
 * SWEEP) applied effects, flags, shifts and the log row, but not the response's runtime causality (`enables_events_runtime`
 * / `closes_events_runtime`) nor `notifications_to_other_factions`. Measured on RS: goals answered by the drain opened 0 of
 * its 12 follow-ups.
 *
 * T1: the RS goals card left pending at L0-2 and drained at Observer writes its enables, its close, the causality rows and
 *     the notifications, and leaves the desk empty.
 * T2: drain and in-person resolution of the same authored default give the same state, except decision provenance.
 * T3: drain and fire-time Observer resolution give the same enable, close and notification sets.
 * T5: guards: headless never drains; an unfired birth card is not drained (it resolves once, at fire time).
 *
 * Synthetic minimal states; the real catalog definitions. Deterministic: no Math.random(), no wall clock.
 */

import { describe, expect, it } from 'vitest';

import type { FactionId, FactionState, GameState } from '../src/state/game_state.js';
import type { EventDefinition, PendingEventDecision } from '../src/sim/events/event_types.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import { resolveEventDecisionCore } from '../src/sim/events/resolve_decision_core.js';

const CATALOG = loadEventDefinitions(0);
const noRng = () => 0;

function def(id: string): EventDefinition {
    const found = CATALOG.find((entry) => entry.id === id);
    if (!found) throw new Error(`catalog has no ${id}`);
    return found;
}

const RS_GOALS = 'rs_strategic_goals';
const GOALS_FOLLOW_UPS = [
    'belgrade_embargo_rs_1994',
    'deliberate_force_rs_compliance_1995',
    'holbrooke_us_belgrade_channel_1995',
    'karadzic_mladic_split_1995',
    'rs_assembly_rejects_voplan_1993',
    'rs_autonomy_path_decision_1993',
    'rs_belgrade_pressure_response_1993',
    'rs_contact_group_response_1994',
    'rs_dayton_acceptance_1995',
    'rs_owen_stoltenberg_response_1993',
    'rs_washington_rejection_1994',
    'un_hostage_crisis_1995',
];

function baseState(playerFaction: FactionId | null, turn: number, autonomy: number | undefined): GameState {
    const meta: Record<string, unknown> = {
        turn, phase: 'war', schema_version: 1, seed: 's6-observer-drain', headless_scenario_auto_control: false,
    };
    if (playerFaction !== null) meta.player_faction = playerFaction;
    if (autonomy !== undefined) meta.autonomy_level = autonomy;
    return {
        meta: meta as unknown as GameState['meta'],
        factions: [{ id: 'HRHB' } as FactionState, { id: 'RBiH' } as FactionState, { id: 'RS' } as FactionState],
        military: {
            formations: {},
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']),
            fired_event_ids: [],
            event_flags: {},
            enabled_event_ids: [],
            pending_event_decisions: [],
            negotiation: { strategic_dimensions: initializeStrategicDimensions() },
        } as any,
        political: { political_controllers: {}, municipalities: {} } as any,
    } as unknown as GameState;
}

/** Pressure events fire only once ready (pressure_system.ts); the turn pipeline accumulates it, these tests set it. */
function readyToFire(state: GameState, eventId: string): GameState {
    state.military.event_readiness = { ...(state.military.event_readiness ?? {}), [eventId]: 100 };
    return state;
}

const clone = (state: GameState): GameState => JSON.parse(JSON.stringify(state)) as GameState;

/** A card that fired at `firedTurn` for the player and was left on the desk (as the L0-2 branch queues it). */
function withFiredPendingCard(state: GameState, card: EventDefinition, firedTurn: number): GameState {
    const military = state.military;
    military.fired_event_ids = [...(military.fired_event_ids ?? []), card.id];
    military.event_fire_counts = { ...(military.event_fire_counts ?? {}), [card.id]: 1 };
    military.event_last_fired_turn = { ...(military.event_last_fired_turn ?? {}), [card.id]: firedTurn };
    const pending: PendingEventDecision = {
        event_id: card.id,
        event_title: card.id,
        turn_fired: firedTurn,
        response_options: card.response_options!,
        faction: card.responding_faction as FactionId,
        requires_player_response: card.requires_player_response,
        ...(card.historical_default_response_id ? { historical_default_response_id: card.historical_default_response_id } : {}),
        ...(card.notifications_to_other_factions ? { notifications_to_other_factions: card.notifications_to_other_factions } : {}),
    } as PendingEventDecision;
    military.pending_event_decisions = [...(military.pending_event_decisions ?? []), pending];
    return state;
}

/** Drain arm: raise autonomy to Observer and run evaluate-events (the card itself is already fired, so only the drain acts). */
function drain(state: GameState, turn: number, card: EventDefinition): GameState {
    state.meta.turn = turn;
    state.meta.autonomy_level = 3;
    evaluateEvents(state, noRng, turn, [card]);
    return state;
}

/** The response-level state a chosen answer writes, minus provenance. */
function responseState(state: GameState) {
    const military = state.military;
    return {
        enabled: military.enabled_event_ids ?? [],
        closed: military.closed_event_ids ?? [],
        causality: military.event_causality_log ?? [],
        notifications: military.pending_event_notifications ?? [],
        flags: military.event_flags ?? {},
        dimensions: military.negotiation?.strategic_dimensions,
        paramilitaryPolicy: state.paramilitary_policy,
        formations: military.formations,
        pending: (military.pending_event_decisions ?? []).map((pending) => pending.event_id),
        decisions: (military.event_decision_log ?? []).map(({ decision_source: _source, ...rest }) => rest),
    };
}

describe('§6 Observer drain applies runtime causality and notifications (T1)', () => {
    it('RS goals left pending at L0-2, drained at Observer the next turn: 12 enables, the Drina close, 13 causality rows, notifications, desk empty', () => {
        const goals = def(RS_GOALS);
        // Fired at L0 at t1 through the real fire branch, left unanswered on the desk.
        const state = readyToFire(baseState('RS', 1, 0), RS_GOALS);
        evaluateEvents(state, noRng, 1, [goals]);
        expect((state.military.pending_event_decisions ?? []).map((pending) => pending.event_id)).toEqual([RS_GOALS]);
        expect(state.military.enabled_event_ids ?? []).toEqual([]);

        drain(state, 2, goals);

        const military = state.military;
        for (const id of GOALS_FOLLOW_UPS) expect(military.enabled_event_ids).toContain(id);
        expect(military.closed_event_ids ?? []).toContain('csq_drina_partisan_resistance_1992');
        const rows = (military.event_causality_log ?? []).filter((row) => row.from_event === RS_GOALS);
        expect(rows).toHaveLength(13);
        for (const row of rows) expect(row).toMatchObject({ source_response_id: 'all_six', turn: 2 });
        const notifications = (military.pending_event_notifications ?? []).filter((row) => row.event_id === RS_GOALS);
        expect(notifications.length).toBeGreaterThan(0);
        for (const row of notifications) expect(row).toMatchObject({ source_faction: 'RS', response_id: 'all_six', surfaced_on_turn: 3 });
        expect((military.event_decision_log ?? []).filter((row) => row.event_id === RS_GOALS)
            .map((row) => [row.response_id, row.decision_source, row.turn])).toEqual([['all_six', 'bot_ai_default', 2]]);
        expect(military.pending_event_decisions ?? []).toEqual([]);
    });
});

describe('§6 Observer drain = in-person answer of the same option (T2)', () => {
    const CASES: { id: string; faction: FactionId; firedTurn: number; prepare?: (state: GameState) => void }[] = [
        { id: 'rs_strategic_goals', faction: 'RS', firedTurn: 1 },
        { id: 'rbih_state_identity', faction: 'RBiH', firedTurn: 3 },
        { id: 'hrhb_political_goal', faction: 'HRHB', firedTurn: 4 },
        {
            id: 'hrhb_1992_graz_cooperation_collapse', faction: 'HRHB', firedTurn: 5,
            prepare: (state) => { state.military.event_flags = { hrhb_political_goal: 'croat_republic' }; },
        },
        { id: 'concentration_camps_revealed_1992', faction: 'RS', firedTurn: 17 },
    ];

    for (const testCase of CASES) {
        it(`${testCase.id}: drained at Observer and answered in person with the authored default write the same response state`, () => {
            const card = def(testCase.id);
            const defaultId = card.historical_default_response_id!;
            const base = baseState(testCase.faction, testCase.firedTurn, 0);
            testCase.prepare?.(base);
            withFiredPendingCard(base, card, testCase.firedTurn);
            const answerTurn = testCase.firedTurn + 1;

            const drained = drain(clone(base), answerTurn, card);

            const inPerson = clone(base);
            inPerson.meta.turn = answerTurn;
            resolveEventDecisionCore(inPerson, testCase.id, defaultId);

            expect(responseState(drained)).toEqual(responseState(inPerson));
            // Provenance is the only difference.
            const sourceOf = (state: GameState) => (state.military.event_decision_log ?? [])
                .filter((row) => row.event_id === testCase.id).map((row) => row.decision_source);
            expect(sourceOf(drained)).toEqual(['bot_ai_default']);
            expect(sourceOf(inPerson)).toEqual(['player']);
            // Not vacuous: the authored answer writes notifications (and, for the opening cards, enables).
            expect((drained.military.pending_event_notifications ?? []).length).toBeGreaterThan(0);
            const authored = card.response_options!.find((option) => option.id === defaultId)!;
            if ((authored.enables_events_runtime ?? []).length > 0) {
                expect((drained.military.enabled_event_ids ?? []).length).toBeGreaterThan(0);
            }
        });
    }
});

describe('§6 Observer drain = fire-time Observer answer (T3)', () => {
    it('RS goals: fired at L3 vs fired at L2 and drained at L3 the next turn write the same enables, closes and notifications', () => {
        const goals = def(RS_GOALS);

        const fireTime = readyToFire(baseState('RS', 1, 3), RS_GOALS);
        evaluateEvents(fireTime, noRng, 1, [goals]);

        const drained = readyToFire(baseState('RS', 1, 2), RS_GOALS);
        evaluateEvents(drained, noRng, 1, [goals]);
        expect((drained.military.pending_event_decisions ?? []).map((pending) => pending.event_id)).toEqual([RS_GOALS]);
        drain(drained, 2, goals);

        const sets = (state: GameState) => ({
            enabled: state.military.enabled_event_ids ?? [],
            closed: state.military.closed_event_ids ?? [],
            causality: (state.military.event_causality_log ?? []).map(({ turn: _turn, ...rest }) => rest),
            notifications: (state.military.pending_event_notifications ?? []).map(({ surfaced_on_turn: _turn, ...rest }) => rest),
            decisions: (state.military.event_decision_log ?? []).map(({ turn: _turn, ...rest }) => rest),
            pending: state.military.pending_event_decisions ?? [],
        });
        expect(sets(drained)).toEqual(sets(fireTime));
        expect(sets(fireTime).enabled.length).toBeGreaterThanOrEqual(GOALS_FOLLOW_UPS.length);
    });
});

describe('§6 Observer drain guards (T5)', () => {
    it('headless (no player faction, no autonomy level) never drains a pending authored decision', () => {
        const goals = def(RS_GOALS);
        const state = withFiredPendingCard(baseState(null, 2, undefined), goals, 1);
        const before = clone(state);
        evaluateEvents(state, noRng, 2, [goals]);
        expect(state.military.pending_event_decisions).toEqual(before.military.pending_event_decisions);
        expect(state.military.enabled_event_ids ?? []).toEqual([]);
        expect(state.military.event_decision_log ?? []).toEqual([]);
    });

    it('an unfired birth card at Observer is skipped by the drain and resolved once, at fire time, with its causality', () => {
        const goals = def(RS_GOALS);
        const state = readyToFire(baseState('RS', 1, 3), RS_GOALS);
        // The birth card, queued without firing the event (answer ahead of firing).
        state.military.pending_event_decisions = [{
            event_id: RS_GOALS, event_title: RS_GOALS, turn_fired: 0, response_options: goals.response_options!,
            faction: 'RS', requires_player_response: goals.requires_player_response,
            historical_default_response_id: goals.historical_default_response_id,
            notifications_to_other_factions: goals.notifications_to_other_factions,
        } as PendingEventDecision];
        evaluateEvents(state, noRng, 1, [goals]);
        expect((state.military.event_decision_log ?? []).filter((row) => row.event_id === RS_GOALS)
            .map((row) => [row.response_id, row.decision_source, row.turn])).toEqual([['all_six', 'bot_ai_default', 1]]);
        expect(state.military.event_last_fired_turn?.[RS_GOALS]).toBe(1);
        for (const id of GOALS_FOLLOW_UPS) expect(state.military.enabled_event_ids).toContain(id);
        expect((state.military.event_causality_log ?? []).filter((row) => row.from_event === RS_GOALS)).toHaveLength(13);
        expect(state.military.pending_event_decisions ?? []).toEqual([]);
    });
});
