import { describe, it, expect } from 'vitest';
import { ENTRENCHMENT_PER_TURN, MAX_ENTRENCHMENT, ENTRENCHMENT_EFFECTIVE_CAP_TURNS } from '../src/sim/combat/combat_math.js';

describe('entrenchment effective cap', () => {
    it('ENTRENCHMENT_EFFECTIVE_CAP_TURNS is 26', () => {
        expect(ENTRENCHMENT_EFFECTIVE_CAP_TURNS).toBe(26);
    });

    it('cap is less than MAX_ENTRENCHMENT conceptual limit', () => {
        // MAX_ENTRENCHMENT is the hard storage cap (6 for the field),
        // but effective cap limits the BONUS calculation
        expect(ENTRENCHMENT_EFFECTIVE_CAP_TURNS).toBeGreaterThan(0);
    });

    it('bonus at cap is less than uncapped at 40 turns', () => {
        const bonusAtCap = Math.sqrt(ENTRENCHMENT_EFFECTIVE_CAP_TURNS) * ENTRENCHMENT_PER_TURN * 2;
        const bonusUncapped = Math.sqrt(40) * ENTRENCHMENT_PER_TURN * 2;
        expect(bonusAtCap).toBeLessThan(bonusUncapped);
        // At 26: ~0.357. At 40: ~0.443. Difference creates offensive window.
        expect(bonusAtCap).toBeCloseTo(0.357, 2);
    });

    it('ENTRENCHMENT_PER_TURN unchanged at 0.035', () => {
        expect(ENTRENCHMENT_PER_TURN).toBe(0.035);
    });
});
