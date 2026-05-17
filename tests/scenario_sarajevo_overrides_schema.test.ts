import { describe, expect, it } from 'vitest';

import { normalizeScenario } from '../src/scenario/scenario_loader.js';
import type { SarajevoSiegeOverrides } from '../src/scenario/scenario_types.js';

describe('scenario sarajevo_overrides schema', () => {
    it('accepts scenarios with and without Sarajevo numeric overrides', () => {
        const without = normalizeScenario({
            scenario_id: 'sarajevo_without_overrides',
            weeks: 1,
            turns: [],
        });
        const withOverrides = normalizeScenario({
            scenario_id: 'sarajevo_with_overrides',
            weeks: 1,
            turns: [],
            sarajevo_overrides: {
                defense_bonus: 0.5,
                attacker_casualty_mult: 2.25,
                rbih_exhaustion_per_turn: 3.5,
                rs_exhaustion_per_turn: 2.5,
                integrity_floor: 0.2,
            } satisfies SarajevoSiegeOverrides,
        });

        expect(without.sarajevo_overrides).toBeUndefined();
        expect(withOverrides.sarajevo_overrides).toEqual({
            defense_bonus: 0.5,
            attacker_casualty_mult: 2.25,
            rbih_exhaustion_per_turn: 3.5,
            rs_exhaustion_per_turn: 2.5,
            integrity_floor: 0.2,
        });
    });

    it('drops invalid or empty override values instead of manufacturing defaults', () => {
        const scenario = normalizeScenario({
            scenario_id: 'sarajevo_invalid_overrides',
            weeks: 1,
            turns: [],
            sarajevo_overrides: {
                defense_bonus: '0.5',
                attacker_casualty_mult: Number.NaN,
                rbih_exhaustion_per_turn: 3,
            },
        });

        expect(scenario.sarajevo_overrides).toEqual({ rbih_exhaustion_per_turn: 3 });
    });
});
