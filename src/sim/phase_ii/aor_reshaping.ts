/**
 * Stage 4A: AoR reshaping -- transfer settlements between brigades.
 * This is how brigade "movement" works: AoR boundary shifts.
 * Settlements are reassigned from one brigade to another, shifting responsibility.
 *
 * Deterministic: no randomness, no timestamps. All iteration in sorted order.
 */

import type {
  GameState,
  FormationId,
  SettlementId,
  BrigadeAoROrder
} from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { strictCompare } from '../../state/validateGameState.js';

// --- Types ---

export interface ReshapeReport {
  transfers_applied: number;
  transfers_rejected: number;
  rejected_reasons: string[];
}

// --- Helpers ---

/**
 * Build adjacency map from edge list.
 * Returns Map<SettlementId, Set<SettlementId>> for O(1) neighbor lookup.
 */
function buildAdjacency(edges: EdgeRecord[]): Map<SettlementId, Set<SettlementId>> {
  const adj = new Map<SettlementId, Set<SettlementId>>();
  for (const edge of edges) {
    let setA = adj.get(edge.a);
    if (!setA) { setA = new Set(); adj.set(edge.a, setA); }
    setA.add(edge.b);

    let setB = adj.get(edge.b);
    if (!setB) { setB = new Set(); adj.set(edge.b, setB); }
    setB.add(edge.a);
  }
  return adj;
}

/**
 * Count how many settlements are currently assigned to a given brigade.
 */
function countBrigadeSettlements(
  brigadeAor: Record<SettlementId, FormationId | null>,
  brigadeId: FormationId
): number {
  let count = 0;
  for (const sid of Object.keys(brigadeAor)) {
    if (brigadeAor[sid] === brigadeId) count++;
  }
  return count;
}

/**
 * Check whether settlement is adjacent to at least one settlement in target brigade's AoR.
 */
function isAdjacentToTargetAoR(
  settlementId: SettlementId,
  targetBrigade: FormationId,
  brigadeAor: Record<SettlementId, FormationId | null>,
  adj: Map<SettlementId, Set<SettlementId>>
): boolean {
  const neighbors = adj.get(settlementId);
  if (!neighbors) return false;
  for (const neighbor of neighbors) {
    if (brigadeAor[neighbor] === targetBrigade) return true;
  }
  return false;
}

// --- Public API ---

/**
 * Validate a single reshape order.
 * Returns error string if invalid, or null if valid.
 */
export function validateReshapeOrder(
  state: GameState,
  order: BrigadeAoROrder,
  edges: EdgeRecord[]
): string | null {
  const brigadeAor = state.brigade_aor;
  if (!brigadeAor) {
    return 'brigade_aor not initialized';
  }

  const formations = state.formations ?? {};
  const { settlement_id, from_brigade, to_brigade } = order;

  // 1. Settlement must exist in brigade_aor and currently be assigned to from_brigade
  if (!(settlement_id in brigadeAor)) {
    return `settlement ${settlement_id} not found in brigade_aor`;
  }
  if (brigadeAor[settlement_id] !== from_brigade) {
    return `settlement ${settlement_id} is not assigned to ${from_brigade} (currently: ${brigadeAor[settlement_id] ?? 'null'})`;
  }

  // 2. Both brigades must exist, be same faction, active, kind=brigade
  const fromBrig = formations[from_brigade];
  const toBrig = formations[to_brigade];
  if (!fromBrig) return `from_brigade ${from_brigade} not found`;
  if (!toBrig) return `to_brigade ${to_brigade} not found`;
  if (fromBrig.status !== 'active') return `from_brigade ${from_brigade} is not active (status: ${fromBrig.status})`;
  if (toBrig.status !== 'active') return `to_brigade ${to_brigade} is not active (status: ${toBrig.status})`;
  if ((fromBrig.kind ?? 'brigade') !== 'brigade') return `from_brigade ${from_brigade} is not a brigade (kind: ${fromBrig.kind})`;
  if ((toBrig.kind ?? 'brigade') !== 'brigade') return `to_brigade ${to_brigade} is not a brigade (kind: ${toBrig.kind})`;
  if (fromBrig.faction !== toBrig.faction) {
    return `brigades are not same faction: ${fromBrig.faction} vs ${toBrig.faction}`;
  }

  // 3. Settlement must be adjacent to at least one settlement already in to_brigade's AoR
  const adj = buildAdjacency(edges);
  if (!isAdjacentToTargetAoR(settlement_id, to_brigade, brigadeAor, adj)) {
    return `settlement ${settlement_id} is not adjacent to any settlement in ${to_brigade}'s AoR`;
  }

  // 4. from_brigade must retain at least 1 settlement after transfer
  const currentCount = countBrigadeSettlements(brigadeAor, from_brigade);
  if (currentCount <= 1) {
    return `from_brigade ${from_brigade} would have 0 settlements after transfer`;
  }

  return null;
}

