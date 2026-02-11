import { GameState } from '../state/game_state.js';
import { getSettlementControlStatus } from '../state/settlement_control.js';
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
