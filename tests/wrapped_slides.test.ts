import { afterEach, describe, it, expect } from 'vitest';
import { generateWrappedSlides } from '../src/ui/map/components/chronicle/generateWrappedSlides.js';
import { turnToDateString } from '../src/ui/map/utils/formatters.js';
import { setLocale } from '../src/ui/map/i18n/index.js';

function makeTurnSummary(turn: number, overrides: Record<string, any> = {}) {
    return {
        turn,
        battles: [],
        territory_net: {},
        notable_flips: [],
        events_fired: [],
        notable_events: [],
        decoration_awards: [],
        arc_transitions: [],
        formation_spawns: [],
        formation_destructions: [],
        displacement_total: 0,
        displacement_by_ethnicity: {},
        supply_deltas: {},
        heavy_munitions_deltas: {},
        movements: [],
        supply_transitions: [],
        ...overrides,
    };
}

function makeMinimalState(overrides: Record<string, any> = {}) {
    return {
        turn: 20,
        phase: 'war',
        player_faction: 'RBiH',
        turnSummaries: [],
        formations: [],
        firedEvents: [],
        historicalEventsByTurn: [],
        strategicDimensions: undefined,
        negotiatingCapital: undefined,
        ...overrides,
    };
}

describe('generateWrappedSlides', () => {
    afterEach(() => {
        setLocale('en');
    });

    it('returns exactly 10 slides for null state', () => {
        const slides = generateWrappedSlides(null);
        expect(slides).toHaveLength(10);
    });

    it('returns exactly 10 slides for empty state', () => {
        const slides = generateWrappedSlides({});
        expect(slides).toHaveLength(10);
    });

    it('returns exactly 10 slides for minimal state', () => {
        const slides = generateWrappedSlides(makeMinimalState());
        expect(slides).toHaveLength(10);
    });

    it('all slides have required fields', () => {
        const slides = generateWrappedSlides(makeMinimalState());
        for (const slide of slides) {
            expect(slide.id).toBeTruthy();
            expect(slide.title).toBeTruthy();
            expect(typeof slide.subtitle).toBe('string');
        }
    });

    it('slide IDs are unique', () => {
        const slides = generateWrappedSlides(makeMinimalState());
        const ids = slides.map(s => s.id);
        expect(new Set(ids).size).toBe(10);
    });

    it('slide IDs match expected set', () => {
        const slides = generateWrappedSlides(makeMinimalState());
        const ids = slides.map(s => s.id);
        expect(ids).toEqual([
            'your_war',
            'the_opening',
            'bloodiest_week',
            'best_brigade',
            'what_you_built',
            'what_it_cost',
            'world_watching',
            'your_decisions',
            'at_the_table',
            'another_such_victory',
        ]);
    });

    describe('your_war slide', () => {
        it('includes faction and turn count', () => {
            const slides = generateWrappedSlides(makeMinimalState({ turn: 40, player_faction: 'RS' }));
            const slide = slides.find(s => s.id === 'your_war')!;
            expect(slide.heroValue).toBe('40');
            expect(slide.subtitle).toContain('Republika Srpska');
            expect(slide.subtitle).not.toContain('RS');
            expect(slide.subtitle).toContain('40');
            expect(slide.data?.faction).toBe('RS');
        });
    });

    describe('bloodiest_week slide', () => {
        it('identifies the turn with most casualties', () => {
            const state = makeMinimalState({
                turnSummaries: [
                    makeTurnSummary(5, {
                        battles: [
                            { attacker_casualties: 100, defender_casualties: 50 },
                        ],
                    }),
                    makeTurnSummary(12, {
                        battles: [
                            { attacker_casualties: 300, defender_casualties: 200 },
                            { attacker_casualties: 150, defender_casualties: 100 },
                        ],
                    }),
                    makeTurnSummary(20, {
                        battles: [
                            { attacker_casualties: 50, defender_casualties: 30 },
                        ],
                    }),
                ],
            });
            const slide = generateWrappedSlides(state).find(s => s.id === 'bloodiest_week')!;
            expect(slide.data?.bloodiestTurn).toBe(12);
            expect(slide.data?.bloodiestCasualties).toBe(750);
            expect(slide.heroValue).toBe('750');
        });

        it('uses calendar date copy instead of raw Week or Turn labels', () => {
            const state = makeMinimalState({
                turnSummaries: [
                    makeTurnSummary(12, {
                        battles: [
                            { attacker_casualties: 300, defender_casualties: 200 },
                        ],
                    }),
                ],
            });
            const slide = generateWrappedSlides(state).find(s => s.id === 'bloodiest_week')!;
            const visibleCopy = [slide.subtitle, slide.detail].filter(Boolean).join(' ');

            expect(visibleCopy).toContain(turnToDateString(12));
            expect(visibleCopy).not.toMatch(/\bWeek\s+12\b/);
            expect(visibleCopy).not.toMatch(/\bTurn\s+12\b/);
            expect(slide.data?.bloodiestTurn).toBe(12);
        });

        it('handles no battles gracefully', () => {
            const slide = generateWrappedSlides(makeMinimalState()).find(s => s.id === 'bloodiest_week')!;
            expect(slide.heroValue).toBe('0');
            expect(slide.data?.bloodiestCasualties).toBe(0);
        });

        it('does not publish zero as the bloodiest week when battle casualty fields are unreported', () => {
            const state = makeMinimalState({
                turnSummaries: [
                    makeTurnSummary(5, {
                        battles: [
                            { attacker_faction: 'RBiH', defender_faction: 'RS', casualties_reported: false },
                            { attacker_faction: 'RBiH', defender_faction: 'RS' },
                        ],
                    }),
                ],
            });
            const slide = generateWrappedSlides(state).find(s => s.id === 'bloodiest_week')!;
            expect(slide.heroValue).toBe('Unreported');
            expect(slide.data?.bloodiestCasualties).toBeNull();
        });
    });

    describe('best_brigade slide', () => {
        it('picks brigade with most decorations and battles', () => {
            const state = makeMinimalState({
                formations: [
                    { id: 'b1', kind: 'brigade', name: '1st Brigade', decorations: [{ tier: 'gold', type: 'valor' }], combatSummary: { battles_fought: 5 } },
                    { id: 'b2', kind: 'brigade', name: '2nd Brigade', decorations: [{ tier: 'gold', type: 'valor' }, { tier: 'silver', type: 'merit' }], combatSummary: { battles_fought: 10 } },
                    { id: 'c1', kind: 'corps', name: '1st Corps' },
                ],
            });
            const slide = generateWrappedSlides(state).find(s => s.id === 'best_brigade')!;
            expect(slide.data?.brigadeId).toBe('b2');
            expect(slide.heroValue).toBe('2nd Brigade');
        });

        it('handles no brigades gracefully', () => {
            const slide = generateWrappedSlides(makeMinimalState()).find(s => s.id === 'best_brigade')!;
            expect(slide.heroValue).toBe('-');
        });
    });

    describe('what_it_cost slide', () => {
        it('sums all casualties and displacement', () => {
            const state = makeMinimalState({
                turnSummaries: [
                    makeTurnSummary(1, {
                        battles: [{ attacker_casualties: 100, defender_casualties: 80 }],
                        displacement_total: 500,
                    }),
                    makeTurnSummary(2, {
                        battles: [{ attacker_casualties: 200, defender_casualties: 150 }],
                        displacement_total: 1000,
                    }),
                ],
            });
            const slide = generateWrappedSlides(state).find(s => s.id === 'what_it_cost')!;
            expect(slide.data?.totalCasualties).toBe(530);
            expect(slide.data?.totalDisplaced).toBe(1500);
        });

        it('renders campaign casualty cost as unreported when battle casualty fields are absent', () => {
            const state = makeMinimalState({
                turnSummaries: [
                    makeTurnSummary(1, {
                        battles: [{ attacker_faction: 'RBiH', defender_faction: 'RS', casualties_reported: false }],
                        displacement_total: 500,
                    }),
                ],
            });
            const slide = generateWrappedSlides(state).find(s => s.id === 'what_it_cost')!;
            expect(slide.heroValue).toBe('Unreported');
            expect(slide.data?.totalCasualties).toBeNull();
            expect(slide.data?.totalDisplaced).toBe(500);
        });
    });

    describe('world_watching slide', () => {
        it('shows international standing when available', () => {
            const state = makeMinimalState({
                player_faction: 'RBiH',
                strategicDimensions: {
                    RBiH: {
                        international_standing: { base_value: 60, event_modifier: 5, effective_value: 65 },
                    },
                },
            });
            const slide = generateWrappedSlides(state).find(s => s.id === 'world_watching')!;
            expect(slide.heroValue).toBe('65.0');
        });

        it('shows dash when no dimensions available', () => {
            const slide = generateWrappedSlides(makeMinimalState()).find(s => s.id === 'world_watching')!;
            expect(slide.heroValue).toBe('-');
        });
    });

    describe('your_decisions slide', () => {
        it('counts decision events', () => {
            const state = makeMinimalState({
                firedEvents: [
                    { id: 'e1', isDecision: true, turn: 5, title: 'Choice A', narrative: '', category: '', effects: [] },
                    { id: 'e2', isDecision: false, turn: 6, title: 'Narrative B', narrative: '', category: '', effects: [] },
                    { id: 'e3', isDecision: true, turn: 8, title: 'Choice C', narrative: '', category: '', effects: [] },
                ],
                historicalEventsByTurn: [
                    { turn: 3, id: 'h1', text: 'Historical event' },
                ],
            });
            const slide = generateWrappedSlides(state).find(s => s.id === 'your_decisions')!;
            expect(slide.data?.decisionCount).toBe(2);
            expect(slide.heroValue).toBe('2');
            expect(slide.data?.totalEvents).toBe(4);
        });
    });

    describe('at_the_table slide', () => {
        it('shows negotiating capital', () => {
            const state = makeMinimalState({
                player_faction: 'RS',
                negotiatingCapital: { RS: 72.5, RBiH: 55.3, HRHB: 40.1 },
            });
            const slide = generateWrappedSlides(state).find(s => s.id === 'at_the_table')!;
            expect(slide.heroValue).toBe('73');
            expect(slide.detail).toContain('Republika Srpska: 73');
            expect(slide.detail).toContain('Republic of Bosnia and Herzegovina: 55');
            expect(slide.detail).toContain('Croatian Republic of Herzeg-Bosnia: 40');
            expect(slide.detail).not.toMatch(/\b(?:RBiH|RS|HRHB)\b/);
        });

        it('localizes negotiating capital faction labels in BCS mode', () => {
            setLocale('bcs');
            const state = makeMinimalState({
                player_faction: 'HRHB',
                negotiatingCapital: { RS: 72.5, RBiH: 55.3, HRHB: 40.1 },
            });
            const slide = generateWrappedSlides(state).find(s => s.id === 'at_the_table')!;
            const copy = `${slide.subtitle} ${slide.detail}`;

            expect(copy).toContain('Republika Srpska: 73');
            expect(copy).toContain('Republika Bosna i Hercegovina: 55');
            expect(copy).toContain('Hrvatska Republika Herceg-Bosna: 40');
            expect(copy).not.toContain('Republic of Bosnia and Herzegovina');
            expect(copy).not.toContain('Croatian Republic of Herzeg-Bosnia');
            expect(copy).not.toMatch(/\b(?:RBiH|RS|HRHB)\b/);
        });
    });

    describe('another_such_victory slide', () => {
        it('includes final dimension values in data', () => {
            const state = makeMinimalState({
                player_faction: 'RBiH',
                strategicDimensions: {
                    RBiH: {
                        military_credibility: { base_value: 50, event_modifier: 10, effective_value: 60 },
                        international_standing: { base_value: 40, event_modifier: -5, effective_value: 35 },
                    },
                },
                negotiatingCapital: { RBiH: 48.0 },
            });
            const slide = generateWrappedSlides(state).find(s => s.id === 'another_such_victory')!;
            expect(slide.data?.military_credibility).toBe(60);
            expect(slide.data?.international_standing).toBe(35);
            expect(slide.heroValue).toBe('48');
        });

        it('surfaces historical divergence notes when comparison data exists', () => {
            const state = makeMinimalState({
                player_faction: 'RBiH',
                negotiatingCapital: { RBiH: 48.0 },
                historicalComparison: {
                    divergence_notes: [
                        'War lasted 18 weeks shorter than the historical 188 weeks',
                        'Federation controlled 54.0% territory vs historical 51%',
                    ],
                },
            });
            const slide = generateWrappedSlides(state).find(s => s.id === 'another_such_victory')!;
            expect(slide.subtitle).toBe('History remembered this war differently');
            expect(slide.bullets).toEqual([
                'War lasted 18 weeks shorter than the historical 188 weeks',
                'Federation controlled 54.0% territory vs historical 51%',
            ]);
        });

        it('handles missing dimensions gracefully', () => {
            const slide = generateWrappedSlides(makeMinimalState()).find(s => s.id === 'another_such_victory')!;
            expect(slide.data).toEqual({});
        });
    });

    describe('the_opening slide', () => {
        it('counts early territory changes for player faction', () => {
            const state = makeMinimalState({
                player_faction: 'RS',
                turnSummaries: [
                    makeTurnSummary(1, { territory_net: { RS: 5, RBiH: -3 }, battles: [{ osid: 'op:a:a_2' }] }),
                    makeTurnSummary(3, { territory_net: { RS: -2, RBiH: 1 }, battles: [] }),
                    makeTurnSummary(7, { territory_net: { RS: 8 }, battles: [{ osid: 'op:b:b_2' }, { osid: 'op:c:c_2' }] }),
                    makeTurnSummary(15, { territory_net: { RS: 100 }, battles: [{ osid: 'op:d:d_2' }] }),
                ],
            });
            const slide = generateWrappedSlides(state).find(s => s.id === 'the_opening')!;
            expect(slide.data?.earlyGains).toBe(13);
            expect(slide.data?.earlyLosses).toBe(2);
            expect(slide.data?.earlyBattles).toBe(3);
            expect(slide.detail).toContain('positions');
            expect(slide.detail).not.toContain('OSIDs');
        });

        it('ignores turn-0 territory provenance when counting early and peak gains', () => {
            const state = makeMinimalState({
                player_faction: 'RBiH',
                turnSummaries: [
                    makeTurnSummary(0, {
                        territory_net: { RBiH: 20, RS: -20 },
                        notable_flips: [
                            { osid: 'op:sarajevo:centar', mun_id: 'sarajevo', from: 'RS', to: 'RBiH', significance: 'municipality_seat' },
                        ],
                    }),
                    makeTurnSummary(1, { territory_net: { RBiH: 2 } }),
                    makeTurnSummary(2, { territory_net: { RBiH: -1 } }),
                ],
            });

            const opening = generateWrappedSlides(state).find(s => s.id === 'the_opening')!;
            const built = generateWrappedSlides(state).find(s => s.id === 'what_you_built')!;

            expect(opening.data?.earlyGains).toBe(2);
            expect(opening.data?.earlyLosses).toBe(1);
            expect(opening.detail).toBe('Territory shifts: +2 / -1 positions');
            expect(built.data?.peakTerritory).toBe(2);
            expect(built.data?.totalGained).toBe(2);
            expect(built.detail).toContain('Peak territory gain: +2 positions');
            expect(JSON.stringify(opening.data)).not.toContain('20');
            expect(JSON.stringify(built.data)).not.toContain('20');
        });
    });

    it('keeps wrapped vocabulary player-safe', () => {
        const slides = generateWrappedSlides(makeMinimalState({
            player_faction: 'RBiH',
            turnSummaries: [
                makeTurnSummary(1, { territory_net: { RBiH: 2 } }),
                makeTurnSummary(2, { territory_net: { RBiH: -1 } }),
            ],
            negotiatingCapital: { RBiH: 14, RS: 9, HRHB: 7 },
        }));

        const summaryText = slides
            .flatMap((slide) => [
                slide.title,
                slide.subtitle,
                slide.heroValue,
                slide.heroLabel,
                slide.detail,
                ...(slide.bullets ?? []),
            ].filter(Boolean))
            .join(' ');

        expect(summaryText).toContain('Republic of Bosnia and Herzegovina');
        expect(summaryText).not.toMatch(/\b(?:RBiH|RS|HRHB)\b/);
        expect(summaryText).not.toContain(' OSID');
    });

    it('uses localized player faction labels in BCS wrapped copy', () => {
        setLocale('bcs');
        const slides = generateWrappedSlides(makeMinimalState({
            player_faction: 'RBiH',
            negotiatingCapital: { RBiH: 14, RS: 9, HRHB: 7 },
        }));

        const summaryText = slides
            .flatMap((slide) => [
                slide.title,
                slide.subtitle,
                slide.heroValue,
                slide.heroLabel,
                slide.detail,
                ...(slide.bullets ?? []),
            ].filter(Boolean))
            .join(' ');

        expect(summaryText).toContain('Republika Bosna i Hercegovina');
        expect(summaryText).toContain('Hrvatska Republika Herceg-Bosna');
        expect(summaryText).not.toContain('Republic of Bosnia and Herzegovina');
        expect(summaryText).not.toContain('Croatian Republic of Herzeg-Bosnia');
        expect(summaryText).not.toMatch(/\b(?:RBiH|RS|HRHB)\b/);
    });

    it('localizes generated BCS wrapped slide prose, labels, and fallbacks', () => {
        setLocale('bcs');
        const slides = generateWrappedSlides(makeMinimalState({
            turn: 12,
            phase: 'war',
            player_faction: 'RBiH',
            turnSummaries: [
                makeTurnSummary(1, { territory_net: { RBiH: 2 }, battles: [{ attacker_casualties: 15, defender_casualties: 20 }] }),
                makeTurnSummary(4, { displacement_total: 120 }),
                makeTurnSummary(8, { territory_net: { RBiH: -1 }, battles: [{ attacker_casualties: 40, defender_casualties: 30 }] }),
            ],
            formations: [
                { id: 'brig-1', kind: 'brigade', faction: 'RBiH', name: '1. brigada', decorations: [{ tier: 'gold' }], combatSummary: { battles_fought: 3 } },
            ],
            firedEvents: [{ id: 'decision-1', isDecision: true }],
            historicalEventsByTurn: [{ id: 'historical-1' }],
            strategicDimensions: {
                RBiH: {
                    international_standing: { base_value: 45, event_modifier: 2, effective_value: 47 },
                    military_credibility: { base_value: 50, event_modifier: 5, effective_value: 55 },
                },
            },
            negotiatingCapital: { RBiH: 14, RS: 9, HRHB: 7 },
        }));

        const summaryText = slides
            .flatMap((slide) => [
                slide.title,
                slide.subtitle,
                slide.heroValue,
                slide.heroLabel,
                slide.detail,
                ...(slide.bullets ?? []),
            ].filter(Boolean))
            .join(' ');

        expect(summaryText).toContain('Republika Bosna i Hercegovina');
        expect(summaryText).not.toMatch(/Your War|You led|weeks of conflict|Campaign phase|weeks at war/i);
        expect(summaryText).not.toMatch(/The Opening|first 8 weeks|early battles|Territory shifts|positions/i);
        expect(summaryText).not.toMatch(/Bloodiest Week|No battles recorded|casualties in one week|Fighting peaked/i);
        expect(summaryText).not.toMatch(/Best Brigade|stood above the rest|decorations|battles|No brigades found/i);
        expect(summaryText).not.toMatch(/What You Built|forces at their peak|formations fielded|Peak territory gain|Operations launched/i);
        expect(summaryText).not.toMatch(/What It Cost|price of this war|total casualties|people displaced/i);
        expect(summaryText).not.toMatch(/World Was Watching|international standing|Base:|modifier|unavailable/i);
        expect(summaryText).not.toMatch(/Your Decisions|critical decisions?|No decision events recorded|decisions made|total events witnessed/i);
        expect(summaryText).not.toMatch(/At the Table|negotiating capital|Negotiating capital data unavailable/i);
        expect(summaryText).not.toMatch(/Another Such Victory|History remembered|final score|And we are undone/i);
    });
});
