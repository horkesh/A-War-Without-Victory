import { describe, expect, it } from 'vitest';

import { generateWrappedSlides } from '../../src/ui/map/components/chronicle/generateWrappedSlides.js';

function slideData(slides: ReturnType<typeof generateWrappedSlides>, id: string): Record<string, unknown> {
    return slides.find((slide) => slide.id === id)?.data ?? {};
}

describe('Chronicle Wrapped setup provenance', () => {
    it('ignores setup summaries when calculating campaign-history slides', () => {
        const slides = generateWrappedSlides({
            turn: 12,
            phase: 'war',
            player_faction: 'RBiH',
            formations: [],
            firedEvents: [],
            historicalEventsByTurn: [],
            turnSummaries: [
                {
                    turn: 0,
                    mechanism: 'setup_control',
                    source: 'setup',
                    territory_net: { RBiH: 20 },
                    battles: [{ attacker_casualties: 40, defender_casualties: 60 }],
                    notable_events: [{ text: 'Operation setup launch' }],
                    displacement_total: 2000,
                },
                {
                    turn: 4,
                    summary_kind: 'scenario_start',
                    territory_net: { RBiH: -10 },
                    battles: [{ attacker_casualties: 10, defender_casualties: 5 }],
                    notable_events: [{ text: 'Operation scenario launch' }],
                    displacement_total: 1000,
                },
                {
                    turn: 8,
                    territory_net: { RBiH: 3 },
                    battles: [{ attacker_casualties: 7, defender_casualties: 8 }],
                    notable_events: [{ text: 'Operation city relief launch' }],
                    displacement_total: 300,
                },
            ],
        } as any);

        expect(slideData(slides, 'the_opening')).toMatchObject({
            earlyGains: 3,
            earlyLosses: 0,
            earlyBattles: 1,
        });
        expect(slideData(slides, 'bloodiest_week')).toMatchObject({
            bloodiestTurn: 8,
            bloodiestCasualties: 15,
        });
        expect(slideData(slides, 'what_you_built')).toMatchObject({
            opsLaunched: 1,
        });
        expect(slideData(slides, 'what_it_cost')).toMatchObject({
            totalCasualties: 15,
            totalDisplaced: 300,
        });
    });
});
