/**
 * Army HQ Gathering constants — v0.4.7
 */

/** Turns between regular gatherings per faction */
export const GATHERING_CADENCE_RS = 8;
export const GATHERING_CADENCE_HRHB = 10;

/** ARBiH cadence improves over the war */
export function getGatheringCadenceRBiH(turn: number): number {
    if (turn < 40) return 14;  // 1992: barely functional C2
    if (turn < 80) return 10;  // 1993: improving under Delic
    return 8;                   // 1994+: competent staff work
}

/** Minimum turns between emergency sessions */
export const EMERGENCY_COOLDOWN = 4;

/** Territory loss fraction in 4 turns to trigger emergency */
export const RAPID_TERRITORY_LOSS_THRESHOLD = 0.05;

/** Corps strength loss fraction in 8 turns to trigger emergency */
export const CORPS_STRENGTH_COLLAPSE_THRESHOLD = 0.30;

/** Plan validity buffer beyond cadence */
export const PLAN_VALIDITY_BUFFER = 2;

/** Communication delay for radio-only corps (turns) */
export const RADIO_DELAY_TURNS = 2;

/** Max turns to wait in waiting_for_sync before force launch */
export const SYNC_WAIT_MAX_TURNS = 4;

/** Default sync operation launch window size (turns) */
export const SYNC_WINDOW_DEFAULT = 5;

/** Minimum brigades for sync operation participant */
export const SYNC_MIN_BRIGADES = 3;

/** Front priority aggression modifiers */
export const PRIORITY_AGGRESSION: Record<string, number> = {
    primary: 0.05,
    secondary: 0.0,
    economy: -0.15,
    contain: -0.30,
};

/** Front priority reserve fraction adjustments */
export const PRIORITY_RESERVE: Record<string, number> = {
    primary: -0.05,
    secondary: 0.0,
    economy: 0.10,
    contain: 0.15,
};

/** Strength classification thresholds (average brigade personnel) */
export const STRENGTH_THRESHOLDS = { fortress: 1500, strong: 1000, adequate: 600, thin: 300 };

/** Supply status thresholds (general_supply_reserve value) */
export const SUPPLY_STATUS_THRESHOLDS = { abundant: 75, adequate: 50, strained: 25 };

/** Manpower status thresholds (average brigade personnel) */
export const MANPOWER_STATUS_THRESHOLDS = { healthy: 1500, adequate: 1000, strained: 600 };

/** Max offensive targets per corps in gathering plan (strategic, not tactical) */
export const MAX_GATHERING_OFFENSIVE_TARGETS = 10;

/** Max hold targets per corps in gathering plan */
export const MAX_GATHERING_HOLD_TARGETS = 8;

/** Opportunity score values for corps assessment */
export const OPPORTUNITY_SCORE = {
    PER_BRIGADE: 10,
    FORTRESS_BONUS: 30,
    STRONG_BONUS: 15,
    THIN_PENALTY: -20,
    CRITICAL_PENALTY: -40,
    HIGH_EXHAUSTION_PENALTY: -40,
    MED_EXHAUSTION_PENALTY: -20,
    EXHAUSTION_HIGH_THRESHOLD: 50,
    EXHAUSTION_MED_THRESHOLD: 30,
    LOW_THREAT_BONUS: 10,
    HIGH_THREAT_PENALTY: -10,
    LOW_THREAT_THRESHOLD: 0.3,
    HIGH_THREAT_THRESHOLD: 0.7,
};
