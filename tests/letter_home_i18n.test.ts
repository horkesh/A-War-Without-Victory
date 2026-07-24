import { describe, expect, it } from 'vitest';
import { generateLetterHome, type LetterHomeInput } from '../src/sim/letter_home.js';
import type { TurnBattle } from '../src/state/turn_summary.js';

describe('Letter Home localization', () => {
    it('uses localized template prose when BCS locale is requested', () => {
        const input: LetterHomeInput = {
            turn: 1,
            faction: 'RBiH',
            factionKilled: 10,
            factionWounded: 0,
            factionMissing: 0,
            factionBattles: [{
                osid: 'op:sarajevo',
                attacker_faction: 'RBiH',
                defender_faction: 'RS',
                primary_attacker_id: 'arbih_brigade',
                primary_defender_id: 'rs_brigade',
                all_attacker_ids: ['arbih_brigade'],
                outcome: 'victory',
                attacker_casualties: 10,
                defender_casualties: 2,
                territory_flipped: true,
                was_concentrated: false,
            }],
            formationLookup: new Map([
                ['arbih_brigade', { id: 'arbih_brigade', name: '1st Brigade', home_osid: 'op:tuzla' }],
            ]),
            locale: 'bcs',
            templateData: {
                version: 1,
                templates: [{
                    id: 'kia_off_test',
                    casualty_type: 'kia_offensive',
                    text_template: '{rank} {name}, age {age}, from {municipality}. Killed at {circumstance}.',
                    text_template_bcs: '{rank} {name}, star {age}, iz {municipality}. Poginuo kod {circumstance}.',
                    required_fields: ['rank', 'name', 'age', 'municipality', 'circumstance'],
                }],
                name_pools: {
                    bosniak_male: ['Adem'],
                    bosniak_female: ['Aisa'],
                    bosniak_surnames: ['Basic'],
                },
            },
        };

        const text = generateLetterHome(input);

        expect(text).toContain('star');
        expect(text).toContain('Poginuo kod');
        expect(text).not.toContain('age');
        expect(text).not.toContain('Killed at');
    });
});

function battle(
    osid: string,
    primaryAttackerId: string,
    attackerCasualties: number,
): TurnBattle {
    return {
        osid,
        attacker_faction: 'RBiH',
        defender_faction: 'RS',
        primary_attacker_id: primaryAttackerId,
        primary_defender_id: 'rs_brigade',
        all_attacker_ids: [primaryAttackerId],
        outcome: 'victory',
        attacker_casualties: attackerCasualties,
        defender_casualties: 1,
        territory_flipped: true,
        was_concentrated: false,
    };
}

function rankedLetterInput(overrides: Partial<LetterHomeInput> = {}): LetterHomeInput {
    const low = battle('op:sarajevo:low', 'arbih_low', 5);
    const high = battle('op:tuzla:high', 'arbih_high', 20);
    return {
        turn: 1,
        faction: 'RBiH',
        factionKilled: 10,
        factionWounded: 0,
        factionMissing: 0,
        factionBattles: [low, high],
        formationLookup: new Map([
            ['arbih_low', { id: 'arbih_low', name: 'Low Brigade', home_osid: 'op:visoko:home' }],
            ['arbih_high', { id: 'arbih_high', name: 'High Brigade', home_osid: 'op:zenica:home' }],
        ]),
        templateData: {
            version: 1,
            templates: [
                {
                    id: 'a_fallback_heavy',
                    casualty_type: 'kia_offensive',
                    text_template: 'fallback:{name}|{age}|{municipality}|{brigade}|{circumstance}|{wife_name}|{displacement_municipality}',
                    required_fields: ['name', 'age', 'municipality', 'brigade', 'circumstance', 'wife_name', 'displacement_municipality'],
                },
                {
                    id: 'z_grounded',
                    casualty_type: 'kia_offensive',
                    text_template: 'grounded:{name}|{age}|{municipality}|{brigade}|{circumstance}',
                    required_fields: ['name', 'age', 'municipality', 'brigade', 'circumstance'],
                },
            ],
            name_pools: {
                bosniak_male: ['Zed', 'Adem'],
                bosniak_female: ['Zora', 'Aisa'],
                bosniak_surnames: ['Zulu', 'Basic'],
            },
        },
        ...overrides,
    };
}

describe('Letter Home deterministic ranking', () => {
    it('uses battle evidence and canonical fallbacks instead of turn/hash variation', () => {
        const first = rankedLetterInput();
        const second = rankedLetterInput({
            turn: 99,
            factionKilled: 999,
            factionBattles: [...rankedLetterInput().factionBattles].reverse(),
            templateData: {
                ...rankedLetterInput().templateData,
                templates: [...rankedLetterInput().templateData.templates].reverse(),
                name_pools: {
                    bosniak_male: ['Adem', 'Zed'],
                    bosniak_female: ['Aisa', 'Zora'],
                    bosniak_surnames: ['Basic', 'Zulu'],
                },
            },
        });

        const expected = 'grounded:Adem Basic|18|Zenica|High Brigade|Tuzla';
        expect(generateLetterHome(first)).toBe(expected);
        expect(generateLetterHome(second)).toBe(expected);
    });
});
