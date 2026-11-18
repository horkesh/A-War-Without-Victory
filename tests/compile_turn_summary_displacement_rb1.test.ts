/**
 * RB1: the turn summary counts each person of a displacement wave once.
 *
 * An event's `displaced` is the routed share; the wave is routed + killed + fled abroad.
 * - `displacement_total` (and the by-ethnicity rows and the hotspot) = routed + fled abroad: the people displaced.
 * - `displacement_killed` = the killed, kept in the turn record (red-team C-RB2) and never added to the displaced.
 */
import { describe, expect, it } from 'vitest';

import { compileTurnSummary } from '../src/sim/compile_turn_summary.js';
import type { AARSnapshot, TurnReport } from '../src/sim/turn_pipeline_types.js';
import type { DisplacementEvent, GameState } from '../src/state/game_state.js';

function makeState(turn: number, events: DisplacementEvent[]): GameState {
    return {
        meta: { turn, phase: 'war', seed: 'rb1-turn-summary' },
        political: { control_events: [], political_controllers: {} },
        military: { formations: {}, },
        displacement: { displacement_event_log: events },
    } as unknown as GameState;
}

function makeSnapshot(turn: number): AARSnapshot {
    return {
        turn,
        arcs: {},
        decoration_tiers: {},
        already_destroyed: new Set(),
        formation_ids: new Set(),
        formation_locations: {},
        supply_state_by_osid: {},
    };
}

function event(partial: Partial<DisplacementEvent>): DisplacementEvent {
    return { turn: 10, origin_mun: 'vitez', dest_mun: 'zenica', ethnicity: 'RBiH', displaced: 0, killed: 0, fled_abroad: 0, settled: 0, ...partial };
}

describe('compileTurnSummary displacement (RB1)', () => {
    it('counts routed + fled abroad as displaced and keeps the killed separate', () => {
        const state = makeState(10, [
            event({ displaced: 700, killed: 50, fled_abroad: 250 }),
            event({ origin_mun: 'busovaca', ethnicity: 'HRHB', displaced: 100, killed: 10, fled_abroad: 40 }),
            event({ turn: 9, displaced: 9999, killed: 9999, fled_abroad: 9999 }),
        ]);
        const summary = compileTurnSummary(state, makeSnapshot(10), {} as TurnReport);

        expect(summary.displacement_total).toBe(700 + 250 + 100 + 40);
        expect(summary.displacement_by_ethnicity).toEqual({ RBiH: 950, HRHB: 140 });
        expect(summary.displacement_killed).toBe(60);
        expect(summary.displacement_hotspot).toBe('vitez');
    });

    it('records killed even on a turn where nobody is displaced', () => {
        const summary = compileTurnSummary(makeState(10, [event({ killed: 12 })]), makeSnapshot(10), {} as TurnReport);
        expect(summary.displacement_total).toBe(0);
        expect(summary.displacement_killed).toBe(12);
    });
});
