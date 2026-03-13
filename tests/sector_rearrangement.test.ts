import { describe, expect, it } from 'vitest';
import { rearrangeSectorsForCorps } from '../src/sim/combat/sector_rearrangement.js';
import type { CorpsFrontSector, CorpsFrontSubSegment } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

function makeSector(
    sectorId: string, corpsId: string,
    friendly: string[], enemy: string[], edges: string[],
    assigned: string[] = [], reserves: string[] = [],
): CorpsFrontSector {
    const ss: CorpsFrontSubSegment = {
        sub_segment_id: `subseg:${corpsId}:0`,
        edge_ids: edges,
        friendly_osids: friendly,
        enemy_osids: enemy,
        length_edges: edges.length,
    };
    return {
        sector_id: sectorId,
        corps_id: corpsId,
        faction: 'RS' as any,
        opposing_factions: ['RBiH' as any],
        edge_ids: edges,
        sub_segments: [ss],
        length_edges: edges.length,
        territory_osids: friendly,
        assigned_brigade_ids: assigned,
        reserve_brigade_ids: reserves,
        density: edges.length > 0 ? assigned.length / edges.length : 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot' as const,
    };
}

function buildGridAdjacency(): Map<Osid, Osid[]> {
    // Grid: A-B-C across top, D-E-F across middle, G-H-I across bottom
    const adj = new Map<Osid, Osid[]>();
    adj.set('op:a:a', ['op:b:b', 'op:d:d']);
    adj.set('op:b:b', ['op:a:a', 'op:c:c', 'op:e:e']);
    adj.set('op:c:c', ['op:b:b', 'op:f:f']);
    adj.set('op:d:d', ['op:a:a', 'op:e:e', 'op:g:g']);
    adj.set('op:e:e', ['op:b:b', 'op:d:d', 'op:f:f', 'op:h:h']);
    adj.set('op:f:f', ['op:c:c', 'op:e:e', 'op:i:i']);
    adj.set('op:g:g', ['op:d:d', 'op:h:h']);
    adj.set('op:h:h', ['op:e:e', 'op:g:g', 'op:i:i']);
    adj.set('op:i:i', ['op:f:f', 'op:h:h']);
    adj.set('op:x:x', ['op:a:a']);
    adj.set('op:y:y', ['op:c:c']);
    return adj;
}

describe('rearrangeSectorsForCorps — thin sector consolidation', () => {
    it('merges a 0-brigade ≤3-edge sector into its adjacent neighbor', () => {
        const adj = buildGridAdjacency();
        const big = makeSector('sector:test:0', 'test_corps',
            ['op:a:a', 'op:b:b', 'op:d:d', 'op:e:e'],
            ['op:x:x'], ['e1', 'e2', 'e3', 'e4', 'e5'],
            ['brig1', 'brig2']);
        const tiny = makeSector('sector:test:1', 'test_corps',
            ['op:c:c'],
            ['op:y:y'], ['e6'],
            []);

        const result = rearrangeSectorsForCorps([big, tiny], 'test_corps', adj);
        expect(result).toHaveLength(1);
        expect(result[0].sub_segments.flatMap(ss => ss.friendly_osids)).toContain('op:c:c');
    });

    it('does not merge a thin sector with no adjacent neighbor', () => {
        const adj = buildGridAdjacency();
        const big = makeSector('sector:test:0', 'test_corps',
            ['op:a:a'], ['op:x:x'], ['e1'], ['brig1']);
        const isolated = makeSector('sector:test:1', 'test_corps',
            ['op:i:i'], ['op:y:y'], ['e2'], []);

        const result = rearrangeSectorsForCorps([big, isolated], 'test_corps', adj);
        expect(result).toHaveLength(2);
    });
});

describe('rearrangeSectorsForCorps — enemy pocket containment', () => {
    it('prunes 0-edge pocket containment sectors (no front = no sector)', () => {
        const adj = buildGridAdjacency();
        const sector = makeSector('sector:test:0', 'test_corps',
            ['op:a:a', 'op:b:b', 'op:c:c', 'op:d:d', 'op:f:f', 'op:g:g', 'op:h:h', 'op:i:i'],
            ['op:x:x'], ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'],
            ['brig1', 'brig2', 'brig3']);
        const politicalControllers: Record<string, string> = {
            'op:a:a': 'RS', 'op:b:b': 'RS', 'op:c:c': 'RS',
            'op:d:d': 'RS', 'op:e:e': 'RBiH', 'op:f:f': 'RS',
            'op:g:g': 'RS', 'op:h:h': 'RS', 'op:i:i': 'RS',
            'op:x:x': 'RBiH',
        };

        const result = rearrangeSectorsForCorps(
            [sector], 'test_corps', adj,
            { politicalControllers, faction: 'RS' as any }
        );
        // Pocket containment sector has 0 edges → pruned. Only the original sector remains.
        expect(result).toHaveLength(1);
        expect(result[0].edge_ids).toHaveLength(6);
    });
});
