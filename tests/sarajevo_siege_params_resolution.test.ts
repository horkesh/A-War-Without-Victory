import { describe, expect, it } from 'vitest';

import {
    DEFAULT_SARAJEVO_SIEGE_PARAMS,
    getSarajevoSiegeParams,
} from '../src/sim/combat/sarajevo_siege_params.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function stateWith(overrides?: GameState['meta']['sarajevo_overrides']): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 1,
            seed: 'sarajevo-params',
            phase: 'war',
            ...(overrides ? { sarajevo_overrides: overrides } : {}),
        },
        factions: [],
        military: { formations: {}, front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {}, militia_pools: {} } as any,
        political: { political_controllers: {} } as any,
        displacement: {} as any,
    };
}

describe('getSarajevoSiegeParams', () => {
    it('returns frozen code defaults when no scenario overrides are set', () => {
        const params = getSarajevoSiegeParams(stateWith());

        expect(params).toEqual(DEFAULT_SARAJEVO_SIEGE_PARAMS);
        expect(Object.isFrozen(params)).toBe(true);
    });

    it('applies each individual override while preserving other defaults', () => {
        const fields = [
            ['defense_bonus', 0.5],
            ['attacker_casualty_mult', 2.25],
            ['rbih_exhaustion_per_turn', 3.5],
            ['rs_exhaustion_per_turn', 2.5],
            ['integrity_floor', 0.2],
        ] as const;

        for (const [field, value] of fields) {
            expect(getSarajevoSiegeParams(stateWith({ [field]: value }))[field]).toBe(value);
            for (const defaultField of Object.keys(DEFAULT_SARAJEVO_SIEGE_PARAMS) as Array<keyof typeof DEFAULT_SARAJEVO_SIEGE_PARAMS>) {
                if (defaultField === field) continue;
                expect(getSarajevoSiegeParams(stateWith({ [field]: value }))[defaultField]).toBe(DEFAULT_SARAJEVO_SIEGE_PARAMS[defaultField]);
            }
        }
    });

    it('applies all five overrides deterministically (lifeline fields keep defaults)', () => {
        const overrides = {
            defense_bonus: 0.5,
            attacker_casualty_mult: 2.25,
            rbih_exhaustion_per_turn: 3.5,
            rs_exhaustion_per_turn: 2.5,
            integrity_floor: 0.2,
        };

        // The five legacy overrides resolve verbatim; the B7 lifeline fields
        // (default-OFF tuning, not overridden here) keep their code defaults.
        expect(getSarajevoSiegeParams(stateWith(overrides))).toEqual({
            ...DEFAULT_SARAJEVO_SIEGE_PARAMS,
            ...overrides,
        });
    });
});
