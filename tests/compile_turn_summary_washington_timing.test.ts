import { describe, expect, it } from 'vitest';

import { compileTurnSummary } from '../src/sim/compile_turn_summary.js';
import type { AARSnapshot, TurnReport } from '../src/sim/turn_pipeline_types.js';
import type { GameState } from '../src/state/game_state.js';

function makeState(turn: number): GameState {
    return {
        meta: { turn, phase: 'war', seed: 'washington-summary-contract' },
        political: {
            control_events: [],
            political_controllers: {},
            rbih_hrhb_state: {
                war_started_turn: 36,
                mobilization_started_turn: 30,
                ceasefire_active: true,
                ceasefire_since_turn: 81,
                washington_signed: true,
                washington_turn: 85,
                stalemate_turns: 4,
                bilateral_flips_this_turn: 0,
                territorial_incidents_this_turn: 0,
                total_bilateral_flips: 0,
                allied_mixed_municipalities: [],
            },
        },
        military: {
            formations: {},
            general_supply_reserve: {},
            heavy_munitions_reserve: {},
        },
        displacement: {
            displacement_event_log: [],
        },
    } as unknown as GameState;
}

function makeSnapshot(turn: number): AARSnapshot {
    return {
        turn,
        supply: {},
        heavy_munitions: {},
        arcs: {},
        decoration_tiers: {},
        already_destroyed: new Set(),
        formation_ids: new Set(),
        formation_locations: {},
        supply_state_by_osid: {},
    };
}

describe('compileTurnSummary Washington timing contract', () => {
    it('records live RBiH-HRHB framework activation without claiming the calendar Washington event fired', () => {
        const summary = compileTurnSummary(makeState(85), makeSnapshot(85), {} as TurnReport);

        expect(summary.events_fired).toEqual([]);
        expect(summary.notable_events).toEqual([
            {
                kind: 'rbih_hrhb_framework_activated',
                description: 'RBiH-HRHB federation framework activated - bilateral ceasefire and joint anti-RS coordination are live.',
            },
        ]);
    });
});
