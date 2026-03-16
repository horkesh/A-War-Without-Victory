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
