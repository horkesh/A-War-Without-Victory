/**
 * Stage 4B: Brigade posture system.
 * Controls pressure/defense tradeoff and exhaustion rates.
 * Each brigade has a posture that determines its offensive pressure output,
 * defensive strength, and per-turn cohesion cost.
 *
 * Deterministic: no randomness, no timestamps. All iteration in sorted order.
 */

import type {
  GameState,
  FormationId,
  FormationState,
  BrigadePosture,
  BrigadePostureOrder
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

// --- Types ---

export interface PostureReport {
  postures_changed: number;
  postures_rejected: number;
}

// --- Posture constraints ---

/** Minimum cohesion required to adopt each posture. */
const POSTURE_MIN_COHESION: Record<BrigadePosture, number> = {
  defend: 0,
  probe: 20,
  attack: 40,
  elastic_defense: 0
};

/** Readiness levels that are allowed for each posture. */
const POSTURE_MIN_READINESS: Record<BrigadePosture, string[]> = {
  defend: ['active', 'overextended', 'degraded', 'forming'],
  probe: ['active', 'overextended'],
  attack: ['active'],
  elastic_defense: ['active', 'overextended', 'degraded']
};

/** Per-turn cohesion cost for each posture. Negative = drain, positive = recovery. */
const POSTURE_COHESION_COST: Record<BrigadePosture, number> = {
  attack: -3,
  probe: -1,
  elastic_defense: -0.5,
  defend: 1   // Recovery
};

/** Maximum cohesion recovery cap when in defend posture. */
const DEFEND_COHESION_CAP = 80;

/** Absolute cohesion bounds. */
const COHESION_MIN = 0;
const COHESION_MAX = 100;

// --- Public API ---

/**
 * Check if a brigade can adopt a given posture.
 * Validates cohesion threshold and readiness level.
 */
export function canAdoptPosture(brigade: FormationState, posture: BrigadePosture): boolean {
  const cohesion = brigade.cohesion ?? 60;
  const readiness = brigade.readiness ?? 'active';

  // Check cohesion meets minimum for target posture
  if (cohesion < POSTURE_MIN_COHESION[posture]) {
    return false;
  }

  // Check readiness is in the allowed list for target posture
  const allowedReadiness = POSTURE_MIN_READINESS[posture];
  if (!allowedReadiness.includes(readiness)) {
    return false;
  }

  return true;
}

/**
 * Apply posture orders for this turn.
 * Orders are processed in deterministic order (sorted by brigade_id).
 * Each order is validated: the brigade must exist, be active, be kind=brigade,
 * and pass canAdoptPosture.
 *
 * Clears brigade_posture_orders after processing.
 */
export function applyPostureOrders(state: GameState): PostureReport {
  const report: PostureReport = {
    postures_changed: 0,
    postures_rejected: 0
  };

  const orders = state.brigade_posture_orders;
  if (!orders || orders.length === 0) {
    state.brigade_posture_orders = [];
    return report;
  }

  const formations = state.formations ?? {};

  // Sort orders deterministically by brigade_id
  const sortedOrders = [...orders].sort(
    (a, b) => strictCompare(a.brigade_id, b.brigade_id)
  );

  // De-duplicate: if multiple orders for the same brigade, last one in sorted order wins
  const orderMap = new Map<FormationId, BrigadePostureOrder>();
  for (const order of sortedOrders) {
    orderMap.set(order.brigade_id, order);
  }

  // Process in deterministic order
  const dedupedIds = [...orderMap.keys()].sort(strictCompare);

  for (const brigadeId of dedupedIds) {
    const order = orderMap.get(brigadeId)!;
    const brigade = formations[brigadeId];

    // Validate brigade exists
    if (!brigade) {
      report.postures_rejected++;
      continue;
    }

    // Must be active
    if (brigade.status !== 'active') {
      report.postures_rejected++;
      continue;
    }

    // Must be kind=brigade
    if ((brigade.kind ?? 'brigade') !== 'brigade') {
      report.postures_rejected++;
      continue;
    }

    // Check posture constraints
    if (!canAdoptPosture(brigade, order.posture)) {
      report.postures_rejected++;
      continue;
    }

    // Apply posture change
    brigade.posture = order.posture;
    report.postures_changed++;
  }

  // Clear orders after processing
  state.brigade_posture_orders = [];

  return report;
}

/**
 * Apply per-turn posture costs to all active brigades.
 * Posture determines cohesion drain or recovery:
 *   - attack:           -3 cohesion per turn
 *   - probe:            -1 cohesion per turn
 *   - elastic_defense:  -0.5 cohesion per turn (truncated toward zero)
 *   - defend:           +1 cohesion per turn (capped at 80)
 *
 * Cohesion is clamped to [0, 100].
 * If cohesion drops below the minimum for the current posture, auto-switch to defend.
 */
export function applyPostureCosts(state: GameState): void {
  const formations = state.formations ?? {};
  const ids = Object.keys(formations).sort(strictCompare);

  for (const id of ids) {
    const brigade = formations[id];
    if (!brigade) continue;
    if (brigade.status !== 'active') continue;
    if ((brigade.kind ?? 'brigade') !== 'brigade') continue;

    const posture: BrigadePosture = brigade.posture ?? 'defend';
    let cohesion = brigade.cohesion ?? 60;

    const cost = POSTURE_COHESION_COST[posture];

    if (posture === 'defend') {
      // Recovery: +1 per turn, capped at DEFEND_COHESION_CAP
      cohesion = Math.min(DEFEND_COHESION_CAP, cohesion + cost);
    } else {
      // Drain: truncate toward zero for fractional costs (elastic_defense = -0.5)
      cohesion = cohesion + Math.trunc(cost);
    }

    // Clamp to absolute bounds
    cohesion = Math.max(COHESION_MIN, Math.min(COHESION_MAX, cohesion));

    brigade.cohesion = cohesion;

    // Auto-downgrade: if cohesion is below posture minimum, switch to defend
    if (cohesion < POSTURE_MIN_COHESION[posture]) {
      brigade.posture = 'defend';
    }
  }
}
