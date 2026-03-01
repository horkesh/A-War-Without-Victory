/**
 * Centralized bot AI tuning constants.
 *
 * All threshold values, timing knobs, and numeric tuning parameters for
 * bot_corps_ai.ts and bot_strategy.ts live here for calibration visibility.
 *
 * Faction-specific strategy tables (FACTION_STRATEGIES, FACTION_DOCTRINE_PHASES,
 * FACTION_STANDING_ORDERS, FACTION_ARMY_PRIORITIES) remain in bot_strategy.ts
 * as they are structured domain logic, not simple tuning constants.
 *
 * Determinism: pure constants, no randomness or state.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Doctrine timing knobs (from bot_strategy.ts)
// ═══════════════════════════════════════════════════════════════════════════

/** RS early-war window: offensive stance and higher attack share for territorial expansion.
 * Calibration: 30→20 for Jan 1993 painted targets (RS was at 488 OSIDs by w20 in n233).
 * n246 result: RS=406 (target 416). 2.4% gap is within acceptable variance; extending to 22
 * backfires because RBiH's more-active doctrine starts at fixed w20, causing counterattacks. */
export const RS_EARLY_WAR_END_WEEK = 20;

/** HRHB Lasva Offensive window (weeks 12–26): higher attack share so HRHB issues more attack orders. See NEXT_BOT_PRIORITY_AOR_OR_HRHB_HANDOFF_2026_02_18 Candidate B. */
export const HRHB_LASVA_OFFENSIVE_START_WEEK = 12;
export const HRHB_LASVA_OFFENSIVE_END_WEEK = 26;
export const HRHB_LASVA_ATTACK_SHARE = 0.35;

// ═══════════════════════════════════════════════════════════════════════════
// Corps-level threat and health thresholds (from bot_corps_ai.ts)
// ═══════════════════════════════════════════════════════════════════════════

/** Sector threat ratio above which corps goes defensive. */
export const THREAT_DEFENSIVE_THRESHOLD = 1.5;

/** Sector threat ratio below which corps can go offensive (if healthy). */
export const THREAT_OFFENSIVE_THRESHOLD = 0.7;

/** Average cohesion below which corps must reorganize. */
export const COHESION_REORGANIZE_THRESHOLD = 25;

/** Average personnel fraction below which corps must reorganize. */
export const PERSONNEL_REORGANIZE_THRESHOLD = 0.5;

/** Personnel fraction above which corps is considered healthy for offensive. */
export const PERSONNEL_HEALTHY_THRESHOLD = 0.7;

/** Cohesion above which corps is considered healthy for offensive. */
export const COHESION_HEALTHY_THRESHOLD = 50;

/** Sector threat ratio for emergency defensive operations. */
export const EMERGENCY_THREAT_THRESHOLD = 2.0;

// ═══════════════════════════════════════════════════════════════════════════
// Named operation parameters (from bot_corps_ai.ts)
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum healthy brigades to launch a named operation. */
export const MIN_BRIGADES_FOR_OPERATION = 3;

/** Corps exhaustion above which no new operations can be launched. */
export const MAX_EXHAUSTION_FOR_OPERATION = 30;

/** Named operation phase durations (turns). */
export const PLANNING_DURATION = 2;
export const EXECUTION_MAX_DURATION = 6;
export const RECOVERY_DURATION = 3;

/** Operation progress: target capture threshold to consider success. */
export const PROGRESS_SUCCESS_THRESHOLD = 0.5;

/** Operation progress: failure threshold after 2 turns of execution. */
export const PROGRESS_FAILURE_THRESHOLD = 0.2;

/** Brigade loss threshold to pull from operation. */
export const BRIGADE_LOSS_THRESHOLD = 0.3;

// ═══════════════════════════════════════════════════════════════════════════
// Operational group parameters (from bot_corps_ai.ts)
// ═══════════════════════════════════════════════════════════════════════════

/** OG minimum donor personnel residual after contribution. */
export const OG_MIN_DONOR_RESIDUAL = 400;

/** OG maximum personnel contribution per donor. */
export const OG_MAX_CONTRIBUTION_PER_DONOR = 500;

/** OG default duration (turns). */
export const OG_DEFAULT_DURATION = 5;

// ═══════════════════════════════════════════════════════════════════════════
// Corridor breach parameters (from bot_corps_ai.ts)
// ═══════════════════════════════════════════════════════════════════════════

/** Corridor breach: max enemy settlements in a narrow strip to attempt breach. */
export const CORRIDOR_BREACH_MAX_STRIP_WIDTH = 8;
