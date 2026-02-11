/**
 * Constants for militia/brigade formation system (plan: militia_and_brigade_formation_system).
 * Large-settlement list for control flip resistance; max brigades per municipality.
 */

import type { MunicipalityId } from './game_state.js';
import { MAX_BRIGADES_OVERRIDE } from './max_brigades_per_mun_data.js';

/** Municipalities that count as "large" for control flip: never fall in one turn without resistance when defender has no formation. */
export const LARGE_SETTLEMENT_MUN_IDS: readonly MunicipalityId[] = [
  'centar_sarajevo',
  'novi_grad_sarajevo',
  'novo_sarajevo',
  'stari_grad_sarajevo'
] as const;

const LARGE_SET = new Set<string>(LARGE_SETTLEMENT_MUN_IDS);

export function isLargeSettlementMun(mun_id: MunicipalityId): boolean {
  return LARGE_SET.has(mun_id);
}

/** Default max brigades per municipality. Overrides from 1991 census (large/mixed) in max_brigades_per_mun_data.ts. */
const DEFAULT_MAX_BRIGADES_PER_MUN = 1;

/**
 * Returns max brigades allowed for this municipality. Deterministic.
 * Overrides are derived organically from 1991 census (population >= 60k or no ethnicity >= 55%).
 */
export function getMaxBrigadesPerMun(mun_id: MunicipalityId): number {
  return MAX_BRIGADES_OVERRIDE[mun_id] ?? DEFAULT_MAX_BRIGADES_PER_MUN;
}

/** Pool must reach this to spawn a new brigade; new brigade starts at this size (research: canFormBrigade ≥800). */
export const MIN_BRIGADE_SPAWN = 800;

/** Minimum 1991 population (faction-eligible) in a municipality to assign historical brigade name or allow emergent spawn (demographic gating). Below this: OOB brigades get generic name; emergent spawn is skipped. */
export const MIN_ELIGIBLE_POPULATION_FOR_BRIGADE = 500;

/** Brigade can grow from pool up to this size; only then do we form a second brigade (if pool still has ≥ MIN_BRIGADE_SPAWN). Tuned for historical personnel band (~1k per brigade nominal). */
export const MAX_BRIGADE_PERSONNEL = 1_000;

/**
 * Single nominal brigade size (troops per formation) for all factions.
 * Number of brigades is driven by population-derived militia pool; same template per faction.
 */
const NOMINAL_BATCH_SIZE = MIN_BRIGADE_SPAWN;

/**
 * Returns nominal troops per formation (same for all factions). Deterministic.
 * Brigade count differentiation comes from population-weighted pool, not per-faction size.
 */
export function getBatchSizeForFaction(_faction: string): number {
  return NOMINAL_BATCH_SIZE;
}
