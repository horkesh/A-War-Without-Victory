/**
 * Stage 3: Brigade-derived pressure computation.
 *
 * Brigades are the primary source of front pressure in Phase II.
 * Pressure = f(density, posture, composition, cohesion, supply, resilience, corps bonus).
 *
 * Deterministic: no randomness.
 */

import type {
  GameState,
  FactionId,
  FormationId,
  FormationState,
  SettlementId,
  BrigadePosture,
  FrontPressureState
} from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { strictCompare } from '../../state/validateGameState.js';
import { computeBrigadeDensity } from './brigade_aor.js';
import { computeEquipmentMultiplier } from './equipment_effects.js';
import { computeResilienceModifier } from './faction_resilience.js';

// --- Posture multipliers ---

const POSTURE_PRESSURE_MULT: Record<BrigadePosture, number> = {
  defend: 0.3,
  probe: 0.7,
  attack: 1.5,
  elastic_defense: 0.2,
  consolidation: 0.6
};

const POSTURE_DEFENSE_MULT: Record<BrigadePosture, number> = {
  defend: 1.5,
  probe: 1.0,
  attack: 0.5,
  elastic_defense: 1.2,
  consolidation: 1.1
};

const READINESS_MULT: Record<string, number> = {
  active: 1.0,
  overextended: 0.5,
  degraded: 0.2,
  forming: 0
};

// --- Pressure computation ---

export interface BrigadePressureResult {
  /** Pressure per front edge. Key: edge_id (a:b sorted). */
  edge_pressure: Record<string, { side_a_pressure: number; side_b_pressure: number; delta: number }>;
  /** Per-brigade raw pressure output. */
  brigade_pressure: Record<FormationId, number>;
}

function edgeId(a: SettlementId, b: SettlementId): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/**
 * Compute raw pressure output for a single brigade.
 */
export function computeBrigadeRawPressure(
  state: GameState,
  brigade: FormationState,
  edges?: EdgeRecord[]
): number {
  const posture = brigade.posture ?? 'defend';
  const density = computeBrigadeDensity(state, brigade.id, edges);
  const postureMult = POSTURE_PRESSURE_MULT[posture];
  const readinessMult = READINESS_MULT[brigade.readiness ?? 'active'] ?? 1.0;
  const cohesionFactor = (brigade.cohesion ?? 60) / 100;
  const suppliedTurn = brigade.ops?.last_supplied_turn;
  const supplyFactor = (suppliedTurn !== null && suppliedTurn !== undefined &&
    state.meta.turn - suppliedTurn <= 2) ? 1.0 : 0.4;
  const equipmentMult = computeEquipmentMultiplier(brigade, posture);
  const resilienceMult = computeResilienceModifier(state, brigade.faction, brigade);
  const disruptionMult = brigade.disrupted ? 0.5 : 1.0;

  return density * postureMult * readinessMult * cohesionFactor *
    supplyFactor * equipmentMult * resilienceMult * disruptionMult;
}

/**
 * Compute defensive strength for a single brigade.
 */
export function computeBrigadeDefense(
  state: GameState,
  brigade: FormationState,
  activeStreak: number,
  edges?: EdgeRecord[]
): number {
  const posture = brigade.posture ?? 'defend';
  const density = computeBrigadeDensity(state, brigade.id, edges);
  const defenseMult = POSTURE_DEFENSE_MULT[posture];
  const readinessMult = READINESS_MULT[brigade.readiness ?? 'active'] ?? 1.0;
  const cohesionFactor = (brigade.cohesion ?? 60) / 100;
  const suppliedTurn = brigade.ops?.last_supplied_turn;
  const supplyFactor = (suppliedTurn !== null && suppliedTurn !== undefined &&
    state.meta.turn - suppliedTurn <= 2) ? 1.0 : 0.4;
  const equipmentMult = computeEquipmentMultiplier(brigade, posture);
  const resilienceMult = computeResilienceModifier(state, brigade.faction, brigade);

  // Front hardening: static fronts are harder to break
  const hardeningBonus = Math.min(0.5, activeStreak * 0.05);

  return density * defenseMult * readinessMult * cohesionFactor *
    supplyFactor * equipmentMult * resilienceMult * (1 + hardeningBonus);
}

