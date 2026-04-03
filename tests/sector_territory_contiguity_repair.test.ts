import { describe, expect, it } from 'vitest';
import { assignTerritoryVoronoi, repairDisconnectedTerritory } from '../src/sim/combat/corps_front_sectors.js';
import type { CorpsFrontSector, CorpsFrontSubSegment } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

function makeSector(
    sectorId: string,
    corpsId: string,
    subSegments: CorpsFrontSubSegment[],
    territoryOsids: string[],
    assignedBrigades: string[] = [],
): CorpsFrontSector {
    const allEdges = subSegments.flatMap(s => s.edge_ids);
    return {
        sector_id: sectorId,
        corps_id: corpsId,
        faction: 'RS' as any,
        opposing_factions: ['RBiH' as any],
        edge_ids: allEdges,
        sub_segments: subSegments,
        length_edges: allEdges.length,
        territory_osids: [...territoryOsids].sort(),
        assigned_brigade_ids: assignedBrigades,
        reserve_brigade_ids: [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot' as const,
    };
}

function makeSubSeg(id: string, friendly: string[], enemy: string[]): CorpsFrontSubSegment {
    return {
        sub_segment_id: id,
        edge_ids: [],
        friendly_osids: friendly,
        enemy_osids: enemy,
        primary_brigade_ids: [],
        length_edges: 0,
    };
}

/**
 * Build adjacency: A--B--C  (linear chain)  and  X--Y (disconnected pair)
 * So {A,B,C,X,Y} has two components: {A,B,C} and {X,Y}.
 */
function buildTestAdjacency(): Map<Osid, Osid[]> {
    const adj = new Map<Osid, Osid[]>();
    adj.set('op:a:a' as Osid, ['op:b:b' as Osid]);
    adj.set('op:b:b' as Osid, ['op:a:a' as Osid, 'op:c:c' as Osid]);
    adj.set('op:c:c' as Osid, ['op:b:b' as Osid]);
    adj.set('op:x:x' as Osid, ['op:y:y' as Osid]);
    adj.set('op:y:y' as Osid, ['op:x:x' as Osid]);
    return adj;
}

describe('repairDisconnectedTerritory', () => {
    it('does nothing when territory is already contiguous', () => {
        const adj = buildTestAdjacency();
        const friendly = new Set(['op:a:a', 'op:b:b', 'op:c:c', 'op:x:x', 'op:y:y']);
        const sector = makeSector('sector:corps1:0', 'corps1',
            [makeSubSeg('subseg:0', ['op:a:a', 'op:b:b'], ['op:e:e'])],
            ['op:a:a', 'op:b:b', 'op:c:c'],  // contiguous A-B-C
        );
        const sectors = [sector];
        repairDisconnectedTerritory(sectors, adj, friendly);
        expect(sectors[0]!.territory_osids).toEqual(['op:a:a', 'op:b:b', 'op:c:c']);
    });

    it('splits disconnected territory — keeps largest component', () => {
        const adj = buildTestAdjacency();
        const friendly = new Set(['op:a:a', 'op:b:b', 'op:c:c', 'op:x:x', 'op:y:y']);
        // Sector claims {A,B,C,X} — but X is disconnected from A-B-C
        const sector = makeSector('sector:corps1:0', 'corps1',
            [makeSubSeg('subseg:0', ['op:a:a'], ['op:e:e'])],
            ['op:a:a', 'op:b:b', 'op:c:c', 'op:x:x'],
        );
        const sectors = [sector];
        repairDisconnectedTerritory(sectors, adj, friendly);
        // Largest component {A,B,C} kept; X is dropped (no adjacent sector to reassign to)
        expect(sectors[0]!.territory_osids).toEqual(['op:a:a', 'op:b:b', 'op:c:c']);
    });

    it('reassigns orphaned component to adjacent sector', () => {
        const adj = buildTestAdjacency();
        const friendly = new Set(['op:a:a', 'op:b:b', 'op:c:c', 'op:x:x', 'op:y:y']);
        // Sector 0 claims {A,B,C,X} — X is disconnected from A-B-C
        // Sector 1 claims {Y} — adjacent to X
        const sector0 = makeSector('sector:corps1:0', 'corps1',
            [makeSubSeg('subseg:0', ['op:a:a'], ['op:e:e'])],
            ['op:a:a', 'op:b:b', 'op:c:c', 'op:x:x'],
        );
        const sector1 = makeSector('sector:corps1:1', 'corps1',
            [makeSubSeg('subseg:1', ['op:y:y'], ['op:e:e'])],
            ['op:y:y'],
        );
        const sectors = [sector0, sector1];
        repairDisconnectedTerritory(sectors, adj, friendly);
        // Sector 0 keeps {A,B,C}
        expect(sectors[0]!.territory_osids).toEqual(['op:a:a', 'op:b:b', 'op:c:c']);
        // Sector 1 gets X reassigned (adjacent to Y)
        expect(sectors[1]!.territory_osids).toEqual(['op:x:x', 'op:y:y']);
    });

    it('does not reassign disconnected orphan territory across corps boundaries', () => {
        const adj = buildTestAdjacency();
        const friendly = new Set(['op:a:a', 'op:b:b', 'op:c:c', 'op:x:x', 'op:y:y']);
        const sector0 = makeSector('sector:corps1:0', 'corps1',
            [makeSubSeg('subseg:0', ['op:a:a'], ['op:e:e'])],
            ['op:a:a', 'op:b:b', 'op:c:c', 'op:x:x'],
        );
        const sector1 = makeSector('sector:corps2:0', 'corps2',
            [makeSubSeg('subseg:1', ['op:y:y'], ['op:e:e'])],
            ['op:y:y'],
        );
        const sectors = [sector0, sector1];
        repairDisconnectedTerritory(sectors, adj, friendly);
        expect(sectors[0]!.territory_osids).toEqual(['op:a:a', 'op:b:b', 'op:c:c']);
        expect(sectors[1]!.territory_osids).toEqual(['op:y:y']);
    });

    it('handles single-OSID territory without error', () => {
        const adj = buildTestAdjacency();
        const friendly = new Set(['op:a:a']);
        const sector = makeSector('sector:corps1:0', 'corps1',
            [makeSubSeg('subseg:0', ['op:a:a'], ['op:e:e'])],
            ['op:a:a'],
        );
        const sectors = [sector];
        repairDisconnectedTerritory(sectors, adj, friendly);
        expect(sectors[0]!.territory_osids).toEqual(['op:a:a']);
    });

    it('handles empty sectors array', () => {
        const adj = buildTestAdjacency();
        const friendly = new Set(['op:a:a']);
        const sectors: CorpsFrontSector[] = [];
        repairDisconnectedTerritory(sectors, adj, friendly);
        expect(sectors).toEqual([]);
    });
});

describe('assignTerritoryVoronoi', () => {
    it('does not launder orphan OSIDs into another corps during post-voronoi sweep', () => {
        const adj = buildTestAdjacency();
        const friendly = new Set(['op:a:a', 'op:b:b', 'op:c:c']);
        const sectors = [
            makeSector('sector:corps2:0', 'corps2', [makeSubSeg('subseg:0', ['op:c:c'], ['op:e:e'])], []),
        ];
        const osidToCorps = new Map<Osid, string>([
            ['op:a:a' as Osid, 'corps1'],
            ['op:b:b' as Osid, 'corps1'],
            ['op:c:c' as Osid, 'corps2'],
        ]);
        assignTerritoryVoronoi(sectors, adj, friendly, osidToCorps as Map<Osid, any>);
        expect(sectors[0]!.territory_osids).toEqual(['op:c:c']);
    });
});
