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
 * Faction-specific initial brigade personnel at Peace phase OOB creation (Mobilization & Force Growth Part 3).
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

/** Minimum personnel to be eligible for offensive action. Below this, brigade can only defend.
 *  A sub-battalion-sized unit cannot assault positions — it lacks mass and fire support.
 *  Prevents death-spiral attacks where depleted brigades repeatedly throw 300-person
 *  units at fortified positions. At 500, roughly company+ level — minimum for coordinated attack.
 *  Canonical single source: replaces COMBAT_INEFFECTIVE_PERSONNEL = 400 local constants that
 *  existed in sector_offensive.ts and bot_brigade_eval_attack.ts (those were diverged from this
 *  value; unified to 500 to match calibration-tested behaviour). */
export const MIN_ATTACK_PERSONNEL = 500;

/** Maximum fatigue a formation can accumulate. Shared across combat resolution, fatigue recovery, and combat power calculation. */
export const FATIGUE_MAX = 30;

/**
 * LANE-NIGHTSHIFT-KRIVAJA-PHASE-1-POINT-5-IMPLEMENTATION (2026-05-06):
 * Per-turn cap on the absolute magnitude of negative morale drift applied
 * inside `runMoraleDrift`. This is a faction-symmetric mechanism: the
 * SAME numeric clamp runs for every faction. Worst-case in-source drift
 * stack (per Phase 1.5 mini-panel §2.2): −12.7 (catastrophic battle ×
 * RS defeat sensitivity 1.3 = −5.2; ENCIRCLEMENT_ENEMY_POP_DRIFT −3;
 * AFFINITY_DRIFT_DOWN −2; CRITICAL_EXHAUSTION_PENALTY −1.5;
 * CRITICAL_SUPPLY_DRAIN −1). At 8 points/turn the metastable-edge case
 * (Skelani sat at m=20 for 6 turns then a single −12 burst → m=8 ≤
 * dissolution threshold) becomes a graduated descent (m=20 → 12 → 4),
 * preserving the hysteresis-reset zone (>20) for one extra turn and
 * giving reinforcement / battle-victory windows a chance to fire.
 *
 * The cap ONLY bounds NEGATIVE drift (positive drift is already bounded
 * by the +5 victory ceiling × 1.3 RBiH sensitivity ≈ +6.5; capping
 * positive drift at 8 has no effect on observed in-engine maxima).
 *
 * Optional timeline override path: when present in
 * `WarTimeline.morale_drift_max_per_turn[faction]`, that step-curve wins;
 * otherwise the faction-keyed fallback below is used; otherwise the
 * scalar default.
 *
 * Mini-panel report:
 *   docs/40_reports/audits/20260506_KRIVAJA_PHASE_1_5_MINI_PANEL.md
 */
export const MORALE_DRIFT_MAX_PER_TURN = 8;

/**
 * Faction-keyed fallback for the per-turn morale-drift cap. Same numeric
 * value across factions in the default profile (faction-symmetric). Kept as
 * a separate map to allow scenarios that supply faction-asymmetric DATA
 * via the timeline path to do so consistently with the Phase 1
 * step-curve substrate, while the SOURCE-SIDE constants here remain
 * faction-symmetric.
 */
export const FACTION_MORALE_DRIFT_MAX_FALLBACK: Record<string, number> = {
    RS: MORALE_DRIFT_MAX_PER_TURN,
    RBiH: MORALE_DRIFT_MAX_PER_TURN,
    HRHB: MORALE_DRIFT_MAX_PER_TURN,
};

/**
 * Resolve the per-faction, per-turn morale-drift cap. Faction-symmetric
 * MECHANISM (same lookup, same comparison). Faction-asymmetric DATA via
 * the optional timeline `morale_drift_max_per_turn` field, or the
 * faction-keyed fallback map.
 *
 * Precedence:
 *   1. timeline.morale_drift_max_per_turn[faction] (step-curve)
 *   2. FACTION_MORALE_DRIFT_MAX_FALLBACK[faction]
 *   3. MORALE_DRIFT_MAX_PER_TURN (scalar default)
 *
 * Pure / deterministic / no I/O / no random.
 */
