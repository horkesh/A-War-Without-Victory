import { describe, expect, it } from 'vitest';
import { buildChronicleChapters } from '../../src/ui/map/data/chronicleChapters.js';
import type { ChronicleEntry } from '../../src/ui/map/components/chronicle/generateChronicleEntries.js';

function entry(turn: number, title: string, overrides: Partial<ChronicleEntry> = {}): ChronicleEntry {
    return {
        turn,
        type: 'political',
        headline: false,
        title,
        detail: '',
        ...overrides,
    };
}

const timeline = {
    standing_orders: {
        RBiH: [
            { name: 'Survival Defense', start_week: 0, end_week: 12, army_stance: 'general_defensive', description: 'Hold.' },
            { name: 'Local Counterattacks', start_week: 12, end_week: 40, army_stance: 'balanced', description: 'Counterattack.' },
        ],
        RS: [
            { name: 'Territorial Seizure', start_week: 0, end_week: 26, army_stance: 'general_offensive', description: 'Seize.' },
        ],
    },
    doctrine_phases: {
        RBiH: [
            { start_week: 0, end_week: 15, default_corps_stance: 'defensive', max_attack_share_override: 0.1, aggression_modifier: -0.1 },
        ],
    },
};

describe('buildChronicleChapters', () => {
    it('groups entries by player-faction standing-order windows and preserves source ids', () => {
        const chapters = buildChronicleChapters(
            [
                entry(14, 'Counterattack begins', { id: 'chronicle-rbih-14' } as Partial<ChronicleEntry>),
                entry(2, 'Capital holds', { id: 'chronicle-rbih-2' } as Partial<ChronicleEntry>),
            ],
            { player_faction: 'RBiH', military: { war_timeline: timeline } },
        );

        expect(chapters.map(chapter => chapter.title)).toEqual([
            'Survival Defense',
            'Local Counterattacks',
        ]);
        expect(chapters.map(chapter => chapter.playerFaction)).toEqual(['RBiH', 'RBiH']);
        expect(chapters[0].sourceEntryIds).toEqual(['chronicle-rbih-2']);
        expect(chapters[1].sourceEntryIds).toEqual(['chronicle-rbih-14']);
        expect(chapters[0].sourceAftermathTurns).toEqual([2]);
    });

    it('uses the selected player faction instead of all-faction timeline windows', () => {
        const chapters = buildChronicleChapters(
            [
                entry(4, 'Early pressure'),
                entry(30, 'Late pressure'),
            ],
            { player_faction: 'RS', military: { war_timeline: timeline } },
        );

        expect(chapters.map(chapter => chapter.title)).toEqual(['Territorial Seizure']);
        expect(chapters[0].entries.map(ref => ref.turn)).toEqual([4]);
    });

    it('sorts chapter entries by turn then stable source id', () => {
        const chapters = buildChronicleChapters(
            [
                entry(8, 'Zulu', { id: 'z-entry' } as Partial<ChronicleEntry>),
                entry(8, 'Alpha', { id: 'a-entry' } as Partial<ChronicleEntry>),
            ],
            { player_faction: 'RBiH', military: { war_timeline: timeline } },
        );

        expect(chapters[0].sourceEntryIds).toEqual(['a-entry', 'z-entry']);
    });

    it('falls back to month chapters when campaign windows are absent', () => {
        const chapters = buildChronicleChapters(
            [
                entry(1, 'April note'),
                entry(7, 'May note'),
            ],
            { player_faction: 'RBiH', military: { war_timeline: { standing_orders: {}, doctrine_phases: {} } } },
        );

        expect(chapters.map(chapter => chapter.boundaryKind)).toEqual(['month', 'month']);
        expect(chapters.map(chapter => chapter.monthLabels[0])).toEqual(['Apr 1992', 'May 1992']);
    });

    it('adds month sublabels inside long campaign chapters', () => {
        const chapters = buildChronicleChapters(
            [
                entry(1, 'April note'),
                entry(7, 'May note'),
                entry(11, 'June note'),
            ],
            { player_faction: 'RBiH', military: { war_timeline: timeline } },
        );

        expect(chapters[0].title).toBe('Survival Defense');
        expect(chapters[0].monthLabels).toEqual(['Apr 1992', 'May 1992', 'Jun 1992']);
    });
});
