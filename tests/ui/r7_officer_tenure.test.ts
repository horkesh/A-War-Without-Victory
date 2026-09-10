import { describe, expect, it } from 'vitest';
import { formatTenure } from '../../src/ui/map/utils/officerCharacter.js';

describe('officer tenure readability', () => {
    it.each([
        [0, 'Newly assigned'],
        [1, '1w in command'],
        [4, '4w in command'],
        [5, '5w in command'],
        [52, '52w in command'],
    ] as const)('formats %i turns in weeks', (turns, expected) => {
        const label = formatTenure(turns);
        expect(label).toBe(expected);
        expect(label).not.toMatch(/\bmo(?:nth)?s?\b/i);
    });
});
