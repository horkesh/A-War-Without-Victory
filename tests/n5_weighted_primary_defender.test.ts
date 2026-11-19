/**
 * N5 (2026-11-16): the primary defender of a sector-coverage battle is the brigade in contact,
 * not the nominally strongest contributor. Konjic-south, main t76: Kalinovik (1 hop, weight 96)
 * gave 55% of the reactive response, while 2nd Herzegovina (5 hops, nominal 574, weight 45) was
 * picked as primary and took every cohesion, morale, officer and fatigue hit (64 -> 20).
 */
import { describe, expect, it } from 'vitest';

import { selectWeightedPrimaryDefender } from '../src/sim/combat/combat_math.js';

const b = (id: string) => ({ id });

describe('N5: weighted primary defender', () => {
    it('picks the largest weighted contributor, not the nominally strongest distant brigade', () => {
        const brigades = [b('rs_2nd_herzegovina'), b('rs_kalinovik'), b('rs_gacko'), b('rs_nevesinje')];
        const weights = new Map([['rs_2nd_herzegovina', 45], ['rs_kalinovik', 96], ['rs_gacko', 20], ['rs_nevesinje', 12]]);
        const hops = new Map([['rs_2nd_herzegovina', 5], ['rs_kalinovik', 1], ['rs_gacko', 2], ['rs_nevesinje', 2]]);
        expect(selectWeightedPrimaryDefender(brigades, weights, hops)?.id).toBe('rs_kalinovik');
    });

    it('a brigade in the cell is primary even when a reserve outweighs it', () => {
        const brigades = [b('in_cell'), b('strong_reserve')];
        const weights = new Map([['in_cell', 80], ['strong_reserve', 230]]);
        const hops = new Map([['in_cell', 0], ['strong_reserve', 1]]);
        expect(selectWeightedPrimaryDefender(brigades, weights, hops)?.id).toBe('in_cell');
    });

    it('among several in the cell, the largest weight wins', () => {
        const brigades = [b('a'), b('b'), b('c')];
        const weights = new Map([['a', 50], ['b', 120], ['c', 300]]);
        const hops = new Map([['a', 0], ['b', 0], ['c', 2]]);
        expect(selectWeightedPrimaryDefender(brigades, weights, hops)?.id).toBe('b');
    });

    it('ties go to fewer hops, then id', () => {
        const weights = new Map([['z', 60], ['y', 60], ['x', 60]]);
        expect(selectWeightedPrimaryDefender([b('z'), b('y')], weights, new Map([['z', 1], ['y', 2]]))?.id).toBe('z');
        expect(selectWeightedPrimaryDefender([b('z'), b('x')], weights, new Map([['z', 2], ['x', 2]]))?.id).toBe('x');
    });

    it('zero-weight (unreachable) brigades never qualify', () => {
        const brigades = [b('far'), b('none')];
        const weights = new Map([['far', 0], ['none', 0]]);
        const hops = new Map([['far', 6], ['none', Number.POSITIVE_INFINITY]]);
        expect(selectWeightedPrimaryDefender(brigades, weights, hops)).toBeUndefined();
    });
});
