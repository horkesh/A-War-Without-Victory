export type AdjacencyMap = Record<string, string[]>;
export type SettlementAdjacencyEdge = Readonly<{ a: string; b: string }>;

export function buildAdjacencyMap(settlementEdges: ReadonlyArray<{ a: string; b: string }>): AdjacencyMap {
    const tmp = new Map<string, Set<string>>();
    for (const e of settlementEdges ?? []) {
        if (!e || typeof e.a !== 'string' || typeof e.b !== 'string') continue;
        const a = e.a;
        const b = e.b;
        if (!tmp.has(a)) tmp.set(a, new Set());
        if (!tmp.has(b)) tmp.set(b, new Set());
        tmp.get(a)!.add(b);
        tmp.get(b)!.add(a);
    }

    const out: AdjacencyMap = {};
    const keysSorted = Array.from(tmp.keys()).sort();
    for (const k of keysSorted) {
        out[k] = Array.from(tmp.get(k) ?? []).sort();
    }
    return out;
}

const adjacencyByImmutableEdges = new WeakMap<ReadonlyArray<SettlementAdjacencyEdge>, AdjacencyMap>();
const registeredImmutableEdges = new WeakSet<ReadonlyArray<SettlementAdjacencyEdge>>();

/**
 * Establish the runtime immutability contract required by identity caching.
 *
 * Registration is intentionally explicit at graph-ownership boundaries. It
 * freezes both the edge records and their containing array, then remembers the
 * identity so repeated consumers do not need to rescan the array. Arbitrary
 * mutable arrays remain valid inputs, but are rebuilt on every call.
 */
export function registerImmutableSettlementEdges<T extends ReadonlyArray<SettlementAdjacencyEdge>>(
    settlementEdges: T,
): T {
    for (const edge of settlementEdges) {
        if (edge && typeof edge === 'object' && !Object.isFrozen(edge)) {
            Object.freeze(edge);
        }
    }
    if (!Object.isFrozen(settlementEdges)) {
        Object.freeze(settlementEdges);
    }
    registeredImmutableEdges.add(settlementEdges);
    return settlementEdges;
}

function isImmutableEdgeIdentity(
    settlementEdges: ReadonlyArray<SettlementAdjacencyEdge>,
): boolean {
    if (registeredImmutableEdges.has(settlementEdges)) return true;
    if (!Object.isFrozen(settlementEdges)) return false;
    for (const edge of settlementEdges) {
        if (!edge || typeof edge !== 'object' || !Object.isFrozen(edge)) return false;
    }
    registeredImmutableEdges.add(settlementEdges);
    return true;
}

/**
 * Reuse adjacency derived from an immutable edge-array identity.
 *
 * The cached value is deeply frozen so no phase can alter ordering or leak a
 * mutation into another consumer. Mutable or reconstructed edge inputs should
 * continue to call buildAdjacencyMap directly.
 */
export function buildAdjacencyMapCached(
    settlementEdges: ReadonlyArray<SettlementAdjacencyEdge>,
): AdjacencyMap {
    if (!isImmutableEdgeIdentity(settlementEdges)) {
        return buildAdjacencyMap(settlementEdges);
    }
    const cached = adjacencyByImmutableEdges.get(settlementEdges);
    if (cached) return cached;

    const adjacency = buildAdjacencyMap(settlementEdges);
    for (const neighbours of Object.values(adjacency)) {
        Object.freeze(neighbours);
    }
    Object.freeze(adjacency);
    adjacencyByImmutableEdges.set(settlementEdges, adjacency);
    return adjacency;
}
