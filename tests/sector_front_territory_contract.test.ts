import { describe, expect, it } from 'vitest';
import type { CorpsFrontSector, CorpsFrontSubSegment, FactionId, FormationId } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import { assignTerritoryVoronoi, repairDisconnectedTerritory } from '../src/sim/combat/sector_territory.js';

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

function makeAdjacency(connections: [string, string][]): Map<Osid, Osid[]> {
    const adj = new Map<Osid, Osid[]>();
    for (const [a, b] of connections) {
        const la = adj.get(a as Osid) ?? [];
        if (!la.includes(b as Osid)) la.push(b as Osid);
        adj.set(a as Osid, la);
        const lb = adj.get(b as Osid) ?? [];
        if (!lb.includes(a as Osid)) lb.push(a as Osid);
        adj.set(b as Osid, lb);
    }
    return adj;
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
