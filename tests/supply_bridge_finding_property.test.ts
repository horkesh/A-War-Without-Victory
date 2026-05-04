/**
 * LANE-NIGHTSHIFT-SUPPLY-OSID-A0-TARJAN-WITH-GATES — G1 property test.
 *
 * 10,000 randomized BiH-shape trials. For each trial:
 *  - Generate a deterministic pseudo-planar graph with multi-component
 *    subgraph forcing (enclave-shaped).
 *  - Run BOTH legacy per-edge BFS-removal AND Tarjan.
 *  - Assert bridge SET equality (order-insensitive).
 *  - Assert per-edge classification identical.
 *
 * Determinism: seeded LCG inside generator (NOT Math.random), strictCompare
 * everywhere; this seed is the only randomness in the entire test.
 *
 * If the prior Mission C drift was caused by tie-breaking divergence at
 * multi-component subgraph boundaries (per spec §5), generators here
 * include enclave-shaped subgraphs as a forcing function.
 */
import { describe, it, expect } from 'vitest';
import {
    __test_findBridgesInSubgraphOsid as findBridgesInSubgraphOsid,
    __test_isBridgeInSubgraphOsidLegacy as isBridgeInSubgraphOsidLegacy,
} from '../src/state/supply_state_derivation.js';
import { strictCompare } from '../src/state/validateGameState.js';

// Deterministic 32-bit LCG (Numerical Recipes).
function makeRng(seed: number) {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 0x100000000;
    };
}

function eid(a: string, b: string): string {
    return a < b ? `${a}__${b}` : `${b}__${a}`;
}

interface Graph {
    /** All controlled OSIDs (full adjacency map keyspace). */
    adj: Map<string, string[]>;
    /** Reachable nodes (subset of adj.keys()). */
    reachable: Set<string>;
    /** Edges in subgraph (between reachable nodes). */
    edges: Set<string>;
}

/**
 * Build a BiH-shape pseudo-planar graph:
 *  - 1 main "heartland" component: ring + chords (creates 2-edge-connected core)
 *  - 0..3 "enclave" components: small disconnected paths/triangles
 *  - Random tail edges off the heartland that are guaranteed bridges
 *  - Total nodes ~300-800
 *  - Reachable = heartland ∪ enclaves (multi-component subgraph)
 *
 * Determinism: seeded RNG only.
 */
function generateBihShapeGraph(rng: () => number, vertexCount: number): Graph {
    const adj = new Map<string, string[]>();
    const edgeSet = new Set<string>();
    const reachable = new Set<string>();

    const addEdge = (a: string, b: string) => {
        if (a === b) return;
        if (!adj.has(a)) adj.set(a, []);
        if (!adj.has(b)) adj.set(b, []);
        const la = adj.get(a)!;
        const lb = adj.get(b)!;
        if (!la.includes(b)) la.push(b);
        if (!lb.includes(a)) lb.push(a);
        edgeSet.add(eid(a, b));
    };

    // Heartland ring: ~70% of vertices
    const heartlandSize = Math.max(3, Math.floor(vertexCount * 0.7));
    const heartland: string[] = [];
    for (let i = 0; i < heartlandSize; i++) {
        const id = `h${i.toString().padStart(4, '0')}`;
        heartland.push(id);
        reachable.add(id);
        if (!adj.has(id)) adj.set(id, []);
    }
    // Ring
    for (let i = 0; i < heartland.length; i++) {
        addEdge(heartland[i], heartland[(i + 1) % heartland.length]);
    }
    // Random chords (~heartlandSize × 0.3 chords) — turns ring into 2-edge-connected core
    const chordCount = Math.floor(heartlandSize * 0.3);
    for (let i = 0; i < chordCount; i++) {
        const a = heartland[Math.floor(rng() * heartland.length)];
        const b = heartland[Math.floor(rng() * heartland.length)];
        addEdge(a, b);
    }

    // Tail edges (guaranteed bridges): pick a heartland vertex, attach a
    // 1-2 vertex tail. ~10% of vertices used.
    const tailVertexBudget = Math.floor(vertexCount * 0.1);
    let tailIdx = 0;
    while (tailIdx < tailVertexBudget) {
        const anchor = heartland[Math.floor(rng() * heartland.length)];
        const t1 = `t${tailIdx.toString().padStart(4, '0')}`;
        reachable.add(t1);
        if (!adj.has(t1)) adj.set(t1, []);
        addEdge(anchor, t1);
        tailIdx++;
        // ~50% chance: t1-t2 path (creates 2 bridges)
        if (rng() < 0.5 && tailIdx < tailVertexBudget) {
            const t2 = `t${tailIdx.toString().padStart(4, '0')}`;
            reachable.add(t2);
            if (!adj.has(t2)) adj.set(t2, []);
            addEdge(t1, t2);
            tailIdx++;
        }
    }

    // Enclave components: 0..3 disconnected paths/triangles, all reachable.
    const enclaveCount = Math.floor(rng() * 4);
    let enclaveBase = 0;
    for (let e = 0; e < enclaveCount; e++) {
        const enclaveSize = 3 + Math.floor(rng() * 5); // 3..7
        const ids: string[] = [];
        for (let i = 0; i < enclaveSize; i++) {
            const id = `e${e}_${(enclaveBase + i).toString().padStart(4, '0')}`;
            ids.push(id);
            reachable.add(id);
            if (!adj.has(id)) adj.set(id, []);
        }
        enclaveBase += enclaveSize;
        const shape = rng();
        if (shape < 0.5) {
            // Path: every internal edge is a bridge
            for (let i = 0; i < ids.length - 1; i++) addEdge(ids[i], ids[i + 1]);
        } else {
            // Triangle + path tail
            addEdge(ids[0], ids[1]);
            addEdge(ids[1], ids[2]);
            addEdge(ids[0], ids[2]);
            for (let i = 2; i < ids.length - 1; i++) addEdge(ids[i], ids[i + 1]);
        }
    }

    // Optional unreachable nodes connected by edges that are NOT in `edges` set
    // (simulates `reachableNodes` filter — Tarjan must ignore them).
    const unreachableCount = Math.floor(rng() * Math.max(1, Math.floor(vertexCount * 0.05)));
    for (let i = 0; i < unreachableCount; i++) {
        const id = `u${i.toString().padStart(4, '0')}`;
        if (!adj.has(id)) adj.set(id, []);
        // Connect unreachable u to a heartland node (full-adj has the edge,
        // but the edge is NOT in `edges` set since unreachable side is filtered).
        const anchor = heartland[Math.floor(rng() * heartland.length)];
        if (!adj.get(anchor)!.includes(id)) adj.get(anchor)!.push(id);
        if (!adj.get(id)!.includes(anchor)) adj.get(id)!.push(anchor);
        // intentionally NOT added to edgeSet (subgraph excludes it)
    }

    // Sort all neighbor lists via strictCompare
    for (const list of adj.values()) list.sort(strictCompare);

    return { adj, reachable, edges: edgeSet };
}

