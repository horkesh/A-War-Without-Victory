import { describe, expect, it } from 'vitest';
import { getPeaceWarTransitionDateLabel } from '../../src/ui/map/components/PeaceWarTransition.js';

describe('PeaceWarTransition date label', () => {
    it('falls back from UNKNOWN metadata to the turn calendar date', () => {
        expect(getPeaceWarTransitionDateLabel({
            metadata: { turn: 0, date: 'UNKNOWN' },
            turn: 0,
        })).toBe('1 Apr 1992');
    });

    it('keeps authored metadata dates when present', () => {
        expect(getPeaceWarTransitionDateLabel({
            metadata: { turn: 4, date: '29 Apr 1992' },
            turn: 4,
        })).toBe('29 Apr 1992');
    });
});
