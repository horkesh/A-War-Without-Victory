import { describe, expect, it } from 'vitest';

import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { triggerMatches, type EventDefinition } from '../src/sim/events/event_types.js';
import { resolveEventDecision } from '../src/sim/events/resolve_decision.js';
import { turnToCompletedWeekRange } from '../src/ui/map/utils/formatters.js';
import { HISTORICAL_EVENT_ANCHORS_APR1995 } from '../src/scenario/historical_anchors.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

const rejectRandomness = () => {
    throw new Error('event evaluator consumed RNG');
};

function minimalState(turn: number): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn,
            seed: 'event-calendar-chronology',
            phase: 'war',
            player_faction: 'RBiH',
        },
        military: {
            formations: {},
            fired_event_ids: [],
            general_supply_reserve: { RBiH: 10, RS: 10, HRHB: 10 },
        },
        political: {},
        factions: [],
        displacement: {},
    } as unknown as GameState;
}

function loadedEventById(id: string): EventDefinition {
    const event = loadEventDefinitions(0).find((definition) => definition.id === id);
    if (!event) throw new Error(`Missing loaded event ${id}`);
    return event;
}

describe('event calendar chronology', () => {
    const carter = loadedEventById('carter_ceasefire_1994');
    const coha = loadedEventById('coha_ceasefire_begins_1995');
    const expiry = loadedEventById('coha_expires_1995');
    const safeAreas = loadedEventById('un_safe_areas_declared_1993');

    it('ties the primary dates to the completed-week calendar', () => {
        expect(turnToCompletedWeekRange(141)).toBe('12-18 Dec 1994');
        expect(turnToCompletedWeekRange(142)).toBe('19-25 Dec 1994');
        expect(turnToCompletedWeekRange(143)).toBe('26 Dec 1994-1 Jan 1995');
        expect(turnToCompletedWeekRange(161)).toBe('1-7 May 1995');
        expect(turnToCompletedWeekRange(57)).toBe('3-9 May 1993');

        expect(carter.trigger).toMatchObject({ turn_min: 141, turn_max: 142 });
        expect(coha.trigger).toMatchObject({ turn_min: 143, turn_max: 143 });
        expect(expiry.trigger).toMatchObject({ turn_min: 161, turn_max: 161 });
        expect(safeAreas.trigger.turn_min).toBe(57);
    });

    it('cannot fire Carter at 140 but fires once at 141 and 142 with its effects and manual response', () => {
        expect(triggerMatches(carter, minimalState(140), 140)).toBe(false);

        for (const turn of [141, 142]) {
            const state = minimalState(turn);
            const result = evaluateEvents(state, rejectRandomness, turn, [carter]);

            expect(result.fired.map((event) => event.id)).toContain('carter_ceasefire_1994');
            expect(state.military.event_flags?.carter_ceasefire_active).toBe(true);
            expect(state.military.general_supply_reserve).toMatchObject({ RBiH: 15, RS: 13 });
            expect(state.military.pending_event_decisions?.[0]).toMatchObject({
                event_id: 'carter_ceasefire_1994',
                requires_player_response: true,
                historical_default_response_id: 'respect',
            });

            expect(() => resolveEventDecision(state, 'carter_ceasefire_1994', 'respect')).not.toThrow();
            expect(state.military.pending_event_decisions).toHaveLength(0);
            expect(state.military.event_decision_log).toEqual([
                expect.objectContaining({
                    event_id: 'carter_ceasefire_1994',
                    response_id: 'respect',
                    decision_source: 'player',
                }),
            ]);
        }

        const onceState = minimalState(141);
        evaluateEvents(onceState, rejectRandomness, 141, [carter]);
        onceState.meta.turn = 142;
        expect(evaluateEvents(onceState, rejectRandomness, 142, [carter]).fired.map((event) => event.id))
            .not.toContain('carter_ceasefire_1994');
        expect(onceState.military.event_fire_counts?.carter_ceasefire_1994).toBe(1);
    });

    it('cannot fire COHA at 142 and requires both Carter receipt and flag at 143', () => {
        const blocked = minimalState(142);
        blocked.military.fired_event_ids = ['carter_ceasefire_1994'];
        blocked.military.event_flags = { carter_ceasefire_active: true };
        expect(triggerMatches(coha, blocked, 142)).toBe(false);
        expect(evaluateEvents(blocked, rejectRandomness, 142, [coha]).fired).toEqual([]);
        expect(blocked.military.event_flags?.coha_active).toBeUndefined();

        const missingId = minimalState(143);
        missingId.military.event_flags = { carter_ceasefire_active: true };
        const missingFlag = minimalState(143);
        missingFlag.military.fired_event_ids = ['carter_ceasefire_1994'];

        for (const state of [missingId, missingFlag]) {
            expect(triggerMatches(coha, state, 143)).toBe(false);
            expect(evaluateEvents(state, rejectRandomness, 143, [coha]).fired).toEqual([]);
            expect(state.military.event_flags?.coha_active).toBeUndefined();
        }

        const eligible = minimalState(143);
        eligible.military.fired_event_ids = ['carter_ceasefire_1994'];
        eligible.military.event_flags = { carter_ceasefire_active: true };
        expect(triggerMatches(coha, eligible, 143)).toBe(true);
        expect(evaluateEvents(eligible, rejectRandomness, 143, [coha]).fired.map((event) => event.id))
            .toContain('coha_ceasefire_begins_1995');
        expect(eligible.military.event_flags?.coha_active).toBe(true);

        expect(evaluateEvents(eligible, rejectRandomness, 143, [coha]).fired.map((event) => event.id))
            .not.toContain('coha_ceasefire_begins_1995');
        expect(eligible.military.event_fire_counts?.coha_ceasefire_begins_1995).toBe(1);
    });

    it('keeps the 16-turn COHA aggression modifiers separate from expiry proof', () => {
        expect(coha.effect).toMatchObject({
            kind: 'aggression_modifier',
            faction: 'RS',
            delta: -0.15,
            duration_turns: 16,
        });
        const modifiers = (coha.effects ?? []).filter((effect) => effect.kind === 'aggression_modifier');
        expect(modifiers).toHaveLength(2);
        for (const modifier of modifiers) {
            expect(modifier.duration_turns).toBe(16);
        }
    });

    it('holds expiry at 156 and 160 after valid activation, then fires it at 161', () => {
        const state = minimalState(143);
        state.military.fired_event_ids = ['carter_ceasefire_1994'];
        state.military.event_flags = { carter_ceasefire_active: true };
        evaluateEvents(state, rejectRandomness, 143, [coha]);
        expect(state.military.event_flags?.coha_active).toBe(true);

        for (const turn of [156, 160]) {
            state.meta.turn = turn;
            expect(evaluateEvents(state, rejectRandomness, turn, [expiry]).fired).toEqual([]);
            expect(state.military.event_flags?.coha_active).toBe(true);
            expect(state.military.event_flags?.coha_expired).toBeUndefined();
        }

        state.meta.turn = 161;
        expect(evaluateEvents(state, rejectRandomness, 161, [expiry]).fired.map((event) => event.id))
            .toContain('coha_expires_1995');
        expect(state.military.event_flags?.coha_active).toBe(false);
        expect(state.military.event_flags?.coha_expired).toBe(true);

        state.meta.turn = 162;
        expect(evaluateEvents(state, rejectRandomness, 162, [expiry]).fired.map((event) => event.id))
            .not.toContain('coha_expires_1995');
        expect(state.military.event_fire_counts?.coha_expires_1995).toBe(1);
    });

    it('updates the APR1995 nominal maxima while preserving tolerances and citations', () => {
        const anchors = Object.fromEntries(
            HISTORICAL_EVENT_ANCHORS_APR1995.map((anchor) => [anchor.event_id, anchor]),
        );

        expect(anchors.carter_ceasefire_1994).toMatchObject({ expected_week_max: 142, tolerance: 3 });
        expect(anchors.coha_ceasefire_begins_1995).toMatchObject({ expected_week_max: 143, tolerance: 3 });
        expect(anchors.coha_expires_1995).toMatchObject({ expected_week_max: 161, tolerance: 2 });
        expect(anchors.un_safe_areas_declared_1993).toMatchObject({ expected_week_max: 57, tolerance: 2 });

        expect(anchors.carter_ceasefire_1994.citation).toContain('Carter shuttle 18-20 Dec 1994');
        expect(anchors.carter_ceasefire_1994.citation).toContain('temporary truce 23/24 Dec 1994');
        expect(carter.trigger_evidence?.join(' ')).toContain('18-20 December shuttle window');
        expect(carter.trigger_evidence?.join(' ')).toContain('23/24 December');
        expect(carter.trigger_evidence?.join(' ')).not.toContain('agreement week');
        expect(anchors.coha_ceasefire_begins_1995.citation).toContain('1 Jan 1995');
        expect(anchors.coha_expires_1995.citation).toContain('1 May 1995');
        expect(anchors.un_safe_areas_declared_1993.citation).toContain('6 May 1993');
    });
});
