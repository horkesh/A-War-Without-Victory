/**
 * Phase 0: RBiH-HRHB Alliance Tracking (Phase_0_Specification_v0_4_0.md §4).
 *
 * Tracks inter-faction relationships during the pre-war period:
 * - RBiH-RS: always negative/hostile, degrades with RS investment
 * - RBiH-HRHB: starts positive (wartime alliance), degrades with unilateral investment
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import type { FactionId } from '../state/game_state.js';

/**
 * Phase 0 inter-faction relationship state.
 * Values in [-1, 1]. Negative = hostile, positive = cooperative.
 */
export interface Phase0Relationships {
    /** RBiH-RS relationship [-1, 1]. Always negative/hostile in historical scenarios. */
    rbih_rs: number;
    /** RBiH-HRHB relationship [-1, 1]. Starts positive (wartime alliance), can degrade. */
    rbih_hrhb: number;
}

/** Floor for rbih_rs relationship (maximum hostility). */
const RBIH_RS_FLOOR = -1.0;

/** Ceiling for rbih_hrhb relationship (maximum cooperation). */
const RBIH_HRHB_CEILING = 0.6;

/** Floor for rbih_hrhb relationship (maximum hostility). */
const RBIH_HRHB_FLOOR = -1.0;

/** Degradation per uncoordinated RBiH/HRHB investment. */
const UNCOORDINATED_DEGRADATION = -0.02;

/** Improvement per coordinated RBiH/HRHB investment. */
const COORDINATED_IMPROVEMENT = 0.01;

/** RS investment always degrades RBiH-RS relationship by this amount. */
const RS_INVESTMENT_DEGRADATION = -0.03;

/**
 * Initialize Phase 0 relationships at game start.
 * RBiH-RS: -0.2 (tense but not yet hostile).
 * RBiH-HRHB: +0.5 (cooperative alliance against common threat).
 */
export function initializePhase0Relationships(): Phase0Relationships {
    return {
        rbih_rs: -0.2,
        rbih_hrhb: 0.5,
    };
}

/**
 * Update alliance state after a faction investment action.
 *
 * - RBiH or HRHB unilateral (not coordinated): rbih_hrhb degrades by -0.02
 * - RBiH or HRHB coordinated: rbih_hrhb improves by +0.01 (capped at 0.6)
 * - RS investment: rbih_rs degrades by -0.03 (floor at -1.0)
 *
 * Mutates the relationships object in place (deterministic).
 */
export function updateAllianceAfterInvestment(
    relationships: Phase0Relationships,
    investingFaction: FactionId,
    wasCoordinated: boolean
): void {
    if (investingFaction === 'RS') {
        relationships.rbih_rs = Math.max(
            RBIH_RS_FLOOR,
            relationships.rbih_rs + RS_INVESTMENT_DEGRADATION
        );
        return;
    }

    // RBiH or HRHB investment affects RBiH-HRHB alliance
    if (investingFaction === 'RBiH' || investingFaction === 'HRHB') {
        if (wasCoordinated) {
            relationships.rbih_hrhb = Math.min(
                RBIH_HRHB_CEILING,
                relationships.rbih_hrhb + COORDINATED_IMPROVEMENT
            );
        } else {
            relationships.rbih_hrhb = Math.max(
                RBIH_HRHB_FLOOR,
                relationships.rbih_hrhb + UNCOORDINATED_DEGRADATION
            );
        }
    }
}
