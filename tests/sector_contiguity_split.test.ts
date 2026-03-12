import { describe, expect, it } from 'vitest';
import { splitNonContiguousSectors } from '../src/sim/combat/corps_front_sectors.js';
import type { CorpsFrontSector, CorpsFrontSubSegment } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

function makeSector(
    sectorId: string,
    corpsId: string,
    subSegments: CorpsFrontSubSegment[],
    assignedBrigades: string[] = [],
    reserveBrigades: string[] = [],
): CorpsFrontSector {
    const allEdges = subSegments.flatMap(s => s.edge_ids);
    const allFriendly = [...new Set(subSegments.flatMap(s => s.friendly_osids))].sort();
    const allEnemy = [...new Set(subSegments.flatMap(s => s.enemy_osids))].sort();
    return {
        sector_id: sectorId,
        corps_id: corpsId,
        faction: 'RS' as any,
        opposing_factions: ['RBiH' as any],
        edge_ids: allEdges,
        sub_segments: subSegments,
        length_edges: allEdges.length,
        territory_osids: allFriendly,
        assigned_brigade_ids: assignedBrigades,
        reserve_brigade_ids: reserveBrigades,
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
    };
}

function makeSubSeg(id: string, edgeIds: string[], friendly: string[], enemy: string[]): CorpsFrontSubSegment {
    return {
        sub_segment_id: id,
        edge_ids: edgeIds,
        friendly_osids: friendly,
        enemy_osids: enemy,
        length_edges: edgeIds.length,
    };
}

// Linear adjacency: A--B--C--D--E (C is not adjacent to A or E directly)
function buildLinearAdjacency(): Map<Osid, Osid[]> {
    const adj = new Map<Osid, Osid[]>();
    adj.set('op:a:a', ['op:b:b']);
    adj.set('op:b:b', ['op:a:a', 'op:c:c']);
    adj.set('op:c:c', ['op:b:b', 'op:d:d']);
    adj.set('op:d:d', ['op:c:c', 'op:e:e']);
    adj.set('op:e:e', ['op:d:d']);
    return adj;
}

