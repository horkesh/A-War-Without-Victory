import { describe, expect, it } from 'vitest';
import { generateLetterHome, type LetterHomeInput } from '../src/sim/letter_home.js';

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
