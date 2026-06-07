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

    it('passes B7 lifeline override keys through scenario load (#271)', () => {
        // Regression: the normalizer previously whitelisted only the 5 LEGACY
        // numeric keys, silently dropping the new lifeline tuning fields so a
        // scenario could never configure the lifeline. All four must survive.
        const withLifeline = normalizeScenario({
            scenario_id: 'sarajevo_with_lifeline_overrides',
            weeks: 1,
            turns: [],
            sarajevo_overrides: {
                defense_bonus: 0.5,
                lifeline_base_throughput: 0.1,
                lifeline_airlift_throughput: 0.3,
                lifeline_tunnel_throughput: 0.4,
                lifeline_severed_attrition_mult: 1.5,
            } satisfies SarajevoSiegeOverrides,
        });

        expect(withLifeline.sarajevo_overrides).toEqual({
            defense_bonus: 0.5,
            lifeline_base_throughput: 0.1,
            lifeline_airlift_throughput: 0.3,
            lifeline_tunnel_throughput: 0.4,
            lifeline_severed_attrition_mult: 1.5,
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
