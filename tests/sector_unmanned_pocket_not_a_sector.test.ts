/**
 * Owner ruling M3 (2026-11-12, "Not a sector"): a cut-off friendly pocket with no friendly
 * combat formation in it gives its front edges to no corps, so it forms no corps front sector.
 * A cut-off pocket WITH a brigade keeps the nearest-claimed-corps island fallback.
 */
import { describe, expect, test } from 'vitest';

import { partitionFrontEdges } from '../src/sim/combat/sector_territory.js';

// Main friendly front: M1 - M2 (claimed by corps_a). Enemy ring: E1, E2.
// Island: I1 (friendly, touches only E2). E2 also touches M2, so the hop-nearest claimed OSID
// from I1 is M2 (corps_a).
const adjacency = new Map<string, string[]>([
    ['M1', ['M2']],
    ['M2', ['E1', 'E2', 'M1']],
    ['E1', ['M2']],
    ['E2', ['I1', 'M2']],
    ['I1', ['E2']],
]);
const controllers: Record<string, string> = { M1: 'RBiH', M2: 'RBiH', I1: 'RBiH', E1: 'RS', E2: 'RS' };
const state = { political: { political_controllers: controllers } } as any;
const frontEdges = [
    { edge_id: 'E1__M2', a: 'E1', b: 'M2', side_a: 'RS', side_b: 'RBiH' },
    { edge_id: 'E2__I1', a: 'E2', b: 'I1', side_a: 'RS', side_b: 'RBiH' },
];
const osidToCorps = new Map<string, string>([['M1', 'corps_a'], ['M2', 'corps_a']]);
const corpsIds = ['corps_a', 'corps_b'];

function brigade(id: string, location: string, overrides: Record<string, unknown> = {}) {
    return { id, faction: 'RBiH', kind: 'brigade', status: 'active', location_osid: location, ...overrides };
}

function partition(formations?: Record<string, unknown>) {
    return partitionFrontEdges(
        frontEdges as any,
        'RBiH' as any,
        osidToCorps as any,
        state,
        null,
        corpsIds as any,
        adjacency as any,
        formations as any,
    );
}

describe('unmanned cut-off pocket is not a sector (M3)', () => {
    test('brigade-less island gives its front edge to no corps', () => {
        const result = partition({ b1: brigade('b1', 'M1') });
        expect(result.get('corps_a')).toEqual(['E1__M2']);
        expect([...result.values()].flat()).not.toContain('E2__I1');
    });

    test('island with a brigade in it still forms a front via the nearest claimed corps', () => {
        const result = partition({ b1: brigade('b1', 'M1'), b2: brigade('b2', 'I1') });
        expect(result.get('corps_a')).toEqual(['E1__M2', 'E2__I1']);
    });

    test('inactive or non-combat formations do not man a pocket', () => {
        const result = partition({
            b1: brigade('b1', 'M1'),
            dead: brigade('dead', 'I1', { status: 'inactive' }),
            hq: brigade('hq', 'I1', { kind: 'corps' }),
            enemy: brigade('enemy', 'I1', { faction: 'RS' }),
        });
        expect([...result.values()].flat()).not.toContain('E2__I1');
    });

    test('without formations the legacy nearest-claimed fallback is unchanged', () => {
        const result = partition(undefined);
        expect(result.get('corps_a')).toEqual(['E1__M2', 'E2__I1']);
    });

    test('result is order-independent (deterministic)', () => {
        const formations = { b1: brigade('b1', 'M1') };
        const a = partition(formations);
        const reversed = partitionFrontEdges(
            [...frontEdges].reverse() as any,
            'RBiH' as any,
            osidToCorps as any,
            state,
            null,
            corpsIds as any,
            adjacency as any,
            formations as any,
        );
        expect([...reversed.entries()]).toEqual([...a.entries()]);
    });
});
