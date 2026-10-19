import { describe, expect, it } from 'vitest';

import { effectiveOperationMinimum } from '../src/sim/combat/operation_minimum_policy.js';

describe('effective operation minimum policy', () => {
    it.each([
        ['probe', 1],
        ['feint', 1],
        ['sector_attack', 2],
        ['general_offensive', 2],
        ['strategic_defense', 1],
        ['reorganization', 0],
        ['unknown_future_type', 2],
    ])('preserves the %s type default', (type, expected) => {
        expect(effectiveOperationMinimum(type)).toBe(expected);
    });

    it.each([
        [1, 1],
        [0, 1],
        [-4, 1],
        [2.9, 2],
        [0.9, 1],
    ])('preserves explicit override %s as %s', (override, expected) => {
        expect(effectiveOperationMinimum('sector_attack', override)).toBe(expected);
    });
});
