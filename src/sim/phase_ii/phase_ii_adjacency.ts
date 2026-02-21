/**
 * Shared Phase II helpers: adjacency from edges (Set-based) and faction brigades.
 * Used by bot_corps_ai, bot_brigade_ai, and brigade_aor for deterministic iteration.
 *
 * Deterministic: sorted keys, no randomness.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { FactionId, FormationState, GameState, SettlementId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/**
 * Build adjacency map from edge list: each settlement -> set of neighbor SIDs.
 * Used by bot AI and AoR rebalancing for front/neighbor checks.
 */
export function buildAdjacencyFromEdges(
    edges: EdgeRecord[]
): Map<SettlementId, Set<SettlementId>> {
    const adj = new Map<SettlementId, Set<SettlementId>>();
    for (const e of edges) {
        if (!e?.a || !e?.b) continue;
        let setA = adj.get(e.a);
        if (!setA) {
            setA = new Set();
            adj.set(e.a, setA);
        }
        setA.add(e.b);
        let setB = adj.get(e.b);
        if (!setB) {
            setB = new Set();
            adj.set(e.b, setB);
        }
        setB.add(e.a);
    }
    return adj;
}

/**
 * True iff the given settlement IDs form a single connected component in the adjacency graph.
 * Used by apply_brigade_reposition and desktop validateBrigadeRepositionOrder.
 */
export function isSettlementSetContiguous(
    sids: SettlementId[],
    adj: Map<SettlementId, Set<SettlementId>>
): boolean {
    if (sids.length === 0) return true;
    const sidSet = new Set(sids);
    const queue = [sids[0]];
    const reached = new Set<SettlementId>();
    reached.add(sids[0]);
    while (queue.length > 0) {
        const s = queue.shift()!;
        const neighbors = adj.get(s);
        if (neighbors) {
            for (const n of neighbors) {
                if (sidSet.has(n) && !reached.has(n)) {
                    reached.add(n);
                    queue.push(n);
                }
            }
        }
    }
    return reached.size === sids.length;
}

/**
 * Get all active brigades for a faction, sorted by formation ID.
 */
export function getFactionBrigades(state: GameState, faction: FactionId): FormationState[] {
    const formations = state.formations ?? {};
    const result: FormationState[] = [];
    for (const id of Object.keys(formations).sort(strictCompare)) {
        const f = formations[id];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if ((f.kind ?? 'brigade') !== 'brigade') continue;
        result.push(f);
    }
    return result;
}
