import { describe, expect, it } from 'vitest';

import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';

describe('officer biography read model', () => {
    it('projects sourced biography fields from static data while keeping runtime state separate', () => {
        const parsed = parseGameState({
            meta: { turn: 4, phase: 'war', player_faction: 'RS' },
            military: {
                formations: {},
                named_officer_data: [{
                    id: 'officer_exact',
                    name: 'Exact Officer',
                    faction: 'RS',
                    rank: 'corps_commander',
                    competence: 4,
                    aggressiveness: 3,
                    defensive_skill: 4,
                    political_reliability: 4,
                    home_corps_id: 'vrs_1st_krajina',
                    origin: 'jna',
                    bio_short: 'An exactly sourced command biography.',
                    command_style: 'Methodical command',
                    known_for: 'Exact appointment',
                    political_alignment_note: 'Regular command hierarchy.',
                }],
                named_officers: {
                    officer_exact: {
                        officer_id: 'officer_exact',
                        status: 'active',
                        assigned_corps_id: 'vrs_1st_krajina',
                        turns_in_command: 4,
                        battles: 1,
                        victories: 1,
                    },
                },
            },
            political: { political_controllers: {} },
        });

        expect(parsed.namedOfficerData?.[0]).toMatchObject({
            id: 'officer_exact',
            faction: 'RS',
            assigned_corps_id: 'vrs_1st_krajina',
            bio_short: 'An exactly sourced command biography.',
            command_style: 'Methodical command',
            known_for: 'Exact appointment',
            political_alignment_note: 'Regular command hierarchy.',
        });
        expect(parsed.namedOfficerStateById?.officer_exact).not.toHaveProperty('bio_short');
        expect(parsed.namedOfficerStateById?.officer_exact).not.toHaveProperty('command_style');
    });
});
