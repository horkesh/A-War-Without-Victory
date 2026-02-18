/**
 * Constants for militia/brigade formation system (plan: militia_and_brigade_formation_system).
 * Large-settlement list for control flip resistance; max brigades per municipality.
 */

import type { MunicipalityId } from './game_state.js';
import { MAX_BRIGADES_OVERRIDE } from './max_brigades_per_mun_data.js';
import { LARGE_URBAN_MUN_IDS } from './large_urban_mun_data.js';

/** Municipalities that count as "large" for control flip: never fall in one turn without resistance when defender has no formation. */
export const LARGE_SETTLEMENT_MUN_IDS: readonly MunicipalityId[] = [
  'centar_sarajevo',
  'novi_grad_sarajevo',
  'novo_sarajevo',
  'stari_grad_sarajevo'
] as const;

const LARGE_SET = new Set<string>(LARGE_SETTLEMENT_MUN_IDS);
const LARGE_URBAN_SET = new Set<string>(LARGE_URBAN_MUN_IDS);

export function isLargeSettlementMun(mun_id: MunicipalityId): boolean {
  return LARGE_SET.has(mun_id);
}

/** Municipalities treated as large urban centers (1991 pop >= 60k). */
export function isLargeUrbanSettlementMun(mun_id: MunicipalityId): boolean {
  return LARGE_URBAN_SET.has(mun_id);
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

/** Minimum manpower to spawn a mandatory (historical OOB) brigade — lower than MIN_BRIGADE_SPAWN
 * because these formations definitely existed; pools will reinforce them over time. */
export const MIN_MANDATORY_SPAWN = 200;

/** Minimum personnel a formation can have during combat — below this the unit routes/dissolves rather than taking further casualties. Used as casualty floor instead of MIN_BRIGADE_SPAWN so defenders at 800 personnel can actually take losses. */
export const MIN_COMBAT_PERSONNEL = 100;

/** Minimum 1991 population (faction-eligible) in a municipality to assign historical brigade name or allow emergent spawn (demographic gating). Below this: OOB brigades get generic name; emergent spawn is skipped. */
export const MIN_ELIGIBLE_POPULATION_FOR_BRIGADE = 500;

/** Brigade can grow from pool up to this size; only then do we form a second brigade (if pool still has ≥ MIN_BRIGADE_SPAWN). Tuned for historical personnel band (~3k per brigade at full strength). */
export const MAX_BRIGADE_PERSONNEL = 3_000;

/**
 * Phase II hard operational frontage cap (settlements) per brigade.
 * AoR ownership may exceed this, but only this many settlements are treated as actively
 * covered by a brigade for garrison/pressure/attack computations each turn.
 */
export const BRIGADE_OPERATIONAL_AOR_HARD_CAP = 48;

/** Personnel per settlement slot for settlement-level AoR (Brigade AoR Redesign). 400 → max 1–4 settlements. */
export const PERSONNEL_PER_AOR_SETTLEMENT = 400;

/** Maximum AoR settlements per brigade regardless of personnel (Brigade AoR Redesign). */
export const MAX_AOR_SETTLEMENTS = 4;

/** Minimum AoR settlements per brigade (Brigade AoR Redesign). */
export const MIN_AOR_SETTLEMENTS = 1;

/**
 * Personnel-based AoR cap (Brigade AoR Redesign): max settlements a brigade can cover.
 * Formula: min(4, max(1, floor(personnel / 400))). Deterministic.
 */
export function getPersonnelBasedAoRCap(personnel: number): number {
  const n = Math.floor(personnel / PERSONNEL_PER_AOR_SETTLEMENT);
  return Math.min(MAX_AOR_SETTLEMENTS, Math.max(MIN_AOR_SETTLEMENTS, n));
}

/**
 * Max municipalities a single brigade can be assigned in ensureBrigadeMunicipalityAssignment.
 * Historical frontage rule: one HQ municipality plus up to two neighboring municipalities.
 */
export const MAX_MUNICIPALITIES_PER_BRIGADE = 3;

/** Max personnel absorbed per turn from home municipality militia pool (recruitment_system_design_note §5.1). */
export const REINFORCEMENT_RATE = 260;

/** Half rate under active combat: brigade in attack posture or under pressure (recruitment_system_design_note §5.3). */
export const COMBAT_REINFORCEMENT_RATE = 130;

/**
 * WIA (wounded in action) trickleback: personnel returned per turn to a formation from its wounded pool.
 * Only when the brigade is out of combat (not in attack posture, not disrupted). Realistic order of magnitude:
 * ~80/week allows meaningful recovery over several weeks without dominating reinforcement.
 */
export const WIA_TRICKLE_RATE = 80;

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
