import { describe, expect, it } from 'vitest';
import { buildChronicleChapters } from '../../src/ui/map/data/chronicleChapters.js';
import type { ChronicleEntry } from '../../src/ui/map/components/chronicle/generateChronicleEntries.js';

function entry(overrides: Partial<ChronicleEntry>): ChronicleEntry {
    return {
        turn: 1,
        type: 'narrative',
        headline: false,
        title: 'Filed note',
        detail: 'A sourced chronicle entry.',
        ...overrides,
    };
}

describe('Chronicle chapter narrative guardrails', () => {
    it('does not cite ids outside source Chronicle entries', () => {
        const chapters = buildChronicleChapters(
            [
                entry({ title: 'First', id: 'source-a' } as Partial<ChronicleEntry>),
                entry({ title: 'Second', id: 'source-b' } as Partial<ChronicleEntry>),
            ],
            { player_faction: 'RBiH', military: { war_timeline: { standing_orders: {}, doctrine_phases: {} } } },
        );

        expect(chapters).toHaveLength(1);
        expect(chapters[0].sourceEntryIds).toEqual(['source-a', 'source-b']);
        expect(chapters[0].entries.map(ref => ref.sourceEntryId)).toEqual(['source-a', 'source-b']);
    });

    it('does not mark atrocity or rupture signals unless source entries contain that signal', () => {
        const chapters = buildChronicleChapters(
            [entry({ title: 'Front stabilizes', detail: 'No sensitive-history claim here.' })],
            { player_faction: 'RBiH', military: { war_timeline: { standing_orders: {}, doctrine_phases: {} } } },
        );

        expect(chapters[0].signals).toEqual({ atrocity: false, rupture: false });
        expect(`${chapters[0].title} ${chapters[0].summary}`).not.toMatch(/atrocity|rupture|genocide/i);
    });

    it('inherits rupture and atrocity flags only from source entries', () => {
        const chapters = buildChronicleChapters(
            [
                entry({
                    id: 'srebrenica-source',
                    title: 'Historical rupture absent',
                    detail: 'Srebrenica enclave survived in your war; the historical July 1995 catastrophe never arrived.',
                    metadata: { sensitiveSignals: ['rupture', 'atrocity'] } as ChronicleEntry['metadata'],
                }),
            ],
            { player_faction: 'RBiH', military: { war_timeline: { standing_orders: {}, doctrine_phases: {} } } },
        );

        expect(chapters[0].signals).toEqual({ atrocity: true, rupture: true });
        expect(chapters[0].sourceEntryIds).toEqual(['srebrenica-source']);
    });
});
