import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getPeaceWarTransitionDateLabel } from '../../src/ui/map/components/PeaceWarTransition.js';

describe('PeaceWarTransition date label', () => {
    it('falls back from UNKNOWN metadata to the turn calendar date', () => {
        expect(getPeaceWarTransitionDateLabel({
            metadata: { turn: 0, date: 'UNKNOWN' },
            turn: 0,
        })).toBe('6 Apr 1992');
    });

    it('keeps authored metadata dates when present', () => {
        expect(getPeaceWarTransitionDateLabel({
            metadata: { turn: 4, date: '29 Apr 1992' },
            turn: 4,
        })).toBe('29 Apr 1992');
    });

    it('strips turn suffixes from authored metadata dates', () => {
        expect(getPeaceWarTransitionDateLabel({
            metadata: { turn: 0, date: '1 Apr 1992 · Turn 0 (War)' },
            turn: 0,
        })).toBe('1 Apr 1992');
    });

    it('keeps the Begin action visible inside the scrollable war-start overlay', () => {
        const source = readFileSync(resolve('src/ui/map/components/PeaceWarTransition.tsx'), 'utf8');

        expect(source).toContain('sticky bottom-0');
        expect(source).toContain('bg-panel-bg/95');
    });
});
