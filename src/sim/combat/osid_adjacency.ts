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

/** Brigade is deployed if movement_state (from brigade_movement_state) is 'deployed' or absent. */
export function isBrigadeDeployed(state: GameState, formationId: FormationId): boolean {
    const status = state.brigade_movement_state?.[formationId]?.status;
    return status === 'deployed' || status === undefined;
}
