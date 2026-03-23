import { describe, it, expect } from 'vitest';
import { generateWrappedSlides, WrappedSlide } from '../src/ui/map/components/chronicle/generateWrappedSlides.js';

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
            expect(slide.subtitle).toContain('RS');
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

        it('handles no battles gracefully', () => {
            const slide = generateWrappedSlides(makeMinimalState()).find(s => s.id === 'bloodiest_week')!;
            expect(slide.heroValue).toBe('0');
            expect(slide.data?.bloodiestCasualties).toBe(0);
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
            expect(slide.detail).toContain('RS');
            expect(slide.detail).toContain('RBiH');
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
        });
    });
});
