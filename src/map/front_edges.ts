import { areRbihHrhbAllied } from '../sim/phase_i/alliance_update.js';
import { GameState } from '../state/game_state.js';
import { getPoliticalControllerOSID, getSettlementControlStatus } from '../state/settlement_control.js';
import type { OperationalToCanonicalReverseMap } from '../data/operational_data.js';
import { EdgeRecord } from './settlements.js';


export interface FrontEdge {
    edge_id: string;
    a: string;
    b: string;
    side_a: string | null;
    side_b: string | null;
}

export interface FrontEdgeStats {
    total_front_edges: number;
    side_pairs: Record<string, number>;
}

/**
 * Compute front edges from settlement adjacency edges and current state.
 *
 * A front edge exists for any settlement adjacency edge (A,B) where:
 * - side(A) != side(B)
 * - Both sides are not null (ignore neutral/none for now)
 * - RBiH–HRHB: no front until they start a war (turn >= rbih_hrhb_war_earliest_turn and not allied)
 *
 * @param state Current game state
 * @param settlementEdges Settlement adjacency edges
 * @returns Stable list of front edges with normalized ordering (a < b)
 */
export function computeFrontEdges(
    state: GameState,
    settlementEdges: EdgeRecord[]
): FrontEdge[] {
    const frontEdges: FrontEdge[] = [];

    for (const edge of settlementEdges) {
        const statusA = getSettlementControlStatus(state, edge.a);
        const statusB = getSettlementControlStatus(state, edge.b);

        if (statusA.kind === 'unknown' || statusB.kind === 'unknown') {
            continue;
        }

        const sideA = statusA.side;
        const sideB = statusB.side;

        if (sideA !== sideB) {
            const isRbihHrhbPair =
                (sideA === 'RBiH' && sideB === 'HRHB') || (sideA === 'HRHB' && sideB === 'RBiH');
            if (isRbihHrhbPair) {
                const turn = state.meta?.turn ?? 0;
                const earliestWar = state.meta?.rbih_hrhb_war_earliest_turn ?? 26;
                const beforeWar = turn < earliestWar;
                if (beforeWar || areRbihHrhbAllied(state)) continue;
            }

            const [a, b, side_a, side_b] = edge.a < edge.b
                ? [edge.a, edge.b, sideA, sideB]
                : [edge.b, edge.a, sideB, sideA];

            const edge_id = `${a}__${b}`;

            frontEdges.push({
                edge_id,
                a,
                b,
                side_a: side_a,
                side_b: side_b
            });
        }
    }

    // Sort for deterministic output
    frontEdges.sort((e1, e2) => {
        if (e1.a !== e2.a) {
            return e1.a.localeCompare(e2.a);
        }
        return e1.b.localeCompare(e2.b);
    });

    return frontEdges;
}

/**
 * Compute front edges from OSID adjacency and OSID-level control.
 * Same contract as FrontEdge[] but a/b are OSIDs; used when operational data is present.
 */
export function computeFrontEdgesOsid(
    state: GameState,
    osidEdges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap
): FrontEdge[] {
    const frontEdges: FrontEdge[] = [];
    for (const edge of osidEdges) {
        const sideA = getPoliticalControllerOSID(state, edge.a, reverseMap);
        const sideB = getPoliticalControllerOSID(state, edge.b, reverseMap);
        if (sideA === null || sideB === null || sideA === sideB) continue;
        const isRbihHrhbPair = (sideA === 'RBiH' && sideB === 'HRHB') || (sideA === 'HRHB' && sideB === 'RBiH');
        if (isRbihHrhbPair) {
            const turn = state.meta?.turn ?? 0;
            const earliestWar = state.meta?.rbih_hrhb_war_earliest_turn ?? 26;
            if (turn < earliestWar || areRbihHrhbAllied(state)) continue;
        }
        const [a, b, side_a, side_b] = edge.a < edge.b
            ? [edge.a, edge.b, sideA, sideB]
            : [edge.b, edge.a, sideB, sideA];
        frontEdges.push({
            edge_id: `${a}__${b}`,
            a,
            b,
            side_a,
            side_b
        });
    }
    frontEdges.sort((e1, e2) => {
        if (e1.a !== e2.a) return e1.a.localeCompare(e2.a);
        return e1.b.localeCompare(e2.b);
    });
    return frontEdges;
}

/**
 * Compute front edge statistics.
 * Groups front edges by side-pair combinations.
 */
export function computeFrontEdgeStats(frontEdges: FrontEdge[]): FrontEdgeStats {
    const sidePairs: Record<string, number> = {};

    for (const edge of frontEdges) {
        // Create normalized side-pair key (alphabetical order)
        const pairKey = edge.side_a! < edge.side_b!
            ? `${edge.side_a}–${edge.side_b}`
            : `${edge.side_b}–${edge.side_a}`;

        sidePairs[pairKey] = (sidePairs[pairKey] || 0) + 1;
    }

    return {
        total_front_edges: frontEdges.length,
        side_pairs: sidePairs
    };
}
