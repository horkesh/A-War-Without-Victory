/**
 * Constants for militia/brigade formation system (plan: militia_and_brigade_formation_system).
 * Large-settlement list for control flip resistance; max brigades per municipality.
 */

import type { MunicipalityId } from './game_state.js';
import type { WarTimeline } from './war_timeline.js';
import { lookupStepCurve } from './war_timeline.js';
import { LARGE_URBAN_MUN_IDS } from './large_urban_mun_data.js';
import { MAX_BRIGADES_OVERRIDE } from './max_brigades_per_mun_data.js';

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

/**
 * Faction-specific initial brigade personnel at Phase I OOB creation (Mobilization & Force Growth Part 3).
 * RS (VRS): JNA inheritance → larger initial brigades; RBiH/HRHB: militia/TO origin → standard.
 */
export const FACTION_INITIAL_PERSONNEL: Record<string, number> = {
    RS: 1_200,
    RBiH: 500,   // TO/militia origin — per-brigade overrides set historical values
    HRHB: 800
};

/**
 * Faction-specific initial cohesion for brigades/OG at creation (Mobilization & Force Growth Part 4).
 * RS: JNA professional cadres; HRHB: Croatian cadres; RBiH: TO/militia origin.
 */
export const FACTION_INITIAL_COHESION: Record<string, number> = {
    RS: 72,
    HRHB: 62,
    RBiH: 45   // TO/militia origin — per-brigade overrides set historical values
};

/** Minimum manpower to spawn a mandatory (historical OOB) brigade — lower than MIN_BRIGADE_SPAWN
 * because these formations definitely existed; pools will reinforce them over time.
 * n223: lowered from 200 to 100. At 200, enclave brigades like the 285th (Zepa, manpower_cost=150)
 * were blocked because Math.min(150, pool) < 200 is always true. */
export const MIN_MANDATORY_SPAWN = 100;

/** Minimum personnel a formation can have during combat — below this the unit routes/dissolves rather than taking further casualties. Used as casualty floor instead of MIN_BRIGADE_SPAWN so defenders at 800 personnel can actually take losses. */
export const MIN_COMBAT_PERSONNEL = 100;

/** Minimum 1991 population (faction-eligible) in a municipality to assign historical brigade name or allow emergent spawn (demographic gating). Below this: OOB brigades get generic name; emergent spawn is skipped. */
export const MIN_ELIGIBLE_POPULATION_FOR_BRIGADE = 500;

/** Brigade can grow from pool up to this size; only then do we form a second brigade (if pool still has ≥ MIN_BRIGADE_SPAWN). Tuned for historical personnel band (~3k per brigade at full strength). */
export const MAX_BRIGADE_PERSONNEL = 3_000;

/** Phase II hard operational frontage cap (settlements) per brigade. */
export const BRIGADE_OPERATIONAL_FRONTAGE_CAP = 48;

// --- Militia garrison (Brigade AoR Redesign Phase B) ---
/** Militia cohesion for combat power (low vs brigade 60+). */
export const MILITIA_COHESION = 30;
/** Militia equipment multiplier (infantry only; no tanks/artillery bonus). */
export const MILITIA_EQUIPMENT_MULT = 0;
/** Fraction of militia pool.available used as base garrison per settlement in municipality. */
export const MILITIA_GARRISON_FRACTION = 0.15;

/**
 * Max municipalities a single brigade can be assigned in ensureBrigadeMunicipalityAssignment.
 * Historical frontage rule: one HQ municipality plus up to two neighboring municipalities.
 */
export const MAX_MUNICIPALITIES_PER_BRIGADE = 3;

/**
 * Max personnel absorbed per turn from home municipality militia pool.
 * At 400/turn, a brigade reaches operational strength (~2000) in 3-5 weeks.
 * Calibrated so pool-to-brigade transfer doesn't bottleneck force growth.
 */
export const REINFORCEMENT_RATE = 400;

/**
 * Half rate under active combat: brigade in attack posture or under pressure.
 * 200/turn allows slow reinforcement even during operations.
 */
export const COMBAT_REINFORCEMENT_RATE = 200;

/**
 * Faction-specific reinforcement rate multiplier by war phase.
 * Historically: RS inherited JNA logistics (full rate from day 1).
 * RBiH was disorganized militia; reinforcement capacity grew over time as corps formed.
 * HRHB had Croatian cadre support but limited logistics.
 */
