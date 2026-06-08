import { describe, expect, it } from 'vitest';

import type { CorpsFrontSector, GameState } from '../src/state/game_state.js';
import {
    getStandingOgDefenseBrigadeIds,
    getStandingOgEngagedDefenseBrigadeIds,
    isStandingOgDefenseBrigadeAvailable,
} from '../src/sim/combat/standing_og_defense.js';

function makeSector(overrides: Partial<CorpsFrontSector>): CorpsFrontSector {
    return {
        sector_id: 'sector:arbih_3rd_corps:0',
        corps_id: 'arbih_3rd_corps',
        faction: 'RBiH',
        opposing_factions: ['RS'],
        edge_ids: [],
        sub_segments: [],
        length_edges: 1,
        territory_osids: [],
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
        ...overrides,
    };
}

describe('getStandingOgDefenseBrigadeIds', () => {
    it('returns the assigned-only roster (reserve/rear brigades are not commited to defense)', () => {
        const sector = makeSector({
            assigned_brigade_ids: ['b2', 'b1'],
            reserve_brigade_ids: ['r1'],
            rear_brigade_ids: ['z1'],
        });

        expect(getStandingOgDefenseBrigadeIds(sector)).toEqual(['b2', 'b1']);
    });
});

describe('getStandingOgEngagedDefenseBrigadeIds', () => {
    it('returns the primary defender only', () => {
        const primary = { id: 'primary' };

        expect(getStandingOgEngagedDefenseBrigadeIds(primary)).toEqual(['primary']);
    });

    it('returns an empty list when there is no defender', () => {
        expect(getStandingOgEngagedDefenseBrigadeIds(null)).toEqual([]);
    });
});

describe('isStandingOgDefenseBrigadeAvailable', () => {
    it('always reports brigades as available', () => {
        const state = {
            military: {
                corps_command: {
                    corps_a: {
                        active_operations: [
                            {
                                participating_brigades: ['brigade_a'],
                            },
                        ],
                    },
                },
            },
        } as unknown as GameState;

        expect(isStandingOgDefenseBrigadeAvailable(state, 'brigade_a')).toBe(true);
        expect(isStandingOgDefenseBrigadeAvailable(state, 'brigade_b')).toBe(true);
    });
});
