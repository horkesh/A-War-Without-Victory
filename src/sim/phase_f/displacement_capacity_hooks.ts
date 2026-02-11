/**
 * Phase F Step 5: Capacity consequences (read-only hooks).
 *
 * Displacement permanently weakens capacity (Systems Manual §12; Rulebook §9.2).
 * These hooks expose displacement-derived factors for supply, authority, exhaustion,
 * and recruitment. Other systems may read them; this module does not mutate control,
 * authority, or supply. No control flips (Phase F scope).
 *
 * Authorized use: supply production degradation, authority stability degradation,
 * exhaustion acceleration, recruitment/formation sustainment penalties (when wired by spec).
 */

import { strictCompare } from '../../state/validateGameState.js';
import type { GameState, MunicipalityId, SettlementId } from '../../state/game_state.js';

/** Capacity factor [0, 1]: 1 = no degradation, 0 = full degradation. */
export type CapacityFactor = number;

/**
 * Municipality-level displacement capacity factor (read-only).
 * Returns 1 - municipality_displacement[munId], or 1 if absent.
 * Authorized for: authority degradation, supply local production, recruitment ceiling.
 */
export function getMunicipalityDisplacementFactor(state: GameState, munId: MunicipalityId): CapacityFactor {
  if (state.meta?.phase !== 'phase_ii') return 1;
  const v = state.municipality_displacement?.[munId];
  if (typeof v !== 'number' || !Number.isFinite(v)) return 1;
  return Math.max(0, Math.min(1, 1 - v));
}

/**
 * Settlement-level displacement capacity factor (read-only).
 * Returns 1 - settlement_displacement[sid], or 1 if absent.
 * Authorized for: settlement-level supply/authority when spec defines consumption.
 */
export function getSettlementDisplacementFactor(state: GameState, sid: SettlementId): CapacityFactor {
  if (state.meta?.phase !== 'phase_ii') return 1;
  const v = state.settlement_displacement?.[sid];
  if (typeof v !== 'number' || !Number.isFinite(v)) return 1;
  return Math.max(0, Math.min(1, 1 - v));
}

export interface DisplacementCapacityReport {
  /** Municipality IDs with municipality_displacement > 0 (sorted). */
  municipalities_affected: MunicipalityId[];
  /** Settlement IDs with settlement_displacement > 0 (sorted). */
  settlements_affected: SettlementId[];
  /** Per-municipality capacity factor (1 - displacement). */
  municipality_factors: Record<MunicipalityId, CapacityFactor>;
}

/**
 * Build a read-only report of displacement capacity impact (for tests and debug).
 * Does not mutate state; deterministic ordering.
 */
export function buildDisplacementCapacityReport(state: GameState): DisplacementCapacityReport {
  const municipalities_affected: MunicipalityId[] = [];
  const settlements_affected: SettlementId[] = [];
  const municipality_factors: Record<MunicipalityId, CapacityFactor> = {};

  if (state.meta?.phase !== 'phase_ii') {
    return { municipalities_affected, settlements_affected, municipality_factors };
  }

  const md = state.municipality_displacement ?? {};
  for (const munId of Object.keys(md).sort(strictCompare)) {
    const v = md[munId];
    if (typeof v === 'number' && v > 0) {
      municipalities_affected.push(munId);
      municipality_factors[munId] = Math.max(0, Math.min(1, 1 - v));
    }
  }

  const sd = state.settlement_displacement ?? {};
  for (const sid of Object.keys(sd).sort(strictCompare)) {
    const v = sd[sid];
    if (typeof v === 'number' && v > 0) settlements_affected.push(sid);
  }

  return { municipalities_affected, settlements_affected, municipality_factors };
}
