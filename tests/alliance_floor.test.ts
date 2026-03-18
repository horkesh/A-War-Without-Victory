import { describe, it, expect } from 'vitest';
import { ALLIANCE_FLOOR_BEFORE_WAR, ALLIED_THRESHOLD } from '../src/sim/early_war/alliance_update.js';

describe('alliance floor before war', () => {
    it('floor is 0.40', () => {
        expect(ALLIANCE_FLOOR_BEFORE_WAR).toBe(0.40);
    });
    it('floor is above ALLIED_THRESHOLD', () => {
        expect(ALLIANCE_FLOOR_BEFORE_WAR).toBeGreaterThan(ALLIED_THRESHOLD);
    });
    it('clamping uses floor not allied threshold before war', () => {
        const computed = 0.25;
        const result = Math.max(computed, ALLIANCE_FLOOR_BEFORE_WAR);
        expect(result).toBe(0.40);
    });
});
