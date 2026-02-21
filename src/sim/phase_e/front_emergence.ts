/**
 * Phase E1.2: Front emergence (derived spatial formalization).
 * Derives fronts as emergent spatial phenomena from:
 * - opposing political control
 * - pressure eligibility (Phase E1.1)
 * - sustained adjacency (current opposing-control edges)
 *
 * Fronts are DERIVED and recomputed each turn. No AoRs, no combat, no control/authority changes.
 * Engine Invariants §6, §13.1–§13.2.
 */


import { computeFrontEdges } from '../../map/front_edges.js';
import type { EdgeRecord } from '../../map/settlements.js';
import type { GameState, PhaseIIFrontDescriptor } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { deriveFrontStability } from '../phase_ii/front_emergence.js';
import { isPressureEligible } from './pressure_eligibility.js';

/**
 * Derive Phase II fronts from pressure-eligible edges (front-active settlement edges only).
 * An edge is front-active iff it has opposing political control AND is pressure-eligible.
 * Runs only when meta.phase === 'phase_ii'. Returns [] otherwise.
 * Deterministic: stable sort by edge_id and faction pair.
 */
export function derivePhaseIIFrontsFromPressureEligible(
    state: GameState,
    settlementEdges: EdgeRecord[]
): PhaseIIFrontDescriptor[] {
    if (state.meta.phase !== 'phase_ii') {
        return [];
    }

    const allFrontEdges = computeFrontEdges(state, settlementEdges);
    const frontActiveEdges = allFrontEdges.filter((fe) =>
        isPressureEligible(state, { a: fe.a, b: fe.b })
    );

    if (frontActiveEdges.length === 0) {
        return [];
    }

    // Group by normalized side-pair (deterministic key)
    const byPair = new Map<string, typeof frontActiveEdges>();
    for (const fe of frontActiveEdges) {
        const sideA = fe.side_a ?? '';
        const sideB = fe.side_b ?? '';
        const pairKey = sideA < sideB ? `${sideA}--${sideB}` : `${sideB}--${sideA}`;
        if (!byPair.has(pairKey)) {
            byPair.set(pairKey, []);
        }
        byPair.get(pairKey)!.push(fe);
    }

    const turn = state.meta.turn;
    const segments = state.front_segments ?? {};
    const descriptors: PhaseIIFrontDescriptor[] = [];

    const pairKeys = Array.from(byPair.keys()).sort(strictCompare);
    for (const pairKey of pairKeys) {
        const edges = byPair.get(pairKey)!;
        const edgeIds = edges.map((e) => e.edge_id).sort(strictCompare);
        const createdTurn =
            edgeIds.length > 0
                ? Math.min(
                    ...edgeIds.map((eid) =>
                        segments[eid]?.created_turn != null ? segments[eid].created_turn! : turn
                    )
                )
                : turn;
        const id = `FE_${pairKey}_${edgeIds[0] ?? 'none'}`;
        const stability = deriveFrontStability(edgeIds, segments);
        descriptors.push({
            id,
            edge_ids: edgeIds,
            created_turn: createdTurn,
            stability
        });
    }

    return descriptors;
}
