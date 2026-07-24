/**
 * OSID adjacency graph utilities.
 *
 * General-purpose OSID graph utilities
 * used by supply, combat, sectors, column movement, and bot AI.
 *
 * Determinism: stable ordering (sorted neighbor lists); no randomness.
 *
 * v0.9.3 C1 memoization: both `buildOsidAdjacency` and `buildSharedBoundaryAdjacency`
 * are pure functions of the edges array. A WeakMap keyed on the array identity
 * caches the result so the 26 production call sites across combat, supply, sectors,
 * and bot AI share one build per (edges, scenario-run) pair. Edges don't change
 * within a scenario run, so hit rate approaches 100% after the first call.
 *
 * Safety: all production callers consume the returned Map via `.get()` / `.has()`
 * and BFS traversal. None of them mutate (`.set()` / `.delete()` / `.clear()`).
 * Grep audit recorded in `docs/40_reports/20260422_V093_PROFILING_BASELINE.md`.
 * If a new caller mutates the cached Map, memoization must be revisited.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { FormationId, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

export type Osid = string;

/** Per-edges-array memoization keys (WeakMap lets the cache entry be collected
 *  once the edges array itself is unreachable). */
const adjacencyCache = new WeakMap<EdgeRecord[], Map<Osid, Osid[]>>();
const sharedBoundaryCache = new WeakMap<EdgeRecord[], Map<Osid, Osid[]>>();

/**
 * Build OSID → sorted list of adjacent OSIDs from edge list.
 * Determinism: each neighbor list is sorted with strictCompare.
 * Memoized per-edges-array (see module header).
 */
export function buildOsidAdjacency(edges: EdgeRecord[]): Map<Osid, Osid[]> {
    const cached = adjacencyCache.get(edges);
    if (cached) return cached;
    const adj = computeOsidAdjacency(edges);
    adjacencyCache.set(edges, adj);
    return adj;
}

function computeOsidAdjacency(edges: EdgeRecord[]): Map<Osid, Osid[]> {
    const adj = new Map<Osid, Osid[]>();
    for (const e of edges) {
        if (!e?.a || !e?.b) continue;
        const listA = adj.get(e.a) ?? [];
        if (!listA.includes(e.b)) listA.push(e.b);
        adj.set(e.a, listA);
        const listB = adj.get(e.b) ?? [];
        if (!listB.includes(e.a)) listB.push(e.a);
        adj.set(e.b, listB);
    }
    for (const list of adj.values()) list.sort(strictCompare);
    return adj;
}


/**
 * Build OSID adjacency that only includes edges with true shared boundaries.
 * Excludes genuinely distant contacts while tolerating GeoJSON floating-point
 * precision gaps between adjacent polygons.
 *
 * Used by sector sub-segment construction (buildEdgeAdjacency) and segment
 * adjacency checks (isSegmentAdjacent). NOT used by splitNonContiguousSectors
 * (which uses shared-OSID connectivity).
 *
 * SHARED_BOUNDARY_THRESHOLD: 0.00005 degrees ≈ 5.5 meters.
 * The operational GeoJSON has float-precision gaps on most polygon boundaries —
 * at threshold=0, only 4% of edges pass (131/3243). At 0.00005, 64% pass,
 * capturing all true neighbors while excluding genuinely distant polygons.
 * Edges without min_dist are treated as shared boundaries (conservative).
 *
 * Memoized per-edges-array (see module header).
 */
const SHARED_BOUNDARY_THRESHOLD = 0.00005;

export function buildSharedBoundaryAdjacency(edges: EdgeRecord[]): Map<Osid, Osid[]> {
    const cached = sharedBoundaryCache.get(edges);
    if (cached) return cached;
    const adj = computeSharedBoundaryAdjacency(edges);
    sharedBoundaryCache.set(edges, adj);
    return adj;
}

function computeSharedBoundaryAdjacency(edges: EdgeRecord[]): Map<Osid, Osid[]> {
    const adj = new Map<Osid, Osid[]>();
    for (const e of edges) {
        if (!e?.a || !e?.b) continue;
        // Only include edges with true shared boundaries
        if (e.min_dist !== undefined && e.min_dist > SHARED_BOUNDARY_THRESHOLD) continue;
        // Skip point-only contacts (single shared vertex, no boundary segment)
        if (e.shared_segments !== undefined && e.shared_segments === 0) continue;
        const listA = adj.get(e.a) ?? [];
        if (!listA.includes(e.b)) listA.push(e.b);
        adj.set(e.a, listA);
        const listB = adj.get(e.b) ?? [];
        if (!listB.includes(e.a)) listB.push(e.a);
        adj.set(e.b, listB);
    }
    for (const list of adj.values()) list.sort(strictCompare);
    return adj;
}

/**
 * Extract municipality slug from an OSID.
 * OSID format: `op:municipality:slug` → returns `municipality`.
 */
export function munFromOsid(osid: string): string | undefined {
    return osid.split(':')[1];
}

/** Brigade is deployed if movement_state (from brigade_movement_state) is 'deployed' or absent. */
export function isBrigadeDeployed(state: GameState, formationId: FormationId): boolean {
    const status = state.military.brigade_movement_state?.[formationId]?.status;
    return status === 'deployed' || status === undefined;
}
