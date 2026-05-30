/**
 * Cohesion-divisor rescale completion — regression guard.
 *
 * The 2026-05-22 100× `war_exhaustion` rescale (commit 59511672) moved the
 * exhaustion saturation ceiling 100→10000 but MISSED two linear-term consumers:
 *   - strategic_dimensions.ts internal_cohesion base used `exhaustion / 3`
 *   - political_personality.ts situation score used `exhaustion / 6`
 * At post-rescale turn-40 exhaustion (~4750-7940) those un-rescaled divisors
 * saturated the formulas, flooring every faction's internal_cohesion base at 0
 * and pinning every faction's exhaustion_level at 100 — destroying the
 * faction-asymmetric signal the Phase E cohesion gate depends on.
 *
 * These tests pin the completed sweep (`/300` and `/600`): post-rescale
 * exhaustion must leave cohesion bases off the 0 floor AND faction-differentiated,
 * and must leave the situation-score exhaustion term differentiated rather than
 * pinned at the 100 ceiling.
 */

import { describe, it, expect } from 'vitest';

import {
    initializeStrategicDimensions,
    computeDimensionBaseValues,
} from '../src/sim/events/strategic_dimensions.js';
import {
    computePoliticalAssessment,
    getPoliticalPersonality,
} from '../src/sim/political/political_personality.js';
import type { FactionId, GameState } from '../src/state/game_state.js';

// Post-rescale turn-40-era exhaustion magnitude. With the OLD `/3` divisor this
// (6000/3 = 2000) dwarfs the formula's max positive contribution (40 + 50 = 90)
// and clamps the cohesion base to 0; with the OLD `/6` divisor (6000/6 = 1000)
// the situation-score exhaustion term clamps to the 100 ceiling.
const POST_RESCALE_EXHAUSTION = 6000;

function dimState(exhaustionByFaction: Partial<Record<FactionId, number>>): any {
    return {
        military: { negotiation: { capital: {} }, formations: {} },
        political: {
            war_alliance_rbih_hrhb: 1,
            war_exhaustion: exhaustionByFaction,
        },
    };
}

describe('cohesion-divisor rescale — strategic_dimensions internal_cohesion base', () => {
    it('does NOT floor cohesion base at 0 under post-rescale exhaustion', () => {
        const store = initializeStrategicDimensions();
        const state = dimState({ RBiH: POST_RESCALE_EXHAUSTION, RS: POST_RESCALE_EXHAUSTION, HRHB: POST_RESCALE_EXHAUSTION });
        for (const faction of ['RBiH', 'RS', 'HRHB'] as FactionId[]) {
            computeDimensionBaseValues(store, state, faction);
            expect(store[faction].internal_cohesion.base_value).toBeGreaterThan(0);
        }
    });

    it('produces faction-asymmetric cohesion bases (alliance members vs RS)', () => {
        const store = initializeStrategicDimensions();
        const state = dimState({ RBiH: POST_RESCALE_EXHAUSTION, RS: POST_RESCALE_EXHAUSTION, HRHB: POST_RESCALE_EXHAUSTION });
        for (const faction of ['RBiH', 'RS', 'HRHB'] as FactionId[]) {
            computeDimensionBaseValues(store, state, faction);
        }
        // allianceVal is 40 for RBiH/HRHB but 20 for RS, so RS must sit lower than
        // the alliance pair at equal exhaustion. Under the old /3 divisor all three
        // clamped to 0 and this differentiation vanished.
        expect(store.RBiH.internal_cohesion.base_value).toBeGreaterThan(store.RS.internal_cohesion.base_value);
        expect(store.HRHB.internal_cohesion.base_value).toBeGreaterThan(store.RS.internal_cohesion.base_value);
        // Exact /300-scale values: RBiH/HRHB = clamp(40 + 25 - 20) = 45; RS = clamp(20 + 25 - 20) = 25.
        expect(store.RBiH.internal_cohesion.base_value).toBeCloseTo(45, 5);
        expect(store.RS.internal_cohesion.base_value).toBeCloseTo(25, 5);
    });
});

describe('cohesion-divisor rescale — political_personality situation score', () => {
    function assess(exhaustion: number, faction: FactionId) {
        const state = {
            meta: { turn: 40 },
            political: { war_exhaustion: { [faction]: exhaustion } },
            military: {},
        } as unknown as GameState;
        return computePoliticalAssessment(state, faction, getPoliticalPersonality(faction));
    }

    it('does NOT pin exhaustion_level at the 100 ceiling under post-rescale exhaustion', () => {
        const a = assess(POST_RESCALE_EXHAUSTION, 'RBiH');
        // 6000 / 600 = 10, well below the 100 clamp ceiling (old /6 gave 1000 → 100).
        expect(a.exhaustion_level).toBeLessThan(100);
        expect(a.exhaustion_level).toBeCloseTo(10, 5);
    });

    it('keeps situation_score sensitive to exhaustion differences post-rescale', () => {
        const low = assess(POST_RESCALE_EXHAUSTION, 'RBiH');
        const high = assess(POST_RESCALE_EXHAUSTION * 2, 'RBiH');
        // Higher exhaustion → lower situation score. Under the old /6 divisor both
        // saturated to exhaustion_level 100 and produced an identical situation score.
        expect(high.situation_score).toBeLessThan(low.situation_score);
    });
});
