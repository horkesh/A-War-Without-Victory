import { describe, expect, it } from 'vitest';

import type { GameState } from '../src/state/game_state.js';
import { checkAndApplyOperationStorm } from '../src/sim/combat/operation_storm.js';

function buildStormReadyState(overrides: Partial<GameState> = {}): GameState {
    const state = {
        schema_version: 0,
        meta: {
            turn: 113,
            seed: 'storm-test',
            phase: 'war',
        },
        military: {
            formations: {},
            fired_event_ids: [],
            event_last_fired_turn: {},
        },
        political: {
            political_controllers: {
                'op:a:a': 'RS',
                'op:b:b': 'RS',
                'op:c:c': 'RBiH',
                'op:d:d': 'HRHB',
            },
            rbih_hrhb_state: {
                washington_signed: true,
            },
            war_exhaustion: {
                RBiH: 35,
                HRHB: 35,
            },
            international_visibility_pressure: {
                negotiation_momentum: 0.7,
            },
        },
        displacement: {},
        factions: [],
    } as unknown as GameState;

    return {
        ...state,
        ...overrides,
        meta: { ...state.meta, ...(overrides.meta ?? {}) },
        military: { ...state.military, ...(overrides.military ?? {}) },
        political: { ...state.political, ...(overrides.political ?? {}) },
    } as GameState;
}

describe('Operation Storm theater gate', () => {
    it('records preconditions without opening the western theater before the Storm event fires', () => {
        const state = buildStormReadyState();

        const report = checkAndApplyOperationStorm(state);

        expect(report.preconditions.all_met).toBe(true);
        expect(report.fired).toBe(false);
        expect(state.meta.operation_storm_triggered).not.toBe(true);
        expect(state.meta.operation_storm_preconditions_met).toBe(true);
        expect(state.meta.operation_storm_precondition_turn).toBe(113);
    });

    it('opens the western theater when the Operation Storm event has fired', () => {
        const state = buildStormReadyState({
            meta: { turn: 174, seed: 'storm-test', phase: 'war' },
            military: {
                formations: {},
                fired_event_ids: ['operation_storm_1995'],
                event_last_fired_turn: { operation_storm_1995: 174 },
            },
        } as unknown as Partial<GameState>);

        const report = checkAndApplyOperationStorm(state);

        expect(report.event_fired).toBe(true);
        expect(report.event_turn).toBe(174);
        expect(report.fired).toBe(true);
        expect(state.meta.operation_storm_triggered).toBe(true);
        expect(state.meta.operation_storm_turn).toBe(174);
    });
});
