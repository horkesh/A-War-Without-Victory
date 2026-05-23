import { afterEach, describe, expect, it } from 'vitest';
import { generateCoSBriefing } from '../../src/ui/map/components/army_hq/ChiefOfStaffBriefing.js';
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
    });

    it('localizes stable no-alert briefing prose in BCS mode', () => {
        setLocale('bcs');
        const state = {
            ...makeMockLoadedGameState(),
            turn: 2,
            latestTurnSummary: null,
        } as LoadedGameState;

        const text = flatten(generateCoSBriefing([], state, 'RBiH'));

        expect(text).toContain('Komandante, imam pitanja koja zahtijevaju vasu paznju.');
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

        expect(text).toContain('Vodili smo 1 okrsaj - rezultati zabrinjavaju, uz 1 nepovoljan ishod.');
        expect(text).toContain('Izgubili smo 1 polozaj ovaj potez. To je duboko zabrinjavajuce.');
        expect(text).not.toContain('We fought');
        expect(text).not.toContain('We lost 1 position');
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

        expect(text).toContain('Ratni zamor suzava nas operativni prostor na cijelom ratistu.');
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
        expect(text).toContain('Operacija River Line ceka vase odobrenje. Preporucujem prvo pregledati odnos snaga.');
        expect(text).toContain('Nasa linija kod Tuzla corridor je opasno tanka. Ako neprijatelj ispita taj pravac, mozda necemo izdrzati.');
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

        expect(preciseText).toContain('1st Corps prijavljuje kriticnu koheziju. Spremnost snaga je degradirana. Preporucujem reorganizaciju.');
        expect(preciseText).toContain('Operacija River Line je zavrsila pripremu. Ceka odluku KRENI/STANI.');
        expect(preciseText).toContain('Sektor Tuzla corridor ima premalo ljudstva u odnosu na sirinu fronta. Ranjivost: visoka.');
        expect(aggressiveText).toContain('1st Corps je u nevolji. Moramo ih ojacati ili povuci.');
        expect(aggressiveText).toContain('River Line je spremna za pokretanje. Sto duze cekamo, neprijatelj se vise priprema.');
        expect(aggressiveText).toContain('Tuzla corridor je izlozen - jedan pritisak i linija puca. Trebaju nam brigade tamo odmah.');
        expect(preciseText + aggressiveText).not.toContain('reports critical cohesion');
        expect(preciseText + aggressiveText).not.toContain('Awaiting GO/NO-GO');
        expect(preciseText + aggressiveText).not.toContain('is exposed');
    });
});
