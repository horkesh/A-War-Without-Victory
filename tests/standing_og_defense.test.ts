import { describe, expect, it } from 'vitest';

import type { CorpsFrontSector } from '../src/state/game_state.js';
import { getStandingOgDefenseBrigadeIds } from '../src/sim/combat/standing_og_defense.js';

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
    it('preserves assigned-only roster when shared sector defense is disabled', () => {
        const sector = makeSector({
            assigned_brigade_ids: ['b2', 'b1'],
            reserve_brigade_ids: ['r1'],
            rear_brigade_ids: ['z1'],
        });

        expect(getStandingOgDefenseBrigadeIds(sector, false)).toEqual(['b2', 'b1']);
    });

    it('widens shared sector defense roster to assigned, reserve, and rear brigades deterministically', () => {
        const sector = makeSector({
            assigned_brigade_ids: ['b2', 'b1'],
            reserve_brigade_ids: ['r1', 'b1'],
            rear_brigade_ids: ['z1', 'r1'],
        });

        expect(getStandingOgDefenseBrigadeIds(sector, true)).toEqual(['b1', 'b2', 'r1', 'z1']);
    });
});
