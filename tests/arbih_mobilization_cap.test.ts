import { describe, it, expect } from 'vitest';
import { ARBIH_PERSONNEL_CAP } from '../src/sim/combat/ongoing_mobilization.js';

describe('ARBiH mobilization cap', () => {
    it('cap is 95000', () => {
        expect(ARBIH_PERSONNEL_CAP).toBe(95_000);
    });
    it('cap is within historical range', () => {
        expect(ARBIH_PERSONNEL_CAP).toBeGreaterThanOrEqual(80_000);
        expect(ARBIH_PERSONNEL_CAP).toBeLessThanOrEqual(100_000);
    });
});
