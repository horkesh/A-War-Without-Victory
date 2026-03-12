/**
 * OSID adjacency graph utilities.
 *
 * General-purpose OSID graph utilities
 * used by supply, combat, sectors, column movement, and bot AI.
 *
 * Determinism: stable ordering (sorted neighbor lists); no randomness.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { FormationId, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

export type Osid = string;

/**
 * Build OSID → sorted list of adjacent OSIDs from edge list.
 * Determinism: each neighbor list is sorted with localeCompare.
 */
export function buildOsidAdjacency(edges: EdgeRecord[]): Map<Osid, Osid[]> {
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
 * Build OSID adjacency that only includes edges with true shared boundaries
 * (min_dist === 0, exact). Excludes point contacts (min_dist > 0 but tiny)
 * and distance-based contacts (min_dist > threshold).
 *
 * Used by sector contiguity checks to prevent sectors from spanning across
 * enemy territory via triple-junction point contacts.
 *
 * SHARED_BOUNDARY_THRESHOLD: Edges with min_dist ≤ this are "shared boundary".
 * Set to 0 to require exact boundary sharing; set higher to tolerate FP noise.
 * Edges without min_dist are treated as shared boundaries (conservative).
 */
const SHARED_BOUNDARY_THRESHOLD = 0;

export function buildSharedBoundaryAdjacency(edges: EdgeRecord[]): Map<Osid, Osid[]> {
    const adj = new Map<Osid, Osid[]>();
    for (const e of edges) {
        if (!e?.a || !e?.b) continue;
        // Only include edges with true shared boundaries
        if (e.min_dist !== undefined && e.min_dist > SHARED_BOUNDARY_THRESHOLD) continue;
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

/** Brigade is deployed if movement_state (from brigade_movement_state) is 'deployed' or absent. */
export function isBrigadeDeployed(state: GameState, formationId: FormationId): boolean {
    const status = state.military.brigade_movement_state?.[formationId]?.status;
    return status === 'deployed' || status === undefined;
}
