import { describe, it, expect } from 'vitest';

describe('stance-aware density gate', () => {
    function getStrainedThreshold(stance: string): number {
        return stance === 'offensive' ? 0.08 : stance === 'balanced' ? 0.12 : 0.167;
    }

    function isStrained(density: number, stance: string): boolean {
        if (density <= 0) return false;
        if (density < 0.10) return true; // critical always blocks
        return density < getStrainedThreshold(stance);
    }

    it('offensive corps NOT strained at 0.12 density', () => {
        expect(isStrained(0.12, 'offensive')).toBe(false);
    });

    it('defensive corps IS strained at 0.12 density', () => {
        expect(isStrained(0.12, 'defensive')).toBe(true);
    });

    it('balanced corps NOT strained at 0.13 density', () => {
        expect(isStrained(0.13, 'balanced')).toBe(false);
    });

    it('offensive corps strained below 0.08', () => {
        expect(isStrained(0.07, 'offensive')).toBe(true);
    });

    it('critical density blocks all stances', () => {
        expect(isStrained(0.05, 'offensive')).toBe(true);
        expect(isStrained(0.05, 'defensive')).toBe(true);
    });

    it('high density never strained', () => {
        expect(isStrained(0.5, 'offensive')).toBe(false);
        expect(isStrained(0.5, 'defensive')).toBe(false);
    });
});
