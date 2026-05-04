import { describe, expect, it } from 'vitest';
import type { CorpsFrontSector, CorpsFrontSubSegment, FactionId, FormationId, FormationState } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import { assignTerritoryVoronoi, repairDisconnectedTerritory } from '../src/sim/combat/sector_territory.js';
import { canonicalizeSiblingFrontOwnership } from '../src/sim/combat/corps_front_sectors.js';
import { makeAdjacency as makeAdjacencyShared } from './_helpers/adjacency.js';

const makeAdjacency = (connections: [string, string][]): Map<Osid, Osid[]> =>
    makeAdjacencyShared(connections) as unknown as Map<Osid, Osid[]>;

function makeSubSeg(
    id: string,
    friendlyOsids: string[],
    enemyOsids: string[],
    edgeCount: number,
): CorpsFrontSubSegment {
    return {
        sub_segment_id: id,
        edge_ids: Array.from({ length: edgeCount }, (_, i) => `edge_${id}_${i}`),
        friendly_osids: friendlyOsids,
        enemy_osids: enemyOsids,
        length_edges: edgeCount,
        primary_brigade_ids: [],
    };
}

function makeSector(
    sectorId: string,
    corpsId: string,
    subSegments: CorpsFrontSubSegment[],
): CorpsFrontSector {
    return {
        sector_id: sectorId,
        corps_id: corpsId as FormationId,
        faction: 'RS' as FactionId,
        opposing_factions: ['RBiH' as FactionId],
        edge_ids: subSegments.flatMap((segment) => segment.edge_ids),
        sub_segments: subSegments,
        length_edges: subSegments.reduce((sum, segment) => sum + segment.length_edges, 0),
        territory_osids: [],
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as CorpsFrontSector;
}

describe('sector territory packet contract', () => {
    it('keeps a shared frontline OSID in every claiming sector territory packet', () => {
        const sectorA = makeSector(
            'sector:vrs_drina:0',
            'vrs_drina',
            [makeSubSeg('a', ['op:m:hinge', 'op:m:front_a'], ['op:m:enemy_a'], 2)],
        );
        const sectorB = makeSector(
            'sector:vrs_drina:1',
            'vrs_drina',
            [makeSubSeg('b', ['op:m:hinge', 'op:m:front_b'], ['op:m:enemy_b'], 2)],
        );

        const adjacency = makeAdjacency([
            ['op:m:hinge', 'op:m:rear'],
            ['op:m:front_a', 'op:m:rear'],
            ['op:m:front_b', 'op:m:rear'],
        ]);
        const friendlyOsids = new Set(['op:m:hinge', 'op:m:front_a', 'op:m:front_b', 'op:m:rear']);

        assignTerritoryVoronoi([sectorA, sectorB], adjacency, friendlyOsids);

        expect(sectorA.territory_osids).toContain('op:m:hinge');
        expect(sectorB.territory_osids).toContain('op:m:hinge');
    });

    it('never strips a sector frontier component out of territory during disconnected repair', () => {
        const sector = makeSector(
            'sector:vrs_srk:0',
            'vrs_sarajevo_romanija',
            [makeSubSeg('srk', ['op:m:front_pale', 'op:m:front_trnovo'], ['op:m:enemy'], 2)],
        );
        sector.territory_osids = [
            'op:m:front_pale',
            'op:m:rear_pale',
            'op:m:front_trnovo',
        ];

        const adjacency = makeAdjacency([
            ['op:m:front_pale', 'op:m:rear_pale'],
        ]);
        const friendlyOsids = new Set(['op:m:front_pale', 'op:m:rear_pale', 'op:m:front_trnovo']);

        repairDisconnectedTerritory([sector], adjacency, friendlyOsids);

        expect(sector.territory_osids).toContain('op:m:front_pale');
        expect(sector.territory_osids).toContain('op:m:front_trnovo');
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Absorbed from sector_front_overlap_canonicalization.test.ts (Phase 3 §2 leftover)
// ────────────────────────────────────────────────────────────────────────────

function makeOverlapSector(
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
            makeOverlapSector(
                'sector:corps_a:0',
                ['op:enemy:a__op:front:shared', 'op:enemy:b__op:front:left'],
                ['op:front:shared', 'op:front:left'],
                ['op:front:shared', 'op:front:left'],
            ),
            makeOverlapSector(
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