/**
 * Apply all pending reshape orders for this turn. Clear orders after processing.
 * Orders are processed in deterministic order (sorted by settlement_id).
 *
 * For each valid order:
 *   - Transfer settlement in brigade_aor from from_brigade to to_brigade
 *   - Apply cohesion costs: receiving brigade -3, donating brigade -2
 *   - Set disrupted=true on both brigades (reduces pressure output next turn)
 *
 * Invalid orders are silently rejected and recorded in the report.
 */
export function applyReshapeOrders(state: GameState, edges: EdgeRecord[]): ReshapeReport {
  const report: ReshapeReport = {
    transfers_applied: 0,
    transfers_rejected: 0,
    rejected_reasons: []
  };

  const orders = state.brigade_aor_orders;
  if (!orders || orders.length === 0) {
    state.brigade_aor_orders = [];
    return report;
  }

  const brigadeAor = state.brigade_aor;
  if (!brigadeAor) {
    // All orders rejected if no AoR exists
    for (const _order of orders) {
      report.transfers_rejected++;
      report.rejected_reasons.push('brigade_aor not initialized');
    }
    state.brigade_aor_orders = [];
    return report;
  }

  const formations = state.formations ?? {};

  // Sort orders deterministically by settlement_id
  const sortedOrders = [...orders].sort((a, b) => strictCompare(a.settlement_id, b.settlement_id));

  // Build adjacency once for all validations
  const adj = buildAdjacency(edges);

  for (const order of sortedOrders) {
    // Validate order against current state (state mutates as we apply, so re-validate each time)
    const error = validateReshapeOrderInternal(state, order, adj);

    if (error !== null) {
      report.transfers_rejected++;
      report.rejected_reasons.push(`${order.settlement_id}: ${error}`);
      continue;
    }

    // Apply transfer
    brigadeAor[order.settlement_id] = order.to_brigade;

    // Apply cohesion costs
    const fromBrig = formations[order.from_brigade];
    const toBrig = formations[order.to_brigade];

    if (fromBrig) {
      fromBrig.cohesion = Math.max(0, (fromBrig.cohesion ?? 60) - 2);
      fromBrig.disrupted = true;
    }

    if (toBrig) {
      toBrig.cohesion = Math.max(0, (toBrig.cohesion ?? 60) - 3);
      toBrig.disrupted = true;
    }

    report.transfers_applied++;
  }

  // Clear orders after processing
  state.brigade_aor_orders = [];

  return report;
}

/**
 * Internal validation that uses pre-built adjacency map.
 * Same rules as validateReshapeOrder but avoids rebuilding adjacency per call.
 */
function validateReshapeOrderInternal(
  state: GameState,
  order: BrigadeAoROrder,
  adj: Map<SettlementId, Set<SettlementId>>
): string | null {
  const brigadeAor = state.brigade_aor;
  if (!brigadeAor) return 'brigade_aor not initialized';

  const formations = state.formations ?? {};
  const { settlement_id, from_brigade, to_brigade } = order;

  // 1. Settlement must exist in brigade_aor and currently be assigned to from_brigade
  if (!(settlement_id in brigadeAor)) {
    return `settlement ${settlement_id} not found in brigade_aor`;
  }
  if (brigadeAor[settlement_id] !== from_brigade) {
    return `settlement ${settlement_id} is not assigned to ${from_brigade}`;
  }

  // 2. Both brigades must exist, be same faction, active, kind=brigade
  const fromBrig = formations[from_brigade];
  const toBrig = formations[to_brigade];
  if (!fromBrig) return `from_brigade ${from_brigade} not found`;
  if (!toBrig) return `to_brigade ${to_brigade} not found`;
  if (fromBrig.status !== 'active') return `from_brigade ${from_brigade} is not active`;
  if (toBrig.status !== 'active') return `to_brigade ${to_brigade} is not active`;
  if ((fromBrig.kind ?? 'brigade') !== 'brigade') return `from_brigade ${from_brigade} is not a brigade`;
  if ((toBrig.kind ?? 'brigade') !== 'brigade') return `to_brigade ${to_brigade} is not a brigade`;
  if (fromBrig.faction !== toBrig.faction) return `brigades are not same faction`;

  // 3. Settlement must be adjacent to at least one settlement already in to_brigade's AoR
  if (!isAdjacentToTargetAoR(settlement_id, to_brigade, brigadeAor, adj)) {
    return `settlement ${settlement_id} is not adjacent to ${to_brigade}'s AoR`;
  }

  // 4. from_brigade must retain at least 1 settlement after transfer
  const currentCount = countBrigadeSettlements(brigadeAor, from_brigade);
  if (currentCount <= 1) {
    return `from_brigade ${from_brigade} would have 0 settlements after transfer`;
  }

  return null;
}
