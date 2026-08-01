import { describe, expect, it } from 'vitest';

import {
    buildAdjacencyMap,
    buildAdjacencyMapCached,
    registerImmutableSettlementEdges,
} from '../src/map/adjacency_map.js';

describe('immutable settlement-edge adjacency reuse', () => {
    it('returns the exact uncached result while reusing one frozen value per edge-array identity', () => {
        const edges = registerImmutableSettlementEdges([
            { a: 'c', b: 'a' },
            { a: 'a', b: 'b' },
            { a: 'a', b: 'b' },
        ]);

        const expected = buildAdjacencyMap(edges);
        const first = buildAdjacencyMapCached(edges);
        const second = buildAdjacencyMapCached(edges);

        expect(first).toEqual(expected);
        expect(second).toBe(first);
        expect(Object.isFrozen(first)).toBe(true);
        for (const neighbours of Object.values(first)) {
            expect(Object.isFrozen(neighbours)).toBe(true);
        }
    });

    it('does not alias equal-but-distinct edge arrays', () => {
        const firstEdges = registerImmutableSettlementEdges([{ a: 'a', b: 'b' }]);
        const secondEdges = registerImmutableSettlementEdges([{ a: 'a', b: 'b' }]);

        const first = buildAdjacencyMapCached(firstEdges);
        const second = buildAdjacencyMapCached(secondEdges);

        expect(second).toEqual(first);
        expect(second).not.toBe(first);
    });

    it('prevents one consumer from corrupting adjacency seen by later phases', () => {
        const edges = registerImmutableSettlementEdges([{ a: 'a', b: 'b' }]);
        const adjacency = buildAdjacencyMapCached(edges);

        expect(() => adjacency.a.push('corrupt')).toThrow();
        expect(buildAdjacencyMapCached(edges)).toEqual({ a: ['b'], b: ['a'] });
    });

    it('keeps arbitrary mutable arrays uncached so same-identity mutations are observed', () => {
        const edges = [{ a: 'a', b: 'b' }];

        const first = buildAdjacencyMapCached(edges);
        const second = buildAdjacencyMapCached(edges);
        expect(second).toEqual(first);
        expect(second).not.toBe(first);

        edges.push({ a: 'b', b: 'c' });

        expect(buildAdjacencyMapCached(edges)).toEqual({
            a: ['b'],
            b: ['a', 'c'],
            c: ['b'],
        });
    });

    it('deep-freezes a registered production edge identity before caching it', () => {
        const edge = { a: 'a', b: 'b' };
        const edges = registerImmutableSettlementEdges([edge]);

        expect(Object.isFrozen(edges)).toBe(true);
        expect(Object.isFrozen(edge)).toBe(true);
        expect(buildAdjacencyMapCached(edges)).toBe(buildAdjacencyMapCached(edges));
        expect(() => (edge.a = 'mutated')).toThrow();
    });

    it('accepts an independently deep-frozen edge identity without registration', () => {
        const edges = Object.freeze([
            Object.freeze({ a: 'a', b: 'b' }),
        ]);

        expect(buildAdjacencyMapCached(edges)).toBe(buildAdjacencyMapCached(edges));
    });
});
