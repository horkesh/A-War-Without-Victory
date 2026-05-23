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
});
