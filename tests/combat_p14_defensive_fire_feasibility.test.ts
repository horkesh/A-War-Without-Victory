/**
 * COMBAT-P14 — defender return-fire folded into launch-feasibility / force-ratio.
 *
 * Proves the new `applyDefensiveFireToRatio` mechanism (combat_math.ts):
 *   - a HIGH-return-fire defender (artillery-heavy / dug-in VRS) lowers the
 *     predicted feasibility ratio (raises anticipated attacker cost), and
 *   - a SOFT target (rifle-only, no heavy weapons) is left ~unchanged.
 *
 * The helper REUSES the resolver's own getDefensiveFireMult, so prediction now
 * mirrors the extra attacker-casualty cost the resolver applies after the fact.
 * Deterministic: pure function of (ratio, defenders, faction, state).
 */
import { describe, expect, it } from 'vitest';
import type { FormationState, GameState } from '../src/state/game_state.js';
import {
    applyDefensiveFireToRatio,
    getDefensiveFireMult,
} from '../src/sim/combat/combat_math.js';

function makeState(): GameState {
    // supply_reserves_enabled defaults off → getHeavyMunitionsMult === 1.0, so the
    // return-fire multiplier is a pure function of defender composition.
    return { meta: {}, military: {} } as unknown as GameState;
}

function makeDefender(
    id: string,
    faction: string,
    comp: { infantry: number; tanks: number; artillery: number },
): FormationState {
    return {
        id,
        faction,
        kind: 'brigade',
        status: 'active',
        personnel: comp.infantry,
        composition: {
            infantry: comp.infantry,
            tanks: comp.tanks,
            artillery: comp.artillery,
            aa_systems: 0,
            tank_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
            artillery_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
        },
    } as unknown as FormationState;
}

describe('COMBAT-P14 applyDefensiveFireToRatio', () => {
    const state = makeState();
    const baseRatio = 1.5; // a "victory"-class predicted ratio before return-fire

    it('lowers the ratio for an artillery-heavy / dug-in defender', () => {
        const heavyDefenders = [
            makeDefender('rs_dug_in_1', 'RS', { infantry: 2000, tanks: 20, artillery: 30 }),
        ];
        const mult = getDefensiveFireMult(heavyDefenders, 'RS', state);
        // Heavy weapons → meaningful return-fire tax (> 1.0).
        expect(mult).toBeGreaterThan(1.2);

        const adjusted = applyDefensiveFireToRatio(baseRatio, heavyDefenders, 'RS', state);
        // Predicted feasibility ratio is degraded by the bounded tax.
        expect(adjusted).toBeLessThan(baseRatio);
        expect(adjusted).toBeCloseTo(baseRatio / mult, 10);
    });

    it('leaves a soft (rifle-only) target essentially unchanged', () => {
        const softDefenders = [
            makeDefender('arbih_militia_1', 'RBiH', { infantry: 800, tanks: 0, artillery: 0 }),
        ];
        const mult = getDefensiveFireMult(softDefenders, 'RBiH', state);
        expect(mult).toBe(1.0);

        const adjusted = applyDefensiveFireToRatio(baseRatio, softDefenders, 'RBiH', state);
        expect(adjusted).toBe(baseRatio);
    });

    it('hits a high-return-fire defender harder than a soft one (relative ordering)', () => {
        const heavy = [makeDefender('rs_art', 'RS', { infantry: 2000, tanks: 20, artillery: 30 })];
        const soft = [makeDefender('arbih_rifle', 'RBiH', { infantry: 2000, tanks: 0, artillery: 0 })];
        const heavyAdj = applyDefensiveFireToRatio(baseRatio, heavy, 'RS', state);
        const softAdj = applyDefensiveFireToRatio(baseRatio, soft, 'RBiH', state);
        expect(heavyAdj).toBeLessThan(softAdj);
    });

    it('is bounded — never divides by more than MAX_DEFENSIVE_FIRE_MULT (1.8)', () => {
        // Saturating heavy-weapons count drives the multiplier to its cap.
        const saturated = [makeDefender('rs_massive', 'RS', { infantry: 5000, tanks: 200, artillery: 200 })];
        const mult = getDefensiveFireMult(saturated, 'RS', state);
        expect(mult).toBeLessThanOrEqual(1.8 + 1e-9);
        const adjusted = applyDefensiveFireToRatio(baseRatio, saturated, 'RS', state);
        // At the 1.8 cap the ratio is reduced by at most ~44%, never to zero/negative.
        expect(adjusted).toBeGreaterThanOrEqual(baseRatio / 1.8 - 1e-9);
        expect(adjusted).toBeGreaterThan(0);
    });

    it('passes through non-finite / non-positive ratios unchanged (Infinity sentinel)', () => {
        const heavy = [makeDefender('rs_art', 'RS', { infantry: 2000, tanks: 20, artillery: 30 })];
        expect(applyDefensiveFireToRatio(Number.POSITIVE_INFINITY, heavy, 'RS', state)).toBe(Number.POSITIVE_INFINITY);
        expect(applyDefensiveFireToRatio(0, heavy, 'RS', state)).toBe(0);
    });

    it('no defenders → multiplier 1.0 → ratio unchanged', () => {
        expect(applyDefensiveFireToRatio(baseRatio, [], 'RS', state)).toBe(baseRatio);
    });
});
