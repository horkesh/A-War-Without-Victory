import { afterEach, describe, expect, it } from 'vitest';
import {
    buildChronicleCampaignRecap,
    buildChronicleChapters,
    chronicleTypeLabel,
    formatChronicleBoundaryKind,
    formatChronicleChapterDateRange,
    formatChronicleTurnDateRange,
} from '../../src/ui/map/data/chronicleChapters.js';
import type { ChronicleEntry } from '../../src/ui/map/components/chronicle/generateChronicleEntries.js';
import { setLocale } from '../../src/ui/map/i18n';

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

afterEach(() => {
    setLocale('en');
});

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
        expect(chapters[0].summary).toBe('Across Apr 1992, 1 sourced entry makes politics the dominant thread; no headline records anchor the chapter.');
    });

    it('writes deterministic prose summaries from chapter entry types and headline count', () => {
        const chapters = buildChronicleChapters(
            [
                entry(1, 'Cost of the week', { type: 'cost', headline: true } as Partial<ChronicleEntry>),
                entry(2, 'Front line holds', { type: 'combat' } as Partial<ChronicleEntry>),
                entry(7, 'Another costly week', { type: 'cost', headline: true } as Partial<ChronicleEntry>),
            ],
            { player_faction: 'RBiH', military: { war_timeline: timeline } },
        );

        expect(chapters[0].summary).toBe('Across Apr 1992-May 1992, 3 sourced entries make cost the dominant thread; 2 headline records anchor the chapter.');
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

    it('uses player-facing doctrine chapter titles when standing orders are absent', () => {
        const chapters = buildChronicleChapters(
            [
                entry(2, 'Opening directive'),
            ],
            {
                player_faction: 'RS',
                military: {
                    war_timeline: {
                        standing_orders: {},
                        doctrine_phases: {
                            RS: [
                                { start_week: 0, end_week: 12, default_corps_stance: 'general_offensive' },
                            ],
                        },
                    },
                },
            },
        );

        expect(chapters[0].title).toBe('Doctrine Phase 1: Offensive posture');
        expect(chapters[0].title).not.toContain('general_offensive');
        expect(chapters[0].title).not.toContain('general offensive');
    });

    it('formats chapter timing and boundary kind without raw turn or enum copy', () => {
        const chapters = buildChronicleChapters(
            [
                entry(0, 'Opening note'),
                entry(2, 'Second note'),
            ],
            { player_faction: 'RBiH', military: { war_timeline: timeline } },
        );

        expect(formatChronicleTurnDateRange(0, 0)).toBe('6 Apr 1992');
        expect(formatChronicleChapterDateRange(chapters[0])).toBe('6 Apr 1992 - 20 Apr 1992');
        expect(formatChronicleBoundaryKind(chapters[0].boundaryKind)).toBe('Campaign order');
        expect(formatChronicleBoundaryKind('doctrine_phase')).toBe('Doctrine posture');
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

    it('synthesizes a deterministic campaign recap across chapters', () => {
        const chapters = buildChronicleChapters(
            [
                entry(1, 'Cost of the week', { type: 'cost', headline: true } as Partial<ChronicleEntry>),
                entry(2, 'Front line holds', { type: 'combat' } as Partial<ChronicleEntry>),
                entry(14, 'Political rupture', {
                    type: 'political',
                    headline: true,
                    metadata: { sensitiveSignals: ['rupture'] },
                } as Partial<ChronicleEntry>),
            ],
            { player_faction: 'RBiH', military: { war_timeline: timeline } },
        );

        expect(buildChronicleCampaignRecap(chapters)).toEqual({
            id: 'chronicle-campaign-recap-1-14',
            chapterCount: 2,
            entryCount: 3,
            headlineCount: 2,
            monthRange: 'Apr 1992-Jul 1992',
            dominantType: 'combat',
            signalChapterCount: 1,
            openingChapterTitle: 'Survival Defense',
            closingChapterTitle: 'Local Counterattacks',
        });
    });

    it('localizes generated BCS chapter summaries, type labels, and boundary labels', () => {
        setLocale('bcs');
        const chapters = buildChronicleChapters(
            [
                entry(1, 'Cijena sedmice', { type: 'cost', headline: true } as Partial<ChronicleEntry>),
                entry(2, 'Linija se drzi', { type: 'combat' } as Partial<ChronicleEntry>),
                entry(7, 'Jos jedna teska sedmica', { type: 'cost', headline: true } as Partial<ChronicleEntry>),
            ],
            { player_faction: 'RBiH', military: { war_timeline: timeline } },
        );

        const summary = chapters[0].summary;
        expect(summary).not.toMatch(/Across|sourced entries|sourced entry|dominant thread|headline records|anchor the chapter/i);
        expect(summary).toMatch(/zapisa|glavn/i);
        expect(formatChronicleBoundaryKind(chapters[0].boundaryKind)).not.toBe('Campaign order');
        expect(formatChronicleBoundaryKind('doctrine_phase')).not.toBe('Doctrine posture');
        expect(chronicleTypeLabel('humanitarian')).not.toBe('humanitarian pressure');
        expect(chronicleTypeLabel('military')).not.toBe('military affairs');
    });

    it('localizes generated BCS doctrine fallback chapter titles', () => {
        setLocale('bcs');
        const chapters = buildChronicleChapters(
            [entry(2, 'Pocetna direktiva')],
            {
                player_faction: 'RS',
                military: {
                    war_timeline: {
                        standing_orders: {},
                        doctrine_phases: {
                            RS: [
                                { start_week: 0, end_week: 12, default_corps_stance: 'general_offensive' },
                            ],
                        },
                    },
                },
            },
        );

        expect(chapters[0].title).not.toMatch(/Doctrine Phase|Offensive posture|general_offensive/i);
        expect(chapters[0].title).toMatch(/doktrin|ofanziv/i);
    });
});
