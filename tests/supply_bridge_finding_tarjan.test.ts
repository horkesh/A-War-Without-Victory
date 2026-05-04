/**
 * LANE-NIGHTSHIFT-SUPPLY-OSID-A0-TARJAN-WITH-GATES — basic correctness.
 *
 * Tests `findBridgesInSubgraphOsid` (Tarjan) on small known graphs against
 * hand-verified bridge sets and against the legacy per-edge BFS-removal.
 *
 * Determinism: all neighbor lists sorted via strictCompare; output sorted
 * via localeCompare.
 */
import { describe, it, expect } from 'vitest';
import {
    __test_findBridgesInSubgraphOsid as findBridgesInSubgraphOsid,
    __test_isBridgeInSubgraphOsidLegacy as isBridgeInSubgraphOsidLegacy,
} from '../src/state/supply_state_derivation.js';

/** Build a sorted adjacency Map from undirected edge pairs. */
function buildAdj(edges: Array<[string, string]>): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const [a, b] of edges) {
        if (!adj.has(a)) adj.set(a, []);
        if (!adj.has(b)) adj.set(b, []);
        if (!adj.get(a)!.includes(b)) adj.get(a)!.push(b);
        if (!adj.get(b)!.includes(a)) adj.get(b)!.push(a);
    }
    for (const list of adj.values()) list.sort();
    return adj;
}

function eid(a: string, b: string): string {
    return a < b ? `${a}__${b}` : `${b}__${a}`;
}

function edgeSet(edges: Array<[string, string]>): Set<string> {
    const s = new Set<string>();
    for (const [a, b] of edges) s.add(eid(a, b));
    return s;
}

function nodeSet(edges: Array<[string, string]>): Set<string> {
    const s = new Set<string>();
    for (const [a, b] of edges) { s.add(a); s.add(b); }
    return s;
}

function legacyBridges(
    edges: Set<string>,
    nodes: Set<string>,
    adj: Map<string, string[]>
): Set<string> {
    const out = new Set<string>();
    for (const e of edges) {
        if (isBridgeInSubgraphOsidLegacy(e, edges, nodes, adj)) out.add(e);
    }
    return out;
}

describe('Tarjan findBridgesInSubgraphOsid — small known graphs', () => {
    it('triangle: zero bridges (every edge in a 3-cycle)', () => {
        const edges: Array<[string, string]> = [['a', 'b'], ['b', 'c'], ['a', 'c']];
        const adj = buildAdj(edges);
        const nodes = nodeSet(edges);
        const eset = edgeSet(edges);
        const bridges = findBridgesInSubgraphOsid(eset, nodes, adj);
        expect(bridges.size).toBe(0);
    });

    it('path a-b-c-d: every edge is a bridge', () => {
        const edges: Array<[string, string]> = [['a', 'b'], ['b', 'c'], ['c', 'd']];
        const adj = buildAdj(edges);
        const nodes = nodeSet(edges);
        const eset = edgeSet(edges);
        const bridges = findBridgesInSubgraphOsid(eset, nodes, adj);
        expect(bridges).toEqual(new Set([eid('a', 'b'), eid('b', 'c'), eid('c', 'd')]));
    });

    it('square a-b-c-d-a: zero bridges', () => {
        const edges: Array<[string, string]> = [['a', 'b'], ['b', 'c'], ['c', 'd'], ['a', 'd']];
        const adj = buildAdj(edges);
        const nodes = nodeSet(edges);
        const eset = edgeSet(edges);
        const bridges = findBridgesInSubgraphOsid(eset, nodes, adj);
        expect(bridges.size).toBe(0);
    });

    it('square + tail e: tail edge d-e is the only bridge', () => {
        const edges: Array<[string, string]> = [['a', 'b'], ['b', 'c'], ['c', 'd'], ['a', 'd'], ['d', 'e']];
        const adj = buildAdj(edges);
        const nodes = nodeSet(edges);
        const eset = edgeSet(edges);
        const bridges = findBridgesInSubgraphOsid(eset, nodes, adj);
        expect(bridges).toEqual(new Set([eid('d', 'e')]));
    });

    it('two triangles connected by a bridge edge x-y', () => {
        const edges: Array<[string, string]> = [
            ['a', 'b'], ['b', 'c'], ['a', 'c'], // triangle 1
            ['x', 'b'], // bridge
            ['x', 'y'], ['y', 'z'], ['x', 'z'], // triangle 2
        ];
        const adj = buildAdj(edges);
        const nodes = nodeSet(edges);
        const eset = edgeSet(edges);
        const bridges = findBridgesInSubgraphOsid(eset, nodes, adj);
        expect(bridges).toEqual(new Set([eid('b', 'x')]));
    });

    it('two disjoint components: handles each component', () => {
        const edges: Array<[string, string]> = [
            ['a', 'b'], ['b', 'c'], // path in component 1 → both bridges
            ['x', 'y'], ['y', 'z'], ['x', 'z'], // triangle in component 2 → no bridges
        ];
        const adj = buildAdj(edges);
        const nodes = nodeSet(edges);
        const eset = edgeSet(edges);
        const bridges = findBridgesInSubgraphOsid(eset, nodes, adj);
        expect(bridges).toEqual(new Set([eid('a', 'b'), eid('b', 'c')]));
    });

    it('isolated reachable node (no edges) does not crash', () => {
        const adj = new Map<string, string[]>();
        adj.set('a', []);
        const eset = new Set<string>();
        const nodes = new Set<string>(['a']);
        const bridges = findBridgesInSubgraphOsid(eset, nodes, adj);
        expect(bridges.size).toBe(0);
    });

    it('reachable nodes only — edges to unreachable nodes are ignored', () => {
        // Full edge set includes b-d, but d is NOT in reachableNodes.
        const allEdges: Array<[string, string]> = [['a', 'b'], ['b', 'c'], ['a', 'c'], ['b', 'd']];
        const adj = buildAdj(allEdges);
        const nodes = new Set<string>(['a', 'b', 'c']); // d not reachable
        const eset = new Set<string>([eid('a', 'b'), eid('b', 'c'), eid('a', 'c')]);
        const bridges = findBridgesInSubgraphOsid(eset, nodes, adj);
        expect(bridges.size).toBe(0); // triangle, no bridges
    });

    it('matches legacy on enclave-shaped graph (multi-component subgraph)', () => {
        // Heartland: a-b-c-a (triangle).  Enclave: e-f-g (path).
        // The two components share no edges.
        const edges: Array<[string, string]> = [
            ['a', 'b'], ['b', 'c'], ['a', 'c'],
            ['e', 'f'], ['f', 'g'],
        ];
        const adj = buildAdj(edges);
        const nodes = nodeSet(edges);
        const eset = edgeSet(edges);
        const tarjan = findBridgesInSubgraphOsid(eset, nodes, adj);
        const legacy = legacyBridges(eset, nodes, adj);
        expect(tarjan).toEqual(legacy);
    });
});
