/**
 * Stage 4B: Brigade posture system.
 * Controls pressure/defense tradeoff and exhaustion rates.
 * Each brigade has a posture that determines its offensive pressure output,
 * defensive strength, and per-turn cohesion cost.
 *
 * Deterministic: no randomness, no timestamps. All iteration in sorted order.
 *
 * 8-posture system: hold, defend, defend_at_all_costs, elastic_defense,
 * counterattack, dig_in, attack, assault.
 * Legacy postures 'probe' and 'consolidation' are migrated to 'hold' on load.
 */

import type {
    BrigadePosture,
    BrigadePostureOrder,
    FormationId,
    FormationState,
    GameState
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { isBrigadeAssignedToFront } from './front_assignment.js';
import { HOME_GROUND_COHESION_BONUS } from './combat_math.js';

// --- Types ---

export interface PostureReport {
    postures_changed: number;
    postures_rejected: number;
}

// --- Posture constraints ---

/** Minimum cohesion required to adopt each posture. */
const POSTURE_MIN_COHESION: Record<BrigadePosture, number> = {
    hold: 0,
    defend: 0,
    defend_at_all_costs: 10,
    elastic_defense: 0,
    counterattack: 10,
    dig_in: 0,
    attack: 25,
    assault: 60,
};

/** Readiness levels that are allowed for each posture.
 * Tuned: overextended brigades can still attack (at higher cohesion cost).
 * Historically, exhausted brigades still received attack orders for critical
 * operations — corps and army HQ concentrated resources on key axes using
 * special operations that drew from multiple brigades. Individual brigade
 * exhaustion didn't prevent faction-level offensive operations. */
const POSTURE_MIN_READINESS: Record<BrigadePosture, string[]> = {
    hold: ['active', 'overextended', 'degraded', 'forming'],
    defend: ['active', 'overextended', 'degraded', 'forming'],
    defend_at_all_costs: ['active', 'overextended', 'degraded'],
    elastic_defense: ['active', 'overextended', 'degraded'],
    counterattack: ['active', 'overextended'],
    dig_in: ['active', 'overextended', 'degraded'],
    attack: ['active', 'overextended'],
    assault: ['active'],
};

/** Per-turn cohesion cost for each posture. Negative = drain, positive = recovery.
 * Recovery postures (hold, defend, dig_in) are capped at DEFEND_COHESION_CAP. */
const POSTURE_COHESION_COST: Record<BrigadePosture, number> = {
    hold: 1.0,
    defend: -1.0,
    defend_at_all_costs: -4.0,
    elastic_defense: -0.5,
    counterattack: -1.5,
    dig_in: 0.5,
    attack: -3.0,
    assault: -5.0,
};

/** Maximum cohesion recovery cap for recovery postures (hold, defend, dig_in). */
const DEFEND_COHESION_CAP = 85;

/** dig_in progress increment per turn while in dig_in posture. */
const DIG_IN_PROGRESS_PER_TURN = 0.25;

/** dig_in progress threshold for full defensive effect. */
const DIG_IN_FULL_EFFECT_THRESHOLD = 0.75; // eslint-disable-line @typescript-eslint/no-unused-vars

/** dig_in progress value when reset (posture changed away from dig_in). */
const DIG_IN_PROGRESS_RESET = 0;

/** Absolute cohesion bounds. */
const COHESION_MIN = 0;
const COHESION_MAX = 100;

// --- Public API ---

/**
 * Check if a brigade can adopt a given posture.
 * Validates cohesion threshold, readiness level, and home-ground gate.
 *
 * Home-ground gate: if brigade.home_defense_active is true, attack and assault
 * postures are blocked (militia brigades cannot be ordered into offensive ops).
 */
export function canAdoptPosture(brigade: FormationState, posture: BrigadePosture): boolean {
    const cohesion = brigade.cohesion ?? 60;
    const readiness = brigade.readiness ?? 'active';

    // Home-ground gate: block offensive postures for home-defense brigades
    if ((brigade.home_defense_active ?? false) && (posture === 'attack' || posture === 'assault')) {
        return false;
    }

    // Check cohesion meets minimum for target posture
    if (cohesion < POSTURE_MIN_COHESION[posture]) {
        return false;
    }

    // Check readiness is in the allowed list for target posture
    const allowedReadiness = POSTURE_MIN_READINESS[posture];
    if (!allowedReadiness.includes(readiness)) {
        return false;
    }

    return true;
}

/**
 * Apply posture orders for this turn.
 * Orders are processed in deterministic order (sorted by brigade_id).
 * Each order is validated: the brigade must exist, be active, be kind=brigade,
 * and pass canAdoptPosture.
 *
 * Save migration: legacy postures 'probe' and 'consolidation' are silently
 * converted to 'hold' before processing each order.
 *
 * Home-ground auto-upgrade: if a brigade has home_defense_active and the order
 * is 'hold', the order is upgraded to 'defend' before constraint checks.
 *
 * Clears brigade_posture_orders after processing.
 */
export function applyPostureOrders(state: GameState): PostureReport {
    const report: PostureReport = {
        postures_changed: 0,
        postures_rejected: 0
    };

    const orders = state.brigade_posture_orders;
    if (!orders || orders.length === 0) {
        state.brigade_posture_orders = [];
        return report;
    }

    const formations = state.formations ?? {};

    // Sort orders deterministically by brigade_id
    const sortedOrders = [...orders].sort(
        (a, b) => strictCompare(a.brigade_id, b.brigade_id)
    );

    // De-duplicate: if multiple orders for the same brigade, last one in sorted order wins
    const orderMap = new Map<FormationId, BrigadePostureOrder>();
    for (const order of sortedOrders) {
        orderMap.set(order.brigade_id, order);
    }

    // Process in deterministic order
    const dedupedIds = [...orderMap.keys()].sort(strictCompare);

    for (const brigadeId of dedupedIds) {
        const order = orderMap.get(brigadeId)!;
        const brigade = formations[brigadeId];

        // Validate brigade exists
        if (!brigade) {
            report.postures_rejected++;
            continue;
        }

        // Save migration: legacy postures → 'hold'
        const legacyPosture = brigade.posture as string | undefined;
        if (legacyPosture === 'probe' || legacyPosture === 'consolidation') {
            brigade.posture = 'hold';
        }

        // Must be active
        if (brigade.status !== 'active') {
            report.postures_rejected++;
            continue;
        }

        // Must be kind=brigade
        if ((brigade.kind ?? 'brigade') !== 'brigade') {
            report.postures_rejected++;
            continue;
        }
        if (!isBrigadeAssignedToFront(state, brigadeId)) {
            report.postures_rejected++;
            continue;
        }

        // Home-ground auto-upgrade: hold → defend for home-defense brigades
        let targetPosture = order.posture;
        if ((brigade.home_defense_active ?? false) && targetPosture === 'hold') {
            targetPosture = 'defend';
        }

        // Check posture constraints
        if (!canAdoptPosture(brigade, targetPosture)) {
            report.postures_rejected++;
            continue;
        }

        // Apply posture change
        brigade.posture = targetPosture;
        report.postures_changed++;
    }

    // Clear orders after processing
    state.brigade_posture_orders = [];

    return report;
}

/**
 * Apply per-turn posture costs to all active brigades.
 *
 * Posture cost table (POSTURE_COHESION_COST):
 *   hold:               +1.0/turn (recovery, capped at DEFEND_COHESION_CAP)
 *   defend:             -1.0/turn (note: negative = drain in new system — see below)
 *   defend_at_all_costs: -4.0/turn
 *   elastic_defense:    -0.5/turn
 *   counterattack:      -1.5/turn
 *   dig_in:             +0.5/turn (recovery, capped at DEFEND_COHESION_CAP)
 *   attack:             -3.0/turn
 *   assault:            -5.0/turn
 *
 * Home-ground bonus: brigades with home_defense_active receive +0.5 added to
 * their effective cost (i.e., reduced drain or increased recovery).
 *
 * dig_in progress: increments by DIG_IN_PROGRESS_PER_TURN while in dig_in posture,
 * capped at 1.0. Resets to 0 when posture changes away from dig_in.
 *
 * Auto-downgrade: if cohesion drops below posture minimum, switch to 'hold'.
 * Exception: defend_at_all_costs never auto-downgrades (existential orders).
 *
 * Cohesion is kept to 1 decimal place and clamped to [0, 100].
 */
export function applyPostureCosts(state: GameState): void {
    const formations = state.formations ?? {};
    const ids = Object.keys(formations).sort(strictCompare);

    for (const id of ids) {
        const brigade = formations[id];
        if (!brigade) continue;
        if (brigade.status !== 'active') continue;
        if ((brigade.kind ?? 'brigade') !== 'brigade') continue;
        if (!isBrigadeAssignedToFront(state, id as FormationId)) continue;

        const posture: BrigadePosture = brigade.posture ?? 'hold';
        let cohesion = brigade.cohesion ?? 60;

        const cost = POSTURE_COHESION_COST[posture];

        // Home-ground bonus: reduces drain / increases recovery
        const homeBonus = (brigade.home_defense_active ?? false) ? HOME_GROUND_COHESION_BONUS : 0;
        const effectiveCost = cost + homeBonus;

        cohesion = cohesion + effectiveCost;

        // Recovery postures: cap at DEFEND_COHESION_CAP
        if (posture === 'hold' || posture === 'defend' || posture === 'dig_in') {
            cohesion = Math.min(DEFEND_COHESION_CAP, cohesion);
        }

        // Clamp to absolute bounds and round to 1 decimal place
        cohesion = Math.max(COHESION_MIN, Math.min(COHESION_MAX, cohesion));
        cohesion = Math.round(cohesion * 10) / 10;

        brigade.cohesion = cohesion;

        // dig_in progress tracking
        if (posture === 'dig_in') {
            brigade.dig_in_progress = Math.min(1.0, (brigade.dig_in_progress ?? DIG_IN_PROGRESS_RESET) + DIG_IN_PROGRESS_PER_TURN);
        } else if ((brigade.dig_in_progress ?? 0) > 0) {
            // Reset dig_in progress when posture changes away from dig_in
            brigade.dig_in_progress = DIG_IN_PROGRESS_RESET;
        }

        // Auto-downgrade: if cohesion is below posture minimum, switch to 'hold'
        // Exception: defend_at_all_costs never auto-downgrades (existential orders)
        if (posture !== 'defend_at_all_costs' && cohesion < POSTURE_MIN_COHESION[posture]) {
            brigade.posture = 'hold';
        }
    }
}

/**
 * Normalizes legacy posture values ('probe', 'consolidation') to 'hold'.
 * Called during save file load to handle old save files.
 */
export function normalizePosture(posture: string | undefined): BrigadePosture {
    if (posture === 'probe' || posture === 'consolidation') return 'hold';
    const valid: BrigadePosture[] = ['hold', 'defend', 'defend_at_all_costs', 'elastic_defense',
        'counterattack', 'dig_in', 'attack', 'assault'];
    if (valid.includes(posture as BrigadePosture)) return posture as BrigadePosture;
    return 'hold';
}
