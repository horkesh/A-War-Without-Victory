import { describe, expect, it } from 'vitest';

import { isSegmentAdjacent } from '../src/sim/combat/sector_edge_adjacency.js';
import type { OsidCentroidMap } from '../src/data/operational_data_types.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

function makeAdjacency(pairs: Array<[string, string]>): Map<Osid, Osid[]> {
    const map = new Map<Osid, Osid[]>();
    for (const [a, b] of pairs) {
        const left = map.get(a as Osid) ?? [];
        if (!left.includes(b as Osid)) left.push(b as Osid);
        map.set(a as Osid, left);
        const right = map.get(b as Osid) ?? [];
        if (!right.includes(a as Osid)) right.push(a as Osid);
        map.set(b as Osid, right);
    }
    for (const list of map.values()) list.sort();
    return map;
}

describe('isSegmentAdjacent bridge guard', () => {
    it('does not let undersized-subsegment merge re-bridge a strict Case B split', () => {
        const segmentA = {
            friendly_osids: ['op:a:f1'],
            enemy_osids: ['op:a:h'],
            edge_ids: ['op:a:f1__op:a:h'],
        };
        const segmentB = {
            friendly_osids: ['op:a:f2'],
            enemy_osids: ['op:a:h'],
            edge_ids: ['op:a:f2__op:a:h'],
        };

        const sharedBoundaryAdj = makeAdjacency([['op:a:f1', 'op:a:f2']]);
        const strictAdjForCaseB = makeAdjacency([]);

        expect(
            isSegmentAdjacent(segmentA, segmentB, sharedBoundaryAdj, sharedBoundaryAdj, strictAdjForCaseB),
        ).toBe(false);
    });

    it('does not connect opposite sides of a hostile pocket even when strict adjacency exists', () => {
        const segmentA = {
            friendly_osids: ['op:b:left'],
            enemy_osids: ['op:b:pocket'],
            edge_ids: ['op:b:left__op:b:pocket'],
        };
        const segmentB = {
            friendly_osids: ['op:b:right'],
            enemy_osids: ['op:b:pocket'],
            edge_ids: ['op:b:right__op:b:pocket'],
        };

        const sharedBoundaryAdj = makeAdjacency([
            ['op:b:left', 'op:b:right'],
            ['op:b:left', 'op:b:pocket'],
            ['op:b:right', 'op:b:pocket'],
        ]);
        const centroids: OsidCentroidMap = new Map([
            ['op:b:left' as Osid, { lat: 0, lon: -1 }],
            ['op:b:right' as Osid, { lat: 0, lon: 1 }],
            ['op:b:pocket' as Osid, { lat: 0, lon: 0 }],
        ]);

        expect(
            isSegmentAdjacent(segmentA, segmentB, sharedBoundaryAdj, sharedBoundaryAdj, sharedBoundaryAdj, centroids),
        ).toBe(false);
    });
});
