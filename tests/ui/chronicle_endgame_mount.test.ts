import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChronicleCard } from '../../src/ui/map/components/chronicle/ChronicleCard.js';
import { WrappedSlideComponent } from '../../src/ui/map/components/chronicle/WrappedSlide.js';
import { setLocale } from '../../src/ui/map/i18n';

describe('chronicle endgame narrative mounts', () => {
    afterEach(() => {
        setLocale('en');
    });

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

    it('localizes generated BCS comparison notes in Chronicle cards and wrapped bullets', () => {
        setLocale('bcs');

        const cardHtml = renderToStaticMarkup(
            React.createElement(ChronicleCard, {
                entry: {
                    turn: 188,
                    type: 'narrative',
                    headline: false,
                    title: 'Historical divergence',
                    detail: 'War lasted 18 weeks shorter than the historical 188 weeks',
                },
            }),
        );
        expect(cardHtml).not.toContain('War lasted 18 weeks shorter than the historical 188 weeks');
        expect(cardHtml).toContain('Rat je trajao 18 sedmica kraće od historijskih 188 sedmica.');

        const wrappedHtml = renderToStaticMarkup(
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
        expect(wrappedHtml).not.toContain('War lasted 18 weeks shorter than the historical 188 weeks');
        expect(wrappedHtml).not.toContain('Federation controlled 54.0% territory vs historical 51%');
        expect(wrappedHtml).toContain('Rat je trajao 18 sedmica kraće od historijskih 188 sedmica.');
        expect(wrappedHtml).toContain('Federacija je kontrolisala 54.0% teritorije naspram historijskih 51%.');
    });

    it('renders your-war wrapped faction hero with player-facing names', () => {
        for (const [faction, label] of [
            ['RBiH', 'Republic of Bosnia and Herzegovina'],
            ['RS', 'Republika Srpska'],
            ['HRHB', 'Croatian Republic of Herzeg-Bosnia'],
        ] as const) {
            const html = renderToStaticMarkup(
                React.createElement(WrappedSlideComponent, {
                    slide: {
                        id: 'your_war',
                        title: 'Your War',
                        subtitle: `You led ${label} through 40 weeks of conflict`,
                        heroValue: '40',
                        heroLabel: 'weeks at war',
                        detail: 'Campaign phase: War',
                        data: { faction },
                    },
                    index: 0,
                    total: 10,
                    faction,
                }),
            );

            expect(html).toContain(label);
            expect(html).not.toMatch(new RegExp(`>${faction}<`));
        }
    });

    it('renders your-war wrapped faction hero with BCS faction labels', () => {
        setLocale('bcs');
        for (const [faction, label] of [
            ['RBiH', 'Republika Bosna i Hercegovina'],
            ['RS', 'Republika Srpska'],
            ['HRHB', 'Hrvatska Republika Herceg-Bosna'],
        ] as const) {
            const html = renderToStaticMarkup(
                React.createElement(WrappedSlideComponent, {
                    slide: {
                        id: 'your_war',
                        title: 'Your War',
                        subtitle: `You led ${label} through 40 weeks of conflict`,
                        heroValue: '40',
                        heroLabel: 'weeks at war',
                        detail: 'Campaign phase: War',
                        data: { faction },
                    },
                    index: 0,
                    total: 10,
                    faction,
                }),
            );

            expect(html).toContain(label);
            expect(html).not.toContain('Republic of Bosnia and Herzegovina');
            expect(html).not.toContain('Croatian Republic of Herzeg-Bosnia');
            expect(html).not.toMatch(new RegExp(`>${faction}<`));
        }
    });
});
