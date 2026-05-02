import { describe, expect, it } from 'vitest';
import {
    CHRONICLE_FILTERS,
    countChronicleEntriesByFilter,
    filterChronicleEntries,
} from '../src/ui/map/components/chronicle/ChronicleReviewFilters.js';
import type { ChronicleEntry } from '../src/ui/map/components/chronicle/generateChronicleEntries.js';

const entries: ChronicleEntry[] = [
    { turn: 10, type: 'combat', headline: true, title: 'Battle of Brcko', detail: 'Control changed hands.' },
    { turn: 10, type: 'cost', headline: true, title: 'Critical campaign cost', detail: 'Heavy losses.' },
    { turn: 11, type: 'political', headline: false, title: 'Assembly dispute', detail: 'A tense session.' },
    { turn: 12, type: 'diplomatic', headline: false, title: 'Talks resume', detail: 'Foreign envoys arrive.' },
];

describe('Chronicle review tools wiring', () => {
    it('defines the canonical Chronicle filter set', () => {
        expect(CHRONICLE_FILTERS.map(filter => filter.id)).toEqual([
            'all',
            'headlines',
            'cost',
            'combat',
            'political',
            'humanitarian',
            'military',
            'diplomatic',
            'narrative',
        ]);
    });

    it('counts entries for every review lens from one archive', () => {
        const counts = countChronicleEntriesByFilter(entries);

        expect(counts.all).toBe(4);
        expect(counts.headlines).toBe(2);
        expect(counts.cost).toBe(1);
        expect(counts.combat).toBe(1);
        expect(counts.political).toBe(1);
        expect(counts.diplomatic).toBe(1);
        expect(counts.humanitarian).toBe(0);
    });

    it('filters the archive by headlines and card type without reordering entries', () => {
        expect(filterChronicleEntries(entries, 'all')).toBe(entries);
        expect(filterChronicleEntries(entries, 'headlines').map(entry => entry.title)).toEqual([
            'Battle of Brcko',
            'Critical campaign cost',
        ]);
        expect(filterChronicleEntries(entries, 'cost').map(entry => entry.title)).toEqual([
            'Critical campaign cost',
        ]);
        expect(filterChronicleEntries(entries, 'humanitarian')).toEqual([]);
    });
});
