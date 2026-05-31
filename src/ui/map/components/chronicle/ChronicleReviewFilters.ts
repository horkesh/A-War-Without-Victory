import type { ChronicleCardType, ChronicleEntry } from './generateChronicleEntries.js';
import { t, type MessageKey } from '../../i18n';

export type ChronicleFilterId = 'all' | 'headlines' | ChronicleCardType;

export const CHRONICLE_FILTERS: Array<{ id: ChronicleFilterId; labelKey: MessageKey }> = [
    { id: 'all', labelKey: 'chronicle.filter.all' },
    { id: 'headlines', labelKey: 'chronicle.filter.headlines' },
    { id: 'cost', labelKey: 'chronicle.filter.cost' },
    { id: 'combat', labelKey: 'chronicle.filter.combat' },
    { id: 'political', labelKey: 'chronicle.filter.political' },
    { id: 'humanitarian', labelKey: 'chronicle.filter.humanitarian' },
    { id: 'military', labelKey: 'chronicle.filter.military' },
    { id: 'personnel', labelKey: 'chronicle.filter.personnel' },
    { id: 'diplomatic', labelKey: 'chronicle.filter.diplomatic' },
    { id: 'narrative', labelKey: 'chronicle.filter.narrative' },
    { id: 'consequence', labelKey: 'chronicle.filter.consequence' },
];

export function chronicleFilterLabel(filter: { labelKey: MessageKey }): string {
    return t(filter.labelKey);
}

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
        consequence: 0,
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
