import type { ChronicleCardType, ChronicleEntry } from './generateChronicleEntries.js';

export type ChronicleFilterId = 'all' | 'headlines' | ChronicleCardType;

export const CHRONICLE_FILTERS: Array<{ id: ChronicleFilterId; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'headlines', label: 'Headlines' },
    { id: 'cost', label: 'Cost' },
    { id: 'combat', label: 'Combat' },
    { id: 'political', label: 'Political' },
    { id: 'humanitarian', label: 'Humanitarian' },
    { id: 'military', label: 'Military' },
    { id: 'personnel', label: 'Personnel' },
    { id: 'diplomatic', label: 'Diplomatic' },
    { id: 'narrative', label: 'Narrative' },
];

function emptyEntryCounts(): Record<ChronicleFilterId, number> {
    return {
        all: 0,
        headlines: 0,
        combat: 0,
        political: 0,
        humanitarian: 0,
        military: 0,
        personnel: 0,
        diplomatic: 0,
        narrative: 0,
        cost: 0,
    };
}

export function countChronicleEntriesByFilter(entries: ChronicleEntry[]): Record<ChronicleFilterId, number> {
    const counts = emptyEntryCounts();
    counts.all = entries.length;
    for (const entry of entries) {
        counts[entry.type] += 1;
        if (entry.headline) counts.headlines += 1;
    }
    return counts;
}

export function filterChronicleEntries(
    entries: ChronicleEntry[],
    activeFilter: ChronicleFilterId,
): ChronicleEntry[] {
    if (activeFilter === 'all') return entries;
    if (activeFilter === 'headlines') return entries.filter(entry => entry.headline);
    return entries.filter(entry => entry.type === activeFilter);
}
