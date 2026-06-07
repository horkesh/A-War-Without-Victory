// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { ChiefOfStaffBriefing, generateCoSBriefing } from '../../src/ui/map/components/army_hq/ChiefOfStaffBriefing.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { makeMockLoadedGameState } from '../../src/ui/map/__mocks__/loadedGameState.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { CommandBriefingItemView } from '../../src/ui/map/data/types.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';

function flatten(paragraphs: ReturnType<typeof generateCoSBriefing>): string {
    return paragraphs
        .map((segments) => segments.map((segment) => segment.type === 'link' ? segment.label : segment.value).join(''))
        .join('\n');
}

describe('Chief of Staff briefing localization', () => {
    afterEach(() => {
        setLocale('en');
        cleanup();
    });

    it('localizes stable no-alert briefing prose in BCS mode', () => {
        setLocale('bcs');
        const state = {
            ...makeMockLoadedGameState(),
            turn: 2,
            latestTurnSummary: null,
        } as LoadedGameState;

        const text = flatten(generateCoSBriefing([], state, 'RBiH'));

        expect(text).toContain('Komandante, imam pitanja koja zahtijevaju vašu pažnju.');
        expect(text).toContain('Situacija je zasad stabilna, ali moramo ostati oprezni.');
        expect(text).not.toContain('Commander,');
        expect(text).not.toContain('The situation is stable for now');
    });

    it('localizes cautious combat and territory summary prose in BCS mode', () => {
        setLocale('bcs');
        const latestTurnSummary: TurnSummary = {
            turn: 3,
            battles: [{
                osid: 'osid_test',
                attacker_faction: 'RBiH',
                defender_faction: 'RS',
                primary_attacker_id: 'arbih_test_brigade',
                primary_defender_id: 'rs_test_brigade',
                all_attacker_ids: ['arbih_test_brigade'],
                outcome: 'repulsed',
                attacker_casualties: 40,
                defender_casualties: 12,
                territory_flipped: false,
                was_concentrated: false,
            }],
            territory_net: { RBiH: -1 },
            notable_flips: [],
            displacement_total: 0,
            displacement_by_ethnicity: {},
            decoration_awards: [],
            arc_transitions: [],
            formation_spawns: [],
            formation_destructions: [],
            supply_deltas: {},
            heavy_munitions_deltas: {},
            movements: [],
            supply_transitions: [],
            events_fired: [],
            notable_events: [],
        };
        const state = {
            ...makeMockLoadedGameState(),
            turn: 3,
            latestTurnSummary,
        } as LoadedGameState;

        const text = flatten(generateCoSBriefing([], state, 'RBiH'));

        expect(text).toContain('Vodili smo 1 okršaj - rezultati zabrinjavaju, uz 1 nepovoljan ishod.');
        expect(text).toContain('Izgubili smo 1 položaj ovaj potez. To je duboko zabrinjavajuće.');
        expect(text).not.toContain('We fought');
        expect(text).not.toContain('We lost 1 position');
    });

    it('localizes precise and aggressive combat and territory prose in BCS mode', () => {
        setLocale('bcs');
        const makeSummary = (battles: TurnSummary['battles'], territoryNet: TurnSummary['territory_net']): TurnSummary => ({
            turn: 5,
            battles,
            territory_net: territoryNet,
            notable_flips: [],
            displacement_total: 0,
            displacement_by_ethnicity: {},
            decoration_awards: [],
            arc_transitions: [],
            formation_spawns: [],
            formation_destructions: [],
            supply_deltas: {},
            heavy_munitions_deltas: {},
            movements: [],
            supply_transitions: [],
            events_fired: [],
            notable_events: [],
        });
        const battle = (osid: string, attacker_faction: string, defender_faction: string, outcome: TurnSummary['battles'][number]['outcome']): TurnSummary['battles'][number] => ({
            osid,
            attacker_faction,
            defender_faction,
            primary_attacker_id: `${attacker_faction}_${osid}_attacker`,
            primary_defender_id: `${defender_faction}_${osid}_defender`,
            all_attacker_ids: [`${attacker_faction}_${osid}_attacker`],
            outcome,
            attacker_casualties: 20,
            defender_casualties: 15,
            territory_flipped: outcome === 'victory',
            was_concentrated: false,
        });

        const preciseState = {
            ...makeMockLoadedGameState(),
            turn: 5,
            latestTurnSummary: makeSummary([
                battle('a', 'RS', 'RBiH', 'victory'),
                battle('b', 'RS', 'RBiH', 'repulsed'),
                battle('c', 'RBiH', 'RS', 'stalemate'),
            ], { RS: 1 }),
        } as LoadedGameState;
        const aggressiveWinState = {
            ...makeMockLoadedGameState(),
            turn: 5,
            latestTurnSummary: makeSummary([
                battle('d', 'HRHB', 'RS', 'victory'),
                battle('e', 'HRHB', 'RS', 'costly_victory'),
            ], { HRHB: 2 }),
        } as LoadedGameState;
        const aggressiveLossState = {
            ...makeMockLoadedGameState(),
            turn: 5,
            latestTurnSummary: makeSummary([
                battle('f', 'HRHB', 'RS', 'repulsed'),
            ], { HRHB: -1 }),
        } as LoadedGameState;
        const aggressiveMixedState = {
            ...makeMockLoadedGameState(),
            turn: 5,
            latestTurnSummary: makeSummary([
                battle('g', 'HRHB', 'RS', 'stalemate'),
            ], { HRHB: 0 }),
        } as LoadedGameState;

        const preciseText = flatten(generateCoSBriefing([], preciseState, 'RS'));
        const aggressiveWinText = flatten(generateCoSBriefing([], aggressiveWinState, 'HRHB'));
        const aggressiveLossText = flatten(generateCoSBriefing([], aggressiveLossState, 'HRHB'));
        const aggressiveMixedText = flatten(generateCoSBriefing([], aggressiveMixedState, 'HRHB'));
        const combined = [preciseText, aggressiveWinText, aggressiveLossText, aggressiveMixedText].join('\n');

        expect(preciseText).toContain('3 okršaja ovaj potez: 1 povoljan, 1 nepovoljan, 1 neodlucan.');
        expect(preciseText).toContain('Promjene teritorije: +1 zauzeto, -0 izgubljeno.');
        expect(aggressiveWinText).toContain('Vodili smo 2 bitke i dobili 2. Dobro, ali moramo nastaviti pritisak.');
        expect(aggressiveWinText).toContain('Zauzeli smo 2 položaja. Dobro. Nastaviti.');
        expect(aggressiveLossText).toContain('1 okršaj - primili smo 1 udarac. Moramo uzvratiti jace.');
        expect(aggressiveLossText).toContain('Izgubili smo 1 položaj - neprihvatljivo. Moramo ga vratiti.');
        expect(aggressiveMixedText).toContain('1 okršaj, uglavnom zastoji. Moramo probiti liniju.');
        expect(combined).not.toContain('engagement');
        expect(combined).not.toContain('Territory changes');
        expect(combined).not.toContain('We fought');
        expect(combined).not.toContain('We lost');
        expect(combined).not.toContain('Took');
        expect(combined).not.toContain('Gained');
    });

    it('localizes cautious exhaustion warning prose in BCS mode', () => {
        setLocale('bcs');
        const state = {
            ...makeMockLoadedGameState(),
            turn: 1,
            latestTurnSummary: null,
        } as LoadedGameState;
        const exhaustionItem: CommandBriefingItemView = {
            id: 'exhaustion',
            kind: 'command',
            category: 'exhaustion',
            severity: 'warning',
            title: 'War exhaustion rising',
            detail: 'Existing source detail.',
            target: { type: 'none' },
        };

        const text = flatten(generateCoSBriefing([exhaustionItem], state, 'RBiH'));

        expect(text).toContain('Ratni zamor suzava nas operativni prostor na cijelom ratištu.');
        expect(text).not.toContain('War exhaustion is narrowing');
    });

    it('localizes cautious alert prose in BCS mode', () => {
        setLocale('bcs');
        const state = {
            ...makeMockLoadedGameState(),
            turn: 1,
            latestTurnSummary: null,
        } as LoadedGameState;
        const items: CommandBriefingItemView[] = [
            {
                id: 'cohesion',
                kind: 'military',
                category: 'cohesion',
                severity: 'critical',
                title: '1st Corps cohesion critical',
                detail: 'Existing source detail.',
                corpsId: 'corps_1',
                target: { type: 'corps', corpsId: 'corps_1' },
            },
            {
                id: 'operation',
                kind: 'military',
                category: 'operations',
                severity: 'critical',
                title: 'Op River Line awaits authorization',
                detail: 'Existing source detail.',
                corpsId: 'corps_1',
                target: { type: 'operation', operationKey: 'op_1' },
            },
            {
                id: 'thin',
                kind: 'military',
                category: 'defense',
                severity: 'warning',
                title: 'Thin front: Tuzla corridor',
                detail: 'Existing source detail.',
                corpsId: 'corps_2',
                target: { type: 'sector', sectorId: 'sector_1' },
            },
        ];

        const text = flatten(generateCoSBriefing(items, state, 'RBiH'));

        expect(text).toContain('Zabrinut sam zbog 1st Corps - kohezija je opasno niska. Trebamo razmotriti reorganizaciju.');
        expect(text).toContain('Operacija River Line čeka vaše odobrenje. Preporučujem prvo pregledati odnos snaga.');
        expect(text).toContain('Naša linija kod Tuzla corridor je opasno tanka. Ako neprijatelj ispita taj pravac, možda nećemo izdrzati.');
        expect(text).not.toContain('I am concerned about');
        expect(text).not.toContain('awaits your authorization');
        expect(text).not.toContain('Our line at');
    });

    it('localizes precise and aggressive alert prose in BCS mode', () => {
        setLocale('bcs');
        const state = {
            ...makeMockLoadedGameState(),
            turn: 1,
            latestTurnSummary: null,
        } as LoadedGameState;
        const items: CommandBriefingItemView[] = [
            {
                id: 'cohesion',
                kind: 'military',
                category: 'cohesion',
                severity: 'critical',
                title: '1st Corps cohesion critical',
                detail: 'Existing source detail.',
                corpsId: 'corps_1',
                target: { type: 'corps', corpsId: 'corps_1' },
            },
            {
                id: 'operation',
                kind: 'military',
                category: 'operations',
                severity: 'critical',
                title: 'Op River Line awaits authorization',
                detail: 'Existing source detail.',
                corpsId: 'corps_1',
                target: { type: 'operation', operationKey: 'op_1' },
            },
            {
                id: 'thin',
                kind: 'military',
                category: 'defense',
                severity: 'warning',
                title: 'Thin front: Tuzla corridor',
                detail: 'Existing source detail.',
                corpsId: 'corps_2',
                target: { type: 'sector', sectorId: 'sector_1' },
            },
        ];

        const preciseText = flatten(generateCoSBriefing(items, state, 'RS'));
        const aggressiveText = flatten(generateCoSBriefing(items, state, 'HRHB'));

        expect(preciseText).toContain('1st Corps prijavljuje kritičnu koheziju. Spremnost snaga je degradirana. Preporučujem reorganizaciju.');
        expect(preciseText).toContain('Operacija River Line je završila pripremu. Čeka odluku KRENI/STANI.');
        expect(preciseText).toContain('Sektor Tuzla corridor ima premalo ljudstva u odnosu na sirinu fronta. Ranjivost: visoka.');
        expect(aggressiveText).toContain('1st Corps je u nevolji. Moramo ih ojačati ili povući.');
        expect(aggressiveText).toContain('River Line je spremna za pokretanje. Sto duže čekamo, neprijatelj se više priprema.');
        expect(aggressiveText).toContain('Tuzla corridor je izložen - jedan pritisak i linija puca. Trebaju nam brigade tamo odmah.');
        expect(preciseText + aggressiveText).not.toContain('reports critical cohesion');
        expect(preciseText + aggressiveText).not.toContain('Awaiting GO/NO-GO');
        expect(preciseText + aggressiveText).not.toContain('is exposed');
    });

    it('localizes command-strain prose in BCS mode', () => {
        setLocale('bcs');
        const base = makeMockLoadedGameState();
        const state = {
            ...base,
            turn: 4,
            latestTurnSummary: null,
            formations: [
                ...base.formations,
                {
                    id: 'rbih_1_corps',
                    faction: 'RBiH',
                    name: '1st Corps',
                    kind: 'corps',
                    readiness: 'active',
                    cohesion: 70,
                    fatigue: 10,
                    status: 'active',
                    createdTurn: 1,
                    tags: [],
                    personnel: 10000,
                    commandStrainLabel: 'strained',
                },
                {
                    id: 'rs_drina_corps',
                    faction: 'RS',
                    name: 'Drina Corps',
                    kind: 'corps',
                    readiness: 'active',
                    cohesion: 68,
                    fatigue: 12,
                    status: 'active',
                    createdTurn: 1,
                    tags: [],
                    personnel: 12000,
                    commandStrainLabel: 'compromised',
                },
                {
                    id: 'hrhb_hvo_corps',
                    faction: 'HRHB',
                    name: 'HVO Main Corps',
                    kind: 'corps',
                    readiness: 'active',
                    cohesion: 74,
                    fatigue: 8,
                    status: 'active',
                    createdTurn: 1,
                    tags: [],
                    personnel: 9000,
                    commandStrainLabel: 'strained',
                },
            ],
        } as LoadedGameState;

        const cautiousText = flatten(generateCoSBriefing([], state, 'RBiH'));
        const preciseText = flatten(generateCoSBriefing([], state, 'RS'));
        const aggressiveText = flatten(generateCoSBriefing([], state, 'HRHB'));

        expect(cautiousText).toContain('Moram napomenuti da su komandni odnosi sa 1st Corps i dalje pod pritiskom nakon nedavnih predsjedničkih intervencija.');
        expect(preciseText).toContain('Status komandnog autoriteta: komandni odnos sa Drina Corps je narušen.');
        expect(aggressiveText).toContain('Štab HVO Main Corps je još uz nas, ali su intervencije ostavile trag.');
        expect(cautiousText + preciseText + aggressiveText).not.toContain('command relations with');
        expect(cautiousText + preciseText + aggressiveText).not.toContain('Command Authority Status');
        expect(cautiousText + preciseText + aggressiveText).not.toContain('overrides have left a mark');
    });

    it('localizes Chief of Staff header chrome in BCS mode', () => {
        setLocale('bcs');
        const state = {
            ...makeMockLoadedGameState(),
            turn: 1,
            latestTurnSummary: null,
        } as LoadedGameState;

        const { container } = render(createElement(ChiefOfStaffBriefing, {
            briefingItems: [],
            gameState: state,
            faction: 'RS',
        }));

        expect(screen.getByText(/Dnevni brifing/)).toBeTruthy();
        expect(screen.getByText('BRIFING')).toBeTruthy();
        expect(screen.getAllByText('Načelnik Glavnog štaba').length).toBeGreaterThan(0);
        expect(container.textContent).not.toContain('Daily Briefing');
        expect(container.textContent).not.toContain('BRIEFING');
        expect(container.textContent).not.toContain('Chief of Main Staff');
    });
});
