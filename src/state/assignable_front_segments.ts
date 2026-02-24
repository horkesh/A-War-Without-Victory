import type { FrontEdge } from '../map/front_edges.js';
import type { AssignableFrontSegmentState, FactionId } from './game_state.js';

interface Bucket {
    sideA: FactionId | null;
    sideB: FactionId | null;
    edgeIds: string[];
}

function normalizeSidePair(sideA: FactionId | null, sideB: FactionId | null): [FactionId | null, FactionId | null] {
    if (!sideA || !sideB) return [sideA, sideB];
    return sideA < sideB ? [sideA, sideB] : [sideB, sideA];
}

function sidePairKey(sideA: FactionId | null, sideB: FactionId | null): string {
    const [a, b] = normalizeSidePair(sideA, sideB);
    return `${a ?? 'null'}__${b ?? 'null'}`;
}

function edgeAdjacencyMap(frontEdges: FrontEdge[]): Map<string, Set<string>> {
    const adjacency = new Map<string, Set<string>>();
    const edgesBySettlement = new Map<string, string[]>();
    for (const edge of frontEdges) {
        const edgeId = edge.edge_id;
        if (!edgesBySettlement.has(edge.a)) edgesBySettlement.set(edge.a, []);
        if (!edgesBySettlement.has(edge.b)) edgesBySettlement.set(edge.b, []);
        edgesBySettlement.get(edge.a)!.push(edgeId);
        edgesBySettlement.get(edge.b)!.push(edgeId);
        if (!adjacency.has(edgeId)) adjacency.set(edgeId, new Set());
    }
    for (const edgeIds of edgesBySettlement.values()) {
        edgeIds.sort();
        for (let i = 0; i < edgeIds.length; i += 1) {
            for (let j = i + 1; j < edgeIds.length; j += 1) {
                const left = edgeIds[i];
                const right = edgeIds[j];
                adjacency.get(left)?.add(right);
                adjacency.get(right)?.add(left);
            }
        }
    }
    return adjacency;
}

/**
 * Build deterministic contiguous hostile-boundary components used as assignable HoI-style fronts.
 */
export function deriveAssignableFrontSegments(frontEdges: FrontEdge[]): AssignableFrontSegmentState[] {
    if (!Array.isArray(frontEdges) || frontEdges.length === 0) return [];

    const sortedEdges = [...frontEdges].sort((a, b) => a.edge_id.localeCompare(b.edge_id));
    const edgeMeta = new Map<string, { sideA: FactionId | null; sideB: FactionId | null }>();
    const bucketsByPair = new Map<string, Bucket>();
    for (const edge of sortedEdges) {
        const edgeId = edge.edge_id;
        const [sideA, sideB] = normalizeSidePair(edge.side_a as FactionId | null, edge.side_b as FactionId | null);
        edgeMeta.set(edgeId, { sideA, sideB });
        const pair = sidePairKey(sideA, sideB);
        const existing = bucketsByPair.get(pair);
        if (existing) {
            existing.edgeIds.push(edgeId);
        } else {
            bucketsByPair.set(pair, { sideA, sideB, edgeIds: [edgeId] });
        }
    }

    const adjacency = edgeAdjacencyMap(sortedEdges);
    const pairKeys = [...bucketsByPair.keys()].sort();
    const out: AssignableFrontSegmentState[] = [];

    for (const pairKey of pairKeys) {
        const bucket = bucketsByPair.get(pairKey);
        if (!bucket) continue;
        bucket.edgeIds.sort();

        const visited = new Set<string>();
        for (const seed of bucket.edgeIds) {
            if (visited.has(seed)) continue;
            const stack = [seed];
            visited.add(seed);
            const component: string[] = [];
            while (stack.length > 0) {
                const edgeId = stack.pop()!;
                component.push(edgeId);
                const neighbors = adjacency.get(edgeId);
                if (!neighbors) continue;
                const sortedNeighbors = [...neighbors].sort();
                for (const next of sortedNeighbors) {
                    if (visited.has(next)) continue;
                    const meta = edgeMeta.get(next);
                    if (!meta) continue;
                    if (sidePairKey(meta.sideA, meta.sideB) !== pairKey) continue;
                    visited.add(next);
                    stack.push(next);
                }
            }

            component.sort();
            const firstEdge = component[0];
            const frontId = `${pairKey}__${firstEdge}`;
            out.push({
                front_id: frontId,
                edge_ids: component,
                side_a: bucket.sideA,
                side_b: bucket.sideB,
                length_edges: component.length,
            });
        }
    }

    out.sort((a, b) => a.front_id.localeCompare(b.front_id));
    return out;
}