export function resolveMoraleDriftMaxPerTurn(
    faction: string | undefined,
    turn: number,
    timeline?: WarTimeline,
): number {
    if (faction && timeline?.morale_drift_max_per_turn?.[faction]) {
        return lookupStepCurve(
            timeline.morale_drift_max_per_turn[faction],
            turn,
            FACTION_MORALE_DRIFT_MAX_FALLBACK[faction] ?? MORALE_DRIFT_MAX_PER_TURN,
        );
    }
    if (faction && faction in FACTION_MORALE_DRIFT_MAX_FALLBACK) {
        return FACTION_MORALE_DRIFT_MAX_FALLBACK[faction]!;
    }
    return MORALE_DRIFT_MAX_PER_TURN;
}

/** Minimum 1991 population (faction-eligible) in a municipality to assign historical brigade name or allow emergent spawn (demographic gating). Below this: OOB brigades get generic name; emergent spawn is skipped. */
export const MIN_ELIGIBLE_POPULATION_FOR_BRIGADE = 500;

/** Whether a formation is in active combat (attack posture or disrupted). */
export function isInCombat(f: { posture?: string; disrupted?: boolean }): boolean {
    return f.posture === 'attack' || f.disrupted === true;
}

/** Whether a formation is eligible to participate in operations (active brigade/OG/phantom). */
export function isEligibleOperationFormation(f: { kind?: string; status: string }): boolean {
    return (f.kind === 'brigade' || f.kind === 'og' || f.kind === 'operational_group' || f.kind === 'jna_phantom' || f.kind === 'hv_phantom')
        && f.status === 'active';
}

/** Whether a brigade is eligible for reinforcement (not degraded, not forming, not enclave, not dead). */
export function isEligibleForReinforcement(f: { kind?: string; readiness?: string; tags?: string[]; status?: string }): boolean {
    if (f.status === 'inactive') return false;
    if (f.kind === 'paramilitary') return false;
    if (f.readiness === 'degraded' || f.readiness === 'forming') return false;
    if (Array.isArray(f.tags) && f.tags.includes('enclave')) return false;
    return true;
}

/** Default brigade personnel cap — used when no per-brigade override exists. Tuned for historical personnel band (~3k per brigade at full strength). */
export const MAX_BRIGADE_PERSONNEL = 3_000;

/**
 * Fraction of max_personnel at which a brigade is considered "at capacity" for emergent
 * formation purposes. When ALL brigades in a municipality are above this threshold,
 * new brigades can form from pool surplus. At 0.60 with max 3000: threshold = 1800.
 */
export const FORMATION_CAPACITY_THRESHOLD = 0.60;

/** Lower capacity threshold for enclave municipalities — siege attrition prevents brigades from reaching 60%.
 *  At 0.30 with ENCLAVE_MAX_PERSONNEL=1500: threshold = 450. Srebrenica (600) and Gorazde (800) pass immediately. */
export const ENCLAVE_FORMATION_CAPACITY_THRESHOLD = 0.30;

/** Get the effective personnel cap for a formation. Uses per-brigade override if set, else MAX_BRIGADE_PERSONNEL. */
export function getMaxPersonnel(f: { max_personnel?: number }): number {
    return f.max_personnel ?? MAX_BRIGADE_PERSONNEL;
}

/**
 * Derive max personnel from equipment class and faction.
 * n1074: previous caps (2200-2800) had no effect at w40 — brigades avg 1,400, nobody reached cap.
 * These lower caps (1200-2200) are in the range where brigades actually operate, reducing total
 * personnel while lowering the spawn gate (60% of 1800=1080 vs 60% of 2500=1500).
 * Historical basis: Bosnian War brigades varied from 500 (enclave) to 3500+ (JNA-inherited mech).
 * Prevents cookie-cutter 3000-cap uniformity (REAL_WAR_MASTER #20).
 */
export function deriveMaxPersonnel(equipmentClass: string, faction: string): number {
    // Mechanized/motorized: JNA-inherited heavy formations, best organized
    if (equipmentClass === 'mechanized') return 2800;
    if (equipmentClass === 'motorized') return 2200;
    // Mountain: standard organized infantry
    if (equipmentClass === 'mountain') {
        if (faction === 'RS') return 2000;    // VRS mountain brigades well-organized
        if (faction === 'HRHB') return 1800;  // HVO smaller but organized
        return 1600;                            // ARBiH mountain — still forming
    }
    // Light infantry: the bulk — varies by faction
    if (equipmentClass === 'light_infantry') {
        if (faction === 'RS') return 1800;    // VRS light infantry had JNA cadre
        if (faction === 'HRHB') return 1500;  // HVO moderate
        return 1800;                            // ARBiH — varied wildly, cap matches RS
    }
    // Police/special: smaller specialist formations
    if (equipmentClass === 'police' || equipmentClass === 'special') return 1200;
    // Fallback
    return MAX_BRIGADE_PERSONNEL;
}

