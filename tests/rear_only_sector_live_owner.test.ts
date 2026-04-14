import { describe, expect, it } from 'vitest';

import { absorbUnstaffedSiblingFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import type { CorpsFrontSector, CorpsFrontSubSegment, FormationId } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

function makeSubSegment(id: string, friendly: string, enemy: string): CorpsFrontSubSegment {
    return {
        sub_segment_id: `subseg:${id}:0`,
        edge_ids: [`${friendly}__${enemy}`],
        friendly_osids: [friendly],
        enemy_osids: [enemy],
        length_edges: 1,
        primary_brigade_ids: [],
    };
}

function makeSector(id: string, friendly: string, enemy: string): CorpsFrontSector {
    return {
        sector_id: id,
        corps_id: 'vrs_test' as FormationId,
        faction: 'RS',
        opposing_factions: ['RBiH'],
        edge_ids: [`${friendly}__${enemy}`],
        sub_segments: [makeSubSegment(id, friendly, enemy)],
        length_edges: 1,
        territory_osids: [friendly],
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        rear_brigade_ids: [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    };
}

describe('rear-only sector live ownership', () => {
    it('absorbs a rear-only sibling fragment during live sector sealing', () => {
        const staffed = makeSector('sector:vrs_test:0', 'op:test:shared', 'op:test:enemy_a');
        staffed.assigned_brigade_ids = ['brig_front' as FormationId];

        const rearOnly = makeSector('sector:vrs_test:1', 'op:test:shared', 'op:test:enemy_b');
        rearOnly.rear_brigade_ids = ['brig_rear' as FormationId];

        const sectors: Record<string, CorpsFrontSector> = {
            [staffed.sector_id]: staffed,
            [rearOnly.sector_id]: rearOnly,
        };

        const changed = absorbUnstaffedSiblingFrontSectors(
            sectors,
            [staffed, rearOnly],
            new Map<Osid, Osid[]>(),
            new Map(),
            new Map<Osid, Osid[]>(),
            new Map<Osid, Osid[]>(),
        );

        expect(changed).toBe(true);
        expect(Object.keys(sectors).sort()).toEqual(['sector:vrs_test:0']);
        expect(sectors[rearOnly.sector_id]).toBeUndefined();
    });
});
