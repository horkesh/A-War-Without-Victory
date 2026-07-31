import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    buildPeaceWarFactionSummaries,
    getPeaceWarTransitionDateLabel,
} from '../../src/ui/map/components/PeaceWarTransition.js';

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

    it('keeps absent opening force reports unreported instead of converting them to zero', () => {
        const summaries = buildPeaceWarFactionSummaries([
            {
                id: 'vrs_unreported',
                kind: 'brigade',
                faction: 'RS',
                personnel: undefined,
                composition: undefined,
            },
        ] as never);

        expect(summaries.RS).toEqual({
            brigades: 1,
            personnel: null,
            tanks: null,
            artillery: null,
        });
    });

    it('sums opening force metrics only when every contributing brigade reports them', () => {
        const summaries = buildPeaceWarFactionSummaries([
            {
                id: 'arbih_1',
                kind: 'brigade',
                faction: 'RBiH',
                personnel: 900,
                composition: { tanks: 2, artillery: 4 },
            },
            {
                id: 'arbih_2',
                kind: 'brigade',
                faction: 'RBiH',
                personnel: 700,
                composition: { tanks: 1, artillery: 3 },
            },
        ] as never);

        expect(summaries.RBiH).toEqual({
            brigades: 2,
            personnel: 1600,
            tanks: 3,
            artillery: 7,
        });
    });
});