/** War phase hard operational frontage cap (settlements) per brigade. */
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
 * Enclave brigades recruit locally at a reduced rate — constrained by isolation.
 * 80/turn barely offsets frontline attrition (~15-20/turn), keeping brigades alive
 * at reduced strength rather than growing to full brigade size.
 */
export const ENCLAVE_REINFORCEMENT_RATE = 80;

/** Enclave brigades never reach full strength — limited local supply/logistics. */
export const ENCLAVE_MAX_PERSONNEL = 1500;

/** Municipalities where brigades are enclave-constrained (max_personnel capped at ENCLAVE_MAX_PERSONNEL). */
export const ENCLAVE_MUNICIPALITY_IDS = new Set<string>(['srebrenica', 'gorazde', 'zepa']);

/**
 * Faction-specific reinforcement rate multiplier by war phase.
 *
 * Historically:
 * - RS: inherited JNA logistics (full rate early); from mid-1993 onward officer cadre
 *   attrition, sanctions-driven equipment decay, and pool exhaustion erode replacement
 *   tempo. By 1995 VRS replacement quality and rate are well below 1992 baseline even
 *   when nominal pool manpower exists.
 * - RBiH: disorganized militia; reinforcement capacity grew over time as corps formed.
 * - HRHB: Croatian cadre support but limited logistics; two-front stress after Lašva
 *   Valley + Washington Agreement constraints reduce late-war replacement throughput.
 *
 * The MECHANISM is faction-symmetric (step curve over turn). Only data parameters
 * drive faction asymmetry. This is the canonical lever identified in
 * `docs/40_reports/audits/20260504_FORCE_QUALITY_GAP_2_VERIFICATION.md` for the
 * "+753 VRS personnel over 188w" inversion: VRS late-war reinforcement was flat
 * 1.0× indefinitely, so the brigade-fill path drained mobilization surplus and
 * strategic-reserve overflow into existing brigades faster than battle attrition
 * could erode them — overpowering the casualty-driven officer_quality decay term.
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
        if (turn < 52) return 0.75;   // Mid-92 → mid-93: capable
        if (turn < 78) return 0.65;   // Mid-93 → mid-94: Lašva Valley + Washington stress
        return 0.50;                   // Late 94 → end-war: two-front exhaustion
    }
    // RS: JNA inheritance early, then officer/sanctions-driven late-war decay
    if (faction === 'RS') {
        if (turn < 52) return 1.0;    // 1992 → mid-1993: JNA inheritance, full rate
        if (turn < 78) return 0.85;   // Mid-93 → mid-94: officer attrition, sanctions bite
        if (turn < 104) return 0.65;  // Mid-94 → mid-95: deepening exhaustion
        return 0.45;                   // Late 1995: brittle, replacement quality crumbles
    }
    // Default fallback for any other faction
    return 1.0;
}

/**
 * WIA (wounded in action) trickleback: personnel returned per turn to a formation from its wounded pool.
 * Only when the brigade is out of combat (not in attack posture, not disrupted). Realistic order of magnitude:
 * ~80/week allows meaningful recovery over several weeks without dominating reinforcement.
 */
export const WIA_TRICKLE_RATE = 80;

// --- Peace-phase Overhaul: proto-brigade tier thresholds ---
/** Minimum pool to spawn a TO detachment (replaces MIN_BRIGADE_SPAWN for bottom-up lifecycle). */
export const MIN_DETACHMENT_SPAWN = 100;
/** Personnel threshold for automatic detachment→battalion promotion. */
export const MIN_BATTALION_THRESHOLD = 500;
/** Personnel threshold at which a battalion is eligible for brigade promotion. */
export const MIN_BRIGADE_THRESHOLD = 1500;
/** Max militia-kind formations per municipality per faction (prevents runaway spawning). */
export const MAX_TO_PER_MUN = 5;

// --- Peace-phase Overhaul Phase D: promotion thresholds ---
/** Minimum cohesion [0,100] required for a militia formation to be eligible for brigade promotion. */
export const PROMOTION_COHESION_THRESHOLD = 40;
/** Minimum turns a militia formation must have existed before it can promote to brigade. */
export const PROMOTION_MIN_TURNS_ACTIVE = 4;
/** Cohesion bonus applied on promotion to brigade (capped at 100). */
export const PROMOTION_COHESION_BONUS = 10;