/**
 * Compute brigade-derived pressure for all front edges.
 * Used in Phase II to replace the edge-posture-based system.
 */
export function computeBrigadePressureByEdge(
  state: GameState,
  frontEdges: Array<{ a: SettlementId; b: SettlementId }>,
  allEdges?: EdgeRecord[]
): BrigadePressureResult {
  const result: BrigadePressureResult = { edge_pressure: {}, brigade_pressure: {} };
  const brigadeAor = state.brigade_aor ?? {};
  const pc = state.political_controllers ?? {};
  const formations = state.formations ?? {};
  const frontSegments = state.front_segments ?? {};

  // Pre-compute brigade pressure for each brigade (cache)
  const brigadeCache = new Map<FormationId, { pressure: number; defense: number }>();

  for (const edge of frontEdges) {
    const controlA = pc[edge.a];
    const controlB = pc[edge.b];
    if (!controlA || !controlB || controlA === controlB) continue;

    const brigadeA = brigadeAor[edge.a];
    const brigadeB = brigadeAor[edge.b];

    const eid = edgeId(edge.a, edge.b);
    const segment = frontSegments[eid];
    const streak = segment?.active_streak ?? 0;

    // Side A pressure
    let sideAPressure = 0;
    if (brigadeA) {
      const brig = formations[brigadeA];
      if (brig) {
        if (!brigadeCache.has(brigadeA)) {
          brigadeCache.set(brigadeA, {
            pressure: computeBrigadeRawPressure(state, brig, allEdges),
            defense: computeBrigadeDefense(state, brig, streak, allEdges)
          });
        }
        sideAPressure = brigadeCache.get(brigadeA)!.pressure;
        result.brigade_pressure[brigadeA] = sideAPressure;
      }
    }

    // Side B pressure
    let sideBPressure = 0;
    if (brigadeB) {
      const brig = formations[brigadeB];
      if (brig) {
        if (!brigadeCache.has(brigadeB)) {
          brigadeCache.set(brigadeB, {
            pressure: computeBrigadeRawPressure(state, brig, allEdges),
            defense: computeBrigadeDefense(state, brig, streak, allEdges)
          });
        }
        sideBPressure = brigadeCache.get(brigadeB)!.pressure;
        result.brigade_pressure[brigadeB] = sideBPressure;
      }
    }

    // Net delta = side_a - side_b, clamped
    const delta = Math.max(-10, Math.min(10, sideAPressure - sideBPressure));

    result.edge_pressure[eid] = {
      side_a_pressure: sideAPressure,
      side_b_pressure: sideBPressure,
      delta
    };
  }

  return result;
}

/**
 * Apply brigade-derived pressure to the front_pressure state.
 * Called from the turn pipeline when Phase II is active and brigade_aor exists.
 */
export function applyBrigadePressureToState(
  state: GameState,
  edges: EdgeRecord[]
): void {
  const pc = state.political_controllers ?? {};

  // Collect front edges
  const frontEdges: Array<{ a: SettlementId; b: SettlementId }> = [];
  for (const edge of edges) {
    const controlA = pc[edge.a];
    const controlB = pc[edge.b];
    if (controlA && controlB && controlA !== controlB) {
      frontEdges.push(edge);
    }
  }

  const pressureResult = computeBrigadePressureByEdge(state, frontEdges, edges);

  // Update front_pressure state
  if (!state.front_pressure) state.front_pressure = {};
  for (const [eid, pressure] of Object.entries(pressureResult.edge_pressure)) {
    const existing = state.front_pressure[eid];
    if (existing) {
      existing.value += Math.round(pressure.delta);
      existing.max_abs = Math.max(existing.max_abs, Math.abs(existing.value));
      existing.last_updated_turn = state.meta.turn;
    } else {
      state.front_pressure[eid] = {
        edge_id: eid,
        value: Math.round(pressure.delta),
        max_abs: Math.abs(Math.round(pressure.delta)),
        last_updated_turn: state.meta.turn
      };
    }
  }
}
