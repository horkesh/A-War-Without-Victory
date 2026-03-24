import { describe, it, expect } from 'vitest';
import { canFormEmergentBrigade } from '../src/sim/recruitment_engine.js';
import { ENCLAVE_FORMATION_CAPACITY_THRESHOLD } from '../src/state/formation_constants.js';

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

describe('canFormEmergentBrigade — enclave capacity gate', () => {
    it('enclave brigade (max=1500) at 1000 passes 60% threshold (1000 > 900)', () => {
        const existing = [makeBrigade(1000, 1500)];
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0)).toBe(true);
    });

    it('enclave brigade (max=1500) at 600 fails 60% threshold (600 < 900)', () => {
        const existing = [makeBrigade(600, 1500)];
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0)).toBe(false);
    });

    it('standard brigade (max=3000) at 1000 FAILS but enclave (max=1500) at 1000 PASSES', () => {
        // Standard: 1000 < 3000 * 0.60 = 1800 → false
        const standard = [makeBrigade(1000, 3000)];
        expect(canFormEmergentBrigade(standard, { available: 800 }, 600, 4, 0)).toBe(false);

        // Enclave: 1000 > 1500 * 0.60 = 900 → true
        const enclave = [makeBrigade(1000, 1500)];
        expect(canFormEmergentBrigade(enclave, { available: 800 }, 600, 4, 0)).toBe(true);
    });
});

describe('canFormEmergentBrigade — enclave lowered threshold (0.30)', () => {
    it('enclave threshold (0.30) allows formation when brigade at 600/1500', () => {
        const existing = [makeBrigade(600, 1500)]; // 40% > 30%
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0, ENCLAVE_FORMATION_CAPACITY_THRESHOLD)).toBe(true);
    });

    it('enclave threshold (0.30) blocks when brigade at 300/1500', () => {
        const existing = [makeBrigade(300, 1500)]; // 20% < 30%
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0, ENCLAVE_FORMATION_CAPACITY_THRESHOLD)).toBe(false);
    });

    it('enclave threshold (0.30) passes at exact boundary (450/1500 = 30%, strict less-than)', () => {
        const existing = [makeBrigade(450, 1500)]; // exactly 30% — not less than, so passes
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0, ENCLAVE_FORMATION_CAPACITY_THRESHOLD)).toBe(true);
    });

    it('enclave threshold (0.30) blocks just below boundary (449/1500)', () => {
        const existing = [makeBrigade(449, 1500)];
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0, ENCLAVE_FORMATION_CAPACITY_THRESHOLD)).toBe(false);
    });

    it('default threshold still works when no override passed', () => {
        // 1000/3000 = 33% < 60% default → false
        const existing = [makeBrigade(1000, 3000)];
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0)).toBe(false);
    });
});
