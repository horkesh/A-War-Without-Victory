import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChronicleCard } from '../../src/ui/map/components/chronicle/ChronicleCard.js';
import { WrappedSlideComponent } from '../../src/ui/map/components/chronicle/WrappedSlide.js';

describe('chronicle endgame narrative mounts', () => {
    it('renders a ghost chronicle badge and restrained endgame copy', () => {
        const html = renderToStaticMarkup(
            React.createElement(ChronicleCard, {
                entry: {
                    turn: 188,
                    type: 'narrative',
                    headline: false,
                    ghost: true,
                    title: 'Historical rupture absent',
                    detail: 'Srebrenica enclave survived in your war; the historical July 1995 catastrophe never arrived.',
                },
            }),
        );

        expect(html).toContain('GHOST');
        expect(html).toContain('Historical rupture absent');
        expect(html).toContain('Srebrenica enclave survived in your war');
    });

    it('renders wrapped divergence bullets on the final reflection slide', () => {
        const html = renderToStaticMarkup(
            React.createElement(WrappedSlideComponent, {
                slide: {
                    id: 'another_such_victory',
                    title: 'Another Such Victory',
                    subtitle: 'History remembered this war differently',
                    heroValue: '48',
                    heroLabel: 'final score',
                    detail: 'Republic of Bosnia and Herzegovina',
                    bullets: [
                        'War lasted 18 weeks shorter than the historical 188 weeks',
                        'Federation controlled 54.0% territory vs historical 51%',
                    ],
                    data: {
                        military_credibility: 60,
                        international_standing: 35,
                    },
                },
                index: 9,
                total: 10,
                faction: 'RBiH',
            }),
        );

        expect(html).toContain('History remembered this war differently');
        expect(html).toContain('War lasted 18 weeks shorter than the historical 188 weeks');
        expect(html).toContain('Federation controlled 54.0% territory vs historical 51%');
    });
});