export function getFactionReinforcementMult(faction: string, turn: number, timeline?: WarTimeline): number {
    // Timeline-driven when available
    if (timeline?.reinforcement_mult?.[faction]) {
        return lookupStepCurve(timeline.reinforcement_mult[faction], turn, 1.0);
    }
    // Hardcoded fallback
    if (faction === 'RBiH') {
        // ARBiH mobilization phases: militia → TO brigades → corps structure → professional army
        if (turn < 12) return 0.25;   // Weeks 0-11: barely organized, 100/turn effective
        if (turn < 26) return 0.50;   // Weeks 12-25: rudimentary command, 200/turn
        if (turn < 52) return 0.75;   // Weeks 26-51: corps forming, 300/turn
        return 1.0;                    // Week 52+: professional army, full rate
    }
    if (faction === 'HRHB') {
        if (turn < 12) return 0.50;   // HVO had Croatian cadre but limited logistics
        return 0.75;                   // Never matched VRS logistics capacity
    }
    // RS: full rate from day 1 (JNA inheritance)
    return 1.0;
}

/**
 * WIA (wounded in action) trickleback: personnel returned per turn to a formation from its wounded pool.
 * Only when the brigade is out of combat (not in attack posture, not disrupted). Realistic order of magnitude:
 * ~80/week allows meaningful recovery over several weeks without dominating reinforcement.
 */
export const WIA_TRICKLE_RATE = 80;

// --- Phase I Overhaul: proto-brigade tier thresholds ---
/** Minimum pool to spawn a TO detachment (replaces MIN_BRIGADE_SPAWN for bottom-up lifecycle). */
export const MIN_DETACHMENT_SPAWN = 100;
/** Personnel threshold for automatic detachment→battalion promotion. */
export const MIN_BATTALION_THRESHOLD = 500;
/** Personnel threshold at which a battalion is eligible for brigade promotion. */
export const MIN_BRIGADE_THRESHOLD = 1500;
/** Max militia-kind formations per municipality per faction (prevents runaway spawning). */
export const MAX_TO_PER_MUN = 5;

// --- Phase I Overhaul Phase D: promotion thresholds ---
/** Minimum cohesion [0,100] required for a militia formation to be eligible for brigade promotion. */
export const PROMOTION_COHESION_THRESHOLD = 40;
/** Minimum turns a militia formation must have existed before it can promote to brigade. */
export const PROMOTION_MIN_TURNS_ACTIVE = 4;
/** Cohesion bonus applied on promotion to brigade (capped at 100). */
export const PROMOTION_COHESION_BONUS = 10;

/**
 * Returns the formation tier based on kind and personnel count.
 * Used by Phase I Overhaul phases D–F for promotion logic and combat tier scaling.
 * Pure and deterministic — no side effects.
 */
export function getFormationTier(f: { kind?: string; personnel?: number }): 'detachment' | 'battalion' | 'brigade' {
    if (f.kind === 'brigade') return 'brigade';
    const p = f.personnel ?? 0;
    if (p >= MIN_BRIGADE_THRESHOLD) return 'brigade';   // Ready for promotion
    if (p >= MIN_BATTALION_THRESHOLD) return 'battalion';
    return 'detachment';
}

// --- Phase I Overhaul: siege mobilization ratios ---
/** Full siege (≥90% surrounded): pool growth multiplier 3.0×. */
export const SIEGE_RATIO_FULL = 0.90;
/** Mostly surrounded (≥75%): pool growth multiplier 2.0×, caps lifted. */
export const SIEGE_RATIO_MOSTLY = 0.75;
/** Partial siege (≥50%): pool growth multiplier 1.5×. */
export const SIEGE_RATIO_PARTIAL = 0.50;

/**
 * Displaced-in population threshold for displacement-driven TO emergence (Phase F Step 27).
 * When a besieged municipality (siege_ratio >= SIEGE_RATIO_PARTIAL) has >= this many faction-aligned
 * displaced civilians, an ADDITIONAL formation is spawned beyond normal pool-threshold spawn.
 * Reflects historical total-war mobilization: displaced populations in enclaves had no option but to fight.
 */
export const DISPLACED_FORMATION_THRESHOLD = 3000;

// --- OOB Rework: VRS equipment decay ---
/** Week when VRS equipment starts degrading (end of initial ammunition/parts stockpiles). */
export const VRS_EQUIPMENT_DECAY_START_WEEK = 26;
/** Per-week equipment effectiveness reduction for VRS formations. */
export const VRS_EQUIPMENT_DECAY_RATE = 0.005;
/** Floor: VRS equipment never degrades below this fraction. */
export const VRS_EQUIPMENT_DECAY_FLOOR = 0.60;

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
