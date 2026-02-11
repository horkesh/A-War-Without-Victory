/**
 * Phase D Step 4: Supply pressure for Phase II (Mid-War).
 * Supply constrains effectiveness; does not regenerate freely (Engine Invariants §4).
 * Pressure from overextension (front segment count) and isolation (critical supply).
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import { computeFrontEdges } from '../../map/front_edges.js';
import type { EdgeRecord } from '../../map/settlements.js';
import type { SupplyStateDerivationReport } from '../../state/supply_state_derivation.js';

/** Pressure per front edge (overextension). */
const PRESSURE_PER_FRONT_EDGE = 3;

/** Pressure per critical settlement (isolation). */
const PRESSURE_PER_CRITICAL = 10;

/** Pressure per strained settlement (isolation). */
const PRESSURE_PER_STRAINED = 2;

/** Cap supply pressure at 100. */
const PRESSURE_CAP = 100;

/** Strict comparator for deterministic ordering (Engine Invariants §11.3). */
function strictCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Update phase_ii_supply_pressure from overextension and optional supply report.
 * Only runs when meta.phase === 'phase_ii'.
 * Pressure is monotonic per faction (never decreased) — no free replenishment.
 * When frictionMultipliers is provided (Phase D0.9), supply pressure increment is scaled by multiplier
 * so that higher command friction (higher multiplier) increases effective pressure growth.
 */
export function updatePhaseIISupplyPressure(
  state: GameState,
  settlementEdges: EdgeRecord[],
  supplyReport?: SupplyStateDerivationReport,
  frictionMultipliers?: Record<FactionId, number>,
  productionBonusByFaction?: Record<FactionId, number>
): void {
  if (state.meta.phase !== 'phase_ii') {
    return;
  }

  const frontEdges = computeFrontEdges(state, settlementEdges);
  const factionIds = (state.factions ?? []).map((f) => f.id).sort(strictCompare);

  const frontEdgeCountByFaction = new Map<FactionId, number>();
  for (const fid of factionIds) {
    frontEdgeCountByFaction.set(fid, 0);
  }
  for (const fe of frontEdges) {
    if (fe.side_a) frontEdgeCountByFaction.set(fe.side_a, (frontEdgeCountByFaction.get(fe.side_a) ?? 0) + 1);
    if (fe.side_b) frontEdgeCountByFaction.set(fe.side_b, (frontEdgeCountByFaction.get(fe.side_b) ?? 0) + 1);
  }

  const criticalByFaction = new Map<FactionId, number>();
  const strainedByFaction = new Map<FactionId, number>();
  if (supplyReport?.factions) {
    for (const entry of supplyReport.factions) {
      criticalByFaction.set(entry.faction_id, entry.critical_count ?? 0);
      strainedByFaction.set(entry.faction_id, entry.strained_count ?? 0);
    }
  }

  if (!state.phase_ii_supply_pressure) {
    (state as GameState & { phase_ii_supply_pressure: Record<FactionId, number> }).phase_ii_supply_pressure = {};
  }
  const pressure = state.phase_ii_supply_pressure!;

  for (const fid of factionIds) {
    const overextension = (frontEdgeCountByFaction.get(fid) ?? 0) * PRESSURE_PER_FRONT_EDGE;
    const critical = criticalByFaction.get(fid) ?? 0;
    const strained = strainedByFaction.get(fid) ?? 0;
    const isolation = critical * PRESSURE_PER_CRITICAL + strained * PRESSURE_PER_STRAINED;
    const productionRelief = Math.max(0, Math.round(productionBonusByFaction?.[fid] ?? 0));
    const computed = Math.max(0, Math.min(PRESSURE_CAP, overextension + isolation - productionRelief));
    const current = typeof pressure[fid] === 'number' ? pressure[fid]! : 0;
    const rawIncrement = Math.max(0, computed - current);
    const multiplier = frictionMultipliers?.[fid] ?? 1;
    const effectiveIncrement = rawIncrement * multiplier;
    pressure[fid] = Math.min(PRESSURE_CAP, current + effectiveIncrement);
  }
}
