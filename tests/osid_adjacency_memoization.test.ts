/**
 * v0.9.3 C1 — buildOsidAdjacency / buildSharedBoundaryAdjacency memoization.
 *
 * The memo is keyed by the edges-array identity (WeakMap). These tests prove:
 *  - Same edges reference returns the SAME Map instance (cache hit).
 *  - Different edges references return DIFFERENT Map instances (cache miss).
 *  - Cached output is byte-identical to fresh compute (memo is transparent).
 *  - Both adjacency variants (plain + shared-boundary) memoize independently.
 *
 * End-to-end byte-identity proof against the 40w scenario is separate: it
 * lives in the golden-baseline regression, which would fail if the memo ever
 * produced a different adjacency than the fresh compute.
 */
import { describe, it, expect } from 'vitest';
import { buildOsidAdjacency, buildSharedBoundaryAdjacency } from '../src/sim/combat/osid_adjacency.js';
import type { EdgeRecord } from '../src/map/settlements.js';

const EDGES_A: EdgeRecord[] = [
    { a: 'op:x:1', b: 'op:x:2' } as EdgeRecord,
    { a: 'op:x:2', b: 'op:x:3' } as EdgeRecord,
    { a: 'op:x:1', b: 'op:x:3' } as EdgeRecord,
];

const EDGES_B: EdgeRecord[] = [
    { a: 'op:y:1', b: 'op:y:2' } as EdgeRecord,
];

// Edges with shared-boundary filter inputs
const EDGES_WITH_DIST: EdgeRecord[] = [
    { a: 'op:z:1', b: 'op:z:2', min_dist: 0, shared_segments: 3 } as EdgeRecord,
    { a: 'op:z:2', b: 'op:z:3', min_dist: 0.001, shared_segments: 1 } as EdgeRecord, // far apart — excluded
    { a: 'op:z:3', b: 'op:z:4', min_dist: 0, shared_segments: 0 } as EdgeRecord,      // point-only — excluded
];

describe('buildOsidAdjacency memoization', () => {
    it('returns the same Map instance on repeated calls with the same edges reference', () => {
        const first = buildOsidAdjacency(EDGES_A);
        const second = buildOsidAdjacency(EDGES_A);
        expect(second).toBe(first); // exact reference equality — cache hit
    });

    it('returns a distinct Map instance for a different edges reference', () => {
        const a = buildOsidAdjacency(EDGES_A);
        const b = buildOsidAdjacency(EDGES_B);
        expect(b).not.toBe(a);
        // Content sanity: edges A produces 3 OSIDs, edges B produces 2
        expect(a.size).toBe(3);
        expect(b.size).toBe(2);
    });

    it('cached result is byte-identical to a fresh compute over equivalent content', () => {
        // Fresh call on a NEW identical edges array — must NOT collide with the EDGES_A cache.
        const edgesFresh: EdgeRecord[] = [
            { a: 'op:x:1', b: 'op:x:2' } as EdgeRecord,
            { a: 'op:x:2', b: 'op:x:3' } as EdgeRecord,
            { a: 'op:x:1', b: 'op:x:3' } as EdgeRecord,
        ];
        const cached = buildOsidAdjacency(EDGES_A);
        const fresh = buildOsidAdjacency(edgesFresh);
        expect(fresh).not.toBe(cached); // different array identity → different cache entry
        // Content equality across both
        expect([...fresh.entries()].sort()).toEqual([...cached.entries()].sort());
    });
});

describe('buildSharedBoundaryAdjacency memoization', () => {
    it('returns the same Map instance on repeated calls with the same edges reference', () => {
        const first = buildSharedBoundaryAdjacency(EDGES_WITH_DIST);
        const second = buildSharedBoundaryAdjacency(EDGES_WITH_DIST);
        expect(second).toBe(first);
    });

    it('filters edges correctly on fresh compute (memo does not short-circuit the filter)', () => {
        // First call populates the cache. Filter: min_dist > 0.00005 excluded,
        // shared_segments === 0 excluded. Only EDGES_WITH_DIST[0] survives.
        const adj = buildSharedBoundaryAdjacency(EDGES_WITH_DIST);
        expect(adj.get('op:z:1')).toEqual(['op:z:2']);
        expect(adj.get('op:z:2')).toEqual(['op:z:1']);
        expect(adj.has('op:z:3')).toBe(false);
        expect(adj.has('op:z:4')).toBe(false);
    });

    it('is independent of the plain adjacency cache', () => {
        // Both caches indexed by the same edges array key, but they hold
        // different values (shared-boundary is a proper subset of plain).
        const plain = buildOsidAdjacency(EDGES_WITH_DIST);
        const shared = buildSharedBoundaryAdjacency(EDGES_WITH_DIST);
        expect(shared).not.toBe(plain);
        expect(plain.size).toBeGreaterThan(shared.size); // plain keeps the filtered-out edges
    });
});
