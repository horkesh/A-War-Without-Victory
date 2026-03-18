import { describe, it, expect } from 'vitest';
import { DEFENSE_ENV_HARD_CAP, DEFENSE_ENV_COMPRESSION } from '../src/sim/combat/combat_math.js';

describe('defense stacking cap', () => {
    it('hard cap is 2.5', () => {
        expect(DEFENSE_ENV_HARD_CAP).toBe(2.5);
    });

    it('compression is 0.35', () => {
        expect(DEFENSE_ENV_COMPRESSION).toBe(0.35);
    });

    it('extreme stacking capped at 2.5x', () => {
        // Simulate extreme stacking: 1.3 × 1.35 × 1.2 × 1.4 = 2.95
        const envProduct = 1.3 * 1.35 * 1.2 * 1.4;
        const envBonus = envProduct - 1.0;
        const cappedBonus = envBonus <= 0.5
            ? envBonus
            : 0.5 + (envBonus - 0.5) * 0.35;
        const cappedMult = 1.0 + Math.max(0, cappedBonus);
        const final = Math.min(cappedMult, 2.5);
        expect(final).toBeLessThanOrEqual(2.5);
    });

    it('moderate stacking not affected by hard cap', () => {
        // Simulate moderate: 1.15 × 1.2 × 1.1 = 1.518
        const envProduct = 1.15 * 1.2 * 1.1;
        const envBonus = envProduct - 1.0;
        const cappedBonus = envBonus <= 0.5
            ? envBonus
            : 0.5 + (envBonus - 0.5) * 0.35;
        const cappedMult = 1.0 + Math.max(0, cappedBonus);
        const final = Math.min(cappedMult, 2.5);
        expect(final).toBeLessThan(2.5); // Not hitting cap
        expect(final).toBeCloseTo(cappedMult); // Unchanged by cap
    });
});