function legacyBridgeSet(g: Graph): Set<string> {
    const out = new Set<string>();
    for (const e of g.edges) {
        if (isBridgeInSubgraphOsidLegacy(e, g.edges, g.reachable, g.adj)) out.add(e);
    }
    return out;
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const x of a) if (!b.has(x)) return false;
    return true;
}

describe('Tarjan vs legacy parity — G1 property test (10k trials)', () => {
    // Run as a single it() so vitest doesn't suffer 10k spec overhead.
    it('10000 randomized BiH-shape trials: Tarjan bridge-set === legacy bridge-set', () => {
        const TRIAL_COUNT = 10000;
        let mismatches = 0;
        let firstMismatch: { trial: number; legacy: string[]; tarjan: string[]; only_in_legacy: string[]; only_in_tarjan: string[] } | null = null;
        for (let trial = 0; trial < TRIAL_COUNT; trial++) {
            const seed = (trial + 1) * 2654435761; // Knuth multiplicative hash
            const rng = makeRng(seed >>> 0);
            // Vertex count varies 50..400 (BiH-scale heartland chunks)
            const vertexCount = 50 + Math.floor(rng() * 350);
            const g = generateBihShapeGraph(rng, vertexCount);

            const tarjan = findBridgesInSubgraphOsid(g.edges, g.reachable, g.adj);
            const legacy = legacyBridgeSet(g);

            if (!setsEqual(tarjan, legacy)) {
                mismatches++;
                if (firstMismatch === null) {
                    const onlyLegacy: string[] = [];
                    const onlyTarjan: string[] = [];
                    for (const e of legacy) if (!tarjan.has(e)) onlyLegacy.push(e);
                    for (const e of tarjan) if (!legacy.has(e)) onlyTarjan.push(e);
                    onlyLegacy.sort(strictCompare);
                    onlyTarjan.sort(strictCompare);
                    firstMismatch = {
                        trial,
                        legacy: [...legacy].sort(strictCompare).slice(0, 20),
                        tarjan: [...tarjan].sort(strictCompare).slice(0, 20),
                        only_in_legacy: onlyLegacy.slice(0, 20),
                        only_in_tarjan: onlyTarjan.slice(0, 20),
                    };
                }
            }
        }

        if (mismatches > 0) {
            // eslint-disable-next-line no-console
            console.error(`Property mismatch: ${mismatches}/${TRIAL_COUNT}`, firstMismatch);
        }
        expect(mismatches).toBe(0);
    }, 120_000);

    it('per-edge classification matches legacy on a stress trial (deeper check)', () => {
        const rng = makeRng(0xdeadbeef);
        const g = generateBihShapeGraph(rng, 700);
        const tarjan = findBridgesInSubgraphOsid(g.edges, g.reachable, g.adj);

        for (const e of g.edges) {
            const legacyIsBridge = isBridgeInSubgraphOsidLegacy(e, g.edges, g.reachable, g.adj);
            const tarjanIsBridge = tarjan.has(e);
            expect(tarjanIsBridge, `edge ${e}`).toBe(legacyIsBridge);
        }
    });
});
