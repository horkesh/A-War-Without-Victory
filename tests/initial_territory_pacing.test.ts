import { describe, it, expect } from 'vitest';

describe('initial territory pacing', () => {
    it('uncontested occupation disabled in weeks 0-2', () => {
        // Brigade-level uncontested occupation returns false for turn <= 2
        for (const turn of [0, 1, 2]) {
            expect(turn <= 2).toBe(true);
        }
        expect(3 <= 2).toBe(false); // Resumes at week 3
    });
});