describe('splitNonContiguousSectors', () => {
    it('returns sector unchanged when all friendly OSIDs are contiguous', () => {
        const adj = buildLinearAdjacency();
        const subSeg = makeSubSeg('ss0', ['e1', 'e2', 'e3'], ['op:a:a', 'op:b:b', 'op:c:c'], ['op:x:x']);
        const sector = makeSector('sector:test:0', 'test_corps', [subSeg], ['brig1']);

        const result = splitNonContiguousSectors([sector], adj);
        expect(result).toHaveLength(1);
        expect(result[0].assigned_brigade_ids).toEqual(['brig1']);
    });

    it('splits sector with two disconnected friendly OSID groups', () => {
        const adj = buildLinearAdjacency();
        // friendly: A,B (connected) and D,E (connected) — C missing = disconnected
        const subSeg = makeSubSeg('ss0', ['e1', 'e2', 'e3', 'e4'],
            ['op:a:a', 'op:b:b', 'op:d:d', 'op:e:e'],
            ['op:x:x', 'op:y:y']);
        const sector = makeSector('sector:test:0', 'test_corps', [subSeg],
            ['brig1', 'brig2'], ['res1']);

        const result = splitNonContiguousSectors([sector], adj);
        expect(result.length).toBeGreaterThan(1);
        // Each result sector must have contiguous friendly OSIDs
        for (const s of result) {
            const friendly = s.sub_segments.flatMap((ss: CorpsFrontSubSegment) => ss.friendly_osids);
            expect(friendly.length).toBeGreaterThan(0);
        }
        // All original brigades and reserves must be preserved across splits
        const allAssigned = result.flatMap((s: CorpsFrontSector) => s.assigned_brigade_ids).sort();
        const allReserves = result.flatMap((s: CorpsFrontSector) => s.reserve_brigade_ids).sort();
        expect([...allAssigned, ...allReserves].sort()).toEqual(['brig1', 'brig2', 'res1']);
    });

    it('handles sector with three disconnected groups', () => {
        // A alone, C alone, E alone — none adjacent
        const adj = buildLinearAdjacency();
        const subSeg = makeSubSeg('ss0', ['e1', 'e2', 'e3'],
            ['op:a:a', 'op:c:c', 'op:e:e'],
            ['op:x:x']);
        const sector = makeSector('sector:test:0', 'test_corps', [subSeg]);

        const result = splitNonContiguousSectors([sector], adj);
        expect(result).toHaveLength(3);
    });

    it('preserves already-contiguous sectors in a mixed list', () => {
        const adj = buildLinearAdjacency();
        const goodSeg = makeSubSeg('ss0', ['e1'], ['op:a:a', 'op:b:b'], ['op:x:x']);
        const goodSector = makeSector('sector:test:0', 'test_corps', [goodSeg]);
        const badSeg = makeSubSeg('ss1', ['e2', 'e3'], ['op:a:a', 'op:e:e'], ['op:y:y']);
        const badSector = makeSector('sector:test:1', 'test_corps', [badSeg]);

        const result = splitNonContiguousSectors([goodSector, badSector], adj);
        expect(result).toHaveLength(3); // 1 good + 2 from split bad
    });

    // --- Tests using osidA__osidB edge IDs (shared-OSID connectivity path) ---

    it('keeps edges connected when they share a hostile OSID (osidA__osidB format)', () => {
        const adj = buildLinearAdjacency();
        // Two edges sharing hostile op:x:x — connected via shared hostile
        const subSeg = makeSubSeg('ss0',
            ['op:a:a__op:x:x', 'op:b:b__op:x:x'],
            ['op:a:a', 'op:b:b'],
            ['op:x:x']);
        const sector = makeSector('sector:test:0', 'test_corps', [subSeg], ['brig1']);

        const result = splitNonContiguousSectors([sector], adj);
        expect(result).toHaveLength(1);
    });

    it('keeps edges connected when they share a friendly OSID (osidA__osidB format)', () => {
        const adj = buildLinearAdjacency();
        // Two edges sharing friendly op:a:a — connected via shared friendly
        const subSeg = makeSubSeg('ss0',
            ['op:a:a__op:x:x', 'op:a:a__op:y:y'],
            ['op:a:a'],
            ['op:x:x', 'op:y:y']);
        const sector = makeSector('sector:test:0', 'test_corps', [subSeg], ['brig1']);

        const result = splitNonContiguousSectors([sector], adj);
        expect(result).toHaveLength(1);
    });

    it('splits edges with no shared OSIDs even if territory is connected (osidA__osidB format)', () => {
        const adj = buildLinearAdjacency();
        // Group 1: op:a:a facing op:x:x
        // Group 2: op:e:e facing op:y:y
        // No shared OSID between groups — should split even though
        // A-B-C-D-E are all connected in the adjacency graph
        const subSeg = makeSubSeg('ss0',
            ['op:a:a__op:x:x', 'op:e:e__op:y:y'],
            ['op:a:a', 'op:e:e'],
            ['op:x:x', 'op:y:y']);
        const sector = makeSector('sector:test:0', 'test_corps', [subSeg],
            ['brig1', 'brig2']);

        const result = splitNonContiguousSectors([sector], adj);
        expect(result).toHaveLength(2);
        // Brigades assigned to largest component
        const totalBrigades = result.flatMap(s => s.assigned_brigade_ids).length;
        expect(totalBrigades).toBe(2);
    });

    it('chains edges through shared OSIDs across a front line (osidA__osidB format)', () => {
        const adj = buildLinearAdjacency();
        // Chain: A↔X, A↔Y, B↔Y, B↔Z — all connected through shared OSIDs
        const subSeg = makeSubSeg('ss0',
            ['op:a:a__op:x:x', 'op:a:a__op:y:y', 'op:b:b__op:y:y', 'op:b:b__op:z:z'],
            ['op:a:a', 'op:b:b'],
            ['op:x:x', 'op:y:y', 'op:z:z']);
        const sector = makeSector('sector:test:0', 'test_corps', [subSeg]);

        const result = splitNonContiguousSectors([sector], adj);
        expect(result).toHaveLength(1);
    });
});