/**
 * Returns the formation tier based on kind and personnel count.
 * Used by Peace-phase Overhaul phases D–F for promotion logic and combat tier scaling.
 * Pure and deterministic — no side effects.
 */
export function getFormationTier(f: { kind?: string; personnel?: number }): 'detachment' | 'battalion' | 'brigade' {
    if (f.kind === 'brigade') return 'brigade';
    const p = f.personnel ?? 0;
    if (p >= MIN_BRIGADE_THRESHOLD) return 'brigade';   // Ready for promotion
    if (p >= MIN_BATTALION_THRESHOLD) return 'battalion';
    return 'detachment';
}

// --- Peace-phase Overhaul: siege mobilization ratios ---
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

// --- Offensive paramilitary sweep (Drina valley ethnic cleansing, April-August 1992) ---
/** Offensive paramilitary unit size (personnel). Larger than rear pocket — organized paramilitary groups (Arkan's Tigers, White Eagles). */
export const OFFENSIVE_PARA_UNIT_SIZE = 600;
/** Week after which offensive paramilitaries stop spawning (historical: concentrated April-August 1992). */
export const OFFENSIVE_PARA_FADE_WEEK = 12;
/** Turns to reach target. 1 = arrive next turn (advancing alongside regulars). */
export const OFFENSIVE_PARA_MARCH_TURNS = 1;
/** Offensive paramilitary spawn probability by faction. RS dominant; HRHB limited HOS; RBiH none. */
export const OFFENSIVE_PARA_SPAWN_RATE: Record<string, number> = {
    RS: 0.50,
    HRHB: 0.15,
    RBiH: 0.0,
};
/** Civilian casualty rate for offensive sweeps — higher than rear pocket (systematic ethnic cleansing). */
export const OFFENSIVE_PARA_CIVILIAN_CASUALTY_RATE = 0.05;
/** Max defender personnel for paramilitary to overwhelm. Above this, paramilitaries retreat with heavy casualties. */
export const OFFENSIVE_PARA_LIGHT_DEFENSE_THRESHOLD = 500;
/** Municipality scope restriction for bot factions — prevents ahistorical sweep outside known AOs. */
export const OFFENSIVE_PARA_MUNICIPALITY_SCOPE: Record<string, string[]> = {
    RS: ['zvornik', 'bratunac', 'vlasenica', 'srebrenica', 'rogatica', 'visegrad', 'foca', 'cajnice', 'rudo', 'gorazde',
         'sanski_most', 'kljuc', 'prijedor', 'bosanski_novi', 'bosanski_petrovac', 'kotor_varos'],
    HRHB: ['stolac', 'capljina', 'prozor'],
};

// --- Paramilitary rear pocket cleanup ---
/** Base paramilitary unit size (personnel). Small autonomous units. */
export const PARAMILITARY_UNIT_SIZE = 150;
/** Turns to reach target and capture. 0 = capture same turn (rear pockets are already surrounded). */
export const PARAMILITARY_MARCH_TURNS = 0;
/** Week after which paramilitaries stop spawning (war professionalizes). */
export const PARAMILITARY_FADE_WEEK = 20;
/** Paramilitary spawn probability by faction (keyed on OrganizationalPenetration field).
 *  RS had Arkan's Tigers, White Eagles, etc. — highest paramilitary activity.
 *  HRHB had HOS and some Croatian paramilitaries.
 *  RBiH had Patriotska Liga but lower paramilitary capability. */
export const PARAMILITARY_SPAWN_RATE: Record<string, number> = {
    RS: 0.65,    // High — SDS/JNA paramilitary networks (reduced from 0.85 for initial territory pacing)
    HRHB: 0.55,  // Moderate — HOS, Croatian volunteers
    RBiH: 0.30   // Low — Patriotska Liga, Green Berets (mostly integrated early)
};
/** Paramilitary casualty rate: fraction of unit killed in action during sweep. */
export const PARAMILITARY_CASUALTY_RATE = 0.08;
/** Civilian casualties inflicted by paramilitary sweep (as fraction of OSID population). War crimes implicit. */
export const PARAMILITARY_CIVILIAN_CASUALTY_RATE = 0.02;
/** Paramilitary cohesion — very low, irregular forces. */
export const PARAMILITARY_COHESION = 20;
/** Paramilitary initial morale — moderate; low cohesion already reflects irregular nature. */
export const PARAMILITARY_INITIAL_MORALE = 80;
/** Average civilian population at a target OSID for civilian casualty calculation. */
export const PARAMILITARY_TARGET_AVG_POPULATION = 5000;

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
