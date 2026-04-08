import { describe, expect, it } from 'vitest';

import { canonicalizeSiblingFrontOwnership } from '../src/sim/combat/corps_front_sectors.js';
import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FormationId,
    FormationState,
} from '../src/state/game_state.js';

function makeSector(
    sectorId: string,
    edgeIds: string[],
    friendlyOsids: string[],
    territoryOsids: string[],
): CorpsFrontSector {
    const subSegment: CorpsFrontSubSegment = {
        sub_segment_id: `subseg:${sectorId}`,
        edge_ids: edgeIds,
        friendly_osids: friendlyOsids,
        enemy_osids: edgeIds.map((edgeId, index) => `enemy:${sectorId}:${index}`),
        length_edges: edgeIds.length,
        primary_brigade_ids: [],
    };
    return {
        sector_id: sectorId,
        corps_id: 'corps_a',
        faction: 'RS',
        opposing_factions: ['RBiH'],
        edge_ids: edgeIds,
        sub_segments: [subSegment],
        length_edges: edgeIds.length,
        territory_osids: territoryOsids,
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as CorpsFrontSector;
}

describe('canonicalizeSiblingFrontOwnership', () => {
    it('moves duplicated front-edge ownership to the stronger sibling sector and keeps front geometry consistent', () => {
        const sectors = [
            makeSector(
                'sector:corps_a:0',
                ['op:enemy:a__op:front:shared', 'op:enemy:b__op:front:left'],
                ['op:front:shared', 'op:front:left'],
                ['op:front:shared', 'op:front:left'],
            ),
            makeSector(
                'sector:corps_a:1',
                [
                    'op:enemy:c__op:front:shared',
                    'op:enemy:d__op:front:shared',
                    'op:enemy:e__op:front:right',
                ],
                ['op:front:shared', 'op:front:right'],
                ['op:front:shared', 'op:front:right'],
            ),
        ];
        const formations: Record<FormationId, FormationState> = {} as Record<FormationId, FormationState>;
        const edgeMeta = new Map([
            ['op:enemy:a__op:front:shared', { a: 'op:enemy:a', b: 'op:front:shared', side_a: 'RBiH', side_b: 'RS' }],
            ['op:enemy:b__op:front:left', { a: 'op:enemy:b', b: 'op:front:left', side_a: 'RBiH', side_b: 'RS' }],
            ['op:enemy:c__op:front:shared', { a: 'op:enemy:c', b: 'op:front:shared', side_a: 'RBiH', side_b: 'RS' }],
            ['op:enemy:d__op:front:shared', { a: 'op:enemy:d', b: 'op:front:shared', side_a: 'RBiH', side_b: 'RS' }],
            ['op:enemy:e__op:front:right', { a: 'op:enemy:e', b: 'op:front:right', side_a: 'RBiH', side_b: 'RS' }],
        ]);

        const emptied = canonicalizeSiblingFrontOwnership(sectors, formations, edgeMeta);

        expect(emptied).toEqual([]);
        expect(sectors[0]!.sub_segments[0]!.friendly_osids).toEqual(['op:front:left']);
        expect(sectors[0]!.edge_ids).toEqual(['op:enemy:b__op:front:left']);
        expect(sectors[1]!.sub_segments[0]!.friendly_osids).toEqual(['op:front:right', 'op:front:shared']);
        expect(sectors[1]!.edge_ids).toContain('op:enemy:a__op:front:shared');
        expect(sectors[1]!.edge_ids).toContain('op:enemy:c__op:front:shared');
        expect(sectors[1]!.edge_ids).toContain('op:enemy:d__op:front:shared');
        expect(sectors[1]!.edge_ids).toContain('op:enemy:e__op:front:right');
    });
});
