import { describe, it, expect } from 'vitest';
import { canFormEmergentBrigade } from '../src/sim/recruitment_engine.js';

function makeBrigade(personnel: number, maxPersonnel = 3000) {
    return { personnel, max_personnel: maxPersonnel };
}

describe('canFormEmergentBrigade', () => {
    it('returns true when pool has surplus and existing brigades at capacity', () => {
        const existing = [makeBrigade(2500)]; // 83% > 60%
        expect(canFormEmergentBrigade(existing, { available: 1000 }, 600, 4, 0)).toBe(true);
    });

    it('returns false when existing brigade below capacity threshold', () => {
        const existing = [makeBrigade(1000)]; // 33% < 60%
        expect(canFormEmergentBrigade(existing, { available: 1000 }, 600, 4, 0)).toBe(false);
    });

    it('returns false when pool cannot afford new brigade', () => {
        const existing = [makeBrigade(2500)];
        expect(canFormEmergentBrigade(existing, { available: 100 }, 600, 4, 0)).toBe(false);
    });

    it('returns false when current turn before available_from', () => {
        const existing = [makeBrigade(2500)];
        expect(canFormEmergentBrigade(existing, { available: 1000 }, 600, 2, 4)).toBe(false);
    });

    it('returns true when municipality has zero existing brigades', () => {
        expect(canFormEmergentBrigade([], { available: 800 }, 600, 0, 0)).toBe(true);
    });

    it('returns true when all existing brigades above threshold', () => {
        const existing = [makeBrigade(2000), makeBrigade(1900)]; // 67%, 63%
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0)).toBe(true);
    });

    it('returns false when one brigade below threshold even if others full', () => {
        const existing = [makeBrigade(3000), makeBrigade(500)]; // 100%, 17%
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0)).toBe(false);
    });

    it('returns false when pool is undefined', () => {
        const existing = [makeBrigade(2500)];
        expect(canFormEmergentBrigade(existing, undefined, 600, 4, 0)).toBe(false);
    });
});
