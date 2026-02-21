/**
 * Apply brigade reposition orders: set a brigade's AoR to exactly the given 1–4
 * contiguous faction-controlled settlements (no physical move).
 * Consumed each turn; deterministic order.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { FormationId, GameState, SettlementId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getBrigadeAoRSettlements } from './brigade_aor.js';
import { buildAdjacencyFromEdges, isSettlementSetContiguous } from './phase_ii_adjacency.js';

const MIN_REPOSITION = 1;
const MAX_REPOSITION = 4;

/**
 * Apply all pending brigade reposition orders. Invalid orders are skipped.
 * Clears state.brigade_reposition_orders after processing.
 */
export function applyBrigadeRepositionOrders(state: GameState, edges: EdgeRecord[]): void {
    const orders = state.brigade_reposition_orders;
    if (!orders || typeof orders !== 'object' || Object.keys(orders).length === 0) {
        state.brigade_reposition_orders = undefined;
        return;
    }
    const brigadeAor = state.brigade_aor;
    if (!brigadeAor) {
        state.brigade_reposition_orders = undefined;
        return;
    }

    const formations = state.formations ?? {};
    const pc = state.political_controllers ?? {};
    const adj = buildAdjacencyFromEdges(edges);

    for (const formationId of (Object.keys(orders) as FormationId[]).sort(strictCompare)) {
        const order = orders[formationId];
        if (!order?.settlement_ids?.length) continue;

        const formation = formations[formationId];
        if (!formation || (formation.kind ?? 'brigade') !== 'brigade' || !formation.faction) continue;

        const factionId = formation.faction;
        const sids = [...order.settlement_ids].sort(strictCompare);

        if (sids.length < MIN_REPOSITION || sids.length > MAX_REPOSITION) continue;
        const allFaction = sids.every(sid => pc[sid] === factionId);
        if (!allFaction) continue;
        if (!isSettlementSetContiguous(sids, adj)) continue;

        // Clear current AoR for this brigade
        const currentSids = getBrigadeAoRSettlements(state, formationId);
        for (const sid of currentSids) {
            if (brigadeAor[sid] === formationId) brigadeAor[sid] = null;
        }

        // Set new AoR
        for (const sid of sids) {
            brigadeAor[sid] = formationId;
        }
    }

    state.brigade_reposition_orders = undefined;
}
